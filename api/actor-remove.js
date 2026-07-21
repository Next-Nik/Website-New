// api/actor-remove.js
// Actor removal and moderation (July 2026).
//
// Actions:
//   remove_own     — the owner removes their own actor (org or personal
//                    profile). Tombstone: status='suspended' + deleted_at,
//                    open challenges closed and hidden.
//   admin_remove   — founder removes ANY actor. Same tombstone.
//   admin_suspend  — founder hides an actor, reversibly (no deleted_at).
//   admin_restore  — founder restores a suspended (not deleted) actor.
//
// Removal is a tombstone, not a row deletion — the same semantics as
// challenge delete. Actor rows anchor message threads, authorship,
// offerings, and credentials; status='suspended' already hides an actor
// from every public surface.
//
// Identity always comes from the verified token (api/_auth.js), never the
// body. Founder gate matches api/actor-outreach.js.

const { createClient }  = require('@supabase/supabase-js')
const { resolveUserId } = require('./_auth')

const supabase = createClient(
  process.env.SUPABASE_URL,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
)

async function isFounder(userId) {
  if (!userId) return false
  const { data } = await supabase
    .from('nextus_actors')
    .select('id')
    .eq('is_platform_founder', true)
    .eq('profile_owner', userId)
    .limit(1)
  return !!(data && data.length)
}

// Close and hide every open call the actor authors. Participants already in
// them carry on (closing stops new joins) — the same behaviour as an author
// closing a challenge by hand with keep_listed=false.
async function closeActorCalls(actorId) {
  const now = new Date().toISOString()
  await supabase.from('actor_calls')
    .update({ lifecycle_state: 'closed', closed_at: now, visibility: 'draft', updated_at: now })
    .eq('actor_id', actorId)
    .eq('lifecycle_state', 'active')
}

async function tombstone(actorId) {
  const now = new Date().toISOString()
  const { error } = await supabase.from('nextus_actors')
    .update({ status: 'suspended', deleted_at: now, updated_at: now })
    .eq('id', actorId)
  return !error
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, actorId } = req.body || {}
  if (!action || !actorId) return res.status(400).json({ error: 'action and actorId required' })

  const callerId = await resolveUserId(req)
  if (!callerId) return res.status(401).json({ error: 'Sign-in required' })

  const { data: actor } = await supabase
    .from('nextus_actors')
    .select('id, name, status, profile_owner, deleted_at, is_platform_founder')
    .eq('id', actorId)
    .maybeSingle()
  if (!actor) return res.status(404).json({ error: 'Actor not found' })

  // ── remove_own ──────────────────────────────────────────────────────────
  if (action === 'remove_own') {
    if (actor.profile_owner !== callerId) return res.status(403).json({ error: 'Not your profile' })
    if (actor.is_platform_founder) return res.status(409).json({ error: 'The founder profile cannot remove itself here.' })
    if (actor.deleted_at) return res.json({ removed: true, already: true })
    await closeActorCalls(actorId)
    const ok = await tombstone(actorId)
    if (!ok) return res.status(500).json({ error: 'Could not remove the profile. Try again.' })
    return res.json({ removed: true, name: actor.name })
  }

  // ── admin actions ───────────────────────────────────────────────────────
  const founder = await isFounder(callerId)
  if (!founder) return res.status(403).json({ error: 'Not authorised' })

  if (action === 'admin_remove') {
    if (actor.deleted_at) return res.json({ removed: true, already: true })
    await closeActorCalls(actorId)
    const ok = await tombstone(actorId)
    if (!ok) return res.status(500).json({ error: 'Remove failed.' })
    return res.json({ removed: true, name: actor.name })
  }

  if (action === 'admin_suspend') {
    if (actor.deleted_at) return res.status(409).json({ error: 'Already deleted.' })
    const { error } = await supabase.from('nextus_actors')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', actorId)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ suspended: true, name: actor.name })
  }

  if (action === 'admin_restore') {
    if (actor.deleted_at) return res.status(409).json({ error: 'Deleted profiles are not restored from here.' })
    const { error } = await supabase.from('nextus_actors')
      .update({ status: 'live', updated_at: new Date().toISOString() })
      .eq('id', actorId)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ restored: true, name: actor.name })
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
