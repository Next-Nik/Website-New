import { useState, useRef, useEffect } from 'react'
import { ToolCompassPanel } from '../../components/ToolCompassPanel'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { supabase } from '../../hooks/useSupabase'
import { FlamePicker, FlameGlyph } from '../../components/FlameCheckIn'
import { ProtocolPanel } from '../../components/ProtocolPanel'
import { AccessGate } from '../../components/AccessGate'

const AUDIO_FILE = 'foundation-baseline.mp3'
const BUCKET     = 'nextus-audio'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
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

async function writeSummary(user, allSessions, afterResult, beforeResult) {
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
      .from('foundation_reviews')
      .select('review_text, period_label, period_type')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const latestReview = reviewData?.review_text
      ? reviewData.review_text.split('\n\n')[0].slice(0, 300)
      : null

    await supabase.from('foundation_summary').upsert({
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
    return `${fmt(mon)} \u2013 ${fmt(sun)}`
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
      background: locked ? 'rgba(15,21,35,0.02)' : '#FFFFFF',
      border: `1.5px solid ${locked ? 'rgba(200,146,42,0.2)' : 'rgba(200,146,42,0.78)'}`,
      borderRadius: '14px',
      transition: 'all 0.4s ease',
      opacity: locked ? 0.55 : 1,
      minHeight: '360px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      {locked && (
        <p style={{ ...serif, fontSize: '1.3125rem', fontStyle: 'italic', ...muted, marginBottom: '14px', lineHeight: 1.6 }}>
          Check-in to unlock the audio.
        </p>
      )}
      <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...muted, marginBottom: '12px' }}>
        Foundation {'\u00B7'} Baseline {'\u00B7'} 20 min
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
        <p style={{ ...serif, fontSize: '1.25rem', fontWeight: 300, ...meta, lineHeight: 1.7, marginBottom: '24px' }}>
          Foundation is part of Life OS {'\u2014'} a free account keeps your progress and gives you access to the full protocol.
        </p>
        <a href={`/login?redirect=${returnUrl}`} style={{ display: 'block', width: '100%', padding: '14px', textAlign: 'center', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', ...sc, fontSize: '1.125rem', letterSpacing: '0.16em', ...gold, textDecoration: 'none', marginBottom: '12px' }}>
          Sign in or create account {'\u2192'}
        </a>
        <button onClick={onDismiss} style={{ display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', ...serif, fontSize: '1.125rem', fontStyle: 'italic', ...muted, cursor: 'pointer', padding: '4px' }}>
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
  const symbol = delta > 0 ? '\u2191' : delta < 0 ? '\u2193' : '\u2014'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '20px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '12px', marginTop: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', ...muted, marginBottom: '8px' }}>BEFORE</div>
        <FlameGlyph value={before} size={40} ghost />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...sc, fontSize: '1.25rem', color, lineHeight: 1 }}>{symbol}</div>
        <div style={{ ...serif, fontSize: '15px', fontStyle: 'italic', color, marginTop: '4px' }}>
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
  const [loading,    setLoading]    = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [error,      setError]      = useState('')
  const [saved,      setSaved]      = useState(null)

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
          .from('foundation_reviews')
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
      const res = await fetch('/tools/foundation/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: { type, id: periodId, label }, sessions: relevant, previousReviews, userId: user?.id }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const text = data.review || ''
      setReviewText(text)
      if (user?.id && supabase && text) {
        await supabase.from('foundation_reviews').upsert({
          user_id: user.id, period_type: type, period_id: periodId, period_label: label,
          session_count: relevant.length, review_text: text,
          created_at: now.toISOString(), updated_at: now.toISOString(),
        }, { onConflict: 'user_id,period_type,period_id' })
        setSaved({ type, label })
        // Refresh summary so profile picks up new review text
        writeSummary(user, sessions, null, null).catch(() => {})
      }
    } catch {
      setError('Review unavailable. Please try again shortly.')
    }
    setLoading(false)
  }

  if (!weeklyAvailable) return null

  return (
    <div style={{ marginTop: '32px', padding: '24px 28px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '14px' }}>
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', ...gold, display: 'block', marginBottom: '8px' }}>Foundation Review</span>
      <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', ...muted, lineHeight: 1.7, marginBottom: '20px' }}>
        {sessionsThisWeek.length} sessions this week. A reflection is available.
      </p>
      {!reviewText && !loading && (
        <button onClick={() => requestReview('weekly')} style={{ ...sc, fontSize: '1.3125rem', letterSpacing: '0.14em', ...gold, background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '12px 28px', cursor: 'pointer' }}>
          Request weekly reflection {'\u2192'}
        </button>
      )}
      {loading && <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', ...muted }}>Reading your practice{'\u2026'}</p>}
      {error && <p style={{ ...serif, fontSize: '1.3125rem', color: 'rgba(138,48,48,0.7)' }}>{error}</p>}
      {reviewText && (
        <div style={{ borderLeft: '2px solid rgba(200,146,42,0.35)', padding: '16px 0 16px 20px' }}>
          <p style={{ ...serif, fontSize: '1.25rem', lineHeight: 1.85, ...meta, margin: 0 }}>{reviewText}</p>
          {saved && <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(200,146,42,0.5)', display: 'block', marginTop: '12px' }}>Saved to your profile</span>}
        </div>
      )}
    </div>
  )
}

// ─── Baseline Card ────────────────────────────────────────────────────────────

function BaselineCard({ user, audioUrl, audioLoading, audioError, sessions, onAfterComplete }) {
  const today = getLocalDateStr()

  // Derive today's before/after from session history
  const todayBefore = sessions.find(s => s.checkin_stage === 'before' && s.completed_at?.startsWith(today))
  const todayAfter  = sessions.find(s => s.checkin_stage === 'after'  && s.completed_at?.startsWith(today))

  // Local state — pre-filled from today's data if it exists
  const [beforeResult,  setBeforeResult]  = useState(todayBefore ? { value: todayBefore.value, note: todayBefore.note } : null)
  const [afterResult,   setAfterResult]   = useState(todayAfter  ? { value: todayAfter.value,  note: todayAfter.note  } : null)
  const [afterUnlocked, setAfterUnlocked] = useState(!!todayAfter)
  const [showModal,     setShowModal]     = useState(false)

  // Resync if sessions loads after mount
  useEffect(() => {
    if (!beforeResult) {
      const b = sessions.find(s => s.checkin_stage === 'before' && s.completed_at?.startsWith(today))
      if (b) setBeforeResult({ value: b.value, note: b.note })
    }
    if (!afterResult) {
      const a = sessions.find(s => s.checkin_stage === 'after' && s.completed_at?.startsWith(today))
      if (a) { setAfterResult({ value: a.value, note: a.note }); setAfterUnlocked(true) }
    }
  }, [sessions])

  const isDone = !!afterResult

  // Unauth
  if (!user) {
    return (
      <div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.35 }}>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase' }}>Before</span>
            <FlameGlyph value={5} size={64} ghost />
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ padding: '20px 22px', background: 'rgba(15,21,35,0.02)', border: '1.5px solid rgba(200,146,42,0.2)', borderRadius: '14px', opacity: 0.6 }}>
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...muted, marginBottom: '12px' }}>Foundation {'\u00B7'} Baseline {'\u00B7'} 20 min</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={() => setShowModal(true)} style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', ...gold, fontSize: '18px' }}>{'\u25B6'}</button>
                <div style={{ flex: 1, height: '4px', background: 'rgba(200,146,42,0.15)', borderRadius: '2px' }} />
              </div>
            </div>
          </div>
          <div style={{ flex: '0 0 auto', opacity: 0.18 }}>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '12px', textAlign: 'center' }}>After</span>
            <FlameGlyph value={5} size={64} ghost />
          </div>
        </div>
        {showModal && <AuthModal onDismiss={() => setShowModal(false)} />}
      </div>
    )
  }

  // Done for today
  if (isDone) {
    return (
      <div>
        <FlameDelta before={beforeResult.value} after={afterResult.value} />
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', ...muted, lineHeight: 1.75, marginBottom: '16px' }}>
            {afterResult.value > beforeResult.value
              ? "The audio did something. That's the data."
              : afterResult.value < beforeResult.value
              ? "Honest is what matters here. The pattern shows over time."
              : "The ground holds even when nothing shifts. That's sometimes the work."}
          </p>
          <button
            onClick={() => { setBeforeResult(null); setAfterResult(null); setAfterUnlocked(false) }}
            style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', ...gold, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Listen again {'\u2192'}
          </button>
        </div>
      </div>
    )
  }

  // Active session
  return (
    <div>
      <div className="baseline-layout" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* LEFT — Before flame */}
        <div style={{
          flex: '0 0 auto', minWidth: '120px',
          opacity: beforeResult ? 0.35 : 1,
          transition: 'opacity 0.6s ease',
        }} className="baseline-before">
          <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '12px', textAlign: 'center' }}>Before</span>
          <FlamePicker
            audioPhase="baseline"
            stage="before"
            locked={!!beforeResult}
            onComplete={data => { setBeforeResult(data) }}
            onSkip={() => setBeforeResult({ value: 5, note: '' })}
          />
        </div>

        {/* CENTRE — Audio */}
        <div className="baseline-audio" style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '540px' }}>
          {audioLoading && <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', ...muted }}>Loading audio...</p>}
          {audioError   && <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(138,48,48,0.7)' }}>{audioError}</p>}
          {!audioLoading && !audioError && audioUrl && (
            <AudioPlayer
              url={audioUrl}
              locked={!beforeResult}
              onNearEnd={() => setAfterUnlocked(true)}
              onEnded={() => setAfterUnlocked(true)}
            />
          )}
        </div>

        {/* RIGHT — After flame */}
        <div style={{
          flex: '0 0 auto', minWidth: '120px',
          opacity: afterUnlocked ? 1 : 0.18,
          transition: 'opacity 0.8s ease',
          pointerEvents: afterUnlocked ? 'auto' : 'none',
        }} className="baseline-after">
          <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '12px', textAlign: 'center' }}>After</span>
          <FlamePicker
            audioPhase="baseline"
            stage="after"
            locked={!afterUnlocked}
            ghostValue={beforeResult?.value ?? null}
            onComplete={data => {
              setAfterResult(data)
              // Build updated sessions list with new after entry for summary computation
              const updatedSessions = [
                ...sessions.filter(s => !(s.checkin_stage === 'after' && s.completed_at?.startsWith(today))),
                { checkin_stage: 'after',  value: data.value, note: data.note, completed_at: new Date().toISOString(), week_id: getWeekId(), month_id: getMonthId(), quarter_id: getQuarterId(), year_id: getYearId() },
              ]
              const currentBefore = beforeResult || sessions.find(s => s.checkin_stage === 'before' && s.completed_at?.startsWith(today))
              onAfterComplete?.(data, currentBefore, updatedSessions)
            }}
          />
        </div>

      </div>
    </div>
  )
}

