// src/lib/practice/index.js
//
// THE PRACTICE — recovery-informed daily tools, its own standalone tool with
// its own front door (Profile panel, alongside Admin Console, Movie Magic,
// Care Protocol, Prism Lab), not a tab inside Care Protocol. It began as
// Care Protocol's Practice tab and was pulled out into its own product
// surface by direct request — this module was already fully portable (no
// care/, Supabase, or React imports), so the extraction is a page move plus
// a table rename, not a rewrite.
//
// The page (src/pages/Practice.jsx) holds the buttons; this module holds the
// vocabulary and the pure logic for the daily loop — states, urges, small
// completed actions, repeated unremarkably, as opposed to the snapshots
// (a birth moment, an instrument scored once) other tools in this ecosystem
// compute.
//
// DESIGN RULES, inherited and non-negotiable:
//   - Portable: no React, no Supabase, no app imports. Every function takes
//     plain data and a `now` where time matters, so all of it is testable
//     against fixed dates.
//   - Founder-only, and STRUCTURALLY absent from every other tool's shareable
//     surfaces: nothing in this module is reachable from Care Protocol's
//     buildCard()/publicCard(), so practice data can never enter a share
//     snapshot — the same missing-edge guarantee birth data has, not a filter
//     that could be forgotten. (Care Protocol's synthesis MAY read a summary
//     of this data by explicit, founder-approved design — see
//     buildRecoveryContext below — but that is an opt-in cross-tool read of
//     trends, never a card-facing path.)
//   - Original wording throughout. Recovery-program literature is copyrighted
//     and is NOT reproduced or paraphrased here; the framing draws on the
//     founder's own written recovery notes and on published stress-physiology
//     literature (allostasis, affect labeling, reinforcement schedules). Same
//     move as Care Protocol's careReceiving.js vs the trademarked
//     five-languages quiz.
//   - Daily and small, never heroic. The tool itself obeys the prime
//     directive: no streaks (a broken streak is spike-crash shame fuel — the
//     history just shows what happened), no scores, no targets.
//
// Event model: everything is an APPEND-ONLY event row (practice_events,
// sql/188_practice.sql). No update path exists anywhere — the tape is
// "latest tape event wins", a receiving window is an open event optionally
// followed by a close event, a mistaken entry is deleted, not edited. This is
// deliberate: insert-only sidesteps the entire conflict-merge machinery a
// profile row needs, and every entry is one explicit press with its own
// confirmation.

/* ── states — the 10-second check-in ─────────────────────────
   Affect labeling: naming the state is itself the intervention (it measurably
   dampens the limbic response — this is the one tool here with direct
   experimental support). Each state carries a `truth` line, rendered the
   moment it is logged: the instant, zero-cost payoff, no model call needed. */

export const PRACTICE_STATES = [
  {
    key: 'settled',
    label: 'Settled',
    tone: 'moss',
    prompt: 'Calm, present, nothing being braced for.',
    truth: 'This is allowed. Nothing has to go wrong first.',
  },
  {
    key: 'fog',
    label: 'Fog',
    tone: 'neutral',
    prompt: 'Vague, circling. Everything is someday and nothing has a number.',
    truth: 'The fog is the product, not the weather. One definite number thins it.',
  },
  {
    key: 'charged',
    label: 'Charged',
    tone: 'clay',
    prompt: 'Cortisol up. Bracing, scanning, crisis-pull, righteous.',
    truth: 'This is the familiar state, not the true one — a set-point defending itself, not a fact being reported.',
  },
  {
    key: 'crashed',
    label: 'Crashed',
    tone: 'ghost',
    prompt: 'Spent, flat. The after-state once a spike lets go.',
    truth: 'The crash is the same wave as the spike. Small and boring is the way back — not another spike.',
  },
]

export const PRACTICE_STATES_BY_KEY = Object.fromEntries(PRACTICE_STATES.map((s) => [s.key, s]))

