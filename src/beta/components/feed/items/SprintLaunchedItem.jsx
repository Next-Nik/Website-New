// src/beta/components/feed/items/SprintLaunchedItem.jsx
// "<Person> started a sprint pointed at <horizon goal>"

import { FeedItemShell } from '../FeedItemShell'
import { body, sc, SELF_DOMAIN_LABEL } from '../feedShared'

export function SprintLaunchedItem({ item }) {
  const { actor, sprint, timestamp } = item
  const domains = sprint?.domains || []
  const dd      = sprint?.domain_data || {}

  // Pull the primary horizon goal — first domain with a horizonText
  let horizonGoal = null
  let horizonDomain = null
  for (const d of domains) {
    if (dd[d]?.horizonText) {
      horizonGoal   = dd[d].horizonText
      horizonDomain = d
      break
    }
  }

  // Fall back to targetGoal if no horizon text was set
  if (!horizonGoal) {
    for (const d of domains) {
      if (dd[d]?.targetGoal) {
        horizonGoal   = dd[d].targetGoal
        horizonDomain = d
        break
      }
    }
  }

  return (
    <FeedItemShell
      eyebrow="Sprint launched"
      actorName={actor.display_name || 'A contributor'}
      actorHref={actor.id ? `/beta/profile/${actor.id}` : null}
      timestamp={timestamp}
    >
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.75)', lineHeight: 1.65, margin: 0 }}>
        Started a sprint pointed at:
      </p>

      <p style={{
        ...body,
        fontSize: '16px',
        fontWeight: 300,
        fontStyle: 'italic',
        color: '#0F1523',
        lineHeight: 1.65,
        margin: '8px 0 0',
        paddingLeft: '14px',
        borderLeft: '2px solid rgba(200,146,42,0.30)',
      }}>
        {horizonGoal || 'a domain they have chosen to focus on'}
      </p>

      {/* Domain chips */}
      {domains.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
          {domains.map(d => (
            <span key={d} style={{
              ...sc,
              fontSize: '10px',
              letterSpacing: '0.14em',
              color: '#A8721A',
              background: 'rgba(200,146,42,0.06)',
              border: '1px solid rgba(200,146,42,0.22)',
              borderRadius: '4px',
              padding: '2px 8px',
            }}>
              {SELF_DOMAIN_LABEL[d] || d}
            </span>
          ))}
        </div>
      )}
    </FeedItemShell>
  )
}
