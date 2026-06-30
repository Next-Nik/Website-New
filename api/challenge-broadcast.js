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
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
)
const { Resend } = require('resend')
const resend = new Resend(process.env.RESEND_API_KEY)

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

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function digestHtml({ authorName, title, body, url }) {
  const safeBody = escapeHtml(body).replace(/\n/g, '<br>')
  return `
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;font-family:Georgia,'Times New Roman',serif;color:#0F1523;background:#FAFAF7;">
    <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#A8721A;">A NextUs Challenge</div>
    <div style="font-size:24px;line-height:1.2;color:#0F1523;margin:6px 0 4px;">${escapeHtml(title)}</div>
    <div style="font-size:13px;letter-spacing:0.06em;color:#4A8C6F;text-transform:uppercase;">Update from ${escapeHtml(authorName)}</div>
    <div style="height:1px;background:rgba(200,146,42,0.25);margin:18px 0;"></div>
    <p style="font-size:16px;line-height:1.6;color:rgba(15,21,35,0.82);margin:0 0 22px;">${safeBody}</p>
    <a href="${url}" style="display:inline-block;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#FFFFFF;background:#C8922A;text-decoration:none;border-radius:30px;padding:11px 24px;">Open the challenge</a>
    <div style="height:1px;background:rgba(200,146,42,0.18);margin:24px 0 14px;"></div>
    <p style="font-size:13px;line-height:1.6;color:rgba(15,21,35,0.55);margin:0;">
      You're receiving this because you took on ${escapeHtml(title)}. Mute updates any time on the challenge page; your run continues either way.
    </p>
  </div>`
}

// Best-effort email digest to a challenge's un-muted, active takers. Never the
// author, never the branches below — scoped to this one call_id (no cascade).
// Returns the number of recipients emailed. Throws nothing the caller must catch.
async function sendDigest(callId, body) {
  const { data: call } = await supabase
    .from('actor_calls')
    .select('title, slug, user_id, nextus_actors ( name )')
    .eq('id', callId)
    .maybeSingle()
  if (!call) return 0

  const { data: parts } = await supabase
    .from('actor_call_participants')
    .select('user_id')
    .eq('call_id', callId)
    .eq('status', 'active')
    .eq('muted', false)
  const ids = [...new Set((parts || []).map(p => p.user_id).filter(id => id && id !== call.user_id))]
  if (ids.length === 0) return 0

  const { data: users } = await supabase.from('users').select('email').in('id', ids)
  const emails = (users || []).map(u => u.email).filter(Boolean)
  if (emails.length === 0) return 0

  const authorName = call.nextus_actors?.name || 'The author'
  const subject = `Update from ${authorName} · ${call.title}`
  const html = digestHtml({ authorName, title: call.title, body, url: `https://nextus.world/stretch/c/${call.slug}` })

  // One recipient per message (privacy), batched in chunks of 100.
  let sent = 0
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100).map(to => ({
      from: 'NextUs <outreach@nextus.world>', to, subject, html,
    }))
    try { await resend.batch.send(chunk); sent += chunk.length } catch { /* best effort */ }
  }
  return sent
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

    // Email digest is opt-in and best-effort; never block or fail the post on it.
    let emailed = 0
    if (send_email) {
      try { emailed = await sendDigest(call_id, data.body) } catch { emailed = 0 }
    }

    return res.json({ broadcast: data, reached: count || 0, emailed })
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
