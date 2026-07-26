// src/pages/CareProtocol.jsx
//
// The Care Protocol — hidden, founder-only. Reached from the Movie Magic
// topbar; the route is unlinked from all navigation.
//
// UI gate mirrors the Movie Magic / AdminConsole founder check (tolerant of
// either metadata source so the founder cannot be locked out). Real
// enforcement is RLS in sql/181_care_protocol.sql, which requires app_metadata
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
    if (!snapshot) return
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
      if (error) { setSyncStatus('error'); return }
      lastSyncRef.current = stamp
      setSyncStatus('synced')
      return
    }

    const { data, error } = await supabase
      .from('care_profiles')
      .update(row)
      .eq('user_id', user.id)
      .eq('updated_at', lastSyncRef.current)
      .select('updated_at')

    if (error) { setSyncStatus('error'); return }
    if (data && data.length) {
      lastSyncRef.current = data[0].updated_at
      setSyncStatus('synced')
      return
    }

    // Conflict: somebody else saved since we loaded. Take theirs as the base
    // and lay ours on top, unioning the response map rather than replacing it,
    // so answers given on the other device survive.
    const { data: remote, error: fetchErr } = await supabase
      .from('care_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (fetchErr || !remote) { setSyncStatus('error'); return }

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
    if (mergeErr) { setSyncStatus('error'); return }
    lastSyncRef.current = merged.updated_at
    setSyncStatus('synced')
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
          <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', color: fn.ghost }}>
            {syncStatus === 'synced' ? '● synced' : syncStatus === 'syncing' ? '○ saving…' : '⚠ not saved'}
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
          />
        )}

        {tab === 'card' && (
          <div style={{ padding: `${space.xl} 0` }}>
            <CareCard card={card} qrDataUrl={qrDataUrl} />
          </div>
        )}

        {tab === 'roster' && <RosterTab engine={engine} completionMap={completionMap} />}
      </main>
    </div>
  )
}

/* ── intake ───────────────────────────────────────────────── */

function IntakeTab({ state, setState, setResponse, engine, completionMap, runComputation, computing }) {
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [searching, setSearching] = useState(false)

  const searchPlace = async () => {
    if (!placeQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=${encodeURIComponent(placeQuery)}`,
      )
      const body = await res.json()
      setPlaceResults(body?.results || [])
    } catch (_) {
      setPlaceResults([])
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
      </Panel>

      {/* Steps 2-4 — the core instruments */}
      {core.map((instrument, index) => (
        <Panel
          key={instrument.id}
          eyebrow={`STEP ${index + 2} · ${instrument.shortName.toUpperCase()}`}
          note={`${instrument.estimatedMinutes} min · ${instrument.evidence}`}
          status={completionMap[instrument.id]}
        >
          <InstrumentRunner instrument={instrument} responses={state.responses} onChange={setResponse} />
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
              <InstrumentRunner instrument={instrument} responses={state.responses} onChange={setResponse} />
            </div>
          </details>
        ))}
      </Panel>
    </div>
  )
}

/* ── protocol ─────────────────────────────────────────────── */

function ProtocolTab({
  state, setState, card, engine, runSynthesis, synthesising, synthError,
  share, shareError, createShare, refreshShare, revokeShare,
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
  topbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: space.lg, flexWrap: 'wrap',
    padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${fn.rule}`,
    background: fn.object,
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: space.md,
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
