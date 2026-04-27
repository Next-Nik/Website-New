// ── NextUs Indicator Cron ────────────────────────────────────
// Runs daily at 03:00 UTC via Vercel Cron (see vercel.json crons config).
// One hour after integrity-cron so the two do not contend for Supabase
// connections. Pulls live data into nextus_domain_indicator_values for
// every catalog indicator whose refresh_cadence has elapsed since its
// last successful fetch.
//
// Cadence logic (Data Sourcing v1, Section 3.2):
//   daily        — fetched every run
//   weekly       — fetched once every 7 days from the last successful fetch
//   monthly      — fetched on the first run of each calendar month
//   annual       — fetched in the first run of January each year
//   event-driven — never fetched on schedule
//
// Per-indicator failure logging: every fetch result writes one row to
// nextus_indicator_fetch_log (status: ok | skipped | failed |
// not-implemented). Stale data surfaces honestly on the page; failures
// are auditable.
//
// Survival rule: if a fetch fails, the page still renders. Last-known-good
// value remains is_current=true. This is enforced at the worker layer —
// a failed fetch does not flip is_current on the previous row.
//
// Called by Vercel Cron. Also callable manually at
// POST /api/indicator-cron with header x-cron-secret matching
// CRON_SECRET env var (for manual runs / testing).

const { createClient } = require('@supabase/supabase-js')
const { fetchIndicator } = require('./indicator-worker.js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Per-run cap. Vercel functions are bounded to maxDuration: 60. We
// budget conservatively and cap how many indicators a single run will
// process synchronously. The unprocessed remainder picks up on the next
// run; cadence logic naturally re-selects them.
const MAX_INDICATORS_PER_RUN = 40

// ── Helpers ──────────────────────────────────────────────────

function log(msg, data = '') {
  console.log(`[indicator-cron] ${msg}`, data)
}

function logErr(msg, err) {
  console.error(`[indicator-cron] ${msg}`, err)
}

// Has enough time elapsed since last_fetched_at to fetch again, given the
// indicator's cadence? now is a Date.
function shouldFetch(cadence, lastFetchedAt, now) {
  if (cadence === 'event-driven') return false
  if (!lastFetchedAt) return true

  const last = new Date(lastFetchedAt)
  if (Number.isNaN(last.getTime())) return true

  const diffMs = now.getTime() - last.getTime()
  const oneDay = 24 * 60 * 60 * 1000

  if (cadence === 'daily')   return diffMs >= oneDay - (60 * 60 * 1000) // tolerate 1h
  if (cadence === 'weekly')  return diffMs >= 7 * oneDay
  if (cadence === 'monthly') {
    return last.getUTCFullYear() !== now.getUTCFullYear()
        || last.getUTCMonth()    !== now.getUTCMonth()
  }
  if (cadence === 'annual') {
    return last.getUTCFullYear() !== now.getUTCFullYear()
        && now.getUTCMonth() === 0
  }
  return false
}

async function lastFetchedAtFor(indicatorId) {
  const { data, error } = await supabase
    .from('nextus_indicator_fetch_log')
    .select('run_at')
    .eq('indicator_id', indicatorId)
    .eq('status', 'ok')
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logErr(`lastFetchedAtFor(${indicatorId}) failed`, error)
    return null
  }
  return data?.run_at || null
}

async function writeLog(indicatorId, status, { httpStatus, message, durationMs } = {}) {
  const { error } = await supabase
    .from('nextus_indicator_fetch_log')
    .insert({
      indicator_id: indicatorId,
      status,
      http_status: httpStatus ?? null,
      message:     message ?? null,
      duration_ms: durationMs ?? null,
    })
  if (error) {
    logErr(`writeLog(${indicatorId}, ${status}) failed`, error)
  }
}