// ─── Phase helpers ────────────────────────────────────────────────────────────

function PhaseBlock({ number, name, desc, children }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', ...gold, flexShrink: 0 }}>{number}</span>
        <span style={{ ...serif, fontSize: '1.25rem', fontWeight: 300, color: '#0F1523' }}>{name}</span>
      </div>
      <p style={{ ...serif, fontSize: '1.25rem', fontWeight: 300, ...meta, lineHeight: 1.75, marginBottom: '20px' }}>{desc}</p>
      {children}
    </div>
  )
}

function PhasePlaceholder({ title }) {
  return (
    <div style={{ background: 'rgba(15,21,35,0.015)', border: '1.5px solid rgba(200,146,42,0.2)', borderRadius: '14px', padding: '24px 28px' }}>
      <span style={{ display: 'block', ...sc, fontSize: '15px', letterSpacing: '0.14em', ...muted, marginBottom: '8px' }}>Coming</span>
      <div style={{ ...serif, fontSize: '1.1875rem', fontWeight: 300, color: 'rgba(15,21,35,0.72)', marginBottom: '6px' }}>{title}</div>
      <p style={{ ...serif, fontSize: '1.3125rem', fontStyle: 'italic', ...muted, lineHeight: 1.6 }}>This phase unlocks as the protocol develops.</p>
    </div>
  )
}

