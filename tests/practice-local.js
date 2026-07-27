// tests/care-practice-local.js
//
// Pure-logic tests for src/lib/care/practice.js — the Practice's event
// helpers. Run with:  node tests/care-practice-local.js
// No network, no database: everything takes plain events and fixed dates,
// which is the whole point of keeping the module portable.

const assert = require('assert')

async function main() {
  const {
    PRACTICE_STATES, PRACTICE_STATES_BY_KEY,
    URGE_PULLS, URGE_PULLS_BY_KEY, URGE_ACTIONS,
    LOOP_PRESETS, RECEIVING_WINDOW_HOURS, RETURN_FIELDS, RECEIPT_HINTS,
    BREATH_CYCLE, BREATH_CYCLE_SECONDS, BREATH_DEFAULT_SECONDS, BREATH_MAX_SECONDS,
    BOOKEND_TALKED,
    openReceivingWindow, latestTape, latestSceneLast, latestCounters,
    dayKeyOf, groupByDay,
    describeEvent, describeUrgeForReflection, describeReturnForReflection,
    loggedToday, breathPhaseAt, openBookend, daysSinceLast, buildRecoveryContext,
  } = await import('../src/lib/practice/index.js')

  let passed = 0
  const ok = (cond, name) => {
    assert(cond, name)
    passed += 1
    console.log(`  ✓ ${name}`)
  }

  /* ── vocabulary invariants ── */
  ok(PRACTICE_STATES.length === 4, 'four states')
  ok(PRACTICE_STATES.every((s) => s.key && s.label && s.prompt && s.truth), 'every state carries a truth line')
  ok(new Set(PRACTICE_STATES.map((s) => s.key)).size === 4, 'state keys unique')
  ok(URGE_PULLS.length === 6 && new Set(URGE_PULLS.map((p) => p.key)).size === 6, 'six unique urge pulls')
  ok(URGE_PULLS.every((p) => p.hint), 'every pull has a hint')
  ok(URGE_ACTIONS.length === 3, 'three urge actions')
  ok(LOOP_PRESETS.length === 3, 'three loop presets')
  ok(RECEIVING_WINDOW_HOURS === 48, 'window is 48 hours')
  ok(PRACTICE_STATES_BY_KEY.settled && URGE_PULLS_BY_KEY.blow_it_up, 'lookup maps built')

  /* ── receiving window ── */
  const t0 = '2026-07-25T12:00:00.000Z'
  const openEvt = { kind: 'window_open', at: t0, payload: { note: 'a yes' } }

  const w1 = openReceivingWindow([openEvt], new Date('2026-07-25T18:00:00.000Z'))
  ok(w1 && w1.note === 'a yes', 'window open 6h after opening')
  ok(w1.hoursLeft === 42, 'hoursLeft counts down from 48')

  const w2 = openReceivingWindow([openEvt], new Date('2026-07-27T13:00:00.000Z'))
  ok(w2 === null, 'window lapses after 48h')

  const closed = openReceivingWindow(
    [openEvt, { kind: 'window_close', at: '2026-07-25T20:00:00.000Z', payload: {} }],
    new Date('2026-07-25T21:00:00.000Z'),
  )
  ok(closed === null, 'window_close closes the window')

  const reopened = openReceivingWindow(
    [
      openEvt,
      { kind: 'window_close', at: '2026-07-25T20:00:00.000Z', payload: {} },
      { kind: 'window_open', at: '2026-07-26T09:00:00.000Z', payload: {} },
    ],
    new Date('2026-07-26T10:00:00.000Z'),
  )
  ok(reopened && reopened.openedAt === '2026-07-26T09:00:00.000Z', 'a later open reopens after an earlier close')
  ok(openReceivingWindow([], new Date()) === null, 'no events, no window')
  ok(openReceivingWindow(null, new Date()) === null, 'null events tolerated')

  /* ── tape ── */
  ok(latestTape([]) === '', 'no tape yet reads as empty')
  const tapes = [
    { kind: 'tape', at: '2026-07-20T10:00:00.000Z', payload: { text: 'old' } },
    { kind: 'tape', at: '2026-07-24T10:00:00.000Z', payload: { text: 'newer' } },
    { kind: 'state', at: '2026-07-25T10:00:00.000Z', payload: { state: 'fog' } },
  ]
  ok(latestTape(tapes) === 'newer', 'newest tape event wins regardless of array order')
  ok(latestTape(tapes.slice().reverse()) === 'newer', 'order-independent')

  /* ── day grouping ── */
  const evts = [
    { id: 1, kind: 'state', at: '2026-07-25T09:00:00.000Z', payload: { state: 'settled' } },
    { id: 2, kind: 'loop', at: '2026-07-25T15:00:00.000Z', payload: { loop: 'ask', label: 'One concrete ask made' } },
    { id: 3, kind: 'urge', at: '2026-07-24T22:00:00.000Z', payload: { pull: 'go_vague', action: 'rode' } },
    { id: 4, kind: 'tape', at: '2026-07-24T21:00:00.000Z', payload: { text: 'x' } },
  ]
  const grouped = groupByDay(evts, 7)
  ok(grouped.length === 2, 'two days of history')
  ok(grouped[0].day > grouped[1].day, 'newest day first')
  ok(grouped.every((g) => g.events.every((e) => e.kind !== 'tape')), 'tape edits are housekeeping, not history')
  ok(grouped[0].events[0].id === 2, 'newest event first within a day')
  ok(groupByDay(evts, 1).length === 1, 'limitDays honoured')
  ok(dayKeyOf('2026-07-25T09:00:00.000Z').length === 10, 'dayKey is YYYY-MM-DD')

  /* ── descriptions ── */
  const urgeLine = describeEvent({
    kind: 'urge',
    at: t0,
    payload: { pull: 'blow_it_up', trigger: 'good news', action: 'rode', bookended: true, duringWindow: true },
  })
  ok(urgeLine.includes('blow it up') && urgeLine.includes('good news'), 'urge description carries pull and trigger')
  ok(urgeLine.includes('talked it through') && urgeLine.includes('receiving window'), 'urge description carries bookend and window tags')
  ok(describeEvent({ kind: 'state', at: t0, payload: { state: 'charged', note: 'rent' } }).includes('rent'), 'state description carries the note')
  ok(describeEvent({ kind: 'loop', at: t0, payload: { label: 'One boundary held' } }).includes('One boundary held'), 'loop description carries the label')
  ok(describeEvent({ kind: 'window_open', at: t0, payload: { note: 'a yes' } }).includes('a yes'), 'window open description carries the note')

  /* ── reflection grounding ── */
  const grounding = describeUrgeForReflection(
    { pull: 'undersell', trigger: 'a real offer came in', action: 'riding', bookended: false },
    { lastState: 'Charged', windowOpen: true },
  )
  ok(grounding.includes('Talk myself into less'), 'grounding names the pull in full')
  ok(grounding.includes('a real offer came in'), 'grounding quotes the trigger verbatim')
  ok(grounding.includes('Still in it'), 'grounding carries the action')
  ok(grounding.includes('48 hours'), 'grounding flags the open receiving window')
  ok(grounding.includes('Charged'), 'grounding carries the day state')
  ok(!grounding.includes('someone safe'), 'un-bookended entry adds no bookend line')

  const bare = describeUrgeForReflection({ pull: 'vanish', action: 'rode' }, {})
  ok(!bare.includes('"'), 'no trigger, no quoted line')
  ok(!bare.includes('Context:'), 'no window, no window line')

  /* ── the daily loop (v2) ── */
  ok(RETURN_FIELDS.length === 3 && RETURN_FIELDS.every((f) => f.key && f.label && f.hint), 'three return fields, all hinted')
  ok(RECEIPT_HINTS.length >= 3, 'receipt hints present')

  const ret = describeReturnForReflection({ off: 'went vague on the invoice', well: 'made the call anyway' })
  ok(ret.includes('went vague on the invoice') && ret.includes('made the call anyway'), 'return grounding carries the entered fields verbatim')
  ok(!ret.includes('Anything to clear'), 'empty return fields add no line')
  ok(describeReturnForReflection({}) === '', 'fully empty return grounds to nothing')

  const dayEvts = [
    { kind: 'anchor', at: '2026-07-25T13:00:00.000Z', payload: {} },
    { kind: 'state', at: '2026-07-25T15:00:00.000Z', payload: { state: 'fog' } },
  ]
  const dk = dayKeyOf('2026-07-25T13:00:00.000Z')
  ok(loggedToday(dayEvts, 'anchor', dk) === true, 'loggedToday finds the anchor on its day')
  ok(loggedToday(dayEvts, 'return', dk) === false, 'loggedToday false for a kind not logged')
  ok(loggedToday(dayEvts, 'anchor', dayKeyOf('2026-07-24T13:00:00.000Z')) === false, 'loggedToday false on the wrong day')
  ok(loggedToday(null, 'anchor', dk) === false, 'loggedToday tolerates null events')

  ok(describeEvent({ kind: 'receipt', at: t0, payload: { text: 'a calm that lasted' } }).includes('a calm that lasted'), 'receipt description carries the text')
  ok(describeEvent({ kind: 'anchor', at: t0, payload: {} }) === 'morning anchor kept', 'anchor description')
  const retLine = describeEvent({ kind: 'return', at: t0, payload: { off: 'x', well: 'y', clear: 'z' } })
  ok(retLine.includes('off: x') && retLine.includes('well: y') && retLine.includes('to clear: z'), 'return description carries all three fields')

  /* ── the personal layer (v2): counters + scene last ── */
  const counterEvts = [
    { kind: 'counter', at: '2026-07-20T10:00:00.000Z', payload: { state: 'charged', text: 'old charged line' } },
    { kind: 'counter', at: '2026-07-24T10:00:00.000Z', payload: { state: 'charged', text: 'newer charged line' } },
    { kind: 'counter', at: '2026-07-22T10:00:00.000Z', payload: { state: 'fog', text: 'fog line' } },
    { kind: 'counter', at: '2026-07-23T10:00:00.000Z', payload: { state: 'settled', text: '' } },
    { kind: 'state', at: '2026-07-25T10:00:00.000Z', payload: { state: 'fog' } },
  ]
  const ctrs = latestCounters(counterEvts)
  ok(ctrs.charged === 'newer charged line', 'newest counter per state wins')
  ok(ctrs.fog === 'fog line', 'counters are independent per state')
  ok(!('settled' in ctrs), 'an empty counter text is not a counter')
  ok(Object.keys(latestCounters(null)).length === 0, 'null events tolerated for counters')
  const ctrsRev = latestCounters(counterEvts.slice().reverse())
  ok(ctrsRev.charged === 'newer charged line', 'counter newest-wins is order-independent')

  const sceneEvts = [
    { kind: 'tape', at: '2026-07-24T10:00:00.000Z', payload: { text: 'the whole film' } },
    { kind: 'scene_last', at: '2026-07-23T10:00:00.000Z', payload: { text: 'the ending, alone' } },
  ]
  ok(latestSceneLast(sceneEvts) === 'the ending, alone', 'scene last reads its own kind')
  ok(latestTape(sceneEvts) === 'the whole film', 'the tape ignores scene-last events')
  ok(latestSceneLast([]) === '', 'no scene last reads as empty')

  ok(groupByDay(counterEvts.concat(sceneEvts), 7).every(
    (g) => g.events.every((e) => e.kind !== 'counter' && e.kind !== 'scene_last'),
  ), 'counter and scene-last edits are housekeeping, not history')

  /* ── the breath ── */
  ok(BREATH_CYCLE.length === 3, 'three pacing phases')
  ok(BREATH_CYCLE_SECONDS === BREATH_CYCLE.reduce((a, p) => a + p.seconds, 0), 'cycle length is the sum of its phases')
  const exhale = BREATH_CYCLE[BREATH_CYCLE.length - 1]
  ok(exhale.seconds > BREATH_CYCLE[0].seconds + BREATH_CYCLE[1].seconds, 'the exhale is longer than both inhales together — exhale-led by construction')
  ok(BREATH_DEFAULT_SECONDS === 120 && BREATH_MAX_SECONDS === 300, 'two-minute dose, five-minute cap')
  ok(breathPhaseAt(0).key === 'expand', 'cycle starts on the easy inhale')
  ok(breathPhaseAt(BREATH_CYCLE[0].seconds).key === 'sip', 'second phase is the sip')
  ok(breathPhaseAt(BREATH_CYCLE[0].seconds + BREATH_CYCLE[1].seconds).key === 'exhale', 'third phase is the exhale')
  ok(breathPhaseAt(BREATH_CYCLE_SECONDS).key === 'expand', 'cycle wraps cleanly')
  ok(breathPhaseAt(BREATH_CYCLE_SECONDS * 7 + 1).key === 'expand', 'wraps at any multiple')

  /* ── bookends ── */
  const bOpen = { kind: 'bookend_open', at: '2026-07-25T09:00:00.000Z', payload: { action: 'send the invoice' } }
  ok(openBookend([bOpen])?.action === 'send the invoice', 'an open bookend is found with its action')
  ok(openBookend([bOpen, { kind: 'bookend_close', at: '2026-07-25T12:00:00.000Z', payload: { talked: 'both' } }]) === null, 'a close closes the bookend')
  const bReopen = openBookend([
    bOpen,
    { kind: 'bookend_close', at: '2026-07-25T12:00:00.000Z', payload: { talked: 'both' } },
    { kind: 'bookend_open', at: '2026-07-26T09:00:00.000Z', payload: { action: 'make the ask' } },
  ])
  ok(bReopen?.action === 'make the ask', 'a later open reopens after an earlier close')
  ok(openBookend([]) === null && openBookend(null) === null, 'no events, no bookend')
  ok(BOOKEND_TALKED.length === 4 && BOOKEND_TALKED.some((t) => t.key === 'neither'), 'talked options include a shame-free neither')

  /* ── daysSinceLast ── */
  const nowRef = new Date('2026-07-25T18:00:00.000Z')
  ok(daysSinceLast([], 'coreg', nowRef) === null, 'no doses yet reads as null, not zero')
  ok(daysSinceLast([{ kind: 'coreg', at: '2026-07-25T09:00:00.000Z', payload: {} }], 'coreg', nowRef) === 0, 'a dose earlier today is day zero')
  ok(daysSinceLast([{ kind: 'coreg', at: '2026-07-22T09:00:00.000Z', payload: {} }], 'coreg', nowRef) === 3, 'three days since the last dose')

  /* ── new event descriptions ── */
  ok(describeEvent({ kind: 'breath', at: t0, payload: { seconds: 130 } }).includes('2 min'), 'breath description rounds to minutes')
  ok(describeEvent({ kind: 'breath', at: t0, payload: { seconds: 10 } }).includes('1 min'), 'a short session still reads as one minute, not zero')
  ok(describeEvent({ kind: 'bookend_open', at: t0, payload: { action: 'send the invoice' } }).includes('send the invoice'), 'bookend open carries the action')
  const bcLine = describeEvent({ kind: 'bookend_close', at: t0, payload: { outcome: 'sent it', talked: 'neither' } })
  ok(bcLine.includes('sent it') && bcLine.includes('neither this time'), 'bookend close carries outcome and the talked record')
  ok(describeEvent({ kind: 'coreg', at: t0, payload: { who: 'call with G' } }).includes('call with G'), 'coreg carries the who')
  ok(describeEvent({ kind: 'proxy', at: t0, payload: { text: '13 breaths/min' } }).includes('13 breaths/min'), 'proxy carries the number line')
  ok(describeEvent({
    kind: 'urge', at: t0,
    payload: { pull: 'go_vague', action: 'rode', duringBookend: true },
  }).includes('mid-bookend'), 'an urge logged mid-bookend is tagged in history')

  /* ── urge grounding: the open bookend line ── */
  const bkGrounding = describeUrgeForReflection(
    { pull: 'vanish', action: 'riding' },
    { bookendOpen: 'send the invoice' },
  )
  ok(bkGrounding.includes('send the invoice') && bkGrounding.includes('mid-bookend'), 'grounding names the open bookend and frames the urge as expected')

  /* ── the recovery context ── */
  const ctxNow = new Date('2026-07-25T18:00:00.000Z')
  const iso = (daysAgo, h = 12) => new Date(ctxNow.getTime() - daysAgo * 864e5 + (h - 12) * 36e5).toISOString()
  const ctxEvents = [
    { kind: 'state', at: iso(1), payload: { state: 'charged' } },
    { kind: 'state', at: iso(2), payload: { state: 'settled' } },
    { kind: 'state', at: iso(3), payload: { state: 'settled' } },
    { kind: 'urge', at: iso(1, 14), payload: { pull: 'undersell', action: 'rode', duringWindow: true, bookended: true } },
    { kind: 'urge', at: iso(4), payload: { pull: 'undersell', action: 'moved' } },
    { kind: 'loop', at: iso(2, 15), payload: { loop: 'ask', label: 'One concrete ask made' } },
    { kind: 'receipt', at: iso(2, 16), payload: { text: 'let it land' } },
    { kind: 'anchor', at: iso(1, 8), payload: {} },
    { kind: 'return', at: iso(1, 21), payload: { well: 'made the call' } },
    { kind: 'window_open', at: iso(5), payload: { note: 'a yes' } },
    { kind: 'window_close', at: iso(4, 18), payload: {} },
    { kind: 'breath', at: iso(2, 9), payload: { seconds: 120 } },
    { kind: 'breath', at: iso(1, 9), payload: { seconds: 180 } },
    { kind: 'coreg', at: iso(3), payload: { who: 'program call' } },
    { kind: 'bookend_open', at: iso(6), payload: { action: 'send the invoice' } },
    { kind: 'bookend_close', at: iso(6, 15), payload: { talked: 'before', outcome: 'sent' } },
    { kind: 'proxy', at: iso(10), payload: { text: '14 breaths/min' } },
    { kind: 'tape', at: iso(40), payload: { text: 'scene three: the missed wedding' } },
    { kind: 'counter', at: iso(50), payload: { state: 'charged', text: 'determined to feel hard done by — the receipt is fake' } },
    // outside the 30-day window — must not inflate any count:
    { kind: 'urge', at: iso(45), payload: { pull: 'blow_it_up', action: 'moved' } },
  ]
  const ctx = buildRecoveryContext(ctxEvents, { now: ctxNow, days: 30 })
  ok(ctx.includes('State check-ins: 3') && ctx.includes('settled 2') && ctx.includes('charged 1'), 'context counts states')
  ok(ctx.includes('Urges logged: 2') && ctx.includes('talk myself into less ×2'), 'context counts urges by pull inside the window only')
  ok(!ctx.includes('blow it up'), 'a 45-day-old urge does not leak into a 30-day context')
  ok(ctx.includes('1 arrived inside a receiving window'), 'context notes urges inside receiving windows')
  ok(ctx.includes('1 were talked through'), 'context notes talked-through urges')
  ok(ctx.includes('1 small loops closed') && ctx.includes('1 receipts kept') && ctx.includes('anchor kept 1') && ctx.includes('1 evening returns'), 'context carries the daily cadence')
  ok(ctx.includes('Receiving windows: 1 opened, 1 closed on purpose'), 'context carries windows opened vs landed')
  ok(ctx.includes('Breath practice: 2 sessions, about 5 minutes'), 'context totals breath minutes')
  ok(ctx.includes('Co-regulation doses: 1') && ctx.includes('3 days ago'), 'context carries co-reg cadence and recency')
  ok(ctx.includes('Bookends: 1 scary actions named, 1 closed'), 'context carries bookends')
  ok(ctx.includes('14 breaths/min'), 'context carries the newest proxy line')
  ok(ctx.includes('scene three: the missed wedding'), 'the tape rides along verbatim even when older than the window')
  ok(ctx.includes('determined to feel hard done by'), 'counter-lines ride along verbatim even when older than the window')
  ok(ctx.includes('trends, not a diary'), 'context announces itself as trends')
  ok(buildRecoveryContext([], { now: ctxNow }) === '', 'no events, no context')
  ok(buildRecoveryContext(null, { now: ctxNow }) === '', 'null events tolerated')
  ok(buildRecoveryContext(
    [{ kind: 'tape', at: iso(2), payload: { text: 'just a tape' } }],
    { now: ctxNow },
  ) === '', 'a tape alone is not activity — no context from housekeeping')

  console.log(`\nAll ${passed} practice checks pass.`)
}

main().catch((err) => {
  console.error(`\n  ✗ ${err.message}`)
  process.exit(1)
})
