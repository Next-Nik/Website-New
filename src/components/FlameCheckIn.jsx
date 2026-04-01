import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'

// ─── Flame colour scale ───────────────────────────────────────────────────────
// 0 = cold ember, 5 = amber, 8 = fox-tail orange, 10 = scarf gold blazing

function getFlameColor(value) {
  if (value <= 0)  return { primary: '#6B7280', glow: 'rgba(107,114,128,0.15)', size: 0.5 }
  if (value <= 2)  return { primary: '#8B7355', glow: 'rgba(139,115,85,0.18)',  size: 0.6 }
  if (value <= 3)  return { primary: '#A0845C', glow: 'rgba(160,132,92,0.22)',  size: 0.68 }
  if (value <= 4)  return { primary: '#B8923A', glow: 'rgba(184,146,58,0.28)',  size: 0.76 }
  if (value <= 5)  return { primary: '#C8922A', glow: 'rgba(200,146,42,0.35)',  size: 0.84 }
  if (value <= 6)  return { primary: '#D4821A', glow: 'rgba(212,130,26,0.42)',  size: 0.88 }
  if (value <= 7)  return { primary: '#C8721A', glow: 'rgba(200,114,26,0.48)',  size: 0.92 }
  if (value <= 8)  return { primary: '#C05A10', glow: 'rgba(192,90,16,0.55)',   size: 0.96 }
  if (value <= 9)  return { primary: '#A8721A', glow: 'rgba(168,114,26,0.62)',  size: 1.0  }
  return             { primary: '#C8922A', glow: 'rgba(200,146,42,0.72)',  size: 1.08 }
}

// How intense the flicker is at each level (0 = still, 1 = chaos)
function getFlickerIntensity(value) {
  if (value <= 1) return 0.05  // barely alive
  if (value <= 3) return 0.12
  if (value <= 5) return 0.22
  if (value <= 7) return 0.35
  if (value <= 9) return 0.52
  return 0.72                  // going nuts
}

// ─── Flame SVG glyph ─────────────────────────────────────────────────────────

