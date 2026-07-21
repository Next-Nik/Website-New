// ─────────────────────────────────────────────────────────────
// VoiceRecorder.jsx — capture one I Am clip, in the owner's voice
//
// A small, self-contained recorder. The person taps Record, says the
// statement once, stops, hears it back, and keeps it. The take uploads
// straight to the private ia-voice bucket (browser Blob → storage, RLS
// scopes it to their own folder) and the clip index is upserted.
//
// One current clip per (user, domain). Re-recording overwrites: a new
// take replaces the old, and if the file extension changed (Chrome
// records webm, Safari mp4) the stale object is removed.
//
// Props:
//   userId       — the owner
//   domain       — which of the seven statements this clip belongs to
//   existingPath — current storage path, or null if none yet
//   onSaved      — ({ storage_path, duration_ms }) => void
//   compact      — tighter layout for inline use (default false)
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { tokens, body, sc } from '../../../lib/designTokens'

// Pick the best container the browser will actually record.
function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const cands = [
    'audio/webm;codecs=opus', 'audio/webm',
    'audio/mp4', 'audio/aac',
    'audio/ogg;codecs=opus', 'audio/ogg',
  ]
  for (const m of cands) {
    try { if (MediaRecorder.isTypeSupported(m)) return m } catch { /* keep going */ }
  }
  return ''
}

function extFor(mime) {
  if (!mime) return 'webm'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4') || mime.includes('aac')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mpeg')) return 'mp3'
  if (mime.includes('wav')) return 'wav'
  return 'webm'
}

function fmt(ms) {
  const s = Math.floor(ms / 1000)
  return `0:${String(s).padStart(2, '0')}`
}

const SUPPORTED = typeof navigator !== 'undefined'
  && !!navigator.mediaDevices?.getUserMedia
  && typeof MediaRecorder !== 'undefined'

export default function VoiceRecorder({ userId, domain, existingPath = null, onSaved = () => {}, compact = false }) {
  const [phase, setPhase]   = useState('idle')   // idle | recording | review | saving
  const [elapsed, setElapsed] = useState(0)
  const [error, setError]   = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  const recRef    = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const blobRef   = useRef(null)
  const mimeRef   = useRef('')
  const tickRef   = useRef(null)
  const startRef  = useRef(0)
  const previewRef = useRef(null)

  // Tidy up the stream, timer, and any object URL on unmount.
  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current)
    try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch { /* */ }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function start() {
    setError('')
    if (!SUPPORTED) { setError('Recording isn’t available in this browser. Try Chrome, or Safari with microphone access on.'); return }
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      setError(e?.name === 'NotAllowedError'
        ? 'Microphone access is off. Turn it on for this site, then tap Record again.'
        : 'Couldn’t reach the microphone. Check it’s connected and allowed, then try again.')
      return
    }
    streamRef.current = stream
    const mime = pickMime()
    mimeRef.current = mime
    let rec
    try { rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream) }
    catch { rec = new MediaRecorder(stream) }
    recRef.current = rec
    chunksRef.current = []
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunksRef.current.push(ev.data) }
    rec.onstop = () => {
      try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch { /* */ }
      const blob = new Blob(chunksRef.current, { type: mimeRef.current || 'audio/webm' })
      blobRef.current = blob
      const url = URL.createObjectURL(blob)
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
      setPhase('review')
    }
    rec.start()
    startRef.current = Date.now()
    setElapsed(0)
    setPhase('recording')
    tickRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 200)
  }

  function stop() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    setElapsed(Date.now() - startRef.current)
    try { recRef.current?.stop() } catch { /* */ }
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(''); blobRef.current = null; setPhase('idle'); setElapsed(0)
  }

  function playPreview() {
    if (!previewUrl) return
    const a = previewRef.current || new Audio(previewUrl)
    previewRef.current = a
    a.currentTime = 0
    a.play().catch(() => {})
  }

  async function save() {
    const blob = blobRef.current
    if (!blob || !userId || !domain) return
    setPhase('saving'); setError('')
    const ext = extFor(mimeRef.current || blob.type)
    const path = `${userId}/${domain}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('ia-voice')
      .upload(path, blob, { upsert: true, contentType: blob.type || 'audio/webm' })
    if (upErr) { setError('Couldn’t save the recording. Please try again.'); setPhase('review'); return }

    // If the previous take used a different extension, clear the stale file.
    if (existingPath && existingPath !== path) {
      try { await supabase.storage.from('ia-voice').remove([existingPath]) } catch { /* harmless */ }
    }

    const duration_ms = Math.max(0, Math.round(elapsed))
    const { error: rowErr } = await supabase.from('ia_voice_clips').upsert({
      user_id: userId, domain, storage_path: path, duration_ms, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,domain' })
    if (rowErr) { setError('Saved the audio, but couldn’t update the record. Try once more.'); setPhase('review'); return }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(''); blobRef.current = null; setPhase('idle'); setElapsed(0)
    onSaved({ storage_path: path, duration_ms })
  }

  // ── Render ──────────────────────────────────────────────────
  const wrap = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? '10px' : '14px' }

  if (error && phase === 'idle') {
    return (
      <div style={wrap}>
        <p style={{ ...body, fontSize: '14px', color: '#7A2D08', lineHeight: 1.5, textAlign: 'center', margin: 0, maxWidth: '340px' }}>{error}</p>
        <PillButton onClick={start}>Try again</PillButton>
      </div>
    )
  }

  if (phase === 'recording') {
    return (
      <div style={wrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#C45010', display: 'inline-block', animation: 'iaRecPulse 1.1s ease-in-out infinite' }} />
          <span style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', color: tokens.dark }}>Recording · {fmt(elapsed)}</span>
        </div>
        <PillButton solid onClick={stop}>Stop</PillButton>
        <style>{`@keyframes iaRecPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.82)}}`}</style>
      </div>
    )
  }

  if (phase === 'review') {
    return (
      <div style={wrap}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.gold }}>Your take · {fmt(elapsed)}</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <PillButton onClick={playPreview}>▶ Hear it</PillButton>
          <PillButton onClick={discard}>Record again</PillButton>
          <PillButton solid onClick={save}>Keep this</PillButton>
        </div>
        {error && <p style={{ ...body, fontSize: '13px', color: '#7A2D08', margin: 0, textAlign: 'center' }}>{error}</p>}
      </div>
    )
  }

  if (phase === 'saving') {
    return <div style={wrap}><span style={{ ...sc, fontSize: '14px', letterSpacing: '0.1em', color: tokens.ghost }}>Saving…</span></div>
  }

  // idle
  return (
    <div style={wrap}>
      <PillButton solid onClick={start}>{existingPath ? '● Re-record' : '● Record your voice'}</PillButton>
    </div>
  )
}

function PillButton({ children, onClick, solid = false }) {
  return (
    <button onClick={onClick} style={{
      ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: solid ? '#FFFFFF' : tokens.gold,
      background: solid ? tokens.goldChrome : 'transparent',
      border: solid ? 'none' : `1px solid ${tokens.goldChrome}`,
      borderRadius: '40px', padding: '11px 24px', cursor: 'pointer',
    }}>{children}</button>
  )
}
