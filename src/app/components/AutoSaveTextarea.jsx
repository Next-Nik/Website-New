import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// AutoSaveTextarea
//
// Free-text input that auto-saves. Three triggers (in order of priority):
//   1. Debounced save during typing (1500ms after last keystroke)
//   2. Save on blur
//   3. beforeunload flush — fires synchronously before tab/window closes
//      if the draft differs from the last saved value
//
// Local state is internal; writes fire only when the value actually changed
// since last save. A small, dignified status indicator lives next to the
// field — no banners, no toasts.
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
//   debounceMs     — typing debounce window, default 1500
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
  debounceMs = 1500,
}) {
  const [draft, setDraft] = useState(persistedValue || '')
  const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [errorMsg, setErrorMsg] = useState(null)
  const lastSavedRef = useRef(persistedValue || '')
  const draftRef     = useRef(persistedValue || '')
  const onSaveRef    = useRef(onSave)
  const debounceRef  = useRef(null)
  const savingRef    = useRef(false)

  // Keep refs in sync with latest values so the unload listener and
  // debounce timer always see fresh state without re-binding.
  useEffect(() => { onSaveRef.current = onSave }, [onSave])
  useEffect(() => { draftRef.current = draft }, [draft])

  // Keep local draft in sync if the persisted value changes externally.
  useEffect(() => {
    setDraft(persistedValue || '')
    lastSavedRef.current = persistedValue || ''
    draftRef.current     = persistedValue || ''
  }, [persistedValue])

  // After 'saved', fade back to idle after a short beat.
  useEffect(() => {
    if (status !== 'saved') return
    const t = setTimeout(() => setStatus('idle'), 1600)
    return () => clearTimeout(t)
  }, [status])

  // ── Core save routine ──────────────────────────────────────────────────────
  // Runs whether triggered by debounce, blur, or beforeunload. Reentrant-safe:
  // if a save is already in flight, the next trigger is skipped (the latest
  // value will still be picked up by the next typing or blur event).
  async function commit(next) {
    if (next === lastSavedRef.current) return
    if (savingRef.current) return
    savingRef.current = true
    setStatus('saving')
    setErrorMsg(null)
    try {
      await onSaveRef.current(next)
      lastSavedRef.current = next
      setStatus('saved')
    } catch (err) {
      setErrorMsg(err?.message || 'Could not save. Try again.')
      setStatus('error')
    } finally {
      savingRef.current = false
    }
  }

  function scheduleDebouncedSave(next) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      commit(draftRef.current)
    }, debounceMs)
  }

  function handleChange(e) {
    const next = e.target.value
    setDraft(next)
    draftRef.current = next
    scheduleDebouncedSave(next)
  }

  async function handleBlur() {
    // Cancel any pending debounce — blur takes precedence and fires now.
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    await commit(draftRef.current)
  }

  // ── beforeunload flush ─────────────────────────────────────────────────────
  // Best-effort: if the draft has unsaved changes when the tab is closing,
  // fire the save synchronously. The save itself is async; the browser may
  // not wait for it to complete, but in practice this catches the common
  // case (user typing → close tab without blurring) on the network round-trip
  // that's already in flight before the page tears down.
  useEffect(() => {
    function handleBeforeUnload() {
      if (draftRef.current !== lastSavedRef.current) {
        // Fire-and-forget — we can't await here.
        try { onSaveRef.current(draftRef.current) } catch {}
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

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
                color: '#262420',
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
        onChange={handleChange}
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
          border: '1px solid rgba(76,107,69, 0.30)',
          borderRadius: '14px',
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 120ms ease',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#262420')}
        onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(76,107,69, 0.30)')}
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
    colour = '#262420'
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
        fontSize: '13px',
        letterSpacing: '0.08em',
        color: colour,
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  )
}
