// src/lib/homecoming/evidence.js
//
// Pure math for the Evidence surface. The set-point moves slowly under daily
// noise, so every read here favours the trailing average over any single day —
// "read the month, not the morning" made literal.
//
// PORTABLE: pure functions.

import { dayKey } from './guards'

// Rolling average of the set-point proxy (resting HR/HRV, or a 1–10 baseline).
// points: [{created_at, value}] -> [{day, value, avg}] oldest→newest, with a
// trailing simple moving average of length `window`.
export function setpointTrend(points, window = 7) {
  const valid = (points || [])
    .filter(p => typeof p.value === 'number' && !Number.isNaN(p.value))
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  // One reading per day: the latest wins. Ascending sort means the last set()
  // for a given day is the newest, so several reads in a day never skew the
  // trailing average — the day counts once.
  const byDay = new Map()
  for (const p of valid) byDay.set(dayKey(p.created_at), p.value)
  const rows = [...byDay.entries()].map(([day, value]) => ({ day, value }))

  return rows.map((r, i) => {
    const from = Math.max(0, i - window + 1)
    const slice = rows.slice(from, i + 1)
    const avg = slice.reduce((s, x) => s + x.value, 0) / slice.length
    return { ...r, avg: Math.round(avg * 100) / 100 }
  })
}

// Direction of travel over the window, using averages so a single spike can't
// flip it. Returns 'easing' | 'holding' | 'rising' | null.
export function trendDirection(points, window = 7) {
  const t = setpointTrend(points, window)
  if (t.length < 2) return null
  const first = t[0].avg
  const last = t[t.length - 1].avg
  const delta = last - first
  const eps = Math.max(0.5, Math.abs(first) * 0.03)
  if (delta < -eps) return 'easing'
  if (delta > eps) return 'rising'
  return 'holding'
}

// Simple tallies for the proof file.
export function evidenceSummary(entries) {
  const e = entries || []
  return {
    receipts: e.filter(x => x.kind === 'receipt').length,
    urges: e.filter(x => x.kind === 'urge').length,
    returns: e.filter(x => x.kind === 'return').length,
    landed: e.filter(x => x.kind === 'receipt' && x.landed === true).length,
  }
}
