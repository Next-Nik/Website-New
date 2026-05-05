// ─────────────────────────────────────────────────────────────
// BetaOrgWelcome — /beta/welcome/org
//
// The org-side welcome. Same overlay component as the individual
// welcome, fed with Hearth Lab's beats and the org-coherence
// dimensions (Purpose · Practice · People · Resources · Reach ·
// Reflection · Renewal) on the "self" wheel.
//
// Closing CTA: "Bring your organisation in →" routes to /login
// for now, with the same ?return param mechanic. When the org
// onboarding flow has its own destination (nominate-as-org,
// schedule-a-call, or a dedicated org signup), update this
// closingCta and the returnTo default.
//
// Usage:
//   <Route path="/beta/welcome/org" element={<BetaOrgWelcome />} />
// ─────────────────────────────────────────────────────────────

import { useSearchParams } from 'react-router-dom'
import WelcomeOverlay from '../components/welcome/WelcomeOverlay'
import {
  BEATS, HEADERS, ACT3_HEADER,
  HEARTH_SELF_DATA, HEARTH_CIV_DATA,
} from '../components/welcome/OrgWelcomeBeats'

export default function BetaOrgWelcome() {
  const [params] = useSearchParams()
  // Default landing target after sign-in. Update when the org
  // onboarding flow has its own destination (e.g. /beta/org/new).
  const returnTo = params.get('return') || '/beta/dashboard'

  return (
    <WelcomeOverlay
      beats={BEATS}
      headers={HEADERS}
      act3Header={ACT3_HEADER}
      selfData={HEARTH_SELF_DATA}
      civData={HEARTH_CIV_DATA}
      returnTo={returnTo}
      closingCta="Bring your org in"
    />
  )
}
