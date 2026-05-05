// src/beta/components/feed/items/NeedPostedItem.jsx
// "<Org> needs <description> at <tier> tier"
// In-person needs render with an explicit "In person" badge per the in-person bias.

import { FeedItemShell } from '../FeedItemShell'
import { body, sc, gold, TIER_LABEL } from '../feedShared'

export function NeedPostedItem({ item }) {
  const { actor, need, timestamp } = item
  const tierLabel = TIER_LABEL[need?.size] || need?.size || ''
  const isInPerson = need?.medium === 'in_person'

  return (
    <FeedItemShell
      eyebrow="Need posted"
      actorName={actor.name || actor.display_name || 'An organisation'}
      actorHref={actor.id ? `/beta/org/${actor.id}` : null}
      timestamp={timestamp}
      accentColor={isInPerson ? '#A8721A' : 'rgba(200,146,42,0.50)'}
    >
      {/* Type / size / medium row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
        {tierLabel && (
          <span style={{
            ...sc,
            fontSize: '10px',
            letterSpacing: '0.14em',
            color: gold,
            background: 'rgba(200,146,42,0.07)',
            border: '1px solid rgba(200,146,42,0.25)',
            borderRadius: '4px',
            padding: '2px 8px',
            textTransform: 'uppercase',
          }}>
            {tierLabel} tier
          </span>
        )}

        {need?.need_type && (
          <span style={{
            ...sc,
            fontSize: '10px',
            letterSpacing: '0.12em',
            color: 'rgba(15,21,35,0.55)',
            background: 'rgba(15,21,35,0.04)',
            border: '1px solid rgba(15,21,35,0.10)',
            borderRadius: '4px',
            padding: '2px 8px',
          }}>
            {need.need_type}
          </span>
        )}

        {isInPerson && (
          <span style={{
            ...sc,
            fontSize: '10px',
            letterSpacing: '0.16em',
            color: '#FFFFFF',
            background: gold,
            borderRadius: '4px',
            padding: '2px 8px',
            textTransform: 'uppercase',
          }}>
            In person
          </span>
        )}

        {need?.time_estimate && (
          <span style={{
            ...sc,
            fontSize: '10px',
            letterSpacing: '0.12em',
            color: 'rgba(15,21,35,0.55)',
          }}>
            {need.time_estimate}
          </span>
        )}
      </div>

      {/* Title */}
      {need?.title && (
        <p style={{
          ...body,
          fontSize: '16px',
          fontWeight: 400,
          color: '#0F1523',
          lineHeight: 1.5,
          margin: '0 0 6px',
        }}>
          {need.title}
        </p>
      )}

      {/* Description */}
      {need?.description && (
        <p style={{
          ...body,
          fontSize: '14px',
          color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.65,
          margin: 0,
        }}>
          {need.description.length > 200
            ? need.description.slice(0, 200) + '...'
            : need.description}
        </p>
      )}
    </FeedItemShell>
  )
}
