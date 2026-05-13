// ─────────────────────────────────────────────────────────────
// SideRail.jsx
//
// Vertical icon column on either side of the wheel. No longer
// position: fixed — sits inside the Mission Control grid as a
// proper column. The wheel is the centre column; the two rails
// flank it.
//
// Layout: vertical flex column, even gaps, narrow on mobile,
// wider on desktop.
//
// Props:
//   side:     'left' | 'right'
//   children: <Tile> elements
// ─────────────────────────────────────────────────────────────

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
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-self: center;
  /* Keep tiles consistent width inside the column */
  width: 100%;
}

@media (max-width: 640px) {
  .mc-side-rail {
    gap: 5px;
  }
}
`
