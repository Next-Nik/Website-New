// src/beta/components/ProfilePrincipleAlignment.jsx
// Renders engaged platform principles using Module 1.5 PrincipleStrip.

import { PrincipleStrip } from './PrincipleStrip'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

export function ProfilePrincipleAlignment({ principleTaggings }) {
  if (!principleTaggings || principleTaggings.length === 0) return null

  return (
    <div>
      <div style={{
        ...sc,
        fontSize: '11px',
        letterSpacing: '0.18em',
        color: 'rgba(15,21,35,0.35)',
        marginBottom: '12px',
        textTransform: 'uppercase',
      }}>
        Platform principles
      </div>
      <PrincipleStrip taggings={principleTaggings} />
    </div>
  )
}
