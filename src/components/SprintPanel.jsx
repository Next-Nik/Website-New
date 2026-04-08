import { useState, useEffect } from 'react'
import { DomainTooltip } from './DomainTooltip'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

const DOMAINS = [
  { id: 'path',          label: 'Path' },
  { id: 'spark',         label: 'Spark' },
  { id: 'body',          label: 'Body' },
  { id: 'finances',      label: 'Finances' },
  { id: 'connection', label: 'Connection' },
  { id: 'inner_game',    label: 'Inner Game' },
  { id: 'signal',    label: 'Signal' },
]

const TIER = { 10:'World-Class',9.5:'Exemplar+',9:'Exemplar',8.5:'Fluent+',8:'Fluent',7.5:'Capable+',7:'Capable',6.5:'Functional+',6:'Functional',5.5:'Plateau+',5:'Threshold',4.5:'Friction+',4:'Friction',3.5:'Strain+',3:'Strain',2.5:'Crisis+',2:'Crisis',1.5:'Emergency+',1:'Emergency',0:'Ground Zero' }

function getColor(n) {
  if (n >= 8)   return '#3B6B9E'
  if (n >= 6.5) return '#5A8AB8'
  if (n >= 5)   return '#8A8070'
  if (n >= 3)   return '#C8922A'
  return '#8A3030'
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function MiniWheel({ domains, currentScores, sprintScores }) {
  const size = 140
  const cx = size / 2, cy = size / 2
  const maxR = (size / 2) * 0.72
  const n = domains.length

  function pt(i, v) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (Math.min(v ?? 0, 10) / 10) * maxR
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  const currentPts = domains.map((d, i) => pt(i, currentScores[d.id] ?? 0).join(',')).join(' ')
  const sprintPts  = domains.map((d, i) => pt(i, sprintScores[d.id] ?? 0).join(',')).join(' ')
  const hasSprint  = Object.values(sprintScores).some(v => v > 0)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      {[2, 4, 6, 8, 10].map(v => {
        const pts = domains.map((_, i) => pt(i, v).join(',')).join(' ')
        return <polygon key={v} points={pts} fill="none" stroke="rgba(200,146,42,0.10)" strokeWidth="1" />
      })}
      {domains.map((_, i) => {
        const [x, y] = pt(i, 10)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(200,146,42,0.10)" strokeWidth="1" />
      })}
      {hasSprint && <polygon points={sprintPts} fill="rgba(90,138,184,0.08)" stroke="rgba(90,138,184,0.4)" strokeWidth="1.5" strokeDasharray="4 3" />}
      <polygon points={currentPts} fill="rgba(200,146,42,0.12)" stroke="rgba(200,146,42,0.72)" strokeWidth="1.5" />
      {domains.map((d, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2
        const r = maxR + 14
        const x = cx + r * Math.cos(a)
        const y = cy + r * Math.sin(a)
        const s = currentScores[d.id]
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontFamily="'Cormorant SC',Georgia,serif" fontSize="21" fontWeight="600" letterSpacing="0.5"
            fill={s !== undefined ? getColor(s) : 'rgba(15,21,35,0.28)'}>
            {d.label.substring(0, 3).toUpperCase()}
          </text>
        )
      })}
    </svg>
  )
}

