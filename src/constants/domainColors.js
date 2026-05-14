// ─────────────────────────────────────────────────────────────
// domainColors.js
//
// Single source of truth for the seven personal-domain colours
// and their civilisational counterparts. Locked in May 2026.
//
// The seven domains carry colour identity. Tools, navigation,
// chrome, and the user's own placement polygon all stay GOLD —
// gold is the platform through-line, not a domain colour.
//
// Three colour stops per domain:
//   base    — the saturated colour. Used on stripes, dots, labels
//             on dark surfaces, or full-saturation card grounds.
//   light   — the same hue lifted for use as a label on parchment
//             (or a darker saturated stop on light card grounds).
//   dark    — the same hue dimmed/saturated for label use on dark
//             grounds (or as a stripe colour on dark cards).
//
// Two rules to remember when reading these:
//   1. Finances is yellow. Yellow demands DARK text on top, never
//      white. The `textOnBase` field declares this per-domain.
//   2. Gold (#C8922A / #A8721A) is reserved for platform chrome.
//      The Path 'base' is maroon, not gold — gold sits beside the
//      seven, not inside them.
// ─────────────────────────────────────────────────────────────

export const DOMAIN_COLORS = {
  path: {
    base:        '#6B1F2E',  // maroon — the deep through-line
    light:       '#6B1F2E',  // label colour on parchment
    dark:        '#F5A8B2',  // label colour on ink
    tint:        'rgba(107, 31, 46, 0.06)',
    tintDark:    'rgba(107, 31, 46, 0.20)',
    border:      'rgba(107, 31, 46, 0.32)',
    textOnBase:  '#FFFFFF',
  },
  spark: {
    base:        '#E8722E',  // orange — the godspark, fire lit
    light:       '#B85217',
    dark:        '#FFB57A',
    tint:        'rgba(232, 114, 46, 0.06)',
    tintDark:    'rgba(232, 114, 46, 0.20)',
    border:      'rgba(232, 114, 46, 0.30)',
    textOnBase:  '#FFFFFF',
  },
  body: {
    base:        '#2A8C4F',  // green — Nature, the living instrument
    light:       '#1F6B3B',
    dark:        '#7FD9A0',
    tint:        'rgba(42, 140, 79, 0.06)',
    tintDark:    'rgba(42, 140, 79, 0.22)',
    border:      'rgba(42, 140, 79, 0.30)',
    textOnBase:  '#FFFFFF',
  },
  finances: {
    base:        '#E8B92E',  // yellow — agency, currency, sun, fuel
    light:       '#8C6E10',  // dark text on yellow needs deep amber
    dark:        '#FFE078',  // label on ink
    tint:        'rgba(232, 185, 46, 0.08)',
    tintDark:    'rgba(232, 185, 46, 0.22)',
    border:      'rgba(217, 169, 30, 0.32)',
    textOnBase:  '#3A2E0A',  // DARK text on yellow base
  },
  connection: {
    base:        '#D63838',  // red — heart, blood, warmth
    light:       '#A82828',
    dark:        '#FF9999',
    tint:        'rgba(214, 56, 56, 0.06)',
    tintDark:    'rgba(214, 56, 56, 0.22)',
    border:      'rgba(214, 56, 56, 0.30)',
    textOnBase:  '#FFFFFF',
  },
  inner_game: {
    base:        '#2767B8',  // blue — the deep interior, still water
    light:       '#1A4F94',
    dark:        '#A8C8F0',
    tint:        'rgba(39, 103, 184, 0.06)',
    tintDark:    'rgba(39, 103, 184, 0.22)',
    border:      'rgba(39, 103, 184, 0.30)',
    textOnBase:  '#FFFFFF',
  },
  signal: {
    base:        '#6B3FA8',  // purple — broadcast, transmission, frequency
    light:       '#4F2D85',
    dark:        '#C8A8E8',
    tint:        'rgba(107, 63, 168, 0.06)',
    tintDark:    'rgba(107, 63, 168, 0.24)',
    border:      'rgba(107, 63, 168, 0.32)',
    textOnBase:  '#FFFFFF',
  },
}

// Self → NextUs fractal connections (canon, locked):
//   Path        → Vision
//   Spark       → Human Being
//   Body        → Nature
//   Finances    → Finance & Economy
//   Connection  → Society
//   Inner Game  → Legacy
//   Signal      → Technology
//
// Civilisational domains inherit their fractal counterpart's colour
// so that a user holding 'Path' on the Self side and 'Vision' on
// the World side reads as the same territory at different scales.

export const CIV_COLORS = {
  vision:    DOMAIN_COLORS.path,         // Path → Vision
  human:     DOMAIN_COLORS.spark,        // Spark → Human Being
  nature:    DOMAIN_COLORS.body,         // Body → Nature
  finance:   DOMAIN_COLORS.finances,     // Finances → Finance & Economy
  society:   DOMAIN_COLORS.connection,   // Connection → Society
  legacy:    DOMAIN_COLORS.inner_game,   // Inner Game → Legacy
  tech:      DOMAIN_COLORS.signal,       // Signal → Technology
}

// Convenience getters. Both fall back to gold if the key is unknown,
// which keeps unfamiliar surfaces from rendering broken.
export function selfColor(key) {
  return DOMAIN_COLORS[key] || {
    base: '#A8721A', light: '#A8721A', dark: '#C8922A',
    tint: 'rgba(200,146,42,0.05)',
    tintDark: 'rgba(200,146,42,0.18)',
    border: 'rgba(200,146,42,0.32)',
    textOnBase: '#FFFFFF',
  }
}

export function civColor(key) {
  return CIV_COLORS[key] || selfColor(key)
}

// Legacy getter — accepts either Self or Civ keys, tries Self first,
// falls back to Civ. Components that don't yet know which scale they
// represent can call this and get the right colour either way.
export function domainColor(key) {
  if (DOMAIN_COLORS[key]) return DOMAIN_COLORS[key]
  if (CIV_COLORS[key])    return CIV_COLORS[key]
  return selfColor(key)
}

// Ordered key arrays — useful when iterating in canonical order.
export const SELF_KEYS_ORDERED = [
  'path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal',
]

export const CIV_KEYS_ORDERED = [
  'vision', 'human', 'nature', 'finance', 'society', 'legacy', 'tech',
]
