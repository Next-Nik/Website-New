// src/beta/hooks/usePublicProfile.js
// Fetches all data required to render /beta/profile/:id.
// Returns structured profile data, loading state, and error.

import { useState, useEffect } from 'react'
import { supabase } from '../../hooks/useSupabase'

export function usePublicProfile(userId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        ] = await Promise.all([
          // contributor_profiles_beta — profile fields + engaged domains
          supabase
            .from('contributor_profiles_beta')
            .select('display_name, headline, location_focus_id, what_i_stand_for, count_on_me_for, dont_count_on_me_for, engaged_civ_domains, engaged_self_domains, engaged_principles')
            .eq('user_id', userId)
            .maybeSingle(),

          // horizon_profile — per-domain scores, ia_statements
          supabase
            .from('horizon_profile')
            .select('domain, current_score, horizon_score, horizon_goal, ia_statement, source, last_updated')
            .eq('user_id', userId),

          // target_sprint_sessions — active and completed, public only
          supabase
            .from('target_sprint_sessions')
            .select('id, domains, domain_data, target_date, end_date_label, status, created_at, completed_at')
            .eq('user_id', userId)
            .in('status', ['active', 'complete'])
            .order('created_at', { ascending: false })
            .limit(10),

          // purpose_piece_results — archetype, civ domain, scale
          supabase
            .from('purpose_piece_results')
            .select('profile, session, archetype, domain_id, scale, civilisational_statement, completed_at, status')
            .eq('user_id', userId)
            .eq('status', 'complete')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

          // principle_taggings for this contributor
          supabase
            .from('principle_taggings')
            .select('principle_slug, weight')
            .eq('target_type', 'contributor')
            .eq('target_id', userId),
        ])

        if (cancelled) return

        // Resolve location focus name if present
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

        // ── Public affiliations — Places section ──────────────────────────
        // Read all public affiliations for this user; resolve each to its
        // Focus row; resolve each Focus's ancestor chain via the
        // focus_ancestors() SQL function (migration 047).
        //
        // RLS guarantees only `visibility = 'public'` rows are visible to a
        // non-owner reader. We still filter explicitly to be defensive in
        // case the reader is the owner.
        const { data: affiliationRows } = await supabase
          .from('nextus_user_affiliations')
          .select('id, focus_id, relationship_type, visibility, declared_at')
          .eq('user_id', userId)
          .eq('visibility', 'public')
          .order('declared_at', { ascending: true })

        let affiliations = []
        if (affiliationRows && affiliationRows.length > 0) {
          const focusIds = Array.from(new Set(affiliationRows.map(r => r.focus_id)))
          const { data: focuses } = await supabase
            .from('nextus_focuses')
            .select('id, name, type, kind, slug, parent_id')
            .in('id', focusIds)
          const focusMap = Object.fromEntries((focuses || []).map(f => [f.id, f]))

          // Fetch ancestor chains in parallel. The RPC returns ordered rows.
          const ancestorEntries = await Promise.all(
            focusIds.map(async (fid) => {
              const { data: ancs } = await supabase.rpc('focus_ancestors', { p_focus_id: fid })
              return [fid, ancs || []]
            })
          )
          const ancestorMap = Object.fromEntries(ancestorEntries)

          affiliations = affiliationRows
            .filter(r => focusMap[r.focus_id])  // drop any orphaned references
            .map(r => ({
              id: r.id,
              relationship_type: r.relationship_type,
              visibility: r.visibility,
              declared_at: r.declared_at,
              focus: focusMap[r.focus_id],
              ancestors: ancestorMap[r.focus_id] || [],
            }))
        }

        if (cancelled) return

        // Resolve public artefact visibility — default private, only render if public
        const { data: visibilityRows } = await supabase
          .from('artefact_visibility')
          .select('artefact_type, artefact_id, visibility')
          .eq('user_id', userId)

        if (cancelled) return

        const visibilityMap = {}
        ;(visibilityRows || []).forEach(row => {
          visibilityMap[`${row.artefact_type}:${row.artefact_id}`] = row.visibility
        })

        // Build horizon profile keyed by domain
        const horizonByDomain = {}
        ;(horizonRes.data || []).forEach(row => {
          horizonByDomain[row.domain] = row
        })

        // Filter sprints by visibility — default private
        const allSprints = sprintsRes.data || []
        const publicSprints = allSprints.filter(s => {
          const key = `sprint:${s.id}`
          const vis = visibilityMap[key]
          return vis === 'public'
        })

        // IA statements — from horizon_profile, filter by visibility
        const iaStatements = Object.entries(horizonByDomain)
          .filter(([domain, row]) => {
            if (!row.ia_statement) return false
            const key = `ia_statement:${domain}`
            return visibilityMap[key] === 'public'
          })
          .map(([domain, row]) => ({ domain, statement: row.ia_statement }))

        // Self wheel — filter domains by visibility
        const selfWheelPublic = {}
        Object.entries(horizonByDomain).forEach(([domain, row]) => {
          const key = `wheel_self:${domain}`
          if (visibilityMap[key] === 'public') {
            selfWheelPublic[domain] = row
          }
        })

        // Civ wheel — from engaged_civ_domains, filter by visibility
        const engagedCivDomains = profileRes.data?.engaged_civ_domains || []
        const civWheelPublic = engagedCivDomains.filter(slug => {
          const key = `wheel_civ:${slug}`
          return visibilityMap[key] === 'public'
        })

        // Purpose piece result
        const purpose = purposeRes.data
        const purposeProfile = purpose?.profile || {}
        // v10 writes top-level columns; v9 wrote to session.tentative — read both
        const purposeSession = purpose?.session?.tentative || {}
        const purposeArchetype = purpose?.archetype || purposeSession?.archetype?.archetype || null
        const purposeSecondary = purposeSession?.archetype?.secondary || null
        const purposeDomain    = purpose?.domain_id || purposeSession?.domain?.domain || null
        const purposeScale     = purpose?.scale || purposeSession?.scale?.scale || null
        const purposeStatement = purpose?.civilisational_statement || purposeProfile?.civilisational_statement || null

        if (!cancelled) {
          setData({
            profile: profileRes.data || {},
            focusName,
            horizonByDomain,
            selfWheelPublic,
            civWheelPublic,
            iaStatements,
            activeSprints: publicSprints.filter(s => s.status === 'active').slice(0, 3),
            completedSprints: publicSprints.filter(s => s.status === 'complete'),
            purpose: {
              archetype: purposeArchetype,
              secondary: purposeSecondary,
              domain:    purposeDomain,
              scale:     purposeScale,
              statement: purposeStatement,
            },
            principleTaggings: principlesRes.data || [],
            affiliations,
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
