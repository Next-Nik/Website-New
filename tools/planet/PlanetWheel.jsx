// src/tools/planet/PlanetWheel.jsx
// Heptagon wheel for NextUs Map: Planet results
// Wraps NextUsWheel geometry — Planet scale colours and dual-score rendering
// When nextusScores provided, renders two overlapping polygons (self + NextUs)

import { PLANET_DOMAINS, getPlanetScoreColor } from '../../constants/horizonScalePlanet'
import { sc, serif, at } from '../../lib/designTokens'

const MAX_SCORE = 10
const NUM_DOMAINS = 7

function polarToCartesian(cx, cy, r, angleRad) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  }
}

function buildPolygonPoints(cx, cy, maxR, scores, startAngle = -Math.PI / 2) {
  return PLANET_DOMAINS.map((d, i) => {
    const angle = startAngle + (2 * Math.PI * i) / NUM_DOMAINS
    const score = scores[d.key]?.score ?? 0
    const r = (score / MAX_SCORE) * maxR
    return polarToCartesian(cx, cy, r, angle)
  })
}

function pointsToPath(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z'
}

export function PlanetWheel({ scores, nextusScores, size = 400 }) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.40
  const labelR = size * 0.47
  const startAngle = -Math.PI / 2

  // Grid rings at 2, 4, 6, 8, 10
  const gridRings = [2, 4, 6, 8, 10]

  // Spoke endpoints (at max radius)
  const spokes = PLANET_DOMAINS.map((_, i) => {
    const angle = startAngle + (2 * Math.PI * i) / NUM_DOMAINS
    return polarToCartesian(cx, cy, maxR, angle)
  })

  // Self score polygon
  const selfPoints = buildPolygonPoints(cx, cy, maxR, scores, startAngle)
  const selfPath = pointsToPath(selfPoints)

  // NextUs score polygon (if present)
  const nextusPath = nextusScores
    ? pointsToPath(buildPolygonPoints(cx, cy, maxR, nextusScores, startAngle))
    : null

  // Labels
  const labels = PLANET_DOMAINS.map((d, i) => {
    const angle = startAngle + (2 * Math.PI * i) / NUM_DOMAINS
    const pos = polarToCartesian(cx, cy, labelR, angle)
    return { ...d, x: pos.x, y: pos.y, angle }
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      overflow="visible"
    >
      <defs>
        {/* Outer ring glow */}
        <filter id="planet-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid rings */}
      {gridRings.map(ring => {
        const ringR = (ring / MAX_SCORE) * maxR
        const ringPoints = PLANET_DOMAINS.map((_, i) => {
          const angle = startAngle + (2 * Math.PI * i) / NUM_DOMAINS
          return polarToCartesian(cx, cy, ringR, angle)
        })
        return (
          <polygon
            key={ring}
            points={ringPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={ring === 10 ? at.verdigrisEdge : 'rgba(76,107,69,0.12)'}
            strokeWidth={ring === 10 ? 1.5 : 1}
          />
        )
      })}

      {/* Spokes */}
      {spokes.map((end, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={end.x}
          y2={end.y}
          stroke="rgba(76,107,69,0.18)"
          strokeWidth={1}
        />
      ))}

      {/* NextUs assessment polygon (if present) — rendered beneath self */}
      {nextusPath && (
        <path
          d={nextusPath}
          fill="rgba(92,138,184,0.15)"
          stroke="rgba(92,138,184,0.6)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}

      {/* Self assessment polygon */}
      <path
        d={selfPath}
        fill="rgba(76,107,69,0.12)"
        stroke={at.verdigris}
        strokeWidth={2}
        filter="url(#planet-glow)"
      />

      {/* Score dots on self polygon */}
      {selfPoints.map((p, i) => {
        const domain = PLANET_DOMAINS[i]
        const score = scores[domain.key]?.score
        if (!score) return null
        return (
          <circle
            key={domain.key}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={getPlanetScoreColor(score)}
            stroke={at.object}
            strokeWidth={1.5}
          />
        )
      })}

      {/* Domain labels */}
      {labels.map(d => {
        const selfScore = scores[d.key]?.score
        const nextusScore = nextusScores?.[d.key]?.score
        const isRight = d.x > cx + 10
        const isLeft = d.x < cx - 10
        const textAnchor = isRight ? 'start' : isLeft ? 'end' : 'middle'
        const xOffset = isRight ? 6 : isLeft ? -6 : 0

        return (
          <g key={d.key}>
            <text
              x={d.x + xOffset}
              y={d.y - (selfScore ? 8 : 0)}
              textAnchor={textAnchor}
              style={{
                ...sc,
                fontSize: 13,
                letterSpacing: '0.06em',
                fill: d.color,
              }}
            >
              {d.label}
            </text>
            {selfScore && (
              <text
                x={d.x + xOffset}
                y={d.y + 6}
                textAnchor={textAnchor}
                style={{
                  ...serif,
                  fontSize: 13,
                  fill: getPlanetScoreColor(selfScore),
                }}
              >
                {selfScore}{nextusScore ? `·${nextusScore}` : ''}
              </text>
            )}
          </g>
        )
      })}

      {/* Centre point */}
      <circle cx={cx} cy={cy} r={3} fill={at.verdigrisEdge} />

      {/* Legend (if both modes) */}
      {nextusPath && (
        <g transform={`translate(${size - 130}, ${size - 48})`}>
          <line x1={0} y1={8} x2={18} y2={8} stroke={at.verdigris} strokeWidth={2} />
          <text x={22} y={12} style={{ ...sc, fontSize: 13, fill: at.meta }}>Self</text>
          <line x1={0} y1={22} x2={18} y2={22} stroke="rgba(92,138,184,0.7)" strokeWidth={1.5} strokeDasharray="4 3" />
          <text x={22} y={26} style={{ ...sc, fontSize: 13, fill: at.meta }}>NextUs</text>
        </g>
      )}
    </svg>
  )
}
