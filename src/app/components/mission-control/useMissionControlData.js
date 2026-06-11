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
//   horizon_practice_checkins — most recent practice check-in
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
    practiceData:   null,   // most recent horizon_practice_checkins row
    foundationData: null,   // horizon_state_summary row
    userRow:        null,   // the users-table row (mission_control_scopes, etc.)
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
          userRowRes,
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

          // Active sprints. The original beta planned three slots
          // (Personal/Relational/Civilisational, slot_index 0/1/2),
          // but the Target Stretch page never sets slot_index when
          // creating a sprint — every row in production has a null
          // slot_index. So we cannot filter on it. Accept anything
          // with status in ['started','active'], ordered most recent
          // first so the panel's index 0 is the primary sprint.
          supabase
            .from('target_sprint_sessions')
            .select('id, domains, domain_data, target_date, status, slot_index, created_at')
            .eq('user_id', user.id)
            .in('status', ['started', 'active'])
            .order('updated_at', { ascending: false }),

          // Most recent practice check-in. The page writes to
          // horizon_practice_checkins (along with _setup, _skills,
          // _loops). An earlier version of this hook queried a stale
          // table name (horizon_practice_sessions) which silently
          // returned null for all users. Use the real table.
          supabase
            .from('horizon_practice_checkins')
            .select('id, check_date, thoughts, emotions, actions, created_at')
            .eq('user_id', user.id)
            .order('check_date', { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from('horizon_state_summary')
            .select('sessions_total, sessions_week, streak_days, avg_delta, last_session_at')
            .eq('user_id', user.id)
            .maybeSingle(),

          // The users row: Mission Control scope visibility, plus
          // location/region (from migration 028) so other surfaces in
          // Mission Control can read them in one round-trip rather
          // than re-querying.
          supabase
            .from('users')
            .select('mission_control_scopes, location, region, dismissed_rail_tools, first_light_completed_at, welcome_scores, welcome_civ_interests, welcome_scale, horizon_state_phase')
            .eq('id', user.id)
            .maybeSingle(),
        ])

        if (cancelled) return

        // Per-query error handling. A failure on any single query
        // (e.g. missing column, RLS, transient network) should NOT
        // nuke the other seven. Log each failure and continue with
        // null for that field. The dashboard surfaces what it can.
        const pick = (res, fallback) => {
          if (res?.error) {
            console.warn('[useMissionControlData] query error:', res.error.message || res.error)
            return fallback
          }
          return res?.data ?? fallback
        }

        setState({
          profile:        pick(profileRes,    null),
          mapData:        pick(mapRes,        []),
          mapResults:     pick(mapResultsRes, null),
          purposeData:    pick(purposeRes,    null),
          sprintData:     pick(sprintRes,     []),
          practiceData:   pick(practiceRes,   null),
          foundationData: pick(foundationRes, null),
          userRow:        pick(userRowRes,    null),
          loading:        false,
          error:          null,
        })
      } catch (err) {
        if (!cancelled) {
          setState({
            profile: null, mapData: null, mapResults: null, purposeData: null,
            sprintData: null, practiceData: null, foundationData: null,
            userRow: null,
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
