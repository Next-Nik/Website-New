// ─────────────────────────────────────────────────────────────
// NextUJourney.jsx — the NextU journey surface (/nextu)
//
// The dedicated place. One thread, four chapters, the user's
// position always visible. Completed chapters show what they
// built (the vault), not that they are done. Chapters ahead are
// dim-not-locked: ghosted, always tappable, opening an invitation
// in forward language.
//
// Reads only — the journey derives chapter states from existing
// sources and owns no progress table of its own:
//   horizon_profile          — scores + ia_statements (Ch 1–2)
//   map_results              — life_ia_statement (synthesis)
//   horizon_self_onboarding  — Ch 3–4 (migration 106)
//   horizon_state_summary    — streak for the Daily strip
//
// Per: NextU_Integrated_Experience_Design_v1.md §3, §6, §7.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'
import { DOMAIN_COLORS } from '../../constants/domainColors'
import { DOMAIN_ORDER, DOMAIN_LABELS, CHAPTERS } from './shared'
import FirstLightPrompt from '../../app/components/FirstLightPrompt'

// ─── styles that need keyframes / pseudo-elements ─────────────
const JOURNEY_CSS = `
.nextu-thread-svg {
  position: absolute; left: 11px; top: 14px; bottom: 96px;
  overflow: hidden;
}
.nextu-thread-line line { stroke: ${tokens.goldChrome}; stroke-width: 2; }
@media (prefers-reduced-motion: no-preference) {
  .nextu-thread-line line {
    stroke-dasharray: 3000; stroke-dashoffset: 3000;
    animation: nextu-draw 1.2s ease-out forwards 0.2s;
  }
  @keyframes nextu-draw { to { stroke-dashoffset: 0; } }
  .nextu-node-current::after {
    content: ''; position: absolute; inset: -4px; border-radius: 50%;
    border: 1.5px solid ${tokens.goldChrome};
    animation: nextu-pulse 2.2s ease-out infinite;
  }
  @keyframes nextu-pulse {
    0% { transform: scale(0.7); opacity: 0.9; }
    70% { transform: scale(1.25); opacity: 0; }
    100% { opacity: 0; }
  }
}
@media (prefers-reduced-motion: reduce) {
  .nextu-node-current::after {
    content: ''; position: absolute; inset: -4px; border-radius: 50%;
    border: 1.5px solid ${tokens.goldChrome};
  }
}
.nextu-hover-tint { transition: background 0.2s ease; }
.nextu-hover-tint:hover { background: ${tokens.goldGlow}; }
`

// ─── the mini wheel — seven wedges at scored intensity ────────
// Presentation attributes only — never style props on SVG elements.
function MiniWheel({ scores, size = 92 }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 4
  const n = DOMAIN_ORDER.length, gap = 0.045
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Your seven-domain wheel" role="img">
      {DOMAIN_ORDER.map((key, i) => {
        const score = scores[key]
        const a0 = -Math.PI / 2 + i * (2 * Math.PI / n) + gap
        const a1 = -Math.PI / 2 + (i + 1) * (2 * Math.PI / n) - gap
        const colour = DOMAIN_COLORS[key]?.base || tokens.goldChrome
        const X0 = cx + R * Math.cos(a0), Y0 = cy + R * Math.sin(a0)
        const X1 = cx + R * Math.cos(a1), Y1 = cy + R * Math.sin(a1)
        const els = [
          <path
            key={`o-${key}`}
            d={`M ${X0} ${Y0} A ${R} ${R} 0 0 1 ${X1} ${Y1}`}
            fill="none" stroke="rgba(76,107,69,0.3)" strokeWidth="1"
          />,
        ]
        if (score != null) {
          const r = 8 + (R - 8) * (Math.max(0, Math.min(10, score)) / 10)
          const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0)
          const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
          els.push(
            <path
              key={`w-${key}`}
              d={`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`}
              fill={colour} fillOpacity="0.9"
            />
          )
        }
        return els
      })}
    </svg>
  )
}

// ─── small text helpers ────────────────────────────────────────
function Eyebrow({ children, ink = false }) {
  return (
    <div style={{
      ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em',
      color: ink ? tokens.dark : tokens.gold,
    }}>
      {children}
    </div>
  )
}

