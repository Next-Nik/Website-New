import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { supabase } from '../hooks/useSupabase'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const DOMAINS = [
  { id: 'human-being',     label: 'Human Being',      globalGoal: 'Every person has what they need to know themselves, develop fully, and bring what they came here to bring.' },
  { id: 'society',         label: 'Society',           globalGoal: 'Humanity knows how to be human together — and every individual is better for it.' },
  { id: 'nature',          label: 'Nature',            globalGoal: 'Ecosystems are thriving and we are living in harmony with the planet.' },
  { id: 'technology',      label: 'Technology',        globalGoal: 'Our creations support and amplify life.' },
  { id: 'finance-economy', label: 'Finance & Economy', globalGoal: 'Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.' },
  { id: 'legacy',          label: 'Legacy',            globalGoal: 'We are ancestors worth having.' },
  { id: 'vision',          label: 'Vision',            globalGoal: 'Into the unknown. On purpose. Together.' },
]

const STATUS = {
  thriving:   { label: 'Thriving',   color: '#2A6B3A', bg: 'rgba(42,107,58,0.07)',   border: 'rgba(42,107,58,0.25)',   desc: 'Goals set, actors present, momentum visible.' },
  underway:   { label: 'Underway',   color: '#2A4A8A', bg: 'rgba(42,74,138,0.07)',   border: 'rgba(42,74,138,0.25)',   desc: 'Moving, but room to grow.' },
  underloved: { label: 'Underloved', color: '#8A6B2A', bg: 'rgba(138,107,42,0.07)',  border: 'rgba(138,107,42,0.25)',  desc: 'The quiet crisis. Present but underpowered.' },
  unmapped:   { label: 'Unmapped',   color: 'rgba(15,21,35,0.45)', bg: 'rgba(15,21,35,0.03)', border: 'rgba(15,21,35,0.12)', desc: 'No goals set, no actors registered. An opportunity and a need.' },
}

function computeStatus(actorCount, goalSet) {
  if (!goalSet && actorCount === 0) return 'unmapped'
  if (goalSet && actorCount >= 3)   return 'thriving'
  if (goalSet && actorCount > 0)    return 'underway'
  if (actorCount > 0 && !goalSet)   return 'underway'
  if (goalSet && actorCount === 0)  return 'underloved'
  return 'unmapped'
}

// ── Ancestor breadcrumb trail ────────────────────────────────

async function fetchAncestors(focus) {
  const trail = [focus]
  let current = focus
  while (current.parent_id) {
    const { data } = await supabase
      .from('nextus_focuses')
      .select('id, name, slug, type, parent_id')
      .eq('id', current.parent_id)
      .single()
    if (!data) break
    trail.unshift(data)
    current = data
  }
  return trail
}

