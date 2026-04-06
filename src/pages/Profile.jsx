import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../hooks/useSupabase'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

const DOMAIN_LABELS = ['Path', 'Spark', 'Body', 'Finances', 'Relationships', 'Inner Game', 'Outer Game']
const DOMAIN_KEYS   = ['path', 'spark', 'body', 'finances', 'relationships', 'inner_game', 'outer_game']

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
    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em', color: '#A8721A',
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
      fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase',
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
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
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
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em',
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
        <span style={{ ...sc, fontSize: '1rem', fontWeight: 600, color, lineHeight: 1 }}>{score}</span>
        <span style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>/10</span>
        <div style={{ ...serif, fontSize: '12px', color, marginTop: '1px', opacity: 0.85 }}>
          {getTierLabel(score)}
        </div>
      </div>
    </div>
  )
}

// ─── Map spider web ───────────────────────────────────────────────────────────
function MapWeb({ domains, currentScores, horizonScores }) {
  const size = 200
  const cx = size / 2, cy = size / 2
  const maxR = (size / 2) * 0.68
  const n = domains.length

  function pt(i, v) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (Math.min(v ?? 0, 10) / 10) * maxR
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  const currentPts = domains.map((d, i) => pt(i, currentScores[d.id] ?? 0).join(',')).join(' ')
  const horizonPts = domains.map((d, i) => pt(i, horizonScores[d.id] ?? 0).join(',')).join(' ')
  const hasHorizon = Object.values(horizonScores).some(v => v > 0)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
      {[2, 4, 6, 8, 10].map(v => {
        const pts = domains.map((_, i) => pt(i, v).join(',')).join(' ')
        return <polygon key={v} points={pts} fill="none"
          stroke={v === 5 ? 'rgba(138,48,48,0.25)' : 'rgba(200,146,42,0.10)'}
          strokeWidth={v === 5 ? 1.5 : 1}
          strokeDasharray={v === 5 ? '3 3' : 'none'} />
      })}
      {domains.map((_, i) => {
        const [x, y] = pt(i, 10)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke="rgba(200,146,42,0.10)" strokeWidth="1" />
      })}
      {hasHorizon && (
        <polygon points={horizonPts} fill="rgba(90,138,184,0.07)"
          stroke="rgba(90,138,184,0.5)" strokeWidth="1.5" strokeDasharray="4 3" />
      )}
      <polygon points={currentPts} fill="rgba(200,146,42,0.12)"
        stroke="rgba(200,146,42,0.72)" strokeWidth="1.5" />
      {domains.map((d, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2
        const r = maxR + 18
        const x = cx + r * Math.cos(a)
        const y = cy + r * Math.sin(a)
        const s = currentScores[d.id]
        const color = s !== undefined ? getTierColor(s) : 'rgba(15,21,35,0.28)'
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontFamily="'Cormorant SC',Georgia,serif" fontSize="11" fontWeight="600"
            letterSpacing="0.5" fill={color}>
            {d.label.substring(0, 3).toUpperCase()}
          </text>
        )
      })}
    </svg>
  )
}


