// src/app/hooks/useRoster.js
//
// Read and modify the current user's roster. Tier and budget caps are
// enforced at the database layer via triggers (migration 050). This hook
// catches those errors and exposes them via typed codes:
//   - ROSTER_TIER_FULL
//   - ROSTER_BUDGET_EXCEEDED
//
// Roster slot creation implicitly creates a watch row if one does not
// exist (per the spec — you cannot allocate spoons to something you
// don't also tag interest in). Removing a slot does NOT remove the watch.
//
// API:
//   const {
//     slots, loading, error,
//     spent, free, wasted, cap,
//     tierCounts, tierCaps, tierCosts,
//     getSlot, addSlot, changeTier, removeSlot,
//     reload,
//   } = useRoster()

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'

const CAP = 100

const TIER_CAPS = {
  deep:      5,
  sustained: 10,
  regular:   20,
  light:     30,
}

const TIER_COSTS = {
  deep:      10,
  sustained: 5,
  regular:   2,
  light:     1,
}

const TIER_ORDER = ['deep', 'sustained', 'regular', 'light']

export function useRoster() {
  const { user } = useAuth()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) { setSlots([]); setLoading(false); return }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('nextus_user_roster_slots')
      .select('id, entity_type, entity_id, tier, allocated_at, updated_at')
      .eq('user_id', user.id)
      .order('allocated_at', { ascending: false })
    if (err) { setError(err); setLoading(false); return }
    setSlots(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Compute the spent / free / wasted breakdown.
  const { spent, free, wasted, tierCounts } = useMemo(() => {
    const counts = { deep: 0, sustained: 0, regular: 0, light: 0 }
    let raw = 0
    let waste = 0
    for (const s of slots) {
      counts[s.tier] += 1
      const cost = TIER_COSTS[s.tier]
      // If the tier has more slots than its cap (shouldn't normally happen
      // due to triggers, but defensive), the excess slots cost is wasted.
      if (counts[s.tier] <= TIER_CAPS[s.tier]) {
        raw += cost
      } else {
        waste += cost
      }
    }
    return {
      spent: raw,
      free: Math.max(0, CAP - raw - waste),
      wasted: waste,
      tierCounts: counts,
    }
  }, [slots])

  const getSlot = useCallback(
    (entityType, entityId) =>
      slots.find(s => s.entity_type === entityType && s.entity_id === entityId) || null,
    [slots]
  )

  // Ensure a watch exists for this entity. Idempotent.
  async function ensureWatch(entityType, entityId) {
    if (!user) return
    // Try insert; if it already exists (unique constraint), that's fine.
    const { error: insErr } = await supabase
      .from('nextus_user_watches')
      .insert({ user_id: user.id, entity_type: entityType, entity_id: entityId })
    // Ignore unique-violation; surface watch-cap error.
    if (insErr) {
      if ((insErr.message || '').includes('WATCH_CAP_REACHED')) {
        const e = new Error('Cannot allocate spoons: your Tuned In list is also full. Un-tune someone first.')
        e.code = 'WATCH_CAP_REACHED'
        throw e
      }
      // Otherwise probably unique-violation — already watching. OK.
    }
  }

  function decodeRosterErr(err) {
    const msg = err.message || ''
    if (msg.includes('ROSTER_TIER_FULL')) {
      const e = new Error(msg.split('ROSTER_TIER_FULL').slice(-1)[0].trim() || 'That tier is full.')
      e.code = 'ROSTER_TIER_FULL'
      return e
    }
    if (msg.includes('ROSTER_BUDGET_EXCEEDED')) {
      const e = new Error(msg.split('ROSTER_BUDGET_EXCEEDED').slice(-1)[0].trim() || 'Not enough spoons.')
      e.code = 'ROSTER_BUDGET_EXCEEDED'
      return e
    }
    return err
  }

  const addSlot = useCallback(async (entityType, entityId, tier) => {
    if (!user) throw new Error('Not authenticated')
    if (!TIER_CAPS[tier]) throw new Error('Invalid tier')

    await ensureWatch(entityType, entityId)

    const { data, error: err } = await supabase
      .from('nextus_user_roster_slots')
      .insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        tier,
      })
      .select('id, entity_type, entity_id, tier, allocated_at, updated_at')
      .single()

    if (err) throw decodeRosterErr(err)
    setSlots(prev => [data, ...prev])
    return data
  }, [user])

  const changeTier = useCallback(async (slotId, newTier) => {
    if (!user) throw new Error('Not authenticated')
    if (!TIER_CAPS[newTier]) throw new Error('Invalid tier')

    const { data, error: err } = await supabase
      .from('nextus_user_roster_slots')
      .update({ tier: newTier })
      .eq('id', slotId)
      .select('id, entity_type, entity_id, tier, allocated_at, updated_at')
      .single()

    if (err) throw decodeRosterErr(err)
    setSlots(prev => prev.map(s => s.id === slotId ? data : s))
    return data
  }, [user])

  const removeSlot = useCallback(async (slotId) => {
    if (!user) throw new Error('Not authenticated')
    const prev = slots
    setSlots(p => p.filter(s => s.id !== slotId))
    const { error: err } = await supabase
      .from('nextus_user_roster_slots')
      .delete()
      .eq('id', slotId)
    if (err) {
      setSlots(prev)
      throw err
    }
  }, [user, slots])

  return {
    slots,
    loading,
    error,
    cap: CAP,
    spent,
    free,
    wasted,
    tierCounts,
    tierCaps: TIER_CAPS,
    tierCosts: TIER_COSTS,
    tierOrder: TIER_ORDER,
    getSlot,
    addSlot,
    changeTier,
    removeSlot,
    reload: load,
  }
}
