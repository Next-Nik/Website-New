import { useState, useRef, useEffect, useCallback } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAINS = [
  { id: 'path',          label: 'Path',          question: 'Am I on my path \u2014 and actually moving?',         fractal: 'Vision' },
  { id: 'spark',         label: 'Spark',         question: 'Is the fire on?',                                    fractal: 'Human Being' },
  { id: 'body',          label: 'Body',          question: 'How is this living system doing?',                   fractal: 'Nature' },
  { id: 'finances',      label: 'Finances',      question: 'Do I have the agency to act on what matters?',       fractal: 'Finance & Economy' },
  { id: 'relationships', label: 'Relationships', question: 'Am I truly known by anyone?',                        fractal: 'Society' },
  { id: 'inner_game',    label: 'Inner Game',    question: 'Are my stories tending me, or running me?',          fractal: 'Legacy' },
  { id: 'outer_game',    label: 'Outer Game',    question: 'Is what I\u2019m broadcasting aligned with who I am?', fractal: 'Society' },
]

const DOMAIN_COLORS = {
  path:          '#7B9E87',
  spark:         '#C8922A',
  body:          '#6B9BC3',
  finances:      '#9B8B6E',
  relationships: '#B07090',
  inner_game:    '#8B7BB0',
  outer_game:    '#7B9BB0',
}

const SCORE_TIERS = [
  { min: 0,  max: 2,  label: 'Dormant',    color: '#C05050' },
  { min: 3,  max: 4,  label: 'Struggling', color: '#D08040' },
  { min: 5,  max: 6,  label: 'Functional', color: '#C8922A' },
  { min: 7,  max: 8,  label: 'Thriving',   color: '#7B9E87' },
  { min: 9,  max: 10, label: 'Flourishing',color: '#4A8A6A' },
]

function getTier(score) {
  return SCORE_TIERS.find(t => score >= t.min && score <= t.max) || SCORE_TIERS[0]
}

const LS_KEY = 'lifeos_themap_session_v2'

// ─── Domain Scale (hourglass visual) ─────────────────────────────────────────

function DomainScale({ domainId, score, label }) {
  const tier = getTier(score)
  const pct  = (score / 10) * 100

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 0',
      borderBottom: '1px solid rgba(200,146,42,0.08)',
    }}>
      {/* Label */}
      <div style={{ width: '88px', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--font-sc)',
          fontSize: '0.6875rem',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}>{label}</div>
      </div>

      {/* Scale track */}
      <div style={{ flex: 1, position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
        {/* Track background */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          height: '4px',
          background: 'rgba(200,146,42,0.12)',
          borderRadius: '2px',
        }} />
        {/* Fill */}
        <div style={{
          position: 'absolute',
          left: 0,
          width: `${pct}%`,
          height: '4px',
          background: tier.color,
          borderRadius: '2px',
          transition: 'width 0.6s ease, background 0.4s ease',
        }} />
        {/* Thumb */}
        <div style={{
          position: 'absolute',
          left: `calc(${pct}% - 7px)`,
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: '#FAFAF7',
          border: `2px solid ${tier.color}`,
          boxShadow: `0 0 0 3px ${tier.color}22`,
          transition: 'left 0.6s ease, border-color 0.4s ease',
          zIndex: 1,
        }} />
        {/* Tick marks */}
        {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
          <div key={n} style={{
            position: 'absolute',
            left: `${(n/10)*100}%`,
            width: '1px',
            height: n === 0 || n === 10 ? '10px' : '5px',
            background: 'rgba(200,146,42,0.2)',
            transform: 'translateX(-0.5px)',
            top: n === 0 || n === 10 ? '-3px' : '0px',
          }} />
        ))}
      </div>

      {/* Score + tier */}
      <div style={{ width: '72px', flexShrink: 0, textAlign: 'right' }}>
        <span style={{
          fontFamily: 'var(--font-sc)',
          fontSize: '1.125rem',
          fontWeight: 600,
          color: tier.color,
          lineHeight: 1,
        }}>{score}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>/10</span>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.625rem',
          color: tier.color,
          letterSpacing: '0.06em',
          marginTop: '2px',
          opacity: 0.8,
        }}>{tier.label}</div>
      </div>
    </div>
  )
}

// ─── SVG Domain Wheel ─────────────────────────────────────────────────────────

