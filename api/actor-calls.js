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


// Ownership: profile_owner is the canonical (and only) auth column on
// nextus_actors. There is no owner_id column on nextus_actors.
async function ownsActor(actorId, userId) {
  if (!actorId || !userId) return false
  const { data } = await supabase.from('nextus_actors')
    .select('profile_owner').eq('id', actorId).maybeSingle()
  return data?.profile_owner === userId
}

// Does this user author the call (directly, or via an actor they own)?
async function ownsCall(callId, userId) {
  if (!callId || !userId) return { exists: false, owned: false }
  const { data } = await supabase.from('actor_calls').select('user_id, actor_id').eq('id', callId).maybeSingle()
  if (!data) return { exists: false, owned: false }
  let owned = data.user_id === userId
  if (!owned && data.actor_id) owned = await ownsActor(data.actor_id, userId)
  return { exists: true, owned, actor_id: data.actor_id, user_id: data.user_id }
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
        duration_days, measure, mechanism, protocol,
        taken_on_count, active_count, completed_count,
        visibility, source, created_at, updated_at,
        actor_id, user_id, parent_call_id, author_statement, body_long, video_url, intensity_level,
        nextus_actors ( id, name, slug, type, description, image_url, profile_owner )
      `)
      .eq('slug', slug)
      .in('visibility', ['link_only', 'community'])
      .maybeSingle()
    if (error || !data) return res.status(404).json({ error: 'Not found' })
    // Cosigner count (Phase E) — table may not exist pre-migration-115; fail soft
    let cosignerCount = 0
    try {
      const { count } = await supabase
        .from('actor_call_cosigners')
        .select('id', { count: 'exact', head: true })
        .eq('call_id', data.id)
      cosignerCount = count || 0
    } catch {}
    // Accepted partners (Phase 2) — table may not exist pre-migration-132; fail soft.
    // Only accepted partnerships are public; pending/declined never surface here.
    let partners = []
    try {
      const { data: pRows } = await supabase
        .from('actor_call_partners')
        .select('partner_actor_id, nextus_actors:partner_actor_id ( id, name, slug, type, image_url )')
        .eq('call_id', data.id)
        .eq('status', 'accepted')
      partners = (pRows || [])
        .map(r => r.nextus_actors)
        .filter(Boolean)
    } catch {}
    return res.json({ call: { ...data, cosigner_count: cosignerCount, partners } })
  }

  // ── get_my_calls ───────────────────────────────────────────────────────────
  if (action === 'get_my_calls') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { data: actorRows } = await supabase.from('nextus_actors').select('id').eq('profile_owner', userId)
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
    // Authoring as an actor requires owning it. Personal authorship
    // (actor_id null) is always allowed for a signed-in user.
    if (actor_id && !(await ownsActor(actor_id, userId))) {
      return res.status(403).json({ error: 'You can only author as an actor you own.' })
    }
    const cadence = rest.cadence || '5-of-7'
    const protocol = (Array.isArray(rest.protocol) && rest.protocol.length)
      ? rest.protocol
      : (rest.the_move ? [{ id: 's1', text: rest.the_move, cadence }] : [])
    const payload = {
      user_id: userId, actor_id: actor_id || null,
      type, title, scale,
      domain: rest.domain || null,
      horizon_goal_text: rest.horizon_goal_text || null,
      the_move: rest.the_move || null,
      cadence,
      cadence_note: rest.cadence_note || null,
      duration_days: rest.duration_days || 90,
      measure: rest.measure || null,
      mechanism: rest.mechanism || null,
      tagline: rest.tagline || null,
      parent_call_id: rest.parent_call_id || null,
      author_statement: rest.author_statement || null,
      body_long: rest.body_long || null,
      video_url: rest.video_url || null,
      intensity_level: rest.intensity_level || null,
      protocol,
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
    if (!owned && existing.actor_id) owned = await ownsActor(existing.actor_id, userId)
    if (!owned) return res.status(403).json({ error: 'Not your call' })
    if (existing.visibility !== 'draft') return res.status(409).json({ error: 'Published calls cannot be edited (withdraw first).' })
    // Lineage cycle guard: a challenge can't build on itself or one of its own branches.
    if (patch.parent_call_id) {
      if (patch.parent_call_id === call_id) return res.status(400).json({ error: 'A challenge cannot build on itself.' })
      const { data: desc } = await supabase.rpc('challenge_descendants', { p_call_id: call_id, p_max_depth: null })
      if ((desc || []).some(d => d.id === patch.parent_call_id)) {
        return res.status(400).json({ error: 'A challenge cannot build on one of its own branches.' })
      }
    }
    const safe = {}
    const editable = ['title','tagline','type','scale','domain','horizon_goal_text','the_move','cadence','cadence_note','duration_days','measure','mechanism','protocol','ask_quantity','ask_deadline','parent_call_id','author_statement','body_long','video_url','intensity_level']
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
    if (!owned && existing.actor_id) owned = await ownsActor(existing.actor_id, userId)
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
  // Participant joins a challenge. Records a participation row (its own clock
  // from the challenge's duration_days, the true scale, a frozen strand
  // snapshot). No target_sprint_session is created — /challenges is the home.
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
    const today = new Date().toISOString().slice(0, 10)

    // Strands the participant will run. Backfill (migration 131) means most
    // challenges already carry a protocol; synthesize a single strand from
    // the_move for any that don't.
    const strands = (Array.isArray(call.protocol) && call.protocol.length)
      ? call.protocol
      : (call.the_move ? [{ id: 's1', text: call.the_move, cadence: call.cadence || '5-of-7' }] : [])

    // Record participation — the sole home for a taken-on challenge. No
    // target_sprint_session is created; /challenges reads this row and the
    // strand log. (The person's OWN personal stretch and Planet Sprint, both
    // authored in the Target Stretch tool, are unaffected.)
    const { data: participant, error } = await supabase.from('actor_call_participants').insert({
      call_id, user_id: userId, session_id: null, status: 'active',
      scale: call.scale || 'civ',
      started_on: today, ends_on: clk.targetDate,
      protocol_snapshot: strands,
    }).select('*').single()
    if (error) return res.status(500).json({ error: error.message })

    await refreshCounts(call_id)

    return res.json({ participant })
  }

  // ── log_strand ─────────────────────────────────────────────────────────────
  // Mark a strand done (or undo it) for a given day. Rows are created lazily;
  // unchecking deletes the row so "done" is simply presence.
  if (action === 'log_strand') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id, strand_id, log_date, done = true } = body
    if (!call_id || !strand_id) return res.status(400).json({ error: 'call_id and strand_id required' })
    const day = log_date || new Date().toISOString().slice(0, 10)

    const { data: p } = await supabase.from('actor_call_participants')
      .select('id').eq('call_id', call_id).eq('user_id', userId).maybeSingle()
    if (!p) return res.status(404).json({ error: 'Not a participant' })

    if (done) {
      const { error } = await supabase.from('actor_call_strand_log').upsert(
        { participant_id: p.id, strand_id, log_date: day, done: true },
        { onConflict: 'participant_id,strand_id,log_date' }
      )
      if (error) return res.status(500).json({ error: error.message })
    } else {
      await supabase.from('actor_call_strand_log')
        .delete()
        .eq('participant_id', p.id).eq('strand_id', strand_id).eq('log_date', day)
    }
    return res.json({ ok: true, strand_id, log_date: day, done: !!done })
  }

  // ── get_participation ──────────────────────────────────────────────────────
  // The participant's run of a challenge: their frozen strands, their clock,
  // and what they've marked done today. Streak/progress math is computed by
  // the caller from started_on + cadence; this returns the raw facts.
  if (action === 'get_participation') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })

    const { data: p } = await supabase.from('actor_call_participants')
      .select('id, status, scale, started_on, ends_on, protocol_snapshot, completed_at')
      .eq('call_id', call_id).eq('user_id', userId).maybeSingle()
    if (!p) return res.json({ participant: null })

    const today = new Date().toISOString().slice(0, 10)
    const { data: todayRows } = await supabase.from('actor_call_strand_log')
      .select('strand_id, done').eq('participant_id', p.id).eq('log_date', today)
    const doneToday = (todayRows || []).filter(r => r.done).map(r => r.strand_id)

    const { count: totalDone } = await supabase.from('actor_call_strand_log')
      .select('id', { count: 'exact', head: true }).eq('participant_id', p.id).eq('done', true)

    return res.json({
      participant: {
        id: p.id, status: p.status, scale: p.scale,
        started_on: p.started_on, ends_on: p.ends_on,
        completed_at: p.completed_at,
        strands: p.protocol_snapshot || [],
      },
      today,
      done_today: doneToday,
      total_done: totalDone || 0,
    })
  }

  // ── my_participations ──────────────────────────────────────────────────────
  // Every challenge the user has taken on, with the data a daily-ritual card
  // needs: the frozen strands, the clock, what's done today, and the set of
  // days they've logged (for streak + the habit dots).
  if (action === 'my_participations') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { data: parts } = await supabase.from('actor_call_participants')
      .select('id, call_id, status, scale, started_on, ends_on, protocol_snapshot, completed_at, created_at')
      .eq('user_id', userId)
      .in('status', ['active', 'complete'])
      .order('created_at', { ascending: false })
    const rows = parts || []
    if (!rows.length) return res.json({ participations: [] })

    const callIds = rows.map(r => r.call_id)
    const { data: calls } = await supabase.from('actor_calls')
      .select('id, slug, title, tagline, domain, duration_days, nextus_actors ( name, slug, image_url, type )')
      .in('id', callIds)
    const callMap = {}
    ;(calls || []).forEach(c => { callMap[c.id] = c })

    const partIds = rows.map(r => r.id)
    const { data: logs } = await supabase.from('actor_call_strand_log')
      .select('participant_id, strand_id, log_date, done')
      .in('participant_id', partIds)
      .eq('done', true)
    const today = new Date().toISOString().slice(0, 10)
    const byPart = {}
    ;(logs || []).forEach(l => {
      if (!byPart[l.participant_id]) byPart[l.participant_id] = { doneToday: [], doneDates: new Set() }
      byPart[l.participant_id].doneDates.add(l.log_date)
      if (l.log_date === today) byPart[l.participant_id].doneToday.push(l.strand_id)
    })

    const participations = rows.map(r => {
      const c = callMap[r.call_id] || {}
      const agg = byPart[r.id] || { doneToday: [], doneDates: new Set() }
      return {
        participant_id: r.id,
        call_id:    r.call_id,
        slug:       c.slug || null,
        title:      c.title || 'Challenge',
        tagline:    c.tagline || null,
        domain:     c.domain || null,
        author:     c.nextus_actors || null,
        status:     r.status,
        started_on: r.started_on,
        ends_on:    r.ends_on,
        completed_at: r.completed_at,
        strands:    r.protocol_snapshot || [],
        done_today: agg.doneToday,
        done_dates: Array.from(agg.doneDates).sort(),
      }
    })
    return res.json({ participations })
  }

  // ── request_partner ─────────────────────────────────────────────────────────
  // Open a partnership. Direction is inferred from who's asking: the call's
  // author names a partner (partner accepts), or an actor's owner asks to join
  // a call (the author accepts). Nothing is public until accepted.
  if (action === 'request_partner') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id, partner_actor_id } = body
    if (!call_id || !partner_actor_id) return res.status(400).json({ error: 'call_id and partner_actor_id required' })

    const ci = await ownsCall(call_id, userId)
    if (!ci.exists) return res.status(404).json({ error: 'Challenge not found' })
    if (ci.actor_id && ci.actor_id === partner_actor_id) return res.status(400).json({ error: "A challenge can't partner with its own author." })

    let initiated_by = null
    if (ci.owned) initiated_by = 'author'
    else if (await ownsActor(partner_actor_id, userId)) initiated_by = 'partner'
    if (!initiated_by) return res.status(403).json({ error: 'You must author the challenge or own the partner.' })

    const { data: existing } = await supabase.from('actor_call_partners')
      .select('*').eq('call_id', call_id).eq('partner_actor_id', partner_actor_id).maybeSingle()
    if (existing) return res.json({ partnership: existing, already: true })

    const { data, error } = await supabase.from('actor_call_partners').insert({
      call_id, partner_actor_id, initiated_by, requested_by_user: userId, status: 'pending',
    }).select('*').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ partnership: data })
  }

  // ── respond_partner ─────────────────────────────────────────────────────────
  // The OTHER party accepts or declines a pending request.
  if (action === 'respond_partner') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { partnership_id, decision } = body
    if (!partnership_id || !['accepted', 'declined'].includes(decision)) return res.status(400).json({ error: 'partnership_id and decision (accepted|declined) required' })

    const { data: row } = await supabase.from('actor_call_partners').select('*').eq('id', partnership_id).maybeSingle()
    if (!row) return res.status(404).json({ error: 'Not found' })
    if (row.status !== 'pending') return res.status(409).json({ error: 'Already resolved.' })

    let canRespond = false
    if (row.initiated_by === 'author') canRespond = await ownsActor(row.partner_actor_id, userId)
    else { const ci = await ownsCall(row.call_id, userId); canRespond = ci.owned }
    if (!canRespond) return res.status(403).json({ error: 'Not yours to answer.' })

    const { data, error } = await supabase.from('actor_call_partners').update({
      status: decision, responded_by_user: userId, responded_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', partnership_id).select('*').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ partnership: data })
  }

  // ── withdraw_partner ────────────────────────────────────────────────────────
  // Either party pulls the request, or an accepted partner steps away.
  if (action === 'withdraw_partner') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { partnership_id } = body
    if (!partnership_id) return res.status(400).json({ error: 'partnership_id required' })
    const { data: row } = await supabase.from('actor_call_partners').select('*').eq('id', partnership_id).maybeSingle()
    if (!row) return res.status(404).json({ error: 'Not found' })

    let allowed = await ownsActor(row.partner_actor_id, userId)
    if (!allowed) { const ci = await ownsCall(row.call_id, userId); allowed = ci.owned }
    if (!allowed) return res.status(403).json({ error: 'Not yours.' })

    await supabase.from('actor_call_partners').update({ status: 'withdrawn', updated_at: new Date().toISOString() }).eq('id', partnership_id)
    return res.json({ withdrawn: true })
  }

  // ── partner_inbox ───────────────────────────────────────────────────────────
  // Pending requests addressed to this user: an actor they own was named as a
  // partner, or someone asked to join a challenge they author.
  if (action === 'partner_inbox') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { data: myActors } = await supabase.from('nextus_actors').select('id').eq('profile_owner', userId)
    const myActorIds = (myActors || []).map(a => a.id)

    const { data: callsByUser } = await supabase.from('actor_calls').select('id').eq('user_id', userId)
    let callsByActor = []
    if (myActorIds.length) {
      const { data } = await supabase.from('actor_calls').select('id').in('actor_id', myActorIds)
      callsByActor = data || []
    }
    const myCallIds = [...new Set([...(callsByUser || []), ...callsByActor].map(c => c.id))]

    let asPartner = []
    if (myActorIds.length) {
      const { data } = await supabase.from('actor_call_partners')
        .select('id, call_id, partner_actor_id, initiated_by')
        .in('partner_actor_id', myActorIds).eq('status', 'pending').eq('initiated_by', 'author')
      asPartner = data || []
    }
    let asAuthor = []
    if (myCallIds.length) {
      const { data } = await supabase.from('actor_call_partners')
        .select('id, call_id, partner_actor_id, initiated_by')
        .in('call_id', myCallIds).eq('status', 'pending').eq('initiated_by', 'partner')
      asAuthor = data || []
    }
    const all = [...asPartner, ...asAuthor]
    if (!all.length) return res.json({ requests: [] })

    const callIds  = [...new Set(all.map(r => r.call_id))]
    const actorIds = [...new Set(all.map(r => r.partner_actor_id))]
    const { data: callRows }  = await supabase.from('actor_calls').select('id, title, slug, nextus_actors ( name )').in('id', callIds)
    const { data: actorRows } = await supabase.from('nextus_actors').select('id, name').in('id', actorIds)
    const callMap = {}; (callRows || []).forEach(c => { callMap[c.id] = c })
    const actorMap = {}; (actorRows || []).forEach(a => { actorMap[a.id] = a.name })

    const requests = all.map(r => ({
      id: r.id, call_id: r.call_id, initiated_by: r.initiated_by,
      call_title:  callMap[r.call_id]?.title || 'a challenge',
      call_slug:   callMap[r.call_id]?.slug || null,
      call_author: callMap[r.call_id]?.nextus_actors?.name || null,
      partner_name: actorMap[r.partner_actor_id] || 'an actor',
    }))
    return res.json({ requests })
  }

  // ── call_partners ───────────────────────────────────────────────────────────
  // The author's view of a call's partners (any status), for managing invites.
  if (action === 'call_partners') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id } = body
    const ci = await ownsCall(call_id, userId)
    if (!ci.exists) return res.status(404).json({ error: 'Not found' })
    if (!ci.owned) return res.status(403).json({ error: 'Not yours.' })
    const { data } = await supabase.from('actor_call_partners')
      .select('id, partner_actor_id, status, initiated_by, nextus_actors:partner_actor_id ( name, slug )')
      .eq('call_id', call_id).order('created_at', { ascending: true })
    return res.json({ partners: (data || []).map(r => ({
      id: r.id, status: r.status, initiated_by: r.initiated_by,
      partner_actor_id: r.partner_actor_id,
      name: r.nextus_actors?.name || null, slug: r.nextus_actors?.slug || null,
    })) })
  }

  // ── search_actors ───────────────────────────────────────────────────────────
  // Name search for the partner picker. Actor names are public.
  if (action === 'search_actors') {
    const { q, limit = 8 } = body
    if (!q || q.trim().length < 2) return res.json({ actors: [] })
    const { data } = await supabase.from('nextus_actors')
      .select('id, name, type, image_url')
      .ilike('name', `%${q.trim()}%`)
      .limit(limit)
    return res.json({ actors: data || [] })
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
      .eq('type', 'ask')
      .eq('visibility', 'community')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (domain)       q = q.eq('domain', domain)
    if (filterActor)  q = q.eq('actor_id', filterActor)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ calls: data || [] })
  }

  // ── browse_challenges ──────────────────────────────────────────────────────
  // Community-visible challenges, for the discovery surface. Sorted by uptake
  // by default so what people are doing rises. Strand count travels; the full
  // protocol does not.
  if (action === 'browse_challenges') {
    const { domain, intensity = null, limit = 48, offset = 0, sort = 'popular' } = body
    let q = supabase
      .from('actor_calls')
      .select(`
        id, title, tagline, slug, scale, domain, duration_days,
        taken_on_count, active_count, protocol, created_at, intensity_level,
        nextus_actors ( name, slug, image_url, type )
      `)
      .eq('type', 'challenge')
      .eq('visibility', 'community')

    if (domain) q = q.eq('domain', domain)
    if (intensity) q = q.eq('intensity_level', intensity)
    if (sort === 'newest') q = q.order('created_at', { ascending: false })
    else q = q.order('taken_on_count', { ascending: false }).order('created_at', { ascending: false })
    q = q.range(offset, offset + limit - 1)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    const challenges = (data || []).map(c => ({
      id: c.id, title: c.title, tagline: c.tagline, slug: c.slug,
      scale: c.scale, domain: c.domain, duration_days: c.duration_days,
      taken_on_count: c.taken_on_count, active_count: c.active_count,
      intensity_level: c.intensity_level || null,
      author: c.nextus_actors || null,
      strand_count: Array.isArray(c.protocol) ? c.protocol.length : 0,
    }))
    return res.json({ challenges })
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

  // ── submit_feedback ───────────────────────────────────────────────────────
  // Records consent decision + optional reflection after a challenge completes.
  // Idempotent — a second call updates rather than inserts.
  if (action === 'submit_feedback') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id, consent, reflection, reflection_public, reflection_attributed } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })

    // Participant row must exist (they took it on earlier)
    const { data: existing } = await supabase
      .from('actor_call_participants')
      .select('id, status')
      .eq('call_id', call_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (!existing) return res.status(404).json({ error: 'Participation record not found' })

    const patch = {
      feedback_consent:       !!consent,
      reflection:             consent && reflection ? reflection : null,
      reflection_public:      !!(consent && reflection_public),
      reflection_attributed:  !!(consent && reflection_attributed),
      updated_at:             new Date().toISOString(),
    }
    // Mark complete if not already
    if (existing.status === 'active') {
      patch.status       = 'complete'
      patch.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('actor_call_participants')
      .update(patch)
      .eq('id', existing.id)
    if (error) return res.status(500).json({ error: error.message })

    await refreshCounts(call_id)
    return res.json({ saved: true })
  }

  // ── mark_complete ─────────────────────────────────────────────────────────
  // Marks a participation row complete without feedback — for asks fulfilled
  // or manual completion outside the stretch tool.
  if (action === 'mark_complete') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })

    const { data: existing } = await supabase
      .from('actor_call_participants')
      .select('id').eq('call_id', call_id).eq('user_id', userId).maybeSingle()
    if (!existing) return res.status(404).json({ error: 'Not found' })

    await supabase.from('actor_call_participants')
      .update({ status: 'complete', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    await refreshCounts(call_id)
    return res.json({ completed: true })
  }

  // ── get_feedback ──────────────────────────────────────────────────────────
  // Author-only view: aggregate counts + consented, public reflections.
  // Identity of participants is NEVER returned — not even to the author.
  // Attributed reflections carry a display_name; anonymous ones do not.
  if (action === 'get_feedback') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })

    // Ownership check
    const { data: call } = await supabase
      .from('actor_calls')
      .select('id, user_id, actor_id, taken_on_count, active_count, completed_count')
      .eq('id', call_id).maybeSingle()
    if (!call) return res.status(404).json({ error: 'Not found' })

    let owned = call.user_id === userId
    if (!owned && call.actor_id) owned = await ownsActor(call.actor_id, userId)
    if (!owned) return res.status(403).json({ error: 'Not your call' })

    // Fetch consented public reflections — attributed ones join profiles
    const { data: participants } = await supabase
      .from('actor_call_participants')
      .select('reflection, reflection_attributed, reflection_public, status, completed_at, user_id')
      .eq('call_id', call_id)
      .eq('reflection_public', true)
      .eq('feedback_consent', true)
      .not('reflection', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50)

    const rows  = participants || []
    const named = rows.filter(r => r.reflection_attributed)

    // Fetch display names for attributed reflections only
    let nameMap = {}
    if (named.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', named.map(r => r.user_id))
      if (profiles) profiles.forEach(p => { nameMap[p.id] = p })
    }

    const reflections = rows.map(r => ({
      reflection:     r.reflection,
      completed_at:   r.completed_at,
      anonymous:      !r.reflection_attributed,
      display_name:   r.reflection_attributed ? (nameMap[r.user_id]?.display_name || 'Community member') : null,
      avatar_url:     r.reflection_attributed ? (nameMap[r.user_id]?.avatar_url   || null) : null,
    }))

    return res.json({
      counts: {
        taken_on:  call.taken_on_count,
        active:    call.active_count,
        completed: call.completed_count,
      },
      reflections,
    })
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
