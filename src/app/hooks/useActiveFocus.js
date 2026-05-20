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
      // Likely the table doesn't exist yet (migration 051 not run). Fall back
      // to an empty state so the prompt still renders. The user can fill it
      // in once the migration is applied; their save will then succeed.
      setError(err)
      setFocus({ ...EMPTY })
      setLoading(false)
      return
    }
    setFocus(data || { ...EMPTY })
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
    return data
  }, [user, focus, load])

  const clear = useCallback(async () => {
    if (!user) throw new Error('Not authenticated')
    setFocus({ ...EMPTY })
    const { error: err } = await supabase
      .from('nextus_user_focus')
      .delete()
      .eq('user_id', user.id)
    if (err) {
      setError(err); load(); throw err
    }
  }, [user, load])

  const hasFocus = !!(
    focus && (
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
    save,
    clear,
    reload: load,
  }
}
