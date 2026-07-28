// src/lib/homecoming/guards.js
//
// Pure predicates for the six guards. No state, no side effects — the page
// feeds these the entry rows and renders accordingly.
//
// PORTABLE: pure functions.

// Local calendar day key (YYYY-MM-DD) for an ISO timestamp or Date.
export function dayKey(ts) {
  const d = ts instanceof Date ? ts : new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// G1 · Small is the heroic act — has today's Return already landed?
// entries: [{kind, created_at}], now: Date
export function isDoneToday(entries, now = new Date()) {
  const today = dayKey(now)
  return (entries || []).some(e => e.kind === 'return' && dayKey(e.created_at) === today)
}

// How many Returns happened today. More than one is the revved state looking
// for a job — the UI names that gently rather than rewarding the extra reps.
export function returnsToday(entries, now = new Date()) {
  const today = dayKey(now)
  return (entries || []).filter(e => e.kind === 'return' && dayKey(e.created_at) === today).length
}

// Soft trend, never a breakable chain: how many distinct days carried a Return
// in the trailing `windowDays`. Read the month, not the morning.
export function repDaysInWindow(entries, windowDays = 30, now = new Date()) {
  const cutoff = now.getTime() - windowDays * 86400000
  const days = new Set(
    (entries || [])
      .filter(e => e.kind === 'return' && new Date(e.created_at).getTime() >= cutoff)
      .map(e => dayKey(e.created_at))
  )
  return days.size
}
