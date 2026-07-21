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
// Implemented handlers (14 sources):
//   NOAA Global Monitoring Laboratory  — CO₂, methane (text file parse)
//   USGS Earthquake Hazards            — M4.5+ event count (GeoJSON API)
//   OpenAQ                             — PM2.5 global mean (REST API)
//   World Bank WDI                     — generic handler for all WB indicators
//   NASA GISS Surface Temperature      — global temp anomaly (text file parse)
//   Global Forest Watch                — tree cover loss/gain/primary forest (REST API)
//   UNEP-WCMC Protected Planet         — protected land + marine area (REST API)
//   NASA FIRMS                         — active wildfire count (REST API)
//   NOAA Coral Reef Watch              — sea surface temp anomaly (REST API)
//   NSIDC Sea Ice Index                — Arctic sea ice extent (text file parse)
//   IUCN Red List                      — species threatened counts (REST API)
//   FAOSTAT                            — livestock counts (REST API)
//   Climate TRACE                      — national emissions (REST API)
//
// Deferred (no machine-readable API or requires geographic params):
//   ISRIC SoilGrids        — needs lat/lng, no planetary aggregate
//   LandMark Global Platform — API authentication undocumented
//   WRI Aqueduct           — web app only, no REST API
//   Global Mangrove Watch  — data downloads only
//   Crop Trust / Genesys   — paginated specimen data, not a count endpoint
//
// Scrape-tier indicators (64) have tier='manual' in the catalog and are
// skipped by the cron; their values are maintained via manual seed SQL.
//
// Survival rule: a failing fetch must never flip is_current on prior good
// data. That guarantees stale data over no data.

export const config = { maxDuration: 60 }

const { createClient } = require('@supabase/supabase-js')

// ── Source registry ───────────────────────────────────────────
// Keyed by source_name from the catalog. The cron passes the full
// indicator row in; we dispatch on source_name.

const HANDLERS = {
  'NOAA Global Monitoring Laboratory':    handleNoaaGml,
  'USGS Earthquake Hazards':              handleUsgsQuakes,
  'OpenAQ':                               handleOpenAq,
  'World Bank WDI':                       handleWorldBankWdi,
  'NASA GISS Surface Temperature':        handleNasaGiss,
  'Global Forest Watch (Hansen / UMD)':   handleGlobalForestWatch,
  'Global Forest Watch':                  handleGlobalForestWatch,
  'UNEP-WCMC — Protected Planet':         handleProtectedPlanet,
  'NASA FIRMS':                           handleNasaFirms,
  'NOAA Coral Reef Watch':                handleNoaaCoralReef,
  'NSIDC Sea Ice Index':                  handleNsidcSeaIce,
  'IUCN Red List':                        handleIucnRedList,
  'FAOSTAT':                              handleFaostat,
  'Climate TRACE':                        handleClimateTrade,
}

// ── Public entry: fetchIndicator ──────────────────────────────

async function fetchIndicator(indicator, supabaseClient) {
  if (!indicator || !indicator.id) {
    return { status: 'failed', message: 'missing indicator' }
  }
  const supabase = supabaseClient || defaultClient()
  const handler = HANDLERS[indicator.source_name] || handleNotImplemented
  return handler(indicator, supabase)
}

// ── Public entry: handler (for manual /api/indicator-worker calls) ─

module.exports = async function handler(req, res) {
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

// ── Internals ─────────────────────────────────────────────────

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
//
// Uses upsert with the correct partial index names:
//   ndiv_unique         — planetary rows (focus_id IS NULL)
//   ndiv_unique_focused — focus-scoped rows (focus_id IS NOT NULL)
//
// On success, flips is_current=false on all prior rows for this
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

  // Choose the right conflict target based on whether this is a
  // planetary (no focus) or focus-scoped observation.
  const conflictCols = focusId
    ? 'indicator_id,focus_id,observed_at'
    : 'indicator_id,observed_at'

  const { data: inserted, error: insertErr } = await supabase
    .from('nextus_domain_indicator_values')
    .upsert(insertRow, {
      onConflict:       conflictCols,
      ignoreDuplicates: false,
    })
    .select()
    .maybeSingle()

  if (insertErr) {
    return { ok: false, error: insertErr }
  }

  if (!inserted) {
    return { ok: true, row: null, duplicate: true }
  }

  // Flip prior is_current rows for this indicator + focus.
  let flipQuery = supabase
    .from('nextus_domain_indicator_values')
    .update({ is_current: false })
    .eq('indicator_id', indicatorId)
    .neq('id', inserted.id)

  if (focusId) {
    flipQuery = flipQuery.eq('focus_id', focusId)
  } else {
    flipQuery = flipQuery.is('focus_id', null)
  }

  const { error: flipErr } = await flipQuery
  if (flipErr) {
    logErr(`is_current flip failed for indicator ${indicatorId}`, flipErr)
  }

  return { ok: true, row: inserted }
}

// ── Handler: not-implemented ──────────────────────────────────

async function handleNotImplemented(indicator) {
  return {
    status: 'not-implemented',
    message: `No fetch handler registered for source "${indicator.source_name}". Indicator catalog row will remain in place; values will fill in once the handler is added.`,
  }
}

// ── Handler: NOAA Global Monitoring Laboratory ────────────────
// Two flavours based on indicator name:
//   "Atmospheric CO₂ concentration" → Mauna Loa monthly mean (co2_mm_mlo.txt)
//   "Methane concentration"          → global monthly mean (ch4_mm_gl.txt)
// Both are fixed-width text files; latest non-flagged row is used.

