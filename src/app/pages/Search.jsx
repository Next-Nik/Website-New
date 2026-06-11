// src/app/pages/Search.jsx
//
// Atlas search.
//
// Three modes:
//   actors  — search across nextus_actors (name, tagline, description, mission)
//   offers  — search across actor_offers (matches the supply side)
//   needs   — search across actor_needs (matches the demand side)
//
// Filters: primary domain, actor type, scale.
//
// Backend: Postgres FTS via search_actors() / search_offers() / search_needs()
// RPC functions.

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { CIV_DOMAINS } from '../components/NextUsWheel'
import { ShareButton } from '../components/ShareButton'
import { serif, body, sc } from '../../lib/designTokens'

const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const MODES = [
  { value: 'actors', label: 'Actors',  hint: 'People, organisations, places, programmes' },
  { value: 'offers', label: 'Offers',  hint: 'What people and organisations bring' },
  { value: 'needs',  label: 'Needs',   hint: 'What people and organisations are asking for' },
]

const ACTOR_TYPES = [
  { value: '',             label: 'Any type' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'project',      label: 'Project' },
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'programme',    label: 'Programme' },
  { value: 'place',        label: 'Place' },
  { value: 'group',        label: 'Group' },
  { value: 'resource',     label: 'Resource' },
]

