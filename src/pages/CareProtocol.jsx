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
  { id: 'depth', label: 'Depth' },
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

        {tab === 'depth' && <DepthTab engine={engine} state={state} />}

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

  // §21 — section reflections. The beats, as stated directly and missed
  // for several rounds: "I answer the questions, I hit save, there's some
  // sort of reflection." Every section is a disclosure — rating "being
  // defended" a 5 and "shared adventure" a 2 says as much as a paragraph —
  // and an assessment tool that files those numbers with only a save
  // confirmation leaves the person unassessed. So: each section's Save,
  // once the save has actually landed, sends that section's answers and
  // computed scores to /api/care-reflection and renders what comes back
  // under the button that was pressed. Section-local by design — the
  // cross-system portrait stays the synthesis's job.
  const [sectionReflections, setSectionReflections] = useState({})
  // Fingerprint of the answers each section last reflected on, so pressing
  // Save twice on unchanged answers doesn't re-spend a model call.
  const sectionReflectedRef = useRef({})

  const reflectOnSection = useCallback(async (sectionKey, payload) => {
    if (!payload) return
    const fingerprint = JSON.stringify(payload)
    if (sectionReflectedRef.current[sectionKey] === fingerprint) return
    sectionReflectedRef.current[sectionKey] = fingerprint

    setSectionReflections((r) => ({ ...r, [sectionKey]: { status: 'loading' } }))
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch('/api/care-reflection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ section: payload, displayName: state.displayName }),
      })
      const body = await res.json()
      if (!res.ok || !body?.reflection) throw new Error(body?.error || `Reflection failed (${res.status})`)
      setSectionReflections((r) => ({ ...r, [sectionKey]: { status: 'done', text: body.reflection } }))
    } catch (err) {
      // Same visibility rule as the freetext path: fail calm, never silent.
      console.error('[care-reflection] section reflection failed:', err?.message || err)
      setSectionReflections((r) => ({ ...r, [sectionKey]: { status: 'error' } }))
    }
  }, [state?.displayName])

  // Payload builders. Return null when a section has nothing to reflect on
  // yet — Save still works, there's just no reading to give.
  const buildInstrumentsPayload = (name, instruments) => {
    const withAnswers = instruments.filter((i) => i.items.some((item) => {
      const v = state.responses[item.id]
      return v != null && v !== ''
    }))
    if (!withAnswers.length) return null
    const answers = []
    const scores = []
    withAnswers.forEach((instrument) => {
      if (withAnswers.length > 1) answers.push(`— ${instrument.name} —`)
      answers.push(...describeAnswers(instrument, state.responses))
      scores.push(...describeScores(instrument, state.responses))
    })
    return {
      name,
      evidence: withAnswers.map((i) => i.evidence).join(' + '),
      answers: answers.join('\n'),
      scores: scores.length ? scores.join('\n') : null,
    }
  }

  const buildBirthPayload = () => {
    if (!state.chart?.big3) return null
    const lines = [
      `Sun ${state.chart.big3.sun.formatted} · Moon ${state.chart.big3.moon.formatted} · Rising ${state.chart.big3.rising.formatted}`,
      state.humanDesign
        ? `Human Design: ${state.humanDesign.shorthand} · ${state.humanDesign.authority} authority · ${state.humanDesign.definition} definition`
        : null,
      state.extras?.chinese ? `Chinese zodiac: ${state.extras.chinese.label}` : null,
      state.extras?.numerology ? `Life path: ${state.extras.numerology.lifePath}` : null,
    ].filter(Boolean)
    return {
      name: 'Birth data — the computed chart',
      evidence: 'mythic',
      answers: lines.join('\n'),
      scores: null,
    }
  }

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

        {/* §18/§21 — a Save button at the bottom of the section, and a
            reflection under it once the save lands: answer → Save → the
            tool says what it saw in this section's chart. */}
        {onSaveNow && (
          <div style={{ marginTop: space.lg }}>
            <SaveButton
              onSave={onSaveNow}
              onSaved={() => reflectOnSection('birth', buildBirthPayload())}
            />
            <SectionReflection reflection={sectionReflections.birth} />
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
              <SaveButton
                onSave={onSaveNow}
                onSaved={() => reflectOnSection(
                  instrument.id,
                  buildInstrumentsPayload(instrument.name, [instrument]),
                )}
              />
              <SectionReflection reflection={sectionReflections[instrument.id]} />
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
            <SaveButton
              onSave={onSaveNow}
              onSaved={() => reflectOnSection(
                'deepen',
                buildInstrumentsPayload('Deepen the protocol (optional depth)', deepen),
              )}
            />
            <SectionReflection reflection={sectionReflections.deepen} />
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

/* ── depth ────────────────────────────────────────────────── */

// §22 — the full read behind the card. Founder-only by placement (this tab
// only exists inside the gated workspace) and deliberately NOT part of the
// shareable card or its public snapshot: the card stays lean; this is where
// the whole chart and the whole bodygraph live. Everything rendered here is
// mythic-tier and labelled as such — same honesty rule as the roster.
const BODY_LABELS = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune',
  pluto: 'Pluto', earth: 'Earth', northnode: 'North Node', southnode: 'South Node',
}

const ASPECT_GLYPH = { conjunction: '☌', sextile: '﹡', square: '□', trine: '△', opposition: '☍' }

function aspectColor(bucket) {
  return bucket === 'tense' ? fn.clay : bucket === 'harmonious' ? fn.moss : fn.ink
}

function DepthRow({ k, v, accent }) {
  return (
    <div style={{ display: 'flex', gap: space.md, marginBottom: '5px', flexWrap: 'wrap' }}>
      <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', color: fn.ghost, minWidth: '110px' }}>
        {k.toUpperCase()}
      </span>
      <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.06em', color: accent || fn.ink, flex: 1 }}>
        {v}
      </span>
    </div>
  )
}

function BalanceBar({ label, pct }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space.md, marginBottom: '5px' }}>
      <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', color: fn.ghost, minWidth: '110px' }}>
        {label.toUpperCase()}
      </span>
      <div style={{ flex: 1, height: '8px', background: fn.ground, borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: fn.moss }} />
      </div>
      <span style={{ ...mono, fontSize: '13px', color: fn.meta, minWidth: '38px', textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  )
}

