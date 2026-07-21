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
//                  (laws: size, opacity, italic, svg, vh, gold, legacyfont,
//                   orphantoken)
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
//   orphantoken  a dot-access on a shared token object (tokens/fn/at/
//              gold/space/shadow/fnText/atText, imported from
//              designTokens.js, or a same-named local const in the
//              same file) whose property doesn't exist in that
//              object's current key set. THIS IS THE NO-BACKSLIDE
//              MECHANISM for the invisible-button class of bug: a
//              missing key resolves to `undefined`, not an error —
//              `background: undefined` renders as no background at
//              all, silently, on whatever surface sits behind it.
//              Caught here at build time instead of by a screenshot.
//              See "Shared token contract" rule in Working_With_Nik.
// ─────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')

// Confirmed user-authored-voice italics — legal, skipped by the
// italic law. Add "relative/path.jsx:line-ish-context" entries
// only after a human confirms the italic wraps the user's words.
const ITALIC_WHITELIST = [
  'components/Wheel.jsx', // Horizon Goal text in the node detail card — user-authored
  'pages/Dashboard.jsx', // avatar/Horizon Self/horizon-goal/purpose statement quotes — all user-authored
  'tools/map/Map.jsx', // avatar/reality/horizon draft text — all user-authored, including the horizon textarea itself
  'mission-control/TargetSprintMissionPanel.jsx', // {goal} — the user's own target-goal text
  'tools/purpose-piece/PurposePiece.jsx', // {horizonGoal} and the user chat bubble — user-authored
  'tools/nextu/HorizonSelfOnboarding.jsx', // user text-input fields + I Am/life statements — user-authored
  'tools/horizon-state/HorizonState.jsx', // {lifeIaStatement} — the user's own I Am statement
  'mission-control/ProfileMissionPanel.jsx', // Horizon Self text input + the user's own quoted statement
  'self-explorer/SelfPanel.module.css', // .horizonGoal / .lifeMission — user's own goal/mission text
  'mission-control/TargetSprintSlider.jsx', // {goal} — the user's own target-goal text
  'tools/target-sprint/TargetSprint.jsx', // {ia}/{horizonSelfStatement}/{iaStatements} — user-authored statements
  'tools/nextu/IAmChapter.jsx', // I Am statement text inputs + declared statements — user-authored
  'domain-explorer/DomainPanel.module.css', // .horizonGoal / .goalScope — the user's own goal sentence
  'app/pages/OrgPublic.jsx', // {item.why} — the actor's own self-authored "why" statement
  'app/pages/AdminConsole.jsx', // {c.note}/{s}/{r.message} — real people's own submitted messages/quotes
  'pages/OrgPublic.jsx', // duplicate tree (src/pages) — same {item.why} user-voice as app/pages copy
  'pages/AdminConsole.jsx', // duplicate tree (src/pages) — same {c.note}/{s}/{r.message} user-voice
  'pages/Search.jsx', // duplicate tree (src/pages) — same {actor.tagline} user-voice as app/pages copy
  'mission-control/MapMissionPanel.jsx', // {previewText} — the user's own horizon text
  'mission-control/HorizonPracticeMissionPanel.jsx', // horizonSelf/lifeHorizon/iaStatement — user-authored
  'tools/nextu/NextUJourney.jsx', // I Am statements + synthesised statement — user-authored
  'tools/nextu/HorizonBiography.jsx', // user's own biography textarea and text
  'lib/designTokens.js', // the userVoice preset definition itself (fnText.userVoice / atText.userVoice)
  'self-explorer/SelfExplorer.module.css', // .overviewGoal / .idleItemMission — user's own goal/mission text
  'app/pages/Search.jsx', // {actor.tagline} — the actor's own self-authored tagline
  'ProfileIAStatements.jsx', // {statement} — the user's own I Am statement
  'ProfileIdentityStrip.jsx', // {primaryIAStatement} — the user's own I Am statement
  'SprintSlate.jsx', // {dd[domains[0]].goal} — the user's own target-sprint goal
  'daily/DailySessionPanel.jsx', // {lifeIaStatement} — the user's own I Am statement
  'daily/MiddayRecenter.jsx', // {horizonSelfStatement} — explicitly commented user-authored
  'daily/blocks/Readiness.jsx', // {horizonSelfStatement} — the user's own Horizon Self statement
  'feed/items/IAStatementItem.jsx', // {cleanStatement} — the user's own I Am statement
  'feed/items/SprintLaunchedItem.jsx', // {horizonGoal} — the user's own horizon goal
  'mission-control/ComposeMessage.jsx', // {recipient.tagline} — the recipient's own self-authored tagline
  'app/pages/ChallengePage.jsx', // {r.reflection} — participants' own shared reflections
  'app/pages/Claim.jsx', // {actor.tagline} — the actor's own self-authored tagline
  'tools/horizon-practice/HorizonPractice.jsx', // {orderedIam[iamIdx].full} — the user's own I Am statement
  'components/NorthStarPortal.jsx', // user chat bubble (m.role === 'user') — the user's own message
  'app/pages/HorizonDeclare.jsx', // BP-8 · the declared horizon line + its input — user-authored, verbatim
  'mission-control/HorizonBanner.jsx', // BP-8 · {declaration.line} — the user's own declared horizon
  'app/pages/DailySurface.jsx', // BP-8 · {moment.line} + {horizonLine} step-toward — both user-authored
  'components/MomentCapture.jsx', // BP-8 · {horizonLine} step-toward on the saved state — user-authored
  'app/pages/CirclePage.jsx', // BP-14 · {focus_line}/{offered_horizon_text}/{moment.line} — members' own offered words
  'app/pages/Trails.jsx', // BP-16 · {horizon} — the walker's own declared horizon
  'app/pages/TrailPage.jsx', // BP-16 · {horizon_text} — the walker's own declared horizon
  'app/pages/BoardPage.jsx', // BP-16 · {moment.line} on the path layer — the walker's own words
  'app/pages/NorthStar.jsx', // BP-18 · {horizon} + North Star synthesis — the person's own words
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
  'constants/horizonScalePlanet.js',           // "Finance & Economy" domain-identity colour — file is
                                                // locked ("do not modify without explicit instruction");
                                                // this is a domain hue, not decorative chrome. Flagged
                                                // for Nik — happy to swap the domain's colour if wanted.
  'constants/domainColors.js',                 // Locked May 2026. Gold appears once, as the defensive
                                                // fallback colour in selfColor()/civColor() for unknown
                                                // domain keys ("keeps unfamiliar surfaces from rendering
                                                // broken") — not a domain identity colour. Flagged for
                                                // Nik rather than edited, since the file is locked.
  // e.g. 'app/components/mission-control/SettingsMissionPanel.jsx' — FOUNDER chip (approved moment 1/3)
]

