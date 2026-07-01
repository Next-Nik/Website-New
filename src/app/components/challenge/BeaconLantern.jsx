// src/app/components/challenge/BeaconLantern.jsx
//
// The lantern, alive. A coded rebuild of the beacon artwork: gold frame,
// glass full of constellation, the NextUs compass at the base. Every star
// twinkles on its own clock, the core breathes, motes rise inside the glass,
// and a few sparks drift beyond the frame — the light does not stay inside.
//
// Data-reactive: the number of stars scales with the live spark count, so the
// lantern visibly fills as the constellation works. Layout is seeded, not
// random per render — the sky holds still between visits.
//
// Design laws honoured: no style= props on SVG elements (Chrome 148). All
// animation lives in a scoped <style> block; per-star timing comes from a
// spread of variant classes, assigned by seed. prefers-reduced-motion stills
// everything to a lit, steady lantern.

import { useMemo } from 'react'

// Deterministic PRNG so the constellation doesn't reshuffle on re-render.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Glass interior in viewBox units (viewBox 0 0 240 360).
const GLASS = { x: 62, y: 78, w: 116, h: 210, r: 18 }
const TWINKLE_VARIANTS = 8
const RISE_VARIANTS = 5

function buildSky(starCount, seed = 7) {
  const rnd = mulberry32(seed)
  const stars = []
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: GLASS.x + 10 + rnd() * (GLASS.w - 20),
      y: GLASS.y + 10 + rnd() * (GLASS.h - 20),
      r: 0.9 + rnd() * 1.7,
      v: Math.floor(rnd() * TWINKLE_VARIANTS),
    })
  }
  // Constellation lines: nearest neighbour each, plus a few short second
  // links so the net reads as a web, not a chain.
  const lines = []
  stars.forEach((s, i) => {
    let best = -1, bestD = Infinity
    stars.forEach((o, j) => {
      if (i === j) return
      const d = (s.x - o.x) ** 2 + (s.y - o.y) ** 2
      if (d < bestD) { bestD = d; best = j }
    })
    if (best > i) lines.push([i, best])
    if (rnd() < 0.3) {
      const j = Math.floor(rnd() * stars.length)
      if (j !== i && Math.hypot(s.x - stars[j].x, s.y - stars[j].y) < 55) lines.push([i, j])
    }
  })
  // A handful of free sparks outside the glass — the light escaping.
  const motes = []
  for (let i = 0; i < 10; i++) {
    const side = rnd() < 0.5 ? -1 : 1
    motes.push({
      x: 120 + side * (72 + rnd() * 42),
      y: 100 + rnd() * 200,
      r: 0.8 + rnd() * 1.3,
      v: Math.floor(rnd() * TWINKLE_VARIANTS),
    })
  }
  return { stars, lines, motes }
}

// One twinkle keyframe, eight clocks: varied duration and negative delays so
// the sky is mid-motion from the first paint, never synchronised.
function timingCss() {
  let css = ''
  for (let i = 0; i < TWINKLE_VARIANTS; i++) {
    const dur = (2.6 + i * 0.45).toFixed(2)
    const delay = (-(i * 1.15) % 6).toFixed(2)
    css += `.nxbl-t${i} { animation: nxblTwinkle ${dur}s ease-in-out ${delay}s infinite; transform-box: fill-box; transform-origin: center; }\n`
  }
  for (let i = 0; i < RISE_VARIANTS; i++) {
    const dur = (5 + i * 1.3).toFixed(2)
    const delay = (-(i * 2.1)).toFixed(2)
    css += `.nxbl-r${i} { animation: nxblRise ${dur}s linear ${delay}s infinite; }\n`
  }
  return css
}

