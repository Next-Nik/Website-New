// ─────────────────────────────────────────────────────────────
// BetaWelcomeSelf — /beta/welcome/self
//
// The Kin intro. Reached from the starter at /beta/welcome via
// the "I'm here for myself" choice.
//
// On completion the overlay sets the nextus.welcomeSeen flag so
// subsequent visits skip the gate and let the visitor through.
//
// Logged-in users landing here are sent on to the dashboard.
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

// Shared localStorage key — read by BetaIntroGate too.
export const WELCOME_SEEN_KEY = 'nextus.welcomeSeen'

export default function BetaWelcomeSelf() {
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

  if (loading || user) return null

  function markSeen() {
    try {
      window.localStorage.setItem(WELCOME_SEEN_KEY, '1')
    } catch {
      // Storage may be blocked; the intro will just show again
      // next time, which is acceptable.
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
