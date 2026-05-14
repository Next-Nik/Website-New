// ─────────────────────────────────────────────────────────────────────────────
// src/beta/hooks/useDomainIndicators.js
//
// Read path for the Module 11 data-sourcing layer.
//
// Three calls:
//   - useDomainIndicators(domainSlug, focusId?) — headline cluster
//   - fetchAllIndicators(domainSlug, focusId?) — full table (lazy-loaded
//     by the "See all indicators" expander)
//   - fetchContributorSignals(domainSlug, focusId?) — Tier 3
//
// All paths apply the inheritance rule from Section 3.3: if a value is
// not present at the requested Focus, walk up the Focus tree until one
// is found. The Focus the value actually came from is returned in
// `measured_at_focus_id` so the UI can name it.
//
// Module 11.8 (B-3 follow-ups): value reads now go through the
// nextus_indicator_values_resolved view, which transparently routes
// alias indicators (e.g. R&D-Vision) to their canonical row's values
// (e.g. R&D-Technology). This means aliases inherit values without
// duplicate fetching.
//
// Module 11.8 also: fetchAllIndicators returns each row with
// `canonical_in_other_domains` and `alias_to_canonical_domain` arrays
// so the UI can show "also read in: [Vision]" hints next to canonical
// rows and "(alias of …)" next to alias rows.
//
// Freshness window: an indicator value is considered "fresh" if its
// fetched_at falls within FRESH_WINDOW_DAYS for daily/weekly cadences,
// 60 days for monthly, 18 months for annual. Outside that window the
// value renders with a "Last updated N days ago" muted caption per the
// brief.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'

// Cadence → freshness window in days. Outside this window, render stale.
const FRESH_WINDOW_DAYS = {
  daily:   3,
  weekly:  10,
  monthly: 60,
  annual:  548, // 18 months
  'event-driven': 365,
}

// ── Public: useDomainIndicators (headline cluster) ──────────────────────────

