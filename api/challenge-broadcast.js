// api/challenge-broadcast.js
// The author-to-taker broadcast channel. One way. No cascade — every read and
// write is scoped to a single call_id, so an author reaches only their own
// takers and never the lineage tree beneath them.
//
// Actions (req.body.action):
//   post      — author writes one update to everyone running their challenge
//   list      — the author, or an un-muted taker, reads the updates
//   set_mute  — a taker mutes/unmutes without leaving the run

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// True if userId authored call_id (directly, or as owner of the authoring actor).
async function isCallAuthor(callId, userId) {
  const { data: call } = await supabase
    .from('actor_calls')
    .select('user_id, actor_id')
    .eq('id', callId)
    .maybeSingle()
  if (!call) return false
  if (call.user_id === userId) return true
  if (call.actor_id) {
    const { data: actor } = await supabase
      .from('nextus_actors')
      .select('id')
      .eq('id', call.actor_id)
      .eq('profile_owner', userId)        // profile_owner is the only ownership column on nextus_actors
      .maybeSingle()
    if (actor) return true
  }
  return false
}

async function participantRow(callId, userId) {
  const { data } = await supabase
    .from('actor_call_participants')
    .select('id, muted')
    .eq('call_id', callId)
    .eq('user_id', userId)
    .maybeSingle()
  return data || null
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, userId, ...body } = req.body || {}
  if (!userId) return res.status(401).json({ error: 'Sign in required' })

  // ── post ──────────────────────────────────────────────────────────────────
  if (action === 'post') {
    const { call_id, text, send_email = false } = body
    if (!call_id || !text || !text.trim()) return res.status(400).json({ error: 'call_id and text required' })
    if (!(await isCallAuthor(call_id, userId))) return res.status(403).json({ error: 'Only the author can broadcast' })

    const { data, error } = await supabase
      .from('actor_call_broadcasts')
      .insert({ call_id, author_user_id: userId, body: text.trim(), send_email: !!send_email })
      .select('id, created_at, body, send_email')
      .single()
    if (error) return res.status(500).json({ error: error.message })

    // Reach = this call's active takers only. No cascade to child challenges.
    const { count } = await supabase
      .from('actor_call_participants')
      .select('id', { count: 'exact', head: true })
      .eq('call_id', call_id)
      .eq('status', 'active')

    // Email digest is opt-in and best-effort; never block the post on it.
    return res.json({ broadcast: data, reached: count || 0 })
  }

  // ── list ──────────────────────────────────────────────────────────────────
  if (action === 'list') {
    const { call_id } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })

    const author = await isCallAuthor(call_id, userId)
    const part   = author ? null : await participantRow(call_id, userId)
    if (!author && !part) return res.json({ broadcasts: [], muted: false, can_view: false })
    if (part && part.muted) return res.json({ broadcasts: [], muted: true, can_view: true })

    const { data, error } = await supabase
      .from('actor_call_broadcasts')
      .select('id, created_at, body')
      .eq('call_id', call_id)               // scoped to one call — the no-cascade guarantee
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return res.status(500).json({ error: error.message })

    return res.json({ broadcasts: data || [], muted: false, can_view: true, is_author: author })
  }

  // ── set_mute ────────────────────────────────────────────────────────────────
  if (action === 'set_mute') {
    const { call_id, muted } = body
    if (!call_id || typeof muted !== 'boolean') return res.status(400).json({ error: 'call_id and muted required' })
    const part = await participantRow(call_id, userId)
    if (!part) return res.status(403).json({ error: 'Not a participant of this challenge' })

    const { error } = await supabase
      .from('actor_call_participants')
      .update({ muted })
      .eq('id', part.id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ muted })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
