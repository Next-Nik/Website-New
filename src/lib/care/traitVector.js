// src/lib/care/traitVector.js
//
// Layer 2 of the engine: the normalised trait vector.
//
// Everything · quiz scores and computed systems alike · lands in one common
// format: { dimension, value 0-100, confidence, source, evidence_tier }.
// This growing structured portrait is the product's real asset, and it is what
// makes the synthesis layer possible at all. A quiz score and a Cancer moon
// have to be commensurable before anything can notice that they are pointing
// at the same need.

import { INSTRUMENTS, INSTRUMENTS_BY_ID } from './instruments'
import { ELEMENTS, MODALITIES } from './chart'

function entry(dimension, value, { confidence = 1, source, tier, label = null, detail = null }) {
  return {
    dimension,
    value: Math.max(0, Math.min(100, Math.round(value))),
    confidence: Number(Math.max(0, Math.min(1, confidence)).toFixed(2)),
    source,
    evidence_tier: tier,
    label,
    detail,
  }
}

// Astrology contributes as elemental and modal weighting rather than as a
// pile of sign names. "Water-heavy" is something the synthesis can actually
// reason against alongside a measured anxiety score; "Cancer moon" is not.
function fromAstrology(chart) {
  if (!chart) return []
  const out = []
  const { elements, modalities } = chart.balance
  for (const [element, value] of Object.entries(elements)) {
    out.push(entry(`element_${element}`, value, {
      source: 'astrology', tier: 'mythic', confidence: 0.6,
      label: `${element.charAt(0).toUpperCase()}${element.slice(1)} weighting`,
    }))
  }
  for (const [modality, value] of Object.entries(modalities)) {
    out.push(entry(`modality_${modality}`, value, {
      source: 'astrology', tier: 'mythic', confidence: 0.6,
      label: `${modality.charAt(0).toUpperCase()}${modality.slice(1)} weighting`,
    }))
  }
  // The big three as qualitative markers, carried for the synthesis prompt.
  for (const key of ['sun', 'moon', 'rising']) {
    const sign = chart.big3[key].sign
    out.push(entry(`placement_${key}`, 100, {
      source: 'astrology', tier: 'mythic', confidence: 1,
      label: `${key.charAt(0).toUpperCase()}${key.slice(1)} in ${sign}`,
      detail: { sign, element: ELEMENTS[sign], modality: MODALITIES[sign] },
    }))
  }
  return out
}

function fromHumanDesign(hd) {
  if (!hd) return []
  const out = [
    entry('hd_definition_density', (hd.definedCentres.length / 9) * 100, {
      source: 'human_design', tier: 'mythic', confidence: 0.6,
      label: `${hd.definedCentres.length} of 9 centres defined`,
      detail: { defined: hd.definedCentres, open: hd.openCentres, definition: hd.definition },
    }),
  ]
  out.push(entry('hd_type', 100, {
    source: 'human_design', tier: 'mythic', confidence: 1,
    label: hd.type, detail: { profile: hd.profile, authority: hd.authority },
  }))
  // Open centres are the practically useful part: they are where a person
  // amplifies whatever is in the room, which is real partner-facing guidance.
  for (const centre of hd.openCentres) {
    out.push(entry(`hd_open_${centre}`, 100, {
      source: 'human_design', tier: 'mythic', confidence: 0.5,
      label: `Open ${centre}`,
    }))
  }
  return out
}

function fromComputedExtras(extras) {
  const out = []
  if (extras?.chinese) {
    out.push(entry('chinese_zodiac', 100, {
      source: 'chinese_zodiac', tier: 'mythic', confidence: 0.4,
      label: extras.chinese.label, detail: extras.chinese,
    }))
  }
  if (extras?.numerology) {
    out.push(entry('life_path', 100, {
      source: 'numerology', tier: 'mythic', confidence: 0.3,
      label: `Life path ${extras.numerology.lifePath}`, detail: extras.numerology,
    }))
  }
  return out
}

function fromInstruments(responses) {
  const out = []
  for (const instrument of INSTRUMENTS) {
    const scores = instrument.score(responses || {})
    for (const [dimension, score] of Object.entries(scores)) {
      out.push(entry(dimension, score.value, {
        confidence: score.confidence,
        source: instrument.id,
        tier: instrument.evidence,
        label: dimension,
        detail: score.raw !== undefined ? { raw: score.raw, z: score.z } : null,
      }))
    }
  }
  return out
}

/**
 * Build the full trait vector from everything known about a person.
 *
 * @param {object} profile
 * @param {object} profile.chart      output of computeChart
 * @param {object} profile.humanDesign output of computeHumanDesign
 * @param {object} profile.extras     { chinese, numerology }
 * @param {object} profile.responses  flat map of itemId to response
 */
export function buildTraitVector(profile) {
  return [
    ...fromInstruments(profile.responses),
    ...fromAstrology(profile.chart),
    ...fromHumanDesign(profile.humanDesign),
    ...fromComputedExtras(profile.extras),
  ]
}

/** Instrument scores keyed by instrument id — handy for the card sections. */
export function scoresByInstrument(responses) {
  const out = {}
  for (const instrument of INSTRUMENTS) {
    out[instrument.id] = instrument.score(responses || {})
  }
  return out
}

/** Which instruments have actually been completed, and how far. */
export function completion(responses) {
  const map = {}
  for (const instrument of INSTRUMENTS) {
    const ids = instrument.items.map((i) => i.id)
    const answered = ids.filter((id) => {
      const value = (responses || {})[id]
      return value !== undefined && value !== null && value !== ''
    }).length
    map[instrument.id] = {
      answered,
      total: ids.length,
      complete: answered === ids.length,
      // Free-text instruments count as done once the required item is filled.
      started: answered > 0,
    }
  }
  return map
}

/** A compact digest of the vector for the synthesis prompt. */
export function vectorDigest(vector) {
  const byTier = { measured: [], mapped: [], mythic: [] }
  for (const item of vector) {
    const tier = byTier[item.evidence_tier] || byTier.mythic
    tier.push(
      item.detail?.sign || item.label !== item.dimension
        ? `${item.label} (${item.value})`
        : `${item.dimension}: ${item.value}`,
    )
  }
  return byTier
}

export { INSTRUMENTS_BY_ID }
