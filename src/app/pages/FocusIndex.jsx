// src/app/pages/FocusIndex.jsx
//
// Browseable geographic directory at /focus, organised by the seven
// civilisational domains (multi-select chips), with per-category caps so
// the page stays readable instead of dumping every island and ridge in
// alphabetical order.

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { supabase } from '../../hooks/useSupabase'
import { TYPE_LABEL } from '../components/FocusSearch'

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold    = '#A8721A'
const dark    = '#0F1523'
const parch   = '#FAFAF7'

const DOMAINS = [
  { slug: 'human-being',     label: 'Human Being', color: '#2A6B9E' },
  { slug: 'society',         label: 'Society',     color: '#6B2A9E' },
  { slug: 'nature',          label: 'Nature',      color: '#2A6B3A' },
  { slug: 'technology',      label: 'Technology',  color: '#8A6B2A' },
  { slug: 'finance-economy', label: 'Economy',     color: '#6B3A2A' },
  { slug: 'legacy',          label: 'Legacy',      color: '#4A6B2A' },
  { slug: 'vision',          label: 'Vision',      color: '#2A4A6B' },
]

// Map Focus.kind to its primary civilisational domain(s). Multi-domain
// possible (sacred sites are Legacy AND Society). This is editorial,
// refined as the corpus matures.
const KIND_TO_DOMAINS = {
  political:    ['society'],
  hydrological: ['nature'],
  geological:   ['nature'],
  ecological:   ['nature'],
  cultural:     ['legacy', 'society'],
  designated:   ['nature', 'legacy'],
  disrupted:    ['human-being', 'society', 'nature'],
  atmospheric:  ['nature', 'technology'],
  orbital:      ['technology'],
}

function focusPassesDomainFilter(focus, selectedDomains) {
  if (selectedDomains.size === 0) return true
  if (!focus.kind) return true                  // anchors (planet, etc.) always visible
  const mapped = KIND_TO_DOMAINS[focus.kind] || []
  return mapped.some(d => selectedDomains.has(d))
}

const PER_CATEGORY_CAP = 12

