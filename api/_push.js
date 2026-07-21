// api/_push.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared web-push sender. Underscore-prefixed so Vercel does not route it as an
// endpoint. Configures VAPID lazily from env, sends a JSON payload to every one
// of a user's subscriptions, and removes endpoints that have expired (404/410).
//
// Required env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (optional,
// defaults to mailto:noreply@nextus.world). Generate a key pair once with:
//   npx web-push generate-vapid-keys
// ─────────────────────────────────────────────────────────────────────────────

const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
)

let configured = false
function configure() {
  if (configured) return true
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@nextus.world',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
  configured = true
  return true
}

// Send one payload to every subscription a user has.
async function sendToUser(userId, payload) {
  if (!configure()) return { sent: 0, skipped: 'no_vapid' }
  const { data: subs } = await supabase
    .from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId)
  let sent = 0
  for (const s of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      )
      sent += 1
    } catch (err) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      }
    }
  }
  return { sent }
}

module.exports = { sendToUser, configure }
