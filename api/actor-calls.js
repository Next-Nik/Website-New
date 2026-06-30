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
//   close          — reversible retirement (keep_listed flag); author or founder
//   reopen         — reverse a close; restores prior visibility
//   delete         — permanent tombstone; reparents children, frees slug, keeps evidence
//   delete_impact  — preview of what a delete re-roots (read-only)
//   purge          — founder-only true row removal; refused if anyone ever joined
//   flag           — file a community-standards complaint

export const config = { maxDuration: 30 }

const { createClient }     = require('@supabase/supabase-js')
const { computeClock }     = require('./_stretch-clock')

const supabase = createClient(
  process.env.SUPABASE_URL,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
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

// Founder = the platform admin role (user_metadata.role === 'founder'). Verified
// server-side via the service-role auth admin API, never trusted from the body.
async function isFounder(userId) {
  if (!userId) return false
  try {
    const { data } = await supabase.auth.admin.getUserById(userId)
    return data?.user?.user_metadata?.role === 'founder'
  } catch { return false }
}

// Lifecycle authority: the author may manage their own call; a founder may
// manage any. Returns { exists, allowed, owned, founder } plus the call's authors.
async function canManageCall(callId, userId) {
  const o = await ownsCall(callId, userId)
  if (!o.exists) return { exists: false, allowed: false }
  if (o.owned)   return { ...o, allowed: true, founder: false }
  const founder = await isFounder(userId)
  return { ...o, allowed: founder, founder }
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
        ask_quantity, ask_deadline, ask_fulfilled, ask_details,
        taken_on_count, active_count, completed_count,
        visibility, lifecycle_state, closed_at, source, created_at, updated_at,
        actor_id, user_id, parent_call_id, author_statement, body_long, video_url, cover_image_url, intensity_level,
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
      .neq('lifecycle_state', 'deleted')
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
      cover_image_url: rest.cover_image_url || null,
      intensity_level: rest.intensity_level || null,
      ask_quantity: rest.ask_quantity || null,
      ask_deadline: rest.ask_deadline || null,
      ask_details: rest.ask_details || null,
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
    const editable = ['title','tagline','type','scale','domain','horizon_goal_text','the_move','cadence','cadence_note','duration_days','measure','mechanism','protocol','ask_quantity','ask_deadline','ask_details','parent_call_id','author_statement','body_long','video_url','cover_image_url','intensity_level']
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
    if (call.lifecycle_state && call.lifecycle_state !== 'active') {
      return res.status(409).json({ error: 'This challenge is closed to new participants.' })
    }

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

      // A 'once' challenge finishes on its single check-in: mark the run complete
      // on the spot (the +5 to the beacon). Idempotent — only flips an active run.
      const { data: call } = await supabase.from('actor_calls')
        .select('cadence').eq('id', call_id).maybeSingle()
      if (call && call.cadence === 'once') {
        await supabase.from('actor_call_participants')
          .update({ status: 'complete', completed_at: new Date().toISOString() })
          .eq('id', p.id).eq('status', 'active')
      }
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
      .select('id, type, ask_quantity, visibility, lifecycle_state')
      .eq('id', call_id)
      .eq('type', 'ask')
      .in('visibility', ['link_only', 'community'])
      .maybeSingle()
    if (!call) return res.status(404).json({ error: 'Ask not found' })
    if (call.lifecycle_state && call.lifecycle_state !== 'active') {
      return res.status(409).json({ error: 'This ask is closed.' })
    }

    // Idempotent — return existing
    const { data: existing } = await supabase
      .from('actor_call_participants')
      .select('*').eq('call_id', call_id).eq('user_id', userId).maybeSingle()
    if (existing) return res.json({ participant: existing, already_offered: true })

    // Capacity — count everyone who has answered (active or complete); a claimed
    // spot is held until withdrawn.
    if (call.ask_quantity) {
      const taken = (await supabase
        .from('actor_call_participants')
        .select('id', { count: 'exact' })
        .eq('call_id', call_id)
        .neq('status', 'withdrawn')).count || 0
      if (taken >= call.ask_quantity) {
        return res.status(409).json({ error: 'This ask has reached capacity. Check back if space opens.' })
      }
    }

    // Accepting an ask is the commitment, not the delivery. The person steps
    // forward; no spark yet. They mark it complete when the thing is actually
    // done (action 'complete_ask'), and the spark lands then.
    const { data: participant, error } = await supabase
      .from('actor_call_participants')
      .insert({ call_id, user_id: userId, status: 'active', reflection: note || null })
      .select('*').single()
    if (error) return res.status(500).json({ error: error.message })

    await refreshCounts(call_id)
    return res.json({ participant })
  }

  // ── complete_ask ────────────────────────────────────────────────────────────
  // The second click on an ask: the thing is actually done. Flips the run to
  // complete, lands the spark (logs the ask's once-strand so the beacon counts
  // it), and moves the delivered count. Must have accepted first.
  if (action === 'complete_ask') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id, note } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })

    const { data: call } = await supabase
      .from('actor_calls')
      .select('id, type, ask_fulfilled, protocol')
      .eq('id', call_id).eq('type', 'ask').maybeSingle()
    if (!call) return res.status(404).json({ error: 'Ask not found' })

    const { data: p } = await supabase.from('actor_call_participants')
      .select('id, status').eq('call_id', call_id).eq('user_id', userId).maybeSingle()
    if (!p || p.status === 'withdrawn') return res.status(409).json({ error: 'Accept the ask first.' })
    if (p.status === 'complete') return res.json({ participant: p, already_complete: true })

    const nowIso = new Date().toISOString()
    await supabase.from('actor_call_participants')
      .update({ status: 'complete', completed_at: nowIso, ...(note ? { reflection: note } : {}) })
      .eq('id', p.id)

    // Land the spark: log the ask's strand (the once-strand carrying the need).
    const strand = Array.isArray(call.protocol) ? call.protocol[0] : null
    if (strand && strand.id) {
      await supabase.from('actor_call_strand_log').upsert(
        { participant_id: p.id, strand_id: strand.id, log_date: nowIso.slice(0, 10), done: true },
        { onConflict: 'participant_id,strand_id,log_date' }
      )
    }

    await refreshCounts(call_id)
    await supabase.from('actor_calls')
      .update({ ask_fulfilled: (call.ask_fulfilled || 0) + 1, updated_at: nowIso })
      .eq('id', call_id)

    return res.json({ participant: { id: p.id, status: 'complete' } })
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
      .eq('lifecycle_state', 'active')
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
      .eq('lifecycle_state', 'active')

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
      .select('id, title, tagline, slug, type, scale, domain, the_move, ask_quantity, ask_deadline, taken_on_count, active_count, visibility, lifecycle_state, created_at')
      .eq('actor_id', targetActor)
      .in('visibility', ['link_only', 'community'])
      .neq('lifecycle_state', 'deleted')
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

  // ── close ──────────────────────────────────────────────────────────────────
  // Reversible retirement. No new take-ons. keep_listed=true leaves the call in
  // the constellation (lineage intact, badged closed); keep_listed=false hides
  // it (remembering its prior visibility so reopen restores it). Author or founder.
  if (action === 'close') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id, keep_listed = true } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })
    const auth = await canManageCall(call_id, userId)
    if (!auth.exists)  return res.status(404).json({ error: 'Not found' })
    if (!auth.allowed) return res.status(403).json({ error: 'Not your call' })

    const { data: c } = await supabase.from('actor_calls')
      .select('visibility, lifecycle_state').eq('id', call_id).maybeSingle()
    if (c?.lifecycle_state === 'deleted') return res.status(409).json({ error: 'A deleted challenge cannot be closed.' })

    const now = new Date().toISOString()
    const upd = { lifecycle_state: 'closed', closed_at: now, updated_at: now }
    if (keep_listed) {
      upd.prior_visibility = null
    } else {
      upd.prior_visibility = c?.visibility || 'community'
      upd.visibility = 'draft'
    }
    const { data, error } = await supabase.from('actor_calls').update(upd).eq('id', call_id).select('*').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ call: data, closed: true, listed: !!keep_listed })
  }

  // ── reopen ─────────────────────────────────────────────────────────────────
  // Reverses a close. If the call was hidden on close, restores its prior
  // visibility, which puts it back in the lineage chain automatically.
  if (action === 'reopen') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })
    const auth = await canManageCall(call_id, userId)
    if (!auth.exists)  return res.status(404).json({ error: 'Not found' })
    if (!auth.allowed) return res.status(403).json({ error: 'Not your call' })

    const { data: c } = await supabase.from('actor_calls')
      .select('lifecycle_state, prior_visibility').eq('id', call_id).maybeSingle()
    if (c?.lifecycle_state === 'deleted') return res.status(409).json({ error: 'A deleted challenge cannot be reopened.' })

    const now = new Date().toISOString()
    const upd = { lifecycle_state: 'active', closed_at: null, updated_at: now }
    if (c?.prior_visibility) { upd.visibility = c.prior_visibility; upd.prior_visibility = null }
    const { data, error } = await supabase.from('actor_calls').update(upd).eq('id', call_id).select('*').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ call: data, reopened: true })
  }

  // ── delete_impact ──────────────────────────────────────────────────────────
  // What a delete would do: how many direct children re-root, and how many of
  // those belong to other actors (the constellation case). Read-only.
  if (action === 'delete_impact') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })
    const auth = await canManageCall(call_id, userId)
    if (!auth.exists)  return res.status(404).json({ error: 'Not found' })
    if (!auth.allowed) return res.status(403).json({ error: 'Not your call' })

    const { data: self } = await supabase.from('actor_calls')
      .select('parent_call_id, actor_id, user_id, taken_on_count').eq('id', call_id).maybeSingle()
    const { data: kids } = await supabase.from('actor_calls')
      .select('id, actor_id, user_id').eq('parent_call_id', call_id).neq('lifecycle_state', 'deleted')
    const children = kids || []
    const byOthers = children.filter(k =>
      (k.actor_id || null) !== (self?.actor_id || null) || (k.user_id || null) !== (self?.user_id || null)
    ).length
    return res.json({
      direct_children:    children.length,
      by_others:          byOthers,
      children_become_roots: !self?.parent_call_id,
      participants:       self?.taken_on_count || 0,
    })
  }

  // ── delete ─────────────────────────────────────────────────────────────────
  // Permanent soft-delete (tombstone). Children re-parent to the grandparent,
  // the slug is freed, the row is kept so participant evidence survives. Author
  // or founder. Not reversible — use close for anything you might restore.
  if (action === 'delete') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    const { call_id } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })
    const auth = await canManageCall(call_id, userId)
    if (!auth.exists)  return res.status(404).json({ error: 'Not found' })
    if (!auth.allowed) return res.status(403).json({ error: 'Not your call' })

    const { data, error } = await supabase.rpc('challenge_soft_delete', { p_call_id: call_id })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ deleted: true, reparented: data?.[0]?.reparented ?? 0 })
  }

  // ── purge (founder only) ─────────────────────────────────────────────────────
  // True row removal. Allowed only for a challenge nobody ever joined — the SQL
  // function refuses if any participation exists, so evidence can't be lost.
  if (action === 'purge') {
    if (!userId) return res.status(401).json({ error: 'Auth required' })
    if (!(await isFounder(userId))) return res.status(403).json({ error: 'Founder only.' })
    const { call_id } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })

    const { data, error } = await supabase.rpc('challenge_hard_purge', { p_call_id: call_id })
    if (error) return res.status(409).json({ error: error.message })
    return res.json({ purged: true, reparented: data?.[0]?.reparented ?? 0 })
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
