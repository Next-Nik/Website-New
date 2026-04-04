import { useState, useEffect } from 'react'

// Category groupings for display
const CATEGORIES = [
  {
    label: 'The Platforms',
    keys: ['life-os', 'nextus'],
  },
  {
    label: 'Life OS Tools',
    keys: ['orienteering', 'foundation', 'purpose-piece', 'target-goals', 'horizon-leap'],
  },
  {
    label: 'Core Concepts',
    keys: ['horizon-goals', 'horizon-self', 'tea', 'fractal-principle', 'overview-effect', 'contribution-archetype'],
  },
  {
    label: 'Contribution Archetypes',
    keys: ['steward', 'maker', 'architect', 'connector', 'guardian', 'explorer', 'sage', 'mirror', 'exemplar'],
  },
  {
    label: 'Life OS Domains',
    keys: ['life-os-path', 'life-os-spark', 'life-os-body', 'life-os-finances', 'life-os-relationships', 'life-os-inner-game', 'life-os-outer-game'],
  },
  {
    label: 'NextUs Domains',
    keys: ['domain-human-being', 'domain-society', 'domain-nature', 'domain-technology', 'domain-finance-economy', 'domain-legacy', 'domain-vision'],
  },
  {
    label: 'Scale',
    keys: ['scale-home', 'scale-neighbourhood', 'scale-city', 'scale-province-state', 'scale-country', 'scale-continent', 'scale-global'],
  },
]

export function GlossaryPanel() {
  const [open, setOpen] = useState(false)
  const [glossary, setGlossary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open && !glossary) {
      setLoading(true)
      fetch('/glossary.json')
        .then(r => r.json())
        .then(data => { setGlossary(data.terms); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [open, glossary])

  const filteredTerms = glossary
    ? Object.entries(glossary).filter(([, v]) =>
        !query ||
        v.term.toLowerCase().includes(query.toLowerCase()) ||
        v.short.toLowerCase().includes(query.toLowerCase())
      )
    : []

  const isFiltering = query.length > 0

  return (
    <>
      {/* Left edge tab */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Glossary"
        style={{
          position: 'fixed',
          left: open ? '-60px' : '-14px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1500,
          background: '#FAFAF7',
          border: '1.5px solid rgba(200,146,42,0.78)',
          width: '44px',
          height: '88px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'all 0.25s ease',
          clipPath: 'polygon(0% 12%, 0% 88%, 30% 100%, 100% 100%, 100% 0%, 30% 0%)',
          borderRadius: '0 12px 12px 0',
        }}
      >
        <span style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          fontFamily: 'var(--font-sc)',
          fontSize: '13px',
          letterSpacing: '0.18em',
          color: 'var(--gold-dk)',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}>
          Glossary
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(15,21,35,0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
          }}
        >
          {/* Panel */}
          <div style={{
            width: 'min(500px, 92vw)',
            height: '100%',
            background: '#FAFAF7',
            borderRight: '1.5px solid rgba(200,146,42,0.3)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInLeft 0.25s ease',
          }}>
            {/* Header */}
            <div style={{
              padding: '28px 24px 16px',
              borderBottom: '1px solid rgba(200,146,42,0.18)',
              position: 'sticky',
              top: 0,
              background: '#FAFAF7',
              zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-sc)', fontSize: '13px', letterSpacing: '0.2em', color: 'var(--gold-dk)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    NextUs {'\u00B7'} Life OS
                  </span>
                  <h2 style={{ fontFamily: 'var(--font-sc)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1 }}>
                    Glossary
                  </h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: 'rgba(15,21,35,0.72)',
                    fontSize: '1.25rem',
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {'\u00D7'}
                </button>
              </div>
              {/* Search */}
              <input
                type="text"
                placeholder="Search terms..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  color: 'rgba(15,21,35,0.88)',
                  background: 'rgba(200,146,42,0.04)',
                  border: '1px solid rgba(200,146,42,0.35)',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Body */}
            <div style={{ padding: '12px 16px 32px', flex: 1 }}>
              {loading && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(15,21,35,0.72)', padding: '24px 8px' }}>
                  Loading glossary...
                </p>
              )}

              {!loading && glossary && isFiltering && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredTerms.length === 0 && (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(15,21,35,0.72)', padding: '12px 8px' }}>
                      No terms match "{query}"
                    </p>
                  )}
                  {filteredTerms.map(([key, term]) => (
                    <TermCard key={key} term={term} />
                  ))}
                </div>
              )}

              {!loading && glossary && !isFiltering && CATEGORIES.map(cat => {
                const terms = cat.keys
                  .map(k => glossary[k])
                  .filter(Boolean)
                  .filter(t => !t.placeholder)
                if (!terms.length) return null
                return (
                  <div key={cat.label} style={{ marginBottom: '20px' }}>
                    <div style={{ fontFamily: 'var(--font-sc)', fontSize: '13px', letterSpacing: '0.18em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '8px', padding: '0 8px' }}>
                      {cat.label}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {terms.map(term => (
                        <TermCard key={term.term} term={term} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Close tab */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close glossary"
            style={{
              position: 'fixed',
              left: 'min(500px, 92vw)',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2100,
              background: '#FAFAF7',
              border: '1.5px solid rgba(200,146,42,0.78)',
              borderLeft: 'none',
              width: '44px',
              height: '88px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              clipPath: 'polygon(28% 12%, 28% 88%, 30% 100%, 100% 100%, 100% 0%, 30% 0%)',
              borderRadius: '0 12px 12px 0',
            }}
          >
            <span style={{ fontFamily: 'var(--font-sc)', fontSize: '13px', color: 'var(--gold-dk)' }}>{'\u00D7'}</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}

function TermCard({ term }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: '10px',
      background: 'rgba(200,146,42,0.02)',
      border: '1px solid rgba(200,146,42,0.55)',
    }}>
      <div style={{ fontFamily: 'var(--font-sc)', fontSize: '13px', color: '#A8721A', marginBottom: '4px', lineHeight: 1.2 }}>
        {term.term}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.55 }}>
        {term.short}
      </div>
    </div>
  )
}
