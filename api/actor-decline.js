// api/actor-decline.js
// The exit promised in the nomination note. One click, no account.
//
// Resolves the actor by its decline_token and takes it down: status=suspended
// (the platform's established hidden state) plus declined_at to record that the
// org itself asked for removal, not a moderator. Idempotent.

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY))

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.body || {}
  if (!token) return res.status(400).json({ error: 'token required' })

  const { data: actor } = await supabase
    .from('nextus_actors')
    .select('id, name, declined_at, profile_owner')
    .eq('decline_token', token)
    .maybeSingle()

  if (!actor) return res.status(404).json({ error: 'This removal link is not valid.' })

  // Already removed — idempotent success.
  if (actor.declined_at) return res.json({ removed: true, name: actor.name })

  // If the org has since claimed it, a decline link should not tear it down.
  if (actor.profile_owner) return res.status(409).json({ error: 'This profile has since been claimed. Manage it from the profile page.' })

  const { error } = await supabase.from('nextus_actors')
    .update({ status: 'suspended', vetting_status: 'declined', declined_at: new Date().toISOString() })
    .eq('id', actor.id)

  if (error) return res.status(500).json({ error: 'Removal failed. Please try again.' })
  return res.json({ removed: true, name: actor.name })
}
