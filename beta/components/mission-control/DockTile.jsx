// ─────────────────────────────────────────────────────────────
// DockTile.jsx
//
// Bottom-dock tile. Wider than a side-rail Tile, has an eyebrow
// above the name, and an optional gold left border for the
// "primary" tile.
//
// Props:
//   eyebrow:       string — small label above the name (e.g. "Profile · You")
//   name:          string — main name
//   status:        string — short status line
//   statusVariant: 'default' | 'complete'
//   primary:       boolean — adds gold left border
//   onClick:       () => void
// ─────────────────────────────────────────────────────────────

import {
  GOLD, GOLD_DK, GOLD_RULE, GOLD_HOVER,
  FONT_SC, FONT_BODY, FONT_DISPLAY,
  TEXT_INK, TEXT_META, BG_PAGE,
} from './tokens'

const STATUS_COLORS = {
  default:  TEXT_META,
  complete: GOLD_DK,
}

/**
 * @param {Object} props
 * @param {string} [props.eyebrow]
 * @param {string} props.name
 * @param {string} [props.status]
 * @param {'default'|'complete'} [props.statusVariant]
 * @param {boolean} [props.primary]
 * @param {() => void} props.onClick
 */
export default function DockTile({
  eyebrow,
  name,
  status,
  statusVariant = 'default',
  primary = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mc-dock-tile${primary ? ' mc-dock-primary' : ''}`}
    >
      <style>{DOCK_TILE_CSS}</style>
      {eyebrow && <div className="mc-dock-eyebrow">{eyebrow}</div>}
      <div className="mc-dock-name">{name}</div>
      {status && (
        <div className="mc-dock-status" style={{ color: STATUS_COLORS[statusVariant] }}>
          {status}
        </div>
      )}
    </button>
  )
}

const DOCK_TILE_CSS = `
.mc-dock-tile {
  background: ${BG_PAGE};
  border: 1px solid ${GOLD_RULE};
  border-radius: 12px;
  padding: 14px 18px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  min-width: 140px;
  transition: border-color 0.18s, background 0.18s, transform 0.18s;
  font-family: ${FONT_BODY};
}
.mc-dock-tile:hover {
  border-color: ${GOLD};
  background: ${GOLD_HOVER};
  transform: translateY(-1px);
}
.mc-dock-primary {
  border-left: 3px solid ${GOLD};
  padding-left: 16px;
}
.mc-dock-eyebrow {
  font-family: ${FONT_SC};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${GOLD_DK};
}
.mc-dock-name {
  font-family: ${FONT_DISPLAY};
  font-size: 19px;
  font-weight: 400;
  color: ${TEXT_INK};
  line-height: 1.2;
}
.mc-dock-status {
  font-family: ${FONT_BODY};
  font-size: 13px;
  font-weight: 400;
  line-height: 1.3;
}
`
