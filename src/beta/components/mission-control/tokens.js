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
//
// v4 additions: GOLD_LT (light-mode active emphasis), BG_INK_SOFT
// (cards on the dark civ stage), TEXT_WHITE_META and TEXT_WHITE_FAINT
// (meta hierarchy on dark backgrounds), BG_CARD and BG_CARD_EMPTY
// (the parchment-card surfaces used on the personal stage).
// ─────────────────────────────────────────────────────────────

// Colour
export const GOLD       = '#C8922A'
export const GOLD_DK    = '#A8721A'
export const GOLD_LT    = '#D4A744'
export const GOLD_RULE  = 'rgba(200, 146, 42, 0.20)'
export const GOLD_FAINT = 'rgba(200, 146, 42, 0.05)'
export const GOLD_HOVER = 'rgba(200, 146, 42, 0.08)'

export const BG_PARCHMENT  = '#FAFAF7'
export const BG_PAGE       = '#FFFFFF'
export const BG_CARD       = '#FDFCF8'
export const BG_CARD_EMPTY = 'rgba(253, 252, 248, 0.5)'
export const BG_INK        = '#0F1523'
export const BG_INK_SOFT   = '#1A2030'
export const BG_WARM       = '#F5F2EC'

export const TEXT_INK         = '#0F1523'
export const TEXT_META        = 'rgba(15, 21, 35, 0.72)'
export const TEXT_FAINT       = 'rgba(15, 21, 35, 0.40)'
export const TEXT_WHITE       = '#FFFFFF'
export const TEXT_WHITE_META  = 'rgba(255, 255, 255, 0.72)'
export const TEXT_WHITE_FAINT = 'rgba(255, 255, 255, 0.40)'

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
  gold: GOLD, goldDk: GOLD_DK, goldLt: GOLD_LT, goldRule: GOLD_RULE,
  goldFaint: GOLD_FAINT, goldHover: GOLD_HOVER,
  bgParchment: BG_PARCHMENT, bgPage: BG_PAGE,
  bgCard: BG_CARD, bgCardEmpty: BG_CARD_EMPTY,
  bgInk: BG_INK, bgInkSoft: BG_INK_SOFT, bgWarm: BG_WARM,
  textInk: TEXT_INK, textMeta: TEXT_META, textFaint: TEXT_FAINT,
  textWhite: TEXT_WHITE, textWhiteMeta: TEXT_WHITE_META, textWhiteFaint: TEXT_WHITE_FAINT,
  fontDisplay: FONT_DISPLAY, fontSc: FONT_SC, fontBody: FONT_BODY,
  tileW: TILE_W, panelMaxW: PANEL_MAX_W, breakpointNarrow: BREAKPOINT_NARROW,
}

export default tokens
