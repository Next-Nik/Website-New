// ─────────────────────────────────────────────────────────────
// Tile.jsx
//
// Single rail icon. Used inside SideRail on both left (personal)
// and right (planet) rails. Renders glyph + label + state. The
// state line takes a sentinel "—" when there's nothing meaningful
// to surface yet, matching the v4 mockup's empty-rail aesthetic.
//
// On desktop (>1024px), the tile is a vertical column 56px wide.
// Below 1024px, the rail collapses to a horizontal strip and the
// tiles become inline rows with the glyph beside the label.
//
// Props:
//   glyph:    string         — the unicode/short symbol shown at top
//   label:    string | node  — main label, two lines OK (use <br/> if needed)
//   state:    string         — small state line ("UNTOUCHED", "D 12 / 90", "—", etc.)
//   pulse:    boolean        — if true, glyph pulses (used for an unattended-today HS)
//   onClick:  () => void
//   title:    string         — hover/aria title
// ─────────────────────────────────────────────────────────────

import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE,
  BG_CARD, BG_INK_SOFT,
  TEXT_META, TEXT_WHITE_META, TEXT_FAINT, TEXT_WHITE_FAINT,
  FONT_DISPLAY, FONT_SC,
} from './tokens'

export default function Tile({
  glyph,
  label,
  state,
  pulse = false,
  onClick,
  title,
}) {
  return (
    <div
      className={`mc-rail-icon ${pulse ? 'mc-pulse' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={title}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <style>{TILE_CSS}</style>
      <div className="mc-rail-glyph">{glyph}</div>
      <div className="mc-rail-label">{label}</div>
      {state && <div className="mc-rail-state">{state}</div>}
    </div>
  )
}

const TILE_CSS = `
.mc-rail-icon {
  width: 56px;
  background: ${BG_CARD};
  border: 1px solid ${GOLD_RULE};
  padding: 10px 6px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  user-select: none;
}
[data-stage="dark"] .mc-rail-icon {
  background: ${BG_INK_SOFT};
  border: 1px solid rgba(200, 146, 42, 0.30);
}
.mc-rail-icon:hover {
  background: rgba(200, 146, 42, 0.05);
  border-color: ${GOLD};
}
[data-stage="dark"] .mc-rail-icon:hover {
  background: rgba(200, 146, 42, 0.10);
}
.mc-rail-icon:focus-visible {
  outline: 2px solid ${GOLD};
  outline-offset: 2px;
}

.mc-rail-glyph {
  font-family: ${FONT_DISPLAY};
  font-size: 22px;
  color: ${GOLD_DK};
  line-height: 1;
  margin-bottom: 5px;
}
[data-stage="dark"] .mc-rail-glyph { color: ${GOLD_LT}; }

.mc-rail-label {
  font-family: ${FONT_SC};
  font-size: 8.5px;
  letter-spacing: 0.14em;
  color: ${TEXT_META};
  line-height: 1.2;
}
[data-stage="dark"] .mc-rail-label { color: ${TEXT_WHITE_META}; }

.mc-rail-state {
  font-family: ${FONT_SC};
  font-size: 7.5px;
  letter-spacing: 0.12em;
  color: ${TEXT_FAINT};
  margin-top: 2px;
}
[data-stage="dark"] .mc-rail-state { color: ${TEXT_WHITE_FAINT}; }

.mc-rail-icon.mc-pulse .mc-rail-glyph {
  animation: mcIconPulse 2.5s ease-in-out infinite;
}
@keyframes mcIconPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.6; transform: scale(1.08); }
}

@media (max-width: 1280px) {
  .mc-rail-icon { width: 50px; padding: 8px 4px 6px; }
  .mc-rail-glyph { font-size: 18px; margin-bottom: 4px; }
  .mc-rail-label { font-size: 8px; letter-spacing: 0.12em; }
  .mc-rail-state { font-size: 7px; }
}

@media (max-width: 1024px) {
  .mc-rail-icon {
    width: auto;
    min-width: 90px;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
  }
  .mc-rail-glyph { font-size: 16px; margin-bottom: 0; }
  .mc-rail-label { font-size: 9px; }
  .mc-rail-state { font-size: 8px; margin-top: 1px; }
}
`
