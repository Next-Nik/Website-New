// src/lib/care/depth.js
//
// The Depth layer (§22) — the full read behind the card's summary. The card
// stays lean and shareable; this module feeds the founder-only Depth view:
// the complete natal chart (all placements, houses, natal aspects, element
// balance), the full bodygraph (both activation columns, channel names, the
// incarnation cross gates, strategy/signature/not-self), and a richer daily
// read (the whole transiting sky against the natal chart, every temporary
// human design channel today forms, and upcoming sky events).
//
// Everything here is derived from the already-validated engines — chart.js,
// humanDesign.js, transits.js — never computed in parallel to them. Evidence
// tier: mythic throughout, same as the systems it extends.

import { horoscopeAtUTC, longitudeOf, formatPosition, BODIES } from './chart'
import { aspectBetween } from './transits'
import { activationsAt } from './humanDesign'
import { CHANNELS } from './wheel'

/* ── the 64 gates, by their standard human design keynote names ─────────── */

export const GATE_NAMES = {
  1: 'Self-Expression', 2: 'Direction of the Self', 3: 'Ordering',
  4: 'Formulization', 5: 'Fixed Rhythms', 6: 'Friction',
  7: 'The Role of the Self', 8: 'Contribution', 9: 'Focus',
  10: 'Behaviour of the Self', 11: 'Ideas', 12: 'Caution',
  13: 'The Listener', 14: 'Power Skills', 15: 'Extremes',
  16: 'Skills', 17: 'Opinions', 18: 'Correction',
  19: 'Wanting', 20: 'The Now', 21: 'The Hunter',
  22: 'Openness', 23: 'Assimilation', 24: 'Rationalization',
  25: 'Spirit of the Self', 26: 'The Egoist', 27: 'Caring',
  28: 'The Game Player', 29: 'Saying Yes', 30: 'Feelings',
  31: 'Influence', 32: 'Continuity', 33: 'Privacy',
  34: 'Power', 35: 'Change', 36: 'Crisis',
  37: 'Friendship', 38: 'The Fighter', 39: 'Provocation',
  40: 'Aloneness', 41: 'Contraction', 42: 'Growth',
  43: 'Insight', 44: 'Alertness', 45: 'The Gatherer',
  46: 'Determination of the Self', 47: 'Realization', 48: 'Depth',
  49: 'Principles', 50: 'Values', 51: 'Shock',
  52: 'Stillness', 53: 'Beginnings', 54: 'Ambition',
  55: 'Spirit', 56: 'Stimulation', 57: 'Intuitive Clarity',
  58: 'Vitality', 59: 'Intimacy', 60: 'Acceptance',
  61: 'Inner Truth', 62: 'Details', 63: 'Doubt',
  64: 'Confusion',
}

/* ── the 36 channels, by their standard names ───────────────────────────── */

export const CHANNEL_NAMES = {
  '1-8': 'Inspiration', '2-14': 'The Beat', '3-60': 'Mutation',
  '4-63': 'Logic', '5-15': 'Rhythm', '6-59': 'Intimacy',
  '7-31': 'The Alpha', '9-52': 'Concentration', '10-20': 'Awakening',
  '10-34': 'Exploration', '10-57': 'Perfected Form', '11-56': 'Curiosity',
  '12-22': 'Openness', '13-33': 'The Prodigal', '16-48': 'Talent',
  '17-62': 'Acceptance', '18-58': 'Judgment', '19-49': 'Sensitivity',
  '20-34': 'Charisma', '20-57': 'The Brainwave', '21-45': 'Materialism',
  '23-43': 'Structuring', '24-61': 'Awareness', '25-51': 'Initiation',
  '26-44': 'Surrender', '27-50': 'Preservation', '28-38': 'Struggle',
  '29-46': 'Discovery', '30-41': 'Recognition', '32-54': 'Transformation',
  '34-57': 'The Archetype', '35-36': 'Transitoriness', '37-40': 'Community',
  '39-55': 'Emoting', '42-53': 'Maturation', '47-64': 'Abstraction',
}

/* ── type keynotes: signature and not-self, per type ────────────────────── */

export const TYPE_KEYNOTES = {
  'Generator':             { signature: 'Satisfaction', notSelf: 'Frustration' },
  'Manifesting Generator': { signature: 'Satisfaction', notSelf: 'Frustration and anger' },
  'Projector':             { signature: 'Success', notSelf: 'Bitterness' },
  'Manifestor':            { signature: 'Peace', notSelf: 'Anger' },
  'Reflector':             { signature: 'Surprise', notSelf: 'Disappointment' },
}

