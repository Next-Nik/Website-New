// ─────────────────────────────────────────────────────────────
// tokens.js
//
// Named-export mirror, now sourced entirely from the single design
// system at src/lib/designTokens.js — no independent values live
// here. See NextUs_Retheme_Master_Spec_v1.md.
//
// Mission Control is where both rails meet: the Self stage (parchment
// cards, GOLD_* / BG_PARCHMENT / BG_CARD / TEXT_INK / TEXT_META /
// TEXT_FAINT) now maps to Field Notes tokens; the Civ stage (dark
// cards, BG_INK_SOFT / TEXT_WHITE_META / TEXT_WHITE_FAINT — used by
// WorldViewMissionPanel, CivDomainPanel, MissionWheel, IdentitySwitcher,
// PoleHeader, Tile, Panel, TopStrip, ActionCard, IdentityStrip, Ticker)
// now maps to The Atlas tokens. Names are unchanged so no consuming
// file needs to change — only the underlying values move.
//
// GOLD_* names are a heritage bridge: per the gold policy (Master
// Spec §4) gold itself is retired from general chrome. These names
// now point at Field Notes' moss (the equivalent "living accent"
// role gold used to play). Do not add new GOLD_* consumers — reach
// for fn.moss / at.verdigris from designTokens.js directly instead.
// ─────────────────────────────────────────────────────────────

import { fn, at, gold as heritageGold, display, mono, bodyFont } from '../../../lib/designTokens'

// Colour — Self stage (Field Notes)
export const GOLD       = fn.moss
export const GOLD_DK    = fn.ink
export const GOLD_LT    = fn.moss
export const GOLD_RULE  = fn.mossEdge
export const GOLD_FAINT = fn.mossTint
export const GOLD_HOVER = fn.mossTint

export const BG_PARCHMENT  = fn.ground
export const BG_PAGE       = fn.object
export const BG_CARD       = fn.object
export const BG_CARD_EMPTY = 'rgba(244,245,239,0.5)'
export const BG_INK        = at.ground   // dark-stage ground — Atlas sea ink.
// June 2026: was fn.ink (#26302A), the Field Notes graphite — a green-biased
// TEXT colour. Used as the planet-side page/bar/panel background it cast the
// whole dark stage olive. The civ stage maps to Atlas tokens; its ground is
// at.ground. fn.ink remains TEXT_INK below — text only, never a surface.
export const BG_WARM       = fn.ground

export const TEXT_INK         = fn.ink
export const TEXT_META        = fn.meta
export const TEXT_FAINT       = fn.ghost

// Colour — Civ stage (The Atlas)
export const BG_INK_SOFT      = at.object
export const TEXT_WHITE       = at.text
export const TEXT_WHITE_META  = at.meta
export const TEXT_WHITE_FAINT = at.ghost

// Heritage gold — only for the ≤3 explicitly approved moments
// (FOUNDER chip, North Star mark, Stretch completion seal) and
// beacon components. See designTokens.js `gold`.
export const HERITAGE_GOLD = heritageGold.base

// Type
export const FONT_DISPLAY = display.fontFamily
export const FONT_SC      = mono.fontFamily
export const FONT_BODY    = bodyFont.fontFamily

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
