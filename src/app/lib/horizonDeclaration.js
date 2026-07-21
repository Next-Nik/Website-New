// src/app/lib/horizonDeclaration.js
//
// BP-8 · Read/write for the horizon declaration — the one line a person
// declares as the future they are moving toward.
//
// HARD LOCKS (enforced here and in migration 172):
//   • Stored and returned VERBATIM. This module never summarises, rewrites,
//     or derives the line from anything. The only writer is the person, via
//     the declaration screen.
//   • One per person. save() upserts on user_id.
//   • Communal display is doubly gated: the owner must opt in
//     (communal_visible), AND the app-wide flag below must be on. Until Nik
//     flips the flag, step-toward renders on the personal rail only.
//
// Results are always checked — a silently-swallowed Supabase error is a
// systemic vulnerability class in this codebase (see CLAUDE.md).

import { supabase } from '../../hooks/useSupabase'

// Build flag — the display-scope safe default (BP-8). Personal-rail-only is
// live; communal render stays OFF until this is flipped to true. Flipping it
// on makes horizons whose owners set communal_visible visible on communal
// surfaces. Nothing else needs to change.
export const HORIZON_COMMUNAL_ENABLED = false

export const HORIZON_MAX = 240

async function currentUserId() {
  try {
    const { data } = await supabase.auth.getUser()
    return data?.user?.id || null
  } catch (_) {
    return null
  }
}

// The current person's declaration, or null if they have not declared.
export async function getMyHorizonDeclaration() {
  const uid = await currentUserId()
  if (!uid) return null
  const { data, error } = await supabase
    .from('horizon_declarations')
    .select('id, line, communal_visible, created_at, updated_at')
    .eq('user_id', uid)
    .maybeSingle()
  if (error) { console.warn('horizon read failed', error.message); return null }
  return data || null
}

// Perform (or amend) the declaration. Verbatim. Throws on empty / signed-out
// so the screen can surface the reason.
export async function saveHorizonDeclaration(line) {
  const trimmed = (line || '').trim()
  if (!trimmed) throw new Error('A horizon needs words.')
  if (trimmed.length > HORIZON_MAX) {
    throw new Error(`Keep it to a line · ${HORIZON_MAX} characters or fewer.`)
  }
  const uid = await currentUserId()
  if (!uid) throw new Error('Sign in to declare your horizon.')

  const { data, error } = await supabase
    .from('horizon_declarations')
    .upsert(
      { user_id: uid, line: trimmed, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select('id, line, communal_visible, created_at, updated_at')
    .single()
  if (error) throw error
  return data
}

// Opt the declaration in or out of communal display. Owner-only (RLS).
export async function setHorizonCommunalVisible(visible) {
  const uid = await currentUserId()
  if (!uid) throw new Error('Sign in first.')
  const { data, error } = await supabase
    .from('horizon_declarations')
    .update({ communal_visible: !!visible, updated_at: new Date().toISOString() })
    .eq('user_id', uid)
    .select('id, line, communal_visible')
    .single()
  if (error) throw error
  return data
}

// Read another person's horizon for a communal step-toward render. Returns
// null unless the flag is on AND the owner opted in (RLS enforces the latter
// too). Never used on the personal rail — that path uses getMyHorizonDeclaration.
export async function getCommunalHorizon(userId) {
  if (!HORIZON_COMMUNAL_ENABLED || !userId) return null
  const { data, error } = await supabase
    .from('horizon_declarations')
    .select('line, communal_visible')
    .eq('user_id', userId)
    .eq('communal_visible', true)
    .maybeSingle()
  if (error) return null
  return data?.line || null
}