export function useDomainIndicators(domainSlug, focusId = null) {
  const [headlines, setHeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!domainSlug) {
      setHeadlines([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    // 1. Catalog read — headline indicators only.
    const { data: catalog, error: catalogErr } = await supabase
      .from('nextus_domain_indicators')
      .select(
        'id, domain_id, subdomain_slug, lens_slugs, name, unit, tier, ' +
        'source_name, source_url, native_resolution, refresh_cadence, ' +
        'direction_preferred, methodology_note, headline_order, ' +
        'tagged_principles, target_value, floor_value, rollup_weight'
      )
      .eq('domain_id', domainSlug)
      .eq('status', 'active')
      .eq('is_headline', true)
      .order('headline_order', { ascending: true })

    if (catalogErr) {
      setError(catalogErr)
      setHeadlines([])
      setLoading(false)
      return
    }

    if (!catalog || catalog.length === 0) {
      setHeadlines([])
      setLoading(false)
      return
    }

    // 2. Resolve current value per indicator with Focus inheritance.
    const resolved = await Promise.all(
      catalog.map((ind) => resolveCurrentValue(ind, focusId)),
    )

    setHeadlines(resolved)
    setLoading(false)
  }, [domainSlug, focusId])

  useEffect(() => {
    load()
  }, [load])

  return { headlines, loading, error, reload: load }
}

// ── Public: fetchAllIndicators ──────────────────────────────────────────────

export async function fetchAllIndicators(domainSlug, focusId = null) {
  if (!domainSlug) return []
  const { data: catalog, error } = await supabase
    .from('nextus_domain_indicators')
    .select(
      'id, domain_id, subdomain_slug, lens_slugs, name, unit, tier, ' +
      'source_name, source_url, endpoint_url, native_resolution, ' +
      'refresh_cadence, direction_preferred, methodology_note, ' +
      'tagged_principles, target_value, floor_value, rollup_weight'
    )
    .eq('domain_id', domainSlug)
    .eq('status', 'active')
    .order('subdomain_slug', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  if (error) throw error
  if (!catalog || catalog.length === 0) return []

  // Pull alias info. Two cheap queries to nextus_indicator_aliases plus
  // one lookup for the involved indicator domain_ids. Using flat queries
  // here rather than FK-hinted joins keeps the path resilient to
  // Supabase metadata regenerations.
  const ids = catalog.map((c) => c.id)

  const [{ data: outgoing = [] }, { data: incoming = [] }] = await Promise.all([
    supabase
      .from('nextus_indicator_aliases')
      .select('alias_indicator_id, canonical_indicator_id, alias_lens')
      .in('canonical_indicator_id', ids),
    supabase
      .from('nextus_indicator_aliases')
      .select('alias_indicator_id, canonical_indicator_id, alias_lens')
      .in('alias_indicator_id', ids),
  ])

  // Collect all indicator IDs we need domain_ids for (the "other side"
  // of each alias edge), and look them up in one query.
  const needDomainIds = new Set()
  for (const r of outgoing || []) needDomainIds.add(r.alias_indicator_id)
  for (const r of incoming || []) needDomainIds.add(r.canonical_indicator_id)

  let domainOf = {}
  if (needDomainIds.size > 0) {
    const { data: peers = [] } = await supabase
      .from('nextus_domain_indicators')
      .select('id, domain_id')
      .in('id', Array.from(needDomainIds))
    for (const p of peers || []) {
      domainOf[p.id] = p.domain_id
    }
  }

  // Build {indicatorId: [domainId, ...]} maps both directions.
  const canonicalToAliasDomains = {}
  for (const r of outgoing || []) {
    const aliasDomainId = domainOf[r.alias_indicator_id]
    if (!aliasDomainId) continue
    if (!canonicalToAliasDomains[r.canonical_indicator_id]) {
      canonicalToAliasDomains[r.canonical_indicator_id] = []
    }
    canonicalToAliasDomains[r.canonical_indicator_id].push(aliasDomainId)
  }
  const aliasToCanonicalDomain = {}
  for (const r of incoming || []) {
    aliasToCanonicalDomain[r.alias_indicator_id] = domainOf[r.canonical_indicator_id] || null
  }

  // Resolve current value for each row, then attach alias info.
  const resolved = await Promise.all(
    catalog.map((ind) => resolveCurrentValue(ind, focusId)),
  )
  return resolved.map((row) => ({
    ...row,
    canonical_in_other_domains: canonicalToAliasDomains[row.id] || [],
    alias_to_canonical_domain:  aliasToCanonicalDomain[row.id] || null,
  }))
}

// ── Public: fetchContributorSignals ─────────────────────────────────────────

export async function fetchContributorSignals(domainSlug, focusId = null, options = {}) {
  if (!domainSlug) return []
  const { limit = 50 } = options

  let query = supabase
    .from('nextus_contributor_signals')
    .select(
      'id, domain_id, subdomain_slug, lens_slugs, focus_id, contributor_id, ' +
      'signal_type, signal_text, signal_value_numeric, submitted_at, ' +
      'expires_at, visibility, vetting_status, tagged_principles'
    )
    .eq('domain_id', domainSlug)
    .neq('vetting_status', 'flagged')
    .order('submitted_at', { ascending: false })
    .limit(limit)

  if (focusId) {
    query = query.eq('focus_id', focusId)
  }

  const { data, error } = await query
  if (error) throw error

  // Filter out expired signals.
  const now = new Date()
  return (data || []).filter(
    (row) => !row.expires_at || new Date(row.expires_at) > now,
  )
}

// ── Public: countContributorSignals ─────────────────────────────────────────

export async function countContributorSignals(domainSlug, focusId = null) {
  if (!domainSlug) return 0

  let query = supabase
    .from('nextus_contributor_signals')
    .select('id', { count: 'exact', head: true })
    .eq('domain_id', domainSlug)
    .neq('vetting_status', 'flagged')

  if (focusId) {
    query = query.eq('focus_id', focusId)
  }

  const { count, error } = await query
  if (error) return 0
  return count || 0
}

// ── Internals ────────────────────────────────────────────────────────────────

// Walk up the Focus tree looking for a current value for this indicator.
// Returns the indicator merged with its resolved value (or null if no value
// is present at any ancestor Focus or planetary).
async function resolveCurrentValue(indicator, requestedFocusId) {
  // Build the inheritance chain: requested focus → its parents → planetary
  // (focus_id null). nextus_focuses has a parent_id column based on the
  // existing schema; we walk it up.
  const chain = await buildFocusChain(requestedFocusId)

  // Try each Focus in order. The chain ends with null = planetary.
  for (const focusId of chain) {
    const value = await readCurrentValue(indicator.id, focusId)
    if (value) {
      return shapeIndicator(indicator, value, focusId, requestedFocusId)
    }
  }

  // No value at any Focus. Return the indicator with no value.
  return shapeIndicator(indicator, null, null, requestedFocusId)
}

async function buildFocusChain(focusId) {
  const chain = []
  if (focusId) {
    let cursor = focusId
    let safety = 0
    while (cursor && safety < 8) {
      chain.push(cursor)
      const { data, error } = await supabase
        .from('nextus_focuses')
        .select('parent_id')
        .eq('id', cursor)
        .maybeSingle()
      if (error || !data) break
      cursor = data.parent_id
      safety++
    }
  }
  // Always end with planetary (null) as the fallback.
  chain.push(null)
  return chain
}

// Module 11.8: reads from nextus_indicator_values_resolved (the
// alias-aware view) rather than nextus_domain_indicator_values directly.
// The view falls back to a canonical indicator's value when an alias
// has none for the requested focus_id × observed_at, so alias rows get
// values for free without duplicate fetching.
//
// The view exposes the same column shape as the underlying table plus
// `via_alias` (boolean) and `actual_indicator_id` (the canonical that
// was read through). We pass these through in the shaped row so the
// UI can mark alias-routed values if it wants.
async function readCurrentValue(indicatorId, focusId) {
  let query = supabase
    .from('nextus_indicator_values_resolved')
    .select(
      'queried_indicator_id, actual_indicator_id, focus_id, ' +
      'value_numeric, value_text, observed_at, fetched_at, ' +
      'confidence, is_current, via_alias'
    )
    .eq('queried_indicator_id', indicatorId)
    .eq('is_current', true)

  if (focusId === null) {
    query = query.is('focus_id', null)
  } else {
    query = query.eq('focus_id', focusId)
  }

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null
  return data
}

function shapeIndicator(indicator, value, measuredAtFocusId, requestedFocusId) {
  const cadence = indicator.refresh_cadence
  const windowDays = FRESH_WINDOW_DAYS[cadence] ?? 30

  let isFresh = null
  let daysSinceFetch = null
  if (value && value.fetched_at) {
    const fetched = new Date(value.fetched_at)
    daysSinceFetch = Math.floor(
      (Date.now() - fetched.getTime()) / (24 * 60 * 60 * 1000),
    )
    isFresh = daysSinceFetch <= windowDays
  }

  // Inherited if the resolved Focus differs from the requested one.
  const inherited =
    requestedFocusId && measuredAtFocusId !== requestedFocusId

  return {
    ...indicator,
    value: value
      ? {
          numeric: value.value_numeric,
          text:    value.value_text,
          observed_at:  value.observed_at,
          fetched_at:   value.fetched_at,
          confidence:   value.confidence,
          via_alias:    !!value.via_alias,
        }
      : null,
    measured_at_focus_id: measuredAtFocusId,
    inherited,
    is_fresh: isFresh,
    days_since_fetch: daysSinceFetch,
  }
}

// ── Trend helper for cards ──────────────────────────────────────────────────
// Reads the previous value (any focus, the same one as the current row)
// to compute a short trend phrase. Cheap to call for headline cards.

export async function fetchPriorValue(indicatorId, focusId) {
  let query = supabase
    .from('nextus_domain_indicator_values')
    .select('value_numeric, observed_at')
    .eq('indicator_id', indicatorId)
    .eq('is_current', false)
    .order('observed_at', { ascending: false })
    .limit(1)

  if (focusId === null) {
    query = query.is('focus_id', null)
  } else if (focusId) {
    query = query.eq('focus_id', focusId)
  }

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null
  return data
}

// ── Public: useCivDomainScores ──────────────────────────────────────────────
//
// Loads headline indicators for all seven civilisational domains in
// parallel, computes a 0–10 rollup score per domain, and returns a
// keyed object suitable for feeding into the civ wheel as `civCurrent`.
//
// Returns:
//   {
//     scores:   { [civWheelKey]: number | null },  // e.g. { nature: 4.2, vision: null }
//     details:  { [civWheelKey]: { contributing, total, fresh, scored } },
//     loading:  boolean,
//     error:    Error | null,
//     reload:   () => Promise<void>,
//   }
//
// Maps the catalog's domain_id ('nature', 'human-being', etc.) to the
// civ wheel's key ('nature', 'human', etc.).

import { computeDomainScore } from '../util/domainScore'

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

// ── Civ scores cache ────────────────────────────────────────────
// Module-level cache for the planetary domain scores. The fan-out
// resolves ~35 indicator values across 7 domains; doing that on every
// mount adds ~1-2s of perceived latency on slower connections.
//
// Cache shape:
//   { scores, details, fetchedAt }  — fetchedAt is a ms timestamp
//
// Cache lifetime: CIV_CACHE_TTL_MS. After expiry, the next mount
// triggers a refresh. Cache is shared across all components that
// call useCivDomainScores() within the same session, so the wheel,
// the World View panel, and any other consumer share one fetch.
//
// In-flight dedup: if a fetch is already in progress, subsequent
// mounts await the same promise rather than firing a new fetch.

const CIV_CACHE_TTL_MS = 10 * 60 * 1000  // 10 minutes
let civCache = null
let civInFlight = null
const civSubscribers = new Set()

function notifyCivSubscribers(snapshot) {
  for (const fn of civSubscribers) {
    try { fn(snapshot) } catch { /* swallow */ }
  }
}

async function loadCivScoresOnce() {
  // ONE QUERY. Reads the most recent daily snapshot from
  // nextus_domain_scores_daily, written by the
  // /api/compute-daily-snapshot cron (03:30 UTC daily).
  //
  // Fallback policy: if today's snapshot hasn't been written yet
  // (cron hasn't run, or failed), the most recent snapshot is
  // used regardless of date. The wheel is always instant; data
  // can lag at most one day on cron failure. Manual refresh
  // available via POST /api/compute-daily-snapshot with the
  // x-cron-secret header.
  const { data: row, error } = await supabase
    .from('nextus_domain_scores_daily')
    .select('snapshot_date, vision, human, nature, finance, tech, legacy, society, details_json, computed_at')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  // No snapshot yet — return empty scores. The first run of the
  // cron will populate, and the wheel renders an empty polygon
  // in the meantime.
  if (!row) {
    return {
      scores: {},
      details: {},
      fetchedAt: Date.now(),
      snapshotDate: null,
    }
  }

  const scores = {
    vision:  row.vision,
    human:   row.human,
    nature:  row.nature,
    finance: row.finance,
    tech:    row.tech,
    legacy:  row.legacy,
    society: row.society,
  }
  const details = row.details_json || {}

  return {
    scores,
    details,
    fetchedAt: Date.now(),
    snapshotDate: row.snapshot_date,
  }
}

async function ensureCivScores(forceRefresh = false) {
  // Fresh cache hit
  if (!forceRefresh && civCache && (Date.now() - civCache.fetchedAt) < CIV_CACHE_TTL_MS) {
    return civCache
  }
  // Fetch in flight — dedup
  if (civInFlight) return civInFlight

  civInFlight = (async () => {
    try {
      const snapshot = await loadCivScoresOnce()
      civCache = snapshot
      notifyCivSubscribers(snapshot)
      return snapshot
    } finally {
      civInFlight = null
    }
  })()
  return civInFlight
}

export function useCivDomainScores() {
  // Seed state from cache if present — first paint is instant when
  // cache is warm. Otherwise we start in a loading state.
  const [scores, setScores]   = useState(civCache?.scores  || {})
  const [details, setDetails] = useState(civCache?.details || {})
  const [loading, setLoading] = useState(!civCache)
  const [error, setError]     = useState(null)

  const load = useCallback(async (forceRefresh = false) => {
    setError(null)
    if (forceRefresh || !civCache) setLoading(true)
    try {
      const snapshot = await ensureCivScores(forceRefresh)
      setScores(snapshot.scores)
      setDetails(snapshot.details)
      setLoading(false)
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Subscribe to cache refreshes from other components
    const onRefresh = (snapshot) => {
      setScores(snapshot.scores)
      setDetails(snapshot.details)
      setLoading(false)
    }
    civSubscribers.add(onRefresh)
    load()
    return () => { civSubscribers.delete(onRefresh) }
  }, [load])

  return { scores, details, loading, error, reload: () => load(true) }
}

// ── Legacy single-mount loader, retained for reference ───────────
// (The cached version above replaces it; keeping the symbol export
// removed so callers must use the cached hook.)
function _civDomainScoresLegacyUnused() {
  const [scores, setScores]   = useState({})
  const [details, setDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Load all headline indicators across all 7 civ domains in
      //    a single round-trip.
      const { data: catalog, error: catalogErr } = await supabase
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

      // 2. Resolve current values — planetary focus only for the wheel.
      //    Reads via the alias-aware view, so a Vision headline aliased
      //    to a Technology canonical gets the canonical's value.
      const resolved = await Promise.all(
        (catalog || []).map(ind => resolveCurrentValue(ind, null))
      )

      // 3. Group by domain and compute per-domain rollup.
      const byDomain = {}
      for (const ind of resolved) {
        const d = ind.domain_id
        if (!byDomain[d]) byDomain[d] = []
        byDomain[d].push(ind)
      }

      const nextScores  = {}
      const nextDetails = {}
      for (const d of ALL_CIV_DOMAINS) {
        const key = CIV_DOMAIN_TO_WHEEL_KEY[d]
        const list = byDomain[d] || []
        const result = computeDomainScore(list)
        nextScores[key]  = result.score
        nextDetails[key] = result
      }
      setScores(nextScores)
      setDetails(nextDetails)
      setLoading(false)
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { scores, details, loading, error, reload: load }
}
