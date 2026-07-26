// src/app/lib/milestones.js
//
// Social half · item 6 (tier two) · Which loud moment, if any, is owed right
// now — and the record that stops it ever firing twice (182_milestones.sql).
//
// This module decides nothing about whether something HAPPENED. The check-in,
// the stage-up, the declaration are all written by their own paths first;
// this only asks "has this person already been shown this one?" and, if not,
// claims it. The claim is the unique index, so two tabs racing still produce
// exactly one bloom.
//
// Locks: never a score. There is no count here, nothing readable by anyone
// but its owner, and no surface anywhere that lists what a person has hit.
//
// Results are checked, never silently swallowed (CLAUDE.md).

import { supabase } from '../../hooks/useSupabase'

async function currentUserId() {
  try {
    const { data } = await supabase.auth.getUser()
    return data?.user?.id || null
  } catch (_) { return null }
}

// Stage-up is gated to the two stages worth stopping for. A plant that
// announces itself four times over one practice is wallpaper by the second.
export const LOUD_STAGES = [3, 4]

// Claim a milestone. Returns true exactly once per (person, kind, ref) — the
// caller shows the bloom on true and does nothing on false.
export async function claimMilestone(kind, ref = '') {
  const uid = await currentUserId()
  if (!uid || !kind) return false
  const { data, error } = await supabase
    .from('milestones_seen')
    .insert({ user_id: uid, kind, ref: String(ref || '') })
    .select('id')
  if (error) {
    // 23505 is the unique index doing its job: already shown, not a failure.
    if (error.code === '23505') return false
    console.warn('milestone claim failed', error.message)
    return false
  }
  return Array.isArray(data) && data.length > 0
}

// Which milestone a check-in has just earned, if any. Pure — no I/O, so it is
// cheap to call on every tick and testable on its own.
//
//   { prevStage, stage }  the tended thing before and after this act
//   { streak }            consecutive days including today
//   { complete }          this act finished the run
//
// Returns { kind, ref } or null. One bloom per act, most significant first:
// finishing the run outranks a streak, which outranks a leaf.
export function milestoneForCheckIn({ challengeId, prevStage, stage, streak, complete }) {
  const ref = String(challengeId || '')
  if (complete) return { kind: 'run_complete', ref }
  if (Number.isFinite(stage) && stage !== prevStage && LOUD_STAGES.includes(stage)) {
    return { kind: 'stage_up', ref: `${ref}:${stage}` }
  }
  if (streak === 21) return { kind: 'streak_21', ref }
  if (streak === 7)  return { kind: 'streak_7',  ref }
  return null
}