/* ── urges — sabotage-pulls, logged like cravings ────────────
   The documented withdrawal profile: when receiving actually starts, the
   system registers it as danger and reaches for one of these to restore the
   familiar state. Logging one frames it as WITHDRAWAL, never character. */

export const URGE_PULLS = [
  { key: 'blow_it_up', label: 'Blow it up', hint: 'Pick a fight · torpedo a good thing' },
  { key: 'go_vague', label: 'Go vague', hint: 'Retreat into the fog · let the number blur' },
  { key: 'manufacture', label: 'Manufacture chaos', hint: 'Invent an emergency · find the fire' },
  { key: 'spend_away', label: 'Spend it away', hint: 'Move the good thing along before it lands' },
  { key: 'undersell', label: 'Talk myself into less', hint: 'Accept the bad fit · shrink the ask' },
  { key: 'vanish', label: 'Vanish', hint: 'Go quiet · avoid the ask · dodge the call' },
]

export const URGE_PULLS_BY_KEY = Object.fromEntries(URGE_PULLS.map((p) => [p.key, p]))

export const URGE_ACTIONS = [
  { key: 'rode', label: 'Named it and rode it out' },
  { key: 'moved', label: 'Made the move anyway' },
  { key: 'riding', label: 'Still in it right now' },
]

export const URGE_ACTIONS_BY_KEY = Object.fromEntries(URGE_ACTIONS.map((a) => [a.key, a]))

/* ── loops — clean dopamine, steady payout ───────────────────
   Small completed loops with immediate marking, retraining the circuit from
   slot-machine (variable-ratio maybe) toward steady payout. Three presets,
   straight from the recovery notes: one ask, one number, one boundary. */

export const LOOP_PRESETS = [
  { key: 'ask', label: 'One concrete ask made' },
  { key: 'number', label: 'One vague thing given a real number' },
  { key: 'boundary', label: 'One boundary held' },
]

/* ── receipts — the evidence campaign ────────────────────────
   The set-point work's own frame: the baseline moves on accumulated proof,
   so the small proofs get marked — a calm that lasted, a good thing let
   landed, a night slept, a window closed on purpose. The Receipt log, for
   the body. */

export const RECEIPT_HINTS = [
  'a calm that lasted',
  'a good thing you let land',
  'a night you actually slept',
  'an urge that rose and passed',
]

/* ── the daily loop — anchor and return ──────────────────────
   The anchor is ONE BIT, deliberately: it records that the founder's
   existing morning practice happened — light, the questions, whatever it is
   that day. It does not become the practice; a second competing morning
   system is the exact failure the recovery notes warn about. The return is
   the evening half: three optional short fields, inventory-shaped without
   any program language, with "what did I do well" deliberately present so
   the off-today field can't become the whole ritual. */

export const RETURN_FIELDS = [
  { key: 'off', label: 'Where was I off today?', hint: 'One line. Naming, not prosecuting.' },
  { key: 'well', label: 'What did I do well?', hint: 'This field is not optional decoration. It counters a long habit of only counting the misses.' },
  { key: 'clear', label: 'Anything to clear with someone?', hint: 'Just the noticing. What to do about it is a conversation for the people in your corner.' },
]

/** Grounding text for the return reflection (api/care-reflection.js,
    practice mode, kind 'return'). */
export function describeReturnForReflection(payload) {
  const lines = RETURN_FIELDS
    .map((f) => (payload[f.key] ? `${f.label} — in their words: "${payload[f.key]}"` : null))
    .filter(Boolean)
  return lines.join('\n')
}

/** Has this kind been logged on this local day already? Used to render the
    anchor as already-done rather than re-loggable — one bit per day. */
export function loggedToday(events, kind, dayKey) {
  if (!Array.isArray(events)) return false
  return events.some((e) => e.kind === kind && dayKeyOf(e.at) === dayKey)
}

/* ── counters — the personal layer on the states ─────────────
   A founder-editable counter-line per state: the generic truth line names the
   mechanism, the counter answers it in the founder's OWN prior words — the
   documented reframe from their own recovery writing, entered through the UI
   and stored in rows, never in this repo (personal content lives in data;
   the code ships slots). Newest counter event per state wins, same semantics
   as the tape. */

