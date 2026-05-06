// ─────────────────────────────────────────────────────────────
// WorldMapSubstrate.jsx
//
// Fuller's Dymaxion projection sits behind the wheel as substrate.
// One continuous landmass, no privileged centre — the platform's
// thesis rendered as cartography (Bucky Fuller is in the locked
// intellectual lineage).
//
// The SVG file lives at /public/dymaxion-substrate.svg. We render
// it via an <img> tag so the browser caches it once and reuses
// it across renders.
//
// Theming via CSS opacity:
//   light stage  → 0.10 opacity, sits on parchment
//   dark stage   → 0.18 opacity, sits on ink (the map intensifies
//                  on the planet side per architectural decision)
//
// We use mix-blend-mode: multiply on light stage so the dark map
// strokes blend warmly into the parchment instead of sitting on
// top as flat black. On dark stage we use a CSS filter to invert
// the map (originally dark-on-light → becomes light-on-dark).
//
// Position: absolute, fills its containing element. The parent
// (the wheel area in BetaMissionControl) sets `position: relative`.
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
  /* center the map on the wheel area, slightly oversized so the
     graticule lines bleed past the edges of the visible region */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: auto;
  min-height: 120%;
  max-width: none;

  /* Light stage: dark continents at low opacity, multiply into parchment */
  opacity: 0.10;
  mix-blend-mode: multiply;

  user-select: none;
  pointer-events: none;
}

/* Dark stage: invert the map (dark-on-light → light-on-dark),
   slightly higher opacity so it reads against the ink */
[data-stage="dark"] .mc-substrate-img {
  opacity: 0.18;
  mix-blend-mode: screen;
  filter: invert(1);
}

/* On smaller screens, the substrate tightens to the wheel area
   instead of bleeding wide — keeps it from overwhelming the rails */
@media (max-width: 640px) {
  .mc-substrate-img {
    width: 140%;
    opacity: 0.08;
  }
  [data-stage="dark"] .mc-substrate-img {
    opacity: 0.14;
  }
}
`
