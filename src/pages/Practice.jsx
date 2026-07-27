// src/pages/Practice.jsx
//
// THE PRACTICE — recovery-informed daily tools. Its own standalone tool,
// with its own front door in the Profile panel (ProfileMissionPanel.jsx),
// alongside Admin Console, Movie Magic, Care Protocol and Prism Lab. The
// route is unlinked from all other navigation, same as its siblings.
//
// HISTORY: this began as a tab inside Care Protocol (build note §24/§24b),
// then grew a personal layer — per-state counters, a breath practice,
// bookending, co-regulation, and a founder-approved read into Care
// Protocol's synthesis (Practice_v2_Personal_Layer_Brief.md). Direct
// request afterward: pull it out into its own tool with its own front door,
// the same way Admin Console and Movie Magic each get their own door rather
// than living as a tab inside something else. The underlying engine
// (src/lib/practice) was already fully portable — no Care Protocol
// dependency, no React, no Supabase — so this extraction is a page move and
// a table rename (care_practice_events → practice_events), not a rewrite.
// Every panel, every event kind, and every reflection prompt is unchanged.
//
// UI gate mirrors Care Protocol's and Homecoming's founder check (tolerant
// of either metadata source so the founder cannot be locked out). Real
// enforcement is RLS in sql/188_practice.sql, which requires app_metadata
// only — the same two-layer model every hidden tool in this app uses.
//
// Cross-tool read, by design: Care Protocol's synthesis (api/care-synthesis.js)
// may read this table directly to build a trends-only recovery context via
// buildRecoveryContext() — a founder-approved decision (full AI access,
// Practice_v2_Personal_Layer_Brief.md §7). That is the ONLY thing anything
// outside this file reads from practice_events, and it is a summary read,
// never a share-adjacent one: nothing here is reachable from any card,
// snapshot, or public route, in this tool or any other.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'
import { fn, fnText, space, shadow, mono } from '../lib/designTokens'
import * as engine from '../lib/practice'

// Tolerant UI gate. RLS is the real boundary (sql/188_practice.sql).
const isFounder = (user) =>
  user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'

/* ── gate ─────────────────────────────────────────────────── */
export function PracticePage() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading || user === undefined) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.loadingTape}>OPENING THE PRACTICE…</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isFounder(user)) return <Navigate to="/" replace />

  return <PracticeWorkspace user={user} />
}

export default PracticePage

/* ── workspace ────────────────────────────────────────────── */

