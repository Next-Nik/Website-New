// ─────────────────────────────────────────────────────────────────────────────
// src/beta/constants/principles.js
//
// The four cross-domain platform-level principles. Canonical definitions.
//
// This file mirrors sql/beta/015_seed_platform_principles.sql. When the
// definitions evolve, both files change in the same commit. Inline duplication
// of these strings anywhere else in the codebase is forbidden — import from
// here.
//
// Read: NextUs Beta Build v1.2 §2 and NextUs Domain Structure v3.8 cross-domain
// principles section.
// ─────────────────────────────────────────────────────────────────────────────

export const PRINCIPLE_SLUGS = [
  'indigenous-relational',
  'substrate-health',
  'not-knowing-stance',
  'legacy-temporal-dimension',
]

export const PRINCIPLE_WEIGHTS = ['primary', 'secondary', 'tertiary']

export const PRINCIPLES = {
  'indigenous-relational': {
    slug: 'indigenous-relational',
    label: 'Indigenous & Relational',
    shortLabel: 'Indigenous & Relational',
    sortOrder: 1,
    definition:
      'The corrective epistemology. The dominant frameworks that shaped modern civilisation have produced both extraordinary progress and profound damage. Indigenous and matriarchal knowledge traditions offer a corrective intelligence: relational, long-arc, stewardship-oriented, reciprocal. Asks of every domain: what would this look like if we were thinking in generations rather than quarters? Accountable to the living systems around us? Organised around reciprocity rather than extraction?',
  },
  'substrate-health': {
    slug: 'substrate-health',
    label: 'Substrate Health',
    shortLabel: 'Substrate Health',
    sortOrder: 2,
    definition:
      'The apex depends on the ecosystem. The ecosystem does not depend on the apex. A field of only apex predators is a collapse in slow motion. Asks of every actor, structure, system: are you investing in or extracting from the substrate you depend on? A governance system that depletes its citizenry is ecologically stupid, not merely unjust. A corporation that hollows out its community is sawing the branch.',
  },
  'not-knowing-stance': {
    slug: 'not-knowing-stance',
    label: 'The Not-Knowing Stance',
    shortLabel: 'Not-Knowing',
    sortOrder: 3,
    definition:
      'Some of the most important questions the platform holds are genuinely unresolved. On these, the platform names what is currently supported by evidence, names what is genuinely uncertain, names the most serious actors engaging with the uncertainty honestly, and holds the Horizon without pretending to know the route where it does not.',
  },
  'legacy-temporal-dimension': {
    slug: 'legacy-temporal-dimension',
    label: 'Legacy as Temporal Dimension',
    shortLabel: 'Legacy',
    sortOrder: 4,
    definition:
      'The axis of time running through all seven domains. Every domain transmits something forward whether consciously or not. Asks of each: what are you carrying forward, what needs releasing, what needs repair, what are you planting? Shadow legacies run beneath every domain\u2019s surface. Intentional stewardship is possible in every domain.',
  },
}

// Ordered list — for rendering, iterating, and admin UI.
export const PRINCIPLES_ORDERED = PRINCIPLE_SLUGS.map((s) => PRINCIPLES[s])

// Helpers — small, intention-revealing, one job each.

export function getPrinciple(slug) {
  return PRINCIPLES[slug] || null
}

export function isValidPrincipleSlug(slug) {
  return PRINCIPLE_SLUGS.includes(slug)
}

export function isValidPrincipleWeight(weight) {
  return PRINCIPLE_WEIGHTS.includes(weight)
}

// Sort an array of taggings ({principle_slug, weight}) into a stable display
// order: primary first, then secondary, then tertiary; within a weight tier,
// sorted by canonical principle order (Indigenous & Relational, Substrate
// Health, Not-Knowing, Legacy).
const WEIGHT_ORDER = { primary: 0, secondary: 1, tertiary: 2 }
export function sortTaggings(taggings = []) {
  return [...taggings].sort((a, b) => {
    const wa = WEIGHT_ORDER[a.weight] ?? 99
    const wb = WEIGHT_ORDER[b.weight] ?? 99
    if (wa !== wb) return wa - wb
    const sa = PRINCIPLES[a.principle_slug]?.sortOrder ?? 99
    const sb = PRINCIPLES[b.principle_slug]?.sortOrder ?? 99
    return sa - sb
  })
}
