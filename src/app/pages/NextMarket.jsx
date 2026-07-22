// ─────────────────────────────────────────────────────────────
// NextMarketPage — /alternatives
//
// The marketplace surface. Browse offerings from across the
// Atlas — products, services, programmes, tools, events,
// resources — by category and by domain. Each offering links
// out to the source. NextUs is the discovery layer.
//
// Frame: "Vote with your wallet." NextMarket is the platform's
// marketplace surface — the brands, services, and programmes
// building what comes next. Purchasing is a coordination act;
// NextMarket makes the alternatives easy to find.
//
// Behaviour:
//   • Pulls all live offerings from nextus_actor_offerings
//   • Joins on nextus_actors to get the source org's name,
//     domain(s), and location
//   • Filters: domain, offering_type, contribution_mode, access_type
//   • Sort: flagship first, then most recent
//   • Each card: type + mode + access badges, title, source,
//     description, "Learn more" link out (target=_blank)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import {
  OFFERING_TYPES,
  CONTRIBUTION_MODES,
  ACCESS_TYPES,
} from '../components/OrgShared'
import { CIV_DOMAINS } from '../constants/domains'
import { body, sc } from '../../lib/designTokens'

const heading = { fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300 }
const gold  = '#262420'
const goldB = '#4c6b45'
const ink   = '#0F1523'
const bg    = '#FAFAF7'

// ── Eyebrow ───────────────────────────────────────────────────

function Eyebrow({ children, color = gold }) {
  return (
    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em',
      color, textTransform: 'uppercase', marginBottom: '12px' }}>
      {children}
    </div>
  )
}

// ── FilterPill ────────────────────────────────────────────────

function FilterPill({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        ...sc, fontSize: '13px', letterSpacing: '0.10em',
        color: active ? '#FFFFFF' : 'rgba(15,21,35,0.65)',
        background: active ? gold : 'rgba(76,107,69,0.06)',
        border: `1px solid ${active ? gold : 'rgba(76,107,69,0.25)'}`,
        borderRadius: '40px', padding: '6px 14px',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
      {label}
    </button>
  )
}

// ── OfferingCard ──────────────────────────────────────────────

