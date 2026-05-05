// ─────────────────────────────────────────────────────────────────────────────
// src/beta/hooks/useTaggedPrinciples.js
//
// Read and write principle taggings for any tagged entity (actor, practice,
// indicator, domain_entry, contributor).
//
// Reads from principle_taggings (Module 1). Returns the tagging rows joined
// with their canonical principle definitions from src/beta/constants/principles.js.
// Server-side defs are the source of truth for the table; client-side defs
// are imported from constants and shipped with the bundle. The two stay in
// sync because both reference 015_seed_platform_principles.sql.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'
import {
  PRINCIPLES,
  isValidPrincipleSlug,
  isValidPrincipleWeight,
  sortTaggings,
} from '../constants/principles'

const VALID_TARGET_TYPES = [
  'actor',
  'practice',
  'indicator',
  'domain_entry',
  'contributor',
]

export function useTaggedPrinciples(targetType, targetId) {
  const [taggings, setTaggings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!targetType || !targetId) {
      setTaggings([])
      setLoading(false)
      return
    }
    if (!VALID_TARGET_TYPES.includes(targetType)) {
      setError(new Error(`Invalid target_type: ${targetType}`))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('principle_taggings')
      .select('id, principle_slug, target_type, target_id, weight, created_at')
      .eq('target_type', targetType)
      .eq('target_id', String(targetId))

    if (queryError) {
      setError(queryError)
      setTaggings([])
      setLoading(false)
      return
    }

    const enriched = (data || [])
      .filter((row) => PRINCIPLES[row.principle_slug])
      .map((row) => ({
        ...row,
        principle: PRINCIPLES[row.principle_slug],
      }))

    setTaggings(sortTaggings(enriched))
    setLoading(false)
  }, [targetType, targetId])

  useEffect(() => {
    load()
  }, [load])

  return { taggings, loading, error, reload: load }
}

// ─── Server action: tagPrinciple ─────────────────────────────────────────────
//
// Insert or update a principle tagging. Idempotent on (target_type, target_id,
// principle_slug) — a second call with a new weight updates the existing row.
//
// Module 1 schema does not declare that uniqueness; we enforce it here at the
// app layer by querying first. If Module 1 later adds a unique index, this
// becomes redundant but stays correct.

export async function tagPrinciple(targetType, targetId, principleSlug, weight) {
  if (!VALID_TARGET_TYPES.includes(targetType)) {
    throw new Error(`Invalid target_type: ${targetType}`)
  }
  if (!isValidPrincipleSlug(principleSlug)) {
    throw new Error(`Invalid principle_slug: ${principleSlug}`)
  }
  if (!isValidPrincipleWeight(weight)) {
    throw new Error(`Invalid weight: ${weight}`)
  }
  if (!targetId) {
    throw new Error('targetId is required')
  }

  const target = String(targetId)

  const { data: existing, error: fetchError } = await supabase
    .from('principle_taggings')
    .select('id')
    .eq('target_type', targetType)
    .eq('target_id', target)
    .eq('principle_slug', principleSlug)
    .maybeSingle()

  if (fetchError) {
    throw fetchError
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('principle_taggings')
      .update({ weight })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('principle_taggings')
    .insert({
      target_type: targetType,
      target_id: target,
      principle_slug: principleSlug,
      weight,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Remove a tagging. Useful in admin UI when reclassifying.

export async function untagPrinciple(targetType, targetId, principleSlug) {
  if (!VALID_TARGET_TYPES.includes(targetType)) {
    throw new Error(`Invalid target_type: ${targetType}`)
  }
  if (!isValidPrincipleSlug(principleSlug)) {
    throw new Error(`Invalid principle_slug: ${principleSlug}`)
  }

  const { error } = await supabase
    .from('principle_taggings')
    .delete()
    .eq('target_type', targetType)
    .eq('target_id', String(targetId))
    .eq('principle_slug', principleSlug)

  if (error) throw error
  return true
}

// Find every entity engaging a given principle. Used by PrincipleExplainer.
// Returns rows grouped by target_type. Caller decides what to render per type.

export async function fetchEntitiesEngagingPrinciple(principleSlug, options = {}) {
  if (!isValidPrincipleSlug(principleSlug)) {
    throw new Error(`Invalid principle_slug: ${principleSlug}`)
  }
  const { limit = 200, weights } = options

  let query = supabase
    .from('principle_taggings')
    .select('id, target_type, target_id, weight, created_at')
    .eq('principle_slug', principleSlug)
    .order('weight', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (Array.isArray(weights) && weights.length > 0) {
    query = query.in('weight', weights)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}
