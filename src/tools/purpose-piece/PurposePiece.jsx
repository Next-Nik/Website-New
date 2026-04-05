import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { AccessGate } from '../../components/AccessGate'
import { supabase } from '../../hooks/useSupabase'
import { ArchetypeReferencePanel } from '../../components/ArchetypeReferencePanel'
import { CivilisationalFramePanel } from '../../components/CivilisationalFramePanel'

// ─── Constants ────────────────────────────────────────────────────────────────

const SS_KEY = 'pp_session_v2'

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
  scale:     ['The Scene', 'The Responsibility'],
}
const STAGE_TOTALS = { archetype: 5, domain: 3, scale: 2 }

const PLACEHOLDERS = {
  archetype:    'Tell me what happened\u2026',
  domain:       'Tell me what you see\u2026',
  scale:        'Describe the scene\u2026',
  confirmation: 'Tell me what lands and what doesn\u2019t\u2026',
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold  = { color: '#A8721A' }
const muted = { color: 'rgba(15,21,35,0.5)' }
const meta  = { color: 'rgba(15,21,35,0.78)' }

const btnStyle = {
  ...sc, fontSize: '0.875rem', letterSpacing: '0.14em', color: '#A8721A',
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
// Three 120° wedges. Same navigation role as MapWheel.
// wedgeStates: { archetype: 0|1|2, domain: 0|1|2, scale: 0|1|2 }
// 0=empty, 1=active/pulsing, 2=complete/filled
// allDone: glows, entire disc is clickable to open output

function PurposeDisc({ wedgeStates, activeStage, onWedgeClick, onDiscClick, allDone = false, size = 200 }) {
  const R   = size * 0.44
  const r   = size * 0.058
  const cx  = size / 2
  const cy  = size / 2
  const GAP = 2.8

  function wedgePath(idx) {
    const s = (-90 + idx * 120 + GAP) * Math.PI / 180
    const e = (-90 + idx * 120 + 120 - GAP) * Math.PI / 180
    const x1 = cx + R * Math.cos(s), y1 = cy + R * Math.sin(s)
    const x2 = cx + R * Math.cos(e), y2 = cy + R * Math.sin(e)
    const xi1 = cx + r * Math.cos(s), yi1 = cy + r * Math.sin(s)
    const xi2 = cx + r * Math.cos(e), yi2 = cy + r * Math.sin(e)
    return `M ${xi1} ${yi1} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 0 0 ${xi1} ${yi1} Z`
  }

  function wedgeIconPos(idx) {
    const mid = (-90 + idx * 120 + 60) * Math.PI / 180
    const mr  = (R + r) / 2 + size * 0.018
    return { x: cx + mr * Math.cos(mid), y: cy + mr * Math.sin(mid) }
  }

  const rimR = R + size * 0.038

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

      {/* Tick marks */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30) * Math.PI / 180
        return <line key={i}
          x1={cx + (R + size * 0.015) * Math.cos(a)} y1={cy + (R + size * 0.015) * Math.sin(a)}
          x2={cx + rimR * Math.cos(a)}                y2={cy + rimR * Math.sin(a)}
          stroke="rgba(200,146,42,0.4)" strokeWidth="0.8"
        />
      })}

      {/* Three wedges */}
      {WEDGE_KEYS.map((key, i) => {
        const st       = wedgeStates[key] || 0
        const w        = WEDGE[key]
        const isActive = activeStage === key
        const isDone   = st === 2
        const fill     = isDone ? w.fill : isActive ? w.fillActive : '#FAFAF7'
        const stroke   = isDone || isActive ? w.stroke : w.strokeWeak
        const pos      = wedgeIconPos(i)
        const canClick = isDone

        return (
          <g key={key}
            onClick={canClick && !allDone ? (e) => { e.stopPropagation(); onWedgeClick(key) } : undefined}
            style={{ cursor: canClick && !allDone ? 'pointer' : 'default' }}
            className={isActive && !isDone ? 'pp-pulse' : ''}
          >
            <path d={wedgePath(i)} fill={fill} stroke={stroke}
              strokeWidth={isDone || isActive ? 1.5 : 1}
              style={{ transition: 'fill 0.5s cubic-bezier(0.16,1,0.3,1), stroke 0.3s' }}
            />
            <text x={pos.x} y={pos.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={isDone ? size * 0.075 : size * 0.058}
              fontFamily="'Cormorant SC', Georgia, serif"
              fill={isDone ? '#FFFFFF' : isActive ? w.stroke.replace('0.85','1') : 'rgba(200,146,42,0.22)'}
              style={{ pointerEvents: 'none', userSelect: 'none', transition: 'all 0.3s' }}
            >
              {isDone ? '\u2713' : key.charAt(0).toUpperCase()}
            </text>
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
    { key: 'archetype',    label: 'Archetype'    },
    { key: 'domain',       label: 'Domain'       },
    { key: 'scale',        label: 'Scale'        },
    { key: 'confirmation', label: 'Confirmation' },
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
              ...sc, fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase',
              color: isCurrent ? '#A8721A' : isPast ? 'rgba(200,146,42,0.5)' : 'rgba(200,146,42,0.2)',
              whiteSpace: 'nowrap', paddingRight: i < stages.length - 1 ? '8px' : '0',
              flexShrink: 0,
            }}>
              {s.label}
            </span>
            {i < stages.length - 1 && (
              <div style={{
                flex: 1, height: '1px', marginRight: '8px',
                background: isPast ? 'rgba(200,146,42,0.38)' : 'rgba(200,146,42,0.1)',
                transition: 'background 0.5s', minWidth: '8px',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Question label ───────────────────────────────────────────────────────────

function QuestionLabel({ stage, index, total, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
      <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: '#A8721A', textTransform: 'uppercase' }}>
        {stage.charAt(0).toUpperCase() + stage.slice(1)}
      </span>
      <span style={{ ...sc, fontSize: '11px', color: 'rgba(200,146,42,0.3)' }}>{'\u00b7'}</span>
      <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(200,146,42,0.5)' }}>
        {index + 1} of {total}
      </span>
      {label && (
        <>
          <span style={{ ...sc, fontSize: '11px', color: 'rgba(200,146,42,0.3)' }}>{'\u00b7'}</span>
          <span style={{ ...serif, fontSize: '13px', fontStyle: 'italic', color: 'rgba(15,21,35,0.4)' }}>{label}</span>
        </>
      )}
    </div>
  )
}

// ─── Reference triggers ───────────────────────────────────────────────────────

function ReferenceTrigger({ stage, onOpenArchetypes, onOpenDomains }) {
  if (stage === 'archetype') return (
    <button onClick={onOpenArchetypes} style={{
      background: 'none', border: 'none', ...sc, fontSize: '11px', letterSpacing: '0.14em',
      color: 'rgba(200,146,42,0.5)', cursor: 'pointer', padding: 0,
      textTransform: 'uppercase', textDecoration: 'underline',
      textDecorationColor: 'rgba(200,146,42,0.2)', marginBottom: '18px',
      display: 'block', transition: 'color 0.2s',
    }}>
      Nine Archetypes {'\u2192'}
    </button>
  )
  if (stage === 'domain') return (
    <button onClick={onOpenDomains} style={{
      background: 'none', border: 'none', ...sc, fontSize: '11px', letterSpacing: '0.14em',
      color: 'rgba(45,106,79,0.6)', cursor: 'pointer', padding: 0,
      textTransform: 'uppercase', textDecoration: 'underline',
      textDecorationColor: 'rgba(45,106,79,0.2)', marginBottom: '18px',
      display: 'block', transition: 'color 0.2s',
    }}>
      Seven Domains {'\u2192'}
    </button>
  )
  return null
}

// ─── Stage transition ─────────────────────────────────────────────────────────

function StageTransition({ nextStage, onContinue }) {
  const content = {
    domain: {
      eyebrow: 'Archetype \u2713',
      heading: 'One coordinate found.',
      body:    'Now a different kind of question. The last set was about what you do. This one is about what pulls your attention \u2014 even when you have no reason to care.',
      cta:     'Find your domain \u2192',
    },
    scale: {
      eyebrow: 'Domain \u2713',
      heading: 'Two coordinates found.',
      body:    'Last set. These questions are almost philosophical. Take your time with them.',
      cta:     'Find your scale \u2192',
    },
    confirmation: {
      eyebrow: 'Scale \u2713',
      heading: 'All three found.',
      body:    'Before anything locks, let\u2019s make sure what emerged actually fits.',
      cta:     'Review your coordinates \u2192',
    },
  }

  const c = content[nextStage]
  if (!c) return null

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)',
      borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '12px',
      padding: '28px 24px', animation: 'ppFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase', marginBottom: '10px' }}>
        {c.eyebrow}
      </div>
      <h3 style={{ ...sc, fontSize: '1.25rem', fontWeight: 400, color: '#0F1523', marginBottom: '10px' }}>
        {c.heading}
      </h3>
      <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, lineHeight: 1.75, marginBottom: '24px' }}>
        {c.body}
      </p>
      <button onClick={onContinue} style={btnStyle}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
        {c.cta}
      </button>
    </div>
  )
}

