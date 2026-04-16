import { useState, useRef, useEffect, useCallback } from 'react'
import { ToolCompassPanel } from '../../components/ToolCompassPanel'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { AccessGate } from '../../components/AccessGate'
import { supabase } from '../../hooks/useSupabase'
import { ArchetypeReferencePanel } from '../../components/ArchetypeReferencePanel'
import { CivilisationalFramePanel } from '../../components/CivilisationalFramePanel'

// ─── Constants ────────────────────────────────────────────────────────────────

const SS_KEY = 'pp_session_v5'
// Clear any stale sessions from previous versions
;['pp_session', 'pp_session_v1', 'pp_session_v2', 'pp_session_v3', 'pp_session_v4'].forEach(k => sessionStorage.removeItem(k))

// Wedge colours — intentional design system additions
// Gold:   Archetype — primary brand colour, most important coordinate
// Forest: Domain    — earth, territory, where work lands
// Slate:  Scale     — horizon, distance, bandwidth
const WEDGE = {
  archetype: {
    fill:       '#C8922A',
    fillActive: 'rgba(200,146,42,0.15)',
    stroke:     'rgba(200,146,42,0.85)',
    strokeWeak: 'rgba(200,146,42,0.2)',
    text:       '#A8721A',
  },
  domain: {
    fill:       '#2D6A4F',
    fillActive: 'rgba(45,106,79,0.15)',
    stroke:     'rgba(45,106,79,0.85)',
    strokeWeak: 'rgba(45,106,79,0.2)',
    text:       '#1E4D38',
  },
  scale: {
    fill:       '#2D4A6A',
    fillActive: 'rgba(45,74,106,0.15)',
    stroke:     'rgba(45,74,106,0.85)',
    strokeWeak: 'rgba(45,74,106,0.2)',
    text:       '#1E3550',
  },
}

const WEDGE_KEYS = ['archetype', 'domain', 'scale']

const STAGE_QUESTION_LABELS = {
  archetype: ['The Moment', 'The Frustration', 'The Pressure', 'The Cost', 'The Shadow'],
  domain:    ['The Pull', 'The Anger', 'The Unpaid Work'],
  scale:     ['The Scene', 'The Responsibility', 'The Obligation'],
}
const STAGE_TOTALS = { archetype: 5, domain: 3, scale: 3 }

const STAGE_INTROS = {
  archetype: {
    label: 'Contribution Archetype',
    desc:  'We\'re watching what you actually do — because that\'s where the real signal lives. Not the best version of yourself. Not the intention. The instinct that kept showing up even when the world was pressing down.',
  },
  domain: {
    label: 'Global Domain',
    desc:  'Not asking what you do. Asking what pulls you. What you find yourself caring about even when nobody asked you to and it has nothing to do with you. Don\'t be aspirational here. What do you actually keep looking at?',
  },
  scale: {
    label: 'Engagement Scale',
    desc:  'Give yourself permission to answer honestly. The world is very good at making people smaller. This is not that. Where does your felt responsibility actually live — not your current reach, not what seems reasonable to claim?',
  },
}

const PLACEHOLDERS = {
  archetype:    'Tell me what happened\u2026',
  domain:       'Tell me what you see\u2026',
  scale:        'Describe the scene\u2026',
  confirmation: 'Tell me what lands and what doesn\u2019t\u2026',
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }
const gold  = { color: '#A8721A' }
const muted = { color: 'rgba(15,21,35,0.72)' }
const meta  = { color: 'rgba(15,21,35,0.72)' }

const btnStyle = {
  ...sc, fontSize: '1.125rem', letterSpacing: '0.14em', color: '#A8721A',
  background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)',
  borderRadius: '40px', padding: '13px 32px', cursor: 'pointer',
  transition: 'all 0.2s', minHeight: '44px',
}

// ─── useIsMobile ──────────────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 640)
  useEffect(() => {
    function check() { setMobile(window.innerWidth <= 640) }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

// ─── PurposeDisc ─────────────────────────────────────────────────────────────
// Three 120° wedges. Spins on mount, settles on active stage.
// wedgeStates: { archetype: 0|1|2, domain: 0|1|2, scale: 0|1|2 }
// 0=empty, 1=active/pulsing, 2=complete/filled

const WEDGE_LABELS = {
  archetype: ['Contribution', 'Archetype'],
  domain:    ['Global', 'Domain'],
  scale:     ['Engagement', 'Scale'],
}

// Target rotation so each wedge lands at top-left (midpoint at -150°)
// Wedge midpoints at rot=0: archetype=-30°, domain=90°, scale=210°
// rotation needed = -150 - midpoint, then keep spinning forward by adding full rotations
// 'welcome' maps to archetype so disc always opens showing archetype top-left
const STAGE_TARGET_ROT = { welcome: -120, archetype: -120, domain: -240, scale: -360, confirmation: -360 }

function PurposeDisc({ wedgeStates, activeStage, onWedgeClick, onDiscClick, allDone = false, size = 200 }) {
  const R   = size * 0.44
  const r   = size * 0.058
  const cx  = size / 2
  const cy  = size / 2
  const GAP = 2.8

  // Spin state
  const [rot,     setRot]     = useState(0)
  const [settled, setSettled] = useState(false)
  const rotRef    = useRef(0)
  const targetRef = useRef(null)
  const animRef   = useRef(null)
  const lastRef   = useRef(null)
  const phase     = useRef('spinning')
  const prevStage = useRef(activeStage)
  // Pop animation tracking — fires when a wedge transitions to complete (state 2)
  const [poppingWedge, setPoppingWedge] = useState(null)
  const prevWedgeStatesRef = useRef(wedgeStates)
  useEffect(() => {
    const prev = prevWedgeStatesRef.current
    WEDGE_KEYS.forEach(k => {
      if ((prev[k] || 0) < 2 && (wedgeStates[k] || 0) === 2) {
        setPoppingWedge(k)
        setTimeout(() => setPoppingWedge(null), 600)
      }
    })
    prevWedgeStatesRef.current = wedgeStates
  }, [wedgeStates])


  // Initial mount spin
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
          // Settle to the active stage position
          const baseTarget = STAGE_TARGET_ROT[activeStage] ?? -120
          // Find nearest multiple of 360 above current rot that lands on target
          const fullTurns = Math.ceil((rotRef.current - baseTarget) / 360)
          targetRef.current = baseTarget + fullTurns * 360
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Spin to new stage when activeStage changes after settle
  useEffect(() => {
    if (!settled) return
    if (activeStage === prevStage.current) return
    prevStage.current = activeStage

    const baseTarget = STAGE_TARGET_ROT[activeStage]
    if (baseTarget === undefined) return

    // Always spin forward (positive direction) to next target
    const fullTurns = Math.ceil((rotRef.current - baseTarget) / 360)
    targetRef.current = baseTarget + fullTurns * 360

    // If we'd barely move, add a full extra turn for a satisfying spin
    if (targetRef.current - rotRef.current < 60) {
      targetRef.current += 360
    }

    phase.current = 'landing'
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
      } else {
        rotRef.current += diff * Math.min(1, dt * 4)
        setRot(rotRef.current)
        animRef.current = requestAnimationFrame(animate)
      }
    }
    cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(animate)
  }, [activeStage, settled])

  function wedgePath(idx, rotDeg = 0) {
    const base = rotDeg * Math.PI / 180
    const s = (-90 + idx * 120 + GAP) * Math.PI / 180 + base
    const e = (-90 + idx * 120 + 120 - GAP) * Math.PI / 180 + base
    const x1 = cx + R * Math.cos(s), y1 = cy + R * Math.sin(s)
    const x2 = cx + R * Math.cos(e), y2 = cy + R * Math.sin(e)
    const xi1 = cx + r * Math.cos(s), yi1 = cy + r * Math.sin(s)
    const xi2 = cx + r * Math.cos(e), yi2 = cy + r * Math.sin(e)
    return `M ${xi1} ${yi1} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 0 0 ${xi1} ${yi1} Z`
  }

  function wedgeLabelPos(idx, rotDeg = 0) {
    const base = rotDeg * Math.PI / 180
    const mid  = (-90 + idx * 120 + 60) * Math.PI / 180 + base
    const mr   = (R + r) / 2 + size * 0.012
    return { x: cx + mr * Math.cos(mid), y: cy + mr * Math.sin(mid) }
  }

  function tickPos(i, rotDeg = 0) {
    const base = rotDeg * Math.PI / 180
    const a = (i * 30) * Math.PI / 180 + base
    const rimR = R + size * 0.038
    return {
      x1: cx + (R + size * 0.015) * Math.cos(a), y1: cy + (R + size * 0.015) * Math.sin(a),
      x2: cx + rimR * Math.cos(a),                y2: cy + rimR * Math.sin(a),
    }
  }

  const rimR    = R + size * 0.038
  const displayRot = rot % 360

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: '100%', maxWidth: `${size}px`, display: 'block', overflow: 'visible', cursor: allDone ? 'pointer' : 'default' }}
      onClick={allDone ? onDiscClick : undefined}
      role={allDone ? 'button' : 'img'}
      aria-label={allDone ? 'Open your Purpose Piece' : 'Purpose Piece progress'}
    >
      <style>{`
        @keyframes ppPulse { 0%,100%{opacity:1} 50%{opacity:0.62} }
        @keyframes ppGlow  { 0%,100%{opacity:0.25} 50%{opacity:0.55} }
        .pp-pulse { animation: ppPulse 2.4s ease-in-out infinite; }
        .pp-glow  { animation: ppGlow  2.8s ease-in-out infinite; }
      `}</style>

      {allDone && (
        <circle cx={cx} cy={cy} r={rimR + size * 0.055}
          fill="none" stroke="rgba(200,146,42,0.38)" strokeWidth="1.2"
          className="pp-glow"
        />
      )}

      {/* Rim */}
      <circle cx={cx} cy={cy} r={rimR} fill="#F0EDE6" stroke="rgba(200,146,42,0.45)" strokeWidth="1.5" />

      {/* Tick marks — rotate with disc */}
      {Array.from({ length: 12 }, (_, i) => {
        const t = tickPos(i, displayRot)
        return <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(200,146,42,0.4)" strokeWidth="0.8" />
      })}

      {/* Three wedges — rotate with disc */}
      {WEDGE_KEYS.map((key, i) => {
        const st       = wedgeStates[key] || 0
        const w        = WEDGE[key]
        const isActive = settled && activeStage === key
        const isDone   = st === 2
        const fill     = isDone ? w.fill : isActive ? w.fillActive : '#FAFAF7'
        const stroke   = isDone || isActive ? w.stroke : w.strokeWeak
        const pos      = wedgeLabelPos(i, displayRot)
        const lines    = WEDGE_LABELS[key]
        const canClick = settled && !allDone

        return (
          <g key={key}
            className={poppingWedge === key ? 'pp-wedge-pop' : undefined}
            onClick={canClick ? (e) => { e.stopPropagation(); onWedgeClick(key) } : undefined}
            style={{ cursor: canClick ? 'pointer' : 'default' }}
            className={isActive && !isDone ? 'pp-pulse' : ''}
          >
            <path d={wedgePath(i, displayRot)} fill={fill} stroke={stroke}
              strokeWidth={isDone || isActive ? 1.5 : 1}
              style={{ transition: 'fill 0.5s cubic-bezier(0.16,1,0.3,1), stroke 0.3s' }}
            />
            {isDone ? (
              <text x={pos.x} y={pos.y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={size * 0.094} fontFamily="'Cormorant SC', Georgia, serif"
                fill="#FFFFFF"
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {'\u2713'}
              </text>
            ) : (
              <>
                <text x={pos.x} y={pos.y - size * 0.035}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.060} fontFamily="'Cormorant SC', Georgia, serif"
                  fill={isActive ? w.stroke.replace('0.85','1') : 'rgba(200,146,42,0.75)'}
                  letterSpacing="0.04em"
                  style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.3s' }}>
                  {lines[0]}
                </text>
                <text x={pos.x} y={pos.y + size * 0.035}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={size * 0.060} fontFamily="'Cormorant SC', Georgia, serif"
                  fill={isActive ? w.stroke.replace('0.85','1') : 'rgba(200,146,42,0.75)'}
                  letterSpacing="0.04em"
                  style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.3s' }}>
                  {lines[1]}
                </text>
              </>
            )}
          </g>
        )
      })}

      {/* Centre */}
      <circle cx={cx} cy={cy} r={r - 0.5}
        fill={allDone ? '#C8922A' : '#FAFAF7'}
        stroke={allDone ? 'rgba(200,146,42,1)' : 'rgba(200,146,42,0.35)'}
        strokeWidth="1"
        style={{ transition: 'all 0.6s ease' }}
      />
    </svg>
  )
}

