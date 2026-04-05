import { useState, useRef, useEffect } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { AccessGate } from '../../components/AccessGate'
import { supabase } from '../../hooks/useSupabase'
import { SprintPanel } from '../../components/SprintPanel'
import { ScalePanel } from '../../components/ScalePanel'

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAINS = [
  { id: 'path',          label: 'Path',          question: 'Am I walking my path — or just walking?',                  description: 'Your calling, contribution & the work you’re here to do' },
  { id: 'spark',         label: 'Spark',         question: 'Is the fire on?',                                               description: 'The animating fire — aliveness, joy, play & the godspark' },
  { id: 'body',          label: 'Body',          question: 'How is this living system doing?',                              description: 'Physical vitality, health, energy & embodiment' },
  { id: 'finances',      label: 'Finances',      question: 'Do I have the agency to act on what matters?',                 description: 'Your relationship with money, resources & abundance' },
  { id: 'relationships', label: 'Relationships', question: 'Am I truly known by anyone?',                                  description: 'Intimacy, friendship, community & belonging' },
  { id: 'inner_game',    label: 'Inner Game',    question: 'Are my stories tending me, or running me?',                    description: 'Your relationship with yourself — beliefs, values & self-trust' },
  { id: 'outer_game',    label: 'Outer Game',    question: 'Is what I’m broadcasting aligned with who I actually am?', description: 'How you show up in the world — presence, expression & identity' },
]

const TIER = {
  10:'World-Class', 9.5:'Exemplar+', 9:'Exemplar', 8.5:'Fluent+', 8:'Fluent',
  7.5:'Capable+', 7:'Capable', 6.5:'Functional+', 6:'Functional', 5.5:'Plateau+',
  5:'Threshold', 4.5:'Friction+', 4:'Friction', 3.5:'Strain+', 3:'Strain',
  2.5:'Crisis+', 2:'Crisis', 1.5:'Emergency+', 1:'Emergency', 0:'Ground Zero',
}

function getTierLabel(n) { return TIER[n] || TIER[Math.round(n)] || '' }

function getColor(n) {
  if (n >= 9)   return '#3B6B9E'
  if (n >= 7)   return '#5A8AB8'
  if (n >= 5)   return '#8A8070'
  if (n >= 3)   return '#C8922A'
  return '#8A3030'
}

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold  = { color: "#A8721A" }
const muted = { color: "rgba(15,21,35,0.72)" }
const meta  = { color: "rgba(15,21,35,0.78)" }

// ─── Shared components ────────────────────────────────────────────────────────

