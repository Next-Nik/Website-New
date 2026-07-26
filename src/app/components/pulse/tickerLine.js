// src/app/components/pulse/tickerLine.js
//
// One true sentence per real event. Shared by PulseStrip (the tool-page
// ambience) and PulseLines (the daily surface), so the platform never says the
// same thing two different ways.
//
// PRIVACY LAW (from 109 / 180): nextus_platform_activity has no user_id
// column and never will. Every sentence below either names an already-public
// subject — a live actor, a contributed practice — or says "someone". A
// check-in, a posted moment and a caught spark are all anonymous on both ends;
// there is nothing in the row that could name a person even if the copy
// wanted to.

export const DOMAIN_NAMES = {
  'human-being': 'Human Being', society: 'Society', nature: 'Nature',
  technology: 'Technology', 'finance-economy': 'Economy',
  legacy: 'Legacy', vision: 'Vision',
}

export function domainLabel(slug) {
  return slug && DOMAIN_NAMES[slug] ? DOMAIN_NAMES[slug] : null
}

export function tickerLine(a) {
  const dom   = domainLabel(a.domain)
  const where = dom ? ` · ${dom}` : ''
  const inDom = dom ? ` in ${dom}` : ''
  switch (a.event_type) {
    case 'actor_added':     return `New on the map: ${a.subject_name || 'an actor'}${where}`
    case 'practice_added':  return `A practice was contributed: ${a.subject_name || 'untitled'}${where}`
    case 'tune_in':         return `Someone tuned in to ${a.subject_name || 'the work'}`
    case 'need_posted':     return `${a.subject_name || 'An actor'} posted a need${where}`
    case 'event_published': return `Event published: ${a.subject_name || ''}${where}`
    case 'step_forward':    return `Someone stepped forward${a.subject_name ? ` for ${a.subject_name}` : ''}`
    case 'listing_added':   return `New in NextMarket: ${a.subject_name || ''}`
    // ── the daily loop (184) ────────────────────────────────────────────────
    case 'check_in':        return a.subject_name
                              ? `Someone kept ${a.subject_name}${inDom}`
                              : `Someone kept a practice${inDom}`
    case 'moment_posted':   return `A moment landed${inDom}`
    case 'spark_caught':    return `A passed spark was taken up${inDom}`
    default:                return a.detail || ''
  }
}

// Relative time, short. Shared so the two surfaces read alike.
export function relTime(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 3600)      return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400)     return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
