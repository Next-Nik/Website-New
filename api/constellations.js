// api/constellations.js
// Phase E — Constellations (June 2026).
//
// Actions:
//   get_goals          — public: all seven Horizon Goal objects with counts
//   get_goal           — public: one goal by domain slug, with actors + calls
//   get_constellation  — all confirmed constellation members for an actor
//   propose            — propose a constellation relationship (bilateral)
//   confirm            — confirm a pending proposal (other party)
//   leave              — leave / withdraw a constellation relationship
//   cosign             — co-sign a challenge or ask (constellation members only)
//   uncosign           — remove co-signature
//   set_actor_goal     — set actor.primary_horizon_goal_id from the manage page
//   overflow_route     — when an ask fills, route surplus to a sibling ask

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  process.env.SUPABASE_URL,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function actorOwner(actorId) {
  const { data } = await supabase
    .from('nextus_actors')
    .select('profile_owner')
    .eq('id', actorId)
    .maybeSingle()
  return data?.profile_owner || null
}

async function isOwner(actorId, userId) {
  const owner = await actorOwner(actorId)
  return owner === userId
}

async function findSiblingAsk(callId) {
  // Find an open ask in the same constellation as the original call's actor
  const { data: call } = await supabase
    .from('actor_calls')
    .select('actor_id, domain, type')
    .eq('id', callId)
    .maybeSingle()
  if (!call?.actor_id) return null

  // Get constellation siblings
  const { data: rels } = await supabase
    .from('nextus_relationships')
    .select('related_actor_id')
    .eq('actor_id', call.actor_id)
    .eq('relationship_type', 'constellation')
    .eq('status', 'confirmed')
  if (!rels?.length) return null

  const siblingIds = rels.map(r => r.related_actor_id)

  // Find an open ask in the same domain from a sibling
  const { data: sibling } = await supabase
    .from('actor_calls')
    .select('id, title, actor_id')
    .in('actor_id', siblingIds)
    .eq('type', 'ask')
    .eq('domain', call.domain)
    .eq('visibility', 'community')
    .limit(1)
    .maybeSingle()

  return sibling || null
}

