// ─────────────────────────────────────────────────────────────
// BreathPacer.jsx
//
// The breathing circle. A visual breath pacer: the circle grows
// for the inhale, holds at its largest through the post-inhale
// beat, settles for the (longer) exhale, then holds smallest
// through the rest before the cycle repeats. Two phase words —
// IN and OUT — fade in beneath it on the active halves; the holds
// carry no word, the circle's stillness says it.
//
// Canonical timing (locked June 2026): 4 in · 2 hold · 6 out ·
// 2 rest. Fourteen seconds a cycle. All four durations are props
// so the rhythm can be tuned by feel.
//
// Reusable atom. It lives beside the evening journal and in the
// morning practice's closing breath; the same component serves
// any surface that needs quiet pacing.
//
// Tap the circle to still it; tap again to resume.
//
// Props:
//   inhale, hold, exhale, rest — seconds (default 4 / 2 / 6 / 2)
//   size      — circle diameter in px (default 128)
//   showWords — IN / OUT under the circle (default true)
//   caption   — line under the words (default "Breathe with me.")
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'

const GOLD_DK   = '#A8721A'
const GOLD      = '#C8922A'
const GOLD_FILL = 'rgba(200,146,42,0.10)'
const SC   = "'Cormorant SC', Georgia, serif"
const BODY = "'Lora', Georgia, serif"

let pacerInstance = 0

export default function BreathPacer({
  inhale = 4,
  hold = 2,
  exhale = 6,
  rest = 2,
  size = 128,
  showWords = true,
  caption = 'Breathe with me.',
}) {
  const [stilled, setStilled] = useState(false)
  // Unique animation names per instance so two pacers with
  // different timings can coexist on one page.
  const uid = useMemo(() => `bp${++pacerInstance}`, [])

  const total = inhale + hold + exhale + rest
  const pct = (s) => +((s / total) * 100).toFixed(2)

  const inEnd   = pct(inhale)                 // inhale completes
  const holdEnd = pct(inhale + hold)          // hold completes
  const outEnd  = pct(inhale + hold + exhale) // exhale completes
  const m = Math.min(2.5, pct(0.4))           // word crossfade margin

  const MIN = 0.5, MAX = 1.0

  const css = `
@keyframes ${uid}-circ {
  0% { transform: scale(${MIN}); }
  ${inEnd}% { transform: scale(${MAX}); }
  ${holdEnd}% { transform: scale(${MAX}); }
  ${outEnd}% { transform: scale(${MIN}); }
  100% { transform: scale(${MIN}); }
}
@keyframes ${uid}-in {
  0% { opacity: 1; }
  ${Math.max(0, inEnd - m * 1.5)}% { opacity: 1; }
  ${inEnd}% { opacity: 0; }
  100% { opacity: 0; }
}
@keyframes ${uid}-out {
  0% { opacity: 0; }
  ${holdEnd + m / 2}% { opacity: 0; }
  ${holdEnd + m * 2}% { opacity: 1; }
  ${outEnd - m}% { opacity: 1; }
  ${outEnd + m / 2}% { opacity: 0; }
  100% { opacity: 0; }
}
`

  const playState = stilled ? 'paused' : 'running'
  const wordBase = {
    position: 'absolute', left: 0, right: 0,
    fontFamily: SC, fontSize: '12px', letterSpacing: '0.22em',
    color: GOLD_DK, textAlign: 'center',
    animationDuration: `${total}s`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationPlayState: playState,
  }

  return (
    <div
      onClick={() => setStilled(s => !s)}
      role="button"
      aria-label={stilled ? 'Resume breath pacer' : 'Still breath pacer'}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
    >
      <style>{css}</style>

      <div style={{ position: 'relative', width: size + 28, height: size + 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: GOLD_FILL, border: `1.5px solid ${GOLD}`,
          animationName: `${uid}-circ`,
          animationDuration: `${total}s`,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationPlayState: playState,
          opacity: stilled ? 0.5 : 1,
          transition: 'opacity 0.4s ease',
        }} />
      </div>

      {showWords && (
        <div style={{ position: 'relative', height: '18px', width: '100%', marginTop: '14px' }}>
          <div style={{ opacity: stilled ? 0 : 1, transition: 'opacity 0.3s ease' }}>
            <span style={{ ...wordBase, animationName: `${uid}-in` }}>IN</span>
            <span style={{ ...wordBase, animationName: `${uid}-out`, opacity: 0 }}>OUT</span>
          </div>
          {stilled && (
            <span style={{
              position: 'absolute', left: 0, right: 0, top: 0,
              fontFamily: SC, fontSize: '11px', letterSpacing: '0.2em',
              color: 'rgba(15,21,35,0.55)', textAlign: 'center',
            }}>
              STILLED
            </span>
          )}
        </div>
      )}

      {caption && (
        <p style={{
          fontFamily: BODY, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
          margin: '10px 0 0', textAlign: 'center',
        }}>
          {caption}
        </p>
      )}
    </div>
  )
}