const SCALES = [
  { value: '',              label: 'Any scale' },
  { value: 'local',         label: 'Local' },
  { value: 'municipal',     label: 'Municipal' },
  { value: 'regional',      label: 'Regional' },
  { value: 'national',      label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global',        label: 'Global' },
]

// ── Result card components ───────────────────────────────────

function ActorCard({ actor }) {
  return (
    <Link to={`/org/${actor.slug || actor.id}`}
      style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{ background: '#FFFFFF',
        border: '1px solid rgba(200,146,42,0.20)',
        borderRadius: '10px', padding: '16px 18px',
        transition: 'all 0.15s ease',
        display: 'flex', gap: '14px', alignItems: 'flex-start' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(200,146,42,0.55)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(200,146,42,0.20)'}>

        {actor.image_url && (
          <img src={actor.image_url} alt={actor.name}
            style={{ width: '56px', height: '56px', objectFit: 'cover',
              borderRadius: '8px', flexShrink: 0 }} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px',
            flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ ...body, fontSize: '16px', color: dark }}>
              {actor.name}
            </span>
            {actor.type && (
              <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.12em',
                color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>
                {actor.type}
              </span>
            )}
            {actor.location_name && (
              <>
                <span style={{ color: 'rgba(200,146,42,0.30)', fontSize: '10px' }}>·</span>
                <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.10em',
                  color: 'rgba(15,21,35,0.55)' }}>
                  {actor.location_name}
                </span>
              </>
            )}
          </div>
          {actor.tagline && (
            <p style={{ ...body, fontSize: '13px',
              color: 'rgba(15,21,35,0.60)', fontStyle: 'italic',
              margin: '0 0 6px', lineHeight: 1.4 }}>
              {actor.tagline}
            </p>
          )}
          {actor.description && (
            <p style={{ ...body, fontSize: '13px',
              color: 'rgba(15,21,35,0.65)', margin: 0, lineHeight: 1.55,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {actor.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

function OfferOrNeedCard({ item, kind }) {
  const accent = kind === 'offer' ? '#2A6B3A' : '#2A4A8A'
  const accentBg = kind === 'offer' ? 'rgba(42,107,58,0.04)' : 'rgba(42,74,138,0.04)'
  const accentBorder = kind === 'offer' ? 'rgba(42,107,58,0.20)' : 'rgba(42,74,138,0.20)'

  let locationLabel = null
  if (item.location_mode === 'local_only') locationLabel = 'Local only'
  else if (item.location_mode === 'specific') locationLabel = item.location_specifics || 'Specific places'

  return (
    <Link to={`/org/${item.actor_slug || item.actor_id}`}
      style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{ background: '#FFFFFF',
        border: `1px solid ${accentBorder}`,
        borderRadius: '10px', padding: '16px 18px',
        transition: 'all 0.15s ease' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = accent}
        onMouseLeave={e => e.currentTarget.style.borderColor = accentBorder}>

        <h3 style={{ ...body, fontSize: '15px', fontWeight: 400,
          color: dark, margin: '0 0 6px', lineHeight: 1.4 }}>
          {item.title}
        </h3>
        {item.description && (
          <p style={{ ...body, fontSize: '13px',
            color: 'rgba(15,21,35,0.65)', lineHeight: 1.55, margin: '0 0 8px',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {item.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
          flexWrap: 'wrap', paddingTop: '6px',
          borderTop: '1px solid rgba(200,146,42,0.10)' }}>
          {item.actor_image && (
            <img src={item.actor_image} alt={item.actor_name}
              style={{ width: '20px', height: '20px', objectFit: 'cover',
                borderRadius: '50%', flexShrink: 0 }} />
          )}
          <span style={{ ...body, fontSize: '13px',
            color: 'rgba(15,21,35,0.65)' }}>
            {item.actor_name}
          </span>
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.12em',
            color: accent, background: accentBg,
            border: `1px solid ${accentBorder}`,
            padding: '2px 8px', borderRadius: '40px',
            textTransform: 'uppercase' }}>
            {kind}
          </span>
          {locationLabel && (
            <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em',
              color: 'rgba(15,21,35,0.55)',
              border: '1px solid rgba(200,146,42,0.20)',
              padding: '2px 8px', borderRadius: '40px' }}>
              {locationLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Main page ────────────────────────────────────────────────

export function SearchPage() {
  const [params, setParams] = useSearchParams()

  const [mode, setMode]       = useState(params.get('mode') || 'actors')
  const [query, setQuery]     = useState(params.get('q') || '')
  const [domain, setDomain]   = useState(params.get('domain') || '')
  const [actorType, setActorType] = useState(params.get('type') || '')
  const [scale, setScale]     = useState(params.get('scale') || '')

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Sync state to URL params on change
  useEffect(() => {
    const next = new URLSearchParams()
    if (mode !== 'actors') next.set('mode', mode)
    if (query.trim())      next.set('q', query.trim())
    if (domain)            next.set('domain', domain)
    if (actorType)         next.set('type', actorType)
    if (scale)             next.set('scale', scale)
    setParams(next, { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, query, domain, actorType, scale])

  // Run search (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      // Run if anything's set, else clear
      if (!query.trim() && !domain && !actorType && !scale) {
        setResults([])
        setSearched(false)
        return
      }
      setLoading(true)
      try {
        let res
        if (mode === 'actors') {
          res = await supabase.rpc('search_actors', {
            q:          query.trim(),
            domain:     domain || null,
            actor_type: actorType || null,
            scale:      scale || null,
            limit_n:    30,
          })
        } else if (mode === 'offers') {
          res = await supabase.rpc('search_offers', {
            q:       query.trim(),
            domain:  domain || null,
            limit_n: 30,
          })
        } else {
          res = await supabase.rpc('search_needs', {
            q:       query.trim(),
            domain:  domain || null,
            limit_n: 30,
          })
        }
        setResults(res.data || [])
        setSearched(true)
      } catch (e) {
        console.error('Search error:', e)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, query, domain, actorType, scale])

  function clearFilters() {
    setDomain(''); setActorType(''); setScale('')
  }

  const hasFilters = !!(domain || actorType || scale)

  return (
    <div style={{ background: parch, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '760px', margin: '0 auto',
        padding: '96px 24px 120px', position: 'relative' }}>

        {/* Share button — top right, only when there's something to share */}
        {(query.trim() || hasFilters) && (
          <div style={{ position: 'absolute', top: '96px', right: '24px', zIndex: 2 }}>
            <ShareButton
              url={typeof window !== 'undefined' ? window.location.href : null}
              title="NextUs Atlas Search"
              text={`Atlas search results${query.trim() ? ` for "${query.trim()}"` : ''}`}
            />
          </div>
        )}

        {/* Header */}
        <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em',
          color: gold, textTransform: 'uppercase', marginBottom: '14px' }}>
          Search
        </div>
        <h1 style={{ ...serif, fontSize: 'clamp(36px,6vw,56px)', fontWeight: 300,
          color: dark, lineHeight: 1.06, letterSpacing: '-0.012em',
          marginBottom: '16px' }}>
          The Atlas
        </h1>
        <p style={{ ...body, fontSize: '18px', fontWeight: 400,
          color: 'rgba(15,21,35,0.78)', lineHeight: 1.5,
          marginBottom: '36px', maxWidth: '560px' }}>
          Find the people, organisations, and projects building the future you want to live in.
        </p>

        {/* Search box */}
        <div style={{ marginBottom: '20px' }}>
          <input type="search" value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              mode === 'actors' ? 'Search for a person, organisation, place...' :
              mode === 'offers' ? 'Search for what you need...' :
                                  'Search for what you offer...'
            }
            style={{ ...body, fontSize: '16px', color: dark,
              padding: '14px 18px', borderRadius: '10px',
              border: '1.5px solid rgba(200,146,42,0.40)',
              background: '#FFFFFF', outline: 'none', width: '100%',
              boxSizing: 'border-box' }} />
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 0,
          borderBottom: '1px solid rgba(200,146,42,0.20)',
          marginBottom: '24px' }}>
          {MODES.map(m => (
            <button key={m.value} onClick={() => setMode(m.value)}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
                padding: '10px 18px', background: 'none', border: 'none',
                cursor: 'pointer',
                color: mode === m.value ? gold : 'rgba(15,21,35,0.55)',
                borderBottom: mode === m.value ? `2px solid ${gold}` : '2px solid transparent',
                marginBottom: '-1px' }}
              title={m.hint}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap',
          marginBottom: '24px', alignItems: 'center' }}>
          <select value={domain} onChange={e => setDomain(e.target.value)}
            style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em',
              padding: '6px 14px', borderRadius: '40px',
              border: '1.5px solid rgba(200,146,42,0.30)',
              background: domain ? 'rgba(200,146,42,0.06)' : '#FFFFFF',
              color: domain ? gold : 'rgba(15,21,35,0.55)',
              cursor: 'pointer', outline: 'none' }}>
            <option value="">Any domain</option>
            {CIV_DOMAINS.map(d => (
              <option key={d.slug} value={d.slug}>{d.label}</option>
            ))}
          </select>

          {mode === 'actors' && (
            <>
              <select value={actorType} onChange={e => setActorType(e.target.value)}
                style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em',
                  padding: '6px 14px', borderRadius: '40px',
                  border: '1.5px solid rgba(200,146,42,0.30)',
                  background: actorType ? 'rgba(200,146,42,0.06)' : '#FFFFFF',
                  color: actorType ? gold : 'rgba(15,21,35,0.55)',
                  cursor: 'pointer', outline: 'none' }}>
                {ACTOR_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <select value={scale} onChange={e => setScale(e.target.value)}
                style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em',
                  padding: '6px 14px', borderRadius: '40px',
                  border: '1.5px solid rgba(200,146,42,0.30)',
                  background: scale ? 'rgba(200,146,42,0.06)' : '#FFFFFF',
                  color: scale ? gold : 'rgba(15,21,35,0.55)',
                  cursor: 'pointer', outline: 'none' }}>
                {SCALES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </>
          )}

          {hasFilters && (
            <button onClick={clearFilters}
              style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em',
                padding: '6px 12px', borderRadius: '40px',
                background: 'none', border: 'none',
                color: 'rgba(15,21,35,0.55)', cursor: 'pointer' }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Results */}
        {loading && (
          <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
            margin: '24px 0' }}>
            Searching...
          </p>
        )}

        {!loading && !searched && (
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)',
            margin: '40px 0', textAlign: 'center', fontStyle: 'italic' }}>
            Search by typing above or applying filters.
          </p>
        )}

        {!loading && searched && results.length === 0 && (
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)',
            margin: '40px 0', textAlign: 'center' }}>
            No results. Try a different search or remove a filter.
          </p>
        )}

        {!loading && results.length > 0 && (
          <>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em',
              color: 'rgba(15,21,35,0.55)', marginBottom: '14px' }}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {results.map(r => (
                mode === 'actors' ? (
                  <ActorCard key={r.id} actor={r} />
                ) : (
                  <OfferOrNeedCard key={r.id} item={r} kind={mode === 'offers' ? 'offer' : 'need'} />
                )
              ))}
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
