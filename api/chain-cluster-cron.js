// ── NextUs Chain-Cluster Cron ────────────────────────────────
// Demand-side vocabulary learning — Slice 2: Cluster + Threshold.
//
// Runs nightly via Vercel Cron (see vercel.json). Reads the captured,
// scrubbed concern-shapes that no live chain could hold (nextsteps_chain_gaps,
// Slice 1) and groups varied phrasings of the same not-yet-named concern into
// clusters. No embedding infrastructure — the model does the semantic grouping
// in a batch, which at this volume is more accurate and far less to stand up
// than pgvector.
//
// The pass is INCREMENTAL: each run shows the model the clusters that already
// exist and asks it to route new shapes into them where they genuinely fit, or
// form a new cluster only when none does. That keeps cluster identity stable
// across runs without persisted vectors.
//
// A cluster surfaces for review once 5 DISTINCT PEOPLE stand behind it. On
// surfacing, it writes a demand-side proposal into nextus_problem_chain_proposals
// (the same table the extractor uses), so Slice 3 reuses the AdminConsole
// review / promote UI. The count is of distinct people, not rows — one person
// restating themselves cannot manufacture a chain.
//
// Called by Vercel Cron (GET). Also callable manually at
// POST /api/chain-cluster-cron with header x-cron-secret matching CRON_SECRET.

export const config = { maxDuration: 60 }

const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const MODEL              = 'claude-sonnet-4-20250514'
const THRESHOLD          = 5     // distinct people before a cluster surfaces
const BATCH_LIMIT        = 200   // gaps clustered per run (oldest first)
const SAMPLE_SHAPES_MAX  = 6     // phrasings shown to the reviewing admin
const ALIASES_MAX        = 12    // phrasings retained on a cluster for seeding

function log(msg, data = '') {
  console.log(`[chain-cluster-cron] ${msg}`, data)
}

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function safeJson(text) {
  const attempts = [
    () => JSON.parse(text),
    () => JSON.parse(text.replace(/```json|```/g, '').trim()),
    () => { const m = text.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null },
  ]
  for (const a of attempts) {
    try { const r = a(); if (r) return r } catch {}
  }
  return null
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))]
}

const SYSTEM_PROMPT = `You are the NextUs demand-side vocabulary clusterer.

People arrive at NextSteps speaking a concern in away-from grammar — what they
don't like and wish were different. When their concern matches no chain in the
controlled vocabulary, a de-identified SHAPE of it is captured. Your job is to
group these shapes so that varied phrasings of the SAME underlying concern land
together, and to give each group a stable identity in plain away-from grammar.

You will be given:
  A. EXISTING CLUSTERS already formed in previous runs (id, label, slug, sample
     phrasings). Route new shapes into one of these whenever the shape genuinely
     belongs — that is how a cluster grows across runs.
  B. NEW SHAPES to place. Each has an index, a concern shape, and its domain(s).

For every new shape, either:
  - assign it to an existing cluster by id, OR
  - assign it to a NEW cluster you define in this run (give the new cluster a
    temporary key like "new-1", "new-2").

Discipline, in order of importance:
  1. Group by the underlying concern, not surface wording. "no women on my
     council" and "men make every decision in my town" are the same concern.
  2. Do NOT over-merge. Two genuinely different concerns must not share a
     cluster just because they share a domain or a population. A false merge is
     worse than leaving a shape in its own small cluster.
  3. Do NOT over-split. If a shape fits an existing cluster, route it there.
  4. A shape may legitimately be the only member of a new cluster. That is fine.

For each NEW cluster you define, also produce:
  - "slug": lowercase-hyphenated, stable, away-from (e.g. "women-shut-out-of-power")
  - "label": short away-from label (e.g. "Women shut out of power")
  - "description": one line on what the cluster covers
  - "domains": the civilisational domain slug(s) the concern sits in, from:
       human-being, society, nature, technology, finance-economy, legacy, vision
  - "aliases": the distinct phrasings in this cluster, in away-from grammar

Respond ONLY with valid JSON, no prose:

{
  "assignments": [
    { "index": 0, "cluster_id": "<existing-uuid>" },
    { "index": 1, "new_key": "new-1" }
  ],
  "new_clusters": [
    {
      "key": "new-1",
      "slug": "...",
      "label": "...",
      "description": "...",
      "domains": ["society"],
      "aliases": ["phrasing one", "phrasing two"]
    }
  ]
}

Every new shape index must appear exactly once in assignments. Do not invent
shapes. Do not return shapes you were not given.`