function Eyebrow({ children }) {
  return <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>{children}</span>
}
function Rule() {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.2)', margin: '20px 0' }} />
}
function Btn({ onClick, disabled, children, ghost, style = {} }) {
  const base = ghost
    ? { ...serif, fontSize: '1.125rem', fontStyle: 'italic', ...muted, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0' }
    : { ...sc, fontSize: '1.3125rem', letterSpacing: '0.14em', color: '#FFFFFF', background: '#C8922A', border: '1px solid rgba(168,114,26,0.8)', borderRadius: '40px', padding: '12px 28px', cursor: 'pointer', transition: 'all 0.2s' }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...base, opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
      onMouseEnter={e => { if (!ghost && !disabled) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' } }}
      onMouseLeave={e => { if (!ghost && !disabled) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' } }}
    >
      {children}
    </button>
  )
}

function AuthModal() {
  const r = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '40px 32px 32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <span style={{ display: 'block', ...sc, fontSize: '15px', letterSpacing: '0.22em', ...gold, textTransform: 'uppercase', marginBottom: '14px' }}>Target Sprint</span>
        <h2 style={{ ...sc, fontSize: '1.625rem', fontWeight: 400, color: '#0F1523', marginBottom: '10px' }}>Sign in to begin.</h2>
        <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', ...meta, lineHeight: 1.7, marginBottom: '24px' }}>Your goals and milestones are saved to your profile.</p>
        <a href={`/login?redirect=${r}`} style={{ display: 'block', padding: '14px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '1.3125rem', letterSpacing: '0.14em', textDecoration: 'none' }}>
          Sign in or create account {'→'}
        </a>
      </div>
    </div>
  )
}

// ─── Three-layer wheel ────────────────────────────────────────────────────────

function SprintWheel({ currentScores, sprintScores = {}, horizonScores = {}, size = 260, selectedDomains = [] }) {
  const domains = selectedDomains.length > 0 ? DOMAINS.filter(d => selectedDomains.includes(d.id)) : DOMAINS
  const cx = size / 2, cy = size / 2, maxR = (size / 2) * 0.68, n = domains.length

  function pt(i, v) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (Math.min(v ?? 0, 10) / 10) * maxR
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  const currentPts = domains.map((d, i) => pt(i, currentScores[d.id] ?? 0).join(',')).join(' ')
  const sprintPts  = domains.map((d, i) => pt(i, sprintScores[d.id] ?? currentScores[d.id] ?? 0).join(',')).join(' ')
  const horizonPts = domains.map((d, i) => pt(i, horizonScores[d.id] ?? 10).join(',')).join(' ')
  const hasSprint  = Object.keys(sprintScores).length > 0
  const hasHorizon = Object.keys(horizonScores).length > 0

  const labels = domains.map((d, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const x = cx + (maxR + 22) * Math.cos(a)
    const y = cy + (maxR + 22) * Math.sin(a)
    const s = currentScores[d.id]
    return (
      <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Cormorant SC',Georgia,serif" fontSize="13" fontWeight="600" letterSpacing="1"
        fill={s !== undefined ? getColor(s) : 'rgba(15,21,35,0.28)'}>
        {d.label.toUpperCase()}
      </text>
    )
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[2,4,6,8,10].map(v => {
          const pts = domains.map((_,i) => pt(i,v).join(',')).join(' ')
          return <polygon key={v} points={pts} fill="none" stroke="rgba(200,146,42,0.10)" strokeWidth="1" />
        })}
        {domains.map((_,i) => { const [x,y]=pt(i,10); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(200,146,42,0.12)" strokeWidth="1" /> })}
        {hasHorizon && <polygon points={horizonPts} fill="rgba(200,146,42,0.04)" stroke="rgba(200,146,42,0.20)" strokeWidth="1" strokeDasharray="3 4" />}
        {hasSprint && <polygon points={sprintPts} fill="rgba(90,138,184,0.08)" stroke="rgba(90,138,184,0.45)" strokeWidth="1.5" strokeDasharray="4 3" />}
        <polygon points={currentPts} fill="rgba(200,146,42,0.12)" stroke="rgba(200,146,42,0.78)" strokeWidth="1.5" />
        {labels}
      </svg>
      {(hasSprint || hasHorizon) && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '2px', background: 'rgba(200,146,42,0.78)', borderRadius: '1px' }} />
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', ...muted }}>Now</span>
          </div>
          {hasSprint && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '0', borderTop: '2px dashed rgba(90,138,184,0.7)' }} />
              <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', ...muted }}>Sprint target</span>
            </div>
          )}
          {hasHorizon && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '0', borderTop: '2px dashed rgba(200,146,42,0.4)' }} />
              <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', ...muted }}>Horizon</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Phase: Select ────────────────────────────────────────────────────────────

function PhaseSelect({ hasMapData, scores, horizonScores, selectedDomains, setSelectedDomains, recommendation, onContinue }) {
  return (
    <div>
      <Eyebrow>Target Sprint</Eyebrow>
      <h1 style={{ ...sc, fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, marginBottom: '12px' }}>
        Three areas. Three months.
      </h1>
      <Rule />
      <p style={{ ...serif, fontSize: '1.3125rem', fontWeight: 300, fontStyle: 'italic', color: '#0F1523', lineHeight: 1.8, marginBottom: '6px' }}>
        {hasMapData
          ? 'Your Map scores are loaded.'
          : 'Choose the three areas where focused effort this quarter would matter most.'}
      </p>
      <p style={{ ...serif, fontSize: '1.125rem', fontWeight: 300, ...muted, lineHeight: 1.75, marginBottom: '20px' }}>
        {hasMapData
          ? 'The ☆ shows where the AI sees the most leverage right now. You have the final say.'
          : 'Trust your instinct. The right three will feel obvious.'}
      </p>

      {recommendation?.soft_observation && (
        <div style={{ padding: '12px 16px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', ...serif, fontSize: '1.125rem', fontStyle: 'italic', ...meta, marginBottom: '20px', lineHeight: 1.65 }}>
          {recommendation.soft_observation}
        </div>
      )}

      {hasMapData && Object.keys(scores).length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div className="tg-wheel-wrap"><SprintWheel currentScores={scores} horizonScores={horizonScores} size={240} /></div>
        </div>
      )}

      <div className="tg-domain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '10px', marginBottom: '24px' }}>
        {DOMAINS.map(d => {
          const sel = selectedDomains.includes(d.id)
          const isRec = recommendation?.recommended?.includes(d.id)
          const rat = recommendation?.rationale?.[d.id]
          const s = scores[d.id]
          const dis = !sel && selectedDomains.length >= 3
          const col = s !== undefined ? getColor(s) : null
          return (
            <div key={d.id}
              onClick={() => { if (dis) return; setSelectedDomains(p => p.includes(d.id) ? p.filter(x => x !== d.id) : [...p, d.id]) }}
              style={{ padding: '14px', border: `1.5px solid ${sel ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.2)'}`, borderRadius: '10px', background: sel ? 'rgba(200,146,42,0.06)' : '#FFFFFF', cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.45 : 1, transition: 'all 0.2s' }}
              onMouseEnter={e => { if (!dis) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.06)' } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              <div style={{ ...sc, fontSize: '1.25rem', letterSpacing: '0.08em', color: sel ? '#A8721A' : '#0F1523', marginBottom: '4px' }}>
                {d.label}{isRec ? ' ☆' : ''}
              </div>
              <div style={{ ...serif, fontSize: '1.25rem', fontStyle: 'italic', ...muted, lineHeight: 1.55, marginBottom: s !== undefined ? '10px' : 0 }}>
                {rat || d.question}
              </div>
              {s !== undefined && (
                <>
                  <div style={{ height: '3px', background: 'rgba(200,146,42,0.12)', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
                    <div style={{ height: '100%', width: `${s * 10}%`, background: col, borderRadius: '2px' }} />
                  </div>
                  <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em', color: col }}>{s} {'·'} {getTierLabel(s)}</div>
                </>
              )}
            </div>
          )
        })}
      </div>
      <Btn onClick={onContinue} disabled={selectedDomains.length !== 3}>Set my sprint {'→'}</Btn>
    </div>
  )
}

// ─── Phase: Quarter ───────────────────────────────────────────────────────────

function PhaseQuarter({ quarterType, setQuarterType, setTargetDate, setEndDateLabel, onContinue }) {
  const today = new Date(), month = today.getMonth()
  const rolling = new Date(today); rolling.setDate(rolling.getDate() + 90)
  let qEnd
  if (month < 3) qEnd = new Date(today.getFullYear(), 2, 31)
  else if (month < 6) qEnd = new Date(today.getFullYear(), 5, 30)
  else if (month < 9) qEnd = new Date(today.getFullYear(), 8, 30)
  else qEnd = new Date(today.getFullYear(), 11, 31)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const qL = month < 3 ? 'Q1' : month < 6 ? 'Q2' : month < 9 ? 'Q3' : 'Q4'
  const calDays = Math.round((qEnd - today) / (1000 * 60 * 60 * 24))

  function select(t) {
    setQuarterType(t)
    if (t === 'rolling') { setTargetDate(rolling.toISOString().slice(0, 10)); setEndDateLabel(`90 days — ${fmt(rolling)}`) }
    else { setTargetDate(qEnd.toISOString().slice(0, 10)); setEndDateLabel(`${qL} end — ${fmt(qEnd)} (${calDays} days)`) }
  }

  return (
    <div>
      <Eyebrow>Target Sprint {'·'} Timeline</Eyebrow>
      <h2 style={{ ...sc, fontSize: '1.5rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.15, marginBottom: '12px' }}>When does this sprint end?</h2>
      <Rule />
      <p style={{ ...serif, fontSize: '1.25rem', ...meta, lineHeight: 1.75, marginBottom: '16px' }}>Both work. Choose the rhythm that fits your life.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { type: 'rolling', title: 'Rolling 90 days', date: fmt(rolling), desc: 'Starts today. 90 days of focused movement.' },
          { type: 'calendar', title: 'Calendar quarter', date: fmt(qEnd), desc: `${qL} end — syncs with how the year flows.` },
        ].map(o => (
          <div key={o.type} onClick={() => select(o.type)}
            style={{ padding: '20px 22px', border: `1.5px solid ${quarterType === o.type ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.2)'}`, borderRadius: '10px', background: quarterType === o.type ? 'rgba(200,146,42,0.06)' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ ...sc, fontSize: '1.3125rem', letterSpacing: '0.08em', color: quarterType === o.type ? '#A8721A' : '#0F1523', marginBottom: '4px' }}>{o.title}</div>
            <div style={{ ...sc, fontSize: '1.25rem', ...gold, marginBottom: '4px' }}>{o.date}</div>
            <div style={{ ...serif, fontSize: '1.3125rem', fontStyle: 'italic', ...muted }}>{o.desc}</div>
          </div>
        ))}
      </div>
      <Btn onClick={onContinue} disabled={!quarterType}>Lock this in {'→'}</Btn>
    </div>
  )
}

// ─── Phase: Refine ────────────────────────────────────────────────────────────

function PhaseRefine({ domain, hasMapData, scores, mapData, endDateLabel, completedDomains, onGoalSaved }) {
  const [msgs, setMsgs]       = useState([])
  const [input, setInput]     = useState('')
  const [thinking, setThinking] = useState(false)
  const [liveScore, setLiveScore] = useState(null)
  const startedRef = useRef(false)
  const bottomRef  = useRef(null)
  const taRef      = useRef(null)
  const domainObj  = DOMAINS.find(d => d.id === domain)
  const currentScore = scores[domain]
  const col = currentScore !== undefined ? getColor(currentScore) : '#A8721A'

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [msgs, thinking])
  useEffect(() => { if (startedRef.current) return; startedRef.current = true; start() }, [])

  async function call(m) {
    const mapDomainData = mapData?.domainData?.[domain]
    const res = await fetch('/tools/target-goals/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'refine', domain, hasMapData,
        currentScore,
        horizonGoal:    mapDomainData?.horizonText    || mapDomainData?.horizonGoal    || null,
        tenOutOfTen:    mapDomainData?.avatar         || mapDomainData?.tenOutOfTen    || null,
        horizonCurrent: mapDomainData?.currentReality || mapDomainData?.horizonCurrent || null,
        horizonGap:     mapDomainData?.evidence       || mapDomainData?.horizonGap     || null,
        targetDate: endDateLabel,
        messages: m,
        completedDomains,
      })
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
    } catch {
      setThinking(false)
      setMsgs([{ role: 'assistant', content: 'Something went wrong. Please refresh and try again.' }])
    }
  }

  async function send() {
    const text = input.trim(); if (!text || thinking) return
    const next = [...msgs, { role: 'user', content: text }]
    setMsgs(next); setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
    setThinking(true)
    try {
      const d = await call(next.filter(m => m.role === 'user' || m.role === 'assistant'))
      setThinking(false)
      if (d.complete && d.data) {
        if (d.data.sprint_score) setLiveScore(d.data.sprint_score)
        onGoalSaved(domain, d.data)
      } else if (d.message) {
        // Extract sprint score hint if AI names it
        const scoreMatch = d.message.match(/\b([5-9](?:\.[05])?)\s*(?:\/10)?(?:\s*[-—]\s*(?:World|Exemplar|Fluent|Capable|Functional|Threshold))/i)
        if (scoreMatch) setLiveScore(parseFloat(scoreMatch[1]))
        setMsgs(p => [...p, { role: 'assistant', content: d.message }])
      }
    } catch {
      setThinking(false)
      setMsgs(p => [...p, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
  }

  const doneCards = completedDomains.map(cd => {
    const dl = DOMAINS.find(x => x.id === cd.domain)
    return (
      <div key={cd.domain} style={{ padding: '12px 14px', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', marginBottom: '10px', opacity: 0.75 }}>
        <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', ...gold, marginBottom: '4px' }}>{dl?.label} {'✓'}</div>
        <div style={{ ...serif, fontSize: '1.3125rem', ...meta, lineHeight: 1.55 }}>{cd.outcome_system}</div>
        {cd.identity_statement && (
          <div style={{ ...serif, fontSize: '1.25rem', fontStyle: 'italic', ...muted, marginTop: '4px', lineHeight: 1.5 }}>
            {'“'}{cd.identity_statement}{'”'}
          </div>
        )}
      </div>
    )
  })

  return (
    <div>
      {doneCards}

      {/* Domain header */}
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderLeft: `3px solid ${col}`, borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <Eyebrow>{domainObj?.label} {'·'} {completedDomains.length + 1} of {completedDomains.length + 1}</Eyebrow>
            <h2 style={{ ...sc, fontSize: '1.625rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.15, margin: 0 }}>
              Building your {domainObj?.label} goal.
            </h2>
          </div>
          {/* Live sprint score indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            {currentScore !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', ...muted }}>NOW</span>
                <span style={{ ...sc, fontSize: '1.25rem', fontWeight: 600, color: col }}>{currentScore}</span>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.06em', color: col }}>{getTierLabel(currentScore)}</span>
              </div>
            )}
            {liveScore && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: 'rgba(90,138,184,0.8)' }}>SPRINT TARGET</span>
                <span style={{ ...sc, fontSize: '1.25rem', fontWeight: 600, color: 'rgba(90,138,184,0.9)' }}>{liveScore}</span>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.06em', color: 'rgba(90,138,184,0.9)' }}>{getTierLabel(liveScore)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Path B context — shown only when no Map data */}
        {!hasMapData && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(200,146,42,0.12)' }}>
            <p style={{ ...serif, fontSize: '1.125rem', ...meta, lineHeight: 1.75, marginBottom: '8px' }}>
              The conversation below will cover three things before building your goal:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { n: '1', t: '10/10', d: 'Who is your version of best in the world here? Someone outside yourself — real, imagined, a composite.' },
                { n: '2', t: 'Honest now', d: 'Where are you honestly against that picture? A number, and what’s actually true.' },
                { n: '3', t: 'The wish', d: 'If a genie granted your wish in this area — what would it be? Not the responsible answer.' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ ...sc, fontSize: '15px', ...gold, flexShrink: 0, paddingTop: '1px' }}>{s.n}.</span>
                  <div>
                    <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.06em', color: '#0F1523' }}>{s.t}</span>
                    <span style={{ ...serif, fontSize: '1.3125rem', ...muted }}> {'—'} {s.d}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="chat-thread" style={{ marginBottom: '16px' }}>
        {msgs.map((m, i) => <div key={i} className={`bubble bubble-${m.role}`}>{m.content}</div>)}
        {thinking && <div className="bubble bubble-assistant"><div className="typing-indicator"><span /><span /><span /></div></div>}
        <div ref={bottomRef} />
      </div>
      <div className="input-area">
        <textarea ref={taRef} value={input}
          onChange={e => { setInput(e.target.value); if (taRef.current) { taRef.current.style.height = 'auto'; taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 140)}px` } }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={'Write your response here…'} rows={3} disabled={thinking}
        />
        <button className="btn-send" onClick={send} disabled={!input.trim() || thinking}>Send</button>
      </div>
    </div>
  )
}

// ─── Phase: Complete ──────────────────────────────────────────────────────────

function PhaseComplete({ completedDomains, scores, sprintScores, horizonScores, endDateLabel, targetDate, hasMapData, selectedDomains }) {
  const [calType, setCalType]   = useState('google')
  const [editOpen, setEditOpen] = useState({})
  const [editText, setEditText] = useState({})

  function fmtDate(d) { return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}` }
  function calLink(type, e) {
    const dt = fmtDate(e.date), ti = encodeURIComponent(`Target Sprint: ${e.label}`), tx = encodeURIComponent(e.text || '')
    if (type === 'google') return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${ti}&dates=${dt}/${dt}&details=${tx}`
    if (type === 'apple')  return `webcal://calendar.apple.com/calendar/event?title=${ti}&start-date=${dt}&notes=${tx}`
    return `https://tasks.google.com/tasks/v1/lists/@default/tasks?title=${ti}&notes=${tx}&due=${e.date.toISOString()}`
  }

  const calEvents = targetDate ? completedDomains.flatMap(d => {
    const dl = DOMAINS.find(x => x.id === d.domain)?.label || d.domain
    const base = new Date(targetDate)
    const m1 = new Date(base); m1.setDate(m1.getDate() - 60)
    const m2 = new Date(base); m2.setDate(m2.getDate() - 30)
    return [
      { label: `${dl} — Month 1`, text: d.month1, date: m1 },
      { label: `${dl} — Month 2`, text: d.month2, date: m2 },
      { label: `${dl} — Month 3`, text: d.month3, date: new Date(base) },
    ]
  }) : []

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px', padding: '28px 0' }}>
        <div style={{ ...sc, fontSize: '1.5rem', ...gold, marginBottom: '8px' }}>{'✦'}</div>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Sprint set</span>
        <h1 style={{ ...sc, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, marginBottom: '12px' }}>{endDateLabel || '90 days ahead'}</h1>
        <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', ...meta, lineHeight: 1.75, maxWidth: '480px', margin: '0 auto' }}>
          The goal is not the point {'—'} what you become moving toward it is.
        </p>
      </div>

      {/* Wheel */}
      {hasMapData && Object.keys(scores).length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div className="tg-wheel-wrap"><SprintWheel currentScores={scores} sprintScores={sprintScores} horizonScores={horizonScores} size={260} selectedDomains={selectedDomains} /></div>
        </div>
      )}

      {/* Goal cards */}
      {completedDomains.map(d => {
        const dl = DOMAINS.find(x => x.id === d.domain)
        const outcome = editText[d.domain] !== undefined ? editText[d.domain] : (d.outcome_user || d.outcome_system)
        const s = scores[d.domain]
        const col = s !== undefined ? getColor(s) : '#A8721A'
        return (
          <div key={d.domain} className="tg-goal-card" style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '14px', padding: '22px 24px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(15,21,35,0.04)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(200,146,42,0.12)' }}>
              <div>
                <div style={{ ...sc, fontSize: '1.3125rem', letterSpacing: '0.1em', color: col }}>{dl?.label}</div>
                {s !== undefined && d.sprint_score !== undefined && (
                  <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', ...muted, marginTop: '3px' }}>
                    {s} {'→'} {d.sprint_score} {'·'} {getTierLabel(d.sprint_score)}
                  </div>
                )}
              </div>
              {d.identity_statement && (
                <div style={{ ...serif, fontSize: '1.25rem', fontStyle: 'italic', ...muted, textAlign: 'right', maxWidth: '55%', lineHeight: 1.45 }}>
                  {'“'}{d.identity_statement}{'”'}
                </div>
              )}
            </div>

            {/* Goal */}
            <p style={{ ...serif, fontSize: '1.3125rem', ...meta, lineHeight: 1.75, marginBottom: '16px' }}>{outcome}</p>

            {/* Monthly milestones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '16px' }}>
              {[
                { l: 'Month 1', t: d.month1, w: d.month1_why },
                { l: 'Month 2', t: d.month2, w: d.month2_why },
                { l: 'Month 3', t: d.month3, w: d.month3_why },
              ].map(m => (
                <div key={m.l} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderTop: '1px solid rgba(200,146,42,0.08)' }}>
                  <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', ...gold, flexShrink: 0, paddingTop: '3px', width: '52px' }}>{m.l}</span>
                  <div>
                    <div style={{ ...serif, fontSize: '1.125rem', ...meta, lineHeight: 1.6 }}>{m.t}</div>
                    {m.w && <div style={{ ...serif, fontSize: '1.25rem', fontStyle: 'italic', ...muted, lineHeight: 1.55, marginTop: '2px' }}>{m.w}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Week breakdown */}
            {d.weeks?.length > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.12)', borderRadius: '8px' }}>
                <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, marginBottom: '10px' }}>Week by Week {'·'} Month 1</div>
                {d.weeks.map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: i < d.weeks.length - 1 ? '6px' : 0 }}>
                    <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em', ...muted, flexShrink: 0, paddingTop: '2px', width: '40px' }}>Wk {i + 1}</span>
                    <span style={{ ...serif, fontSize: '1.3125rem', ...meta, lineHeight: 1.55 }}>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* T.E.A. */}
            {d.tea && (
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.15)', marginBottom: '14px' }}>
                <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, marginBottom: '10px' }}>Daily T.E.A.</div>
                {[{ k: 'Thoughts', v: d.tea.thoughts }, { k: 'Emotions', v: d.tea.emotions }, { k: 'Actions', v: d.tea.actions }].map(t => (
                  <div key={t.k} style={{ display: 'flex', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em', ...muted, flexShrink: 0, paddingTop: '2px', width: '58px' }}>{t.k}</span>
                    <span style={{ ...serif, fontSize: '1.3125rem', ...meta, lineHeight: 1.55 }}>{t.v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Edit */}
            <button onClick={() => setEditOpen(p => ({ ...p, [d.domain]: !p[d.domain] }))}
              style={{ ...serif, fontSize: '1.3125rem', fontStyle: 'italic', ...gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {editOpen[d.domain] ? 'Close ↑' : 'Edit this goal →'}
            </button>
            {editOpen[d.domain] && (
              <div style={{ marginTop: '12px' }}>
                <textarea
                  style={{ width: '100%', padding: '12px 14px', ...serif, fontSize: '1.125rem', ...meta, background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', outline: 'none', resize: 'vertical', lineHeight: 1.65, minHeight: '72px', marginBottom: '8px' }}
                  value={editText[d.domain] ?? (d.outcome_user || d.outcome_system)}
                  onChange={e => setEditText(p => ({ ...p, [d.domain]: e.target.value }))}
                  placeholder="Write your own version..."
                />
                <Btn onClick={() => setEditOpen(p => ({ ...p, [d.domain]: false }))} style={{ padding: '10px 20px', fontSize: '1.25rem' }}>
                  Save my version {'→'}
                </Btn>
              </div>
            )}
          </div>
        )
      })}

      {/* Calendar export */}
      {calEvents.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '14px', padding: '22px 24px', marginBottom: '20px' }}>
          <div style={{ ...sc, fontSize: '1.3125rem', letterSpacing: '0.1em', ...gold, marginBottom: '6px' }}>Add milestones to your system</div>
          <p style={{ ...serif, fontSize: '1.125rem', ...meta, lineHeight: 1.65, marginBottom: '16px' }}>
            Each milestone opens pre-filled. Add to your calendar and tasks list.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {[{ key: 'google', label: 'Google Calendar' }, { key: 'apple', label: 'Apple Calendar' }, { key: 'gtasks', label: 'Google Tasks' }].map(t => (
              <button key={t.key} onClick={() => setCalType(t.key)}
                style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', padding: '6px 14px', borderRadius: '20px', border: `1px solid ${calType === t.key ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.2)'}`, background: calType === t.key ? 'rgba(200,146,42,0.08)' : 'transparent', color: calType === t.key ? '#A8721A' : 'rgba(15,21,35,0.72)', cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {calEvents.map((e, i) => (
              <a key={i} href={calLink(calType, e)} target="_blank" rel="noopener"
                style={{ ...serif, fontSize: '1.3125rem', ...gold, padding: '8px 12px', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '6px', textDecoration: 'none', display: 'block', transition: 'all 0.15s' }}
                onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(200,146,42,0.04)'; ev.currentTarget.style.borderColor = 'rgba(200,146,42,0.45)' }}
                onMouseLeave={ev => { ev.currentTarget.style.background = ''; ev.currentTarget.style.borderColor = 'rgba(200,146,42,0.2)' }}>
                {e.label} {'→'}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Path B nudge */}
      {!hasMapData && (
        <div style={{ padding: '20px 22px', background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '14px', marginBottom: '20px' }}>
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', ...gold, marginBottom: '8px' }}>Want the full picture?</div>
          <p style={{ ...serif, fontSize: '1.125rem', ...meta, lineHeight: 1.7, marginBottom: '14px' }}>
            The Map gives you an honest read across all seven domains {'—'} and loads your scores directly into your next sprint.
          </p>
          <a href="/tools/map" style={{ ...sc, fontSize: '1.25rem', letterSpacing: '0.12em', color: '#FFFFFF', textDecoration: 'none', border: '1px solid rgba(168,114,26,0.8)', borderRadius: '40px', padding: '10px 22px', display: 'inline-block', background: '#C8922A' }}>
            Begin The Map {'→'}
          </a>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <a href="/profile" style={{ ...sc, fontSize: '1.3125rem', letterSpacing: '0.14em', color: '#FFFFFF', background: '#C8922A', border: '1px solid rgba(168,114,26,0.8)', borderRadius: '40px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }}>
          Go to your profile {'→'}
        </a>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TargetGoalsPage() {
  const { user, loading: authLoading } = useAuth()
  const { tier, loading: accessLoading } = useAccess('target_goals')
  const [phase, setPhase]                         = useState('select')
  const [hasMapData, setHasMapData]               = useState(false)
  const [mapData, setMapData]                     = useState(null)
  const [scores, setScores]                       = useState({})
  const [horizonScores, setHorizonScores]         = useState({})
  const [selectedDomains, setSelectedDomains]     = useState([])
  const [quarterType, setQuarterType]             = useState(null)
  const [targetDate, setTargetDate]               = useState(null)
  const [endDateLabel, setEndDateLabel]           = useState(null)
  const [completedDomains, setCompletedDomains]   = useState([])
  const [sprintScores, setSprintScores]           = useState({})
  const [recommendation, setRecommendation]       = useState(null)
  const [sessionId, setSessionId]                 = useState(null)
  const [currentRefineIndex, setCurrentRefineIndex] = useState(0)
  const loadedRef = useRef(false)

  useEffect(() => { if (!user || loadedRef.current) return; loadedRef.current = true; loadMapData() }, [user])

  async function loadMapData() {
    try {
      const { data } = await supabase
        .from('map_results')
        .select('session, completed_at')
        .eq('user_id', user.id)
        .eq('complete', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data?.session?.domainData) {
        setMapData(data.session)
        setHasMapData(true)
        const s = {}, h = {}
        Object.entries(data.session.domainData).forEach(([id, d]) => {
          if (d?.currentScore !== undefined) s[id] = d.currentScore
          else if (d?.score !== undefined) s[id] = d.score
          if (d?.horizonScore !== undefined) h[id] = d.horizonScore
        })
        setScores(s)
        setHorizonScores(h)
        getRecommendation(s, true)
      }
    } catch {}
  }

  async function getRecommendation(s, hmd = false) {
    if (!s || Object.keys(s).length === 0) return
    try {
      const res = await fetch('/tools/target-goals/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'recommend', scores: s, hasMapData: hmd })
      })
      const data = await res.json()
      if (data?.recommended) setRecommendation(data)
    } catch {}
  }

  function handleGoalSaved(domainId, goalData) {
    const goal = {
      domain: domainId,
      outcome_system: goalData.outcome_system,
      outcome_user: null,
      sprint_score: goalData.sprint_score,
      horizon_goal: goalData.horizon_goal,
      identity_statement: goalData.identity_statement,
      month3: goalData.month3, month3_why: goalData.month3_why || null,
      month2: goalData.month2, month2_why: goalData.month2_why || null,
      month1: goalData.month1, month1_why: goalData.month1_why || null,
      weeks: goalData.weeks || [],
      tea: goalData.tea,
      conversation_insight: goalData.conversation_insight,
    }
    if (goalData.sprint_score !== undefined) setSprintScores(p => ({ ...p, [domainId]: goalData.sprint_score }))
    const next = [...completedDomains, goal]
    setCompletedDomains(next)
    const nextIndex = currentRefineIndex + 1
    if (nextIndex < selectedDomains.length) {
      setCurrentRefineIndex(nextIndex)
      setPhase('refine_' + nextIndex)
    } else {
      setPhase('complete')
      saveToSupabase(next)
    }
  }

  async function saveToSupabase(goals) {
    if (!user?.id) return
    try {
      const sd = {
        user_id: user.id, domains: selectedDomains, quarter_type: quarterType,
        target_date: targetDate, end_date_label: endDateLabel,
        goals: goals || completedDomains, scores_at_start: scores,
        sprint_scores: sprintScores, horizon_scores: horizonScores,
        has_map_data: hasMapData, status: 'active',
        completed_at: new Date().toISOString()
      }
      if (sessionId) {
        await supabase.from('target_goal_sessions').update({ goals: goals || completedDomains, updated_at: new Date().toISOString() }).eq('id', sessionId)
      } else {
        const { data } = await supabase.from('target_goal_sessions').insert(sd).select('id').single()
        if (data?.id) setSessionId(data.id)
      }
    } catch {}
  }

  if (authLoading || accessLoading) return <div className="loading" />

  if (tier !== 'full' && tier !== 'beta') {
    return <AccessGate productKey="target_goals" toolName="Target Sprint">{null}</AccessGate>
  }

  const curPhase = phase.startsWith('refine') ? 'refine' : phase
  const currentDomain = selectedDomains[currentRefineIndex]

  return (
    <div className="page-shell">
      <style>{`
        @media (max-width: 640px) {
          .tool-wrap { padding-left: 24px; padding-right: 24px; }
          .tg-wheel-wrap { overflow: hidden; max-width: 300px; margin: 0 auto; }
          .tg-domain-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important; }
          .tg-goal-card { padding: 18px !important; }
          .input-area { flex-direction: column; }
          .input-area textarea, .btn-send { width: 100%; box-sizing: border-box; }
        }
      `}</style>
      <Nav activePath="life-os" />
      <SprintPanel />
      <ScalePanel side="right" />
      {!user && <AuthModal />}
      <div className="tool-wrap">
        {curPhase === 'select' && (
          <PhaseSelect
            hasMapData={hasMapData} scores={scores} horizonScores={horizonScores}
            selectedDomains={selectedDomains} setSelectedDomains={setSelectedDomains}
            recommendation={recommendation} onContinue={() => setPhase('quarter')}
          />
        )}
        {curPhase === 'quarter' && (
          <PhaseQuarter quarterType={quarterType} setQuarterType={setQuarterType}
            setTargetDate={setTargetDate} setEndDateLabel={setEndDateLabel}
            onContinue={() => { setCurrentRefineIndex(0); setPhase('refine_0') }}
          />
        )}
        {curPhase === 'refine' && currentDomain && (
          <PhaseRefine key={phase} domain={currentDomain} hasMapData={hasMapData}
            scores={scores} mapData={mapData} endDateLabel={endDateLabel}
            completedDomains={completedDomains} onGoalSaved={handleGoalSaved}
          />
        )}
        {curPhase === 'complete' && (
          <PhaseComplete completedDomains={completedDomains} scores={scores}
            sprintScores={sprintScores} horizonScores={horizonScores}
            endDateLabel={endDateLabel} targetDate={targetDate}
            hasMapData={hasMapData} selectedDomains={selectedDomains}
          />
        )}
      </div>
    </div>
  )
}
