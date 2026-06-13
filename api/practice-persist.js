// api/practice-persist.js
//
// Best Practices — Slice 2: persistence.
//
// The extractor proposes practices an actor embodies (api/org-extract.js). This
// endpoint writes them, called from the Add save flow once the actor has an id.
// nextus_practices is service-role write, so this runs server-side under the
// service key, founder-gated.
//
// For each proposed practice:
//   1. Upsert the practice by slug. New ones land as 'candidate' / 'extracted'.
//      An existing practice is reused as-is — never overwritten, since another
//      actor (or a later confirmation) may already have enriched it.
//   2. Merge the actor's tier into the practice's tier ladder. A tier the
//      practice doesn't have yet is appended as a new rung. This is how the
//      ladder fills from real examples: a global institution and a grassroots
//      group embodying the same practice populate different rungs, both real,
//      neither lesser.
//   3. Link the actor as an embodiment, UNCONFIRMED. The owner confirms later
//      (Slice 3). An existing embodiment is left untouched so a prior
//      confirmation is never reset.
//
// POST body: { actorId, practices: [ ...extractor practice shape... ] }
// Auth:      Authorization: Bearer <supabase_access_token>, role 'founder'

export const config = { maxDuration: 60 }

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

function uniq(arr) { return [...new Set((arr || []).filter(Boolean))] }

async function requireFounder(req) {
  const auth = req.headers.authorization || req.headers.Authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { ok: false, code: 401, error: 'Missing token' }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return { ok: false, code: 401, error: 'Invalid token' }
  if (data.user.user_metadata?.role !== 'founder') return { ok: false, code: 403, error: 'Founder only' }
  return { ok: true, userId: data.user.id }
}

// Find a practice by slug, or create it as a candidate.
async function ensurePractice(p) {
  const slug = String(p.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  if (!slug) return null

  const { data: existing } = await supabase
    .from('nextus_practices')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return { id: existing.id, created: false }

  const domains = Array.isArray(p.domains) ? p.domains : []
  const { data: created, error } = await supabase
    .from('nextus_practices')
    .insert({
      slug,
      name:            p.name || slug,
      statement:       p.statement || null,
      domains,
      subdomains:      Array.isArray(p.subdomains) ? p.subdomains : [],
      fields:          Array.isArray(p.fields) ? p.fields : [],
      problem_chains:  Array.isArray(p.problem_chains) ? p.problem_chains : [],
      horizon_domain:  domains[0] || null,
      status:          'candidate',
      origin:          'extracted',
      provenance_label:'Seeded by NextUs',
    })
    .select('id')
    .single()
  if (error) { console.error('practice insert error:', error.message); return null }
  return { id: created.id, created: true }
}

// Merge the actor's tier into the practice's ladder. Dedup by label; append a
// new rung otherwise. Returns the tier id (or null).
async function ensureTier(practiceId, tier) {
  if (!tier || !tier.label) return null
  const label = String(tier.label).trim()
  if (!label) return null

  const { data: tiers } = await supabase
    .from('nextus_practice_tiers')
    .select('id, label, position')
    .eq('practice_id', practiceId)

  const match = (tiers || []).find(t => (t.label || '').trim().toLowerCase() === label.toLowerCase())
  if (match) return match.id

  const maxPos = (tiers || []).reduce((m, t) => Math.max(m, t.position || 0), 0)
  const { data: created, error } = await supabase
    .from('nextus_practice_tiers')
    .insert({
      practice_id:    practiceId,
      position:       maxPos + 1,
      label,
      looks_like:     tier.looks_like || null,
      resource_level: ['low', 'moderate', 'high'].includes(tier.resource_level) ? tier.resource_level : null,
      scale:          tier.scale || null,
      meets_floor:    false,
    })
    .select('id')
    .single()
  if (error) { console.error('tier insert error:', error.message); return null }
  return created.id
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireFounder(req)
  if (!auth.ok) return res.status(auth.code).json({ error: auth.error })

  const { actorId, practices } = req.body || {}
  if (!actorId) return res.status(400).json({ error: 'actorId required' })
  if (!Array.isArray(practices) || practices.length === 0) {
    return res.status(200).json({ ok: true, created: 0, linked: 0 })
  }

  let created = 0, linked = 0
  for (const p of practices) {
    if (!p || !p.slug) continue
    const practice = await ensurePractice(p)
    if (!practice) continue
    if (practice.created) created++

    const tierId = await ensureTier(practice.id, p.tier)

    // Link the actor, unconfirmed. Leave any existing embodiment untouched.
    const { data: existingEmb } = await supabase
      .from('nextus_practice_embodiments')
      .select('id')
      .eq('practice_id', practice.id)
      .eq('actor_id', actorId)
      .maybeSingle()
    if (!existingEmb) {
      const { error: embErr } = await supabase
        .from('nextus_practice_embodiments')
        .insert({
          practice_id:   practice.id,
          actor_id:      actorId,
          tier_id:       tierId,
          confirmed:     false,
          evidence_note: p.evidence_note || null,
        })
      if (!embErr) linked++
    }
  }

  return res.status(200).json({ ok: true, created, linked })
}
