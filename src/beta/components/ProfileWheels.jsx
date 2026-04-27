// src/beta/components/ProfileWheels.jsx
// Self wheel and civilisational wheel side by side.
// Only domains marked public render. Omit section if both empty.

import { CIV_DOMAINS, DOMAIN_COLORS, SELF_DOMAINS } from '../constants/domains'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

// Tier colour for Self wheel
function selfTierColor(v) {
  if (v == null) return 'rgba(200,146,42,0.20)'
  if (v >= 8)   return '#3B6B9E'
  if (v >= 6.5) return '#5A8AB8'
  if (v >= 5)   return '#8A8070'
  if (v >= 3)   return '#8A7030'
  return '#8A3030'
}

function SpiderWheel({ domains, currentScores, horizonScores, colorFn, size = 220 }) {
  const cx = size / 2
  const cy = size / 2
  const maxR = (size / 2) * 0.62
  const n = domains.length

  function pt(i, v) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (Math.min(v ?? 0, 10) / 10) * maxR
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  function ptFull(i, scale = 1) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + maxR * scale * Math.cos(a), cy + maxR * scale * Math.sin(a)]
  }

  const currentPts = domains
    .map((d, i) => pt(i, currentScores[d.slug] ?? 0).join(','))
    .join(' ')

  const hasHorizon = Object.values(horizonScores).some(v => v > 0)
  const horizonPts = domains
    .map((d, i) => pt(i, horizonScores[d.slug] ?? 0).join(','))
    .join(' ')

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}
    >
      {/* Grid rings */}
      {[2, 4, 6, 8, 10].map(v => {
        const pts = domains.map((_, i) => pt(i, v).join(',')).join(' ')
        return (
          <polygon key={v} points={pts} fill="none"
            stroke={v === 5 ? 'rgba(138,48,48,0.18)' : 'rgba(200,146,42,0.06)'}
            strokeWidth={v === 5 ? 1 : 0.75}
            strokeDasharray={v === 5 ? '3 3' : 'none'} />
        )
      })}

      {/* Spokes */}
      {domains.map((_, i) => {
        const [x, y] = ptFull(i)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke="rgba(200,146,42,0.05)" strokeWidth="0.75" />
      })}

      {/* Horizon shape */}
      {hasHorizon && (
        <polygon points={horizonPts}
          fill="rgba(90,138,184,0.05)"
          stroke="rgba(90,138,184,0.35)"
          strokeWidth="1.5"
          strokeDasharray="4 3" />
      )}

      {/* Current shape */}
      <polygon points={currentPts}
        fill="rgba(200,146,42,0.06)"
        stroke="rgba(200,146,42,0.55)"
        strokeWidth="1.5"
        strokeLinejoin="round" />

      {/* Current dots */}
      {domains.map((d, i) => {
        const s = currentScores[d.slug]
        if (s == null) return null
        const [x, y] = pt(i, s)
        const color = colorFn ? colorFn(d.slug, s) : selfTierColor(s)
        return <circle key={i} cx={x} cy={y} r={3}
          fill={color} stroke="#FAFAF7" strokeWidth="1.5" />
      })}

      {/* Labels */}
      {domains.map((d, i) => {
        const [lx, ly] = ptFull(i, 1.28)
        const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx < cx ? 'end' : 'start'
        const s = currentScores[d.slug]
        const color = colorFn ? colorFn(d.slug, s) : selfTierColor(s)
        return (
          <text key={i} x={lx} y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontFamily="'Cormorant SC', Georgia, serif"
            fontSize="10"
            letterSpacing="0.6"
            fill={s != null ? 'rgba(15,21,35,0.72)' : 'rgba(15,21,35,0.35)'}>
            {d.label}
          </text>
        )
      })}
    </svg>
  )
}

export function ProfileWheels({ selfWheelPublic, civWheelPublic, horizonByDomain }) {
  // Self wheel data
  const selfCurrentScores = {}
  const selfHorizonScores = {}
  SELF_DOMAINS.forEach(d => {
    const row = horizonByDomain[d.slug]
    if (selfWheelPublic[d.slug] && row) {
      if (row.current_score != null) selfCurrentScores[d.slug] = row.current_score
      if (row.horizon_score != null) selfHorizonScores[d.slug] = row.horizon_score
    }
  })

  // Civ wheel data — presence in civWheelPublic = this domain is publicly engaged
  const civCurrentScores = {}
  const civHorizonScores = {}
  civWheelPublic.forEach(slug => {
    civCurrentScores[slug] = 7 // placeholder score; civ wheel is engagement, not scored
  })

  const hasSelf = Object.keys(selfCurrentScores).length > 0
  const hasCiv  = civWheelPublic.length > 0

  if (!hasSelf && !hasCiv) return null

  function civColorFn(slug) {
    return DOMAIN_COLORS[slug] || 'rgba(200,146,42,0.50)'
  }

  const civDomainList = CIV_DOMAINS.filter(d => civWheelPublic.includes(d.slug))

  return (
    <div style={{ marginBottom: '72px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: hasSelf && hasCiv ? '1fr 1fr' : '1fr',
        gap: '48px',
        alignItems: 'start',
      }}>

        {/* Self wheel */}
        {hasSelf && (
          <div>
            <div style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.22em',
              color: 'rgba(15,21,35,0.40)',
              marginBottom: '20px',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}>
              Self
            </div>
            <SpiderWheel
              domains={SELF_DOMAINS}
              currentScores={selfCurrentScores}
              horizonScores={selfHorizonScores}
              colorFn={null}
              size={220}
            />
          </div>
        )}

        {/* Civilisational wheel */}
        {hasCiv && (
          <div>
            <div style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.22em',
              color: 'rgba(15,21,35,0.40)',
              marginBottom: '20px',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}>
              Civilisational
            </div>
            <SpiderWheel
              domains={civDomainList}
              currentScores={civCurrentScores}
              horizonScores={{}}
              colorFn={civColorFn}
              size={220}
            />

            {/* Domain colour legend */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
              marginTop: '16px',
            }}>
              {civDomainList.map(d => (
                <div key={d.slug} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: DOMAIN_COLORS[d.slug],
                  }} />
                  <span style={{
                    ...sc,
                    fontSize: '10px',
                    letterSpacing: '0.10em',
                    color: 'rgba(15,21,35,0.55)',
                  }}>
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
