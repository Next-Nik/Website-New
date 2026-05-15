// src/components/AuthGate.jsx — PATCH
// Add "I represent an organisation" path to the welcome/onboarding copy
// This is a copy and flow patch — not a structural rewrite of AuthGate.
//
// The change: after sign-in, if the user has no actor record and no existing
// Horizon Suite usage, show a two-path welcome prompt.
//
// ─────────────────────────────────────────────────────────────────────────────
// COPY — to be added to AuthGate welcome state (the screen shown post sign-in
// when it's a new user's first authenticated session):
// ─────────────────────────────────────────────────────────────────────────────

/*
  Existing welcome path (unchanged):
  "I'm here for my own growth" → routes to Orienteering or the tool that triggered auth

  New path to add:
  "I represent an organisation" → routes to /tools/planet (PlanetMap, which handles
  actor registration as its first step via ActorClaimGate)

  Implementation note: the routing decision happens inside AuthGate's post-sign-in
  redirect logic. Add a state variable `onboardingChoice` and show the two-path
  selector before redirecting.
*/

// ─── Suggested copy for the two-path prompt ──────────────────────────────────

export const ONBOARDING_PATHS = [
  {
    key: 'self',
    label: 'I\'m here for my own growth',
    description: 'Personal navigation tools — map your life, clarify your direction, build daily practices.',
    route: null, // continues to whatever triggered auth, or /tools/orienteering
  },
  {
    key: 'org',
    label: 'I represent an organisation',
    description: 'Assess where your organisation stands across seven civilisational domains. Map the gap.',
    route: '/tools/planet',
  },
]

// ─── Implementation sketch (to be woven into AuthGate.jsx) ───────────────────

/*
  In AuthGate, after successful sign-in:

  1. Check if this is the user's first session:
     const isNewUser = !user.last_sign_in_at || isFirstSession(user)

  2. If new user: show ONBOARDING_PATHS selector before redirecting

  3. On selection:
     if choice.key === 'org': navigate('/tools/planet')
     else: navigate(returnPath ?? '/tools/orienteering')

  4. Store choice in user_metadata to avoid showing again:
     await supabase.auth.updateUser({
       data: { onboarding_path: choice.key }
     })

  The Planet tool itself handles the rest (ActorClaimGate → assessment flow).
  AuthGate does not need to know anything about actor types.
*/

// ─── Suggested welcome screen copy ───────────────────────────────────────────

/*
  Eyebrow: "Welcome to NextUs"

  Headline: "What brings you here?"

  Option 1 card:
    Label: "My own growth"
    Subtext: "Personal navigation tools. Map your life, clarify your direction."

  Option 2 card:
    Label: "My organisation"
    Subtext: "Civilisational assessment. Seven domains. Where you stand and where you're going."

  Note: no third option shown here. If an individual wants to place themselves as an
  Atlas actor (practitioner), that comes through Purpose Piece → domain/scale → Atlas
  placement. The two-path prompt is kept to its sharpest form.
*/
