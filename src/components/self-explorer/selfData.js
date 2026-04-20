// ─────────────────────────────────────────────────────────────
// NEXTUS SELF EXPLORER — Domain Data
// Seven personal domains. Each maps to a civilisational domain.
// Horizon goals are personal-scale versions of the fractal.
// Sub-domains are approaches, stages, and practice areas —
// not sub-topics. They are entry points within the domain.
// ─────────────────────────────────────────────────────────────

export const SELF_TOP_GOAL =
  "A life fully expressed — where who you are and how you live are the same thing."

export const FRACTAL_MAP = {
  path:       { civilisational: 'Vision',            label: 'Path → Vision' },
  spark:      { civilisational: 'Human Being',       label: 'Spark → Human Being' },
  body:       { civilisational: 'Nature',            label: 'Body → Nature' },
  finances:   { civilisational: 'Finance & Economy', label: 'Finances → Finance & Economy' },
  connection: { civilisational: 'Society',           label: 'Connection → Society' },
  inner_game: { civilisational: 'Legacy',            label: 'Inner Game → Legacy' },
  signal:     { civilisational: 'Technology',        label: 'Signal → Technology' },
}

function approach(id, name, horizonGoal, description) {
  return { id, name, horizonGoal, description, subDomains: [] }
}

export const SELF_DOMAINS = [
  {
    id: 'path',
    name: 'Path',
    aliases: "Life's Mission · Purpose · Dharma · Soul Alignment",
    horizonGoal: "I am walking the path I was built for — and I know it.",
    description: "The work you were built to do. Not your job title — your gift. The contribution that runs beneath whatever you do for income. When Path is aligned, everything has direction. When it isn't, even success feels hollow.",
    lifeMission: "Am I walking my path — or just walking?",
    civilisational: 'Vision',
    subDomains: [
      approach('path-purpose',    'Purpose',    'I know what I am here to do and I am doing it.',          'The core question: what did life ask you to bring? Not what you chose — what chose you.'),
      approach('path-calling',    'Calling',    'The work calls me and I answer.',                         'The felt sense of being drawn toward something. Distinct from preference — deeper than interest.'),
      approach('path-vision',     'Vision',     'I can see clearly where I am going.',                     'The picture of where you are headed. Not a goal — an orientation point on the horizon.'),
      approach('path-meaning',    'Meaning',    'My life makes sense to me.',                              'The framework that makes experience coherent. Without meaning, even good things feel empty.'),
      approach('path-legacy',     'Legacy',     'I am building something that will outlast me.',           'What remains. The question of what your life is in service of beyond itself.'),
      approach('path-dharma',     'Dharma',     'I am living in accordance with my deepest nature.',       'The Sanskrit concept of righteous path — the way of being that is most fully yourself.'),
      approach('path-expression', 'Expression', 'What is in me is finding its way out into the world.',   'The act of bringing inner reality into outer form. The gap between who you are and what you produce.'),
    ],
  },
  {
    id: 'spark',
    name: 'Spark',
    aliases: "Vitality · Energy · Recharge · Joy · Passion",
    horizonGoal: "I am genuinely alive in my daily life — not just functioning.",
    description: "Is the fire on? The things that make you feel genuinely alive — not productive, alive. When Spark is high, difficulty is energising. When Spark is low, even easy things are a drain. Everything runs on this.",
    lifeMission: "When did I last feel genuinely alive — and what's been costing me that?",
    civilisational: 'Human Being',
    subDomains: [
      approach('spark-vitality',  'Vitality',   'I have the energy my life requires — and more.',          'Physical and energetic aliveness. The difference between getting through the day and moving through it.'),
      approach('spark-joy',       'Joy',        'Joy is a regular feature of my life, not a special occasion.', 'Not happiness — joy. The deep, unearned sense of rightness. Often found in small things.'),
      approach('spark-passion',   'Passion',    'I know what I am passionate about and I make room for it.','The things that light you up. Distinct from obligation — this is what you would do anyway.'),
      approach('spark-play',      'Play',       'Play is a serious part of how I live.',                   'The mode of engagement that is free from outcome. Underrated, structurally important.'),
      approach('spark-rest',      'Rest',       'I know how to restore myself — and I do.',                'The active practice of recovery. Not collapse — intentional restoration.'),
      approach('spark-flow',      'Flow',       'I regularly experience states of full absorption.',       'The psychological state of complete engagement. Where time disappears and performance peaks.'),
      approach('spark-wonder',    'Wonder',     'I remain genuinely curious about life.',                  'The capacity to be astonished. The antidote to the numbness that accumulates over time.'),
    ],
  },
  {
    id: 'body',
    name: 'Body',
    aliases: "Health · Fitness · The Physical",
    horizonGoal: "I am honouring this instrument — and it responds.",
    description: "The instrument through which everything else operates. Not aesthetics — capacity. How you move, how you sleep, what you eat, how you feel in your own skin. The only one you get.",
    lifeMission: "Am I honouring this instrument — or running it into the ground?",
    civilisational: 'Nature',
    subDomains: [
      approach('body-movement',   'Movement',       'I move in ways that make me feel alive and capable.',          'Not exercise as punishment — movement as expression. The full spectrum from walking to athletics.'),
      approach('body-nutrition',  'Nutrition',      'I fuel myself in ways that support who I am becoming.',        'The relationship between what you eat and how you feel, think, and perform.'),
      approach('body-sleep',      'Sleep',          'I sleep well and wake rested.',                                'The foundation of cognitive function, emotional regulation, and physical recovery.'),
      approach('body-nervous',    'Nervous System', 'My nervous system is regulated enough to meet what life brings.', 'The operating system beneath everything. Regulation is the prerequisite for everything else.'),
      approach('body-sensation',  'Sensation',      'I am present in my body, not just inhabiting it.',            'The practice of actually being in the body. Proprioception, interoception, embodied presence.'),
      approach('body-health',     'Health',         'My body is well — and I take responsibility for keeping it so.', 'The baseline of physical wellbeing. Not perfect — functional, honest, tended to.'),
      approach('body-aging',      'Aging Well',     'I am growing older in a way I am proud of.',                  'The relationship with time in the body. How you intend to be at 70, 80, beyond.'),
    ],
  },
  {
    id: 'finances',
    name: 'Finances',
    aliases: "Agency · Money · Currency",
    horizonGoal: "I have the agency to act on what matters to me.",
    description: "Do you have the charge to act? This is about agency, not wealth. Financial stress costs more than money — it costs cognitive bandwidth, relationship capacity, and the ability to take the risks that matter.",
    lifeMission: "Do I have the agency to act on what matters?",
    civilisational: 'Finance & Economy',
    subDomains: [
      approach('fin-agency',       'Agency',       'My financial position gives me genuine freedom of movement.',  'The practical capacity to act. Not rich — free enough to make the choices that matter.'),
      approach('fin-income',       'Income',       'My income reflects the value I bring and supports the life I want.', 'The flow of money in. How it is generated, what it is tied to, whether it is sustainable.'),
      approach('fin-foundation',   'Foundation',   'I have a financial foundation that can weather uncertainty.',  'The structural baseline: savings, no catastrophic exposure. The floor.'),
      approach('fin-growth',       'Growth',       'My financial position is moving in the right direction.',      'Trajectory, not just position. Are things getting better? Is there a plan?'),
      approach('fin-relationship', 'Relationship', 'My relationship with money is healthy — not driven by fear.', 'The psychology of money. The beliefs, behaviours, and emotions that run the financial life.'),
      approach('fin-giving',       'Giving',       'I give in ways that are meaningful and sustainable.',         'The outward flow of resource. Generosity as a practice, not an obligation.'),
      approach('fin-alignment',    'Alignment',    'How I earn money is aligned with who I am.',                  'Whether the income source is coherent with the life. Work that degrades you costs more than money.'),
    ],
  },
  {
    id: 'connection',
    name: 'Connection',
    aliases: "Your relationships with others",
    horizonGoal: "I am truly known — and I am truly knowing the people I love.",
    description: "Not just the presence of people — the quality of what actually passes between you. Depth, honesty, reciprocity. The relationships that hold you, challenge you, and witness you.",
    lifeMission: "Am I truly known by anyone — and am I truly knowing them?",
    civilisational: 'Society',
    subDomains: [
      approach('con-intimate',   'Intimate Partnership', 'I am in a relationship of genuine depth and honesty.',         'The primary partnership. Not perfect — real. Where the deepest work and the deepest nourishment happen.'),
      approach('con-friendship', 'Friendship',           'I have friends who truly know me.',                            'The lateral bonds. People who chose you and keep choosing you — without obligation.'),
      approach('con-family',     'Family',               'My family relationships are honest and as healthy as I can make them.', 'The foundational bonds — biological or chosen. Complex, important, worth tending.'),
      approach('con-community',  'Community',            'I belong to communities that matter to me.',                   'The wider circles. Neighbourhood, profession, interest, belief. Where belonging is collective.'),
      approach('con-collab',     'Collaboration',        'I build and create with people who bring out my best.',        'The working relationships. Colleagues, collaborators, creative partners. Not just functional — generative.'),
      approach('con-solitude',   'Solitude',             'I am comfortable alone and I know how to use solitude well.',  'The relationship with yourself in the absence of others. Necessary, often undervalued.'),
      approach('con-repair',     'Repair',               'I can repair what breaks in my relationships.',                'The practice of returning after rupture. Connection is not the absence of conflict — it is the capacity to come back.'),
    ],
  },
  {
    id: 'inner_game',
    name: 'Inner Game',
    aliases: "Your relationship to yourself",
    horizonGoal: "The story I carry about myself is true — and it serves me.",
    description: "The source code. Everything else runs on it. The beliefs and stories you carry about who you are, what you deserve, what is possible. Inner Game determines what you attempt and what you allow.",
    lifeMission: "What story about myself is quietly running the room — and is that story still true?",
    civilisational: 'Legacy',
    subDomains: [
      approach('ig-identity',    'Identity',       'I know who I am — and I live from that knowledge.',            'The foundational self-concept. Not fixed — but stable enough to act from.'),
      approach('ig-beliefs',     'Beliefs',        'The beliefs I hold about myself are true and generative.',     'The operating assumptions. Many were installed in childhood and have never been examined.'),
      approach('ig-self-worth',  'Self-Worth',     'I know my own value — without needing it confirmed.',          'The unconditional sense of mattering. Not earned, not performance-dependent. The ground.'),
      approach('ig-regulation',  'Self-Regulation','I can meet my own emotional states without being run by them.','The capacity to be with what arises internally. Feeling without being swept away.'),
      approach('ig-compassion',  'Self-Compassion','I treat myself with the care I would give someone I love.',    'The practice of turning toward yourself with kindness rather than judgement.'),
      approach('ig-awareness',   'Self-Awareness', 'I see myself clearly — strengths, patterns, shadows and all.', 'The capacity to observe yourself honestly. The prerequisite for genuine change.'),
      approach('ig-agency',      'Inner Agency',   'I experience myself as the author of my life, not its subject.','The felt sense of being the one who acts, not the one things happen to.'),
    ],
  },
  {
    id: 'signal',
    name: 'Signal',
    aliases: "Your relationship to the world",
    horizonGoal: "What I am broadcasting is aligned with who I actually am.",
    description: "Your public-facing presence and personal environment. Is what the world receives from you coherent with who you actually are? Signal covers reputation, environment, and the gap between how you see yourself and how you land.",
    lifeMission: "Is what I'm broadcasting aligned with who I actually am?",
    civilisational: 'Technology',
    subDomains: [
      approach('sig-presence',    'Presence',         'How I show up in a room matches who I am.',                    'The immediate, embodied signal. What people feel when they are with you before you speak.'),
      approach('sig-reputation',  'Reputation',       'My reputation accurately reflects what I actually do and who I am.', 'What persists in the minds of others after you have left. Built slowly, lost quickly.'),
      approach('sig-environment', 'Environment',      'My physical environment reflects and supports who I am becoming.', 'The spaces you inhabit shape the person you are becoming. Signal flows both ways.'),
      approach('sig-voice',       'Voice',            'I can communicate what is true for me — clearly and without apology.', 'The capacity to express your actual perspective. Not performance — honest articulation.'),
      approach('sig-digital',     'Digital Presence', 'What I put into the world digitally is intentional and coherent.', 'The online signal. What your digital footprint says about you — and whether you agree.'),
      approach('sig-brand',       'Personal Brand',   'The way the world sees me is something I have participated in shaping.', 'Not marketing — the considered, honest curation of how you present to the world.'),
      approach('sig-impact',      'Impact',           'The effect I have on people and places is the effect I intend.', 'The gap between intention and impact. Often a signal problem — what you mean is not what lands.'),
    ],
  },
]

export const SELF_DOMAINS_BY_ID = Object.fromEntries(SELF_DOMAINS.map(d => [d.id, d]))
