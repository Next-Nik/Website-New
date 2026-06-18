// ─────────────────────────────────────────────────────────────
// WheelSVG.jsx — personal-wheel adapter
//
// Thin wrapper over the unified <Wheel> instrument. Kept as its own
// export so the marketing home and First Light can keep importing
// { WheelSVG, SELF_DOMAINS } unchanged — the prop signature
// ({ scores, size }) is preserved. The drawing now lives in Wheel.jsx,
// so personal and planetary render through the same code.
//
// SELF_DOMAINS stays here because First Light's Personal screen reads
// `desc` and `cards` off it; the shared instrument only needs key/name/hex.
// ─────────────────────────────────────────────────────────────

import Wheel from './Wheel'

export const SELF_DOMAINS = [
  { key: 'path',       name: 'Path',       hex: '#6B1F2E', desc: 'Dharma, mission, purpose, meaning',                              cards: ['Direction', 'Purpose', 'Career', 'Meaning', "What I'm here for"] },
  { key: 'spark',      name: 'Spark',      hex: '#E8722E', desc: 'Passion, fire, aura, energy',                                   cards: ['Motivation', 'Joy', 'Feeling alive', 'Fire', 'Excitement'] },
  { key: 'body',       name: 'Body',       hex: '#2A8C4F', desc: 'Health, fitness, vitality',                                     cards: ['Energy', 'Sleep', 'Fitness', 'Health', 'How I feel'] },
  { key: 'finances',   name: 'Finances',   hex: '#E8B92E', desc: 'Money, personal power, wealth',                                 cards: ['Money stress', 'Financial security', 'Earning', 'Spending'] },
  { key: 'connection', name: 'Connection', hex: '#D63838', desc: 'You with other people: romantic, friends, family',              cards: ['Friendships', 'Romantic relationship', 'Family', 'Loneliness', 'Feeling understood'] },
  { key: 'inner_game', name: 'Inner Game', hex: '#2767B8', desc: 'Your relationship with yourself, values, standards',            cards: ['Self-confidence', 'Self-worth', 'Anxiety', 'Negative self-talk', 'Who I am'] },
  { key: 'signal',     name: 'Signal',     hex: '#6B3FA8', desc: "Your relationship with the world, how you're seen and show up", cards: ['My impact', 'How I come across', "How I'm seen", 'Feeling heard'] },
]

// Now-only personal wheel. Headed/interactive/severity are opt-in via the
// shared instrument when the Map adopts it; First Light stays now-only.
export function WheelSVG({ scores, size = 200 }) {
  return <Wheel domains={SELF_DOMAINS} now={scores} size={size} />
}
