// src/beta/constants/principles.js
//
// Canonical four cross-domain platform principles.
// Mirrors the platform_principles lookup table seeded in Module 1 / sql/beta/02.
// Voice is exact. Do not paraphrase.
//
// Every module that needs principles imports from here.
// PrincipleBadge, PrincipleStrip, OfferingPanel, BetaAdminConsole,
// BetaNominate, FilterPanel, and any future surface all consume this file.

export const PRINCIPLES_ORDERED = [
  {
    slug:      'indigenous-relational',
    label:     'Indigenous and Relational Knowing',
    shortLabel: 'Indigenous & Relational',
    sortOrder: 1,
    definition:
      'Honouring knowledge systems rooted in long relationship with place, community, and living systems. Recognising that ways of knowing developed through sustained presence carry validity that abstracted, extractive knowledge does not.',
  },
  {
    slug:      'substrate-health',
    label:     'Substrate Health',
    shortLabel: 'Substrate Health',
    sortOrder: 2,
    definition:
      'Every domain rests on a substrate. The ecosystem does not depend on the apex. Asks of every actor, structure, system: are you investing in or extracting from the substrate you depend on?',
  },
  {
    slug:      'not-knowing-stance',
    label:     'Not-Knowing Stance',
    shortLabel: 'Not-Knowing',
    sortOrder: 3,
    definition:
      'Holding positions lightly in proportion to the evidence available. Naming uncertainty rather than papering over it. Treating the living map as perpetually provisional. The foundation of honest signal.',
  },
  {
    slug:      'legacy-temporal-dimension',
    label:     'Legacy and Temporal Dimension',
    shortLabel: 'Legacy Temporal',
    sortOrder: 4,
    definition:
      'Every decision carries a temporal shadow. The platform operates with awareness of what is being handed forward, not only what is being accomplished now. Seven-generation thinking applied structurally, not only rhetorically.',
  },
]

export const PRINCIPLE_BY_SLUG = Object.fromEntries(
  PRINCIPLES_ORDERED.map(p => [p.slug, p]),
)

export const PRINCIPLE_WEIGHTS = ['primary', 'secondary', 'tertiary']

export function getPrinciple(slug) {
  return PRINCIPLE_BY_SLUG[slug] || null
}
