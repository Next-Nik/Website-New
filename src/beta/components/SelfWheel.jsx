// src/beta/components/SelfWheel.jsx
//
// Self wheel for Mission Control. 220px. Seven self domains.
// Adapted from Dashboard.jsx HorizonWheelMini — additive, original untouched.
//
// Props:
//   currentScores  — { path, spark, body, finances, connection, inner_game, signal }
//   horizonScores  — same shape (optional; renders dashed horizon ring when present)
//   size           — number (default 220)
//   visible        — boolean; when false, renders locked overlay
//   onToggleVisibility — () => void; called when user taps the visibility toggle
//   onDomainClick  — (domainKey) => void; optional

import { useState } from 'react'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const SELF_LABELS = ['Path', 'Spark', 'Body', 'Finances', 'Connection', 'Inner Game', 'Signal']
const SELF_KEYS   = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

function getTierColor(n) {
  if (n == null) return 'rgba(200,146,42,0.3)'
  if (n >= 9)   return '#3B6B9E'
  if (n >= 7)   return '#5A8AB8'
  if (n >= 5)   return '#8A8070'
  if (n >= 3)   return '#8A7030'
  return '#8A3030'
}

export default function SelfWheel({
  currentScores = {},
  horizonScores = {},
  size = 220,
  visible = false,
  onToggleVisibility,
  onDomainClick,
}) {
  const [hovered, setHovered] = useState(false)

  const cx = size / 2
  const cy = size / 2
  const maxR = (size / 2) * 0.62
  const n = SELF_KEYS.length

  function pt(i, v) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (Math.min(v ?? 0, 10) / 10) * maxR
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  const currentPts = SELF_KEYS.map((k, i) => pt(i, currentScores[k] ?? 0).join(',')).join(' ')
  const horizonPts = SELF_KEYS.map((k, i) => pt(i, horizonScores[k] ?? 0).join(',')).join(' ')
  const hasHorizon = Object.values(horizonScores).some(v => v > 0)
  const hasScores  = SELF_KEYS.some(k => currentScores[k] != null)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase' }}>
          Self
        </span>
        {onToggleVisibility && (
          <button
            type="button"
            onClick={onToggleVisibility}
            title={visible ? 'Visible on public profile' : 'Private'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              ...sc,
              fontSize: '10px',
              letterSpacing: '0.1em',
              color: visible ? '#A8721A' : 'rgba(15,21,35,0.35)',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {visible ? (
              <>
                <VisibleIcon />
                <span>Public</span>
              </>
            ) : (
              <>
                <PrivateIcon />
                <span>Private</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Wheel */}
      <div style={{ position: 'relative' }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ display: 'block', overflow: 'visible', opacity: !hasScores ? 0.35 : 1 }}
        >
          {/* Grid rings */}
          {[2, 4, 6, 8, 10].map(v => {
            const pts = SELF_KEYS.map((_, i) => pt(i, v).join(',')).join(' ')
            return (
              <polygon
                key={v}
                points={pts}
                fill="none"
                stroke={v === 5 ? 'rgba(138,48,48,0.12)' : 'rgba(200,146,42,0.07)'}
                strokeWidth={v === 5 ? 1 : 0.5}
                strokeDasharray={v === 5 ? '2 2' : 'none'}
              />
            )
          })}

          {/* Horizon ring */}
          {hasHorizon && (
            <polygon
              points={horizonPts}
              fill="rgba(200,146,42,0.05)"
              stroke="#C8922A"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          )}

          {/* Score polygon */}
          {hasScores && (
            <polygon
              points={currentPts}
              fill="rgba(200,146,42,0.07)"
              stroke="rgba(200,146,42,0.55)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )}

          {/* Score dots */}
          {SELF_KEYS.map((k, i) => {
            const s = currentScores[k]
            if (s == null) return null
            const [x, y] = pt(i, s)
            return (
              <circle
                key={k}
                cx={x}
                cy={y}
                r={onDomainClick ? 5 : 3}
                fill={getTierColor(s)}
                stroke="rgba(250,250,247,0.8)"
                strokeWidth="1"
                style={{ cursor: onDomainClick ? 'pointer' : 'default' }}
                onClick={onDomainClick ? () => onDomainClick(k) : undefined}
              />
            )
          })}

          {/* Axis labels */}
          {SELF_KEYS.map((k, i) => {
            const a = (Math.PI * 2 * i) / n - Math.PI / 2
            const lx = cx + maxR * 1.22 * Math.cos(a)
            const ly = cy + maxR * 1.22 * Math.sin(a)
            const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx < cx ? 'end' : 'start'
            return (
              <text
                key={k}
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontFamily="'Cormorant SC', Georgia, serif"
                fontSize="8.5"
                letterSpacing="0.5"
                fill="rgba(15,21,35,0.55)"
              >
                {SELF_LABELS[i]}
              </text>
            )
          })}
        </svg>

        {/* Empty overlay */}
        {!hasScores && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.4)' }}>
              Complete The Map
            </span>
            <a
              href="/tools/map"
              style={{ ...sc, fontSize: '10px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none' }}
            >
              Begin
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// Small inline SVG icons — no external dependency
function VisibleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <ellipse cx="8" cy="8" rx="6" ry="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  )
}

function PrivateIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="8" cy="8" rx="6" ry="4" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
    </svg>
  )
}
