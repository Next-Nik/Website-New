// src/app/lib/shareArtifact.js
//
// BP-7 · The share artifact — the platform's reach engine. Any moment or
// progress view can be minted as a beautiful image, client-side, and sent
// out through the native share sheet. Instagram and TikTok are streets, not
// home: the artifact travels, the platform is where it lives — so the
// platform URL is rendered INTO the image itself.
//
// No new storage: render to an offscreen canvas → PNG blob → Web Share API
// with a file, fallback to a download. Single strip (the three-image
// carousel is a later enhancement).
//
// Atlas palette, brand type. Fonts are awaited via document.fonts so the
// mint uses Fraunces/Newsreader/IBM Plex Mono when they are loaded, falling
// back to serif/mono otherwise.

const W = 1080
const H = 1350

const INK    = '#10222B'   // sea ink — ground
const PANEL  = '#16303B'   // chart panel
const CREAM  = '#EAF1ED'   // display text
const META   = 'rgba(234,241,237,0.66)'
const GHOST  = 'rgba(234,241,237,0.50)'
const VERD   = '#58A08A'   // living systems
const BRASS  = '#D9B24A'   // human coordination
const GRID   = 'rgba(217,226,221,0.06)'

const DISPLAY = "'Fraunces', Georgia, serif"
const BODY    = "'Newsreader', Georgia, serif"
const MONO    = "'IBM Plex Mono', 'Courier New', monospace"

function wrap(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  return lines
}

async function ensureFonts() {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready } catch (_) {}
}

// Render the artifact to a PNG Blob. opts:
//   eyebrow  — small mono kicker (e.g. "A moment on NextUs")
//   headline — the main line (the moment's words, or "Day 6 of 21")
//   stepLine — optional "the step taken" line
//   horizon  — optional declared horizon (verbatim) → "A step toward: …"
//   footNote — optional small line (domain, date)
//   url      — the platform URL, rendered into the image
export async function renderArtifact(opts = {}) {
  if (typeof document === 'undefined') throw new Error('Artifacts render in the browser only.')
  await ensureFonts()

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Ground + survey grid (Atlas signature).
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = GRID; ctx.lineWidth = 1
  for (let x = 72; x < W; x += 72) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
  for (let y = 72; y < H; y += 72) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

  const M = 96
  const maxW = W - M * 2
  let y = 150

  // Eyebrow.
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = GHOST
  ctx.font = `500 30px ${MONO}`
  ctx.fillText(String(opts.eyebrow || 'NextUs').toUpperCase(), M, y)
  y += 84

  // Headline — the thing.
  ctx.fillStyle = CREAM
  ctx.font = `400 76px ${DISPLAY}`
  for (const l of wrap(ctx, opts.headline || '', maxW)) { ctx.fillText(l, M, y); y += 92 }
  y += 24

  // Step taken.
  if (opts.stepLine) {
    ctx.fillStyle = VERD
    ctx.font = `500 30px ${MONO}`
    ctx.fillText('THE STEP TAKEN', M, y); y += 50
    ctx.fillStyle = META
    ctx.font = `400 40px ${BODY}`
    for (const l of wrap(ctx, opts.stepLine, maxW)) { ctx.fillText(l, M, y); y += 54 }
    y += 24
  }

  // Horizon — a step toward (verbatim).
  if (opts.horizon) {
    ctx.fillStyle = BRASS
    ctx.font = `500 30px ${MONO}`
    ctx.fillText('A STEP TOWARD', M, y); y += 52
    ctx.fillStyle = CREAM
    ctx.font = `italic 400 44px ${BODY}`
    for (const l of wrap(ctx, opts.horizon, maxW)) { ctx.fillText(l, M, y); y += 60 }
  }

  // Foot: domain/date + the platform URL, always in the image.
  const footY = H - 130
  ctx.strokeStyle = 'rgba(234,241,237,0.14)'
  ctx.beginPath(); ctx.moveTo(M, footY - 40); ctx.lineTo(W - M, footY - 40); ctx.stroke()

  if (opts.footNote) {
    ctx.fillStyle = GHOST
    ctx.font = `400 28px ${MONO}`
    ctx.fillText(String(opts.footNote), M, footY)
  }
  ctx.fillStyle = VERD
  ctx.font = `500 30px ${MONO}`
  const url = opts.url || 'nextus.world'
  const uw = ctx.measureText(url).width
  ctx.fillText(url, W - M - uw, footY)

  // Wordmark.
  ctx.fillStyle = CREAM
  ctx.font = `400 40px ${DISPLAY}`
  ctx.fillText('NextUs', M, footY + 56)

  return await new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not render the image.')), 'image/png'))
}

// Render + share (or download as fallback). Returns 'shared' | 'downloaded'.
export async function shareArtifact(opts = {}, { filename = 'nextus-moment.png', shareText } = {}) {
  const blob = await renderArtifact(opts)
  const file = new File([blob], filename, { type: 'image/png' })

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        text: shareText || undefined,
        url: opts.url || undefined,
      })
      return 'shared'
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'shared'  // user dismissed the sheet — not an error
    // fall through to download
  }

  // Fallback: download the file.
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 4000)
  return 'downloaded'
}

export function platformUrl(path = '') {
  try {
    const origin = window.location.origin.replace(/^https?:\/\//, '')
    return path ? `${origin}${path}` : origin
  } catch (_) { return 'nextus.world' }
}
