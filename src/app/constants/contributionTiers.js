// src/beta/constants/contributionTiers.js
//
// Canonical contribution tier definitions. Mirrors sql/beta/07
// contribution_tiers_beta seed data. The label and description copy
// is CANONICAL — do not paraphrase. Imported here so client UI does
// not have to fetch the lookup table on first paint.
//
// When the seed evolves, both files change in the same commit.

export const CONTRIBUTION_TIERS = [
  {
    slug: 'micro',
    label: 'Micro',
    description: 'Takes seconds, costs nothing. Follow, signal alignment.',
    sortOrder: 1,
  },
  {
    slug: 'tiny',
    label: 'Tiny',
    description: 'Takes minutes, costs nothing. Amplify, comment thoughtfully, sign a petition.',
    sortOrder: 2,
  },
  {
    slug: 'small',
    label: 'Small',
    description: 'Takes an hour or two, may cost a little. Attend an event, read and respond, small recurring donation.',
    sortOrder: 3,
  },
  {
    slug: 'medium',
    label: 'Medium',
    description: 'Takes ongoing time or notable money. Volunteer regularly, bring a skill, sprint cycle for them.',
    sortOrder: 4,
  },
  {
    slug: 'large',
    label: 'Large',
    description: 'Significant resource commitment. Major donation, working group, fractional role.',
    sortOrder: 5,
  },
  {
    slug: 'xl',
    label: 'Extra Large',
    description: 'Strategic or structural. Board service, major gift, sustained partnership.',
    sortOrder: 6,
  },
  {
    slug: 'benefactor',
    label: 'Benefactor',
    description: 'Transformational. Multi-year strategic partnership, naming gift, capital contribution.',
    sortOrder: 7,
  },
]

export const TIER_LABEL_BY_SLUG = Object.fromEntries(
  CONTRIBUTION_TIERS.map(t => [t.slug, t.label]),
)

export function getTier(slug) {
  return CONTRIBUTION_TIERS.find(t => t.slug === slug) || null
}
