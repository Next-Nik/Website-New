// src/beta/hooks/useBilateral.js
// All data operations for bilateral_artefacts_beta.
//
// Workflow:
//   A creates draft  -> row written with party_a_consent=true, published=false
//                    -> notification written for B
//   B accepts        -> party_b_consent=true, published=true
//   B declines       -> row deleted (silent, no trace for B's own view)
//   Either revokes   -> published=false, row stays for audit
//   Either re-publishes -> published=true (revocation is reversible)
//
// NEVER auto-publish: published is set true only on explicit B-acceptance,
// never on creation, never on a single-party action.

import { supabase } from '../../hooks/useSupabase'

// ── Payload schemas per artefact type ────────────────────────
// Kept minimal — Module 1 schema defines the envelope; payload is freeform jsonb.
// We define the shapes we render so editors can build against them.

export const ARTEFACT_TYPES = [
  { value: 'sprint_buddy',             label: 'Sprint buddy' },
  { value: 'practitioner_relationship',label: 'Practitioner relationship' },
  { value: 'collaboration_card',       label: 'Collaboration' },
  { value: 'podcast_embed',            label: 'Podcast conversation' },
]

export const ARTEFACT_TYPE_LABEL = Object.fromEntries(
  ARTEFACT_TYPES.map(t => [t.value, t.label])
)

// Default payload shapes — editor uses these as initial state
export function defaultPayload(artefactType) {
  switch (artefactType) {
    case 'sprint_buddy':
      return {
        sprint_window:    '',   // e.g. "Q3 2026"
        shared_domains:   [],   // self-domain slugs
        commitment_note:  '',   // free text — what we're committing to together
      }
    case 'practitioner_relationship':
      return {
        title:            '',   // e.g. "Coach / Client"
        description:      '',   // free text — what the relationship is
        started_at:       '',   // ISO date string or human-readable period
      }
    case 'collaboration_card':
      return {
        title:            '',   // project or collaboration name
        description:      '',   // what the collaboration is
        domain_tags:      [],   // civ domain slugs
      }
    case 'podcast_embed':
      return {
        episode_title:    '',
        episode_url:      '',   // podcast URL or embed source
        published_at:     '',   // ISO date string or human-readable date
        description:      '',   // optional episode description
      }
    default:
      return {}
  }
}

// ── Notification writer ──────────────────────────────────────
// Writes to notifications_beta. Silent on failure — notification is a stub,
// not a hard dependency.

async function writeNotification(userId, notificationType, payload) {
  try {
    await supabase.from('notifications_beta').insert({
      user_id:           userId,
      notification_type: notificationType,
      payload,
      read:              false,
      created_at:        new Date().toISOString(),
    })
  } catch {
    // Notification write failure must never block the primary flow
  }
}

// ── Core operations ──────────────────────────────────────────

