// src/app/hooks/useChampions.js
//
// Read and toggle the current user's champions — the ONE capped thing in
// the Field Guide. Five to ten organisations, hard cap of 10 enforced at
// the database layer (enforce_champion_cap trigger, migration 178),
// mirroring the useWatch / WATCH_CAP_REACHED pattern.
//
// API:
//   const { champions, count, cap, loading, isChampion, toggle } = useChampions()
//
//   - champions: array of { id, actor_id, created_at }
//   - isChampion(actorId): boolean
//   - toggle(actorId): async → { added: bool }; throws Error with
//     .code === 'CHAMPION_CAP_REACHED' when the ring is full.
//
// On add, fires the warm ping (POST /api/guide-ping) fire-and-forget —
// the server verifies the row, throttles, and never blocks the UI.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'

export const CHAMPION_CAP = 10

async function firePing(actorId, kind) {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return
    fetch('/api/guide-ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ actorId, kind }),
    }).catch(() => {})
  } catch { /* never block the act on the ping */ }
}

export function useChampions() {
  const { user } = useAuth()
  const [champions, setChampions] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setChampions([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('actor_champions')
      .select('id, actor_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (!error) setChampions(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const championSet = useMemo(
    () => new Set(champions.map(c => c.actor_id)),
    [champions],
  )

  const isChampion = useCallback(
    (actorId) => championSet.has(actorId),
    [championSet],
  )

  const toggle = useCallback(async (actorId) => {
    if (!user) throw new Error('Not authenticated')

    const existing = champions.find(c => c.actor_id === actorId)
    if (existing) {
      setChampions(prev => prev.filter(c => c.id !== existing.id))
      const { error } = await supabase
        .from('actor_champions')
        .delete()
        .eq('id', existing.id)
      if (error) {
        setChampions(prev => [...prev, existing])
        throw error
      }
      return { added: false }
    }

    const { data, error } = await supabase
      .from('actor_champions')
      .insert({ user_id: user.id, actor_id: actorId })
      .select('id, actor_id, created_at')
      .single()

    if (error) {
      if ((error.message || '').includes('CHAMPION_CAP_REACHED')) {
        const e = new Error('Your champions ring is full — ten is the limit. Release one before choosing another.')
        e.code = 'CHAMPION_CAP_REACHED'
        throw e
      }
      throw error
    }

    setChampions(prev => [...prev, data])
    firePing(actorId, 'championed')   // warm ping, fire-and-forget
    return { added: true }
  }, [user, champions])

  return {
    champions,
    count: champions.length,
    cap: CHAMPION_CAP,
    loading,
    isChampion,
    toggle,
    reload: load,
  }
}
