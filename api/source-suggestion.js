// ── NextUs Source Suggestions API ──────────────────────────────────
// Lets anyone — anonymous or signed in — suggest a data source for
// any indicator in the catalog. Surfaces accepted suggestions back to
// the UI so visitors can see "the community pointed us at this source"
// next to the methodology note.
//
// Routes:
//   POST /api/source-suggestion           — submit a new suggestion
//   GET  /api/source-suggestion?indicator_id=<uuid>
//                                          — list accepted suggestions
//                                            for one indicator
//
// Honest design: we do not require auth on the POST. Submission is
// the contribution. We do basic rate-limiting by IP (10 per hour per
// IP, naive memory-bucket — replace with a Redis or upstash bucket
// when traffic warrants). The DB constraints handle length/shape.
// No moderation in this layer; the founder admin console flips
// status to 'accepted' or 'declined' before anything is shown back.

const { createClient } = require('@supabase/supabase-js')

// ── naive in-memory rate limit (per process) ─────────────────────
// Memory buckets reset on cold start; that's OK for spam-deterrence.
// Replace with a Vercel KV / Upstash bucket if abuse becomes an issue.
const RATE_BUCKETS = new Map()
const RATE_WINDOW_MS = 60 * 60 * 1000   // 1 hour
const RATE_LIMIT     = 10               // submissions per IP per hour

function rateCheck(ip) {
  if (!ip) return true  // be permissive if we can't read IP
  const now = Date.now()
  const entry = RATE_BUCKETS.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS }
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + RATE_WINDOW_MS
  }
  entry.count += 1
  RATE_BUCKETS.set(ip, entry)
  return entry.count <= RATE_LIMIT
}

function defaultClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

// ── handler ──────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method === 'GET')  return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method not allowed' })
}

// ── GET — list accepted suggestions for an indicator ─────────────

async function handleGet(req, res) {
  const indicatorId = req.query?.indicator_id
  if (!indicatorId || !isUuid(indicatorId)) {
    return res.status(400).json({ error: 'indicator_id query param required (uuid)' })
  }

  const supabase = defaultClient()
  const { data, error } = await supabase
    .from('nextus_source_suggestions')
    .select('id, source_name, source_url, cadence_hint, notes, submitted_at')
    .eq('indicator_id', indicatorId)
    .eq('status', 'accepted')
    .order('submitted_at', { ascending: false })
    .limit(20)

  if (error) {
    return res.status(500).json({ error: 'database error' })
  }

  return res.status(200).json({ suggestions: data || [] })
}

// ── POST — submit a new suggestion ───────────────────────────────

async function handlePost(req, res) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    null

  if (!rateCheck(ip)) {
    return res.status(429).json({ error: 'rate limit — try again later' })
  }

  const body = req.body || {}
  const indicatorId = body.indicator_id
  const sourceName  = (body.source_name || '').toString().trim()
  const sourceUrl   = (body.source_url || '').toString().trim()
  const endpointUrl = body.endpoint_url ? body.endpoint_url.toString().trim() : null
  const cadenceHint = body.cadence_hint ? body.cadence_hint.toString().trim() : null
  const notes       = body.notes ? body.notes.toString().trim() : null
  const contactEmail = body.contact_email ? body.contact_email.toString().trim() : null

  // shape validation — DB constraints catch length, but bouncing here
  // gives nicer error messages.
  if (!indicatorId || !isUuid(indicatorId)) {
    return res.status(400).json({ error: 'indicator_id (uuid) required' })
  }
  if (sourceName.length < 2 || sourceName.length > 200) {
    return res.status(400).json({ error: 'source_name 2–200 chars' })
  }
  if (!isLikelyUrl(sourceUrl)) {
    return res.status(400).json({ error: 'source_url must be http(s)://' })
  }
  if (endpointUrl && !isLikelyUrl(endpointUrl)) {
    return res.status(400).json({ error: 'endpoint_url must be http(s)://' })
  }
  if (notes && notes.length > 2000) {
    return res.status(400).json({ error: 'notes too long (max 2000)' })
  }
  if (contactEmail && (contactEmail.length > 200 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail))) {
    return res.status(400).json({ error: 'contact_email looks invalid' })
  }

  // OK, write it.
  const supabase = defaultClient()
  const { data, error } = await supabase
    .from('nextus_source_suggestions')
    .insert({
      indicator_id:   indicatorId,
      source_name:    sourceName,
      source_url:     sourceUrl,
      endpoint_url:   endpointUrl,
      cadence_hint:   cadenceHint,
      notes:          notes,
      contact_email:  contactEmail,
      status:         'submitted',
    })
    .select('id, submitted_at')
    .maybeSingle()

  if (error) {
    // FK violation = bad indicator_id; surface a useful error.
    if (error.code === '23503') {
      return res.status(404).json({ error: 'indicator not found' })
    }
    return res.status(500).json({ error: 'database error' })
  }

  return res.status(200).json({
    ok: true,
    id: data?.id,
    submitted_at: data?.submitted_at,
    message: 'thank you — the suggestion is in our queue.',
  })
}

// ── helpers ──────────────────────────────────────────────────────

function isUuid(s) {
  return typeof s === 'string' &&
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

function isLikelyUrl(s) {
  if (typeof s !== 'string') return false
  if (s.length < 8 || s.length > 2000) return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
