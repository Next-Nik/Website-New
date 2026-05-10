// ─────────────────────────────────────────────────────────────
// selfResources.js
//
// The Layer A seed for the Resources Engine. Per-domain, per-band
// curated entries that surface in SelfDomainResources. Hand-vetted,
// stand-behind quality. The editorial floor every other source has
// to clear.
//
// SHAPE — locked. Step 3 will populate; step 4's web-search API
// will return the same shape. This contract is shared, not split.
//
//   {
//     id:           string         // stable id, kebab-case
//     type:         'book' | 'talk' | 'article' | 'practice' | 'tool'
//     title:        string
//     author:       string         // primary author or speaker
//     source:       string         // publisher, outlet, platform
//     url:          string         // canonical link out
//     year:         number | null  // publication year when known
//     domains:      string[]       // SELF_KEYS this resource applies to
//     scoreBands:   string[]       // 'crisis' | 'friction' | 'plateau' | 'capable' | 'fluent'
//     summary:      string         // 1-2 sentences. WE write this.
//     curatedBy:    string         // editorial reviewer id / name
//     addedAt:      string         // ISO date
//     sensitive:    boolean        // flips Layer B into restricted mode
//                                   // when this resource's topic is queried
//     sensitiveNotes?: string      // optional editorial note for sensitive entries
//   }
//
// Empty for now. Step 3 fills this with vetted entries.
// ─────────────────────────────────────────────────────────────

/** @type {Array<{
 *  id: string, type: 'book'|'talk'|'article'|'practice'|'tool',
 *  title: string, author: string, source: string, url: string,
 *  year: number|null, domains: string[], scoreBands: string[],
 *  summary: string, curatedBy: string, addedAt: string,
 *  sensitive: boolean, sensitiveNotes?: string
 * }>} */
export const SELF_RESOURCES = []

// Score bands — match the five tiers documented in the brief, mirroring
// the score colour bands already locked in the design system.
export const SCORE_BANDS = ['crisis', 'friction', 'plateau', 'capable', 'fluent']

// Resource types — the deliberate narrow set we ship with. Expand only
// when there is a clear need; do not let the type list sprawl.
export const RESOURCE_TYPES = ['book', 'talk', 'article', 'practice', 'tool']

// Map a numeric score (0..10) to a score band. Thresholds match the brief.
export function scoreToBand(n) {
  if (n == null || Number.isNaN(Number(n))) return null
  const v = Number(n)
  if (v <  3)   return 'crisis'
  if (v <  5)   return 'friction'
  if (v <  6.5) return 'plateau'
  if (v <  8)   return 'capable'
  return 'fluent'
}

// Filter entries for a (domain, band) pair. Returns curated entries that
// match the domain, and either match the band or are tagged for all bands.
// When band is null (user has not placed this domain), returns all
// domain-tagged entries — better to show something than nothing, with
// the panel making it clear no band-specific filtering happened.
export function getCuratedFor(domainId, band) {
  if (!domainId) return []
  return SELF_RESOURCES.filter(r => {
    if (!r.domains?.includes(domainId)) return false
    if (!band) return true
    if (!r.scoreBands?.length) return true   // no band tags = applies broadly
    return r.scoreBands.includes(band)
  })
}
