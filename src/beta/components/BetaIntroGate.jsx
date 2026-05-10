// ─────────────────────────────────────────────────────────────
// BetaIntroGate — wraps /beta/dashboard
//
// First-time logged-out visitors hit the intro at /beta/welcome.
// Returning visitors (with the nextus.welcomeSeen flag set) and
// logged-in users pass through to whatever this gate wraps.
//
// The intro is a first-impression, not a permanent wall. Anyone
// who has seen it once is allowed to browse the platform in its
// logged-out state freely — Mission Control already handles
// unauthenticated viewing with empty states.
//
// Usage in App.jsx:
//   <Route
//     path="/beta/dashboard"
//     element={
//       <BetaIntroGate>
//         <BetaMissionControl />
//       </BetaIntroGate>
//     }
//   />
// ─────────────────────────────────────────────────────────────

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { WELCOME_SEEN_KEY } from '../pages/BetaWelcome'

function hasSeenWelcome() {
  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === '1'
  } catch {
    // Storage unavailable — fail open (don't trap the visitor).
    return true
  }
}

export default function BetaIntroGate({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Don't redirect while auth status is still resolving — we don't
  // want a logged-in user briefly redirected before useAuth settles.
  if (loading) return children

  // Logged in → through.
  if (user) return children

  // Logged out and intro already seen → through.
  if (hasSeenWelcome()) return children

  // First-time logged-out visitor → intro, with return path.
  const returnTo = location.pathname + (location.search || '')
  return (
    <Navigate
      to={`/beta/welcome?return=${encodeURIComponent(returnTo)}`}
      replace
    />
  )
}
