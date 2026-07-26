// src/pages/CareProtocol.jsx
//
// The Care Protocol — hidden, founder-only. Reached from a "Care Protocol"
// button in the Profile panel (ProfileMissionPanel.jsx), alongside Admin
// Console and Movie Magic; the route is unlinked from all other navigation.
//
// UI gate mirrors the Movie Magic / AdminConsole founder check (tolerant of
// either metadata source so the founder cannot be locked out). Real
// enforcement is RLS in sql/187_care_protocol.sql, which requires app_metadata
// only.
//
// Four surfaces behind one page: Intake, Protocol (the editable working view),
// Card (the deliverable), and Roster (the rights and evidence ledger — the
// thing that makes this the one needs-app that tells you which of its inputs
// are science).
//
// The engine is loaded with a dynamic import so the ephemeris library is
// code-split into a chunk nobody but the founder ever downloads.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'
import { fn, fnText, space, shadow, display, mono } from '../lib/designTokens'
import CareCard from '../components/care/CareCard'
import InstrumentRunner from '../components/care/InstrumentRunner'

// Tolerant UI gate. RLS is the real boundary.
const isFounder = (user) =>
  user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'

const TABS = [
  { id: 'intake', label: 'Intake' },
  { id: 'protocol', label: 'Protocol' },
  { id: 'card', label: 'Card' },
  { id: 'roster', label: 'Roster' },
]

const EMPTY = {
  displayName: '',
  cardNumber: 1,
  birth: { date: '', time: '', place: '', lat: null, lon: null, unknownTime: false },
  responses: {},
  chart: null,
  humanDesign: null,
  extras: null,
  synthesis: null,
  rightNow: { text: '', updatedAt: null },
}

/* ── page ─────────────────────────────────────────────────── */

export function CareProtocolPage() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading || user === undefined) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.loadingTape}>READING THE CHART…</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isFounder(user)) return <Navigate to="/" replace />

  return <CareProtocolWorkspace user={user} />
}

export default CareProtocolPage

/* ── workspace ────────────────────────────────────────────── */

