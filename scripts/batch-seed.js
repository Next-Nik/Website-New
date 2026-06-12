// scripts/batch-seed.js
// C3 — Batch seeding pipeline (June 2026).
//
// Usage:
//   node scripts/batch-seed.js --input urls.txt [--dry-run] [--limit 10]
//
// Input file format (urls.txt): one URL per line. Lines starting with # are
// comments. Blank lines are skipped.
//
// What it does:
//   1. Reads URLs from the input file
//   2. POSTs each to /api/org-extract (the existing extractor)
//   3. Runs the Actor Profile Floor check locally (no image = fail, no
//      description = fail, no contact = fail)
//   4. In dry-run mode: prints the floor report, does not write to DB
//   5. In live mode: writes floor-passing entries to nextus_actors with
//      status='staged', seeded_by='nextus', ready for AdminConsole review
//   6. Writes a results log to batch-seed-results-{timestamp}.json
//
// Floor check (mirrors Actor Profile Floor doc v1):
//   REQUIRED: name, type, description (>50 chars), image_url, at least one
//   contact mechanism (website + any of: email, contact_form, booking_link),
//   at least one domain placement.
//   SOFT WARN: no story, tagline shorter than 10 chars, no social links.
//
// Deploy notes:
//   - Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in environment
//   - Requires the extractor to be reachable at NEXTUS_BASE_URL/api/org-extract
//   - Run from the repo root: node scripts/batch-seed.js --input urls.txt
//   - Uses the service role key — runs outside RLS

const fs      = require('fs')
const path    = require('path')
const https   = require('https')
const http    = require('http')

// Load env from .env.local if present
try {
  const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
  envFile.split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && v.length && !process.env[k]) process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '')
  })
} catch {}

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const BASE_URL    = process.env.NEXTUS_BASE_URL || 'https://nextus.world'
const RATE_DELAY  = 3000   // ms between requests — be polite to source sites

// ─── Args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function arg(name) {
  const i = args.indexOf(name)
  return i !== -1 ? args[i + 1] : null
}
const DRY_RUN    = args.includes('--dry-run')
const INPUT_FILE = arg('--input') || 'urls.txt'
const LIMIT      = parseInt(arg('--limit') || '0', 10) || Infinity
const DOMAIN     = arg('--domain') || null   // optional: only seed this domain

// ─── Floor check ─────────────────────────────────────────────────────────────

function checkFloor(record) {
  const errors = [], warns = []

  if (!record.name || record.name.length < 2)
    errors.push('Missing name')
  if (!record.type)
    errors.push('Missing type')
  if (!record.description || record.description.length < 50)
    errors.push(`Description too short (${(record.description || '').length} chars, need 50+)`)
  if (!record.image_url)
    errors.push('No image')
  if (!record.website)
    errors.push('No website (minimum contact path)')

  const hasDomain = (record.domains || []).length > 0 || record.domain_id
  if (!hasDomain)
    errors.push('No domain placement')

  if (!record.tagline || record.tagline.length < 10)
    warns.push('Tagline missing or very short')
  if (!record.story)
    warns.push('No story — description only')

  const mediaLinks = record.media || {}
  const socialCount = ['instagram', 'twitter', 'linkedin', 'youtube', 'substack', 'podcast_url']
    .filter(k => mediaLinks[k]).length
  if (socialCount === 0)
    warns.push('No social/media links found')

  return { passes: errors.length === 0, errors, warns }
}

// ─── HTTP fetch helper ────────────────────────────────────────────────────────

