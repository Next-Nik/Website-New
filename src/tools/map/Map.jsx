import { useState, useRef, useEffect, useCallback } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { ScalePanel } from '../../components/ScalePanel'

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAINS = [
  { id: 'path',          label: 'Path',          question: 'Am I walking my path \u2014 or just walking?',                  fractal: 'Vision' },
  { id: 'spark',         label: 'Spark',         question: 'Is the fire on?',                                               fractal: 'Human Being' },
  { id: 'body',          label: 'Body',          question: 'How is this living system doing?',                              fractal: 'Nature' },
  { id: 'finances',      label: 'Finances',      question: 'Do I have the agency to act on what matters?',                 fractal: 'Finance & Economy' },
  { id: 'relationships', label: 'Relationships', question: 'Am I truly known by anyone?',                                  fractal: 'Society' },
  { id: 'inner_game',    label: 'Inner Game',    question: 'Are my stories tending me, or running me?',                    fractal: 'Legacy' },
  { id: 'outer_game',    label: 'Outer Game',    question: 'Is what I\u2019m broadcasting aligned with who I actually am?', fractal: 'Society' },
]

const SCALE_POINTS = [10,9.5,9,8.5,8,7.5,7,6.5,6,5.5,5,4.5,4,3.5,3,2.5,2,1.5,1,0.5,0]

const TIER_MAP = {
  10:'World-Class', 9.5:'Exemplar+', 9:'Exemplar', 8.5:'Fluent+', 8:'Fluent',
  7.5:'Capable+', 7:'Capable', 6.5:'Functional+', 6:'Functional', 5.5:'Plateau+',
  5:'Threshold', 4.5:'Friction+', 4:'Friction', 3.5:'Strain+', 3:'Strain',
  2.5:'Crisis+', 2:'Crisis', 1.5:'Emergency+', 1:'Emergency', 0.5:'Emergency\u2212', 0:'Ground Zero'
}

