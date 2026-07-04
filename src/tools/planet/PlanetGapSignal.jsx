// src/tools/planet/PlanetGapSignal.jsx
// Shown in results when both self-assessment and NextUs assessment exist
// The gap is a signal — not a judgment. Displayed when assessment_type = 'both'

import { PLANET_DOMAINS, getPlanetScoreColor } from '../../constants/horizonScalePlanet'
import { body, sc, at } from '../../lib/designTokens'

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
        background: at.object,
        border: `1px solid ${at.verdigrisEdge}`,
        borderLeft: `3px solid ${at.verdigris}`,
        borderRadius: 6,
        marginBottom: 40,
      }}>
        <p style={{ ...sc, fontSize: 13, letterSpacing: '0.1em', color: at.verdigris, marginBottom: 8 }}>
          GAP SIGNAL
        </p>
        <p style={{ ...body, fontSize: 15, color: at.text, lineHeight: 1.65 }}>
          Self-assessment and NextUs assessment are broadly aligned across all seven domains. That's either a genuinely honest self-reading, or a genuinely accurate external view. Worth asking which.
        </p>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{
        padding: '24px 28px 8px',
        background: at.object,
        border: `1px solid ${at.verdigrisEdge}`,
        borderLeft: '3px solid #C97064',
        borderRadius: 6,
        marginBottom: 16,
      }}>
        <p style={{ ...sc, fontSize: 13, letterSpacing: '0.1em', color: '#C97064', marginBottom: 12 }}>
          GAP SIGNAL — {significantGaps.length} domain{significantGaps.length > 1 ? 's' : ''} with significant divergence
        </p>
        <p style={{ ...body, fontSize: 15, color: at.text, lineHeight: 1.65, marginBottom: 20 }}>
          Where self-assessment and external assessment diverge by two or more points, that gap is worth looking at. It's not a verdict — it's a question.
        </p>

        {significantGaps.map(({ domain, gap, self, nextus }) => (
          <div key={domain.key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
            borderTop: `1px solid ${at.verdigrisEdge}`,
          }}>
            <div style={{ width: 3, height: 32, background: domain.color, borderRadius: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ ...sc, fontSize: 13, color: domain.color, letterSpacing: '0.06em' }}>
                {domain.label}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...body, fontSize: 13, color: at.meta }}>
                Self: <strong style={{ color: getPlanetScoreColor(self) }}>{self}</strong>
              </span>
              <span style={{ ...body, fontSize: 13, color: at.ghost }}>vs</span>
              <span style={{ ...body, fontSize: 13, color: at.meta }}>
                NextUs: <strong style={{ color: getPlanetScoreColor(nextus) }}>{nextus}</strong>
              </span>
              <span style={{
                ...sc,
                fontSize: 13,
                padding: '2px 8px',
                borderRadius: 3,
                background: gap > 0 ? 'rgba(201,112,100,0.12)' : 'rgba(88,160,138,0.12)',
                color: gap > 0 ? '#C97064' : at.verdigris,
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
          color: at.ghost,
          paddingLeft: 4,
        }}>
          Aligned domains (±1): {aligned.map(g => g.domain.label).join(' · ')}
        </p>
      )}
    </div>
  )
}
