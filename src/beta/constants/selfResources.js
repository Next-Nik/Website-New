// ─────────────────────────────────────────────────────────────
// selfResources.js
//
// The Layer A seed for the Resources Engine. Per-domain, per-band
// curated entries that surface in SelfDomainResources. Hand-vetted,
// stand-behind quality. The editorial floor every other source has
// to clear.
//
// SHAPE — locked. Step 3 will populate; step 4's web-search API
// will return the same shape. This contract is shared, not split.
//
//   {
//     id:           string         // stable id, kebab-case
//     type:         'book' | 'talk' | 'article' | 'practice' | 'tool'
//     title:        string
//     author:       string         // primary author or speaker
//     source:       string         // publisher, outlet, platform
//     url:          string         // canonical link out
//     year:         number | null  // publication year when known
//     domains:      string[]       // SELF_KEYS this resource applies to
//     scoreBands:   string[]       // 'crisis' | 'friction' | 'plateau' | 'capable' | 'fluent'
//     summary:      string         // 1-2 sentences. WE write this.
//     curatedBy:    string         // editorial reviewer id / name
//     addedAt:      string         // ISO date
//     sensitive:    boolean        // flips Layer B into restricted mode
//                                   // when this resource's topic is queried
//     sensitiveNotes?: string      // optional editorial note for sensitive entries
//   }
//
// Empty for now. Step 3 fills this with vetted entries.
// ─────────────────────────────────────────────────────────────

/** @type {Array<{
 *  id: string, type: 'book'|'talk'|'article'|'practice'|'tool',
 *  title: string, author: string, source: string, url: string,
 *  year: number|null, domains: string[], scoreBands: string[],
 *  summary: string, curatedBy: string, addedAt: string,
 *  sensitive: boolean, sensitiveNotes?: string
 * }>} */