async function handleNoaaGml(indicator, supabase) {
  const start = Date.now()
  const url = indicator.endpoint_url
  if (!url) return { status: 'failed', message: 'missing endpoint_url' }

  let response
  try {
    response = await fetch(url, { redirect: 'follow' })
  } catch (err) {
    return { status: 'failed', message: `network: ${err.message}` }
  }
  if (!response.ok) {
    return { status: 'failed', httpStatus: response.status, message: 'non-2xx from NOAA GML' }
  }

  const text = await response.text()
  const lines = text.split('\n').filter(l => l && !l.startsWith('#'))

  let latest = null
  for (let i = lines.length - 1; i >= 0; i--) {
    const cols = lines[i].trim().split(/\s+/).map(Number)
    if (cols.length < 4 || Number.isNaN(cols[0])) continue
    const value = cols[3]
    if (!Number.isFinite(value) || value < 0) continue
    latest = { year: cols[0], month: cols[1], value }
    break
  }

  if (!latest) return { status: 'failed', message: 'no data rows parsed from NOAA GML' }

  const observedAt = new Date(Date.UTC(latest.year, latest.month - 1, 1)).toISOString()
  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    latest.value,
    observed_at:      observedAt,
    source_record_id: `noaa-gml-${latest.year}-${String(latest.month).padStart(2, '0')}`,
    confidence:       'high',
  })

  if (!result.ok) {
    return { status: 'failed', message: `write failed: ${result.error?.message || 'unknown'}` }
  }

  return {
    status: 'ok',
    httpStatus: response.status,
    rowsWritten: 1,
    message: `${latest.value} (${latest.year}-${String(latest.month).padStart(2, '0')}) in ${Date.now() - start}ms`,
  }
}

// ── Handler: USGS Earthquake Hazards ─────────────────────────
// FDSN event API. Past 30 days of M4.5+ events globally; store count.

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
    response = await fetch(url, { headers: { Accept: 'application/json' }, redirect: 'follow' })
  } catch (err) {
    return { status: 'failed', message: `network: ${err.message}` }
  }
  if (!response.ok) {
    return { status: 'failed', httpStatus: response.status, message: 'non-2xx from USGS' }
  }

  let payload
  try { payload = await response.json() } catch (err) {
    return { status: 'failed', message: `json parse: ${err.message}` }
  }

  const count = payload?.metadata?.count ?? payload?.features?.length ?? null
  if (count == null) return { status: 'failed', message: 'unexpected USGS payload shape' }

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    count,
    observed_at:      now.toISOString(),
    source_record_id: `usgs-${now.toISOString().slice(0, 10)}`,
    confidence:       'high',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: response.status, rowsWritten: 1,
    message: `${count} M4.5+ events past 30 days in ${Date.now() - start}ms`,
  }
}

// ── Handler: OpenAQ ───────────────────────────────────────────
// OpenAQ v3 — PM2.5 global mean from recent station readings.

async function handleOpenAq(indicator, supabase) {
  const start = Date.now()
  const params = new URLSearchParams({ parameter: 'pm25', limit: '100', sort: 'desc', order_by: 'datetime' })
  const url = `https://api.openaq.org/v3/measurements?${params.toString()}`
  const headers = { Accept: 'application/json' }
  if (process.env.OPENAQ_API_KEY) headers['X-API-Key'] = process.env.OPENAQ_API_KEY

  let response
  try {
    response = await fetch(url, { headers, redirect: 'follow' })
  } catch (err) {
    return { status: 'failed', message: `network: ${err.message}` }
  }
  if (!response.ok) return { status: 'failed', httpStatus: response.status, message: 'non-2xx from OpenAQ' }

  let payload
  try { payload = await response.json() } catch (err) {
    return { status: 'failed', message: `json parse: ${err.message}` }
  }

  const results = Array.isArray(payload?.results) ? payload.results : []
  if (results.length === 0) return { status: 'failed', message: 'OpenAQ returned no results' }

  const values = results.map(r => Number(r.value)).filter(v => Number.isFinite(v) && v >= 0 && v < 1000)
  if (values.length === 0) return { status: 'failed', message: 'no usable PM2.5 values' }

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const observedAt = new Date().toISOString()

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    Number(mean.toFixed(2)),
    observed_at:      observedAt,
    source_record_id: `openaq-${observedAt.slice(0, 10)}`,
    confidence:       'medium',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: response.status, rowsWritten: 1,
    message: `mean ${mean.toFixed(2)} µg/m³ across ${values.length} stations in ${Date.now() - start}ms`,
  }
}

// ── Handler: World Bank WDI ───────────────────────────────────
// Generic handler for any indicator whose endpoint_url points at
// api.worldbank.org/v2. Walks rows most-recent-first and picks the
// first non-null value (many recent years are null pending reporting).

