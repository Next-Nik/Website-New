// ─────────────────────────────────────────────────────────────
// DailySessionPanel.jsx
//
// The Daily panel in Mission Control. Six tool cards — tap any
// to enter. No session flow gating. Fast doors, slow rooms.
//
// Tools:
//   HORIZON STATE   — full protocol: audio picker → arrive
//                     slider → listen → embark slider. The
//                     sandwich as designed, self-contained.
//   HORIZON PRACTICE → navigates to /tools/horizon-practice
//   GET TO DO        — Win the Day Nikhedonia beat (WinTheDay)
//   JOURNAL · MORNING → navigates to /journal
//   JOURNAL · EVENING — "Mark the day" + breath pacer, writes
//                     to journal_entries
//   AUDIO            — standalone listen, phase/track picker,
//                     no sliders
//
// Props:
//   user         — Supabase auth user
//   sprintData   — target_sprint rows for Win the Day field
//   practiceData — latest horizon_practice_checkins row
//   mapComplete  — boolean, gates Horizon Practice
//   onNavigate   — (path) => void
//   onOpenGetToDo — () => void  (opens the Get To Do panel)
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { supabase }                    from '../../../hooks/useSupabase'
import { FlameSlider, FlameGlyph }     from '../../../components/FlameCheckIn'
import { useHorizonStateData, writeSummary } from '../../../tools/horizon-state/HorizonState'
import BreathPacer from './BreathPacer'
import WinTheDay   from './WinTheDay'

// ─── Design tokens ────────────────────────────────────────────
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

// ─── Audio ────────────────────────────────────────────────────
const BUCKET = 'nextus-audio'
const PHASES = [
  { key: 'baseline',    label: 'Foundation',  file: 'foundation-baseline.mp3',    duration: '20 min', sub: 'regulated floor' },
  { key: 'calibration', label: 'Calibration', file: 'foundation-calibration.mp3', duration: '20 min', sub: 'opens with your I Am statements' },
  { key: 'embodiment',  label: 'Embodiment',  file: 'foundation-embodiment.mp3',  duration: '20 min', sub: 'opens after Calibration' },
]
const PHASE_ORDER = ['baseline', 'calibration', 'embodiment']

// ─── Date helpers ─────────────────────────────────────────────
function getLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function getWeekId(date = new Date()) {
  const d = new Date(date); d.setHours(0,0,0,0)
  const day = d.getDay()
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7))
  return `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`
}
function getMonthId(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
function getQuarterId(d = new Date()) { return `${d.getFullYear()}-Q${Math.floor(d.getMonth()/3)+1}` }
function getYearId(d = new Date()) { return String(d.getFullYear()) }
function fmtShift(n) { const v = Math.round(n*10)/10; return `${v>0?'+':''}${v}` }

// ─── Shared primitives ────────────────────────────────────────
function PrimaryBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '11px',
      fontFamily: SC, fontSize: '13px', letterSpacing: '0.14em',
      color: GOLD_DK, background: CARD_BG,
      border: `1.5px solid ${disabled ? RULE : 'rgba(200,146,42,0.78)'}`,
      borderRadius: '40px', cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.55 : 1, transition: 'all 0.2s',
    }}>{children}</button>
  )
}

function NoteField({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows} style={{
        width: '100%', padding: '10px 14px', fontFamily: BODY, fontSize: '0.9375rem',
        color: META, background: 'rgba(200,146,42,0.05)',
        border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px',
        outline: 'none', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box',
      }}
      onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.45)' }}
      onBlur={e =>  { e.target.style.borderColor = 'rgba(200,146,42,0.18)' }}
    />
  )
}

