// src/lib/momentCapture.js
//
// BP-2 · The one way clients create, delete, and report moments. Shared by
// both trees (import from '../../lib/momentCapture' in pages).
//
// captureMoment: downscales in the browser (full ~1600px + thumb ~400px WebP,
// via the existing imageDownscale helper) so a phone photo becomes a couple
// hundred KB before it ever leaves the device, then posts to /api/moment-upload
// with the session's bearer token. The line is always the person's own words —
// nothing here ever writes it for them.
//
// deleteMoment: soft-delete (sets deleted_at) under owner RLS.
// reportMoment: inserts a report under the reporter's own id; the founder
// review queue (AdminConsole → Moments) reads and resolves.

import { supabase } from '../hooks/useSupabase'
import { downscaleImage } from './imageDownscale'

async function bearer() {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  } catch (_) {
    return null
  }
}

// { file?, line?, challengeId?, domain? } → moment row
// Throws with a plain-language message on failure.
export async function captureMoment({ file, line, challengeId, domain } = {}) {
  const token = await bearer()
  if (!token) throw new Error('Sign in to add a moment.')

  let fullDataUrl = null
  let thumbDataUrl = null

  if (file) {
    const full = await downscaleImage(file, { maxEdge: 1600, quality: 0.82 })
    fullDataUrl = full.dataUrl
    try {
      const thumb = await downscaleImage(file, { maxEdge: 400, quality: 0.7 })
      thumbDataUrl = thumb.dataUrl
    } catch (_) { thumbDataUrl = null }
  }

  const res = await fetch('/api/moment-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fullDataUrl,
      thumbDataUrl,
      line: typeof line === 'string' ? line : null,
      challenge_id: challengeId || null,
      domain: domain || null,
    }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Could not save the moment.')
  return json.moment
}

// Owner soft-delete. Returns true on success.
export async function deleteMoment(momentId) {
  const { error } = await supabase
    .from('moments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', momentId)
  return !error
}

// Any signed-in person can report. Returns true on success.
export async function reportMoment(momentId, reason) {
  const { data } = await supabase.auth.getUser()
  const uid = data?.user?.id
  if (!uid) return false
  const { error } = await supabase
    .from('moment_reports')
    .insert({
      moment_id: momentId,
      reporter_id: uid,
      reason: typeof reason === 'string' ? reason.trim().slice(0, 500) : null,
    })
  return !error
}

// Public URL for a stored moment image path.
export function momentImageUrl(path) {
  if (!path) return null
  const { data } = supabase.storage.from('moment-images').getPublicUrl(path)
  return data?.publicUrl || null
}
