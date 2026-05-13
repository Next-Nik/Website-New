// src/beta/components/BilateralInbox.jsx
// Bilateral artefact inbox panel, rendered on /beta/profile/edit.
// Shows: pending invitations (B accepts or declines), sent drafts, published,
// and revoked cards the viewer is party to.
// Decline is silent. Revocation is reversible.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../hooks/useSupabase'
import {
  ARTEFACT_TYPE_LABEL,
  fetchMyBilaterals,
  acceptDraft,
  declineDraft,
  revoke,
  republish,
} from '../hooks/useBilateral'
import { BilateralCard } from './BilateralCard'
import { BilateralCardEditor } from './BilateralCardEditor'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold = '#A8721A'
const dark = '#0F1523'

// ── Helper: resolve display names for a set of user ids ────────

async function resolveNames(userIds) {
  if (!userIds || userIds.length === 0) return {}
  const { data } = await supabase
    .from('contributor_profiles_beta')
    .select('user_id, display_name')
    .in('user_id', userIds.filter(Boolean))
  const map = {}
  ;(data || []).forEach(r => { map[r.user_id] = r.display_name })
  return map
}

// ── Pending invitation card (viewer is party B) ─────────────

function InvitationCard({ bilateral, partyAName, onAccepted, onDeclined }) {
  const [acting, setActing] = useState(false)
  const [err, setErr]       = useState(null)

  const typeLabel = ARTEFACT_TYPE_LABEL[bilateral.artefact_type] || bilateral.artefact_type

  async function handleAccept() {
    setActing(true); setErr(null)
    try {
      await acceptDraft(bilateral.id, bilateral.party_b_user_id)
      onAccepted()
    } catch (e) {
      setErr(e.message || 'Could not accept. Try again.')
      setActing(false)
    }
  }

  async function handleDecline() {
    setActing(true); setErr(null)
    try {
      await declineDraft(bilateral.id, bilateral.party_b_user_id)
      onDeclined()   // caller removes card from list; no visible trace for B
    } catch {
      setActing(false)
    }
  }

  return (
    <div style={{
      padding: '22px 24px',
      background: 'rgba(200,146,42,0.03)',
      border: '1.5px solid rgba(200,146,42,0.40)',
      borderRadius: '12px',
      marginBottom: '12px',
    }}>
      <p style={{ ...sc, fontSize: '10px', letterSpacing: '0.20em', color: gold, marginBottom: '8px' }}>
        Invitation -- {typeLabel}
      </p>

      <p style={{ ...body, fontSize: '15px', color: dark, marginBottom: '14px', lineHeight: 1.6 }}>
        <strong>{partyAName || 'Someone'}</strong> wants to publish a bilateral card with you.
      </p>

      {/* Preview the payload they drafted */}
      {bilateral.artefact_type === 'sprint_buddy' && bilateral.payload?.commitment_note && (
        <p style={{
          ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.65, marginBottom: '14px',
          paddingLeft: '14px', borderLeft: '2px solid rgba(200,146,42,0.30)',
        }}>
          {bilateral.payload.commitment_note}
        </p>
      )}

      {bilateral.artefact_type === 'practitioner_relationship' && bilateral.payload?.title && (
        <p style={{ ...body, fontSize: '15px', fontWeight: 400, color: dark, marginBottom: '14px' }}>
          {bilateral.payload.title}
        </p>
      )}

      {bilateral.artefact_type === 'collaboration_card' && bilateral.payload?.title && (
        <p style={{ ...body, fontSize: '15px', fontWeight: 400, color: dark, marginBottom: '14px' }}>
          {bilateral.payload.title}
        </p>
      )}

      {bilateral.artefact_type === 'podcast_embed' && bilateral.payload?.episode_title && (
        <p style={{ ...body, fontSize: '15px', fontWeight: 400, color: dark, marginBottom: '14px' }}>
          {bilateral.payload.episode_title}
        </p>
      )}

      {err && (
        <p style={{ ...body, fontSize: '13px', color: '#8A3030', marginBottom: '12px' }}>{err}</p>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={handleAccept}
          disabled={acting}
          style={{
            ...sc, fontSize: '13px', letterSpacing: '0.14em',
            padding: '10px 22px', borderRadius: '40px', cursor: acting ? 'not-allowed' : 'pointer',
            background: '#C8922A', border: '1.5px solid rgba(168,114,26,0.8)',
            color: '#FFFFFF', opacity: acting ? 0.6 : 1,
          }}
        >
          {acting ? 'Accepting...' : 'Accept'}
        </button>
        <button
          onClick={handleDecline}
          disabled={acting}
          style={{
            ...sc, fontSize: '13px', letterSpacing: '0.14em',
            padding: '10px 22px', borderRadius: '40px', cursor: 'pointer',
            background: 'transparent',
            border: '1px solid rgba(15,21,35,0.25)',
            color: 'rgba(15,21,35,0.55)',
          }}
        >
          Decline
        </button>
      </div>
    </div>
  )
}

// ── Sent-draft row ───────────────────────────────────────────

function SentDraftRow({ bilateral, partyBName, currentUserId, onWithdrawn, onEditOpen }) {
  const typeLabel = ARTEFACT_TYPE_LABEL[bilateral.artefact_type] || bilateral.artefact_type
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px',
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.14)',
      borderRadius: '10px',
      marginBottom: '8px',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      <div>
        <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.50)', marginBottom: '4px' }}>
          {typeLabel} -- awaiting response
        </p>
        <p style={{ ...body, fontSize: '15px', color: dark }}>
          {partyBName || 'Unknown'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onEditOpen(bilateral)}
          style={{
            ...sc, fontSize: '12px', letterSpacing: '0.12em',
            padding: '7px 16px', borderRadius: '40px', cursor: 'pointer',
            background: 'rgba(200,146,42,0.05)',
            border: '1px solid rgba(200,146,42,0.35)',
            color: gold,
          }}
        >
          Edit
        </button>
        <button
          onClick={() => onWithdrawn(bilateral.id)}
          style={{
            ...sc, fontSize: '12px', letterSpacing: '0.12em',
            padding: '7px 16px', borderRadius: '40px', cursor: 'pointer',
            background: 'rgba(138,48,48,0.04)',
            border: '1px solid rgba(138,48,48,0.28)',
            color: '#8A3030',
          }}
        >
          Withdraw
        </button>
      </div>
    </div>
  )
}

