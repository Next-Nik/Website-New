// src/beta/hooks/useViewerContext.js
// Loads the signed-in viewer's contributor profile, their active focus,
// and the full ancestor chain for that focus (used by the Local feed tab).
// Also assembles a list of sprint-buddy user-ids for the People tab.

import { useState, useEffect } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'

export function useViewerContext() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }

    let cancelled = false

    async function load() {
      setLoading(true)

      // Viewer's contributor profile + their purpose piece scale (for cohort match)
      const [profileRes, purposeRes] = await Promise.all([
        supabase
          .from('contributor_profiles_beta')
          .select('user_id, display_name, location_focus_id, engaged_civ_domains, engaged_self_domains')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('purpose_piece_results')
          .select('session, profile')
          .eq('user_id', user.id)
          .eq('status', 'complete')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      const profile = profileRes.data || null
      const purpose = purposeRes.data || null

      // Viewer's scale, from purpose piece
      const viewerScale =
        purpose?.session?.tentative?.scale?.scale ||
        purpose?.profile?.scale ||
        null

      // Resolve focus ancestor chain — the viewer's own focus + every ancestor
      let focusIds = []
      let activeFocus = null
      if (profile?.location_focus_id) {
        const trail = []
        let currentId = profile.location_focus_id
        // Walk up at most 8 levels (planet > continent > nation > province > city > neighbourhood is 6)
        for (let i = 0; i < 8 && currentId; i++) {
          const { data: f } = await supabase
            .from('nextus_focuses')
            .select('id, name, slug, type, parent_id')
            .eq('id', currentId)
            .maybeSingle()
          if (cancelled) return
          if (!f) break
          trail.push(f)
          if (i === 0) activeFocus = f
          currentId = f.parent_id
        }
        focusIds = trail.map(f => f.id)
      }

      // Sprint-buddy user-ids: bilateral artefacts of type sprint_buddy where
      // the viewer is a party and both consents are present.
      const { data: buddyRows } = await supabase
        .from('bilateral_artefacts_beta')
        .select('party_a_user_id, party_b_user_id')
        .eq('artefact_type', 'sprint_buddy')
        .eq('party_a_consent', true)
        .eq('party_b_consent', true)
        .or(`party_a_user_id.eq.${user.id},party_b_user_id.eq.${user.id}`)

      const sprintBuddyIds = (buddyRows || [])
        .map(r => r.party_a_user_id === user.id ? r.party_b_user_id : r.party_a_user_id)
        .filter(Boolean)

      if (cancelled) return

      setData({
        userId:          user.id,
        displayName:     profile?.display_name || user.user_metadata?.full_name || null,
        engagedCivDomains: profile?.engaged_civ_domains || [],
        engagedSelfDomains:profile?.engaged_self_domains || [],
        locationFocusId: profile?.location_focus_id || null,
        activeFocus,
        focusIds,            // viewer's focus + every ancestor
        viewerScale,         // for loose cohort match
        sprintBuddyIds,
      })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [user, authLoading])

  return { user, data, loading: authLoading || loading }
}
