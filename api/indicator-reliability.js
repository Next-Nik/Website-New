// ── NextUs Indicator Reliability API ──────────────────────────────
// Public read of the fetch-log surface. Powers the reliability tile
// in Mission Control: "X ok, Y failed, Z pending" across the catalog.
//
// Routes:
//   GET /api/indicator-reliability
//     → { window_hours, totals: { ok, failed, not_implemented },
//         per_domain: { domain_id: { ok, failed, not_implemented } },
//         recent_failures: [{ name, message, status, fetched_at }] }
//
// Defaults to a 24-hour window. Pass ?hours=72 etc. to widen.
// Caps at 720 hours (30 days) to keep queries cheap.
//
// No auth required — the goal is honesty about what the system
// knows and doesn't know. Failed fetch counts are not sensitive.

const { createClient } = require('@supabase/supabase-js')

function defaultClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const hoursRaw = parseInt(req.query?.hours, 10)
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0
    ? Math.min(hoursRaw, 720)
    : 24

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const supabase = defaultClient()

  // Pull fetch log entries within the window. We use two flat queries
  // (log + indicators lookup) rather than relying on FK-hinted joins,
  // since Supabase select-join syntax depends on metadata that can be
  // brittle across schema regenerations.
  const { data: rows, error } = await supabase
    .from('nextus_indicator_fetch_log')
    .select(
      'id, indicator_id, status, http_status, message, duration_ms, run_at'
    )
    .gte('run_at', since)
    .order('run_at', { ascending: false })
    .limit(2000)

  if (error) {
    return res.status(500).json({ error: 'database error' })
  }

  // Look up names + domain_ids for all referenced indicators in one query.
  const indicatorIds = Array.from(new Set((rows || []).map((r) => r.indicator_id).filter(Boolean)))
  let lookup = {}
  if (indicatorIds.length > 0) {
    const { data: ind = [] } = await supabase
      .from('nextus_domain_indicators')
      .select('id, name, domain_id')
      .in('id', indicatorIds)
    for (const i of ind || []) {
      lookup[i.id] = { name: i.name, domain_id: i.domain_id }
    }
  }

  const totals = { ok: 0, failed: 0, not_implemented: 0 }
  const perDomain = {}  // { domain_id: { ok, failed, not_implemented } }
  const recentFailures = []
  // Track each indicator's most recent status so we can de-dupe the
  // failures list — show one row per indicator, not one per cron run.
  const seenIndicator = new Set()

  for (const row of (rows || [])) {
    const status = row.status || 'unknown'
    const meta = lookup[row.indicator_id] || {}
    const domainId = meta.domain_id || 'unknown'

    if (status === 'ok')              totals.ok += 1
    else if (status === 'failed')     totals.failed += 1
    else if (status === 'not-implemented') totals.not_implemented += 1

    if (!perDomain[domainId]) {
      perDomain[domainId] = { ok: 0, failed: 0, not_implemented: 0 }
    }
    if (status === 'ok')              perDomain[domainId].ok += 1
    else if (status === 'failed')     perDomain[domainId].failed += 1
    else if (status === 'not-implemented') perDomain[domainId].not_implemented += 1

    // Most recent failure per indicator — including not-implemented,
    // since those are the gap surface.
    if ((status === 'failed' || status === 'not-implemented') &&
        !seenIndicator.has(row.indicator_id) &&
        recentFailures.length < 50) {
      seenIndicator.add(row.indicator_id)
      recentFailures.push({
        indicator_id: row.indicator_id,
        name:         meta.name || '(unknown)',
        domain_id:    domainId,
        status:       status,
        message:      row.message || null,
        http_status:  row.http_status || null,
        fetched_at:   row.run_at,
      })
    }
  }

  return res.status(200).json({
    window_hours: hours,
    since,
    totals,
    per_domain: perDomain,
    recent_failures: recentFailures,
  })
}
