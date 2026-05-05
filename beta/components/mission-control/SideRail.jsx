// ─────────────────────────────────────────────────────────────
// SideRail.jsx
//
// Wrapper for the left or right rail of the cockpit. Holds a
// vertical column of <Tile /> on desktop. Below 880px breakpoint
// the rail collapses into a horizontal scrollable strip — tiles
// reflow horizontally in source order.
//
// Props:
//   side:     'left' | 'right'
//   children: React.ReactNode (Tile components)
// ─────────────────────────────────────────────────────────────

import { GOLD_RULE, BG_PARCHMENT, BREAKPOINT_NARROW } from './tokens'

/**
 * @param {Object} props
 * @param {'left'|'right'} props.side
 * @param {React.ReactNode} props.children
 */
export default function SideRail({ side, children }) {
  return (
    <div className={`mc-rail mc-rail-${side}`}>
      <style>{RAIL_CSS}</style>
      <div className="mc-rail-inner">
        {children}
      </div>
    </div>
  )
}

const RAIL_CSS = `
.mc-rail {
  position: fixed;
  top: 110px;          /* below TopStrip + Ticker */
  bottom: 120px;       /* above Dock */
  width: 110px;
  z-index: 20;
  display: flex;
  flex-direction: column;
}
.mc-rail-left  { left: 16px; }
.mc-rail-right { right: 16px; }

.mc-rail-inner {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 0;
  overflow-y: auto;
  flex: 1 1 auto;
  align-items: center;
}
.mc-rail-inner::-webkit-scrollbar { width: 4px; }
.mc-rail-inner::-webkit-scrollbar-thumb { background: ${GOLD_RULE}; border-radius: 2px; }

@media (max-width: ${BREAKPOINT_NARROW}px) {
  .mc-rail {
    position: relative;
    top: auto;
    bottom: auto;
    left: auto;
    right: auto;
    width: 100%;
    background: ${BG_PARCHMENT};
    padding: 12px 0;
    border-top: 1px solid ${GOLD_RULE};
  }
  .mc-rail-inner {
    flex-direction: row;
    gap: 10px;
    padding: 0 16px;
    overflow-x: auto;
    overflow-y: hidden;
    align-items: stretch;
  }
}
`