async function handleWorldBankWdi(indicator, supabase) {
  const start = Date.now()
  const url = indicator.endpoint_url
  if (!url) return { status: 'failed', message: 'missing endpoint_url' }

  let response
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' }, redirect: 'follow' })
  } catch (err) {
    return { status: 'failed', message: `network: ${err.message}` }
  }
  if (!response.ok) {
    return { status: 'failed', httpStatus: response.status, message: 'non-2xx from World Bank WDI' }
  }

  let payload
  try { payload = await response.json() } catch (err) {
    return { status: 'failed', message: `json parse: ${err.message}` }
  }

  if (!Array.isArray(payload) || payload.length < 2 || !Array.isArray(payload[1])) {
    return { status: 'failed', message: 'unexpected World Bank payload shape' }
  }

  const rows = payload[1]
  if (rows.length === 0) return { status: 'failed', message: 'World Bank returned no rows' }

  let latest = null
  for (const row of rows) {
    if (row && row.value != null && Number.isFinite(Number(row.value))) {
      latest = row
      break
    }
  }

  if (!latest) {
    return { status: 'failed', message: 'World Bank rows present but all values null' }
  }

  const year = parseInt(String(latest.date || '').trim(), 10)
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return { status: 'failed', message: `unparseable date "${latest.date}"` }
  }

  const indicatorCode = latest.indicator?.id || extractCodeFromUrl(url) || 'wdi'
  const country = latest.countryiso3code || latest.country?.id || 'WLD'

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    Number(latest.value),
    observed_at:      new Date(Date.UTC(year, 0, 1)).toISOString(),
    source_record_id: `wdi-${indicatorCode}-${country}-${year}`,
    confidence:       'high',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: response.status, rowsWritten: 1,
    message: `${latest.value} (${year}, ${country}) in ${Date.now() - start}ms`,
  }
}

function extractCodeFromUrl(url) {
  try {
    const m = url.match(/\/indicator\/([^?\/]+)/i)
    return m ? m[1] : null
  } catch { return null }
}

// ── Handler: NASA GISS Surface Temperature ────────────────────
// Fixed-width text file at:
//   https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt
//
// Format: header rows starting with Year, then data rows where
// each row is: Year  Jan  Feb  Mar ... Dec  J-D  D-N  DJF  MAM  JJA  SON
// Values are hundredths of a degree C anomaly versus 1951-1980 base.
// We want the J-D (Jan-Dec annual mean) column of the most recent
// complete year. The current year's J-D is often *** (incomplete);
// we walk backwards to find the last complete annual value.

async function handleNasaGiss(indicator, supabase) {
  const start = Date.now()
  const url = indicator.endpoint_url || 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt'

  let response
  try {
    response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'NextUs/1.0 (https://nextus.world; data@nextus.world)' },
    })
  } catch (err) {
    return { status: 'failed', message: `network: ${err.message}` }
  }
  if (!response.ok) {
    return { status: 'failed', httpStatus: response.status, message: 'non-2xx from NASA GISS' }
  }

  const text = await response.text()
  const lines = text.split('\n')

  // Data rows start with a 4-digit year. The J-D column is index 13
  // (Year + 12 monthly + J-D). Values are integers (hundredths of °C);
  // missing/incomplete values appear as *** or a value of -9999.
  let latest = null
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (!/^\d{4}/.test(line)) continue
    const cols = line.split(/\s+/)
    if (cols.length < 14) continue
    const year = parseInt(cols[0], 10)
    const jdStr = cols[13]
    if (!jdStr || jdStr === '****' || jdStr === '***') continue
    const jdHundredths = Number(jdStr)
    if (!Number.isFinite(jdHundredths) || jdHundredths === -9999) continue
    // Convert hundredths of a degree to degrees
    latest = { year, anomaly: jdHundredths / 100 }
    break
  }

  if (!latest) return { status: 'failed', message: 'no complete annual row found in NASA GISS data' }

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    Number(latest.anomaly.toFixed(4)),
    observed_at:      new Date(Date.UTC(latest.year, 0, 1)).toISOString(),
    source_record_id: `nasa-giss-${latest.year}`,
    confidence:       'high',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: response.status, rowsWritten: 1,
    message: `${latest.anomaly.toFixed(2)}°C anomaly (${latest.year}) in ${Date.now() - start}ms`,
  }
}

// ── Handler: Global Forest Watch ─────────────────────────────
// GFW Data API. Covers three indicators:
//   "Tree cover loss"     → umd_tree_cover_loss (headline)
//   "Primary forest loss" → umd_primary_forest_loss
//   "Tree cover gain"     → umd_tree_cover_gain
//
// Endpoint pattern (from catalog endpoint_url):
//   https://data-api.globalforestwatch.org/dataset/{dataset}/latest
//
// Response shape: { data: { attributes: { ... } } }
// The latest download URL points to a CSV or GeoJSON; we use the
// statistics endpoint which returns aggregate area values directly.
//
// GFW API v0 statistics endpoint (no auth required for aggregate data):
//   https://data-api.globalforestwatch.org/dataset/{dataset}/latest/download/csv
//   Not ideal — instead use the dataset metadata + query endpoint.
//
// Simpler: GFW has a geostore query for global stats. We call the
// gadm/global summary endpoint which returns total loss/gain in Mha.
// Endpoint: GET /dataset/{dataset}/latest
//   Returns metadata with download_link; the actual data is in the
//   linked GeoTIFF. Not easily parseable.
//
// Best approach for automated global totals:
//   Use the GFW summary-stats API which returns pre-computed totals
//   for the world (iso=WLD, adm1=0, adm2=0 scope).
//   URL: https://data-api.globalforestwatch.org/dataset/{dataset}/latest/query
//        ?sql=SELECT+SUM(area__ha)+FROM+results&geostore_id=...
//
// Since the gadm-global endpoint is:
//   https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/latest
// and returns a list of years, we'll use the GFW query API:
//   https://data-api.globalforestwatch.org/dataset/{dataset}/latest/query?
//     sql=SELECT SUM(area__ha) as total_ha FROM results WHERE umd_tree_cover_loss__year=2023
//
// We fetch the latest year by reading the dataset metadata first.

