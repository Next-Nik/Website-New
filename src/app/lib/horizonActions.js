// src/app/lib/horizonActions.js
//
// BP-18 · The accrual spine (drive|recovery ledger) + the North Star line.
//
// recordHorizonAction is the write path called from real acts (check-ins now;
// summon/Daily/Stretch as those hooks land). Nothing synthetic is ever
// written — every row is an act the person actually took. Recovery is logged
// as real, honoured, never as failure.
//
// Fire-and-forget on the write side: a ledger miss must never block the act
// that triggered it, so recordHorizonAction swallows its own errors (after
// logging) rather than throwing into a check-in handler.

import { supabase } from '../../hooks/useSupabase'

async function uid() {
  try { const { data } = await supabase.auth.getUser(); return data?.user?.id || null }
  catch (_) { return null }
}

export async function recordHorizonAction({ kind = 'drive', source = null, domain = null, weight = 1, note = null } = {}) {
  const id = await uid()
  if (!id) return null
  const { data, error } = await supabase
    .from('horizon_actions')
    .insert({ user_id: id, kind, source, domain, weight, note })
    .select('id').maybeSingle()
  if (error) { console.warn('recordHorizonAction failed', error.message); return null }
  return data?.id || null
}

export async function getLedger(limit = 60) {
  const id = await uid()
  if (!id) return []
  const { data, error } = await supabase
    .from('horizon_actions')
    .select('id, kind, source, domain, weight, note, created_at')
    .eq('user_id', id).order('created_at', { ascending: false }).limit(limit)
  if (error) { console.warn('getLedger failed', error.message); return [] }
  return data || []
}

// A simple drive/recovery reading over a recent window — the balance the
// North Star surface reflects. Not a score of the person; a mirror of rhythm.
export async function getBalance(days = 30) {
  const id = await uid()
  if (!id) return { drive: 0, recovery: 0 }
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data, error } = await supabase
    .from('horizon_actions')
    .select('kind, weight')
    .eq('user_id', id).gte('created_at', since)
  if (error) return { drive: 0, recovery: 0 }
  let drive = 0, recovery = 0
  for (const r of data || []) {
    if (r.kind === 'recovery') recovery += r.weight || 1
    else drive += r.weight || 1
  }
  return { drive, recovery }
}

export async function getNorthStar() {
  const id = await uid()
  if (!id) return null
  const { data, error } = await supabase
    .from('north_star').select('synthesis, updated_at').eq('user_id', id).maybeSingle()
  if (error) { console.warn('getNorthStar failed', error.message); return null }
  return data || null
}

export async function saveNorthStar(synthesis) {
  const trimmed = (synthesis || '').trim()
  if (!trimmed) throw new Error('A North Star needs words.')
  const id = await uid()
  if (!id) throw new Error('sign in first')
  const { data, error } = await supabase
    .from('north_star')
    .upsert({ user_id: id, synthesis: trimmed, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select('synthesis, updated_at').single()
  if (error) throw error
  return data
}
