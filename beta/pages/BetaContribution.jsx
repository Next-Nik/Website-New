// src/beta/pages/BetaContribution.jsx
//
// Module 7: Contribution Ladder at /beta/contribution.
// Two tabs:
//   1. "Find where I'm needed"  — browse open org_needs_beta with filters.
//   2. "What I'm offering"      — declare contribution capacity to
//                                 contributor_profiles_beta.
//
// In-person bias: "Near me first" defaults ON when the user has a focus.
// Express interest writes to contribution_interests_beta and never
// auto-commits — the org receives the interest and replies.
//
// Empty platform state: a graceful holding page. We do not fake demand.
//
// No leaderboards, no engagement metrics, no em dashes.

import { useState, useEffect, useMemo } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'

import { CONTRIBUTION_TIERS, TIER_LABEL_BY_SLUG } from '../constants/contributionTiers'
import { CIV_DOMAINS } from '../components/NextUsWheel'

import FilterPanel from '../components/contribution/FilterPanel'
import NeedCard from '../components/contribution/NeedCard'
import OfferingPanel from '../components/contribution/OfferingPanel'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }

// ─── Tabs ──────────────────────────────────────────────────────

function Tabs({ active, onChange }) {
  const tabs = [
    { id: 'find',   label: "Find where I'm needed" },
    { id: 'offer',  label: "What I'm offering" },
  ]
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      borderBottom: '1px solid rgba(200,146,42,0.18)',
      marginBottom: '32px',
      overflowX: 'auto',
    }}>
      {tabs.map(t => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={isActive}
            style={{
              ...sc,
              fontSize: '13px',
              letterSpacing: '0.12em',
              color: isActive ? '#A8721A' : 'rgba(15,21,35,0.55)',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid #A8721A' : '2px solid transparent',
              padding: '12px 18px',
              cursor: 'pointer',
              fontWeight: isActive ? 600 : 400,
              whiteSpace: 'nowrap',
              transition: 'color 150ms ease, border-color 150ms ease',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Page header ───────────────────────────────────────────────

function PageHeader() {
  return (
    <div style={{ marginBottom: '32px' }}>
      <span style={{
        ...sc,
        fontSize: '11px',
        letterSpacing: '0.2em',
        color: '#A8721A',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: '10px',
      }}>
        Contribution Ladder
      </span>
      <h1 style={{
        ...serif,
        fontSize: 'clamp(28px, 4vw, 42px)',
        fontWeight: 300,
        color: '#0F1523',
        lineHeight: 1.15,
        margin: '0 0 10px',
      }}>
        Where you can show up.
      </h1>
      <p style={{
        ...body,
        fontSize: '16px',
        color: 'rgba(15,21,35,0.72)',
        lineHeight: 1.65,
        margin: 0,
        maxWidth: '620px',
      }}>
        Browse what organisations need. Tell the platform what you can bring.
        The match is yours to make.
      </p>
    </div>
  )
}

// ─── Empty states ──────────────────────────────────────────────

function EmptyNeedsState({ filtersActive, totalNeedsExist }) {
  return (
    <div style={{
      padding: '48px 24px',
      background: '#FFFFFF',
      border: '1px dashed rgba(200,146,42,0.30)',
      borderRadius: '14px',
      textAlign: 'center',
    }}>
      {totalNeedsExist ? (
        // Filters narrowed to nothing
        <>
          <p style={{
            ...body,
            fontSize: '16px',
            color: 'rgba(15,21,35,0.72)',
            lineHeight: 1.65,
            margin: '0 0 8px',
          }}>
            Nothing matches those filters right now.
          </p>
          <p style={{
            ...body,
            fontSize: '14px',
            color: 'rgba(15,21,35,0.55)',
            margin: 0,
          }}>
            Try widening medium or domains, or clear filters to see everything open.
          </p>
        </>
      ) : (
        // Genuinely empty platform
        <>
          <p style={{
            ...body,
            fontSize: '16px',
            color: 'rgba(15,21,35,0.72)',
            lineHeight: 1.65,
            margin: '0 0 8px',
            maxWidth: '480px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            No open needs are posted yet.
          </p>
          <p style={{
            ...body,
            fontSize: '14px',
            color: 'rgba(15,21,35,0.55)',
            lineHeight: 1.65,
            margin: 0,
            maxWidth: '480px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            The platform is early. The first organisations are still settling in.
            When needs are posted, they will land here.
          </p>
        </>
      )}
    </div>
  )
}

// ─── Loading skeleton ──────────────────────────────────────────

function NeedsLoading() {
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          padding: '20px 22px',
          background: '#FFFFFF',
          border: '1px solid rgba(200,146,42,0.14)',
          borderRadius: '14px',
          height: '120px',
          animation: 'pulse 1.8s ease-in-out infinite',
          opacity: 0.5,
        }} />
      ))}
    </div>
  )
}

// ─── Sorting & filtering ───────────────────────────────────────

function applyFilters(needs, filters, userFocusId, ancestorFocusIds) {
  let list = needs

  // Tier filter (any-of)
  if (filters.tiers?.length) {
    list = list.filter(n => filters.tiers.includes(n.tier))
  }

  // Medium filter
  if (filters.medium && filters.medium !== 'any') {
    if (filters.medium === 'either') {
      list = list.filter(n => n.medium === 'either')
    } else {
      list = list.filter(n => n.medium === filters.medium || n.medium === 'either')
    }
  }

  // Domain filter — match against the actor's domains array
  if (filters.domains?.length) {
    list = list.filter(n => {
      const actorDomains = n.actor_domains || []
      return filters.domains.some(d => actorDomains.includes(d))
    })
  }

  // Principle filter — match against actor's platform_principles array
  if (filters.principles?.length) {
    list = list.filter(n => {
      const actorPrinciples = n.actor_principles || []
      return filters.principles.some(p => actorPrinciples.includes(p))
    })
  }

  return list
}

function sortNeeds(needs, filters, userFocusId, ancestorFocusIds) {
  // Three-stage sort:
  //   1. Near me first (when toggle ON and user has a focus)
  //      — same focus first, then ancestor focuses, then everything else
  //   2. In-person bias within each group — in_person > either > digital
  //   3. Urgency — high > medium > low > null
  //   4. Recency — newer first
  const URGENCY_RANK  = { high: 0, medium: 1, low: 2 }
  const MEDIUM_RANK   = { in_person: 0, either: 1, digital: 2 }

  function focusGroup(n) {
    if (!filters.nearMeFirst || !userFocusId) return 1
    if (n.focus_id === userFocusId) return 0
    if (ancestorFocusIds.includes(n.focus_id)) return 1
    return 2
  }

  return [...needs].sort((a, b) => {
    const fg = focusGroup(a) - focusGroup(b)
    if (fg !== 0) return fg

    const mg = (MEDIUM_RANK[a.medium] ?? 3) - (MEDIUM_RANK[b.medium] ?? 3)
    if (mg !== 0) return mg

    const ug = (URGENCY_RANK[a.urgency] ?? 3) - (URGENCY_RANK[b.urgency] ?? 3)
    if (ug !== 0) return ug

    const at = a.created_at ? new Date(a.created_at).getTime() : 0
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0
    return bt - at
  })
}

// ─── Main page ─────────────────────────────────────────────────

export default function BetaContribution() {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('find')

  // Tab 1 state
  const [needs,            setNeeds]            = useState([])
  const [needsLoading,     setNeedsLoading]     = useState(true)
  const [interestsByNeed,  setInterestsByNeed]  = useState({})
  const [pendingExpress,   setPendingExpress]   = useState(false)

  // Tab 2 state
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  // Focus context
  const [userFocusId,      setUserFocusId]      = useState(null)
  const [ancestorFocusIds, setAncestorFocusIds] = useState([])

  // Filters
  const [filters, setFilters] = useState({
    tiers: [],
    medium: 'any',
    domains: [],
    principles: [],
    nearMeFirst: true,   // default ON — in-person bias
  })

  // ── Initial load ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user])

  async function loadAll() {
    await Promise.all([
      loadProfile(),
      loadNeedsAndInterests(),
    ])
  }

  async function loadProfile() {
    setProfileLoading(true)
    const { data, error } = await supabase
      .from('contributor_profiles_beta')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) console.error('Load profile error:', error)
    setProfile(data || null)

    // Resolve focus + ancestors
    if (data?.location_focus_id) {
      setUserFocusId(data.location_focus_id)
      const ancestors = await resolveAncestors(data.location_focus_id)
      setAncestorFocusIds(ancestors)
    }

    setProfileLoading(false)
  }

  async function resolveAncestors(focusId) {
    const ids = []
    let current = focusId
    let safety = 8
    while (current && safety-- > 0) {
      const { data } = await supabase
        .from('nextus_focuses')
        .select('parent_id')
        .eq('id', current)
        .maybeSingle()
      if (!data?.parent_id) break
      ids.push(data.parent_id)
      current = data.parent_id
    }
    return ids
  }

  async function loadNeedsAndInterests() {
    setNeedsLoading(true)
    try {
      // Fetch all open needs with joined actor and focus info
      const { data: needRows, error } = await supabase
        .from('org_needs_beta')
        .select(`
          id,
          actor_id,
          tier,
          medium,
          skill_tag,
          description,
          time_estimate_minutes,
          urgency,
          focus_id,
          status,
          created_at,
          nextus_actors:actor_id (
            id,
            name,
            slug,
            domains,
            platform_principles
          ),
          nextus_focuses:focus_id (
            id,
            name,
            parent_id
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Load needs error:', error)
        setNeeds([])
      } else {
        const flattened = (needRows || []).map(row => ({
          id: row.id,
          actor_id: row.actor_id,
          tier: row.tier,
          medium: row.medium,
          skill_tag: row.skill_tag,
          description: row.description,
          time_estimate_minutes: row.time_estimate_minutes,
          urgency: row.urgency,
          focus_id: row.focus_id,
          status: row.status,
          created_at: row.created_at,
          actor_name: row.nextus_actors?.name,
          actor_slug: row.nextus_actors?.slug,
          actor_domains: row.nextus_actors?.domains || [],
          actor_principles: row.nextus_actors?.platform_principles || [],
          principle_slugs: row.nextus_actors?.platform_principles || [],
          focus_name: row.nextus_focuses?.name,
          tier_label: TIER_LABEL_BY_SLUG[row.tier] || row.tier,
        }))
        setNeeds(flattened)
      }

      // Fetch user's existing interest expressions
      const { data: intRows } = await supabase
        .from('contribution_interests_beta')
        .select('id, need_id, status, message')
        .eq('user_id', user.id)

      const map = {}
      for (const row of intRows || []) {
        map[row.need_id] = row
      }
      setInterestsByNeed(map)
    } catch (err) {
      console.error('Load needs/interests error:', err)
    }
    setNeedsLoading(false)
  }

  // ── Express interest ─────────────────────────────────────────

  async function handleExpressInterest(need, message) {
    setPendingExpress(true)
    try {
      const { data, error } = await supabase
        .from('contribution_interests_beta')
        .upsert(
          {
            user_id: user.id,
            need_id: need.id,
            status: 'expressed',
            message: message || null,
          },
          { onConflict: 'user_id,need_id' },
        )
        .select()
        .single()

      if (error) {
        console.error('Express interest error:', error)
        return
      }

      setInterestsByNeed(prev => ({ ...prev, [need.id]: data }))
    } finally {
      setPendingExpress(false)
    }
  }

  // ── Profile updates ──────────────────────────────────────────

  async function handleProfileUpdate(patch) {
    // Optimistic
    setProfile(prev => ({ ...(prev || {}), ...patch }))

    // Ensure row exists, then update
    const { data, error } = await supabase
      .from('contributor_profiles_beta')
      .upsert(
        {
          user_id: user.id,
          ...profile,
          ...patch,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      // Reload to recover
      loadProfile()
      return
    }

    setProfile(data)

    // If focus changed, resolve ancestors
    if (patch.location_focus_id && patch.location_focus_id !== userFocusId) {
      setUserFocusId(patch.location_focus_id)
      const ancestors = await resolveAncestors(patch.location_focus_id)
      setAncestorFocusIds(ancestors)
    }
  }

  // ── Filtered & sorted needs ──────────────────────────────────

  const filteredNeeds = useMemo(() => {
    const filtered = applyFilters(needs, filters, userFocusId, ancestorFocusIds)
    return sortNeeds(filtered, filters, userFocusId, ancestorFocusIds)
  }, [needs, filters, userFocusId, ancestorFocusIds])

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>

      <div style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: 'clamp(72px, 10vw, 96px) 24px 60px',
      }}>

        <PageHeader />

        <Tabs active={activeTab} onChange={setActiveTab} />

        {/* ── Tab 1: Find ─────────────────────────────────────── */}
        {activeTab === 'find' && (
          <div>
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              tiers={CONTRIBUTION_TIERS}
              civDomains={CIV_DOMAINS}
              userHasFocus={!!userFocusId}
            />

            {needsLoading ? (
              <NeedsLoading />
            ) : filteredNeeds.length === 0 ? (
              <EmptyNeedsState
                filtersActive={
                  (filters.tiers?.length || 0) +
                  (filters.domains?.length || 0) +
                  (filters.principles?.length || 0) > 0 ||
                  filters.medium !== 'any'
                }
                totalNeedsExist={needs.length > 0}
              />
            ) : (
              <div>
                {/* Result count + near-me note */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  <span style={{
                    ...sc,
                    fontSize: '11px',
                    letterSpacing: '0.14em',
                    color: 'rgba(15,21,35,0.55)',
                    textTransform: 'uppercase',
                  }}>
                    {filteredNeeds.length} open {filteredNeeds.length === 1 ? 'need' : 'needs'}
                  </span>
                  {filters.nearMeFirst && userFocusId && (
                    <span style={{
                      ...body,
                      fontSize: '12px',
                      color: 'rgba(15,21,35,0.55)',
                    }}>
                      Sorted near you first.
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {filteredNeeds.map(need => (
                    <NeedCard
                      key={need.id}
                      need={need}
                      userInterest={interestsByNeed[need.id] || null}
                      onExpressInterest={handleExpressInterest}
                      pendingExpress={pendingExpress}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Offering ─────────────────────────────────── */}
        {activeTab === 'offer' && (
          <div>
            {profileLoading ? (
              <div style={{
                padding: '32px',
                background: '#FFFFFF',
                border: '1px solid rgba(200,146,42,0.14)',
                borderRadius: '14px',
                opacity: 0.5,
                animation: 'pulse 1.8s ease-in-out infinite',
              }} />
            ) : (
              <OfferingPanel
                profile={profile}
                onUpdate={handleProfileUpdate}
                tiers={CONTRIBUTION_TIERS}
                civDomains={CIV_DOMAINS}
              />
            )}
          </div>
        )}

      </div>
    </div>
  )
}
