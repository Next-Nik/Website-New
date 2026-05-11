// ─────────────────────────────────────────────────────────────
// BetaOrgWelcome — /beta/welcome/org
//
// The org intro. Reached from the starter at /beta/welcome via
// the "I represent an organisation" choice.
//
// Default returnTo lands the visitor on the dashboard with the
// org scope pre-armed (?scope=org). On arrival, Mission Control
// writes 'org' into the user's mission_control_scopes — overwriting
// to ['org'] for fresh signups still on the legacy default
// ['self','planet'] (per brief Section 3.2 — org welcome makes the
// personal scales off by default), or merging 'org' in for users
// who have already shaped their scopes. Either way the My Org
// surface activates, which is itself the setup flow until an org
// row exists for the user.
//
// The pre-auth case routes through /login first so the scope
// handoff fires regardless of whether the visitor signs in
// fresh or was already logged in.
//
// BetaWelcomeNext is retained as a not-yet-authed fallback for
// visitors who arrive without going through the welcome route.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WelcomeOverlay from '../components/welcome/WelcomeOverlay'
import {
  BEATS, HEADERS, ACT3_HEADER,
  HEARTH_SELF_DATA, HEARTH_CIV_DATA,
} from '../components/welcome/OrgWelcomeBeats'
import { useAuth } from '../../hooks/useAuth'
import { WELCOME_SEEN_KEY } from './BetaWelcomeSelf'

export default function BetaOrgWelcome() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  // Default landing target after the intro. The dashboard reads
  // ?scope=org on arrival and writes the user's scope array, then
  // activates the My Org surface (which holds its own setup flow).
  const returnTo = params.get('return') || '/beta/dashboard?scope=org'

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
      selfData={HEARTH_SELF_DATA}
      civData={HEARTH_CIV_DATA}
      returnTo={returnTo}
      onDismiss={handleDismiss}
      closingCta="Bring your organisation in →"
    />
  )
}
