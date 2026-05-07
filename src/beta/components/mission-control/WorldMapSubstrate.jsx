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
//   down at half viewport width — sized to sit behind the wheel
//   without dominating the layout.
//
// Parallax:
//   The substrate drifts vertically as the page scrolls, on the
//   same pattern used by the About page Peru photo. Image is
//   taller than the visible band; translateY shifts within a
//   bounded range so geography moves slower than the foreground,
//   creating depth without obscuring the wheel.
//
// Theming via CSS opacity:
//   light stage  → 0.22 opacity (0.18 on phones), warm-grey on
//                  parchment
//   dark stage   → 0.28 opacity (0.24 on phones), light-on-ink
//                  via filter: invert
//
// MOUNT POINT:
//   This component is rendered as a sibling at the top of
//   .mc-stage-root. The parent must be position: relative.
// ─────────────────────────────────────────────────────────────

export default function WorldMapSubstrate() {
  return (
    <div
      className="mc-substrate"
      aria-hidden="true"
      ref={el => {
        if (!el) return
        // Parallax: same easing math as About page Peru photo.
        // Image starts at translateY(-30%) and eases toward
        // translateY(0) as the stage scrolls past. The translateX
        // is preserved to keep the image horizontally centered.
        function onScroll() {
          const rect = el.getBoundingClientRect()
          const viewH = window.innerHeight
          const progress = 1 - (rect.bottom / (viewH + rect.height))
          const shift = Math.min(Math.max(progress * 30, 0), 30)
          const img = el.querySelector('.mc-substrate-img')
          if (img) {
            img.style.transform =
              'translateX(-50%) translateY(' + (-30 + shift) + '%)'
          }
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        onScroll()
      }}
    >
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
  /* Top-anchored, horizontally centred. Half viewport width on
     mobile — sits behind the wheel without spanning the full
     stage. translateY is set dynamically by the scroll handler;
     translateX(-50%) keeps the image centered. */
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-30%);
  width: 50%;
  height: auto;
  max-width: none;

  /* Light stage: visible warm-grey continents on parchment. */
  opacity: 0.22;
  filter: sepia(0.25) hue-rotate(-12deg) saturate(0.6);

  /* Hint to the browser that this element will animate, so it
     gets its own compositor layer and parallax stays smooth. */
  will-change: transform;

  user-select: none;
  pointer-events: none;
}

/* Dark stage: invert the map (dark-on-light → light-on-dark),
   slightly higher opacity so it reads against the ink. */
[data-stage="dark"] .mc-substrate-img {
  opacity: 0.28;
  filter: invert(1) sepia(0.25) hue-rotate(-12deg) saturate(0.6);
}

/* On wider viewports, scale up modestly so the projection still
   reads as a substantial backdrop on a desktop. Aspect-ratio
   stays fixed to the SVG so geography doesn't distort. */
@media (min-width: 768px) {
  .mc-substrate-img {
    width: 50%;
    max-width: 600px;
  }
}

/* On smaller phones the opacity is tempered slightly to avoid
   overwhelming the wheel and rails. */
@media (max-width: 640px) {
  .mc-substrate-img {
    opacity: 0.18;
  }
  [data-stage="dark"] .mc-substrate-img {
    opacity: 0.24;
  }
}
`
