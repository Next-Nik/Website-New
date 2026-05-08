// ─────────────────────────────────────────────────────────────
// WorldMapSubstrate.jsx
//
// Two-layer substrate behind the wheel.
//   Layer 1 (back):  Star map — celestial chart, faint
//   Layer 2 (front): Fuller's Dymaxion projection
//
// Both SVGs ship with DARK fills on transparent backgrounds.
//   • Light stage: render as-is (dark on parchment), low opacity
//   • Dark stage:  filter:invert(1) flips dark to light (white on ink)
//
// No mix-blend-modes. Plain opacity. Predictable across browsers.
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
// ║  parallax speed for both substrate layers.                ║
// ╚═══════════════════════════════════════════════════════════╝

// ─── DYMAXION (front layer, the world map) ───
const DYM = {
  // Size — width as % of the substrate container.
  // 100 = same width as container. >100 bleeds wider. <100 sits inside.
  sizeDesktop: 120,
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

  // Opacity. Star map ships with dark fills.
  // Light stage = dark stars on parchment.
  // Dark stage = filter inverts to light stars on ink.
  opacityLight: 0.10,
  opacityDark:  0.20,

  // Parallax — should be lower than DYM.parallax so stars feel deeper.
  parallax: 0.2,
}


// ─────────────────────────────────────────────────────────────
// Implementation. Don't edit unless changing structure.
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
/* SVG has dark fills on transparent. No filter on light. */
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

/* Dark stage: invert dark fills to light */
[data-stage="dark"] .mc-substrate-stars {
  opacity: ${STAR.opacityDark};
  filter: invert(1);
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
