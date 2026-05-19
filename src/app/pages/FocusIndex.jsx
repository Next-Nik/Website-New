// src/app/pages/FocusIndex.jsx
//
// Browseable directory of all seeded Focuses at /focus.
// Solves the discoverability problem: without this, you'd need to know
// a slug to reach /focus/:slug. With this, you walk down the tree.
//
// Renders three views:
//   1. Top-of-tree if no parent param — planet → continents/oceans/biomes/realms
//   2. Children of any Focus if ?parent=<id|slug>
//   3. Search affordance for arbitrary lookups across the whole tree

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { supabase } from '../../hooks/useSupabase'
import { TYPE_LABEL, KIND_LABEL } from '../components/FocusSearch'

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold    = '#A8721A'
const dark    = '#0F1523'
const parch   = '#FAFAF7'

export function FocusIndex() {
  const [searchParams, setSearchParams] = useSearchParams()
  const parentParam = searchParams.get('parent')

  const [parent, setParent]       = useState(null)        // the resolved parent Focus (if any)
  const [children, setChildren]   = useState([])
  const [breadcrumb, setBreadcrumb] = useState([])
  const [loading, setLoading]     = useState(true)
  const [query, setQuery]         = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  // Load parent + its direct children. parentParam may be a slug or uuid;
  // we try slug first.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)

      if (!parentParam) {
        // Top of tree: planet + continents + oceans + top-level biomes/realms.
        // We list everything whose parent_id is NULL (planet) AND
        // everything whose parent_id is Earth (continents, oceans). Plus
        // the biomes and realms which have no parent in v2 architecture.
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

      // Resolve parent (try slug, fall back to id)
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
        setParent(null)
        setBreadcrumb([])
        setChildren([])
        setLoading(false)
        return
      }

      // Children
      const { data: kids } = await supabase
        .from('nextus_focuses')
        .select('id, slug, name, type, kind')
        .eq('parent_id', resolvedParent.id)
        .order('type')
        .order('name')
        .limit(1000)

      // Breadcrumb via the RPC we shipped in 047
      const { data: ancs } = await supabase
        .rpc('focus_ancestors', { p_focus_id: resolvedParent.id })

      if (cancelled) return
      setParent(resolvedParent)
      setBreadcrumb([...(ancs || [])].reverse())  // root → leaf
      setChildren(kids || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [parentParam])

  // Free-text search across all Focuses (fires after 2+ chars, debounced)
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

  // Group children by type for prettier rendering
  const grouped = useMemo(() => {
    const g = {}
    for (const c of children) {
      const t = c.type || 'other'
      if (!g[t]) g[t] = []
      g[t].push(c)
    }
    return g
  }, [children])

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

        {/* Breadcrumb */}
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

        {/* Open this Focus's profile */}
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

        {/* Search across the whole tree */}
        <div style={{ marginBottom: '32px' }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search any place, region, or feature…"
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
                  to={`/focus/${r.slug}`}
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

        {/* Children list, grouped by type */}
        {loading && (
          <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
            Loading&hellip;
          </p>
        )}

        {!loading && children.length === 0 && (
          <div style={{
            ...body, fontSize: '15px',
            color: 'rgba(15,21,35,0.72)', fontStyle: 'italic',
            padding: '20px',
            background: 'rgba(200,146,42,0.04)',
            border: '1px dashed rgba(200,146,42,0.35)',
            borderRadius: '8px',
          }}>
            {parent
              ? `Nothing is yet seeded directly under ${parent.name}. The platform's directory grows as ingest fills in.`
              : `The directory is empty. Run the top-of-tree seed (migration 043) and the GeoNames ingest (045) to populate.`}
          </div>
        )}

        {!loading && children.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.keys(grouped).sort().map(type => (
              <div key={type}>
                <div style={{
                  ...sc, fontSize: '12px', letterSpacing: '0.18em',
                  color: gold, textTransform: 'uppercase',
                  marginBottom: '12px',
                }}>
                  {TYPE_LABEL[type] || type} &middot; {grouped[type].length}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {grouped[type].slice(0, 200).map(c => (
                    <ChildCard key={c.id} focus={c} />
                  ))}
                  {grouped[type].length > 200 && (
                    <span style={{
                      ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                      alignSelf: 'center', fontStyle: 'italic',
                    }}>
                      &hellip; and {grouped[type].length - 200} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ChildCard({ focus }) {
  // Each card: name links into the directory drill-down; a small chevron
  // links to the Focus's full profile (since some users will want either).
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
        to={`/focus?parent=${focus.slug}`}
        style={{ ...body, fontSize: '14px', color: dark, textDecoration: 'none' }}
      >
        {focus.name}
      </Link>
      <Link
        to={`/focus/${focus.slug}`}
        title={`Open ${focus.name}'s profile`}
        style={{ ...sc, fontSize: '10px', letterSpacing: '0.10em', color: gold, textDecoration: 'none', padding: '0 4px', borderLeft: '1px solid rgba(200,146,42,0.20)' }}
      >
        OPEN
      </Link>
    </div>
  )
}
