// src/constants/challengeIntensity.js
//
// Challenge intensity — the menu's spiciness scale. The author sets it (optional),
// and people scan for what they can take on. Five rungs that climb along a real
// axis, from "yourself, briefly" to "your whole life," each rung a different kind
// of ask rather than only a harder one.
//
// Inside voice, always: levels orient, they never rank. Challenges are never
// sorted hardest-first, and a level never weights the participation count —
// one person in is one person in, whichever rung they chose.

export const INTENSITY_LEVELS = [
  { level: 1, label: 'Takes a minute or two', blurb: 'Something you can do at home, on your own, in a minute or two.' },
  { level: 2, label: 'A daily habit',         blurb: 'A small thing you keep returning to, woven into your day.' },
  { level: 3, label: 'With others',           blurb: 'It pulls people in. You act together, or bring someone along.' },
  { level: 4, label: 'A lifestyle shift',     blurb: 'A sustained change to how you live day to day.' },
  { level: 5, label: 'Major life change',     blurb: 'It reorganises your life. The end that changes everything.' },
]

export const INTENSITY_BY_LEVEL = Object.fromEntries(INTENSITY_LEVELS.map(l => [l.level, l]))

export function intensityLabel(level) {
  return INTENSITY_BY_LEVEL[level]?.label || null
}
