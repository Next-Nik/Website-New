// ============================================================================
// Domain — the page for each of the seven civilisational domains
// ----------------------------------------------------------------------------
// Routed at /domain/:slug where slug is one of the canonical seven:
//   human-being, society, nature, technology, finance-economy, legacy, vision
//
// Purpose:
//   A Purpose Piece completion tells a person "you work in Vision at the
//   civilisational scale." This page is where they go to see what that
//   territory actually looks like — the horizon goal, the people placed
//   there, and an honest read on how developed the work in that domain is.
//
// Architecture note:
//   A domain is a LENS, not a PLACE. It cuts through every geographic focus
//   and every organization. That's why the URL is /domain/:slug, distinct
//   from /nextus/focus/:slug (which is for geographic/organizational nodes
//   like Vancouver or a specific co-working space).
//
// Data model — queries this page attempts, all empty-state-aware:
//   - nextus_actors where domain_id = slug (organizations & practitioners)
//   - contributor_profiles where domain_id = slug (people who've completed PP)
//
// Both queries tolerate missing tables or no rows. The page renders gracefully
// with or without data.
// ============================================================================

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../hooks/useSupabase'

// ─── Shared styles ──────────────────────────────────────────────────────────
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const ser   = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }

const GOLD  = '#A8721A'
const GOLDL = '#C8922A'
const INK   = '#0F1523'
const PARCH = '#FAFAF7'
const MUTE  = 'rgba(15,21,35,0.72)'
const FAINT = 'rgba(15,21,35,0.55)'

// ─── The seven canonical domains ────────────────────────────────────────────
// Slug → canonical name, horizon goal (site-facing, poetic), description,
// and the matching NextUs Self (personal-scale) domain. The personal side
// is shown in the fractal-premise section so visitors see the two scales
// of the same territory.

const DOMAINS = {
  'human-being': {
    name: 'Human Being',
    horizonGoal: 'Every person has what they need to know themselves, develop fully, and bring what they came here to bring.',
    description:
      'The territory of being human. What each person needs to develop as themselves — the capacities, the resources, the environments, the support. Not a self-help category. The prior condition for everything else: a society, an economy, a technology, a nature worth building are all made by humans who actually know themselves.',
    personalMirror: 'Body',
    personalMirrorNote: 'At personal scale, this is the work of being in your own body — knowing it, caring for it, living from it. At civilisational scale, this is what every person needs to do that same work.',
  },
  society: {
    name: 'Society',
    horizonGoal: 'Humanity knows how to be human together — and every individual is better for it.',
    description:
      'The territory of how we live together. Governance, community, institutions, culture, belonging, justice, and the small everyday agreements that make collective life possible. The premise: societies are built, not inherited — and the ones that work are the ones that were intentionally built to work.',
    personalMirror: 'Connection',
    personalMirrorNote: 'At personal scale, this is your relationships — the people you belong with and how you show up to them. At civilisational scale, it is the architecture of belonging for an entire species.',
  },
  nature: {
    name: 'Nature',
    horizonGoal: 'Ecosystems are thriving and we are living in harmony with the planet.',
    description:
      'The territory of the living world and our place inside it. Climate, biodiversity, water, soil, food, energy — and the deeper question underneath all of those: how humans learn to belong to a planet rather than consume it. Not preservation-for-its-own-sake. Reciprocity.',
    personalMirror: 'Body',
    personalMirrorNote: 'The personal-scale mirror is again Body — because your body is nature at the scale of you. The work of caring for your own living system is continuous with the work of caring for the larger one.',
  },
  technology: {
    name: 'Technology',
    horizonGoal: 'Our creations support and amplify life.',
    description:
      'The territory of what we build. Tools, systems, software, interfaces, machines, the whole of human making. The question is not whether to build — humans build — but what we build toward, and whether our creations remember what they are for.',
    personalMirror: 'Spark',
    personalMirrorNote: 'At personal scale, Spark is the aliveness your work carries — the creative current in what you make. At civilisational scale, it is whether our creations carry life forward or extract from it.',
  },
  'finance-economy': {
    name: 'Finance & Economy',
    horizonGoal: 'Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.',
    description:
      'The territory of how value moves. Money, markets, economies of care, economies of extraction, the question of what gets rewarded and what gets abandoned. At every scale, the same question: are we moving resources toward what generates life, or toward what depletes it?',
    personalMirror: 'Finances',
    personalMirrorNote: 'At personal scale, this is your own relationship with money — how you earn, steward, and deploy it. At civilisational scale, it is the same pattern played at the level of an entire species and planet.',
  },
  legacy: {
    name: 'Legacy',
    horizonGoal: 'We are ancestors worth having.',
    description:
      'The territory of what we leave behind. Not a retrospective category — an orientation. Everything we do this year is being inherited by someone who is not yet born. The question is whether the inheritance is worth receiving.',
    personalMirror: 'Inner Game',
    personalMirrorNote: 'At personal scale, Inner Game is the quality of consciousness you bring to your life — your wisdom, your discernment, your integrity. At civilisational scale, it is the quality of consciousness one generation passes to the next.',
  },
  vision: {
    name: 'Vision',
    horizonGoal: 'Into the unknown. On purpose. Together.',
    description:
      'The territory of where we are going. Collective imagination, shared direction, the stories we tell about the future — and whether humans can coordinate around a destination substantive enough to be worth walking toward. The domain is quiet right now. That is part of what it names.',
    personalMirror: 'Path',
    personalMirrorNote: 'At personal scale, Path is your sense of where you are going — your direction, your horizon, your orientation. At civilisational scale, it is the same question asked of all of humanity at once.',
  },
}

