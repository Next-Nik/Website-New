import { useState, useRef, useEffect, useCallback } from 'react'
import { ToolCompassPanel } from '../../components/ToolCompassPanel'
import { Nav } from '../../components/Nav'
import { DomainTooltip } from '../../components/DomainTooltip'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { supabase } from '../../hooks/useSupabase'
import { DebriefPanel } from '../../components/DebriefPanel'
import { tokens, serif, body, sc } from '../../lib/designTokens'
import { DOMAIN_COLORS } from '../../constants/domainColors'
import { useAutoSave, SavedWhisper } from '../nextu/shared'

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'tg_session_v2'

export const DOMAINS = [
  { id: 'path',       label: 'Path',       description: "Your contribution, calling, and the work you're here to do. Not your job title — the thread of purpose running beneath whatever you're currently doing.",                                                            question: "Am I walking my path — or just walking?" },
  { id: 'spark',      label: 'Spark',      description: 'The animating fire. The things that make you feel genuinely alive — not just occupied. When Spark is low, everything else runs on fumes.',                                                                        question: "When did I last feel genuinely alive — and what's been costing me that?" },
  { id: 'body',       label: 'Body',       description: 'Your physical instrument. The vessel through which everything else operates — and the one thing you cannot outsource, replace, or defer indefinitely.',                                                             question: 'Am I honouring this instrument — or running it into the ground?' },
  { id: 'finances',   label: 'Finances',   description: 'The currency that gives you the capacity to act. Resources, mobility, and agency to convert your visions into reality and your desires into choices.',                                                             question: 'Do I have the agency to act on what matters?' },
  { id: 'connection', label: 'Connection', description: 'How you inhabit connection across the full range of your relational life. Not just the presence of people — the quality of the connection. Are you genuinely known?',                                             question: 'Am I truly known by anyone — and am I truly knowing them?' },
  { id: 'inner_game', label: 'Inner Game', description: "Your relationship with yourself. The beliefs, stories, values, and emotional patterns you carry about who you are and what you're capable of. The source code — everything else runs on it.",                      question: 'What story about myself is quietly running the room — and is that story still true?' },
  { id: 'signal',     label: 'Signal',     description: "Your external world: environment, appearance, presence, and public-facing persona. Where inner alignment meets the world's perception of you — and the two need to match.",                                        question: "Is what I'm broadcasting aligned with who I actually am?" },
]

const DOMAIN_BY_ID = Object.fromEntries(DOMAINS.map(d => [d.id, d]))

const STEPS = ['current_state', 'horizon', 'target_goal', 'milestones', 'tasks']
const STEP_LABELS = {
  current_state: 'Where you are',
  horizon:       'Horizon',
  target_goal:   'Target Goal',
  milestones:    'Milestones',
  tasks:         'Tasks',
}

const TIER = {
  10:'World-Class', 9.5:'Exemplar+', 9:'Exemplar', 8.5:'Fluent+', 8:'Fluent',
  7.5:'Capable+', 7:'Capable', 6.5:'Functional+', 6:'Functional', 5.5:'Plateau+',
  5:'Threshold', 4.5:'Friction+', 4:'Friction', 3.5:'Strain+', 3:'Strain',
  2.5:'Crisis+', 2:'Crisis', 1.5:'Emergency+', 1:'Emergency', 0:'Ground Zero',
}

function getTierLabel(n) { return TIER[n] || TIER[Math.round(n * 2) / 2] || '' }
function getColor(n) {
  if (n >= 8) return '#2A8C4F'
  if (n >= 6) return '#C8922A'
  if (n >= 4) return '#E8B92E'
  return '#D63838'
}

// ─── Design shortcuts ─────────────────────────────────────────────────────────

const gold   = { color: tokens.gold }
const muted  = { color: 'rgba(15,21,35,0.78)' }
const meta   = { color: 'rgba(15,21,35,0.78)' }
const GOLD_C = tokens.goldChrome

// ─── Small shared pieces ──────────────────────────────────────────────────────

function Eyebrow({ children, style = {} }) {
  return (
    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', ...gold, marginBottom: '6px', textTransform: 'uppercase', ...style }}>
      {children}
    </div>
  )
}

function Rule() {
  return <div style={{ height: '1px', background: `rgba(200,146,42,0.18)`, margin: '16px 0' }} />
}

function Btn({ onClick, disabled, children, style = {}, variant = 'solid' }) {
  const base = {
    ...sc, fontSize: '15px', letterSpacing: '0.14em', padding: '11px 28px',
    borderRadius: '40px', cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1.5px solid rgba(200,146,42,0.78)', transition: 'all 0.2s',
    opacity: disabled ? 0.45 : 1,
  }
  const styles = variant === 'ghost'
    ? { ...base, background: 'transparent', color: tokens.gold }
    : { ...base, background: 'rgba(200,146,42,0.08)', color: tokens.gold }
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ ...styles, ...style }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}>
      {children}
    </button>
  )
}

function SaveAway({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', textDecorationColor: 'rgba(15,21,35,0.25)', textUnderlineOffset: '3px' }}>
      SAVE AND STEP AWAY
    </button>
  )
}

function ThinkingDots() {
  return (
    <div className="typing-indicator" style={{ display: 'flex', gap: '5px', padding: '8px 0' }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(200,146,42,0.5)', animation: 'tsBlink 1.2s 0.0s infinite' }} />
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(200,146,42,0.5)', animation: 'tsBlink 1.2s 0.2s infinite' }} />
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(200,146,42,0.5)', animation: 'tsBlink 1.2s 0.4s infinite' }} />
    </div>
  )
}

// ─── Auth modal ───────────────────────────────────────────────────────────────

function AuthModal() {
  const r = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: tokens.bg, border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '40px 32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <Eyebrow style={{ textAlign: 'center', marginBottom: '14px' }}>Target Stretch</Eyebrow>
        <h2 style={{ ...sc, fontSize: '1.5rem', fontWeight: 400, color: tokens.dark, marginBottom: '10px' }}>Sign in to begin.</h2>
        <p style={{ ...body, fontSize: '1.125rem', ...meta, lineHeight: 1.7, marginBottom: '24px' }}>
          Sign in and your stretch saves — come back to pick up where you left off.
        </p>
        <a href={`/login?redirect=${r}`} style={{ display: 'block', padding: '14px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: tokens.gold, ...sc, fontSize: '1.125rem', letterSpacing: '0.14em', textDecoration: 'none' }}>
          Sign in or create account →
        </a>
      </div>
    </div>
  )
}

// ─── Sprint Wheel (mini — three segments) ────────────────────────────────────

function SprintWheelMini({ domains, domainData, activeDomainId, onDomainClick, onCentreClick, spinDirection = 'next', size = 440 }) {
  const cx = size / 2, cy = size / 2
  const R  = size * 0.42
  const r  = size * 0.18
  const n  = domains.length || 3
  const sweep = 360 / n
  const GAP   = 1.8

  const WEDGE_FILLS  = ['rgba(200,146,42,0.12)', 'rgba(45,106,79,0.12)', 'rgba(45,74,106,0.12)']

  const [rot,     setRot]     = useState(0)
  const [settled, setSettled] = useState(false)
  const rotRef    = useRef(0)
  const targetRef = useRef(null)
  const animRef   = useRef(null)
  const lastRef   = useRef(null)
  const phase     = useRef('spinning')

  useEffect(() => {
    const startT   = Date.now()
    function animate(time) {
      if (!lastRef.current) lastRef.current = time
      const dt = Math.min((time - lastRef.current) / 1000, 0.05)
      lastRef.current = time
      if (phase.current === 'spinning') {
        const elapsed = (Date.now() - startT) / 1000
        const speed = Math.max(0.5, 3 * Math.exp(-elapsed * 0.9))
        rotRef.current = (rotRef.current + speed * dt * 360) % 360
        setRot(rotRef.current)
        if (elapsed > 2.5) {
          const idx = domains.findIndex(d => d.id === activeDomainId)
          const activeAngle = idx >= 0 ? -(idx * sweep + sweep / 2) + 90 : 0
          targetRef.current = ((activeAngle % 360) + 360) % 360
          phase.current = 'landing'
        }
      } else if (phase.current === 'landing') {
        let diff = ((targetRef.current - rotRef.current) % 360 + 360) % 360
        if (diff > 180) diff -= 360
        if (Math.abs(diff) < 0.5) {
          rotRef.current = targetRef.current
          setRot(targetRef.current)
          setSettled(true)
          phase.current = 'settled'
          return
        }
        rotRef.current = (rotRef.current + diff * 0.12 + (diff > 0 ? 0.3 : -0.3)) % 360
        setRot(rotRef.current)
      }
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  useEffect(() => {
    if (!settled) return
    const idx = domains.findIndex(d => d.id === activeDomainId)
    const target = idx >= 0 ? ((-(idx * sweep + sweep / 2) + 90) % 360 + 360) % 360 : 0
    targetRef.current = target
    phase.current = 'landing'
    function animate(time) {
      if (!lastRef.current) lastRef.current = time
      const dt = Math.min((time - lastRef.current) / 1000, 0.05)
      lastRef.current = time
      if (phase.current === 'landing') {
        let diff = ((targetRef.current - rotRef.current) % 360 + 360) % 360
        if (diff > 180) diff -= 360
        if (Math.abs(diff) < 0.5) { rotRef.current = targetRef.current; setRot(targetRef.current); phase.current = 'settled'; return }
        rotRef.current = (rotRef.current + diff * 0.14 + (diff > 0 ? 0.4 : -0.4)) % 360
        setRot(rotRef.current)
        animRef.current = requestAnimationFrame(animate)
      }
    }
    cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(animate)
  }, [activeDomainId, settled])

  function navigateTo(domainId) {
    if (domainId !== activeDomainId) onDomainClick(domainId)
  }

  function wedgePath(idx, rotDeg = 0) {
    const base = (rotDeg * Math.PI) / 180
    const s = (-90 + idx * sweep + GAP) * Math.PI / 180 + base
    const e = (-90 + idx * sweep + sweep - GAP) * Math.PI / 180 + base
    const x1 = cx + R * Math.cos(s), y1 = cy + R * Math.sin(s)
    const x2 = cx + R * Math.cos(e), y2 = cy + R * Math.sin(e)
    const xi1 = cx + r * Math.cos(s), yi1 = cy + r * Math.sin(s)
    const xi2 = cx + r * Math.cos(e), yi2 = cy + r * Math.sin(e)
    return `M${xi1},${yi1} L${x1},${y1} A${R},${R},0,0,1,${x2},${y2} L${xi2},${yi2} A${r},${r},0,0,0,${xi1},${yi1} Z`
  }

  function labelPos(idx, rotDeg = 0) {
    const base = (rotDeg * Math.PI) / 180
    const mid = (-90 + idx * sweep + sweep / 2) * Math.PI / 180 + base
    const mr = (R + r) / 2 + size * 0.012
    return { x: cx + mr * Math.cos(mid), y: cy + mr * Math.sin(mid) }
  }

  function stepsComplete(domainId) {
    const dd = domainData[domainId] || {}
    return STEPS.filter(s => {
      if (s === 'current_state') return !!dd.currentStateSummary
      if (s === 'horizon')       return !!dd.horizonText
      if (s === 'target_goal')   return !!dd.targetGoal
      if (s === 'milestones')    return dd.milestones?.length > 0
      if (s === 'tasks')         return dd.tasks?.length > 0
      return false
    }).length
  }

  const allComplete = domains.every(d => stepsComplete(d.id) >= STEPS.length)

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="Target Stretch domain wheel">
      {domains.map((d, i) => {
        const isActive = d.id === activeDomainId
        const done     = stepsComplete(d.id) >= STEPS.length
        const lp       = labelPos(i, rot)
        const fill     = isActive ? 'rgba(200,146,42,0.22)' : WEDGE_FILLS[i % WEDGE_FILLS.length]
        const stroke   = isActive ? GOLD_C : 'rgba(200,146,42,0.25)'
        const domainColour = DOMAIN_COLORS[d.id]?.base || GOLD_C
        return (
          <g key={d.id} onClick={() => navigateTo(d.id)} style={{ cursor: 'pointer' }}>
            <path d={wedgePath(i, rot)} fill={fill} stroke={isActive ? domainColour : stroke} strokeWidth={isActive ? 1.8 : 1} />
            {done && (
              <text x={lp.x} y={lp.y - size * 0.025} textAnchor="middle" fill={tokens.gold}
                style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: size * 0.031, letterSpacing: '0.1em' }}>
                ✓
              </text>
            )}
            <text x={lp.x} y={lp.y + (done ? size * 0.014 : size * 0.018)} textAnchor="middle"
              fill={isActive ? tokens.dark : 'rgba(15,21,35,0.65)'}
              style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: size * 0.038, letterSpacing: '0.08em', fontWeight: isActive ? '500' : '400' }}>
              {d.label}
            </text>
          </g>
        )
      })}
      <circle cx={cx} cy={cy} r={r - 2} fill={tokens.bg} stroke="rgba(200,146,42,0.22)" strokeWidth="1" style={{ cursor: 'pointer' }} onClick={onCentreClick} />
      <text x={cx} y={cy - size * 0.022} textAnchor="middle" fill={allComplete ? tokens.gold : 'rgba(200,146,42,0.55)'}
        style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: size * 0.034, letterSpacing: '0.1em', cursor: 'pointer' }}
        onClick={onCentreClick}>
        {allComplete ? 'REVIEW' : 'TARGET'}
      </text>
      <text x={cx} y={cy + size * 0.026} textAnchor="middle" fill="rgba(200,146,42,0.45)"
        style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: size * 0.03, letterSpacing: '0.08em', cursor: 'pointer' }}
        onClick={onCentreClick}>
        STRETCH
      </text>
    </svg>
  )
}

