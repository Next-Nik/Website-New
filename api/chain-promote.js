// api/chain-promote.js
//
// Demand-side vocabulary learning — Slice 3: Gate + Backfill (the loop-closer).
//
// A founder reviews a problem-chain proposal (supply-side from the extractor,
// or demand-side from the clustering cron) and either promotes it into the
// live vocabulary or rejects it. Promotion is the moment a captured concern
// becomes matchable — so it must also reach the people and actors it concerns:
//
//   1. Insert the chain into nextus_problem_chains (active), seeding its
//      aliases from the cluster's accumulated phrasings so future arrivals who
//      say it any of those ways match instantly and never hit the miss loop.
//   2. Mark the proposal approved; mark the cluster promoted and its gaps too.
//   3. RETRO-TAG the tracks the cluster's gaps came from, so the people who
//      brought this concern now match actors who address it.
//   4. Return the live actors whose domains overlap the new chain, for the
//      AdminConsole to fire the existing actor auto-tagger against — so the
//      supply side picks the chain up too.
//
// Without steps 3-4 a promoted chain reaches no one: dead vocabulary.
//
// POST body: { proposalId, action: 'approve' | 'reject', edits?: { slug, label, description, domains, aliases } }
// Auth:      Authorization: Bearer <supabase_access_token>, role must be 'founder'
//            (same gate the AdminConsole UI uses: app_metadata.role === 'founder' or user_metadata.role === 'founder')

export const config = { maxDuration: 60 }

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))]
}

async function requireFounder(req) {
  const auth = req.headers.authorization || req.headers.Authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { ok: false, code: 401, error: 'Missing token' }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return { ok: false, code: 401, error: 'Invalid token' }
  if (data.user.app_metadata?.role !== 'founder' && data.user.user_metadata?.role !== 'founder') {
    return { ok: false, code: 403, error: 'Founder only' }
  }
  return { ok: true, userId: data.user.id }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireFounder(req)
  if (!auth.ok) return res.status(auth.code).json({ error: auth.error })

  const { proposalId, action, edits } = req.body || {}
  if (!proposalId) return res.status(400).json({ error: 'proposalId required' })
  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: "action must be 'approve' or 'reject'" })
  }

  // Load the proposal.
  const { data: proposal, error: pErr } = await supabase
    .from('nextus_problem_chain_proposals')
    .select('*')
    .eq('id', proposalId)
    .single()
  if (pErr || !proposal) return res.status(404).json({ error: 'Proposal not found' })

  // Idempotent: already reviewed.
  if (proposal.status !== 'pending') {
    return res.status(200).json({ ok: true, already: proposal.status })
  }

  const now = new Date().toISOString()

  // Load the cluster (demand-side) for the fuller alias set and status flips.
  let cluster = null
  if (proposal.cluster_id) {
    const { data: c } = await supabase
      .from('nextsteps_gap_clusters')
      .select('*')
      .eq('id', proposal.cluster_id)
      .single()
    cluster = c || null
  }

  // ── REJECT ──────────────────────────────────────────────────────────────
  if (action === 'reject') {
    await supabase
      .from('nextus_problem_chain_proposals')
      .update({ status: 'rejected', reviewed_by: auth.userId, reviewed_at: now })
      .eq('id', proposalId)

    if (cluster) {
      await supabase
        .from('nextsteps_gap_clusters')
        .update({ status: 'dismissed', updated_at: now })
        .eq('id', cluster.id)
      await supabase
        .from('nextsteps_chain_gaps')
        .update({ status: 'dismissed' })
        .eq('cluster_id', cluster.id)
    }
    return res.status(200).json({ ok: true, rejected: true })
  }

  // ── APPROVE ─────────────────────────────────────────────────────────────
  const slug = slugify(edits?.slug || proposal.proposed_slug || proposal.label)
  if (!slug) return res.status(400).json({ error: 'Could not derive a slug' })

  // Slug collision — let the founder rename rather than silently merging.
  const { data: existing } = await supabase
    .from('nextus_problem_chains')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) {
    return res.status(409).json({ error: 'slug_exists', slug, message: `A chain with slug "${slug}" already exists. Edit the slug and retry.` })
  }

  const label       = edits?.label || proposal.label
  const description = edits?.description ?? proposal.description ?? null
  const domains     = uniq(edits?.domains || cluster?.domains || proposal.domains)
  // Aliases seed the matcher. Pull from the cluster's accumulated phrasings,
  // the proposal, and any sample shapes — deduped.
  const aliases = uniq(
    edits?.aliases || [
      ...(cluster?.aliases || []),
      ...(proposal.aliases || []),
      ...(proposal.sample_shapes || []),
    ]
  )

  // 1. Insert the live chain.
  const { error: chainErr } = await supabase
    .from('nextus_problem_chains')
    .insert({ slug, label, description, domains, aliases, related_sdgs: [], status: 'active' })
  if (chainErr) {
    return res.status(500).json({ error: 'chain_insert_failed', message: chainErr.message })
  }

  // 2. Mark proposal approved; flip cluster + its gaps to promoted.
  await supabase
    .from('nextus_problem_chain_proposals')
    .update({ status: 'approved', reviewed_by: auth.userId, reviewed_at: now })
    .eq('id', proposalId)

  if (cluster) {
    await supabase
      .from('nextsteps_gap_clusters')
      .update({ status: 'promoted', updated_at: now })
      .eq('id', cluster.id)
    await supabase
      .from('nextsteps_chain_gaps')
      .update({ status: 'promoted' })
      .eq('cluster_id', cluster.id)
  }

  // 3. Retro-tag the tracks this concern came from, so those people now match
  //    actors who address it.
  let retagged_tracks = 0
  if (cluster) {
    const { data: gapRows } = await supabase
      .from('nextsteps_chain_gaps')
      .select('track_id')
      .eq('cluster_id', cluster.id)
    const trackIds = uniq((gapRows || []).map(r => r.track_id))
    for (const tid of trackIds) {
      const { data: track } = await supabase
        .from('nextsteps_tracks')
        .select('problem_chains')
        .eq('id', tid)
        .single()
      if (!track) continue
      const current = Array.isArray(track.problem_chains) ? track.problem_chains : []
      if (current.includes(slug)) continue
      const { error: tErr } = await supabase
        .from('nextsteps_tracks')
        .update({ problem_chains: [...current, slug], updated_at: now })
        .eq('id', tid)
      if (!tErr) retagged_tracks++
    }
  }

  // 4. Candidate actors for re-tagging — live actors whose domains overlap the
  //    new chain. The AdminConsole fires the existing actor auto-tagger against
  //    these (same client→endpoint pattern as org-extract).
  let actor_ids = []
  if (domains.length) {
    const { data: actors } = await supabase
      .from('nextus_actors')
      .select('id')
      .eq('status', 'live')
      .overlaps('domains', domains)
      .limit(500)
    actor_ids = (actors || []).map(a => a.id)
  }

  return res.status(200).json({
    ok: true,
    chain: { slug, label },
    retagged_tracks,
    actor_ids,
  })
}
