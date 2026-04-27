// src/beta/hooks/useFeed.js
// Assembles a feed for one of three tabs from many underlying tables.
// All public artefacts are filtered through artefact_visibility.
// Practice events and need posts are public by definition.
//
// Returns a normalised array of feed items, each with:
//   { id, type, timestamp, ... type-specific fields }
//
// Pagination is in-memory: we fetch a generous window from each source,
// normalise, sort by timestamp desc, then page client-side. This keeps the
// query simple and avoids cross-table cursor logic that would be brittle.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../hooks/useSupabase'

const PAGE_SIZE      = 20
const MAX_PAGES      = 5
const FETCH_WINDOW   = 200  // per-source soft cap when assembling the feed

// ── Helpers ──────────────────────────────────────────────────

// Build a Map from visibility rows.
// Key = `${user_id}:${artefact_type}:${artefact_id}` -> visibility
// Per-user scoping prevents collisions when two users have visibility rows
// for the same artefact_type+artefact_id pair (e.g. ia_statement:body).
function buildVisibilityMap(rows) {
  const map = new Map()
  ;(rows || []).forEach(r => {
    map.set(`${r.user_id}:${r.artefact_type}:${r.artefact_id}`, r.visibility)
  })
  return map
}

function isPublic(map, userId, artefactType, artefactId) {
  return map.get(`${userId}:${artefactType}:${artefactId}`) === 'public'
}

// Loose cohort match: scale rank distance <= 1, OR any shared engaged_civ_domain
const SCALE_RANK = {
  local: 0, municipal: 1, 'state-province': 2, national: 3,
  regional: 4, international: 5, global: 6, civilisational: 7,
}

function looseScaleMatch(viewerScale, otherScale) {
  if (!viewerScale || !otherScale) return false
  const a = SCALE_RANK[viewerScale]
  const b = SCALE_RANK[otherScale]
  if (a == null || b == null) return false
  return Math.abs(a - b) <= 1
}

// ── Tab filters ──────────────────────────────────────────────
//
// Each returns a list of user_ids whose contributor / sprint / practice events
// should be included. For Local, also returns actor_ids for orgs in the
// viewer's focus tree (so org Need posts show up).

async function resolveCohortFilter(viewerCtx) {
  if (!viewerCtx) return { userIds: [], actorIds: [] }

  // Match users whose engaged_civ_domains overlap with the viewer's
  // OR whose purpose_piece scale is within one rank of the viewer's
  const overlap = viewerCtx.engagedCivDomains || []

  const filters = []
  if (overlap.length > 0) {
    // Postgrest `overlaps` operator on text[]
    filters.push(`engaged_civ_domains.ov.{${overlap.join(',')}}`)
  }

  let cohortUserIds = new Set()

  if (filters.length > 0) {
    const { data } = await supabase
      .from('contributor_profiles_beta')
      .select('user_id')
      .or(filters.join(','))
      .neq('user_id', viewerCtx.userId)
      .limit(500)
    ;(data || []).forEach(r => cohortUserIds.add(r.user_id))
  }

  // Also pull users at a similar scale via purpose_piece_results
  if (viewerCtx.viewerScale) {
    const { data: ppRows } = await supabase
      .from('purpose_piece_results')
      .select('user_id, session, profile')
      .eq('status', 'complete')
      .neq('user_id', viewerCtx.userId)
      .limit(500)

    ;(ppRows || []).forEach(r => {
      const otherScale = r.session?.tentative?.scale?.scale || r.profile?.scale
      if (looseScaleMatch(viewerCtx.viewerScale, otherScale)) {
        cohortUserIds.add(r.user_id)
      }
    })
  }

  return { userIds: [...cohortUserIds], actorIds: [] }
}

async function resolveLocalFilter(viewerCtx) {
  if (!viewerCtx || viewerCtx.focusIds.length === 0) {
    return { userIds: [], actorIds: [] }
  }

  // Users whose location_focus_id is the viewer's focus or any ancestor
  const { data: localUsers } = await supabase
    .from('contributor_profiles_beta')
    .select('user_id')
    .in('location_focus_id', viewerCtx.focusIds)
    .neq('user_id', viewerCtx.userId)
    .limit(500)

  // Actors whose focus_id is the viewer's focus or any ancestor
  const { data: localActors } = await supabase
    .from('nextus_actors')
    .select('id')
    .in('focus_id', viewerCtx.focusIds)
    .limit(500)

  return {
    userIds:  (localUsers  || []).map(r => r.user_id),
    actorIds: (localActors || []).map(r => r.id),
  }
}

