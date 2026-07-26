// src/app/lib/sparks.js
//
// Social half · item 5 · Passing a spark. The named gift: one person, one line
// in your own words about why them. They take it up, and what they hold
// carries its lineage.
//
// Every write goes through a SECURITY DEFINER RPC (185_sparks.sql) — the
// address is resolved server-side so no email ever reaches a browser, and
// status is never client-settable. The lineage is the giver's alone: it is
// never public, never compared, never ranked, and never shown to the people
// inside it.
//
// Results are checked, never silently swallowed (CLAUDE.md).

import { supabase } from '../../hooks/useSupabase'
import { logActivity } from '../components/pulse/logActivity'

async function currentUserId() {
  try {
    const { data } = await supabase.auth.getUser()
    return data?.user?.id || null
  } catch (_) { return null }
}

export const MAX_SPARK_LINE = 240

// Pass a spark to somebody, addressed by email. Returns { ok } or
// { ok: false, message } with the server's plain-language reason — these are
// worth showing, so this one does not swallow.
export async function sendSpark({ email, line, challengeId, challengeTitle, domain }) {
  if (!email || !line || !line.trim()) {
    return { ok: false, message: 'Who, and why them.' }
  }
  const { error } = await supabase.rpc('send_spark', {
    p_email:           String(email).trim(),
    p_line:            line.trim().slice(0, MAX_SPARK_LINE),
    p_challenge_id:    challengeId || null,
    p_challenge_title: challengeTitle || null,
    p_domain:          domain || null,
  })
  if (error) {
    console.warn('spark send failed', error.message)
    return { ok: false, message: error.message || 'That did not send. Try again.' }
  }
  return { ok: true }
}

// Sparks waiting for me. Nothing chases anyone: this is read where the person
// already is, never pushed.
export async function getWaitingSparks() {
  const uid = await currentUserId()
  if (!uid) return []
  const { data, error } = await supabase
    .from('sparks')
    .select('id, giver_name, challenge_id, challenge_title, domain, line, created_at')
    .eq('receiver_id', uid)
    .eq('status', 'sent')
    .order('created_at', { ascending: true })
  if (error) { console.warn('waiting sparks read failed', error.message); return [] }
  return data || []
}

// One waiting spark by id — the receive screen.
export async function getSpark(sparkId) {
  const uid = await currentUserId()
  if (!uid || !sparkId) return null
  const { data, error } = await supabase
    .from('sparks')
    .select('id, giver_name, challenge_id, challenge_title, domain, line, status, created_at')
    .eq('id', sparkId)
    .maybeSingle()
  if (error) { console.warn('spark read failed', error.message); return null }
  return data || null
}

// Take it up. The pulse learns that a spark was caught — never who, on either
// end (the activity table has no user column, by design).
export async function catchSpark(sparkId, { domain } = {}) {
  const { error } = await supabase.rpc('catch_spark', { p_spark: sparkId })
  if (error) {
    console.warn('spark catch failed', error.message)
    return { ok: false, message: error.message || 'That did not take. Try again.' }
  }
  logActivity({ eventType: 'spark_caught', subjectType: 'spark', domain: domain || null })
  return { ok: true }
}

// Leaving it is a real answer and costs nothing. Quiet: the giver sees it
// stopped there, and nothing further is ever sent.
export async function declineSpark(sparkId) {
  const { error } = await supabase.rpc('decline_spark', { p_spark: sparkId })
  if (error) {
    console.warn('spark decline failed', error.message)
    return { ok: false, message: error.message || 'That did not save. Try again.' }
  }
  return { ok: true }
}

// What I gave, and where it went after that. Private to me.
// Returns { rows, live, passedOn, waiting } where rows are the flat lineage
// (depth 1 = people I passed to directly) and the three numbers are the only
// counts this feature ever produces.
export async function getLineage() {
  const uid = await currentUserId()
  if (!uid) return { rows: [], live: 0, passedOn: 0, waiting: 0 }

  const [{ data: tree, error: treeErr }, { data: mine, error: mineErr }] = await Promise.all([
    supabase.rpc('spark_lineage'),
    supabase
      .from('sparks')
      .select('id, receiver_id, status, created_at, challenge_title')
      .eq('giver_id', uid)
      .order('created_at', { ascending: false }),
  ])
  if (treeErr) { console.warn('lineage read failed', treeErr.message); return { rows: [], live: 0, passedOn: 0, waiting: 0 } }
  if (mineErr) { console.warn('own sparks read failed', mineErr.message) }

  const rows = tree || []
  const caught = rows.filter(r => r.status === 'caught')
  return {
    rows,
    live:     caught.length,
    passedOn: caught.filter(r => Number(r.passed_on) > 0).length,
    waiting:  (mine || []).filter(s => s.status === 'sent').length,
  }
}

// The tree as nested nodes, for rendering. Pure — no I/O.
export function nestLineage(rows) {
  const byId = new Map()
  for (const r of rows || []) byId.set(r.spark_id, { ...r, children: [] })
  const roots = []
  for (const node of byId.values()) {
    const parent = node.parent_id && byId.get(node.parent_id)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}
