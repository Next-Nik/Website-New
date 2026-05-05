// src/beta/constants/scales.js
//
// Module 0 constant. Eight-level geographic scale taxonomy + resolution
// layers. Locked per NextUs Beta Build Architecture v1.2, Section 4.
//
// Imported by BetaMap (and any future surface that needs scale labels).

export const SCALES = [
  { slug: 'local',          label: 'Local',           description: 'Neighbourhood, district, ward.' },
  { slug: 'municipal',      label: 'Municipal',       description: 'City, town, borough.' },
  { slug: 'state-province', label: 'State / Province', description: 'First-order subnational unit.' },
  { slug: 'national',       label: 'National',        description: 'Country.' },
  { slug: 'regional',       label: 'Regional',        description: 'Continental or hemispheric.' },
  { slug: 'international',  label: 'International',   description: 'Multi-nation alliances or treaties.' },
  { slug: 'global',         label: 'Global',          description: 'Planetary in scope.' },
  { slug: 'civilisational', label: 'Civilisational',  description: 'Concerns the human project as a whole.' },
]

// Convenience lookup: slug → label
export const SCALE_LABEL = Object.fromEntries(SCALES.map((s) => [s.slug, s.label]))

// Resolution layers — distinct from scale. An optional refinement of how an
// indicator or actor operates within a domain. Defined for Nature and Human
// Being; other domains pending field-level resolution definitions.
export const RESOLUTION_LAYERS = {
  nature: [
    { slug: 'local',     label: 'Local',     altLabel: 'Micro' },
    { slug: 'regional',  label: 'Regional',  altLabel: 'Meso'  },
    { slug: 'planetary', label: 'Planetary', altLabel: 'Macro' },
  ],
  'human-being': [
    { slug: 'individual',     label: 'Individual'     },
    { slug: 'interpersonal',  label: 'Interpersonal'  },
    { slug: 'civilisational', label: 'Civilisational' },
  ],
}
