// ─────────────────────────────────────────────────────────────
// CardPhoto.jsx
//
// Renders one home-card image and, for the founder only, the controls
// to change it, remove it, and drag it inside the frame to fix the crop.
//
// Two founder overrides back a card, both stored in `site_copy`
// (reusing saveCopy/clearCopy, so no new table or migration):
//   • mc.card.<slug>.image  → storage path of the uploaded photo
//   • mc.card.<slug>.pos    → object-position, e.g. "62% 30%"
//
// ─────────────────────────────────────────────────────────────
// REBUILT July 2026 — the blank-card rebuild.
//
// History: this card rendered blank on every WebKit browser (desktop
// Safari on macOS, iPhone, iPad) while Chrome on macOS and Android
// rendered it correctly. Three fixes were attempted at the asset layer
// — WebP to JPEG, `background-image` to `<img>`, CSS gradient to inline
// `<svg>` — and none of them moved it. The reason they could not is
// that the failure was never in the asset. Two independent structural
// faults were producing one symptom:
//
//   1. The photo layer. The media element was absolutely positioned
//      inside a `<span>` that carried `translateZ(0)` and
//      `backface-visibility: hidden`, nested inside a `<button>` with
//      `overflow: hidden`, `border-radius`, and `transition: transform`.
//      That asks WebKit to apply a rounded clip to a promoted
//      compositing layer whose ancestor is also promoted. Blink handles
//      it. WebKit can drop the layer's paint entirely. The layer hints
//      were added as a mitigation and were in fact the exposure — they
//      were the one variable that survived all three rewrites, which is
//      exactly why the bug did too.
//
//   2. The no-photo layer, failing for a different reason. The fallback
//      was `<svg width="100%" height="100%">` with NO `viewBox`, inside
//      a parent whose height came only from `inset: 0`. An SVG with
//      percentage dimensions, no viewBox and no intrinsic size, in a
//      parent with no declared height, is a known WebKit zero-size
//      case. So the gradient could vanish even where the photo would
//      have painted, and vice versa.
//
// THE RULES THIS FILE NOW HOLDS. Each one removes a class of failure
// rather than working around an instance of it. Do not reintroduce any
// of them without testing on real WebKit first.
//
//   • Not a `<button>`. The card shell is a `<div>`; the click target is
//     one transparent `<button className="mc-card-hit">` stretched over
//     it. Full keyboard and assistive-tech semantics, and no media
//     inside a native form control. This was the only place in the
//     entire codebase with an `<img>` inside a `<button>`, and it was
//     the only card on the site that failed.
//   • The image is in flow. Declared `height`, `object-fit: cover`, no
//     `position: absolute`, no `inset`, no reliance on a containing
//     block resolving correctly.
//   • The image clips itself. `border-radius` sits on the `<img>` and
//     `overflow: hidden` is gone from the card, so nothing is being
//     clipped by a transformed ancestor. The hover lift is then free.
//   • Zero layer promotion. No `translateZ`, no `backface-visibility`,
//     no `will-change`, anywhere in this component or its CSS.
//   • ONE rendering path for both states. The no-photo fallback is the
//     same `<img>` with a data-URI SVG gradient as its `src` — same
//     element, same `object-fit`, same paint path. If a photo renders,
//     the gradient renders. There is no second failure mode left to
//     find. This is the single most important rule here.
//   • No `loading="lazy"`. These cards are above the fold, and lazy
//     loading has its own history of interacting badly with transformed
//     ancestors on iOS.
//   • A failed photo falls back to the gradient rather than to nothing,
//     so a dead storage URL can never present as a blank card again.
//
// Repositioning is unchanged and still pixel-accurate: measure the
// photo's natural size, work out how far it overflows the frame on each
// axis, translate a pixel drag into the matching change in
// object-position. Axes with no overflow do not move.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { saveCopy, clearCopy, useSiteCopyMeta } from '../../../lib/siteCopy'
import { downscaleImageToBlob } from '../../../lib/imageDownscale'
import { useEditMode } from '../../context/EditModeContext'

const clamp = (n) => Math.max(0, Math.min(100, n))

// Fallback gradient colour pairs. The `mc-imN` keys are historical — they
// were CSS class names once. The CSS rules are gone; only these keys and
// these values remain, and they are the single source of truth for the
// no-photo state.
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

