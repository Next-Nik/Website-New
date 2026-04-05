import { useAuth } from '../hooks/useAuth'
import { useAccess, hasAccess } from '../hooks/useAccess'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

/**
 * AccessGate
 *
 * Props:
 *   productKey   string   — e.g. 'foundation', 'map'
 *   toolName     string   — display name shown in the gate
 *   previewTier  node     — optional: JSX to render for preview/lite tier
 *                           if omitted, preview is treated same as none
 *   children     node     — full tool content (rendered when access granted)
 *
 * States handled:
 *   loading          → spinner
 *   banned/suspended → blocked message
 *   not signed in    → sign-in prompt
 *   none             → paywall stub (copy to be filled when pricing confirmed)
 *   preview          → previewTier content if provided, else paywall
 *   beta / full      → children
 */
export function AccessGate({ productKey, toolName, previewTier, children }) {
  const { user, loading: authLoading } = useAuth()
  const { tier, discountPct, loading }  = useAccess(productKey)

  // Loading state
  if (authLoading || loading) {
    return <div className="loading" />
  }

  // Not signed in
  if (!user) {
    return <GateCard toolName={toolName} variant="auth" />
  }

  // Banned
  if (tier === 'banned') {
    return <GateCard toolName={toolName} variant="banned" />
  }

  // Suspended
  if (tier === 'suspended') {
    return <GateCard toolName={toolName} variant="suspended" />
  }

  // Preview tier — render lite content if provided
  if (tier === 'preview' && previewTier) {
    return previewTier
  }

  // Full / beta access
  if (tier === 'full' || tier === 'beta') {
    return children
  }

  // No access — show paywall
  return <GateCard toolName={toolName} variant="paywall" discountPct={discountPct} />
}


function GateCard({ toolName, variant, discountPct = 0 }) {
  const messages = {
    auth: {
      eyebrow: toolName,
      heading: 'Sign in to begin.',
      body: 'Your results are saved to your profile.',
      cta: 'Sign in or create account →',
      ctaHref: `/login?redirect=${encodeURIComponent(window.location.href)}`,
    },
    paywall: {
      eyebrow: toolName,
      heading: 'Get access.',
      body: discountPct > 0
        ? `You have a ${discountPct}% discount available.`
        : 'This tool is part of the Life OS suite.',
      cta: 'See pricing →',
      ctaHref: '/pricing',
    },
    banned: {
      eyebrow: 'Access restricted',
      heading: 'Your account has been suspended.',
      body: 'If you believe this is an error, contact us.',
      cta: null,
    },
    suspended: {
      eyebrow: 'Account paused',
      heading: 'Your account is temporarily paused.',
      body: 'Please reach out if you have questions.',
      cta: null,
    },
  }

  const m = messages[variant]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(15,21,35,0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid rgba(200,146,42,0.78)',
        borderRadius: '14px',
        padding: '36px 32px',
        maxWidth: '380px', width: '100%',
        textAlign: 'center',
      }}>
        <span style={{
          ...sc, fontSize: '15px', letterSpacing: '0.2em',
          color: '#A8721A', display: 'block', marginBottom: '14px',
          textTransform: 'uppercase',
        }}>
          {m.eyebrow}
        </span>
        <h2 style={{
          ...serif, fontSize: '24px', fontWeight: 300,
          color: '#0F1523', marginBottom: '10px', lineHeight: 1.2,
        }}>
          {m.heading}
        </h2>
        <p style={{
          ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
          lineHeight: 1.6, marginBottom: m.cta ? '28px' : 0,
        }}>
          {m.body}
        </p>
        {m.cta && (
          <a href={m.ctaHref} style={{
            display: 'inline-block',
            padding: '14px 28px',
            borderRadius: '40px',
            border: '1px solid rgba(168,114,26,0.8)',
            background: '#C8922A',
            ...sc, fontSize: '14px', fontWeight: 600,
            letterSpacing: '0.14em', color: '#FFFFFF',
            textDecoration: 'none',
          }}>
            {m.cta}
          </a>
        )}
      </div>
    </div>
  )
}
