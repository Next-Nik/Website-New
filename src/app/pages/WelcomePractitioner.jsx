// ─────────────────────────────────────────────────────────────
// WelcomePractitioner — /welcome/practitioner
//
// The practitioner narrative (Asha). Handles both pre-auth direct
// visits and post-signup routing from RootRoute (when the user
// chose the 'practitioner' path on the wrapper or via WelcomeStart).
//
// returnTo carries ?scope=practice so Mission Control activates
// the practice surface and merges 'practice' into the user's
// scopes on arrival.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WelcomeOverlay from '../components/welcome/WelcomeOverlay'
import {
  BEATS, HEADERS, ACT3_HEADER,
  ASHA_SELF_DATA, ASHA_CIV_DATA,
} from '../components/welcome/PractitionerWelcomeBeats'
import { useAuth } from '../../hooks/useAuth'
import { WELCOME_SEEN_KEY } from './WelcomeSelf'

function getSeen() {
  try { return window.localStorage.getItem(WELCOME_SEEN_KEY) === '1' }
  catch { return false }
}

function markSeen() {
  try { window.localStorage.setItem(WELCOME_SEEN_KEY, '1') }
  catch {}
}

export default function WelcomePractitioner() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const returnTo = params.get('return') || '/?scope=practice'

  useEffect(() => {
    if (loading) return
    if (user && getSeen()) {
      navigate(returnTo, { replace: true })
    }
  }, [loading, user, returnTo, navigate])

  if (loading) return null
  if (user && getSeen()) return null

  function handleDismiss() {
    markSeen()
    if (user) {
      navigate(returnTo, { replace: true })
    } else {
      navigate(`/login?redirect=${encodeURIComponent(returnTo)}`)
    }
  }

  return (
    <WelcomeOverlay
      beats={BEATS}
      headers={HEADERS}
      act3Header={ASHA_SELF_DATA ? ACT3_HEADER : ACT3_HEADER}
      selfData={ASHA_SELF_DATA}
      civData={ASHA_CIV_DATA}
      returnTo={returnTo}
      onDismiss={handleDismiss}
      closingCta={user ? "Bring your work in →" : "Sign in to bring your work in →"}
    />
  )
}
