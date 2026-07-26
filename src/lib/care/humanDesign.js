// src/lib/care/humanDesign.js
//
// Human design layer. The one research-heavy piece of the computation, per
// the project brief: the design date (88 solar degrees before birth) plus the
// gate-wheel mapping, from which type, profile, authority, defined centres and
// channels all fall out.
//
// VALIDATION (see docs/care-protocol.md for the full record):
//   · Obama, 1961-08-04 19:24 Honolulu — computes Projector, 6/2, Emotional
//     authority, matching the published chart on all three.
//   · Population distribution over random births tracks published figures:
//     Generator 40% (pub. 37), Manifesting Generator 28% (33), Projector 16%
//     (20), Manifestor 8% (9), Reflector 0.9% (1); Emotional authority 52%
//     (pub. ~50), Sacral 30% (~30).
//   · Structural invariants: the wheel is 64 unique gates, centre membership
//     covers all 64 exactly once, and there are 36 unique channels.

import { horoscopeAtUTC, longitudeOf, sunLongitude, BODIES } from './chart'
import { CHANNELS, CENTRE_OF_GATE, CENTRES, MOTORS, gateLine, LINE_LABELS, PROFILE_NOTES } from './wheel'

const DAY_MS = 86400000
const MEAN_SOLAR_SPEED = 0.9856   // degrees per day

/**
 * The design moment: when the Sun stood exactly 88° of arc before its natal
 * position. That is roughly 88 days earlier, but the Sun's speed varies
 * between perihelion and aphelion, so the true offset ranges about 86.6 to
 * 92.0 days and has to be solved for rather than assumed.
 *
 * Newton iteration on local solar velocity. Converges in four or five steps
 * against sixty for bisection, which matters because each step costs a full
 * ephemeris evaluation.
 */
export function designInstant(birthUTC) {
  const target = (((sunLongitude(birthUTC) - 88) % 360) + 360) % 360
  const signedGap = (instant) => {
    const raw = (((sunLongitude(instant) - target) % 360) + 360) % 360
    return raw > 180 ? raw - 360 : raw
  }

  let t = new Date(birthUTC.getTime() - (88 / MEAN_SOLAR_SPEED) * DAY_MS)
  for (let i = 0; i < 8; i++) {
    const gap = signedGap(t)
    if (Math.abs(gap) < 1e-9) break
    const ahead = new Date(t.getTime() + DAY_MS / 2)
    let velocity = (((sunLongitude(ahead) - sunLongitude(t)) % 360) + 360) % 360
    if (velocity > 180) velocity -= 360
    velocity /= 0.5                                   // degrees per day
    t = new Date(t.getTime() - (gap / velocity) * DAY_MS)
  }
  return t
}

// The thirteen activations either side of the chart: ten planets, plus Earth
// (opposite the Sun) and the two nodes.
export function activationsAt(instant) {
  const h = horoscopeAtUTC(instant)
  const out = {}
  for (const key of BODIES) out[key] = gateLine(longitudeOf(h, key))
  const sunLon = longitudeOf(h, 'sun')
  const nodeLon = longitudeOf(h, 'northnode')
  out.earth = gateLine((sunLon + 180) % 360)
  out.northnode = gateLine(nodeLon)
  out.southnode = gateLine((nodeLon + 180) % 360)
  return out
}

function centresLinkedBy(channels) {
  const defined = new Set()
  for (const [a, b] of channels) {
    defined.add(CENTRE_OF_GATE[a])
    defined.add(CENTRE_OF_GATE[b])
  }
  return defined
}

// Is there a path of defined channels from one centre to another? This is what
// "a motor wired through to the throat" actually means, and it is the single
// test that separates Manifestor from Projector.
function pathExists(channels, from, to) {
  const seen = new Set([from])
  const stack = [from]
  while (stack.length) {
    const current = stack.pop()
    if (current === to) return true
    for (const [a, b] of channels) {
      const ca = CENTRE_OF_GATE[a]
      const cb = CENTRE_OF_GATE[b]
      const next = ca === current ? cb : cb === current ? ca : null
      if (next && !seen.has(next)) {
        seen.add(next)
        stack.push(next)
      }
    }
  }
  return false
}

// How many separate islands of definition the chart has. Single definition
// means everything is wired together; split definition means the person is
// waiting on something outside themselves to bridge the gap. It is one of the
// more practically useful outputs for a card about how to care for someone.
function definitionSplit(channels, defined) {
  const remaining = new Set(defined)
  let groups = 0
  while (remaining.size) {
    const seed = remaining.values().next().value
    for (const centre of [...remaining]) {
      if (centre === seed || pathExists(channels, seed, centre)) remaining.delete(centre)
    }
    groups++
  }
  return ['none', 'single', 'split', 'triple split', 'quadruple split'][groups] || `${groups} groups`
}

