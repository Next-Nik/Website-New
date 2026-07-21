// api/challenge-image-upload.js
//
// Re-host a challenge's hero image into Supabase Storage. The browser has
// already downscaled and compressed it (see src/lib/imageDownscale.js), so what
// arrives here is small. We decode it, store it in the public 'challenge-images'
// bucket under a random name, and hand back the public URL.
//
// Prerequisite: a PUBLIC bucket named 'challenge-images' must exist.

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://tphbpwzozkskytoichho.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

const BUCKET = 'challenge-images'
const MAX_BYTES = 6 * 1024 * 1024

// Uploads require a signed-in user. The bucket is public to read, never to
// write — without this gate the endpoint is anonymous file hosting.
async function getUserId(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user.id
  } catch { return null }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const uid = await getUserId(req)
  if (!uid) return res.status(401).json({ error: 'Sign in to upload an image.' })

  const { dataUrl, ext } = req.body || {}
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return res.status(400).json({ error: 'dataUrl required' })
  }

  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s)
  if (!m) return res.status(400).json({ error: 'Malformed image data' })

  const contentType = m[1]
  if (!contentType.startsWith('image/')) return res.status(400).json({ error: 'Not an image' })

  const buffer = Buffer.from(m[2], 'base64')
  if (buffer.length > MAX_BYTES) return res.status(413).json({ error: 'Image too large after processing' })

  const safeExt = String(ext || contentType.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg'
  const filePath = `${crypto.randomUUID()}.${safeExt}`

  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType, upsert: false })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
    return res.json({ image_url: publicUrl })
  } catch (err) {
    console.error('[challenge-image-upload]', err)
    return res.status(500).json({ error: `Upload failed: ${err.message}` })
  }
}
