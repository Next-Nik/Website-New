// src/beta/components/contribution/OfferingPanel.jsx
//
// "What I'm offering" tab. Self-authored declaration of contribution capacity.
//
// Surfaces (all writes to contributor_profiles_beta):
//   - count_on_me_for         (free text, save on blur)
//   - dont_count_on_me_for    (free text, save on blur)
//   - tier_capacity           (multi-select tiers with description)
//   - medium_preference       (radio: digital / in_person / both)
//   - engaged_civ_domains     (multi-select civ domains)
//   - engaged_principles      (multi-select with optional weight)
//
// Auto-saves on blur for free text. No save button.
// Optimistic updates on chips and radio.
//
// Props:
//   profile           — contributor_profiles_beta row (or null for first time)
//   onUpdate          — async (patch) => void
//   tiers             — CONTRIBUTION_TIERS
//   civDomains        — CIV_DOMAINS

import { useState, useEffect } from 'react'
import { PRINCIPLES_ORDERED, PRINCIPLE_WEIGHTS } from '../../constants/principles'
import PrincipleBadge from '../PrincipleBadge'
import TierChip from './TierChip'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

function Eyebrow({ children, style = {} }) {
  return (
    <span style={{
      ...sc,
      fontSize: '11px',
      letterSpacing: '0.2em',
      color: '#A8721A',
      textTransform: 'uppercase',
      display: 'block',
      marginBottom: '10px',
      ...style,
    }}>
      {children}
    </span>
  )
}

function Hint({ children }) {
  return (
    <p style={{
      ...body,
      fontSize: '13px',
      color: 'rgba(15,21,35,0.55)',
      lineHeight: 1.55,
      margin: '6px 0 14px',
    }}>
      {children}
    </p>
  )
}

// ─── Free-text field with save-on-blur ─────────────────────────

