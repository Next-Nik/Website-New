// src/beta/components/BilateralCard.jsx
// Read-only display for a published bilateral artefact.
// Renders on both parties' public profiles when published=true.
// Optionally shows revoke / republish controls when isParty=true (profile edit surface).

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ARTEFACT_TYPE_LABEL, revoke, republish } from '../hooks/useBilateral'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold = '#A8721A'
const dark = '#0F1523'

// ── Payload renderers per type ───────────────────────────────

const SELF_DOMAIN_LABEL = {
  path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
  connection: 'Connection', 'inner-game': 'Inner Game', signal: 'Signal',
}

const CIV_DOMAIN_LABEL = {
  'human-being': 'Human Being', 'society': 'Society', 'nature': 'Nature',
  'technology': 'Technology', 'finance-economy': 'Finance and Economy',
  'legacy': 'Legacy', 'vision': 'Vision',
}

function SprintBuddyDisplay({ payload }) {
  return (
    <>
      {payload.sprint_window && (
        <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>
          {payload.sprint_window}
        </p>
      )}
      {payload.commitment_note && (
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, marginBottom: '10px' }}>
          {payload.commitment_note}
        </p>
      )}
      {payload.shared_domains?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {payload.shared_domains.map(d => (
            <span key={d} style={{
              ...sc, fontSize: '10px', letterSpacing: '0.12em', color: gold,
              background: 'rgba(200,146,42,0.07)',
              border: '1px solid rgba(200,146,42,0.22)',
              borderRadius: '4px', padding: '2px 8px',
            }}>
              {SELF_DOMAIN_LABEL[d] || d}
            </span>
          ))}
        </div>
      )}
    </>
  )
}

function PractitionerRelationshipDisplay({ payload }) {
  return (
    <>
      {payload.title && (
        <p style={{ ...body, fontSize: '16px', fontWeight: 400, color: dark, marginBottom: '8px' }}>
          {payload.title}
        </p>
      )}
      {payload.started_at && (
        <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.50)', marginBottom: '8px' }}>
          Since {payload.started_at}
        </p>
      )}
      {payload.description && (
        <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7 }}>
          {payload.description}
        </p>
      )}
    </>
  )
}

function CollaborationCardDisplay({ payload }) {
  return (
    <>
      {payload.title && (
        <p style={{ ...body, fontSize: '16px', fontWeight: 400, color: dark, marginBottom: '8px' }}>
          {payload.title}
        </p>
      )}
      {payload.description && (
        <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, marginBottom: '10px' }}>
          {payload.description}
        </p>
      )}
      {payload.domain_tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {payload.domain_tags.map(d => (
            <span key={d} style={{
              ...sc, fontSize: '10px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)',
              background: 'rgba(15,21,35,0.04)',
              border: '1px solid rgba(15,21,35,0.10)',
              borderRadius: '4px', padding: '2px 8px',
            }}>
              {CIV_DOMAIN_LABEL[d] || d}
            </span>
          ))}
        </div>
      )}
    </>
  )
}

function PodcastEmbedDisplay({ payload }) {
  return (
    <>
      {payload.episode_title && (
        <p style={{ ...body, fontSize: '16px', fontWeight: 400, color: dark, marginBottom: '6px' }}>
          {payload.episode_title}
        </p>
      )}
      {payload.published_at && (
        <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.50)', marginBottom: '8px' }}>
          {payload.published_at}
        </p>
      )}
      {payload.description && (
        <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, marginBottom: '10px' }}>
          {payload.description}
        </p>
      )}
      {payload.episode_url && (
        <a
          href={payload.episode_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold, textDecoration: 'none' }}
        >
          Listen
        </a>
      )}
    </>
  )
}

function PayloadDisplay({ artefactType, payload }) {
  switch (artefactType) {
    case 'sprint_buddy':              return <SprintBuddyDisplay payload={payload} />
    case 'practitioner_relationship': return <PractitionerRelationshipDisplay payload={payload} />
    case 'collaboration_card':        return <CollaborationCardDisplay payload={payload} />
    case 'podcast_embed':             return <PodcastEmbedDisplay payload={payload} />
    default:                          return null
  }
}

// ── Main card ────────────────────────────────────────────────

