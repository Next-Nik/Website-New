import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

export function TestPaymentPage() {
  const { user, loading } = useAuth()

  if (loading) return <div className="loading" />
  if (!user) return <Navigate to="/login?redirect=/test" replace />

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Webhook Test</span>
        <h1 style={{ ...serif, fontSize: '36px', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>$1 Test Purchase</h1>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '8px' }}>
          Logged in as: {user.email}
        </p>
        <p style={{ ...serif, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '40px' }}>
          After paying, check the Supabase access table for a new row with your user ID and product: map.
        </p>
        <a
          href="https://buy.stripe.com/7sY4gyeSueYJ1z11bgaMU0c"
          target="_blank"
          rel="noopener"
          style={{
            display: 'inline-block', padding: '16px 40px',
            borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)',
            background: '#C8922A', color: '#FFFFFF',
            ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.14em',
            textDecoration: 'none',
          }}
        >
          Pay $1 to test →
        </a>
      </div>
    </div>
  )
}
