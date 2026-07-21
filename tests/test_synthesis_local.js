// ─── SYNTHESIS STAGE TEST HARNESS ────────────────────────────────────────────
// The synthesis stage is mostly LLM-generated — the mirror, profile, and
// placement card all require live API calls to validate. What we can test
// locally is:
//   1. The civilisational statement builder (deterministic formatter)
//   2. Completeness of DOMAIN_HORIZON_GOALS (all seven domains)
//   3. Completeness of SCALE_LABELS (all eight scales)
//   4. Edge cases in the statement builder

const {
  DOMAIN_HORIZON_GOALS,
  SCALE_LABELS,
  buildCivilisationalStatement,
} = require('./_pp-synthesis-local.js')

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
    console.log(`    expected: ${JSON.stringify(expected)}`)
    console.log(`    got:      ${JSON.stringify(actual)}`)
  }
}

function testContains(name, haystack, needle) {
  const pass = typeof haystack === 'string' && haystack.includes(needle)
  if (pass) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    issues.push({ name, expected: `contains "${needle}"`, actual: haystack })
    console.log(`  ✗ ${name}`)
    console.log(`    expected to contain: "${needle}"`)
    console.log(`    got: ${haystack}`)
  }
}

console.log('═══════════════════════════════════════════════════════════════════')
console.log('SYNTHESIS — LOCAL LOGIC TEST')
console.log('═══════════════════════════════════════════════════════════════════\n')

// ─── Group 1: Horizon Goals completeness ─────────────────────────────────────

console.log('─── Horizon Goals: all seven domains ───')

const REQUIRED_DOMAINS = ['HUMAN BEING', 'SOCIETY', 'NATURE', 'TECHNOLOGY', 'FINANCE & ECONOMY', 'LEGACY', 'VISION']

for (const domain of REQUIRED_DOMAINS) {
  test(`${domain} has horizon goal`, !!DOMAIN_HORIZON_GOALS[domain], true)
  if (DOMAIN_HORIZON_GOALS[domain]) {
    test(`${domain} horizon goal ends with period`,
         DOMAIN_HORIZON_GOALS[domain].endsWith('.'),
         true)
    test(`${domain} horizon goal is non-trivial length`,
         DOMAIN_HORIZON_GOALS[domain].length > 40,
         true)
  }
}

// ─── Group 2: Scale Labels completeness ──────────────────────────────────────

console.log('\n─── Scale Labels: all eight scales ───')

const REQUIRED_SCALES = ['home', 'neighbourhood', 'city', 'province', 'country', 'continent', 'global', 'civilisational']

for (const scale of REQUIRED_SCALES) {
  test(`${scale} has label`, !!SCALE_LABELS[scale], true)
}

// Verify the specific translations
test('home → home', SCALE_LABELS['home'], 'home')
test('province → regional', SCALE_LABELS['province'], 'regional')
test('country → national', SCALE_LABELS['country'], 'national')
test('continent → continental', SCALE_LABELS['continent'], 'continental')

// ─── Group 3: Civilisational Statement Builder ───────────────────────────────

console.log('\n─── Civilisational Statement: structure and content ───')

// Standard case — Architect in Vision at Global scale
const statement1 = buildCivilisationalStatement({
  archetype: 'Architect',
  sub_function_label: 'Field Architect',
  domain: 'VISION',
  scale: 'global',
})
testContains('Architect/Field/Vision/global — includes sub-function label',
             statement1, 'Field Architect')
testContains('Architect/Field/Vision/global — includes "I am a"',
             statement1, 'I am a ')
testContains('Architect/Field/Vision/global — includes domain',
             statement1, 'VISION')
testContains('Architect/Field/Vision/global — includes scale label',
             statement1, 'global scale')
testContains('Architect/Field/Vision/global — includes "working toward"',
             statement1, 'working toward')
testContains('Architect/Field/Vision/global — includes horizon goal language',
             statement1, 'imagine and choose')
test('Architect/Field/Vision/global — ends without period duplication',
     !statement1.endsWith('..'), true)

// Case: no sub-function label → falls back to archetype
const statement2 = buildCivilisationalStatement({
  archetype: 'Connector',
  sub_function_label: null,
  domain: 'NATURE',
  scale: 'country',
})
testContains('Connector/no-subfunction/Nature/country — uses archetype when label missing',
             statement2, 'I am a Connector in NATURE')
testContains('Connector/no-subfunction/Nature/country — uses national scale label',
             statement2, 'national scale')

// Case: province → regional
const statement3 = buildCivilisationalStatement({
  archetype: 'Steward',
  sub_function_label: 'Place Steward',
  domain: 'LEGACY',
  scale: 'province',
})
testContains('Steward/Place/Legacy/province — translates province to "regional"',
             statement3, 'regional scale')

// Case: civilisational scale
const statement4 = buildCivilisationalStatement({
  archetype: 'Sage',
  sub_function_label: 'Writer Sage',
  domain: 'LEGACY',
  scale: 'civilisational',
})
testContains('Sage/Writer/Legacy/civilisational — uses civilisational scale directly',
             statement4, 'civilisational scale')

// Case: horizon goal properly inserted without double period
console.log('\n─── Sample statements for review ───')
console.log(`  ${statement1}`)
console.log(`  ${statement2}`)
console.log(`  ${statement3}`)
console.log(`  ${statement4}`)

// Check that no statement has a double period or missing connective
for (const [name, s] of [['statement1', statement1], ['statement2', statement2], ['statement3', statement3], ['statement4', statement4]]) {
  test(`${name} has no double-period`, !s.includes('..'), true)
  test(`${name} ends with period`, s.endsWith('.'), true)
}

// ─── Group 4: All combinations produce valid statements ──────────────────────

console.log('\n─── Generative test: all domain × scale combinations produce valid output ───')

const SAMPLE_ARCHETYPE = {
  archetype: 'Connector',
  sub_function_label: 'Community Connector',
}

let combinationsOk = 0
let combinationsFailed = 0

for (const domain of REQUIRED_DOMAINS) {
  for (const scale of REQUIRED_SCALES) {
    const s = buildCivilisationalStatement({
      ...SAMPLE_ARCHETYPE,
      domain,
      scale,
    })

    // Basic validity checks
    const ok = s.startsWith('I am a ') &&
               s.includes(domain) &&
               s.includes('working toward') &&
               s.endsWith('.') &&
               !s.includes('..')

    if (ok) combinationsOk++
    else combinationsFailed++
  }
}

test(`All ${REQUIRED_DOMAINS.length * REQUIRED_SCALES.length} domain × scale combinations valid`,
     combinationsOk,
     REQUIRED_DOMAINS.length * REQUIRED_SCALES.length)

// ─── Results ─────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════════════')
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
console.log('═══════════════════════════════════════════════════════════════════\n')

if (issues.length > 0) {
  console.log('ISSUES TO RESOLVE:\n')
  for (const issue of issues) {
    console.log(`  ${issue.name}`)
    console.log(`    expected: ${JSON.stringify(issue.expected)}`)
    console.log(`    actual:   ${JSON.stringify(issue.actual)}\n`)
  }
  process.exit(1)
}

console.log('NOTE: Mirror, Profile, and Placement Card generators require live API calls to validate.')
console.log('The prompts are complete and structured. See _pp-synthesis.js for the system prompts.')
console.log('Live validation needs real traffic against actual session data.\n')
