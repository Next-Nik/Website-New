// ── NextUs Daily Snapshot Cron ──────────────────────────────
// Computes the seven civilisational domain scores plus the
// full per-indicator breakdown and writes them to
// nextus_domain_scores_daily.
//
// Schedule: 03:30 UTC daily via Vercel Cron (vercel.json). Runs
// 30 minutes after indicator-cron so new values from the day are
// captured.
//
// Also callable manually:
//   POST /api/cron/compute-daily-snapshot
//   header: x-cron-secret = CRON_SECRET env var
// to force an immediate refresh (e.g. seeding the first row,
// or refreshing after a manual indicator update).
//
// Output table shape:
//   snapshot_date    date primary key (today, in UTC)
//   vision           numeric (0..10 or null)
//   human            numeric
//   nature           numeric
//   finance          numeric
//   tech             numeric
//   legacy           numeric
//   society          numeric
//   details_json     jsonb  — { [wheelKey]: { contributing, total, fresh, scored } }
//   computed_at      timestamptz
//
// Re-running for the same day UPSERTs (replaces that row).

const { createClient } = require('@supabase/supabase-js')

let _supabase = null
function supabaseClient() {
  if (_supabase) return _supabase
  _supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  return _supabase
}

// ── Constants mirrored from src/app/hooks/useDomainIndicators.js ───
const CIV_DOMAIN_TO_WHEEL_KEY = {
  'human-being':     'human',
  'society':         'society',
  'nature':          'nature',
  'technology':      'tech',
  'finance-economy': 'finance',
  'legacy':          'legacy',
  'vision':          'vision',
}
const ALL_CIV_DOMAINS = Object.keys(CIV_DOMAIN_TO_WHEEL_KEY)

const FRESH_WINDOW_DAYS = {
  daily:   3,
  weekly:  10,
  monthly: 60,
  annual:  548,
  'event-driven': 365,
}

// ── Scoring (mirrored from src/app/util/domainScore.js) ────────────

function computeIndicatorScore(indicator) {
  if (!indicator) return null
  if (indicator.is_fresh === false) return null
  const raw = indicator?.value?.numeric
  if (raw == null) return null
  const target = Number(indicator.target_value)
  const floor  = Number(indicator.floor_value)
  if (!Number.isFinite(target) || !Number.isFinite(floor)) return null
  const dir = indicator.direction_preferred
  let normalised
  if (dir === 'up') {
    if (target === floor) return null
    normalised = (raw - floor) / (target - floor)
  } else if (dir === 'down') {
    if (floor === target) return null
    normalised = (floor - raw) / (floor - target)
  } else {
    return null
  }
  normalised = Math.max(0, Math.min(1, normalised))
  return normalised * 10
}

function computeDomainScore(headlineIndicators) {
  const total = Array.isArray(headlineIndicators) ? headlineIndicators.length : 0
  if (total === 0) return { score: null, contributing: 0, total: 0, fresh: 0, scored: [] }

  const scored = []
  let fresh = 0
  for (const ind of headlineIndicators) {
    if (ind?.is_fresh) fresh++
    const s = computeIndicatorScore(ind)
    if (s != null) {
      scored.push({
        name: ind.name,
        score: s,
        weight: Number(ind.rollup_weight ?? 1.0),
      })
    }
  }

  if (scored.length === 0) {
    return { score: null, contributing: 0, total, fresh, scored: [] }
  }

  // Coverage gate: at least half of headline indicators must contribute.
  if (scored.length * 2 < total) {
    return { score: null, contributing: scored.length, total, fresh, scored }
  }

  let weightSum = 0
  let weightedSum = 0
  for (const s of scored) {
    weightSum += s.weight
    weightedSum += s.score * s.weight
  }
  const score = weightSum > 0 ? weightedSum / weightSum : null
  return { score, contributing: scored.length, total, fresh, scored }
}

// ── Indicator shaper (mirrored from useDomainIndicators.js) ─────────

function shapeIndicator(indicator, value) {
  const cadence = indicator.refresh_cadence
  const windowDays = FRESH_WINDOW_DAYS[cadence] ?? 30
  let isFresh = null
  if (value && value.fetched_at) {
    const fetched = new Date(value.fetched_at)
    const daysSinceFetch = Math.floor(
      (Date.now() - fetched.getTime()) / (24 * 60 * 60 * 1000),
    )
    isFresh = daysSinceFetch <= windowDays
  }
  return {
    ...indicator,
    value: value
      ? { numeric: value.value_numeric, text: value.value_text,
          observed_at: value.observed_at, fetched_at: value.fetched_at,
          confidence: value.confidence }
      : null,
    is_fresh: isFresh,
  }
}

