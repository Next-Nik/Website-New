// ════════════════════════════════════════════════════════════════════════════
// OpenBreath — standalone breathing module
//
// Descending three-centre open breath: N rounds, each moving through three
// centres (chest → belly → sacrum). Each centre runs four phases — breathe in,
// hold, exhale on a voiced "ah", hold. A canvas tick-ring counts the seconds, a
// radial glow swells and settles with the breath, and the phase word grows and
// recedes with it. Audio cues mark each centre and the close. Pause / skip.
//
// Recovered from Website-New snapshot 55 (the `OpenBreathBeat` component, removed
// at snapshot 57). Repackaged as an independent, opt-in module: React is the only
// dependency. Design primitives and audio are inlined so it drops into any
// module registry as-is.
//
// ── Interface ───────────────────────────────────────────────────────────────
//   onComplete()    required. Called when the exercise finishes or is skipped.
//   onBack()        optional. If provided, shows a Back control on the intro.
//   title           eyebrow label        (default 'Open breath')
//   heading         intro heading        (default 'Open the body.')
//   intro           array of intro lines (default below)
//   completeLabel   CTA on the done card (default 'Done →')
//   doneTitle       done eyebrow         (default 'Settled')
//   doneHeading     done heading         (default 'The body is open.')
//   rounds          rounds               (default 3)
//   centres         centre labels        (default ['Chest / heart','Belly','Sacrum'])
//   phases          phase shape          (default below — in / hold / ah / hold)
//   sound           audio cues on/off    (default true)
//   autoStart       skip intro, begin    (default false)
//
// ── Changes from the recovered source (flagged, no timing changes) ───────────
//   • REPAIR: phases now carry `kind` (inhale / hold-in / exhale / hold-out).
//     In snap 55 this field was missing, so the glow + phase-text choreography
//     in applyPhaseVisuals never fired. With `kind` present it runs as designed.
//   • Beat-specific copy ('Anchor' / 'Let it land.' / 'Plan →') lifted to props.
//   • Constants (rounds / centres / phases) made props; unused `expand` dropped.
//   • Sub-13px control labels raised to the 13px floor.
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
  'Three centres, descending. Breathe in, hold, exhale with a voiced "ah", hold.',
  'Let each breath settle and open the body.',
]
const DEFAULT_CENTRES = ['Chest / heart', 'Belly', 'Sacrum']
// REPAIR: `kind` drives the glow + phase-text choreography (was missing in snap 55).
const DEFAULT_PHASES = [
  { kind: 'inhale',   label: 'Breathe in',     dur: 5 },
  { kind: 'hold-in',  label: 'Hold',           dur: 4 },
  { kind: 'exhale',   label: 'Exhale — "ah"',  dur: 7 },
  { kind: 'hold-out', label: 'Hold',           dur: 4 },
]

