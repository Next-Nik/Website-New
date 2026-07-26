// src/lib/care/instruments/ecrRS.js
//
// ECR-RS — Experiences in Close Relationships, Relationship Structures
// (R. Chris Fraley). Nine items, two dimensions: attachment avoidance and
// attachment anxiety.
//
// RIGHTS — freely distributed, but NOT public domain. Verified: Fraley's
// measures page carries no licence, no free-use grant and no copyright notice
// on the instruments themselves. It is distributed for open use in practice,
// and the project brief's claim of "public domain" overstates it slightly.
// Recorded here accurately rather than optimistically.
// Source: https://labs.psychology.illinois.edu/~rcfraley/measures/relstructures.htm
//
// NO CATEGORIES, DELIBERATELY. Fraley et al. (2015), J Pers Soc Psychol
// 109(2), 354-368: "we no longer think it is defensible to use categorical
// measures in adult attachment research or to use continuous measures to
// assign people to categories." So this instrument returns two continuous
// dimensions and a plain-language reading of where they sit against published
// means. It does not stamp a style name on anyone. That is both what the
// author asks for and what the product's honesty posture requires.
//
// Items verbatim from the relationship-specific version, administered here
// against a single target: the person closest to you.

const AVOIDANCE = 'attachment_avoidance'
const ANXIETY = 'attachment_anxiety'

// [text, dimension, reverseKeyed]
const RAW = [
  ['It helps to turn to this person in times of need.', AVOIDANCE, true],
  ['I usually discuss my problems and concerns with this person.', AVOIDANCE, true],
  ['I talk things over with this person.', AVOIDANCE, true],
  ['I find it easy to depend on this person.', AVOIDANCE, true],
  ["I don't feel comfortable opening up to this person.", AVOIDANCE, false],
  ['I prefer not to show this person how I feel deep down.', AVOIDANCE, false],
  ["I often worry that this person doesn't really care for me.", ANXIETY, false],
  ["I'm afraid that this person may abandon me.", ANXIETY, false],
  ['I worry that this person won\'t care about me as much as I care about him or her.', ANXIETY, false],
]

// Large-sample means on the 7-point scale, from Fraley et al. (2015).
// Study 1, N = 2,399. Used to say "higher than most" honestly rather than
// inventing a cutoff the literature does not support.
export const NORMS = {
  [ANXIETY]: { mean: 4.47, sd: 1.62 },
  [AVOIDANCE]: { mean: 3.75, sd: 1.19 },
}

const ecrRS = {
  id: 'ecr_rs',
  name: 'Experiences in Close Relationships — Relationship Structures',
  shortName: 'How I attach',
  kind: 'quiz',
  tier: 'core',
  evidence: 'measured',
  estimatedMinutes: 2,
  rights: {
    status: 'cleared',
    basis: 'Freely distributed by the author. No affirmative public-domain grant',
    url: 'https://labs.psychology.illinois.edu/~rcfraley/measures/relstructures.htm',
  },
  instructions:
    'Answer these about the person you are closest to right now · a partner, or whoever that actually is. Attachment is about a specific relationship, not a fixed personality trait, so the answers can differ per person and can change over time.',
  scale: {
    points: 7,
    anchors: { 1: 'Strongly disagree', 4: 'Neither', 7: 'Strongly agree' },
  },
  items: RAW.map(([text, dimension, reverse], index) => ({
    id: `ecr_${index + 1}`,
    text,
    dimension,
    keyed: reverse ? '-' : '+',
  })),

  score(responses) {
    const buckets = { [AVOIDANCE]: [], [ANXIETY]: [] }
    this.items.forEach((item) => {
      const raw = Number(responses[item.id])
      if (!raw) return
      buckets[item.dimension].push(item.keyed === '-' ? 8 - raw : raw)
    })
    const out = {}
    for (const dimension of Object.keys(buckets)) {
      const values = buckets[dimension]
      if (!values.length) continue
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const expected = dimension === ANXIETY ? 3 : 6
      out[dimension] = {
        raw: Number(mean.toFixed(2)),
        // 1-7 mean mapped onto 0-100.
        value: Math.round(((mean - 1) / 6) * 100),
        confidence: values.length / expected,
        // How far from the population mean, in standard deviations. This is
        // the honest alternative to a category label.
        z: Number(((mean - NORMS[dimension].mean) / NORMS[dimension].sd).toFixed(2)),
      }
    }
    return out
  },
}

// Plain-language reading of the two dimensions, written as guidance a partner
// can act on rather than as a diagnosis.
export function attachmentReading(scores) {
  const anxiety = scores[ANXIETY]
  const avoidance = scores[AVOIDANCE]
  if (!anxiety || !avoidance) return null

  const band = (z) => (z <= -0.7 ? 'low' : z >= 0.7 ? 'high' : 'middling')
  const anxBand = band(anxiety.z)
  const avoBand = band(avoidance.z)

  const lines = {
    anxiety: {
      high: 'Distance registers as a question rather than as nothing. Silence gets filled in with the worst available reading, so a short "I am not upset with you, I am just tired" does an enormous amount of work.',
      middling: 'Reassurance is welcome without being load-bearing. Naming things directly still saves a lot of guessing.',
      low: 'Not prone to reading threat into gaps. Absence is generally taken at face value.',
    },
    avoidance: {
      high: 'Leans away rather than toward when things get heavy. Not disinterest · it is the reflex. Sitting nearby without requiring the conversation tends to work better than asking what is wrong.',
      middling: 'Opens up given a bit of runway. Works better invited than pressed.',
      low: 'Turns toward people under stress. Being reached for is a good sign, not a demand.',
    },
  }

  return {
    anxiety: { band: anxBand, z: anxiety.z, line: lines.anxiety[anxBand] },
    avoidance: { band: avoBand, z: avoidance.z, line: lines.avoidance[avoBand] },
    caveat:
      'Shown as two continuous dimensions rather than a named style, because the author of this instrument argues that assigning people to attachment categories is not defensible.',
  }
}

export default ecrRS
