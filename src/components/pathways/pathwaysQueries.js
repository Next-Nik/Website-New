// ─────────────────────────────────────────────────────────────
// pathwaysQueries.js — the practitioner pool query (v1)
//
// Accepting practitioners for a personal domain:
//   1. nextus_actor_offerings.personal_domains contains the domain
//      (owner-entered tags — the extractor never populates these)
//   2. nextus_actors: actor_mode practice/mixed, accepting_status
//      yes/waitlist, and the profile meets the Floor
//      (name + tagline + description + story + image + a contact)
//
// Reads public Atlas data only. Never touches the person's own
// journey data — that stays in the rules/need layer.
// ─────────────────────────────────────────────────────────────

import { supabase } from '../../hooks/useSupabase'
import { ACCEPTING_STATUSES, PRACTITIONER_MODES } from './pathwaysRules'

function meetsFloor(actor, hasContact) {
  return Boolean(
    actor.name &&
    actor.tagline &&
    actor.description &&
    actor.story &&
    actor.image_url &&
    hasContact
  )
}

/**
 * fetchAcceptingPractitioners(domain, limit) →
 *   [{ id, slug, name, tagline, image_url, accepting_status }]
 */
export async function fetchAcceptingPractitioners(domain, limit = 2) {
  try {
    // 1 — offerings tagged with this personal domain
    const { data: offerings, error: oErr } = await supabase
      .from('nextus_actor_offerings')
      .select('actor_id')
      .contains('personal_domains', [domain])
    if (oErr || !offerings?.length) return []

    const actorIds = [...new Set(offerings.map(o => o.actor_id).filter(Boolean))]
    if (!actorIds.length) return []

    // 2 — accepting practitioners among them
    const { data: actors, error: aErr } = await supabase
      .from('nextus_actors')
      .select('id, slug, name, tagline, description, story, image_url, website, accepting_status, actor_mode')
      .in('id', actorIds)
      .in('accepting_status', ACCEPTING_STATUSES)
      .in('actor_mode', PRACTITIONER_MODES)
    if (aErr || !actors?.length) return []

    // 3 — Floor: at least one business contact (a typed link or website)
    const ids = actors.map(a => a.id)
    const { data: links } = await supabase
      .from('actor_links')
      .select('actor_id')
      .in('actor_id', ids)
    const linked = new Set((links || []).map(l => l.actor_id))

    return actors
      .filter(a => meetsFloor(a, linked.has(a.id) || Boolean(a.website)))
      .slice(0, limit)
      .map(a => ({
        id:               a.id,
        slug:             a.slug,
        name:             a.name,
        tagline:          a.tagline,
        image_url:        a.image_url,
        accepting_status: a.accepting_status,
      }))
  } catch {
    return []
  }
}
