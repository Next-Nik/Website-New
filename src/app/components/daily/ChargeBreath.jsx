// ════════════════════════════════════════════════════════════════════════════
// ChargeBreath — standalone breathing module
//
// Tabata-style charge breath: N rounds of fast breathing (work) separated by
// rest, with a 3·2·1 countdown into round one and audio cues at each
// transition. A slow ring is the round clock; the core pulses twice a second
// as the exhale pacer, with the count held steady on its own layer above the
// pulse. Pause / restart while it runs; the close hands back via onComplete.
//
// No intro screen — the module starts the moment it mounts, the simple
// elegant surface the daily flow is built around.
//
// ── Interface ───────────────────────────────────────────────────────────────
//   onComplete()    required. Called when the user finishes (Done).
//   onBack()        accepted for runner compatibility; not surfaced.
//   title           eyebrow label        (default 'Energy breath')
//   heading         heading              (default 'Wake the system.')
//   completeLabel   CTA on the done card (default 'Done →')
//   rounds          work rounds          (default 3)
//   workSeconds     seconds per work     (default 20)
//   restSeconds     seconds per rest     (default 10)
//   countdownSeconds  3·2·1 lead-in       (default 3)
//   sound           audio cues on/off    (default true)
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'

const T = {
  dark: '#0F1523',
  gold: '#262420', goldChrome: '#4c6b45',
  goldFaint: 'rgba(76,107,69,0.20)', goldTint: 'rgba(76,107,69,0.05)',
  goldStrong: 'rgba(76,107,69,0.35)',
  ghost: 'rgba(15,21,35,0.55)', whisper: 'rgba(15,21,35,0.30)',
}
const SC    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const BODY  = { fontFamily: "'Lora', Georgia, serif" }
const SERIF = { fontFamily: "'Lora', Georgia, serif" }

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

const CTRL = {
  ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em',
  textTransform: 'uppercase', borderRadius: '40px', padding: '10px 22px',
  cursor: 'pointer',
}

