// scripts/convert-site-images-to-jpeg.mjs
//
// One-time repair (July 2026): founder card photos uploaded between the
// resize drop and the JPEG fix were stored as WebP, which older iPhone /
// iPad Safari cannot decode — those visitors saw blank card photos.
//
// This script walks the `site-images` bucket, re-encodes every .webp
// object to JPEG (long edge already capped at upload), uploads the .jpg
// alongside, and rewrites any `site_copy` row whose value pointed at the
// old .webp path so every card starts serving the JPEG immediately. The
// old .webp objects are left in place (harmless, and safer than deleting).
//
// Run once, locally, with the service key:
//   npm i sharp --no-save
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_KEY=<service-role-key> \
//   node scripts/convert-site-images-to-jpeg.mjs
//
// Idempotent: a second run finds no .webp values left in site_copy and
// skips objects whose .jpg twin already exists.

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY, then re-run.')
  process.exit(1)
}
const supabase = createClient(url, key)

const BUCKET = 'site-images'

async function listAll(prefix = '') {
  const out = []
  let page = 0
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET)
      .list(prefix, { limit: 100, offset: page * 100 })
    if (error) throw error
    if (!data || data.length === 0) break
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null && !item.metadata) {
        // folder — recurse
        out.push(...await listAll(path))
      } else {
        out.push(path)
      }
    }
    if (data.length < 100) break
    page += 1
  }
  return out
}

const all = await listAll()
const webps = all.filter(p => p.toLowerCase().endsWith('.webp'))
console.log(`${all.length} objects in ${BUCKET}; ${webps.length} are .webp`)

let converted = 0
let repointed = 0

for (const path of webps) {
  const jpgPath = path.replace(/\.webp$/i, '.jpg')

  // Skip conversion if the twin already exists.
  const already = all.includes(jpgPath)
  if (!already) {
    const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(path)
    if (dlErr) { console.error(`  ✗ download ${path}: ${dlErr.message}`); continue }
    const buf = Buffer.from(await file.arrayBuffer())
    const jpg = await sharp(buf).flatten({ background: '#ffffff' }).jpeg({ quality: 84 }).toBuffer()
    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(jpgPath, jpg, { upsert: true, contentType: 'image/jpeg' })
    if (upErr) { console.error(`  ✗ upload ${jpgPath}: ${upErr.message}`); continue }
    converted += 1
    console.log(`  ✓ ${path} → ${jpgPath} (${Math.round(jpg.length / 1024)} KB)`)
  }

  // Repoint any site_copy rows that referenced the .webp path.
  const { data: rows, error: scErr } = await supabase
    .from('site_copy').select('id, value').eq('value', path)
  if (scErr) { console.error(`  ✗ site_copy lookup for ${path}: ${scErr.message}`); continue }
  for (const row of rows || []) {
    const { error: updErr } = await supabase
      .from('site_copy')
      .update({ value: jpgPath, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (updErr) console.error(`  ✗ site_copy ${row.id}: ${updErr.message}`)
    else { repointed += 1; console.log(`  ✓ site_copy ${row.id} → ${jpgPath}`) }
  }
}

console.log(`\nDone. ${converted} converted, ${repointed} site_copy rows repointed.`)
console.log('Old .webp objects were left in place on purpose.')
