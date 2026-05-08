// ─────────────────────────────────────────────────────────────
// domainScore.js
//
// Pure functions. Computes a 0–10 score for an indicator and a
// 0–10 rollup score for a domain.
//
// Design choices (locked Drop B-2):
//
//   • Headline-only — only is_headline indicators contribute.
//   • Linear normalisation against target_value / floor_value
//     supplied per indicator in the catalog.
//   • Direction flip — 'down' indicators invert before
//     normalisation so that low values become high scores.
//   • 'context' indicators NEVER contribute to the rollup. They
//     are descriptive, not aspirational.
//   • Equal weight by default (rollup_weight = 1.0). Catalog
//     authors can adjust per indicator.
//   • Freshness gate — only fresh indicators contribute. An
//     indicator with no value, or a stale value, is excluded.
//   • Coverage floor — if fewer than 50% of headline indicators
//     are fresh-and-current, the domain score returns null. The
//     wheel then renders the spoke as unscored rather than
//     showing a misleading number.
//   • No score = no vertex — civ wheel polygon only includes
//     domains where score !== null. This is enforced upstream in
//     MissionWheel; the rollup only needs to return null cleanly.
//
// All math is clamp(0, 10). Negative or out-of-band values land
// at the edges, never below zero or above ten.
// ─────────────────────────────────────────────────────────────

const COVERAGE_FLOOR = 0.5

// Compute a 0–10 score for a single indicator.
//
// Returns null if:
//   - No target/floor set
//   - 'context' direction
//   - No value
//   - Stale value
//   - target == floor (cannot normalise)
export function computeIndicatorScore(indicator) {
  if (!indicator) return null
  if (indicator.direction_preferred === 'context') return null
  if (indicator.target_value == null || indicator.floor_value == null) return null
  if (indicator.target_value === indicator.floor_value) return null

  const value = indicator.value?.numeric
  if (value == null) return null
  if (indicator.is_fresh === false) return null

  const target = Number(indicator.target_value)
  const floor  = Number(indicator.floor_value)

  // Linear normalisation. For 'up' direction (target > floor) values
  // higher than target score 10, values below floor score 0. For 'down'
  // direction (target < floor — i.e. less is better) values below target
  // score 10, values above floor score 0. Same formula handles both
  // because we don't assume target > floor.
  const range = target - floor
  let raw = (value - floor) / range
  // Clamp into 0..1, multiply to 0..10
  if (raw < 0) raw = 0
  if (raw > 1) raw = 1
  return Math.round(raw * 100) / 10  // 0.0..10.0 with one decimal
}

// Compute a 0–10 rollup for an array of headline indicators (the
// shape returned by useDomainIndicators / fetchAllIndicators).
//
// Returns:
//   { score: 0..10 | null, contributing, total, fresh, scored }
//   - score: rollup or null if coverage floor not met
//   - contributing: number of indicators that produced a score
//   - total: number of headline indicators in the input
//   - fresh: number of indicators with fresh values
//   - scored: array of {name, score, weight} for transparency
export function computeDomainScore(headlineIndicators) {
  const total = Array.isArray(headlineIndicators) ? headlineIndicators.length : 0
  if (total === 0) return { score: null, contributing: 0, total: 0, fresh: 0, scored: [] }

  const scored = []
  let fresh = 0
  for (const ind of headlineIndicators) {
    if (ind?.is_fresh) fresh++
    const s = computeIndicatorScore(ind)
    if (s != null) {
      scored.push({
        name: ind.name,
        score: s,
        weight: Number(ind.rollup_weight ?? 1.0),
      })
    }
  }

  if (scored.length === 0) {
    return { score: null, contributing: 0, total, fresh, scored: [] }
  }

  // Coverage gate: at least half of headline indicators must contribute.
  // (Indicators excluded as 'context' don't count against coverage —
  // they were never in the rollup pool to begin with.)
  const eligibleCount = headlineIndicators.filter(ind =>
    ind?.direction_preferred !== 'context' &&
    ind?.target_value != null &&
    ind?.floor_value != null
  ).length
  if (eligibleCount > 0 && (scored.length / eligibleCount) < COVERAGE_FLOOR) {
    return { score: null, contributing: scored.length, total, fresh, scored }
  }

  const sumW = scored.reduce((acc, s) => acc + s.weight, 0)
  if (sumW === 0) return { score: null, contributing: scored.length, total, fresh, scored }
  const weighted = scored.reduce((acc, s) => acc + s.score * s.weight, 0)
  const score = Math.round((weighted / sumW) * 10) / 10  // round to one decimal

  return { score, contributing: scored.length, total, fresh, scored }
}

// Convenience for tests / debugging.
export const __test = {
  COVERAGE_FLOOR,
}
