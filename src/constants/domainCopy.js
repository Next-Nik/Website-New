// ─── Domain teaching copy ────────────────────────────────────────────────────
// The seven domain paragraphs used inside InfoIcon panels across The Map and
// elsewhere in the Horizon Suite. Single source of truth — never inline.
//
// Each entry holds:
//   title     — the domain name as it appears in the panel header
//   gloss     — short opening definition (what this is, in plain words)
//   paragraph — the cough-medicine paragraph that earns the work
//   question  — the felt invitation already present in DOMAINS[]
//
// Drafted May 2026 in the teaching-layer pass. Replaces the legacy LIFEOS_TIPS
// entries which were thin aliases-plus-one-sentence descriptions.

export const DOMAIN_COPY = {
  path: {
    title: 'Path',
    gloss: 'Your purpose. Your dharma. The work you’re here to do in this lifetime — the core of what is meaningful for you to do with your life, the impact you want to make. Your mission. Your raison d’être.',
    paragraph: 'Most people are on a trajectory. Not everyone is on a path. The trajectory was set by school, by family, by a job offer that came at the right time, by inertia. The path is what’s underneath — asking to be lived. Sometimes they match. Often they don’t.',
    question: 'Am I walking my path — or just walking?',
  },
  spark: {
    title: 'Spark',
    gloss: 'What lights you up. What fills your tank. What charges your battery. What puts a glint in your eye. This is your élan vital.',
    paragraph: 'Spark is what you do that leaves you energized after doing it. You might be hyped, you might be exhausted with a smile from ear to ear. These are the experiences that make you feel a deep and profound "YES!!!" to life.',
    question: 'When did I last feel genuinely alive — and what’s been costing me that?',
  },
  body: {
    title: 'Body',
    gloss: 'Health, fitness, vitality. The vehicle through which we experience our lives.',
    paragraph: 'Everything else you care about — your work, your relationships, your capacity to think clearly, the next forty years — runs through this instrument. It’s the one piece of equipment you cannot trade in.',
    question: 'Am I honouring this instrument — or running it into the ground?',
  },
  finances: {
    title: 'Finances',
    gloss: 'Money, finance, personal power. Your ability to get what you want in life. The energetic structure of exchange.',
    paragraph: 'Money isn’t the point, but pretending it’s not the point also doesn’t work. This domain is about how empowered you are to move your dreams forward. People who build skyscrapers rarely have the money to build them sitting in a bank account, but they have a belief that they can move that much capital into their visions. How much currency do your dreams hold?',
    question: 'Do I have the agency to act on what matters?',
  },
  connection: {
    title: 'Connection',
    gloss: 'Your relationship with other people. Romantic, familial, friendship, collaborators, community — the people you’re in it with.',
    paragraph: 'Connection is the felt experience of being met. The conversation where you both leaned in. The friend who knew without you having to explain. The partner who can read the room of you. The collaborator who sharpens you. Some of your relationships do this. Some used to. Some never have. Connection isn’t a count of people — it’s the depth of the meeting.',
    question: 'Am I truly known by anyone — and am I truly knowing them?',
  },
  inner_game: {
    title: 'Inner Game',
    gloss: 'Your relationship with yourself. Your values, your beliefs, the story you’re running in the back of your head.',
    paragraph: 'Inner Game is what you’re saying about yourself when no one’s looking — the voice that narrates, judges, defends, hides. Some of it is useful. Most of it was installed long before you got a say in the matter, and it’s still running the room. The work isn’t to silence it. It’s to know what it’s saying, where it came from, and whether it’s still true.',
    question: 'What story about myself is quietly running the room — and is that story still true?',
  },
  signal: {
    title: 'Signal',
    gloss: 'Your relationship with the world. How you present, how you interact, how you’re seen by the world at large.',
    paragraph: 'Signal is what people pick up about you before you’ve said a word — your clothes, your space, your online surface, the way you walk into a room. Most people leak signals they didn’t choose and don’t recognise. The work isn’t to perform. It’s to make sure what the world sees actually matches what’s inside.',
    question: 'Is what I’m broadcasting aligned with who I actually am?',
  },
}

export const DOMAIN_KEYS = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']
