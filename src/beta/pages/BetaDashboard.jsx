// src/beta/pages/BetaDashboard.jsx
//
// Module 4: Mission Control at /beta/dashboard.
// The existing /dashboard is untouched.
//
// Sections:
//   1. Identity bar  — name, focus, "View public profile" link, PrincipleBadges
//   2. Wheels        — Self (220px) + Civilisational (220px) side by side, visibility toggles
//   3. Sprint slate  — three slots (Personal / Relational / Civilisational)
//   4. Today         — HorizonState panel + Practice card side by side
//   5. Footer stub   — links to /beta/feed, /beta/contribution, /beta/practices
//
// Constraints honoured:
//   - No streaks, no notification count, no engagement metrics
//   - Empty slots invite quietly, never nudge
//   - Default to private on all visibility
//   - Mobile responsive (640px breakpoint)
//   - No em dashes

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import SelfWheel from '../components/SelfWheel'
import NextUsWheel from '../components/NextUsWheel'
import SprintSlate from '../components/SprintSlate'
import PrincipleBadge from '../components/PrincipleBadge'

// ─── Font constants ────────────────────────────────────────────────────────────
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

// ─── Shared primitives ─────────────────────────────────────────────────────────

function Eyebrow({ children, style = {} }) {
  return (
    <span style={{
      ...sc,
      fontSize: '11px',
      letterSpacing: '0.2em',
      color: '#A8721A',
      textTransform: 'uppercase',
      display: 'block',
      marginBottom: '6px',
      ...style,
    }}>
      {children}
    </span>
  )
}

function Rule() {
  return <div style={{ height: '1px', background: 'rgba(200,146,42,0.15)', margin: '28px 0' }} />
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingBar({ width = '100%', height = '16px', borderRadius = '4px' }) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: 'rgba(200,146,42,0.06)',
      animation: 'pulse 1.8s ease-in-out infinite',
    }} />
  )
}

// ─── Identity Bar ──────────────────────────────────────────────────────────────

function IdentityBar({ user, profile, focusName, loading }) {
  const displayName = profile?.display_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'You'

  const engagedPrinciples = profile?.engaged_principles || []

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      padding: '20px 24px',
      background: 'rgba(200,146,42,0.03)',
      border: '1px solid rgba(200,146,42,0.15)',
      borderRadius: '14px',
      marginBottom: '28px',
    }}>
      {/* Left: name + focus + principles */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <LoadingBar width="160px" height="22px" borderRadius="6px" />
        ) : (
          <div style={{
            ...serif,
            fontSize: 'clamp(22px, 3vw, 30px)',
            fontWeight: 300,
            color: '#0F1523',
            lineHeight: 1.2,
            marginBottom: '4px',
          }}>
            {displayName}
          </div>
        )}

        {focusName && (
          <div style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.14em',
            color: 'rgba(15,21,35,0.55)',
            marginBottom: '10px',
          }}>
            {focusName}
          </div>
        )}

        {/* Principle badges */}
        {engagedPrinciples.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {engagedPrinciples.map(slug => (
              <PrincipleBadge key={slug} slug={slug} weight="secondary" size="sm" />
            ))}
          </div>
        )}
      </div>

      {/* Right: view public profile */}
      {user && (
        <Link
          to={`/beta/profile/${user.id}`}
          style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.14em',
            color: '#A8721A',
            textDecoration: 'none',
            paddingTop: '4px',
            flexShrink: 0,
          }}
        >
          View public profile
        </Link>
      )}
    </div>
  )
}

// ─── Horizon State panel (today) ───────────────────────────────────────────────