// ─── Stage breadcrumb ─────────────────────────────────────────────────────────

function StageBreadcrumb({ activeStage }) {
  const stages = [
    { key: 'archetype',    label: 'Contribution Archetype' },
    { key: 'domain',       label: 'Global Domain'          },
    { key: 'scale',        label: 'Engagement Scale'       },
    { key: 'confirmation', label: 'Confirmation'           },
  ]
  const activeIdx = stages.findIndex(s => s.key === activeStage)

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', overflow: 'hidden' }}>
      {stages.map((s, i) => {
        const isPast    = i < activeIdx
        const isCurrent = i === activeIdx
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < stages.length - 1 ? 1 : 'none', minWidth: 0 }}>
            <span className="pp-breadcrumb-label" style={{
              ...sc, fontSize: '15px', letterSpacing: '0.16em', textTransform: 'uppercase',
              color: isCurrent ? '#A8721A' : isPast ? 'rgba(200,146,42,0.5)' : 'rgba(200,146,42,0.2)',
              whiteSpace: 'nowrap', paddingRight: i < stages.length - 1 ? '8px' : '0',
              flexShrink: 0,
            }}>
              {s.label}
            </span>
            {i < stages.length - 1 && (
              <div style={{
                flex: 1, height: '1px', marginRight: '8px',
                background: isPast ? 'rgba(200,146,42,0.38)' : 'rgba(200,146,42,0.08)',
                transition: 'background 0.5s', minWidth: '8px',
              }} />
            )}
          </div>
        )
      })}
      <ToolCompassPanel />
    </div>
  )
}

// ─── Question label ───────────────────────────────────────────────────────────

function QuestionLabel({ stage, index, total, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
      <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.16em', color: '#A8721A', textTransform: 'uppercase' }}>
        {stage.charAt(0).toUpperCase() + stage.slice(1)}
      </span>
      <span style={{ ...sc, fontSize: '17px', color: '#A8721A' }}>{'\u00b7'}</span>
      <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.1em', color: '#A8721A' }}>
        {index + 1} of {total}
      </span>
      {label && (
        <>
          <span style={{ ...sc, fontSize: '17px', color: '#A8721A' }}>{'\u00b7'}</span>
          <span style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>{label}</span>
        </>
      )}
    </div>
  )
}

// ─── Reference triggers ───────────────────────────────────────────────────────

function ReferenceTrigger({ stage, onOpenArchetypes, onOpenDomains }) {
  if (stage === 'archetype') return (
    <button onClick={onOpenArchetypes} style={{
      background: 'none', border: 'none', ...sc, fontSize: '15px', letterSpacing: '0.14em',
      color: '#A8721A', cursor: 'pointer', padding: 0,
      textTransform: 'uppercase', textDecoration: 'underline',
      textDecorationColor: 'rgba(200,146,42,0.4)', marginBottom: '18px',
      display: 'block', transition: 'color 0.2s',
    }}>
      Nine Archetypes {'\u2192'}
    </button>
  )
  if (stage === 'domain') return (
    <button onClick={onOpenDomains} style={{
      background: 'none', border: 'none', ...sc, fontSize: '15px', letterSpacing: '0.14em',
      color: '#A8721A', cursor: 'pointer', padding: 0,
      textTransform: 'uppercase', textDecoration: 'underline',
      textDecorationColor: 'rgba(200,146,42,0.4)', marginBottom: '18px',
      display: 'block', transition: 'color 0.2s',
    }}>
      Seven Domains {'\u2192'}
    </button>
  )
  return null
}

// ─── Stage transition ─────────────────────────────────────────────────────────

function StageTransition({ nextStage, onContinue, loading = false }) {
  const stageContent = {
    domain: {
      eyebrow: 'Archetype ✓',
      heading: 'How you move: found.',
      body:    'Now a different gear entirely. The last set was watching your instinct in action. This one is about what you can’t look away from — the thing that pulls your attention even when you have no reason to care.',
      cta:     'Find your domain →',
    },
    scale: {
      eyebrow: 'Domain ✓',
      heading: 'Where you care: found.',
      body:    'Last set. Two questions. Almost philosophical. Give yourself permission to answer at full size — the world makes people smaller than they are. This is not the time for that.',
      cta:     'Find your scale →',
    },
    confirmation: {
      eyebrow: 'Scale ✓',
      heading: 'All three coordinates are in.',
      body:    'Three conversations complete. The shape that was always yours is about to have a name.',
      cta:     'See your Purpose Piece →',
    },
  }

  const c = stageContent[nextStage]
  if (!c) return null

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)',
      borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '12px',
      padding: '28px 24px', animation: 'ppFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase', marginBottom: '10px' }}>
        {c.eyebrow}
      </div>
      <h3 style={{ ...sc, fontSize: '1.25rem', fontWeight: 400, color: '#0F1523', marginBottom: '10px' }}>
        {c.heading}
      </h3>
      <p style={{ ...body, fontSize: '1.1875rem', ...muted, lineHeight: 1.75, marginBottom: '24px' }}>
        {c.body}
      </p>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ ...btnStyle, opacity: 0.7, cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FFFFFF', animation: 'ppDot 1.2s ease-in-out infinite', animationDelay: '0s' }} />
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FFFFFF', animation: 'ppDot 1.2s ease-in-out infinite', animationDelay: '0.2s' }} />
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FFFFFF', animation: 'ppDot 1.2s ease-in-out infinite', animationDelay: '0.4s' }} />
            </span>
            Reading everything
          </div>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
            North Star is reading all three conversations together. Usually under 15 seconds.
          </p>
        </div>
      ) : (
        <button onClick={onContinue}
          style={{ ...btnStyle }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
          {c.cta}
        </button>
      )}
    </div>
  )
}


function ThinkingDots() {
  return (
    <div className="bubble bubble-assistant">
      <div className="typing-indicator"><span /><span /><span /></div>
    </div>
  )
}

// ─── Centre status modal ──────────────────────────────────────────────────────
// Shows when centre is clicked and not all stages are complete.