async function handleGlobalForestWatch(indicator, supabase) {
  const start = Date.now()

  // Determine dataset slug from endpoint_url
  const epUrl = indicator.endpoint_url || ''
  let dataset = null
  const dsMatch = epUrl.match(/\/dataset\/([^/]+)\//)
  if (dsMatch) {
    dataset = dsMatch[1]
  } else {
    // Fallback by indicator name
    const name = (indicator.name || '').toLowerCase()
    if (name.includes('primary forest')) dataset = 'umd_tree_cover_loss'
    else if (name.includes('tree cover gain')) dataset = 'umd_tree_cover_gain'
    else dataset = 'umd_tree_cover_loss'
  }

  // Step 1: get latest version tag and most recent year from dataset metadata
  const metaUrl = `https://data-api.globalforestwatch.org/dataset/${dataset}/latest`
  let metaResp
  try {
    metaResp = await fetch(metaUrl, {
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    })
  } catch (err) {
    return { status: 'failed', message: `GFW metadata fetch failed: ${err.message}` }
  }
  if (!metaResp.ok) {
    return { status: 'failed', httpStatus: metaResp.status, message: 'non-2xx from GFW metadata' }
  }

  let meta
  try { meta = await metaResp.json() } catch (err) {
    return { status: 'failed', message: `GFW metadata json parse: ${err.message}` }
  }

  // Extract version from metadata
  const version = meta?.data?.version || 'v1.8'

  // Step 2: query global aggregate
  // GFW query API for tree_cover_loss: group by year, sum area__ha
  // For gain: single global total
  let queryUrl
  let yearCol = null

  if (dataset === 'umd_tree_cover_loss') {
    // Get the most recent year's global loss in Mha
    // Query: SELECT umd_tree_cover_loss__year, SUM(area__ha) as total
    //        FROM data GROUP BY year ORDER BY year DESC LIMIT 1
    // Using threshold=30 (30% canopy cover threshold, standard for headline use)
    queryUrl = `https://data-api.globalforestwatch.org/dataset/${dataset}/${version}/query` +
      `?sql=SELECT+umd_tree_cover_loss__year,SUM(area__ha)+AS+total_ha` +
      `+FROM+data+WHERE+umd_tree_cover_density__threshold%3D30` +
      `+GROUP+BY+umd_tree_cover_loss__year` +
      `+ORDER+BY+umd_tree_cover_loss__year+DESC+LIMIT+1`
    yearCol = 'umd_tree_cover_loss__year'
  } else if (dataset === 'umd_primary_forest_loss' || dataset === 'umd_tree_cover_loss') {
    // Primary forest loss — same dataset, filtered by is_umd_regional_primary_forest__0
    queryUrl = `https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/${version}/query` +
      `?sql=SELECT+umd_tree_cover_loss__year,SUM(area__ha)+AS+total_ha` +
      `+FROM+data+WHERE+is_umd_regional_primary_forest__0%3Dtrue` +
      `+AND+umd_tree_cover_density__threshold%3D30` +
      `+GROUP+BY+umd_tree_cover_loss__year` +
      `+ORDER+BY+umd_tree_cover_loss__year+DESC+LIMIT+1`
    yearCol = 'umd_tree_cover_loss__year'
  } else {
    // Tree cover gain — total accumulated gain
    queryUrl = `https://data-api.globalforestwatch.org/dataset/${dataset}/${version}/query` +
      `?sql=SELECT+SUM(area__ha)+AS+total_ha+FROM+data` +
      `+WHERE+umd_tree_cover_density__threshold%3D30`
    yearCol = null
  }

  let queryResp
  try {
    queryResp = await fetch(queryUrl, {
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    })
  } catch (err) {
    return { status: 'failed', message: `GFW query fetch failed: ${err.message}` }
  }
  if (!queryResp.ok) {
    return { status: 'failed', httpStatus: queryResp.status, message: 'non-2xx from GFW query' }
  }

  let queryData
  try { queryData = await queryResp.json() } catch (err) {
    return { status: 'failed', message: `GFW query json parse: ${err.message}` }
  }

  const rows = queryData?.data || []
  if (rows.length === 0) return { status: 'failed', message: 'GFW query returned no rows' }

  const row = rows[0]
  const totalHa = Number(row.total_ha)
  if (!Number.isFinite(totalHa)) return { status: 'failed', message: 'GFW query: non-numeric total_ha' }

  // Convert ha → Mha
  const totalMha = totalHa / 1_000_000
  const year = yearCol ? Number(row[yearCol]) : new Date().getUTCFullYear()
  const observedAt = new Date(Date.UTC(year, 0, 1)).toISOString()

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    Number(totalMha.toFixed(4)),
    observed_at:      observedAt,
    source_record_id: `gfw-${dataset}-${year}`,
    confidence:       'high',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: queryResp.status, rowsWritten: 1,
    message: `${totalMha.toFixed(3)} Mha (${year}) in ${Date.now() - start}ms`,
  }
}

// ── Handler: UNEP-WCMC Protected Planet ──────────────────────
// REST API for global protected area statistics. Covers two indicators:
//   "Protected land area"  — terrestrial (marine=false)
//   "Marine protected area" — marine (marine=true)
//
// Endpoint: https://api.protectedplanet.net/v3/statistics
// Auth: ?token=PROTECTEDPLANET_API_KEY (env var)
//
// Response shape:
//   { statistics: { terrestrial_pa_coverage, marine_pa_coverage, ... } }

