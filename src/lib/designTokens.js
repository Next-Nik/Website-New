/**
 * NextUs Design System — Shared Tokens
 * Single source of truth for BOTH rails. Import these instead of
 * defining local consts. See NextUs_Retheme_Master_Spec_v1.md.
 *
 * Usage:
 *   import { fn, at, gold, space, shadow, fnText, atText } from '../../lib/designTokens'
 *   // adjust relative path as needed
 *
 * RAIL BOUNDARY
 *   Field Notes (fn.*)  — personal surfaces + shared chrome (nav, footer,
 *                         homepage, auth). Daylight is the front door.
 *   The Atlas    (at.*) — civilisational surfaces (Atlas, constellations,
 *                         actor pages, PlanetMap, Earth Challenge).
 *   When genuinely ambiguous, default to Field Notes.
 */

/* ── Field Notes — personal rail + shared chrome ──────────────── */
export const fn = {
  ground:    '#E9EDE4',                    // sage paper — page background
  object:    '#F4F5EF',                    // leaf — cards, panels, modals
  ink:       '#26302A',                    // graphite — primary text
  moss:      '#6E7F5C',                    // living — active, progress, sync-ok, primary actions
  mossTint:  'rgba(110,127,92,0.08)',
  mossEdge:  'rgba(110,127,92,0.30)',
  clay:      '#B45A3C',                    // attention — needs-you, warnings
  clayTint:  'rgba(180,90,60,0.08)',
  clayEdge:  'rgba(180,90,60,0.35)',
  meta:      'rgba(38,48,42,0.68)',        // secondary text
  ghost:     'rgba(38,48,42,0.55)',        // floor — nothing below
  rule:      'rgba(38,48,42,0.14)',        // hairlines, dividers
}

/* ── The Atlas — civilisational rail ──────────────────────────── */
export const at = {
  ground:        '#10222B',                     // sea ink — page background
  grid:          'rgba(217,226,221,0.05)',       // survey grid lines (56px cell)
  object:        '#16303B',                      // chart panel — cards
  text:          '#EAF1ED',                      // display text on ground
  meta:          'rgba(217,226,221,0.66)',       // secondary text
  ghost:         'rgba(217,226,221,0.50)',       // floor — nothing below
  verdigris:     '#58A08A',                      // living systems — active, progress-start, sync-ok
  verdigrisEdge: 'rgba(88,160,138,0.30)',        // card borders
  brass:         '#D9B24A',                      // human coordination — calls, chips, progress-end
  brassEdge:     'rgba(217,178,74,0.40)',
}

/* ── Heritage gold — TIGHTLY SCOPED. See Master Spec §4. ───────
 * Legal ONLY in: the logo/wordmark, beacon components (BeaconStrip,
 * BeaconFire, constellation stars/sparks), and ≤3 explicitly
 * approved moments (North Star mark, Stretch completion seal,
 * FOUNDER chip). Nowhere else. Enforced by scripts/audit-design.js
 * `gold` law — do not add new usages without updating that whitelist
 * AND getting sign-off; this is the no-backslide mechanism.
 */
export const gold = {
  base: '#C8922A',
  glow: 'rgba(200,146,42,0.55)',   // beacon halo only
}

/* ── Shared spacing scale — both rails ────────────────────────── */
export const space = {
  xs:  '4px',
  sm:  '8px',
  md:  '12px',
  lg:  '16px',
  xl:  '24px',
  xxl: '32px',
  xxxl:'48px',
  huge:'72px',
}

/* ── Shadow pair — one physics, two media ─────────────────────
 * Field Notes: paper casts shadow (warm, ink-based).
 * The Atlas:   objects lift with light + depth (black-based, plus
 *              a light top edge on interactive cards).
 * Apply ONLY to interactive objects. Static panels stay flat with
 * hairline rules.
 */
export const shadow = {
  fn: {
    rest: '0 1px 2px rgba(38,48,42,.08), 0 6px 16px rgba(38,48,42,.07)',
    lift: '0 2px 4px rgba(38,48,42,.10), 0 12px 28px rgba(38,48,42,.12)',
  },
  at: {
    rest: '0 2px 6px rgba(0,0,0,.35), 0 12px 30px rgba(0,0,0,.30)',
    lift: '0 4px 10px rgba(0,0,0,.45), 0 22px 48px rgba(0,0,0,.42)',
    liftEdge: '1px solid rgba(255,255,255,.08)', // border-top for lifted cards
  },
}

