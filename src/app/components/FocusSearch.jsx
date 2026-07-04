// FocusSearch.jsx
// Geographic Focus search/select, reused across the platform wherever a user
// picks a place, organisation, or other Focus from nextus_focuses.
//
// v2 vocabulary update — the TYPE_LABEL map now covers the full v2 scale
// taxonomy from migration 042. Old v1 keys (nation, province) are kept for
// backward compatibility with any unmigrated rows. New v2 keys land alongside.
//
// Optional props:
//   value      — selected focus object (or null)
//   onChange   — called with the picked focus, or null to clear
//   kindFilter — array of kinds to restrict results to, e.g. ['political','cultural'].
//                If omitted or empty, all kinds are searchable.
//   placeholder — optional input placeholder override
//   limit      — max results to return (default 12)

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { body, sc, gold } from './OrgShared'
import { at } from '../../lib/designTokens'

// Scale-type labels covering the v2 vocabulary. Keys are exactly the values
// stored in nextus_focuses.type. Source of truth: migration 042 CHECK constraint.
const TYPE_LABEL = {
  // Top of tree
  planet:             'Planet',
  continent:          'Continent',
  ocean:              'Ocean',
  sea:                'Sea',
  // Political / administrative
  country:            'Country',
  nation:             'Nation',                  // v1 legacy
  state_or_province:  'State / Province',
  province:           'Province / Territory',    // v1 legacy
  region:             'Region',
  city:               'City',
  neighbourhood:      'Neighbourhood',
  // Hydrological
  river:              'River',
  lake:               'Lake',
  watershed:          'Watershed',
  // Geological
  mountain_range:     'Mountain Range',
  mountain:           'Mountain',
  desert:             'Desert',
  island:             'Island',
  archipelago:        'Archipelago',
  geological_feature: 'Geological Feature',
  polar_region:       'Polar Region',
  // Ecological
  ecoregion:          'Ecoregion',
  biome:              'Biome',
  realm:              'Biogeographic Realm',
  bioregion:          'Bioregion',
  forest:             'Forest',
  // Designation-as-scale
  protected_area:     'Protected Area',
  heritage_site:      'Heritage Site',
  sacred_site:        'Sacred Site',
  // Atmospheric / orbital (deferred from launch but named)
  atmosphere_layer:   'Atmosphere Layer',
  orbital_zone:       'Orbital Zone',
  // Organisation
  organisation:       'Organisation',
}

// Kind labels — the typology axis from v2. Surfaced alongside the type label
// when a kind is present, so a search for "Amazon" makes clear which one is
// the river (hydrological) and which is the rainforest (ecological).
const KIND_LABEL = {
  political:    'Political',
  hydrological: 'Hydrological',
  geological:   'Geological',
  ecological:   'Ecological',
  cultural:     'Cultural',
  designated:   'Designated',
  disrupted:    'Disrupted',
  atmospheric:  'Atmospheric',
  orbital:      'Orbital',
}

function labelFor(focus) {
  return TYPE_LABEL[focus.type] || focus.type || 'Focus'
}

export function FocusSearch({
  value,
  onChange,
  kindFilter,
  placeholder,
  limit = 12,
}) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen]         = useState(false)
  const debounce                = useRef(null)

  const kindFilterKey = Array.isArray(kindFilter) && kindFilter.length > 0
    ? kindFilter.slice().sort().join(',')
    : ''

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setSearching(true)
      let q = supabase
        .from('nextus_focuses')
        .select('id, name, type, kind, slug')
        .ilike('name', `%${query.trim()}%`)
        .order('type')
        .limit(limit)
      if (kindFilterKey) {
        q = q.in('kind', kindFilterKey.split(','))
      }
      const { data } = await q
      setResults(data || [])
      setSearching(false)
    }, 280)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, kindFilterKey, limit])

  function select(focus) { onChange(focus); setQuery(''); setResults([]); setOpen(false) }
  function clear() { onChange(null); setQuery(''); setResults([]) }

  return (
    <div style={{ position: 'relative' }}>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid rgba(217,178,74,0.55)', background: 'rgba(217,178,74,0.04)' }}>
          <div>
            <span style={{ ...body, fontSize: '15px', color: at.text }}>{value.name}</span>
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold, marginLeft: '10px' }}>
              {labelFor(value)}
            </span>
          </div>
          <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: at.ghost, lineHeight: 1, padding: '0 0 0 10px' }}>×</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder || 'Search — e.g. Canada, Toronto, Cascadia…'}
            style={{ ...body, fontSize: '15px', color: at.text, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(217,178,74,0.30)', background: at.object, outline: 'none', width: '100%' }}
          />
          {open && query.trim().length >= 2 && (
            <div className="focus-search-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: at.object, border: '1.5px solid rgba(217,178,74,0.30)', borderRadius: '0 0 8px 8px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', maxHeight: '280px', overflowY: 'auto' }}>
              {searching && <div style={{ ...body, fontSize: '15px', color: at.ghost, padding: '12px 16px' }}>Searching…</div>}
              {!searching && results.length === 0 && <div style={{ ...body, fontSize: '15px', color: at.ghost, padding: '12px 16px' }}>No results for "{query}"</div>}
              {results.map(f => (
                <button key={f.id} onClick={() => select(f)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(217,178,74,0.10)', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,178,74,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ ...body, fontSize: '15px', color: at.text }}>{f.name}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold }}>
                      {labelFor(f)}
                    </span>
                    {f.kind && KIND_LABEL[f.kind] && f.type !== 'organisation' && (
                      <span style={{ ...sc, fontSize: '9px', letterSpacing: '0.10em', color: at.ghost }}>
                        {KIND_LABEL[f.kind]}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Exported for use by other components that need consistent labels
export { TYPE_LABEL, KIND_LABEL, labelFor }
