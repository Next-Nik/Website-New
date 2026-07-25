// tests/nextsteps-exit-conditions.js
//
// NextSteps — the checkability corpus for the exit-condition validator.
// See: docs/NextSteps_Conceptual_Foundation_v2_0_1.md, Section 5.
//
//   "NextSteps never fakes an exit condition. Exit conditions are checkable
//    behavioural statements or they do not ship."
//
// This file is the regression guard on that Sacred Limit. The pressure the
// doc predicts is real and it is gradual: one softened exit condition looks
// harmless, and progress becomes fabricated one commit at a time. If a future
// change loosens `api/_exit-condition.js` far enough that anything in the
// SOFTENED list starts passing, this test fails and says so out loud.
//
// Run it with:  node tests/nextsteps-exit-conditions.js
// Exits non-zero on any miss, so it can go in CI whenever CI exists.

const path = require('path')
const { validateExitCondition, validateRoute } = require(
  path.join(__dirname, '..', 'api', '_exit-condition.js')
)

// ── Checkable. A person can answer these yes or no today, on their own. ──────
const CHECKABLE = [
  'You have had the conversation with your manager and you know what they said.',
  'You can hold the wall handstand for 60 seconds without kicking down.',
  'Three people you did not know before have replied to you.',
  'You have sent the first draft to someone who will be honest about it.',
  'The organisation you chose has confirmed you for a shift.',
  'You have said no to one thing that does not belong in this life.',
  'There is a written list of the organisations working on this, and you have contacted two.',
  'You have run one Target Stretch on this and closed it.',
  'You can name the three things that are actually stopping you, without notes.',
  'You have shown up to the group three times a week for a month.',
  'Your two lines about one organisation are live on the Atlas.',
  'You have asked two people in your street what they would want, and written down what they said.',
]

// ── Softened. Every one of these must be refused. ────────────────────────────
const SOFTENED = [
  // Feelings as the terminal condition. Always affirmable, so never an exit.
  ['You feel more confident about your finances.',        'feeling'],
  ['You feel ready.',                                     'feeling'],
  ['You believe in yourself.',                            'feeling'],
  ['You are comfortable with the risk.',                  'feeling'],
  ['Your mindset has shifted.',                           'feeling'],
  ['You no longer fear the conversation.',                'feeling'],
  ['You have a real sense of momentum.',                  'feeling'],
  // Deadline grammar. A phase has an exit condition, not a due date.
  ['By the end of March you have joined a group.',        'deadline'],
  ['Within three weeks you have contacted someone.',      'deadline'],
  ['You have met the deadline for the application.',      'deadline'],
  ['You are on track with your outreach.',                'deadline'],
  ['By Friday you have written the letter.',              'deadline'],
  // Uncheckable. Needs a judge, so the person cannot answer it alone.
  ['You have a clearer understanding of the system.',     'vague'],
  ['You are consistently showing up.',                    'vague'],
  ['You have made significant progress.',                 'vague'],
  ['When it feels right, you move on.',                   'vague'],
  ['You are doing well.',                                 'vague'],
  ['You have become someone who takes action.',           'vague'],
  ['Momentum.',                                           'too short'],
]

// ── Route-shape rules ───────────────────────────────────────────────────────
const p = (name, exit) => ({ name, work: 'The day to day work of this phase, described plainly enough to start.', exit_condition: exit })

const ROUTES = [
  {
    label: 'a route of two phases is not a route',
    phases: [p('One', 'You have contacted two organisations.'), p('Two', 'You have attended three sessions.')],
    ok: false,
  },
  {
    label: 'a route of seven phases is a plan pretending to certainty',
    phases: Array.from({ length: 7 }, (_, i) => p(`Phase ${i + 1}`, `You have done ${i + 1} of the things.`)),
    ok: false,
  },
  {
    label: 'three phases with checkable exits is a route',
    phases: [
      p('Find the ground', 'You have contacted two organisations and heard back from one.'),
      p('Show up',         'You have attended three sessions.'),
      p('Take a post',     'You have run one session yourself.'),
    ],
    ok: true,
  },
  {
    label: 'two phases ending on the same evidence are one phase',
    phases: [
      p('First',  'You have attended three sessions.'),
      p('Second', 'You have attended three sessions.'),
      p('Third',  'You have run one session yourself.'),
    ],
    ok: false,
  },
  {
    label: 'one soft exit fails the whole route',
    phases: [
      p('Find the ground', 'You have contacted two organisations.'),
      p('Settle in',       'You feel like you belong there.'),
      p('Take a post',     'You have run one session yourself.'),
    ],
    ok: false,
  },
]

// ── Run ─────────────────────────────────────────────────────────────────────

let failures = 0

console.log('\nCHECKABLE — these must pass')
for (const s of CHECKABLE) {
  const r = validateExitCondition(s)
  if (!r.ok) {
    failures++
    console.log(`  FAIL  a real exit condition was refused: "${s}"\n        ${r.reason}`)
  } else {
    console.log(`  ok    ${s.slice(0, 62)}`)
  }
}

console.log('\nSOFTENED — these must be refused')
for (const [s, kind] of SOFTENED) {
  const r = validateExitCondition(s)
  if (r.ok) {
    failures++
    console.log(`  FAIL  a ${kind} exit condition got through: "${s}"`)
  } else {
    console.log(`  ok    refused (${kind}): ${s.slice(0, 50)}`)
  }
}

console.log('\nROUTE SHAPE')
for (const t of ROUTES) {
  const r = validateRoute(t.phases)
  if (r.ok !== t.ok) {
    failures++
    console.log(`  FAIL  ${t.label} — expected ${t.ok ? 'pass' : 'refusal'}`)
    r.problems.forEach((x) => console.log(`        ${x}`))
  } else {
    console.log(`  ok    ${t.label}`)
  }
}

if (failures > 0) {
  console.log(`\n${failures} failure(s). The Sacred Limit is not holding.\n`)
  process.exit(1)
}
console.log('\nAll checkability rules hold.\n')
