// ─────────────────────────────────────────────────────────────────────────────
// src/beta/hooks/useHorizonFloorStatus.js
//
// Read horizon_floor_status for an actor. Server action flagForReview()
// transitions an actor to 'flagged_for_review' and writes to the curator
// queue (table created in 016_horizon_floor_review_queue.sql).
//
// Curator decisions update the actor's status to 'compatible' or
// 'incompatible' from the curator review surface (separate module).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { isValidHorizonFloorStatus } from '../constants/horizonFloor'

export function useHorizonFloorStatus(actorId) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!actorId) {
      setStatus(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('nextus_actors')
      .select('id, horizon_floor_status')
      .eq('id', actorId)
      .maybeSingle()

    if (queryError) {
      setError(queryError)
      setStatus(null)
    } else {
      setStatus(data?.horizon_floor_status || 'compatible')
    }
    setLoading(false)
  }, [actorId])

  useEffect(() => {
    load()
  }, [load])

  return { status, loading, error, reload: load }
}

// ─── Server action: flagForReview ────────────────────────────────────────────
//
// Used from the admission flow when a contributor self-flags ("I am uncertain
// — please review before publishing"), or from any admin surface that needs
// to send something back to the curator queue.
//
// targetType: one of 'actor' | 'practice' | 'contribution' | 'bilateral_artefact' | 'nomination'
// For actors specifically, also writes the status onto nextus_actors.
//
// Returns the queue row.

const VALID_REVIEW_TARGETS = [
  'actor',
  'practice',
  'contribution',
  'bilateral_artefact',
  'nomination',
]

export async function flagForReview(
  targetTypeOrActorId,
  reasonOrTargetId,
  maybeReason,
) {
  // Backwards-compatible signature. The Module 1.5 brief gives the signature
  // flagForReview(actorId, reason). We keep that, and also accept a richer
  // (targetType, targetId, reason) form for non-actor flows.
  let targetType, targetId, reason
  if (VALID_REVIEW_TARGETS.includes(targetTypeOrActorId)) {
    targetType = targetTypeOrActorId
    targetId = reasonOrTargetId
    reason = maybeReason || ''
  } else {
    targetType = 'actor'
    targetId = targetTypeOrActorId
    reason = reasonOrTargetId || ''
  }

  if (!targetId) {
    throw new Error('targetId is required')
  }

  // Resolve current user for submitted_by.
  const { data: userData } = await supabase.auth.getUser()
  const submittedBy = userData?.user?.id || null

  // 1. Upsert review queue row.
  const { data: queueRow, error: queueError } = await supabase
    .from('horizon_floor_review_queue')
    .upsert(
      {
        target_type: targetType,
        target_id: String(targetId),
        reason: reason || null,
        submitted_by: submittedBy,
        status: 'pending',
      },
      { onConflict: 'target_type,target_id' },
    )
    .select()
    .single()

  if (queueError) throw queueError

  // 2. If the target is an actor, mirror the status on nextus_actors.
  if (targetType === 'actor') {
    const { error: actorError } = await supabase
      .from('nextus_actors')
      .update({ horizon_floor_status: 'flagged_for_review' })
      .eq('id', targetId)
    if (actorError) throw actorError
  }

  return queueRow
}

// Set horizon_floor_status directly. Used by curator review surfaces and by
// the admission flow's "compatible" path. Validates against the locked status
// list.

export async function setHorizonFloorStatus(actorId, status) {
  if (!actorId) throw new Error('actorId is required')
  if (!isValidHorizonFloorStatus(status)) {
    throw new Error(`Invalid horizon_floor_status: ${status}`)
  }
  const { data, error } = await supabase
    .from('nextus_actors')
    .update({ horizon_floor_status: status })
    .eq('id', actorId)
    .select()
    .single()
  if (error) throw error
  return data
}
