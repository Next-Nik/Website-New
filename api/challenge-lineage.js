// api/challenge-lineage.js
// Reads the viewer-relative lineage of a challenge — the ancestor path up to the
// root and the descendants beneath it — via the functions from migration 140.
// Public read; community-only nodes (the functions enforce that, drafts and
// unlisted never surface). No auth required.
//
// Action (req.body.action):
//   get_lineage  — { call_id } → { ancestors, descendants }

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  process.env.SUPABASE_URL,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, ...body } = req.body || {}

  if (action === 'get_lineage') {
    const { call_id } = body
    if (!call_id) return res.status(400).json({ error: 'call_id required' })

    // The tree is only meaningful for a focus that is itself in the public
    // chain. A hidden, withdrawn, or deleted focus has no place to show, so we
    // return an empty lineage rather than re-rooting the view on an ancestor.
    const { data: focus } = await supabase
      .from('actor_calls')
      .select('visibility, lifecycle_state')
      .eq('id', call_id)
      .maybeSingle()
    if (!focus || focus.visibility !== 'community' || focus.lifecycle_state === 'deleted') {
      return res.json({ ancestors: [], descendants: [] })
    }

    const [anc, desc] = await Promise.all([
      supabase.rpc('challenge_ancestors',   { p_call_id: call_id }),
      supabase.rpc('challenge_descendants', { p_call_id: call_id, p_max_depth: 2 }),
    ])

    if (anc.error || desc.error) {
      return res.status(500).json({ error: (anc.error || desc.error).message })
    }

    return res.json({
      ancestors:   anc.data  || [],   // root-first, includes the focus node (depth_from_focus 0)
      descendants: desc.data || [],   // immediate children + grandchildren
    })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
