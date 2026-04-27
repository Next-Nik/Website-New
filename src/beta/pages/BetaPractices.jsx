// src/beta/pages/BetaPractices.jsx
//
// /beta/practices — practice library.
// Browse all practices. Filter by kind, domains, lenses, principles,
// vetting status. Sort: most recently attested by default.
//
// Empty state copy is canonical and locked.

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'

import {
  PRACTICE_KINDS,
  VETTING_STATUSES,
  PRACTICES_EMPTY_STATE_COPY,
} from '../constants/practices'
import { CIV_DOMAINS, LENSES_PER_DOMAIN } from '../constants/domains'
import { PRINCIPLES_ORDERED } from '../constants/principles'

import PracticeCard from '../components/practices/PracticeCard'

const sc       = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body     = { fontFamily: "'Lora', Georgia, serif" }
const garamond = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

// ─── Header ────────────────────────────────────────────────

function PageHeader() {
  return (
    <div style={{ marginBottom: '32px' }}>
      <span style={{
        ...sc, fontSize: '11px', letterSpacing: '0.2em', color: '#A8721A',
        textTransform: 'uppercase', display: 'block', marginBottom: '10px',
      }}>
        Practices
      </span>
      <h1 style={{
        ...garamond,
        fontSize: 'clamp(32px, 4.5vw, 48px)',
        fontWeight: 300,
        color: '#0F1523',
        lineHeight: 1.1,
        margin: '0 0 14px',
      }}>
        What is held here.
      </h1>
      <p style={{
        ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)',
        lineHeight: 1.7, margin: 0, maxWidth: '640px',
      }}>
        Best for All practices live in Society. Best for the Individual practices
        live in Human Being. Both kinds are scaffolded for contributor-led population.
        The platform builds the structure; the people who carry the practices fill it.
      </p>
    </div>
  )
}

// ─── Filter bar ─────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <span style={{
      ...sc, fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)',
      textTransform: 'uppercase', display: 'block', marginBottom: '8px',
    }}>
      {children}
    </span>
  )
}

function ToggleChip({ label, active, onClick, color = '#A8721A' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        ...sc, fontSize: '12px', letterSpacing: '0.04em',
        color: active ? color : 'rgba(15,21,35,0.72)',
        background: active ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
        border: active ? `1px solid ${color}` : '1px solid rgba(200,146,42,0.25)',
        borderRadius: '40px', padding: '5px 12px',
        cursor: 'pointer', fontWeight: active ? 600 : 400,
        transition: 'background 120ms ease',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(200,146,42,0.04)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = '#FFFFFF' }}
    >
      {label}
    </button>
  )
}

