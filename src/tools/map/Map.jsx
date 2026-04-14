import { useState, useRef, useEffect, useCallback } from 'react'
import { ToolCompassPanel } from '../../components/ToolCompassPanel'
import { Nav } from '../../components/Nav'
import { DomainTooltip } from '../../components/DomainTooltip'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { AccessGate } from '../../components/AccessGate'
import { supabase } from '../../hooks/useSupabase'
import { ScalePanel } from '../../components/ScalePanel'

// ─── Mobile hook ─────────────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 640)
  useEffect(() => {
    function check() { setMobile(window.innerWidth <= 640) }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAINS = [
  { id: 'path',          label: 'Path',          question: 'Am I walking my path — or just walking?',                    fractal: 'Vision' },
  { id: 'spark',         label: 'Spark',         question: "When did I last feel genuinely alive — and what's been costing me that?",           fractal: 'Human Being' },
  { id: 'body',          label: 'Body',          question: "Am I honouring this instrument — or running it into the ground?",                  fractal: 'Nature' },
  { id: 'finances',      label: 'Finances',      question: 'Do I have the agency to act on what matters?',              fractal: 'Finance & Economy' },
  { id: 'connection', label: 'Connection', question: "Am I truly known by anyone — and am I truly knowing them?",                        fractal: 'Society' },
  { id: 'inner_game',    label: 'Inner Game',    question: "What story about myself is quietly running the room — and is that story still true?", fractal: 'Legacy' },
  { id: 'signal',    label: 'Signal',    question: "Is what I'm broadcasting aligned with who I actually am?", fractal: 'Technology' },
]

const N         = DOMAINS.length
const CX        = 240
const CY        = 240
const RADIUS    = 148
const NODE_R    = 40
const SPIN_DPS  = 60
const SPIN_MS   = 2000

import { SCALE_POINTS, TIER_MAP, LABEL_MAP, SIGNATURE_MAP, getScoreColor, HORIZON_NOTE } from '../../constants/horizonScale'

// Domain step stages — drives node visual state
// 0 = not started, 1 = avatar done, 2 = score done, 3 = complete
function getDomainStage(data) {
  if (!data) return 0
  if (data.horizonScore !== undefined && data.horizonText) return 3
  if (data.currentScore !== undefined) return 2
  if (data.avatarFinal) return 1
  return 0
}

// Node fill based on stage — 4 visual states
function getNodeFill(stage) {
  switch (stage) {
    case 3: return 'rgba(200,146,42,0.18)' // complete — lightest
    case 2: return 'rgba(200,146,42,0.10)' // score done
    case 1: return 'rgba(200,146,42,0.05)' // avatar done
    default: return '#FFFFFF'              // not started — base
  }
}

function getNodeStroke(stage, isActive) {
  if (isActive) return 'rgba(200,146,42,1)'
  switch (stage) {
    case 3: return 'rgba(200,146,42,0.9)'
    case 2: return 'rgba(200,146,42,0.65)'
    case 1: return 'rgba(200,146,42,0.45)'
    default: return 'rgba(200,146,42,0.3)'
  }
}

const LS_KEY = 'lifeos_themap_v4'

// ─── Hourglass Picker ─────────────────────────────────────────────────────────

function HourglassPicker({ onScore, horizonMode = false, currentScore }) {
  const [hovered, setHovered] = useState(null)
  const points = horizonMode ? SCALE_POINTS.filter(n => n >= 5) : SCALE_POINTS
  const minW = 36, maxW = 98

  function getWidth(n) {
    const dist = Math.abs(n - 5)
    const pct  = dist / 5
    return Math.round(minW + (maxW - minW) * Math.pow(pct, 1.4))
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '12px', padding: '16px 20px', marginTop: '12px' }}>
      {horizonMode && (
        <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.16em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(200,146,42,0.12)' }}>
          Horizon target · Development zone only
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {points.map(n => {
          const w        = getWidth(n)
          const c        = getScoreColor(n)
          const isHov    = hovered === n
          const isCur    = currentScore === n
          const isLine   = n === 5 && !horizonMode
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', textAlign: 'right', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.04em', color: isLine ? '#A8721A' : isCur ? c : 'rgba(15,21,35,0.72)', fontWeight: (isLine || isCur) ? 600 : 400, flexShrink: 0 }}>{n}</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', height: '26px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, height: isLine ? '1.5px' : '1px', background: isLine ? 'rgba(200,146,42,0.4)' : 'rgba(200,146,42,0.08)' }} />
                <button onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(null)} onClick={() => onScore(n)} style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: `${w}%`, height: isCur ? '20px' : '18px', background: isHov || isCur ? c : horizonMode ? `${c}18` : `${c}14`, border: `1px solid ${isHov || isCur ? c : `${c}30`}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 0.12s ease', outline: isCur ? `2px solid ${c}44` : 'none', outlineOffset: '2px' }} />
              </div>
              <div style={{ width: '130px', flexShrink: 0, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: isLine ? '#A8721A' : isCur ? c : 'rgba(15,21,35,0.72)', fontWeight: isCur ? 600 : 400, letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {LABEL_MAP[n]}
              </div>
            </div>
          )
        })}
      </div>
      {hovered !== null && (
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(200,146,42,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.125rem', fontWeight: 600, color: getScoreColor(hovered) }}>{hovered}</span>
            <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.125rem', letterSpacing: '0.08em', color: getScoreColor(hovered) }}>{TIER_MAP[hovered]}</span>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)' }}>{LABEL_MAP[hovered]}</span>
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.65, margin: 0 }}>
            {SIGNATURE_MAP[hovered]}
          </p>
          {hovered >= 9.5 && (
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '14px', fontStyle: 'italic', color: 'rgba(168,114,26,0.70)', lineHeight: 1.65, marginTop: '6px', marginBottom: 0 }}>
              {HORIZON_NOTE}
            </p>
          )}
        </div>
      )}
      <ToolCompassPanel />
    </div>
  )
}

// ─── MapWheel — spinning heptagon ─────────────────────────────────────────────

function getNodePos(index, rotDeg = 0) {
  const ang = (index * (360 / N) - 90 + rotDeg) * Math.PI / 180
  return { x: CX + RADIUS * Math.cos(ang), y: CY + RADIUS * Math.sin(ang) }
}

function getRotationToTop(index, currentRot) {
  const raw  = -(index * (360 / N))
  const diff = ((raw - (currentRot % 360)) + 540) % 360 - 180
  return currentRot + diff
}

function MapWheel({ domainData, activeIndex, onSelect, totalSteps = 0, onCentreClick, triggerSpin = 0 }) {
  const [phase,      setPhase]      = useState('spinning')
  const [displayRot, setDisplayRot] = useState(0)
  const rotRef      = useRef(0)
  const targetRef   = useRef(null)
  const landingRef  = useRef(null)
  const animRef     = useRef(null)
  const lastRef     = useRef(null)
  const spinStart   = useRef(Date.now())

  // Re-spin when triggerSpin changes
  useEffect(() => {
    if (triggerSpin === 0) return
    const incomplete = DOMAINS.findIndex(d => getDomainStage(domainData[d.id]) < 3)
    landingRef.current = incomplete >= 0 ? incomplete : Math.floor(Math.random() * N)
    spinStart.current = Date.now()
    lastRef.current = null
    setPhase('spinning')
  }, [triggerSpin]) // eslint-disable-line

  // Pick landing domain: first incomplete, or random
  useEffect(() => {
    const incomplete = DOMAINS.findIndex(d => getDomainStage(domainData[d.id]) < 3)
    landingRef.current = incomplete >= 0 ? incomplete : Math.floor(Math.random() * N)
  }, []) // eslint-disable-line

  // Navigate to selected domain
  useEffect(() => {
    if ((phase === 'settled' || phase === 'navigating') && activeIndex !== null) {
      targetRef.current = getRotationToTop(activeIndex, rotRef.current)
      setPhase('navigating')
    }
  }, [activeIndex]) // eslint-disable-line

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

  const isSpinning   = phase === 'spinning' || phase === 'landing'
  const polygonPoints = DOMAINS.map((_, i) => {
    const p = getNodePos(i, displayRot)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 480 480" style={{ width: '100%', maxWidth: '460px', display: 'block', margin: '0 auto' }}>
      {/* Outer rings */}
      <circle cx={CX} cy={CY} r={RADIUS + 42} fill="none" stroke="rgba(200,146,42,0.05)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={RADIUS + 22} fill="none" stroke="rgba(200,146,42,0.07)" strokeWidth="0.5" />

      {/* Heptagon */}
      <polygon points={polygonPoints} fill="rgba(200,146,42,0.02)" stroke="rgba(200,146,42,0.12)" strokeWidth="1" />

      {/* Spokes */}
      {DOMAINS.map((_, i) => {
        const p = getNodePos(i, displayRot)
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(200,146,42,0.06)" strokeWidth="0.5" />
      })}

      {/* Domain nodes */}
      {DOMAINS.map((domain, i) => {
        const p       = getNodePos(i, displayRot)
        const data    = domainData[domain.id]
        const stage   = getDomainStage(data)
        const isActive = !isSpinning && i === activeIndex
        const score   = data?.currentScore

        return (
          <g key={domain.id}
            onClick={() => !isSpinning && onSelect(i)}
            style={{ cursor: isSpinning ? 'default' : 'pointer', outline: 'none' }}
            role="button" tabIndex={0} aria-label={domain.label}
            onKeyDown={e => e.key === 'Enter' && !isSpinning && onSelect(i)}
          >
            {/* Stage completion glow */}
            {stage === 3 && (
              <circle cx={p.x} cy={p.y} r={NODE_R + 6}
                fill="rgba(200,146,42,0.08)"
                stroke="rgba(200,146,42,0.4)"
                strokeWidth="1.5"
              />
            )}

            {/* Pulse ring for incomplete — not spinning */}
            {stage < 3 && !isSpinning && (
              <circle cx={p.x} cy={p.y} r={NODE_R + 8} fill="none" stroke="rgba(200,146,42,0.12)" strokeWidth="1">
                <animate attributeName="r" values={`${NODE_R+6};${NODE_R+13};${NODE_R+6}`} dur="3s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.22;0.04;0.22" dur="3s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Active ring */}
            {isActive && (
              <circle cx={p.x} cy={p.y} r={NODE_R + 15}
                fill="rgba(200,146,42,0.05)"
                stroke="rgba(200,146,42,0.2)"
                strokeWidth="1"
              />
            )}

            {/* Main circle */}
            <circle cx={p.x} cy={p.y} r={NODE_R}
              fill={getNodeFill(stage)}
              stroke={getNodeStroke(stage, isActive)}
              strokeWidth={isActive ? 2 : stage > 0 ? 1.5 : 1}
            />

            {/* Content inside node */}
            {stage === 3 && score !== undefined ? (
              <>
                <text x={p.x} y={p.y - 7} textAnchor="middle" dominantBaseline="middle"
                  fill={getScoreColor(score)} fontSize="21" fontFamily="'Cormorant SC', Georgia, serif" fontWeight="600"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {score}
                </text>
                {/* Pill + label centred in circle */}
                <rect x={p.x - 34} y={p.y + 6} width="68" height="16" rx="8"
                  fill="#FFFFFF" fillOpacity="0.96"
                  style={{ pointerEvents: 'none' }} />
                <text x={p.x} y={p.y + 15} textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(200,146,42,0.8)" fontSize="19" fontFamily="'Cormorant SC', Georgia, serif" letterSpacing="0.06em"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {domain.label.toUpperCase()}
                </text>
              </>
            ) : (
              <>
                {stage > 0 && (
                  <text x={p.x} y={p.y - 6} textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(200,146,42,0.5)" fontSize="19" fontFamily="'Cormorant SC', Georgia, serif"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {stage === 1 ? '◎' : stage === 2 ? '◑' : ''}
                  </text>
                )}
                {/* Pill + label centred in circle */}
                <rect x={p.x - 40} y={p.y - 8} width="80" height="16" rx="8"
                  fill="#FFFFFF" fillOpacity="0.96"
                  style={{ pointerEvents: 'none' }} />
                <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle"
                  fill={isActive ? '#A8721A' : stage > 0 ? 'rgba(200,146,42,0.7)' : 'rgba(15,21,35,0.72)'}
                  fontSize="19" fontFamily="'Cormorant SC', Georgia, serif" letterSpacing="0.04em"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {domain.label.toUpperCase()}
                </text>
              </>
            )}

            {/* Completion count in centre (settled, all done) */}
          </g>
        )
      })}

      {/* Centre — The Sun — solid gold, glow grows with steps completed */}
      {(() => {
        const maxSteps = 21 // 7 domains × 3 steps
        const progress = totalSteps / maxSteps // 0 → 1
        const sunR = 54 // Sun is the largest element — domain nodes are NODE_R = 40
        const glowR = sunR + 8 + progress * 28 // glow expands outward as steps complete
        const glowOpacity = 0.08 + progress * 0.35
        const outerGlowR = glowR + 12 + progress * 20
        const outerGlowOpacity = progress * 0.15

        return (
          <g onClick={onCentreClick} style={{ cursor: 'pointer', outline: 'none' }} role="button" tabIndex={0}
            aria-label="Open domain status"
            onKeyDown={e => e.key === 'Enter' && onCentreClick?.()}>

            {/* Outer glow — grows with progress */}
            {progress > 0 && (
              <circle cx={CX} cy={CY} r={outerGlowR}
                fill={`rgba(200,146,42,${outerGlowOpacity.toFixed(3)})`}
                style={{ transition: 'all 1.2s ease' }}
              />
            )}

            {/* Inner glow ring */}
            <circle cx={CX} cy={CY} r={glowR}
              fill={`rgba(200,146,42,${glowOpacity.toFixed(3)})`}
              style={{ transition: 'all 0.8s ease' }}
            />

            {/* Sun body — solid gold from start */}
            <circle cx={CX} cy={CY} r={sunR}
              fill="#C8922A"
              stroke="#fcb823"
strokeWidth="0.5"
            />

            {/* Label */}
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
              fill="#FAFAF7"
              fontSize="18" stroke="#FFFFFF" strokeWidth="0.4" fontFamily="'Cormorant SC', Georgia, serif" letterSpacing="0.14em"
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              YOUR LIFE
            </text>
          </g>
        )
      })()}
    </svg>
  )
}

// ─── Domain Thread Panel (left-edge slider) ───────────────────────────────────

export function DomainThreadPanel({ domainData, activeIndex, onSelect, forceOpen = false }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (forceOpen) setOpen(true)
  }, [forceOpen])

  const STAGE_LABELS = ['Not started', 'Avatar done', 'Score done', 'Complete']
  const STAGE_ICONS  = ['○', '◎', '◑', '●']

  return (
    <>
      {/* Wrapper — panel + tab slide together */}
      <div style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 999,
        width: '304px', // 260px panel + 44px tab
        transform: open ? 'translateX(0)' : 'translateX(-260px)',
        transition: 'transform 0.28s ease',
      }}>
        {/* Panel */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: '260px',
          background: '#FAFAF7',
          borderRight: '1.5px solid rgba(200,146,42,0.78)',
          overflowY: 'auto',
          boxShadow: open ? '4px 0 24px rgba(15,21,35,0.1)' : 'none',
          paddingTop: '72px',
        }}>
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.2em', color: '#A8721A', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(200,146,42,0.15)' }}>
              DOMAIN STATUS
            </div>

            {DOMAINS.map((domain, i) => {
              const data    = domainData[domain.id]
              const stage   = getDomainStage(data)
              const isActive = i === activeIndex
              const score   = data?.currentScore
              const horizon = data?.horizonScore

              return (
                <button key={domain.id} onClick={() => { onSelect(i); setOpen(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '12px 14px', marginBottom: '6px',
                    borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: isActive ? 'rgba(200,146,42,0.08)' : 'transparent',
                    borderLeft: isActive ? '2px solid rgba(200,146,42,0.78)' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(200,146,42,0.04)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', color: stage === 3 ? 'rgba(200,146,42,0.9)' : stage > 0 ? 'rgba(200,146,42,0.6)' : 'rgba(15,21,35,0.72)' }}>
                      {STAGE_ICONS[stage]}
                    </span>
                    <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.08em', color: isActive ? '#A8721A' : 'rgba(15,21,35,0.72)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      {domain.label}
                      <DomainTooltip domainKey={domain.id} system="lifeos" position="below" />
                    </span>
                    {score !== undefined && (
                      <span style={{ marginLeft: 'auto', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', fontWeight: 600, color: getScoreColor(score) }}>
                        {score}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)' }}>
                      {STAGE_LABELS[stage]}
                    </span>
                    {horizon !== undefined && (
                      <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', color: '#A8721A' }}>
                        → {horizon}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}

            {/* Legend */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(200,146,42,0.12)' }}>
              {[
                { icon: '○', label: 'Not started' },
                { icon: '◎', label: 'Avatar done' },
                { icon: '◑', label: 'Score done' },
                { icon: '●', label: 'Complete' },
              ].map(item => (
                <div key={item.icon} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', color: 'rgba(200,146,42,0.55)', width: '14px' }}>{item.icon}</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab — sits at right edge of wrapper, travels with it */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            position: 'absolute',
            left: '260px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#FAFAF7',
            border: '1.5px solid rgba(200,146,42,0.78)',
            borderLeft: 'none',
            width: '44px',
            height: '120px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: 0,
            clipPath: 'polygon(0% 12%, 0% 88%, 30% 100%, 100% 100%, 100% 0%, 30% 0%)',
            borderRadius: '0 12px 12px 0',
          }}
        >
          <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
            DOMAINS
          </span>
          <span style={{ color: '#A8721A', fontSize: '15px', marginTop: '4px' }}>
            {open ? '‹' : '›'}
          </span>
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 198, background: 'rgba(15,21,35,0.18)' }} />
      )}
    </>
  )
}

// ─── Avatar edit prompt modal ─────────────────────────────────────────────────

function AvatarEditPrompt({ onSaveAndReview, onJustSave, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '32px 28px', maxWidth: '400px', width: '100%' }}>
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '24px' }}>
          You're updating your avatar. If your new construct changes the scale significantly, your current score and horizon goal might be worth revisiting. Want to flag those for review, or just save?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={onSaveAndReview} style={btnStyle}>Save and review those steps →</button>
          <button onClick={onJustSave} style={{ ...btnStyle, background: 'transparent', border: '1px solid rgba(200,146,42,0.3)', color: 'rgba(15,21,35,0.72)' }}>Just save</button>
          <button onClick={onCancel} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

const btnStyle = {
  fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.3125rem', letterSpacing: '0.12em',
  color: '#A8721A', background: 'rgba(200,146,42,0.05)',
  border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px',
  padding: '12px 20px', cursor: 'pointer',
}

// ─── Domain Step — full 3-step conversation flow ──────────────────────────────

function DomainStep({ domain, existingData, onComplete, onUpdate }) {
  // Step within this domain: 'avatar' | 'score' | 'horizon' | 'done'
  const initStep = () => {
    if (!existingData) return 'avatar'
    const stage = getDomainStage(existingData)
    if (stage === 3) return 'done'
    if (stage === 2) return 'horizon'
    if (stage === 1) return 'score'
    return 'avatar'
  }

  const [step,           setStep]           = useState(initStep)
  const [avatarDraft,    setAvatarDraft]    = useState(existingData?.avatarDraft || '')
  const [avatarFinal,    setAvatarFinal]    = useState(existingData?.avatarFinal || '')
  const [avatarMessages, setAvatarMessages] = useState(existingData?.avatarMessages || [])
  const [avatarLocked,   setAvatarLocked]   = useState(!!existingData?.avatarFinal)
  const [avatarDoc,      setAvatarDoc]      = useState(existingData?.avatarDoc || { essence: '', references: '', other: '' })
  const [showAvatarEdit, setShowAvatarEdit] = useState(false)
  const [editingAvatar,  setEditingAvatar]  = useState(false)

  const [currentScore,   setCurrentScore]   = useState(existingData?.currentScore)
  const [realityDraft,   setRealityDraft]   = useState(existingData?.realityDraft || '')
  const [realityFinal,   setRealityFinal]   = useState(existingData?.realityFinal || '')
  const [scoreMsgs,      setScoreMsgs]      = useState(existingData?.scoreMsgs || [])
  const [scoreLocked,    setScoreLocked]    = useState(existingData?.currentScore !== undefined)

  const [horizonScore,   setHorizonScore]   = useState(existingData?.horizonScore)
  const [horizonText,    setHorizonText]    = useState(existingData?.horizonText || '')
  const [horizonMsgs,    setHorizonMsgs]    = useState(existingData?.horizonMsgs || [])
  const [horizonLocked,  setHorizonLocked]  = useState(!!existingData?.horizonText)

  const [flagReview,     setFlagReview]     = useState(existingData?.flagReview || false)
  const [thinking,       setThinking]       = useState(false)
  const [avatarInput,    setAvatarInput]    = useState('')
  const [scoreInput,     setScoreInput]     = useState('')
  const [horizonInput,   setHorizonInput]   = useState('')

  const bottomRef = useRef(null)

  function buildData(overrides = {}) {
    return {
      domainId: domain.id,
      avatarDraft, avatarFinal, avatarMessages, avatarLocked, avatarDoc,
      currentScore, realityDraft, realityFinal, scoreMsgs, scoreLocked,
      horizonScore, horizonText, horizonMsgs, horizonLocked,
      flagReview,
      ...overrides,
    }
  }

  function save(overrides = {}) {
    const data = buildData(overrides)
    onUpdate(data)
    const stage = getDomainStage(data)
    if (stage === 3) onComplete(data)
  }

  // ── Avatar step ─────────────────────────────────────────────

  async function sendAvatarMessage(text) {
    if (!text.trim() || thinking) return
    const userMsg = { role: 'user', content: text }
    const next = [...avatarMessages, userMsg]
    setAvatarMessages(next)
    setAvatarInput('')
    setThinking(true)
    try {
      const res = await fetch('/api/map-avatar-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.id, messages: next, avatarDraft }),
      })
      const data = await res.json()
      const aiMsg = { role: 'assistant', content: data.message, canLock: data.canLock }
      const updated = [...next, aiMsg]
      setAvatarMessages(updated)
      if (data.cleanedDraft) setAvatarDraft(data.cleanedDraft)
      setThinking(false)
    } catch {
      const errMsg = { role: 'assistant', content: 'Something went wrong. Try again.' }
      setAvatarMessages([...next, errMsg])
      setThinking(false)
    }
  }

  function lockAvatar() {
    const final = avatarDraft || avatarMessages.find(m => m.role === 'user')?.content || ''
    setAvatarFinal(final)
    setAvatarLocked(true)
    setStep('score')
    save({ avatarFinal: final, avatarLocked: true })
  }

  function startEditAvatar() {
    if (step === 'done') {
      setShowAvatarEdit(true)
    } else {
      setAvatarLocked(false)
      setEditingAvatar(true)
      setStep('avatar')
    }
  }

  function handleAvatarEditChoice(saveAndReview) {
    setShowAvatarEdit(false)
    setAvatarLocked(false)
    setEditingAvatar(true)
    setStep('avatar')
    if (saveAndReview) setFlagReview(true)
  }

  // ── Score step ──────────────────────────────────────────────

  async function sendScoreMessage(text, score) {
    const content = score !== undefined
      ? `[Score: ${score}] ${text}`.trim()
      : text
    if (!content.trim() || thinking) return
    const userMsg = { role: 'user', content }
    const next    = [...scoreMsgs, userMsg]
    setScoreMsgs(next)
    setScoreInput('')
    setThinking(true)
    try {
      const res = await fetch('/api/map-scoring-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'score',
          domain: domain.id,
          avatarFinal,
          messages: next,
          currentScore: score ?? currentScore,
          realityDraft,
        }),
      })
      const data = await res.json()
      const aiMsg = { role: 'assistant', content: data.message, canLock: data.canLock, suggestedScore: data.suggestedScore }
      const updated = [...next, aiMsg]
      setScoreMsgs(updated)
      if (data.cleanedReality) setRealityFinal(data.cleanedReality)
      setThinking(false)
    } catch {
      setScoreMsgs([...next, { role: 'assistant', content: 'Something went wrong. Try again.' }])
      setThinking(false)
    }
  }

  function handleScoreSelect(n) {
    setCurrentScore(n)
    if (realityDraft.trim()) {
      sendScoreMessage(realityDraft, n)
    }
  }

  function lockScore() {
    setScoreLocked(true)
    setStep('horizon')
    save({ scoreLocked: true, currentScore, realityFinal: realityFinal || realityDraft })
  }

  // ── Horizon step ────────────────────────────────────────────

  async function sendHorizonMessage(text, score) {
    const content = score !== undefined
      ? `[Horizon: ${score}] ${text}`.trim()
      : text
    if (!content.trim() || thinking) return
    const userMsg = { role: 'user', content }
    const next    = [...horizonMsgs, userMsg]
    setHorizonMsgs(next)
    setHorizonInput('')
    setThinking(true)
    try {
      const res = await fetch('/api/map-scoring-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'horizon',
          domain: domain.id,
          avatarFinal,
          currentScore,
          messages: next,
          horizonScore: score ?? horizonScore,
          horizonText,
        }),
      })
      const data = await res.json()
      const aiMsg = { role: 'assistant', content: data.message, canLock: data.canLock }
      const updated = [...next, aiMsg]
      setHorizonMsgs(updated)
      setThinking(false)
    } catch {
      setHorizonMsgs([...next, { role: 'assistant', content: 'Something went wrong. Try again.' }])
      setThinking(false)
    }
  }

  function handleHorizonScoreSelect(n) {
    setHorizonScore(n)
    if (horizonText.trim()) sendHorizonMessage(horizonText, n)
  }

  function lockHorizon() {
    setHorizonLocked(true)
    save({ horizonLocked: true, horizonScore, horizonText })
    setStep('done')
  }

  // ── Chat message renderer ────────────────────────────────────

  function ChatBubble({ msg }) {
    const isUser = msg.role === 'user'
    return (
      <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
        <div style={{
          maxWidth: '88%',
          padding: '12px 16px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isUser ? 'rgba(200,146,42,0.07)' : '#FFFFFF',
          border: isUser ? '1px solid rgba(200,146,42,0.22)' : '1px solid rgba(200,146,42,0.15)',
          fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontWeight: 300,
          color: isUser ? 'rgba(15,21,35,0.72)' : 'rgba(15,21,35,0.78)',
          lineHeight: 1.72,
          fontStyle: isUser ? 'italic' : 'normal',
        }}>
          {msg.content}
        </div>
      </div>
    )
  }

  function ThinkingBubble() {
    return (
      <div style={{ display: 'flex', marginBottom: '10px' }}>
        <div style={{ padding: '14px 18px', borderRadius: '14px 14px 14px 4px', background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.15)' }}>
          <div className="typing-indicator"><span /><span /><span /></div>
        </div>
      </div>
    )
  }

  function ChatInput({ value, onChange, onSend, placeholder, disabled }) {
    return (
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(value) } }}
          placeholder={placeholder}
          rows={2}
          disabled={disabled}
          style={{ flex: 1, padding: '10px 14px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.78)', background: 'rgba(200,146,42,0.02)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '10px', outline: 'none', resize: 'none', lineHeight: 1.55 }}
        />
        <button onClick={() => onSend(value)} disabled={!value.trim() || disabled} style={{ ...btnStyle, padding: '10px 16px', alignSelf: 'flex-end', opacity: !value.trim() || disabled ? 0.4 : 1, fontSize: '1.125rem', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Update draft</button>
      </div>
    )
  }

  // ── Lock button ─────────────────────────────────────────────

  function LockBtn({ onClick, label }) {
    return (
      <button onClick={onClick} style={{ ...btnStyle, display: 'block', width: '100%', textAlign: 'center', marginTop: '16px' }}>
        {label}
      </button>
    )
  }

  // ── Render ──────────────────────────────────────────────────

  const stage = getDomainStage(buildData())

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '12px', padding: '24px 24px 20px', animation: 'fadeUp 0.3s ease-out' }}>

      {showAvatarEdit && (
        <AvatarEditPrompt
          onSaveAndReview={() => handleAvatarEditChoice(true)}
          onJustSave={() => handleAvatarEditChoice(false)}
          onCancel={() => setShowAvatarEdit(false)}
        />
      )}

      {/* Domain header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {domain.label}
            <DomainTooltip domainKey={domain.id} system="lifeos" position="below" />
          </span>
          {stage === 3 && (
            <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A' }}>● Complete</span>
          )}
        </div>
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
          {domain.question}
        </p>
        {flagReview && step !== 'done' && (
          <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(200,146,42,0.06)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', fontStyle: 'italic', color: '#A8721A' }}>
            Your avatar changed — worth reviewing your score and horizon goal when you're ready.
          </div>
        )}
      </div>

      {/* Step tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid rgba(200,146,42,0.12)' }}>
        {['avatar', 'score', 'horizon'].map((s, i) => {
          const labels   = ['1 · Avatar', '2 · Where are you', '3 · Horizon']
          const reachable = i === 0 || (i === 1 && getDomainStage(buildData()) >= 1) || (i === 2 && getDomainStage(buildData()) >= 2)
          const active   = step === s || (step === 'done' && s === 'horizon')
          return (
            <button key={s} onClick={() => reachable && setStep(s)}
              style={{
                fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.12em',
                padding: '8px 14px', background: 'none', border: 'none',
                borderBottom: active ? '2px solid #A8721A' : '2px solid transparent',
                marginBottom: '-1px', cursor: reachable ? 'pointer' : 'default',
                color: active ? '#A8721A' : reachable ? 'rgba(15,21,35,0.72)' : 'rgba(15,21,35,0.72)',
              }}>
              {labels[i]}
            </button>
          )
        })}
      </div>

      {/* ── STEP 1: AVATAR ── */}
      {(step === 'avatar') && (
        <div>
          {!avatarLocked || editingAvatar ? (
            <>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '20px' }}>
                Create a construct of "Best in the World" for you in {domain.label}. Think of it like you're creating a character for a movie or a video game. Feel free to reference real people, fictional characters, or make elements up from scratch.
              </p>

              {/* Doc-style input — before first AI exchange */}
              {avatarMessages.length === 0 && (
                <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 1px 8px rgba(15,21,35,0.04)' }}>
                  {/* Doc header bar */}
                  <div style={{ background: 'rgba(200,146,42,0.04)', borderBottom: '1px solid rgba(200,146,42,0.12)', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.16em', color: '#A8721A' }}>AVATAR DRAFT</span>
                    <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)', fontStyle: 'italic' }}>{'\u00b7'} {domain.label}</span>
                  </div>

                  {/* Section 1 */}
                  <div style={{ padding: '16px 18px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
                    <label style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.72)', display: 'block', marginBottom: '6px' }}>
                      BEST IN THE WORLD IN THE AREA OF {domain.label.toUpperCase()} LOOKS LIKE...
                    </label>
                    <textarea
                      value={avatarDoc?.essence || ''}
                      onChange={e => setAvatarDoc(d => ({ ...d, essence: e.target.value }))}
                      onBlur={e => { const next = { ...avatarDoc, essence: e.target.value }; setAvatarDoc(next); save({ avatarDoc: next }) }}
                      placeholder="Describe the qualities, the presence, the way this person operates..."
                      rows={3}
                      style={{ width: '100%', padding: '4px 0 12px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: '#0F1523', background: 'transparent', border: 'none', outline: 'none', resize: 'none', lineHeight: 1.7 }}
                    />
                  </div>

                  {/* Section 2 */}
                  <div style={{ padding: '16px 18px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
                    <label style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.72)', display: 'block', marginBottom: '6px' }}>
                      PEOPLE AND CHARACTERS FOR REFERENCE
                    </label>
                    <textarea
                      value={avatarDoc?.references || ''}
                      onChange={e => setAvatarDoc(d => ({ ...d, references: e.target.value }))}
                      onBlur={e => { const next = { ...avatarDoc, references: e.target.value }; setAvatarDoc(next); save({ avatarDoc: next }) }}
                      placeholder="Real people, fictional characters, composites... name them and what you're borrowing from each"
                      rows={3}
                      style={{ width: '100%', padding: '4px 0 12px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: '#0F1523', background: 'transparent', border: 'none', outline: 'none', resize: 'none', lineHeight: 1.7 }}
                    />
                  </div>

                  {/* Section 3 */}
                  <div style={{ padding: '16px 18px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
                    <label style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.72)', display: 'block', marginBottom: '6px' }}>
                      OTHER CHARACTERISTICS
                    </label>
                    <textarea
                      value={avatarDoc?.other || ''}
                      onChange={e => setAvatarDoc(d => ({ ...d, other: e.target.value }))}
                      onBlur={e => { const next = { ...avatarDoc, other: e.target.value }; setAvatarDoc(next); save({ avatarDoc: next }) }}
                      placeholder="Anything else — energy, values, how they move through the world..."
                      rows={2}
                      style={{ width: '100%', padding: '4px 0 12px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: '#0F1523', background: 'transparent', border: 'none', outline: 'none', resize: 'none', lineHeight: 1.7 }}
                    />
                  </div>

                  {/* Doc footer — Update draft button */}
                  <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        const composed = [
                          avatarDoc?.essence && `Best in the world in ${domain.label} looks like:\n${avatarDoc.essence}`,
                          avatarDoc?.references && `People and characters for reference:\n${avatarDoc.references}`,
                          avatarDoc?.other && `Other characteristics:\n${avatarDoc.other}`,
                        ].filter(Boolean).join('\n\n')
                        if (!composed.trim()) return
                        setAvatarDraft(composed)
                        sendAvatarMessage(composed)
                      }}
                      disabled={thinking || !((avatarDoc?.essence || avatarDoc?.references || avatarDoc?.other))}
                      style={{ ...btnStyle, opacity: thinking || !((avatarDoc?.essence || avatarDoc?.references || avatarDoc?.other)) ? 0.4 : 1, fontSize: '1.125rem', letterSpacing: '0.08em' }}
                    >
                      Update draft
                    </button>
                  </div>
                </div>
              )}

              {/* Conversation — after first AI exchange */}
              {avatarMessages.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  {avatarMessages.map((m, i) => <ChatBubble key={i} msg={m} />)}
                  {thinking && <ThinkingBubble />}
                </div>
              )}

              {/* Lock button */}
              {(avatarMessages.some(m => m.canLock) || avatarMessages.length >= 4) && !thinking && (
                <LockBtn onClick={lockAvatar} label="Lock in my avatar →" />
              )}

              {/* Chat input — only after first exchange */}
              {avatarMessages.length > 0 && (
                <ChatInput
                  value={avatarInput}
                  onChange={v => setAvatarInput(v)}
                  onSend={text => {
                    sendAvatarMessage(text)
                    setAvatarInput('')
                  }}
                  placeholder="Respond or refine..."
                  disabled={thinking}
                />
              )}
            </>
          ) : (
            // Avatar locked — show summary
            <div>
              <div style={{ padding: '14px 16px', background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '8px' }}>YOUR AVATAR</div>
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7 }}>{avatarFinal}</p>
              </div>
              <button onClick={startEditAvatar} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Edit avatar ↗
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: SCORE ── */}
      {step === 'score' && (
        <div>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '16px' }}>
            Now that we've calibrated the scale, where would you place yourself relative to that best in the world mark? Please give a number and then explain your choice — describe your current state in this area to the best of your ability.
          </p>

          {/* Hourglass picker — always visible */}
          <HourglassPicker onScore={handleScoreSelect} currentScore={currentScore} />

          {/* Reality textarea */}
          <textarea
            value={realityDraft}
            onChange={e => setRealityDraft(e.target.value)}
            placeholder="Describe where you are right now. Voice to text works well here — don't edit, just pour it out."
            rows={4}
            style={{ width: '100%', marginTop: '16px', padding: '12px 14px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.78)', background: 'rgba(200,146,42,0.02)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', outline: 'none', resize: 'vertical', lineHeight: 1.65 }}
          />

          {/* Score conversation */}
          {scoreMsgs.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              {scoreMsgs.map((m, i) => <ChatBubble key={i} msg={m} />)}
              {thinking && <ThinkingBubble />}
            </div>
          )}

          {/* Lock score */}
          {currentScore !== undefined && (scoreMsgs.some(m => m.canLock) || scoreMsgs.length >= 2 || (scoreMsgs.length === 0 && realityDraft.trim())) && !thinking && (
            <LockBtn onClick={lockScore} label={`Lock in ${currentScore} →`} />
          )}

          {scoreMsgs.length > 0 && !thinking && (
            <ChatInput
              value={scoreInput}
              onChange={setScoreInput}
              onSend={text => sendScoreMessage(text, currentScore)}
              placeholder="Respond here…"
              disabled={thinking}
            />
          )}

          {currentScore !== undefined && realityDraft.trim() && scoreMsgs.length === 0 && !thinking && (
            <button onClick={() => sendScoreMessage(realityDraft, currentScore)} style={{ ...btnStyle, marginTop: '12px' }}>
              Send for reflection →
            </button>
          )}

          {scoreLocked && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', fontWeight: 600, color: getScoreColor(currentScore) }}>{currentScore}</span>
              <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.08em', color: getScoreColor(currentScore) }}>{TIER_MAP[currentScore]}</span>
              <button onClick={() => { setScoreLocked(false) }} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px' }}>Edit</button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: HORIZON ── */}
      {(step === 'horizon' || step === 'done') && (
        <div>
          {!horizonLocked || step === 'horizon' ? (
            <>
              {/* Permission-to-challenge moment */}
              {horizonMsgs.length === 0 && (
                <div style={{ padding: '16px 18px', background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.18)', borderLeft: '3px solid rgba(200,146,42,0.4)', borderRadius: '10px', marginBottom: '16px' }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, margin: 0 }}>
                    I'm going to challenge you here, just to pressure test your answer. If afterwards you choose to stay with what you wrote, that's great. If you choose to alter or edit any part of it — or the whole thing — that's also great. We're aiming for the truth of your life here, so let's get it.
                  </p>
                </div>
              )}

              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '8px' }}>
                If the genie granted your wish in {domain.label}, what would it be?
              </p>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, marginBottom: '16px' }}>
                Not the avatar — that's best in the world. Your life. You don't have to want 10.
              </p>

              <textarea
                value={horizonText}
                onChange={e => setHorizonText(e.target.value)}
                placeholder="What would your life look like if this area were genuinely good?"
                rows={3}
                style={{ width: '100%', padding: '12px 14px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.78)', background: 'rgba(200,146,42,0.02)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', outline: 'none', resize: 'vertical', lineHeight: 1.65, marginBottom: '12px' }}
              />

              <HourglassPicker onScore={handleHorizonScoreSelect} horizonMode currentScore={horizonScore} />

              {/* Horizon conversation */}
              {horizonMsgs.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  {horizonMsgs.map((m, i) => <ChatBubble key={i} msg={m} />)}
                  {thinking && <ThinkingBubble />}
                </div>
              )}

              {horizonScore !== undefined && horizonText.trim() && horizonMsgs.length === 0 && !thinking && (
                <button onClick={() => sendHorizonMessage(horizonText, horizonScore)} style={{ ...btnStyle, marginTop: '12px' }}>
                  Send for reflection →
                </button>
              )}

              {horizonMsgs.length > 0 && !thinking && (
                <ChatInput
                  value={horizonInput}
                  onChange={setHorizonInput}
                  onSend={text => sendHorizonMessage(text, horizonScore)}
                  placeholder="Respond here…"
                  disabled={thinking}
                />
              )}

              {horizonScore !== undefined && horizonText.trim() && (horizonMsgs.some(m => m.canLock) || horizonMsgs.length >= 2 || step === 'horizon') && !thinking && (
                <LockBtn onClick={lockHorizon} label={`Lock in my horizon →`} />
              )}
            </>
          ) : (
            // Horizon locked — show summary
            <div>
              <div style={{ padding: '14px 16px', background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '6px' }}>YOUR HORIZON</div>
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, marginBottom: '8px' }}>{horizonText}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.35)', background: 'rgba(200,146,42,0.06)' }}>
                  <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.3125rem', color: '#A8721A' }}>Horizon: {horizonScore}</span>
                  <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.08em', color: '#A8721A' }}>{TIER_MAP[horizonScore]}</span>
                </div>
              </div>
              <button onClick={() => { setHorizonLocked(false); setStep('horizon') }} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Edit →
              </button>
            </div>
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

// ─── Results Card ─────────────────────────────────────────────────────────────

function ResultsCard({ mapData, domainData, currentScores, horizonScores }) {
  const [horizonText,   setHorizonText]   = useState('')
  const [draftVisible,  setDraftVisible]  = useState(false)
  const [horizonLocked, setHorizonLocked] = useState(false)
  const { user } = useAuth()

  const focusDomains = mapData?.focus_domains || []

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
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.25)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 20px rgba(200,146,42,0.08)', animation: 'fadeUp 0.5s ease-out' }}>

      {/* Hero */}
      <div style={{ padding: '28px 28px 22px', borderBottom: '1px solid rgba(200,146,42,0.1)', background: 'rgba(200,146,42,0.03)' }}>
        <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.22em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '12px' }}>Your Life OS Map</div>
        {mapData?.stage && (
          <div style={{ display: 'inline-block', border: '1px solid rgba(200,146,42,0.35)', borderRadius: '6px', padding: '4px 14px', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.16em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '10px' }}>{mapData.stage}</div>
        )}
        {mapData?.stage_description && (
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75 }}>{mapData.stage_description}</p>
        )}
      </div>

      {/* Domain scores */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(200,146,42,0.07)' }}>
        <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>
          Your Seven Domains
        </div>
        {DOMAINS.map(d => {
          const data    = domainData[d.id]
          if (!data) return null
          const s       = data.currentScore
          const h       = data.horizonScore
          const isFocus = focusDomains.includes(d.id)
          const col     = getScoreColor(s)
          return (
            <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(200,146,42,0.07)', background: isFocus ? 'rgba(200,146,42,0.03)' : 'transparent', paddingLeft: isFocus ? '8px' : 0, borderLeft: isFocus ? '2px solid rgba(200,146,42,0.4)' : 'none', marginLeft: isFocus ? '-8px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '0.9375rem', letterSpacing: '0.06em', color: isFocus ? '#A8721A' : '#0F1523', minWidth: '90px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>{isFocus ? '▸ ' : ''}{d.label}<DomainTooltip domainKey={d.id} system="lifeos" position="above" /></span>
                <div style={{ flex: 1, height: '3px', background: 'rgba(200,146,42,0.1)', borderRadius: '2px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, width: `${(s / 10) * 100}%`, height: '100%', background: col, borderRadius: '2px', transition: 'width 0.8s ease' }} />
                  {h && <div style={{ position: 'absolute', left: `${(h / 10) * 100}%`, top: '-4px', width: '2px', height: '11px', background: 'rgba(200,146,42,0.55)', borderRadius: '1px', transform: 'translateX(-1px)' }} />}
                </div>
                <div style={{ textAlign: 'right', minWidth: '60px' }}>
                  <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.125rem', fontWeight: 600, color: col }}>{s}</span>
                  {h && <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: 'rgba(200,146,42,0.85)', marginLeft: '4px' }}>{'\u2192'}{h}</span>}
                </div>
              </div>
              {isFocus && <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.9375rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)' }}>{d.question}</div>}
            </div>
          )
        })}
      </div>

      {/* System drag rule */}
      {(() => {
        const dragDomains = DOMAINS.filter(d => {
          const s = domainData[d.id]?.currentScore
          return s !== undefined && s < 5
        })
        if (dragDomains.length === 0) return null
        return (
          <div style={{ padding: '16px 28px', borderBottom: '1px solid rgba(200,146,42,0.07)', background: 'rgba(200,146,42,0.04)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.14em', color: '#A8721A', background: 'rgba(200,146,42,0.12)', border: '1px solid rgba(200,146,42,0.35)', borderRadius: '40px', padding: '3px 10px', flexShrink: 0, marginTop: '2px', whiteSpace: 'nowrap' }}>System drag</span>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, margin: 0 }}>
                {dragDomains.map(d => d.label).join(', ')} {dragDomains.length === 1 ? 'is' : 'are'} pulling on the rest of your life. A domain below 5 creates drag across everything else. Address this first — before optimising anything above it.
              </p>
            </div>
          </div>
        )
      })()}

      {/* Pattern */}
      {mapData?.overall_reflection && (
        <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(200,146,42,0.07)' }}>
          <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>What The Pattern Shows</div>
          {mapData.overall_reflection.split('\n\n').map((p, i) => (
            <p key={i} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", lineHeight: 1.8, color: 'rgba(15,21,35,0.78)', margin: i > 0 ? '12px 0 0' : 0 }}>{p}</p>
          ))}
        </div>
      )}

      {/* Focus domains */}
      {focusDomains.length > 0 && (
        <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(200,146,42,0.07)' }}>
          <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>Your Three Focus Domains</div>
          <p style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.125rem', color: '#A8721A', letterSpacing: '0.04em', marginBottom: '8px' }}>
            {focusDomains.map(id => DOMAINS.find(d => d.id === id)?.label).filter(Boolean).join('  ·  ')}
          </p>
          {mapData.focus_reasoning && (
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75 }}>{mapData.focus_reasoning}</p>
          )}
        </div>
      )}

      {/* Life horizon draft */}
      {mapData?.life_horizon_draft && (
        <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(200,146,42,0.12)' }}>
          <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>Your Life Horizon</div>
          <textarea value={horizonText} onChange={e => setHorizonText(e.target.value)} disabled={horizonLocked}
            placeholder="Write your own Life Horizon — in your own voice."
            rows={4} style={{ width: '100%', padding: '12px 14px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(15,21,35,0.78)', background: '#FFFFFF', border: horizonLocked ? '1px solid rgba(200,146,42,0.3)' : '1.5px dashed rgba(200,146,42,0.4)', borderRadius: '10px', resize: 'vertical', outline: 'none', lineHeight: 1.7, marginBottom: '8px', opacity: horizonLocked ? 0.7 : 1 }}
          />
          <button onClick={() => setDraftVisible(v => !v)} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '10px', display: 'block' }}>
            {draftVisible ? 'Hide draft ↑' : 'See what The Map drafted →'}
          </button>
          {draftVisible && (
            <div style={{ padding: '14px 16px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '10px', marginBottom: '12px' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '10px' }}>{mapData.life_horizon_draft}</p>
              <button onClick={() => { setHorizonText(mapData.life_horizon_draft); setDraftVisible(false) }} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: '#A8721A', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Use this as my starting point →
              </button>
            </div>
          )}
          {!horizonLocked && horizonText.trim() && (
            <button onClick={lockHorizon} style={btnStyle}>Lock this as my Life Horizon ✓</button>
          )}
          {horizonLocked && (
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)' }}>
              <span style={{ color: '#A8721A', fontStyle: 'normal', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', letterSpacing: '0.1em' }}>✓ Locked.</span>{' '}This is your Life Horizon.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function MapWelcomeModal({ onBegin }) {
  const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
  const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '44px 36px 36px', maxWidth: '460px', width: '100%', textAlign: 'center' }}>
        <span style={{ display: 'block', ...sc, fontSize: '17px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '14px' }}>The Map</span>
        <h2 style={{ ...sc, fontSize: '1.5rem', fontWeight: 400, color: '#0F1523', marginBottom: '16px', lineHeight: 1.1 }}>An honest read.</h2>
        <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '32px' }}>
          Seven domains of your life. Where you are, where you want to be, and what the gap is telling you. Takes about ten minutes. Answer honestly — not aspirationally.
        </p>
        <button onClick={onBegin} style={{
          display: 'block', width: '100%', padding: '15px 24px', borderRadius: '40px',
          border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)',
          color: '#A8721A', fontFamily: "'Cormorant SC', Georgia, serif",
          fontSize: '15px', letterSpacing: '0.14em', cursor: 'pointer', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,1)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)' }}
        >
          Begin {'\u2192'}
        </button>
      </div>
    </div>
  )
}

function AuthModal() {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '36px 32px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
        <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '14px' }}>THE MAP</span>
        <h2 style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '22px', fontWeight: 400, color: '#0F1523', marginBottom: '10px' }}>Sign in to begin.</h2>
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, marginBottom: '24px' }}>
          The Map saves your progress as you go — you can pick up where you left off, any time.
        </p>
        <a href={`/login?redirect=${returnUrl}`} style={{ display: 'block', padding: '14px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.125rem', letterSpacing: '0.16em', color: '#A8721A', textDecoration: 'none' }}>
          Sign in or create account →
        </a>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────


// ─── Connection Sub-Domain Step ────────────────────────────────────────────
// The Connection domain has five default sub-domains plus user-defined ones.
// Each is individually activatable and goes through the same three-step process.
// North Star synthesises across all active sub-domains at the end.

// ─── Connection Sub-Domain Step ─────────────────────────────────────────────

const DEFAULT_CONNECTION_SUBDOMAINS = [
  { id: 'intimate',      label: 'Romantic Partner', defaultActive: true },
  { id: 'family',        label: 'Family',              defaultActive: true },
  { id: 'friendship',    label: 'Friendship',          defaultActive: true },
  { id: 'collaborators', label: 'Collaborators',       defaultActive: true },
  { id: 'community',     label: 'Community',           defaultActive: false },
]

function ConnectionSubDomainCard({ sub, data, onToggle, onUpdate, onComplete, active }) {
  const [step,         setStep]         = useState(() => {
    if (!data) return 'idle'
    if (data.horizonText) return 'done'
    if (data.currentScore !== undefined) return 'horizon'
    return 'score'
  })
  const [currentScore, setCurrentScore] = useState(data?.currentScore)
  const [horizonText,  setHorizonText]  = useState(data?.horizonText || '')
  const [horizonScore, setHorizonScore] = useState(data?.horizonScore)
  const [context,      setContext]      = useState(data?.context || '')
  const [showContext,  setShowContext]  = useState(false)
  const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
  const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

  function save(overrides = {}) {
    const updated = { id: sub.id, label: sub.label, active, currentScore, horizonText, horizonScore, context, ...overrides }
    onUpdate(updated)
    if (updated.horizonText && updated.currentScore !== undefined) onComplete(updated)
  }

  const borderColor  = active ? 'rgba(200,146,42,0.35)' : 'rgba(200,146,42,0.12)'
  const btnBorder    = active ? '2px solid #A8721A'    : '2px solid rgba(200,146,42,0.30)'
  const scoreBorder  = n => currentScore === n ? '1.5px solid #A8721A' : '1.5px solid rgba(200,146,42,0.25)'

  return (
    <div style={{ border: '1px solid ' + borderColor, borderRadius: '10px', marginBottom: '8px', overflow: 'hidden', opacity: active ? 1 : 0.6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: active ? 'rgba(200,146,42,0.03)' : 'transparent' }}>
        <button onClick={() => onToggle(sub.id)} style={{ width: '20px', height: '20px', borderRadius: '50%', border: btnBorder, background: active ? '#A8721A' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {active && <span style={{ color: '#FFFFFF', fontSize: '12px', lineHeight: 1 }}>{'✓'}</span>}
        </button>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: active ? '#0F1523' : 'rgba(15,21,35,0.45)', flex: 1 }}>{sub.label}</span>
        {active && step === 'done' && <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: '#A8721A' }}>{'✓'} Complete</span>}
        {active && currentScore !== undefined && <span style={{ ...sc, fontSize: '13px', color: '#A8721A' }}>{currentScore}/10</span>}
      </div>

      {active && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(200,146,42,0.12)' }}>
          <div style={{ marginTop: '14px', marginBottom: '16px' }}>
            <button onClick={() => setShowContext(!showContext)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', padding: 0 }}>
              {showContext ? '▾' : '▸'} What North Star should know about this area
            </button>
            {showContext && (
              <textarea
                value={context}
                onChange={e => { setContext(e.target.value); save({ context: e.target.value }) }}
                placeholder="Any context that matters here — relationship structure, family dynamics, anything that helps North Star give relevant rather than generic advice..."
                rows={3}
                style={{ width: '100%', marginTop: '8px', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(200,146,42,0.22)', background: '#FAFAF7', ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.78)', resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
              />
            )}
          </div>

          {(step === 'score' || step === 'horizon' || step === 'done') && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>Where are you now? (0–10)</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => { setCurrentScore(n); setStep('horizon'); save({ currentScore: n }) }}
                    style={{ width: '34px', height: '34px', borderRadius: '50%', border: scoreBorder(n), background: currentScore === n ? '#A8721A' : 'transparent', color: currentScore === n ? '#FFFFFF' : 'rgba(15,21,35,0.78)', ...sc, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}>{n}</button>
                ))}
              </div>
            </div>
          )}

          {(step === 'horizon' || step === 'done') && currentScore !== undefined && (
            <div>
              <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>Horizon goal for this area</div>
              <textarea
                value={horizonText}
                onChange={e => setHorizonText(e.target.value)}
                placeholder="If this area was exactly where you want it — what would that look like?"
                rows={2}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(200,146,42,0.22)', background: '#FAFAF7', ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.78)', resize: 'vertical', outline: 'none', lineHeight: 1.6, marginBottom: '8px', boxSizing: 'border-box' }}
              />
              {horizonText.trim() && step !== 'done' && (
                <button onClick={() => { setStep('done'); save({ horizonText, currentScore }) }}
                  style={{ padding: '8px 20px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '13px', letterSpacing: '0.12em', cursor: 'pointer' }}>
                  Lock this in {'→'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ConnectionDomainStep({ domain, existingData, onComplete, onUpdate }) {
  const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
  const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

  const initSubDomains = () => {
    if (existingData?.subDomains) return existingData.subDomains
    return DEFAULT_CONNECTION_SUBDOMAINS.map(s => ({ ...s, active: s.defaultActive, currentScore: undefined, horizonText: '', horizonScore: undefined, context: '' }))
  }

  const [subDomains,   setSubDomains]   = useState(initSubDomains)
  const [customLabel,  setCustomLabel]  = useState('')
  const [addingCustom, setAddingCustom] = useState(false)
  const [synthesis,    setSynthesis]    = useState(existingData?.synthesis || '')
  const [synthesising, setSynthesising] = useState(false)
  const [synthesisDone, setSynthesisDone] = useState(!!existingData?.synthesis)

  const activeSubDomains    = subDomains.filter(s => s.active)
  const completedSubDomains = activeSubDomains.filter(s => s.horizonText && s.currentScore !== undefined)
  const allActiveComplete   = activeSubDomains.length > 0 && completedSubDomains.length === activeSubDomains.length

  function toggleSubDomain(id) {
    setSubDomains(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s))
  }

  function updateSubDomain(updated) {
    const next = subDomains.map(s => s.id === updated.id ? { ...s, ...updated } : s)
    setSubDomains(next)
    const scored = next.filter(s => s.active && s.currentScore !== undefined)
    const avg = scored.length ? scored.reduce((sum, s) => sum + s.currentScore, 0) / scored.length : 0
    onUpdate({ ...existingData, subDomains: next, currentScore: Math.round(avg * 10) / 10 })
  }

  function addCustomSubDomain() {
    if (!customLabel.trim()) return
    const id = 'custom_' + Date.now()
    setSubDomains(prev => [...prev, { id, label: customLabel.trim(), active: true, currentScore: undefined, horizonText: '', context: '' }])
    setCustomLabel('')
    setAddingCustom(false)
  }

  async function synthesise() {
    setSynthesising(true)
    try {
      const res = await fetch('/tools/map/api/connection-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subDomains: completedSubDomains }),
      })
      const data = await res.json()
      setSynthesis(data.synthesis)
      setSynthesisDone(true)
      const avg = completedSubDomains.reduce((sum, s) => sum + s.currentScore, 0) / completedSubDomains.length
      const avgScore = Math.round(avg * 10) / 10
      const final = { ...existingData, subDomains, synthesis: data.synthesis, currentScore: avgScore, horizonScore: avgScore, horizonText: 'See sub-domain horizons', horizonLocked: true }
      onUpdate(final)
      onComplete(final)
    } catch {
      setSynthesis('Something went wrong. Please try again.')
    } finally {
      setSynthesising(false)
    }
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '12px', padding: '24px 24px 20px', animation: 'fadeUp 0.3s ease-out' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: '#A8721A', marginBottom: '6px' }}>North Star {'·'} Connection</div>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.7, margin: '0 0 4px' }}>
          Connection holds your full relational landscape. Activate the areas that apply to your life {'—'} and add your own if needed.
        </p>
        <p style={{ ...serif, fontSize: '14px', fontStyle: 'italic', color: 'rgba(15,21,35,0.50)', lineHeight: 1.6, margin: 0 }}>
          Use the context field to share anything that would help North Star give you relevant rather than generic guidance.
        </p>
      </div>

      {subDomains.map(sub => (
        <ConnectionSubDomainCard
          key={sub.id}
          sub={sub}
          data={sub}
          active={sub.active}
          onToggle={toggleSubDomain}
          onUpdate={updateSubDomain}
          onComplete={() => {}}
        />
      ))}

      {addingCustom ? (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="Name this relationship area"
            onKeyDown={e => e.key === 'Enter' && addCustomSubDomain()}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(200,146,42,0.30)', background: '#FAFAF7', ...serif, fontSize: '15px', outline: 'none' }} />
          <button onClick={addCustomSubDomain} style={{ padding: '10px 16px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '13px', cursor: 'pointer' }}>Add</button>
          <button onClick={() => setAddingCustom(false)} style={{ padding: '10px 14px', borderRadius: '40px', border: '1px solid rgba(200,146,42,0.25)', background: 'transparent', ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)', cursor: 'pointer' }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAddingCustom(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', padding: '8px 0', display: 'block' }}>
          + Add a relationship area
        </button>
      )}

      {allActiveComplete && !synthesisDone && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(200,146,42,0.15)' }}>
          <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.65)', marginBottom: '14px', lineHeight: 1.65 }}>
            All active areas complete. North Star can now reflect the whole picture back to you.
          </p>
          <button onClick={synthesise} disabled={synthesising}
            style={{ padding: '12px 28px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '15px', letterSpacing: '0.14em', cursor: synthesising ? 'wait' : 'pointer', opacity: synthesising ? 0.7 : 1 }}>
            {synthesising ? 'North Star is reflecting…' : 'Get North Star’s reflection →'}
          </button>
        </div>
      )}

      {synthesisDone && synthesis && (
        <div style={{ marginTop: '20px', padding: '20px 22px', background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.20)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '10px' }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '10px' }}>North Star {'·'} Connection synthesis</div>
          {synthesis.split('\n\n').map((p, i) => (
            <p key={i} style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.8, margin: i > 0 ? '12px 0 0' : 0 }}>{p}</p>
          ))}
        </div>
      )}
    </div>
  )
}


export function MapPage() {
  const { user, loading: authLoading }    = useAuth()
  const { tier, loading: accessLoading }  = useAccess('map')

  const isMobile = useIsMobile()
  const [activeIndex,  setActiveIndex]  = useState(null)
  const [domainData,   setDomainData]   = useState({})
  const [threadPanelOpen, setThreadPanelOpen] = useState(false)
  const [spinCount,    setSpinCount]    = useState(0)
  const [currentScores,setCurrentScores]= useState({})
  const [horizonScores,setHorizonScores]= useState({})
  const [phase,        setPhase]        = useState('mapping') // 'welcome' | 'mapping' | 'results'
  const [synthesis,    setSynthesis]    = useState(null)
  const [mapData,      setMapData]      = useState(null)
  const [thinking,     setThinking]     = useState(false)
  const [sessionId,    setSessionId]    = useState(null)
  const [showWelcome,  setShowWelcome]  = useState(() => {
    try {
      const saved = localStorage.getItem('lifeos_themap_v4')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.domainData && Object.keys(parsed.domainData).length > 0) return false
      }
    } catch {}
    return null // null = still loading — wait for Supabase check
  })
  const hasLoadedRef = useRef(false)

  // Load saved data from localStorage + Supabase on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.domainData) {
          setDomainData(parsed.domainData)
          const scores = {}
          const hscores = {}
          Object.entries(parsed.domainData).forEach(([id, d]) => {
            if (d.currentScore !== undefined) scores[id] = d.currentScore
            if (d.horizonScore !== undefined) hscores[id] = d.horizonScore
          })
          setCurrentScores(scores)
          setHorizonScores(hscores)
        }
        if (parsed.phase) setPhase(parsed.phase)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!user || hasLoadedRef.current) return
    hasLoadedRef.current = true
    async function load() {
      try {
        const { data } = await supabase.from('map_results').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
        if (data?.session?.domainData) {
          setDomainData(data.session.domainData)
          const scores = {}, hscores = {}
          Object.entries(data.session.domainData).forEach(([id, d]) => {
            if (d.currentScore !== undefined) scores[id] = d.currentScore
            if (d.horizonScore !== undefined) hscores[id] = d.horizonScore
          })
          setCurrentScores(scores)
          setHorizonScores(hscores)
          if (data.complete) { setPhase('results'); setMapData(data.map_data) }
          // Returning user — skip welcome modal
          setShowWelcome(false)
        } else {
          // No Supabase record — fresh user, show welcome
          setShowWelcome(prev => prev === null ? true : prev)
        }
      } catch {
        setShowWelcome(prev => prev === null ? true : prev)
      }
    }
    load()
  }, [user])

  // Persist to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ domainData, phase })) } catch {}
  }, [domainData, phase])

  if (authLoading || accessLoading) return <div className="loading" />

  if (tier !== 'full' && tier !== 'beta') {
    return <AccessGate productKey="map" toolName="The Map">{null}</AccessGate>
  }

  if (!user) return (
    <>
      <Nav activePath="life-os" />
      <AuthModal />
    </>
  )

  // Domain data handlers
  function handleDomainUpdate(data) {
    const next = { ...domainData, [data.domainId]: data }
    setDomainData(next)
    if (data.currentScore !== undefined) setCurrentScores(p => ({ ...p, [data.domainId]: data.currentScore }))
    if (data.horizonScore !== undefined) setHorizonScores(p => ({ ...p, [data.domainId]: data.horizonScore }))
    saveSession(next)
  }

  function handleDomainComplete(data) {
    handleDomainUpdate(data)
  }

  async function saveSession(allData) {
    if (!user?.id) return
    try {
      await supabase.from('map_results').upsert({
        user_id:    user.id,
        session:    { domainData: allData, currentScores, horizonScores },
        phase:      'mapping',
        complete:   false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch {}
  }

  // Check if all 7 domains are fully complete
  const allComplete = DOMAINS.every(d => getDomainStage(domainData[d.id]) === 3)

  async function runSynthesis() {
    setPhase('synthesis')
    setThinking(true)
    setSynthesis(null)
    try {
      const res = await fetch('/api/map-synthesis-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainData, userId: user?.id }),
      })
      const data = await res.json()
      setThinking(false)
      if (data.mapData) {
        setMapData(data.mapData)
        setSynthesis(data.synthesis || data.mapData.overall_reflection || '')
        setPhase('results')
        saveResults(domainData, data.mapData)
      } else {
        setSynthesis('error')
      }
    } catch {
      setThinking(false)
      setSynthesis('error')
    }
  }

  async function saveResults(allData, map) {
    if (!user?.id) return
    try {
      const { data } = await supabase.from('map_results').upsert({
        user_id:             user.id,
        session:             { domainData: allData, currentScores, horizonScores },
        phase:               'complete',
        complete:            true,
        map_data:            map,
        horizon_goal_system: map?.life_horizon_draft ?? null,
        completed_at:        new Date().toISOString(),
        updated_at:          new Date().toISOString(),
      }, { onConflict: 'user_id' }).select('id').single()
      if (data?.id) setSessionId(data.id)

      // Write to North Star cross-tool memory
      const notes = []
      if (map?.life_horizon_draft) notes.push({ tool: 'map', note: `Life horizon: ${map.life_horizon_draft}` })
      if (map?.focus_domains?.length) notes.push({ tool: 'map', note: `Focus domains: ${map.focus_domains.join(', ')}` })
      if (map?.stage) notes.push({ tool: 'map', note: `Developmental stage: ${map.stage}` })
      // Flag any domains below 5
      const dragDomains = Object.entries(allData)
        .filter(([, d]) => d.currentScore !== undefined && d.currentScore < 5)
        .map(([, d]) => d.label || d.id)
      if (dragDomains.length) notes.push({ tool: 'map', note: `Domains below 5 (system drag): ${dragDomains.join(', ')}` })

      if (notes.length) {
        // Delete old map notes first
        try { await supabase.from('north_star_notes').delete().eq('user_id', user.id).eq('tool', 'map') } catch {}
        try { await supabase.from('north_star_notes').insert(notes.map(n => ({ user_id: user.id, ...n }))) } catch {}
      }
    } catch {}
  }

  const activeDomain = activeIndex !== null ? DOMAINS[activeIndex] : null

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />
      {user && showWelcome === true && <MapWelcomeModal onBegin={() => setShowWelcome(false)} />}

      {/* Left — domain thread panel */}
      <DomainThreadPanel
        domainData={domainData}
        activeIndex={activeIndex}
        onSelect={i => { setActiveIndex(i); setPhase('mapping') }}
        forceOpen={threadPanelOpen}
      />

      {/* Right — scale reference */}
      <ScalePanel side="right" />

      <div className="tool-wrap">

        {/* Header */}
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS · The Map</span>
          <h1 className="tool-title">From where you are<br />to where you want to be.</h1>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', marginTop: '6px', lineHeight: 1.6 }}>
            An honest picture. Seven domains. Three steps each.
          </p>
        </div>

        {/* Welcome */}
        {phase === 'welcome' && (
          <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.18)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '12px', padding: '32px 32px 28px', marginBottom: '20px' }}>
              <p style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.18em', color: '#A8721A', marginBottom: '16px' }}>
                I’m North Star. I’ll be with you throughout this process.
              </p>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 300, fontStyle: 'italic', color: '#0F1523', lineHeight: 1.9, marginBottom: '12px' }}>
                This is not a report card. It is a coherence map — showing you where the gaps exist between who you’re becoming and how you’re currently living.
              </p>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '12px', fontStyle: 'italic' }}>
                The Map takes you through the version of your life on the other side of the things you’ve been wanting to fix, change, alter, improve, repair, and heal.
              </p>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontWeight: 300, color: '#A8721A', lineHeight: 1.7, marginBottom: '28px', fontStyle: 'italic' }}>
                If that work was done — what life would you be living, and who would you be?
              </p>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.8, marginBottom: '28px' }}>
                Seven domains. Three steps each. You can move between domains in any order — do all the avatars first, then come back to score them, then set your horizons. Work at your pace. Your progress saves as you go.
              </p>
              <div style={{ borderTop: '1px solid rgba(200,146,42,0.15)', paddingTop: '24px' }}>
                {[
                  { n: '1', label: 'Best in the world', desc: 'Build a character representing your ideal in that area. This calibrates the scale to you specifically.' },
                  { n: '2', label: 'Where are you now?', desc: 'Establish honestly where you are in each domain right now, relative to that 10/10 mark.' },
                  { n: '3', label: 'Horizon Goal', desc: 'If a genie tapped you on the head and granted your wish in this area — what would it be?' },
                ].map(s => (
                  <div key={s.n} style={{ display: 'flex', gap: '18px', marginBottom: '20px', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.125rem', fontWeight: 600, color: '#A8721A', flexShrink: 0, lineHeight: 1.2, minWidth: '22px' }}>{s.n}</span>
                    <div>
                      <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.3125rem', letterSpacing: '0.08em', color: '#0F1523', marginBottom: '5px' }}>{s.label}</div>
                      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.72 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setPhase('mapping')} style={{ ...btnStyle, display: 'block', width: '100%', textAlign: 'center', fontSize: '1.125rem', padding: '16px 32px' }}>
              Ready to begin →
            </button>
          </div>
        )}

        {/* Mapping phase */}
        {phase === 'mapping' && (
          <div style={{ marginTop: '229px' }}>
            {isMobile ? (
              /* ── Mobile layout: wheel centred above card ── */
              <div>
                {/* Wheel — centred, scaled for mobile */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <div style={{ width: '300px', height: '300px', overflow: 'hidden', flexShrink: 0 }}>
                    <MapWheel
                      domainData={domainData}
                      activeIndex={activeIndex}
                      onSelect={i => { setActiveIndex(i) }}
                      totalSteps={Object.values(domainData).reduce((sum, d) => sum + getDomainStage(d), 0)}
                      onCentreClick={() => setThreadPanelOpen(p => !p)}
                      triggerSpin={spinCount}
                    />
                  </div>
                </div>

                {/* Prev / Next inline */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
                  <button
                    onClick={() => setActiveIndex(i => i === null ? DOMAINS.length - 1 : (i - 1 + DOMAINS.length) % DOMAINS.length)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: 0.5 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <polyline points="12,2 4,9 12,16" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {activeDomain && (
                    <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {activeDomain.label}
                      <DomainTooltip domainKey={activeDomain.id} system="lifeos" position="below" />
                    </span>
                  )}
                  <button
                    onClick={() => setActiveIndex(i => i === null ? 0 : (i + 1) % DOMAINS.length)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: 0.5 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <polyline points="6,2 14,9 6,16" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* Domain card — full width */}
                <div style={{
                  background: '#FAFAF7',
                  border: '1.5px solid rgba(200,146,42,0.25)',
                  borderRadius: '14px',
                  padding: '24px 20px',
                  marginBottom: '24px',
                }}>
                  {activeDomain ? (
                    activeDomain.id === 'connection' ? (
                      <ConnectionDomainStep
                        key={activeDomain.id}
                        domain={activeDomain}
                        existingData={domainData[activeDomain.id]}
                        onUpdate={handleDomainUpdate}
                        onComplete={handleDomainComplete}
                      />
                    ) : (
                    <DomainStep
                      key={activeDomain.id}
                      domain={activeDomain}
                      existingData={domainData[activeDomain.id]}
                      onUpdate={handleDomainUpdate}
                      onComplete={handleDomainComplete}
                    />
                    )
                  ) : (
                    <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.78)', textAlign: 'center', padding: '20px 0' }}>
                      Tap a domain to begin.
                    </p>
                  )}
                  {allComplete && (
                    <div style={{ marginTop: '24px', padding: '20px 22px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.125rem', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '6px' }}>ALL SEVEN DOMAINS COMPLETE</p>
                      <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', marginBottom: '14px' }}>
                        Take your time. Edit anything you want. When you're ready —
                      </p>
                      <button onClick={runSynthesis} style={{ ...btnStyle, fontSize: '1.125rem', padding: '14px 28px' }}>
                        Review your map →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── Desktop layout: wheel behind card, right-aligned ── */
              <div>
                <div style={{ position: 'relative', marginBottom: '32px', minHeight: '280px' }}>

                  {/* Wheel — positioned behind card, right-aligned, large */}
                  <div style={{
                    position: 'absolute',
                    right: '-60px',
                    top: '-324px',
                    width: '520px',
                    height: '520px',
                    zIndex: 0,
                    pointerEvents: 'none',
                  }}>
                    <div style={{ pointerEvents: 'auto' }}>
                      <MapWheel
                        domainData={domainData}
                        activeIndex={activeIndex}
                        onSelect={setActiveIndex}
                        totalSteps={Object.values(domainData).reduce((sum, d) => sum + getDomainStage(d), 0)}
                        onCentreClick={() => setThreadPanelOpen(p => !p)}
                        triggerSpin={spinCount}
                      />
                    </div>
                  </div>

                  {/* Prev / Next arrows — level with domain eyebrow, right of card */}
                  <div style={{
                    position: 'absolute',
                    top: '28px',
                    right: '-56px',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '6px',
                    zIndex: 2,
                  }}>
                    <button
                      onClick={() => setActiveIndex(i => i === null ? DOMAINS.length - 1 : (i - 1 + DOMAINS.length) % DOMAINS.length)}
                      title="Previous domain"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.4, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <polyline points="12,2 4,9 12,16" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setActiveIndex(i => i === null ? 0 : (i + 1) % DOMAINS.length)}
                      title="Next domain"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.4, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <polyline points="6,2 14,9 6,16" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  {/* Content card — sits in front of wheel */}
                  <div style={{
                    position: 'relative',
                    zIndex: 1,
                    background: '#FAFAF7',
                    border: '1.5px solid rgba(200,146,42,0.25)',
                    borderRadius: '14px',
                    padding: '28px 32px',
                    maxWidth: '560px',
                  }}>
                    {activeDomain ? (
                      activeDomain.id === 'connection' ? (
                        <ConnectionDomainStep
                          key={activeDomain.id}
                          domain={activeDomain}
                          existingData={domainData[activeDomain.id]}
                          onUpdate={handleDomainUpdate}
                          onComplete={handleDomainComplete}
                        />
                      ) : (
                      <DomainStep
                        key={activeDomain.id}
                        domain={activeDomain}
                        existingData={domainData[activeDomain.id]}
                        onUpdate={handleDomainUpdate}
                        onComplete={handleDomainComplete}
                      />
                      )
                    ) : null}
                    {allComplete && (
                      <div style={{ marginTop: '24px', padding: '20px 22px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', textAlign: 'center' }}>
                        <p style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.125rem', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '6px' }}>ALL SEVEN DOMAINS COMPLETE</p>
                        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', marginBottom: '14px' }}>
                          Take your time. Edit anything you want. When you're ready —
                        </p>
                        <button onClick={runSynthesis} style={{ ...btnStyle, fontSize: '1.125rem', padding: '14px 28px' }}>
                          Review your map →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Synthesis */}
        {phase === 'synthesis' && (
          <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div style={{ padding: '32px 28px', background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '12px', textAlign: 'center' }}>
              {thinking ? (
                <>
                  <p style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.125rem', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '12px' }}>BUILDING YOUR MAP</p>
                  <div className="typing-indicator"><span /><span /><span /></div>
                </>
              ) : synthesis === 'error' || (!thinking && !synthesis) ? (
                <>
                  <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.1875rem', color: 'rgba(15,21,35,0.72)', marginBottom: '20px', lineHeight: 1.7 }}>
                    Something went wrong building your map. Your domain work is saved.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={runSynthesis} style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', background: 'none', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '40px', padding: '10px 22px', cursor: 'pointer' }}>
                      Try again
                    </button>
                    <button onClick={() => setPhase('mapping')} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      ← Back to editing
                    </button>
                  </div>
                </>
              ) : synthesis}
            </div>
          </div>
        )}

        {/* Results */}
        {phase === 'results' && mapData && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setPhase('mapping')} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Go back and edit
              </button>
            </div>
            <ResultsCard
              mapData={mapData}
              domainData={domainData}
              currentScores={currentScores}
              horizonScores={horizonScores}
            />
          </>
        )}

      </div>
    </div>
  )
}
