// ─────────────────────────────────────────────────────────────
// HorizonSelfOnboarding.jsx — NextU Chapter Three (/nextu/horizon-self)
//
// The construction chapter. Steps 1–7 of the Horizon Self
// Onboarding Living Architecture v1.0 (step 8, the Biography, is
// journey Chapter Four at /nextu/biography — same table).
//
// Experience rules (per the design doc §5):
//   · The threshold states the definition, the honest cadence,
//     and the whole eight-step map before anything begins.
//   · One step, one sitting, one surface. Prompts arrive one at
//     a time — the next renders once the current has content.
//   · "Commit before content": Arrival's prompts don't exist
//     until I'M IN is pressed.
//   · The shift beat: somatic prompts are paced by a breathing
//     dot. Shift first. Then describe.
//   · Auto-save everything; SAVE AND STEP AWAY is first-class.
//   · Step 7's Daily Leap action lands in Get To Do as a P1 for
//     today, visibly.
//
// Data: one row per user in horizon_self_onboarding (migration
// 106), upserted on user_id. current_step tracks resume position.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'
import NextUShell from './NextUShell'
import {
  DOMAIN_ORDER, DOMAIN_LABELS, useAutoSave, SavedWhisper,
} from './shared'

// ─── step registry ─────────────────────────────────────────────
const STEPS = [
  { n: 1, key: 'arrival',    name: 'Arrival',                    time: '10–15 MIN' },
  { n: 2, key: 'avatar',     name: 'The Shift',                  time: '15–25 MIN' },
  { n: 3, key: 'permission', name: 'Permission & Safety',        time: '15–20 MIN' },
  { n: 4, key: 'code',       name: 'The Code',                   time: '20–30 MIN' },
  { n: 5, key: 'gap',        name: 'The Gap',                    time: '20–30 MIN' },
  { n: 6, key: 'beliefs',    name: 'Horizon Beliefs',            time: '20–30 MIN' },
  { n: 7, key: 'leap',       name: 'The Daily Leap',             time: '10 MIN' },
  { n: 8, key: 'biography',  name: 'The Horizon Biography',      time: 'CHAPTER FOUR' },
]

