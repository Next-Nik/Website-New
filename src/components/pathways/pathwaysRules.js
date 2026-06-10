// ─────────────────────────────────────────────────────────────
// pathwaysRules.js — Pathways v1 configuration
//
// One place for everything a human (Nik) authors about routing:
// need thresholds, the founder card, per-surface settings, and
// the per-domain toward-language copy. The component reads this;
// it never hard-codes content.
//
// LAWS (from the 10 June 2026 decisions log — do not soften):
//   • Card order: journey first, practitioner second, marketplace
//     third (marketplace omitted in v1 — commented slot only).
//   • Toward-language only. Never name a deficit.
//   • Need signal reads horizon_profile SCORES ONLY. Never Journal
//     content, never Horizon State sessions, never developmental
//     work. Privacy law, not preference.
//   • Spine framing: the platform is the spine; practitioners are
//     specialists who work alongside it. Both/and, never either/or.
// ─────────────────────────────────────────────────────────────

export const PERSONAL_DOMAIN_KEYS = [
  'path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal',
]

export const PERSONAL_DOMAIN_LABELS = {
  path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
  connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal',
}

// ─── Need signal (v1 — rule-based, no AI) ────────────────────
// Active need:  current ≤ scoreMax  OR  (horizon − current) ≥ gapMin
// Primary need: the active-need domain with the largest gap.
export const NEED_THRESHOLDS = {
  scoreMax: 4,
  gapMin:   4,
}

// Practitioner pool filters.
export const ACCEPTING_STATUSES = ['yes', 'waitlist']
export const PRACTITIONER_MODES = ['practice', 'mixed']

// ─── Per-surface settings ────────────────────────────────────
export const SURFACES = {
  map_debrief: { maxPractitioners: 2 },
  mc_domain:   { maxPractitioners: 2 },
}

// ─── The journey card (always first — the spine) ─────────────
// Toward-language titles, per domain. Never "your X is low."
export const JOURNEY_CARD = {
  titles: {
    path:       'Build your Path',
    spark:      'Feed your Spark',
    body:       'Strengthen your Body',
    finances:   'Build your Finances',
    connection: 'Build your Connection',
    inner_game: 'Strengthen your Inner Game',
    signal:     'Clarify your Signal',
  },
  body:  'Your journey works this domain directly — The Map, your I Am statement, the daily practice.',
  cta:   'Continue your journey',
  route: '/nextu',
}

// ─── The Work with Nik card (designated founder slot) ────────
// Identical card format to any practitioner; distinguished ONLY
// by the disclosure label and position. The disclosure label is
// non-negotiable — it is the rule for any future placement tier.
//
// founderDomains: the domains the founder card appears in.
// Nik's coaching is whole-person — it begins with The Map across
// all seven domains — so the list ships with all seven. Trim here.
export const FOUNDER_CARD = {
  label:    'FROM THE FOUNDER',
  name:     'Work with Nik',
  tagline:  'One-on-one work for people who are ready to move — not just understand.',
  status:   'Accepting discovery calls',
  cta:      'View',
  route:    '/work-with-nik',
  founderDomains: [
    'path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal',
  ],
}

// ─── Rail framing copy (the partnership line) ────────────────
export const RAIL_COPY = {
  eyebrow: 'PATHWAYS',
  framing: 'Your journey continues here — and specialists serve this domain while you walk it.',
}

// ─── Priming explainer (first render, once, acknowledged) ────
// Users meet the spine-and-specialists principle before the first
// card ever shows, so the first practitioner card reads as "this
// is how NextU works," not as an ad.
export const PRIMING = {
  line1: 'NextU is your spine.',
  line2: 'Specialists walk alongside it.',
  action: 'GOT IT',
  storageKey: 'pathways_primed', // signed-out fallback only
}

// ─── Need computation ────────────────────────────────────────
// scores: { [domainKey]: { current, horizon } } — numbers or null.
// Returns { activeNeeds: [domainKey...], primaryNeed: domainKey|null }
export function computeNeeds(scores) {
  const activeNeeds = []
  let primaryNeed = null
  let largestGap = -Infinity

  for (const key of PERSONAL_DOMAIN_KEYS) {
    const s = scores?.[key]
    if (!s || s.current == null) continue
    const current = Number(s.current)
    const horizon = s.horizon == null ? null : Number(s.horizon)
    const gap = horizon == null ? 0 : horizon - current

    const isActive =
      current <= NEED_THRESHOLDS.scoreMax ||
      (horizon != null && gap >= NEED_THRESHOLDS.gapMin)

    if (isActive) {
      activeNeeds.push(key)
      if (gap > largestGap) { largestGap = gap; primaryNeed = key }
    }
  }

  // Among active needs, primary is the largest gap. If gaps tied or
  // absent (low score with no horizon), the first active need stands.
  if (!primaryNeed && activeNeeds.length) primaryNeed = activeNeeds[0]
  return { activeNeeds, primaryNeed }
}
