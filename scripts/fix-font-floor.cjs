#!/usr/bin/env node
// One-shot codemod: raise every hardcoded fontSize below 13px to 13px.
// Mirrors the exact detection regex in scripts/audit-design.js (size law)
// so every fix registers with the auditor and nothing else is touched.
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')
const FLOOR = 13

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(jsx?|css)$/.test(e.name)) out.push(p)
  }
  return out
}

const TERM = String.raw`(?=['"\`,}\)\s;]|$)`
let filesChanged = 0
let spotsFixed = 0

for (const f of walk(SRC)) {
  const isCss = f.endsWith('.css')
  const src = fs.readFileSync(f, 'utf8')
  let changed = false

  const re = isCss
    ? /font-size:(\s*)(\d+(?:\.\d+)?)px/g
    : new RegExp(String.raw`fontSize:(\s*)(['"\`]?)(\d+(?:\.\d+)?)(px)?${TERM}`, 'g')

  const out = src.replace(re, (m, ws, q, num, px) => {
    // CSS branch: args are (m, ws, num) — normalise
    if (isCss) { num = q; q = ''; px = 'px' }
    const v = parseFloat(num)
    if (!(v > 0 && v < FLOOR)) return m
    changed = true
    spotsFixed++
    return isCss
      ? `font-size:${ws}${FLOOR}px`
      : `fontSize:${ws}${q}${FLOOR}${px || ''}`
  })

  if (changed) {
    fs.writeFileSync(f, out)
    filesChanged++
  }
}

console.log(`fixed ${spotsFixed} spots in ${filesChanged} files`)
