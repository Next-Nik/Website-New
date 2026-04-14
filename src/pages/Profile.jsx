import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../hooks/useSupabase'
import { DomainTooltip } from '../components/DomainTooltip'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

const DOMAIN_LABELS = ['Path', 'Spark', 'Body', 'Finances', 'Connection', 'Inner Game', 'Signal']
const DOMAIN_KEYS   = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

const TIER_LABELS = {
  10:'World-Class', 9:'Exemplar', 8:'Fluent', 7:'Capable', 6:'Functional',
  5:'Threshold',    4:'Friction', 3:'Strain', 2:'Crisis',  1:'Emergency', 0:'Ground Zero'
}

function getTierLabel(n) {
  const floor = Math.floor(n)
  return TIER_LABELS[floor] ?? TIER_LABELS[Math.round(n)] ?? ''
}

function getTierColor(n) {
  if (n >= 9) return '#3B6B9E'
  if (n >= 7) return '#5A8AB8'
  if (n >= 5) return '#8A8070'
  if (n >= 3) return '#8A7030'
  return '#8A3030'
}

function Eyebrow({ children, style = {} }) {
  return (
    <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.20em', color: '#A8721A',
      textTransform: 'uppercase', display: 'block', marginBottom: '8px', ...style }}>
      {children}
    </span>
  )
}

function Rule() {
  return <div style={{ height: '1px', background: 'rgba(200,146,42,0.15)', margin: '20px 0' }} />
}

