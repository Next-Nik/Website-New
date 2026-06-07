// ─────────────────────────────────────────────────────────────────────────────
// useStreak.js
//
// Manages the Horizon Practice streak.
//
// Responsibilities:
//   - Load streak row from horizon_practice_streak on mount
//   - Compute whether today is a committed day (based on cadence)
//   - Detect a broken streak (committed day passed with no engagement)
//   - Record engagement (upsert last_engaged_date, advance streak_current)
//   - Check for 21/40 day milestones
//   - Set / clear navigator.setAppBadge (Android only — no-op elsewhere)
//   - Expose: streak, streakLoading, isCadenceDay, streakBroken,
//             recordEngagement, saveCadence, clearMilestone
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  // YYYY-MM-DD in local time
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function dayOfWeek() {
  return new Date().getDay() // 0=Sun … 6=Sat
}

function dateStrToDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function diffDays(a, b) {
  // Days between two Date objects (floor)
  return Math.floor((b - a) / 86400000)
}

// Is `dateStr` (YYYY-MM-DD) a committed day for this cadence?
function isCadenceDayFor(cadence, customDays, dateStr) {
  const d = dateStrToDate(dateStr)
  const dow = d ? d.getDay() : dayOfWeek()
  if (cadence === 'daily')    return true
  if (cadence === 'weekdays') return dow >= 1 && dow <= 5
  if (cadence === '3x')       return [1, 3, 5].includes(dow) // Mon/Wed/Fri
  if (cadence === 'custom')   return (customDays || []).includes(dow)
  return true
}

// How many consecutive committed days back from `fromStr` has the user hit,
// given `engagedDates` (Set of YYYY-MM-DD strings)?
function computeStreak(cadence, customDays, engagedDates, fromStr) {
  let streak = 0
  const from = dateStrToDate(fromStr) || new Date()
  const cursor = new Date(from)
  // Walk backwards up to 500 days
  for (let i = 0; i < 500; i++) {
    const str = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`
    if (isCadenceDayFor(cadence, customDays, str)) {
      if (engagedDates.has(str)) {
        streak++
      } else {
        break // gap — streak ends
      }
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// ── Badge API ─────────────────────────────────────────────────────────────────

function setBadge() {
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(1).catch(() => {})
  }
}

function clearBadge() {
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {})
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStreak(user) {
  const [streak, setStreak]           = useState(null)   // full row from DB
  const [streakLoading, setLoading]   = useState(true)
  const [streakBroken, setStreakBroken] = useState(false) // show return prompt
  const [pendingMilestone, setPendingMilestone] = useState(null) // 21 | 40 | null
  const engagedRef = useRef(new Set())

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    let cancelled = false

    async function load() {
      setLoading(true)

      // Fetch or create streak row
      let { data: row } = await supabase
        .from('horizon_practice_streak')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!row) {
        const { data: created } = await supabase
          .from('horizon_practice_streak')
          .insert({ user_id: user.id, cadence: 'daily' })
          .select('*')
          .maybeSingle()
        row = created
      }

      if (cancelled || !row) { setLoading(false); return }

      // Fetch recent engagement dates (last 60 days) from morning runs
      const since = new Date()
      since.setDate(since.getDate() - 60)
      const sinceStr = `${since.getFullYear()}-${String(since.getMonth()+1).padStart(2,'0')}-${String(since.getDate()).padStart(2,'0')}`

      const { data: runs } = await supabase
        .from('horizon_practice_morning_runs')
        .select('run_date')
        .eq('user_id', user.id)
        .gte('run_date', sinceStr)

      if (cancelled) return

      const engaged = new Set((runs || []).map(r => r.run_date))
      engagedRef.current = engaged

      const today = todayStr()
      const { cadence, custom_days: customDays } = row

      // Recompute streak from today or last engaged date
      const fromDate = engaged.has(today) ? today : row.last_engaged_date || today
      const current = computeStreak(cadence, customDays, engaged, fromDate)

      // Detect broken streak: yesterday was a committed day and wasn't engaged
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`
      const wasBroken = !engaged.has(today) &&
        row.streak_current > 0 &&
        isCadenceDayFor(cadence, customDays, yStr) &&
        !engaged.has(yStr)

      // Badge: set if today is committed day and not yet engaged
      if (isCadenceDayFor(cadence, customDays, today) && !engaged.has(today)) {
        if (row.badge_permission) setBadge()
      } else {
        clearBadge()
      }

      setStreak({ ...row, streak_current: current })
      setStreakBroken(wasBroken)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [user?.id])

  // ── Record engagement ────────────────────────────────────────────────────────
  const recordEngagement = useCallback(async () => {
    if (!user?.id || !streak) return

    const today = todayStr()
    if (engagedRef.current.has(today)) return // already recorded today

    engagedRef.current.add(today)
    clearBadge()
    setStreakBroken(false)

    const { cadence, custom_days: customDays } = streak
    const newCurrent = computeStreak(cadence, customDays, engagedRef.current, today)
    const newLongest = Math.max(streak.streak_longest || 0, newCurrent)

    // Milestone check
    let milestone21At = streak.milestone_21_at
    let milestone40At = streak.milestone_40_at
    if (newCurrent >= 21 && !milestone21At) {
      milestone21At = new Date().toISOString()
      setPendingMilestone(21)
    }
    if (newCurrent >= 40 && !milestone40At) {
      milestone40At = new Date().toISOString()
      setPendingMilestone(40)
    }

    const updates = {
      streak_current:   newCurrent,
      streak_longest:   newLongest,
      last_engaged_date: today,
      milestone_21_at:  milestone21At,
      milestone_40_at:  milestone40At,
    }

    await supabase
      .from('horizon_practice_streak')
      .update(updates)
      .eq('user_id', user.id)

    setStreak(s => ({ ...s, ...updates }))
  }, [user?.id, streak])

  // ── Save cadence ─────────────────────────────────────────────────────────────
  const saveCadence = useCallback(async (cadence, customDays) => {
    if (!user?.id) return
    const updates = { cadence, custom_days: customDays || null }
    await supabase
      .from('horizon_practice_streak')
      .update(updates)
      .eq('user_id', user.id)
    setStreak(s => ({ ...s, ...updates }))
  }, [user?.id])

  // ── Save badge permission ────────────────────────────────────────────────────
  const saveBadgePermission = useCallback(async (granted) => {
    if (!user?.id) return
    await supabase
      .from('horizon_practice_streak')
      .update({ badge_permission: granted })
      .eq('user_id', user.id)
    setStreak(s => ({ ...s, badge_permission: granted }))
    if (granted) {
      const today = todayStr()
      if (!engagedRef.current.has(today)) setBadge()
    } else {
      clearBadge()
    }
  }, [user?.id])

  // ── Clear milestone ──────────────────────────────────────────────────────────
  const clearMilestone = useCallback(() => setPendingMilestone(null), [])

  return {
    streak,
    streakLoading,
    streakBroken,
    pendingMilestone,
    isCadenceDay: streak
      ? isCadenceDayFor(streak.cadence, streak.custom_days, todayStr())
      : false,
    recordEngagement,
    saveCadence,
    saveBadgePermission,
    clearMilestone,
  }
}
