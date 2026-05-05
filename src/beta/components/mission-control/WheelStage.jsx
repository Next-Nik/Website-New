// ─────────────────────────────────────────────────────────────
// WheelStage.jsx
//
// The v4 centre stage. Replaces v3's HorizonScene line-and-buttons.
// The wheel IS the cockpit — users steer between Your Life and The
// Planet inside it. Switching to The Planet flips the whole stage
// to dark via the parent's data-stage="dark" attribute on body.
//
// Renders:
//   • The currently-active wheel frame (personal or civ) with its title
//   • Side arrows that flip between the two
//   • A bottom switcher pill with both labels
//
// The dark-mode flip is handled by the parent BetaMissionControl,
// which sets the stage background based on currentWheel.
//
// Props:
//   currentWheel:   'personal' | 'civ'
//   onSwitchWheel:  (next: 'personal' | 'civ') => void
//   personalProps:  props passed straight through to <MissionWheel kind="personal">
//   civProps:       props passed straight through to <MissionWheel kind="civ">
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import MissionWheel from './MissionWheel'
import {
  GOLD, GOLD_DK, GOLD_RULE,
  BG_CARD, BG_INK_SOFT,
  TEXT_INK, TEXT_WHITE, TEXT_META, TEXT_WHITE_META,
  FONT_DISPLAY, FONT_SC,
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
        <div className="mc-wheel-title">Your Life</div>
        <div className="mc-wheel-svg">
          <MissionWheel kind="personal" dark={false} {...personalProps} />
        </div>
      </div>

      <div className={`mc-wheel-frame ${isCiv ? 'mc-active' : ''}`}>
        <div className="mc-wheel-title mc-wheel-title-dark">The Planet</div>
        <div className="mc-wheel-svg">
          <MissionWheel kind="civ" dark={true} {...civProps} />
        </div>
      </div>

      <div className="mc-wheel-switcher">
        <button
          className={`mc-switcher-btn ${!isCiv ? 'mc-active' : ''}`}
          onClick={() => onSwitchWheel('personal')}
        >
          YOUR LIFE
        </button>
        <button
          className={`mc-switcher-btn ${isCiv ? 'mc-active' : ''}`}
          onClick={() => onSwitchWheel('civ')}
        >
          THE PLANET
        </button>
      </div>
    </div>
  )
}

const WHEEL_STAGE_CSS = `
.mc-wheel-stage {
  position: relative;
  width: 100%;
  max-width: 460px;
  min-height: 380px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mc-wheel-frame {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
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

.mc-wheel-title {
  font-family: ${FONT_DISPLAY};
  font-size: 30px;
  font-weight: 500;
  color: ${TEXT_INK};
  letter-spacing: -0.01em;
  text-align: center;
  margin-bottom: 16px;
}
.mc-wheel-title-dark { color: ${TEXT_WHITE}; }

.mc-wheel-svg {
  margin: 0 auto;
}

.mc-wheel-switcher {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  background: ${BG_CARD};
  border: 1px solid ${GOLD_RULE};
  padding: 4px;
  z-index: 10;
}
[data-stage="dark"] .mc-wheel-switcher {
  background: ${BG_INK_SOFT};
  border: 1px solid rgba(200, 146, 42, 0.30);
}

.mc-switcher-btn {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.2em;
  padding: 8px 20px;
  border: none;
  background: transparent;
  color: ${TEXT_META};
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}
[data-stage="dark"] .mc-switcher-btn { color: ${TEXT_WHITE_META}; }
.mc-switcher-btn:hover { color: ${TEXT_INK}; }
[data-stage="dark"] .mc-switcher-btn:hover { color: ${TEXT_WHITE}; }
.mc-switcher-btn.mc-active {
  background: ${GOLD_DK};
  color: ${TEXT_WHITE};
}

.mc-scene-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  background: ${BG_CARD};
  border: 1px solid ${GOLD_RULE};
  color: ${GOLD_DK};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease;
  z-index: 5;
}
[data-stage="dark"] .mc-scene-arrow {
  background: ${BG_INK_SOFT};
  border: 1px solid rgba(200, 146, 42, 0.30);
  color: #D4A744;
}
.mc-scene-arrow:hover {
  background: rgba(200,146,42,0.05);
  border-color: ${GOLD};
}
.mc-scene-arrow-left { left: 12px; }
.mc-scene-arrow-right { right: 12px; }

@media (max-width: 880px) {
  .mc-wheel-stage { min-height: 320px; }
  .mc-scene-arrow-left { left: 4px; }
  .mc-scene-arrow-right { right: 4px; }
}
`
