// src/beta/components/ProfileSprints.jsx
// Up to three visible active sprints. Read-only. No engagement metrics.

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const SELF_DOMAIN_LABELS = {
  path:       'Path',
  spark:      'Spark',
  body:       'Body',
  finances:   'Finances',
  connection: 'Connection',
  inner_game: 'Inner Game',
  signal:     'Signal',
}

function domainLabel(id) {
  return SELF_DOMAIN_LABELS[id] || id
}

function daysRemaining(targetDate) {
  if (!targetDate) return null
  const ms = new Date(targetDate) - new Date()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function SprintCard({ sprint }) {
  const domains = sprint.domains || []
  const dd = sprint.domain_data || {}
  const days = daysRemaining(sprint.target_date)

  return (
    <div style={{
      padding: '24px',
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.18)',
      borderRadius: '14px',
    }}>
      {/* Sprint domain tags */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {domains.map(id => (
          <span key={id} style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.14em',
            color: '#A8721A',
            background: 'rgba(200,146,42,0.07)',
            border: '1px solid rgba(200,146,42,0.22)',
            borderRadius: '4px',
            padding: '3px 9px',
          }}>
            {domainLabel(id)}
          </span>
        ))}

        {days != null && (
          <span style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.12em',
            color: days <= 14 ? '#8A3030' : 'rgba(15,21,35,0.45)',
            background: days <= 14 ? 'rgba(138,48,48,0.05)' : 'transparent',
            border: `1px solid ${days <= 14 ? 'rgba(138,48,48,0.20)' : 'rgba(15,21,35,0.10)'}`,
            borderRadius: '4px',
            padding: '3px 9px',
            marginLeft: 'auto',
          }}>
            {days > 0 ? `${days}d remaining` : `${Math.abs(days)}d overdue`}
          </span>
        )}
      </div>

      {/* Domain goals — visible goals only */}
      {domains.map(id => {
        const d = dd[id] || {}
        if (!d.targetGoal) return null
        return (
          <div key={id} style={{ marginBottom: '10px' }}>
            <div style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.14em',
              color: 'rgba(15,21,35,0.40)',
              marginBottom: '4px',
            }}>
              {domainLabel(id)}
            </div>
            <p style={{
              ...body,
              fontSize: '15px',
              fontWeight: 300,
              color: '#0F1523',
              lineHeight: 1.65,
              margin: 0,
            }}>
              {d.targetGoal}
            </p>
          </div>
        )
      })}

      {/* Started date */}
      {sprint.created_at && (
        <div style={{
          ...sc,
          fontSize: '11px',
          letterSpacing: '0.10em',
          color: 'rgba(15,21,35,0.35)',
          marginTop: '14px',
        }}>
          Started {new Date(sprint.created_at).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </div>
      )}
    </div>
  )
}

export function ProfileSprints({ activeSprints }) {
  if (!activeSprints || activeSprints.length === 0) return null

  return (
    <div style={{ marginBottom: '72px' }}>
      <div style={{
        ...sc,
        fontSize: '11px',
        letterSpacing: '0.22em',
        color: 'rgba(15,21,35,0.40)',
        marginBottom: '24px',
        textTransform: 'uppercase',
      }}>
        What I am working on
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeSprints.slice(0, 3).map(sprint => (
          <SprintCard key={sprint.id} sprint={sprint} />
        ))}
      </div>
    </div>
  )
}
