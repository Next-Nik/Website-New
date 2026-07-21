// api/_auth.js
// ─────────────────────────────────────────────────────────────────────────────
// One place to resolve "who is actually making this request." Every endpoint
// that acts as a signed-in person must derive userId from the bearer token,
// never trust a client-asserted userId in the body. Underscore-prefixed so
// Vercel does not route it as an endpoint.
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Returns the verified user id from the Authorization header, or null.
async function resolveUserId(req) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return null
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data || !data.user) return null
    return data.user.id
  } catch (_) {
    return null
  }
}

// Returns the verified user's id AND email, for flows (like domain-match
// claiming) that need to trust the email too — never take email from the body.
async function resolveUser(req) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return null
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data || !data.user) return null
    return { id: data.user.id, email: data.user.email || null }
  } catch (_) {
    return null
  }
}

module.exports = { resolveUserId, resolveUser }
