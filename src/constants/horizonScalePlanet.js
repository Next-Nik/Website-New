// horizonScalePlanet.js — Planet scale constants
// Locked May 2026. Do not modify without explicit instruction.
// Used by: NextUs Map: Planet, NextUsWheel (system="planet"), HorizonScaleModal (system="planet")

export const PLANET_DOMAINS = [
  {
    key: 'human_being',
    label: 'Human Being',
    tip: 'Everything pertaining to the individual.',
    description: 'Personal rights and needs. Development. Expression.',
    horizonGoal: 'Every person has access to the conditions that allow them to know themselves, develop fully, and contribute meaningfully to life on earth.',
    color: '#7B9E87',
  },
  {
    key: 'society',
    label: 'Society',
    tip: 'Everything pertaining to the collective.',
    description: 'Governance, structure, frameworks.',
    horizonGoal: 'Human communities are organised in ways that generate trust, belonging, and genuine collective agency.',
    color: '#8E7BB5',
  },
  {
    key: 'nature',
    label: 'Nature',
    tip: 'Ecosystem Earth.',
    description: 'Earth, air, water, flora, fauna, and everything else pertaining to life on Earth.',
    horizonGoal: 'The living systems of the planet are regenerating, and humanity is a net contributor to that regeneration.',
    color: '#5C8A5C',
  },
  {
    key: 'technology',
    label: 'Technology',
    tip: 'The tools we build for humanity and Earth.',
    description: 'Tools to aid and amplify humanity and life on Earth.',
    horizonGoal: 'Technology is designed and governed in service of human flourishing and planetary health.',
    color: '#5B8DB8',
  },
  {
    key: 'finance_economy',
    label: 'Finance & Economy',
    tip: 'Systems of exchange.',
    description: 'The management and exchange of resources.',
    horizonGoal: 'Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.',
    color: '#C8922A',
  },
  {
    key: 'legacy',
    label: 'Legacy',
    tip: 'The footprint of mankind.',
    description: "What we leave behind. Each generation's responsibility to the next seven.",
    horizonGoal: 'Each generation leaves the conditions for the next to flourish more fully than they did.',
    color: '#A07850',
  },
  {
    key: 'vision',
    label: 'Vision',
    tip: 'Where we are going.',
    description: 'A shared picture of where we are going — and the infrastructure to move toward it together.',
    horizonGoal: 'Humanity has a shared and evolving picture of where it is going, and the coordination infrastructure to move toward it together.',
    color: '#9E7B9E',
  },
]

// Score scale for Planet assessments
// 1–10 with qualitative anchors
export const PLANET_SCALE = [
  { score: 1,  label: 'Critical',       description: 'Systemic collapse or near-collapse. Active regression.' },
  { score: 2,  label: 'Severe',         description: 'Fundamental systems failing. Acute harm ongoing.' },
  { score: 3,  label: 'Fragile',        description: 'Significant dysfunction. Vulnerable to shocks.' },
  { score: 4,  label: 'Struggling',     description: 'Below threshold for sustainable function. Partial systems.' },
  { score: 5,  label: 'Mixed',          description: 'Progress and regression coexisting. Direction uncertain.' },
  { score: 6,  label: 'Developing',     description: 'Positive trend established. Structural gaps remain.' },
  { score: 7,  label: 'Functional',     description: 'Meeting baseline needs. Not yet generative.' },
  { score: 8,  label: 'Advancing',      description: 'Genuine progress. Systems strengthening.' },
  { score: 9,  label: 'Thriving',       description: 'Healthy and regenerative. Contributing to others.' },
  { score: 10, label: 'Horizon',        description: 'The goal realised. What we are building toward.' },
]

export const PLANET_SCALE_BY_SCORE = Object.fromEntries(
  PLANET_SCALE.map(s => [s.score, s])
)

// Colour by score band
export function getPlanetScoreColor(score) {
  if (score <= 2) return '#C0392B'
  if (score <= 4) return '#E67E22'
  if (score <= 6) return '#F1C40F'
  if (score <= 8) return '#7B9E87'
  return '#5C8A5C'
}

// For NextUsWheel — returns fill colour per domain at given score
export function getPlanetDomainColor(domainKey) {
  const domain = PLANET_DOMAINS.find(d => d.key === domainKey)
  return domain?.color ?? '#C8922A'
}

// ─────────────────────────────────────────────────────────────
// Modal compatibility exports
//
// HorizonScaleModal expects label/signature maps keyed by score
// (matching the self-scale shape). Derived from PLANET_SCALE so
// they stay in sync if PLANET_SCALE changes.
// ─────────────────────────────────────────────────────────────

export const PLANET_LABEL_MAP = Object.fromEntries(
  PLANET_SCALE.map(s => [s.score, s.label])
)

export const PLANET_SIGNATURE_MAP = Object.fromEntries(
  PLANET_SCALE.map(s => [s.score, s.description])
)

export const PLANET_INTRO = {
  eyebrow:  'Atlas',
  title:    'The Civilisational Horizon Scale',
  subtitle: 'Actor alignment · 1–10',
  body: [
    'Each Atlas actor is scored against this scale, expressing how their work aligns with the Horizon Goal for their domain. Above 5 means net positive — building toward the goal. Below 5 means net negative — actively working against it.',
    'The scale is honest about both directions. Pattern-instance entries (low scores) belong on the Atlas as much as exemplars, because the map must show the whole field.',
  ],
  aboveLine: { label: 'Building',     note: 'above 5 — net contribution toward the Horizon Goal' },
  belowLine: { label: 'Pattern',      note: 'below 5 — patterns of harm that the field needs to recognise' },
  footer:    'A low score is not a verdict on the actor. It is an honest reading of impact relative to the Horizon Goal of their domain.',
}