function EmptySlot({ cta, ctaUrl }) {
  return (
    <div style={{ ...serif, fontSize: '15px', fontStyle: 'italic',
      color: 'rgba(15,21,35,0.72)', marginBottom: '8px' }}>
      Not yet started.{' '}
      {cta && ctaUrl && (
        <a href={ctaUrl} style={{ color: '#A8721A', textDecoration: 'none' }}>
          {cta} {'\u2192'}
        </a>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const configs = {
    started:  { label: 'Started',     bg: 'rgba(200,146,42,0.08)', border: 'rgba(200,146,42,0.35)', color: '#A8721A' },
    active:   { label: 'In progress', bg: 'rgba(200,146,42,0.08)', border: 'rgba(200,146,42,0.35)', color: '#A8721A' },
    complete: { label: 'Complete',    bg: 'rgba(45,106,79,0.08)',  border: 'rgba(45,106,79,0.35)',  color: '#2D6A4F' },
  }
  const cfg = configs[status] || configs.started
  return (
    <span style={{
      fontFamily: "'Cormorant SC', Georgia, serif",
      fontSize: '15px', letterSpacing: '0.16em', textTransform: 'uppercase',
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: '40px', padding: '3px 10px',
      display: 'inline-block', marginBottom: '16px',
    }}>
      {cfg.label}
    </span>
  )
}

function Slot({ title, eyebrow, linkLabel, linkUrl, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px',
      marginBottom: '12px', overflow: 'hidden', background: '#FFFFFF' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', cursor: 'pointer',
          background: open ? 'rgba(200,146,42,0.03)' : 'transparent' }}>
        <div>
          {eyebrow && <Eyebrow style={{ marginBottom: '2px' }}>{eyebrow}</Eyebrow>}
          <span style={{ ...sc, fontSize: '16px', letterSpacing: '0.08em',
            color: '#0F1523', fontWeight: 600 }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px',
          flexShrink: 0, marginLeft: '16px' }}>
          {linkLabel && linkUrl && (
            <a href={linkUrl} onClick={e => e.stopPropagation()}
              style={{ ...sc, fontSize: '17px', letterSpacing: '0.12em',
                color: '#A8721A', textDecoration: 'none' }}>
              {linkLabel} {'\u2192'}
            </a>
          )}
          <span style={{ color: '#A8721A', fontSize: '18px', lineHeight: 1,
            transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
            {'\u203A'}
          </span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.15)', padding: '24px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function ScoreBar({ label, score, horizonScore }) {
  const color = getTierColor(score)
  const pct   = (score / 10) * 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px',
      padding: '9px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
      <div style={{ ...sc, fontSize: '17px', letterSpacing: '0.06em',
        color: 'rgba(15,21,35,0.72)', width: '100px', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: '3px',
          background: 'rgba(200,146,42,0.10)', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: '3px',
          background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
        <div style={{ position: 'absolute', left: `calc(${pct}% - 7px)`,
          width: '14px', height: '14px', borderRadius: '50%',
          background: '#FAFAF7', border: `2px solid ${color}`, zIndex: 1 }} />
        {horizonScore !== undefined && (
          <div style={{
            position: 'absolute', left: `calc(${(horizonScore/10)*100}% - 4px)`,
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'transparent', border: `1.5px solid ${color}`, opacity: 0.45,
          }} />
        )}
      </div>
      <div style={{ width: '88px', flexShrink: 0, textAlign: 'right' }}>
        <span style={{ ...sc, fontSize: '1.25rem', fontWeight: 600, color, lineHeight: 1 }}>{score}</span>
        <span style={{ ...serif, fontSize: '17px', color: 'rgba(15,21,35,0.55)' }}>/10</span>
        <div style={{ ...serif, fontSize: '15px', color, marginTop: '1px', opacity: 0.85 }}>
          {getTierLabel(score)}
        </div>
      </div>
    </div>
  )
}

// ─── Map spider web ───────────────────────────────────────────────────────────
function HorizonWheel({ domains, currentScores, horizonScores, size = 340 }) {
  const cx = size / 2, cy = size / 2
  const maxR = (size / 2) * 0.62
  const n = domains.length

  function getTierColor(v) {
    if (v == null) return 'rgba(200,146,42,0.2)'
    if (v >= 8) return '#3B6B9E'
    if (v >= 6.5) return '#5A8AB8'
    if (v >= 5) return '#8A8070'
    if (v >= 3) return '#8A7030'
    return '#8A3030'
  }

  function pt(i, v) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (Math.min(v ?? 0, 10) / 10) * maxR
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  function ptFull(i, scale = 1) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + maxR * scale * Math.cos(a), cy + maxR * scale * Math.sin(a)]
  }

  const currentPts = domains.map((d, i) => pt(i, currentScores[d.id] ?? 0).join(',')).join(' ')
  const horizonPts = domains.map((d, i) => pt(i, horizonScores[d.id] ?? 0).join(',')).join(' ')
  const hasHorizon = Object.values(horizonScores).some(v => v > 0)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>

      {/* Grid rings */}
      {[2, 4, 6, 8, 10].map(v => {
        const pts = domains.map((_, i) => pt(i, v).join(',')).join(' ')
        return <polygon key={v} points={pts} fill="none"
          stroke={v === 5 ? 'rgba(138,48,48,0.2)' : 'rgba(200,146,42,0.08)'}
          strokeWidth={v === 5 ? 1.5 : 0.75}
          strokeDasharray={v === 5 ? '3 3' : 'none'} />
      })}

      {/* Spokes */}
      {domains.map((_, i) => {
        const [x, y] = ptFull(i)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke="rgba(200,146,42,0.07)" strokeWidth="0.75" />
      })}

      {/* Horizon shape */}
      {hasHorizon && (
        <polygon points={horizonPts}
          fill="rgba(90,138,184,0.06)"
          stroke="rgba(90,138,184,0.4)"
          strokeWidth="1.5"
          strokeDasharray="4 3" />
      )}

      {/* Current shape */}
      <polygon points={currentPts}
        fill="rgba(200,146,42,0.10)"
        stroke="rgba(200,146,42,0.65)"
        strokeWidth="1.5"
        strokeLinejoin="round" />

      {/* Score dots */}
      {domains.map((d, i) => {
        const s = currentScores[d.id]
        if (s == null) return null
        const [x, y] = pt(i, s)
        return <circle key={i} cx={x} cy={y} r="4"
          fill={getTierColor(s)}
          stroke="#FAFAF7"
          strokeWidth="1.5" />
      })}

      {/* Domain labels */}
      {domains.map((d, i) => {
        const [lx, ly] = ptFull(i, 1.22)
        const s = currentScores[d.id]
        const color = s != null ? getTierColor(s) : 'rgba(15,21,35,0.3)'
        const anchor = Math.abs(lx - cx) < 10 ? 'middle' : lx < cx ? 'end' : 'start'
        return (
          <g key={i}>
            <text x={lx} y={ly - 5} textAnchor={anchor} dominantBaseline="middle"
              fontFamily="'Cormorant SC', Georgia, serif"
              fontSize="11" fontWeight="600" letterSpacing="0.8"
              fill="rgba(15,21,35,0.72)">
              {d.label}
            </text>
            {s != null && (
              <text x={lx} y={ly + 9} textAnchor={anchor} dominantBaseline="middle"
                fontFamily="'Cormorant Garamond', Georgia, serif"
                fontSize="11" fill={color} opacity="0.9">
                {s}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function MapWeb({ domains, currentScores, horizonScores }) {
  return <HorizonWheel domains={domains} currentScores={currentScores} horizonScores={horizonScores} size={200} />
}


function MapSlot({ mapData, sprintData }) {
  if (!mapData) return <EmptySlot cta="Begin The Map" ctaUrl="/tools/map" />

  if (!mapData.complete) {
    const dd = mapData.session?.domainData ?? {}
    const domainLabels = ['Path','Spark','Body','Finances','Connection','Inner Game','Signal']
    const domainKeys   = ['path','spark','body','finances','connection','inner_game','signal']
    const doneCount = domainKeys.filter(k => {
      const d = dd[k]
      return d?.currentScore !== undefined
    }).length
    const activeDomain = domainKeys.find(k => {
      const d = dd[k]
      return d?.avatarFinal && d?.currentScore === undefined
    })
    const activeDomainLabel = activeDomain ? domainLabels[domainKeys.indexOf(activeDomain)] : null

    return (
      <div>
        <StatusBadge status="active" />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.1em', color: '#0F1523' }}>
            {doneCount} of 7 domains scored
          </span>
          {activeDomainLabel && (
            <span style={{ ...serif, fontSize: '17px', fontStyle: 'italic', color: 'rgba(15,21,35,0.55)' }}>
              Currently: {activeDomainLabel}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {domainKeys.map((k, i) => {
            const d = dd[k]
            const done = d?.currentScore !== undefined
            const inProgress = d?.avatarFinal && !done
            return (
              <span key={k} style={{
                ...sc, fontSize: '15px', letterSpacing: '0.1em',
                padding: '3px 10px', borderRadius: '40px',
                background: done ? 'rgba(45,106,79,0.08)' : inProgress ? 'rgba(200,146,42,0.08)' : 'rgba(15,21,35,0.04)',
                border: `1px solid ${done ? 'rgba(45,106,79,0.35)' : inProgress ? 'rgba(200,146,42,0.35)' : 'rgba(15,21,35,0.12)'}`,
                color: done ? '#2D6A4F' : inProgress ? '#A8721A' : 'rgba(15,21,35,0.4)',
              }}>
                {done ? '✓ ' : ''}{domainLabels[i]}
              </span>
            )
          })}
        </div>
        <a href="/tools/map" style={{ ...sc, fontSize: '17px', letterSpacing: '0.12em',
          color: '#A8721A', textDecoration: 'none' }}>
          Continue The Map {'→'}
        </a>
      </div>
    )
  }

  const dd       = mapData.session?.domainData ?? {}
  const mapMeta  = mapData.map_data ?? {}
  const horizon  = mapData.horizon_goal_user || mapMeta.life_horizon_draft
  const stage    = mapMeta.stage
  const nextStep = mapMeta.next_step
  const overall  = mapMeta.overall_reflection

  const allDomains = DOMAIN_KEYS.map((k, i) => ({
    key: k, label: DOMAIN_LABELS[i],
    score: dd[k]?.currentScore, horizon: dd[k]?.horizonScore,
  }))
  const scores = allDomains.filter(d => d.score !== undefined)

  // System drag: any domain below 5
  const dragDomains = scores.filter(d => d.score < 5)

  // Spider web data
  const currentScores = {}
  const horizonScores = {}
  scores.forEach(d => {
    currentScores[d.key] = d.score
    if (d.horizon !== undefined) horizonScores[d.key] = d.horizon
  })
  const webDomains = DOMAIN_KEYS.map((k, i) => ({ id: k, label: DOMAIN_LABELS[i] }))
  const hasHorizon = Object.values(horizonScores).some(v => v > 0)

  return (
    <div>
      <StatusBadge status="complete" />

      {/* ── Horizon goal — prominent at top ───────────────────────────────── */}
      {horizon && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ ...serif, fontSize: '18px', fontWeight: 300, fontStyle: 'italic',
            color: '#0F1523', lineHeight: 1.75, margin: 0 }}>{horizon}</p>
        </div>
      )}

      {/* ── System drag warning ────────────────────────────────────────────── */}
      {dragDomains.length > 0 && (
        <div style={{ padding: '12px 16px', marginBottom: '20px',
          background: 'rgba(138,48,48,0.04)', border: '1px solid rgba(138,48,48,0.2)',
          borderRadius: '10px' }}>
          {dragDomains.map(d => (
            <div key={d.key} style={{ ...serif, fontSize: '17px', color: '#8A3030',
              lineHeight: 1.6 }}>
              {d.label} ({d.score}) is pulling on everything else.
            </div>
          ))}
        </div>
      )}

      {/* ── Spider web ────────────────────────────────────────────────────── */}
      {scores.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <MapWeb domains={webDomains} currentScores={currentScores}
            horizonScores={horizonScores} />
          {hasHorizon && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '2px', background: 'rgba(200,146,42,0.72)' }} />
                <span style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)', letterSpacing: '0.1em' }}>Now</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '0', borderTop: '2px dashed rgba(90,138,184,0.6)' }} />
                <span style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)', letterSpacing: '0.1em' }}>Horizon</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Domain scores with gap ─────────────────────────────────────────── */}
      {scores.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <Eyebrow>Seven domains</Eyebrow>
          {scores.map(d => (
            <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
              <div style={{ ...sc, fontSize: '17px', letterSpacing: '0.06em',
                color: 'rgba(15,21,35,0.72)', width: '100px', flexShrink: 0 }}>{d.label}</div>
              <div style={{ flex: 1 }}>
                <ScoreBar label="" score={d.score} horizonScore={d.horizon} />
              </div>
              <div style={{ ...sc, fontSize: '17px', flexShrink: 0, minWidth: '70px', textAlign: 'right' }}>
                <span style={{ color: getTierColor(d.score), fontWeight: 600 }}>{d.score}</span>
                {d.horizon !== undefined && (
                  <span style={{ color: 'rgba(90,138,184,0.8)', marginLeft: '4px' }}>
                    → {d.horizon}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Stage + next step ─────────────────────────────────────────────── */}
      {stage && (
        <div style={{ marginBottom: '20px', padding: '14px 18px',
          background: 'rgba(200,146,42,0.04)', borderRadius: '10px',
          border: '1px solid rgba(200,146,42,0.18)' }}>
          <Eyebrow>Developmental stage</Eyebrow>
          <div style={{ ...serif, fontSize: '17px', fontWeight: 300, color: '#0F1523' }}>{stage}</div>
          {nextStep && (
            <div style={{ ...serif, fontSize: '15px', fontStyle: 'italic',
              color: 'rgba(15,21,35,0.72)', marginTop: '6px', lineHeight: 1.6 }}>{nextStep}</div>
          )}
        </div>
      )}

      {/* ── Begin sprint nudge ────────────────────────────────────────────── */}
      {!sprintData && (
        <div style={{ padding: '14px 16px', marginBottom: '20px',
          background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.18)',
          borderRadius: '10px' }}>
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', color: '#A8721A',
            textTransform: 'uppercase', marginBottom: '6px' }}>Your map is ready</div>
          <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic',
            color: 'rgba(15,21,35,0.72)', margin: '0 0 10px' }}>
            You have your map. Now choose your focus.
          </p>
          <a href="/tools/target-goals" style={{ ...sc, fontSize: '17px',
            letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}>
            Begin Target Sprint {'→'}
          </a>
        </div>
      )}

      {mapData.completed_at && (
        <p style={{ ...serif, fontSize: '17px', fontStyle: 'italic',
          color: 'rgba(15,21,35,0.45)', marginTop: '16px' }}>
          Completed {new Date(mapData.completed_at).toLocaleDateString('en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}

// ─── PP Action checklist ──────────────────────────────────────────────────────
function PPActionChecklist({ userId, actions }) {
  const storageKey = `pp_actions_checked_${userId || 'anon'}`
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}') }
    catch { return {} }
  })

  function toggle(key) {
    const next = { ...checked, [key]: !checked[key] }
    setChecked(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
    // Also persist to Supabase if userId available
    if (userId) {
      supabase.from('purpose_piece_results')
        .update({ actions_checked: next, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        
    }
  }

  const items = [
    { key: 'light',  label: 'Light',  value: actions.light  },
    { key: 'medium', label: 'Medium', value: actions.medium },
    { key: 'deep',   label: 'Deep',   value: actions.deep   },
  ].filter(a => a.value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map(a => (
        <div key={a.key}
          onClick={() => toggle(a.key)}
          style={{ display: 'flex', gap: '12px', alignItems: 'flex-start',
            cursor: 'pointer', opacity: checked[a.key] ? 0.5 : 1,
            transition: 'opacity 0.2s' }}>
          {/* Checkbox */}
          <div style={{
            width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
            border: `1.5px solid ${checked[a.key] ? 'rgba(45,106,79,0.6)' : 'rgba(200,146,42,0.5)'}`,
            background: checked[a.key] ? 'rgba(45,106,79,0.08)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}>
            {checked[a.key] && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#2D6A4F"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          {/* Label + text */}
          <div style={{ flex: 1 }}>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A',
              background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.25)',
              borderRadius: '40px', padding: '2px 8px', marginRight: '8px',
              textDecoration: checked[a.key] ? 'line-through' : 'none' }}>
              {a.label}
            </span>
            <span style={{ ...serif, fontSize: '15px', color: '#0F1523', lineHeight: 1.6,
              textDecoration: checked[a.key] ? 'line-through' : 'none' }}>
              {a.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function PurposePieceSlot({ purposeData, userId }) {
  if (!purposeData) return <EmptySlot cta="Begin Purpose Piece" ctaUrl="/tools/purpose-piece" />

  const status = purposeData.status || 'started'

  if (status !== 'complete') {
    const session = purposeData.session ?? {}
    const archetypeDone = (session.archetypeTranscript?.length ?? 0) >= 5
    const domainDone    = (session.domainTranscript?.length    ?? 0) >= 3
    const scaleDone     = (session.scaleTranscript?.length     ?? 0) >= 2
    const stages = [
      { label: 'Archetype', done: archetypeDone },
      { label: 'Domain',    done: domainDone    },
      { label: 'Scale',     done: scaleDone     },
    ]
    const doneCount = stages.filter(s => s.done).length

    return (
      <div>
        <StatusBadge status="started" />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px' }}>
          <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.1em', color: '#0F1523' }}>
            {doneCount} of 3 stages complete
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {stages.map(s => (
            <span key={s.label} style={{
              ...sc, fontSize: '15px', letterSpacing: '0.1em',
              padding: '3px 10px', borderRadius: '40px',
              background: s.done ? 'rgba(45,106,79,0.08)' : 'rgba(200,146,42,0.08)',
              border: `1px solid ${s.done ? 'rgba(45,106,79,0.35)' : 'rgba(200,146,42,0.35)'}`,
              color: s.done ? '#2D6A4F' : '#A8721A',
            }}>
              {s.done ? '✓ ' : ''}{s.label}
            </span>
          ))}
        </div>
        <a href="/tools/purpose-piece" style={{ ...sc, fontSize: '17px', letterSpacing: '0.12em',
          color: '#A8721A', textDecoration: 'none' }}>
          Continue Purpose Piece {'→'}
        </a>
      </div>
    )
  }

  const tentative        = purposeData.session?.tentative ?? {}
  const profile          = purposeData.profile ?? {}
  const archetype        = tentative.archetype?.archetype
  const secondary        = tentative.archetype?.secondary
  const domain           = tentative.domain?.domain
  const scale            = tentative.scale?.scale
  const statement        = profile.civilisational_statement
  const responsibility   = profile.responsibility
  const actions          = profile.actions
  const archetypeFrame   = profile.archetype_frame

  return (
    <div>
      <StatusBadge status="complete" />

      {/* ── Civilisational statement — centrepiece ─────────────────────────── */}
      {statement && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ ...serif, fontSize: '19px', fontStyle: 'italic', fontWeight: 300,
            color: '#0F1523', lineHeight: 1.8, margin: 0 }}>{statement}</p>
        </div>
      )}

      {/* ── Three coordinates ─────────────────────────────────────────────── */}
      {(archetype || domain || scale) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {archetype && (
            <div style={{ padding: '12px 16px', background: 'rgba(200,146,42,0.05)',
              border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', flex: '1 1 120px' }}>
              <Eyebrow>Archetype</Eyebrow>
              <div style={{ ...serif, fontSize: '18px', fontWeight: 300, color: '#0F1523' }}>
                {archetype}
                {secondary && (
                  <span style={{ ...serif, fontSize: '17px', color: 'rgba(15,21,35,0.55)',
                    fontStyle: 'italic', marginLeft: '6px' }}>+ {secondary}</span>
                )}
              </div>
            </div>
          )}
          {domain && (
            <div style={{ padding: '12px 16px', background: 'rgba(200,146,42,0.05)',
              border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', flex: '1 1 120px' }}>
              <Eyebrow>Domain</Eyebrow>
              <div style={{ ...serif, fontSize: '18px', fontWeight: 300, color: '#0F1523' }}>{domain}</div>
            </div>
          )}
          {scale && (
            <div style={{ padding: '12px 16px', background: 'rgba(200,146,42,0.05)',
              border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', flex: '1 1 120px' }}>
              <Eyebrow>Scale</Eyebrow>
              <div style={{ ...serif, fontSize: '18px', fontWeight: 300, color: '#0F1523' }}>{scale}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Archetype description ─────────────────────────────────────────── */}
      {archetypeFrame && (
        <>
          <Rule />
          <p style={{ ...serif, fontSize: '15px', fontWeight: 300,
            color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, margin: '0 0 16px' }}>
            {archetypeFrame}
          </p>
        </>
      )}

      {/* ── Responsibility ────────────────────────────────────────────────── */}
      {responsibility && (
        <>
          <Rule />
          <Eyebrow>The responsibility</Eyebrow>
          <p style={{ ...serif, fontSize: '15px', fontWeight: 300,
            color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, margin: 0 }}>{responsibility}</p>
        </>
      )}

      {/* ── Actions as checklist ──────────────────────────────────────────── */}
      {actions && (actions.light || actions.medium || actions.deep) && (
        <>
          <Rule />
          <Eyebrow>Actions</Eyebrow>
          <PPActionChecklist userId={userId} actions={actions} />
        </>
      )}

      {purposeData.completed_at && (
        <p style={{ ...serif, fontSize: '17px', fontStyle: 'italic',
          color: 'rgba(15,21,35,0.45)', marginTop: '16px' }}>
          Completed {new Date(purposeData.completed_at).toLocaleDateString('en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}

function SprintProgressBar({ done, total, color = '#A8721A' }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ flex: 1, height: '4px', background: 'rgba(200,146,42,0.12)',
        borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color,
          borderRadius: '2px', transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em',
        color: 'rgba(15,21,35,0.55)', flexShrink: 0 }}>{done}/{total}</span>
    </div>
  )
}

function TargetSprintSlot({ sprintData }) {
  if (!sprintData) return <EmptySlot cta="Begin Target Sprint" ctaUrl="/tools/target-goals" />

  const status     = sprintData.status || 'started'
  const dd         = sprintData.domain_data ?? {}
  const domains    = sprintData.domains ?? []
  const endLabel   = sprintData.end_date_label
  const targetDate = sprintData.target_date

  // Not started yet
  if (status === 'started' && domains.length === 0) {
    return (
      <div>
        <StatusBadge status="started" />
        <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic',
          color: 'rgba(15,21,35,0.72)', margin: 0 }}>
          Your sprint is being set up.{' '}
          <a href="/tools/target-goals" style={{ color: '#A8721A', textDecoration: 'none' }}>
            Continue {'→'}
          </a>
        </p>
      </div>
    )
  }

  // ── Time remaining ──────────────────────────────────────────────────────────
  let daysLabel = null
  let daysUrgent = false
  if (targetDate) {
    const msLeft = new Date(targetDate) - new Date()
    const days   = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
    if (days > 0) {
      daysLabel  = `${days} day${days === 1 ? '' : 's'} left`
      daysUrgent = days <= 14
    } else {
      daysLabel  = `Sprint ended ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
      daysUrgent = true
    }
  }

  // ── Overall task totals ─────────────────────────────────────────────────────
  let totalTasks = 0, doneTasks = 0
  let totalMilestones = 0, doneMilestones = 0
  domains.forEach(id => {
    const d = dd[id] ?? {}
    const tasks      = d.tasks ?? []
    const taskChecked = d.taskChecked ?? {}
    const milestones  = d.milestones ?? []
    const mChecked    = d.milestoneChecked ?? {}
    totalTasks      += tasks.length
    doneTasks       += Object.values(taskChecked).filter(Boolean).length
    totalMilestones += milestones.length
    doneMilestones  += Object.values(mChecked).filter(Boolean).length
  })

  // ── Next move: first unchecked task from least-complete domain ──────────────
  let nextMove = null
  const domainsByCompletion = [...domains].sort((a, b) => {
    const da = dd[a] ?? {}, db = dd[b] ?? {}
    const aDone = Object.values(da.taskChecked ?? {}).filter(Boolean).length
    const bDone = Object.values(db.taskChecked ?? {}).filter(Boolean).length
    const aTotal = (da.tasks ?? []).length, bTotal = (db.tasks ?? []).length
    const aPct = aTotal > 0 ? aDone / aTotal : 1
    const bPct = bTotal > 0 ? bDone / bTotal : 1
    return aPct - bPct
  })
  for (const id of domainsByCompletion) {
    const d = dd[id] ?? {}
    const tasks = d.tasks ?? []
    const checked = d.taskChecked ?? {}
    const firstUnchecked = tasks.find((_, i) => !checked[i])
    if (firstUnchecked) {
      const idx = DOMAIN_KEYS.indexOf(id)
      const label = idx >= 0 ? DOMAIN_LABELS[idx] : id
      nextMove = { task: typeof firstUnchecked === 'string' ? firstUnchecked : firstUnchecked.text || firstUnchecked.label || String(firstUnchecked), domain: label }
      break
    }
  }

  const isComplete = status === 'complete'

  return (
    <div>
      <StatusBadge status={isComplete ? 'complete' : 'active'} />

      {/* ── Sprint header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <Eyebrow style={{ marginBottom: '2px' }}>90-day sprint</Eyebrow>
          {(endLabel || targetDate) && (
            <span style={{ ...serif, fontSize: '17px', fontStyle: 'italic',
              color: 'rgba(15,21,35,0.55)' }}>
              {endLabel || new Date(targetDate).toLocaleDateString('en-GB',
                { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
        {daysLabel && (
          <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.1em',
            color: daysUrgent ? '#8A3030' : '#A8721A',
            background: daysUrgent ? 'rgba(138,48,48,0.06)' : 'rgba(200,146,42,0.08)',
            border: `1px solid ${daysUrgent ? 'rgba(138,48,48,0.25)' : 'rgba(200,146,42,0.25)'}`,
            borderRadius: '40px', padding: '4px 12px', flexShrink: 0 }}>
            {daysLabel}
          </span>
        )}
      </div>

      {/* ── Overall progress ──────────────────────────────────────────────── */}
      {(totalTasks > 0 || totalMilestones > 0) && (
        <div style={{ padding: '14px 16px', background: 'rgba(200,146,42,0.03)',
          border: '1px solid rgba(200,146,42,0.15)', borderRadius: '10px', marginBottom: '16px' }}>
          {totalTasks > 0 && (
            <div style={{ marginBottom: totalMilestones > 0 ? '10px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em',
                  color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>Tasks</span>
                <span style={{ ...sc, fontSize: '15px', color: doneTasks === totalTasks ? '#2D6A4F' : '#A8721A' }}>
                  {doneTasks === totalTasks ? 'All done' : `${Math.round((doneTasks/totalTasks)*100)}%`}
                </span>
              </div>
              <SprintProgressBar done={doneTasks} total={totalTasks}
                color={doneTasks === totalTasks ? '#2D6A4F' : '#A8721A'} />
            </div>
          )}
          {totalMilestones > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em',
                  color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>Milestones</span>
                <span style={{ ...sc, fontSize: '15px', color: doneMilestones === totalMilestones ? '#2D6A4F' : '#A8721A' }}>
                  {doneMilestones === totalMilestones ? 'All done' : `${Math.round((doneMilestones/totalMilestones)*100)}%`}
                </span>
              </div>
              <SprintProgressBar done={doneMilestones} total={totalMilestones}
                color={doneMilestones === totalMilestones ? '#2D6A4F' : '#A8721A'} />
            </div>
          )}
        </div>
      )}

      {/* ── Next move ─────────────────────────────────────────────────────── */}
      {nextMove && !isComplete && (
        <div style={{ padding: '14px 16px', marginBottom: '16px',
          background: 'rgba(200,146,42,0.04)',
          border: '1.5px solid rgba(200,146,42,0.35)', borderRadius: '10px' }}>
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A',
            textTransform: 'uppercase', marginBottom: '6px' }}>
            Next move — {nextMove.domain}
          </div>
          <p style={{ ...serif, fontSize: '15px', fontWeight: 300,
            color: '#0F1523', lineHeight: 1.6, margin: 0 }}>
            {nextMove.task}
          </p>
          <a href="/tools/target-goals" style={{ ...sc, fontSize: '15px',
            letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none',
            display: 'inline-block', marginTop: '10px' }}>
            Open sprint {'→'}
          </a>
        </div>
      )}

      {/* ── Domain cards ──────────────────────────────────────────────────── */}
      {domains.map(domainId => {
        const d          = dd[domainId] ?? {}
        const idx        = DOMAIN_KEYS.indexOf(domainId)
        const label      = idx >= 0 ? DOMAIN_LABELS[idx] : domainId
        const goal       = d.targetGoal
        const horizon    = d.horizonText
        const milestones = d.milestones ?? []
        const tasks      = d.tasks ?? []
        const mChecked   = d.milestoneChecked ?? {}
        const tChecked   = d.taskChecked ?? {}
        const mDone      = Object.values(mChecked).filter(Boolean).length
        const tDone      = Object.values(tChecked).filter(Boolean).length
        const domainComplete = tasks.length > 0 && tDone === tasks.length

        // Setup completeness
        const missing = []
        if (!goal)               missing.push('target goal')
        if (milestones.length === 0) missing.push('milestones')
        if (tasks.length === 0)  missing.push('tasks')

        return (
          <div key={domainId} style={{ marginBottom: '10px', padding: '16px 18px',
            background: domainComplete ? 'rgba(45,106,79,0.04)' : 'rgba(200,146,42,0.03)',
            border: `1px solid ${domainComplete ? 'rgba(45,106,79,0.25)' : 'rgba(200,146,42,0.18)'}`,
            borderRadius: '12px' }}>

            {/* Domain header */}
            <div style={{ display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: goal ? '10px' : 0, gap: '10px' }}>
              <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.10em',
                color: domainComplete ? '#2D6A4F' : '#A8721A', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {domainComplete ? '✓ ' : ''}{label}
                <DomainTooltip domainKey={DOMAIN_KEYS[DOMAIN_LABELS.indexOf(label)]} system="lifeos" position="above" />
              </span>
              {tasks.length > 0 && (
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em',
                  color: domainComplete ? '#2D6A4F' : 'rgba(15,21,35,0.55)',
                  flexShrink: 0 }}>
                  {tDone}/{tasks.length} tasks
                </span>
              )}
            </div>

            {/* Task progress bar */}
            {tasks.length > 0 && (
              <div style={{ marginBottom: goal ? '10px' : 0 }}>
                <SprintProgressBar done={tDone} total={tasks.length}
                  color={domainComplete ? '#2D6A4F' : '#A8721A'} />
              </div>
            )}

            {/* Goal */}
            {goal && (
              <p style={{ ...serif, fontSize: '15px', fontWeight: 300,
                color: '#0F1523', lineHeight: 1.6, margin: '8px 0 0' }}>{goal}</p>
            )}

            {/* Setup gaps */}
            {missing.length > 0 && !goal && (
              <p style={{ ...serif, fontSize: '17px', fontStyle: 'italic',
                color: 'rgba(15,21,35,0.45)', margin: '6px 0 0' }}>
                Still needed: {missing.join(', ')}.{' '}
                <a href="/tools/target-goals" style={{ color: '#A8721A', textDecoration: 'none' }}>
                  Set up {'→'}
                </a>
              </p>
            )}

            {/* Milestone count */}
            {milestones.length > 0 && (
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em',
                color: 'rgba(15,21,35,0.45)', marginTop: '8px' }}>
                {mDone}/{milestones.length} milestones
              </div>
            )}
          </div>
        )
      })}

      {sprintData.created_at && (
        <p style={{ ...serif, fontSize: '17px', fontStyle: 'italic',
          color: 'rgba(15,21,35,0.45)', marginTop: '8px' }}>
          Started {new Date(sprintData.created_at).toLocaleDateString('en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}

// ─── Foundation slot ──────────────────────────────────────────────────────────

function FlameBar({ value, color = '#A8721A', size = 14 }) {
  if (!value) return null
  const filled = Math.round(Math.min(Math.max(value, 0), 10))
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          width: size, height: size * 1.4, borderRadius: '2px',
          background: i < filled ? color : 'rgba(200,146,42,0.12)',
          transition: 'background 0.3s',
        }} />
      ))}
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em',
        color, marginLeft: '6px' }}>{value}</span>
    </div>
  )
}

function Sparkline({ data }) {
  // data: [{ before, after, date }] newest first
  const pts = [...data].reverse().slice(-14)
  if (pts.length < 2) return null
  const w = 160, h = 36, pad = 2
  const xStep = (w - pad * 2) / (pts.length - 1)
  function y(v) { return h - pad - ((Math.min(v, 10) / 10) * (h - pad * 2)) }
  const beforePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${pad + i * xStep},${y(p.before)}`).join(' ')
  const afterPath  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${pad + i * xStep},${y(p.after)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={beforePath} fill="none" stroke="rgba(200,146,42,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={afterPath}  fill="none" stroke="rgba(45,106,79,0.7)"  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="none" />
    </svg>
  )
}

function FoundationSlot({ foundationData }) {
  if (!foundationData) return <EmptySlot cta="Begin Foundation" ctaUrl="/tools/foundation" />

  const {
    streak_days, sessions_total, sessions_week,
    avg_delta, last_before, last_after,
    last_before_note, last_after_note,
    last_session_at, latest_review,
    spark_data = [], phase = 'baseline',
  } = foundationData

  const today        = new Date().toISOString().slice(0, 10)
  const lastDate     = last_session_at?.slice(0, 10)
  const practicedToday = lastDate === today
  const deltaSign    = avg_delta > 0 ? '+' : ''
  const lastDelta    = last_before != null && last_after != null ? last_after - last_before : null
  const lastDeltaSign = lastDelta > 0 ? '+' : ''

  const phases = [
    { key: 'baseline',   label: 'Baseline',   active: true  },
    { key: 'calibrating', label: 'Calibrating', active: false },
    { key: 'embodying',  label: 'Embodying',  active: false },
  ]

  return (
    <div>
      <StatusBadge status="active" />

      {/* ── Today nudge or today's delta ────────────────────────────────── */}
      {practicedToday ? (
        <div style={{ padding: '12px 16px', marginBottom: '16px',
          background: 'rgba(45,106,79,0.04)', border: '1px solid rgba(45,106,79,0.2)',
          borderRadius: '10px' }}>
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em',
            color: '#2D6A4F', textTransform: 'uppercase', marginBottom: '8px' }}>
            Today
          </div>
          {last_before != null && last_after != null ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FlameBar value={last_before} color="rgba(200,146,42,0.7)" size={12} />
                <span style={{ ...sc, fontSize: '17px', color: 'rgba(15,21,35,0.4)' }}>{'→'}</span>
                <FlameBar value={last_after} color="#2D6A4F" size={12} />
                <span style={{ ...sc, fontSize: '17px', fontWeight: 600,
                  color: lastDelta >= 0 ? '#2D6A4F' : '#8A3030' }}>
                  {lastDeltaSign}{lastDelta}
                </span>
              </div>
              {(last_before_note || last_after_note) && (
                <div style={{ ...serif, fontSize: '17px', fontStyle: 'italic',
                  color: 'rgba(15,21,35,0.55)', lineHeight: 1.5, marginTop: '4px' }}>
                  {last_before_note && <span>'{last_before_note}'</span>}
                  {last_before_note && last_after_note && <span style={{ margin: '0 6px', color: 'rgba(15,21,35,0.3)' }}>→</span>}
                  {last_after_note  && <span>'{last_after_note}'</span>}
                </div>
              )}
            </div>
          ) : (
            <p style={{ ...serif, fontSize: '17px', fontStyle: 'italic',
              color: 'rgba(15,21,35,0.55)', margin: 0 }}>Session complete.</p>
          )}
        </div>
      ) : (
        <div style={{ padding: '12px 16px', marginBottom: '16px',
          background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.18)',
          borderRadius: '10px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '12px' }}>
          <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic',
            color: 'rgba(15,21,35,0.72)', margin: 0 }}>
            {sessions_total > 0 ? 'Ready when you are.' : 'Start your first session.'}
          </p>
          <a href="/tools/foundation" style={{ ...sc, fontSize: '15px',
            letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none',
            flexShrink: 0 }}>
            Practice {'→'}
          </a>
        </div>
      )}

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {sessions_total > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {streak_days > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(200,146,42,0.05)',
              border: '1px solid rgba(200,146,42,0.2)', borderRadius: '10px', flex: '1 1 80px',
              textAlign: 'center' }}>
              <div style={{ ...sc, fontSize: '20px', fontWeight: 600, color: '#A8721A',
                lineHeight: 1 }}>{streak_days}</div>
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em',
                color: 'rgba(15,21,35,0.45)', marginTop: '3px' }}>
                DAY{streak_days !== 1 ? 'S' : ''} STREAK
              </div>
            </div>
          )}
          {sessions_week > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(200,146,42,0.05)',
              border: '1px solid rgba(200,146,42,0.2)', borderRadius: '10px', flex: '1 1 80px',
              textAlign: 'center' }}>
              <div style={{ ...sc, fontSize: '20px', fontWeight: 600, color: '#A8721A',
                lineHeight: 1 }}>{sessions_week}</div>
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em',
                color: 'rgba(15,21,35,0.45)', marginTop: '3px' }}>THIS WEEK</div>
            </div>
          )}
          {avg_delta !== null && avg_delta !== 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(200,146,42,0.05)',
              border: '1px solid rgba(200,146,42,0.2)', borderRadius: '10px', flex: '1 1 80px',
              textAlign: 'center' }}>
              <div style={{ ...sc, fontSize: '20px', fontWeight: 600,
                color: avg_delta >= 0 ? '#2D6A4F' : '#8A3030', lineHeight: 1 }}>
                {deltaSign}{avg_delta}
              </div>
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em',
                color: 'rgba(15,21,35,0.45)', marginTop: '3px' }}>AVG LIFT</div>
            </div>
          )}
          <div style={{ padding: '10px 14px', background: 'rgba(200,146,42,0.05)',
            border: '1px solid rgba(200,146,42,0.2)', borderRadius: '10px', flex: '1 1 80px',
            textAlign: 'center' }}>
            <div style={{ ...sc, fontSize: '20px', fontWeight: 600, color: '#A8721A',
              lineHeight: 1 }}>{sessions_total}</div>
            <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em',
              color: 'rgba(15,21,35,0.45)', marginTop: '3px' }}>TOTAL</div>
          </div>
        </div>
      )}

      {/* ── Sparkline ─────────────────────────────────────────────────────── */}
      {spark_data.length >= 2 && (
        <div style={{ marginBottom: '16px' }}>
          <Sparkline data={spark_data} />
          <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '16px', height: '2px', background: 'rgba(200,146,42,0.5)' }} />
              <span style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.45)',
                letterSpacing: '0.1em' }}>BEFORE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '16px', height: '2px', background: 'rgba(45,106,79,0.7)' }} />
              <span style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.45)',
                letterSpacing: '0.1em' }}>AFTER</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Latest review ─────────────────────────────────────────────────── */}
      {latest_review && (
        <div style={{ marginBottom: '16px', padding: '12px 14px',
          background: 'rgba(200,146,42,0.03)', borderLeft: '2px solid rgba(200,146,42,0.3)',
          borderRadius: '0 8px 8px 0' }}>
          <p style={{ ...serif, fontSize: '17px', fontStyle: 'italic',
            color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>
            {latest_review}
          </p>
        </div>
      )}

      {/* ── Phase progress ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {phases.map(p => (
          <span key={p.key} style={{
            ...sc, fontSize: '15px', letterSpacing: '0.1em',
            padding: '3px 10px', borderRadius: '40px',
            background: p.active ? 'rgba(200,146,42,0.08)' : 'rgba(15,21,35,0.03)',
            border: `1px solid ${p.active ? 'rgba(200,146,42,0.35)' : 'rgba(15,21,35,0.1)'}`,
            color: p.active ? '#A8721A' : 'rgba(15,21,35,0.3)',
          }}>
            {p.active ? '● ' : '○ '}{p.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Contributor Offer slot ────────────────────────────────────────────────────

const OFFER_TYPES = [
  { value: 'skills',    label: 'Skills',      desc: 'Professional or craft expertise' },
  { value: 'time',      label: 'Time',        desc: 'Availability for a project or role' },
  { value: 'capital',   label: 'Capital',     desc: 'Financial contribution or investment' },
  { value: 'community', label: 'Community',   desc: 'Network, amplification, advocacy' },
  { value: 'knowledge', label: 'Knowledge',   desc: 'Research, data, frameworks' },
  { value: 'creative',  label: 'Creative',    desc: 'Artistic, expressive, or cultural work' },
  { value: 'other',     label: 'Other',       desc: 'Something else' },
]

const OFFER_MODES = [
  { value: 'functional',   label: 'Functional',   desc: 'Builds, organises, funds, connects' },
  { value: 'expressive',   label: 'Expressive',   desc: 'Makes, performs, creates, transmits' },
  { value: 'relational',   label: 'Relational',   desc: 'Heals, holds, facilitates, witnesses' },
  { value: 'intellectual', label: 'Intellectual', desc: 'Researches, synthesises, frames, teaches' },
  { value: 'mixed',        label: 'Mixed',        desc: 'Crosses more than one mode' },
]

const OFFER_TO = [
  { value: 'any',            label: 'Anyone aligned' },
  { value: 'domain_aligned', label: 'My domains only' },
  { value: 'verified_only',  label: 'Verified orgs only' },
  { value: 'invitation_only',label: 'By invitation' },
]

const RETURN_TYPES = [
  { value: 'none',        label: 'Volunteer — no expectation' },
  { value: 'acknowledged',label: 'Acknowledged — public attribution' },
  { value: 'paid',        label: 'Paid — financial compensation' },
  { value: 'token',       label: 'Token — points/token return' },
  { value: 'reciprocal',  label: 'Reciprocal — give to the ecosystem' },
]

const NEXTUS_DOMAINS = [
  { value: 'human-being',    label: 'Human Being' },
  { value: 'society',        label: 'Society' },
  { value: 'nature',         label: 'Nature' },
  { value: 'technology',     label: 'Technology' },
  { value: 'finance-economy',label: 'Finance & Economy' },
  { value: 'legacy',         label: 'Legacy' },
  { value: 'vision',         label: 'Vision' },
]

const EMPTY_OFFER = {
  title: '',
  offer_type: 'skills',
  contribution_mode: 'functional',
  description: '',
  domain_ids: [],
  scale: '',
  willing_to_offer_to: 'any',
  open_to_adjacent: true,
  return_type: 'none',
  availability: '',
  is_active: true,
}

// Maps Purpose Piece archetype to the most natural contribution mode.
// Used to seed new offer forms so Expressive contributors don't start
// on 'functional' by default.
const ARCHETYPE_TO_MODE = {
  'Maker':      'expressive',
  'Mirror':     'expressive',
  'Exemplar':   'expressive',
  'Connector':  'relational',
  'Steward':    'functional',
  'Guardian':   'functional',
  'Explorer':   'intellectual',
  'Sage':       'intellectual',
  'Architect':  'intellectual',
}

function OfferChips({ options, selected, onChange, multi = false }) {
  const sc_ = { fontFamily: "'Cormorant SC', Georgia, serif" }
  const serif_ = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
  const gold_ = '#A8721A'

  function toggle(val) {
    if (multi) {
      onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
    } else {
      onChange(val)
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map(o => {
        const on = multi ? selected.includes(o.value) : selected === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            style={{
              textAlign: 'left',
              padding: o.desc ? '10px 14px' : '6px 14px',
              borderRadius: o.desc ? '10px' : '40px',
              cursor: 'pointer',
              border: on ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.22)',
              background: on ? 'rgba(200,146,42,0.08)' : 'transparent',
              transition: 'all 0.15s',
              minWidth: o.desc ? '140px' : 'auto',
            }}
          >
            <div style={{ ...sc_, fontSize: '12px', letterSpacing: '0.12em', color: on ? gold_ : 'rgba(15,21,35,0.65)' }}>
              {o.label}
            </div>
            {o.desc && (
              <div style={{ ...serif_, fontSize: '12px', color: 'rgba(15,21,35,0.45)', marginTop: '2px', lineHeight: 1.4 }}>
                {o.desc}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function ContributorOfferForm({ initial = EMPTY_OFFER, onSave, onCancel, saving }) {
  const sc_ = { fontFamily: "'Cormorant SC', Georgia, serif" }
  const serif_ = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
  const gold_ = '#A8721A'
  const dark_ = '#0F1523'

  const [form, setForm] = useState(initial)
  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  return (
    <div style={{ background: 'rgba(200,146,42,0.03)', border: '1.5px solid rgba(200,146,42,0.28)', borderRadius: '14px', padding: '22px 24px', marginBottom: '16px' }}>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ ...sc_, fontSize: '12px', letterSpacing: '0.16em', color: gold_, display: 'block', marginBottom: '6px' }}>
          What you're offering <span style={{ color: '#8A3030' }}>*</span>
        </label>
        <input
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. Strategic communications, Documentary filmmaking, Trauma-informed facilitation"
          style={{ ...serif_, fontSize: '15px', color: dark_, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.28)', background: '#FFFFFF', outline: 'none', width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ ...sc_, fontSize: '12px', letterSpacing: '0.16em', color: gold_, display: 'block', marginBottom: '6px' }}>
          Type
        </label>
        <OfferChips options={OFFER_TYPES} selected={form.offer_type} onChange={v => set('offer_type', v)} />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ ...sc_, fontSize: '12px', letterSpacing: '0.16em', color: gold_, display: 'block', marginBottom: '6px' }}>
          Mode — how does this contribution move?
        </label>
        <OfferChips options={OFFER_MODES} selected={form.contribution_mode} onChange={v => set('contribution_mode', v)} />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ ...sc_, fontSize: '12px', letterSpacing: '0.16em', color: gold_, display: 'block', marginBottom: '6px' }}>
          More detail
        </label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="What specifically do you bring? Background, experience, approach. This is what orgs read when they find you."
          rows={3}
          style={{ ...serif_, fontSize: '15px', color: dark_, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.28)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.65 }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ ...sc_, fontSize: '12px', letterSpacing: '0.16em', color: gold_, display: 'block', marginBottom: '8px' }}>
          Domains — where do you want this to go?
        </label>
        <p style={{ ...serif_, fontSize: '13px', color: 'rgba(15,21,35,0.45)', marginBottom: '10px', lineHeight: 1.5 }}>
          Leave empty to stay open to any. Select to focus.
        </p>
        <OfferChips
          options={NEXTUS_DOMAINS}
          selected={form.domain_ids}
          onChange={v => set('domain_ids', v)}
          multi
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ ...sc_, fontSize: '12px', letterSpacing: '0.16em', color: gold_, display: 'block', marginBottom: '6px' }}>
            Who can approach you?
          </label>
          <OfferChips options={OFFER_TO} selected={form.willing_to_offer_to} onChange={v => set('willing_to_offer_to', v)} />
        </div>
        <div>
          <label style={{ ...sc_, fontSize: '12px', letterSpacing: '0.16em', color: gold_, display: 'block', marginBottom: '6px' }}>
            What are you looking for in return?
          </label>
          <OfferChips options={RETURN_TYPES} selected={form.return_type} onChange={v => set('return_type', v)} />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.open_to_adjacent}
            onChange={e => set('open_to_adjacent', e.target.checked)}
            style={{ marginTop: '3px', accentColor: gold_ }}
          />
          <span style={{ ...serif_, fontSize: '14px', color: 'rgba(15,21,35,0.70)', lineHeight: 1.6 }}>
            Open to adjacent enquiries — orgs can reach out even if I'm not an exact match for what they need
          </span>
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ ...sc_, fontSize: '12px', letterSpacing: '0.16em', color: gold_, display: 'block', marginBottom: '6px' }}>
          Availability
        </label>
        <input
          value={form.availability}
          onChange={e => set('availability', e.target.value)}
          placeholder="e.g. 5 hours/week, one project at a time, advisory only"
          style={{ ...serif_, fontSize: '15px', color: dark_, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.28)', background: '#FFFFFF', outline: 'none', width: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.title.trim()}
          style={{
            ...sc_, fontSize: '14px', letterSpacing: '0.14em',
            padding: '12px 24px', borderRadius: '40px',
            border: 'none', cursor: saving || !form.title.trim() ? 'not-allowed' : 'pointer',
            background: saving || !form.title.trim() ? 'rgba(200,146,42,0.30)' : '#C8922A',
            color: '#FFFFFF', opacity: saving || !form.title.trim() ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save offer'}
        </button>
        <button
          onClick={onCancel}
          style={{ ...sc_, fontSize: '14px', letterSpacing: '0.14em', padding: '12px 24px', borderRadius: '40px', border: '1px solid rgba(15,21,35,0.20)', background: 'transparent', color: 'rgba(15,21,35,0.55)', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ContributorOfferCard({ offer, onEdit, onToggleActive, onDelete }) {
  const sc_ = { fontFamily: "'Cormorant SC', Georgia, serif" }
  const serif_ = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
  const gold_ = '#A8721A'
  const dark_ = '#0F1523'

  const typeLabel   = OFFER_TYPES.find(t => t.value === offer.offer_type)?.label || offer.offer_type
  const modeLabel   = OFFER_MODES.find(m => m.value === offer.contribution_mode)?.label || offer.contribution_mode
  const returnLabel = RETURN_TYPES.find(r => r.value === offer.return_type)?.label?.split(' —')[0] || offer.return_type

  return (
    <div style={{
      background: offer.is_active ? '#FFFFFF' : 'rgba(15,21,35,0.02)',
      border: offer.is_active ? '1.5px solid rgba(200,146,42,0.22)' : '1.5px solid rgba(15,21,35,0.10)',
      borderRadius: '12px', padding: '18px 20px', marginBottom: '10px',
      opacity: offer.is_active ? 1 : 0.6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...sc_, fontSize: '11px', letterSpacing: '0.12em', color: gold_, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.22)', borderRadius: '4px', padding: '2px 8px' }}>
              {typeLabel}
            </span>
            <span style={{ ...sc_, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.45)', background: 'rgba(15,21,35,0.04)', border: '1px solid rgba(15,21,35,0.08)', borderRadius: '4px', padding: '2px 8px' }}>
              {modeLabel}
            </span>
            <span style={{ ...sc_, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.40)' }}>
              {returnLabel}
            </span>
            {!offer.is_active && (
              <span style={{ ...sc_, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.35)' }}>
                Paused
              </span>
            )}
          </div>
          <p style={{ ...serif_, fontSize: '16px', fontWeight: 300, color: dark_, marginBottom: offer.description ? '4px' : 0, lineHeight: 1.3 }}>
            {offer.title}
          </p>
          {offer.description && (
            <p style={{ ...serif_, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65 }}>
              {offer.description.slice(0, 120)}{offer.description.length > 120 ? '…' : ''}
            </p>
          )}
          {offer.domain_ids?.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
              {offer.domain_ids.map(d => (
                <span key={d} style={{ ...sc_, fontSize: '10px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.40)', background: 'rgba(15,21,35,0.04)', borderRadius: '4px', padding: '2px 7px' }}>
                  {NEXTUS_DOMAINS.find(nd => nd.value === d)?.label || d}
                </span>
              ))}
            </div>
          )}
          {offer.availability && (
            <p style={{ ...sc_, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.40)', marginTop: '6px' }}>
              {offer.availability}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={() => onEdit(offer)}
            style={{ ...sc_, fontSize: '12px', letterSpacing: '0.12em', padding: '6px 14px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.50)', background: 'rgba(200,146,42,0.04)', color: gold_, cursor: 'pointer' }}
          >
            Edit
          </button>
          <button
            onClick={() => onToggleActive(offer)}
            style={{ ...sc_, fontSize: '12px', letterSpacing: '0.12em', padding: '6px 14px', borderRadius: '40px', border: '1px solid rgba(15,21,35,0.15)', background: 'transparent', color: 'rgba(15,21,35,0.50)', cursor: 'pointer' }}
          >
            {offer.is_active ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={() => onDelete(offer.id)}
            style={{ ...sc_, fontSize: '12px', letterSpacing: '0.12em', padding: '6px 14px', borderRadius: '40px', border: '1px solid rgba(138,48,48,0.30)', background: 'transparent', color: '#8A3030', cursor: 'pointer' }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

function ContributorOfferSection({ userId, purposeData }) {
  const sc_ = { fontFamily: "'Cormorant SC', Georgia, serif" }
  const serif_ = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
  const gold_ = '#A8721A'

  const [offers, setOffers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving]   = useState(false)

  // Seed from Purpose Piece if available
  const ppDomain   = purposeData?.session?.tentative?.domain?.domain_id
  const ppScale    = purposeData?.session?.tentative?.scale?.scale
  const ppArchetype = purposeData?.session?.tentative?.archetype?.archetype

  const seededOffer = {
    ...EMPTY_OFFER,
    domain_ids:        ppDomain    ? [ppDomain] : [],
    scale:             ppScale     || '',
    contribution_mode: ppArchetype ? (ARCHETYPE_TO_MODE[ppArchetype] || 'functional') : 'functional',
    offer_type:        (ppArchetype === 'Maker' || ppArchetype === 'Mirror' || ppArchetype === 'Exemplar')
                         ? 'creative'
                         : EMPTY_OFFER.offer_type,
  }

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('nextus_contributor_offers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    setOffers(data || [])
    setLoading(false)
  }

  useEffect(() => { if (userId) load() }, [userId])

  async function saveNew(form) {
    if (!form.title.trim()) return
    setSaving(true)
    await supabase.from('nextus_contributor_offers').insert({
      user_id:            userId,
      title:              form.title.trim(),
      offer_type:         form.offer_type,
      contribution_mode:  form.contribution_mode,
      description:        form.description.trim() || null,
      domain_ids:         form.domain_ids,
      scale:              form.scale || null,
      willing_to_offer_to: form.willing_to_offer_to,
      open_to_adjacent:   form.open_to_adjacent,
      return_type:        form.return_type,
      availability:       form.availability.trim() || null,
      is_active:          true,
      last_active_at:     new Date().toISOString(),
    })
    setSaving(false)
    setAdding(false)
    load()
  }

  async function saveEdit(form) {
    if (!form.title.trim()) return
    setSaving(true)
    await supabase.from('nextus_contributor_offers').update({
      title:              form.title.trim(),
      offer_type:         form.offer_type,
      contribution_mode:  form.contribution_mode,
      description:        form.description.trim() || null,
      domain_ids:         form.domain_ids,
      scale:              form.scale || null,
      willing_to_offer_to: form.willing_to_offer_to,
      open_to_adjacent:   form.open_to_adjacent,
      return_type:        form.return_type,
      availability:       form.availability.trim() || null,
      updated_at:         new Date().toISOString(),
    }).eq('id', form.id)
    setSaving(false)
    setEditing(null)
    load()
  }

  async function toggleActive(offer) {
    await supabase.from('nextus_contributor_offers')
      .update({ is_active: !offer.is_active, updated_at: new Date().toISOString() })
      .eq('id', offer.id)
    load()
  }

  async function deleteOffer(id) {
    if (!window.confirm('Remove this offer?')) return
    await supabase.from('nextus_contributor_offers').delete().eq('id', id)
    load()
  }

  if (loading) return null

  return (
    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(200,146,42,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <span style={{ ...sc_, fontSize: '12px', letterSpacing: '0.18em', color: gold_, display: 'block', marginBottom: '4px' }}>
            What you're putting on the table
          </span>
          <p style={{ ...serif_, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, margin: 0, maxWidth: '380px' }}>
            Skills, creativity, time, or resources you're willing to offer the ecosystem.
            {ppArchetype && ` As a ${ppArchetype}, your offer is already placed in context.`}
          </p>
        </div>
        {!adding && !editing && (
          <button
            onClick={() => setAdding(true)}
            style={{ ...sc_, fontSize: '13px', letterSpacing: '0.14em', padding: '9px 18px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: gold_, cursor: 'pointer', flexShrink: 0 }}
          >
            + Add offer
          </button>
        )}
      </div>

      {/* Purpose Piece seed prompt */}
      {offers.length === 0 && !adding && ppDomain && (
        <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '10px', padding: '14px 18px', marginBottom: '12px' }}>
          <p style={{ ...serif_, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, marginBottom: '10px' }}>
            Your Purpose Piece output has pre-filled your domain. Add your first offer and it will be discoverable by orgs working in that space.
          </p>
          <button
            onClick={() => setAdding(true)}
            style={{ ...sc_, fontSize: '13px', letterSpacing: '0.14em', padding: '8px 18px', borderRadius: '40px', border: 'none', background: '#C8922A', color: '#FFFFFF', cursor: 'pointer' }}
          >
            Add first offer →
          </button>
        </div>
      )}

      {/* Empty — no PP data */}
      {offers.length === 0 && !adding && !ppDomain && (
        <p style={{ ...serif_, fontSize: '14px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', marginBottom: '8px' }}>
          No offers yet.{' '}
          <button onClick={() => setAdding(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc_, fontSize: '13px', letterSpacing: '0.12em', color: gold_, padding: 0 }}>
            Add one →
          </button>
        </p>
      )}

      {/* Add form */}
      {adding && (
        <ContributorOfferForm
          initial={seededOffer}
          onSave={saveNew}
          onCancel={() => setAdding(false)}
          saving={saving}
        />
      )}

      {/* Offer cards */}
      {offers.map(o => (
        editing?.id === o.id
          ? <ContributorOfferForm
              key={o.id}
              initial={editing}
              onSave={saveEdit}
              onCancel={() => setEditing(null)}
              saving={saving}
            />
          : <ContributorOfferCard
              key={o.id}
              offer={o}
              onEdit={o => setEditing(o)}
              onToggleActive={toggleActive}
              onDelete={deleteOffer}
            />
      ))}
    </div>
  )
}

