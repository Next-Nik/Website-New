// api/moment-upload.js
//
// BP-2 · The one write path for witnessed moments. The browser has already
// downscaled the photo (src/lib/momentCapture.js → imageDownscale: ~1600px
// full + ~400px thumb, WebP), so what arrives is small. We store both in the
// public 'moment-images' bucket under random names and insert the moments row
// for the verified user.
//
// A moment may be photo + line, photo only, or line only — but never empty.
// The line caps at 280 characters, the person's own words, never machine-
// written (the client never pre-fills it; this route never generates it).
//
// Prerequisite: PUBLIC bucket 'moment-images' (public read; writes land only
// here, via service key — without the auth gate this is anonymous hosting).
//
// POST { fullDataUrl?, thumbDataUrl?, line?, challenge_id?, domain? }
//   → { moment } on success

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const { resolveUserId } = require('./_auth')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

const BUCKET = 'moment-images'
const MAX_FULL_BYTES = 3 * 1024 * 1024
const MAX_THUMB_BYTES = 512 * 1024
const MAX_LINE_CHARS = 280

function decodeDataUrl(dataUrl, maxBytes) {
  if (!dataUrl || typeof dataUrl !== 'string') return { error: 'Missing image data' }
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s)
  if (!m) return { error: 'Malformed image data' }
  const contentType = m[1]
  if (!contentType.startsWith('image/')) return { error: 'Not an image' }
  if (contentType === 'image/svg+xml') return { error: 'Photos only here' }
  const buffer = Buffer.from(m[2], 'base64')
  if (buffer.length > maxBytes) return { error: 'Image too large after processing' }
  const ext = (contentType.split('/')[1] || 'webp').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'webp'
  return { contentType, buffer, ext }
}

async function uploadOne(decoded, prefix) {
  const filePath = `${prefix}/${crypto.randomUUID()}.${decoded.ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, decoded.buffer, { contentType: decoded.contentType, upsert: false })
  if (error) throw new Error(error.message || 'Upload failed')
  return filePath
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const uid = await resolveUserId(req)
  if (!uid) return res.status(401).json({ error: 'Sign in to add a moment.' })

  const { fullDataUrl, thumbDataUrl, line, challenge_id, domain } = req.body || {}

  const cleanLine = typeof line === 'string' ? line.trim().slice(0, MAX_LINE_CHARS) : null
  const hasLine = !!(cleanLine && cleanLine.length)
  const hasPhoto = !!fullDataUrl

  if (!hasPhoto && !hasLine) {
    return res.status(400).json({ error: 'A moment needs a photo or a line — it can\u2019t be empty.' })
  }

  let image_path = null
  let thumb_path = null

  try {
    if (hasPhoto) {
      const full = decodeDataUrl(fullDataUrl, MAX_FULL_BYTES)
      if (full.error) return res.status(400).json({ error: full.error })
      image_path = await uploadOne(full, uid)

      if (thumbDataUrl) {
        const thumb = decodeDataUrl(thumbDataUrl, MAX_THUMB_BYTES)
        if (!thumb.error) {
          try { thumb_path = await uploadOne(thumb, `${uid}/thumbs`) } catch (_) { thumb_path = null }
        }
      }
    }

    const { data: moment, error: insertError } = await supabase
      .from('moments')
      .insert({
        user_id: uid,
        challenge_id: challenge_id || null,
        domain: typeof domain === 'string' ? domain.slice(0, 60) : null,
        image_path,
        thumb_path,
        line: hasLine ? cleanLine : null,
      })
      .select()
      .single()

    if (insertError) {
      return res.status(500).json({ error: 'Could not save the moment. Try again in a moment.' })
    }

    return res.status(200).json({ moment })
  } catch (e) {
    return res.status(500).json({ error: 'Something went wrong saving that. Try again in a moment.' })
  }
}
