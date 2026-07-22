// ════════════════════════════════════════════════════════════════════════════
// OpenBreath — standalone breathing module
//
// Descending three-centre open breath, carried by the pacer circle: N rounds,
// each moving through three centres (heart/chest → belly → sacrum). Each centre
// runs four phases — breathe in, hold, exhale on a voiced "ah", hold. The circle
// grows on the inhale, holds large, settles on the exhale, holds small; the
// phase word sits steady in the navy ink at its centre, and a focus line below
// the rounds names the body centre to breathe into. Audio cues mark each phase.
//
// No intro screen — the module starts on mount. Pause / restart while it runs;
// the close hands back via onComplete.
//
// ── Interface ───────────────────────────────────────────────────────────────
//   onComplete()    required. Called when the user finishes (Done).
//   onBack()        accepted for runner compatibility; not surfaced.
//   title           eyebrow label        (default 'Breath — regulate and anchor')
//   heading         heading              (default 'Open the body.')
//   completeLabel   CTA on the done card (default 'Done →')
//   doneTitle       done eyebrow         (default 'Settled')
//   doneHeading     done heading         (default 'The body is open.')
//   rounds          rounds               (default 3)
//   centres         focus body words     (default ['Heart/Chest','Belly','Sacrum'])
//   phases          phase shape          (default in 5 / hold 3 / exhale 6 / hold 3)
//   sound           audio cues on/off    (default true)
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'

const T = {
  dark: '#0F1523',
  gold: '#262420', goldChrome: '#4c6b45',
  goldFaint: 'rgba(76,107,69,0.20)', goldFill: 'rgba(76,107,69,0.10)',
  ghost: 'rgba(15,21,35,0.55)', whisper: 'rgba(15,21,35,0.30)',
}
const SC    = { fontFamily: "'IBM Plex Mono', Georgia, serif" }
const BODY  = { fontFamily: "'Newsreader', Georgia, serif" }
const SERIF = { fontFamily: "'Fraunces', Georgia, serif" }

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

const DEFAULT_CENTRES = ['Heart/Chest', 'Belly', 'Sacrum']
const DEFAULT_PHASES = [
  { kind: 'inhale',   label: 'Breathe in',     dur: 5 },
  { kind: 'hold-in',  label: 'Hold',           dur: 3 },
  { kind: 'exhale',   label: 'Exhale — “ah”',  dur: 6 },
  { kind: 'hold-out', label: 'Hold',           dur: 3 },
]
const MIN = 0.5, MAX = 1.0

const CTRL = {
  ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em',
  textTransform: 'uppercase', borderRadius: '40px', padding: '10px 22px',
  cursor: 'pointer',
}

