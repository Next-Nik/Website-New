// ─── INSTINCT STAGE TEST HARNESS ─────────────────────────────────────────────
// Tests thin-answer detection and confusion detection across the five
// behavioural questions.

const { isInstinctAnswerThin, isConfused } = require('./_pp-instinct-local.js')

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
console.log('INSTINCT STAGE — LOCAL LOGIC TEST')
console.log('═══════════════════════════════════════════════════════════════════\n')

// ─── Behavioural answers that should pass (Q0-Q2: Moment, Frustration, Pressure) ──

console.log('─── Behavioural answers (Q0-Q2): should pass ───')

const goodBehavioural = [
  {
    qi: 0,
    answer: "Last year at work a junior colleague was being talked over in a meeting by two senior people. I stepped in and redirected the conversation back to what she was saying. Nobody else said anything, but she emailed me afterward.",
    why: "has time anchor, action verbs, and setting"
  },
  {
    qi: 1,
    answer: "I see companies greenwashing all the time. Last month I watched a brand with known sweatshop contracts win a sustainability award at a conference I was at. Nobody raised it. I wrote a long piece about it afterward.",
    why: "has time, action, setting"
  },
  {
    qi: 2,
    answer: "A few months ago I had to decide whether to fire a founder from a project I'd invested in. The numbers were still okay but the behaviour was getting worse. I decided to push him out before the situation got worse. It broke the relationship.",
    why: "time anchor, specific decision, stakes"
  },
]

for (const c of goodBehavioural) {
  test(`Q${c.qi}: "${c.answer.slice(0, 50)}..." → substantive (${c.why})`,
       isInstinctAnswerThin(c.answer, c.qi),
       false)
}

// ─── Behavioural answers that SHOULD be flagged thin ──

console.log('\n─── Behavioural answers: should be flagged thin ───')

const thinBehavioural = [
  {
    qi: 0,
    answer: "I don't know, I guess I tend to step in sometimes.",
    why: "two deflectors, no grounding"
  },
  {
    qi: 1,
    answer: "Lots of things bother me I guess. It depends on the day.",
    why: "deflectors + generic, no specifics"
  },
  {
    qi: 2,
    answer: "I make decisions all the time. I just try to do my best.",
    why: "generic, no time/action/setting, abstract"
  },
  {
    qi: 0,
    answer: "Something went wrong and I dealt with it.",
    why: "too short, too vague"
  },
]

for (const c of thinBehavioural) {
  test(`Q${c.qi}: "${c.answer.slice(0, 50)}..." → thin (${c.why})`,
       isInstinctAnswerThin(c.answer, c.qi),
       true)
}

// ─── Cost/Shadow answers (Q3-Q4): lower word threshold, no grounding required ──

console.log('\n─── Cost/Shadow answers (Q3-Q4): softer threshold ───')

const goodReflective = [
  {
    qi: 3,
    answer: "Carrying responsibility for things nobody else seems to notice. Then being resented for naming them.",
    why: "reflective, real cost, under 20 words but over 15"
  },
  {
    qi: 4,
    answer: "I pushed a team to restructure when the existing structure was fine. Lost trust because I moved on a problem that wasn't actually the problem.",
    why: "specific shadow moment, 25 words"
  },
  {
    qi: 3,
    answer: "Seeing a problem arrive six months before anyone else and having to sit with it alone until they catch up.",
    why: "reflective cost statement, 20 words"
  },
]

for (const c of goodReflective) {
  test(`Q${c.qi}: "${c.answer.slice(0, 50)}..." → substantive (${c.why})`,
       isInstinctAnswerThin(c.answer, c.qi),
       false)
}

const thinReflective = [
  {
    qi: 3,
    answer: "It's tiring I guess.",
    why: "too short, even for reflective question"
  },
  {
    qi: 4,
    answer: "Sometimes I push too hard. I don't know.",
    why: "deflectors + too short"
  },
]

for (const c of thinReflective) {
  test(`Q${c.qi}: "${c.answer.slice(0, 50)}..." → thin (${c.why})`,
       isInstinctAnswerThin(c.answer, c.qi),
       true)
}

// ─── Confusion detection ──

console.log('\n─── Confusion detection ───')

const confusedCases = [
  { input: "what do you mean?", expected: true, why: "direct confusion signal" },
  { input: "I don't understand", expected: true, why: "direct confusion signal" },
  { input: "Can you rephrase that?", expected: true, why: "reframe request" },
  { input: "huh?", expected: true, why: "short confusion" },
  { input: "not sure what you're asking", expected: true, why: "confusion phrase" },
]

for (const c of confusedCases) {
  test(`"${c.input}" → confused (${c.why})`, isConfused(c.input), c.expected)
}

const notConfusedCases = [
  {
    input: "Last year I had to decide whether to leave a board seat when the org's direction changed.",
    expected: false,
    why: "substantive answer with no confusion markers"
  },
  {
    input: "I'm not sure, maybe when I stepped in with that colleague. Is that what you mean?",
    expected: false,
    why: "has question mark but is actually a substantive attempt — length > 40 chars"
  },
  {
    input: "It's hard to say exactly, but I think when I pushed the team...",
    expected: false,
    why: "hedging but actually answering"
  },
]

for (const c of notConfusedCases) {
  test(`"${c.input.slice(0, 50)}..." → not confused (${c.why})`,
       isConfused(c.input),
       c.expected)
}

// ─── Results ──

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
