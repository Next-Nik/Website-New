// src/app/lib/featured.js
//
// Social half · item 7 · The one or two moments at the top of Today.
//
// The brief called this "lifting". In the product it is simply the founder
// asking somebody whether their moment may go at the top, and them saying yes.
// Nothing renders until they have. Silence is a no, and a no is never asked
// twice — both enforced in 183_moment_featured.sql, not left to the client.
//
// There is no response count anywhere in this feature to sort on. Echo was cut
// for exactly that reason, and the founder-side list is ordered by time.
//
// Results are checked, never silently swallowed (CLAUDE.md).

import { supabase } from '../../hooks/useSupabase'

async function currentUserId() {
  try {
    const { data } = await supabase.auth.getUser()
    return data?.user?.id || null
  } catch (_) { return null }
}

// The virtues a moment can be chosen for. Canon list — faithfulness, return
// after a lapse, generosity, first steps. Never a measure, always a reading.
export const VIRTUES = [
  { key: 'faithfulness', label: 'Faithfulness' },
  { key: 'return',       label: 'Return after a lapse' },
  { key: 'generosity',   label: 'Generosity' },
  { key: 'first_step',   label: 'First step' },
]

export function virtueLabel(key) {
  const v = VIRTUES.find(x => x.key === key)
  return v ? v.label : null
}

// What is at the top of Today. Consented only — the view enforces it.
export async function getFeaturedToday() {
  const { data, error } = await supabase
    .from('featured_moments_today')
    .select('id, user_id, line, image_path, thumb_path, domain, created_at, featured_virtue')
  if (error) { console.warn('featured read failed', error.message); return [] }
  return data || []
}

// Has anybody asked ME about one of mine? Read where the person already is —
// there is no notification system in scope, and nothing chases anyone.
//
// Only today's ask. A request lapses with the day it was made (186), so
// showing an older one would offer a button that can only come back as an
// error — and it would quietly contradict "silence is a no".
export async function getMyPendingAsk() {
  const uid = await currentUserId()
  if (!uid) return null
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('moments')
    .select('id, line, image_path, thumb_path, domain, created_at, featured_virtue')
    .eq('user_id', uid)
    .eq('featured_consent', 'pending')
    .gte('featured_asked_at', startOfDay.toISOString())
    .is('deleted_at', null)
    .order('featured_asked_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) { console.warn('pending ask read failed', error.message); return null }
  return data || null
}

// Yes or no, from the owner and only the owner.
export async function answerFeature(momentId, yes) {
  const { error } = await supabase.rpc('answer_feature', { p_moment: momentId, p_yes: !!yes })
  if (error) {
    console.warn('feature answer failed', error.message)
    return { ok: false, message: error.message || 'That did not save. Try again.' }
  }
  return { ok: true }
}

// Founder side: ask. The cap, the rotation rule and the never-ask-twice rule
// all live in the function — a client cannot talk its way past them.
export async function askToFeature(momentId, virtue) {
  const { error } = await supabase.rpc('ask_to_feature', { p_moment: momentId, p_virtue: virtue || null })
  if (error) {
    console.warn('feature ask failed', error.message)
    return { ok: false, message: error.message || 'That did not send. Try again.' }
  }
  return { ok: true }
}

// Founder side: today's moments, in time order. Deliberately no other ordering
// is offered, and there is no count on these rows to offer one.
export async function getTodaysMoments(limit = 60) {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('moments')
    .select('id, user_id, line, image_path, thumb_path, domain, created_at, featured_consent, featured_virtue, featured_at')
    .is('deleted_at', null)
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.warn('today read failed', error.message); return [] }
  return data || []
}