function CentreModal({ wedgeStates, onClose, onGoToStage }) {
  const stages = [
    { key: 'archetype', label: 'Contribution Archetype' },
    { key: 'domain',    label: 'Global Domain'          },
    { key: 'scale',     label: 'Engagement Scale'       },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '36px 32px', maxWidth: '380px', width: '100%' }}>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.22em', ...gold, textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Purpose Piece</span>
        <h2 style={{ ...sc, fontSize: '1.375rem', fontWeight: 400, color: '#0F1523', marginBottom: '6px', lineHeight: 1.1 }}>Three coordinates to find.</h2>
        <p style={{ ...body, fontSize: '1.1875rem', ...muted, lineHeight: 1.7, marginBottom: '24px' }}>
          Complete all three to reveal your Purpose Piece.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {stages.map(s => {
            const done = wedgeStates[s.key] === 2
            return (
              <button key={s.key} onClick={() => { onGoToStage(s.key); onClose() }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: `1px solid ${done ? 'rgba(200,146,42,0.35)' : 'rgba(200,146,42,0.2)'}`, borderRadius: '10px', background: done ? 'rgba(200,146,42,0.05)' : '#FFFFFF', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.6)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = done ? 'rgba(200,146,42,0.35)' : 'rgba(200,146,42,0.2)' }}
              >
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', border: `1.5px solid ${done ? '#C8922A' : 'rgba(200,146,42,0.3)'}`, background: done ? '#C8922A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s' }}>
                  {done && <span style={{ color: '#FFFFFF', fontSize: '15px', lineHeight: 1 }}>✓</span>}
                </span>
                <span style={{ ...sc, fontSize: '1.125rem', letterSpacing: '0.1em', color: done ? '#A8721A' : 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>{s.label}</span>
                {!done && <span style={{ ...body, fontSize: '1.125rem', ...muted, marginLeft: 'auto' }}>Go →</span>}
              </button>
            )
          })}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', ...body, fontSize: '1.1875rem', ...muted, cursor: 'pointer', padding: 0 }}>
          Continue where I am
        </button>
      </div>
    </div>
  )
}

// ─── Auth modal ───────────────────────────────────────────────────────────────

// ─── Welcome modal ────────────────────────────────────────────────────────────

function WelcomeModal({ onBegin }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '44px 36px 36px', maxWidth: '480px', width: '100%' }}>
        <span style={{ display: 'block', fontFamily: "\'Cormorant SC\', Georgia, serif", fontSize: '13px', letterSpacing: '0.22em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '20px' }}>Purpose Piece</span>
        <h2 style={{ fontFamily: "\'Cormorant Garamond\', Georgia, serif", fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', fontWeight: 300, color: '#0F1523', marginBottom: '20px', lineHeight: 1.3 }}>
          Somewhere underneath everything you’ve built, survived, and adapted to — there’s a shape that was always yours.
        </h2>
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.8, marginBottom: '28px' }}>
          Purpose Piece finds three things: the instinct that keeps showing up in how you actually move through the world. The territory your care keeps returning to. The scale of what you feel genuinely responsible for. Ten questions across three conversations. At the end, you’ll have language for something you’ve always been doing.
        </p>
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.15)', paddingTop: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { label: 'Archetype', sub: 'how you move' },
              { label: 'Domain',    sub: 'where you care' },
              { label: 'Scale',     sub: 'what you’re on the hook for' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontFamily: "\'Cormorant SC\', Georgia, serif", fontSize: '13px', letterSpacing: '0.14em', color: '#A8721A', textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '2px' }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onBegin} style={{
          display: 'block', width: '100%', padding: '15px 24px', borderRadius: '40px',
          border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)',
          color: '#A8721A', fontFamily: "\'Cormorant SC\', Georgia, serif",
          fontSize: '1.125rem', letterSpacing: '0.14em', cursor: 'pointer',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.55)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,1)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)' }}
        >
          Let’s find it {'\u2192'}
        </button>
      </div>
    </div>
  )
}
function AuthModal() {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '44px 36px 36px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <span style={{ display: 'block', ...sc, fontSize: '17px', letterSpacing: '0.22em', ...gold, textTransform: 'uppercase', marginBottom: '14px' }}>Purpose Piece</span>
        <h2 style={{ ...sc, fontSize: '1.5rem', fontWeight: 400, color: '#0F1523', marginBottom: '10px', lineHeight: 1.1 }}>Sign in to begin.</h2>
        <p style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.7, marginBottom: '28px' }}>
          Something in you already knows what you're built for. Purpose Piece finds your contribution archetype, your domain, and your scale — the three coordinates that together make your Purpose Piece.
        </p>
        <a href={`/login?redirect=${returnUrl}`} style={{ display: 'block', padding: '15px 24px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: '#A8721A', ...sc, fontSize: '1.125rem', letterSpacing: '0.14em', textDecoration: 'none' }}>
          Sign in or create account {'\u2192'}
        </a>
      </div>
    </div>
  )
}

// ─── Deep gate modal ──────────────────────────────────────────────────────────