// ─── Scale labels for readable rendering ────────────────────────────────────
const SCALE_LABEL = {
  personal:       'personal',
  local:          'local',
  regional:       'regional',
  national:       'national',
  global:         'global',
  civilisational: 'civilisational',
}

// ─── Page component ─────────────────────────────────────────────────────────
export function DomainPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user }  = useAuth()

  const [actors,       setActors]       = useState(null)   // null=loading, []=empty, [...]=loaded
  const [contributors, setContributors] = useState(null)
  const [yourShape,    setYourShape]    = useState(null)   // {archetype, scale, sub_function_label}

  const domain = DOMAINS[slug]

  // ── Load real data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!domain) return
    let cancelled = false

    async function loadActors() {
      try {
        // Try to query by domain_id (canonical domain slug). If the table or
        // column doesn't exist, fail gracefully — the page still renders.
        const { data, error } = await supabase
          .from('nextus_actors')
          .select('id, name, type, scale, location_name, description')
          .eq('domain_id', slug)
          .or('seeded_by.eq.nextus,vetting_status.eq.approved')
          .order('name')
          .limit(12)
        if (cancelled) return
        if (error) { setActors([]); return }
        setActors(data || [])
      } catch {
        if (!cancelled) setActors([])
      }
    }

    async function loadContributors() {
      try {
        // contributor_profiles may or may not be populated — gracefully
        // degrade either way
        const { data, error } = await supabase
          .from('contributor_profiles')
          .select('id, archetype, scale, civilisational_statement')
          .eq('domain_id', slug)
          .limit(8)
        if (cancelled) return
        if (error) { setContributors([]); return }
        setContributors(data || [])
      } catch {
        if (!cancelled) setContributors([])
      }
    }

    async function loadYourShape() {
      if (!user?.id) return
      try {
        const { data } = await supabase
          .from('purpose_piece_results')
          .select('archetype, scale, session')
          .eq('user_id', user.id)
          .eq('status', 'complete')
          .maybeSingle()
        if (cancelled) return
        // Only surface "your shape" if the user's PP domain matches this page
        if (data?.session?.domain_id === slug) {
          setYourShape({
            archetype:         data.archetype,
            scale:             data.scale,
            sub_function_label: data.session?.sub_function_label || null,
          })
        }
      } catch {}
    }

    loadActors()
    loadContributors()
    loadYourShape()

    return () => { cancelled = true }
  }, [slug, user?.id, domain])

  // ── 404 for unknown slugs ─────────────────────────────────────────────────
  if (!domain) {
    return (
      <div style={{ background: PARCH, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '120px 40px' }}>
          <h1 style={{ ...ser, fontSize: '34px', fontWeight: 300, color: INK, marginBottom: '14px' }}>
            Domain not found.
          </h1>
          <p style={{ ...body, fontSize: '17px', color: MUTE, lineHeight: 1.7, marginBottom: '28px' }}>
            There are seven civilisational domains. The one you asked for isn't one of them.
          </p>
          <Link to="/nextus" style={{
            ...sc, fontSize: '14px', letterSpacing: '0.14em',
            color: GOLD, textDecoration: 'none',
            borderBottom: '1px solid rgba(200,146,42,0.35)',
            paddingBottom: '2px',
          }}>
            ← Back to the map
          </Link>
        </div>
        <SiteFooter />
      </div>
    )
  }

  const { name, horizonGoal, description, personalMirror, personalMirrorNote } = domain

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: PARCH, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      <style>{`
        @media (max-width: 640px) {
          .domain-wrap { padding-left: 24px !important; padding-right: 24px !important; }
          .domain-actor-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="domain-wrap" style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: 'clamp(88px, 10vw, 112px) 40px 32px',
      }}>
        <span style={{ ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.2em', color: GOLD, display: 'block', marginBottom: '18px' }}>
          Civilisational domain
        </span>
        <h1 style={{
          ...ser,
          fontSize: 'clamp(38px, 6vw, 64px)',
          fontWeight: 300,
          color: INK,
          lineHeight: 1.08,
          letterSpacing: '-0.01em',
          marginBottom: '28px',
        }}>
          {name}
        </h1>
        <div style={{
          padding: '22px 26px',
          borderLeft: `2px solid ${GOLDL}`,
          marginBottom: '32px',
        }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.2em', color: GOLD, textTransform: 'uppercase', marginBottom: '10px' }}>
            Horizon goal
          </div>
          <p style={{ ...ser, fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 300, color: INK, lineHeight: 1.4, margin: 0 }}>
            {horizonGoal}
          </p>
        </div>
        <p style={{ ...body, fontSize: '18px', fontWeight: 300, color: INK, lineHeight: 1.75, maxWidth: '620px' }}>
          {description}
        </p>
      </div>

      {/* ── Your shape here (signed-in + matching domain only) ────────── */}
      {yourShape && (
        <div className="domain-wrap" style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '0 40px 32px',
        }}>
          <div style={{
            padding: '24px 28px',
            background: '#FFFFFF',
            border: `1.5px solid ${GOLDL}`,
            borderRadius: '14px',
          }}>
            <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.2em', color: GOLD, textTransform: 'uppercase', marginBottom: '10px' }}>
              Your shape here
            </div>
            <p style={{ ...body, fontSize: '17px', color: INK, lineHeight: 1.7, margin: '0 0 8px 0' }}>
              Purpose Piece placed you in this territory as{' '}
              <strong style={{ fontWeight: 500 }}>
                {yourShape.sub_function_label || yourShape.archetype}
              </strong>
              , at the <strong style={{ fontWeight: 500 }}>
                {SCALE_LABEL[yourShape.scale] || yourShape.scale}
              </strong> scale.
            </p>
            <Link to="/tools/purpose-piece" style={{
              ...sc, fontSize: '13px', letterSpacing: '0.14em',
              color: GOLD, textDecoration: 'none',
              borderBottom: '1px solid rgba(200,146,42,0.35)',
              paddingBottom: '2px',
            }}>
              See your full Purpose Piece →
            </Link>
          </div>
        </div>
      )}

      {/* ── Fractal premise — personal mirror of this domain ─────────── */}
      <div className="domain-wrap" style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '32px 40px',
        borderTop: '1px solid rgba(200,146,42,0.18)',
      }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: GOLD, display: 'block', marginBottom: '14px' }}>
          The same domain, at personal scale: <span style={{ color: INK }}>{personalMirror}</span>
        </span>
        <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: INK, lineHeight: 1.8, maxWidth: '620px', marginBottom: '16px' }}>
          {personalMirrorNote}
        </p>
        <Link to={`/nextus-self`} style={{
          ...sc, fontSize: '13px', letterSpacing: '0.14em',
          color: GOLD, textDecoration: 'none',
          borderBottom: '1px solid rgba(200,146,42,0.35)',
          paddingBottom: '2px',
        }}>
          Explore the personal domains →
        </Link>
      </div>

      {/* ── Who's placed here (actors + contributors) ─────────────────── */}
      <div className="domain-wrap" style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '32px 40px',
        borderTop: '1px solid rgba(200,146,42,0.18)',
      }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: GOLD, display: 'block', marginBottom: '14px' }}>
          Who's placed here
        </span>

        {actors === null && (
          <p style={{ ...body, fontSize: '15px', color: FAINT, fontStyle: 'italic' }}>Loading…</p>
        )}

        {actors !== null && actors.length === 0 && contributors !== null && contributors.length === 0 && (
          <div style={{
            padding: '24px 28px',
            border: '1px dashed rgba(200,146,42,0.35)',
            borderRadius: '14px',
            background: 'rgba(200,146,42,0.03)',
          }}>
            <p style={{ ...body, fontSize: '16px', fontWeight: 300, fontStyle: 'italic', color: MUTE, lineHeight: 1.7, margin: 0 }}>
              Nothing is placed in <strong style={{ color: INK, fontStyle: 'normal' }}>{name}</strong> yet.
              That is honest, not discouraging — this is territory waiting for its first actors.{' '}
              {user ? (
                <>
                  If you know work happening here, you can{' '}
                  <Link to="/nextus/place" style={{ color: GOLD, fontStyle: 'normal', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)' }}>
                    place it on the map
                  </Link>.
                </>
              ) : (
                <>
                  <Link to="/tools/purpose-piece" style={{ color: GOLD, fontStyle: 'normal', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)' }}>
                    Start with Purpose Piece
                  </Link>{' '}
                  if you'd like to see where your own work fits.
                </>
              )}
            </p>
          </div>
        )}

        {actors !== null && actors.length > 0 && (
          <div className="domain-actor-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px',
            marginBottom: contributors !== null && contributors.length > 0 ? '20px' : 0,
          }}>
            {actors.map(a => (
              <Link
                key={a.id}
                to={`/nextus/actors/${a.id}`}
                style={{
                  display: 'block',
                  padding: '22px 24px',
                  border: '1px solid rgba(200,146,42,0.22)',
                  borderRadius: '14px',
                  background: 'rgba(200,146,42,0.03)',
                  textDecoration: 'none',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)'
                  e.currentTarget.style.background = 'rgba(200,146,42,0.07)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(200,146,42,0.22)'
                  e.currentTarget.style.background = 'rgba(200,146,42,0.03)'
                }}
              >
                <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(168,114,26,0.72)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {a.type || 'Actor'}{a.scale ? ` · ${SCALE_LABEL[a.scale] || a.scale}` : ''}
                </div>
                <div style={{ ...body, fontSize: '18px', fontWeight: 300, color: INK, marginBottom: '6px', lineHeight: 1.3 }}>
                  {a.name}
                </div>
                {a.description && (
                  <div style={{ ...body, fontSize: '14px', fontWeight: 300, color: FAINT, lineHeight: 1.55 }}>
                    {a.description.length > 110 ? a.description.slice(0, 107) + '…' : a.description}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {contributors !== null && contributors.length > 0 && (
          <>
            <p style={{ ...body, fontSize: '14px', fontWeight: 300, color: FAINT, marginTop: '10px', marginBottom: '12px' }}>
              {contributors.length} contributor{contributors.length === 1 ? '' : 's'} {contributors.length === 1 ? 'has' : 'have'} placed themselves in this domain through Purpose Piece.
            </p>
          </>
        )}
      </div>

      {/* ── Ways in (CTA row) ─────────────────────────────────────────── */}
      <div className="domain-wrap" style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '48px 40px',
        borderTop: '1px solid rgba(200,146,42,0.18)',
      }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: GOLD, display: 'block', marginBottom: '14px' }}>
          Ways in
        </span>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
        }}>
          <Link to="/tools/purpose-piece" style={cardStyle}>
            <div style={cardTitle}>Find your shape here</div>
            <div style={cardBody}>
              Purpose Piece identifies which territory is yours, how you work inside it, and where your contribution fits.
            </div>
          </Link>
          <Link to="/nextus/actors" style={cardStyle}>
            <div style={cardTitle}>See who's working here</div>
            <div style={cardBody}>
              Browse organisations and practitioners placed on the map across every domain.
            </div>
          </Link>
          <Link to="/nextus/place" style={cardStyle}>
            <div style={cardTitle}>Place something here</div>
            <div style={cardBody}>
              Register an organisation, a practice, or a project working in this territory.
            </div>
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}

// ─── Card styles (used in "Ways in") ────────────────────────────────────────
const cardStyle = {
  display: 'block',
  padding: '22px 24px',
  border: '1px solid rgba(200,146,42,0.22)',
  borderRadius: '14px',
  background: 'rgba(200,146,42,0.03)',
  textDecoration: 'none',
  transition: 'all 0.18s',
}
const cardTitle = {
  fontFamily: "'Lora', Georgia, serif",
  fontSize: '18px',
  fontWeight: 400,
  color: INK,
  marginBottom: '6px',
  lineHeight: 1.3,
}
const cardBody = {
  fontFamily: "'Lora', Georgia, serif",
  fontSize: '14px',
  fontWeight: 300,
  color: FAINT,
  lineHeight: 1.6,
}

export default DomainPage
