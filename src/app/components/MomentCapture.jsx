// src/app/components/MomentCapture.jsx
//
// BP-5 · Capture at the moment of action. Appears right after a check-in:
// one optional photo and/or one line in the person's own words. The check-in
// is the post — there is no free-floating compose. Nothing here is ever
// pre-filled or machine-written; the line is the person's own.
//
// Uses the BP-2 captureMoment library (browser-side downscale + signed upload).
// The moment carries its challenge and domain so the daily surface (BP-6) can
// place it. Witness of real action: it only shows once the strand is done.

import { useState, useRef, useEffect } from 'react'
import { captureMoment } from '../../lib/momentCapture'
import { body, sc, at } from '../../lib/designTokens'
import { getMyHorizonDeclaration } from '../lib/horizonDeclaration'
import ShareArtifactButton from './ShareArtifactButton'
import { platformUrl } from '../lib/shareArtifact'

const MAX_LINE = 280

export default function MomentCapture({ challengeId, domain, onCaptured }) {
  const [open, setOpen]     = useState(false)
  const [line, setLine]     = useState('')
  const [file, setFile]     = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy]     = useState(false)
  const [done, setDone]     = useState(false)
  const [err, setErr]       = useState(null)
  const [horizonLine, setHorizonLine] = useState(null)
  const fileRef = useRef(null)

  // The viewer's declared horizon, if any — so the saved state can read the
  // moment back as a step toward it (BP-8). Loaded lazily once the capture
  // panel is opened; verbatim, never derived.
  useEffect(() => {
    if (!open) return
    let live = true
    getMyHorizonDeclaration().then(d => { if (live) setHorizonLine(d?.line || null) })
    return () => { live = false }
  }, [open])

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { setErr('That file is not an image.'); return }
    setErr(null)
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result)
    reader.readAsDataURL(f)
  }

  function clearPhoto() {
    setFile(null); setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function save() {
    const hasLine = line.trim().length > 0
    if (!file && !hasLine) return
    setBusy(true); setErr(null)
    try {
      const moment = await captureMoment({
        file: file || undefined,
        line: hasLine ? line.trim() : undefined,
        challengeId: challengeId || undefined,
        domain: domain || undefined,
      })
      setDone(true)
      if (onCaptured) onCaptured(moment)
    } catch (e) {
      setErr(e.message || 'Could not save that. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div style={{ marginTop: '10px' }}>
        {horizonLine && (
          <div style={{ marginBottom: '6px' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: at.verdigris }}>
              A step toward
            </span>
            <div style={{ ...body, fontSize: '14px', color: at.meta, lineHeight: 1.45,
              fontStyle: 'italic', marginTop: '2px' }}>
              {horizonLine}
            </div>
          </div>
        )}
        <div style={{ ...body, fontSize: '13px', color: at.ghost }}>
          Added to your moments.
        </div>
        {/* Share this moment straight from the capture confirmation (BP-7). */}
        <div style={{ marginTop: '10px' }}>
          <ShareArtifactButton
            size="sm"
            filename="nextus-moment.png"
            shareText="A moment on NextUs"
            artifact={{
              eyebrow: 'A moment on NextUs',
              headline: line.trim() || 'A step taken today.',
              horizon: horizonLine,
              footNote: domain ? String(domain) : null,
              url: platformUrl('/today'),
            }}
          />
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: at.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '10px' }}
      >
        + Add a photo or a line
      </button>
    )
  }

  const canSave = (!!file || line.trim().length > 0) && !busy

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${at.verdigrisEdge}` }}>
      {preview ? (
        <div style={{ position: 'relative', marginBottom: '10px', maxWidth: '220px' }}>
          <img src={preview} alt="Your moment" style={{ width: '100%', borderRadius: '8px', display: 'block' }} />
          <button type="button" onClick={clearPhoto}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: at.ghost, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', position: 'absolute', top: '6px', right: '6px' }}>
            Remove
          </button>
        </div>
      ) : (
        <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: at.ghost, cursor: 'pointer', display: 'inline-block', marginBottom: '10px' }}>
          + Add a photo
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />
        </label>
      )}

      <textarea
        value={line}
        onChange={e => setLine(e.target.value.slice(0, MAX_LINE))}
        placeholder="A line, in your own words (optional)"
        rows={2}
        style={{ ...body, width: '100%', boxSizing: 'border-box', fontSize: '15px', color: at.text, background: at.ground, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '8px', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }}
      />
      <div style={{ ...body, fontSize: '13px', color: at.ghost, textAlign: 'right', marginTop: '2px' }}>
        {line.length}/{MAX_LINE}
      </div>

      {err && <div style={{ ...body, fontSize: '13px', color: '#E88', marginTop: '6px' }}>{err}</div>}

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button type="button" onClick={save} disabled={!canSave}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0F241D', background: at.verdigris, border: 'none', borderRadius: '20px', padding: '9px 20px', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5 }}>
          {busy ? 'Saving…' : 'Add moment'}
        </button>
        <button type="button" onClick={() => { setOpen(false); clearPhoto(); setLine(''); setErr(null) }} disabled={busy}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: at.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '9px 4px' }}>
          Not now
        </button>
      </div>
    </div>
  )
}
