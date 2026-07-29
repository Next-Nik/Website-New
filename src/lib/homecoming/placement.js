// src/lib/homecoming/placement.js
//
// The Placement — Homecoming's front-door greeter. It replaces the blank
// "phrase your life-block" field with recognition, not recall: five tap
// questions, then the tool DRAFTS the two Threshold lines (old number, target
// home) for the person to confirm or nudge. Give language for what they already
// sensed, rather than demand they author it cold.
//
// It also quietly reads a few patterns from the same taps — a misplaced
// set-point (calm reads as threat), the reach that shifts state fast (the
// addiction-shaped loop), crisis-as-organizing, and which protector domain is
// loudest. These shape the drafted lines and a short, plain-language reflection.
// They are reads, never verdicts, and never clinical labels on the surface.
//
// PORTABLE: pure data + pure functions. Imports nothing.

export const PLACEMENT = [
  {
    id: 'baseline',
    prompt: 'Most days, before anything happens, where does your body sit?',
    hint: 'Your resting normal, not this exact moment.',
    options: [
      { id: 'wired',     label: 'Wired',     sub: 'up on the balls of my feet, scanning' },
      { id: 'collapsed', label: 'Run-down',  sub: 'flat, foggy, watching from a distance' },
      { id: 'lit',       label: 'Going hard', sub: 'lit and driving, rarely coasting' },
      { id: 'relaxed',   label: 'Fairly settled', sub: 'mostly steady, there is just not enough of it' },
    ],
  },
  {
    id: 'calm',
    prompt: 'When things finally go calm and steady, what happens?',
    hint: 'This one matters most.',
    options: [
      { id: 'settle',  label: 'I settle into it', sub: 'it feels good when it comes' },
      { id: 'coming',  label: 'It feels unfamiliar', sub: 'like the quiet before something goes wrong' },
      { id: 'restless',label: 'I get restless or bored', sub: 'and start looking for stimulation' },
      { id: 'problem', label: 'I go find a problem', sub: 'something to fix, chase, or worry' },
    ],
  },
  {
    id: 'reach',
    prompt: 'When a day gets heavy, what pulls at you?',
    hint: 'The honest first reach.',
    options: [
      { id: 'edge',   label: 'Something to take the edge off', sub: 'a drink, a hit, a scroll, a snack' },
      { id: 'numb',   label: 'Disappearing', sub: 'screens, sleep, checking out' },
      { id: 'busy',   label: 'Getting busy', sub: 'more work, more doing, more useful' },
      { id: 'friction', label: 'Friction', sub: 'a conflict, a fight, a burned bridge' },
      { id: 'none',   label: 'Nothing in particular', sub: 'I mostly ride it out' },
    ],
  },
  {
    id: 'pressure',
    prompt: 'Where does the pressure usually come from?',
    hint: 'Pick the loudest one.',
    options: [
      { id: 'money',  label: 'Money and work', sub: 'earning, owing, the next thing' },
      { id: 'people', label: 'People', sub: 'draining ones, or the missing right one' },
      { id: 'push',   label: 'My own pushing', sub: 'never enough, never off' },
      { id: 'body',   label: 'A body running down', sub: 'health, energy, sleep' },
      { id: 'all',    label: 'All of it at once', sub: 'hard to say which' },
    ],
  },
  {
    id: 'home',
    prompt: 'What would home feel like?',
    hint: 'The one you are coming to.',
    options: [
      { id: 'settled_flush', label: 'Settled and flush', sub: 'resting without bracing for the drop' },
      { id: 'held',          label: 'Held and connected', sub: 'letting people in and staying' },
      { id: 'lit_creating',  label: 'Lit up and creating', sub: 'from a full tank, not a braced one' },
      { id: 'not_braced',    label: 'Just not braced', sub: 'calm that finally feels safe' },
    ],
  },
]

export const PLACEMENT_IDS = PLACEMENT.map(q => q.id)

// ── the composer ──────────────────────────────────────────────
// answers: { baseline, calm, reach, pressure, home } of option ids.
// Returns drafted lines, a plain reflection, and internal reads.

