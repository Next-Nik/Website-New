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
//                  (laws: size, opacity, italic, svg, vh)
//
// Exit code 1 if any violations — wire into CI/build when the
// backlog reaches zero:  "build": "node scripts/audit-design.js && vite build"
//
// THE LAWS
//   size     fontSize below 13px (or unitless <13)
//   opacity  ink text colours below the 0.55 opacity floor
//   italic   fontStyle italic — legal ONLY for user-authored
//            words; every hit needs a human verdict, so hits
//            are listed but can be whitelisted below once
//            confirmed as user-voice
//   svg      style= prop on an <svg> open tag (Chrome 148)
//   vh       100vh instead of 100dvh
// ─────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')

// Confirmed user-authored-voice italics — legal, skipped by the
// italic law. Add "relative/path.jsx:line-ish-context" entries
// only after a human confirms the italic wraps the user's words.
const ITALIC_WHITELIST = [
  // e.g. 'components/NorthStarPortal.jsx' — user messages in the chat
]

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
const violations = { size: [], opacity: [], italic: [], svg: [], vh: [] }

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
}

// ── Report ───────────────────────────────────────────────────
const LAW_TITLES = {
  size:    'FONT SIZE BELOW 13px',
  opacity: 'INK TEXT BELOW 0.55 OPACITY',
  italic:  'ITALIC (needs human verdict: user-voice or violation)',
  svg:     'style= ON <svg> OPEN TAG (Chrome 148)',
  vh:      '100vh (use 100dvh)',
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