// ── Status badge ─────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS[status]
  return (
    <span style={{
      ...sc, fontSize: '12px', letterSpacing: '0.14em',
      color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: '40px', padding: '3px 12px',
      background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

// ── Domain card ──────────────────────────────────────────────

function DomainCard({ domain, goal, actors, status, focusSlug, focusName }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS[status]
  const shown = expanded ? actors : actors.slice(0, 3)

  return (
    <div style={{
      background: '#FFFFFF',
      border: `1.5px solid ${cfg.border}`,
      borderRadius: '14px',
      padding: '24px 28px',
      marginBottom: '16px',
      borderLeft: `4px solid ${cfg.color}`,
    }}>
      {/* Header */}
      <div className="domain-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '16px' }}>
        <div>
          <h3 style={{ ...serif, fontSize: '22px', fontWeight: 300, color: dark, marginBottom: '4px' }}>
            {domain.label}
          </h3>
          <p style={{ ...serif, fontSize: '16px', fontStyle: 'italic', color: 'rgba(15,21,35,0.40)', lineHeight: 1.5, maxWidth: '480px' }}>
            {goal || domain.globalGoal}
          </p>
          {goal && (
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold, marginTop: '4px', display: 'inline-block' }}>
              Local goal set
            </span>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Status description */}
      <p style={{ ...serif, fontSize: '16px', color: cfg.color, marginBottom: '14px', fontStyle: 'italic' }}>
        {cfg.desc}
      </p>

      {/* Actors */}
      {actors.length > 0 ? (
        <div>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)', marginBottom: '8px' }}>
            In the Field — {actors.length} actor{actors.length !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            {shown.map(a => (
              <Link
                key={a.id}
                to={`/nextus/actors/${a.id}`}
                style={{
                  ...serif, fontSize: '16px', color: a.winning ? gold : 'rgba(15,21,35,0.55)',
                  background: a.winning ? 'rgba(200,146,42,0.08)' : 'rgba(15,21,35,0.04)',
                  border: `1px solid ${a.winning ? 'rgba(200,146,42,0.30)' : 'rgba(15,21,35,0.10)'}`,
                  borderRadius: '6px', padding: '4px 12px',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {a.winning && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2A6B3A', display: 'inline-block', flexShrink: 0 }} />}
                {a.name}
              </Link>
            ))}
          </div>
          {actors.length > 3 && (
            <button onClick={() => setExpanded(e => !e)} style={{
              ...sc, fontSize: '12px', letterSpacing: '0.12em',
              color: 'rgba(15,21,35,0.40)', background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
            }}>
              {expanded ? 'Show fewer ↑' : `Show all ${actors.length} →`}
            </button>
          )}
        </div>
      ) : (
        <div style={{
          background: 'rgba(15,21,35,0.02)', border: '1px dashed rgba(15,21,35,0.15)',
          borderRadius: '8px', padding: '14px 16px',
        }}>
          <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.45)', margin: 0 }}>
            No actors registered in {focusName} for this domain.
          </p>
          <Link to={`/nextus/actors?domain=${domain.id}`} style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold, textDecoration: 'none', marginTop: '6px', display: 'inline-block' }}>
            See global actors →
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Summary strip ────────────────────────────────────────────

function SummaryStrip({ domainData }) {
  const counts = { thriving: 0, underway: 0, underloved: 0, unmapped: 0 }
  domainData.forEach(d => { counts[d.status]++ })

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px', marginBottom: '40px',
    }}>
      {Object.entries(counts).map(([status, count]) => {
        const cfg = STATUS[status]
        return (
          <div key={status} style={{
            background: cfg.bg, border: `1.5px solid ${cfg.border}`,
            borderRadius: '12px', padding: '16px 18px', textAlign: 'center',
          }}>
            <div style={{ ...serif, fontSize: '32px', color: cfg.color, lineHeight: 1, marginBottom: '4px' }}>{count}</div>
            <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: cfg.color }}>{cfg.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function NextUsFocusPage() {
  const { slug }   = useParams()
  const navigate   = useNavigate()

  const [focus,      setFocus]      = useState(null)
  const [ancestors,  setAncestors]  = useState([])
  const [children,   setChildren]   = useState([])
  const [domainData, setDomainData] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      // Fetch the focus node
      const { data: focusData, error: focusErr } = await supabase
        .from('nextus_focuses')
        .select('id, name, slug, type, parent_id, description, coordinates')
        .eq('slug', slug)
        .single()

      if (focusErr || !focusData) { setError('Focus not found'); setLoading(false); return }
      setFocus(focusData)

      // Fetch ancestors, children, goals, actors in parallel
      const [trail, { data: childData }, { data: goalsData }, { data: actorsData }] = await Promise.all([
        fetchAncestors(focusData),
        supabase
          .from('nextus_focuses')
          .select('id, name, slug, type')
          .eq('parent_id', focusData.id)
          .order('name'),
        supabase
          .from('nextus_focus_goals')
          .select('domain_id, horizon_goal')
          .eq('focus_id', focusData.id)
          .eq('status', 'ratified'),
        supabase
          .from('nextus_actors')
          .select('id, name, domain_id, scale, winning')
          .eq('focus_id', focusData.id),
      ])

      setAncestors(trail)
      setChildren(childData || [])

      // Assemble per-domain data
      const goalMap = {}
      ;(goalsData || []).forEach(g => { goalMap[g.domain_id] = g.horizon_goal })

      const actorsByDomain = {}
      ;(actorsData || []).forEach(a => {
        if (!actorsByDomain[a.domain_id]) actorsByDomain[a.domain_id] = []
        actorsByDomain[a.domain_id].push(a)
      })

      const assembled = DOMAINS.map(d => ({
        ...d,
        goal:   goalMap[d.id] || null,
        actors: actorsByDomain[d.id] || [],
        status: computeStatus((actorsByDomain[d.id] || []).length, !!goalMap[d.id]),
      }))

      // Sort: thriving first, then underway, underloved, unmapped
      const ORDER = { thriving: 0, underway: 1, underloved: 2, unmapped: 3 }
      assembled.sort((a, b) => ORDER[a.status] - ORDER[b.status])

      setDomainData(assembled)
      setLoading(false)
    }
    load()
  }, [slug])

  const TYPE_LABEL = {
    planet:'Planet', continent:'Continent', nation:'Nation',
    province:'Province / Territory', city:'City',
    neighbourhood:'Neighbourhood', organisation:'Organisation',
  }

  if (loading) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '120px 40px' }}>
          <p style={{ ...serif, fontSize: '18px', color: 'rgba(15,21,35,0.40)' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (error || !focus) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '120px 40px' }}>
          <p style={{ ...serif, fontSize: '18px', color: 'rgba(15,21,35,0.55)' }}>{error || 'Something went wrong.'}</p>
          <button onClick={() => navigate(-1)} style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', color: gold, background: 'none', border: 'none', cursor: 'pointer', marginTop: '16px' }}>
            ← Go back
          </button>
        </div>
      </div>
    )
  }

  const totalActors = domainData.reduce((sum, d) => sum + d.actors.length, 0)

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      <style>{`
        @media (max-width: 640px) {
          .focus-main { padding-left: 20px !important; padding-right: 20px !important; }
          .focus-summary { grid-template-columns: repeat(2, 1fr) !important; }
          .domain-card-header { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .child-focuses { gap: 8px !important; }
        }
      `}</style>

      <div className="focus-main" style={{ maxWidth: '860px', margin: '0 auto', padding: '80px 40px 120px' }}>

        {/* Breadcrumb trail */}
        {ancestors.length > 1 && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {ancestors.map((a, i) => (
              <span key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {i > 0 && <span style={{ color: 'rgba(200,146,42,0.40)', fontSize: '14px' }}>›</span>}
                {i < ancestors.length - 1 ? (
                  <Link to={`/nextus/focus/${a.slug}`} style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = gold}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(15,21,35,0.45)'}
                  >
                    {a.name}
                  </Link>
                ) : (
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold }}>{a.name}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Header */}
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: gold, display: 'block', marginBottom: '8px' }}>
          {TYPE_LABEL[focus.type] || focus.type}
        </span>
        <h1 style={{ ...serif, fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 300, color: dark, lineHeight: 1.1, marginBottom: '16px' }}>
          {focus.name}
        </h1>

        {focus.description && (
          <p style={{ ...serif, fontSize: '18px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.75, marginBottom: '16px', maxWidth: '600px' }}>
            {focus.description}
          </p>
        )}

        <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.45)', marginBottom: '40px' }}>
          {totalActors} actor{totalActors !== 1 ? 's' : ''} registered across all domains
        </p>

        {/* Summary strip */}
        <SummaryStrip domainData={domainData} />

        {/* Domain cards */}
        <div style={{ marginBottom: '48px' }}>
          {domainData.map(d => (
            <DomainCard
              key={d.id}
              domain={d}
              goal={d.goal}
              actors={d.actors}
              status={d.status}
              focusSlug={focus.slug}
              focusName={focus.name}
            />
          ))}
        </div>

        {/* Child focuses */}
        {children.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <p style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.45)', marginBottom: '16px' }}>
              Within {focus.name}
            </p>
            <div className="child-focuses" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {children.map(c => (
                <Link
                  key={c.id}
                  to={`/nextus/focus/${c.slug}`}
                  style={{
                    ...serif, fontSize: '16px', color: dark,
                    background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.22)',
                    borderRadius: '40px', padding: '8px 20px',
                    textDecoration: 'none', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(200,146,42,0.55)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(200,146,42,0.22)'}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back nav */}
        <button onClick={() => navigate(-1)} style={{
          ...sc, fontSize: '13px', letterSpacing: '0.14em',
          color: 'rgba(15,21,35,0.40)', background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
        }}>
          ← Back
        </button>

      </div>

      <SiteFooter />
    </div>
  )
}
