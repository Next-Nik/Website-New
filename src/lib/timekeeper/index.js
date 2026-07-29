// src/lib/timekeeper/index.js
//
// TIMEKEEPER — a plain time tracker: start/stop entries with categories, a
// week view, and running totals. Its own standalone tool with its own front
// door (Profile panel, alongside Admin Console, Movie Magic, Care Protocol,
// The Practice, Homecoming, Prism Lab). The page (src/pages/Timekeeper.jsx)
// holds the buttons; this module holds the pure logic.
//
// WHY IT EXISTS. Records of time are a core instrument against vagueness:
// a definite number is the antidote to "the day disappeared." The tool
// itself stays neutral — descriptions, categories, durations, totals — and
// the principle shapes the design rather than the surface copy. Two design
// consequences, inherited from the sibling tools and non-negotiable:
//   - Totals, yes; verdicts, no. Hours per day and per category are plain
//     measurements. There are NO targets, NO streaks, NO scores, and no
//     colour-coded judgement of how a day compares to any other day.
//   - Daily and small. One press starts, one press stops. Nothing here
//     requires planning the day in advance.
//
// DESIGN RULES, inherited:
//   - Portable: no React, no Supabase, no app imports. Every function takes
//     plain rows and a `now` where time matters, so all of it is testable
//     against fixed dates.
//   - Founder-only, and STRUCTURALLY absent from every shareable surface:
//     nothing in this module is reachable from any card, snapshot, or
//     public route. The ONLY cross-tool read is buildTimeContext() below —
//     the founder-approved trends-only recovery context (aggregate hours,
//     never entry descriptions).
//
// Row model (time_entries, sql/190_timekeeper.sql): one row per tracked
// span. `started_at` always set; `ended_at` NULL while the timer runs.
// An entry belongs to the LOCAL day it started on — a span crossing
// midnight is not split, matching how the question "what did I do
// Tuesday?" is actually asked. Categories are stored by name so archiving
// a category never rewrites history.

/* ── durations ─────────────────────────────────────────────── */

/** Elapsed seconds of an entry; a running entry is measured against `now`.
    Never negative — a clock-skewed row reads as zero, not as an error. */
export function durationSeconds(entry, now = null) {
  if (!entry || !entry.started_at) return 0
  const start = new Date(entry.started_at).getTime()
  const end = entry.ended_at
    ? new Date(entry.ended_at).getTime()
    : (now instanceof Date ? now.getTime() : new Date(now).getTime())
  const diff = Math.floor((end - start) / 1000)
  return diff > 0 ? diff : 0
}

