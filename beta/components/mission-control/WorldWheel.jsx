// ─────────────────────────────────────────────────────────────
// WorldWheel.jsx
//
// Full-size civilisational wheel for the WorldView panel. Seven
// civ domains around the rim, with the user's placed domain marked
// at scale-appropriate radial distance.
//
// Props:
//   dimensions: Array<{ slug: string, label: string, color?: string }>
//   horizons:   Object<dimensionSlug, number>   // not used today; reserved for future horizon overlay
//   current:    Object<dimensionSlug, number>   // not used today; reserved for engaged-domain rendering
//   placement:  string | null                   // slug of currently-placed domain
//   size:       number (default 320)            // px square
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { GOLD, FONT_SC, TEXT_META, GOLD_DK } from './tokens'

const N = 7

function angleFor(i) { return (Math.PI * 2 * i) / N - Math.PI / 2 }

function labelPositionFor(idx, tipX, tipY) {
  const spokeNum = idx + 1
  const GAP = 8
  const ABOVE_GAP = 14
  switch (spokeNum) {
    case 1: return { x: tipX, y: tipY - ABOVE_GAP, anchor: 'middle' }
    case 2: return { x: tipX + GAP, y: tipY - 4, anchor: 'start' }
    case 3: return { x: tipX + GAP, y: tipY - 6, anchor: 'start' }
    case 4: return { x: tipX + GAP, y: tipY + 14, anchor: 'start' }
    case 5: return { x: tipX - GAP, y: tipY + 14, anchor: 'end' }
    case 6: return { x: tipX - GAP, y: tipY - 6, anchor: 'end' }
    case 7: return { x: tipX - GAP, y: tipY - 4, anchor: 'end' }
    default: return { x: tipX, y: tipY, anchor: 'middle' }
  }
}

/**
 * @param {Object} props
 * @param {Array<{slug: string, label: string, color?: string}>} props.dimensions
 * @param {string|null} [props.placement]
 * @param {number} [props.size]
 */
export default function WorldWheel({ dimensions, placement = null, size = 320 }) {
  const cx = size / 2
  const cy = size / 2 + 10
  const maxR = (size / 2) * 0.58

  const geometry = useMemo(() => {
    const outer = []
    const spokes = []
    const labels = []
    for (let i = 0; i < N; i++) {
      const a = angleFor(i)
      const tx = cx + maxR * Math.cos(a)
      const ty = cy + maxR * Math.sin(a)
      outer.push(`${tx},${ty}`)
      spokes.push({ x1: cx, y1: cy, x2: tx, y2: ty })
      const dom = dimensions[i]
      if (dom) {
        const pos = labelPositionFor(i, tx, ty)
        labels.push({ ...pos, text: dom.label.toUpperCase(), active: dom.slug === placement, slug: dom.slug })
      }
    }
    return { outerPts: outer.join(' '), spokes, labels }
  }, [cx, cy, maxR, dimensions, placement])

  // Placement marker: at fraction 0.66 of maxR on the placed domain's spoke
  let placementMarker = null
  if (placement) {
    const idx = dimensions.findIndex(d => d.slug === placement)
    if (idx >= 0) {
      const a = angleFor(idx)
      const x = cx + 0.66 * maxR * Math.cos(a)
      const y = cy + 0.66 * maxR * Math.sin(a)
      const color = dimensions[idx].color || GOLD
      placementMarker = { x, y, color }
    }
  }

  // Inner reference rings at 0.33 and 0.66
  const innerRings = [0.33, 0.66].map(f => {
    const pts = []
    for (let i = 0; i < N; i++) {
      const a = angleFor(i)
      pts.push(`${cx + f * maxR * Math.cos(a)},${cy + f * maxR * Math.sin(a)}`)
    }
    return pts.join(' ')
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
    >
      {/* Outer heptagon */}
      <polygon
        points={geometry.outerPts}
        fill="none"
        stroke="rgba(200,146,42,0.32)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      {/* Inner reference rings */}
      {innerRings.map((pts, i) => (
        <polygon key={`ring-${i}`} points={pts} fill="none" stroke="rgba(200,146,42,0.18)" strokeWidth="1" />
      ))}
      {/* Spokes */}
      {geometry.spokes.map((s, i) => (
        <line key={`spoke-${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="rgba(200,146,42,0.45)" strokeWidth="1" />
      ))}
      {/* Domain labels */}
      {geometry.labels.map((l, i) => (
        <text
          key={`label-${l.slug}`}
          x={l.x} y={l.y}
          textAnchor={l.anchor}
          style={{
            fontFamily: FONT_SC,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.16em',
            fill: l.active ? GOLD_DK : TEXT_META,
            textTransform: 'uppercase',
          }}
        >
          {l.text}
        </text>
      ))}
      {/* Placement marker */}
      {placementMarker && (
        <circle
          cx={placementMarker.x}
          cy={placementMarker.y}
          r={9}
          fill={placementMarker.color}
          opacity={0.95}
        />
      )}
    </svg>
  )
}
