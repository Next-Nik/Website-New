// api/actor-image-upload.js
// C7 — Upload an actor's image from a hotlink URL to Supabase Storage.
//
// Called by the batch seed pipeline (and optionally from AdminConsole)
// when an actor entry has image_provenance = 'hotlink'.
//
// Flow:
//   1. Fetch the image from the source URL
//   2. Upload to Supabase Storage bucket 'actor-images'
//   3. Update actor.image_url to the storage public URL
//   4. Set actor.image_provenance = 'storage'
//
// Notes:
//   - Bucket 'actor-images' must exist in Supabase with public access.
//   - File path: actor-images/{actor_id}.{ext}
//   - Overwrites existing uploads for the same actor.
//   - Rights posture: actor images are public-facing on their source sites.
//     We store them as-is and document the provenance. The claim flow
//     invites owners to upload their own.

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const http  = require('http')
const path  = require('path')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const BUCKET = 'actor-images'

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod.get(url, { timeout: 10000 }, res => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }))
    }).on('error', reject)
  })
}

function extFromContentType(ct) {
  if (!ct) return 'jpg'
  if (ct.includes('png'))  return 'png'
  if (ct.includes('webp')) return 'webp'
  if (ct.includes('gif'))  return 'gif'
  if (ct.includes('svg'))  return 'svg'
  return 'jpg'
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { actorId, imageUrl } = req.body || {}
  if (!actorId) return res.status(400).json({ error: 'actorId required' })

  // Load actor to get current image_url if imageUrl not provided
  const { data: actor } = await supabase
    .from('nextus_actors')
    .select('id, name, image_url, image_provenance')
    .eq('id', actorId)
    .maybeSingle()

  if (!actor) return res.status(404).json({ error: 'Actor not found' })

  const sourceUrl = imageUrl || actor.image_url
  if (!sourceUrl) return res.status(400).json({ error: 'No image URL to upload' })
  if (actor.image_provenance === 'storage') return res.json({ alreadyHosted: true, image_url: actor.image_url })

  try {
    const { buffer, contentType } = await fetchBuffer(sourceUrl)
    const ext      = extFromContentType(contentType)
    const filePath = `${actorId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType, upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath)

    await supabase.from('nextus_actors')
      .update({ image_url: publicUrl, image_provenance: 'storage', updated_at: new Date().toISOString() })
      .eq('id', actorId)

    return res.json({ uploaded: true, image_url: publicUrl })
  } catch (err) {
    console.error('[actor-image-upload] Error:', err)
    return res.status(500).json({ error: `Upload failed: ${err.message}` })
  }
}
