// ─────────────────────────────────────────────────────────────
// sentenceCompletion.js — the eighteen-week program
//
// Built on Nathaniel Branden's sentence-completion method: a stem,
// completed fast, six-to-ten endings, no editing; the same block
// all week; a weekend reflection that closes it. NextUs supplies
// the content — Foundation is the ground, then the seven personal
// domains in Map order, then Integration.
//
// Each theme runs as two short weeks (three stems, then two) so a
// morning session stays light — two or three stems, never a wall.
// Advancement is by completion, not calendar. The "Week N" labels
// stay (the implied pacing does useful work) but a week stays
// current until the user chooses to move on.
//
// Domain keys match domainCopy.js / Journal.jsx exactly:
//   path · spark · body · finances · connection · inner_game · signal
// ─────────────────────────────────────────────────────────────

export const STANDARD_REFLECTION =
  'If any of what I wrote this week is true, it might be helpful if I…'

export const WEEKS = [
  {
    week: 1,
    domain: null,
    title: 'Foundation',
    gloss: 'The ground every domain stands on: honesty about where you are, and the version of you already living where you are headed.',
    stems: [
      'If I brought five percent more awareness to my life today…',
      'If I were more honest with myself about where I actually am…',
      'If I took five percent more responsibility for the life I’m living…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 2,
    domain: null,
    title: 'Foundation',
    gloss: 'The ground every domain stands on: honesty about where you are, and the version of you already living where you are headed.',
    stems: [
      'If I listened to the part of me that already knows…',
      'If I walked through today as the person I’m becoming…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 3,
    domain: 'path',
    title: 'Path',
    gloss: 'Your purpose. The work you’re here to do. Most people are on a trajectory. Not everyone is on a path.',
    stems: [
      'To live my Path fully would mean…',
      'If I brought five percent more devotion to my path today…',
      'If I trusted that I already know what I’m here to do…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 4,
    domain: 'path',
    title: 'Path',
    gloss: 'Your purpose. The work you’re here to do. Most people are on a trajectory. Not everyone is on a path.',
    stems: [
      'If I stopped waiting for permission to walk my path…',
      'If I lived today as someone on their path, not just on a trajectory…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 5,
    domain: 'spark',
    title: 'Spark',
    gloss: 'What lights you up. What fills your tank. The deep yes to life.',
    stems: [
      'What makes me feel most alive is…',
      'If I brought five percent more aliveness to today…',
      'If I am more honest about what truly fills my tank…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 6,
    domain: 'spark',
    title: 'Spark',
    gloss: 'What lights you up. What fills your tank. The deep yes to life.',
    stems: [
      'If I deny and disown what lights me up…',
      'If I treated my spark as a resource, not a luxury…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 7,
    domain: 'body',
    title: 'Body',
    gloss: 'The instrument everything else runs through. The one piece of equipment you can’t trade in.',
    stems: [
      'To honour my body fully would mean…',
      'If I brought five percent more care to my body today…',
      'If I listened to what my body is actually telling me…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 8,
    domain: 'body',
    title: 'Body',
    gloss: 'The instrument everything else runs through. The one piece of equipment you can’t trade in.',
    stems: [
      'If I deny and disown what my body needs…',
      'If I lived in this body as someone who intends to use it for forty more years…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 9,
    domain: 'finances',
    title: 'Finances',
    gloss: 'Money, and the power to move what matters to you forward. How much currency do your dreams hold?',
    stems: [
      'To me, financial power means…',
      'If I brought five percent more honesty to my relationship with money…',
      'If I had the agency to act on what truly matters to me…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 10,
    domain: 'finances',
    title: 'Finances',
    gloss: 'Money, and the power to move what matters to you forward. How much currency do your dreams hold?',
    stems: [
      'If I deny and disown my own power around money…',
      'If I treated money as energy in service of my path…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 11,
    domain: 'connection',
    title: 'Connection',
    gloss: 'The felt experience of being met. Not a count of people — the depth of the meeting.',
    stems: [
      'To be truly known would mean…',
      'If I brought five percent more presence to the people closest to me…',
      'If I let myself be met instead of managing how I’m seen…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 12,
    domain: 'connection',
    title: 'Connection',
    gloss: 'The felt experience of being met. Not a count of people — the depth of the meeting.',
    stems: [
      'If I deny and disown my need for connection…',
      'If I knew the people in my life as well as I want to be known…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 13,
    domain: 'inner_game',
    title: 'Inner Game',
    gloss: 'Your relationship with yourself. The story running in the back of your head — and whether it’s still true.',
    stems: [
      'The story I’m running about myself is…',
      'If I brought five percent more awareness to my inner voice today…',
      'If I am more accepting of myself, exactly as I am right now…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 14,
    domain: 'inner_game',
    title: 'Inner Game',
    gloss: 'Your relationship with yourself. The story running in the back of your head — and whether it’s still true.',
    stems: [
      'If I deny and disown the parts of me I’d rather not see…',
      'If I lived from self-trust instead of the old story…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 15,
    domain: 'signal',
    title: 'Signal',
    gloss: 'Your relationship with the world. Whether what the world sees actually matches what’s inside.',
    stems: [
      'What I’m broadcasting to the world right now is…',
      'If I brought five percent more intention to how I show up…',
      'If what the world saw actually matched what’s inside…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 16,
    domain: 'signal',
    title: 'Signal',
    gloss: 'Your relationship with the world. Whether what the world sees actually matches what’s inside.',
    stems: [
      'If I deny and disown how I want to be seen…',
      'If I presented myself the way my Horizon Self already does…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 17,
    domain: null,
    title: 'Integration',
    gloss: 'Everything you’ve written, settling into how you actually live.',
    stems: [
      'Across these weeks, I am becoming aware…',
      'If I let what I’ve written settle into how I live…',
      'The change I can already feel is…',
    ],
    reflection: STANDARD_REFLECTION,
  },
  {
    week: 18,
    domain: null,
    title: 'Integration',
    gloss: 'Everything you’ve written, settling into how you actually live.',
    stems: [
      'If I trust integration more than intensity…',
      'As everything I’m learning takes root, I am beginning to suspect…',
    ],
    reflection: 'If any of what I wrote across these weeks is true, the next thing I’m ready to live is…',
  },
]

export const TOTAL_WEEKS = WEEKS.length

// Domain order, for Map-linked fallback when no Map data is present.
export const DOMAIN_ORDER = [
  'path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal',
]

export const DOMAIN_LABEL = {
  path: 'Path',
  spark: 'Spark',
  body: 'Body',
  finances: 'Finances',
  connection: 'Connection',
  inner_game: 'Inner Game',
  signal: 'Signal',
}

export function weekByNumber(n) {
  return WEEKS.find(w => w.week === n) || WEEKS[0]
}

// Map mode enters a domain at its first week; Free mode reaches both.
export function weekByDomain(domainKey) {
  return WEEKS.find(w => w.domain === domainKey) || null
}

// The few rules that carry the whole practice. Shown as a quiet,
// collapsible reminder — never a wall of instruction.
export const PRACTICE_RULES = [
  'Go fast. First thoughts are the point.',
  'Don’t edit. An ending doesn’t have to be true or make sense.',
  'If you go blank, invent something and keep moving.',
  'Six to ten endings per stem. A few minutes, not a project.',
]
