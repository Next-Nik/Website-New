import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const DOMAINS = [
  { value: '',               label: 'All domains' },
  { value: 'human-being',    label: 'Human Being' },
  { value: 'society',        label: 'Society' },
  { value: 'nature',         label: 'Nature' },
  { value: 'technology',     label: 'Technology' },
  { value: 'finance-economy',label: 'Finance & Economy' },
  { value: 'legacy',         label: 'Legacy' },
  { value: 'vision',         label: 'Vision' },
]

const SCALES = [
  { value: '', label: 'All scales' },
  { value: 'local',         label: 'Local' },
  { value: 'municipal',     label: 'Municipal' },
  { value: 'regional',      label: 'Regional' },
  { value: 'national',      label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global',        label: 'Global' },
]

const TYPES = [
  { value: '',              label: 'All types' },
  { value: 'organisation',  label: 'Organisation' },
  { value: 'project',       label: 'Project' },
]

const DOMAIN_HORIZON = {
  'human-being':    'Every person has what they need to know themselves, develop fully, and bring what they came here to bring.',
  'society':        'Humanity knows how to be human together — and every individual is better for it.',
  'nature':         'Ecosystems are thriving and we are living in harmony with the planet.',
  'technology':     'Our creations support and amplify life.',
  'finance-economy':'Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.',
  'legacy':         'We are ancestors worth having.',
  'vision':         'Into the unknown. On purpose. Together.',
}

const DOMAIN_LABEL = {
  'human-being':'Human Being','society':'Society','nature':'Nature',
  'technology':'Technology','finance-economy':'Finance & Economy',
  'legacy':'Legacy','vision':'Vision',
}

const SUBDOMAIN_LABEL = {
  'hb-body':'Body','hb-mind':'Mind','hb-inner-life':'Inner Life','hb-development':'Development','hb-dignity':'Dignity & Rights','hb-expression':'Expression & Culture',
  'soc-governance':'Governance','soc-culture':'Culture','soc-conflict-peace':'Conflict & Peace','soc-community':'Community','soc-communication':'Communication & Information','soc-global':'Global Coordination',
  'nat-earth':'Earth','nat-air':'Air','nat-salt-water':'Salt Water','nat-fresh-water':'Fresh Water','nat-flora':'Flora','nat-fauna':'Fauna','nat-living-systems':'Living Systems',
  'tech-digital':'Digital Systems','tech-biological':'Biological Technology','tech-infrastructure':'Physical Infrastructure','tech-energy':'Energy','tech-frontier':'Frontier & Emerging Technology',
  'fe-resources':'Resources','fe-exchange':'Exchange','fe-capital':'Capital','fe-labour':'Labour','fe-ownership':'Ownership','fe-distribution':'Distribution',
  'leg-wisdom':'Wisdom','leg-memory':'Memory','leg-ceremony':'Ceremony & Ritual','leg-intergenerational':'Intergenerational Relationship','leg-long-arc':'The Long Arc',
  'vis-imagination':'Imagination','vis-philosophy':'Philosophy & Worldview','vis-leadership':'Leadership','vis-coordination':'Coordination','vis-foresight':'Foresight',
}

const NEED_TYPE_COLOR = {
  skills:'rgba(42,74,138,0.85)', capital:'rgba(42,107,58,0.85)',
  time:'rgba(168,114,26,0.85)', resources:'rgba(107,42,107,0.85)',
  partnerships:'rgba(42,107,107,0.85)', data:'rgba(107,74,42,0.85)', other:'rgba(15,21,35,0.55)',
  creative:'rgba(138,74,138,0.85)',
}

// Subdomain options grouped by domain — only shown when a domain is selected
const SUBDOMAINS_BY_DOMAIN = {
  'human-being':     [['hb-body','Body'],['hb-mind','Mind'],['hb-inner-life','Inner Life'],['hb-development','Development'],['hb-dignity','Dignity & Rights'],['hb-expression','Expression & Culture']],
  'society':         [['soc-governance','Governance'],['soc-culture','Culture'],['soc-conflict-peace','Conflict & Peace'],['soc-community','Community'],['soc-communication','Communication & Information'],['soc-global','Global Coordination']],
  'nature':          [['nat-earth','Earth'],['nat-air','Air'],['nat-salt-water','Salt Water'],['nat-fresh-water','Fresh Water'],['nat-flora','Flora'],['nat-fauna','Fauna'],['nat-living-systems','Living Systems']],
  'technology':      [['tech-digital','Digital Systems'],['tech-biological','Biological Technology'],['tech-infrastructure','Physical Infrastructure'],['tech-energy','Energy'],['tech-frontier','Frontier & Emerging Technology']],
  'finance-economy': [['fe-resources','Resources'],['fe-exchange','Exchange'],['fe-capital','Capital'],['fe-labour','Labour'],['fe-ownership','Ownership'],['fe-distribution','Distribution']],
  'legacy':          [['leg-wisdom','Wisdom'],['leg-memory','Memory'],['leg-ceremony','Ceremony & Ritual'],['leg-intergenerational','Intergenerational Relationship'],['leg-long-arc','The Long Arc']],
  'vision':          [['vis-imagination','Imagination'],['vis-philosophy','Philosophy & Worldview'],['vis-leadership','Leadership'],['vis-coordination','Coordination'],['vis-foresight','Foresight']],
}

const NEED_TYPE_FILTERS = [
  { value: '', label: 'All needs' },
  { value: 'skills',       label: 'Skills' },
  { value: 'creative',     label: 'Creative' },
  { value: 'capital',      label: 'Capital' },
  { value: 'time',         label: 'Time' },
  { value: 'resources',    label: 'Resources' },
  { value: 'partnerships', label: 'Partnerships' },
  { value: 'data',         label: 'Data' },
]

function FilterSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      ...body, fontSize: '15px', color: dark,
      padding: '10px 14px', borderRadius: '40px',
      border: '1.5px solid rgba(200,146,42,0.35)',
      background: '#FFFFFF', outline: 'none', cursor: 'pointer',
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function ViewToggle({ view, setView }) {
  return (
    <div style={{ display: 'flex', gap: '0', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.35)', overflow: 'hidden' }}>
      {[
        { key: 'all',     label: 'All' },
        { key: 'winning', label: 'Succeeding' },
      ].map(({ key, label }, i, arr) => (
        <button key={key} onClick={() => setView(key)} style={{
          ...sc, fontSize: '13px', letterSpacing: '0.12em',
          padding: '8px 16px', border: 'none', cursor: 'pointer',
          background: view === key ? 'rgba(200,146,42,0.10)' : '#FFFFFF',
          color: view === key ? gold : 'rgba(15,21,35,0.55)',
          borderRight: i < arr.length - 1 ? '1px solid rgba(200,146,42,0.25)' : 'none',
        }}>
          {label}
        </button>
      ))}
    </div>
  )
}

function ActorCard({ actor, onClick }) {
  const domainLabel    = DOMAIN_LABEL[actor.domain_id] || actor.domain_id
  const subdomainLabel = SUBDOMAIN_LABEL[actor.subdomain_id]
  const hasNeeds       = actor.open_needs_count > 0

  return (
    <div onClick={onClick} style={{
      background: '#FFFFFF',
      border: '1.5px solid rgba(200,146,42,0.20)',
      borderRadius: '14px', padding: '24px 28px',
      cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
      position: 'relative',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.55)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,21,35,0.55)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.20)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Winning indicator */}
      {actor.winning && (
        <div style={{ position: 'absolute', top: '20px', right: '24px', width: '8px', height: '8px', borderRadius: '50%', background: '#2A6B3A' }} title="Succeeding" />
      )}

      {/* Type + scale */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)' }}>
          {actor.type}
        </span>
        {actor.scale && (
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)' }}>
            · {actor.scale}
          </span>
        )}
        {actor.location_name && (
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)' }}>
            · {actor.location_name}
          </span>
        )}
      </div>

      {/* Name */}
      <h3 style={{ ...body, fontSize: '20px', fontWeight: 300, color: dark, marginBottom: '6px', lineHeight: 1.2 }}>
        {actor.name}
      </h3>

      {/* Domain + subdomain */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px' }}>
        {domainLabel && (
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: gold }}>
            {domainLabel}
          </span>
        )}
        {subdomainLabel && (
          <>
            <span style={{ color: 'rgba(200,146,42,0.40)', fontSize: '12px' }}>›</span>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(168,114,26,0.72)' }}>
              {subdomainLabel}
            </span>
          </>
        )}
      </div>

      {/* Description */}
      {actor.description && (
        <p style={{ ...body, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.7, marginBottom: '14px' }}>
          {actor.description.length > 180 ? actor.description.slice(0, 180) + '…' : actor.description}
        </p>
      )}

      {/* Needs signal */}
      {hasNeeds && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: gold, flexShrink: 0 }} />
          <span style={{ ...body, fontSize: '14px', color: gold }}>
            {actor.open_needs_count} open {actor.open_needs_count === 1 ? 'need' : 'needs'} — contributors welcome
          </span>
        </div>
      )}

      {!actor.claimed && (
        <div style={{ marginTop: '10px', ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
          Is this you? Claim this profile →
        </div>
      )}
    </div>
  )
}