function CareProtocolWorkspace({ user }) {
  const [state, setState] = useState(null)
  const [tab, setTab] = useState('intake')
  const [syncStatus, setSyncStatus] = useState('synced')
  const [engine, setEngine] = useState(null)
  const [engineError, setEngineError] = useState(null)
  const [computing, setComputing] = useState(false)
  const [synthesising, setSynthesising] = useState(false)
  const [synthError, setSynthError] = useState(null)
  const [share, setShare] = useState(null)
  const [shareError, setShareError] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const saveTimer = useRef(null)
  const loaded = useRef(false)          // armed only after a SUCCESSFUL load
  const lastSyncRef = useRef(null)      // the server updated_at we last agreed on
  const stateRef = useRef(null)         // latest state, for timers and unmount
  const engineRef = useRef(null)        // read inside persist without redepending

  /* engine — dynamic import keeps the ephemeris out of the main bundle */
  useEffect(() => {
    let cancelled = false
    import('../lib/care/index')
      .then((mod) => {
        if (cancelled) return
        engineRef.current = mod
        setEngine(mod)
      })
      .catch((err) => { if (!cancelled) setEngineError(err?.message || 'Engine failed to load') })
    return () => { cancelled = true }
  }, [])

  /* load */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('care_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return

      // A READ FAILURE IS NOT AN EMPTY PROFILE. Treating the two the same was
      // a profile-destroying bug: a transient 502, an expired JWT at page
      // load, or an aborted fetch on a backgrounded tab would install the
      // empty state, and the debounced save would then upsert it over the real
      // row 700ms later — wiping birth data, every quiz response, and the paid
      // synthesis, with no interaction from the user at all. maybeSingle()
      // already reports "no row yet" as {data: null, error: null}, so an error
      // here is always a genuine failure. Refuse to load, and never arm the
      // saver.
      if (error) {
        setLoadError(error.message || 'Could not read your profile')
        return
      }

      if (!data) {
        lastSyncRef.current = null
        loaded.current = true
        setState({ ...EMPTY, displayName: user.email?.split('@')[0] || '' })
        return
      }

      lastSyncRef.current = data.updated_at
      loaded.current = true
      setState({
        displayName: data.display_name || '',
        cardNumber: data.card_number || 1,
        birth: {
          date: data.birth_date || '',
          time: data.birth_time ? String(data.birth_time).slice(0, 5) : '',
          place: data.birth_place || '',
          lat: data.birth_lat,
          lon: data.birth_lon,
          unknownTime: Boolean(data.birth_unknown_time),
        },
        responses: data.responses || {},
        chart: data.chart && data.chart.big3 ? data.chart : null,
        humanDesign: data.human_design && data.human_design.type ? data.human_design : null,
        extras: data.extras && data.extras.chinese ? data.extras : null,
        synthesis: data.synthesis && data.synthesis.wired ? data.synthesis : null,
        rightNow: data.right_now && data.right_now.text ? data.right_now : { text: '', updatedAt: null },
        createdAt: data.created_at,
      })
    })()
    return () => { cancelled = true }
  }, [user.id, user.email])

  /* load any existing share link. Ordered + limit(1) rather than maybeSingle()
     so that a duplicate row — which the unique index now prevents, but which
     may already exist from before it — degrades to "show the newest" instead
     of erroring and leaving the panel permanently offering "create". */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('care_shares')
        .select('token, is_live, show_right_now, revoked_at, view_count')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
      if (cancelled) return
      if (error) { setShareError(error.message); return }
      if (data && data.length) setShare(data[0])
    })()
    return () => { cancelled = true }
  }, [user.id])

  /* save, debounced and conflict-safe.
     Mirrors the pattern already proven in MovieMagic: the write only lands if
     the row still carries the updated_at we last agreed on. If another tab or
     device saved in the meantime we fetch theirs, merge, and write the merge —
     so a stale tab can never silently erase work done elsewhere. */
  const persist = useCallback(async (snapshot) => {
    // Returns true/false now (previously nothing) — the manual "Save"
    // button below needs to know whether the write it triggered actually
    // landed, so it can show "Saved" or "Try again" instead of guessing.
    // Existing callers (the debounced autosave effect) never used the
    // return value, so this doesn't change their behaviour.
    if (!snapshot) return false
    const stamp = new Date().toISOString()
    const row = {
      user_id: user.id,
      display_name: snapshot.displayName || null,
      card_number: snapshot.cardNumber || 1,
      birth_date: snapshot.birth.date || null,
      birth_time: snapshot.birth.unknownTime ? null : (snapshot.birth.time || null),
      birth_place: snapshot.birth.place || null,
      birth_lat: snapshot.birth.lat,
      birth_lon: snapshot.birth.lon,
      birth_unknown_time: Boolean(snapshot.birth.unknownTime),
      chart: snapshot.chart || {},
      human_design: snapshot.humanDesign || {},
      extras: snapshot.extras || {},
      responses: snapshot.responses || {},
      synthesis: snapshot.synthesis || {},
      right_now: snapshot.rightNow || {},
      engine_version: engineRef.current?.ENGINE_VERSION || null,
      updated_at: stamp,
    }

    // First write of a brand-new row: nothing to conflict with.
    if (!lastSyncRef.current) {
      const { error } = await supabase.from('care_profiles').upsert(row)
      if (error) { setSyncStatus('error'); return false }
      lastSyncRef.current = stamp
      setSyncStatus('synced')
      return true
    }

    const { data, error } = await supabase
      .from('care_profiles')
      .update(row)
      .eq('user_id', user.id)
      .eq('updated_at', lastSyncRef.current)
      .select('updated_at')

    if (error) { setSyncStatus('error'); return false }
    if (data && data.length) {
      lastSyncRef.current = data[0].updated_at
      setSyncStatus('synced')
      return true
    }

    // Conflict: somebody else saved since we loaded. Take theirs as the base
    // and lay ours on top, unioning the response map rather than replacing it,
    // so answers given on the other device survive.
    const { data: remote, error: fetchErr } = await supabase
      .from('care_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (fetchErr || !remote) { setSyncStatus('error'); return false }

    const merged = {
      ...row,
      responses: { ...(remote.responses || {}), ...(row.responses || {}) },
      // Keep whichever "Right now" was written most recently.
      right_now:
        new Date(remote.right_now?.updatedAt || 0) > new Date(row.right_now?.updatedAt || 0)
          ? remote.right_now
          : row.right_now,
      // Never let an empty local value clobber a populated remote one.
      chart: hasKeys(row.chart) ? row.chart : remote.chart,
      human_design: hasKeys(row.human_design) ? row.human_design : remote.human_design,
      extras: hasKeys(row.extras) ? row.extras : remote.extras,
      synthesis: hasKeys(row.synthesis) ? row.synthesis : remote.synthesis,
      updated_at: new Date().toISOString(),
    }
    const { error: mergeErr } = await supabase.from('care_profiles').upsert(merged)
    if (mergeErr) { setSyncStatus('error'); return false }
    lastSyncRef.current = merged.updated_at
    setSyncStatus('synced')
    return true
  }, [user.id])

  useEffect(() => {
    stateRef.current = state
    if (!state || !loaded.current) return
    setSyncStatus('syncing')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      persist(stateRef.current)
    }, 700)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [state, persist])

  /* Flush a pending save on unmount. Without this the last 700ms of typing is
     silently dropped whenever the founder navigates away — including on a
     token refresh, which unmounts the workspace via the auth gate. */
  useEffect(() => () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
      persist(stateRef.current)
    }
  }, [persist])

  /* Manual save — a real button, not just a badge to trust. §13/§14 made
     the passive autosave indicator visible and legible; the "reflection"
     detour (§15/§16) answered a different complaint entirely. The actual,
     repeated, plainly-stated request was simpler than either: an actual
     button to press, with its own confirmation, wherever the founder is
     actually looking for one — which turned out to be the bottom of each
     section, not the topbar (§17 shipped one in the topbar only; §18
     added one per section; §20 removed the topbar one — it was redundant
     once every section had its own, and it was never the one being used).
     This doesn't replace the debounced autosave in the header — that keeps
     running as the safety net regardless of whether any button is ever
     pressed — it just gives an explicit, deliberate action, repeated at
     the bottom of every section, for whoever doesn't want to trust the
     passive signal.
     triggerSave is deliberately thin: flush any pending debounce, save
     immediately, report back true/false. Each <SaveButton> instance (see
     IntakeTab) owns its own Save -> Saving… -> ✓ Saved / Try again display
     state locally, so clicking Save at the bottom of one section doesn't
     make a different section's button flash "✓ Saved" too — only the one
     actually pressed. */
  const triggerSave = useCallback(async () => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    setSyncStatus('syncing')
    return persist(stateRef.current)
  }, [persist])

  const setResponse = useCallback((id, value) => {
    setState((s) => ({ ...s, responses: { ...s.responses, [id]: value } }))
  }, [])

  /* the computed run */
  const runComputation = useCallback(async () => {
    if (!engine || !state?.birth.date || state.birth.lat == null) return
    setComputing(true)
    try {
      // Unknown birth time falls back to noon. Sun and the human design type
      // survive that; the rising sign and the moon degree do not, and the UI
      // says so rather than quietly presenting a guess as a fact.
      const [year, month, day] = state.birth.date.split('-').map(Number)
      const [hour, minute] = (state.birth.unknownTime ? '12:00' : state.birth.time || '12:00')
        .split(':').map(Number)
      const computed = engine.computeFromBirth({
        year, month, day, hour, minute,
        latitude: Number(state.birth.lat),
        longitude: Number(state.birth.lon),
      })
      // Drop any existing synthesis. It was written against the OLD chart, and
      // silently keeping it means correcting a wrong birth time leaves the card
      // showing new placements above a portrait derived from the old ones —
      // wrong output presented with full confidence.
      setState((s) => ({
        ...s,
        ...computed,
        synthesis: s.chart && s.synthesis ? null : s.synthesis,
      }))
    } catch (err) {
      setEngineError(err?.message || 'Computation failed')
    } finally {
      setComputing(false)
    }
  }, [engine, state?.birth])

  /* card */
  const card = useMemo(() => {
    if (!engine || !state) return null
    return engine.buildCard({
      displayName: state.displayName,
      cardNumber: state.cardNumber,
      chart: state.chart,
      humanDesign: state.humanDesign,
      extras: state.extras,
      responses: state.responses,
      synthesis: state.synthesis,
      rightNow: state.rightNow,
      createdAt: state.createdAt || new Date().toISOString(),
      shareUrl: share ? `${window.location.origin}/care/${share.token}` : null,
    })
  }, [engine, state, share])

  const completionMap = useMemo(
    () => (engine && state ? engine.completion(state.responses) : {}),
    [engine, state],
  )

  /* today's sky. Recomputed every render, never stored — see the note atop
     lib/care/transits.js. Deliberately keyed on the calendar date rather than
     any finer instant, so this recomputes once per day rather than on every
     keystroke elsewhere on the page: two renders on the same day produce an
     identical object, so React never sees it as a change worth re-rendering
     for. Never passed into buildCard()/publicCard(), so it can never reach a
     stored share snapshot — see the "PUBLIC SHARING" note in transits.js for
     why that is deliberate, not an oversight. */
  const today = new Date()
  const dayKey = today.toISOString().slice(0, 10)
  const todaysWeather = useMemo(
    () => (engine && state?.chart ? engine.computeTransits(state.chart, state.humanDesign, today) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, state?.chart, state?.humanDesign, dayKey],
  )

  /* QR — the qrcode dependency already exists in the repo */
  useEffect(() => {
    let cancelled = false
    if (!share?.token) { setQrDataUrl(null); return }
    import('qrcode')
      .then((QR) => QR.toDataURL(`${window.location.origin}/care/${share.token}`, {
        margin: 1, width: 240, color: { dark: '#262420', light: '#ffffff' },
      }))
      .then((url) => { if (!cancelled) setQrDataUrl(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [share?.token])

  /* synthesis */
  const runSynthesis = useCallback(async () => {
    if (!engine || !state) return
    setSynthesising(true)
    setSynthError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const vector = engine.buildTraitVector({
        chart: state.chart,
        humanDesign: state.humanDesign,
        extras: state.extras,
        responses: state.responses,
      })
      const res = await fetch('/api/care-synthesis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          vector,
          displayName: state.displayName,
          openWish: state.responses.open_wish || '',
          openLine: state.responses.open_line || '',
          humanDesign: state.humanDesign
            ? {
                type: state.humanDesign.type,
                profile: state.humanDesign.profile,
                authority: state.humanDesign.authority,
                definedCentres: state.humanDesign.definedCentres,
                openCentres: state.humanDesign.openCentres,
                definition: state.humanDesign.definition,
              }
            : null,
          big3: state.chart?.big3 || null,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `Synthesis failed (${res.status})`)
      // Never accept a degraded response into the card. The endpoint falls back
      // to returning raw model output when its JSON will not parse, and that
      // raw output would otherwise be rendered as the "How I'm wired" prose,
      // saved, and copied into the public snapshot.
      if (body.degraded) throw new Error('The model returned something unusable. Try again.')
      setState((s) => ({ ...s, synthesis: body }))
      setTab('card')
    } catch (err) {
      setSynthError(err?.message || 'Synthesis failed')
    } finally {
      setSynthesising(false)
    }
  }, [engine, state])

  /* share link. Every one of these reports its errors — a silently swallowed
     failure here reads to the founder as success, and a revoke that looks like
     it worked but did not is the worst possible version of that. */
  const createShare = useCallback(async () => {
    if (!card || share) return
    setShareError(null)
    const token = makeToken()
    const { error } = await supabase.from('care_shares').insert({
      token,
      user_id: user.id,
      card: publicCard(card, true),
      is_live: true,
      show_right_now: true,
    })
    if (error) { setShareError(error.message || 'Could not create the link'); return }
    setShare({ token, is_live: true, show_right_now: true, revoked_at: null, view_count: 0 })
  }, [card, share, user.id])

  const refreshShare = useCallback(async () => {
    if (!share?.token || !card) return
    setShareError(null)
    const { error } = await supabase
      .from('care_shares')
      .update({ card: publicCard(card, share.show_right_now), updated_at: new Date().toISOString() })
      .eq('token', share.token)
    if (error) setShareError(error.message || 'Could not update the snapshot')
  }, [share, card])

  // The schema and the RPC have honoured this flag since the security review;
  // there was simply no control in the UI to ever set it to false. Flipping it
  // also refreshes the stored snapshot in the same call, since the flag only
  // takes effect on the card that's actually saved — leaving the old snapshot
  // in place would mean "Right now" stayed visible on an already-shared link
  // until the next unrelated edit happened to trigger a refresh.
  const toggleRightNow = useCallback(async () => {
    if (!share?.token) return
    setShareError(null)
    const next = !share.show_right_now
    const payload = { show_right_now: next, updated_at: new Date().toISOString() }
    if (card) payload.card = publicCard(card, next)
    const { error } = await supabase.from('care_shares').update(payload).eq('token', share.token)
    if (error) { setShareError(error.message || 'Could not update the link'); return }
    setShare((s) => ({ ...s, show_right_now: next }))
  }, [share, card])

  const revokeShare = useCallback(async () => {
    if (!share?.token) return
    setShareError(null)
    const { data, error } = await supabase
      .from('care_shares')
      .update({ revoked_at: new Date().toISOString(), is_live: false })
      .eq('token', share.token)
      .select('token')
    if (error || !data || !data.length) {
      setShareError(error?.message || 'Revoke did not take effect. The link is still live.')
      return
    }
    setShare(null)
  }, [share?.token])

  // A failed read is a hard stop, not an empty profile. Nothing is editable and
  // the saver is never armed, so a transient outage cannot overwrite the row.
  if (loadError) {
    return (
      <div style={S.loadingWrap}>
        <div style={{ maxWidth: '420px', textAlign: 'center', padding: space.xl }}>
          <div style={{ ...fnText.eyebrow, marginBottom: space.md }}>COULD NOT LOAD</div>
          <p style={{ ...fnText.body, color: fn.ink, margin: `0 0 ${space.lg}` }}>
            Your protocol is still on the server · it has not been changed. Nothing
            will be saved until it loads cleanly, so reload rather than re-entering
            anything.
          </p>
          <p style={{ ...fnText.caption, color: fn.ghost, margin: `0 0 ${space.lg}` }}>{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} style={S.solidBtn}>
            Reload
          </button>
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.loadingTape}>READING THE CHART…</div>
      </div>
    )
  }

  return (
    <div style={S.app}>
      <header style={S.topbar}>
        <div style={S.brand}>
          <span aria-hidden="true">◍</span>
          <span>Care Protocol</span>
          {/* The ambient autosave readout — a passive background signal for
              the safety net above (§8/§11 debounced save), colour-coded
              (§14) so it doesn't blend into ambient text. This is the only
              thing in the topbar now — §18 had also put a manual Save
              button here, redundant with the one at the bottom of every
              section; removed per direct request, since the section-level
              buttons (still there — see IntakeTab) are the ones actually
              being used. */}
          <span
            style={{
              ...mono, fontSize: '13px', letterSpacing: '0.08em', fontWeight: 600,
              padding: '2px 8px', borderRadius: '2px',
              color: syncStatus === 'synced' ? fn.moss : syncStatus === 'syncing' ? fn.meta : fn.clay,
              background: syncStatus === 'synced' ? fn.mossTint : syncStatus === 'error' ? fn.clayTint : 'transparent',
              border: `1px solid ${syncStatus === 'synced' ? fn.mossEdge : syncStatus === 'syncing' ? fn.rule : fn.clayEdge}`,
            }}
          >
            {syncStatus === 'synced' ? '● Saved' : syncStatus === 'syncing' ? '○ Saving…' : '⚠ Not saved'}
          </span>
        </div>
        <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', color: fn.ghost }}>
          HIDDEN · FOUNDER ONLY
        </div>
      </header>

      <nav style={S.tabRow}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={tab === t.id ? S.tabActive : S.tab}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main style={S.main}>
        {engineError && (
          <div style={S.notice}>
            <strong style={{ color: fn.clay }}>Engine problem.</strong> {engineError}
          </div>
        )}

        {syncStatus === 'error' && (
          <div style={S.notice}>
            <strong style={{ color: fn.clay }}>Not saved.</strong> The last change did
            not reach the server. Keep this tab open · the next edit will try again.
          </div>
        )}

        {tab === 'intake' && (
          <IntakeTab
            state={state}
            setState={setState}
            setResponse={setResponse}
            engine={engine}
            completionMap={completionMap}
            runComputation={runComputation}
            computing={computing}
            onSaveNow={triggerSave}
          />
        )}

        {tab === 'protocol' && (
          <ProtocolTab
            state={state}
            setState={setState}
            card={card}
            engine={engine}
            runSynthesis={runSynthesis}
            synthesising={synthesising}
            synthError={synthError}
            share={share}
            shareError={shareError}
            createShare={createShare}
            refreshShare={refreshShare}
            revokeShare={revokeShare}
            toggleRightNow={toggleRightNow}
          />
        )}

        {tab === 'card' && (
          <div style={{ padding: `${space.xl} 0` }}>
            <CareCard card={card} qrDataUrl={qrDataUrl} todaysWeather={todaysWeather} />
          </div>
        )}

        {tab === 'roster' && <RosterTab engine={engine} completionMap={completionMap} />}
      </main>
    </div>
  )
}

/* ── intake ───────────────────────────────────────────────── */

function IntakeTab({ state, setState, setResponse, engine, completionMap, runComputation, computing, onSaveNow }) {
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [searching, setSearching] = useState(false)
  // Distinguishes "the search ran and found nothing" from "the search
  // couldn't run at all" (network/CORS/API hiccup), and from "no search has
  // been attempted yet" (null) — each gets a different message. Before this,
  // a failed fetch was swallowed silently: placeResults just stayed empty,
  // with nothing on screen to tell the founder the search itself broke
  // rather than their city not existing.
  const [searchStatus, setSearchStatus] = useState(null) // null | 'empty' | 'error'

  // The reflection — the payoff for a freetext answer, fired the moment a
  // founder finishes writing one, before autosave's silent status dot is
  // the only sign anything happened at all. Called "Noticed" internally for
  // a while; renamed to "reflection" throughout, per direct request — see
  // api/care-reflection.js (renamed from api/care-notice.js) and
  // InstrumentRunner.jsx's ReflectionPanel for the other two-thirds of this
  // feature; this is the missing middle that actually calls the endpoint
  // and holds the per-item state while it runs.
  //
  // Keyed by item id, not instrument id: two freetext items in the same
  // instrument (e.g. open_wish and open_line) get independent reflections.
  const [reflections, setReflections] = useState({})
  // Tracks the last text a reflection actually ran for, per item, so
  // blurring the same unchanged answer twice (tab away and back, no edit)
  // doesn't re-spend a model call and re-render the same sentence.
  const reflectedTextRef = useRef({})

  const reflectOn = useCallback(async (item, text) => {
    const trimmed = (text || '').trim()
    // Matches the server's own floor (api/care-reflection.js) — "fine" or
    // "idk" deserves silence, not a reflection stretched thin over three words.
    if (trimmed.length < 15) return
    if (reflectedTextRef.current[item.id] === trimmed) return
    reflectedTextRef.current[item.id] = trimmed

    setReflections((r) => ({ ...r, [item.id]: { status: 'loading' } }))
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch('/api/care-reflection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: item.text, text: trimmed, displayName: state.displayName }),
      })
      const body = await res.json()
      if (!res.ok || !body?.reflection) throw new Error(body?.error || `Reflection failed (${res.status})`)
      setReflections((r) => ({ ...r, [item.id]: { status: 'done', text: body.reflection } }))
    } catch (err) {
      // Was originally fully silent on failure — reasoning being that a
      // missed reflection is a missed nicety, not worth interrupting
      // someone mid-disclosure over. Reversed after a real report of "this
      // doesn't seem to have shown up": total silence on error is
      // indistinguishable from "this feature doesn't exist," which is
      // exactly the bad-bedside-manner failure this feature exists to fix,
      // just moved one layer down, into the failure path instead of the
      // success path. The panel now renders something calm for 'error' too
      // (see ReflectionPanel) rather than nothing. Also logged to the
      // console — a production failure here (bad auth, missing env var on
      // the new endpoint, network hiccup) was otherwise invisible to
      // anyone without devtools open, which made this exact bug unreportable.
      console.error('[care-reflection] reflection failed:', err?.message || err)
      setReflections((r) => ({ ...r, [item.id]: { status: 'error' } }))
    }
  }, [state?.displayName])

  const searchPlace = async () => {
    if (!placeQuery.trim()) return
    setSearching(true)
    setSearchStatus(null)
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=${encodeURIComponent(placeQuery)}`,
      )
      if (!res.ok) throw new Error(`Search failed (${res.status})`)
      const body = await res.json()
      const results = body?.results || []
      setPlaceResults(results)
      setSearchStatus(results.length ? null : 'empty')
    } catch (_) {
      setPlaceResults([])
      setSearchStatus('error')
    } finally {
      setSearching(false)
    }
  }

  const pickPlace = (result) => {
    const label = [result.name, result.admin1, result.country].filter(Boolean).join(', ')
    setState((s) => ({
      ...s,
      birth: { ...s.birth, place: label, lat: result.latitude, lon: result.longitude },
    }))
    setPlaceResults([])
    setPlaceQuery('')
    setSearchStatus(null)
  }

  const core = engine?.CORE_INSTRUMENTS || []
  const deepen = engine?.DEEPEN_INSTRUMENTS || []
  const ready = state.birth.date && state.birth.lat != null

  return (
    <div>
      {/* Step 1 — birth data */}
      <Panel eyebrow="STEP 1 · BIRTH DATA" note="Computes the whole top strip of the card automatically.">
        <Field label="Name on the card">
          <input
            type="text"
            value={state.displayName}
            onChange={(e) => setState((s) => ({ ...s, displayName: e.target.value }))}
            style={S.input}
          />
        </Field>

        <div style={{ display: 'flex', gap: space.md, flexWrap: 'wrap' }}>
          <Field label="Birth date" grow>
            <input
              type="date"
              value={state.birth.date}
              onChange={(e) => setState((s) => ({ ...s, birth: { ...s.birth, date: e.target.value } }))}
              style={S.input}
            />
          </Field>
          <Field label="Birth time" grow>
            <input
              type="time"
              value={state.birth.time}
              disabled={state.birth.unknownTime}
              onChange={(e) => setState((s) => ({ ...s, birth: { ...s.birth, time: e.target.value } }))}
              style={{ ...S.input, opacity: state.birth.unknownTime ? 0.55 : 1 }}
            />
          </Field>
        </div>

        <label style={{ ...fnText.caption, color: fn.meta, display: 'flex', gap: space.sm, alignItems: 'center', marginBottom: space.lg }}>
          <input
            type="checkbox"
            checked={state.birth.unknownTime}
            onChange={(e) => setState((s) => ({ ...s, birth: { ...s.birth, unknownTime: e.target.checked } }))}
          />
          I do not know the birth time
        </label>
        {state.birth.unknownTime && (
          <p style={{ ...fnText.caption, color: fn.clay, margin: `0 0 ${space.lg}` }}>
            Noon will be assumed. Sun sign and human design type survive that. Rising
            sign, moon degree and profile do not · they will be wrong, not approximate.
          </p>
        )}

        <Field label="Birth place">
          <div style={{ display: 'flex', gap: space.sm }}>
            <input
              type="text"
              value={placeQuery}
              placeholder={state.birth.place || 'Search for a city'}
              onChange={(e) => setPlaceQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchPlace() } }}
              style={{ ...S.input, marginBottom: 0 }}
            />
            <button type="button" onClick={searchPlace} style={S.ghostBtn}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
        </Field>

        {/* Typing a city name alone does not set coordinates — only picking a
            result below does. This is the single most common way "Compute
            chart" silently does nothing: the founder types a place, never
            taps Search or a result, and there is no error to explain why the
            button is inert. Say it up front rather than only after it fails. */}
        {!state.birth.lat && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: `0 0 ${space.md}` }}>
            Type a city name, then tap Search and choose your city from the
            list that appears. Typing alone does not set your coordinates —
            try just the city ("London") rather than "City, Region, Country"
            for the best match.
          </p>
        )}

        {searchStatus === 'empty' && !searching && (
          <p style={{ ...fnText.caption, color: fn.clay, margin: `0 0 ${space.lg}` }}>
            No matches for "{placeQuery}". Try just the city name on its own.
          </p>
        )}
        {searchStatus === 'error' && !searching && (
          <p style={{ ...fnText.caption, color: fn.clay, margin: `0 0 ${space.lg}` }}>
            Could not reach the location search. Check your connection and try again.
          </p>
        )}

        {placeResults.length > 0 && (
          <div style={{ marginBottom: space.lg }}>
            {placeResults.map((result) => (
              <button
                key={`${result.id}`}
                type="button"
                onClick={() => pickPlace(result)}
                style={S.resultBtn}
              >
                {[result.name, result.admin1, result.country].filter(Boolean).join(', ')}
                <span style={{ ...mono, fontSize: '13px', color: fn.ghost, marginLeft: space.sm }}>
                  {result.latitude.toFixed(2)}, {result.longitude.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}

        {state.birth.place && (
          <p style={{ ...fnText.caption, color: fn.meta, margin: `0 0 ${space.lg}` }}>
            {state.birth.place}
            {state.birth.lat != null && (
              <span style={{ ...mono, color: fn.ghost }}>
                {'  ·  '}{Number(state.birth.lat).toFixed(3)}, {Number(state.birth.lon).toFixed(3)}
              </span>
            )}
          </p>
        )}

        <button
          type="button"
          onClick={runComputation}
          disabled={!ready || computing || !engine}
          style={ready && engine ? S.solidBtn : S.disabledBtn}
        >
          {computing ? 'Computing…' : state.chart ? 'Recompute chart' : 'Compute chart'}
        </button>

        {/* A disabled button fires no click at all, so without this the only
            feedback for "why won't this button do anything" is silence.
            Named exactly what's missing rather than a generic "required
            fields" line, since date and place fail for different reasons. */}
        {!ready && !computing && (
          <p style={{ ...fnText.caption, color: fn.clay, margin: `${space.sm} 0 0` }}>
            {!state.birth.date
              ? 'Add a birth date first.'
              : 'Search for your birth city above and tap it in the results list — the button stays inactive until a city is actually selected.'}
          </p>
        )}

        {state.chart && (
          <div style={{ marginTop: space.lg, padding: space.lg, background: fn.ground, borderRadius: '2px' }}>
            <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', color: fn.meta, lineHeight: 1.9 }}>
              {state.chart.big3.sun.formatted} SUN · {state.chart.big3.moon.formatted} MOON ·{' '}
              {state.chart.big3.rising.formatted} RISING
              <br />
              {state.humanDesign?.shorthand} · {state.humanDesign?.authority} AUTHORITY ·{' '}
              {state.humanDesign?.definition?.toUpperCase()} DEFINITION
              <br />
              {state.extras?.chinese?.label?.toUpperCase()} · LIFE PATH {state.extras?.numerology?.lifePath}
            </div>
          </div>
        )}

        {/* §18 — a Save button at the bottom of this section too, not just
            the topbar. Same underlying save as everywhere else (there's one
            profile row, not one per section); its own local confirmation. */}
        {onSaveNow && (
          <div style={{ marginTop: space.lg }}>
            <SaveButton onSave={onSaveNow} />
          </div>
        )}
      </Panel>

      {/* Steps 2-4 — the core instruments */}
      {core.map((instrument, index) => (
        <Panel
          key={instrument.id}
          eyebrow={`STEP ${index + 2} · ${instrument.shortName.toUpperCase()}`}
          note={`${instrument.estimatedMinutes} min · ${instrument.evidence}`}
          status={completionMap[instrument.id]}
        >
          <InstrumentRunner
            instrument={instrument}
            responses={state.responses}
            onChange={setResponse}
            reflections={reflections}
            onReflect={reflectOn}
          />
          {onSaveNow && (
            <div style={{ marginTop: space.lg }}>
              <SaveButton onSave={onSaveNow} />
            </div>
          )}
        </Panel>
      ))}

      {/* Optional depth */}
      <Panel
        eyebrow="OPTIONAL · DEEPEN THE PROTOCOL"
        note="The card is complete without these. They enrich the trait vector and give the synthesis more to work with."
      >
        {deepen.map((instrument) => (
          <details key={instrument.id} style={S.details}>
            <summary style={S.summary}>
              {instrument.name}
              <span style={{ ...mono, fontSize: '13px', color: fn.ghost, marginLeft: space.sm }}>
                {instrument.items.length} items · {instrument.estimatedMinutes} min ·{' '}
                {completionMap[instrument.id]?.answered || 0}/{instrument.items.length}
              </span>
            </summary>
            <div style={{ paddingTop: space.lg }}>
              <InstrumentRunner
                instrument={instrument}
                responses={state.responses}
                onChange={setResponse}
                reflections={reflections}
                onReflect={reflectOn}
              />
            </div>
          </details>
        ))}
        {onSaveNow && (
          <div style={{ marginTop: space.lg }}>
            <SaveButton onSave={onSaveNow} />
          </div>
        )}
      </Panel>
    </div>
  )
}

/* ── protocol ─────────────────────────────────────────────── */

function ProtocolTab({
  state, setState, card, engine, runSynthesis, synthesising, synthError,
  share, shareError, createShare, refreshShare, revokeShare, toggleRightNow,
}) {
  const detail = card?.detail
  const shareUrl = share ? `${window.location.origin}/care/${share.token}` : null

  return (
    <div>
      <Panel eyebrow="RIGHT NOW" note="The living part of the card. The only section that goes stale.">
        <textarea
          rows={3}
          value={state.rightNow?.text || ''}
          placeholder="What is true this week that a partner should know?"
          onChange={(e) =>
            setState((s) => ({
              ...s,
              rightNow: { text: e.target.value, updatedAt: new Date().toISOString() },
            }))
          }
          style={{ ...S.input, resize: 'vertical' }}
        />
        {state.rightNow?.updatedAt && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>
            Updated {String(state.rightNow.updatedAt).slice(0, 10)}
          </p>
        )}
      </Panel>

      <Panel
        eyebrow="SYNTHESIS"
        note="Reads the whole trait vector at once and names convergences and tensions. This is the part no single quiz can do."
      >
        <button
          type="button"
          onClick={runSynthesis}
          disabled={synthesising || !engine || !state.chart}
          style={engine && state.chart ? S.solidBtn : S.disabledBtn}
        >
          {synthesising ? 'Synthesising…' : card?.wired?.pending ? 'Run synthesis' : 'Re-run synthesis'}
        </button>
        {!state.chart && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.md} 0 0` }}>
            Compute the chart on the Intake tab first.
          </p>
        )}
        {synthError && (
          <p style={{ ...fnText.caption, color: fn.clay, margin: `${space.md} 0 0` }}>{synthError}</p>
        )}
        {card?.wired?.text && (
          <p style={{ ...fnText.body, color: fn.ink, margin: `${space.lg} 0 0` }}>{card.wired.text}</p>
        )}
      </Panel>

      {detail?.humanDesign && (
        <Panel eyebrow="HUMAN DESIGN · FULL READ" note="Computed. Mythic tier.">
          <KeyVal k="Type" v={detail.humanDesign.type} />
          <KeyVal k="Profile" v={`${detail.humanDesign.profile} · ${detail.humanDesign.profileLabel}`} />
          <KeyVal k="Authority" v={detail.humanDesign.authority} />
          <KeyVal k="Definition" v={detail.humanDesign.definition} />
          <KeyVal k="Defined centres" v={detail.humanDesign.definedCentres.join(', ') || 'none'} />
          <KeyVal k="Open centres" v={detail.humanDesign.openCentres.join(', ') || 'none'} />
          <KeyVal k="Channels" v={detail.humanDesign.channels.join(' · ') || 'none'} />
          <KeyVal
            k="Design date"
            v={`${String(detail.humanDesign.designUTC).slice(0, 16).replace('T', ' ')} UTC · ${detail.humanDesign.designDaysBefore} days before birth`}
          />
          {detail.humanDesign.typeGuidance && (
            <p style={{ ...fnText.body, color: fn.meta, margin: `${space.lg} 0 0` }}>
              <strong style={{ color: fn.ink }}>{detail.humanDesign.typeGuidance.strategy}. </strong>
              {detail.humanDesign.typeGuidance.forOthers}
            </p>
          )}
          {detail.humanDesign.authorityGuidance && (
            <p style={{ ...fnText.body, color: fn.meta, margin: `${space.md} 0 0` }}>
              {detail.humanDesign.authorityGuidance}
            </p>
          )}
        </Panel>
      )}

      {detail?.dosha && (
        <Panel eyebrow="CONSTITUTION" note="Mythic tier.">
          <KeyVal k="Dosha" v={detail.dosha.label} />
          <p style={{ ...fnText.body, color: fn.meta, margin: 0 }}>{detail.dosha.guidance}</p>
        </Panel>
      )}

      <Panel
        eyebrow="SHARE LINK"
        note="Public reads go through the care_card_by_token function, which is dark until care_public_enabled() is flipped in SQL. The card renders for you; nobody else can reach it yet."
      >
        {shareError && (
          <p style={{ ...fnText.caption, color: fn.clay, margin: `0 0 ${space.md}` }}>{shareError}</p>
        )}
        {share ? (
          <>
            <p style={{ ...mono, fontSize: '13px', color: fn.meta, wordBreak: 'break-all', margin: `0 0 ${space.md}` }}>
              {shareUrl}
            </p>
            <p style={{ ...fnText.caption, color: fn.ghost, margin: `0 0 ${space.md}` }}>
              {share.view_count === 1 ? '1 view' : `${share.view_count ?? 0} views`} · counted only once
              public sharing is switched on in SQL
            </p>
            <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
              <button type="button" onClick={refreshShare} style={S.ghostBtn}>
                Update snapshot
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(shareUrl)}
                style={S.ghostBtn}
              >
                Copy link
              </button>
              <button type="button" onClick={revokeShare} style={S.dangerBtn}>
                Revoke
              </button>
            </div>
            <label
              style={{
                ...fnText.caption, color: fn.meta, display: 'flex', alignItems: 'center',
                gap: space.sm, margin: `${space.md} 0 0`, cursor: 'pointer',
              }}
            >
              <input type="checkbox" checked={Boolean(share.show_right_now)} onChange={toggleRightNow} />
              Show "Right now" on the shared card
            </label>
            <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.md} 0 0` }}>
              The link stores a snapshot of the card face only. Birth time and
              coordinates never leave your own row.
            </p>
          </>
        ) : (
          <button type="button" onClick={createShare} disabled={!card} style={card ? S.solidBtn : S.disabledBtn}>
            Create share link
          </button>
        )}
      </Panel>
    </div>
  )
}

/* ── roster ───────────────────────────────────────────────── */

function RosterTab({ engine, completionMap }) {
  if (!engine) return <p style={{ ...fnText.body, color: fn.ghost }}>Loading roster…</p>

  return (
    <div>
      <Panel
        eyebrow="EVIDENCE TIERS"
        note="Displayed openly on the card. The one needs-app that tells you which of its inputs are science."
      >
        {Object.entries(engine.EVIDENCE_TIERS).map(([key, tier]) => (
          <div key={key} style={{ marginBottom: space.md }}>
            <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.14em', color: fn.ink, textTransform: 'uppercase' }}>
              {tier.label}
            </span>
            <p style={{ ...fnText.caption, color: fn.meta, margin: '2px 0 0' }}>{tier.note}</p>
          </div>
        ))}
      </Panel>

      <Panel eyebrow="CLEARED · BUILT ON THESE">
        {[...engine.INSTRUMENTS, ...engine.COMPUTED_SYSTEMS].map((instrument) => (
          <div key={instrument.id} style={S.rosterRow}>
            <div>
              <div style={{ ...fnText.body, color: fn.ink, fontSize: '15px' }}>{instrument.name}</div>
              <div style={{ ...fnText.caption, color: fn.meta }}>{instrument.rights.basis}</div>
              {instrument.rights.url && (
                <a href={instrument.rights.url} target="_blank" rel="noreferrer" style={S.link}>
                  {instrument.rights.url}
                </a>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', color: fn.moss, textTransform: 'uppercase' }}>
                {instrument.evidence}
              </span>
              {completionMap[instrument.id] && (
                <div style={{ ...fnText.caption, color: fn.ghost }}>
                  {completionMap[instrument.id].answered}/{completionMap[instrument.id].total}
                </div>
              )}
            </div>
          </div>
        ))}
      </Panel>

      <Panel
        eyebrow="PARKED · DO NOT BUILD YET"
        note="Questionable rights status. Not deleted from the roadmap · waiting on a licensing audit or a licensed integration."
      >
        {engine.PARKED_INSTRUMENTS.map((instrument) => (
          <div key={instrument.id} style={S.rosterRow}>
            <div>
              <div style={{ ...fnText.body, color: fn.ink, fontSize: '15px' }}>{instrument.name}</div>
              <div style={{ ...fnText.caption, color: fn.clay }}>{instrument.issue}</div>
              {instrument.quote && (
                <p style={{ ...fnText.caption, color: fn.meta, margin: `${space.sm} 0 0`, paddingLeft: space.md, borderLeft: `2px solid ${fn.clayEdge}` }}>
                  {instrument.quote}
                </p>
              )}
              <div style={{ ...fnText.caption, color: fn.ghost, marginTop: '2px' }}>{instrument.path}</div>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  )
}

/* ── shared bits ──────────────────────────────────────────── */

function Panel({ eyebrow, note, status, children }) {
  return (
    <section style={S.panel}>
      <div style={{ ...fnText.eyebrow, marginBottom: note ? '4px' : space.lg }}>
        {eyebrow}
        {status?.complete && (
          <span style={{ color: fn.moss, marginLeft: space.sm, letterSpacing: 0 }}>●</span>
        )}
      </div>
      {note && <p style={{ ...fnText.caption, color: fn.ghost, margin: `0 0 ${space.lg}` }}>{note}</p>}
      {children}
    </section>
  )
}

/* The manual save button. One reusable component, rendered from several
   places at once (the topbar, and — §18 — the bottom of every section in
   IntakeTab): "each section should have the save button" was the actual,
   plainly-stated request, after a topbar-only button (§17) went unnoticed
   by someone who was, reasonably, looking at the bottom of the section
   they'd just finished, not the top of the page.
   Every instance calls the same underlying save (there is one profile row,
   not one per section — "saving a section" really means "saving
   everything," same as autosave already does), but each instance owns its
   own local confirmation state, so pressing Save under one section doesn't
   make a different, untouched section's button light up "✓ Saved" too —
   only the one actually pressed reflects what just happened. */
function SaveButton({ onSave }) {
  const [status, setStatus] = useState('idle') // idle | saving | done | error
  const resetRef = useRef(null)

  useEffect(() => () => { if (resetRef.current) clearTimeout(resetRef.current) }, [])

  const handleClick = async () => {
    if (resetRef.current) { clearTimeout(resetRef.current); resetRef.current = null }
    setStatus('saving')
    const ok = await onSave()
    if (ok) {
      setStatus('done')
      resetRef.current = setTimeout(() => setStatus('idle'), 2200)
    } else {
      setStatus('error')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'saving'}
      style={{
        ...mono, fontSize: '13px', letterSpacing: '0.08em', fontWeight: 600,
        padding: '5px 14px', borderRadius: '2px',
        cursor: status === 'saving' ? 'default' : 'pointer',
        background: status === 'done' ? fn.moss : status === 'error' ? fn.clay : 'transparent',
        color: status === 'done' || status === 'error' ? fn.object : fn.ink,
        border: `1px solid ${status === 'done' ? fn.moss : status === 'error' ? fn.clay : fn.rule}`,
      }}
    >
      {status === 'saving' ? 'Saving…' : status === 'done' ? '✓ Saved' : status === 'error' ? 'Try again' : 'Save'}
    </button>
  )
}

function Field({ label, children, grow }) {
  return (
    <div style={{ marginBottom: space.lg, flex: grow ? '1 1 180px' : undefined }}>
      <label style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', color: fn.meta, display: 'block', marginBottom: '5px' }}>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  )
}

function KeyVal({ k, v }) {
  return (
    <div style={{ display: 'flex', gap: space.md, marginBottom: '6px', flexWrap: 'wrap' }}>
      <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', color: fn.ghost, minWidth: '130px' }}>
        {k.toUpperCase()}
      </span>
      <span style={{ ...fnText.body, fontSize: '15px', color: fn.ink, flex: 1 }}>{v}</span>
    </div>
  )
}

function makeToken() {
  const bytes = new Uint8Array(16)
  ;(window.crypto || window.msCrypto).getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Does this jsonb-bound object actually carry anything?
function hasKeys(value) {
  return Boolean(value) && typeof value === 'object' && Object.keys(value).length > 0
}

// Strip the card down to what a public reader may see. Belt and braces: the
// snapshot column should never have carried anything else, but the shape is
// enforced here rather than assumed.
//
// showRightNow omits the section from the STORED JSON rather than hiding it at
// render time. Hiding it in the renderer left the text sitting in the snapshot
// for anyone who read the raw response.
function publicCard(card, showRightNow = true) {
  const out = {
    header: card.header,
    wired: card.wired,
    symbols: card.symbols,
    fills: card.fills,
    attach: card.attach,
    footer: card.footer,
    evidenceMix: card.evidenceMix,
  }
  if (showRightNow) out.rightNow = card.rightNow
  return out
}

/* ── styles ───────────────────────────────────────────────── */

const S = {
  app: { minHeight: '100dvh', background: fn.ground, paddingBottom: space.huge },
  loadingWrap: {
    minHeight: '100dvh', background: fn.ground,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  loadingTape: { ...mono, fontSize: '13px', letterSpacing: '0.2em', color: fn.ghost },
  // Sticky, deliberately. It carries both the ambient sync indicator
  // ("● Saved" / "○ Saving…" / "⚠ Not saved") and the manual Save button
  // (§16 — a direct, repeated request for an actual button, not just a
  // status readout to trust). A static topbar scrolls out of view the
  // moment a founder is a screen or two into Step 2, and from there
  // neither the ambient status nor the button itself would be reachable.
  topbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: space.lg, flexWrap: 'wrap',
    padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${fn.rule}`,
    background: fn.object,
    position: 'sticky', top: 0, zIndex: 5,
  },
  brand: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: space.md,
    ...display, fontSize: '20px', color: fn.ink,
  },
  tabRow: {
    display: 'flex', gap: '6px', flexWrap: 'wrap',
    padding: `${space.md} ${space.xl}`, borderBottom: `1px solid ${fn.rule}`,
  },
  tab: {
    ...mono, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: `6px ${space.md}`, cursor: 'pointer',
    background: 'transparent', color: fn.meta,
    border: `1px dashed ${fn.rule}`, borderRadius: '2px',
  },
  tabActive: {
    ...mono, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: `6px ${space.md}`, cursor: 'pointer',
    background: fn.moss, color: fn.object,
    border: `1px solid ${fn.moss}`, borderRadius: '2px',
  },
  main: { maxWidth: '720px', margin: '0 auto', padding: `${space.xl}` },
  panel: {
    background: fn.object, border: `1px solid ${fn.rule}`, borderTop: `3px solid ${fn.moss}`,
    borderRadius: '2px', padding: space.xl, marginBottom: space.xl, boxShadow: shadow.fn.rest,
  },
  notice: {
    ...fnText.body, color: fn.ink, background: fn.clayTint,
    border: `1px solid ${fn.clayEdge}`, borderRadius: '2px',
    padding: space.lg, marginBottom: space.xl,
  },
  input: {
    width: '100%', boxSizing: 'border-box', background: fn.ground,
    border: `1px solid ${fn.rule}`, borderRadius: '2px', padding: space.md,
    ...fnText.body, fontSize: '15px', color: fn.ink, marginBottom: space.sm,
  },
  solidBtn: {
    ...mono, fontSize: '15px', letterSpacing: '0.1em', cursor: 'pointer',
    padding: `10px ${space.xl}`, background: fn.moss, color: fn.object,
    border: `1px solid ${fn.moss}`, borderRadius: '2px',
  },
  ghostBtn: {
    ...mono, fontSize: '15px', letterSpacing: '0.1em', cursor: 'pointer',
    padding: `10px ${space.lg}`, background: 'transparent', color: fn.ink,
    border: `1px dashed ${fn.rule}`, borderRadius: '2px',
  },
  dangerBtn: {
    ...mono, fontSize: '15px', letterSpacing: '0.1em', cursor: 'pointer',
    padding: `10px ${space.lg}`, background: 'transparent', color: fn.clay,
    border: `1px dashed ${fn.clayEdge}`, borderRadius: '2px',
  },
  disabledBtn: {
    ...mono, fontSize: '15px', letterSpacing: '0.1em', cursor: 'not-allowed',
    padding: `10px ${space.xl}`, background: 'transparent', color: fn.ghost,
    border: `1px dashed ${fn.rule}`, borderRadius: '2px',
  },
  resultBtn: {
    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
    padding: `8px ${space.md}`, background: 'transparent', color: fn.ink,
    border: `1px dashed ${fn.rule}`, borderRadius: '2px', marginBottom: '4px',
    ...fnText.body, fontSize: '15px',
  },
  details: { borderTop: `1px solid ${fn.rule}`, padding: `${space.md} 0` },
  summary: { ...fnText.body, fontSize: '15px', color: fn.ink, cursor: 'pointer' },
  rosterRow: {
    display: 'flex', justifyContent: 'space-between', gap: space.lg,
    padding: `${space.md} 0`, borderBottom: `1px solid ${fn.rule}`,
  },
  link: { ...fnText.caption, color: fn.moss, wordBreak: 'break-all' },
}
