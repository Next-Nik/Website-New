// ─────────────────────────────────────────────────────────────
// BetaWelcome — /beta/welcome
//
// Dedicated route for the Kin welcome narrative. Logged-out
// visitors landing on /beta or /beta/dashboard should be redirected
// here (with ?return=… so they land on the dashboard after sign-in).
//
// Logged-in users landing here should be redirected to /beta/dashboard
// — that redirect lives in the routing layer (App.jsx), not here.
//
// Usage:
//   <Route path="/beta/welcome" element={<BetaWelcome />} />
//
// Query params:
//   ?return=/path  — passed through to /login as ?redirect=…
// ─────────────────────────────────────────────────────────────

import { useSearchParams } from 'react-router-dom'
import WelcomeOverlay from '../components/welcome/WelcomeOverlay'
import {
  BEATS, HEADERS, ACT3_HEADER,
  KIN_SELF_DATA, KIN_CIV_DATA,
} from '../components/welcome/WelcomeBeats'

export default function BetaWelcome() {
  const [params] = useSearchParams()
  const returnTo = params.get('return') || '/beta/dashboard'

  return (
    <WelcomeOverlay
      beats={BEATS}
      headers={HEADERS}
      act3Header={ACT3_HEADER}
      selfData={KIN_SELF_DATA}
      civData={KIN_CIV_DATA}
      returnTo={returnTo}
      closingCta="Sign in to begin"
    />
  )
}
