// src/beta/constants/domains.js
//
// Module 9 addition to the beta constants layer.
// Exports canonical domain and subdomain constants consumed by
// BetaAdminConsole, BetaNominate, and any subsequent module that
// needs the locked taxonomy.
//
// CIV_DOMAINS is the canonical seven-entry list. Every module imports
// from here. Inline duplication is forbidden.
//
// SUBDOMAIN_MAP_BETA augments the original SUBDOMAIN_MAP with the v3.8
// Nature revision (five canonical elements). Other domains carry the v2
// placeholder structure until their v3 review is complete. Entries
// flagged subdomain_pending_v3_review should be treated as provisional.
//
// When the canon evolves, it evolves here. Modules pick up the change
// automatically on next build.

// ── Seven civilisational domains ─────────────────────────────

export const CIV_DOMAINS = [
  {
    slug:        'human-being',
    label:       'Human Being',
    shortLabel:  'Human',
    color:       '#2A6B9E',
    horizonGoal: 'Every human held in dignity, met with care, supported in becoming most fully themselves.',
  },
  {
    slug:        'society',
    label:       'Society',
    shortLabel:  'Society',
    color:       '#6B2A9E',
    horizonGoal: 'A structure that gives everyone space to function and the possibility to thrive.',
  },
  {
    slug:        'nature',
    label:       'Nature',
    shortLabel:  'Nature',
    color:       '#2A6B3A',
    horizonGoal: 'The living planet is thriving, and humanity lives as a regenerative participant in it.',
  },
  {
    slug:        'technology',
    label:       'Technology',
    shortLabel:  'Tech',
    color:       '#8A6B2A',
    horizonGoal: 'Technology in service of life, human and planetary, designed to restore as it operates.',
  },
  {
    slug:        'finance-economy',
    label:       'Finance & Economy',
    shortLabel:  'Finance',
    color:       '#6B3A2A',
    horizonGoal: 'An economy in which everyone has enough to act on what matters.',
  },
  {
    slug:        'legacy',
    label:       'Legacy',
    shortLabel:  'Legacy',
    color:       '#4A6B2A',
    horizonGoal: 'A civilisation that knows what it carries, tends what it transmits, repairs what it broke.',
  },
  {
    slug:        'vision',
    label:       'Vision',
    shortLabel:  'Vision',
    color:       '#2A4A6B',
    horizonGoal: 'Creating forward, as far as we can see, in service of the brightest future for all.',
  },
]

export const CIV_DOMAIN_BY_SLUG = Object.fromEntries(
  CIV_DOMAINS.map(d => [d.slug, d]),
)

export const CIV_DOMAIN_COLOR = Object.fromEntries(
  CIV_DOMAINS.map(d => [d.slug, d.color]),
)

// ── Seven Self domains ────────────────────────────────────────

export const SELF_DOMAINS = [
  { slug: 'body',        label: 'Body',       atlasCounterpart: 'nature',          color: '#2A6B3A' },
  { slug: 'connection',  label: 'Connection', atlasCounterpart: 'society',         color: '#6B2A9E' },
  { slug: 'signal',      label: 'Signal',     atlasCounterpart: 'technology',      color: '#8A6B2A' },
  { slug: 'finances',    label: 'Finances',   atlasCounterpart: 'finance-economy', color: '#6B3A2A' },
  { slug: 'inner-game',  label: 'Inner Game', atlasCounterpart: 'legacy',          color: '#4A6B2A' },
  { slug: 'path',        label: 'Path',       atlasCounterpart: 'vision',          color: '#2A4A6B' },
  { slug: 'spark',       label: 'Spark',      atlasCounterpart: 'human-being',     color: '#2A6B9E' },
]

// Fractal mapping: Self domain slug -> Atlas (civ) domain slug
export const SELF_TO_ATLAS_MAP = Object.fromEntries(
  SELF_DOMAINS.map(d => [d.slug, d.atlasCounterpart]),
)

// ── Subdomains — v3.8 canonical where complete ────────────────
// Nature subdomains are locked at v3.8 (five elements).
// All other domains carry v2 placeholder structure with
// subdomain_pending_v3_review flag.

