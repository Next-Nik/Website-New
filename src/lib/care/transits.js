// src/lib/care/transits.js
//
// The one part of the card that is not a permanent snapshot: today's sky,
// read against a fixed natal chart and a fixed natal Human Design activation
// set. Everything else in this engine is computed once (astrology, Human
// Design, Chinese zodiac, numerology are all properties of the birth moment)
// or scored once per instrument run. This module is the daily layer.
//
// SCOPE, DELIBERATE. Two things move fast enough to be an honest "daily"
// signal and slow enough to interpret with confidence:
//   · the transiting Moon (~13°/day — the standard engine behind almost
//     every daily-horoscope product, because it is the only body whose
//     aspects to a natal chart genuinely turn over inside a day or two)
//   · the transiting Sun (~1°/day — slower, but its Human Design gate/line
//     changes over the same kind of timescale, and its aspects to natal
//     points stay exact for roughly a day given a normal orb)
// Mercury, Venus, Mars, Jupiter and Saturn move too slowly for "today" to
// mean much about their aspects specifically — a Saturn square can sit
// within orb for weeks — so those five are surfaced only as a retrograde
// flag (binary, well-defined, and the single most-asked-about fact in
// mainstream astrology), not run through the aspect-interpretation table.
// Extending that table to the outer planets is future work, not an oversight.
//
// EVIDENCE. Same tier as natal astrology and Human Design: "mythic" per
// EVIDENCE_TIERS in instruments/index.js. This module computes the sky
// correctly; it does not make the sky predictive. See COMPUTED_SYSTEMS.
//
// STABILITY. "Today" is pinned to noon UTC of the calendar date, not the
// instant this function happens to run. Reloading the page at 9am and again
// at 11pm on the same day returns identical output — a card that changed
// every time you glanced at it inside one day would read as broken, not
// alive. It genuinely changes once every calendar day, which is what a
// "daily" window is supposed to mean.
//
// PUBLIC SHARING: deliberately not wired in. `card` snapshots handed to
// `care_shares` are frozen at share-creation time (see cardModel.js
// publicCard()); baking in a value that goes stale within a day would
// reintroduce exactly the frozen-staleness bug already fixed once for
// "Right now" (docs/care-protocol.md §8). This module is called directly by
// the founder's own workspace (CareProtocol.jsx), never by buildCard(), so
// it never enters a stored snapshot. A cycle-aware public share is real
// future work, not an accident.

import { horoscopeAtUTC, longitudeOf, formatPosition, signOf } from './chart'
import { gateLine, CHANNELS, CENTRE_OF_GATE, CENTRE_LABELS } from './wheel'

const TRACKED_RETROGRADE = ['mercury', 'venus', 'mars', 'jupiter', 'saturn']

const ASPECTS = [
  { name: 'conjunction', angle: 0, orb: 8 },
  { name: 'sextile', angle: 60, orb: 4 },
  { name: 'square', angle: 90, orb: 6 },
  { name: 'trine', angle: 120, orb: 6 },
  { name: 'opposition', angle: 180, orb: 8 },
]

// conjunction stays its own bucket; the other four collapse to how they feel.
const ASPECT_BUCKET = {
  conjunction: 'conjunction',
  sextile: 'harmonious',
  trine: 'harmonious',
  square: 'tense',
  opposition: 'tense',
}

