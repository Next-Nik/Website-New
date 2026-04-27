// ─────────────────────────────────────────────────────────────
// BetaMap — geographic actor map (Module 5)
//
// REQUIRES: Module 1 schema migration must be applied to nextus_actors
// before this page will load. The Supabase query in this file selects:
//   - domains, subdomains, fields, lenses, problem_chains,
//     platform_principles, resolution, horizon_floor_status (Module 1)
//   - slug (Module 6)
// PostgREST returns 400 for unknown columns, so the entire page goes
// blank if Module 1 has not shipped. The fallback helpers below handle
// null values gracefully but cannot recover from a failed query.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BetaLayout } from '../components/BetaLayout'
import { supabase } from '../../hooks/useSupabase'
import {
  CIV_DOMAINS,
  SUBDOMAINS,
  FIELDS,
  DOMAIN_COLORS,
} from '../constants/domains'
import { SCALES }           from '../constants/scales'
import { LENSES_PER_DOMAIN } from '../constants/lenses'
import { PLATFORM_PRINCIPLES } from '../constants/principles'

// ─────────────────────────────────────────────────────────────
// Design tokens (locked — do not deviate)
// ─────────────────────────────────────────────────────────────
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold     = '#C8922A'
const goldDark = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'
// Semantic UX colour for the "Succeeding" / structural-integrity signal.
// Independent of any domain colour so it survives taxonomy refactors and
// reads correctly for actors in any domain (a Society actor that's
// succeeding gets the same green as a Nature actor that's succeeding).
const success  = '#2A6B3A'

// ─────────────────────────────────────────────────────────────
// Derived lookups from constants (computed once at module scope)
// ─────────────────────────────────────────────────────────────

// DOMAIN_SLUGS — ordered array (matches CIV_DOMAINS order)
const DOMAIN_SLUGS = CIV_DOMAINS.map(d => d.slug)

// DOMAIN_LABEL — slug → display label
const DOMAIN_LABEL = Object.fromEntries(CIV_DOMAINS.map(d => [d.slug, d.label]))

// DOMAIN_COLOR — slug → accent hex (primary fill colour).
// Used for marker fills, chip backgrounds, and primary chips.
const DOMAIN_COLOR = Object.fromEntries(
  Object.entries(DOMAIN_COLORS).map(([slug, c]) => [slug, c.accent])
)

// DOMAIN_LINE — slug → muted RGBA stroke colour from DOMAIN_COLORS.line.
// Used for secondary-domain rings on multi-domain markers — the secondary
// reads as a whisper rather than a competing claim against the primary fill.
const DOMAIN_LINE = Object.fromEntries(
  Object.entries(DOMAIN_COLORS).map(([slug, c]) => [slug, c.line])
)

// SUBDOMAIN_LABEL — flat lookup: slug → display label
// Built from all subdomains across all seven domains.
const SUBDOMAIN_LABEL = {}
Object.values(SUBDOMAINS).forEach(arr =>
  arr.forEach(({ slug, label }) => { SUBDOMAIN_LABEL[slug] = label })
)

// SUBDOMAIN_OPTIONS — domain slug → [{slug, label}] (for filter pills)
const SUBDOMAIN_OPTIONS = Object.fromEntries(
  DOMAIN_SLUGS.map(d => [d, SUBDOMAINS[d] || []])
)

// FIELD_LABEL — flat lookup: field slug → display label
const FIELD_LABEL = {}
Object.values(FIELDS).forEach(arr =>
  arr.forEach(({ slug, label }) => { FIELD_LABEL[slug] = label })
)

// LENS_LABEL — flat lookup across all domains
const LENS_LABEL = {}
Object.values(LENSES_PER_DOMAIN).forEach(arr =>
  arr.forEach(({ slug, label }) => { LENS_LABEL[slug] = label })
)

// PRINCIPLE_LABEL — slug → label
const PRINCIPLE_LABEL = Object.fromEntries(
  PLATFORM_PRINCIPLES.map(p => [p.slug, p.label])
)

// SCALE_ORDER + SCALE_LABEL — from SCALES constant
const SCALE_ORDER = SCALES.map(s => s.slug)
const SCALE_LABEL = Object.fromEntries(SCALES.map(s => [s.slug, s.label]))

// Additive zoom thresholds — zoom in → finer scales appear
const SCALE_ZOOM_THRESHOLD = {
  'civilisational': 0,
  'global':         0,
  'international':  3,
  'regional':       3,
  'national':       5,
  'state-province': 5,
  'municipal':      7,
  'local':          7,
}

