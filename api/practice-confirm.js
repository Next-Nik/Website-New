// api/practice-confirm.js
//
// Best Practices — Slice 4: owner consent + the owner-facing invitation.
//
// An actor's owner sees the practices proposed against their actor and either
// confirms ("yes, we do this") or declines. Service-role, but every action is
// gated on the caller OWNING the actor (profile_owner). The owner can read
// their pending embodiments and the linked practices even when those practices
// are still unjudged candidates — which RLS would otherwise hide — so the read
// runs here too.
//
// The invitation: when a linked practice is ruled_out, the response carries its
// REDEMPTION DOOR — the better practice for the same issue. The owner is never
// shamed for the practice they walked in with; they are shown the way forward.
//
//   GET  ?actorId=  → the actor's embodiments, each with practice detail and,
//                     for ruled-out ones, the door forward.
//   POST { embodimentId, action: 'confirm' | 'decline' }
//
// Auth: Authorization: Bearer <supabase_access_token>; caller must own the actor.

export const config = { maxDuration: 60 }

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function getUserId(req) {
  const auth = req.headers.authorization || req.headers.Authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user.id
}

async function ownsActor(userId, actorId) {
  if (!userId || !actorId) return false
  const { data } = await supabase
    .from('nextus_actors')
    .select('profile_owner')
    .eq('id', actorId)
    .single()
  return !!data && data.profile_owner === userId
}

module.exports = async function handler(req, res) {
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Sign-in required' })

  // ── POST: confirm or decline ──────────────────────────────────────────────
  if (req.method === 'POST') {
    const { embodimentId, action } = req.body || {}
    if (!embodimentId) return res.status(400).json({ error: 'embodimentId required' })
    if (action !== 'confirm' && action !== 'decline') {
      return res.status(400).json({ error: "action must be 'confirm' or 'decline'" })
    }

    const { data: emb } = await supabase
      .from('nextus_practice_embodiments')
      .select('id, actor_id')
      .eq('id', embodimentId)
      .single()
    if (!emb) return res.status(404).json({ error: 'Embodiment not found' })
    if (!(await ownsActor(userId, emb.actor_id))) {
      return res.status(403).json({ error: 'Not your actor' })
    }

    const patch = action === 'confirm'
      ? { confirmed: true,  declined: false }
      : { confirmed: false, declined: true }
    const { error } = await supabase.from('nextus_practice_embodiments').update(patch).eq('id', embodimentId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // ── GET: the actor's embodiments ──────────────────────────────────────────
  const actorId = req.query?.actorId
  if (!actorId) return res.status(400).json({ error: 'actorId required' })
  if (!(await ownsActor(userId, actorId))) return res.status(403).json({ error: 'Not your actor' })

  const { data: embs, error } = await supabase
    .from('nextus_practice_embodiments')
    .select('id, confirmed, declined, tier_id, evidence_note, practice:nextus_practices(id, name, slug, statement, standing, standing_rationale, problem_chains, reconsideration_open)')
    .eq('actor_id', actorId)
  if (error) return res.status(500).json({ error: error.message })

  // Redemption doors: better practices (best/alternative) sharing a chain with
  // any ruled-out practice this actor is linked to.
  const ruledChains = new Set()
  for (const e of (embs || [])) {
    if (e.practice?.standing === 'ruled_out') {
      for (const ch of (e.practice.problem_chains || [])) ruledChains.add(ch)
    }
  }

  let doorByChain = {}
  if (ruledChains.size) {
    const { data: better } = await supabase
      .from('nextus_practices')
      .select('id, name, slug, standing, problem_chains')
      .in('standing', ['best', 'alternative'])
      .overlaps('problem_chains', [...ruledChains])
      .limit(100)
    for (const b of (better || [])) {
      for (const ch of (b.problem_chains || [])) {
        if (ruledChains.has(ch)) (doorByChain[ch] ||= []).push({ name: b.name, slug: b.slug, standing: b.standing })
      }
    }
  }

  const embodiments = (embs || []).map(e => {
    let door = []
    if (e.practice?.standing === 'ruled_out') {
      const seen = new Set()
      for (const ch of (e.practice.problem_chains || [])) {
        for (const b of (doorByChain[ch] || [])) {
          if (seen.has(b.slug)) continue
          seen.add(b.slug)
          door.push(b)
        }
      }
    }
    return { ...e, redemption_door: door }
  })

  return res.status(200).json({ embodiments })
}
