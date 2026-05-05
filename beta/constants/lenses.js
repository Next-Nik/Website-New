// src/beta/constants/lenses.js
//
// Module 0 constant. Lens sets per civilisational domain. Each domain has
// its own small lens set — stable, few. Locked per NextUs Beta Build
// Architecture v1.2, Section 4. "Indigenous & Relational" appears in every
// domain's set and also operates as a cross-domain principle (see
// principles.js).
//
// Imported by BetaMap, BetaDomain, BetaProfileEdit, BetaOrgManage, etc.
//
// Lenses are the architecture. Problems are the vocabulary. Lenses are
// stable; problems are emergent.

export const LENSES_PER_DOMAIN = {
  'human-being': [
    { slug: 'flourishing',                       label: 'Flourishing'                       },
    { slug: 'healing',                           label: 'Healing'                           },
    { slug: 'liberation-equality-dignity',       label: 'Liberation, Equality & Dignity'    },
    { slug: 'indigenous-relational-knowledge',   label: 'Indigenous & Relational Knowledge' },
  ],

  society: [
    { slug: 'belonging-inclusion',               label: 'Belonging & Inclusion'             },
    { slug: 'justice-accountability',            label: 'Justice & Accountability'          },
    { slug: 'solidarity-mutual-obligation',      label: 'Solidarity & Mutual Obligation'    },
    { slug: 'power-self-determination',          label: 'Power & Self-Determination'        },
    { slug: 'substrate-health',                  label: 'Substrate Health'                  },
    { slug: 'harm-reciprocity',                  label: 'Harm & Reciprocity'                },
    { slug: 'indigenous-relational',             label: 'Indigenous & Relational'           },
  ],

  nature: [
    { slug: 'climate',                           label: 'Climate'                           },
    { slug: 'pollution-waste',                   label: 'Pollution & Waste'                 },
    { slug: 'conservation-regeneration',         label: 'Conservation & Regeneration'       },
    { slug: 'human-use-stewardship',             label: 'Human Use & Stewardship'           },
    { slug: 'indigenous-relational-knowledge',   label: 'Indigenous & Relational Knowledge' },
  ],

  technology: [
    { slug: 'regeneration-vs-extraction',        label: 'Regeneration vs Extraction'        },
    { slug: 'access-sovereignty',                label: 'Access & Sovereignty'              },
    { slug: 'scale-unintended-consequence',      label: 'Scale & Unintended Consequence'    },
    { slug: 'alignment-ethics',                  label: 'Alignment & Ethics'                },
    { slug: 'labour-displacement',               label: 'Labour & Displacement'             },
    { slug: 'transition-accountability',         label: 'Transition & Accountability'       },
    { slug: 'indigenous-relational',             label: 'Indigenous & Relational'           },
  ],

  'finance-economy': [
    { slug: 'regenerative-vs-extractive',        label: 'Regenerative vs Extractive'        },
    { slug: 'distribution-justice',              label: 'Distribution & Justice'            },
    { slug: 'sovereignty-self-determination',    label: 'Sovereignty & Self-Determination'  },
    { slug: 'transparency-accountability',       label: 'Transparency & Accountability'     },
    { slug: 'counting-what-counts',              label: 'Counting What Counts'              },
    { slug: 'scale-concentration',               label: 'Scale & Concentration'             },
    { slug: 'indigenous-relational',             label: 'Indigenous & Relational'           },
  ],

  legacy: [
    { slug: 'deep-cultural-continuity',          label: 'Deep Cultural Continuity'          },
    { slug: 'when-exactly-was-that',             label: 'The "When Exactly Was That?" Test' },
    { slug: 'repair-reckoning',                  label: 'Repair & Reckoning'                },
    { slug: 'gift-aspiration',                   label: 'Gift & Aspiration'                 },
    { slug: 'indigenous-relational',             label: 'Indigenous & Relational'           },
    { slug: 'intentional-stewardship',           label: 'Intentional Stewardship'           },
    { slug: 'elder-wisdom',                      label: 'Elder Wisdom'                      },
    { slug: 'shadow-legacy',                     label: 'Shadow Legacy'                     },
  ],

  vision: [
    { slug: 'genuine-imagination',               label: 'Genuine Imagination'               },
    { slug: 'grounded-honesty',                  label: 'Grounded Honesty'                  },
    { slug: 'for-all',                           label: 'For All'                           },
    { slug: 'blank-slate-question',              label: 'The Blank Slate Question'          },
    { slug: 'commitment-vs-aspiration',          label: 'Commitment vs Aspiration'          },
    { slug: 'indigenous-relational',             label: 'Indigenous & Relational'           },
    { slug: 'living-bid',                        label: 'The Living Bid'                    },
  ],
}

// Convenience: get lens labels for a given domain slug. Returns [] if domain
// is not yet in the lens map.
export function getLensesForDomain(domainSlug) {
  return LENSES_PER_DOMAIN[domainSlug] || []
}