async function resolvePeopleFilter(viewerCtx) {
  if (!viewerCtx) return { userIds: [], actorIds: [] }
  // Sprint buddies + anyone the viewer has a published bilateral with.
  // For the people tab, the bilateral items themselves are the spine, and we
  // also surface the buddies' sprint / IA / practice activity.
  return { userIds: viewerCtx.sprintBuddyIds || [], actorIds: [] }
}

// ── Source fetchers ──────────────────────────────────────────
// Each returns an array of normalised items, or [] if the filter is empty.

async function fetchVisibilityRowsFor(userIds) {
  if (userIds.length === 0) return []
  const { data } = await supabase
    .from('artefact_visibility')
    .select('user_id, artefact_type, artefact_id, visibility')
    .in('user_id', userIds)
    .eq('visibility', 'public')
    .limit(2000)
  return data || []
}

async function fetchProfilesFor(userIds) {
  if (userIds.length === 0) return new Map()
  const { data } = await supabase
    .from('contributor_profiles_beta')
    .select('user_id, display_name')
    .in('user_id', userIds)
  const map = new Map()
  ;(data || []).forEach(r => map.set(r.user_id, r))
  return map
}

async function fetchSprintItems(userIds, visibilityMap, profileMap) {
  if (userIds.length === 0) return []
  const { data } = await supabase
    .from('target_sprint_sessions')
    .select('id, user_id, domains, domain_data, status, created_at, completed_at, updated_at')
    .in('user_id', userIds)
    .in('status', ['active', 'complete'])
    .order('updated_at', { ascending: false })
    .limit(FETCH_WINDOW)

  const items = []
  for (const s of (data || [])) {
    if (!isPublic(visibilityMap, s.user_id, 'sprint', s.id)) continue
    const actor = profileMap.get(s.user_id) || { user_id: s.user_id }
    const actorObj = { id: s.user_id, display_name: actor.display_name }

    if (s.status === 'active') {
      items.push({
        id:        `sprint_launched:${s.id}`,
        type:      'sprint_launched',
        timestamp: s.created_at,
        actor:     actorObj,
        sprint:    s,
      })
    } else if (s.status === 'complete') {
      // Sprint-completion artefact has a separate visibility key
      if (!isPublic(visibilityMap, s.user_id, 'sprint_completion', s.id)) continue
      items.push({
        id:        `sprint_completed:${s.id}`,
        type:      'sprint_completed',
        timestamp: s.completed_at || s.updated_at,
        actor:     actorObj,
        sprint:    s,
      })
    }
  }
  return items
}

async function fetchIAStatementItems(userIds, visibilityMap, profileMap) {
  if (userIds.length === 0) return []
  // ia_statements live on horizon_profile rows (one per user-domain)
  const { data } = await supabase
    .from('horizon_profile')
    .select('user_id, domain, ia_statement, last_updated')
    .in('user_id', userIds)
    .not('ia_statement', 'is', null)
    .order('last_updated', { ascending: false })
    .limit(FETCH_WINDOW)

  const items = []
  for (const row of (data || [])) {
    // Module 1 schema: ia_statement visibility is keyed per-user by domain.
    if (!isPublic(visibilityMap, row.user_id, 'ia_statement', row.domain)) continue

    const profile = profileMap.get(row.user_id) || { user_id: row.user_id }
    items.push({
      id:        `ia_statement:${row.user_id}:${row.domain}`,
      type:      'ia_statement',
      timestamp: row.last_updated,
      actor:     { id: row.user_id, display_name: profile.display_name },
      domain:    row.domain,
      statement: row.ia_statement,
    })
  }
  return items
}