function MapSlot({ mapData, sprintData }) {
  if (!mapData) return <EmptySlot cta="Begin The Map" ctaUrl="/tools/map" />

  if (!mapData.complete) {
    const dd = mapData.session?.domainData ?? {}
    const domainLabels = ['Path','Spark','Body','Finances','Relationships','Inner Game','Outer Game']
    const domainKeys   = ['path','spark','body','finances','relationships','inner_game','outer_game']
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
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#0F1523' }}>
            {doneCount} of 7 domains scored
          </span>
          {activeDomainLabel && (
            <span style={{ ...serif, fontSize: '14px', fontStyle: 'italic', color: 'rgba(15,21,35,0.55)' }}>
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
                ...sc, fontSize: '11px', letterSpacing: '0.1em',
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
        <a href="/tools/map" style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
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
            <div key={d.key} style={{ ...serif, fontSize: '14px', color: '#8A3030',
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
                <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.55)', letterSpacing: '0.1em' }}>Now</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '0', borderTop: '2px dashed rgba(90,138,184,0.6)' }} />
                <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.55)', letterSpacing: '0.1em' }}>Horizon</span>
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
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em',
                color: 'rgba(15,21,35,0.72)', width: '100px', flexShrink: 0 }}>{d.label}</div>
              <div style={{ flex: 1 }}>
                <ScoreBar label="" score={d.score} horizonScore={d.horizon} />
              </div>
              <div style={{ ...sc, fontSize: '13px', flexShrink: 0, minWidth: '70px', textAlign: 'right' }}>
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
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: '#A8721A',
            textTransform: 'uppercase', marginBottom: '6px' }}>Your map is ready</div>
          <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic',
            color: 'rgba(15,21,35,0.72)', margin: '0 0 10px' }}>
            You have your map. Now choose your focus.
          </p>
          <a href="/tools/target-goals" style={{ ...sc, fontSize: '13px',
            letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}>
            Begin Target Sprint {'→'}
          </a>
        </div>
      )}

      {mapData.completed_at && (
        <p style={{ ...serif, fontSize: '13px', fontStyle: 'italic',
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
        .catch(() => {})
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
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A',
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
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#0F1523' }}>
            {doneCount} of 3 stages complete
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {stages.map(s => (
            <span key={s.label} style={{
              ...sc, fontSize: '11px', letterSpacing: '0.1em',
              padding: '3px 10px', borderRadius: '40px',
              background: s.done ? 'rgba(45,106,79,0.08)' : 'rgba(200,146,42,0.08)',
              border: `1px solid ${s.done ? 'rgba(45,106,79,0.35)' : 'rgba(200,146,42,0.35)'}`,
              color: s.done ? '#2D6A4F' : '#A8721A',
            }}>
              {s.done ? '✓ ' : ''}{s.label}
            </span>
          ))}
        </div>
        <a href="/tools/purpose-piece" style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
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
                  <span style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
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
        <p style={{ ...serif, fontSize: '13px', fontStyle: 'italic',
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
      <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.08em',
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
            <span style={{ ...serif, fontSize: '14px', fontStyle: 'italic',
              color: 'rgba(15,21,35,0.55)' }}>
              {endLabel || new Date(targetDate).toLocaleDateString('en-GB',
                { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
        {daysLabel && (
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em',
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
                <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em',
                  color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>Tasks</span>
                <span style={{ ...sc, fontSize: '12px', color: doneTasks === totalTasks ? '#2D6A4F' : '#A8721A' }}>
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
                <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em',
                  color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>Milestones</span>
                <span style={{ ...sc, fontSize: '12px', color: doneMilestones === totalMilestones ? '#2D6A4F' : '#A8721A' }}>
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
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: '#A8721A',
            textTransform: 'uppercase', marginBottom: '6px' }}>
            Next move — {nextMove.domain}
          </div>
          <p style={{ ...serif, fontSize: '15px', fontWeight: 300,
            color: '#0F1523', lineHeight: 1.6, margin: 0 }}>
            {nextMove.task}
          </p>
          <a href="/tools/target-goals" style={{ ...sc, fontSize: '12px',
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
              <span style={{ ...sc, fontSize: '14px', letterSpacing: '0.10em',
                color: domainComplete ? '#2D6A4F' : '#A8721A' }}>
                {domainComplete ? '✓ ' : ''}{label}
              </span>
              {tasks.length > 0 && (
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.08em',
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
              <p style={{ ...serif, fontSize: '13px', fontStyle: 'italic',
                color: 'rgba(15,21,35,0.45)', margin: '6px 0 0' }}>
                Still needed: {missing.join(', ')}.{' '}
                <a href="/tools/target-goals" style={{ color: '#A8721A', textDecoration: 'none' }}>
                  Set up {'→'}
                </a>
              </p>
            )}

            {/* Milestone count */}
            {milestones.length > 0 && (
              <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.08em',
                color: 'rgba(15,21,35,0.45)', marginTop: '8px' }}>
                {mDone}/{milestones.length} milestones
              </div>
            )}
          </div>
        )
      })}

      {sprintData.created_at && (
        <p style={{ ...serif, fontSize: '13px', fontStyle: 'italic',
          color: 'rgba(15,21,35,0.45)', marginTop: '8px' }}>
          Started {new Date(sprintData.created_at).toLocaleDateString('en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}

function NextUsSlot({ purposeData }) {
  const profile   = purposeData?.profile ?? {}
  const tentative = purposeData?.session?.tentative ?? {}
  const statement = profile.civilisational_statement
  const archetype = tentative.archetype?.archetype
  const domain    = tentative.domain?.domain
  const scale     = tentative.scale?.scale

  if (!statement && !archetype) {
    return (
      <div>
        <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic',
          color: 'rgba(15,21,35,0.72)', marginBottom: '16px', lineHeight: 1.7 }}>
          Complete Purpose Piece to see where your contribution belongs in the larger work.
        </p>
        <a href="/tools/purpose-piece"
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
            color: '#A8721A', textDecoration: 'none' }}>
          Begin Purpose Piece {'\u2192'}
        </a>
      </div>
    )
  }

  return (
    <div>
      {statement && (
        <>
          <Eyebrow>Your civilisational statement</Eyebrow>
          <div style={{ borderLeft: '2px solid rgba(200,146,42,0.35)', paddingLeft: '16px',
            marginBottom: '20px' }}>
            <p style={{ ...serif, fontSize: '16px', fontStyle: 'italic', fontWeight: 300,
              color: '#0F1523', lineHeight: 1.75, margin: 0 }}>{statement}</p>
          </div>
        </>
      )}
      {(archetype || domain || scale) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {[archetype, domain, scale].filter(Boolean).map((v, i) => (
            <span key={i} style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em',
              color: '#A8721A', background: 'rgba(200,146,42,0.07)',
              border: '1px solid rgba(200,146,42,0.25)', borderRadius: '40px',
              padding: '5px 14px' }}>{v}</span>
          ))}
        </div>
      )}
      <a href="/nextus" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
        color: '#A8721A', textDecoration: 'none' }}>
        Explore NextUs {'\u2192'}
      </a>
    </div>
  )
}

