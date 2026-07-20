import { useState, useRef, useEffect } from 'react'
import { actorCallsRaw } from '../../lib/actorCallsClient'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { supabase } from '../../hooks/useSupabase'
import { DebriefPanel } from '../../components/DebriefPanel'
import { tokens, serif, body, sc, fn } from '../../lib/designTokens'
import { DOMAIN_COLORS } from '../../constants/domainColors'
import { useAutoSave, SavedWhisper } from '../nextu/shared'

// ─── Constants ────────────────────────────────────────────────────────────────
//
// TARGET STRETCH v3 — the embodiment challenge.
//
// The spine: "If you were your Horizon Self in this area for 90 days,
// and took clear action from that identity — what could you accomplish?"
//
// Structure:
//   · ONE personal domain (any of the seven — Inner Game included, for those
//     who want identity work front and centre; otherwise Inner Game is baked
//     into the premise of the whole stretch)
//   · ONE optional Planet Sprint — the same Horizon Self, pointed outward.
//     A contribution beyond yourself: a person, a community, the planet.
//     Planet Sprint keeps its name. It is NOT retired.
//   · Practice bridge — stretch tasks surface in the Horizon Practice
//     morning Plan beat; the stretch shows the practice streak.
//
// Schema note (B1, June 2026): the Planet Sprint is a SIBLING SESSION —
// its own row in target_sprint_sessions with scale='civ', domains=[], an
// independent clock (quarter_type/target_date), and domain_data carrying
// { __planet_sprint__: { serves, commitment, tasks, taskChecked, source,
// designedBy } }. source/designedBy + the row-level challenge_id are
// forward-slots for org- and group-designed sprints people select into.
// Display components still read a merged view (domainData.__planet_sprint__)
// assembled at the page level; writes route to the civ row.

const LS_KEY = 'tg_session_v3'

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
  if (n >= 6) return '#6E7F5C'
  if (n >= 4) return '#E8B92E'
  return '#D63838'
}

// ─── Design shortcuts ─────────────────────────────────────────────────────────

const gold   = { color: fn.moss }
const muted  = { color: 'rgba(15,21,35,0.78)' }
const meta   = { color: 'rgba(15,21,35,0.78)' }
const GOLD_C = fn.moss
const hair   = '1px solid rgba(110,127,92,0.16)'

// ─── Small shared pieces ──────────────────────────────────────────────────────

function Eyebrow({ children, style = {} }) {
  return (
    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', ...gold, marginBottom: '6px', textTransform: 'uppercase', ...style }}>
      {children}
    </div>
  )
}

function Rule({ style = {} }) {
  return <div style={{ height: '1px', background: 'rgba(110,127,92,0.18)', margin: '16px 0', ...style }} />
}

function Btn({ onClick, disabled, children, style = {}, variant = 'solid' }) {
  const base = {
    ...sc, fontSize: '15px', letterSpacing: '0.14em', padding: '11px 28px',
    borderRadius: '40px', cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1.5px solid rgba(110,127,92,0.78)', transition: 'all 0.2s',
    opacity: disabled ? 0.6 : 1,
  }
  const styles = variant === 'ghost'
    ? { ...base, background: 'transparent', color: fn.moss }
    : variant === 'dark'
      ? { ...base, background: tokens.dark, color: tokens.bg, border: `1.5px solid ${tokens.dark}` }
      : { ...base, background: 'rgba(110,127,92,0.08)', color: fn.moss }
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
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(110,127,92,0.5)', animation: 'tsBlink 1.2s 0.0s infinite' }} />
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(110,127,92,0.5)', animation: 'tsBlink 1.2s 0.2s infinite' }} />
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(110,127,92,0.5)', animation: 'tsBlink 1.2s 0.4s infinite' }} />
    </div>
  )
}

// ─── Auth modal ───────────────────────────────────────────────────────────────

function AuthModal() {
  const r = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: tokens.bg, border: '1.5px solid rgba(110,127,92,0.78)', borderRadius: '14px', padding: '40px 32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <Eyebrow style={{ textAlign: 'center', marginBottom: '14px' }}>Target Stretch</Eyebrow>
        <h2 style={{ ...sc, fontSize: '1.5rem', fontWeight: 400, color: tokens.dark, marginBottom: '10px' }}>Sign in to begin.</h2>
        <p style={{ ...body, fontSize: '1.125rem', ...meta, lineHeight: 1.7, marginBottom: '24px' }}>
          Sign in and your stretch saves — come back to pick up where you left off.
        </p>
        <a href={`/login?redirect=${r}`} style={{ display: 'block', padding: '14px', borderRadius: '40px', border: '1.5px solid rgba(110,127,92,0.78)', background: 'rgba(110,127,92,0.05)', color: fn.moss, ...sc, fontSize: '1.125rem', letterSpacing: '0.14em', textDecoration: 'none' }}>
          Sign in or create account →
        </a>
      </div>
    </div>
  )
}

// ─── Stretch Rings ────────────────────────────────────────────────────────────
// The fractal, drawn: two concentric arcs around the days remaining.
//   Inner ring  — the personal arc. Domain colour. Task progress.
//   Outer ring  — the planetary arc. Gold. Planet Sprint progress.
//   Centre      — days remaining in the quarter.
// If no Planet Sprint exists yet, the outer ring is a quiet dashed invitation.

export function StretchRings({ domainId, domainData, targetDate, onPlanetClick, size = 280 }) {
  const cx = size / 2, cy = size / 2
  const rIn  = size * 0.27
  const rOut = size * 0.36
  const dd = domainData[domainId] || {}
  const ps = domainData.__planet_sprint__ || {}
  const colour = DOMAIN_COLORS[domainId]?.base || GOLD_C

  // Personal progress — tasks checked / tasks total
  const tasks      = dd.tasks || []
  const tasksDone  = tasks.filter((_, i) => dd.taskChecked?.[i]).length
  const innerPct   = tasks.length > 0 ? tasksDone / tasks.length : 0

  // Planet progress
  const pTasks     = ps.tasks || []
  const pDone      = pTasks.filter((_, i) => ps.taskChecked?.[i]).length
  const hasPlanet  = !!ps.commitment
  const outerPct   = pTasks.length > 0 ? pDone / pTasks.length : (hasPlanet ? 1 : 0)

  // Days remaining
  let daysLeft = null
  if (targetDate) {
    const diff = Math.ceil((new Date(targetDate + 'T23:59:59') - new Date()) / 86400000)
    daysLeft = Math.max(0, diff)
  }

  const TAU = Math.PI * 2
  function arc(r, pct) {
    if (pct <= 0) return ''
    if (pct >= 1) return null // full circle handled separately
    const a0 = -Math.PI / 2
    const a1 = a0 + TAU * pct
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
    const large = pct > 0.5 ? 1 : 0
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
  }

  // Milestone ticks at thirds of the inner ring
  const ticks = [1 / 3, 2 / 3].map(p => {
    const a = -Math.PI / 2 + TAU * p
    return {
      x1: cx + (rIn - 6) * Math.cos(a), y1: cy + (rIn - 6) * Math.sin(a),
      x2: cx + (rIn + 6) * Math.cos(a), y2: cy + (rIn + 6) * Math.sin(a),
    }
  })

  const innerArc = arc(rIn, innerPct)
  const outerArc = arc(rOut, outerPct)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Stretch progress rings">

      {/* Inner track — the personal arc */}
      <circle cx={cx} cy={cy} r={rIn} fill="none" stroke="rgba(15,21,35,0.08)" strokeWidth="5" />
      {innerPct >= 1
        ? <circle cx={cx} cy={cy} r={rIn} fill="none" stroke={colour} strokeWidth="5" strokeLinecap="round" />
        : innerArc && <path d={innerArc} fill="none" stroke={colour} strokeWidth="5" strokeLinecap="round" />}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(15,21,35,0.22)" strokeWidth="1.5" />
      ))}

      {/* Outer track — the planetary arc */}
      {hasPlanet ? (
        <g>
          <circle cx={cx} cy={cy} r={rOut} fill="none" stroke="rgba(110,127,92,0.14)" strokeWidth="4" />
          {outerPct >= 1
            ? <circle cx={cx} cy={cy} r={rOut} fill="none" stroke={GOLD_C} strokeWidth="4" strokeLinecap="round" opacity={pTasks.length ? 1 : 0.45} />
            : outerArc && <path d={outerArc} fill="none" stroke={GOLD_C} strokeWidth="4" strokeLinecap="round" />}
        </g>
      ) : (
        <g onClick={onPlanetClick} cursor="pointer">
          <circle cx={cx} cy={cy} r={rOut} fill="none" stroke="rgba(110,127,92,0.30)" strokeWidth="1.5" strokeDasharray="3 7" />
        </g>
      )}

      {/* Centre — days remaining */}
      {daysLeft !== null && (
        <g>
          <text x={cx} y={cy - 2} textAnchor="middle" fill={tokens.dark}
            fontFamily="'Fraunces', Georgia, serif" fontSize={size * 0.21} fontWeight="300">
            {daysLeft}
          </text>
          <text x={cx} y={cy + size * 0.085} textAnchor="middle" fill={fn.moss}
            fontFamily="'IBM Plex Mono', Georgia, serif" fontSize={size * 0.047} letterSpacing="0.22em">
            DAYS LEFT
          </text>
        </g>
      )}
    </svg>
  )
}

// ─── Identity banner ──────────────────────────────────────────────────────────
// The spine of the whole tool, made visible. Dark card. The person's own
// I Am statement for the chosen domain (their words — italic is theirs),
// held under the challenge framing.

function IdentityBanner({ domainId, iaStatements, horizonSelfStatement, practiceStreak }) {
  const d = DOMAIN_BY_ID[domainId]
  const ia = iaStatements?.[domainId]
  const colour = DOMAIN_COLORS[domainId]?.base || GOLD_C

  return (
    <div style={{ background: tokens.dark, borderRadius: '14px', borderTop: `3px solid ${colour}`, padding: '24px 28px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.24em', color: '#D9A94A', textTransform: 'uppercase' }}>
          As your Horizon Self · {d?.label}
        </div>
        {practiceStreak > 0 && (
          <a href="/tools/horizon-practice" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(250,250,247,0.75)', textDecoration: 'none', border: '1px solid rgba(250,250,247,0.22)', borderRadius: '20px', padding: '4px 12px', whiteSpace: 'nowrap' }}>
            {practiceStreak} {practiceStreak === 1 ? 'morning' : 'mornings'} as them →
          </a>
        )}
      </div>
      {ia ? (
        <p style={{ ...body, fontStyle: 'italic', fontSize: '1.25rem', color: '#FAFAF7', lineHeight: 1.6, margin: '12px 0 0' }}>
          {ia}
        </p>
      ) : (
        <p style={{ ...body, fontSize: '1.0625rem', color: 'rgba(250,250,247,0.78)', lineHeight: 1.7, margin: '12px 0 0' }}>
          Ninety days of clear action — taken as the person you already are at full expression.
        </p>
      )}
      {horizonSelfStatement && (
        <p style={{ ...body, fontStyle: 'italic', fontSize: '15px', color: 'rgba(250,250,247,0.62)', lineHeight: 1.65, margin: '10px 0 0' }}>
          {horizonSelfStatement}
        </p>
      )}
    </div>
  )
}

// ─── Waypoint strip ───────────────────────────────────────────────────────────
// The mechanic that keeps the Target Goal honest: a stretch 90-day waypoint
// ON THE WAY to the Horizon — never the destination itself, never a lap of
// the comfort zone. Renders current → 90 days → horizon on the MAP scale.
// The target marker is settable in 0.5 steps.

