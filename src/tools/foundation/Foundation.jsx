import { useState, useRef, useEffect, useCallback } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { FlameGlyph } from '../../components/FlameCheckIn'

const AUDIO_FILE = 'foundation-baseline.mp3'
const BUCKET     = 'nextus-audio'
const UNLOCK_SECS = 15   // after check-in unlocks when this many seconds remain

const sc    = { fontFamily: "var(--font-sc)" }
const serif = { fontFamily: "var(--font-body)" }
const gold  = { color: "var(--gold-dk)" }
const muted = { color: "var(--text-muted)" }
const meta  = { color: "var(--text-meta)" }

// ─── Colour helpers ───────────────────────────────────────────────────────────

function getFlameProps(v) {
  if (v <= 0)  return { color: '#6B7280', glow: 'rgba(107,114,128,0.12)', scale: 0.50, label: 'empty' }
  if (v <= 1)  return { color: '#7A6855', glow: 'rgba(122,104,85,0.15)',  scale: 0.55, label: 'barely present' }
  if (v <= 2)  return { color: '#8B7355', glow: 'rgba(139,115,85,0.18)',  scale: 0.62, label: 'low' }
  if (v <= 3)  return { color: '#A0845C', glow: 'rgba(160,132,92,0.22)',  scale: 0.70, label: 'dim' }
  if (v <= 4)  return { color: '#B8923A', glow: 'rgba(184,146,58,0.28)',  scale: 0.78, label: 'stirring' }
  if (v <= 5)  return { color: '#C8922A', glow: 'rgba(200,146,42,0.35)',  scale: 0.84, label: 'present' }
  if (v <= 6)  return { color: '#D4821A', glow: 'rgba(212,130,26,0.42)',  scale: 0.88, label: 'alive' }
  if (v <= 7)  return { color: '#C8721A', glow: 'rgba(200,114,26,0.48)',  scale: 0.92, label: 'lit' }
  if (v <= 8)  return { color: '#C05A10', glow: 'rgba(192,90,16,0.55)',   scale: 0.96, label: 'burning well' }
  if (v <= 9)  return { color: '#A8721A', glow: 'rgba(168,114,26,0.62)',  scale: 1.00, label: 'bright' }
  return         { color: '#C8922A', glow: 'rgba(200,146,42,0.72)',  scale: 1.08, label: 'going' }
}

function flickerIntensity(v) {
  if (v <= 1) return 0.04
  if (v <= 3) return 0.12
  if (v <= 5) return 0.22
  if (v <= 7) return 0.38
  if (v <= 9) return 0.55
  return 0.75
}

function hapticTick() {
  try { if (navigator.vibrate) navigator.vibrate(8) } catch {}
}

// ─── Vertical flame slider ────────────────────────────────────────────────────