// ─── Centre modal (setup progress) ───────────────────────────────────────────

function SprintCentreModal({ domains, domainData, activeDomainId, onClose, onGoToDomain }) {
  function stepsComplete(domainId) {
    const dd = domainData[domainId] || {}
    return {
      current_state: !!dd.currentStateSummary,
      horizon:       !!dd.horizonText,
      target_goal:   !!dd.targetGoal,
      milestones:    dd.milestones?.length > 0,
      tasks:         dd.tasks?.length > 0,
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: tokens.bg, border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '36px 32px', maxWidth: '440px', width: '100%', maxHeight: '80dvh', overflowY: 'auto' }}>
        <Eyebrow>Target Stretch</Eyebrow>
        <h2 style={{ ...sc, fontSize: '1.375rem', fontWeight: 400, color: tokens.dark, marginBottom: '6px', lineHeight: 1.1 }}>What's still to do.</h2>
        <p style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.7, marginBottom: '24px' }}>
          {domains.filter(d => Object.values(stepsComplete(d.id)).every(Boolean)).length} of {domains.length} areas complete.
        </p>
        {domains.map(d => {
          const steps   = stepsComplete(d.id)
          const allDone = Object.values(steps).every(Boolean)
          const colour  = DOMAIN_COLORS[d.id]?.base || tokens.goldChrome
          return (
            <div key={d.id} style={{ marginBottom: '12px', padding: '14px 16px', border: `1px solid ${allDone ? 'rgba(200,146,42,0.35)' : 'rgba(200,146,42,0.18)'}`, borderLeft: `3px solid ${colour}`, borderRadius: '10px', background: allDone ? 'rgba(200,146,42,0.05)' : tokens.bgCard }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: allDone ? 0 : '10px' }}>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: allDone ? tokens.gold : tokens.dark, textTransform: 'uppercase' }}>
                  {allDone ? '✓ ' : ''}{d.label}
                </span>
                {!allDone && (
                  <button type="button" onClick={() => { onGoToDomain(d.id); onClose() }}
                    style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', ...gold, background: 'none', border: '1px solid rgba(200,146,42,0.4)', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer' }}>
                    Go →
                  </button>
                )}
              </div>
              {!allDone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {Object.entries(steps).map(([key, done]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: `1px solid ${done ? GOLD_C : 'rgba(200,146,42,0.25)'}`, background: done ? GOLD_C : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {done && <span style={{ color: '#FFFFFF', fontSize: '11px' }}>✓</span>}
                      </span>
                      <span style={{ ...body, fontSize: '1.0625rem', color: done ? 'rgba(15,21,35,0.55)' : meta.color, textDecoration: done ? 'line-through' : 'none' }}>
                        {STEP_LABELS[key]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <button type="button" onClick={onClose} style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '8px' }}>
          Continue where I am
        </button>
      </div>
    </div>
  )
}

// ─── Setup progress bar ───────────────────────────────────────────────────────

function SetupStatusBar({ domains, domainData }) {
  const total    = domains.length * STEPS.length
  const complete = domains.reduce((acc, d) => {
    const dd = domainData[d.id] || {}
    return acc + STEPS.filter(s => {
      if (s === 'current_state') return !!dd.currentStateSummary
      if (s === 'horizon')       return !!dd.horizonText
      if (s === 'target_goal')   return !!dd.targetGoal
      if (s === 'milestones')    return dd.milestones?.length > 0
      if (s === 'tasks')         return dd.tasks?.length > 0
      return false
    }).length
  }, 0)
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase' }}>Stretch Setup</span>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', ...muted }}>{complete} / {total}</span>
      </div>
      <div style={{ height: '3px', background: 'rgba(200,146,42,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: GOLD_C, transition: 'width 0.6s ease', borderRadius: '2px' }} />
      </div>
    </div>
  )
}

// ─── Step strip ───────────────────────────────────────────────────────────────

