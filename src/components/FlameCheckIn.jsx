import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'

// ─── Colour scale — cool ember to blazing scarf gold ─────────────────────────

function getFlameProps(v) {
  if (v === 0)   return { color: '#6B7280', glow: 'rgba(107,114,128,0.12)', scale: 0.45, label: 'not good' }
  if (v <= 0.5)  return { color: '#6B7280', glow: 'rgba(107,114,128,0.12)', scale: 0.48, label: 'barely here' }
  if (v <= 1)    return { color: '#6B7280', glow: 'rgba(107,114,128,0.15)', scale: 0.50, label: 'running on empty' }
  if (v <= 1.5)  return { color: '#7A7060', glow: 'rgba(122,112,96,0.16)',  scale: 0.54, label: 'heavy' }
  if (v <= 2)    return { color: '#8B7355', glow: 'rgba(139,115,85,0.18)',  scale: 0.58, label: 'getting through it' }
  if (v <= 2.5)  return { color: '#927860', glow: 'rgba(146,120,96,0.20)',  scale: 0.62, label: 'low' }
  if (v <= 3)    return { color: '#A0845C', glow: 'rgba(160,132,92,0.22)',  scale: 0.66, label: 'a little flat' }
  if (v <= 3.5)  return { color: '#AA8C60', glow: 'rgba(170,140,96,0.24)',  scale: 0.70, label: 'quiet' }
  if (v <= 4)    return { color: '#B8923A', glow: 'rgba(184,146,58,0.28)',  scale: 0.74, label: 'okay-ish' }
  if (v <= 4.5)  return { color: '#C09030', glow: 'rgba(192,144,48,0.30)',  scale: 0.78, label: 'finding my feet' }
  if (v <= 5)    return { color: '#C8922A', glow: 'rgba(200,146,42,0.35)',  scale: 0.82, label: 'Neutral / "Fine"' }
  if (v <= 5.5)  return { color: '#CC8C24', glow: 'rgba(204,140,36,0.38)',  scale: 0.85, label: 'settling in' }
  if (v <= 6)    return { color: '#D4821A', glow: 'rgba(212,130,26,0.42)',  scale: 0.88, label: 'steadier' }
  if (v <= 6.5)  return { color: '#CE7A18', glow: 'rgba(206,122,24,0.44)',  scale: 0.90, label: 'good, actually' }
  if (v <= 7)    return { color: '#C8721A', glow: 'rgba(200,114,26,0.48)',  scale: 0.92, label: 'present' }
  if (v <= 7.5)  return { color: '#C46A16', glow: 'rgba(196,106,22,0.50)',  scale: 0.94, label: 'open' }
  if (v <= 8)    return { color: '#C05A10', glow: 'rgba(192,90,16,0.55)',   scale: 0.96, label: 'clear' }
  if (v <= 8.5)  return { color: '#B46010', glow: 'rgba(180,96,16,0.58)',   scale: 0.98, label: 'alive' }
  if (v <= 9)    return { color: '#A8721A', glow: 'rgba(168,114,26,0.62)',  scale: 1.00, label: 'flowing' }
  if (v <= 9.5)  return { color: '#B87820', glow: 'rgba(184,120,32,0.66)',  scale: 1.04, label: 'lit up' }
  return           { color: '#C8922A', glow: 'rgba(200,146,42,0.72)',  scale: 1.08, label: 'thriving and radiant' }
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
  const fi  = flickerIntensity(value)
  const uid = useRef(`f${Math.random().toString(36).slice(2,7)}`).current

  // Animation timings — offset so nothing repeats in sync
  const d1 = (1.6 - fi * 0.55).toFixed(2)   // main body
  const d2 = (2.3 - fi * 0.85).toFixed(2)   // left tongue
  const d3 = (1.1 - fi * 0.38).toFixed(2)   // right tongue
  const d4 = (0.9 - fi * 0.28).toFixed(2)   // inner core / sparks
  const rA = (fi * 7).toFixed(1)             // sway amplitude

  // Scale the whole flame with value
  const s = scale

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 64 80"
      style={{
        display: 'block',
        opacity: ghost ? 0.28 : 1,
        filter: ghost
          ? 'none'
          : `drop-shadow(0 0 ${Math.round(6*fi)}px ${color}) drop-shadow(0 0 ${Math.round(16*fi)}px ${glow})`,
        transition: 'filter 0.5s ease, opacity 0.4s ease',
      }}
    >
      <defs>
        {/* Main body gradient — hottest at base, vanishing tips */}
        <linearGradient id={`${uid}-mg`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#FFF4E0" stopOpacity="0.95" />
          <stop offset="30%"  stopColor={color}   stopOpacity="1" />
          <stop offset="70%"  stopColor={color}   stopOpacity="0.7" />
          <stop offset="100%" stopColor={color}   stopOpacity="0.05" />
        </linearGradient>
        {/* Left tongue gradient */}
        <linearGradient id={`${uid}-lg`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        {/* Right tongue gradient */}
        <linearGradient id={`${uid}-rg`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        {/* Outer glow halo */}
        <radialGradient id={`${uid}-halo`} cx="50%" cy="88%" r="60%">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* === EMBER state (value ≤ 2) — just a low flicker, single tongue === */}
      {value <= 2 && (
        <g style={{ transformOrigin: '32px 72px', transform: `scale(${s})` }}>
          <animateTransform attributeName="transform" type="rotate"
            values={`-${rA} 32 72; ${(+rA*0.7).toFixed(1)} 32 72; -${(+rA*0.5).toFixed(1)} 32 72; ${rA} 32 72; -${rA} 32 72`}
            dur={`${d1}s`} repeatCount="indefinite" additive="sum" />
          <path
            d="M32 74 C27 74 23 67 24 60 C25 54 28 51 29 45 C30 40 31 37 32 34 C33 37 34 40 35 45 C36 51 39 54 40 60 C41 67 37 74 32 74Z"
            fill={`url(#${uid}-mg)`}
          />
        </g>
      )}

      {/* === ACTIVE state (value > 2) — multiple tongues, real fire === */}
      {value > 2 && (
        <>
          {/* Halo glow at base */}
          <ellipse cx="32" cy="72" rx={18*s} ry={7*s} fill={`url(#${uid}-halo)`} opacity={fi * 0.8} />

          {/* LEFT TONGUE — leans left, shorter, slightly behind */}
          <g style={{ transformOrigin: '24px 68px' }}>
            <animateTransform attributeName="transform" type="rotate"
              values={`-${(+rA*1.3).toFixed(1)} 24 68; ${(+rA*0.4).toFixed(1)} 24 68; -${(+rA*0.9).toFixed(1)} 24 68; ${(+rA*1.1).toFixed(1)} 24 68; -${(+rA*1.3).toFixed(1)} 24 68`}
              dur={`${d2}s`} repeatCount="indefinite" />
            <path
              d={value >= 6
                ? `M24 70 C19 70 15 63 17 55 C18 49 21 46 22 40 C23 35 23 31 24 27 C25 31 26 36 27 41 C28 47 31 51 31 57 C31 64 28 70 24 70Z`
                : `M24 70 C20 70 17 65 18 59 C19 54 22 51 23 46 C24 42 24 39 24 36 C25 39 25 43 26 47 C27 52 29 55 29 60 C29 66 27 70 24 70Z`}
              fill={`url(#${uid}-lg)`}
              opacity={Math.min(0.88, 0.3 + fi * 0.7)}
              style={{ transform: `scale(${s})`, transformOrigin: '24px 70px' }}
            />
          </g>

          {/* RIGHT TONGUE — leans right, taller, independent timing */}
          <g style={{ transformOrigin: '40px 66px' }}>
            <animateTransform attributeName="transform" type="rotate"
              values={`${(+rA*0.8).toFixed(1)} 40 66; -${(+rA*1.4).toFixed(1)} 40 66; ${(+rA*0.5).toFixed(1)} 40 66; -${(+rA*0.9).toFixed(1)} 40 66; ${(+rA*0.8).toFixed(1)} 40 66`}
              dur={`${d3}s`} repeatCount="indefinite" />
            <path
              d={value >= 5
                ? `M40 68 C36 68 33 62 34 55 C35 49 37 46 38 39 C39 33 40 28 40 23 C41 28 42 34 43 40 C44 46 46 49 47 56 C48 63 45 68 40 68Z`
                : `M40 70 C37 70 35 65 36 60 C37 55 39 52 39 47 C40 43 40 40 40 37 C41 40 41 44 42 48 C43 53 44 56 44 61 C44 66 43 70 40 70Z`}
              fill={`url(#${uid}-rg)`}
              opacity={Math.min(0.82, 0.25 + fi * 0.65)}
              style={{ transform: `scale(${s})`, transformOrigin: '40px 68px' }}
            />
          </g>

          {/* MAIN BODY — central, tallest, primary sway */}
          <g style={{ transformOrigin: '32px 72px' }}>
            <animateTransform attributeName="transform" type="rotate"
              values={`-${rA} 32 72; ${(+rA*0.6).toFixed(1)} 32 72; -${(+rA*0.3).toFixed(1)} 32 72; ${rA} 32 72; -${rA} 32 72`}
              dur={`${d1}s`} repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="scale"
              values={`1 1; ${(1+fi*0.04).toFixed(3)} ${(1-fi*0.03).toFixed(3)}; ${(1-fi*0.03).toFixed(3)} ${(1+fi*0.04).toFixed(3)}; 1 1`}
              dur={`${d4}s`} repeatCount="indefinite" additive="sum" />
            <path
              d={value >= 7
                ? `M32 73 C25 73 18 63 20 51 C22 42 26 37 27 28 C28 21 29 15 32 8 C35 15 36 21 37 28 C38 37 42 42 44 51 C46 63 39 73 32 73Z`
                : value >= 4
                ? `M32 73 C26 73 20 64 22 53 C24 44 27 40 28 32 C29 25 30 20 32 14 C34 20 35 25 36 32 C37 40 40 44 42 53 C44 64 38 73 32 73Z`
                : `M32 74 C27 74 23 67 24 59 C25 52 28 49 29 43 C30 38 31 35 32 31 C33 35 34 38 35 43 C36 49 39 52 40 59 C41 67 37 74 32 74Z`}
              fill={`url(#${uid}-mg)`}
              style={{ transform: `scale(${s})`, transformOrigin: '32px 73px' }}
            />
          </g>

          {/* INNER CORE — white-hot base, brightest area */}
          {value > 3 && (
            <g style={{ transformOrigin: '32px 70px' }}>
              <animateTransform attributeName="transform" type="scale"
                values={`1 1; ${(1+fi*0.08).toFixed(3)} ${(1-fi*0.06).toFixed(3)}; ${(1-fi*0.06).toFixed(3)} ${(1+fi*0.09).toFixed(3)}; 1 1`}
                dur={`${d4}s`} repeatCount="indefinite" />
              <path
                d="M32 72 C29 72 26 67 27 62 C28 57 30 54 31 49 C31.5 46 32 44 32 42 C32 44 32.5 46 33 49 C34 54 36 57 37 62 C38 67 35 72 32 72Z"
                fill="#FFF4E0"
                opacity={Math.min(0.95, fi * 1.1 + 0.15)}
                style={{ transform: `scale(${s * 0.65})`, transformOrigin: '32px 70px' }}
              />
            </g>
          )}

          {/* TRAILING WISPS — thin curling tendrils at high values */}
          {value >= 6 && (
            <>
              <path d="M27 52 C24 48 21 44 22 39" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity={fi * 0.5}>
                <animate attributeName="opacity" values={`0;${(fi*0.5).toFixed(2)};0`} dur={`${(+d2*0.8).toFixed(2)}s`} repeatCount="indefinite" begin="0.2s" />
              </path>
              <path d="M37 44 C41 40 43 36 42 31" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" opacity={fi * 0.4}>
                <animate attributeName="opacity" values={`0;${(fi*0.4).toFixed(2)};0`} dur={`${(+d3*0.75).toFixed(2)}s`} repeatCount="indefinite" begin="0.55s" />
              </path>
            </>
          )}

          {/* SPARKS — only at high values, fly off asymmetrically */}
          {value >= 7 && (
            <>
              <circle cx="24" cy="30" r="1.8" fill={color}>
                <animate attributeName="opacity" values="0;0.8;0" dur={`${(+d4*1.5).toFixed(2)}s`} repeatCount="indefinite" begin="0.1s" />
                <animate attributeName="cy" values="30;20;30" dur={`${(+d4*1.5).toFixed(2)}s`} repeatCount="indefinite" begin="0.1s" />
                <animate attributeName="cx" values="24;21;24" dur={`${(+d4*1.5).toFixed(2)}s`} repeatCount="indefinite" begin="0.1s" />
              </circle>
              <circle cx="41" cy="24" r="1.4" fill="#FFF4E0">
                <animate attributeName="opacity" values="0;0.65;0" dur={`${(+d4*1.1).toFixed(2)}s`} repeatCount="indefinite" begin="0.45s" />
                <animate attributeName="cy" values="24;14;24" dur={`${(+d4*1.1).toFixed(2)}s`} repeatCount="indefinite" begin="0.45s" />
                <animate attributeName="cx" values="41;44;41" dur={`${(+d4*1.1).toFixed(2)}s`} repeatCount="indefinite" begin="0.45s" />
              </circle>
              {value >= 8 && (
                <circle cx="32" cy="18" r="1.1" fill="#FFF4E0">
                  <animate attributeName="opacity" values="0;0.9;0" dur={`${(+d4*0.8).toFixed(2)}s`} repeatCount="indefinite" begin="0.7s" />
                  <animate attributeName="cy" values="18;8;18" dur={`${(+d4*0.8).toFixed(2)}s`} repeatCount="indefinite" begin="0.7s" />
                </circle>
              )}
              {value >= 9 && (
                <>
                  <circle cx="26" cy="16" r="1" fill={color}>
                    <animate attributeName="opacity" values="0;0.7;0" dur={`${(+d4*0.65).toFixed(2)}s`} repeatCount="indefinite" begin="0.25s" />
                    <animate attributeName="cy" values="16;6;16" dur={`${(+d4*0.65).toFixed(2)}s`} repeatCount="indefinite" begin="0.25s" />
                    <animate attributeName="cx" values="26;23;26" dur={`${(+d4*0.65).toFixed(2)}s`} repeatCount="indefinite" begin="0.25s" />
                  </circle>
                  <circle cx="38" cy="12" r="0.9" fill="#FFF4E0">
                    <animate attributeName="opacity" values="0;0.6;0" dur={`${(+d4*0.55).toFixed(2)}s`} repeatCount="indefinite" begin="0.85s" />
                    <animate attributeName="cy" values="12;3;12" dur={`${(+d4*0.55).toFixed(2)}s`} repeatCount="indefinite" begin="0.85s" />
                    <animate attributeName="cx" values="38;41;38" dur={`${(+d4*0.55).toFixed(2)}s`} repeatCount="indefinite" begin="0.85s" />
                  </circle>
                </>
              )}
            </>
          )}
        </>
      )}
    </svg>
  )
}

// ─── Vertical slider ──────────────────────────────────────────────────────────

function FlameSlider({ value, onChange, ghostValue = null }) {
  const trackRef  = useRef(null)
  const dragging  = useRef(false)
  const TRACK_H   = 300

  function posToValue(clientY) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return value
    const pct  = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const raw  = 10 - pct * 10
    return Math.round(raw * 2) / 2
  }

  const onDown = useCallback(e => {
    dragging.current = true
    onChange(posToValue(e.clientY ?? e.touches?.[0]?.clientY))
    e.preventDefault?.()
  }, [onChange])

  useEffect(() => {
    function move(e) {
      if (!dragging.current) return
      onChange(posToValue(e.clientY ?? e.touches?.[0]?.clientY))
    }
    function up() { dragging.current = false }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  }, [onChange])

  const pct = v => 100 - (v / 10) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div
        ref={trackRef}
        onMouseDown={onDown}
        onTouchStart={onDown}
        style={{ position: 'relative', width: '56px', height: `${TRACK_H}px`, cursor: 'pointer' }}
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
        fontFamily: "'Cormorant Garamond',Georgia,serif",
        fontSize: '0.875rem', fontStyle: 'italic',
        color: getFlameProps(value).color,
        transition: 'color 0.4s ease',
        textAlign: 'center', minHeight: '20px',
      }}>
        {getFlameProps(value).label}
      </div>

      {/* Zero state — gentle alert */}
      {value === 0 && (
        <div style={{
          marginTop: '8px', padding: '10px 14px',
          background: 'rgba(107,114,128,0.06)',
          border: '1px solid rgba(107,114,128,0.2)',
          borderRadius: '10px', textAlign: 'center',
          maxWidth: '200px',
        }}>
          <p style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: '0.875rem', fontStyle: 'italic',
            color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, margin: '0 0 6px',
          }}>
            That's a hard place to be.
          </p>
          <a href="/tools/foundation" style={{
            fontFamily: "'Cormorant SC',Georgia,serif",
            fontSize: '0.75rem', letterSpacing: '0.10em',
            color: '#A8721A', textDecoration: 'none',
          }}>
            Foundation is here if you need it →
          </a>
        </div>
      )}
    </div>
  )
}