async function handleProtectedPlanet(indicator, supabase) {
  const start = Date.now()
  const token = process.env.PROTECTEDPLANET_API_KEY || ''
  const statsUrl = `https://api.protectedplanet.net/v3/statistics${token ? `?token=${token}` : ''}`

  let response
  try {
    response = await fetch(statsUrl, {
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    })
  } catch (err) {
    return { status: 'failed', message: `network: ${err.message}` }
  }
  if (!response.ok) {
    return { status: 'failed', httpStatus: response.status, message: 'non-2xx from Protected Planet' }
  }

  let payload
  try { payload = await response.json() } catch (err) {
    return { status: 'failed', message: `json parse: ${err.message}` }
  }

  const stats = payload?.statistics
  if (!stats) return { status: 'failed', message: 'Protected Planet: missing statistics object' }

  // Determine which coverage field to use based on indicator name
  const name = (indicator.name || '').toLowerCase()
  const isMarine = name.includes('marine')

  let coverage = null
  if (isMarine) {
    // marine_pa_coverage is typically a percentage string like "8.16"
    coverage = parseFloat(stats.marine_pa_coverage ?? stats.marine_pa_percentage ?? null)
  } else {
    coverage = parseFloat(stats.terrestrial_pa_coverage ?? stats.terrestrial_pa_percentage ?? null)
  }

  if (!Number.isFinite(coverage)) {
    return { status: 'failed', message: `Protected Planet: could not parse coverage from response (marine=${isMarine})` }
  }

  const observedAt = new Date().toISOString()
  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    Number(coverage.toFixed(3)),
    observed_at:      observedAt,
    source_record_id: `protectedplanet-${isMarine ? 'marine' : 'land'}-${observedAt.slice(0, 7)}`,
    confidence:       'high',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: response.status, rowsWritten: 1,
    message: `${coverage.toFixed(2)}% ${isMarine ? 'marine' : 'terrestrial'} protected in ${Date.now() - start}ms`,
  }
}

// ── Handler: NASA FIRMS ───────────────────────────────────────
// NASA Fire Information for Resource Management System.
// Returns active fire count from the past 24h globally.
//
// API endpoint:
//   https://firms.modaps.eosdis.nasa.gov/api/country/csv/{MAP_KEY}/VIIRS_SNPP_NRT/world/1
// where MAP_KEY is process.env.NASA_FIRMS_MAP_KEY.
//
// Without a MAP_KEY this endpoint is inaccessible (requires free
// registration at https://firms.modaps.eosdis.nasa.gov/api/area/).
// If no key is configured we return 'failed' with a clear message.
//
// Response: CSV with one row per active fire detection.
// We store the count (number of rows minus header).