export function computeHumanDesign(birthUTC) {
  const designUTC = designInstant(birthUTC)
  const personality = activationsAt(birthUTC)
  const design = activationsAt(designUTC)

  const gates = new Set()
  for (const set of [personality, design]) {
    for (const activation of Object.values(set)) gates.add(activation.gate)
  }

  const channels = CHANNELS.filter(([a, b]) => gates.has(a) && gates.has(b))
  const defined = centresLinkedBy(channels)
  const motorToThroat = MOTORS.some((m) => defined.has(m) && pathExists(channels, m, 'throat'))

  let type
  if (defined.size === 0) type = 'Reflector'
  else if (defined.has('sacral')) type = motorToThroat ? 'Manifesting Generator' : 'Generator'
  else if (motorToThroat) type = 'Manifestor'
  else type = 'Projector'

  let authority
  if (type === 'Reflector') authority = 'Lunar'
  else if (defined.has('solar')) authority = 'Emotional'
  else if (defined.has('sacral')) authority = 'Sacral'
  else if (defined.has('spleen')) authority = 'Splenic'
  else if (defined.has('heart')) {
    authority = pathExists(channels, 'heart', 'throat') ? 'Ego-Manifested' : 'Ego-Projected'
  } else if (defined.has('g')) authority = 'Self-Projected'
  else authority = 'Mental'

  const profile = `${personality.sun.line}/${design.sun.line}`
  const openCentres = Object.keys(CENTRES).filter((c) => !defined.has(c))

  return {
    designUTC: designUTC.toISOString(),
    designDaysBefore: Number(((birthUTC - designUTC) / DAY_MS).toFixed(2)),
    type,
    profile,
    profileLines: [personality.sun.line, design.sun.line],
    profileLabel: `${LINE_LABELS[personality.sun.line]} / ${LINE_LABELS[design.sun.line]}`,
    profileNote: PROFILE_NOTES[profile] || null,
    authority,
    definedCentres: [...defined].sort(),
    openCentres,
    definition: definitionSplit(channels, defined),
    channels: channels.map(([a, b]) => `${a}-${b}`),
    gates: [...gates].sort((a, b) => a - b),
    personality,
    design,
    // The shorthand the whole product was named after: "2/5 Generator".
    shorthand: `${profile} ${type}`,
  }
}

// Plain-language strategy, as partner-facing guidance rather than jargon.
export const TYPE_GUIDANCE = {
  'Generator': {
    strategy: 'Wait to respond',
    forOthers: 'Ask rather than announce. A direct question gives them something to respond to, and their gut answer is the real one.',
  },
  'Manifesting Generator': {
    strategy: 'Wait to respond, then inform',
    forOthers: 'They move fast and skip steps. Let them, and ask to be told before rather than after.',
  },
  'Projector': {
    strategy: 'Wait for the invitation',
    forOthers: 'Invite them in explicitly. Unasked-for advice from them lands badly on both sides, and they burn out faster than they will admit.',
  },
  'Manifestor': {
    strategy: 'Inform before acting',
    forOthers: 'Do not ask them to wait for permission. Ask only to be told first.',
  },
  'Reflector': {
    strategy: 'Wait a lunar cycle',
    forOthers: 'They take the temperature of whatever room they are in. Give big decisions a month, and pay attention to who they are around.',
  },
}

export const AUTHORITY_GUIDANCE = {
  'Emotional': 'No truth in the moment. Wait out the wave before asking for an answer, and do not read the low point as the real feeling.',
  'Sacral': 'The gut sound in the first second is the answer. A considered yes that arrives later is usually a no.',
  'Splenic': 'A quiet one-time instinct. If they say it once and softly, that was it — it does not repeat.',
  'Ego-Manifested': 'Ask what they actually want. Willpower answers honestly when the question is about desire.',
  'Ego-Projected': 'Listen for what they say they want when nobody is asking them to be reasonable.',
  'Self-Projected': 'They need to hear themselves talk it through. Be the listener, not the adviser.',
  'Mental': 'They need to talk it out with trusted people in the right environment. The answer comes from the discussion, not from inside.',
  'Lunar': 'Give it a full month. Anything decided faster belongs to whoever was in the room.',
}
