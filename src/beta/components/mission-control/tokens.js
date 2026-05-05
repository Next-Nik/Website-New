// ─────────────────────────────────────────────────────────────
// tokens.js
//
// Named-export mirror of the Mission Control v4 CSS variables and
// the existing global.css tokens. Inline-style consumers import
// from here; CSS-string consumers can use var(--gold) etc. as the
// global stylesheet already defines them.
//
// One source of truth — if a value changes in global.css, mirror
// it here.
// ─────────────────────────────────────────────────────────────

// Colour
export const GOLD       = '#C8922A'
export const GOLD_DK    = '#A8721A'
export const GOLD_RULE  = 'rgba(200, 146, 42, 0.20)'
export const GOLD_FAINT = 'rgba(200, 146, 42, 0.05)'
export const GOLD_HOVER = 'rgba(200, 146, 42, 0.08)'

export const BG_PARCHMENT = '#FAFAF7'
export const BG_PAGE      = '#FFFFFF'
export const BG_INK       = '#0F1523'
export const BG_WARM      = '#F5F2EC'

export const TEXT_INK   = '#0F1523'
export const TEXT_META  = 'rgba(15, 21, 35, 0.72)'
export const TEXT_FAINT = 'rgba(15, 21, 35, 0.40)'
export const TEXT_WHITE = '#FFFFFF'

// Type
export const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif"
export const FONT_SC      = "'Cormorant SC', Georgia, serif"
export const FONT_BODY    = "'Lora', Georgia, serif"

// Layout
export const TILE_W = 78          // side-rail tile width on desktop
export const PANEL_MAX_W = 760    // overlay panel width
export const BREAKPOINT_NARROW = 880  // below this, rails become horizontal strips

// Convenience grouped export for inline-style consumers
export const tokens = {
  gold: GOLD, goldDk: GOLD_DK, goldRule: GOLD_RULE,
  goldFaint: GOLD_FAINT, goldHover: GOLD_HOVER,
  bgParchment: BG_PARCHMENT, bgPage: BG_PAGE, bgInk: BG_INK, bgWarm: BG_WARM,
  textInk: TEXT_INK, textMeta: TEXT_META, textFaint: TEXT_FAINT, textWhite: TEXT_WHITE,
  fontDisplay: FONT_DISPLAY, fontSc: FONT_SC, fontBody: FONT_BODY,
  tileW: TILE_W, panelMaxW: PANEL_MAX_W, breakpointNarrow: BREAKPOINT_NARROW,
}

export default tokens
