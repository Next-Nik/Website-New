// ─────────────────────────────────────────────────────────────
// WelcomeSelf — /welcome/self
//
// The Kin narrative. Now serves two cases:
//
//   1. POST-SIGNUP (signed in, welcome not seen):
//      RootRoute routes a fresh user here after auth. On dismiss
//      we mark welcome-seen and route to Mission Control (/).
//
//   2. DIRECT VISIT (signed out, or signed in and already seen):
//      Anyone can land here by URL. Signed-out visitors see the
//      narrative and dismiss to /login. Signed-in users who've
//      already seen it pass through to Mission Control.
//
// Exports WELCOME_SEEN_KEY which is read by RootRoute in App.jsx
// and IntroGate (legacy gate, kept for safety).
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WelcomeOverlay from '../components/welcome/WelcomeOverlay'
import {
  BEATS, HEADERS, ACT3_HEADER,
  KIN_SELF_DATA, KIN_CIV_DATA,
} from '../components/welcome/WelcomeBeats'
import { useAuth } from '../../hooks/useAuth'

export const WELCOME_SEEN_KEY = 'nextus.welcomeSeen'

function getSeen() {
  try { return window.localStorage.getItem(WELCOME_SEEN_KEY) === '1' }
  catch { return false }
}

function markSeen() {
  try { window.localStorage.setItem(WELCOME_SEEN_KEY, '1') }
  catch {}
}

export default function WelcomeSelf() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const returnTo = params.get('return') || '/'

  // Signed in AND already seen → skip straight to Mission Control.
  // Signed in AND not yet seen → show the narrative so they meet
  // the platform before landing in Mission Control.
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
      // Post-signup: into Mission Control.
      navigate(returnTo, { replace: true })
    } else {
      // Pre-auth direct visit: send to login.
      navigate(`/login?redirect=${encodeURIComponent(returnTo)}`)
    }
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
      closingCta={user ? "Begin" : "Sign in to begin"}
    />
  )
}
