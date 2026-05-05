// src/beta/components/feed/items/PracticeContributedItem.jsx
// "<Person> contributed a practice: <title> [domain badge] [principle badge]"

import { Link } from 'react-router-dom'
import { FeedItemShell } from '../FeedItemShell'
import { body, sc, gold, CIV_DOMAIN_LABEL } from '../feedShared'
import { PrincipleBadge } from '../../PrincipleBadge'
import { DOMAIN_COLORS } from '../../../constants/domains'

export function PracticeContributedItem({ item }) {
  const { actor, practice, timestamp } = item
  const primaryDomain    = (practice?.domains || [])[0] || null
  const primaryPrinciple = (practice?.platform_principles || [])[0] || null

  const domainColor = primaryDomain ? DOMAIN_COLORS[primaryDomain] : null

  const PRACTICE_KIND_LABEL = {
    best_for_all:        'Best for All',
    best_for_individual: 'Best for the Individual',
  }
  const kindLabel = practice?.practice_kind ? PRACTICE_KIND_LABEL[practice.practice_kind] : null

  return (
    <FeedItemShell
      eyebrow="Practice contributed"
      actorName={actor.display_name || 'A contributor'}
      actorHref={actor.id ? `/beta/profile/${actor.id}` : null}
      timestamp={timestamp}
      accentColor={domainColor || gold}
    >
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.75)', lineHeight: 1.65, margin: '0 0 8px' }}>
        Contributed a practice:
      </p>

      {/* Practice title — link to the practice detail page */}
      {practice?.slug ? (
        <Link to={`/beta/practice/${practice.slug}`} style={{
          ...body,
          fontSize: '17px',
          fontWeight: 400,
          color: '#0F1523',
          textDecoration: 'none',
          borderBottom: '1px dotted rgba(15,21,35,0.20)',
          display: 'inline-block',
          marginBottom: '10px',
        }}>
          {practice.title}
        </Link>
      ) : (
        <p style={{ ...body, fontSize: '17px', fontWeight: 400, color: '#0F1523', margin: '0 0 10px' }}>
          {practice?.title || 'Untitled practice'}
        </p>
      )}

      {/* Domain + kind + principle badges row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
        {primaryDomain && (
          <span style={{
            ...sc,
            fontSize: '10px',
            letterSpacing: '0.14em',
            color: '#FFFFFF',
            background: domainColor || gold,
            borderRadius: '4px',
            padding: '3px 9px',
            textTransform: 'uppercase',
          }}>
            {CIV_DOMAIN_LABEL[primaryDomain] || primaryDomain}
          </span>
        )}

        {kindLabel && (
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
            {kindLabel}
          </span>
        )}

        {primaryPrinciple && (
          <PrincipleBadge slug={primaryPrinciple} weight="primary" inline />
        )}
      </div>
    </FeedItemShell>
  )
}