function DeepGateModal({ onUnlock, onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '44px 36px 36px', maxWidth: '460px', width: '100%' }}>
        <div style={{ ...sc, fontSize: '17px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '16px' }}>Go Deeper</div>
        <h2 style={{ ...sc, fontSize: '1.5rem', fontWeight: 400, color: '#0F1523', marginBottom: '14px', lineHeight: 1.15 }}>
          The tension. The shadow.<br />The full picture.
        </h2>
        <p style={{ ...body, fontSize: '1.1875rem', ...meta, lineHeight: 1.8, marginBottom: '28px' }}>
          The First Look gave you the shape. The Deep Dive is a real conversation {'\u2014'} into what this costs you at the bone, where the instinct breaks, and what it{'\u2019'}s been asking of you.
        </p>
        <button onClick={onUnlock} style={{ ...btnStyle, display: 'block', width: '100%', textAlign: 'center', marginBottom: '12px' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
          Unlock the Deep Dive
        </button>
        <button onClick={onDismiss} style={{ display: 'block', width: '100%', background: 'none', border: 'none', ...body, fontSize: '1.1875rem', ...muted, cursor: 'pointer', padding: '8px' }}>
          Not now
        </button>
      </div>
    </div>
  )
}

// ─── PurposePiecePage ─────────────────────────────────────────────────────────

export function PurposePiecePage() {
  const { user, loading: authLoading } = useAuth()
  const { tier, loading: accessLoading } = useAccess('purpose_piece')
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()

  // ── Shared session — holds all three transcripts and synthesis state ──────────
  const [session,       setSession]       = useState(null)

  // ── Per-stage independent state ────────────────────────────────────────────
  // Each stage is its own conversation: own messages, own currentQuestion, own thinking state.
  const STAGES = ['archetype', 'domain', 'scale']
  const [stageMessages,  setStageMessages]  = useState({ archetype: [], domain: [], scale: [] })
  const [stageQuestion,  setStageQuestion]  = useState({ archetype: null, domain: null, scale: null })
  const [stageThinking,  setStageThinking]  = useState({ archetype: false, domain: false, scale: false })
  const [stageStarted,   setStageStarted]   = useState({ archetype: false, domain: false, scale: false })

  const [activeStage,   setActiveStage]   = useState('archetype')  // which viewport is showing
  const [input,         setInput]         = useState('')
  const [stageComplete, setStageComplete] = useState({ archetype: false, domain: false, scale: false })
  const [showReveal,    setShowReveal]    = useState(false)
  const [profileCard,   setProfileCard]   = useState(null)    // Phase 4 HTML — shown first
  const [mirrorText,    setMirrorText]    = useState(null)    // Phase 3 mirror — shown after pause
  const [showMirror,    setShowMirror]    = useState(false)   // true after 6s auto-advance
  const [showCorrection, setShowCorrection] = useState(false) // optional post-mirror correction
  const [readyToLock,   setReadyToLock]   = useState(false)
  const [showDeepGate,  setShowDeepGate]  = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const confirmCalledRef = useRef(false)
  const lockBtnRef      = useRef(null)
  const [pendingMsg,    setPendingMsg]    = useState(null)
  const [backVisible,   setBackVisible]   = useState(false)
  const backTimerRef = useRef(null)
  const [showCentreModal, setShowCentreModal] = useState(false)
  const [headerOpen,    setHeaderOpen]    = useState({ archetype: true, domain: true, scale: true })
  const [stageIsProbe,  setStageIsProbe]  = useState({ archetype: false, domain: false, scale: false })

  // Convenience — active stage's state
  const messages        = stageMessages[activeStage]  || []
  const currentQuestion = stageQuestion[activeStage]  || null
  const thinking        = stageThinking[activeStage]  || false

  // Per-stage setters
  function addMsg(type, content, targetStage) {
    const s = targetStage || activeStage
    setStageMessages(prev => ({ ...prev, [s]: [...(prev[s] || []), { id: Date.now() + Math.random(), type, content }] }))
  }
  function setThinking(val, targetStage) {
    const s = targetStage || activeStage
    setStageThinking(prev => ({ ...prev, [s]: val }))
  }
  const [showWelcome, setShowWelcome] = useState(() => {
    // Skip welcome modal if a valid in-progress session already exists in sessionStorage
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (s.session && s.stageMessages) return false
      }
    } catch {}
    // Don't show yet — wait for Supabase check to determine if returning user
    // The completed-result useEffect below will set this to false if a result exists,
    // or leave it to be set true once we know they're fresh.
    return null // null = still loading
  })
  // Reference panels manage their own open state internally.
  // Trigger via custom events so the ReferenceTrigger buttons actually work.
  function openArchetypePanel() { window.dispatchEvent(new CustomEvent('pp:open-archetypes')) }
  function openDomainPanel()    { window.dispatchEvent(new CustomEvent('pp:open-domains'))    }

  const sessionRef = useRef(null)
  const startedRef = useRef(false)
  const bottomRef  = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, thinking])

  // Define window.App handlers for the injected Phase 4 HTML (B2 fix)
  useEffect(() => {
    if (!showReveal) return
    window.App = {
      onPpNoteInput(value) {
        const lockBtn = document.getElementById('ppLockBtn')
        if (lockBtn) lockBtn.style.display = value.trim() ? 'block' : 'none'
      },
      togglePpProfile() {
        const summary = document.getElementById('ppProfileSummary')
        const btn     = document.getElementById('ppExpandBtn')
        if (!summary) return
        const isHidden = summary.style.display === 'none'
        summary.style.display = isHidden ? 'block' : 'none'
        if (btn) btn.textContent = isHidden ? 'Hide profile ↑' : 'See your Purpose Piece profile →'
      },
      lockPpNote() {
        const textarea  = document.getElementById('ppPersonalNote')
        const lockBtn   = document.getElementById('ppLockBtn')
        const lockedMsg = document.getElementById('ppLockedMsg')
        if (textarea)  textarea.disabled = true
        if (lockBtn)   lockBtn.style.display = 'none'
        if (lockedMsg) lockedMsg.style.display = 'block'
      },
      goToNextUs() {
        const t = sessionRef.current?.tentative || {}
        const archetype = t.archetype?.archetype || ''
        const domain    = t.domain?.domain || ''
        const scale     = t.scale?.scale || ''
        const DOMAIN_SLUG = {
          'VISION': 'vision', 'Vision': 'vision',
          'NATURE': 'nature', 'Nature': 'nature',
          'SOCIETY': 'society', 'Society': 'society',
          'TECHNOLOGY': 'technology', 'Technology': 'technology',
          'FINANCE & ECONOMY': 'finance-economy', 'Finance & Economy': 'finance-economy',
          'LEGACY': 'legacy', 'Legacy': 'legacy',
          'HUMAN BEING': 'human-being', 'Human Being': 'human-being',
        }
        const domainSlug = DOMAIN_SLUG[domain] || domain.toLowerCase().replace(/[^a-z]+/g, '-')
        const params = new URLSearchParams()
        if (archetype) params.set('pp_archetype', archetype)
        if (domainSlug) params.set('pp_domain', domainSlug)
        if (scale)     params.set('pp_scale', scale)
        params.set('pp_from', 'purpose-piece')
        navigate(`/nextus/contributors?${params.toString()}`)
      },
      goToTerrain() {
        const t = sessionRef.current?.tentative || {}
        const domain = t.domain?.domain || ''
        const DOMAIN_SLUG = {
          'VISION': 'vision', 'Vision': 'vision',
          'NATURE': 'nature', 'Nature': 'nature',
          'SOCIETY': 'society', 'Society': 'society',
          'TECHNOLOGY': 'technology', 'Technology': 'technology',
          'FINANCE & ECONOMY': 'finance-economy', 'Finance & Economy': 'finance-economy',
          'LEGACY': 'legacy', 'Legacy': 'legacy',
          'HUMAN BEING': 'human-being', 'Human Being': 'human-being',
        }
        const domainSlug = DOMAIN_SLUG[domain] || domain.toLowerCase().replace(/[^a-z]+/g, '-')
        const params = domainSlug ? `?domain=${domainSlug}` : ''
        navigate(`/nextus/map${params}`)
      },
      goDeeper() {
        const unlocked = localStorage.getItem('pp_deep_unlocked') === 'true'
        if (!unlocked) { setShowDeepGate(true) }
        else { navigate('/tools/purpose-piece/deep') }
      },
    }
    return () => { if (window.App) delete window.App }
  }, [showReveal])

  // Restore or start session — only after welcome dismissed and Supabase check complete
  useEffect(() => {
    if (!user || startedRef.current || showWelcome !== false) return
    startedRef.current = true
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.session && saved.session.status !== 'complete' && saved.stageMessages) {
          setSession(saved.session)
          setStageMessages(saved.stageMessages || { archetype: [], domain: [], scale: [] })
          setStageQuestion(saved.stageQuestion || { archetype: null, domain: null, scale: null })
          if (saved.activeStage) setActiveStage(saved.activeStage)
          // Start any stage that hasn't been initialised yet
          const started = saved.stageMessages
          if (!started.archetype?.length) startStage('archetype', saved.session)
          if (!started.domain?.length)    startStage('domain',    saved.session)
          if (!started.scale?.length)     startStage('scale',     saved.session)
          return
        }
      }
    } catch {}
    startTool()
  }, [user, showWelcome])

  // Check Supabase for any existing result on mount — restores returning users
  useEffect(() => {
    if (!user?.id || showReveal) return

    async function checkExisting() {
      try {
        // Check for completed result first
        const { data: complete } = await supabase
          .from('purpose_piece_results')
          .select('session, status, archetype, domain, scale')
          .eq('user_id', user.id)
          .eq('status', 'complete')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (complete) {
          if (complete.session) setSession(complete.session)
          setShowReveal(true)
          setShowWelcome(false)
          startedRef.current = true
          return
        }

        // Check for in-progress result
        const { data: started } = await supabase
          .from('purpose_piece_results')
          .select('session, status')
          .eq('user_id', user.id)
          .eq('status', 'started')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (started?.session) {
          const s = started.session
          setSession(s)
          setShowWelcome(false)
          startedRef.current = true

          // Determine which stages are already complete from saved transcripts
          const archetypeDone = (s.archetypeTranscript?.length ?? 0) >= 5
          const domainDone    = (s.domainTranscript?.length    ?? 0) >= 3
          const scaleDone     = (s.scaleTranscript?.length     ?? 0) >= 3

          // Mark completed stages so the disc and UI reflect progress
          setStageComplete({ archetype: archetypeDone, domain: domainDone, scale: scaleDone })

          // Restore stageQuestion for each incomplete stage from its own question index
          const ARCHETYPE_QS = ['Think of a recent moment where something around you was off — and you either stepped in or you didn\'t. It doesn\'t have to be dramatic.\n\nWhat happened, and what did you do?','What keeps going wrong around you that bothers you, even when it\'s not your problem?\n\nName one specific example.','Describe a moment where you had to make a real decision with no clear right answer and something actually at stake.\n\nWhat did you do?','What does your way of operating cost you that others don\'t seem to pay?\n\nBe specific.','When has your biggest strength made things worse?\n\nGive me a specific moment.']
          const DOMAIN_QS    = ['What\'s broken in the world that you can\'t stop thinking about, even though nobody\'s asking you to care?\n\nWhat is it specifically?','What makes you angrier than it seems to make everyone else?\n\nWhat does it look like when you see it?','What do you keep doing just because you love it, even though nobody asked for it and nobody\'s paying you?\n\nWhat is it, and what keeps pulling you back?']
          const SCALE_QS     = ['Picture your work actually making a difference. What does that scene look like?\n\nWho\'s there and how many people?','What\'s the biggest problem you feel personally responsible for doing something about, not just interested in, but actually on the hook for?\n\nWhat is it?','What\'s something you haven\'t done yet that keeps coming back to you — not as a goal you\'re working toward, but as something that would feel like unfinished business if you never got to it?\n\nWhat is it, and why does it keep returning?']

          const qi = s.questionIndex || { archetype: 0, domain: 0, scale: 0 }
          const restoredQ = {
            archetype: archetypeDone ? null : (ARCHETYPE_QS[typeof qi === 'object' ? (qi.archetype ?? 0) : 0] || null),
            domain:    domainDone    ? null : (DOMAIN_QS[typeof qi === 'object'    ? (qi.domain    ?? 0) : 0] || null),
            scale:     scaleDone     ? null : (SCALE_QS[typeof qi === 'object'     ? (qi.scale     ?? 0) : 0] || null),
          }
          setStageQuestion(restoredQ)

          // Navigate to first incomplete stage
          const firstIncomplete = !archetypeDone ? 'archetype' : !domainDone ? 'domain' : !scaleDone ? 'scale' : 'archetype'
          setActiveStage(firstIncomplete)

          // Start only incomplete stages — completed ones need no API call
          if (!archetypeDone) startStage('archetype', s)
          if (!domainDone)    startStage('domain',    s)
          if (!scaleDone)     startStage('scale',     s)
          return
        } else {
          setShowWelcome(prev => prev === null ? true : prev)
        }
      } catch {
        setShowWelcome(prev => prev === null ? true : prev)
      }
    }

    checkExisting()
  }, [user?.id])

  // Persist to sessionStorage — save per-stage messages + shared session
  useEffect(() => {
    if (!session) return
    try { sessionStorage.setItem(SS_KEY, JSON.stringify({ session, stageMessages, stageQuestion, activeStage })) } catch {}
  }, [session, stageMessages, stageQuestion, activeStage])

  // Derived
  const stage = activeStage  // viewport stage — independent of session.stage
  const qIdx  = (() => {
    const qi = session?.questionIndex
    if (typeof qi === 'object' && qi !== null) return qi[activeStage] ?? 0
    return typeof qi === 'number' ? qi : 0
  })()

  const wedgeStates = {
    archetype: (session?.archetypeTranscript?.length ?? 0) >= 5 ? 2
             : activeStage === 'archetype' ? 1 : 0,
    domain:    (session?.domainTranscript?.length ?? 0) >= 3 ? 2
             : activeStage === 'domain' ? 1 : 0,
    scale:     (session?.scaleTranscript?.length ?? 0) >= 3 ? 2
             : activeStage === 'scale' ? 1 : 0,
  }

  const allWedgesDone = WEDGE_KEYS.every(k => wedgeStates[k] === 2)
  const breadcrumb    = ['archetype','domain','scale','confirmation'].includes(stage) ? stage : null

  // Cycle stages with prev/next buttons — sequential by default, clamped at ends
  const STAGE_ORDER = ['archetype', 'domain', 'scale', 'confirmation']
  function handleWedgeNav(dir) {
    const current = STAGE_ORDER.includes(activeStage) ? activeStage : 'archetype'
    const idx = STAGE_ORDER.indexOf(current)
    const nextIdx = dir === 'next'
      ? Math.min(idx + 1, STAGE_ORDER.length - 1)
      : Math.max(idx - 1, 0)
    const nextStage = STAGE_ORDER[nextIdx]
    if (nextStage === activeStage) return
    setActiveStage(nextStage)
    setHeaderOpen(prev => ({ ...prev, [nextStage]: true }))
    setInput('')
    if (backTimerRef.current) { clearTimeout(backTimerRef.current); setPendingMsg(null); setBackVisible(false) }
  }

  // Direct stage jump — switches the active viewport only
  // Each stage is already running independently; no API call needed here
  function handleWedgeClick(key) {
    if (!['archetype', 'domain', 'scale'].includes(key)) return
    if (key === activeStage) return
    setActiveStage(key)
    setStageComplete(prev => ({ ...prev, [activeStage]: false }))
    setHeaderOpen(prev => ({ ...prev, [key]: true }))
    setInput('')
    if (backTimerRef.current) { clearTimeout(backTimerRef.current); setPendingMsg(null); setBackVisible(false) }
  }

  function handleCentreClick() {
    if (allWedgesDone) {
      setShowReveal(true)
    } else {
      setShowCentreModal(true)
    }
  }

  // ── Stage refs — one per stage for independent API calls ──────────────────
  const stageSessionRef = useRef({ archetype: null, domain: null, scale: null })
  const stageStartedRef = useRef({ archetype: false, domain: false, scale: false })

  // API call — always sends stage-specific session slice
  async function callStageAPI(msgs, targetStage) {
    const s = targetStage || activeStage
    // Build a stage-specific session: shared base + override stage
    const stageSession = sessionRef.current
      ? { ...sessionRef.current, stage: s }
      : null
    const res = await fetch('/tools/purpose-piece/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, session: stageSession, userId: user?.id })
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }

  // Legacy callAPI for confirmation/synthesis/framing stages
  async function callAPI(msgs) {
    const res = await fetch('/tools/purpose-piece/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, session: sessionRef.current, userId: user?.id })
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }

  // Start a single stage — fetches its opening question independently
  async function startStage(targetStage, existingSession) {
    if (stageStartedRef.current[targetStage]) return
    stageStartedRef.current[targetStage] = true
    setThinking(true, targetStage)
    try {
      const stageSession = existingSession
        ? { ...existingSession, stage: targetStage }
        : null
      const res = await fetch('/tools/purpose-piece/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], session: stageSession, userId: user?.id })
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const d = await res.json()
      // Update shared session — use safe merge so startStage opening calls
      // never overwrite a more-advanced questionIndex from a parallel stage
      if (d.session && !sessionRef.current) {
        setSession(d.session)
      } else if (d.session) {
        setSession(prev => {
          if (!prev) return d.session
          const incomingQI = d.session.questionIndex || {}
          const prevQI     = prev.questionIndex || {}
          return {
            ...prev,
            // Never let a startStage opening call (qi=0) overwrite an advanced index
            questionIndex: {
              archetype: Math.max(prevQI.archetype ?? 0, incomingQI.archetype ?? 0),
              domain:    Math.max(prevQI.domain    ?? 0, incomingQI.domain    ?? 0),
              scale:     Math.max(prevQI.scale     ?? 0, incomingQI.scale     ?? 0),
            },
          }
        })
      }
      // Set this stage's question
      if (d.session?.currentQuestion) {
        setStageQuestion(prev => ({ ...prev, [targetStage]: d.session.currentQuestion }))
      }
      if (d.message) addMsg('assistant', d.message, targetStage)
    } catch { /* silent — stage will show empty state */ }
    setThinking(false, targetStage)
  }

  async function startTool() {
    setThinking(true)
    try {
      // Bootstrap: create session with first API call, then start all three stages
      const res = await fetch('/tools/purpose-piece/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], session: null, userId: user?.id })
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const d = await res.json()
      const baseSession = d.session
      setSession(baseSession)
      if (d.session?.currentQuestion) {
        setStageQuestion(prev => ({ ...prev, archetype: d.session.currentQuestion }))
      }
      if (d.message) addMsg('assistant', d.message, 'archetype')
      stageStartedRef.current.archetype = true
      setThinking(false)
      // Start domain and scale in parallel
      startStage('domain', baseSession)
      startStage('scale',  baseSession)
    } catch {
      setThinking(false)
      addMsg('assistant', 'Something went wrong. Please refresh.', 'archetype')
    }
  }
  function handleResponse(data, targetStage) {
    const s = targetStage || activeStage

    // Update shared session — merge carefully to avoid race conditions.
    // Three stages run in parallel; a late response from one stage must never
    // overwrite a more-advanced questionIndex or transcript from another stage.
    if (data.session) {
      setSession(prev => {
        if (!prev) return data.session
        const incomingQI = data.session.questionIndex || {}
        const prevQI     = prev.questionIndex || {}
        const incomingPC = data.session.probeCount || {}
        const prevPC     = prev.probeCount || {}
        return {
          ...prev,
          ...data.session,
          // Always keep the highest questionIndex per stage
          questionIndex: {
            archetype: Math.max(prevQI.archetype ?? 0, incomingQI.archetype ?? 0),
            domain:    Math.max(prevQI.domain    ?? 0, incomingQI.domain    ?? 0),
            scale:     Math.max(prevQI.scale     ?? 0, incomingQI.scale     ?? 0),
          },
          // Always keep the most recent probeCount for the active stage, preserve others
          probeCount: {
            archetype: s === 'archetype' ? (incomingPC.archetype ?? 0) : Math.max(prevPC.archetype ?? 0, incomingPC.archetype ?? 0),
            domain:    s === 'domain'    ? (incomingPC.domain    ?? 0) : Math.max(prevPC.domain    ?? 0, incomingPC.domain    ?? 0),
            scale:     s === 'scale'     ? (incomingPC.scale     ?? 0) : Math.max(prevPC.scale     ?? 0, incomingPC.scale     ?? 0),
          },
          // Transcripts: keep the longer one per stage (more answers = more progress)
          archetypeTranscript: (data.session.archetypeTranscript?.length ?? 0) >= (prev.archetypeTranscript?.length ?? 0)
            ? data.session.archetypeTranscript : prev.archetypeTranscript,
          domainTranscript: (data.session.domainTranscript?.length ?? 0) >= (prev.domainTranscript?.length ?? 0)
            ? data.session.domainTranscript : prev.domainTranscript,
          scaleTranscript: (data.session.scaleTranscript?.length ?? 0) >= (prev.scaleTranscript?.length ?? 0)
            ? data.session.scaleTranscript : prev.scaleTranscript,
          // Tentative: never overwrite an extracted coordinate with null
          tentative: {
            archetype: data.session.tentative?.archetype || prev.tentative?.archetype || null,
            domain:    data.session.tentative?.domain    || prev.tentative?.domain    || null,
            scale:     data.session.tentative?.scale     || prev.tentative?.scale     || null,
          },
        }
      })
      // Update this stage's currentQuestion
      if (data.session.currentQuestion) {
        setStageQuestion(prev => ({ ...prev, [s]: data.session.currentQuestion }))
      }
      // Track whether current question is a probe (follow-up) for visual distinction
      setStageIsProbe(prev => ({ ...prev, [s]: !!data.isProbe }))
    }

    // Message — add to the target stage's thread
    if (data.message) {
      if (data.isHtml) addMsg('html', data.message, s)
      else addMsg('assistant', data.message, s)
    }

    // Stage complete for a question stage — mark it
    if (data.stageComplete && ['archetype','domain','scale'].includes(s)) {
      setStageComplete(prev => ({ ...prev, [s]: true }))
      if (user?.id && data.session) {
        ;(async () => { try {
          const { data: ex } = await supabase.from('purpose_piece_results').select('id').eq('user_id', user.id).limit(1).maybeSingle()
          if (ex?.id) {
            await supabase.from('purpose_piece_results').update({ status: 'started', session: data.session, updated_at: new Date().toISOString() }).eq('id', ex.id)
          } else {
            await supabase.from('purpose_piece_results').insert({ user_id: user.id, status: 'started', session: data.session, updated_at: new Date().toISOString() })
          }
        } catch {} })()
      }
      return
    }

    // Complete — profile card + mirror arrive together in one response
    if (data.stage === 'complete' && data.isHtml && data.message) {
      setProfileCard(data.message)
      setShowReveal(true)
      // Mirror arrives in same response
      if (data.mirrorText) {
        setMirrorText(data.mirrorText)
        setShowMirror(true)
      }
      // Save profile and north star notes
      if (user?.id && data.profile) {
        ;(async () => { try {
          const { data: ex, error: exErr } = await supabase.from('purpose_piece_results').select('id').eq('user_id', user.id).limit(1).maybeSingle()
          if (!exErr && ex?.id) {
            await supabase.from('purpose_piece_results').update({ status: 'complete', session: data.session, profile: data.profile, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', ex.id)
          } else {
            await supabase.from('purpose_piece_results').insert({ user_id: user.id, status: 'complete', session: data.session, profile: data.profile, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          }
        } catch {} })()
      }
      if (user?.id && data.session?.tentative) {
        const t = data.session.tentative
        const ppNotes = [
          t.archetype?.archetype ? `Contribution Archetype: ${t.archetype.archetype}` : null,
          t.domain?.domain       ? `Global Domain: ${t.domain.domain}` : null,
          t.scale?.scale         ? `Scale of Focus: ${t.scale.scale}` : null,
        ].filter(Boolean)
        if (ppNotes.length) {
          ;(async () => {
            try { await supabase.from('north_star_notes').delete().eq('user_id', user.id).eq('tool', 'purpose-piece') } catch {}
            try { await supabase.from('north_star_notes').insert(ppNotes.map(note => ({ user_id: user.id, tool: 'purpose-piece', note }))) } catch {}
          })()
        }
      }
      try {
        const t = data.session?.tentative || {}
        sessionStorage.setItem('pp_first_look', JSON.stringify({
          archetype:        t.archetype?.archetype,
          domain:           t.domain?.domain,
          scale:            t.scale?.scale,
          synthesis:        data.session?.synthesis,
          internal_signals: data.session?.synthesis?.internal_signals,
          transcript: [
            ...(data.session?.archetypeTranscript || []),
            ...(data.session?.domainTranscript    || []),
            ...(data.session?.scaleTranscript     || []),
          ],
        }))
      } catch {}
      return
    }

    // Legacy: stage === 'synthesis' (old two-phase flow, kept for safety)
    if (data.stage === 'synthesis') {
      if (data.isHtml && data.message) {
        setProfileCard(data.message)
        setShowReveal(true)
      }
      return
    }

    // Auto-advance (stage openings OR thinking → synthesis transition)
    if (data.autoAdvance) {
      // 'thinking' stage must use callAPI (sends session unmodified, stage: 'thinking')
      // All other autoAdvance calls (stage openings) use callStageAPI
      const isThinkingAdvance = data.stage === 'thinking'
      setTimeout(async () => {
        setThinking(true, s)
        try {
          const d = isThinkingAdvance ? await callAPI([]) : await callStageAPI([], s)
          setThinking(false, s)
          handleResponse(d, s)
        }
        catch { setThinking(false, s) }
      }, data.advanceDelay || 2500)
      return
    }

    if (data.readyToLock) {
      setReadyToLock(true)
      setTimeout(() => lockBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
    }

    if (data.complete) {
      // Mirror arrives — show it below the profile card
      if (data.isMirror && data.message) {
        setMirrorText(data.message)
        setShowMirror(true)
      }
    }
  }

  function resizeTextarea() {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
  }

  async function send() {
    const text = input.trim()
    // Allow send during correction conversation even though showReveal is true
    if (!text || thinking || (showReveal && !showCorrection) || pendingMsg) return

    // Clear any existing Back timer
    if (backTimerRef.current) clearTimeout(backTimerRef.current)

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Collapse stage intro header after first answer
    if (['archetype','domain','scale'].includes(activeStage)) {
      setHeaderOpen(prev => ({ ...prev, [activeStage]: false }))
    }

    // Hold message in pendingMsg — show Back button for 4 seconds
    setPendingMsg(text)
    setBackVisible(true)

    const sendingStage = activeStage
    backTimerRef.current = setTimeout(async () => {
      setBackVisible(false)
      setPendingMsg(null)
      addMsg('user', text, sendingStage)
      setThinking(true, sendingStage)
      const isQuestionStage = ['archetype','domain','scale'].includes(sendingStage)
      const apiCall = isQuestionStage
        ? callStageAPI([{ role: 'user', content: text }], sendingStage)
        : callAPI([{ role: 'user', content: text }])
      const [d] = await Promise.allSettled([apiCall, new Promise(r => setTimeout(r, 800))])
      setThinking(false, sendingStage)
      if (d.status === 'fulfilled') {
        handleResponse(d.value, sendingStage)
      } else {
        const lastQ = stageQuestion[sendingStage] || sessionRef.current?.currentQuestion
        addMsg('assistant', lastQ
          ? `Lost my thread for a second — still with you.\n\n${lastQ}`
          : 'Lost my thread for a second. Please try again.', sendingStage)
      }
    }, 4000)
  }

  function handleBack() {
    if (backTimerRef.current) clearTimeout(backTimerRef.current)
    setInput(pendingMsg || '')
    setPendingMsg(null)
    setBackVisible(false)
    // Re-open stage header
    if (['archetype','domain','scale'].includes(activeStage)) {
      setHeaderOpen(prev => ({ ...prev, [activeStage]: true }))
    }
    setTimeout(() => textareaRef.current?.focus(), 50)
  }


  async function handleLock() {
    setReadyToLock(false)
    setThinking(true)
    try { const d = await callAPI([{ role: 'user', content: 'Yes, lock it in.' }]); setThinking(false); handleResponse(d) }
    catch { setThinking(false); const lastQ = sessionRef.current?.currentQuestion; addMsg('assistant', lastQ ? `Lost my thread for a second — still with you.\n\n${lastQ}` : 'Lost my thread for a second. Please try again.', activeStage) }
  }

  async function continueToNextStage() {
    if (confirmCalledRef.current) return
    confirmCalledRef.current = true
    setConfirmLoading(true)
    setThinking(true)
    try {
      // Send stage: 'reveal' — triggers extraction then profile card (Phase 4)
      const revealSession = { ...sessionRef.current, stage: 'reveal' }
      const res = await fetch('/tools/purpose-piece/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], session: revealSession, userId: user?.id })
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const d = await res.json()
      setThinking(false)
      setConfirmLoading(false)
      handleResponse(d)
    } catch {
      setThinking(false)
      setConfirmLoading(false)
      addMsg('assistant', 'Something went wrong. Please try again.', activeStage)
    }
  }

  async function openCorrection() {
    // Optional post-mirror correction conversation
    setShowCorrection(true)
    setActiveStage('confirmation')
    setThinking(true)
    try {
      const correctionSession = { ...sessionRef.current, stage: 'correction' }
      const res = await fetch('/tools/purpose-piece/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], session: correctionSession, userId: user?.id })
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const d = await res.json()
      setThinking(false)
      handleResponse(d, 'confirmation')
    } catch {
      setThinking(false)
    }
  }

  function goDeeper() {
    const unlocked = localStorage.getItem('pp_deep_unlocked') === 'true'
    if (!unlocked) { setShowDeepGate(true); return }
    navigate('/tools/purpose-piece/deep')
  }

  if (authLoading || accessLoading) return <div className="loading" />

  const nextStageMap = { archetype: 'domain', domain: 'scale', scale: 'confirmation' }
  const currentLabel = STAGE_QUESTION_LABELS[stage]?.[qIdx] || ''
  const stageTotal   = STAGE_TOTALS[stage]

  // ── Content ────────────────────────────────────────────────────────────────
  function renderContent() {
    // Reveal — profile card first, then mirror after pause, then optional correction + deep dive
    if (showReveal) {
      return (
        <div className="pp-fade-up">

          {/* Profile card */}
          {profileCard
            ? <div dangerouslySetInnerHTML={{ __html: profileCard }} />
            : <div style={{ ...body, fontSize: '1.25rem', ...muted }}>Building your Purpose Piece…</div>
          }

          {/* Thinking indicator while mirror loads */}
          {profileCard && !showMirror && thinking && (
            <div style={{ padding: '32px 0 8px' }}>
              <ThinkingDots />
            </div>
          )}

          {/* Mirror — appears after 6s auto-advance */}
          {showMirror && mirrorText && (
            <div style={{
              marginTop: '40px',
              padding: '36px 32px',
              background: '#FAFAF7',
              border: '1px solid rgba(200,146,42,0.18)',
              borderLeft: '3px solid rgba(200,146,42,0.45)',
              borderRadius: '12px',
              animation: 'ppFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both',
            }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '20px' }}>
                The mirror
              </div>
              <p style={{ ...body, fontSize: '1.1875rem', fontWeight: 300, color: '#0F1523', lineHeight: 1.85, whiteSpace: 'pre-line', margin: 0 }}>
                {mirrorText}
              </p>
            </div>
          )}

          {/* Post-mirror actions — NextUs placement CTAs */}
          {showMirror && (
            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch', paddingBottom: '40px' }}>
              <button
                onClick={() => { if (window.App) window.App.goToNextUs() }}
                style={{ ...btnStyle }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                See who could use you {'\u2192'}
              </button>
              <button
                onClick={() => { if (window.App) window.App.goToTerrain() }}
                style={{ ...btnStyle, background: 'transparent', color: '#A8721A', border: '1.5px solid rgba(200,146,42,0.55)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#A8721A' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.55)' }}>
                Find your terrain {'\u2192'}
              </button>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
                <button onClick={goDeeper}
                  style={{ background: 'none', border: 'none', ...body, fontSize: '1rem', color: 'rgba(15,21,35,0.55)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationColor: 'rgba(15,21,35,0.55)' }}>
                  Go deeper {'\u2192'}
                </button>
                {!showCorrection && (
                  <button onClick={openCorrection}
                    style={{ background: 'none', border: 'none', ...body, fontSize: '1rem', color: 'rgba(15,21,35,0.58)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationColor: 'rgba(15,21,35,0.55)' }}>
                    The fit isn’t quite right →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Optional correction conversation */}
          {showCorrection && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '16px' }}>
                Correction
              </div>
              <div className="chat-thread" style={{ marginBottom: '16px' }}>
                {(stageMessages['confirmation'] || []).map(m => {
                  if (m.type === 'user')      return <div key={m.id} className="bubble bubble-user">{m.content}</div>
                  if (m.type === 'assistant') return <div key={m.id} className="bubble bubble-assistant">{m.content}</div>
                  return null
                })}
                {thinking && <ThinkingDots />}
                <div ref={bottomRef} />
              </div>
              <div className="input-area" id="pp-input-area">
                <textarea ref={textareaRef} value={input}
                  onChange={e => { setInput(e.target.value); resizeTextarea() }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={'Tell me what doesn\u2019t fit\u2026'}
                  rows={1} disabled={thinking}
                />
                <button className="btn-send" onClick={send} disabled={!input.trim() || thinking}>Send</button>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Stage completion state
    const activeQuestionStage = ['archetype','domain','scale'].includes(stage) ? stage : null
    const activeWedgeDone = activeQuestionStage ? wedgeStates[activeQuestionStage] === 2 : false
    if ((stageComplete[activeQuestionStage] || activeWedgeDone) && activeQuestionStage) {
      // If all three are done, show the confirmation transition
      if (allWedgesDone) {
        return <StageTransition nextStage="confirmation" onContinue={continueToNextStage} loading={confirmLoading} />
      }
      // Otherwise show a simple done state — nudge to the wheel
      const stageCompletionCopy = {
        archetype: {
          headline: 'Archetype: in.',
          body: 'The instinct underneath the action has been found. Pick up another section on the disc when you’re ready.'
        },
        domain: {
          headline: 'Domain: in.',
          body: 'The territory your care keeps returning to has been named. Two coordinates down.'
        },
        scale: {
          headline: 'Scale: in.',
          body: 'Where your felt responsibility lives has been found. All three coordinates are in.'
        },
      }
      const stageCopy = stageCompletionCopy[activeQuestionStage] || { headline: 'Done.', body: 'Move to another section on the disc.' }
      return (
        <div style={{
          background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)',
          borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '12px',
          padding: '28px 24px', animation: 'ppFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase', marginBottom: '10px' }}>
            {stageCopy.headline}
          </div>
          <p style={{ ...body, fontSize: '1.1875rem', ...muted, lineHeight: 1.75, margin: 0 }}>
            {stageCopy.body}
          </p>
        </div>
      )
    }

    return (
      <div>
        {/* ── Stage intro panel — collapsible, pull tab at top ── */}
        {activeQuestionStage && (
          <div style={{ marginBottom: '20px' }}>
            {/* Pull tab — always visible */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0' }}>
              <button
                onClick={() => setHeaderOpen(prev => ({ ...prev, [activeQuestionStage]: !prev[activeQuestionStage] }))}
                style={{
                  background: 'rgba(200,146,42,0.05)',
                  border: '1px solid rgba(200,146,42,0.22)',
                  borderBottom: headerOpen[activeQuestionStage] ? 'none' : '1px solid rgba(200,146,42,0.22)',
                  borderRadius: headerOpen[activeQuestionStage] ? '8px 8px 0 0' : '8px',
                  padding: '4px 20px 3px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase' }}>
                  {STAGE_INTROS[activeQuestionStage]?.label}
                </span>
                {(activeQuestionStage === 'archetype' || activeQuestionStage === 'domain') && (
                  <button
                    onClick={e => { e.stopPropagation(); activeQuestionStage === 'archetype' ? openArchetypePanel() : openDomainPanel() }}
                    style={{
                      background: 'none', border: '1px solid rgba(200,146,42,0.35)',
                      borderRadius: '50%', width: '14px', height: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                      color: '#A8721A', fontSize: '13px',
                      fontFamily: 'Georgia, serif', lineHeight: 1,
                    }}
                  >
                    i
                  </button>
                )}
                <span style={{ color: '#A8721A', fontSize: '13px', marginLeft: '2px' }}>
                  {headerOpen[activeQuestionStage] ? '▲' : '▼'}
                </span>
              </button>
            </div>

            {/* Collapsible panel body */}
            {headerOpen[activeQuestionStage] && (
              <div style={{
                border: '1px solid rgba(200,146,42,0.22)',
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                padding: '16px 20px 18px',
                background: 'rgba(200,146,42,0.05)',
                animation: 'ppFadeUp 0.25s ease both',
              }}>
                <p style={{ ...body, fontSize: '1rem', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginBottom: '0' }}>
                  {STAGE_INTROS[activeQuestionStage]?.desc}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#A8721A' }}>
                    {qIdx + 1} of {stageTotal}
                  </span>
                  <ReferenceTrigger stage={activeQuestionStage}
                    onOpenArchetypes={openArchetypePanel}
                    onOpenDomains={openDomainPanel}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirmation label */}
        {stage === 'confirmation' && (
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase', marginBottom: '14px' }}>
            Confirmation
          </div>
        )}

        {/* ── Question window — clean, focused, one question at a time ── */}
        {activeQuestionStage && currentQuestion && (
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid rgba(200,146,42,0.22)',
            borderRadius: '12px',
            padding: '28px 28px 24px',
            marginBottom: '16px',
            animation: 'ppFadeUp 0.3s ease both',
          }}>
            {/* Probe indicator */}
            {stageIsProbe[activeStage] && (
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '1px', background: 'rgba(200,146,42,0.4)' }} />
                Follow-up
              </div>
            )}
            {/* Question text */}
            <div style={{ ...body, fontSize: '1.1875rem', color: '#0F1523', lineHeight: 1.75, whiteSpace: 'pre-line', marginBottom: '24px' }}>
              {currentQuestion}
            </div>

            {/* Pending message preview — shown during Back window */}
            {pendingMsg && (
              <div style={{
                ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65,
                padding: '12px 16px',
                background: 'rgba(200,146,42,0.05)',
                borderRadius: '8px',
                marginBottom: '12px',
                borderLeft: '2px solid rgba(200,146,42,0.25)',
              }}>
                {pendingMsg}
              </div>
            )}

            {/* Back button — visible for 4s after send */}
            {backVisible && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <button
                  onClick={handleBack}
                  style={{
                    ...sc, fontSize: '13px', letterSpacing: '0.14em',
                    color: '#A8721A', background: 'rgba(200,146,42,0.05)',
                    border: '1px solid rgba(200,146,42,0.35)',
                    borderRadius: '40px', padding: '6px 16px',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(200,146,42,0.65)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(200,146,42,0.35)'}
                >
                  ← Back
                </button>
                <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
                  Sending in a moment…
                </span>
              </div>
            )}

            {/* Input — hidden during Back window and when thinking */}
            {!backVisible && !thinking && !showReveal && !readyToLock && (
              <div className="input-area" id="pp-input-area" style={{ marginBottom: 0 }}>
                <textarea ref={textareaRef} value={input}
                  onChange={e => { setInput(e.target.value); resizeTextarea() }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  onFocus={() => { setTimeout(() => document.getElementById('pp-input-area')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300) }}
                  placeholder={PLACEHOLDERS[stage] || 'Type your answer…'}
                  rows={1} disabled={thinking || !!pendingMsg}
                />
                <button className="btn-send" onClick={send} disabled={!input.trim() || thinking || !!pendingMsg}>Send</button>
              </div>
            )}

            {/* Thinking state */}
            {thinking && (
              <div style={{ paddingTop: '4px' }}>
                <ThinkingDots />
              </div>
            )}
          </div>
        )}

        {/* Confirmation + full chat thread for non-question stages */}
        {!activeQuestionStage && (
          <>
            <div className="chat-thread" style={{ marginBottom: '16px' }}>
              {messages.map(m => {
                if (m.type === 'user')      return <div key={m.id} className="bubble bubble-user">{m.content}</div>
                if (m.type === 'assistant') return <div key={m.id} className="bubble bubble-assistant">{m.content}</div>
                if (m.type === 'html')      return <div key={m.id} className="bubble bubble-assistant" dangerouslySetInnerHTML={{ __html: m.content }} />
                if (m.type === 'label')     return <div key={m.id} style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', padding: '8px 0 4px' }}>{m.content}</div>
                return null
              })}
              {thinking && <ThinkingDots />}
              <div ref={bottomRef} />
            </div>
            {!showReveal && !readyToLock && (
              <div className="input-area" id="pp-input-area">
                <textarea ref={textareaRef} value={input}
                  onChange={e => { setInput(e.target.value); resizeTextarea() }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={PLACEHOLDERS[stage] || 'Type your answer\u2026'}
                  rows={1} disabled={thinking}
                />
                <button className="btn-send" onClick={send} disabled={!input.trim() || thinking}>Send</button>
              </div>
            )}
          </>
        )}

        {/* Lock confirmation */}
        {readyToLock && (
          <div ref={lockBtnRef} style={{ marginBottom: '14px' }}>
            <button onClick={handleLock} style={{ ...btnStyle, background: 'rgba(200,146,42,0.08)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              Yes, lock it in {'\u2192'}
            </button>
          </div>
        )}


      </div>
    )
  }

  const discSize = isMobile ? 320 : 200

  return (
    <AccessGate productKey="purpose_piece" toolName="Purpose Piece">
    <div className="page-shell">
      <Nav activePath="life-os" />
      {!user && <AuthModal />}
      {user && showWelcome === true && <WelcomeModal onBegin={async () => {
        if (user?.id) {
          try {
            const { data: ex, error: exErr } = await supabase.from('purpose_piece_results').select('id').eq('user_id', user.id).limit(1).maybeSingle()
            if (!exErr && ex?.id) {
              await supabase.from('purpose_piece_results').update({ status: 'started', updated_at: new Date().toISOString() }).eq('id', ex.id)
            } else {
              await supabase.from('purpose_piece_results').insert({ user_id: user.id, status: 'started', updated_at: new Date().toISOString() })
            }
          } catch {}
        }
        setShowWelcome(false)
      }} />}
      {showDeepGate && <DeepGateModal onUnlock={() => { localStorage.setItem('pp_deep_unlocked','true'); setShowDeepGate(false); navigate('/tools/purpose-piece/deep') }} onDismiss={() => setShowDeepGate(false)} />}
      {showCentreModal && (
        <CentreModal
          wedgeStates={wedgeStates}
          onClose={() => setShowCentreModal(false)}
          onGoToStage={key => { handleWedgeClick(key) }}
        />
      )}
      <ArchetypeReferencePanel />
      <CivilisationalFramePanel />

      <style>{`
        @media (max-width: 640px) {
          .tool-wrap { padding-left: 24px !important; padding-right: 24px !important; }
          .input-area { flex-direction: column; }
          .input-area textarea, .btn-send { width: 100%; box-sizing: border-box; }
          .pp-breadcrumb-label { font-size: 15px !important; }
        }
        @keyframes ppFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ppDot { 0%,80%,100%{opacity:0.25;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
        @keyframes ppWedgePop { 0%{opacity:1;transform:scale(1)} 40%{opacity:0.85;transform:scale(1.06)} 100%{opacity:1;transform:scale(1)} }
        .pp-wedge-pop { animation: ppWedgePop 0.55s cubic-bezier(0.16,1,0.3,1) both; }
        .pp-fade-up { animation: ppFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div className="tool-wrap">

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <span className="tool-eyebrow">Horizon Suite {'\u00b7'} Purpose Piece</span>
          <h1 style={{ ...sc, fontSize: 'clamp(26px,6vw,34px)', fontWeight: 400, color: '#0F1523', lineHeight: 1.05, margin: '8px 0 10px' }}>
            {showReveal ? 'Your Purpose Piece' : 'Find your fit.'}
          </h1>
          {!showReveal && !session && (
            <p style={{ ...body, fontSize: '1.1875rem', ...muted, lineHeight: 1.7, maxWidth: '440px' }}>
              Something in you already knows what you’re built for. This finds it, and puts language to it.
            </p>
          )}
        </div>

        {/* Layout */}
        {isMobile ? (
          <div>
            {/* Mobile: disc large, centred, bleeds sides, sits below heading */}
            <div style={{ position: 'relative', height: '280px', marginBottom: '0px' }}>
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '-20px', width: `${discSize}px`, zIndex: 0, pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto' }}>
                  <PurposeDisc
                    wedgeStates={wedgeStates} activeStage={breadcrumb}
                    onWedgeClick={handleWedgeClick} onDiscClick={handleCentreClick}
                    allDone={allWedgesDone} size={discSize}
                  />
                </div>
              </div>
            </div>

            {/* Mobile prev/next — below wheel, centered */}
            {breadcrumb && !showReveal && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
                <button onClick={() => handleWedgeNav('prev')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: 0.5 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
                  <svg width="22" height="22" viewBox="0 0 18 18" fill="none"><polyline points="12,2 4,9 12,16" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button onClick={() => handleWedgeNav('next')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: 0.5 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
                  <svg width="22" height="22" viewBox="0 0 18 18" fill="none"><polyline points="6,2 14,9 6,16" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            )}

            {/* Content — padded to clear DOMAINS panel */}
            <div style={{ paddingLeft: '40px' }}>
              {renderContent()}
            </div>
          </div>
        ) : (
          <div>
            {/* Disc is 440px. 3/4 = 330px visible above card top.
                Disc container top: 0. Card marginTop: 330px.
                Disc right-bleeds off canvas like MapWheel. */}
            <div style={{ position: 'relative', minHeight: '300px' }}>

              {/* Disc — 3/4 above card top */}
              <div style={{
                position: 'absolute', right: '-360px', top: '-300px',
                width: '520px', height: '520px', zIndex: 0, pointerEvents: 'none',
              }}>
                <div style={{ pointerEvents: 'auto', width: '100%' }}>
                  <PurposeDisc
                    wedgeStates={wedgeStates} activeStage={breadcrumb}
                    onWedgeClick={handleWedgeClick} onDiscClick={handleCentreClick}
                    allDone={allWedgesDone} size={440}
                  />
                </div>
              </div>

              {/* Content card — top of card at 3/4 of disc height (330px) */}
              <div style={{
                position: 'relative', zIndex: 1,
                marginTop: '330px',
                background: '#FAFAF7',
                border: '1.5px solid rgba(200,146,42,0.22)',
                borderRadius: '14px', padding: '28px 32px',
                maxWidth: '560px',
              }}>
                {/* Prev / Next — inside card, top right */}
                {breadcrumb && !showReveal && (
                  <div style={{
                    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px',
                    float: 'right', marginTop: '-4px', marginRight: '-8px',
                  }}>
                    <button onClick={() => handleWedgeNav('prev')} title="Previous"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', opacity: 0.4, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <polyline points="12,2 4,9 12,16" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button onClick={() => handleWedgeNav('next')} title="Next"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', opacity: 0.4, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <polyline points="6,2 14,9 6,16" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )}
                {renderContent()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </AccessGate>
  )
}

// ─── Deep Dive Page (unchanged architecture) ──────────────────────────────────

export function PurposePieceDeepPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [messages,      setMessages]      = useState([])
  const [input,         setInput]         = useState('')
  const [thinking,      setThinking]      = useState(false)
  const [session,       setSession]       = useState(null)
  const [progressPct,   setProgressPct]   = useState(20)
  const [progressLabel, setProgressLabel] = useState('Deep Conversation')
  const [complete,      setComplete]      = useState(false)
  const [firstLook,     setFirstLook]     = useState(null)
  const [noFirstLook,   setNoFirstLook]   = useState(false)

  const bottomRef   = useRef(null)
  const sessionRef  = useRef(null)
  const startedRef  = useRef(false)
  const textareaRef = useRef(null)

  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, thinking])
  useEffect(() => { if (!authLoading && !user) navigate(`/login?redirect=${encodeURIComponent(window.location.href)}`) }, [authLoading, user])

  useEffect(() => {
    if (authLoading || !user || startedRef.current) return
    startedRef.current = true
    try {
      const raw = sessionStorage.getItem('pp_first_look')
      if (raw) {
        const fl = JSON.parse(raw)
        if (fl.archetype) { setFirstLook(fl); startDeep(fl); return }
      }
    } catch {}
    setNoFirstLook(true)
  }, [authLoading, user])

  async function startDeep(fl) {
    addMsg('label', 'The tension')
    try { const d = await deepCall([], fl, true); handleResponse(d) }
    catch { addMsg('assistant', 'Something went wrong. Please refresh.') }
  }

  async function deepCall(msgs, fl = null, isFirst = false) {
    const body = { messages: msgs, session: sessionRef.current, ...(isFirst && fl ? { firstLook: fl } : {}) }
    const res  = await fetch('/tools/purpose-piece/api/chat-deep', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, userId: user?.id })
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }

  function handleResponse(data) {
    if (data.session) setSession(data.session)
    const pm = { shadow:{pct:40,label:'Deep Conversation'}, mirror:{pct:80,label:'The Full Picture'}, complete:{pct:100,label:'Deep Experience'} }
    if (data.phase) {
      const p = pm[data.phase] || { pct: 20, label: 'Deep Conversation' }
      setProgressPct(p.pct); setProgressLabel(p.label)
      if (data.phase === 'mirror') addMsg('label', 'The full picture')
    }
    if (data.message) {
      if (data.complete && data.message.includes('profile-card')) addMsg('html', data.message)
      else if (data.phase === 'mirror') addMsg('deep-opening', data.message)
      else addMsg('assistant', data.message)
    }
    if (data.autoAdvance) {
      setTimeout(async () => {
        setThinking(true)
        try { const d = await deepCall([]); setThinking(false); handleResponse(d) } catch { setThinking(false) }
      }, data.advanceDelay || 500)
      return
    }
    if (data.complete) setComplete(true)
  }

  function addMsg(type, content) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), type, content }])
  }

  async function send() {
    const text = input.trim(); if (!text || thinking || complete) return
    addMsg('user', text); setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setThinking(true)
    const [d] = await Promise.allSettled([
      deepCall([{ role: 'user', content: text }]),
      new Promise(r => setTimeout(r, 800))
    ])
    setThinking(false)
    if (d.status === 'fulfilled') {
      handleResponse(d.value)
    } else {
      addMsg('assistant', 'Lost my thread for a second — still with you. What were you saying?')
    }
  }

  if (authLoading) return <div className="loading" />

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />
      <div className="tool-wrap">

        <div style={{ marginBottom: '32px' }}>
          <span className="tool-eyebrow">Horizon Suite {'\u00b7'} Purpose Piece</span>
          <h1 style={{ ...sc, fontSize: 'clamp(26px,6vw,34px)', fontWeight: 400, color: '#0F1523', lineHeight: 1.05, margin: '8px 0 0' }}>
            The Deep Dive
          </h1>
          {firstLook && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {[
                { v: firstLook.archetype, c: '#A8721A', bg: 'rgba(200,146,42,0.05)',  b: 'rgba(200,146,42,0.22)'  },
                { v: firstLook.domain,    c: '#1E4D38', bg: 'rgba(45,106,79,0.07)',   b: 'rgba(45,106,79,0.22)'   },
                { v: firstLook.scale,     c: '#1E3550', bg: 'rgba(45,74,106,0.07)',   b: 'rgba(45,74,106,0.22)'   },
              ].filter(x => x.v).map(x => (
                <span key={x.v} style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: x.c, background: x.bg, border: `1px solid ${x.b}`, borderRadius: '20px', padding: '4px 12px' }}>
                  {x.v}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '28px' }}>
          <div style={{ height: '2px', background: 'rgba(200,146,42,0.08)', borderRadius: '1px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: '#C8922A', transition: 'width 0.7s ease', borderRadius: '1px' }} />
          </div>
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase' }}>{progressLabel}</div>
        </div>

        {noFirstLook && (
          <div>
            <div className="bubble bubble-assistant">The Deep Dive begins after the First Look. Complete Purpose Piece first, then return here.</div>
            <button onClick={() => navigate('/tools/purpose-piece')} style={{ marginTop: '16px', background: 'none', border: 'none', ...body, fontSize: '1.1875rem', ...gold, cursor: 'pointer', padding: 0 }}>
              {'\u2190'} Start the First Look
            </button>
          </div>
        )}

        <div className="chat-thread">
          {messages.map(m => {
            if (m.type === 'label')        return <div key={m.id} style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', padding: '8px 0 4px' }}>{m.content}</div>
            if (m.type === 'user')         return <div key={m.id} className="bubble bubble-user">{m.content}</div>
            if (m.type === 'html')         return <div key={m.id} className="bubble bubble-assistant" dangerouslySetInnerHTML={{ __html: m.content }} />
            if (m.type === 'deep-opening') return <div key={m.id} style={{ maxWidth:'92%', padding:'24px 28px', borderRadius:'10px', background:'#FFFFFF', border:'1px solid rgba(200,146,42,0.2)', borderLeft:'3px solid rgba(200,146,42,0.55)', ...body, fontSize:'1.05rem', lineHeight:1.9, ...meta }}>{m.content}</div>
            return <div key={m.id} className="bubble bubble-assistant">{m.content}</div>
          })}
          {thinking && <ThinkingDots />}
          <div ref={bottomRef} />
        </div>

        {complete && (
          <div style={{ textAlign: 'center', padding: '32px 0 80px' }}>
            <button onClick={() => navigate('/tools/purpose-piece')} style={{ background: 'none', border: 'none', ...gold, cursor: 'pointer', ...body, fontSize: '1.125rem' }}>
              {'\u2190'} Return to Purpose Piece
            </button>
          </div>
        )}

        {!complete && !noFirstLook && (
          <div className="input-area">
            <textarea ref={textareaRef} value={input}
              onChange={e => { setInput(e.target.value); if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px` } }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Respond here\u2026" rows={1} disabled={thinking}
            />
            <button className="btn-send" onClick={send} disabled={!input.trim() || thinking}>Send</button>
          </div>
        )}
      </div>
    </div>
  )
}
