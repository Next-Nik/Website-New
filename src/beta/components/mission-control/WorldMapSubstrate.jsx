// ─────────────────────────────────────────────────────────────
// WorldMapSubstrate.jsx
//
// Fuller's Dymaxion Map fills the viewport as a fixed-position
// substrate. Standard responsive full-bleed background pattern.
//
// ╭─────────────────────────────────────────────────────────╮
// │  EDIT KNOBS — change these to tune size and placement.  │
// ╰─────────────────────────────────────────────────────────╯
//
//   FDM_SCALE          — overall size. 1.0 = covers whole viewport,
//                        0.5 = half size, 0.3 = 30%, etc.
//                        Independent on desktop vs mobile.
//   FDM_OFFSET_X_VW    — horizontal nudge in vw units (viewport
//                        widths). 0 = centered, 10 = 10vw right,
//                        -10 = 10vw left.
//   FDM_OFFSET_Y_VH    — vertical nudge in vh units. 0 = centered,
//                        positive = down, negative = up.
//   FDM_PARALLAX_VH    — how far it drifts as page scrolls, in vh.
//                        Set to 0 to disable parallax.
//   FDM_OPACITY        — visibility. 0 = invisible, 1 = solid.
//   FDM_OBJECT_POSITION — which slice of the projection stays
//                        visible when the image is cropped.
//                        'center', 'top', 'left center', '30% 50%',
//                        etc. (Only matters if FDM_SCALE produces
//                        cropping — at FDM_SCALE < 1 it doesn't.)
// ─────────────────────────────────────────────────────────────

const FDM_DESKTOP = {
  SCALE:           0.5,      // half size
  OFFSET_X_VW:     0,        // centered horizontally
  OFFSET_Y_VH:     0,        // centered vertically
  PARALLAX_VH:     6,        // drift ±3vh as you scroll
  OPACITY:         0.22,
  OBJECT_POSITION: 'center',
}

const FDM_MOBILE = {
  SCALE:           0.9,      // larger on phone (viewport is narrower)
  OFFSET_X_VW:     0,
  OFFSET_Y_VH:     0,
  PARALLAX_VH:     6,
  OPACITY:         0.18,
  OBJECT_POSITION: 'center',
}

// ─────────────────────────────────────────────────────────────

export default function WorldMapSubstrate() {
  return (
    <div
      className="mc-substrate"
      aria-hidden="true"
      ref={el => {
        if (!el) return
        function onScroll() {
          const isMobile = window.matchMedia('(max-width: 640px)').matches
          const cfg = isMobile ? FDM_MOBILE : FDM_DESKTOP

          const maxScroll = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            1
          )
          const progress = Math.min(
            Math.max(window.scrollY / maxScroll, 0),
            1
          )
          // Drift centered on offset-y: half above, half below.
          const driftVh = cfg.PARALLAX_VH
            ? -cfg.PARALLAX_VH / 2 + progress * cfg.PARALLAX_VH
            : 0
          const totalY = cfg.OFFSET_Y_VH + driftVh

          const img = el.querySelector('.mc-substrate-img')
          if (img) {
            img.style.transform =
              'translate(' + cfg.OFFSET_X_VW + 'vw, ' + totalY + 'vh) ' +
              'scale(' + cfg.SCALE + ')'
            img.style.opacity = cfg.OPACITY
            img.style.objectPosition = cfg.OBJECT_POSITION
          }
        }
        window.addEventListener('scroll',  onScroll, { passive: true })
        window.addEventListener('resize',  onScroll, { passive: true })
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
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.mc-substrate-img {
  /* Box is full-viewport. Visible size and placement come from
     the JS knobs at the top of the file (transform: scale +
     translate). object-fit: cover only matters when scale = 1; at
     smaller scales the image renders at its own aspect ratio
     centered in the box. */
  width: 100vw;
  height: 100vh;
  object-fit: cover;

  /* Warm-grey filter biases the projection's near-black continents
     toward the parchment/gold palette. */
  filter: sepia(0.25) hue-rotate(-12deg) saturate(0.6);

  will-change: transform, opacity;
  user-select: none;
  pointer-events: none;
}

[data-stage="dark"] .mc-substrate-img {
  filter: invert(1) sepia(0.25) hue-rotate(-12deg) saturate(0.6);
}
`
