// src/app/hooks/useFocusProfile.js
//
// Fetches everything the universal Focus profile page (/focus/:slug) needs
// to render: the focus itself, its ancestor chain (for breadcrumbs), its
// immediate children (for "what's nested under this"), its touches relations,
// its cascaded affiliation counts (via focus_affiliation_counts_cascaded),
// and the actors located within its geographic subtree.
//
// Phase v2.5 ships layers 1–6 + 10 + 11(affiliate only). Layers 7–9 and
// the watch button are stubbed but not surfaced.

import { useEffect, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'

export function useFocusProfile(slug) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!slug) { setLoading(false); return }
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        // 1. The focus itself.
        const { data: focus, error: fErr } = await supabase
          .from('nextus_focuses')
          .select('id, slug, name, type, kind, parent_id, description, coordinates, geonames_id, wikidata_qid')
          .eq('slug', slug)
          .maybeSingle()

        if (fErr) throw fErr
        if (!focus) { if (!cancelled) { setData(null); setLoading(false) } ; return }

        // 2. Ancestors — for breadcrumb (Earth · North America · Canada).
        const { data: ancestors } = await supabase
          .rpc('focus_ancestors', { p_focus_id: focus.id })

        // 3. Immediate children — what's nested directly under this focus.
        //    For "what's nested" rendering we only show direct children; the
        //    user navigates down by clicking. Showing the full subtree would
        //    overwhelm on, say, Earth.
        const { data: children } = await supabase
          .from('nextus_focuses')
          .select('id, slug, name, type, kind')
          .eq('parent_id', focus.id)
          .order('name', { ascending: true })
          .limit(200)

        // 4. Touches relations — non-hierarchical adjacency.
        //    Touches is symmetric in meaning but stored as directional pairs;
        //    we query both sides and dedupe.
        const [{ data: touchesA }, { data: touchesB }] = await Promise.all([
          supabase
            .from('nextus_focus_touches')
            .select('focus_id_b, relation_type, source_name')
            .eq('focus_id_a', focus.id),
          supabase
            .from('nextus_focus_touches')
            .select('focus_id_a, relation_type, source_name')
            .eq('focus_id_b', focus.id),
        ])
        const touchIds = Array.from(new Set([
          ...(touchesA || []).map(r => r.focus_id_b),
          ...(touchesB || []).map(r => r.focus_id_a),
        ]))
        let touches = []
        if (touchIds.length > 0) {
          const { data: touchFocuses } = await supabase
            .from('nextus_focuses')
            .select('id, slug, name, type, kind')
            .in('id', touchIds)
          touches = touchFocuses || []
        }

        // 5. Affiliation counts (cascaded). Uses the SQL helper from
        //    migration 047. Returns one row per relationship_type with
        //    a positive count.
        const { data: affCounts } = await supabase
          .rpc('focus_affiliation_counts_cascaded', { p_focus_id: focus.id })

        // 6. Actors located here — orgs/practitioners/practices/groups with
        //    focus_id pointing to this focus OR any descendant.
        //    Note: actors use `focus_id` (singular relation column on
        //    nextus_actors). The `location_focus_id` column belongs to
        //    contributor_profiles_beta (people), not actors.
        //    We fetch the descendant set once and filter actors against it.
        const { data: descendants } = await supabase
          .rpc('focus_descendants', { p_focus_id: focus.id })
        const subtreeIds = [focus.id, ...(descendants || []).map(d => d.id)]
        const { data: actors } = await supabase
          .from('nextus_actors')
          .select('id, slug, name, kind, focus_id')
          .in('focus_id', subtreeIds)
          .eq('status', 'live')
          .order('name', { ascending: true })
          .limit(50)

        if (cancelled) return

        setData({
          focus,
          ancestors: ancestors || [],
          children: children || [],
          touches,
          affiliationCounts: affCounts || [],
          actors: actors || [],
        })
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [slug])

  return { data, loading, error }
}
