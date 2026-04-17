import { useState, useRef, useEffect, useCallback } from 'react'
import { ToolCompassPanel } from '../../components/ToolCompassPanel'
import { Nav } from '../../components/Nav'
import { DomainTooltip } from '../../components/DomainTooltip'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { AccessGate } from '../../components/AccessGate'
import { supabase } from '../../hooks/useSupabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const SS_KEY = 'tg_session_v2'

const DOMAINS = [
  { id: 'path',          label: 'Path',          description: "Your contribution, calling, and the work you're here to do. Not your job title — the thread of purpose running beneath whatever you're currently doing. Life's mission.",              question: "Am I walking my path — or just walking?" },
  { id: 'spark',         label: 'Spark',         description: 'The animating fire. The things that make you feel genuinely alive — not just occupied. When Spark is low, everything else runs on fumes.', question: "When did I last feel genuinely alive \u2014 and what's been costing me that?" },
  { id: 'body',          label: 'Body',          description: 'Your physical instrument. The vessel through which everything else operates — and the one thing you cannot outsource, replace, or defer indefinitely.',   question: 'Am I honouring this instrument \u2014 or running it into the ground?' },
  { id: 'finances',      label: 'Finances',      description: 'The currency that gives you the capacity to act. Resources, mobility, and agency to convert your visions into reality and your desires into choices.', question: 'Do I have the agency to act on what matters?' },
  { id: 'connection', label: 'Connection', description: 'How you inhabit connection across the full range of your relational life. Not just the presence of people — the quality of the connection. Are you genuinely known?',       question: 'Am I truly known by anyone \u2014 and am I truly knowing them?' },
  { id: 'inner_game',    label: 'Inner Game',    description: "Your relationship with yourself. The beliefs, stories, values, and emotional patterns you carry about who you are and what you're capable of. The source code — everything else runs on it.", question: 'What story about myself is quietly running the room \u2014 and is that story still true?' },
  { id: 'signal',    label: 'Signal',    description: "Your external world: environment, appearance, presence, and public-facing persona. Where inner alignment meets the world's perception of you — and the two need to match.", question: "Is what I'm broadcasting aligned with who I actually am?" },
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
  if (n >= 9) return '#3B6B9E'
  if (n >= 7) return '#5A8AB8'
  if (n >= 5) return '#8A8070'
  if (n >= 3) return '#C8922A'
  return '#8A3030'
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }
const gold  = { color: '#A8721A' }
const muted = { color: 'rgba(15,21,35,0.72)' }
const meta  = { color: 'rgba(15,21,35,0.72)' }

const btnStyle = {
  ...sc, fontSize: '1.125rem', letterSpacing: '0.14em', color: '#A8721A',
  background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)',
  borderRadius: '40px', padding: '12px 28px', cursor: 'pointer',
  transition: 'all 0.2s', minHeight: '44px',
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Eyebrow({ children }) {
  return <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>{children}</span>
}

function Rule() {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', margin: '18px 0' }} />
}

function Btn({ onClick, disabled, children, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...btnStyle, opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
      {children}
    </button>
  )
}

function ThinkingDots() {
  return <div className="bubble bubble-assistant"><div className="typing-indicator"><span /><span /><span /></div></div>
}

// ─── Welcome modal ────────────────────────────────────────────────────────────

function WelcomeModal({ onBegin }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '44px 36px 36px', maxWidth: '460px', width: '100%', textAlign: 'center' }}>
        <span style={{ display: 'block', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '17px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '14px' }}>Target Sprint</span>
        <h2 style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.5rem', fontWeight: 400, color: '#0F1523', marginBottom: '16px', lineHeight: 1.1 }}>Three months. Three areas.</h2>
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '32px' }}>
          Ninety days. Three domains. Moving from one level of your life to a meaningfully fuller one.<br />Powerful on its own, supercharged when you’ve done The Map.
        </p>
        <button onClick={onBegin} style={{
          display: 'block', width: '100%', padding: '15px 24px', borderRadius: '40px',
          border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)',
          color: '#A8721A', fontFamily: "'Cormorant SC', Georgia, serif",
          fontSize: '1.125rem', letterSpacing: '0.14em', cursor: 'pointer',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.55)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,1)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)' }}
        >
          Begin {'\u2192'}
        </button>
      </div>
      <ToolCompassPanel />
    </div>
  )
}

function AuthModal() {
  const r = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '40px 32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Target Sprint</span>
        <h2 style={{ ...sc, fontSize: '1.5rem', fontWeight: 400, color: '#0F1523', marginBottom: '10px' }}>Sign in to begin.</h2>
        <p style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.7, marginBottom: '24px' }}>Your sprint saves to your profile.</p>
        <a href={`/login?redirect=${r}`} style={{ display: 'block', padding: '14px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: '#A8721A', ...sc, fontSize: '1.125rem', letterSpacing: '0.14em', textDecoration: 'none' }}>
          Sign in or create account →
        </a>
      </div>
    </div>
  )
}

// ─── Sprint Wheel (mini — three segments) ────────────────────────────────────
// Three wedges for the chosen domains. Centre = "Your Target Sprint".
// Clicking centre opens summary of all three target goals.
// Clicking a wedge navigates to that domain.

