import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

// The $1 test price ID — mapped to product: 'map' in PRICE_MAP
const TEST_PRICE_ID = 'price_1TKSkxCWnSAIfnqOzwgzuOh0'

export function TestPaymentPage() {
  const { user, loading } = useAuth()
  const [checking, setChecking] = useState(false)
  const [error, setError]       = useState(null)

  async function handlePay() {
    // Require login at the point of purchase — not to view the page
    if (!user) {
      try { localStorage.setItem('auth_redirect', '/test') } catch {}
      window.location.href = '/login?redirect=/test'
      return
    }
    setChecking(true)
    setError(null)
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId:    TEST_PRICE_ID,
          userId:     user.id,
          successUrl: `${window.location.origin}/test?success=true`,
          cancelUrl:  `${window.location.origin}/test`,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to create checkout session.')
      }
    } catch (err) {
      setError('Something went wrong. Try again.')
    } finally {
      setChecking(false)
    }
  }

  const success = new URLSearchParams(window.location.search).get('success')

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Webhook Test</span>

        {success ? (
          <>
            <h1 style={{ ...body, fontSize: '36px', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>Payment received.</h1>
            <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '8px' }}>
              Logged in as: {user?.email}
            </p>
            <p style={{ ...body, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', lineHeight: 1.7 }}>
              Check the Supabase <strong>access</strong> table for a new row with your user ID and product: <strong>map</strong>.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ ...body, fontSize: '36px', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>$1 Test Purchase</h1>
            {user && (
              <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '8px' }}>
                Logged in as: {user?.email}
              </p>
            )}
            <p style={{ ...body, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '40px' }}>
              After paying, check the Supabase <strong>access</strong> table for a new row with your user ID and product: <strong>map</strong>.
            </p>
            {error && (
              <p style={{ ...body, fontSize: '15px', color: '#8A3030', marginBottom: '16px' }}>{error}</p>
            )}
            <button
              onClick={handlePay}
              disabled={checking}
              style={{
                display: 'inline-block', padding: '16px 40px',
                borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)',
                background: checking ? 'rgba(200,146,42,0.5)' : '#C8922A',
                color: '#FFFFFF', cursor: checking ? 'default' : 'pointer',
                ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.14em',
              }}
            >
              {checking ? 'Redirecting...' : user ? 'Pay $1 to test →' : 'Sign in to pay →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
