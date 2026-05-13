// Design tokens
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const dark     = '#0F1523'
const goldDark = '#A8721A'
const success  = '#2A6B3A'
const warn     = '#A8721A'

// ─────────────────────────────────────────────────────────────
// GapSignalExplainer — modal showing the three measured values
// against their thresholds, plus the indicator-count and Tier-3
// transparency that the brief calls "explicit, versioned, visible."
// ─────────────────────────────────────────────────────────────
export function GapSignalExplainer({ payload, domainId, focusName, onClose }) {
  if (!payload) return null

  const t = payload.thresholds || {}

  // Each row: label, current value, threshold, formatter, comparator (true if below threshold)
  const rows = [
    {
      label:  'Score',
      detail: 'Weighted average of headline indicators (0\u2013100).',
      value:  payload.score,
      threshold: t.score,
      format: v => v == null ? '\u2014' : v.toFixed(1),
      below:  payload.score != null && t.score != null && payload.score < t.score,
    },
    {
      label:  'Actor density',
      detail: 'Actors placed in this domain at this Focus or below.',
      value:  payload.actor_density,
      threshold: t.actor_density,
      format: v => v == null ? '\u2014' : String(v),
      below:  payload.actor_density != null && t.actor_density != null && payload.actor_density < t.actor_density,
    },
    {
      label:  'Funding',
      detail: 'USD-equivalent flow attributed to this domain × Focus.',
      value:  payload.funding,
      threshold: t.funding,
      format: v => v == null ? '\u2014' : '$' + Math.round(v).toLocaleString(),
      below:  payload.funding != null && t.funding != null && payload.funding < t.funding,
    },
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,21,35,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FAFAF7',
          borderRadius: '14px',
          maxWidth: '560px', width: '100%',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(15,21,35,0.20)',
          padding: '32px 36px',
        }}
      >

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
          <div>
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: goldDark, display: 'block', marginBottom: '6px' }}>
              Gap Signal
            </span>
            <h2 style={{ ...serif, fontSize: '26px', fontWeight: 300, color: dark, margin: 0, lineHeight: 1.2 }}>
              Why this is firing
            </h2>
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.55, marginTop: '6px' }}>
              {focusName || 'This Focus'}, {capitalise(domainId)}. The structural alarm fires when score, actor density, and funding all sit below their thresholds at the same time.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '24px', color: 'rgba(15,21,35,0.40)',
              lineHeight: 1, padding: '0 4px', flexShrink: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Three input rows */}
        <div style={{ marginBottom: '22px' }}>
          {rows.map(row => (
            <div key={row.label} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: '12px',
              alignItems: 'baseline',
              padding: '12px 0',
              borderBottom: '1px solid rgba(200,146,42,0.10)',
            }}>
              <div>
                <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: dark, marginBottom: '2px' }}>
                  {row.label}
                </div>
                <div style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.5 }}>
                  {row.detail}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  ...body, fontSize: '17px', fontWeight: 400,
                  color: row.below ? warn : dark,
                  lineHeight: 1,
                }}>
                  {row.format(row.value)}
                </div>
                <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.40)', marginTop: '4px' }}>
                  Current
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1 }}>
                  &lt; {row.format(row.threshold)}
                </div>
                <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.40)', marginTop: '4px' }}>
                  Threshold
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tier 3 transparency — only shown when relevant */}
        {payload.contributor_density > 0 && (
          <div style={{
            background: 'rgba(15,21,35,0.03)',
            border: '1px solid rgba(15,21,35,0.08)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '20px',
          }}>
            <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginBottom: '4px' }}>
              Contributor signals
            </div>
            <p style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.55, margin: 0 }}>
              {payload.contributor_density} contributor{payload.contributor_density === 1 ? '' : 's'} {payload.contributor_signals_used > 0 ? 'feeding into the score' : `not yet feeding into the score (threshold: ${payload.thresholds?.contributor_density || '\u2014'})`}.
              {payload.contributor_signals_used === 0 && ' Tier 3 signals require a minimum density before they influence the domain score.'}
            </p>
          </div>
        )}

        {/* Suggestions / what to do */}
        <div style={{
          borderLeft: `3px solid ${success}`,
          paddingLeft: '14px',
          marginBottom: '24px',
        }}>
          <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em', color: success, marginBottom: '6px' }}>
            What this signals
          </div>
          <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, margin: 0 }}>
            This territory is structurally underserved at this Focus. The work is not just hard, it is largely unattended. New actors, fresh capital, and contributor knowledge would all move the picture. If you know an organisation working here that isn't on the map, nominate them.
          </p>
        </div>

        {/* Footer — methodology link, indicator count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)' }}>
            Computed from {payload.indicator_count} indicator{payload.indicator_count === 1 ? '' : 's'}
            {payload.fresh === false ? ' \u00b7 cached' : ' \u00b7 fresh'}
          </div>
          <button
            onClick={onClose}
            style={{
              ...sc, fontSize: '12px', letterSpacing: '0.16em',
              padding: '8px 18px', borderRadius: '40px',
              border: `1.5px solid ${goldDark}80`,
              background: 'transparent', color: goldDark,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}

function capitalise(slug) {
  if (!slug) return ''
  return slug
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}
