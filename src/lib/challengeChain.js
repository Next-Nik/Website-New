// src/lib/challengeChain.js
//
// The chain: days (or weeks) of kept word, computed purely from log dates.
// Deterministic, no storage, no new tables — the same dates always produce
// the same chain for every surface that renders it.
//
// Rules:
//  • A period is KEPT when it has at least one log ("presence keeps the day").
//    daily-absolute is the exception downstream: the caller can pass
//    requireAll and per-period strand counts if it wants sweep-to-keep.
//  • Grace: one grace day accrues per 7 kept days, at most 2 banked. Walking
//    back from today, a single-day gap consumes a banked grace silently and
//    the chain holds. Two-day gaps (or empty grace) end the chain.
//  • Weekly/monthly cadences use ISO-ish periods; grace applies to daily only.

function dstr(d) { return d.toISOString().slice(0, 10) }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

function weekKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = (d.getUTCDay() + 6) % 7            // Monday = 0
  const monday = addDays(d, -day)
  return dstr(monday)
}
function monthKey(dateStr) { return dateStr.slice(0, 7) }

export function computeChain({ doneDates = [], cadence = 'daily-flexible', today = null }) {
  const t = today || dstr(new Date())
  const dates = new Set(doneDates)
  const keptToday = dates.has(t)

  if (cadence === 'once') {
    return { unit: 'summit', kept: doneDates.length ? 1 : 0, keptToday,
             graceBanked: 0, graceUsedYesterday: false, broke: false }
  }

  if (cadence === 'weekly' || cadence === 'monthly') {
    const keyOf = cadence === 'weekly' ? weekKey : monthKey
    const periods = new Set(doneDates.map(keyOf))
    const unit = cadence === 'weekly' ? 'weeks' : 'months'
    const nowKey = keyOf(t)
    let kept = 0
    let cursor = nowKey
    const keptThis = periods.has(nowKey)
    // walk back period by period; the current open period never breaks a chain
    if (!keptThis) cursor = prevKey(cursor, cadence)
    while (periods.has(cursor)) { kept++; cursor = prevKey(cursor, cadence) }
    return { unit, kept, keptToday: keptThis, graceBanked: 0, graceUsedYesterday: false, broke: false }
  }

  // daily cadences
  let kept = 0
  let graceUsed = 0
  let graceUsedYesterday = false
  let cursor = t
  if (!dates.has(cursor)) cursor = dstr(addDays(new Date(t + 'T12:00:00Z'), -1)) // today open ≠ broken
  let gapRun = 0
  while (true) {
    if (dates.has(cursor)) {
      kept++
      gapRun = 0
    } else {
      gapRun++
      graceUsed++
      if (gapRun > 1) { graceUsed = Math.max(0, graceUsed - 2); break } // the ending gap never covered anything: refund both provisional days
      // provisional grace; validated against the bank after we know kept total
      if (cursor === dstr(addDays(new Date(t + 'T12:00:00Z'), -1))) graceUsedYesterday = true
    }
    cursor = dstr(addDays(new Date(cursor + 'T12:00:00Z'), -1))
    if (kept + graceUsed > 400) break // safety
  }
  // the bank: 1 per 7 kept, max 2. If more grace was needed than earned, the
  // chain truncates at the first uncovered gap — recompute strictly.
  const earned = Math.min(2, Math.floor(kept / 7))
  if (graceUsed > earned) {
    return computeStrict(dates, t, earned)
  }
  return { unit: 'days', kept, keptToday,
           graceBanked: Math.max(0, earned - graceUsed),
           graceUsedYesterday: graceUsedYesterday && graceUsed > 0 && graceUsed <= earned,
           broke: false }
}

function computeStrict(dates, t, bank) {
  let kept = 0, used = 0, graceUsedYesterday = false
  let cursor = t
  const keptToday = dates.has(t)
  if (!dates.has(cursor)) cursor = dstr(addDays(new Date(t + 'T12:00:00Z'), -1))
  while (true) {
    if (dates.has(cursor)) kept++
    else if (used < bank) {
      used++
      if (cursor === dstr(addDays(new Date(t + 'T12:00:00Z'), -1))) graceUsedYesterday = true
    } else break
    cursor = dstr(addDays(new Date(cursor + 'T12:00:00Z'), -1))
    if (kept + used > 400) break
  }
  return { unit: 'days', kept, keptToday,
           graceBanked: Math.max(0, bank - used), graceUsedYesterday, broke: kept === 0 }
}

function prevKey(key, cadence) {
  if (cadence === 'weekly') return dstr(addDays(new Date(key + 'T12:00:00Z'), -7))
  const [y, m] = key.split('-').map(Number)
  const pm = m === 1 ? 12 : m - 1
  const py = m === 1 ? y - 1 : y
  return `${py}-${String(pm).padStart(2, '0')}`
}

// The last-14 dot row for daily consoles: 'on' | 'grace' | 'off' | 'today'
export function dotRow({ doneDates = [], today = null, chain = null }) {
  const t = today || dstr(new Date())
  const dates = new Set(doneDates)
  const out = []
  for (let i = 13; i >= 0; i--) {
    const d = dstr(addDays(new Date(t + 'T12:00:00Z'), -i))
    if (d === t) out.push(dates.has(d) ? 'on' : 'today')
    else if (dates.has(d)) out.push('on')
    else if (chain && chain.graceUsedYesterday && i === 1) out.push('grace')
    else out.push('off')
  }
  return out
}