async function fetchNeedItems(actorIds) {
  if (actorIds.length === 0) return []

  // Needs are public by definition when the parent actor's needs_visible !== false.
  // Pull actors first to filter visibility, then fetch needs.
  const { data: actors } = await supabase
    .from('nextus_actors')
    .select('id, name, focus_id, needs_visible, scale')
    .in('id', actorIds)

  const visibleActorIds = (actors || [])
    .filter(a => a.needs_visible !== false)
    .map(a => a.id)

  if (visibleActorIds.length === 0) return []

  const actorMap = new Map((actors || []).map(a => [a.id, a]))

  const { data: needs } = await supabase
    .from('nextus_needs')
    .select('id, actor_id, title, description, need_type, size, medium, time_estimate, status, created_at')
    .in('actor_id', visibleActorIds)
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(FETCH_WINDOW)

  return (needs || []).map(n => ({
    id:        `need:${n.id}`,
    type:      'need_posted',
    timestamp: n.created_at,
    actor:     actorMap.get(n.actor_id) || { id: n.actor_id, name: 'An organisation' },
    need:      n,
  }))
}

async function fetchBilateralItems(viewerCtx, visibilityMap) {
  if (!viewerCtx) return []
  // For the People tab we surface every published bilateral the viewer is
  // party to. For Cohort / Local we don't surface bilaterals (they're the
  // viewer's own; not for the broader stream).
  const { data } = await supabase
    .from('bilateral_artefacts_beta')
    .select('id, artefact_type, party_a_user_id, party_b_user_id, party_b_actor_id, payload, published, created_at, updated_at')
    .eq('published', true)
    .or(`party_a_user_id.eq.${viewerCtx.userId},party_b_user_id.eq.${viewerCtx.userId}`)
    .order('updated_at', { ascending: false })
    .limit(FETCH_WINDOW)

  const items = []
  for (const b of (data || [])) {
    // Resolve the two parties
    const otherUserId = b.party_a_user_id === viewerCtx.userId ? b.party_b_user_id : b.party_a_user_id
    const partyAUserId = b.party_a_user_id

    // Fetch display names for both user parties (one of which is viewer)
    const userIdsToLookup = [partyAUserId, otherUserId].filter(Boolean)
    let nameMap = new Map()
    if (userIdsToLookup.length > 0) {
      const { data: profs } = await supabase
        .from('contributor_profiles_beta')
        .select('user_id, display_name')
        .in('user_id', userIdsToLookup)
      ;(profs || []).forEach(p => nameMap.set(p.user_id, p.display_name))
    }

    let partyB
    if (b.party_b_actor_id) {
      const { data: actor } = await supabase
        .from('nextus_actors')
        .select('id, name')
        .eq('id', b.party_b_actor_id)
        .maybeSingle()
      partyB = { kind: 'org', id: actor?.id, name: actor?.name || 'an organisation' }
    } else if (b.party_b_user_id) {
      partyB = { kind: 'user', id: b.party_b_user_id, display_name: nameMap.get(b.party_b_user_id) || 'someone' }
    }

    items.push({
      id:        `bilateral:${b.id}`,
      type:      'bilateral_published',
      timestamp: b.updated_at || b.created_at,
      partyA:    { id: partyAUserId, display_name: nameMap.get(partyAUserId) || 'someone' },
      partyB,
      artefactType: b.artefact_type,
      payload:   b.payload || {},
    })
  }
  return items
}

async function fetchPracticeContributedItems(userIds, profileMap) {
  // Practices are public by design — contributor-led population. No visibility filter.
  // For Cohort: pull practices from cohort users.
  // For Local: pull practices from local users.
  // For "everyone" (no userIds filter): we don't broaden — the spec is per-tab.
  if (userIds.length === 0) return []

  const { data } = await supabase
    .from('practices_beta')
    .select('id, slug, title, practice_kind, domains, platform_principles, contributor_id, created_at')
    .in('contributor_id', userIds)
    .order('created_at', { ascending: false })
    .limit(FETCH_WINDOW)

  // Make sure profileMap covers every contributor we need
  const missingUserIds = (data || [])
    .map(p => p.contributor_id)
    .filter(uid => !profileMap.has(uid))

  if (missingUserIds.length > 0) {
    const extraMap = await fetchProfilesFor(missingUserIds)
    for (const [k, v] of extraMap) profileMap.set(k, v)
  }

  return (data || []).map(p => {
    const prof = profileMap.get(p.contributor_id) || { user_id: p.contributor_id }
    return {
      id:        `practice_contributed:${p.id}`,
      type:      'practice_contributed',
      timestamp: p.created_at,
      actor:     { id: p.contributor_id, display_name: prof.display_name },
      practice:  p,
    }
  })
}

