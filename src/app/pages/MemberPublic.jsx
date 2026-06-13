// src/app/pages/MemberPublic.jsx
// ─────────────────────────────────────────────────────────────────────────
// The public member card — a person's placement in the ecosystem.
//
// This surface is CONTRIBUTION-RAIL ONLY. It shows where a person stands and
// what they contribute toward the world:
//   • bio (self-authored)            • domains of interest (stance, not scores)
//   • claimed actor profiles         • Planet Sprints completed (civ scale)
//   • spaces / affiliations          • public links
//
// It NEVER shows the developmental rail — Horizon Self, Map scores, I Am
// Statements, journal, practices, streaks, or self-side Stretches. Those are
// private with no opt-in. The member card is opt-in: it renders only when the
// member has published it (member_card_public = true), enforced by the
// public.member_cards view (migration 116).
//
// Data sources:
//   member_cards            → bio, name, domains_of_interest, location, region
//   nextus_actors           → owned/claimed actor profiles (live only)
//   target_sprint_sessions  → completed civ-scale Planet Sprints
//   nextus_user_affiliations→ public affiliations (spaces / places)
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { serif, body, sc } from '../../lib/designTokens'
import { SELF_DOMAIN_COLORS, SELF_DOMAIN_LABELS } from '../constants/domains'

const BG     = '#FAFAF7'
const DARK   = '#0F1523'
const GOLD   = '#C8922A'
const GOLD_DK= '#A8721A'
const RULE   = 'rgba(200,146,42,0.20)'

function SectionLabel({ children }) {
  return (
    <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em',
      textTransform: 'uppercase', color: GOLD_DK, marginBottom: '14px' }}>
      {children}
    </div>
  )
}

function DomainChip({ slug }) {
  const color = SELF_DOMAIN_COLORS[slug] || GOLD
  const label = SELF_DOMAIN_LABELS[slug] || slug
  return (
    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.04em',
      color: DARK, background: `${color}14`, border: `1px solid ${color}55`,
      borderRadius: '999px', padding: '5px 14px', display: 'inline-block' }}>
      {label}
    </span>
  )
}

