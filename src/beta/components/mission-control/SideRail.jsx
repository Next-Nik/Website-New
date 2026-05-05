// ─────────────────────────────────────────────────────────────
// SideRail.jsx
//
// Vertical icon strip on either side of the centre stage. Holds
// Tile components. Below 1024px the rail collapses to a horizontal
// strip above the centre stage; below 880px it stays horizontal but
// wraps tighter. Dark-mode flip honoured via [data-stage="dark"].
//
// Props:
//   side:     'left' | 'right'
//   children: <Tile> elements
// ─────────────────────────────────────────────────────────────

import { GOLD_RULE, BG_CARD, BG_INK_SOFT } from './tokens'

export default function SideRail({ side, children }) {
  return (
    <div className={`mc-side-rail mc-side-${side}`}>
      <style>{SIDE_RAIL_CSS}</style>
      {children}
    </div>
  )
}

const SIDE_RAIL_CSS = `
.mc-side-rail {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 20;
}
.mc-side-left  { left: 16px; }
.mc-side-right { right: 16px; }

@media (max-width: 1280px) {
  .mc-side-left  { left: 8px; }
  .mc-side-right { right: 8px; }
}

@media (max-width: 1024px) {
  .mc-side-rail {
    position: static;
    transform: none;
    flex-direction: row;
    gap: 4px;
    padding: 8px 16px;
    flex-wrap: wrap;
    justify-content: center;
    background: rgba(200, 146, 42, 0.03);
    border-bottom: 1px solid ${GOLD_RULE};
  }
  [data-stage="dark"] .mc-side-rail {
    background: rgba(200, 146, 42, 0.06);
    border-bottom: 1px solid rgba(200, 146, 42, 0.20);
  }
}
`
