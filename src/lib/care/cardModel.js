// src/lib/care/cardModel.js
//
// The card data model. One function turns a stored profile into exactly what
// the renderer needs, so the renderer holds no computation and the card can be
// rendered identically on the private page, the public route, or anywhere this
// engine is later dropped.
//
// Card structure runs most permanent to most alive, which is also the trust
// gradient of the systems themselves.

import { computeChart, birthInstantUTC } from './chart'
import { computeHumanDesign, TYPE_GUIDANCE, AUTHORITY_GUIDANCE } from './humanDesign'
import { chineseZodiac, numerology } from './computed'
import { buildTraitVector, scoresByInstrument } from './traitVector'
import { rankedCareModes } from './instruments/careReceiving'
import { attachmentReading } from './instruments/ecrRS'
import { doshaReading } from './instruments/dosha'

/**
 * Run the whole computed side from birth data. Expensive (roughly 200ms, all
 * of it ephemeris work), so callers should do this once and store the result
 * rather than recomputing per render.
 */
export function computeFromBirth(birth) {
  const chart = computeChart(birth)
  const humanDesign = computeHumanDesign(birthInstantUTC(birth))
  return {
    chart,
    humanDesign,
    extras: { chinese: chineseZodiac(birth), numerology: numerology(birth) },
    computedAt: new Date().toISOString(),
  }
}

// The reinterpreted laundry-care symbols. Funny at first glance, sincere on
// the second read. Chosen per person from what the systems actually say, with
// a stable fallback set so a sparse profile still gets a full strip.
const SYMBOL_LIBRARY = [
  { key: 'warmth', glyph: '✿', label: 'Handle with warmth' },
  { key: 'no_force', glyph: '⊘', label: 'Do not force open' },
  { key: 'air', glyph: '❋', label: 'Air after conflict' },
  { key: 'slow_heat', glyph: '☼', label: 'Slow heat only' },
  { key: 'no_rush', glyph: '↻', label: 'Do not rush the cycle' },
  { key: 'no_wring', glyph: '✕', label: 'Do not wring out' },
  { key: 'lay_flat', glyph: '▤', label: 'Lay flat to recover' },
  { key: 'keep_close', glyph: '◈', label: 'Keep close to other colours' },
  { key: 'dry_clean', glyph: '◍', label: 'Professional help for deep stains' },
  { key: 'line_dry', glyph: '⌇', label: 'Line dry, out of direct attention' },
  { key: 'wash_separately', glyph: '◫', label: 'Wash separately when overloaded' },
  { key: 'iron_low', glyph: '⌂', label: 'Low heat · will scorch' },
]

const SYMBOL_BY_KEY = Object.fromEntries(SYMBOL_LIBRARY.map((s) => [s.key, s]))

function chooseSymbols(profile, scores) {
  const picked = []
  const add = (key) => {
    if (picked.length < 5 && SYMBOL_BY_KEY[key] && !picked.includes(key)) picked.push(key)
  }

  const hd = profile.humanDesign
  const attach = attachmentReading(scores.ecr_rs || {})
  const big5 = scores.ipip50 || {}

  // Emotional authority: no truth in the moment. That is the "do not rush the
  // cycle" instruction almost exactly.
  if (hd?.authority === 'Emotional') add('no_rush')
  if (hd?.type === 'Projector' || hd?.type === 'Reflector') add('lay_flat')
  if (hd?.type === 'Manifestor') add('no_force')
  if (attach?.avoidance.band === 'high') add('no_force')
  if (attach?.anxiety.band === 'high') add('warmth')
  if (big5.emotional_stability && big5.emotional_stability.value < 40) add('slow_heat')
  if (big5.extraversion && big5.extraversion.value < 35) add('line_dry')
  if (big5.agreeableness && big5.agreeableness.value > 70) add('wash_separately')
  if (profile.chart?.balance.elements.fire >= 35) add('iron_low')
  if (profile.chart?.balance.elements.water >= 35) add('air')

  for (const fallback of ['warmth', 'no_force', 'air', 'slow_heat', 'no_rush']) add(fallback)
  return picked.map((key) => SYMBOL_BY_KEY[key])
}

/**
 * Assemble the card.
 *
 * @param {object} profile stored care profile
 * @returns card-shaped data, safe to hand straight to the renderer
 */
export function buildCard(profile) {
  const scores = scoresByInstrument(profile.responses)
  const hd = profile.humanDesign
  const chart = profile.chart

  const placements = []
  if (chart) {
    placements.push(
      `${chart.big3.sun.sign} sun`,
      `${chart.big3.moon.sign} moon`,
      `${chart.big3.rising.sign} rising`,
    )
  }
  if (hd) placements.push(hd.shorthand)

  const attachment = attachmentReading(scores.ecr_rs || {})
  const dosha = doshaReading(scores.dosha || {})

  return {
    // 1 — Header
    header: {
      name: profile.displayName || 'Unnamed',
      eyebrow: `CARE PROTOCOL · NO. ${String(profile.cardNumber || 1).padStart(3, '0')}`,
      placements,
    },

    // 2 — How I'm wired: AI synthesis when present, honest placeholder when not.
    wired: {
      text: profile.synthesis?.wired || null,
      pending: !profile.synthesis?.wired,
      convergences: profile.synthesis?.convergences || [],
      tensions: profile.synthesis?.tensions || [],
    },

    // 3 — Care instructions: the symbol strip.
    symbols: chooseSymbols(profile, scores),

    // 4 — What fills me
    fills: rankedCareModes(scores.care_receiving || {}).slice(0, 5),

    // 5 — How I attach, plus the one user-voice moment
    attach: attachment
      ? {
          ...attachment,
          userLine: profile.responses?.open_line?.trim() || null,
        }
      : { userLine: profile.responses?.open_line?.trim() || null },

    // 6 — Right now: the only clay section, the living part of the card.
    rightNow: {
      text: profile.rightNow?.text || null,
      updatedAt: profile.rightNow?.updatedAt || null,
      stale: profile.rightNow?.updatedAt
        ? Date.now() - new Date(profile.rightNow.updatedAt).getTime() > 14 * 86400000
        : false,
    },

    // 7 — Footer
    footer: {
      issued: profile.createdAt ? String(profile.createdAt).slice(0, 10) : null,
      tagline: 'Care instructions for the people who keep you.',
      shareUrl: profile.shareUrl || null,
    },

    // Supporting detail, used by the protocol page rather than the card face.
    detail: {
      humanDesign: hd
        ? {
            ...hd,
            typeGuidance: TYPE_GUIDANCE[hd.type] || null,
            authorityGuidance: AUTHORITY_GUIDANCE[hd.authority] || null,
          }
        : null,
      chart,
      extras: profile.extras || null,
      dosha,
      big5: scores.ipip50 || {},
      openWish: profile.responses?.open_wish?.trim() || null,
    },

    evidenceMix: evidenceMix(profile),
  }
}

// What the card is actually built from, by tier. Displayed openly.
function evidenceMix(profile) {
  const vector = buildTraitVector(profile)
  const counts = { measured: 0, mapped: 0, mythic: 0 }
  for (const item of vector) {
    if (counts[item.evidence_tier] !== undefined) counts[item.evidence_tier] += 1
  }
  return counts
}

export { SYMBOL_LIBRARY }
