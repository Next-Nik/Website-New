// src/lib/imageDownscale.js
//
// Resize and compress an image File in the browser before it ever uploads, so
// we never store a 10MB original. Caps the long edge, re-encodes to WebP (or
// JPEG where WebP isn't available), and returns a data URL ready to send.
// SVGs pass through untouched — they're already small and vector.

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

  let type = 'image/webp'
  let dataUrl = canvas.toDataURL(type, quality)
  if (!dataUrl.startsWith('data:image/webp')) {
    type = 'image/jpeg'
    dataUrl = canvas.toDataURL(type, quality)
  }
  return { dataUrl, type, ext: type === 'image/webp' ? 'webp' : 'jpg' }
}
