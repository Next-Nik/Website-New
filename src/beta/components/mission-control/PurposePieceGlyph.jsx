// ─────────────────────────────────────────────────────────────
// PurposePieceGlyph.jsx
//
// Purpose Piece rail-tile glyph. Wraps the existing /public/
// purpose-piece-logo.png asset — the gold-and-slate puzzle-piece
// composition with the central pivot/needle. The artwork is too
// textured and multi-color to redraw as SVG cleanly, so PNG is the
// right call.
//
// Static. The Purpose Piece is a status surface, not an instrument.
//
// Dark-mode handling: the artwork has its own gold/slate palette
// that reads on both light and dark stages without modification.
// No filter or color override applied.
//
// Sizing: matches the rail-glyph cascade. The img tag uses width/
// height to scale the rendered output; the file itself is 283×281
// at native resolution which is plenty for retina at 28px.
// ─────────────────────────────────────────────────────────────

export default function PurposePieceGlyph() {
  return (
    <span
      className="mc-pp-glyph"
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        lineHeight: 1,
      }}
    >
      <style>{`
        @media (max-width: 1280px) {
          .mc-pp-glyph { width: 24px !important; height: 24px !important; }
        }
        @media (max-width: 1024px) {
          .mc-pp-glyph { width: 22px !important; height: 22px !important; }
        }
      `}</style>
      <img
        src="/purpose-piece-logo.png"
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </span>
  )
}
