// src/app/lib/guideTiers.js
//
// Tier derivation for the field guide at /guide (slug provisional ·
// naming session pending; UI label "Your guide" — also provisional).
//
// A tier is derived, never stored. Sources, in ascending ladder order:
//
//   found      — default. Not in the returned map; the page treats any
//                actor without an entry as found (not met).
//   known      — the user wrote a field note (actor_field_notes row).
//   following  — the user watches the actor (nextus_user_watches row,
//                entity_type 'actor').
//   allied     — at least one action row: actor_call_strand_log, joined
//                via actor_call_participants → actor_calls.actor_id.
//   companion  — several such action rows over a sustained period.
//                The exact threshold is internal and MUST NOT be surfaced
//                anywhere in the UI — no counts, no progress indicators,
//                no "n of m". The UI only ever shows the tier state.
//
// Highest applicable tier wins (e.g. note + watch → following, because
// following sits above known in the ladder).
//
// Each source is queried defensively in its own try/catch — a missing
// table or a schema drift skips that source instead of breaking the
// page. All queries are batched (.in() with chunking); no per-actor
// round trips.

export const TIER_ORDER = ['found', 'known', 'following', 'allied', 'companion']

const TIER_RANK = Object.fromEntries(TIER_ORDER.map((t, i) => [t, i]))

// Internal companion threshold — never surfaced. See header comment.
const COMPANION_MIN_ACTIONS = 3
const COMPANION_MIN_SPAN_DAYS = 60

// Supabase .in() is happiest with bounded lists; chunk defensively.
const IN_CHUNK = 200

function chunk(list, size = IN_CHUNK) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

async function selectIn(supabase, table, columns, column, ids) {
  const rows = []
  for (const part of chunk(ids)) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .in(column, part)
    if (error) throw error
    rows.push(...(data || []))
  }
  return rows
}

/**
 * loadGuideState(supabase, userId)
 *   → Map<actorId, { tier, note }>
 *
 * tier ∈ 'known' | 'following' | 'allied' | 'companion'. Actors with no
 * entry are 'found' (not met). `note` is the user's own field note text
 * when one exists (kept even when a higher tier overrides 'known', so
 * the page can render the note alongside the tier mark); null otherwise.
 */
export async function loadGuideState(supabase, userId) {
  const state = new Map()
  if (!supabase || !userId) return state

  const lift = (actorId, tier) => {
    if (!actorId) return
    const prev = state.get(actorId)
    if (!prev) {
      state.set(actorId, { tier, note: null })
    } else if (TIER_RANK[tier] > TIER_RANK[prev.tier]) {
      prev.tier = tier
    }
  }

  // ── known: a field note exists ──────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('actor_field_notes')
      .select('actor_id, note')
      .eq('user_id', userId)
    if (error) throw error
    for (const row of data || []) {
      lift(row.actor_id, 'known')
      const entry = state.get(row.actor_id)
      if (entry) entry.note = row.note
    }
  } catch {
    // Table missing or unreadable — skip the source.
  }

  // ── following: a watch row exists ───────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('nextus_user_watches')
      .select('entity_id')
      .eq('user_id', userId)
      .eq('entity_type', 'actor')
    if (error) throw error
    for (const row of data || []) lift(row.entity_id, 'following')
  } catch {
    // Skip.
  }

  // ── allied / companion: action rows via calls ───────────────────────
  // actor_call_strand_log → actor_call_participants → actor_calls.actor_id.
  try {
    const { data: participants, error: pErr } = await supabase
      .from('actor_call_participants')
      .select('id, call_id')
      .eq('user_id', userId)
    if (pErr) throw pErr

    if (participants && participants.length > 0) {
      const callIds = [...new Set(participants.map(p => p.call_id).filter(Boolean))]
      const calls = await selectIn(
        supabase, 'actor_calls', 'id, actor_id', 'id', callIds,
      )
      const actorByCall = new Map(
        calls.filter(c => c.actor_id).map(c => [c.id, c.actor_id]),
      )
      const actorByParticipant = new Map()
      for (const p of participants) {
        const actorId = actorByCall.get(p.call_id)
        if (actorId) actorByParticipant.set(p.id, actorId)
      }

      // Joining is itself a real act: taking on a challenge or answering an
      // ask ties you to that actor at the allied tier, before any check-in
      // is logged (BP-12 · full derivation from real acts, not only strand
      // logs). Companion still requires the sustained action below.
      for (const actorId of actorByParticipant.values()) lift(actorId, 'allied')

      const participantIds = [...actorByParticipant.keys()]
      if (participantIds.length > 0) {
        const logs = await selectIn(
          supabase, 'actor_call_strand_log',
          'participant_id, log_date', 'participant_id', participantIds,
        )

        // Group action dates per actor.
        const datesByActor = new Map()
        for (const row of logs) {
          const actorId = actorByParticipant.get(row.participant_id)
          if (!actorId || !row.log_date) continue
          const t = new Date(row.log_date).getTime()
          if (Number.isNaN(t)) continue
          if (!datesByActor.has(actorId)) datesByActor.set(actorId, [])
          datesByActor.get(actorId).push(t)
        }

        for (const [actorId, times] of datesByActor) {
          if (times.length === 0) continue
          lift(actorId, 'allied')
          const spanDays =
            (Math.max(...times) - Math.min(...times)) / (1000 * 60 * 60 * 24)
          if (
            times.length >= COMPANION_MIN_ACTIONS &&
            spanDays >= COMPANION_MIN_SPAN_DAYS
          ) {
            lift(actorId, 'companion')
          }
        }
      }
    }
  } catch {
    // Any of the three call tables missing — skip the whole source.
  }

  return state
}
