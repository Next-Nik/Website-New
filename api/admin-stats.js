// api/admin-stats.js
// ─────────────────────────────────────────────────────────────────────────────
// Founder-gated aggregate usage counts for the admin console Now tab.
//
// Why this exists: the personal-tool tables (map_results, purpose_piece_results,
// target_sprint_sessions) are correctly RLS-locked to each user's own rows.
// Browser-side counts therefore only ever showed the founder's OWN usage,
// labelled as platform-wide. This endpoint runs the counts under the service
// role — outside RLS — and returns INTEGERS ONLY.
//
// Privacy contract: this endpoint never selects, reads into memory, or returns
// any row content. `head: true` issues HEAD requests — Supabase returns the
// count in a header and no body. No user ids, no names, no tool content ever
// leaves the database through this path. Aggregate visibility for the admin;
// personal data stays sealed, including from the admin.
//
// Auth: Authorization: Bearer <supabase_access_token>, role 'founder' in
// app_metadata (never user_metadata — that is user-editable).
// ─────────────────────────────────────────────────────────────────────────────

export const config = { maxDuration: 30 }

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function requireFounder(req) {
  const auth = req.headers.authorization || req.headers.Authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { ok: false, code: 401, error: 'Missing token' }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return { ok: false, code: 401, error: 'Invalid token' }
  if (data.user.app_metadata?.role !== 'founder') return { ok: false, code: 403, error: 'Founder only' }
  return { ok: true, userId: data.user.id }
}

// Count helper — HEAD request, count only, never a row.
async function countOf(table, filter) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  if (filter) q = filter(q)
  const { count, error } = await q
  if (error) return null   // table missing or misnamed — surface as null, not 0
  return count ?? 0
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const auth = await requireFounder(req)
  if (!auth.ok) return res.status(auth.code).json({ error: auth.error })

  const [users, mapsComplete, purposePieces, activeSprints] = await Promise.all([
    countOf('users'),
    countOf('map_results',            q => q.eq('complete', true)),
    countOf('purpose_piece_results'),
    countOf('target_sprint_sessions', q => q.eq('status', 'active')),
  ])

  return res.status(200).json({
    ok: true,
    stats: {
      users,
      maps_complete:  mapsComplete,
      purpose_pieces: purposePieces,
      active_sprints: activeSprints,
    },
    generated_at: new Date().toISOString(),
  })
}