// Build the no-photo gradient as a data-URI SVG so it can be the `src` of
// the SAME <img> the photo uses. Three details are load-bearing for WebKit
// and are the reason the previous inline-<svg> version could fail:
//   • xmlns is mandatory for SVG inside <img>.
//   • Explicit width/height AND viewBox give the image an intrinsic size,
//     so it never computes to zero.
//   • encodeURIComponent escapes the '#' in both the hex colours and
//     url(#g); an unescaped '#' truncates the data URI at the fragment.
const gradCache = new Map()
function gradientSrc(key) {
  const k = FALLBACK_GRADIENTS[key] ? key : 'mc-im1'
  if (gradCache.has(k)) return gradCache.get(k)
  const [from, to] = FALLBACK_GRADIENTS[k]
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" ' +
    'viewBox="0 0 400 300" preserveAspectRatio="none">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    `<stop offset="0" stop-color="${from}"/>` +
    `<stop offset="1" stop-color="${to}"/>` +
    '</linearGradient></defs>' +
    '<rect x="0" y="0" width="400" height="300" fill="url(#g)"/></svg>'
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`
  gradCache.set(k, uri)
  return uri
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
  label,
  onOpen,
  children,
}) {
  const { refresh } = useSiteCopyMeta()
  const { editing } = useEditMode()   // founder is editing copy → card must not navigate
  const fileRef = useRef(null)
  const frameRef = useRef(null)       // the media frame — drag surface and rect source
  const imgRef = useRef(null)         // the <img> — natural-size source
  const natRef = useRef({ w: 0, h: 0 })
  const liveRef = useRef(null)        // position mid-drag (avoids stale closures)

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [moving, setMoving] = useState(false)
  const [live, setLive] = useState(null)   // triggers re-render while dragging
  const [failed, setFailed] = useState(false)

  const effectivePos = live || pos || 'center'

  // A photo that 404s or fails to decode falls back to the gradient, not to
  // a blank frame. One less way for this card to present as empty.
  const showPhoto = !!imgUrl && !failed
  const src = showPhoto ? imgUrl : gradientSrc(fallbackClass)

  // A new URL deserves a fresh attempt.
  useEffect(() => { setFailed(false) }, [imgUrl])

  // ── Self-healing WebP repair ──────────────────────────────────────────
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
  useEffect(() => { if (!showPhoto && moving) setMoving(false) }, [showPhoto, moving])

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

  // Drag the photo inside the frame. Only active in reposition mode, where
  // .mc-card-hit is inert so the press reaches this frame at all.
  function onPointerDown(e) {
    if (!moving || !showPhoto || !frameRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const el = frameRef.current
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

  // The stretched hit target goes inert in two states, which together
  // reproduce the old in-button click guards exactly:
  //   editing → clicks fall through to EditableText underneath
  //   moving  → the press reaches the media frame for the crop drag
  const inert = editing || moving

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

  return (
    <div className="mc-card-wrap">
      <div className="mc-card">
        <div
          ref={frameRef}
          className={`mc-card-media${moving ? ' mc-card-media--moving' : ''}`}
          onPointerDown={onPointerDown}
        >
          {/* ONE <img> for both states. Photo or gradient, same element,
              same paint path. See the header comment before changing this. */}
          <img
            ref={imgRef}
            className="mc-card-photo"
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget
              natRef.current = { w: el.naturalWidth || 0, h: el.naturalHeight || 0 }
            }}
            onError={() => { if (showPhoto) setFailed(true) }}
            style={{ objectPosition: showPhoto ? effectivePos : 'center' }}
          />
          <span className="mc-card-scrim" aria-hidden="true" />
        </div>

        {children}

        {/* Stretched hit target. The card's whole surface is clickable
            without any media living inside a form control. */}
        <button
          type="button"
          className="mc-card-hit"
          aria-label={label || 'Open'}
          data-inert={inert ? 'true' : 'false'}
          onClick={() => { if (inert) return; onOpen?.() }}
        />
      </div>

      {isFounder && (
        <div className="mc-card-photoedit" onClick={(e) => e.stopPropagation()}>
          {showPhoto && !busy && (
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