export function latestCounters(events) {
  if (!Array.isArray(events)) return {}
  const best = {}
  events.forEach((e) => {
    if (e.kind !== 'counter') return
    const st = e.payload?.state
    if (!st) return
    if (!best[st] || new Date(e.at) > new Date(best[st].at)) best[st] = e
  })
  const out = {}
  Object.keys(best).forEach((st) => {
    const text = best[st].payload?.text || ''
    if (text) out[st] = text
  })
  return out
}

/* ── the breath — one practice, built as receiving rehearsal ─
   Cyclic sighing, exhale-led (Balban et al. 2023 — the one practice here
   with direct RCT support, which is why it alone earns a 'measured' entry in
   the rights ledger). ONE practice deliberately: a menu of techniques is the
   overwhelm pattern in costume. The dose is capped by design — titration,
   not endurance — and the pacing leads with the exhale because for this
   founder the double-inhale is the hard part: a chest opening and holding
   while something enters is the literal somatic rehearsal for receiving,
   and it is approached gently or not at all. */

export const BREATH_DEFAULT_SECONDS = 120
export const BREATH_MAX_SECONDS = 300

export const BREATH_CYCLE = [
  { key: 'expand', label: 'Breathe in, easy', seconds: 3 },
  { key: 'sip', label: 'One small sip more — only as big as is comfortable', seconds: 2 },
  { key: 'exhale', label: 'Long exhale, slowly, all the way out', seconds: 7 },
]

export const BREATH_CYCLE_SECONDS = BREATH_CYCLE.reduce((a, p) => a + p.seconds, 0)

/** Which pacing phase a session is in at `elapsed` seconds. Pure. */
export function breathPhaseAt(elapsed) {
  const into = ((elapsed % BREATH_CYCLE_SECONDS) + BREATH_CYCLE_SECONDS) % BREATH_CYCLE_SECONDS
  let acc = 0
  for (let i = 0; i < BREATH_CYCLE.length; i += 1) {
    acc += BREATH_CYCLE[i].seconds
    if (into < acc) return { ...BREATH_CYCLE[i], index: i }
  }
  return { ...BREATH_CYCLE[0], index: 0 }
}

/* ── bookends — borrowed regulation, made visible ────────────
   A scary money/receiving action, named before it happens and closed after —
   with a record of whether it was talked through with someone safe before,
   after, both, or neither. Zero shame on neither: the row itself is the
   practice. Urges logged while a bookend is open are tagged, same mechanism
   as the receiving window. */

export const BOOKEND_TALKED = [
  { key: 'before', label: 'Before' },
  { key: 'after', label: 'After' },
  { key: 'both', label: 'Both' },
  { key: 'neither', label: 'Neither this time' },
]

export const BOOKEND_TALKED_BY_KEY = Object.fromEntries(BOOKEND_TALKED.map((t) => [t.key, t]))

/** The currently-open bookend, or null: the newest bookend_open with no later
    bookend_close. No time-based lapse — a named action stays quietly on the
    tab until it is closed, because "still not done" is real information, not
    staleness. */
export function openBookend(events) {
  if (!Array.isArray(events) || !events.length) return null
  const at = (e) => new Date(e.at).getTime()
  const opens = events.filter((e) => e.kind === 'bookend_open')
  if (!opens.length) return null
  const newest = opens.reduce((a, b) => (at(a) >= at(b) ? a : b))
  const closedAfter = events.some((e) => e.kind === 'bookend_close' && at(e) >= at(newest))
  if (closedAfter) return null
  return { openedAt: newest.at, action: newest.payload?.action || '' }
}

/** Whole days since the newest event of `kind`, or null when none. */
export function daysSinceLast(events, kind, now) {
  if (!Array.isArray(events)) return null
  let best = null
  events.forEach((e) => {
    if (e.kind !== kind) return
    if (!best || new Date(e.at) > new Date(best.at)) best = e
  })
  if (!best) return null
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const diff = nowMs - new Date(best.at).getTime()
  if (!(diff >= 0)) return 0
  return Math.floor(diff / 864e5)
}

