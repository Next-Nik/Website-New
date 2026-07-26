// ─── Civilisational domain teaching copy ─────────────────────────────────────
// The seven civilisational domain entries, in exact structural parallel with
// src/constants/domainCopy.js. Two files, one shape — the fractal made
// structural in the code, not just claimed in the visual.
//
// Each entry holds:
//   title     — the domain name as it appears in the panel header
//   gloss     — short opening definition (what this is, in plain words)
//   line      — the one-sentence version, for scannable list surfaces
//   paragraph — the longer teaching paragraph
//   question  — the felt invitation, at civilisational scale
//
// Keyed on the canonical CIV_DOMAINS slugs from src/app/constants/domains.js
// ('human-being', 'finance-economy', 'technology'), NOT the short forms that
// were inlined on the marketing home.
//
// Consolidated July 2026 from three prior sources, each of which had part of
// the answer and none of which had all of it:
//   • NEXTUS_TIPS          (src/components/DomainTooltip.jsx)  — tip + desc
//   • STATIC_DOMAINS       (src/components/domain-explorer/data.js) — description
//   • DOMAIN_HORIZON_GOALS (src/app/constants/domains.js) — the goal, not the definition
// Those remain in place for their own surfaces; this file is the teaching layer.

export const CIV_DOMAIN_COPY = {
  vision: {
    title: 'Vision',
    gloss: 'Where we’re going. The orienting force of civilisation — a shared picture of the future we are actually building toward, and the infrastructure to move there together.',
    line: 'Where we’re going. The orienting force of civilisation.',
    paragraph: 'Most of civilisation is not steering. It is reacting — to markets, to crises, to the last election, to whatever arrived this morning. A trajectory set by momentum is not the same as a direction chosen on purpose. Vision is the domain that makes every other one answerable to something: without it, progress is just motion, and nobody can say whether it was progress at all.',
    question: 'Do we know where we’re going — or are we only reacting?',
  },
  'human-being': {
    title: 'Human Being',
    gloss: 'Everything pertaining to the individual. Health, education, consciousness, rights, culture, expression — the full terrain of what it means to be human.',
    line: 'Everything pertaining to the individual.',
    paragraph: 'These are usually treated as separate systems with separate budgets and separate ministries. They are not. They are dimensions of one developmental terrain, and a civilisation that develops one while starving the others produces people who are educated but unwell, free but unformed, connected but unmet. The world is made of roughly eight billion people. What it can become is bounded by what they are given the conditions to become.',
    question: 'Does this world let a person become who they are?',
  },
  nature: {
    title: 'Nature',
    gloss: 'Ecosystem Earth. Earth, air, water, flora, fauna — the living systems that make every other thing on this list possible.',
    line: 'Ecosystem Earth — the living systems that make everything else possible.',
    paragraph: 'This is the one domain that is not optional and not negotiable, because it is the substrate the others run on. An economy is a design; a society is a design; the biosphere is a precondition. The work here is not stewardship-as-charity, it is recognising humanity as a participant in these systems rather than an owner of them — which changes what counts as a cost.',
    question: 'Are we living as part of this planet — or against it?',
  },
  'finance-economy': {
    title: 'Economy',
    gloss: 'Systems of exchange. How humanity creates, moves and allocates the resources that sustain life.',
    line: 'Systems of exchange. How resources are created, moved and allocated.',
    paragraph: 'The economy is not a natural phenomenon and it is not weather. It is a design — a set of rules about what gets counted, what gets rewarded, and what is allowed to be free. It can be redesigned. The question is never whether we can afford to value something; it is that we built a machine which does not currently count it.',
    question: 'Does what we reward match what actually matters?',
  },
  society: {
    title: 'Society',
    gloss: 'Everything pertaining to the collective. Governance, structure, culture, frameworks — the science and art of building community and collective well-being.',
    line: 'Everything pertaining to the collective.',
    paragraph: 'Society is both a collective and a group of individuals, and neither overrides the other. Most political argument is really an argument about which of those two to sacrifice. The work in this domain is the harder thing: structures that give everyone room to function without requiring anyone to disappear into the group — and the capacity to disagree without the disagreement destroying anything.',
    question: 'Do we know how to be human together?',
  },
  legacy: {
    title: 'Legacy',
    gloss: 'The footprint of mankind. What we leave behind for the people who come after, and each generation’s responsibility to the next seven.',
    line: 'The footprint of mankind. What we leave to the next seven generations.',
    paragraph: 'Every generation inherits a world it did not choose and hands on a world it did. Legacy is the domain of that transmission — what gets carried, what gets repaired, what gets quietly dropped because nobody was assigned to remember it. It is also the only domain where the people most affected by the decision have no vote in it, which is precisely why it needs to be named as a domain rather than left to sentiment.',
    question: 'Are we ancestors worth having?',
  },
  technology: {
    title: 'Technology',
    gloss: 'The tools we build for humanity and Earth. The tools we build to aid and amplify life.',
    line: 'The tools we build for humanity and Earth.',
    paragraph: 'Technology is the most powerful lever civilisation has and the most dangerous, and it is the same lever either way. Nothing about a tool determines which it will be — that is settled by design choices, by governance, and by who holds power over deployment. Treating technology as a force that simply happens to us is how we end up living inside decisions nobody remembers making.',
    question: 'Do our creations serve life — or consume it?',
  },
}

// Canonical order — matches the wheel, starting at Vision (12 o'clock) and
// running clockwise. Mirrors DOMAIN_KEYS in domainCopy.js.
export const CIV_DOMAIN_KEYS = [
  'vision', 'human-being', 'nature', 'finance-economy', 'society', 'legacy', 'technology',
]
