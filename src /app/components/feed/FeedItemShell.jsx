// src/beta/components/feed/FeedItemShell.jsx
// Shared chrome around every feed-item type.
// Holds: actor avatar dot (placeholder), name link, time, eyebrow label,
// then renders children for the body. Keeps the cards visually unified.

import { Link } from 'react-router-dom'
import { body, sc, gold, dark, timeAgo } from './feedShared'

export function FeedItemShell({
  eyebrow,
  actorName,
  actorHref,
  secondaryName,
  secondaryHref,
  timestamp,
  children,
  accentColor,
}) {
  const accent = accentColor || gold

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.14)',
      borderLeft: `3px solid ${accent}`,
      borderRadius: '12px',
      padding: '20px 22px',
      marginBottom: '14px',
    }}>

      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: children ? '12px' : 0,
      }}>
        {eyebrow && (
          <span style={{
            ...sc,
            fontSize: '10px',
            letterSpacing: '0.20em',
            color: accent,
            textTransform: 'uppercase',
          }}>
            {eyebrow}
          </span>
        )}

        <span style={{ flex: 1 }} />

        {timestamp && (
          <span style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.12em',
            color: 'rgba(15,21,35,0.40)',
          }}>
            {timeAgo(timestamp)}
          </span>
        )}
      </div>

      {/* Actor line */}
      <div style={{ marginBottom: children ? '10px' : 0 }}>
        {actorHref ? (
          <Link to={actorHref} style={{
            ...body,
            fontSize: '15px',
            fontWeight: 400,
            color: dark,
            textDecoration: 'none',
            borderBottom: '1px dotted rgba(15,21,35,0.20)',
          }}>
            {actorName}
          </Link>
        ) : (
          <span style={{ ...body, fontSize: '15px', fontWeight: 400, color: dark }}>
            {actorName}
          </span>
        )}

        {secondaryName && (
          <>
            <span style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', margin: '0 6px' }}>
              and
            </span>
            {secondaryHref ? (
              <Link to={secondaryHref} style={{
                ...body,
                fontSize: '15px',
                fontWeight: 400,
                color: dark,
                textDecoration: 'none',
                borderBottom: '1px dotted rgba(15,21,35,0.20)',
              }}>
                {secondaryName}
              </Link>
            ) : (
              <span style={{ ...body, fontSize: '15px', fontWeight: 400, color: dark }}>
                {secondaryName}
              </span>
            )}
          </>
        )}
      </div>

      {/* Body */}
      {children}
    </div>
  )
}
