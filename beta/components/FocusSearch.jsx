// src/beta/components/FocusSearch.jsx
// Geographic focus search/select, reused across org manage and nominate flows.

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { body, sc, gold } from './OrgShared'

const TYPE_LABEL = {
  planet:'Planet', continent:'Continent', nation:'Nation',
  province:'Province / Territory', city:'City',
  neighbourhood:'Neighbourhood', organisation:'Organisation',
}

export function FocusSearch({ value, onChange }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen]         = useState(false)
  const debounce                = useRef(null)

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('nextus_focuses')
        .select('id, name, type, slug')
        .ilike('name', `%${query.trim()}%`)
        .order('type').limit(12)
      setResults(data || [])
      setSearching(false)
    }, 280)
  }, [query])

  function select(focus) { onChange(focus); setQuery(''); setResults([]); setOpen(false) }
  function clear() { onChange(null); setQuery(''); setResults([]) }

  return (
    <div style={{ position: 'relative' }}>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.55)', background: 'rgba(200,146,42,0.04)' }}>
          <div>
            <span style={{ ...body, fontSize: '15px', color: '#0F1523' }}>{value.name}</span>
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold, marginLeft: '10px' }}>
              {TYPE_LABEL[value.type] || value.type}
            </span>
          </div>
          <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'rgba(15,21,35,0.55)', lineHeight: 1, padding: '0 0 0 10px' }}>×</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Search — e.g. British Columbia, Vancouver…"
            style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }}
          />
          {open && query.trim().length >= 2 && (
            <div className="focus-search-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.30)', borderRadius: '0 0 8px 8px', boxShadow: '0 8px 24px rgba(15,21,35,0.10)', maxHeight: '240px', overflowY: 'auto' }}>
              {searching && <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', padding: '12px 16px' }}>Searching…</div>}
              {!searching && results.length === 0 && <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', padding: '12px 16px' }}>No results for "{query}"</div>}
              {results.map(f => (
                <button key={f.id} onClick={() => select(f)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(200,146,42,0.10)', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,146,42,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ ...body, fontSize: '15px', color: '#0F1523' }}>{f.name}</span>
                  <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold }}>{TYPE_LABEL[f.type] || f.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
