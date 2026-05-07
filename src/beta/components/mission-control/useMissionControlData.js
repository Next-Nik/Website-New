// ─────────────────────────────────────────────────────────────
// useMissionControlData.js
//
// One hook, one round-trip. Pulls everything Mission Control needs
// from Supabase for the signed-in user. Reads from existing tables
// (no schema changes):
//
//   horizon_profile           — self wheel scores per dimension
//   map_results               — full Map session (fallback for older
//                               rows where horizon_profile wasn't
//                               populated)
//   purpose_piece_results     — civ placement
//                               (writers have changed shape over
//                               time; we fetch all sources of truth
//                               and resolve at the page layer)
//   target_sprint_sessions    — active sprints
//   horizon_practice_sessions — most recent practice
//   horizon_state_summary     — practice cadence
//   contributor_profiles_beta — display name, contributor metadata
//
// Returns:
//   {
//     user, profile, mapData, mapResults, purposeData, sprintData,
//     practiceData, foundationData, loading, error
//   }
//
// IMPORTANT: purposeData is the *whole row*, not just session.
// purpose_piece_results has gone through three writer eras:
//   v10+   top-level archetype/domain/scale string columns
//   v9-ish profile column with archetype/domain/scale fields
//   pre-v9 only session.tentative.{archetype.archetype, domain.domain,
//          scale.scale} or session.p4Profile
// The page layer walks all sources of truth so any vintage row works.
//
// If the user is not signed in, returns user: null and loading: false
// without making any network calls.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { useAuth } from '../../../hooks/useAuth'

export default function useMissionControlData() {
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState({
    profile:        null,
    mapData:        null,   // array of horizon_profile rows
    mapResults:     null,   // most recent map_results row (full Map session)
    purposeData:    null,   // FULL purpose_piece_results row (all source-of-truth columns)
    sprintData:     null,   // array of active sprint sessions
    practiceData:   null,   // most recent horizon_practice_sessions row
    foundationData: null,   // horizon_state_summary row
    loading:        true,
    error:          null,
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setState(s => ({ ...s, loading: false }))
      return
    }

    let cancelled = false

    async function load() {
      try {
        const [
          profileRes,
          mapRes,
          mapResultsRes,
          purposeRes,
          sprintRes,
          practiceRes,
          foundationRes,
        ] = await Promise.all([
          supabase
            .from('contributor_profiles_beta')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),

          supabase
            .from('horizon_profile')
            .select('domain, current_score, horizon_score, horizon_goal, ia_statement')
            .eq('user_id', user.id),

          // Fallback for users whose Map predates horizon_profile being
          // populated. The session blob holds per-domain scores.
          supabase
            .from('map_results')
            .select('id, session, completed_at, map_data, horizon_goal_user, horizon_goal_system, complete, life_ia_statement')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

          // Pull every column that any era of the writer might have
          // populated. The page layer resolves the right one.
          supabase
            .from('purpose_piece_results')
            .select('session, profile, archetype, domain, scale, status, completed_at, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from('target_sprint_sessions')
            .select('id, domains, domain_data, target_date, status, slot_index, created_at')
            .eq('user_id', user.id)
            .not('slot_index', 'is', null)
            .in('slot_index', [0, 1, 2])
            .in('status', ['started', 'active']),

          supabase
            .from('horizon_practice_sessions')
            .select('focus, skill, today, identity_anchor, session_date')
            .eq('user_id', user.id)
            .order('session_date', { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from('horizon_state_summary')
            .select('sessions_total, sessions_week, streak_days, avg_delta, last_session_at')
            .eq('user_id', user.id)
            .maybeSingle(),
        ])

        if (cancelled) return

        const firstError =
          profileRes.error || mapRes.error || mapResultsRes.error ||
          purposeRes.error || sprintRes.error || practiceRes.error ||
          foundationRes.error

        if (firstError) {
          setState({
            profile: null, mapData: null, mapResults: null, purposeData: null,
            sprintData: null, practiceData: null, foundationData: null,
            loading: false, error: firstError,
          })
          return
        }

        setState({
          profile:        profileRes.data || null,
          mapData:        mapRes.data || [],
          mapResults:     mapResultsRes.data || null,
          purposeData:    purposeRes.data || null,    // FULL ROW
          sprintData:     sprintRes.data || [],
          practiceData:   practiceRes.data || null,
          foundationData: foundationRes.data || null,
          loading:        false,
          error:          null,
        })
      } catch (err) {
        if (!cancelled) {
          setState({
            profile: null, mapData: null, mapResults: null, purposeData: null,
            sprintData: null, practiceData: null, foundationData: null,
            loading: false, error: err,
          })
        }
      }
    }

    setState(s => ({ ...s, loading: true, error: null }))
    load()

    return () => { cancelled = true }
  }, [user, authLoading])

  return {
    user,
    ...state,
  }
}
