// api/_beaconStrip.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared read logic for the Mission Control strip. Extracted verbatim from
// api/actor-calls.js so both that endpoint and /api/beacon's consolidated
// 'strip' action serve the same shapes from one implementation.
// Underscore prefix: not routed as an endpoint.
// ─────────────────────────────────────────────────────────────────────────────

// The living surface's fuel: recent real events in the founding tree, the
// field (challenges + organisations), and today's spark count.
async function constellationActivity(supabase, limitIn) {
  const limit = Math.min(30, Number(limitIn) || 18)
    const { data: beacon } = await supabase.from('constellation_beacons')
      .select('root_call_id, opens_on, closes_on, status')
      .eq('slug', 'founding-nature').maybeSingle()
    if (!beacon || !beacon.root_call_id || beacon.status !== 'live') {
      return ({ events: [], field: { challenges: [], orgs: [] }, sparks_today: 0, beacon: null })
    }

    // the tree: root + descendants
    let treeIds = [beacon.root_call_id]
    try {
      const { data: desc } = await supabase.rpc('challenge_descendants', { p_call_id: beacon.root_call_id, p_max_depth: null })
      if (desc) treeIds = treeIds.concat(desc.map(d => d.id))
    } catch (_) { /* root-only beacon is still valid */ }

    // the field: per-challenge tallies + the organisations behind them
    let field = { challenges: [], orgs: [] }
    try {
      const { data: rows } = await supabase.rpc('beacon_breakdown', { p_root_call_id: beacon.root_call_id })
      const challenges = (rows || []).map(r => ({
        call_id: r.call_id, title: r.title, domain: r.domain, cadence: r.cadence,
        actor_name: r.actor_name, actor_slug: r.actor_slug,
        people: Number(r.people || 0), checkins: Number(r.checkins || 0),
      }))
      const orgSeen = {}
      const actorIds = []
      ;(rows || []).forEach(r => {
        if (r.actor_id && !orgSeen[r.actor_id]) { orgSeen[r.actor_id] = true; actorIds.push(r.actor_id) }
      })
      let orgs = []
      if (actorIds.length) {
        const { data: actors } = await supabase.from('nextus_actors')
          .select('id, name, slug, image_url, type').in('id', actorIds)
        orgs = (actors || []).map(a => ({ name: a.name, slug: a.slug, image_url: a.image_url, type: a.type }))
      }
      // slugs of calls for linking
      const { data: callSlugs } = await supabase.from('actor_calls')
        .select('id, slug').in('id', challenges.map(c => c.call_id))
      const slugMap = {}
      ;(callSlugs || []).forEach(c => { slugMap[c.id] = c.slug })
      challenges.forEach(c => { c.slug = slugMap[c.call_id] || null })
      field = { challenges, orgs }
    } catch (_) {}

    // participants in the tree (joins + the spark join table)
    const { data: parts } = await supabase.from('actor_call_participants')
      .select('id, call_id, user_id, created_at')
      .in('call_id', treeIds)
      .order('created_at', { ascending: false })
      .limit(400)
    const partList = parts || []
    const partMap = {}
    partList.forEach(p => { partMap[p.id] = p })

    // recent sparks
    let sparkRows = []
    if (partList.length) {
      const { data: logs } = await supabase.from('actor_call_strand_log')
        .select('participant_id, created_at, log_date')
        .in('participant_id', partList.map(p => p.id))
        .eq('done', true)
        .order('created_at', { ascending: false })
        .limit(limit)
      sparkRows = logs || []
    }

    // sparks today
    let sparksToday = 0
    if (partList.length) {
      const today = new Date().toISOString().slice(0, 10)
      const { count } = await supabase.from('actor_call_strand_log')
        .select('id', { count: 'exact', head: true })
        .in('participant_id', partList.map(p => p.id))
        .eq('done', true).eq('log_date', today)
      sparksToday = count || 0
    }

    // recent publishes into the tree (skip the root itself)
    const { data: pubs } = await supabase.from('actor_calls')
      .select('id, title, created_at, nextus_actors ( name )')
      .in('id', treeIds.filter(id => id !== beacon.root_call_id))
      .eq('visibility', 'community')
      .order('created_at', { ascending: false })
      .limit(5)

    // titles for event lines
    const titleMap = {}
    field.challenges.forEach(c => { titleMap[c.call_id] = c.title })
    if (!Object.keys(titleMap).length) {
      const { data: ts } = await supabase.from('actor_calls').select('id, title').in('id', treeIds)
      ;(ts || []).forEach(t => { titleMap[t.id] = t.title })
    }

    // names: first name + initial, never more
    const userIds = Array.from(new Set(
      sparkRows.map(l => partMap[l.participant_id]?.user_id)
        .concat(partList.slice(0, 12).map(p => p.user_id))
        .filter(Boolean)
    ))
    const nameMap = {}
    if (userIds.length) {
      const { data: profs } = await supabase.from('profiles')
        .select('id, display_name').in('id', userIds)
      ;(profs || []).forEach(p => {
        const parts2 = String(p.display_name || '').trim().split(/\s+/)
        nameMap[p.id] = parts2[0]
          ? (parts2.length > 1 ? `${parts2[0]} ${parts2[1][0]}.` : parts2[0])
          : 'Someone'
      })
    }
    const nameOf = (uid) => nameMap[uid] || 'Someone'

    const events = []
    sparkRows.forEach(l => {
      const p = partMap[l.participant_id]
      if (!p) return
      events.push({ kind: 'spark', name: nameOf(p.user_id), title: titleMap[p.call_id] || 'a challenge', at: l.created_at })
    })
    partList.slice(0, 12).forEach(p => {
      events.push({ kind: 'join', name: nameOf(p.user_id), title: titleMap[p.call_id] || 'a challenge', at: p.created_at })
    })
    ;(pubs || []).forEach(c => {
      events.push({ kind: 'publish', name: c.nextus_actors?.name || 'A new author', title: c.title, at: c.created_at })
    })
    events.sort((a, b) => new Date(b.at) - new Date(a.at))

    return ({
      events: events.slice(0, limit),
      field,
      sparks_today: sparksToday,
      tree_ids: treeIds,
      beacon: { opens_on: beacon.opens_on, closes_on: beacon.closes_on },
    })
}

// Every challenge the user has taken on, shaped for the daily-ritual card.
async function myParticipations(supabase, userId) {
    const { data: parts } = await supabase.from('actor_call_participants')
      .select('id, call_id, status, scale, started_on, ends_on, protocol_snapshot, completed_at, created_at')
      .eq('user_id', userId)
      .in('status', ['active', 'complete'])
      .order('created_at', { ascending: false })
    const rows = parts || []
    if (!rows.length) return []

    const callIds = rows.map(r => r.call_id)
    const { data: calls } = await supabase.from('actor_calls')
      .select('id, slug, title, tagline, domain, cadence, duration_days, nextus_actors ( name, slug, image_url, type )')
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
        cadence:    c.cadence || 'daily-flexible',
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
    return participations
}

module.exports = { constellationActivity, myParticipations }
