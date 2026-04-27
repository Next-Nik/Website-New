// ── NextUs Indicator Worker ──────────────────────────────────
// Per-indicator fetch logic. Called by /api/indicator-cron in series for
// every indicator whose cadence is due. Also exported as a callable
// endpoint for manual single-indicator refresh.
//
// Each fetch handler:
//   1. Calls the source endpoint
//   2. Parses the response
//   3. Writes a row to nextus_domain_indicator_values (idempotent on
//      indicator_id × focus_id × observed_at)
//   4. Flips is_current=false on prior rows for this (indicator_id,
//      focus_id) pair so only the latest row is "current"
//   5. Returns { status, httpStatus, rowsWritten, message }
//
// Module 11 ships three real fetchers for the Nature pilot acceptance
// criteria: NOAA Mauna Loa CO₂, USGS Earthquakes, OpenAQ PM2.5. The
// remaining indicators have stub handlers that log "not-implemented" so
// the cron continues running cleanly while individual sources are
// implemented one by one.
//
// Survival rule: a failing fetch must not flip is_current on prior good
// data. That guarantees stale data over no data.

const { createClient } = require('@supabase/supabase-js')

// ── Source registry ──────────────────────────────────────────
// Keyed by source_name from the catalog. The cron passes the full
// indicator row in; we dispatch on source.

const HANDLERS = {
  'NOAA Global Monitoring Laboratory': handleNoaaGml,
  'USGS Earthquake Hazards':           handleUsgsQuakes,
  'OpenAQ':                            handleOpenAq,
  // The rest fall through to handleNotImplemented.
}

// ── Public entry: fetchIndicator ─────────────────────────────

async function fetchIndicator(indicator, supabaseClient) {
  if (!indicator || !indicator.id) {
    return { status: 'failed', message: 'missing indicator' }
  }
  const supabase = supabaseClient || defaultClient()

  const handler = HANDLERS[indicator.source_name] || handleNotImplemented
  return handler(indicator, supabase)
}

// ── Public entry: handler (for manual /api/indicator-worker calls) ──

module.exports = async function handler(req, res) {
  // GET /api/indicator-worker?id=<uuid> — manual refresh of a single
  // indicator. POST with x-cron-secret for queued operation.
  if (req.method === 'POST') {
    const secret = req.headers['x-cron-secret']
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorised' })
    }
  }

  const indicatorId = (req.query && req.query.id) || (req.body && req.body.id)
  if (!indicatorId) {
    return res.status(400).json({ error: 'id query param required' })
  }

  const supabase = defaultClient()
  const { data: indicator, error } = await supabase
    .from('nextus_domain_indicators')
    .select('id, domain_id, name, source_name, endpoint_url, refresh_cadence')
    .eq('id', indicatorId)
    .maybeSingle()

  if (error || !indicator) {
    return res.status(404).json({ error: 'indicator not found' })
  }

  const result = await fetchIndicator(indicator, supabase)
  return res.status(200).json({ ok: true, indicator: indicator.name, ...result })
}

module.exports.fetchIndicator = fetchIndicator

// ── Internals ────────────────────────────────────────────────

function defaultClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

function log(msg, data = '') {
  console.log(`[indicator-worker] ${msg}`, data)
}

function logErr(msg, err) {
  console.error(`[indicator-worker] ${msg}`, err)
}