export function FocusIndex() {
  const [searchParams] = useSearchParams()
  const parentParam = searchParams.get('parent')

  const [parent, setParent]         = useState(null)
  const [children, setChildren]     = useState([])
  const [breadcrumb, setBreadcrumb] = useState([])
  const [loading, setLoading]       = useState(true)
  const [query, setQuery]           = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]   = useState(false)

  const [selectedDomains, setSelectedDomains] = useState(new Set())
  const [expandedTypes, setExpandedTypes] = useState(new Set())

  function toggleDomain(slug) {
    setSelectedDomains(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }
  function clearDomains() { setSelectedDomains(new Set()) }
  function toggleExpand(type) {
    setExpandedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setExpandedTypes(new Set())

      if (!parentParam) {
        const { data: rootRows } = await supabase
          .from('nextus_focuses')
          .select('id, slug, name, type, kind, parent_id')
          .is('parent_id', null)
          .order('type')
          .order('name')
        if (cancelled) return
        setParent(null)
        setBreadcrumb([])
        setChildren(rootRows || [])
        setLoading(false)
        return
      }

      let resolvedParent = null
      const { data: bySlug } = await supabase
        .from('nextus_focuses')
        .select('id, slug, name, type, kind, parent_id')
        .eq('slug', parentParam)
        .maybeSingle()
      if (bySlug) resolvedParent = bySlug
      else {
        const { data: byId } = await supabase
          .from('nextus_focuses')
          .select('id, slug, name, type, kind, parent_id')
          .eq('id', parentParam)
          .maybeSingle()
        resolvedParent = byId || null
      }

      if (cancelled) return
      if (!resolvedParent) {
        setParent(null); setBreadcrumb([]); setChildren([]); setLoading(false); return
      }

      const { data: kids } = await supabase
        .from('nextus_focuses')
        .select('id, slug, name, type, kind')
        .eq('parent_id', resolvedParent.id)
        .order('type')
        .order('name')
        .limit(2000)

      const { data: ancs } = await supabase
        .rpc('focus_ancestors', { p_focus_id: resolvedParent.id })

      if (cancelled) return
      setParent(resolvedParent)
      setBreadcrumb([...(ancs || [])].reverse())
      setChildren(kids || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [parentParam])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setSearchResults([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('nextus_focuses')
        .select('id, slug, name, type, kind')
        .ilike('name', `%${q}%`)
        .order('type')
        .order('name')
        .limit(30)
      if (cancelled) return
      setSearchResults(data || [])
      setSearching(false)
    }, 280)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query])

  const { filteredCount, grouped, totalCount } = useMemo(() => {
    const filtered = children.filter(c => focusPassesDomainFilter(c, selectedDomains))
    const g = {}
    for (const c of filtered) {
      const t = c.type || 'other'
      if (!g[t]) g[t] = []
      g[t].push(c)
    }
    return { filteredCount: filtered.length, grouped: g, totalCount: children.length }
  }, [children, selectedDomains])

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="" />

      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 80px',
      }}>

        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.20em', color: gold, textTransform: 'uppercase', marginBottom: '8px' }}>
          Geographic directory
        </div>
        <h1 style={{
          ...display,
          fontSize: 'clamp(34px, 5vw, 48px)',
          fontWeight: 300, color: dark,
          margin: 0, marginBottom: '14px', lineHeight: 1.15,
        }}>
          {parent ? parent.name : 'Earth'}
        </h1>

        {parent && breadcrumb.length > 0 && (
          <div style={{
            ...sc, fontSize: '11px', letterSpacing: '0.16em',
            color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            <Link to="/focus" style={{ color: 'rgba(15,21,35,0.72)', textDecoration: 'none' }}>
              Directory
            </Link>
            {breadcrumb.map(a => (
              <span key={a.id}>
                <span style={{ color: 'rgba(15,21,35,0.30)', margin: '0 8px' }}>/</span>
                <Link
                  to={`/focus?parent=${a.slug}`}
                  style={{ color: 'rgba(15,21,35,0.72)', textDecoration: 'none' }}
                >
                  {a.name}
                </Link>
              </span>
            ))}
          </div>
        )}

        {parent && (
          <div style={{ marginBottom: '32px' }}>
            <Link
              to={`/focus/${parent.slug}`}
              style={{
                ...sc, fontSize: '12px', letterSpacing: '0.16em',
                color: gold, background: 'rgba(200,146,42,0.05)',
                border: '1px solid rgba(200,146,42,0.55)',
                borderRadius: '30px', padding: '8px 18px',
                textDecoration: 'none', textTransform: 'uppercase',
              }}
            >
              Open {parent.name}&rsquo;s profile &rarr;
            </Link>
          </div>
        )}

        {/* Domain filter chips */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            ...sc, fontSize: '10.5px', letterSpacing: '0.18em',
            color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Filter by domain {selectedDomains.size > 0 && (
              <button
                type="button"
                onClick={clearDomains}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: gold, marginLeft: '10px',
                  ...sc, fontSize: '10px', letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                clear &times;
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {DOMAINS.map(d => {
              const active = selectedDomains.has(d.slug)
              return (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => toggleDomain(d.slug)}
                  style={{
                    ...sc,
                    fontSize: '11.5px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: active ? '#FFFFFF' : d.color,
                    background: active ? d.color : 'rgba(15,21,35,0.02)',
                    border: '1.5px solid ' + d.color,
                    borderRadius: '20px',
                    padding: '6px 14px',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
          {selectedDomains.size > 0 && (
            <div style={{ ...body, fontSize: '12.5px', color: 'rgba(15,21,35,0.55)', fontStyle: 'italic', marginTop: '8px' }}>
              Showing {filteredCount} of {totalCount} nested entities.
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ marginBottom: '32px' }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search any place, region, or feature&hellip;"
            style={{
              ...body, fontSize: '15px', color: dark,
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1.5px solid rgba(200,146,42,0.30)',
              background: '#FFFFFF', outline: 'none',
              width: '100%', maxWidth: '420px',
            }}
          />
          {query.trim().length >= 2 && (
            <div style={{
              marginTop: '10px',
              maxWidth: '420px',
              background: '#FFFFFF',
              border: '1.5px solid rgba(200,146,42,0.30)',
              borderRadius: '8px',
              maxHeight: '320px',
              overflowY: 'auto',
            }}>
              {searching && (
                <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', padding: '12px 16px' }}>
                  Searching&hellip;
                </div>
              )}
              {!searching && searchResults.length === 0 && (
                <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', padding: '12px 16px' }}>
                  No matches in the directory yet.
                </div>
              )}
              {searchResults.map(r => (
                <Link
                  key={r.id}
                  to={'/focus/' + r.slug}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '10px 16px',
                    borderBottom: '1px solid rgba(200,146,42,0.10)',
                    textDecoration: 'none', color: dark,
                  }}
                >
                  <span style={{ ...body, fontSize: '14px' }}>{r.name}</span>
                  <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.12em', color: gold, textTransform: 'uppercase' }}>
                    {TYPE_LABEL[r.type] || r.type}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Grouped children */}
        {loading && (
          <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
            Loading&hellip;
          </p>
        )}

        {!loading && filteredCount === 0 && (
          <div style={{
            ...body, fontSize: '15px',
            color: 'rgba(15,21,35,0.72)', fontStyle: 'italic',
            padding: '20px',
            background: 'rgba(200,146,42,0.04)',
            border: '1px dashed rgba(200,146,42,0.35)',
            borderRadius: '8px',
          }}>
            {totalCount === 0
              ? (parent
                  ? 'Nothing is yet seeded directly under ' + parent.name + '.'
                  : 'The directory is empty. Run migrations 043 and 045 to seed.')
              : 'No nested entities match the selected domain' + (selectedDomains.size > 1 ? 's' : '') + '.'}
          </div>
        )}

        {!loading && filteredCount > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {Object.keys(grouped).sort().map(type => {
              const all = grouped[type]
              const expanded = expandedTypes.has(type)
              const visible = expanded ? all : all.slice(0, PER_CATEGORY_CAP)
              return (
                <div key={type}>
                  <div style={{
                    ...sc, fontSize: '12px', letterSpacing: '0.18em',
                    color: gold, textTransform: 'uppercase',
                    marginBottom: '12px',
                  }}>
                    {TYPE_LABEL[type] || type} &middot; {all.length}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {visible.map(c => (
                      <ChildCard key={c.id} focus={c} />
                    ))}
                    {!expanded && all.length > PER_CATEGORY_CAP && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(type)}
                        style={{
                          ...sc, fontSize: '11px', letterSpacing: '0.14em',
                          color: gold, background: 'none',
                          border: '1px dashed rgba(200,146,42,0.45)',
                          borderRadius: '20px',
                          padding: '7px 14px',
                          cursor: 'pointer', textTransform: 'uppercase',
                        }}
                      >
                        Show all {all.length}
                      </button>
                    )}
                    {expanded && all.length > PER_CATEGORY_CAP && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(type)}
                        style={{
                          ...sc, fontSize: '11px', letterSpacing: '0.14em',
                          color: 'rgba(15,21,35,0.55)', background: 'none',
                          border: '1px dashed rgba(15,21,35,0.20)',
                          borderRadius: '20px',
                          padding: '7px 14px',
                          cursor: 'pointer', textTransform: 'uppercase',
                        }}
                      >
                        Show fewer
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ChildCard({ focus }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '7px 14px',
      borderRadius: '20px',
      border: '1px solid rgba(200,146,42,0.30)',
      background: '#FFFFFF',
    }}>
      <Link
        to={'/focus?parent=' + focus.slug}
        style={{ ...body, fontSize: '14px', color: dark, textDecoration: 'none' }}
      >
        {focus.name}
      </Link>
      <Link
        to={'/focus/' + focus.slug}
        title={'Open ' + focus.name + "'s profile"}
        style={{ ...sc, fontSize: '10px', letterSpacing: '0.10em', color: gold, textDecoration: 'none', padding: '0 4px', borderLeft: '1px solid rgba(200,146,42,0.20)' }}
      >
        OPEN
      </Link>
    </div>
  )
}
