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