// Write a value row. focusId may be null for planetary indicators.
// The unique index on (indicator_id, coalesce(focus_id, 0-uuid),
// observed_at) handles deduplication of cron retries.
//
// On insert success, flips is_current=false on prior rows for this
// (indicator_id, focus_id) pair so only the new row is current.
async function writeValue(supabase, indicatorId, focusId, payload) {
  const insertRow = {
    indicator_id:     indicatorId,
    focus_id:         focusId || null,
    value_numeric:    payload.value_numeric ?? null,
    value_text:       payload.value_text ?? null,
    observed_at:      payload.observed_at,
    fetched_at:       new Date().toISOString(),
    source_record_id: payload.source_record_id ?? null,
    is_current:       true,
    confidence:       payload.confidence ?? null,
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('nextus_domain_indicator_values')
    .upsert(insertRow, {
      onConflict: 'indicator_id,focus_id,observed_at',
      ignoreDuplicates: false,
    })
    .select()
    .maybeSingle()

  if (insertErr) {
    return { ok: false, error: insertErr }
  }

  // Flip prior is_current for this indicator + focus.
  const focusFilter = focusId ? `eq.${focusId}` : 'is.null'
  const { error: flipErr } = await supabase
    .from('nextus_domain_indicator_values')
    .update({ is_current: false })
    .eq('indicator_id', indicatorId)
    .filter('focus_id', focusFilter.split('.')[0], focusFilter.split('.')[1])
    .neq('id', inserted?.id || '00000000-0000-0000-0000-000000000000')

  if (flipErr) {
    logErr(`is_current flip failed for indicator ${indicatorId}`, flipErr)
  }

  return { ok: true, row: inserted }
}

// ── Handler: not-implemented ─────────────────────────────────

async function handleNotImplemented(indicator) {
  return {
    status: 'not-implemented',
    message: `No fetch handler registered for source "${indicator.source_name}". Indicator catalog row will remain in place; values will fill in once the handler is added.`,
  }
}

// ── Handler: NOAA Global Monitoring Laboratory ────────────────
// Two flavours of GML data based on indicator name:
//   - "Atmospheric CO₂ concentration" → co2_mm_mlo.txt (Mauna Loa monthly)
//   - "Methane concentration"          → ch4_mm_gl.txt (global monthly)
//
// Both are fixed-width text files with a simple header and decimal-year
// columns. We parse the latest non-flagged row.

async function handleNoaaGml(indicator, supabase) {
  const start = Date.now()
  let url = indicator.endpoint_url
  if (!url) {
    return { status: 'failed', message: 'missing endpoint_url' }
  }

  let response
  try {
    response = await fetch(url, { redirect: 'follow' })
  } catch (err) {
    return { status: 'failed', message: `network: ${err.message}` }
  }
  if (!response.ok) {
    return {
      status: 'failed',
      httpStatus: response.status,
      message: `non-2xx from NOAA GML`,
    }
  }
  const text = await response.text()
  const lines = text.split('\n').filter((l) => l && !l.startsWith('#'))

  // Find the last data row with a sensible value column. Both files use
  // whitespace-separated columns; the monthly average appears at column 3
  // for CO₂ (year, month, decimal date, average) and column 3 for CH₄
  // (year, month, decimal_date, average). We treat -999 / -99.99 as
  // missing.
  let latest = null
  for (let i = lines.length - 1; i >= 0; i--) {
    const cols = lines[i].trim().split(/\s+/).map(Number)
    if (cols.length < 4 || Number.isNaN(cols[0])) continue
    const year = cols[0]
    const month = cols[1]
    const value = cols[3] // average column
    if (!Number.isFinite(value) || value < 0) continue
    latest = { year, month, value }
    break
  }

  if (!latest) {
    return { status: 'failed', message: 'no data rows parsed from NOAA GML' }
  }

  // Build observed_at as the first day of (year, month) UTC.
  const observedAt = new Date(Date.UTC(latest.year, latest.month - 1, 1)).toISOString()

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    latest.value,
    observed_at:      observedAt,
    source_record_id: `noaa-gml-${latest.year}-${String(latest.month).padStart(2, '0')}`,
    confidence:       'high',
  })

  if (!result.ok) {
    return {
      status: 'failed',
      httpStatus: response.status,
      message: `write failed: ${result.error?.message || 'unknown'}`,
    }
  }

  return {
    status: 'ok',
    httpStatus: response.status,
    rowsWritten: 1,
    message: `${latest.value} (observed ${latest.year}-${String(latest.month).padStart(2, '0')}) in ${Date.now() - start}ms`,
  }
}

// ── Handler: USGS Earthquakes ────────────────────────────────
// FDSN event API. We pull the past 30 days of M4.5+ events globally and
// store the count as today's observation. Planetary indicator, focus_id
// stays null.

