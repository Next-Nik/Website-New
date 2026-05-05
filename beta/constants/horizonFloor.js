// ─────────────────────────────────────────────────────────────────────────────
// src/beta/constants/horizonFloor.js
//
// The Horizon Goal and explainer paragraph for each of the seven civilisational
// domains. Source: NextUs Domain Structure v3.8 — domain entries' Horizon Goal
// and Explainer fields, locked April 2026.
//
// The Horizon Goal is the forward-only affirmative statement of flourishing.
// The Explainer does the floor work — names what the Horizon commits to,
// names the wound it heals, and names what the platform does not host.
//
// HorizonFloorCard, HorizonFloorAdmissionCheck, and any future surface that
// renders the floor consumes this file. Do not paraphrase. Do not duplicate
// inline.
// ─────────────────────────────────────────────────────────────────────────────

export const DOMAIN_SLUGS = [
  'human-being',
  'society',
  'nature',
  'technology',
  'finance-economy',
  'legacy',
  'vision',
]

export const HORIZON_FLOOR = {
  'human-being': {
    slug: 'human-being',
    label: 'Human Being',
    horizonGoal:
      'Every human held in dignity, met with care, supported in becoming most fully themselves.',
    explainer:
      'Human Being\u2019s Horizon is a future in which every person \u2014 across every body, every interior life, every relationship, every form of expression, every calling, every life condition \u2014 is met by their society and their world with the conditions for flourishing. It commits to care over punishment, to dignity as the floor every life rests on, and to plurality of healthy paths over standardised templates. The wound this Horizon heals is the long pattern of treating some humans as worth less than others on the basis of what they are or what they have lived through \u2014 a pattern that, examined honestly, is itself a symptom of unhealed collective trauma rather than a difference of opinion to be hosted plurally. The platform\u2019s stance: visions, actors, and rhetoric whose content is the dehumanisation of people on the basis of identity, the eroticisation or harm of children, or the celebration of violence against marginalised groups are incompatible with this Horizon and are not hosted here.',
  },

  'society': {
    slug: 'society',
    label: 'Society',
    horizonGoal:
      'A structure that gives everyone space to function and the possibility to thrive.',
    explainer:
      'Society\u2019s Horizon is a future in which the structures humans build together \u2014 governance, justice, education, health, kinship, community, public life, commons \u2014 give every person what they need to function and the conditions to thrive. Function here is not subsistence. It means a life with enough \u2014 enough material sufficiency, safety, dignity, rest, education, and belonging \u2014 to be more than alive in the bare sense. The neurological reality underneath this: chronic scarcity produces chronic stress, chronic stress produces threat-based cognition, and threat-based cognition produces the dominance hierarchies, in-group violence, and institutional cruelty that then pass themselves forward through the next generation\u2019s nervous systems. Invest in the substrate \u2014 genuine material and relational sufficiency for everyone \u2014 and you do not merely solve poverty. You change the conditions under which the next generation is raised, which changes attachment, which changes how empathy develops, which changes what humans do to each other and the world. The wound this Horizon heals is the long pattern of social structures that concentrate the conditions of flourishing in the hands of a few while leaving most to manage on depleted ground \u2014 and the parallel pattern of passing collective dysregulation forward through institutions instead of meeting it. The platform\u2019s stance: visions, actors, and rhetoric whose content is the systematic exclusion or domination of any group \u2014 racial, gendered, economic, religious, or otherwise \u2014 as legitimate civilisational organisation are incompatible with this Horizon and are not hosted here.',
  },

  'nature': {
    slug: 'nature',
    label: 'Nature',
    horizonGoal:
      'The living planet is thriving, and humanity lives as a regenerative participant in it \u2014 not separate from, not above, but of.',
    explainer:
      'Nature\u2019s Horizon is a future in which the elements of the living world \u2014 soil, air, water, plants and fungi, animals \u2014 are met by humans as kin, as ground, and as the source of life itself. It commits to ecological repair where damage has been done, to protection where life is still intact, and to relationships of reciprocity between human communities and the larger living systems that sustain them. The wound this Horizon heals is the long extractive arc that treated the planet as resource and the rest of life as obstacle. The platform\u2019s stance: visions, actors, and rhetoric whose content is the continued reduction of the living world to material to be used up are incompatible with this Horizon and are not hosted here.',
  },

  'technology': {
    slug: 'technology',
    label: 'Technology',
    horizonGoal:
      'Technology in service of life \u2014 human and planetary \u2014 designed to restore as it operates, accessible to those it affects, and honest about what it costs.',
    explainer:
      'Technology\u2019s Horizon is a future in which the materials, energy systems, computational tools, biotechnologies, and built environments humans create are oriented toward regeneration, dignity, and shared flourishing. It commits to technology that serves rather than exploits its users, that strengthens rather than depletes the living world, that distributes capability rather than concentrating control. The wound this Horizon heals is the long pattern of technological development that has externalised harm onto vulnerable people, ecosystems, and future generations \u2014 and the more recent pattern of technologies built to capture human attention, surveil populations, and concentrate power in narrow hands. The platform\u2019s stance: visions, actors, and rhetoric celebrating technology as domination \u2014 over users, over workers, over communities, over the living planet \u2014 are incompatible with this Horizon and are not hosted here.',
  },

  'finance-economy': {
    slug: 'finance-economy',
    label: 'Finance & Economy',
    horizonGoal:
      'An economy in which everyone has enough to act on what matters, contribution is freely chosen rather than coerced, and the living systems that make all exchange possible are counted, sustained, and restored.',
    explainer:
      'Finance & Economy\u2019s Horizon is a future in which the system of exchange \u2014 capital, currency, commerce, instruments, livelihoods, commons \u2014 serves the social Horizon directly. It commits to economic structures in which no person lacks what they need to function, in which capital flows toward what heals and regenerates, and in which value is measured by its contribution to shared life rather than by accumulation alone. The wound this Horizon heals is the long pattern of economic concentration that has produced planetary inequality on a scale unprecedented in human history, and the parallel pattern of measuring growth without accounting for what growth has cost. The platform\u2019s stance: visions, actors, and rhetoric that frame the concentration of planetary resources in the hands of a tiny minority as legitimate, or the resulting deprivation of the many as inevitable, deserved, or beyond intervention, are incompatible with this Horizon and are not hosted here.',
  },

  'legacy': {
    slug: 'legacy',
    label: 'Legacy',
    horizonGoal:
      'A civilisation that knows what it carries, tends what it transmits, repairs what it broke, and plants with love for people it will never meet.',
    explainer:
      'Legacy\u2019s Horizon is a future in which cultural transmission, ancestral knowledge, lineage, material heritage, and ecological inheritance are honoured and carried forward as gifts to those who come next. It commits to the protection of what has nearly been lost, the reclamation of what has been taken, and the long-arc accountability that thinks in generations rather than quarters. The wound this Horizon heals is the long pattern of cultural erasure, ecological theft, and intergenerational rupture \u2014 the ways colonisation, industrialisation, and concentrated power have actively destroyed lineages, languages, and living traditions. The platform\u2019s stance: visions, actors, and rhetoric that frame cultural erasure, ancestral theft, or the destruction of living traditions as progress are incompatible with this Horizon and are not hosted here.',
  },

  'vision': {
    slug: 'vision',
    label: 'Vision',
    horizonGoal:
      'Creating forward \u2014 as far as we can see \u2014 in service of the brightest future for all.',
    explainer:
      'Vision\u2019s Horizon is a future in which humanity\u2019s capacity for imagination, foresight, narrative, cosmology, and hope is alive and exercised \u2014 across cultures, across generations, across communities. It commits to plural futures rather than monocultural ones, to honesty about what is genuinely difficult, and to generativity as the orientation of vision. On purpose names that vision is active and chosen. Together names that the futures worth seeing toward are the ones imagined collectively rather than imposed. The wound this Horizon heals is the long pattern of visions of domination \u2014 of one people over others, of one kind of future over the rest, of certainty marketed as foresight \u2014 that have organised so much human suffering. The platform\u2019s stance: visions whose content is the supremacy of one group, the elimination of plurality, or the celebration of futures built on the deprivation of any are incompatible with this Horizon and are not hosted here.',
  },
}

export function getHorizonFloor(domainSlug) {
  return HORIZON_FLOOR[domainSlug] || null
}

export function isValidDomainSlug(slug) {
  return DOMAIN_SLUGS.includes(slug)
}

// The four allowed status values for horizon_floor_status anywhere it is used.
export const HORIZON_FLOOR_STATUSES = [
  'compatible',
  'flagged_for_review',
  'incompatible',
]

export function isValidHorizonFloorStatus(s) {
  return HORIZON_FLOOR_STATUSES.includes(s)
}
