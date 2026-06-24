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

// Decode a base64 data URL ("data:image/png;base64,...") or bare base64 string
// into a buffer plus its content type. Returns null if it can't be parsed.
function decodeImageData(imageData) {
  if (!imageData || typeof imageData !== 'string') return null
  const m = imageData.match(/^data:([^;]+);base64,(.*)$/)
  const contentType = m ? m[1] : 'image/jpeg'
  const b64 = m ? m[2] : imageData
  try { return { buffer: Buffer.from(b64, 'base64'), contentType } }
  catch { return null }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { actorId, imageUrl, imageData } = req.body || {}
  if (!actorId) return res.status(400).json({ error: 'actorId required' })

  // Load actor to get current image_url if imageUrl not provided
  const { data: actor } = await supabase
    .from('nextus_actors')
    .select('id, name, image_url, image_provenance')
    .eq('id', actorId)
    .maybeSingle()

  if (!actor) return res.status(404).json({ error: 'Actor not found' })

  try {
    let buffer, contentType

    if (imageData) {
      // Owner-uploaded file from the profile editor. Always overwrites — an
      // explicit upload is a deliberate replacement, even of a hosted image.
      const decoded = decodeImageData(imageData)
      if (!decoded) return res.status(400).json({ error: 'Could not read the uploaded image' })
      if (decoded.buffer.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Image is larger than 5MB' })
      ;({ buffer, contentType } = decoded)
    } else {
      // Rehost flow: pull the existing or supplied URL into the bucket.
      const sourceUrl = imageUrl || actor.image_url
      if (!sourceUrl) return res.status(400).json({ error: 'No image URL to upload' })
      if (actor.image_provenance === 'storage') return res.json({ alreadyHosted: true, image_url: actor.image_url })
      ;({ buffer, contentType } = await fetchBuffer(sourceUrl))
    }

    const ext      = extFromContentType(contentType)
    const filePath = `${actorId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType, upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
    // Path is keyed by actor id, so a re-upload reuses the same URL. Add a version
    // query so the new image shows immediately instead of a cached old one.
    const bustedUrl = `${publicUrl}?v=${Date.now()}`

    await supabase.from('nextus_actors')
      .update({ image_url: bustedUrl, image_provenance: 'storage', updated_at: new Date().toISOString() })
      .eq('id', actorId)

    return res.json({ uploaded: true, image_url: bustedUrl })
  } catch (err) {
    console.error('[actor-image-upload] Error:', err)
    return res.status(500).json({ error: `Upload failed: ${err.message}` })
  }
}