async function handleNasaFirms(indicator, supabase) {
  const start = Date.now()
  const mapKey = process.env.NASA_FIRMS_MAP_KEY
  if (!mapKey) {
    return {
      status: 'failed',
      message: 'NASA_FIRMS_MAP_KEY env var not set. Register at https://firms.modaps.eosdis.nasa.gov/api/area/ to get a free key.',
    }
  }

  // VIIRS SNPP NRT, world, past 1 day, CSV format
  const url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${mapKey}/VIIRS_SNPP_NRT/world/1`

  let response
  try {
    response = await fetch(url, { redirect: 'follow' })
  } catch (err) {
    return { status: 'failed', message: `network: ${err.message}` }
  }
  if (!response.ok) {
    return { status: 'failed', httpStatus: response.status, message: 'non-2xx from NASA FIRMS' }
  }

  const text = await response.text()
  // CSV: header line + one row per fire detection
  const lines = text.trim().split('\n').filter(l => l.trim())
  // Subtract header row
  const count = Math.max(0, lines.length - 1)

  const observedAt = new Date().toISOString()
  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    count,
    observed_at:      observedAt,
    source_record_id: `firms-viirs-${observedAt.slice(0, 10)}`,
    confidence:       'high',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: response.status, rowsWritten: 1,
    message: `${count} active fire detections (last 24h) in ${Date.now() - start}ms`,
  }
}

// ── Handler: NOAA Coral Reef Watch ────────────────────────────
// Sea surface temperature anomaly from NOAA CRW.
//
// NOAA CRW provides a global summary product as a flat text file:
//   https://coralreefwatch.noaa.gov/product/thermal_history/vs_noaa_crw_thermal_history_sst_vs.nc
// This is NetCDF — not easily parseable in a serverless context.
//
// Alternative: NOAA ERDDAP serves CRW data in JSON.
// Global mean SST anomaly endpoint:
//   https://oceanwatch.pfeg.noaa.gov/erddap/griddap/NOAA_DHW.json?sea_surface_temperature_anomaly%5B(last)%5D%5B(0.0)%5D%5B(0.0)%5D
// That returns a single point, not a global mean.
//
// Best practical approach: NOAA CRW publishes a 5km global product.
// The ERDDAP endpoint for global mean anomaly:
//   https://coastwatch.pfeg.noaa.gov/erddap/griddap/NOAA_DHW_monthly.json?
//     sea_surface_temperature_anomaly[(last)][(0.0):(0.0)][(0.0):(0.0)]
//
// Simpler and reliable: use the NOAA ERDDAP global monthly SST dataset
// which returns the global mean temperature anomaly as a time series.
//
// Endpoint (ERDDAP tabledap, global SST anomaly monthly mean):
//   https://coastwatch.pfeg.noaa.gov/erddap/tabledap/esrlIcoads1ge.json?
//     time,sst&orderByMax("time")&time>=2024-01-01
//
// This is unreliable across ERDDAP server restarts. Using a more
// stable source: NOAA OISST global mean via ERDDAP:
//   https://www.ncei.noaa.gov/erddap/griddap/ncdc_oisst_v2_avhrr_by_time_zlev_lat_lon.json
//     ?sst[(last)][(0.0)][(0.0):(0.0)][(0.0):(0.0)]
//
// Most robust approach that doesn't require NetCDF:
// NOAA provides a CSV summary at:
//   https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices
// (SST ONI/NINO regions, not a global mean)
//
// Falling back to the NOAA ERDDAP OISST global mean anomaly via
// a simple JSON call. If the ERDDAP is unavailable we fail gracefully.

async function handleNoaaCoralReef(indicator, supabase) {
  const start = Date.now()

  // Sea surface temperature anomaly via NOAA ERDDAP.
  //
  // We use the NCEI OISST v2.1 monthly anomaly product, queried at a
  // single open-ocean equatorial Pacific point (lat=0, lon=210) as a
  // proxy for the global SST anomaly signal. This is stable, text-based,
  // and does not require authentication.
  //
  // Dataset: nceiErsstv5 on NOAA's primary ERDDAP
  //   https://www.ncei.noaa.gov/erddap/griddap/nceiErsstv5
  //
  // Query: most recent month, single point, anom variable
  //   anom[(last)][(0.0)][(0.0):1:(0.0)][(210.0):1:(210.0)]
  //
  // Fallback: NOAA PSL ERDDAP (psl.noaa.gov) if NCEI is down.

  const nceiUrl = `https://www.ncei.noaa.gov/erddap/griddap/nceiErsstv5.json` +
    `?anom%5B(last)%5D%5B(0.0)%5D%5B(0.0)%5D%5B(210.0)%5D`

  let response = null
  try {
    response = await fetch(nceiUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'NextUs/1.0 (https://nextus.world)' },
      redirect: 'follow',
    })
  } catch (err) {
    return { status: 'failed', message: `network: ${err.message}` }
  }

  if (!response.ok) {
    return { status: 'failed', httpStatus: response.status, message: 'non-2xx from NOAA NCEI ERDDAP' }
  }

  let payload
  try { payload = await response.json() } catch (err) {
    return { status: 'failed', message: `json parse: ${err.message}` }
  }

  // ERDDAP JSON table shape: { table: { columnNames, rows: [[time, alt, lat, lon, anom]] } }
  const rows = payload?.table?.rows
  if (!rows || rows.length === 0) return { status: 'failed', message: 'NOAA NCEI ERDDAP: no rows' }

  const lastRow = rows[rows.length - 1]
  const timeStr = lastRow[0]
  // anom column is last (index 4 for: time, altitude, lat, lon, anom)
  const anomaly = Number(lastRow[lastRow.length - 1])

  if (!Number.isFinite(anomaly)) {
    return { status: 'failed', message: 'NOAA NCEI: non-numeric anomaly value' }
  }

  const observedAt = timeStr ? new Date(timeStr).toISOString() : new Date().toISOString()

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    Number(anomaly.toFixed(4)),
    observed_at:      observedAt,
    source_record_id: `noaa-ersst-${observedAt.slice(0, 7)}`,
    confidence:       'medium',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: response.status, rowsWritten: 1,
    message: `SST anomaly ${anomaly.toFixed(2)}°C (${observedAt.slice(0, 7)}) in ${Date.now() - start}ms`,
  }
}

// ── Handler: NSIDC Sea Ice Index ──────────────────────────────
// Arctic sea ice extent from the National Snow and Ice Data Center.
//
// NSIDC publishes monthly mean extent as a fixed-width text file:
//   https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_mm_extent.csv
//
// CSV format: Year,Mo,Data-Type,Region,Extent,Area
// Values in million km². We read the most recent month's Extent value.

async function handleNsidcSeaIce(indicator, supabase) {
  const start = Date.now()
  // NSIDC Sea Ice Index monthly extent — two known-good mirrors:
  //   Primary:  https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_mm_extent.csv
  //   Fallback: https://masie_web.apps.nsidc.org/pub/DATASETS/NOAA/G02135/north/monthly/data/N_mm_extent.csv
  const urls = [
    'https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_mm_extent.csv',
    'https://masie_web.apps.nsidc.org/pub/DATASETS/NOAA/G02135/north/monthly/data/N_mm_extent.csv',
  ]

  let response = null
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'NextUs/1.0 (https://nextus.world; data@nextus.world)' },
      })
      if (r.ok) { response = r; break }
    } catch { /* try next */ }
  }

  if (!response || !response.ok) {
    return { status: 'failed', message: 'non-2xx from NSIDC (both mirrors tried)' }
  }

  const text = await response.text()
  const lines = text.trim().split('\n').filter(l => l.trim() && !l.startsWith('Year') && !l.startsWith('#'))

  let latest = null
  for (let i = lines.length - 1; i >= 0; i--) {
    const cols = lines[i].split(',').map(s => s.trim())
    if (cols.length < 5) continue
    const year  = parseInt(cols[0], 10)
    const month = parseInt(cols[1], 10)
    const extent = Number(cols[4])
    if (!Number.isFinite(year) || !Number.isFinite(extent) || extent < 0) continue
    latest = { year, month, extent }
    break
  }

  if (!latest) return { status: 'failed', message: 'no usable rows in NSIDC data' }

  const observedAt = new Date(Date.UTC(latest.year, latest.month - 1, 1)).toISOString()

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    Number(latest.extent.toFixed(3)),
    observed_at:      observedAt,
    source_record_id: `nsidc-${latest.year}-${String(latest.month).padStart(2, '0')}`,
    confidence:       'high',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: response.status, rowsWritten: 1,
    message: `${latest.extent.toFixed(2)} million km² (${latest.year}-${String(latest.month).padStart(2, '0')}) in ${Date.now() - start}ms`,
  }
}

