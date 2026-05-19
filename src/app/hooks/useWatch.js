// src/app/hooks/useWatch.js
//
// Read and toggle the current user's watches. Watching is bounded by the
// 500-entry cap, enforced at the database layer via the
// enforce_watch_cap trigger. This hook surfaces the cap state to the UI.
//
// API:
//   const { watches, count, loading, error, isWatching, toggle, cap, capState } = useWatch()
//
// Where:
//   - watches:  array of { id, entity_type, entity_id, watched_at }
//   - count:    integer (length of watches)
//   - cap:      500 (the constant)
//   - capState: 'below' | 'soft-warn' | 'at-cap'
//   - isWatching(entityType, entityId): boolean
//   - toggle(entityType, entityId): async; returns { added: bool } or throws

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'

const CAP = 500
const SOFT_WARN_THRESHOLD = 400

export function useWatch() {
  const { user } = useAuth()
  const [watches, setWatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!user) { setWatches([]); setLoading(false); return }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('nextus_user_watches')
      .select('id, entity_type, entity_id, watched_at')
      .eq('user_id', user.id)
      .order('watched_at', { ascending: false })
    if (err) { setError(err); setLoading(false); return }
    setWatches(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const watchKey = useCallback(
    (entityType, entityId) => `${entityType}:${entityId}`,
    []
  )

  const watchIndex = useMemo(() => {
    const idx = new Set()
    for (const w of watches) idx.add(watchKey(w.entity_type, w.entity_id))
    return idx
  }, [watches, watchKey])

  const isWatching = useCallback(
    (entityType, entityId) => watchIndex.has(watchKey(entityType, entityId)),
    [watchIndex, watchKey]
  )

  const count = watches.length

  const capState = useMemo(() => {
    if (count >= CAP) return 'at-cap'
    if (count >= SOFT_WARN_THRESHOLD) return 'soft-warn'
    return 'below'
  }, [count])

  // Toggle: insert if not watching, delete if watching.
  // Returns { added: true } or { added: false }.
  // Throws an Error with .code === 'WATCH_CAP_REACHED' if the cap blocks insert.
  const toggle = useCallback(async (entityType, entityId) => {
    if (!user) throw new Error('Not authenticated')

    const existing = watches.find(
      w => w.entity_type === entityType && w.entity_id === entityId
    )

    if (existing) {
      // Optimistic remove
      setWatches(prev => prev.filter(w => w.id !== existing.id))
      const { error: delErr } = await supabase
        .from('nextus_user_watches')
        .delete()
        .eq('id', existing.id)
      if (delErr) {
        // Roll back
        setWatches(prev => [...prev, existing])
        throw delErr
      }
      return { added: false }
    }

    // Insert path — let the trigger enforce the cap.
    const { data, error: insErr } = await supabase
      .from('nextus_user_watches')
      .insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
      })
      .select('id, entity_type, entity_id, watched_at')
      .single()

    if (insErr) {
      // Surface cap error via a typed exception
      if ((insErr.message || '').includes('WATCH_CAP_REACHED')) {
        const e = new Error('Watch list full. Remove an entry before adding another.')
        e.code = 'WATCH_CAP_REACHED'
        throw e
      }
      throw insErr
    }

    setWatches(prev => [data, ...prev])
    return { added: true }
  }, [user, watches])

  return {
    watches,
    count,
    cap: CAP,
    capState,
    loading,
    error,
    isWatching,
    toggle,
    reload: load,
  }
}