function WaypointStrip({ currentScore, targetScore, horizonScore, colour, onTargetChange }) {
  if (currentScore === undefined || currentScore === null) return null
  const hz = horizonScore != null ? horizonScore : 10
  const pos = v => `${Math.max(2, Math.min(98, v * 10))}%`
  const tg = targetScore != null ? targetScore : null
  const curCol = getColor(currentScore)

  function step(delta) {
    const base = tg != null ? tg : Math.round(((currentScore + hz) / 2) * 2) / 2
    let next = Math.round((base + delta) * 2) / 2
    next = Math.max(0, Math.min(10, next))
    onTargetChange(next)
  }

  return (
    <div style={{ background: tokens.bgCard, border: hair, borderRadius: '10px', padding: '18px 20px 14px', marginBottom: '16px' }}>
      <div style={{ position: 'relative', height: '34px' }}>
        {/* Track */}
        <div style={{ position: 'absolute', top: '11px', left: '2%', right: '2%', height: '2px', background: 'rgba(15,21,35,0.1)', borderRadius: '1px' }} />
        {/* Travelled segment: current → target */}
        {tg != null && tg > currentScore && (
          <div style={{ position: 'absolute', top: '11px', left: pos(currentScore), width: `calc(${pos(tg)} - ${pos(currentScore)})`, height: '2px', background: colour, borderRadius: '1px' }} />
        )}
        {/* Current marker */}
        <div style={{ position: 'absolute', top: '6px', left: pos(currentScore), transform: 'translateX(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: curCol }} />
        {/* Target marker */}
        <div style={{ position: 'absolute', top: '3px', left: pos(tg != null ? tg : (currentScore + hz) / 2), transform: 'translateX(-50%)', width: '18px', height: '18px', borderRadius: '50%', background: tokens.bg, border: `2.5px ${tg != null ? 'solid' : 'dashed'} ${colour}` }} />
        {/* Horizon marker */}
        <div style={{ position: 'absolute', top: '6px', left: pos(hz), transform: 'translateX(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: tokens.bg, border: `2px solid ${GOLD_C}` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost }}>NOW</div>
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.06em', color: curCol }}>{currentScore} · {getTierLabel(currentScore)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost }}>90 DAYS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <button type="button" onClick={() => step(-0.5)} aria-label="Lower target"
              style={{ ...sc, fontSize: '15px', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>−</button>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.06em', color: tg != null ? tokens.dark : tokens.ghost, minWidth: '90px' }}>
              {tg != null ? `${tg} · ${getTierLabel(tg)}` : 'Set the reach'}
            </span>
            <button type="button" onClick={() => step(0.5)} aria-label="Raise target"
              style={{ ...sc, fontSize: '15px', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>+</button>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost }}>HORIZON</div>
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.06em', color: fn.moss }}>{horizonScore != null ? `${horizonScore} · ${getTierLabel(horizonScore)}` : '—'}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Setup progress bar ───────────────────────────────────────────────────────

function SetupStatusBar({ domainId, domainData }) {
  const dd = domainData[domainId] || {}
  const complete = STEPS.filter(s => {
    if (s === 'current_state') return !!dd.currentStateSummary
    if (s === 'horizon')       return !!dd.horizonText
    if (s === 'target_goal')   return !!dd.targetGoal
    if (s === 'milestones')    return dd.milestones?.length > 0
    if (s === 'tasks')         return dd.tasks?.length > 0
    return false
  }).length
  const pct = Math.round((complete / STEPS.length) * 100)
  if (complete >= STEPS.length) return null
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase' }}>Stretch Setup</span>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', ...muted }}>{complete} / {STEPS.length}</span>
      </div>
      <div style={{ height: '3px', background: 'rgba(110,127,92,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: GOLD_C, transition: 'width 0.6s ease', borderRadius: '2px' }} />
      </div>
    </div>
  )
}

// ─── Step strip ───────────────────────────────────────────────────────────────

function StepStrip({ domainId, domainData, activeStep, onStepClick }) {
  const dd = domainData[domainId] || {}
  const colour = DOMAIN_COLORS[domainId]?.base || GOLD_C

  function isComplete(step) {
    if (step === 'current_state') return !!dd.currentStateSummary
    if (step === 'horizon')       return !!dd.horizonText
    if (step === 'target_goal')   return !!dd.targetGoal
    if (step === 'milestones')    return dd.milestones?.length > 0
    if (step === 'tasks')         return dd.tasks?.length > 0
    return false
  }
  function isUnlocked(step) {
    const idx = STEPS.indexOf(step)
    if (idx === 0) return true
    return isComplete(STEPS[idx - 1])
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '22px', flexWrap: 'wrap', rowGap: '8px' }}>
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
                color: done ? colour : active ? fn.moss : unlocked ? 'rgba(15,21,35,0.55)' : 'rgba(15,21,35,0.25)',
                whiteSpace: 'nowrap', flexShrink: 0,
                borderBottom: active ? `2px solid ${colour}` : '2px solid transparent',
                transition: 'color 0.2s',
              }}>
              {done ? '✓ ' : ''}{STEP_LABELS[step]}
            </button>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: '1px', background: done ? colour : 'rgba(15,21,35,0.1)', opacity: done ? 0.45 : 1, margin: '0 8px', minWidth: '8px', transition: 'background 0.4s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Accomplishment Tally ─────────────────────────────────────────────────────
// Imported by Mission Control's TargetSprintMissionPanel — keep the signature:
// ({ domains, domainData, onCheck }). Renders the personal arc, and the
// Planet Sprint arc when one exists.

export function AccomplishmentTally({ domains, domainData, onCheck }) {
  const [celebration, setCelebration] = useState(null)

  function handleCheck(domainId, type, milestoneIdx, taskIdx, checked) {
    if (checked) {
      const msgs = { goal: '✦ Goal reached. Next play.', milestone: '✦ Milestone complete. Keep moving.', task: '· Done.', planet: '✦ Given. The outer arc moves.' }
      setCelebration({ text: msgs[type] || '✓', type })
      setTimeout(() => setCelebration(null), 2200)
    }
    onCheck(domainId, type, milestoneIdx, taskIdx, checked)
  }

  const ps = domainData.__planet_sprint__ || {}
  const pTasks = ps.tasks || []

  const totals = domains.reduce((acc, d) => {
    const dd = domainData[d.id] || {}
    if (!dd.targetGoal) return acc
    const tasks = dd.tasks || []
    acc.tasks += tasks.length
    acc.tasksDone += tasks.filter((_, i) => dd.taskChecked?.[i]).length
    return acc
  }, { tasks: 0, tasksDone: 0 })

  const pct = totals.tasks > 0 ? Math.round((totals.tasksDone / totals.tasks) * 100) : 0

  return (
    <div style={{ background: tokens.bgCard, border: hair, borderRadius: '14px', padding: '22px 24px', marginTop: '24px', position: 'relative' }}>
      {celebration && (
        <div style={{ position: 'absolute', top: '-44px', left: '50%', transform: 'translateX(-50%)', background: tokens.dark, color: tokens.bg, borderRadius: '8px', padding: '8px 18px', whiteSpace: 'nowrap', ...sc, fontSize: '15px', letterSpacing: '0.14em', animation: 'tsFadeUp 0.3s ease both', zIndex: 10 }}>
          {celebration.text}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <Eyebrow style={{ marginBottom: 0 }}>Stretch Progress</Eyebrow>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: fn.moss }}>{totals.tasksDone}/{totals.tasks} tasks</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(110,127,92,0.12)', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: GOLD_C, borderRadius: '2px', transition: 'width 0.6s ease' }} />
      </div>

      {domains.map(d => {
        const dd = domainData[d.id] || {}
        if (!dd.targetGoal) return null
        const milestones = dd.milestones || []
        const tasks      = dd.tasks || []
        const colour     = DOMAIN_COLORS[d.id]?.base || GOLD_C

        return (
          <div key={d.id} style={{ marginBottom: '20px' }}>
            <div style={{ borderLeft: `3px solid ${colour}`, paddingLeft: '12px', marginBottom: '10px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: fn.moss, textTransform: 'uppercase', marginBottom: '4px' }}>{d.label}</div>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!dd.goalChecked}
                  onChange={e => handleCheck(d.id, 'goal', null, null, e.target.checked)}
                  style={{ marginTop: '4px', accentColor: colour, flexShrink: 0, width: '16px', height: '16px' }} />
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
                      style={{ marginTop: '3px', accentColor: colour, flexShrink: 0, width: '15px', height: '15px' }} />
                    <div>
                      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: fn.moss, textTransform: 'uppercase', marginBottom: '1px' }}>Month {mi + 1}</div>
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
                          style={{ marginTop: '3px', accentColor: colour, flexShrink: 0, width: '14px', height: '14px' }} />
                        <span style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.55, textDecoration: tDone ? 'line-through' : 'none', opacity: tDone ? 0.55 : 1, transition: 'all 0.3s' }}>
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

      {/* Planet Sprint arc in the tally */}
      {ps.commitment && (
        <div style={{ paddingTop: '16px', borderTop: hair }}>
          <div style={{ borderLeft: `3px solid ${GOLD_C}`, paddingLeft: '12px' }}>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: fn.moss, textTransform: 'uppercase', marginBottom: '4px' }}>Planet Sprint</div>
            <p style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.6, margin: '0 0 8px' }}>{ps.commitment}</p>
            {pTasks.map((t, i) => {
              const tDone = !!ps.taskChecked?.[i]
              return (
                <label key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '5px' }}>
                  <input type="checkbox" checked={tDone}
                    onChange={e => handleCheck('__planet_sprint__', 'planet', null, i, e.target.checked)}
                    style={{ marginTop: '3px', accentColor: GOLD_C, flexShrink: 0, width: '14px', height: '14px' }} />
                  <span style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.55, textDecoration: tDone ? 'line-through' : 'none', opacity: tDone ? 0.38 : 1, transition: 'all 0.3s' }}>
                    {t.text}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stretch Summary Modal ────────────────────────────────────────────────────

function StretchSummaryModal({ domainId, domainData, currentScore, horizonScore, onClose, onComplete }) {
  const d  = DOMAIN_BY_ID[domainId]
  const dd = domainData[domainId] || {}
  const ps = domainData.__planet_sprint__ || {}
  const colour = DOMAIN_COLORS[domainId]?.base || GOLD_C
  const hasWaypoint = currentScore != null && dd.targetScore != null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: tokens.bg, border: '1.5px solid rgba(110,127,92,0.3)', borderRadius: '14px', padding: '32px 28px', maxWidth: '520px', width: '100%', maxHeight: '80dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Eyebrow style={{ marginBottom: 0 }}>Your Target Stretch</Eyebrow>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '1.1rem', ...muted, padding: '4px' }}>×</button>
        </div>
        <div style={{ borderLeft: `3px solid ${colour}`, paddingLeft: '14px', marginBottom: '18px' }}>
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>{d?.label}</div>
          {hasWaypoint && (
            <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: getColor(currentScore) }}>{currentScore}</span>
              <span style={{ color: tokens.ghost }}>→</span>
              <span style={{ color: colour }}>{dd.targetScore}</span>
              <span style={{ color: tokens.ghost }}>→</span>
              <span style={{ color: fn.moss }}>{horizonScore != null ? horizonScore : '—'}</span>
              <span style={{ color: tokens.ghost, marginLeft: '4px' }}>· now → 90 days → horizon</span>
            </div>
          )}
          {dd.horizonText && (
            <div style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.6, marginBottom: '6px' }}>
              Horizon: {dd.horizonText}
            </div>
          )}
          <div style={{ ...body, fontSize: '1.125rem', ...meta, lineHeight: 1.65 }}>{dd.targetGoal || 'Not yet set.'}</div>
        </div>
        {ps.commitment && (
          <div style={{ borderLeft: `3px solid ${GOLD_C}`, paddingLeft: '14px', marginBottom: '8px' }}>
            <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>Planet Sprint</div>
            <div style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.65 }}>{ps.commitment}</div>
          </div>
        )}
        <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1.5px solid rgba(110,127,92,0.20)', textAlign: 'center' }}>
          <Btn onClick={onComplete} style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}>
            Complete this stretch →
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
      const res  = await fetch('/tools/target-sprint/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, domainId, ...payload, domain: domainId, userId, messages: [{ role: 'user', content: 'START' }] }) })
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
      const res  = await fetch('/tools/target-sprint/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, domainId, ...payload, domain: domainId, userId, messages: [{ role: 'user', content: 'START' }, ...updated] }) })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'assistant', content: data.message }])
      if (data.canLock) setPendingData(data)
      if (data.complete) setPendingData(data.data ? { canLock: true, ...data.data } : data)
    } catch { setMsgs(m => [...m, { role: 'assistant', content: 'Something went wrong.' }]) }
    setThinking(false)
  }

  return (
    <div>
      <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ padding: '12px 16px', borderRadius: '10px', background: m.role === 'user' ? 'rgba(110,127,92,0.07)' : tokens.bgCard, border: '1px solid rgba(110,127,92,0.15)', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7 }}>
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
            style={{ flex: 1, ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '10px 14px', resize: 'none', outline: 'none', background: tokens.bg }}
          />
          <button type="button" className="btn-send" onClick={send} disabled={!input.trim() || thinking}
            style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: fn.moss, background: 'rgba(110,127,92,0.08)', border: '1px solid rgba(110,127,92,0.5)', borderRadius: '8px', padding: '0 18px', cursor: 'pointer', opacity: (!input.trim() || thinking) ? 0.4 : 1 }}>
            Send
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Editable list ────────────────────────────────────────────────────────────

function EditableList({ items, onSave, addLabel = '+ Add', itemKey = 'text' }) {
  const [editing, setEditing] = useState(false)
  const [local,   setLocal]   = useState(items)

  // Sync from props only while NOT editing. Most call sites pass a fresh
  // `[{ text: … }]` literal every render, so an unguarded reset would wipe
  // the user's in-progress edits the moment the parent re-renders for any
  // reason. While editing, `local` is the sole source of truth.
  useEffect(() => { if (!editing) setLocal(items) }, [items, editing])

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
            style={{ flex: 1, ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '6px', padding: '8px 10px', resize: 'vertical', outline: 'none', background: tokens.bg }}
          />
          <button type="button" onClick={() => setLocal(l => l.filter((_, j) => j !== i))}
            style={{ ...sc, fontSize: '13px', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '6px', flexShrink: 0 }}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
        <button type="button" onClick={() => setLocal(l => [...l, { [itemKey]: '' }])}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: fn.moss, background: 'none', border: '1px solid rgba(110,127,92,0.4)', borderRadius: '20px', padding: '5px 14px', cursor: 'pointer' }}>
          {addLabel}
        </button>
        <Btn onClick={() => { onSave(local.filter(x => x[itemKey]?.trim())); setEditing(false) }} style={{ padding: '5px 14px', fontSize: '13px' }}>Save</Btn>
        <Btn variant="ghost" onClick={() => { setLocal(items); setEditing(false) }} style={{ padding: '5px 14px', fontSize: '13px' }}>Cancel</Btn>
      </div>
    </div>
  )
}

