// src/beta/components/NextUsWheel.jsx
//
// Civilisational wheel for Mission Control.
// Seven civ domains rendered as a polar chart. Shows actor placement
// from the user's purpose_piece_results civ domain and any secondary
// engaged_civ_domains from their contributor profile.
//
// Props:
//   engagedDomains  — string[] of domain slugs (from contributor_profiles_beta)
//   primaryDomain   — string | null  (from purpose_piece_results)
//   size            — number (default 220)
//   visible         — boolean
//   onToggleVisibility — () => void

import { useState } from 'react'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

export const CIV_DOMAINS = [
  { slug: 'human-being',     label: 'Human Being',     shortLabel: 'Human',   color: '#2A6B9E' },
  { slug: 'society',         label: 'Society',          shortLabel: 'Society', color: '#6B2A9E' },
  { slug: 'nature',          label: 'Nature',           shortLabel: 'Nature',  color: '#2A6B3A' },
  { slug: 'technology',      label: 'Technology',       shortLabel: 'Tech',    color: '#8A6B2A' },
  { slug: 'finance-economy', label: 'Finance & Economy',shortLabel: 'Finance', color: '#6B3A2A' },
  { slug: 'legacy',          label: 'Legacy',           shortLabel: 'Legacy',  color: '#4A6B2A' },
  { slug: 'vision',          label: 'Vision',           shortLabel: 'Vision',  color: '#2A4A6B' },
]

export default function NextUsWheel({
  engagedDomains = [],
  primaryDomain = null,
  size = 220,
  visible = false,
  onToggleVisibility,
}) {
  const cx = size / 2
  const cy = size / 2
  const maxR = (size / 2) * 0.62
  const n = CIV_DOMAINS.length

  function pt(i, fraction) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = fraction * maxR
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  const hasAny = engagedDomains.length > 0 || primaryDomain != null

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase' }}>
          Civilisational
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
          >
            {visible ? (
              <><EyeIcon /><span>Public</span></>
            ) : (
              <><EyeOffIcon /><span>Private</span></>
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
          style={{ display: 'block', overflow: 'visible', opacity: !hasAny ? 0.35 : 1 }}
        >
          {/* Grid rings */}
          {[0.25, 0.5, 0.75, 1].map(frac => {
            const pts = CIV_DOMAINS.map((_, i) => pt(i, frac).join(',')).join(' ')
            return (
              <polygon
                key={frac}
                points={pts}
                fill="none"
                stroke="rgba(200,146,42,0.07)"
                strokeWidth="0.5"
              />
            )
          })}

          {/* Axis spokes */}
          {CIV_DOMAINS.map((d, i) => {
            const [x, y] = pt(i, 1)
            return (
              <line
                key={d.slug}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="rgba(200,146,42,0.08)"
                strokeWidth="0.5"
              />
            )
          })}

          {/* Engaged domain fills */}
          {CIV_DOMAINS.map((d, i) => {
            const isEngaged  = engagedDomains.includes(d.slug)
            const isPrimary  = d.slug === primaryDomain
            if (!isEngaged && !isPrimary) return null
            const fraction   = isPrimary ? 1 : 0.65
            const [x, y]     = pt(i, fraction)
            return (
              <line
                key={`fill-${d.slug}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={d.color}
                strokeWidth={isPrimary ? 3 : 1.5}
                strokeLinecap="round"
                opacity={isPrimary ? 0.85 : 0.45}
              />
            )
          })}

          {/* Engaged domain dots */}
          {CIV_DOMAINS.map((d, i) => {
            const isEngaged = engagedDomains.includes(d.slug)
            const isPrimary = d.slug === primaryDomain
            if (!isEngaged && !isPrimary) return null
            const fraction  = isPrimary ? 1 : 0.65
            const [x, y]    = pt(i, fraction)
            return (
              <circle
                key={`dot-${d.slug}`}
                cx={x}
                cy={y}
                r={isPrimary ? 5 : 3.5}
                fill={d.color}
                stroke="rgba(250,250,247,0.9)"
                strokeWidth="1.5"
                opacity={isPrimary ? 1 : 0.7}
              />
            )
          })}

          {/* Labels */}
          {CIV_DOMAINS.map((d, i) => {
            const a    = (Math.PI * 2 * i) / n - Math.PI / 2
            const lx   = cx + maxR * 1.24 * Math.cos(a)
            const ly   = cy + maxR * 1.24 * Math.sin(a)
            const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx < cx ? 'end' : 'start'
            const isActive = engagedDomains.includes(d.slug) || d.slug === primaryDomain
            return (
              <text
                key={d.slug}
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontFamily="'Cormorant SC', Georgia, serif"
                fontSize="8"
                letterSpacing="0.5"
                fill={isActive ? d.color : 'rgba(15,21,35,0.4)'}
              >
                {d.shortLabel}
              </text>
            )
          })}
        </svg>

        {/* Empty state */}
        {!hasAny && (
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
              Complete Purpose Piece
            </span>
            <a
              href="/tools/purpose-piece"
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

function EyeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <ellipse cx="8" cy="8" rx="6" ry="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="8" cy="8" rx="6" ry="4" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
    </svg>
  )
}
