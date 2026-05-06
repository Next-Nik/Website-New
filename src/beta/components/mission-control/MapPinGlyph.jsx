// ─────────────────────────────────────────────────────────────
// MapPinGlyph.jsx
//
// Map rail-tile glyph. Classic map pin silhouette — outer pin shape
// (round head with pointed tail) plus a hollow inner circle. Drawn
// in SVG so it inherits the gold-dk / gold-lt color from the
// .mc-rail-glyph wrapper via currentColor, and dark-mode flip works
// without any extra plumbing.
//
// Static. The Map is a status surface, not an instrument — no
// animation needed.
//
// Sizing: matches the rail-glyph cascade — 28px desktop, 24px at
// 1280-narrow, 22px at 1024 mobile-strip. SVG viewBox is fixed at
// 56×56; the wrapper width/height scales the rendered output.
// ─────────────────────────────────────────────────────────────

export default function MapPinGlyph() {
  return (
    <span
      className="mc-map-glyph"
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
          .mc-map-glyph { width: 24px !important; height: 24px !important; }
        }
        @media (max-width: 1024px) {
          .mc-map-glyph { width: 22px !important; height: 22px !important; }
        }
      `}</style>
      <svg
        viewBox="0 0 56 56"
        width="100%"
        height="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Pin silhouette — round head from y≈4 down to y≈30, then
            tapering tail to a point at y≈52. Single closed path with
            a circular hole cut for the inner ring (using even-odd
            fill rule so the hole reads through). */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="
            M 28 4
            C 17.5 4 9 12.5 9 23
            C 9 27.5 10.5 31.5 13 35
            L 27 51.5
            C 27.5 52.2 28.5 52.2 29 51.5
            L 43 35
            C 45.5 31.5 47 27.5 47 23
            C 47 12.5 38.5 4 28 4
            Z
            M 28 31
            C 23.6 31 20 27.4 20 23
            C 20 18.6 23.6 15 28 15
            C 32.4 15 36 18.6 36 23
            C 36 27.4 32.4 31 28 31
            Z
          "
          fill="currentColor"
        />
      </svg>
    </span>
  )
}