function FreeTextField({ label, hint, value, placeholder, onSave, rows = 3 }) {
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const [savedRecently, setSavedRecently] = useState(false)

  // Sync incoming value when it changes externally
  useEffect(() => {
    setDraft(value || '')
  }, [value])

  async function handleBlur() {
    const trimmed = draft.trim()
    if (trimmed === (value || '').trim()) return
    setSaving(true)
    await onSave(trimmed)
    setSaving(false)
    setSavedRecently(true)
    setTimeout(() => setSavedRecently(false), 1400)
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
        <Eyebrow style={{ marginBottom: 0 }}>{label}</Eyebrow>
        <span style={{
          ...sc,
          fontSize: '10px',
          letterSpacing: '0.1em',
          color: saving ? '#A8721A' : savedRecently ? '#2D6A4F' : 'rgba(15,21,35,0.35)',
          transition: 'color 200ms ease',
        }}>
          {saving ? 'Saving' : savedRecently ? 'Saved' : 'Auto-saves on blur'}
        </span>
      </div>
      {hint && <Hint>{hint}</Hint>}
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
        style={{
          ...body,
          fontSize: '15px',
          color: '#0F1523',
          width: '100%',
          padding: '12px 14px',
          borderRadius: '10px',
          border: '1px solid rgba(200,146,42,0.30)',
          background: '#FFFFFF',
          outline: 'none',
          resize: 'vertical',
          lineHeight: 1.65,
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ─── Medium preference radio ───────────────────────────────────

function MediumRadio({ value, onChange }) {
  const options = [
    { v: 'in_person', label: 'In person' },
    { v: 'digital',   label: 'Digital' },
    { v: 'both',      label: 'Both' },
  ]
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {options.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          style={{
            ...sc,
            fontSize: '12px',
            letterSpacing: '0.04em',
            color: value === o.v ? '#A8721A' : 'rgba(15,21,35,0.72)',
            background: value === o.v ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
            border: value === o.v
              ? '1px solid rgba(200,146,42,0.55)'
              : '1px solid rgba(200,146,42,0.25)',
            borderRadius: '40px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: value === o.v ? 600 : 400,
            transition: 'background 120ms ease',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── Principle row with optional weight ────────────────────────

function PrincipleRow({ principle, selected, weight, onToggle, onWeightChange }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: selected ? 'rgba(200,146,42,0.04)' : '#FFFFFF',
      border: selected
        ? '1px solid rgba(200,146,42,0.40)'
        : '1px solid rgba(200,146,42,0.18)',
      borderRadius: '12px',
      transition: 'background 120ms ease, border-color 120ms ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            style={{ width: '16px', height: '16px', accentColor: '#A8721A', cursor: 'pointer' }}
          />
          <PrincipleBadge slug={principle.slug} weight={selected ? (weight || 'primary') : 'tertiary'} />
        </label>

        {selected && (
          <select
            value={weight || 'primary'}
            onChange={e => onWeightChange(e.target.value)}
            style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.08em',
              color: '#A8721A',
              background: '#FFFFFF',
              border: '1px solid rgba(200,146,42,0.30)',
              borderRadius: '40px',
              padding: '4px 10px',
              cursor: 'pointer',
              outline: 'none',
              textTransform: 'capitalize',
            }}
          >
            {PRINCIPLE_WEIGHTS.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

// ─── Civ domain chip group ─────────────────────────────────────

function DomainChips({ domains, selected = [], onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {domains.map(d => {
        const active = selected.includes(d.slug)
        return (
          <button
            key={d.slug}
            type="button"
            onClick={() => onToggle(d.slug)}
            aria-pressed={active}
            style={{
              ...sc,
              fontSize: '12px',
              letterSpacing: '0.04em',
              color: active ? (d.color || '#A8721A') : 'rgba(15,21,35,0.72)',
              background: active ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
              border: active
                ? `1px solid ${d.color || '#A8721A'}`
                : '1px solid rgba(200,146,42,0.25)',
              borderRadius: '40px',
              padding: '5px 12px',
              cursor: 'pointer',
              fontWeight: active ? 600 : 400,
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = 'rgba(200,146,42,0.04)'
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = '#FFFFFF'
            }}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main panel ────────────────────────────────────────────────

export default function OfferingPanel({ profile, onUpdate, tiers = [], civDomains = [] }) {
  const tierCapacity      = profile?.tier_capacity || []
  const mediumPreference  = profile?.medium_preference || 'both'
  const engagedDomains    = profile?.engaged_civ_domains || []
  const engagedPrinciples = profile?.engaged_principles || []
  const principleWeights  = profile?.engaged_principle_weights || {}

  function toggleTier(slug) {
    const next = tierCapacity.includes(slug)
      ? tierCapacity.filter(s => s !== slug)
      : [...tierCapacity, slug]
    onUpdate({ tier_capacity: next })
  }

  function toggleDomain(slug) {
    const next = engagedDomains.includes(slug)
      ? engagedDomains.filter(s => s !== slug)
      : [...engagedDomains, slug]
    onUpdate({ engaged_civ_domains: next })
  }

  function togglePrinciple(slug) {
    const next = engagedPrinciples.includes(slug)
      ? engagedPrinciples.filter(s => s !== slug)
      : [...engagedPrinciples, slug]
    onUpdate({ engaged_principles: next })
  }

  function changePrincipleWeight(slug, weight) {
    onUpdate({
      engaged_principle_weights: { ...principleWeights, [slug]: weight },
    })
  }

  return (
    <div>
      {/* Free text — count on me */}
      <FreeTextField
        label="Count on me for"
        hint="What you bring. Skills, capacity, presence. Plain language."
        value={profile?.count_on_me_for}
        placeholder="Writing strategy. Mediation. A van and a Saturday morning."
        onSave={value => onUpdate({ count_on_me_for: value })}
      />

      {/* Free text — don't count on me */}
      <FreeTextField
        label="Don't count on me for"
        hint="The honest no. What's outside your capacity right now. As specific as you can stand."
        value={profile?.dont_count_on_me_for}
        placeholder="Anything before 9am. Solo writing projects."
        onSave={value => onUpdate({ dont_count_on_me_for: value })}
      />

      {/* Tier capacity */}
      <div style={{ marginBottom: '28px' }}>
        <Eyebrow>Tier capacity</Eyebrow>
        <Hint>The tiers you have realistic capacity for right now. Pick as many as honestly apply.</Hint>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '8px',
        }}>
          {tiers.map(t => (
            <TierChip
              key={t.slug}
              slug={t.slug}
              label={t.label}
              description={t.description}
              active={tierCapacity.includes(t.slug)}
              onClick={() => toggleTier(t.slug)}
              showDescription
            />
          ))}
        </div>
      </div>

      {/* Medium preference */}
      <div style={{ marginBottom: '28px' }}>
        <Eyebrow>Medium preference</Eyebrow>
        <Hint>The platform biases toward in-person work. Tell us your real preference.</Hint>
        <MediumRadio
          value={mediumPreference}
          onChange={v => onUpdate({ medium_preference: v })}
        />
      </div>

      {/* Engaged civ domains */}
      <div style={{ marginBottom: '28px' }}>
        <Eyebrow>Civilisational domains you engage</Eyebrow>
        <Hint>The territories where your contribution lives. Select any number.</Hint>
        <DomainChips
          domains={civDomains}
          selected={engagedDomains}
          onToggle={toggleDomain}
        />
      </div>

      {/* Engaged principles with weight */}
      <div style={{ marginBottom: '28px' }}>
        <Eyebrow>Platform principles you align with</Eyebrow>
        <Hint>Click a principle's name on its badge to read the canonical definition. Set weight if you want to signal which principles run primary in your work.</Hint>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PRINCIPLES_ORDERED.map(p => (
            <PrincipleRow
              key={p.slug}
              principle={p}
              selected={engagedPrinciples.includes(p.slug)}
              weight={principleWeights[p.slug]}
              onToggle={() => togglePrinciple(p.slug)}
              onWeightChange={(w) => changePrincipleWeight(p.slug, w)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
