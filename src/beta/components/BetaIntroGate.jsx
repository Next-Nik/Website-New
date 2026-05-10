// ─────────────────────────────────────────────────────────────
// BetaIntroGate — wraps /beta/dashboard
//
// First-time logged-out visitors hit the starter at /beta/welcome,
// which routes them to the matching intro narrative. Returning
// visitors (with the nextus.welcomeSeen flag set) and logged-in
// users pass through to whatever this gate wraps.
//
// The intro is a first-impression, not a permanent wall. Anyone
// who has seen any of the three intros once is allowed to browse
// the platform's logged-out state freely.
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
import { WELCOME_SEEN_KEY } from '../pages/BetaWelcomeSelf'

function hasSeenWelcome() {
  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === '1'
  } catch {
    // Storage unavailable — fail open so the visitor isn't trapped.
    return true
  }
}

export default function BetaIntroGate({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Don't redirect while auth status is still resolving.
  if (loading) return children

  // Logged in → through.
  if (user) return children

  // Logged out and intro already seen → through.
  if (hasSeenWelcome()) return children

  // First-time logged-out visitor → starter, with return path.
  const returnTo = location.pathname + (location.search || '')
  return (
    <Navigate
      to={`/beta/welcome?return=${encodeURIComponent(returnTo)}`}
      replace
    />
  )
}
