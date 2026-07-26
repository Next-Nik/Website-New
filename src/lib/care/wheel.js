// src/lib/care/wheel.js
//
// Human Design static data: the gate wheel, centre membership, and the
// 36 channels. Pure data + pure functions, no imports — this file is the
// bottom of the Care Protocol engine and must stay portable (it has to run
// unchanged in a browser bundle, a Vercel function, or a standalone package).
//
// WHEEL ANCHOR: gate 41 begins at 2°00' Aquarius (302.0° ecliptic longitude)
// and the 64 gates run in zodiacal order at 5.625° each. Verified two ways:
// 0° Aries lands in gate 25 line 2 (published wheels put gate 25 at 28°15'
// Pisces to 3°52'30" Aries), and the resulting type distribution over random
// births matches published population figures. See docs/care-protocol.md.

export const WHEEL_START = 302.0
export const GATE_ARC = 360 / 64        // 5.625°
export const LINE_ARC = GATE_ARC / 6    // 0.9375°

export const WHEEL = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
]

export const CENTRES = {
  head:   [64, 61, 63],
  ajna:   [47, 24, 4, 17, 43, 11],
  throat: [62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16],
  g:      [7, 1, 13, 25, 46, 2, 15, 10],
  heart:  [21, 40, 26, 51],
  spleen: [48, 57, 44, 50, 32, 28, 18],
  sacral: [34, 5, 14, 29, 59, 9, 3, 42, 27],
  solar:  [6, 37, 22, 36, 30, 55, 49],
  root:   [53, 60, 52, 19, 39, 41, 58, 38, 54],
}

export const CENTRE_LABELS = {
  head: 'Head', ajna: 'Ajna', throat: 'Throat', g: 'Identity (G)',
  heart: 'Will (Heart)', spleen: 'Spleen', sacral: 'Sacral',
  solar: 'Solar Plexus', root: 'Root',
}

// The four motors. A motor wired through to the Throat is what separates a
// Manifestor from a Projector, and a Manifesting Generator from a Generator.
export const MOTORS = ['heart', 'solar', 'sacral', 'root']

export const CHANNELS = [
  [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59], [7, 31], [9, 52],
  [10, 20], [10, 34], [10, 57], [11, 56], [12, 22], [13, 33], [16, 48],
  [17, 62], [18, 58], [19, 49], [20, 34], [20, 57], [21, 45], [23, 43],
  [24, 61], [25, 51], [26, 44], [27, 50], [28, 38], [29, 46], [30, 41],
  [32, 54], [34, 57], [35, 36], [37, 40], [39, 55], [42, 53], [47, 64],
]

export const CENTRE_OF_GATE = (() => {
  const map = {}
  for (const centre of Object.keys(CENTRES)) {
    for (const gate of CENTRES[centre]) map[gate] = centre
  }
  return map
})()

// Profile lines. Used for the "2/5 Generator" shorthand the whole product
// was named after.
export const LINE_LABELS = {
  1: 'Investigator', 2: 'Hermit', 3: 'Martyr',
  4: 'Opportunist', 5: 'Heretic', 6: 'Role Model',
}

export const PROFILE_NOTES = {
  '1/3': 'Needs to know the ground is solid, and learns by bumping into things.',
  '1/4': 'Builds a foundation, then shares it with the people already close by.',
  '2/4': 'Natural talent that wants to be left alone until it is called out.',
  '2/5': 'Wants alone time to recharge, and gets handed other people\'s expectations.',
  '3/5': 'Learns by trial and error, and is often asked to fix things.',
  '3/6': 'Experiments hard early, then becomes the one others watch.',
  '4/6': 'Works through their network, and grows into the role model position.',
  '4/1': 'Fixed foundation, shared through relationships. Rarely changes course.',
  '5/1': 'Called on to solve things, and needs the research to back it up.',
  '5/2': 'Called on to solve things, but needs to be left alone to do it.',
  '6/2': 'On the roof observing for a long stretch, with a natural talent underneath.',
  '6/3': 'Watches from a distance, having already lived through the trial and error.',
}

// Turn an ecliptic longitude into a gate and a line.
export function gateLine(longitude) {
  const offset = (((longitude - WHEEL_START) % 360) + 360) % 360
  const index = Math.floor(offset / GATE_ARC)
  const within = offset - index * GATE_ARC
  return { gate: WHEEL[index], line: Math.floor(within / LINE_ARC) + 1 }
}
