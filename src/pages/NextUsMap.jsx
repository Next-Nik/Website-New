import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { supabase } from '../hooks/useSupabase'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const DOMAIN_LABEL = {
  'human-being':    'Human Being',
  'society':        'Society',
  'nature':         'Nature',
  'technology':     'Technology',
  'finance-economy':'Finance & Economy',
  'legacy':         'Legacy',
  'vision':         'Vision',
}

const DOMAIN_COLOR = {
  'human-being':    '#2A6B9E',
  'society':        '#6B2A9E',
  'nature':         '#2A6B3A',
  'technology':     '#8A6B2A',
  'finance-economy':'#6B3A2A',
  'legacy':         '#4A6B2A',
  'vision':         '#2A4A6B',
}

const DOMAINS = [
  { value: '', label: 'All domains' },
  { value: 'human-being',     label: 'Human Being' },
  { value: 'society',         label: 'Society' },
  { value: 'nature',          label: 'Nature' },
  { value: 'technology',      label: 'Technology' },
  { value: 'finance-economy', label: 'Finance & Economy' },
  { value: 'legacy',          label: 'Legacy' },
  { value: 'vision',          label: 'Vision' },
]

const SUBDOMAIN_LABEL = {
  'hb-body':'Body','hb-mind':'Mind','hb-inner-life':'Inner Life',
  'hb-development':'Development','hb-dignity':'Dignity & Rights','hb-expression':'Expression & Culture',
  'soc-governance':'Governance','soc-culture':'Culture','soc-conflict-peace':'Conflict & Peace',
  'soc-community':'Community','soc-communication':'Communication & Information','soc-global':'Global Coordination',
  'nat-earth':'Earth','nat-air':'Air','nat-salt-water':'Salt Water',
  'nat-fresh-water':'Fresh Water','nat-flora':'Flora','nat-fauna':'Fauna','nat-living-systems':'Living Systems',
  'tech-digital':'Digital Systems','tech-biological':'Biological Technology',
  'tech-infrastructure':'Physical Infrastructure','tech-energy':'Energy','tech-frontier':'Frontier & Emerging Technology',
  'fe-resources':'Resources','fe-exchange':'Exchange','fe-capital':'Capital',
  'fe-labour':'Labour','fe-ownership':'Ownership','fe-distribution':'Distribution',
  'leg-wisdom':'Wisdom','leg-memory':'Memory','leg-ceremony':'Ceremony & Ritual',
  'leg-intergenerational':'Intergenerational Relationship','leg-long-arc':'The Long Arc',
  'vis-imagination':'Imagination','vis-philosophy':'Philosophy & Worldview',
  'vis-leadership':'Leadership','vis-coordination':'Coordination','vis-foresight':'Foresight',
}