// Party A creates a draft.
// Row is written with party_a_consent=true, party_b_consent=false, published=false.
// A notification is written for party B.
export async function createDraft({
  partyAUserId,
  partyBUserId,        // null if party B is an org
  partyBActorId,       // null if party B is a user
  artefactType,
  payload,
}) {
  if (!partyAUserId) throw new Error('party_a_user_id is required')
  if (!partyBUserId && !partyBActorId) throw new Error('Either party_b_user_id or party_b_actor_id is required')
  if (partyBUserId === partyAUserId) throw new Error('A bilateral artefact must involve two distinct parties')

  const { data, error } = await supabase
    .from('bilateral_artefacts_beta')
    .insert({
      artefact_type:    artefactType,
      party_a_user_id:  partyAUserId,
      party_b_user_id:  partyBUserId  || null,
      party_b_actor_id: partyBActorId || null,
      party_a_consent:  true,
      party_b_consent:  false,
      payload:          payload || {},
      published:        false,          // NEVER auto-publish
      created_at:       new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw error

  // Fire notification for party B (user only — orgs don't have a user notification target)
  if (partyBUserId) {
    await writeNotification(partyBUserId, 'bilateral_invite', {
      bilateral_id:   data.id,
      artefact_type:  artefactType,
      from_user_id:   partyAUserId,
    })
  }

  return data.id
}

// Party B accepts — sets party_b_consent=true AND published=true.
// Only B may call this. Guard is enforced in the component.
export async function acceptDraft(bilateralId, partyBUserId) {
  const { error } = await supabase
    .from('bilateral_artefacts_beta')
    .update({
      party_b_consent: true,
      published:       true,            // publish only on explicit acceptance
      updated_at:      new Date().toISOString(),
    })
    .eq('id', bilateralId)
    .eq('party_b_user_id', partyBUserId)  // RLS-style guard in application layer

  if (error) throw error

  // Notify party A their invitation was accepted
  const { data: row } = await supabase
    .from('bilateral_artefacts_beta')
    .select('party_a_user_id, artefact_type')
    .eq('id', bilateralId)
    .maybeSingle()

  if (row?.party_a_user_id) {
    await writeNotification(row.party_a_user_id, 'bilateral_accepted', {
      bilateral_id:   bilateralId,
      artefact_type:  row.artefact_type,
      from_user_id:   partyBUserId,
    })
  }
}

// Party B declines — row deleted. Silent: no notification, no trace in B's view.
// Only B may call this.
export async function declineDraft(bilateralId, partyBUserId) {
  await supabase
    .from('bilateral_artefacts_beta')
    .delete()
    .eq('id', bilateralId)
    .eq('party_b_user_id', partyBUserId)

  // Deliberate silence — no notification to party A per spec.
}

// Either party revokes — sets published=false, row stays for audit.
// Revocation is reversible: either party can call republish.
export async function revoke(bilateralId, userId) {
  const { error } = await supabase
    .from('bilateral_artefacts_beta')
    .update({
      published:  false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bilateralId)
    .or(`party_a_user_id.eq.${userId},party_b_user_id.eq.${userId}`)

  if (error) throw error
}

// Reverses a revocation — sets published=true again.
// Only valid when both consents are true (guards any attempt to re-publish a declined card).
export async function republish(bilateralId, userId) {
  // Fetch to confirm both consents are present before re-publishing
  const { data: row } = await supabase
    .from('bilateral_artefacts_beta')
    .select('party_a_consent, party_b_consent')
    .eq('id', bilateralId)
    .maybeSingle()

  if (!row?.party_a_consent || !row?.party_b_consent) {
    throw new Error('Cannot republish: both consents must be present')
  }

  const { error } = await supabase
    .from('bilateral_artefacts_beta')
    .update({
      published:  true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bilateralId)
    .or(`party_a_user_id.eq.${userId},party_b_user_id.eq.${userId}`)

  if (error) throw error
}

// Update payload (party A editing before acceptance) — only when party_b_consent is still false
export async function updatePayload(bilateralId, payload, partyAUserId) {
  const { error } = await supabase
    .from('bilateral_artefacts_beta')
    .update({
      payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bilateralId)
    .eq('party_a_user_id', partyAUserId)
    .eq('party_b_consent', false)  // lock editing once accepted

  if (error) throw error
}

// Withdraw a draft that hasn't been accepted yet — party A deletes their own draft
export async function withdrawDraft(bilateralId, partyAUserId) {
  await supabase
    .from('bilateral_artefacts_beta')
    .delete()
    .eq('id', bilateralId)
    .eq('party_a_user_id', partyAUserId)
    .eq('party_b_consent', false)
}

// ── Fetch helpers ────────────────────────────────────────────

// All bilaterals the viewer is a party to (inbox + active), grouped by state
export async function fetchMyBilaterals(userId) {
  const { data, error } = await supabase
    .from('bilateral_artefacts_beta')
    .select('*')
    .or(`party_a_user_id.eq.${userId},party_b_user_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) throw error

  const rows = data || []

  return {
    // Pending: viewer is B, party_b_consent is false — inbox items awaiting response
    pendingForMe:   rows.filter(r =>
      r.party_b_user_id === userId && !r.party_b_consent
    ),
    // Sent drafts: viewer is A, waiting for B
    sentDrafts:     rows.filter(r =>
      r.party_a_user_id === userId && !r.party_b_consent
    ),
    // Published: both consented, published=true
    published:      rows.filter(r =>
      r.party_a_consent && r.party_b_consent && r.published
    ),
    // Revoked: both consented, published=false (can be republished)
    revoked:        rows.filter(r =>
      r.party_a_consent && r.party_b_consent && !r.published
    ),
  }
}

// Published bilaterals for a given profile user — used on the public profile
export async function fetchPublishedBilaterals(userId) {
  const { data } = await supabase
    .from('bilateral_artefacts_beta')
    .select('*')
    .or(`party_a_user_id.eq.${userId},party_b_user_id.eq.${userId}`)
    .eq('published', true)
    .eq('party_a_consent', true)
    .eq('party_b_consent', true)
    .order('updated_at', { ascending: false })

  return data || []
}
