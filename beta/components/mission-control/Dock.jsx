// ─────────────────────────────────────────────────────────────
// Dock.jsx
//
// Wrapper for the bottom dock. Fixed to the bottom of the
// viewport, holds DockTile components (Profile, Purpose Piece,
// The Map, Settings). Wraps gracefully below 880px.
//
// Props:
//   children: React.ReactNode (DockTile components)
// ─────────────────────────────────────────────────────────────

import { GOLD_RULE, BG_PARCHMENT, BREAKPOINT_NARROW } from './tokens'

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export default function Dock({ children }) {
  return (
    <div className="mc-dock">
      <style>{DOCK_CSS}</style>
      <div className="mc-dock-inner">
        {children}
      </div>
    </div>
  )
}

const DOCK_CSS = `
.mc-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(250,250,247,0) 0%, ${BG_PARCHMENT} 30%);
  border-top: 1px solid ${GOLD_RULE};
  z-index: 30;
  padding: 14px 24px;
}
.mc-dock-inner {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  max-width: 1120px;
  margin: 0 auto;
}

@media (max-width: ${BREAKPOINT_NARROW}px) {
  .mc-dock { padding: 10px 12px; }
  .mc-dock-inner {
    flex-wrap: nowrap;
    overflow-x: auto;
    justify-content: flex-start;
    gap: 10px;
  }
  .mc-dock-inner::-webkit-scrollbar { height: 4px; }
  .mc-dock-inner::-webkit-scrollbar-thumb { background: ${GOLD_RULE}; border-radius: 2px; }
}
`