function SprintWheelMini({ domains, domainData, activeDomainId, onDomainClick, onCentreClick, spinDirection = "next", size = 440 }) {
  const cx = size / 2, cy = size / 2
  const R  = size * 0.42
  const r  = size * 0.10
  const GAP = 3.5
  const n = domains.length || 3

  const WEDGE_COLORS = ['#C8922A', '#2D6A4F', '#2D4A6A']
  const WEDGE_FILLS  = ['rgba(200,146,42,0.08)', 'rgba(45,106,79,0.12)', 'rgba(45,74,106,0.12)']

  // Spin state — matches PurposeDisc pattern
  const [rot,     setRot]     = useState(0)
  const [settled, setSettled] = useState(false)
  const rotRef    = useRef(0)
  const targetRef = useRef(null)
  const animRef   = useRef(null)
  const lastRef   = useRef(null)
  const phase     = useRef('spinning')

  useEffect(() => {
    const SPIN_MS  = 1400
    const SPIN_DPS = 280
    const startT   = Date.now()
    function animate(time) {
      if (lastRef.current === null) lastRef.current = time
      const dt = Math.min((time - lastRef.current) / 1000, 0.05)
      lastRef.current = time
      if (phase.current === 'spinning') {
        rotRef.current += SPIN_DPS * dt
        setRot(rotRef.current)
        if (Date.now() - startT >= SPIN_MS) {
          targetRef.current = Math.ceil(rotRef.current / 360) * 360
          phase.current = 'landing'
        }
      } else if (phase.current === 'landing') {
        const diff = targetRef.current - rotRef.current
        if (Math.abs(diff) < 0.3) {
          rotRef.current = targetRef.current
          setRot(rotRef.current)
          phase.current = 'settled'
          setSettled(true)
        } else {
          rotRef.current += diff * Math.min(1, dt * 3.5)
          setRot(rotRef.current)
        }
      }
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // Spin to active domain whenever activeDomainId changes
  useEffect(() => {
    if (!settled) return
    const idx = domains.findIndex(d => d.id === activeDomainId)
    if (idx < 0) return
    const sweep = 360 / n
    const wedgeMid = idx * sweep + sweep / 2
    const needed = -90 - wedgeMid
    // Forward (next) = positive rotation, backward (prev) = negative rotation
    let delta = ((needed - (rotRef.current % 360)) % 360 + 360) % 360
    if (spinDirection === 'prev') {
      // Spin backwards: convert to negative equivalent
      if (delta > 0) delta = delta - 360
      if (delta > -10) delta -= 360
    } else {
      if (delta < 10) delta += 360
    }
    targetRef.current = rotRef.current + delta
    phase.current = 'landing'
    setSettled(false)
    cancelAnimationFrame(animRef.current)
    lastRef.current = null
    function animate(time) {
      if (lastRef.current === null) lastRef.current = time
      const dt = Math.min((time - lastRef.current) / 1000, 0.05)
      lastRef.current = time
      const diff = targetRef.current - rotRef.current
      if (Math.abs(diff) < 0.3) {
        rotRef.current = targetRef.current
        setRot(rotRef.current)
        phase.current = 'settled'
        setSettled(true)
      } else {
        rotRef.current += diff * Math.min(1, dt * 5)
        setRot(rotRef.current)
        animRef.current = requestAnimationFrame(animate)
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }, [activeDomainId])

  // Navigate to domain — notify parent; spin handled by useEffect above
  function navigateTo(domainId) {
    if (!settled) return
    onDomainClick(domainId)
  }

  function wedgePath(idx, rotDeg = 0) {
    const base = rotDeg * Math.PI / 180
    const sweep = 360 / n
    const s = (-90 + idx * sweep + GAP) * Math.PI / 180 + base
    const e = (-90 + idx * sweep + sweep - GAP) * Math.PI / 180 + base
    const x1 = cx + R * Math.cos(s), y1 = cy + R * Math.sin(s)
    const x2 = cx + R * Math.cos(e), y2 = cy + R * Math.sin(e)
    const xi1 = cx + r * Math.cos(s), yi1 = cy + r * Math.sin(s)
    const xi2 = cx + r * Math.cos(e), yi2 = cy + r * Math.sin(e)
    return `M ${xi1} ${yi1} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 0 0 ${xi1} ${yi1} Z`
  }

  function labelPos(idx, rotDeg = 0) {
    const base = rotDeg * Math.PI / 180
    const sweep = 360 / n
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
  const rimR = R + size * 0.038
  const displayRot = rot % 360

  // Split domain label into two lines if needed
  function labelLines(label) {
    const words = label.split(' ')
    if (words.length === 1) return [label, '']
    const mid = Math.ceil(words.length / 2)
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: `${size}px`, display: 'block', overflow: 'visible' }}>
      <style>{`
        @keyframes tgPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes tgGlow  { 0%,100%{opacity:0.2} 50%{opacity:0.5} }
        .tg-pulse { animation: tgPulse 2.4s ease-in-out infinite; }
        .tg-glow  { animation: tgGlow  2.8s ease-in-out infinite; }
      `}</style>

      {allComplete && (
        <circle cx={cx} cy={cy} r={rimR + size * 0.055} fill="none" stroke="rgba(200,146,42,0.35)" strokeWidth="1.2" className="tg-glow" />
      )}

      {/* Rim */}
      <circle cx={cx} cy={cy} r={rimR} fill="#F0EDE6" stroke="rgba(200,146,42,0.35)" strokeWidth="1.5" />

      {/* Tick marks — rotate with disc */}
      {Array.from({ length: 12 }, (_, i) => {
        const base = displayRot * Math.PI / 180
        const a = (i * 30) * Math.PI / 180 + base
        return <line key={i}
          x1={cx + (R + size * 0.015) * Math.cos(a)} y1={cy + (R + size * 0.015) * Math.sin(a)}
          x2={cx + rimR * Math.cos(a)} y2={cy + rimR * Math.sin(a)}
          stroke="rgba(200,146,42,0.4)" strokeWidth="0.8"
        />
      })}

      {/* Wedges — rotate with disc */}
      {domains.map((d, i) => {
        const done    = stepsComplete(d.id)
        const total   = STEPS.length
        const isActive = settled && d.id === activeDomainId
        const pct     = done / total
        const col     = WEDGE_COLORS[i % WEDGE_COLORS.length]
        const fill    = done >= total ? col : isActive ? WEDGE_FILLS[i % WEDGE_FILLS.length] : '#FAFAF7'
        const stroke  = done > 0 || isActive ? col : 'rgba(200,146,42,0.2)'
        const pos     = labelPos(i, displayRot)
        const lines   = labelLines(d.label)

        return (
          <g key={d.id} onClick={() => navigateTo(d.id)} style={{ cursor: 'pointer' }}
            className={isActive && done < total ? 'tg-pulse' : ''}>
            <path d={wedgePath(i, displayRot)} fill={fill} stroke={stroke}
              strokeWidth={isActive ? 2 : 1.2}
              style={{ transition: 'fill 0.4s ease, stroke 0.3s' }}
            />
            {done >= total ? (
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
                fontSize={size * 0.094} fontFamily="'Cormorant SC', Georgia, serif"
                fill="#FFFFFF" style={{ pointerEvents: 'none', userSelect: 'none' }}>✓</text>
            ) : (
              <>
                <text x={pos.x} y={lines[1] ? pos.y - size * 0.032 : pos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.060} fontFamily="'Cormorant SC', Georgia, serif"
                  fill={isActive ? col : 'rgba(200,146,42,0.75)'} letterSpacing="0.04em"
                  style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.3s' }}>
                  {lines[0]}
                </text>
                {lines[1] && (
                  <text x={pos.x} y={pos.y + size * 0.032}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={size * 0.060} fontFamily="'Cormorant SC', Georgia, serif"
                    fill={isActive ? col : 'rgba(200,146,42,0.75)'} letterSpacing="0.04em"
                    style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.3s' }}>
                    {lines[1]}
                  </text>
                )}
              </>
            )}
          </g>
        )
      })}

      {/* Centre */}
      <circle cx={cx} cy={cy} r={r - 1}
        fill={allComplete ? '#C8922A' : '#FAFAF7'}
        stroke={allComplete ? 'rgba(200,146,42,1)' : 'rgba(200,146,42,0.4)'} strokeWidth="1"
        style={{ cursor: 'pointer', transition: 'all 0.4s' }}
        onClick={onCentreClick}
      />
      <text x={cx} y={cy - size * 0.018} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.053} fontFamily="'Cormorant SC', Georgia, serif"
        fill={allComplete ? '#FFFFFF' : 'rgba(200,146,42,0.65)'}
        style={{ pointerEvents: 'none', userSelect: 'none' }}>{allComplete ? 'Complete' : 'Your'}</text>
      <text x={cx} y={cy + size * 0.018} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.053} fontFamily="'Cormorant SC', Georgia, serif"
        fill={allComplete ? '#FFFFFF' : 'rgba(200,146,42,0.65)'}
        style={{ pointerEvents: 'none', userSelect: 'none' }}>{allComplete ? 'Sprint ✓' : 'Sprint'}</text>
    </svg>
  )
}

// ─── Sprint Centre Modal ─────────────────────────────────────────────────────
// Shows incomplete status when centre is clicked before all steps are done.

function SprintCentreModal({ domains, domainData, activeDomainId, onClose, onGoToDomain }) {
  const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
  const gold  = { color: '#A8721A' }
  const muted = { color: 'rgba(15,21,35,0.72)' }
  const meta  = { color: 'rgba(15,21,35,0.72)' }

  const STEP_LABELS = { current_state: 'Where you are', horizon: 'Horizon', target_goal: 'Target Goal', milestones: 'Milestones', tasks: 'Tasks' }

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
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '36px 32px', maxWidth: '440px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Target Sprint</span>
        <h2 style={{ ...sc, fontSize: '1.375rem', fontWeight: 400, color: '#0F1523', marginBottom: '6px', lineHeight: 1.1 }}>What's still to do.</h2>
        <p style={{ ...body, fontSize: '1.1875rem', ...muted, lineHeight: 1.7, marginBottom: '24px' }}>
          Complete all three areas to unlock your full sprint.
        </p>
        {domains.map(d => {
          const steps = stepsComplete(d.id)
          const allDone = Object.values(steps).every(Boolean)
          return (
            <div key={d.id} style={{ marginBottom: '16px', padding: '14px 16px', border: `1px solid ${allDone ? 'rgba(200,146,42,0.35)' : 'rgba(200,146,42,0.18)'}`, borderRadius: '10px', background: allDone ? 'rgba(200,146,42,0.05)' : '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: allDone ? 0 : '10px' }}>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: allDone ? '#A8721A' : '#0F1523', textTransform: 'uppercase' }}>
                  {allDone ? '✓ ' : ''}{d.label}
                  <DomainTooltip domainKey={d.id} system="lifeos" position="below" />
                </span>
                {!allDone && (
                  <button onClick={() => { onGoToDomain(d.id); onClose() }}
                    style={{ ...sc, fontSize: '17px', letterSpacing: '0.1em', ...gold, background: 'none', border: '1px solid rgba(200,146,42,0.4)', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer' }}>
                    Go →
                  </button>
                )}
              </div>
              {!allDone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {Object.entries(steps).map(([key, done]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: `1px solid ${done ? '#C8922A' : 'rgba(200,146,42,0.25)'}`, background: done ? '#C8922A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {done && <span style={{ color: '#FFFFFF', fontSize: '15px' }}>✓</span>}
                      </span>
                      <span style={{ ...body, fontSize: '1.125rem', color: done ? 'rgba(15,21,35,0.72)' : meta.color, textDecoration: done ? 'line-through' : 'none' }}>
                        {STEP_LABELS[key]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontFamily: "'Lora', Georgia, serif", fontSize: '1.1875rem', color: 'rgba(15,21,35,0.55)', cursor: 'pointer', padding: 0, marginTop: '8px' }}>
          Continue where I am
        </button>
      </div>
    </div>
  )
}

// ─── Setup status bar ─────────────────────────────────────────────────────────

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
        <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase' }}>Sprint Setup</span>
        <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.1em', ...muted }}>{complete} / {total}</span>
      </div>
      <div style={{ height: '3px', background: 'rgba(200,146,42,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#C8922A', transition: 'width 0.6s ease', borderRadius: '2px' }} />
      </div>
    </div>
  )
}

// ─── Step progress strip ──────────────────────────────────────────────────────

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
        const done      = isComplete(step)
        const unlocked  = isUnlocked(step)
        const active    = step === activeStep
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <button
              onClick={() => unlocked && onStepClick(step)}
              disabled={!unlocked}
              style={{
                ...sc, fontSize: '15px', letterSpacing: '0.14em', textTransform: 'uppercase',
                background: 'none', border: 'none', padding: '4px 0', cursor: unlocked ? 'pointer' : 'default',
                color: done ? '#A8721A' : active ? '#A8721A' : unlocked ? 'rgba(200,146,42,0.5)' : 'rgba(200,146,42,0.18)',
                whiteSpace: 'nowrap', flexShrink: 0,
                borderBottom: active ? '1.5px solid #C8922A' : 'none',
              }}>
              {done ? '✓ ' : ''}{STEP_LABELS[step]}
            </button>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: '1px', background: done ? 'rgba(200,146,42,0.35)' : 'rgba(200,146,42,0.08)', margin: '0 6px', minWidth: '8px', transition: 'background 0.4s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Accomplishment Tally ─────────────────────────────────────────────────────

function AccomplishmentTally({ domains, domainData, onCheck }) {
  const [celebration, setCelebration] = useState(null) // { text, type } — shows briefly on completion

  function handleCheck(domainId, type, milestoneIdx, taskIdx, checked) {
    // Trigger celebration moment on completion (not on uncheck)
    if (checked) {
      const msgs = {
        goal:      '🎯 Goal achieved. Next play.',
        milestone: '✦ Milestone complete. Keep moving.',
        task:      '· Done.',
      }
      setCelebration({ text: msgs[type] || '✓', type })
      setTimeout(() => setCelebration(null), 2200)
    }
    onCheck(domainId, type, milestoneIdx, taskIdx, checked)
  }

  // Total progress across all domains
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
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '12px', padding: '20px 22px', marginTop: '28px', position: 'relative' }}>

      {/* Celebration flash */}
      {celebration && (
        <div style={{
          position: 'absolute', top: '-44px', left: '50%', transform: 'translateX(-50%)',
          background: '#0F1523', color: '#FAFAF7', borderRadius: '8px',
          padding: '8px 18px', whiteSpace: 'nowrap',
          fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em',
          animation: 'tgFadeUp 0.3s ease both',
          zIndex: 10,
        }}>
          {celebration.text}
        </div>
      )}

      {/* Header + overall progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <Eyebrow style={{ marginBottom: 0 }}>Sprint Progress</Eyebrow>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: '#A8721A' }}>
          {totals.tasksDone}/{totals.tasks} tasks
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'rgba(200,146,42,0.08)', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: '#C8922A', borderRadius: '2px', transition: 'width 0.6s ease' }} />
      </div>

      {/* Domains */}
      {domains.map(d => {
        const dd = domainData[d.id] || {}
        if (!dd.targetGoal) return null
        const milestones = dd.milestones || []
        const tasks = dd.tasks || []

        return (
          <div key={d.id} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
            {/* Domain label + goal */}
            <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '4px' }}>{d.label}</div>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '14px' }}>
              <input type="checkbox" checked={!!dd.goalChecked}
                onChange={e => handleCheck(d.id, 'goal', null, null, e.target.checked)}
                style={{ marginTop: '4px', accentColor: '#C8922A', flexShrink: 0, width: '16px', height: '16px' }}
              />
              <span style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.6,
                textDecoration: dd.goalChecked ? 'line-through' : 'none',
                opacity: dd.goalChecked ? 0.45 : 1, transition: 'all 0.3s' }}>
                {dd.targetGoal}
              </span>
            </label>

            {/* Milestones + tasks */}
            {milestones.map((m, mi) => {
              const mDone = !!dd.milestoneChecked?.[mi]
              const mTasks = tasks.filter(t => t.milestone === mi)
              return (
                <div key={mi} style={{ marginLeft: '26px', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '6px' }}>
                    <input type="checkbox" checked={mDone}
                      onChange={e => handleCheck(d.id, 'milestone', mi, null, e.target.checked)}
                      style={{ marginTop: '3px', accentColor: '#C8922A', flexShrink: 0, width: '15px', height: '15px' }}
                    />
                    <div>
                      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '1px' }}>Month {mi + 1}</div>
                      <div style={{ ...body, fontSize: '1.125rem', ...meta, lineHeight: 1.55,
                        textDecoration: mDone ? 'line-through' : 'none',
                        opacity: mDone ? 0.45 : 1, transition: 'all 0.3s' }}>
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
                          style={{ marginTop: '3px', accentColor: '#C8922A', flexShrink: 0, width: '14px', height: '14px' }}
                        />
                        <span style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.55,
                          textDecoration: tDone ? 'line-through' : 'none',
                          opacity: tDone ? 0.38 : 1, transition: 'all 0.3s' }}>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.3)', borderRadius: '14px', padding: '32px 28px', maxWidth: '520px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Eyebrow>Your Target Sprint</Eyebrow>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '1.1rem', ...muted, padding: '4px' }}>×</button>
        </div>
        {domains.map(d => {
          const dd = domainData[d.id] || {}
          if (!dd.targetGoal) return (
            <div key={d.id} style={{ padding: '14px 0', borderTop: '1px solid rgba(200,146,42,0.08)' }}>
              <div style={{ ...sc, fontSize: '17px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase', marginBottom: '4px' }}>{d.label}</div>
              <div style={{ ...body, fontSize: '1.1875rem', ...muted }}>Not yet set.</div>
            </div>
          )
          return (
            <div key={d.id} style={{ padding: '14px 0', borderTop: '1px solid rgba(200,146,42,0.08)' }}>
              <div style={{ ...sc, fontSize: '17px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>{d.label}</div>
              {dd.horizonText && (
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.125rem', ...muted, lineHeight: 1.6, marginBottom: '6px' }}>
                  Horizon: {dd.horizonText}
                </div>
              )}
              <div style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.65 }}>{dd.targetGoal}</div>
            </div>
          )
        })}

        {/* Completion section */}
        <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1.5px solid rgba(200,146,42,0.20)', textAlign: 'center' }}>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '20px' }}>
            Your results are saved to your profile. You can return to them any time.
          </p>
          <button
            onClick={onComplete}
            style={{
              display: 'block', width: '100%', padding: '16px 0',
              borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)',
              background: '#C8922A', color: '#FFFFFF',
              fontFamily: "'Cormorant SC', Georgia, serif",
              fontSize: '16px', fontWeight: 600, letterSpacing: '0.14em',
              cursor: 'pointer', marginBottom: '12px',
            }}
          >
            Complete my sprint and see my results
          </button>
          <a
            href="https://buy.stripe.com/9B69ASaCe7wh91tdY2aMU08"
            style={{
              display: 'block', width: '100%', padding: '14px 0',
              borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)',
              background: 'transparent', color: '#A8721A',
              fontFamily: "'Cormorant SC', Georgia, serif",
              fontSize: '15px', letterSpacing: '0.14em',
              textDecoration: 'none', boxSizing: 'border-box',
            }}
          >
            Start a new sprint →
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({ mode, domainId, payload, onComplete, placeholder, userId }) {
  const [msgs,          setMsgs]          = useState([])
  const [input,         setInput]         = useState('')
  const [thinking,      setThinking]      = useState(false)
  const [pendingData,   setPendingData]   = useState(null) // complete payload waiting for user to confirm
  const startedRef = useRef(false)
  const bottomRef  = useRef(null)
  const taRef      = useRef(null)

  // target_goal mode: show what North Star is collecting upfront
  const isTargetGoal = mode === 'target_goal'

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [msgs, thinking, pendingData])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    start()
  }, [])

  async function call(m) {
    // Pass today's date so North Star knows the actual current date
    const todayDate = new Date().toISOString().slice(0, 10)
    const res = await fetch('/tools/target-goals/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, domain: domainId, messages: m, ...payload, userId, todayDate })
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }

  async function start() {
    setThinking(true)
    try {
      const d = await call([{ role: 'user', content: 'START' }])
      setThinking(false)
      if (d.message) setMsgs([{ role: 'assistant', content: d.message }])
      if (d.canLock) onComplete(d)
    } catch {
      setThinking(false)
      setMsgs([{ role: 'assistant', content: 'Something went wrong. Please refresh.' }])
    }
  }

  async function send() {
    const text = input.trim(); if (!text || thinking) return
    const next = [...msgs, { role: 'user', content: text }]
    setMsgs(next); setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
    setThinking(true)
    try {
      const d = await call(next)
      setThinking(false)
      if (d.message) setMsgs(p => [...p, { role: 'assistant', content: d.message }])
      if (d.canLock) {
        // current_state and horizon: auto-complete, no button needed
        onComplete(d)
      } else if (d.complete) {
        // target_goal: show the button, let user decide when to proceed
        setPendingData(d)
      }
    } catch {
      setThinking(false)
      setMsgs(p => [...p, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
  }

  const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

  return (
    <div>
      {/* Target goal mode: show upfront what North Star is collecting */}
      {isTargetGoal && msgs.length === 0 && !thinking && (
        <div style={{ padding: '12px 16px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '10px', marginBottom: '16px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '6px' }}>What we're working toward</div>
          <p style={{ ...body, fontSize: '1.125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>
            North Star will ask you three things: what you want to achieve in 90 days, why this quarter, and how you'll know you've hit it. Once it has enough, a <strong style={{ fontFamily: "'Cormorant SC', Georgia, serif", color: '#A8721A' }}>Build my plan →</strong> button will appear.
          </p>
        </div>
      )}

      <div className="chat-thread" style={{ marginBottom: '14px' }}>
        {msgs.map((m, i) => <div key={i} className={`bubble bubble-${m.role}`}>{m.content}</div>)}
        {thinking && <ThinkingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Build my plan button — appears when North Star signals it has enough */}
      {pendingData && (
        <div style={{ marginBottom: '16px', padding: '16px 18px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px' }}>
          <p style={{ ...body, fontSize: '1.1875rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, marginBottom: '14px' }}>
            North Star has what it needs. Your plan — goal, milestones, and tasks — is ready to build.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Btn onClick={() => onComplete(pendingData)}>
              Build my plan →
            </Btn>
            <button onClick={() => setPendingData(null)}
              style={{ background: 'none', border: 'none', ...body, fontSize: '1.125rem', color: 'rgba(15,21,35,0.55)', cursor: 'pointer', padding: 0 }}>
              Keep talking
            </button>
          </div>
        </div>
      )}

      {!pendingData && (
        <div className="input-area">
          <textarea ref={taRef} value={input}
            onChange={e => { setInput(e.target.value); if (taRef.current) { taRef.current.style.height = 'auto'; taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 120)}px` } }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={placeholder || 'Write your response…'} rows={2} disabled={thinking}
          />
          <button className="btn-send" onClick={send} disabled={!input.trim() || thinking}>Send</button>
        </div>
      )}
    </div>
  )
}

// ─── EditableList ─────────────────────────────────────────────────────────────

function EditableList({ items, onSave, renderItem, addLabel = '+ Add', itemKey = 'text' }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(items)

  useEffect(() => { setDraft(items) }, [items])

  function update(i, val) { setDraft(p => p.map((x, j) => j === i ? { ...x, [itemKey]: val } : x)) }
  function remove(i)      { setDraft(p => p.filter((_, j) => j !== i)) }
  function add()          { setDraft(p => [...p, { [itemKey]: '' }]) }

  if (!editing) return (
    <div>
      {items.map((item, i) => renderItem(item, i))}
      <button onClick={() => setEditing(true)} style={{ ...body, fontSize: '1.125rem', ...gold, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', marginTop: '6px' }}>
        Edit →
      </button>
    </div>
  )

  return (
    <div>
      {draft.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
          <textarea
            value={item[itemKey]}
            onChange={e => update(i, e.target.value)}
            rows={2}
            style={{ flex: 1, padding: '8px 12px', ...body, fontSize: '1.1875rem', ...meta, background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', resize: 'vertical', lineHeight: 1.55 }}
          />
          <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...muted, fontSize: '1.25rem', padding: '8px 4px', flexShrink: 0 }}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
        <button onClick={add} style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, background: 'none', border: '1px solid rgba(200,146,42,0.3)', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer' }}>
          {addLabel}
        </button>
        <Btn onClick={() => { onSave(draft); setEditing(false) }} style={{ padding: '8px 20px', fontSize: '15px' }}>
          Save
        </Btn>
        <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', ...body, fontSize: '1.125rem', ...muted, cursor: 'pointer', padding: '6px 0' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}


// ─── Sprint Coach ──────────────────────────────────────────────────────────────

function SprintCoach({ sprintContext, userId }) {
  const [msgs,     setMsgs]     = useState([])
  const [input,    setInput]    = useState('')
  const [thinking, setThinking] = useState(false)
  const startedRef = useRef(false)
  const bottomRef  = useRef(null)
  const taRef      = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [msgs, thinking])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    start()
  }, [])

  async function call(messages) {
    const res = await fetch('/tools/target-goals/api/sprint-coach', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        sprintContext,
        userId,
        todayDate: new Date().toISOString().slice(0, 10),
      })
    })
    if (!res.ok) throw new Error('Coach unavailable')
    return res.json()
  }

  async function start() {
    setThinking(true)
    try {
      const d = await call([{ role: 'user', content: 'START' }])
      setMsgs([{ role: 'assistant', content: d.message }])
    } catch {
      setMsgs([{ role: 'assistant', content: 'Something went wrong. Please refresh.' }])
    }
    setThinking(false)
  }

  async function send() {
    const text = input.trim()
    if (!text || thinking) return
    const next = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
    setThinking(true)
    try {
      const d = await call(next)
      setMsgs(p => [...p, { role: 'assistant', content: d.message }])
    } catch {
      setMsgs(p => [...p, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
    setThinking(false)
  }

  return (
    <div>
      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginBottom: '16px' }}>
        North Star knows your full plan. Check in on execution, surface what's stuck, think through what's next.
      </p>
      <div className="chat-thread" style={{ marginBottom: '14px' }}>
        {msgs.map((m, i) => <div key={i} className={`bubble bubble-${m.role}`}>{m.content}</div>)}
        {thinking && <ThinkingDots />}
        <div ref={bottomRef} />
      </div>
      <div className="input-area">
        <textarea ref={taRef} value={input}
          onChange={e => { setInput(e.target.value); if (taRef.current) { taRef.current.style.height = 'auto'; taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 120)}px` } }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="What's happening with your sprint?"
          rows={2} disabled={thinking}
        />
        <button className="btn-send" onClick={send} disabled={!input.trim() || thinking}>Send</button>
      </div>
    </div>
  )
}

// ─── Domain Panel ─────────────────────────────────────────────────────────────

function DomainPanel({ domainId, domainData, setDomainData, hasMapData, mapData, targetDate, endDateLabel, completedDomains, userId, sprintDomains }) {
  const d  = DOMAIN_BY_ID[domainId]
  const dd = domainData[domainId] || {}

  // Compute active step — gracefully handles missing domain
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
  const isSetup = !dd.tasks?.length // still in setup mode

  // Sync viewStep when activeStep advances (only during setup)
  useEffect(() => { if (isSetup) setViewStep(activeStep) }, [activeStep])

  // Null render AFTER all hooks — Rules of Hooks compliant
  if (!domainId || !d) return null

  function update(patch) {
    setDomainData(prev => ({ ...prev, [domainId]: { ...(prev[domainId] || {}), ...patch } }))
  }

  async function generateMilestones() {
    setGenerating(true)
    try {
      const res = await fetch('/tools/target-goals/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: 'milestones', domain: domainId,
          targetGoal: dd.targetGoal, horizonText: dd.horizonText,
          currentStateSummary: dd.currentStateSummary, userId: userId })
      })
      const data = await res.json()
      if (data.milestones) update({ milestones: data.milestones })
    } catch {}
    setGenerating(false)
  }

  async function generateTasks(milestoneIdx) {
    setGenerating(true)
    try {
      const res = await fetch('/tools/target-goals/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: 'tasks', domain: domainId,
          targetGoal: dd.targetGoal,
          milestoneText: dd.milestones?.[milestoneIdx]?.text,
          milestoneIndex: milestoneIdx, userId: userId })
      })
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
      {/* Domain header */}
      <div style={{ marginBottom: '18px' }}>
        <Eyebrow>{d.label}</Eyebrow>
        <p style={{ ...body, fontSize: '1.1875rem', ...muted, lineHeight: 1.65, margin: 0 }}>
          {d.description}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <StepStrip domainId={domainId} domainData={domainData} activeStep={viewStep === 'coach' ? null : viewStep} onStepClick={setViewStep} />
        </div>
        {dd.tasks?.length > 0 && (
          <button
            onClick={() => setViewStep(viewStep === 'coach' ? 'tasks' : 'coach')}
            style={{
              flexShrink: 0, marginLeft: '12px',
              fontFamily: "'Cormorant SC', Georgia, serif",
              fontSize: '13px', letterSpacing: '0.14em',
              color: viewStep === 'coach' ? '#FFFFFF' : '#A8721A',
              background: viewStep === 'coach' ? '#A8721A' : 'rgba(200,146,42,0.05)',
              border: '1px solid rgba(200,146,42,0.5)',
              borderRadius: '20px', padding: '5px 14px',
              cursor: 'pointer', transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {viewStep === 'coach' ? '← Plan' : 'Coach →'}
          </button>
        )}
      </div>

      {/* Step: Current State */}
      {viewStep === 'current_state' && (
        <div>
          <h3 style={{ ...sc, fontSize: '1.125rem', fontWeight: 400, color: '#0F1523', marginBottom: '6px' }}>Where you are</h3>
          <p style={{ ...body, fontSize: '1.1875rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
            Where are you right now in {d.label}, and why is this a pivotal area for you this quarter?
          </p>
          {hasMapData && (mapDomain.realityFinal || mapDomain.realityDraft) && !dd.currentStateSummary && (
            <div style={{ padding: '12px 16px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', marginBottom: '14px' }}>
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>From your Map</div>
              <div style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.65, marginBottom: '10px' }}>{mapDomain.realityFinal || mapDomain.realityDraft}</div>
              <Btn onClick={() => update({ currentStateSummary: mapDomain.realityFinal || mapDomain.realityDraft, currentStateFromMap: true })} style={{ padding: '8px 18px', fontSize: '15px' }}>
                Use this →
              </Btn>
            </div>
          )}
          {dd.currentStateSummary ? (
            <div>
              <div style={{ padding: '14px 16px', background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '8px', ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.7, marginBottom: '14px' }}>
                {dd.currentStateSummary}
              </div>
              <EditableList
                items={[{ text: dd.currentStateSummary }]}
                onSave={items => update({ currentStateSummary: items[0]?.text || dd.currentStateSummary })}
                renderItem={(item) => null}
                itemKey="text"
              />
              <Btn onClick={() => setViewStep('horizon')} style={{ marginTop: '8px' }}>
                Set horizon →
              </Btn>
            </div>
          ) : !hasMapData || !(mapDomain.realityFinal || mapDomain.realityDraft) ? (
            <ChatPanel
              mode="current_state"
              domainId={domainId}
              payload={{}}
              placeholder={`Where are you with ${d.label} right now?`}
              userId={userId}
              onComplete={data => {
                if (data.canLock && data.summary) update({ currentStateSummary: data.summary })
              }}
            />
          ) : null}
        </div>
      )}

      {/* Step: Horizon */}
      {viewStep === 'horizon' && (
        <div>
          <h3 style={{ ...sc, fontSize: '1.125rem', fontWeight: 400, color: '#0F1523', marginBottom: '6px' }}>Horizon</h3>
          <p style={{ ...body, fontSize: '1.1875rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
            Where do you wish you were in this area? Not a 90-day target — the honest version of your best life here.
          </p>
          {hasMapData && mapDomain.horizonText && mapDomain.horizonText !== 'See sub-domain horizons' && !dd.horizonText && (
            <div style={{ padding: '12px 16px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', marginBottom: '14px' }}>
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>From your Map</div>
              <div style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.65, marginBottom: '10px' }}>{mapDomain.horizonText}</div>
              <Btn onClick={() => update({ horizonText: mapDomain.horizonText, horizonFromMap: true })} style={{ padding: '8px 18px', fontSize: '15px' }}>
                Use this →
              </Btn>
            </div>
          )}
          {dd.horizonText ? (
            <div>
              <div style={{ padding: '14px 16px', background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '8px', ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.7, marginBottom: '14px' }}>
                {dd.horizonText}
              </div>
              <EditableList
                items={[{ text: dd.horizonText }]}
                onSave={items => update({ horizonText: items[0]?.text || dd.horizonText })}
                renderItem={() => null}
                itemKey="text"
              />
              <Btn onClick={() => setViewStep('target_goal')} style={{ marginTop: '8px' }}>
                Set 90-day target →
              </Btn>
            </div>
          ) : (
            <ChatPanel
              mode="horizon"
              domainId={domainId}
              payload={{ hasMapData, mapHorizonText: mapDomain.horizonText, mapHorizonScore: mapDomain.horizonScore }}
              placeholder="Describe where you'd wish to be…"
              userId={userId}
              onComplete={data => {
                if (data.canLock && data.horizonText) update({ horizonText: data.horizonText })
              }}
            />
          )}
        </div>
      )}

      {/* Step: Target Goal */}
      {viewStep === 'target_goal' && (
        <div>
          <h3 style={{ ...sc, fontSize: '1.125rem', fontWeight: 400, color: '#0F1523', marginBottom: '6px' }}>Target Goal</h3>
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.1875rem', ...muted, lineHeight: 1.7, marginBottom: '4px' }}>
            Where can you realistically get to in 90 days on the way to that horizon?
          </p>
          {dd.horizonText && (
            <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...muted, textTransform: 'uppercase', marginBottom: '14px' }}>
              Toward: <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.125rem', textTransform: 'none', letterSpacing: 0, color: 'rgba(15,21,35,0.72)' }}>{dd.horizonText}</span>
            </div>
          )}
          {dd.targetGoal ? (
            <div>
              <div style={{ padding: '14px 16px', background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '8px', ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.7, marginBottom: '14px' }}>
                {dd.targetGoal}
              </div>
              <EditableList
                items={[{ text: dd.targetGoal }]}
                onSave={items => update({ targetGoal: items[0]?.text || dd.targetGoal })}
                renderItem={() => null}
                itemKey="text"
              />
              <Btn onClick={() => setViewStep('milestones')} style={{ marginTop: '8px' }}>
                Set milestones →
              </Btn>
            </div>
          ) : (
            <ChatPanel
              mode="target_goal"
              domainId={domainId}
              payload={{
                currentStateSummary: dd.currentStateSummary,
                horizonText: dd.horizonText,
                targetDate,
                completedDomains,
                todayDate: new Date().toISOString().slice(0, 10),
              }}
              placeholder="What do you want to achieve this quarter?"
              userId={userId}
              onComplete={data => {
                if (data.complete && data.data) {
                  update({
                    targetGoal:  data.data.targetGoal,
                    milestones:  data.data.milestones || [],
                    tasks:       data.data.tasks || [],
                    tea:         data.data.tea,
                    conversationInsight: data.data.conversationInsight,
                  })
                }
              }}
            />
          )}
        </div>
      )}

      {/* Step: Milestones */}
      {viewStep === 'milestones' && (
        <div>
          <h3 style={{ ...sc, fontSize: '1.125rem', fontWeight: 400, color: '#0F1523', marginBottom: '6px' }}>Milestones</h3>
          <p style={{ ...body, fontSize: '1.1875rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
            The three monthly waypoints on the way to your target.
          </p>
          {dd.milestones?.length > 0 ? (
            <div>
              <EditableList
                items={dd.milestones}
                onSave={items => update({ milestones: items })}
                renderItem={(item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(200,146,42,0.08)' }}>
                    <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', ...gold, flexShrink: 0, paddingTop: '3px', width: '48px', textTransform: 'uppercase' }}>Month {i + 1}</span>
                    <div>
                      <div style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.6 }}>{item.text}</div>
                      {item.why && <div style={{ ...body, fontSize: '1.125rem', ...muted, marginTop: '2px' }}>{item.why}</div>}
                    </div>
                  </div>
                )}
                itemKey="text"
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                <button onClick={generateMilestones} disabled={generating}
                  style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...muted, background: 'none', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer', opacity: generating ? 0.5 : 1 }}>
                  {generating ? 'Regenerating…' : 'Regenerate'}
                </button>
                <Btn onClick={() => setViewStep('tasks')} style={{ padding: '8px 20px', fontSize: '15px' }}>
                  Set tasks →
                </Btn>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Btn onClick={generateMilestones} disabled={generating}>
                {generating ? 'Generating…' : 'Generate milestones →'}
              </Btn>
            </div>
          )}
        </div>
      )}

      {/* Step: Coach */}
      {viewStep === 'coach' && dd.tasks?.length > 0 && (() => {
        // Build sprint context for the coach — full plan + progress
        const sprintContext = {
          endDateLabel,
          targetDate,
          domains: (sprintDomains || [d]).map(sd => {
            const sdd = domainData[sd.id] || {}
            return {
              id: sd.id,
              label: sd.label,
              targetGoal: sdd.targetGoal || '',
              horizonText: sdd.horizonText || '',
              milestones: sdd.milestones || [],
              tasks: sdd.tasks || [],
              milestoneChecked: sdd.milestoneChecked || {},
              taskChecked: sdd.taskChecked || {},
              goalChecked: sdd.goalChecked || false,
            }
          }),
        }
        return <SprintCoach key={domainId + '-coach'} sprintContext={sprintContext} userId={userId} />
      })()}

      {/* Step: Tasks */}
      {viewStep === 'tasks' && (
        <TasksStep
          dd={dd}
          domainId={domainId}
          targetDate={targetDate}
          generating={generating}
          update={update}
          generateTasks={generateTasks}
          sc={sc}
          serif={serif}
          gold={gold}
          muted={muted}
          meta={meta}
        />
      )}
    </div>
  )
}

// ─── Tasks Step ──────────────────────────────────────────────────────────────

function TasksStep({ dd, domainId, targetDate, generating, update, generateTasks, sc, serif, gold, muted, meta }) {
  const [calAdded,      setCalAdded]      = useState({})
  const [editingDate,   setEditingDate]   = useState(null) // 'milestone-0' | 'task-0-2' etc

  const domain = DOMAIN_BY_ID[domainId]?.label || domainId

  // Default milestone date: calculated from targetDate, or stored on the object
  function defaultMilestoneDate(index) {
    if (!targetDate) return null
    const end = new Date(targetDate)
    const d = new Date(end)
    d.setDate(d.getDate() - (2 - index) * 30)
    return d.toISOString().slice(0, 10)
  }

  function getMilestoneDate(m, index) {
    return m.date || defaultMilestoneDate(index)
  }

  function getTaskDate(task, mi) {
    if (task.date) return task.date
    return getMilestoneDate((dd.milestones || [])[mi], mi)
  }

  function toGCalDate(dateStr) {
    if (!dateStr) return ''
    return dateStr.replace(/-/g, '')
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function saveMilestoneDate(mi, dateStr) {
    const milestones = (dd.milestones || []).map((m, i) =>
      i === mi ? { ...m, date: dateStr } : m
    )
    update({ milestones })
    setEditingDate(null)
  }

  function saveTaskDate(mi, ti, dateStr) {
    const mTasks = (dd.tasks || []).filter(t => t.milestone === mi)
    const otherTasks = (dd.tasks || []).filter(t => t.milestone !== mi)
    const updated = mTasks.map((t, i) => i === ti ? { ...t, date: dateStr } : t)
    update({ tasks: [...otherTasks, ...updated] })
    setEditingDate(null)
  }

  function addToGCal(key, title, dateStr, description) {
    const dateFormatted = toGCalDate(dateStr)
    const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent(title)
      + '&dates=' + dateFormatted + '/' + dateFormatted
      + '&details=' + encodeURIComponent(description)
    window.open(url, '_blank')
    setCalAdded(prev => ({ ...prev, [key]: true }))
  }

  const calBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontFamily: "'Cormorant SC', Georgia, serif",
    fontSize: '13px', letterSpacing: '0.1em',
    color: '#A8721A', background: 'none',
    border: '1px solid rgba(200,146,42,0.35)',
    borderRadius: '20px', padding: '3px 10px',
    cursor: 'pointer', flexShrink: 0,
    transition: 'all 0.2s',
  }

  const calIcon = (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="11" rx="2" stroke="#A8721A" strokeWidth="1.4"/>
      <path d="M1 6h12" stroke="#A8721A" strokeWidth="1.4"/>
      <path d="M4 1v2M10 1v2" stroke="#A8721A" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )

  return (
    <div>
      <h3 style={{ ...sc, fontSize: '1.125rem', fontWeight: 400, color: '#0F1523', marginBottom: '6px' }}>Tasks</h3>
      <p style={{ ...body, fontSize: '1.1875rem', ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
        The specific actions that move each milestone forward. Add any item to your calendar with one tap.
      </p>

      {(dd.milestones || []).map((m, mi) => {
        const mTasks = (dd.tasks || []).filter(t => t.milestone === mi)
        const mDate = getMilestoneDate(m, mi)
        const milestoneKey = 'milestone-' + mi
        const milestoneAdded = calAdded[milestoneKey]

        const milestoneDesc = [m.text, m.why || '', 'Tasks:', ...mTasks.map(t => '• ' + t.text)].filter(Boolean).join('\n')

        return (
          <div key={mi} style={{ marginBottom: '20px', padding: '14px 16px', background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '10px' }}>

            {/* Milestone header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textTransform: 'uppercase' }}>
                  Month {mi + 1}
                  {milestoneAdded && <span style={{ marginLeft: '6px', color: '#2D6A4F' }}>✓</span>}
                </div>
                {/* Editable milestone date */}
                {editingDate === milestoneKey ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="date" defaultValue={mDate}
                      style={{ ...body, fontSize: '1rem', color: 'rgba(15,21,35,0.72)', border: '1px solid rgba(200,146,42,0.4)', borderRadius: '6px', padding: '2px 6px', background: '#FAFAF7' }}
                      onChange={e => saveMilestoneDate(mi, e.target.value)}
                    />
                    <button onClick={() => setEditingDate(null)} style={{ background: 'none', border: 'none', ...muted, cursor: 'pointer', fontSize: '1.1rem', padding: '0 2px' }}>×</button>
                  </div>
                ) : (
                  <button onClick={() => setEditingDate(milestoneKey)}
                    style={{ ...body, fontSize: '1rem', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}>
                    {mDate ? formatDisplayDate(mDate) : 'Set date'}
                  </button>
                )}
              </div>
              {mDate && (
                <button
                  style={{ ...calBtnStyle, color: milestoneAdded ? '#2D6A4F' : '#A8721A', borderColor: milestoneAdded ? 'rgba(45,106,79,0.4)' : 'rgba(200,146,42,0.35)' }}
                  onClick={() => addToGCal(milestoneKey, domain + ' — Month ' + (mi + 1) + ' Milestone', mDate, milestoneDesc)}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  {milestoneAdded ? '✓ Added' : (<>{calIcon} + Calendar</>)}
                </button>
              )}
            </div>

            {/* Milestone text */}
            <div style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.6, marginBottom: '12px' }}>{m.text}</div>

            {/* Tasks */}
            {mTasks.length > 0 ? (
              <div>
                <EditableList
                  items={mTasks}
                  onSave={items => {
                    const other = (dd.tasks || []).filter(t => t.milestone !== mi)
                    update({ tasks: [...other, ...items.map(t => ({ ...t, milestone: mi }))] })
                  }}
                  renderItem={(task, i) => {
                    const taskKey = 'task-' + mi + '-' + i
                    const taskAdded = calAdded[taskKey]
                    const tDate = getTaskDate(task, mi)
                    const isEditingTask = editingDate === taskKey
                    return (
                      <div key={i} style={{ padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(200,146,42,0.05)' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <span style={{ color: '#A8721A', fontSize: '1.1875rem', lineHeight: 1.55, flexShrink: 0, marginTop: '1px' }}>·</span>
                          <div style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.55, flex: 1 }}>{task.text}</div>
                          {tDate && (
                            <button
                              style={{ ...calBtnStyle, color: taskAdded ? '#2D6A4F' : '#A8721A', borderColor: taskAdded ? 'rgba(45,106,79,0.4)' : 'rgba(200,146,42,0.35)' }}
                              onClick={() => addToGCal(taskKey, task.text, tDate, m.text + '\n\nTask: ' + task.text)}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.05)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                            >
                              {taskAdded ? '✓' : calIcon}
                            </button>
                          )}
                        </div>
                        {/* Task date — shown below task text, editable */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '20px', marginTop: '3px' }}>
                          {isEditingTask ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input type="date" defaultValue={tDate}
                                style={{ ...body, fontSize: '0.9375rem', color: 'rgba(15,21,35,0.72)', border: '1px solid rgba(200,146,42,0.4)', borderRadius: '6px', padding: '2px 6px', background: '#FAFAF7' }}
                                onChange={e => saveTaskDate(mi, i, e.target.value)}
                              />
                              <button onClick={() => setEditingDate(null)} style={{ background: 'none', border: 'none', ...muted, cursor: 'pointer', fontSize: '1.1rem', padding: '0 2px' }}>×</button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingDate(taskKey)}
                              style={{ ...body, fontSize: '0.9375rem', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}>
                              {tDate ? formatDisplayDate(tDate) : 'Set date'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  }}
                  itemKey="text"
                  addLabel="+ Add task"
                />
                <button onClick={() => generateTasks(mi)} disabled={generating}
                  style={{ ...sc, fontSize: '17px', letterSpacing: '0.1em', ...muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: '6px', opacity: generating ? 0.5 : 1 }}>
                  {generating ? 'Regenerating…' : 'Regenerate tasks'}
                </button>
              </div>
            ) : (
              <button onClick={() => generateTasks(mi)} disabled={generating}
                style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: '#A8721A', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', cursor: 'pointer', opacity: generating ? 0.5 : 1 }}>
                {generating ? 'Generating…' : 'Generate tasks →'}
              </button>
            )}
          </div>
        )
      })}

      {dd.tasks?.length > 0 && (
        <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(200,146,42,0.08)' }}>
          <p style={{ ...body, fontSize: '1.1875rem', ...muted, lineHeight: 1.65 }}>
            This domain is set up. Use the arrows or wheel to move to the next one.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Phase: Select ────────────────────────────────────────────────────────────

function PhaseSelect({ hasMapData, scores, horizonScores, selectedDomains, setSelectedDomains, recommendation, onContinue }) {
  // Score-based fallback: mark 3 lowest-scoring domains when recommendation hasn't resolved
  const scoreFallbackRec = hasMapData && !recommendation?.recommended && Object.keys(scores).length > 0
    ? DOMAINS
        .filter(d => scores[d.id] !== undefined)
        .sort((a, b) => scores[a.id] - scores[b.id])
        .slice(0, 3)
        .map(d => d.id)
    : null

  return (
    <div>
      <Eyebrow>Target Sprint</Eyebrow>
      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.125rem', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: '8px 0 12px', maxWidth: '520px' }}>
        Three key areas, 90 days, level up.
      </p>
      <h1 style={{ ...sc, fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, marginBottom: '10px' }}>
        Three areas. Three months.
      </h1>
      <Rule />
      <p style={{ ...body, fontSize: '1.25rem', ...muted, lineHeight: 1.75, marginBottom: '20px' }}>
        {hasMapData
          ? 'Your Map scores are loaded. The ☆ shows where the most leverage is right now. You have the final say.'
          : 'Choose the three areas where focused effort this quarter would matter most. Trust your instinct.'}
      </p>

      {recommendation?.soft_observation && (
        <div style={{ padding: '12px 16px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', ...body, fontSize: '1.1875rem', ...meta, marginBottom: '20px', lineHeight: 1.65 }}>
          {recommendation.soft_observation}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '10px', marginBottom: '24px' }}>
        {DOMAINS.map(d => {
          const sel   = selectedDomains.includes(d.id)
          const isRec = recommendation?.recommended?.includes(d.id) || scoreFallbackRec?.includes(d.id)
          const rat   = recommendation?.rationale?.[d.id]
          const s     = scores[d.id]
          const dis   = !sel && selectedDomains.length >= 3
          const col   = s !== undefined ? getColor(s) : null
          return (
            <div key={d.id}
              onClick={() => { if (dis) return; setSelectedDomains(p => p.includes(d.id) ? p.filter(x => x !== d.id) : [...p, d.id]) }}
              style={{ padding: '14px', border: `1.5px solid ${sel ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.2)'}`, borderRadius: '10px', background: sel ? 'rgba(200,146,42,0.05)' : '#FFFFFF', cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.45 : 1, transition: 'all 0.2s' }}
              onMouseEnter={e => { if (!dis) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,21,35,0.06)' } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              <div style={{ ...sc, fontSize: '1.25rem', letterSpacing: '0.08em', color: sel ? '#A8721A' : '#0F1523', marginBottom: '4px' }}>
                {d.label}{isRec ? ' ☆' : ''}
              </div>
              <div style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.55, marginBottom: s !== undefined ? '10px' : 0 }}>
                {rat || d.description}
              </div>
              {s !== undefined && (
                <>
                  <div style={{ height: '2px', background: 'rgba(200,146,42,0.08)', borderRadius: '1px', overflow: 'hidden', marginBottom: '4px' }}>
                    <div style={{ height: '100%', width: `${s * 10}%`, background: col, borderRadius: '1px' }} />
                  </div>
                  <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em', color: col }}>{s} · {getTierLabel(s)}</div>
                </>
              )}
            </div>
          )
        })}
      </div>
      <Btn onClick={onContinue} disabled={selectedDomains.length !== 3}>Set my sprint →</Btn>
    </div>
  )
}

// ─── Phase: Quarter ───────────────────────────────────────────────────────────

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
    <div>
      <Eyebrow>Target Sprint · Timeline</Eyebrow>
      <h2 style={{ ...sc, fontSize: '1.5rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.15, marginBottom: '10px' }}>When does this sprint end?</h2>
      <Rule />
      <p style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.75, marginBottom: '16px' }}>Both work. Choose the rhythm that fits your life.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { type: 'rolling',  title: 'Rolling 90 days',   date: fmt(rolling), desc: 'Starts today. 90 days of focused movement.' },
          { type: 'calendar', title: 'Calendar quarter',  date: fmt(qEnd),    desc: `${qL} end — syncs with how the year flows.` },
        ].map(o => (
          <div key={o.type} onClick={() => select(o.type)}
            style={{ padding: '18px 20px', border: `1.5px solid ${quarterType === o.type ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.2)'}`, borderRadius: '10px', background: quarterType === o.type ? 'rgba(200,146,42,0.05)' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ ...sc, fontSize: '1.25rem', letterSpacing: '0.08em', color: quarterType === o.type ? '#A8721A' : '#0F1523', marginBottom: '3px' }}>{o.title}</div>
            <div style={{ ...sc, fontSize: '1.125rem', ...gold, marginBottom: '3px' }}>{o.date}</div>
            <div style={{ ...body, fontSize: '1.1875rem', ...muted }}>{o.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontFamily: "'Lora', Georgia, serif", fontSize: '1.1875rem', color: 'rgba(15,21,35,0.55)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <Btn onClick={onContinue} disabled={!quarterType}>Lock this in →</Btn>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TargetGoalsPage() {
  const { user, loading: authLoading } = useAuth()
  const { tier, loading: accessLoading } = useAccess('target_goals')

  const [phase,            setPhase]            = useState('select')
  const [hasMapData,       setHasMapData]       = useState(false)
  const [mapData,          setMapData]          = useState(null)
  const [scores,           setScores]           = useState({})
  const [horizonScores,    setHorizonScores]    = useState({})
  const [selectedDomains,  setSelectedDomains]  = useState([])
  const [quarterType,      setQuarterType]      = useState(null)
  const [targetDate,       setTargetDate]       = useState(null)
  const [endDateLabel,     setEndDateLabel]     = useState(null)
  const [recommendation,   setRecommendation]   = useState(null)
  const [sessionId,        setSessionId]        = useState(null)
  const [activeDomainId,   setActiveDomainId]   = useState(null)
  const [showSummary,      setShowSummary]      = useState(false)
  const [showCentreModal,  setShowCentreModal]  = useState(false)
  const [spinDir,          setSpinDir]          = useState('next')
  const [showWelcome,      setShowWelcome]      = useState(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (s.phase && s.phase !== 'select') return false
      }
    } catch {}
    return true
  })
  // domainData: { [domainId]: { currentStateSummary, horizonText, targetGoal, milestones, tasks, tea, ... } }
  const [domainData,       setDomainData]       = useState({})
  const loadedRef = useRef(false)

  // Reset loadedRef when user changes so a second user in the same session loads their data
  useEffect(() => { loadedRef.current = false }, [user?.id])

  // Restore session — check Supabase first, fall back to sessionStorage
  useEffect(() => {
    if (!user || loadedRef.current) return
    loadedRef.current = true
    loadSprintData()
    loadMapData()
  }, [user])

  async function loadSprintData() {
    try {
      const { data } = await supabase
        .from('target_goal_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
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
        setPhase('sprint')
        setShowWelcome(false)
        return
      }
    } catch {}
    // Fall back to sessionStorage if no Supabase record
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.phase && saved.phase !== 'select') {
          setPhase(saved.phase)
          setSelectedDomains(saved.selectedDomains || [])
          setQuarterType(saved.quarterType || null)
          setTargetDate(saved.targetDate || null)
          setEndDateLabel(saved.endDateLabel || null)
          setDomainData(saved.domainData || {})
          const validId = saved.activeDomainId && DOMAIN_BY_ID[saved.activeDomainId]
            ? saved.activeDomainId
            : (saved.selectedDomains?.find(id => DOMAIN_BY_ID[id]) || null)
          setActiveDomainId(validId)
          setShowWelcome(false)
        }
      }
    } catch {}
  }

  // Persist session
  useEffect(() => {
    if (phase === 'select') return
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({
        phase, selectedDomains, quarterType, targetDate, endDateLabel, domainData, activeDomainId
      }))
    } catch {}
  }, [phase, selectedDomains, domainData, activeDomainId])

  async function loadMapData() {
    try {
      // Load the most recent map — complete or in-progress.
      // Stars show whenever the user has scored at least 4 domains,
      // regardless of whether they ran the final synthesis.
      const { data } = await supabase
        .from('map_results').select('session, completed_at, complete')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }).limit(1).maybeSingle()

      if (data?.session?.domainData) {
        const s = {}, h = {}
        Object.entries(data.session.domainData).forEach(([id, d]) => {
          if (!d || typeof d !== 'object') return
          if (d?.currentScore !== undefined) s[id] = d.currentScore
          else if (d?.score !== undefined)   s[id] = d.score
          if (d?.horizonScore !== undefined) h[id] = d.horizonScore
        })
        // Use map data if at least 4 domains are scored
        const scoredCount = Object.keys(s).length
        if (scoredCount >= 4) {
          setMapData(data.session)
          setHasMapData(true)
          setScores(s)
          setHorizonScores(h)
          getRecommendation(s, true)
        }
      }
    } catch {}
  }

  async function getRecommendation(s, hmd = false) {
    if (!s || Object.keys(s).length === 0) return
    try {
      const res = await fetch('/tools/target-goals/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({  mode: 'recommend', scores: s, hasMapData: hmd, userId: user?.id })
      })
      const data = await res.json()
      if (data?.recommended) setRecommendation(data)
    } catch {}
  }

  function handleCheck(domainId, type, milestoneIdx, taskIdx, checked) {
    setDomainData(prev => {
      const dd = { ...(prev[domainId] || {}) }
      if (type === 'goal') dd.goalChecked = checked
      if (type === 'milestone') dd.milestoneChecked = { ...(dd.milestoneChecked || {}), [milestoneIdx]: checked }
      if (type === 'task')      dd.taskChecked = { ...(dd.taskChecked || {}), [taskIdx]: checked }
      return { ...prev, [domainId]: dd }
    })
  }

  async function saveToSupabase() {
    if (!user?.id) return
    try {
      const now = new Date().toISOString()
      // Core — only columns confirmed present in schema (no domain_data)
      // domain_data is in ext1; if it 400s we at least preserve the session record
      const core = {
        user_id: user.id, domains: selectedDomains,
        quarter_type: quarterType, target_date: targetDate,
        status: 'active', updated_at: now,
      }
      // ext1 adds the content columns — domain_data is the critical one
      const ext1 = { ...core, domain_data: domainData, end_date_label: endDateLabel, scores_at_start: scores, horizon_scores: horizonScores, has_map_data: hasMapData }
      // ext2 adds the session-continuity columns
      const ext2 = { ...ext1, session_phase: phase, active_domain_id: activeDomainId }

      async function tryInsert(payload) {
        const { data, error } = await supabase.from('target_goal_sessions')
          .insert({ ...payload, created_at: now }).select('id').single()
        return { data, error }
      }
      async function tryUpdate(payload) {
        const { error } = await supabase.from('target_goal_sessions')
          .update(payload).eq('id', sessionId)
        return { error }
      }

      if (sessionId) {
        // Try most extended first, fall back progressively
        let { error } = await tryUpdate(ext2)
        if (error) ({ error } = await tryUpdate(ext1))
        if (error) await tryUpdate(core)
      } else {
        // Insert: try most extended first, fall back progressively
        let { data, error } = await tryInsert(ext2)
        if (error) ({ data, error } = await tryInsert(ext1))
        if (error) ({ data, error } = await tryInsert(core))
        if (data?.id) setSessionId(data.id)
      }

      // Write to North Star cross-tool memory
      if (selectedDomains?.length) {
        const DOMAIN_LABELS = { path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances', connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal' }
        const domainNames = selectedDomains.map(id => DOMAIN_LABELS[id] || id).join(', ')
        await supabase.from('north_star_notes').delete().eq('user_id', user.id).eq('tool', 'target-goals')
        await supabase.from('north_star_notes').insert([
          { user_id: user.id, tool: 'target-goals', note: `Active 90-day sprint domains: ${domainNames}` }
        ])
      }
    } catch {}
  }

  // Auto-save when domainData or activeDomainId changes in sprint phase
  useEffect(() => {
    if (phase === 'sprint' && user?.id) {
      const t = setTimeout(saveToSupabase, 1500)
      return () => clearTimeout(t)
    }
  }, [domainData, activeDomainId])

  // Cycle domains with prev/next buttons
  function handleWheelNav(dir) {
    const idx = sprintDomains.findIndex(d => d.id === activeDomainId)
    if (idx < 0) return
    const next = dir === 'next'
      ? sprintDomains[(idx + 1) % sprintDomains.length].id
      : sprintDomains[(idx - 1 + sprintDomains.length) % sprintDomains.length].id
    setSpinDir(dir)
    setActiveDomainId(next)
  }

  async function handleSprintComplete() {
    // Mark session complete in Supabase
    if (sessionId && user?.id) {
      try {
        await supabase.from('target_goal_sessions')
          .update({ status: 'complete', updated_at: new Date().toISOString() })
          .eq('id', sessionId)
      } catch {}
    }
    // Clear local state so user can start a new sprint
    try { sessionStorage.removeItem(SS_KEY) } catch {}
    setSessionId(null)
    setSelectedDomains([])
    setDomainData({})
    setQuarterType(null)
    setTargetDate(null)
    setEndDateLabel(null)
    setActiveDomainId(null)
    setPhase('select')
    setShowSummary(false)
    setShowWelcome(true)
  }

  function handleCentreClick() {
    const allDone = sprintDomains.every(d => {
      const dd = domainData[d.id] || {}
      return !!dd.currentStateSummary && !!dd.horizonText && !!dd.targetGoal && dd.milestones?.length > 0 && dd.tasks?.length > 0
    })
    if (allDone) {
      setShowSummary(true)
    } else {
      setShowCentreModal(true)
    }
  }

  const sprintDomains = DOMAINS.filter(d => selectedDomains.includes(d.id))
  const completedDomains = sprintDomains
    .filter(d => domainData[d.id]?.targetGoal)
    .map(d => ({ domain: d.id, targetGoal: domainData[d.id].targetGoal, conversationInsight: domainData[d.id].conversationInsight }))

  if (authLoading || accessLoading) return <div className="loading" />

  return (
    <AccessGate productKey="target_goals" toolName="Target Sprint">
    <div className="page-shell">
      <style>{`
        @media (max-width: 640px) {
          .tool-wrap { padding-left: 24px !important; padding-right: 24px !important; }
          .tg-layout { flex-direction: column !important; }
          .tg-wheel-col { display: flex; justify-content: center; }
          .input-area { flex-direction: column; }
          .input-area textarea, .btn-send { width: 100%; box-sizing: border-box; }
        }
        @keyframes tgFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .tg-fade-up { animation: tgFadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <Nav activePath="life-os" />
      {!user && <AuthModal />}
      {user && showWelcome && <WelcomeModal onBegin={() => {
        if (user?.id) {
          supabase.from('target_goal_sessions').insert({
            user_id: user.id,
            status: 'started',
            domains: [],
            domain_data: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).select('id').then(({ data }) => {
            if (data?.[0]?.id) setSessionId(data[0].id)
          })
        }
        setShowWelcome(false)
      }} />}
      {showSummary && (
        <SprintSummaryModal
          domains={sprintDomains}
          domainData={domainData}
          onClose={() => setShowSummary(false)}
          onComplete={handleSprintComplete}
        />
      )}
      {showCentreModal && (
        <SprintCentreModal
          domains={sprintDomains}
          domainData={domainData}
          activeDomainId={activeDomainId}
          onClose={() => setShowCentreModal(false)}
          onGoToDomain={id => setActiveDomainId(id)}
        />
      )}

      <div className="tool-wrap">

        {/* ── Select phase ─────────────────────────────────────────────── */}
        {phase === 'select' && (
          <PhaseSelect
            hasMapData={hasMapData} scores={scores} horizonScores={horizonScores}
            selectedDomains={selectedDomains} setSelectedDomains={setSelectedDomains}
            recommendation={recommendation}
            onContinue={() => setPhase('quarter')}
          />
        )}

        {/* ── Quarter phase ─────────────────────────────────────────────── */}
        {phase === 'quarter' && (
          <PhaseQuarter
            quarterType={quarterType} setQuarterType={setQuarterType}
            setTargetDate={setTargetDate} setEndDateLabel={setEndDateLabel}
            onBack={() => setPhase('select')}
            onContinue={() => {
              setActiveDomainId(selectedDomains[0])
              setPhase('sprint')
              // Save immediately so other devices see the started session
              setTimeout(saveToSupabase, 0)
            }}
          />
        )}

        {/* ── Sprint phase ──────────────────────────────────────────────── */}
        {phase === 'sprint' && !sprintDomains.length && (
          <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: "'Lora', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.55)' }}>
            Loading your sprint…
          </div>
        )}
        {phase === 'sprint' && sprintDomains.length > 0 && activeDomainId && DOMAIN_BY_ID[activeDomainId] && (
          <div className="tg-fade-up">
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
              <Eyebrow>Target Sprint · {endDateLabel}</Eyebrow>
              <h1 style={{ ...sc, fontSize: 'clamp(1.5rem,4vw,2.25rem)', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, margin: '6px 0 4px' }}>
                {sprintDomains.map(d => d.label).join(' · ')}
              </h1>
            </div>

            <SetupStatusBar domains={sprintDomains} domainData={domainData} />

            {/* Wheel above, card below — 3/4 of wheel (330px) above card top.
                Wheel is 440px. Container top: 0. Card marginTop: 330px. */}
            <div style={{ position: 'relative', minHeight: '300px' }}>

              {/* Wheel — right-bleed, 3/4 above card */}
              <div style={{
                position: 'absolute', right: '-60px', top: '-300px',
                width: '520px', height: '520px', zIndex: 0, pointerEvents: 'none',
              }}>
                <div style={{ pointerEvents: 'auto', width: '100%' }}>
                  <SprintWheelMini
                    domains={sprintDomains}
                    domainData={domainData}
                    activeDomainId={activeDomainId}
                    spinDirection={spinDir}
                    onDomainClick={id => { setSpinDir('next'); setActiveDomainId(id) }}
                    onCentreClick={handleCentreClick}
                    size={440}
                  />
                </div>
              </div>

              {/* Domain panel card — top at 3/4 of wheel */}
              <div style={{ position: 'relative', zIndex: 1, marginTop: '330px' }}>
                {activeDomainId && (
                  <div key={activeDomainId} className="tg-fade-up"
                    style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.2)', borderRadius: '14px', padding: '26px 28px', maxWidth: '560px' }}>
                    {/* Prev / Next — inside card, top right */}
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px', float: 'right', marginTop: '-4px', marginRight: '-8px' }}>
                      <button onClick={() => handleWheelNav('prev')} title="Previous domain"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', opacity: 0.4, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <polyline points="12,2 4,9 12,16" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button onClick={() => handleWheelNav('next')} title="Next domain"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', opacity: 0.4, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
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
                    />
                  </div>
                )}
                {completedDomains.length > 0 && (
                  <div style={{ maxWidth: '560px', marginTop: '20px' }}>
                    <AccomplishmentTally
                      domains={sprintDomains}
                      domainData={domainData}
                      onCheck={handleCheck}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Path B nudge */}
            {!hasMapData && (
              <div style={{ padding: '18px 20px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '12px', marginTop: '32px' }}>
                <div style={{ ...sc, fontSize: '17px', letterSpacing: '0.14em', ...gold, textTransform: 'uppercase', marginBottom: '6px' }}>Want the full picture?</div>
                <p style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.7, marginBottom: '12px' }}>
                  The Map gives you an honest read across all seven domains — and loads your scores directly into your next sprint.
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
    </AccessGate>
  )
}
