import { useState, useRef, useEffect, useCallback } from 'react'
import { ToolCompassPanel } from '../../components/ToolCompassPanel'
import { Nav } from '../../components/Nav'
import { DomainTooltip } from '../../components/DomainTooltip'
import { InfoIcon } from '../../components/InfoIcon'
import { DOMAIN_COPY } from '../../constants/domainCopy'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { supabase } from '../../hooks/useSupabase'
import { HorizonScaleModal, SCALE_LINK_STYLE } from '../../components/HorizonScaleModal'
import { DebriefPanel } from '../../components/DebriefPanel'
import { CrisisRedirectCard } from '../../components/CrisisRedirectCard'
import Pathways from '../../components/pathways/Pathways'
import { computeNeeds } from '../../components/pathways/pathwaysRules'

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

export const DOMAINS = [
  { id: 'path',          label: 'Path',          question: 'Am I walking my path — or just walking?',                    fractal: 'Vision' },
  { id: 'spark',         label: 'Spark',         question: "When did I last feel genuinely alive — and what's been costing me that?",           fractal: 'Human Being' },
  { id: 'body',          label: 'Body',          question: "Am I honouring this instrument — or running it into the ground?",                  fractal: 'Nature' },
  { id: 'finances',      label: 'Finances',      question: 'Do I have the agency to act on what matters?',              fractal: 'Economy' },
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
export function getDomainStage(data) {
  if (!data) return 0
  if (data.horizonScore !== undefined && data.horizonText) return 3
  if (data.currentScore !== undefined) return 2
  if (data.avatarFinal) return 1
  return 0
}

// ─── Connection helpers ───────────────────────────────────────────────────────
// Connection's plurality is honoured *inside* Step 2 — the user scores each
// active relational area, and the domain-level currentScore is the average
// across those scores. After Phase 3 of the Connection refactor, Connection
// runs through DomainStep like the other six domains; the only divergence
// is in Step 2's render, which uses ConnectionLandscapeStep instead of the
// standard single-score capture.

export const DEFAULT_CONNECTION_SUBDOMAINS = [
  { id: 'intimate',      label: 'Romantic Partner', defaultActive: true  },
  { id: 'family',        label: 'Family',           defaultActive: true  },
  { id: 'friendship',    label: 'Friendship',       defaultActive: true  },
  { id: 'collaborators', label: 'Collaborators',    defaultActive: true  },
  { id: 'community',     label: 'Community',        defaultActive: false },
]

// Computes the Connection-level currentScore as the average of active
// sub-domain currentScores. Returns undefined if no active sub-domain has
// been scored yet. Rounded to one decimal — half-step precision lives at
// the rolled-up level even though sub-domain scores are integer-only via
// the compact picker.
export function computeConnectionAverage(subDomains = []) {
  const scored = subDomains.filter(s => s.active && typeof s.currentScore === 'number')
  if (scored.length === 0) return undefined
  const sum = scored.reduce((acc, s) => acc + s.currentScore, 0)
  const avg = sum / scored.length
  return Math.round(avg * 10) / 10
}

// Number of active sub-domains the user has chosen to engage with (for the
// "5 areas" annotation alongside the Connection score on the dashboard).
export function countActiveConnectionSubDomains(subDomains = []) {
  return subDomains.filter(s => s.active).length
}

// Hydrate a sub-domains array from saved data — preserving legacy fields
// (horizonText, horizonScore) so they survive read/write cycles and are
// available as landscape context to North Star at Step 3.
export function hydrateConnectionSubDomains(saved) {
  if (Array.isArray(saved) && saved.length > 0) {
    // Map defaults to merge with saved entries; preserves order from defaults
    return DEFAULT_CONNECTION_SUBDOMAINS.map(def => {
      const existing = saved.find(s => s.id === def.id)
      if (existing) return { ...def, ...existing }
      return { ...def, active: def.defaultActive, currentScore: undefined, context: '' }
    })
  }
  return DEFAULT_CONNECTION_SUBDOMAINS.map(s => ({
    ...s, active: s.defaultActive, currentScore: undefined, context: '',
  }))
}

// Node fill based on stage — 4 visual states
function getNodeFill(stage) {
  switch (stage) {
    case 3: return 'rgba(76,107,69,0.18)' // complete — lightest
    case 2: return 'rgba(76,107,69,0.10)' // score done
    case 1: return 'rgba(76,107,69,0.05)' // avatar done
    default: return '#FFFFFF'              // not started — base
  }
}

function getNodeStroke(stage, isActive) {
  if (isActive) return 'rgba(76,107,69,1)'
  switch (stage) {
    case 3: return 'rgba(76,107,69,0.9)'
    case 2: return 'rgba(76,107,69,0.65)'
    case 1: return 'rgba(76,107,69,0.45)'
    default: return 'rgba(76,107,69,0.3)'
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
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.2)', borderRadius: '12px', padding: '16px 20px', marginTop: '12px' }}>
      {horizonMode && (
        <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.16em', color: '#262420', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(76,107,69,0.12)' }}>
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
              <div style={{ width: '28px', textAlign: 'right', fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.04em', color: isLine ? '#262420' : isCur ? c : 'rgba(15,21,35,0.72)', fontWeight: (isLine || isCur) ? 600 : 400, flexShrink: 0 }}>{n}</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', height: '26px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, height: isLine ? '1.5px' : '1px', background: isLine ? 'rgba(76,107,69,0.4)' : 'rgba(76,107,69,0.08)' }} />
                <button onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(null)} onClick={() => onScore(n)} style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: `${w}%`, height: isCur ? '20px' : '18px', background: isHov || isCur ? c : horizonMode ? `${c}18` : `${c}14`, border: `1px solid ${isHov || isCur ? c : `${c}30`}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 0.12s ease', outline: isCur ? `2px solid ${c}44` : 'none', outlineOffset: '2px' }} />
              </div>
              <div style={{ width: '130px', flexShrink: 0, fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: isLine ? '#262420' : isCur ? c : 'rgba(15,21,35,0.72)', fontWeight: isCur ? 600 : 400, letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {LABEL_MAP[n]}
              </div>
            </div>
          )
        })}
      </div>
      {hovered !== null && (
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(76,107,69,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.125rem', fontWeight: 600, color: getScoreColor(hovered) }}>{hovered}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.125rem', letterSpacing: '0.08em', color: getScoreColor(hovered) }}>{TIER_MAP[hovered]}</span>
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.72)' }}>{LABEL_MAP[hovered]}</span>
          </div>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.65, margin: 0 }}>
            {SIGNATURE_MAP[hovered]}
          </p>
          {hovered >= 9.5 && (
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: 'rgba(38,36,32,0.70)', lineHeight: 1.65, marginTop: '6px', marginBottom: 0 }}>
              {HORIZON_NOTE}
            </p>
          )}
        </div>
      )}
      <ToolCompassPanel />
    </div>
  )
}

// ─── HourglassPickerCompact — horizontal variant for embedded contexts ────────
//
// Same 0–10 scale, same tier colours, same Line at 5, same hover-reveals-tier
// grammar as the vertical HourglassPicker — rotated 90° for embedded contexts
// where vertical real estate is scarce (e.g. sub-domain cards inside Step 2).
//
// The shape still teaches its meaning: bars are narrowest at 5 (The Line) and
// flare outward toward 0 (suffering) and 10 (flourishing). The pinch carries
// the same semantics whether the long axis is vertical or horizontal.
//
// Differences vs full picker:
//   • Horizontal row of bars instead of vertical column
//   • Tier label/description appears above the row on hover or selection
//     (instead of below the column, since 11 always-on tier labels won't fit)
//   • No ToolCompassPanel — that's a one-place explainer, not for repetition
//
// Always operates in current-score mode. Embedded contexts that need a
// horizon picker use the full HourglassPicker instead — horizon is a
// whole-domain moment, not an embedded one.

function HourglassPickerCompact({ onScore, currentScore }) {
  const [hovered, setHovered] = useState(null)
  const minH = 14, maxH = 38

  // Bar heights mirror the vertical version's getWidth — narrow at 5, flaring
  // outward. Using the same Math.pow(pct, 1.4) curve preserves the shape.
  function getHeight(n) {
    const dist = Math.abs(n - 5)
    const pct  = dist / 5
    return Math.round(minH + (maxH - minH) * Math.pow(pct, 1.4))
  }

  const shown = hovered !== null ? hovered : currentScore

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.2)', borderRadius: '10px', padding: '12px 14px', marginTop: '4px' }}>
      {/* Tier indicator — appears when a score is hovered or selected */}
      <div style={{ minHeight: '24px', marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        {shown !== undefined && shown !== null ? (
          <>
            <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '14px', fontWeight: 600, color: getScoreColor(shown), letterSpacing: '0.04em' }}>{shown}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.10em', color: getScoreColor(shown) }}>{TIER_MAP[shown]}</span>
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: 'rgba(15,21,35,0.62)' }}>— {LABEL_MAP[shown]}</span>
          </>
        ) : (
          <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)' }}>Hover a bar to see the tier · tap to set the score</span>
        )}
      </div>

      {/* Horizontal hourglass row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '4px', height: `${maxH + 4}px`, position: 'relative' }}>
        {SCALE_POINTS.map(n => {
          const h      = getHeight(n)
          const c      = getScoreColor(n)
          const isHov  = hovered === n
          const isCur  = currentScore === n
          const isLine = n === 5
          return (
            <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative' }}>
              <button
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onScore(n)}
                aria-label={`Score ${n} — ${TIER_MAP[n]}`}
                style={{
                  width: '100%',
                  height: `${h}px`,
                  background: isHov || isCur ? c : `${c}18`,
                  border: `1px solid ${isHov || isCur ? c : `${c}30`}`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  outline: isCur ? `2px solid ${c}44` : 'none',
                  outlineOffset: '2px',
                  padding: 0,
                }}
              />
              {/* The Line at 5 — vertical accent above the bar */}
              {isLine && (
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '1px', background: 'rgba(76,107,69,0.35)', pointerEvents: 'none' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Number row beneath the bars */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', marginTop: '4px' }}>
        {SCALE_POINTS.map(n => {
          const isHov  = hovered === n
          const isCur  = currentScore === n
          const isLine = n === 5
          return (
            <div key={n} style={{ flex: 1, textAlign: 'center', fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.04em', color: isLine ? '#262420' : (isHov || isCur) ? getScoreColor(n) : 'rgba(15,21,35,0.55)', fontWeight: (isHov || isCur || isLine) ? 600 : 400 }}>{n}</div>
          )
        })}
      </div>

      {/* Tier signature — appears below on hover, like the full picker */}
      {hovered !== null && (
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(76,107,69,0.12)' }}>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.6, margin: 0 }}>
            {SIGNATURE_MAP[hovered]}
          </p>
        </div>
      )}
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

export function MapWheel({ domainData, activeIndex, onSelect, totalSteps = 0, onCentreClick, triggerSpin = 0 }) {
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
    <div style={{width:'100%',maxWidth:'460px',margin:'0 auto',lineHeight:0}}><svg viewBox="0 0 480 480" width="100%">
      {/* Outer rings */}
      <circle cx={CX} cy={CY} r={RADIUS + 42} fill="none" stroke="rgba(76,107,69,0.05)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={RADIUS + 22} fill="none" stroke="rgba(76,107,69,0.07)" strokeWidth="0.5" />

      {/* Heptagon */}
      <polygon points={polygonPoints} fill="rgba(76,107,69,0.02)" stroke="rgba(76,107,69,0.12)" strokeWidth="1" />

      {/* Spokes */}
      {DOMAINS.map((_, i) => {
        const p = getNodePos(i, displayRot)
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(76,107,69,0.06)" strokeWidth="0.5" />
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
                fill="rgba(76,107,69,0.08)"
                stroke="rgba(76,107,69,0.4)"
                strokeWidth="1.5"
              />
            )}

            {/* Pulse ring for incomplete — not spinning */}
            {stage < 3 && !isSpinning && (
              <circle cx={p.x} cy={p.y} r={NODE_R + 8} fill="none" stroke="rgba(76,107,69,0.12)" strokeWidth="1">
                <animate attributeName="r" values={`${NODE_R+6};${NODE_R+13};${NODE_R+6}`} dur="3s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.22;0.04;0.22" dur="3s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Active ring */}
            {isActive && (
              <circle cx={p.x} cy={p.y} r={NODE_R + 15}
                fill="rgba(76,107,69,0.05)"
                stroke="rgba(76,107,69,0.2)"
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
                  fill={getScoreColor(score)} fontSize="21" fontFamily="'IBM Plex Mono', Georgia, serif" fontWeight="600"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {score}
                </text>
                {/* Pill + label centred in circle */}
                <rect x={p.x - 34} y={p.y + 6} width="68" height="16" rx="8"
                  fill="#FFFFFF" fillOpacity="0.96"
                  style={{ pointerEvents: 'none' }} />
                <text x={p.x} y={p.y + 15} textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(76,107,69,0.8)" fontSize="19" fontFamily="'IBM Plex Mono', Georgia, serif" letterSpacing="0.06em"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {domain.label.toUpperCase()}
                </text>
              </>
            ) : (
              <>
                {stage > 0 && (
                  <text x={p.x} y={p.y - 6} textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(76,107,69,0.5)" fontSize="19" fontFamily="'IBM Plex Mono', Georgia, serif"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {stage === 1 ? '◎' : stage === 2 ? '◑' : ''}
                  </text>
                )}
                {/* Pill + label centred in circle */}
                <rect x={p.x - 40} y={p.y - 8} width="80" height="16" rx="8"
                  fill="#FFFFFF" fillOpacity="0.96"
                  style={{ pointerEvents: 'none' }} />
                <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle"
                  fill={isActive ? '#262420' : stage > 0 ? 'rgba(76,107,69,0.7)' : 'rgba(15,21,35,0.72)'}
                  fontSize="19" fontFamily="'IBM Plex Mono', Georgia, serif" letterSpacing="0.04em"
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
                fill={`rgba(76,107,69,${outerGlowOpacity.toFixed(3)})`}
                style={{ transition: 'all 1.2s ease' }}
              />
            )}

            {/* Inner glow ring */}
            <circle cx={CX} cy={CY} r={glowR}
              fill={`rgba(76,107,69,${glowOpacity.toFixed(3)})`}
              style={{ transition: 'all 0.8s ease' }}
            />

            {/* Sun body — solid gold from start */}
            <circle cx={CX} cy={CY} r={sunR}
              fill="#4c6b45"
              stroke="#fcb823"
strokeWidth="0.5"
            />

            {/* Label */}
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
              fill="#FAFAF7"
              fontSize="18" stroke="#FFFFFF" strokeWidth="0.4" fontFamily="'IBM Plex Mono', Georgia, serif" letterSpacing="0.14em"
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              YOUR LIFE
            </text>
          </g>
        )
      })()}
    </svg></div>
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
          borderRight: '1.5px solid rgba(76,107,69,0.78)',
          overflowY: 'auto',
          boxShadow: open ? '4px 0 24px rgba(15,21,35,0.1)' : 'none',
          paddingTop: '72px',
        }}>
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.2em', color: '#262420', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(76,107,69,0.15)' }}>
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
                    background: isActive ? 'rgba(76,107,69,0.08)' : 'transparent',
                    borderLeft: isActive ? '2px solid rgba(76,107,69,0.78)' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(76,107,69,0.05)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', color: stage === 3 ? 'rgba(76,107,69,0.9)' : stage > 0 ? 'rgba(76,107,69,0.6)' : 'rgba(15,21,35,0.72)' }}>
                      {STAGE_ICONS[stage]}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.08em', color: isActive ? '#262420' : 'rgba(15,21,35,0.72)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      {domain.label}
                      <DomainTooltip domainKey={domain.id} system="lifeos" position="below" />
                    </span>
                    {score !== undefined && (
                      <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', fontWeight: 600, color: getScoreColor(score) }}>
                        {score}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>
                      {STAGE_LABELS[stage]}
                    </span>
                    {horizon !== undefined && (
                      <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', color: '#262420' }}>
                        → {horizon}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}

            {/* Legend */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(76,107,69,0.12)' }}>
              {[
                { icon: '○', label: 'Not started' },
                { icon: '◎', label: 'Avatar done' },
                { icon: '◑', label: 'Score done' },
                { icon: '●', label: 'Complete' },
              ].map(item => (
                <div key={item.icon} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', color: 'rgba(76,107,69,0.55)', width: '14px' }}>{item.icon}</span>
                  <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>{item.label}</span>
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
            border: '1.5px solid rgba(76,107,69,0.78)',
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
          <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#262420', writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
            DOMAINS
          </span>
          <span style={{ color: '#262420', fontSize: '15px', marginTop: '4px' }}>
            {open ? '‹' : '›'}
          </span>
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 198, background: 'rgba(15,21,35,0.55)' }} />
      )}
    </>
  )
}

// ─── Avatar edit prompt modal ─────────────────────────────────────────────────

function AvatarEditPrompt({ onSaveAndReview, onJustSave, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(76,107,69,0.78)', borderRadius: '14px', padding: '32px 28px', maxWidth: '400px', width: '100%' }}>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '24px' }}>
          You're updating your avatar. If your new construct changes the scale significantly, your current score and horizon goal might be worth revisiting. Want to flag those for review, or just save?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={onSaveAndReview} style={btnStyle}>Save and review those steps →</button>
          <button onClick={onJustSave} style={{ ...btnStyle, background: 'transparent', border: '1px solid rgba(76,107,69,0.3)', color: 'rgba(15,21,35,0.72)' }}>Just save</button>
          <button onClick={onCancel} style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

const btnStyle = {
  fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.3125rem', letterSpacing: '0.12em',
  color: '#262420', background: 'rgba(76,107,69,0.05)',
  border: '1.5px solid rgba(76,107,69,0.78)', borderRadius: '40px',
  padding: '12px 20px', cursor: 'pointer',
}

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
      <div style={{
        maxWidth: '88%',
        padding: '12px 16px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'rgba(76,107,69,0.08)' : '#FFFFFF',
        border: isUser ? '1px solid rgba(76,107,69,0.22)' : '1px solid rgba(76,107,69,0.15)',
        fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', fontWeight: 300,
        color: isUser ? 'rgba(15,21,35,0.72)' : 'rgba(15,21,35,0.78)',
        lineHeight: 1.72,
        fontStyle: isUser ? 'italic' : 'normal',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

// ProposedDraftAccept — renders below an assistant bubble when North Star has
// offered refined wording for the textarea. The user explicitly chooses to
// save it. Replaces the old pattern of silently overwriting the textarea on
// canLock turns, which left the user unsure whether anything had happened
// and discarded earlier mid-conversation refinements.
function ProposedDraftAccept({ proposedDraft, accepted, onAccept }) {
  if (!proposedDraft) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '-4px', marginBottom: '12px', marginLeft: '4px' }}>
      <div style={{
        padding: '10px 14px',
        background: accepted ? 'rgba(76,107,69,0.04)' : 'rgba(76,107,69,0.07)',
        border: '1px dashed rgba(76,107,69,0.40)',
        borderRadius: '8px',
        maxWidth: '88%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', Georgia, serif",
          fontSize: '13px',
          letterSpacing: '0.14em',
          color: '#262420',
        }}>
          {accepted ? '✓ Saved to your draft' : 'North Star offered a refined version'}
        </span>
        {!accepted && (
          <button
            onClick={onAccept}
            style={{
              padding: '6px 14px',
              borderRadius: '40px',
              border: '1px solid rgba(38,36,32,0.8)',
              background: '#4c6b45',
              color: '#FFFFFF',
              fontFamily: "'IBM Plex Mono', Georgia, serif",
              fontSize: '13px',
              letterSpacing: '0.12em',
              cursor: 'pointer',
            }}
          >
            Save to draft →
          </button>
        )}
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div style={{ display: 'flex', marginBottom: '10px' }}>
      <div style={{ padding: '14px 18px', borderRadius: '14px 14px 14px 4px', background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.15)' }}>
        <div className="typing-indicator"><span /><span /><span /></div>
      </div>
    </div>
  )
}

// ─── Shared sub-components (module scope — stable identity across renders) ────

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
        style={{ flex: 1, padding: '10px 14px', fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.78)', background: 'rgba(76,107,69,0.05)', border: '1px solid rgba(76,107,69,0.25)', borderRadius: '10px', outline: 'none', resize: 'none', lineHeight: 1.55 }}
      />
      <button onClick={() => onSend(value)} disabled={!value.trim() || disabled} style={{ ...btnStyle, padding: '10px 16px', alignSelf: 'flex-end', opacity: !value.trim() || disabled ? 0.6 : 1, fontSize: '1.125rem', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Send</button>
    </div>
  )
}

function LockBtn({ onClick, label }) {
  return (
    <button onClick={onClick} style={{ ...btnStyle, display: 'block', width: '100%', textAlign: 'center', marginTop: '16px' }}>
      {label}
    </button>
  )
}

// ─── Domain Step — full 3-step conversation flow ──────────────────────────────

export function DomainStep({ domain, existingData, onComplete, onUpdate }) {
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

  // Connection-only state: the relational landscape. For other domains this
  // stays at its initial value and never gets touched.
  const isConnection = domain.id === 'connection'
  const [subDomains, setSubDomains] = useState(() =>
    isConnection ? hydrateConnectionSubDomains(existingData?.subDomains) : []
  )

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
      ...(isConnection ? { subDomains } : {}),
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

  // ── Background autosave ─────────────────────────────────────────────────────
  // Lock buttons are the explicit save points, but the user is also writing
  // continuously between locks (typing drafts, exchanging chat turns). This
  // effect debounces a save of the current in-progress state so that a closed
  // tab mid-conversation doesn't lose work. Parent's onUpdate cascades to a
  // map_results upsert, so this writes through to Supabase for signed-in users.
  const firstAutosaveRef = useRef(true)
  useEffect(() => {
    if (firstAutosaveRef.current) { firstAutosaveRef.current = false; return }
    const t = setTimeout(() => { onUpdate(buildData()) }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    avatarDraft, avatarMessages, avatarDoc,
    realityDraft, scoreMsgs,
    horizonText, horizonMsgs,
    subDomains,
  ])

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
      const aiMsg = { role: 'assistant', content: data.message, canLock: data.canLock, cleanedDraft: data.cleanedDraft || null }
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
      const aiMsg = {
        role: 'assistant',
        content: data.message,
        canLock: data.canLock,
        suggestedScore: data.suggestedScore,
        cleanedReality: data.cleanedReality || null,
        proposedDraft: data.proposedDraft || null,
        accepted: false,
      }
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

  // Lock for the Connection landscape step. The average becomes currentScore;
  // sub-domains stay on the object so North Star has them at horizon time and
  // the dashboard can show the "5 areas" annotation.
  function lockConnectionLandscape({ currentScore: avg }) {
    setCurrentScore(avg)
    setScoreLocked(true)
    setStep('horizon')
    save({
      scoreLocked: true,
      currentScore: avg,
      subDomains,
    })
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
          // Connection's relational landscape — passed only for the
          // connection domain so North Star can reflect against the
          // specific areas the user scored and the contexts they shared,
          // rather than producing a generic Connection horizon.
          ...(isConnection ? { subDomains: subDomains.filter(s => s.active) } : {}),
        }),
      })
      const data = await res.json()
      const aiMsg = {
        role: 'assistant',
        content: data.message,
        canLock: data.canLock,
        proposedDraft: data.proposedDraft || null,
        accepted: false,
      }
      const updated = [...next, aiMsg]
      setHorizonMsgs(updated)
      // Note: horizon text updates are now driven by the user explicitly
      // accepting a proposedDraft via the ProposedDraftAccept affordance —
      // no silent overwrites. North Star's refined wording shows in the
      // chat bubble; the user chooses to promote it to the textarea.
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

  // ── Accept handlers for proposedDraft ───────────────────────
  // North Star can offer refined wording via proposedDraft. The user
  // accepts explicitly — we update the textarea, then mark the message
  // accepted so the affordance flips to "Saved" and won't show twice.
  function acceptScoreDraft(index) {
    const msg = scoreMsgs[index]
    if (!msg?.proposedDraft) return
    setRealityDraft(msg.proposedDraft)
    setRealityFinal(msg.proposedDraft)
    const next = scoreMsgs.map((m, i) => i === index ? { ...m, accepted: true } : m)
    setScoreMsgs(next)
    save({ realityDraft: msg.proposedDraft, realityFinal: msg.proposedDraft, scoreMsgs: next })
  }

  function acceptHorizonDraft(index) {
    const msg = horizonMsgs[index]
    if (!msg?.proposedDraft) return
    setHorizonText(msg.proposedDraft)
    const next = horizonMsgs.map((m, i) => i === index ? { ...m, accepted: true } : m)
    setHorizonMsgs(next)
    save({ horizonText: msg.proposedDraft, horizonMsgs: next })
  }

  // ── Render ──────────────────────────────────────────────────

  const stage = getDomainStage(buildData())

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.2)', borderLeft: '3px solid rgba(76,107,69,0.55)', borderRadius: '12px', padding: '24px 24px 20px', animation: 'fadeUp 0.3s ease-out' }}>

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
          <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#262420', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {domain.label}
            {DOMAIN_COPY[domain.id] && (
              <InfoIcon label={`About ${domain.label}`} title={domain.label} align="left">
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.0625rem', color: '#0F1523', lineHeight: 1.6, margin: '0 0 12px', textTransform: 'none', letterSpacing: 'normal' }}>{DOMAIN_COPY[domain.id].gloss}</p>
                <p style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, margin: '0 0 12px', textTransform: 'none', letterSpacing: 'normal' }}>{DOMAIN_COPY[domain.id].paragraph}</p>
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.0625rem', color: '#262420', lineHeight: 1.55, margin: 0, textTransform: 'none', letterSpacing: 'normal' }}>{DOMAIN_COPY[domain.id].question}</p>
              </InfoIcon>
            )}
          </span>
          {stage === 3 && (
            <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#262420' }}>● Complete</span>
          )}
        </div>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
          {domain.question}
        </p>
        {flagReview && step !== 'done' && (
          <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(76,107,69,0.05)', border: '1px solid rgba(76,107,69,0.25)', borderRadius: '8px', fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.25rem', color: '#262420' }}>
            Your avatar changed — worth reviewing your score and horizon goal when you're ready.
          </div>
        )}
      </div>

      {/* Step tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid rgba(76,107,69,0.12)' }}>
        {['avatar', 'score', 'horizon'].map((s, i) => {
          const labels   = ['1 · Best in the world', '2 · Where you are', '3 · Horizon Goal']
          const reachable = i === 0 || (i === 1 && getDomainStage(buildData()) >= 1) || (i === 2 && getDomainStage(buildData()) >= 2)
          const active   = step === s || (step === 'done' && s === 'horizon')
          return (
            <button key={s} onClick={() => reachable && setStep(s)}
              style={{
                fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.12em',
                padding: '8px 14px', background: 'none', border: 'none',
                borderBottom: active ? '2px solid #262420' : '2px solid transparent',
                marginBottom: '-1px', cursor: reachable ? 'pointer' : 'default',
                color: active ? '#262420' : reachable ? 'rgba(15,21,35,0.72)' : 'rgba(15,21,35,0.72)',
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
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '8px' }}>
                Build a character: the best in the world at {domain.label}, for someone like you. Not someone you admire in general — someone who, in {domain.label} specifically, walks into a room and is instantly recognised as the pinnacle. Write them the way you'd write a part for a stage play.
              </p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '8px' }}>
                The real people and characters you draw on are raw material, not a shrine. You're not picking which of them to become. You're forging someone new from the best of what each one brings to {domain.label}.
              </p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px' }}>
                The character is the destination. The references are the ingredients.
              </p>

              {/* Doc-style input — before first AI exchange */}
              {avatarMessages.length === 0 && (
                <div style={{ background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.2)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 1px 8px rgba(15,21,35,0.04)' }}>
                  {/* Doc header bar */}
                  <div style={{ background: 'rgba(76,107,69,0.05)', borderBottom: '1px solid rgba(76,107,69,0.12)', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.16em', color: '#262420' }}>AVATAR DRAFT</span>
                    <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)', }}>{'·'} {domain.label}</span>
                  </div>

                  {/* Section 1 */}
                  <div style={{ padding: '16px 18px 0', borderBottom: '1px solid rgba(76,107,69,0.08)' }}>
                    <label style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.72)', display: 'block', marginBottom: '6px' }}>
                      BEST IN THE WORLD IN THE AREA OF {domain.label.toUpperCase()} LOOKS LIKE...
                    </label>
                    <textarea
                      value={avatarDoc?.essence || ''}
                      onChange={e => setAvatarDoc(d => ({ ...d, essence: e.target.value }))}
                      placeholder="Describe the qualities, the presence, the way this person operates..."
                      rows={3}
                      style={{ width: '100%', padding: '4px 0 12px', fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: '#0F1523', background: 'transparent', border: 'none', outline: 'none', resize: 'none', lineHeight: 1.7 }}
                    />
                  </div>

                  {/* Section 2 */}
                  <div style={{ padding: '16px 18px 0', borderBottom: '1px solid rgba(76,107,69,0.08)' }}>
                    <label style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.72)', display: 'block', marginBottom: '6px' }}>
                      PEOPLE AND CHARACTERS EXCEPTIONAL AT {domain.label.toUpperCase()}
                    </label>
                    <textarea
                      value={avatarDoc?.references || ''}
                      onChange={e => setAvatarDoc(d => ({ ...d, references: e.target.value }))}
                      placeholder={`People (real or fictional) who are exceptional at ${domain.label} specifically — name them and what you'd borrow from each`}
                      rows={3}
                      style={{ width: '100%', padding: '4px 0 12px', fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: '#0F1523', background: 'transparent', border: 'none', outline: 'none', resize: 'none', lineHeight: 1.7 }}
                    />
                  </div>

                  {/* Section 3 */}
                  <div style={{ padding: '16px 18px 0', borderBottom: '1px solid rgba(76,107,69,0.08)' }}>
                    <label style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.72)', display: 'block', marginBottom: '6px' }}>
                      OTHER CHARACTERISTICS
                    </label>
                    <textarea
                      value={avatarDoc?.other || ''}
                      onChange={e => setAvatarDoc(d => ({ ...d, other: e.target.value }))}
                      placeholder="Anything else — energy, values, how they move through the world..."
                      rows={2}
                      style={{ width: '100%', padding: '4px 0 12px', fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: '#0F1523', background: 'transparent', border: 'none', outline: 'none', resize: 'none', lineHeight: 1.7 }}
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
                        onUpdate(buildData({ avatarDoc, avatarDraft: composed }))
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
                  {avatarMessages.map((m, i) => (
                    <div key={i}>
                      {m.role === 'assistant' && m.cleanedDraft && (
                        <div style={{ padding: '14px 16px', background: 'rgba(76,107,69,0.05)', border: '1px solid rgba(76,107,69,0.15)', borderLeft: '3px solid rgba(76,107,69,0.35)', borderRadius: '8px', marginBottom: '10px' }}>
                          <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.16em', color: '#262420', marginBottom: '8px' }}>YOUR AVATAR DRAFT · CLEANED</div>
                          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{m.cleanedDraft}</p>
                        </div>
                      )}
                      <ChatBubble msg={m} />
                    </div>
                  ))}
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
              <div style={{ padding: '14px 16px', background: 'rgba(76,107,69,0.05)', border: '1px solid rgba(76,107,69,0.2)', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#262420', marginBottom: '8px' }}>YOUR AVATAR</div>
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7 }}>{avatarFinal}</p>
              </div>
              <button onClick={startEditAvatar} style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Edit avatar ↗
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: SCORE ── */}
      {step === 'score' && isConnection && (
        <ConnectionLandscapeStep
          subDomains={subDomains}
          setSubDomains={setSubDomains}
          onLock={lockConnectionLandscape}
        />
      )}

      {step === 'score' && !isConnection && (
        <div>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '16px' }}>
            Where are you right now, relative to that? Pick a number and say something about it.
          </p>

          {/* Hourglass picker — always visible */}
          <HourglassPicker onScore={handleScoreSelect} currentScore={currentScore} />

          {/* Reality textarea */}
          <textarea
            value={realityDraft}
            onChange={e => setRealityDraft(e.target.value)}
            placeholder="Describe where you are right now."
            rows={4}
            style={{ width: '100%', marginTop: '16px', padding: '12px 14px', fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.78)', background: 'rgba(76,107,69,0.05)', border: '1px solid rgba(76,107,69,0.25)', borderRadius: '8px', outline: 'none', resize: 'vertical', lineHeight: 1.65 }}
          />

          {/* Score conversation */}
          {scoreMsgs.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              {scoreMsgs.map((m, i) => (
                <div key={i}>
                  {m.role === 'assistant' && m.cleanedReality && (
                    <div style={{ padding: '14px 16px', background: 'rgba(76,107,69,0.05)', border: '1px solid rgba(76,107,69,0.15)', borderLeft: '3px solid rgba(76,107,69,0.35)', borderRadius: '8px', marginBottom: '10px' }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.16em', color: '#262420', marginBottom: '8px' }}>YOUR REALITY · CLEANED</div>
                      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, margin: 0 }}>{m.cleanedReality}</p>
                    </div>
                  )}
                  <ChatBubble msg={m} />
                  {m.role === 'assistant' && m.proposedDraft && (
                    <ProposedDraftAccept
                      proposedDraft={m.proposedDraft}
                      accepted={m.accepted}
                      onAccept={() => acceptScoreDraft(i)}
                    />
                  )}
                </div>
              ))}
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
            <button onClick={() => { onUpdate(buildData({ realityDraft, currentScore })); sendScoreMessage(realityDraft, currentScore) }} style={{ ...btnStyle, marginTop: '12px' }}>
              Send for reflection →
            </button>
          )}

          {scoreLocked && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.25rem', fontWeight: 600, color: getScoreColor(currentScore) }}>{currentScore}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.08em', color: getScoreColor(currentScore) }}>{TIER_MAP[currentScore]}</span>
              <button onClick={() => { setScoreLocked(false) }} style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px' }}>Edit</button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: HORIZON ── */}
      {(step === 'horizon' || step === 'done') && (
        <div>
          {!horizonLocked || step === 'horizon' ? (
            <>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '16px' }}>
                If the genie granted your wish in {domain.label}, what would it be?
              </p>

              {horizonMsgs.some(m => m.accepted) && (
                <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.14em', color: '#262420', marginBottom: '6px' }}>
                  ✓ Saved from North Star — edit freely, then lock
                </div>
              )}
              <textarea
                value={horizonText}
                onChange={e => setHorizonText(e.target.value)}
                placeholder="What does this area look like in your full yes life?"
                rows={3}
                style={{ width: '100%', padding: '12px 14px', fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.78)', background: horizonMsgs.some(m => m.accepted) ? 'rgba(76,107,69,0.04)' : 'rgba(76,107,69,0.02)', border: horizonMsgs.some(m => m.accepted) ? '1.5px solid rgba(76,107,69,0.45)' : '1px solid rgba(76,107,69,0.25)', borderRadius: '8px', outline: 'none', resize: 'vertical', lineHeight: 1.65, marginBottom: '12px' }}
              />

              <HourglassPicker onScore={handleHorizonScoreSelect} horizonMode currentScore={horizonScore} />

              {/* Horizon conversation */}
              {horizonMsgs.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  {horizonMsgs.map((m, i) => (
                    <div key={i}>
                      <ChatBubble msg={m} />
                      {m.role === 'assistant' && m.proposedDraft && (
                        <ProposedDraftAccept
                          proposedDraft={m.proposedDraft}
                          accepted={m.accepted}
                          onAccept={() => acceptHorizonDraft(i)}
                        />
                      )}
                    </div>
                  ))}
                  {thinking && <ThinkingBubble />}
                </div>
              )}

              {horizonScore !== undefined && horizonText.trim() && horizonMsgs.length === 0 && !thinking && (
                <button onClick={() => { onUpdate(buildData({ horizonText, horizonScore })); sendHorizonMessage(horizonText, horizonScore) }} style={{ ...btnStyle, marginTop: '12px' }}>
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
              <div style={{ padding: '14px 16px', background: 'rgba(76,107,69,0.05)', border: '1px solid rgba(76,107,69,0.2)', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#262420', marginBottom: '6px' }}>YOUR HORIZON</div>
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, marginBottom: '8px' }}>{horizonText}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '40px', border: '1.5px solid rgba(76,107,69,0.35)', background: 'rgba(76,107,69,0.05)' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.3125rem', color: '#262420' }}>Horizon: {horizonScore}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.08em', color: '#262420' }}>{TIER_MAP[horizonScore]}</span>
                </div>
              </div>
              <button onClick={() => { setHorizonLocked(false); setStep('horizon') }} style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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

export function ResultsCard({ mapData, domainData, currentScores, horizonScores }) {
  const [horizonText,   setHorizonText]   = useState(() => {
    try { return localStorage.getItem('lifeos_map_horizon_locked') || '' } catch { return '' }
  })
  const [draftVisible,  setDraftVisible]  = useState(false)
  const [horizonLocked, setHorizonLocked] = useState(() => {
    try { return !!localStorage.getItem('lifeos_map_horizon_locked') } catch { return false }
  })
  const userEditingRef = useRef(false)  // true when user has clicked Edit — blocks effect re-lock
  const { user } = useAuth()

  // Restore from Supabase on mount — but never re-lock if user has clicked Edit
  useEffect(() => {
    if (!user?.id) return
    supabase.from('map_results').select('horizon_goal_user').eq('user_id', user.id)
      .order('updated_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data?.horizon_goal_user && !userEditingRef.current) {
          setHorizonText(data.horizon_goal_user)
          setHorizonLocked(true)
        }
      }).catch(() => {})
  }, [user?.id])

  const focusDomains = mapData?.focus_domains || []

  async function lockHorizon() {
    if (!horizonText.trim()) return
    userEditingRef.current = false
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
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.25)', borderLeft: '3px solid rgba(76,107,69,0.55)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 20px rgba(76,107,69,0.08)', animation: 'fadeUp 0.5s ease-out' }}>

      {/* Hero */}
      <div style={{ padding: '28px 28px 22px', borderBottom: '1px solid rgba(76,107,69,0.1)', background: 'rgba(76,107,69,0.05)' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.22em', color: '#262420', textTransform: 'uppercase', marginBottom: '12px' }}>Your Horizon Suite Map</div>
        {mapData?.stage && (
          <div style={{ display: 'inline-block', border: '1px solid rgba(76,107,69,0.35)', borderRadius: '6px', padding: '4px 14px', fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.16em', color: '#262420', textTransform: 'uppercase', marginBottom: '10px' }}>{mapData.stage}</div>
        )}
        {mapData?.stage_description && (
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75 }}>{mapData.stage_description}</p>
        )}
      </div>

      {/* Domain scores */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(76,107,69,0.07)' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#262420', textTransform: 'uppercase', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid rgba(76,107,69,0.1)' }}>
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
            <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(76,107,69,0.07)', background: isFocus ? 'rgba(76,107,69,0.03)' : 'transparent', paddingLeft: isFocus ? '8px' : 0, borderLeft: isFocus ? '2px solid rgba(76,107,69,0.4)' : 'none', marginLeft: isFocus ? '-8px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '0.9375rem', letterSpacing: '0.06em', color: isFocus ? '#262420' : '#0F1523', minWidth: '90px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>{isFocus ? '▸ ' : ''}{d.label}<DomainTooltip domainKey={d.id} system="lifeos" position="above" /></span>
                <div style={{ flex: 1, height: '3px', background: 'rgba(76,107,69,0.1)', borderRadius: '2px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, width: `${(s / 10) * 100}%`, height: '100%', background: col, borderRadius: '2px', transition: 'width 0.8s ease' }} />
                  {h && <div style={{ position: 'absolute', left: `${(h / 10) * 100}%`, top: '-4px', width: '2px', height: '11px', background: 'rgba(76,107,69,0.55)', borderRadius: '1px', transform: 'translateX(-1px)' }} />}
                </div>
                <div style={{ textAlign: 'right', minWidth: '60px' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.125rem', fontWeight: 600, color: col }}>{s}</span>
                  {h && <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: 'rgba(76,107,69,0.85)', marginLeft: '4px' }}>{'→'}{h}</span>}
                </div>
              </div>
              {isFocus && <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '0.9375rem', color: 'rgba(15,21,35,0.72)' }}>{d.question}</div>}
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
          <div style={{ padding: '16px 28px', borderBottom: '1px solid rgba(76,107,69,0.07)', background: 'rgba(76,107,69,0.05)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.14em', color: '#262420', background: 'rgba(76,107,69,0.12)', border: '1px solid rgba(76,107,69,0.35)', borderRadius: '40px', padding: '3px 10px', flexShrink: 0, marginTop: '2px', whiteSpace: 'nowrap' }}>System drag</span>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, margin: 0 }}>
                {dragDomains.map(d => d.label).join(', ')} {dragDomains.length === 1 ? 'is' : 'are'} pulling on the rest of your life. A domain below 5 creates drag across everything else — this is the place to start.
              </p>
            </div>
          </div>
        )
      })()}

      {/* Pattern */}
      {mapData?.overall_reflection && (
        <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(76,107,69,0.07)' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#262420', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(76,107,69,0.1)' }}>What The Pattern Shows</div>
          {mapData.overall_reflection.split('\n\n').map((p, i) => (
            <p key={i} style={{ fontFamily: "'Fraunces', Georgia, serif", lineHeight: 1.8, color: 'rgba(15,21,35,0.78)', margin: i > 0 ? '12px 0 0' : 0 }}>{p}</p>
          ))}
        </div>
      )}

      {/* Focus domains */}
      {focusDomains.length > 0 && (
        <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(76,107,69,0.07)' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#262420', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(76,107,69,0.1)' }}>Your Three Focus Domains</div>
          <p style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.125rem', color: '#262420', letterSpacing: '0.04em', marginBottom: '8px' }}>
            {focusDomains.map(id => DOMAINS.find(d => d.id === id)?.label).filter(Boolean).join('  ·  ')}
          </p>
          {mapData.focus_reasoning && (
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75 }}>{mapData.focus_reasoning}</p>
          )}
        </div>
      )}

      {/* Life horizon — always show if there's a draft or the user has written something */}
      {(mapData?.life_horizon_draft || horizonText) && (
        <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(76,107,69,0.12)' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#262420', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(76,107,69,0.1)' }}>Your Life Horizon</div>
          <textarea value={horizonText} onChange={e => setHorizonText(e.target.value)} disabled={horizonLocked}
            placeholder="Write your own Life Horizon — in your own voice."
            rows={4} style={{ width: '100%', padding: '12px 14px', fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(15,21,35,0.78)', background: '#FFFFFF', border: horizonLocked ? '1px solid rgba(76,107,69,0.3)' : '1.5px dashed rgba(76,107,69,0.4)', borderRadius: '10px', resize: 'vertical', outline: 'none', lineHeight: 1.7, marginBottom: '8px', opacity: horizonLocked ? 0.85 : 1, boxSizing: 'border-box' }}
          />
          {mapData?.life_horizon_draft && (
            <>
              <button onClick={() => setDraftVisible(v => !v)} style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '10px', display: 'block' }}>
                {draftVisible ? 'Hide draft ↑' : 'See what The Map drafted →'}
              </button>
              {draftVisible && (
                <div style={{ padding: '14px 16px', background: 'rgba(76,107,69,0.05)', border: '1px solid rgba(76,107,69,0.15)', borderRadius: '10px', marginBottom: '12px' }}>
                  <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '10px' }}>{mapData.life_horizon_draft}</p>
                  <button onClick={() => { setHorizonText(mapData.life_horizon_draft); setDraftVisible(false) }} style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: '#262420', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Use this as my starting point →
                  </button>
                </div>
              )}
            </>
          )}
          <div>
            {!horizonLocked && horizonText.trim() && (
              <button onClick={lockHorizon} style={btnStyle}>Lock this as my Life Horizon ✓</button>
            )}
            {horizonLocked && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', margin: 0 }}>
                  <span style={{ color: '#262420', fontStyle: 'normal', fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.25rem', letterSpacing: '0.1em' }}>✓ Locked.</span>{' '}This is your Life Horizon.
                </p>
                <button
                  onClick={() => { userEditingRef.current = true; setHorizonLocked(false) }}
                  style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1rem', color: '#262420', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationColor: 'rgba(76,107,69,0.4)', flexShrink: 0 }}>
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal() {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(76,107,69,0.78)', borderRadius: '14px', padding: '36px 32px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.2em', color: '#262420', display: 'block', marginBottom: '14px' }}>THE MAP</span>
        <h2 style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '22px', fontWeight: 400, color: '#0F1523', marginBottom: '10px' }}>Sign in to begin.</h2>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, marginBottom: '24px' }}>
          Sign in and your Map stays with you — pick up wherever you left off, and carry it into every other tool.
        </p>
        <a href={`/login?redirect=${returnUrl}`} style={{ display: 'block', padding: '14px', borderRadius: '40px', border: '1.5px solid rgba(76,107,69,0.78)', background: 'rgba(76,107,69,0.05)', fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.125rem', letterSpacing: '0.16em', color: '#262420', textDecoration: 'none' }}>
          Sign in or create account →
        </a>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────


// ─── Connection Domain ───────────────────────────────────────────────────────
// Phase 3 of the Connection refactor (May 2026): Connection became peer-shaped
// with the other six domains. It now runs through DomainStep like the rest;
// the only divergence is Step 2 ("Where are you"), which renders the
// relational landscape via ConnectionLandscapeStep instead of the standard
// single-score capture. The previous ConnectionDomainStep (~485 lines, with
// its own avatar / synthesis-as-gate / five sub-horizons flow) was removed.
//
// What lives where now:
//   • DEFAULT_CONNECTION_SUBDOMAINS, computeConnectionAverage,
//     hydrateConnectionSubDomains, countActiveConnectionSubDomains — top of file
//   • ConnectionSubDomainCard — score + context per area (no per-sub-horizon)
//   • ConnectionLandscapeStep — Step 2 wrapper, used inside DomainStep
//   • Connection horizon: standard DomainStep Step 3 with the relational
//     landscape passed to North Star as additional context

// DEFAULT_CONNECTION_SUBDOMAINS now lives near the other Connection helpers
// at the top of this file (see line ~65), alongside computeConnectionAverage
// and hydrateConnectionSubDomains.

// ConnectionSubDomainCard — score + context per relational area.
//
// Phase 3 of the Connection refactor folded the per-sub-domain horizons away:
// after the rebuild there is one Connection horizon at the domain level,
// reflected against the full landscape. Each sub-domain now captures only:
//   - currentScore (compact Hourglass, 0–10)
//   - optional context note (what North Star should know about this area)
//
// The card writes back to the parent on every meaningful change via onUpdate.
// The parent (ConnectionLandscapeStep) is the one composing the landscape and
// deciding when Step 2 is complete (= all active areas scored).
function ConnectionSubDomainCard({ sub, data, onToggle, onUpdate, active }) {
  const [currentScore, setCurrentScore] = useState(data?.currentScore)
  const [context,      setContext]      = useState(data?.context || '')
  const [showContext,  setShowContext]  = useState(!!data?.context)
  const [saved,        setSaved]        = useState(false)
  const body  = { fontFamily: "'Newsreader', Georgia, serif" }
  const sc    = { fontFamily: "'IBM Plex Mono', Georgia, serif" }

  function save(overrides = {}) {
    // Preserve any legacy horizonText/horizonScore from earlier Connection
    // builds. They are no longer written by this card but kept on the object
    // so they survive read/write cycles and are available to North Star as
    // landscape context during Step 3 reflection.
    const legacy = data ? { horizonText: data.horizonText, horizonScore: data.horizonScore } : {}
    const updated = {
      id: sub.id,
      label: sub.label,
      active,
      currentScore,
      context,
      ...legacy,
      ...overrides,
    }
    onUpdate(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const borderColor  = active ? 'rgba(76,107,69,0.35)' : 'rgba(76,107,69,0.12)'
  const btnBorder    = active ? '2px solid #262420'    : '2px solid rgba(76,107,69,0.30)'

  return (
    <div style={{ border: '1px solid ' + borderColor, borderRadius: '10px', marginBottom: '8px', overflow: 'hidden', opacity: active ? 1 : 0.6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: active ? 'rgba(76,107,69,0.03)' : 'transparent' }}>
        <button onClick={() => onToggle(sub.id)} style={{ width: '20px', height: '20px', borderRadius: '50%', border: btnBorder, background: active ? '#262420' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {active && <span style={{ color: '#FFFFFF', fontSize: '13px', lineHeight: 1 }}>{'✓'}</span>}
        </button>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: active ? '#0F1523' : 'rgba(15,21,35,0.55)', flex: 1 }}>{sub.label}</span>
        {saved && <span style={{ ...sc, fontSize: '13px', color: '#262420', letterSpacing: '0.1em' }}>Saved</span>}
        {!saved && active && currentScore !== undefined && <span style={{ ...sc, fontSize: '13px', color: '#262420' }}>{currentScore}/10</span>}
      </div>

      {active && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(76,107,69,0.12)' }}>
          <div style={{ marginTop: '14px', marginBottom: '16px' }}>
            <button onClick={() => setShowContext(!showContext)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', padding: 0 }}>
              {showContext ? '▾' : '▸'} What North Star should know about this area
            </button>
            {showContext && (
              <textarea
                value={context}
                onChange={e => { setContext(e.target.value); save({ context: e.target.value }) }}
                placeholder="Any context that matters here — relationship structure, family dynamics, anything that helps North Star give relevant rather than generic advice…"
                rows={3}
                style={{ width: '100%', marginTop: '8px', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(76,107,69,0.22)', background: '#FAFAF7', ...body, fontSize: '15px', color: 'rgba(15,21,35,0.78)', resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
              />
            )}
          </div>

          <div style={{ marginBottom: '4px' }}>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>Where are you now?</div>
            <HourglassPickerCompact
              currentScore={currentScore}
              onScore={n => { setCurrentScore(n); save({ currentScore: n }) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ConnectionLandscapeStep — the Step 2 render for Connection.
//
// Used inside DomainStep when domain.id === 'connection' and step === 'score'.
// Renders the sub-domain cards, manages their state, computes the rolled-up
// currentScore as an average, and advances to Step 3 when all active areas
// have been scored.
//
// Lock advances the parent DomainStep into 'horizon' with currentScore set
// to the average. The landscape (sub-domain scores + contexts) is preserved
// on the domain object and passed to North Star at Step 3 horizon mode so
// her reflection can honour the plurality rather than flattening it.
//
// (An optional whole-landscape reflection with North Star here in Step 2 was
// scoped but deferred — the existing synthesis endpoint expects a different
// payload shape, and the structural rebuild's main job is making Connection
// peer-shaped. Synthesis can be revisited as a follow-on.)
function ConnectionLandscapeStep({ subDomains, setSubDomains, onLock }) {
  const sc    = { fontFamily: "'IBM Plex Mono', Georgia, serif" }
  const serif = { fontFamily: "'Fraunces', Georgia, serif" }

  function toggleSub(id) {
    setSubDomains(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s))
  }

  function updateSub(updated) {
    setSubDomains(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
  }

  const activeSubs = subDomains.filter(s => s.active)
  const scoredSubs = activeSubs.filter(s => typeof s.currentScore === 'number')
  const allActiveScored = activeSubs.length > 0 && scoredSubs.length === activeSubs.length
  const average = computeConnectionAverage(subDomains)

  return (
    <div>
      <p style={{ ...serif, fontSize: '1.125rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '8px' }}>
        Your relational landscape. Activate the areas of connection that matter to you, score each, and add any context North Star should know.
      </p>
      <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, marginBottom: '20px', }}>
        Your Connection score on the wheel is the average across the areas you score.
      </p>

      {subDomains.map(sub => (
        <ConnectionSubDomainCard
          key={sub.id}
          sub={sub}
          data={sub}
          active={sub.active}
          onToggle={toggleSub}
          onUpdate={updateSub}
        />
      ))}

      {/* Average preview — appears once anything is scored */}
      {average !== undefined && (
        <div style={{ marginTop: '20px', padding: '14px 18px', background: 'rgba(76,107,69,0.04)', border: '1px solid rgba(76,107,69,0.18)', borderRadius: '10px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', marginBottom: '6px' }}>Your Connection score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ ...sc, fontSize: '1.75rem', fontWeight: 600, color: '#262420', letterSpacing: '0.02em' }}>{average}</span>
            <span style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.60)', }}>
              average across {scoredSubs.length} of {activeSubs.length} active {activeSubs.length === 1 ? 'area' : 'areas'}
            </span>
          </div>
        </div>
      )}

      {/* Lock — advances to Step 3 with the average as currentScore */}
      {allActiveScored && (
        <LockBtn
          onClick={() => onLock({ currentScore: average })}
          label={`Lock landscape · ${average} → Horizon`}
        />
      )}
    </div>
  )
}


// ─── MapNextSteps — the hand-off to Chapter Two ─────────────────────────────
// The Map is Chapter One of the NextU journey. Completion leads with the
// journey's next station — I Am Statements — with Purpose Piece kept as the
// optional side-path. Forward language; the thread continues, nothing ends.
function MapNextSteps({ compact = false }) {
  const sc   = { fontFamily: "'IBM Plex Mono', Georgia, serif" }
  const serif = { fontFamily: "'Fraunces', Georgia, serif" }
  const body  = { fontFamily: "'Newsreader', Georgia, serif" }

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
        <a href="/nextu/i-am" style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: '#262420', textDecoration: 'none', border: '1px solid rgba(76,107,69,0.5)', borderRadius: '30px', padding: '8px 18px', display: 'inline-block' }}>
          Continue your journey — I Am Statements →
        </a>
        <a href="/nextu" style={{ ...body, fontSize: '1rem', color: 'rgba(15,21,35,0.55)', textDecoration: 'none', display: 'inline-block' }}>
          Or see the whole journey →
        </a>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '32px', padding: '32px 28px', background: 'rgba(76,107,69,0.05)', border: '1px solid rgba(76,107,69,0.18)', borderLeft: '3px solid rgba(76,107,69,0.45)', borderRadius: '12px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: '#262420', textTransform: 'uppercase', marginBottom: '16px' }}>
        Chapter One complete
      </div>
      <p style={{ ...serif, fontSize: '1.35rem', fontWeight: 300, color: '#0F1523', lineHeight: 1.6, marginBottom: '28px' }}>
        The Map shows you the picture. Chapter Two puts it in your own words.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <a href="/nextu/i-am"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: '#FFFFFF', border: '1.5px solid rgba(76,107,69,0.55)', borderRadius: '10px', textDecoration: 'none', transition: 'transform 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = ''}>
          <div>
            <div style={{ ...sc, fontSize: '1.125rem', letterSpacing: '0.1em', color: '#262420', marginBottom: '4px' }}>I Am Statements</div>
            <div style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.55)' }}>Seven declarations, present tense — Chapter Two of your journey.</div>
          </div>
          <span style={{ ...sc, fontSize: '1.25rem', color: '#262420', flexShrink: 0, marginLeft: '16px' }}>→</span>
        </a>
        <a href="/nextu"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.25)', borderRadius: '10px', textDecoration: 'none', transition: 'transform 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = ''}>
          <div>
            <div style={{ ...sc, fontSize: '1.125rem', letterSpacing: '0.1em', color: '#0F1523', marginBottom: '4px' }}>Your journey</div>
            <div style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.55)' }}>See the four chapters and where you stand on the thread.</div>
          </div>
          <span style={{ ...sc, fontSize: '1.25rem', color: 'rgba(15,21,35,0.55)', flexShrink: 0, marginLeft: '16px' }}>→</span>
        </a>
        <a href="/tools/purpose-piece"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.25)', borderRadius: '10px', textDecoration: 'none', transition: 'transform 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = ''}>
          <div>
            <div style={{ ...sc, fontSize: '1.125rem', letterSpacing: '0.1em', color: '#0F1523', marginBottom: '4px' }}>Purpose Piece</div>
            <div style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.55)' }}>An optional side-path — your archetype, domain, and scale of contribution.</div>
          </div>
          <span style={{ ...sc, fontSize: '1.25rem', color: 'rgba(15,21,35,0.55)', flexShrink: 0, marginLeft: '16px' }}>→</span>
        </a>
      </div>
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
  // 'welcome' | 'mapping' | 'synthesis' | 'debrief' | 'results' | 'crisis_gate'
  // null = undecided — the Supabase check resolves fresh→'welcome' vs returning→'mapping'
  const [phase,        setPhase]        = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.domainData && Object.keys(parsed.domainData).length > 0) {
          return (parsed.phase && parsed.phase !== 'results') ? parsed.phase : 'mapping'
        }
      }
    } catch {}
    return null
  })
  const [synthesis,    setSynthesis]    = useState(null)
  const [showMapDebrief, setShowMapDebrief] = useState(false)
  const [mapData,      setMapData]      = useState(null)
  const [crisisGate,   setCrisisGate]   = useState(null)
  const [thinking,     setThinking]     = useState(false)
  const [scaleOpen,    setScaleOpen]    = useState(false)
  const [sessionId,    setSessionId]    = useState(null)
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
        // Only restore 'results' phase if Supabase will have mapData — otherwise show mapping
        if (parsed.phase && parsed.phase !== 'results') setPhase(parsed.phase)
        if (Number.isInteger(parsed.activeIndex) && parsed.activeIndex >= 0 && parsed.activeIndex < DOMAINS.length && parsed.phase === 'mapping') {
          setActiveIndex(parsed.activeIndex)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!user || hasLoadedRef.current) return
    hasLoadedRef.current = true
    async function load() {
      try {
        const { data, error } = await supabase.from('map_results').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
        if (error) throw error

        if (data?.session?.domainData && typeof data.session.domainData === 'object') {
          // Safely restore domain data — skip malformed entries
          const safeDomainData = {}
          const scores = {}, hscores = {}
          Object.entries(data.session.domainData).forEach(([id, d]) => {
            if (!d || typeof d !== 'object') return
            safeDomainData[id] = d
            if (d.currentScore !== undefined) scores[id] = d.currentScore
            if (d.horizonScore !== undefined) hscores[id] = d.horizonScore
          })
          if (Object.keys(safeDomainData).length > 0) {
            setDomainData(safeDomainData)
            setCurrentScores(scores)
            setHorizonScores(hscores)
          }
          // Retroactively mark complete if all 7 domains are done but DB not yet updated
          const allDoneOnLoad = DOMAINS.every(d => getDomainStage(safeDomainData[d.id]) === 3)
          if (allDoneOnLoad && !data.complete) {
            supabase.from('map_results').upsert({
              user_id: user.id, complete: true, phase: 'complete',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' }).then(() => {}).catch(() => {})
          }

          if (data.complete && data.map_data) {
            setPhase('results')
            setMapData(data.map_data)
          } else {
            // Has domain data but no completed synthesis — show mapping view
            setPhase('mapping')
          }
        } else if (data && !data.session?.domainData) {
          // Row exists but session is empty/corrupt — treat as returning user, skip welcome
          setPhase(prev => prev === null ? 'mapping' : prev)
        } else {
          // No record — fresh user: open with the North Star orientation panel
          setPhase(prev => prev === null ? 'welcome' : prev)
        }
      } catch {
        // On any error, unblock the UI — orient a likely-fresh user, leave returning users put
        setPhase(prev => prev === null ? 'welcome' : prev)
      }
    }
    load()

    // Safety net: if Supabase never responds, unblock UI after 8 seconds
    const timeout = setTimeout(() => {
      setPhase(prev => prev === null ? 'welcome' : prev)
    }, 8000)
    return () => clearTimeout(timeout)
  }, [user])

  // Persist to localStorage on every change
  useEffect(() => {
    // activeIndex included so an app-switch reload lands back inside the
    // open domain instead of bouncing to the wheel. Domain-level step already
    // self-restores from saved data (initStep), so this is the last missing
    // piece of the resume path.
    try { localStorage.setItem(LS_KEY, JSON.stringify({ domainData, phase, activeIndex })) } catch {}
  }, [domainData, phase, activeIndex])

  if (authLoading || accessLoading) return <div className="loading" />

  if (!user) return (
    <>
      <Nav activePath="nextus-self" />
      <AuthModal />
    </>
  )

  // Fresh users sit at phase === null until the Supabase check resolves to 'welcome'.
  // Hold a light loading state so the content area is never momentarily empty.
  if (phase === null) return (
    <>
      <Nav activePath="nextus-self" />
      <div className="loading" />
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
      // Mark complete when all 7 domains reach stage 3 — doesn't require synthesis
      const allDone = DOMAINS.every(d => getDomainStage(allData[d.id]) === 3)
      await supabase.from('map_results').upsert({
        user_id:    user.id,
        session:    { domainData: allData, currentScores, horizonScores },
        phase:      allDone ? 'complete' : 'mapping',
        complete:   allDone,
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
    setCrisisGate(null)
    try {
      const res = await fetch('/api/map-synthesis-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainData, userId: user?.id }),
      })
      const data = await res.json()
      setThinking(false)

      // Crisis gate triggered — no synthesis, redirect to support
      if (data.crisisGate?.triggered) {
        setCrisisGate(data.crisisGate)
        setMapData(null)
        setSynthesis(null)
        setPhase('crisis_gate')
        await saveResults(domainData, null, { crisisGate: data.crisisGate })
        return
      }

      if (data.mapData) {
        setMapData(data.mapData)
        setSynthesis(data.synthesis || data.mapData.overall_reflection || '')
        setPhase('debrief')
        saveResults(domainData, data.mapData)
      } else {
        setSynthesis('error')
      }
    } catch {
      setThinking(false)
      setSynthesis('error')
    }
  }

  async function saveResults(allData, map, options = {}) {
    if (!user?.id) return
    const isCrisis = !!options.crisisGate
    try {
      const { data } = await supabase.from('map_results').upsert({
        user_id:             user.id,
        session:             { domainData: allData, currentScores, horizonScores },
        phase:               isCrisis ? 'crisis_gate' : 'complete',
        complete:            !isCrisis,
        map_data:            map,
        horizon_goal_system: map?.life_horizon_draft ?? null,
        crisis_gate_triggered: isCrisis,
        completed_at:        new Date().toISOString(),
        updated_at:          new Date().toISOString(),
      }, { onConflict: 'user_id' }).select('id').single()
      if (data?.id) setSessionId(data.id)

      // When crisis gate fires, do NOT write notes to north_star_notes.
      // The crisis state must not propagate into other tools as if it were a synthesis result.
      if (isCrisis) return

      // Write to North Star cross-tool memory
      const notes = []
      if (map?.life_horizon_draft) notes.push({ tool: 'map', note: `Life horizon: ${map.life_horizon_draft}` })
      if (map?.focus_domains?.length) {
        const DOMAIN_LABELS = { path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances', connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal' }
        const domainNames = map.focus_domains.map(id => DOMAIN_LABELS[id] || id).join(', ')
        notes.push({ tool: 'map', note: `Focus domains: ${domainNames}` })
      }
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

      // Write all 7 domains to horizon_profile so Target Stretch, feed,
      // public profile, and _north-star.js can all read from one source.
      const DOMAIN_KEYS = ['path','spark','body','finances','connection','inner_game','signal']
      const profileRows = DOMAIN_KEYS
        .map(key => {
          const d = allData[key]
          if (!d || d.currentScore === undefined) return null
          return {
            user_id:          user.id,
            domain:           key,
            current_score:    d.currentScore,
            horizon_score:    d.horizonScore ?? null,
            horizon_goal:     d.horizonText  ?? null,
            ia_statement:     d.ia_statement ?? null,
            avatar_statement: d.avatarFinal  ?? null,
            source:           'map',
            last_updated:     new Date().toISOString(),
          }
        })
        .filter(Boolean)
      if (profileRows.length) {
        try {
          await supabase.from('horizon_profile')
            .upsert(profileRows, { onConflict: 'user_id,domain' })
        } catch {}
      }
    } catch {}
  }

  const activeDomain = activeIndex !== null ? DOMAINS[activeIndex] : null

  return (
    <div className="page-shell">
      <Nav activePath="nextus-self" />

      {/* Left — domain thread panel */}
      <DomainThreadPanel
        domainData={domainData}
        activeIndex={activeIndex}
        onSelect={i => { setActiveIndex(i); setPhase('mapping') }}
        forceOpen={threadPanelOpen}
      />

      {/* Scale reference modal */}
      <HorizonScaleModal
        open={scaleOpen}
        onClose={() => setScaleOpen(false)}
        system="self"
      />

      <div className="tool-wrap">

        {/* Header */}
        <div className="tool-header">
          <span className="tool-eyebrow">Horizon Suite · The Map</span>
          <h1 className="tool-title">From where you are<br />to where you want to be.</h1>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.3125rem', fontWeight: 300, color: 'rgba(15,21,35,0.72)', marginTop: '6px', lineHeight: 1.6 }}>
            An honest picture. Seven domains. Three steps each.
          </p>
        </div>

        {/* Welcome */}
        {phase === 'welcome' && (
          <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.18)', borderLeft: '3px solid rgba(76,107,69,0.55)', borderRadius: '12px', padding: '32px 32px 28px', marginBottom: '20px' }}>
              <p style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.18em', color: '#262420', marginBottom: '16px' }}>
                I’m North Star. I’ll be with you throughout this process.
              </p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 300, color: '#0F1523', lineHeight: 1.9, marginBottom: '12px' }}>
                This is not a report card. It is a coherence map — showing you where the gaps exist between who you’re becoming and how you’re currently living.
              </p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: '12px', }}>
                The Map takes you through the version of your life on the other side of the things you’ve been wanting to fix, change, alter, improve, repair, and heal.
              </p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', fontWeight: 300, color: '#262420', lineHeight: 1.7, marginBottom: '28px', }}>
                If that work was done — what life would you be living, and who would you be?
              </p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.8, marginBottom: '28px' }}>
                Seven domains. The same three steps repeat in each one, and every answer is about that domain specifically — your Path is not your Body. You can move between domains in any order: do all of step one first, then come back for the scores, then the Horizon Goals. Work at your pace, your progress saves as you go, and answer from where you actually are.
              </p>
              <div style={{ borderTop: '1px solid rgba(76,107,69,0.15)', paddingTop: '24px' }}>
                {[
                  { n: '1', label: 'Best in the world', desc: 'Build the character who would be the best in the world at that specific domain, for someone like you. This sets your personal 10/10.' },
                  { n: '2', label: 'Where are you now?', desc: 'Establish honestly where you are in each domain right now, relative to that 10/10 mark.' },
                  { n: '3', label: 'Horizon Goal', desc: 'If a genie tapped you on the head and granted your wish in this area — what would it be?' },
                ].map(s => (
                  <div key={s.n} style={{ display: 'flex', gap: '18px', marginBottom: '20px', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.125rem', fontWeight: 600, color: '#262420', flexShrink: 0, lineHeight: 1.2, minWidth: '22px' }}>{s.n}</span>
                    <div>
                      <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.3125rem', letterSpacing: '0.08em', color: '#0F1523', marginBottom: '5px' }}>{s.label}</div>
                      <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.72 }}>{s.desc}</div>
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
                      <polyline points="12,2 4,9 12,16" stroke="#4c6b45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {activeDomain && (
                    <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#262420', alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {activeDomain.label}
                      <DomainTooltip domainKey={activeDomain.id} system="lifeos" position="below" />
                    </span>
                  )}
                  <button
                    onClick={() => setActiveIndex(i => i === null ? 0 : (i + 1) % DOMAINS.length)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: 0.5 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <polyline points="6,2 14,9 6,16" stroke="#4c6b45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* Domain card — full width */}
                <div style={{
                  background: '#FAFAF7',
                  border: '1.5px solid rgba(76,107,69,0.25)',
                  borderRadius: '14px',
                  padding: '24px 20px',
                  marginBottom: '24px',
                }}>
                  {activeDomain ? (
                    <DomainStep
                      key={activeDomain.id}
                      domain={activeDomain}
                      existingData={domainData[activeDomain.id]}
                      onUpdate={handleDomainUpdate}
                      onComplete={handleDomainComplete}
                    />
                  ) : (
                    <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.78)', textAlign: 'center', padding: '20px 0' }}>
                      Tap a domain to begin.
                    </p>
                  )}
                  {allComplete && (
                    <div style={{ marginTop: '24px', padding: '20px 22px', background: 'rgba(76,107,69,0.05)', border: '1.5px solid rgba(76,107,69,0.78)', borderRadius: '12px', textAlign: 'center' }}>
                      <p style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.125rem', letterSpacing: '0.14em', color: '#262420', marginBottom: '6px' }}>ALL SEVEN DOMAINS COMPLETE</p>
                      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', marginBottom: '14px' }}>
                        Take your time. Edit anything you want. When you're ready —
                      </p>
                      <button onClick={runSynthesis} style={{ ...btnStyle, fontSize: '1.125rem', padding: '14px 28px', marginBottom: '12px', display: 'block', width: '100%' }}>
                        See your full map →
                      </button>
                      <MapNextSteps compact />
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
                    top: '-292px',
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
                        <polyline points="12,2 4,9 12,16" stroke="#4c6b45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                        <polyline points="6,2 14,9 6,16" stroke="#4c6b45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  {/* Content card — sits in front of wheel */}
                  <div style={{
                    position: 'relative',
                    zIndex: 1,
                    background: '#FAFAF7',
                    border: '1.5px solid rgba(76,107,69,0.25)',
                    borderRadius: '14px',
                    padding: '28px 32px',
                    maxWidth: '560px',
                  }}>
                    {activeDomain ? (
                      <DomainStep
                        key={activeDomain.id}
                        domain={activeDomain}
                        existingData={domainData[activeDomain.id]}
                        onUpdate={handleDomainUpdate}
                        onComplete={handleDomainComplete}
                      />
                    ) : (
                      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.78)', textAlign: 'center', padding: '20px 0' }}>
                        Select a domain on the wheel to begin.
                      </p>
                    )}
                    {allComplete && (
                      <div style={{ marginTop: '24px', padding: '20px 22px', background: 'rgba(76,107,69,0.05)', border: '1.5px solid rgba(76,107,69,0.78)', borderRadius: '12px', textAlign: 'center' }}>
                        <p style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.125rem', letterSpacing: '0.14em', color: '#262420', marginBottom: '6px' }}>ALL SEVEN DOMAINS COMPLETE</p>
                        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', marginBottom: '14px' }}>
                          Take your time. Edit anything you want. When you're ready —
                        </p>
                        <button onClick={runSynthesis} style={{ ...btnStyle, fontSize: '1.125rem', padding: '14px 28px', marginBottom: '12px' }}>
                          See your full map →
                        </button>
                        <MapNextSteps compact />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Crisis gate — fires when scores cross safety thresholds */}
        {phase === 'crisis_gate' && crisisGate && (
          <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <CrisisRedirectCard
              message={crisisGate.message}
              onExit={() => {
                // Save and exit — return to mapping but keep their data
                setPhase('mapping')
                setCrisisGate(null)
              }}
            />
          </div>
        )}

        {/* Synthesis */}
        {phase === 'synthesis' && (
          <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div style={{ padding: '32px 28px', background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.2)', borderRadius: '12px', textAlign: 'center' }}>
              {thinking ? (
                <>
                  <p style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '1.125rem', letterSpacing: '0.14em', color: '#262420', marginBottom: '12px' }}>BUILDING YOUR MAP</p>
                  <div className="typing-indicator"><span /><span /><span /></div>
                </>
              ) : synthesis === 'error' || (!thinking && !synthesis) ? (
                <>
                  <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.1875rem', color: 'rgba(15,21,35,0.72)', marginBottom: '20px', lineHeight: 1.7 }}>
                    Something went wrong building your map. Your domain work is saved.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={runSynthesis} style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#262420', background: 'none', border: '1px solid rgba(76,107,69,0.5)', borderRadius: '40px', padding: '10px 22px', cursor: 'pointer' }}>
                      Try again
                    </button>
                    <button onClick={() => setPhase('mapping')} style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      ← Back to editing
                    </button>
                  </div>
                </>
              ) : synthesis}
            </div>
          </div>
        )}

        {/* Debrief — fires after synthesis completes, before results */}
        {phase === 'debrief' && (
          <div style={{ animation: 'fadeUp 0.4s ease-out', maxWidth: '600px' }}>
            <h2 style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: 'clamp(1.25rem,3vw,1.75rem)', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, marginBottom: '20px' }}>
              Your map is built. Now reflect on the process.
            </h2>
            <DebriefPanel
              tool="map"
              toolContext={{
                overallScore: mapData?.overall_score,
                domains:      domainData,
                synthesis,
              }}
              userId={user?.id}
              mode="full"
              onComplete={() => setPhase('results')}
            />
          </div>
        )}

        {/* Results */}
        {phase === 'results' && mapData && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setPhase('mapping')} style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Go back and edit
              </button>
            </div>
            <ResultsCard
              mapData={mapData}
              domainData={domainData}
              currentScores={currentScores}
              horizonScores={horizonScores}
            />
            <MapNextSteps />
            {/* Pathways — below all reflection content, results only.
                Never mid-Map, never on any crisis-gate path. Renders for
                the primary need domain (largest gap) when an active need
                exists; otherwise nothing. Reads scores only. */}
            {!crisisGate && (() => {
              const scores = {}
              for (const [key, d] of Object.entries(domainData || {})) {
                if (d?.currentScore != null) {
                  scores[key] = { current: d.currentScore, horizon: d.horizonScore ?? null }
                }
              }
              const { primaryNeed } = computeNeeds(scores)
              return primaryNeed
                ? <Pathways domain={primaryNeed} surface="map_debrief" />
                : null
            })()}
          </>
        )}

      </div>
    </div>
  )
}
