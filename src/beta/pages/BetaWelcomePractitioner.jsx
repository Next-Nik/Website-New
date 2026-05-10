// ─────────────────────────────────────────────────────────────
// BetaWelcomePractitioner — /beta/welcome/practitioner
//
// The practitioner intro. Reached from the starter at /beta/welcome
// via the "I offer work others might want" choice.
//
// Same engine, different protagonist, different closing path. The
// practitioner onboarding flow doesn't exist yet; this lands at a
// placeholder for now, replaced when Phase 2 ships.
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
  const returnTo = params.get('return') || '/beta/welcome/practitioner-next'

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
    navigate(returnTo)
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