function StepStrip({ domainId, domainData, activeStep, onStepClick }) {
  const dd = domainData[domainId] || {}

  function isUnlocked(step) {
    const idx = STEPS.indexOf(step)
    if (idx === 0) return true
    const prev = STEPS[idx - 1]
    if (prev === 'current_state') return !!dd.currentStateSummary
    if (prev === 'horizon')       return !!dd.horizonText
    if (prev === 'target_goal')   return !!dd.targetGoal
    if (prev === 'milestones')    return dd.milestones?.length > 0
    return false
  }

  function isComplete(step) {
    if (step === 'current_state') return !!dd.currentStateSummary
    if (step === 'horizon')       return !!dd.horizonText
    if (step === 'target_goal')   return !!dd.targetGoal
    if (step === 'milestones')    return dd.milestones?.length > 0
    if (step === 'tasks')         return dd.tasks?.length > 0
    return false
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '22px' }}>
      {STEPS.map((step, i) => {
        const done     = isComplete(step)
        const unlocked = isUnlocked(step)
        const active   = step === activeStep
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <button type="button"
              onClick={() => unlocked && onStepClick(step)}
              disabled={!unlocked}
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase',
                background: 'none', border: 'none', padding: '4px 0', cursor: unlocked ? 'pointer' : 'default',
                color: done ? tokens.gold : active ? tokens.gold : unlocked ? 'rgba(200,146,42,0.5)' : 'rgba(200,146,42,0.18)',
                whiteSpace: 'nowrap', flexShrink: 0,
                borderBottom: active ? `1.5px solid ${GOLD_C}` : 'none',
              }}>
              {done ? '✓ ' : ''}{STEP_LABELS[step]}
            </button>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: '1px', background: done ? 'rgba(200,146,42,0.35)' : 'rgba(200,146,42,0.1)', margin: '0 6px', minWidth: '8px', transition: 'background 0.4s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Accomplishment Tally ─────────────────────────────────────────────────────

export function AccomplishmentTally({ domains, domainData, onCheck }) {
  const [celebration, setCelebration] = useState(null)

  function handleCheck(domainId, type, milestoneIdx, taskIdx, checked) {
    if (checked) {
      const msgs = { goal: '✦ Goal reached. Next play.', milestone: '✦ Milestone complete. Keep moving.', task: '· Done.' }
      setCelebration({ text: msgs[type] || '✓', type })
      setTimeout(() => setCelebration(null), 2200)
    }
    onCheck(domainId, type, milestoneIdx, taskIdx, checked)
  }

  const totals = domains.reduce((acc, d) => {
    const dd = domainData[d.id] || {}
    if (!dd.targetGoal) return acc
    const tasks = dd.tasks || []
    const milestones = dd.milestones || []
    acc.tasks += tasks.length
    acc.tasksDone += tasks.filter((_, i) => dd.taskChecked?.[i]).length
    acc.milestones += milestones.length
    acc.milestonesDone += milestones.filter((_, i) => dd.milestoneChecked?.[i]).length
    return acc
  }, { tasks: 0, tasksDone: 0, milestones: 0, milestonesDone: 0 })

  const pct = totals.tasks > 0 ? Math.round((totals.tasksDone / totals.tasks) * 100) : 0

  return (
    <div style={{ background: tokens.bgCard, border: '1px solid rgba(200,146,42,0.18)', borderRadius: '12px', padding: '20px 22px', marginTop: '28px', position: 'relative' }}>
      {celebration && (
        <div style={{ position: 'absolute', top: '-44px', left: '50%', transform: 'translateX(-50%)', background: tokens.dark, color: tokens.bg, borderRadius: '8px', padding: '8px 18px', whiteSpace: 'nowrap', ...sc, fontSize: '15px', letterSpacing: '0.14em', animation: 'tsFadeUp 0.3s ease both', zIndex: 10 }}>
          {celebration.text}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <Eyebrow style={{ marginBottom: 0 }}>Stretch Progress</Eyebrow>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: tokens.gold }}>{totals.tasksDone}/{totals.tasks} tasks</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(200,146,42,0.12)', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: GOLD_C, borderRadius: '2px', transition: 'width 0.6s ease' }} />
      </div>
      {domains.map(d => {
        const dd = domainData[d.id] || {}
        if (!dd.targetGoal) return null
        const milestones   = dd.milestones || []
        const tasks        = dd.tasks || []
        const colour       = DOMAIN_COLORS[d.id]?.base || GOLD_C

        return (
          <div key={d.id} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
            <div style={{ borderLeft: `3px solid ${colour}`, paddingLeft: '12px', marginBottom: '10px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.gold, textTransform: 'uppercase', marginBottom: '4px' }}>{d.label}</div>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!dd.goalChecked}
                  onChange={e => handleCheck(d.id, 'goal', null, null, e.target.checked)}
                  style={{ marginTop: '4px', accentColor: GOLD_C, flexShrink: 0, width: '16px', height: '16px' }} />
                <span style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.6, textDecoration: dd.goalChecked ? 'line-through' : 'none', opacity: dd.goalChecked ? 0.45 : 1, transition: 'all 0.3s' }}>
                  {dd.targetGoal}
                </span>
              </label>
            </div>
            {milestones.map((m, mi) => {
              const mDone  = !!dd.milestoneChecked?.[mi]
              const mTasks = tasks.filter(t => t.milestone === mi)
              return (
                <div key={mi} style={{ marginLeft: '26px', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '6px' }}>
                    <input type="checkbox" checked={mDone}
                      onChange={e => handleCheck(d.id, 'milestone', mi, null, e.target.checked)}
                      style={{ marginTop: '3px', accentColor: GOLD_C, flexShrink: 0, width: '15px', height: '15px' }} />
                    <div>
                      <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: tokens.gold, textTransform: 'uppercase', marginBottom: '1px' }}>Month {mi + 1}</div>
                      <div style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.55, textDecoration: mDone ? 'line-through' : 'none', opacity: mDone ? 0.45 : 1, transition: 'all 0.3s' }}>
                        {m.text}
                      </div>
                    </div>
                  </label>
                  {mTasks.map((t, ti) => {
                    const globalIdx = tasks.findIndex(x => x === t)
                    const tDone = !!dd.taskChecked?.[globalIdx]
                    return (
                      <label key={ti} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginLeft: '26px', marginBottom: '5px' }}>
                        <input type="checkbox" checked={tDone}
                          onChange={e => handleCheck(d.id, 'task', mi, globalIdx, e.target.checked)}
                          style={{ marginTop: '3px', accentColor: GOLD_C, flexShrink: 0, width: '14px', height: '14px' }} />
                        <span style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.55, textDecoration: tDone ? 'line-through' : 'none', opacity: tDone ? 0.38 : 1, transition: 'all 0.3s' }}>
                          {t.text}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ─── Sprint Summary Modal ─────────────────────────────────────────────────────

function SprintSummaryModal({ domains, domainData, onClose, onComplete }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: tokens.bg, border: '1.5px solid rgba(200,146,42,0.3)', borderRadius: '14px', padding: '32px 28px', maxWidth: '520px', width: '100%', maxHeight: '80dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Eyebrow style={{ marginBottom: 0 }}>Your Target Stretch</Eyebrow>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '1.1rem', ...muted, padding: '4px' }}>×</button>
        </div>
        {domains.map(d => {
          const dd      = domainData[d.id] || {}
          const colour  = DOMAIN_COLORS[d.id]?.base || GOLD_C
          if (!dd.targetGoal) return (
            <div key={d.id} style={{ padding: '14px 0', borderTop: '1px solid rgba(200,146,42,0.1)' }}>
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase', marginBottom: '4px' }}>{d.label}</div>
              <div style={{ ...body, fontSize: '1.0625rem', ...muted }}>Not yet set.</div>
            </div>
          )
          return (
            <div key={d.id} style={{ padding: '14px 0', borderTop: '1px solid rgba(200,146,42,0.1)' }}>
              <div style={{ borderLeft: `3px solid ${colour}`, paddingLeft: '14px' }}>
                <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>{d.label}</div>
                {dd.horizonText && (
                  <div style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.6, marginBottom: '6px' }}>
                    Horizon: {dd.horizonText}
                  </div>
                )}
                <div style={{ ...body, fontSize: '1.125rem', ...meta, lineHeight: 1.65 }}>{dd.targetGoal}</div>
              </div>
            </div>
          )
        })}
        <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1.5px solid rgba(200,146,42,0.20)', textAlign: 'center' }}>
          <Btn onClick={onComplete} style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}>
            View my stretch →
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({ mode, domainId, payload, onComplete, placeholder, userId }) {
  const [msgs,        setMsgs]        = useState([])
  const [input,       setInput]       = useState('')
  const [thinking,    setThinking]    = useState(false)
  const [pendingData, setPendingData] = useState(null)
  const startedRef = useRef(false)
  const bottomRef  = useRef(null)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    startConversation()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [msgs, thinking])

  async function startConversation() {
    setThinking(true)
    try {
      const res  = await fetch('/tools/target-sprint/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, domainId, payload, userId, messages: [] }) })
      const data = await res.json()
      setMsgs([{ role: 'assistant', content: data.message }])
    } catch { setMsgs([{ role: 'assistant', content: 'Something went wrong. Try refreshing.' }]) }
    setThinking(false)
  }

  async function send() {
    if (!input.trim() || thinking) return
    const userMsg = { role: 'user', content: input.trim() }
    setInput('')
    const updated = [...msgs, userMsg]
    setMsgs(updated)
    setThinking(true)
    try {
      const res  = await fetch('/tools/target-sprint/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, domainId, payload, userId, messages: updated }) })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'assistant', content: data.message }])
      if (data.canLock) setPendingData(data)
    } catch { setMsgs(m => [...m, { role: 'assistant', content: 'Something went wrong.' }]) }
    setThinking(false)
  }

  return (
    <div>
      <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ padding: '12px 16px', borderRadius: '10px', background: m.role === 'user' ? 'rgba(200,146,42,0.07)' : tokens.bgCard, border: '1px solid rgba(200,146,42,0.15)', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7 }}>
            {m.content}
          </div>
        ))}
        {thinking && <div style={{ padding: '12px 16px' }}><ThinkingDots /></div>}
        <div ref={bottomRef} />
      </div>
      {pendingData ? (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Btn onClick={() => onComplete(pendingData)}>Save this →</Btn>
          <Btn variant="ghost" onClick={() => setPendingData(null)}>Keep refining</Btn>
        </div>
      ) : (
        <div className="input-area" style={{ display: 'flex', gap: '10px' }}>
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={placeholder}
            rows={2}
            style={{ flex: 1, ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(200,146,42,0.3)', borderRadius: '8px', padding: '10px 14px', resize: 'none', outline: 'none', background: tokens.bg }}
          />
          <button type="button" className="btn-send" onClick={send} disabled={!input.trim() || thinking}
            style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: tokens.gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '8px', padding: '0 18px', cursor: 'pointer', opacity: (!input.trim() || thinking) ? 0.4 : 1 }}>
            Send
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Editable list ────────────────────────────────────────────────────────────

function EditableList({ items, onSave, renderItem, addLabel = '+ Add', itemKey = 'text' }) {
  const [editing, setEditing] = useState(false)
  const [local,   setLocal]   = useState(items)

  useEffect(() => setLocal(items), [items])

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)}
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
        Edit
      </button>
    )
  }

  return (
    <div>
      {local.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
          <textarea
            value={item[itemKey]} rows={2}
            onChange={e => setLocal(l => l.map((x, j) => j === i ? { ...x, [itemKey]: e.target.value } : x))}
            style={{ flex: 1, ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(200,146,42,0.3)', borderRadius: '6px', padding: '8px 10px', resize: 'vertical', outline: 'none', background: tokens.bg }}
          />
          <button type="button" onClick={() => setLocal(l => l.filter((_, j) => j !== i))}
            style={{ ...sc, fontSize: '13px', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '6px', flexShrink: 0 }}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
        <button type="button" onClick={() => setLocal(l => [...l, { [itemKey]: '' }])}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.gold, background: 'none', border: '1px solid rgba(200,146,42,0.4)', borderRadius: '20px', padding: '5px 14px', cursor: 'pointer' }}>
          {addLabel}
        </button>
        <Btn onClick={() => { onSave(local.filter(x => x[itemKey]?.trim())); setEditing(false) }} style={{ padding: '5px 14px', fontSize: '13px' }}>Save</Btn>
        <Btn variant="ghost" onClick={() => { setLocal(items); setEditing(false) }} style={{ padding: '5px 14px', fontSize: '13px' }}>Cancel</Btn>
      </div>
    </div>
  )
}

// ─── Sprint coach ─────────────────────────────────────────────────────────────

function SprintCoach({ sprintContext, userId }) {
  const [msgs,     setMsgs]     = useState([])
  const [input,    setInput]    = useState('')
  const [thinking, setThinking] = useState(false)
  const startedRef = useRef(false)
  const bottomRef  = useRef(null)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    init()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [msgs, thinking])

  async function init() {
    setThinking(true)
    try {
      const res  = await fetch('/tools/target-sprint/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'coach', sprintContext, userId, messages: [] }) })
      const data = await res.json()
      setMsgs([{ role: 'assistant', content: data.message }])
    } catch { setMsgs([{ role: 'assistant', content: 'Something went wrong.' }]) }
    setThinking(false)
  }

  async function send() {
    if (!input.trim() || thinking) return
    const userMsg = { role: 'user', content: input.trim() }
    setInput('')
    const updated = [...msgs, userMsg]
    setMsgs(updated)
    setThinking(true)
    try {
      const res  = await fetch('/tools/target-sprint/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'coach', sprintContext, userId, messages: updated }) })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'assistant', content: data.message }])
    } catch { setMsgs(m => [...m, { role: 'assistant', content: 'Something went wrong.' }]) }
    setThinking(false)
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ padding: '12px 16px', borderRadius: '10px', background: m.role === 'user' ? 'rgba(200,146,42,0.07)' : tokens.bgCard, border: '1px solid rgba(200,146,42,0.15)', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7 }}>
            {m.content}
          </div>
        ))}
        {thinking && <div style={{ padding: '12px 16px' }}><ThinkingDots /></div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask anything about this domain or your stretch…"
          rows={2}
          style={{ flex: 1, ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(200,146,42,0.3)', borderRadius: '8px', padding: '10px 14px', resize: 'none', outline: 'none', background: tokens.bg }}
        />
        <button type="button" onClick={send} disabled={!input.trim() || thinking}
          style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: tokens.gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '8px', padding: '0 18px', cursor: 'pointer', opacity: (!input.trim() || thinking) ? 0.4 : 1 }}>
          Send
        </button>
      </div>
    </div>
  )
}

