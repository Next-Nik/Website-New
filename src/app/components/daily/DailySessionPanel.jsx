// ─────────────────────────────────────────────────────────────
// DailySessionPanel.jsx
//
// The Daily session: the slider sandwich around a composable
// morning. Four acts —
//
//   ARRIVE  — one felt-sense slider (left), an embark token
//             (right) holding the promise of the second
//             measurement, a note, Begin. Opens the session.
//   DECK    — the day's tools as cards: Audio (phase library),
//             Horizon Practice, Get To Do (Win the Day),
//             Journal. Any order, any number — including none.
//             Completed cards collapse. A walking gold border
//             suggests the next tool without gating anything.
//             A session bar pins the arrival mark and keeps
//             Embark always one tap away.
//   EMBARK  — mirrored: shift card left, slider right with the
//             morning mark as a ghost. Wins confirmed on effort
//             ("Showed up"), never outcome. Found wins. The
//             morning's victory line resurfaces above "Mark the
//             day," with the breath pacer alongside.
//   SEAL    — today's shift, the week as flames, the streak,
//             the user's Horizon Self statement, done.
//
// Data: slider values write to horizon_state_checkins exactly as
// BaselineCard did (same period_id format), so streaks, summaries,
// and reports keep working untouched. Everything the session adds
// (wins, found wins, victory line, tools done) lives on
// daily_sessions (migration 110). Journal quick-writes go to
// journal_entries. The deepest practices (Horizon Practice) stay
// page-level — the deck routes to them and detects completion.
//
// Fast doors, slow rooms: friction inside a beat is the practice;
// friction between beats is tax. Framings fire once, ever.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { FlameSlider, FlameGlyph } from '../../../components/FlameCheckIn'
import { useHorizonStateData, writeSummary } from '../../../tools/horizon-state/HorizonState'
import BreathPacer from './BreathPacer'
import WinTheDay from './WinTheDay'

const GOLD    = '#C8922A'
const GOLD_DK = '#A8721A'
const INK     = '#0F1523'
const SC      = "'Cormorant SC', Georgia, serif"
const BODY    = "'Lora', Georgia, serif"
const DISP    = "'Cormorant Garamond', Georgia, serif"
const META    = 'rgba(15,21,35,0.72)'
const FAINT   = 'rgba(15,21,35,0.55)'
const RULE    = 'rgba(200,146,42,0.20)'
const CARD_BG = 'rgba(200,146,42,0.04)'

const BUCKET = 'nextus-audio'

const PHASES = [
  { key: 'baseline',    label: 'Foundation',  file: 'foundation-baseline.mp3',    duration: '20 min', sub: 'regulated floor' },
  { key: 'calibration', label: 'Calibration', file: 'foundation-calibration.mp3', duration: '20 min', sub: 'opens with your I Am statements' },
  { key: 'embodiment',  label: 'Embodiment',  file: 'foundation-embodiment.mp3',  duration: '20 min', sub: 'opens after Calibration' },
]
const PHASE_ORDER = ['baseline', 'calibration', 'embodiment']

// ─── Date helpers (mirrors HorizonState.jsx, not exported there) ──
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

function fmtShift(n) {
  const v = Math.round(n * 10) / 10
  return `${v > 0 ? '+' : ''}${v}`
}

// ─── Small shared pieces ──────────────────────────────────────

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '12px',
        fontFamily: SC, fontSize: '14px', letterSpacing: '0.14em',
        color: GOLD_DK, background: 'rgba(200,146,42,0.05)',
        border: `1.5px solid ${disabled ? RULE : 'rgba(200,146,42,0.78)'}`,
        borderRadius: '40px', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1, transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  )
}

