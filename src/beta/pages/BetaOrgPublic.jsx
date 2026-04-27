// src/beta/pages/BetaOrgPublic.jsx
// Module 6: read-only public org profile at /beta/org/:id
// Mirrors contributor profile shape: identity strip, mission, methodology,
// focuses, structural posture, needs (when needs_visible), offerings,
// principle alignment, receipts (empty state v1).
// No engagement metrics. No edit affordances.

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import {
  body, sc, gold, dark, parch,
  DOMAIN_LABEL, SCALE_LABEL,
  OFFERING_TYPES, CONTRIBUTION_MODES, ACCESS_TYPES,
  PLACEMENT_TIER,
} from '../components/OrgShared'
import { PrincipleStrip } from '../components/PrincipleStrip'
import { DOMAIN_COLORS } from '../constants/domains'

// ── Small utilities ──────────────────────────────────────────

function Eyebrow({ children, style = {} }) {
  return (
    <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: 'rgba(15,21,35,0.40)', textTransform: 'uppercase', marginBottom: '20px', ...style }}>
      {children}
    </div>
  )
}

function Rule() {
  return <div style={{ height: '1px', background: 'rgba(200,146,42,0.10)', margin: '56px 0' }} />
}

function NotFound() {
  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '160px 24px', textAlign: 'center' }}>
        <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.45)', lineHeight: 1.75 }}>
          This organisation profile does not exist or is not publicly visible.
        </p>
      </div>
    </div>
  )
}

// ── Identity strip ───────────────────────────────────────────

function OrgIdentityStrip({ actor, focusName, primaryDomain, principalTier, isOwner }) {
  const domainColor = DOMAIN_COLORS[primaryDomain] || gold
  const tierConfig  = PLACEMENT_TIER[principalTier]

  return (
    <div style={{ marginBottom: '64px' }}>
      {/* Domain tag */}
      {primaryDomain && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: domainColor, flexShrink: 0 }} />
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: 'rgba(15,21,35,0.50)', textTransform: 'uppercase' }}>
            {DOMAIN_LABEL[primaryDomain]}
          </span>
          {actor.scale && (
            <>
              <span style={{ color: 'rgba(200,146,42,0.30)', fontSize: '12px' }}>·</span>
              <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.40)' }}>
                {SCALE_LABEL[actor.scale] || actor.scale}
              </span>
            </>
          )}
        </div>
      )}

      {/* Name */}
      <h1 style={{ ...body, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, color: dark, lineHeight: 1.06, letterSpacing: '-0.01em', margin: '0 0 12px' }}>
        {actor.name}
      </h1>

      {/* Location */}
      {(actor.location_name || focusName) && (
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.45)', marginBottom: '20px', textTransform: 'uppercase' }}>
          {actor.location_name || focusName}
        </div>
      )}

      {/* Placement tier badge */}
      {tierConfig && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: tierConfig.bg, border: `1px solid ${tierConfig.color}30`, borderRadius: '4px', marginBottom: '20px' }}>
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: tierConfig.color }}>
            {tierConfig.label}
          </span>
        </div>
      )}

      {/* Reach */}
      {actor.reach && (
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.60)', margin: '0 0 20px' }}>
          {actor.reach}
        </p>
      )}

      {/* Website + manage link row */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {actor.website && (
          <a href={actor.website} target="_blank" rel="noopener noreferrer"
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, textDecoration: 'none' }}>
            Website →
          </a>
        )}
        {isOwner && (
          <Link to={`/beta/org/${actor.id}/manage`}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)', textDecoration: 'none' }}>
            Manage →
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Mission section ───────────────────────────────────────────

function OrgMission({ description, impactSummary }) {
  if (!description && !impactSummary) return null
  return (
    <div style={{ marginBottom: '72px' }}>
      <Eyebrow>Mission</Eyebrow>
      {description && (
        <p style={{ ...body, fontSize: 'clamp(17px, 2vw, 20px)', fontWeight: 300, color: dark, lineHeight: 1.75, margin: '0 0 24px', maxWidth: '580px' }}>
          {description}
        </p>
      )}
      {impactSummary && (
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, maxWidth: '560px', margin: 0 }}>
          {impactSummary}
        </p>
      )}
    </div>
  )
}

// ── Civilisational placement ─────────────────────────────────

