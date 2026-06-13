// api/practice-admin.js
//
// Best Practices — Slice 3: the judgment surface (back end).
//
// Nothing is judged until a human sets standing, so this is the engine that
// activates the whole system. Founder-gated, service-role (practices are
// service-write, and unjudged candidates aren't publicly readable, so the admin
// reads through here too).
//
//   GET  → every practice with its tiers, embodiment count, embodying actor
//          names (admin-visible), and its REDEMPTION DOOR: the better practices
//          serving the same issue. For a ruled-out practice that door is the
//          invitation an actor on it is offered — name the practice, never the
//          actor, and always show the way forward.
//   POST → set standing (best | alternative | ruled_out | unjudged), the
//          backed-up rationale, the sources behind it, and reconsideration_open.
//
// Auth: Authorization: Bearer <supabase_access_token>, role 'founder'.

export const config = { maxDuration: 60 }

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const STANDINGS = ['best', 'alternative', 'ruled_out', 'unjudged']

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

module.exports = async function handler(req, res) {
  const auth = await requireFounder(req)
  if (!auth.ok) return res.status(auth.code).json({ error: auth.error })

  // ── POST: judge a practice ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { practiceId, standing, standing_rationale, standing_sources, reconsideration_open } = req.body || {}
    if (!practiceId) return res.status(400).json({ error: 'practiceId required' })
    if (standing && !STANDINGS.includes(standing)) {
      return res.status(400).json({ error: 'invalid standing' })
    }
    const patch = { updated_at: new Date().toISOString() }
    if (standing !== undefined)             patch.standing = standing
    if (standing_rationale !== undefined)   patch.standing_rationale = standing_rationale || null
    if (Array.isArray(standing_sources))    patch.standing_sources = standing_sources.filter(Boolean)
    if (typeof reconsideration_open === 'boolean') patch.reconsideration_open = reconsideration_open

    const { error } = await supabase.from('nextus_practices').update(patch).eq('id', practiceId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // ── GET: practices for review ─────────────────────────────────────────────
  const { data: practices, error: pErr } = await supabase
    .from('nextus_practices')
    .select('*')
    .order('standing', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(500)
  if (pErr) return res.status(500).json({ error: pErr.message })

  const ids = (practices || []).map(p => p.id)
  if (!ids.length) return res.status(200).json({ practices: [] })

  // Tiers and embodiments for all in two queries.
  const [{ data: tiers }, { data: embs }] = await Promise.all([
    supabase.from('nextus_practice_tiers').select('*').in('practice_id', ids).order('position'),
    supabase.from('nextus_practice_embodiments')
      .select('practice_id, confirmed, actor:nextus_actors(id, name, slug)')
      .in('practice_id', ids),
  ])

  const tiersByPractice = {}
  for (const t of (tiers || [])) (tiersByPractice[t.practice_id] ||= []).push(t)

  const embsByPractice = {}
  for (const e of (embs || [])) (embsByPractice[e.practice_id] ||= []).push(e)

  // Redemption door: for each practice, the better practices (best/alternative)
  // serving any of the same problem-chains. This is the way forward shown to an
  // actor on a ruled-out practice — the invitation, never a shaming.
  const betterByChain = {}
  for (const p of practices) {
    if (p.standing !== 'best' && p.standing !== 'alternative') continue
    for (const ch of (p.problem_chains || [])) {
      (betterByChain[ch] ||= []).push({ id: p.id, name: p.name, slug: p.slug, standing: p.standing })
    }
  }

  const enriched = practices.map(p => {
    const door = []
    const seen = new Set()
    for (const ch of (p.problem_chains || [])) {
      for (const b of (betterByChain[ch] || [])) {
        if (b.id === p.id || seen.has(b.id)) continue
        seen.add(b.id)
        door.push(b)
      }
    }
    const e = embsByPractice[p.id] || []
    return {
      ...p,
      tiers: tiersByPractice[p.id] || [],
      embodiment_count: e.length,
      embodiments: e.map(x => ({ confirmed: x.confirmed, name: x.actor?.name, slug: x.actor?.slug })),
      redemption_door: door,
    }
  })

  return res.status(200).json({ practices: enriched })
}