// ─── FlameCheckIn — embeddable in Foundation and Target Sprint ────────────────

export function FlameCheckIn({ audioPhase = 'baseline', ghostValue = null, onComplete, onSkip }) {
  const { user } = useAuth()

  const [stage,       setStage]       = useState('before')
  const [beforeValue, setBeforeValue] = useState(5)
  const [beforeNote,  setBeforeNote]  = useState('')
  const [afterValue,  setAfterValue]  = useState(5)
  const [afterNote,   setAfterNote]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [beforeAt,    setBeforeAt]    = useState(null)

  const isBefore = stage === 'before'
  const value    = isBefore ? beforeValue : afterValue
  const setValue = isBefore ? setBeforeValue : setAfterValue
  const note     = isBefore ? beforeNote : afterNote
  const setNote  = isBefore ? setBeforeNote : setAfterNote

  const delta = afterValue - beforeValue

  async function confirmBefore() {
    setBeforeAt(new Date().toISOString())
    setAfterValue(beforeValue)
    setStage('after')
  }

  async function confirmAfter() {
    setSaving(true)
    try {
      if (user?.id && supabase) {
        const now   = new Date()
        const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        await supabase.from('pulse_entries').upsert({
          user_id:      user.id,
          type:         'daily',
          period_id:    `${today}-foundation-${audioPhase}`,
          source:       'foundation',
          audio_phase:  audioPhase,
          scores:       { spark: afterValue },
          note:         afterNote || null,
          before_value: beforeValue,
          before_note:  beforeNote || null,
          before_at:    beforeAt,
          after_value:  afterValue,
          after_note:   afterNote || null,
          after_at:     now.toISOString(),
          completed_at: now.toISOString(),
          updated_at:   now.toISOString(),
        }, { onConflict: 'user_id,type,period_id' })
      }
    } catch (e) {
      console.warn('[FlameCheckIn] Save error:', e)
    }
    setSaving(false)
    onComplete?.({ beforeValue, afterValue, delta, beforeNote, afterNote })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
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
        textAlign: 'center', marginBottom: '24px',
      }}>
        {isBefore ? 'Where is the flame right now?' : 'And now\u2014?'}
      </p>

      {/* Flame slider */}
      <div style={{ marginBottom: '24px' }}>
        <FlameSlider
          value={value}
          onChange={setValue}
          ghostValue={isBefore ? null : (ghostValue ?? beforeValue)}
        />
      </div>

      {/* Note field */}
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={isBefore
          ? 'what walked in with you today\u2026'
          : 'what you\u2019re leaving with\u2026'}
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
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(200,146,42,0.5)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(200,146,42,0.2)' }}
      />

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
        <button
          onClick={isBefore ? confirmBefore : confirmAfter}
          disabled={saving}
          style={{
            flex: 1, padding: '13px',
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
          {saving ? 'Saving\u2026' : isBefore ? 'Begin \u2192' : 'Done \u2713'}
        </button>
        {onSkip && (
          <button onClick={onSkip} style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: '0.875rem', fontStyle: 'italic',
            color: 'rgba(15,21,35,0.35)',
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
