// ─────────────────────────────────────────────────────────────
// WorldMapSubstrate.jsx
//
// Fuller's Dymaxion Map fills the viewport as a fixed-position
// substrate. Standard responsive full-bleed background pattern:
// position: fixed + inset: 0 + width/height 100vw/vh +
// object-fit: cover. Works at any viewport size — phone gets a
// portrait crop, desktop gets a landscape crop, both intentional.
//
// Parallax: image translates vertically as the page scrolls,
// matching the About-page Peru photo pattern.
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
        function onScroll() {
          const maxScroll = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            1
          )
          const progress = Math.min(
            Math.max(window.scrollY / maxScroll, 0),
            1
          )
          // Drift range: -6vh to +6vh of viewport height.
          const shiftVh = -6 + progress * 12
          const img = el.querySelector('.mc-substrate-img')
          if (img) {
            img.style.transform = 'translateY(' + shiftVh + 'vh)'
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
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.mc-substrate-img {
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  object-position: center;

  opacity: 0.12;
  filter: sepia(0.25) hue-rotate(-12deg) saturate(0.6);

  will-change: transform;
  user-select: none;
  pointer-events: none;
}

[data-stage="dark"] .mc-substrate-img {
  opacity: 0.28;
  filter: invert(1) sepia(0.25) hue-rotate(-12deg) saturate(0.6);
}

@media (max-width: 640px) {
  .mc-substrate-img {
    opacity: 0.18;
  }
  [data-stage="dark"] .mc-substrate-img {
    opacity: 0.24;
  }
}
`