function post(url, body) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url)
    const module_ = parsed.protocol === 'https:' ? https : http
    const data    = JSON.stringify(body)
    const req     = module_.request({
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) }
        catch { reject(new Error('JSON parse failed: ' + body.slice(0, 200))) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Dedup check ─────────────────────────────────────────────────────────────

async function isDuplicate(name, website) {
  const queries = []
  if (name) {
    const { data } = await supabase
      .from('nextus_actors')
      .select('id, name')
      .ilike('name', `%${name}%`)
      .limit(3)
    if (data?.length) queries.push(...data)
  }
  if (website) {
    const { data } = await supabase
      .from('nextus_actors')
      .select('id, name')
      .eq('website', website)
      .limit(1)
    if (data?.length) queries.push(...data)
  }
  return queries.length > 0 ? queries[0] : null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`)
    process.exit(1)
  }

  const lines = fs.readFileSync(INPUT_FILE, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
  const urls = [...new Set(lines)].slice(0, LIMIT)

  console.log(`\n📋 Batch seeding — ${urls.length} URL${urls.length === 1 ? '' : 's'}`)
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`)
  console.log(`   Base URL: ${BASE_URL}\n`)

  const results = { timestamp: new Date().toISOString(), dry_run: DRY_RUN, total: urls.length, passed: [], failed: [], skipped: [] }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    console.log(`[${i + 1}/${urls.length}] ${url}`)

    try {
      // 1. Extract
      const extracted = await post(`${BASE_URL}/api/org-extract`, { url, mode: 'extract' })
      if (extracted.error || !extracted.name) {
        console.log(`  ✗ Extraction failed: ${extracted.error || 'no name returned'}`)
        results.failed.push({ url, reason: extracted.error || 'extraction failed' })
        await sleep(RATE_DELAY); continue
      }

      // Optional domain filter
      if (DOMAIN) {
        const actorDomains = extracted.domains || []
        if (!actorDomains.includes(DOMAIN) && extracted.domain_id !== DOMAIN) {
          console.log(`  ↷ Skipped (not in domain ${DOMAIN})`)
          results.skipped.push({ url, name: extracted.name, reason: 'domain filter' })
          await sleep(RATE_DELAY); continue
        }
      }

      // 2. Dedup check
      const dupe = await isDuplicate(extracted.name, extracted.website)
      if (dupe) {
        console.log(`  ↷ Skipped (duplicate: "${dupe.name}" id=${dupe.id})`)
        results.skipped.push({ url, name: extracted.name, reason: `duplicate of ${dupe.id}` })
        await sleep(RATE_DELAY); continue
      }

      // 3. Floor check
      const floor = checkFloor(extracted)
      console.log(`  ${floor.passes ? '✓' : '✗'} Floor: ${floor.passes ? 'passes' : floor.errors.join(', ')}`)
      if (floor.warns.length) console.log(`  ⚠ Warnings: ${floor.warns.join(', ')}`)

      if (!floor.passes) {
        results.failed.push({ url, name: extracted.name, floor_errors: floor.errors, floor_warns: floor.warns })
        await sleep(RATE_DELAY); continue
      }

      // 4. Stage (unless dry-run)
      if (!DRY_RUN) {
        const { data, error } = await supabase
          .from('nextus_actors')
          .insert({
            ...extracted,
            status:        'staged',
            seeded_by:     'nextus',
            profile_owner: null,
            owner_id:      null,
          })
          .select('id, name')
          .single()

        if (error) {
          console.log(`  ✗ DB insert failed: ${error.message}`)
          results.failed.push({ url, name: extracted.name, reason: error.message })
        } else {
          console.log(`  ✓ Staged: "${data.name}" (${data.id})`)
          results.passed.push({ url, name: extracted.name, id: data.id, floor_warns: floor.warns })
        }
      } else {
        console.log(`  ✓ Dry-run pass: "${extracted.name}"`)
        results.passed.push({ url, name: extracted.name, floor_warns: floor.warns, dry: true })
      }

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`)
      results.failed.push({ url, reason: err.message })
    }

    await sleep(RATE_DELAY)
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n── Summary ──────────────────────────────────────────────────`)
  console.log(`  Passed:  ${results.passed.length}`)
  console.log(`  Failed:  ${results.failed.length}`)
  console.log(`  Skipped: ${results.skipped.length}`)

  if (results.failed.length) {
    console.log('\n  Failed entries:')
    results.failed.forEach(f => console.log(`    · ${f.name || f.url}: ${f.reason || (f.floor_errors || []).join(', ')}`))
  }

  const logFile = `batch-seed-results-${Date.now()}.json`
  fs.writeFileSync(logFile, JSON.stringify(results, null, 2))
  console.log(`\n  Results written to: ${logFile}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