export default function OpenBreath({
  onComplete,
  onBack,
  title = 'Breath — regulate and anchor',
  heading = 'Open the body.',
  completeLabel = 'Done →',
  doneTitle = 'Settled',
  doneHeading = 'The body is open.',
  rounds = 3,
  centres = DEFAULT_CENTRES,
  phases = DEFAULT_PHASES,
  sound = true,
}) {
  const [screen, setScreen] = useState('running')   // running | done
  const [paused, setPaused] = useState(false)

  const circleRef = useRef(null)
  const phaseRef  = useRef(null)
  const bodyRef   = useRef(null)
  const roundsRef = useRef(null)
  const labelRef  = useRef(null)

  const rafRef    = useRef(null)
  const lastTsRef = useRef(null)
  const accRef    = useRef(0)
  const pausedRef = useRef(false)
  const rRef = useRef(1), cRef = useRef(0), pRef = useRef(0)

  useEffect(() => { pausedRef.current = paused }, [paused])

  const bpIn    = () => { if (!sound) return; makeBeep(523, 0.18, 0.12); setTimeout(() => makeBeep(659, 0.16, 0.10), 180) }
  const bpTrans = () => { if (!sound) return; makeBeep(440, 0.22, 0.09) }
  const bpDone  = () => { if (!sound) return; makeBeep(659, 0.20, 0.11); setTimeout(() => makeBeep(880, 0.30, 0.13), 220) }

  const eFn = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)

  function updateRounds() {
    const w = roundsRef.current
    if (w) {
      w.innerHTML = ''
      for (let i = 1; i <= rounds; i++) {
        const d = document.createElement('div')
        d.style.height = '4px'; d.style.borderRadius = '2px'
        d.style.width = i === rRef.current ? '24px' : '10px'
        d.style.background = i <= rRef.current ? T.goldChrome : T.goldFaint
        d.style.transition = 'all 0.4s ease'
        w.appendChild(d)
      }
    }
    if (labelRef.current) labelRef.current.textContent = `Round ${rRef.current} of ${rounds}`
  }

  function setBody(fade) {
    const b = bodyRef.current
    if (!b) return
    const word = centres[cRef.current]
    if (fade) {
      b.style.transition = 'none'; b.style.opacity = '0'; b.textContent = word
      requestAnimationFrame(() => { b.style.transition = 'opacity 0.6s ease'; b.style.opacity = '1' })
    } else { b.textContent = word; b.style.opacity = '1' }
  }

  function runPhase() {
    cancelAnimationFrame(rafRef.current)
    lastTsRef.current = null; accRef.current = 0
    const cfg = phases[pRef.current]
    const dur = cfg.dur * 1000
    updateRounds(); setBody(pRef.current === 0)
    if (phaseRef.current) phaseRef.current.textContent = cfg.label
    if (pRef.current === 0) bpIn(); else bpTrans()

    const step = (ts) => {
      if (lastTsRef.current === null) lastTsRef.current = ts
      const dt = ts - lastTsRef.current; lastTsRef.current = ts
      if (!pausedRef.current) accRef.current += dt
      const t = Math.min(accRef.current / dur, 1)
      const e = eFn(t)
      let s
      if (cfg.kind === 'inhale') s = MIN + (MAX - MIN) * e
      else if (cfg.kind === 'hold-in') s = MAX
      else if (cfg.kind === 'exhale') s = MAX + (MIN - MAX) * e
      else s = MIN
      if (circleRef.current) circleRef.current.style.transform = `scale(${s.toFixed(4)})`
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else advancePhase()
    }
    rafRef.current = requestAnimationFrame(step)
  }

  function advancePhase() {
    const nP = pRef.current + 1, nC = cRef.current + 1, nR = rRef.current + 1
    if (nP < phases.length) { pRef.current = nP; runPhase() }
    else if (nC < centres.length) { cRef.current = nC; pRef.current = 0; runPhase() }
    else if (nR <= rounds) { rRef.current = nR; cRef.current = 0; pRef.current = 0; runPhase() }
    else { bpDone(); setTimeout(() => setScreen('done'), 700) }
  }

  function doPause() {
    setPaused(p => {
      const next = !p
      pausedRef.current = next
      return next
    })
  }
  function restart() {
    cancelAnimationFrame(rafRef.current)
    pausedRef.current = false; setPaused(false)
    rRef.current = 1; cRef.current = 0; pRef.current = 0
    if (circleRef.current) circleRef.current.style.transform = `scale(${MIN})`
    setScreen('running')
    setTimeout(runPhase, 120)
  }
  function finish() { cancelAnimationFrame(rafRef.current); onComplete && onComplete() }

  // auto-start on mount, clean up on unmount
  useEffect(() => {
    const id = setTimeout(runPhase, 200)
    return () => { clearTimeout(id); cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
      <span style={{ ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: T.gold, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{title}</span>
      <h1 style={{ ...SERIF, fontWeight: 300, fontSize: 'clamp(24px,3vw,32px)', color: T.dark, lineHeight: 1.15, letterSpacing: '-0.01em', margin: 0 }}>{heading}</h1>

      <div style={{ minHeight: '360px', marginTop: '14px' }}>
        {screen === 'running' && (
          <div>
            <div style={{ position: 'relative', width: '176px', height: '176px', margin: '0 auto 22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div ref={circleRef} style={{ position: 'absolute', width: '148px', height: '148px', borderRadius: '50%', background: T.goldFill, border: `1.5px solid ${T.goldChrome}`, transform: `scale(${MIN})` }} />
              <div ref={phaseRef} style={{ ...BODY, fontWeight: 400, color: T.dark, fontSize: '19px', letterSpacing: '0.04em', lineHeight: 1.25, position: 'relative', zIndex: 1 }} />
            </div>

            <div ref={roundsRef} style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '6px' }} />
            <div ref={labelRef} style={{ ...SC, fontSize: '13px', letterSpacing: '0.18em', color: T.whisper, textTransform: 'uppercase' }} />

            <div style={{ marginTop: '26px' }}>
              <div style={{ ...BODY, fontSize: '15px', fontWeight: 300, color: T.ghost, marginBottom: '4px' }}>Breathe into your…</div>
              <div ref={bodyRef} style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,6vw,42px)', color: T.dark, lineHeight: 1.1, transition: 'opacity 0.6s ease' }} />
            </div>
          </div>
        )}

        {screen === 'done' && (
          <div style={{ padding: '60px 0' }}>
            <span style={{ ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: T.gold, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>{doneTitle}</span>
            <h1 style={{ ...SERIF, fontWeight: 300, fontSize: 'clamp(20px,2.4vw,26px)', color: T.gold, lineHeight: 1.15, margin: 0 }}>{doneHeading}</h1>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'center', marginTop: '8px' }}>
        {screen === 'done' ? (
          <>
            <button onClick={restart} style={{ ...CTRL, background: 'transparent', color: T.gold, border: `1px solid ${T.goldFaint}` }}>Restart ↺</button>
            <button onClick={finish} style={{ ...CTRL, background: T.goldChrome, color: '#FFFFFF', border: `1px solid ${T.goldChrome}` }}>{completeLabel}</button>
          </>
        ) : (
          <>
            <button onClick={doPause} style={{ ...CTRL, background: paused ? T.goldChrome : 'transparent', color: paused ? '#FFFFFF' : T.gold, border: `1px solid ${paused ? T.goldChrome : T.goldFaint}` }}>{paused ? 'Resume →' : 'Pause'}</button>
            <button onClick={restart} style={{ ...CTRL, background: T.goldChrome, color: '#FFFFFF', border: `1px solid ${T.goldChrome}` }}>Restart ↺</button>
          </>
        )}
      </div>
    </div>
  )
}
