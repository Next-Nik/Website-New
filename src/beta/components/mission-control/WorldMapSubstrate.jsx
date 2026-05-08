// ─────────────────────────────────────────────────────────────
// WorldMapSubstrate.jsx
//
// Two-layer cosmic-and-terrestrial substrate behind the wheel:
//
//   Layer 1 (back, slowest):  Star map — constellations with
//                             celestial grid. SVG, very low opacity.
//                             Says "this lives in the cosmos."
//
//   Layer 2 (front, slow):    Fuller's Dymaxion projection.
//                             SVG. Says "this lives on Earth."
//
// Both are circular projections — they rhyme as a pair.
//
// Note on theming: the star-map.svg ships with white fills (designed
// for dark backgrounds). On light stage we use filter:invert(1) to
// render it as dark-on-transparent. On dark stage no filter needed.
// The Dymaxion is the inverse: dark fills, inverted on dark stage.
//
// Parallax: scroll-driven, two speeds.
//   • Star map:   moves at 0.2x scroll speed (slowest, deepest)
//   • Dymaxion:   moves at 0.4x scroll speed
//   • Foreground: 1.0x (normal)
//
// Implementation: requestAnimationFrame-throttled scroll listener
// updates transform: translate3d() on each layer for GPU compositing.
// Honors prefers-reduced-motion: parallax disabled when set.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'

export default function WorldMapSubstrate() {
  const starRef = useRef(null)
  const dymRef  = useRef(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    let ticking = false
    let lastScrollY = 0

    const update = () => {
      const y = lastScrollY
      if (starRef.current) {
        starRef.current.style.transform = `translate3d(-50%, calc(-50% + ${y * 0.2}px), 0)`
      }
      if (dymRef.current) {
        dymRef.current.style.transform = `translate3d(-50%, calc(-50% + ${y * 0.4}px), 0)`
      }
      ticking = false
    }

    const onScroll = () => {
      lastScrollY = window.scrollY
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className="mc-substrate" aria-hidden="true">
      <style>{SUBSTRATE_CSS}</style>

      <img
        ref={starRef}
        src="/star-map.svg"
        alt=""
        className="mc-substrate-stars"
      />

      <img
        ref={dymRef}
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

/* ─── Star map (back layer) ─────────────────────────────────── */
/* Source SVG has white fills. Light stage: invert to dark.
   Dark stage: keep white. */

.mc-substrate-stars {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: auto;
  max-width: 1200px;
  min-width: 600px;

  /* Light stage: invert white → dark, very faint */
  opacity: 0.05;
  filter: invert(1);

  will-change: transform;
  backface-visibility: hidden;
  user-select: none;
  pointer-events: none;
}

/* Dark stage: white stars on ink, no invert needed */
[data-stage="dark"] .mc-substrate-stars {
  opacity: 0.12;
  filter: none;
}

/* ─── Dymaxion (front layer) ────────────────────────────────── */

.mc-substrate-img {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: auto;
  min-height: 120%;
  max-width: none;

  opacity: 0.10;
  mix-blend-mode: multiply;

  will-change: transform;
  backface-visibility: hidden;
  user-select: none;
  pointer-events: none;
}

[data-stage="dark"] .mc-substrate-img {
  opacity: 0.18;
  mix-blend-mode: screen;
  filter: invert(1);
}

/* ─── Mobile ────────────────────────────────────────────────── */

@media (max-width: 640px) {
  .mc-substrate-stars {
    opacity: 0.04;
    max-width: 700px;
    min-width: 400px;
  }
  [data-stage="dark"] .mc-substrate-stars {
    opacity: 0.10;
  }

  .mc-substrate-img {
    width: 140%;
    opacity: 0.08;
  }
  [data-stage="dark"] .mc-substrate-img {
    opacity: 0.14;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mc-substrate-stars,
  .mc-substrate-img {
    will-change: auto;
  }
}
`
