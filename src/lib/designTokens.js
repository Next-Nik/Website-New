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
  ground:    '#f3f0e9',                    // Omega-bright warm cream — page background
  object:    '#ffffff',                    // card / raised surface
  surface2:  '#eae5da',                    // recessed / stat tiles
  ink:       '#262420',                    // warm ink — primary text
  moss:      '#4c6b45',                    // living accent · My Life pole
  mossTint:  'rgba(76,107,69,0.08)',
  mossEdge:  'rgba(76,107,69,0.30)',
  clay:      '#a9743f',                    // attention accent · Our Planet pole
  clayTint:  'rgba(169,116,63,0.08)',
  clayEdge:  'rgba(169,116,63,0.35)',
  gold:      '#cf9a24',                    // scarf-gold — the NextUs wordmark `Us`
  meta:      'rgba(38,36,32,0.68)',        // secondary text
  ghost:     'rgba(38,36,32,0.58)',        // floor — nothing below
  rule:      'rgba(38,36,32,0.11)',        // hairlines, dividers
}

/* ── The Atlas — civilisational rail ──────────────────────────────
 * RETHEMED bright (July 2026). The dark sea-ink theme is retired; the
 * Atlas rail now shares the one bright warm ground of the four-beat
 * system. Ground/text flip together as a pair, so every token-driven
 * Atlas page stays readable through the flip. Accents map by hue:
 * verdigris (living/green) → moss, brass (coordination/warm) → clay.
 * The few intentionally-dark instrument frames on Mission Control read
 * the PINNED literals in mission-control/tokens.js, not these tokens.
 */
export const at = {
  ground:        '#f3f0e9',                      // was sea ink — now bright warm ground
  grid:          'rgba(38,36,32,0.05)',          // survey grid lines on light
  object:        '#ffffff',                      // chart panel — cards
  text:          '#262420',                      // display text (dark ink on bright)
  meta:          'rgba(38,36,32,0.66)',          // secondary text
  ghost:         'rgba(38,36,32,0.58)',          // floor — nothing below (0.55 floor honoured)
  verdigris:     '#4c6b45',                      // living systems → moss
  verdigrisEdge: 'rgba(76,107,69,0.30)',         // card borders
  brass:         '#a9743f',                       // human coordination → clay
  brassEdge:     'rgba(169,116,63,0.40)',
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
    // Rethemed bright: warm ink-based, matching the four-beat home shadow.
    rest: '0 1px 2px rgba(38,36,32,.06), 0 10px 32px rgba(38,36,32,.08)',
    lift: '0 4px 10px rgba(38,36,32,.10), 0 22px 48px rgba(38,36,32,.12)',
    liftEdge: '1px solid rgba(38,36,32,.06)', // border-top for lifted cards
  },
}

/**
 * Typography spreads — use with object spread: { ...display, fontSize: '28px' }
 *
 * display  → Cormorant Garamond:      "the thing" — titles, card headings, ≥18px
 * bodyFont → Lora:    reading text, meta, user voice
 * mono     → Cormorant SC: chrome — eyebrows, labels, status, coordinates
 */
export const display  = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
export const bodyFont = { fontFamily: "'Lora', Georgia, serif" }
export const mono     = { fontFamily: "'Cormorant SC', Georgia, serif" }

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