// Actor side panel shown on click
function ActorPanel({ actor, onClose, navigate }) {
  if (!actor) return null
  const domainLabel    = DOMAIN_LABEL[actor.domain_id] || actor.domain_id
  const subdomainLabel = SUBDOMAIN_LABEL[actor.subdomain_id]
  const domainColor    = DOMAIN_COLOR[actor.domain_id] || gold

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0,
      width: '320px', height: '100%',
      background: parch,
      borderLeft: '1.5px solid rgba(200,146,42,0.25)',
      overflowY: 'auto',
      zIndex: 10,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Close */}
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'rgba(15,21,35,0.40)', lineHeight: 1, padding: 0 }}>×</button>
      </div>

      <div style={{ padding: '12px 24px 32px', flex: 1 }}>
        {/* Domain tag */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {domainLabel && (
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: domainColor, background: `${domainColor}15`, border: `1px solid ${domainColor}30`, borderRadius: '4px', padding: '3px 10px' }}>
              {domainLabel}
            </span>
          )}
          {subdomainLabel && (
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', background: 'rgba(15,21,35,0.05)', borderRadius: '4px', padding: '3px 10px' }}>
              {subdomainLabel}
            </span>
          )}
        </div>

        {/* Name */}
        <h3 style={{ ...serif, fontSize: '20px', fontWeight: 300, color: dark, lineHeight: 1.2, marginBottom: '8px' }}>
          {actor.name}
        </h3>

        {/* Meta */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {actor.type && <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)' }}>{actor.type}</span>}
          {actor.scale && <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)' }}>· {actor.scale}</span>}
          {actor.location_name && <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)' }}>· {actor.location_name}</span>}
        </div>

        {/* Description */}
        {actor.description && (
          <p style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '16px' }}>
            {actor.description.length > 240 ? actor.description.slice(0, 240) + '…' : actor.description}
          </p>
        )}

        {/* Impact */}
        {actor.impact_summary && (
          <div style={{ borderLeft: '2px solid rgba(200,146,42,0.22)', paddingLeft: '14px', marginBottom: '16px' }}>
            <p style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, margin: 0 }}>
              {actor.impact_summary.length > 160 ? actor.impact_summary.slice(0, 160) + '…' : actor.impact_summary}
            </p>
          </div>
        )}

        {/* Winning */}
        {actor.winning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2A6B3A', flexShrink: 0 }} />
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#2A6B3A' }}>Succeeding</span>
          </div>
        )}

        {/* Open needs */}
        {actor.open_needs_count > 0 && (
          <div style={{ background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.22)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
            <span style={{ ...serif, fontSize: '14px', color: gold }}>
              {actor.open_needs_count} open {actor.open_needs_count === 1 ? 'need' : 'needs'} — contributors welcome
            </span>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => navigate(`/nextus/actors/${actor.id}`)}
          style={{
            width: '100%', padding: '12px',
            ...sc, fontSize: '13px', letterSpacing: '0.16em',
            borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)',
            background: 'rgba(200,146,42,0.05)', color: gold,
            cursor: 'pointer',
          }}
        >
          View full profile →
        </button>
      </div>
    </div>
  )
}

// List view for actors without coordinates
function ActorListItem({ actor, onClick }) {
  const domainColor = DOMAIN_COLOR[actor.domain_id] || gold
  return (
    <div
      onClick={onClick}
      style={{ padding: '14px 0', borderBottom: '1px solid rgba(200,146,42,0.10)', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,146,42,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: domainColor, marginTop: '6px', flexShrink: 0 }} />
      <div>
        <div style={{ ...serif, fontSize: '15px', fontWeight: 300, color: dark, marginBottom: '3px' }}>{actor.name}</div>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)' }}>
          {DOMAIN_LABEL[actor.domain_id]}
          {actor.location_name && ` · ${actor.location_name}`}
          {actor.scale && ` · ${actor.scale}`}
        </div>
      </div>
    </div>
  )
}

