// ── NextUs Integrity Cron ────────────────────────────────────
// Runs nightly via Vercel Cron (see vercel.json crons config).
// Enforces three structural integrity rules:
//
//   1. LOOP CLOSURE GATE
//      Actors with confirmed contributions older than 60 days
//      that have no outcome_report filed get their needs_visible
//      flag set to false. Their needs disappear from the directory
//      until they close the loop.
//
//   2. DORMANCY SIGNAL
//      Actors and contributor offers not updated in 90+ days get
//      a dormant_since timestamp written. The UI reads this and
//      shows "Last active X days ago" visibly on the profile.
//      Not a ban — transparency.
//
//   3. ALIGNMENT SCORE COMPUTATION
//      Computes a real alignment score for each actor from their
//      closed contribution loops (outcome_reported = true).
//      Replaces self-declared scores with evidence-based ones
//      once an actor has >= 3 closed loops.
//      Formula: avg of (contributions weight) across closed loops,
//      normalised 0–10. Until 3 loops, score stays null (shown as
//      "Not yet established" in the UI).
//
// Called by Vercel Cron. Also callable manually at
// POST /api/integrity-cron with header x-cron-secret matching
// CRON_SECRET env var (for manual runs / testing).

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const LOOP_CLOSURE_DAYS = 60
const DORMANCY_DAYS     = 90
const MIN_LOOPS_FOR_SCORE = 3

// ── Helpers ──────────────────────────────────────────────────

function daysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function log(msg, data = '') {
  console.log(`[integrity-cron] ${msg}`, data)
}

// ── Rule 1: Loop closure gate ─────────────────────────────────
// Any actor who has confirmed contributions older than 60 days
// with no outcome report filed — hide their needs.

async function enforceLoopClosure() {
  log('Running loop closure gate...')

  // Find actors with overdue outcome reports
  const { data: overdue, error: fetchError } = await supabase
    .from('nextus_contributions')
    .select('actor_id, confirmed_at')
    .eq('confirmed_by_actor', true)
    .eq('outcome_reported', false)
    .lt('confirmed_at', daysAgo(LOOP_CLOSURE_DAYS))

  if (fetchError) { log('Error fetching overdue contributions:', fetchError.message); return 0 }
  if (!overdue?.length) { log('No overdue contribution loops found.'); return 0 }

  // Unique actor IDs with overdue loops
  const actorIds = [...new Set(overdue.map(c => c.actor_id))]
  log(`Found ${actorIds.length} actors with overdue loops.`)

  // Set needs_visible = false for these actors
  const { error: updateError } = await supabase
    .from('nextus_actors')
    .update({
      needs_visible: false,
      needs_hidden_reason: 'loop_closure',
      needs_hidden_at: new Date().toISOString(),
    })
    .in('id', actorIds)
    .eq('needs_visible', true) // only update if currently visible

  if (updateError) { log('Error hiding needs:', updateError.message); return 0 }

  log(`Hidden needs for ${actorIds.length} actors.`)
  return actorIds.length
}

// ── Rule 1b: Restore visibility when loops close ─────────────
// Actors whose ALL confirmed contributions now have outcome reports
// get their needs_visible restored.

async function restoreLoopCompliant() {
  log('Checking for loop-compliant actors to restore...')

  // Find actors currently hidden for loop_closure reason
  const { data: hidden, error: fetchError } = await supabase
    .from('nextus_actors')
    .select('id')
    .eq('needs_visible', false)
    .eq('needs_hidden_reason', 'loop_closure')

  if (fetchError || !hidden?.length) { return 0 }

  const restored = []

  for (const actor of hidden) {
    // Check if they still have any unresolved confirmed contributions
    const { count } = await supabase
      .from('nextus_contributions')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', actor.id)
      .eq('confirmed_by_actor', true)
      .eq('outcome_reported', false)
      .lt('confirmed_at', daysAgo(LOOP_CLOSURE_DAYS))

    if (count === 0) {
      restored.push(actor.id)
    }
  }

  if (!restored.length) { log('No actors eligible for restoration.'); return 0 }

  await supabase
    .from('nextus_actors')
    .update({
      needs_visible: true,
      needs_hidden_reason: null,
      needs_hidden_at: null,
    })
    .in('id', restored)

  log(`Restored needs visibility for ${restored.length} actors.`)
  return restored.length
}

// ── Rule 2: Dormancy signals ──────────────────────────────────
// Write dormant_since timestamp to actors and contributor offers
// that haven't been updated in 90+ days.

