// src/components/mission-control/tokens.js
//
// Minimal bridge for the legacy mission-control tree. Mirrors the
// Field Notes mapping used by the app-tree's
// src/app/components/mission-control/tokens.js, for the handful of
// legacy components (ComposeMessage, MessagesMissionPanel,
// MyInterestsPanel) that reference a local './tokens' import which
// never existed in this folder — found while sweeping for gold/
// legacyfont violations. These panels are Self-stage (Field Notes),
// so everything below maps to fn.*.
import { fn, display } from '../../lib/designTokens'

export const GOLD       = fn.moss
export const GOLD_DK    = fn.ink
export const GOLD_LT    = fn.moss
export const GOLD_RULE  = fn.mossEdge
export const GOLD_FAINT = fn.mossTint
export const GOLD_HOVER = fn.mossTint

export const TEXT_INK  = fn.ink
export const TEXT_META = fn.meta

export const FONT_DISPLAY = display.fontFamily
