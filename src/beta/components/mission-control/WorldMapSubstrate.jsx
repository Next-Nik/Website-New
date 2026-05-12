// ─────────────────────────────────────────────────────────────
// WorldMapSubstrate.jsx
//
// Two-layer substrate behind the wheel.
//   Layer 1 (back):  Star map — celestial chart, faint
//   Layer 2 (front): Fuller's Dymaxion projection
//
// Both SVGs ship with DARK content on transparent backgrounds.
//   • Light stage: render as-is (dark on parchment), low opacity
//   • Dark stage:  filter:invert(1) flips dark to light
//
// No mix-blend-modes. Plain opacity. Predictable everywhere.
//
// Parallax: scroll-driven, two speeds.
//   • Star map → STAR.parallax (slowest, deepest)
//   • Dymaxion → DYM.parallax
//   • Foreground (rails, wheel, cards) → 1.0x normal
//
// Honors prefers-reduced-motion: no parallax for those users.
// ─────────────────────────────────────────────────────────────


// ╔═══════════════════════════════════════════════════════════╗
// ║                       TUNING KNOBS                        ║
// ║                                                           ║
// ║  Edit these values to change size, position, opacity, and ║
// ║  parallax speed for both substrate layers.                ║
// ╚═══════════════════════════════════════════════════════════╝

// ─── DYMAXION (front layer, the world map) ───
const DYM = {
  // Size — width as % of the substrate container.
  // 100 = same width as container. >100 bleeds wider. <100 sits inside.
  sizeDesktop: 55,
  sizeMobile:  140,

  // Position offset from centre. 0 = perfectly centred.
  // Positive offsetY pushes DOWN, negative pushes UP.
  // Positive offsetX pushes RIGHT, negative pushes LEFT.
  offsetX: 0,
  offsetY: 0,

  // Opacity (0.0 transparent → 1.0 fully visible).
  opacityLight: 0.15,
  opacityDark:  0.25,

  // Parallax — fraction of scroll distance the layer moves.
  // 0 = locked. 1 = scrolls with content. Lower = appears deeper.
  parallax: 0.4,
}

// ─── STAR MAP (back layer, constellations) ───
const STAR = {
  // Size — bounded by max/min width in pixels.
  maxWidthDesktop: 1200,
  minWidthDesktop: 600,
  maxWidthMobile:  700,
  minWidthMobile:  400,

  // Position offset from centre.
  offsetX: 0,
  offsetY: 0,

  // Opacity. SVG ships with dark content on transparent.
  // Light stage = dark stars on parchment.
  // Dark stage = filter inverts to light stars on ink.
  opacityLight: 0.04,
  opacityDark:  0.04,

  // Parallax — should be lower than DYM.parallax so stars feel deeper.
  parallax: 0.2,
}

// ─── HALO (soft fade between star map and Dymaxion) ───
// A radial gradient div sits between the star map (back) and the
// Dymaxion (front). It locally fades the star map within the
// Dymaxion's footprint so the world map stands out without
// erasing any of the actual star map.
//
// The halo follows the Dymaxion's parallax (same scroll speed)
// so the fade region travels with the world map.
const HALO = {
  // Size — width as % of the substrate container. Match or slightly
  // exceed DYM.sizeDesktop so the fade extends just past the world
  // map's silhouette. Too small and the world map's edges still sit
  // on stars; too large and the halo eats too much of the star map.
  sizeDesktop: 70,
  sizeMobile:  160,

  // Position offset from centre — should match DYM.offset to follow
  // the world map.
  offsetX: 0,
  offsetY: 0,

  // Intensity — how strongly the halo fades the star map at center.
  //   0 = no halo (star map fully visible behind world map)
  //   1 = full parchment/ink at center (star map invisible behind world map)
  // Lower values are subtler. Tune to taste.
  intensityLight: 0.85,
  intensityDark:  0.85,

  // Softness — how quickly the halo falls off to transparent at the
  // edge. Expressed as the inner-radius % at which the gradient
  // starts to fade. Higher = harder edge, lower = softer falloff.
  //   60 = solid for inner 60%, fades over outer 40%
  //   30 = solid only inner 30%, long soft falloff
  softness: 35,

  // Parallax — match DYM.parallax so halo travels with world map.
  parallax: 0.4,
}