/* ── the incarnation cross ──────────────────────────────────────────────── */

// The cross's angle follows from the profile. Seven right-angle profiles,
// one juxtaposition (4/1), four left-angle. Presented as the angle plus the
// four gates (personality Sun/Earth over design Sun/Earth) with their gate
// names — the four gates ARE the cross; the traditional proper names for
// each combination vary by school, and inventing them here would be
// fabrication, not computation.
const RIGHT_ANGLE = new Set(['1/3', '1/4', '2/4', '2/5', '3/5', '3/6', '4/6'])
const LEFT_ANGLE = new Set(['5/1', '5/2', '6/2', '6/3'])

export function crossAngle(profile) {
  if (RIGHT_ANGLE.has(profile)) return 'Right Angle'
  if (profile === '4/1') return 'Juxtaposition'
  if (LEFT_ANGLE.has(profile)) return 'Left Angle'
  return null
}

export function incarnationCross(humanDesign) {
  if (!humanDesign?.personality?.sun || !humanDesign?.design?.sun) return null
  const g = (activation) => ({
    gate: activation.gate,
    line: activation.line,
    name: GATE_NAMES[activation.gate],
  })
  return {
    angle: crossAngle(humanDesign.profile),
    personalitySun: g(humanDesign.personality.sun),
    personalityEarth: g(humanDesign.personality.earth),
    designSun: g(humanDesign.design.sun),
    designEarth: g(humanDesign.design.earth),
  }
}

/* ── natal aspects ──────────────────────────────────────────────────────── */

const ASPECT_POINTS = [...BODIES, 'ascendant', 'midheaven']

function lonOfPoint(chart, key) {
  if (key === 'ascendant') return chart.ascendant?.longitude
  if (key === 'midheaven') return chart.midheaven?.longitude
  return chart.placements?.[key]?.longitude
}

// Every classical aspect between the ten bodies plus the ascendant and
// midheaven, sorted tightest first. Uses the same aspectBetween (and the
// same orbs) as the daily transit engine, so natal and transiting aspects
// mean the same thing everywhere.
export function natalAspects(chart) {
  const out = []
  for (let i = 0; i < ASPECT_POINTS.length; i++) {
    for (let j = i + 1; j < ASPECT_POINTS.length; j++) {
      const a = lonOfPoint(chart, ASPECT_POINTS[i])
      const b = lonOfPoint(chart, ASPECT_POINTS[j])
      if (a == null || b == null) continue
      const aspect = aspectBetween(a, b)
      if (!aspect) continue
      out.push({
        a: ASPECT_POINTS[i],
        b: ASPECT_POINTS[j],
        name: aspect.name,
        bucket: aspect.bucket,
        orb: Number(aspect.exactness.toFixed(2)),
      })
    }
  }
  return out.sort((x, y) => x.orb - y.orb)
}

/* ── the richer daily read ──────────────────────────────────────────────── */

// Transiting personal planets read against the natal chart. Slower planets
// are deliberately excluded from the aspect list — a Pluto transit is a
// months-long story and rendering it as "today" would be dishonest about
// what a daily read can claim.
const TRANSITING = ['sun', 'moon', 'mercury', 'venus', 'mars']
const NATAL_TARGETS = [...BODIES, 'ascendant']

function noonUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0))
}

function elongationAt(instant) {
  const h = horoscopeAtUTC(instant)
  return (((longitudeOf(h, 'moon') - longitudeOf(h, 'sun')) % 360) + 360) % 360
}

// The next instant (searching forward from `from`, up to `maxDays`) where the
// Sun–Moon elongation crosses `target` degrees (0 = new moon, 180 = full).
// Coarse 6-hour steps to bracket the crossing, then binary refinement to
// under a minute. Elongation increases monotonically (~12.2°/day), which is
// what makes the bracket-then-bisect approach valid.
function nextElongation(from, target, maxDays = 32) {
  const STEP = 6 * 3600 * 1000
  const gap = (t) => (((elongationAt(t) - target) % 360) + 360) % 360
  let prev = from
  let prevGap = gap(prev)
  for (let i = 1; i <= (maxDays * 24) / 6; i++) {
    const next = new Date(from.getTime() + i * STEP)
    const nextGap = gap(next)
    // The crossing shows up as the gap wrapping from large (just below 360)
    // back through zero.
    if (nextGap < prevGap) {
      let lo = prev.getTime()
      let hi = next.getTime()
      for (let k = 0; k < 20; k++) {
        const mid = (lo + hi) / 2
        if (gap(new Date(mid)) < 180) hi = mid
        else lo = mid
      }
      return new Date(hi)
    }
    prev = next
    prevGap = nextGap
  }
  return null
}

