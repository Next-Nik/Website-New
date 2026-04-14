import { useState, useRef, useEffect } from 'react'
import { ToolCompassPanel } from '../../components/ToolCompassPanel'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { supabase } from '../../hooks/useSupabase'
import { FlamePicker, FlameGlyph, FlameSlider } from '../../components/FlameCheckIn'
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
        Horizon State {'\u00B7'} Foundation {'\u00B7'} 20 min
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
          Horizon State is part of the Horizon Suite {'\u2014'} a free account keeps your progress and gives you access to the full protocol.
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
        writeSummary(user, sessions, null, null)
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
    const periodId  = `${dateStr}-foundation-baseline-${stage}`
    await supabase.from('pulse_entries').upsert({
      user_id: user.id, type: 'foundation_checkin', period_id: periodId,
      source: 'foundation', audio_phase: 'baseline', checkin_stage: stage,
      week_id: weekId, month_id: monthId, quarter_id: quarterId, year_id: yearId,
      value, note: note || null, completed_at: nowStr, updated_at: nowStr,
    }, { onConflict: 'user_id,type,period_id' })
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
          <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', ...muted, lineHeight: 1.75, marginBottom: '6px' }}>
            Done. See you tomorrow.
          </p>
          <p style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(200,146,42,0.55)', marginBottom: '20px' }}>
            {sessionCount} session{sessionCount !== 1 ? 's' : ''} this week
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setBeforeDone(false); setAfterDone(false); setAfterUnlocked(false); setBeforeValue(5); setAfterValue(5); setBeforeNote(''); setAfterNote(''); setShowBeginPopup(true) }}
              style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', ...gold, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Listen again {'\u2192'}
            </button>
            <a href="/profile#foundation" style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: 'rgba(200,146,42,0.6)', textDecoration: 'none' }}>
              View your journal {'\u2192'}
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', minHeight: '420px' }}>
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
      `}</style>

      {/* ── Begin popup — fires every visit, click anywhere dismisses ── */}
      {showBeginPopup && (
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
            Horizon State {'\u00B7'} Foundation
          </span>
          <p style={{ ...serif, fontSize: '1.375rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.75, marginBottom: '24px', maxWidth: '320px' }}>
            Regulated internal stability {'\u2014'} the floor you stand on. Check in before and after to see what the audio actually does to your system.
          </p>
          <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: 'rgba(200,146,42,0.78)' }}>
            Tap anywhere to begin
          </span>
        </div>
      )}

      {/* ══ MOBILE LAYOUT ════════════════════════════════════════════════════════ */}
      <div className="hs-mobile-only" style={{ flexDirection: 'column' }}>

        {/* Lock / unlock status — above flames */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          {!beforeDone ? (
            <span style={{ ...serif, fontSize: '1rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)' }}>
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
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.22em', color: beforeDone ? 'rgba(168,114,26,0.38)' : '#A8721A', textTransform: 'uppercase', marginBottom: '8px' }}>
              Before
            </span>
            <div style={{ pointerEvents: beforeDone ? 'none' : 'auto', opacity: beforeDone ? 0.38 : 1, transition: 'opacity 0.5s ease' }}>
              <FlameSlider value={beforeValue} onChange={setBeforeValue} ghostValue={null} />
            </div>
            <span style={{ ...serif, fontSize: '0.875rem', fontStyle: 'italic', color: beforeDone ? 'rgba(168,114,26,0.38)' : 'rgba(15,21,35,0.45)', marginTop: '6px' }}>
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
            <span style={{ ...serif, fontSize: '0.875rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', marginTop: '6px' }}>
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
                style={{ width: '100%', padding: '10px 14px', fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: '1rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', background: 'rgba(200,146,42,0.025)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', outline: 'none', resize: 'none', lineHeight: 1.6, transition: 'border-color 0.2s', boxSizing: 'border-box', opacity: beforeDone ? 0.5 : 1 }}
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
                placeholder={'What I’m stepping away with…'}
                rows={3}
                style={{ width: '100%', padding: '10px 14px', fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: '1rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', background: 'rgba(200,146,42,0.025)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', outline: 'none', resize: 'none', lineHeight: 1.6, transition: 'border-color 0.2s', boxSizing: 'border-box' }}
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
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(200,146,42,0.5)', textAlign: 'center', marginBottom: '8px' }}>
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
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(168,114,26,0.55)', textTransform: 'uppercase', marginBottom: '12px' }}>Before {'\u00B7'} Foundation</span>
          <p style={{ ...serif, fontSize: '1.0625rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.55)', textAlign: 'center', marginBottom: '20px', lineHeight: 1.55 }}>Where is the flame right now?</p>
          <div style={{ pointerEvents: beforeDone ? 'none' : 'auto', marginBottom: '14px' }}>
            <FlameSlider value={beforeValue} onChange={setBeforeValue} ghostValue={null} />
          </div>
          <textarea value={beforeNote} onChange={e => setBeforeNote(e.target.value)}
            placeholder={'what walked in with you today\u2026'} rows={2} disabled={beforeDone}
            style={{ width: '100%', padding: '10px 14px', fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: '1rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', background: 'rgba(200,146,42,0.025)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', outline: 'none', resize: 'none', lineHeight: 1.6, marginBottom: '14px', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
            onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.45)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.18)' }}
          />
          {!beforeDone && (
            <button onClick={handleBegin} disabled={saving} style={{ width: '100%', padding: '12px', ...sc, fontSize: '1.125rem', letterSpacing: '0.14em', color: '#A8721A', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', cursor: saving ? 'default' : 'pointer', transition: 'all 0.2s', opacity: saving ? 0.6 : 1 }}>Begin {'\u2192'}</button>
          )}
        </div>

        {/* Audio */}
        <div className="hs-col-audio-desktop" style={{ flexDirection: 'column', justifyContent: 'flex-start' }}>
          {audioLoading && <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', ...muted }}>Loading audio{'\u2026'}</p>}
          {audioError  && <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(138,48,48,0.7)' }}>{audioError}</p>}
          {!audioLoading && !audioError && audioUrl && (
            <AudioPlayer url={audioUrl} locked={!beforeDone} onNearEnd={() => setAfterUnlocked(true)} onEnded={() => setAfterUnlocked(true)} />
          )}
          {!user && !audioLoading && !audioError && (
            <div style={{ padding: '20px 22px', background: 'rgba(15,21,35,0.02)', border: '1.5px solid rgba(200,146,42,0.2)', borderRadius: '14px', opacity: 0.6 }}>
              <p style={{ ...serif, fontSize: '1.3125rem', fontStyle: 'italic', ...muted, marginBottom: '14px', lineHeight: 1.6 }}>Check-in to unlock the audio.</p>
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...muted, marginBottom: '12px' }}>Horizon State {'\u00B7'} Foundation {'\u00B7'} 20 min</div>
              <button onClick={() => setShowModal(true)} style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', ...gold, fontSize: '18px' }}>{'\u25B6'}</button>
            </div>
          )}
        </div>

        {/* After */}
        <div className="hs-col-after-desktop" style={{ flexDirection: 'column', alignItems: 'center', opacity: afterUnlocked ? 1 : 0.22, transition: 'opacity 0.8s ease', pointerEvents: afterUnlocked ? 'auto' : 'none' }}>
          <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.22em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '4px' }}>After</span>
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(168,114,26,0.55)', textTransform: 'uppercase', marginBottom: '12px' }}>After {'\u00B7'} Foundation</span>
          <p style={{ ...serif, fontSize: '1.0625rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.55)', textAlign: 'center', marginBottom: '20px', lineHeight: 1.55 }}>And now{'\u2014'}?</p>
          <div style={{ marginBottom: '14px' }}>
            <FlameSlider value={afterValue} onChange={setAfterValue} ghostValue={beforeDone ? beforeValue : null} />
          </div>
          <textarea value={afterNote} onChange={e => setAfterNote(e.target.value)}
            placeholder={'What I\u2019m stepping away with\u2026'} rows={2}
            style={{ width: '100%', padding: '10px 14px', fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: '1rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', background: 'rgba(200,146,42,0.025)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', outline: 'none', resize: 'none', lineHeight: 1.6, marginBottom: '14px', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
            onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.45)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.18)' }}
          />
          {afterUnlocked && (
            <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '12px', ...sc, fontSize: '1.125rem', letterSpacing: '0.14em', color: '#A8721A', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', cursor: saving ? 'default' : 'pointer', transition: 'all 0.2s', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving\u2026' : 'Save \u2713'}</button>
          )}
        </div>

      </div>

      {showModal && <AuthModal onDismiss={() => setShowModal(false)} />}
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
  const [activePhase,  setActivePhase]  = useState('foundation')

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
    <AccessGate productKey="foundation" toolName="Horizon State">
    <div className="page-shell">
      <style>{MOBILE_STYLES}</style>
      <Nav activePath="life-os" />
      <div className="tool-wrap">
        <div className="tool-header">
          <span className="tool-eyebrow">Horizon Suite {'\u00B7'} Horizon State</span>
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

        {/* ── Phase tab toggle ── */}
        {(() => {
          const phases = [
            { key: 'foundation',  label: 'Foundation',  number: '1' },
            { key: 'calibration', label: 'Calibration', number: '2' },
            { key: 'embodying',   label: 'Embodying',   number: '3' },
          ]

          return (
            <div>
              {/* Tab bar */}
              <div style={{ display: 'flex', gap: '0', marginBottom: '32px', borderBottom: '1px solid rgba(200,146,42,0.2)' }}>
                {phases.map(p => {
                  const isActive = activePhase === p.key
                  const isLocked = p.key !== 'foundation'
                  return (
                    <button
                      key={p.key}
                      onClick={() => setActivePhase(p.key)}
                      style={{
                        ...sc, fontSize: '15px', letterSpacing: '0.16em',
                        padding: '12px 20px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: isActive ? '#A8721A' : isLocked ? 'rgba(200,146,42,0.3)' : 'rgba(200,146,42,0.55)',
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
                  <BaselineCard
                    user={user}
                    audioUrl={audioUrl}
                    audioLoading={audioLoading}
                    audioError={audioError}
                    sessions={sessions}
                    onAfterComplete={async (afterData, beforeData, updatedSessions) => {
                      await writeSummary(user, updatedSessions, afterData, beforeData)
                      supabase.from('north_star_notes').upsert(
                        { user_id: user.id, tool: 'foundation', note: 'Foundation Baseline practice active.' },
                        { onConflict: 'user_id,tool,note' }
                      )
                    }}
                  />
                </div>
              )}

              {/* Phase 2 — Calibration (coming) */}
              {activePhase === 'calibration' && (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: 'rgba(200,146,42,0.4)', display: 'block', marginBottom: '12px' }}>
                    Coming soon
                  </span>
                  <p style={{ ...serif, fontSize: '1.25rem', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', lineHeight: 1.7, maxWidth: '380px', margin: '0 auto' }}>
                    Developing the capacity to move your state deliberately — not just recover from it.
                  </p>
                </div>
              )}

              {/* Phase 3 — Embodying (coming) */}
              {activePhase === 'embodying' && (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: 'rgba(200,146,42,0.4)', display: 'block', marginBottom: '12px' }}>
                    Coming soon
                  </span>
                  <p style={{ ...serif, fontSize: '1.25rem', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', lineHeight: 1.7, maxWidth: '380px', margin: '0 auto' }}>
                    Living from a regulated ground — not as practice, but as your natural state.
                  </p>
                </div>
              )}
            </div>
          )
        })()}

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
