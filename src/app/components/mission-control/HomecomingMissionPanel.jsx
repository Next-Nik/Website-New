// src/app/components/mission-control/HomecomingMissionPanel.jsx
//
// The write-back surface: Homecoming's signal, shown on Mission Control so the
// ecosystem reflects the set-point work back. Read-only, founder-only. Reads
// Homecoming's own tables and reuses the portable engine's math — no felt
// content (states, urges, the covenant) ever leaves the private tool; only the
// thin signal (rep cadence, set-point direction, the target line, the guardian
// in focus) surfaces here.

import { useState, useEffect } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { fn, fnText, mono, display, space } from '../../../lib/designTokens'
import { repDaysInWindow, trendDirection, POSTS_BY_ID } from '../../../lib/homecoming'

export default function HomecomingMissionPanel({ userId, onNavigate }) {
  const [profile, setProfile] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    let alive = true
    ;(async () => {
      const [p, e] = await Promise.all([
        supabase.from('homecoming_profile').select('target_state, guards').eq('user_id', userId).maybeSingle(),
        supabase.from('homecoming_entries').select('kind, value, created_at').eq('user_id', userId)
          .order('created_at', { ascending: false }).limit(300),
      ])
      if (!alive) return
      setProfile((p && p.data) || null)
      setEntries((e && e.data) || [])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [userId])

  if (loading) return <div style={S.wrap}><div style={S.muted}>Reading…</div></div>

  const open = () => onNavigate && onNavigate('/homecoming')

  if (!profile) {
    return (
      <div style={S.wrap}>
        <div style={S.muted}>Homecoming is ready when you are.</div>
        <button style={S.btn} onClick={open}>Open Homecoming →</button>
      </div>
    )
  }

  const repDays = repDaysInWindow(entries, 30)
  const dir = trendDirection(entries.filter(x => x.kind === 'setpoint'))
  const dirWord = dir === 'easing' ? 'easing down' : dir === 'rising' ? 'up this stretch'
    : dir === 'holding' ? 'holding' : 'still gathering'
  const startPost = profile.guards && profile.guards.placement && profile.guards.placement.startPost
  const guardian = startPost ? POSTS_BY_ID[startPost] : null

  return (
    <div style={S.wrap}>
      {profile.target_state && <div style={S.target}>“{profile.target_state}”</div>}
      <div style={S.line}>{repDays} rep-days in the last 30. Set-point {dirWord}.</div>
      {guardian && <div style={S.line}>In focus: <b style={{ color: fn.moss }}>{guardian.role}</b> · {guardian.domain}.</div>}
      <button style={S.btn} onClick={open}>Open Homecoming →</button>
    </div>
  )
}

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: space.md },
  muted: { ...fnText, fontSize: 14, color: fn.ghost },
  target: { ...display, fontSize: 18, lineHeight: 1.4, color: fn.ink },
  line: { ...fnText, fontSize: 14, color: fn.meta, lineHeight: 1.5 },
  btn: { ...mono, fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', alignSelf: 'flex-start',
    color: fn.moss, background: fn.mossTint, border: `1px solid ${fn.mossEdge}`, borderRadius: 12, padding: '9px 15px', cursor: 'pointer' },
}