// When a currently-retrograde planet next goes direct: coarse 5-day steps to
// find the flip, then bisect to the day. Capped — Pluto retrogrades run five
// months, and a cap is honest about how far a daily read should see.
function retrogradeEnd(instant, key, maxDays = 200) {
  const isRetro = (t) => Boolean(horoscopeAtUTC(t).CelestialBodies[key]?.isRetrograde)
  if (!isRetro(instant)) return null
  const STEP = 5 * 86400000
  let prev = instant
  for (let i = 1; i <= maxDays / 5; i++) {
    const next = new Date(instant.getTime() + i * STEP)
    if (!isRetro(next)) {
      let lo = prev.getTime()
      let hi = next.getTime()
      while (hi - lo > 86400000) {
        const mid = (lo + hi) / 2
        if (isRetro(new Date(mid))) lo = mid
        else hi = mid
      }
      return new Date(hi)
    }
    prev = next
  }
  return null
}

const RETRO_CANDIDATES = ['mercury', 'venus', 'mars', 'jupiter', 'saturn']

/**
 * The full daily read (§22). Everything the card's lean "Today's Sky" leaves
 * out: the whole transiting sky, every personal-planet aspect to the natal
 * chart, all thirteen transiting human design activations and every
 * temporary channel they form, and the upcoming events worth knowing about
 * (next new and full moon, when current retrogrades end).
 *
 * Anchored to noon UTC of the calendar date, same as computeTransits, so the
 * two never disagree about what "today" means.
 */
export function computeDepthDaily(chart, humanDesign, date = new Date()) {
  const instant = noonUTC(date)
  const h = horoscopeAtUTC(instant)

  // The whole sky, formatted.
  const sky = {}
  for (const key of BODIES) {
    const lon = longitudeOf(h, key)
    sky[key] = {
      formatted: formatPosition(lon),
      retrograde: Boolean(h.CelestialBodies[key]?.isRetrograde),
    }
  }

  // Personal planets against the natal chart, tightest first.
  const aspects = []
  if (chart?.placements) {
    for (const t of TRANSITING) {
      const tLon = longitudeOf(h, t)
      for (const n of NATAL_TARGETS) {
        const nLon = lonOfPoint(chart, n)
        if (nLon == null) continue
        const aspect = aspectBetween(tLon, nLon)
        if (!aspect) continue
        aspects.push({
          transiting: t,
          natal: n,
          name: aspect.name,
          bucket: aspect.bucket,
          orb: Number(aspect.exactness.toFixed(2)),
        })
      }
    }
    aspects.sort((x, y) => x.orb - y.orb)
  }

  // The full human design weather: all thirteen activations, and every
  // temporary channel they form with the natal gates. A channel both of
  // whose gates are already natal is not listed — nothing about it is
  // temporary; the person owns it every day of their life.
  const activations = activationsAt(instant)
  const natalGates = new Set(humanDesign?.gates || [])
  const transitGates = new Map() // gate -> [body, ...]
  for (const [body, activation] of Object.entries(activations)) {
    if (!transitGates.has(activation.gate)) transitGates.set(activation.gate, [])
    transitGates.get(activation.gate).push(body)
  }
  const temporaryChannels = []
  for (const [a, b] of CHANNELS) {
    if (natalGates.has(a) && natalGates.has(b)) continue
    const viaA = transitGates.has(a) && natalGates.has(b)
    const viaB = transitGates.has(b) && natalGates.has(a)
    if (!viaA && !viaB) continue
    const transitingGate = viaA ? a : b
    const natalGate = viaA ? b : a
    temporaryChannels.push({
      channel: `${a}-${b}`,
      channelName: CHANNEL_NAMES[`${a}-${b}`] || null,
      transitingGate,
      transitingBodies: transitGates.get(transitingGate),
      natalGate,
      gateNames: { [a]: GATE_NAMES[a], [b]: GATE_NAMES[b] },
    })
  }

  // Upcoming events.
  const iso = (d) => (d ? d.toISOString().slice(0, 10) : null)
  const events = {
    nextNewMoon: iso(nextElongation(instant, 0)),
    nextFullMoon: iso(nextElongation(instant, 180)),
    retrogradesEnding: RETRO_CANDIDATES
      .filter((key) => sky[key]?.retrograde)
      .map((key) => ({ body: key, endsOn: iso(retrogradeEnd(instant, key)) })),
  }

  return {
    date: instant.toISOString().slice(0, 10),
    sky,
    aspects,
    humanDesign: {
      activations,
      temporaryChannels,
    },
    events,
  }
}
