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

function MapSlot({ mapData }) {
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
  const focus    = mapMeta.focus_domains ?? []
  const stage    = mapMeta.stage
  const nextStep = mapMeta.next_step
  const overall  = mapMeta.overall_reflection

  const scores = DOMAIN_KEYS.map((k, i) => ({
    key: k, label: DOMAIN_LABELS[i],
    score: dd[k]?.currentScore, horizon: dd[k]?.horizonScore,
  })).filter(d => d.score !== undefined)

  return (
    <div>
      <StatusBadge status="complete" />
      {stage && (
        <div style={{ marginBottom: '20px', padding: '14px 18px',
          background: 'rgba(200,146,42,0.04)', borderRadius: '10px',
          border: '1px solid rgba(200,146,42,0.18)' }}>
          <Eyebrow>Stage</Eyebrow>
          <div style={{ ...serif, fontSize: '18px', fontWeight: 300, color: '#0F1523' }}>{stage}</div>
          {nextStep && (
            <div style={{ ...serif, fontSize: '15px', fontStyle: 'italic',
              color: 'rgba(15,21,35,0.72)', marginTop: '6px', lineHeight: 1.6 }}>{nextStep}</div>
          )}
        </div>
      )}

      {scores.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <Eyebrow>Seven domains</Eyebrow>
          {scores.map(d => (
            <ScoreBar key={d.key} label={d.label} score={d.score} horizonScore={d.horizon} />
          ))}
          {focus.length > 0 && (
            <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px',
              alignItems: 'center' }}>
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em',
                color: 'rgba(15,21,35,0.55)' }}>Focus:</span>
              {focus.map(f => {
                const idx = DOMAIN_KEYS.indexOf(f)
                return (
                  <span key={f} style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em',
                    color: '#A8721A', background: 'rgba(200,146,42,0.07)',
                    border: '1px solid rgba(200,146,42,0.25)', borderRadius: '40px',
                    padding: '3px 12px' }}>
                    {idx >= 0 ? DOMAIN_LABELS[idx] : f}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {horizon && (
        <>
          <Rule />
          <Eyebrow>Horizon Goal</Eyebrow>
          <div style={{ borderLeft: '2px solid rgba(200,146,42,0.35)', paddingLeft: '16px' }}>
            <p style={{ ...serif, fontSize: '16px', fontWeight: 300, fontStyle: 'italic',
              color: '#0F1523', lineHeight: 1.75, margin: 0 }}>{horizon}</p>
          </div>
        </>
      )}

      {overall && (
        <>
          <Rule />
          <Eyebrow>Reflection</Eyebrow>
          <p style={{ ...serif, fontSize: '15px', fontWeight: 300,
            color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, margin: 0 }}>
            {overall.split('\n\n')[0]}
          </p>
        </>
      )}

      {mapData.completed_at && (
        <p style={{ ...serif, fontSize: '13px', fontStyle: 'italic',
          color: 'rgba(15,21,35,0.55)', marginTop: '16px' }}>
          Completed {new Date(mapData.completed_at).toLocaleDateString('en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}

function PurposePieceSlot({ purposeData }) {
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

  const tentative      = purposeData.session?.tentative ?? {}
  const profile        = purposeData.profile ?? {}
  const archetype      = tentative.archetype?.archetype
  const secondary      = tentative.archetype?.secondary
  const domain         = tentative.domain?.domain
  const scale          = tentative.scale?.scale
  const statement      = profile.civilisational_statement
  const responsibility = profile.responsibility
  const actions        = profile.actions

  return (
    <div>
      <StatusBadge status="complete" />
      {(archetype || domain || scale) && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {archetype && (
            <div style={{ padding: '14px 18px', background: 'rgba(200,146,42,0.05)',
              border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', flex: '1 1 130px' }}>
              <Eyebrow>Archetype</Eyebrow>
              <div style={{ ...serif, fontSize: '20px', fontWeight: 300, color: '#0F1523' }}>
                {archetype}
                {secondary && (
                  <span style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.55)',
                    fontStyle: 'italic', marginLeft: '8px' }}>+ {secondary}</span>
                )}
              </div>
            </div>
          )}
          {domain && (
            <div style={{ padding: '14px 18px', background: 'rgba(200,146,42,0.05)',
              border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', flex: '1 1 130px' }}>
              <Eyebrow>Domain</Eyebrow>
              <div style={{ ...serif, fontSize: '20px', fontWeight: 300, color: '#0F1523' }}>{domain}</div>
            </div>
          )}
          {scale && (
            <div style={{ padding: '14px 18px', background: 'rgba(200,146,42,0.05)',
              border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', flex: '1 1 130px' }}>
              <Eyebrow>Scale</Eyebrow>
              <div style={{ ...serif, fontSize: '20px', fontWeight: 300, color: '#0F1523' }}>{scale}</div>
            </div>
          )}
        </div>
      )}

      {statement && (
        <>
          <Eyebrow>Your Purpose Piece</Eyebrow>
          <div style={{ borderLeft: '2px solid rgba(200,146,42,0.35)', paddingLeft: '16px',
            marginBottom: '20px' }}>
            <p style={{ ...serif, fontSize: '16px', fontStyle: 'italic', fontWeight: 300,
              color: '#0F1523', lineHeight: 1.75, margin: 0 }}>{statement}</p>
          </div>
        </>
      )}

      {responsibility && (
        <>
          <Rule />
          <Eyebrow>The responsibility</Eyebrow>
          <p style={{ ...serif, fontSize: '15px', fontWeight: 300,
            color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, margin: 0 }}>{responsibility}</p>
        </>
      )}

      {actions && (actions.light || actions.medium || actions.deep) && (
        <>
          <Rule />
          <Eyebrow>Actions</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Light',  value: actions.light  },
              { label: 'Medium', value: actions.medium },
              { label: 'Deep',   value: actions.deep   },
            ].filter(a => a.value).map(a => (
              <div key={a.label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A',
                  background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.25)',
                  borderRadius: '40px', padding: '3px 10px', flexShrink: 0, marginTop: '2px' }}>
                  {a.label}
                </span>
                <span style={{ ...serif, fontSize: '15px', color: '#0F1523', lineHeight: 1.6 }}>
                  {a.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {purposeData.completed_at && (
        <p style={{ ...serif, fontSize: '13px', fontStyle: 'italic',
          color: 'rgba(15,21,35,0.55)', marginTop: '16px' }}>
          Completed {new Date(purposeData.completed_at).toLocaleDateString('en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}

function TargetSprintSlot({ sprintData }) {
  if (!sprintData) return <EmptySlot cta="Begin Target Sprint" ctaUrl="/tools/target-goals" />

  const status = sprintData.status || 'started'

  const dd       = sprintData.domain_data ?? {}
  const domains  = sprintData.domains ?? []

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
  const endLabel = sprintData.end_date_label
  const targetDate = sprintData.target_date

  return (
    <div>
      <StatusBadge status={status === 'complete' ? 'complete' : 'active'} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px',
        marginBottom: '20px', flexWrap: 'wrap' }}>
        <Eyebrow style={{ marginBottom: 0 }}>90-day sprint</Eyebrow>
        {(endLabel || targetDate) && (
          <span style={{ ...serif, fontSize: '14px', fontStyle: 'italic',
            color: 'rgba(15,21,35,0.72)' }}>
            {endLabel || new Date(targetDate).toLocaleDateString('en-GB',
              { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
      </div>

      {domains.map(domainId => {
        const d          = dd[domainId] ?? {}
        const idx        = DOMAIN_KEYS.indexOf(domainId)
        const label      = idx >= 0 ? DOMAIN_LABELS[idx] : domainId
        const goal       = d.targetGoal
        const horizon    = d.horizonText
        const milestones = d.milestones ?? []
        const checked    = d.milestoneChecked ?? {}
        const doneCount  = Object.values(checked).filter(Boolean).length

        return (
          <div key={domainId} style={{ marginBottom: '12px', padding: '16px 18px',
            background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.18)',
            borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '10px', gap: '10px' }}>
              <span style={{ ...sc, fontSize: '14px', letterSpacing: '0.10em', color: '#A8721A' }}>
                {label}
              </span>
              {milestones.length > 0 && (
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em',
                  color: 'rgba(15,21,35,0.72)', background: 'rgba(200,146,42,0.08)',
                  border: '1px solid rgba(200,146,42,0.18)', borderRadius: '40px',
                  padding: '3px 10px', flexShrink: 0 }}>
                  {doneCount}/{milestones.length} milestones
                </span>
              )}
            </div>
            {goal && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em',
                  color: 'rgba(15,21,35,0.55)', marginBottom: '4px' }}>Target goal</div>
                <p style={{ ...serif, fontSize: '15px', fontWeight: 300,
                  color: '#0F1523', lineHeight: 1.65, margin: 0 }}>{goal}</p>
              </div>
            )}
            {horizon && (
              <div>
                <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em',
                  color: 'rgba(15,21,35,0.55)', marginBottom: '4px' }}>Horizon</div>
                <p style={{ ...serif, fontSize: '14px', fontStyle: 'italic',
                  color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: 0 }}>{horizon}</p>
              </div>
            )}
          </div>
        )
      })}

      {sprintData.created_at && (
        <p style={{ ...serif, fontSize: '13px', fontStyle: 'italic',
          color: 'rgba(15,21,35,0.55)', marginTop: '4px' }}>
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
          <MapSlot mapData={mapData} />
        </Slot>

        <Slot title="Purpose Piece" eyebrow="Life OS"
          linkLabel="Open" linkUrl="/tools/purpose-piece">
          <PurposePieceSlot purposeData={purposeData} />
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
