// api/beacon.js
// ─────────────────────────────────────────────────────────────────────────────
// The beacon — the read endpoint the Mission Control strip, the steward ledger,
// and the public record all consume. It counts what already exists
// (actor_call_strand_log check-ins and actor_call_participants completions)
// across a founding challenge and its lineage tree, via the functions from
// migration 152. Public read; no auth.
//
// A spark is a check-in. Completing is worth five. The economy lives on the
// beacon row (checkin_sparks, completion_sparks), so this endpoint is the only
// place the formula is applied.
//
// POST { action, beacon_id?, slug? }
//   action 'get'        (default) → { ...beacon, sparks, checkins, completions, people, orgs, challenges }
//   action 'breakdown'           → { ...beacon, challenges: [ per-challenge rows ] }
//
// With no beacon_id and no slug, the most recent beacon is used (there is one
// for now). While a beacon is pending (root not yet authored), every count is 0
// and rooted=false — not an error.
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function loadBeacon({ beacon_id, slug }) {
  let q = supabase.from('constellation_beacons').select('*')
  if (beacon_id) q = q.eq('id', beacon_id).maybeSingle()
  else if (slug) q = q.eq('slug', slug).maybeSingle()
  else q = q.order('created_at', { ascending: false }).limit(1).maybeSingle()
  const { data } = await q
  return data
}

function publicShape(b) {
  return {
    id: b.id,
    slug: b.slug,
    label: b.label,
    opens_on: b.opens_on,
    closes_on: b.closes_on,
    status: b.status,
    rooted: !!b.root_call_id,
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action = 'get', beacon_id, slug } = req.body || {}

  const beacon = await loadBeacon({ beacon_id, slug })
  if (!beacon) return res.status(404).json({ error: 'No beacon found' })

  const base = publicShape(beacon)

  // Pending (not yet rooted): everything is zero, honestly.
  if (!beacon.root_call_id) {
    if (action === 'breakdown') return res.json({ ...base, challenges: [] })
    return res.json({ ...base, sparks: 0, checkins: 0, completions: 0, people: 0, orgs: 0, challenges: 0 })
  }

  const spark = (checkins, completions) =>
    Number(checkins) * beacon.checkin_sparks + Number(completions) * beacon.completion_sparks

  if (action === 'breakdown') {
    const { data, error } = await supabase.rpc('beacon_breakdown', { p_root_call_id: beacon.root_call_id })
    if (error) return res.status(500).json({ error: error.message })
    const challenges = (data || []).map((r) => ({
      call_id: r.call_id,
      title: r.title,
      the_move: r.the_move,
      domain: r.domain,
      cadence: r.cadence,
      actor_id: r.actor_id,
      actor_name: r.actor_name,
      actor_slug: r.actor_slug,
      people: Number(r.people),
      checkins: Number(r.checkins),
      completions: Number(r.completions),
      done: Number(r.checkins),                       // "actions taken" for the record
      sparks: spark(r.checkins, r.completions),
    }))
    return res.json({ ...base, challenges })
  }

  // Default: the headline tally.
  const { data, error } = await supabase.rpc('beacon_tally', { p_root_call_id: beacon.root_call_id })
  if (error) return res.status(500).json({ error: error.message })
  const t = (data && data[0]) || { checkins: 0, completions: 0, people: 0, orgs: 0, challenges: 0 }

  return res.json({
    ...base,
    sparks: spark(t.checkins, t.completions),
    checkins: Number(t.checkins),
    completions: Number(t.completions),
    people: Number(t.people),
    orgs: Number(t.orgs),
    challenges: Number(t.challenges),
  })
}
