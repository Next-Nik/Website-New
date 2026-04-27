// src/beta/components/feed/items/SprintCompletedItem.jsx
// "<Person> closed a sprint reflecting on <outcome>"

import { FeedItemShell } from '../FeedItemShell'
import { body, sc, SELF_DOMAIN_LABEL } from '../feedShared'

export function SprintCompletedItem({ item }) {
  const { actor, sprint, timestamp } = item
  const domains = sprint?.domains || []
  const dd      = sprint?.domain_data || {}

  // Outcome: prefer reflection / debrief text on the sprint, fall back to first targetGoal
  let outcome = sprint?.outcome_text || sprint?.reflection || sprint?.debrief_summary || null
  if (!outcome) {
    for (const d of domains) {
      if (dd[d]?.targetGoal) { outcome = dd[d].targetGoal; break }
    }
  }

  return (
    <FeedItemShell
      eyebrow="Sprint completed"
      actorName={actor.display_name || 'A contributor'}
      actorHref={actor.id ? `/beta/profile/${actor.id}` : null}
      timestamp={timestamp}
      accentColor="#2D6A4F"
    >
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.75)', lineHeight: 1.65, margin: 0 }}>
        Closed a sprint reflecting on:
      </p>

      {outcome ? (
        <p style={{
          ...body,
          fontSize: '15px',
          fontWeight: 300,
          color: '#0F1523',
          lineHeight: 1.7,
          margin: '8px 0 0',
          paddingLeft: '14px',
          borderLeft: '2px solid rgba(45,106,79,0.35)',
        }}>
          {outcome}
        </p>
      ) : (
        <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.50)', margin: '8px 0 0' }}>
          A sprint they have just finished.
        </p>
      )}

      {domains.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
          {domains.map(d => (
            <span key={d} style={{
              ...sc,
              fontSize: '10px',
              letterSpacing: '0.14em',
              color: '#2D6A4F',
              background: 'rgba(45,106,79,0.06)',
              border: '1px solid rgba(45,106,79,0.22)',
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
