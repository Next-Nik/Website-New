// ─── WISH STAGE LOCAL LOGIC (TESTABLE SLICE) ─────────────────────────────────
// Mirrors the local helpers from _pp-wish-stage.js with no external deps.
// Used for testing the classification and phase detection logic in isolation.

// Signals that a wish is framed negatively — i.e., the person is asking for
// something to be removed/ended rather than for something to exist.
//
// We look for *wish-to-remove* patterns, not just negative-valence vocabulary.
// A sentence like "I feel like most suffering comes from disconnection" uses
// negative words but the wish underneath is positive (for connection). We
// shouldn't misread it as a negative wish.
//
// Two categories of negative-wish signals:
//   A) Explicit wish-to-remove verbs attached to the wish ("wish we'd stop...", "want to end...", "need to eradicate...")
//   B) Wish framed as absence or freedom-from ("world without X", "free from Y")
const NEGATIVE_WISH_PATTERNS = [
  // A) Wish + removal verb
  /\b(wish|want|need|hope|pray).{0,20}(stop|end|eradicate|eliminate|get rid of|abolish|destroy)\b/i,
  /\b(wish|want|need).{0,20}\b(less|no more)\b/i,
  /\b(didn't|doesn't|wouldn't|shouldn't)\s+(have|need|exist|feel)\b/i,
  // B) Freedom-from framing
  /\bfree (from|of)\b/i,
  /\bwithout .{0,30}\b(violence|suffering|destruction|war|poverty|hunger|corruption|fear|anxiety)\b/i,
  /\bworld without\b/i,
  /\bno more\b/i,
  // C) Direct negations as primary wish
  /\b(stop|end|eradicate|eliminate)\s+(the|these|this|all)\b/i,
]

// Kept for granular flag-checking — these are valence signals, not wish-shape
// signals. A wish can contain these without being a negative wish.
const NEGATIVE_VALENCE_WORDS = [
  /\bdestruction\b/i, /\bviolence\b/i, /\bsuffering\b/i,
  /\bhate\b/i, /\bbroken\b/i, /\btoxic\b/i, /\bdamag/i, /\bharm/i,
]

const PERSONAL_SIGNALS = [
  /\bmy kids?\b/i, /\bmy child(ren)?\b/i, /\bmy family\b/i, /\bmy partner\b/i,
  /\bmy community\b/i, /\bmy town\b/i, /\bmy neighbourhood\b/i, /\bmy neighborhood\b/i,
  /\bmy friends?\b/i, /\bmy parents?\b/i, /\bmy (mom|mum|dad)\b/i,
]

function isScattered(text) {
  const lower = text.toLowerCase()
  const commaCount = (lower.match(/,/g) || []).length
  const andCount   = (lower.match(/\band\b/gi) || []).length
  return (commaCount + andCount) >= 3
}

function isNegative(text) {
  return NEGATIVE_WISH_PATTERNS.some(re => re.test(text))
}

function isPersonal(text) {
  return PERSONAL_SIGNALS.some(re => re.test(text))
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function isThinWish(text) {
  if (wordCount(text) < 4) return true
  const lower = text.toLowerCase().trim()
  if (['idk', 'i don\'t know', 'not sure', 'no idea', 'dunno'].includes(lower)) return true
  return false
}

// Phase detection with explicit priority:
//   1. thin → thin_probe
//   2. scattered → focusing
//   3. personal → personal_to_structural  (personal root matters more than negative framing)
//   4. negative → conversion
//   5. default → deepening
function detectPhase(session, latestInput, exchangeCount) {
  if (isThinWish(latestInput)) return 'thin_probe'

  if (exchangeCount === 1) {
    if (isScattered(latestInput))  return 'focusing'
    if (isPersonal(latestInput))   return 'personal_to_structural'
    if (isNegative(latestInput))   return 'conversion'
    return 'deepening'
  }

  if (exchangeCount === 2) {
    return 'deepening'
  }

  return 'extract'
}

module.exports = { isNegative, isPersonal, isScattered, isThinWish, wordCount, detectPhase }