const LABEL_MAP = {
  10:'Best in the world', 9.5:'Elite professional', 9:'Professional',
  8.5:'Elite ranked amateur', 8:'High level ranked amateur',
  7.5:'Elite recreational player', 7:'High level recreational player',
  6.5:'Elite casual athlete', 6:'Casual athlete', 5.5:'Making an effort (occasionally)',
  5:'\u2014 The Line \u2014', 4.5:'Teetering on the edge', 4:'Attempting to get off the couch',
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

// ─── Heptagon wheel ───────────────────────────────────────────────────────────

const N      = 7
const CX     = 240
const CY     = 240
const RADIUS = 150
const NODE_R = 42
const SPIN_DPS = 60
const SPIN_MS  = 2000

function getNodePos(index, rotDeg = 0) {
  const ang = (index * (360 / N) - 90 + rotDeg) * Math.PI / 180
  return { x: CX + RADIUS * Math.cos(ang), y: CY + RADIUS * Math.sin(ang) }
}

function getRotationToTop(index, currentRot) {
  const raw  = -(index * (360 / N))
  const diff = ((raw - (currentRot % 360)) + 540) % 360 - 180
  return currentRot + diff
}

function MapWheel({ domainData, activeIndex, onSelect, incompleteFirst }) {
  const [phase,      setPhase]      = useState('spinning')
  const [displayRot, setDisplayRot] = useState(0)
  const rotRef       = useRef(0)
  const targetRef    = useRef(null)
  const landingRef   = useRef(null)
  const animRef      = useRef(null)
  const lastRef      = useRef(null)
  const spinStart    = useRef(Date.now())

  // Pick landing domain: first incomplete, or random
  useEffect(() => {
    const incomplete = DOMAINS.findIndex(d => !domainData[d.id]?.complete)
    landingRef.current = incomplete >= 0 ? incomplete : Math.floor(Math.random() * N)
  }, [])

  // Navigate to selected domain
  useEffect(() => {
    if ((phase === 'settled' || phase === 'navigating') && activeIndex !== null) {
      targetRef.current = getRotationToTop(activeIndex, rotRef.current)
      setPhase('navigating')
    }
  }, [activeIndex])

  useEffect(() => {
    function animate(time) {
      if (lastRef.current === null) lastRef.current = time
      const dt = Math.min((time - lastRef.current) / 1000, 0.05)
      lastRef.current = time

      if (phase === 'spinning') {
        rotRef.current += SPIN_DPS * dt
        setDisplayRot(rotRef.current)
        if (Date.now() - spinStart.current >= SPIN_MS) {
          targetRef.current = getRotationToTop(landingRef.current, rotRef.current)
          setPhase('landing')
          onSelect(landingRef.current)
        }
      } else if (phase === 'landing' || phase === 'navigating') {
        const diff = targetRef.current - rotRef.current
        if (Math.abs(diff) < 0.2) {
          rotRef.current = targetRef.current
          setDisplayRot(rotRef.current)
          setPhase('settled')
        } else {
          rotRef.current += diff * Math.min(1, dt * (phase === 'navigating' ? 4.5 : 3.5))
          setDisplayRot(rotRef.current)
        }
      }

      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase, onSelect])

  const isSpinning = phase === 'spinning' || phase === 'landing'
  const polygonPoints = DOMAINS.map((_, i) => {
    const p = getNodePos(i, displayRot)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 480 480" style={{ width: '100%', maxWidth: '480px', display: 'block', margin: '0 auto' }}>
      {/* Outer rings */}
      <circle cx={CX} cy={CY} r={RADIUS + 40} fill="none" stroke="rgba(200,146,42,0.05)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={RADIUS + 20} fill="none" stroke="rgba(200,146,42,0.08)" strokeWidth="0.5" />

      {/* Heptagon */}
      <polygon points={polygonPoints} fill="rgba(200,146,42,0.03)" stroke="rgba(200,146,42,0.15)" strokeWidth="1" />

      {/* Spokes */}
      {DOMAINS.map((_, i) => {
        const p = getNodePos(i, displayRot)
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(200,146,42,0.07)" strokeWidth="0.5" />
      })}

      {/* Domain nodes */}
      {DOMAINS.map((domain, i) => {
        const p         = getNodePos(i, displayRot)
        const data      = domainData[domain.id]
        const complete  = !!data?.complete
        const score     = data?.currentScore
        const isActive  = !isSpinning && i === activeIndex
        const scoreCol  = complete && score !== undefined ? getScoreColor(score) : null

        return (
          <g key={domain.id}
            onClick={() => !isSpinning && onSelect(i)}
            style={{ cursor: isSpinning ? 'default' : 'pointer' }}
            role="button" tabIndex={0} aria-label={domain.label}
            onKeyDown={e => e.key === 'Enter' && !isSpinning && onSelect(i)}
          >
            {/* Completion glow ring */}
            {complete && scoreCol && (
              <circle cx={p.x} cy={p.y} r={NODE_R + 6}
                fill={`${scoreCol}18`}
                stroke={`${scoreCol}55`}
                strokeWidth="1.5"
              />
            )}

            {/* Pulse ring for incomplete (not spinning) */}
            {!complete && !isSpinning && (
              <circle cx={p.x} cy={p.y} r={NODE_R + 8} fill="none" stroke="rgba(200,146,42,0.15)" strokeWidth="1">
                <animate attributeName="r" values={`${NODE_R+6};${NODE_R+12};${NODE_R+6}`} dur="3s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.25;0.05;0.25" dur="3s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Active ring */}
            {isActive && (
              <circle cx={p.x} cy={p.y} r={NODE_R + 14}
                fill="rgba(200,146,42,0.06)"
                stroke="rgba(200,146,42,0.22)"
                strokeWidth="1"
              />
            )}

            {/* Main circle */}
            <circle cx={p.x} cy={p.y} r={NODE_R}
              fill={complete ? `${scoreCol}10` : '#FFFFFF'}
              stroke={complete ? scoreCol : isActive ? 'rgba(200,146,42,1)' : 'rgba(200,146,42,0.78)'}
              strokeWidth={isActive || complete ? 1.5 : 1}
            />

            {/* Score shown inside completed nodes */}
            {complete && score !== undefined ? (
              <>
                <text x={p.x} y={p.y - 7} textAnchor="middle" dominantBaseline="middle"
                  fill={scoreCol} fontSize="18" fontFamily="'Cormorant SC', Georgia, serif" fontWeight="600"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {score}
                </text>
                <text x={p.x} y={p.y + 9} textAnchor="middle" dominantBaseline="middle"
                  fill={scoreCol} fontSize="9.5" fontFamily="'Cormorant SC', Georgia, serif" fontWeight="500"
                  letterSpacing="0.06em" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {domain.label.toUpperCase()}
                </text>
              </>
            ) : (
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                fill={isActive ? '#A8721A' : '#0F1523'}
                fontSize="14" fontFamily="'Cormorant SC', Georgia, serif" fontWeight="500"
                letterSpacing="0.04em" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {domain.label.split(' ').map((word, wi, arr) => (
                  <tspan key={wi} x={p.x}
                    dy={wi === 0 ? (arr.length > 1 ? `-${(arr.length - 1) * 0.55}em` : '0.35em') : '1.2em'}>
                    {word}
                  </tspan>
                ))}
              </text>
            )}
          </g>
        )
      })}

      {/* Centre circle */}
      <g style={{ cursor: 'default' }}>
        <circle cx={CX} cy={CY} r={68} fill="none" stroke="rgba(200,146,42,0.18)" strokeWidth="1">
          <animate attributeName="r" values="66;74;66" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.18;0.04;0.18" dur="3.5s" repeatCount="indefinite" />
        </circle>
        <circle cx={CX} cy={CY} r={64} fill="#FFFFFF" stroke="rgba(200,146,42,0.78)" strokeWidth="1.5" />
        <text x={CX} y={CY - 6} textAnchor="middle" dominantBaseline="middle"
          fill="#A8721A" fontSize="13" fontFamily="'Cormorant SC', Georgia, serif" fontWeight="500"
          letterSpacing="0.1em" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          LIFE OS
        </text>
        <text x={CX} y={CY + 9} textAnchor="middle" dominantBaseline="middle"
          fill="#A8721A" fontSize="18" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="300"
          fontStyle="italic" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          The Map
        </text>
        {/* Completion count */}
        {Object.values(domainData).filter(d => d?.complete).length > 0 && (
          <text x={CX} y={CY + 28} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(200,146,42,0.5)" fontSize="9" fontFamily="'Cormorant SC', Georgia, serif"
            style={{ pointerEvents: 'none', userSelect: 'none' }}>
            {Object.values(domainData).filter(d => d?.complete).length} / 7
          </text>
        )}
      </g>
    </svg>
  )
}

// ─── HourglassPicker ──────────────────────────────────────────────────────────

function HourglassPicker({ onScore, horizonMode = false, currentScore }) {
  const [hovered, setHovered] = useState(null)
  const points = horizonMode ? SCALE_POINTS.filter(n => n >= 5) : SCALE_POINTS
  const minW = 36, maxW = 98

  function getWidth(n) {
    const dist = Math.abs(n - 5)
    return Math.round(minW + (maxW - minW) * Math.pow(dist / 5, 1.4))
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '12px', padding: '16px 20px', marginTop: '12px' }}>
      {horizonMode && (
        <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.5625rem', letterSpacing: '0.16em', color: 'rgba(200,146,42,0.6)', textTransform: 'uppercase', marginBottom: '10px' }}>
          Horizon target \u00B7 Development zone only
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
        {points.map(n => {
          const w = getWidth(n)
          const isLine = n === 5
          const col = getScoreColor(n)
          const active = currentScore === n
          const hovd  = hovered === n
          return (
            <div key={n}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onScore(n)}
              style={{
                width: `${w}px`, height: isLine ? '2px' : '22px',
                background: isLine ? 'rgba(200,146,42,0.3)'
                  : active ? col
                  : hovd  ? `${col}33`
                  : 'rgba(200,146,42,0.06)',
                border: isLine ? 'none'
                  : active ? `1.5px solid ${col}`
                  : `1px solid ${col}44`,
                borderRadius: '3px',
                cursor: isLine ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: isLine ? '0' : '0 6px',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {!isLine && (
                <>
                  <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.625rem', color: active ? '#fff' : col, fontWeight: active ? 600 : 400 }}>{n}</span>
                  {(hovd || active) && (
                    <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.5rem', letterSpacing: '0.06em', color: active ? '#fff' : col, opacity: 0.85 }}>{TIER_MAP[n]}</span>
                  )}
                </>
              )}
              {isLine && (
                <span style={{ position: 'absolute', right: '-52px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-sc)', fontSize: '0.4375rem', letterSpacing: '0.12em', color: 'rgba(200,146,42,0.45)', whiteSpace: 'nowrap' }}>
                  The Line
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Domain Panel ─────────────────────────────────────────────────────────────

function DomainPanel({ domain, existingData, onComplete, onSavePartial, isSaving }) {
  const [step,         setStep]         = useState(existingData?.complete ? 'done' : existingData ? 'horizon' : 'avatar')
  const [avatarInput,  setAvatar]       = useState(existingData?.avatar || '')
  const [reflection,   setReflection]   = useState(existingData?.reflection || '')
  const [realityInput, setReality]      = useState(existingData?.currentReality || '')
  const [currentScore, setCurrentScore] = useState(existingData?.currentScore)
  const [evidence,     setEvidence]     = useState(existingData?.evidence || '')
  const [horizonText,  setHorizonText]  = useState(existingData?.horizonText || '')
  const [horizonScore, setHorizonScore] = useState(existingData?.horizonScore)
  const [thinking,     setThinking]     = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    // Reset when domain changes
    setStep(existingData?.complete ? 'done' : existingData ? 'horizon' : 'avatar')
    setAvatar(existingData?.avatar || '')
    setReflection(existingData?.reflection || '')
    setReality(existingData?.currentReality || '')
    setCurrentScore(existingData?.currentScore)
    setEvidence(existingData?.evidence || '')
    setHorizonText(existingData?.horizonText || '')
    setHorizonScore(existingData?.horizonScore)
    setThinking(false)
  }, [domain.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [step])

  const isBelow5 = currentScore !== undefined && currentScore < 5

  function buildData(hs) {
    return {
      domainId:       domain.id,
      avatar:         avatarInput,
      reflection,
      currentReality: realityInput,
      currentScore,
      evidence,
      horizonText,
      horizonScore:   hs ?? horizonScore,
      complete:       true,
    }
  }

  async function handleAvatarReflect() {
    if (!avatarInput.trim()) return
    setThinking(true)
    try {
      const res = await fetch('/tools/map/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'avatar_reflect', domain: domain.id, avatarInput }),
      })
      const data = await res.json()
      setReflection(data.reflection || '')
    } catch {}
    setThinking(false)
    setStep('reality')
  }

  function handleCurrentScore(n) {
    setCurrentScore(n)
    setStep('evidence')
    onSavePartial({ domainId: domain.id, avatar: avatarInput, reflection, currentReality: realityInput, currentScore: n, evidence, horizonText, horizonScore })
  }

  function handleComplete(hs) {
    const finalHs = hs ?? horizonScore
    setHorizonScore(finalHs)
    setStep('done')
    onComplete(buildData(finalHs))
  }

  const sc = { fontFamily: 'var(--font-sc)' }
  const serif = { fontFamily: 'var(--font-body)' }
  const gold = { color: 'var(--gold-dk)' }
  const muted = { color: 'var(--text-muted)' }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '10px', padding: '24px 24px 20px', animation: 'fadeUp 0.3s ease-out' }}>

      {/* Domain header */}
      <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>
        <h2 style={{ ...sc, fontSize: '1.5rem', fontWeight: 400, color: 'var(--text)', marginBottom: '4px' }}>{domain.label}</h2>
        <p style={{ ...serif, fontSize: '1rem', fontStyle: 'italic', ...muted, lineHeight: 1.6 }}>{domain.question}</p>
        {existingData?.complete && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '10px', padding: '4px 12px', borderRadius: '40px', border: '1px solid rgba(200,146,42,0.3)', background: 'rgba(200,146,42,0.05)' }}>
            <span style={{ ...sc, fontSize: '0.5625rem', letterSpacing: '0.14em', ...gold }}>COMPLETE \u2713</span>
            {currentScore !== undefined && <span style={{ ...sc, fontSize: '0.875rem', fontWeight: 600, color: getScoreColor(currentScore) }}>{currentScore}</span>}
          </div>
        )}
      </div>

      {/* STEP 1: Avatar */}
      <div style={{ marginBottom: '20px' }}>
        <span style={{ ...sc, fontSize: '0.5625rem', letterSpacing: '0.16em', ...gold, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Step 1 \u00B7 10/10</span>
        <p style={{ ...serif, fontSize: '0.9375rem', color: 'var(--text-meta)', lineHeight: 1.7, marginBottom: '10px' }}>
          Who is your 10/10 in {domain.label}? Someone outside yourself \u2014 real, imagined, fictional, a mashup.
        </p>
        {step === 'avatar' ? (
          <>
            <textarea value={avatarInput} onChange={e => setAvatar(e.target.value)}
              placeholder="Name people, characters, qualities\u2026"
              rows={3} style={{ width: '100%', padding: '12px 14px', ...serif, fontSize: '1rem', color: 'var(--text-meta)', background: 'rgba(200,146,42,0.02)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', outline: 'none', resize: 'vertical', lineHeight: 1.65, marginBottom: '10px' }} />
            <button onClick={handleAvatarReflect} disabled={!avatarInput.trim() || thinking}
              style={{ ...sc, fontSize: '0.8125rem', letterSpacing: '0.1em', ...gold, background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '10px 24px', cursor: avatarInput.trim() && !thinking ? 'pointer' : 'not-allowed', opacity: avatarInput.trim() && !thinking ? 1 : 0.4 }}>
              {thinking ? 'Reading the pattern\u2026' : 'See what this reveals \u2192'}
            </button>
          </>
        ) : (
          <div style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, padding: '10px 14px', background: 'rgba(200,146,42,0.03)', borderRadius: '6px', borderLeft: '2px solid rgba(200,146,42,0.3)' }}>
            {avatarInput}
            {reflection && <div style={{ marginTop: '10px', padding: '12px 14px', background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', fontStyle: 'normal', color: 'var(--text-meta)', lineHeight: 1.75 }}>{reflection}</div>}
          </div>
        )}
      </div>

      {/* STEP 2: Reality */}
      {step !== 'avatar' && (
        <div style={{ marginBottom: '20px' }}>
          <span style={{ ...sc, fontSize: '0.5625rem', letterSpacing: '0.16em', ...gold, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Step 2 \u00B7 Where are you now?</span>
          <p style={{ ...serif, fontSize: '0.9375rem', color: 'var(--text-meta)', lineHeight: 1.7, marginBottom: '10px' }}>
            What\u2019s actually true right now in {domain.label}?
            <span style={{ display: 'block', fontSize: '0.8125rem', fontStyle: 'italic', ...muted, marginTop: '4px' }}>Voice to text works well here. Don\u2019t edit. Just pour it out.</span>
          </p>
          {step === 'reality' ? (
            <>
              <textarea value={realityInput} onChange={e => setReality(e.target.value)}
                placeholder="What\u2019s true right now? Not aspirational \u2014 actual."
                rows={4} style={{ width: '100%', padding: '12px 14px', ...serif, fontSize: '1rem', color: 'var(--text-meta)', background: 'rgba(200,146,42,0.02)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', outline: 'none', resize: 'vertical', lineHeight: 1.65, marginBottom: '16px' }} />
              <p style={{ ...serif, fontSize: '0.875rem', color: 'var(--text-meta)', lineHeight: 1.65, marginBottom: '8px' }}>
                Now score yourself against your 10/10 \u2014 not against a universal standard.
              </p>
              <HourglassPicker onScore={handleCurrentScore} currentScore={currentScore} />
            </>
          ) : (
            <div>
              {realityInput && <div style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, padding: '10px 14px', background: 'rgba(200,146,42,0.03)', borderRadius: '6px', borderLeft: '2px solid rgba(200,146,42,0.2)', marginBottom: '10px' }}>{realityInput}</div>}
              {currentScore !== undefined && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '40px', border: `1.5px solid ${getScoreColor(currentScore)}44`, background: `${getScoreColor(currentScore)}12` }}>
                  <span style={{ ...sc, fontSize: '1rem', fontWeight: 600, color: getScoreColor(currentScore) }}>{currentScore}</span>
                  <span style={{ ...sc, fontSize: '0.625rem', letterSpacing: '0.08em', color: getScoreColor(currentScore) }}>{TIER_MAP[currentScore]}</span>
                  <span style={{ ...serif, fontSize: '0.75rem', fontStyle: 'italic', ...muted }}>{LABEL_MAP[currentScore]}</span>
                </div>
              )}
              {isBelow5 && (
                <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(138,48,48,0.04)', border: '1px solid rgba(138,48,48,0.18)', borderRadius: '8px', ...serif, fontSize: '0.875rem', fontStyle: 'italic', color: 'rgba(138,48,48,0.75)', lineHeight: 1.65 }}>
                  This domain is below The Line. It\u2019s consuming more than it\u2019s generating. That\u2019s not a verdict \u2014 it\u2019s useful information. Stabilise before optimise.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 2b: Evidence */}
      {step === 'evidence' && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ ...serif, fontSize: '0.9375rem', color: 'var(--text-meta)', lineHeight: 1.7, marginBottom: '10px' }}>
            What\u2019s the evidence for {currentScore}? What are you seeing that made you land there?
          </p>
          <textarea value={evidence} onChange={e => setEvidence(e.target.value)}
            placeholder="The evidence, honest\u2026" rows={3}
            style={{ width: '100%', padding: '12px 14px', ...serif, fontSize: '1rem', color: 'var(--text-meta)', background: 'rgba(200,146,42,0.02)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', outline: 'none', resize: 'vertical', lineHeight: 1.65, marginBottom: '10px' }} />
          <button onClick={() => setStep('horizon')}
            style={{ ...sc, fontSize: '0.8125rem', letterSpacing: '0.1em', ...gold, background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '10px 24px', cursor: 'pointer' }}>
            Continue \u2192
          </button>
        </div>
      )}

      {/* STEP 3: Horizon goal */}
      {(step === 'horizon' || step === 'done') && (
        <div style={{ marginBottom: step === 'done' ? 0 : '20px' }}>
          <span style={{ ...sc, fontSize: '0.5625rem', letterSpacing: '0.16em', ...gold, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Step 3 \u00B7 Horizon goal</span>
          <p style={{ ...serif, fontSize: '0.9375rem', color: 'var(--text-meta)', lineHeight: 1.7, marginBottom: '4px' }}>
            If the genie granted your wish in {domain.label}, what would it be?
          </p>
          <p style={{ ...serif, fontSize: '0.8125rem', fontStyle: 'italic', ...muted, lineHeight: 1.6, marginBottom: '12px' }}>
            Not the avatar \u2014 that\u2019s best in the world. Your life. You don\u2019t have to want 10.
          </p>
          {step === 'horizon' ? (
            <>
              <textarea value={horizonText} onChange={e => setHorizonText(e.target.value)}
                placeholder="What would your life look like if this area were genuinely good?"
                rows={3} style={{ width: '100%', padding: '12px 14px', ...serif, fontSize: '1rem', color: 'var(--text-meta)', background: 'rgba(200,146,42,0.02)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', outline: 'none', resize: 'vertical', lineHeight: 1.65, marginBottom: '14px' }} />
              <p style={{ ...serif, fontSize: '0.875rem', color: 'var(--text-meta)', lineHeight: 1.65, marginBottom: '8px' }}>
                Where on the scale? 5 and above only \u2014 this is the development zone.
              </p>
              <HourglassPicker onScore={n => { setHorizonScore(n); handleComplete(n) }} horizonMode={true} currentScore={horizonScore} />
            </>
          ) : (
            horizonText && (
              <div style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, padding: '10px 14px', background: 'rgba(200,146,42,0.03)', borderRadius: '6px', borderLeft: '2px solid rgba(200,146,42,0.25)', marginBottom: '10px' }}>
                {horizonText}
                {horizonScore !== undefined && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '10px', padding: '6px 14px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.35)', background: 'rgba(200,146,42,0.06)' }}>
                    <span style={{ ...sc, fontSize: '0.875rem', ...gold }}>Horizon: {horizonScore}</span>
                    <span style={{ ...sc, fontSize: '0.5625rem', letterSpacing: '0.08em', ...gold }}>{TIER_MAP[horizonScore]}</span>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Mark complete button — shown when on done step but can re-complete */}
      {step === 'done' && (
        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(200,146,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ ...serif, fontSize: '0.875rem', fontStyle: 'italic', ...muted }}>
            This domain is complete. You can still edit and re-save.
          </span>
          <button onClick={() => onComplete(buildData())} disabled={isSaving}
            style={{ ...sc, fontSize: '0.75rem', letterSpacing: '0.12em', ...gold, background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '10px 20px', cursor: 'pointer', opacity: isSaving ? 0.6 : 1 }}>
            {isSaving ? 'Saving\u2026' : 'Save updates \u2713'}
          </button>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

// ─── Results / Synthesis card ─────────────────────────────────────────────────

function ResultsCard({ currentScores, horizonScores, domainData, onSignIn, isSignedIn }) {
  const completedCount = DOMAINS.filter(d => domainData[d.id]?.complete).length

  return (
    <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '28px 28px 24px', marginTop: '16px' }}>
      <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.5625rem', letterSpacing: '0.2em', color: 'var(--gold-dk)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
        Your Map \u00B7 {completedCount} of 7 domains
      </span>

      {/* Scores summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {DOMAINS.map(d => {
          const s = currentScores[d.id]
          const h = horizonScores[d.id]
          if (s === undefined) return null
          const col = getScoreColor(s)
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.625rem', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.55)', width: '88px', flexShrink: 0 }}>{d.label}</span>
              <div style={{ flex: 1, position: 'relative', height: '4px', background: 'rgba(200,146,42,0.1)', borderRadius: '2px' }}>
                <div style={{ position: 'absolute', left: 0, height: '100%', width: `${(s/10)*100}%`, background: col, borderRadius: '2px', transition: 'width 0.6s ease' }} />
                {h && <div style={{ position: 'absolute', left: `calc(${(h/10)*100}% - 1px)`, top: '-3px', width: '2px', height: '10px', background: 'rgba(200,146,42,0.5)', borderRadius: '1px' }} />}
              </div>
              <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.875rem', fontWeight: 600, color: col, width: '28px', flexShrink: 0 }}>{s}</span>
            </div>
          )
        })}
      </div>

      {!isSignedIn && (
        <button onClick={onSignIn}
          style={{ display: 'block', width: '100%', padding: '13px', fontFamily: 'var(--font-sc)', fontSize: '0.875rem', letterSpacing: '0.14em', color: 'var(--gold-dk)', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', cursor: 'pointer' }}>
          Sign in to save your map \u2192
        </button>
      )}
      {isSignedIn && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-muted)', textAlign: 'center' }}>
          Your map is saved to your profile.
        </p>
      )}
    </div>
  )
}

// ─── Auth modal ───────────────────────────────────────────────────────────────

function AuthModal() {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '36px 32px 28px', maxWidth: '400px', width: '100%' }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-sc)', fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '12px' }}>The Map</span>
        <h2 style={{ fontFamily: 'var(--font-sc)', fontSize: '1.375rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: '10px' }}>Sign in to save your map.</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 300, color: 'var(--text-meta)', lineHeight: 1.7, marginBottom: '24px' }}>
          The Map is free. A free account keeps your scores, notes, and horizon goals so you can return any time.
        </p>
        <a href={`/login?redirect=${returnUrl}`} style={{ display: 'block', padding: '14px', textAlign: 'center', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', fontFamily: 'var(--font-sc)', fontSize: '0.9375rem', letterSpacing: '0.16em', color: 'var(--gold-dk)', textDecoration: 'none', marginBottom: '12px' }}>
          Sign in or create account \u2192
        </a>
        <a href="#continue" onClick={e => e.preventDefault()} style={{ display: 'block', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--text-muted)', textDecoration: 'none' }}>
          Continue without saving
        </a>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MapPage() {
  const { user, loading: authLoading } = useAuth()
  const [activeIndex,   setActiveIndex]   = useState(null)
  const [domainData,    setDomainData]    = useState({})
  const [currentScores, setCurrentScores] = useState({})
  const [horizonScores, setHorizonScores] = useState({})
  const [isSaving,      setIsSaving]      = useState(false)
  const [phase,         setPhase]         = useState('mapping') // 'welcome' | 'mapping' | 'complete'
  const [showAuth,      setShowAuth]      = useState(false)
  const hasLoadedRef = useRef(false)

  // Load existing data from Supabase on mount
  useEffect(() => {
    if (!user || hasLoadedRef.current) return
    hasLoadedRef.current = true
    async function load() {
      try {
        const { data } = await supabase
          .from('map_results')
          .select('session, complete')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data?.session?.domainData) {
          const dd = data.session.domainData
          setDomainData(dd)
          const cs = {}, hs = {}
          Object.entries(dd).forEach(([id, d]) => {
            if (d?.currentScore !== undefined) cs[id] = d.currentScore
            if (d?.horizonScore !== undefined) hs[id] = d.horizonScore
          })
          setCurrentScores(cs)
          setHorizonScores(hs)
          if (data.complete) setPhase('complete')
        }
      } catch {}
    }
    load()
  }, [user])

  const activeDomain = activeIndex !== null ? DOMAINS[activeIndex] : null
  const completedCount = Object.values(domainData).filter(d => d?.complete).length
  const allComplete = completedCount === DOMAINS.length

  // Save a single domain to Supabase
  async function saveDomain(data, markComplete = false) {
    setIsSaving(true)
    const next = { ...domainData, [data.domainId]: data }
    setDomainData(next)
    if (data.currentScore !== undefined) setCurrentScores(prev => ({ ...prev, [data.domainId]: data.currentScore }))
    if (data.horizonScore !== undefined) setHorizonScores(prev => ({ ...prev, [data.domainId]: data.horizonScore }))

    if (user?.id) {
      try {
        const allComplete = Object.values(next).filter(d => d?.complete).length === DOMAINS.length
        await supabase.from('map_results').upsert({
          user_id:      user.id,
          session:      {
            domainData:    next,
            currentScores: { ...currentScores, [data.domainId]: data.currentScore },
            horizonScores: { ...horizonScores, [data.domainId]: data.horizonScore },
          },
          phase:        allComplete ? 'complete' : 'in_progress',
          complete:     allComplete,
          updated_at:   new Date().toISOString(),
        }, { onConflict: 'user_id' })
        if (allComplete) setPhase('complete')
      } catch (e) {
        console.warn('Map save error:', e)
      }
    } else if (!user && markComplete) {
      setShowAuth(true)
    }

    setIsSaving(false)
  }

  function handleDomainComplete(data) {
    saveDomain({ ...data, complete: true }, true)
    // Rotate to next incomplete domain after a beat
    setTimeout(() => {
      const nextIncomplete = DOMAINS.findIndex((d, i) => i !== activeIndex && !domainData[d.id]?.complete && d.id !== data.domainId)
      if (nextIncomplete >= 0) setActiveIndex(nextIncomplete)
    }, 600)
  }

  function handleSavePartial(data) {
    saveDomain({ ...data, complete: false })
  }

  if (authLoading) return <div className="loading" />

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />
      <ScalePanel />
      {showAuth && !user && <AuthModal />}

      <div className="tool-wrap">
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS \u00B7 The Map</span>
          <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(2.25rem,5.5vw,3.25rem)', fontWeight: 300, color: 'var(--text)', lineHeight: 1.06, letterSpacing: '-0.01em', marginBottom: '12px' }}>
            An honest picture<br /><em style={{ color: 'var(--gold-dk)' }}>of where you are.</em>
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 300, fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: '480px' }}>
            Seven domains. Start anywhere. The wheel shows what\u2019s done and what\u2019s missing. Incomplete domains pulse gently to the top.
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.2)', margin: '32px 0' }} />

        {/* Two-column layout: wheel + domain panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,480px) 1fr', gap: '32px', alignItems: 'start' }}>

          {/* LEFT: Wheel */}
          <div>
            <MapWheel
              domainData={domainData}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
            />
            {activeIndex === null && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>
                Select any domain to begin
              </p>
            )}
            {allComplete && (
              <div style={{ marginTop: '16px', padding: '16px 20px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-sc)', fontSize: '0.75rem', letterSpacing: '0.14em', color: 'var(--gold-dk)', marginBottom: '6px' }}>MAP COMPLETE</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>All seven domains mapped. Your profile is updated.</p>
              </div>
            )}
          </div>

          {/* RIGHT: Domain panel or scores */}
          <div>
            {activeDomain ? (
              <DomainPanel
                key={activeDomain.id}
                domain={activeDomain}
                existingData={domainData[activeDomain.id]}
                onComplete={handleDomainComplete}
                onSavePartial={handleSavePartial}
                isSaving={isSaving}
              />
            ) : (
              completedCount > 0 && (
                <ResultsCard
                  currentScores={currentScores}
                  horizonScores={horizonScores}
                  domainData={domainData}
                  onSignIn={() => setShowAuth(true)}
                  isSignedIn={!!user}
                />
              )
            )}
          </div>
        </div>

        {/* Mobile: stack instructions */}
        <style>{`
          @media (max-width: 640px) {
            .map-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
