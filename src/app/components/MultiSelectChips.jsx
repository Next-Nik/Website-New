import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// MultiSelectChips
//
// Chip-style multi-select. Edits are local until the user presses Save. This
// is deliberate — multi-step entries should not fire a write per click. Loose
// equivalence with the brief: free-text auto-saves; multi-input bundles use
// an explicit save button.
//
// Voice: section title and helper sit above. The Save button is below right.
// Disabled until something has changed. After save it disappears until the
// next change.
//
// Props:
//   options            — [{ value, label, description? }] (required)
//   value              — array of currently selected values (required)
//   onSave(nextValues) — async save. Required.
//   label              — section eyebrow (optional)
//   helperText         — short helper string (optional)
//   maxSelections      — optional cap on selections
//   columns            — render hint, integer 1-3, default 'auto'
//   className          — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

function arraysEqual(a = [], b = []) {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  for (const v of b) if (!setA.has(v)) return false
  return true
}

export default function MultiSelectChips({
  options = [],
  value = [],
  onSave,
  label,
  helperText,
  maxSelections,
  columns = 'auto',
  className,
}) {
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (!savedFlash) return
    const t = setTimeout(() => setSavedFlash(false), 1600)
    return () => clearTimeout(t)
  }, [savedFlash])

  const dirty = !arraysEqual(draft, value)
  const atCap = typeof maxSelections === 'number' && draft.length >= maxSelections

  function toggle(val) {
    setErrorMsg(null)
    setDraft((prev) => {
      const has = prev.includes(val)
      if (has) return prev.filter((v) => v !== val)
      if (atCap) return prev
      return [...prev, val]
    })
  }

  async function handleSave() {
    if (!dirty || saving) return
    setSaving(true)
    setErrorMsg(null)
    try {
      await onSave(draft)
      setSavedFlash(true)
    } catch (err) {
      setErrorMsg(err?.message || 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setDraft(value)
    setErrorMsg(null)
  }

  return (
    <div className={className}>
      {label && (
        <span
          style={{
            ...sc,
            display: 'block',
            fontSize: '13px',
            letterSpacing: '0.08em',
            color: '#A8721A',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          {label}
        </span>
      )}
      {helperText && (
        <p
          style={{
            ...body,
            margin: '0 0 14px',
            fontSize: '15px',
            lineHeight: 1.55,
            color: 'rgba(15, 21, 35, 0.72)',
          }}
        >
          {helperText}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        {options.map((opt) => {
          const selected = draft.includes(opt.value)
          const disabled = !selected && atCap
          return (
            <button
              key={opt.value}
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-disabled={disabled || undefined}
              onClick={() => !disabled && toggle(opt.value)}
              title={opt.description || ''}
              style={{
                ...sc,
                padding: '8px 14px',
                fontSize: '14px',
                letterSpacing: '0.04em',
                fontWeight: selected ? 600 : 400,
                color: selected ? '#A8721A' : 'rgba(15, 21, 35, 0.72)',
                background: selected
                  ? 'rgba(200, 146, 42, 0.08)'
                  : 'transparent',
                border:
                  '1px solid ' +
                  (selected
                    ? 'rgba(200, 146, 42, 0.45)'
                    : 'rgba(200, 146, 42, 0.20)'),
                borderRadius: '40px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                lineHeight: 1.2,
                transition: 'background 120ms ease, border-color 120ms ease',
              }}
              onMouseEnter={(e) => {
                if (disabled || selected) return
                e.currentTarget.style.background = 'rgba(200, 146, 42, 0.05)'
              }}
              onMouseLeave={(e) => {
                if (disabled || selected) return
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            ...sc,
            fontSize: '12px',
            letterSpacing: '0.06em',
            color: 'rgba(15, 21, 35, 0.55)',
          }}
        >
          {typeof maxSelections === 'number'
            ? `${draft.length} of ${maxSelections} selected`
            : `${draft.length} selected`}
          {savedFlash ? '  ·  Saved' : ''}
          {errorMsg ? `  ·  ${errorMsg}` : ''}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {dirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              style={{
                ...sc,
                background: 'transparent',
                border: 'none',
                color: 'rgba(15, 21, 35, 0.55)',
                fontSize: '13px',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                padding: '6px 10px',
              }}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            style={{
              ...sc,
              background: !dirty || saving ? 'rgba(200, 146, 42, 0.20)' : '#0F1523',
              color: !dirty || saving ? 'rgba(255, 255, 255, 0.7)' : '#FFFFFF',
              border: 'none',
              borderRadius: '40px',
              padding: '8px 18px',
              fontSize: '14px',
              letterSpacing: '0.04em',
              fontWeight: 600,
              cursor: !dirty || saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving' : 'Save selections'}
          </button>
        </div>
      </div>
    </div>
  )
}