async function fetchPracticeAttestedItems(userIds, profileMap) {
  if (userIds.length === 0) return []

  const { data } = await supabase
    .from('practice_attestations')
    .select('id, practice_id, attester_user_id, attester_role, created_at, practices_beta(id, slug, title)')
    .in('attester_user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(FETCH_WINDOW)

  const missingUserIds = (data || [])
    .map(a => a.attester_user_id)
    .filter(uid => !profileMap.has(uid))

  if (missingUserIds.length > 0) {
    const extraMap = await fetchProfilesFor(missingUserIds)
    for (const [k, v] of extraMap) profileMap.set(k, v)
  }

  return (data || []).map(a => {
    const prof = profileMap.get(a.attester_user_id) || { user_id: a.attester_user_id }
    return {
      id:        `practice_attested:${a.id}`,
      type:      'practice_attested',
      timestamp: a.created_at,
      actor:     { id: a.attester_user_id, display_name: prof.display_name },
      attesterRole: a.attester_role,
      practice:  a.practices_beta || null,
    }
  })
}

// ── In-person bias ───────────────────────────────────────────
//
// Within a single timestamp bucket of 12 hours, in-person needs
// surface above digital ones. We achieve this by computing a small
// per-item "bias_offset" added to the timestamp during sort.

function applyInPersonBias(items) {
  // Add a virtual 12-hour boost to in-person Need items so they cluster above
  // contemporaneous digital ones. Doesn't affect their visible time-ago label.
  return items.map(item => {
    let sortTime = new Date(item.timestamp).getTime()
    if (item.type === 'need_posted' && item.need?.medium === 'in_person') {
      sortTime += 12 * 60 * 60 * 1000
    }
    return { ...item, _sortTime: sortTime }
  })
}

// ── Main hook ────────────────────────────────────────────────

export function useFeed(tab, viewerCtx) {
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)

  const load = useCallback(async () => {
    if (!viewerCtx) { setAllItems([]); setLoading(false); return }
    setLoading(true)

    // Resolve which user-ids and actor-ids feed this tab
    let filter
    if (tab === 'cohort')      filter = await resolveCohortFilter(viewerCtx)
    else if (tab === 'local')  filter = await resolveLocalFilter(viewerCtx)
    else                        filter = await resolvePeopleFilter(viewerCtx)

    const { userIds, actorIds } = filter

    // Pre-fetch visibility rows + profile names in two batched calls
    const [visibilityRows, profileMap] = await Promise.all([
      fetchVisibilityRowsFor(userIds),
      fetchProfilesFor(userIds),
    ])
    const visibilityMap = buildVisibilityMap(visibilityRows)

    // Fan out to the source fetchers in parallel
    const sources = await Promise.all([
      fetchSprintItems(userIds, visibilityMap, profileMap),
      fetchIAStatementItems(userIds, visibilityMap, profileMap),
      fetchNeedItems(actorIds),
      fetchPracticeContributedItems(userIds, profileMap),
      fetchPracticeAttestedItems(userIds, profileMap),
      // Bilaterals only on the People tab
      tab === 'people' ? fetchBilateralItems(viewerCtx, visibilityMap) : Promise.resolve([]),
    ])

    // Flatten, apply in-person bias, sort by adjusted time
    const merged = applyInPersonBias(sources.flat())
      .sort((a, b) => b._sortTime - a._sortTime)

    setAllItems(merged)
    setPage(1)
    setLoading(false)
  }, [tab, viewerCtx])

  useEffect(() => { load() }, [load])

  const visibleItems = allItems.slice(0, page * PAGE_SIZE)
  // hasMore: more items exist AND we haven't burned all 5 pages
  const hasMore = visibleItems.length < allItems.length && page < MAX_PAGES
  // reachedEnd: viewer has clicked through all 5 pages (whether or not more items exist)
  const reachedEnd = page >= MAX_PAGES

  function loadMore() {
    if (page < MAX_PAGES) setPage(p => p + 1)
  }

  return {
    items:        visibleItems,
    loading,
    hasMore,
    reachedEnd,
    page,
    totalLoaded:  allItems.length,
    loadMore,
  }
}

export { PAGE_SIZE, MAX_PAGES }