function FlameGlyph({ value, size = 64, animate = true, ghost = false }) {
  const { primary, glow } = getFlameColor(value)
  const intensity = getFlickerIntensity(value)
  const scale = getFlameColor(value).size
  const id = useRef(`flame-${Math.random().toString(36).slice(2)}`)

  // Flicker: three overlapping animations at different speeds
  const dur1 = 1.8 - intensity * 0.8   // main flicker
  const dur2 = 2.4 - intensity * 1.0   // secondary sway
  const dur3 = 0.9 - intensity * 0.35  // fast micro-flicker

  const scaleMin = 1 - intensity * 0.18
  const scaleMax = 1 + intensity * 0.14
  const rotMin   = -intensity * 8
  const rotMax   =  intensity * 8

  const opacity = ghost ? 0.28 : 1

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{
        display: 'block',
        opacity,
        filter: ghost ? 'none' : `drop-shadow(0 0 ${8 * intensity}px ${primary}) drop-shadow(0 0 ${16 * intensity}px ${glow})`,
        transition: 'filter 0.6s ease, opacity 0.4s ease',
      }}
    >
      <defs>
        <radialGradient id={`${id.current}-grad`} cx="50%" cy="80%" r="60%">
          <stop offset="0%"   stopColor={primary} stopOpacity="1" />
          <stop offset="60%"  stopColor={primary} stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFF4E0" stopOpacity="0.3" />
        </radialGradient>

        {animate && (
          <>
            {/* Main flicker animation */}
            <animateTransform
              xlinkHref={`#${id.current}-body`}
              attributeName="transform"
              type="scale"
              values={`1 1; ${scaleMax} ${scaleMin}; ${scaleMin} ${scaleMax}; 1 1`}
              dur={`${dur1}s`}
              repeatCount="indefinite"
              additive="sum"
            />
          </>
        )}
      </defs>

      {/* Outer glow layer */}
      <g id={`${id.current}-outer`} style={{ transformOrigin: '32px 56px' }}>
        {animate && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values={`${rotMin} 32 56; ${rotMax} 32 56; ${rotMin * 0.5} 32 56; ${rotMax * 0.7} 32 56; ${rotMin} 32 56`}
            dur={`${dur2}s`}
            repeatCount="indefinite"
          />
        )}
        <path
          d={`M32 58
              C20 58 12 48 14 36
              C16 26 22 22 24 14
              C26 8 28 4 32 2
              C36 4 38 8 40 14
              C42 22 48 26 50 36
              C52 48 44 58 32 58Z`}
          fill={`url(#${id.current}-grad)`}
          opacity="0.35"
          style={{ transform: `scale(${scale * 1.15})`, transformOrigin: '32px 56px' }}
        />
      </g>

      {/* Main flame body */}
      <g id={`${id.current}-body`} style={{ transformOrigin: '32px 56px' }}>
        {animate && (
          <>
            <animateTransform
              attributeName="transform"
              type="scale"
              values={`1 1; ${1 + intensity * 0.08} ${1 - intensity * 0.06}; ${1 - intensity * 0.05} ${1 + intensity * 0.09}; 1 1`}
              dur={`${dur1}s`}
              repeatCount="indefinite"
            />
          </>
        )}
        <path
          d={`M32 56
              C22 56 16 48 18 38
              C20 30 25 26 27 18
              C29 12 30 8 32 4
              C34 8 35 12 37 18
              C39 26 44 30 46 38
              C48 48 42 56 32 56Z`}
          fill={primary}
          style={{ transform: `scale(${scale})`, transformOrigin: '32px 56px' }}
        />
      </g>

      {/* Inner bright core */}
      <g style={{ transformOrigin: '32px 52px' }}>
        {animate && value > 3 && (
          <animateTransform
            attributeName="transform"
            type="scale"
            values={`1 1; ${1 + intensity * 0.12} ${1 - intensity * 0.1}; ${1 - intensity * 0.08} ${1 + intensity * 0.15}; 1 1`}
            dur={`${dur3}s`}
            repeatCount="indefinite"
          />
        )}
        <path
          d={`M32 54
              C27 54 24 48 25 42
              C26 38 29 35 30 30
              C31 26 31 24 32 22
              C33 24 33 26 34 30
              C35 35 38 38 39 42
              C40 48 37 54 32 54Z`}
          fill="#FFF4E0"
          opacity={Math.min(0.9, intensity * 1.4 + 0.1)}
          style={{ transform: `scale(${scale * 0.7})`, transformOrigin: '32px 52px' }}
        />
      </g>

      {/* Micro spark — only at high values */}
      {value >= 7 && animate && (
        <g>
          <circle cx="26" cy="18" r="2" fill={primary} opacity="0">
            <animate attributeName="opacity" values="0;0.8;0" dur={`${dur3 * 1.3}s`} repeatCount="indefinite" begin="0.2s" />
            <animate attributeName="cy" values="18;12;18" dur={`${dur3 * 1.3}s`} repeatCount="indefinite" begin="0.2s" />
          </circle>
          <circle cx="38" cy="14" r="1.5" fill="#FFF4E0" opacity="0">
            <animate attributeName="opacity" values="0;0.6;0" dur={`${dur3 * 0.9}s`} repeatCount="indefinite" begin="0.5s" />
            <animate attributeName="cy" values="14;8;14" dur={`${dur3 * 0.9}s`} repeatCount="indefinite" begin="0.5s" />
          </circle>
        </g>
      )}
    </svg>
  )
}

// ─── Vertical flame slider ────────────────────────────────────────────────────

