// src/app/lib/trails.js
//
// BP-16 · Client for trails (a walkable route toward a horizon) and boards
// (per-domain, three time-layers). The path layer is never written from here —
// it is read from the person's real moments (earned, not dreamed).
//
// Results are checked (CLAUDE.md).

import { supabase } from '../../hooks/useSupabase'

async function uid() {
  try { const { data } = await supabase.auth.getUser(); return data?.user?.id || null }
  catch (_) { return null }
}

// ── Trails ────────────────────────────────────────────────────────────
export async function getMyTrails() {
  const id = await uid()
  if (!id) return []
  const { data, error } = await supabase
    .from('trails').select('id, title, horizon_text, domain, is_public, updated_at')
    .eq('user_id', id).order('updated_at', { ascending: false })
  if (error) { console.warn('getMyTrails', error.message); return [] }
  return data || []
}

export async function getTrail(trailId) {
  const { data: trail, error } = await supabase
    .from('trails').select('id, user_id, title, horizon_text, summary, domain, is_public, created_at')
    .eq('id', trailId).maybeSingle()
  if (error || !trail) return null
  const { data: steps } = await supabase
    .from('trail_steps').select('id, kind, ref_slug, label, note, sort_order')
    .eq('trail_id', trailId).order('sort_order')
  return { ...trail, steps: steps || [] }
}

export async function createTrail({ title, horizonText = null, summary = null, domain = null }) {
  const id = await uid()
  if (!id) throw new Error('sign in first')
  const { data, error } = await supabase
    .from('trails')
    .insert({ user_id: id, title: (title || '').trim(), horizon_text: horizonText, summary, domain })
    .select('id').single()
  if (error) throw error
  return data.id
}

export async function updateTrail(trailId, patch) {
  const { error } = await supabase.from('trails')
    .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', trailId)
  if (error) throw error
}

export async function setTrailPublic(trailId, isPublic) {
  return updateTrail(trailId, { is_public: !!isPublic })
}

export async function deleteTrail(trailId) {
  const { error } = await supabase.from('trails').delete().eq('id', trailId)
  if (error) throw error
}

export async function addTrailStep(trailId, { kind = 'note', label, note = null, refSlug = null, sortOrder = 0 }) {
  const { data, error } = await supabase.from('trail_steps')
    .insert({ trail_id: trailId, kind, label: (label || '').trim(), note, ref_slug: refSlug, sort_order: sortOrder })
    .select('id, kind, ref_slug, label, note, sort_order').single()
  if (error) throw error
  return data
}

export async function removeTrailStep(stepId) {
  const { error } = await supabase.from('trail_steps').delete().eq('id', stepId)
  if (error) throw error
}

// ── Boards ────────────────────────────────────────────────────────────
export async function ensureBoard(domain) {
  const id = await uid()
  if (!id || !domain) throw new Error('sign in first')
  const { data, error } = await supabase
    .from('boards')
    .upsert({ user_id: id, domain }, { onConflict: 'user_id,domain' })
    .select('id, domain').single()
  if (error) throw error
  return data
}

export async function getBoardItems(boardId) {
  const { data, error } = await supabase
    .from('board_items').select('id, layer, image_url, caption, sort_order')
    .eq('board_id', boardId).order('sort_order')
  if (error) { console.warn('getBoardItems', error.message); return [] }
  return data || []
}

// Only the dreamable layers (reality, horizon) accept writes. The path layer
// is earned, not added — the DB CHECK enforces this too.
export async function addBoardItem(boardId, layer, { imageUrl = null, caption = null }) {
  if (layer === 'path') throw new Error('The path is earned, not added.')
  const { data, error } = await supabase.from('board_items')
    .insert({ board_id: boardId, layer, image_url: imageUrl, caption })
    .select('id, layer, image_url, caption, sort_order').single()
  if (error) throw error
  return data
}

export async function removeBoardItem(itemId) {
  const { error } = await supabase.from('board_items').delete().eq('id', itemId)
  if (error) throw error
}

// The path layer — real witnessed steps in this domain: the person's own
// moments. Read-only, earned. Never uploaded.
export async function getPathSteps(domain) {
  const id = await uid()
  if (!id || !domain) return []
  const { data, error } = await supabase
    .from('moments').select('id, line, image_path, thumb_path, created_at')
    .eq('user_id', id).eq('domain', domain).is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(60)
  if (error) { console.warn('getPathSteps', error.message); return [] }
  return data || []
}
