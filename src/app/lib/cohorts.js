// src/app/lib/cohorts.js
//
// BP-14 · Client for cohorts (circles). Charter mutations go through the
// SECURITY DEFINER RPCs (server-enforced governance + cap); a member's own
// row (offers, focus line, dormancy, leaving) is edited directly under RLS.
//
// Awareness is offered, never harvested: offering your horizon snapshots the
// line into your membership row — the Map, I Am, Horizon Self and Journal are
// structurally absent here and can never be offered.
//
// Results are checked, not swallowed (CLAUDE.md).

import { supabase } from '../../hooks/useSupabase'
import { getMyHorizonDeclaration } from './horizonDeclaration'

async function uid() {
  try { const { data } = await supabase.auth.getUser(); return data?.user?.id || null }
  catch (_) { return null }
}

// The circles I'm in, with my role and the charter.
export async function listMyCohorts() {
  const id = await uid()
  if (!id) return []
  const { data, error } = await supabase
    .from('cohort_members')
    .select('role, state, cohort:cohort_id(id, name, temperament, governance, size_cap, cadence)')
    .eq('user_id', id)
  if (error) { console.warn('listMyCohorts failed', error.message); return [] }
  return (data || []).filter(r => r.cohort).map(r => ({ ...r.cohort, myRole: r.role, myState: r.state }))
}

export async function getCohort(cohortId) {
  const { data, error } = await supabase
    .from('cohorts')
    .select('id, name, temperament, governance, size_cap, cadence, created_at')
    .eq('id', cohortId)
    .maybeSingle()
  if (error) { console.warn('getCohort failed', error.message); return null }
  return data
}

// Co-members shown as their offered elements only.
export async function getMembers(cohortId) {
  const { data, error } = await supabase
    .from('cohort_members')
    .select('user_id, role, state, focus_line, offer_horizon, offered_horizon_text, offer_moments, joined_at')
    .eq('cohort_id', cohortId)
    .order('joined_at')
  if (error) { console.warn('getMembers failed', error.message); return [] }
  return data || []
}

export async function createCohort({ name, temperament = 'kin', governance = 'stewarded', sizeCap = 12, cadence = null }) {
  const { data, error } = await supabase.rpc('create_cohort', {
    p_name: name, p_temperament: temperament, p_governance: governance,
    p_size_cap: sizeCap, p_cadence: cadence,
  })
  if (error) throw error
  return data  // cohort id
}

export async function addMemberByEmail(cohortId, email) {
  const { data, error } = await supabase.rpc('add_cohort_member_by_email', {
    p_cohort: cohortId, p_email: email,
  })
  if (error) throw error
  return data  // 'added' | 'already in the circle'
}

export async function removeMember(cohortId, userId) {
  const { error } = await supabase.rpc('remove_cohort_member', { p_cohort: cohortId, p_user: userId })
  if (error) throw error
}

export async function updateCharter(cohortId, { name, governance, sizeCap, cadence }) {
  const { error } = await supabase.rpc('update_cohort_charter', {
    p_cohort: cohortId, p_name: name ?? null, p_governance: governance ?? null,
    p_size_cap: sizeCap ?? null, p_cadence: cadence ?? null,
  })
  if (error) throw error
}

// Leaving is quiet: the member's row goes, and their shared moments withdraw
// by cascade. Anytime, no public "left" state.
export async function leaveCohort(cohortId) {
  const id = await uid()
  if (!id) throw new Error('sign in first')
  const { error } = await supabase
    .from('cohort_members').delete()
    .eq('cohort_id', cohortId).eq('user_id', id)
  if (error) throw error
}

// Set what you offer this circle. Offering your horizon snapshots the current
// line; un-offering clears the snapshot.
export async function setOffers(cohortId, { focusLine, offerHorizon, offerMoments, state }) {
  const id = await uid()
  if (!id) throw new Error('sign in first')
  const patch = {}
  if (focusLine !== undefined)   patch.focus_line    = focusLine || null
  if (offerMoments !== undefined) patch.offer_moments = !!offerMoments
  if (state !== undefined)        patch.state         = state
  if (offerHorizon !== undefined) {
    patch.offer_horizon = !!offerHorizon
    if (offerHorizon) {
      const d = await getMyHorizonDeclaration()
      patch.offered_horizon_text = d?.line || null
      if (!d?.line) patch.offer_horizon = false  // nothing to offer yet
    } else {
      patch.offered_horizon_text = null
    }
  }
  const { data, error } = await supabase
    .from('cohort_members').update(patch)
    .eq('cohort_id', cohortId).eq('user_id', id)
    .select('focus_line, offer_horizon, offered_horizon_text, offer_moments, state')
    .single()
  if (error) throw error
  return data
}

// Circle-shared moments — a member shares only their own moment.
export async function shareMomentToCohort(cohortId, momentId) {
  const id = await uid()
  if (!id) throw new Error('sign in first')
  const { error } = await supabase
    .from('cohort_shared_moments')
    .insert({ cohort_id: cohortId, moment_id: momentId, user_id: id })
  if (error) throw error
}

export async function getSharedMoments(cohortId) {
  const { data, error } = await supabase
    .from('cohort_shared_moments')
    .select('id, created_at, moment:moment_id(id, line, image_path, thumb_path, domain, created_at)')
    .eq('cohort_id', cohortId)
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) { console.warn('getSharedMoments failed', error.message); return [] }
  return (data || []).map(r => r.moment).filter(Boolean)
}

export async function getFire(cohortId, days = 7) {
  const { data, error } = await supabase.rpc('cohort_fire', { p_cohort: cohortId, p_days: days })
  if (error) return 0
  return data || 0
}
