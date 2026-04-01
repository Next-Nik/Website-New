import { useState, useRef, useEffect } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { ScalePanel } from '../../components/ScalePanel'

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAINS = [
  { id: 'path',          label: 'Path',          question: 'Am I walking my path — or just walking?',                       fractal: 'Vision' },
  { id: 'spark',         label: 'Spark',         question: 'Is the fire on?',                                                      fractal: 'Human Being' },
  { id: 'body',          label: 'Body',          question: 'How is this living system doing?',                                     fractal: 'Nature' },
  { id: 'finances',      label: 'Finances',      question: 'Do I have the agency to act on what matters?',                        fractal: 'Finance & Economy' },
  { id: 'relationships', label: 'Relationships', question: 'Am I truly known by anyone?',                                         fractal: 'Society' },
  { id: 'inner_game',    label: 'Inner Game',    question: 'Are my stories tending me, or running me?',                           fractal: 'Legacy' },
  { id: 'outer_game',    label: 'Outer Game',    question: 'Is what I’m broadcasting aligned with who I actually am?',       fractal: 'Society' },
]

// Full 21-point scale
const SCALE_POINTS = [10,9.5,9,8.5,8,7.5,7,6.5,6,5.5,5,4.5,4,3.5,3,2.5,2,1.5,1,0.5,0]

const TIER_MAP = {
  10:'World-Class', 9.5:'Exemplar+', 9:'Exemplar', 8.5:'Fluent+', 8:'Fluent',
  7.5:'Capable+', 7:'Capable', 6.5:'Functional+', 6:'Functional', 5.5:'Plateau+',
  5:'Threshold', 4.5:'Friction+', 4:'Friction', 3.5:'Strain+', 3:'Strain',
  2.5:'Crisis+', 2:'Crisis', 1.5:'Emergency+', 1:'Emergency', 0.5:'Emergency−', 0:'Ground Zero'
}

const LABEL_MAP = {
  10:'Best in the world', 9.5:'Elite professional', 9:'Professional',
  8.5:'Elite ranked amateur', 8:'High level ranked amateur',
  7.5:'Elite recreational player', 7:'High level recreational player',
  6.5:'Elite casual athlete', 6:'Casual athlete', 5.5:'Making an effort (occasionally)',
  5:'— The Line —', 4.5:'Teetering on the edge', 4:'Attempting to get off the couch',
  3.5:'Leaving an indent on the couch', 3:'Afraid to look in the mirror',
  2.5:'Danger to oneself', 2:'Barely functioning', 1.5:'Hurting real bad / numb',
  1:'Almost dead', 0.5:'Flickering', 0:'Ground Zero'
}

function getScoreColor(n) {
  if (n >= 8)   return '#3B6B9E'
  if (n >= 6.5) return '#5A8AB8'
  if (n >= 5)   return '#8A8070'
  if (n >= 3)   return '#8A7030'
  return '#8A3030'
}

const LS_KEY = 'lifeos_themap_v3'

// ─── Hourglass Picker ─────────────────────────────────────────────────────────

