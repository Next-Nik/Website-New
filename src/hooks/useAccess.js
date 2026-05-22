import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

const TIER_RANK = { full: 3, beta: 2, preview: 1, none: 0 }

// Founder check — matches AdminConsole and ContentEditor pattern
function isFounder(user) {
  return user?.user_metadata?.role === 'founder'
}

// ─── Paywall disabled ─────────────────────────────────────────────────────────
// All personal tools are open to any authenticated user. The RPC-driven tier
// check is bypassed so a Supabase outage or stale plan row cannot lock a real
// user out of their own work. Banned / suspended states are still respected via
// user_metadata so we keep a safety lever if needed. Founder logic preserved.
function metaTier(user) {
  const status = user?.user_metadata?.status
  if (status === 'banned')    return 'banned'
  if (status === 'suspended') return 'suspended'
  return 'full'
}

export function useAccess(/* productKey */) {
  const { user, loading: authLoading } = useAuth()
  const [tier, setTier]               = useState(null)
  const [discountPct, setDiscountPct] = useState(0)
  const [loading, setLoading]         = useState(true)
  const [error]                       = useState(null)

  useEffect(() => {
    if (authLoading) return

    // Founder always gets full access
    if (isFounder(user)) {
      setTier('full')
      setDiscountPct(0)
      setLoading(false)
      return
    }

    // Not signed in — gate falls through to the auth prompt
    if (!user) {
      setTier('none')
      setDiscountPct(0)
      setLoading(false)
      return
    }

    // Signed in — open access. No RPC, no network hop, no chance of gating
    // a real user on a backend hiccup.
    setTier(metaTier(user))
    setDiscountPct(0)
    setLoading(false)
  }, [user, authLoading])

  return { tier, discountPct, loading, error }
}

export function hasAccess(tier) {
  return TIER_RANK[tier] >= TIER_RANK['preview']
}

export function hasFullAccess(tier) {
  return TIER_RANK[tier] >= TIER_RANK['beta']
}
