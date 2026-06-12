// ACTOR CALLS API — /api/actor-calls.js
// Phase B2 (June 2026).
//
// Actions (req.body.action):
//   validate_floor — check whether a draft clears the Challenge Floor
//   create         — create a new draft call
//   update         — update a draft call (author only)
//   publish        — advance visibility (draft→link_only→community), Floor enforced
//   get_by_slug    — public read for the challenge page (signed-out ok)
//   get_my_calls   — author's own calls (any visibility)
//   take_on        — participant joins; creates sibling civ session
//   flag           — file a community-standards complaint

export const config = { maxDuration: 30 }

const { createClient }     = require('@supabase/supabase-js')
const { computeClock }     = require('./_stretch-clock')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── The Challenge Floor ──────────────────────────────────────────────────────
// A call below floor can be saved as a draft but cannot publish.

const FLOOR_FIELDS = ['title', 'domain', 'scale', 'horizon_goal_text', 'the_move', 'cadence', 'duration_days', 'measure', 'mechanism']

function checkFloor(call) {
  const missing = FLOOR_FIELDS.filter(f => !call[f] || String(call[f]).trim().length < 3)
  const errors = []
  if (missing.length) errors.push(`Missing or too short: ${missing.join(', ')}`)
  if (call.cadence === 'daily-absolute') {
    // Flag it but don't block — absolute cadence is allowed, just labeled
    // (the form discloses it to participants before they commit).
  }
  if (!call.actor_id && !call.user_id) errors.push('A call must have at least one author (actor or user).')
  return { passes: errors.length === 0, errors }
}

// ─── Slug generation ──────────────────────────────────────────────────────────

function makeSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64)
}

async function uniqueSlug(base) {
  let slug = base, i = 0
  while (true) {
    const { data } = await supabase.from('actor_calls').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    i++; slug = `${base}-${i}`
  }
}

// ─── Participation count helpers ──────────────────────────────────────────────

