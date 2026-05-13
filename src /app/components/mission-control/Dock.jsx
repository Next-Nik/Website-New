// ─────────────────────────────────────────────────────────────
// Dock.jsx
//
// The bottom utility rail. v4 collapses the four utility entries
// into a single horizontal strip with vertical dividers between
// them. Holds DockTile components.
//
// Props:
//   children: <DockTile> elements
// ─────────────────────────────────────────────────────────────

import { GOLD_RULE } from './tokens'

export default function Dock({ children }) {
  return (
    <div className="mc-utility-rail">
      <style>{DOCK_CSS}</style>
      {children}
    </div>
  )
}

const DOCK_CSS = `
.mc-utility-rail {
  padding: 12px 40px;
  border-top: 1px solid ${GOLD_RULE};
  display: flex;
  justify-content: center;
  gap: 0;
  background: rgba(200, 146, 42, 0.02);
}
[data-stage="dark"] .mc-utility-rail {
  border-top: 1px solid rgba(200, 146, 42, 0.20);
  background: rgba(200, 146, 42, 0.05);
}

@media (max-width: 880px) {
  .mc-utility-rail {
    padding: 10px 8px 14px;
    flex-wrap: wrap;
  }
}
`
