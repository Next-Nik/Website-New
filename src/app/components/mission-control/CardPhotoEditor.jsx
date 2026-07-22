// ─────────────────────────────────────────────────────────────
// CardPhotoEditor.jsx
//
// Founder-only control that sits over a home card's image. Click it,
// pick a photo, and it uploads to the public `site-images` bucket
// (migration 177) and stores the resulting path as a site_copy
// override for this card. Every visitor then sees the photo; only the
// founder sees this control. A second action clears it back to the
// gradient. Renders nothing for non-founders.
// ─────────────────────────────────────────────────────────────

import { useRef, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { saveCopy, clearCopy, useSiteCopyMeta } from '../../../lib/siteCopy'

export default function CardPhotoEditor({ imgId, hasImage }) {
  const { refresh } = useSiteCopyMeta()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState(null)

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
      await refresh()
    } catch (e2) {
      setErr(e2?.message || 'Upload failed')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function clear() {
    setBusy(true); setErr(null)
    await clearCopy(imgId)
    await refresh()
    setBusy(false)
  }

  return (
    <div className="mc-card-photoedit" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        className="mc-card-photobtn"
        title={hasImage ? 'Change photo' : 'Add a photo'}
        disabled={busy}
        onClick={() => fileRef.current && fileRef.current.click()}
      >
        {busy ? '…' : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        )}
      </button>
      {hasImage && !busy && (
        <button type="button" className="mc-card-photoclear" title="Remove photo" onClick={clear}>×</button>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={upload} style={{ display: 'none' }} />
      {err && <span className="mc-card-photoerr">{err}</span>}
    </div>
  )
}
