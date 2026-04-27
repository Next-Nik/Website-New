// src/beta/constants/domains.js
// Canonical source of truth for all domain taxonomy.
// All modules import from here. Inline duplication is forbidden.

export const CIV_DOMAINS = [
  { slug: 'human-being',    label: 'Human Being',     color: '#5C7FA3', colorMuted: 'rgba(92,127,163,0.12)'  },
  { slug: 'society',        label: 'Society',          color: '#7A6B8A', colorMuted: 'rgba(122,107,138,0.12)' },
  { slug: 'nature',         label: 'Nature',           color: '#4A8C6F', colorMuted: 'rgba(74,140,111,0.12)'  },
  { slug: 'technology',     label: 'Technology',       color: '#5F8DAA', colorMuted: 'rgba(95,141,170,0.12)'  },
  { slug: 'finance-economy',label: 'Finance & Economy',color: '#8C7A3E', colorMuted: 'rgba(140,122,62,0.12)'  },
  { slug: 'legacy',         label: 'Legacy',           color: '#8A6952', colorMuted: 'rgba(138,105,82,0.12)'  },
  { slug: 'vision',         label: 'Vision',           color: '#6B5EA8', colorMuted: 'rgba(107,94,168,0.12)'  },
]

export const DOMAIN_COLORS = Object.fromEntries(
  CIV_DOMAINS.map(d => [d.slug, d.color])
)

export const DOMAIN_COLORS_MUTED = Object.fromEntries(
  CIV_DOMAINS.map(d => [d.slug, d.colorMuted])
)

export const DOMAIN_HORIZON_GOALS = {
  'human-being':    'Every human held in dignity, met with care, supported in becoming most fully themselves.',
  'society':        'A structure that gives everyone space to function and the possibility to thrive.',
  'nature':         'The living planet is thriving, and humanity lives as a regenerative participant in it — not separate from, not above, but of.',
  'technology':     'Technology in service of life — human and planetary — designed to restore as it operates, accessible to those it affects, and honest about what it costs.',
  'finance-economy':'An economy in which everyone has enough to act on what matters, contribution is freely chosen rather than coerced, and the living systems that make all exchange possible are counted, sustained, and restored.',
  'legacy':         'A civilisation that knows what it carries, tends what it transmits, repairs what it broke, and plants with love for people it will never meet.',
  'vision':         'Creating forward — as far as we can see — in service of the brightest future for all.',
}

export const SELF_DOMAINS = [
  { slug: 'path',       label: 'Path'       },
  { slug: 'spark',      label: 'Spark'      },
  { slug: 'body',       label: 'Body'       },
  { slug: 'finances',   label: 'Finances'   },
  { slug: 'connection', label: 'Connection' },
  { slug: 'inner-game', label: 'Inner Game' },
  { slug: 'signal',     label: 'Signal'     },
]

// Fractal Self <-> Atlas mapping
export const SELF_TO_ATLAS_MAP = {
  'path':       'vision',
  'spark':      'human-being',
  'body':       'nature',
  'finances':   'finance-economy',
  'connection': 'society',
  'inner-game': 'legacy',
  'signal':     'technology',
}

export const SUBDOMAINS = {
  'human-being': [
    { slug: 'hb-body',        label: 'Body'               },
    { slug: 'hb-expression',  label: 'Expression'         },
    { slug: 'hb-inner-life',  label: 'Inner Life'         },
    { slug: 'hb-connection',  label: 'Connection'         },
    { slug: 'hb-finances',    label: 'Finances'           },
    { slug: 'hb-path',        label: 'Path'               },
    { slug: 'hb-outer',       label: 'Outer Conditions'   },
  ],
  'society': [
    { slug: 'soc-family',     label: 'Family & Kinship'         },
    { slug: 'soc-community',  label: 'Community & Locality'     },
    { slug: 'soc-civil',      label: 'Civil Society'            },
    { slug: 'soc-governance', label: 'Governance & Institutions'},
    { slug: 'soc-commons',    label: 'Commons'                  },
    { slug: 'soc-public',     label: 'Public Sphere'            },
  ],
  'nature': [
    { slug: 'nat-earth',  label: 'Earth' },
    { slug: 'nat-air',    label: 'Air'   },
    { slug: 'nat-water',  label: 'Water' },
    { slug: 'nat-flora',  label: 'Flora' },
    { slug: 'nat-fauna',  label: 'Fauna' },
  ],
  'technology': [
    { slug: 'tech-materials',   label: 'Materials & Making'           },
    { slug: 'tech-energy',      label: 'Energy'                       },
    { slug: 'tech-information', label: 'Information & Computation'    },
    { slug: 'tech-biological',  label: 'Biological & Life Sciences'   },
    { slug: 'tech-mechanical',  label: 'Mechanical & Structural'      },
    { slug: 'tech-built',       label: 'Built Environment'            },
    { slug: 'tech-communication', label: 'Communication & Media'      },
    { slug: 'tech-regenerative', label: 'Regenerative Technologies'   },
  ],
  'finance-economy': [
    { slug: 'fe-capital',     label: 'Capital & Investment'          },
    { slug: 'fe-currency',    label: 'Currency & Exchange'           },
    { slug: 'fe-labour',      label: 'Labour & Livelihoods'          },
    { slug: 'fe-markets',     label: 'Markets & Commerce'            },
    { slug: 'fe-commons',     label: 'Commons & Alternative Economies'},
    { slug: 'fe-measurement', label: 'Measurement & Accounting'      },
    { slug: 'fe-ownership',   label: 'Ownership & Property'         },
  ],
  'legacy': [
    { slug: 'leg-memory',     label: 'Memory & History'              },
    { slug: 'leg-cultural',   label: 'Cultural Transmission'         },
    { slug: 'leg-lineage',    label: 'Lineage & Ancestry'            },
    { slug: 'leg-material',   label: 'Material & Built Heritage'     },
    { slug: 'leg-ecological', label: 'Ecological Legacy'             },
    { slug: 'leg-knowledge',  label: 'Knowledge & Wisdom Traditions' },
    { slug: 'leg-repair',     label: 'Repair & Reckoning'            },
    { slug: 'leg-gift',       label: 'Gift & Aspiration'             },
    { slug: 'leg-presence',   label: 'Presence & Testimony'          },
  ],
  'vision': [
    { slug: 'vis-imagination', label: 'Imagination & Possibility' },
    { slug: 'vis-cultural',    label: 'Cultural Creation'          },
    { slug: 'vis-intention',   label: 'Intention & Direction'      },
    { slug: 'vis-blank',       label: 'The Blank Slate Question'   },
    { slug: 'vis-ecological',  label: 'Ecological Vision'          },
    { slug: 'vis-emerging',    label: 'Emerging Knowledge'         },
    { slug: 'vis-design',      label: 'Design & Intention'         },
    { slug: 'vis-horizon',     label: 'Horizon & Commitment'       },
    { slug: 'vis-declaration', label: 'Declaration & Becoming'     },
  ],
}