function OfferingCard({ offering, actor }) {
  const typeLabel   = OFFERING_TYPES.find(t => t.value === offering.offering_type)?.label   || offering.offering_type
  const modeLabel   = CONTRIBUTION_MODES.find(m => m.value === offering.contribution_mode)?.label || offering.contribution_mode
  const accessLabel = ACCESS_TYPES.find(a => a.value === offering.access_type)?.label       || offering.access_type

  return (
    <div style={{
      padding: '22px 24px',
      background: offering.is_flagship ? 'rgba(76,107,69,0.04)' : '#FFFFFF',
      border: offering.is_flagship ? `1.5px solid rgba(76,107,69,0.35)` : '1px solid rgba(76,107,69,0.14)',
      borderRadius: '12px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      minHeight: '220px',
    }}>
      <div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
          {offering.is_flagship && (
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em',
              background: goldB, color: '#FFFFFF', padding: '2px 10px', borderRadius: '40px' }}>
              Flagship
            </span>
          )}
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold,
            background: 'rgba(76,107,69,0.07)', border: '1px solid rgba(76,107,69,0.22)',
            borderRadius: '4px', padding: '2px 8px' }}>
            {typeLabel}
          </span>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)',
            background: 'rgba(15,21,35,0.04)', borderRadius: '4px', padding: '2px 8px' }}>
            {modeLabel}
          </span>
          <span style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
            {accessLabel}
          </span>
        </div>
        <h3 style={{ ...body, fontSize: '18px', fontWeight: 400, color: ink, margin: '0 0 6px', lineHeight: 1.3 }}>
          {offering.title}
        </h3>
        {actor && (
          <Link to={`/org/${actor.id}`}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold,
              textDecoration: 'none', display: 'block', marginBottom: '10px' }}>
            From {actor.name}
          </Link>
        )}
        {offering.description && (
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, margin: 0 }}>
            {offering.description}
          </p>
        )}
      </div>
      {offering.url && (
        <a href={offering.url} target="_blank" rel="noopener noreferrer"
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold,
            textDecoration: 'none', marginTop: '14px',
            paddingTop: '14px', borderTop: '1px solid rgba(76,107,69,0.18)' }}>
          Learn more →
        </a>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function NextMarketPage() {
  const [offerings,  setOfferings]  = useState([])
  const [actorsById, setActorsById] = useState({})
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // Filters
  const [domainFilter, setDomainFilter] = useState('all')
  const [typeFilter,   setTypeFilter]   = useState('all')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // Pull every offering. For Level 1 / proof of concept we
        // accept the round-trip cost — the dataset is small.
        const { data: offData, error: offErr } = await supabase
          .from('nextus_actor_offerings')
          .select('id, actor_id, title, description, url, offering_type, contribution_mode, access_type, is_flagship, sort_order, created_at, domain_ids')
          .order('is_flagship', { ascending: false })
          .order('created_at',  { ascending: false })

        if (offErr) throw offErr

        // Fetch the actors that own these offerings in one batch
        const actorIds = [...new Set((offData || []).map(o => o.actor_id).filter(Boolean))]
        let actorsRes = { data: [], error: null }
        if (actorIds.length > 0) {
          actorsRes = await supabase
            .from('nextus_actors')
            .select('id, name, domains, location_name, status')
            .in('id', actorIds)
        }
        if (actorsRes.error) throw actorsRes.error

        const byId = {}
        for (const a of (actorsRes.data || [])) byId[a.id] = a

        // Drop offerings whose actor is not live (suspended, draft, etc.)
        const visible = (offData || []).filter(o => {
          const a = byId[o.actor_id]
          if (!a) return false
          return !a.status || a.status === 'live'
        })

        if (!cancelled) {
          setOfferings(visible)
          setActorsById(byId)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e)
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // Apply filters
  const filtered = useMemo(() => {
    return offerings.filter(o => {
      const a = actorsById[o.actor_id]
      // Domain filter: matches if EITHER the offering's domain_ids OR
      // the actor's domains array contains the selected domain.
      if (domainFilter !== 'all') {
        const offeringDomains = o.domain_ids || []
        const actorDomains    = (a?.domains) || []
        const all = [...offeringDomains, ...actorDomains]
        if (!all.includes(domainFilter)) return false
      }
      if (typeFilter !== 'all' && o.offering_type !== typeFilter) return false
      return true
    })
  }, [offerings, actorsById, domainFilter, typeFilter])

  return (
    <>
      <Nav />
      <div style={{
        minHeight: '100dvh', background: bg, color: ink,
        padding: '80px 24px 60px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* ── Header ── */}
          <Eyebrow>NextMarket · Vote with your wallet</Eyebrow>
          <h1 style={{ ...heading, fontSize: 'clamp(36px, 5vw, 56px)', margin: '0 0 18px', color: ink, lineHeight: 1.1 }}>
            The market for<br />the future you want.
          </h1>
          <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.65)',
            lineHeight: 1.7, maxWidth: '680px', margin: '0 0 48px' }}>
            The brands, services, and programmes building what comes next —
            and making it available to the rest of us. Every choice compounds.
            Every purchase is a vote for the world you want to live in.
            What you'll find below isn't a list of alternatives. It's the
            future, already on the shelf.
          </p>

          {/* ── Filters ── */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em',
              color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Domain
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              <FilterPill label="All domains" active={domainFilter === 'all'} onClick={() => setDomainFilter('all')} />
              {CIV_DOMAINS.map(d => (
                <FilterPill key={d.slug} label={d.label}
                  active={domainFilter === d.slug}
                  onClick={() => setDomainFilter(d.slug)} />
              ))}
            </div>

            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em',
              color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Type
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <FilterPill label="All types" active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
              {OFFERING_TYPES.map(t => (
                <FilterPill key={t.value} label={t.label}
                  active={typeFilter === t.value}
                  onClick={() => setTypeFilter(t.value)} />
              ))}
            </div>
          </div>

          {/* ── Results ── */}
          {loading ? (
            <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', padding: '40px 0' }}>
              Loading alternatives…
            </div>
          ) : error ? (
            <div style={{ ...body, fontSize: '15px', color: '#8A3030', padding: '40px 0' }}>
              Could not load alternatives. Please try again.
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              padding: '60px 40px', background: '#FFFFFF',
              border: '1px solid rgba(76,107,69,0.18)', borderRadius: '14px',
              textAlign: 'center',
            }}>
              <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.6, margin: '0 0 8px' }}>
                Nothing in NextMarket matches these filters yet.
              </p>
              <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', margin: 0 }}>
                This is early. More are being added as the Atlas grows.
              </p>
            </div>
          ) : (
            <>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
                color: 'rgba(15,21,35,0.55)', marginBottom: '18px' }}>
                {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}>
                {filtered.map(o => (
                  <OfferingCard key={o.id} offering={o} actor={actorsById[o.actor_id]} />
                ))}
              </div>
            </>
          )}

          {/* ── Footer note ── */}
          <div style={{
            marginTop: '80px', paddingTop: '32px',
            borderTop: '1px solid rgba(76,107,69,0.18)',
            ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7,
          }}>
            Every link goes directly to the source. NextUs doesn't take a cut
            on these transactions — yet. Each entry is editorially placed.
            If you know something that belongs in NextMarket,{' '}
            <Link to="/nominate" style={{ color: gold }}>tell us</Link>.
          </div>

        </div>
      </div>
      <SiteFooter />
    </>
  )
}
