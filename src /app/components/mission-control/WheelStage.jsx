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

.mc-wheel-frame {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.96);
  transition: opacity 0.5s ease, transform 0.5s ease;
  pointer-events: none;
}
.mc-wheel-frame.mc-active {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
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
