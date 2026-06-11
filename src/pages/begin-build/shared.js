// src/pages/begin-build/shared.js
//
// Shared primitives for /begin/build/{org,practice,group}.
//
// Three pages, one shape. They differ in:
//   - the recognition sub line
//   - the three "what's on the other side" beats
//   - the form field set (small variations)
//   - the submit handler (writes vs. pass-through)
//
// Everything else — the eyebrow pattern, the shared opener, the shared closer,
// the page shell, the form primitives, the typography — lives here.

import { useState } from 'react'

// ── Brand ─────────────────────────────────────────────────────────
export const BODY  = { fontFamily: "'Lora', Georgia, serif" }
export const SC    = { fontFamily: "'Cormorant SC', Georgia, serif" }
export const SERIF = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
export const GOLD  = '#A8721A'
export const DARK  = '#0F1523'
export const PARCH = '#FAFAF7'

// ── Shared copy (identical across all three pages) ────────────────
export const SHARED_OPENER = `You came in through "a future worth building." Most people who arrive there are looking for a way in. You arrived with something already in your hands.`

export const SHARED_CLOSER = `This is early. The room is being built as you walk in. Come in anyway.`

// ── Form primitives ───────────────────────────────────────────────
// Same primitives as Nominate — keep these in sync if that page evolves.

export function Label({ children, required }) {
  return (
    <label style={{ ...SC, fontSize: '12px', letterSpacing: '0.16em', color: GOLD, display: 'block', marginBottom: '6px' }}>
      {children}{required && <span style={{ color: '#8A3030', marginLeft: '4px' }}>*</span>}
    </label>
  )
}

export function Hint({ children }) {
  return <p style={{ ...BODY, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '5px', lineHeight: 1.5 }}>{children}</p>
}

export function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...BODY, fontSize: '15px', color: DARK, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }}
    />
  )
}

export function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...BODY, fontSize: '15px', color: DARK, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.65 }}
    />
  )
}

export function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ ...BODY, fontSize: '15px', color: DARK, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function Field({ children, style }) {
  return <div style={{ marginBottom: '24px', ...style }}>{children}</div>
}

// ── Multi-link input (website + social/podcast links) ────────────
// Stored as a string array. One row per link. "Add another" appends an empty row.
// Empty rows are filtered out at submit time.

export function LinkList({ value, onChange }) {
  const list = value.length === 0 ? [''] : value

  function update(i, v) {
    const next = [...list]
    next[i] = v
    onChange(next)
  }
  function add() {
    onChange([...list, ''])
  }
  function remove(i) {
    const next = list.filter((_, idx) => idx !== i)
    onChange(next.length === 0 ? [''] : next)
  }

  return (
    <div>
      {list.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="url"
            value={v}
            onChange={e => update(i, e.target.value)}
            placeholder="https://..."
            style={{ ...BODY, fontSize: '15px', color: DARK, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', flex: 1 }}
          />
          {list.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              style={{ ...SC, fontSize: '12px', letterSpacing: '0.10em', padding: '0 14px', borderRadius: '8px', border: '1px solid rgba(15,21,35,0.20)', background: 'transparent', color: 'rgba(15,21,35,0.55)', cursor: 'pointer' }}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        style={{ ...SC, fontSize: '12px', letterSpacing: '0.14em', padding: '8px 16px', borderRadius: '40px', border: '1px solid rgba(200,146,42,0.30)', background: 'rgba(200,146,42,0.04)', color: GOLD, cursor: 'pointer', marginTop: '4px' }}
      >
        + Add another link
      </button>
    </div>
  )
}

// ── Page chrome ───────────────────────────────────────────────────

export function PageShell({ children }) {
  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .begin-main { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>
      <div style={{ background: PARCH, minHeight: '100dvh' }}>
        <div className="begin-main" style={{ maxWidth: '640px', margin: '0 auto', padding: '80px 40px 120px' }}>
          {children}
        </div>
      </div>
    </>
  )
}

export function PageHeader({ eyebrow, title, opener, sub }) {
  return (
    <header style={{ marginBottom: '48px' }}>
      <span style={{ ...SC, fontSize: '11px', letterSpacing: '0.22em', color: GOLD, textTransform: 'uppercase', display: 'block', marginBottom: '14px' }}>
        {eyebrow}
      </span>
      <h1 style={{ ...SERIF, fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 300, color: DARK, lineHeight: 1.12, margin: '0 0 24px' }}>
        {title}
      </h1>
      <p style={{ ...SERIF, fontSize: '20px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.55, margin: '0 0 20px', borderLeft: `2px solid ${GOLD}`, paddingLeft: '18px' }}>
        {opener}
      </p>
      <p style={{ ...BODY, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.7, margin: 0 }}>
        {sub}
      </p>
    </header>
  )
}

export function Beats({ items }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ ...SC, fontSize: '11px', letterSpacing: '0.20em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '20px' }}>
        What's on the other side
      </div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((text, i) => (
          <li key={i} style={{ display: 'flex', gap: '14px', marginBottom: '16px', alignItems: 'flex-start' }}>
            <span style={{ ...SERIF, fontSize: '20px', fontWeight: 300, color: GOLD, flexShrink: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <p style={{ ...BODY, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.80)', lineHeight: 1.7, margin: 0 }}>
              {text}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function PreFormLine({ children }) {
  return (
    <p style={{ ...BODY, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, margin: '0 0 32px', paddingTop: '24px', borderTop: '1px solid rgba(200,146,42,0.20)' }}>
      {children}
    </p>
  )
}

export function CloserAndSubmit({ saving, error, submitLabel, onSubmit }) {
  return (
    <>
      <p style={{ ...SERIF, fontSize: '18px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: '32px 0 24px', borderLeft: `2px solid ${GOLD}`, paddingLeft: '18px' }}>
        {SHARED_CLOSER}
      </p>

      {error && (
        <div style={{ background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.25)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
          <p style={{ ...BODY, fontSize: '14px', color: '#8A3030', margin: 0 }}>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        onClick={onSubmit}
        style={{
          ...SC, fontSize: '14px', letterSpacing: '0.16em',
          padding: '14px 32px', borderRadius: '40px', border: 'none',
          background: saving ? 'rgba(200,146,42,0.35)' : '#C8922A',
          color: '#FFFFFF', cursor: saving ? 'not-allowed' : 'pointer',
          display: 'block', width: '100%', marginTop: '8px',
        }}
      >
        {saving ? 'Submitting…' : submitLabel}
      </button>
    </>
  )
}

// ── Universal field initial state ─────────────────────────────────
// Every page uses these. Page-specific extensions are merged on top.

export const COMMON_EMPTY = {
  your_name:        '',
  your_email:       '',
  what_they_do:     '',
  where:            '',
  scale:            '',
  who_it_impacts:   '',
  scale_of_impact:  '',
  accomplish:       '',
  need_or_offering: '',
  website:          '',
  links:            [''],   // multi-link list
}

export const SCALE_OPTIONS = [
  { value: '',              label: '— Select scale —' },
  { value: 'local',         label: 'Local' },
  { value: 'municipal',     label: 'Municipal' },
  { value: 'regional',      label: 'Regional' },
  { value: 'national',      label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global',        label: 'Global' },
]

// Filters empty strings out of a links array.
export function cleanLinks(links) {
  return (links || []).map(s => s.trim()).filter(Boolean)
}
