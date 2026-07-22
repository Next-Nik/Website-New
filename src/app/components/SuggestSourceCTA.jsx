import { useState } from 'react'
import { at } from '../../lib/designTokens'

// ─────────────────────────────────────────────────────────────────────────────
// SuggestSourceCTA
//
// Surfaces wherever an indicator is missing data — Tier 2 not yet
// implemented, Tier 3 contributor, or the fetcher is broken. Renders
// a compact "suggest a source" link that expands into a small inline
// form.
//
// Design stance: a missing data point is an invitation, not a failure.
// The CTA is matter-of-fact, not apologetic.
//
// Props:
//   indicatorId  — required, uuid of the catalog row this is for
//   indicatorName — optional, shown in the form heading
//   variant      — 'inline' (default) | 'block' (more vertical room)
//   className    — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }

export default function SuggestSourceCTA({
  indicatorId,
  indicatorName,
  variant = 'inline',
  className,
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const [sourceName, setSourceName] = useState('')
  const [sourceUrl,  setSourceUrl]  = useState('')
  const [notes,      setNotes]      = useState('')
  const [contactEmail, setContactEmail] = useState('')

  if (!indicatorId) return null

  const isBlock = variant === 'block'

  async function handleSubmit(e) {
    e?.preventDefault?.()
    setError(null)
    if (!sourceName.trim() || !sourceUrl.trim()) {
      setError('Source name and URL are both needed.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/source-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicator_id:  indicatorId,
          source_name:   sourceName.trim(),
          source_url:    sourceUrl.trim(),
          notes:         notes.trim() || null,
          contact_email: contactEmail.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not submit. Try again in a moment.')
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      setError('Network error. Try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div
        className={className}
        style={{
          ...body,
          fontSize: '13px',
          color: '#5DBC9D',
          padding: isBlock ? '12px 14px' : '6px 0',
        }}
      >
        Thank you — the suggestion is in the queue.
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        style={{
          ...sc,
          background: 'transparent',
          border: 'none',
          color: at.brass,
          fontSize: '13px',
          letterSpacing: '0.08em',
          fontWeight: 600,
          cursor: 'pointer',
          padding: isBlock ? '8px 0' : '4px 0',
          textDecoration: 'underline',
          textDecorationColor: 'rgba(169,116,63, 0.4)',
          textUnderlineOffset: '3px',
        }}
      >
        Suggest a source →
      </button>
    )
  }

  return (
    <div
      className={className}
      style={{
        marginTop: isBlock ? '12px' : '8px',
        padding: '14px 16px',
        background: at.object,
        border: '1px solid rgba(76,107,69, 0.30)',
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
        <div
          style={{
            ...display,
            fontSize: '17px',
            color: at.text,
            lineHeight: 1.2,
          }}
        >
          {indicatorName ? `Suggest a source for "${indicatorName}"` : 'Suggest a data source'}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{
            background: 'transparent',
            border: 'none',
            color: at.ghost,
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0 0 0 8px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <p
        style={{
          ...body,
          fontSize: '13px',
          color: at.meta,
          margin: '0 0 14px 0',
          lineHeight: 1.5,
        }}
      >
        Know a defensible source for this indicator? Point us at it. The catalog improves through your knowing.
      </p>

      <form onSubmit={handleSubmit}>
        <Field label="Source name" required>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="e.g. WHO Global Health Estimates"
            maxLength={200}
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Source URL" required>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://"
            maxLength={2000}
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything we should know — methodology caveats, cadence, why this source over others"
            maxLength={2000}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: '64px' }}
          />
        </Field>

        <Field label="Email (optional, for follow-up)">
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={200}
            style={inputStyle}
          />
        </Field>

        {error && (
          <p
            style={{
              ...body,
              fontSize: '13px',
              color: 'rgba(138, 48, 48, 0.85)',
              margin: '0 0 10px 0',
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              ...sc,
              background: at.brass,
              color: at.object,
              border: 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '13px',
              letterSpacing: '0.08em',
              fontWeight: 600,
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Sending…' : 'Send suggestion'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              ...sc,
              background: 'transparent',
              color: at.ghost,
              border: 'none',
              padding: '9px 4px',
              fontSize: '13px',
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <label style={{ display: 'block', marginBottom: '12px' }}>
      <div
        style={{
          ...sc,
          fontSize: '13px',
          letterSpacing: '0.08em',
          color: at.meta,
          marginBottom: '4px',
          fontWeight: 600,
        }}
      >
        {label}{required ? ' *' : ''}
      </div>
      {children}
    </label>
  )
}

const inputStyle = {
  fontFamily: "'Lora', Georgia, serif",
  fontSize: '14px',
  width: '100%',
  padding: '8px 10px',
  border: '1px solid rgba(76,107,69, 0.30)',
  borderRadius: '8px',
  background: at.ground,
  color: at.text,
  outline: 'none',
  boxSizing: 'border-box',
}