// ─────────────────────────────────────────────────────────────
// Helpers — domain resolution for mixed old/new schema
// ─────────────────────────────────────────────────────────────

// primaryDomain — reads domains[0] if the four-dim column
// exists (Module 1+), otherwise falls back to legacy domain_id.
function primaryDomain(actor) {
  return (actor.domains && actor.domains.length > 0)
    ? actor.domains[0]
    : (actor.domain_id || null)
}

// allDomains — full domains array, with legacy fallback
function allDomains(actor) {
  if (actor.domains && actor.domains.length > 0) return actor.domains
  return actor.domain_id ? [actor.domain_id] : []
}

// primarySubdomain — reads subdomains[0] with legacy fallback
function primarySubdomain(actor) {
  return (actor.subdomains && actor.subdomains.length > 0)
    ? actor.subdomains[0]
    : (actor.subdomain_id || null)
}

// orgPath — navigate to the beta org page.
// Uses actor.slug if present (Module 6+), otherwise actor.id.
function orgPath(actor) {
  return `/beta/org/${actor.slug || actor.id}`
}

// ─────────────────────────────────────────────────────────────
// Multi-domain marker SVG
//
// Layered composition (bottom → top):
//   1. Secondary domain ring (if 2+ domains)   — uses .line shade
//      so it reads as a whisper, not a competing claim.
//   2. White halo backing the fill              — keeps the fill
//      crisp against the secondary ring.
//   3. Primary domain fill                      — the headline.
//   4. Inner halo ring                          — winning actors only.
//   5. "+N" badge at the 1–2 o'clock position   — for 3+ domains,
//      positioned relative to the outermost drawn element so it
//      sits cleanly above whichever ring exists.
// ─────────────────────────────────────────────────────────────
function buildMarkerSVG({ domains, winning, opacity }) {
  const primaryColor   = DOMAIN_COLOR[domains[0]] || goldDark
  const secondaryColor = domains[1] ? (DOMAIN_LINE[domains[1]] || null) : null
  const extraCount     = domains.length > 2 ? domains.length - 2 : 0

  // Geometry — every dimension named, no magic arithmetic.
  const baseSize    = winning ? 14 : 10              // inner fill diameter
  const border      = winning ? 2.5 : 2              // white halo around fill
  const ringWidth   = secondaryColor ? 2.5 : 0       // secondary ring stroke
  const ringGap     = 1                              // gap between halo and ring
  const badgeR      = extraCount > 0 ? 5 : 0         // "+N" badge radius

  // Outer extent of each layer (radius from centre).
  const fillR        = baseSize / 2
  const haloR        = fillR + border
  const ringR        = haloR + ringGap + ringWidth / 2
  const ringOuterR   = ringWidth > 0 ? haloR + ringGap + ringWidth : haloR

  // Canvas needs to fit the outermost ring + the badge if it overhangs.
  // Badge sits at 45° on the outer edge with 30% overlap inward.
  const badgeOverlap = badgeR * 0.30
  const badgeReach   = badgeR > 0 ? (badgeR - badgeOverlap) : 0
  const total        = (ringOuterR + badgeReach) * 2
  const cx           = total / 2
  const cy           = total / 2

  let svg = `<svg width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg">`

  // Secondary domain ring (whisper)
  if (secondaryColor) {
    svg += `<circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${secondaryColor}" stroke-width="${ringWidth}" opacity="${opacity}"/>`
  }

  // White halo backing the fill (drop shadow lives here)
  svg += `<circle cx="${cx}" cy="${cy}" r="${haloR}" fill="white" opacity="${opacity}" filter="drop-shadow(0 1px 3px rgba(15,21,35,0.30))"/>`

  // Primary domain fill
  svg += `<circle cx="${cx}" cy="${cy}" r="${fillR}" fill="${primaryColor}" opacity="${opacity}"/>`

  // Winning inner halo ring — load-bearing structural-integrity signal
  if (winning) {
    svg += `<circle cx="${cx}" cy="${cy}" r="${fillR - 3}" fill="none" stroke="white" stroke-width="1.5" stroke-opacity="0.65"/>`
  }

  // "+N" badge — 1-2 o'clock position relative to the outermost drawn element.
  // cos(45°) = sin(45°) ≈ 0.707; offset inward by badgeOverlap so the badge
  // bites slightly into the marker rather than floating disconnected.
  if (extraCount > 0) {
    const diag = Math.SQRT1_2 // 1/√2 ≈ 0.707
    const bx = cx + (ringOuterR - badgeOverlap) * diag
    const by = cy - (ringOuterR - badgeOverlap) * diag
    svg += `<circle cx="${bx}" cy="${by}" r="${badgeR}" fill="${goldDark}"/>`
    svg += `<text x="${bx}" y="${by + 2.6}" text-anchor="middle" font-family="'Cormorant SC',serif" font-size="7" fill="white" font-weight="600">+${extraCount}</text>`
  }

  svg += `</svg>`
  return { svg, total }
}