// ── Main inbox ───────────────────────────────────────────────

export function BilateralInbox({ currentUserId, currentDisplayName }) {
  const [groups, setGroups]         = useState(null)
  const [nameMap, setNameMap]       = useState({})
  const [loading, setLoading]       = useState(true)
  const [creating, setCreating]     = useState(false)
  const [editingBilateral, setEditingBilateral] = useState(null)
  const [showRevoked, setShowRevoked] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchMyBilaterals(currentUserId)
      setGroups(result)

      // Resolve names for all parties we don't know
      const allUserIds = new Set()
      const allRows = [
        ...result.pendingForMe,
        ...result.sentDrafts,
        ...result.published,
        ...result.revoked,
      ]
      allRows.forEach(r => {
        if (r.party_a_user_id) allUserIds.add(r.party_a_user_id)
        if (r.party_b_user_id) allUserIds.add(r.party_b_user_id)
      })
      allUserIds.delete(currentUserId)
      const names = await resolveNames([...allUserIds])
      names[currentUserId] = currentDisplayName || 'You'
      setNameMap(names)
    } finally {
      setLoading(false)
    }
  }, [currentUserId, currentDisplayName])

  useEffect(() => { load() }, [load])

  function partyAName(r) { return nameMap[r.party_a_user_id] || 'Someone' }
  function partyBName(r) { return r.party_b_user_id ? (nameMap[r.party_b_user_id] || 'Someone') : 'An organisation' }

  if (loading) {
    return (
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', padding: '24px 0' }}>
        Loading bilateral cards...
      </p>
    )
  }

  const { pendingForMe, sentDrafts, published, revoked } = groups

  return (
    <div>
      {/* Section header + create button */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div>
          <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: 'rgba(15,21,35,0.40)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Bilateral cards
          </p>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, maxWidth: '440px' }}>
            Two-sided artefacts that only publish when both of you have said yes.
          </p>
        </div>
        {!creating && !editingBilateral && (
          <button
            onClick={() => setCreating(true)}
            style={{
              ...sc, fontSize: '12px', letterSpacing: '0.14em',
              padding: '10px 20px', borderRadius: '40px', cursor: 'pointer',
              background: 'rgba(200,146,42,0.05)',
              border: '1.5px solid rgba(200,146,42,0.55)',
              color: gold, flexShrink: 0,
            }}
          >
            + Propose a card
          </button>
        )}
      </div>

      {/* Editor — create flow */}
      {creating && (
        <div style={{ marginBottom: '28px' }}>
          <BilateralCardEditor
            currentUserId={currentUserId}
            onCreated={() => { setCreating(false); load() }}
            onClose={() => setCreating(false)}
          />
        </div>
      )}

      {/* Editor — edit flow */}
      {editingBilateral && (
        <div style={{ marginBottom: '28px' }}>
          <BilateralCardEditor
            currentUserId={currentUserId}
            existingBilateral={{
              ...editingBilateral,
              _partyBName: partyBName(editingBilateral),
            }}
            onUpdated={() => { setEditingBilateral(null); load() }}
            onWithdrawn={() => { setEditingBilateral(null); load() }}
            onClose={() => setEditingBilateral(null)}
          />
        </div>
      )}

      {/* Pending invitations */}
      {pendingForMe.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: gold, marginBottom: '14px' }}>
            Invitations for you ({pendingForMe.length})
          </p>
          {pendingForMe.map(b => (
            <InvitationCard
              key={b.id}
              bilateral={b}
              partyAName={partyAName(b)}
              onAccepted={load}
              onDeclined={load}
            />
          ))}
        </div>
      )}

      {/* Sent drafts awaiting response */}
      {sentDrafts.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.50)', marginBottom: '14px' }}>
            Sent, awaiting response ({sentDrafts.length})
          </p>
          {sentDrafts.map(b => (
            <SentDraftRow
              key={b.id}
              bilateral={b}
              partyBName={partyBName(b)}
              currentUserId={currentUserId}
              onWithdrawn={async (id) => {
                const { withdrawDraft: wd } = await import('../hooks/useBilateral')
                await wd(id, currentUserId)
                load()
              }}
              onEditOpen={b => setEditingBilateral(b)}
            />
          ))}
        </div>
      )}

      {/* Published */}
      {published.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.50)', marginBottom: '14px' }}>
            Published ({published.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {published.map(b => (
              <BilateralCard
                key={b.id}
                bilateral={b}
                partyAName={partyAName(b)}
                partyAId={b.party_a_user_id}
                partyBName={partyBName(b)}
                partyBId={b.party_b_user_id}
                partyBIsOrg={!!b.party_b_actor_id}
                isParty
                currentUserId={currentUserId}
                onRevoked={load}
                onRepublished={load}
              />
            ))}
          </div>
        </div>
      )}

      {/* Revoked */}
      {revoked.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setShowRevoked(v => !v)}
            style={{
              ...sc, fontSize: '11px', letterSpacing: '0.16em',
              color: 'rgba(15,21,35,0.45)', background: 'none',
              border: 'none', cursor: 'pointer', padding: '0 0 14px',
            }}
          >
            {showRevoked ? 'Hide' : 'Show'} unpublished ({revoked.length})
          </button>
          {showRevoked && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {revoked.map(b => (
                <BilateralCard
                  key={b.id}
                  bilateral={b}
                  partyAName={partyAName(b)}
                  partyAId={b.party_a_user_id}
                  partyBName={partyBName(b)}
                  partyBId={b.party_b_user_id}
                  partyBIsOrg={!!b.party_b_actor_id}
                  isParty
                  currentUserId={currentUserId}
                  onRevoked={load}
                  onRepublished={load}
                  isRevoked
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {pendingForMe.length === 0 && sentDrafts.length === 0 && published.length === 0 && revoked.length === 0 && !creating && (
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.45)', lineHeight: 1.7 }}>
          No bilateral cards yet. Propose one to a person you have worked alongside, or someone you are sprinting with.
        </p>
      )}
    </div>
  )
}
