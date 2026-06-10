// ─────────────────────────────────────────────────────────────
// WorldWheel.jsx
//
// Civilisational wheel — used in WorldView panel and First Light.
// Renders the seven civ domains as a heptagon with optional live
// score polygon (same data that drives Mission Control).
//
// Props:
//   dimensions  Array<{ slug, label, color? }>   — domain order + colours
//   current     Object<slug, number>             — live scores 0–10 (optional)
//   placement   string | null                    — slug to mark with a dot
//   size        number (default 320)             — px square
//   dark        boolean (default false)          — light labels for dark bg
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { GOLD, FONT_SC, TEXT_META, GOLD_DK } from './tokens'

const N = 7

function angleFor(i) { return (Math.PI * 2 * i) / N - Math.PI / 2 }

// Label positions are hand-tuned per spoke to avoid the polygon edge.
// GAP values are relative to the spoke tip — positive = away from centre.
function labelPositionFor(idx, tipX, tipY, cx, cy) {
  const dx = tipX - cx
  const dy = tipY - cy
  const GAP = 18
  // Normalise direction from centre to tip
  const len = Math.sqrt(dx * dx + dy * dy)
  const nx = len > 0 ? dx / len : 0
  const ny = len > 0 ? dy / len : 0
  // Anchor: left side of wheel = end, right = start, top/bottom = middle
  const anchor = nx > 0.3 ? 'start' : nx < -0.3 ? 'end' : 'middle'
  return {
    x: tipX + nx * GAP,
    y: tipY + ny * GAP + (Math.abs(nx) < 0.3 ? (ny < 0 ? -4 : 6) : 0),
    anchor,
  }
}

export default function WorldWheel({ dimensions, current = {}, placement = null, size = 320, dark = false }) {
  // Extra padding in the viewBox so labels never clip against the SVG edge
  const PAD   = 52
  const VB    = size + PAD * 2
  const cx    = VB / 2
  const cy    = VB / 2 + 6   // slight downward offset keeps top label clear
  const maxR  = (size / 2) * 0.58

  const geometry = useMemo(() => {
    const outer  = []
    const spokes = []
    const labels = []
    for (let i = 0; i < N; i++) {
      const a  = angleFor(i)
      const tx = cx + maxR * Math.cos(a)
      const ty = cy + maxR * Math.sin(a)
      outer.push(`${tx.toFixed(2)},${ty.toFixed(2)}`)
      spokes.push({ x1: cx, y1: cy, x2: tx, y2: ty })
      const dom = dimensions[i]
      if (dom) {
        const pos = labelPositionFor(i, tx, ty, cx, cy)
        labels.push({ ...pos, text: dom.label.toUpperCase(), slug: dom.slug, active: dom.slug === placement, color: dom.color })
      }
    }
    return { outerPts: outer.join(' '), spokes, labels }
  }, [cx, cy, maxR, dimensions, placement])

  // Score polygon — same logic as MissionWheel civ side
  const scorePolygon = useMemo(() => {
    const scored = dimensions.filter(d => current[d.slug] != null)
    if (scored.length < 3) return null
    const pts = dimensions.map((d, i) => {
      const score = current[d.slug]
      const ratio = score != null ? Math.min(score / 10, 1) : 0
      const minR  = maxR * 0.08  // minimum visible dot even at score=0
      const r     = score != null ? Math.max(minR, ratio * maxR) : 0
      const a     = angleFor(i)
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), score, color: d.color, slug: d.slug }
    })
    return pts
  }, [cx, cy, maxR, dimensions, current])

  // Inner reference rings at 0.33 and 0.66
  const innerRings = [0.33, 0.66].map(f => {
    const pts = []
    for (let i = 0; i < N; i++) {
      const a = angleFor(i)
      pts.push(`${(cx + f * maxR * Math.cos(a)).toFixed(2)},${(cy + f * maxR * Math.sin(a)).toFixed(2)}`)
    }
    return pts.join(' ')
  })

  // Placement marker dot
  let placementMarker = null
  if (placement) {
    const idx = dimensions.findIndex(d => d.slug === placement)
    if (idx >= 0) {
      const a = angleFor(idx)
      const x = cx + 0.66 * maxR * Math.cos(a)
      const y = cy + 0.66 * maxR * Math.sin(a)
      placementMarker = { x, y, color: dimensions[idx].color || GOLD }
    }
  }

  const labelFill       = dark ? 'rgba(250,250,247,0.85)' : TEXT_META
  const labelFillActive = GOLD_DK
  const spokeColor      = dark ? 'rgba(200,146,42,0.55)' : 'rgba(200,146,42,0.45)'
  const ringColor       = dark ? 'rgba(200,146,42,0.22)' : 'rgba(200,146,42,0.18)'
  const outerColor      = dark ? 'rgba(200,146,42,0.40)' : 'rgba(200,146,42,0.32)'
  const polyFill        = dark ? 'rgba(200,146,42,0.18)' : 'rgba(200,146,42,0.12)'
  const polyStroke      = dark ? 'rgba(200,146,42,0.9)'  : 'rgba(200,146,42,0.7)'

  return (
    <svg
      width={VB}
      height={VB}
      viewBox={`0 0 ${VB} ${VB}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Outer heptagon */}
      <polygon points={geometry.outerPts} fill="none" stroke={outerColor} strokeWidth="1" strokeDasharray="3 3" />

      {/* Inner reference rings */}
      {innerRings.map((pts, i) => (
        <polygon key={`ring-${i}`} points={pts} fill="none" stroke={ringColor} strokeWidth="1" />
      ))}

      {/* Spokes */}
      {geometry.spokes.map((sp, i) => (
        <line key={`spoke-${i}`} x1={sp.x1} y1={sp.y1} x2={sp.x2} y2={sp.y2} stroke={spokeColor} strokeWidth="1" />
      ))}

      {/* Live score polygon */}
      {scorePolygon && (
        <>
          <polygon
            points={scorePolygon.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
            fill={polyFill}
            stroke={polyStroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {scorePolygon.map((p, i) => p.score != null && (
            <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={4.5} fill={p.color || GOLD} opacity={0.92} />
          ))}
        </>
      )}

      {/* Domain labels — rendered last so they sit above everything */}
      {geometry.labels.map(l => (
        <text
          key={`label-${l.slug}`}
          x={l.x} y={l.y}
          textAnchor={l.anchor}
          dominantBaseline="middle"
          fontFamily={FONT_SC}
          fontSize={dark ? 11 : 12}
          fontWeight={600}
          letterSpacing="0.14em"
          fill={l.active ? labelFillActive : labelFill}
        >
          {l.text}
        </text>
      ))}

      {/* Placement marker */}
      {placementMarker && (
        <circle cx={placementMarker.x} cy={placementMarker.y} r={9} fill={placementMarker.color} opacity={0.95} />
      )}
    </svg>
  )
}
