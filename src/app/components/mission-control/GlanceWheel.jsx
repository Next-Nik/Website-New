// ─────────────────────────────────────────────────────────────
// GlanceWheel.jsx
//
// Compact radial wheel for the Mission Control top strip. Shows
// the user's seven personal-dimension scores at a glance. Click
// expands the WorldView (or whatever opener wraps it).
//
// May 2026 update — domain colour identity:
//   Vertex dots now carry domain colour rather than a tier (Scale)
//   reading. Position on the spoke gives fluency (close to Horizon
//   = far from centre); colour gives identity (which domain). The
//   polygon fill and stroke stay GOLD — the user's life as one
//   through-line shape.
//
// Props:
//   dimensions: Array<{ key: string, label: string }>
//   horizons:   Object<dimensionKey, number>   // user's horizon-target per dimension
//   current:    Object<dimensionKey, number>   // user's current score per dimension
//   size:       number (default 56)            // px square
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { GOLD } from './tokens'
import { selfColor } from '../../../constants/domainColors'

const N = 7

function angleFor(i) { return (Math.PI * 2 * i) / N - Math.PI / 2 }

/**
 * @param {Object} props
 * @param {Array<{key: string, label: string}>} props.dimensions
 * @param {Object} props.horizons
 * @param {Object} props.current
 * @param {number} [props.size]
 */
export default function GlanceWheel({ dimensions, horizons = {}, current = {}, size = 56 }) {
  const cx = size / 2
  const cy = size / 2
  const maxR = (size / 2) * 0.78

  const { ringPts, polyPts, vertColors, hasData } = useMemo(() => {
    const ring = []
    const poly = []
    const colors = []
    let any = false
    for (let i = 0; i < N; i++) {
      const a = angleFor(i)
      const dim = dimensions[i]
      ring.push(`${cx + maxR * Math.cos(a)},${cy + maxR * Math.sin(a)}`)
      const c = dim ? current[dim.key] : null
      const h = dim ? horizons[dim.key] : null
      if (c != null && h) any = true
      const ratio = (c != null && h) ? Math.min(c / h, 1) : 0
      const r = ratio * maxR
      poly.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`)
      // Domain colour replaces tier colour.
      colors.push(dim ? selfColor(dim.key).base : 'rgba(200,146,42,0.5)')
    }
    return { ringPts: ring.join(' '), polyPts: poly.join(' '), vertColors: colors, hasData: any }
  }, [dimensions, horizons, current, cx, cy, maxR])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* Outer heptagon */}
      <polygon
        points={ringPts}
        fill="none"
        stroke="rgba(200,146,42,0.32)"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      {/* Spokes */}
      {Array.from({ length: N }).map((_, i) => {
        const a = angleFor(i)
        return (
          <line
            key={`spoke-${i}`}
            x1={cx} y1={cy}
            x2={cx + maxR * Math.cos(a)}
            y2={cy + maxR * Math.sin(a)}
            stroke="rgba(200,146,42,0.32)"
            strokeWidth="1"
          />
        )
      })}
      {hasData && (
        <>
          <polygon
            points={polyPts}
            fill="rgba(200,146,42,0.14)"
            stroke={GOLD}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {polyPts.split(' ').map((pt, i) => {
            const [x, y] = pt.split(',').map(Number)
            return <circle key={`v-${i}`} cx={x} cy={y} r={1.8} fill={vertColors[i]} />
          })}
        </>
      )}
    </svg>
  )
}
