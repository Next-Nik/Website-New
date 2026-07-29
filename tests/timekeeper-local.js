// tests/timekeeper-local.js
//
// Pure-logic tests for src/lib/timekeeper — Timekeeper's duration, day/week
// and context helpers. Run with:  node tests/timekeeper-local.js
// No network, no database: everything takes plain rows and fixed dates,
// which is the whole point of keeping the module portable.
//
// NOTE on time zones: dayKeyOf/mondayOf are LOCAL-time functions by design
// ("today" means the founder's today), so these tests build their fixture
// timestamps from local Date fields rather than hard-coded UTC strings —
// they pass in any zone the test machine runs in.

const assert = require('assert')

async function main() {
  const {
    durationSeconds, fmtClock, fmtHours, fmtTimeOfDay,
    dayKeyOf, mondayOf, weekDayKeys, dayLabel, WEEKDAY_LABELS,
    runningEntry, entriesForDay, dayTotals, categoryTotals, recentPairs,
    manualSpan, buildTimeContext,
  } = await import('../src/lib/timekeeper/index.js')

  let passed = 0
  const ok = (cond, name) => {
    assert(cond, name)
    passed += 1
    console.log(`  ✓ ${name}`)
  }

  // Local-time fixture builder: y/m/d/h/min in the machine's own zone.
  const local = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0).toISOString()

  /* ── durations ── */
  const done = { started_at: local(2026, 7, 27, 9, 0), ended_at: local(2026, 7, 27, 10, 30) }
  ok(durationSeconds(done) === 5400, 'finished entry measures start→end')
  const run = { started_at: local(2026, 7, 27, 9, 0), ended_at: null }
  ok(durationSeconds(run, new Date(local(2026, 7, 27, 9, 20))) === 1200, 'running entry measures against now')
  ok(durationSeconds({ started_at: local(2026, 7, 27, 9, 0), ended_at: null }, new Date(local(2026, 7, 27, 8, 0))) === 0, 'clock skew reads zero, never negative')
  ok(durationSeconds(null) === 0, 'null entry is zero')

  ok(fmtClock(0) === '0:00:00', 'clock zero')
  ok(fmtClock(4052) === '1:07:32', 'clock h:mm:ss')
  ok(fmtHours(0) === '0m', 'hours zero')
  ok(fmtHours(45 * 60) === '45m', 'sub-hour reads minutes only')
  ok(fmtHours(3 * 3600 + 5 * 60) === '3h 05m', 'hours pad minutes')
  ok(fmtHours(29) === '0m', 'under a minute stays 0m')

  /* ── days and weeks ── */
  ok(dayKeyOf(local(2026, 7, 27, 23, 59)) === '2026-07-27', 'dayKeyOf uses local day')
  ok(dayKeyOf(new Date(2026, 6, 27, 12)) === '2026-07-27', 'dayKeyOf accepts a Date')

  const wed = new Date(2026, 6, 29, 15, 30) // Wednesday 29 July 2026, local
  const mon = mondayOf(wed)
  ok(dayKeyOf(mon) === '2026-07-27', 'mondayOf finds the Monday')
  ok(mon.getHours() === 0 && mon.getMinutes() === 0, 'mondayOf is local midnight')
  const sun = new Date(2026, 7, 2, 10, 0) // Sunday 2 Aug 2026
  ok(dayKeyOf(mondayOf(sun)) === '2026-07-27', 'Sunday belongs to the Monday-start week')
  const monNoon = new Date(2026, 6, 27, 12, 0)
  ok(dayKeyOf(mondayOf(monNoon)) === '2026-07-27', 'Monday maps to itself')

  const keys = weekDayKeys(mon)
  ok(keys.length === 7, 'seven day keys')
  ok(keys[0] === '2026-07-27' && keys[6] === '2026-08-02', 'week spans Mon→Sun across the month edge')
  ok(WEEKDAY_LABELS.length === 7 && WEEKDAY_LABELS[0] === 'Mon', 'labels start Monday')
  ok(dayLabel('2026-07-27') === 'Mon 27', 'day label')

  /* ── selection and grouping ── */
  const e1 = { id: 'a', description: 'Coaching call', category: 'Coaching', started_at: local(2026, 7, 27, 9, 0), ended_at: local(2026, 7, 27, 10, 0) }
  const e2 = { id: 'b', description: 'Build session', category: 'NextUs', started_at: local(2026, 7, 27, 11, 0), ended_at: local(2026, 7, 27, 12, 30) }
  const e3 = { id: 'c', description: 'Admin', category: '', started_at: local(2026, 7, 28, 9, 0), ended_at: local(2026, 7, 28, 9, 45) }
  const e4 = { id: 'd', description: 'Running now', category: 'NextUs', started_at: local(2026, 7, 28, 10, 0), ended_at: null }
  const all = [e3, e1, e4, e2] // deliberately unsorted

  ok(runningEntry(all)?.id === 'd', 'runningEntry finds the open row')
  ok(runningEntry([e1, e2, e3]) === null, 'no open row → null')
  const older = { id: 'e', description: 'Stale', category: '', started_at: local(2026, 7, 26, 8, 0), ended_at: null }
  ok(runningEntry([...all, older])?.id === 'd', 'newest open row wins')

  const day27 = entriesForDay(all, '2026-07-27')
  ok(day27.length === 2 && day27[0].id === 'b', 'entriesForDay filters and sorts newest first')

  const nowT = new Date(local(2026, 7, 28, 10, 30))
  const totals = dayTotals(all, ['2026-07-27', '2026-07-28', '2026-07-29'], nowT)
  ok(totals['2026-07-27'] === 9000, 'day total sums finished entries (1h + 1h30)')
  ok(totals['2026-07-28'] === 45 * 60 + 30 * 60, 'day total includes the running entry up to now')
  ok(totals['2026-07-29'] === 0, 'empty day is zero, not missing')

  const cats = categoryTotals(all, ['2026-07-27', '2026-07-28'], nowT)
  ok(cats[0].category === 'NextUs' && cats[0].seconds === 5400 + 1800, 'category totals sort largest first')
  ok(cats.some((c) => c.category === '' && c.seconds === 2700), 'uncategorised time grouped under empty string')

  const pairs = recentPairs(all)
  ok(pairs.length === 3, 'recentPairs excludes the running entry')
  ok(pairs[0].description === 'Admin', 'pairs newest first')
  const dup = { id: 'f', description: 'Coaching call', category: 'Coaching', started_at: local(2026, 7, 26, 9, 0), ended_at: local(2026, 7, 26, 10, 0) }
  ok(recentPairs([...all, dup]).length === 3, 'pairs de-duplicate description+category')

  /* ── manual entry ── */
  const span = manualSpan('2026-07-27', '09:00', '10:15')
  ok(span && new Date(span.ended_at) - new Date(span.started_at) === 75 * 60 * 1000, 'manual span basic')
  const cross = manualSpan('2026-07-27', '23:30', '00:30')
  ok(cross && new Date(cross.ended_at) - new Date(cross.started_at) === 3600 * 1000, 'end before start crosses midnight')
  ok(manualSpan('2026-07-27', '25:00', '10:00') === null, 'bad hour rejected')
  ok(manualSpan('27-07-2026', '09:00', '10:00') === null, 'bad day key rejected')
  ok(manualSpan('2026-07-27', '', '10:00') === null, 'missing time rejected')

  /* ── the time context — trends only, never a diary ── */
  const ctxNow = new Date(local(2026, 7, 28, 12, 0))
  const ctx = buildTimeContext(all, { now: ctxNow })
  ok(ctx.includes('aggregate hours only'), 'context announces its own guardrail')
  ok(ctx.includes('Tracked on 2 of the last 30 days'), 'context counts tracked days')
  // e2 (1h30 finished) + e4 (running, 10:00 → the fixed noon now = 2h)
  ok(ctx.includes('NextUs 3h 30m'), 'context aggregates by category, running entry measured to now')
  ok(ctx.includes('uncategorised'), 'context names uncategorised time plainly')
  ok(!ctx.includes('Coaching call') && !ctx.includes('Build session') && !ctx.includes('Running now'), 'context NEVER contains entry descriptions')
  const ancient = { id: 'z', description: 'Old', category: 'Old', started_at: local(2026, 6, 1, 9, 0), ended_at: local(2026, 6, 1, 10, 0) }
  ok(!buildTimeContext([...all, ancient], { now: ctxNow }).includes('Old'), '45-day-old entry excluded from the 30-day window')
  ok(buildTimeContext([], { now: ctxNow }) === '', 'no entries → no context')
  ok(buildTimeContext([ancient], { now: ctxNow }) === '', 'only-old entries → no context')

  /* ── time-of-day formatting ── */
  ok(fmtTimeOfDay(local(2026, 7, 27, 9, 5)) === '09:05', 'fmtTimeOfDay pads')

  console.log(`\n${passed} checks passed.`)
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`)
  process.exit(1)
})
