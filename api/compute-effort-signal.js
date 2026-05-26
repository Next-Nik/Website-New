// ── NextUs Effort Signal Cron ───────────────────────────────
// Computes the bottom-up effort signal — the visible companion to the
// top-down planetary scores. Writes one row per domain per snapshot date
// to nextus_effort_signal_daily.
//
// Per the Atlas Actor Profile Architecture Section 5: this is the
// architecture that turns the Atlas from a directory into a visible
// signal of civilisational work in motion.
//
// Schedule: 03:45 UTC daily via Vercel Cron (vercel.json). Runs 15 min
// after compute-daily-snapshot so the planetary scores and the effort
// signal land close together.
//
// Also callable manually:
//   POST /api/compute-effort-signal
//   header: x-cron-secret = CRON_SECRET env var
//
// What gets summed
// ----------------
// For each civilisational domain (the 7 planetary domains):
//   active_actors           — count of distinct live actors placed in
//                             that domain (primary or secondary)
//   total_people_in_the_work — sum of people_in_the_work across those
//                              actors (NULLs counted as zero — only
//                              declared work contributes)
//   by_scale                — distribution of total by actor scale
//   by_mode                 — distribution of total by actor_mode
//   by_actor_type           — distribution of total by actor.type
//
// What "active" means
// -------------------
// An actor counts as active in a domain if ALL of these:
//   - status = 'live'
//   - The domain appears in actor.domains (the array placement)
//   - lifecycle_status is null or in ('active', 'in_development')
//
// dormant actors do not contribute. This is per the architecture's
// note that dormant actors should drop from the aggregate.
//
// Multi-domain actors contribute fully to each domain they're placed
// in (the same person/programme/place IS real to each domain). Total
// people-in-the-work across domains will therefore double-count when
// summed; the platform must be careful not to sum across domains for
// a grand total without that being explicit.
//
// Honesty locks
// -------------
//   - No actor-level data is included in the output.
//   - Sub-slices (by_scale, by_mode, by_actor_type) are stored raw;
//     the display layer applies the minimum-slice threshold (Lock 3).
//   - Aggregates are domain-level; no cross-domain ranking is implied.

const { createClient } = require('@supabase/supabase-js')

let _supabase = null
function supabaseClient() {
  if (_supabase) return _supabase
  _supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  return _supabase
}

// ── Constants mirrored from src/app/hooks/useDomainIndicators.js ───
// These are the seven civilisational domains as they appear in
// nextus_actors.domains arrays.
const CIV_DOMAINS = [
  'human-being',
  'society',
  'nature',
  'technology',
  'finance-economy',
  'legacy',
  'vision',
]

// ── Helpers ─────────────────────────────────────────────────

function log(msg, data = '') {
  console.log(`[effort-signal-cron] ${msg}`, data)
}

function logErr(msg, err) {
  console.error(`[effort-signal-cron] ${msg}`, err)
}

function todayUTC() {
  const d = new Date()
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Increment a bucket counter in an object: { [key]: number }
function bump(obj, key, by) {
  if (!key) return
  const k = String(key)
  obj[k] = (obj[k] || 0) + by
}

// ── Handler ─────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  // Security: POST requires CRON_SECRET. GET is for Vercel Cron.
  if (req.method === 'POST') {
    const secret = req.headers['x-cron-secret']
    if (!secret || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorised' })
    }
  }

  const startedAt = Date.now()
  const snapshotDate = todayUTC()
  log(`Starting effort signal aggregate for ${snapshotDate}`)

  try {
    // 1. Pull every live actor with its placement, lifecycle, and the
    //    private people_in_the_work declaration. We run this from the
    //    service role so we bypass RLS — the destination aggregate
    //    table never exposes per-actor data.
    const { data: actors, error: actorsErr } = await supabaseClient()
      .from('nextus_actors')
      .select('id, type, domains, domain_id, scale, actor_mode, lifecycle_status, status, people_in_the_work')
      .eq('status', 'live')

    if (actorsErr) throw actorsErr
    log(`Loaded ${actors?.length || 0} live actors`)

    // 2. Initialise the per-domain accumulators.
    const accumulators = {}
    for (const d of CIV_DOMAINS) {
      accumulators[d] = {
        active_actors: 0,
        total_people_in_the_work: 0,
        by_scale: {},
        by_mode: {},
        by_actor_type: {},
      }
    }

    // 3. Walk every actor. Skip dormant ones. Attribute to every
    //    domain in their placement (primary or secondary; we read
    //    from the .domains array, falling back to .domain_id when
    //    the array is empty).
    for (const a of (actors || [])) {
      const lifecycle = a.lifecycle_status || 'active'
      if (lifecycle !== 'active' && lifecycle !== 'in_development') continue

      const placedDomains = Array.isArray(a.domains) && a.domains.length > 0
        ? a.domains
        : (a.domain_id ? [a.domain_id] : [])

      const peopleInTheWork = Number.isInteger(a.people_in_the_work)
        ? Math.max(0, a.people_in_the_work)
        : 0

      for (const d of placedDomains) {
        if (!CIV_DOMAINS.includes(d)) continue
        const bucket = accumulators[d]
        bucket.active_actors += 1
        bucket.total_people_in_the_work += peopleInTheWork
        bump(bucket.by_scale,      a.scale       || 'unspecified', peopleInTheWork)
        bump(bucket.by_mode,       a.actor_mode  || 'unspecified', peopleInTheWork)
        bump(bucket.by_actor_type, a.type        || 'unspecified', peopleInTheWork)
      }
    }

    // 4. Upsert one row per domain for snapshot_date.
    const rows = CIV_DOMAINS.map(d => ({
      snapshot_date: snapshotDate,
      domain:        d,
      domain_track:  'civ',
      active_actors:            accumulators[d].active_actors,
      total_people_in_the_work: accumulators[d].total_people_in_the_work,
      by_scale:        accumulators[d].by_scale,
      by_mode:         accumulators[d].by_mode,
      by_actor_type:   accumulators[d].by_actor_type,
      computed_at:     new Date().toISOString(),
    }))

    const { error: upsertErr } = await supabaseClient()
      .from('nextus_effort_signal_daily')
      .upsert(rows, { onConflict: 'snapshot_date,domain,domain_track' })

    if (upsertErr) throw upsertErr

    const elapsedMs = Date.now() - startedAt
    log(`Done in ${elapsedMs}ms`)

    // 5. Return a summary so manual invocation reads honestly without
    //    exposing any per-actor data.
    const summary = {}
    for (const d of CIV_DOMAINS) {
      summary[d] = {
        active_actors:            accumulators[d].active_actors,
        total_people_in_the_work: accumulators[d].total_people_in_the_work,
      }
    }

    return res.status(200).json({
      ok: true,
      snapshot_date: snapshotDate,
      elapsed_ms: elapsedMs,
      summary,
    })
  } catch (err) {
    logErr('effort signal computation failed', err)
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
    })
  }
}
