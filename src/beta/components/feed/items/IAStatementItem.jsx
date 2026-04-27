// src/beta/components/feed/items/IAStatementItem.jsx
// "<Person> published 'I am <statement>'"

import { FeedItemShell } from '../FeedItemShell'
import { body, sc, SELF_DOMAIN_LABEL } from '../feedShared'

export function IAStatementItem({ item }) {
  const { actor, statement, domain, timestamp } = item

  // Strip leading "I am " if the statement already includes it, since we render
  // "I am" as a typographic prefix below.
  const cleanStatement = (statement || '')
    .replace(/^I am\s+/i, '')
    .trim()

  return (
    <FeedItemShell
      eyebrow="I am"
      actorName={actor.display_name || 'A contributor'}
      actorHref={actor.id ? `/beta/profile/${actor.id}` : null}
      timestamp={timestamp}
    >
      <div style={{
        paddingLeft: '14px',
        borderLeft: '2px solid rgba(200,146,42,0.30)',
      }}>
        <p style={{
          ...body,
          fontSize: 'clamp(16px, 1.8vw, 18px)',
          fontWeight: 300,
          fontStyle: 'italic',
          color: '#0F1523',
          lineHeight: 1.7,
          margin: 0,
        }}>
          <span style={{ color: 'rgba(15,21,35,0.50)', fontStyle: 'normal', fontSize: '14px', letterSpacing: '0.04em', marginRight: '6px' }}>
            I am
          </span>
          {cleanStatement}
        </p>
      </div>

      {domain && SELF_DOMAIN_LABEL[domain] && (
        <div style={{ marginTop: '10px' }}>
          <span style={{
            ...sc,
            fontSize: '10px',
            letterSpacing: '0.14em',
            color: '#A8721A',
            background: 'rgba(200,146,42,0.06)',
            border: '1px solid rgba(200,146,42,0.22)',
            borderRadius: '4px',
            padding: '2px 8px',
          }}>
            {SELF_DOMAIN_LABEL[domain]}
          </span>
        </div>
      )}
    </FeedItemShell>
  )
}
