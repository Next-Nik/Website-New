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
// When dismissible is true, a small "×" affordance appears in
// the top-right of the tile on hover/focus. Clicking it calls
// onDismiss(); the parent is responsible for persisting state
// and re-rendering without this tile. The × does not propagate
// to the tile's onClick. This is the pin/unpin mechanic — a
// dismissed tile leaves the rail but remains accessible from
// the Journal's "You" lens.
//
// Props:
//   glyph:        string|node  — unicode/svg/component shown at top
//   label:        string|node  — main label, two lines OK (use <br/>)
//   state:        string|null  — small state line; falsy → no line
//   active:       boolean      — visually emphasises this tile
//   onClick:      () => void
//   title:        string       — hover/aria title
//   dismissible:  boolean      — show × affordance on hover
//   onDismiss:    () => void   — called when × tapped
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
  dismissible = false,
  onDismiss,
}) {
  const showState = isMeaningfulState(state)
  return (
    <div
      className={`mc-rail-icon ${active ? 'mc-rail-active' : ''} ${dismissible ? 'mc-rail-dismissible' : ''}`}
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
      {dismissible && (
        <button
          type="button"
          className="mc-rail-dismiss"
          aria-label={`Hide ${typeof title === 'string' ? title : 'this tile'} from rail`}
          title="Hide from rail. Stays accessible in your Journal."
          onClick={(e) => {
            e.stopPropagation()
            onDismiss?.()
          }}
          onKeyDown={(e) => {
            // Don't let Enter/Space on the × also trigger the tile's onClick
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation()
              e.preventDefault()
              onDismiss?.()
            }
          }}
        >
          ×
        </button>
      )}
      <div className="mc-rail-glyph">{glyph}</div>
      <div className="mc-rail-label">{label}</div>
      {showState && <div className="mc-rail-state">{state}</div>}
    </div>
  )
}

const TILE_CSS = `
.mc-rail-icon {
  width: 100%;
  /* Light stage: dark tile, lit from above — physical button feel */
  background: linear-gradient(180deg, #2A3245 0%, #1A2030 60%, #0F1523 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    0 6px 16px rgba(15, 21, 35, 0.45),
    0 2px 4px rgba(15, 21, 35, 0.30);
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
  /* Dark stage: light parchment tile floating off the surface */
  background: linear-gradient(180deg, #FAFAF7 0%, #F0EFE8 60%, #E8E6DC 100%);
  border: 1px solid rgba(255, 255, 255, 0.70);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.90),
    0 6px 20px rgba(0, 0, 0, 0.55),
    0 2px 6px rgba(0, 0, 0, 0.35);
}
.mc-rail-icon:hover {
  background: linear-gradient(180deg, #3A4255 0%, #2A3245 60%, #1A2030 100%);
  border-color: ${GOLD};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    0 6px 16px rgba(200, 146, 42, 0.20),
    0 2px 4px rgba(15, 21, 35, 0.30);
}
[data-stage="dark"] .mc-rail-icon:hover {
  background: linear-gradient(180deg, #FFFFFF 0%, #FAFAF7 60%, #F0EFE8 100%);
  border-color: ${GOLD};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 1),
    0 8px 24px rgba(0, 0, 0, 0.60),
    0 2px 6px rgba(0, 0, 0, 0.35);
}
.mc-rail-icon:focus-visible {
  outline: 2px solid ${GOLD};
  outline-offset: 2px;
}
.mc-rail-icon.mc-rail-active {
  border: 2px solid ${GOLD};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    0 6px 16px rgba(15, 21, 35, 0.45),
    0 2px 4px rgba(15, 21, 35, 0.30),
    0 0 0 1px rgba(200, 146, 42, 0.20);
}
[data-stage="dark"] .mc-rail-icon.mc-rail-active {
  border: 2px solid ${GOLD};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.90),
    0 6px 20px rgba(0, 0, 0, 0.55),
    0 2px 6px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(200, 146, 42, 0.25);
}

.mc-rail-glyph {
  font-family: ${FONT_DISPLAY};
  font-size: 24px;
  color: ${GOLD_LT};
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
}
[data-stage="dark"] .mc-rail-glyph { color: ${GOLD_DK}; }

.mc-rail-label {
  font-family: ${FONT_SC};
  font-size: 9px;
  letter-spacing: 0.14em;
  color: ${TEXT_WHITE_META};
  line-height: 1.2;
  text-transform: uppercase;
}
[data-stage="dark"] .mc-rail-label { color: ${TEXT_META}; }

.mc-rail-state {
  font-family: ${FONT_SC};
  font-size: 8px;
  letter-spacing: 0.10em;
  color: ${TEXT_WHITE_FAINT};
}
[data-stage="dark"] .mc-rail-state { color: ${TEXT_FAINT}; }

/* Dismiss affordance — small × in the top-right of dismissible
   tiles. Invisible by default, fades in on hover/focus of the
   tile. Sits above the tile's onClick handler — we stopPropagation
   on the button itself. */
.mc-rail-dismiss {
  position: absolute;
  top: 2px;
  right: 4px;
  background: transparent;
  border: none;
  padding: 0;
  width: 16px;
  height: 16px;
  font-family: ${FONT_DISPLAY};
  font-size: 16px;
  line-height: 1;
  color: ${TEXT_WHITE_FAINT};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
[data-stage="dark"] .mc-rail-dismiss { color: ${TEXT_FAINT}; }
.mc-rail-icon:hover .mc-rail-dismiss,
.mc-rail-icon:focus-within .mc-rail-dismiss { opacity: 1; }
.mc-rail-dismiss:hover { color: ${GOLD}; }
.mc-rail-dismiss:focus-visible {
  opacity: 1;
  outline: 1px solid ${GOLD};
  outline-offset: 1px;
}

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