async function refreshGoalCounts(goalId) {
  if (!goalId) return
  const { data: goal } = await supabase
    .from('horizon_goal_objects').select('domain').eq('id', goalId).maybeSingle()
  const [actorRes, callRes, conRes] = await Promise.all([
    supabase.from('nextus_actors').select('id', { count: 'exact', head: true }).eq('primary_horizon_goal_id', goalId).eq('status', 'live'),
    goal?.domain
      ? supabase.from('actor_calls').select('id', { count: 'exact', head: true }).eq('visibility', 'community').eq('domain', goal.domain)
      : Promise.resolve({ count: 0 }),
    supabase.from('nextus_relationships').select('id', { count: 'exact', head: true }).eq('horizon_goal_id', goalId).eq('relationship_type', 'constellation').eq('status', 'confirmed'),
  ])
  await supabase.from('horizon_goal_objects').update({
    actor_count:         actorRes.count || 0,
    challenge_count:     callRes.count  || 0,
    constellation_count: Math.floor((conRes.count || 0) / 2), // reciprocal pairs → constellations
    updated_at:          new Date().toISOString(),
  }).eq('id', goalId)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, userId, ...body } = req.body || {}

  // ── get_goals ─────────────────────────────────────────────────────────────
  if (action === 'get_goals') {
    const { data, error } = await supabase
      .from('horizon_goal_objects')
      .select('*')
      .order('label')
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ goals: data || [] })
  }

  // ── get_goal ──────────────────────────────────────────────────────────────
  if (action === 'get_goal') {
    const { domain } = body
    if (!domain) return res.status(400).json({ error: 'domain required' })
    const { data: goal } = await supabase
      .from('horizon_goal_objects')
      .select('*')
      .eq('domain', domain)
      .maybeSingle()
    if (!goal) return res.status(404).json({ error: 'Not found' })

    // Actors aligned to this goal (live, limit 24)
    const { data: actors } = await supabase
      .from('nextus_actors')
      .select('id, name, slug, type, image_url, tagline, domains')
      .eq('primary_horizon_goal_id', goal.id)
      .eq('status', 'live')
      .order('name')
      .limit(24)

    // Published calls pointing at this goal
    const { data: calls } = await supabase
      .from('actor_calls')
      .select('id, title, slug, type, scale, the_move, taken_on_count, active_count')
      .eq('visibility', 'community')
      .eq('domain', goal.domain)
      .limit(12)

    return res.json({ goal, actors: actors || [], calls: calls || [] })
  }

  // ── get_constellation ─────────────────────────────────────────────────────
  if (action === 'get_constellation') {
    const { actorId } = body
    if (!actorId) return res.status(400).json({ error: 'actorId required' })

    const { data: rels } = await supabase
      .from('nextus_relationships')
      .select(`
        id, status, horizon_goal_id, created_at,
        related:related_actor_id(id, name, slug, type, image_url, tagline, primary_horizon_goal_id)
      `)
      .eq('actor_id', actorId)
      .eq('relationship_type', 'constellation')
      .order('status')

    // Pending incoming proposals — other actors who proposed to this actor
    const { data: incoming } = await supabase
      .from('nextus_relationships')
      .select(`
        id, status, horizon_goal_id, created_at,
        proposer:actor_id(id, name, slug, type, image_url, tagline)
      `)
      .eq('related_actor_id', actorId)
      .eq('relationship_type', 'constellation')
      .eq('status', 'pending')

    return res.json({
      members:  (rels || []).filter(r => r.status === 'confirmed').map(r => r.related).filter(Boolean),
      outgoing: (rels || []).filter(r => r.status === 'pending'),
      incoming: incoming || [],
    })
  }

  // ── propose ───────────────────────────────────────────────────────────────
  // Actor A proposes a constellation link to Actor B. Bilateral — both must
  // confirm. The proposing actor names which Horizon Goal the constellation
  // is aligned to.
  if (action === 'propose') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { fromActorId, toActorId, horizonGoalId } = body
    if (!fromActorId || !toActorId) return res.status(400).json({ error: 'fromActorId and toActorId required' })

    const owned = await isOwner(fromActorId, userId)
    if (!owned) return res.status(403).json({ error: 'Not your actor' })
    if (fromActorId === toActorId) return res.status(400).json({ error: 'An actor cannot join its own constellation' })

    // Check for existing relationship
    const { data: existing } = await supabase
      .from('nextus_relationships')
      .select('id, status')
      .eq('actor_id', fromActorId)
      .eq('related_actor_id', toActorId)
      .eq('relationship_type', 'constellation')
      .maybeSingle()
    if (existing) return res.json({ existing: true, status: existing.status })

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('nextus_relationships')
      .insert({
        actor_id:          fromActorId,
        related_actor_id:  toActorId,
        relationship_type: 'constellation',
        status:            'pending',
        horizon_goal_id:   horizonGoalId || null,
        discovery_boost:   false,
        created_at:        now,
        updated_at:        now,
      })
      .select('id')
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ proposed: true, id: data.id })
  }

  // ── confirm ───────────────────────────────────────────────────────────────
  // The receiving actor confirms the proposal. Sets status='confirmed' on the
  // pending row AND creates the reciprocal row, both confirmed.
  // Discovery boost enabled on both rows.
  if (action === 'confirm') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { relationshipId, confirmingActorId } = body
    if (!relationshipId || !confirmingActorId) return res.status(400).json({ error: 'relationshipId and confirmingActorId required' })

    const owned = await isOwner(confirmingActorId, userId)
    if (!owned) return res.status(403).json({ error: 'Not your actor' })

    // Load the pending proposal
    const { data: rel } = await supabase
      .from('nextus_relationships')
      .select('*')
      .eq('id', relationshipId)
      .eq('related_actor_id', confirmingActorId)
      .eq('relationship_type', 'constellation')
      .eq('status', 'pending')
      .maybeSingle()
    if (!rel) return res.status(404).json({ error: 'Pending proposal not found' })

    const now = new Date().toISOString()
    // Confirm the existing row
    await supabase.from('nextus_relationships')
      .update({ status: 'confirmed', discovery_boost: true, updated_at: now })
      .eq('id', rel.id)

    // Create reciprocal confirmed row (unless it already exists)
    await supabase.from('nextus_relationships').upsert({
      actor_id:          confirmingActorId,
      related_actor_id:  rel.actor_id,
      relationship_type: 'constellation',
      status:            'confirmed',
      horizon_goal_id:   rel.horizon_goal_id,
      discovery_boost:   true,
      created_at:        now,
      updated_at:        now,
    }, { onConflict: 'actor_id,related_actor_id,relationship_type' })

    if (rel.horizon_goal_id) await refreshGoalCounts(rel.horizon_goal_id)
    return res.json({ confirmed: true })
  }

  // ── leave ─────────────────────────────────────────────────────────────────
  if (action === 'leave') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { actorId, relatedActorId } = body
    if (!actorId || !relatedActorId) return res.status(400).json({ error: 'actorId and relatedActorId required' })

    const owned = await isOwner(actorId, userId)
    if (!owned) return res.status(403).json({ error: 'Not your actor' })

    // Delete both directions
    await supabase.from('nextus_relationships')
      .delete()
      .eq('actor_id', actorId)
      .eq('related_actor_id', relatedActorId)
      .eq('relationship_type', 'constellation')

    await supabase.from('nextus_relationships')
      .delete()
      .eq('actor_id', relatedActorId)
      .eq('related_actor_id', actorId)
      .eq('relationship_type', 'constellation')

    return res.json({ left: true })
  }

  // ── cosign ────────────────────────────────────────────────────────────────
  // A constellation member co-signs a call authored by a sibling.
  // Check: the cosigning actor must be in a confirmed constellation
  // with the call's author.
  if (action === 'cosign') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { callId, cosignerActorId } = body
    if (!callId || !cosignerActorId) return res.status(400).json({ error: 'callId and cosignerActorId required' })

    const owned = await isOwner(cosignerActorId, userId)
    if (!owned) return res.status(403).json({ error: 'Not your actor' })

    // Load call author
    const { data: call } = await supabase
      .from('actor_calls')
      .select('actor_id, user_id, visibility')
      .eq('id', callId)
      .maybeSingle()
    if (!call) return res.status(404).json({ error: 'Call not found' })
    if (!['link_only', 'community'].includes(call.visibility)) return res.status(400).json({ error: 'Call must be published to cosign' })

    // Verify constellation relationship if author has an actor profile
    if (call.actor_id && call.actor_id !== cosignerActorId) {
      const { data: rel } = await supabase
        .from('nextus_relationships')
        .select('id')
        .eq('actor_id', cosignerActorId)
        .eq('related_actor_id', call.actor_id)
        .eq('relationship_type', 'constellation')
        .eq('status', 'confirmed')
        .maybeSingle()
      if (!rel) return res.status(403).json({ error: 'You must be in a confirmed constellation with the call author to co-sign.' })
    }

    const { error } = await supabase
      .from('actor_call_cosigners')
      .upsert({ call_id: callId, actor_id: cosignerActorId, cosigned_by: userId }, { onConflict: 'call_id,actor_id' })
    if (error) return res.status(500).json({ error: error.message })

    // Return updated cosigner count
    const { count } = await supabase
      .from('actor_call_cosigners')
      .select('id', { count: 'exact' })
      .eq('call_id', callId)

    return res.json({ cosigned: true, cosignerCount: count || 1 })
  }

  // ── uncosign ──────────────────────────────────────────────────────────────
  if (action === 'uncosign') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { callId, cosignerActorId } = body

    const owned = await isOwner(cosignerActorId, userId)
    if (!owned) return res.status(403).json({ error: 'Not your actor' })

    await supabase.from('actor_call_cosigners')
      .delete()
      .eq('call_id', callId)
      .eq('actor_id', cosignerActorId)
    return res.json({ removed: true })
  }

  // ── set_actor_goal ────────────────────────────────────────────────────────
  // Set an actor's primary Horizon Goal alignment from the manage page.
  // Also updates the goal_objects counts.
  if (action === 'set_actor_goal') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { actorId, domain } = body
    if (!actorId || !domain) return res.status(400).json({ error: 'actorId and domain required' })

    const owned = await isOwner(actorId, userId)
    if (!owned) return res.status(403).json({ error: 'Not your actor' })

    const { data: goal } = await supabase
      .from('horizon_goal_objects')
      .select('id')
      .eq('domain', domain)
      .maybeSingle()
    if (!goal) return res.status(404).json({ error: 'Horizon Goal not found' })

    const { data: actor } = await supabase
      .from('nextus_actors')
      .select('primary_horizon_goal_id')
      .eq('id', actorId)
      .maybeSingle()
    const oldGoalId = actor?.primary_horizon_goal_id

    await supabase.from('nextus_actors')
      .update({ primary_horizon_goal_id: goal.id, updated_at: new Date().toISOString() })
      .eq('id', actorId)

    await refreshGoalCounts(goal.id)
    if (oldGoalId && oldGoalId !== goal.id) await refreshGoalCounts(oldGoalId)

    return res.json({ set: true, goalId: goal.id })
  }

  // ── overflow_route ────────────────────────────────────────────────────────
  // Called when an ask fills. If overflow_to_constellation is true, finds
  // a sibling ask and routes the offer there.
  if (action === 'overflow_route') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { callId, note } = body
    if (!callId) return res.status(400).json({ error: 'callId required' })

    const { data: call } = await supabase
      .from('actor_calls')
      .select('overflow_to_constellation, ask_quantity, active_count, type')
      .eq('id', callId)
      .maybeSingle()

    if (!call?.overflow_to_constellation) return res.json({ routed: false, reason: 'overflow not enabled' })
    if (call.type !== 'ask') return res.json({ routed: false, reason: 'not an ask' })
    if (call.ask_quantity && (call.active_count || 0) < call.ask_quantity) return res.json({ routed: false, reason: 'not full yet' })

    const sibling = await findSiblingAsk(callId)
    if (!sibling) return res.json({ routed: false, reason: 'no sibling ask found' })

    await supabase.from('ask_overflow_log').insert({
      original_call_id: callId,
      routed_to_call_id: sibling.id,
      user_id: userId,
      note: note || 'Auto-routed: original ask at capacity',
    })

    return res.json({ routed: true, sibling_call_id: sibling.id, sibling_title: sibling.title })
  }

  // ── get_constellation_page ────────────────────────────────────────────────
  // Everything the public constellation landing needs in one call: the goal,
  // the actors in the domain (by domain membership, so seeded founding orgs
  // surface even before they set a primary goal), the community challenges, and
  // the summed total. Actors are listed, never ranked (honesty locks).
  if (action === 'get_constellation_page') {
    const { domain } = body
    if (!domain) return res.status(400).json({ error: 'domain required' })

    const { data: goal } = await supabase
      .from('horizon_goal_objects').select('*').eq('domain', domain).maybeSingle()
    if (!goal) return res.status(404).json({ error: 'Not found' })

    // Actors by domain membership: domains[] contains the slug, or legacy domain_id.
    const [byArray, byLegacy] = await Promise.all([
      supabase.from('nextus_actors')
        .select('id, name, slug, type, image_url, tagline, domains')
        .eq('status', 'live').contains('domains', [domain]).limit(60),
      supabase.from('nextus_actors')
        .select('id, name, slug, type, image_url, tagline, domains')
        .eq('status', 'live').eq('domain_id', domain).limit(60),
    ])
    const seen = new Set()
    const actors = [...(byArray.data || []), ...(byLegacy.data || [])]
      .filter(a => (seen.has(a.id) ? false : (seen.add(a.id), true)))
      .sort((a, b) => a.name.localeCompare(b.name))

    const { data: calls } = await supabase
      .from('actor_calls')
      .select('id, title, slug, type, the_move, taken_on_count, active_count, parent_call_id, nextus_actors ( name )')
      .eq('visibility', 'community').eq('type', 'challenge').eq('domain', domain)
      .order('taken_on_count', { ascending: false }).limit(24)

    const total = (calls || []).reduce((s, c) => s + (c.taken_on_count || 0), 0)

    return res.json({ goal, actors, calls: calls || [], total })
  }

  // ── meter ────────────────────────────────────────────────────────────────
  // The constellation participation meter: the whole rising from the parts.
  // One tick = one person in (taken_on_count), summed across every community
  // challenge in the domain. Parts are returned as contributors to a shared
  // whole — never ranked competitively (honesty locks). The domain is the
  // binding for v1; a horizon_goal_id filter can tighten it later.
  if (action === 'meter') {
    const { domain } = body
    if (!domain) return res.status(400).json({ error: 'domain required' })

    const { data: calls, error } = await supabase
      .from('actor_calls')
      .select('id, title, slug, taken_on_count, active_count, actor_id, nextus_actors ( name )')
      .eq('visibility', 'community')
      .eq('type', 'challenge')
      .eq('domain', domain)
    if (error) return res.status(500).json({ error: error.message })

    const rows  = calls || []
    const total = rows.reduce((s, c) => s + (c.taken_on_count || 0), 0)
    const parts = rows
      .map(c => ({
        id:       c.id,
        title:    c.title,
        slug:     c.slug,
        by:       c.nextus_actors?.name || null,
        count:    c.taken_on_count || 0,
      }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count)   // largest segment first for the bar, not a public rank

    return res.json({ domain, total, count: rows.length, parts })
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
