// src/beta/components/ProfileStands.jsx
// "What I stand for" section: ia statements, free-text, principle alignment.
// Composed from ProfileIAStatements + ProfilePrincipleAlignment.

import { ProfileIAStatements } from './ProfileIAStatements'
import { ProfilePrincipleAlignment } from './ProfilePrincipleAlignment'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

export function ProfileStands({ iaStatements, whatIStandFor, principleTaggings }) {
  const hasIA        = iaStatements && iaStatements.length > 0
  const hasStandFor  = !!whatIStandFor
  const hasPrinciples = principleTaggings && principleTaggings.length > 0

  if (!hasIA && !hasStandFor && !hasPrinciples) return null

  return (
    <div style={{ marginBottom: '72px' }}>
      <div style={{
        ...sc,
        fontSize: '11px',
        letterSpacing: '0.22em',
        color: 'rgba(15,21,35,0.40)',
        marginBottom: '28px',
        textTransform: 'uppercase',
      }}>
        What I stand for
      </div>

      {/* "I am" statements */}
      {hasIA && (
        <ProfileIAStatements iaStatements={iaStatements} />
      )}

      {/* Free-text what_i_stand_for */}
      {hasStandFor && (
        <p style={{
          ...body,
          fontSize: '17px',
          fontWeight: 300,
          color: 'rgba(15,21,35,0.75)',
          lineHeight: 1.75,
          margin: hasIA ? '24px 0 0' : '0',
          maxWidth: '560px',
        }}>
          {whatIStandFor}
        </p>
      )}

      {/* Platform principle alignment */}
      {hasPrinciples && (
        <div style={{ marginTop: '28px' }}>
          <ProfilePrincipleAlignment principleTaggings={principleTaggings} />
        </div>
      )}
    </div>
  )
}
