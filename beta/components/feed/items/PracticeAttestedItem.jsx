// src/beta/components/feed/items/PracticeAttestedItem.jsx
// "<Person> attested to a practice: <title>"

import { Link } from 'react-router-dom'
import { FeedItemShell } from '../FeedItemShell'
import { body, sc, gold } from '../feedShared'

export function PracticeAttestedItem({ item }) {
  const { actor, practice, attesterRole, timestamp } = item

  return (
    <FeedItemShell
      eyebrow="Practice attested"
      actorName={actor.display_name || 'A contributor'}
      actorHref={actor.id ? `/beta/profile/${actor.id}` : null}
      timestamp={timestamp}
      accentColor="#7A6B8A"
    >
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.75)', lineHeight: 1.65, margin: '0 0 6px' }}>
        Attested to a practice:
      </p>

      {practice?.slug ? (
        <Link to={`/beta/practice/${practice.slug}`} style={{
          ...body,
          fontSize: '16px',
          fontWeight: 400,
          color: '#0F1523',
          textDecoration: 'none',
          borderBottom: '1px dotted rgba(15,21,35,0.20)',
          display: 'inline-block',
        }}>
          {practice.title}
        </Link>
      ) : (
        <p style={{ ...body, fontSize: '16px', fontWeight: 400, color: '#0F1523', margin: 0 }}>
          {practice?.title || 'A practice'}
        </p>
      )}

      {attesterRole && (
        <p style={{
          ...sc,
          fontSize: '11px',
          letterSpacing: '0.12em',
          color: 'rgba(15,21,35,0.50)',
          margin: '8px 0 0',
        }}>
          {attesterRole}
        </p>
      )}
    </FeedItemShell>
  )
}
