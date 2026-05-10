// ─────────────────────────────────────────────────────────────
// BetaWelcome — /beta/welcome
//
// Dedicated route for the Kin welcome narrative. Logged-out visitors
// landing on /beta or /beta/dashboard get redirected here by
// BetaIntroGate (with ?return=… so they land on the dashboard after
// sign-in).
//
// On completion the overlay sets a localStorage flag — nextus.welcomeSeen
// — so subsequent visits skip the gate and let the visitor through to
// the dashboard or login as they choose. The intro is a first-impression
// tool, not a wall.
//
// Logged-in users landing here go straight to the dashboard.
//
// Query params:
//   ?return=/path  — passed through to /login as ?redirect=…
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WelcomeOverlay from '../components/welcome/WelcomeOverlay'
import {
  BEATS, HEADERS, ACT3_HEADER,
  KIN_SELF_DATA, KIN_CIV_DATA,
} from '../components/welcome/WelcomeBeats'
import { useAuth } from '../../hooks/useAuth'

// localStorage key. Read both here and by BetaIntroGate so they
// stay in sync.
export const WELCOME_SEEN_KEY = 'nextus.welcomeSeen'

export default function BetaWelcome() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const returnTo = params.get('return') || '/beta/dashboard'

  // Already signed in? Skip the intro and go to the dashboard.
  useEffect(() => {
    if (!loading && user) {
      navigate(returnTo, { replace: true })
    }
  }, [loading, user, returnTo, navigate])

  // Don't render the overlay until we know whether the user is
  // signed in — avoids a flash of the intro for returning visitors.
  if (loading || user) return null

  function markSeen() {
    try {
      window.localStorage.setItem(WELCOME_SEEN_KEY, '1')
    } catch {
      // Storage may be unavailable (private mode, blocked, etc.).
      // The intro will simply show again next visit; not fatal.
    }
  }

  function handleDismiss() {
    markSeen()
    navigate(`/login?redirect=${encodeURIComponent(returnTo)}`)
  }

  return (
    <WelcomeOverlay
      beats={BEATS}
      headers={HEADERS}
      act3Header={ACT3_HEADER}
      selfData={KIN_SELF_DATA}
      civData={KIN_CIV_DATA}
      returnTo={returnTo}
      onDismiss={handleDismiss}
      closingCta="Sign in to begin"
    />
  )
}
