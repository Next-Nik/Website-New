// ─────────────────────────────────────────────────────────────
// practiceBlocks.js — the registry
//
// Every block the daily practice can hold, as data. This is the
// single source of truth the composer (plus/minus) and the runner
// (the walk) both read. Nothing renders a sequence except by asking
// this file what's in it and in what order.
//
// The order numbers are the canonical line we locked. Gaps of ten so
// new blocks slot in without renumbering. If every block were on,
// they run smallest number to largest.
//
// `status` tells the runner how to handle a block today:
//   'ready' — a compact, embeddable block component (renders inline)
//   'page'  — a full writing tool, rendered inline inside the walk via
//             its own component in embedded mode (no nav, no chrome);
//             the same component still serves its standalone route
//   'link'  — a full page that stays its own room; the runner shows a
//             quiet, non-trapping pass-through (open it, or carry on)
//   'weld'  — still welded inside Horizon State / Practice; not yet
//             extracted, so the runner shows a quiet "not wired yet"
//   'new'   — designed but unbuilt (none currently; midday became its
//             own screen, MiddayRecenter)
//
// As each welded beat is extracted into a block component, its entry
// flips from 'weld'/'link' to 'ready' and gains a `component`. The
// registry is the worklist for the extraction stage, made literal.
// ─────────────────────────────────────────────────────────────

export const REGIONS = {
  intro: 'Intro',   // the way in — land and regulate
  meat:  'The Work', // the fillings — become, write, aim
  outro: 'Outro',   // the way out — release and launch
}

// The master line. One object per block.
export const BLOCKS = {
  flame_arrive: { id: 'flame_arrive', label: 'Check in', region: 'intro', order: 10,  status: 'ready', component: 'FlameCheck' },
  readiness:    { id: 'readiness',    label: 'Choose',            region: 'intro', order: 20,  status: 'ready', component: 'Readiness' },
  breath_in:    { id: 'breath_in',    label: 'Energy breath',       region: 'intro', order: 30,  status: 'ready', component: 'ChargeBreath' },
  audio_baseline:    { id: 'audio_baseline',    label: 'Audio · Baseline',    region: 'meat', order: 40, status: 'ready', component: 'FoundationAudio', phase: 'baseline' },
  audio_calibration: { id: 'audio_calibration', label: 'Audio · Calibration', region: 'meat', order: 42, status: 'ready', component: 'FoundationAudio', phase: 'calibration' },
  audio_embodiment:  { id: 'audio_embodiment',  label: 'Audio · Embodiment',  region: 'meat', order: 44, status: 'ready', component: 'FoundationAudio', phase: 'embodiment' },
  i_am:         { id: 'i_am',         label: 'I Am',                region: 'meat',  order: 50,  status: 'page', component: 'IAmPractice', route: '/tools/i-am' },
  // i_am_spoken retired — the spoken I Am lives inside Horizon State's
  // Calibration audio, and a standalone voiced tool isn't built yet. The
  // old 'weld' placeholder rendered as a dead pass-through, so it's gone.
  // resolve() drops it silently from any saved shape that still lists it.
  sentence:     { id: 'sentence',     label: 'Sentence completion',  region: 'meat',  order: 60,  status: 'page', component: 'SentenceCompletion', route: '/tools/sentence-completion' },
  morning_pages:{ id: 'morning_pages',label: 'Open pages',        region: 'meat',  order: 70,  status: 'page', component: 'MorningPages', route: '/tools/morning-pages' },
  journal:      { id: 'journal',      label: 'Journal · free write', region: 'meat',  order: 75,  status: 'link', route: '/journal' },
  win_the_day:  { id: 'win_the_day',  label: 'Win the Day',          region: 'meat',  order: 80,  status: 'ready', component: 'WinTheDay' },
  thresholds:   { id: 'thresholds',   label: 'Calendar intention',region: 'meat',  order: 85,  status: 'ready', component: 'Thresholds' },
  breath_out:   { id: 'breath_out',   label: 'Breath — regulate and anchor', region: 'outro', order: 90, status: 'ready', component: 'OpenBreath' },
  embark:       { id: 'embark',       label: 'Check out', region: 'outro', order: 95,  status: 'ready', component: 'FlameCheck' },
  act:          { id: 'act',          label: 'Act · you are live',   region: 'outro', order: 100, status: 'ready', component: 'Act' },
}

// The house versions — what we offer to start. Each is a list of
// block ids; the resolver sorts them into canonical order. Everything
// is optional, so these are a starting suggestion, not a frame.
export const HOUSE = {
  morning: ['flame_arrive', 'breath_in', 'i_am', 'win_the_day', 'breath_out'],
  evening: ['journal'],   // evening stays the existing how-was-your-day flow; breath is built into it
  // midday has no block line — it's a single frameless screen (MiddayRecenter)
}

export const ENTRANCES = [
  { key: 'morning', label: 'Morning', sub: 'Land, become, aim, breathe out.' },
  { key: 'midday',  label: 'Midday',  sub: 'Regulate, remember, recommit, release.' },
  { key: 'evening', label: 'Evening', sub: 'How was your day.' },
]

// Resolve a list of block ids into the blocks themselves, in
// canonical order. Unknown ids are dropped, not thrown.
export function resolve(ids) {
  return (ids || [])
    .map(id => BLOCKS[id])
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
}

// The full line, in order — used by the composer to show everything
// available with its on/off state.
export function allBlocksInOrder() {
  return Object.values(BLOCKS).sort((a, b) => a.order - b.order)
}
