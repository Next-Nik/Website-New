// ─────────────────────────────────────────────────────────────
// WheelStage.jsx — Drop 1 frame version
//
// The wheel sits at the centre of Mission Control. The two-pole
// frame above it (PoleHeader) is now the explicit toggle, so the
// switcher pill is gone. The wheel-title is also gone — the user
// already knows which side they're on from the PoleHeader.
//
// Side arrows still flip between Self and Civ wheels as a
// secondary control. They sit small in the negative space at the
// edge of the wheel area, semi-transparent so the substrate map
// stays the dominant visual.
//
// Drop 2 will replace these arrows with featured-node interaction
// (tap a node to feature it; arrows step through nodes within
// the same wheel) plus the polygon redraw as nodes feature.
// For now: the arrows still flip pole, matching current behaviour.
//
// Props:
//   currentWheel:   'personal' | 'civ'
//   onSwitchWheel:  (next) => void
//   personalProps:  passed straight to MissionWheel kind="personal"
//   civProps:       passed straight to MissionWheel kind="civ"
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import MissionWheel from './MissionWheel'
import {
  GOLD, GOLD_DK, GOLD_RULE,
} from './tokens'

export default function WheelStage({
  currentWheel = 'personal',
  onSwitchWheel,
  personalProps,
  civProps,
}) {
  const isCiv = currentWheel === 'civ'

  // Keyboard arrows toggle the wheel
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        onSwitchWheel(isCiv ? 'personal' : 'civ')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isCiv, onSwitchWheel])

  const handleSwitch = () => onSwitchWheel(isCiv ? 'personal' : 'civ')

  return (
    <div className="mc-wheel-stage">
      <style>{WHEEL_STAGE_CSS}</style>

      <button
        className="mc-scene-arrow mc-scene-arrow-left"
        onClick={handleSwitch}
        aria-label="Switch wheel"
      >
        ‹
      </button>
      <button
        className="mc-scene-arrow mc-scene-arrow-right"
        onClick={handleSwitch}
        aria-label="Switch wheel"
      >
        ›
      </button>

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
  max-width: 480px;
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
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mc-scene-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid ${GOLD_RULE};
  color: ${GOLD_DK};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-family: serif;
  line-height: 1;
  transition: all 0.2s ease;
  z-index: 6;
  opacity: 0.6;
}
[data-stage="dark"] .mc-scene-arrow {
  border: 1px solid rgba(200, 146, 42, 0.30);
  color: #D4A744;
}
.mc-scene-arrow:hover {
  background: rgba(200,146,42,0.06);
  border-color: ${GOLD};
  opacity: 1;
}
.mc-scene-arrow-left  { left: -8px; }
.mc-scene-arrow-right { right: -8px; }

@media (max-width: 640px) {
  .mc-wheel-stage {
    max-width: 320px;
  }
  .mc-scene-arrow {
    width: 24px;
    height: 24px;
    font-size: 16px;
  }
  .mc-scene-arrow-left  { left: -12px; }
  .mc-scene-arrow-right { right: -12px; }
}
`
