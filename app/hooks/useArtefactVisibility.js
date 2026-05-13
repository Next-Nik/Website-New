// ─────────────────────────────────────────────────────────────────────────────
// src/beta/hooks/useArtefactVisibility.js
//
// Read and write a user's visibility setting for one artefact. Backed by the
// artefact_visibility table from Module 1.
//
// Default state for any artefact without a row is 'private'. The hook only
// writes a row when the user actively changes the toggle — until then, the
// absence of a row means private.
//
// Optimistic UI: setVisibility() flips local state immediately and writes
// in the background. On write failure, the local state reverts and an error
// is exposed.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'

const VALID_TYPES = [
  'ia_statement',
  'sprint',
  'sprint_completion',
  'wheel_self',
  'wheel_civ',
  'focus_claim',
  'practice_attribution',
]

const VALID_VISIBILITIES = ['private', 'public', 'sprint_buddies', 'friends']

function isValidVisibility(v) {
  return VALID_VISIBILITIES.includes(v)
}

export function useArtefactVisibility(userId, artefactType, artefactId) {
  const [visibility, setVis] = useState('private')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const idKey = artefactId == null ? 'default' : String(artefactId)

  const load = useCallback(async () => {
    if (!userId || !artefactType) {
      setVis('private')
      setLoading(false)
      return
    }
    if (!VALID_TYPES.includes(artefactType)) {
      setError(new Error(`Invalid artefact_type: ${artefactType}`))
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('artefact_visibility')
      .select('visibility')
      .eq('user_id', userId)
      .eq('artefact_type', artefactType)
      .eq('artefact_id', idKey)
      .maybeSingle()

    if (queryError) {
      setError(queryError)
      setVis('private')
    } else {
      setVis(data?.visibility || 'private')
    }
    setLoading(false)
  }, [userId, artefactType, idKey])

  useEffect(() => {
    load()
  }, [load])

  // Optimistic write. Returns the new value on success, throws on failure.
  const setVisibility = useCallback(
    async (next) => {
      if (!isValidVisibility(next)) {
        throw new Error(`Invalid visibility: ${next}`)
      }
      const previous = visibility
      setVis(next)

      const { error: writeError } = await supabase
        .from('artefact_visibility')
        .upsert(
          {
            user_id: userId,
            artefact_type: artefactType,
            artefact_id: idKey,
            visibility: next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,artefact_type,artefact_id' },
        )

      if (writeError) {
        setVis(previous)
        setError(writeError)
        throw writeError
      }
      return next
    },
    [userId, artefactType, idKey, visibility],
  )

  return { visibility, loading, error, setVisibility, reload: load }
}

// ─── Bulk read for one artefact_type ─────────────────────────────────────────
//
// Used by the sprints section: load the visibility row for every sprint id
// the user has, in one query. Returns { [artefact_id]: visibility }.

export async function fetchVisibilityMap(userId, artefactType) {
  if (!userId || !artefactType) return {}
  if (!VALID_TYPES.includes(artefactType)) {
    throw new Error(`Invalid artefact_type: ${artefactType}`)
  }

  const { data, error } = await supabase
    .from('artefact_visibility')
    .select('artefact_id, visibility')
    .eq('user_id', userId)
    .eq('artefact_type', artefactType)

  if (error) throw error

  const map = {}
  for (const row of data || []) {
    map[row.artefact_id] = row.visibility
  }
  return map
}