export const SELF_RESOURCES = [

  // ─────────────────────────────────────────────────────────────
  // PATH — purpose, calling, vision, meaning, dharma, expression
  // ─────────────────────────────────────────────────────────────

  {
    id: 'path-mans-search-for-meaning',
    type: 'book',
    title: "Man's Search for Meaning",
    author: 'Viktor E. Frankl',
    source: 'Beacon Press',
    url: 'https://www.beacon.org/Mans-Search-for-Meaning-P224.aspx',
    year: 1946,
    domains: ['path', 'inner_game'],
    scoreBands: ['friction', 'plateau', 'capable', 'fluent'],
    summary: 'Frankl, a psychiatrist who survived four Nazi camps, argues that the will to meaning is the deepest human drive — and that meaning is found, not given. Foundational reading for anyone asking what their life is for.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'path-deep-work',
    type: 'book',
    title: 'Deep Work',
    author: 'Cal Newport',
    source: 'Grand Central Publishing',
    url: 'https://calnewport.com/books/deep-work/',
    year: 2016,
    domains: ['path', 'spark'],
    scoreBands: ['friction', 'plateau', 'capable'],
    summary: 'A research-backed case that the ability to focus without distraction on cognitively demanding work is becoming both rarer and more valuable. Practical protocols for getting Path-aligned work actually done.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'path-designing-your-life',
    type: 'book',
    title: 'Designing Your Life',
    author: 'Bill Burnett & Dave Evans',
    source: 'Knopf',
    url: 'https://designingyour.life/',
    year: 2016,
    domains: ['path'],
    scoreBands: ['crisis', 'friction', 'plateau'],
    summary: 'Two Stanford design professors apply design-thinking methods to the question of what to do with your life. Practical, prototype-based, useful when the path forward is genuinely unclear.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'path-on-purpose-ted',
    type: 'talk',
    title: 'How to Find Work You Love',
    author: 'Scott Dinsmore',
    source: 'TED',
    url: 'https://www.ted.com/talks/scott_dinsmore_how_to_find_work_you_love',
    year: 2012,
    domains: ['path', 'spark'],
    scoreBands: ['friction', 'plateau'],
    summary: 'A clear, grounded talk on the practice of identifying work that aligns with who you actually are — built around three questions worth sitting with.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },

  // ─────────────────────────────────────────────────────────────
  // SPARK — vitality, joy, passion, play, rest, flow, wonder
  // ─────────────────────────────────────────────────────────────

  {
    id: 'spark-flow-csikszentmihalyi',
    type: 'book',
    title: 'Flow: The Psychology of Optimal Experience',
    author: 'Mihaly Csikszentmihalyi',
    source: 'Harper Perennial',
    url: 'https://www.harpercollins.com/products/flow-mihaly-csikszentmihalyi',
    year: 1990,
    domains: ['spark', 'path'],
    scoreBands: ['plateau', 'capable', 'fluent'],
    summary: 'The foundational psychological account of flow states — what they are, when they happen, and how to structure your life so they happen more often. Decades of empirical research behind a readable book.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'spark-rest-pang',
    type: 'book',
    title: 'Rest: Why You Get More Done When You Work Less',
    author: 'Alex Soojung-Kim Pang',
    source: 'Basic Books',
    url: 'https://www.basicbooks.com/titles/alex-soojung-kim-pang/rest/9780465074884/',
    year: 2016,
    domains: ['spark', 'body'],
    scoreBands: ['friction', 'plateau', 'capable'],
    summary: 'A research-grounded argument that deliberate rest is not the absence of work but a structured practice that makes the work better. Evidence from athletes, scientists, and writers across decades.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'spark-greater-good-awe',
    type: 'article',
    title: 'Why Awe Is Such an Important Emotion',
    author: 'Dacher Keltner',
    source: 'Greater Good Magazine, UC Berkeley',
    url: 'https://greatergood.berkeley.edu/article/item/why_awe_is_such_an_important_emotion',
    year: 2023,
    domains: ['spark'],
    scoreBands: ['friction', 'plateau', 'capable', 'fluent'],
    summary: 'A leading emotion researcher summarises what the science shows about awe — how it changes the body, the mind, and the relationship to others. Practical and well-sourced.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },

  // ─────────────────────────────────────────────────────────────
  // BODY — movement, nutrition, sleep, nervous system, health
  // ─────────────────────────────────────────────────────────────

  {
    id: 'body-crisis-988',
    type: 'tool',
    title: '988 Suicide & Crisis Lifeline (US)',
    author: 'SAMHSA',
    source: 'US Department of Health and Human Services',
    url: 'https://988lifeline.org/',
    year: 2022,
    domains: ['body', 'inner_game', 'connection'],
    scoreBands: ['crisis'],
    summary: 'Free, confidential support for people in distress, 24/7. Call or text 988. If you are in crisis, this comes before any book.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: true,
    sensitiveNotes: 'Crisis-band pointer. Step 5 will add geography-aware variants for non-US users.',
  },
  {
    id: 'body-why-we-sleep',
    type: 'book',
    title: 'Why We Sleep',
    author: 'Matthew Walker',
    source: 'Scribner',
    url: 'https://www.simonandschuster.com/books/Why-We-Sleep/Matthew-Walker/9781501144325',
    year: 2017,
    domains: ['body', 'spark', 'inner_game'],
    scoreBands: ['friction', 'plateau', 'capable'],
    summary: 'A neuroscientist makes the empirical case that sleep is not optional. The single most leveraged change most people can make to their physical and cognitive health. Note: some specific claims in the book have been criticised; the central case for sleep is sound.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'body-atomic-habits',
    type: 'book',
    title: 'Atomic Habits',
    author: 'James Clear',
    source: 'Avery',
    url: 'https://jamesclear.com/atomic-habits',
    year: 2018,
    domains: ['body', 'spark', 'finances', 'inner_game'],
    scoreBands: ['friction', 'plateau'],
    summary: 'A practical, evidence-aware framework for building habits that stick — particularly useful for foundational health behaviours that need to become reliable rather than heroic.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'body-polyvagal-dana',
    type: 'book',
    title: 'Anchored: How to Befriend Your Nervous System',
    author: 'Deb Dana',
    source: 'Sounds True',
    url: 'https://www.soundstrue.com/products/anchored',
    year: 2021,
    domains: ['body', 'inner_game', 'connection'],
    scoreBands: ['friction', 'plateau', 'capable'],
    summary: 'A clinician-written introduction to nervous-system regulation through a polyvagal lens. Accessible, practical, grounded in clinical experience. For when "regulate your nervous system" needs to become something you can actually do.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'body-outlive-attia',
    type: 'book',
    title: 'Outlive: The Science and Art of Longevity',
    author: 'Peter Attia, MD',
    source: 'Harmony',
    url: 'https://peterattiamd.com/outlive/',
    year: 2023,
    domains: ['body'],
    scoreBands: ['capable', 'fluent'],
    summary: 'A physician-researcher\'s framework for thinking about lifespan and healthspan together. Heavy on evidence, biased toward action, useful for someone who has the basics handled and wants to think structurally about the next forty years.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },

  // ─────────────────────────────────────────────────────────────
  // FINANCES — sufficiency, autonomy, contribution
  // ─────────────────────────────────────────────────────────────

  {
    id: 'finances-psychology-of-money',
    type: 'book',
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    source: 'Harriman House',
    url: 'https://www.harriman-house.com/psychologyofmoney',
    year: 2020,
    domains: ['finances', 'inner_game'],
    scoreBands: ['friction', 'plateau', 'capable'],
    summary: 'Twenty short essays on how people actually behave with money — and why behaviour matters more than knowledge. The book that resets the question from "what should I invest in" to "what kind of relationship with money do I want to have."',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'finances-bogleheads-wiki',
    type: 'tool',
    title: 'Bogleheads Wiki',
    author: 'Bogleheads community',
    source: 'Bogleheads.org',
    url: 'https://www.bogleheads.org/wiki/Main_Page',
    year: null,
    domains: ['finances'],
    scoreBands: ['friction', 'plateau', 'capable'],
    summary: 'Community-maintained reference for evidence-based personal finance — low-cost index investing, tax efficiency, retirement planning. Free, ad-free, no products to sell. The closest thing to a neutral primer on the open web.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'finances-your-money-or-your-life',
    type: 'book',
    title: 'Your Money or Your Life',
    author: 'Vicki Robin & Joe Dominguez',
    source: 'Penguin Books',
    url: 'https://yourmoneyoryourlife.com/the-book/',
    year: 1992,
    domains: ['finances', 'path'],
    scoreBands: ['crisis', 'friction', 'plateau'],
    summary: 'The book that introduced "life energy" as the unit money is exchanged for. A complete program for reorienting the relationship with money around what you actually want your life to be. Updated for the present.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },

  // ─────────────────────────────────────────────────────────────
  // CONNECTION — partnership, family, community, belonging
  // ─────────────────────────────────────────────────────────────

  {
    id: 'connection-gottman-seven-principles',
    type: 'book',
    title: 'The Seven Principles for Making Marriage Work',
    author: 'John Gottman & Nan Silver',
    source: 'Harmony',
    url: 'https://www.gottman.com/product/the-seven-principles-for-making-marriage-work/',
    year: 1999,
    domains: ['connection'],
    scoreBands: ['friction', 'plateau', 'capable'],
    summary: 'Forty years of longitudinal research on what actually predicts whether long-term partnerships thrive or fail. Specific, evidence-based practices. Applicable beyond marriage to any committed partnership.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: true,
    sensitiveNotes: 'Touches partnership and intimate-relationship dynamics. Editorial note: Gottman\'s research is gender-inclusive in its findings; the book\'s framing leans heteronormative. Useful regardless; flagged so step 5 knows.',
  },
  {
    id: 'connection-loneliness-murthy',
    type: 'article',
    title: 'Our Epidemic of Loneliness and Isolation: Surgeon General\'s Advisory',
    author: 'Vivek H. Murthy, MD',
    source: 'US Surgeon General',
    url: 'https://www.hhs.gov/sites/default/files/surgeon-general-social-connection-advisory.pdf',
    year: 2023,
    domains: ['connection', 'body', 'inner_game'],
    scoreBands: ['crisis', 'friction', 'plateau', 'capable', 'fluent'],
    summary: 'The US Surgeon General\'s formal advisory on the public-health consequences of loneliness — mortality risk comparable to smoking, with concrete individual and structural recommendations. Free PDF.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'connection-attached-levine',
    type: 'book',
    title: 'Attached: The New Science of Adult Attachment',
    author: 'Amir Levine, MD & Rachel Heller',
    source: 'TarcherPerigee',
    url: 'https://www.penguinrandomhouse.com/books/304489/attached-by-amir-levine-and-rachel-heller/',
    year: 2010,
    domains: ['connection', 'inner_game'],
    scoreBands: ['friction', 'plateau', 'capable'],
    summary: 'A clinical adaptation of attachment theory for adult relationships. Particularly useful when patterns repeat across relationships and the question "why does this keep happening" is real.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: true,
    sensitiveNotes: 'Touches intimate-partnership dynamics and gendered patterns of relating.',
  },
  {
    id: 'connection-non-violent-communication',
    type: 'book',
    title: 'Nonviolent Communication: A Language of Life',
    author: 'Marshall B. Rosenberg',
    source: 'PuddleDancer Press',
    url: 'https://www.nonviolentcommunication.com/product/nvc/',
    year: 2003,
    domains: ['connection', 'signal'],
    scoreBands: ['friction', 'plateau', 'capable'],
    summary: 'A specific protocol for communicating across difference without escalating into blame. Used in mediation, partnerships, and cross-cultural contexts for decades. Distinct from "active listening" — has an actual structure.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },

  // ─────────────────────────────────────────────────────────────
  // INNER GAME — the relationship with the self
  // ─────────────────────────────────────────────────────────────

  {
    id: 'inner-body-keeps-the-score',
    type: 'book',
    title: 'The Body Keeps the Score',
    author: 'Bessel van der Kolk, MD',
    source: 'Penguin Books',
    url: 'https://www.besselvanderkolk.com/resources/the-body-keeps-the-score',
    year: 2014,
    domains: ['inner_game', 'body', 'connection'],
    scoreBands: ['crisis', 'friction', 'plateau', 'capable'],
    summary: 'A leading trauma researcher\'s synthesis of how trauma lives in the body and what actually helps. Long, dense, paradigm-shifting. The reference point for understanding why some patterns do not yield to talk alone.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: true,
    sensitiveNotes: 'Discusses trauma, abuse, and clinical material. Not for crisis-band reading without support; reference rather than entry point at that band.',
  },
  {
    id: 'inner-self-compassion-neff',
    type: 'tool',
    title: 'Self-Compassion Practices',
    author: 'Kristin Neff, PhD',
    source: 'Self-Compassion.org',
    url: 'https://self-compassion.org/category/exercises/',
    year: null,
    domains: ['inner_game'],
    scoreBands: ['crisis', 'friction', 'plateau', 'capable'],
    summary: 'Free guided audio practices and exercises from the researcher who built the empirical case for self-compassion as a measurable, learnable skill. Distinct from self-esteem; better-evidenced.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'inner-when-things-fall-apart',
    type: 'book',
    title: 'When Things Fall Apart',
    author: 'Pema Chödrön',
    source: 'Shambhala',
    url: 'https://www.shambhala.com/when-things-fall-apart-148.html',
    year: 1996,
    domains: ['inner_game'],
    scoreBands: ['crisis', 'friction', 'plateau'],
    summary: 'Buddhist teacher Pema Chödrön on how to be with the difficult parts of life without trying to escape them. Short chapters, practical, useful when nothing seems to be working.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'inner-letting-go-hawkins',
    type: 'book',
    title: 'Letting Go: The Pathway of Surrender',
    author: 'David R. Hawkins, MD, PhD',
    source: 'Hay House',
    url: 'https://www.hayhouse.com/letting-go-paperback',
    year: 2012,
    domains: ['inner_game', 'spark'],
    scoreBands: ['plateau', 'capable', 'fluent'],
    summary: 'A psychiatrist\'s practical method for working with difficult emotions by releasing rather than processing them. Editorial note: Hawkins\'s broader "scale of consciousness" claims are not empirically supported; the letting-go method itself is widely useful.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },

  // ─────────────────────────────────────────────────────────────
  // SIGNAL — the broadcast: voice, presence, what you put out
  // ─────────────────────────────────────────────────────────────

  {
    id: 'signal-on-writing-well',
    type: 'book',
    title: 'On Writing Well',
    author: 'William Zinsser',
    source: 'Harper Perennial',
    url: 'https://www.harpercollins.com/products/on-writing-well-30th-anniversary-edition-william-zinsser',
    year: 1976,
    domains: ['signal'],
    scoreBands: ['friction', 'plateau', 'capable'],
    summary: 'The reference book for clear, honest non-fiction prose. Forty-plus years of editions because the principles do not date. If your signal is text, this is the bar.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'signal-talk-like-ted',
    type: 'book',
    title: 'Talk Like TED',
    author: 'Carmine Gallo',
    source: 'St. Martin\'s Griffin',
    url: 'https://us.macmillan.com/books/9781250061539/talkliketed',
    year: 2014,
    domains: ['signal'],
    scoreBands: ['friction', 'plateau', 'capable'],
    summary: 'Reverse-engineered analysis of what makes the most-watched TED talks land — structure, story, delivery. Useful for anyone whose work involves speaking to a room.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'signal-vulnerability-brown',
    type: 'talk',
    title: 'The Power of Vulnerability',
    author: 'Brené Brown',
    source: 'TEDxHouston',
    url: 'https://www.ted.com/talks/brene_brown_the_power_of_vulnerability',
    year: 2010,
    domains: ['signal', 'connection', 'inner_game'],
    scoreBands: ['friction', 'plateau'],
    summary: 'Brown\'s foundational talk on the research finding that vulnerability — being seen as you actually are — is the precondition for the connection most people are trying to build. Twenty minutes, decade-old, still landing.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'spark-burnout-nagoski',
    type: 'book',
    title: 'Burnout: The Secret to Unlocking the Stress Cycle',
    author: 'Emily Nagoski, PhD & Amelia Nagoski, DMA',
    source: 'Ballantine Books',
    url: 'https://www.penguinrandomhouse.com/books/567884/burnout-by-emily-nagoski-phd-and-amelia-nagoski-dma/',
    year: 2019,
    domains: ['spark', 'body', 'inner_game'],
    scoreBands: ['crisis', 'friction', 'plateau'],
    summary: 'Twin authors — a health educator and a music professor — synthesise the research on chronic stress and provide specific protocols for completing the stress cycle. Particularly useful when the fire is out and "rest more" has not been working.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'spark-greater-good-action-tools',
    type: 'tool',
    title: 'Greater Good in Action',
    author: 'Greater Good Science Center',
    source: 'UC Berkeley',
    url: 'https://ggia.berkeley.edu/',
    year: null,
    domains: ['spark', 'inner_game', 'connection'],
    scoreBands: ['fluent', 'capable', 'plateau', 'friction'],
    summary: 'A free library of evidence-based practices for wellbeing, drawn from peer-reviewed research and tagged by what they target. Maintained by UC Berkeley\'s Greater Good Science Center. Useful at any band; particularly generative for someone already capable who wants new structured practices.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'signal-feeling-good-burns',
    type: 'book',
    title: 'Feeling Good',
    author: 'David D. Burns, MD',
    source: 'Harper',
    url: 'https://feelinggood.com/books/feeling-good-the-new-mood-therapy/',
    year: 1980,
    domains: ['signal', 'inner_game'],
    scoreBands: ['crisis', 'friction'],
    summary: 'A clinically validated workbook on cognitive distortions — the patterns of thinking that hold people silent and frozen. The crisis-band entry point for someone whose Signal is low because the inner critic has the microphone.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },
  {
    id: 'finances-die-with-zero',
    type: 'book',
    title: 'Die With Zero',
    author: 'Bill Perkins',
    source: 'Mariner Books',
    url: 'https://www.diewithzerobook.com/',
    year: 2020,
    domains: ['finances', 'path'],
    scoreBands: ['capable', 'fluent'],
    summary: 'A challenging argument that the goal of personal finance is not maximum accumulation but maximum life experience — with a framework for matching spending to the seasons of life. For someone who has the foundations handled and is asking what the money is for.',
    curatedBy: 'claude+nik v1',
    addedAt: '2026-05-09',
    sensitive: false,
  },

]

// Score bands — match the five tiers documented in the brief, mirroring
// the score colour bands already locked in the design system.
export const SCORE_BANDS = ['crisis', 'friction', 'plateau', 'capable', 'fluent']

// Resource types — the deliberate narrow set we ship with. Expand only
// when there is a clear need; do not let the type list sprawl.
export const RESOURCE_TYPES = ['book', 'talk', 'article', 'practice', 'tool']

// Map a numeric score (0..10) to a score band. Thresholds match the brief.
export function scoreToBand(n) {
  if (n == null || Number.isNaN(Number(n))) return null
  const v = Number(n)
  if (v <  3)   return 'crisis'
  if (v <  5)   return 'friction'
  if (v <  6.5) return 'plateau'
  if (v <  8)   return 'capable'
  return 'fluent'
}

// Filter entries for a (domain, band) pair. Returns curated entries that
// match the domain, and either match the band or are tagged for all bands.
// When band is null (user has not placed this domain), returns all
// domain-tagged entries — better to show something than nothing, with
// the panel making it clear no band-specific filtering happened.
export function getCuratedFor(domainId, band) {
  if (!domainId) return []
  return SELF_RESOURCES.filter(r => {
    if (!r.domains?.includes(domainId)) return false
    if (!band) return true
    if (!r.scoreBands?.length) return true   // no band tags = applies broadly
    return r.scoreBands.includes(band)
  })
}
