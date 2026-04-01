import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'

// ─── Colour scale ─────────────────────────────────────────────────────────────

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

// ─── Radial sparks (behind flame at high values) ──────────────────────────────

function RadialSparks({ value, size }) {
  if (value < 7) return null
  const intensity = (value - 6) / 4  // 0..1 from 7..10
  const count = Math.round(4 + intensity * 8)
  const radius = size * 0.55 + intensity * size * 0.3

  const sparks = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360
    const delay = (i / count) * 1.8
    const dur = 1.2 + Math.random() * 0.8
    const dist = radius * (0.7 + Math.random() * 0.6)
    const x = Math.cos((angle * Math.PI) / 180) * dist
    const y = Math.sin((angle * Math.PI) / 180) * dist
    const r = 1.5 + intensity * 2.5

    return (
      <circle key={i} cx={size / 2} cy={size / 2} r={r}
        fill={value >= 9 ? '#FFF4E0' : '#C8922A'}
        opacity="0"
      >
        <animateMotion
          path={`M 0 0 L ${x} ${y}`}
          dur={`${dur.toFixed(2)}s`}
          begin={`${delay.toFixed(2)}s`}
          repeatCount="indefinite"
          fill="freeze"
        />
        <animate attributeName="opacity"
          values="0;0.9;0"
          dur={`${dur.toFixed(2)}s`}
          begin={`${delay.toFixed(2)}s`}
          repeatCount="indefinite"
        />
        <animate attributeName="r"
          values={`${r};${r * 0.3};0`}
          dur={`${dur.toFixed(2)}s`}
          begin={`${delay.toFixed(2)}s`}
          repeatCount="indefinite"
        />
      </circle>
    )
  })

  return (
    <svg
      width={size * 2} height={size * 2}
      viewBox={`0 0 ${size * 2} ${size * 2}`}
      style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        overflow: 'visible',
        opacity: intensity,
        transition: 'opacity 0.5s ease',
      }}
    >
      {sparks}
    </svg>
  )
}

// ─── Flame SVG ────────────────────────────────────────────────────────────────

