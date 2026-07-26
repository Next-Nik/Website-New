// src/lib/care/computed.js
//
// The cheap-breadth computed systems: Chinese zodiac and numerology. Both are
// pure arithmetic off the birth data, which is why they cost nothing to add
// and why they sit in the mythic evidence tier without apology.

import { sunLongitude } from './chart'

const ANIMALS = [
  'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake',
  'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig',
]

const STEM_ELEMENTS = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water']

const ANIMAL_NOTES = {
  Rat: 'Resourceful and quick to read a room.',
  Ox: 'Steady, and does not enjoy being hurried.',
  Tiger: 'Moves on conviction, dislikes being managed.',
  Rabbit: 'Conflict-averse and attentive to atmosphere.',
  Dragon: 'Large presence, allergic to being made small.',
  Snake: 'Private, thinks before speaking.',
  Horse: 'Needs movement and open exits.',
  Goat: 'Sensitive to tone more than to content.',
  Monkey: 'Solves things sideways, gets bored of the obvious.',
  Rooster: 'Direct, notices detail, means what is said.',
  Dog: 'Loyal and quietly watchful about fairness.',
  Pig: 'Generous, and slow to admit being depleted.',
}

/**
 * The Chinese year changes at Li Chun — the solar term at 315° of solar
 * longitude, around 3-5 February — not at Lunar New Year. This is the boundary
 * BaZi actually uses, and we can compute it exactly because we already have an
 * ephemeris. Doing it properly means a 20 January birth gets the previous
 * year's animal, which the Feb-1st-ish approximations get wrong.
 */
function liChunFor(year) {
  // Bracket the crossing, then bisect. Solar longitude is monotonic here.
  let lo = Date.UTC(year, 0, 28)
  let hi = Date.UTC(year, 1, 10)
  const past315 = (ms) => {
    const lon = sunLongitude(new Date(ms))
    // 315° sits in late January/early February; nothing wraps inside this window.
    return lon >= 315 && lon < 345
  }
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (past315(mid)) hi = mid
    else lo = mid
  }
  return new Date((lo + hi) / 2)
}

export function chineseZodiac(birth) {
  const birthUTC = Date.UTC(birth.year, birth.month - 1, birth.day)
  const liChun = liChunFor(birth.year)
  const effectiveYear = birthUTC < liChun.getTime() ? birth.year - 1 : birth.year

  // 1984 was Wood Rat: stem index 0, branch index 0.
  const branch = ((effectiveYear - 1984) % 12 + 12) % 12
  const stem = ((effectiveYear - 1984) % 10 + 10) % 10

  return {
    animal: ANIMALS[branch],
    element: STEM_ELEMENTS[stem],
    polarity: stem % 2 === 0 ? 'Yang' : 'Yin',
    year: effectiveYear,
    liChun: liChun.toISOString().slice(0, 10),
    label: `${STEM_ELEMENTS[stem]} ${ANIMALS[branch]}`,
    note: ANIMAL_NOTES[ANIMALS[branch]],
  }
}

const LIFE_PATH_NOTES = {
  1: 'Wants to be first at it, and takes correction badly when tired.',
  2: 'Reads the room before speaking. Needs to be asked what they think.',
  3: 'Processes out loud. Silence from them is a signal, not a mood.',
  4: 'Wants the plan. Surprises cost them more than they cost you.',
  5: 'Needs the exit unlocked. Constraint reads as threat.',
  6: 'Carries other people by default, and rarely says when it is too much.',
  7: 'Goes quiet to think, not to withdraw. Do not read it as distance.',
  8: 'Needs their competence acknowledged before their feelings are.',
  9: 'Takes on the whole room. Needs permission to put some of it down.',
  11: 'Runs hot and perceptive. Needs grounding more than encouragement.',
  22: 'Building something large. Needs the small things handled by someone else.',
  33: 'Gives past the point of sense. Needs someone to notice the cost.',
}

function reduceNumber(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split('').reduce((a, d) => a + Number(d), 0)
  }
  return n
}

export function numerology(birth) {
  // Reduce each component before summing — the standard method, and the one
  // that preserves master numbers correctly.
  const parts = [birth.month, birth.day, birth.year].map((p) =>
    reduceNumber(String(p).split('').reduce((a, d) => a + Number(d), 0)),
  )
  const lifePath = reduceNumber(parts.reduce((a, b) => a + b, 0))
  return { lifePath, note: LIFE_PATH_NOTES[lifePath] || null }
}