/** "1:07:32" — the ticking clock face. Hours unpadded, no days rollover. */
export function fmtClock(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${h}:${pad(m)}:${pad(sec)}`
}

/** "3h 05m" / "45m" / "0m" — totals and list rows. Whole minutes; a span
    under a minute still reads "0m" rather than pretending precision. */
export function fmtHours(seconds) {
  const mins = Math.max(0, Math.round(seconds / 60))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** "14:05" — local wall-clock time of a timestamp, for list rows. */
export function fmtTimeOfDay(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ── days and weeks ────────────────────────────────────────── */

/** Local calendar day (YYYY-MM-DD) of a timestamp. Local, not UTC,
    deliberately: "today's entries" should mean the founder's today. */
export function dayKeyOf(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** The Monday (local) of the week containing `date`, as a Date at local
    midnight. Monday-start weeks throughout. */
export function mondayOf(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 Sun … 6 Sat
  const back = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - back)
  return d
}

/** The seven local day keys of the week starting at `monday` (a Date). */
export function weekDayKeys(monday) {
  const out = []
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    out.push(dayKeyOf(d)) // a Date is fine: dayKeyOf reads local fields
  }
  return out
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** "Mon 27" style label for a day key, using local fields. */
export function dayLabel(dayKey) {
  const d = new Date(`${dayKey}T12:00:00`) // noon avoids DST edge on the day itself
  return `${WEEKDAY_LABELS[(d.getDay() + 6) % 7]} ${d.getDate()}`
}

/* ── selection and grouping ────────────────────────────────── */

/** The currently-running entry (newest with no ended_at), or null. */
export function runningEntry(entries) {
  if (!Array.isArray(entries)) return null
  let best = null
  entries.forEach((e) => {
    if (e.ended_at) return
    if (!best || new Date(e.started_at) > new Date(best.started_at)) best = e
  })
  return best
}

/** Entries whose local start day is `dayKey`, newest first. */
export function entriesForDay(entries, dayKey) {
  if (!Array.isArray(entries)) return []
  return entries
    .filter((e) => dayKeyOf(e.started_at) === dayKey)
    .sort((a, b) => (new Date(a.started_at) < new Date(b.started_at) ? 1 : -1))
}

/** Total tracked seconds per day for a set of day keys. Running entries
    count up to `now`. Returns { [dayKey]: seconds }. */
export function dayTotals(entries, dayKeys, now = null) {
  const totals = {}
  dayKeys.forEach((k) => { totals[k] = 0 })
  if (!Array.isArray(entries)) return totals
  entries.forEach((e) => {
    const k = dayKeyOf(e.started_at)
    if (k in totals) totals[k] += durationSeconds(e, now)
  })
  return totals
}

/** Total tracked seconds per category name across `dayKeys`, largest first.
    Uncategorised time is grouped under '' — render it last, as "(none)". */
export function categoryTotals(entries, dayKeys, now = null) {
  if (!Array.isArray(entries)) return []
  const keys = new Set(dayKeys)
  const totals = {}
  entries.forEach((e) => {
    if (!keys.has(dayKeyOf(e.started_at))) return
    const cat = e.category || ''
    totals[cat] = (totals[cat] || 0) + durationSeconds(e, now)
  })
  return Object.entries(totals)
    .map(([category, seconds]) => ({ category, seconds }))
    .sort((a, b) => b.seconds - a.seconds || (a.category < b.category ? -1 : 1))
}

/** Distinct recent description+category pairs for the continue affordance,
    newest first, de-duplicated, running entry excluded. */
export function recentPairs(entries, limit = 6) {
  if (!Array.isArray(entries)) return []
  const seen = new Set()
  const out = []
  const sorted = entries
    .filter((e) => e.ended_at)
    .sort((a, b) => (new Date(a.started_at) < new Date(b.started_at) ? 1 : -1))
  for (const e of sorted) {
    const desc = (e.description || '').trim()
    const key = `${desc}››${e.category || ''}`
    if (!desc || seen.has(key)) continue
    seen.add(key)
    out.push({ description: desc, category: e.category || '' })
    if (out.length >= limit) break
  }
  return out
}

/* ── manual entry parsing ──────────────────────────────────── */

/** Build a { started_at, ended_at } pair (ISO strings, local wall time) from
    a manual form: dayKey 'YYYY-MM-DD', times 'HH:MM'. An end at or before
    the start is treated as crossing midnight into the next day. Returns
    null on anything unparseable. */
export function manualSpan(dayKey, startHM, endHM) {
  const t = /^([01]?\d|2[0-3]):([0-5]\d)$/
  const d = /^\d{4}-\d{2}-\d{2}$/
  if (!d.test(dayKey || '') || !t.test(startHM || '') || !t.test(endHM || '')) return null
  const start = new Date(`${dayKey}T${startHM.padStart(5, '0')}:00`)
  const end = new Date(`${dayKey}T${endHM.padStart(5, '0')}:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  if (end <= start) end.setDate(end.getDate() + 1) // crossed midnight
  return { started_at: start.toISOString(), ended_at: end.toISOString() }
}

/* ── the recovery context — trends, not the raw week ─────────
   The founder-approved cross-tool read (same standing decision as
   buildRecoveryContext in src/lib/practice): Care Protocol's synthesis and
   The Practice's reflections may read a SUMMARY of tracked time. The
   guardrail is structural and lives here: aggregate hours by category and
   tracked-day cadence over ~30 days, in plain lines. Entry DESCRIPTIONS
   never leave this function — category names are aggregate labels, the
   descriptions are the diary. */

export function buildTimeContext(entries, { now = null, days = 30 } = {}) {
  if (!Array.isArray(entries) || !entries.length) return ''
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const floor = nowMs - days * 864e5
  const recent = entries.filter((e) => {
    const t = new Date(e.started_at).getTime()
    return t >= floor && t <= nowMs
  })
  if (!recent.length) return ''

  const nowDate = new Date(nowMs)
  let total = 0
  const trackedDays = new Set()
  const byCat = {}
  recent.forEach((e) => {
    const secs = durationSeconds(e, nowDate)
    total += secs
    trackedDays.add(dayKeyOf(e.started_at))
    const cat = e.category || ''
    byCat[cat] = (byCat[cat] || 0) + secs
  })
  if (total <= 0) return ''

  const lines = []
  lines.push(
    `Tracked on ${trackedDays.size} of the last ${days} days — ${fmtHours(total)} recorded in total.`,
  )
  const cats = Object.entries(byCat)
    .map(([category, seconds]) => ({ category, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 8)
    .map(({ category, seconds }) => `${category || 'uncategorised'} ${fmtHours(seconds)}`)
  if (cats.length) lines.push(`Where it went, by category: ${cats.join(', ')}.`)

  return `Time records, last ${days} days — aggregate hours only, never a diary:\n${lines
    .map((l) => `- ${l}`)
    .join('\n')}`
}
