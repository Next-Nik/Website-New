// ─────────────────────────────────────────────────────────────
// HorizonScene.jsx
//
// The cockpit centre. A horizon line across the surface with:
//   • Above the line: today's orientation (eyebrow + framing line)
//   • On the line: two BUILD buttons — YOUR LIFE and THE WORLD
//   • Below the line: user's name and "MISSION CONTROL" eyebrow
//
// Props:
//   aboveEyebrow:  string — small label above the framing line
//   aboveLine:     string — today's orientation, the framing copy
//   leftButton:    { label, context, onClick }
//   rightButton:   { label, context, onClick }
//   buildLabel:    string (default 'BUILD') — the label between the two buttons
//   userName:      string — user's name, displayed below the line
//   userMeta:      string — small meta line below user's name (e.g. archetype · domain · scale)
// ─────────────────────────────────────────────────────────────

import {
  GOLD, GOLD_DK, GOLD_RULE,
  FONT_SC, FONT_DISPLAY, FONT_BODY,
  TEXT_INK, TEXT_META,
} from './tokens'

/**
 * @typedef {Object} HorizonButton
 * @property {string} label
 * @property {string} [context]
 * @property {() => void} onClick
 */

/**
 * @param {Object} props
 * @param {string} [props.aboveEyebrow]
 * @param {string} [props.aboveLine]
 * @param {HorizonButton} props.leftButton
 * @param {HorizonButton} props.rightButton
 * @param {string} [props.buildLabel]
 * @param {string} [props.userName]
 * @param {string} [props.userMeta]
 */
export default function HorizonScene({
  aboveEyebrow,
  aboveLine,
  leftButton,
  rightButton,
  buildLabel = 'BUILD',
  userName,
  userMeta,
}) {
  return (
    <div className="mc-horizon-scene">
      <style>{HORIZON_CSS}</style>

      <div className="mc-horizon-above">
        {aboveEyebrow && <div className="mc-horizon-eyebrow">{aboveEyebrow}</div>}
        {aboveLine && <div className="mc-horizon-orientation">{aboveLine}</div>}
      </div>

      <div className="mc-horizon-line-row">
        {leftButton && (
          <button className="mc-horizon-build-btn mc-build-left" onClick={leftButton.onClick}>
            <span className="mc-build-context">{leftButton.context}</span>
            <span className="mc-build-label">{leftButton.label}</span>
          </button>
        )}
        <div className="mc-horizon-line-wrapper">
          <div className="mc-horizon-line" aria-hidden="true" />
          <div className="mc-horizon-build-marker">{buildLabel}</div>
        </div>
        {rightButton && (
          <button className="mc-horizon-build-btn mc-build-right" onClick={rightButton.onClick}>
            <span className="mc-build-context">{rightButton.context}</span>
            <span className="mc-build-label">{rightButton.label}</span>
          </button>
        )}
      </div>

      <div className="mc-horizon-below">
        <div className="mc-horizon-mc-eyebrow">Mission Control</div>
        {userName && <div className="mc-horizon-username">{userName}</div>}
        {userMeta && <div className="mc-horizon-usermeta">{userMeta}</div>}
      </div>
    </div>
  )
}

const HORIZON_CSS = `
.mc-horizon-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
}

.mc-horizon-above {
  margin-bottom: 36px;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}
.mc-horizon-eyebrow {
  font-family: ${FONT_SC};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: ${GOLD_DK};
  text-transform: uppercase;
  margin-bottom: 12px;
}
.mc-horizon-orientation {
  font-family: ${FONT_DISPLAY};
  font-size: 26px;
  font-weight: 300;
  line-height: 1.35;
  color: ${TEXT_INK};
  max-width: 680px;
}

.mc-horizon-line-row {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  margin: 18px 0;
  gap: 16px;
}

.mc-horizon-build-btn {
  background: transparent;
  border: 1px solid ${GOLD_RULE};
  border-radius: 12px;
  padding: 12px 18px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  transition: border-color 0.18s, background 0.18s, transform 0.18s;
  flex-shrink: 0;
  min-width: 140px;
}
.mc-horizon-build-btn:hover {
  border-color: ${GOLD};
  background: rgba(200,146,42,0.05);
  transform: translateY(-1px);
}
.mc-build-context {
  font-family: ${FONT_SC};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: ${GOLD_DK};
  text-transform: uppercase;
}
.mc-build-label {
  font-family: ${FONT_DISPLAY};
  font-size: 22px;
  font-weight: 300;
  color: ${TEXT_INK};
  line-height: 1.1;
}
.mc-build-right { align-items: flex-end; text-align: right; }

.mc-horizon-line-wrapper {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
}
.mc-horizon-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(to right, transparent 0%, ${GOLD_RULE} 14%, ${GOLD} 50%, ${GOLD_RULE} 86%, transparent 100%);
}
.mc-horizon-build-marker {
  position: relative;
  background: ${GOLD};
  color: white;
  font-family: ${FONT_SC};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  padding: 4px 12px;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(200,146,42,0.20);
}

.mc-horizon-below {
  margin-top: 32px;
}
.mc-horizon-mc-eyebrow {
  font-family: ${FONT_SC};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.24em;
  color: ${GOLD_DK};
  text-transform: uppercase;
  margin-bottom: 10px;
}
.mc-horizon-username {
  font-family: ${FONT_DISPLAY};
  font-size: 44px;
  font-weight: 300;
  line-height: 1.1;
  color: ${TEXT_INK};
  margin-bottom: 6px;
}
.mc-horizon-usermeta {
  font-family: ${FONT_BODY};
  font-size: 14px;
  font-weight: 400;
  color: ${TEXT_META};
  letter-spacing: 0.04em;
}

@media (max-width: 720px) {
  .mc-horizon-line-row { flex-direction: column; gap: 8px; }
  .mc-horizon-build-btn { width: 100%; align-items: center; min-width: 0; }
  .mc-build-right { align-items: center; text-align: center; }
  .mc-horizon-line-wrapper { width: 100%; height: 28px; }
  .mc-horizon-orientation { font-size: 20px; }
  .mc-horizon-username { font-size: 34px; }
}
`
