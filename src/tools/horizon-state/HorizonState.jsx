import { useState, useRef, useEffect } from 'react'
import { ToolCompassPanel } from '../../components/ToolCompassPanel'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { supabase } from '../../hooks/useSupabase'
import { FlamePicker, FlameGlyph, FlameSlider } from '../../components/FlameCheckIn'
import { ProtocolPanel } from '../../components/ProtocolPanel'
import { AccessGate } from '../../components/AccessGate'
import { DebriefPanel } from '../../components/DebriefPanel'

const AUDIO_FILE = 'foundation-baseline.mp3'
const BUCKET     = 'nextus-audio'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const gold  = { color: '#A8721A' }
const muted = { color: 'rgba(15,21,35,0.72)' }
const meta  = { color: 'rgba(15,21,35,0.78)' }

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function getWeekId(date = new Date()) {
  const d = new Date(date); d.setHours(0,0,0,0)
  const day = d.getDay()
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7))
  return `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`
}
function getMonthId(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
}
function getQuarterId(date = new Date()) {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth()/3)+1}`
}
function getYearId(date = new Date()) { return String(date.getFullYear()) }

// ─── Summary writer ───────────────────────────────────────────────────────────
// Called after every after check-in. Computes and upserts foundation_summary.

export async function writeSummary(user, allSessions, afterResult, beforeResult) {
  if (!user?.id) return
  try {
    const now     = new Date()
    const today   = getLocalDateStr(now)

    // Pair up before/after by date
    const pairs = []
    const befores = allSessions.filter(s => s.checkin_stage === 'before')
    const afters  = allSessions.filter(s => s.checkin_stage === 'after')
    afters.forEach(a => {
      const dateStr = a.completed_at?.slice(0, 10)
      const b = befores.find(b => b.completed_at?.slice(0, 10) === dateStr)
      if (b) pairs.push({
        date:         dateStr,
        before:       b.value,
        after:        a.value,
        note_before:  b.note || null,
        note_after:   a.note || null,
      })
    })
    // Sort newest first
    pairs.sort((a, b) => b.date.localeCompare(a.date))

    // Average delta (all pairs)
    const avgDelta = pairs.length > 0
      ? parseFloat((pairs.reduce((sum, p) => sum + (p.after - p.before), 0) / pairs.length).toFixed(2))
      : 0

    // Streak — consecutive days with at least one after check-in
    const afterDates = [...new Set(afters.map(s => s.completed_at?.slice(0, 10)).filter(Boolean))].sort().reverse()
    let streak = 0
    let cursor = new Date(today)
    for (const d of afterDates) {
      const expected = getLocalDateStr(cursor)
      if (d === expected) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }

    // Sessions this week
    const weekId = getWeekId(now)
    const sessionsWeek = afters.filter(s => s.week_id === weekId).length

    // Spark data — last 14 pairs for sparkline
    const sparkData = pairs.slice(0, 14).map(p => ({
      date:        p.date,
      before:      p.before,
      after:       p.after,
      note_before: p.note_before,
      note_after:  p.note_after,
    }))

    // Last session
    const last = pairs[0] || null

    // Latest review — fetch most recent
    const { data: reviewData } = await supabase
      .from('horizon_state_reviews')
      .select('review_text, period_label, period_type')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const latestReview = reviewData?.review_text
      ? reviewData.review_text.split('\n\n')[0].slice(0, 300)
      : null

    await supabase.from('horizon_state_summary').upsert({
      user_id:          user.id,
      streak_days:      streak,
      sessions_total:   pairs.length,
      sessions_week:    sessionsWeek,
      avg_delta:        avgDelta,
      last_session_at:  last ? `${last.date}T00:00:00Z` : null,
      last_before:      last?.before ?? null,
      last_after:       last?.after  ?? null,
      last_before_note: last?.note_before ?? null,
      last_after_note:  last?.note_after  ?? null,
      latest_review:    latestReview,
      phase:            'baseline',
      spark_data:       sparkData,
      updated_at:       now.toISOString(),
    }, { onConflict: 'user_id' })
  } catch(e) {
    console.warn('[Foundation] Summary write failed:', e)
  }
}


function periodLabel(type, id) {
  if (type === 'weekly') {
    const [y, m, d] = id.split('-')
    const mon = new Date(+y, +m-1, +d)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    const fmt = dt => `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]} ${dt.getDate()}`
    return `${fmt(mon)} – ${fmt(sun)}`
  }
  if (type === 'monthly') {
    const [y, m] = id.split('-')
    return `${['January','February','March','April','May','June','July','August','September','October','November','December'][+m-1]} ${y}`
  }
  if (type === 'quarterly') return id.replace('-', ' ')
  if (type === 'annual')    return id
  return id
}

// ─── Mobile styles ───────────────────────────────────────────────────────────

const MOBILE_STYLES = `
  @media (max-width: 640px) {
    .baseline-layout {
      flex-direction: column !important;
      gap: 32px !important;
    }
    .baseline-before  { order: 1; width: 100% !important; opacity: 1 !important; }
    .baseline-audio   { order: 2; width: 100% !important; min-height: auto !important; }
    .baseline-after   { order: 3; width: 100% !important; }
    .baseline-audio .audio-player-inner {
      min-height: auto !important;
    }
  }
