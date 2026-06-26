// api/admin-recover.js
// ── Admin account-recovery helper ──────────────────────────────────────────
// Generates a Supabase recovery link for a given email WITHOUT relying on any
// outbound email. You hit this endpoint, copy the returned link, and send it to
// the person directly (WhatsApp, your own email, etc). They click it, land on
// /auth/callback, and Supabase fires PASSWORD_RECOVERY → set-new-password screen.
//
// Also doubles as an account finder: if the email has no account it tells you so,
// so you can try a person's other addresses one at a time.
//
// GATED by a shared secret. Set ADMIN_RECOVERY_SECRET in Vercel to a long random
// string. Calls without the matching key get a flat 403.
//
// Usage (browser, GET):
//   /api/admin-recover?key=YOUR_SECRET&email=her@email.com
// Optional:
//   &type=magiclink      → one-time sign-in link instead of a password reset
//   &redirect=/north-star → where to land after (defaults to /auth/callback handling)
//
// SECURITY NOTES:
//   · The key and email appear in the URL, so they land in browser history and
//     Vercel logs. Rotate ADMIN_RECOVERY_SECRET after a recovery run if you care.
//   · This can reset access to ANY account. Keep the secret to yourself.
//   · redirectTo must be in Supabase → Auth → URL Configuration → Redirect URLs.
//     `https://nextus.world/auth/callback` is already used by the normal flow.

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://tphbpwzozkskytoichho.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN || 'https://nextus.world'

function param(req, name) {
  const fromQuery = req.query && req.query[name]
  if (fromQuery != null && fromQuery !== '') return String(fromQuery)
  const fromBody = req.body && req.body[name]
  if (fromBody != null && fromBody !== '') return String(fromBody)
  return ''
}

module.exports = async function handler(req, res) {
  // ── Gate ──────────────────────────────────────────────────────────────────
  const secret = process.env.ADMIN_RECOVERY_SECRET
  const key = param(req, 'key')
  if (!secret || key !== secret) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Service key not configured on the server.' })
  }

  // ── Inputs ────────────────────────────────────────────────────────────────
  const email = param(req, 'email').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Pass a valid ?email=' })
  }

  const typeRaw = param(req, 'type').trim().toLowerCase()
  const type = typeRaw === 'magiclink' ? 'magiclink' : 'recovery'

  const redirectParam = param(req, 'redirect').trim()
  const redirectTo = redirectParam
    ? `${SITE_ORIGIN}/auth/callback?redirect=${encodeURIComponent(redirectParam)}`
    : `${SITE_ORIGIN}/auth/callback`

  // ── Generate ──────────────────────────────────────────────────────────────
  try {
    const { data, error } = await supabase.auth.admin.generateLink({
      type,
      email,
      options: { redirectTo },
    })

    if (error) {
      const msg = (error.message || '').toLowerCase()
      // Recovery on an address with no account → user-not-found. Surface it
      // plainly so you can try the person's next email.
      if (msg.includes('not found') || msg.includes('no user') || msg.includes('user_not_found')) {
        return res.status(200).json({
          ok: false,
          found: false,
          email,
          message: 'No account on this email. Try another of their addresses.',
        })
      }
      return res.status(500).json({ ok: false, error: error.message })
    }

    const link =
      (data && data.properties && data.properties.action_link) ||
      (data && data.action_link) ||
      null

    if (!link) {
      return res.status(500).json({ ok: false, error: 'No link returned by Supabase.' })
    }

    return res.status(200).json({
      ok: true,
      found: true,
      email,
      type,
      action_link: link,
      note:
        type === 'recovery'
          ? 'Send this link to the person directly. It signs them in for a password reset and routes to the set-new-password screen. Single use, expires (default ~1 hour).'
          : 'Send this link to the person directly. It signs them straight in. Single use, expires (default ~1 hour).',
    })
  } catch (err) {
    console.error('admin-recover error:', err)
    return res.status(500).json({ ok: false, error: 'Failed to generate link.' })
  }
}