function DomainWheel({ scores }) {
  const cx = 130, cy = 130, r = 95, innerR = 28
  const count = DOMAINS.length
  const angleStep = (2 * Math.PI) / count
  const startAngle = -Math.PI / 2

  const points = DOMAINS.map((d, i) => {
    const angle  = startAngle + i * angleStep
    const score  = scores[d.id] ?? 0
    const ratio  = score / 10
    const pr     = innerR + (r - innerR) * ratio
    return {
      x: cx + pr * Math.cos(angle),
      y: cy + pr * Math.sin(angle),
      outerX: cx + r * Math.cos(angle),
      outerY: cy + r * Math.sin(angle),
      labelX: cx + (r + 18) * Math.cos(angle),
      labelY: cy + (r + 18) * Math.sin(angle),
      angle,
      domain: d,
      score,
    }
  })

  const polygon = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox="0 0 260 260" width="100%" style={{ maxWidth: '240px', display: 'block', margin: '0 auto' }}>
      {/* Radial grid lines */}
      {points.map((p, i) => (
        <line key={i}
          x1={cx} y1={cy}
          x2={p.outerX} y2={p.outerY}
          stroke="rgba(200,146,42,0.12)" strokeWidth="1"
        />
      ))}

      {/* Concentric rings at 25%, 50%, 75%, 100% */}
      {[0.25, 0.5, 0.75, 1].map(ratio => {
        const ringR = innerR + (r - innerR) * ratio
        return (
          <circle key={ratio}
            cx={cx} cy={cy} r={ringR}
            fill="none"
            stroke={ratio === 1 ? 'rgba(200,146,42,0.25)' : 'rgba(200,146,42,0.08)'}
            strokeWidth="1"
            strokeDasharray={ratio < 1 ? '2 3' : undefined}
          />
        )
      })}

      {/* Score polygon */}
      <polygon
        points={polygon}
        fill="rgba(200,146,42,0.12)"
        stroke="rgba(200,146,42,0.55)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Domain score dots */}
      {points.map((p, i) => {
        const tier = getTier(p.score)
        return (
          <circle key={i}
            cx={p.x} cy={p.y} r="4"
            fill={p.score > 0 ? tier.color : 'rgba(200,146,42,0.2)'}
            stroke="#FAFAF7" strokeWidth="1.5"
          />
        )
      })}

      {/* Centre dot */}
      <circle cx={cx} cy={cy} r={innerR}
        fill="#FAFAF7"
        stroke="rgba(200,146,42,0.2)"
        strokeWidth="1"
      />
      <text x={cx} y={cy - 4}
        textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: 'Georgia, serif', fontSize: '7px', fill: 'rgba(15,21,35,0.4)', letterSpacing: '0.1em' }}
      >LIFE OS</text>
      <text x={cx} y={cy + 7}
        textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: 'Georgia, serif', fontSize: '7px', fill: 'rgba(15,21,35,0.3)', letterSpacing: '0.08em' }}
      >MAP</text>

      {/* Labels */}
      {points.map((p, i) => {
        const anchor = p.labelX < cx - 4 ? 'end' : p.labelX > cx + 4 ? 'start' : 'middle'
        return (
          <text key={i}
            x={p.labelX} y={p.labelY}
            textAnchor={anchor}
            dominantBaseline="middle"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '7.5px',
              fill: p.score > 0 ? 'rgba(15,21,35,0.7)' : 'rgba(15,21,35,0.3)',
              letterSpacing: '0.04em',
            }}
          >
            {p.domain.label}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Live Scores Panel ────────────────────────────────────────────────────────

function LiveScoresPanel({ scores, focusDomains = [] }) {
  const scored = DOMAINS.filter(d => scores[d.id] !== undefined)
  if (scored.length === 0) return null

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.2)',
      borderRadius: '10px',
      padding: '20px 20px 12px',
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(200,146,42,0.06)',
      animation: 'fadeUp 0.4s ease-out',
    }}>
      <div style={{
        fontFamily: 'var(--font-sc)',
        fontSize: '0.625rem',
        letterSpacing: '0.18em',
        color: 'var(--gold-dk)',
        textTransform: 'uppercase',
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(200,146,42,0.12)',
      }}>
        Your Map
      </div>

      {/* Wheel + Scales side by side on wider screens */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Wheel */}
        <div style={{ flex: '0 0 auto', width: '160px' }}>
          <DomainWheel scores={scores} />
        </div>

        {/* Domain scales */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          {scored.map(d => (
            <DomainScale
              key={d.id}
              domainId={d.id}
              score={scores[d.id]}
              label={d.label}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Results Card ─────────────────────────────────────────────────────────────

function ResultsCard({ mapData, session, onSignIn, isSignedIn }) {
  const [horizonText, setHorizonText]     = useState('')
  const [draftVisible, setDraftVisible]   = useState(false)
  const [horizonLocked, setHorizonLocked] = useState(false)
  const { user } = useAuth()

  const scores       = session?.domainData || {}
  const focusDomains = mapData.focus_domains || []

  async function lockHorizon() {
    if (!horizonText.trim()) return
    try { localStorage.setItem('lifeos_map_horizon_locked', horizonText) } catch {}
    if (user?.id) {
      try {
        const { data: rows } = await supabase
          .from('map_results')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
        if (rows?.[0]?.id) {
          await supabase.from('map_results')
            .update({ horizon_goal_user: horizonText })
            .eq('id', rows[0].id)
        }
      } catch {}
    }
    setHorizonLocked(true)
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.25)',
      borderLeft: '3px solid rgba(200,146,42,0.55)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 16px rgba(200,146,42,0.08)',
      animation: 'fadeUp 0.5s ease-out',
    }}>
      {/* Hero */}
      <div style={{
        padding: '28px 28px 22px',
        borderBottom: '1px solid rgba(200,146,42,0.12)',
        background: 'rgba(200,146,42,0.03)',
      }}>
        <div style={{
          fontFamily: 'var(--font-sc)',
          fontSize: '0.5625rem',
          letterSpacing: '0.22em',
          color: 'var(--gold-dk)',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>Your Life OS Map</div>
        <div style={{
          display: 'inline-block',
          border: '1px solid rgba(200,146,42,0.35)',
          borderRadius: '6px',
          padding: '4px 14px',
          fontFamily: 'var(--font-sc)',
          fontSize: '0.5625rem',
          letterSpacing: '0.16em',
          color: 'var(--gold-dk)',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>{mapData.stage}</div>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.9375rem',
          fontStyle: 'italic',
          color: 'var(--text-meta)',
          lineHeight: 1.75,
          margin: 0,
        }}>{mapData.stage_description}</p>
      </div>

      {/* Full wheel + all scales */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
        <div style={{
          fontFamily: 'var(--font-sc)',
          fontSize: '0.5625rem',
          letterSpacing: '0.18em',
          color: 'var(--gold-dk)',
          textTransform: 'uppercase',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(200,146,42,0.12)',
        }}>Your Seven Domains</div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 auto', width: '200px' }}>
            <DomainWheel scores={Object.fromEntries(
              DOMAINS.map(d => [d.id, scores[d.id]?.score ?? 0])
            )} />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            {DOMAINS.map(d => {
              const data      = scores[d.id]
              if (!data) return null
              const isFocus   = focusDomains.includes(d.id)
              return (
                <div key={d.id} style={{
                  background: isFocus ? 'rgba(200,146,42,0.04)' : 'transparent',
                  borderLeft: isFocus ? '2px solid rgba(200,146,42,0.45)' : 'none',
                  paddingLeft: isFocus ? '8px' : '0',
                  borderRadius: isFocus ? '0 4px 4px 0' : '0',
                  marginBottom: '2px',
                }}>
                  <DomainScale
                    domainId={d.id}
                    score={data.score ?? 0}
                    label={isFocus ? `\u25B8 ${d.label}` : d.label}
                  />
                  {isFocus && (
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.6875rem',
                      fontStyle: 'italic',
                      color: 'var(--text-muted)',
                      paddingBottom: '6px',
                    }}>{d.question}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* What the pattern shows */}
      {mapData.overall_reflection && (
        <Section label="What The Pattern Shows">
          {mapData.overall_reflection.split('\n\n').map((p, i) => (
            <p key={i} style={{ margin: i > 0 ? '12px 0 0' : 0, lineHeight: 1.8, color: 'var(--text-meta)' }}>{p}</p>
          ))}
        </Section>
      )}

      {/* Focus domains */}
      {focusDomains.length > 0 && (
        <Section label="Your Three Focus Domains">
          <p style={{ color: 'var(--gold-dk)', fontFamily: 'var(--font-sc)', fontSize: '0.9375rem', letterSpacing: '0.04em' }}>
            {focusDomains.map(id => DOMAINS.find(d => d.id === id)?.label).filter(Boolean).join('  \u00B7  ')}
          </p>
          {mapData.focus_reasoning && (
            <p style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.75 }}>
              {mapData.focus_reasoning}
            </p>
          )}
        </Section>
      )}

      {/* Brain insight */}
      {mapData.brain_insight && (
        <Section label="What To Learn">
          <p style={{ color: 'var(--text-meta)', lineHeight: 1.8, fontSize: '0.9375rem' }}>{mapData.brain_insight}</p>
        </Section>
      )}

      {/* Next step */}
      {mapData.next_step && (
        <div style={{
          padding: '20px 28px 24px',
          textAlign: 'center',
          borderTop: '1px solid rgba(200,146,42,0.08)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          fontStyle: 'italic',
          color: 'var(--text-muted)',
          lineHeight: 1.7,
        }}>
          {mapData.next_step}
        </div>
      )}

      {/* Life Horizon */}
      {mapData.life_horizon_draft && (
        <Section label="Your Life Horizon">
          <textarea
            value={horizonText}
            onChange={e => setHorizonText(e.target.value)}
            disabled={horizonLocked}
            placeholder={'Write your own Life Horizon here \u2014 in your own voice, your own words.'}
            rows={4}
            style={{
              width: '100%',
              padding: '14px 16px',
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              fontStyle: 'italic',
              fontWeight: 300,
              color: 'var(--text-meta)',
              background: '#FFFFFF',
              border: horizonLocked ? '1px solid rgba(200,146,42,0.35)' : '1.5px dashed rgba(200,146,42,0.45)',
              borderRadius: '10px',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.7,
              marginBottom: '8px',
              opacity: horizonLocked ? 0.7 : 1,
            }}
          />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '12px' }}>
            This is yours. Edit it until it sounds like you.
          </p>
          <button
            onClick={() => setDraftVisible(v => !v)}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              fontStyle: 'italic',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: '12px',
            }}
          >
            {draftVisible ? 'Hide draft \u2191' : 'See what The Map drafted \u2192'}
          </button>
          {draftVisible && (
            <div style={{
              padding: '14px 16px',
              background: 'rgba(200,146,42,0.03)',
              border: '1px solid rgba(200,146,42,0.18)',
              borderRadius: '10px',
              marginBottom: '12px',
            }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '10px' }}>
                {mapData.life_horizon_draft}
              </p>
              <button
                onClick={() => { setHorizonText(mapData.life_horizon_draft); setDraftVisible(false) }}
                style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--gold-dk)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Use this as my starting point \u2192
              </button>
            </div>
          )}
          {!horizonLocked && horizonText.trim() && (
            <button onClick={lockHorizon} style={{
              display: 'block',
              padding: '12px 24px',
              borderRadius: '40px',
              border: '1.5px solid rgba(200,146,42,0.78)',
              background: 'rgba(200,146,42,0.05)',
              color: 'var(--gold-dk)',
              fontFamily: 'var(--font-sc)',
              fontSize: '0.8125rem',
              letterSpacing: '0.12em',
              cursor: 'pointer',
              marginTop: '4px',
            }}>
              Lock this as my Life Horizon \u2713
            </button>
          )}
          {horizonLocked && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '8px' }}>
              <span style={{ color: 'var(--gold-dk)', fontStyle: 'normal', fontFamily: 'var(--font-sc)', fontSize: '0.8125rem', letterSpacing: '0.1em' }}>\u2713 Locked.</span>{' '}
              This is your Life Horizon.
            </p>
          )}
        </Section>
      )}

      {/* Sign-in gate for anonymous users */}
      {!isSignedIn && (
        <div style={{
          padding: '28px 28px 32px',
          borderTop: '1px solid rgba(200,146,42,0.12)',
          background: 'rgba(200,146,42,0.03)',
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.5625rem', letterSpacing: '0.22em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '12px' }}>
            Full Map
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--text-meta)', lineHeight: 1.8, marginBottom: '20px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            Sign in to save your map and access your full results.
          </p>
          <button onClick={onSignIn} style={{
            padding: '14px 32px',
            borderRadius: '40px',
            border: '1.5px solid rgba(200,146,42,0.78)',
            background: 'rgba(200,146,42,0.05)',
            color: 'var(--gold-dk)',
            fontFamily: 'var(--font-sc)',
            fontSize: '0.875rem',
            letterSpacing: '0.14em',
            cursor: 'pointer',
          }}>
            Sign in to save \u2192
          </button>
        </div>
      )}
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
      <div style={{
        fontFamily: 'var(--font-sc)',
        fontSize: '0.5625rem',
        letterSpacing: '0.18em',
        color: 'var(--gold-dk)',
        textTransform: 'uppercase',
        marginBottom: '10px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(200,146,42,0.12)',
      }}>{label}</div>
      {children}
    </div>
  )
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({ mode, onDismiss }) {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,21,35,0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#FAFAF7',
        border: '1.5px solid rgba(200,146,42,0.6)',
        borderRadius: '14px',
        padding: '40px 32px 32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
      }}>
        <span style={{
          display: 'block',
          fontFamily: 'var(--font-sc)',
          fontSize: '0.625rem',
          letterSpacing: '0.2em',
          color: 'var(--gold-dk)',
          textTransform: 'uppercase',
          marginBottom: '14px',
        }}>The Map</span>
        <h2 style={{ fontFamily: 'var(--font-sc)', fontSize: '1.375rem', fontWeight: 400, color: 'var(--text)', marginBottom: '10px' }}>
          {mode === 'results' ? 'Your map is ready.' : 'Sign in to save your map.'}
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '24px' }}>
          Your results are saved to your profile so you can return any time.
        </p>
        <a
          href={`/login?redirect=${returnUrl}`}
          style={{
            display: 'block',
            padding: '14px 24px',
            borderRadius: '40px',
            border: '1.5px solid rgba(200,146,42,0.78)',
            background: 'rgba(200,146,42,0.05)',
            color: 'var(--gold-dk)',
            fontFamily: 'var(--font-sc)',
            fontSize: '0.875rem',
            letterSpacing: '0.14em',
            textDecoration: 'none',
            marginBottom: '12px',
          }}
        >
          Sign in or create account \u2192
        </a>

      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MapPage() {
  const { user, loading: authLoading } = useAuth()

  const [messages,      setMessages]      = useState([])
  const [input,         setInput]         = useState('')
  const [thinking,      setThinking]      = useState(false)
  const [session,       setSession]       = useState(null)
  const [liveScores,    setLiveScores]    = useState({})
  const [phaseLabel,    setPhaseLabel]    = useState('')
  const [progressPct,   setProgressPct]  = useState(0)
  const [complete,      setComplete]      = useState(false)
  const [mapData,       setMapData]       = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode,      setAuthMode]      = useState('save')
  const [started,       setStarted]       = useState(false)
  const [pendingMap,    setPendingMap]    = useState(null)

  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const sessionRef  = useRef(null)

  // Keep sessionRef in sync for use in async callbacks
  useEffect(() => { sessionRef.current = session }, [session])

  // Scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, thinking])

  // Auto-start once auth resolves
  useEffect(() => {
    if (!authLoading && !started) {
      if (user) {
        setStarted(true)
        startConversation()
      } else {
        // Not signed in — show modal then start
        setShowAuthModal(true)
        setAuthMode('start')
      }
    }
  }, [authLoading, user])

  function dismissAuthAndStart() {
    setShowAuthModal(false)
    setStarted(true)
    startConversation()
  }

  async function startConversation() {
    try {
      const data = await callAPI([], null)
      handleResponse(data)
    } catch {
      addMessage('assistant', 'Something went wrong. Please refresh and try again.')
    }
  }

  async function callAPI(msgs, sess) {
    const res = await fetch('/tools/map/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages: msgs, session: sess }),
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }

  function handleResponse(data) {
    // Update session
    if (data.session) {
      setSession(data.session)
      // Extract live scores from domainData
      if (data.session.domainData) {
        const scores = {}
        Object.entries(data.session.domainData).forEach(([id, d]) => {
          if (d?.score !== undefined) scores[id] = d.score
        })
        setLiveScores(scores)
      }
      // Persist
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ session: data.session, savedAt: Date.now() }))
      } catch {}
    }

    // Progress
    if (data.phaseLabel) {
      setPhaseLabel(data.phaseLabel)
      const m = data.phaseLabel.match(/(\d+) of 7/)
      if (m) setProgressPct(Math.round(((parseInt(m[1]) - 1) / 7) * 80) + 10)
      else if (data.phaseLabel.includes('Brain')) setProgressPct(90)
      else if (data.phaseLabel.includes('Map'))   setProgressPct(100)
    }

    // Completion
    if (data.complete && data.mapData) {
      setComplete(true)
      if (user) {
        setMapData(data.mapData)
        saveToSupabase(data.session || sessionRef.current, data.mapData)
      } else {
        setPendingMap({ mapData: data.mapData, session: data.session || sessionRef.current })
        setMapData(data.mapData)
        setShowAuthModal(true)
        setAuthMode('results')
      }
      return
    }

    // Auto-advance after welcome
    if (data.autoAdvance && data.phase === 'welcome') {
      if (data.message) addMessage('assistant', data.message)
      setTimeout(async () => {
        setThinking(true)
        try {
          const next = await callAPI([], sessionRef.current)
          setThinking(false)
          handleResponse(next)
        } catch {
          setThinking(false)
        }
      }, data.advanceDelay || 2200)
      return
    }

    if (data.message) addMessage('assistant', data.message)
  }

  async function saveToSupabase(sess, map) {
    if (!user?.id) return
    try {
      await supabase.from('map_results').upsert({
        user_id:             user.id,
        session:             sess,
        phase:               'complete',
        complete:            true,
        horizon_goal_system: map?.life_horizon_draft ?? null,
        completed_at:        new Date().toISOString(),
        updated_at:          new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch {}
  }

  function addMessage(role, content) {
    setMessages(prev => [...prev, { role, content, id: Date.now() + Math.random() }])
  }

  function handleInput(e) {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  async function send() {
    const text = input.trim()
    if (!text || thinking || complete) return

    addMessage('user', text)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setThinking(true)

    const history = [...messages, { role: 'user', content: text }]
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const data = await callAPI(history, sessionRef.current)
      setThinking(false)
      handleResponse(data)
    } catch {
      setThinking(false)
      addMessage('assistant', 'Something went wrong. Please try again.')
    }
  }

  if (authLoading) return <div className="loading" />

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onDismiss={authMode === 'results' ? () => setShowAuthModal(false) : null}
        />
      )}

      <div className="tool-wrap">
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS</span>
          <h1 className="tool-title">The Map</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '4px' }}>
            An honest picture of where you are.
          </p>
        </div>

        {/* Progress bar */}
        {progressPct > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ height: '2px', background: 'rgba(200,146,42,0.12)', borderRadius: '1px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'var(--gold)',
                borderRadius: '1px',
                transition: 'width 0.6s ease',
              }} />
            </div>
            {phaseLabel && (
              <div style={{
                fontFamily: 'var(--font-sc)',
                fontSize: '0.5625rem',
                letterSpacing: '0.18em',
                color: 'var(--gold-dk)',
                textTransform: 'uppercase',
                marginTop: '6px',
              }}>{phaseLabel}</div>
            )}
          </div>
        )}

        {/* Live scores panel — appears once first domain scored */}
        {Object.keys(liveScores).length > 0 && !complete && (
          <LiveScoresPanel scores={liveScores} />
        )}

        {/* Chat thread */}
        <div className="chat-thread">
          {messages.map(m => (
            <div key={m.id} className={`bubble bubble-${m.role}`}>
              {m.content}
            </div>
          ))}
          {thinking && (
            <div className="bubble bubble-assistant">
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Results card */}
        {complete && mapData && (
          <ResultsCard
            mapData={mapData}
            session={session}
            isSignedIn={!!user}
            onSignIn={() => { setAuthMode('results'); setShowAuthModal(true) }}
          />
        )}

        {/* Input */}
        {!complete && started && (
          <div className="input-area">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={'Type your response\u2026'}
              rows={1}
              disabled={thinking}
            />
            <button
              className="btn-send"
              onClick={send}
              disabled={!input.trim() || thinking}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