/* ── receiving window ────────────────────────────────────────
   The 48 hours after something good lands are the high-risk window: expect
   the sabotage urge, name it withdrawal, no big moves, let the good thing
   land. Opening a window is an event; closing it ("it landed") is another. */

export const RECEIVING_WINDOW_HOURS = 48

/** The currently-open receiving window, or null.
    Open = the newest window_open event that has no later window_close and is
    younger than RECEIVING_WINDOW_HOURS. An expired window simply lapses —
    closing it was the ideal, but a lapsed window is not a failure state. */
export function openReceivingWindow(events, now = null) {
  if (!Array.isArray(events) || !events.length) return null
  const at = (e) => new Date(e.at).getTime()
  const opens = events.filter((e) => e.kind === 'window_open')
  if (!opens.length) return null
  const newest = opens.reduce((a, b) => (at(a) >= at(b) ? a : b))
  const closedAfter = events.some((e) => e.kind === 'window_close' && at(e) >= at(newest))
  if (closedAfter) return null
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const ageHours = (nowMs - at(newest)) / 36e5
  if (!(ageHours >= 0) || ageHours > RECEIVING_WINDOW_HOURS) return null
  return {
    openedAt: newest.at,
    note: newest.payload?.note || '',
    hoursLeft: Math.max(0, Math.round(RECEIVING_WINDOW_HOURS - ageHours)),
  }
}

/** The current tape text: newest 'tape' event wins; empty string when none. */
export function latestTape(events) {
  if (!Array.isArray(events)) return ''
  let best = null
  events.forEach((e) => {
    if (e.kind !== 'tape') return
    if (!best || new Date(e.at) > new Date(best.at)) best = e
  })
  return best?.payload?.text || ''
}

/** "Scene last" — the documented ending alone, for ten-second moments when
    the whole tape is more than an urge will sit still for. Its own kind,
    newest-wins, independent of the full tape. */
export function latestSceneLast(events) {
  if (!Array.isArray(events)) return ''
  let best = null
  events.forEach((e) => {
    if (e.kind !== 'scene_last') return
    if (!best || new Date(e.at) > new Date(best.at)) best = e
  })
  return best?.payload?.text || ''
}

/** Local calendar day (YYYY-MM-DD) of an event timestamp. Local, not UTC,
    deliberately: "today's check-ins" should mean the founder's today. */
export function dayKeyOf(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Events grouped by local day, newest day first, events newest-first within
    each day. Only the loggable kinds — tape/scene-last/counter edits are
    housekeeping, not history. */
const HOUSEKEEPING_KINDS = new Set(['tape', 'scene_last', 'counter'])

export function groupByDay(events, limitDays = 7) {
  if (!Array.isArray(events)) return []
  const byDay = new Map()
  events
    .filter((e) => !HOUSEKEEPING_KINDS.has(e.kind))
    .forEach((e) => {
      const key = dayKeyOf(e.at)
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key).push(e)
    })
  return Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, limitDays)
    .map(([day, dayEvents]) => ({
      day,
      events: dayEvents.sort((a, b) => (new Date(a.at) < new Date(b.at) ? 1 : -1)),
    }))
}