function angleBetween(a, b) {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

/** The closest-orb aspect between two longitudes, or null if none is in orb. */
export function aspectBetween(lonA, lonB) {
  const angle = angleBetween(lonA, lonB)
  let best = null
  for (const asp of ASPECTS) {
    const exactness = Math.abs(angle - asp.angle)
    if (exactness <= asp.orb && (!best || exactness < best.exactness)) {
      best = { name: asp.name, bucket: ASPECT_BUCKET[asp.name], exactness: Number(exactness.toFixed(2)) }
    }
  }
  return best
}

const MOON_PHASES = [
  'New', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
]

/** The standard 8-phase model from the Sun-Moon elongation angle. */
export function moonPhase(sunLon, moonLon) {
  const elong = (((moonLon - sunLon) % 360) + 360) % 360
  return MOON_PHASES[Math.floor(((elong + 22.5) % 360) / 45)]
}

// Hand-written, same voice and size as TYPE_GUIDANCE / AUTHORITY_GUIDANCE in
// humanDesign.js — a small table, not a generative paragraph machine. Keyed
// transiting body -> natal point -> aspect bucket. Every combination this
// module can produce is listed; there is no silent fallback because there is
// nothing left uncovered by the two tracked bodies and three natal points.
const READS = {
  moon: {
    sun: {
      conjunction: 'The Moon lines up with your natal Sun today — you read as more yourself than usual, for better or worse. A good day to make the ask you have been sitting on.',
      harmonious: 'Little friction today between what you want and how you feel — an easier-than-usual day to ask for something.',
      tense: 'Some pull today between what you want and how you feel. Do not let a passing mood veto something you actually want.',
    },
    moon: {
      conjunction: 'The Moon returns to where it stood when you were born — an emotional reset point, roughly every 27 days. However you are built to feel things, it is turned up today.',
      harmonious: 'Emotional weather is calm and cooperative today — a good day for anything that needs patience.',
      tense: 'More emotionally reactive than usual today, the Moon squaring or opposing itself from your birth chart. Not a signal something is wrong — just a more sensitive day than most.',
    },
    rising: {
      conjunction: 'The Moon lines up with how you come across today — your mood is more visible than usual, less filtered than you might like.',
      harmonious: 'An easy day to be around people — your mood and your outward manner are cooperating.',
      tense: 'Your mood and how you are coming across are pulling in different directions today. You may read as "off" to people even when nothing is actually wrong.',
    },
  },
  sun: {
    sun: {
      conjunction: 'Your solar return — the Sun is back where it was when you were born. Birthday season.',
      harmonious: 'A quietly easy day, energy-wise. Nothing is forcing your hand.',
      tense: 'A quietly effortful day, energy-wise. Small friction, nothing dramatic.',
    },
    moon: {
      conjunction: 'The Sun lines up with your natal Moon today — your inner needs and your outward energy are pointed the same direction. Ask for what you actually need before the day gets old.',
      harmonious: 'Your energy and your emotional needs are cooperating today.',
      tense: 'A mild pull today between what you feel like doing and what you actually need.',
    },
    rising: {
      conjunction: 'The Sun lines up with your rising sign today — you are more visible than usual, whether or not you feel like it.',
      harmonious: 'An easy day to be seen — how you come across and what you want are working together.',
      tense: 'A slightly effortful day to be seen — you may have to work a little harder than usual to come across as you intend.',
    },
  },
}

const RETROGRADE_NOTES = {
  mercury: 'Mercury retrograde — communication and travel plans are likelier to snag. Reread before sending, and build in slack.',
  venus: 'Venus retrograde — old relationships and old tastes tend to resurface. Not the best window for a big aesthetic or relationship decision.',
  mars: 'Mars retrograde — action tends to stall or misfire. Effort spent now often has to be redone; better for finishing than starting.',
  jupiter: 'Jupiter retrograde — growth turns inward. Expansion outward is slower than usual; this is a better window to consolidate than to launch.',
  saturn: 'Saturn retrograde — a slower window to revisit commitments and structures already in place, rather than take on new ones.',
}

/**
 * Today's activations against a natal Human Design chart: which gate the
 * transiting Sun (and Earth, its opposite point) sits in, and whether that
 * gate completes a channel with a natal gate — either reinforcing a centre
 * the person already has defined, or lighting up one of their open centres
 * for the day. This mirrors the standard Human Design "daily transit" tool,
 * scoped to the Sun/Earth pair rather than all ten bodies, for the same
 * "moves too slowly to be daily" reason astrology above is scoped to Sun
 * and Moon.
 */
export function humanDesignToday(natalHumanDesign, atInstant) {
  if (!natalHumanDesign?.gates) return null
  const h = horoscopeAtUTC(atInstant)
  const sunLon = longitudeOf(h, 'sun')
  const sunGate = gateLine(sunLon)
  const earthGate = gateLine((sunLon + 180) % 360)
  const natalGates = new Set(natalHumanDesign.gates)
  const definedCentres = new Set(natalHumanDesign.definedCentres || [])

  const hits = []
  for (const transiting of [sunGate.gate, earthGate.gate]) {
    for (const [a, b] of CHANNELS) {
      const natalSide = a === transiting ? b : b === transiting ? a : null
      if (natalSide == null || !natalGates.has(natalSide)) continue
      const centreA = CENTRE_OF_GATE[a]
      const centreB = CENTRE_OF_GATE[b]
      const bothDefined = definedCentres.has(centreA) && definedCentres.has(centreB)
      hits.push({
        gates: [a, b],
        transitingGate: transiting,
        natalGate: natalSide,
        centres: [centreA, centreB].map((c) => CENTRE_LABELS[c] || c),
        effect: bothDefined ? 'reinforces' : 'temporary',
      })
    }
  }

  return { sunGate, earthGate, hits }
}

/**
 * The whole daily read. Pass the stored natal chart and natal Human Design
 * objects (as already produced by computeChart / computeHumanDesign) plus an
 * optional date — defaults to right now, pinned internally to noon UTC of
 * that calendar date so repeated calls on the same day agree.
 */
export function computeTransits(natalChart, natalHumanDesign, date = new Date()) {
  if (!natalChart?.placements) return null
  const anchor = new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0,
  ))
  const h = horoscopeAtUTC(anchor)
  const sunLon = longitudeOf(h, 'sun')
  const moonLon = longitudeOf(h, 'moon')

  const point = (lon) => ({ longitude: lon, sign: signOf(lon), formatted: formatPosition(lon) })

  const natalPoints = {
    sun: natalChart.placements?.sun?.longitude,
    moon: natalChart.placements?.moon?.longitude,
    rising: natalChart.ascendant?.longitude,
  }

  const readsFor = (transitingKey, transitingLon) => {
    const out = {}
    for (const [natalKey, natalLon] of Object.entries(natalPoints)) {
      if (natalLon == null) continue
      const aspect = aspectBetween(transitingLon, natalLon)
      if (!aspect) continue
      out[natalKey] = {
        aspect: aspect.name,
        exactness: aspect.exactness,
        text: READS[transitingKey]?.[natalKey]?.[aspect.bucket] || null,
      }
    }
    return out
  }

  const retrograde = TRACKED_RETROGRADE
    .map((key) => ({ key, retrograde: Boolean(h.CelestialBodies[key]?.isRetrograde) }))
    .filter((r) => r.retrograde)
    .map((r) => ({ key: r.key, note: RETROGRADE_NOTES[r.key] }))

  return {
    date: anchor.toISOString().slice(0, 10),
    moon: { ...point(moonLon), phase: moonPhase(sunLon, moonLon), reads: readsFor('moon', moonLon) },
    sun: { ...point(sunLon), reads: readsFor('sun', sunLon) },
    retrograde,
    humanDesign: humanDesignToday(natalHumanDesign, anchor),
  }
}
