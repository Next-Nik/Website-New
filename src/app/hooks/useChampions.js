// src/app/hooks/useChampions.js
//
// Read, toggle, and ORDER the current user's champions — the one capped thing
// in the Field Guide. Five to ten organisations, hard cap of 10 enforced at
// the database layer (enforce_champion_cap trigger, migration 178),
// mirroring the useWatch / WATCH_CAP_REACHED pattern.
//
// Champions are also the one ORDERED thing in the guide (v4, migration 179).
// Organisations themselves are listed alphabetically and carry no number —
// the ring is where sequence means something, and the user sets it. Order is
// stored as actor_champions.rank, 1-based and contiguous per user. A new
// champion lands at the end (the DB trigger assigns max+1); `move` swaps a
// pair of adjacent ranks.
//
// API:
//   const { champions, count, cap, loading, isChampion, toggle, move,
//           canOrder } = useChampions()
//
//   - champions: array of { id, actor_id, created_at, rank }, rank ascending
//   - isChampion(actorId): boolean
//   - toggle(actorId): async → { added: bool }; throws Error with
//     .code === 'CHAMPION_CAP_REACHED' when the ring is full.
//   - reorder(orderedActorIds): async → bool. Writes ranks to match the given
//     order. Pass the ids you are DISPLAYING — champions you omit keep their
//     relative order behind them, so a caller showing a subset (a champion
//     whose org was soft-removed is still a row) can't swap against a row the
//     user cannot see. Serialised; on partial failure it re-reads rather than
//     trusting local state.
//   - canOrder: false when migration 179 has not been run — the ring still
//     renders and toggles, it just cannot be reordered. Degrades like every
//     other guide source rather than breaking the page.
//
// On add, fires the warm ping (POST /api/guide-ping) fire-and-forget —
// the server verifies the row, throttles, and never blocks the UI.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'

export const CHAMPION_CAP = 10

const RANKED_COLS   = 'id, actor_id, created_at, rank'
const UNRANKED_COLS = 'id, actor_id, created_at'

// Is this error specifically "that column doesn't exist" — i.e. migration 179
// hasn't been run — rather than any old failure? 42703 is Postgres
// undefined_column; PGRST204 is PostgREST's own unknown-column code. Treating
// every error as a missing column meant one transient 5xx or an expired token
// latched the degraded path on for the rest of the visit, silently disabling
// reordering on a database that supports it.
function isMissingColumn(error) {
  if (!error) return false
  if (error.code === '42703' || error.code === 'PGRST204') return true
  return /column .* does not exist|could not find the .* column/i.test(error.message || '')
}

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

// Sort by rank when we have it, else by when they were chosen. Rows with a
// null rank (inserted before 179's trigger existed) sink to the end in
// created_at order rather than jumping to the front.
function orderChampions(rows) {
  return [...rows].sort((a, b) => {
    const ar = a.rank, br = b.rank
    if (ar != null && br != null && ar !== br) return ar - br
    if (ar != null && br == null) return -1
    if (ar == null && br != null) return 1
    return new Date(a.created_at || 0) - new Date(b.created_at || 0)
  })
}

export function useChampions() {
  const { user } = useAuth()
  const [champions, setChampions] = useState([])
  const [loading, setLoading] = useState(true)
  const [canOrder, setCanOrder] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setChampions([]); setLoading(false); return }
    setLoading(true)

    // Try the ranked shape first. If 179 hasn't run the column is missing and
    // PostgREST says so — only then fall back to the v3 shape and disable
    // ordering. Any other error is a real error and keeps `canOrder` as it
    // was, so a blip doesn't take the Arrange button away for the visit.
    let { data, error } = await supabase
      .from('actor_champions')
      .select(RANKED_COLS)
      .eq('user_id', user.id)

    if (error && isMissingColumn(error)) {
      const fallback = await supabase
        .from('actor_champions')
        .select(UNRANKED_COLS)
        .eq('user_id', user.id)
      if (!fallback.error) {
        setCanOrder(false)
        data = fallback.data
        error = null
      }
    } else if (!error) {
      setCanOrder(true)
    }

    if (!error) setChampions(orderChampions(data || []))
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
        setChampions(prev => orderChampions([...prev, existing]))
        throw error
      }
      return { added: false }
    }

    const cols = canOrder ? RANKED_COLS : UNRANKED_COLS
    const { data, error } = await supabase
      .from('actor_champions')
      .insert({ user_id: user.id, actor_id: actorId })
      .select(cols)
      .single()

    if (error) {
      if ((error.message || '').includes('CHAMPION_CAP_REACHED')) {
        const e = new Error('Your champions ring is full — ten is the limit. Release one before choosing another.')
        e.code = 'CHAMPION_CAP_REACHED'
        throw e
      }
      throw error
    }

    setChampions(prev => orderChampions([...prev, data]))
    firePing(actorId, 'championed')   // warm ping, fire-and-forget
    return { added: true }
  }, [user, champions, canOrder])

  // Write an explicit order. Callers pass the actor_ids they are DISPLAYING,
  // in the order they want them — which matters because the caller's list can
  // legitimately be a subset of the ring: an org that self-removes is a soft
  // tombstone (migration 166) and its actor_champions row survives, so it
  // stays in `champions` while disappearing from the guide's rendered seals.
  // An earlier version swapped by index into `champions`, which meant a click
  // could trade places with an invisible row and appear to do nothing. Ranks
  // are rewritten from the given order, with any champion the caller didn't
  // mention kept behind them in its existing order.
  //
  // Serialised: a second reorder is refused while one is in flight. Without
  // that, double-tapping an arrow issued two overlapping sets of per-row
  // writes whose last-write-wins outcome could leave two rows sharing a rank
  // and none holding the one between them.
  const writing = useRef(false)

  const reorder = useCallback(async (orderedActorIds) => {
    if (!user || !canOrder) return false
    if (writing.current) return false
    if (!Array.isArray(orderedActorIds) || orderedActorIds.length === 0) return false

    const byActor = new Map(champions.map(c => [c.actor_id, c]))
    const named = orderedActorIds.map(id => byActor.get(id)).filter(Boolean)
    if (named.length === 0) return false

    const namedIds = new Set(named.map(c => c.id))
    const rest = champions.filter(c => !namedIds.has(c.id))
    const before = champions
    const renumbered = [...named, ...rest].map((c, i) => ({ ...c, rank: i + 1 }))

    // Nothing to do — don't spend a round trip on a no-op arrow press.
    const changed = renumbered.filter(c => {
      const prev = before.find(p => p.id === c.id)
      return !prev || prev.rank !== c.rank
    })
    if (changed.length === 0) return true

    writing.current = true
    setChampions(renumbered)
    try {
      const results = await Promise.all(
        changed.map(c =>
          supabase.from('actor_champions')
            .update({ rank: c.rank })
            .eq('id', c.id)
            .eq('user_id', user.id),
        ),
      )

      if (results.some(r => r.error)) {
        // Promise.all is not atomic: some ranks may have landed. Reverting to
        // `before` would leave local state lying about the database, and every
        // later reorder diffs against local state — so the drift would
        // compound instead of healing. Re-read the truth instead.
        await load()
        return false
      }
      return true
    } catch {
      await load()
      return false
    } finally {
      writing.current = false
    }
  }, [user, champions, canOrder, load])

  return {
    champions,
    count: champions.length,
    cap: CHAMPION_CAP,
    loading,
    canOrder,
    isChampion,
    toggle,
    reorder,
    reload: load,
  }
}
