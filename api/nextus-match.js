// ── NextUs Matching Engine ───────────────────────────────────
// POST /api/nextus-match
//
// Two modes depending on request body:
//
//   { mode: 'for_contributor', user_id }
//   → Returns orgs whose open needs align with the contributor's
//     active offers (domain, offer_type, contribution_mode).
//     Also considers Purpose Piece coordinates if no offers yet.
//
//   { mode: 'for_org', actor_id }
//   → Returns contributors whose active offers align with the
//     org's open needs (domain, need_type, contribution_mode).
//     Respects willing_to_offer_to visibility tiers.
//
// Scoring: each match gets a relevance score 0–3:
//   +1 domain match
//   +1 contribution mode match
//   +1 offer type / need type match
//   (adjacent enquiry flag opens results that would otherwise be filtered)
//
// Returns results sorted by score descending, max 20.

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Mode mappings ─────────────────────────────────────────────
// Offer types that align with need types
const OFFER_NEED_AFFINITY = {
  skills:    ['skills', 'other'],
  time:      ['skills', 'other'],
  capital:   ['capital'],
  community: ['partnerships', 'other'],
  knowledge: ['data', 'skills', 'other'],
  creative:  ['skills', 'other'],
  other:     ['other'],
}

// Need types that align with offer types (reverse lookup)
const NEED_OFFER_AFFINITY = {}
Object.entries(OFFER_NEED_AFFINITY).forEach(([offerType, needTypes]) => {
  needTypes.forEach(needType => {
    if (!NEED_OFFER_AFFINITY[needType]) NEED_OFFER_AFFINITY[needType] = []
    if (!NEED_OFFER_AFFINITY[needType].includes(offerType)) {
      NEED_OFFER_AFFINITY[needType].push(offerType)
    }
  })
})

// ── Scoring ───────────────────────────────────────────────────

function scoreDomainMatch(offerDomains, needDomainId) {
  if (!offerDomains?.length || !needDomainId) return 0
  return offerDomains.includes(needDomainId) ? 1 : 0
}

function scoreModeMatch(offerMode, needMode) {
  if (!offerMode || !needMode) return 0
  return offerMode === needMode ? 1 : 0
}

function scoreTypeMatch(offerType, needType) {
  if (!offerType || !needType) return 0
  const affinities = OFFER_NEED_AFFINITY[offerType] || []
  return affinities.includes(needType) ? 1 : 0
}

// ── Mode: for_contributor ─────────────────────────────────────

async function matchForContributor(userId, isAuthenticated) {
  // 1. Get contributor's active offers
  const { data: offers } = await supabase
    .from('nextus_contributor_offers')
    .select('offer_type, contribution_mode, domain_ids, willing_to_offer_to, open_to_adjacent, scale')
    .eq('user_id', userId)
    .eq('is_active', true)

  // 2. Get Purpose Piece coordinates as fallback
  const { data: ppData } = await supabase
    .from('purpose_piece_results')
    .select('session')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ppDomainId = ppData?.session?.tentative?.domain?.domain_id
  const ppScale    = ppData?.session?.tentative?.scale?.scale

  // Aggregate domain coverage from all active offers
  const allDomains = [...new Set(
    (offers || []).flatMap(o => o.domain_ids || [])
      .concat(ppDomainId ? [ppDomainId] : [])
  )]

  const allModes   = [...new Set((offers || []).map(o => o.contribution_mode).filter(Boolean))]
  const allTypes   = [...new Set((offers || []).map(o => o.offer_type).filter(Boolean))]
  const openToAdjacent = (offers || []).some(o => o.open_to_adjacent)

  // 3. Fetch orgs with open needs — filter by domain if we have coordinates
  let q = supabase
    .from('nextus_actors')
    .select(`
      id, name, domain_id, subdomain_id, scale, description,
      verified, alignment_score, needs_visible,
      nextus_needs(id, need_type, title, status, compensation_type, time_estimate)
    `)
    .eq('needs_visible', true)
    .limit(80)

  // Domain filter — if contributor has specific domains
  if (allDomains.length > 0 && allDomains.length < 7) {
    q = q.in('domain_id', allDomains)
  }

  const { data: actors } = await q
  if (!actors?.length) return []

  // 4. Score each actor
  const scored = []

  for (const actor of actors) {
    const openNeeds = (actor.nextus_needs || []).filter(n => n.status === 'open')
    if (!openNeeds.length) continue

    // Score best matching need
    let bestScore = 0
    let bestNeed  = null

    for (const need of openNeeds) {
      const domainScore = scoreDomainMatch(allDomains, actor.domain_id)
      const modeScore   = 0 // needs don't carry mode yet — future field
      const typeScore   = Math.max(
        ...allTypes.map(t => scoreTypeMatch(t, need.need_type))
      )

      const score = domainScore + modeScore + typeScore
      if (score > bestScore) {
        bestScore = score
        bestNeed  = need
      }
    }

    // Include if score > 0, or if contributor is open to adjacent and there's a domain match
    const domainMatch = allDomains.includes(actor.domain_id)
    if (bestScore === 0 && !(openToAdjacent && domainMatch)) continue

    scored.push({
      actor_id:      actor.id,
      name:          actor.name,
      domain_id:     actor.domain_id,
      subdomain_id:  actor.subdomain_id,
      scale:         actor.scale,
      description:   actor.description,
      verified:      actor.verified,
      alignment_score: actor.alignment_score,
      open_needs_count: openNeeds.length,
      best_need:     bestNeed,
      score:         bestScore,
      adjacent:      bestScore === 0 && domainMatch,
    })
  }

  // Sort by score desc, then alignment_score desc
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (b.alignment_score || 0) - (a.alignment_score || 0)
  })

  return scored.slice(0, 20)
}

