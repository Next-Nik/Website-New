// src/beta/components/ProfileIAStatements.jsx
// Renders published "I am" statements from horizon_profile per domain.
// Only domains with visibility = public render.

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const SELF_DOMAIN_LABELS = {
  path:       'Path',
  spark:      'Spark',
  body:       'Body',
  finances:   'Finances',
  connection: 'Connection',
  'inner-game': 'Inner Game',
  inner_game: 'Inner Game',
  signal:     'Signal',
}

export function ProfileIAStatements({ iaStatements }) {
  if (!iaStatements || iaStatements.length === 0) return null

  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {iaStatements.map(({ domain, statement }) => (
          <div key={domain}>
            {SELF_DOMAIN_LABELS[domain] && (
              <div style={{
                ...sc,
                fontSize: '11px',
                letterSpacing: '0.18em',
                color: 'rgba(15,21,35,0.35)',
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}>
                {SELF_DOMAIN_LABELS[domain]}
              </div>
            )}
            <p style={{
              ...body,
              fontSize: 'clamp(16px, 2vw, 19px)',
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#0F1523',
              lineHeight: 1.7,
              margin: 0,
            }}>
              {statement}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
