// ─────────────────────────────────────────────────────────────
// WorldMapSubstrate.jsx
//
// Two-layer substrate behind the wheel.
//   Layer 1 (back):  Star map — celestial chart, faint
//   Layer 2 (front): Fuller's Dymaxion projection
//
// Plain opacity, no blend modes. Each SVG has a transparent
// background; layers stack independently. Predictable across
// browsers and devices.
//
// Parallax: scroll-driven, two speeds.
//   • Star map → 0.2x scroll (slowest, deepest)
//   • Dymaxion → 0.4x scroll
//   • Foreground (rails, wheel, cards) → 1.0x normal
//
// Honors prefers-reduced-motion: no parallax for those users.
// ─────────────────────────────────────────────────────────────


// ╔═══════════════════════════════════════════════════════════╗
// ║                       TUNING KNOBS                        ║
// ║                                                           ║
// ║  Edit these values to change size, position, opacity, and ║
// ║  parallax speed for both substrate layers. The CSS below  ║
// ║  reads from these constants — do NOT edit the CSS rules   ║
// ║  by hand. Change the numbers here and the rest follows.   ║
// ╚═══════════════════════════════════════════════════════════╝

// ─── DYMAXION (front layer, the world map) ───
const DYM = {
  // Size — width as % of the substrate container.
  // 100 = same width as container. >100 bleeds wider. <100 sits inside.
  sizeDesktop: 50,   // % width on desktop / tablet
  sizeMobile:  140,   // % width on phones (≤640px)

  // Position offset from centre. 0 = perfectly centred.
  // Positive offsetY pushes the map DOWN. Negative pushes UP.
  // Positive offsetX pushes RIGHT. Negative pushes LEFT.
  offsetX: 0,         // px horizontal offset
  offsetY: 0,         // px vertical offset

  // Opacity (0.0 transparent → 1.0 fully visible).
  opacityLight: 0.15, // on parchment / light stage
  opacityDark:  0.25, // on ink / dark stage (after invert)

  // Parallax — fraction of scroll distance the layer moves.
  // 0 = locked in place. 1 = scrolls with content normally.
  // Lower = appears further back / slower.
  parallax: 0.4,
}

// ─── STAR MAP (back layer, constellations) ───
const STAR = {
  // Size — bounded by max/min width in pixels.
  // (Star map is circular and fixed-aspect, so we cap absolute size
  // rather than use % of container.)
  maxWidthDesktop: 1200,  // px upper bound on desktop
  minWidthDesktop: 600,   // px lower bound on desktop
  maxWidthMobile:  700,   // px upper bound on mobile
  minWidthMobile:  400,   // px lower bound on mobile

  // Position offset from centre.
  offsetX: 0,
  offsetY: 0,

  // Opacity. Star-map source is white-on-transparent.
  // On light stage we invert to dark-on-transparent.
  opacityLight: 0.10, // on parchment (after invert)
  opacityDark:  0.20, // on ink (no invert needed)

  // Parallax — should be lower than DYM.parallax so stars feel
  // further away than the world.
  parallax: 0.2,
}


// ─────────────────────────────────────────────────────────────
// Component implementation below. Don't edit unless you're
// changing the structure.
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
        const dy = (STAR.offsetY) + (y * STAR.parallax)
        const dx = STAR.offsetX
        starRef.current.style.transform =
          `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0)`
      }
      if (dymRef.current) {
        const dy = (DYM.offsetY) + (y * DYM.parallax)
        const dx = DYM.offsetX
        dymRef.current.style.transform =
          `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0)`
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

  // Initial position before parallax kicks in
  const initialStarTransform =
    `translate(calc(-50% + ${STAR.offsetX}px), calc(-50% + ${STAR.offsetY}px))`
  const initialDymTransform =
    `translate(calc(-50% + ${DYM.offsetX}px), calc(-50% + ${DYM.offsetY}px))`

  return (
    <div className="mc-substrate" aria-hidden="true">
      <style>{buildCSS()}</style>

      <img
        ref={starRef}
        src="/star-map.svg"
        alt=""
        className="mc-substrate-stars"
        style={{ transform: initialStarTransform }}
      />

      <img
        ref={dymRef}
        src="/dymaxion-substrate.svg"
        alt=""
        className="mc-substrate-img"
        style={{ transform: initialDymTransform }}
      />
    </div>
  )
}

// CSS built from TUNING constants
function buildCSS() {
  return `
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

/* ─── Star map (back layer) ──────────────────────────── */
.mc-substrate-stars {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: auto;
  max-width: ${STAR.maxWidthDesktop}px;
  min-width: ${STAR.minWidthDesktop}px;

  /* Light stage: invert white-source to dark-on-transparent */
  opacity: ${STAR.opacityLight};
  filter: invert(1);

  will-change: transform;
  backface-visibility: hidden;
  user-select: none;
  pointer-events: none;
}

/* Dark stage: white stars on ink, no invert */
[data-stage="dark"] .mc-substrate-stars {
  opacity: ${STAR.opacityDark};
  filter: none;
}

/* ─── Dymaxion (front layer) ─────────────────────────── */
.mc-substrate-img {
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${DYM.sizeDesktop}%;
  height: auto;
  max-width: none;

  /* Light stage: dark continents on parchment */
  opacity: ${DYM.opacityLight};

  will-change: transform;
  backface-visibility: hidden;
  user-select: none;
  pointer-events: none;
}

/* Dark stage: invert dark continents to light */
[data-stage="dark"] .mc-substrate-img {
  opacity: ${DYM.opacityDark};
  filter: invert(1);
}

/* ─── Mobile ─────────────────────────────────────────── */
@media (max-width: 640px) {
  .mc-substrate-stars {
    max-width: ${STAR.maxWidthMobile}px;
    min-width: ${STAR.minWidthMobile}px;
  }
  .mc-substrate-img {
    width: ${DYM.sizeMobile}%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mc-substrate-stars,
  .mc-substrate-img {
    will-change: auto;
  }
}
`
}