// ── Mode: for_org ─────────────────────────────────────────────

async function matchForOrg(actorId, requestingUserId) {
  // 1. Get org's open needs
  const { data: needs } = await supabase
    .from('nextus_needs')
    .select('id, need_type, title, status')
    .eq('actor_id', actorId)
    .eq('status', 'open')

  if (!needs?.length) return []

  // 2. Get actor's domain for domain matching
  const { data: actor } = await supabase
    .from('nextus_actors')
    .select('domain_id, subdomain_id')
    .eq('id', actorId)
    .single()

  const actorDomainId = actor?.domain_id

  const needTypes = [...new Set(needs.map(n => n.need_type).filter(Boolean))]

  // 3. Fetch contributor offers
  // Visibility: 'any' always shown. 'domain_aligned' only if actor domain matches.
  // 'verified_only' only if actor is verified. 'invitation_only' never shown here.
  const { data: actorFull } = await supabase
    .from('nextus_actors')
    .select('verified')
    .eq('id', actorId)
    .single()

  const actorVerified = actorFull?.verified || false

  let offersQuery = supabase
    .from('nextus_contributor_offers')
    .select(`
      id, user_id, title, offer_type, contribution_mode,
      domain_ids, scale, description, availability,
      willing_to_offer_to, open_to_adjacent, return_type
    `)
    .eq('is_active', true)
    .limit(100)

  const { data: allOffers } = await offersQuery
  if (!allOffers?.length) return []

  // 4. Score each offer
  const scored = []

  for (const offer of allOffers) {
    // Visibility check
    const w = offer.willing_to_offer_to
    if (w === 'invitation_only') continue
    if (w === 'verified_only' && !actorVerified) continue
    if (w === 'domain_aligned') {
      const offerDomains = offer.domain_ids || []
      if (offerDomains.length > 0 && !offerDomains.includes(actorDomainId)) continue
    }

    // Score against best matching need
    let bestScore = 0
    let bestNeed  = null

    for (const need of needs) {
      const domainScore = scoreDomainMatch(offer.domain_ids, actorDomainId)
      const typeScore   = scoreTypeMatch(offer.offer_type, need.need_type)
      const score       = domainScore + typeScore
      if (score > bestScore) { bestScore = score; bestNeed = need }
    }

    // Adjacent: open_to_adjacent allows domain-only matches
    const domainMatch = (offer.domain_ids || []).includes(actorDomainId)
    if (bestScore === 0 && !(offer.open_to_adjacent && domainMatch)) continue

    scored.push({
      user_id:           offer.user_id,
      offer_id:          offer.id,
      offer_title:       offer.title,
      offer_type:        offer.offer_type,
      contribution_mode: offer.contribution_mode,
      domain_ids:        offer.domain_ids,
      scale:             offer.scale,
      description:       offer.description,
      availability:      offer.availability,
      return_type:       offer.return_type,
      open_to_adjacent:  offer.open_to_adjacent,
      best_need:         bestNeed,
      score:             bestScore,
      adjacent:          bestScore === 0 && domainMatch,
    })
  }

  // Enrich with contributor profile data
  if (scored.length > 0) {
    const userIds = [...new Set(scored.map(s => s.user_id))]
    const { data: profiles } = await supabase
      .from('contributor_profiles')
      .select('id, display_name, archetype, domain_id, confirmed_contribution_count')
      .in('id', userIds)

    const profileMap = {}
    ;(profiles || []).forEach(p => { profileMap[p.id] = p })

    scored.forEach(s => {
      const profile = profileMap[s.user_id]
      if (profile) {
        s.display_name = profile.display_name
        s.archetype    = profile.archetype
        s.confirmed_contribution_count = profile.confirmed_contribution_count
      }
    })
  }

  // Sort by score desc, then confirmed_contribution_count desc
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (b.confirmed_contribution_count || 0) - (a.confirmed_contribution_count || 0)
  })

  return scored.slice(0, 20)
}

// ── Main handler ──────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { mode, user_id, actor_id, requesting_user_id } = req.body || {}

  if (!mode) return res.status(400).json({ error: 'mode is required' })

  try {
    if (mode === 'for_contributor') {
      if (!user_id) return res.status(400).json({ error: 'user_id required' })
      const matches = await matchForContributor(user_id, !!requesting_user_id)
      return res.status(200).json({ matches })
    }

    if (mode === 'for_org') {
      if (!actor_id) return res.status(400).json({ error: 'actor_id required' })
      const matches = await matchForOrg(actor_id, requesting_user_id)
      return res.status(200).json({ matches })
    }

    return res.status(400).json({ error: `Unknown mode: ${mode}` })
  } catch (err) {
    console.error('[nextus-match]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
