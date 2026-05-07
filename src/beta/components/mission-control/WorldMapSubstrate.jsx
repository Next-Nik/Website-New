// ─────────────────────────────────────────────────────────────
// WorldMapSubstrate.jsx
//
// Fuller's Dymaxion Map sits as a small floating element behind
// the wheel — the platform's thesis rendered as cartography.
// The asset itself can be swapped without touching this component.
//
// Layout:
//   The "window" — the .mc-substrate container — covers the
//   entire viewport (position: fixed, full-screen). The FDM
//   image inside it is sized to 25% of viewport width and
//   positioned in the upper-middle, behind the wheel.
//
// Parallax:
//   Same easing pattern as the About page Peru photo. As the
//   page scrolls, the FDM drifts downward within its bounds —
//   geography moves slower than the foreground, creating depth.
//
// Theming via CSS opacity:
//   light stage  → 0.22 opacity (0.18 on phones)
//   dark stage   → 0.28 opacity (0.24 on phones), inverted
// ─────────────────────────────────────────────────────────────

export default function WorldMapSubstrate() {
  return (
    <div
      className="mc-substrate"
      aria-hidden="true"
      ref={el => {
        if (!el) return
        // Parallax: image starts slightly above its anchor and
        // eases down as the page scrolls. We measure relative to
        // the document scroll position so the FDM keeps drifting
        // even though the .mc-substrate container itself is fixed.
        function onScroll() {
          const maxScroll = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            1
          )
          const progress = Math.min(
            Math.max(window.scrollY / maxScroll, 0),
            1
          )
          // Drift range: -8% to +8% of viewport height.
          const shiftVh = -8 + progress * 16
          const img = el.querySelector('.mc-substrate-img')
          if (img) {
            img.style.transform =
              'translateX(-50%) translateY(calc(' + shiftVh + 'vh))'
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
/* Full-screen window — the FDM floats inside this. position:
   fixed so it doesn't get clipped by ancestor stacking contexts
   and stays put through parallax. */
.mc-substrate {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.mc-substrate-img {
  position: absolute;
  /* Anchor to upper-middle of the viewport, horizontally
     centered. The wheel sits roughly here so the FDM reads as
     "behind the wheel." */
  top: 28vh;
  left: 50%;
  transform: translateX(-50%);

  /* Small. 25% of viewport width on desktop. */
  width: 25vw;
  height: auto;
  max-width: none;

  opacity: 0.22;
  filter: sepia(0.25) hue-rotate(-12deg) saturate(0.6);

  will-change: transform;
  user-select: none;
  pointer-events: none;
}

/* Dark stage: invert + slightly higher opacity for ink backdrop. */
[data-stage="dark"] .mc-substrate-img {
  opacity: 0.28;
  filter: invert(1) sepia(0.25) hue-rotate(-12deg) saturate(0.6);
}

/* Phones: scale up a little because the wheel itself is larger
   relative to viewport, but still sits behind it. */
@media (max-width: 640px) {
  .mc-substrate-img {
    width: 50vw;
    top: 22vh;
    opacity: 0.18;
  }
  [data-stage="dark"] .mc-substrate-img {
    opacity: 0.24;
  }
}
`
