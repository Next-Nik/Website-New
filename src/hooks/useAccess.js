import { useState, useEffect } from 'react'
import { supabase } from './useSupabase'
import { useAuth } from './useAuth'

// Tier hierarchy for comparison
const TIER_RANK = { full: 3, beta: 2, preview: 1, none: 0 }

/**
 * useAccess(productKey)
 *
 * Returns: { tier, discountPct, loading, error }
 *
 * tier:
 *   'full'      — complete access
 *   'beta'      — full access, beta source
 *   'preview'   — limited/lite access
 *   'none'      — no access, show paywall
 *   'suspended' — account suspended
 *   'banned'    — account banned
 *   null        — still loading
 *
 * discountPct: 0–100, applicable if tier is 'none'
 */
export function useAccess(productKey) {
  const { user, loading: authLoading } = useAuth()
  const [tier, setTier]               = useState(null)
  const [discountPct, setDiscountPct] = useState(0)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setTier('none')
      setDiscountPct(0)
      setLoading(false)
      return
    }

    let cancelled = false

    async function check() {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_access', {
          p_user_id: user.id,
          p_product: productKey,
        })

        if (cancelled) return
        if (rpcError) throw rpcError

        setTier(data?.tier ?? 'none')
        setDiscountPct(data?.discount_pct ?? 0)
      } catch (err) {
        if (!cancelled) {
          console.error('useAccess error:', err)
          setError(err)
          setTier('none') // fail open — don't hard-block on error
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    check()
    return () => { cancelled = true }
  }, [user, authLoading, productKey])

  return { tier, discountPct, loading, error }
}

/**
 * hasAccess(tier)
 * Returns true if tier grants tool access (preview, beta, or full).
 */
export function hasAccess(tier) {
  return TIER_RANK[tier] >= TIER_RANK['preview']
}

/**
 * hasFullAccess(tier)
 * Returns true only for beta or full.
 */
export function hasFullAccess(tier) {
  return TIER_RANK[tier] >= TIER_RANK['beta']
}
