// ─────────────────────────────────────────────────────────────
// useMissionControlData.js
//
// One hook, one round-trip. Pulls everything Mission Control needs
// from Supabase for the signed-in user. Reads from existing tables
// (no schema changes):
//
//   horizon_profile           — self wheel scores per dimension
//   purpose_piece_results     — civ placement (archetype, domain, scale)
//   target_sprint_sessions    — active sprints
//   horizon_practice_sessions — most recent practice
//   horizon_state_summary     — practice cadence
//   contributor_profiles_beta — display name, contributor metadata
//
// Returns:
//   {
//     user, profile, mapData, purposeData, sprintData,
//     practiceData, foundationData, loading, error
//   }
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
    mapData:        null,   // array of { domain, current_score, horizon_score, horizon_goal, ia_statement }
    purposeData:    null,   // most recent purpose_piece_results.session
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

          supabase
            .from('purpose_piece_results')
            .select('session, updated_at')
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
          profileRes.error || mapRes.error || purposeRes.error ||
          sprintRes.error || practiceRes.error || foundationRes.error

        if (firstError) {
          setState({
            profile: null, mapData: null, purposeData: null,
            sprintData: null, practiceData: null, foundationData: null,
            loading: false, error: firstError,
          })
          return
        }

        setState({
          profile:        profileRes.data || null,
          mapData:        mapRes.data || [],
          purposeData:    purposeRes.data?.session || null,
          sprintData:     sprintRes.data || [],
          practiceData:   practiceRes.data || null,
          foundationData: foundationRes.data || null,
          loading:        false,
          error:          null,
        })
      } catch (err) {
        if (!cancelled) {
          setState({
            profile: null, mapData: null, purposeData: null,
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
