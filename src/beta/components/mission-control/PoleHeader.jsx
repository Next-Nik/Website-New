// ─────────────────────────────────────────────────────────────
// PoleHeader.jsx
//
// Centred two-pole header. Reads:
//
//     ‹  Your Life | The Planet  ›
//
// "Your Life" and "The Planet" sit centre-stage, separated by a
// thin gold vertical rule. Flanking arrows ‹ › are the pole
// switcher — left arrow flips to Self, right arrow flips to Civ.
// Tapping either label also flips. Active pole gets a thin gold
// underline.
//
// The arrows that step through domains within a wheel live BELOW
// the wheel — they are NOT here. This header only handles the
// pole flip.
//
// Props:
//   active:           'self' | 'civ'
//   onSelectSelf:     () => void
//   onSelectCiv:      () => void
// ─────────────────────────────────────────────────────────────

import {
  GOLD, GOLD_DK, GOLD_RULE,
  TEXT_INK, TEXT_WHITE, TEXT_META, TEXT_WHITE_META,
  FONT_DISPLAY,
} from './tokens'

export default function PoleHeader({
  active,
  onSelectSelf,
  onSelectCiv,
}) {
  const isSelf = active === 'self'
  const isCiv  = active === 'civ'

  return (
    <div className="mc-poles">
      <style>{POLES_CSS}</style>

      <div className="mc-poles-inner">
        <button
          type="button"
          className="mc-pole-arrow mc-pole-arrow-left"
          onClick={onSelectSelf}
          aria-label="Switch to Your Life"
          disabled={isSelf}
        >
          ‹
        </button>

        <button
          type="button"
          className={`mc-pole mc-pole-self ${isSelf ? 'mc-pole-active' : ''}`}
          onClick={onSelectSelf}
        >
          Your Life
        </button>

        <span className="mc-pole-divider" aria-hidden="true" />

        <button
          type="button"
          className={`mc-pole mc-pole-civ ${isCiv ? 'mc-pole-active' : ''}`}
          onClick={onSelectCiv}
        >
          The Planet
        </button>

        <button
          type="button"
          className="mc-pole-arrow mc-pole-arrow-right"
          onClick={onSelectCiv}
          aria-label="Switch to The Planet"
          disabled={isCiv}
        >
          ›
        </button>
      </div>
    </div>
  )
}

const POLES_CSS = `
.mc-poles {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 14px 28px 10px;
  border-bottom: 1px solid ${GOLD_RULE};
}
[data-stage="dark"] .mc-poles {
  border-bottom: 1px solid rgba(200, 146, 42, 0.20);
}

.mc-poles-inner {
  display: inline-flex;
  align-items: center;
  gap: 14px;
}

.mc-pole {
  background: transparent;
  border: none;
  padding: 4px 0;
  font-family: ${FONT_DISPLAY};
  font-size: 22px;
  font-weight: 500;
  cursor: pointer;
  color: ${TEXT_META};
  transition: color 0.2s ease;
  letter-spacing: -0.005em;
  line-height: 1.2;
  position: relative;
}
[data-stage="dark"] .mc-pole { color: ${TEXT_WHITE_META}; }

.mc-pole-self  { text-align: right; }
.mc-pole-civ   { text-align: left; }

.mc-pole:hover { color: ${GOLD_DK}; }
[data-stage="dark"] .mc-pole:hover { color: ${GOLD}; }

.mc-pole-active { color: ${TEXT_INK}; }
[data-stage="dark"] .mc-pole-active { color: ${TEXT_WHITE}; }

/* The active pole gets a thin gold underline, centred under the label */
.mc-pole-active::after {
  content: '';
  display: block;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: -4px;
  height: 2px;
  background: ${GOLD};
  width: 40px;
}

.mc-pole-divider {
  display: inline-block;
  width: 1px;
  height: 18px;
  background: ${GOLD_RULE};
}
[data-stage="dark"] .mc-pole-divider {
  background: rgba(200, 146, 42, 0.30);
}

.mc-pole-arrow {
  background: transparent;
  border: 1px solid ${GOLD_RULE};
  color: ${GOLD_DK};
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-family: serif;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.55;
  padding: 0;
}
.mc-pole-arrow:hover:not(:disabled) {
  background: rgba(200, 146, 42, 0.06);
  border-color: ${GOLD};
  opacity: 1;
}
.mc-pole-arrow:disabled {
  cursor: default;
  opacity: 0.18;
}
[data-stage="dark"] .mc-pole-arrow {
  border-color: rgba(200, 146, 42, 0.30);
  color: #D4A744;
}
[data-stage="dark"] .mc-pole-arrow:hover:not(:disabled) {
  background: rgba(200, 146, 42, 0.10);
  border-color: ${GOLD};
}

@media (max-width: 640px) {
  .mc-poles {
    padding: 10px 20px 8px;
  }
  .mc-poles-inner {
    gap: 10px;
  }
  .mc-pole {
    font-size: 17px;
  }
  .mc-pole-active::after {
    width: 28px;
    bottom: -3px;
  }
  .mc-pole-arrow {
    width: 22px;
    height: 22px;
    font-size: 14px;
  }
  .mc-pole-divider {
    height: 14px;
  }
}
`
