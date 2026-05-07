// ─────────────────────────────────────────────────────────────
// WorldMapSubstrate.jsx
//
// Fuller's Dymaxion Map sits as a fixed-position substrate
// behind the wheel. The image renders at its natural size and
// is sized + positioned via transform — never cropped.
//
// ╭─────────────────────────────────────────────────────────╮
// │  EDIT KNOBS — change these to tune size and placement.  │
// ╰─────────────────────────────────────────────────────────╯
//
//   FDM_WIDTH_PX       — base width in pixels. The image's height
//                        scales automatically to preserve aspect
//                        ratio. Larger number = bigger map.
//   FDM_OFFSET_X_PX    — horizontal nudge from centre, in pixels.
//                        0 = centred. Positive = right, negative = left.
//   FDM_OFFSET_Y_PX    — vertical nudge from centre, in pixels.
//                        0 = centred. Positive = down, negative = up.
//   FDM_PARALLAX_PX    — how far it drifts as page scrolls, in px.
//                        Set to 0 to disable parallax.
//   FDM_OPACITY        — visibility. 0 = invisible, 1 = solid.
// ─────────────────────────────────────────────────────────────

const FDM_DESKTOP = {
  WIDTH_PX:     500,    // base width — change this to resize
  OFFSET_X_PX:  0,      // horizontal nudge from centre
  OFFSET_Y_PX:  100,      // vertical nudge from centre
  PARALLAX_PX:  60,     // drift range across the page
  OPACITY:      0.22,
}

const FDM_MOBILE = {
  WIDTH_PX:     340,
  OFFSET_X_PX:  0,
  OFFSET_Y_PX:  0,
  PARALLAX_PX:  40,
  OPACITY:      0.18,
}

// ─────────────────────────────────────────────────────────────

export default function WorldMapSubstrate() {
  return (
    <div
      className="mc-substrate"
      aria-hidden="true"
      ref={el => {
        if (!el) return
        function applyConfig() {
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
          const driftPx = cfg.PARALLAX_PX
            ? -cfg.PARALLAX_PX / 2 - progress * cfg.PARALLAX_PX
            : 0
          const totalY = cfg.OFFSET_Y_PX + driftPx

          const img = el.querySelector('.mc-substrate-img')
          if (img) {
            img.style.width = cfg.WIDTH_PX + 'px'
            // translate(-50%, -50%) centres the image on the
            // anchor point; OFFSET_X / OFFSET_Y nudge from centre.
            img.style.transform =
              'translate(' +
                'calc(-50% + ' + cfg.OFFSET_X_PX + 'px), ' +
                'calc(-50% + ' + totalY + 'px)' +
              ')'
            img.style.opacity = cfg.OPACITY
          }
        }
        window.addEventListener('scroll', applyConfig, { passive: true })
        window.addEventListener('resize', applyConfig, { passive: true })
        applyConfig()
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
  /* Anchor at viewport centre. Width is set via JS knob; height
     is auto so aspect ratio is preserved. The image renders at
     its natural shape and is never cropped. */
  position: absolute;
  top: 50%;
  left: 50%;
  height: auto;

  filter: sepia(0.25) hue-rotate(-12deg) saturate(0.6);

  will-change: transform, opacity;
  user-select: none;
  pointer-events: none;
}

[data-stage="dark"] .mc-substrate-img {
  filter: invert(1) sepia(0.25) hue-rotate(-12deg) saturate(0.6);
}
`