const ONBOARDING_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .nextu-breath {
    animation: nextu-breathe 4s ease-in-out infinite;
  }
  @keyframes nextu-breathe {
    0%, 100% { transform: scale(0.62); opacity: 0.55; }
    50% { transform: scale(1); opacity: 1; }
  }
  .nextu-reveal {
    animation: nextu-rise 0.5s ease both;
  }
  @keyframes nextu-rise {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }
}
.nextu-hover-tint { transition: background 0.2s ease; }
.nextu-hover-tint:hover { background: ${tokens.goldGlow}; }
`

// ─── shared small pieces ───────────────────────────────────────
function Eyebrow({ children }) {
  return (
    <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em', color: tokens.gold }}>
      {children}
    </div>
  )
}

function Frame({ children }) {
  return (
    <p style={{ ...serif, fontSize: 'clamp(23px,4.4vw,29px)', fontWeight: 300, lineHeight: 1.45, marginTop: '40px', color: tokens.dark }}>
      {children}
    </p>
  )
}

function FrameNote({ children }) {
  return (
    <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', marginTop: '16px', lineHeight: 1.65 }}>
      {children}
    </p>
  )
}

function PrimaryBtn({ onClick, disabled, children, outline = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
        // Disabled is outlined with dark text — present and legible, clearly
        // inactive. 0.35-opacity white-on-gold vanished into the parchment
        // (and broke the 0.55 minimum-opacity law).
        color: disabled ? tokens.dark : (outline ? tokens.gold : '#FFFFFF'),
        background: disabled || outline ? 'none' : tokens.goldChrome,
        border: disabled || outline ? `1.5px solid ${tokens.goldChrome}` : 'none',
        borderRadius: '4px', padding: '12px 24px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      {children}
    </button>
  )
}

function TextField({ label, help, value, onChange, multiline = true, placeholder, rows = 3, whisper }) {
  const shared = {
    width: '100%', boxSizing: 'border-box', marginTop: '12px',
    padding: '14px 16px', border: `1px solid ${tokens.goldFaint}`,
    borderRadius: '6px', background: '#FFFFFF',
    fontFamily: "'Newsreader', Georgia, serif", fontStyle: 'italic',
    fontSize: '16px', lineHeight: 1.6, color: tokens.dark, outline: 'none',
  }
  return (
    <div style={{ marginTop: '36px' }}>
      {label && (
        <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: tokens.gold }}>
          {label}
        </div>
      )}
      {help && (
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)', marginTop: '5px', lineHeight: 1.5 }}>
          {help}
        </p>
      )}
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          style={{ ...shared, resize: 'vertical' }}
          onFocus={e => { e.target.style.borderColor = tokens.goldChrome }}
          onBlur={e => { e.target.style.borderColor = tokens.goldFaint }}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={shared}
          onFocus={e => { e.target.style.borderColor = tokens.goldChrome }}
          onBlur={e => { e.target.style.borderColor = tokens.goldFaint }}
        />
      )}
      <div style={{ marginTop: '7px', minHeight: '18px' }}>
        <SavedWhisper state={whisper} />
      </div>
    </div>
  )
}

// ─── the page ──────────────────────────────────────────────────
export function HorizonSelfOnboardingPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [ob, setOb]         = useState(null)    // the onboarding row (local truth)
  const [exists, setExists] = useState(false)   // row exists in db
  const [loading, setLoading] = useState(true)
  const [view, setView]     = useState('loading') // 'threshold' | 'map' | 1..7
  const [iaRows, setIaRows] = useState([])      // context for Step 6
  const [lifeStatement, setLifeStatement] = useState(null)
  const [mapResultId, setMapResultId] = useState(null)
  const [leapPlaced, setLeapPlaced] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    let cancelled = false
    async function load() {
      const [obRes, iaRes, resultRes] = await Promise.all([
        supabase.from('horizon_self_onboarding').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('horizon_profile')
          .select('domain, horizon_goal, ia_statement')
          .eq('user_id', user.id),
        supabase.from('map_results')
          .select('id, life_ia_statement, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      if (cancelled) return
      const row = obRes.error ? null : obRes.data
      setOb(row || {
        status: 'in_progress', current_step: 1,
        arrival_notes: {}, somatic_library: {}, permission_safety: {},
        code: {}, quantum_gap: [], horizon_beliefs: {},
        synthesised_statement: '', daily_leap: {},
      })
      setExists(!!row)
      setIaRows(iaRes.data || [])
      setLifeStatement(resultRes.data?.life_ia_statement || null)
      setMapResultId(resultRes.data?.id || null)
      // Restore the step from the URL. Mobile browsers discard the tab on
      // app-switch; the reload used to bounce the user to the step list even
      // mid-step. The ?step param survives the reload and puts them back.
      const stepParam = Number(new URLSearchParams(window.location.search).get('step'))
      const restored = row && Number.isInteger(stepParam) && stepParam >= 1 && stepParam <= 7 ? stepParam : null
      setView(row ? (restored || 'map') : 'threshold')
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, authLoading])

  // ── persistence: one debounced upsert, partial patches ─────
  const obRef = useRef(ob)
  obRef.current = ob

  const { queue, flush, whisper } = useAutoSave(async () => {
    if (!user || !obRef.current) return
    const o = obRef.current
    const payload = {
      user_id: user.id,
      status: o.status,
      current_step: o.current_step,
      arrival_notes: o.arrival_notes,
      somatic_library: o.somatic_library,
      permission_safety: o.permission_safety,
      code: o.code,
      quantum_gap: o.quantum_gap,
      horizon_beliefs: o.horizon_beliefs,
      synthesised_statement: o.synthesised_statement || null,
      daily_leap: o.daily_leap,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('horizon_self_onboarding')
      .upsert(payload, { onConflict: 'user_id' })
    if (!error) setExists(true)
  })

  function patch(updater) {
    setOb(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      return next
    })
    queue()
  }

  function setField(section, key, value) {
    patch(prev => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [key]: value },
    }))
  }

  // Keep ?step= in sync with the surface (replaceState: no history spam,
  // back button still leaves the tool cleanly).
  function syncStepParam(n) {
    try {
      const url = new URL(window.location.href)
      if (n) url.searchParams.set('step', String(n))
      else url.searchParams.delete('step')
      window.history.replaceState({}, '', url)
    } catch (_) {}
  }

  async function openStep(n) {
    patch(prev => ({ ...prev, current_step: Math.max(prev.current_step || 1, n) }))
    await flush()
    setView(n)
    syncStepParam(n)
    window.scrollTo({ top: 0 })
  }

  async function stepAway() {
    await flush()
    setView('map')
    syncStepParam(null)
    window.scrollTo({ top: 0 })
  }

  async function completeStep(n) {
    patch(prev => ({
      ...prev,
      current_step: Math.max(prev.current_step || 1, Math.min(n + 1, 8)),
      ...(n === 7 ? { status: prev.status === 'complete' ? 'complete' : 'construction_complete' } : {}),
    }))
    await flush()
    if (n === 7) {
      setView('map')
      syncStepParam(null)
    } else {
      setView(n + 1)
      syncStepParam(n + 1)
    }
    window.scrollTo({ top: 0 })
  }

  // Step 7 → Get To Do: the Daily Leap action lands as a P1 today
  async function placeDailyLeap() {
    const action = ob?.daily_leap?.action
    if (!user || !action || !action.trim() || leapPlaced) return
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('horizon_practice_thresholds').insert({
      user_id: user.id,
      title: action.trim(),
      note: 'Your Daily Leap — committed in Horizon Self Onboarding.',
      source: 'manual',
      source_ref: 'daily_leap',
      run_date: today,
      due_date: today,
      status: 'open',
      priority: 1,
    })
    if (!error) setLeapPlaced(true)
  }

  // step completion detection for the map
  const stepDone = useMemo(() => {
    if (!ob) return {}
    const has = v => v && String(v).trim()
    return {
      1: has(ob.arrival_notes?.notice) && has(ob.arrival_notes?.want_to_do) && has(ob.arrival_notes?.body_difference),
      2: has(ob.somatic_library?.posture) && has(ob.somatic_library?.gaze) && has(ob.somatic_library?.breath)
         && has(ob.somatic_library?.voice) && has(ob.somatic_library?.signature_thought),
      3: has(ob.permission_safety?.unsafe) && has(ob.permission_safety?.permission) && has(ob.permission_safety?.who_benefits),
      4: ['drivers', 'values', 'thoughts', 'feelings', 'actions', 'priorities'].every(k => has(ob.code?.[k])),
      5: (ob.quantum_gap || []).filter(p => has(p.current) && has(p.horizon)).length >= 3,
      6: DOMAIN_ORDER.every(k => has(ob.horizon_beliefs?.[k]?.old_belief) && has(ob.horizon_beliefs?.[k]?.horizon_knows)),
      7: has(ob.daily_leap?.action) && has(ob.daily_leap?.habit) && has(ob.daily_leap?.toleration),
      8: ob.status === 'complete',
    }
  }, [ob])

  // ── guards ──────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <NextUShell chapter={3}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: tokens.ghost }}>NEXTU</span>
        </div>
      </NextUShell>
    )
  }
  if (!user) { navigate('/login'); return null }

  const iaByDomain = {}
  iaRows.forEach(r => { iaByDomain[r.domain] = r })
  const iaCount = DOMAIN_ORDER.filter(k => iaByDomain[k]?.ia_statement).length

  const wrap = { maxWidth: '600px', margin: '0 auto', padding: '40px 22px 90px' }
  const topbar = (label) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
      <Eyebrow>{label}</Eyebrow>
      <button
        onClick={stepAway}
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
      >
        SAVE AND STEP AWAY
      </button>
    </div>
  )

  // ════════ THE THRESHOLD ════════
  if (view === 'threshold') {
    return (
      <NextUShell chapter={3}>
        <style>{ONBOARDING_CSS}</style>
        <div style={wrap}>
          <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(36px,7vw,50px)', letterSpacing: '-0.01em', color: tokens.dark }}>
            Horizon Self
          </h1>
          <p style={{ ...body, fontSize: '18px', lineHeight: 1.7, marginTop: '20px', color: tokens.dark }}>
            Your Horizon Self is the version of you that exists when you're standing in a
            future where your full-yes life is already true. This chapter constructs them.
            In the body first. Then in language. Then in writing you can return to.
          </p>
          <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, marginTop: '18px', paddingTop: '18px', borderTop: `1px solid ${tokens.goldFaint}` }}>
            Most people take two to four sessions across a week or two. This is construction,
            not setup — the daily practice gets to be light because this work was deep.
            Everything saves as you go. Step away whenever you need to; the chapter holds
            your place.
          </p>

          <div style={{ marginTop: '30px' }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'baseline', gap: '14px', padding: '13px 0', borderBottom: s.n < 8 ? `1px solid ${tokens.goldFaint}` : 'none' }}>
                <span style={{ ...sc, fontSize: '13px', color: tokens.gold, minWidth: '18px' }}>{s.n}</span>
                <span style={{ ...serif, fontSize: '21px', fontWeight: 400, flex: 1, color: tokens.dark }}>{s.name}</span>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: tokens.ghost, whiteSpace: 'nowrap' }}>{s.time}</span>
              </div>
            ))}
          </div>

          {iaCount < 7 && (
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, marginTop: '24px' }}>
              This chapter works with your I Am statements — {7 - iaCount} of them are still
              waiting in Chapter Two. You can preview the steps now; the construction begins
              when the seven are declared.
            </p>
          )}

          <div style={{ display: 'flex', gap: '14px', marginTop: '30px', flexWrap: 'wrap' }}>
            {iaCount >= 7 ? (
              <PrimaryBtn onClick={() => openStep(1)}>BEGIN STEP ONE</PrimaryBtn>
            ) : (
              <PrimaryBtn onClick={() => navigate('/nextu/i-am')}>FINISH CHAPTER TWO →</PrimaryBtn>
            )}
            <PrimaryBtn outline onClick={() => navigate('/nextu')}>BACK TO THE JOURNEY</PrimaryBtn>
          </div>
        </div>
      </NextUShell>
    )
  }

  // ════════ THE STEP MAP ════════
  if (view === 'map') {
    const cur = Math.min(ob.current_step || 1, 8)
    return (
      <NextUShell chapter={3}>
        <style>{ONBOARDING_CSS}</style>
        <div style={wrap}>
          <Eyebrow>HORIZON SELF</Eyebrow>
          <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(28px,5vw,38px)', marginTop: '8px', color: tokens.dark }}>
            Where you are
          </h1>

          {ob.status === 'construction_complete' && (
            <p style={{ ...body, fontSize: '16px', lineHeight: 1.65, color: 'rgba(15,21,35,0.72)', marginTop: '12px' }}>
              The construction is complete. Every step re-opens independently — and the
              Biography is ready to write.
            </p>
          )}

          <div style={{ marginTop: '26px' }}>
            {STEPS.map(s => {
              const done = stepDone[s.n]
              const isCurrent = !done && s.n === Math.min(
                STEPS.find(x => !stepDone[x.n])?.n ?? cur, 8
              )
              const reachable = s.n <= cur || done
              const ghost = !reachable && !isCurrent
              const go = () => {
                if (s.n === 8) navigate('/nextu/biography')
                else openStep(s.n)
              }
              return (
                <button
                  key={s.n}
                  onClick={reachable || isCurrent ? go : undefined}
                  className={reachable || isCurrent ? 'nextu-hover-tint' : undefined}
                  style={{
                    display: 'flex', alignItems: 'baseline', gap: '14px',
                    padding: '13px 8px', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', borderRadius: '4px',
                    borderBottom: s.n < 8 ? `1px solid ${tokens.goldFaint}` : 'none',
                    cursor: reachable || isCurrent ? 'pointer' : 'default',
                    opacity: ghost ? 0.55 : 1,
                  }}
                >
                  <span style={{ ...sc, fontSize: '13px', color: tokens.gold, minWidth: '18px' }}>{s.n}</span>
                  <span style={{ ...serif, fontSize: '21px', fontWeight: isCurrent ? 600 : 400, flex: 1, color: tokens.dark }}>{s.name}</span>
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: done || isCurrent ? tokens.gold : tokens.ghost, whiteSpace: 'nowrap' }}>
                    {done ? (s.n === 8 ? 'WRITTEN' : 'COMPLETE · REVISIT') : isCurrent ? 'CONTINUE →' : s.time}
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: '30px' }}>
            <PrimaryBtn outline onClick={() => navigate('/nextu')}>BACK TO THE JOURNEY</PrimaryBtn>
          </div>
        </div>
      </NextUShell>
    )
  }

  // ════════ STEP 1 — ARRIVAL ════════
  if (view === 1) {
    const a = ob.arrival_notes || {}
    const committed = !!a.committed
    const seq = [a.notice, a.want_to_do, a.body_difference]
    const visible = (n) => committed && (n === 0 || (seq[n - 1] && String(seq[n - 1]).trim()))
    return (
      <NextUShell chapter={3}>
        <style>{ONBOARDING_CSS}</style>
        <div style={wrap}>
          {topbar('STEP ONE · ARRIVAL')}
          <div style={{ opacity: committed ? 0.45 : 1, transition: 'opacity 0.4s ease' }}>
            <Frame>
              Imagine the you from your most aligned future came back in time, and their
              consciousness dropped into your body now. It's you from the future where the
              work worked, the healing healed, and they've been living the life current you
              has been dreaming of. They don't arrive with more money, sudden fitness, or
              any of the things you might wish you had. But the life you're dreaming of is
              normal life to them. How would that version of you act if they took over your
              life now? Can you allow yourself to see how they would transform your current
              circumstances? Are you willing to step into that version of yourself now?
            </Frame>
            <FrameNote>
              This is a leap of faith. Jump, and we'll figure out the details next.
              This isn't visualisation. You're being asked to actually shift — to let them
              take the wheel for a few minutes. When you've made the shift, not before:
            </FrameNote>
          </div>
          {!committed && (
            <div style={{ marginTop: '34px' }}>
              <button
                onClick={() => setField('arrival_notes', 'committed', true)}
                style={{
                  ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.18em',
                  color: tokens.gold, background: 'none',
                  border: `1.5px solid ${tokens.goldChrome}`, borderRadius: '4px',
                  padding: '14px 34px', cursor: 'pointer',
                }}
              >
                I'M IN
              </button>
            </div>
          )}
          {visible(0) && (
            <div className="nextu-reveal">
              <FrameNote>
                Write as them, not about them. You are the Horizon Self, dropped into
                their past, which is your present. First person, present tense.
              </FrameNote>
              <TextField
                label="OPEN YOUR EYES"
                help="They'd take in your current circumstances, maybe a moment of surprise, then lean into recreating their normal. What do you notice first?"
                placeholder="In their body, right now…"
                value={a.notice}
                onChange={v => setField('arrival_notes', 'notice', v)}
                whisper={whisper}
              />
            </div>
          )}
          {visible(1) && (
            <div className="nextu-reveal">
              <TextField
                help="What do you immediately want to do that the old self wouldn't have done?"
                value={a.want_to_do}
                onChange={v => setField('arrival_notes', 'want_to_do', v)}
                whisper={whisper}
              />
            </div>
          )}
          {visible(2) && (
            <div className="nextu-reveal">
              <TextField
                help="You've had this body for ten seconds now. What shifts as you settle in?"
                value={a.body_difference}
                onChange={v => setField('arrival_notes', 'body_difference', v)}
                whisper={whisper}
              />
            </div>
          )}
          <div style={{ marginTop: '38px' }}>
            <PrimaryBtn disabled={!stepDone[1]} onClick={() => completeStep(1)}>
              CONTINUE TO THE SHIFT
            </PrimaryBtn>
          </div>
        </div>
      </NextUShell>
    )
  }

  // ════════ STEP 2 — THE SHIFT ════════
  if (view === 2) {
    const s = ob.somatic_library || {}
    const fields = [
      { key: 'posture', label: 'POSTURE', help: 'How does your body carry itself? Alignment, weight, where the height comes from.' },
      { key: 'gaze', label: 'GAZE', help: 'How do your eyes see differently? Where they rest, what they take in.' },
      { key: 'breath', label: 'BREATH', help: 'How does your breath move? Depth, rhythm, where it lives in the body.' },
      { key: 'voice', label: 'VOICE', help: 'How does your voice sound? Say something aloud first. Tone, pace, resonance.' },
      { key: 'signature_thought', label: 'SIGNATURE THOUGHT', help: 'What thought becomes crystal clear?' },
    ]
    const values = fields.map(f => s[f.key])
    const visibleCount = (() => {
      let v = 1
      for (let i = 0; i < values.length; i++) {
        if (values[i] && String(values[i]).trim()) v = i + 2; else break
      }
      return Math.min(v, fields.length)
    })()
    return (
      <NextUShell chapter={3}>
        <style>{ONBOARDING_CSS}</style>
        <div style={wrap}>
          {topbar('STEP TWO · THE SHIFT')}
          <Frame>
            Your Horizon Self has full access to your deepest wisdom, experience, and
            resilience. They have reached and they have lived your dreams. You can
            imagine it, you can see it, you can be it, because it's already within
            you, waiting to be unleashed.
          </Frame>
          <FrameNote>
            This step is written from the parts of you that already know. You might
            have spent a lot of time with those parts squished and silenced, so:
            stand up. Adjust your posture. Breathe differently, breathe deeply.
            Speak aloud if you can. After each shift, describe what you find.
            The description comes second.
          </FrameNote>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '38px' }}>
            <span className="nextu-breath" aria-hidden="true" style={{ width: '18px', height: '18px', borderRadius: '50%', background: tokens.goldChrome, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.2em', color: tokens.gold }}>
              SHIFT FIRST. THEN DESCRIBE.
            </span>
          </div>
          {fields.slice(0, visibleCount).map(f => (
            <div key={f.key} className="nextu-reveal">
              <TextField
                label={f.label}
                help={f.help}
                multiline={false}
                value={s[f.key]}
                onChange={v => setField('somatic_library', f.key, v)}
                whisper={whisper}
              />
            </div>
          ))}
          {stepDone[2] && (
            <div className="nextu-reveal">
              <TextField
                label="ANYTHING ELSE THE BODY KNOWS"
                help="Optional — additional observations."
                value={s.body_notes}
                onChange={v => setField('somatic_library', 'body_notes', v)}
                whisper={whisper}
              />
            </div>
          )}
          <div style={{ marginTop: '38px' }}>
            <PrimaryBtn disabled={!stepDone[2]} onClick={() => completeStep(2)}>
              SAVE — THIS IS YOUR SOMATIC LIBRARY
            </PrimaryBtn>
          </div>
        </div>
      </NextUShell>
    )
  }

  // ════════ STEP 3 — PERMISSION & SAFETY ════════
  if (view === 3) {
    const p = ob.permission_safety || {}
    const vals = [p.unsafe, p.permission, p.who_benefits]
    const show = n => n === 0 || (vals[n - 1] && String(vals[n - 1]).trim())
    return (
      <NextUShell chapter={3}>
        <style>{ONBOARDING_CSS}</style>
        <div style={wrap}>
          {topbar('STEP THREE · PERMISSION & SAFETY')}
          <Frame>
            Stepping into this level of power can feel risky. Maybe you've feared being
            too much, or losing people if you shine this brightly. The Horizon Self lives
            beyond those fears — but only if the parts of you that have been protecting
            against this can sign off.
          </Frame>
          <FrameNote>
            The parts that resist are not enemies. They have been keeping you safe, often
            for decades. This step is the negotiation — honest, unhurried, on their terms.
          </FrameNote>
          <FrameNote>
            One question anchors this exercise: "If I were living as that version of
            me now, I would…" It's the same move as asking what your hero would do.
            The hero is you.
          </FrameNote>
          {show(0) && (
            <TextField
              label="WHAT FEELS UNSAFE"
              help="What feels risky about letting the Horizon Self lead?"
              value={p.unsafe}
              onChange={v => setField('permission_safety', 'unsafe', v)}
              whisper={whisper}
            />
          )}
          {show(1) && (
            <div className="nextu-reveal">
              <TextField
                label="THE PERMISSION"
                help="What permission can you give — today, honestly, even partially?"
                value={p.permission}
                onChange={v => setField('permission_safety', 'permission', v)}
                whisper={whisper}
              />
            </div>
          )}
          {show(2) && (
            <div className="nextu-reveal">
              <TextField
                label="WHO BENEFITS"
                help="Who benefits from this version of you being here? Name them."
                value={p.who_benefits}
                onChange={v => setField('permission_safety', 'who_benefits', v)}
                whisper={whisper}
              />
            </div>
          )}
          <div style={{ marginTop: '38px' }}>
            <PrimaryBtn disabled={!stepDone[3]} onClick={() => completeStep(3)}>
              CONTINUE TO THE CODE
            </PrimaryBtn>
          </div>
        </div>
      </NextUShell>
    )
  }

  // ════════ STEP 4 — THE CODE ════════
  if (view === 4) {
    const c = ob.code || {}
    const cats = [
      { key: 'drivers', label: 'DRIVERS', help: 'What moves them. The engines underneath the action.' },
      { key: 'values', label: 'VALUES', help: 'What they will not trade. The non-negotiables.' },
      { key: 'thoughts', label: 'THOUGHTS', help: 'The thoughts that run their inner room.' },
      { key: 'feelings', label: 'FEELINGS', help: 'The feelings they live from — and make room for.' },
      { key: 'actions', label: 'ACTIONS', help: 'What they do. The signature moves of their days.' },
      { key: 'priorities', label: 'PRIORITIES', help: 'What comes first when everything asks at once.' },
    ]
    return (
      <NextUShell chapter={3}>
        <style>{ONBOARDING_CSS}</style>
        <div style={wrap}>
          {topbar('STEP FOUR · THE CODE')}
          <Frame>
            The Code is your Horizon Self's operating manual — what does my Horizon Self
            do in this situation. Write it in their voice, in present tense.
          </Frame>
          {cats.map(f => (
            <TextField
              key={f.key}
              label={f.label}
              help={f.help}
              value={c[f.key]}
              onChange={v => setField('code', f.key, v)}
              whisper={whisper}
              rows={2}
            />
          ))}
          <div style={{ marginTop: '38px' }}>
            <PrimaryBtn disabled={!stepDone[4]} onClick={() => completeStep(4)}>
              CONTINUE TO THE GAP
            </PrimaryBtn>
          </div>
        </div>
      </NextUShell>
    )
  }

  // ════════ STEP 5 — THE GAP ════════
  if (view === 5) {
    const pairs = ob.quantum_gap || []
    const setPair = (i, side, value) => {
      patch(prev => {
        const next = [...(prev.quantum_gap || [])]
        next[i] = { ...next[i], [side]: value }
        return { ...prev, quantum_gap: next }
      })
    }
    const toggleFocus = (i) => {
      patch(prev => {
        const next = [...(prev.quantum_gap || [])]
        next[i] = { ...next[i], focus: !next[i]?.focus }
        return { ...prev, quantum_gap: next }
      })
    }
    const addPair = () => patch(prev => ({
      ...prev, quantum_gap: [...(prev.quantum_gap || []), { current: '', horizon: '', focus: false }],
    }))
    const rows = pairs.length ? pairs : [{ current: '', horizon: '', focus: false }]
    if (!pairs.length && ob) {
      // seed one empty pair locally so the surface has a place to write
      // (saved only when content arrives)
    }
    const filled = rows.filter(p => p.current?.trim() && p.horizon?.trim()).length
    return (
      <NextUShell chapter={3}>
        <style>{ONBOARDING_CSS}</style>
        <div style={wrap}>
          {topbar('STEP FIVE · THE GAP')}
          <Frame>
            What's the gap between where you are now and where you want to be — between
            who you've been and who you truly are? It isn't resources — same body, same
            money, same relationships. It's patterns. Make the contrast explicit.
          </Frame>
          <FrameNote>
            Write each pair, then read it aloud — Current Me first, Horizon Me second.
            The reading is half the work: that one I'm done with, that one I'm becoming.
            Flag the pairs you're working on now; they feed the Daily Leap.
          </FrameNote>

          {rows.map((p, i) => (
            <div
              key={i}
              style={{
                marginTop: '28px', padding: '18px',
                border: `1px solid ${p.focus ? tokens.goldChrome : tokens.goldFaint}`,
                borderRadius: '8px',
                background: p.focus ? tokens.goldTint : '#FFFFFF',
              }}
            >
              <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: tokens.gold }}>
                CURRENT ME
              </div>
              <textarea
                value={p.current || ''}
                onChange={e => setPair(i, 'current', e.target.value)}
                rows={2}
                placeholder="The pattern I'm living…"
                style={{
                  width: '100%', boxSizing: 'border-box', marginTop: '8px',
                  padding: '12px 14px', border: `1px solid ${tokens.goldFaint}`,
                  borderRadius: '6px', background: tokens.bg,
                  fontFamily: "'Newsreader', Georgia, serif", fontStyle: 'italic',
                  fontSize: '16px', lineHeight: 1.6, color: tokens.dark,
                  resize: 'vertical', outline: 'none',
                }}
              />
              <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: tokens.gold, marginTop: '14px' }}>
                HORIZON ME
              </div>
              <textarea
                value={p.horizon || ''}
                onChange={e => setPair(i, 'horizon', e.target.value)}
                rows={2}
                placeholder="The pattern they've already left behind…"
                style={{
                  width: '100%', boxSizing: 'border-box', marginTop: '8px',
                  padding: '12px 14px', border: `1px solid ${tokens.goldFaint}`,
                  borderRadius: '6px', background: tokens.bg,
                  fontFamily: "'Newsreader', Georgia, serif", fontStyle: 'italic',
                  fontSize: '16px', lineHeight: 1.6, color: tokens.dark,
                  resize: 'vertical', outline: 'none',
                }}
              />
              <button
                onClick={() => toggleFocus(i)}
                style={{
                  ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.14em',
                  color: p.focus ? tokens.gold : tokens.ghost,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, marginTop: '12px',
                }}
              >
                {p.focus ? '◆ IN FOCUS' : '◇ MARK AS FOCUS'}
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '22px', flexWrap: 'wrap' }}>
            <button
              onClick={addPair}
              style={{
                ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.14em',
                color: tokens.gold, background: 'none',
                border: `1.5px solid ${tokens.goldChrome}`, borderRadius: '4px',
                padding: '10px 18px', cursor: 'pointer',
              }}
            >
              ADD A PAIR
            </button>
            <SavedWhisper state={whisper} />
          </div>
          <p style={{ ...body, fontSize: '14px', color: tokens.ghost, marginTop: '14px' }}>
            Three to five pairs is a strong start. No upper limit.
          </p>
          <div style={{ marginTop: '32px' }}>
            <PrimaryBtn disabled={filled < 3} onClick={() => completeStep(5)}>
              CONTINUE TO HORIZON BELIEFS
            </PrimaryBtn>
          </div>
        </div>
      </NextUShell>
    )
  }

  // ════════ STEP 6 — HORIZON BELIEFS + SYNTHESIS ════════
  if (view === 6) {
    const b = ob.horizon_beliefs || {}
    const setBelief = (domain, side, value) => {
      patch(prev => ({
        ...prev,
        horizon_beliefs: {
          ...(prev.horizon_beliefs || {}),
          [domain]: { ...(prev.horizon_beliefs?.[domain] || {}), [side]: value },
        },
      }))
    }
    const beliefsDone = stepDone[6]
    const saveSynthesis = async () => {
      await flush()
      // write-through: the daily Practice voices the Horizon Self
      // statement from map_results.life_ia_statement.
      if (mapResultId && ob.synthesised_statement?.trim()) {
        await supabase.from('map_results')
          .update({
            life_ia_statement: ob.synthesised_statement.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', mapResultId)
      }
      completeStep(6)
    }
    return (
      <NextUShell chapter={3}>
        <style>{ONBOARDING_CSS}</style>
        <div style={wrap}>
          {topbar('STEP SIX · HORIZON BELIEFS')}
          <Frame>
            In each area of life, the old version of you has been running a belief that
            fits the old version. The Horizon Self has a different knowing. Make the
            difference explicit.
          </Frame>

          {DOMAIN_ORDER.map(k => (
            <div key={k} style={{ marginTop: '34px', borderTop: `1px solid ${tokens.goldFaint}`, paddingTop: '22px' }}>
              <div style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.22em', color: tokens.gold }}>
                {DOMAIN_LABELS[k].toUpperCase()}
              </div>
              {(iaByDomain[k]?.ia_statement || iaByDomain[k]?.horizon_goal) && (
                <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', marginTop: '8px', lineHeight: 1.6 }}>
                  {iaByDomain[k]?.ia_statement && (
                    <>Your declaration: <span style={{ fontStyle: 'italic', color: tokens.dark }}>{iaByDomain[k].ia_statement}</span></>
                  )}
                  {iaByDomain[k]?.ia_statement && iaByDomain[k]?.horizon_goal && <br />}
                  {iaByDomain[k]?.horizon_goal && <>Your horizon: {iaByDomain[k].horizon_goal}</>}
                </p>
              )}
              <TextField
                label="MY OLD BELIEF WAS…"
                value={b[k]?.old_belief}
                onChange={v => setBelief(k, 'old_belief', v)}
                whisper={whisper}
                rows={2}
              />
              <TextField
                label="MY HORIZON SELF KNOWS…"
                value={b[k]?.horizon_knows}
                onChange={v => setBelief(k, 'horizon_knows', v)}
                whisper={whisper}
                rows={2}
              />
            </div>
          ))}

          {beliefsDone && (
            <div className="nextu-reveal" style={{ marginTop: '46px', borderTop: `1px solid ${tokens.goldFaint}`, paddingTop: '26px' }}>
              <Eyebrow>THE SYNTHESIS</Eyebrow>
              <p style={{ ...body, fontSize: '16px', lineHeight: 1.65, color: tokens.dark, marginTop: '10px' }}>
                One statement that carries the whole man. Draw it from everything you've
                written — your seven declarations, the Code, what they know. Your words,
                present tense. Your morning practice will speak it aloud.
              </p>
              {lifeStatement && !ob.synthesised_statement && (
                <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', marginTop: '10px', lineHeight: 1.6 }}>
                  A starting point from The Map: <span style={{ fontStyle: 'italic', color: tokens.dark }}>{lifeStatement}</span>
                </p>
              )}
              <TextField
                value={ob.synthesised_statement}
                onChange={v => patch({ synthesised_statement: v })}
                placeholder="I am…"
                whisper={whisper}
                rows={3}
              />
            </div>
          )}

          <div style={{ marginTop: '38px' }}>
            <PrimaryBtn
              disabled={!beliefsDone || !ob.synthesised_statement?.trim()}
              onClick={saveSynthesis}
            >
              CONTINUE TO THE DAILY LEAP
            </PrimaryBtn>
          </div>
        </div>
      </NextUShell>
    )
  }

  // ════════ STEP 7 — THE DAILY LEAP ════════
  if (view === 7) {
    const l = ob.daily_leap || {}
    const vals = [l.action, l.habit, l.toleration]
    const show = n => n === 0 || (vals[n - 1] && String(vals[n - 1]).trim())
    const finish = async () => {
      await placeDailyLeap()
      await completeStep(7)
    }
    return (
      <NextUShell chapter={3}>
        <style>{ONBOARDING_CSS}</style>
        <div style={wrap}>
          {topbar('STEP SEVEN · THE DAILY LEAP')}
          <Frame>
            The Horizon Self doesn't wait for the construction to finish — they act today.
            One action. One habit. One toleration to stop. Taken as them, immediately.
          </Frame>
          {show(0) && (
            <TextField
              label="ONE ACTION — TODAY"
              help="Something they do before the day ends. It will land at the top of your Get To Do."
              value={l.action}
              onChange={v => setField('daily_leap', 'action', v)}
              whisper={whisper}
              rows={2}
            />
          )}
          {show(1) && (
            <div className="nextu-reveal">
              <TextField
                label="ONE HABIT — STARTING NOW"
                help="A daily move that belongs to them."
                value={l.habit}
                onChange={v => setField('daily_leap', 'habit', v)}
                whisper={whisper}
                rows={2}
              />
            </div>
          )}
          {show(2) && (
            <div className="nextu-reveal">
              <TextField
                label="ONE TOLERATION — STOPPED"
                help="Something the old self put up with that they don't."
                value={l.toleration}
                onChange={v => setField('daily_leap', 'toleration', v)}
                whisper={whisper}
                rows={2}
              />
            </div>
          )}
          {stepDone[7] && (
            <p className="nextu-reveal" style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', marginTop: '24px', lineHeight: 1.65 }}>
              When you complete this step, your action goes straight into Get To Do as
              today's first priority — the construction writes into the day, visibly.
            </p>
          )}
          <div style={{ marginTop: '38px' }}>
            <PrimaryBtn disabled={!stepDone[7]} onClick={finish}>
              COMPLETE THE CONSTRUCTION
            </PrimaryBtn>
          </div>
        </div>
      </NextUShell>
    )
  }

  return null
}

export default HorizonSelfOnboardingPage
