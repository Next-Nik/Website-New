// ─────────────────────────────────────────────────────────────
// CardPhoto.jsx
//
// Renders one home-card image and, for the founder only, the controls
// to change it, remove it, and — new — drag it inside the frame to fix
// the crop.
//
// Two founder overrides back a card, both stored in `site_copy`
// (reusing saveCopy/clearCopy, so no new table or migration):
//   • mc.card.<slug>.image  → storage path of the uploaded photo
//   • mc.card.<slug>.pos    → object-position, e.g. "62% 30%"
//
// RENDERING (July 2026 — rewritten): the photo is a real <img> with
// object-fit: cover, NOT a CSS `background-image` on a div. The no-photo
// fallback is a real inline <svg> gradient, not `background-image:
// linear-gradient(...)`. Both changes exist to route around a WebKit
// compositing bug, confirmed across an original iPad Pro, a current
// iPhone, and desktop Safari on macOS alike (Chrome/Firefox/Android were
// never affected): a `background-image` on a child of a parent that has
// `overflow: hidden` + `border-radius` + a `transition` on `transform`
// (`.mc-card` has all three, for the hover lift) can silently fail to
// paint in Safari — the card shell, shadow, and buttons on top all
// render fine, only the background-image layer is dropped. It reproduced
// identically whether the background-image was a real photo URL or a
// pure CSS linear-gradient, which is what pointed at the mechanism
// rather than image format or caching (both ruled out first). The
// working reference is ChallengePage.jsx's cover image, which has always
// used a plain <img> with border-radius on the image itself — no
// clipping parent, no transform-transition nearby, and it has never
// exhibited this bug. <img> and <svg> are raster/vector replaced content
// on a different paint path than a CSS `background-image` layer, so they
// sidestep the bug rather than trying to out-guess Safari's compositing
// heuristics with a translateZ(0) hack (kept on .mc-card-img in
// MissionControl.jsx too, as harmless defense-in-depth, but not relied
// on alone after this rewrite).
//
// Repositioning is still pixel-accurate: we measure the photo's natural
// size, work out how far it overflows the frame on each axis, and
// translate a pixel drag into the matching change in object-position.
// Axes with no overflow simply don't move.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { saveCopy, clearCopy, useSiteCopyMeta } from '../../../lib/siteCopy'
import { downscaleImageToBlob } from '../../../lib/imageDownscale'
import { useEditMode } from '../../context/EditModeContext'

const clamp = (n) => Math.max(0, Math.min(100, n))

// Fallback gradient colour pairs — same values as the old .mc-im1..8 CSS
// classes in MissionControl.jsx, now painted as a real <svg> gradient
// instead of a CSS `background-image: linear-gradient(...)` (see header
// comment: the CSS version was confirmed blank on Safari, same bug as
// real photos). Keep in sync with MissionControl.jsx's .mc-imN rules —
// those CSS rules are left in place harmlessly for any other consumer,
// but CardPhoto no longer relies on them for its own rendering.
const FALLBACK_GRADIENTS = {
  'mc-im1': ['#8fae7e', '#4c6b45'],
  'mc-im2': ['#e3c68a', '#b98b3e'],
  'mc-im3': ['#7fa9b0', '#3d6b73'],
  'mc-im4': ['#c9a27f', '#7a5233'],
  'mc-im5': ['#a7b98f', '#5f7a48'],
  'mc-im6': ['#d8b48c', '#9c6b3c'],
  'mc-im7': ['#6c8f6a', '#2f4a30'],
  'mc-im8': ['#caa15f', '#6e4a22'],
}

// Parse a position string (identical syntax for background-position and
// object-position) into {x, y} percentages.
function parsePos(str) {
  if (!str || str === 'center') return { x: 50, y: 50 }
  const parts = String(str).trim().split(/\s+/)
  const toPct = (v, fallback) => {
    if (v == null) return fallback
    if (v === 'center') return 50
    if (v === 'left' || v === 'top') return 0
    if (v === 'right' || v === 'bottom') return 100
    const n = parseFloat(v)
    return Number.isNaN(n) ? fallback : n
  }
  return { x: toPct(parts[0], 50), y: toPct(parts[1], 50) }
}

