/**
 * NextUs Design System — Shared Tokens
 * Single source of truth. Import these instead of defining local consts.
 *
 * Usage:
 *   import { tokens, serif, body, sc } from '../../lib/designTokens'
 *   // adjust relative path as needed
 */

export const tokens = {
  bg:          '#FAFAF7',
  bgCard:      '#FFFFFF',
  dark:        '#0F1523',
  gold:        '#A8721A',          // text only — never use on chrome/borders
  goldChrome:  '#C8922A',          // chrome/borders only — never use on text
  goldFaint:   'rgba(200,146,42,0.20)',
  goldTint:    'rgba(200,146,42,0.05)',
  goldGlow:    'rgba(200,146,42,0.10)',
  goldStrong:  'rgba(200,146,42,0.35)',
  meta:        'rgba(15,21,35,0.88)',
  ghost:       'rgba(15,21,35,0.55)',
  whisper:     'rgba(15,21,35,0.55)',  // floor — nothing below this
}

/**
 * Typography spreads — use with object spread: { ...serif, fontSize: '28px' }
 *
 * serif  → Cormorant Garamond: headings/display ≥18px, weight 300
 * body   → Lora:               body/reading text, weight 400
 * sc     → Cormorant SC:       all UI chrome at any size
 */
export const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
export const body  = { fontFamily: "'Lora', Georgia, serif" }
export const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

/**
 * Text presets — locked compositions with the floors baked in.
 * Spread one of these instead of hand-assembling font/size/color.
 * Override what you must (fontSize up, color to a domain hex),
 * never below the floors: 13px minimum, 0.55 opacity minimum.
 *
 *   <span style={{ ...text.eyebrow }}>ALREADY ON THE MAP</span>
 *   <h2 style={{ ...text.heading, fontSize: '32px' }}>…</h2>
 *   <p style={{ ...text.body }}>…</p>
 *   <span style={{ ...text.caption }}>meta / labels / smallest legal text</span>
 *   <em style={{ ...text.userVoice }}>{theirWords}</em>   // ONLY user-authored words
 */
export const text = {
  // Cormorant SC chrome label — the floor size, tracked out, gold.
  eyebrow: {
    ...sc,
    fontSize: '13px',
    letterSpacing: '0.22em',
    color: tokens.gold,
  },
  // Cormorant SC chrome at ink — tabs, buttons, nav items.
  chrome: {
    ...sc,
    fontSize: '13px',
    letterSpacing: '0.14em',
    color: tokens.meta,
  },
  // Cormorant Garamond display — never below 18px, weight 300.
  heading: {
    ...serif,
    fontSize: '18px',
    fontWeight: 300,
    color: tokens.dark,
    lineHeight: 1.25,
  },
  // Lora reading text.
  body: {
    ...body,
    fontSize: '15px',
    lineHeight: 1.65,
    color: tokens.meta,
  },
  // The smallest, quietest text that is still legal:
  // 13px at the 0.55 opacity floor. If you're reaching for
  // 11px or rgba(...,0.4), reach for this instead.
  caption: {
    ...body,
    fontSize: '13px',
    lineHeight: 1.5,
    color: tokens.ghost,
  },
  // Italic is reserved for user-authored words — this is the ONLY
  // preset that carries it. System text is never italic.
  userVoice: {
    ...body,
    fontSize: '15px',
    fontStyle: 'italic',
    lineHeight: 1.6,
    color: tokens.meta,
  },
}
