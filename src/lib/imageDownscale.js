// src/lib/imageDownscale.js
//
// Resize and compress an image File in the browser before it ever uploads, so
// we never store a 10MB original. Caps the long edge, re-encodes to JPEG, and
// returns a data URL ready to send. SVGs pass through untouched — they're
// already small and vector.
//
// JPEG, DELIBERATELY NOT WebP (July 2026): encoding depends on the
// UPLOADER's browser but decoding happens on every VISITOR's browser.
// Chrome encodes WebP; older iPhone/iPad Safari cannot decode it — which
// made founder card photos render on Chrome desktop / Pixel but come up
// blank on iPads and iPhones. JPEG at these settings is a few percent
// larger and decodes everywhere. Do not switch back to WebP without a
// server-side fallback for Safari.

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(new Error('Could not read the file'))
    r.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the image'))
    img.src = src
  })
}

export async function downscaleImage(file, { maxEdge = 1600, quality = 0.82 } = {}) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('That file is not an image')

  // Vector: keep as-is.
  if (file.type === 'image/svg+xml') {
    const dataUrl = await fileToDataUrl(file)
    return { dataUrl, type: 'image/svg+xml', ext: 'svg' }
  }

  const img = await loadImage(await fileToDataUrl(file))
  let width = img.naturalWidth || img.width
  let height = img.naturalHeight || img.height
  const longest = Math.max(width, height)
  if (longest > maxEdge) {
    const scale = maxEdge / longest
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // White matte so a flattened JPEG fallback never shows black where alpha was.
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  const type = 'image/jpeg'   // universal decode — see header comment
  const dataUrl = canvas.toDataURL(type, quality)
  return { dataUrl, type, ext: 'jpg' }
}

// Same downscale, but returns an uploadable Blob instead of a data URL — for
// the storage.upload() paths (founder card photos) that need binary, not a
// string. Reuses downscaleImage so there is one resize implementation, not two.
export async function downscaleImageToBlob(file, opts = {}) {
  const { dataUrl, type, ext } = await downscaleImage(file, opts)
  const blob = await (await fetch(dataUrl)).blob()
  return { blob, type, ext }
}