export default function OpenBreath({
  onComplete,
  onBack,
  title = 'Open breath',
  heading = 'Open the body.',
  intro = DEFAULT_INTRO,
  completeLabel = 'Done →',
  doneTitle = 'Settled',
  doneHeading = 'The body is open.',
  rounds = 3,
  centres = DEFAULT_CENTRES,
  phases = DEFAULT_PHASES,
  sound = true,
  autoStart = false,
}) {
  const canvasRef      = useRef(null)
  const glowRef        = useRef(null)
  const phaseTextRef   = useRef(null)
  const timerRef       = useRef(null)
  const glowAnimRef    = useRef(null)
  const pulseAnimRef   = useRef(null)
  const currentGlowRef = useRef(0)
  const transRef       = useRef(false)
  const pausedRef      = useRef(false)

  const [screen, setScreen]         = useState(autoStart ? 'running' : 'intro')
  const [paused, setPaused]         = useState(false)
  const [openRound, setOpenRound]   = useState(1)
  const [openCentre, setOpenCentre] = useState(0)
  const [openPhase, setOpenPhase]   = useState(0)

  useEffect(() => { pausedRef.current = paused }, [paused])

  // ── Audio ─────────────────────────────────────────────────────────────────
  const bpIn    = () => { if (!sound) return; makeBeep(523, 0.18, 0.12); setTimeout(() => makeBeep(659, 0.16, 0.10), 180) }
  const bpTrans = () => { if (!sound) return; makeBeep(440, 0.22, 0.09) }
  const bpDone  = () => { if (!sound) return; makeBeep(659, 0.20, 0.11); setTimeout(() => makeBeep(880, 0.30, 0.13), 220) }

  // ── Glow field ──────────────────────────────────────────────────────────────
  function setGlow(v) {
    currentGlowRef.current = v
    if (!glowRef.current) return
    const a1 = 0.04 + v * 0.30
    const a2 = 0.00 + v * 0.14
    glowRef.current.style.background =
      'radial-gradient(circle, rgba(200,146,42,' + a1 + ') 20%, rgba(200,146,42,' + a2 + ') 55%, transparent 78%)'
  }
  function animateGlowTo(from, to, durMs) {
    cancelAnimationFrame(glowAnimRef.current)
    let start = null
    function step(ts) {
      if (!start) start = ts
      const t = Math.min((ts - start) / durMs, 1)
      const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      setGlow(from + (to - from) * e)
      if (t < 1) glowAnimRef.current = requestAnimationFrame(step)
    }
    glowAnimRef.current = requestAnimationFrame(step)
  }

  // ── Tick canvas ───────────────────────────────────────────────────────────
  function drawTicks(total, filled, pulse) {
    pulse = pulse || 0
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 220, 220)
    const cx = 110, cy = 110, r = 96
    const step = (Math.PI * 2) / total
    const startA = -Math.PI / 2
    const allFilled = filled >= total
    for (let i = 0; i < total; i++) {
      const angle = startA + i * step
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      const isLast = i === total - 1
      const isFilled = i < filled
      let dotR = 2.8
      if (isLast && isFilled) dotR = 4.4
      if (allFilled && pulse > 0) { const p = Math.sin(pulse * Math.PI); dotR += p * (isLast ? 3.2 : 1.6) }
      let alpha = isFilled ? 0.85 : 0.16
      if (allFilled && pulse > 0) { const p2 = Math.sin(pulse * Math.PI); alpha = isFilled ? Math.min(1.0, 0.85 + p2 * 0.15) : 0.16 + p2 * 0.28 }
      ctx.beginPath()
      ctx.arc(x, y, dotR, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(200,146,42,' + alpha + ')'
      ctx.fill()
    }
  }
  function runCompletePulse(total, onDone) {
    cancelAnimationFrame(pulseAnimRef.current)
    let start = null
    const dur = 520
    function step(ts) {
      if (!start) start = ts
      const t = Math.min((ts - start) / dur, 1)
      drawTicks(total, total, t)
      if (t < 1) pulseAnimRef.current = requestAnimationFrame(step)
      else { drawTicks(total, total, 0); onDone() }
    }
    pulseAnimRef.current = requestAnimationFrame(step)
  }

  // ── Phase visuals ───────────────────────────────────────────────────────────
  function applyPhaseVisuals(kind, durMs) {
    const el = phaseTextRef.current
    if (!el) return
    if (kind === 'inhale') {
      el.style.transition = 'opacity 0.3s ease, color 0.4s ease'
      el.style.opacity = '1'; el.style.color = T.dark
      el.style.fontSize = '17px'; el.style.letterSpacing = '0.03em'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition =
          'font-size ' + durMs + 'ms cubic-bezier(0.25,0,0.1,1), ' +
          'letter-spacing ' + durMs + 'ms cubic-bezier(0.25,0,0.1,1), ' +
          'opacity 0.3s ease, color 0.4s ease'
        el.style.fontSize = '30px'; el.style.letterSpacing = '0.06em'
      }))
      animateGlowTo(0.05, 0.26, durMs)
    } else if (kind === 'hold-in') {
      el.style.transition = 'font-size 0.4s ease, letter-spacing 0.4s ease, opacity 0.3s ease, color 0.4s ease'
      el.style.opacity = '1'; el.style.color = T.dark
      el.style.fontSize = '30px'; el.style.letterSpacing = '0.10em'
      animateGlowTo(0.26, 0.78, durMs)
    } else if (kind === 'exhale') {
      el.style.transition = 'opacity 0.3s ease, color 0.5s ease'
      el.style.opacity = '0.88'; el.style.color = 'rgba(168,114,26,0.72)'
      el.style.fontSize = '30px'; el.style.letterSpacing = '0.10em'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition =
          'font-size ' + durMs + 'ms cubic-bezier(0.0,0,0.2,1), ' +
          'letter-spacing ' + (durMs * 1.15) + 'ms cubic-bezier(0.0,0,0.2,1), ' +
          'opacity 0.3s ease, color 0.5s ease'
        el.style.fontSize = '16px'; el.style.letterSpacing = '0.26em'
      }))
      animateGlowTo(0.78, 0.04, durMs)
    } else if (kind === 'hold-out') {
      el.style.transition = 'font-size 0.6s ease, letter-spacing 0.6s ease, opacity 0.7s ease, color 0.5s ease'
      el.style.fontSize = '15px'; el.style.letterSpacing = '0.20em'
      el.style.opacity = '0.48'; el.style.color = T.ghost
      animateGlowTo(0.04, 0.02, durMs)
    }
  }

  // ── Core timer ──────────────────────────────────────────────────────────────
  function startPhase(r, c, p) {
    if (transRef.current) return
    setOpenRound(r); setOpenCentre(c); setOpenPhase(p)
    clearInterval(timerRef.current)
    const cfg = phases[p]
    let ticksLeft = cfg.dur
    const total = cfg.dur
    if (phaseTextRef.current) phaseTextRef.current.textContent = cfg.label
    drawTicks(total, 0, 0)
    applyPhaseVisuals(cfg.kind, cfg.dur * 1000)
    if (p === 0) bpIn(); else bpTrans()
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return
      ticksLeft--
      drawTicks(total, total - ticksLeft, 0)
      if (ticksLeft <= 0) {
        clearInterval(timerRef.current)
        runCompletePulse(total, () => {
          const el = phaseTextRef.current
          if (el) { el.style.transition = 'opacity 0.25s ease'; el.style.opacity = '0.28' }
          transRef.current = true
          setTimeout(() => { transRef.current = false; advancePhase(r, c, p) }, 700)
        })
      }
    }, 1000)
  }

  function advancePhase(r, c, p) {
    const nextP = p + 1, nextC = c + 1, nextR = r + 1
    if (nextP < phases.length) { startPhase(r, c, nextP) }
    else if (nextC < centres.length) { bpTrans(); startPhase(r, nextC, 0) }
    else if (nextR <= rounds) { bpTrans(); startPhase(nextR, 0, 0) }
    else {
      bpDone()
      const el = phaseTextRef.current
      if (el) { el.style.transition = 'all 0.6s ease'; el.style.fontSize = '22px'; el.style.letterSpacing = '0.02em'; el.style.opacity = '1'; el.style.color = T.dark }
      animateGlowTo(currentGlowRef.current, 0, 800)
      setTimeout(() => setScreen('done'), 900)
    }
  }

  function doStart() {
    setScreen('running')
    setTimeout(() => startPhase(1, 0, 0), 80)
  }
  // autoStart entry
  useEffect(() => {
    if (autoStart) setTimeout(() => startPhase(1, 0, 0), 80)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function doPause() {
    setPaused(p => {
      const next = !p
      pausedRef.current = next
      if (next) cancelAnimationFrame(glowAnimRef.current)
      return next
    })
  }
  function doSkip() {
    clearInterval(timerRef.current)
    cancelAnimationFrame(glowAnimRef.current)
    cancelAnimationFrame(pulseAnimRef.current)
    onComplete && onComplete()
  }

  useEffect(() => {
    function onVis() { if (document.hidden && !pausedRef.current) doPause() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(glowAnimRef.current)
    cancelAnimationFrame(pulseAnimRef.current)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
      {screen === 'intro' && (
        <>
          <Eyebrow style={{ marginBottom: '6px' }}>{title}</Eyebrow>
          <Heading size="lg" style={{ marginBottom: '6px' }}>{heading}</Heading>
          <div>
            <div style={{ background: T.goldTint, border: '1px solid ' + T.goldFaint, borderRadius: '14px', padding: '26px', margin: '28px 0', textAlign: 'left' }}>
              {intro.map((line, i) => (
                <Body key={i} dim style={{ marginBottom: i === intro.length - 1 ? 0 : '10px' }}>{line}</Body>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {onBack && <GhostButton onClick={onBack}>← Back</GhostButton>}
              <SolidButton onClick={doStart}>Begin →</SolidButton>
              <button onClick={doSkip} style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', color: T.whisper, textTransform: 'uppercase' }}>Skip</button>
            </div>
          </div>
        </>
      )}

      {screen === 'running' && (
        <div>
          <div style={{ ...SC, fontSize: '13px', letterSpacing: '0.18em', color: T.ghost, textTransform: 'uppercase', margin: '8px 0 36px' }}>
            {centres[openCentre]}
          </div>

          <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto 36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div ref={glowRef} style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, transparent 30%, transparent 100%)', pointerEvents: 'none' }} />
            <canvas ref={canvasRef} width={220} height={220} style={{ position: 'absolute', inset: 0 }} />
            <div ref={phaseTextRef} style={{ ...BODY, fontWeight: 400, color: T.dark, fontSize: '22px', letterSpacing: '0.02em', opacity: 1, lineHeight: 1.25, position: 'relative', zIndex: 1, transition: 'font-size 0.5s ease, letter-spacing 0.5s ease, opacity 0.4s ease, color 0.5s ease' }}>
              {phases[openPhase]?.label}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
            {Array.from({ length: rounds }, (_, i) => i + 1).map(r => (
              <div key={r} style={{ height: '4px', borderRadius: '2px', width: r === openRound ? '24px' : '10px', background: r <= openRound ? T.goldChrome : T.goldFaint, transition: 'all 0.4s ease' }} />
            ))}
          </div>
          <div style={{ ...SC, fontSize: '13px', letterSpacing: '0.18em', color: T.whisper, textTransform: 'uppercase', marginBottom: '36px' }}>
            Round {openRound} of {rounds}
          </div>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={doPause} style={{ background: paused ? T.goldChrome : 'transparent', border: '1px solid ' + (paused ? T.goldChrome : T.goldFaint), borderRadius: '40px', cursor: 'pointer', ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', color: paused ? '#FFFFFF' : T.gold, textTransform: 'uppercase', padding: '8px 18px' }}>{paused ? 'Resume →' : 'Pause'}</button>
            <button onClick={doSkip} style={{ background: 'transparent', border: 'none', cursor: 'pointer', ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', color: T.whisper, textTransform: 'uppercase' }}>Skip →</button>
          </div>
        </div>
      )}

      {screen === 'done' && (
        <div style={{ padding: '28px 0' }}>
          <Eyebrow style={{ marginBottom: '12px' }}>{doneTitle}</Eyebrow>
          <Heading size="md" style={{ marginBottom: '24px', color: T.gold }}>{doneHeading}</Heading>
          <SolidButton onClick={onComplete}>{completeLabel}</SolidButton>
        </div>
      )}
    </div>
  )
}