// ─── NextUs slot ───────────────────────────────────────────────────────────────

function NextUsSlot({ purposeData, userId, claimedActor }) {
  const profile   = purposeData?.profile ?? {}
  const tentative = purposeData?.session?.tentative ?? {}
  const statement = profile.civilisational_statement
  const archetype = tentative.archetype?.archetype
  const domain    = tentative.domain?.domain
  const scale     = tentative.scale?.scale

  const [summary,        setSummary]        = useState(null)
  const [contribs,       setContribs]       = useState([])
  const [pending,        setPending]        = useState([])
  const [visibility,     setVisibility]     = useState('public')
  const [savingVis,      setSavingVis]      = useState(false)
  const [loadingContribs, setLoadingContribs] = useState(true)

  useEffect(() => {
    if (!userId) return
    async function load() {
      const [{ data: sumData }, { data: contribData }, { data: pendingData }] = await Promise.all([
        supabase.from('nextus_contribution_summaries').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('nextus_contributions')
          .select('*, nextus_actors(id, name, domain_id)')
          .eq('contributor_id', userId)
          .eq('confirmed_by_actor', true)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('nextus_contributions')
          .select('*, nextus_actors(id, name, domain_id)')
          .eq('contributor_id', userId)
          .eq('confirmed_by_actor', false)
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      if (sumData) { setSummary(sumData); setVisibility(sumData.visibility || 'public') }
      setContribs(contribData || [])
      setPending(pendingData || [])
      setLoadingContribs(false)
    }
    load()
  }, [userId])

  async function toggleVisibility() {
    const next = visibility === 'public' ? 'muted' : 'public'
    const prev = visibility
    setSavingVis(true)
    setVisibility(next)
    const { error } = await supabase.from('nextus_contribution_summaries')
      .upsert({ user_id: userId, visibility: next }, { onConflict: 'user_id' })
    if (error) setVisibility(prev)
    setSavingVis(false)
  }

  const hasContribs = summary && (
    summary.total_hours > 0 || summary.total_capital > 0 ||
    summary.skills_count > 0 || summary.resources_count > 0 || summary.community_count > 0
  )

  const CONTRIB_LABEL = { hours: 'Time', capital: 'Capital', skills: 'Skills', resources: 'Resources', community: 'Community', other: 'Other' }
  const DOMAIN_LABEL  = { 'human-being': 'Human Being', 'society': 'Society', 'nature': 'Nature', 'technology': 'Technology', 'finance-economy': 'Finance & Economy', 'legacy': 'Legacy', 'vision': 'Vision' }

  return (
    <div>
      {/* Civilisational identity */}
      {statement && (
        <>
          <Eyebrow>Your civilisational statement</Eyebrow>
          <div style={{ borderLeft: '2px solid rgba(200,146,42,0.35)', paddingLeft: '16px', marginBottom: '20px' }}>
            <p style={{ ...serif, fontSize: '16px', fontStyle: 'italic', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, margin: 0 }}>{statement}</p>
          </div>
        </>
      )}

      {(archetype || domain || scale) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {[archetype, domain, scale].filter(Boolean).map((v, i) => (
            <span key={i} style={{ ...sc, fontSize: '15px', letterSpacing: '0.10em', color: '#A8721A', background: 'rgba(200,146,42,0.07)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '40px', padding: '5px 14px' }}>{v}</span>
          ))}
        </div>
      )}

      {!statement && !archetype && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.65)', marginBottom: '14px', lineHeight: 1.7 }}>
            Complete Purpose Piece to discover where your contribution belongs in the larger work.
          </p>
          <a href="/tools/purpose-piece" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none' }}>
            Begin Purpose Piece {'→'}
          </a>
        </div>
      )}

      {/* Contributor offer section */}
      <ContributorOfferSection userId={userId} purposeData={purposeData} />

      {/* Contributor profile link */}
      {userId && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(200,146,42,0.12)' }}>
          <a
            href={`/nextus/contributors/${userId}`}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none' }}
          >
            View your contributor profile →
          </a>
          <span style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.40)', marginLeft: '10px' }}>
            This is what orgs see when they find you
          </span>
        </div>
      )}

      {claimedActor && (
        <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.22)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '4px' }}>Your actor profile</p>
            <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', margin: 0 }}>{claimedActor.name}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href={'/nextus/actors/' + claimedActor.id} style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}>View</a>
            <span style={{ color: 'rgba(200,146,42,0.35)' }}>·</span>
            <a href={'/nextus/actors/' + claimedActor.id + '/manage'} style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}>Manage</a>
          </div>
        </div>
      )}

      {/* Contribution section */}
      {!loadingContribs && (
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.12)', paddingTop: '20px', marginTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <Eyebrow style={{ marginBottom: 0 }}>Your contributions</Eyebrow>
            {hasContribs && (
              <button onClick={toggleVisibility} disabled={savingVis}
                style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {savingVis ? '...' : visibility === 'public' ? 'Make private' : 'Make public'}
              </button>
            )}
          </div>

          {/* Pending contributions */}
          {pending.length > 0 && (
            <div style={{ marginBottom: '16px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '10px', padding: '14px 16px' }}>
              <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.40)', marginBottom: '10px' }}>Pending confirmation</p>
              {pending.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
                  <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: '#A8721A', background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '4px', padding: '2px 8px' }}>
                    {CONTRIB_LABEL[c.contribution_type] || c.contribution_type}
                  </span>
                  <a href={'/nextus/actors/' + c.nextus_actors?.id} style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.70)', flex: 1, textDecoration: 'none' }}>
                    {c.nextus_actors?.name || 'Unknown'}
                  </a>
                  <span style={{ ...serif, fontSize: '12px', color: 'rgba(15,21,35,0.35)', fontStyle: 'italic' }}>awaiting confirmation</span>
                </div>
              ))}
            </div>
          )}

          {!hasContribs ? (
            <div>
              <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '14px' }}>
                {pending.length > 0
                  ? 'Your confirmed contributions will appear here once the organisation confirms your work.'
                  : 'Your confirmed contributions will appear here as a record of what you have actually done in the world.'}
              </p>
              {pending.length === 0 && (
                <a href="/nextus/actors" style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none' }}>
                  Find actors to contribute to {'→'}
                </a>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {summary.total_hours > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...serif, fontSize: '24px', fontWeight: 300, color: '#0F1523', lineHeight: 1 }}>{summary.total_hours}</div>
                    <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)', marginTop: '4px' }}>hours</div>
                  </div>
                )}
                {summary.total_capital > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...serif, fontSize: '24px', fontWeight: 300, color: '#0F1523', lineHeight: 1 }}>${summary.total_capital}</div>
                    <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)', marginTop: '4px' }}>capital</div>
                  </div>
                )}
                {summary.skills_count > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...serif, fontSize: '24px', fontWeight: 300, color: '#0F1523', lineHeight: 1 }}>{summary.skills_count}</div>
                    <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)', marginTop: '4px' }}>skills</div>
                  </div>
                )}
                {summary.community_count > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...serif, fontSize: '24px', fontWeight: 300, color: '#0F1523', lineHeight: 1 }}>{summary.community_count}</div>
                    <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)', marginTop: '4px' }}>community</div>
                  </div>
                )}
              </div>

              <p style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.40)', marginBottom: '16px' }}>
                {visibility === 'public' ? 'Visible on your public profile.' : 'Hidden — your icon shows but details are private.'}
              </p>

              {contribs.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.40)', marginBottom: '10px' }}>Recent confirmed</p>
                  {contribs.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
                      <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: '#A8721A', background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '4px', padding: '2px 8px' }}>
                        {CONTRIB_LABEL[c.contribution_type] || c.contribution_type}
                      </span>
                      <a href={'/nextus/actors/' + c.nextus_actors?.id} style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.70)', flex: 1, textDecoration: 'none' }}>
                        {c.nextus_actors?.name || 'Unknown'}
                      </a>
                      {c.nextus_actors?.domain_id && (
                        <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.35)' }}>{DOMAIN_LABEL[c.nextus_actors.domain_id]}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <a href="/nextus/actors" style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none' }}>
                Find more actors {'→'}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [mapData,        setMapData]        = useState(null)
  const [purposeData,    setPurposeData]    = useState(null)
  const [sprintData,     setSprintData]     = useState(null)
  const [foundationData, setFoundationData] = useState(null)
  const [claimedActor,   setClaimedActor]   = useState(null)
  const [horizonProfile, setHorizonProfile] = useState(null)
  const [localMapData,   setLocalMapData]   = useState(null)
  const [dataLoading,    setDataLoading]    = useState(true)

  // Read localStorage on mount — client side only
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lifeos_themap_v4')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.domainData && Object.keys(parsed.domainData).length > 0) {
          setLocalMapData(parsed.domainData)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login?redirect=/profile'); return }
    loadData()
  }, [user, authLoading])

  async function loadData() {
    setDataLoading(true)
    try {
      const [mapRes, ppRes, sprintRes, foundationRes, actorRes, horizonRes] = await Promise.all([
        supabase
          .from('map_results')
          .select('session, completed_at, map_data, horizon_goal_user, horizon_goal_system, complete')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('purpose_piece_results')
          .select('profile, session, completed_at, status')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('target_goal_sessions')
          .select('domains, domain_data, target_date, end_date_label, quarter_type, created_at, status')
          .eq('user_id', user.id)
          .in('status', ['started', 'active', 'complete'])
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('foundation_summary')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('nextus_actors')
          .select('id, name, domain_id, subdomain_id, scale, winning, verified')
          .eq('profile_owner', user.id)
          .maybeSingle(),
        supabase
          .from('horizon_profile')
          .select('domain, current_score, horizon_score, horizon_goal, avatar_archetype, source, last_updated')
          .eq('user_id', user.id),
      ])
      if (mapRes.data)        setMapData(mapRes.data)
      if (ppRes.data)         setPurposeData(ppRes.data)
      if (sprintRes.data)     setSprintData(sprintRes.data)
      if (foundationRes.data) setFoundationData(foundationRes.data)
      if (actorRes.data)      setClaimedActor(actorRes.data)
      if (horizonRes.data?.length) {
        const profile = {}
        for (const row of horizonRes.data) {
          profile[row.domain] = {
            currentScore:    row.current_score,
            horizonScore:    row.horizon_score,
            horizonGoal:     row.horizon_goal,
            avatarArchetype: row.avatar_archetype,
            source:          row.source,
            lastUpdated:     row.last_updated,
          }
        }
        setHorizonProfile(profile)
      }
    } catch {}
    setDataLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (authLoading || dataLoading) return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex',
      alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading" />
    </div>
  )

  if (!user) return null

  const name = user.user_metadata?.full_name
    || user.email?.split('@')[0]
    || 'You'

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="" />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '112px 40px 160px' }}>

        <div style={{ marginBottom: '64px' }}>
          <Eyebrow>Your profile</Eyebrow>
          <h1 style={{ ...serif, fontSize: 'clamp(36px,5vw,52px)', fontWeight: 300,
            color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: '8px' }}>
            {user?.user_metadata?.role === 'founder'
              ? <a href="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>{name}.</a>
              : <>{name}.</>
            }
          </h1>
          <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic',
            color: 'rgba(15,21,35,0.72)' }}>{user.email}</p>
        </div>

        {/* ── Living Profile Mirror ─────────────────────────────────────────── */}
        {(() => {
          const domainKeys   = ['path','spark','body','finances','connection','inner_game','signal']
          const domainLabels = ['Path','Spark','Body','Finances','Connection','Inner Game','Signal']
          const domains      = domainKeys.map((k, i) => ({ id: k, label: domainLabels[i] }))

          const currentScores = {}
          const horizonScores = {}
          const horizonGoals  = {}
          let lifeHorizon     = null
          let dataSource      = null

          function tierColor(v) {
            if (v == null) return 'rgba(15,21,35,0.28)'
            if (v >= 8)   return '#3B6B9E'
            if (v >= 6.5) return '#5A8AB8'
            if (v >= 5)   return '#8A8070'
            if (v >= 3)   return '#8A7030'
            return '#8A3030'
          }

          function tierLabel(v) {
            if (v == null) return ''
            if (v >= 9)   return 'Exemplar'
            if (v >= 8)   return 'Fluent'
            if (v >= 7)   return 'Capable'
            if (v >= 6.5) return 'Functional+'
            if (v >= 5)   return 'Functional'
            if (v >= 4)   return 'Friction'
            if (v >= 3)   return 'Strain'
            return 'Crisis'
          }

          // Prefer horizon_profile, fall back to map_results
          if (horizonProfile && Object.keys(horizonProfile).length > 0) {
            dataSource = 'profile'
            lifeHorizon = horizonProfile['life']?.horizonGoal || null
            domainKeys.forEach(k => {
              if (horizonProfile[k]?.currentScore !== undefined) currentScores[k] = horizonProfile[k].currentScore
              if (horizonProfile[k]?.horizonScore !== undefined) horizonScores[k] = horizonProfile[k].horizonScore
              if (horizonProfile[k]?.horizonGoal)               horizonGoals[k]  = horizonProfile[k].horizonGoal
            })
          } else if (mapData?.session?.domainData) {
            dataSource = 'map'
            const dd = mapData.session.domainData
            lifeHorizon = mapData.horizon_goal_user || mapData.map_data?.life_horizon_draft || null
            domainKeys.forEach(k => {
              if (dd[k]?.currentScore !== undefined) currentScores[k] = dd[k].currentScore
              if (dd[k]?.horizonScore !== undefined) horizonScores[k] = dd[k].horizonScore
              if (dd[k]?.horizonText)                horizonGoals[k]  = dd[k].horizonText
            })
          } else if (localMapData && Object.keys(localMapData).length > 0) {
            dataSource = 'local'
            domainKeys.forEach(k => {
              if (localMapData[k]?.currentScore !== undefined) currentScores[k] = localMapData[k].currentScore
              if (localMapData[k]?.horizonScore !== undefined) horizonScores[k] = localMapData[k].horizonScore
              if (localMapData[k]?.horizonText)                horizonGoals[k]  = localMapData[k].horizonText
            })
          }

          const hasScores  = Object.keys(currentScores).length > 0
          const hasHorizon = Object.keys(horizonScores).length > 0
          const mapDone    = mapData?.complete || (dataSource === 'profile' && Object.keys(currentScores).length === 7)

          // Contextual next action
          const nextAction = !hasScores
            ? { label: 'Begin The Map', url: '/tools/map' }
            : (dataSource === 'map' || dataSource === 'local') && !mapDone
            ? { label: `Continue The Map — ${Object.keys(currentScores).length} of 7 domains`, url: '/tools/map' }
            : sprintData && ['started','active'].includes(sprintData.status)
            ? { label: 'Your sprint is active', url: '/tools/target-goals' }
            : mapDone
            ? { label: 'Open your morning practice', url: '/tools/foundation' }
            : { label: 'Begin Target Sprint', url: '/tools/target-goals' }

          // True empty
          if (!hasScores) {
            return (
              <div style={{ marginBottom: '56px', padding: '48px 32px',
                background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.15)',
                borderTop: '3px solid rgba(200,146,42,0.25)', borderRadius: '16px',
                textAlign: 'center' }}>
                <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em',
                  color: 'rgba(200,146,42,0.5)', marginBottom: '20px' }}>YOUR MAP IS EMPTY</div>
                <p style={{ ...serif, fontSize: '19px', fontWeight: 300, fontStyle: 'italic',
                  color: 'rgba(15,21,35,0.5)', lineHeight: 1.75, margin: '0 0 28px',
                  maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                  Complete The Map and your profile will come alive here.
                </p>
                <a href="/tools/map" style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em',
                  color: '#A8721A', textDecoration: 'none',
                  padding: '12px 28px', border: '1px solid rgba(200,146,42,0.4)',
                  borderRadius: '40px', background: 'rgba(200,146,42,0.04)' }}>
                  Start The Map →
                </a>
              </div>
            )
          }

          return (
            <div style={{ marginBottom: '64px' }}>

              {/* Life horizon — large, italic, anchoring */}
              {lifeHorizon && (
                <div style={{ marginBottom: '36px', paddingBottom: '32px',
                  borderBottom: '1px solid rgba(200,146,42,0.12)' }}>
                  <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.24em',
                    color: 'rgba(200,146,42,0.6)', marginBottom: '12px' }}>LIFE HORIZON</div>
                  <p style={{ ...serif, fontSize: 'clamp(19px,2.8vw,24px)', fontWeight: 300,
                    fontStyle: 'italic', color: '#0F1523', lineHeight: 1.65, margin: 0 }}>
                    {lifeHorizon}
                  </p>
                </div>
              )}

              {/* Wheel — large, centred, breathing */}
              <div style={{ marginBottom: '12px' }}>
                <HorizonWheel
                  domains={domains}
                  currentScores={currentScores}
                  horizonScores={horizonScores}
                  size={340}
                />
              </div>

              {/* Legend */}
              {hasHorizon && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px',
                  marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '20px', height: '2px', background: 'rgba(200,146,42,0.65)' }} />
                    <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em',
                      color: 'rgba(15,21,35,0.4)' }}>Now</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '20px', height: '0',
                      borderTop: '2px dashed rgba(90,138,184,0.5)' }} />
                    <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em',
                      color: 'rgba(15,21,35,0.4)' }}>Horizon</span>
                  </div>
                </div>
              )}

              {/* Domain rows — breathing, no boxes */}
              <div style={{ marginBottom: '36px' }}>
                {domainKeys.map((k, i) => {
                  const score   = currentScores[k]
                  const horizon = horizonScores[k]
                  const goal    = horizonGoals[k]
                  if (score === undefined) return null
                  const color = tierColor(score)
                  const gap   = horizon !== undefined ? horizon - score : null

                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'flex-start',
                      gap: '16px', padding: '14px 0',
                      borderBottom: '1px solid rgba(200,146,42,0.07)' }}>

                      {/* Domain name */}
                      <div style={{ ...sc, fontSize: '14px', letterSpacing: '0.08em',
                        color: 'rgba(15,21,35,0.6)', width: '106px', flexShrink: 0,
                        paddingTop: '3px' }}>
                        {domainLabels[i]}
                      </div>

                      {/* Horizon goal */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {goal ? (
                          <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic',
                            color: 'rgba(15,21,35,0.62)', lineHeight: 1.6, margin: 0,
                            overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {goal}
                          </p>
                        ) : (
                          <p style={{ ...serif, fontSize: '14px', fontStyle: 'italic',
                            color: 'rgba(15,21,35,0.28)', margin: 0 }}>
                            Horizon not yet set
                          </p>
                        )}
                      </div>

                      {/* Score + gap */}
                      <div style={{ flexShrink: 0, textAlign: 'right', paddingTop: '2px' }}>
                        <div>
                          <span style={{ ...serif, fontSize: '22px', fontWeight: 300,
                            color, lineHeight: 1 }}>{score}</span>
                          {horizon !== undefined && (
                            <span style={{ ...serif, fontSize: '15px',
                              color: 'rgba(90,138,184,0.75)', marginLeft: '5px' }}>
                              → {horizon}
                            </span>
                          )}
                        </div>
                        <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em',
                          color, opacity: 0.75, marginTop: '2px' }}>
                          {tierLabel(score)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Single contextual action */}
              <div style={{ textAlign: 'center', paddingTop: '8px' }}>
                <a href={nextAction.url}
                  style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em',
                    color: '#A8721A', textDecoration: 'none',
                    padding: '13px 28px', border: '1px solid rgba(200,146,42,0.35)',
                    borderRadius: '40px', background: 'rgba(200,146,42,0.04)',
                    display: 'inline-block', transition: 'all 0.2s' }}>
                  {nextAction.label} →
                </a>
              </div>
            </div>
          )
        })()}


        <Slot title="The Map" eyebrow="Life OS" linkLabel="Open" linkUrl="/tools/map">
          <MapSlot mapData={mapData} sprintData={sprintData} />
        </Slot>

        <Slot title="Purpose Piece" eyebrow="Life OS"
          linkLabel="Open" linkUrl="/tools/purpose-piece">
          <PurposePieceSlot purposeData={purposeData} userId={user?.id} />
        </Slot>

        <Slot title="Target Sprint" eyebrow="Life OS"
          linkLabel="Open" linkUrl="/tools/target-goals">
          <TargetSprintSlot sprintData={sprintData} />
        </Slot>

        <div id="foundation">
        <Slot title="Foundation" eyebrow="Life OS"
          linkLabel="Open" linkUrl="/tools/foundation">
          <FoundationSlot foundationData={foundationData} />
        </Slot>
        </div>

        <Slot title="NextUs" eyebrow="The larger work"
          linkLabel="Explore" linkUrl="/nextus" defaultOpen={!!claimedActor || !!purposeData?.profile?.civilisational_statement}>
          <NextUsSlot purposeData={purposeData} userId={user?.id} claimedActor={claimedActor} />
        </Slot>

        <div style={{ textAlign: 'center', paddingTop: '48px',
          borderTop: '1px solid rgba(200,146,42,0.15)', marginTop: '24px' }}>
          <button onClick={signOut}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              ...sc, fontSize: '17px', fontWeight: 600, letterSpacing: '0.18em',
              color: 'rgba(15,21,35,0.72)', padding: '8px 0', textTransform: 'uppercase' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
