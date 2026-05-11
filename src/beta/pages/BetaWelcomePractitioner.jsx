// ─────────────────────────────────────────────────────────────
// BetaWelcomePractitioner — /beta/welcome/practitioner
//
// The practitioner intro. Reached from the starter at /beta/welcome
// via the "I offer work others might want" choice.
//
// Default returnTo lands the visitor on the dashboard with the
// practice scope pre-armed (?scope=practice). On arrival, Mission
// Control merges 'practice' into the user's mission_control_scopes
// (preserving anything already there) and activates the My Practice
// surface — which is itself the setup flow until the required fields
// are filled.
//
// The pre-auth case still walks through /login (with this returnTo
// passed as ?redirect=), so the scope handoff fires regardless of
// whether the visitor signs in fresh or was already logged in.
//
// BetaWelcomeNext is retained as a not-yet-authed fallback for
// visitors who arrive without going through the welcome route.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WelcomeOverlay from '../components/welcome/WelcomeOverlay'
import {
  BEATS, HEADERS, ACT3_HEADER,
  ASHA_SELF_DATA, ASHA_CIV_DATA,
} from '../components/welcome/PractitionerWelcomeBeats'
import { useAuth } from '../../hooks/useAuth'
import { WELCOME_SEEN_KEY } from './BetaWelcomeSelf'

export default function BetaWelcomePractitioner() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const returnTo = params.get('return') || '/beta/dashboard?scope=practice'

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
      // Storage unavailable; not fatal.
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
      selfData={ASHA_SELF_DATA}
      civData={ASHA_CIV_DATA}
      returnTo={returnTo}
      onDismiss={handleDismiss}
      closingCta="Bring your work in →"
    />
  )
}