// ─── Domain panel ─────────────────────────────────────────────────────────────

function DomainPanel({ domainId, domainData, setDomainData, hasMapData, mapData, targetDate, endDateLabel, completedDomains, userId, sprintDomains, onSaveAway }) {
  const d  = DOMAIN_BY_ID[domainId]
  const dd = domainData[domainId] || {}
  const colour = DOMAIN_COLORS[domainId]?.base || GOLD_C

  const activeStep = d ? (STEPS.find(s => {
    if (s === 'current_state') return !dd.currentStateSummary
    if (s === 'horizon')       return !dd.horizonText
    if (s === 'target_goal')   return !dd.targetGoal
    if (s === 'milestones')    return !dd.milestones?.length
    if (s === 'tasks')         return !dd.tasks?.length
    return true
  }) || 'tasks') : 'current_state'

  const [viewStep,   setViewStep]   = useState(activeStep)
  const [generating, setGenerating] = useState(false)
  const isSetup = !dd.tasks?.length

  useEffect(() => { if (isSetup) setViewStep(activeStep) }, [activeStep])

  if (!domainId || !d) return null

  function update(patch) {
    setDomainData(prev => ({ ...prev, [domainId]: { ...(prev[domainId] || {}), ...patch } }))
  }

  async function generateMilestones() {
    setGenerating(true)
    try {
      const res  = await fetch('/tools/target-sprint/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'milestones', domain: domainId, targetGoal: dd.targetGoal, horizonText: dd.horizonText, currentStateSummary: dd.currentStateSummary, userId }) })
      const data = await res.json()
      if (data.milestones) update({ milestones: data.milestones })
    } catch {}
    setGenerating(false)
  }

  async function generateTasks(milestoneIdx) {
    setGenerating(true)
    try {
      const res  = await fetch('/tools/target-sprint/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'tasks', domain: domainId, targetGoal: dd.targetGoal, milestoneText: dd.milestones?.[milestoneIdx]?.text, milestoneIndex: milestoneIdx, userId }) })
      const data = await res.json()
      if (data.tasks) {
        const existing = (dd.tasks || []).filter(t => t.milestone !== milestoneIdx)
        const newTasks = data.tasks.map(t => ({ ...t, milestone: milestoneIdx }))
        update({ tasks: [...existing, ...newTasks] })
      }
    } catch {}
    setGenerating(false)
  }

  const mapDomain = mapData?.domainData?.[domainId] || {}

  return (
    <div>
      {/* Domain header with colour rule */}
      <div style={{ borderLeft: `3px solid ${colour}`, paddingLeft: '16px', marginBottom: '20px' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: tokens.gold, marginBottom: '2px', textTransform: 'uppercase' }}>{d.label}</div>
        <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.65, margin: 0 }}>{d.description}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <StepStrip domainId={domainId} domainData={domainData} activeStep={viewStep === 'coach' ? null : viewStep} onStepClick={setViewStep} />
        </div>
        {dd.tasks?.length > 0 && (
          <button type="button"
            onClick={() => setViewStep(viewStep === 'coach' ? 'tasks' : 'coach')}
            style={{ flexShrink: 0, marginLeft: '12px', ...sc, fontSize: '13px', letterSpacing: '0.14em', color: viewStep === 'coach' ? '#FFFFFF' : tokens.gold, background: viewStep === 'coach' ? tokens.gold : 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '20px', padding: '5px 14px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
            {viewStep === 'coach' ? '← Plan' : 'Coach →'}
          </button>
        )}
      </div>

      {/* Step: Current State */}
      {viewStep === 'current_state' && (
        <div>
          <h3 style={{ ...sc, fontSize: '1.0625rem', fontWeight: 400, color: tokens.dark, marginBottom: '6px' }}>Where you are</h3>
          <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
            Where are you right now in {d.label}, and why is this a pivotal area for you this quarter?
          </p>
          {hasMapData && (mapDomain.realityFinal || mapDomain.realityDraft) && !dd.currentStateSummary && (
            <div style={{ padding: '12px 16px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', marginBottom: '14px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>From your Map</div>
              <div style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.65, marginBottom: '10px' }}>{mapDomain.realityFinal || mapDomain.realityDraft}</div>
              <Btn onClick={() => update({ currentStateSummary: mapDomain.realityFinal || mapDomain.realityDraft, currentStateFromMap: true })} style={{ padding: '8px 18px', fontSize: '13px' }}>
                Use this →
              </Btn>
            </div>
          )}
          {dd.currentStateSummary ? (
            <div>
              <div style={{ padding: '14px 16px', background: tokens.bgCard, border: '1px solid rgba(200,146,42,0.2)', borderLeft: `3px solid ${colour}`, borderRadius: '8px', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7, marginBottom: '14px' }}>
                {dd.currentStateSummary}
              </div>
              <EditableList items={[{ text: dd.currentStateSummary }]} onSave={items => update({ currentStateSummary: items[0]?.text || dd.currentStateSummary })} renderItem={() => null} itemKey="text" />
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Btn onClick={() => setViewStep('horizon')}>Set horizon →</Btn>
                <SaveAway onClick={onSaveAway} />
              </div>
            </div>
          ) : !hasMapData || !(mapDomain.realityFinal || mapDomain.realityDraft) ? (
            <ChatPanel mode="current_state" domainId={domainId} payload={{}} placeholder={`Where are you with ${d.label} right now?`} userId={userId}
              onComplete={data => { if (data.canLock && data.summary) update({ currentStateSummary: data.summary }) }} />
          ) : null}
        </div>
      )}

      {/* Step: Horizon */}
      {viewStep === 'horizon' && (
        <div>
          <h3 style={{ ...sc, fontSize: '1.0625rem', fontWeight: 400, color: tokens.dark, marginBottom: '6px' }}>Horizon</h3>
          <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
            Where do you wish you were in this area? Not a 90-day target — the honest version of your best life here.
          </p>
          {hasMapData && mapDomain.horizonText && mapDomain.horizonText !== 'See sub-domain horizons' && !dd.horizonText && (
            <div style={{ padding: '12px 16px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', marginBottom: '14px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>From your Map</div>
              <div style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.65, marginBottom: '10px' }}>{mapDomain.horizonText}</div>
              <Btn onClick={() => update({ horizonText: mapDomain.horizonText, horizonFromMap: true })} style={{ padding: '8px 18px', fontSize: '13px' }}>
                Use this →
              </Btn>
            </div>
          )}
          {dd.horizonText ? (
            <div>
              <div style={{ padding: '14px 16px', background: tokens.bgCard, border: '1px solid rgba(200,146,42,0.2)', borderLeft: `3px solid ${colour}`, borderRadius: '8px', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7, marginBottom: '14px' }}>
                {dd.horizonText}
              </div>
              <EditableList items={[{ text: dd.horizonText }]} onSave={items => update({ horizonText: items[0]?.text || dd.horizonText })} renderItem={() => null} itemKey="text" />
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Btn onClick={() => setViewStep('target_goal')}>Set 90-day target →</Btn>
                <SaveAway onClick={onSaveAway} />
              </div>
            </div>
          ) : (
            <ChatPanel mode="horizon" domainId={domainId} payload={{ hasMapData, mapHorizonText: mapDomain.horizonText, mapHorizonScore: mapDomain.horizonScore }} placeholder="Describe where you'd wish to be…" userId={userId}
              onComplete={data => { if (data.canLock && data.horizonText) update({ horizonText: data.horizonText }) }} />
          )}
        </div>
      )}

      {/* Step: Target Goal */}
      {viewStep === 'target_goal' && (
        <div>
          <h3 style={{ ...sc, fontSize: '1.0625rem', fontWeight: 400, color: tokens.dark, marginBottom: '6px' }}>Target Goal</h3>
          <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '4px' }}>
            Where can you realistically get to in 90 days on the way to that horizon?
          </p>
          {dd.horizonText && (
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', ...muted, textTransform: 'uppercase', marginBottom: '14px' }}>
              Toward: <span style={{ ...body, fontSize: '1.0625rem', textTransform: 'none', letterSpacing: 0, color: 'rgba(15,21,35,0.78)' }}>{dd.horizonText}</span>
            </div>
          )}
          {dd.targetGoal ? (
            <div>
              <div style={{ padding: '14px 16px', background: tokens.bgCard, border: '1px solid rgba(200,146,42,0.2)', borderLeft: `3px solid ${colour}`, borderRadius: '8px', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7, marginBottom: '14px' }}>
                {dd.targetGoal}
              </div>
              <EditableList items={[{ text: dd.targetGoal }]} onSave={items => update({ targetGoal: items[0]?.text || dd.targetGoal })} renderItem={() => null} itemKey="text" />
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Btn onClick={() => setViewStep('milestones')}>Set milestones →</Btn>
                <SaveAway onClick={onSaveAway} />
              </div>
            </div>
          ) : (
            <ChatPanel mode="target_goal" domainId={domainId}
              payload={{ currentStateSummary: dd.currentStateSummary, horizonText: dd.horizonText, targetDate, completedDomains, todayDate: new Date().toISOString().slice(0, 10) }}
              placeholder="Describe your 90-day target…" userId={userId}
              onComplete={data => { if (data.canLock && data.targetGoal) update({ targetGoal: data.targetGoal }) }} />
          )}
        </div>
      )}

      {/* Step: Milestones */}
      {viewStep === 'milestones' && (
        <div>
          <h3 style={{ ...sc, fontSize: '1.0625rem', fontWeight: 400, color: tokens.dark, marginBottom: '6px' }}>Milestones</h3>
          <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
            Three monthly markers — concrete, meaningful, honest.
          </p>
          {dd.milestones?.length > 0 ? (
            <div>
              {dd.milestones.map((m, i) => (
                <div key={i} style={{ padding: '12px 16px', background: tokens.bgCard, border: '1px solid rgba(200,146,42,0.18)', borderLeft: `3px solid ${colour}`, borderRadius: '8px', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.65, marginBottom: '8px' }}>
                  <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: tokens.gold, textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Month {i + 1}</span>
                  {m.text}
                </div>
              ))}
              <EditableList items={dd.milestones} onSave={items => update({ milestones: items.map((x, i) => ({ ...x, order: i })) })} renderItem={() => null} itemKey="text" addLabel="+ Add milestone" />
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Btn onClick={() => setViewStep('tasks')}>Set tasks →</Btn>
                <SaveAway onClick={onSaveAway} />
              </div>
            </div>
          ) : generating ? (
            <div style={{ padding: '16px 0' }}><ThinkingDots /></div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Btn onClick={generateMilestones}>Generate milestones</Btn>
              <SaveAway onClick={onSaveAway} />
            </div>
          )}
        </div>
      )}

      {/* Step: Tasks */}
      {viewStep === 'tasks' && (
        <TasksStep dd={dd} domainId={domainId} targetDate={targetDate} generating={generating} update={update} generateTasks={generateTasks} colour={colour} onSaveAway={onSaveAway} />
      )}

      {/* Coach */}
      {viewStep === 'coach' && dd.tasks?.length > 0 && (() => {
        const sprintContext = {
          domain:        d.label, domainId,
          currentState:  dd.currentStateSummary, horizon: dd.horizonText,
          targetGoal:    dd.targetGoal, milestones: dd.milestones || [],
          tasks:         dd.tasks || [], endDateLabel,
          milestoneChecked: dd.milestoneChecked || {}, taskChecked: dd.taskChecked || {},
          goalChecked:   dd.goalChecked || false,
        }
        return <SprintCoach key={domainId + '-coach'} sprintContext={sprintContext} userId={userId} />
      })()}
    </div>
  )
}