`

// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({ url, onEnded, onNearEnd, locked }) {
  const audioRef                = useRef(null)
  const nearEndFiredRef         = useRef(false)
  const [playing, setPlaying]   = useState(false)
  const [current, setCurrent]   = useState(0)
  const [duration, setDuration] = useState(0)
  const [loaded, setLoaded]     = useState(false)

  useEffect(() => {
    const a = new Audio(url)
    a.preload = 'metadata'
    audioRef.current = a
    a.addEventListener('loadedmetadata', () => { setDuration(a.duration); setLoaded(true) })
    a.addEventListener('timeupdate', () => {
      setCurrent(a.currentTime)
      if (!nearEndFiredRef.current && a.duration > 0 && (a.duration - a.currentTime) <= 60) {
        nearEndFiredRef.current = true
        onNearEnd?.()
      }
    })
    a.addEventListener('ended', () => { setPlaying(false); setCurrent(0); a.currentTime = 0; onEnded?.() })
    return () => { a.pause(); a.src = '' }
  }, [url])

  function fmt(s) {
    if (!s || isNaN(s)) return '--:--'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  function toggle() {
    if (locked) return
    const a = audioRef.current; if (!a) return
    if (a.paused) { a.play(); setPlaying(true) }
    else          { a.pause(); setPlaying(false) }
  }

  const pct = duration ? (current / duration) * 100 : 0

  return (
    <div style={{
      padding: '20px 22px',
      background: locked ? 'rgba(200,146,42,0.05)' : '#FFFFFF',
      border: `1.5px solid ${locked ? 'rgba(200,146,42,0.2)' : 'rgba(200,146,42,0.78)'}`,
      borderRadius: '14px',
      transition: 'all 0.4s ease',
      opacity: locked ? 0.55 : 1,
      minHeight: '360px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      {locked && (
        <p style={{ ...body, fontSize: '1.3125rem', ...muted, marginBottom: '14px', lineHeight: 1.6 }}>
          Check-in to unlock the audio.
        </p>
      )}
      <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...muted, marginBottom: '12px' }}>
        Horizon State {'·'} Foundation {'·'} 20 min
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={locked || !loaded}
          style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: playing ? 'rgba(200,146,42,0.1)' : 'rgba(200,146,42,0.05)',
            border: '1.5px solid rgba(200,146,42,0.78)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: locked ? 'not-allowed' : loaded ? 'pointer' : 'wait',
            flexShrink: 0, ...gold, fontSize: '18px', transition: 'all 0.2s',
          }}
        >
          {playing ? '\u23F8' : '\u25B6'}
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div onClick={locked ? undefined : e => {
            const a = audioRef.current; if (!a || !duration || locked) return
            const rect = e.currentTarget.getBoundingClientRect()
            a.currentTime = ((e.clientX - rect.left) / rect.width) * duration
          }} style={{ width: '100%', height: '4px', background: 'rgba(200,146,42,0.15)', borderRadius: '2px', cursor: locked ? 'default' : 'pointer', position: 'relative' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#C8922A', borderRadius: '2px', transition: 'width 0.1s linear' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em', ...muted }}>{fmt(current)}</span>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em', ...muted }}>{fmt(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Auth modal ───────────────────────────────────────────────────────────────

function AuthModal({ onDismiss }) {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div onClick={e => e.target === e.currentTarget && onDismiss()} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '36px 32px 28px', maxWidth: '400px', width: '100%' }}>
        <span style={{ display: 'block', ...sc, fontSize: '15px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '12px' }}>Foundation</span>
        <h2 style={{ ...sc, fontSize: '1.625rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.2, marginBottom: '10px' }}>Sign in to listen.</h2>
        <p style={{ ...body, fontSize: '1.25rem', fontWeight: 300, ...meta, lineHeight: 1.7, marginBottom: '24px' }}>
          Horizon State is part of the Horizon Suite {'—'} a free account keeps your progress and gives you access to the full protocol.
        </p>
        <a href={`/login?redirect=${returnUrl}`} style={{ display: 'block', width: '100%', padding: '14px', textAlign: 'center', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', ...sc, fontSize: '1.125rem', letterSpacing: '0.16em', ...gold, textDecoration: 'none', marginBottom: '12px' }}>
          Sign in or create account {'→'}
        </a>
        <button onClick={onDismiss} style={{ display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', ...body, fontSize: '1.125rem', ...muted, cursor: 'pointer', padding: '4px' }}>
          Not now
        </button>
      </div>
    </div>
  )
}

// ─── Delta display ────────────────────────────────────────────────────────────

function FlameDelta({ before, after }) {
  const delta  = after - before
  const color  = delta > 0 ? '#5A8AB8' : delta < 0 ? '#8A7030' : 'rgba(15,21,35,0.72)'
  const symbol = delta > 0 ? '\u2191' : delta < 0 ? '\u2193' : '—'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '20px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '12px', marginTop: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', ...muted, marginBottom: '8px' }}>BEFORE</div>
        <FlameGlyph value={before} size={40} ghost />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...sc, fontSize: '1.25rem', color, lineHeight: 1 }}>{symbol}</div>
        <div style={{ ...body, fontSize: '15px', color, marginTop: '4px' }}>
          {delta === 0 ? 'holding steady' : `${Math.abs(delta).toFixed(1)} ${delta > 0 ? 'up' : 'down'}`}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', ...muted, marginBottom: '8px' }}>AFTER</div>
        <FlameGlyph value={after} size={40} />
      </div>
    </div>
  )
}

// ─── Foundation Review ────────────────────────────────────────────────────────

function FoundationReview({ user, sessions }) {
  const [loading,       setLoading]       = useState(false)
  const [reviewText,    setReviewText]    = useState('')
  const [error,         setError]         = useState('')
  const [saved,         setSaved]         = useState(null)
  const [showDebrief,   setShowDebrief]   = useState(false)
  const [debriefDone,   setDebriefDone]   = useState(false)
  const [debriefCtx,    setDebriefCtx]    = useState(null)

  const now              = new Date()
  const weekId           = getWeekId(now)
  const sessionsThisWeek = sessions.filter(s => s.week_id === weekId && s.checkin_stage === 'after')
  const weeklyAvailable  = sessionsThisWeek.length >= 3

  async function requestReview(type) {
    setLoading(true); setError(''); setReviewText('')
    try {
      let previousReviews = []
      if (user?.id && supabase) {
        const { data } = await supabase
          .from('horizon_state_reviews')
          .select('period_type, period_label, review_text, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(4)
        previousReviews = data || []
      }
      const periodId = type === 'weekly' ? weekId : type === 'monthly' ? getMonthId(now) : type === 'quarterly' ? getQuarterId(now) : getYearId(now)
      const label    = periodLabel(type, periodId)
      const relevant = sessions.filter(s =>
        type === 'weekly' ? s.week_id === weekId :
        type === 'monthly' ? s.month_id === getMonthId(now) :
        type === 'quarterly' ? s.quarter_id === getQuarterId(now) :
        s.year_id === getYearId(now)
      )
      const res = await fetch('/tools/horizon-state/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: { type, id: periodId, label }, sessions: relevant, previousReviews, userId: user?.id }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const text = data.review || ''
      setReviewText(text)
      // Capture context for debrief — offered after review renders
      if (text) {
        const afters = sessions.filter(s => s.checkin_stage === 'after')
        const periodSessions = relevant.filter(s => s.checkin_stage === 'after')
        const avgDelta = periodSessions.length > 0
          ? parseFloat((periodSessions.reduce((sum, s) => {
              const before = sessions.find(b => b.checkin_stage === 'before' && b.completed_at?.slice(0, 10) === s.completed_at?.slice(0, 10))
              return sum + (before ? s.value - before.value : 0)
            }, 0) / periodSessions.length).toFixed(2))
          : null
        setDebriefCtx({
          periodType:   type,
          periodLabel:  label,
          reviewText:   text,
          sessionCount: periodSessions.length,
          avgDelta,
        })
        setShowDebrief(true)
      }
      if (user?.id && supabase && text) {
        await supabase.from('horizon_state_reviews').upsert({
          user_id: user.id, period_type: type, period_id: periodId, period_label: label,
          session_count: relevant.length, review_text: text,
          created_at: now.toISOString(), updated_at: now.toISOString(),
        }, { onConflict: 'user_id,period_type,period_id' })
        setSaved({ type, label })
        // Refresh summary so profile picks up new review text
        writeSummary(user, sessions, null, null)
      }
    } catch {
      setError('Review unavailable. Please try again shortly.')
    }
    setLoading(false)
  }

  if (!weeklyAvailable) return null

  return (
    <div style={{ marginTop: '32px', padding: '24px 28px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '14px' }}>
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', ...gold, display: 'block', marginBottom: '8px' }}>Foundation Review</span>
      <p style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.7, marginBottom: '20px' }}>
        {sessionsThisWeek.length} sessions this week. A reflection is available.
      </p>
      {!reviewText && !loading && (
        <button onClick={() => requestReview('weekly')} style={{ ...sc, fontSize: '1.3125rem', letterSpacing: '0.14em', ...gold, background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '12px 28px', cursor: 'pointer' }}>
          Request weekly reflection {'→'}
        </button>
      )}
      {loading && <p style={{ ...body, fontSize: '1.125rem', ...muted }}>Reading your practice{'…'}</p>}
      {error && <p style={{ ...body, fontSize: '1.3125rem', color: 'rgba(138,48,48,0.7)' }}>{error}</p>}
      {reviewText && (
        <div style={{ borderLeft: '2px solid rgba(200,146,42,0.35)', padding: '16px 0 16px 20px' }}>
          <p style={{ ...body, fontSize: '1.25rem', lineHeight: 1.85, ...meta, margin: 0 }}>{reviewText}</p>
          {saved && <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', display: 'block', marginTop: '12px' }}>Saved</span>}
        </div>
      )}

      {/* Debrief — offered after review renders, optional */}
      {showDebrief && !debriefDone && debriefCtx && (
        <div style={{ marginTop: '28px' }}>
          <DebriefPanel
            tool="horizon-state"
            toolContext={debriefCtx}
            userId={user?.id}
            mode="light"
            onComplete={() => { setShowDebrief(false); setDebriefDone(true) }}
            onSkip={() => { setShowDebrief(false); setDebriefDone(true) }}
            title={`Reflect on your ${debriefCtx.periodType}`}
          />
        </div>
      )}
    </div>
  )
}

// ─── Foundation Reports ───────────────────────────────────────────────────────
//
// Archive-page surface. Shows stored reviews from horizon_state_reviews
// across all four periods (weekly, monthly, quarterly, yearly), and lets
// the user request a fresh review for the current period when the minimum
// session threshold is met.
//
// This supersedes the older FoundationReview which was weekly-only and
// gated on weeklyAvailable. FoundationReview is preserved above as
// internal reference but is no longer rendered.

function FoundationReports({ user, sessions }) {
  const [activePeriod, setActivePeriod] = useState('weekly')
  const [storedReviews, setStoredReviews] = useState([])
  const [loadingStored, setLoadingStored] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [freshReview, setFreshReview] = useState('')
  const [error, setError] = useState('')
  const [showDebrief, setShowDebrief] = useState(false)
  const [debriefDone, setDebriefDone] = useState(false)
  const [debriefCtx, setDebriefCtx] = useState(null)

  const now         = new Date()
  const weekId      = getWeekId(now)
  const monthId     = getMonthId(now)
  const quarterId   = getQuarterId(now)
  const yearId      = getYearId(now)

  const sessionsThisWeek    = sessions.filter(s => s.week_id    === weekId    && s.checkin_stage === 'after')
  const sessionsThisMonth   = sessions.filter(s => s.month_id   === monthId   && s.checkin_stage === 'after')
  const sessionsThisQuarter = sessions.filter(s => s.quarter_id === quarterId && s.checkin_stage === 'after')
  const sessionsThisYear    = sessions.filter(s => s.year_id    === yearId    && s.checkin_stage === 'after')

  const PERIODS = [
    { key: 'weekly',    label: 'Weekly',    threshold: 3, current: sessionsThisWeek.length,    id: weekId    },
    { key: 'monthly',   label: 'Monthly',   threshold: 8, current: sessionsThisMonth.length,   id: monthId   },
    { key: 'quarterly', label: 'Quarterly', threshold: 20, current: sessionsThisQuarter.length, id: quarterId },
    { key: 'yearly',    label: 'Yearly',    threshold: 40, current: sessionsThisYear.length,    id: yearId    },
  ]

  // Load all stored reviews once
  useEffect(() => {
    if (!user?.id) { setLoadingStored(false); return }
    setLoadingStored(true)
    supabase
      .from('horizon_state_reviews')
      .select('period_type, period_id, period_label, review_text, created_at, session_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => {
        setStoredReviews(data || [])
        setLoadingStored(false)
      })
  }, [user])

  const periodMeta    = PERIODS.find(p => p.key === activePeriod)
  const periodReviews = storedReviews.filter(r => r.period_type === activePeriod)
  const currentPeriodReview = periodReviews.find(r => r.period_id === periodMeta.id) || null
  const pastPeriodReviews   = periodReviews.filter(r => r.period_id !== periodMeta.id)

  // Reset transient state when switching periods
  useEffect(() => {
    setFreshReview('')
    setError('')
    setShowDebrief(false)
    setDebriefDone(false)
    setDebriefCtx(null)
  }, [activePeriod])

  async function requestReview() {
    setRequesting(true); setError(''); setFreshReview('')
    try {
      let previousReviews = []
      if (user?.id) {
        const { data } = await supabase
          .from('horizon_state_reviews')
          .select('period_type, period_label, review_text, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(4)
        previousReviews = data || []
      }
      const label = periodLabel(activePeriod, periodMeta.id)
      const relevant = sessions.filter(s =>
        activePeriod === 'weekly'    ? s.week_id    === weekId    :
        activePeriod === 'monthly'   ? s.month_id   === monthId   :
        activePeriod === 'quarterly' ? s.quarter_id === quarterId :
                                       s.year_id    === yearId
      )
      const res = await fetch('/tools/horizon-state/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: { type: activePeriod, id: periodMeta.id, label }, sessions: relevant, previousReviews, userId: user?.id }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const text = data.review || ''
      setFreshReview(text)

      if (text) {
        const periodSessions = relevant.filter(s => s.checkin_stage === 'after')
        const avgDelta = periodSessions.length > 0
          ? parseFloat((periodSessions.reduce((sum, s) => {
              const before = sessions.find(b => b.checkin_stage === 'before' && b.completed_at?.slice(0, 10) === s.completed_at?.slice(0, 10))
              return sum + (before ? s.value - before.value : 0)
            }, 0) / periodSessions.length).toFixed(2))
          : null
        setDebriefCtx({
          periodType: activePeriod,
          periodLabel: label,
          reviewText: text,
          sessionCount: periodSessions.length,
          avgDelta,
        })
        setShowDebrief(true)
      }

      if (user?.id && text) {
        await supabase.from('horizon_state_reviews').upsert({
          user_id: user.id, period_type: activePeriod, period_id: periodMeta.id, period_label: label,
          session_count: relevant.length, review_text: text,
          created_at: now.toISOString(), updated_at: now.toISOString(),
        }, { onConflict: 'user_id,period_type,period_id' })
        // Refresh stored reviews so the freshly-saved one shows up below
        const { data: refreshed } = await supabase
          .from('horizon_state_reviews')
          .select('period_type, period_id, period_label, review_text, created_at, session_count')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(40)
        setStoredReviews(refreshed || [])
        writeSummary(user, sessions, null, null)
      }
    } catch {
      setError('Reflection unavailable. Please try again shortly.')
    }
    setRequesting(false)
  }

  const reviewBelow = freshReview || currentPeriodReview?.review_text || ''
  const reviewLabel = freshReview
    ? periodLabel(activePeriod, periodMeta.id)
    : currentPeriodReview?.period_label || periodLabel(activePeriod, periodMeta.id)
  const meetsThreshold = periodMeta.current >= periodMeta.threshold

  return (
    <div>
      {/* Period tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(200,146,42,0.18)', marginBottom: '24px' }}>
        {PERIODS.map(p => {
          const isActive = activePeriod === p.key
          return (
            <button
              key={p.key}
              onClick={() => setActivePeriod(p.key)}
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.18em',
                padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: isActive ? '#A8721A' : 'rgba(15,21,35,0.55)',
                borderBottom: isActive ? '2px solid #A8721A' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Current period state */}
      <div style={{ padding: '20px 24px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '14px', marginBottom: '24px' }}>
        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.2em', ...gold, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
          {periodMeta.label} {'·'} {periodLabel(activePeriod, periodMeta.id)}
        </span>
        <p style={{ ...body, fontSize: '15px', ...muted, lineHeight: 1.6, margin: '0 0 12px 0' }}>
          {periodMeta.current} session{periodMeta.current === 1 ? '' : 's'} this period.
          {!meetsThreshold && !currentPeriodReview && (
            <> A reflection becomes available at {periodMeta.threshold}.</>
          )}
        </p>
        {meetsThreshold && !reviewBelow && !requesting && (
          <button
            onClick={requestReview}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', ...gold, background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '10px 22px', cursor: 'pointer' }}
          >
            {currentPeriodReview ? 'Refresh reflection' : 'Request reflection'} {'→'}
          </button>
        )}
        {requesting && <p style={{ ...body, fontSize: '15px', ...muted, margin: 0 }}>Reading your practice{'…'}</p>}
        {error && <p style={{ ...body, fontSize: '15px', color: 'rgba(138,48,48,0.7)', margin: 0 }}>{error}</p>}
      </div>

      {/* Active reflection (current period — fresh or stored) */}
      {reviewBelow && (
        <div style={{ borderLeft: '2px solid rgba(200,146,42,0.35)', padding: '4px 0 4px 20px', marginBottom: '24px' }}>
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(168,114,26,0.7)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            {reviewLabel}
          </span>
          <p style={{ ...body, fontSize: '17px', lineHeight: 1.85, ...meta, margin: 0, whiteSpace: 'pre-wrap' }}>{reviewBelow}</p>
        </div>
      )}

      {/* Debrief — offered after a fresh review renders */}
      {showDebrief && !debriefDone && debriefCtx && (
        <div style={{ marginBottom: '24px' }}>
          <DebriefPanel
            tool="horizon-state"
            toolContext={debriefCtx}
            userId={user?.id}
            mode="light"
            onComplete={() => { setShowDebrief(false); setDebriefDone(true) }}
            onSkip={() => { setShowDebrief(false); setDebriefDone(true) }}
            title={`Reflect on your ${debriefCtx.periodType}`}
          />
        </div>
      )}

      {/* Past reflections in this period type */}
      {pastPeriodReviews.length > 0 && (
        <div>
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: 'rgba(168,114,26,0.7)', textTransform: 'uppercase', display: 'block', marginBottom: '14px' }}>
            Earlier {periodMeta.label.toLowerCase()} reflections
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pastPeriodReviews.map(r => (
              <div key={r.period_id} style={{ borderLeft: '2px solid rgba(200,146,42,0.18)', padding: '4px 0 4px 18px' }}>
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  {r.period_label}
                </span>
                <p style={{ ...body, fontSize: '15px', lineHeight: 1.7, color: 'rgba(15,21,35,0.65)', margin: 0, whiteSpace: 'pre-wrap' }}>{r.review_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no past reviews and current period below threshold */}
      {!loadingStored && pastPeriodReviews.length === 0 && !reviewBelow && !meetsThreshold && (
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', fontStyle: 'italic' }}>
          Nothing to reflect on yet at this cadence. Keep checking in.
        </p>
      )}
    </div>
  )
}

// ─── Foundation Logs ──────────────────────────────────────────────────────────
//
// Chronological list of past Foundation check-ins. One row per day where
// at least a BEFORE was recorded. Shows date, before/after values, delta,
// and the journal notes inline.

function FoundationLogs({ sessions }) {
  // Group by date — pair before + after on the same date
  const byDate = {}
  for (const s of sessions) {
    const d = s.completed_at?.slice(0, 10)
    if (!d) continue
    if (!byDate[d]) byDate[d] = { date: d, before: null, after: null }
    if (s.checkin_stage === 'before') byDate[d].before = s
    if (s.checkin_stage === 'after')  byDate[d].after  = s
  }
  const days = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date))

  if (days.length === 0) {
    return (
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', fontStyle: 'italic' }}>
        No check-ins yet.
      </p>
    )
  }

  function formatDate(isoDate) {
    const [y, m, d] = isoDate.split('-')
    const dt = new Date(+y, +m - 1, +d)
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    return `${days[dt.getDay()]}, ${months[dt.getMonth()]} ${dt.getDate()}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {days.map(day => {
        const before = day.before
        const after = day.after
        const delta = (before && after) ? (after.value - before.value) : null
        const deltaColor =
          delta == null ? 'rgba(15,21,35,0.4)' :
          delta > 0 ? '#5A8AB8' :
          delta < 0 ? '#8A7030' :
          'rgba(15,21,35,0.55)'

        return (
          <div key={day.date} style={{ padding: '18px 22px', background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase' }}>
                {formatDate(day.date)}
              </span>
              <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: deltaColor }}>
                {before ? `${before.value}` : '—'}
                {' → '}
                {after ? `${after.value}` : '—'}
                {delta != null && (
                  <span style={{ marginLeft: '10px', color: deltaColor }}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </span>
            </div>

            {before?.note && (
              <div style={{ marginBottom: after?.note ? '10px' : 0 }}>
                <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(168,114,26,0.7)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Before</span>
                <p style={{ ...body, fontSize: '15px', lineHeight: 1.6, ...muted, margin: 0, whiteSpace: 'pre-wrap' }}>{before.note}</p>
              </div>
            )}
            {after?.note && (
              <div>
                <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(168,114,26,0.7)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>After</span>
                <p style={{ ...body, fontSize: '15px', lineHeight: 1.6, ...muted, margin: 0, whiteSpace: 'pre-wrap' }}>{after.note}</p>
              </div>
            )}
            {!before?.note && !after?.note && (
              <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.4)', fontStyle: 'italic', margin: 0 }}>
                No notes recorded.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Baseline Card ────────────────────────────────────────────────────────────

// useHorizonStateData — shared hook for both the archive page and the
// Mission Control slider panel. Loads audio URL, foundation sessions,
// and the user's Life I-am statement from the same sources HorizonStatePage
// has always read. Returns null/empty values when the user is not signed in
// so callers can render gracefully without extra guards.
export function useHorizonStateData(user) {
  const [audioUrl,        setAudioUrl]        = useState(null)
  const [audioLoading,    setAudioLoading]    = useState(false)
  const [audioError,      setAudioError]      = useState(null)
  const [sessions,        setSessions]        = useState([])
  const [lifeIaStatement, setLifeIaStatement] = useState(null)
  const [reloadTick,      setReloadTick]      = useState(0)

  useEffect(() => {
    if (!user) return
    setAudioLoading(true)
    try {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(AUDIO_FILE)
      if (data?.publicUrl) setAudioUrl(data.publicUrl)
      else setAudioError('Unable to load audio. Please try again shortly.')
    } catch {
      setAudioError('Something went wrong. Please refresh the page.')
    } finally {
      setAudioLoading(false)
    }
    supabase
      .from('horizon_state_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!data) return
        // Expand each wide row into two virtual "session" objects
        // (one before, one after) so the rest of the component, which
        // was written against the old tall schema, keeps working.
        const expanded = []
        for (const row of data) {
          const baseDate = row.before_at || row.after_at || row.created_at
          const d = baseDate ? new Date(baseDate) : new Date()
          const weekId    = row.week_id    || getWeekId(d)
          const monthId   = row.month_id   || getMonthId(d)
          const quarterId = row.quarter_id || getQuarterId(d)
          const yearId    = row.year_id    || getYearId(d)
          if (row.before_value !== null && row.before_value !== undefined) {
            expanded.push({
              checkin_stage: 'before',
              value:         row.before_value,
              note:          row.before_note,
              completed_at:  row.before_at,
              week_id:       weekId,
              month_id:      monthId,
              quarter_id:    quarterId,
              year_id:       yearId,
            })
          }
          if (row.after_value !== null && row.after_value !== undefined) {
            expanded.push({
              checkin_stage: 'after',
              value:         row.after_value,
              note:          row.after_note,
              completed_at:  row.after_at,
              week_id:       weekId,
              month_id:      monthId,
              quarter_id:    quarterId,
              year_id:       yearId,
            })
          }
        }
        setSessions(expanded)
      })
    supabase
      .from('map_results')
      .select('life_ia_statement')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data?.life_ia_statement) setLifeIaStatement(data.life_ia_statement) })
  }, [user, reloadTick])

  function reload() { setReloadTick(t => t + 1) }

  return { audioUrl, audioLoading, audioError, sessions, lifeIaStatement, reload }
}

export function BaselineCard({ user, audioUrl, audioLoading, audioError, sessions, onAfterComplete, lifeIaStatement, compact = false }) {
  const today = getLocalDateStr()

  const todayBefore = sessions.find(s => s.checkin_stage === 'before' && s.completed_at?.startsWith(today))
  const todayAfter  = sessions.find(s => s.checkin_stage === 'after'  && s.completed_at?.startsWith(today))

  const [beforeValue,   setBeforeValue]   = useState(todayBefore?.value ?? 5)
  const [beforeNote,    setBeforeNote]    = useState(todayBefore?.note  ?? '')
  const [afterValue,    setAfterValue]    = useState(todayAfter?.value  ?? 5)
  const [afterNote,     setAfterNote]     = useState(todayAfter?.note   ?? '')
  const [beforeDone,    setBeforeDone]    = useState(!!todayBefore)
  const [afterUnlocked, setAfterUnlocked] = useState(!!todayAfter)
  const [afterDone,     setAfterDone]     = useState(!!todayAfter)
  const [saving,        setSaving]        = useState(false)
  const [showModal,     setShowModal]     = useState(false)
  const [showBeginPopup, setShowBeginPopup] = useState(true)

  // Mobile audio state — shared between play button and scrubber
  const mobileAudioRef   = useRef(null)
  const mobileProgressRef = useRef(null)
  const mobileNearEndRef = useRef(false)
  const [mobilePlaying,  setMobilePlaying]  = useState(false)
  const [mobileCurrent,  setMobileCurrent]  = useState(0)
  const [mobileDuration, setMobileDuration] = useState(0)
  const [mobileLoaded,   setMobileLoaded]   = useState(false)

  useEffect(() => {
    if (!audioUrl) return
    const a = new Audio(audioUrl)
    a.preload = 'metadata'
    mobileAudioRef.current = a
    a.addEventListener('loadedmetadata', () => { setMobileDuration(a.duration); setMobileLoaded(true) })
    a.addEventListener('timeupdate', () => {
      setMobileCurrent(a.currentTime)
      if (!mobileNearEndRef.current && a.duration > 0 && (a.duration - a.currentTime) <= 60) {
        mobileNearEndRef.current = true
        setAfterUnlocked(true)
      }
    })
    a.addEventListener('ended', () => { setMobilePlaying(false); setMobileCurrent(0); a.currentTime = 0; setAfterUnlocked(true) })
    return () => { a.pause(); a.src = '' }
  }, [audioUrl])

  function mobileToggle() {
    if (!beforeDone) return
    const a = mobileAudioRef.current; if (!a) return
    if (a.paused) { a.play(); setMobilePlaying(true) }
    else          { a.pause(); setMobilePlaying(false) }
  }

  function mobileFmt(s) {
    if (!s || isNaN(s)) return '--:--'
    const m = Math.floor(s / 60)
    const sec = String(Math.floor(s % 60)).padStart(2, '0')
    return m + ':' + sec
  }

  const mobilePct = mobileDuration ? (mobileCurrent / mobileDuration) * 100 : 0

  useEffect(() => {
    if (!beforeDone) {
      const b = sessions.find(s => s.checkin_stage === 'before' && s.completed_at?.startsWith(today))
      if (b) { setBeforeValue(b.value); setBeforeNote(b.note ?? ''); setBeforeDone(true) }
    }
    if (!afterDone) {
      const a = sessions.find(s => s.checkin_stage === 'after' && s.completed_at?.startsWith(today))
      if (a) { setAfterValue(a.value); setAfterNote(a.note ?? ''); setAfterUnlocked(true); setAfterDone(true) }
    }
  }, [sessions])

  async function saveCheckin(stage, value, note) {
    if (!user?.id) return
    const now       = new Date()
    const nowStr    = now.toISOString()
    const dateStr   = getLocalDateStr(now)
    const weekId    = getWeekId(now)
    const monthId   = getMonthId(now)
    const quarterId = getQuarterId(now)
    const yearId    = getYearId(now)
    const periodId  = `${dateStr}-foundation-baseline`

    // Wide schema: one row per (user_id, period_id), before/after on same row.
    // Only set the half corresponding to this stage; the other half is left
    // alone on update (Supabase upsert sends only the columns we name).
    const payload = {
      user_id:     user.id,
      period_id:   periodId,
      audio_phase: 'baseline',
      week_id:     weekId,
      month_id:    monthId,
      quarter_id:  quarterId,
      year_id:     yearId,
    }
    if (stage === 'before') {
      payload.before_value = value
      payload.before_note  = note || null
      payload.before_at    = nowStr
    } else {
      payload.after_value  = value
      payload.after_note   = note || null
      payload.after_at     = nowStr
    }

    const { error } = await supabase
      .from('horizon_state_checkins')
      .upsert(payload, { onConflict: 'user_id,period_id' })
    if (error) {
      console.error('[HorizonState] saveCheckin failed:', error)
      throw error
    }
  }

  async function handleBegin() {
    if (!user) { setShowModal(true); return }
    setSaving(true)
    try { await saveCheckin('before', beforeValue, beforeNote) } catch(e) { console.warn(e) }
    setSaving(false)
    setBeforeDone(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveCheckin('after', afterValue, afterNote)
      const updatedSessions = [
        ...sessions.filter(s => !(s.checkin_stage === 'after' && s.completed_at?.startsWith(today))),
        { checkin_stage: 'after', value: afterValue, note: afterNote, completed_at: new Date().toISOString(), week_id: getWeekId(), month_id: getMonthId(), quarter_id: getQuarterId(), year_id: getYearId() },
      ]
      const currentBefore = { value: beforeValue, note: beforeNote }
      onAfterComplete?.({ value: afterValue, note: afterNote, timestamp: new Date().toISOString() }, currentBefore, updatedSessions)
    } catch(e) { console.warn(e) }
    setSaving(false)
    setAfterDone(true)
  }

  // Done state
  if (afterDone) {
    const weekSessions = sessions.filter(s => s.checkin_stage === 'after' && s.week_id === getWeekId()).length
    const sessionCount = weekSessions > 0 ? weekSessions : 1
    return (
      <div>
        <FlameDelta before={beforeValue} after={afterValue} />
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.75, marginBottom: '6px' }}>
            Done. See you tomorrow.
          </p>
          <p style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '20px' }}>
            {sessionCount} session{sessionCount !== 1 ? 's' : ''} this week
          </p>
          {lifeIaStatement && (
            <div style={{ margin: '0 auto 24px', maxWidth: '400px', padding: '14px 20px', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '10px', background: 'rgba(200,146,42,0.04)' }}>
              <p style={{ ...body, fontSize: '1.0625rem', fontStyle: 'italic', color: '#A8721A', lineHeight: 1.7, margin: 0 }}>
                {lifeIaStatement}
              </p>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setBeforeDone(false); setAfterDone(false); setAfterUnlocked(false); setBeforeValue(5); setAfterValue(5); setBeforeNote(''); setAfterNote(''); setShowBeginPopup(true) }}
              style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', ...gold, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Listen again {'→'}
            </button>
            <a href="/dashboard" style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}>
              Mission Control {'→'}
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div data-compact={compact ? 'true' : 'false'} style={{ position: 'relative', minHeight: compact ? 'auto' : '420px' }}>
      <style>{`
        /* ── Desktop: three-column grid ── */
        .hs-baseline-grid {
          display: grid;
          grid-template-columns: 1fr 1.6fr 1fr;
          gap: 20px;
          align-items: start;
        }

        /* ── Mobile: one-screen layout ── */
        @media (max-width: 640px) {
          .hs-baseline-grid {
            display: flex;
            flex-direction: column;
            gap: 0;
          }
          /* Flames row: Before | After side by side */
          .hs-flames-row {
            display: flex;
            gap: 12px;
            justify-content: space-between;
            margin-bottom: 16px;
          }
          .hs-flame-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          /* Audio: full width, compact */
          .hs-audio-mobile {
            margin-bottom: 16px;
          }
          /* Journal: full width, swaps content */
          .hs-journal-mobile {
            margin-bottom: 12px;
          }
          /* Hide desktop columns on mobile */
          .hs-col-before-desktop,
          .hs-col-after-desktop,
          .hs-col-audio-desktop {
            display: none !important;
          }
          /* Show mobile-only sections */
          .hs-mobile-only {
            display: flex !important;
          }
        }
        @media (min-width: 641px) {
          .hs-mobile-only { display: none !important; }
          .hs-col-before-desktop,
          .hs-col-after-desktop,
          .hs-col-audio-desktop { display: flex !important; }
        }

        /* ── Compact override: force mobile layout regardless of viewport.
             Used when BaselineCard renders inside a narrow panel
             (e.g. Mission Control slider). ── */
        [data-compact="true"] .hs-baseline-grid {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        [data-compact="true"] .hs-flames-row {
          display: flex;
          gap: 12px;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        [data-compact="true"] .hs-flame-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        [data-compact="true"] .hs-audio-mobile { margin-bottom: 16px; }
        [data-compact="true"] .hs-journal-mobile { margin-bottom: 12px; }
        [data-compact="true"] .hs-col-before-desktop,
        [data-compact="true"] .hs-col-after-desktop,
        [data-compact="true"] .hs-col-audio-desktop {
          display: none !important;
        }
        [data-compact="true"] .hs-mobile-only {
          display: flex !important;
        }
      `}</style>

      {/* ── Begin popup — fires every visit, click anywhere dismisses.
           Suppressed in compact mode: the slider panel is itself the
           entry point, so a fullscreen popup over it is wrong. ── */}
      {showBeginPopup && !compact && (
        <div
          onClick={() => setShowBeginPopup(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(250,250,247,0.97)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 32px', textAlign: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '16px' }}>
            Horizon State {'·'} Foundation
          </span>
          <p style={{ ...body, fontSize: '1.375rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.75, marginBottom: '24px', maxWidth: '320px' }}>
            Regulated internal stability {'—'} the floor you stand on. Check in before and after to see what the audio actually does to your system.
          </p>
          <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A' }}>
            Tap anywhere to begin
          </span>
        </div>
      )}

      {/* ══ MOBILE LAYOUT ════════════════════════════════════════════════════════ */}
      <div className="hs-mobile-only" style={{ flexDirection: 'column' }}>

        {/* Lock / unlock status — above flames */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          {!beforeDone ? (
            <span style={{ ...body, fontSize: '1rem', color: 'rgba(15,21,35,0.55)' }}>
              Check in to unlock the audio.
            </span>
          ) : !afterUnlocked ? (
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase' }}>
              Horizon State {'·'} Foundation {'·'} 20 min
            </span>
          ) : (
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase' }}>
              Horizon State {'·'} Foundation {'·'} 20 min
            </span>
          )}
        </div>

        {/* Flames row with play button centered between */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '16px', gap: '8px' }}>

          {/* Before flame */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.22em', color: beforeDone ? 'rgba(168,114,26,0.55)' : '#A8721A', textTransform: 'uppercase', marginBottom: '8px' }}>
              Before
            </span>
            <div style={{ pointerEvents: beforeDone ? 'none' : 'auto', opacity: beforeDone ? 0.38 : 1, transition: 'opacity 0.5s ease' }}>
              <FlameSlider value={beforeValue} onChange={setBeforeValue} ghostValue={null} />
            </div>
            <span style={{ ...body, fontSize: '0.875rem', color: beforeDone ? 'rgba(168,114,26,0.55)' : 'rgba(15,21,35,0.55)', marginTop: '6px' }}>
              {beforeDone ? 'saved' : ''}
            </span>
          </div>

          {/* Full audio player — centered between flames */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '12px', flexShrink: 0, gap: '8px', width: '100%', maxWidth: '80px' }}>
            {/* Play/Pause button */}
            <button
              onClick={mobileToggle}
              disabled={!beforeDone || !mobileLoaded}
              aria-label={mobilePlaying ? 'Pause' : 'Play'}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: mobilePlaying ? 'rgba(200,146,42,0.1)' : 'rgba(200,146,42,0.05)',
                border: `1.5px solid ${beforeDone ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.25)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: beforeDone && mobileLoaded ? 'pointer' : 'not-allowed',
                flexShrink: 0, color: '#A8721A', fontSize: '16px',
                transition: 'all 0.2s', opacity: beforeDone ? 1 : 0.4,
              }}
            >
              {mobilePlaying ? '⏸' : '▶'}
            </button>
            {/* Time display */}
            <span style={{ ...sc, fontSize: '14px', letterSpacing: '0.06em', color: 'rgba(15,21,35,0.72)', textAlign: 'center' }}>
              {mobileFmt(mobileCurrent)} / {mobileFmt(mobileDuration)}
            </span>
          </div>

          {/* After flame */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: afterUnlocked ? 1 : 0.22, transition: 'opacity 0.8s ease', pointerEvents: afterUnlocked ? 'auto' : 'none' }}>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.22em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '8px' }}>
              After
            </span>
            <FlameSlider value={afterValue} onChange={setAfterValue} ghostValue={beforeDone ? beforeValue : null} />
            <span style={{ ...body, fontSize: '0.875rem', color: 'rgba(15,21,35,0.55)', marginTop: '6px' }}>
              {''}
            </span>
          </div>
        </div>

        {/* Scrubber — full width below flames */}
        {beforeDone && (
          <div
            ref={mobileProgressRef}
            onClick={e => {
              const rect = mobileProgressRef.current?.getBoundingClientRect()
              if (!rect) return
              const a = mobileAudioRef.current
              if (!a || !mobileDuration) return
              a.currentTime = ((e.clientX - rect.left) / rect.width) * mobileDuration
            }}
            style={{
              width: '100%', height: '3px', marginBottom: '16px',
              background: 'rgba(200,146,42,0.15)', borderRadius: '2px',
              cursor: 'pointer', position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${mobilePct}%`,
              background: 'rgba(200,146,42,0.65)', borderRadius: '2px',
              transition: 'width 0.5s linear',
            }} />
          </div>
        )}

        {/* Journal window — swaps Before → After */}
        <div style={{ marginBottom: '12px' }}>
          {!afterUnlocked ? (
            <>
              <textarea
                value={beforeNote}
                onChange={e => setBeforeNote(e.target.value)}
                placeholder={'what walked in with you today…'}
                rows={3}
                disabled={beforeDone}
                style={{ width: '100%', padding: '10px 14px', fontFamily: "'Lora',Georgia,serif", fontSize: '1rem', color: 'rgba(15,21,35,0.72)', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', outline: 'none', resize: 'none', lineHeight: 1.6, transition: 'border-color 0.2s', boxSizing: 'border-box', opacity: beforeDone ? 0.5 : 1 }}
                onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.45)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.18)' }}
              />
              {!beforeDone && (
                <button onClick={handleBegin} disabled={saving} style={{ width: '100%', padding: '12px', marginTop: '10px', ...sc, fontSize: '1rem', letterSpacing: '0.14em', color: '#A8721A', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', cursor: saving ? 'default' : 'pointer', transition: 'all 0.2s', opacity: saving ? 0.6 : 1 }}>
                  Begin {'→'}
                </button>
              )}
            </>
          ) : (
            <>
              <textarea
                value={afterNote}
                onChange={e => setAfterNote(e.target.value)}
                placeholder={"What I'm stepping away with…"}
                rows={3}
                style={{ width: '100%', padding: '10px 14px', fontFamily: "'Lora',Georgia,serif", fontSize: '1rem', color: 'rgba(15,21,35,0.72)', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', outline: 'none', resize: 'none', lineHeight: 1.6, transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.45)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.18)' }}
              />
              <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '12px', marginTop: '10px', ...sc, fontSize: '1rem', letterSpacing: '0.14em', color: '#A8721A', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', cursor: saving ? 'default' : 'pointer', transition: 'all 0.2s', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save ✓'}
              </button>
            </>
          )}
        </div>

        {/* Audio scrubber — below journal, visible once before is done */}
        {beforeDone && audioUrl && (
          <div style={{ marginTop: '4px', marginBottom: '8px' }}>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: '#A8721A', textAlign: 'center', marginBottom: '8px' }}>
              Horizon State {'·'} Foundation {'·'} 20 min
            </div>
            <div
              onClick={e => {
                const a = mobileAudioRef.current
                if (!a || !mobileDuration) return
                const rect = e.currentTarget.getBoundingClientRect()
                a.currentTime = ((e.clientX - rect.left) / rect.width) * mobileDuration
              }}
              style={{ width: '100%', height: '4px', background: 'rgba(200,146,42,0.15)', borderRadius: '2px', cursor: 'pointer', position: 'relative', marginBottom: '4px' }}
            >
              <div style={{ height: '100%', width: mobilePct + '%', background: '#C8922A', borderRadius: '2px', transition: 'width 0.1s linear' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.4)' }}>{mobileFmt(mobileCurrent)}</span>
              <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.4)' }}>{mobileFmt(mobileDuration)}</span>
            </div>
          </div>
        )}

      </div>

      {/* ══ DESKTOP LAYOUT ═════════════════════════════════════════════════════ */}
      <div className="hs-baseline-grid">

        {/* Before */}
        <div className="hs-col-before-desktop" style={{ flexDirection: 'column', alignItems: 'center', opacity: beforeDone ? 0.38 : 1, transition: 'opacity 0.5s ease' }}>
          <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.22em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '4px' }}>Before</span>
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(168,114,26,0.55)', textTransform: 'uppercase', marginBottom: '12px' }}>Before {'·'} Foundation</span>
          <p style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.55)', textAlign: 'center', marginBottom: '20px', lineHeight: 1.55 }}>Where is the flame right now?</p>
          <div style={{ pointerEvents: beforeDone ? 'none' : 'auto', marginBottom: '14px' }}>
            <FlameSlider value={beforeValue} onChange={setBeforeValue} ghostValue={null} />
          </div>
          <textarea value={beforeNote} onChange={e => setBeforeNote(e.target.value)}
            placeholder={'what walked in with you today…'} rows={2} disabled={beforeDone}
            style={{ width: '100%', padding: '10px 14px', fontFamily: "'Lora',Georgia,serif", fontSize: '1rem', color: 'rgba(15,21,35,0.72)', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', outline: 'none', resize: 'none', lineHeight: 1.6, marginBottom: '14px', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
            onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.45)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.18)' }}
          />
          {!beforeDone && (
            <button onClick={handleBegin} disabled={saving} style={{ width: '100%', padding: '12px', ...sc, fontSize: '1.125rem', letterSpacing: '0.14em', color: '#A8721A', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', cursor: saving ? 'default' : 'pointer', transition: 'all 0.2s', opacity: saving ? 0.6 : 1 }}>Begin {'→'}</button>
          )}
        </div>

        {/* Audio */}
        <div className="hs-col-audio-desktop" style={{ flexDirection: 'column', justifyContent: 'flex-start' }}>
          {audioLoading && <p style={{ ...body, fontSize: '1.125rem', ...muted }}>Loading audio{'…'}</p>}
          {audioError  && <p style={{ ...body, fontSize: '1.125rem', color: 'rgba(138,48,48,0.7)' }}>{audioError}</p>}
          {!audioLoading && !audioError && audioUrl && (
            <AudioPlayer url={audioUrl} locked={!beforeDone} onNearEnd={() => setAfterUnlocked(true)} onEnded={() => setAfterUnlocked(true)} />
          )}
          {!user && !audioLoading && !audioError && (
            <div style={{ padding: '20px 22px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.2)', borderRadius: '14px', opacity: 0.6 }}>
              <p style={{ ...body, fontSize: '1.3125rem', ...muted, marginBottom: '14px', lineHeight: 1.6 }}>Check-in to unlock the audio.</p>
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...muted, marginBottom: '12px' }}>Horizon State {'·'} Foundation {'·'} 20 min</div>
              <button onClick={() => setShowModal(true)} style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', ...gold, fontSize: '18px' }}>{'\u25B6'}</button>
            </div>
          )}
        </div>

        {/* After */}
        <div className="hs-col-after-desktop" style={{ flexDirection: 'column', alignItems: 'center', opacity: afterUnlocked ? 1 : 0.22, transition: 'opacity 0.8s ease', pointerEvents: afterUnlocked ? 'auto' : 'none' }}>
          <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.22em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '4px' }}>After</span>
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(168,114,26,0.55)', textTransform: 'uppercase', marginBottom: '12px' }}>After {'·'} Foundation</span>
          <p style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.55)', textAlign: 'center', marginBottom: '20px', lineHeight: 1.55 }}>And now{'—'}?</p>
          <div style={{ marginBottom: '14px' }}>
            <FlameSlider value={afterValue} onChange={setAfterValue} ghostValue={beforeDone ? beforeValue : null} />
          </div>
          <textarea value={afterNote} onChange={e => setAfterNote(e.target.value)}
            placeholder={"What I'm stepping away with…"} rows={2}
            style={{ width: '100%', padding: '10px 14px', fontFamily: "'Lora',Georgia,serif", fontSize: '1rem', color: 'rgba(15,21,35,0.72)', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', outline: 'none', resize: 'none', lineHeight: 1.6, marginBottom: '14px', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
            onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.45)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.18)' }}
          />
          {afterUnlocked && (
            <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '12px', ...sc, fontSize: '1.125rem', letterSpacing: '0.14em', color: '#A8721A', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', cursor: saving ? 'default' : 'pointer', transition: 'all 0.2s', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save ✓'}</button>
          )}
        </div>

      </div>

      {showModal && <AuthModal onDismiss={() => setShowModal(false)} />}
    </div>
  )
}

