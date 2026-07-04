#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// audit-design.js — NextUs design-law enforcement
//
// Scans src/ and reports every violation of the locked design
// laws with file:line, so drift is visible instead of buried.
//
//   node scripts/audit-design.js            — full report
//   node scripts/audit-design.js --summary  — counts only
//   node scripts/audit-design.js --law=size — one law only
//                  (laws: size, opacity, italic, svg, vh, gold, legacyfont)
//
// Exit code 1 if any violations — wire into CI/build when the
// backlog reaches zero:  "build": "node scripts/audit-design.js && vite build"
//
// THE LAWS
//   size       fontSize below 13px (or unitless <13)
//   opacity    ink text colours below the 0.55 opacity floor
//   italic     fontStyle italic — legal ONLY for user-authored
//              words; every hit needs a human verdict, so hits
//              are listed but can be whitelisted below once
//              confirmed as user-voice
//   svg        style= prop on an <svg> open tag (Chrome 148)
//   vh         100vh instead of 100dvh
//   gold       heritage-gold hex/rgba outside the approved whitelist.
//              THIS IS THE NO-BACKSLIDE MECHANISM for the Field Notes
//              / The Atlas retheme (see NextUs_Retheme_Master_Spec_v1.md
//              §4). Gold is legal ONLY in logo assets, beacon
//              components, and ≤3 explicitly approved moments.
//   legacyfont any Cormorant Garamond / Cormorant SC / Lora font-family
//              string — the retired type system. Fraunces / Newsreader
//              / IBM Plex Mono replace them everywhere.
// ─────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')

// Confirmed user-authored-voice italics — legal, skipped by the
// italic law. Add "relative/path.jsx:line-ish-context" entries
// only after a human confirms the italic wraps the user's words.
const ITALIC_WHITELIST = [
  'components/Wheel.jsx', // Horizon Goal text in the node detail card — user-authored
  // e.g. 'components/NorthStarPortal.jsx' — user messages in the chat
]

// Files where heritage gold is legal (Master Spec §4). Keep this
// list short and explicit — every entry is a deliberate call, not
// a convenience. Beacon components (constellation stars/sparks) and
// the mission-control tokens.js bridge (HERITAGE_GOLD export) are
// the baseline; add ≤3 additional approved moments here ONLY after
// sign-off, with a comment naming the moment.
const GOLD_WHITELIST = [
  'app/components/challenge/BeaconFire.jsx',
  'app/components/challenge/PublicBeacon.jsx',
  'app/components/challenge/BeaconLantern.jsx',
  'app/components/mission-control/BeaconStrip.jsx',
  'app/components/mission-control/tokens.js', // HERITAGE_GOLD bridge — see file header
  'lib/designTokens.js',                      // the `gold` export itself
  'global.css',                                // the --gold-heritage / --gold-glow CSS var declaration itself
  // e.g. 'app/components/mission-control/SettingsMissionPanel.jsx' — FOUNDER chip (approved moment 1/3)
]

const GOLD_HEX_RE = /#C8922A|#A8721A|#c8922a|#a8721a/g
const GOLD_RGBA_RE = /rgba\(\s*200,\s*146,\s*42|rgba\(\s*168,\s*114,\s*26/g
const LEGACYFONT_RE = /Cormorant(?:\s|\+)?Garamond|Cormorant(?:\s|\+)?SC|(?<![a-zA-Z-])Lora(?!x)/g

const args = process.argv.slice(2)
const summaryOnly = args.includes('--summary')
const lawFilter = (args.find(a => a.startsWith('--law=')) || '').replace('--law=', '') || null

// ── Collect files ────────────────────────────────────────────
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(jsx?|css)$/.test(e.name)) out.push(p)
  }
  return out
}

const files = walk(SRC)
const violations = { size: [], opacity: [], italic: [], svg: [], vh: [], gold: [], legacyfont: [] }