function DepthTab({ engine, state }) {
  // Charts saved before houses existed lack them; the birth data is still
  // here, so recompute a display copy rather than telling the founder to go
  // re-press a button. Not written back — the stored chart updates on the
  // next real "Recompute chart".
  const chart = useMemo(() => {
    if (!engine || !state?.chart) return state?.chart || null
    if (state.chart.houses?.length) return state.chart
    if (state.birth?.date && state.birth?.lat != null) {
      try {
        const birth = engine.birthFromParts(
          state.birth.date,
          state.birth.unknownTime ? '12:00' : (state.birth.time || '12:00'),
          state.birth.lat,
          state.birth.lon,
        )
        return engine.computeChart(birth)
      } catch (_) { return state.chart }
    }
    return state.chart
  }, [engine, state?.chart, state?.birth])

  const hd = state?.humanDesign
  const aspects = useMemo(
    () => (engine && chart?.placements ? engine.natalAspects(chart) : []),
    [engine, chart],
  )
  const cross = useMemo(
    () => (engine && hd ? engine.incarnationCross(hd) : null),
    [engine, hd],
  )

  // The daily read is the expensive piece (the upcoming-events search walks
  // the ephemeris forward), so it computes after first paint behind a
  // loading line instead of blocking the tab switch.
  const [daily, setDaily] = useState(null)
  useEffect(() => {
    if (!engine || !chart?.placements) return undefined
    setDaily(null)
    const id = setTimeout(() => {
      try { setDaily(engine.computeDepthDaily(chart, hd, new Date())) }
      catch (err) { console.error('[care-depth] daily read failed:', err); setDaily({ failed: true }) }
    }, 30)
    return () => clearTimeout(id)
  }, [engine, chart, hd])

  if (!chart?.placements) {
    return (
      <Panel eyebrow="DEPTH" note="The full chart and bodygraph, behind the card's summary.">
        <p style={{ ...fnText.body, color: fn.meta, margin: 0 }}>
          Compute your chart in the Intake tab first — everything here is read
          from it.
        </p>
      </Panel>
    )
  }

  const houses = chart.houses?.length ? chart.houses : null

  return (
    <div>
      {/* The full natal chart */}
      <Panel
        eyebrow="THE FULL CHART · MYTHIC"
        note="All ten placements with houses, plus the angles and nodes. The card carries only the top three; this is the whole sky at your birth."
      >
        {Object.entries(chart.placements).map(([key, p]) => (
          <DepthRow
            key={key}
            k={BODY_LABELS[key]}
            v={`${p.formatted}${p.house ? ` · house ${p.house}` : ''}${p.retrograde ? '  ℞' : ''}`}
          />
        ))}
        <div style={{ height: space.md }} />
        <DepthRow k="Ascendant" v={chart.ascendant.formatted} />
        <DepthRow k="Midheaven" v={chart.midheaven.formatted} />
        <DepthRow k="North Node" v={chart.northNode.formatted} />
        <DepthRow k="South Node" v={chart.southNode.formatted} />
        {!houses && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.md} 0 0` }}>
            Houses will appear after the next "Recompute chart" in Intake.
          </p>
        )}
      </Panel>

      {/* Element and modality balance */}
      {chart.balance && (
        <Panel
          eyebrow="BALANCE · MYTHIC"
          note="Element and modality weighting across the whole chart. Sun, Moon and Ascendant count double, per convention."
        >
          {Object.entries(chart.balance.elements).map(([el, pct]) => (
            <BalanceBar key={el} label={el} pct={pct} />
          ))}
          <div style={{ height: space.md }} />
          {Object.entries(chart.balance.modalities).map(([m, pct]) => (
            <BalanceBar key={m} label={m} pct={pct} />
          ))}
        </Panel>
      )}

      {/* Natal aspects */}
      <Panel
        eyebrow="NATAL ASPECTS · MYTHIC"
        note="Every classical aspect in the birth chart, tightest first. Same orbs as the daily sky, so an aspect means the same thing everywhere."
      >
        {aspects.map((a) => (
          <DepthRow
            key={`${a.a}-${a.b}-${a.name}`}
            k={`${BODY_LABELS[a.a] || a.a} ${ASPECT_GLYPH[a.name] || ''} ${BODY_LABELS[a.b] || a.b}`}
            v={`${a.name} · ${a.orb}° orb`}
            accent={aspectColor(a.bucket)}
          />
        ))}
        {!aspects.length && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>No aspects within orb.</p>
        )}
      </Panel>

      {/* The full bodygraph */}
      {hd && (
        <Panel
          eyebrow="BODYGRAPH IN FULL · MYTHIC"
          note="Both activation columns — personality (conscious, black) and design (unconscious, red) — with every gate named."
        >
          <div style={{ display: 'flex', gap: space.xl, flexWrap: 'wrap' }}>
            {[['personality', 'PERSONALITY · CONSCIOUS'], ['design', 'DESIGN · UNCONSCIOUS']].map(([side, label]) => (
              <div key={side} style={{ flex: '1 1 280px' }}>
                <div style={{ ...fnText.eyebrow, marginBottom: space.md }}>{label}</div>
                {hd[side] && Object.entries(hd[side]).map(([body, activation]) => (
                  <DepthRow
                    key={body}
                    k={BODY_LABELS[body] || body}
                    v={`${activation.gate}.${activation.line} · ${engine.GATE_NAMES[activation.gate]}`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div style={{ height: space.lg }} />
          <div style={{ ...fnText.eyebrow, marginBottom: space.md }}>CHANNELS</div>
          {(hd.channels || []).map((ch) => (
            <DepthRow key={ch} k={ch} v={engine.CHANNEL_NAMES[ch] || '—'} />
          ))}

          {cross && (
            <>
              <div style={{ height: space.lg }} />
              <div style={{ ...fnText.eyebrow, marginBottom: space.md }}>INCARNATION CROSS</div>
              <DepthRow k="Angle" v={cross.angle || '—'} />
              <DepthRow
                k="Gates"
                v={`${cross.personalitySun.gate}/${cross.personalityEarth.gate} | ${cross.designSun.gate}/${cross.designEarth.gate}`}
              />
              <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
                {cross.personalitySun.name} / {cross.personalityEarth.name} over{' '}
                {cross.designSun.name} / {cross.designEarth.name} · personality Sun/Earth
                over design Sun/Earth. The four gates are the cross; traditional
                proper names for each combination vary by school.
              </p>
            </>
          )}

          <div style={{ height: space.lg }} />
          <div style={{ ...fnText.eyebrow, marginBottom: space.md }}>LIVING IT</div>
          <DepthRow k="Strategy" v={engine.TYPE_GUIDANCE[hd.type]?.strategy || '—'} />
          <DepthRow k="Signature" v={engine.TYPE_KEYNOTES[hd.type]?.signature || '—'} accent={fn.moss} />
          <DepthRow k="Not-self" v={engine.TYPE_KEYNOTES[hd.type]?.notSelf || '—'} accent={fn.clay} />
          <p style={{ ...fnText.caption, color: fn.meta, margin: `${space.sm} 0 0` }}>
            {engine.AUTHORITY_GUIDANCE[hd.authority]}
          </p>
        </Panel>
      )}

      {/* Today, in depth */}
      <Panel
        eyebrow="TODAY IN DEPTH · MYTHIC"
        note="The whole transiting sky against your chart — the card's Today's Sky keeps the headline; this is the full page."
      >
        {!daily && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>reading the sky…</p>
        )}
        {daily?.failed && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>
            The daily read didn't load that time — everything above is unaffected.
          </p>
        )}
        {daily && !daily.failed && (
          <>
            <div style={{ ...fnText.eyebrow, marginBottom: space.md }}>THE SKY · {daily.date}</div>
            {Object.entries(daily.sky).map(([key, s]) => (
              <DepthRow key={key} k={BODY_LABELS[key]} v={`${s.formatted}${s.retrograde ? '  ℞' : ''}`} />
            ))}

            <div style={{ height: space.lg }} />
            <div style={{ ...fnText.eyebrow, marginBottom: space.md }}>ASPECTS TO YOUR CHART</div>
            {daily.aspects.map((a) => (
              <DepthRow
                key={`${a.transiting}-${a.natal}-${a.name}`}
                k={`${BODY_LABELS[a.transiting]} ${ASPECT_GLYPH[a.name] || ''} natal ${BODY_LABELS[a.natal] || a.natal}`}
                v={`${a.name} · ${a.orb}° orb`}
                accent={aspectColor(a.bucket)}
              />
            ))}
            {!daily.aspects.length && (
              <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>
                No personal-planet aspects within orb today.
              </p>
            )}

            {hd && (
              <>
                <div style={{ height: space.lg }} />
                <div style={{ ...fnText.eyebrow, marginBottom: space.md }}>HUMAN DESIGN WEATHER</div>
                {Object.entries(daily.humanDesign.activations).map(([body, activation]) => (
                  <DepthRow
                    key={body}
                    k={BODY_LABELS[body] || body}
                    v={`gate ${activation.gate}.${activation.line} · ${engine.GATE_NAMES[activation.gate]}`}
                  />
                ))}
                <div style={{ height: space.md }} />
                {daily.humanDesign.temporaryChannels.length ? (
                  daily.humanDesign.temporaryChannels.map((c) => (
                    <p key={c.channel} style={{ ...fnText.caption, color: fn.meta, margin: `0 0 ${space.sm}` }}>
                      Today's gate {c.transitingGate} ({BODY_LABELS[c.transitingBodies[0]] || c.transitingBodies[0]})
                      completes the {c.channel} channel{c.channelName ? ` — ${c.channelName}` : ''} with your
                      natal gate {c.natalGate}. Temporary: it lifts when the transit moves on.
                    </p>
                  ))
                ) : (
                  <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>
                    No temporary channels today — the sky isn't bridging anything new in your chart.
                  </p>
                )}
              </>
            )}

            <div style={{ height: space.lg }} />
            <div style={{ ...fnText.eyebrow, marginBottom: space.md }}>COMING UP</div>
            {daily.events.nextFullMoon && <DepthRow k="Full moon" v={daily.events.nextFullMoon} />}
            {daily.events.nextNewMoon && <DepthRow k="New moon" v={daily.events.nextNewMoon} />}
            {daily.events.retrogradesEnding.map((r) => (
              <DepthRow
                key={r.body}
                k={`${BODY_LABELS[r.body]} ℞`}
                v={r.endsOn ? `direct on ${r.endsOn}` : 'stays retrograde beyond this horizon'}
              />
            ))}
            {!daily.events.retrogradesEnding.length && (
              <DepthRow k="Retrogrades" v="none among the personal and social planets" />
            )}
          </>
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

/* The manual save button. One reusable component, rendered at the bottom
   of every section in IntakeTab (§18/§20): "each section should have the
   save button" was the actual, plainly-stated request.
   Every instance calls the same underlying save (there is one profile row,
   not one per section — "saving a section" really means "saving
   everything," same as autosave already does), but each instance owns its
   own local confirmation state, so pressing Save under one section doesn't
   make a different, untouched section's button light up "✓ Saved" too —
   only the one actually pressed reflects what just happened.
   onSaved (optional) fires after a save that actually landed — §21 hangs
   the section reflection off it, so the beat is exactly: answer → Save →
   the tool turns and says what it saw. Fire-and-forget: a slow or failed
   reflection must never make a successful save look unsaved. */
function SaveButton({ onSave, onSaved }) {
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
      if (onSaved) onSaved()
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

/* §21 — the section reflection panel, rendered under a section's Save
   button once its reflection lands. Same visual language as the freetext
   ReflectionPanel in InstrumentRunner.jsx (moss tint, "reflection" eyebrow,
   deliberately NOT italic — italic is reserved for the person's own words),
   living here because sections are this file's concern, items are the
   runner's. */
function SectionReflection({ reflection }) {
  if (!reflection || reflection.status === 'idle') return null
  if (reflection.status === 'error') {
    return (
      <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
        A reflection didn't load that time — your answers are still saved.
      </p>
    )
  }
  return (
    <div
      style={{
        marginTop: space.md,
        padding: `${space.sm} ${space.md}`,
        background: fn.mossTint,
        borderLeft: `2px solid ${fn.mossEdge}`,
        borderRadius: '2px',
      }}
    >
      {reflection.status === 'loading' ? (
        <p style={{ ...fnText.eyebrow, margin: 0 }}>reading this…</p>
      ) : (
        <>
          <p style={{ ...fnText.eyebrow, margin: `0 0 4px` }}>reflection</p>
          <p style={{ ...fnText.body, color: fn.ink, margin: 0 }}>{reflection.text}</p>
        </>
      )}
    </div>
  )
}

/* §21 — serializers: turn a section's answers and scores into the readable
   grounding the reflection model works from. Generic over item TYPE, never
   over instrument identity — the same rule the runner lives by ("adding
   assessment fourteen is a data task, not a dev task"). A likert answer
   becomes "label: 4/5", a choice becomes the chosen option's label, a
   freetext answer is passed through in the person's own words. */
function describeAnswers(instrument, responses) {
  const lines = []
  const scale = instrument.scale
  if (scale?.anchors) {
    lines.push(`(rating scale: 1 = "${scale.anchors[1]}", ${scale.points} = "${scale.anchors[scale.points]}")`)
  }
  instrument.items.forEach((item) => {
    const v = responses[item.id]
    if (v == null || v === '') return
    if (item.type === 'choice') {
      const opt = (item.options || []).find((o) => o.value === v)
      lines.push(`${item.text} → ${opt ? opt.label : v}`)
    } else if (item.type === 'text' || item.type === 'longtext') {
      lines.push(`${item.text} → in their own words: "${v}"`)
    } else {
      lines.push(`${item.label || item.text}: ${v}/${scale?.points || '?'}`)
    }
  })
  if (instrument.finalPick) {
    const v = responses[instrument.finalPick.id]
    if (v) {
      const opt = instrument.finalPick.options.find((o) => o.value === v)
      lines.push(`${instrument.finalPick.prompt} → ${opt ? opt.label : v}`)
    }
  }
  return lines
}

function describeScores(instrument, responses) {
  if (typeof instrument.score !== 'function') return []
  let scored
  try { scored = instrument.score(responses) } catch (_) { return [] }
  if (!scored) return []
  return Object.entries(scored).map(([key, s]) => {
    const parts = [`${key}: ${s.value}/100`]
    if (s.z != null) parts.push(`z = ${s.z} vs population norms`)
    if (s.keeper) parts.push('the single one they said they would keep')
    if (s.confidence != null && s.confidence < 1) {
      parts.push(`partially answered (${Math.round(s.confidence * 100)}%)`)
    }
    return parts.join(' · ')
  })
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