function OrgPlacement({ domains, subdomains, lenses, problemChains, alignmentNotes }) {
  const hasDomains  = domains && domains.length > 0
  const hasLenses   = lenses && lenses.length > 0
  const hasProblems = problemChains && problemChains.length > 0

  if (!hasDomains && !hasLenses && !hasProblems) return null

  return (
    <div style={{ marginBottom: '72px' }}>
      <Eyebrow>Where this work belongs</Eyebrow>

      {/* Domain stack — primary prominent, others quieter */}
      {hasDomains && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {domains.map((slug, i) => {
            const color = DOMAIN_COLORS[slug] || gold
            const note  = alignmentNotes?.[slug]
            const domainSubs = (subdomains || []).filter(sub =>
              sub.startsWith(slug.slice(0, 3)) // rough prefix match
            )
            return (
              <div key={slug} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '3px', background: color, borderRadius: '2px', flexShrink: 0, alignSelf: 'stretch', opacity: i === 0 ? 1 : 0.45 }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: note ? '6px' : 0 }}>
                    <span style={{ ...body, fontSize: i === 0 ? '18px' : '15px', fontWeight: 300, color: i === 0 ? dark : 'rgba(15,21,35,0.55)' }}>
                      {DOMAIN_LABEL[slug] || slug}
                    </span>
                    {i === 0 && (
                      <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: '#FFFFFF', background: color, padding: '2px 8px', borderRadius: '40px' }}>Primary</span>
                    )}
                  </div>
                  {note && (
                    <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.65, margin: 0, maxWidth: '480px' }}>
                      {note}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lenses */}
      {hasLenses && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.35)', marginBottom: '10px' }}>
            Lenses
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {lenses.map(l => (
              <span key={l} style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)', background: 'rgba(15,21,35,0.04)', border: '1px solid rgba(15,21,35,0.10)', borderRadius: '4px', padding: '3px 9px' }}>
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Primary problem chain */}
      {hasProblems && (
        <div>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.35)', marginBottom: '10px' }}>
            Problem addressed
          </div>
          <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, margin: 0 }}>
            {problemChains[0]}
          </p>
          {problemChains.length > 1 && (
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.45)', marginTop: '6px' }}>
              +{problemChains.length - 1} more
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Offerings ────────────────────────────────────────────────

function OrgOfferings({ offerings }) {
  if (!offerings || offerings.length === 0) return null

  const flagship = offerings.filter(o => o.is_flagship)
  const others   = offerings.filter(o => !o.is_flagship)
  const sorted   = [...flagship, ...others]

  return (
    <div style={{ marginBottom: '72px' }}>
      <Eyebrow>Offerings</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sorted.map(o => {
          const typeLabel   = OFFERING_TYPES.find(t => t.value === o.offering_type)?.label || o.offering_type
          const modeLabel   = CONTRIBUTION_MODES.find(m => m.value === o.contribution_mode)?.label || o.contribution_mode
          const accessLabel = ACCESS_TYPES.find(a => a.value === o.access_type)?.label || o.access_type

          return (
            <div key={o.id} style={{ padding: '22px 24px', background: o.is_flagship ? 'rgba(200,146,42,0.04)' : '#FFFFFF', border: o.is_flagship ? '1.5px solid rgba(200,146,42,0.35)' : '1px solid rgba(200,146,42,0.14)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {o.is_flagship && (
                  <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em', background: '#C8922A', color: '#FFFFFF', padding: '2px 10px', borderRadius: '40px' }}>Flagship</span>
                )}
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold, background: 'rgba(200,146,42,0.07)', border: '1px solid rgba(200,146,42,0.22)', borderRadius: '4px', padding: '2px 8px' }}>{typeLabel}</span>
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.45)', background: 'rgba(15,21,35,0.04)', borderRadius: '4px', padding: '2px 8px' }}>{modeLabel}</span>
                <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.45)' }}>{accessLabel}</span>
              </div>
              <h3 style={{ ...body, fontSize: '18px', fontWeight: 300, color: dark, margin: '0 0 8px', lineHeight: 1.3 }}>{o.title}</h3>
              {o.description && (
                <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.7, margin: o.url ? '0 0 10px' : 0 }}>
                  {o.description}
                </p>
              )}
              {o.url && (
                <a href={o.url} target="_blank" rel="noopener noreferrer" style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold, textDecoration: 'none' }}>
                  Learn more →
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Public needs ─────────────────────────────────────────────

function OrgNeeds({ needs }) {
  // In-person first within open, then in-progress
  const openNeeds = needs
    .filter(n => n.status === 'open')
    .sort((a, b) => {
      if (a.medium === 'in_person' && b.medium !== 'in_person') return -1
      if (b.medium === 'in_person' && a.medium !== 'in_person') return 1
      return 0
    })

  if (openNeeds.length === 0) return null

  return (
    <div style={{ marginBottom: '72px' }}>
      <Eyebrow>Open needs</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {openNeeds.map(n => (
          <div key={n.id} style={{ padding: '20px 22px', background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.14)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.50)' }}>
                {n.need_type} · {n.size}
              </span>
              {n.medium === 'in_person' && (
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: gold, background: 'rgba(200,146,42,0.07)', border: '1px solid rgba(200,146,42,0.22)', borderRadius: '4px', padding: '2px 8px' }}>
                  In person
                </span>
              )}
              {n.time_estimate && (
                <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.45)' }}>{n.time_estimate}</span>
              )}
            </div>
            <h4 style={{ ...body, fontSize: '17px', fontWeight: 300, color: dark, margin: '0 0 6px' }}>{n.title}</h4>
            {n.description && (
              <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.65, margin: 0 }}>
                {n.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Principle alignment ──────────────────────────────────────

function OrgPrincipleAlignment({ principleTaggings }) {
  if (!principleTaggings || principleTaggings.length === 0) return null
  return (
    <div style={{ marginBottom: '72px' }}>
      <Eyebrow>Platform principles</Eyebrow>
      <PrincipleStrip taggings={principleTaggings} />
    </div>
  )
}

// ── Sprint receipts stub (v1) ────────────────────────────────

function OrgReceiptsStub() {
  return (
    <div style={{ marginBottom: '72px' }}>
      <Eyebrow>Contribution receipts</Eyebrow>
      <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.40)', lineHeight: 1.75, margin: 0 }}>
        Confirmed contributions and their outcomes will appear here.
      </p>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function BetaOrgPublicPage() {
  const { id } = useParams()
  const { user } = useAuth()

  const [actor, setActor]           = useState(null)
  const [offerings, setOfferings]   = useState([])
  const [needs, setNeeds]           = useState([])
  const [principles, setPrinciples] = useState([])
  const [focusName, setFocusName]   = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [actorRes, offeringsRes, needsRes, principlesRes] = await Promise.all([
        supabase.from('nextus_actors')
          .select('*, focus:focus_id(id, name, type, slug)')
          .eq('id', id)
          .single(),
        supabase.from('nextus_actor_offerings')
          .select('*')
          .eq('actor_id', id)
          .order('is_flagship', { ascending: false })
          .order('sort_order', { ascending: true, nullsFirst: false }),
        supabase.from('nextus_needs')
          .select('*')
          .eq('actor_id', id)
          .in('status', ['open', 'in_progress']),
        supabase.from('principle_taggings')
          .select('principle_slug, weight')
          .eq('target_type', 'actor')
          .eq('target_id', id),
      ])

      setActor(actorRes.data)
      setOfferings(offeringsRes.data || [])
      setNeeds(needsRes.data || [])
      setPrinciples(principlesRes.data || [])
      setFocusName(actorRes.data?.focus?.name || null)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '160px 24px', textAlign: 'center' }}>
          <div className="loading" />
        </div>
      </div>
    )
  }

  if (!actor) return <NotFound />

  const isOwner        = user?.id === actor.profile_owner
  const primaryDomain  = (actor.domains || [])[0] || actor.domain_id || null
  const allDomains     = actor.domains || (actor.domain_id ? [actor.domain_id] : [])
  const allSubdomains  = actor.subdomains || []
  const lenses         = actor.lenses || []
  const problemChains  = actor.problem_chains || []
  const alignmentNotes = actor.domain_alignment_notes || {}

  // Placement tier from alignment_score
  const score = actor.alignment_score
  const tier  = score == null ? null
    : score >= 9 ? 'exemplar'
    : score >= 7 ? 'qualified'
    : score >= 5 ? 'contested'
    : 'pattern_instance'

  const showNeeds = actor.needs_visible !== false && needs.length > 0

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      <style>{`
        @media (max-width: 640px) {
          .beta-org-public { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="beta-org-public" style={{ maxWidth: '680px', margin: '0 auto', padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 160px' }}>

        {/* Identity */}
        <OrgIdentityStrip
          actor={actor}
          focusName={focusName}
          primaryDomain={primaryDomain}
          principalTier={tier}
          isOwner={isOwner}
        />

        {/* Mission */}
        <OrgMission description={actor.description} impactSummary={actor.impact_summary} />

        {(actor.description || actor.impact_summary) && <Rule />}

        {/* Civilisational placement */}
        {allDomains.length > 0 && (
          <>
            <OrgPlacement
              domains={allDomains}
              subdomains={allSubdomains}
              lenses={lenses}
              problemChains={problemChains}
              alignmentNotes={alignmentNotes}
            />
            <Rule />
          </>
        )}

        {/* Offerings */}
        <OrgOfferings offerings={offerings} />
        {offerings.length > 0 && <Rule />}

        {/* Open needs */}
        {showNeeds && (
          <>
            <OrgNeeds needs={needs} />
            <Rule />
          </>
        )}

        {/* Principle alignment */}
        {principles.length > 0 && (
          <>
            <OrgPrincipleAlignment principleTaggings={principles} />
            <Rule />
          </>
        )}

        {/* Receipts — v1 stub */}
        <OrgReceiptsStub />

      </div>

      <SiteFooter />
    </div>
  )
}
