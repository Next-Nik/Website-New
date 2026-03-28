// NextUs Domain Explorer — Current State Data
// Version 1.0 · March 2026
// Illustrative data — produced by Decision Analytics when run against real domain data

export const CURRENT_STATE = {
  "human-being": {
    score: 5.4,
    narrative: "Significant progress in life expectancy and literacy over the past century, but the inner dimensions of human development — consciousness, meaning, psychological health — remain structurally under-resourced. Mental health reaches crisis levels globally while systems built to address it lag a generation behind what we know works.",
    gapSignal: false,
    gapReason: null,
    indicators: [
      { label: "Global literacy rate", value: "87%", trend: "up" },
      { label: "Mental health treatment gap", value: "75%", trend: "flat" },
      { label: "Life expectancy", value: "73 years", trend: "up" },
    ],
    actors: [
      { name: "Mind & Life Institute", scale: "global", type: "research_institution", winning: true },
      { name: "WHO Mental Health Action Plan", scale: "international", type: "government", winning: true },
      { name: "Luminos Fund", scale: "regional", type: "organisation", winning: true },
      { name: "Inner Development Goals", scale: "international", type: "organisation", winning: true },
      { name: "Porticus", scale: "international", type: "funder", winning: false },
    ],
    totalActors: 214,
    entryPoints: {
      Steward: "What conditions for human development are you tending and protecting?",
      Maker: "What does the thing you are building make possible for people?",
      Architect: "What structural conditions are preventing human beings from developing fully?",
      Connector: "Who in this domain needs to find each other but hasn't yet?",
      Guardian: "What conditions for human dignity are most at risk right now?",
      Explorer: "What frontier of human development are you venturing into?",
      Sage: "What knowledge about human potential is most urgently needed right now?",
      Mirror: "What truth about the human condition are you reflecting back to the world?",
      Exemplar: "What does human flourishing look like when you embody it fully?",
      default: "What dimension of human development do you work in?",
    },
  },

  "society": {
    score: 4.1,
    narrative: "Democratic institutions are under stress globally. Trust in government, media, and each other is at historic lows across most measured democracies. The social fabric that makes collective action possible is fraying — not broken, but under pressure that existing systems were not designed to hold.",
    gapSignal: true,
    gapReason: "Low score · Low actor density in governance innovation · Funding concentrated in incumbents",
    indicators: [
      { label: "Global democracy index", value: "5.29/10", trend: "down" },
      { label: "Institutional trust", value: "43%", trend: "down" },
      { label: "Civic participation", value: "Declining", trend: "down" },
    ],
    actors: [
      { name: "Involve", scale: "national", type: "organisation", winning: true },
      { name: "DemocracyNext", scale: "international", type: "organisation", winning: true },
      { name: "Participedia", scale: "global", type: "research_institution", winning: true },
      { name: "Nesta", scale: "national", type: "organisation", winning: true },
      { name: "Open Government Partnership", scale: "international", type: "government", winning: false },
    ],
    totalActors: 87,
    entryPoints: {
      Steward: "What social fabric are you tending so it doesn't fray further?",
      Maker: "What new social structure or institution are you building?",
      Architect: "What governance conditions need redesigning for communities to thrive?",
      Connector: "What communities need to be in dialogue but aren't?",
      Guardian: "What democratic norm or civil right is most urgently under threat?",
      Explorer: "What new model of collective life are you testing?",
      Sage: "What do we know about trust and belonging that isn't being applied?",
      Mirror: "What truth about social life are you holding up for communities to see?",
      Exemplar: "What does a thriving community look like when you are part of it?",
      default: "Where in the social fabric are you working?",
    },
  },

  "nature": {
    score: 3.8,
    narrative: "The trajectory is still negative but the rate is slowing. Renewable energy deployment is accelerating faster than most models predicted. Biodiversity loss continues at pace. The gap between what is needed and what is happening is large — but the number of actors in this field is growing faster than any other domain.",
    gapSignal: false,
    gapReason: null,
    indicators: [
      { label: "CO₂ concentration", value: "424 ppm", trend: "down" },
      { label: "Species at risk", value: "44,000+", trend: "down" },
      { label: "Renewable energy share", value: "30%", trend: "up" },
    ],
    actors: [
      { name: "Regen Network", scale: "global", type: "organisation", winning: true },
      { name: "La Paz Fish Cooperative", scale: "local", type: "community_group", winning: true },
      { name: "Terraformation", scale: "regional", type: "organisation", winning: true },
      { name: "Patagonia", scale: "international", type: "organisation", winning: true },
      { name: "Conservation International", scale: "global", type: "organisation", winning: false },
    ],
    totalActors: 431,
    entryPoints: {
      Steward: "What land, water, or living system are you in a long-term relationship of care with?",
      Maker: "What regenerative system or practice are you building?",
      Architect: "What structural conditions are allowing extraction to continue unchecked?",
      Connector: "Who needs to be matched — a funder, a practitioner, a community?",
      Guardian: "What living system is most urgently at risk in your territory?",
      Explorer: "What ecological frontier are you venturing into?",
      Sage: "What ecological knowledge is being lost that must be preserved?",
      Mirror: "What truth about our relationship with the living world are you showing people?",
      Exemplar: "What does right relationship with nature look like when you embody it?",
      default: "Which living system are you in relationship with?",
    },
  },

  "technology": {
    score: 6.2,
    narrative: "Technological capability is advancing faster than governance or wisdom. The tools exist. The capacity to use them well — individually, institutionally, collectively — lags significantly. AI is the sharpest expression of this gap: extraordinary capability arriving before the ethical and governance frameworks needed to hold it.",
    gapSignal: false,
    gapReason: null,
    indicators: [
      { label: "AI governance frameworks", value: "Emerging", trend: "up" },
      { label: "Digital access gap", value: "2.7B offline", trend: "flat" },
      { label: "Open source adoption", value: "Growing", trend: "up" },
    ],
    actors: [
      { name: "Centre for AI Safety", scale: "international", type: "research_institution", winning: true },
      { name: "Algorithmic Justice League", scale: "national", type: "organisation", winning: true },
      { name: "Digital Public Goods Alliance", scale: "global", type: "organisation", winning: true },
      { name: "Partnership on AI", scale: "global", type: "organisation", winning: true },
      { name: "OpenAI", scale: "global", type: "organisation", winning: false },
    ],
    totalActors: 156,
    entryPoints: {
      Steward: "What technological infrastructure are you maintaining so it remains healthy and accessible?",
      Maker: "What tool or system are you building that extends human wisdom?",
      Architect: "What governance or structural conditions need to exist before the next wave of technology arrives?",
      Connector: "Who needs access to technology that currently can't reach it?",
      Guardian: "What human capacity is at risk of being replaced rather than extended?",
      Explorer: "What technological frontier are you venturing into on behalf of everyone else?",
      Sage: "What do we know about technology and human flourishing that isn't being applied?",
      Mirror: "What truth about our relationship with technology are you holding up for people to see?",
      Exemplar: "What does healthy, wise use of technology look like when you embody it?",
      default: "What tool or system are you trying to make wiser?",
    },
  },

  "finance-economy": {
    score: 3.2,
    narrative: "The current economic system continues to reward extraction over regeneration, short-term returns over long-term stewardship, and growth over wellbeing. Care work — the labour that sustains life — remains largely invisible to GDP. The gap between where capital flows and where it needs to flow is the largest leverage point in the system.",
    gapSignal: true,
    gapReason: "Score below threshold · Care economy actors critically underrepresented · Patient capital structurally scarce",
    indicators: [
      { label: "Wealth concentration (top 1%)", value: "45%", trend: "down" },
      { label: "Care economy valuation", value: "Unmeasured", trend: "flat" },
      { label: "Impact investment AUM", value: "$1.2T", trend: "up" },
    ],
    actors: [
      { name: "Wellbeing Economy Alliance", scale: "international", type: "organisation", winning: true },
      { name: "Celo Foundation", scale: "global", type: "funder", winning: true },
      { name: "Gitcoin", scale: "global", type: "organisation", winning: true },
      { name: "Triodos Bank", scale: "national", type: "funder", winning: true },
      { name: "BlackRock", scale: "global", type: "funder", winning: false },
    ],
    totalActors: 63,
    entryPoints: {
      Steward: "What resource, commons, or economic system are you tending for the long term?",
      Maker: "What new economic structure or financial instrument are you building?",
      Architect: "What conditions need to change for resources to flow toward what sustains life?",
      Connector: "What project needs capital that can't find it? What funder needs better signal?",
      Guardian: "What commons or shared resource needs defending from extraction?",
      Explorer: "What new economic model are you testing at the edge?",
      Sage: "What do we know about regenerative economics that isn't yet mainstream?",
      Mirror: "What truth about value, care, and contribution are you making visible?",
      Exemplar: "What does right relationship with money and resources look like when you embody it?",
      default: "What flow of resources are you trying to redirect?",
    },
  },

  "legacy": {
    score: 4.7,
    narrative: "Intergenerational thinking is structurally absent from most political and economic systems. The rights of future generations have no institutional voice. Indigenous wisdom traditions — the longest-running experiments in intergenerational stewardship — are disappearing faster than they are being honoured.",
    gapSignal: true,
    gapReason: "Future generations have no institutional representation · Indigenous knowledge holders critically under-resourced · Low actor density",
    indicators: [
      { label: "Languages at risk", value: "3,000+", trend: "down" },
      { label: "Long-term governance bodies", value: "~12 globally", trend: "flat" },
      { label: "Intergenerational equity index", value: "Unmeasured", trend: "flat" },
    ],
    actors: [
      { name: "Future Generations Commissioner Wales", scale: "national", type: "government", winning: true },
      { name: "Long Now Foundation", scale: "international", type: "organisation", winning: true },
      { name: "Potawatomi Language Keepers", scale: "local", type: "indigenous_knowledge_holder", winning: true },
      { name: "Club of Rome", scale: "international", type: "research_institution", winning: true },
      { name: "World Economic Forum", scale: "global", type: "organisation", winning: false },
    ],
    totalActors: 41,
    entryPoints: {
      Steward: "What inheritance — cultural, ecological, institutional — are you tending so it reaches the next generation intact?",
      Maker: "What are you building that will outlast you?",
      Architect: "What structural conditions need to exist for intergenerational thinking to become normal?",
      Connector: "Who needs to be in conversation across generations that isn't?",
      Guardian: "What lineage of knowledge, culture, or relationship is at risk of being lost?",
      Explorer: "What long-arc territory are you venturing into that others haven't mapped yet?",
      Sage: "What wisdom from elders or ancestors needs to be carried forward?",
      Mirror: "What truth about time, continuity, and responsibility are you reflecting back?",
      Exemplar: "What does living with deep accountability to the seventh generation look like in practice?",
      default: "What are you trying to leave behind for the seventh generation?",
    },
  },

  "vision": {
    score: 2.9,
    narrative: "This is the most under-resourced domain and the one whose absence creates a ceiling for all others. Without a shared sense of direction, coordination is impossible — not because the will is absent but because the destination is invisible. This is the gap NextUs itself exists to close.",
    gapSignal: true,
    gapReason: "Lowest score across all domains · Coordination infrastructure essentially unmeasured · Critical leverage point for all other domains",
    indicators: [
      { label: "Shared civilisational goal", value: "None articulated", trend: "flat" },
      { label: "Cross-domain coordination platforms", value: "<10 globally", trend: "up" },
      { label: "Futures literacy", value: "Unmeasured", trend: "flat" },
    ],
    actors: [
      { name: "NextUs", scale: "global", type: "organisation", winning: true },
      { name: "Collective Intelligence Project", scale: "international", type: "organisation", winning: true },
      { name: "Institute for the Future", scale: "international", type: "research_institution", winning: true },
      { name: "Perspectiva", scale: "national", type: "organisation", winning: true },
      { name: "World Future Council", scale: "international", type: "organisation", winning: false },
    ],
    totalActors: 28,
    entryPoints: {
      Steward: "What shared vision or sense of direction are you tending so it doesn't collapse?",
      Maker: "What coordination infrastructure or futures framework are you building?",
      Architect: "What conditions need to exist for humanity to develop a shared sense of direction?",
      Connector: "Who needs to see the same horizon but currently can't find each other?",
      Guardian: "What collective capacity for foresight or long-range thinking is at risk?",
      Explorer: "What possible future are you scouting that others haven't seen yet?",
      Sage: "What futures thinking or civilisational wisdom is most urgently needed right now?",
      Mirror: "What vision of what's possible are you holding up for the world to see?",
      Exemplar: "What does a life oriented toward a worthwhile collective future look like when you live it?",
      default: "How are you helping humanity see where it is going?",
    },
  },
};

// Archetype definitions — for matching entry points
export const ARCHETYPES = [
  "Steward",
  "Maker",
  "Architect",
  "Connector",
  "Guardian",
  "Explorer",
  "Sage",
  "Mirror",
  "Exemplar",
];

// Scale labels for display
export const SCALE_LABELS = {
  local: "Local",
  municipal: "Municipal",
  regional: "Regional",
  national: "National",
  international: "International",
  global: "Global",
};

// Domain key to id mapping
export const DOMAIN_KEY_MAP = {
  "human-being": 0,
  "society": 1,
  "nature": 2,
  "technology": 3,
  "finance-economy": 4,
  "legacy": 5,
  "vision": 6,
};