export const SUBDOMAIN_MAP_BETA = {
  // ── Nature (v3.8 canonical) ─────────────────────────────────
  'nature': {
    v3_locked: true,
    subdomains: [
      {
        slug:  'nat-earth',
        label: 'Earth',
        fields: [
          'Soil & Living Ground',
          'Geology & Mineral Systems',
          'Land Use & Stewardship',
          'Landscape & Terrain',
        ],
        lenses: [
          'Climate',
          'Pollution & Waste',
          'Conservation & Regeneration',
          'Human Use & Stewardship',
          'Indigenous & Relational Knowledge',
        ],
      },
      {
        slug:  'nat-air',
        label: 'Air',
        fields: [
          'Atmosphere & Climate Systems',
          'Air Quality',
          'Airborne Ecosystems',
        ],
        lenses: [
          'Climate',
          'Pollution & Waste',
          'Conservation & Regeneration',
          'Human Use & Stewardship',
          'Indigenous & Relational Knowledge',
        ],
      },
      {
        slug:  'nat-water',
        label: 'Water',
        fields: [
          'Freshwater Systems',
          'Saltwater & Ocean Systems',
          'Ice & Cryosphere',
          'Wetlands & Transitional Waters',
        ],
        lenses: [
          'Climate',
          'Pollution & Waste',
          'Conservation & Regeneration',
          'Human Use & Stewardship',
          'Indigenous & Relational Knowledge',
        ],
      },
      {
        slug:  'nat-flora',
        label: 'Flora',
        fields: [
          'Forest & Woodland Systems',
          'Grassland & Savanna',
          'Aquatic & Wetland Flora',
          'Agricultural & Cultivated Flora',
          'Relational & Systemic Flora',
        ],
        lenses: [
          'Climate',
          'Pollution & Waste',
          'Conservation & Regeneration',
          'Human Use & Stewardship',
          'Indigenous & Relational Knowledge',
        ],
      },
      {
        slug:  'nat-fauna',
        label: 'Fauna',
        fields: [
          'Terrestrial Animals',
          'Marine & Freshwater Animals',
          'Birds & Migratory Species',
          'Insects & Invertebrates',
          'Keystone & Indicator Species',
        ],
        lenses: [
          'Climate',
          'Pollution & Waste',
          'Conservation & Regeneration',
          'Human Use & Stewardship',
          'Indigenous & Relational Knowledge',
        ],
      },
    ],
  },

  // ── Remaining domains (v2 placeholder, pending v3 review) ───
  // subdomain_pending_v3_review: true signals these are provisional.

  'human-being': {
    v3_locked: false,
    subdomain_pending_v3_review: true,
    subdomains: [
      { slug: 'hb-body',        label: 'Body' },
      { slug: 'hb-expression',  label: 'Expression' },
      { slug: 'hb-inner-life',  label: 'Inner Life' },
      { slug: 'hb-connection',  label: 'Connection' },
      { slug: 'hb-finances',    label: 'Finances' },
      { slug: 'hb-path',        label: 'Path' },
      { slug: 'hb-conditions',  label: 'Outer Conditions' },
    ],
  },

  'society': {
    v3_locked: false,
    subdomain_pending_v3_review: true,
    subdomains: [
      { slug: 'soc-family',      label: 'Family & Kinship' },
      { slug: 'soc-community',   label: 'Community & Locality' },
      { slug: 'soc-civil',       label: 'Civil Society' },
      { slug: 'soc-governance',  label: 'Governance & Institutions' },
      { slug: 'soc-commons',     label: 'Commons' },
      { slug: 'soc-public',      label: 'Public Sphere' },
    ],
  },

  'technology': {
    v3_locked: false,
    subdomain_pending_v3_review: true,
    subdomains: [
      { slug: 'tech-materials',    label: 'Materials & Making' },
      { slug: 'tech-energy',       label: 'Energy' },
      { slug: 'tech-info',         label: 'Information & Computation' },
      { slug: 'tech-bio',          label: 'Biological & Life Sciences' },
      { slug: 'tech-mechanical',   label: 'Mechanical & Structural' },
      { slug: 'tech-built',        label: 'Built Environment' },
      { slug: 'tech-comms',        label: 'Communication & Media' },
      { slug: 'tech-regen',        label: 'Regenerative Technologies' },
    ],
  },

  'finance-economy': {
    v3_locked: false,
    subdomain_pending_v3_review: true,
    subdomains: [
      { slug: 'fe-capital',      label: 'Capital & Investment' },
      { slug: 'fe-currency',     label: 'Currency & Exchange' },
      { slug: 'fe-labour',       label: 'Labour & Livelihoods' },
      { slug: 'fe-markets',      label: 'Markets & Commerce' },
      { slug: 'fe-commons',      label: 'Commons & Alternative Economies' },
      { slug: 'fe-measurement',  label: 'Measurement & Accounting' },
      { slug: 'fe-ownership',    label: 'Ownership & Property' },
    ],
  },

  'legacy': {
    v3_locked: false,
    subdomain_pending_v3_review: true,
    subdomains: [
      { slug: 'leg-memory',          label: 'Memory & History' },
      { slug: 'leg-cultural-trans',  label: 'Cultural Transmission' },
      { slug: 'leg-lineage',         label: 'Lineage & Ancestry' },
      { slug: 'leg-material',        label: 'Material & Built Heritage' },
      { slug: 'leg-ecological',      label: 'Ecological Legacy' },
      { slug: 'leg-knowledge',       label: 'Knowledge & Wisdom Traditions' },
      { slug: 'leg-repair',          label: 'Repair & Reckoning' },
      { slug: 'leg-gift',            label: 'Gift & Aspiration' },
      { slug: 'leg-presence',        label: 'Presence & Testimony' },
    ],
  },

  'vision': {
    v3_locked: false,
    subdomain_pending_v3_review: true,
    subdomains: [
      { slug: 'vis-imagination',  label: 'Imagination & Possibility' },
      { slug: 'vis-cultural',     label: 'Cultural Creation' },
      { slug: 'vis-intention',    label: 'Intention & Direction' },
      { slug: 'vis-blank-slate',  label: 'The Blank Slate Question' },
      { slug: 'vis-ecological',   label: 'Ecological Vision' },
      { slug: 'vis-knowledge',    label: 'Emerging Knowledge' },
      { slug: 'vis-design',       label: 'Design & Intention' },
      { slug: 'vis-horizon',      label: 'Horizon & Commitment' },
      { slug: 'vis-declaration',  label: 'Declaration & Becoming' },
    ],
  },
}

