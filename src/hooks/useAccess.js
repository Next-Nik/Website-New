import { useState, useEffect } from 'react'
import { supabase } from './useSupabase'
import { useAuth } from './useAuth'

const TIER_RANK = { full: 3, beta: 2, preview: 1, none: 0 }

// Founder check — matches AdminConsole and ContentEditor pattern
function isFounder(user) {
  return user?.user_metadata?.role === 'founder'
}

export function useAccess(productKey) {
  const { user, loading: authLoading } = useAuth()
  const [tier, setTier]               = useState(null)
  const [discountPct, setDiscountPct] = useState(0)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  useEffect(() => {
    if (authLoading) return

    // Founder always gets full access — no database check needed
    if (isFounder(user)) {
      setTier('full')
      setDiscountPct(0)
      setLoading(false)
      return
    }

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
          setTier('full') // fail open on error — don't block users on backend issues
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

export function hasAccess(tier) {
  return TIER_RANK[tier] >= TIER_RANK['preview']
}

export function hasFullAccess(tier) {
  return TIER_RANK[tier] >= TIER_RANK['beta']
}
