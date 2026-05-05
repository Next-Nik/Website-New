// ─────────────────────────────────────────────────────────────
// Tile.jsx
//
// The side-rail tile. Each tile is a workspace doorway — clicking
// opens a Panel with the tool's simplest useful form.
//
// Props (per Mission Control chunk 1 brief):
//   glyph:         string|node — small marker rendered above the label
//   label:         string — the tile's name
//   status:        string — short status line (e.g. "day 12 of 90", "Empty.")
//   statusVariant: 'gold' | 'empty' | 'default'
//   dot:           boolean — small accent dot beside the label
//   pulse:         boolean — applies a slow gold-glow pulse (use sparingly)
//   onClick:       () => void
// ─────────────────────────────────────────────────────────────

import {
  TILE_W, GOLD, GOLD_DK, GOLD_RULE, GOLD_HOVER,
  FONT_SC, FONT_BODY, TEXT_INK, TEXT_META, TEXT_FAINT, BG_PAGE,
} from './tokens'

const STATUS_COLORS = {
  gold:    GOLD_DK,
  empty:   TEXT_FAINT,
  default: TEXT_META,
}

/**
 * @param {Object} props
 * @param {string|React.ReactNode} [props.glyph]
 * @param {string} props.label
 * @param {string} [props.status]
 * @param {'gold'|'empty'|'default'} [props.statusVariant]
 * @param {boolean} [props.dot]
 * @param {boolean} [props.pulse]
 * @param {() => void} props.onClick
 */
export default function Tile({
  glyph,
  label,
  status,
  statusVariant = 'default',
  dot = false,
  pulse = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mc-tile${pulse ? ' mc-tile-pulse' : ''}`}
      aria-label={label}
    >
      <style>{TILE_CSS}</style>
      {glyph != null && <div className="mc-tile-glyph">{glyph}</div>}
      <div className="mc-tile-label-row">
        {dot && <span className="mc-tile-dot" />}
        <span className="mc-tile-label">{label}</span>
      </div>
      {status && (
        <div className="mc-tile-status" style={{ color: STATUS_COLORS[statusVariant] }}>
          {status}
        </div>
      )}
    </button>
  )
}

const TILE_CSS = `
.mc-tile {
  width: ${TILE_W}px;
  background: ${BG_PAGE};
  border: 1px solid ${GOLD_RULE};
  border-radius: 12px;
  padding: 12px 8px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: border-color 0.18s, background 0.18s, transform 0.18s;
  font-family: ${FONT_BODY};
  text-align: center;
}
.mc-tile:hover {
  border-color: ${GOLD};
  background: ${GOLD_HOVER};
  transform: translateY(-1px);
}
.mc-tile-glyph {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${GOLD_DK};
  font-family: ${FONT_SC};
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.10em;
}
.mc-tile-label-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.mc-tile-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${GOLD};
  flex-shrink: 0;
}
.mc-tile-label {
  font-family: ${FONT_SC};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${TEXT_INK};
  line-height: 1.2;
}
.mc-tile-status {
  font-family: ${FONT_BODY};
  font-size: 11px;
  font-weight: 400;
  line-height: 1.3;
  text-align: center;
  min-height: 14px;
}
@keyframes mcTilePulse {
  0%   { box-shadow: 0 0 0 0 rgba(200,146,42,0); border-color: ${GOLD_RULE}; }
  50%  { box-shadow: 0 0 18px 2px rgba(200,146,42,0.32); border-color: ${GOLD}; }
  100% { box-shadow: 0 0 0 0 rgba(200,146,42,0); border-color: ${GOLD_RULE}; }
}
.mc-tile-pulse { animation: mcTilePulse 6s ease-in-out infinite; }
`
