// ─── WISH STAGE TEST HARNESS ─────────────────────────────────────────────────
// Tests the local (non-Claude) logic of the wish stage handler against the
// six scenarios from the conversation spec.
//
// Does NOT call Claude — only tests the phase detection, negative/personal/
// scattered classifiers, and session state transitions.
//
// Run with: node test_wish_stage_local.js

const {
  isNegative, isPersonal, isScattered, isThinWish, wordCount, detectPhase
} = require('./_pp-wish-local.js')

const scenarios = [
  {
    name: 'Wish 1 — Negative entry, clear domain (Nature)',
    input: "I wish we'd stop destroying the planet. The way we treat the natural world is just... it breaks me.",
    expected: {
      isNegative: true,
      isPersonal: false,
      isScattered: false,
      isThin: false,
      firstPhase: 'conversion',
    }
  },
  {
    name: 'Wish 2 — Positive entry, clear domain (Human Being)',
    input: "I want people to know themselves better. I feel like most of the suffering I see comes from people being completely disconnected from who they actually are.",
    expected: {
      isNegative: false,
      isPersonal: false,
      isScattered: false,
      isThin: false,
      firstPhase: 'deepening',
    }
  },
  {
    name: 'Wish 3 — Abstract entry, ambiguous domain (Vision or Society)',
    input: "I wish humanity had better answers to where we're going. Like, collectively. We seem to be lurching forward without any real sense of direction.",
    expected: {
      isNegative: false,
      isPersonal: false,
      isScattered: false,
      isThin: false,
      firstPhase: 'deepening',
      // Note: ambiguity is resolved at extraction time, not phase detection
    }
  },
  {
    name: 'Wish 4 — Personal entry, needs conversion (Society or Human Being)',
    input: "I wish my kids could grow up in a world that didn't feel so anxious and scary all the time.",
    expected: {
      isNegative: true,   // "didn't feel" contains "didn't"
      isPersonal: true,   // "my kids" triggers personal
      isScattered: false,
      isThin: false,
      // Personal takes priority in phase routing — we want to honour the
      // personal root before lifting to structural
      firstPhase: 'personal_to_structural',
    }
  },
  {
    name: 'Wish 5 — Very specific entry (Finance & Economy)',
    input: "I want to see an economic system that doesn't require endless growth to function. The whole logic of extract-and-discard is killing everything.",
    expected: {
      // The person has already named what they want (a non-extractive
      // economic system). The structural critique is context, not the wish
      // itself. No conversion needed — go straight to deepening.
      isNegative: false,
      isPersonal: false,
      isScattered: false,
      isThin: false,
      firstPhase: 'deepening',
    }
  },
  {
    name: 'Wish 6 — Scattered, multiple things named',
    input: "I wish there was less violence, more equality, better education, and people who actually cared about the future. I just want the world to be better.",
    expected: {
      isNegative: true,  // "less" triggers
      isPersonal: false,
      isScattered: true, // 3+ commas/ands
      isThin: false,
      // Scattered takes priority — focus before anything else
      firstPhase: 'focusing',
    }
  },
  {
    name: 'Thin case — non-answer',
    input: "idk",
    expected: {
      isNegative: false,
      isPersonal: false,
      isScattered: false,
      isThin: true,
      firstPhase: 'thin_probe',
    }
  },
  {
    name: 'Thin case — too short',
    input: "peace",
    expected: {
      isThin: true,
      firstPhase: 'thin_probe',
    }
  },
]

console.log('═══════════════════════════════════════════════════════════════════')
console.log('WISH STAGE — LOCAL LOGIC TEST')
console.log('═══════════════════════════════════════════════════════════════════\n')

let passed = 0
let failed = 0
const issues = []

for (const scenario of scenarios) {
  console.log(`─── ${scenario.name} ───`)
  console.log(`  Input: "${scenario.input}"`)

  const actual = {
    isNegative:  isNegative(scenario.input),
    isPersonal:  isPersonal(scenario.input),
    isScattered: isScattered(scenario.input),
    isThin:      isThinWish(scenario.input),
    wordCount:   wordCount(scenario.input),
  }

  // Phase detection for first answer (exchangeCount = 1)
  const session = { wishTranscript: [] }
  const firstPhase = detectPhase(session, scenario.input, 1)
  actual.firstPhase = firstPhase

  console.log(`  Detected:`)
  console.log(`    negative:   ${actual.isNegative}`)
  console.log(`    personal:   ${actual.isPersonal}`)
  console.log(`    scattered:  ${actual.isScattered}`)
  console.log(`    thin:       ${actual.isThin}`)
  console.log(`    word count: ${actual.wordCount}`)
  console.log(`    phase:      ${actual.firstPhase}`)

  // Check each expected field that was specified
  let scenarioPassed = true
  for (const [key, expectedVal] of Object.entries(scenario.expected)) {
    if (actual[key] !== expectedVal) {
      scenarioPassed = false
      issues.push({
        scenario: scenario.name,
        field:    key,
        expected: expectedVal,
        actual:   actual[key],
      })
      console.log(`    ✗ ${key}: expected ${expectedVal}, got ${actual[key]}`)
    }
  }

  if (scenarioPassed) {
    console.log(`  ✓ PASS`)
    passed++
  } else {
    console.log(`  ✗ FAIL`)
    failed++
  }
  console.log()
}

console.log('═══════════════════════════════════════════════════════════════════')
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
console.log('═══════════════════════════════════════════════════════════════════\n')

if (issues.length > 0) {
  console.log('ISSUES TO RESOLVE:\n')
  for (const issue of issues) {
    console.log(`  ${issue.scenario}`)
    console.log(`    field '${issue.field}': expected ${issue.expected}, got ${issue.actual}\n`)
  }
}

// ─── Priority order test ─────────────────────────────────────────────────────
// Important: when a wish matches multiple classifiers (e.g. negative AND
// personal), we need a consistent priority order in phase detection.
//
// Current priority (from detectPhase):
//   1. thin → thin_probe
//   2. scattered → focusing
//   3. negative → conversion
//   4. personal → personal_to_structural
//   5. default → deepening
//
// But the expected behaviour in the spec is:
//   - Personal should take priority over negative (Wish 4 is both, we want
//     personal_to_structural because the personal root matters more than
//     the negative framing)
//   - Scattered should take priority over negative (someone can be naming
//     multiple negative things — still need focusing first)
//
// So the correct priority is: thin → scattered → personal → negative → default

console.log('═══════════════════════════════════════════════════════════════════')
console.log('PRIORITY ORDER CHECK')
console.log('═══════════════════════════════════════════════════════════════════\n')

const priorityTests = [
  {
    name: 'Negative AND personal (Wish 4) → should be personal_to_structural',
    input: "I wish my kids didn't have to grow up with all this anxiety.",
    expected: 'personal_to_structural',
  },
  {
    name: 'Scattered AND negative (Wish 6 variant) → should be focusing',
    input: "Less violence, less inequality, less environmental destruction, less corruption.",
    expected: 'focusing',
  },
  {
    name: 'Personal AND scattered → should be focusing',
    input: "I want my kids, my family, and my community to all be happier.",
    expected: 'focusing',
  },
]

for (const test of priorityTests) {
  const session = { wishTranscript: [] }
  const phase = detectPhase(session, test.input, 1)
  const pass = phase === test.expected
  console.log(`${pass ? '✓' : '✗'} ${test.name}`)
  console.log(`  Input: "${test.input}"`)
  console.log(`  Expected: ${test.expected}, Got: ${phase}\n`)
}