// ─── Horizon State Archive Page ───────────────────────────────────────────────
//
// /tools/horizon-state — the archive surface. Daily ritual lives in the
// Mission Control slider; this page is for everything else.
//
// Phase tabs at the top: Foundation (active), Calibration / Embodying
// (coming soon). Foundation content has two sub-tabs: Reports (default)
// and Logs.
//
// First-time pitch: a one-time intro renders only when the user has
// zero foundation sessions. Once they have any, the pitch never fires
// again — they're past the front door.

export function HorizonStatePage() {
  const { user, loading: authLoading } = useAuth()
  const { tier, loading: accessLoading } = useAccess('horizon-state')
  const { audioUrl, audioLoading, audioError, sessions, lifeIaStatement } = useHorizonStateData(user)

  const [activePhase, setActivePhase] = useState('foundation')
  const [activeView,  setActiveView]  = useState('reports')

  if (authLoading || accessLoading) return <div className="loading" />

  const phases = [
    { key: 'foundation',  label: 'Foundation',  number: '1', locked: false },
    { key: 'calibration', label: 'Calibration', number: '2', locked: true  },
    { key: 'embodying',   label: 'Embodying',   number: '3', locked: true  },
  ]

  const isFirstTime = sessions.length === 0

  return (
    <AccessGate productKey="horizon-state" toolName="Horizon State">
    <div className="page-shell">
      <style>{MOBILE_STYLES}</style>
      <Nav activePath="nextus-self" />
      <div className="tool-wrap">

        {/* Eyebrow only — no marketing copy. Users on this page are users. */}
        <div style={{ marginBottom: '32px' }}>
          <span className="tool-eyebrow">Horizon Suite {'·'} Horizon State</span>
        </div>

        {/* Phase tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '32px', borderBottom: '1px solid rgba(200,146,42,0.2)' }}>
          {phases.map(p => {
            const isActive = activePhase === p.key
            return (
              <button
                key={p.key}
                onClick={() => setActivePhase(p.key)}
                style={{
                  ...sc, fontSize: '15px', letterSpacing: '0.16em',
                  padding: '12px 20px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: isActive ? '#A8721A' : p.locked ? 'rgba(200,146,42,0.3)' : 'rgba(200,146,42,0.55)',
                  borderBottom: isActive ? '2px solid #A8721A' : '2px solid transparent',
                  marginBottom: '-1px',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', color: 'inherit', display: 'block', marginBottom: '2px', opacity: 0.7 }}>
                  Phase {p.number}
                </span>
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Phase 1 — Foundation */}
        {activePhase === 'foundation' && (
          <div>
            {isFirstTime ? (
              <FirstTimePitch onContinue={() => {}} />
            ) : (
              <>
                {/* Reports / Logs sub-tabs */}
                <div style={{ display: 'flex', gap: 0, marginBottom: '24px', borderBottom: '1px solid rgba(200,146,42,0.12)' }}>
                  {[
                    { key: 'reports', label: 'Reports' },
                    { key: 'logs',    label: 'Logs'    },
                  ].map(v => {
                    const isActive = activeView === v.key
                    return (
                      <button
                        key={v.key}
                        onClick={() => setActiveView(v.key)}
                        style={{
                          ...sc, fontSize: '12px', letterSpacing: '0.18em',
                          padding: '10px 14px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: isActive ? '#0F1523' : 'rgba(15,21,35,0.45)',
                          borderBottom: isActive ? '2px solid #A8721A' : '2px solid transparent',
                          marginBottom: '-1px',
                          transition: 'all 0.2s',
                          textTransform: 'uppercase',
                        }}
                      >
                        {v.label}
                      </button>
                    )
                  })}
                </div>

                {activeView === 'reports' && <FoundationReports user={user} sessions={sessions} />}
                {activeView === 'logs'    && <FoundationLogs              sessions={sessions} />}
              </>
            )}
          </div>
        )}

        {/* Phase 2 — Calibration */}
        {activePhase === 'calibration' && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>
              Coming soon
            </span>
            <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, maxWidth: '380px', margin: '0 auto' }}>
              Developing the capacity to move your state deliberately {'—'} not just recover from it.
            </p>
          </div>
        )}

        {/* Phase 3 — Embodying */}
        {activePhase === 'embodying' && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>
              Coming soon
            </span>
            <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, maxWidth: '380px', margin: '0 auto' }}>
              Living from a regulated ground {'—'} not as practice, but as your natural state.
            </p>
          </div>
        )}

      </div>
      <ToolCompassPanel />
      <ProtocolPanel />
    </div>
    </AccessGate>
  )
}

// ─── First-time pitch ─────────────────────────────────────────────────────────
//
// Renders only on the archive page when the user has zero foundation
// sessions. The point is to give first-timers context the first time
// they land here. Once they have any session, the pitch never returns.

function FirstTimePitch() {
  return (
    <div style={{ padding: '40px 32px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '14px', textAlign: 'center', maxWidth: '560px', margin: '0 auto' }}>
      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px', textTransform: 'uppercase' }}>
        Horizon State {'·'} Foundation
      </span>
      <h2 style={{ ...serif, fontSize: '28px', fontWeight: 400, color: '#0F1523', lineHeight: 1.25, marginBottom: '16px' }}>
        The layer beneath everything else.
      </h2>
      <p style={{ ...body, fontSize: '17px', fontWeight: 300, ...meta, lineHeight: 1.7, marginBottom: '20px' }}>
        Most frameworks assume baseline stability is already there. This builds it. The daily check-in lives on Mission Control. This page is where your reflections and logs accumulate over time.
      </p>
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
        Once you've done your first check-in, this introduction won't appear again.
      </p>
    </div>
  )
}
