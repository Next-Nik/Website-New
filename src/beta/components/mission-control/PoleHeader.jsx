// ─────────────────────────────────────────────────────────────
// PoleHeader.jsx
//
// "Your Life" on the left, "The Planet" on the right. The pole
// labels sit above the rails. Tapping "The Planet" flips the
// stage to dark; tapping "Your Life" flips it back. Visually
// active pole is gold-emphasised.
//
// This replaces the switcher pill at the bottom of the wheel.
// The choice is now visible at the top where users can see it.
//
// Note on the right label: "The Planet" matches the wording in
// the platform's locked vocabulary. Two-pole frame, two simple
// names, no slogan.
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
  return (
    <div className="mc-poles">
      <style>{POLES_CSS}</style>

      <button
        type="button"
        className={`mc-pole mc-pole-self ${active === 'self' ? 'mc-pole-active' : ''}`}
        onClick={onSelectSelf}
      >
        Your Life
      </button>

      <button
        type="button"
        className={`mc-pole mc-pole-civ ${active === 'civ' ? 'mc-pole-active' : ''}`}
        onClick={onSelectCiv}
      >
        The Planet
      </button>
    </div>
  )
}

const POLES_CSS = `
.mc-poles {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  padding: 14px 28px 10px;
  border-bottom: 1px solid ${GOLD_RULE};
}
[data-stage="dark"] .mc-poles {
  border-bottom: 1px solid rgba(200, 146, 42, 0.20);
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
}
[data-stage="dark"] .mc-pole { color: ${TEXT_WHITE_META}; }

.mc-pole-self  { text-align: left; }
.mc-pole-civ   { text-align: right; }

.mc-pole:hover { color: ${GOLD_DK}; }
[data-stage="dark"] .mc-pole:hover { color: ${GOLD}; }

.mc-pole-active {
  color: ${TEXT_INK};
}
[data-stage="dark"] .mc-pole-active {
  color: ${TEXT_WHITE};
}

/* The active pole gets a thin gold underline */
.mc-pole-active::after {
  content: '';
  display: block;
  height: 2px;
  background: ${GOLD};
  margin-top: 6px;
  width: 40px;
}
.mc-pole-civ.mc-pole-active::after {
  margin-left: auto;
}

@media (max-width: 640px) {
  .mc-poles {
    padding: 10px 20px 8px;
  }
  .mc-pole {
    font-size: 17px;
  }
  .mc-pole-active::after {
    width: 28px;
    margin-top: 4px;
  }
}
`
