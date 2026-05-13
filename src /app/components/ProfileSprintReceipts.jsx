// src/beta/components/ProfileSprintReceipts.jsx
// Sprint receipts: completed sprints marked visible.

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

function ReceiptCard({ sprint }) {
  const domains = sprint.domains || []
  const dd = sprint.domain_data || {}
  const completedAt = sprint.completed_at || sprint.updated_at

  return (
    <div style={{
      padding: '20px 24px',
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.12)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '20px',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: '180px' }}>
        {/* Completed date */}
        {completedAt && (
          <div style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.14em',
            color: 'rgba(15,21,35,0.35)',
            marginBottom: '10px',
            textTransform: 'uppercase',
          }}>
            Complete {new Date(completedAt).toLocaleDateString('en-GB', {
              month: 'long', year: 'numeric',
            })}
          </div>
        )}

        {/* Domain tags */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {domains.map(id => (
            <span key={id} style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.12em',
              color: 'rgba(45,106,79,0.85)',
              background: 'rgba(45,106,79,0.07)',
              border: '1px solid rgba(45,106,79,0.22)',
              borderRadius: '4px',
              padding: '3px 9px',
            }}>
              {SELF_DOMAIN_LABELS[id] || id}
            </span>
          ))}
        </div>
      </div>

      {/* Domain goals */}
      <div style={{ flex: 2, minWidth: '220px' }}>
        {domains.map(id => {
          const d = dd[id] || {}
          if (!d.targetGoal) return null
          return (
            <p key={id} style={{
              ...body,
              fontSize: '14px',
              fontWeight: 300,
              color: 'rgba(15,21,35,0.65)',
              lineHeight: 1.6,
              margin: '0 0 6px',
            }}>
              {d.targetGoal}
            </p>
          )
        })}
      </div>
    </div>
  )
}

export function ProfileSprintReceipts({ completedSprints }) {
  if (!completedSprints || completedSprints.length === 0) return null

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
        Sprint receipts
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {completedSprints.map(sprint => (
          <ReceiptCard key={sprint.id} sprint={sprint} />
        ))}
      </div>
    </div>
  )
}
