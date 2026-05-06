// ─────────────────────────────────────────────────────────────
// Tile.jsx
//
// Single rail icon. Used inside SideRail on both left (personal)
// and right (planet) rails. Renders glyph + label. State line
// only appears when there's actual state to report — no more
// empty sentinels like "—" or "NONE".
//
// Layout: vertical column, glyph on top, label below, optional
// state line at bottom. Width adapts to viewport.
//
// Props:
//   glyph:    string|node  — unicode/svg/component shown at top
//   label:    string|node  — main label, two lines OK (use <br/>)
//   state:    string|null  — small state line; falsy → no line
//   active:   boolean      — visually emphasises this tile
//   onClick:  () => void
//   title:    string       — hover/aria title
// ─────────────────────────────────────────────────────────────

import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE,
  BG_CARD, BG_INK_SOFT,
  TEXT_META, TEXT_WHITE_META, TEXT_FAINT, TEXT_WHITE_FAINT,
  FONT_DISPLAY, FONT_SC,
} from './tokens'

// Treat these strings as "no real state to report" — same posture
// as null/undefined. A holdover until all callers stop passing them.
const EMPTY_SENTINELS = new Set(['—', '-', 'NONE', 'EMPTY', 'UNAUDITED', 'UNTOUCHED', 'NO FIT YET'])

function isMeaningfulState(s) {
  if (!s) return false
  if (typeof s !== 'string') return true
  return !EMPTY_SENTINELS.has(s.trim().toUpperCase())
}

export default function Tile({
  glyph,
  label,
  state,
  active = false,
  onClick,
  title,
}) {
  const showState = isMeaningfulState(state)
  return (
    <div
      className={`mc-rail-icon ${active ? 'mc-rail-active' : ''}`}
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
      {showState && <div className="mc-rail-state">{state}</div>}
    </div>
  )
}

const TILE_CSS = `
.mc-rail-icon {
  width: 100%;
  background: ${BG_CARD};
  border: 1px solid ${GOLD_RULE};
  padding: 10px 6px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
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
.mc-rail-icon.mc-rail-active {
  border-color: ${GOLD};
  background: rgba(200, 146, 42, 0.08);
}

.mc-rail-glyph {
  font-family: ${FONT_DISPLAY};
  font-size: 24px;
  color: ${GOLD_DK};
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
}
[data-stage="dark"] .mc-rail-glyph { color: ${GOLD_LT}; }

.mc-rail-label {
  font-family: ${FONT_SC};
  font-size: 9px;
  letter-spacing: 0.14em;
  color: ${TEXT_META};
  line-height: 1.2;
  text-transform: uppercase;
}
[data-stage="dark"] .mc-rail-label { color: ${TEXT_WHITE_META}; }

.mc-rail-state {
  font-family: ${FONT_SC};
  font-size: 8px;
  letter-spacing: 0.10em;
  color: ${TEXT_FAINT};
}
[data-stage="dark"] .mc-rail-state { color: ${TEXT_WHITE_FAINT}; }

/* On larger screens, tiles get more breathing room and labels can
   sit on a single line where they fit. */
@media (min-width: 1024px) {
  .mc-rail-icon {
    padding: 12px 8px 10px;
    gap: 5px;
  }
  .mc-rail-glyph {
    font-size: 26px;
    min-height: 32px;
  }
  .mc-rail-label {
    font-size: 9.5px;
  }
}

@media (max-width: 640px) {
  .mc-rail-icon {
    padding: 8px 4px 6px;
    gap: 3px;
  }
  .mc-rail-glyph {
    font-size: 20px;
    min-height: 22px;
  }
  .mc-rail-label {
    font-size: 8px;
    letter-spacing: 0.10em;
  }
  .mc-rail-state {
    font-size: 7px;
    letter-spacing: 0.08em;
  }
}
`
