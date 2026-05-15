// src/tools/planet/PlanetGapSignal.jsx
// Shown in results when both self-assessment and NextUs assessment exist
// The gap is a signal — not a judgment. Displayed when assessment_type = 'both'

import { PLANET_DOMAINS, getPlanetScoreColor } from '../../constants/horizonScalePlanet'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

export function PlanetGapSignal({ scores, nextusScores }) {
  const gaps = PLANET_DOMAINS.map(d => {
    const self = scores[d.key]?.score ?? 0
    const nextus = nextusScores[d.key]?.score ?? 0
    return { domain: d, gap: self - nextus, self, nextus }
  }).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))

  const significantGaps = gaps.filter(g => Math.abs(g.gap) >= 2)
  const aligned = gaps.filter(g => Math.abs(g.gap) <= 1)

  if (significantGaps.length === 0) {
    return (
      <div style={{
        padding: '24px 28px',
        background: '#FFFFFF',
        border: '1px solid rgba(200,146,42,0.20)',
        borderLeft: '3px solid #7B9E87',
        borderRadius: 6,
        marginBottom: 40,
      }}>
        <p style={{ ...sc, fontSize: 11, letterSpacing: '0.1em', color: '#7B9E87', marginBottom: 8 }}>
          GAP SIGNAL
        </p>
        <p style={{ ...body, fontSize: 15, color: '#0F1523', lineHeight: 1.65 }}>
          Self-assessment and NextUs assessment are broadly aligned across all seven domains. That's either a genuinely honest self-reading, or a genuinely accurate external view. Worth asking which.
        </p>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{
        padding: '24px 28px 8px',
        background: '#FFFFFF',
        border: '1px solid rgba(200,146,42,0.20)',
        borderLeft: '3px solid #C0392B',
        borderRadius: 6,
        marginBottom: 16,
      }}>
        <p style={{ ...sc, fontSize: 11, letterSpacing: '0.1em', color: '#C0392B', marginBottom: 12 }}>
          GAP SIGNAL — {significantGaps.length} domain{significantGaps.length > 1 ? 's' : ''} with significant divergence
        </p>
        <p style={{ ...body, fontSize: 15, color: '#0F1523', lineHeight: 1.65, marginBottom: 20 }}>
          Where self-assessment and external assessment diverge by two or more points, that gap is worth looking at. It's not a verdict — it's a question.
        </p>

        {significantGaps.map(({ domain, gap, self, nextus }) => (
          <div key={domain.key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
            borderTop: '1px solid rgba(200,146,42,0.12)',
          }}>
            <div style={{ width: 3, height: 32, background: domain.color, borderRadius: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ ...sc, fontSize: 11, color: domain.color, letterSpacing: '0.06em' }}>
                {domain.label}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...body, fontSize: 13, color: 'rgba(15,21,35,0.72)' }}>
                Self: <strong style={{ color: getPlanetScoreColor(self) }}>{self}</strong>
              </span>
              <span style={{ ...body, fontSize: 13, color: 'rgba(15,21,35,0.55)' }}>vs</span>
              <span style={{ ...body, fontSize: 13, color: 'rgba(15,21,35,0.72)' }}>
                NextUs: <strong style={{ color: getPlanetScoreColor(nextus) }}>{nextus}</strong>
              </span>
              <span style={{
                ...sc,
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 3,
                background: gap > 0 ? 'rgba(192,57,43,0.08)' : 'rgba(92,138,92,0.08)',
                color: gap > 0 ? '#C0392B' : '#5C8A5C',
              }}>
                {gap > 0 ? `Self +${gap}` : `NextUs +${Math.abs(gap)}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {aligned.length > 0 && (
        <p style={{
          ...body,
          fontSize: 13,
          color: 'rgba(15,21,35,0.55)',
          paddingLeft: 4,
        }}>
          Aligned domains (±1): {aligned.map(g => g.domain.label).join(' · ')}
        </p>
      )}
    </div>
  )
}