// ─── Tasks step ───────────────────────────────────────────────────────────────

function TasksStep({ dd, domainId, targetDate, generating, update, generateTasks, colour, onSaveAway }) {
  const [calAdded,    setCalAdded]    = useState({})
  const [editingDate, setEditingDate] = useState(null)

  const domain = DOMAIN_BY_ID[domainId]?.label || domainId

  function defaultMilestoneDate(index) {
    if (!targetDate) return null
    const end = new Date(targetDate), d = new Date(end)
    d.setDate(d.getDate() - (2 - index) * 30)
    return d.toISOString().slice(0, 10)
  }

  function getMilestoneDate(m, index) { return m.date || defaultMilestoneDate(index) }
  function getTaskDate(task, mi) { if (task.date) return task.date; return getMilestoneDate((dd.milestones || [])[mi], mi) }

  function addCalEvent(title, date) {
    const start = date ? date.replace(/-/g, '') : ''
    const end   = start
    const url   = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(title)}&dates=${start}/${end}`
    window.open(url, '_blank')
    setCalAdded(c => ({ ...c, [title]: true }))
  }

  const milestones = dd.milestones || []
  const tasks      = dd.tasks || []

  if (!milestones.length) {
    return <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7 }}>Set milestones first to generate tasks.</p>
  }

  return (
    <div>
      <h3 style={{ ...sc, fontSize: '1.0625rem', fontWeight: 400, color: tokens.dark, marginBottom: '6px' }}>Tasks</h3>
      <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
        The concrete weekly actions that move each milestone forward.
      </p>

      {milestones.map((m, mi) => {
        const mDate  = getMilestoneDate(m, mi)
        const mTasks = tasks.filter(t => t.milestone === mi)

        return (
          <div key={mi} style={{ marginBottom: '20px' }}>
            <div style={{ borderLeft: `3px solid ${colour}`, paddingLeft: '14px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: tokens.gold, textTransform: 'uppercase' }}>Month {mi + 1}</span>
                {mDate && (
                  <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.08em', color: tokens.ghost }}>{new Date(mDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                )}
                <button type="button" onClick={() => addCalEvent(`${domain} — Month ${mi + 1} milestone`, mDate)}
                  style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: calAdded[`${domain} — Month ${mi + 1} milestone`] ? tokens.gold : tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {calAdded[`${domain} — Month ${mi + 1} milestone`] ? '✓ Added' : '+ Cal'}
                </button>
              </div>
              <p style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.6, margin: '4px 0 0' }}>{m.text}</p>
            </div>

            {mTasks.length > 0 ? (
              <div style={{ marginLeft: '17px' }}>
                {mTasks.map((t, ti) => {
                  const tDate = getTaskDate(t, mi)
                  return (
                    <div key={ti} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', padding: '10px 12px', background: tokens.bgCard, border: '1px solid rgba(200,146,42,0.12)', borderRadius: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.55 }}>{t.text}</div>
                        {tDate && (
                          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.08em', color: tokens.ghost }}>
                              {editingDate === `task-${mi}-${ti}` ? (
                                <input type="date" defaultValue={tDate} autoFocus
                                  onBlur={e => {
                                    const updated = tasks.map((x, i) => tasks.indexOf(t) === i ? { ...x, date: e.target.value || tDate } : x)
                                    update({ tasks: updated }); setEditingDate(null)
                                  }}
                                  style={{ ...sc, fontSize: '12px', letterSpacing: '0.08em', background: 'none', border: 'none', color: tokens.ghost, cursor: 'pointer', outline: 'none', padding: 0 }} />
                              ) : (
                                <span onClick={() => setEditingDate(`task-${mi}-${ti}`)} style={{ cursor: 'pointer' }}>
                                  {new Date(tDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </span>
                            <button type="button" onClick={() => addCalEvent(`${domain}: ${t.text.slice(0, 60)}`, tDate)}
                              style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: calAdded[`${domain}: ${t.text.slice(0, 60)}`] ? tokens.gold : tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              {calAdded[`${domain}: ${t.text.slice(0, 60)}`] ? '✓ Added' : '+ Cal'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : generating ? (
              <div style={{ marginLeft: '17px', padding: '8px 0' }}><ThinkingDots /></div>
            ) : (
              <div style={{ marginLeft: '17px' }}>
                <Btn onClick={() => generateTasks(mi)} style={{ fontSize: '13px', padding: '6px 16px' }}>Generate tasks for Month {mi + 1}</Btn>
              </div>
            )}
          </div>
        )
      })}

      <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <SaveAway onClick={onSaveAway} />
      </div>
    </div>
  )
}

// ─── Setup phase: domain select ───────────────────────────────────────────────

function PhaseSelect({ hasMapData, scores, horizonScores, iaStatements = {}, selectedDomains, setSelectedDomains, recommendation, onContinue }) {
  const scoreFallbackRec = hasMapData && !recommendation?.recommended && Object.keys(scores).length > 0
    ? DOMAINS.filter(d => scores[d.id] !== undefined).sort((a, b) => scores[a.id] - scores[b.id]).slice(0, 3).map(d => d.id)
    : null

  return (
    <div style={{ maxWidth: '760px', padding: 'clamp(64px,8vw,96px) clamp(20px,5vw,40px) 80px', margin: '0 auto' }}>
      <Eyebrow>Target Stretch</Eyebrow>
      <h1 style={{ ...serif, fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 300, color: tokens.dark, lineHeight: 1.1, marginBottom: '10px' }}>
        Three areas. One quarter.
      </h1>
      <Rule />
      <p style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.75, marginBottom: '20px', maxWidth: '520px' }}>
        {hasMapData
          ? 'Your Map scores are loaded. The ☆ shows where the most leverage is right now. You have the final say.'
          : 'Choose the three areas where focused effort this quarter would matter most. Trust your instinct.'}
      </p>

      {recommendation?.soft_observation && (
        <div style={{ padding: '14px 18px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', ...body, fontSize: '1.0625rem', ...meta, marginBottom: '24px', lineHeight: 1.65 }}>
          {recommendation.soft_observation}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: '10px', marginBottom: '28px' }}>
        {DOMAINS.map(d => {
          const sel    = selectedDomains.includes(d.id)
          const isRec  = recommendation?.recommended?.includes(d.id) || scoreFallbackRec?.includes(d.id)
          const rat    = recommendation?.rationale?.[d.id]
          const s      = scores[d.id]
          const dis    = !sel && selectedDomains.length >= 3
          const col    = s !== undefined ? getColor(s) : null
          const colour = DOMAIN_COLORS[d.id]?.base || GOLD_C
          return (
            <div key={d.id}
              onClick={() => { if (dis) return; setSelectedDomains(p => p.includes(d.id) ? p.filter(x => x !== d.id) : [...p, d.id]) }}
              style={{ padding: '16px', border: `1.5px solid ${sel ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.2)'}`, borderLeft: sel ? `4px solid ${colour}` : '1.5px solid rgba(200,146,42,0.2)', borderRadius: '10px', background: sel ? 'rgba(200,146,42,0.06)' : tokens.bgCard, cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.45 : 1, transition: 'all 0.2s' }}
              onMouseEnter={e => { if (!dis) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,21,35,0.06)' } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              <div style={{ ...sc, fontSize: '1.125rem', letterSpacing: '0.08em', color: sel ? tokens.gold : tokens.dark, marginBottom: '4px' }}>
                {d.label}{isRec ? ' ☆' : ''}
              </div>
              <div style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.55, marginBottom: s !== undefined ? '10px' : 0 }}>
                {rat || d.description}
              </div>
              {s !== undefined && (
                <>
                  <div style={{ height: '2px', background: 'rgba(200,146,42,0.1)', borderRadius: '1px', overflow: 'hidden', marginBottom: '4px' }}>
                    <div style={{ height: '100%', width: `${s * 10}%`, background: col, borderRadius: '1px' }} />
                  </div>
                  <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: col }}>{s}</span>
                    <span style={{ color: tokens.ghost }}>→</span>
                    <span style={{ color: horizonScores[d.id] != null ? GOLD_C : 'rgba(200,146,42,0.3)' }}>{horizonScores[d.id] != null ? horizonScores[d.id] : '?'}</span>
                    <span style={{ color: col, marginLeft: '2px' }}>· {getTierLabel(s)}</span>
                  </div>
                  {iaStatements[d.id] && (
                    <div style={{ ...body, fontSize: '13px', color: tokens.ghost, lineHeight: 1.5, marginTop: '6px' }}>
                      {iaStatements[d.id]}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Pathways hook — when person selects focus domains, this is where
          the Pathways rail will later render for each chosen domain.
          Uncomment and import Pathways when ready.
      {selectedDomains.length > 0 && selectedDomains.map(id => (
        <Pathways key={id} domain={id} surface="target_stretch_setup" />
      ))} */}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn onClick={onContinue} disabled={selectedDomains.length !== 3}>Set my stretch →</Btn>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: tokens.ghost }}>{selectedDomains.length} / 3</span>
      </div>
    </div>
  )
}

