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
//   • mc.card.<slug>.pos    → CSS background-position, e.g. "62% 30%"
//
// The image is drawn with `background-size: cover`, so the frame always
// stays full-bleed; repositioning only chooses WHICH part of the photo
// shows through. Dragging is pixel-accurate: we measure the photo's
// natural size, work out how far it overflows the frame on each axis,
// and translate a pixel drag into the matching change in background
// position. Axes with no overflow simply don't move.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { saveCopy, clearCopy, useSiteCopyMeta } from '../../../lib/siteCopy'

const clamp = (n) => Math.max(0, Math.min(100, n))

// Parse a CSS background-position string into {x, y} percentages.
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
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `cards/${imgId.replace(/[^a-z0-9.-]+/gi, '-')}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('site-images')
        .upload(path, f, { upsert: true, contentType: f.type })
      if (upErr) throw upErr
      const ok = await saveCopy(imgId, path)
      if (!ok) throw new Error('Could not save')
      // A fresh photo starts centred: clear any prior crop position.
      await clearCopy(posId)
      await refresh()
    } catch (e2) {
      setErr(e2?.message || 'Upload failed')
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

  return (
    <div className="mc-card-wrap">
      <button type="button" className="mc-card" onClick={handleCardClick}>
        <span
          ref={imgRef}
          className={
            `mc-card-img${imgUrl ? '' : ' ' + fallbackClass}` +
            (moving ? ' mc-card-img--moving' : '')
          }
          style={imgUrl ? { backgroundImage: `url(${imgUrl})`, backgroundPosition: effectivePos } : undefined}
          onPointerDown={onPointerDown}
        />
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
