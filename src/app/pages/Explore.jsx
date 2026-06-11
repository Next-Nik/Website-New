// src/app/pages/Explore.jsx
//
// The wheel-as-navigator surface. Routes:
//   /explore                                          — top: seven domains
//   /explore/:domain                                   — a domain's subdomains
//   /explore/:domain/:subdomain                        — a subdomain's fields
//   /explore/:domain/:subdomain/:field                 — the intersection page
//
// At every level above the field, the wheel renders. At field level, the
// intersection page (Layer C) is shown — list of actors + recent activity.
// Cross-filter with ?at=<focus-slug> attaches a geographic scope.
//
// Same gestures at every level: tap to drill, expand-out (where it makes
// sense) to see sibling peers, breadcrumb at top to drill back up.

import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { NavigatorWheel } from '../components/NavigatorWheel'
import { IntersectionPage } from '../components/IntersectionPage'
import { body, sc } from '../../lib/designTokens'

const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

const GOLD = '#A8721A'
const INK = '#0F1523'
const PARCH = '#FAFAF7'

export function Explore() {
  const { domain: domainSlug, subdomain: subdomainSlug, field: fieldSlug } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const atFocusSlug = searchParams.get('at')

  const [loading, setLoading] = useState(true)
  const [domain, setDomain] = useState(null)
  const [subdomain, setSubdomain] = useState(null)
  const [field, setField] = useState(null)
  const [domains, setDomains] = useState([])
  const [subdomains, setSubdomains] = useState([])
  const [fields, setFields] = useState([])

  // Geographic scope (when ?at= is present)
  const [atFocus, setAtFocus] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)

      // Always load the seven civ domains
      const { data: domainRows } = await supabase
        .from('nextus_domains')
        .select('id, slug, name, color, position, short_description, horizon_goal')
        .eq('domain_kind', 'civ')
        .order('position')
      if (cancelled) return

      const allDomains = (domainRows || []).map(d => ({ ...d, color: d.color || GOLD }))
      setDomains(allDomains)

      // Resolve the cross-filter focus if present
      if (atFocusSlug) {
        const { data: f } = await supabase
          .from('nextus_focuses')
          .select('id, slug, name, type')
          .eq('slug', atFocusSlug)
          .maybeSingle()
        if (!cancelled) setAtFocus(f || null)
      } else {
        if (!cancelled) setAtFocus(null)
      }

      if (!domainSlug) {
        setDomain(null); setSubdomain(null); setField(null)
        setSubdomains([]); setFields([])
        setLoading(false); return
      }

      const d = allDomains.find(x => x.slug === domainSlug)
      if (!d) {
        setDomain(null); setSubdomain(null); setField(null)
        setSubdomains([]); setFields([])
        setLoading(false); return
      }
      setDomain(d)

      // Load this domain's subdomains
      const { data: subRows } = await supabase
        .from('nextus_subdomains')
        .select('id, slug, name, position, description')
        .eq('domain_id', d.id)
        .order('position')
      if (cancelled) return
      const allSubs = (subRows || []).map(s => ({ ...s, color: d.color }))
      setSubdomains(allSubs)

      if (!subdomainSlug) {
        setSubdomain(null); setField(null); setFields([])
        setLoading(false); return
      }

      const s = allSubs.find(x => x.slug === subdomainSlug)
      if (!s) {
        setSubdomain(null); setField(null); setFields([])
        setLoading(false); return
      }
      setSubdomain(s)

      // Load this subdomain's fields
      const { data: fieldRows } = await supabase
        .from('nextus_fields')
        .select('id, slug, name, position, topics, description')
        .eq('subdomain_id', s.id)
        .order('position')
      if (cancelled) return
      const allFields = (fieldRows || []).map(f => ({ ...f, color: d.color }))
      setFields(allFields)

      if (!fieldSlug) {
        setField(null)
        setLoading(false); return
      }

      const f = allFields.find(x => x.slug === fieldSlug)
      setField(f || null)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [domainSlug, subdomainSlug, fieldSlug, atFocusSlug])

  // ── Render: which level are we at? ────────────────────────────────────────
  // Level 0: domain index (the seven civ domains)
  // Level 1: subdomain index (a domain's three subdomains)
  // Level 2: field index (a subdomain's three fields)
  // Level 3: intersection page (a specific field, optionally scoped by ?at=)

  const level =
    fieldSlug ? 3 :
    subdomainSlug ? 2 :
    domainSlug ? 1 :
    0

  return (
    <div style={{ background: PARCH, minHeight: '100dvh' }}>
      <Nav activePath="" />

      <div style={{
        maxWidth: level === 3 ? '900px' : '720px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 40px) 80px',
      }}>

        {loading && <Loading />}

        {!loading && (
          <>
            <Breadcrumb
              level={level}
              domain={domain}
              subdomain={subdomain}
              field={field}
              atFocus={atFocus}
            />

            {level === 0 && (
              <DomainsView
                domains={domains}
                onTap={(d) => navigate(`/explore/${d.slug}`)}
              />
            )}

            {level === 1 && domain && (
              <SubdomainsView
                domain={domain}
                subdomains={subdomains}
                onTap={(s) => navigate(`/explore/${domain.slug}/${s.slug}`)}
              />
            )}

            {level === 2 && domain && subdomain && (
              <FieldsView
                domain={domain}
                subdomain={subdomain}
                fields={fields}
                onTap={(f) => navigate(`/explore/${domain.slug}/${subdomain.slug}/${f.slug}${atFocus ? `?at=${atFocus.slug}` : ''}`)}
              />
            )}

            {level === 3 && field && (
              <IntersectionPage
                domain={domain}
                subdomain={subdomain}
                field={field}
                atFocus={atFocus}
              />
            )}

            {level > 0 && !domain && (
              <NotFound message="That domain isn't in the directory yet." />
            )}
            {level > 1 && domain && !subdomain && (
              <NotFound message={`No subdomain "${subdomainSlug}" found under ${domain.name}.`} />
            )}
            {level > 2 && subdomain && !field && (
              <NotFound message={`No field "${fieldSlug}" found under ${subdomain.name}.`} />
            )}
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}

function Loading() {
  return (
    <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', padding: '32px 0' }}>
      Loading&hellip;
    </p>
  )
}

function NotFound({ message }) {
  return (
    <div style={{
      ...body, fontSize: '15px',
      color: 'rgba(15,21,35,0.72)', fontStyle: 'italic',
      padding: '20px',
      background: 'rgba(200,146,42,0.04)',
      border: '1px dashed rgba(200,146,42,0.35)',
      borderRadius: '8px',
      marginTop: '24px',
    }}>
      {message} <Link to="/explore" style={{ color: GOLD }}>Return to the directory</Link>.
    </div>
  )
}

function Breadcrumb({ level, domain, subdomain, field, atFocus }) {
  if (level === 0 && !atFocus) return null

  return (
    <div style={{
      ...sc, fontSize: '11px', letterSpacing: '0.16em',
      color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
      marginBottom: '20px',
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0',
    }}>
      <Link to="/explore" style={{ color: 'rgba(15,21,35,0.72)', textDecoration: 'none' }}>
        Explore
      </Link>
      {domain && (
        <>
          <Sep />
          <Link to={`/explore/${domain.slug}`} style={{ color: 'rgba(15,21,35,0.72)', textDecoration: 'none' }}>
            {domain.name}
          </Link>
        </>
      )}
      {subdomain && (
        <>
          <Sep />
          <Link to={`/explore/${domain.slug}/${subdomain.slug}`} style={{ color: 'rgba(15,21,35,0.72)', textDecoration: 'none' }}>
            {subdomain.name}
          </Link>
        </>
      )}
      {field && (
        <>
          <Sep />
          <span style={{ color: GOLD }}>{field.name}</span>
        </>
      )}
      {atFocus && (
        <>
          <span style={{ color: 'rgba(15,21,35,0.55)', margin: '0 14px' }}>·</span>
          <span style={{ color: GOLD, ...body, textTransform: 'none', letterSpacing: 'normal', fontStyle: 'italic' }}>
            in {atFocus.name}
          </span>
        </>
      )}
    </div>
  )
}

function Sep() {
  return <span style={{ color: 'rgba(15,21,35,0.55)', margin: '0 8px' }}>/</span>
}

function Header({ eyebrow, title, blurb, color = GOLD }) {
  return (
    <header style={{ marginBottom: '32px' }}>
      <div style={{
        ...sc, fontSize: '11px', letterSpacing: '0.20em',
        color, textTransform: 'uppercase', marginBottom: '8px',
      }}>
        {eyebrow}
      </div>
      <h1 style={{
        ...display,
        fontSize: 'clamp(34px, 5vw, 48px)',
        fontWeight: 300, color: INK,
        margin: 0, marginBottom: blurb ? '14px' : 0, lineHeight: 1.15,
      }}>
        {title}
      </h1>
      {blurb && (
        <p style={{
          ...body, fontSize: '15px',
          color: 'rgba(15,21,35,0.72)', lineHeight: 1.65,
          margin: 0, maxWidth: '600px',
        }}>
          {blurb}
        </p>
      )}
    </header>
  )
}

// ── Level 0: seven domains ────────────────────────────────────────────────
function DomainsView({ domains, onTap }) {
  const nodes = domains.map(d => ({ id: d.id, slug: d.slug, name: d.name, color: d.color }))
  return (
    <>
      <Header
        eyebrow="The seven domains"
        title="Explore"
        blurb="Every domain of civilisational flourishing. Tap a domain to enter its substructure, or narrow by place using ?at=<slug>."
      />
      <WheelHost>
        <NavigatorWheel
          nodes={nodes}
          centerLabel="Earth"
          onTap={onTap}
          size={420}
        />
      </WheelHost>
    </>
  )
}

// ── Level 1: a domain's subdomains ────────────────────────────────────────
function SubdomainsView({ domain, subdomains, onTap }) {
  if (subdomains.length === 0) {
    return (
      <>
        <Header
          eyebrow={domain.name}
          title={domain.name}
          blurb={domain.short_description}
          color={domain.color}
        />
        <NotFound message="No subdomains seeded under this domain yet." />
      </>
    )
  }
  const nodes = subdomains.map(s => ({ id: s.id, slug: s.slug, name: s.name, color: domain.color }))
  return (
    <>
      <Header
        eyebrow={domain.name}
        title={domain.name}
        blurb={domain.horizon_goal}
        color={domain.color}
      />
      <WheelHost>
        <NavigatorWheel
          nodes={nodes}
          centerLabel={domain.name}
          onTap={onTap}
          size={420}
          palette={{ primary: domain.color }}
        />
      </WheelHost>
    </>
  )
}

// ── Level 2: a subdomain's fields ─────────────────────────────────────────
function FieldsView({ domain, subdomain, fields, onTap }) {
  if (fields.length === 0) {
    return (
      <>
        <Header
          eyebrow={`${domain.name} · ${subdomain.name}`}
          title={subdomain.name}
          blurb={subdomain.description}
          color={domain.color}
        />
        <NotFound message="No fields seeded under this subdomain yet." />
      </>
    )
  }
  const nodes = fields.map(f => ({ id: f.id, slug: f.slug, name: f.name, color: domain.color }))
  return (
    <>
      <Header
        eyebrow={`${domain.name} · ${subdomain.name}`}
        title={subdomain.name}
        blurb={subdomain.description}
        color={domain.color}
      />
      <WheelHost>
        <NavigatorWheel
          nodes={nodes}
          centerLabel={subdomain.name.length > 18 ? subdomain.name.split(' ')[0] : subdomain.name}
          onTap={onTap}
          size={420}
          palette={{ primary: domain.color }}
        />
      </WheelHost>
    </>
  )
}

function WheelHost({ children }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '20px 0 40px',
    }}>
      {children}
    </div>
  )
}