// ── Matches for you panel ─────────────────────────────────────

const OFFER_TYPE_LABEL = {
  skills:'Skills', time:'Time', capital:'Capital',
  community:'Community', knowledge:'Knowledge', creative:'Creative', other:'Other',
}

const MODE_LABEL = {
  functional:'Functional', expressive:'Expressive', relational:'Relational',
  intellectual:'Intellectual', mixed:'Mixed',
}

function MatchCard({ match, navigate }) {
  const domainLabel = DOMAIN_LABEL[match.domain_id] || match.domain_id
  return (
    <div
      onClick={() => navigate(`/nextus/actors/${match.actor_id}`)}
      style={{
        background: match.adjacent ? '#FFFFFF' : 'rgba(200,146,42,0.04)',
        border: match.adjacent
          ? '1.5px solid rgba(200,146,42,0.18)'
          : '1.5px solid rgba(200,146,42,0.55)',
        borderRadius: '12px', padding: '18px 20px',
        cursor: 'pointer', transition: 'all 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,21,35,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      {match.adjacent && (
        <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', display: 'block', marginBottom: '6px' }}>
          Adjacent match
        </span>
      )}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        {domainLabel && (
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.22)', borderRadius: '4px', padding: '2px 8px' }}>
            {domainLabel}
          </span>
        )}
        {match.open_needs_count > 0 && (
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: '#2A6B3A', background: 'rgba(42,107,58,0.06)', border: '1px solid rgba(42,107,58,0.20)', borderRadius: '4px', padding: '2px 8px' }}>
            {match.open_needs_count} open need{match.open_needs_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: dark, marginBottom: '4px', lineHeight: 1.3 }}>
        {match.name}
      </p>
      {match.best_need && (
        <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)', marginBottom: '4px' }}>
          Needs: {match.best_need.title}
        </p>
      )}
      {match.description && (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6 }}>
          {match.description.slice(0, 100)}{match.description.length > 100 ? '…' : ''}
        </p>
      )}
    </div>
  )
}