export function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [mapData,     setMapData]     = useState(null)
  const [purposeData, setPurposeData] = useState(null)
  const [sprintData,  setSprintData]  = useState(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login?redirect=/profile'); return }
    loadData()
  }, [user, authLoading])

  async function loadData() {
    setDataLoading(true)
    try {
      const [mapRes, ppRes, sprintRes] = await Promise.all([
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
      ])
      if (mapRes.data)    setMapData(mapRes.data)
      if (ppRes.data)     setPurposeData(ppRes.data)
      if (sprintRes.data) setSprintData(sprintRes.data)
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
      <Nav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '112px 40px 160px' }}>

        <div style={{ marginBottom: '64px' }}>
          <Eyebrow>Your profile</Eyebrow>
          <h1 style={{ ...serif, fontSize: 'clamp(36px,5vw,52px)', fontWeight: 300,
            color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: '8px' }}>
            {name}.
          </h1>
          <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic',
            color: 'rgba(15,21,35,0.72)' }}>{user.email}</p>
        </div>

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

        <Slot title="NextUs" eyebrow="The larger work"
          linkLabel="Explore" linkUrl="/nextus" defaultOpen={false}>
          <NextUsSlot purposeData={purposeData} />
        </Slot>

        <div style={{ textAlign: 'center', paddingTop: '48px',
          borderTop: '1px solid rgba(200,146,42,0.15)', marginTop: '24px' }}>
          <button onClick={signOut}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em',
              color: 'rgba(15,21,35,0.72)', padding: '8px 0', textTransform: 'uppercase' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
