// src/beta/constants/principles.js
// The four cross-domain platform-level principles.
// Canonical definitions. Do not paraphrase.

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

export const PRINCIPLE_BY_SLUG = Object.fromEntries(
  PLATFORM_PRINCIPLES.map(p => [p.slug, p])
)
