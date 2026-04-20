// src/pages/Checkout.jsx
// Authenticated checkout gateway.
//
// Accepts URL params:
//   ?price=price_xxx   — Stripe price ID (required)
//   ?promo=BETATESTER  — promotion code (optional)
//
// Flow:
//   1. Auth check — if not logged in, redirect to /login?redirect=current URL
//   2. Call /api/create-checkout with price, userId, promoCode
//   3. Redirect to Stripe-hosted checkout
//
// Usage (send this to a beta tester):
//   https://nextus.world/checkout?price=price_1TKOqcCWnSAIfnqOXXzytZiC&promo=BETATESTER

import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../constants/routes'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }

// ── Status display ────────────────────────────────────────────────────────────

function StatusCard({ eyebrow, heading, body: bodyText, action }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <img src="/logo_nav.png" alt="NextUs" style={{ width: '44px', height: '44px', objectFit: 'contain', marginBottom: '32px' }} />
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#FFFFFF',
        border: '1.5px solid rgba(200,146,42,0.78)',
        borderRadius: '14px',
        padding: '40px 36px',
        textAlign: 'center',
      }}>
        {eyebrow && (
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>
            {eyebrow}
          </span>
        )}
        <h1 style={{ ...body, fontSize: '26px', fontWeight: 300, color: '#0F1523', marginBottom: '12px', lineHeight: 1.25 }}>
          {heading}
        </h1>
        {bodyText && (
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, marginBottom: action ? '28px' : 0 }}>
            {bodyText}
          </p>
        )}
        {action}
      </div>
    </div>
  )
}

function GoldButton({ href, onClick, children, disabled }) {
  const style = {
    display: 'block',
    width: '100%',
    padding: '14px 0',
    background: disabled ? 'rgba(200,146,42,0.35)' : '#C8922A',
    border: 'none',
    borderRadius: '40px',
    ...sc,
    fontSize: '15px',
    letterSpacing: '0.16em',
    color: '#FFFFFF',
    cursor: disabled ? 'default' : 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
  }
  if (href) return <a href={href} style={style}>{children}</a>
  return <button onClick={onClick} disabled={disabled} style={style}>{children}</button>
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ label }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <img src="/logo_nav.png" alt="NextUs" style={{ width: '44px', height: '44px', objectFit: 'contain', opacity: 0.6 }} />
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)' }}>{label}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CheckoutPage() {
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState('idle') // idle | redirecting | error
  const [errorMsg, setErrorMsg] = useState('')

  const params    = new URLSearchParams(window.location.search)
  const priceId   = params.get('price')
  const promoCode = params.get('promo') ?? undefined
  const ref       = params.get('ref')   ?? undefined

  // ── Auth redirect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const here = window.location.pathname + window.location.search
      window.location.href = `${ROUTES.login}?redirect=${encodeURIComponent(here)}`
    }
  }, [user, authLoading])

  // ── Start checkout once we have user ───────────────────────────────────────
  useEffect(() => {
    if (authLoading || !user || !priceId || status !== 'idle') return
    startCheckout()
  }, [user, authLoading, priceId, status])

  async function startCheckout() {
    setStatus('redirecting')
    try {
      const res = await fetch(ROUTES.api.createCheckout, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId:     user.id,
          promoCode,
          ref,
          successUrl: `${window.location.origin}${ROUTES.dashboard}?checkout=success`,
          cancelUrl:  `${window.location.origin}${ROUTES.pricing}`,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not create checkout session.')
      }

      window.location.href = data.url

    } catch (err) {
      console.error('Checkout error:', err)
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  // ── Missing price ID ────────────────────────────────────────────────────────
  if (!priceId) {
    return (
      <StatusCard
        eyebrow="Checkout"
        heading="This link looks incomplete."
        body="The checkout link is missing a required parameter. Please use the link you were sent, or visit the pricing page."
        action={<GoldButton href={ROUTES.pricing}>View pricing →</GoldButton>}
      />
    )
  }

  // ── Loading auth ────────────────────────────────────────────────────────────
  if (authLoading || !user) {
    return <Spinner label="One moment…" />
  }

  // ── Redirecting to Stripe ───────────────────────────────────────────────────
  if (status === 'idle' || status === 'redirecting') {
    return <Spinner label="Taking you to checkout…" />
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  return (
    <StatusCard
      eyebrow="Checkout"
      heading="Something went wrong."
      body={errorMsg}
      action={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <GoldButton onClick={() => { setStatus('idle'); setErrorMsg('') }}>
            Try again →
          </GoldButton>
          <a href={ROUTES.pricing} style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none', marginTop: '4px' }}>
            Back to pricing
          </a>
        </div>
      }
    />
  )
}
