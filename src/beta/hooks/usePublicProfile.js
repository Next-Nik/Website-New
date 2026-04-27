// src/beta/hooks/usePublicProfile.js
// Fetches all data required to render /beta/profile/:id.
// Module 10 addition: fetches published bilateral artefacts and resolves party names.

import { useState, useEffect } from 'react'
import { supabase } from '../../hooks/useSupabase'

export function usePublicProfile(userId) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [
          profileRes,
          horizonRes,
          sprintsRes,
          purposeRes,
          principlesRes,
          bilateralRes,
        ] = await Promise.all([
          supabase
            .from('contributor_profiles_beta')
            .select('display_name, headline, location_focus_id, what_i_stand_for, count_on_me_for, dont_count_on_me_for, engaged_civ_domains, engaged_self_domains, engaged_principles')
            .eq('user_id', userId)
            .maybeSingle(),

          supabase
            .from('horizon_profile')
            .select('domain, current_score, horizon_score, horizon_goal, ia_statement, source, last_updated')
            .eq('user_id', userId),

          supabase
            .from('target_sprint_sessions')
            .select('id, domains, domain_data, target_date, end_date_label, status, created_at, completed_at')
            .eq('user_id', userId)
            .in('status', ['active', 'complete'])
            .order('created_at', { ascending: false })
            .limit(10),

          supabase
            .from('purpose_piece_results')
            .select('profile, session, completed_at, status')
            .eq('user_id', userId)
            .eq('status', 'complete')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from('principle_taggings')
            .select('principle_slug, weight')
            .eq('target_type', 'contributor')
            .eq('target_id', userId),

          // Module 10: published bilateral artefacts where this user is a party
          supabase
            .from('bilateral_artefacts_beta')
            .select('id, artefact_type, party_a_user_id, party_b_user_id, party_b_actor_id, payload, updated_at')
            .or(`party_a_user_id.eq.${userId},party_b_user_id.eq.${userId}`)
            .eq('published', true)
            .eq('party_a_consent', true)
            .eq('party_b_consent', true)
            .order('updated_at', { ascending: false }),
        ])

        if (cancelled) return

        // ── Standard Module 2 data resolution ──────────────

        let focusName = null
        const focusId = profileRes.data?.location_focus_id
        if (focusId) {
          const { data: focus } = await supabase
            .from('nextus_focuses')
            .select('name')
            .eq('id', focusId)
            .maybeSingle()
          if (!cancelled) focusName = focus?.name || null
        }

        const { data: visibilityRows } = await supabase
          .from('artefact_visibility')
          .select('artefact_type, artefact_id, visibility')
          .eq('user_id', userId)

        if (cancelled) return

        const visibilityMap = {}
        ;(visibilityRows || []).forEach(row => {
          visibilityMap[`${row.artefact_type}:${row.artefact_id}`] = row.visibility
        })

        const horizonByDomain = {}
        ;(horizonRes.data || []).forEach(row => {
          horizonByDomain[row.domain] = row
        })

        const allSprints   = sprintsRes.data || []
        const publicSprints = allSprints.filter(s => visibilityMap[`sprint:${s.id}`] === 'public')

        const iaStatements = Object.entries(horizonByDomain)
          .filter(([domain, row]) => row.ia_statement && visibilityMap[`ia_statement:${domain}`] === 'public')
          .map(([domain, row]) => ({ domain, statement: row.ia_statement }))

        const selfWheelPublic = {}
        Object.entries(horizonByDomain).forEach(([domain, row]) => {
          if (visibilityMap[`wheel_self:${domain}`] === 'public') {
            selfWheelPublic[domain] = row
          }
        })

        const engagedCivDomains = profileRes.data?.engaged_civ_domains || []
        const civWheelPublic    = engagedCivDomains.filter(slug => visibilityMap[`wheel_civ:${slug}`] === 'public')

        const purpose        = purposeRes.data
        const purposeProfile = purpose?.profile || {}
        const purposeSession = purpose?.session?.tentative || {}

        // ── Module 10: resolve party names for bilateral cards ──

        const bilaterals = bilateralRes.data || []

        // Collect all user-ids we need names for (excluding this profile's user)
        const otherUserIds = new Set()
        const actorIds     = new Set()
        bilaterals.forEach(b => {
          const other = b.party_a_user_id === userId ? b.party_b_user_id : b.party_a_user_id
          if (other) otherUserIds.add(other)
          if (b.party_b_actor_id) actorIds.add(b.party_b_actor_id)
        })

        const [profileNames, actorNames] = await Promise.all([
          otherUserIds.size > 0
            ? supabase
                .from('contributor_profiles_beta')
                .select('user_id, display_name')
                .in('user_id', [...otherUserIds])
            : { data: [] },
          actorIds.size > 0
            ? supabase
                .from('nextus_actors')
                .select('id, name')
                .in('id', [...actorIds])
            : { data: [] },
        ])

        if (cancelled) return

        const nameMap  = {}
        ;(profileNames.data || []).forEach(r => { nameMap[r.user_id] = r.display_name })
        const actorMap = {}
        ;(actorNames.data  || []).forEach(r => { actorMap[r.id]      = r.name })

        // Attach resolved names to each bilateral row
        const bilateralsWithNames = bilaterals.map(b => {
          const partyAName = b.party_a_user_id === userId
            ? (profileRes.data?.display_name || 'You')
            : (nameMap[b.party_a_user_id] || null)

          const partyBName = b.party_b_actor_id
            ? (actorMap[b.party_b_actor_id] || null)
            : b.party_b_user_id === userId
              ? (profileRes.data?.display_name || 'You')
              : (nameMap[b.party_b_user_id] || null)

          return {
            ...b,
            _partyAName:  partyAName,
            _partyAId:    b.party_a_user_id,
            _partyBName:  partyBName,
            _partyBId:    b.party_b_actor_id || b.party_b_user_id,
            _partyBIsOrg: !!b.party_b_actor_id,
          }
        })

        if (!cancelled) {
          setData({
            profile: profileRes.data || {},
            focusName,
            horizonByDomain,
            selfWheelPublic,
            civWheelPublic,
            iaStatements,
            activeSprints:    publicSprints.filter(s => s.status === 'active').slice(0, 3),
            completedSprints: publicSprints.filter(s => s.status === 'complete'),
            purpose: {
              archetype: purposeSession?.archetype?.archetype || null,
              secondary: purposeSession?.archetype?.secondary || null,
              domain:    purposeSession?.domain?.domain       || null,
              scale:     purposeSession?.scale?.scale         || null,
              statement: purposeProfile?.civilisational_statement || null,
            },
            principleTaggings: principlesRes.data || [],
            bilaterals:        bilateralsWithNames,   // Module 10
          })
        }
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  return { data, loading, error }
}