function MatchesPanel({ userId, navigate }) {
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [hasData, setHasData]   = useState(false)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    async function load() {
      try {
        const res = await fetch('/api/nextus-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'for_contributor', user_id: userId }),
        })
        const data = await res.json()
        if (data.matches?.length) {
          setMatches(data.matches)
          setHasData(true)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [userId])

  if (!userId || loading || !hasData) return null

  const shown = expanded ? matches : matches.slice(0, 3)

  return (
    <div style={{
      background: 'rgba(200,146,42,0.03)',
      border: '1.5px solid rgba(200,146,42,0.30)',
      borderRadius: '14px', padding: '24px 28px',
      marginBottom: '36px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, display: 'block', marginBottom: '4px' }}>
            Matched for you
          </span>
          <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.6, margin: 0 }}>
            Orgs whose open needs align with what you're offering.
          </p>
        </div>
        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)' }}>
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
        {shown.map(m => (
          <MatchCard key={m.actor_id} match={m} navigate={navigate} />
        ))}
      </div>

      {matches.length > 3 && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '16px', padding: 0 }}
        >
          {expanded ? 'Show fewer ↑' : `Show all ${matches.length} matches ↓`}
        </button>
      )}
    </div>
  )
}

export function NextUsActorsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [actors, setActors]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [total, setTotal]       = useState(0)

  const [domain,    setDomain]    = useState(searchParams.get('domain') || '')
  const [subdomain, setSubdomain] = useState('')
  const [scale,     setScale]     = useState('')
  const [type,      setType]      = useState('')
  const [needType,  setNeedType]  = useState('')
  const [view,      setView]      = useState('all')
  const [search,    setSearch]    = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Clear subdomain when domain changes
  useEffect(() => { setSubdomain('') }, [domain])

  useEffect(() => { fetchActors() }, [domain, subdomain, scale, type, view, search, needType])

  async function fetchActors() {
    setLoading(true)

    let q = supabase
      .from('nextus_actors')
      .select(`
        id, name, type, domain_id, subdomain_id, scale, location_name,
        description, impact_summary, alignment_score, winning, claimed, verified,
        nextus_needs(id, status, need_type)
      `, { count: 'exact' })
      .order('name')
      .limit(80)

    if (domain)    q = q.eq('domain_id', domain)
    if (subdomain) q = q.eq('subdomain_id', subdomain)
    if (scale)     q = q.eq('scale', scale)
    if (type)      q = q.eq('type', type)
    if (view === 'winning')    q = q.eq('winning', true)
    if (view === 'underloved') q = q.eq('winning', false)
    if (search)    q = q.ilike('name', `%${search}%`)

    const { data, count, error } = await q
    if (error) { setLoading(false); return }

    // Enrich with open needs count, optionally filtered by need type
    const enriched = (data || []).map(a => {
      const openNeeds = (a.nextus_needs || []).filter(n => n.status === 'open')
      const filteredNeeds = needType
        ? openNeeds.filter(n => n.need_type === needType)
        : openNeeds
      return {
        ...a,
        open_needs_count: filteredNeeds.length,
        _all_open_needs: openNeeds.length,
      }
    }).filter(a => needType ? a.open_needs_count > 0 : true)

    setActors(enriched)
    setTotal(needType ? enriched.length : (count || 0))
    setLoading(false)
  }

  function handleSearch(e) {
    e.preventDefault()
    setSearch(searchInput)
  }

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      <style>{`
        @media (max-width: 640px) {
          .actors-main { padding-left: 20px !important; padding-right: 20px !important; }
          .actors-grid { grid-template-columns: 1fr !important; }
          .actors-filters { flex-direction: column !important; }
        }
      `}</style>

      <div className="actors-main" style={{ maxWidth: '1040px', margin: '0 auto', padding: '96px 40px 120px' }}>

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: gold, display: 'block', marginBottom: '12px' }}>
            NextUs · In the Field
          </span>
          <h1 style={{ ...body, fontSize: 'clamp(32px,4vw,52px)', fontWeight: 300, color: dark, lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: '16px' }}>
            Who is doing the work.
          </h1>
          <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', maxWidth: '560px', lineHeight: 1.7 }}>
            Organisations and projects working across the seven domains. What they're building, what they need, and where you fit.
          </p>
        </div>

        {/* Filters */}
        <div className="actors-filters" style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '200px' }}>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by name…"
              style={{ ...body, fontSize: '15px', color: dark, padding: '10px 14px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.35)', background: '#FFFFFF', outline: 'none', flex: 1 }}
            />
            <button type="submit" style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '10px 18px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: gold, cursor: 'pointer' }}>Search</button>
          </form>
          <FilterSelect value={domain} onChange={v => { setDomain(v) }} options={DOMAINS} />
          {domain && SUBDOMAINS_BY_DOMAIN[domain] && (
            <FilterSelect
              value={subdomain}
              onChange={setSubdomain}
              options={[{ value: '', label: 'All subdomains' }, ...SUBDOMAINS_BY_DOMAIN[domain].map(([v, l]) => ({ value: v, label: l }))]}
            />
          )}
          <FilterSelect value={scale}    onChange={setScale}    options={SCALES} />
          <FilterSelect value={type}     onChange={setType}     options={TYPES} />
          <FilterSelect value={needType} onChange={setNeedType} options={NEED_TYPE_FILTERS} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <ViewToggle view={view} setView={setView} />
          <span style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
            {loading ? 'Loading…' : `${total} in the field`}
          </span>
        </div>

        {/* Matches for you — shown to logged-in users with offers/PP data */}
        <MatchesPanel userId={user?.id} navigate={navigate} />

        {/* Domain Horizon Goal context */}
        {domain && DOMAIN_HORIZON[domain] && (
          <div style={{ borderLeft: '2px solid rgba(200,146,42,0.30)', paddingLeft: '20px', marginBottom: '32px' }}>
            <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, marginBottom: '6px' }}>
              {DOMAIN_LABEL[domain]} · Horizon Goal
            </div>
            <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.65, margin: 0 }}>
              {DOMAIN_HORIZON[domain]}
            </p>
          </div>
        )}

        {/* Actor grid */}
        {loading && (
          <div style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', padding: '40px 0' }}>
            Loading actors…
          </div>
        )}

        {!loading && actors.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ ...body, fontSize: '20px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', marginBottom: '16px' }}>
              No actors found with those filters.
            </p>
            <button onClick={() => { setDomain(''); setScale(''); setType(''); setView('all'); setSearch(''); setSearchInput('') }}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear filters
            </button>
          </div>
        )}

        <div className="actors-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {actors.map(actor => (
            <ActorCard
              key={actor.id}
              actor={actor}
              onClick={() => navigate(`/nextus/actors/${actor.id}`)}
            />
          ))}
        </div>

        {/* Empty state if no actors at all */}
        {!loading && total === 0 && actors.length === 0 && !domain && !search && (
          <div style={{ textAlign: 'center', padding: '80px 0', maxWidth: '480px', margin: '0 auto' }}>
            <p style={{ ...body, fontSize: '20px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', marginBottom: '12px', lineHeight: 1.6 }}>
              The map is being populated.
            </p>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7 }}>
              Organisations and projects working across the seven domains will appear here as the platform grows.
            </p>
          </div>
        )}

      </div>

      <SiteFooter />
    </div>
  )
}