export function BilateralCard({
  bilateral,
  // Names for the two parties — caller resolves these
  partyAName,
  partyAId,
  partyBName,
  partyBId,
  partyBIsOrg,
  // If the viewer is a party, show revoke controls
  isParty,
  currentUserId,
  onRevoked,
  onRepublished,
  // When rendered in the revoked list on the edit surface
  isRevoked,
}) {
  const [acting, setActing] = useState(false)
  const [err, setErr]       = useState(null)

  const typeLabel = ARTEFACT_TYPE_LABEL[bilateral.artefact_type] || bilateral.artefact_type

  async function handleRevoke() {
    setActing(true); setErr(null)
    try {
      await revoke(bilateral.id, currentUserId)
      onRevoked?.()
    } catch (e) {
      setErr(e.message || 'Could not revoke.')
    } finally {
      setActing(false)
    }
  }

  async function handleRepublish() {
    setActing(true); setErr(null)
    try {
      await republish(bilateral.id, currentUserId)
      onRepublished?.()
    } catch (e) {
      setErr(e.message || 'Could not republish.')
    } finally {
      setActing(false)
    }
  }

  return (
    <div style={{
      padding: '22px 24px',
      background: isRevoked ? 'rgba(15,21,35,0.02)' : '#FFFFFF',
      border: isRevoked
        ? '1px solid rgba(15,21,35,0.10)'
        : '1px solid rgba(200,146,42,0.18)',
      borderRadius: '12px',
      opacity: isRevoked ? 0.65 : 1,
    }}>
      {/* Header: type eyebrow + party names */}
      <div style={{ marginBottom: '14px' }}>
        <span style={{
          ...sc, fontSize: '10px', letterSpacing: '0.20em',
          color: isRevoked ? 'rgba(15,21,35,0.40)' : gold,
          textTransform: 'uppercase', display: 'block', marginBottom: '8px',
        }}>
          {typeLabel}
          {isRevoked && (
            <span style={{ marginLeft: '10px', color: 'rgba(15,21,35,0.40)' }}>Unpublished</span>
          )}
        </span>

        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px' }}>
          {partyAId ? (
            <Link to={`/beta/profile/${partyAId}`} style={{
              ...body, fontSize: '15px', fontWeight: 400, color: dark,
              textDecoration: 'none', borderBottom: '1px dotted rgba(15,21,35,0.20)',
            }}>
              {partyAName}
            </Link>
          ) : (
            <span style={{ ...body, fontSize: '15px', fontWeight: 400, color: dark }}>{partyAName}</span>
          )}

          <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.50)' }}>and</span>

          {partyBId ? (
            <Link
              to={partyBIsOrg ? `/beta/org/${partyBId}` : `/beta/profile/${partyBId}`}
              style={{
                ...body, fontSize: '15px', fontWeight: 400, color: dark,
                textDecoration: 'none', borderBottom: '1px dotted rgba(15,21,35,0.20)',
              }}
            >
              {partyBName}
            </Link>
          ) : (
            <span style={{ ...body, fontSize: '15px', fontWeight: 400, color: dark }}>{partyBName}</span>
          )}
        </div>
      </div>

      {/* Payload */}
      <PayloadDisplay
        artefactType={bilateral.artefact_type}
        payload={bilateral.payload || {}}
      />

      {/* Error */}
      {err && (
        <p style={{ ...body, fontSize: '13px', color: '#8A3030', marginTop: '10px' }}>{err}</p>
      )}

      {/* Revoke / republish controls — only for parties, on edit surface */}
      {isParty && (
        <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!isRevoked ? (
            <button
              onClick={handleRevoke}
              disabled={acting}
              style={{
                ...sc, fontSize: '12px', letterSpacing: '0.12em',
                padding: '7px 16px', borderRadius: '40px', cursor: 'pointer',
                background: 'rgba(138,48,48,0.04)',
                border: '1px solid rgba(138,48,48,0.30)',
                color: '#8A3030', opacity: acting ? 0.5 : 1,
              }}
            >
              {acting ? 'Revoking...' : 'Unpublish'}
            </button>
          ) : (
            <button
              onClick={handleRepublish}
              disabled={acting}
              style={{
                ...sc, fontSize: '12px', letterSpacing: '0.12em',
                padding: '7px 16px', borderRadius: '40px', cursor: 'pointer',
                background: 'rgba(200,146,42,0.05)',
                border: '1px solid rgba(200,146,42,0.40)',
                color: gold, opacity: acting ? 0.5 : 1,
              }}
            >
              {acting ? 'Republishing...' : 'Republish'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