// ─── the invitation — dim-not-locked, forward language ────────
function Invitation({ chapter, gateLine, onClose }) {
  const isHorizonSelf = chapter === 3
  const isStretch     = chapter === 5
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(15,21,35,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '18px',
      }}
    >
      <div
        role="dialog"
        aria-label={isHorizonSelf ? 'Horizon Self — what is ahead' : 'The Horizon Biography — what is ahead'}
        style={{
          background: tokens.bg, width: '100%', maxWidth: '640px',
          maxHeight: '88dvh', overflowY: 'auto',
          borderRadius: '10px', padding: '36px 30px 42px',
        }}
      >
        <Eyebrow>
          CHAPTER {chapter === 3 ? 'THREE' : chapter === 4 ? 'FOUR' : 'FIVE'} · {gateLine.toUpperCase()}
        </Eyebrow>
        <h2 style={{ ...serif, fontSize: '32px', fontWeight: 300, margin: '8px 0 0', color: tokens.dark }}>
          {isStretch ? 'Target Stretch' : isHorizonSelf ? 'Horizon Self' : 'The Horizon Biography'}
        </h2>

        {isStretch ? (
          <>
            <p style={{ ...body, fontSize: '16px', lineHeight: 1.65, marginTop: '14px', color: tokens.dark }}>
              The journey built you. This chapter is where you act. Ninety days as your
              Horizon Self — in one chosen arena, taking clear action from that identity.
              The question: if you were already that self, what could one quarter accomplish?
            </p>
            <div style={{ marginTop: '18px' }}>
              <Eyebrow>WHAT THIS CHAPTER IS</Eyebrow>
              <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
                {[
                  'One arena — the domain where 90 days of embodied action matters most',
                  'A 90-day goal on the way to your Horizon, not the Horizon itself',
                  'Three monthly milestones, weekly tasks, a coach who holds the whole plan',
                  'An optional outer arc — the same Horizon Self, pointed outward',
                  'Not a chapter that ends — the standing loop the journey empties into',
                ].map(t => (
                  <li key={t} style={{
                    ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
                    padding: '5px 0 5px 18px', position: 'relative', lineHeight: 1.5,
                  }}>
                    <span style={{
                      position: 'absolute', left: 0, top: '13px',
                      width: '7px', height: '1.5px', background: tokens.goldChrome,
                      display: 'inline-block',
                    }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <p style={{
              ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
              marginTop: '18px', paddingTop: '18px',
              borderTop: `1px solid ${tokens.goldFaint}`, lineHeight: 1.65,
            }}>
              Inner Game is baked in — the whole stretch is identity work. Choose it as
              your arena only when you want that front and centre. The practice continues
              every morning. The stretch adds the 90-day proof arc.
            </p>
          </>
        ) : isHorizonSelf ? (
          <>
            <p style={{ ...body, fontSize: '16px', lineHeight: 1.65, marginTop: '14px', color: tokens.dark }}>
              Your Horizon Self is the version of you that exists when you're standing in a
              future where your full-yes life is already true. This chapter constructs them —
              in the body first, then in language, then in writing you can return to.
            </p>
            <div style={{ marginTop: '18px' }}>
              <Eyebrow>WHAT THIS CHAPTER BUILDS</Eyebrow>
              <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
                {[
                  "Your somatic library — the body's record of what they feel like",
                  'The Code — their drivers, values, thoughts, feelings, actions, priorities',
                  'The Gap — the patterns they have already left behind',
                  'Seven Horizon Beliefs — the old belief, and what they know instead',
                  'Your synthesised Horizon Self statement, in your own words',
                ].map(t => (
                  <li key={t} style={{
                    ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
                    padding: '5px 0 5px 18px', position: 'relative', lineHeight: 1.5,
                  }}>
                    <span style={{
                      position: 'absolute', left: 0, top: '13px',
                      width: '7px', height: '1.5px', background: tokens.goldChrome,
                      display: 'inline-block',
                    }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <p style={{
              ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
              marginTop: '18px', paddingTop: '18px',
              borderTop: `1px solid ${tokens.goldFaint}`, lineHeight: 1.65,
            }}>
              Most people take two to four sessions across a week or two. This is construction,
              not setup — your daily practice gets to be light because this work was deep.
              It works with your I Am statements, so it begins when Chapter Two is complete.
            </p>
          </>
        ) : (
          <>
            <p style={{ ...body, fontSize: '16px', lineHeight: 1.65, marginTop: '14px', color: tokens.dark }}>
              Your life story, written through your Horizon Self's eyes — the same facts,
              told by the man who knows where they were leading. It closes with From Here
              Forward, in present tense.
            </p>
            <p style={{
              ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
              marginTop: '18px', paddingTop: '18px',
              borderTop: `1px solid ${tokens.goldFaint}`, lineHeight: 1.65,
            }}>
              The Biography is written from the being Chapter Three constructs, so it begins
              when Horizon Self is complete. Set aside real time — this is the deepest
              writing on the journey.
            </p>
          </>
        )}

        <div style={{ display: 'flex', gap: '16px', marginTop: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onClose}
            style={{
              ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em',
              color: tokens.gold, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
            }}
          >
            BACK TO THE JOURNEY
          </button>
          <span style={{ ...body, fontSize: '14px', color: tokens.ghost }}>{gateLine}.</span>
        </div>
      </div>
    </div>
  )
}

// ─── a station on the thread ───────────────────────────────────
function Station({ state, eyebrow, title, stateLine, children, onClick, isLast }) {
  const ghost = state === 'ahead'
  const inner = (
    <>
      <div
        className={state === 'current' ? 'nextu-node-current' : undefined}
        style={{
          position: 'absolute', left: 0, top: '6px',
          width: '24px', height: '24px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: tokens.bg,
        }}
      >
        <span style={{
          width: '12px', height: '12px', borderRadius: '50%',
          background: ghost ? tokens.bg : tokens.goldChrome,
          border: ghost ? `1.5px solid ${tokens.goldChrome}` : 'none',
          display: 'inline-block',
        }} />
      </div>
      <Eyebrow ink={ghost}>{eyebrow}</Eyebrow>
      <div style={{ ...serif, fontSize: '26px', fontWeight: 400, marginTop: '4px', color: tokens.dark }}>
        {title}
      </div>
      {stateLine && (
        <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', marginTop: '4px' }}>
          {stateLine}
        </div>
      )}
      {children}
    </>
  )

  const base = {
    position: 'relative',
    padding: `0 0 ${isLast ? '36px' : '44px'} 46px`,
    opacity: ghost ? 0.55 : 1,
  }

  if (onClick) {
    return (
      <div style={base}>
        <button
          onClick={onClick}
          className="nextu-hover-tint"
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: 'none', border: 'none', cursor: 'pointer',
            borderRadius: '6px', padding: '6px 8px', margin: '-6px -8px',
            color: 'inherit', font: 'inherit', position: 'relative',
          }}
        >
          {inner}
        </button>
      </div>
    )
  }
  return <div style={base}>{inner}</div>
}

// ─── the page ──────────────────────────────────────────────────
export function NextUJourneyPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [mapRows, setMapRows]       = useState(null)
  const [mapResult, setMapResult]   = useState(null)
  const [onboarding, setOnboarding] = useState(null)
  const [streak, setStreak]         = useState(null)
  const [sprintRows, setSprintRows] = useState(null)  // self-scale sessions for ch5
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(false)
  const [reloadTick, setReloadTick] = useState(0)
  const [vaultOpen, setVaultOpen]   = useState({})   // { map: bool, iam: bool, horizon: bool, stretch: bool }
  const [invite, setInvite]         = useState(null) // chapter number or null

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    let cancelled = false
    // A stalled fetch (common on weak mobile connections) neither resolves
    // nor rejects, which would leave the spinner up forever. Race the load
    // against a timeout so the page always resolves — to the data if it
    // arrives, or to a retry prompt if the network stalls.
    const withTimeout = (p, ms) => Promise.race([
      p,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ])
    async function load() {
      setLoadError(false)
      try {
        const [mapRes, resultRes, obRes, hsRes, sprintRes] = await withTimeout(Promise.all([
          supabase.from('horizon_profile')
            .select('domain, current_score, horizon_score, horizon_goal, ia_statement')
            .eq('user_id', user.id),
          supabase.from('map_results')
            .select('id, life_ia_statement, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from('horizon_self_onboarding')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase.from('horizon_state_summary')
            .select('streak_days')
            .eq('user_id', user.id)
            .maybeSingle(),
          // Chapter 5 — self-scale stretch sessions only
          supabase.from('target_sprint_sessions')
            .select('id, domains, status, domain_data, target_date, end_date_label, updated_at')
            .eq('user_id', user.id)
            .or('scale.eq.self,scale.is.null')  // handles pre-B1 rows gracefully
            .neq('domains', '{}')
            .order('updated_at', { ascending: false })
            .limit(10),
        ]), 8000)
        if (cancelled) return
        setMapRows(mapRes.data || [])
        setMapResult(resultRes.data || null)
        setOnboarding(obRes.error ? null : (obRes.data || null))
        setStreak(hsRes.data?.streak_days ?? null)
        setSprintRows(sprintRes.data || [])
      } catch {
        // Stalled or failed before anything arrived. Don't trap the user
        // behind an endless spinner — offer a retry.
        if (!cancelled) setLoadError(true)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, authLoading, reloadTick])

  // ─── derive chapter states ──────────────────────────────────
  const derived = useMemo(() => {
    const rows = mapRows || []
    const byDomain = {}
    rows.forEach(r => { byDomain[r.domain] = r })

    const scores = {}
    DOMAIN_ORDER.forEach(k => {
      const v = byDomain[k]?.current_score
      scores[k] = v == null ? null : Number(v)
    })
    const scoredCount = DOMAIN_ORDER.filter(k => scores[k] != null).length
    const iaList = DOMAIN_ORDER
      .filter(k => byDomain[k]?.ia_statement)
      .map(k => ({ key: k, label: DOMAIN_LABELS[k], text: byDomain[k].ia_statement }))
    const iaCount = iaList.length
    const nextIaDomain = DOMAIN_ORDER.find(k => !byDomain[k]?.ia_statement)

    const ob = onboarding
    const obStep = ob?.current_step || 1
    const constructionDone = ob && (ob.status === 'construction_complete' || ob.status === 'complete')
    const biographyDone = ob?.status === 'complete'

    // Chapter 5 — Target Stretch (recurring; uses extended states: running | between)
    // 'running'  — has an active/draft stretch right now
    // 'between'  — completed at least one, none running (invite the next)
    // 'current'  — ch4 done, never started → first invitation
    // 'ahead'    — ch4 not done
    const allSprints   = sprintRows || []
    const activeSprint = allSprints.find(s => s.status === 'active' || s.status === 'draft') || null
    const doneCount    = allSprints.filter(s => s.status === 'complete').length
    let ch5
    if (!biographyDone) {
      ch5 = 'ahead'
    } else if (activeSprint) {
      ch5 = 'running'
    } else if (doneCount > 0) {
      ch5 = 'between'
    } else {
      ch5 = 'current'
    }

    // Chapter states
    const ch1 = scoredCount >= 7 ? 'done' : 'current'
    const ch2 = ch1 !== 'done' ? 'ahead' : iaCount >= 7 ? 'done' : 'current'
    const ch3 = ch2 !== 'done' ? 'ahead' : constructionDone ? 'done' : 'current'
    const ch4 = ch3 !== 'done' ? 'ahead' : biographyDone ? 'done' : 'current'

    // Position line + resume — ch5 states added
    let position, resumeLabel, resumeLine, resumeRoute
    if (ch1 === 'current') {
      position = scoredCount === 0
        ? 'Chapter One — your seven domains are waiting.'
        : `Chapter One — ${scoredCount} of seven domains mapped.`
      resumeLabel = scoredCount === 0 ? 'BEGIN THE JOURNEY' : 'CONTINUE WHERE YOU LEFT OFF'
      resumeLine = scoredCount === 0 ? 'The Map — your seven domains' : 'The Map is underway'
      resumeRoute = '/nextu/map'
    } else if (ch2 === 'current') {
      position = `Chapter Two — ${iaCount === 0 ? 'your first statement is waiting' : `${iaCount} of seven statements declared`}.`
      resumeLabel = 'CONTINUE WHERE YOU LEFT OFF'
      resumeLine = nextIaDomain
        ? `Your ${DOMAIN_LABELS[nextIaDomain]} statement is next`
        : 'Your statements are waiting'
      resumeRoute = '/nextu/i-am'
    } else if (ch3 === 'current') {
      position = ob
        ? `Chapter Three — step ${Math.min(obStep, 7)} of seven.`
        : 'Chapter Three — Horizon Self begins.'
      resumeLabel = ob ? 'CONTINUE WHERE YOU LEFT OFF' : 'BEGIN CHAPTER THREE'
      resumeLine = ob ? `Horizon Self — step ${Math.min(obStep, 7)}` : 'Horizon Self — Arrival'
      resumeRoute = '/nextu/horizon-self'
    } else if (ch4 === 'current') {
      position = 'Chapter Four — your story, told through their eyes.'
      resumeLabel = ob?.biography ? 'CONTINUE WHERE YOU LEFT OFF' : 'BEGIN CHAPTER FOUR'
      resumeLine = 'The Horizon Biography'
      resumeRoute = '/nextu/biography'
    } else if (ch5 === 'running') {
      const domainId  = activeSprint?.domains?.[0]
      const domLabel  = domainId ? (DOMAIN_LABELS[domainId] || domainId) : 'your arena'
      const daysLeft  = activeSprint?.target_date
        ? Math.max(0, Math.ceil((new Date(activeSprint.target_date + 'T23:59:59') - new Date()) / 86400000))
        : null
      position = `Chapter Five — ${domLabel}. ${daysLeft !== null ? `${daysLeft} days left.` : ''}`
      resumeLabel = 'OPEN YOUR STRETCH'
      resumeLine  = `${domLabel} — ${activeSprint?.domain_data?.[domainId]?.targetGoal?.slice(0, 80) || 'your Horizon Self in action'}`
      resumeRoute = '/tools/target-sprint'
    } else if (ch5 === 'between') {
      position = `Chapter Five — ${doneCount} stretch${doneCount === 1 ? '' : 'es'} complete. Ready for the next.`
      resumeLabel = 'BEGIN YOUR NEXT STRETCH'
      resumeLine  = 'Choose your next arena'
      resumeRoute = '/tools/target-sprint'
    } else if (ch5 === 'current') {
      position = 'Chapter Five — your first stretch is waiting.'
      resumeLabel = 'BEGIN CHAPTER FIVE'
      resumeLine  = 'Target Stretch — 90 days as your Horizon Self'
      resumeRoute = '/tools/target-sprint'
    } else {
      // ch5 === 'ahead' — biography not done
      position = 'Chapter Four — your story, told through their eyes.'
      resumeLabel = ob?.biography ? 'CONTINUE WHERE YOU LEFT OFF' : 'BEGIN CHAPTER FOUR'
      resumeLine  = 'The Horizon Biography'
      resumeRoute = '/nextu/biography'
    }

    return {
      scores, scoredCount, iaList, iaCount, nextIaDomain,
      ob, obStep, constructionDone, biographyDone,
      allSprints, activeSprint, doneCount,
      states: { 1: ch1, 2: ch2, 3: ch3, 4: ch4, 5: ch5 },
      position, resumeLabel, resumeLine, resumeRoute,
      lifeStatement: mapResult?.life_ia_statement || null,
    }
  }, [mapRows, mapResult, onboarding, sprintRows])

  // ─── signed out / loading ───────────────────────────────────
  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100dvh', background: tokens.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: tokens.ghost }}>NEXTU</span>
      </div>
    )
  }
  if (loadError) {
    return (
      <div style={{ minHeight: '100dvh', background: tokens.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', padding: '24px', textAlign: 'center' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: tokens.ghost }}>NEXTU</span>
        <p style={{ ...body, fontSize: '15px', lineHeight: 1.6, color: 'rgba(15,21,35,0.60)', margin: 0, maxWidth: '320px' }}>
          The connection stalled before everything loaded. This is usually a weak signal, not your work.
        </p>
        <button
          onClick={() => { setLoadError(false); setLoading(true); setReloadTick(t => t + 1) }}
          style={{ ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#262420', background: 'transparent', border: '1px solid #6E7F5C', borderRadius: '40px', padding: '11px 26px', cursor: 'pointer' }}
        >Try again</button>
      </div>
    )
  }
  if (!user) {
    return (
      <div style={{ minHeight: '100dvh', background: tokens.bg }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '60px 22px' }}>
          <Eyebrow>NEXTU</Eyebrow>
          <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(34px,6vw,46px)', marginTop: '10px', color: tokens.dark }}>
            Your journey
          </h1>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)', marginTop: '12px', lineHeight: 1.65 }}>
            Sign in to pick up where you left off — or to take the first step.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
              color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
              borderRadius: '4px', padding: '13px 26px', cursor: 'pointer', marginTop: '24px',
            }}
          >
            SIGN IN
          </button>
        </div>
      </div>
    )
  }

  const d = derived
  const toggleVault = key => setVaultOpen(v => ({ ...v, [key]: !v[key] }))

  const stateLine = {
    1: d.states[1] === 'done'
      ? 'Seven domains scored · seven horizons set'
      : d.scoredCount === 0 ? 'Where you are, across seven domains' : `${d.scoredCount} of seven domains mapped`,
    2: d.states[2] === 'ahead'
      ? 'Begins after Chapter One'
      : d.states[2] === 'done' ? 'Seven statements declared' : `${d.iaCount} of seven declared`,
    3: d.states[3] === 'ahead'
      ? 'Begins after Chapter Two · eight steps'
      : d.states[3] === 'done' ? 'Constructed · revisit any step' : `Step ${Math.min(d.obStep, 7)} of seven`,
    4: d.states[4] === 'ahead'
      ? (d.states[3] === 'done' ? 'Ready to write' : 'Your story, told through their eyes')
      : d.states[4] === 'done' ? 'Written · From Here Forward' : 'In the writing room',
    5: d.states[5] === 'ahead'
      ? 'Begins after Chapter Four'
      : d.states[5] === 'running'
        ? (() => {
            const domId  = d.activeSprint?.domains?.[0]
            const days   = d.activeSprint?.target_date
              ? Math.max(0, Math.ceil((new Date(d.activeSprint.target_date + 'T23:59:59') - new Date()) / 86400000))
              : null
            return `${DOMAIN_LABELS[domId] || 'In progress'}${days !== null ? ` · ${days} days left` : ''}`
          })()
        : d.states[5] === 'between'
          ? `${d.doneCount} stretch${d.doneCount === 1 ? '' : 'es'} complete · choose the next arena`
          : '90 days as your Horizon Self',
  }

  return (
    <div style={{ minHeight: '100dvh', background: tokens.bg }}>
      <style>{JOURNEY_CSS}</style>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 22px 80px' }}>

        {/* header strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '22px' }}>
          <Eyebrow>NEXTU</Eyebrow>
          <button
            onClick={() => navigate('/')}
            style={{
              ...sc, fontSize: '13px', letterSpacing: '0.14em',
              color: tokens.ghost, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
            }}
          >
            MISSION CONTROL ↗
          </button>
        </div>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(34px,6vw,46px)', letterSpacing: '-0.01em', marginTop: '10px', color: tokens.dark }}>
          Your journey
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)', marginTop: '6px' }}>
          {d.position}
        </p>

        <FirstLightPrompt style={{ marginTop: '24px' }} />

        {/* resume card — the one decision above the thread */}
        <button
          onClick={() => {
            if (d.resumeRoute) navigate(d.resumeRoute)
            else setVaultOpen({ map: true, iam: true, horizon: true })
          }}
          className="nextu-hover-tint"
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            marginTop: '28px', padding: '20px 22px',
            background: tokens.goldTint, border: `1px solid ${tokens.goldFaint}`,
            borderRadius: '6px', cursor: 'pointer',
          }}
        >
          <Eyebrow>{d.resumeLabel}</Eyebrow>
          <span style={{ ...serif, fontSize: '22px', fontWeight: 400, marginTop: '6px', display: 'block', color: tokens.dark }}>
            {d.resumeLine}
          </span>
          <span style={{ ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em', color: tokens.gold, marginTop: '10px', display: 'inline-block' }}>
            {d.resumeRoute ? 'CONTINUE →' : 'OPEN THE VAULT →'}
          </span>
        </button>

        {/* the thread */}
        <div style={{ position: 'relative', marginTop: '46px' }}>
          <svg
            className="nextu-thread-line nextu-thread-svg"
            aria-hidden="true"
            preserveAspectRatio="none"
            width="2"
            height="100%"
          >
            <line x1="1" y1="0" x2="1" y2="3000" />
          </svg>

          {/* Chapter One — The Map */}
          <Station
            state={d.states[1]}
            eyebrow="CHAPTER ONE"
            title="The Map"
            stateLine={stateLine[1]}
          >
            {d.scoredCount > 0 && (
              <>
                <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap', marginTop: '14px' }}>
                  <MiniWheel scores={d.scores} />
                  <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.9 }}>
                    {d.states[1] === 'done'
                      ? 'Tap to see your scores and horizons.'
                      : 'Your wheel is taking shape.'}
                  </div>
                </div>
                <button
                  onClick={() => toggleVault('map')}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '12px' }}
                >
                  {vaultOpen.map ? 'CLOSE' : 'SEE YOUR SCORES'}
                </button>
                {vaultOpen.map && (
                  <div style={{ marginTop: '14px', borderTop: `1px solid ${tokens.goldFaint}`, paddingTop: '14px' }}>
                    <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.9 }}>
                      {DOMAIN_ORDER.map(k => {
                        const row = (mapRows || []).find(r => r.domain === k)
                        if (!row || row.current_score == null) return null
                        return (
                          <div key={k}>
                            {DOMAIN_LABELS[k]}{' '}
                            <b style={{ fontWeight: 600, color: tokens.dark }}>{row.current_score}</b>
                            {row.horizon_score != null && (
                              <> → horizon <b style={{ fontWeight: 600, color: tokens.dark }}>{row.horizon_score}</b></>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => navigate('/nextu/map')}
                      style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', color: tokens.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '14px' }}
                    >
                      REVISIT A DOMAIN →
                    </button>
                  </div>
                )}
              </>
            )}
            {d.states[1] === 'current' && (
              <div>
                <button
                  onClick={() => navigate('/nextu/map')}
                  style={{
                    ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
                    color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
                    borderRadius: '4px', padding: '11px 22px', cursor: 'pointer',
                    marginTop: '14px', display: 'inline-block',
                  }}
                >
                  {d.scoredCount === 0 ? 'BEGIN THE MAP' : 'CONTINUE THE MAP'}
                </button>
                <div style={{ ...body, fontSize: '14px', color: tokens.ghost, marginTop: '8px' }}>
                  Most people take at least an hour for a first pass — many spend weeks. It saves as you go.
                </div>
              </div>
            )}
          </Station>

          {/* Chapter Two — I Am Statements */}
          <Station
            state={d.states[2]}
            eyebrow="CHAPTER TWO"
            title="I Am Statements"
            stateLine={stateLine[2]}
            onClick={d.states[2] === 'ahead' ? () => navigate('/nextu/map') : undefined}
          >
            {d.states[2] !== 'ahead' && (
              <>
                {d.iaCount > 0 && (
                  <>
                    <button
                      onClick={() => toggleVault('iam')}
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '12px' }}
                    >
                      {vaultOpen.iam ? 'CLOSE' : 'READ YOUR STATEMENTS'}
                    </button>
                    {vaultOpen.iam && (
                      <div style={{ marginTop: '14px', borderTop: `1px solid ${tokens.goldFaint}`, paddingTop: '4px' }}>
                        {d.iaList.map(s => (
                          <p key={s.key} style={{ ...body, fontStyle: 'italic', fontSize: '16px', lineHeight: 1.55, marginTop: '10px', color: tokens.dark }}>
                            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.gold, fontStyle: 'normal', marginRight: '8px' }}>
                              {s.label.toUpperCase()}
                            </span>
                            {s.text}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {d.states[2] === 'current' && (
                  <div>
                    <button
                      onClick={() => navigate('/nextu/i-am')}
                      style={{
                        ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
                        color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
                        borderRadius: '4px', padding: '11px 22px', cursor: 'pointer',
                        marginTop: '14px', display: 'inline-block',
                      }}
                    >
                      {d.iaCount === 0
                        ? 'DECLARE YOUR FIRST'
                        : `CONTINUE — ${(DOMAIN_LABELS[d.nextIaDomain] || '').toUpperCase()}`}
                    </button>
                  </div>
                )}
              </>
            )}
          </Station>

          {/* Chapter Three — Horizon Self */}
          <Station
            state={d.states[3]}
            eyebrow="CHAPTER THREE"
            title="Horizon Self"
            stateLine={stateLine[3]}
            onClick={
              d.states[3] === 'ahead'
                ? () => setInvite(3)
                : d.states[3] === 'current'
                  ? () => navigate('/nextu/horizon-self')
                  : undefined
            }
          >
            {d.states[3] === 'done' && (
              <>
                {d.ob?.synthesised_statement && (
                  <p style={{ ...body, fontStyle: 'italic', fontSize: '17px', lineHeight: 1.6, marginTop: '12px', color: tokens.dark }}>
                    {d.ob.synthesised_statement}
                  </p>
                )}
                <button
                  onClick={() => toggleVault('horizon')}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '12px' }}
                >
                  {vaultOpen.horizon ? 'CLOSE' : 'OPEN WHAT YOU BUILT'}
                </button>
                {vaultOpen.horizon && (
                  <div style={{ marginTop: '14px', borderTop: `1px solid ${tokens.goldFaint}`, paddingTop: '14px' }}>
                    <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.8 }}>
                      The somatic library · the Code · the Gap · seven Horizon Beliefs — each step re-opens independently.
                    </div>
                    <button
                      onClick={() => navigate('/nextu/horizon-self')}
                      style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', color: tokens.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '12px' }}
                    >
                      REVISIT A STEP →
                    </button>
                  </div>
                )}
              </>
            )}
          </Station>

          {/* Chapter Four — The Horizon Biography */}
          <Station
            state={d.states[4]}
            eyebrow="CHAPTER FOUR"
            title="The Horizon Biography"
            stateLine={stateLine[4]}
            onClick={
              d.states[4] === 'ahead'
                ? () => setInvite(4)
                : () => navigate('/nextu/biography')
            }
          />

          {/* Chapter Five — Target Stretch */}
          <Station
            state={
              d.states[5] === 'running' || d.states[5] === 'between'
                ? 'done'    // Station renders the vault pattern for both live states
                : d.states[5]
            }
            eyebrow="CHAPTER FIVE"
            title="Target Stretch"
            stateLine={stateLine[5]}
            isLast
            onClick={
              d.states[5] === 'ahead'
                ? () => setInvite(5)
                : d.states[5] === 'current'
                  ? () => navigate('/tools/target-sprint')
                  : undefined
            }
          >
            {/* Running — vault shows the active stretch */}
            {d.states[5] === 'running' && d.activeSprint && (() => {
              const domId    = d.activeSprint.domains[0]
              const dd       = d.activeSprint.domain_data?.[domId] || {}
              const daysLeft = d.activeSprint.target_date
                ? Math.max(0, Math.ceil((new Date(d.activeSprint.target_date + 'T23:59:59') - new Date()) / 86400000))
                : null
              return (
                <>
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.gold, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {DOMAIN_LABELS[domId] || domId}
                      {daysLeft !== null && <span style={{ color: tokens.ghost, marginLeft: '8px' }}>{daysLeft} days left</span>}
                    </div>
                    {dd.targetGoal && (
                      <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
                        {dd.targetGoal.slice(0, 120)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleVault('stretch')}
                    style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '12px' }}
                  >
                    {vaultOpen.stretch ? 'CLOSE' : 'OPEN YOUR STRETCH'}
                  </button>
                  {vaultOpen.stretch && (
                    <div style={{ marginTop: '12px', borderTop: `1px solid ${tokens.goldFaint}`, paddingTop: '14px' }}>
                      {['milestones'].map(() => {
                        const ms = dd.milestones || []
                        return (
                          <div key="ms" style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.8 }}>
                            {ms.map((m, i) => (
                              <div key={i}>
                                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: dd.milestoneChecked?.[i] ? '#2A8C4F' : tokens.gold }}>
                                  {dd.milestoneChecked?.[i] ? '✓ ' : ''}Month {i + 1}
                                </span>
                                {' '}{m.text}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                      <button
                        onClick={() => navigate('/tools/target-sprint')}
                        style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', color: tokens.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '14px' }}
                      >
                        OPEN MY STRETCH →
                      </button>
                    </div>
                  )}
                </>
              )
            })()}

            {/* Between stretches — completed at least one */}
            {d.states[5] === 'between' && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, marginBottom: '14px' }}>
                  {d.doneCount} stretch{d.doneCount === 1 ? '' : 'es'} complete. The Horizon Self keeps acting.
                </div>
                <button
                  onClick={() => navigate('/tools/target-sprint')}
                  style={{
                    ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
                    color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
                    borderRadius: '4px', padding: '11px 22px', cursor: 'pointer',
                    display: 'inline-block',
                  }}
                >
                  BEGIN THE NEXT →
                </button>
              </div>
            )}

            {/* First invitation — never stretched */}
            {d.states[5] === 'current' && (
              <div>
                <button
                  onClick={() => navigate('/tools/target-sprint')}
                  style={{
                    ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
                    color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
                    borderRadius: '4px', padding: '11px 22px', cursor: 'pointer',
                    marginTop: '14px', display: 'inline-block',
                  }}
                >
                  BEGIN CHAPTER FIVE
                </button>
                <div style={{ ...body, fontSize: '14px', color: tokens.ghost, marginTop: '8px' }}>
                  Choose your arena. 90 days as the person you built.
                </div>
              </div>
            )}
          </Station>

          {/* the horizon */}
          <div style={{ position: 'relative', paddingLeft: '46px', marginTop: '6px' }}>
            <div style={{ height: '1px', background: tokens.goldFaint, marginBottom: '14px' }} />
            <div style={{ ...serif, fontSize: '22px', fontWeight: 300, color: 'rgba(15,21,35,0.72)' }}>
              From Here Forward
            </div>
            <div style={{ ...body, fontSize: '14px', color: tokens.ghost, marginTop: '4px' }}>
              The thread doesn't end — it becomes the loop. A new stretch every quarter.
            </div>
          </div>
        </div>

        {/* Daily — runs alongside, never a chapter */}
        <button
          onClick={() => navigate('/tools/horizon-practice')}
          className="nextu-hover-tint"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '54px', padding: '16px 20px', width: '100%',
            border: `1px solid ${tokens.goldFaint}`, borderRadius: '6px',
            background: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span>
            <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: tokens.gold }}>
              RUNS ALONGSIDE
            </span>
            <span style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', display: 'block', marginTop: '3px' }}>
              Daily — your morning practice
            </span>
          </span>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, whiteSpace: 'nowrap' }}>
            {streak ? `${streak}-DAY STREAK →` : 'OPEN →'}
          </span>
        </button>

        {/* Horizon State — the daily protocol. Also reachable from the daily
            card; both doors land on the same page, which gates its phases. */}
        <button
          onClick={() => navigate('/tools/horizon-state')}
          className="nextu-hover-tint"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '12px', padding: '16px 20px', width: '100%',
            border: `1px solid ${tokens.goldFaint}`, borderRadius: '6px',
            background: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span>
            <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: tokens.gold }}>
              RUNS ALONGSIDE
            </span>
            <span style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', display: 'block', marginTop: '3px' }}>
              Horizon State {'·'} arrive, listen, embark
            </span>
          </span>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, whiteSpace: 'nowrap' }}>
            OPEN →
          </span>
        </button>
      </div>

      {invite && (
        <Invitation
          chapter={invite}
          gateLine={invite === 3
            ? (d.iaCount >= 7 ? 'Ready to begin' : `${7 - d.iaCount} statement${7 - d.iaCount === 1 ? '' : 's'} to go`)
            : invite === 4
              ? (d.constructionDone ? 'Ready to write' : 'Begins after Chapter Three')
              : (d.biographyDone ? 'Ready to begin' : 'Begins after Chapter Four')}
          onClose={() => setInvite(null)}
        />
      )}
    </div>
  )
}

export default NextUJourneyPage
