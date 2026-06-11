// ─────────────────────────────────────────────────────────────
// BreathPacer.jsx
//
// The breathing flame. A visual breath pacer: the flame grows
// for the inhale, a ring appears and holds for the post-inhale
// beat, the flame settles for the (longer) exhale, then a quiet
// rest beat before the cycle repeats. Phase words — IN, HOLD,
// OUT, REST — stay synced beneath it so nobody guesses which
// side of the breath they're on.
//
// Canonical timing (locked June 2026): 4 in · 2 hold · 8 out ·
// 3 rest. Seventeen seconds a cycle, ~3.5 breaths a minute —
// extended-exhale regulation for evening journalling. All four
// durations are props so the rhythm can be tuned by feel.
//
// Reusable atom. Tonight it lives beside the evening journal;
// the same component serves any future surface that needs quiet
// pacing (Phone Booth Moment, pre-threshold prep).
//
// Tap the flame to still it; tap again to resume.
//
// Props:
//   inhale, hold, exhale, rest — seconds (default 4 / 2 / 8 / 3)
//   size      — flame box in px (default 72)
//   showWords — phase words under the flame (default true)
//   caption   — line under the words (default "Breathe with me.")
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'

const GOLD_DK = '#A8721A'
const GOLD    = '#C8922A'
const FLAME   = '#E8901A'
const SC      = "'Cormorant SC', Georgia, serif"
const BODY    = "'Lora', Georgia, serif"

let pacerInstance = 0

export default function BreathPacer({
  inhale = 4,
  hold = 2,
  exhale = 8,
  rest = 3,
  size = 72,
  showWords = true,
  caption = 'Breathe with me.',
}) {
  const [stilled, setStilled] = useState(false)
  // Unique animation names per instance so two pacers with
  // different timings can coexist on one page.
  const uid = useMemo(() => `bp${++pacerInstance}`, [])

  const total = inhale + hold + exhale + rest
  const pct = (s) => +((s / total) * 100).toFixed(2)

  // Phase boundaries as percentages of the cycle
  const inEnd   = pct(inhale)                    // inhale completes
  const holdEnd = pct(inhale + hold)             // hold completes
  const outEnd  = pct(inhale + hold + exhale)    // exhale completes

  // Small fade margin for word crossfades (in % of cycle)
  const m = Math.min(2.5, pct(0.4))

  const css = `
@keyframes ${uid}-flame {
  0% { transform: scale(0.7); }
  ${inEnd}% { transform: scale(1.32); }
  ${holdEnd}% { transform: scale(1.32); }
  ${outEnd}% { transform: scale(0.7); }
  100% { transform: scale(0.7); }
}
@keyframes ${uid}-ring {
  0% { opacity: 0; transform: scale(0.92); }
  ${Math.max(0, inEnd - m)}% { opacity: 0; transform: scale(0.92); }
  ${inEnd + m / 2}% { opacity: 1; transform: scale(1); }
  ${holdEnd - m / 2}% { opacity: 1; transform: scale(1); }
  ${holdEnd + m}% { opacity: 0; transform: scale(1.05); }
  100% { opacity: 0; }
}
@keyframes ${uid}-in {
  0% { opacity: 1; }
  ${Math.max(0, inEnd - m * 1.5)}% { opacity: 1; }
  ${inEnd}% { opacity: 0; }
  100% { opacity: 0; }
}
@keyframes ${uid}-hold {
  0% { opacity: 0; }
  ${inEnd}% { opacity: 0; }
  ${inEnd + m}% { opacity: 1; }
  ${holdEnd - m / 2}% { opacity: 1; }
  ${holdEnd + m}% { opacity: 0; }
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
@keyframes ${uid}-rest {
  0% { opacity: 0; }
  ${outEnd}% { opacity: 0; }
  ${outEnd + m}% { opacity: 0.45; }
  ${Math.min(98, 100 - m)}% { opacity: 0.45; }
  100% { opacity: 0; }
}
`

  const animState = stilled ? 'paused' : 'running'
  const wordStyle = {
    position: 'absolute', left: 0, right: 0,
    fontFamily: SC, fontSize: '12px', letterSpacing: '0.22em',
    color: GOLD_DK, textAlign: 'center',
    animationDuration: `${total}s`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationPlayState: animState,
  }

  return (
    <div
      onClick={() => setStilled(s => !s)}
      role="button"
      aria-label={stilled ? 'Resume breath pacer' : 'Still breath pacer'}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
    >
      <style>{css}</style>

      <div style={{ position: 'relative', width: size + 36, height: size + 36 }}>
        {/* Hold ring */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `1.5px solid ${GOLD}`,
          opacity: 0,
          animationName: `${uid}-ring`,
          animationDuration: `${total}s`,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationPlayState: animState,
        }} />
        {/* Breathing flame */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            animationName: `${uid}-flame`,
            animationDuration: `${total}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationPlayState: animState,
            opacity: stilled ? 0.45 : 1,
            transition: 'opacity 0.4s ease',
          }}>
            <svg width={size * 0.62} height={size * 0.78} viewBox="0 0 32 40" aria-hidden="true">
              <path
                d="M16 2 C16 2 27 13 27 24 C27 31.2 22.1 37 16 37 C9.9 37 5 31.2 5 24 C5 16.5 11 10.5 13.2 6.5 C14.3 4.5 16 2 16 2 Z"
                fill={FLAME} opacity="0.92"
              />
              <path
                d="M16 14 C16 14 21.5 19.5 21.5 25.5 C21.5 29.6 19 32.6 16 32.6 C13 32.6 10.5 29.6 10.5 25.5 C10.5 21.5 14 17.8 16 14 Z"
                fill="#F8C868" opacity="0.9"
              />
            </svg>
          </div>
        </div>
      </div>

      {showWords && (
        <div style={{ position: 'relative', height: '18px', width: '100%', marginTop: '8px' }}>
          <div style={{ opacity: stilled ? 0 : 1, transition: 'opacity 0.3s ease' }}>
            <span style={{ ...wordStyle, animationName: `${uid}-in` }}>IN</span>
            <span style={{ ...wordStyle, animationName: `${uid}-hold`, opacity: 0 }}>HOLD</span>
            <span style={{ ...wordStyle, animationName: `${uid}-out`,  opacity: 0 }}>OUT</span>
            <span style={{ ...wordStyle, animationName: `${uid}-rest`, opacity: 0 }}>REST</span>
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
          margin: '6px 0 0', textAlign: 'center',
        }}>
          {caption}
        </p>
      )}
    </div>
  )
}
