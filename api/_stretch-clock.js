// _stretch-clock.js
// Shared clock computation for Target Stretch sessions.
// Used by actor-calls.js (serverless) and can be imported by the front-end
// if needed (the JSX version lives in TargetSprint.jsx as computeClock).

function computeClock(type, durationDays) {
  const today = new Date()
  const fmt = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const dur = durationDays || 90

  if (type === 'calendar') {
    const month = today.getMonth()
    let qEnd
    if (month < 3)      qEnd = new Date(today.getFullYear(), 2, 31)
    else if (month < 6) qEnd = new Date(today.getFullYear(), 5, 30)
    else if (month < 9) qEnd = new Date(today.getFullYear(), 8, 30)
    else                qEnd = new Date(today.getFullYear(), 11, 31)
    const qL = month < 3 ? 'Q1' : month < 6 ? 'Q2' : month < 9 ? 'Q3' : 'Q4'
    const days = Math.round((qEnd - today) / 86400000)
    return {
      quarterType:   'calendar',
      targetDate:    qEnd.toISOString().slice(0, 10),
      endDateLabel:  `${qL} end — ${fmt(qEnd)} (${days} days)`,
    }
  }

  const rolling = new Date(today)
  rolling.setDate(rolling.getDate() + dur)
  return {
    quarterType:   'rolling',
    targetDate:    rolling.toISOString().slice(0, 10),
    endDateLabel:  `${dur} days — ${fmt(rolling)}`,
  }
}

module.exports = { computeClock }
