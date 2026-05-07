// ─────────────────────────────────────────────────────────────
// WorldMapSubstrate.jsx
//
// World projection sits behind the wheel as substrate — the
// platform's thesis rendered as cartography (Bucky Fuller is in
// the locked intellectual lineage; the projection asset itself
// can be swapped without touching this component).
//
// The SVG file lives at /public/dymaxion-substrate.svg. We render
// it via an <img> tag so the browser caches it once and reuses
// it across renders.
//
// Positioning: TOP-ANCHORED, WIDTH-DRIVEN.
//   The projection starts at the top of its container and runs
//   down. At the SVG's 612×792 portrait aspect ratio, fitting to
//   width produces a projection that naturally covers the upper
//   portion of the stage (brand-bar-down-through-wheel-area), the
//   way the v4 mockup specifies. Action cards below sit on plain
//   parchment.
//
// Theming via CSS opacity:
//   light stage  → 0.22 opacity (0.18 on phones), warm-grey on
//                  parchment
//   dark stage   → 0.28 opacity (0.24 on phones), light-on-ink
//                  via filter: invert
//
// No mix-blend-mode — at low opacity it produced ghost continents
// that read as nothing on bright phone screens. Plain compositing
// at higher opacity reads correctly across viewing conditions.
// A subtle warm filter biases the near-black continents toward
// the parchment/gold palette.
//
// MOUNT POINT:
//   This component is rendered as a sibling at the top of
//   .mc-stage-root (just below the brand bar) so the substrate
//   bleeds up under the identity band and the PoleHeader, the
//   way the v4 mockup specifies. The parent must be position:
//   relative; the substrate fills it with position: absolute.
// ─────────────────────────────────────────────────────────────

export default function WorldMapSubstrate() {
  return (
    <div className="mc-substrate" aria-hidden="true">
      <style>{SUBSTRATE_CSS}</style>
      <img
        src="/dymaxion-substrate.svg"
        alt=""
        className="mc-substrate-img"
      />
    </div>
  )
}

const SUBSTRATE_CSS = `
.mc-substrate {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.mc-substrate-img {
  position: absolute;
  /* Top-anchored, horizontally centred. Width-fit so continents
     span the viewport — at the SVG's 612×792 aspect ratio this
     produces a projection that runs from below the brand bar
     down through the wheel area, the way the v4 mockup specifies. */
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: auto;
  max-width: none;

  /* Light stage: visible warm-grey continents on parchment.
     No mix-blend-mode (made it invisible on bright screens).
     Filter biases near-black toward warm grey to fit palette. */
  opacity: 0.22;
  filter: sepia(0.25) hue-rotate(-12deg) saturate(0.6);

  user-select: none;
  pointer-events: none;
}

/* Dark stage: invert the map (dark-on-light → light-on-dark),
   slightly higher opacity so it reads against the ink. */
[data-stage="dark"] .mc-substrate-img {
  opacity: 0.28;
  filter: invert(1) sepia(0.25) hue-rotate(-12deg) saturate(0.6);
}

/* On wider viewports, scale the projection up so it stays a
   substantial backdrop rather than a thin band. The aspect-ratio
   stays fixed to the SVG so geography doesn't distort. */
@media (min-width: 768px) {
  .mc-substrate-img {
    width: 90%;
    max-width: 900px;
  }
}

/* On smaller phones the substrate still runs full-width; only the
   opacity is tempered to avoid overwhelming the wheel and rails. */
@media (max-width: 640px) {
  .mc-substrate-img {
    opacity: 0.18;
  }
  [data-stage="dark"] .mc-substrate-img {
    opacity: 0.24;
  }
}
`