// ── Eight-level scale ─────────────────────────────────────────

export const SCALES = [
  { value: 'local',         label: 'Local' },
  { value: 'municipal',     label: 'Municipal' },
  { value: 'regional',      label: 'Regional' },
  { value: 'national',      label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global',        label: 'Global' },
]

// ── Resolution layers ─────────────────────────────────────────

export const RESOLUTION_LAYERS = [
  { value: 'local',      label: 'Local' },
  { value: 'regional',   label: 'Regional' },
  { value: 'planetary',  label: 'Planetary' },
]

// ── Lenses (Nature pilot; other domains pending v3 review) ────

export const LENSES_PER_DOMAIN = {
  'nature': [
    'Climate',
    'Pollution & Waste',
    'Conservation & Regeneration',
    'Human Use & Stewardship',
    'Indigenous & Relational Knowledge',
  ],
  // Other domains: pending v3 subdomain review before lenses are locked.
}

// ── Helper: get flat subdomains array for a domain slug ───────
// Returns { slug, label }[] for use in Select components.

export function getSubdomains(domainSlug) {
  const entry = SUBDOMAIN_MAP_BETA[domainSlug]
  if (!entry) return []
  return entry.subdomains.map(s => ({ slug: s.slug, label: s.label }))
}

// ── Helper: get lenses for a domain slug ─────────────────────

export function getLenses(domainSlug) {
  return (LENSES_PER_DOMAIN[domainSlug] || []).map(l => ({ value: l, label: l }))
}