async function handleUsgsQuakes(indicator, supabase) {
  const start = Date.now()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const params = new URLSearchParams({
    format: 'geojson',
    starttime: thirtyDaysAgo.toISOString().slice(0, 10),
    endtime:   now.toISOString().slice(0, 10),
    minmagnitude: '4.5',
  })
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`

  let response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    })
  } catch (err) {
    return { status: 'failed', message: `network: ${err.message}` }
  }
  if (!response.ok) {
    return {
      status: 'failed',
      httpStatus: response.status,
      message: 'non-2xx from USGS',
    }
  }
  let payload
  try {
    payload = await response.json()
  } catch (err) {
    return { status: 'failed', message: `json parse: ${err.message}` }
  }

  const count = (payload && payload.metadata && typeof payload.metadata.count === 'number')
    ? payload.metadata.count
    : Array.isArray(payload?.features) ? payload.features.length : null

  if (count == null) {
    return { status: 'failed', message: 'unexpected USGS payload shape' }
  }

  const observedAt = now.toISOString()
  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    count,
    observed_at:      observedAt,
    source_record_id: `usgs-${now.toISOString().slice(0, 10)}`,
    confidence:       'high',
  })

  if (!result.ok) {
    return {
      status: 'failed',
      httpStatus: response.status,
      message: `write failed: ${result.error?.message || 'unknown'}`,
    }
  }

  return {
    status: 'ok',
    httpStatus: response.status,
    rowsWritten: 1,
    message: `${count} M4.5+ events past 30 days in ${Date.now() - start}ms`,
  }
}

// ── Handler: OpenAQ ──────────────────────────────────────────
// OpenAQ v3 measurements for PM2.5. At planetary scope (focus_id null),
// we record a global mean of recent station readings. Per-Focus values
// require coordinates — handled in a future per-Focus extension.
//
// OpenAQ v3 may require an API key for high-volume use. We pass
// process.env.OPENAQ_API_KEY when set; the public endpoint accepts
// limited unauthenticated queries.

async function handleOpenAq(indicator, supabase) {
  const start = Date.now()
  const limit = 100
  const params = new URLSearchParams({
    parameter: 'pm25',
    limit: String(limit),
    sort: 'desc',
    order_by: 'datetime',
  })
  const url = `https://api.openaq.org/v3/measurements?${params.toString()}`

  const headers = { Accept: 'application/json' }
  if (process.env.OPENAQ_API_KEY) {
    headers['X-API-Key'] = process.env.OPENAQ_API_KEY
  }

  let response
  try {
    response = await fetch(url, { headers, redirect: 'follow' })
  } catch (err) {
    return { status: 'failed', message: `network: ${err.message}` }
  }
  if (!response.ok) {
    return {
      status: 'failed',
      httpStatus: response.status,
      message: 'non-2xx from OpenAQ',
    }
  }
  let payload
  try {
    payload = await response.json()
  } catch (err) {
    return { status: 'failed', message: `json parse: ${err.message}` }
  }

  const results = Array.isArray(payload?.results) ? payload.results : []
  if (results.length === 0) {
    return { status: 'failed', message: 'OpenAQ returned no results' }
  }

  const numericValues = results
    .map((r) => Number(r.value))
    .filter((v) => Number.isFinite(v) && v >= 0 && v < 1000)

  if (numericValues.length === 0) {
    return { status: 'failed', message: 'no usable PM2.5 values in OpenAQ response' }
  }

  const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
  const observedAt = new Date().toISOString()

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    Number(mean.toFixed(2)),
    observed_at:      observedAt,
    source_record_id: `openaq-${observedAt.slice(0, 10)}`,
    confidence:       'medium',
  })

  if (!result.ok) {
    return {
      status: 'failed',
      httpStatus: response.status,
      message: `write failed: ${result.error?.message || 'unknown'}`,
    }
  }

  return {
    status: 'ok',
    httpStatus: response.status,
    rowsWritten: 1,
    message: `mean ${mean.toFixed(2)} µg/m³ across ${numericValues.length} stations in ${Date.now() - start}ms`,
  }
}