/**
 * Typography spreads — use with object spread: { ...display, fontSize: '28px' }
 *
 * display  → Fraunces:      "the thing" — titles, card headings, ≥18px
 * bodyFont → Newsreader:    reading text, meta, user voice
 * mono     → IBM Plex Mono: chrome — eyebrows, labels, status, coordinates
 */
export const display  = { fontFamily: "'Fraunces', Georgia, serif" }
export const bodyFont = { fontFamily: "'Newsreader', Georgia, serif" }
export const mono     = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }

/**
 * Text presets — locked compositions with the floors baked in.
 * Two families, one per rail, identical ratios so the rails read
 * as siblings. Override what you must (fontSize up, color to a
 * domain hex), never below the floors: 13px minimum, 0.55 opacity
 * minimum.
 *
 *   <span style={{ ...fnText.eyebrow }}>ALREADY ON THE MAP</span>
 *   <h2 style={{ ...atText.heading, fontSize: '32px' }}>…</h2>
 */
export const fnText = {
  eyebrow: { ...mono, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: fn.ghost },
  chrome:  { ...mono, fontSize: '13px', letterSpacing: '0.14em', color: fn.meta },
  heading: { ...display, fontSize: '20px', fontWeight: 500, color: fn.ink, lineHeight: 1.15 },
  body:    { ...bodyFont, fontSize: '15px', lineHeight: 1.65, color: fn.meta },
  caption: { ...bodyFont, fontSize: '13px', lineHeight: 1.5, color: fn.ghost },
  // Italic is reserved for user-authored words — the ONLY preset that carries it.
  userVoice: { ...bodyFont, fontSize: '15px', fontStyle: 'italic', lineHeight: 1.6, color: fn.ink },
}

export const atText = {
  eyebrow: { ...mono, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: at.ghost },
  chrome:  { ...mono, fontSize: '13px', letterSpacing: '0.14em', color: at.meta },
  heading: { ...display, fontSize: '20px', fontWeight: 500, color: at.text, lineHeight: 1.15 },
  body:    { ...bodyFont, fontSize: '15px', lineHeight: 1.65, color: at.meta },
  caption: { ...bodyFont, fontSize: '13px', lineHeight: 1.5, color: at.ghost },
  userVoice: { ...bodyFont, fontSize: '15px', fontStyle: 'italic', lineHeight: 1.6, color: at.text },
}

/* ── Status chrome — identical vocabulary both rails ──────────
 * "● synced" / "saving…" / "⚠ retrying" — 13px mono, ghost opacity,
 * consistent position (card footer or header-right). Dot colour
 * varies by rail; text stays put.
 */
export const statusDot = {
  fn: { synced: fn.moss, saving: fn.ghost, error: fn.clay },
  at: { synced: at.verdigris, saving: at.ghost, error: '#C97064' }, // desaturated red on dark
}

/* ── Legacy re-exports (temporary bridge — remove once every
 *    consumer has migrated off the old names during Phase 2/3) ──
 */
export const tokens = {
  bg:          fn.ground,
  bgCard:      fn.object,
  dark:        fn.ink,
  meta:        fn.meta,
  ghost:       fn.ghost,
  whisper:     fn.ghost,

  /* Legacy `gold*` names — REQUIRED. Kept as Field Notes moss/ink
   * aliases (NOT heritage gold). ~170 call sites across the daily
   * suite, Journal, Training, and challenge surfaces still reference
   * these; removing them resolves every one to `undefined` and
   * renders solid buttons invisible (white text, no background).
   * New code should import fn.* directly — these exist so existing
   * surfaces stay visible until each is migrated. */
  gold:        fn.ink,                      // emphasis text
  goldDk:      fn.ink,                      // stronger emphasis text
  goldChrome:  fn.moss,                     // primary actions, active borders
  goldRule:    fn.mossEdge,                 // hairlines on interactive cards
  goldFaint:   'rgba(110,127,92,0.12)',     // resting borders, quiet fills
  goldTint:    fn.mossTint,                 // tinted panels
  goldStrong:  'rgba(110,127,92,0.45)',     // pulse/glow start colour
  goldGlow:    'rgba(110,127,92,0.30)',     // soft glow
}
export const serif = display
export const body  = bodyFont
export const sc     = mono
export const text  = fnText