export function SprintPanel({ context = 'default' }) {
  const [open, setOpen]           = useState(false)
  const [sprint, setSprint]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const { user }                  = useAuth()

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open && user && !sprint) loadSprint()
  }, [open, user])

  async function loadSprint() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('target_goal_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setSprint(data || null)
    } catch {}
    setLoading(false)
  }

  const days = sprint ? daysUntil(sprint.target_date) : null
  const sprintDomains = sprint
    ? DOMAINS.filter(d => sprint.domains?.includes(d.id))
    : []

  const currentScores = sprint?.scores_at_start || {}
  const sprintScores  = sprint?.sprint_scores || {}

  return (
    <>
      {/* Left edge tab */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Target Sprint"
        style={{
          position: 'fixed',
          left: open ? '-60px' : '-14px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1500,
          background: '#FAFAF7',
          border: '1.5px solid rgba(200,146,42,0.78)',
          width: '44px',
          height: '88px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'all 0.25s ease',
          clipPath: 'polygon(0% 12%, 0% 88%, 30% 100%, 100% 100%, 100% 0%, 30% 0%)',
          borderRadius: '0 12px 12px 0',
        }}
      >
        <span style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          ...sc,
          fontSize: '15px',
          letterSpacing: '0.18em',
          color: '#A8721A',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}>
          Sprint
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(15,21,35,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
          }}
        >
          {/* Panel */}
          <div style={{
            width: 'min(440px, 92vw)',
            height: '100%',
            background: '#FAFAF7',
            borderRight: '1.5px solid rgba(200,146,42,0.25)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInLeft 0.25s ease',
          }}>
            {/* Header */}
            <div style={{
              padding: '28px 24px 18px',
              borderBottom: '1px solid rgba(200,146,42,0.15)',
              position: 'sticky', top: 0,
              background: '#FAFAF7', zIndex: 1,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Life OS
                </span>
                <h2 style={{ ...sc, fontSize: '1.125rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.1 }}>
                  Target Sprint
                </h2>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(15,21,35,0.45)', fontSize: '1.25rem', lineHeight: 1, padding: '4px', marginTop: '2px' }}>
                {'\u00D7'}
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '20px 24px 32px' }}>
              {loading && (
                <p style={{ ...serif, fontSize: '1.125rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', textAlign: 'center', paddingTop: '40px' }}>
                  Loading your sprint{'\u2026'}
                </p>
              )}

              {!loading && !sprint && (
                <div style={{ paddingTop: '16px' }}>
                  <p style={{ ...serif, fontSize: '1.25rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '24px' }}>
                    No active sprint yet. Pick three domains, set a 90-day target, and build goals worth moving toward.
                  </p>
                  <a href="/tools/target-goals" style={{
                    display: 'inline-block', padding: '12px 24px',
                    borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)',
                    background: 'rgba(200,146,42,0.05)',
                    ...sc, fontSize: '1.25rem', letterSpacing: '0.12em',
                    color: '#A8721A', textDecoration: 'none',
                  }}>
                    Begin Target Sprint {'\u2192'}
                  </a>

                  <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid rgba(200,146,42,0.12)' }}>
                    <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '12px' }}>
                      How it works
                    </div>
                    {[
                      { n: '1', t: 'Choose three domains', d: 'The areas where focused effort this quarter will unlock movement.' },
                      { n: '2', t: 'Set a 90-day target', d: 'Where do you actually want to be? Realistic, not aspirational.' },
                      { n: '3', t: 'Build the goal', d: 'The AI helps you arrive at something specific, honest, and reachable.' },
                      { n: '4', t: 'Monthly milestones', d: 'Reverse-engineered from your destination. Export to calendar.' },
                    ].map(s => (
                      <div key={s.n} style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                        <span style={{ ...sc, fontSize: '15px', color: '#A8721A', flexShrink: 0, paddingTop: '2px' }}>{s.n}.</span>
                        <div>
                          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.06em', color: '#0F1523', marginBottom: '2px' }}>{s.t}</div>
                          <div style={{ ...serif, fontSize: '1.3125rem', color: 'rgba(15,21,35,0.65)', lineHeight: 1.6 }}>{s.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loading && sprint && (
                <>
                  {/* Countdown */}
                  {days !== null && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(200,146,42,0.12)' }}>
                      <span style={{ ...sc, fontSize: '2rem', fontWeight: 600, color: '#A8721A', lineHeight: 1 }}>{days}</span>
                      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)' }}>days remaining</span>
                      <span style={{ ...serif, fontSize: '1.25rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.4)', marginLeft: 'auto' }}>{sprint.end_date_label?.split('\u2014')[0]?.trim()}</span>
                    </div>
                  )}

                  {/* Mini wheel */}
                  {sprintDomains.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <MiniWheel domains={sprintDomains} currentScores={currentScores} sprintScores={sprintScores} />
                    </div>
                  )}

                  {/* Goals */}
                  <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Active Goals
                  </div>
                  {sprint.goals?.map((g, i) => {
                    const dl = DOMAINS.find(d => d.id === g.domain)
                    const s = currentScores[g.domain]
                    const sp = g.sprint_score
                    const col = s !== undefined ? getColor(s) : 'rgba(200,146,42,0.9)'
                    return (
                      <div key={i} style={{ padding: '14px 16px', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '10px', marginBottom: '10px', background: '#FFFFFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em', color: col, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>{dl?.label}{dl && <DomainTooltip domainKey={dl.id} system="lifeos" position="above" />}</span>
                          {s !== undefined && sp !== undefined && (
                            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.4)' }}>
                              {s} {'\u2192'} {sp} {'\u00B7'} {TIER[sp] || ''}
                            </span>
                          )}
                        </div>
                        <p style={{ ...serif, fontSize: '1.3125rem', color: 'rgba(15,21,35,0.8)', lineHeight: 1.6, marginBottom: g.identity_statement ? '8px' : 0 }}>
                          {g.outcome_user || g.outcome_system}
                        </p>
                        {g.identity_statement && (
                          <p style={{ ...serif, fontSize: '1.25rem', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', lineHeight: 1.55 }}>
                            {'\u201C'}{g.identity_statement}{'\u201D'}
                          </p>
                        )}
                      </div>
                    )
                  })}

                  {/* Current milestone */}
                  {(() => {
                    if (!sprint.target_date || !sprint.goals?.length) return null
                    const base = new Date(sprint.target_date)
                    const now  = new Date()
                    const m1   = new Date(base); m1.setDate(m1.getDate() - 60)
                    const m2   = new Date(base); m2.setDate(m2.getDate() - 30)
                    const label = now < m1 ? 'Month 1' : now < m2 ? 'Month 2' : 'Month 3'
                    const key   = now < m1 ? 'month1' : now < m2 ? 'month2' : 'month3'
                    return (
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(200,146,42,0.12)' }}>
                        <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '12px' }}>
                          {label} {'\u00B7'} Right Now
                        </div>
                        {sprint.goals.map((g, i) => {
                          const dl = DOMAINS.find(d => d.id === g.domain)
                          return g[key] ? (
                            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                              <span style={{ ...sc, fontSize: '15px', color: '#A8721A', flexShrink: 0, paddingTop: '2px', width: '80px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>{dl?.label}{dl && <DomainTooltip domainKey={dl.id} system="lifeos" position="above" />}</span>
                              <span style={{ ...serif, fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.55 }}>{g[key]}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    )
                  })()}

                  {/* Actions */}
                  <div style={{ marginTop: '24px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <a href="/tools/target-goals" style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: '#A8721A', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '9px 18px', textDecoration: 'none', background: 'rgba(200,146,42,0.05)' }}>
                      View full sprint {'\u2192'}
                    </a>
                    <a href="/profile" style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '40px', padding: '9px 18px', textDecoration: 'none' }}>
                      Profile
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Close tab */}
          <button onClick={() => setOpen(false)} style={{
            position: 'fixed',
            left: 'min(440px, 92vw)',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2100,
            background: '#FAFAF7',
            border: '1.5px solid rgba(200,146,42,0.78)',
            borderLeft: 'none',
            width: '44px',
            height: '88px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
            clipPath: 'polygon(28% 12%, 28% 88%, 30% 100%, 100% 100%, 100% 0%, 30% 0%)',
            borderRadius: '0 12px 12px 0',
          }}>
            <span style={{ ...sc, fontSize: '15px', color: '#A8721A' }}>{'\u00D7'}</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}