export function MemberPublicPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [member,  setMember]  = useState(null)
  const [actors,  setActors]  = useState([])
  const [sprints, setSprints] = useState([])
  const [spaces,  setSpaces]  = useState([])
  const [notFound,setNotFound]= useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setNotFound(false)

      // 1. The card itself (public view — only published members are visible)
      const { data: card } = await supabase
        .from('member_cards')
        .select('*')
        .eq('member_slug', slug)
        .maybeSingle()

      if (cancelled) return
      if (!card) { setNotFound(true); setLoading(false); return }
      setMember(card)

      // We need the user_id to fetch owned actors / sprints / affiliations.
      // member_cards intentionally omits it; resolve via a second narrow query
      // that returns id only for the published member.
      const { data: idRow } = await supabase
        .from('users')
        .select('id')
        .eq('member_slug', slug)
        .eq('member_card_public', true)
        .maybeSingle()

      const userId = idRow?.id
      if (!userId) { setLoading(false); return }

      // 2. Claimed actor profiles — live only
      const { data: owned } = await supabase
        .from('nextus_actors')
        .select('id, name, slug, type, image_url, tagline, domains')
        .eq('profile_owner', userId)
        .eq('status', 'live')
        .order('name')
      if (!cancelled) setActors(owned || [])

      // 3. Completed Planet Sprints (civ scale). Title lives in
      //    domain_data.__planet_sprint__; degrade gracefully if absent.
      const { data: sprintRows } = await supabase
        .from('target_sprint_sessions')
        .select('id, scale, domain_data, created_at, completed_at')
        .eq('user_id', userId)
        .eq('scale', 'civ')
        .order('created_at', { ascending: false })
      if (!cancelled) {
        const done = (sprintRows || [])
          .filter(r => r.completed_at)
          .map(r => ({
            id: r.id,
            title: r.domain_data?.__planet_sprint__?.title
                 || r.domain_data?.__planet_sprint__?.goal
                 || 'Planet Sprint',
            completed_at: r.completed_at,
          }))
        setSprints(done)
      }

      // 4. Public affiliations (spaces / places)
      const { data: affs } = await supabase
        .from('nextus_user_affiliations')
        .select('id, relationship_type, focus:focus_id(id, name, type)')
        .eq('user_id', userId)
        .eq('visibility', 'public')
      if (!cancelled) setSpaces((affs || []).filter(a => a.focus))

      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: '100vh' }}>
        <Nav activePath="" />
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '120px 32px',
          textAlign: 'center', ...body, color: 'rgba(15,21,35,0.45)', fontSize: '15px' }}>
          Loading…
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ background: BG, minHeight: '100vh' }}>
        <Nav activePath="" />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '140px 32px', textAlign: 'center' }}>
          <h1 style={{ ...serif, fontSize: '34px', fontWeight: 300, color: DARK, marginBottom: '12px' }}>
            No member here
          </h1>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7 }}>
            This member card isn't public, or the link is wrong.
          </p>
          <Link to="/search" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
            color: GOLD_DK, textDecoration: 'none', display: 'inline-block', marginTop: '24px' }}>
            BROWSE THE ATLAS →
          </Link>
        </div>
        <SiteFooter />
      </div>
    )
  }

  const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Member'
  const initial  = (fullName.trim().charAt(0) || 'M').toUpperCase()
  const place    = member.location || null
  const domains  = member.domains_of_interest || []
  const isSelf   = user && member && user.id && false // self-preview handled server-side; placeholder

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>
      <Nav activePath="" />

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '72px 32px 120px' }}>

        {/* Eyebrow */}
        <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em',
          textTransform: 'uppercase', color: GOLD_DK, marginBottom: '18px' }}>
          NextUs · Member
        </div>

        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <div style={{ width: '76px', height: '76px', borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${GOLD}`, background: '#FFFFFF', color: GOLD_DK,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...serif, fontSize: '30px', fontWeight: 300 }}>
            {initial}
          </div>
          <div>
            <h1 style={{ ...serif, fontSize: 'clamp(30px,5vw,44px)', fontWeight: 300,
              color: DARK, lineHeight: 1.05, margin: 0 }}>
              {fullName}
            </h1>
            {place && (
              <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', marginTop: '6px' }}>
                {place}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {member.public_bio && (
          <p style={{ ...body, fontSize: '18px', color: DARK, lineHeight: 1.7,
            marginBottom: '48px', maxWidth: '640px' }}>
            {member.public_bio}
          </p>
        )}

        {/* Domains of interest */}
        {domains.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <SectionLabel>Where they're working</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {domains.map(d => <DomainChip key={d} slug={d} />)}
            </div>
          </section>
        )}

        {/* Claimed actor profiles */}
        {actors.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <SectionLabel>What they're part of</SectionLabel>
            <div style={{ display: 'grid', gap: '12px' }}>
              {actors.map(a => (
                <Link key={a.id} to={`/org/${a.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px',
                    background: '#FFFFFF', border: `1px solid ${RULE}`, borderRadius: '12px',
                    padding: '14px 18px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '8px', flexShrink: 0,
                      border: `1px solid ${RULE}`, background: BG, overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {a.image_url
                        ? <img src={a.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <span style={{ ...serif, fontSize: '18px', color: GOLD_DK }}>{(a.name||'?').charAt(0)}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...serif, fontSize: '19px', fontWeight: 400, color: DARK }}>{a.name}</div>
                      {a.tagline && (
                        <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.tagline}
                        </div>
                      )}
                    </div>
                    <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: GOLD_DK }}>{a.type}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Spaces / affiliations */}
        {spaces.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <SectionLabel>Spaces they're connected to</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {spaces.map(s => (
                <span key={s.id} style={{ ...body, fontSize: '14px', color: DARK,
                  background: '#FFFFFF', border: `1px solid ${RULE}`,
                  borderRadius: '999px', padding: '6px 16px' }}>
                  {s.focus.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Planet Sprints */}
        {sprints.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <SectionLabel>What they've done for the world</SectionLabel>
            <div style={{ display: 'grid', gap: '10px' }}>
              {sprints.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: '14px',
                  background: '#FFFFFF', border: `1px solid ${RULE}`,
                  borderRadius: '12px', padding: '14px 18px' }}>
                  <span style={{ ...body, fontSize: '16px', color: DARK }}>{s.title}</span>
                  <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: GOLD_DK, whiteSpace: 'nowrap' }}>
                    Planet Sprint
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty-but-published fallback */}
        {!member.public_bio && domains.length === 0 && actors.length === 0
          && spaces.length === 0 && sprints.length === 0 && (
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.45)',
            lineHeight: 1.7, fontStyle: 'normal' }}>
            This member is just getting started.
          </p>
        )}

      </div>

      <SiteFooter />
    </div>
  )
}

export default MemberPublicPage
