// ─────────────────────────────────────────────────────────────
// MissionWheel.jsx
//
// The v4 cockpit instrument. Replaces the v3 GlanceWheel +
// WorldWheel pair with a single component that renders either
// the personal seven-domain wheel or the civilisational seven-
// domain wheel, depending on `kind`.
//
// Centerpiece behaviours (v4 spec):
//   • Heptagon ring with seven labelled spokes
//   • Current-state polygon, normalised to each spoke's horizon
//     so the user aims at their own horizon, not a platform ceiling
//     (Self Wheel renormalisation principle, locked)
//   • Empty-state: dashed polygon with small centre marker when
//     no current scores have flowed yet
//   • Sprint glow: a pulsing dot at the active sprint's vertex
//     (personal wheel only)
//   • Placement marker: a pulsing ring outside the placement spoke
//     (civ wheel only)
//   • Walker cluster: a cluster of dots with "N walking" label,
//     concentrated on the active sprint or placement spoke. RENDERS
//     ONLY WHEN walkers[focusKey] > 0. Empty by default — wire-up
//     point lives in BetaMissionControl when contributor-density
//     queries are built.
//
// Props:
//   kind:        'personal' | 'civ'
//   labels:      [string×7]   — DISPLAYED labels in spoke order
//   keys:        [string×7]   — KEY identifiers in spoke order
//   horizons:    Object<key, number>   — user's horizon target (personal) or 10 (civ)
//   current:     Object<key, number|null>   — current score; null means unset
//   activeKey:   string | null   — sprint glow target (personal)
//   placementKey:string | null   — placement marker target (civ)
//   walkers:     Object<key, number>   — cluster counts; empty {} means none rendered
//   isEmpty:     boolean   — force the dashed empty-polygon state
//   dark:        boolean   — render against ink background (civ stage)
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE,
  BG_CARD, BG_INK,
  TEXT_META, TEXT_WHITE_META, TEXT_FAINT, TEXT_WHITE_FAINT,
  FONT_SC,
} from './tokens'

const N = 7
const SVG_W = 380
const SVG_H = 320
const SVG_VIEWBOX = `-30 -10 ${SVG_W} ${SVG_H}`
const FACTOR = 0.62  // how much of the inner box the heptagon fills

function angleFor(i) { return (Math.PI * 2 * i) / N - Math.PI / 2 }

// Vertex colour by ratio-of-horizon (current / horizon). The user's
// own horizon is the spoke's maximum, so the same ratio means the
// same colour regardless of where their horizon is set.
function tierColor(current, horizon) {
  if (horizon === 0 || current == null || current === 0) return GOLD_DK
  const ratio = current / horizon
  if (ratio < 0.45) return GOLD_DK
  if (ratio < 0.75) return GOLD
  return GOLD_LT
}

