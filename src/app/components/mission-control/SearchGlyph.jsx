// ─────────────────────────────────────────────────────────────
// SearchGlyph.jsx
//
// Magnifying-glass rail-tile glyph for the Search tile in the
// Mission Control right rail.
//
// Single SVG. Stroke uses currentColor so the tile's CSS controls
// the colour (gold on parchment, lighter gold on dark stage).
// ─────────────────────────────────────────────────────────────

export default function SearchGlyph() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      display="block"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.2" y1="15.2" x2="20" y2="20" />
    </svg>
  )
}
