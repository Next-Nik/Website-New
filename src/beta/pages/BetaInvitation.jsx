// src/beta/pages/BetaInvitation.jsx
// Module 13: single invitation surface at /beta/invitation/:slug
// Four-part structure: Surface / Current best available / The gap / The invitation.
// Voice: honest, not punitive. Practices not companies.

import { useState, useEffect } from 'react'
import { useParams, Link }     from 'react-router-dom'
import { Nav }                 from '../../components/Nav'
import { SiteFooter }          from '../../components/SiteFooter'
import { supabase }            from '../../hooks/useSupabase'
import { GradientPosition, TrajectoryArrow } from '../components/GradientPosition'
import { PrincipleStrip }      from '../components/PrincipleStrip'

const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const CIV_DOMAIN_LABEL = {
  'human-being':    'Human Being',
  'society':        'Society',
  'nature':         'Nature',
  'technology':     'Technology',
  'finance-economy':'Finance and Economy',
  'legacy':         'Legacy',
  'vision':         'Vision',
}

// ── Gap sub-block ────────────────────────────────────────────

function GapBlock({ label, text }) {
  if (!text) return null
  return (
    <div style={{
      padding: '20px 24px',
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.14)',
      borderRadius: '10px',
    }}>
      <p style={{
        ...sc,
        fontSize: '11px',
        letterSpacing: '0.20em',
        color: 'rgba(15,21,35,0.40)',
        textTransform: 'uppercase',
        marginBottom: '10px',
      }}>
        {label}
      </p>
      <p style={{
        ...body,
        fontSize: '16px',
        fontWeight: 300,
        color: 'rgba(15,21,35,0.80)',
        lineHeight: 1.75,
        margin: 0,
      }}>
        {text}
      </p>
    </div>
  )
}

// ── Actor card on the invitation surface ─────────────────────

function InvitationActorCard({ actor, side }) {
  // side: "extractive" | "regenerative" — affects colour register
  const accentColor = side === 'regenerative' ? '#2D6A4F' : '#8A3030'
  const accentBg    = side === 'regenerative' ? 'rgba(45,106,79,0.05)' : 'rgba(138,48,48,0.04)'
  const accentBorder= side === 'regenerative' ? 'rgba(45,106,79,0.20)' : 'rgba(138,48,48,0.18)'

  return (
    <div style={{
      padding: '18px 22px',
      background: accentBg,
      border: `1px solid ${accentBorder}`,
      borderRadius: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link
              to={`/beta/org/${actor.id}`}
              style={{
                ...body,
                fontSize: '17px',
                fontWeight: 400,
                color: dark,
                textDecoration: 'none',
                borderBottom: '1px dotted rgba(15,21,35,0.20)',
              }}
            >
              {actor.name}
            </Link>
            {actor.gradient_trajectory && (
              <TrajectoryArrow trajectory={actor.gradient_trajectory} />
            )}
          </div>
          {actor.location_name && (
            <p style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.14em',
              color: 'rgba(15,21,35,0.45)',
              marginTop: '4px',
            }}>
              {actor.location_name}
            </p>
          )}
        </div>

        <Link
          to={`/beta/org/${actor.id}`}
          style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.12em',
            color: accentColor,
            textDecoration: 'none',
            flexShrink: 0,
            borderBottom: `1px dotted ${accentColor}`,
          }}
        >
          Profile
        </Link>
      </div>

      {/* Gradient bar */}
      {actor.gradient_position != null && (
        <GradientPosition
          position={actor.gradient_position}
          trajectory={actor.gradient_trajectory}
          actorName={actor.name}
          compact
        />
      )}

      {/* Description */}
      {actor.description && (
        <p style={{
          ...body,
          fontSize: '14px',
          color: 'rgba(15,21,35,0.60)',
          lineHeight: 1.65,
          margin: '12px 0 0',
        }}>
          {actor.description.length > 200 ? actor.description.slice(0, 200) + '...' : actor.description}
        </p>
      )}
    </div>
  )
}

// ── Section chrome ───────────────────────────────────────────

