// src/lib/care/index.js
//
// The Care Protocol engine — public surface.
//
// PORTABILITY IS THE POINT. Per the project brief's architectural resolution:
// computation, quiz scoring, the card data model and the card renderer are one
// package that does not care where it lives. Nothing in this directory imports
// from the NextUs app, from Supabase, from React, or from anything else in the
// repo except the design tokens (renderer only). Placement is therefore only
// ever a question of "where does this ship next", never a rewrite.
//
// Heavy: chart.js pulls in an ephemeris library. Load this module with a
// dynamic import() so it is code-split out of the main bundle.

export { computeChart, birthFromParts, birthInstantUTC, formatPosition, SIGNS, ELEMENTS, MODALITIES } from './chart'
export { computeHumanDesign, designInstant, TYPE_GUIDANCE, AUTHORITY_GUIDANCE } from './humanDesign'
export { chineseZodiac, numerology } from './computed'
export { buildTraitVector, scoresByInstrument, completion, vectorDigest } from './traitVector'
export { buildCard, computeFromBirth, SYMBOL_LIBRARY } from './cardModel'
export {
  INSTRUMENTS, CORE_INSTRUMENTS, DEEPEN_INSTRUMENTS, INSTRUMENTS_BY_ID,
  COMPUTED_SYSTEMS, PARKED_INSTRUMENTS, EVIDENCE_TIERS,
} from './instruments'
export { CARE_MODES, rankedCareModes } from './instruments/careReceiving'
export { attachmentReading, NORMS as ECR_NORMS } from './instruments/ecrRS'
export { doshaReading, DOSHA_GUIDANCE } from './instruments/dosha'
export { DIMENSION_LABELS as BIG5_LABELS } from './instruments/ipip50'
export { WHEEL, CENTRES, CENTRE_LABELS, CHANNELS, gateLine } from './wheel'
export { computeTransits, aspectBetween, moonPhase, humanDesignToday } from './transits'
export {
  natalAspects, incarnationCross, crossAngle, computeDepthDaily,
  GATE_NAMES, CHANNEL_NAMES, TYPE_KEYNOTES,
} from './depth'

export const ENGINE_VERSION = '1.0.0'