// Label position keyed off spoke number (1..7). Lifted directly from
// the v4 mockup so the seven labels never collide with the heptagon
// vertices regardless of horizon configuration.
function labelPositionFor(idx, tipX, tipY) {
  const spokeNum = idx + 1
  const GAP = 12
  const ABOVE_GAP = 18
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
 * @param {'personal'|'civ'} props.kind
 * @param {string[]} props.labels
 * @param {string[]} props.keys
 * @param {Object<string, number>} [props.horizons]
 * @param {Object<string, number|null>} [props.current]
 * @param {string|null} [props.activeKey]
 * @param {string|null} [props.placementKey]
 * @param {Object<string, number>} [props.walkers]
 * @param {boolean} [props.isEmpty]
 * @param {boolean} [props.dark]
 */
export default function MissionWheel({
  kind,
  labels,
  keys,
  horizons = {},
  current = {},
  activeKey = null,
  placementKey = null,
  walkers = {},
  isEmpty = false,
  dark = false,
}) {
  const cx = SVG_W / 2
  const cy = SVG_H / 2 + 10
  const maxR = Math.min(SVG_W, SVG_H) / 2 * FACTOR

  // For empty state, treat horizons as a uniform 10 so spokes still
  // render full length. The polygon is replaced with a small dashed
  // centre marker rather than a degenerate zero-area shape.
  const hasAnyCurrent = useMemo(() => {
    if (isEmpty) return false
    return keys.some(k => current[k] != null)
  }, [isEmpty, keys, current])

  const renderHorizons = useMemo(() => {
    if (hasAnyCurrent) return horizons
    return Object.fromEntries(keys.map(k => [k, 10]))
  }, [hasAnyCurrent, horizons, keys])

  const showEmpty = !hasAnyCurrent

  // Vertex coords
  const verts = useMemo(() => {
    return keys.map((k, i) => {
      const h = renderHorizons[k] || 10
      const c = showEmpty ? 0 : (current[k] ?? 0)
      const ratio = h === 0 ? 0 : Math.min(c / h, 1)
      const a = angleFor(i)
      const r = ratio * maxR
      return {
        i, key: k,
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
        color: tierColor(c, h),
      }
    })
  }, [keys, renderHorizons, current, showEmpty, cx, cy, maxR])

  // Outer ring + spoke tips
  const ringPts = useMemo(() => {
    const pts = []
    for (let i = 0; i < N; i++) {
      const a = angleFor(i)
      pts.push(`${cx + maxR * Math.cos(a)},${cy + maxR * Math.sin(a)}`)
    }
    return pts.join(' ')
  }, [cx, cy, maxR])

  const ringStroke = dark ? 'rgba(200, 146, 42, 0.30)' : 'rgba(200, 146, 42, 0.20)'
  const spokeStroke = dark ? 'rgba(200, 146, 42, 0.45)' : 'rgba(200, 146, 42, 0.30)'
  const labelFill = dark ? TEXT_WHITE_META : TEXT_META
  const labelActiveFill = dark ? GOLD_LT : GOLD_DK
  const vertStroke = dark ? BG_INK : BG_CARD
  const walkerLabelFill = dark ? GOLD_LT : GOLD_DK
  const walkerDotFill = dark ? GOLD_LT : GOLD_DK

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      viewBox={SVG_VIEWBOX}
      style={{ display: 'block', overflow: 'visible' }}
      aria-label={kind === 'personal' ? 'Your seven domains' : 'The seven civilisational domains'}
    >
      {/* Outer ring */}
      <polygon
        points={ringPts}
        fill="none"
        stroke={ringStroke}
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Spokes */}
      {Array.from({ length: N }).map((_, i) => {
        const a = angleFor(i)
        const tx = cx + maxR * Math.cos(a)
        const ty = cy + maxR * Math.sin(a)
        return (
          <g key={`spoke-${i}`}>
            <line
              x1={cx} y1={cy} x2={tx} y2={ty}
              stroke={spokeStroke}
              strokeWidth="1"
            />
            <circle cx={tx} cy={ty} r={3} fill="rgba(200,146,42,0.5)" />
          </g>
        )
      })}

      {/* Labels */}
      {labels.map((txt, i) => {
        const a = angleFor(i)
        const tipX = cx + maxR * Math.cos(a)
        const tipY = cy + maxR * Math.sin(a)
        const pos = labelPositionFor(i, tipX, tipY)
        const isActive = activeKey && keys[i] === activeKey
        const isPlacement = placementKey && keys[i] === placementKey
        const active = isActive || isPlacement
        return (
          <text
            key={`label-${i}`}
            x={pos.x}
            y={pos.y}
            textAnchor={pos.anchor}
            style={{
              fontFamily: FONT_SC,
              fontSize: 10.5,
              letterSpacing: '0.18em',
              fill: active ? labelActiveFill : labelFill,
              fontWeight: active ? 600 : 400,
            }}
          >
            {txt}
          </text>
        )
      })}

      {/* Polygon — empty state vs. populated */}
      {showEmpty ? (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="rgba(200,146,42,0.10)"
          stroke="rgba(200,146,42,0.40)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ) : (
        <>
          <polygon
            points={verts.map(v => `${v.x},${v.y}`).join(' ')}
            fill="rgba(200,146,42,0.16)"
            stroke={GOLD}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {verts.map(v => (
            <circle
              key={`vert-${v.i}`}
              cx={v.x} cy={v.y}
              r={4}
              fill={v.color}
              stroke={vertStroke}
              strokeWidth="1.5"
            />
          ))}
        </>
      )}

      {/* Sprint glow — pulsing gold dot at the active sprint vertex */}
      {!showEmpty && activeKey && (() => {
        const idx = keys.indexOf(activeKey)
        if (idx < 0) return null
        const v = verts[idx]
        return (
          <circle
            cx={v.x} cy={v.y}
            r={6}
            fill={GOLD}
            opacity="0.5"
          >
            <animate
              attributeName="r"
              values="5;8;5"
              dur="2.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.4;0.75;0.4"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </circle>
        )
      })()}

      {/* Placement marker — pulsing ring outside the placement spoke tip */}
      {placementKey && (() => {
        const idx = keys.indexOf(placementKey)
        if (idx < 0) return null
        const a = angleFor(idx)
        const px = cx + maxR * 1.08 * Math.cos(a)
        const py = cy + maxR * 1.08 * Math.sin(a)
        return (
          <g>
            <circle cx={px} cy={py} r={6} fill={GOLD} />
            <circle
              cx={px} cy={py}
              r={11}
              fill="none"
              stroke={GOLD}
              strokeWidth="1.2"
              opacity="0.6"
            >
              <animate
                attributeName="r"
                values="11;14;11"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.4;0.7;0.4"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )
      })()}

      {/* Walker cluster — concentrates on the active spoke (sprint or
          placement). RENDERS ONLY WHEN walkers[focusKey] > 0. Empty
          by default until contributor-density queries are wired in
          BetaMissionControl. No demo numbers, no zero-state label. */}
      {(() => {
        const focusKey = activeKey || placementKey
        if (!focusKey) return null
        const count = walkers[focusKey] || 0
        if (count <= 0) return null
        const idx = keys.indexOf(focusKey)
        if (idx < 0) return null

        const a = angleFor(idx)
        const clusterR = maxR * 1.40
        const ccx = cx + clusterR * Math.cos(a)
        const ccy = cy + clusterR * Math.sin(a)
        const dotsToShow = Math.min(count, 8)
        const clusterRadius = 14
        const dots = []
        for (let j = 0; j < dotsToShow; j++) {
          const aa = (Math.PI * 2 * j) / dotsToShow + (idx * 0.4)
          const wob = 0.6 + 0.4 * ((j * 37) % 100) / 100
          const dx = ccx + clusterRadius * Math.cos(aa) * wob
          const dy = ccy + clusterRadius * Math.sin(aa) * wob
          dots.push(
            <circle
              key={`walker-${j}`}
              cx={dx.toFixed(1)}
              cy={dy.toFixed(1)}
              r={2}
              fill={walkerDotFill}
              opacity="0.7"
            />
          )
        }

        // Count label: perpendicular to spoke direction, never collides
        // with the spoke label which sits above/below the tip.
        const perpAngle = a + Math.PI / 2
        const sideOffset = 24
        const labelX = ccx + sideOffset * Math.cos(perpAngle)
        const labelY = ccy + sideOffset * Math.sin(perpAngle) + 3
        const labelAnchor =
          Math.cos(perpAngle) >= 0.2  ? 'start' :
          Math.cos(perpAngle) <= -0.2 ? 'end' :
                                        'middle'

        return (
          <g>
            {dots}
            <text
              x={labelX.toFixed(1)}
              y={labelY.toFixed(1)}
              textAnchor={labelAnchor}
              style={{
                fontFamily: FONT_SC,
                fontSize: 9,
                letterSpacing: '0.12em',
                fill: walkerLabelFill,
              }}
            >
              {count} walking
            </text>
          </g>
        )
      })()}
    </svg>
  )
}