function HourglassPicker({ onScore, horizonMode = false, currentScore }) {
  const [hovered, setHovered] = useState(null)
  const points = horizonMode
    ? SCALE_POINTS.filter(n => n >= 5)
    : SCALE_POINTS
  const minW = 36, maxW = 98

  function getWidth(n) {
    // Pinch at 5 (The Line), wide at extremes
    const dist = Math.abs(n - 5)
    const pct = dist / 5
    return Math.round(minW + (maxW - minW) * Math.pow(pct, 1.4))
  }

  const isLine = n => n === 5
  const col = n => getScoreColor(n)

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.35)',
      borderRadius: '12px',
      padding: '16px 20px',
      marginTop: '12px',
    }}>
      {horizonMode && (
        <div style={{
          fontFamily: 'var(--font-sc)',
          fontSize: '0.8125rem',
          letterSpacing: '0.16em',
          color: 'var(--gold-dk)',
          textTransform: 'uppercase',
          marginBottom: '12px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(200,146,42,0.12)',
        }}>
          Horizon target {'·'} Development zone only
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {points.map(n => {
          const w = getWidth(n)
          const c = col(n)
          const isHov = hovered === n
          const isCurrent = currentScore === n
          const isTheLine = isLine(n) && !horizonMode

          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Score number */}
              <div style={{
                width: '28px',
                textAlign: 'right',
                fontFamily: 'var(--font-sc)',
                fontSize: '0.8125rem',
                letterSpacing: '0.04em',
                color: isTheLine ? 'var(--gold-dk)' : isCurrent ? c : 'var(--text-muted)',
                fontWeight: (isTheLine || isCurrent) ? 600 : 400,
                flexShrink: 0,
              }}>
                {n}
              </div>

              {/* Bar */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', height: '26px' }}>
                {/* Background line */}
                <div style={{
                  position: 'absolute', left: 0, right: 0,
                  height: isTheLine ? '1.5px' : '1px',
                  background: isTheLine ? 'rgba(200,146,42,0.4)' : 'rgba(200,146,42,0.08)',
                }} />
                {/* Clickable bar */}
                <button
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onScore(n)}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: `${w}%`,
                    height: isCurrent ? '20px' : '18px',
                    background: isHov || isCurrent ? c : horizonMode ? `${c}18` : `${c}14`,
                    border: `1px solid ${isHov || isCurrent ? c : `${c}30`}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    outline: isCurrent ? `2px solid ${c}44` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              </div>

              {/* Tier label */}
              <div style={{
                width: '130px',
                flexShrink: 0,
                fontFamily: 'var(--font-body)',
                fontSize: '0.8125rem',
                color: isTheLine ? 'var(--gold-dk)' : isCurrent ? c : 'rgba(15,21,35,0.72)',
                fontWeight: isCurrent ? 600 : 400,
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {LABEL_MAP[n]}
              </div>
            </div>
          )
        })}
      </div>
      {hovered !== null && (
        <div style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid rgba(200,146,42,0.12)',
          display: 'flex',
          alignItems: 'baseline',
          gap: '10px',
        }}>
          <span style={{ fontFamily: 'var(--font-sc)', fontSize: '1.125rem', fontWeight: 600, color: getScoreColor(hovered) }}>{hovered}</span>
          <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.08em', color: getScoreColor(hovered) }}>{TIER_MAP[hovered]}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'rgba(15,21,35,0.88)' }}>{LABEL_MAP[hovered]}</span>
        </div>
      )}
    </div>
  )
}

// ─── Domain Wheel (dual layer) ────────────────────────────────────────────────

function DomainWheel({ currentScores, horizonScores = {}, size = 260 }) {
  const cx = size / 2, cy = size / 2
  const outerR = (size / 2) * 0.7
  const innerR = 24
  const n = DOMAINS.length
  const startAngle = -Math.PI / 2

  function getPoint(i, score) {
    const angle = startAngle + (2 * Math.PI * i) / n
    const ratio = Math.max(0, score) / 10
    const r = innerR + (outerR - innerR) * ratio
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }

  function getOuter(i) {
    const angle = startAngle + (2 * Math.PI * i) / n
    return [cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle)]
  }

  function getLabel(i) {
    const angle = startAngle + (2 * Math.PI * i) / n
    const r = outerR + 20
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }

  const currentPoly = DOMAINS.map((d, i) =>
    getPoint(i, currentScores[d.id] ?? 0).join(',')
  ).join(' ')

  const horizonPoly = DOMAINS.map((d, i) =>
    getPoint(i, horizonScores[d.id] ?? 0).join(',')
  ).join(' ')

  const hasHorizon = Object.keys(horizonScores).length > 0
  const hasCurrent = Object.keys(currentScores).length > 0

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: `${size}px`, display: 'block', margin: '0 auto' }}
    >
      {/* Grid lines */}
      {DOMAINS.map((_, i) => {
        const [ox, oy] = getOuter(i)
        return <line key={i} x1={cx} y1={cy} x2={ox} y2={oy} stroke="rgba(200,146,42,0.1)" strokeWidth="1" />
      })}

      {/* Concentric rings */}
      {[0.25, 0.5, 0.75, 1].map(r => {
        const rr = innerR + (outerR - innerR) * r
        return (
          <circle key={r} cx={cx} cy={cy} r={rr}
            fill="none"
            stroke={r === 1 ? 'rgba(200,146,42,0.35)' : 'rgba(200,146,42,0.07)'}
            strokeWidth="1"
            strokeDasharray={r < 1 ? '2 4' : undefined}
          />
        )
      })}

      {/* Horizon shape (behind current) */}
      {hasHorizon && (
        <polygon
          points={horizonPoly}
          fill="rgba(200,146,42,0.06)"
          stroke="rgba(200,146,42,0.35)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
      )}

      {/* Current reality shape */}
      {hasCurrent && (
        <polygon
          points={currentPoly}
          fill="rgba(200,146,42,0.14)"
          stroke="rgba(200,146,42,0.65)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}

      {/* Current score dots */}
      {hasCurrent && DOMAINS.map((d, i) => {
        const s = currentScores[d.id]
        if (s === undefined) return null
        const [px, py] = getPoint(i, s)
        return (
          <circle key={i} cx={px} cy={py} r="4.5"
            fill={getScoreColor(s)}
            stroke="#FAFAF7" strokeWidth="1.5"
          />
        )
      })}

      {/* Horizon dots */}
      {hasHorizon && DOMAINS.map((d, i) => {
        const s = horizonScores[d.id]
        if (!s) return null
        const [px, py] = getPoint(i, s)
        return (
          <circle key={`h${i}`} cx={px} cy={py} r="3.5"
            fill="none"
            stroke="rgba(200,146,42,0.7)"
            strokeWidth="1.5"
          />
        )
      })}

      {/* Centre */}
      <circle cx={cx} cy={cy} r={innerR} fill="#FAFAF7" stroke="rgba(200,146,42,0.35)" strokeWidth="1" />
      <text x={cx} y={cy - 3} textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: 'Georgia,serif', fontSize: '6px', fill: 'rgba(15,21,35,0.72)', letterSpacing: '0.1em' }}>
        LIFE OS
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: 'Georgia,serif', fontSize: '6px', fill: 'rgba(15,21,35,0.72)', letterSpacing: '0.08em' }}>
        MAP
      </text>

      {/* Domain labels */}
      {DOMAINS.map((d, i) => {
        const [lx, ly] = getLabel(i)
        const anchor = lx < cx - 4 ? 'end' : lx > cx + 4 ? 'start' : 'middle'
        const s = currentScores[d.id]
        return (
          <text key={i} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle"
            style={{
              fontFamily: 'Georgia,serif',
              fontSize: '8px',
              fill: s !== undefined ? 'rgba(15,21,35,0.72)' : 'rgba(15,21,35,0.72)',
              letterSpacing: '0.04em',
            }}
          >
            {d.label}
          </text>
        )
      })}

      {/* Legend */}
      {hasHorizon && hasCurrent && (
        <g>
          <line x1={cx - 40} y1={size - 12} x2={cx - 28} y2={size - 12} stroke="rgba(200,146,42,0.65)" strokeWidth="2" />
          <text x={cx - 24} y={size - 12} dominantBaseline="middle" style={{ fontFamily: 'Georgia,serif', fontSize: '7px', fill: 'rgba(15,21,35,0.5)' }}>Now</text>
          <line x1={cx + 8} y1={size - 12} x2={cx + 20} y2={size - 12} stroke="rgba(200,146,42,0.4)" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x={cx + 24} y={size - 12} dominantBaseline="middle" style={{ fontFamily: 'Georgia,serif', fontSize: '7px', fill: 'rgba(15,21,35,0.5)' }}>Horizon</text>
        </g>
      )}
    </svg>
  )
}

// ─── Live Domain Panel ────────────────────────────────────────────────────────

function LiveDomainPanel({ currentScores, horizonScores }) {
  const scored = DOMAINS.filter(d => currentScores[d.id] !== undefined)
  if (scored.length === 0) return null

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.35)',
      borderRadius: '12px',
      padding: '20px 20px 16px',
      marginBottom: '20px',
    }}>
      <div style={{
        fontFamily: 'var(--font-sc)',
        fontSize: '0.8125rem',
        letterSpacing: '0.18em',
        color: 'var(--gold-dk)',
        textTransform: 'uppercase',
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(200,146,42,0.1)',
      }}>
        Your Map
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 auto' }}>
          <DomainWheel currentScores={currentScores} horizonScores={horizonScores} size={200} />
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          {scored.map(d => {
            const s = currentScores[d.id]
            const h = horizonScores[d.id]
            const col = getScoreColor(s)
            return (
              <div key={d.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 0',
                borderBottom: '1px solid rgba(200,146,42,0.06)',
              }}>
                <div style={{ width: '80px', flexShrink: 0, fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.06em', color: 'rgba(15,21,35,0.88)', textTransform: 'uppercase' }}>
                  {d.label}
                </div>
                <div style={{ flex: 1, position: 'relative', height: '3px', background: 'rgba(200,146,42,0.1)', borderRadius: '2px' }}>
                  <div style={{ position: 'absolute', left: 0, width: `${(s / 10) * 100}%`, height: '100%', background: col, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                  {h && (
                    <div style={{ position: 'absolute', left: `${(h / 10) * 100}%`, top: '-3px', width: '2px', height: '9px', background: 'rgba(200,146,42,0.6)', borderRadius: '1px', transform: 'translateX(-1px)' }} />
                  )}
                </div>
                <div style={{ width: '52px', flexShrink: 0, textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-sc)', fontSize: '1rem', fontWeight: 600, color: col }}>{s}</span>
                  {h && <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'rgba(200,146,42,0.6)', marginLeft: '4px' }}>{'→'}{h}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Domain Step ──────────────────────────────────────────────────────────────

function DomainStep({ domain, domainIndex, totalDomains, onComplete, existingData }) {
  const [step, setStep]           = useState(existingData ? 'done' : 'avatar')
  const [avatarInput, setAvatar]  = useState(existingData?.avatar || '')
  const [reflection, setReflection] = useState('')
  const [realityInput, setReality] = useState(existingData?.currentReality || '')
  const [currentScore, setCurrentScore] = useState(existingData?.currentScore)
  const [evidence, setEvidence]   = useState(existingData?.evidence || '')
  const [horizonText, setHorizonText] = useState(existingData?.horizonText || '')
  const [horizonScore, setHorizonScore] = useState(existingData?.horizonScore)
  const [thinking, setThinking]   = useState(false)
  const avatarRef = useRef(null)

  const isBelow5 = currentScore !== undefined && currentScore < 5

  async function handleAvatarReflect() {
    if (!avatarInput.trim()) return
    setThinking(true)
    try {
      const res = await fetch('/tools/map/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'avatar_reflect',
          domain: domain.id,
          avatarInput,
        })
      })
      const data = await res.json()
      setReflection(data.reflection || '')
      setThinking(false)
      setStep('reality')
    } catch {
      setThinking(false)
      setStep('reality')
    }
  }

  function handleCurrentScore(n) {
    setCurrentScore(n)
    setStep('evidence')
  }

  function handleDone() {
    onComplete({
      domainId:      domain.id,
      avatar:        avatarInput,
      reflection,
      currentReality: realityInput,
      currentScore,
      evidence,
      horizonText,
      horizonScore,
    })
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.35)',
      borderLeft: '3px solid rgba(200,146,42,0.55)',
      borderRadius: '10px',
      padding: '24px 24px 20px',
      marginBottom: '16px',
      animation: 'fadeUp 0.35s ease-out',
    }}>
      {/* Domain header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.18em', color: 'var(--gold-dk)', textTransform: 'uppercase' }}>
            {domainIndex + 1} of {totalDomains}
          </span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-sc)', fontSize: '1.375rem', fontWeight: 400, color: 'var(--text)', marginBottom: '4px' }}>
          {domain.label}
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.6 }}>
          {domain.question}
        </p>
      </div>

      {/* STEP 1: Avatar */}
      {(step === 'avatar' || step === 'reality' || step === 'evidence' || step === 'horizon' || step === 'done') && (
        <div style={{ marginBottom: step === 'avatar' ? 0 : '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.16em', color: 'var(--gold-dk)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Step 1 {'·'} 10/10
            </span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-meta)', lineHeight: 1.7 }}>
              Who is your 10/10 in {domain.label}? Someone outside yourself {'—'} real, imagined, fictional, a mashup. Who carries that frequency?
            </p>
          </div>

          {step === 'avatar' ? (
            <>
              <textarea
                ref={avatarRef}
                value={avatarInput}
                onChange={e => setAvatar(e.target.value)}
                placeholder={'Name people, characters, qualities. Don’t explain yet — just name them.'}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  color: 'var(--text-meta)',
                  background: 'rgba(200,146,42,0.02)',
                  border: '1px solid rgba(200,146,42,0.45)',
                  borderRadius: '8px',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 1.65,
                  marginBottom: '10px',
                }}
              />
              <button
                onClick={handleAvatarReflect}
                disabled={!avatarInput.trim() || thinking}
                style={{
                  fontFamily: 'var(--font-sc)',
                  fontSize: '0.8125rem',
                  letterSpacing: '0.1em',
                  color: 'var(--gold-dk)',
                  background: 'rgba(200,146,42,0.05)',
                  border: '1.5px solid rgba(200,146,42,0.78)',
                  borderRadius: '40px',
                  padding: '10px 24px',
                  cursor: avatarInput.trim() && !thinking ? 'pointer' : 'not-allowed',
                  opacity: avatarInput.trim() && !thinking ? 1 : 0.4,
                }}
              >
                {thinking ? 'Reading the pattern…' : 'See what this reveals →'}
              </button>
            </>
          ) : (
            <div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
               
                color: 'rgba(15,21,35,0.88)',
                lineHeight: 1.7,
                padding: '10px 14px',
                background: 'rgba(200,146,42,0.03)',
                borderRadius: '6px',
                borderLeft: '2px solid rgba(200,146,42,0.3)',
                marginBottom: reflection ? '10px' : 0,
              }}>
                {avatarInput}
              </div>
              {reflection && (
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  color: 'var(--text-meta)',
                  lineHeight: 1.75,
                  padding: '18px 20px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(200,146,42,0.35)',
                  borderRadius: '8px',
                }}>
                  {reflection}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Where are you now */}
      {(step === 'reality' || step === 'evidence' || step === 'horizon' || step === 'done') && (
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.16em', color: 'var(--gold-dk)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Step 2 {'·'} Where are you now?
          </span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-meta)', lineHeight: 1.7, marginBottom: '10px' }}>
            What{'’'}s actually true right now in {domain.label}?
            <span style={{ display: 'block', fontSize: '0.8125rem', color: 'rgba(15,21,35,0.88)', marginTop: '4px' }}>
              Voice to text works well here. Don{'’'}t edit. Just pour it out.
            </span>
          </p>

          {step === 'reality' ? (
            <>
              <textarea
                value={realityInput}
                onChange={e => setReality(e.target.value)}
                placeholder={'What’s true right now? Not aspirational — actual.'}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  color: 'var(--text-meta)',
                  background: 'rgba(200,146,42,0.02)',
                  border: '1px solid rgba(200,146,42,0.45)',
                  borderRadius: '8px',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 1.65,
                  marginBottom: '16px',
                }}
              />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-meta)', lineHeight: 1.65, marginBottom: '8px' }}>
                Now score yourself against your 10/10. Not against a universal standard {'—'} against the character you just named.
              </p>
              <HourglassPicker onScore={handleCurrentScore} currentScore={currentScore} />
            </>
          ) : (
            <div>
              {realityInput && (
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                 
                  color: 'rgba(15,21,35,0.88)',
                  lineHeight: 1.7,
                  padding: '10px 14px',
                  background: 'rgba(200,146,42,0.03)',
                  borderRadius: '6px',
                  borderLeft: '2px solid rgba(200,146,42,0.35)',
                  marginBottom: '10px',
                }}>
                  {realityInput}
                </div>
              )}
              {currentScore !== undefined && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '40px', border: `1.5px solid ${getScoreColor(currentScore)}44`, background: `${getScoreColor(currentScore)}12` }}>
                  <span style={{ fontFamily: 'var(--font-sc)', fontSize: '1rem', fontWeight: 600, color: getScoreColor(currentScore) }}>{currentScore}</span>
                  <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.08em', color: getScoreColor(currentScore) }}>{TIER_MAP[currentScore]}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'rgba(15,21,35,0.88)' }}>{LABEL_MAP[currentScore]}</span>
                </div>
              )}
              {isBelow5 && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  background: 'rgba(138,48,48,0.04)',
                  border: '1px solid rgba(138,48,48,0.18)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                 
                  color: 'rgba(138,48,48,0.75)',
                  lineHeight: 1.65,
                }}>
                  This domain is below The Line. It{'’'}s consuming more than it{'’'}s generating. That{'’'}s not a verdict {'—'} it{'’'}s useful information. Stabilise before optimise.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 2b: Evidence */}
      {step === 'evidence' && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-meta)', lineHeight: 1.7, marginBottom: '10px' }}>
            What{'’'}s the evidence for {currentScore}? What are you seeing that made you land there?
          </p>
          <textarea
            value={evidence}
            onChange={e => setEvidence(e.target.value)}
            placeholder={'The evidence, honest...'}
            rows={3}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              color: 'var(--text-meta)',
              background: 'rgba(200,146,42,0.02)',
              border: '1px solid rgba(200,146,42,0.45)',
              borderRadius: '8px',
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.65,
              marginBottom: '10px',
            }}
          />
          <button
            onClick={() => setStep('horizon')}
            style={{
              fontFamily: 'var(--font-sc)',
              fontSize: '0.8125rem',
              letterSpacing: '0.1em',
              color: 'var(--gold-dk)',
              background: 'rgba(200,146,42,0.05)',
              border: '1.5px solid rgba(200,146,42,0.78)',
              borderRadius: '40px',
              padding: '10px 24px',
              cursor: 'pointer',
            }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* STEP 3: Horizon goal */}
      {(step === 'horizon' || step === 'done') && (
        <div style={{ marginBottom: step === 'done' ? 0 : '20px' }}>
          <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.16em', color: 'var(--gold-dk)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Step 3 {'·'} Horizon goal
          </span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-meta)', lineHeight: 1.7, marginBottom: '4px' }}>
            If the genie granted your wish in {domain.label}, what would it be?
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.6, marginBottom: '12px' }}>
            Not the avatar {'—'} that{'’'}s best in the world. Your life. You don{'’'}t have to want 10.
          </p>

          {step === 'horizon' ? (
            <>
              <textarea
                value={horizonText}
                onChange={e => setHorizonText(e.target.value)}
                placeholder={'What would your life look like if this area were genuinely good?'}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  color: 'var(--text-meta)',
                  background: 'rgba(200,146,42,0.02)',
                  border: '1px solid rgba(200,146,42,0.45)',
                  borderRadius: '8px',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 1.65,
                  marginBottom: '14px',
                }}
              />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-meta)', lineHeight: 1.65, marginBottom: '8px' }}>
                Where on the scale? 5 and above only {'—'} this is the development zone.
              </p>
              <HourglassPicker
                onScore={n => { setHorizonScore(n); setStep('done'); handleDone() }}
                horizonMode={true}
                currentScore={horizonScore}
              />
            </>
          ) : (
            <div>
              {horizonText && (
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                 
                  color: 'rgba(15,21,35,0.88)',
                  lineHeight: 1.7,
                  padding: '10px 14px',
                  background: 'rgba(200,146,42,0.03)',
                  borderRadius: '6px',
                  borderLeft: '2px solid rgba(200,146,42,0.45)',
                  marginBottom: '10px',
                }}>
                  {horizonText}
                </div>
              )}
              {horizonScore !== undefined && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.35)', background: 'rgba(200,146,42,0.06)' }}>
                  <span style={{ fontFamily: 'var(--font-sc)', fontSize: '1rem', color: 'var(--gold-dk)' }}>Horizon: {horizonScore}</span>
                  <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.08em', color: 'var(--gold-dk)' }}>{TIER_MAP[horizonScore]}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Results Card ─────────────────────────────────────────────────────────────

function ResultsCard({ mapData, domainData, currentScores, horizonScores, onSignIn, isSignedIn }) {
  const [horizonText,   setHorizonText]   = useState('')
  const [draftVisible,  setDraftVisible]  = useState(false)
  const [horizonLocked, setHorizonLocked] = useState(false)
  const { user } = useAuth()

  const focusDomains = mapData.focus_domains || []

  async function lockHorizon() {
    if (!horizonText.trim()) return
    try { localStorage.setItem('lifeos_map_horizon_locked', horizonText) } catch {}
    if (user?.id) {
      try {
        const { data: rows } = await supabase.from('map_results').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
        if (rows?.[0]?.id) await supabase.from('map_results').update({ horizon_goal_user: horizonText }).eq('id', rows[0].id)
      } catch {}
    }
    setHorizonLocked(true)
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.45)',
      borderLeft: '3px solid rgba(200,146,42,0.55)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 20px rgba(200,146,42,0.08)',
      animation: 'fadeUp 0.5s ease-out',
    }}>
      {/* Hero */}
      <div style={{ padding: '28px 28px 22px', borderBottom: '1px solid rgba(200,146,42,0.1)', background: 'rgba(200,146,42,0.03)' }}>
        <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.22em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '12px' }}>Your Life OS Map</div>
        <div style={{ display: 'inline-block', border: '1px solid rgba(200,146,42,0.35)', borderRadius: '6px', padding: '4px 14px', fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.16em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '10px' }}>{mapData.stage}</div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-meta)', lineHeight: 1.75 }}>{mapData.stage_description}</p>
      </div>

      {/* Full wheel */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(200,146,42,0.07)' }}>
        <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.18em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>
          Your Seven Domains
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <DomainWheel currentScores={currentScores} horizonScores={horizonScores} size={220} />
          <div style={{ flex: 1, minWidth: '180px' }}>
            {DOMAINS.map(d => {
              const data = domainData[d.id]
              if (!data) return null
              const s = data.currentScore
              const h = data.horizonScore
              const isFocus = focusDomains.includes(d.id)
              const col = getScoreColor(s)
              return (
                <div key={d.id} style={{
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(200,146,42,0.07)',
                  background: isFocus ? 'rgba(200,146,42,0.03)' : 'transparent',
                  paddingLeft: isFocus ? '8px' : 0,
                  borderLeft: isFocus ? '2px solid rgba(200,146,42,0.4)' : 'none',
                  marginLeft: isFocus ? '-8px' : 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.06em', color: isFocus ? 'var(--gold-dk)' : 'var(--text)', minWidth: '90px' }}>
                      {isFocus ? '▸ ' : ''}{d.label}
                    </span>
                    <div style={{ flex: 1, height: '3px', background: 'rgba(200,146,42,0.1)', borderRadius: '2px', position: 'relative', overflow: 'visible' }}>
                      <div style={{ position: 'absolute', left: 0, width: `${(s / 10) * 100}%`, height: '100%', background: col, borderRadius: '2px', transition: 'width 0.8s ease' }} />
                      {h && <div style={{ position: 'absolute', left: `${(h / 10) * 100}%`, top: '-4px', width: '2px', height: '11px', background: 'rgba(200,146,42,0.55)', borderRadius: '1px', transform: 'translateX(-1px)' }} />}
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '60px' }}>
                      <span style={{ fontFamily: 'var(--font-sc)', fontSize: '1rem', fontWeight: 600, color: col }}>{s}</span>
                      {h && <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'rgba(200,146,42,0.55)', marginLeft: '4px' }}>{'→'}{h}</span>}
                    </div>
                  </div>
                  {isFocus && (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'rgba(15,21,35,0.88)' }}>{d.question}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pattern */}
      {mapData.overall_reflection && (
        <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(200,146,42,0.07)' }}>
          <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.18em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>What The Pattern Shows</div>
          {mapData.overall_reflection.split('\n\n').map((p, i) => (
            <p key={i} style={{ fontFamily: 'var(--font-body)', lineHeight: 1.8, color: 'var(--text-meta)', margin: i > 0 ? '12px 0 0' : 0 }}>{p}</p>
          ))}
        </div>
      )}

      {/* Focus domains */}
      {focusDomains.length > 0 && (
        <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(200,146,42,0.07)' }}>
          <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.18em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>Your Three Focus Domains</div>
          <p style={{ fontFamily: 'var(--font-sc)', fontSize: '1rem', color: 'var(--gold-dk)', letterSpacing: '0.04em', marginBottom: '8px' }}>
            {focusDomains.map(id => DOMAINS.find(d => d.id === id)?.label).filter(Boolean).join('  ·  ')}
          </p>
          {mapData.focus_reasoning && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.75 }}>{mapData.focus_reasoning}</p>
          )}
        </div>
      )}

      {/* Brain insight */}
      {mapData.brain_insight && (
        <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(200,146,42,0.07)' }}>
          <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.18em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>What To Learn</div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-meta)', lineHeight: 1.8 }}>{mapData.brain_insight}</p>
        </div>
      )}

      {/* Next step */}
      {mapData.next_step && (
        <div style={{ padding: '20px 28px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.7, borderTop: '1px solid rgba(200,146,42,0.07)' }}>
          {mapData.next_step}
        </div>
      )}

      {/* Life horizon */}
      {mapData.life_horizon_draft && (
        <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(200,146,42,0.12)' }}>
          <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.18em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>Your Life Horizon</div>
          <textarea
            value={horizonText}
            onChange={e => setHorizonText(e.target.value)}
            disabled={horizonLocked}
            placeholder={'Write your own Life Horizon — in your own voice.'}
            rows={4}
            style={{ width: '100%', padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 300, color: 'var(--text-meta)', background: '#FFFFFF', border: horizonLocked ? '1px solid rgba(200,146,42,0.3)' : '1.5px dashed rgba(200,146,42,0.4)', borderRadius: '10px', resize: 'vertical', outline: 'none', lineHeight: 1.7, marginBottom: '8px', opacity: horizonLocked ? 0.7 : 1 }}
          />
          <button onClick={() => setDraftVisible(v => !v)} style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'rgba(15,21,35,0.88)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '10px', display: 'block' }}>
            {draftVisible ? 'Hide draft ↑' : 'See what The Map drafted →'}
          </button>
          {draftVisible && (
            <div style={{ padding: '18px 20px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.35)', borderRadius: '10px', marginBottom: '12px' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 300, color: 'rgba(15,21,35,0.82)', lineHeight: 1.75, marginBottom: '10px' }}>{mapData.life_horizon_draft}</p>
              <button onClick={() => { setHorizonText(mapData.life_horizon_draft); setDraftVisible(false) }} style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--gold-dk)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Use this as my starting point →
              </button>
            </div>
          )}
          {!horizonLocked && horizonText.trim() && (
            <button onClick={lockHorizon} style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.12em', color: 'var(--gold-dk)', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '10px 24px', cursor: 'pointer' }}>
              Lock this as my Life Horizon ✓
            </button>
          )}
          {horizonLocked && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'rgba(15,21,35,0.88)' }}>
              <span style={{ color: 'var(--gold-dk)', fontStyle: 'normal', fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.1em' }}>✓ Locked.</span>{' '}This is your Life Horizon.
            </p>
          )}
        </div>
      )}

      {/* Sign in gate */}
      {!isSignedIn && (
        <div style={{ padding: '24px 28px 28px', borderTop: '1px solid rgba(200,146,42,0.12)', background: 'rgba(200,146,42,0.03)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.22em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '10px' }}>Save Your Map</div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-meta)', lineHeight: 1.75, marginBottom: '18px', maxWidth: '380px', margin: '0 auto 18px' }}>Sign in to save your map and access your full results.</p>
          <button onClick={onSignIn} style={{ padding: '12px 32px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: 'var(--gold-dk)', fontFamily: 'var(--font-sc)', fontSize: '1rem', letterSpacing: '0.14em', cursor: 'pointer' }}>
            Sign in to save →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal() {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.6)', borderRadius: '14px', padding: '40px 32px 32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.2em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '14px' }}>The Map</span>
        <h2 style={{ fontFamily: 'var(--font-sc)', fontSize: '1.375rem', fontWeight: 400, color: 'var(--text)', marginBottom: '10px' }}>Sign in to begin.</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.7, marginBottom: '24px' }}>
          Your map is saved to your profile so you can return to it any time.
        </p>
        <a href={`/login?redirect=${returnUrl}`} style={{ display: 'block', padding: '14px 24px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: 'var(--gold-dk)', fontFamily: 'var(--font-sc)', fontSize: '1rem', letterSpacing: '0.14em', textDecoration: 'none' }}>
          Sign in or create account →
        </a>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MapPage() {
  const { user, loading: authLoading } = useAuth()

  const [phase,          setPhase]          = useState('welcome')
  const [currentDomain,  setCurrentDomain]  = useState(0)
  const [domainData,     setDomainData]     = useState({})
  const [currentScores,  setCurrentScores]  = useState({})
  const [horizonScores,  setHorizonScores]  = useState({})
  const [synthesis,      setSynthesis]      = useState(null)
  const [mapData,        setMapData]        = useState(null)
  const [thinking,       setThinking]       = useState(false)
  const [sessionId,      setSessionId]      = useState(null)
  const startedRef = useRef(false)
  const bottomRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [phase, currentDomain, synthesis, mapData])

  if (authLoading) return <div className="loading" />
  if (!user) return (
    <>
      <Nav activePath="life-os" />
      <AuthModal />
    </>
  )

  function handleDomainComplete(data) {
    const next = { ...domainData, [data.domainId]: data }
    setDomainData(next)
    setCurrentScores(prev => ({ ...prev, [data.domainId]: data.currentScore }))
    setHorizonScores(prev => ({ ...prev, [data.domainId]: data.horizonScore }))

    if (currentDomain < DOMAINS.length - 1) {
      setCurrentDomain(i => i + 1)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } else {
      setPhase('synthesis')
      runSynthesis(next)
    }
  }

  async function runSynthesis(allData) {
    setThinking(true)
    try {
      const res = await fetch('/tools/map/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'synthesise',
          domainData: allData,
          userId: user?.id,
        })
      })
      const data = await res.json()
      setThinking(false)
      if (data.mapData) {
        setMapData(data.mapData)
        setSynthesis(data.synthesis)
        setPhase('results')
        saveToSupabase(allData, data.mapData)
      } else if (data.message) {
        setSynthesis(data.message)
      }
    } catch {
      setThinking(false)
      setSynthesis('Something went wrong during synthesis. Please refresh and try again.')
    }
  }

  async function saveToSupabase(allData, map) {
    if (!user?.id) return
    try {
      const { data } = await supabase.from('map_results').upsert({
        user_id:             user.id,
        session:             { domainData: allData, currentScores, horizonScores },
        phase:               'complete',
        complete:            true,
        horizon_goal_system: map?.life_horizon_draft ?? null,
        completed_at:        new Date().toISOString(),
        updated_at:          new Date().toISOString(),
      }, { onConflict: 'user_id' }).select('id').single()
      if (data?.id) setSessionId(data.id)
    } catch {}
  }

  const progressPct = phase === 'welcome' ? 5
    : phase === 'scoring' ? Math.round(((currentDomain + 0.5) / DOMAINS.length) * 85) + 5
    : phase === 'synthesis' ? 95
    : 100

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />
      <ScalePanel />

      <div className="tool-wrap">
        {/* Header */}
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS</span>
          <h1 className="tool-title">The Map</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'rgba(15,21,35,0.88)', marginTop: '4px' }}>
            From where you are to where you want to be.
          </p>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ height: '2px', background: 'rgba(200,146,42,0.1)', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--gold)', borderRadius: '1px', transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.18em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginTop: '6px' }}>
            {phase === 'welcome'   ? 'The Map' :
             phase === 'scoring'   ? `Domain ${currentDomain + 1} of ${DOMAINS.length} · ${DOMAINS[currentDomain]?.label}` :
             phase === 'synthesis' ? 'Building your map…' :
             'Your map'}
          </div>
        </div>

        {/* Welcome */}
        {phase === 'welcome' && (
          <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid rgba(200,146,42,0.35)',
              borderLeft: '3px solid rgba(200,146,42,0.55)',
              borderRadius: '12px',
              padding: '32px 32px 28px',
              marginBottom: '20px',
            }}>

              {/* Opening — large, breathing */}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.125rem, 2.5vw, 1.3125rem)', fontWeight: 300, color: 'var(--text)', lineHeight: 1.9, marginBottom: '12px' }}>
                The Map is a process through which you will connect to the version of your life on the other side of the things you’ve been wanting to fix, change, alter, improve, repair, and heal.
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.125rem', fontWeight: 300, color: 'var(--gold-dk)', lineHeight: 1.7, marginBottom: '28px',  }}>
                If that work was done — what life would you be living, and who would you be?
              </p>

              {/* Supporting copy */}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 300, color: 'var(--text-meta)', lineHeight: 1.8, marginBottom: '12px' }}>
                For the purpose of this tool, those are called your{' '}
                <em style={{ color: 'var(--text)' }}>Horizon Life</span>{' '}
                and your{' '}
                <em style={{ color: 'var(--text)' }}>Horizon Self</span>.
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 300, color: 'var(--text-meta)', lineHeight: 1.8, marginBottom: '28px' }}>
                The process maps where you are and where you want to be across seven domains:{' '}
                <span style={{ color: 'var(--text)',  }}>Path, Spark, Body, Finances, Relationships, Inner Game,</span>{' '}
                and <span style={{ color: 'var(--text)',  }}>Outer Game.</span>{' '}
                You might think you only want to work on one specific area — but they’re all interconnected, and often the stress you feel in one is a symptom of a lag in another. Map the whole system and we’ll go from there.
              </p>

              {/* Three steps */}
              <div style={{ borderTop: '1px solid rgba(200,146,42,0.35)', paddingTop: '24px' }}>
                <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.22em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '20px' }}>
                  Three steps per domain
                </div>
                {[
                  { n: '1', label: '10/10', desc: 'Build a character representing your ideal in that area. Someone outside yourself — real, fictional, a composite. This calibrates the scale to you specifically.' },
                  { n: '2', label: 'Where are you now?', desc: 'Using the scale, establish where you honestly are in each domain right now.' },
                  { n: '3', label: 'Horizon Goal', desc: 'If a genie tapped you on the head and granted your wish in this area — what would it be?' },
                ].map(s => (
                  <div key={s.n} style={{ display: 'flex', gap: '18px', marginBottom: '20px', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--font-sc)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--gold-dk)', flexShrink: 0, lineHeight: 1.2, minWidth: '22px' }}>{s.n}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-sc)', fontSize: '1rem', letterSpacing: '0.08em', color: 'var(--text)', marginBottom: '5px' }}>{s.label}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 300, color: 'rgba(15,21,35,0.88)', lineHeight: 1.72 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pace note */}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, paddingTop: '16px', borderTop: '1px solid rgba(200,146,42,0.1)' }}>
                Some people take five minutes per domain. Others take a full day or more. Work at your pace — your progress will be saved as you go.
              </p>
            </div>

            <button
              onClick={() => setPhase('scoring')}
              style={{
                fontFamily: 'var(--font-sc)', fontSize: '1rem', letterSpacing: '0.16em',
                color: 'var(--gold-dk)', background: 'rgba(200,146,42,0.05)',
                border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px',
                padding: '16px 32px', cursor: 'pointer', display: 'block', width: '100%',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.05)'; e.currentTarget.style.transform = '' }}
            >
              Ready to begin →
            </button>
          </div>
        )}


        {/* Scoring phase */}
        {phase === 'scoring' && (
          <>
            {/* Live wheel */}
            {Object.keys(currentScores).length > 0 && (
              <LiveDomainPanel currentScores={currentScores} horizonScores={horizonScores} />
            )}

            {/* Completed domains */}
            {DOMAINS.slice(0, currentDomain).map((d, i) => (
              <div key={d.id} style={{
                padding: '12px 16px',
                border: '1px solid rgba(200,146,42,0.35)',
                borderRadius: '8px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                opacity: 0.6,
              }}>
                <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.1em', color: 'var(--gold-dk)', textTransform: 'uppercase', minWidth: '80px' }}>{d.label}</span>
                <span style={{ fontFamily: 'var(--font-sc)', fontSize: '1rem', fontWeight: 600, color: getScoreColor(domainData[d.id]?.currentScore) }}>
                  {domainData[d.id]?.currentScore}
                </span>
                {domainData[d.id]?.horizonScore && (
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'rgba(200,146,42,0.6)' }}>
                    {'→'} {domainData[d.id].horizonScore}
                  </span>
                )}
                <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.06em', color: 'rgba(15,21,35,0.88)', marginLeft: 'auto' }}>
                  {'✓'} done
                </span>
              </div>
            ))}

            {/* Current domain */}
            <DomainStep
              key={currentDomain}
              domain={DOMAINS[currentDomain]}
              domainIndex={currentDomain}
              totalDomains={DOMAINS.length}
              onComplete={handleDomainComplete}
              existingData={domainData[DOMAINS[currentDomain]?.id]}
            />
          </>
        )}

        {/* Synthesis */}
        {phase === 'synthesis' && (
          <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <LiveDomainPanel currentScores={currentScores} horizonScores={horizonScores} />
            <div className="bubble bubble-assistant">
              {thinking ? (
                <div className="typing-indicator"><span /><span /><span /></div>
              ) : synthesis}
            </div>
          </div>
        )}

        {/* Results */}
        {phase === 'results' && mapData && (
          <>
            <LiveDomainPanel currentScores={currentScores} horizonScores={horizonScores} />
            <ResultsCard
              mapData={mapData}
              domainData={domainData}
              currentScores={currentScores}
              horizonScores={horizonScores}
              isSignedIn={!!user}
              onSignIn={() => {}}
            />
          </>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