// ── Recompute people_count / gap_count for a set of clusters ─────────────────
async function recomputeCounts(clusterIds) {
  for (const cid of uniq(clusterIds)) {
    const { data: rows, error } = await supabase
      .from('nextsteps_chain_gaps')
      .select('user_id')
      .eq('cluster_id', cid)
    if (error) { log('count fetch error', error.message); continue }
    const gap_count    = rows.length
    const people_count = uniq(rows.map(r => r.user_id)).length // distinct, non-null
    await supabase
      .from('nextsteps_gap_clusters')
      .update({ gap_count, people_count, updated_at: new Date().toISOString() })
      .eq('id', cid)
  }
}

// ── Surface clusters that have crossed the threshold ─────────────────────────
// New crossings write a demand proposal. Already-surfaced clusters whose
// proposal is still pending get their evidence (people_count, sample shapes)
// refreshed so the reviewing admin always sees the current weight.
async function surfaceThresholdClusters() {
  let surfaced = 0, refreshed = 0

  const { data: clusters, error } = await supabase
    .from('nextsteps_gap_clusters')
    .select('*')
    .in('status', ['forming', 'surfaced'])
    .gte('people_count', THRESHOLD)
  if (error) { log('surface fetch error', error.message); return { surfaced, refreshed } }

  for (const c of (clusters || [])) {
    // Sample phrasings for the reviewer.
    const { data: sampleRows } = await supabase
      .from('nextsteps_chain_gaps')
      .select('concern_shape')
      .eq('cluster_id', c.id)
      .limit(SAMPLE_SHAPES_MAX)
    const sample_shapes = uniq((sampleRows || []).map(r => r.concern_shape)).slice(0, SAMPLE_SHAPES_MAX)

    if (c.status === 'forming') {
      const { data: prop, error: insErr } = await supabase
        .from('nextus_problem_chain_proposals')
        .insert({
          proposed_slug: slugify(c.proposed_slug) || slugify(c.label),
          label:         c.label,
          description:   c.description || null,
          domains:       Array.isArray(c.domains) ? c.domains : [],
          aliases:       Array.isArray(c.aliases) ? c.aliases : [],
          rationale:     `Demand-side: ${c.people_count} distinct people arrived with a concern no live chain held.`,
          actor_id:      null,
          proposed_by:   null,
          source:        'demand',
          people_count:  c.people_count,
          sample_shapes,
          cluster_id:    c.id,
        })
        .select('id')
        .single()
      if (insErr) { log('proposal insert error', insErr.message); continue }

      await supabase
        .from('nextsteps_gap_clusters')
        .update({ status: 'surfaced', proposal_id: prop.id, updated_at: new Date().toISOString() })
        .eq('id', c.id)
      surfaced++
    } else if (c.status === 'surfaced' && c.proposal_id) {
      // Refresh evidence only while the proposal is still awaiting review.
      const { data: existing } = await supabase
        .from('nextus_problem_chain_proposals')
        .select('status')
        .eq('id', c.proposal_id)
        .single()
      if (existing && existing.status === 'pending') {
        await supabase
          .from('nextus_problem_chain_proposals')
          .update({ people_count: c.people_count, sample_shapes })
          .eq('id', c.proposal_id)
        refreshed++
      }
    }
  }

  return { surfaced, refreshed }
}