export function NextUsMapPage() {
  const navigate     = useNavigate()
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef([])

  const [actors, setActors]       = useState([])
  const [mappedActors, setMappedActors]   = useState([]) // have coordinates
  const [unmappedActors, setUnmappedActors] = useState([]) // no coordinates
  const [loading, setLoading]     = useState(true)
  const [mapReady, setMapReady]   = useState(false)
  const [selectedActor, setSelectedActor] = useState(null)
  const [filterDomain, setFilterDomain]   = useState('')
  const [viewMode, setViewMode]   = useState('map') // 'map' | 'list'
  const [mapError, setMapError]   = useState(false)

  // Load actors
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('nextus_actors')
        .select('id, name, type, domain_id, subdomain_id, scale, location_name, description, impact_summary, winning, alignment_score, nextus_needs(id, status)')
        .order('name')
        .limit(500)

      const enriched = (data || []).map(a => ({
        ...a,
        open_needs_count: (a.nextus_needs || []).filter(n => n.status === 'open').length,
      }))

      setActors(enriched)
      setLoading(false)
    }
    load()
  }, [])

  // Filter actors by domain
  const filtered = filterDomain ? actors.filter(a => a.domain_id === filterDomain) : actors

  // For now, all actors go to the list since most won't have PostGIS coords yet
  // When the geo column is populated, mappedActors will show on the map
  useEffect(() => {
    setMappedActors([])        // Will populate when actors have location column data
    setUnmappedActors(filtered)
  }, [filtered])

  // Load Mapbox and init map
  useEffect(() => {
    if (!mapContainer.current) return

    // Load Mapbox GL JS via CDN
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.js'
    script.onload = () => {
      if (!window.mapboxgl) { setMapError(true); return }

      // Token — needs to be set in environment
      const token = import.meta.env.VITE_MAPBOX_TOKEN
      if (!token) {
        setMapError(true)
        return
      }

      window.mapboxgl.accessToken = token

      try {
        const map = new window.mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [0, 20],
          zoom: 1.8,
          projection: 'naturalEarth',
        })

        map.on('load', () => {
          mapRef.current = map
          setMapReady(true)
        })

        map.on('error', () => setMapError(true))
      } catch {
        setMapError(true)
      }
    }
    script.onerror = () => setMapError(true)
    document.head.appendChild(script)

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // Add markers when map is ready and actors have coordinates
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.mapboxgl) return

    // Clear existing markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Add markers for actors with coordinates
    mappedActors.forEach(actor => {
      if (!actor.lng || !actor.lat) return

      const el = document.createElement('div')
      const color = DOMAIN_COLOR[actor.domain_id] || gold
      el.style.cssText = `
        width: ${actor.winning ? '14px' : '10px'};
        height: ${actor.winning ? '14px' : '10px'};
        border-radius: 50%;
        background: ${color};
        border: 2px solid white;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(15,21,35,0.25);
        transition: transform 0.15s;
      `
      el.onmouseenter = () => { el.style.transform = 'scale(1.4)' }
      el.onmouseleave = () => { el.style.transform = 'scale(1)' }

      const marker = new window.mapboxgl.Marker(el)
        .setLngLat([actor.lng, actor.lat])
        .addTo(mapRef.current)

      el.addEventListener('click', () => setSelectedActor(actor))
      markersRef.current.push(marker)
    })
  }, [mapReady, mappedActors])

  const totalMapped   = mappedActors.length
  const totalUnmapped = unmappedActors.length

  return (
    <div style={{ background: parch, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav activePath="nextus" />

      <style>{`
        .mapboxgl-ctrl-logo { display: none !important; }
        @media (max-width: 640px) {
          .map-sidebar { display: none !important; }
          .map-container { width: 100% !important; }
        }
      `}</style>

      {/* Page header */}
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '80px 40px 0', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '10px' }}>
              NextUs · The Map
            </span>
            <h1 style={{ ...serif, fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 300, color: dark, lineHeight: 1.1, marginBottom: '8px' }}>
              Where the work is happening.
            </h1>
            <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, maxWidth: '520px' }}>
              Actors placed by domain, subdomain, and geography. The answer to a problem in one place may already exist somewhere else on this map.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => navigate('/nextus/actors')}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '10px 18px', borderRadius: '40px', border: '1px solid rgba(200,146,42,0.35)', background: 'transparent', color: 'rgba(15,21,35,0.55)', cursor: 'pointer' }}>
              List view
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filterDomain}
            onChange={e => setFilterDomain(e.target.value)}
            style={{ ...serif, fontSize: '15px', color: dark, padding: '9px 14px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', cursor: 'pointer' }}
          >
            {DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          {/* Domain colour legend */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {Object.entries(DOMAIN_COLOR).map(([id, color]) => (
              <button
                key={id}
                onClick={() => setFilterDomain(filterDomain === id ? '' : id)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0, opacity: filterDomain && filterDomain !== id ? 0.3 : 1 }} />
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: filterDomain && filterDomain !== id ? 'rgba(15,21,35,0.30)' : 'rgba(15,21,35,0.55)' }}>
                  {DOMAIN_LABEL[id]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <span style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.45)' }}>
              {filtered.length} actor{filtered.length !== 1 ? 's' : ''}
              {filterDomain && ` in ${DOMAIN_LABEL[filterDomain]}`}
            </span>
            {totalMapped > 0 && (
              <span style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.35)' }}>
                · {totalMapped} mapped
              </span>
            )}
          </div>
        )}
      </div>

      {/* Map + sidebar layout */}
      <div style={{ flex: 1, display: 'flex', maxWidth: '1040px', margin: '0 auto', width: '100%', padding: '0 40px 60px', gap: '0', position: 'relative', minHeight: '560px' }}>

        {/* Map container */}
        <div
          className="map-container"
          style={{ flex: 1, position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid rgba(200,146,42,0.22)', minHeight: '500px', background: '#EAE6DF' }}
        >
          <div ref={mapContainer} style={{ width: '100%', height: '100%', minHeight: '500px' }} />

          {/* Map error — no token */}
          {mapError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#EAE6DF', padding: '40px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(200,146,42,0.12)', border: '1.5px solid rgba(200,146,42,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '20px' }}>🗺</span>
              </div>
              <h3 style={{ ...serif, fontSize: '22px', fontWeight: 300, color: dark, marginBottom: '10px', textAlign: 'center' }}>
                Map requires Mapbox token
              </h3>
              <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, textAlign: 'center', maxWidth: '360px', marginBottom: '20px' }}>
                Add <code style={{ ...sc, fontSize: '13px', background: 'rgba(15,21,35,0.08)', padding: '2px 6px', borderRadius: '4px' }}>VITE_MAPBOX_TOKEN</code> to your environment variables to enable the map.
              </p>
              <p style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.40)', textAlign: 'center' }}>
                In the meantime, all actors are listed below.
              </p>
            </div>
          )}

          {/* Loading overlay */}
          {!mapError && !mapReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EAE6DF' }}>
              <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.45)' }}>Loading map…</p>
            </div>
          )}

          {/* No geo data notice */}
          {mapReady && mappedActors.length === 0 && !mapError && (
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(250,250,247,0.92)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', padding: '10px 14px', maxWidth: '280px' }}>
              <p style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.6, margin: 0 }}>
                Actor coordinates are being added. Use the list below to browse all {filtered.length} actors by location.
              </p>
            </div>
          )}

          {/* Selected actor panel */}
          {selectedActor && (
            <ActorPanel
              actor={selectedActor}
              onClose={() => setSelectedActor(null)}
              navigate={navigate}
            />
          )}
        </div>
      </div>

      {/* Actor list — shown below map for actors without coordinates */}
      {unmappedActors.length > 0 && (
        <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 40px 80px', width: '100%' }}>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', marginBottom: '28px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
            <h2 style={{ ...serif, fontSize: '24px', fontWeight: 300, color: dark }}>All actors</h2>
            <span style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.40)' }}>
              {unmappedActors.length} listed
            </span>
          </div>
          <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.50)', marginBottom: '20px', lineHeight: 1.6 }}>
            Coordinates are being added to place actors on the map. For now they appear here.
          </p>

          {/* Group by domain */}
          {DOMAINS.filter(d => d.value).map(domain => {
            const domainActors = unmappedActors.filter(a => a.domain_id === domain.value)
            if (domainActors.length === 0) return null
            return (
              <div key={domain.value} style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: DOMAIN_COLOR[domain.value] }} />
                  <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.50)' }}>
                    {domain.label} · {domainActors.length}
                  </span>
                </div>
                {domainActors.map(actor => (
                  <ActorListItem
                    key={actor.id}
                    actor={actor}
                    onClick={() => navigate(`/nextus/actors/${actor.id}`)}
                  />
                ))}
              </div>
            )
          })}

          {/* Actors with no domain */}
          {(() => {
            const noDomain = unmappedActors.filter(a => !a.domain_id)
            if (noDomain.length === 0) return null
            return (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(15,21,35,0.30)' }} />
                  <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.50)' }}>
                    Unplaced · {noDomain.length}
                  </span>
                </div>
                {noDomain.map(actor => (
                  <ActorListItem key={actor.id} actor={actor} onClick={() => navigate(`/nextus/actors/${actor.id}`)} />
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 40px 80px', textAlign: 'center' }}>
          <p style={{ ...serif, fontSize: '20px', fontWeight: 300, color: 'rgba(15,21,35,0.50)', marginBottom: '16px' }}>
            No actors in {filterDomain ? DOMAIN_LABEL[filterDomain] : 'this domain'} yet.
          </p>
          <button onClick={() => setFilterDomain('')}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Show all actors
          </button>
        </div>
      )}
    </div>
  )
}
