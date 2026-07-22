// src/app/components/NavigatorWheel.jsx
//
// A reusable wheel-shaped navigator. Same shape at every magnification:
//   - The seven domains of Earth (top level)
//   - The subdomains of a domain (one level down)
//   - The fields of a subdomain (two levels down)
//
// Three gestures, three directions:
//   - Tap node = go down (drill into that node)
//   - Expand   = flare out to siblings (peers at same level)
//   - Breadcrumb up = go up (handled outside; this component just renders)
//
// Props:
//   nodes:        array of { id, slug, name, color?, position? }
//   centerLabel:  string shown at the heart of the wheel
//   onTap:        (node) => void — fired on node click
//   onExpand:     () => void | null — fired on expand-out tap; null hides expand
//   size:         number (default 360)
//   activeSlug:   string | null — node to render in active state (filled spoke)
//   palette:      object — { primary, ring, ink } overrides
//
// Visual posture: parchment background, gold rings, soft labels. The polygon
// is decorative — the click targets are the spoke endpoints + invisible-radial
// hit areas. Designed to render at /explore at any depth.

import { useMemo } from 'react'

const sc      = { fontFamily: "'IBM Plex Mono', Georgia, serif" }
const display = { fontFamily: "'Fraunces', Georgia, serif" }

const GOLD = '#262420'
const GOLD_LIGHT = '#4c6b45'
const INK = '#0F1523'
const PARCH = '#FAFAF7'

export function NavigatorWheel({
  nodes,
  centerLabel,
  onTap,
  onExpand = null,
  size = 360,
  activeSlug = null,
  palette = {},
}) {
  const primary = palette.primary || GOLD
  const ring = palette.ring || GOLD_LIGHT
  const ink = palette.ink || INK

  const cx = size / 2
  const cy = size / 2
  const innerR = size * 0.13      // centre circle radius
  const spokeR = size * 0.34      // where node circles sit
  const labelR = size * 0.46      // where labels sit beyond spokes
  const wheelR = size * 0.40      // outer ring guide

  const n = nodes.length
  const safeN = Math.max(n, 1)

  // Compute positions for each node
  const positioned = useMemo(() => nodes.map((node, i) => {
    // Start at top (12 o'clock), go clockwise
    const angle = (Math.PI * 2 * i) / safeN - Math.PI / 2
    const nx = cx + spokeR * Math.cos(angle)
    const ny = cy + spokeR * Math.sin(angle)
    const lx = cx + labelR * Math.cos(angle)
    const ly = cy + labelR * Math.sin(angle)
    const isLeft = nx < cx - 1
    const isRight = nx > cx + 1
    return {
      node,
      angle,
      nx, ny,         // spoke endpoint (node circle centre)
      lx, ly,         // label anchor
      textAnchor: isLeft ? 'end' : isRight ? 'start' : 'middle',
      dy: 0.35 * 14,  // baseline tweak
    }
  }), [nodes, cx, cy, spokeR, labelR, safeN])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ background: PARCH, borderRadius: '50%', lineHeight: 0, width: 'fit-content' }}>
    <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        display="block"
      >
        {/* Outer guide ring */}
        <circle
          cx={cx} cy={cy} r={wheelR}
          fill="none"
          stroke={ring}
          strokeWidth="1"
          strokeOpacity="0.20"
        />
        {/* Inner guide ring */}
        <circle
          cx={cx} cy={cy} r={wheelR * 0.62}
          fill="none"
          stroke={ring}
          strokeWidth="1"
          strokeOpacity="0.12"
        />

        {/* Spokes from centre out */}
        {positioned.map(({ node, nx, ny }) => (
          <line
            key={`spoke-${node.id}`}
            x1={cx} y1={cy}
            x2={nx} y2={ny}
            stroke={ring}
            strokeWidth="1"
            strokeOpacity="0.22"
          />
        ))}

        {/* Node circles */}
        {positioned.map(({ node, nx, ny }) => {
          const active = activeSlug && node.slug === activeSlug
          const color = node.color || primary
          return (
            <g key={`node-${node.id}`} style={{ cursor: 'pointer' }} onClick={() => onTap && onTap(node)}>
              {/* Hit halo (invisible larger circle for forgiving tap) */}
              <circle cx={nx} cy={ny} r={20} fill="transparent" />
              {/* Visible node */}
              <circle
                cx={nx} cy={ny} r={10}
                fill={active ? color : '#FFFFFF'}
                stroke={color}
                strokeWidth={active ? 2.5 : 2}
              />
            </g>
          )
        })}

        {/* Centre circle + label */}
        <circle
          cx={cx} cy={cy} r={innerR}
          fill="#FFFFFF"
          stroke={primary}
          strokeWidth="1.5"
        />
        <text
          x={cx} y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ ...display, fontSize: size * 0.045, fill: ink, fontWeight: 400 }}
        >
          {centerLabel}
        </text>

        {/* Labels — rendered as foreignObjects for HTML wrapping if long */}
        {positioned.map(({ node, lx, ly, textAnchor }) => {
          const color = node.color || primary
          return (
            <text
              key={`lbl-${node.id}`}
              x={lx} y={ly}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              style={{
                ...sc,
                fontSize: size * 0.034,
                letterSpacing: '0.14em',
                fill: color,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
              onClick={() => onTap && onTap(node)}
            >
              {node.name}
            </text>
          )
        })}
      </svg>
    </div>

      {/* Expand affordance — only shown if onExpand provided */}
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          title="See peers at this level"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(76,107,69,0.04)',
            border: '1px solid rgba(76,107,69,0.40)',
            borderRadius: '20px',
            padding: '4px 10px',
            cursor: 'pointer',
            ...sc,
            fontSize: '13px',
            letterSpacing: '0.14em',
            color: primary,
            textTransform: 'uppercase',
          }}
        >
          ⇔ peers
        </button>
      )}
    </div>
  )
}