// ─── ThinkingDots ────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="bubble bubble-assistant">
      <div className="typing-indicator"><span /><span /><span /></div>
    </div>
  )
}

// ─── Auth modal ───────────────────────────────────────────────────────────────

function AuthModal() {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '44px 36px 36px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <span style={{ display: 'block', ...sc, fontSize: '13px', letterSpacing: '0.22em', ...gold, textTransform: 'uppercase', marginBottom: '14px' }}>Purpose Piece</span>
        <h2 style={{ ...sc, fontSize: '1.5rem', fontWeight: 400, color: '#0F1523', marginBottom: '10px', lineHeight: 1.1 }}>Sign in to begin.</h2>
        <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...meta, lineHeight: 1.7, marginBottom: '28px' }}>
          Your Purpose Piece saves to your profile and carries across the ecosystem.
        </p>
        <a href={`/login?redirect=${returnUrl}`} style={{ display: 'block', padding: '15px 24px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: '#A8721A', ...sc, fontSize: '0.875rem', letterSpacing: '0.14em', textDecoration: 'none' }}>
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
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '16px' }}>Go Deeper</div>
        <h2 style={{ ...sc, fontSize: '1.5rem', fontWeight: 400, color: '#0F1523', marginBottom: '14px', lineHeight: 1.15 }}>
          The tension. The shadow.<br />The full picture.
        </h2>
        <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...meta, lineHeight: 1.8, marginBottom: '28px' }}>
          The First Look gave you the shape. The Deep Dive is a real conversation {'\u2014'} into what this costs you at the bone, where the instinct breaks, and what it{'\u2019'}s been asking of you.
        </p>
        <button onClick={onUnlock} style={{ ...btnStyle, display: 'block', width: '100%', textAlign: 'center', marginBottom: '12px' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
          Unlock the Deep Dive
        </button>
        <button onClick={onDismiss} style={{ display: 'block', width: '100%', background: 'none', border: 'none', ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, cursor: 'pointer', padding: '8px' }}>
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

  const [session,       setSession]       = useState(null)
  const [messages,      setMessages]      = useState([])
  const [input,         setInput]         = useState('')
  const [thinking,      setThinking]      = useState(false)
  const [stageComplete, setStageComplete] = useState(false)
  const [showReveal,    setShowReveal]    = useState(false)
  const [readyToLock,   setReadyToLock]   = useState(false)
  const [showDeepGate,  setShowDeepGate]  = useState(false)
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

  // Restore or start session
  useEffect(() => {
    if (!user || startedRef.current) return
    startedRef.current = true
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.session && saved.session.status !== 'complete') {
          setSession(saved.session)
          setMessages(saved.messages || [])
          return
        }
      }
    } catch {}
    startTool()
  }, [user])

  // Persist to sessionStorage
  useEffect(() => {
    if (!session) return
    try { sessionStorage.setItem(SS_KEY, JSON.stringify({ session, messages })) } catch {}
  }, [session, messages])

  // Derived
  const stage = session?.stage || 'welcome'
  const qIdx  = session?.questionIndex ?? 0

  const wedgeStates = {
    archetype: (session?.archetypeTranscript?.length ?? 0) >= 5 ? 2
             : stage === 'archetype' ? 1 : 0,
    domain:    (session?.domainTranscript?.length ?? 0) >= 3 ? 2
             : stage === 'domain' ? 1 : 0,
    scale:     (session?.scaleTranscript?.length ?? 0) >= 2 ? 2
             : stage === 'scale' ? 1 : 0,
  }

  const allWedgesDone = WEDGE_KEYS.every(k => wedgeStates[k] === 2)
  const breadcrumb    = ['archetype','domain','scale','confirmation'].includes(stage) ? stage : null

  // API
  async function callAPI(msgs) {
    const res = await fetch('/tools/purpose-piece/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, session: sessionRef.current })
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }

  async function startTool() {
    setThinking(true)
    try { const d = await callAPI([]); setThinking(false); handleResponse(d) }
    catch { setThinking(false); addMsg('assistant', 'Something went wrong. Please refresh.') }
  }

  function handleResponse(data) {
    if (data.session) setSession(data.session)

    // Complete output is HTML — inject directly, not as escaped text
    if (data.message) {
      if (data.isHtml) addMsg('html', data.message)
      else addMsg('assistant', data.message)
    }

    // Stage complete — show transition, hold next question
    if (data.stageComplete) {
      setStageComplete(true)
      return
    }

    // Synthesis auto-advance to framing
    if (data.stage === 'synthesis') {
      setTimeout(async () => {
        setThinking(true)
        try { const d = await callAPI([]); setThinking(false); handleResponse(d) } catch { setThinking(false) }
      }, data.advanceDelay || 6000)
      return
    }

    // Auto-advance (welcome, stage openings)
    if (data.autoAdvance) {
      setTimeout(async () => {
        setThinking(true)
        try { const d = await callAPI([]); setThinking(false); handleResponse(d) } catch { setThinking(false) }
      }, data.advanceDelay || 2000)
      return
    }

    // Server signals AI is ready to lock — show explicit button.
    // handleLock sends a canonical message so server doesn't also try
    // to infer lock intent from freetext (avoids dual-path conflict).
    if (data.readyToLock) setReadyToLock(true)

    if (data.complete) {
      setShowReveal(true)
      // Save profile
      if (user?.id && data.profile) {
        supabase.from('purpose_piece_results').upsert({
          user_id: user.id, profile: data.profile, session: data.session,
          completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }).catch(() => {})
      }
      // Save for Deep Dive
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
    }
  }

  function addMsg(type, content) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), type, content }])
  }

  function resizeTextarea() {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
  }

  async function send() {
    const text = input.trim()
    if (!text || thinking || showReveal) return
    addMsg('user', text)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setThinking(true)
    try { const d = await callAPI([{ role: 'user', content: text }]); setThinking(false); handleResponse(d) }
    catch { setThinking(false); addMsg('assistant', 'Something went wrong. Please try again.') }
  }

  async function handleLock() {
    setReadyToLock(false)
    setThinking(true)
    try { const d = await callAPI([{ role: 'user', content: 'Yes, lock it in.' }]); setThinking(false); handleResponse(d) }
    catch { setThinking(false); addMsg('assistant', 'Something went wrong. Please try again.') }
  }

  async function continueToNextStage() {
    setStageComplete(false)
    setThinking(true)
    try { const d = await callAPI([]); setThinking(false); handleResponse(d) }
    catch { setThinking(false); addMsg('assistant', 'Something went wrong. Please try again.') }
  }

  function goDeeper() {
    const unlocked = localStorage.getItem('pp_deep_unlocked') === 'true'
    if (!unlocked) { setShowDeepGate(true); return }
    navigate('/tools/purpose-piece/deep')
  }

  if (authLoading || accessLoading) return <div className="loading" />
  if (tier !== 'full' && tier !== 'beta') return <AccessGate productKey="purpose_piece" toolName="Purpose Piece">{null}</AccessGate>

  const nextStageMap = { archetype: 'domain', domain: 'scale', scale: 'confirmation' }
  const currentLabel = STAGE_QUESTION_LABELS[stage]?.[qIdx] || ''
  const stageTotal   = STAGE_TOTALS[stage]

  // ── Content ────────────────────────────────────────────────────────────────
  function renderContent() {
    // Reveal
    if (showReveal) {
      const outputMsg = messages.slice().reverse().find(m => m.type === 'html')
      return (
        <div className="pp-fade-up">
          {outputMsg
            ? <div dangerouslySetInnerHTML={{ __html: outputMsg.content }} />
            : <div style={{ ...serif, fontSize: '1rem', ...muted, fontStyle: 'italic' }}>Building your Purpose Piece…</div>
          }
          <div style={{ marginTop: '24px', textAlign: 'center', paddingBottom: '40px' }}>
            <button onClick={goDeeper} style={btnStyle}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              Go deeper {'\u2192'}
            </button>
          </div>
        </div>
      )
    }

    // Stage transition
    const activeQuestionStage = ['archetype','domain','scale'].includes(stage) ? stage : null
    if (stageComplete && activeQuestionStage) {
      return <StageTransition nextStage={nextStageMap[activeQuestionStage]} onContinue={continueToNextStage} />
    }

    return (
      <div>
        {/* Question label */}
        {activeQuestionStage && stageTotal && (
          <QuestionLabel stage={activeQuestionStage} index={qIdx} total={stageTotal} label={currentLabel} />
        )}

        {/* Reference trigger */}
        {activeQuestionStage && (
          <ReferenceTrigger stage={activeQuestionStage}
            onOpenArchetypes={openArchetypePanel}
            onOpenDomains={openDomainPanel}
          />
        )}

        {/* Confirmation label */}
        {stage === 'confirmation' && (
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase', marginBottom: '14px' }}>
            Confirmation
          </div>
        )}

        {/* Chat thread */}
        <div className="chat-thread" style={{ marginBottom: '16px' }}>
          {messages.map(m => {
            if (m.type === 'user')      return <div key={m.id} className="bubble bubble-user">{m.content}</div>
            if (m.type === 'assistant') return <div key={m.id} className="bubble bubble-assistant">{m.content}</div>
            if (m.type === 'html')      return <div key={m.id} className="bubble bubble-assistant" dangerouslySetInnerHTML={{ __html: m.content }} />
            if (m.type === 'label')     return <div key={m.id} style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', padding: '8px 0 4px' }}>{m.content}</div>
            return null
          })}
          {thinking && <ThinkingDots />}
          <div ref={bottomRef} />
        </div>

        {/* Lock confirmation */}
        {readyToLock && (
          <div style={{ marginBottom: '14px' }}>
            <button onClick={handleLock} style={{ ...btnStyle, background: 'rgba(200,146,42,0.1)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              Yes, lock it in {'\u2192'}
            </button>
          </div>
        )}

        {/* Input */}
        {!showReveal && !readyToLock && (
          <div className="input-area">
            <textarea ref={textareaRef} value={input}
              onChange={e => { setInput(e.target.value); resizeTextarea() }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={PLACEHOLDERS[stage] || 'Type your answer\u2026'}
              rows={1} disabled={thinking}
            />
            <button className="btn-send" onClick={send} disabled={!input.trim() || thinking}>Send</button>
          </div>
        )}
      </div>
    )
  }

  const discSize = isMobile ? 140 : 200

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />
      {!user && <AuthModal />}
      {showDeepGate && <DeepGateModal onUnlock={() => { localStorage.setItem('pp_deep_unlocked','true'); setShowDeepGate(false); navigate('/tools/purpose-piece/deep') }} onDismiss={() => setShowDeepGate(false)} />}
      <ArchetypeReferencePanel />
      <CivilisationalFramePanel />

      <style>{`
        @media (max-width: 640px) {
          .tool-wrap { padding-left: 24px !important; padding-right: 24px !important; }
          .input-area { flex-direction: column; }
          .input-area textarea, .btn-send { width: 100%; box-sizing: border-box; }
          .pp-breadcrumb-label { font-size: 10px !important; }
        }
        @keyframes ppFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .pp-fade-up { animation: ppFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div className="tool-wrap">

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <span className="tool-eyebrow">Life OS {'\u00b7'} Purpose Piece</span>
          <h1 style={{ ...sc, fontSize: 'clamp(26px,6vw,34px)', fontWeight: 400, color: '#0F1523', lineHeight: 1.05, margin: '8px 0 10px' }}>
            {showReveal ? 'Your Purpose Piece' : 'Find your fit.'}
          </h1>
          {!showReveal && !session && (
            <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, lineHeight: 1.7, maxWidth: '440px' }}>
              You have a specific role in the future of humanity. Let{'\u2019'}s find it.
            </p>
          )}
        </div>

        {/* Layout */}
        {isMobile ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ width: `${discSize}px` }}>
                <PurposeDisc
                  wedgeStates={wedgeStates} activeStage={breadcrumb}
                  onWedgeClick={() => {}} onDiscClick={() => setShowReveal(true)}
                  allDone={allWedgesDone && showReveal} size={discSize}
                />
              </div>
            </div>
            {breadcrumb && !showReveal && <StageBreadcrumb activeStage={breadcrumb} />}
            {renderContent()}
          </div>
        ) : (
          <div>
            {breadcrumb && !showReveal && <StageBreadcrumb activeStage={breadcrumb} />}
            <div style={{ position: 'relative', minHeight: '300px' }}>

              {/* Disc — large, right-behind, like MapWheel */}
              <div style={{
                position: 'absolute', right: '-80px', top: '-160px',
                width: '480px', height: '480px', zIndex: 0, pointerEvents: 'none',
              }}>
                <div style={{ pointerEvents: 'auto', width: '100%' }}>
                  <PurposeDisc
                    wedgeStates={wedgeStates} activeStage={breadcrumb}
                    onWedgeClick={() => {}} onDiscClick={() => setShowReveal(true)}
                    allDone={allWedgesDone && showReveal} size={440}
                  />
                </div>
              </div>

              {/* Content card — in front of disc */}
              <div style={{
                position: 'relative', zIndex: 1,
                background: '#FAFAF7',
                border: '1.5px solid rgba(200,146,42,0.22)',
                borderRadius: '14px', padding: '28px 32px',
                maxWidth: '560px',
              }}>
                {renderContent()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
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
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
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
    try { const d = await deepCall([{ role: 'user', content: text }]); setThinking(false); handleResponse(d) }
    catch { setThinking(false); addMsg('assistant', 'Something went wrong. Please try again.') }
  }

  if (authLoading) return <div className="loading" />

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />
      <div className="tool-wrap">

        <div style={{ marginBottom: '32px' }}>
          <span className="tool-eyebrow">Life OS {'\u00b7'} Purpose Piece</span>
          <h1 style={{ ...sc, fontSize: 'clamp(26px,6vw,34px)', fontWeight: 400, color: '#0F1523', lineHeight: 1.05, margin: '8px 0 0' }}>
            The Deep Dive
          </h1>
          {firstLook && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {[
                { v: firstLook.archetype, c: '#A8721A', bg: 'rgba(200,146,42,0.07)',  b: 'rgba(200,146,42,0.22)'  },
                { v: firstLook.domain,    c: '#1E4D38', bg: 'rgba(45,106,79,0.07)',   b: 'rgba(45,106,79,0.22)'   },
                { v: firstLook.scale,     c: '#1E3550', bg: 'rgba(45,74,106,0.07)',   b: 'rgba(45,74,106,0.22)'   },
              ].filter(x => x.v).map(x => (
                <span key={x.v} style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: x.c, background: x.bg, border: `1px solid ${x.b}`, borderRadius: '20px', padding: '4px 12px' }}>
                  {x.v}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '28px' }}>
          <div style={{ height: '2px', background: 'rgba(200,146,42,0.1)', borderRadius: '1px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: '#C8922A', transition: 'width 0.7s ease', borderRadius: '1px' }} />
          </div>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase' }}>{progressLabel}</div>
        </div>

        {noFirstLook && (
          <div>
            <div className="bubble bubble-assistant">The Deep Dive begins after the First Look. Complete Purpose Piece first, then return here.</div>
            <button onClick={() => navigate('/tools/purpose-piece')} style={{ marginTop: '16px', background: 'none', border: 'none', ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...gold, cursor: 'pointer', padding: 0 }}>
              {'\u2190'} Start the First Look
            </button>
          </div>
        )}

        <div className="chat-thread">
          {messages.map(m => {
            if (m.type === 'label')        return <div key={m.id} style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', padding: '8px 0 4px' }}>{m.content}</div>
            if (m.type === 'user')         return <div key={m.id} className="bubble bubble-user">{m.content}</div>
            if (m.type === 'html')         return <div key={m.id} className="bubble bubble-assistant" dangerouslySetInnerHTML={{ __html: m.content }} />
            if (m.type === 'deep-opening') return <div key={m.id} style={{ maxWidth:'92%', padding:'24px 28px', borderRadius:'10px', background:'#FFFFFF', border:'1px solid rgba(200,146,42,0.2)', borderLeft:'3px solid rgba(200,146,42,0.55)', ...serif, fontSize:'1.05rem', lineHeight:1.9, ...meta }}>{m.content}</div>
            return <div key={m.id} className="bubble bubble-assistant">{m.content}</div>
          })}
          {thinking && <ThinkingDots />}
          <div ref={bottomRef} />
        </div>

        {complete && (
          <div style={{ textAlign: 'center', padding: '32px 0 80px' }}>
            <button onClick={() => navigate('/tools/purpose-piece')} style={{ background: 'none', border: 'none', ...gold, cursor: 'pointer', ...serif, fontSize: '0.875rem', fontStyle: 'italic' }}>
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
