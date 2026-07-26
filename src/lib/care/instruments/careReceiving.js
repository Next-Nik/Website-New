// src/lib/care/instruments/careReceiving.js
//
// "How I receive care" — an original instrument, authored for this product.
//
// RIGHTS — ours. This exists specifically so we never touch Chapman's Five
// Love Languages: that quiz is copyrighted and the phrase is trademarked. The
// concept of ranked care modes is not ownable, so we author our own items and
// our own modes. Note the modes below are deliberately NOT a rewording of
// Chapman's five · there are eight, and several (being defended, being
// remembered, space held) have no Chapman equivalent at all.
//
// Format: rate all eight, then pick the one you would keep if you could only
// have one. The forced pick breaks ties and stops the common failure where
// someone rates six things a 5 and the ranking says nothing.

const MODES = [
  {
    key: 'spoken_reassurance',
    label: 'Spoken reassurance',
    item: 'Being told out loud that I am wanted, especially when I have not asked.',
    forOthers: 'Say the thing you assume they already know. They do not.',
  },
  {
    key: 'undivided_attention',
    label: 'Undivided attention',
    item: 'Someone putting everything down and giving me their whole focus.',
    forOthers: 'Put the phone in another room. Half-attention reads as none.',
  },
  {
    key: 'practical_relief',
    label: 'Practical relief',
    item: 'Something being taken off my plate without me having to ask for it.',
    forOthers: 'Do the task, do not offer to. Being asked "what can I do" is one more thing to manage.',
  },
  {
    key: 'physical_closeness',
    label: 'Physical closeness',
    item: 'Touch, or just being physically near someone, without needing to talk.',
    forOthers: 'Sit closer. Presence does the work here, not conversation.',
  },
  {
    key: 'being_defended',
    label: 'Being defended',
    item: 'Someone taking my side in front of other people.',
    forOthers: 'Back them in the room, not afterwards in private. Afterwards does not count.',
  },
  {
    key: 'being_remembered',
    label: 'Being remembered',
    item: 'Small details about me being remembered and acted on later.',
    forOthers: 'The specific thing they mentioned once is the whole point. Write it down.',
  },
  {
    key: 'space_held',
    label: 'Space held',
    item: 'Being left alone in a way that clearly does not mean distance.',
    forOthers: 'Give the space and say it is not withdrawal. Both halves are needed.',
  },
  {
    key: 'shared_adventure',
    label: 'Shared adventure',
    item: 'Being pulled into something new alongside someone.',
    forOthers: 'Make the plan and invite them into it. Novelty together is the currency.',
  },
]

export const CARE_MODES = MODES

const careReceiving = {
  id: 'care_receiving',
  name: 'How I receive care',
  shortName: 'What fills me',
  kind: 'quiz',
  tier: 'core',
  evidence: 'mapped',
  estimatedMinutes: 2,
  rights: {
    status: 'cleared',
    basis: 'Original items, authored for this product',
    url: null,
  },
  instructions:
    'How much does each of these actually land for you · not which sounds like the best kind of person to be.',
  scale: {
    points: 5,
    anchors: { 1: 'Barely registers', 3: 'Nice', 5: 'This is the one' },
  },
  items: MODES.map((mode) => ({
    id: `care_${mode.key}`,
    text: mode.item,
    dimension: `care_${mode.key}`,
    keyed: '+',
    label: mode.label,
  })),
  // The forced pick, handled by the runner as a special final step.
  finalPick: {
    id: 'care_keeper',
    prompt: 'If you could only keep one of those, which one?',
    options: MODES.map((mode) => ({ value: mode.key, label: mode.label })),
  },

  score(responses) {
    const keeper = responses.care_keeper
    const out = {}
    MODES.forEach((mode) => {
      const raw = Number(responses[`care_${mode.key}`])
      if (!raw) return
      // 1-5 onto 0-85, leaving the top of the scale for the forced pick. A
      // plain 5 and the one thing they would keep should not render as the
      // same full bar · that flattens the ranking exactly where it matters.
      let value = Math.round(((raw - 1) / 4) * 85)
      if (keeper === mode.key) value = Math.min(100, value + 15)
      out[`care_${mode.key}`] = { raw, value, confidence: 1, keeper: keeper === mode.key }
    })
    return out
  },
}

/** Ranked care modes, richest first, ready for the card's progress lines. */
export function rankedCareModes(scores) {
  return MODES
    .map((mode) => ({
      ...mode,
      value: scores[`care_${mode.key}`]?.value ?? 0,
      keeper: Boolean(scores[`care_${mode.key}`]?.keeper),
    }))
    .filter((mode) => mode.value > 0)
    .sort((a, b) => b.value - a.value || Number(b.keeper) - Number(a.keeper))
}

export default careReceiving