function FlameSlider({ value, onChange, ghostValue = null, disabled = false, size = 72, trackH = 280 }) {
  const trackRef = useRef(null)
  const dragging = useRef(false)
  const lastTick = useRef(-1)

  function posToValue(clientY) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return value
    const pct = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    return Math.round((10 - pct * 10) * 2) / 2
  }

  function handleChange(newVal) {
    if (disabled) return
    if (newVal !== lastTick.current) { hapticTick(); lastTick.current = newVal }
    onChange(newVal)
  }

  const onDown = useCallback((e) => {
    if (disabled) return
    dragging.current = true
    handleChange(posToValue(e.touches ? e.touches[0].clientY : e.clientY))
    e.preventDefault()
  }, [disabled, onChange, value])

  useEffect(() => {
    function move(e) {
      if (!dragging.current) return
      handleChange(posToValue(e.touches ? e.touches[0].clientY : e.clientY))
    }
    function up() { dragging.current = false }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  }, [disabled, onChange])

  const pct  = v => 100 - (v / 10) * 100
  const { color } = getFlameProps(value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div
        ref={trackRef}
        onMouseDown={onDown}
        onTouchStart={onDown}
        style={{
          position: 'relative',
          width: '72px',
          height: `${trackH}px`,
          cursor: disabled ? 'default' : 'pointer',
          touchAction: 'none',
          opacity: disabled ? 0.35 : 1,
          transition: 'opacity 0.6s ease',
        }}
      >
        {/* Track */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          top: 0, bottom: 0, width: '8px', borderRadius: '4px',
          background: 'rgba(200,146,42,0.1)', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${(value / 10) * 100}%`,
            background: 'linear-gradient(to top, #4B5563 0%, #8B7355 22%, #B8923A 42%, #C8922A 58%, #C8721A 73%, #A8721A 87%, #C8922A 100%)',
            borderRadius: '4px',
            transition: 'height 0.08s ease',
          }} />
        </div>

        {/* The Line */}
        <div style={{
          position: 'absolute', left: 'calc(50% + 6px)', top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: '3px',
          pointerEvents: 'none',
        }}>
          <div style={{ width: '10px', height: '1px', background: 'rgba(200,146,42,0.4)' }} />
          <span style={{ ...sc, fontSize: '0.375rem', letterSpacing: '0.14em', color: 'rgba(200,146,42,0.45)', whiteSpace: 'nowrap' }}>The Line</span>
        </div>

        {/* Ghost flame (before marker on after slider) */}
        {ghostValue !== null && (
          <div style={{
            position: 'absolute', left: '50%',
            top: `${pct(ghostValue)}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}>
            <FlameGlyph value={ghostValue} size={32} ghost />
          </div>
        )}

        {/* Live flame */}
        <div style={{
          position: 'absolute', left: '50%',
          top: `${pct(value)}%`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          transition: dragging.current ? 'none' : 'top 0.08s ease',
        }}>
          <FlameGlyph value={value} size={size} />
        </div>
      </div>

      {/* Label */}
      <div style={{
        ...serif, fontSize: '0.8125rem', fontStyle: 'italic',
        color: disabled ? 'rgba(200,146,42,0.3)' : color,
        transition: 'color 0.4s ease',
        textAlign: 'center', minHeight: '18px',
      }}>
        {disabled ? '' : getFlameProps(value).label}
      </div>
    </div>
  )
}

// ─── Centre player ────────────────────────────────────────────────────────────

