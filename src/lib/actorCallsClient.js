// src/lib/actorCallsClient.js
//
// The one way clients talk to /api/actor-calls. Attaches the session's bearer
// token when a session exists; the server derives the acting user from that
// token and ignores any client-asserted identity. Public actions work without
// a session; auth-required actions fail cleanly without one.

import { supabase } from '../hooks/useSupabase'

export async function actorCalls(payload) {
  let token = null
  try {
    token = (await supabase.auth.getSession()).data.session?.access_token || null
  } catch (_) { /* signed-out is a valid state */ }
  const r = await fetch('/api/actor-calls', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  return r.json()
}

// Drop-in replacement for fetch('/api/actor-calls', …) call sites: returns the
// Response, so existing .then(r => r.json()) chains keep working unchanged.
export async function actorCallsRaw(payload) {
  let token = null
  try {
    token = (await supabase.auth.getSession()).data.session?.access_token || null
  } catch (_) { /* signed-out is a valid state */ }
  return fetch('/api/actor-calls', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
}