function BackBtn({ label = '← BACK', onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', marginBottom: '16px',
      fontFamily: SC, fontSize: '11px', letterSpacing: '0.18em',
      background: 'none', border: 'none', color: FAINT, cursor: 'pointer', padding: 0,
    }}>{label}</button>
  )
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null
  return (
    <div role="alert" style={{
      margin: '0 0 12px', padding: '10px 14px',
      background: 'rgba(196,80,16,0.08)', border: '1px solid rgba(196,80,16,0.28)',
      borderLeft: '3px solid #B85010', borderRadius: '6px',
      display: 'flex', justifyContent: 'space-between', gap: '8px',
    }}>
      <span style={{ fontFamily: BODY, fontSize: '13px', color: '#7A2D08', lineHeight: 1.5 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A2D08', padding: '0 2px', flexShrink: 0 }}>✕</button>
    </div>
  )
}

// ─── Tool card — the chooser surface ─────────────────────────
function ToolCard({ name, sub, meta, locked, active, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '13px 16px', marginBottom: '8px',
        border: locked
          ? `1px dashed rgba(200,146,42,0.28)`
          : `1px solid ${active || hover ? GOLD : RULE}`,
        borderRadius: '10px',
        background: active ? 'rgba(200,146,42,0.07)' : hover ? CARD_BG : 'none',
        cursor: 'pointer', transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
        <span style={{ fontFamily: SC, fontSize: '13px', letterSpacing: '0.14em', color: locked ? FAINT : INK }}>
          {name}
        </span>
        <span style={{ fontFamily: SC, fontSize: '10.5px', letterSpacing: '0.16em', color: locked ? FAINT : GOLD_DK, flexShrink: 0 }}>
          {locked ? 'LOCKED' : active ? 'OPEN ▾' : meta || 'OPEN →'}
        </span>
      </div>
      {sub && (
        <p style={{ fontFamily: BODY, fontSize: '12.5px', color: FAINT, lineHeight: 1.55, margin: '3px 0 0' }}>
          {sub}
        </p>
      )}
    </button>
  )
}

// ─── Audio player (shared by Horizon State + standalone Audio) ─
function AudioPlayer({ currentPhase, showBreath = false }) {
  const unlockedIdx = PHASE_ORDER.indexOf(currentPhase) >= 0 ? PHASE_ORDER.indexOf(currentPhase) : 0
  const [selected, setSelected] = useState(null)
  const [playing, setPlaying]   = useState(false)
  const [current, setCurrent]   = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!selected) return
    const phase = PHASES.find(p => p.key === selected)
    if (!phase) return
    let a
    try {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(phase.file)
      if (!data?.publicUrl) return
      a = new Audio(data.publicUrl)
      a.preload = 'metadata'
      audioRef.current = a
      a.addEventListener('loadedmetadata', () => setDuration(a.duration))
      a.addEventListener('timeupdate',     () => setCurrent(a.currentTime))
      a.addEventListener('ended',          () => setPlaying(false))
    } catch { /* silent */ }
    return () => {
      try { if (a) { a.pause(); a.src = '' } } catch { /* iOS AbortError */ }
    }
  }, [selected])

  function toggle() {
    const a = audioRef.current; if (!a) return
    if (a.paused) { a.play(); setPlaying(true) }
    else          { a.pause(); setPlaying(false) }
  }

  function fmt(s) {
    if (!s || isNaN(s)) return '--:--'
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
  }

  const pct = duration ? (current/duration)*100 : 0

  return (
    <div>
      {/* Phase picker */}
      {PHASES.map((p, idx) => {
        const locked = idx > unlockedIdx
        const isSel  = selected === p.key
        return (
          <div key={p.key} style={{ marginBottom: '8px' }}>
            <button
              onClick={() => { if (!locked) setSelected(isSel ? null : p.key) }}
              disabled={locked}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', textAlign: 'left', padding: '10px 14px',
                border: locked ? `1px dashed ${RULE}` : `1px solid ${isSel ? GOLD : RULE}`,
                borderRadius: '8px', background: isSel ? 'rgba(200,146,42,0.06)' : 'none',
                cursor: locked ? 'default' : 'pointer', transition: 'border-color 0.15s',
              }}
            >
              <span>
                <span style={{ fontFamily: BODY, fontSize: '13.5px', color: locked ? FAINT : INK, display: 'block' }}>
                  Horizon State · {p.label}
                </span>
                <span style={{ fontFamily: SC, fontSize: '10px', letterSpacing: '0.14em', color: FAINT }}>
                  {p.duration.toUpperCase()} · {p.sub.toUpperCase()}
                </span>
              </span>
              <span style={{ fontFamily: SC, fontSize: '12px', color: locked ? FAINT : GOLD_DK, marginLeft: '10px' }}>
                {locked ? '🔒' : isSel ? '▾' : '▸'}
              </span>
            </button>

            {isSel && !locked && (
              <div style={{ padding: '12px 14px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                  <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: playing ? 'rgba(200,146,42,0.10)' : CARD_BG,
                    border: '1.5px solid rgba(200,146,42,0.78)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: GOLD_DK, fontSize: '15px',
                  }}>
                    {playing ? '⏸' : '▶'}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div
                      onClick={e => {
                        const a = audioRef.current; if (!a || !duration) return
                        const r = e.currentTarget.getBoundingClientRect()
                        a.currentTime = ((e.clientX - r.left) / r.width) * duration
                      }}
                      style={{ width: '100%', height: '4px', background: 'rgba(200,146,42,0.15)', borderRadius: '2px', cursor: 'pointer' }}
                    >
                      <div style={{ height: '100%', width: `${pct}%`, background: GOLD, borderRadius: '2px', transition: 'width 0.4s linear' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                      <span style={{ fontFamily: SC, fontSize: '11px', color: FAINT }}>{fmt(current)}</span>
                      <span style={{ fontFamily: SC, fontSize: '11px', color: FAINT }}>{fmt(duration)}</span>
                    </div>
                  </div>
                </div>
                {showBreath && p.key === 'baseline' && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                    <BreathPacer size={56} />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      <p style={{ fontFamily: SC, fontSize: '10px', letterSpacing: '0.16em', color: FAINT, textAlign: 'center', margin: '8px 0 0' }}>
        MORE AUDIO COMING
      </p>
    </div>
  )
}

// ─── Horizon State — full protocol ───────────────────────────
// Arrive → audio picker → Embark → Seal
function HorizonStateProtocol({ user, currentPhase, sessions, lifeIaStatement, reload }) {
  const today = getLocalDateStr()
  const [step, setStep]           = useState('arrive')  // arrive | listen | embark | seal
  const [beforeValue, setBefore]  = useState(5)
  const [beforeNote, setBeforeNote] = useState('')
  const [afterValue, setAfter]    = useState(5)
  const [afterNote, setAfterNote]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Resume state if already checked in today
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('horizon_state_checkins')
      .select('before_value, before_note, after_value, after_note')
      .eq('user_id', user.id)
      .like('period_id', `${today}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: row }) => {
        if (!row) return
        const hasBefore = row.before_value != null
        const hasAfter  = row.after_value  != null
        if (hasBefore) { setBefore(row.before_value); setBeforeNote(row.before_note ?? '') }
        if (hasAfter)  { setAfter(row.after_value);   setAfterNote(row.after_note ?? ''); setStep('seal') }
        else if (hasBefore) { setAfter(row.before_value); setStep('listen') }
      })
  }, [user?.id, today])

  async function saveCheckin(stage, value, note) {
    const now = new Date()
    const payload = {
      user_id:     user.id,
      period_id:   `${today}-horizon-state-${currentPhase}`,
      audio_phase: currentPhase,
      week_id:     getWeekId(now),
      month_id:    getMonthId(now),
      quarter_id:  getQuarterId(now),
      year_id:     getYearId(now),
    }
    if (stage === 'before') {
      payload.before_value = value; payload.before_note = note || null; payload.before_at = now.toISOString()
    } else {
      payload.after_value = value; payload.after_note = note || null; payload.after_at = now.toISOString()
    }
    const { error } = await supabase
      .from('horizon_state_checkins')
      .upsert(payload, { onConflict: 'user_id,period_id' })
    if (error) throw error
  }

  async function handleArrive() {
    setSaving(true); setError('')
    try {
      await saveCheckin('before', beforeValue, beforeNote)
      setAfter(beforeValue)
      setStep('listen')
    } catch (e) { setError(e?.message || 'Could not save. Please try again.') }
    setSaving(false)
  }

  async function handleEmbark() {
    setSaving(true); setError('')
    try {
      await saveCheckin('after', afterValue, afterNote)
      const nowIso = new Date().toISOString()
      const updatedSessions = [
        ...sessions.filter(s => !s.completed_at?.startsWith(today)),
        { checkin_stage: 'before', value: beforeValue, note: beforeNote, completed_at: nowIso,
          week_id: getWeekId(), month_id: getMonthId(), quarter_id: getQuarterId(), year_id: getYearId() },
        { checkin_stage: 'after',  value: afterValue,  note: afterNote,  completed_at: nowIso,
          week_id: getWeekId(), month_id: getMonthId(), quarter_id: getQuarterId(), year_id: getYearId() },
      ]
      await writeSummary(user, updatedSessions,
        { value: afterValue, note: afterNote, timestamp: nowIso },
        { value: beforeValue, note: beforeNote },
        currentPhase)
      setStep('seal')
      reload()
    } catch (e) { setError(e?.message || 'Could not save. Please try again.') }
    setSaving(false)
  }

  const shift = afterValue - beforeValue

  // Streak
  const afterDates = new Set(
    sessions.filter(s => s.checkin_stage === 'after' && s.completed_at)
      .map(s => s.completed_at.slice(0,10))
  )
  afterDates.add(today)
  let streak = 0
  { const c = new Date(); while (afterDates.has(getLocalDateStr(c))) { streak++; c.setDate(c.getDate()-1) } }

  if (step === 'arrive') return (
    <div>
      <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.2em', color: GOLD_DK, margin: '0 0 4px' }}>HORIZON STATE · ARRIVING</p>
      <p style={{ fontFamily: DISP, fontSize: '1.25rem', color: INK, margin: '0 0 16px' }}>Where are you landing?</p>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0 }}>
          <FlameSlider value={beforeValue} onChange={setBefore} ghostValue={null} />
        </div>
        <div style={{ flex: 1, marginTop: '24px',
          border: '1px dashed rgba(200,146,42,0.35)', borderRadius: '10px',
          padding: '14px 10px', textAlign: 'center' }}>
          <div style={{ opacity: 0.35, display: 'flex', justifyContent: 'center' }}>
            <FlameGlyph value={5} size={28} ghost />
          </div>
          <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.18em', color: META, margin: '8px 0 2px' }}>EMBARK</p>
          <p style={{ fontFamily: DISP, fontSize: '1rem', color: FAINT, margin: '0 0 6px' }}>—</p>
          <p style={{ fontFamily: BODY, fontSize: '11.5px', color: FAINT, lineHeight: 1.5, margin: 0 }}>Check in when you're done.</p>
        </div>
      </div>
      <div style={{ marginTop: '14px' }}>
        <NoteField value={beforeNote} onChange={setBeforeNote} placeholder="A note about where you're starting…" rows={2} />
      </div>
      <div style={{ marginTop: '10px' }}>
        <PrimaryBtn onClick={handleArrive} disabled={saving}>{saving ? 'Saving…' : 'Begin →'}</PrimaryBtn>
      </div>
    </div>
  )

  if (step === 'listen') return (
    <div>
      <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.2em', color: GOLD_DK, margin: '0 0 4px' }}>HORIZON STATE · LISTENING</p>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 12px 5px 10px',
        background: CARD_BG, border: `0.5px solid ${RULE}`, borderRadius: '40px', marginBottom: '14px' }}>
        <FlameGlyph value={beforeValue} size={16} />
        <span style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.14em', color: META }}>ARRIVED {beforeValue}</span>
      </div>
      <AudioPlayer currentPhase={currentPhase} showBreath />
      <div style={{ marginTop: '14px' }}>
        <PrimaryBtn onClick={() => setStep('embark')}>Done listening → Embark</PrimaryBtn>
      </div>
    </div>
  )

  if (step === 'embark') return (
    <div>
      <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.2em', color: GOLD_DK, margin: '0 0 4px', textAlign: 'right' }}>HORIZON STATE · EMBARKING</p>
      <p style={{ fontFamily: DISP, fontSize: '1.25rem', color: INK, margin: '0 0 16px', textAlign: 'right' }}>And now?</p>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, marginTop: '24px', border: `0.5px solid ${RULE}`, borderRadius: '10px',
          padding: '14px 10px', textAlign: 'center', background: CARD_BG }}>
          <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.18em', color: META, margin: '0 0 4px' }}>SHIFT</p>
          <p style={{ fontFamily: DISP, fontSize: '1.5rem', color: GOLD_DK, margin: 0, fontWeight: 500 }}>{fmtShift(shift)}</p>
          <p style={{ fontFamily: BODY, fontSize: '11.5px', color: FAINT, lineHeight: 1.5, margin: '6px 0 0' }}>from {beforeValue} this morning</p>
        </div>
        <div style={{ flexShrink: 0 }}>
          <FlameSlider value={afterValue} onChange={setAfter} ghostValue={beforeValue} />
        </div>
      </div>
      <div style={{ marginTop: '14px' }}>
        <NoteField value={afterNote} onChange={setAfterNote} placeholder="Mark the day…" rows={2} />
      </div>
      <div style={{ marginTop: '10px' }}>
        <PrimaryBtn onClick={handleEmbark} disabled={saving}>{saving ? 'Saving…' : 'Embark →'}</PrimaryBtn>
      </div>
      <button onClick={() => setStep('listen')} style={{
        display: 'block', margin: '10px auto 0',
        fontFamily: SC, fontSize: '11px', letterSpacing: '0.16em',
        background: 'none', border: 'none', color: FAINT, cursor: 'pointer',
      }}>← BACK TO AUDIO</button>
    </div>
  )

  // seal
  const weekStart = (() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return d })()
  const weekDays  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate()+i)
    const ds = getLocalDateStr(d)
    return { ds, lit: afterDates.has(ds), isToday: ds === today }
  })

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <FlameGlyph value={Math.max(0, Math.min(10, afterValue))} size={52} />
      </div>
      <p style={{ fontFamily: DISP, fontSize: '1.75rem', color: GOLD_DK, margin: '0 0 2px', fontWeight: 500 }}>{fmtShift(shift)} today</p>
      <p style={{ fontFamily: SC, fontSize: '12px', letterSpacing: '0.14em', color: META, margin: '0 0 16px' }}>{beforeValue} → {afterValue}</p>
      <div style={{ display: 'inline-flex', gap: '8px', marginBottom: '6px' }}>
        {weekDays.map(d => (
          <span key={d.ds} style={{ opacity: d.lit ? 1 : 0.22, transform: d.isToday ? 'scale(1.25)' : 'none' }}>
            <FlameGlyph value={d.lit ? (d.isToday ? 8 : 6) : 2} size={16} ghost={!d.lit} />
          </span>
        ))}
      </div>
      <p style={{ fontFamily: SC, fontSize: '12px', letterSpacing: '0.16em', color: GOLD_DK, margin: '0 0 16px' }}>
        {streak} DAY{streak !== 1 ? 'S' : ''} OF SHOWING UP
      </p>
      {lifeIaStatement && (
        <div style={{ margin: '0 auto 16px', maxWidth: '360px', padding: '12px 16px',
          border: '1px solid rgba(200,146,42,0.25)', borderRadius: '10px', background: CARD_BG }}>
          <p style={{ fontFamily: BODY, fontSize: '1rem', fontStyle: 'italic', color: GOLD_DK, lineHeight: 1.7, margin: 0 }}>
            {lifeIaStatement}
          </p>
        </div>
      )}
      <p style={{ fontFamily: BODY, fontSize: '1rem', color: META, margin: 0 }}>Done. See you tomorrow.</p>
    </div>
  )
}

// ─── Evening journal ──────────────────────────────────────────
function EveningJournal({ user }) {
  const [text, setText]     = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')

  async function save() {
    const body = text.trim(); if (!body || !user?.id) return
    setSaving(true); setError('')
    const { error: err } = await supabase
      .from('journal_entries')
      .insert({ user_id: user.id, body, domain: null })
    setSaving(false)
    if (err) { setError(err.message || 'Could not save. Please try again.'); return }
    setSaved(true)
  }

  if (saved) return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
        <BreathPacer size={72} />
      </div>
      <p style={{ fontFamily: BODY, fontSize: '1rem', color: META, margin: '14px 0 0' }}>Done. See you tomorrow.</p>
    </div>
  )

  return (
    <div>
      <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.2em', color: GOLD_DK, margin: '0 0 4px' }}>JOURNAL · EVENING</p>
      <p style={{ fontFamily: DISP, fontSize: '1.25rem', color: INK, margin: '0 0 16px' }}>Mark the day.</p>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <NoteField
            value={text} onChange={setText}
            placeholder="From the Horizon Self's seat — what happened today…"
            rows={6}
          />
        </div>
        <div style={{ flexShrink: 0, paddingTop: '4px' }}>
          <BreathPacer size={56} />
        </div>
      </div>
      <div style={{ marginTop: '10px' }}>
        <PrimaryBtn onClick={save} disabled={!text.trim() || saving}>
          {saving ? 'Saving…' : 'Save ✓'}
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ─── Main chooser ─────────────────────────────────────────────
export default function DailySessionPanel({ user, sprintData, practiceData, mapComplete, onNavigate, onOpenGetToDo }) {
  // active: null | 'horizon-state' | 'audio' | 'get-to-do' | 'evening-journal'
  const [active, setActive] = useState(null)
  const { sessions, lifeIaStatement, currentPhase, reload } = useHorizonStateData(user)
  const today = getLocalDateStr()

  const practiceDoneToday = practiceData?.check_date === today

  function close() { setActive(null) }

  // ── Tool views ─────────────────────────────────────────────

  if (active === 'horizon-state') return (
    <div>
      <BackBtn onClick={close} />
      <HorizonStateProtocol
        user={user}
        currentPhase={currentPhase}
        sessions={sessions}
        lifeIaStatement={lifeIaStatement}
        reload={reload}
      />
    </div>
  )

  if (active === 'audio') return (
    <div>
      <BackBtn onClick={close} />
      <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.2em', color: GOLD_DK, margin: '0 0 14px' }}>AUDIO · CHOOSE A TRACK</p>
      <AudioPlayer currentPhase={currentPhase} showBreath />
    </div>
  )

  if (active === 'get-to-do') return (
    <div>
      <BackBtn onClick={close} />
      <WinTheDay
        sprintData={sprintData}
        wins={[]}
        victoryLine={null}
        onComplete={() => close()}
        onClose={close}
      />
    </div>
  )

  if (active === 'evening-journal') return (
    <div>
      <BackBtn onClick={close} />
      <EveningJournal user={user} />
    </div>
  )

  // ── Chooser ────────────────────────────────────────────────
  return (
    <div>
      <ToolCard
        name="HORIZON STATE"
        sub="The full protocol. Arrive, listen, embark."
        active={active === 'horizon-state'}
        onClick={() => setActive('horizon-state')}
      />
      <ToolCard
        name="SENTENCE COMPLETION"
        sub="A stem, finished fast. Once you've settled, let the endings come."
        onClick={() => onNavigate('/tools/sentence-completion')}
      />
      <ToolCard
        name="I AM"
        sub="Write a statement three to ten times. Feel it as you go."
        onClick={() => onNavigate('/tools/i-am')}
      />
      <ToolCard
        name="MORNING PAGES"
        sub="Empty the channel. Whatever's on top, written fast."
        onClick={() => onNavigate('/tools/morning-pages')}
      />
      <ToolCard
        name="HORIZON PRACTICE"
        sub={mapComplete
          ? 'The morning sequence. Six beats, voiced from your Horizon Self.'
          : 'Opens with your I Am statements.'}
        meta={practiceDoneToday ? 'DONE TODAY ✓' : 'OPEN →'}
        locked={!mapComplete}
        onClick={() => { if (mapComplete) onNavigate('/tools/horizon-practice') }}
      />
      <ToolCard
        name="GET TO DO · WIN THE DAY"
        sub="What does winning your day look like?"
        onClick={() => setActive('get-to-do')}
      />
      <ToolCard
        name="JOURNAL · MORNING"
        sub="Write. Fast and free."
        onClick={() => onNavigate('/journal')}
      />
      <ToolCard
        name="JOURNAL · EVENING"
        sub="Mark the day. Breathe with it while you write."
        onClick={() => setActive('evening-journal')}
      />
      <ToolCard
        name="AUDIO"
        sub="Listen without the check-in. Any phase."
        onClick={() => setActive('audio')}
      />
    </div>
  )
}