function rel(f) { return path.relative(path.join(__dirname, '..'), f) }
function lineOf(src, idx) { return src.slice(0, idx).split('\n').length }

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  const isCss = f.endsWith('.css')
  const r = rel(f)

  // ── size: fontSize below 13 ───────────────────────────────
  // JSX: fontSize: '11px' | fontSize: 11 | fontSize: `${x}px` (skipped — dynamic)
  // CSS: font-size: 11px
  const sizeRe = isCss
    ? /font-size:\s*(\d+(?:\.\d+)?)px/g
    : /fontSize:\s*['"`]?(\d+(?:\.\d+)?)(?:px)?['"`]?/g
  for (const m of src.matchAll(sizeRe)) {
    const v = parseFloat(m[1])
    if (v > 0 && v < 13) {
      violations.size.push(`${r}:${lineOf(src, m.index)}  fontSize ${v}px`)
    }
  }

  // ── opacity: ink text colour below 0.55 ──────────────────
  // Targets the ink rgba family rgba(15,21,35,X) used as a text
  // colour. Strokes/fills/borders/backgrounds are layout chrome,
  // not text — only flag when the property is color.
  const inkRe = isCss
    ? /(?<!-)color:\s*rgba\(15,\s*21,\s*35,\s*(0?\.\d+)\)/g
    : /(?<![a-zA-Z])color:\s*['"`]rgba\(15,\s*21,\s*35,\s*(0?\.\d+)\)['"`]/g
  for (const m of src.matchAll(inkRe)) {
    const v = parseFloat(m[1])
    if (v < 0.55) {
      violations.opacity.push(`${r}:${lineOf(src, m.index)}  ink text at ${v} (floor 0.55)`)
    }
  }

  // ── italic ────────────────────────────────────────────────
  if (!ITALIC_WHITELIST.some(w => r.includes(w))) {
    const italRe = isCss ? /font-style:\s*italic/g : /fontStyle:\s*['"`]italic['"`]/g
    for (const m of src.matchAll(italRe)) {
      violations.italic.push(`${r}:${lineOf(src, m.index)}  fontStyle italic — user-voice? whitelist; system text? remove`)
    }
  }

  // ── svg: style= inside an <svg ...> open tag ──────────────
  if (!isCss) {
    for (const m of src.matchAll(/<svg\b[^>]*>/gs)) {
      if (m[0].includes('style=')) {
        violations.svg.push(`${r}:${lineOf(src, m.index)}  style= on <svg> open tag (Chrome 148)`)
      }
    }
  }

  // ── vh: 100vh ─────────────────────────────────────────────
  for (const m of src.matchAll(/100vh/g)) {
    violations.vh.push(`${r}:${lineOf(src, m.index)}  100vh → use 100dvh`)
  }

  // ── gold: heritage gold outside the whitelist ─────────────
  if (!GOLD_WHITELIST.some(w => r.includes(w))) {
    for (const m of src.matchAll(GOLD_HEX_RE)) {
      violations.gold.push(`${r}:${lineOf(src, m.index)}  gold hex outside whitelist — replace with fn.moss/fn.clay or at.verdigris/at.brass`)
    }
    for (const m of src.matchAll(GOLD_RGBA_RE)) {
      violations.gold.push(`${r}:${lineOf(src, m.index)}  gold rgba outside whitelist — replace with fn.moss/fn.clay or at.verdigris/at.brass`)
    }
  }

  // ── legacyfont: retired Cormorant/Lora family strings ─────
  for (const m of src.matchAll(LEGACYFONT_RE)) {
    violations.legacyfont.push(`${r}:${lineOf(src, m.index)}  retired font "${m[0]}" — use Fraunces/Newsreader/IBM Plex Mono (designTokens.js: display/bodyFont/mono)`)
  }
}

// ── Report ───────────────────────────────────────────────────
const LAW_TITLES = {
  size:       'FONT SIZE BELOW 13px',
  opacity:    'INK TEXT BELOW 0.55 OPACITY',
  italic:     'ITALIC (needs human verdict: user-voice or violation)',
  svg:        'style= ON <svg> OPEN TAG (Chrome 148)',
  vh:         '100vh (use 100dvh)',
  gold:       'HERITAGE GOLD OUTSIDE WHITELIST (no-backslide law — see Master Spec §4)',
  legacyfont: 'RETIRED FONT (Cormorant/Lora — use Fraunces/Newsreader/IBM Plex Mono)',
}

let total = 0
for (const law of Object.keys(violations)) {
  if (lawFilter && law !== lawFilter) continue
  const v = violations[law]
  total += v.length
  console.log(`\n── ${LAW_TITLES[law]} — ${v.length}`)
  if (!summaryOnly) v.forEach(line => console.log('   ' + line))
}

console.log(`\n${total === 0 ? '✓ Clean — all design laws hold.' : `✗ ${total} violations.`}`)
process.exit(total === 0 ? 0 : 1)
