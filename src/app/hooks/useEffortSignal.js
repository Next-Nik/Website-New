// src/app/hooks/useEffortSignal.js
//
// Reads the latest civilisational effort signal aggregate from
// nextus_effort_signal_daily. Returns an object keyed by domain plus
// the snapshot_date the data was computed for.
//
// The aggregate table is public-read by design (RLS), so anonymous and
// signed-in visitors get the same data. No per-actor data is in the
// aggregate.

import { useEffect, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'

const CIV_DOMAINS = [
  'human-being', 'society', 'nature', 'technology',
  'finance-economy', 'legacy', 'vision',
]

// Map civ domain id → the wheel key used in the planet scores table
// (so callers can pair the two signals on the same domain).
const DOMAIN_TO_WHEEL_KEY = {
  'human-being':     'human',
  'society':         'society',
  'nature':          'nature',
  'technology':      'tech',
  'finance-economy': 'finance',
  'legacy':          'legacy',
  'vision':          'vision',
}

export function useEffortSignal() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Find the most recent snapshot date with civ-track rows.
        const { data: latest, error: latestErr } = await supabase
          .from('nextus_effort_signal_daily')
          .select('snapshot_date')
          .eq('domain_track', 'civ')
          .order('snapshot_date', { ascending: false })
          .limit(1)

        if (latestErr) throw latestErr

        if (!latest || latest.length === 0) {
          // No data computed yet. Return an empty shape so callers can
          // render a neutral state.
          if (!cancelled) {
            setData({ snapshot_date: null, byDomain: {} })
            setLoading(false)
          }
          return
        }

        const snapshotDate = latest[0].snapshot_date

        const { data: rows, error: rowsErr } = await supabase
          .from('nextus_effort_signal_daily')
          .select('domain, active_actors, total_people_in_the_work, by_scale, by_mode, by_actor_type, computed_at')
          .eq('domain_track', 'civ')
          .eq('snapshot_date', snapshotDate)

        if (rowsErr) throw rowsErr

        const byDomain = {}
        // Initialise every domain to zero so callers can always render seven rows
        for (const d of CIV_DOMAINS) {
          byDomain[d] = {
            domain: d,
            wheel_key: DOMAIN_TO_WHEEL_KEY[d],
            active_actors: 0,
            total_people_in_the_work: 0,
            by_scale: {},
            by_mode: {},
            by_actor_type: {},
          }
        }
        for (const r of (rows || [])) {
          byDomain[r.domain] = {
            domain: r.domain,
            wheel_key: DOMAIN_TO_WHEEL_KEY[r.domain],
            active_actors:            r.active_actors || 0,
            total_people_in_the_work: r.total_people_in_the_work || 0,
            by_scale:      r.by_scale      || {},
            by_mode:       r.by_mode       || {},
            by_actor_type: r.by_actor_type || {},
          }
        }

        // Roll up to a platform total (be explicit that this double-counts
        // multi-domain actors — see compute function notes).
        const totalActors = Object.values(byDomain)
          .reduce((s, r) => s + r.active_actors, 0)
        const totalPeople = Object.values(byDomain)
          .reduce((s, r) => s + r.total_people_in_the_work, 0)

        if (!cancelled) {
          setData({
            snapshot_date: snapshotDate,
            byDomain,
            totals: {
              active_actors_sum_with_double_counting: totalActors,
              people_in_the_work_sum_with_double_counting: totalPeople,
            },
          })
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { data, loading, error }
}
