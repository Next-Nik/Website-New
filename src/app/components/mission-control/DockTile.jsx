// ─────────────────────────────────────────────────────────────
// DockTile.jsx
//
// A single tile in the bottom utility rail. v4 aesthetic: small
// label above, display-font name below, vertical separator from
// neighbours. Used for Profile, Purpose Piece, The Map, Settings.
//
// Props:
//   label:   string         — small uppercase eyebrow ("YOU", "PLACEMENT", "FOUNDATION", "SYSTEM")
//   name:    string         — display-font name ("Profile", "Purpose Piece", ...)
//   onClick: () => void
// ─────────────────────────────────────────────────────────────

import {
  GOLD_DK, GOLD_LT, GOLD_RULE, GOLD_HOVER,
  TEXT_INK, TEXT_WHITE,
  FONT_DISPLAY, FONT_SC,
} from './tokens'

export default function DockTile({ label, name, onClick }) {
  return (
    <div
      className="mc-utility"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <style>{DOCK_TILE_CSS}</style>
      {label && <div className="mc-utility-label">{label}</div>}
      {name && <div className="mc-utility-name">{name}</div>}
    </div>
  )
}

const DOCK_TILE_CSS = `
.mc-utility {
  flex: 0 1 auto;
  padding: 6px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border-right: 1px solid ${GOLD_RULE};
  min-width: 130px;
  user-select: none;
}
[data-stage="dark"] .mc-utility {
  border-right: 1px solid rgba(200, 146, 42, 0.20);
}
.mc-utility:last-child { border-right: none; }
.mc-utility:hover { background: ${GOLD_HOVER}; }
.mc-utility:focus-visible {
  outline: 2px solid ${GOLD_DK};
  outline-offset: -2px;
}

.mc-utility-label {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.2em;
  color: ${GOLD_DK};
  margin-bottom: 3px;
}
[data-stage="dark"] .mc-utility-label { color: ${GOLD_LT}; }

.mc-utility-name {
  font-family: ${FONT_DISPLAY};
  font-size: 16px;
  font-weight: 500;
  color: ${TEXT_INK};
  letter-spacing: -0.005em;
}
[data-stage="dark"] .mc-utility-name { color: ${TEXT_WHITE}; }

@media (max-width: 880px) {
  .mc-utility {
    min-width: auto;
    padding: 8px 12px;
  }
}
`
