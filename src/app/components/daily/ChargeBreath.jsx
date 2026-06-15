// ════════════════════════════════════════════════════════════════════════════
// ChargeBreath — standalone breathing module
//
// Tabata-style charge breath: N rounds of fast, deep breathing (work) separated
// by rest, with a 3·2·1 countdown into round one and audio cues at each
// transition. Animated progress ring + pulsing core. Pause / resume / skip, and
// optional tab-close position restore.
//
// Recovered from Website-New snapshot 55 (the `GroundBeat` component, removed at
// snapshot 57). Repackaged here as an independent, opt-in module: React is the
// only dependency. The design primitives, audio, and persistence are all inlined
// so this file can be dropped into any tool's module registry as-is. Swap the
// PRIMITIVES block for your shared design system whenever you like.
//
// ── Interface ───────────────────────────────────────────────────────────────
//   onComplete()    required. Called when the exercise finishes or is skipped.
//   onBack()        optional. If provided, shows a Back control on the intro.
//   title           eyebrow label        (default 'Charge breath')
//   heading         intro heading        (default 'Wake the system.')
//   intro           array of intro lines (default below)
//   completeLabel   CTA on the done card (default 'Done →')
//   rounds          work rounds          (default 3)
//   workSeconds     seconds per work     (default 20)
//   restSeconds     seconds per rest     (default 10)
//   countdownSeconds  3·2·1 lead-in       (default 3)
//   sound           audio cues on/off    (default true)
//   autoStart       skip intro, begin    (default false)
//   persist         tab-close restore    (default false)
//   storageKey      localStorage key     (default 'charge_breath_phase')
//
// ── Changes from the recovered source (flagged, no timing changes) ───────────
//   • Beat-specific copy ('Ground' / 'I Am →') lifted into props.
//   • Constants (rounds / work / rest) made props.
//   • Sub-13px control labels raised to the 13px floor.
//   • <svg> style= prop moved to a wrapper div; ring transition via CSS class
//     (Chrome 148 rule: no style= on SVG elements).
//   • Dead 'open' resume branch removed (belonged to the sibling Open module).
//   • Ripple omitted from buttons to keep the module dependency-free.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'

// ── PRIMITIVES (self-contained — swap for your design system if desired) ──────
const T = {
  bg: '#FAFAF7', bgCard: '#FFFFFF', dark: '#0F1523',
  gold: '#A8721A', goldChrome: '#C8922A',
  goldFaint: 'rgba(200,146,42,0.20)', goldTint: 'rgba(200,146,42,0.05)',
  goldGlow: 'rgba(200,146,42,0.10)', goldStrong: 'rgba(200,146,42,0.35)',
  meta: 'rgba(15,21,35,0.88)', ghost: 'rgba(15,21,35,0.55)', whisper: 'rgba(15,21,35,0.30)',
}
const SC   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const BODY = { fontFamily: "'Lora', Georgia, serif" }
const SERIF = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