export default function BeaconLantern({ sparks = 0, width = 168 }) {
  // 20 stars lit and waiting; one more for every 25 sparks; the glass holds ~64.
  const starCount = Math.min(64, 20 + Math.floor(Number(sparks || 0) / 25))
  const sky = useMemo(() => buildSky(starCount), [starCount])
  const height = Math.round(width * 1.5)

  return (
    <div className="nxbl" aria-hidden="true">
      <style>{`
        .nxbl { display: inline-block; line-height: 0; }
        ${timingCss()}
        .nxbl-core { animation: nxblBreathe 4.5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .nxbl-halo { animation: nxblHalo 4.5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .nxbl-net  { animation: nxblNet 7s ease-in-out infinite; }
        @keyframes nxblTwinkle { 0%, 100% { opacity: 0.35; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.15); } }
        @keyframes nxblBreathe { 0%, 100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
        @keyframes nxblHalo { 0%, 100% { opacity: 0.30; transform: scale(1); } 50% { opacity: 0.55; transform: scale(1.18); } }
        @keyframes nxblRise { 0% { transform: translateY(6px); opacity: 0; } 18% { opacity: 0.9; } 82% { opacity: 0.9; } 100% { transform: translateY(-26px); opacity: 0; } }
        @keyframes nxblNet { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.85; } }
        @media (prefers-reduced-motion: reduce) {
          .nxbl [class^="nxbl-"] { animation: none !important; }
        }
      `}</style>
      <svg width={width} height={height} viewBox="0 0 240 360" fill="none">
        <defs>
          <radialGradient id="nxblGlow" cx="50%" cy="52%" r="60%">
            <stop offset="0%" stopColor="#F2C45A" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#C8922A" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#C8922A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nxblCoreG" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF3D0" />
            <stop offset="40%" stopColor="#F2C45A" />
            <stop offset="100%" stopColor="#F2C45A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="nxblMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8C06A" />
            <stop offset="50%" stopColor="#C8922A" />
            <stop offset="100%" stopColor="#8A6320" />
          </linearGradient>
          <clipPath id="nxblGlass">
            <rect x={GLASS.x} y={GLASS.y} width={GLASS.w} height={GLASS.h} rx={GLASS.r} />
          </clipPath>
        </defs>

        {/* ambient glow behind everything */}
        <ellipse className="nxbl-halo" cx="120" cy="188" rx="112" ry="130" fill="url(#nxblGlow)" />

        {/* free sparks outside the glass */}
        {sky.motes.map((m, i) => (
          <circle key={`m${i}`} className={`nxbl-t${m.v}`} cx={m.x} cy={m.y} r={m.r} fill="#F2C45A" />
        ))}

        {/* handle */}
        <path d="M96 44 A24 24 0 0 1 144 44" stroke="url(#nxblMetal)" strokeWidth="7" strokeLinecap="round" />
        {/* cap */}
        <path d="M84 46 L156 46 L172 70 L68 70 Z" fill="url(#nxblMetal)" />
        {/* glass rim */}
        <rect x={GLASS.x - 6} y={GLASS.y - 6} width={GLASS.w + 12} height={GLASS.h + 12} rx={GLASS.r + 5}
          stroke="url(#nxblMetal)" strokeWidth="6" fill="#141019" />

        {/* inside the glass */}
        <g clipPath="url(#nxblGlass)">
          <rect x={GLASS.x} y={GLASS.y} width={GLASS.w} height={GLASS.h} fill="#141019" />
          {/* constellation net */}
          <g className="nxbl-net" stroke="#C8922A" strokeWidth="0.6" strokeOpacity="0.55">
            {sky.lines.map(([a, b], i) => (
              <line key={`l${i}`} x1={sky.stars[a].x} y1={sky.stars[a].y} x2={sky.stars[b].x} y2={sky.stars[b].y} />
            ))}
          </g>
          {/* stars */}
          {sky.stars.map((st, i) => (
            <circle key={`s${i}`} className={`nxbl-t${st.v}`} cx={st.x} cy={st.y} r={st.r} fill="#F2C45A" />
          ))}
          {/* cross-glints on the brightest stars — the artwork's signature */}
          {sky.stars.filter(st => st.r > 2).map((st, i) => (
            <g key={`g${i}`} className={`nxbl-t${st.v}`} stroke="#FFE6A8" strokeWidth="0.55" strokeOpacity="0.85">
              <line x1={st.x - st.r * 3.2} y1={st.y} x2={st.x + st.r * 3.2} y2={st.y} />
              <line x1={st.x} y1={st.y - st.r * 3.2} x2={st.x} y2={st.y + st.r * 3.2} />
            </g>
          ))}
          {/* rising motes */}
          {sky.stars.slice(0, RISE_VARIANTS).map((st, i) => (
            <circle key={`r${i}`} className={`nxbl-r${i}`} cx={st.x + 4} cy={st.y + 12} r="0.9" fill="#FFE6A8" />
          ))}
          {/* the core */}
          <circle className="nxbl-core" cx="120" cy="182" r="34" fill="url(#nxblCoreG)" />
          <path className="nxbl-core" d="M120 132 L123 176 L120 232 L117 176 Z" fill="#FFF3D0" fillOpacity="0.9" />
          <path className="nxbl-core" d="M78 182 L116 179 L162 182 L116 185 Z" fill="#FFF3D0" fillOpacity="0.7" />
        </g>

        {/* base */}
        <path d="M64 294 L176 294 L164 340 L76 340 Z" fill="url(#nxblMetal)" />
        <path d="M66 296 L174 296 L163 337 L77 337 Z" fill="#1B2233" />
        {/* compass mark */}
        <circle cx="120" cy="316" r="13" stroke="#C8922A" strokeWidth="1.6" />
        <path d="M120 303 L122 313 L120 329 L118 313 Z" fill="#C8922A" />
        <circle cx="120" cy="316" r="2.2" fill="#141019" stroke="#C8922A" strokeWidth="1" />
      </svg>
    </div>
  )
}