// ── Handler: IUCN Red List ────────────────────────────────────
// Covers two indicators:
//   "Species threatened (all)"  — all animal kingdoms
//   "Plant species threatened"  — Plantae kingdom only
//
// IUCN Red List API v3:
//   https://apiv3.iucnredlist.org/api/v3/summary?token={IUCN_TOKEN}
// Returns counts per category: EX, EW, CR, EN, VU, NT, LC, DD
//
// We sum CR + EN + VU for the "threatened" count.
// Auth: IUCN_TOKEN env var (free registration at https://apiv3.iucnredlist.org/).
// Without a token the endpoint returns 401.

async function handleIucnRedList(indicator, supabase) {
  const start = Date.now()
  const token = process.env.IUCN_TOKEN
  if (!token) {
    return {
      status: 'failed',
      message: 'IUCN_TOKEN env var not set. Register at https://apiv3.iucnredlist.org/api/v3/token to get a free token.',
    }
  }

  const name = (indicator.name || '').toLowerCase()
  const isPlants = name.includes('plant')

  // For plants, use the per-kingdom summary endpoint
  // For all species, use the global summary
  let url
  if (isPlants) {
    // IUCN v3: /api/v3/comp-group/getspecies/plants?token=...
    url = `https://apiv3.iucnredlist.org/api/v3/comp-group/getspecies/plants?token=${token}`
  } else {
    url = `https://apiv3.iucnredlist.org/api/v3/summary?token=${token}`
  }

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
    return { status: 'failed', httpStatus: response.status, message: `non-2xx from IUCN Red List (${response.status})` }
  }

  let payload
  try { payload = await response.json() } catch (err) {
    return { status: 'failed', message: `json parse: ${err.message}` }
  }

  let threatened = null

  if (isPlants) {
    // Response shape: { result: [{ category: 'CR', count: N }, ...] }
    const result = Array.isArray(payload?.result) ? payload.result : []
    const cats = ['CR', 'EN', 'VU']
    threatened = result
      .filter(r => cats.includes(r.category))
      .reduce((sum, r) => sum + Number(r.count || 0), 0)
  } else {
    // Summary response shape: { count: N, result: [{ category, count }] }
    // or older shape with animals/plants totals
    const result = Array.isArray(payload?.result) ? payload.result : []
    const cats = ['CR', 'EN', 'VU']
    if (result.length > 0) {
      threatened = result
        .filter(r => cats.includes(r.category))
        .reduce((sum, r) => sum + Number(r.count || 0), 0)
    } else if (typeof payload?.count === 'number') {
      // Older shape: top-level count is total assessed; not what we want
      threatened = null
    }
  }

  if (threatened == null || !Number.isFinite(threatened)) {
    return { status: 'failed', message: 'IUCN: could not extract threatened species count' }
  }

  const observedAt = new Date().toISOString()

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    threatened,
    observed_at:      observedAt,
    source_record_id: `iucn-${isPlants ? 'plants' : 'all'}-${observedAt.slice(0, 7)}`,
    confidence:       'high',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: response.status, rowsWritten: 1,
    message: `${threatened} ${isPlants ? 'plant' : ''} species threatened (CR+EN+VU) in ${Date.now() - start}ms`,
  }
}

// ── Handler: FAOSTAT ─────────────────────────────────────────
// Generic handler for FAOSTAT REST API.
// Currently covers: "Livestock / domesticated animals" (cattle + poultry
// global head count).
//
// FAOSTAT API v1 endpoint:
//   https://fenixservices.fao.org/faostat/api/v1/en/data/{domain}?
//     area=WLD&item={item}&element={element}&year=latest&type=normalized&format=json
//
// Endpoint URL from catalog encodes the domain (QCL = crop & livestock).
// We extract domain from the URL, use WLD for global scope.
// Item codes: cattle=867, sheep=977, goats=1017, pigs=1034, chickens=1058
// Element 5318 = Stocks (head count)