// ─── Setup phase: timeline ────────────────────────────────────────────────────

function PhaseQuarter({ quarterType, setQuarterType, setTargetDate, setEndDateLabel, onContinue, onBack }) {
  const today = new Date(), month = today.getMonth()
  const rolling = new Date(today); rolling.setDate(rolling.getDate() + 90)
  let qEnd
  if (month < 3)      qEnd = new Date(today.getFullYear(), 2, 31)
  else if (month < 6) qEnd = new Date(today.getFullYear(), 5, 30)
  else if (month < 9) qEnd = new Date(today.getFullYear(), 8, 30)
  else                qEnd = new Date(today.getFullYear(), 11, 31)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const qL  = month < 3 ? 'Q1' : month < 6 ? 'Q2' : month < 9 ? 'Q3' : 'Q4'
  const calDays = Math.round((qEnd - today) / (1000 * 60 * 60 * 24))

  function select(t) {
    setQuarterType(t)
    if (t === 'rolling') { setTargetDate(rolling.toISOString().slice(0, 10)); setEndDateLabel(`90 days — ${fmt(rolling)}`) }
    else { setTargetDate(qEnd.toISOString().slice(0, 10)); setEndDateLabel(`${qL} end — ${fmt(qEnd)} (${calDays} days)`) }
  }

  return (
    <div style={{ maxWidth: '580px', padding: 'clamp(64px,8vw,96px) clamp(20px,5vw,40px) 80px', margin: '0 auto' }}>
      <Eyebrow>Target Stretch · Timeline</Eyebrow>
      <h2 style={{ ...serif, fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 300, color: tokens.dark, lineHeight: 1.15, marginBottom: '10px' }}>When does this stretch end?</h2>
      <Rule />
      <p style={{ ...body, fontSize: '1.125rem', ...meta, lineHeight: 1.75, marginBottom: '20px' }}>Both work. Choose the rhythm that fits your life.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        {[
          { type: 'rolling',  title: 'Rolling 90 days',  date: fmt(rolling), desc: 'Starts today. 90 days of focused movement.' },
          { type: 'calendar', title: 'Calendar quarter',  date: fmt(qEnd),    desc: `${qL} end — syncs with how the year flows.` },
        ].map(o => (
          <div key={o.type} onClick={() => select(o.type)}
            style={{ padding: '20px 22px', border: `1.5px solid ${quarterType === o.type ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.2)'}`, borderRadius: '12px', background: quarterType === o.type ? 'rgba(200,146,42,0.06)' : tokens.bgCard, cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ ...sc, fontSize: '1.125rem', letterSpacing: '0.08em', color: quarterType === o.type ? tokens.gold : tokens.dark, marginBottom: '3px' }}>{o.title}</div>
            <div style={{ ...sc, fontSize: '1rem', ...gold, marginBottom: '3px' }}>{o.date}</div>
            <div style={{ ...body, fontSize: '1.0625rem', ...muted }}>{o.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button type="button" onClick={onBack} style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>← Back</button>
        <Btn onClick={onContinue} disabled={!quarterType}>Lock this in →</Btn>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TargetSprintPage() {
  const { user, loading: authLoading } = useAuth()
  const { tier, loading: accessLoading } = useAccess('target-sprint')

  const [phase,           setPhase]           = useState('select')
  const [hasMapData,      setHasMapData]       = useState(false)
  const [mapData,         setMapData]          = useState(null)
  const [scores,          setScores]           = useState({})
  const [horizonScores,   setHorizonScores]    = useState({})
  const [iaStatements,    setIaStatements]     = useState({})
  const [selectedDomains, setSelectedDomains]  = useState([])
  const [quarterType,     setQuarterType]      = useState(null)
  const [targetDate,      setTargetDate]       = useState(null)
  const [endDateLabel,    setEndDateLabel]     = useState(null)
  const [recommendation,  setRecommendation]   = useState(null)
  const [sessionId,       setSessionId]        = useState(null)
  const [activeDomainId,  setActiveDomainId]   = useState(null)
  const [showSummary,     setShowSummary]      = useState(false)
  const [showCentreModal, setShowCentreModal]  = useState(false)
  const [spinDir,         setSpinDir]          = useState('next')
  const [showSprintDone,  setShowSprintDone]   = useState(false)
  const [showDebrief,     setShowDebrief]      = useState(false)
  const [domainData,      setDomainData]       = useState({})
  const loadedRef = useRef(false)

  // Auto-save via shared hook — same whisper pattern as HorizonSelfOnboarding
  const saveFn = useCallback(async () => { await saveToSupabase() }, [])
  const { queue: queueSave, whisper } = useAutoSave(saveFn, 1500)

  useEffect(() => { loadedRef.current = false }, [user?.id])

  useEffect(() => {
    if (!user || loadedRef.current) return
    loadedRef.current = true
    loadSprintData()
    loadMapData()
  }, [user])

  async function loadSprintData() {
    try {
      const { data } = await supabase
        .from('target_sprint_sessions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'draft'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data?.domains?.length) {
        setSessionId(data.id)
        setSelectedDomains(data.domains)
        setDomainData(data.domain_data || {})
        setQuarterType(data.quarter_type || null)
        setTargetDate(data.target_date || null)
        setEndDateLabel(data.end_date_label || null)
        setHasMapData(data.has_map_data || false)
        if (data.scores_at_start) setScores(data.scores_at_start)
        setActiveDomainId(data.active_domain_id || data.domains[0] || null)
        const restoredPhase = data.session_phase || (data.status === 'active' ? 'sprint' : 'select')
        setPhase(restoredPhase)
        return
      }
    } catch {}
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.phase && saved.phase !== 'select') {
          setPhase(saved.phase); setSelectedDomains(saved.selectedDomains || [])
          setQuarterType(saved.quarterType || null); setTargetDate(saved.targetDate || null)
          setEndDateLabel(saved.endDateLabel || null); setDomainData(saved.domainData || {})
          const validId = saved.activeDomainId && DOMAIN_BY_ID[saved.activeDomainId] ? saved.activeDomainId : (saved.selectedDomains?.find(id => DOMAIN_BY_ID[id]) || null)
          setActiveDomainId(validId)
        }
      }
    } catch {}
  }

  useEffect(() => {
    if (phase === 'select' && !selectedDomains.length) return
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ phase, selectedDomains, quarterType, targetDate, endDateLabel, domainData, activeDomainId }))
    } catch {}
  }, [phase, selectedDomains, quarterType, targetDate, endDateLabel, domainData, activeDomainId])

  async function loadMapData() {
    try {
      const { data } = await supabase.from('map_results').select('session, completed_at, complete').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      if (data?.session?.domainData) {
        const s = {}, h = {}
        Object.entries(data.session.domainData).forEach(([id, d]) => {
          if (!d || typeof d !== 'object') return
          if (d?.currentScore !== undefined) s[id] = d.currentScore; else if (d?.score !== undefined) s[id] = d.score
          if (d?.horizonScore !== undefined) h[id] = d.horizonScore
        })
        if (Object.keys(s).length >= 4) { setMapData(data.session); setHasMapData(true); setScores(s); setHorizonScores(h); getRecommendation(s, true) }
      }
      if (user?.id) {
        const { data: iaRows } = await supabase.from('horizon_profile').select('domain, ia_statement').eq('user_id', user.id)
        if (iaRows) { const map = {}; iaRows.forEach(r => { if (r.ia_statement) map[r.domain] = r.ia_statement }); setIaStatements(map) }
      }
    } catch {}
  }

  async function getRecommendation(s, hmd = false) {
    if (!s || Object.keys(s).length === 0) return
    try {
      const res  = await fetch('/tools/target-sprint/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'recommend', scores: s, hasMapData: hmd, userId: user?.id }) })
      const data = await res.json()
      if (data?.recommended) setRecommendation(data)
    } catch {}
  }

  function handleCheck(domainId, type, milestoneIdx, taskIdx, checked) {
    setDomainData(prev => {
      const dd = { ...(prev[domainId] || {}) }
      if (type === 'goal')      dd.goalChecked      = checked
      if (type === 'milestone') dd.milestoneChecked = { ...(dd.milestoneChecked || {}), [milestoneIdx]: checked }
      if (type === 'task')      dd.taskChecked      = { ...(dd.taskChecked || {}), [taskIdx]: checked }
      return { ...prev, [domainId]: dd }
    })
  }

  async function saveToSupabase() {
    if (!user?.id || !selectedDomains?.length) return
    try {
      const now    = new Date().toISOString()
      const status = phase === 'sprint' ? 'active' : 'draft'
      const core   = { user_id: user.id, domains: selectedDomains, quarter_type: quarterType, target_date: targetDate, status, updated_at: now }
      const ext1   = { ...core, domain_data: domainData, end_date_label: endDateLabel, scores_at_start: scores, horizon_scores: horizonScores, has_map_data: hasMapData }
      const ext2   = { ...ext1, session_phase: phase, active_domain_id: activeDomainId }

      async function tryInsert(p) { return supabase.from('target_sprint_sessions').insert({ ...p, created_at: now }).select('id').single() }
      async function tryUpdate(p) { return supabase.from('target_sprint_sessions').update(p).eq('id', sessionId) }

      if (sessionId) {
        let { error } = await tryUpdate(ext2); if (error) ({ error } = await tryUpdate(ext1)); if (error) await tryUpdate(core)
      } else {
        let { data, error } = await tryInsert(ext2); if (error) ({ data, error } = await tryInsert(ext1)); if (error) ({ data, error } = await tryInsert(core)); if (data?.id) setSessionId(data.id)
      }

      if (status === 'active' && selectedDomains?.length) {
        const DOMAIN_LABELS = { path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances', connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal' }
        const domainNames = selectedDomains.map(id => DOMAIN_LABELS[id] || id).join(', ')
        await supabase.from('north_star_notes').delete().eq('user_id', user.id).eq('tool', 'target-sprint')
        await supabase.from('north_star_notes').insert([{ user_id: user.id, tool: 'target-sprint', note: `Active Target Stretch domains: ${domainNames}` }])
      }
    } catch {}
  }

  // Queue save whenever meaningful state changes
  useEffect(() => {
    if (!user?.id || !selectedDomains?.length) return
    queueSave({})
  }, [selectedDomains, quarterType, targetDate, endDateLabel, domainData, activeDomainId, phase])

  function handleWheelNav(dir) {
    const idx = sprintDomains.findIndex(d => d.id === activeDomainId)
    if (idx < 0) return
    const next = dir === 'next' ? sprintDomains[(idx + 1) % sprintDomains.length].id : sprintDomains[(idx - 1 + sprintDomains.length) % sprintDomains.length].id
    setSpinDir(dir); setActiveDomainId(next)
  }

  async function handleSprintComplete() {
    if (sessionId && user?.id) {
      try { await supabase.from('target_sprint_sessions').update({ status: 'complete', updated_at: new Date().toISOString() }).eq('id', sessionId) } catch {}
    }
    setShowSummary(false); setShowDebrief(true)
  }

  function handleStartNewSprint() {
    try { localStorage.removeItem(LS_KEY) } catch {}
    setSessionId(null); setSelectedDomains([]); setDomainData({}); setQuarterType(null); setTargetDate(null); setEndDateLabel(null); setActiveDomainId(null); setPhase('select'); setShowSprintDone(false); setShowDebrief(false)
  }

  function handleCentreClick() {
    const allDone = sprintDomains.every(d => {
      const dd = domainData[d.id] || {}
      return !!dd.currentStateSummary && !!dd.horizonText && !!dd.targetGoal && dd.milestones?.length > 0 && dd.tasks?.length > 0
    })
    if (allDone) setShowSummary(true); else setShowCentreModal(true)
  }

  const sprintDomains      = DOMAINS.filter(d => selectedDomains.includes(d.id))
  const completedDomains   = sprintDomains.filter(d => domainData[d.id]?.targetGoal).map(d => ({ domain: d.id, targetGoal: domainData[d.id].targetGoal, conversationInsight: domainData[d.id].conversationInsight }))

  if (authLoading || accessLoading) return <div className="loading" />

  return (
    <div className="page-shell">
      <style>{`
        @media (max-width: 640px) {
          .ts-tool-wrap { padding-left: 20px !important; padding-right: 20px !important; }
          .ts-layout { flex-direction: column !important; }
          .ts-wheel-col { display: flex; justify-content: center; }
          .input-area { flex-direction: column; }
          .input-area textarea, .btn-send { width: 100%; box-sizing: border-box; }
        }
        @keyframes tsFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tsBlink  { 0%,80%,100%{opacity:0.15} 40%{opacity:1} }
        .ts-fade-up { animation: tsFadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <Nav activePath="nextus-self" />
      {!user && <AuthModal />}

      {/* Debrief — fires after stretch marked complete */}
      {showDebrief && (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,40px) 120px' }}>
          <Eyebrow style={{ textAlign: 'center', display: 'block', marginBottom: '16px' }}>Target Stretch · Complete</Eyebrow>
          <h1 style={{ ...serif, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, color: tokens.dark, lineHeight: 1.1, marginBottom: '28px', textAlign: 'center' }}>
            Ninety days. Now the debrief.
          </h1>
          <DebriefPanel
            tool="target-sprint"
            toolContext={{ endDateLabel, domains: sprintDomains.map(d => ({ id: d.id, label: d.label, targetGoal: domainData[d.id]?.targetGoal || '', horizonText: domainData[d.id]?.horizonText || '', milestones: domainData[d.id]?.milestones || [], tasks: domainData[d.id]?.tasks || [], milestoneChecked: domainData[d.id]?.milestoneChecked || {}, taskChecked: domainData[d.id]?.taskChecked || {}, goalChecked: domainData[d.id]?.goalChecked || false })) }}
            userId={user?.id} mode="full"
            onComplete={() => { setShowDebrief(false); setShowSprintDone(true) }}
          />
        </div>
      )}

      {/* Stretch complete screen */}
      {showSprintDone && (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,40px) 120px', textAlign: 'center' }}>
          <Eyebrow style={{ textAlign: 'center', display: 'block', marginBottom: '16px' }}>Target Stretch · Complete</Eyebrow>
          <h1 style={{ ...serif, fontSize: 'clamp(32px,5vw,52px)', fontWeight: 300, color: tokens.dark, lineHeight: 1.1, marginBottom: '20px' }}>
            Ninety days.
          </h1>
          <p style={{ ...body, fontSize: '1.125rem', fontWeight: 300, color: tokens.ghost, lineHeight: 1.8, marginBottom: '40px', maxWidth: '420px', margin: '0 auto 40px' }}>
            What moved? What stayed? What would you do differently? Take a moment before starting the next one.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '420px', margin: '0 auto' }}>
            <a href="/nextu" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'rgba(200,146,42,0.05)', border: `1.5px solid rgba(200,146,42,0.55)`, borderRadius: '10px', textDecoration: 'none' }}>
              <div>
                <div style={{ ...sc, fontSize: '1.0625rem', letterSpacing: '0.1em', color: tokens.gold, marginBottom: '4px' }}>Your Journey</div>
                <div style={{ ...body, fontSize: '1rem', color: tokens.ghost }}>See what shifted across your seven domains.</div>
              </div>
              <span style={{ ...sc, fontSize: '1.25rem', color: tokens.gold, flexShrink: 0, marginLeft: '16px' }}>→</span>
            </a>
            <a href="/tools/horizon-practice" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: tokens.bgCard, border: '1px solid rgba(200,146,42,0.25)', borderRadius: '10px', textDecoration: 'none' }}>
              <div>
                <div style={{ ...sc, fontSize: '1.0625rem', letterSpacing: '0.1em', color: tokens.dark, marginBottom: '4px' }}>Daily Practice</div>
                <div style={{ ...body, fontSize: '1rem', color: tokens.ghost }}>Where the work continues, every morning.</div>
              </div>
              <span style={{ ...sc, fontSize: '1.25rem', color: tokens.ghost, flexShrink: 0, marginLeft: '16px' }}>→</span>
            </a>
            <a href="/tools/map" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: tokens.bgCard, border: '1px solid rgba(200,146,42,0.25)', borderRadius: '10px', textDecoration: 'none' }}>
              <div>
                <div style={{ ...sc, fontSize: '1.0625rem', letterSpacing: '0.1em', color: tokens.dark, marginBottom: '4px' }}>Rescore The Map</div>
                <div style={{ ...body, fontSize: '1rem', color: tokens.ghost }}>See what actually moved in ninety days.</div>
              </div>
              <span style={{ ...sc, fontSize: '1.25rem', color: tokens.ghost, flexShrink: 0, marginLeft: '16px' }}>→</span>
            </a>
            <button type="button" onClick={handleStartNewSprint}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: tokens.bgCard, border: '1px solid rgba(200,146,42,0.25)', borderRadius: '10px', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <div>
                <div style={{ ...sc, fontSize: '1.0625rem', letterSpacing: '0.1em', color: tokens.dark, marginBottom: '4px' }}>Start a new stretch</div>
                <div style={{ ...body, fontSize: '1rem', color: tokens.ghost }}>Choose your next three domains.</div>
              </div>
              <span style={{ ...sc, fontSize: '1.25rem', color: tokens.ghost, flexShrink: 0, marginLeft: '16px' }}>→</span>
            </button>
          </div>
        </div>
      )}

      {showSummary && (
        <SprintSummaryModal domains={sprintDomains} domainData={domainData} onClose={() => setShowSummary(false)} onComplete={handleSprintComplete} />
      )}
      {showCentreModal && (
        <SprintCentreModal domains={sprintDomains} domainData={domainData} activeDomainId={activeDomainId} onClose={() => setShowCentreModal(false)} onGoToDomain={id => setActiveDomainId(id)} />
      )}

      <div className="ts-tool-wrap" style={{ padding: 'clamp(0px,2vw,16px) clamp(20px,4vw,40px) 100px' }}>

        {/* ── Planet Sprint ─── the civ-side mirror ──────────────────────
            Placed BEFORE phase gating so it's visible when a stretch is
            in progress. Planet Sprint is the civilisational-side
            contribution commitment inside Target Stretch. It is NOT
            retired. It keeps its name. */}
        {phase === 'sprint' && sprintDomains.length > 0 && (
          <PlanetSprintBeat domainData={domainData} setDomainData={setDomainData} selectedDomains={selectedDomains} endDateLabel={endDateLabel} />
        )}

        {/* ── Select phase ──────────────────────────────────────────────── */}
        {phase === 'select' && (
          <PhaseSelect hasMapData={hasMapData} scores={scores} horizonScores={horizonScores} iaStatements={iaStatements} selectedDomains={selectedDomains} setSelectedDomains={setSelectedDomains} recommendation={recommendation} onContinue={() => setPhase('quarter')} />
        )}

        {/* ── Quarter phase ─────────────────────────────────────────────── */}
        {phase === 'quarter' && (
          <PhaseQuarter quarterType={quarterType} setQuarterType={setQuarterType} setTargetDate={setTargetDate} setEndDateLabel={setEndDateLabel} onBack={() => setPhase('select')} onContinue={() => { setActiveDomainId(selectedDomains[0]); setPhase('sprint'); setTimeout(saveToSupabase, 0) }} />
        )}

        {/* ── Sprint phase ──────────────────────────────────────────────── */}
        {phase === 'sprint' && !sprintDomains.length && (
          <div style={{ textAlign: 'center', padding: '60px 0', ...body, fontSize: '1.25rem', color: tokens.ghost }}>
            Loading your stretch…
          </div>
        )}
        {phase === 'sprint' && sprintDomains.length > 0 && activeDomainId && DOMAIN_BY_ID[activeDomainId] && (
          <div className="ts-fade-up">
            {/* Save whisper */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', minHeight: '24px' }}>
              <SavedWhisper state={whisper} />
            </div>

            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
              <Eyebrow>Target Stretch · {endDateLabel}</Eyebrow>
              <h1 style={{ ...sc, fontSize: 'clamp(1.5rem,4vw,2.25rem)', fontWeight: 400, color: tokens.dark, lineHeight: 1.1, margin: '6px 0 4px' }}>
                {sprintDomains.map(d => d.label).join(' · ')}
              </h1>
            </div>

            <SetupStatusBar domains={sprintDomains} domainData={domainData} />

            {/* Wheel + domain card */}
            <div style={{ position: 'relative', minHeight: '300px' }}>
              <div style={{ position: 'absolute', right: '-60px', top: '-300px', width: '520px', height: '520px', zIndex: 0, pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto', width: '100%' }}>
                  <SprintWheelMini domains={sprintDomains} domainData={domainData} activeDomainId={activeDomainId} spinDirection={spinDir} onDomainClick={id => { setSpinDir('next'); setActiveDomainId(id) }} onCentreClick={handleCentreClick} size={440} />
                </div>
              </div>

              <div style={{ position: 'relative', zIndex: 1, marginTop: '330px' }}>
                {activeDomainId && (
                  <div key={activeDomainId} className="ts-fade-up"
                    style={{ background: tokens.bg, border: '1.5px solid rgba(200,146,42,0.2)', borderRadius: '14px', padding: '26px 28px', maxWidth: '560px' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px', float: 'right', marginTop: '-4px', marginRight: '-8px' }}>
                      <button type="button" onClick={() => handleWheelNav('prev')} title="Previous domain"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', opacity: 0.4, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <polyline points="12,2 4,9 12,16" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button type="button" onClick={() => handleWheelNav('next')} title="Next domain"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', opacity: 0.4, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <polyline points="6,2 14,9 6,16" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    <DomainPanel
                      domainId={activeDomainId}
                      domainData={domainData}
                      setDomainData={setDomainData}
                      hasMapData={hasMapData}
                      mapData={mapData}
                      targetDate={targetDate}
                      endDateLabel={endDateLabel}
                      completedDomains={completedDomains}
                      userId={user?.id}
                      sprintDomains={sprintDomains}
                      onSaveAway={() => { queueSave({}) }}
                    />
                  </div>
                )}
                {completedDomains.length > 0 && (
                  <div style={{ maxWidth: '560px', marginTop: '20px' }}>
                    <AccomplishmentTally domains={sprintDomains} domainData={domainData} onCheck={handleCheck} />
                  </div>
                )}
              </div>
            </div>

            {!hasMapData && (
              <div style={{ padding: '18px 20px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '12px', marginTop: '32px', maxWidth: '560px' }}>
                <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>Want the full picture?</div>
                <p style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7, marginBottom: '12px' }}>
                  The Map gives you an honest read across all seven domains — and loads your scores directly into your next stretch.
                </p>
                <a href="/tools/map" style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', ...gold, textDecoration: 'none', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '30px', padding: '8px 18px', display: 'inline-block' }}>
                  Begin The Map →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Planet Sprint beat ───────────────────────────────────────────────────────
// The civilisational-side mirror of the personal stretches.
// Same weight. Dual-scale framing. Never an afterthought.
// Planet Sprint is NOT retired. It keeps its name. Do not conflate with Target Stretch.

function PlanetSprintBeat({ domainData, setDomainData, selectedDomains, endDateLabel }) {
  const ps = domainData.__planet_sprint__ || {}
  const [open, setOpen] = useState(false)

  function update(patch) {
    setDomainData(prev => ({ ...prev, __planet_sprint__: { ...(prev.__planet_sprint__ || {}), ...patch } }))
  }

  return (
    <div style={{ marginBottom: '28px', padding: '20px 24px', background: 'rgba(15,21,35,0.03)', border: '1px solid rgba(200,146,42,0.18)', borderLeft: '3px solid rgba(200,146,42,0.45)', borderRadius: '12px', maxWidth: '560px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div>
          <Eyebrow style={{ marginBottom: '2px' }}>Planet Sprint</Eyebrow>
          <p style={{ ...body, fontSize: '1rem', color: tokens.ghost, lineHeight: 1.55, margin: 0 }}>
            The Person and the Planet — what are you contributing this quarter?
          </p>
        </div>
        <span style={{ ...sc, fontSize: '1.25rem', color: tokens.gold, flexShrink: 0, marginLeft: '16px', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : '' }}>→</span>
      </div>

      {open && (
        <div style={{ marginTop: '20px', borderTop: '1px solid rgba(200,146,42,0.1)', paddingTop: '18px' }}>
          <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
            Your personal stretch is the inner arc. The Planet Sprint is the outer one — one tangible contribution to the world alongside your own growth. Both/and.
          </p>
          {ps.commitment ? (
            <div>
              <div style={{ padding: '14px 16px', background: tokens.bgCard, border: '1px solid rgba(200,146,42,0.2)', borderLeft: '3px solid rgba(200,146,42,0.45)', borderRadius: '8px', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7, marginBottom: '14px' }}>
                {ps.commitment}
              </div>
              <EditableList
                items={[{ text: ps.commitment }]}
                onSave={items => update({ commitment: items[0]?.text || ps.commitment })}
                renderItem={() => null}
                itemKey="text"
              />
            </div>
          ) : (
            <div>
              <textarea
                placeholder="What will you contribute to the world this quarter? One concrete commitment."
                rows={3}
                value={ps.draft || ''}
                onChange={e => update({ draft: e.target.value })}
                style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(200,146,42,0.3)', borderRadius: '8px', padding: '12px 14px', resize: 'vertical', outline: 'none', background: tokens.bg, boxSizing: 'border-box', marginBottom: '10px' }}
              />
              {ps.draft?.trim() && (
                <Btn onClick={() => update({ commitment: ps.draft.trim(), draft: '' })}>
                  Lock in my Planet Sprint →
                </Btn>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