const BASELINE_PHRASE = {
  wired:     'Wired and scanning, rarely all the way off the clock',
  collapsed: 'Run-down and far off, moving through the days at a distance',
  lit:       'Lit and driving hard, rarely letting myself coast',
  relaxed:   'Mostly steady, with not nearly enough of the steadiness',
}

const CALM_PHRASE = {
  settle:  '. Calm is good when it comes; there is just too little of it.',
  coming:  '. When it finally goes calm, it reads as the quiet before something goes wrong.',
  restless:'. Calm turns restless fast, so I keep it moving.',
  problem: '. When things settle, I go find a problem to solve.',
}

const HOME_PHRASE = {
  settled_flush: 'Settled and flush, able to rest without bracing for the drop.',
  held:          'Held and connected, able to let people in and stay in the room.',
  lit_creating:  'Lit up and creating from a full tank, not a braced one.',
  not_braced:    'Not braced. Calm that finally reads as safe, not as warning.',
}

// which reassigned post / guardian domain is loudest
const PRESSURE_GUARDIAN = {
  money:  { post: 'alchemist', name: 'the Alchemist', line: 'money flowing and landing' },
  people: { post: 'companion', name: 'the Companion', line: 'the right people close and the door open' },
  push:   { post: 'sovereign', name: 'the Sovereign', line: 'taking up your space without grinding' },
  body:   { post: 'triad', name: 'the Triad', line: 'a body tended for the long life' },
  all:    { post: 'sovereign', name: 'your whole league', line: 'the conditions of a full life' },
}

// Plain naming of the reach for Scene One, tied to what the Placement heard.
export const REACH_COPY = {
  edge: 'the pull toward something to take the edge off',
  numb: 'the pull to disappear — screens, sleep, checking out',
  busy: 'the pull to get busy and useful',
  friction: 'the pull toward friction — a fight, a burned bridge',
  none: null,
}

export function composePlacement(answers = {}) {
  const { baseline, calm, reach, pressure, home } = answers

  const oldNumber = (
    (BASELINE_PHRASE[baseline] || 'Braced more than I need to be') +
    (CALM_PHRASE[calm] || '.')
  )
  const targetState = HOME_PHRASE[home] || 'Calm that feels like home, not like waiting.'

  // internal reads — shape the reflection, never shown as labels
  const reads = {
    misplacedSetpoint: ['coming', 'restless', 'problem'].includes(calm),
    crisisOrganizing: calm === 'problem',
    stimulationSeeking: calm === 'restless',
    reachLoop: ['edge', 'numb', 'friction'].includes(reach),
    reachKind: reach,
    guardian: PRESSURE_GUARDIAN[pressure] || PRESSURE_GUARDIAN.all,
    shutDown: baseline === 'collapsed',
  }

  // a short, plain reflection built from the reads (2–4 sentences)
  const bits = []
  if (reads.misplacedSetpoint) {
    bits.push('Your body has learned to read calm as risk, so it keeps the engine warm. That is a set-point, not a flaw, and set-points can move.')
  } else {
    bits.push('Calm already feels okay to you; there is just not enough of it yet. This is about widening the window, not building it from nothing.')
  }
  if (reads.reachLoop) {
    const reachWord = reach === 'edge' ? 'reaching for something to take the edge off'
      : reach === 'numb' ? 'reaching for the off switch'
      : 'reaching for friction'
    bits.push('When it gets heavy you notice yourself ' + reachWord + '. That is the state trying to change fast. The daily rep and Scene One are built for exactly that pull.')
  }
  if (reads.crisisOrganizing) {
    bits.push('Going to find a problem when things settle is the oldest move in the book: crisis organises a restless system. We can give that job to something kinder.')
  }
  bits.push('The place to start is ' + reads.guardian.name + ', tending ' + reads.guardian.line + '.')

  return {
    oldNumber,
    targetState,
    reflection: bits.join(' '),
    reads,
    startPost: reads.guardian.post,
  }
}