/** One quiet line per event for the history list. */
export function describeEvent(event) {
  const p = event.payload || {}
  switch (event.kind) {
    case 'state': {
      const st = PRACTICE_STATES_BY_KEY[p.state]
      return `state · ${st ? st.label.toLowerCase() : p.state}${p.note ? ` — ${p.note}` : ''}`
    }
    case 'urge': {
      const pull = URGE_PULLS_BY_KEY[p.pull]
      const action = URGE_ACTIONS_BY_KEY[p.action]
      const bits = [`urge · ${pull ? pull.label.toLowerCase() : p.pull}`]
      if (p.trigger) bits.push(`after: ${p.trigger}`)
      if (action) bits.push(action.label.toLowerCase())
      if (p.bookended) bits.push('talked it through')
      if (p.duringWindow) bits.push('inside a receiving window')
      if (p.duringBookend) bits.push('mid-bookend')
      return bits.join(' · ')
    }
    case 'loop':
      return `loop closed · ${p.label || p.loop || 'one small thing'}`
    case 'receipt':
      return `receipt · ${p.text || 'proof the baseline is moving'}`
    case 'anchor':
      return 'morning anchor kept'
    case 'return': {
      const bits = ['evening return']
      if (p.off) bits.push(`off: ${p.off}`)
      if (p.well) bits.push(`well: ${p.well}`)
      if (p.clear) bits.push(`to clear: ${p.clear}`)
      return bits.join(' · ')
    }
    case 'window_open':
      return `receiving window opened${p.note ? ` — ${p.note}` : ''}`
    case 'window_close':
      return 'receiving window closed — it landed'
    case 'breath': {
      const mins = Math.max(1, Math.round((p.seconds || 0) / 60))
      return `breath · ${mins} min of cyclic sighing`
    }
    case 'bookend_open':
      return `bookend opened${p.action ? ` — ${p.action}` : ''}`
    case 'bookend_close': {
      const talked = BOOKEND_TALKED_BY_KEY[p.talked]
      const bits = ['bookend closed']
      if (p.outcome) bits.push(p.outcome)
      if (talked) bits.push(`talked it through: ${talked.label.toLowerCase()}`)
      return bits.join(' · ')
    }
    case 'coreg':
      return `co-regulation · ${p.who || 'a dose of safe company'}`
    case 'proxy':
      return `the month's number · ${p.text || ''}`
    default:
      return event.kind
  }
}

/** Grounding text for the urge reflection (api/care-reflection.js, practice
    mode). Plain lines the model can anchor on — the entry itself plus the
    day's context, nothing from any other system. */
export function describeUrgeForReflection(payload, { lastState = null, windowOpen = false, bookendOpen = null } = {}) {
  const pull = URGE_PULLS_BY_KEY[payload.pull]
  const action = URGE_ACTIONS_BY_KEY[payload.action]
  const lines = [
    `The pull: ${pull ? `${pull.label} (${pull.hint})` : payload.pull}`,
    payload.trigger ? `What set it off, in their words: "${payload.trigger}"` : null,
    action ? `What they did: ${action.label}` : null,
    payload.bookended ? 'They talked it through with someone safe.' : null,
    windowOpen
      ? 'Context: something good landed within the last 48 hours — this urge arrived inside the expected high-risk receiving window.'
      : null,
    bookendOpen
      ? `Context: they have a named scary action open right now ("${bookendOpen}") — this urge arrived mid-bookend, which is exactly when it was expected.`
      : null,
    lastState ? `Their last state check-in today: ${lastState}` : null,
  ]
  return lines.filter(Boolean).join('\n')
}

/* ── the recovery context — trends, not the raw week ─────────
   Feeds the AI layer, per the standing full-access decision: reflections and
   the synthesis may read the practice log. The guardrail is structural and
   lives here: this function returns TRENDS over ~30 days in plain lines —
   never a diary dump — plus the founder's own tape and counters (their own
   words, which is the point). The synthesis prompt reads this as weather
   over the portrait, not identity; the second guardrail (the founder-only
   recoveryRead output slot, never copied into buildCard()'s public fields)
   lives in api/care-synthesis.js and cardModel.js respectively. */

