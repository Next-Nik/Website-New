// src/beta/components/PrincipleStrip.jsx
// Module 1.5 primitive. Renders an array of PrincipleBadge components.
// Shows up to four; collapses additional behind "+ more".

import { useState } from 'react'
import { PrincipleBadge } from './PrincipleBadge'

export function PrincipleStrip({ taggings = [], maxVisible = 4 }) {
  const [expanded, setExpanded] = useState(false)

  if (!taggings || taggings.length === 0) return null

  const visible = expanded ? taggings : taggings.slice(0, maxVisible)
  const hidden = taggings.length - maxVisible

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
      {visible.map(t => (
        <PrincipleBadge
          key={t.principle_slug || t.slug}
          slug={t.principle_slug || t.slug}
          weight={t.weight || 'primary'}
          inline
        />
      ))}
      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            fontFamily: "'Cormorant SC', Georgia, serif",
            fontSize: '11px',
            letterSpacing: '0.12em',
            color: 'rgba(15,21,35,0.55)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '3px 6px',
          }}
        >
          +{hidden} more
        </button>
      )}
    </div>
  )
}
