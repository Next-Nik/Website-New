// api/gtd-feed.js
//
// Outbound iCalendar feed of a user's dated, incomplete Get To Do items.
// A calendar app (Google, Apple, Outlook) subscribes to the URL once and
// polls it on its own schedule — so dated to-dos appear on the calendar and
// keep updating without any manual push.
//
// GET /api/gtd-feed?token=<secret>
//   The token (contributor_profiles_beta.gtd_feed_token) is the only auth:
//   the subscribing client is a server with no session, so the URL itself is
//   the secret. We resolve the user from it with the service role and emit
//   one all-day VEVENT per dated, incomplete item. Stable UID per item lets
//   clients update rather than duplicate on each poll.
//
// One-way: to-dos flow to the calendar, never back. Read-only feed.

const { createClient } = require('@supabase/supabase-js')

export const config = { maxDuration: 15 }

function escICS(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// RFC 5545 line folding at 75 octets (char-based; fine for our content).
function fold(line) {
  if (line.length <= 75) return line
  const out = []
  let l = line
  out.push(l.slice(0, 75))
  l = l.slice(75)
  while (l.length > 74) { out.push(' ' + l.slice(0, 74)); l = l.slice(74) }
  out.push(' ' + l)
  return out.join('\r\n')
}

function compactDate(ymd) {            // 'YYYY-MM-DD' -> 'YYYYMMDD'
  return ymd.replace(/-/g, '')
}
function nextDay(ymd) {                 // all-day DTEND is exclusive
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}
function stamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

module.exports = async function handler(req, res) {
  const token = (req.query && req.query.token) || ''
  if (!token || typeof token !== 'string' || token.length < 12) {
    return res.status(400).send('Missing or invalid token')
  }

  const supa = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let userId = null
  try {
    const { data: prof } = await supa
      .from('contributor_profiles_beta')
      .select('user_id')
      .eq('gtd_feed_token', token)
      .maybeSingle()
    if (!prof) return res.status(404).send('Not found')
    userId = prof.user_id
  } catch {
    return res.status(500).send('Lookup failed')
  }

  let items = []
  try {
    const { data } = await supa
      .from('get_to_do_items')
      .select('id, body, due_date, is_priority, kind')
      .eq('user_id', userId)
      .is('completed_at', null)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
    items = data || []
  } catch {
    items = []
  }

  const now = stamp()
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NextUs//Get To Do//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Get To Do',
    'NAME:Get To Do',
    'X-WR-CALDESC:Dated to-dos from your NextUs Get To Do list',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]

  for (const it of items) {
    const summary = `${it.is_priority ? '\u2605 ' : ''}${it.body || ''}`
    const desc = it.kind === 'stretch' ? 'From your Target Stretch' : 'From your daily list'
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:gtd-${it.id}@nextus.world`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART;VALUE=DATE:${compactDate(it.due_date)}`)
    lines.push(`DTEND;VALUE=DATE:${nextDay(it.due_date)}`)
    lines.push(fold(`SUMMARY:${escICS(summary)}`))
    lines.push(fold(`DESCRIPTION:${escICS(desc)}`))
    lines.push('TRANSP:TRANSPARENT')
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  const body = lines.join('\r\n') + '\r\n'
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', 'inline; filename="get-to-do.ics"')
  res.setHeader('Cache-Control', 'public, max-age=1800')
  return res.status(200).send(body)
}