export default function ChargeBreath({
  onComplete,
  onBack,
  title = 'Energy breath',
  heading = 'Wake the system.',
  completeLabel = 'Done →',
  rounds = 3,
  workSeconds = 20,
  restSeconds = 10,
  countdownSeconds = 3,
  sound = true,
}) {
  const [phase, setPhase]   = useState('ready')   // ready | work | rest | done
  const [round, setRound]   = useState(1)
  const [tick, setTick]     = useState(countdownSeconds)
  const [paused, setPaused] = useState(false)

  const timerRef     = useRef(null)
  const remainingRef = useRef(0)
  const resumeCtxRef = useRef(null)
  const phaseRef     = useRef('ready')
  const pausedRef    = useRef(false)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { pausedRef.current = paused }, [paused])

  const beepMid   = () => sound && makeBeep(523, 0.12, 0.18)
  const beepReady = () => sound && makeBeep(440, 0.22, 0.15)
  const beepBegin = () => { if (!sound) return; makeBeep(523, 0.15, 0.20); setTimeout(() => makeBeep(659, 0.15, 0.20), 160); setTimeout(() => makeBeep(880, 0.28, 0.22), 320) }
  const beepEnd   = () => { if (!sound) return; makeBeep(880, 0.15, 0.18); setTimeout(() => makeBeep(659, 0.15, 0.18), 160); setTimeout(() => makeBeep(523, 0.28, 0.20), 320) }

  function clearTimer() { clearInterval(timerRef.current) }

  function startReady(r) {
    clearTimer(); setRound(r); setPhase('ready')
    if (r > 1) { beepBegin(); startWork(r); return }   // only round one gets the countdown
    beepReady()
    let count = countdownSeconds
    setTick(count)
    timerRef.current = setInterval(() => {
      count--
      if (count > 0) { setTick(count); beepMid() }
      else { clearInterval(timerRef.current); beepBegin(); startWork(r) }
    }, 1000)
  }

  function startWork(r) {
    setPhase('work'); setRound(r); resumeCtxRef.current = { kind: 'work', round: r }
    resumeWork(r, workSeconds)
  }
  function resumeWork(r, startAt) {
    setPhase('work'); setRound(r)
    let t = startAt; setTick(t); remainingRef.current = t
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return
      t--; remainingRef.current = t; setTick(t)
      if (t <= 0) {
        clearInterval(timerRef.current)
        if (r < rounds) { beepEnd(); startRest(r) }
        else { beepEnd(); setPhase('done') }
      }
    }, 1000)
  }

  function startRest(r) {
    setPhase('rest'); resumeCtxRef.current = { kind: 'rest', round: r }
    resumeRest(r, restSeconds)
  }
  function resumeRest(r, startAt) {
    setPhase('rest'); setRound(r)
    let t = startAt; setTick(t); remainingRef.current = t
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return
      t--; remainingRef.current = t; setTick(t)
      if (t <= 0) { clearInterval(timerRef.current); startReady(r + 1) }
    }, 1000)
  }

  function doPause() {
    if (pausedRef.current) return
    clearTimer(); setPaused(true)
  }
  function doResume() {
    setPaused(false)
    const ctx = resumeCtxRef.current
    if (!ctx) return
    if (ctx.kind === 'work') resumeWork(ctx.round, remainingRef.current)
    else if (ctx.kind === 'rest') resumeRest(ctx.round, remainingRef.current)
  }
  function restart() { clearTimer(); setPaused(false); setRound(1); setTick(countdownSeconds); startReady(1) }
  function finish() { clearTimer(); onComplete && onComplete() }

  // auto-start on mount, clean up on unmount
  useEffect(() => {
    startReady(1)
    function onVisibility() {
      const active = ['work', 'rest']
      if (document.hidden && active.includes(phaseRef.current) && !pausedRef.current) doPause()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { clearTimer(); document.removeEventListener('visibilitychange', onVisibility) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── visual derivations ──────────────────────────────────────────────────────
  const isWork = phase === 'work'
  const isActive = phase === 'work' || phase === 'rest'
  const circleColor = isWork ? T.goldChrome : T.gold
  const totalSecs = phase === 'work' ? workSeconds : phase === 'rest' ? restSeconds : 0
  const progress = totalSecs > 0 ? Math.min((totalSecs - tick) / totalSecs, 1) : 0
  const R = 88, CIRC = 2 * Math.PI * R
  const dashOffset = CIRC - progress * CIRC

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
      <style>{`.cb-ring{transition:stroke-dashoffset 0.9s linear}@keyframes cb-exhale{0%{transform:scale(1)}28%{transform:scale(0.74)}100%{transform:scale(1)}}.cb-exhale-on{animation:cb-exhale 0.5s ease-out infinite}`}</style>

      <span style={{ ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: T.gold, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{title}</span>
      <h1 style={{ ...SERIF, fontWeight: 300, fontSize: 'clamp(24px,3vw,32px)', color: T.dark, lineHeight: 1.15, letterSpacing: '-0.01em', margin: 0 }}>{heading}</h1>

      <div style={{ minHeight: '300px', marginTop: '14px' }}>
        {phase === 'ready' && (
          <div style={{ padding: '36px 0' }}>
            <span style={{ ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: T.gold, textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>Round {round} of {rounds} · {title}</span>
            <div style={{ ...BODY, fontSize: 'clamp(60px,14vw,88px)', fontWeight: 300, color: T.gold, lineHeight: 1, marginBottom: '16px' }}>{tick}</div>
            <p style={{ ...BODY, fontSize: '15.5px', fontWeight: 300, color: T.ghost, margin: 0 }}>Ready…</p>
          </div>
        )}

        {isActive && (
          <div style={{ padding: '8px 0' }}>
            <span style={{ ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: T.gold, textTransform: 'uppercase', display: 'block', marginBottom: '20px' }}>
              {isWork ? `Round ${round} of ${rounds} · Charge` : `Rest · Round ${round + 1} begins next`}
            </span>
            <div style={{ position: 'relative', width: '210px', height: '210px', margin: '0 auto 20px' }}>
              <div style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                <svg width="210" height="210">
                  <circle cx="105" cy="105" r={R} fill="none" stroke={T.goldFaint} strokeWidth="3" />
                  <circle className="cb-ring" cx="105" cy="105" r={R} fill="none" stroke={circleColor} strokeWidth="3" strokeDasharray={CIRC} strokeDashoffset={dashOffset} />
                </svg>
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  className={isWork && !paused ? 'cb-exhale-on' : ''}
                  style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: isWork ? T.goldStrong : T.goldTint,
                    border: `2px solid ${circleColor}`,
                    transform: isWork ? undefined : 'scale(1)',
                    transition: isWork ? 'none' : 'transform 0.8s ease',
                    animationPlayState: paused ? 'paused' : 'running',
                  }}
                />
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ ...BODY, fontSize: '30px', fontWeight: 300, color: circleColor, lineHeight: 1 }}>{tick}</span>
              </div>
            </div>
            <p style={{ ...BODY, fontSize: '15.5px', fontWeight: 300, color: phase === 'rest' ? T.ghost : 'rgba(15,21,35,0.88)', margin: 0 }}>
              {paused ? 'Paused.' : isWork ? 'Exhale on every beat.' : 'Rest.'}
            </p>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ padding: '40px 0' }}>
            <span style={{ ...SC, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: T.gold, textTransform: 'uppercase', display: 'block', marginBottom: '14px' }}>Charged</span>
            <h1 style={{ ...SERIF, fontWeight: 300, fontSize: 'clamp(20px,2.4vw,26px)', color: T.gold, lineHeight: 1.15, margin: 0 }}>System is awake.</h1>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'center', marginTop: '8px' }}>
        {phase === 'done' ? (
          <>
            <button onClick={restart} style={{ ...CTRL, background: 'transparent', color: T.gold, border: `1px solid ${T.goldFaint}` }}>Restart ↺</button>
            <button onClick={finish} style={{ ...CTRL, background: T.goldChrome, color: '#FFFFFF', border: `1px solid ${T.goldChrome}` }}>{completeLabel}</button>
          </>
        ) : (
          <>
            <button onClick={() => (paused ? doResume() : doPause())} style={{ ...CTRL, background: paused ? T.goldChrome : 'transparent', color: paused ? '#FFFFFF' : T.gold, border: `1px solid ${paused ? T.goldChrome : T.goldFaint}` }}>{paused ? 'Resume →' : 'Pause'}</button>
            <button onClick={restart} style={{ ...CTRL, background: T.goldChrome, color: '#FFFFFF', border: `1px solid ${T.goldChrome}` }}>Restart ↺</button>
          </>
        )}
      </div>
    </div>
  )
}