// ─── Stretch coach ────────────────────────────────────────────────────────────
// Talks to the dedicated coach endpoint (sprint-coach), which holds the full
// plan. Previously this posted mode:'coach' to the chat endpoint — which had
// no coach mode. Fixed.

function StretchCoach({ sprintContext, userId }) {
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

  async function call(messages) {
    // Coach endpoint requires a non-empty messages array whose first message
    // has role 'user' — the START sentinel opens the conversation.
    const res = await fetch('/tools/target-sprint/api/sprint-coach', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprintContext, userId, messages: [{ role: 'user', content: 'START' }, ...messages] }),
    })
    return res.json()
  }

  async function init() {
    setThinking(true)
    try {
      const data = await call([])
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
      const data = await call(updated)
      setMsgs(m => [...m, { role: 'assistant', content: data.message }])
    } catch { setMsgs(m => [...m, { role: 'assistant', content: 'Something went wrong.' }]) }
    setThinking(false)
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ padding: '12px 16px', borderRadius: '10px', background: m.role === 'user' ? 'rgba(110,127,92,0.07)' : tokens.bgCard, border: '1px solid rgba(110,127,92,0.15)', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7 }}>
            {m.content}
          </div>
        ))}
        {thinking && <div style={{ padding: '12px 16px' }}><ThinkingDots /></div>}
        <div ref={bottomRef} />
      </div>
      <div className="input-area" style={{ display: 'flex', gap: '10px' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Talk to your coach about this stretch…"
          rows={2}
          style={{ flex: 1, ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '10px 14px', resize: 'none', outline: 'none', background: tokens.bg }}
        />
        <button type="button" className="btn-send" onClick={send} disabled={!input.trim() || thinking}
          style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: fn.moss, background: 'rgba(110,127,92,0.08)', border: '1px solid rgba(110,127,92,0.5)', borderRadius: '8px', padding: '0 18px', cursor: 'pointer', opacity: (!input.trim() || thinking) ? 0.4 : 1 }}>
          Send
        </button>
      </div>
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
        The concrete weekly actions your Horizon Self takes. These also surface
        in your Horizon Practice morning Plan — pull them into your day there.
      </p>

      {milestones.map((m, mi) => {
        const mDate  = getMilestoneDate(m, mi)
        const mTasks = tasks.filter(t => t.milestone === mi)

        return (
          <div key={mi} style={{ marginBottom: '20px' }}>
            <div style={{ borderLeft: `3px solid ${colour}`, paddingLeft: '14px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: fn.moss, textTransform: 'uppercase' }}>Month {mi + 1}</span>
                {mDate && (
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: tokens.ghost }}>{new Date(mDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                )}
                <button type="button" onClick={() => addCalEvent(`${domain} — Month ${mi + 1} milestone`, mDate)}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: calAdded[`${domain} — Month ${mi + 1} milestone`] ? fn.moss : tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
                    <div key={ti} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', padding: '10px 12px', background: tokens.bgCard, border: '1px solid rgba(110,127,92,0.12)', borderRadius: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.55 }}>{t.text}</div>
                        {tDate && (
                          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: tokens.ghost }}>
                              {editingDate === `task-${mi}-${ti}` ? (
                                <input type="date" defaultValue={tDate} autoFocus
                                  onBlur={e => {
                                    const updated = tasks.map((x, i) => tasks.indexOf(t) === i ? { ...x, date: e.target.value || tDate } : x)
                                    update({ tasks: updated }); setEditingDate(null)
                                  }}
                                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', background: 'none', border: 'none', color: tokens.ghost, cursor: 'pointer', outline: 'none', padding: 0 }} />
                              ) : (
                                <span onClick={() => setEditingDate(`task-${mi}-${ti}`)} style={{ cursor: 'pointer' }}>
                                  {new Date(tDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </span>
                            <button type="button" onClick={() => addCalEvent(`${domain}: ${t.text.slice(0, 60)}`, tDate)}
                              style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: calAdded[`${domain}: ${t.text.slice(0, 60)}`] ? fn.moss : tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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

// ─── Domain panel ─────────────────────────────────────────────────────────────

function DomainPanel({ domainId, domainData, setDomainData, hasMapData, mapData, targetDate, endDateLabel, iaStatement, horizonSelfStatement, currentScore, horizonScore, planetData, userId, onSaveAway }) {
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

  const identityPayload = { iaStatement: iaStatement || null, horizonSelfStatement: horizonSelfStatement || null }

  async function generateMilestones() {
    setGenerating(true)
    try {
      const res  = await fetch('/tools/target-sprint/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'milestones', domain: domainId, targetGoal: dd.targetGoal, horizonText: dd.horizonText, currentStateSummary: dd.currentStateSummary, iaStatement: iaStatement || null, horizonSelfStatement: horizonSelfStatement || null, userId }) })
      const data = await res.json()
      if (data.milestones) update({ milestones: data.milestones })
    } catch {}
    setGenerating(false)
  }

  async function generateTasks(milestoneIdx) {
    setGenerating(true)
    try {
      const res  = await fetch('/tools/target-sprint/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'tasks', domain: domainId, targetGoal: dd.targetGoal, milestoneText: dd.milestones?.[milestoneIdx]?.text, milestoneIndex: milestoneIdx, currentStateSummary: dd.currentStateSummary || null, iaStatement: iaStatement || null, horizonSelfStatement: horizonSelfStatement || null, currentScore: currentScore ?? null, horizonScore: horizonScore ?? null, userId }) })
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <StepStrip domainId={domainId} domainData={domainData} activeStep={viewStep === 'coach' ? null : viewStep} onStepClick={setViewStep} />
        </div>
        {dd.tasks?.length > 0 && (
          <button type="button"
            onClick={() => setViewStep(viewStep === 'coach' ? 'tasks' : 'coach')}
            style={{ flexShrink: 0, marginLeft: '12px', marginBottom: '22px', ...sc, fontSize: '13px', letterSpacing: '0.14em', color: viewStep === 'coach' ? '#FFFFFF' : fn.moss, background: viewStep === 'coach' ? fn.moss : 'rgba(110,127,92,0.08)', border: '1px solid rgba(110,127,92,0.5)', borderRadius: '20px', padding: '5px 14px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
            {viewStep === 'coach' ? '← Plan' : 'Coach →'}
          </button>
        )}
      </div>

      {/* Gentle Map nudge: shown when the identity inputs the tasks draw from are
          thin. Non-blocking: the stretch works without them, it just lands truer
          with them. This is the seam where the task generator is weakest. */}
      {(!iaStatement || !horizonSelfStatement) && (
        <div style={{ padding: '12px 16px', background: 'rgba(110,127,92,0.05)', border: '1px solid rgba(110,127,92,0.2)', borderRadius: '8px', margin: '4px 0 16px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: fn.moss, textTransform: 'uppercase', marginBottom: '6px' }}>Sharpen this stretch</div>
          <div style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.65, marginBottom: '10px' }}>
            This stretch is built from your Horizon Self in {d.label} · the version of you the daily actions are drawn from. That work isn&rsquo;t in yet. You can carry on, and the actions land truer once your Map and I Am statements are done.
          </div>
          <a href="/nextu/map" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: fn.moss, textDecoration: 'none', borderBottom: `1px solid ${fn.moss}`, paddingBottom: '1px' }}>Do the Map →</a>
        </div>
      )}

      {/* Step: Current State */}
      {viewStep === 'current_state' && (
        <div>
          <h3 style={{ ...sc, fontSize: '1.0625rem', fontWeight: 400, color: tokens.dark, marginBottom: '6px' }}>Where you are</h3>
          <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
            Where are you right now in {d.label} — honestly? This is the ground the stretch starts from.
          </p>
          {hasMapData && (mapDomain.realityFinal || mapDomain.realityDraft) && !dd.currentStateSummary && (
            <div style={{ padding: '12px 16px', background: 'rgba(110,127,92,0.05)', border: '1px solid rgba(110,127,92,0.2)', borderRadius: '8px', marginBottom: '14px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>From your Map</div>
              <div style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.65, marginBottom: '10px' }}>{mapDomain.realityFinal || mapDomain.realityDraft}</div>
              <Btn onClick={() => update({ currentStateSummary: mapDomain.realityFinal || mapDomain.realityDraft, currentStateFromMap: true })} style={{ padding: '8px 18px', fontSize: '13px' }}>
                Use this →
              </Btn>
            </div>
          )}
          {dd.currentStateSummary ? (
            <div>
              <div style={{ padding: '14px 16px', background: tokens.bgCard, border: '1px solid rgba(110,127,92,0.2)', borderLeft: `3px solid ${colour}`, borderRadius: '8px', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7, marginBottom: '14px' }}>
                {dd.currentStateSummary}
              </div>
              <EditableList items={[{ text: dd.currentStateSummary }]} onSave={items => update({ currentStateSummary: items[0]?.text || dd.currentStateSummary })} itemKey="text" />
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Btn onClick={() => setViewStep('horizon')}>Set horizon →</Btn>
                <SaveAway onClick={onSaveAway} />
              </div>
            </div>
          ) : !hasMapData || !(mapDomain.realityFinal || mapDomain.realityDraft) ? (
            <ChatPanel mode="current_state" domainId={domainId} payload={identityPayload} placeholder={`Where are you with ${d.label} right now?`} userId={userId}
              onComplete={data => { if (data.canLock && data.summary) update({ currentStateSummary: data.summary }) }} />
          ) : null}
        </div>
      )}

      {/* Step: Horizon */}
      {viewStep === 'horizon' && (
        <div>
          <h3 style={{ ...sc, fontSize: '1.0625rem', fontWeight: 400, color: tokens.dark, marginBottom: '6px' }}>Horizon</h3>
          <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
            Where does your Horizon Self live in this area? Not a 90-day target — the honest version of your best life here.
          </p>
          {hasMapData && mapDomain.horizonText && mapDomain.horizonText !== 'See sub-domain horizons' && !dd.horizonText && (
            <div style={{ padding: '12px 16px', background: 'rgba(110,127,92,0.05)', border: '1px solid rgba(110,127,92,0.2)', borderRadius: '8px', marginBottom: '14px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>From your Map</div>
              <div style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.65, marginBottom: '10px' }}>{mapDomain.horizonText}</div>
              <Btn onClick={() => update({ horizonText: mapDomain.horizonText, horizonFromMap: true })} style={{ padding: '8px 18px', fontSize: '13px' }}>
                Use this →
              </Btn>
            </div>
          )}
          {dd.horizonText ? (
            <div>
              <div style={{ padding: '14px 16px', background: tokens.bgCard, border: '1px solid rgba(110,127,92,0.2)', borderLeft: `3px solid ${colour}`, borderRadius: '8px', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7, marginBottom: '14px' }}>
                {dd.horizonText}
              </div>
              <EditableList items={[{ text: dd.horizonText }]} onSave={items => update({ horizonText: items[0]?.text || dd.horizonText })} itemKey="text" />
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Btn onClick={() => setViewStep('target_goal')}>Set 90-day target →</Btn>
                <SaveAway onClick={onSaveAway} />
              </div>
            </div>
          ) : (
            <ChatPanel mode="horizon" domainId={domainId} payload={{ hasMapData, mapHorizonText: mapDomain.horizonText, mapHorizonScore: mapDomain.horizonScore, ...identityPayload }} placeholder="Describe where you'd wish to be…" userId={userId}
              onComplete={data => { if (data.canLock && data.horizonText) update({ horizonText: data.horizonText }) }} />
          )}
        </div>
      )}

      {/* Step: Target Goal */}
      {viewStep === 'target_goal' && (
        <div>
          <h3 style={{ ...sc, fontSize: '1.0625rem', fontWeight: 400, color: tokens.dark, marginBottom: '6px' }}>Target Goal</h3>
          <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '4px' }}>
            A stretch 90-day goal on the way to your Horizon. If you were your
            Horizon Self here, taking clear action — where would the first leg land?
          </p>
          {dd.horizonText && (
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', ...muted, textTransform: 'uppercase', marginBottom: '14px' }}>
              Toward: <span style={{ ...body, fontSize: '1.0625rem', textTransform: 'none', letterSpacing: 0, color: 'rgba(15,21,35,0.78)' }}>{dd.horizonText}</span>
            </div>
          )}
          <WaypointStrip
            currentScore={currentScore}
            targetScore={dd.targetScore}
            horizonScore={horizonScore}
            colour={colour}
            onTargetChange={v => update({ targetScore: v, targetScoreSetByUser: true })}
          />
          {dd.targetGoal ? (
            <div>
              <div style={{ padding: '14px 16px', background: tokens.bgCard, border: '1px solid rgba(110,127,92,0.2)', borderLeft: `3px solid ${colour}`, borderRadius: '8px', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7, marginBottom: '14px' }}>
                {dd.targetGoal}
              </div>
              <EditableList items={[{ text: dd.targetGoal }]} onSave={items => update({ targetGoal: items[0]?.text || dd.targetGoal })} itemKey="text" />
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Btn onClick={() => setViewStep('milestones')}>Set milestones →</Btn>
                <SaveAway onClick={onSaveAway} />
              </div>
            </div>
          ) : (
            <ChatPanel mode="target_goal" domainId={domainId}
              payload={{ currentStateSummary: dd.currentStateSummary, horizonText: dd.horizonText, targetDate, todayDate: new Date().toISOString().slice(0, 10), currentScore, horizonScore, targetScore: dd.targetScore, ...identityPayload }}
              placeholder="Describe your 90-day target…" userId={userId}
              onComplete={data => {
                const patch = {}
                if (data.targetGoal) patch.targetGoal = data.targetGoal
                if (data.milestones?.length) patch.milestones = data.milestones
                if (data.tasks?.length) patch.tasks = data.tasks
                if (data.conversationInsight) patch.conversationInsight = data.conversationInsight
                if (data.targetScore != null && !dd.targetScoreSetByUser) patch.targetScore = data.targetScore
                if (Object.keys(patch).length) update(patch)
              }} />
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
                <div key={i} style={{ padding: '12px 16px', background: tokens.bgCard, border: '1px solid rgba(110,127,92,0.18)', borderLeft: `3px solid ${colour}`, borderRadius: '8px', ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.65, marginBottom: '8px' }}>
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: fn.moss, textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Month {i + 1}</span>
                  {m.text}
                </div>
              ))}
              <EditableList items={dd.milestones} onSave={items => update({ milestones: items.map((x, i) => ({ ...x, order: i })) })} itemKey="text" addLabel="+ Add milestone" />
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
        const ps = planetData || {}
        const sprintContext = {
          domains: [{
            id: domainId, label: d.label,
            targetGoal: dd.targetGoal, horizonText: dd.horizonText,
            milestones: dd.milestones || [], tasks: dd.tasks || [],
            milestoneChecked: dd.milestoneChecked || {}, taskChecked: dd.taskChecked || {},
            goalChecked: dd.goalChecked || false,
          }],
          planetSprint: ps.commitment ? { serves: ps.serves || '', commitment: ps.commitment, tasks: ps.tasks || [], taskChecked: ps.taskChecked || {} } : null,
          iaStatement: iaStatement || null,
          horizonSelfStatement: horizonSelfStatement || null,
          targetDate, endDateLabel,
          todayDate: new Date().toISOString().slice(0, 10),
        }
        return <StretchCoach key={domainId + '-coach'} sprintContext={sprintContext} userId={userId} />
      })()}
    </div>
  )
}

// ─── Planet Sprint panel ──────────────────────────────────────────────────────
// The outer arc — a full slot, not an afterthought. The same Horizon Self,
// pointed outward: a contribution to a person, a community, the planet.
// Optional. For those with capacity. Schema carries source/designedBy so
// org- and group-designed sprints can plug in later.

// ─── Feedback prompt ──────────────────────────────────────────────────────────
// Shown after a designed Planet Sprint (challenge_id set) completes.
// Three steps: consent gate → optional reflection → attribution choice.
// Never shown for self-authored stretches — only designed challenges.
// Consent is true opt-in: default is NO, must be actively switched.

function FeedbackPrompt({ callId, userId, onDone }) {
  const [step,       setStep]       = useState('consent')
  const [consent,    setConsent]    = useState(false)
  const [reflection, setReflection] = useState('')
  const [attributed, setAttributed] = useState(false)
  const [saving,     setSaving]     = useState(false)

  async function submit() {
    setSaving(true)
    try {
      await actorCallsRaw({
          action: 'submit_feedback', userId, call_id: callId,
          consent,
          reflection:            consent && reflection.trim() ? reflection.trim() : null,
          reflection_public:     consent && !!reflection.trim(),
          reflection_attributed: consent && attributed,
        })
    } catch {}
    setSaving(false)
    setStep('thanks')
  }

  return (
    <div style={{ marginTop: '24px', padding: '22px 24px', background: tokens.dark, borderRadius: '14px', borderTop: `3px solid ${GOLD_C}` }}>
      {step === 'consent' && (
        <div>
          <Eyebrow style={{ color: '#D9A94A', marginBottom: '8px' }}>You completed a challenge.</Eyebrow>
          <p style={{ ...body, fontSize: '1.0625rem', color: 'rgba(250,250,247,0.85)', lineHeight: 1.7, marginBottom: '12px' }}>
            The author — and the people who'll take this on after you — benefit from knowing what happened. Want to share how it went?
          </p>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(250,250,247,0.55)', lineHeight: 1.65, marginBottom: '20px' }}>
            Completely optional. Your participation is always private. Sharing is an active choice you make right now.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Btn onClick={() => { setConsent(true); setStep('reflect') }}
              style={{ background: 'rgba(110,127,92,0.15)', borderColor: 'rgba(110,127,92,0.6)', color: '#D9A94A', fontSize: '13px', padding: '8px 20px' }}>
              Yes, I'll share →
            </Btn>
            <button type="button" onClick={() => { setConsent(false); submit() }}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(250,250,247,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>
              No thanks
            </button>
          </div>
        </div>
      )}
      {step === 'reflect' && (
        <div>
          <Eyebrow style={{ color: '#D9A94A', marginBottom: '8px' }}>What happened?</Eyebrow>
          <p style={{ ...body, fontSize: '1.0625rem', color: 'rgba(250,250,247,0.85)', lineHeight: 1.7, marginBottom: '14px' }}>
            What shifted? What surprised you? What would you tell someone starting this?
          </p>
          <textarea
            value={reflection} onChange={e => setReflection(e.target.value)}
            placeholder="Optional — share as much or as little as feels right."
            rows={4}
            style={{ width: '100%', ...body, fontSize: '1.0625rem', color: '#FAFAF7', background: 'rgba(250,250,247,0.07)', border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '12px 14px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
          />
          <Btn onClick={() => setStep('attribution')}
            style={{ background: 'rgba(110,127,92,0.15)', borderColor: 'rgba(110,127,92,0.6)', color: '#D9A94A', fontSize: '13px', padding: '8px 20px' }}>
            {reflection.trim() ? 'Continue →' : 'Skip →'}
          </Btn>
        </div>
      )}
      {step === 'attribution' && (
        <div>
          <Eyebrow style={{ color: '#D9A94A', marginBottom: '8px' }}>How do you want this shared?</Eyebrow>
          <p style={{ ...body, fontSize: '1.0625rem', color: 'rgba(250,250,247,0.85)', lineHeight: 1.7, marginBottom: '18px' }}>
            {reflection.trim()
              ? 'Your reflection can appear on the challenge page alongside others. Choose how it shows.'
              : 'Your completion will be counted — no reflection shared.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
            {[
              { v: false, l: 'Anonymous',     d: 'No name — just the reflection.' },
              { v: true,  l: 'With my name',  d: 'Your display name appears alongside it.' },
            ].map(o => (
              <button key={String(o.v)} type="button" onClick={() => setAttributed(o.v)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  border: `1px solid ${attributed === o.v ? 'rgba(110,127,92,0.6)' : 'rgba(250,250,247,0.15)'}`,
                  background: attributed === o.v ? 'rgba(110,127,92,0.12)' : 'transparent' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, marginTop: '2px', transition: 'all 0.2s',
                  border: `2px solid ${attributed === o.v ? '#D9A94A' : 'rgba(250,250,247,0.35)'}`,
                  background: attributed === o.v ? '#D9A94A' : 'transparent' }} />
                <div>
                  <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: '#FAFAF7', marginBottom: '2px' }}>{o.l}</div>
                  <div style={{ ...body, fontSize: '13px', color: 'rgba(250,250,247,0.55)' }}>{o.d}</div>
                </div>
              </button>
            ))}
          </div>
          <Btn onClick={submit} disabled={saving}
            style={{ background: 'rgba(110,127,92,0.15)', borderColor: 'rgba(110,127,92,0.6)', color: '#D9A94A', fontSize: '13px', padding: '8px 20px' }}>
            {saving ? 'Saving…' : 'Submit →'}
          </Btn>
        </div>
      )}
      {step === 'thanks' && (
        <div>
          <Eyebrow style={{ color: '#D9A94A', marginBottom: '8px' }}>Thank you.</Eyebrow>
          <p style={{ ...body, fontSize: '1.0625rem', color: 'rgba(250,250,247,0.85)', lineHeight: 1.7, marginBottom: '16px' }}>
            {consent && reflection.trim()
              ? 'Your reflection helps the people who come after you.'
              : 'Your completion has been recorded.'}
          </p>
          <Btn onClick={onDone} style={{ background: 'rgba(110,127,92,0.15)', borderColor: 'rgba(110,127,92,0.6)', color: '#D9A94A', fontSize: '13px', padding: '8px 20px' }}>
            Done
          </Btn>
        </div>
      )}
    </div>
  )
}

// ─── Clock helpers (shared by Planet Sprint creation surfaces) ────────────────

export function computeClock(type) {
  const today = new Date()
  const fmt = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  if (type === 'calendar') {
    const month = today.getMonth()
    let qEnd
    if (month < 3)      qEnd = new Date(today.getFullYear(), 2, 31)
    else if (month < 6) qEnd = new Date(today.getFullYear(), 5, 30)
    else if (month < 9) qEnd = new Date(today.getFullYear(), 8, 30)
    else                qEnd = new Date(today.getFullYear(), 11, 31)
    const qL = month < 3 ? 'Q1' : month < 6 ? 'Q2' : month < 9 ? 'Q3' : 'Q4'
    const days = Math.round((qEnd - today) / 86400000)
    return { quarterType: 'calendar', targetDate: qEnd.toISOString().slice(0, 10), endDateLabel: `${qL} end — ${fmt(qEnd)} (${days} days)` }
  }
  const rolling = new Date(today); rolling.setDate(rolling.getDate() + 90)
  return { quarterType: 'rolling', targetDate: rolling.toISOString().slice(0, 10), endDateLabel: `90 days — ${fmt(rolling)}` }
}

function ClockChips({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
      {[{ t: 'rolling', l: 'Rolling 90 days' }, { t: 'calendar', l: 'Calendar quarter' }].map(o => (
        <button key={o.t} type="button" onClick={() => onChange(o.t)}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s',
            border: `1px solid ${value === o.t ? 'rgba(110,127,92,0.78)' : 'rgba(110,127,92,0.3)'}`,
            background: value === o.t ? 'rgba(110,127,92,0.08)' : 'transparent',
            color: value === o.t ? fn.moss : tokens.ghost }}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

function planetDaysLeft(targetDate) {
  if (!targetDate) return null
  return Math.max(0, Math.ceil((new Date(targetDate + 'T23:59:59') - new Date()) / 86400000))
}

// ─── Window-closed banner ─────────────────────────────────────────────────────
// Shown on an active stretch whose target date has passed. Before this, the
// page sat silently at "0 days left" with no visible way forward: the
// complete/debrief flow existed but only behind the quiet "Review my stretch"
// pill, and the clock could never be changed after creation. Both paths are
// now explicit at the moment they're needed.
function WindowClosedBanner({ onReview, onExtend }) {
  const chip = { ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '7px 16px',
    borderRadius: '20px', cursor: 'pointer', border: '1px solid rgba(110,127,92,0.45)',
    background: 'transparent', color: fn.moss }
  return (
    <div style={{ background: 'rgba(110,127,92,0.07)', border: '1.5px solid rgba(110,127,92,0.4)',
      borderRadius: '14px', padding: '20px 24px', margin: '0 0 22px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: fn.moss, marginBottom: '8px' }}>
        WINDOW CLOSED
      </div>
      <p style={{ ...serif, fontSize: '16px', color: tokens.dark, lineHeight: 1.55, margin: '0 0 16px' }}>
        This stretch reached its end date. Close it out with a debrief, or set a new
        window and keep going. Your work here stays either way.
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn onClick={onReview}>Review and complete →</Btn>
        <button type="button" style={chip} onClick={() => onExtend(computeClock('rolling'))}>
          New window · rolling 90 days
        </button>
        <button type="button" style={chip} onClick={() => onExtend(computeClock('calendar'))}>
          New window · to quarter end
        </button>
      </div>
    </div>
  )
}

// ─── Planet Sprint panel ──────────────────────────────────────────────────────
// The outer arc — a SIBLING SESSION, not an embedded blob. Its own row, its
// own clock, its own lifecycle: it can start months after the personal
// stretch and outlive it. The same Horizon Self, pointed outward.

function PlanetSprintPanel({ civ, onCreate, onUpdateData, onComplete, onExtendClock, onSaveAway }) {
  const ps = civ?.data || {}
  const [draftServes,     setDraftServes]     = useState('')
  const [draftCommitment, setDraftCommitment] = useState('')
  const [draftClock,      setDraftClock]      = useState('rolling')
  const [draftTask,       setDraftTask]       = useState('')
  const [composing,       setComposing]       = useState(false)
  const [confirmDone,     setConfirmDone]     = useState(false)

  const live   = civ && civ.status === 'active' && ps.commitment
  const pTasks = ps.tasks || []
  const days   = live ? planetDaysLeft(civ.targetDate) : null

  if (!live && !composing) {
    return (
      <div style={{ background: tokens.bgCard, border: hair, borderRadius: '14px', borderTop: `3px solid ${GOLD_C}`, padding: '22px 24px', marginTop: '24px' }}>
        <Eyebrow style={{ marginBottom: '4px' }}>Planet Sprint · The Outer Arc</Eyebrow>
        <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: '0 0 14px' }}>
          Your Horizon Self also gives. One contribution beyond yourself —
          a person, a community, the planet. Its own 90 days, on its own clock,
          starting whenever you have the capacity.
        </p>
        <Btn onClick={() => setComposing(true)} style={{ fontSize: '13px', padding: '8px 20px' }}>Add a Planet Sprint →</Btn>
      </div>
    )
  }

  if (!live && composing) {
    return (
      <div style={{ background: tokens.bgCard, border: hair, borderRadius: '14px', borderTop: `3px solid ${GOLD_C}`, padding: '22px 24px', marginTop: '24px' }}>
        <Eyebrow style={{ marginBottom: '4px' }}>Planet Sprint · The Outer Arc</Eyebrow>
        <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: '0 0 14px' }}>
          The same Horizon Self — pointed outward. Who or what does this serve,
          what's the one concrete commitment, and on which clock?
        </p>
        <input
          type="text"
          value={draftServes}
          onChange={e => setDraftServes(e.target.value)}
          placeholder="Who or what it serves — a person, a community, the planet"
          style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '10px 14px', outline: 'none', background: tokens.bg, boxSizing: 'border-box', marginBottom: '10px' }}
        />
        <textarea
          placeholder="The commitment — one concrete contribution"
          rows={3}
          value={draftCommitment}
          onChange={e => setDraftCommitment(e.target.value)}
          style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '12px 14px', resize: 'vertical', outline: 'none', background: tokens.bg, boxSizing: 'border-box', marginBottom: '12px' }}
        />
        <ClockChips value={draftClock} onChange={setDraftClock} />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn disabled={!draftCommitment.trim()} onClick={() => { onCreate({ serves: draftServes.trim(), commitment: draftCommitment.trim(), clock: draftClock }); setComposing(false); setDraftServes(''); setDraftCommitment('') }}>
            Lock in my Planet Sprint →
          </Btn>
          <button type="button" onClick={() => setComposing(false)}
            style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Not right now
          </button>
        </div>
      </div>
    )
  }

  // Live — the outer arc on its own clock
  return (
    <div style={{ background: tokens.bgCard, border: hair, borderRadius: '14px', borderTop: `3px solid ${GOLD_C}`, padding: '22px 24px', marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <Eyebrow style={{ marginBottom: '4px' }}>Planet Sprint · The Outer Arc</Eyebrow>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {days !== null && days > 0 && (
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: fn.moss, border: '1px solid rgba(110,127,92,0.4)', borderRadius: '20px', padding: '3px 10px', whiteSpace: 'nowrap' }}>
              {days} days left
            </span>
          )}
          {days === 0 && (
            <>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.ghost, whiteSpace: 'nowrap' }}>
                Window closed · extend:
              </span>
              <button type="button" onClick={() => onExtendClock(computeClock('rolling'))}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '3px 12px', borderRadius: '20px', cursor: 'pointer', border: '1px solid rgba(110,127,92,0.45)', background: 'transparent', color: fn.moss, whiteSpace: 'nowrap' }}>
                90 days
              </button>
              <button type="button" onClick={() => onExtendClock(computeClock('calendar'))}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '3px 12px', borderRadius: '20px', cursor: 'pointer', border: '1px solid rgba(110,127,92,0.45)', background: 'transparent', color: fn.moss, whiteSpace: 'nowrap' }}>
                to quarter end
              </button>
            </>
          )}
          {ps.serves && (
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.ghost, whiteSpace: 'nowrap' }}>For {ps.serves}</span>
          )}
        </div>
      </div>
      <p style={{ ...body, fontSize: '1.125rem', ...meta, lineHeight: 1.7, margin: '6px 0 12px' }}>{ps.commitment}</p>
      <EditableList items={[{ text: ps.commitment }]} onSave={items => onUpdateData({ commitment: items[0]?.text || ps.commitment })} itemKey="text" />

      <Rule style={{ margin: '14px 0' }} />
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: fn.moss, textTransform: 'uppercase', marginBottom: '8px' }}>Moves</div>
      {pTasks.map((t, i) => {
        const tDone = !!ps.taskChecked?.[i]
        return (
          <label key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '6px' }}>
            <input type="checkbox" checked={tDone}
              onChange={e => onUpdateData({ taskChecked: { ...(ps.taskChecked || {}), [i]: e.target.checked } })}
              style={{ marginTop: '3px', accentColor: GOLD_C, flexShrink: 0, width: '14px', height: '14px' }} />
            <span style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.55, textDecoration: tDone ? 'line-through' : 'none', opacity: tDone ? 0.38 : 1, transition: 'all 0.3s' }}>
              {t.text}
            </span>
          </label>
        )
      })}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <input
          type="text"
          value={draftTask}
          onChange={e => setDraftTask(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && draftTask.trim()) { onUpdateData({ tasks: [...pTasks, { text: draftTask.trim() }] }); setDraftTask('') } }}
          placeholder="Add a concrete move…"
          style={{ flex: 1, ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '8px 12px', outline: 'none', background: tokens.bg }}
        />
        <button type="button" disabled={!draftTask.trim()}
          onClick={() => { onUpdateData({ tasks: [...pTasks, { text: draftTask.trim() }] }); setDraftTask('') }}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: fn.moss, background: 'rgba(110,127,92,0.08)', border: '1px solid rgba(110,127,92,0.5)', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', opacity: draftTask.trim() ? 1 : 0.4 }}>
          Add
        </button>
      </div>
      <div style={{ marginTop: '12px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <SaveAway onClick={onSaveAway} />
        {confirmDone ? (
          <span style={{ display: 'inline-flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.ghost }}>Mark complete?</span>
            <Btn onClick={() => { setConfirmDone(false); onComplete() }} style={{ fontSize: '13px', padding: '5px 14px' }}>Yes — given →</Btn>
            <button type="button" onClick={() => setConfirmDone(false)} style={{ ...sc, fontSize: '13px', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer' }}>Not yet</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDone(true)}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: fn.moss, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>
            COMPLETE THIS PLANET SPRINT
          </button>
        )}
      </div>
    </div>
  )
}


// ─── Publish panel ────────────────────────────────────────────────────────────
// Appears in the sprint view once the stretch is fully set up.
// Lets the person publish this challenge for others to take on — same data,
// new visibility. Three steps: draft → link_only → community.
// The form fills from the existing stretch data and can be overridden.

function PublishPanel({ domainData, domainId, userId, actorId }) {
  const dd = domainData[domainId] || {}
  const ps = domainData.__planet_sprint__ || {}
  const [open,        setOpen]        = useState(false)
  const [callId,      setCallId]      = useState(null)
  const [visibility,  setVisibility]  = useState('draft')
  const [publishedUrl, setPublishedUrl] = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [errors,      setErrors]      = useState([])

  // Form pre-filled from the stretch
  const [form, setForm] = useState({
    title:             dd.targetGoal || '',
    tagline:           '',
    scale:             'self',
    domain:            domainId || '',
    horizon_goal_text: dd.horizonText || '',
    the_move:          dd.targetGoal || '',
    cadence:           '5-of-7',
    cadence_note:      '',
    duration_days:     90,
    measure:           '',
    mechanism:         '',
  })

  useEffect(() => {
    setForm(f => ({
      ...f,
      title:             dd.targetGoal || f.title,
      horizon_goal_text: dd.horizonText || f.horizon_goal_text,
      the_move:          dd.targetGoal  || f.the_move,
      domain:            domainId || f.domain,
    }))
  }, [domainId, dd.targetGoal, dd.horizonText])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function validateAndCreate() {
    setSaving(true); setErrors([])
    try {
      // Floor check
      const vRes  = await actorCallsRaw({ action: 'validate_floor', ...form })
      const vData = await vRes.json()
      if (!vData.passes) { setErrors(vData.errors || ['Below Challenge Floor']); setSaving(false); return }

      // Create
      const cRes  = await actorCallsRaw({ action: 'create', userId, actor_id: actorId || null, ...form })
      const cData = await cRes.json()
      if (cData.call?.id) { setCallId(cData.call.id); setVisibility('draft') }
    } catch { setErrors(['Something went wrong. Try again.']) }
    setSaving(false)
  }

  async function publish(vis) {
    if (!callId) return
    setSaving(true); setErrors([])
    try {
      const pRes  = await actorCallsRaw({ action: 'publish', userId, call_id: callId, visibility: vis })
      const pData = await pRes.json()
      if (pData.error) { setErrors([pData.error]); setSaving(false); return }
      setVisibility(vis)
      if (pData.url) setPublishedUrl(pData.url)
    } catch { setErrors(['Something went wrong.']) }
    setSaving(false)
  }

  if (!open) {
    return (
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: hair }}>
        <button type="button" onClick={() => setOpen(true)}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
          OFFER THIS AS A CHALLENGE →
        </button>
      </div>
    )
  }

  const CADENCE_OPTS = [
    { v: '5-of-7',         l: '5 of 7 days' },
    { v: 'daily-absolute', l: 'Every day (absolute)' },
    { v: 'weekly',         l: 'Once per week' },
    { v: 'custom',         l: 'Custom' },
  ]
  const SCALE_OPTS = [
    { v: 'self', l: 'Personal (supports individual growth)' },
    { v: 'civ',  l: 'Planetary (points beyond yourself)' },
  ]

  return (
    <div style={{ marginTop: '24px', padding: '20px 22px', background: tokens.bgCard, border: `1.5px solid rgba(110,127,92,0.35)`, borderRadius: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Eyebrow style={{ marginBottom: 0 }}>Offer as a challenge</Eyebrow>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '1rem', color: tokens.ghost }}>×</button>
      </div>
      <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
        If this worked for you, publish it so others can take it on. The Challenge Floor requires a concrete move, cadence, mechanism, and a Horizon Goal this moves.
      </p>

      {publishedUrl ? (
        <div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#2A8C4F', marginBottom: '8px' }}>
            {visibility === 'community' ? '✓ Community — listed and browsable' : '✓ Published — anyone with the link'}
          </div>
          <div style={{ ...body, fontSize: '1.0625rem', color: tokens.dark, padding: '10px 14px', background: 'rgba(110,127,92,0.05)', border: hair, borderRadius: '8px', marginBottom: '12px', wordBreak: 'break-all' }}>
            {window.location.origin}{publishedUrl}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { navigator.clipboard.writeText(window.location.origin + publishedUrl) }}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: fn.moss, background: 'rgba(110,127,92,0.07)', border: '1px solid rgba(110,127,92,0.4)', borderRadius: '20px', padding: '7px 16px', cursor: 'pointer' }}>
              Copy link
            </button>
            {visibility === 'link_only' && (
              <Btn onClick={() => publish('community')} disabled={saving} style={{ fontSize: '13px', padding: '7px 18px' }}>
                List in community →
              </Btn>
            )}
          </div>
        </div>
      ) : callId ? (
        <div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, marginBottom: '12px' }}>Saved as draft. Choose visibility:</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Btn onClick={() => publish('link_only')} disabled={saving} style={{ fontSize: '13px', padding: '8px 20px' }}>
              Shareable link only →
            </Btn>
            <Btn onClick={() => publish('community')} disabled={saving} style={{ fontSize: '13px', padding: '8px 20px' }}>
              List in community →
            </Btn>
          </div>
        </div>
      ) : (
        <div>
          {/* Floor fields */}
          {[
            { k: 'title',             l: 'Challenge title',      ph: 'Name this challenge',                      long: false },
            { k: 'tagline',           l: 'One-line description', ph: 'What is this, concisely',                  long: false },
            { k: 'horizon_goal_text', l: 'Horizon Goal moved',   ph: 'Which civilisational Horizon Goal does this move toward?', long: true },
            { k: 'the_move',          l: 'The move',             ph: 'The concrete daily/weekly action',         long: true },
            { k: 'measure',           l: "How you'll know",     ph: "The concrete signal that it's working",   long: false },
            { k: 'mechanism',         l: 'Why this works',       ph: 'The mechanism — why this moves the domain',long: true },
          ].map(({ k, l, ph, long }) => (
            <div key={k} style={{ marginBottom: '12px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, marginBottom: '4px', textTransform: 'uppercase' }}>{l}</div>
              {long ? (
                <textarea value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} rows={2}
                  style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '10px 12px', resize: 'vertical', outline: 'none', background: tokens.bg, boxSizing: 'border-box' }} />
              ) : (
                <input type="text" value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                  style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '10px 12px', outline: 'none', background: tokens.bg, boxSizing: 'border-box' }} />
              )}
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, marginBottom: '4px', textTransform: 'uppercase' }}>Cadence</div>
              <select value={form.cadence} onChange={e => set('cadence', e.target.value)}
                style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '10px 12px', outline: 'none', background: tokens.bg }}>
                {CADENCE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, marginBottom: '4px', textTransform: 'uppercase' }}>Scale</div>
              <select value={form.scale} onChange={e => set('scale', e.target.value)}
                style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '10px 12px', outline: 'none', background: tokens.bg }}>
                {SCALE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          </div>
          {form.cadence === 'daily-absolute' && (
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#D63838', marginBottom: '12px', padding: '8px 12px', background: 'rgba(214,56,56,0.05)', border: '1px solid rgba(214,56,56,0.2)', borderRadius: '6px' }}>
              Absolute cadence: no missed days. This will be labeled clearly so participants know what they're committing to.
            </div>
          )}

          {errors.length > 0 && (
            <div style={{ ...body, fontSize: '1.0625rem', color: '#D63838', marginBottom: '12px', padding: '10px 14px', background: 'rgba(214,56,56,0.05)', border: '1px solid rgba(214,56,56,0.2)', borderRadius: '8px' }}>
              {errors.join(' · ')}
            </div>
          )}
          <Btn onClick={validateAndCreate} disabled={saving} style={{ marginTop: '4px' }}>
            {saving ? 'Checking floor…' : 'Save draft →'}
          </Btn>
        </div>
      )}
    </div>
  )
}

