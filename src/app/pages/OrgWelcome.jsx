// ─────────────────────────────────────────────────────────────
// OrgWelcome — /welcome/org
//
// The org narrative. Handles both pre-auth direct visits and
// post-signup routing from RootRoute (when the user chose the
// 'org' path on the wrapper or via WelcomeStart).
//
// returnTo carries ?scope=org so Mission Control activates the
// org surface and writes 'org' into the user's scopes on arrival
// (per Scopes & Onboarding brief, Section 3.2 — org overwrites
// to ['org']).
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WelcomeOverlay from '../components/welcome/WelcomeOverlay'
import {
  BEATS, HEADERS, ACT3_HEADER,
  HEARTH_SELF_DATA, HEARTH_CIV_DATA,
} from '../components/welcome/OrgWelcomeBeats'
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

export default function OrgWelcome() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const returnTo = params.get('return') || '/?scope=org'

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
      act3Header={ACT3_HEADER}
      selfData={HEARTH_SELF_DATA}
      civData={HEARTH_CIV_DATA}
      returnTo={returnTo}
      onDismiss={handleDismiss}
      closingCta={user ? "Bring your organisation in →" : "Sign in to bring your organisation in →"}
    />
  )
}
