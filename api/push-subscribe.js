// api/push-subscribe.js
// ─────────────────────────────────────────────────────────────────────────────
// Push subscription management. Public key for the client to subscribe, and
// save/remove of a subscription.
//
// POST { action }
//   'get_key'      → { publicKey }
//   'subscribe'    → { userId, subscription } saves it
//   'unsubscribe'  → { endpoint } removes it
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { action, userId, subscription } = req.body || {}

  if (action === 'get_key') {
    return res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null })
  }

  if (action === 'subscribe') {
    if (!userId || !subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'userId and subscription required' })
    }
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys && subscription.keys.p256dh,
      auth: subscription.keys && subscription.keys.auth,
      user_agent: req.headers['user-agent'] || null,
    }, { onConflict: 'endpoint' })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  if (action === 'unsubscribe') {
    const endpoint = (req.body || {}).endpoint
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' })
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    return res.json({ ok: true })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