export function FlameGlyph({ value = 5, size = 64, ghost = false }) {
  const { color, glow, scale } = getFlameProps(value)
  const fi  = flickerIntensity(value)
  const uid = useRef(`f${Math.random().toString(36).slice(2, 7)}`).current

  const dur1 = (1.8  - fi * 0.7).toFixed(2)
  const dur2 = (2.5  - fi * 1.0).toFixed(2)
  const dur3 = (0.85 - fi * 0.3).toFixed(2)
  const sMin = (1 - fi * 0.16).toFixed(3)
  const sMax = (1 + fi * 0.13).toFixed(3)
  const rAmp = (fi * 9).toFixed(1)

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{
      display: 'block',
      opacity: ghost ? 0.28 : 1,
      filter: ghost ? 'none' : `drop-shadow(0 0 ${(8 * fi).toFixed(0)}px ${color}) drop-shadow(0 0 ${(18 * fi).toFixed(0)}px ${glow})`,
      transition: 'filter 0.5s ease, opacity 0.4s ease',
    }}>
      <defs>
        <radialGradient id={`${uid}-g`} cx="50%" cy="85%" r="65%">
          <stop offset="0%"   stopColor={color}   stopOpacity="1" />
          <stop offset="55%"  stopColor={color}   stopOpacity="0.75" />
          <stop offset="100%" stopColor="#FFF4E0" stopOpacity="0.2" />
        </radialGradient>
      </defs>

      {/* Outer glow — slow sway */}
      <g style={{ transformOrigin: '32px 56px' }}>
        <animateTransform attributeName="transform" type="rotate"
          values={`-${rAmp} 32 56; ${rAmp} 32 56; -${(rAmp*0.6).toFixed(1)} 32 56; ${(rAmp*0.8).toFixed(1)} 32 56; -${rAmp} 32 56`}
          dur={`${dur2}s`} repeatCount="indefinite" />
        <path d="M32 58 C19 58 11 47 13 35 C15 25 22 21 24 13 C26 7 28 3 32 1 C36 3 38 7 40 13 C42 21 49 25 51 35 C53 47 45 58 32 58Z"
          fill={`url(#${uid}-g)`} opacity="0.32"
          style={{ transform: `scale(${(scale*1.18).toFixed(2)})`, transformOrigin: '32px 56px' }} />
      </g>

      {/* Main body — primary flicker */}
      <g style={{ transformOrigin: '32px 56px' }}>
        <animateTransform attributeName="transform" type="scale"
          values={`1 1; ${sMax} ${sMin}; ${sMin} ${sMax}; ${(+sMax*0.97).toFixed(3)} ${(+sMin*1.02).toFixed(3)}; 1 1`}
          dur={`${dur1}s`} repeatCount="indefinite" additive="sum" />
        <path d="M32 56 C22 56 15 47 17 37 C19 29 25 25 27 17 C29 11 30 7 32 4 C34 7 35 11 37 17 C39 25 45 29 47 37 C49 47 42 56 32 56Z"
          fill={color}
          style={{ transform: `scale(${scale})`, transformOrigin: '32px 56px' }} />
      </g>

      {/* Inner bright core */}
      {value > 2 && (
        <g style={{ transformOrigin: '32px 52px' }}>
          <animateTransform attributeName="transform" type="scale"
            values={`1 1; ${(1+fi*0.14).toFixed(3)} ${(1-fi*0.11).toFixed(3)}; ${(1-fi*0.09).toFixed(3)} ${(1+fi*0.16).toFixed(3)}; 1 1`}
            dur={`${dur3}s`} repeatCount="indefinite" />
          <path d="M32 54 C27 54 24 48 25 42 C26 37 29 34 30 29 C31 25 31 23 32 21 C33 23 33 25 34 29 C35 34 38 37 39 42 C40 48 37 54 32 54Z"
            fill="#FFF4E0"
            opacity={Math.min(0.92, fi * 1.3 + 0.08)}
            style={{ transform: `scale(${(scale*0.72).toFixed(2)})`, transformOrigin: '32px 52px' }} />
        </g>
      )}

      {/* Flying sparks */}
      {value >= 7 && (
        <>
          <circle cx="25" cy="16" r="2">
            <animate attributeName="opacity" values="0;0.85;0" dur={`${(+dur3*1.4).toFixed(2)}s`} repeatCount="indefinite" begin="0.15s" />
            <animate attributeName="cy" values="16;9;16" dur={`${(+dur3*1.4).toFixed(2)}s`} repeatCount="indefinite" begin="0.15s" />
            <animate attributeName="fill" values={`${color};#FFF4E0;${color}`} dur={`${(+dur3*1.4).toFixed(2)}s`} repeatCount="indefinite" begin="0.15s" />
          </circle>
          <circle cx="39" cy="12" r="1.5">
            <animate attributeName="opacity" values="0;0.65;0" dur={`${(+dur3*0.9).toFixed(2)}s`} repeatCount="indefinite" begin="0.55s" />
            <animate attributeName="cy" values="12;5;12" dur={`${(+dur3*0.9).toFixed(2)}s`} repeatCount="indefinite" begin="0.55s" />
            <animate attributeName="fill" values="#FFF4E0;#C8922A;#FFF4E0" dur={`${(+dur3*0.9).toFixed(2)}s`} repeatCount="indefinite" begin="0.55s" />
          </circle>
          {value >= 9 && (
            <circle cx="31" cy="8" r="1.2">
              <animate attributeName="opacity" values="0;0.9;0" dur={`${(+dur3*0.7).toFixed(2)}s`} repeatCount="indefinite" begin="0.35s" />
              <animate attributeName="cy" values="8;1;8" dur={`${(+dur3*0.7).toFixed(2)}s`} repeatCount="indefinite" begin="0.35s" />
              <animate attributeName="fill" values="#FFF4E0;#C8922A;#FFF4E0" dur={`${(+dur3*0.7).toFixed(2)}s`} repeatCount="indefinite" begin="0.35s" />
            </circle>
          )}
        </>
      )}
    </svg>
  )
}