const GOLD_HEX_RE = /#C8922A|#A8721A|#c8922a|#a8721a/g
const GOLD_RGBA_RE = /rgba\(\s*200,\s*146,\s*42|rgba\(\s*168,\s*114,\s*26/g
const LEGACYFONT_RE = /Cormorant(?:\s|\+)?Garamond|Cormorant(?:\s|\+)?SC|(?<![a-zA-Z-])Lora(?!x)/g

// ── orphantoken: canonical keys from the single source of truth ──
// Regex-parsed (this script has no ESM/TS loader) — one level deep,
// which is all these objects ever nest. Add a name here if
// designTokens.js grows a new shared object.
const TRACKED_TOKEN_NAMES = ['tokens', 'fn', 'at', 'gold', 'space', 'shadow', 'fnText', 'atText']

function extractObjectKeys(src, constName) {
  const re = new RegExp(`(?:export\\s+)?const\\s+${constName}\\s*=\\s*\\{`)
  const m = re.exec(src)
  if (!m) return null
  let depth = 0, i = m.index + m[0].length - 1
  const start = i
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') { depth--; if (depth === 0) break }
  }
  const body = src.slice(start + 1, i)
  return new Set([...body.matchAll(/^\s{0,4}([A-Za-z_][A-Za-z0-9_]*)\s*:/gm)].map(mm => mm[1]))
}

const designTokensSrc = fs.readFileSync(path.join(SRC, 'lib', 'designTokens.js'), 'utf8')
const CANONICAL_KEYS = {}
for (const name of TRACKED_TOKEN_NAMES) {
  const keys = extractObjectKeys(designTokensSrc, name)
  if (keys) CANONICAL_KEYS[name] = keys
}

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
const violations = { size: [], opacity: [], italic: [], svg: [], vh: [], gold: [], legacyfont: [], orphantoken: [] }

function rel(f) { return path.relative(path.join(__dirname, '..'), f) }
function lineOf(src, idx) { return src.slice(0, idx).split('\n').length }

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  const isCss = f.endsWith('.css')
  const r = rel(f)

  // ── size: fontSize below 13 ───────────────────────────────
  // JSX: fontSize: '11px' | fontSize: 11 | fontSize: `${x}px` (skipped — dynamic)
  // CSS: font-size: 11px
  // The lookahead requires the number (with optional "px") to be
  // immediately followed by an actual value terminator — a quote,
  // comma, brace, paren, semicolon, whitespace, or end of string.
  // Anchoring on real terminators (not just "not a letter") matters
  // because \d+ backtracks: on 'fontSize: "1.25rem"' a naive
  // not-a-letter check still lets the engine shrink the match to
  // "1.2" and accept it, since the next character ("5") is a digit,
  // not a letter — reading a ~17px rem value as if it were 1.2px.
  // Requiring a real terminator makes every backtracked length fail
  // too, so the whole token is correctly skipped as non-px.
  const TERM = String.raw`(?=['"\`,}\)\s;]|$)`
  const sizeRe = isCss
    ? /font-size:\s*(\d+(?:\.\d+)?)px/g
    : new RegExp(String.raw`fontSize:\s*['"\`]?(\d+(?:\.\d+)?)(?:px)?${TERM}`, 'g')
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

  // ── orphantoken: dot-access on a shared token object whose key ─
  // doesn't exist. A local `const tokens = {...}` (or fn/at/etc.)
  // in the same file shadows the import and is checked against its
  // OWN keys instead — several files (SentenceCompletion.jsx, the
  // breath components' local `T`) intentionally define self-contained
  // token sets and that's legal; what's never legal is a name that
  // resolves to nothing at all.
  if (!isCss && r !== 'lib/designTokens.js') {
    // Strip comments first — a filename like "tokens.js" in a code
    // comment isn't a property access, and scanning it produces a
    // false "no such key: js" hit.
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
                         .replace(/\/\/[^\n]*/g, m => ' '.repeat(m.length))
    for (const name of TRACKED_TOKEN_NAMES) {
      if (!codeOnly.includes(`${name}.`)) continue
      const localKeys = extractObjectKeys(src, name)
      const keys = localKeys || CANONICAL_KEYS[name]
      if (!keys) continue
      // Negative lookbehind for a preceding "." so a nested property
      // chain (shadow.at.rest) can't be mistaken for the top-level
      // `at` object — only a bare reference to `name` counts.
      for (const m of codeOnly.matchAll(new RegExp(`(?<!\\.)\\b${name}\\.([A-Za-z_][A-Za-z0-9_]*)`, 'g'))) {
        if (!keys.has(m[1])) {
          violations.orphantoken.push(`${r}:${lineOf(src, m.index)}  ${name}.${m[1]} — no such key (renders as undefined, e.g. invisible on a light surface)`)
        }
      }
    }
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
  orphantoken: 'ORPHAN TOKEN KEY (no-backslide law — undefined resolves silently, not an error)',
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
