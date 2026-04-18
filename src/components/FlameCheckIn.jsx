import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'

// ─── Colour scale — cool ember to blazing scarf gold ─────────────────────────

// ─── Horizon Scale labels — 0.5 increments ───────────────────────────────────
// 0 = really struggling · 5 = neutral / "fine" · 10 = absolutely extraordinary
const FLAME_SCALE = {
  0:    { color: '#4B5563', glow: 'rgba(75,85,99,0.10)',    scale: 0.42, label: 'really struggling' },
  0.5:  { color: '#5C6675', glow: 'rgba(92,102,117,0.12)',  scale: 0.47, label: 'barely holding on' },
  1:    { color: '#6B7280', glow: 'rgba(107,114,128,0.14)', scale: 0.52, label: 'running on empty' },
  1.5:  { color: '#7A7A72', glow: 'rgba(122,122,114,0.16)', scale: 0.57, label: 'heavy going' },
  2:    { color: '#8B7355', glow: 'rgba(139,115,85,0.20)',  scale: 0.62, label: 'low but alive' },
  2.5:  { color: '#96804A', glow: 'rgba(150,128,74,0.24)',  scale: 0.67, label: 'a flicker still there' },
  3:    { color: '#A0845C', glow: 'rgba(160,132,92,0.26)',  scale: 0.72, label: 'getting through it' },
  3.5:  { color: '#AA8A42', glow: 'rgba(170,138,66,0.30)',  scale: 0.77, label: 'steadying' },
  4:    { color: '#B8923A', glow: 'rgba(184,146,58,0.33)',  scale: 0.80, label: 'starting to warm' },
  4.5:  { color: '#C09A30', glow: 'rgba(192,154,48,0.36)',  scale: 0.82, label: 'almost there' },
  5:    { color: '#A8721A', glow: 'rgba(200,146,42,0.38)',  scale: 0.84, label: 'present' },
  5.5:  { color: '#C4821A', glow: 'rgba(196,130,26,0.42)',  scale: 0.87, label: 'good, actually' },
  6:    { color: '#D4821A', glow: 'rgba(212,130,26,0.46)',  scale: 0.89, label: 'warming up' },
  6.5:  { color: '#CC7818', glow: 'rgba(204,120,24,0.50)',  scale: 0.91, label: 'genuinely well' },
  7:    { color: '#C8721A', glow: 'rgba(200,114,26,0.54)',  scale: 0.93, label: 'lit' },
  7.5:  { color: '#C26418', glow: 'rgba(194,100,24,0.58)', scale: 0.95, label: 'alive and moving' },
  8:    { color: '#C05A10', glow: 'rgba(192,90,16,0.62)',   scale: 0.97, label: 'burning well' },
  8.5:  { color: '#B85010', glow: 'rgba(184,80,16,0.66)',   scale: 0.99, label: 'clear and strong' },
  9:    { color: '#A8721A', glow: 'rgba(168,114,26,0.70)',  scale: 1.01, label: 'bright and steady' },
  9.5:  { color: '#C8922A', glow: 'rgba(200,146,42,0.76)', scale: 1.04, label: 'extraordinary' },
  10:   { color: '#C8922A', glow: 'rgba(200,146,42,0.82)', scale: 1.08, label: 'absolutely on fire' },
}

function getFlameProps(v) {
  const key = Math.round(v * 2) / 2
  return FLAME_SCALE[Math.max(0, Math.min(10, key))] || FLAME_SCALE[5]
}

function flickerIntensity(v) {
  if (v <= 1) return 0.04
  if (v <= 3) return 0.12
  if (v <= 5) return 0.22
  if (v <= 7) return 0.38
  if (v <= 9) return 0.55
  return 0.75
}

// ─── Animated flame SVG ───────────────────────────────────────────────────────

