// ─── ROLE STAGE TEST HARNESS ─────────────────────────────────────────────────
// Tests the local logic: taxonomy structure, mode derivation, node candidacy.

const {
  SUB_FUNCTION_SLUGS, deriveMode, isNodeCandidate, MODE_BY_ARCHETYPE
} = require('./_pp-role-local.js')

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
    console.log(`    expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`)
  }
}

console.log('═══════════════════════════════════════════════════════════════════')
console.log('ROLE STAGE — LOCAL LOGIC TEST')
console.log('═══════════════════════════════════════════════════════════════════\n')

// ─── Group 1: Taxonomy structure ─────────────────────────────────────────────

console.log('─── Taxonomy: all nine archetypes have 5 sub-functions (4 specific + unspecified) ───')

const NINE_ARCHETYPES = ['Maker', 'Architect', 'Connector', 'Guardian', 'Steward', 'Explorer', 'Sage', 'Mirror', 'Exemplar']

for (const arch of NINE_ARCHETYPES) {
  test(`${arch} has taxonomy`, !!SUB_FUNCTION_SLUGS[arch], true)
  if (SUB_FUNCTION_SLUGS[arch]) {
    test(`${arch} has 5 sub-functions (incl. unspecified)`, SUB_FUNCTION_SLUGS[arch].length, 5)
    test(`${arch} includes 'unspecified' fallback`,
         SUB_FUNCTION_SLUGS[arch].some(s => s.slug === 'unspecified'),
         true)

    // All slugs should be unique within archetype
    const slugs = SUB_FUNCTION_SLUGS[arch].map(s => s.slug)
    const uniqueSlugs = new Set(slugs)
    test(`${arch} sub-function slugs are unique`, slugs.length, uniqueSlugs.size)
  }
}

// ─── Group 2: Mode derivation ────────────────────────────────────────────────

console.log('\n─── Mode derivation: archetype + sub-function + scale → proximate | transmissive | both ───')

// Proximate archetypes default to proximate
test('Maker/product/city → proximate',         deriveMode('Maker',     'product',       'city'),           'proximate')
test('Connector/community/city → proximate',   deriveMode('Connector', 'community',     'city'),           'proximate')
test('Guardian/quality/country → proximate',   deriveMode('Guardian',  'quality',       'country'),        'proximate')
test('Steward/place/neighbourhood → proximate',deriveMode('Steward',   'place',         'neighbourhood'),  'proximate')

// Transmissive archetypes default to transmissive
test('Sage/writer/global → transmissive',      deriveMode('Sage',      'writer',        'global'),         'transmissive')
test('Mirror/narrative/national → transmissive', deriveMode('Mirror',  'narrative',     'country'),        'transmissive')
test('Exemplar/public/country → transmissive', deriveMode('Exemplar',  'public',        'country'),        'transmissive')

// Architect: sub-function dependent
test('Architect/institutional → proximate',    deriveMode('Architect', 'institutional', 'city'),           'proximate')
test('Architect/field → transmissive',         deriveMode('Architect', 'field',         'global'),         'transmissive')
test('Architect/technical → both',             deriveMode('Architect', 'technical',     'country'),        'both')
test('Architect/cultural → both',              deriveMode('Architect', 'cultural',      'country'),        'both')

// Explorer: sub-function dependent
test('Explorer/frontier → both',               deriveMode('Explorer',  'frontier',      'country'),        'both')
test('Explorer/forgotten → transmissive',      deriveMode('Explorer',  'forgotten',     'global'),         'transmissive')
test('Explorer/intersection → transmissive',   deriveMode('Explorer',  'intersection',  'global'),         'transmissive')

// Scale override: civilisational pushes proximate toward both
test('Maker/product/civilisational → both (scale override)',
     deriveMode('Maker', 'product', 'civilisational'), 'both')
test('Connector/community/civilisational → both (scale override)',
     deriveMode('Connector', 'community', 'civilisational'), 'both')

// Scale override does NOT apply when base mode is already transmissive
test('Sage/writer/civilisational → transmissive (no override)',
     deriveMode('Sage', 'writer', 'civilisational'), 'transmissive')
test('Mirror/narrative/civilisational → transmissive (no override)',
     deriveMode('Mirror', 'narrative', 'civilisational'), 'transmissive')

// Architect with "proximate" sub-function at civilisational scale
test('Architect/institutional/civilisational → both (scale override)',
     deriveMode('Architect', 'institutional', 'civilisational'), 'both')

// ─── Group 3: Node candidate detection ──────────────────────────────────────

console.log('\n─── Node candidates: Steward, Connector, Architect (field/cultural), Sage at right scales ───')

// Steward candidates
test('Steward at city → node candidate',
     isNodeCandidate({ archetype: 'Steward', sub_function: 'institutional', scale: 'city' }), true)
test('Steward at country → node candidate',
     isNodeCandidate({ archetype: 'Steward', sub_function: 'place', scale: 'country' }), true)
test('Steward at home → NOT node candidate (too local)',
     isNodeCandidate({ archetype: 'Steward', sub_function: 'relationship', scale: 'home' }), false)
test('Steward at civilisational → NOT node candidate (beyond node scale)',
     isNodeCandidate({ archetype: 'Steward', sub_function: 'practice', scale: 'civilisational' }), false)

// Connector candidates
test('Connector at city → node candidate',
     isNodeCandidate({ archetype: 'Connector', sub_function: 'community', scale: 'city' }), true)
test('Connector at global → node candidate',
     isNodeCandidate({ archetype: 'Connector', sub_function: 'network', scale: 'global' }), true)
test('Connector at home → NOT node candidate',
     isNodeCandidate({ archetype: 'Connector', sub_function: 'community', scale: 'home' }), false)

// Architect candidates (field/cultural only)
test('Architect/field → node candidate',
     isNodeCandidate({ archetype: 'Architect', sub_function: 'field', scale: 'global' }), true)
test('Architect/cultural → node candidate',
     isNodeCandidate({ archetype: 'Architect', sub_function: 'cultural', scale: 'country' }), true)
test('Architect/institutional → NOT node candidate',
     isNodeCandidate({ archetype: 'Architect', sub_function: 'institutional', scale: 'country' }), false)
test('Architect/technical → NOT node candidate',
     isNodeCandidate({ archetype: 'Architect', sub_function: 'technical', scale: 'global' }), false)

// Sage candidates (continent+ only)
test('Sage at continent → node candidate',
     isNodeCandidate({ archetype: 'Sage', sub_function: 'writer', scale: 'continent' }), true)
test('Sage at civilisational → node candidate',
     isNodeCandidate({ archetype: 'Sage', sub_function: 'writer', scale: 'civilisational' }), true)
test('Sage at city → NOT node candidate (too local for Sage role)',
     isNodeCandidate({ archetype: 'Sage', sub_function: 'teacher', scale: 'city' }), false)

// Non-candidates
test('Maker anywhere → NOT node candidate',
     isNodeCandidate({ archetype: 'Maker', sub_function: 'product', scale: 'global' }), false)
test('Guardian → NOT node candidate',
     isNodeCandidate({ archetype: 'Guardian', sub_function: 'quality', scale: 'country' }), false)
test('Mirror → NOT node candidate',
     isNodeCandidate({ archetype: 'Mirror', sub_function: 'narrative', scale: 'global' }), false)
test('Exemplar → NOT node candidate',
     isNodeCandidate({ archetype: 'Exemplar', sub_function: 'public', scale: 'country' }), false)

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
