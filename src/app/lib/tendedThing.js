// src/app/lib/tendedThing.js
//
// BP-11 · Read/grow the tended thing. Grows ONLY on real action — tend() is
// called from the challenge check-in path (log_strand). It never decays: an
// absence is met with derived dimming (see restStateFromLast), never with a
// stored loss, and one real act rewakes it. No guilt mechanics, ever.
//
// Results are checked, never silently swallowed (CLAUDE.md).

import { supabase } from '../../hooks/useSupabase'

export const MAX_STAGE = 4  // 0 seed · 1 roots · 2 sprout · 3 leaves · 4 thriving

async function currentUserId() {
  try {
    const { data } = await supabase.auth.getUser()
    return data?.user?.id || null
  } catch (_) { return null }
}

// The person's living thing for one challenge, or null if not yet lit.
export async function getTendedThing(challengeId) {
  const uid = await currentUserId()
  if (!uid || !challengeId) return null
  const { data, error } = await supabase
    .from('tended_things')
    .select('stage, tend_count, last_tended_at')
    .eq('user_id', uid)
    .eq('challenge_id', challengeId)
    .maybeSingle()
  if (error) { console.warn('tended read failed', error.message); return null }
  return data || null
}

// A real act. Advances one stage toward thriving (never past), refreshes the
// wake time. Idempotent-ish: two check-ins on one day still only advance the
// living thing — belonging felt as growth, not a points race.
export async function tendThing(challengeId) {
  const uid = await currentUserId()
  if (!uid || !challengeId) return null
  const current = await getTendedThing(challengeId)
  const nextStage = Math.min(MAX_STAGE, (current?.stage ?? 0) + 1)
  const nextCount = (current?.tend_count ?? 0) + 1
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('tended_things')
    .upsert(
      { user_id: uid, challenge_id: challengeId, stage: nextStage,
        tend_count: nextCount, last_tended_at: now, updated_at: now },
      { onConflict: 'user_id,challenge_id' }
    )
    .select('stage, tend_count, last_tended_at')
    .single()
  if (error) { console.warn('tend failed', error.message); return current }
  return data
}

// The communal grove — aggregate stage counts, no identities (SECURITY
// DEFINER RPC). Returns { total, byStage: {0..4} }.
export async function getGroveCounts(challengeId) {
  if (!challengeId) return { total: 0, byStage: {} }
  const { data, error } = await supabase
    .rpc('grove_stage_counts', { p_challenge_id: challengeId })
  if (error) { console.warn('grove read failed', error.message); return { total: 0, byStage: {} } }
  const byStage = {}
  let total = 0
  for (const row of data || []) { byStage[row.stage] = Number(row.n); total += Number(row.n) }
  return { total, byStage }
}

// Derive the rest state from last_tended_at. Never "dead" — the living thing
// only rests and wakes. Grace, not guilt.
export function restStateFromLast(lastTendedAt) {
  if (!lastTendedAt) return 'new'
  const days = (Date.now() - new Date(lastTendedAt).getTime()) / 86400000
  if (days < 3)  return 'awake'
  if (days < 8)  return 'dim'
  return 'rest'
}