function QuoteBlock({ text, cite }) {
  return (
    <div style={{ borderLeft: '2px solid rgba(200,146,42,0.2)', padding: '16px 0 16px 24px', margin: '40px 0' }}>
      <p style={{ ...serif, fontSize: '1.3125rem', fontStyle: 'italic', fontWeight: 300, ...meta, lineHeight: 1.75, marginBottom: '12px' }}>{'\u201C'}{text}{'\u201D'}</p>
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', ...gold }}>{'\u2014'} {cite}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function FoundationPage() {
  const { user, loading: authLoading } = useAuth()
  const { tier, loading: accessLoading } = useAccess('foundation')
  const [audioUrl,     setAudioUrl]     = useState(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError,   setAudioError]   = useState(null)
  const [sessions,     setSessions]     = useState([])

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
    // Load session history — includes both before/after check-ins and full sessions
    supabase
      .from('pulse_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('source', 'foundation')
      .order('completed_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { if (data) setSessions(data) })
  }, [user])

  if (authLoading || accessLoading) return <div className="loading" />

  return (
    <AccessGate productKey="foundation" toolName="Foundation">
    <div className="page-shell">
      <style>{MOBILE_STYLES}</style>
      <Nav activePath="life-os" />
      <div className="tool-wrap">
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS {'\u00B7'} Foundation</span>
          <p style={{ ...serif, fontSize: '1.125rem', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: '8px 0 12px', maxWidth: '520px' }}>
            Build the regulated ground that makes everything else possible.
          </p>
          <h1 style={{ ...serif, fontSize: 'clamp(2.25rem, 5.5vw, 3.25rem)', fontWeight: 300, color: '#0F1523', lineHeight: 1.06, letterSpacing: '-0.01em', marginBottom: '16px' }}>
            The layer beneath<br /><em style={{ ...gold }}>everything else.</em>
          </h1>
          <p style={{ ...serif, fontSize: '1.3125rem', fontWeight: 300, fontStyle: 'italic', ...meta, lineHeight: 1.65, maxWidth: '480px' }}>
            Most frameworks begin after baseline stability is already online. Foundation builds it.
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.2)', margin: '40px 0' }} />

        <PhaseBlock
          number="Phase 1"
          name="Baseline"
          desc="Regulated internal stability — the floor you stand on. Check in before and after to see what the audio actually does to your system."
        >
          <BaselineCard
            user={user}
            audioUrl={audioUrl}
            audioLoading={audioLoading}
            audioError={audioError}
            sessions={sessions}
            onAfterComplete={async (afterData, beforeData, updatedSessions) => {
              await writeSummary(user, updatedSessions, afterData, beforeData)
              // Write to North Star cross-tool memory — stable note, deduplicates on every completion
              supabase.from('north_star_notes').upsert(
                { user_id: user.id, tool: 'foundation', note: 'Foundation Baseline practice active.' },
                { onConflict: 'user_id,tool,note' }
              ).catch(() => {})
            }}
          />
        </PhaseBlock>

        {user && sessions.length > 0 && (
          <FoundationReview user={user} sessions={sessions} />
        )}

        {/* Phase 2 — Calibration: coming in next release */}
        <PhaseBlock
          number="Phase 2"
          name="Calibration"
          desc="Developing the capacity to move your state deliberately — not just recover from it."
        >
          <PhasePlaceholder title="Calibration" />
        </PhaseBlock>

        {/* Phase 3 — Embodying: coming in next release */}
        <PhaseBlock
          number="Phase 3"
          name="Embodying"
          desc="Living from a regulated ground — not as practice, but as your natural state."
        >
          <PhasePlaceholder title="Embodying" />
        </PhaseBlock>

        <QuoteBlock text="It has helped me reset my baseline in the middle of the day — to relax, let go, and create space for a more supportive inner story. One that naturally inspires aligned action rather than effort or striving." cite="David William Pierce" />
        <QuoteBlock text="There was this sense of feeling held throughout. His presence is unmistakably there." cite="David William Pierce" />

        <div style={{ background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '24px 28px', marginTop: '48px' }}>
          <span style={{ display: 'block', ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '10px' }}>How to use this</span>
          <p style={{ ...serif, fontSize: '1.25rem', fontWeight: 300, ...meta, lineHeight: 1.75 }}>
            Return to Baseline as often as you need it {'\u2014'} morning, midday, or whenever the ground feels unsteady. The before and after check-ins are optional but the data compounds. Over time you{'\u2019'}ll see what the audio actually does to your system, consistently, across weeks and months.
          </p>
        </div>
      </div>
      <ToolCompassPanel />
      <ProtocolPanel />
    </div>
    </AccessGate>
  )
}