// ── Helpers ─────────────────────────────────────────────────

function log(msg, data = '') {
  console.log(`[snapshot-cron] ${msg}`, data)
}

function logErr(msg, err) {
  console.error(`[snapshot-cron] ${msg}`, err)
}

function todayUTC() {
  const d = new Date()
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ── Handler ─────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  // Security: POST requires CRON_SECRET. GET is for Vercel Cron itself,
  // which Vercel signs automatically — no extra check needed.
  if (req.method === 'POST') {
    const secret = req.headers['x-cron-secret']
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorised' })
    }
  }

  const startedAt = Date.now()
  const snapshotDate = todayUTC()
  log(`Starting snapshot for ${snapshotDate}`)

  try {
    // 1. Catalog of all headline indicators across all 7 civ domains.
    const { data: catalog, error: catalogErr } = await supabaseClient()
      .from('nextus_domain_indicators')
      .select(
        'id, domain_id, subdomain_slug, lens_slugs, name, unit, tier, ' +
        'source_name, source_url, native_resolution, refresh_cadence, ' +
        'direction_preferred, methodology_note, headline_order, ' +
        'tagged_principles, target_value, floor_value, rollup_weight'
      )
      .in('domain_id', ALL_CIV_DOMAINS)
      .eq('status', 'active')
      .eq('is_headline', true)
      .order('headline_order', { ascending: true })

    if (catalogErr) throw catalogErr
    log(`Loaded ${catalog?.length || 0} headline indicators`)

    // 2. Bulk fetch current planetary values for the whole catalog.
    const indicatorIds = (catalog || []).map(ind => ind.id)
    const valuesByIndicatorId = {}
    if (indicatorIds.length > 0) {
      const { data: values, error: valuesErr } = await supabaseClient()
        .from('nextus_indicator_values_resolved')
        .select(
          'queried_indicator_id, actual_indicator_id, focus_id, ' +
          'value_numeric, value_text, observed_at, fetched_at, ' +
          'confidence, is_current, via_alias'
        )
        .in('queried_indicator_id', indicatorIds)
        .is('focus_id', null)
        .eq('is_current', true)
      if (valuesErr) throw valuesErr
      for (const v of (values || [])) {
        valuesByIndicatorId[v.queried_indicator_id] = v
      }
      log(`Loaded ${values?.length || 0} current values`)
    }

    // 3. Shape indicators + group by domain.
    const byDomain = {}
    for (const ind of (catalog || [])) {
      const value = valuesByIndicatorId[ind.id] || null
      const shaped = shapeIndicator(ind, value)
      if (!byDomain[ind.domain_id]) byDomain[ind.domain_id] = []
      byDomain[ind.domain_id].push(shaped)
    }

    // 4. Compute per-domain rollups.
    const scoresRow = { snapshot_date: snapshotDate }
    const details = {}
    for (const d of ALL_CIV_DOMAINS) {
      const key = CIV_DOMAIN_TO_WHEEL_KEY[d]
      const list = byDomain[d] || []
      const result = computeDomainScore(list)
      scoresRow[key] = result.score
      details[key] = result
    }
    scoresRow.details_json = details
    scoresRow.computed_at = new Date().toISOString()

    // 5. Upsert the day's row.
    const { error: upsertErr } = await supabaseClient()
      .from('nextus_domain_scores_daily')
      .upsert(scoresRow, { onConflict: 'snapshot_date' })
    if (upsertErr) throw upsertErr

    const elapsedMs = Date.now() - startedAt
    log(`Done in ${elapsedMs}ms`)
    return res.status(200).json({
      ok: true,
      snapshot_date: snapshotDate,
      elapsed_ms: elapsedMs,
      scores: {
        vision:  scoresRow.vision,
        human:   scoresRow.human,
        nature:  scoresRow.nature,
        finance: scoresRow.finance,
        tech:    scoresRow.tech,
        legacy:  scoresRow.legacy,
        society: scoresRow.society,
      },
    })
  } catch (err) {
    logErr('snapshot computation failed', err)
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
    })
  }
}