async function refreshCounts(callId) {
  const { data: rows } = await supabase.from('actor_call_participants').select('status').eq('call_id', callId)
  const all = rows || []
  await supabase.from('actor_calls').update({
    taken_on_count:  all.length,
    active_count:    all.filter(r => r.status === 'active').length,
    completed_count: all.filter(r => r.status === 'complete').length,
    updated_at:      new Date().toISOString(),
  }).eq('id', callId)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, userId, ...body } = req.body || {}

  // ── validate_floor ─────────────────────────────────────────────────────────
  if (action === 'validate_floor') {
    return res.json(checkFloor(body))
  }

  // ── get_by_slug (public, no auth required) ─────────────────────────────────
  if (action === 'get_by_slug') {
    const { slug } = body
    if (!slug) return res.status(400).json({ error: 'slug required' })
    const { data, error } = await supabase
      .from('actor_calls')
      .select(`
        id, title, tagline, slug, type, scale, domain,
        horizon_goal_text, the_move, cadence, cadence_note,
        duration_days, measure, mechanism,
        taken_on_count, active_count, completed_count,
        visibility, source, created_at, updated_at,
        actor_id, user_id,
        nextus_actors ( id, name, slug, type, description, image_url )
      `)
      .eq('slug', slug)
      .in('visibility', ['link_only', 'community'])
      .maybeSingle()
    if (error || !data) return res.status(404).json({ error: 'Not found' })
    return res.json({ call: data })
  }

  // ── get_my_calls ───────────────────────────────────────────────────────────
  if (action === 'get_my_calls') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { data: actorRows } = await supabase.from('nextus_actors').select('id').eq('owner_id', userId)
    const actorIds = (actorRows || []).map(r => r.id)
    const { data, error } = await supabase.from('actor_calls').select('*')
      .or([
        `user_id.eq.${userId}`,
        actorIds.length ? `actor_id.in.(${actorIds.join(',')})` : 'id.is.null',
      ].join(','))
      .order('updated_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ calls: data || [] })
  }

  // ── create ────────────────────────────────────────────────────────────────
  if (action === 'create') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { title = '', type = 'challenge', scale = 'civ', actor_id = null, ...rest } = body
    const payload = {
      user_id: userId, actor_id: actor_id || null,
      type, title, scale,
      domain: rest.domain || null,
      horizon_goal_text: rest.horizon_goal_text || null,
      the_move: rest.the_move || null,
      cadence: rest.cadence || '5-of-7',
      cadence_note: rest.cadence_note || null,
      duration_days: rest.duration_days || 90,
      measure: rest.measure || null,
      mechanism: rest.mechanism || null,
      tagline: rest.tagline || null,
      visibility: 'draft',
      source: 'self',
    }
    const { data, error } = await supabase.from('actor_calls').insert(payload).select('*').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ call: data })
  }

  // ── update ────────────────────────────────────────────────────────────────
  if (action === 'update') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id, ...patch } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })
    // Ownership check
    const { data: existing } = await supabase.from('actor_calls').select('user_id, actor_id, visibility').eq('id', call_id).maybeSingle()
    if (!existing) return res.status(404).json({ error: 'Not found' })
    let owned = existing.user_id === userId
    if (!owned && existing.actor_id) {
      const { data: actor } = await supabase.from('nextus_actors').select('owner_id').eq('id', existing.actor_id).maybeSingle()
      owned = actor?.owner_id === userId
    }
    if (!owned) return res.status(403).json({ error: 'Not your call' })
    if (existing.visibility !== 'draft') return res.status(409).json({ error: 'Published calls cannot be edited (withdraw first).' })
    const safe = {}
    const editable = ['title','tagline','type','scale','domain','horizon_goal_text','the_move','cadence','cadence_note','duration_days','measure','mechanism','ask_quantity','ask_deadline']
    editable.forEach(k => { if (k in patch) safe[k] = patch[k] })
    safe.updated_at = new Date().toISOString()
    const { data, error } = await supabase.from('actor_calls').update(safe).eq('id', call_id).select('*').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ call: data })
  }

  // ── publish ───────────────────────────────────────────────────────────────
  if (action === 'publish') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id, visibility: targetVis } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })
    const VALID_VIS = ['link_only', 'community']
    if (!VALID_VIS.includes(targetVis)) return res.status(400).json({ error: 'visibility must be link_only or community' })

    const { data: existing } = await supabase.from('actor_calls').select('*').eq('id', call_id).maybeSingle()
    if (!existing) return res.status(404).json({ error: 'Not found' })
    let owned = existing.user_id === userId
    if (!owned && existing.actor_id) {
      const { data: actor } = await supabase.from('nextus_actors').select('owner_id').eq('id', existing.actor_id).maybeSingle()
      owned = actor?.owner_id === userId
    }
    if (!owned) return res.status(403).json({ error: 'Not your call' })

    // Floor check before any publish
    const floor = checkFloor(existing)
    if (!floor.passes) return res.status(422).json({ error: 'Below Challenge Floor', details: floor.errors })

    // Generate slug if not yet set
    let slug = existing.slug
    if (!slug) slug = await uniqueSlug(makeSlug(existing.title || call_id))

    const { data, error } = await supabase.from('actor_calls')
      .update({ visibility: targetVis, slug, updated_at: new Date().toISOString() })
      .eq('id', call_id).select('*').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ call: data, url: `/stretch/c/${slug}` })
  }

  // ── take_on ───────────────────────────────────────────────────────────────
  // Participant joins a challenge. Creates a sibling civ session with its
  // own clock derived from the challenge's duration_days, challenge_id set.
  if (action === 'take_on') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id, clock_type = 'rolling' } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })

    const { data: call } = await supabase.from('actor_calls').select('*').eq('id', call_id).in('visibility', ['link_only','community']).maybeSingle()
    if (!call) return res.status(404).json({ error: 'Challenge not found' })

    // Idempotent — existing participation returns the existing row
    const { data: existing } = await supabase.from('actor_call_participants').select('*').eq('call_id', call_id).eq('user_id', userId).maybeSingle()
    if (existing) return res.json({ participant: existing, already_joined: true })

    // Compute clock
    const dur = call.duration_days || 90
    const clk = computeClock(clock_type, dur)

    // Create sibling civ session
    const now = new Date().toISOString()
    const planetData = {
      __planet_sprint__: {
        serves:      call.domain || '',
        commitment:  call.the_move || call.title,
        source:      'designed',
        designedBy:  call.actor_id || null,
        challenge_id: call_id,
        tasks:       [],
        taskChecked: {},
      }
    }
    const sessionPayload = {
      user_id: userId, scale: 'civ', domains: [],
      status: 'active', challenge_id: call_id, designed_by: call.actor_id || null,
      quarter_type: clk.quarterType, target_date: clk.targetDate, end_date_label: clk.endDateLabel,
      domain_data: planetData,
      created_at: now, updated_at: now,
    }
    const { data: session } = await supabase.from('target_sprint_sessions').insert(sessionPayload).select('id').single()

    // Record participation
    const { data: participant, error } = await supabase.from('actor_call_participants').insert({
      call_id, user_id: userId, session_id: session?.id || null, status: 'active',
    }).select('*').single()
    if (error) return res.status(500).json({ error: error.message })

    // Refresh counts
    await refreshCounts(call_id)

    return res.json({ participant, session_id: session?.id || null })
  }

  // ── flag ──────────────────────────────────────────────────────────────────
  if (action === 'flag') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id, reason } = body
    if (!call_id || !reason?.trim()) return res.status(400).json({ error: 'call_id and reason required' })
    const { error } = await supabase.from('actor_call_flags').insert({ call_id, user_id: userId, reason: reason.trim() })
    if (error) return res.status(500).json({ error: error.message })
    // Bump flag_count on the call
    await supabase.rpc('increment_call_flag_count', { p_call_id: call_id }).catch(() => {})
    return res.json({ flagged: true })
  }

  // ── fulfill ───────────────────────────────────────────────────────────────
  // Someone expresses interest in fulfilling an ask. Records a participant
  // row with status='active'. No civ session — an ask fulfillment is not a
  // stretch. Idempotent.
  if (action === 'fulfill') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id, note } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })

    const { data: call } = await supabase
      .from('actor_calls')
      .select('id, type, ask_quantity, ask_fulfilled, visibility')
      .eq('id', call_id)
      .eq('type', 'ask')
      .in('visibility', ['link_only', 'community'])
      .maybeSingle()
    if (!call) return res.status(404).json({ error: 'Ask not found' })

    // Idempotent — return existing
    const { data: existing } = await supabase
      .from('actor_call_participants')
      .select('*').eq('call_id', call_id).eq('user_id', userId).maybeSingle()
    if (existing) return res.json({ participant: existing, already_offered: true })

    // Capacity check — if ask_quantity set, check headroom
    if (call.ask_quantity) {
      const active = (await supabase
        .from('actor_call_participants')
        .select('id', { count: 'exact' })
        .eq('call_id', call_id)
        .eq('status', 'active')).count || 0
      if (active >= call.ask_quantity) {
        return res.status(409).json({ error: 'This ask has reached capacity. Check back if space opens.' })
      }
    }

    const { data: participant, error } = await supabase
      .from('actor_call_participants')
      .insert({ call_id, user_id: userId, status: 'active', reflection: note || null })
      .select('*').single()
    if (error) return res.status(500).json({ error: error.message })

    await refreshCounts(call_id)
    // Update ask_fulfilled count
    await supabase.from('actor_calls')
      .update({ ask_fulfilled: (call.ask_fulfilled || 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', call_id)

    return res.json({ participant })
  }

  // ── unfulfill ─────────────────────────────────────────────────────────────
  if (action === 'unfulfill') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })

    const { data: existing } = await supabase
      .from('actor_call_participants')
      .select('id').eq('call_id', call_id).eq('user_id', userId).maybeSingle()
    if (!existing) return res.json({ withdrawn: true, was_absent: true })

    await supabase.from('actor_call_participants')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    await refreshCounts(call_id)
    return res.json({ withdrawn: true })
  }

  // ── browse_asks ───────────────────────────────────────────────────────────
  // Community-visible asks, optionally filtered by domain or actor.
  // Returns lightweight rows — the browse list, not full detail.
  if (action === 'browse_asks') {
    const { domain, actor_id: filterActor, limit = 24, offset = 0 } = body
    let q = supabase
      .from('actor_calls')
      .select(`
        id, title, tagline, slug, type, scale, domain,
        the_move, cadence, duration_days, ask_quantity, ask_deadline, ask_fulfilled,
        taken_on_count, active_count, completed_count,
        visibility, created_at, actor_id, user_id,
        nextus_actors ( id, name, slug, type, image_url )
      `)
      .eq('visibility', 'community')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (domain)       q = q.eq('domain', domain)
    if (filterActor)  q = q.eq('actor_id', filterActor)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ calls: data || [] })
  }

  // ── browse_by_actor ───────────────────────────────────────────────────────
  // All published calls for a specific actor — shown on their Atlas profile.
  if (action === 'browse_by_actor') {
    const { actor_id: targetActor } = body
    if (!targetActor) return res.status(400).json({ error: 'actor_id required' })
    const { data, error } = await supabase
      .from('actor_calls')
      .select('id, title, tagline, slug, type, scale, domain, the_move, ask_quantity, ask_deadline, taken_on_count, active_count, visibility, created_at')
      .eq('actor_id', targetActor)
      .in('visibility', ['link_only', 'community'])
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ calls: data || [] })
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