function Eyebrow({ children, color = 'gold', size = 13, style = {} }) {
  const c = color === 'gold' ? T.gold : color === 'ghost' ? T.ghost : T.whisper
  return <span style={{ ...SC, fontSize: `${size}px`, fontWeight: 600, letterSpacing: '0.20em',
    color: c, textTransform: 'uppercase', display: 'block', ...style }}>{children}</span>
}
function Heading({ children, size = 'lg', color, style = {} }) {
  const sizes = { xl: 'clamp(34px,4.5vw,50px)', lg: 'clamp(26px,3.2vw,36px)', md: 'clamp(20px,2.4vw,26px)', sm: '19px' }
  return <h1 style={{ ...SERIF, fontSize: sizes[size], fontWeight: 300, color: color || T.dark,
    lineHeight: 1.15, letterSpacing: '-0.01em', margin: 0, ...style }}>{children}</h1>
}
function Body({ children, dim = false, style = {} }) {
  return <p style={{ ...BODY, fontSize: '15.5px', fontWeight: 300, color: dim ? T.ghost : T.meta,
    lineHeight: 1.7, margin: '0 0 12px', ...style }}>{children}</p>
}
function GhostButton({ children, onClick, style = {} }) {
  return <button onClick={onClick} style={{ background: 'transparent', color: T.gold,
    border: `1px solid ${T.goldFaint}`, borderRadius: '40px', padding: '10px 22px',
    ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', cursor: 'pointer', transition: 'all 0.2s', ...style }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = T.goldChrome }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = T.goldFaint }}>{children}</button>
}
function SolidButton({ children, onClick, style = {} }) {
  return <button onClick={onClick} style={{ background: T.goldChrome, color: '#FFFFFF',
    border: `1px solid ${T.goldChrome}`, borderRadius: '40px', padding: '12px 26px',
    ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', cursor: 'pointer', transition: 'all 0.2s', ...style }}>{children}</button>
}

// ── Audio (self-contained; gated by the `sound` prop) ─────────────────────────
function makeBeep(freq, dur = 0.12, gain = 0.18) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator(); const g = ctx.createGain()
    osc.type = 'sine'; osc.frequency.value = freq
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + dur)
    setTimeout(() => ctx.close(), dur * 1000 + 200)
  } catch (e) {}
}

const DEFAULT_INTRO = [
  'Three rounds of charge breathing to wake the system.',
  'Fast, deep breaths. Focus on the exhale.',
]

export default function ChargeBreath({
  onComplete,
  onBack,
  title = 'Charge breath',
  heading = 'Wake the system.',
  intro = DEFAULT_INTRO,
  completeLabel = 'Done →',
  rounds = 3,
  workSeconds = 20,
  restSeconds = 10,
  countdownSeconds = 3,
  sound = true,
  autoStart = false,
  persist = false,
  storageKey = 'charge_breath_phase',
}) {
  // ── Persistence (opt-in, inlined) ──────────────────────────────────────────
  const save  = (p) => { if (persist) try { localStorage.setItem(storageKey, p) } catch (e) {} }
  const clear = ()  => { if (persist) try { localStorage.removeItem(storageKey) } catch (e) {} }
  const load  = ()  => { if (!persist) return 'intro'; try { return localStorage.getItem(storageKey) || 'intro' } catch (e) { return 'intro' } }

  const [phase, setPhase] = useState(() => {
    if (autoStart) return 'launch'
    const saved = load()
    // Only restore at deliberate resume points — never mid-timer.
    if (saved === 'charge-work' || saved === 'charge-rest' || saved === 'charge-ready') return 'intro'
    if (saved === 'charge-done') return 'charge-done'
    return saved || 'intro'
  })
  const [chargeRound, setChargeRound] = useState(1)
  const [tick, setTick]               = useState(0)
  const [circleScale, setCircleScale] = useState(1)
  const [paused, setPaused]           = useState(false)

  const timerRef     = useRef(null)
  const remainingRef = useRef(0)
  const resumeCtxRef = useRef(null)
  const phaseRef     = useRef('intro')
  const pausedRef    = useRef(false)

  // ── Cues ────────────────────────────────────────────────────────────────────
  const beepMid   = () => sound && makeBeep(523, 0.12, 0.18)
  const beepReady = () => sound && makeBeep(440, 0.22, 0.15)
  const beepBegin = () => { if (!sound) return; makeBeep(523, 0.15, 0.20); setTimeout(() => makeBeep(659, 0.15, 0.20), 160); setTimeout(() => makeBeep(880, 0.28, 0.22), 320) }
  const beepEnd   = () => { if (!sound) return; makeBeep(880, 0.15, 0.18); setTimeout(() => makeBeep(659, 0.15, 0.18), 160); setTimeout(() => makeBeep(523, 0.28, 0.20), 320) }

  useEffect(() => { phaseRef.current = phase; save(phase) }, [phase])
  useEffect(() => { pausedRef.current = paused }, [paused])

  // autoStart entry — begin round one once mounted
  useEffect(() => {
    if (phase === 'launch') startChargeReady(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function clearTimers() { clearInterval(timerRef.current) }

  function doPause() {
    if (pausedRef.current) return
    clearTimers()
    setPaused(true)
  }
  function doResume() {
    setPaused(false)
    const ctx = resumeCtxRef.current
    if (!ctx) return
    const rem = remainingRef.current
    if (ctx.kind === 'charge-work') resumeChargeWork(ctx.round, rem)
    else if (ctx.kind === 'charge-rest') resumeChargeRest(ctx.round, rem)
  }

  useEffect(() => {
    function onVisibilityChange() {
      const active = ['charge-work', 'charge-rest', 'charge-ready']
      if (document.hidden && active.includes(phaseRef.current) && !pausedRef.current) doPause()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // ── Charge engine ─────────────────────────────────────────────────────────
  function startChargeReady(round) {
    clearTimers()
    setChargeRound(round)
    if (round > 1) { beepBegin(); startChargeWork(round); return }   // only round 1 gets the countdown
    setPhase('charge-ready')
    beepReady()
    let count = countdownSeconds
    setTick(count)
    timerRef.current = setInterval(() => {
      count--
      if (count > 0) { setTick(count); beepMid() }
      else { clearInterval(timerRef.current); beepBegin(); startChargeWork(round) }
    }, 1000)
  }

  function startChargeWork(round) {
    setPhase('charge-work'); setTick(workSeconds); setCircleScale(1)
    resumeCtxRef.current = { kind: 'charge-work', round }
    resumeChargeWork(round, workSeconds)
  }
  function resumeChargeWork(round, startAt) {
    setPhase('charge-work'); setChargeRound(round)
    let t = startAt; setTick(t); let expanding = true
    timerRef.current = setInterval(() => {
      t--; remainingRef.current = t; setTick(t)
      expanding = !expanding; setCircleScale(expanding ? 1.12 : 0.92)
      if (t <= 0) {
        clearInterval(timerRef.current); setCircleScale(1)
        if (round < rounds) { beepEnd(); startChargeRest(round) }
        else { beepEnd(); setPhase('charge-done') }
      }
    }, 1000)
  }

  function startChargeRest(round) {
    setPhase('charge-rest')
    resumeCtxRef.current = { kind: 'charge-rest', round }
    resumeChargeRest(round, restSeconds)
  }
  function resumeChargeRest(round, startAt) {
    setPhase('charge-rest'); setChargeRound(round)
    let t = startAt; setTick(t)
    timerRef.current = setInterval(() => {
      t--; remainingRef.current = t; setTick(t)
      if (t <= 0) { clearInterval(timerRef.current); startChargeReady(round + 1) }
    }, 1000)
  }

  useEffect(() => () => clearTimers(), [])

  function finish() { clear(); onComplete && onComplete() }

  // ── Visual derivations ──────────────────────────────────────────────────────
  const isCharging  = phase === 'charge-work' || phase === 'charge-rest' || phase === 'charge-ready'
  const circleColor = phase === 'charge-work' ? T.goldChrome : T.gold
  const circleBg    = phase === 'charge-work' ? T.goldStrong : T.goldTint
  const totalSecs   = phase === 'charge-work' ? workSeconds : phase === 'charge-rest' ? restSeconds : 0
  const elapsed     = totalSecs - tick
  const progress    = totalSecs > 0 ? Math.min(elapsed / totalSecs, 1) : 0
  const R = 88, CIRC = 2 * Math.PI * R
  const dashOffset  = CIRC - progress * CIRC

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      {/* Ring transition lives in a class — SVG elements carry no style= prop (Chrome 148). */}
      <style>{`.cb-ring{transition:stroke-dashoffset 0.9s linear}`}</style>

      <Eyebrow style={{ marginBottom: '12px' }}>{title}</Eyebrow>
      <Heading size="lg" style={{ marginBottom: '6px' }}>{heading}</Heading>

      {/* ── Intro ── */}
      {phase === 'intro' && (
        <div>
          <div style={{ margin: '0 0 28px' }}>
            {intro.map((line, i) => (
              <Body key={i} dim style={{ marginBottom: i === intro.length - 1 ? 0 : '4px' }}>{line}</Body>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {onBack && <GhostButton onClick={onBack}>← Back</GhostButton>}
            <SolidButton onClick={() => startChargeReady(1)}>Begin →</SolidButton>
            <GhostButton onClick={finish} style={{ marginLeft: 'auto' }}>Skip</GhostButton>
          </div>
        </div>
      )}

      {/* ── Ready countdown ── */}
      {phase === 'charge-ready' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Eyebrow style={{ marginBottom: '16px' }}>Round {chargeRound} of {rounds} · {title}</Eyebrow>
          <div style={{ ...BODY, fontSize: 'clamp(60px, 14vw, 88px)', fontWeight: 300, color: T.gold, lineHeight: 1, marginBottom: '16px' }}>{tick}</div>
          <Body dim style={{ margin: 0 }}>Ready…</Body>
        </div>
      )}

      {/* ── Work / rest ── */}
      {(phase === 'charge-work' || phase === 'charge-rest') && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Eyebrow style={{ marginBottom: '20px' }}>
            {phase === 'charge-work' ? `Round ${chargeRound} of ${rounds} · Charge` : `Rest · Round ${chargeRound + 1} begins next`}
          </Eyebrow>

          <div style={{ position: 'relative', width: '210px', height: '210px', margin: '0 auto 20px' }}>
            <div style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <svg width="210" height="210">
                <circle cx="105" cy="105" r={R} fill="none" stroke={T.goldFaint} strokeWidth="3" />
                <circle className="cb-ring" cx="105" cy="105" r={R} fill="none" stroke={circleColor}
                  strokeWidth="3" strokeDasharray={CIRC} strokeDashoffset={dashOffset} />
              </svg>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: phase === 'charge-work' ? circleBg : T.goldTint,
                border: `2px solid ${circleColor}`, transform: `scale(${circleScale})`,
                transition: phase === 'charge-work' ? 'transform 0.45s ease-in-out' : 'transform 0.8s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ ...BODY, fontSize: '28px', fontWeight: 300, color: circleColor, lineHeight: 1 }}>{tick}</span>
              </div>
            </div>
          </div>

          <Body style={{ margin: 0 }} dim={phase === 'charge-rest'}>
            {paused ? 'Paused.' : phase === 'charge-work' ? 'Just breathe. Focus on the exhale.' : 'Pause on the exhale.'}
          </Body>
        </div>
      )}

      {/* ── Done ── */}
      {phase === 'charge-done' && (
        <div style={{ textAlign: 'center', padding: '28px 0' }}>
          <Eyebrow style={{ marginBottom: '14px' }}>Charged</Eyebrow>
          <Heading size="md" style={{ marginBottom: '24px', color: T.gold }}>System is awake.</Heading>
          <SolidButton onClick={finish}>{completeLabel}</SolidButton>
        </div>
      )}

      {/* ── Pause / skip during active phases ── */}
      {isCharging && (
        <div style={{ textAlign: 'center', marginTop: '28px', display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
          <button onClick={paused ? doResume : doPause} style={{
            background: paused ? T.goldChrome : 'transparent',
            border: `1px solid ${paused ? T.goldChrome : T.goldFaint}`, borderRadius: '40px', cursor: 'pointer',
            ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em',
            color: paused ? '#FFFFFF' : T.gold, textTransform: 'uppercase', padding: '8px 18px',
          }}>{paused ? 'Resume →' : 'Pause'}</button>
          <button onClick={() => { clearTimers(); finish() }} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em',
            color: T.whisper, textTransform: 'uppercase',
          }}>Skip →</button>
        </div>
      )}
    </div>
  )
}