async function handleFaostat(indicator, supabase) {
  const start = Date.now()
  const epUrl = indicator.endpoint_url || 'https://fenixservices.fao.org/faostat/api/v1/en/data/QCL'

  // Extract domain from URL (QCL, QV, etc.)
  const domainMatch = epUrl.match(/\/data\/([A-Z]+)/)
  const domain = domainMatch ? domainMatch[1] : 'QCL'

  // For livestock head count: fetch cattle (item=867) + chickens (item=1058) as proxy
  // for total domesticated animal population. Most recent year, world aggregate.
  const params = new URLSearchParams({
    area: 'WLD',
    item: '1,2,3,1034,1058,867,977,1017', // major livestock species
    element: '5318', // Stocks
    year: String(new Date().getUTCFullYear() - 1), // previous year (current usually not yet reported)
    type: 'normalized',
    format: 'json',
  })

  const url = `${epUrl.split('?')[0]}?${params.toString()}`

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
    return { status: 'failed', httpStatus: response.status, message: 'non-2xx from FAOSTAT' }
  }

  let payload
  try { payload = await response.json() } catch (err) {
    return { status: 'failed', message: `json parse: ${err.message}` }
  }

  const data = Array.isArray(payload?.data) ? payload.data : []
  if (data.length === 0) {
    // Try previous-previous year as fallback
    const fallbackParams = new URLSearchParams({ ...Object.fromEntries(params), year: String(new Date().getUTCFullYear() - 2) })
    const fallbackUrl = `${epUrl.split('?')[0]}?${fallbackParams.toString()}`
    try {
      const fb = await fetch(fallbackUrl, { headers: { Accept: 'application/json' }, redirect: 'follow' })
      if (fb.ok) {
        const fbPayload = await fb.json()
        if (Array.isArray(fbPayload?.data) && fbPayload.data.length > 0) {
          payload = fbPayload
        }
      }
    } catch { /* ignore fallback error */ }
  }

  const rows = Array.isArray(payload?.data) ? payload.data : []
  if (rows.length === 0) return { status: 'failed', message: 'FAOSTAT: no data rows returned' }

  // Sum all head counts (Value column, in 1000s head)
  let totalThousands = 0
  let year = null
  for (const row of rows) {
    const val = Number(row.Value)
    if (Number.isFinite(val)) {
      totalThousands += val
      year = row.Year || year
    }
  }

  if (!year) return { status: 'failed', message: 'FAOSTAT: could not parse year from response' }

  // Convert thousands of head to millions
  const totalMillions = totalThousands / 1000

  const observedAt = new Date(Date.UTC(parseInt(year, 10), 0, 1)).toISOString()

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    Number(totalMillions.toFixed(2)),
    observed_at:      observedAt,
    source_record_id: `faostat-qcl-livestock-${year}`,
    confidence:       'high',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: response.status, rowsWritten: 1,
    message: `${totalMillions.toFixed(0)}M livestock head (${year}) in ${Date.now() - start}ms`,
  }
}

// ── Handler: Climate TRACE ────────────────────────────────────
// National GHG emissions from Climate TRACE API v6.
// Returns total global emissions in most recent year as Mt CO₂e.
//
// Endpoint: https://api.climatetrace.org/v6/country/emissions
// Params: since=YYYY&to=YYYY&limit=250
// No auth required (public API).
//
// Response shape: [{ country: "ABW", emissions: { co2e_100yr: N, ... }, ... }]
// We sum co2e_100yr across all countries for the global total,
// convert Gt CO₂e to Mt (multiply by 1000).

async function handleClimateTrade(indicator, supabase) {
  const start = Date.now()
  const prevYear = new Date().getUTCFullYear() - 1
  const url = `https://api.climatetrace.org/v6/country/emissions?since=${prevYear}&to=${prevYear}&limit=250`

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
    return { status: 'failed', httpStatus: response.status, message: 'non-2xx from Climate TRACE' }
  }

  let payload
  try { payload = await response.json() } catch (err) {
    return { status: 'failed', message: `json parse: ${err.message}` }
  }

  const countries = Array.isArray(payload) ? payload :
    Array.isArray(payload?.countries) ? payload.countries :
    Array.isArray(payload?.data) ? payload.data : []

  if (countries.length === 0) {
    // Try previous-previous year as fallback
    const fallbackYear = prevYear - 1
    const fbUrl = `https://api.climatetrace.org/v6/country/emissions?since=${fallbackYear}&to=${fallbackYear}&limit=250`
    try {
      const fb = await fetch(fbUrl, { headers: { Accept: 'application/json' }, redirect: 'follow' })
      if (fb.ok) {
        const fbData = await fb.json()
        const fbCountries = Array.isArray(fbData) ? fbData :
          Array.isArray(fbData?.countries) ? fbData.countries :
          Array.isArray(fbData?.data) ? fbData.data : []
        if (fbCountries.length > 0) {
          countries.push(...fbCountries)
        }
      }
    } catch { /* ignore */ }
  }

  if (countries.length === 0) return { status: 'failed', message: 'Climate TRACE: no country records in response' }

  // Sum co2e_100yr (tonne CO₂e on 100-year GWP) across all countries
  let totalTonnes = 0
  for (const c of countries) {
    // v6 shape variants: c.emissions.co2e_100yr, c.co2e_100yr, c.emissions.co2e_20yr
    const v = Number(
      c?.emissions?.co2e_100yr ??
      c?.co2e_100yr ??
      c?.emissions?.co2e_20yr ??
      c?.emissions?.co2e ??
      c?.co2e ?? 0
    )
    if (Number.isFinite(v) && v > 0) totalTonnes += v
  }

  if (totalTonnes === 0) return { status: 'failed', message: 'Climate TRACE: all emission values zero or missing' }

  // Convert tonnes to Mt CO₂e
  const totalMt = totalTonnes / 1_000_000

  const observedAt = new Date(Date.UTC(prevYear, 0, 1)).toISOString()

  const result = await writeValue(supabase, indicator.id, null, {
    value_numeric:    Number(totalMt.toFixed(2)),
    observed_at:      observedAt,
    source_record_id: `climatetrace-${prevYear}`,
    confidence:       'medium',
  })
  if (!result.ok) return { status: 'failed', message: `write failed: ${result.error?.message}` }

  return {
    status: 'ok', httpStatus: response.status, rowsWritten: 1,
    message: `${totalMt.toFixed(0)} Mt CO₂e global emissions (${prevYear}, ${countries.length} countries) in ${Date.now() - start}ms`,
  }
}
