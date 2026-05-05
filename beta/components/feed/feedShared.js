// src/beta/components/feed/feedShared.js
// Tokens and helpers used across feed-item components.

export const body = { fontFamily: "'Lora', Georgia, serif" }
export const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
export const gold = '#A8721A'
export const dark = '#0F1523'
export const parch = '#FAFAF7'

// Time-ago without em dashes, no fluff, no "ago" verbosity beyond what's helpful.
export function timeAgo(dateInput) {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)
  if (seconds < 0) return 'just now'
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w`
  // Older than a month: show full date
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Self-domain labels (sprints reference these)
export const SELF_DOMAIN_LABEL = {
  path:        'Path',
  spark:       'Spark',
  body:        'Body',
  finances:    'Finances',
  connection:  'Connection',
  inner_game:  'Inner Game',
  'inner-game':'Inner Game',
  signal:      'Signal',
}

// Civ-domain labels (orgs / practices reference these)
export const CIV_DOMAIN_LABEL = {
  'human-being':    'Human Being',
  'society':        'Society',
  'nature':         'Nature',
  'technology':     'Technology',
  'finance-economy':'Finance & Economy',
  'legacy':         'Legacy',
  'vision':         'Vision',
}

// Bilateral artefact type labels
export const BILATERAL_LABEL = {
  podcast_embed:           'a podcast conversation',
  practitioner_relationship:'a practitioner relationship',
  sprint_buddy:            'a sprint-buddy commitment',
  collaboration_card:      'a collaboration',
}

// Contribution tier labels (for need-posted items)
export const TIER_LABEL = {
  micro:      'micro',
  tiny:       'tiny',
  small:      'small',
  medium:     'medium',
  large:      'large',
  xl:         'XL',
  benefactor: 'benefactor',
}
