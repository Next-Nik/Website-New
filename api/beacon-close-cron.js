// api/beacon-close-cron.js
// ─────────────────────────────────────────────────────────────────────────────
// The close. At Climate Week's end the beacon stops gathering and settles into
// a record. Everyone who showed up — at least one check-in — finishes: their run
// flips to complete (the +5 surge). The beacon flips to 'closed', and the record
// turns to past tense. A finish notification goes out: come see what we did.
//
// Date-gated and idempotent. Runs daily and does nothing until closes_on; closes
// exactly once; later runs exit because the beacon is no longer 'live'.
//
// GET  → Vercel Cron (scheduled daily).
// POST → manual; requires header x-cron-secret = CRON_SECRET. { force: true }
//        closes before the date (for a dry run / early close).
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js')
const { sendToUser } = require('./_push')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
)

module.exports = async (req, res) => {
  let force = false
  if (req.method === 'POST') {
    const secret = req.headers['x-cron-secret']
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    force = !!(req.body && req.body.force)
  } else if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { data: beacon } = await supabase
    .from('constellation_beacons')
    .select('id, root_call_id, status, closes_on, label')
    .eq('slug', 'founding-nature').maybeSingle()

  if (!beacon || !beacon.root_call_id) return res.json({ ok: true, closed: false, reason: 'not rooted' })
  if (beacon.status !== 'live') return res.json({ ok: true, closed: false, reason: 'not live' })

  const today = new Date().toISOString().slice(0, 10)
  if (!force && beacon.closes_on && today < beacon.closes_on) {
    return res.json({ ok: true, closed: false, reason: 'before close', closes_on: beacon.closes_on })
  }

  // The tree's challenges.
  const { data: tree } = await supabase.rpc('beacon_breakdown', { p_root_call_id: beacon.root_call_id })
  const callIds = (tree || []).map((c) => c.call_id)
  if (!callIds.length) {
    await supabase.from('constellation_beacons').update({ status: 'closed' }).eq('id', beacon.id)
    return res.json({ ok: true, closed: true, finished: 0, reason: 'no challenges' })
  }

  // Active participants of the tree.
  const { data: parts } = await supabase
    .from('actor_call_participants')
    .select('id, user_id')
    .in('call_id', callIds)
    .eq('status', 'active')

  let finished = 0
  const finishers = new Set()
  if (parts && parts.length) {
    const partIds = parts.map((p) => p.id)
    // Who showed up at least once.
    const { data: logs } = await supabase
      .from('actor_call_strand_log').select('participant_id')
      .in('participant_id', partIds).eq('done', true)
    const showed = new Set((logs || []).map((l) => l.participant_id))
    const toFinish = parts.filter((p) => showed.has(p.id))

    // Flip them complete (the finish surge).
    const now = new Date().toISOString()
    for (let i = 0; i < toFinish.length; i += 50) {
      const batch = toFinish.slice(i, i + 50).map((p) => p.id)
      await supabase.from('actor_call_participants')
        .update({ status: 'complete', completed_at: now })
        .in('id', batch)
    }
    finished = toFinish.length
    toFinish.forEach((p) => finishers.add(p.user_id))
  }

  // Settle the beacon.
  await supabase.from('constellation_beacons').update({ status: 'closed' }).eq('id', beacon.id)

  // The finish call: come and see what we did.
  let notified = 0
  if (finishers.size) {
    const uids = Array.from(finishers)
    const { data: subs } = await supabase
      .from('push_subscriptions').select('user_id').in('user_id', uids)
    const subscribed = new Set((subs || []).map((s) => s.user_id))
    for (const uid of uids) {
      if (!subscribed.has(uid)) continue
      const r = await sendToUser(uid, {
        title: 'We did it together',
        body: 'The constellation has closed. Come and see what we did.',
        url: '/constellation/record',
        tag: 'beacon-close',
      })
      notified += (r && r.sent) || 0
    }
  }

  return res.json({ ok: true, closed: true, finished, notified })
}
