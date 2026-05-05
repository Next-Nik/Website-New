// src/beta/components/feed/items/BilateralPublishedItem.jsx
// "<Person A> and <Person/Org B> published <artefact type>"

import { FeedItemShell } from '../FeedItemShell'
import { body, BILATERAL_LABEL } from '../feedShared'

export function BilateralPublishedItem({ item }) {
  const { partyA, partyB, artefactType, payload, timestamp } = item

  const artefactPhrase = BILATERAL_LABEL[artefactType] || 'a bilateral artefact'

  // Resolve party B href — could be a user or an actor (org)
  const partyBHref = partyB?.kind === 'org'
    ? (partyB.id ? `/beta/org/${partyB.id}` : null)
    : (partyB?.id ? `/beta/profile/${partyB.id}` : null)

  return (
    <FeedItemShell
      eyebrow="Bilateral published"
      actorName={partyA?.display_name || 'Someone'}
      actorHref={partyA?.id ? `/beta/profile/${partyA.id}` : null}
      secondaryName={partyB?.display_name || partyB?.name || 'someone'}
      secondaryHref={partyBHref}
      timestamp={timestamp}
      accentColor="#5C7FA3"
    >
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.75)', lineHeight: 1.65, margin: 0 }}>
        Published {artefactPhrase}.
      </p>

      {/* If the payload has a title or summary, show it */}
      {(payload?.title || payload?.summary) && (
        <p style={{
          ...body,
          fontSize: '14px',
          color: 'rgba(15,21,35,0.60)',
          lineHeight: 1.65,
          margin: '8px 0 0',
          paddingLeft: '14px',
          borderLeft: '2px solid rgba(92,127,163,0.30)',
        }}>
          {payload.title || payload.summary}
        </p>
      )}
    </FeedItemShell>
  )
}
