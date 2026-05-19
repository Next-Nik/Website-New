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

// ── Planet label map ──────────────────────────────────────────
// Short descriptive label per score. Mirrors LABEL_MAP in horizonScale.js.
// Used by HorizonScaleModal (system="planet").

export const PLANET_LABEL_MAP = {
  1:  'Systemic Collapse',
  2:  'Acute Failure',
  3:  'Fragile and Failing',
  4:  'Struggling to Function',
  5:  'Mixed — The Inflection Point',
  6:  'Developing',
  7:  'Functional',
  8:  'Advancing',
  9:  'Thriving',
  10: 'The Horizon',
}

// ── Planet signature map ──────────────────────────────────────
// Full energetic description per score.
// Used by HorizonScaleModal (system="planet") on score detail.

export const PLANET_SIGNATURE_MAP = {
  1:  'Systemic collapse or near-collapse. Fundamental conditions for human or ecological life are absent or actively destroyed. Active regression.',
  2:  'Core systems failing. Acute and widespread harm ongoing. Structural supports have broken down. Urgent intervention required.',
  3:  'Significant dysfunction across the domain. Vulnerable to shocks. Partial systems exist but cannot absorb stress or generate improvement.',
  4:  'Below the threshold for sustainable function. Partial and inconsistent operation. The domain is consuming more than it generates.',
  5:  'The inflection point. Progress and regression coexist. Direction is genuinely uncertain. Everything above here tends to build. Everything below here tends to contract.',
  6:  'A positive trend has been established, though structural gaps remain significant. The direction is right; the distance is long.',
  7:  'Meeting baseline needs across most of the domain. Not yet generative — sustaining more than building. A stable platform for further development.',
  8:  'Genuine progress. Systems are strengthening and compounding. Positive outcomes visible across the domain.',
  9:  'Healthy, regenerative, and contributing to adjacent domains. This is what thriving looks like at civilisational scale.',
  10: 'The Horizon realised. The goal this domain exists to reach. The condition that makes everything else more possible.',
}

// ── Planet intro ──────────────────────────────────────────────
// Shown at the top of HorizonScaleModal when system="planet".

export const PLANET_INTRO = {
  eyebrow:  'NextUs · Planet Scale',
  title:    'The Planet Scale',
  subtitle: 'Civilisational calibration · 1–10',
  body: [
    'Each civilisational domain is scored against this scale. The scale has two zones separated by the inflection point at 5. Above it, a domain is building — compounding toward the Horizon. Below it, the domain is in contraction.',
    'Below 5 is not failure. It is where the work of restoration lives. Honest assessment is the beginning of honest action.',
  ],
  aboveLine: { label: 'Building',     note: 'above the inflection point — developing, advancing, thriving' },
  belowLine: { label: 'Contracting',  note: 'below the inflection point — fragile, struggling, failing' },
  footer:    'Any score below 5 means this domain is actively generating harm or dysfunction — consuming more than it produces. The map is not the verdict. It is the starting point.',
}