function NoteField({ value, onChange, placeholder, disabled }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      disabled={disabled}
      style={{
        width: '100%', padding: '10px 14px', fontFamily: BODY, fontSize: '0.9375rem',
        color: META, background: 'rgba(200,146,42,0.05)',
        border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px',
        outline: 'none', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box',
        opacity: disabled ? 0.5 : 1,
      }}
      onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.45)' }}
      onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.18)' }}
    />
  )
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null
  return (
    <div role="alert" style={{
      margin: '0 0 14px', padding: '11px 14px',
      background: 'rgba(196,80,16,0.08)', border: '1px solid rgba(196,80,16,0.30)',
      borderLeft: '3px solid #B85010', borderRadius: '6px',
      display: 'flex', justifyContent: 'space-between', gap: '10px',
    }}>
      <span style={{ fontFamily: BODY, fontSize: '13.5px', color: '#7A2D08', lineHeight: 1.5 }}>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss"
        style={{ fontFamily: SC, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#7A2D08', padding: '0 4px', flexShrink: 0 }}>
        ✕
      </button>
    </div>
  )
}

// ─── Audio card (expanded): phase library + inline player ─────

function AudioCard({ currentPhase, donePhase, onDone, onCollapse }) {
  const [selected, setSelected] = useState(null)   // phase key
  const [url, setUrl]           = useState(null)
  const [playing, setPlaying]   = useState(false)
  const [current, setCurrent]   = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef   = useRef(null)
  const nearEndRef = useRef(false)

  const unlockedIdx = PHASE_ORDER.indexOf(currentPhase) >= 0 ? PHASE_ORDER.indexOf(currentPhase) : 0

  useEffect(() => {
    if (!selected) return
    const phase = PHASES.find(p => p.key === selected)
    if (!phase) return
    let a
    try {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(phase.file)
      if (!data?.publicUrl) return
      setUrl(data.publicUrl)
      a = new Audio(data.publicUrl)
      a.preload = 'metadata'
      audioRef.current = a
      nearEndRef.current = false
      a.addEventListener('loadedmetadata', () => setDuration(a.duration))
      a.addEventListener('timeupdate', () => {
        setCurrent(a.currentTime)
        if (!nearEndRef.current && a.duration > 0 && (a.duration - a.currentTime) <= 60) {
          nearEndRef.current = true
          onDone(selected)
        }
      })
      a.addEventListener('ended', () => {
        setPlaying(false)
        if (!nearEndRef.current) { nearEndRef.current = true; onDone(selected) }
      })
    } catch { /* audio init failed; row simply won't play */ }
    return () => {
      try { if (a) { a.pause(); a.src = '' } } catch { /* iOS AbortError — safe */ }
    }
  }, [selected])

  function toggle() {
    const a = audioRef.current; if (!a) return
    if (a.paused) { a.play(); setPlaying(true) }
    else          { a.pause(); setPlaying(false) }
  }

  function fmt(s) {
    if (!s || isNaN(s)) return '--:--'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const pctPlayed = duration ? (current / duration) * 100 : 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontFamily: SC, fontSize: '13px', letterSpacing: '0.16em', color: INK }}>AUDIO</span>
        <button onClick={onCollapse}
          style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.14em', background: 'none', border: 'none', color: FAINT, cursor: 'pointer', padding: 0 }}>
          CLOSE ✕
        </button>
      </div>

      {PHASES.map((p, idx) => {
        const locked = idx > unlockedIdx
        const isSel  = selected === p.key
        const isDone = donePhase === p.key
        return (
          <div key={p.key} style={{ marginBottom: '8px' }}>
            <button
              onClick={() => { if (!locked) setSelected(isSel ? null : p.key) }}
              disabled={locked}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', textAlign: 'left', padding: '10px 12px',
                border: locked ? `1px dashed ${RULE}` : `1px solid ${isSel ? GOLD : RULE}`,
                borderRadius: '8px', background: isSel ? 'rgba(200,146,42,0.06)' : 'none',
                cursor: locked ? 'default' : 'pointer',
                transition: 'border-color 0.15s ease',
              }}
            >
              <span>
                <span style={{ fontFamily: BODY, fontSize: '13.5px', color: locked ? FAINT : INK, display: 'block' }}>
                  Horizon State · {p.label}
                </span>
                <span style={{ fontFamily: SC, fontSize: '10px', letterSpacing: '0.14em', color: FAINT }}>
                  {locked ? p.sub.toUpperCase() : `${p.duration.toUpperCase()} · ${p.sub.toUpperCase()}`}
                </span>
              </span>
              <span style={{ fontFamily: SC, fontSize: '12px', color: locked ? FAINT : GOLD_DK, flexShrink: 0, marginLeft: '10px' }}>
                {locked ? '🔒' : isDone ? '✓' : isSel ? '▾' : '▸'}
              </span>
            </button>

            {isSel && !locked && (
              <div style={{ padding: '12px 12px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <button
                    onClick={toggle}
                    disabled={!url}
                    aria-label={playing ? 'Pause' : 'Play'}
                    style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: playing ? 'rgba(200,146,42,0.1)' : 'rgba(200,146,42,0.05)',
                      border: '1.5px solid rgba(200,146,42,0.78)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: GOLD_DK, fontSize: '14px', flexShrink: 0,
                    }}
                  >
                    {playing ? '⏸' : '▶'}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div
                      onClick={e => {
                        const a = audioRef.current
                        if (!a || !duration) return
                        const rect = e.currentTarget.getBoundingClientRect()
                        a.currentTime = ((e.clientX - rect.left) / rect.width) * duration
                      }}
                      style={{ width: '100%', height: '4px', background: 'rgba(200,146,42,0.15)', borderRadius: '2px', cursor: 'pointer', position: 'relative' }}
                    >
                      <div style={{ height: '100%', width: `${pctPlayed}%`, background: GOLD, borderRadius: '2px', transition: 'width 0.4s linear' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                      <span style={{ fontFamily: SC, fontSize: '11px', color: FAINT }}>{fmt(current)}</span>
                      <span style={{ fontFamily: SC, fontSize: '11px', color: FAINT }}>{fmt(duration)}</span>
                    </div>
                  </div>
                </div>

                {/* Phase 1 carries the breath — the pacer breathes
                    with the Foundation audio. Later phases stay clean. */}
                {p.key === 'baseline' && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                    <BreathPacer size={56} />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <p style={{ fontFamily: SC, fontSize: '10px', letterSpacing: '0.16em', color: FAINT, textAlign: 'center', margin: '10px 0 0' }}>
        MORE AUDIO COMING
      </p>
    </div>
  )
}

// ─── Journal quick-write ──────────────────────────────────────

function JournalCard({ user, onDone, onCollapse }) {
  const [text, setText]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function save() {
    const body = text.trim()
    if (!body || !user?.id) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('journal_entries')
      .insert({ user_id: user.id, body })
    setSaving(false)
    if (err) {
      setError(`Couldn't save. ${err.message || 'Please try again.'}`)
      return
    }
    onDone()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontFamily: SC, fontSize: '13px', letterSpacing: '0.16em', color: INK }}>JOURNAL</span>
        <button onClick={onCollapse}
          style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.14em', background: 'none', border: 'none', color: FAINT, cursor: 'pointer', padding: 0 }}>
          CLOSE ✕
        </button>
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <NoteField value={text} onChange={setText} placeholder="Write…" />
      <div style={{ marginTop: '10px' }}>
        <PrimaryButton onClick={save} disabled={!text.trim() || saving}>
          {saving ? 'Saving…' : 'Save ✓'}
        </PrimaryButton>
      </div>
    </div>
  )
}

// ─── The panel ────────────────────────────────────────────────

export default function DailySessionPanel({
  user,
  sprintData,
  practiceData,
  mapComplete,
  onNavigate,
}) {
  const today = getLocalDateStr()
  const { sessions, lifeIaStatement, currentPhase, reload } = useHorizonStateData(user)

  // act: 'loading' | 'arrive' | 'deck' | 'embark' | 'seal'
  const [act, setAct]               = useState('loading')
  const [deckView, setDeckView]     = useState('cards')   // 'cards' | 'audio' | 'wtd' | 'journal'
  const [beforeValue, setBeforeValue] = useState(5)
  const [beforeNote, setBeforeNote]   = useState('')
  const [afterValue, setAfterValue]   = useState(5)
  const [afterNote, setAfterNote]     = useState('')
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState('')
  const [foundDraft, setFoundDraft]   = useState('')

  // daily_sessions row
  const [daily, setDaily]             = useState({ wins: [], found_wins: [], victory_line: null, tools_done: [] })
  const sessionsLoadedRef = useRef(false)

  // Load the daily_sessions row for today
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    supabase
      .from('daily_sessions')
      .select('wins, found_wins, victory_line, tools_done')
      .eq('user_id', user.id)
      .eq('session_date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) {
          setDaily({
            wins:         Array.isArray(data.wins) ? data.wins : [],
            found_wins:   Array.isArray(data.found_wins) ? data.found_wins : [],
            victory_line: data.victory_line || null,
            tools_done:   Array.isArray(data.tools_done) ? data.tools_done : [],
          })
        }
      })
    return () => { cancelled = true }
  }, [user?.id, today])

  // Derive the opening act from today's actual checkin row —
  // fetched directly so the opening view never races the hook's
  // larger sessions query.
  useEffect(() => {
    if (!user?.id) return
    if (sessionsLoadedRef.current) return
    let cancelled = false
    supabase
      .from('horizon_state_checkins')
      .select('before_value, before_note, after_value, after_note')
      .eq('user_id', user.id)
      .like('period_id', `${today}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: row }) => {
        if (cancelled) return
        sessionsLoadedRef.current = true
        const hasBefore = row?.before_value !== null && row?.before_value !== undefined
        const hasAfter  = row?.after_value  !== null && row?.after_value  !== undefined
        if (hasAfter) {
          if (hasBefore) { setBeforeValue(row.before_value); setBeforeNote(row.before_note ?? '') }
          setAfterValue(row.after_value)
          setAfterNote(row.after_note ?? '')
          setAct('seal')
        } else if (hasBefore) {
          setBeforeValue(row.before_value)
          setBeforeNote(row.before_note ?? '')
          setAfterValue(row.before_value)
          setAct('deck')
        } else {
          setAct('arrive')
        }
      })
    return () => { cancelled = true }
  }, [user?.id, today])

  // ── Persistence helpers ─────────────────────────────────────

  async function saveCheckin(stage, value, note) {
    if (!user?.id) throw new Error('Not signed in.')
    const now     = new Date()
    const nowStr  = now.toISOString()
    const dateStr = getLocalDateStr(now)
    const payload = {
      user_id:     user.id,
      period_id:   `${dateStr}-horizon-state-${currentPhase}`,
      audio_phase: currentPhase,
      week_id:     getWeekId(now),
      month_id:    getMonthId(now),
      quarter_id:  getQuarterId(now),
      year_id:     getYearId(now),
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
    if (error) throw error
  }

  async function saveDaily(patch) {
    const next = { ...daily, ...patch }
    setDaily(next)
    if (!user?.id) return next
    const { error } = await supabase
      .from('daily_sessions')
      .upsert({
        user_id:      user.id,
        session_date: today,
        wins:         next.wins,
        found_wins:   next.found_wins,
        victory_line: next.victory_line,
        tools_done:   next.tools_done,
      }, { onConflict: 'user_id,session_date' })
    if (error) console.error('[Daily] daily_sessions save failed:', error)
    return next
  }

  function markTool(tag) {
    if (daily.tools_done.includes(tag)) return
    saveDaily({ tools_done: [...daily.tools_done.filter(t => !(tag.startsWith('audio:') && t.startsWith('audio:'))), tag] })
  }

  // ── Act transitions ─────────────────────────────────────────

  async function handleBegin() {
    setSaving(true)
    setSaveError('')
    try {
      await saveCheckin('before', beforeValue, beforeNote)
      setAfterValue(beforeValue)
      setAct('deck')
    } catch (e) {
      setSaveError(`Couldn't save your check-in. ${e?.message || 'Please try again.'}`)
    }
    setSaving(false)
  }

  async function handleEmbark() {
    setSaving(true)
    setSaveError('')
    try {
      await saveCheckin('after', afterValue, afterNote)
      const nowIso = new Date().toISOString()
      const updatedSessions = [
        ...sessions.filter(s => !(s.checkin_stage === 'after' && s.completed_at?.startsWith(today))),
        {
          checkin_stage: 'after', value: afterValue, note: afterNote,
          completed_at: nowIso,
          week_id: getWeekId(), month_id: getMonthId(),
          quarter_id: getQuarterId(), year_id: getYearId(),
        },
      ]
      // Ensure the before is present for pairing even on a resumed session
      if (!updatedSessions.some(s => s.checkin_stage === 'before' && s.completed_at?.startsWith(today))) {
        updatedSessions.push({
          checkin_stage: 'before', value: beforeValue, note: beforeNote,
          completed_at: nowIso,
          week_id: getWeekId(), month_id: getMonthId(),
          quarter_id: getQuarterId(), year_id: getYearId(),
        })
      }
      await writeSummary(
        user, updatedSessions,
        { value: afterValue, note: afterNote, timestamp: nowIso },
        { value: beforeValue, note: beforeNote },
        currentPhase
      )
      setAct('seal')
      reload()
    } catch (e) {
      setSaveError(`Couldn't save your check-in. ${e?.message || 'Please try again.'}`)
    }
    setSaving(false)
  }

  // ── Derived ─────────────────────────────────────────────────

  const audioDoneTag  = daily.tools_done.find(t => t.startsWith('audio:'))
  const audioDonePhase = audioDoneTag ? audioDoneTag.split(':')[1] : null
  const practiceDone  = practiceData?.check_date === today || daily.tools_done.includes('practice')
  const wtdDone       = daily.wins.some(w => w.seen)
  const journalDone   = daily.tools_done.includes('journal')

  const cardOrder = [
    { key: 'audio',    done: !!audioDoneTag },
    { key: 'practice', done: practiceDone },
    { key: 'wtd',      done: wtdDone },
    { key: 'journal',  done: journalDone },
  ]
  const nextKey = cardOrder.find(c => !c.done)?.key || null

  const shift = afterValue - beforeValue

  // ── Render: loading ─────────────────────────────────────────

  if (act === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <span style={{ fontFamily: SC, fontSize: '12px', letterSpacing: '0.2em', color: FAINT }}>
          OPENING…
        </span>
      </div>
    )
  }

  // ── Render: ARRIVE ──────────────────────────────────────────

  if (act === 'arrive') {
    return (
      <div>
        <p style={{ fontFamily: SC, fontSize: '12px', letterSpacing: '0.2em', color: GOLD_DK, margin: '0 0 4px', textTransform: 'uppercase' }}>
          Daily · Arriving
        </p>
        <p style={{ fontFamily: DISP, fontSize: '1.375rem', color: INK, margin: '0 0 18px' }}>
          Where are you landing?
        </p>
        <ErrorBanner message={saveError} onDismiss={() => setSaveError('')} />

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* Slider lives LEFT in the morning */}
          <div style={{ flexShrink: 0 }}>
            <FlameSlider value={beforeValue} onChange={setBeforeValue} ghostValue={null} />
          </div>

          {/* The embark token — the promise of the second measurement */}
          <div style={{
            width: '104px', flexShrink: 0, marginTop: '24px',
            border: '1px dashed rgba(200,146,42,0.35)', borderRadius: '10px',
            padding: '14px 8px', textAlign: 'center',
          }}>
            <div style={{ opacity: 0.4, display: 'flex', justifyContent: 'center' }}>
              <FlameGlyph value={5} size={30} ghost />
            </div>
            <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.18em', color: META, margin: '8px 0 2px' }}>
              EMBARK
            </p>
            <p style={{ fontFamily: DISP, fontSize: '1.125rem', color: FAINT, margin: '0 0 8px' }}>—</p>
            <p style={{ fontFamily: BODY, fontSize: '11.5px', color: FAINT, lineHeight: 1.5, margin: 0 }}>
              Check in when you're done.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <NoteField
            value={beforeNote}
            onChange={setBeforeNote}
            placeholder={"A note about where you're starting…"}
          />
        </div>
        <div style={{ marginTop: '12px' }}>
          <PrimaryButton onClick={handleBegin} disabled={saving}>
            {saving ? 'Saving…' : 'Begin →'}
          </PrimaryButton>
        </div>
      </div>
    )
  }

  // ── Render: DECK ────────────────────────────────────────────

  if (act === 'deck') {
    const sessionBar = (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: `0.5px solid ${RULE}`, borderRadius: '40px',
        padding: '6px 8px 6px 14px', marginBottom: '16px', background: CARD_BG,
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: SC, fontSize: '12px', letterSpacing: '0.12em', color: META }}>
          <FlameGlyph value={beforeValue} size={18} />
          ARRIVED {beforeValue}
        </span>
        <button
          onClick={() => setAct('embark')}
          style={{
            fontFamily: SC, fontSize: '12px', letterSpacing: '0.12em',
            color: GOLD_DK, border: `1px solid ${GOLD}`, borderRadius: '40px',
            padding: '6px 14px', background: 'none', cursor: 'pointer',
          }}
        >
          EMBARK →
        </button>
      </div>
    )

    if (deckView === 'audio') {
      return (
        <div>
          {sessionBar}
          <AudioCard
            currentPhase={currentPhase}
            donePhase={audioDonePhase}
            onDone={(phase) => markTool(`audio:${phase}`)}
            onCollapse={() => setDeckView('cards')}
          />
        </div>
      )
    }

    if (deckView === 'wtd') {
      return (
        <div>
          {sessionBar}
          <WinTheDay
            sprintData={sprintData}
            wins={daily.wins}
            victoryLine={daily.victory_line}
            onComplete={({ wins, victoryLine }) => {
              saveDaily({
                wins,
                victory_line: victoryLine,
                tools_done: daily.tools_done.includes('win-the-day')
                  ? daily.tools_done
                  : [...daily.tools_done, 'win-the-day'],
              })
              setDeckView('cards')
            }}
            onClose={() => setDeckView('cards')}
          />
        </div>
      )
    }

    if (deckView === 'journal') {
      return (
        <div>
          {sessionBar}
          <JournalCard
            user={user}
            onDone={() => { markTool('journal'); setDeckView('cards') }}
            onCollapse={() => setDeckView('cards')}
          />
        </div>
      )
    }

    // deckView === 'cards'
    const doneLine = (label, detail) => (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: `0.5px solid ${RULE}`, borderRadius: '8px',
        padding: '10px 14px', marginBottom: '8px', background: CARD_BG,
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: BODY, fontSize: '13.5px', color: META }}>
          <FlameGlyph value={8} size={15} />
          {label}
        </span>
        <span style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.12em', color: '#2A8C4F' }}>
          ✓ {detail || 'DONE'}
        </span>
      </div>
    )

    const fullCard = ({ key, name, sub, meta, onClick, locked }) => (
      <button
        key={key}
        onClick={onClick}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          border: locked ? `1px dashed rgba(200,146,42,0.35)` : `1px solid ${nextKey === key ? GOLD : RULE}`,
          borderRadius: '10px', padding: '14px 16px', marginBottom: '8px',
          background: 'none', cursor: 'pointer', transition: 'border-color 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: sub ? '4px' : 0 }}>
          <span style={{ fontFamily: SC, fontSize: '13px', letterSpacing: '0.14em', color: INK }}>{name}</span>
          <span style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.14em', color: locked ? FAINT : GOLD_DK }}>
            {locked ? 'SEE WHAT UNLOCKS IT →' : meta || 'OPEN →'}
          </span>
        </div>
        {sub && (
          <p style={{ fontFamily: BODY, fontSize: '12.5px', color: FAINT, lineHeight: 1.55, margin: 0 }}>{sub}</p>
        )}
      </button>
    )

    return (
      <div>
        {sessionBar}
        <p style={{ fontFamily: DISP, fontSize: '1.25rem', color: INK, margin: '0 0 14px' }}>
          Your morning. Any order.
        </p>

        {audioDoneTag
          ? doneLine('Audio', (PHASES.find(p => p.key === audioDonePhase)?.label || '').toUpperCase())
          : fullCard({
              key: 'audio', name: 'AUDIO',
              sub: 'Horizon State — land in your body.',
              onClick: () => setDeckView('audio'),
            })}

        {practiceDone
          ? doneLine('Horizon Practice')
          : fullCard({
              key: 'practice', name: 'HORIZON PRACTICE',
              sub: mapComplete
                ? 'The morning sequence. Six beats, voiced from your Horizon Self.'
                : 'Opens with your I Am statements — continue your journey to unlock it.',
              locked: !mapComplete,
              onClick: () => onNavigate(mapComplete ? '/tools/horizon-practice' : '/nextu'),
            })}

        {wtdDone
          ? doneLine('Win the Day', `${daily.wins.filter(w => w.seen).length} SEEN`)
          : fullCard({
              key: 'wtd', name: 'GET TO DO · WIN THE DAY',
              sub: 'What does winning your day look like?',
              onClick: () => setDeckView('wtd'),
            })}

        {journalDone
          ? doneLine('Journal')
          : fullCard({
              key: 'journal', name: 'JOURNAL',
              sub: null, meta: 'WRITE →',
              onClick: () => setDeckView('journal'),
            })}

        <p style={{ fontFamily: BODY, fontSize: '12px', color: FAINT, textAlign: 'center', margin: '14px 0 0', lineHeight: 1.6 }}>
          Or none of them — the morning is yours. Embark when you're ready.
        </p>
      </div>
    )
  }

  // ── Render: EMBARK ──────────────────────────────────────────

  if (act === 'embark') {
    const morningWins = daily.wins.filter(w => w.seen)

    return (
      <div>
        {/* Mirrored: header right-aligned, slider on the right */}
        <p style={{ fontFamily: SC, fontSize: '12px', letterSpacing: '0.2em', color: GOLD_DK, margin: '0 0 4px', textTransform: 'uppercase', textAlign: 'right' }}>
          Daily · Embarking
        </p>
        <p style={{ fontFamily: DISP, fontSize: '1.375rem', color: INK, margin: '0 0 18px', textAlign: 'right' }}>
          And now?
        </p>
        <ErrorBanner message={saveError} onDismiss={() => setSaveError('')} />

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* Shift card holds the LEFT in the evening */}
          <div style={{
            width: '104px', flexShrink: 0, marginTop: '24px',
            border: `0.5px solid ${RULE}`, borderRadius: '10px',
            padding: '14px 8px', textAlign: 'center', background: CARD_BG,
          }}>
            <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.18em', color: META, margin: '0 0 4px' }}>
              SHIFT
            </p>
            <p style={{ fontFamily: DISP, fontSize: '1.625rem', color: GOLD_DK, margin: 0, fontWeight: 500 }}>
              {fmtShift(shift)}
            </p>
            <p style={{ fontFamily: BODY, fontSize: '11.5px', color: FAINT, lineHeight: 1.5, margin: '6px 0 0' }}>
              from {beforeValue} this morning
            </p>
          </div>

          {/* Slider lives RIGHT in the evening, morning mark as ghost */}
          <div style={{ flexShrink: 0 }}>
            <FlameSlider value={afterValue} onChange={setAfterValue} ghostValue={beforeValue} />
          </div>
        </div>

        {/* Wins — confirmed on effort, never outcome */}
        {morningWins.length > 0 && (
          <div style={{ marginTop: '18px' }}>
            <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.18em', color: GOLD_DK, margin: '0 0 8px' }}>
              THIS MORNING YOU SAW THESE DONE
            </p>
            {morningWins.map(w => (
              <div key={w.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', marginBottom: '6px',
                border: `0.5px solid ${RULE}`, borderRadius: '8px',
              }}>
                <span style={{ flex: 1, fontFamily: BODY, fontSize: '13px', color: META, lineHeight: 1.4 }}>
                  {w.text}
                </span>
                <button
                  onClick={() => saveDaily({ wins: daily.wins.map(x => x.id === w.id ? { ...x, showed_up: x.showed_up === true ? null : true } : x) })}
                  style={{
                    fontFamily: SC, fontSize: '10.5px', letterSpacing: '0.1em',
                    padding: '5px 10px', borderRadius: '40px', cursor: 'pointer',
                    border: `1px solid ${w.showed_up === true ? GOLD : RULE}`,
                    background: w.showed_up === true ? 'rgba(200,146,42,0.10)' : 'none',
                    color: w.showed_up === true ? GOLD_DK : FAINT,
                  }}
                >
                  SHOWED UP
                </button>
                <button
                  onClick={() => saveDaily({ wins: daily.wins.map(x => x.id === w.id ? { ...x, showed_up: x.showed_up === false ? null : false } : x) })}
                  style={{
                    fontFamily: SC, fontSize: '10.5px', letterSpacing: '0.1em',
                    padding: '5px 10px', borderRadius: '40px', cursor: 'pointer',
                    border: `1px solid ${w.showed_up === false ? 'rgba(15,21,35,0.30)' : RULE}`,
                    background: 'none',
                    color: w.showed_up === false ? META : FAINT,
                  }}
                >
                  CARRIED
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Found wins — what the lens found that the morning never named */}
        <div style={{ marginTop: '14px' }}>
          {daily.found_wins.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 12px', marginBottom: '6px',
              border: `0.5px solid ${RULE}`, borderRadius: '8px', background: CARD_BG,
            }}>
              <FlameGlyph value={8} size={14} />
              <span style={{ flex: 1, fontFamily: BODY, fontSize: '13px', color: META }}>{f.text}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={foundDraft}
              onChange={e => setFoundDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && foundDraft.trim()) {
                  saveDaily({ found_wins: [...daily.found_wins, { id: `found-${Date.now()}`, text: foundDraft.trim() }] })
                  setFoundDraft('')
                }
              }}
              placeholder="A win the day handed you…"
              style={{
                flex: 1, padding: '9px 12px', fontFamily: BODY, fontSize: '13px',
                color: META, background: 'rgba(200,146,42,0.04)',
                border: '1px dashed rgba(200,146,42,0.30)', borderRadius: '8px', outline: 'none',
              }}
            />
            <button
              onClick={() => {
                if (!foundDraft.trim()) return
                saveDaily({ found_wins: [...daily.found_wins, { id: `found-${Date.now()}`, text: foundDraft.trim() }] })
                setFoundDraft('')
              }}
              style={{
                fontFamily: SC, fontSize: '13px', padding: '0 14px',
                border: `1px solid ${RULE}`, borderRadius: '8px', background: 'none',
                color: GOLD_DK, cursor: 'pointer', opacity: foundDraft.trim() ? 1 : 0.4,
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Mark the day — with the pacer breathing alongside */}
        <div style={{ marginTop: '20px' }}>
          {daily.victory_line && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontFamily: BODY, fontSize: '0.9375rem', fontStyle: 'italic', color: GOLD_DK, lineHeight: 1.6, margin: 0 }}>
                {daily.victory_line}
              </p>
              <p style={{ fontFamily: SC, fontSize: '10px', letterSpacing: '0.16em', color: FAINT, margin: '3px 0 0' }}>
                THIS MORNING
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: DISP, fontSize: '1.125rem', color: INK, margin: '0 0 8px' }}>
                Mark the day.
              </p>
              <NoteField value={afterNote} onChange={setAfterNote} placeholder="From the Horizon Self's seat — what happened today…" />
            </div>
            <div style={{ flexShrink: 0, paddingTop: '6px' }}>
              <BreathPacer size={56} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '14px' }}>
          <PrimaryButton onClick={handleEmbark} disabled={saving}>
            {saving ? 'Saving…' : 'Embark →'}
          </PrimaryButton>
        </div>
        <button
          onClick={() => setAct('deck')}
          style={{
            display: 'block', margin: '12px auto 0',
            fontFamily: SC, fontSize: '11px', letterSpacing: '0.16em',
            background: 'none', border: 'none', color: FAINT, cursor: 'pointer',
          }}
        >
          ← BACK TO THE DECK
        </button>
      </div>
    )
  }

  // ── Render: SEAL ────────────────────────────────────────────

  // Week flames — Monday through Sunday, lit where an after exists
  const weekStart = (() => {
    const d = new Date(); d.setHours(0,0,0,0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return d
  })()
  const afterDates = new Set(
    sessions.filter(s => s.checkin_stage === 'after' && s.completed_at)
      .map(s => s.completed_at.slice(0, 10))
  )
  afterDates.add(today)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
    const ds = getLocalDateStr(d)
    return { ds, lit: afterDates.has(ds), isToday: ds === today, future: d > new Date() }
  })

  // Streak — consecutive days ending today with an after check-in
  let streak = 0
  {
    const cursor = new Date()
    while (afterDates.has(getLocalDateStr(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  const showedUp = daily.wins.filter(w => w.showed_up === true).length
  const found    = daily.found_wins.length

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <FlameGlyph value={Math.max(0, Math.min(10, afterValue))} size={56} />
      </div>
      <p style={{ fontFamily: DISP, fontSize: '1.75rem', color: GOLD_DK, margin: '0 0 2px', fontWeight: 500 }}>
        {fmtShift(shift)} today
      </p>
      <p style={{ fontFamily: SC, fontSize: '12px', letterSpacing: '0.14em', color: META, margin: '0 0 16px' }}>
        {beforeValue} → {afterValue}
      </p>

      {(showedUp > 0 || found > 0) && (
        <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.16em', color: GOLD_DK, margin: '0 0 14px' }}>
          {showedUp > 0 ? `SHOWED UP × ${showedUp}` : ''}
          {showedUp > 0 && found > 0 ? ' · ' : ''}
          {found > 0 ? `FOUND × ${found}` : ''}
        </p>
      )}

      {/* The week as flames */}
      <div style={{ display: 'inline-flex', gap: '8px', marginBottom: '6px' }}>
        {weekDays.map(d => (
          <span key={d.ds} style={{ opacity: d.lit ? 1 : 0.22, transform: d.isToday ? 'scale(1.25)' : 'none' }}>
            <FlameGlyph value={d.lit ? (d.isToday ? 8 : 6) : 2} size={16} ghost={!d.lit} />
          </span>
        ))}
      </div>
      <p style={{ fontFamily: SC, fontSize: '12px', letterSpacing: '0.16em', color: GOLD_DK, margin: '0 0 18px' }}>
        {streak} DAY{streak !== 1 ? 'S' : ''} OF SHOWING UP
      </p>

      {lifeIaStatement && (
        <div style={{ margin: '0 auto 18px', maxWidth: '380px', padding: '13px 18px', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '10px', background: 'rgba(200,146,42,0.04)' }}>
          <p style={{ fontFamily: BODY, fontSize: '1rem', fontStyle: 'italic', color: GOLD_DK, lineHeight: 1.7, margin: 0 }}>
            {lifeIaStatement}
          </p>
        </div>
      )}

      <p style={{ fontFamily: BODY, fontSize: '1rem', color: META, margin: '0 0 14px' }}>
        Done. See you tomorrow.
      </p>

      <button
        onClick={() => setAct('deck')}
        style={{
          fontFamily: SC, fontSize: '12px', letterSpacing: '0.16em',
          background: 'none', border: 'none', color: GOLD_DK, cursor: 'pointer',
        }}
      >
        BACK TO THE DECK →
      </button>
    </div>
  )
}