// ─────────────────────────────────────────────────────────────
// ActorPanel — four-dimensional placement side panel
// ─────────────────────────────────────────────────────────────
function ActorPanel({ actor, onClose, navigate }) {
  if (!actor) return null

  const domains    = allDomains(actor)
  const primDomain = domains[0]
  const domainColor = DOMAIN_COLOR[primDomain] || goldDark
  const principles  = actor.platform_principles || []
  const lenses      = actor.lenses || []
  const problems    = actor.problem_chains || []
  const fields      = actor.fields || []
  const subdomains  = actor.subdomains && actor.subdomains.length > 0
    ? actor.subdomains
    : (actor.subdomain_id ? [actor.subdomain_id] : [])

  return (
    <div style={{
      position: 'relative',
      width: '100%', height: '100%',
      background: parch,
      borderLeft: `1.5px solid ${domainColor}30`,
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 20px rgba(15,21,35,0.08)',
    }}>
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: 'rgba(15,21,35,0.40)', lineHeight: 1, padding: '0 2px' }}>×</button>
      </div>

      <div style={{ padding: '8px 22px 32px', flex: 1 }}>

        {/* Domain chips — all domains, primary first */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {domains.map((d, i) => {
            const c = DOMAIN_COLOR[d] || goldDark
            return (
              <span key={d} style={{
                ...sc, fontSize: '11px', letterSpacing: '0.14em',
                color: i === 0 ? c : 'rgba(15,21,35,0.45)',
                background: i === 0 ? `${c}15` : 'rgba(15,21,35,0.05)',
                border: `1px solid ${i === 0 ? c + '35' : 'rgba(15,21,35,0.12)'}`,
                borderRadius: '4px', padding: '3px 9px',
              }}>
                {DOMAIN_LABEL[d] || d}
              </span>
            )
          })}
        </div>

        {/* Actor name */}
        <h3 style={{ ...body, fontSize: '19px', fontWeight: 300, color: dark, lineHeight: 1.25, marginBottom: '8px' }}>
          {actor.name}
        </h3>

        {/* Type + scale + location */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {actor.type && (
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.50)' }}>{actor.type}</span>
          )}
          {actor.scale && (
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.50)' }}>
              · {SCALE_LABEL[actor.scale] || actor.scale}
            </span>
          )}
          {actor.location_name && (
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.50)' }}>
              · {actor.location_name}
            </span>
          )}
        </div>

        {/* Description */}
        {actor.description && (
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '16px' }}>
            {actor.description.length > 260
              ? actor.description.slice(0, 260) + '\u2026'
              : actor.description}
          </p>
        )}

        {/* Impact summary */}
        {actor.impact_summary && (
          <div style={{ borderLeft: `2px solid ${domainColor}35`, paddingLeft: '13px', marginBottom: '16px' }}>
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, margin: 0 }}>
              {actor.impact_summary.length > 180
                ? actor.impact_summary.slice(0, 180) + '\u2026'
                : actor.impact_summary}
            </p>
          </div>
        )}

        {/* Winning signal — preserved structural integrity indicator.
            Uses the semantic `success` token, not a domain colour, so
            the meaning is consistent across actors in any domain. */}
        {actor.winning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: success, flexShrink: 0 }} />
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: success }}>Succeeding</span>
          </div>
        )}

        {/* Open needs */}
        {actor.open_needs_count > 0 && (
          <div style={{ background: `${gold}08`, border: `1px solid ${gold}30`, borderRadius: '8px', padding: '10px 13px', marginBottom: '16px' }}>
            <span style={{ ...body, fontSize: '14px', color: goldDark }}>
              {actor.open_needs_count} open {actor.open_needs_count === 1 ? 'need' : 'needs'} — contributors welcome
            </span>
          </div>
        )}

        {/* ── Four-dimensional placement ── */}
        {(subdomains.length > 0 || fields.length > 0 || lenses.length > 0 || problems.length > 0) && (
          <div style={{ borderTop: `1px solid rgba(200,146,42,0.12)`, paddingTop: '14px', marginBottom: '16px' }}>
            <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.35)', marginBottom: '10px' }}>
              Placement
            </div>

            {/* Subdomains */}
            {subdomains.length > 0 && (
              <PlacementRow
                label="Subdomain"
                items={subdomains.map((s, i) => ({ slug: s, label: SUBDOMAIN_LABEL[s] || s, primary: i === 0 }))}
                color={domainColor}
              />
            )}

            {/* Fields */}
            {fields.length > 0 && (
              <PlacementRow
                label="Field"
                items={fields.map((f, i) => ({ slug: f, label: FIELD_LABEL[f] || f, primary: i === 0 }))}
                color={domainColor}
              />
            )}

            {/* Lenses */}
            {lenses.length > 0 && (
              <PlacementRow
                label="Lens"
                items={lenses.map((l, i) => ({ slug: l, label: LENS_LABEL[l] || l, primary: i === 0 }))}
                color={domainColor}
              />
            )}

            {/* Problem chains */}
            {problems.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.13em', color: 'rgba(15,21,35,0.40)', marginBottom: '5px' }}>Problem</div>
                {problems.map((chain, i) => (
                  <div key={chain} style={{
                    ...body, fontSize: '12px', color: i === 0 ? 'rgba(15,21,35,0.72)' : 'rgba(15,21,35,0.45)',
                    lineHeight: 1.5, marginBottom: '3px',
                    paddingLeft: i === 0 ? '0' : '6px',
                  }}>
                    {chain.split('>').map((part, j) => (
                      <span key={j}>
                        {j > 0 && <span style={{ color: 'rgba(15,21,35,0.25)', margin: '0 3px' }}>›</span>}
                        {part.trim()}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Platform principles tagged */}
        {principles.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.35)', marginBottom: '7px' }}>
              Principles
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {principles.map(p => (
                <span key={p} style={{
                  ...sc, fontSize: '10px', letterSpacing: '0.10em',
                  color: goldDark,
                  background: `${gold}10`,
                  border: `1px solid ${gold}30`,
                  borderRadius: '4px', padding: '2px 7px',
                }}>
                  {PRINCIPLE_LABEL[p] || p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* View org page */}
        <button
          onClick={() => navigate(orgPath(actor))}
          style={{
            width: '100%', padding: '11px',
            ...sc, fontSize: '13px', letterSpacing: '0.16em',
            borderRadius: '40px', border: `1.5px solid ${gold}80`,
            background: `${gold}08`, color: goldDark, cursor: 'pointer',
          }}
        >
          View full profile →
        </button>
      </div>
    </div>
  )
}

// PlacementRow — reusable row for subdomain / field / lens chips
function PlacementRow({ label, items, color }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.13em', color: 'rgba(15,21,35,0.40)', marginBottom: '5px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {items.map(({ slug, label: itemLabel, primary }) => (
          <span key={slug} style={{
            ...sc, fontSize: '10px', letterSpacing: '0.10em',
            color: primary ? color : 'rgba(15,21,35,0.45)',
            background: primary ? `${color}12` : 'rgba(15,21,35,0.05)',
            border: `1px solid ${primary ? color + '30' : 'rgba(15,21,35,0.10)'}`,
            borderRadius: '4px', padding: '2px 7px',
          }}>
            {itemLabel}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ActorListItem — unmapped list row
// ─────────────────────────────────────────────────────────────
function ActorListItem({ actor, onClick }) {
  const prim = primaryDomain(actor)
  const domainColor = DOMAIN_COLOR[prim] || goldDark
  const secondaries = allDomains(actor).slice(1)
  return (
    <div
      onClick={onClick}
      style={{ padding: '12px 0', borderBottom: `1px solid rgba(200,146,42,0.10)`, cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,146,42,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      {/* Multi-domain dot indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px', flexShrink: 0, gap: '2px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: domainColor }} />
        {secondaries.slice(0, 1).map(d => (
          <div key={d} style={{ width: '5px', height: '5px', borderRadius: '50%', background: DOMAIN_COLOR[d] || goldDark, opacity: 0.65 }} />
        ))}
      </div>
      <div>
        <div style={{ ...body, fontSize: '15px', fontWeight: 300, color: dark, marginBottom: '2px' }}>{actor.name}</div>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.50)' }}>
          {DOMAIN_LABEL[prim] || prim}
          {secondaries.length > 0 && (
            <span style={{ color: 'rgba(15,21,35,0.30)' }}> +{secondaries.length}</span>
          )}
          {actor.location_name && ` · ${actor.location_name}`}
          {actor.scale && ` · ${SCALE_LABEL[actor.scale] || actor.scale}`}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BetaMapPage — main component
// ─────────────────────────────────────────────────────────────
export function BetaMapPage() {
  const navigate     = useNavigate()
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef([])
  const zoomRef      = useRef(2)

  const [actors, setActors]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [mapReady, setMapReady]           = useState(false)
  const [selectedActor, setSelectedActor] = useState(null)

  const [activeDomains, setActiveDomains]   = useState(new Set(DOMAIN_SLUGS))
  const [focusDomain, setFocusDomain]       = useState('')
  const [focusSubdomain, setFocusSubdomain] = useState('')
  const [currentZoom, setCurrentZoom]       = useState(2)

  // ── Data load ────────────────────────────────────────────────
  // REQUIRES Module 1 schema migration (and Module 6 for slug).
  // PostgREST returns 400 if any selected column does not exist on
  // nextus_actors, which would break the entire page. The four-dim
  // columns may be NULL on rows not yet backfilled — primaryDomain(),
  // allDomains(), primarySubdomain(), and orgPath() handle null
  // values correctly and fall back to the legacy domain_id /
  // subdomain_id / id columns. They cannot recover from a failed
  // query, only from missing data within a successful query.
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('nextus_actors')
        .select([
          'id',
          'slug',
          'name',
          'type',
          'scale',
          'location_name',
          'lat',
          'lng',
          'description',
          'impact_summary',
          'winning',
          'alignment_score',
          'horizon_floor_status',
          // Legacy single-value columns
          'domain_id',
          'subdomain_id',
          // Four-dimensional placement columns (Module 1)
          'domains',
          'subdomains',
          'fields',
          'lenses',
          'problem_chains',
          'platform_principles',
          'resolution',
          // Needs join
          'nextus_needs(id, status)',
        ].join(', '))
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

  const mappedActors   = actors.filter(a => a.lat != null && a.lng != null)
  const unmappedActors = actors.filter(a => a.lat == null || a.lng == null)

  // ── Visibility logic ─────────────────────────────────────────
  function isScaleVisible(scale, zoom) {
    if (!scale) return true
    const threshold = SCALE_ZOOM_THRESHOLD[scale]
    return threshold !== undefined ? zoom >= threshold : true
  }

  function actorOpacity(actor, zoom) {
    const prim = primaryDomain(actor)
    if (prim && !activeDomains.has(prim)) return 0
    if (!isScaleVisible(actor.scale, zoom)) return 0
    const primSub = primarySubdomain(actor)
    if (focusSubdomain) return primSub === focusSubdomain ? 1 : 0.20
    if (focusDomain)    return prim === focusDomain ? 1 : 0.30
    return 1
  }

  // ── Leaflet init ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current) return

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      document.head.appendChild(link)
    }

    function initMap() {
      if (!window.L || !mapContainer.current || mapRef.current) return
      const map = window.L.map(mapContainer.current, {
        center: [20, 0], zoom: 2, minZoom: 1, maxZoom: 18, worldCopyJump: true,
      })
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)
      map.on('zoomend', () => {
        zoomRef.current = map.getZoom()
        setCurrentZoom(map.getZoom())
      })
      mapRef.current = map
      setMapReady(true)
    }

    if (window.L) { initMap(); return }

    if (!document.getElementById('leaflet-js')) {
      const script   = document.createElement('script')
      script.id      = 'leaflet-js'
      script.src     = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
      script.onload  = initMap
      document.head.appendChild(script)
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // ── Marker rendering ─────────────────────────────────────────
  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !window.L) return
    const zoom = zoomRef.current
    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current = []

    mappedActors.forEach(actor => {
      const opacity  = actorOpacity(actor, zoom)
      if (opacity === 0) return

      const domains = allDomains(actor)
      const { svg, total } = buildMarkerSVG({ domains, winning: actor.winning, opacity })

      const svgIcon = window.L.divIcon({
        className:  '',
        iconSize:   [total, total],
        iconAnchor: [total / 2, total / 2],
        html:       svg,
      })

      const marker = window.L.marker([actor.lat, actor.lng], { icon: svgIcon })
        .addTo(mapRef.current)
        .on('click', () => setSelectedActor(actor))

      // Tooltip — primary domain + optional secondary count
      const prim = domains[0]
      const extras = domains.length > 1 ? ` +${domains.length - 1}` : ''
      marker.bindTooltip(
        `<div style="font-family:'Lora',serif;font-size:13px;font-weight:300;color:#0F1523">${actor.name}</div>
         <div style="font-family:'Cormorant SC',serif;font-size:11px;letter-spacing:0.1em;color:rgba(15,21,35,0.55);margin-top:2px">${DOMAIN_LABEL[prim] || ''}${extras}${actor.scale ? ' · ' + (SCALE_LABEL[actor.scale] || actor.scale) : ''}</div>`,
        { direction: 'top', offset: [0, -8], className: 'beta-map-tooltip' }
      )

      markersRef.current.push({ marker, actor })
    })
  }, [mappedActors, activeDomains, focusDomain, focusSubdomain, currentZoom])

  useEffect(() => { if (mapReady) renderMarkers() }, [mapReady, renderMarkers])

  // ── Filter controls ──────────────────────────────────────────
  function toggleDomain(domain) {
    setActiveDomains(prev => {
      const next = new Set(prev)
      next.has(domain) ? next.delete(domain) : next.add(domain)
      return next
    })
    if (focusDomain === domain) { setFocusDomain(''); setFocusSubdomain('') }
  }

  function selectFocusDomain(domain) {
    if (focusDomain === domain) { setFocusDomain(''); setFocusSubdomain('') }
    else { setFocusDomain(domain); setFocusSubdomain('') }
  }

  const filteredUnmapped = unmappedActors.filter(a => {
    const prim = primaryDomain(a)
    if (prim && !activeDomains.has(prim)) return false
    if (focusSubdomain) return primarySubdomain(a) === focusSubdomain
    if (focusDomain)    return prim === focusDomain
    return true
  })

  const subdomainOptions = focusDomain ? (SUBDOMAIN_OPTIONS[focusDomain] || []) : []
  const visibleScales    = SCALE_ORDER.filter(s => isScaleVisible(s, currentZoom))
  const nextZoom         = SCALE_ORDER
    .filter(s => !isScaleVisible(s, currentZoom) && SCALE_ZOOM_THRESHOLD[s] !== undefined)
    .map(s => SCALE_ZOOM_THRESHOLD[s])
    .sort((a, b) => a - b)[0]

  const mappedVisible = mappedActors.filter(a => actorOpacity(a, currentZoom) > 0).length

  // ── Render ───────────────────────────────────────────────────
  return (
    <BetaLayout activePath="beta-map">
      <div style={{ background: parch, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        <style>{`
          .beta-map-tooltip {
            background: rgba(250,250,247,0.97) !important;
            border: 1px solid rgba(200,146,42,0.25) !important;
            border-radius: 6px !important;
            box-shadow: 0 4px 16px rgba(15,21,35,0.12) !important;
            padding: 8px 12px !important;
          }
          .beta-map-tooltip::before { display: none !important; }
          .leaflet-control-attribution { font-size: 10px !important; }
          .leaflet-bar a { color: #0F1523 !important; }

          /* Mobile: side panel becomes bottom sheet,
             header + container tighten, scale legend hides */
          @media (max-width: 600px) {
            .beta-actor-panel {
              width: 100% !important;
              height: 70% !important;
              top: auto !important;
              bottom: 0 !important;
              right: 0 !important;
              border-left: none !important;
              border-top: 1.5px solid rgba(200,146,42,0.22) !important;
              box-shadow: 0 -4px 20px rgba(15,21,35,0.10) !important;
              border-radius: 16px 16px 0 0 !important;
            }
            .beta-map-container { padding: 0 16px 16px !important; }
            .beta-map-header { padding: 56px 16px 0 !important; }
            .beta-map-canvas { height: 380px !important; }
            .beta-map-scale-legend { display: none !important; }
          }
        `}</style>

        {/* Header */}
        <div className="beta-map-header" style={{ maxWidth: '1100px', margin: '0 auto', padding: '72px 32px 0', width: '100%' }}>
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: goldDark, display: 'block', marginBottom: '10px' }}>
            NextUs Beta · The Map
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ ...serif, fontSize: 'clamp(24px,3vw,38px)', fontWeight: 300, color: dark, lineHeight: 1.1, marginBottom: '8px' }}>
                Where the work is happening.
              </h1>
              <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, maxWidth: '500px' }}>
                Actors placed by domain, subdomain, and geography. Zoom in to reveal local work. The answer to a problem in one place may already exist somewhere else on this map.
              </p>
            </div>
            <button
              onClick={() => navigate('/beta/nominate')}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '10px 18px', borderRadius: '40px', border: `1px solid rgba(200,146,42,0.35)`, background: 'transparent', color: 'rgba(15,21,35,0.55)', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Nominate an actor
            </button>
          </div>

          {/* Domain toggles */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
              {DOMAIN_SLUGS.map(domain => {
                const color   = DOMAIN_COLOR[domain]
                const isOn    = activeDomains.has(domain)
                const isFocus = focusDomain === domain
                return (
                  <div key={domain} style={{ display: 'flex', alignItems: 'stretch' }}>
                    <button
                      onClick={() => toggleDomain(domain)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '5px 9px 5px 8px',
                        borderRadius: isOn && isFocus ? '40px 0 0 40px' : '40px',
                        border: `1.5px solid ${isOn ? color : 'rgba(15,21,35,0.15)'}`,
                        background: isOn ? `${color}12` : 'transparent',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: isOn ? color : 'rgba(15,21,35,0.20)', flexShrink: 0 }} />
                      <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.13em', color: isOn ? dark : 'rgba(15,21,35,0.40)' }}>
                        {DOMAIN_LABEL[domain]}
                      </span>
                    </button>
                    {isOn && (
                      <button
                        onClick={() => selectFocusDomain(domain)}
                        title={isFocus ? 'Clear subdomain filter' : 'Drill into subdomains'}
                        style={{
                          padding: '5px 8px', borderRadius: '0 40px 40px 0',
                          border: `1.5px solid ${color}`,
                          borderLeft: `1px solid ${color}30`,
                          background: isFocus ? `${color}22` : `${color}08`,
                          cursor: 'pointer', color: isFocus ? color : `${color}80`,
                          fontSize: '11px', lineHeight: 1, transition: 'all 0.15s',
                          marginLeft: '-1px',
                        }}
                      >
                        {isFocus ? '▾' : '›'}
                      </button>
                    )}
                  </div>
                )
              })}
              <span style={{ color: 'rgba(15,21,35,0.20)', margin: '0 2px' }}>·</span>
              <button
                onClick={() => { setActiveDomains(new Set(DOMAIN_SLUGS)); setFocusDomain(''); setFocusSubdomain('') }}
                style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.40)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                All
              </button>
              <button
                onClick={() => { setActiveDomains(new Set()); setFocusDomain(''); setFocusSubdomain('') }}
                style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.40)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                None
              </button>
            </div>
          </div>

          {/* Subdomain filter row */}
          {focusDomain && subdomainOptions.length > 0 && (
            <div style={{
              display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
              marginBottom: '10px', padding: '8px 12px',
              borderLeft: `3px solid ${DOMAIN_COLOR[focusDomain]}50`,
              background: `${DOMAIN_COLOR[focusDomain]}06`,
              borderRadius: '0 8px 8px 0',
            }}>
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: DOMAIN_COLOR[focusDomain], marginRight: '2px' }}>
                {DOMAIN_LABEL[focusDomain]}
              </span>
              <span style={{ color: 'rgba(15,21,35,0.25)', fontSize: '12px' }}>›</span>
              {subdomainOptions.map(({ slug, label }) => {
                const isActive = focusSubdomain === slug
                const color    = DOMAIN_COLOR[focusDomain]
                return (
                  <button
                    key={slug}
                    onClick={() => setFocusSubdomain(isActive ? '' : slug)}
                    style={{
                      ...sc, fontSize: '11px', letterSpacing: '0.12em',
                      padding: '4px 10px', borderRadius: '40px',
                      border: `1.5px solid ${isActive ? color : 'rgba(15,21,35,0.15)'}`,
                      background: isActive ? `${color}18` : 'white',
                      color: isActive ? color : 'rgba(15,21,35,0.50)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
              <button
                onClick={() => { setFocusDomain(''); setFocusSubdomain('') }}
                style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.35)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '4px' }}
              >
                Clear ×
              </button>
            </div>
          )}

          {/* Stats + zoom info */}
          {!loading && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.50)' }}>
                {mappedVisible} on map · {filteredUnmapped.length} in list
              </span>
              {focusSubdomain && (
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: DOMAIN_COLOR[focusDomain], background: `${DOMAIN_COLOR[focusDomain]}12`, borderRadius: '4px', padding: '2px 8px' }}>
                  Highlighting: {SUBDOMAIN_LABEL[focusSubdomain]}
                </span>
              )}
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.30)' }}>
                Zoom {Math.round(currentZoom)} · {visibleScales.map(s => SCALE_LABEL[s]?.split(' ')[0] || s).join(', ')}
                {nextZoom !== undefined && ` · zoom to ${nextZoom}+ for local`}
              </span>
            </div>
          )}
        </div>

        {/* Map canvas */}
        <div className="beta-map-container" style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '0 32px 20px' }}>
          <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: `1.5px solid rgba(200,146,42,0.22)`, background: '#E8E4DC' }}>
            <div className="beta-map-canvas" ref={mapContainer} style={{ width: '100%', height: '540px' }} />

            {!mapReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E8E4DC', zIndex: 900 }}>
                <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.50)' }}>Loading map…</p>
              </div>
            )}

            {mapReady && mappedVisible === 0 && (
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(250,250,247,0.94)', border: `1px solid rgba(200,146,42,0.25)`, borderRadius: '8px', padding: '10px 14px', maxWidth: '280px', zIndex: 700 }}>
                <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.6, margin: 0 }}>
                  Actor coordinates are being added. Browse all actors in the list below.
                </p>
              </div>
            )}

            {/* Scale legend */}
            <div className="beta-map-scale-legend" style={{ position: 'absolute', bottom: '32px', right: '10px', background: 'rgba(250,250,247,0.94)', border: `1px solid rgba(200,146,42,0.20)`, borderRadius: '8px', padding: '10px 13px', zIndex: 700, minWidth: '160px' }}>
              <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.40)', marginBottom: '7px' }}>
                Scale at zoom {Math.round(currentZoom)}
              </div>
              {SCALE_ORDER.map(s => {
                const visible = isScaleVisible(s, currentZoom)
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', opacity: visible ? 1 : 0.30 }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: visible ? goldDark : 'rgba(15,21,35,0.20)', flexShrink: 0 }} />
                    <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.10em', color: visible ? dark : 'rgba(15,21,35,0.35)' }}>
                      {SCALE_LABEL[s] || s}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Actor side panel — outer wrapper is the only positioned
                container, so the mobile media query (max-width: 600px)
                can re-anchor it cleanly as a bottom sheet. */}
            {selectedActor && (
              <div className="beta-actor-panel" style={{
                position: 'absolute', top: 0, right: 0,
                width: 'min(320px, 100%)', height: '100%',
                zIndex: 800,
              }}>
                <ActorPanel
                  actor={selectedActor}
                  onClose={() => setSelectedActor(null)}
                  navigate={navigate}
                />
              </div>
            )}
          </div>
        </div>

        {/* Unmapped actors list */}
        {filteredUnmapped.length > 0 && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px 80px', width: '100%' }}>
            <hr style={{ border: 'none', borderTop: `1px solid rgba(200,146,42,0.15)`, marginBottom: '24px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <h2 style={{ ...serif, fontSize: '22px', fontWeight: 300, color: dark }}>
                {focusSubdomain
                  ? `${SUBDOMAIN_LABEL[focusSubdomain]} actors`
                  : focusDomain
                  ? `${DOMAIN_LABEL[focusDomain]} actors`
                  : 'All actors'}
              </h2>
              <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.50)' }}>{filteredUnmapped.length} listed</span>
            </div>
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.50)', marginBottom: '18px', lineHeight: 1.6 }}>
              Coordinates being added — these actors will appear on the map as they are geocoded.
            </p>

            {/* Group by primary domain */}
            {DOMAIN_SLUGS.filter(d => activeDomains.has(d)).map(domain => {
              const domainActors = filteredUnmapped.filter(a => primaryDomain(a) === domain)
              if (!domainActors.length) return null
              return (
                <div key={domain} style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: DOMAIN_COLOR[domain] }} />
                    <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.17em', color: 'rgba(15,21,35,0.50)' }}>
                      {DOMAIN_LABEL[domain]} · {domainActors.length}
                    </span>
                  </div>
                  {domainActors.map(actor => (
                    <ActorListItem
                      key={actor.id}
                      actor={actor}
                      onClick={() => navigate(orgPath(actor))}
                    />
                  ))}
                </div>
              )
            })}

            {/* Actors with no domain placement */}
            {(() => {
              const noDomain = filteredUnmapped.filter(a => !primaryDomain(a))
              if (!noDomain.length) return null
              return (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(15,21,35,0.25)' }} />
                    <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.17em', color: 'rgba(15,21,35,0.50)' }}>
                      Unplaced · {noDomain.length}
                    </span>
                  </div>
                  {noDomain.map(actor => (
                    <ActorListItem
                      key={actor.id}
                      actor={actor}
                      onClick={() => navigate(orgPath(actor))}
                    />
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {!loading && actors.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 32px' }}>
            <p style={{ ...serif, fontSize: '18px', fontWeight: 300, color: 'rgba(15,21,35,0.50)' }}>
              No actors on the map yet.
            </p>
          </div>
        )}
      </div>
    </BetaLayout>
  )
}
