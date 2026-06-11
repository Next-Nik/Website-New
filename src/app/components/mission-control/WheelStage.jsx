// ─────────────────────────────────────────────────────────────
// WheelStage.jsx
//
// The wheel sits at the centre of Mission Control. Pole-flip
// arrows now live in PoleHeader (centred above the wheel), and
// domain-stepping arrows live below the wheel as part of the
// civ-side composition. WheelStage is just a stage now — it
// renders whichever wheel is current, and crossfades between
// them.
//
// The civ-side wheel is interactive: it owns its own intro spin
// and bloom, but navigation state (which spoke is featured, which
// level we're at) is driven by props from the parent so the
// below-wheel info panel can stay in sync.
//
// ╭─────────────────────────────────────────────────────────╮
// │  EDIT KNOBS                                             │
// ╰─────────────────────────────────────────────────────────╯
//   WHEEL_DESKTOP_PX  — max wheel width on desktop.
//   WHEEL_MOBILE_PX   — same for phones (≤640px viewport).
// ─────────────────────────────────────────────────────────────

const WHEEL_DESKTOP_PX = 800
const WHEEL_MOBILE_PX  = 360

// ─────────────────────────────────────────────────────────────
// Props:
//   currentWheel:   'personal' | 'civ'
//   personalProps:  passed to MissionWheel kind="personal"
//   civProps:       passed to MissionWheel kind="civ"
// ─────────────────────────────────────────────────────────────

import MissionWheel from './MissionWheel'

export default function WheelStage({
  currentWheel = 'personal',
  personalProps,
  civProps,
}) {
  const isCiv = currentWheel === 'civ'

  return (
    <div className="mc-wheel-stage">
      <style>{WHEEL_STAGE_CSS}</style>

      <div className={`mc-wheel-frame ${!isCiv ? 'mc-active' : ''}`}>
        <div className="mc-wheel-svg">
          <MissionWheel kind="personal" dark={false} {...personalProps} />
        </div>
      </div>

      <div className={`mc-wheel-frame ${isCiv ? 'mc-active' : ''}`}>
        <div className="mc-wheel-svg">
          <MissionWheel kind="civ" dark={true} {...civProps} />
        </div>
      </div>
    </div>
  )
}

const WHEEL_STAGE_CSS = `
.mc-wheel-stage {
  position: relative;
  width: 100%;
  max-width: ${WHEEL_DESKTOP_PX}px;
  aspect-ratio: 1 / 1;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

/* Backing pool — lifts the wheel off the map substrate.
   Light stage: soft parchment pool with faint gold centre.
   Dark stage:  deep ink pool with warm gold centre glow. */
.mc-wheel-stage::before {
  content: '';
  position: absolute;
  inset: -12%;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}
[data-stage="light"] .mc-wheel-stage::before {
  background: radial-gradient(ellipse at center,
    rgba(200,146,42,0.07) 0%,
    rgba(250,250,247,0.88) 40%,
    transparent 72%
  );
}
[data-stage="dark"] .mc-wheel-stage::before {
  background: radial-gradient(ellipse at center,
    rgba(200,146,42,0.14) 0%,
    rgba(20,26,40,0.92) 40%,
    transparent 72%
  );
}

.mc-wheel-frame {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.65s ease, transform 0.65s ease;
  pointer-events: none;
}
/* The fractal zoom — the pole flip is one continuous camera move
   through scales. The personal wheel rests SMALL (your life, held
   inside the world); the civ wheel rests LARGE (the scale beyond
   the frame). Flipping self→planet reads as zooming out; planet→
   self as zooming back in. Same geometry, two altitudes. */
.mc-wheel-frame:first-of-type      { transform: scale(0.45); }  /* personal, inactive */
.mc-wheel-frame:last-of-type       { transform: scale(1.45); }  /* civ, inactive */
.mc-wheel-frame.mc-active {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}
@media (prefers-reduced-motion: reduce) {
  .mc-wheel-frame,
  .mc-wheel-frame:first-of-type,
  .mc-wheel-frame:last-of-type { transform: none; transition: opacity 0.4s ease; }
}

.mc-wheel-svg {
  width: 100%;
  height: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mc-wheel-svg > svg {
  touch-action: manipulation;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

@media (max-width: 640px) {
  .mc-wheel-stage {
    max-width: ${WHEEL_MOBILE_PX}px;
  }
}
`
