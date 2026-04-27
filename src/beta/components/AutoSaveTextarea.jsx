import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// AutoSaveTextarea
//
// Free-text input that auto-saves on blur. Local state is internal; writes
// fire only when the value actually changed since last save. A small,
// dignified status indicator lives next to the field — no banners, no toasts.
//
// Voice: shows what is. "Saved" when saved, "Saving" while saving, nothing
// otherwise. No "Last saved 2 seconds ago" theatre.
//
// Props:
//   value          — current persisted value (required)
//   onSave(next)   — async save function. Throws on failure. Required.
//   placeholder    — optional placeholder
//   maxLength      — optional cap, default 1000
//   rows           — default 3
//   label          — optional, rendered as an eyebrow above
//   helperText     — optional, supporting copy under the field
//   id             — optional html id
//   className      — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

export default function AutoSaveTextarea({
  value: persistedValue = '',
  onSave,
  placeholder = '',
  maxLength = 1000,
  rows = 3,
  label,
  helperText,
  id,
  className,
}) {
  const [draft, setDraft] = useState(persistedValue || '')
  const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [errorMsg, setErrorMsg] = useState(null)
  const lastSavedRef = useRef(persistedValue || '')

  // Keep local draft in sync if the persisted value changes externally.
  useEffect(() => {
    setDraft(persistedValue || '')
    lastSavedRef.current = persistedValue || ''
  }, [persistedValue])

  // After 'saved', fade back to idle after a short beat.
  useEffect(() => {
    if (status !== 'saved') return
    const t = setTimeout(() => setStatus('idle'), 1600)
    return () => clearTimeout(t)
  }, [status])

  async function handleBlur() {
    const next = draft
    if (next === lastSavedRef.current) return
    setStatus('saving')
    setErrorMsg(null)
    try {
      await onSave(next)
      lastSavedRef.current = next
      setStatus('saved')
    } catch (err) {
      setErrorMsg(err?.message || 'Could not save. Try again.')
      setStatus('error')
    }
  }

  return (
    <div className={className} style={{ width: '100%' }}>
      {(label || status !== 'idle') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '6px',
          }}
        >
          {label ? (
            <label
              htmlFor={id}
              style={{
                ...sc,
                fontSize: '13px',
                letterSpacing: '0.08em',
                color: '#A8721A',
                fontWeight: 600,
              }}
            >
              {label}
            </label>
          ) : (
            <span />
          )}
          <StatusIndicator status={status} />
        </div>
      )}
      <textarea
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        style={{
          ...body,
          width: '100%',
          fontSize: '17px',
          lineHeight: 1.55,
          color: '#0F1523',
          background: '#FFFFFF',
          padding: '12px 14px',
          border: '1px solid rgba(200, 146, 42, 0.30)',
          borderRadius: '14px',
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 120ms ease',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#A8721A')}
        onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(200, 146, 42, 0.30)')}
      />
      {helperText && status !== 'error' && (
        <p
          style={{
            ...body,
            margin: '6px 0 0',
            fontSize: '14px',
            lineHeight: 1.45,
            color: 'rgba(15, 21, 35, 0.55)',
          }}
        >
          {helperText}
        </p>
      )}
      {status === 'error' && (
        <p
          style={{
            ...body,
            margin: '6px 0 0',
            fontSize: '14px',
            lineHeight: 1.45,
            color: 'rgba(138, 48, 48, 0.85)',
          }}
        >
          {errorMsg}
        </p>
      )}
    </div>
  )
}

function StatusIndicator({ status }) {
  if (status === 'idle') return null
  let text = ''
  let colour = 'rgba(15, 21, 35, 0.55)'
  if (status === 'saving') {
    text = 'Saving'
  } else if (status === 'saved') {
    text = 'Saved'
    colour = '#A8721A'
  } else if (status === 'error') {
    text = 'Could not save'
    colour = 'rgba(138, 48, 48, 0.85)'
  }
  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        ...sc,
        fontSize: '12px',
        letterSpacing: '0.08em',
        color: colour,
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  )
}
