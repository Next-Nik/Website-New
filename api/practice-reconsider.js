// api/practice-reconsider.js
//
// Best Practices — Slice 5: reconsideration submission.
//
// A person argues a ruled-out practice deserves another look. The bar is a
// substantive case, reviewed by a human, never a debate. A practice marked
// settled (reconsideration_open = false) is refused outright — we don't
// relitigate flat earth. Accepted submissions are reviewed by a founder; this
// endpoint never reopens anything on its own.
//
// POST body: { practiceId, basis }
// Auth:      Authorization: Bearer <supabase_access_token> (a real person, signed in)

export const config = { maxDuration: 30 }

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = req.headers.authorization || req.headers.Authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Sign-in required to propose a reconsideration' })
  const { data: ures, error: uerr } = await supabase.auth.getUser(token)
  if (uerr || !ures?.user) return res.status(401).json({ error: 'Invalid session' })
  const userId = ures.user.id

  const { practiceId, basis } = req.body || {}
  if (!practiceId) return res.status(400).json({ error: 'practiceId required' })
  if (!basis || !basis.trim() || basis.trim().length < 40) {
    return res.status(400).json({ error: 'A substantive basis is required — describe the specific change, not an opinion.' })
  }

  const { data: practice } = await supabase
    .from('nextus_practices')
    .select('id, name, standing, reconsideration_open')
    .eq('id', practiceId)
    .single()
  if (!practice) return res.status(404).json({ error: 'Practice not found' })

  // Only ruled-out practices are reconsidered, and only those left open.
  if (practice.standing !== 'ruled_out') {
    return res.status(200).json({ ok: true, note: 'This practice is not ruled out — nothing to reconsider.' })
  }
  if (!practice.reconsideration_open) {
    return res.status(200).json({
      settled: true,
      message: 'This one is settled and not open to reconsideration.',
    })
  }

  const { error } = await supabase.from('nextus_practice_reconsiderations').insert({
    practice_id:  practiceId,
    submitted_by: userId,
    basis:        basis.trim(),
  })
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ ok: true, submitted: true })
}