export function buildRecoveryContext(events, { now = null, days = 30 } = {}) {
  if (!Array.isArray(events) || !events.length) return ''
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const floor = nowMs - days * 864e5
  const recent = events.filter((e) => {
    const t = new Date(e.at).getTime()
    return t >= floor && t <= nowMs
  })

  const of = (kind) => recent.filter((e) => e.kind === kind)
  const lines = []

  const states = of('state')
  if (states.length) {
    const counts = {}
    states.forEach((e) => { const k = e.payload?.state; if (k) counts[k] = (counts[k] || 0) + 1 })
    const parts = PRACTICE_STATES
      .filter((s) => counts[s.key])
      .map((s) => `${s.label.toLowerCase()} ${counts[s.key]}`)
    lines.push(`State check-ins: ${states.length} (${parts.join(', ')})`)
  }

  const urges = of('urge')
  if (urges.length) {
    const byPull = {}
    const byAction = {}
    let inWindow = 0
    let talked = 0
    urges.forEach((e) => {
      const p = e.payload || {}
      if (p.pull) byPull[p.pull] = (byPull[p.pull] || 0) + 1
      if (p.action) byAction[p.action] = (byAction[p.action] || 0) + 1
      if (p.duringWindow) inWindow += 1
      if (p.bookended) talked += 1
    })
    const pulls = URGE_PULLS.filter((p) => byPull[p.key]).map((p) => `${p.label.toLowerCase()} ×${byPull[p.key]}`)
    const actions = URGE_ACTIONS.filter((a) => byAction[a.key]).map((a) => `${a.label.toLowerCase()} ${byAction[a.key]}`)
    lines.push(`Urges logged: ${urges.length} — pulls: ${pulls.join(', ')}. Outcomes: ${actions.join(', ')}.`)
    if (inWindow) lines.push(`Of those, ${inWindow} arrived inside a receiving window (expected withdrawal, and logged as such).`)
    if (talked) lines.push(`${talked} were talked through with someone safe.`)
  }

  const loops = of('loop')
  const receipts = of('receipt')
  const anchors = of('anchor')
  const returns = of('return')
  const cadence = []
  if (loops.length) cadence.push(`${loops.length} small loops closed`)
  if (receipts.length) cadence.push(`${receipts.length} receipts kept`)
  if (anchors.length) cadence.push(`the morning anchor kept ${anchors.length} times`)
  if (returns.length) cadence.push(`${returns.length} evening returns`)
  if (cadence.length) lines.push(`Daily cadence: ${cadence.join(', ')}.`)

  const opened = of('window_open').length
  const closedOnPurpose = of('window_close').length
  if (opened) lines.push(`Receiving windows: ${opened} opened, ${closedOnPurpose} closed on purpose ("it landed").`)

  const breaths = of('breath')
  if (breaths.length) {
    const mins = Math.round(breaths.reduce((a, e) => a + (e.payload?.seconds || 0), 0) / 60)
    lines.push(`Breath practice: ${breaths.length} sessions, about ${mins} minutes total.`)
  }

  const coregs = of('coreg')
  if (coregs.length) {
    const since = daysSinceLast(recent, 'coreg', new Date(nowMs))
    lines.push(`Co-regulation doses: ${coregs.length}${since !== null ? ` (last one ${since === 0 ? 'today' : `${since} day${since === 1 ? '' : 's'} ago`})` : ''}.`)
  }

  const bOpen = of('bookend_open').length
  const bClosed = of('bookend_close').length
  if (bOpen || bClosed) lines.push(`Bookends: ${bOpen} scary actions named, ${bClosed} closed.`)

  const proxies = of('proxy')
  if (proxies.length) {
    const newest = proxies.reduce((a, b) => (new Date(a.at) >= new Date(b.at) ? a : b))
    lines.push(`Their monthly proxy number, self-reported: ${newest.payload?.text || ''}`)
  }

  if (!lines.length) return ''

  // The founder's own words ride along whole — tape and counters are read
  // from the FULL event list, not the window: they are standing documents,
  // not month-scoped activity.
  const tape = latestTape(events)
  if (tape) lines.push(`Their own tape, written when steady (their words, verbatim): "${tape}"`)
  const counters = latestCounters(events)
  PRACTICE_STATES.forEach((s) => {
    if (counters[s.key]) lines.push(`Their own counter-line for the ${s.label.toLowerCase()} state (their words): "${counters[s.key]}"`)
  })

  return `Daily practice log, last ${days} days — trends, not a diary:\n${lines.map((l) => `- ${l}`).join('\n')}`
}