// ─── Create Ask panel ─────────────────────────────────────────────────────────
// Actors and individuals can post asks directly — specific things they need,
// not 90-day commitments. Lives on the stretch view for actors who've claimed
// a profile, and can be accessed from the actor manage page (Phase C).

const CIV_DOMAIN_OPTIONS = [
  { slug: 'human-being',     label: 'Human Being'      },
  { slug: 'society',         label: 'Society'           },
  { slug: 'nature',          label: 'Nature'            },
  { slug: 'technology',      label: 'Technology'        },
  { slug: 'finance-economy', label: 'Economy' },
  { slug: 'legacy',          label: 'Legacy'            },
  { slug: 'vision',          label: 'Vision'            },
]

function CreateAskPanel({ userId, actorId }) {
  const [open,        setOpen]        = useState(false)
  const [callId,      setCallId]      = useState(null)
  const [publishedUrl, setPublishedUrl] = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [errors,      setErrors]      = useState([])
  const [form, setForm] = useState({
    title: '', tagline: '', scale: 'civ', domain: '',
    horizon_goal_text: '', the_move: '', mechanism: '',
    ask_quantity: '', ask_deadline: '',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function saveAndPublish(vis) {
    setSaving(true); setErrors([])
    try {
      // Validate floor (reuse challenge floor — same required fields apply)
      const vPayload = { ...form, cadence: 'custom', duration_days: 90, measure: form.mechanism }
      const vRes  = await actorCallsRaw({ action: 'validate_floor', ...vPayload })
      const vData = await vRes.json()
      if (!vData.passes) { setErrors(vData.errors || ['Below floor']); setSaving(false); return }

      // Create
      const cRes  = await actorCallsRaw({ action: 'create', userId, actor_id: actorId || null, type: 'ask', ...form, cadence: 'custom', duration_days: null })
      const cData = await cRes.json()
      if (!cData.call?.id) { setErrors(['Could not save.']); setSaving(false); return }
      const id = cData.call.id
      setCallId(id)

      // Publish immediately if not draft
      if (vis !== 'draft') {
        const pRes  = await actorCallsRaw({ action: 'publish', userId, call_id: id, visibility: vis })
        const pData = await pRes.json()
        if (pData.url) setPublishedUrl(pData.url)
      }
    } catch { setErrors(['Something went wrong.']) }
    setSaving(false)
  }

  if (!open) return (
    <div style={{ marginTop: '12px' }}>
      <button type="button" onClick={() => setOpen(true)}
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
        POST AN ASK →
      </button>
    </div>
  )

  return (
    <div style={{ marginTop: '20px', padding: '20px 22px', background: tokens.bgCard, border: `1.5px solid rgba(110,127,92,0.25)`, borderRadius: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <Eyebrow style={{ marginBottom: 0 }}>Post an ask</Eyebrow>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '1rem', color: tokens.ghost }}>×</button>
      </div>
      <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '14px' }}>
        A specific need — a person, a skill, a resource, a window of time. Fulfilled when someone steps up, not completed over 90 days.
      </p>

      {publishedUrl ? (
        <div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#2A8C4F', marginBottom: '8px' }}>✓ Ask is live</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigator.clipboard.writeText(window.location.origin + publishedUrl)}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: fn.moss, background: 'rgba(110,127,92,0.07)', border: '1px solid rgba(110,127,92,0.4)', borderRadius: '20px', padding: '7px 16px', cursor: 'pointer' }}>
              Copy link
            </button>
            <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', ...gold, textDecoration: 'none', border: '1px solid rgba(110,127,92,0.4)', borderRadius: '20px', padding: '7px 16px' }}>
              View ask →
            </a>
          </div>
        </div>
      ) : (
        <div>
          {/* Domain — slug chips, same vocabulary as the Atlas */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, marginBottom: '6px', textTransform: 'uppercase' }}>Domain</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CIV_DOMAIN_OPTIONS.map(d => (
                <button key={d.slug} type="button" onClick={() => set('domain', d.slug)}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', padding: '5px 14px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${form.domain === d.slug ? 'rgba(110,127,92,0.78)' : 'rgba(110,127,92,0.3)'}`,
                    background: form.domain === d.slug ? 'rgba(110,127,92,0.08)' : 'transparent',
                    color: form.domain === d.slug ? fn.moss : tokens.ghost }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          {[
            { k: 'title',             l: 'Title',              ph: 'Name this ask',                              long: false },
            { k: 'the_move',          l: "What's needed",      ph: 'Exactly what you need someone to do or provide', long: true },
            { k: 'horizon_goal_text', l: 'Why it matters',     ph: 'Which Horizon Goal does this support?',      long: true },
            { k: 'mechanism',         l: 'What it enables',    ph: 'What becomes possible when this is filled?', long: true },
          ].map(({ k, l, ph, long }) => (
            <div key={k} style={{ marginBottom: '10px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, marginBottom: '3px', textTransform: 'uppercase' }}>{l}</div>
              {long ? (
                <textarea value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} rows={2}
                  style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '9px 12px', resize: 'vertical', outline: 'none', background: tokens.bg, boxSizing: 'border-box' }} />
              ) : (
                <input type="text" value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                  style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '9px 12px', outline: 'none', background: tokens.bg, boxSizing: 'border-box' }} />
              )}
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, marginBottom: '3px', textTransform: 'uppercase' }}>How many needed</div>
              <input type="number" min="1" value={form.ask_quantity} onChange={e => set('ask_quantity', e.target.value)} placeholder="Leave blank for open"
                style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '9px 12px', outline: 'none', background: tokens.bg, boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, marginBottom: '3px', textTransform: 'uppercase' }}>Needed by</div>
              <input type="date" value={form.ask_deadline} onChange={e => set('ask_deadline', e.target.value)}
                style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '9px 12px', outline: 'none', background: tokens.bg, boxSizing: 'border-box' }} />
            </div>
          </div>
          {errors.length > 0 && (
            <div style={{ ...body, fontSize: '1.0625rem', color: '#D63838', marginBottom: '10px', padding: '8px 12px', background: 'rgba(214,56,56,0.05)', border: '1px solid rgba(214,56,56,0.2)', borderRadius: '8px' }}>
              {errors.join(' · ')}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
            <Btn onClick={() => saveAndPublish('link_only')} disabled={saving} style={{ fontSize: '13px', padding: '8px 20px' }}>
              {saving ? 'Saving…' : 'Shareable link →'}
            </Btn>
            <Btn onClick={() => saveAndPublish('community')} disabled={saving} style={{ fontSize: '13px', padding: '8px 20px' }}>
              Post to community →
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}

function PhaseSelect({ hasMapData, scores, horizonScores, iaStatements = {}, selectedDomain, setSelectedDomain, recommendation, onContinue }) {
  const scoreFallbackRec = hasMapData && !recommendation?.recommended && Object.keys(scores).length > 0
    ? DOMAINS.filter(d => scores[d.id] !== undefined).sort((a, b) => scores[a.id] - scores[b.id]).slice(0, 1).map(d => d.id)
    : null

  return (
    <div style={{ maxWidth: '760px', padding: 'clamp(64px,8vw,96px) clamp(20px,5vw,40px) 80px', margin: '0 auto' }}>
      <Eyebrow>Target Stretch</Eyebrow>
      <h1 style={{ ...serif, fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 300, color: tokens.dark, lineHeight: 1.1, marginBottom: '10px' }}>
        Ninety days as your Horizon Self.
      </h1>
      <Rule />
      <p style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.75, marginBottom: '8px', maxWidth: '560px' }}>
        If you were already them — in one area of your life, taking clear action
        for one quarter — what could you accomplish? Choose the arena.
      </p>
      <p style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost, lineHeight: 1.7, marginBottom: '20px', maxWidth: '560px' }}>
        Inner Game is built in — the whole stretch is identity work. Choose it as
        your arena only if you want that work front and centre.
      </p>

      {recommendation?.soft_observation && (
        <div style={{ padding: '14px 18px', background: 'rgba(110,127,92,0.05)', border: '1px solid rgba(110,127,92,0.2)', borderRadius: '8px', ...body, fontSize: '1.0625rem', ...meta, marginBottom: '24px', lineHeight: 1.65 }}>
          {recommendation.soft_observation}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '10px', marginBottom: '28px' }}>
        {DOMAINS.map(d => {
          const sel    = selectedDomain === d.id
          const isRec  = recommendation?.recommended?.includes(d.id) || scoreFallbackRec?.includes(d.id)
          const rat    = recommendation?.rationale?.[d.id]
          const s      = scores[d.id]
          const col    = s !== undefined ? getColor(s) : null
          const colour = DOMAIN_COLORS[d.id]?.base || GOLD_C
          return (
            <div key={d.id}
              onClick={() => setSelectedDomain(sel ? null : d.id)}
              style={{ padding: '16px', border: `1.5px solid ${sel ? 'rgba(110,127,92,0.78)' : 'rgba(110,127,92,0.2)'}`, borderLeft: sel ? `4px solid ${colour}` : '1.5px solid rgba(110,127,92,0.2)', borderRadius: '10px', background: sel ? 'rgba(110,127,92,0.06)' : tokens.bgCard, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,21,35,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              <div style={{ ...sc, fontSize: '1.125rem', letterSpacing: '0.08em', color: sel ? fn.moss : tokens.dark, marginBottom: '4px' }}>
                {d.label}{isRec ? ' ☆' : ''}
              </div>
              <div style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.55, marginBottom: s !== undefined ? '10px' : 0 }}>
                {rat || d.description}
              </div>
              {s !== undefined && (
                <>
                  <div style={{ height: '2px', background: 'rgba(110,127,92,0.1)', borderRadius: '1px', overflow: 'hidden', marginBottom: '4px' }}>
                    <div style={{ height: '100%', width: `${s * 10}%`, background: col, borderRadius: '1px' }} />
                  </div>
                  <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: col }}>{s}</span>
                    <span style={{ color: tokens.ghost }}>→</span>
                    <span style={{ color: horizonScores[d.id] != null ? GOLD_C : 'rgba(110,127,92,0.3)' }}>{horizonScores[d.id] != null ? horizonScores[d.id] : '?'}</span>
                    <span style={{ color: col, marginLeft: '2px' }}>· {getTierLabel(s)}</span>
                  </div>
                  {iaStatements[d.id] && (
                    <div style={{ ...body, fontStyle: 'italic', fontSize: '13px', color: tokens.ghost, lineHeight: 1.5, marginTop: '6px' }}>
                      {iaStatements[d.id]}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn onClick={onContinue} disabled={!selectedDomain}>This is the arena →</Btn>
      </div>
    </div>
  )
}

// ─── Setup phase: the outer arc invitation ────────────────────────────────────

function PhasePlanet({ onCreate, onContinue, onBack }) {
  const [serves,     setServes]     = useState('')
  const [commitment, setCommitment] = useState('')
  const [clock,      setClock]      = useState('rolling')

  function lockAndContinue() {
    onCreate({ serves: serves.trim(), commitment: commitment.trim(), clock })
    onContinue()
  }

  return (
    <div style={{ maxWidth: '620px', padding: 'clamp(64px,8vw,96px) clamp(20px,5vw,40px) 80px', margin: '0 auto' }}>
      <Eyebrow>Target Stretch · The Outer Arc</Eyebrow>
      <h2 style={{ ...serif, fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 300, color: tokens.dark, lineHeight: 1.15, marginBottom: '10px' }}>
        Your Horizon Self also gives.
      </h2>
      <Rule />
      <p style={{ ...body, fontSize: '1.125rem', ...meta, lineHeight: 1.75, marginBottom: '8px' }}>
        The same identity, pointed outward. Alongside your own stretch, one
        contribution to someone or something beyond you — a person, a community,
        the planet. It runs on its own clock; it can start now or any time you
        have the capacity.
      </p>
      <p style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost, lineHeight: 1.7, marginBottom: '24px' }}>
        This one is optional. You can add it later from your stretch, or not at all.
      </p>

      <input
        type="text"
        value={serves}
        onChange={e => setServes(e.target.value)}
        placeholder="Who or what it serves"
        style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '12px 14px', outline: 'none', background: tokens.bg, boxSizing: 'border-box', marginBottom: '10px' }}
      />
      <textarea
        placeholder="The commitment — one concrete contribution"
        rows={3}
        value={commitment}
        onChange={e => setCommitment(e.target.value)}
        style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(110,127,92,0.3)', borderRadius: '8px', padding: '12px 14px', resize: 'vertical', outline: 'none', background: tokens.bg, boxSizing: 'border-box', marginBottom: '14px' }}
      />
      <ClockChips value={clock} onChange={setClock} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button type="button" onClick={onBack} style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>← Back</button>
        <Btn onClick={lockAndContinue} disabled={!commitment.trim()}>Add the outer arc →</Btn>
        <button type="button" onClick={onContinue}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', textDecorationColor: 'rgba(15,21,35,0.25)', textUnderlineOffset: '3px' }}>
          KEEP THIS ONE PERSONAL
        </button>
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
            style={{ padding: '20px 22px', border: `1.5px solid ${quarterType === o.type ? 'rgba(110,127,92,0.78)' : 'rgba(110,127,92,0.2)'}`, borderRadius: '12px', background: quarterType === o.type ? 'rgba(110,127,92,0.06)' : tokens.bgCard, cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ ...sc, fontSize: '1.125rem', letterSpacing: '0.08em', color: quarterType === o.type ? fn.moss : tokens.dark, marginBottom: '3px' }}>{o.title}</div>
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

  const [phase,           setPhase]            = useState('select')
  const [hasMapData,      setHasMapData]       = useState(false)
  const [mapData,         setMapData]          = useState(null)
  const [scores,          setScores]           = useState({})
  const [horizonScores,   setHorizonScores]    = useState({})
  const [iaStatements,    setIaStatements]     = useState({})
  const [horizonSelfStatement, setHorizonSelfStatement] = useState(null)
  const [practiceStreak,  setPracticeStreak]   = useState(0)
  const [selectedDomains, setSelectedDomains]  = useState([])
  const [quarterType,     setQuarterType]      = useState(null)
  const [targetDate,      setTargetDate]       = useState(null)
  const [endDateLabel,    setEndDateLabel]     = useState(null)
  const [recommendation,  setRecommendation]   = useState(null)
  const [sessionId,       setSessionId]        = useState(null)
  const [showSummary,     setShowSummary]      = useState(false)
  const [showSprintDone,  setShowSprintDone]   = useState(false)
  const [showDebrief,     setShowDebrief]      = useState(false)
  const [domainData,      setDomainData]       = useState({})
  const [restoring,       setRestoring]        = useState(true)
  // Sibling civ session — the Planet Sprint row. { id, status, quarterType,
  // targetDate, endDateLabel, data } where data = domain_data.__planet_sprint__
  const [civ,             setCiv]              = useState(null)
  const [pendingFeedback, setPendingFeedback]  = useState(null)  // { callId } | null
  const civRef = useRef(null)
  useEffect(() => { civRef.current = civ }, [civ])
  const loadedRef = useRef(false)

  const selectedDomain = selectedDomains[0] || null
  const setSelectedDomain = id => setSelectedDomains(id ? [id] : [])

  // Auto-save via shared hook — same whisper pattern as HorizonSelfOnboarding.
  // Pass saveToSupabase directly (NOT wrapped in useCallback with empty deps):
  // useAutoSave keeps a latest-ref updated each render, so the raw function
  // always closes over current state. Wrapping it froze first-render state.
  const { queue: queueSave, whisper } = useAutoSave(saveToSupabase, 1500)

  useEffect(() => { loadedRef.current = false }, [user?.id])

  // A new personal stretch's setup must not offer a second Planet Sprint
  // while one is already live — the outer arc has its own lifecycle.
  useEffect(() => {
    if (phase === 'planet' && civ && civ.status === 'active' && civ.data?.commitment) setPhase('quarter')
  }, [phase, civ])

  useEffect(() => {
    if (!user || loadedRef.current) return
    loadedRef.current = true
    loadSprintData().finally(() => setRestoring(false))
    loadMapData()
    loadPracticeStreak()
  }, [user])

  // Restore an unanswered feedback prompt from a previous session (Fix 12)
  useEffect(() => {
    if (!user?.id) return
    try {
      const raw = localStorage.getItem('tg_pending_feedback')
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved?.callId && saved.userId === user.id) setPendingFeedback({ callId: saved.callId })
      else localStorage.removeItem('tg_pending_feedback')
    } catch {}
  }, [user?.id])

  function rowToCiv(row) {
    return {
      id:           row.id,
      status:       row.status,
      quarterType:  row.quarter_type   || null,
      targetDate:   row.target_date    || null,
      endDateLabel: row.end_date_label || null,
      challengeId:  row.challenge_id   || null,  // B5: feedback links back to the call
      data:         row.domain_data?.__planet_sprint__ || {},
    }
  }

  async function loadSprintData() {
    try {
      // Both scales in one fetch; civ rows are identified by scale='civ'
      // (or, pre-migration, never exist). Split client-side so the query
      // works whether or not the scale column has landed.
      const { data: rows } = await supabase
        .from('target_sprint_sessions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'draft'])
        .order('updated_at', { ascending: false })
        .limit(6)

      const selfRow = (rows || []).find(r => (r.scale ?? 'self') === 'self' && Array.isArray(r.domains) && r.domains.length)
      const civRow  = (rows || []).find(r => r.scale === 'civ')

      if (civRow) setCiv(rowToCiv(civRow))

      if (selfRow) {
        setSessionId(selfRow.id)
        setSelectedDomains([selfRow.domains[0]])
        const dd = { ...(selfRow.domain_data || {}) }
        // Silent migration: an embedded Planet Sprint blob from the pre-B1
        // shape graduates to a sibling civ row (inheriting the personal
        // clock it was sharing), and the blob is dropped from local state —
        // the next personal save persists the removal.
        if (!civRow && dd.__planet_sprint__?.commitment) {
          migrateEmbeddedPlanet(dd.__planet_sprint__, selfRow)
        }
        delete dd.__planet_sprint__
        setDomainData(dd)
        setQuarterType(selfRow.quarter_type || null)
        setTargetDate(selfRow.target_date || null)
        setEndDateLabel(selfRow.end_date_label || null)
        setHasMapData(selfRow.has_map_data || false)
        if (selfRow.scores_at_start) setScores(selfRow.scores_at_start)
        const restoredPhase = selfRow.session_phase || (selfRow.status === 'active' ? 'sprint' : 'select')
        setPhase(restoredPhase === 'quarter' || restoredPhase === 'planet' ? restoredPhase : (restoredPhase === 'sprint' ? 'sprint' : 'select'))
        return
      }
    } catch {}
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.phase && saved.phase !== 'select') {
          setPhase(saved.phase)
          setSelectedDomains((saved.selectedDomains || []).slice(0, 1))
          setQuarterType(saved.quarterType || null); setTargetDate(saved.targetDate || null)
          setEndDateLabel(saved.endDateLabel || null)
          const dd = { ...(saved.domainData || {}) }; delete dd.__planet_sprint__
          setDomainData(dd)
        }
      }
    } catch {}
  }

  async function migrateEmbeddedPlanet(blob, selfRow) {
    try {
      const now = new Date().toISOString()
      const { data: inserted } = await supabase
        .from('target_sprint_sessions')
        .insert({
          user_id: user.id,
          scale: 'civ',
          domains: [],
          status: 'active',
          quarter_type: selfRow.quarter_type || 'rolling',
          target_date: selfRow.target_date || computeClock('rolling').targetDate,
          end_date_label: selfRow.end_date_label || computeClock('rolling').endDateLabel,
          domain_data: { __planet_sprint__: { source: 'self', designedBy: null, ...blob } },
          created_at: now, updated_at: now,
        })
        .select('*')
        .single()
      if (inserted) setCiv(rowToCiv(inserted))
    } catch {}
  }

  // ── Civ session lifecycle ───────────────────────────────────────────────────

  async function createCivSession({ serves, commitment, clock }) {
    if (!commitment) return
    const clk = computeClock(clock || 'rolling')
    const data = { serves: serves || '', commitment, tasks: [], taskChecked: {}, source: 'self', designedBy: null }
    const local = { id: null, status: 'active', quarterType: clk.quarterType, targetDate: clk.targetDate, endDateLabel: clk.endDateLabel, data }
    setCiv(local)
    if (!user?.id) return
    try {
      const now = new Date().toISOString()
      const { data: inserted } = await supabase
        .from('target_sprint_sessions')
        .insert({
          user_id: user.id, scale: 'civ', domains: [], status: 'active',
          quarter_type: clk.quarterType, target_date: clk.targetDate, end_date_label: clk.endDateLabel,
          domain_data: { __planet_sprint__: data },
          created_at: now, updated_at: now,
        })
        .select('id')
        .single()
      if (inserted?.id) setCiv(c => ({ ...(c || local), id: inserted.id }))
    } catch {}
  }

  function updateCivData(patch) {
    setCiv(c => c ? { ...c, data: { ...c.data, ...patch } } : c)
    queueSave({})
  }

  async function completeCivSession() {
    const current = civRef.current
    if (current?.id && user?.id) {
      try {
        await supabase.from('target_sprint_sessions')
          .update({ status: 'complete', updated_at: new Date().toISOString() })
          .eq('id', current.id)
      } catch {}
    }
    // If this civ session came from a designed challenge, invite feedback.
    // Persisted to localStorage so the prompt survives navigating away.
    if (current?.challengeId && user?.id) {
      setPendingFeedback({ callId: current.challengeId })
      try { localStorage.setItem('tg_pending_feedback', JSON.stringify({ callId: current.challengeId, userId: user.id })) } catch {}
    }
    setCiv(null)
  }

  useEffect(() => {
    if (phase === 'select' && !selectedDomains.length) return
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ phase, selectedDomains, quarterType, targetDate, endDateLabel, domainData }))
    } catch {}
  }, [phase, selectedDomains, quarterType, targetDate, endDateLabel, domainData])

  async function loadMapData() {
    try {
      const { data } = await supabase.from('map_results').select('session, completed_at, complete, life_ia_statement').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      if (data?.life_ia_statement) setHorizonSelfStatement(data.life_ia_statement)
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

  async function loadPracticeStreak() {
    try {
      const { data } = await supabase
        .from('horizon_practice_streak')
        .select('streak_current')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data?.streak_current) setPracticeStreak(data.streak_current)
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
    if (type === 'planet' || domainId === '__planet_sprint__') {
      const cur = civRef.current
      if (!cur) return
      updateCivData({ taskChecked: { ...(cur.data.taskChecked || {}), [taskIdx]: checked } })
      return
    }
    setDomainData(prev => {
      const dd = { ...(prev[domainId] || {}) }
      if (type === 'goal')      dd.goalChecked      = checked
      if (type === 'milestone') dd.milestoneChecked = { ...(dd.milestoneChecked || {}), [milestoneIdx]: checked }
      if (type === 'task')      dd.taskChecked      = { ...(dd.taskChecked || {}), [taskIdx]: checked }
      return { ...prev, [domainId]: dd }
    })
  }

  async function saveToSupabase() {
    if (!user?.id) return
    const now = new Date().toISOString()

    // ── Personal (self) row ────────────────────────────────────────────────
    if (selectedDomains?.length) {
      try {
        const status = phase === 'sprint' ? 'active' : 'draft'
        const cleanData = { ...domainData }; delete cleanData.__planet_sprint__
        const core   = { user_id: user.id, domains: selectedDomains, quarter_type: quarterType, target_date: targetDate, status, updated_at: now }
        const ext1   = { ...core, domain_data: cleanData, end_date_label: endDateLabel, scores_at_start: scores, horizon_scores: horizonScores, has_map_data: hasMapData }
        const ext2   = { ...ext1, session_phase: phase, active_domain_id: selectedDomain, scale: 'self' }

        async function tryInsert(p) { return supabase.from('target_sprint_sessions').insert({ ...p, created_at: now }).select('id').single() }
        async function tryUpdate(p) { return supabase.from('target_sprint_sessions').update(p).eq('id', sessionId) }

        if (sessionId) {
          let { error } = await tryUpdate(ext2); if (error) ({ error } = await tryUpdate(ext1)); if (error) await tryUpdate(core)
        } else {
          let { data, error } = await tryInsert(ext2); if (error) ({ data, error } = await tryInsert(ext1)); if (error) ({ data, error } = await tryInsert(core)); if (data?.id) setSessionId(data.id)
        }
      } catch {}
    }

    // ── Civ (Planet Sprint) row ────────────────────────────────────────────
    const cur = civRef.current
    if (cur?.id && cur.status === 'active') {
      try {
        await supabase.from('target_sprint_sessions')
          .update({ domain_data: { __planet_sprint__: cur.data }, updated_at: now })
          .eq('id', cur.id)
      } catch {}
    }

    // ── North Star note — both arcs ────────────────────────────────────────
    try {
      const isActive = phase === 'sprint' && selectedDomain
      if (isActive || (cur?.status === 'active' && cur.data?.commitment)) {
        const label = selectedDomain ? (DOMAIN_BY_ID[selectedDomain]?.label || selectedDomain) : null
        const parts = []
        if (isActive) parts.push(`Active Target Stretch: ${label} (as Horizon Self)`)
        if (cur?.status === 'active' && cur.data?.commitment) parts.push(`Planet Sprint: ${cur.data.commitment.slice(0, 120)}`)
        await supabase.from('north_star_notes').delete().eq('user_id', user.id).eq('tool', 'target-sprint')
        await supabase.from('north_star_notes').insert([{ user_id: user.id, tool: 'target-sprint', note: parts.join(' + ') }])
      }
    } catch {}
  }

  // Queue save whenever meaningful state changes
  useEffect(() => {
    if (!user?.id) return
    if (!selectedDomains?.length && !civ) return
    queueSave({})
  }, [selectedDomains, quarterType, targetDate, endDateLabel, domainData, phase, civ])

  async function handleStretchComplete() {
    if (sessionId && user?.id) {
      try { await supabase.from('target_sprint_sessions').update({ status: 'complete', updated_at: new Date().toISOString() }).eq('id', sessionId) } catch {}
    }
    setShowSummary(false); setShowDebrief(true)
  }

  function handleStartNewStretch() {
    try { localStorage.removeItem(LS_KEY) } catch {}
    setSessionId(null); setSelectedDomains([]); setDomainData({}); setQuarterType(null); setTargetDate(null); setEndDateLabel(null); setPhase('select'); setShowSprintDone(false); setShowDebrief(false)
  }

  const d  = selectedDomain ? DOMAIN_BY_ID[selectedDomain] : null
  const dd = selectedDomain ? (domainData[selectedDomain] || {}) : {}
  // Merged display view: components keep reading domainData.__planet_sprint__;
  // the planet half now comes from the sibling civ row.
  const planetLive = civ && civ.status === 'active' && civ.data?.commitment
  const viewData   = planetLive ? { ...domainData, __planet_sprint__: civ.data } : domainData
  const setupComplete = !!dd.currentStateSummary && !!dd.horizonText && !!dd.targetGoal && dd.milestones?.length > 0 && dd.tasks?.length > 0

  if (authLoading || accessLoading) return <div className="loading" />

  return (
    <div className="page-shell">
      <style>{`
        @media (max-width: 900px) {
          .ts-grid { grid-template-columns: 1fr !important; }
          .ts-rings-col { order: -1; justify-self: center; position: static !important; }
        }
        @media (max-width: 640px) {
          .ts-tool-wrap { padding-left: 20px !important; padding-right: 20px !important; }
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
            toolContext={{
              endDateLabel,
              domains: selectedDomain ? [{ id: selectedDomain, label: d?.label, targetGoal: dd.targetGoal || '', horizonText: dd.horizonText || '', milestones: dd.milestones || [], tasks: dd.tasks || [], milestoneChecked: dd.milestoneChecked || {}, taskChecked: dd.taskChecked || {}, goalChecked: dd.goalChecked || false }] : [],
              planetSprint: (civ && civ.status === 'active' ? civ.data : null) || null,
            }}
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
            <a href="/nextu" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'rgba(110,127,92,0.05)', border: '1.5px solid rgba(110,127,92,0.55)', borderRadius: '10px', textDecoration: 'none' }}>
              <div>
                <div style={{ ...sc, fontSize: '1.0625rem', letterSpacing: '0.1em', color: fn.moss, marginBottom: '4px' }}>Your Journey</div>
                <div style={{ ...body, fontSize: '1rem', color: tokens.ghost }}>See what shifted across your seven domains.</div>
              </div>
              <span style={{ ...sc, fontSize: '1.25rem', color: fn.moss, flexShrink: 0, marginLeft: '16px' }}>→</span>
            </a>
            <a href="/tools/horizon-practice" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: tokens.bgCard, border: '1px solid rgba(110,127,92,0.25)', borderRadius: '10px', textDecoration: 'none' }}>
              <div>
                <div style={{ ...sc, fontSize: '1.0625rem', letterSpacing: '0.1em', color: tokens.dark, marginBottom: '4px' }}>Daily Practice</div>
                <div style={{ ...body, fontSize: '1rem', color: tokens.ghost }}>Where the work continues, every morning.</div>
              </div>
              <span style={{ ...sc, fontSize: '1.25rem', color: tokens.ghost, flexShrink: 0, marginLeft: '16px' }}>→</span>
            </a>
            <a href="/tools/map" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: tokens.bgCard, border: '1px solid rgba(110,127,92,0.25)', borderRadius: '10px', textDecoration: 'none' }}>
              <div>
                <div style={{ ...sc, fontSize: '1.0625rem', letterSpacing: '0.1em', color: tokens.dark, marginBottom: '4px' }}>Rescore The Map</div>
                <div style={{ ...body, fontSize: '1rem', color: tokens.ghost }}>See what actually moved in ninety days.</div>
              </div>
              <span style={{ ...sc, fontSize: '1.25rem', color: tokens.ghost, flexShrink: 0, marginLeft: '16px' }}>→</span>
            </a>
            <button type="button" onClick={handleStartNewStretch}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: tokens.bgCard, border: '1px solid rgba(110,127,92,0.25)', borderRadius: '10px', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <div>
                <div style={{ ...sc, fontSize: '1.0625rem', letterSpacing: '0.1em', color: tokens.dark, marginBottom: '4px' }}>Start a new stretch</div>
                <div style={{ ...body, fontSize: '1rem', color: tokens.ghost }}>Choose your next arena.</div>
              </div>
              <span style={{ ...sc, fontSize: '1.25rem', color: tokens.ghost, flexShrink: 0, marginLeft: '16px' }}>→</span>
            </button>
          </div>
        </div>
      )}

      {showSummary && selectedDomain && (
        <StretchSummaryModal domainId={selectedDomain} domainData={viewData} currentScore={scores[selectedDomain]} horizonScore={horizonScores[selectedDomain]} onClose={() => setShowSummary(false)} onComplete={handleStretchComplete} />
      )}

      <div className="ts-tool-wrap" style={{ padding: 'clamp(0px,2vw,16px) clamp(20px,4vw,40px) 100px' }}>

        {/* ── Restoring gate — signed-in users wait one beat while we check
              for an active stretch, so the select screen never flashes ── */}
        {user && restoring && !showDebrief && !showSprintDone && (
          <div style={{ textAlign: 'center', padding: '120px 0', ...sc, fontSize: '15px', letterSpacing: '0.2em', color: tokens.ghost }}>
            TARGET STRETCH
          </div>
        )}

        {/* ── Select phase ──────────────────────────────────────────────── */}
        {phase === 'select' && !(user && restoring) && !showDebrief && !showSprintDone && (
          <PhaseSelect hasMapData={hasMapData} scores={scores} horizonScores={horizonScores} iaStatements={iaStatements} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} recommendation={recommendation} onContinue={() => setPhase('planet')} />
        )}

        {/* ── Outer arc phase ───────────────────────────────────────────── */}
        {phase === 'planet' && (
          <PhasePlanet onCreate={createCivSession} onBack={() => setPhase('select')} onContinue={() => setPhase('quarter')} />
        )}

        {/* ── Quarter phase ─────────────────────────────────────────────── */}
        {phase === 'quarter' && (
          <PhaseQuarter quarterType={quarterType} setQuarterType={setQuarterType} setTargetDate={setTargetDate} setEndDateLabel={setEndDateLabel} onBack={() => setPhase('planet')} onContinue={() => { setPhase('sprint'); setTimeout(saveToSupabase, 0) }} />
        )}

        {/* ── Stretch phase ─────────────────────────────────────────────── */}
        {phase === 'sprint' && !selectedDomain && !showDebrief && !showSprintDone && (
          <div style={{ textAlign: 'center', padding: '60px 0', ...body, fontSize: '1.25rem', color: tokens.ghost }}>
            Loading your stretch…
          </div>
        )}
        {phase === 'sprint' && selectedDomain && d && !showDebrief && !showSprintDone && (
          <div className="ts-fade-up" style={{ maxWidth: '980px', margin: '0 auto', paddingTop: '32px' }}>
            {/* Save whisper */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', minHeight: '24px' }}>
              <SavedWhisper state={whisper} />
            </div>

            {/* Header */}
            <div style={{ marginBottom: '18px' }}>
              <Eyebrow>Target Stretch · {endDateLabel}</Eyebrow>
              <h1 style={{ ...serif, fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 300, color: tokens.dark, lineHeight: 1.1, margin: '6px 0 0' }}>
                {d.label}
              </h1>
            </div>

            {planetDaysLeft(targetDate) === 0 && (
              <WindowClosedBanner
                onReview={() => setShowSummary(true)}
                onExtend={clk => {
                  setQuarterType(clk.quarterType)
                  setTargetDate(clk.targetDate)
                  setEndDateLabel(clk.endDateLabel)
                }}
              />
            )}

            <IdentityBanner domainId={selectedDomain} iaStatements={iaStatements} horizonSelfStatement={horizonSelfStatement} practiceStreak={practiceStreak} />

            <div className="ts-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: '32px', alignItems: 'start' }}>
              {/* Flow column */}
              <div style={{ minWidth: 0 }}>
                <SetupStatusBar domainId={selectedDomain} domainData={domainData} />

                <div style={{ background: tokens.bg, border: '1.5px solid rgba(110,127,92,0.2)', borderRadius: '14px', padding: '26px 28px' }}>
                  <DomainPanel
                    domainId={selectedDomain}
                    domainData={domainData}
                    setDomainData={setDomainData}
                    hasMapData={hasMapData}
                    mapData={mapData}
                    targetDate={targetDate}
                    endDateLabel={endDateLabel}
                    iaStatement={iaStatements[selectedDomain]}
                    horizonSelfStatement={horizonSelfStatement}
                    currentScore={scores[selectedDomain]}
                    horizonScore={horizonScores[selectedDomain]}
                    planetData={planetLive ? civ.data : null}
                    userId={user?.id}
                    onSaveAway={() => { queueSave({}) }}
                  />
                </div>

                <PlanetSprintPanel civ={civ} onCreate={createCivSession} onUpdateData={updateCivData} onComplete={completeCivSession} onSaveAway={() => queueSave({})}
                  onExtendClock={async clk => {
                    setCiv(c => c ? { ...c, quarterType: clk.quarterType, targetDate: clk.targetDate, endDateLabel: clk.endDateLabel } : c)
                    if (civ?.id) {
                      try {
                        await supabase.from('target_sprint_sessions')
                          .update({ quarter_type: clk.quarterType, target_date: clk.targetDate, end_date_label: clk.endDateLabel, updated_at: new Date().toISOString() })
                          .eq('id', civ.id)
                      } catch {}
                    }
                  }} />

                {pendingFeedback && user && (
                  <FeedbackPrompt
                    callId={pendingFeedback.callId}
                    userId={user.id}
                    onDone={() => { setPendingFeedback(null); try { localStorage.removeItem('tg_pending_feedback') } catch {} }}
                  />
                )}

                {setupComplete && (
                  <AccomplishmentTally domains={[d]} domainData={viewData} onCheck={handleCheck} />
                )}

                {setupComplete && user && (
                  <PublishPanel
                    domainData={domainData}
                    domainId={selectedDomain}
                    userId={user.id}
                    actorId={null}
                  />
                )}
                {user && (
                  <CreateAskPanel userId={user.id} actorId={null} />
                )}

                {!hasMapData && (
                  <div style={{ padding: '18px 20px', background: 'rgba(110,127,92,0.05)', border: '1px solid rgba(110,127,92,0.18)', borderRadius: '12px', marginTop: '24px' }}>
                    <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>Want the full picture?</div>
                    <p style={{ ...body, fontSize: '1.0625rem', ...meta, lineHeight: 1.7, marginBottom: '12px' }}>
                      The Map gives you an honest read across all seven domains — and loads your scores directly into your next stretch.
                    </p>
                    <a href="/tools/map" style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', ...gold, textDecoration: 'none', border: '1px solid rgba(110,127,92,0.5)', borderRadius: '30px', padding: '8px 18px', display: 'inline-block' }}>
                      Begin The Map →
                    </a>
                  </div>
                )}
              </div>

              {/* Rings column */}
              <div className="ts-rings-col" style={{ position: 'sticky', top: '96px' }}>
                <div style={{ textAlign: 'center' }}>
                  <StretchRings domainId={selectedDomain} domainData={viewData} targetDate={targetDate}
                    onPlanetClick={() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }) }} />
                  <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: tokens.ghost, marginTop: '4px' }}>
                    INNER ARC · {d.label.toUpperCase()}
                    {planetLive ? ' — OUTER ARC · PLANET' : ''}
                  </div>
                  {setupComplete && (
                    <div style={{ marginTop: '16px' }}>
                      <Btn variant="ghost" onClick={() => setShowSummary(true)} style={{ fontSize: '13px', padding: '8px 20px' }}>
                        Review my stretch →
                      </Btn>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
