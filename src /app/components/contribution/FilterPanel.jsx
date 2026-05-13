// src/beta/components/contribution/FilterPanel.jsx
//
// Filters for the "Find where I'm needed" tab.
//
// Surfaces:
//   - Tier chips (multi-select)
//   - Medium (digital / in_person / either)
//   - Civilisational domains (multi-select)
//   - Platform principles (multi-select, the four)
//   - "Near me first" toggle (default ON — in-person bias)
//
// Props:
//   filters        — current filter state (see shape below)
//   onChange       — (nextFilters) => void
//   tiers          — CONTRIBUTION_TIERS (array of {slug,label,description})
//   civDomains     — CIV_DOMAINS (array of {slug,label,...})
//   userHasFocus   — boolean; controls whether "Near me first" is interactive
//
// Filter shape:
//   {
//     tiers:      string[],          // tier slugs
//     medium:     'any' | 'digital' | 'in_person' | 'either',
//     domains:    string[],          // civ domain slugs
//     principles: string[],          // principle slugs
//     nearMeFirst: boolean,
//   }

import { useState } from 'react'
import { PRINCIPLES_ORDERED } from '../../constants/principles'
import TierChip from './TierChip'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const MEDIUM_OPTIONS = [
  { value: 'any',       label: 'Any medium' },
  { value: 'in_person', label: 'In person' },
  { value: 'digital',   label: 'Digital' },
  { value: 'either',    label: 'Either' },
]

function SectionLabel({ children }) {
  return (
    <span style={{
      ...sc,
      fontSize: '10px',
      letterSpacing: '0.18em',
      color: 'rgba(15,21,35,0.55)',
      textTransform: 'uppercase',
      display: 'block',
      marginBottom: '10px',
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
        ...sc,
        fontSize: '12px',
        letterSpacing: '0.04em',
        color: active ? color : 'rgba(15,21,35,0.72)',
        background: active ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
        border: active
          ? `1px solid ${color}`
          : '1px solid rgba(200,146,42,0.25)',
        borderRadius: '40px',
        padding: '5px 12px',
        cursor: 'pointer',
        fontWeight: active ? 600 : 400,
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(200,146,42,0.04)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = '#FFFFFF'
      }}
    >
      {label}
    </button>
  )
}

export default function FilterPanel({
  filters,
  onChange,
  tiers = [],
  civDomains = [],
  userHasFocus = false,
}) {
  const [expanded, setExpanded] = useState(false)

  function toggle(key, value) {
    const list = filters[key] || []
    const next = list.includes(value)
      ? list.filter(v => v !== value)
      : [...list, value]
    onChange({ ...filters, [key]: next })
  }

  function setMedium(value) {
    onChange({ ...filters, medium: value })
  }

  function setNearMe(value) {
    onChange({ ...filters, nearMeFirst: value })
  }

  const hasAnyFilter =
    (filters.tiers?.length || 0) +
    (filters.domains?.length || 0) +
    (filters.principles?.length || 0) > 0 ||
    filters.medium !== 'any'

  return (
    <div style={{
      padding: '20px 22px',
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.18)',
      borderRadius: '14px',
      marginBottom: '24px',
    }}>
      {/* Top row: near me + clear */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: expanded ? '20px' : '0',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: userHasFocus ? 'pointer' : 'default',
            opacity: userHasFocus ? 1 : 0.5,
          }}>
            <input
              type="checkbox"
              checked={filters.nearMeFirst}
              onChange={e => setNearMe(e.target.checked)}
              disabled={!userHasFocus}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#A8721A',
                cursor: userHasFocus ? 'pointer' : 'default',
              }}
            />
            <span style={{
              ...sc,
              fontSize: '12px',
              letterSpacing: '0.1em',
              color: filters.nearMeFirst && userHasFocus ? '#A8721A' : 'rgba(15,21,35,0.72)',
              fontWeight: filters.nearMeFirst && userHasFocus ? 600 : 400,
            }}>
              Near me first
            </span>
          </label>

          {!userHasFocus && (
            <span style={{
              ...body,
              fontSize: '12px',
              color: 'rgba(15,21,35,0.55)',
            }}>
              Set your focus on profile to enable.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={() => onChange({
                tiers: [],
                medium: 'any',
                domains: [],
                principles: [],
                nearMeFirst: filters.nearMeFirst,
              })}
              style={{
                ...sc,
                fontSize: '11px',
                letterSpacing: '0.1em',
                color: 'rgba(15,21,35,0.55)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Clear filters
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.14em',
              color: '#A8721A',
              background: 'transparent',
              border: '1px solid rgba(200,146,42,0.30)',
              borderRadius: '40px',
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            {expanded ? 'Hide filters' : 'Filters'}
          </button>
        </div>
      </div>

      {/* Filter body */}
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Tiers */}
          <div>
            <SectionLabel>Tier</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tiers.map(t => (
                <TierChip
                  key={t.slug}
                  slug={t.slug}
                  label={t.label}
                  active={(filters.tiers || []).includes(t.slug)}
                  onClick={() => toggle('tiers', t.slug)}
                />
              ))}
            </div>
          </div>

          {/* Medium */}
          <div>
            <SectionLabel>Medium</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {MEDIUM_OPTIONS.map(o => (
                <ToggleChip
                  key={o.value}
                  label={o.label}
                  active={filters.medium === o.value}
                  onClick={() => setMedium(o.value)}
                />
              ))}
            </div>
          </div>

          {/* Civ domains */}
          <div>
            <SectionLabel>Civilisational domain</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {civDomains.map(d => (
                <ToggleChip
                  key={d.slug}
                  label={d.label}
                  active={(filters.domains || []).includes(d.slug)}
                  onClick={() => toggle('domains', d.slug)}
                  color={d.color || '#A8721A'}
                />
              ))}
            </div>
          </div>

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
        </div>
      )}
    </div>
  )
}