function PracticeWorkspace({ user }) {
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  const [events, setEvents] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('practice_events')
        .select('*')
        .eq('user_id', user.id)
        .order('at', { ascending: false })
        .limit(400)
      if (cancelled) return
      // Same house rule as the profile load: a read failure is not an empty
      // log. Refuse to render an empty practice over a real one — a founder
      // seeing "no tape" when a tape exists would retype it, and while the
      // event model makes that harmless to the data, it is not harmless to
      // the person.
      if (error) { setLoadError(error.message || 'Could not read the practice log'); return }
      setEvents(data || [])
    })()
    return () => { cancelled = true }
  }, [user.id])

  // One INSERT per entry, no debounce, no merge machinery — see sql/188.
  // Returns true/false so each LogButton can own its confirmation, same
  // contract as SaveButton/persist().
  const addEvent = useCallback(async (kind, payload) => {
    const { data, error } = await supabase
      .from('practice_events')
      .insert({ user_id: user.id, kind, payload })
      .select('*')
      .single()
    if (error || !data) {
      console.error('[care-practice] insert failed:', error?.message || error)
      return false
    }
    setEvents((e) => [data, ...(e || [])])
    return true
  }, [user.id])

  /* practice reflections — practice mode of api/care-reflection.js, one
     shared caller for both kinds (urge, return). Mirrors reflectOn's auth
     pattern; fails calm, never silent. */
  const [urgeReflection, setUrgeReflection] = useState(null)
  const [returnReflection, setReturnReflection] = useState(null)
  const firePracticeReflection = useCallback(async (kind, entry, setReflection, recoveryContext) => {
    setReflection({ status: 'loading' })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch('/api/care-reflection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // context: ~30-day trends plus the founder's own tape/counter-lines,
        // shaping the reflection's bearing (full-access decision). Computed
        // at the call site from the freshest event list, never here.
        body: JSON.stringify({ practice: { kind, entry, context: recoveryContext || undefined }, displayName }),
      })
      const body = await res.json()
      if (!res.ok || !body?.reflection) throw new Error(body?.error || `Reflection failed (${res.status})`)
      setReflection({ status: 'done', text: body.reflection })
    } catch (err) {
      console.error('[care-reflection] practice reflection failed:', err?.message || err)
      setReflection({ status: 'error' })
    }
  }, [displayName])
  const reflectOnUrge = useCallback((payload, context, recoveryContext) => {
    if (!engine) return
    firePracticeReflection('urge', engine.describeUrgeForReflection(payload, context), setUrgeReflection, recoveryContext)
  }, [engine, firePracticeReflection])
  const reflectOnReturn = useCallback((payload, recoveryContext) => {
    if (!engine) return
    firePracticeReflection('return', engine.describeReturnForReflection(payload), setReturnReflection, recoveryContext)
  }, [engine, firePracticeReflection])

  /* local form state */
  const [stateNote, setStateNote] = useState('')
  const [lastNamed, setLastNamed] = useState(null) // state key just logged → truth line
  const [urgePull, setUrgePull] = useState(null)
  const [urgeTrigger, setUrgeTrigger] = useState('')
  const [urgeAction, setUrgeAction] = useState(null)
  const [urgeBookended, setUrgeBookended] = useState(false)
  const [customLoop, setCustomLoop] = useState('')
  const [receiptText, setReceiptText] = useState('')
  const [returnDraft, setReturnDraft] = useState({ off: '', well: '', clear: '' })
  const [tapeText, setTapeText] = useState('')
  const [sceneLastText, setSceneLastText] = useState('')
  const tapeSeeded = useRef(false)
  const [windowNote, setWindowNote] = useState('')
  const [counterDrafts, setCounterDrafts] = useState({})
  const [showCounterEditor, setShowCounterEditor] = useState(false)
  const [bookendAction, setBookendAction] = useState('')
  const [bookendOutcome, setBookendOutcome] = useState('')
  const [bookendTalked, setBookendTalked] = useState(null)
  const [coregWho, setCoregWho] = useState('')
  const [proxyText, setProxyText] = useState('')
  const [breathRunning, setBreathRunning] = useState(false)
  const [breathElapsed, setBreathElapsed] = useState(0)
  const breathTimer = useRef(null)

  // Seed the editors once, from the newest events, when the log arrives. Not
  // on every change — the founder's in-progress edit must never be clobbered
  // by a re-render.
  useEffect(() => {
    if (!engine || !events || tapeSeeded.current) return
    tapeSeeded.current = true
    setTapeText(engine.latestTape(events))
    setSceneLastText(engine.latestSceneLast(events))
    setCounterDrafts(engine.latestCounters(events))
  }, [engine, events])

  // The breath pacer. One-second tick while running; the cap stops the
  // pacing (titration, not endurance) but never logs by itself — every entry
  // stays one explicit press.
  useEffect(() => {
    if (!breathRunning) return undefined
    breathTimer.current = setInterval(() => {
      setBreathElapsed((s) => {
        if (s + 1 >= (engine?.BREATH_MAX_SECONDS || 300)) {
          setBreathRunning(false)
          return engine?.BREATH_MAX_SECONDS || 300
        }
        return s + 1
      })
    }, 1000)
    return () => clearInterval(breathTimer.current)
  }, [breathRunning, engine])

  if (loadError) {
    return (
      <div style={S.app}>
        <div style={S.topbar}>
          <div style={S.brand}>THE PRACTICE</div>
        </div>
        <div style={S.main}>
          <Panel eyebrow="THE PRACTICE" note="Recovery-informed daily tools. Founder-only.">
            <p style={{ ...fnText.body, color: fn.ink, margin: `0 0 ${space.md}` }}>
              The practice log could not be read just now — it is still on the
              server, unchanged. Reload rather than re-entering anything.
            </p>
            <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>{loadError}</p>
          </Panel>
        </div>
      </div>
    )
  }

  if (!events) {
    return (
      <div style={S.app}>
        <div style={S.topbar}>
          <div style={S.brand}>THE PRACTICE</div>
        </div>
        <div style={S.main}>
          <p style={{ ...fnText.body, color: fn.ghost }}>Loading the practice…</p>
        </div>
      </div>
    )
  }

  const window_ = engine.openReceivingWindow(events, new Date())
  const bookend = engine.openBookend(events)
  const counters = engine.latestCounters(events)
  const savedSceneLast = engine.latestSceneLast(events)
  const coregDays = engine.daysSinceLast(events, 'coreg', new Date())
  // Fresh at every call — render-scope, so it always reads the newest event
  // list, unlike anything captured inside a useCallback.
  const recoveryContextNow = () => engine.buildRecoveryContext(events, { now: new Date() })
  const todayKey = engine.dayKeyOf(new Date().toISOString())
  const todaysEvents = events.filter((e) => engine.dayKeyOf(e.at) === todayKey)
  const todaysLoops = todaysEvents.filter((e) => e.kind === 'loop')
  const todaysStates = todaysEvents.filter((e) => e.kind === 'state')
  const todaysReceipts = todaysEvents.filter((e) => e.kind === 'receipt')
  const anchoredToday = engine.loggedToday(events, 'anchor', todayKey)
  const returnedToday = engine.loggedToday(events, 'return', todayKey)
  const returnHasContent = Object.values(returnDraft).some((v) => v.trim())

  const logReturn = async () => {
    if (!returnHasContent) return false
    const payload = {}
    engine.RETURN_FIELDS.forEach((f) => {
      const v = returnDraft[f.key]?.trim()
      if (v) payload[f.key] = v
    })
    const ok = await addEvent('return', payload)
    if (ok) {
      // Fire-and-forget, same rule as everywhere: a slow reflection never
      // makes a successful log look unlogged.
      reflectOnReturn(payload, recoveryContextNow())
      setReturnDraft({ off: '', well: '', clear: '' })
    }
    return ok
  }
  const lastStateToday = todaysStates.length
    ? engine.PRACTICE_STATES_BY_KEY[todaysStates[0].payload?.state]?.label || null
    : null
  const history = engine.groupByDay(events, 7)
  const savedTape = engine.latestTape(events)

  const logUrge = async () => {
    if (!urgePull || !urgeAction) return false
    const payload = {
      pull: urgePull,
      trigger: urgeTrigger.trim() || undefined,
      action: urgeAction,
      bookended: urgeBookended || undefined,
      duringWindow: window_ ? true : undefined,
      duringBookend: bookend ? true : undefined,
    }
    const ok = await addEvent('urge', payload)
    if (ok) {
      // Fire-and-forget, same rule as section reflections: a slow or failed
      // reflection must never make a successful log look unlogged.
      reflectOnUrge(
        payload,
        { lastState: lastStateToday, windowOpen: Boolean(window_), bookendOpen: bookend?.action || null },
        recoveryContextNow(),
      )
      setUrgePull(null)
      setUrgeTrigger('')
      setUrgeAction(null)
      setUrgeBookended(false)
    }
    return ok
  }

  return (
    <div style={S.app}>
      <div style={S.topbar}>
        <div style={S.brand}>THE PRACTICE</div>
        <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>
          Recovery-informed daily tools. Founder-only · never on any shared card.
        </p>
      </div>
      <div style={S.main}>
      {/* the receiving-window banner — quiet clay: attention, not alarm */}
      {window_ && (
        <div style={{ ...S.notice, borderColor: fn.clayEdge }}>
          <strong style={{ color: fn.clay }}>Receiving window open</strong>
          {window_.note ? ` · ${window_.note}` : ''} · about {window_.hoursLeft}h left.
          Urges are expected in here — they are withdrawal, not truth. No big
          moves; let it land.
        </div>
      )}

      {/* 1 · state check-in */}
      <Panel
        eyebrow="STATE CHECK-IN"
        note="Ten seconds. Which state is the system in right now? Naming it is the tool — the label itself turns the volume down."
      >
        <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', marginBottom: space.md }}>
          {engine.PRACTICE_STATES.map((st) => (
            <StateLogButton
              key={st.key}
              state={st}
              onLog={async () => {
                const ok = await addEvent('state', {
                  state: st.key,
                  note: stateNote.trim() || undefined,
                })
                if (ok) { setLastNamed(st.key); setStateNote('') }
                return ok
              }}
            />
          ))}
        </div>
        <input
          type="text"
          value={stateNote}
          placeholder="Optional: one line about what's underneath it"
          onChange={(e) => setStateNote(e.target.value)}
          maxLength={160}
          style={S.input}
        />
        {lastNamed && engine.PRACTICE_STATES_BY_KEY[lastNamed] && (
          <div style={{ marginTop: space.sm, padding: `${space.sm} ${space.md}`, background: fn.mossTint, borderLeft: `2px solid ${fn.mossEdge}`, borderRadius: '2px' }}>
            <p style={{ ...fnText.eyebrow, margin: '0 0 4px' }}>named</p>
            <p style={{ ...fnText.body, color: fn.ink, margin: 0 }}>
              {engine.PRACTICE_STATES_BY_KEY[lastNamed].truth}
            </p>
            {counters[lastNamed] && (
              /* The personal layer: the founder's own counter-line for this
                 state, entered below and stored in rows, never in the repo.
                 Italic is legitimate here — these are the user's own words,
                 which is the exact case the design law reserves italic for. */
              <p style={{ ...fnText.body, color: fn.ink, fontStyle: 'italic', margin: `${space.sm} 0 0` }}>
                {counters[lastNamed]}
              </p>
            )}
          </div>
        )}
        {todaysStates.length > 0 && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.md} 0 0` }}>
            Today: {todaysStates.slice().reverse().map((e) =>
              engine.PRACTICE_STATES_BY_KEY[e.payload?.state]?.label.toLowerCase() || e.payload?.state,
            ).join(' → ')}
          </p>
        )}
        <div style={{ marginTop: space.md }}>
          <button
            type="button"
            onClick={() => setShowCounterEditor((v) => !v)}
            style={{ ...fnText.caption, color: fn.ghost, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {showCounterEditor ? 'Hide counter-lines' : 'Your counter-lines — the answer each state already has, in your words'}
          </button>
          {showCounterEditor && (
            <div style={{ marginTop: space.md }}>
              <p style={{ ...fnText.caption, color: fn.ghost, margin: `0 0 ${space.md}` }}>
                One line per state, from your own written work — the documented
                reframe the generic truth line can't supply. Written when
                steady, shown under the truth line whenever that state is
                named.
              </p>
              {engine.PRACTICE_STATES.map((st) => (
                <Field key={st.key} label={st.label}>
                  <input
                    type="text"
                    value={counterDrafts[st.key] || ''}
                    placeholder="Your own counter-line for this state"
                    onChange={(e) => setCounterDrafts((d) => ({ ...d, [st.key]: e.target.value }))}
                    maxLength={240}
                    style={S.input}
                  />
                </Field>
              ))}
              <LogButton
                label="Keep the counter-lines"
                doneLabel="✓ Kept"
                disabled={!engine.PRACTICE_STATES.some(
                  (st) => (counterDrafts[st.key] || '').trim() !== (counters[st.key] || ''),
                )}
                onLog={async () => {
                  // One insert per CHANGED state — newest-per-state wins, so
                  // an untouched state writes nothing and a cleared draft is
                  // simply not saved (delete the event row to retire a line).
                  let allOk = true
                  for (const st of engine.PRACTICE_STATES) {
                    const draft = (counterDrafts[st.key] || '').trim()
                    if (!draft || draft === (counters[st.key] || '')) continue
                    // eslint-disable-next-line no-await-in-loop
                    const ok = await addEvent('counter', { state: st.key, text: draft })
                    if (!ok) allOk = false
                  }
                  return allOk
                }}
              />
            </div>
          )}
        </div>
      </Panel>

      {/* 2 · urge log */}
      <Panel
        eyebrow="URGE LOG"
        note="Sabotage-pulls, logged like cravings. An urge is withdrawal — the set-point defending itself — not a verdict on you. Logging it at all is the practice working."
      >
        <Field label="The pull">
          <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
            {engine.URGE_PULLS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setUrgePull(p.key)}
                title={p.hint}
                style={urgePull === p.key ? S.chipActive : S.chip}
              >
                {p.label}
              </button>
            ))}
          </div>
          {urgePull && (
            <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
              {engine.URGE_PULLS_BY_KEY[urgePull].hint}
            </p>
          )}
        </Field>
        <Field label="What set it off">
          <input
            type="text"
            value={urgeTrigger}
            placeholder="Optional, in your own words — often it's something good"
            onChange={(e) => setUrgeTrigger(e.target.value)}
            maxLength={240}
            style={S.input}
          />
        </Field>
        <Field label="What you did">
          <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
            {engine.URGE_ACTIONS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setUrgeAction(a.key)}
                style={urgeAction === a.key ? S.chipActive : S.chip}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Field>
        <label style={{ ...fnText.caption, color: fn.meta, display: 'flex', gap: space.sm, alignItems: 'center', marginBottom: space.lg }}>
          <input
            type="checkbox"
            checked={urgeBookended}
            onChange={(e) => setUrgeBookended(e.target.checked)}
          />
          Talked it through with someone safe (before or after)
        </label>
        <LogButton
          label="Log the urge"
          onLog={logUrge}
          disabled={!urgePull || !urgeAction}
        />
        {(!urgePull || !urgeAction) && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
            Pick the pull and what you did — the trigger line is optional.
          </p>
        )}
        <SectionReflection
          reflection={urgeReflection}
          errorLine="A reflection didn't load that time — the urge is still logged."
        />
      </Panel>

      {/* 3 · loops closed */}
      <Panel
        eyebrow="LOOPS CLOSED"
        note="Small completed loops, marked the moment they close. Steady payout — the opposite schedule to the slot machine."
      >
        <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', marginBottom: space.md }}>
          {engine.LOOP_PRESETS.map((loop) => (
            <LogButton
              key={loop.key}
              label={loop.label}
              doneLabel="✓ Closed"
              onLog={() => addEvent('loop', { loop: loop.key, label: loop.label })}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: space.sm }}>
          <input
            type="text"
            value={customLoop}
            placeholder="Something else you finished"
            onChange={(e) => setCustomLoop(e.target.value)}
            maxLength={120}
            style={{ ...S.input, marginBottom: 0 }}
          />
          <LogButton
            label="Mark it"
            doneLabel="✓"
            disabled={!customLoop.trim()}
            onLog={async () => {
              const ok = await addEvent('loop', { loop: 'custom', label: customLoop.trim() })
              if (ok) setCustomLoop('')
              return ok
            }}
          />
        </div>
        {todaysLoops.length > 0 && (
          <div style={{ marginTop: space.md }}>
            {todaysLoops.slice().reverse().map((e) => (
              <p key={e.id} style={{ ...fnText.caption, color: fn.moss, margin: '0 0 2px' }}>
                ✓ {e.payload?.label || 'one small thing'}
              </p>
            ))}
          </div>
        )}
      </Panel>

      {/* 4 · receipts — the evidence campaign */}
      <Panel
        eyebrow="RECEIPTS"
        note="The small proofs the baseline is moving — a calm that lasted, a good thing you let land, a night you slept, an urge that rose and passed. The set-point updates on accumulated evidence; this is where it accumulates."
      >
        <div style={{ display: 'flex', gap: space.sm }}>
          <input
            type="text"
            value={receiptText}
            placeholder="What's the proof?"
            onChange={(e) => setReceiptText(e.target.value)}
            maxLength={200}
            style={{ ...S.input, marginBottom: 0 }}
          />
          <LogButton
            label="Keep it"
            doneLabel="✓ Kept"
            disabled={!receiptText.trim()}
            onLog={async () => {
              const ok = await addEvent('receipt', { text: receiptText.trim() })
              if (ok) setReceiptText('')
              return ok
            }}
          />
        </div>
        {todaysReceipts.length > 0 && (
          <div style={{ marginTop: space.md }}>
            {todaysReceipts.slice().reverse().map((e) => (
              <p key={e.id} style={{ ...fnText.caption, color: fn.moss, margin: '0 0 2px' }}>
                ● {e.payload?.text}
              </p>
            ))}
          </div>
        )}
      </Panel>

      {/* 5 · the day — anchor (morning, one bit) and return (evening) */}
      <Panel
        eyebrow="THE DAY"
        note="The anchor records that your existing morning practice happened — it stays one tap on purpose, so this never becomes a second competing morning system. The return is the evening half: naming, not prosecuting."
      >
        {anchoredToday ? (
          <p style={{ ...fnText.caption, color: fn.moss, margin: `0 0 ${space.lg}` }}>
            ● Anchor kept this morning.
          </p>
        ) : (
          <div style={{ marginBottom: space.lg }}>
            <LogButton
              label="Anchored — the morning practice happened"
              doneLabel="✓ Anchored"
              onLog={() => addEvent('anchor', {})}
            />
          </div>
        )}

        <div style={{ borderTop: `1px solid ${fn.rule}`, paddingTop: space.lg }}>
          <p style={{ ...fnText.eyebrow, margin: `0 0 ${space.md}` }}>THE RETURN</p>
          {engine.RETURN_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <input
                type="text"
                value={returnDraft[f.key]}
                placeholder={f.hint}
                onChange={(e) => setReturnDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                maxLength={240}
                style={S.input}
              />
            </Field>
          ))}
          <LogButton
            label={returnedToday ? 'Log another return' : 'Log the return'}
            doneLabel="✓ Logged"
            disabled={!returnHasContent}
            onLog={logReturn}
          />
          {!returnHasContent && (
            <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
              Any one line is enough. All three are optional.
            </p>
          )}
          <SectionReflection
            reflection={returnReflection}
            errorLine="A reflection didn't load that time — your return is still logged."
          />
        </div>
      </Panel>

      {/* 6 · the breath — one practice, capped by design */}
      <Panel
        eyebrow="THE BREATH"
        note="Cyclic sighing, exhale-led — five minutes a day beat every other practice tested in the one good trial (measured tier). One practice only, on purpose: a menu is how the overwhelm gets in."
      >
        <p style={{ ...fnText.caption, color: fn.meta, margin: `0 0 ${space.md}` }}>
          Lead with the exhale. The inhale — and the small second sip — only as
          big as is comfortable; never force the chest, especially with a
          surgical history. Worth one sentence with your doctor before leaning
          on this. Teaching the chest it can open and hold while something
          enters is not just a calming drill — it is the receiving, rehearsed.
        </p>
        {breathRunning ? (
          <div style={{ padding: `${space.md}`, background: fn.mossTint, borderLeft: `2px solid ${fn.mossEdge}`, borderRadius: '2px', marginBottom: space.md }}>
            <p style={{ ...fnText.eyebrow, margin: '0 0 4px' }}>
              {Math.floor(breathElapsed / 60)}:{String(breathElapsed % 60).padStart(2, '0')}
            </p>
            <p style={{ ...fnText.body, color: fn.ink, margin: 0 }}>
              {engine.breathPhaseAt(breathElapsed).label}
            </p>
            {breathElapsed >= engine.BREATH_DEFAULT_SECONDS && (
              <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
                That's a full dose already — stopping here is the practice, not
                quitting it. It stops itself at five minutes.
              </p>
            )}
          </div>
        ) : breathElapsed > 0 ? (
          <p style={{ ...fnText.caption, color: fn.meta, margin: `0 0 ${space.md}` }}>
            {Math.floor(breathElapsed / 60)}:{String(breathElapsed % 60).padStart(2, '0')} of pacing done.
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
          {!breathRunning && breathElapsed === 0 && (
            <LogButton
              label="Begin — two minutes is the dose"
              doneLabel="✓"
              onLog={() => { setBreathElapsed(0); setBreathRunning(true); return true }}
            />
          )}
          {breathRunning && (
            <LogButton
              label="Done"
              doneLabel="✓"
              onLog={() => { setBreathRunning(false); return true }}
            />
          )}
          {!breathRunning && breathElapsed > 0 && (
            <>
              <LogButton
                label="Keep the session"
                doneLabel="✓ Kept"
                onLog={async () => {
                  const ok = await addEvent('breath', { seconds: breathElapsed })
                  if (ok) setBreathElapsed(0)
                  return ok
                }}
              />
              <LogButton
                label="Discard"
                doneLabel="✓"
                onLog={() => { setBreathElapsed(0); return true }}
              />
            </>
          )}
        </div>
      </Panel>

      {/* 7 · bookends — the pair, not just a checkbox */}
      <Panel
        eyebrow="BOOKENDS"
        note="A scary money or receiving action, named before it happens and closed after — with whether it was talked through with someone safe. Borrowed regulation, made visible. Zero shame on 'neither': the row itself is the practice."
      >
        {bookend ? (
          <>
            <KeyVal k="Open" v={bookend.action || 'the named action'} />
            <KeyVal k="Since" v={String(bookend.openedAt).slice(0, 16).replace('T', ' ')} />
            <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 ${space.md}` }}>
              Urges logged while this is open are tagged as expected — mid-action
              is exactly when the pull shows up.
            </p>
            <Field label="What happened">
              <input
                type="text"
                value={bookendOutcome}
                placeholder="Optional, one line — however it went"
                onChange={(e) => setBookendOutcome(e.target.value)}
                maxLength={240}
                style={S.input}
              />
            </Field>
            <Field label="Talked it through with someone safe?">
              <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
                {engine.BOOKEND_TALKED.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setBookendTalked(t.key)}
                    style={bookendTalked === t.key ? S.chipActive : S.chip}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
            <LogButton
              label="Close the bookend"
              disabled={!bookendTalked}
              onLog={async () => {
                const ok = await addEvent('bookend_close', {
                  outcome: bookendOutcome.trim() || undefined,
                  talked: bookendTalked,
                })
                if (ok) { setBookendOutcome(''); setBookendTalked(null) }
                return ok
              }}
            />
            {!bookendTalked && (
              <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
                Pick one — "neither this time" counts, and closes it clean.
              </p>
            )}
          </>
        ) : (
          <>
            <input
              type="text"
              value={bookendAction}
              placeholder="The thing you're about to do — the ask, the invoice, the call"
              onChange={(e) => setBookendAction(e.target.value)}
              maxLength={200}
              style={S.input}
            />
            <LogButton
              label="Name it — open the bookend"
              doneLabel="✓ Open"
              disabled={!bookendAction.trim()}
              onLog={async () => {
                const ok = await addEvent('bookend_open', { action: bookendAction.trim() })
                if (ok) setBookendAction('')
                return ok
              }}
            />
          </>
        )}
      </Panel>

      {/* 8 · co-regulation — the strongest lever gets an evidence trail */}
      <Panel
        eyebrow="CO-REGULATION"
        note="Nervous systems regulate off each other. An hour with a regulated, safe person does more for the baseline than an hour of anything solo — the calls are the medication schedule, not garnish."
      >
        <div style={{ display: 'flex', gap: space.sm }}>
          <input
            type="text"
            value={coregWho}
            placeholder="The dose — a call, the therapist, a safe friend"
            onChange={(e) => setCoregWho(e.target.value)}
            maxLength={160}
            style={{ ...S.input, marginBottom: 0 }}
          />
          <LogButton
            label="Log the dose"
            doneLabel="✓ Logged"
            disabled={!coregWho.trim()}
            onLog={async () => {
              const ok = await addEvent('coreg', { who: coregWho.trim() })
              if (ok) setCoregWho('')
              return ok
            }}
          />
        </div>
        <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.md} 0 0` }}>
          {coregDays === null
            ? 'None logged yet. One a week is the floor the reset asks for — gently; this line will never turn red.'
            : coregDays === 0
              ? 'Last dose: today.'
              : `Last dose: ${coregDays} day${coregDays === 1 ? '' : 's'} ago.`}
        </p>
        <div style={{ borderTop: `1px solid ${fn.rule}`, marginTop: space.lg, paddingTop: space.lg }}>
          <p style={{ ...fnText.eyebrow, margin: `0 0 ${space.sm}` }}>THE MONTH'S NUMBER · OPTIONAL</p>
          <p style={{ ...fnText.caption, color: fn.ghost, margin: `0 0 ${space.md}` }}>
            One honest proxy, monthly at most — resting breaths per minute, or a
            wearable's HRV. Watch the month, ignore the morning.
          </p>
          <div style={{ display: 'flex', gap: space.sm }}>
            <input
              type="text"
              value={proxyText}
              placeholder="e.g. 13 breaths/min at rest"
              onChange={(e) => setProxyText(e.target.value)}
              maxLength={120}
              style={{ ...S.input, marginBottom: 0 }}
            />
            <LogButton
              label="Keep the number"
              doneLabel="✓ Kept"
              disabled={!proxyText.trim()}
              onLog={async () => {
                const ok = await addEvent('proxy', { text: proxyText.trim() })
                if (ok) setProxyText('')
                return ok
              }}
            />
          </div>
          {events.filter((e) => e.kind === 'proxy').slice(0, 4).map((e) => (
            <p key={e.id} style={{ ...fnText.caption, color: fn.meta, margin: `${space.sm} 0 0` }}>
              {String(e.at).slice(0, 7)} · {e.payload?.text}
            </p>
          ))}
        </div>
      </Panel>

      {/* 9 · the tape */}
      <Panel
        eyebrow="THE TAPE"
        note="The urge lies by showing only scene one. This is the rest of the film, in your own words — written once when steady, read when it isn't."
      >
        <textarea
          rows={5}
          value={tapeText}
          placeholder="What actually happens after the move the urge wants. The whole film, documented ending included."
          onChange={(e) => setTapeText(e.target.value)}
          maxLength={2000}
          style={{ ...S.input, resize: 'vertical' }}
        />
        <LogButton
          label="Save the tape"
          doneLabel="✓ Saved"
          disabled={!tapeText.trim() || tapeText.trim() === savedTape}
          onLog={() => addEvent('tape', { text: tapeText.trim() })}
        />
        {savedTape && (
          <p style={{ ...fnText.body, color: fn.ink, fontStyle: 'italic', margin: `${space.lg} 0 0` }}>
            {savedTape}
          </p>
        )}
        <div style={{ borderTop: `1px solid ${fn.rule}`, marginTop: space.lg, paddingTop: space.lg }}>
          <p style={{ ...fnText.eyebrow, margin: `0 0 ${space.sm}` }}>SCENE LAST</p>
          <p style={{ ...fnText.caption, color: fn.ghost, margin: `0 0 ${space.md}` }}>
            The documented ending alone, for ten-second moments when the whole
            film is more than the moment will hold.
          </p>
          <input
            type="text"
            value={sceneLastText}
            placeholder="One line. Where the move the urge wants actually ends."
            onChange={(e) => setSceneLastText(e.target.value)}
            maxLength={240}
            style={S.input}
          />
          <LogButton
            label="Save scene last"
            doneLabel="✓ Saved"
            disabled={!sceneLastText.trim() || sceneLastText.trim() === savedSceneLast}
            onLog={() => addEvent('scene_last', { text: sceneLastText.trim() })}
          />
          {savedSceneLast && (
            <p style={{ ...fnText.body, color: fn.ink, fontStyle: 'italic', margin: `${space.md} 0 0` }}>
              {savedSceneLast}
            </p>
          )}
        </div>
      </Panel>

      {/* 10 · receiving window */}
      <Panel
        eyebrow="RECEIVING WINDOW"
        note="The 48 hours after something good lands are the high-risk window. Opening one here just means: expect the urge, name it withdrawal, no big moves."
      >
        {window_ ? (
          <>
            <KeyVal k="Opened" v={`${String(window_.openedAt).slice(0, 16).replace('T', ' ')} · about ${window_.hoursLeft}h left`} />
            {window_.note && <KeyVal k="What landed" v={window_.note} />}
            <div style={{ marginTop: space.md }}>
              <LogButton
                label="It landed — close the window"
                doneLabel="✓ Landed"
                onLog={() => addEvent('window_close', {})}
              />
            </div>
          </>
        ) : (
          <>
            <input
              type="text"
              value={windowNote}
              placeholder="What landed? A yes, a payment, a kindness…"
              onChange={(e) => setWindowNote(e.target.value)}
              maxLength={200}
              style={S.input}
            />
            <LogButton
              label="Something good landed — open the window"
              doneLabel="✓ Open"
              onLog={async () => {
                const ok = await addEvent('window_open', { note: windowNote.trim() || undefined })
                if (ok) setWindowNote('')
                return ok
              }}
            />
          </>
        )}
      </Panel>

      {/* history — what happened, and only that */}
      <Panel
        eyebrow="THE LAST SEVEN DAYS"
        note="No streaks, deliberately — a broken streak is spike-crash fuel in recovery costume. This just shows what happened."
      >
        {history.length === 0 && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>
            Nothing logged yet. Small counts.
          </p>
        )}
        {history.map(({ day, events: dayEvents }) => (
          <div key={day} style={{ marginBottom: space.md }}>
            <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', color: fn.meta }}>
              {day === todayKey ? 'TODAY' : day}
            </div>
            {dayEvents.map((e) => (
              <p key={e.id} style={{ ...fnText.caption, color: fn.ghost, margin: '2px 0 0' }}>
                {engine.describeEvent(e)}
              </p>
            ))}
          </div>
        ))}
      </Panel>
      </div>
    </div>
  )
}

/* A state button that logs on press and carries its own tiny confirmation —
   the flash is on the button, the truth line renders in the panel. */
function StateLogButton({ state: st, onLog }) {
  const [status, setStatus] = useState('idle')
  const resetRef = useRef(null)
  useEffect(() => () => { if (resetRef.current) clearTimeout(resetRef.current) }, [])
  const handleClick = async () => {
    if (status === 'saving') return
    setStatus('saving')
    const ok = await onLog()
    setStatus(ok ? 'done' : 'error')
    resetRef.current = setTimeout(() => setStatus('idle'), ok ? 1600 : 3200)
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      title={st.prompt}
      style={{
        ...S.chip,
        ...(status === 'done' ? { background: fn.mossTint, borderColor: fn.mossEdge, color: fn.moss } : {}),
        ...(status === 'error' ? { borderColor: fn.clayEdge, color: fn.clay } : {}),
      }}
    >
      {status === 'done' ? `✓ ${st.label}` : status === 'error' ? 'Try again' : st.label}
    </button>
  )
}

/* The Practice's generic log button. Same state machine as SaveButton, but
   with configurable labels, because "Save" is the wrong word for an action
   whose whole point is marking a thing done the moment it happens. */
function LogButton({ label, doneLabel = '✓ Logged', onLog, disabled }) {
  const [status, setStatus] = useState('idle')
  const resetRef = useRef(null)
  useEffect(() => () => { if (resetRef.current) clearTimeout(resetRef.current) }, [])
  const handleClick = async () => {
    if (resetRef.current) { clearTimeout(resetRef.current); resetRef.current = null }
    setStatus('saving')
    const ok = await onLog()
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
      disabled={disabled || status === 'saving'}
      style={{
        ...mono, fontSize: '13px', letterSpacing: '0.08em', fontWeight: 600,
        padding: '5px 14px', borderRadius: '2px',
        cursor: disabled || status === 'saving' ? 'default' : 'pointer',
        background: status === 'done' ? fn.moss : status === 'error' ? fn.clay : 'transparent',
        color: status === 'done' || status === 'error' ? fn.object : disabled ? fn.ghost : fn.ink,
        border: `1px solid ${status === 'done' ? fn.moss : status === 'error' ? fn.clay : fn.rule}`,
      }}
    >
      {status === 'saving' ? 'Logging…' : status === 'done' ? doneLabel : status === 'error' ? 'Try again' : label}
    </button>
  )
}


/* ── shared small UI (duplicated in miniature from Care Protocol's
   CareProtocol.jsx, not imported from it — this tool has its own front door
   and should not depend on another hidden tool's internals to render) ── */

function Panel({ eyebrow, note, children }) {
  return (
    <section style={S.panel}>
      <div style={{ ...fnText.eyebrow, marginBottom: note ? '4px' : space.lg }}>{eyebrow}</div>
      {note && <p style={{ ...fnText.caption, color: fn.ghost, margin: `0 0 ${space.lg}` }}>{note}</p>}
      {children}
    </section>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: space.lg }}>
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

// The reflection panel — same visual language as Care Protocol's own
// SectionReflection (moss tint, "reflection" eyebrow, deliberately NOT
// italic, since italic is reserved for the person's own authored words
// elsewhere on this page).
function SectionReflection({ reflection, errorLine }) {
  if (!reflection || reflection.status === 'idle') return null
  if (reflection.status === 'error') {
    return (
      <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
        {errorLine || "A reflection didn't load that time — your entry is still logged."}
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

/* ── styles — the subset this page actually uses, matching Care Protocol's
   own tokens (fn.moss/clay/ghost etc.) so the tool reads as part of the same
   family without importing anything from CareProtocol.jsx itself ── */
const S = {
  app: { minHeight: '100dvh', background: fn.ground, paddingBottom: space.huge },
  loadingWrap: {
    minHeight: '100dvh', background: fn.ground,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  loadingTape: { ...mono, fontSize: '13px', letterSpacing: '0.2em', color: fn.ghost },
  topbar: {
    display: 'flex', flexDirection: 'column', gap: space.sm,
    padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${fn.rule}`,
    background: fn.object, position: 'sticky', top: 0, zIndex: 5,
  },
  brand: { fontFamily: mono.fontFamily, fontSize: '20px', color: fn.ink, letterSpacing: '0.04em' },
  main: { maxWidth: '720px', margin: '0 auto', padding: space.xl },
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
  chip: {
    ...mono, fontSize: '13px', letterSpacing: '0.06em', cursor: 'pointer',
    padding: `5px ${space.md}`, background: 'transparent', color: fn.ink,
    border: `1px dashed ${fn.rule}`, borderRadius: '2px',
  },
  chipActive: {
    ...mono, fontSize: '13px', letterSpacing: '0.06em', cursor: 'pointer',
    padding: `5px ${space.md}`, background: fn.moss, color: fn.object,
    border: `1px solid ${fn.moss}`, borderRadius: '2px',
  },
}