// ── Main handler ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const secret = req.headers['x-cron-secret']
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorised' })
    }
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  log('Starting chain-cluster run...')

  try {
    // 1. Pending civ-scale gaps, oldest first. (Self-scale capture accumulates
    //    but is out of scope for v1 — the chain vocabulary is civ-domain.)
    const { data: gaps, error: gapErr } = await supabase
      .from('nextsteps_chain_gaps')
      .select('id, concern_shape, domains, user_id')
      .eq('status', 'pending')
      .eq('scale', 'civ')
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT)
    if (gapErr) throw new Error(`gap fetch: ${gapErr.message}`)

    if (!gaps || gaps.length === 0) {
      // No new shapes — still refresh threshold surfacing in case prior runs
      // left a cluster at the boundary or a proposal needs refreshing.
      const t = await surfaceThresholdClusters()
      const result = { clustered: 0, new_clusters: 0, ...t, duration_ms: Date.now() - startTime }
      log('Nothing to cluster.', result)
      return res.status(200).json({ ok: true, ...result })
    }

    // 2. Existing non-terminal clusters, as routing targets.
    const { data: existing, error: exErr } = await supabase
      .from('nextsteps_gap_clusters')
      .select('id, label, proposed_slug, aliases')
      .in('status', ['forming', 'surfaced'])
    if (exErr) throw new Error(`cluster fetch: ${exErr.message}`)

    const existingBlock = (existing || []).length
      ? (existing).map(c =>
          `  ${c.id}  — ${c.label}  [${(c.aliases || []).slice(0, 4).join(' / ')}]`
        ).join('\n')
      : '  (none yet)'

    const shapesBlock = gaps.map((g, i) =>
      `  ${i}. "${g.concern_shape}"  {${(g.domains || []).join(', ') || 'unspecified'}}`
    ).join('\n')

    const userPrompt =
      `EXISTING CLUSTERS (route into these where a shape genuinely belongs):\n${existingBlock}\n\n` +
      `NEW SHAPES TO PLACE:\n${shapesBlock}\n`

    // 3. Cluster.
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
    const parsed = safeJson(rawText)
    if (!parsed || !Array.isArray(parsed.assignments)) {
      throw new Error('cluster parse failed')
    }

    const validExistingIds = new Set((existing || []).map(c => c.id))

    // 4. Create any new clusters first, mapping temp keys → real ids.
    const newKeyToId = {}
    let newClusterCount = 0
    for (const nc of (parsed.new_clusters || [])) {
      if (!nc || !nc.key || !nc.label) continue
      const { data: row, error: ncErr } = await supabase
        .from('nextsteps_gap_clusters')
        .insert({
          label:         String(nc.label).trim(),
          description:   nc.description ? String(nc.description).trim() : null,
          proposed_slug: slugify(nc.slug) || slugify(nc.label),
          aliases:       uniq(Array.isArray(nc.aliases) ? nc.aliases.map(String) : []).slice(0, ALIASES_MAX),
          domains:       uniq(Array.isArray(nc.domains) ? nc.domains.map(String) : []),
          status:        'forming',
          last_clustered_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (ncErr) { log('new cluster insert error', ncErr.message); continue }
      newKeyToId[nc.key] = row.id
      newClusterCount++
    }

    // 5. Apply assignments to the gaps. Track which clusters were touched so we
    //    can fold new phrasings into existing clusters' alias sets and recount.
    const touched = new Set()
    const aliasAdds = {} // clusterId -> [shapes]
    let clustered = 0

    for (const a of parsed.assignments) {
      const g = gaps[a?.index]
      if (!g) continue
      let cid = null
      if (a.cluster_id && validExistingIds.has(a.cluster_id)) cid = a.cluster_id
      else if (a.new_key && newKeyToId[a.new_key])           cid = newKeyToId[a.new_key]
      if (!cid) continue

      const { error: updErr } = await supabase
        .from('nextsteps_chain_gaps')
        .update({ status: 'clustered', cluster_id: cid })
        .eq('id', g.id)
      if (updErr) { log('gap update error', updErr.message); continue }

      touched.add(cid)
      ;(aliasAdds[cid] ||= []).push(g.concern_shape)
      clustered++
    }

    // 6. Fold new phrasings into EXISTING clusters' alias sets (new clusters
    //    already carry their aliases from the model). Capped.
    for (const cid of validExistingIds) {
      if (!aliasAdds[cid]?.length) continue
      const { data: cur } = await supabase
        .from('nextsteps_gap_clusters')
        .select('aliases')
        .eq('id', cid)
        .single()
      const merged = uniq([...(cur?.aliases || []), ...aliasAdds[cid]]).slice(0, ALIASES_MAX)
      await supabase
        .from('nextsteps_gap_clusters')
        .update({ aliases: merged, last_clustered_at: new Date().toISOString() })
        .eq('id', cid)
    }

    // 7. Recompute counts on every touched cluster, then surface any that
    //    crossed the threshold.
    await recomputeCounts([...touched])
    const t = await surfaceThresholdClusters()

    const result = {
      clustered,
      new_clusters: newClusterCount,
      ...t,
      duration_ms: Date.now() - startTime,
      ran_at: new Date().toISOString(),
    }
    log('Chain-cluster run complete.', result)
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    log('Chain-cluster run failed:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
