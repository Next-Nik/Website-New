// src/beta/constants/principles.js
//
// The four cross-domain platform-level principles. Canonical definitions —
// do not paraphrase. Sourced from NextUs Beta Build Architecture v1.2,
// Module 1.5 spec.
//
// Multiple naming conventions are exported because consumers across the
// beta tree have settled on different names. All point to the same data:
//
//   PLATFORM_PRINCIPLES   — the canonical array (primary export)
//   PRINCIPLES_ORDERED    — alias of PLATFORM_PRINCIPLES, "primary first"
//                            framing for UI surfaces (selectors, lists)
//   PRINCIPLES            — keyed lookup by slug. Used by hooks and
//                            renderers that traverse tagging rows.
//   PRINCIPLE_BY_SLUG     — alias of PRINCIPLES (older name, still in use)
//   PRINCIPLE_SLUGS       — array of slug strings, in canonical order
//   PRINCIPLE_WEIGHTS     — the three weight tiers, in display order
//
// Plus three helpers used by the hook layer:
//   isValidPrincipleSlug(slug)
//   isValidPrincipleWeight(weight)
//   sortTaggings(taggings) — sorts an array of tagging rows by weight rank
//                             then by principle sortOrder

export const PLATFORM_PRINCIPLES = [
  {
    slug: 'indigenous-relational',
    label: 'Indigenous & Relational',
    shortLabel: 'Indigenous & Relational',
    definition:
      'The corrective epistemology. The dominant frameworks that shaped modern civilisation have produced both extraordinary progress and profound damage. Indigenous and matriarchal knowledge traditions offer a corrective intelligence: relational, long-arc, stewardship-oriented, reciprocal. Asks of every domain: what would this look like if we were thinking in generations rather than quarters? Accountable to the living systems around us? Organised around reciprocity rather than extraction?',
    sortOrder: 1,
  },
  {
    slug: 'substrate-health',
    label: 'Substrate Health',
    shortLabel: 'Substrate Health',
    definition:
      'The apex depends on the ecosystem. The ecosystem does not depend on the apex. A field of only apex predators is a collapse in slow motion. Asks of every actor, structure, system: are you investing in or extracting from the substrate you depend on? A governance system that depletes its citizenry is ecologically stupid, not merely unjust. A corporation that hollows out its community is sawing the branch.',
    sortOrder: 2,
  },
  {
    slug: 'not-knowing-stance',
    label: 'The Not-Knowing Stance',
    shortLabel: 'Not-Knowing',
    definition:
      'Some of the most important questions the platform holds are genuinely unresolved. On these, the platform names what is currently supported by evidence, names what is genuinely uncertain, names the most serious actors engaging with the uncertainty honestly, and holds the Horizon without pretending to know the route where it does not.',
    sortOrder: 3,
  },
  {
    slug: 'legacy-temporal-dimension',
    label: 'Legacy as Temporal Dimension',
    shortLabel: 'Legacy as Time',
    definition:
      'The axis of time running through all seven domains. Every domain transmits something forward whether consciously or not. Asks of each: what are you carrying forward, what needs releasing, what needs repair, what are you planting? Shadow legacies run beneath every domain\'s surface. Intentional stewardship is possible in every domain.',
    sortOrder: 4,
  },
]

// Same array, friendlier name for UI surfaces that present an ordered list.
export const PRINCIPLES_ORDERED = PLATFORM_PRINCIPLES

// Slug → principle object. Two names because both are in active use.
export const PRINCIPLE_BY_SLUG = Object.fromEntries(
  PLATFORM_PRINCIPLES.map((p) => [p.slug, p])
)
export const PRINCIPLES = PRINCIPLE_BY_SLUG

// Just the slugs, in canonical order. Useful for iteration in renderers
// that don't need the full principle object up front.
export const PRINCIPLE_SLUGS = PLATFORM_PRINCIPLES.map((p) => p.slug)

// The three weight tiers a tagging can carry, in display order.
// Stored on principle_taggings.weight as a text column.
export const PRINCIPLE_WEIGHTS = ['primary', 'secondary', 'tertiary']

// ─── Validators ──────────────────────────────────────────────────────────────

export function isValidPrincipleSlug(slug) {
  return typeof slug === 'string' && slug in PRINCIPLE_BY_SLUG
}

export function isValidPrincipleWeight(weight) {
  return typeof weight === 'string' && PRINCIPLE_WEIGHTS.includes(weight)
}

// ─── sortTaggings ────────────────────────────────────────────────────────────
//
// Sorts an array of tagging rows for display.
//
// Each row is expected to have at least:
//   - weight: 'primary' | 'secondary' | 'tertiary'
//   - principle: { sortOrder, ... }   (the joined principle definition)
//
// Rows missing weight sort last. Rows missing principle.sortOrder sort
// last within their weight tier. The sort is stable on equal keys.

const WEIGHT_RANK = { primary: 0, secondary: 1, tertiary: 2 }

export function sortTaggings(taggings) {
  if (!Array.isArray(taggings)) return []
  return [...taggings].sort((a, b) => {
    const wa = WEIGHT_RANK[a?.weight] ?? 99
    const wb = WEIGHT_RANK[b?.weight] ?? 99
    if (wa !== wb) return wa - wb
    const sa = a?.principle?.sortOrder ?? 999
    const sb = b?.principle?.sortOrder ?? 999
    return sa - sb
  })
}
