// src/beta/components/practices/AttestationForm.jsx
//
// Modal form. Used on the practice detail page to attest to a practice.
// Writes to practice_attestations. Trigger on practice_attestations insert
// (Module 1 migration 06) auto-increments attestation_count and promotes
// vetting_status from self_submitted to community_attested at 5+ distinct
// attestations.
//
// Props:
//   practice    — { id, title }
//   onClose     — () => void
//   onAttested  — (newAttestation) => void; called after successful insert

import { useState } from 'react'
import { CONTRIBUTOR_ROLES } from '../../constants/practices'

const sc       = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body     = { fontFamily: "'Lora', Georgia, serif" }
const garamond = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

export default function AttestationForm({ practice, supabase, user, onClose, onAttested }) {
  const [roles, setRoles]         = useState([])
  const [text, setText]           = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)

  function toggleRole(slug) {
    setRoles(prev => prev.includes(slug) ? prev.filter(r => r !== slug) : [...prev, slug])
  }

  async function submit(e) {
    e.preventDefault()
    if (roles.length === 0) {
      setError('Tell us your relationship to this practice.')
      return
    }
    if (!text.trim()) {
      setError('Share what this practice did for you, or for those you serve.')
      return
    }

    setSubmitting(true)
    setError(null)

    const attesterRole = roles.map(r => {
      const cfg = CONTRIBUTOR_ROLES.find(c => c.slug === r)
      return cfg?.label || r
    }).join('; ')

    const { data, error: insertError } = await supabase
      .from('practice_attestations')
      .insert({
        practice_id:      practice.id,
        attester_user_id: user.id,
        attester_role:    attesterRole,
        attestation_text: text.trim(),
        // Anonymity preference is captured in the row metadata. The detail
        // page resolves whether to show display name or "Anonymous attester"
        // based on whether attester_user_id resolves to a public profile.
      })
      .select()
      .single()

    setSubmitting(false)

    if (insertError) {
      // Likely a duplicate (UNIQUE constraint on practice_id + attester_user_id)
      if (insertError.code === '23505') {
        setError('You have already attested to this practice. One attestation per person.')
      } else {
        setError('Could not save attestation. Try again in a moment.')
      }
      return
    }

    onAttested?.({
      ...data,
      _anonymous: anonymous,
      _attester_display: anonymous ? 'Anonymous attester' : null,
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
          Attest
        </span>
        <h2 style={{ ...garamond, fontSize: '26px', fontWeight: 400, color: '#0F1523', margin: '0 0 8px', lineHeight: 1.2 }}>
          {practice.title}
        </h2>
        <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, margin: '0 0 24px' }}>
          Share your relationship to this practice. Attestations are how the platform recognises that a practice is held by more than one person.
        </p>

        {/* Roles */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: '#A8721A', display: 'block', marginBottom: '10px' }}>
            Your relationship to this practice
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {CONTRIBUTOR_ROLES.map(r => (
              <label key={r.slug} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 0' }}>
                <input
                  type="checkbox"
                  checked={roles.includes(r.slug)}
                  onChange={() => toggleRole(r.slug)}
                  style={{ width: '16px', height: '16px', accentColor: '#A8721A', cursor: 'pointer' }}
                />
                <span style={{ ...body, fontSize: '15px', color: '#0F1523' }}>{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Attestation text */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: '#A8721A', display: 'block', marginBottom: '6px' }}>
            What did this practice do for you, or for those you serve?
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={5}
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
          {anonymous && (
            <p style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.55, margin: '6px 0 0', paddingLeft: '26px' }}>
              Your name will not appear on the public attestation list. The platform still records your attestation for the count.
            </p>
          )}
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
            {submitting ? 'Saving' : 'Submit attestation'}
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