function HorizonStatePanel({ horizonProfile, loading }) {
  // Show the domain with the most recent check-in, or just a summary state
  const domains = horizonProfile || []
  const hasAny  = domains.some(d => d.current_score != null)

  return (
    <div style={{
      padding: '18px 20px',
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.18)',
      borderRadius: '14px',
      flex: 1,
      minWidth: 0,
    }}>
      <Eyebrow>Horizon State</Eyebrow>

      {loading ? (
        <LoadingBar width="80%" height="14px" />
      ) : !hasAny ? (
        <div>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.55, margin: '0 0 12px' }}>
            Your daily check-in grounds the rest.
          </p>
          <a
            href="/tools/horizon-state"
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}
          >
            Begin check-in
          </a>
        </div>
      ) : (
        <div>
          {/* Show up to 3 domain scores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            {domains.slice(0, 3).map(d => {
              if (d.current_score == null) return null
              return (
                <div key={d.domain} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)', textTransform: 'capitalize' }}>
                    {d.domain?.replace('_', ' ')}
                  </span>
                  <span style={{ ...sc, fontSize: '12px', color: getTierColor(d.current_score) }}>
                    {d.current_score}
                  </span>
                </div>
              )
            })}
          </div>
          <a
            href="/tools/horizon-state"
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}
          >
            Today's check-in
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Practice card (today) ─────────────────────────────────────────────────────

function TodayPracticeCard({ practice, loading }) {
  return (
    <div style={{
      padding: '18px 20px',
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.18)',
      borderRadius: '14px',
      flex: 1,
      minWidth: 0,
    }}>
      <Eyebrow>Today's Practice</Eyebrow>

      {loading ? (
        <LoadingBar width="90%" height="14px" />
      ) : !practice ? (
        <div>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.55, margin: '0 0 12px' }}>
            A single practice, done with attention, is enough.
          </p>
          <a
            href="/tools/horizon-practice"
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}
          >
            Set up Horizon Practice
          </a>
        </div>
      ) : (
        <div>
          <p style={{
            ...body,
            fontSize: '15px',
            color: '#0F1523',
            lineHeight: 1.55,
            fontWeight: 400,
            margin: '0 0 8px',
          }}>
            {practice.name || practice.title}
          </p>
          {practice.description && (
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.55, margin: '0 0 12px' }}>
              {practice.description.slice(0, 120)}{practice.description.length > 120 ? '...' : ''}
            </p>
          )}
          <a
            href="/tools/horizon-practice"
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}
          >
            Open practice
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Tier color helper ─────────────────────────────────────────────────────────

function getTierColor(n) {
  if (n == null) return 'rgba(200,146,42,0.3)'
  if (n >= 9)   return '#3B6B9E'
  if (n >= 7)   return '#5A8AB8'
  if (n >= 5)   return '#8A8070'
  if (n >= 3)   return '#8A7030'
  return '#8A3030'
}

// ─── Footer stub ──────────────────────────────────────────────────────────────

function BetaFooter() {
  const links = [
    { to: '/beta/feed',         label: 'Feed' },
    { to: '/beta/contribution', label: 'Contribute' },
    { to: '/beta/practices',    label: 'Practices' },
  ]

  return (
    <div style={{
      marginTop: '48px',
      paddingTop: '20px',
      borderTop: '1px solid rgba(200,146,42,0.15)',
      display: 'flex',
      gap: '24px',
      flexWrap: 'wrap',
    }}>
      {links.map(l => (
        <Link
          key={l.to}
          to={l.to}
          style={{
            ...sc,
            fontSize: '12px',
            letterSpacing: '0.16em',
            color: 'rgba(15,21,35,0.55)',
            textDecoration: 'none',
            textTransform: 'uppercase',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#A8721A'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(15,21,35,0.55)'}
        >
          {l.label}
        </Link>
      ))}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BetaDashboard() {
  const { user } = useAuth()

  // Data state
  const [loading,        setLoading]        = useState(true)
  const [profile,        setProfile]        = useState(null)        // contributor_profiles_beta
  const [focusName,      setFocusName]      = useState(null)
  const [horizonProfile, setHorizonProfile] = useState([])          // horizon_profile rows
  const [currentScores,  setCurrentScores]  = useState({})
  const [horizonScores,  setHorizonScores]  = useState({})
  const [sprintSessions, setSprintSessions] = useState([])          // target_sprint_sessions
  const [sprintVis,      setSprintVis]      = useState({})          // artefact_visibility for sprints
  const [wheelSelfVis,   setWheelSelfVis]   = useState('private')
  const [wheelCivVis,    setWheelCivVis]    = useState('private')
  const [todayPractice,  setTodayPractice]  = useState(null)
  const [purposeData,    setPurposeData]    = useState(null)        // purpose_piece_results

  // ── Load data ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user])

  async function loadAll() {
    setLoading(true)
    try {
      const [
        profileRes,
        horizonRes,
        sprintRes,
        sprintVisRes,
        wheelVisRes,
        purposeRes,
        practiceRes,
      ] = await Promise.all([
        // contributor_profiles_beta
        supabase
          .from('contributor_profiles_beta')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),

        // horizon_profile (Self wheel scores)
        supabase
          .from('horizon_profile')
          .select('domain, current_score, horizon_score, horizon_goal, ia_statement')
          .eq('user_id', user.id),

        // Sprint sessions for three beta slots
        supabase
          .from('target_sprint_sessions')
          .select('id, domains, domain_data, target_date, status, slot_index, created_at')
          .eq('user_id', user.id)
          .not('slot_index', 'is', null)
          .in('slot_index', [0, 1, 2])
          .in('status', ['started', 'active'])
          .order('updated_at', { ascending: false }),

        // Visibility rows for sprint artefacts
        supabase
          .from('artefact_visibility')
          .select('artefact_id, visibility')
          .eq('user_id', user.id)
          .eq('artefact_type', 'sprint'),

        // Wheel visibility
        supabase
          .from('artefact_visibility')
          .select('artefact_type, visibility')
          .eq('user_id', user.id)
          .in('artefact_type', ['wheel_self', 'wheel_civ']),

        // Purpose Piece results (for civ domain)
        supabase
          .from('purpose_piece_results')
          .select('session')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Today's practice (most recent active horizon_practice session)
        supabase
          .from('horizon_practice_sessions')
          .select('name, description, practice_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      // Profile
      if (profileRes.data) {
        setProfile(profileRes.data)

        // Resolve focus name
        if (profileRes.data.location_focus_id) {
          const focusRes = await supabase
            .from('nextus_focuses')
            .select('name')
            .eq('id', profileRes.data.location_focus_id)
            .maybeSingle()
          if (focusRes.data) setFocusName(focusRes.data.name)
        }
      }

      // Horizon profile -> wheel scores
      if (horizonRes.data) {
        setHorizonProfile(horizonRes.data)
        const cur = {}
        const hor = {}
        for (const row of horizonRes.data) {
          if (row.current_score != null) cur[row.domain] = row.current_score
          if (row.horizon_score  != null) hor[row.domain] = row.horizon_score
        }
        setCurrentScores(cur)
        setHorizonScores(hor)
      }

      // Sprint sessions
      if (sprintRes.data) setSprintSessions(sprintRes.data)

      // Sprint visibility map
      if (sprintVisRes.data) {
        const m = {}
        for (const row of sprintVisRes.data) {
          m[row.artefact_id] = row.visibility
        }
        setSprintVis(m)
      }

      // Wheel visibility
      if (wheelVisRes.data) {
        for (const row of wheelVisRes.data) {
          if (row.artefact_type === 'wheel_self') setWheelSelfVis(row.visibility)
          if (row.artefact_type === 'wheel_civ')  setWheelCivVis(row.visibility)
        }
      }

      // Purpose Piece -> civ domain
      if (purposeRes.data) setPurposeData(purposeRes.data)

      // Today's practice
      if (practiceRes.data) setTodayPractice(practiceRes.data)

    } catch (err) {
      console.error('BetaDashboard load error:', err)
    }
    setLoading(false)
  }

  // ── Visibility update helpers ──────────────────────────────────

  async function handleSprintVisibility(sessionId, newVisibility) {
    // Optimistic
    setSprintVis(prev => ({ ...prev, [sessionId]: newVisibility }))
    await supabase
      .from('artefact_visibility')
      .upsert(
        {
          user_id: user.id,
          artefact_type: 'sprint',
          artefact_id: sessionId,
          visibility: newVisibility,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,artefact_type,artefact_id' },
      )
  }

  async function handleWheelVisibility(wheelType, current) {
    const next = current === 'public' ? 'private' : 'public'
    if (wheelType === 'self') setWheelSelfVis(next)
    else setWheelCivVis(next)

    await supabase
      .from('artefact_visibility')
      .upsert(
        {
          user_id: user.id,
          artefact_type: wheelType === 'self' ? 'wheel_self' : 'wheel_civ',
          artefact_id: user.id,  // one per user
          visibility: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,artefact_type,artefact_id' },
      )
  }

  // ── Derived ────────────────────────────────────────────────────

  const primaryCivDomain = purposeData?.session?.tentative?.domain?.domain_id || null
  const engagedCivDomains = profile?.engaged_civ_domains || []

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @media (max-width: 640px) {
          .mc-wheels { flex-direction: column !important; }
          .mc-today  { flex-direction: column !important; }
        }
      `}</style>

      <div style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: 'clamp(72px, 10vw, 96px) 24px 60px',
      }}>

        {/* ── 1. Identity bar ──────────────────────────────────── */}
        <IdentityBar
          user={user}
          profile={profile}
          focusName={focusName}
          loading={loading}
        />

        {/* ── 2. Wheels ─────────────────────────────────────────── */}
        <div>
          <Eyebrow style={{ marginBottom: '16px' }}>Your horizons</Eyebrow>
          <div
            className="mc-wheels"
            style={{
              display: 'flex',
              gap: '32px',
              alignItems: 'flex-start',
              marginBottom: '32px',
            }}
          >
            <SelfWheel
              currentScores={currentScores}
              horizonScores={horizonScores}
              size={220}
              visible={wheelSelfVis === 'public'}
              onToggleVisibility={() => handleWheelVisibility('self', wheelSelfVis)}
            />

            <SelfWheelDivider />

            <NextUsWheel
              engagedDomains={engagedCivDomains}
              primaryDomain={primaryCivDomain}
              size={220}
              visible={wheelCivVis === 'public'}
              onToggleVisibility={() => handleWheelVisibility('civ', wheelCivVis)}
            />
          </div>
        </div>

        <Rule />

        {/* ── 3. Sprint slate ───────────────────────────────────── */}
        <SprintSlate
          sessions={sprintSessions}
          visibility={sprintVis}
          onToggleVisibility={handleSprintVisibility}
        />

        <Rule />

        {/* ── 4. Today ──────────────────────────────────────────── */}
        <div>
          <Eyebrow style={{ marginBottom: '16px' }}>Today</Eyebrow>
          <div
            className="mc-today"
            style={{ display: 'flex', gap: '16px' }}
          >
            <HorizonStatePanel
              horizonProfile={horizonProfile}
              loading={loading}
            />
            <TodayPracticeCard
              practice={todayPractice}
              loading={loading}
            />
          </div>
        </div>

        {/* ── 5. Footer ─────────────────────────────────────────── */}
        <BetaFooter />
      </div>
    </div>
  )
}

// Thin divider between wheels on desktop — invisible on mobile
function SelfWheelDivider() {
  return (
    <div style={{
      width: '1px',
      background: 'rgba(200,146,42,0.12)',
      alignSelf: 'stretch',
      flexShrink: 0,
    }}
    className="mc-wheel-divider"
    />
  )
}
