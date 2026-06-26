// api/notify-cron.js
// ─────────────────────────────────────────────────────────────────────────────
// The beacon's daily reminder. For each person who committed to a recurring
// constellation challenge and has not checked in today — and who has a push
// subscription — send one warm commitment reminder. It names the challenge and
// the open day, never a miss, never a streak. The voice rotates so it never
// reads like a cron.
//
// Once-challenges are never nudged (nothing recurring to return to). Momentum
// nudges and the finish call layer on later; this is the commitment reminder.
//
// GET  → Vercel Cron (scheduled).
// POST → manual run; requires header x-cron-secret = CRON_SECRET.
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js')
const { sendToUser } = require('./_push')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Warm, rotating. Each names the challenge and the open day — never a miss.
function reminderBody(name, dayIndex) {
  const lines = [
    `The ${name} challenge is waiting for you.`,
    `Time to check in on ${name}.`,
    `${name}, still open for today.`,
    `A minute for the beacon? ${name} is waiting.`,
  ]
  return lines[dayIndex % lines.length]
}

// As the close nears, the voice shifts to a finish call — urgency, not guilt.
function finishCall(name, closesOn) {
  let when = 'soon'
  try { when = new Date(closesOn + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) } catch (_) {}
  return `The constellation closes ${when}. Add your last sparks to ${name}.`
}

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const secret = req.headers['x-cron-secret']
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  } else if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 1) the live beacon
  const { data: beacon } = await supabase
    .from('constellation_beacons').select('root_call_id, status, closes_on')
    .eq('slug', 'founding-nature').maybeSingle()
  if (!beacon || !beacon.root_call_id || beacon.status !== 'live') {
    return res.json({ ok: true, sent: 0, reason: 'beacon not live' })
  }

  // Within the final stretch, switch to the finish-call voice.
  const todayStr = new Date().toISOString().slice(0, 10)
  const daysLeft = beacon.closes_on
    ? Math.round((new Date(beacon.closes_on + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / 86400000)
    : null
  const nearClose = daysLeft !== null && daysLeft >= 0 && daysLeft <= 6

  // 2) the tree's recurring challenges
  const { data: tree } = await supabase.rpc('beacon_breakdown', { p_root_call_id: beacon.root_call_id })
  const recurring = (tree || []).filter((c) => c.cadence !== 'once')
  if (!recurring.length) return res.json({ ok: true, sent: 0, reason: 'no recurring challenges' })
  const callMap = {}
  recurring.forEach((c) => { callMap[c.call_id] = c.the_move || c.title || 'your' })
  const callIds = recurring.map((c) => c.call_id)

  // 3) active participants of those challenges
  const { data: parts } = await supabase
    .from('actor_call_participants')
    .select('id, call_id, user_id, protocol_snapshot')
    .in('call_id', callIds)
    .eq('status', 'active')
  if (!parts || !parts.length) return res.json({ ok: true, sent: 0, reason: 'no participants' })

  // 4) what's already done today
  const today = new Date().toISOString().slice(0, 10)
  const partIds = parts.map((p) => p.id)
  const { data: logs } = await supabase
    .from('actor_call_strand_log').select('participant_id, strand_id')
    .in('participant_id', partIds).eq('log_date', today).eq('done', true)
  const doneByPart = {}
  ;(logs || []).forEach((l) => {
    if (!doneByPart[l.participant_id]) doneByPart[l.participant_id] = new Set()
    doneByPart[l.participant_id].add(l.strand_id)
  })

  // 5) per user: the first challenge still open today
  const openByUser = {}
  for (const p of parts) {
    const strands = Array.isArray(p.protocol_snapshot) ? p.protocol_snapshot : []
    const done = doneByPart[p.id] || new Set()
    const open = strands.length === 0 ? true : strands.some((s) => !done.has(s.id))
    if (open && !openByUser[p.user_id]) openByUser[p.user_id] = callMap[p.call_id] || 'your'
  }
  const dueUsers = Object.keys(openByUser)
  if (!dueUsers.length) return res.json({ ok: true, sent: 0, reason: 'nobody open' })

  // 6) only those with a subscription
  const { data: subs } = await supabase
    .from('push_subscriptions').select('user_id').in('user_id', dueUsers)
  const subscribed = new Set((subs || []).map((s) => s.user_id))

  // 7) send
  const dayIndex = Math.floor(Date.now() / 86400000)
  let total = 0
  for (const uid of dueUsers) {
    if (!subscribed.has(uid)) continue
    const r = await sendToUser(uid, {
      title: 'The beacon',
      body: nearClose ? finishCall(openByUser[uid], beacon.closes_on) : reminderBody(openByUser[uid], dayIndex),
      url: '/',
      tag: nearClose ? 'beacon-finish' : 'beacon-reminder',
    })
    total += (r && r.sent) || 0
  }

  return res.json({ ok: true, sent: total, due: dueUsers.length, subscribed: subscribed.size })
}
