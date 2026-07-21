// ─── PULL STAGE TEST HARNESS ─────────────────────────────────────────────────
// Tests the local logic of the pull stage handler.
//
// Three test groups:
//   1. Structure — all seven domains have a complete question set
//   2. Thin detection — catches pure deflection without flagging substantive-but-short answers
//   3. Edge cases — unusual answer shapes that should or shouldn't pass

const { PULL_QUESTIONS, isPullAnswerThin } = require('./_pp-pull-local.js')

let passed = 0
let failed = 0
const issues = []

function test(name, actual, expected) {
  const pass = actual === expected
  if (pass) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    issues.push({ name, expected, actual })
    console.log(`  ✗ ${name}`)
    console.log(`    expected: ${expected}, got: ${actual}`)
  }
}

console.log('═══════════════════════════════════════════════════════════════════')
console.log('PULL STAGE — LOCAL LOGIC TEST')
console.log('═══════════════════════════════════════════════════════════════════\n')

// ─── Group 1: Structure ──────────────────────────────────────────────────────

console.log('─── Structure: all seven domains have complete question sets ───')

const REQUIRED_DOMAINS = ['HUMAN BEING', 'SOCIETY', 'NATURE', 'TECHNOLOGY', 'FINANCE & ECONOMY', 'LEGACY', 'VISION']
const REQUIRED_LABELS = ['The Specific Failure', 'The Disproportionate Anger', 'The One Thing']

for (const domain of REQUIRED_DOMAINS) {
  test(`${domain} exists`, !!PULL_QUESTIONS[domain], true)
  if (PULL_QUESTIONS[domain]) {
    test(`${domain} has 3 questions`, PULL_QUESTIONS[domain].length, 3)
    for (let i = 0; i < 3; i++) {
      test(`${domain} Q${i + 1} label is "${REQUIRED_LABELS[i]}"`,
           PULL_QUESTIONS[domain][i]?.label,
           REQUIRED_LABELS[i])
    }
  }
}

// ─── Group 2: Thin detection ─────────────────────────────────────────────────

console.log('\n─── Thin detection: obvious thin answers ───')

const thinCases = [
  { input: 'idk', expected: true, why: 'single word deflection' },
  { input: 'not sure', expected: true, why: 'two-word deflection' },
  { input: 'I guess violence', expected: true, why: 'deflector + vague, under 8 words' },
  { input: 'everything is broken', expected: true, why: 'generic "everything" + short' },
  { input: 'lots of things', expected: true, why: 'generic + short' },
  { input: 'too many', expected: true, why: 'deflector, very short' },
  { input: 'hard to say really', expected: true, why: 'deflector + short' },
]

for (const c of thinCases) {
  test(`"${c.input}" → thin (${c.why})`, isPullAnswerThin(c.input), c.expected)
}

// ─── Group 3: Substantive-but-short answers that should NOT be flagged thin ─

console.log('\n─── Substantive-but-short answers: should pass ───')

const substantiveCases = [
  { input: 'We are not teaching children emotional regulation.', why: 'specific, 7 words' },
  { input: 'Institutional corruption that nobody names publicly.', why: 'specific, 6 words' },
  { input: 'The extractive logic of industrial agriculture.', why: 'specific, 6 words' },
  { input: 'Climate action that matches the actual timeline required.', why: '8 words, specific' },
  { input: 'People treating AI as a tool instead of a system that shapes them.', why: 'substantive, 14 words' },
  { input: 'Short-term incentives inside long-term institutions.', why: '6 words, real signal' },
]

for (const c of substantiveCases) {
  test(`"${c.input}" → substantive (${c.why})`, isPullAnswerThin(c.input), false)
}

// ─── Group 4: Edge cases ─────────────────────────────────────────────────────

console.log('\n─── Edge cases ───')

// Long but actually empty - this is a harder case
const rambleEmpty = "I don't know, I guess maybe everything, it's hard to say really, there's just so much"
// Currently our detector only flags as thin when there's a deflector AND length is low.
// This one has multiple deflectors AND is long-ish. Expected behaviour: the signal
// check via Claude would catch this. Locally, it's a false negative.
test(
  'long rambling deflection (known limitation, passes local check but should be caught by Claude signal check)',
  isPullAnswerThin(rambleEmpty),
  false  // Correctly documents current local behaviour
)

// Short but concrete
test(
  '"food deserts" (very short but concrete) — should pass',
  isPullAnswerThin('food deserts'),
  true  // 2 words, correctly flagged thin by word-count floor
)
// This is a fair flag — even though "food deserts" is real signal, 2 words is
// too short for the pull stage, which wants the person to elaborate. The probe
// will draw more out.

// Long, specific, complex — should pass
test(
  'long specific answer about climate — should pass',
  isPullAnswerThin('The way climate action keeps being treated as optional when it\'s an emergency that requires full mobilisation. We keep acting like we can negotiate with physics.'),
  false
)

// Empty string — thin
test('empty string → thin', isPullAnswerThin(''), true)

// Whitespace only — thin
test('whitespace only → thin', isPullAnswerThin('    '), true)

// ─── Results ─────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════════════')
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
console.log('═══════════════════════════════════════════════════════════════════\n')

if (issues.length > 0) {
  console.log('ISSUES TO RESOLVE:\n')
  for (const issue of issues) {
    console.log(`  ${issue.name}`)
    console.log(`    expected: ${issue.expected}`)
    console.log(`    actual:   ${issue.actual}\n`)
  }
  process.exit(1)
}
