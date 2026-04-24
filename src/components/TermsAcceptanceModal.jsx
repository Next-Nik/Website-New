import { useEffect, useState } from 'react'
import { TermsContent } from '../pages/Legal'
import { useTermsAcceptance } from '../hooks/useTermsAcceptance'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }

export function TermsAcceptanceModal() {
  const { accepted, checked, user, accept, accepting } = useTermsAcceptance()
  const [agreed, setAgreed] = useState(false)

  // Prevent escape key from closing modal
  useEffect(() => {
    const shouldShow = checked && user && accepted === false
    if (!shouldShow) return

    const onKey = (e) => {
      if (e.key === 'Escape') e.preventDefault()
    }
    document.addEventListener('keydown', onKey)

    // Lock body scroll
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [checked, user, accepted])

  // Don't render if not signed in, still checking, or already accepted
  if (!checked || !user || accepted !== false) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(15, 21, 35, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      // No click-outside dismissal — onClick handler intentionally absent
    >
      <div style={{
        background: '#FAFAF7',
        borderRadius: '14px',
        maxWidth: '720px',
        width: '100%',
        maxHeight: 'calc(100vh - 48px)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(15, 21, 35, 0.30)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '36px 40px 20px', borderBottom: '1px solid rgba(200,146,42,0.15)' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>
            Before you continue
          </span>
          <h2 style={{ ...body, fontSize: 'clamp(24px,3vw,32px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.15, margin: '0 0 12px' }}>
            Please review our Terms of Service.
          </h2>
          <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, margin: 0 }}>
            Take a moment to read through them. You'll only need to do this once.
          </p>
        </div>

        {/* Scrollable terms content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 40px',
          background: '#FFFFFF',
        }}>
          <TermsContent />
        </div>

        {/* Footer with checkbox + button */}
        <div style={{ padding: '24px 40px 32px', borderTop: '1px solid rgba(200,146,42,0.15)', background: '#FAFAF7' }}>

          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            cursor: 'pointer', marginBottom: '20px',
          }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{
                marginTop: '4px',
                width: '18px', height: '18px',
                accentColor: '#A8721A',
                cursor: 'pointer',
              }}
            />
            <span style={{ ...body, fontSize: '15px', color: '#0F1523', lineHeight: 1.55 }}>
              I have read and agree to the Terms of Service.
            </span>
          </label>

          <button
            onClick={accept}
            disabled={!agreed || accepting}
            style={{
              ...sc,
              fontSize: '14px',
              letterSpacing: '0.16em',
              padding: '14px 32px',
              borderRadius: '40px',
              border: 'none',
              background: !agreed || accepting ? 'rgba(200,146,42,0.30)' : '#C8922A',
              color: '#FFFFFF',
              cursor: !agreed || accepting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              width: '100%',
              maxWidth: '320px',
            }}
          >
            {accepting ? 'Saving...' : 'Agree and continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