// ─────────────────────────────────────────────────────────────
// Implementation. Don't edit unless changing structure.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'

export default function WorldMapSubstrate() {
  const starRef = useRef(null)
  const haloRef = useRef(null)
  const dymRef  = useRef(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    let ticking = false
    let lastScrollY = 0

    const update = () => {
      const y = lastScrollY
      if (starRef.current) {
        const dy = STAR.offsetY + (y * STAR.parallax)
        const dx = STAR.offsetX
        starRef.current.style.transform =
          `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0)`
      }
      if (dymRef.current) {
        const dy = DYM.offsetY + (y * DYM.parallax)
        const dx = DYM.offsetX
        dymRef.current.style.transform =
          `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0)`
      }
      if (haloRef.current) {
        const dy = HALO.offsetY + (y * HALO.parallax)
        const dx = HALO.offsetX
        haloRef.current.style.transform =
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

  const initialStarTransform =
    `translate(calc(-50% + ${STAR.offsetX}px), calc(-50% + ${STAR.offsetY}px))`
  const initialDymTransform =
    `translate(calc(-50% + ${DYM.offsetX}px), calc(-50% + ${DYM.offsetY}px))`
  const initialHaloTransform =
    `translate(calc(-50% + ${HALO.offsetX}px), calc(-50% + ${HALO.offsetY}px))`

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

      {/* Halo: soft radial fade between star map and Dymaxion.
          Locally fades the star map within the world map's
          footprint without erasing it. Travels with the
          Dymaxion via shared parallax speed. */}
      <div
        ref={haloRef}
        className="mc-substrate-halo"
        style={{ transform: initialHaloTransform }}
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

function buildCSS() {
  return `
.mc-substrate {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

/* ─── Star map (back layer) ──────────────────────────── */
/* SVG has dark content on transparent. Renders directly on light. */
.mc-substrate-stars {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: auto;
  max-width: ${STAR.maxWidthDesktop}px;
  min-width: ${STAR.minWidthDesktop}px;

  opacity: ${STAR.opacityLight};

  will-change: transform;
  backface-visibility: hidden;
  user-select: none;
  pointer-events: none;
}

/* Dark stage: invert dark content to light */
[data-stage="dark"] .mc-substrate-stars {
  opacity: ${STAR.opacityDark};
  filter: invert(1);
}

/* ─── Halo (mid layer) ───────────────────────────────── */
/* Radial gradient div sitting between stars and Dymaxion.
   Soft circular fade from parchment (centre) to transparent
   (edge). Erases the star map locally so the world map
   stands out, without altering the star map asset itself. */
.mc-substrate-halo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${HALO.sizeDesktop}%;
  aspect-ratio: 1 / 1;
  background: radial-gradient(
    circle at center,
    rgba(250, 250, 247, ${HALO.intensityLight}) 0%,
    rgba(250, 250, 247, ${HALO.intensityLight}) ${HALO.softness}%,
    rgba(250, 250, 247, 0) 100%
  );
  border-radius: 50%;

  will-change: transform;
  backface-visibility: hidden;
  pointer-events: none;
}

[data-stage="dark"] .mc-substrate-halo {
  background: radial-gradient(
    circle at center,
    rgba(15, 21, 35, ${HALO.intensityDark}) 0%,
    rgba(15, 21, 35, ${HALO.intensityDark}) ${HALO.softness}%,
    rgba(15, 21, 35, 0) 100%
  );
}

/* ─── Dymaxion (front layer) ─────────────────────────── */
.mc-substrate-img {
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${DYM.sizeDesktop}%;
  height: auto;
  max-width: none;

  opacity: ${DYM.opacityLight};

  will-change: transform;
  backface-visibility: hidden;
  user-select: none;
  pointer-events: none;
}

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
  .mc-substrate-halo {
    width: ${HALO.sizeMobile}%;
  }
  .mc-substrate-img {
    width: ${DYM.sizeMobile}%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mc-substrate-stars,
  .mc-substrate-halo,
  .mc-substrate-img {
    will-change: auto;
  }
}
`
}
