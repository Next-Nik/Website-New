// ─────────────────────────────────────────────────────────────
// onboarding.js
//
// First Light is a lightweight placement across the seven personal
// domains. The Map is the deep version of the same act. So anyone
// who has engaged the Map has already done — more thoroughly — what
// First Light asks. They should neither be walled into First Light
// nor re-prompted for it.
// ─────────────────────────────────────────────────────────────

import { supabase } from '../../hooks/useSupabase'

// True if the user has any placed Map score (horizon_profile) or a
// completed map_results row. Fails closed to `false` so an error
// never suppresses a legitimately-needed prompt — but also never
// walls anyone (the callers treat the throw as "no engagement").
export async function hasMapEngagement(userId) {
  if (!userId) return false
  try {
    const [profileRes, mapRes] = await Promise.all([
      supabase
        .from('horizon_profile')
        .select('domain', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('current_score', 'is', null),
      supabase
        .from('map_results')
        .select('complete, completed_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if ((profileRes?.count || 0) > 0) return true
    if (mapRes?.data?.complete || mapRes?.data?.completed_at) return true
    return false
  } catch {
    return false
  }
}
