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
        'tagged_principles'
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
      'tagged_principles'
    )
    .eq('domain_id', domainSlug)
    .eq('status', 'active')
    .order('subdomain_slug', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  if (error) throw error
  if (!catalog) return []

  return Promise.all(catalog.map((ind) => resolveCurrentValue(ind, focusId)))
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

async function readCurrentValue(indicatorId, focusId) {
  let query = supabase
    .from('nextus_domain_indicator_values')
    .select(
      'id, indicator_id, focus_id, value_numeric, value_text, ' +
      'observed_at, fetched_at, confidence'
    )
    .eq('indicator_id', indicatorId)
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