// ── Handler ──────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  // Security: verify cron secret on POST requests
  if (req.method === 'POST') {
    const secret = req.headers['x-cron-secret']
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorised' })
    }
  }

  const startedAt = Date.now()
  const now = new Date()
  log(`Starting run at ${now.toISOString()}`)

  // Catalog scan: every active Tier 1 / Tier 2 indicator. Tier 3
  // (contributor) is contributor-seeded and does not run through the cron.
  const { data: indicators, error: catalogError } = await supabase
    .from('nextus_domain_indicators')
    .select('id, domain_id, name, tier, refresh_cadence, endpoint_url')
    .eq('status', 'active')
    .in('tier', ['api', 'scrape'])

  if (catalogError) {
    logErr('Catalog read failed', catalogError)
    return res.status(500).json({ ok: false, error: 'catalog_read_failed' })
  }

  log(`Catalog returned ${indicators?.length || 0} active indicators`)

  // Decide which indicators to fetch this run.
  const due = []
  for (const ind of indicators || []) {
    const lastOk = await lastFetchedAtFor(ind.id)
    if (shouldFetch(ind.refresh_cadence, lastOk, now)) {
      due.push(ind)
    }
  }

  log(`${due.length} indicators are due this run`)

  const slice = due.slice(0, MAX_INDICATORS_PER_RUN)
  if (due.length > MAX_INDICATORS_PER_RUN) {
    log(`Capping to ${MAX_INDICATORS_PER_RUN}; ${due.length - MAX_INDICATORS_PER_RUN} will be picked up next run`)
  }

  const summary = {
    ok: 0,
    skipped: 0,
    failed: 0,
    notImplemented: 0,
    perIndicator: [],
  }

  // Process in series. Parallel fetches risk hitting source-side rate
  // limits and complicate the duration budget. The MAX cap keeps total
  // runtime under the function ceiling.
  for (const ind of slice) {
    const indStart = Date.now()
    try {
      const result = await fetchIndicator(ind, supabase)
      const duration = Date.now() - indStart

      if (result.status === 'not-implemented') {
        summary.notImplemented++
        await writeLog(ind.id, 'not-implemented', {
          message: result.message || 'fetch handler not yet implemented',
          durationMs: duration,
        })
      } else if (result.status === 'skipped') {
        summary.skipped++
        await writeLog(ind.id, 'skipped', {
          message: result.message || 'skipped',
          durationMs: duration,
        })
      } else if (result.status === 'ok') {
        summary.ok++
        await writeLog(ind.id, 'ok', {
          httpStatus: result.httpStatus,
          message: result.message || `wrote ${result.rowsWritten || 1} row(s)`,
          durationMs: duration,
        })
      } else {
        summary.failed++
        await writeLog(ind.id, 'failed', {
          httpStatus: result.httpStatus,
          message: result.message || 'fetch failed',
          durationMs: duration,
        })
      }

      summary.perIndicator.push({
        id: ind.id,
        name: ind.name,
        status: result.status,
        durationMs: duration,
      })
    } catch (err) {
      const duration = Date.now() - indStart
      summary.failed++
      logErr(`Indicator ${ind.id} (${ind.name}) threw`, err)
      await writeLog(ind.id, 'failed', {
        message: (err && err.message) || String(err),
        durationMs: duration,
      })
      summary.perIndicator.push({
        id: ind.id,
        name: ind.name,
        status: 'failed',
        durationMs: duration,
      })
    }
  }

  const totalMs = Date.now() - startedAt
  log(`Run complete in ${totalMs}ms. ok=${summary.ok} skipped=${summary.skipped} failed=${summary.failed} notImplemented=${summary.notImplemented}`)

  return res.status(200).json({
    ok: true,
    durationMs: totalMs,
    catalogSize: indicators?.length || 0,
    dueCount: due.length,
    processed: slice.length,
    summary: {
      ok: summary.ok,
      skipped: summary.skipped,
      failed: summary.failed,
      notImplemented: summary.notImplemented,
    },
    perIndicator: summary.perIndicator,
  })
}