export function FlameGlyph({ value = 5, size = 64, ghost = false }) {
  const { color, glow, scale } = getFlameProps(value)
  const fi   = flickerIntensity(value)
  const uid  = useRef(`f${Math.random().toString(36).slice(2,7)}`).current

  const dur1 = (1.8  - fi * 0.7).toFixed(2)
  const dur2 = (2.5  - fi * 1.0).toFixed(2)
  const dur3 = (0.85 - fi * 0.3).toFixed(2)
  const sMin = (1 - fi * 0.16).toFixed(3)
  const sMax = (1 + fi * 0.13).toFixed(3)
  const rAmp = (fi * 9).toFixed(1)

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 64 64"
      style={{
        display: 'block',
        opacity: ghost ? 0.3 : 1,
        filter: ghost
          ? 'none'
          : `drop-shadow(0 0 ${(8 * fi).toFixed(0)}px ${color}) drop-shadow(0 0 ${(18 * fi).toFixed(0)}px ${glow})`,
        transition: 'filter 0.5s ease, opacity 0.4s ease',
      }}
    >
      <defs>
        <radialGradient id={`${uid}-g`} cx="50%" cy="85%" r="65%">
          <stop offset="0%"   stopColor={color}    stopOpacity="1" />
          <stop offset="55%"  stopColor={color}    stopOpacity="0.75" />
          <stop offset="100%" stopColor="#FFF4E0"  stopOpacity="0.2" />
        </radialGradient>
      </defs>

      {/* Outer glow — slow sway */}
      <g style={{ transformOrigin: '32px 56px' }}>
        <animateTransform attributeName="transform" type="rotate"
          values={`-${rAmp} 32 56; ${rAmp} 32 56; -${(rAmp*0.6).toFixed(1)} 32 56; ${(rAmp*0.8).toFixed(1)} 32 56; -${rAmp} 32 56`}
          dur={`${dur2}s`} repeatCount="indefinite" />
        <path
          d="M32 58 C19 58 11 47 13 35 C15 25 22 21 24 13 C26 7 28 3 32 1 C36 3 38 7 40 13 C42 21 49 25 51 35 C53 47 45 58 32 58Z"
          fill={`url(#${uid}-g)`}
          opacity="0.32"
          style={{ transform: `scale(${(scale*1.18).toFixed(2)})`, transformOrigin: '32px 56px' }}
        />
      </g>

      {/* Main body — primary flicker */}
      <g style={{ transformOrigin: '32px 56px' }}>
        <animateTransform attributeName="transform" type="scale"
          values={`1 1; ${sMax} ${sMin}; ${sMin} ${sMax}; ${(+sMax*0.97).toFixed(3)} ${(+sMin*1.02).toFixed(3)}; 1 1`}
          dur={`${dur1}s`} repeatCount="indefinite" additive="sum" />
        <path
          d="M32 56 C22 56 15 47 17 37 C19 29 25 25 27 17 C29 11 30 7 32 4 C34 7 35 11 37 17 C39 25 45 29 47 37 C49 47 42 56 32 56Z"
          fill={color}
          style={{ transform: `scale(${scale})`, transformOrigin: '32px 56px' }}
        />
      </g>

      {/* Inner bright core */}
      {value > 2 && (
        <g style={{ transformOrigin: '32px 52px' }}>
          <animateTransform attributeName="transform" type="scale"
            values={`1 1; ${(1+fi*0.14).toFixed(3)} ${(1-fi*0.11).toFixed(3)}; ${(1-fi*0.09).toFixed(3)} ${(1+fi*0.16).toFixed(3)}; 1 1`}
            dur={`${dur3}s`} repeatCount="indefinite" />
          <path
            d="M32 54 C27 54 24 48 25 42 C26 37 29 34 30 29 C31 25 31 23 32 21 C33 23 33 25 34 29 C35 34 38 37 39 42 C40 48 37 54 32 54Z"
            fill="#FFF4E0"
            opacity={Math.min(0.92, fi * 1.3 + 0.08)}
            style={{ transform: `scale(${(scale*0.72).toFixed(2)})`, transformOrigin: '32px 52px' }}
          />
        </g>
      )}

      {/* Flying sparks — only when really lit */}
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

// ─── Vertical slider ──────────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 640)
  useEffect(() => {
    function check() { setMobile(window.innerWidth <= 640) }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

export function FlameSlider({ value, onChange, ghostValue = null }) {
  const trackRef  = useRef(null)
  const dragging  = useRef(false)
  const lastValue = useRef(value)
  const isMobile  = useIsMobile()
  const TRACK_H   = isMobile ? 180 : 300

  function haptic(v) {
    if (!navigator.vibrate) return
    if (v === 0 || v === 10) navigator.vibrate([12, 40, 12])      // boundary pulse
    else if (v === 5)        navigator.vibrate(8)                  // midpoint
    else                     navigator.vibrate(4)                  // standard tick
  }

  function posToValue(clientY) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return value
    const pct  = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const raw  = 10 - pct * 10
    return Math.round(raw * 2) / 2
  }

  const onDown = useCallback(e => {
    dragging.current = true
    const clientY = e.clientY ?? e.touches?.[0]?.clientY
    const next = posToValue(clientY)
    if (next !== lastValue.current) { haptic(next); lastValue.current = next }
    onChange(next)
    e.preventDefault()
  }, [onChange])

  useEffect(() => {
    function move(e) {
      if (!dragging.current) return
      const clientY = e.clientY ?? e.touches?.[0]?.clientY
      const next = posToValue(clientY)
      if (next !== lastValue.current) { haptic(next); lastValue.current = next }
      onChange(next)
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

  // Prevent page scroll when touching the track directly
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    function preventScroll(e) {
      if (dragging.current) e.preventDefault()
    }
    el.addEventListener('touchmove', preventScroll, { passive: false })
    return () => el.removeEventListener('touchmove', preventScroll)
  }, [])

  const pct = v => 100 - (v / 10) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div
        ref={trackRef}
        onMouseDown={onDown}
        onTouchStart={onDown}
        style={{
          position: 'relative', width: '56px', height: `${TRACK_H}px`,
          cursor: 'pointer',
          // Larger touch target without visual change
          padding: '0 20px',
          margin: '0 -20px',
          touchAction: 'none',
        }}
      >
        {/* Track */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          top: 0, bottom: 0, width: '10px', borderRadius: '5px',
          background: 'rgba(200,146,42,0.1)', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${(value / 10) * 100}%`,
            background: 'linear-gradient(to top, #4B5563 0%, #8B7355 22%, #B8923A 42%, #C8922A 58%, #C8721A 73%, #A8721A 87%, #C8922A 100%)',
            borderRadius: '5px',
            transition: 'height 0.1s ease',
          }} />
        </div>

        {/* The Line tick */}
        <div style={{
          position: 'absolute', left: 'calc(50% + 7px)',
          top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'none',
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
            pointerEvents: 'none',
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
          transition: dragging.current ? 'none' : 'top 0.1s ease',
        }}>
          <FlameGlyph value={value} size={72} />
        </div>
      </div>

      {/* Label */}
      <div style={{
        fontFamily: "'Lora', Georgia, serif",
        fontSize: '1.3125rem',
        color: getFlameProps(value).color,
        transition: 'color 0.4s ease',
        textAlign: 'center', minHeight: '20px',
      }}>
        {getFlameProps(value).label}
      </div>
    </div>
  )
}

// ─── FlamePicker — single-stage, one confirm ─────────────────────────────────
// Used by BaselineCard for both before and after check-ins.
// One slider, one note, one button. No internal two-stage flow.

export function FlamePicker({ audioPhase = 'baseline', stage = 'before', ghostValue = null, onComplete, onSkip, locked = false }) {
  const [value,   setValue]   = useState(ghostValue ?? 5)
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const { user } = useAuth()

  const phaseLabel = audioPhase === 'baseline' ? 'Foundation' : audioPhase.charAt(0).toUpperCase() + audioPhase.slice(1)

  const isBefore = stage === 'before'

  async function confirm() {
    if (locked) return
    setSaving(true)
    try {
      if (user?.id && supabase) {
        const now     = new Date()
        const today   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        const weekId  = (() => {
          const d = new Date(now); d.setHours(0,0,0,0)
          const day = d.getDay()
          const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7))
          return `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`
        })()
        const monthId   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
        const quarterId = `${now.getFullYear()}-Q${Math.floor(now.getMonth()/3)+1}`
        const yearId    = String(now.getFullYear())
        const periodId  = `${today}-horizon-state-${audioPhase}-${stage}`

        await supabase.from('pulse_entries').upsert({
          user_id:      user.id,
          type:         'horizon_state_checkin',
          period_id:    periodId,
          source:       'foundation',
          audio_phase:  audioPhase,
          checkin_stage: stage,
          week_id:      weekId,
          month_id:     monthId,
          quarter_id:   quarterId,
          year_id:      yearId,
          value,
          note:         note || null,
          completed_at: now.toISOString(),
          updated_at:   now.toISOString(),
        }, { onConflict: 'user_id,type,period_id' })
      }
    } catch (e) {
      console.warn('[FlamePicker] Save error:', e)
    }
    setSaving(false)
    onComplete?.({ value, note, timestamp: new Date().toISOString() })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
      <span style={{
        fontFamily: "'Cormorant SC',Georgia,serif",
        fontSize: '0.5625rem', letterSpacing: '0.2em',
        color: '#A8721A', textTransform: 'uppercase',
        marginBottom: '6px',
      }}>
        {isBefore ? `Before · ${phaseLabel}` : `After · ${phaseLabel}`}
      </span>

      <p style={{
        fontFamily: "'Lora', Georgia, serif",
        fontSize: '1.25rem',
        color: 'rgba(15,21,35,0.6)', lineHeight: 1.7,
        textAlign: 'center', marginBottom: '24px',
      }}>
        {isBefore ? 'Where is the flame right now?' : 'And now—?'}
      </p>

      <div style={{ marginBottom: '24px', pointerEvents: locked ? 'none' : 'auto' }}>
        <FlameSlider
          value={value}
          onChange={locked ? () => {} : setValue}
          ghostValue={ghostValue}
        />
      </div>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={isBefore ? 'what walked in with you today…' : `what you're leaving with…`}
        rows={2}
        disabled={locked}
        style={{
          width: '100%', padding: '10px 14px',
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '1.125rem',
          color: 'rgba(15,21,35,0.75)',
          background: 'rgba(200,146,42,0.025)',
          border: '1px solid rgba(200,146,42,0.2)',
          borderRadius: '8px', outline: 'none',
          resize: 'none', lineHeight: 1.65,
          marginBottom: '16px', transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.5)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.2)' }}
      />

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
        <button
          onClick={confirm}
          disabled={saving || locked}
          style={{
            flex: 1, padding: '13px',
            fontFamily: "'Cormorant SC',Georgia,serif",
            fontSize: '1.3125rem', letterSpacing: '0.14em',
            color: locked ? 'rgba(200,146,42,0.35)' : 'rgba(200,146,42,0.9)',
            background: 'rgba(200,146,42,0.05)',
            border: '1.5px solid rgba(200,146,42,0.78)',
            borderRadius: '40px',
            cursor: (saving || locked) ? 'default' : 'pointer',
            transition: 'all 0.2s',
            opacity: locked ? 0.5 : saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : isBefore ? 'Begin →' : 'Save ✓'}
        </button>
        {onSkip && !locked && (
          <button onClick={onSkip} style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '1.3125rem',
            color: 'rgba(15,21,35,0.55)',
            background: 'none', border: 'none',
            cursor: 'pointer', padding: '10px',
          }}>
            skip
          </button>
        )}
      </div>
    </div>
  )
}

// ─── FlameCheckIn — legacy export, kept for compatibility ─────────────────────
export { FlamePicker as FlameCheckIn }
