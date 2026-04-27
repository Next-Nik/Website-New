// src/beta/components/practices/OutcomeReportForm.jsx
//
// Modal form. Used on the practice detail page to report an outcome from
// having engaged the practice. Writes to practice_outcome_reports.
// Trigger on insert auto-increments practices_beta.outcome_report_count.
//
// Props:
//   practice    — { id, title }
//   supabase    — supabase client
//   user        — current user
//   onClose     — () => void
//   onReported  — (newReport) => void

import { useState } from 'react'

const sc       = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body     = { fontFamily: "'Lora', Georgia, serif" }
const garamond = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

export default function OutcomeReportForm({ practice, supabase, user, onClose, onReported }) {
  const [text, setText]           = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!text.trim()) {
      setError('Tell us what changed.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from('practice_outcome_reports')
      .insert({
        practice_id:      practice.id,
        reporter_user_id: user.id,
        outcome_text:     text.trim(),
      })
      .select()
      .single()

    setSubmitting(false)

    if (insertError) {
      setError('Could not save outcome report. Try again in a moment.')
      return
    }

    onReported?.({
      ...data,
      _anonymous: anonymous,
    })
    onClose?.()
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(15,21,35,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: '#FAFAF7',
          borderRadius: '14px',
          border: '1px solid rgba(200,146,42,0.25)',
          width: 'min(560px, 100%)', maxHeight: '88vh',
          overflowY: 'auto', padding: '32px',
          boxShadow: '0 24px 64px rgba(15,21,35,0.28)',
        }}
      >
        <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
          Outcome
        </span>
        <h2 style={{ ...garamond, fontSize: '26px', fontWeight: 400, color: '#0F1523', margin: '0 0 8px', lineHeight: 1.2 }}>
          {practice.title}
        </h2>
        <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, margin: '0 0 24px' }}>
          Outcome reports are how the platform learns whether a practice held when met by reality.
        </p>

        {/* Outcome text */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: '#A8721A', display: 'block', marginBottom: '6px' }}>
            What changed because of this practice?
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            placeholder=""
            style={{
              ...body, fontSize: '15px', color: '#0F1523',
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: '1px solid rgba(200,146,42,0.30)', background: '#FFFFFF',
              outline: 'none', resize: 'vertical', lineHeight: 1.65,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Anonymity */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={anonymous}
              onChange={e => setAnonymous(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#A8721A', cursor: 'pointer' }}
            />
            <span style={{ ...body, fontSize: '14px', color: '#0F1523' }}>
              Submit anonymously
            </span>
          </label>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.25)', borderRadius: '8px' }}>
            <p style={{ ...body, fontSize: '14px', color: '#8A3030', margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="submit" disabled={submitting}
            style={{
              ...sc, fontSize: '13px', letterSpacing: '0.14em',
              padding: '11px 24px', borderRadius: '40px', border: 'none',
              background: submitting ? 'rgba(200,146,42,0.4)' : '#0F1523',
              color: '#FFFFFF', cursor: submitting ? 'wait' : 'pointer',
              fontWeight: 600,
            }}>
            {submitting ? 'Saving' : 'Submit outcome report'}
          </button>
          <button type="button" onClick={onClose}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', background: 'transparent', border: 'none', padding: '11px 14px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