function SectionNumber({ n }) {
  return (
    <div style={{
      ...sc,
      fontSize: '11px',
      letterSpacing: '0.22em',
      color: 'rgba(200,146,42,0.55)',
      marginBottom: '10px',
    }}>
      {String(n).padStart(2, '0')}
    </div>
  )
}

function SectionRule() {
  return (
    <div style={{
      height: '1px',
      background: 'rgba(200,146,42,0.10)',
      margin: '64px 0',
    }} />
  )
}

// ── Loading / not found ──────────────────────────────────────

function NotFound() {
  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="" />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '160px 24px', textAlign: 'center' }}>
        <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.45)', lineHeight: 1.75 }}>
          This invitation does not exist or has been archived.
        </p>
        <Link to="/beta/invitation" style={{
          ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold,
          textDecoration: 'none', display: 'inline-block', marginTop: '20px',
        }}>
          All invitations
        </Link>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function BetaInvitationPage() {
  const { slug } = useParams()
  const [invitation, setInvitation]   = useState(null)
  const [extractiveActors, setExtractiveActors]   = useState([])
  const [regenerativeActors, setRegenerativeActors] = useState([])
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      const { data: inv, error } = await supabase
        .from('invitations_beta')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle()

      if (error || !inv) {
        if (!cancelled) { setNotFound(true); setLoading(false) }
        return
      }

      if (cancelled) return
      setInvitation(inv)

      // Fetch actors for both sides in parallel
      const extractiveIds   = inv.extractive_actors   || []
      const regenerativeIds = inv.regenerative_actors || []

      const [extRes, regRes] = await Promise.all([
        extractiveIds.length > 0
          ? supabase
              .from('nextus_actors')
              .select('id, name, description, location_name, gradient_position, gradient_trajectory')
              .in('id', extractiveIds)
          : { data: [] },
        regenerativeIds.length > 0
          ? supabase
              .from('nextus_actors')
              .select('id, name, description, location_name, gradient_position, gradient_trajectory')
              .in('id', regenerativeIds)
          : { data: [] },
      ])

      if (!cancelled) {
        // Preserve the original ordering from the invitation arrays
        const extMap = Object.fromEntries((extRes.data || []).map(a => [a.id, a]))
        const regMap = Object.fromEntries((regRes.data || []).map(a => [a.id, a]))
        setExtractiveActors(extractiveIds.map(id => extMap[id]).filter(Boolean))
        setRegenerativeActors(regenerativeIds.map(id => regMap[id]).filter(Boolean))
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="" />
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '160px 24px', textAlign: 'center' }}>
          <div className="loading" />
        </div>
      </div>
    )
  }

  if (notFound || !invitation) return <NotFound />

  // Parse gap_summary — stored as structured text or JSON
  // Support both jsonb object and plain text fallback
  let gap = {}
  try {
    gap = typeof invitation.gap_summary === 'object' && invitation.gap_summary !== null
      ? invitation.gap_summary
      : JSON.parse(invitation.gap_summary)
  } catch {
    // Plain text fallback: show as a single "overview" block
    gap = { overview: invitation.gap_summary }
  }

  const domains = invitation.domains || []
  const primaryDomain = domains[0]

  // Principle tags if any stored on the invitation
  const principleSlugs = invitation.platform_principles || []

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="" />

      <style>{`
        @media (max-width: 640px) {
          .beta-invitation-main { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="beta-invitation-main" style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 160px',
      }}>

        {/* Domain breadcrumb */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
          <Link to="/beta/invitation" style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.45)', textDecoration: 'none' }}>
            Invitations
          </Link>
          {primaryDomain && (
            <>
              <span style={{ color: 'rgba(200,146,42,0.40)' }}>/</span>
              <Link
                to={`/beta/domain/${primaryDomain}`}
                style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, textDecoration: 'none' }}
              >
                {CIV_DOMAIN_LABEL[primaryDomain] || primaryDomain}
              </Link>
            </>
          )}
          {domains.slice(1).map(d => (
            <span key={d} style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.40)' }}>
              · {CIV_DOMAIN_LABEL[d] || d}
            </span>
          ))}
        </div>

        {/* Page title */}
        <h1 style={{
          ...body,
          fontSize: 'clamp(28px, 4.5vw, 48px)',
          fontWeight: 300,
          color: dark,
          lineHeight: 1.08,
          letterSpacing: '-0.01em',
          margin: '0 0 16px',
        }}>
          {invitation.title || 'An invitation'}
        </h1>

        {invitation.subtitle && (
          <p style={{
            ...body,
            fontSize: 'clamp(16px, 2vw, 19px)',
            fontWeight: 300,
            color: 'rgba(15,21,35,0.65)',
            lineHeight: 1.7,
            margin: '0 0 56px',
            maxWidth: '580px',
          }}>
            {invitation.subtitle}
          </p>
        )}

        {!invitation.subtitle && <div style={{ marginBottom: '56px' }} />}

        {/* ── SECTION 1: Surface ─────────────────────────── */}
        <section aria-label="Surface">
          <SectionNumber n={1} />
          <h2 style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.22em',
            color: 'rgba(15,21,35,0.40)',
            textTransform: 'uppercase',
            marginBottom: '20px',
            fontWeight: 400,
          }}>
            Surface
          </h2>

          <p style={{
            ...body,
            fontSize: 'clamp(16px, 2vw, 18px)',
            fontWeight: 300,
            color: dark,
            lineHeight: 1.75,
            margin: '0 0 28px',
            maxWidth: '620px',
          }}>
            {invitation.extractive_practice}
          </p>

          {extractiveActors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {extractiveActors.map(actor => (
                <InvitationActorCard key={actor.id} actor={actor} side="extractive" />
              ))}
            </div>
          )}

          {extractiveActors.length === 0 && (
            <p style={{
              ...body,
              fontSize: '14px',
              color: 'rgba(15,21,35,0.45)',
              fontStyle: 'italic',
              lineHeight: 1.65,
            }}>
              Actor placement is a curatorial decision. Actors engaging with this practice will be named here as the platform develops.
            </p>
          )}
        </section>

        <SectionRule />

        {/* ── SECTION 2: Current best available ─────────── */}
        <section aria-label="Current best available">
          <SectionNumber n={2} />
          <h2 style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.22em',
            color: 'rgba(15,21,35,0.40)',
            textTransform: 'uppercase',
            marginBottom: '6px',
            fontWeight: 400,
          }}>
            Current best available
          </h2>
          {/* Canonical framing — not abbreviated, not paraphrased */}
          <p style={{
            ...body,
            fontSize: '13px',
            color: 'rgba(15,21,35,0.45)',
            lineHeight: 1.6,
            margin: '0 0 24px',
            fontStyle: 'italic',
          }}>
            Not best stated with false certainty, but the most promising alternative at this stage of evidence, with known limitations named.
          </p>

          <p style={{
            ...body,
            fontSize: 'clamp(16px, 2vw, 18px)',
            fontWeight: 300,
            color: dark,
            lineHeight: 1.75,
            margin: '0 0 28px',
            maxWidth: '620px',
          }}>
            {invitation.regenerative_practice}
          </p>

          {regenerativeActors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {regenerativeActors.map(actor => (
                <InvitationActorCard key={actor.id} actor={actor} side="regenerative" />
              ))}
            </div>
          )}

          {regenerativeActors.length === 0 && (
            <p style={{
              ...body,
              fontSize: '14px',
              color: 'rgba(15,21,35,0.45)',
              fontStyle: 'italic',
              lineHeight: 1.65,
            }}>
              Actors working on this regenerative practice will be named here as curation develops.
            </p>
          )}
        </section>

        <SectionRule />

        {/* ── SECTION 3: The gap ────────────────────────── */}
        <section aria-label="The gap">
          <SectionNumber n={3} />
          <h2 style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.22em',
            color: 'rgba(15,21,35,0.40)',
            textTransform: 'uppercase',
            marginBottom: '6px',
            fontWeight: 400,
          }}>
            The gap
          </h2>
          <p style={{
            ...body,
            fontSize: '13px',
            color: 'rgba(15,21,35,0.45)',
            lineHeight: 1.6,
            margin: '0 0 28px',
            fontStyle: 'italic',
          }}>
            The honest distance between the extractive incumbent and the regenerative alternative. Named without exaggerating the difficulty or pretending it does not exist.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {gap.technical       && <GapBlock label="Technical"       text={gap.technical} />}
            {gap.economic        && <GapBlock label="Economic"        text={gap.economic} />}
            {gap.infrastructural && <GapBlock label="Infrastructural" text={gap.infrastructural} />}
            {gap.cultural        && <GapBlock label="Cultural"        text={gap.cultural} />}
            {/* Fallback if gap_summary was plain text */}
            {gap.overview && !gap.technical && !gap.economic && (
              <GapBlock label="Overview" text={gap.overview} />
            )}
          </div>
        </section>

        <SectionRule />

        {/* ── SECTION 4: The invitation ─────────────────── */}
        <section aria-label="The invitation">
          <SectionNumber n={4} />
          <h2 style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.22em',
            color: 'rgba(15,21,35,0.40)',
            textTransform: 'uppercase',
            marginBottom: '20px',
            fontWeight: 400,
          }}>
            The invitation
          </h2>

          <div style={{
            paddingLeft: '20px',
            borderLeft: '3px solid rgba(200,146,42,0.35)',
          }}>
            <p style={{
              ...body,
              fontSize: 'clamp(17px, 2vw, 20px)',
              fontWeight: 300,
              color: dark,
              lineHeight: 1.80,
              margin: 0,
              maxWidth: '620px',
            }}>
              {invitation.invitation_text}
            </p>
          </div>

          {/* Regenerative actors as action entry points */}
          {regenerativeActors.length > 0 && (
            <div style={{ marginTop: '36px' }}>
              <p style={{
                ...sc,
                fontSize: '11px',
                letterSpacing: '0.18em',
                color: 'rgba(15,21,35,0.40)',
                marginBottom: '16px',
                textTransform: 'uppercase',
              }}>
                Actors working on this
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {regenerativeActors.map(actor => (
                  <Link
                    key={actor.id}
                    to={`/beta/org/${actor.id}`}
                    style={{
                      ...body,
                      fontSize: '15px',
                      color: dark,
                      textDecoration: 'none',
                      padding: '8px 16px',
                      background: '#FFFFFF',
                      border: '1px solid rgba(45,106,79,0.25)',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {actor.name}
                    {actor.gradient_trajectory && (
                      <TrajectoryArrow trajectory={actor.gradient_trajectory} />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Footer ────────────────────────────────────── */}
        <div style={{
          marginTop: '80px',
          paddingTop: '32px',
          borderTop: '1px solid rgba(200,146,42,0.10)',
        }}>
          {/* Domain links */}
          {domains.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              {domains.map(d => (
                <Link
                  key={d}
                  to={`/beta/domain/${d}`}
                  style={{
                    ...sc,
                    fontSize: '12px',
                    letterSpacing: '0.16em',
                    color: gold,
                    textDecoration: 'none',
                    borderBottom: '1px dotted rgba(200,146,42,0.50)',
                  }}
                >
                  {CIV_DOMAIN_LABEL[d] || d} domain
                </Link>
              ))}
            </div>
          )}

          {/* Principle badges */}
          {principleSlugs.length > 0 && (
            <PrincipleStrip
              taggings={principleSlugs.map((slug, i) => ({
                principle_slug: slug,
                weight: i === 0 ? 'primary' : 'secondary',
              }))}
            />
          )}

          {/* Back link */}
          <div style={{ marginTop: '24px' }}>
            <Link
              to="/beta/invitation"
              style={{
                ...sc,
                fontSize: '12px',
                letterSpacing: '0.16em',
                color: 'rgba(15,21,35,0.45)',
                textDecoration: 'none',
              }}
            >
              All invitations
            </Link>
          </div>
        </div>

      </div>

      <SiteFooter />
    </div>
  )
}