async function computeDormancy() {
  log('Computing dormancy signals...')
  const threshold = daysAgo(DORMANCY_DAYS)
  let count = 0

  // Actors dormant
  const { data: dormantActors, error: actorErr } = await supabase
    .from('nextus_actors')
    .select('id, updated_at, dormant_since')
    .lt('updated_at', threshold)
    .is('dormant_since', null)

  if (!actorErr && dormantActors?.length) {
    const { error } = await supabase
      .from('nextus_actors')
      .update({ dormant_since: new Date().toISOString() })
      .in('id', dormantActors.map(a => a.id))
    if (!error) count += dormantActors.length
    log(`Marked ${dormantActors.length} actors as dormant.`)
  }

  // Un-dormant actors that have been updated recently
  const { data: activeActors } = await supabase
    .from('nextus_actors')
    .select('id')
    .gte('updated_at', threshold)
    .not('dormant_since', 'is', null)

  if (activeActors?.length) {
    await supabase
      .from('nextus_actors')
      .update({ dormant_since: null })
      .in('id', activeActors.map(a => a.id))
    log(`Cleared dormancy for ${activeActors.length} recently active actors.`)
  }

  // Contributor offers dormant
  const { data: dormantOffers, error: offerErr } = await supabase
    .from('nextus_contributor_offers')
    .select('id, last_active_at')
    .lt('last_active_at', threshold)
    .eq('is_active', true)

  if (!offerErr && dormantOffers?.length) {
    // Don't auto-deactivate — just update last_active signal
    // The UI shows "Last active X days ago" from this
    log(`Found ${dormantOffers.length} dormant contributor offers (signal only, not deactivated).`)
    count += dormantOffers.length
  }

  return count
}

// ── Rule 3: Alignment score computation ──────────────────────
// Replace self-declared alignment scores with evidence-based ones
// once an actor has >= MIN_LOOPS_FOR_SCORE closed loops.
// Score = proportion of confirmed contributions that also have
// outcome reports, weighted by recency, normalised to 0–10.

async function computeAlignmentScores() {
  log('Computing evidence-based alignment scores...')
  let updated = 0

  // Get all actors with at least MIN_LOOPS_FOR_SCORE confirmed contributions
  const { data: actors, error } = await supabase
    .from('nextus_actors')
    .select('id, alignment_score')

  if (error || !actors?.length) return 0

  for (const actor of actors) {
    const { data: confirmed, error: confErr } = await supabase
      .from('nextus_contributions')
      .select('id, outcome_reported, confirmed_at, created_at')
      .eq('actor_id', actor.id)
      .eq('confirmed_by_actor', true)
      .order('confirmed_at', { ascending: false })

    if (confErr || !confirmed?.length) continue

    // Not enough loops yet — leave score null
    if (confirmed.length < MIN_LOOPS_FOR_SCORE) continue

    // Score = (closed loops / total confirmed) * 10
    // weighted slightly toward recent: last 10 loops count double
    const recent   = confirmed.slice(0, 10)
    const older    = confirmed.slice(10)
    const recentClosed = recent.filter(c => c.outcome_reported).length
    const olderClosed  = older.filter(c => c.outcome_reported).length

    const recentWeight = recent.length > 0 ? (recentClosed / recent.length) * 2 : 0
    const olderWeight  = older.length  > 0 ? (olderClosed  / older.length)        : 0
    const totalWeight  = recent.length > 0 && older.length > 0
      ? (recentWeight + olderWeight) / 3
      : recentWeight / 2

    const score = Math.round(totalWeight * 10 * 10) / 10 // 1 decimal place

    // Only update if score changed meaningfully (>0.5 point difference)
    if (Math.abs((actor.alignment_score || 0) - score) > 0.5) {
      await supabase
        .from('nextus_actors')
        .update({
          alignment_score: score,
          alignment_score_computed: true,
          alignment_score_updated_at: new Date().toISOString(),
        })
        .eq('id', actor.id)
      updated++
    }
  }

  log(`Updated alignment scores for ${updated} actors.`)
  return updated
}

// ── Main handler ──────────────────────────────────────────────

module.exports = async function handler(req, res) {
  // Security: verify cron secret on POST requests
  if (req.method === 'POST') {
    const secret = req.headers['x-cron-secret']
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorised' })
    }
  }

  // Only allow GET (from Vercel Cron) or POST (manual with secret)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  log('Starting integrity cron run...')

  try {
    const [hidden, restored, dormant, scored] = await Promise.all([
      enforceLoopClosure(),
      restoreLoopCompliant(),
      computeDormancy(),
      computeAlignmentScores(),
    ])

    const duration = Date.now() - startTime
    const result = { hidden, restored, dormant, scored, duration_ms: duration, ran_at: new Date().toISOString() }

    log('Integrity cron complete.', result)
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    log('Integrity cron failed:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
