// src/app/hooks/useActiveFocus.js
//
// Reads and writes the current user's Active Focus — the small set of
// magnifications (places, domains, organisations, participation modes)
// they've chosen to centre on for now.
//
// One row per user, edited in place. Drives the Mission Control
// reorientation: when a user has Active Focus set, their home view
// reorganises around their answers.
//
// API:
//   const {
//     focus,            // { focus_place_ids, focus_domain_slugs, focus_actor_ids, participation, updated_at } | null
//     loading,
//     error,
//     hasFocus,         // boolean — true iff at least one of places/domains/actors is set
//     save,             // (patch) => Promise — partial update, autosave-friendly
//     clear,            // () => Promise — wipe focus
//   } = useActiveFocus()

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'

const EMPTY = {
  focus_place_ids:     [],
  focus_domain_slugs:  [],
  focus_subdomain_ids: [],
  focus_field_ids:     [],
  focus_actor_ids:     [],
  participation:       [],
  updated_at:          null,
}

export function useActiveFocus() {
  const { user } = useAuth()
  const [focus, setFocus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // True iff the user has actually saved focus at least once. Distinct from
  // hasFocus-by-content because the load() path may seed a non-persisted
  // suggestion (e.g. their Purpose Piece domain) before the user saves.
  const [isPersisted, setIsPersisted] = useState(false)

  const load = useCallback(async () => {
    if (!user) { setFocus(null); setLoading(false); return }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('nextus_user_focus')
      .select('focus_place_ids, focus_domain_slugs, focus_subdomain_ids, focus_field_ids, focus_actor_ids, participation, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (err) {
      // Likely the table doesn't exist yet (migration 051/054 not run). Fall
      // back to an empty state so the prompt still renders. The user can fill
      // it in once the migration is applied; their save will then succeed.
      setError(err)
      setFocus({ ...EMPTY })
      setIsPersisted(false)
      setLoading(false)
      return
    }
    if (data) {
      setFocus(data)
      setIsPersisted(true)
      setLoading(false)
      return
    }
    // No focus row yet — first time this user is opening the prompt.
    // Seed with their Purpose Piece domain if they've done it, so the
    // platform feels continuous. This is purely a UI seed; nothing is
    // written to nextus_user_focus until the user actively saves.
    let seeded = { ...EMPTY }
    const { data: pp } = await supabase
      .from('purpose_piece_results')
      .select('domain, status, completed_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const ppDone = pp && (pp.status === 'complete' || pp.completed_at)
    if (ppDone && pp.domain) {
      seeded = { ...seeded, focus_domain_slugs: [pp.domain] }
    }
    setFocus(seeded)
    setIsPersisted(false)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (patch) => {
    if (!user) throw new Error('Not authenticated')
    const merged = {
      focus_place_ids:     focus?.focus_place_ids     || [],
      focus_domain_slugs:  focus?.focus_domain_slugs  || [],
      focus_subdomain_ids: focus?.focus_subdomain_ids || [],
      focus_field_ids:     focus?.focus_field_ids     || [],
      focus_actor_ids:     focus?.focus_actor_ids     || [],
      participation:       focus?.participation       || [],
      ...patch,
    }
    // Optimistic
    setFocus({ ...merged, updated_at: new Date().toISOString() })
    const { data, error: err } = await supabase
      .from('nextus_user_focus')
      .upsert(
        { user_id: user.id, ...merged, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select('focus_place_ids, focus_domain_slugs, focus_subdomain_ids, focus_field_ids, focus_actor_ids, participation, updated_at')
      .single()
    if (err) {
      setError(err)
      // Re-load to reconcile
      load()
      throw err
    }
    setFocus(data)
    setIsPersisted(true)
    return data
  }, [user, focus, load])

  const clear = useCallback(async () => {
    if (!user) throw new Error('Not authenticated')
    setFocus({ ...EMPTY })
    setIsPersisted(false)
    const { error: err } = await supabase
      .from('nextus_user_focus')
      .delete()
      .eq('user_id', user.id)
    if (err) {
      setError(err); load(); throw err
    }
  }, [user, load])

  // hasFocus requires both: a saved row exists, AND it has content. The
  // PP-seeded suggestion alone does NOT make hasFocus true — the tile
  // shouldn't light gold until the user has actually saved.
  const hasFocus = !!(
    isPersisted && focus && (
      (focus.focus_place_ids?.length || 0) > 0 ||
      (focus.focus_domain_slugs?.length || 0) > 0 ||
      (focus.focus_actor_ids?.length || 0) > 0 ||
      (focus.participation?.length || 0) > 0
    )
  )

  return {
    focus,
    loading,
    error,
    hasFocus,
    isPersisted,
    save,
    clear,
    reload: load,
  }
}