function FilterPanel({ filters, onChange, availableLenses }) {
  const [expanded, setExpanded] = useState(false)

  function toggle(key, value) {
    const list = filters[key] || []
    const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value]
    onChange({ ...filters, [key]: next })
  }

  function setSingle(key, value) {
    onChange({ ...filters, [key]: filters[key] === value ? null : value })
  }

  const hasAny =
    (filters.kind ? 1 : 0) +
    (filters.domains?.length || 0) +
    (filters.lenses?.length || 0) +
    (filters.principles?.length || 0) +
    (filters.vetting ? 1 : 0) > 0

  return (
    <div style={{
      padding: '18px 22px',
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.18)',
      borderRadius: '14px',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {/* Always-visible: kind toggle */}
          {PRACTICE_KINDS.map(k => (
            <ToggleChip
              key={k.slug}
              label={k.label}
              active={filters.kind === k.slug}
              onClick={() => setSingle('kind', k.slug)}
              color={k.color}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {hasAny && (
            <button type="button"
              onClick={() => onChange({ kind: null, domains: [], lenses: [], principles: [], vetting: null })}
              style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>
              Clear filters
            </button>
          )}
          <button type="button" onClick={() => setExpanded(v => !v)}
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A', background: 'transparent', border: '1px solid rgba(200,146,42,0.30)', borderRadius: '40px', padding: '6px 14px', cursor: 'pointer' }}>
            {expanded ? 'Hide filters' : 'More filters'}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Civ domains */}
          <div>
            <SectionLabel>Domain</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CIV_DOMAINS.map(d => (
                <ToggleChip
                  key={d.slug}
                  label={d.label}
                  active={(filters.domains || []).includes(d.slug)}
                  onClick={() => toggle('domains', d.slug)}
                  color={d.color}
                />
              ))}
            </div>
          </div>

          {/* Lenses (only the ones available given selected domains) */}
          {availableLenses.length > 0 && (
            <div>
              <SectionLabel>Lens</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {availableLenses.map(l => (
                  <ToggleChip
                    key={l}
                    label={l}
                    active={(filters.lenses || []).includes(l)}
                    onClick={() => toggle('lenses', l)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Principles */}
          <div>
            <SectionLabel>Platform principle</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRINCIPLES_ORDERED.map(p => (
                <ToggleChip
                  key={p.slug}
                  label={p.label}
                  active={(filters.principles || []).includes(p.slug)}
                  onClick={() => toggle('principles', p.slug)}
                />
              ))}
            </div>
          </div>

          {/* Vetting */}
          <div>
            <SectionLabel>Vetting status</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {VETTING_STATUSES.map(v => (
                <ToggleChip
                  key={v.slug}
                  label={v.label}
                  active={filters.vetting === v.slug}
                  onClick={() => setSingle('vetting', v.slug)}
                  color={v.color === 'rgba(15,21,35,0.55)' ? '#A8721A' : v.color}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────

function EmptyState({ filtersActive, isSignedIn }) {
  if (filtersActive) {
    return (
      <div style={{
        padding: '40px 28px',
        background: '#FFFFFF',
        border: '1px dashed rgba(200,146,42,0.30)',
        borderRadius: '14px',
        textAlign: 'center',
      }}>
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: 0 }}>
          Nothing matches those filters yet.
        </p>
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, margin: '6px 0 0' }}>
          The practice library is contributor-led and grows as people bring what they hold.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      padding: '48px 32px',
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.25)',
      borderRadius: '14px',
      textAlign: 'left',
    }}>
      <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '14px' }}>
        Empty by design
      </span>
      <p style={{
        ...garamond,
        fontSize: 'clamp(20px, 2.6vw, 26px)',
        fontWeight: 400,
        color: '#0F1523',
        lineHeight: 1.45,
        margin: '0 0 24px',
        maxWidth: '640px',
      }}>
        {PRACTICES_EMPTY_STATE_COPY}
      </p>
      {isSignedIn ? (
        <Link to="/beta/practice/contribute"
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#FFFFFF', background: '#0F1523', padding: '12px 28px', borderRadius: '40px', textDecoration: 'none', display: 'inline-block', fontWeight: 600 }}>
          Contribute a practice
        </Link>
      ) : (
        <Link to="/login"
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', background: 'rgba(200,146,42,0.06)', padding: '12px 28px', borderRadius: '40px', textDecoration: 'none', display: 'inline-block', border: '1px solid rgba(200,146,42,0.40)' }}>
          Sign in to contribute
        </Link>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────

export default function BetaPractices() {
  const { user } = useAuth()

  const [practices, setPractices] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filters, setFilters]     = useState({
    kind: null,
    domains: [],
    lenses: [],
    principles: [],
    vetting: null,
  })

  useEffect(() => {
    loadPractices()
  }, [])

  async function loadPractices() {
    setLoading(true)
    // Default sort: most recently attested.
    // We use updated_at as a proxy because triggers update updated_at on
    // attestation insert (Module 1 migration 06). Fall back to created_at.
    const { data, error } = await supabase
      .from('practices_beta')
      .select('id, slug, title, practice_kind, domains, subdomains, lenses, platform_principles, description, attestation_count, outcome_report_count, vetting_status, horizon_floor_status, contributor_id, contributor_role, updated_at, created_at')
      .order('updated_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Load practices error:', error)
      setPractices([])
    } else {
      setPractices(data || [])
    }
    setLoading(false)
  }

  // Available lenses depend on selected domains
  const availableLenses = useMemo(() => {
    const lensesSet = new Set()
    const domains = filters.domains?.length ? filters.domains : CIV_DOMAINS.map(d => d.slug)
    for (const d of domains) {
      const list = LENSES_PER_DOMAIN[d] || []
      for (const l of list) lensesSet.add(l)
    }
    return Array.from(lensesSet)
  }, [filters.domains])

  // Apply filters in memory
  const filtered = useMemo(() => {
    return practices.filter(p => {
      if (filters.kind && p.practice_kind !== filters.kind) return false
      if (filters.vetting && p.vetting_status !== filters.vetting) return false
      if (filters.domains?.length) {
        const has = (p.domains || []).some(d => filters.domains.includes(d))
        if (!has) return false
      }
      if (filters.lenses?.length) {
        const has = (p.lenses || []).some(l => filters.lenses.includes(l))
        if (!has) return false
      }
      if (filters.principles?.length) {
        const has = (p.platform_principles || []).some(pp => filters.principles.includes(pp))
        if (!has) return false
      }
      return true
    })
  }, [practices, filters])

  const filtersActive =
    !!filters.kind ||
    !!filters.vetting ||
    (filters.domains?.length || 0) > 0 ||
    (filters.lenses?.length || 0) > 0 ||
    (filters.principles?.length || 0) > 0

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav />

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: 'clamp(72px, 10vw, 96px) 24px 60px' }}>

        <PageHeader />

        {/* Contribute CTA — visible at all times for signed-in users */}
        {user && (
          <div style={{ marginBottom: '24px' }}>
            <Link
              to="/beta/practice/contribute"
              style={{
                ...sc, fontSize: '12px', letterSpacing: '0.16em',
                color: '#A8721A', background: 'rgba(200,146,42,0.06)',
                padding: '10px 22px', borderRadius: '40px',
                textDecoration: 'none', display: 'inline-block',
                border: '1px solid rgba(200,146,42,0.40)',
                fontWeight: 600,
              }}
            >
              Contribute a practice
            </Link>
          </div>
        )}

        <FilterPanel
          filters={filters}
          onChange={setFilters}
          availableLenses={availableLenses}
        />

        {loading ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                background: '#FFFFFF',
                border: '1px solid rgba(200,146,42,0.14)',
                borderRadius: '14px',
                padding: '20px 22px',
                height: '120px',
                opacity: 0.5,
                animation: 'pulse 1.8s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filtersActive={filtersActive} isSignedIn={!!user} />
        ) : (
          <div>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '14px' }}>
              {filtered.length} {filtered.length === 1 ? 'practice' : 'practices'} held here
            </div>
            <div>
              {filtered.map(p => (
                <PracticeCard key={p.id} practice={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