export default function CardPhoto({
  imgId,
  posId,
  imgUrl,
  pos,
  fallbackClass,
  isFounder,
  onOpen,
  children,
}) {
  const { refresh } = useSiteCopyMeta()
  const { editing } = useEditMode()   // founder is editing copy → card must not navigate
  const fileRef = useRef(null)
  const imgRef = useRef(null)
  const natRef = useRef({ w: 0, h: 0 })   // photo's natural pixel size
  const liveRef = useRef(null)            // position mid-drag (avoids stale closures)

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [moving, setMoving] = useState(false)
  const [live, setLive] = useState(null)  // triggers re-render while dragging

  const effectivePos = live || pos || 'center'

  // Preload the photo once to learn its natural dimensions, so drag math
  // is exact. Falls back to frame-sized sensitivity if it can't measure.
  useEffect(() => {
    natRef.current = { w: 0, h: 0 }
    if (!imgUrl) return
    const im = new Image()
    im.onload = () => { natRef.current = { w: im.naturalWidth, h: im.naturalHeight } }
    im.src = imgUrl
  }, [imgUrl])

  // ── Self-healing WebP repair (July 2026) ──────────────────────────────
  // Photos uploaded during the brief WebP-encoding window don't decode on
  // older iPhone/iPad Safari. The founder's own browser CAN decode them —
  // so when the founder loads a card whose stored photo is .webp, quietly
  // fetch it, re-encode to JPEG, upload the twin, and repoint the copy
  // key. Crop position is preserved (same image, same framing). Runs at
  // most once per card per mount; visitors are never involved.
  const repairRef = useRef(false)
  useEffect(() => {
    if (!isFounder || !imgUrl || repairRef.current) return
    if (!/\.webp(\?|#|$)/i.test(imgUrl)) return
    repairRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const resp = await fetch(imgUrl)
        if (!resp.ok) throw new Error(`fetch ${resp.status}`)
        const webpBlob = await resp.blob()
        const file = new File([webpBlob], 'repair.webp', { type: 'image/webp' })
        const { blob, ext, type } = await downscaleImageToBlob(file, { maxEdge: 1600, quality: 0.82 })
        if (cancelled) return
        const path = `cards/${imgId.replace(/[^a-z0-9.-]+/gi, '-')}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('site-images')
          .upload(path, blob, { upsert: true, contentType: type })
        if (upErr) throw upErr
        const ok = await saveCopy(imgId, path)
        if (!ok) throw new Error('saveCopy failed')
        // NOTE: posId is deliberately NOT cleared — same photo, same crop.
        await refresh()
        console.info(`[CardPhoto] repaired ${imgId}: webp → ${ext}`)
      } catch (e) {
        // Non-fatal: the card keeps its webp until the next founder visit.
        console.warn(`[CardPhoto] webp repair failed for ${imgId}:`, e?.message)
        repairRef.current = false
      }
    })()
    return () => { cancelled = true }
  }, [imgUrl, isFounder, imgId, refresh])

  // When the saved position changes (after we persist a drag, or the photo
  // is swapped), drop any live override so we read the saved value.
  useEffect(() => { liveRef.current = null; setLive(null) }, [pos, imgUrl])

  // Leave reposition mode if the photo is removed.
  useEffect(() => { if (!imgUrl && moving) setMoving(false) }, [imgUrl, moving])

  async function upload(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { setErr('Images only'); return }
    setBusy(true); setErr(null)
    try {
      // Downscale in the browser first (long edge 1600px, JPEG) so a full-size
      // phone photo becomes a couple hundred KB — the bucket rejected raw
      // originals with "object exceeded the maximum allowed size".
      const { blob, ext, type } = await downscaleImageToBlob(f, { maxEdge: 1600, quality: 0.82 })
      const path = `cards/${imgId.replace(/[^a-z0-9.-]+/gi, '-')}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('site-images')
        .upload(path, blob, { upsert: true, contentType: type })
      if (upErr) throw upErr
      const ok = await saveCopy(imgId, path)
      if (!ok) throw new Error('Could not save')
      // A fresh photo starts centred: clear any prior crop position.
      await clearCopy(posId)
      await refresh()
    } catch (e2) {
      const msg = /maximum allowed size|exceeded/i.test(e2?.message || '')
        ? 'That image is too large even after resizing. Try a smaller one.'
        : (e2?.message || 'Upload failed')
      setErr(msg)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function clearPhoto() {
    setBusy(true); setErr(null)
    setMoving(false)
    await clearCopy(imgId)
    await clearCopy(posId)
    await refresh()
    setBusy(false)
  }

  // Drag the photo inside the frame. Only active in reposition mode.
  function onPointerDown(e) {
    if (!moving || !imgUrl || !imgRef.current) return
    // Keep the press from reaching the card button (which would navigate).
    e.preventDefault()
    e.stopPropagation()

    const el = imgRef.current
    const rect = el.getBoundingClientRect()
    const start = parsePos(effectivePos)
    const startX = e.clientX
    const startY = e.clientY
    try { el.setPointerCapture?.(e.pointerId) } catch { /* older browsers */ }

    const move = (ev) => {
      const W = rect.width
      const H = rect.height
      const nat = natRef.current
      // How far the covered photo spills past the frame on each axis.
      let overflowX = W
      let overflowY = H
      if (nat.w && nat.h) {
        const scale = Math.max(W / nat.w, H / nat.h)
        overflowX = nat.w * scale - W
        overflowY = nat.h * scale - H
      }
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      let nx = start.x
      let ny = start.y
      // Drag right → reveal more of the photo's left side → position → 0%.
      if (overflowX > 1) nx = clamp(start.x - (dx / overflowX) * 100)
      if (overflowY > 1) ny = clamp(start.y - (dy / overflowY) * 100)
      const p = `${nx.toFixed(1)}% ${ny.toFixed(1)}%`
      liveRef.current = p
      setLive(p)
    }

    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      const p = liveRef.current
      if (p) saveCopy(posId, p).then(() => refresh())
    }

    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  function handleCardClick() {
    if (moving) return          // in reposition mode a click shouldn't navigate
    if (editing) return         // founder editing copy — a click on the card (or the
                                // padding around an EditableText field) must not navigate
    onOpen?.()
  }

  const moveIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 9 2 12 5 15" />
      <polyline points="9 5 12 2 15 5" />
      <polyline points="15 19 12 22 9 19" />
      <polyline points="19 9 22 12 19 15" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  )
  const cameraIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )

  const gradientId = `mc-card-grad-${imgId.replace(/[^a-z0-9]+/gi, '-')}`
  const [gradFrom, gradTo] = FALLBACK_GRADIENTS[fallbackClass] || FALLBACK_GRADIENTS['mc-im1']

  return (
    <div className="mc-card-wrap">
      <button type="button" className="mc-card" onClick={handleCardClick}>
        <span
          ref={imgRef}
          className={`mc-card-img${moving ? ' mc-card-img--moving' : ''}`}
          onPointerDown={onPointerDown}
        >
          {imgUrl ? (
            // Real <img>, not a CSS background-image — see header comment.
            <img
              src={imgUrl}
              alt=""
              draggable={false}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: effectivePos, display: 'block',
                pointerEvents: 'none',   // all drag/click handled by the parent span
                WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
              }}
            />
          ) : (
            // Real <svg> gradient, not CSS `background-image: linear-gradient(...)`
            // — same Safari compositing bug hit pure-CSS gradients too.
            // NOTE: no style= on the <svg> tag itself (Chrome 148 bug, project
            // convention) — sizing/positioning lives on this wrapping span.
            <span style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: 'none' }}>
              <svg width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={gradFrom} />
                    <stop offset="100%" stopColor={gradTo} />
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill={`url(#${gradientId})`} />
              </svg>
            </span>
          )}
        </span>
        {children}
      </button>

      {isFounder && (
        <div className="mc-card-photoedit" onClick={(e) => e.stopPropagation()}>
          {imgUrl && !busy && (
            <button
              type="button"
              className={`mc-card-photobtn${moving ? ' is-active' : ''}`}
              title={moving ? 'Done positioning' : 'Reposition photo'}
              aria-pressed={moving}
              onClick={() => setMoving((m) => !m)}
            >
              {moving ? '✓' : moveIcon}
            </button>
          )}
          <button
            type="button"
            className="mc-card-photobtn"
            title={imgUrl ? 'Change photo' : 'Add a photo'}
            disabled={busy}
            onClick={() => fileRef.current && fileRef.current.click()}
          >
            {busy ? '…' : cameraIcon}
          </button>
          {imgUrl && !busy && (
            <button type="button" className="mc-card-photoclear" title="Remove photo" onClick={clearPhoto}>×</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={upload} style={{ display: 'none' }} />
          {err && <span className="mc-card-photoerr">{err}</span>}
        </div>
      )}

      {isFounder && moving && (
        <span className="mc-card-movehint">Drag the photo to set the crop</span>
      )}
    </div>
  )
}
