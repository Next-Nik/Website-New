// src/app/hooks/useBetaShortcuts.js
//
// Returns whether the current user has access to the beta-shortcuts surface
// on /profile/edit. The shortcuts panel is a navigation aid Nik uses during
// development before the v2.5 surfaces are wired into Mission Control.
//
// The gate is intentionally a single-purpose hook with a single allowlist.
// When the feature opens to all users, change the body to `return true`,
// or delete this file and remove its imports — every gated component fails
// closed, never silently exposes itself.
//
// Why a hook instead of inline email checks at each call site:
//   - One file changes when the policy changes
//   - No accidental leakage when a developer copies one component to another
//   - The component layer asks a boolean, not an identity question
//
// To extend the allowlist (rare during development): add an email here.
// To open publicly: replace the body with `return Boolean(user)` or delete.

import { useAuth } from '../../hooks/useAuth'

const ALLOWLIST = new Set([
  'nik@nextus.world',
])

export function useBetaShortcuts() {
  const { user } = useAuth()
  if (!user) return false
  if (!user.email) return false
  return ALLOWLIST.has(user.email.toLowerCase())
}