function FlameSlider({ value, onChange, ghostValue = null, disabled = false }) {
  const trackRef   = useRef(null)
  const dragging   = useRef(false)
  const TRACK_H    = 280
  const THUMB_AREA = 64   // flame glyph size

  function positionToValue(clientY) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return value
    const relY = clientY - rect.top
    const clamped = Math.max(0, Math.min(rect.height, relY))
    // Inverted: top = 10, bottom = 0
    const raw = 10 - (clamped / rect.height) * 10
    return Math.round(raw * 2) / 2  // snap to 0.5
  }

  function valueToPercent(v) {
    return 100 - (v / 10) * 100
  }

  const onMouseDown = useCallback((e) => {
    if (disabled) return
    dragging.current = true
    onChange(positionToValue(e.clientY))
    e.preventDefault()
  }, [disabled, onChange])

  const onTouchStart = useCallback((e) => {
    if (disabled) return
    dragging.current = true
    onChange(positionToValue(e.touches[0].clientY))
  }, [disabled, onChange])

  useEffect(() => {
    function onMove(e) {
      if (!dragging.current) return
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      onChange(positionToValue(clientY))
    }
    function onUp() { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [onChange])

  const { primary, glow } = getFlameColor(value)

  // Gradient track — cool to warm, bottom to top
  const trackGradient = `linear-gradient(to top,
    #4B5563 0%,
    #8B7355 20%,
    #B8923A 40%,
    #C8922A 55%,
    #C8721A 70%,
    #A8721A 85%,
    #C8922A 100%
  )`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none' }}>
      {/* Track container */}
      <div
        ref={trackRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{
          position: 'relative',
          width: '48px',
          height: `${TRACK_H}px`,
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {/* Track background */}
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          top: 0,
          bottom: 0,
          width: '8px',
          borderRadius: '4px',
          background: 'rgba(200,146,42,0.12)',
          overflow: 'hidden',
        }}>
          {/* Filled portion */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${(value / 10) * 100}%`,
            background: trackGradient,
            backgroundSize: '100% 800px',
            backgroundPosition: 'bottom',
            transition: 'height 0.15s ease',
            borderRadius: '4px',
          }} />
        </div>

        {/* Ghost marker — where you were before */}
        {ghostValue !== null && (
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: `${valueToPercent(ghostValue)}%`,
            marginTop: '-1px',
            width: '20px',
            height: '2px',
            background: 'rgba(200,146,42,0.35)',
            borderRadius: '1px',
            pointerEvents: 'none',
          }}>
            {/* Ghost flame */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}>
              <FlameGlyph value={ghostValue} size={28} animate={false} ghost={true} />
            </div>
          </div>
        )}

        {/* Live flame thumb */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: `${valueToPercent(value)}%`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          transition: dragging.current ? 'none' : 'top 0.12s ease',
          filter: `drop-shadow(0 0 ${12 * getFlickerIntensity(value)}px ${glow})`,
        }}>
          <FlameGlyph value={value} size={THUMB_AREA} animate={!disabled} />
        </div>

        {/* Tick marks — subtle */}
        {[0, 2.5, 5, 7.5, 10].map(v => (
          <div key={v} style={{
            position: 'absolute',
            left: 'calc(50% + 8px)',
            top: `${valueToPercent(v)}%`,
            transform: 'translateY(-50%)',
            width: v === 5 ? '10px' : '6px',
            height: '1px',
            background: v === 5 ? 'rgba(200,146,42,0.5)' : 'rgba(200,146,42,0.2)',
            borderRadius: '1px',
          }} />
        ))}

        {/* The Line label at 5 */}
        <div style={{
          position: 'absolute',
          left: 'calc(50% + 22px)',
          top: `${valueToPercent(5)}%`,
          transform: 'translateY(-50%)',
          fontFamily: "'Cormorant SC', Georgia, serif",
          fontSize: '0.5rem',
          letterSpacing: '0.14em',
          color: 'rgba(200,146,42,0.55)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          The Line
        </div>
      </div>

      {/* Colour warmth hint below — no numbers */}
      <div style={{
        marginTop: '12px',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '0.8125rem',
        fontStyle: 'italic',
        color: getFlameColor(value).primary,
        transition: 'color 0.4s ease',
        opacity: 0.85,
        textAlign: 'center',
        minHeight: '20px',
      }}>
        {value <= 1  ? 'barely a flicker' :
         value <= 2  ? 'low and cool' :
         value <= 3  ? 'something still alive' :
         value <= 4  ? 'wanting to catch' :
         value <= 5  ? 'present' :
         value <= 6  ? 'warming up' :
         value <= 7  ? 'lit' :
         value <= 8  ? 'burning well' :
         value <= 9  ? 'bright and steady' :
                       'going'}
      </div>
    </div>
  )
}

// ─── Note field ───────────────────────────────────────────────────────────────

function NoteField({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      style={{
        width: '100%',
        padding: '10px 14px',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '0.9375rem',
        fontStyle: 'italic',
        color: 'rgba(15,21,35,0.8)',
        background: 'rgba(200,146,42,0.025)',
        border: '1px solid rgba(200,146,42,0.2)',
        borderRadius: '8px',
        outline: 'none',
        resize: 'none',
        lineHeight: 1.65,
        transition: 'border-color 0.2s',
      }}
      onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.5)' }}
      onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.2)' }}
    />
  )
}

// ─── Main FlameCheckIn component ──────────────────────────────────────────────

export function FlameCheckIn({ audioPhase = 'baseline', onComplete, onSkip }) {
  const { user } = useAuth()

  const [stage,       setStage]       = useState('before')  // 'before' | 'after' | 'done'
  const [beforeValue, setBeforeValue] = useState(5)
  const [beforeNote,  setBeforeNote]  = useState('')
  const [afterValue,  setAfterValue]  = useState(5)
  const [afterNote,   setAfterNote]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [beforeAt,    setBeforeAt]    = useState(null)

  const delta = afterValue - beforeValue

  async function saveBefore() {
    const now = new Date()
    setBeforeAt(now.toISOString())
    // After the audio, start at wherever they were before
    setAfterValue(beforeValue)
    setStage('after')
  }

  async function saveAfter() {
    setSaving(true)
    const now = new Date()

    try {
      if (user?.id && supabase) {
        const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        const weekStart = (() => {
          const d = new Date(now)
          const day = d.getDay()
          d.setDate(d.getDate() - ((day + 6) % 7))
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        })()

        await supabase.from('pulse_entries').upsert({
          user_id:        user.id,
          type:           'daily',
          period_id:      today,
          scores:         { spark: afterValue },
          note:           afterNote || null,
          source:         'foundation',
          audio_phase:    audioPhase,
          before_value:   beforeValue,
          before_note:    beforeNote || null,
          before_at:      beforeAt,
          after_value:    afterValue,
          after_note:     afterNote || null,
          after_at:       now.toISOString(),
          completed_at:   now.toISOString(),
          updated_at:     now.toISOString(),
        }, { onConflict: 'user_id,type,period_id,source' })
      }
    } catch (e) {
      console.warn('[FlameCheckIn] Save failed:', e)
    }

    setSaving(false)
    setStage('done')
    onComplete?.({ beforeValue, afterValue, delta, beforeNote, afterNote })
  }

  if (stage === 'done') {
    const improved  = delta > 0
    const unchanged = delta === 0
    const col = getFlameColor(afterValue).primary

    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <FlameGlyph value={afterValue} size={72} animate />
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '1.0625rem',
          fontStyle: 'italic',
          color: 'rgba(15,21,35,0.72)',
          lineHeight: 1.75,
          marginTop: '16px',
        }}>
          {unchanged
            ? 'Holding steady.'
            : improved
            ? `The flame moved. ${delta > 1.5 ? 'Noticeably.' : ''}`
            : `Honest. That\u2019s what matters.`}
        </p>
      </div>
    )
  }

  const isBefore = stage === 'before'
  const currentValue = isBefore ? beforeValue : afterValue
  const setCurrentValue = isBefore ? setBeforeValue : setAfterValue
  const currentNote = isBefore ? beforeNote : afterNote
  const setCurrentNote = isBefore ? setBeforeNote : setAfterNote

  return (
    <div>
      {/* Stage label */}
      <div style={{
        fontFamily: "'Cormorant SC', Georgia, serif",
        fontSize: '0.5625rem',
        letterSpacing: '0.2em',
        color: 'rgba(200,146,42,0.8)',
        textTransform: 'uppercase',
        marginBottom: '6px',
        textAlign: 'center',
      }}>
        {isBefore ? `Before \u00B7 ${audioPhase}` : `After \u00B7 ${audioPhase}`}
      </div>

      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '1rem',
        fontStyle: 'italic',
        color: 'rgba(15,21,35,0.65)',
        lineHeight: 1.7,
        textAlign: 'center',
        marginBottom: '28px',
      }}>
        {isBefore
          ? 'Where is the flame right now?'
          : 'And now?'}
      </p>

      {/* Flame slider — centred, generous size */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
        <FlameSlider
          value={currentValue}
          onChange={setCurrentValue}
          ghostValue={isBefore ? null : beforeValue}
        />
      </div>

      {/* Note field */}
      <div style={{ marginBottom: '20px' }}>
        <NoteField
          value={currentNote}
          onChange={setCurrentNote}
          placeholder={isBefore
            ? 'what walked in with you today\u2026'
            : 'what you\u2019re leaving with\u2026'}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={isBefore ? saveBefore : saveAfter}
          disabled={saving}
          style={{
            flex: 1,
            padding: '13px',
            fontFamily: "'Cormorant SC', Georgia, serif",
            fontSize: '0.875rem',
            letterSpacing: '0.14em',
            color: 'rgba(200,146,42,0.9)',
            background: 'rgba(200,146,42,0.05)',
            border: '1.5px solid rgba(200,146,42,0.78)',
            borderRadius: '40px',
            cursor: saving ? 'wait' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'Saving\u2026' : isBefore ? 'Begin \u2192' : 'Log this \u2192'}
        </button>

        {onSkip && (
          <button onClick={onSkip} style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '0.875rem',
            fontStyle: 'italic',
            color: 'rgba(15,21,35,0.4)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px',
          }}>
            skip
          </button>
        )}
      </div>
    </div>
  )
}