// ─── Vertical flame slider ────────────────────────────────────────────────────

function FlameSlider({ value, onChange, ghostValue = null }) {
  const trackRef  = useRef(null)
  const dragging  = useRef(false)
  const lastTick  = useRef(-1)
  const TRACK_H   = 300
  const FLAME_SIZE = 80

  function posToValue(clientY) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return value
    const pct = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const raw  = 10 - pct * 10
    return Math.round(raw * 2) / 2
  }

  function handleChange(newVal) {
    // Haptic tick at each 0.5 step
    if (newVal !== lastTick.current) {
      hapticTick()
      lastTick.current = newVal
    }
    onChange(newVal)
  }

  const onDown = useCallback((e) => {
    dragging.current = true
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    handleChange(posToValue(clientY))
    e.preventDefault()
  }, [onChange])

  useEffect(() => {
    function move(e) {
      if (!dragging.current) return
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      handleChange(posToValue(clientY))
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
  }, [onChange])

  const pct = v => 100 - (v / 10) * 100
  const { color } = getFlameProps(value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div
        ref={trackRef}
        onMouseDown={onDown}
        onTouchStart={onDown}
        style={{
          position: 'relative',
          // Wide touch target — finger-friendly on mobile
          width: '80px',
          height: `${TRACK_H}px`,
          cursor: 'pointer',
          touchAction: 'none',  // prevents page scroll while dragging
        }}
      >
        {/* Radial sparks behind everything */}
        <div style={{ position: 'absolute', left: '50%', top: `${pct(value)}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 0 }}>
          <RadialSparks value={value} size={FLAME_SIZE} />
        </div>

        {/* Track */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          top: 0, bottom: 0, width: '10px', borderRadius: '5px',
          background: 'rgba(200,146,42,0.1)', overflow: 'hidden', zIndex: 1,
        }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${(value / 10) * 100}%`,
            background: 'linear-gradient(to top, #4B5563 0%, #8B7355 22%, #B8923A 42%, #C8922A 58%, #C8721A 73%, #A8721A 87%, #C8922A 100%)',
            borderRadius: '5px',
            transition: 'height 0.08s ease',
          }} />
        </div>

        {/* The Line tick */}
        <div style={{
          position: 'absolute', left: 'calc(50% + 8px)', top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: '4px',
          pointerEvents: 'none', zIndex: 2,
        }}>
          <div style={{ width: '12px', height: '1.5px', background: 'rgba(200,146,42,0.45)', borderRadius: '1px' }} />
          <span style={{ fontFamily: "'Cormorant SC',Georgia,serif", fontSize: '0.4375rem', letterSpacing: '0.14em', color: 'rgba(200,146,42,0.5)', whiteSpace: 'nowrap' }}>The Line</span>
        </div>

        {/* Ghost flame */}
        {ghostValue !== null && (
          <div style={{
            position: 'absolute', left: '50%',
            top: `${pct(ghostValue)}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', zIndex: 2,
          }}>
            <FlameGlyph value={ghostValue} size={36} ghost />
          </div>
        )}

        {/* Live flame */}
        <div style={{
          position: 'absolute', left: '50%',
          top: `${pct(value)}%`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          transition: dragging.current ? 'none' : 'top 0.08s ease',
          zIndex: 3,
        }}>
          <FlameGlyph value={value} size={FLAME_SIZE} />
        </div>
      </div>

      {/* State label */}
      <div style={{
        fontFamily: "'Cormorant Garamond',Georgia,serif",
        fontSize: '0.9375rem', fontStyle: 'italic',
        color,
        transition: 'color 0.4s ease',
        textAlign: 'center', minHeight: '22px',
      }}>
        {getFlameProps(value).label}
      </div>
    </div>
  )
}

// ─── FlameCheckIn ─────────────────────────────────────────────────────────────
// Props:
//   audioPhase   — 'baseline' | 'orienting' | 'embodying'
//   onUnlock     — called when before state is saved; parent should unlock audio
//   onAfterSave  — called when after state is saved
//   ghostValue   — before value to show as ghost during after check-in
//   mode         — 'before' | 'after'

export function FlameCheckIn({ audioPhase = 'baseline', mode = 'before', ghostValue = null, onUnlock, onAfterSave }) {
  const { user } = useAuth()
  const [value,   setValue]   = useState(mode === 'after' && ghostValue !== null ? ghostValue : 5)
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const savedAt = useRef(null)

  const isBefore = mode === 'before'

  async function handleSave() {
    setSaving(true)
    const now = new Date()
    const timestamp = now.toISOString()

    try {
      if (user?.id && supabase) {
        const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        const periodId = `${today}-foundation-${audioPhase}`

        if (isBefore) {
          await supabase.from('pulse_entries').upsert({
            user_id:      user.id,
            type:         'daily',
            period_id:    periodId,
            source:       'foundation',
            audio_phase:  audioPhase,
            before_value: value,
            before_note:  note || null,
            before_at:    timestamp,
            scores:       { spark: value },
            completed_at: timestamp,
            updated_at:   timestamp,
          }, { onConflict: 'user_id,type,period_id' })
        } else {
          await supabase.from('pulse_entries').upsert({
            user_id:     user.id,
            type:        'daily',
            period_id:   periodId,
            source:      'foundation',
            audio_phase: audioPhase,
            after_value: value,
            after_note:  note || null,
            after_at:    timestamp,
            scores:      { spark: value },
            updated_at:  timestamp,
          }, { onConflict: 'user_id,type,period_id' })
        }
      }
    } catch (e) {
      console.warn('[FlameCheckIn] Save error:', e)
    }

    setSaving(false)

    if (isBefore) {
      onUnlock?.({ value, note })
    } else {
      onAfterSave?.({ value, note })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Stage label */}
      <span style={{
        fontFamily: "'Cormorant SC',Georgia,serif",
        fontSize: '0.5625rem', letterSpacing: '0.2em',
        color: 'rgba(200,146,42,0.75)', textTransform: 'uppercase',
        marginBottom: '6px',
      }}>
        {isBefore ? `Before \u00B7 ${audioPhase}` : `After \u00B7 ${audioPhase}`}
      </span>

      <p style={{
        fontFamily: "'Cormorant Garamond',Georgia,serif",
        fontSize: '1rem', fontStyle: 'italic',
        color: 'rgba(15,21,35,0.6)', lineHeight: 1.7,
        textAlign: 'center', marginBottom: '20px',
      }}>
        {isBefore ? 'Where is the flame right now?' : 'And now\u2014?'}
      </p>

      {/* Flame slider */}
      <div style={{ marginBottom: '20px' }}>
        <FlameSlider
          value={value}
          onChange={setValue}
          ghostValue={isBefore ? null : ghostValue}
        />
      </div>

      {/* Note field */}
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Notes on current state"
        rows={2}
        style={{
          width: '100%', padding: '10px 14px',
          fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: '0.9375rem', fontStyle: 'italic',
          color: 'rgba(15,21,35,0.75)',
          background: 'rgba(200,146,42,0.025)',
          border: '1px solid rgba(200,146,42,0.2)',
          borderRadius: '8px', outline: 'none',
          resize: 'none', lineHeight: 1.65,
          marginBottom: '16px', transition: 'border-color 0.2s',
          touchAction: 'auto',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.5)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.2)' }}
      />

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', padding: '13px',
          fontFamily: "'Cormorant SC',Georgia,serif",
          fontSize: '0.875rem', letterSpacing: '0.14em',
          color: 'rgba(200,146,42,0.9)',
          background: 'rgba(200,146,42,0.05)',
          border: '1.5px solid rgba(200,146,42,0.78)',
          borderRadius: '40px',
          cursor: saving ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving
          ? 'Saving\u2026'
          : isBefore
            ? 'Log current state \u00B7 Unlock audio \u2192'
            : 'Done \u2713'}
      </button>
    </div>
  )
}