function CentrePlayer({
  url, audioLocked, afterUnlocked, onAfterUnlock,
  playing, setPlaying, current, setCurrent, duration, setDuration,
}) {
  const audioRef = useRef(null)

  useEffect(() => {
    if (!url) return
    const a = new Audio(url)
    a.preload = 'metadata'
    audioRef.current = a
    a.addEventListener('loadedmetadata', () => setDuration(a.duration))
    a.addEventListener('timeupdate', () => {
      setCurrent(a.currentTime)
      // Unlock after check-in when <= UNLOCK_SECS remain
      if (a.duration && (a.duration - a.currentTime) <= UNLOCK_SECS && !afterUnlocked) {
        onAfterUnlock()
      }
    })
    a.addEventListener('ended', () => { setPlaying(false); setCurrent(0); a.currentTime = 0 })
    return () => { a.pause(); a.src = '' }
  }, [url])

  function toggle() {
    if (audioLocked) return
    const a = audioRef.current; if (!a) return
    if (a.paused) { a.play(); setPlaying(true) }
    else          { a.pause(); setPlaying(false) }
  }

  function seek(e) {
    if (audioLocked) return
    const a = audioRef.current; if (!a || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    a.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  function fmt(s) {
    if (!s || isNaN(s)) return '--:--'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const pct = duration ? (current / duration) * 100 : 0
  const remaining = duration ? duration - current : null
  const nearEnd = remaining !== null && remaining <= UNLOCK_SECS && playing

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '14px', flex: '0 0 auto', width: '100%', maxWidth: '220px',
    }}>
      {/* Phase label */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...sc, fontSize: '0.5625rem', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '2px' }}>Baseline</div>
        <div style={{ ...serif, fontSize: '0.75rem', fontStyle: 'italic', ...muted }}>20 min {'\u00B7'} Part 1 of 3</div>
      </div>

      {/* Play button */}
      <button
        onClick={toggle}
        disabled={audioLocked || !url}
        aria-label={audioLocked ? 'Log state to unlock' : playing ? 'Pause' : 'Play'}
        style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: playing ? 'rgba(200,146,42,0.12)' : 'rgba(200,146,42,0.05)',
          border: `1.5px solid rgba(200,146,42,${audioLocked ? '0.3' : '0.78'})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: audioLocked ? 'default' : 'pointer',
          color: audioLocked ? 'rgba(200,146,42,0.3)' : 'var(--gold-dk)',
          fontSize: '20px', transition: 'all 0.3s ease',
          flexShrink: 0,
        }}
      >
        {audioLocked ? '\u{1F512}' : playing ? '\u23F8' : '\u25B6'}
      </button>

      {/* Lock hint */}
      {audioLocked && (
        <p style={{ ...serif, fontSize: '0.75rem', fontStyle: 'italic', color: 'rgba(200,146,42,0.5)', textAlign: 'center', maxWidth: '160px', margin: 0, lineHeight: 1.5 }}>
          Log your state to begin
        </p>
      )}

      {/* Progress bar */}
      <div style={{ width: '100%' }}>
        <div onClick={seek} style={{
          width: '100%', height: '4px',
          background: 'rgba(200,146,42,0.12)',
          borderRadius: '2px',
          cursor: audioLocked ? 'default' : 'pointer',
          marginBottom: '6px',
        }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: '2px', transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...sc, fontSize: '0.625rem', letterSpacing: '0.06em', ...muted }}>{fmt(current)}</span>
          <span style={{ ...sc, fontSize: '0.625rem', letterSpacing: '0.06em', ...muted }}>{fmt(duration)}</span>
        </div>
      </div>

      {/* Near-end indicator */}
      {nearEnd && (
        <div style={{ ...serif, fontSize: '0.75rem', fontStyle: 'italic', color: 'rgba(200,146,42,0.65)', textAlign: 'center', animation: 'pulse 2s ease-in-out infinite' }}>
          almost there
        </div>
      )}
    </div>
  )
}

// ─── Note field ───────────────────────────────────────────────────────────────

function NoteField({ value, onChange, placeholder, disabled }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={2}
      style={{
        width: '100%', padding: '8px 12px',
        ...serif, fontSize: '0.875rem', fontStyle: 'italic',
        color: 'rgba(15,21,35,0.72)',
        background: disabled ? 'rgba(200,146,42,0.01)' : 'rgba(200,146,42,0.025)',
        border: '1px solid rgba(200,146,42,0.15)',
        borderRadius: '8px', outline: 'none',
        resize: 'none', lineHeight: 1.6,
        transition: 'all 0.3s ease',
        opacity: disabled ? 0.35 : 1,
        touchAction: 'auto',
      }}
      onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.4)' }}
      onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.15)' }}
    />
  )
}

// ─── Baseline Card — the full dual-slider layout ──────────────────────────────

function BaselineCard({ user, audioUrl, audioLoading, audioError }) {
  const [audioLocked,    setAudioLocked]    = useState(true)
  const [afterUnlocked,  setAfterUnlocked]  = useState(false)
  const [beforeSaved,    setBeforeSaved]    = useState(false)
  const [done,           setDone]           = useState(false)

  const [beforeValue,    setBeforeValue]    = useState(5)
  const [beforeNote,     setBeforeNote]     = useState('')
  const [afterValue,     setAfterValue]     = useState(5)
  const [afterNote,      setAfterNote]      = useState('')
  const [saving,         setSaving]         = useState(false)

  // Audio state lifted up so CentrePlayer controls it
  const [playing,   setPlaying]   = useState(false)
  const [current,   setCurrent]   = useState(0)
  const [duration,  setDuration]  = useState(0)

  const [showModal, setShowModal] = useState(false)

  const delta = afterValue - beforeValue

  async function saveBefore() {
    setSaving(true)
    try {
      if (user?.id && supabase) {
        const now   = new Date()
        const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        await supabase.from('pulse_entries').upsert({
          user_id: user.id, type: 'daily',
          period_id: `${today}-foundation-baseline`,
          source: 'foundation', audio_phase: 'baseline',
          before_value: beforeValue, before_note: beforeNote || null,
          before_at: now.toISOString(),
          scores: { spark: beforeValue },
          completed_at: now.toISOString(), updated_at: now.toISOString(),
        }, { onConflict: 'user_id,type,period_id' })
      }
    } catch (e) { console.warn('[Foundation] Save before error:', e) }
    setSaving(false)
    setBeforeSaved(true)
    setAudioLocked(false)
  }

  async function saveAfter() {
    setSaving(true)
    try {
      if (user?.id && supabase) {
        const now   = new Date()
        const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        await supabase.from('pulse_entries').upsert({
          user_id: user.id, type: 'daily',
          period_id: `${today}-foundation-baseline`,
          source: 'foundation', audio_phase: 'baseline',
          after_value: afterValue, after_note: afterNote || null,
          after_at: now.toISOString(),
          scores: { spark: afterValue }, updated_at: now.toISOString(),
        }, { onConflict: 'user_id,type,period_id' })
      }
    } catch (e) { console.warn('[Foundation] Save after error:', e) }
    setSaving(false)
    setDone(true)
  }

  // Unauthenticated — show locked player
  if (!user) {
    return (
      <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '24px' }}>
        <div style={{ ...sc, fontSize: '0.75rem', letterSpacing: '0.14em', ...muted, marginBottom: '4px' }}>Guided audio</div>
        <div style={{ ...serif, fontSize: '1.125rem', fontWeight: 300, color: 'var(--text)', marginBottom: '18px' }}>Foundation {'\u00B7'} Baseline</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => setShowModal(true)} style={{ width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0, background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', ...gold, fontSize: '18px' }}>
            {'\u25B6'}
          </button>
          <div style={{ flex: 1, height: '4px', background: 'rgba(200,146,42,0.15)', borderRadius: '2px' }} />
        </div>
        {showModal && <AuthModal onDismiss={() => setShowModal(false)} />}
      </div>
    )
  }

  if (done) {
    const col   = delta > 0 ? '#5A8AB8' : delta < 0 ? '#8A7030' : 'var(--text-muted)'
    const sym   = delta > 0 ? '\u2191' : delta < 0 ? '\u2193' : '\u2014'
    return (
      <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...sc, fontSize: '0.5rem', letterSpacing: '0.14em', ...muted, marginBottom: '6px' }}>BEFORE</div>
            <FlameGlyph value={beforeValue} size={40} ghost />
          </div>
          <div>
            <div style={{ ...sc, fontSize: '1.25rem', color: col }}>{sym}</div>
            <div style={{ ...serif, fontSize: '0.75rem', fontStyle: 'italic', color: col }}>
              {delta === 0 ? 'steady' : `${Math.abs(delta).toFixed(1)} ${delta > 0 ? 'up' : 'down'}`}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...sc, fontSize: '0.5rem', letterSpacing: '0.14em', ...muted, marginBottom: '6px' }}>AFTER</div>
            <FlameGlyph value={afterValue} size={40} />
          </div>
        </div>
        <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, lineHeight: 1.75, marginBottom: '16px' }}>
          {delta > 0 ? 'The audio moved something.' : delta < 0 ? 'Honest is what matters. The pattern shows over time.' : 'Steady. That\u2019s sometimes the work.'}
        </p>
        <button onClick={() => { setDone(false); setBeforeSaved(false); setAudioLocked(true); setAfterUnlocked(false); setBeforeNote(''); setAfterNote(''); setBeforeValue(5); setAfterValue(5) }} style={{ ...sc, fontSize: '0.75rem', letterSpacing: '0.12em', ...gold, background: 'none', border: 'none', cursor: 'pointer' }}>
          Listen again {'\u2192'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '24px' }}>
      {/* ── Three-column layout: before flame | player | after flame ── */}
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}>

        {/* ── BEFORE flame ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
          <span style={{ ...sc, fontSize: '0.5rem', letterSpacing: '0.18em', color: 'rgba(200,146,42,0.6)', textTransform: 'uppercase' }}>Before</span>
          <FlameSlider
            value={beforeValue}
            onChange={setBeforeValue}
            disabled={beforeSaved}
            size={68}
            trackH={260}
          />
          <NoteField
            value={beforeNote}
            onChange={setBeforeNote}
            placeholder="Notes on current state"
            disabled={beforeSaved}
          />
          {!beforeSaved && (
            <button
              onClick={saveBefore}
              disabled={saving}
              style={{
                width: '100%', padding: '10px',
                ...sc, fontSize: '0.625rem', letterSpacing: '0.14em',
                color: 'rgba(200,146,42,0.9)',
                background: 'rgba(200,146,42,0.05)',
                border: '1.5px solid rgba(200,146,42,0.78)',
                borderRadius: '40px', cursor: 'pointer',
                transition: 'all 0.2s', opacity: saving ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? 'Saving\u2026' : 'Log & unlock \u2192'}
            </button>
          )}
          {beforeSaved && (
            <div style={{ ...serif, fontSize: '0.75rem', fontStyle: 'italic', color: 'rgba(200,146,42,0.55)', textAlign: 'center' }}>
              logged {'\u2713'}
            </div>
          )}
        </div>

        {/* ── CENTRE player ── */}
        <div style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '24px',
          gap: '0',
          minWidth: '100px',
          maxWidth: '180px',
        }}>
          {audioLoading && (
            <p style={{ ...serif, fontSize: '0.75rem', fontStyle: 'italic', ...muted, textAlign: 'center' }}>Loading...</p>
          )}
          {audioError && (
            <p style={{ ...serif, fontSize: '0.75rem', fontStyle: 'italic', color: 'rgba(138,48,48,0.7)', textAlign: 'center' }}>{audioError}</p>
          )}
          {!audioLoading && !audioError && audioUrl && (
            <CentrePlayer
              url={audioUrl}
              audioLocked={audioLocked}
              afterUnlocked={afterUnlocked}
              onAfterUnlock={() => setAfterUnlocked(true)}
              playing={playing}
              setPlaying={setPlaying}
              current={current}
              setCurrent={setCurrent}
              duration={duration}
              setDuration={setDuration}
            />
          )}
        </div>

        {/* ── AFTER flame ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          flex: '0 0 auto',
          opacity: afterUnlocked ? 1 : 0.2,
          transition: 'opacity 0.8s ease',
          pointerEvents: afterUnlocked ? 'auto' : 'none',
        }}>
          <span style={{ ...sc, fontSize: '0.5rem', letterSpacing: '0.18em', color: 'rgba(200,146,42,0.6)', textTransform: 'uppercase' }}>After</span>
          <FlameSlider
            value={afterValue}
            onChange={setAfterValue}
            ghostValue={beforeSaved ? beforeValue : null}
            disabled={!afterUnlocked}
            size={68}
            trackH={260}
          />
          <NoteField
            value={afterNote}
            onChange={setAfterNote}
            placeholder="Notes on current state"
            disabled={!afterUnlocked}
          />
          {afterUnlocked && (
            <button
              onClick={saveAfter}
              disabled={saving}
              style={{
                width: '100%', padding: '10px',
                ...sc, fontSize: '0.625rem', letterSpacing: '0.14em',
                color: 'rgba(200,146,42,0.9)',
                background: 'rgba(200,146,42,0.05)',
                border: '1.5px solid rgba(200,146,42,0.78)',
                borderRadius: '40px', cursor: 'pointer',
                transition: 'all 0.2s', opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving\u2026' : 'Done \u2713'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Auth modal ───────────────────────────────────────────────────────────────

function AuthModal({ onDismiss }) {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div onClick={e => e.target === e.currentTarget && onDismiss()} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '36px 32px 28px', maxWidth: '400px', width: '100%' }}>
        <span style={{ display: 'block', ...sc, fontSize: '0.75rem', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '12px' }}>Foundation</span>
        <h2 style={{ ...sc, fontSize: '1.375rem', fontWeight: 400, color: 'var(--text)', marginBottom: '10px' }}>Sign in to listen.</h2>
        <p style={{ ...serif, fontSize: '1rem', fontWeight: 300, ...meta, lineHeight: 1.7, marginBottom: '24px' }}>Foundation is part of Life OS {'\u2014'} a free account keeps your progress and gives you access to the full protocol.</p>
        <a href={`/login.html?redirect=${returnUrl}`} style={{ display: 'block', width: '100%', padding: '14px', textAlign: 'center', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', ...sc, fontSize: '0.9375rem', letterSpacing: '0.16em', ...gold, textDecoration: 'none', marginBottom: '12px' }}>
          Sign in or create account {'\u2192'}
        </a>
        <button onClick={onDismiss} style={{ display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, cursor: 'pointer', padding: '4px' }}>Not now</button>
      </div>
    </div>
  )
}

// ─── Phase block ──────────────────────────────────────────────────────────────

function PhaseBlock({ number, name, desc, children }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
        <span style={{ ...sc, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', ...gold, flexShrink: 0 }}>{number}</span>
        <span style={{ ...serif, fontSize: '1.25rem', fontWeight: 300, color: 'var(--text)' }}>{name}</span>
      </div>
      <p style={{ ...serif, fontSize: '1rem', fontWeight: 300, ...meta, lineHeight: 1.75, marginBottom: '20px' }}>{desc}</p>
      {children}
    </div>
  )
}

function PhasePlaceholder({ title }) {
  return (
    <div style={{ background: 'rgba(15,21,35,0.015)', border: '1.5px solid rgba(200,146,42,0.2)', borderRadius: '14px', padding: '24px 28px' }}>
      <span style={{ display: 'block', ...sc, fontSize: '0.75rem', letterSpacing: '0.14em', ...muted, marginBottom: '8px' }}>Coming</span>
      <div style={{ ...serif, fontSize: '1.125rem', fontWeight: 300, ...muted, marginBottom: '6px' }}>{title}</div>
      <p style={{ ...serif, fontSize: '0.875rem', fontStyle: 'italic', ...muted, lineHeight: 1.6 }}>This phase unlocks as the protocol develops.</p>
    </div>
  )
}

function QuoteBlock({ text, cite }) {
  return (
    <div style={{ borderLeft: '2px solid rgba(200,146,42,0.2)', padding: '16px 0 16px 24px', margin: '40px 0' }}>
      <p style={{ ...serif, fontSize: '1.0625rem', fontStyle: 'italic', fontWeight: 300, ...meta, lineHeight: 1.75, marginBottom: '12px' }}>{'\u201C'}{text}{'\u201D'}</p>
      <span style={{ ...sc, fontSize: '0.75rem', letterSpacing: '0.12em', ...gold }}>{'\u2014'} {cite}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function FoundationPage() {
  const { user, loading: authLoading } = useAuth()
  const [audioUrl,     setAudioUrl]    = useState(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError,   setAudioError]  = useState(null)

  useEffect(() => {
    if (!user) return
    setAudioLoading(true)
    try {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(AUDIO_FILE)
      if (data?.publicUrl) setAudioUrl(data.publicUrl)
      else setAudioError('Unable to load audio. Please try again shortly.')
    } catch {
      setAudioError('Something went wrong. Please refresh.')
    } finally {
      setAudioLoading(false)
    }
  }, [user])

  if (authLoading) return <div className="loading" />

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />
      <div className="tool-wrap">
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS {'\u00B7'} Foundation</span>
          <h1 style={{ ...serif, fontSize: 'clamp(2.25rem, 5.5vw, 3.25rem)', fontWeight: 300, color: 'var(--text)', lineHeight: 1.06, letterSpacing: '-0.01em', marginBottom: '16px' }}>
            The layer beneath<br /><em style={{ ...gold }}>everything else.</em>
          </h1>
          <p style={{ ...serif, fontSize: '1.0625rem', fontWeight: 300, fontStyle: 'italic', ...meta, lineHeight: 1.65, maxWidth: '480px' }}>
            Most frameworks begin after baseline stability is already online. Foundation builds it.
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.2)', margin: '40px 0' }} />

        <PhaseBlock
          number="Phase 1" name="Baseline"
          desc="Regulated internal stability — the floor you stand on. Set the flame before you listen. The after check-in unlocks in the final moments of the audio."
        >
          <BaselineCard user={user} audioUrl={audioUrl} audioLoading={audioLoading} audioError={audioError} />
        </PhaseBlock>

        <PhaseBlock number="Phase 2" name="Calibrating" desc="Agency, temporal clarity, and directional awareness — the heading you face. Complete Baseline first.">
          <PhasePlaceholder title="Foundation \u00B7 Calibrating" />
        </PhaseBlock>

        <PhaseBlock number="Phase 3" name="Embodying" desc="Action from the Horizon orientation — the accomplished, resourced stance you act from. The completion of the cycle.">
          <PhasePlaceholder title="Foundation \u00B7 Embodying" />
        </PhaseBlock>

        <QuoteBlock text="It has helped me reset my baseline in the middle of the day — to relax, let go, and create space for a more supportive inner story. One that naturally inspires aligned action rather than effort or striving." cite="David William Pierce" />
        <QuoteBlock text="There was this sense of feeling held throughout. His presence is unmistakably there." cite="David William Pierce" />

        <div style={{ background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '24px 28px', marginTop: '48px' }}>
          <span style={{ display: 'block', ...sc, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '10px' }}>How to use this</span>
          <p style={{ ...serif, fontSize: '1rem', fontWeight: 300, ...meta, lineHeight: 1.75 }}>
            Return to Baseline as often as you need it {'\u2014'} morning, midday, or whenever the ground feels unsteady. The before and after check-ins are optional but the data compounds. Over time you{'\u2019'}ll see what the audio actually does to your system, consistently, across weeks and months.
          </p>
        </div>
      </div>
    </div>
  )
}
