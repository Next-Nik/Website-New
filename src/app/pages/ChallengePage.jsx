import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'
import { DOMAIN_COLORS, SELF_DOMAIN_COLORS } from '../constants/domains'
import { INTENSITY_BY_LEVEL } from '../../constants/challengeIntensity'
import IntensityInfo from '../components/challenge/IntensityInfo'
import ChiliRung from '../components/challenge/ChiliRung'
import ChallengeIdentityVoice from '../components/challenge/ChallengeIdentityVoice'
import ChallengeLineage from '../components/challenge/ChallengeLineage'
import BroadcastComposer from '../components/challenge/BroadcastComposer'
import BroadcastFeed from '../components/challenge/BroadcastFeed'
import ConstellationMeter from '../components/challenge/ConstellationMeter'
import PublicBeacon from '../components/challenge/PublicBeacon'

// ─── Design shortcuts ─────────────────────────────────────────────────────────

const gold   = { color: tokens.gold }
const muted  = { color: 'rgba(15,21,35,0.78)' }
const hair   = '1px solid rgba(200,146,42,0.18)'
const GOLD_C = tokens.goldChrome

// Turn a YouTube or Vimeo URL into an embeddable src. Returns null otherwise,
// so an unrecognised or empty link simply renders nothing.
function videoEmbedSrc(url) {
  if (!url) return null
  const u = String(url).trim()
  let m
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)))
    return `https://www.youtube.com/embed/${m[1]}`
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)))
    return `https://player.vimeo.com/video/${m[1]}`
  return null
}

function Eyebrow({ children, style = {} }) {
  return (
    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', ...gold, marginBottom: '6px', textTransform: 'uppercase', ...style }}>
      {children}
    </div>
  )
}

function Rule({ style = {} }) {
  return <div style={{ height: '1px', background: 'rgba(200,146,42,0.18)', margin: '16px 0', ...style }} />
}

function Btn({ onClick, disabled, children, style = {}, variant = 'solid' }) {
  const base = {
    ...sc, fontSize: '15px', letterSpacing: '0.14em', padding: '12px 28px',
    borderRadius: '40px', cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1.5px solid rgba(200,146,42,0.78)', transition: 'all 0.2s',
    opacity: disabled ? 0.45 : 1,
  }
  const styles =
      variant === 'ghost'   ? { ...base, background: 'transparent', color: tokens.gold }
    : variant === 'primary' ? { ...base, background: tokens.goldChrome, color: '#FBF8F0', border: `1.5px solid ${tokens.gold}`, fontSize: '16px', fontWeight: 500, padding: '15px 36px', boxShadow: '0 10px 26px -14px rgba(168,114,26,0.55)' }
    : { ...base, background: 'rgba(200,146,42,0.08)', color: tokens.gold }
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ ...styles, ...style }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}>
      {children}
    </button>
  )
}

// ─── Author controls ──────────────────────────────────────────────────────────
// Shown only to the author (or a founder). Close is reversible; Delete is a
// permanent tombstone that re-roots any children one notch higher. The Delete
// path fetches its impact first so the author sees what re-roots before committing.

function AuthorControls({ call, userId, onUpdated, onDeleted }) {
  const [busy,    setBusy]    = useState(false)
  const [mode,    setMode]    = useState(null)   // null | 'close' | 'confirmDelete'
  const [impact,  setImpact]  = useState(null)
  const [err,     setErr]     = useState(null)

  const closed = call.lifecycle_state === 'closed'
  const hidden = closed && call.visibility !== 'community'

  async function api(action, extra = {}) {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/actor-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, call_id: call.id, ...extra }),
      })
      const d = await r.json()
      if (!r.ok || d.error) { setErr(d.error || 'Something went wrong.'); return null }
      return d
    } catch { setErr('Network error.'); return null }
    finally { setBusy(false) }
  }

  async function doClose(keep_listed) {
    const d = await api('close', { keep_listed })
    if (d?.call) { onUpdated(d.call); setMode(null) }
  }
  async function doReopen() {
    const d = await api('reopen')
    if (d?.call) onUpdated(d.call)
  }
  async function startDelete() {
    setMode('confirmDelete')
    const d = await api('delete_impact')
    if (d) setImpact(d)
  }
  async function confirmDelete() {
    const d = await api('delete')
    if (d?.deleted) onDeleted()
  }

  const link = { ...sc, fontSize: '13px', letterSpacing: '0.12em', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }

  return (
    <div style={{ border: hair, borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', background: 'rgba(200,146,42,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>
          You author this
        </span>
        {closed && (
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.7)', border: '1px solid rgba(15,21,35,0.18)', borderRadius: '12px', padding: '2px 10px' }}>
            Closed{hidden ? ' · hidden' : ' · listed'}
          </span>
        )}
      </div>

      {/* Active: offer Close + Delete */}
      {!closed && mode === null && (
        <div style={{ display: 'flex', gap: '18px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button style={{ ...link, ...gold }} disabled={busy} onClick={() => setMode('close')}>Close challenge</button>
          <button style={{ ...link, color: '#8A3030' }} disabled={busy} onClick={startDelete}>Delete</button>
        </div>
      )}

      {/* Close: listed vs hidden */}
      {!closed && mode === 'close' && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: '0 0 10px' }}>
            Closing stops new participants. People already in it carry on. Keep it
            listed and it stays in the constellation, badged closed; hide it and it
            drops out of view. Either way you can reopen it.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Btn variant="ghost" disabled={busy} onClick={() => doClose(true)} style={{ fontSize: '13px', padding: '8px 18px' }}>Close · keep listed</Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => doClose(false)} style={{ fontSize: '13px', padding: '8px 18px' }}>Close · hide it</Btn>
            <button style={{ ...link, color: 'rgba(15,21,35,0.55)' }} disabled={busy} onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Closed: offer Reopen + Delete */}
      {closed && mode === null && (
        <div style={{ display: 'flex', gap: '18px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button style={{ ...link, ...gold }} disabled={busy} onClick={doReopen}>Reopen</button>
          <button style={{ ...link, color: '#8A3030' }} disabled={busy} onClick={startDelete}>Delete</button>
        </div>
      )}

      {/* Delete confirmation, with re-root impact */}
      {mode === 'confirmDelete' && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: '0 0 10px' }}>
            Delete is permanent. {impact == null ? 'Checking what this affects…' : (
              impact.direct_children > 0
                ? <>It re-roots {impact.direct_children} challenge{impact.direct_children === 1 ? '' : 's'} built on this one{impact.by_others > 0 ? <> ({impact.by_others} by {impact.by_others === 1 ? 'another actor' : 'other actors'})</> : ''} {impact.children_become_roots ? 'to standalone roots' : 'one notch up the tree'}. {impact.participants > 0 ? `The ${impact.participants} participant record${impact.participants === 1 ? '' : 's'} are kept.` : ''}</>
                : <>Nothing is built on this one. {impact.participants > 0 ? `The ${impact.participants} participant record${impact.participants === 1 ? '' : 's'} are kept.` : 'No participants to affect.'}</>
            )}
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Btn variant="ghost" disabled={busy || impact == null} onClick={confirmDelete} style={{ fontSize: '13px', padding: '8px 18px', borderColor: 'rgba(138,48,48,0.5)', color: '#8A3030' }}>Delete permanently</Btn>
            <button style={{ ...link, color: 'rgba(15,21,35,0.55)' }} disabled={busy} onClick={() => { setMode(null); setImpact(null) }}>Cancel</button>
          </div>
        </div>
      )}

      {err && <p style={{ ...body, fontSize: '13px', color: '#8A3030', margin: '10px 0 0' }}>{err}</p>}
    </div>
  )
}

// ─── Cadence label ────────────────────────────────────────────────────────────

const CADENCE_LABELS = {
  'daily-absolute': 'Every single day, no exceptions',
  '5-of-7':         '5 of 7 days per week',
  'weekly':         'Once per week',
  'custom':         'Custom cadence',
}

const CADENCE_SHORT = {
  'daily-absolute': 'every day',
  '5-of-7':         '5 of 7 days',
  'weekly':         'weekly',
  'custom':         '',
}

// ─── Share rail ───────────────────────────────────────────────────────────────
// Web Share API for native share sheet on mobile;
// fallbacks to WhatsApp, email, copy-link on desktop.

function ShareRail({ url, title, tagline, shareText }) {
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState(null)
  const [showQr, setShowQr] = useState(false)
  const text = shareText || tagline || title

  // The QR is the bridge from rooms to the platform: generated client-side,
  // downloadable for print. Lazy import keeps the library out of the main bundle.
  async function toggleQr() {
    if (!showQr && !qr) {
      try {
        const QRCode = (await import('qrcode')).default
        const dataUrl = await QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: '#0F1523', light: '#FFFFFF' } })
        setQr(dataUrl)
      } catch (_) { return }
    }
    setShowQr((v) => !v)
  }

  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }) } catch {}
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const waUrl   = `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`
  const mailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`

  const hasNative = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', margin: '16px 0' }}>
      {hasNative && (
        <button type="button" onClick={nativeShare}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', ...gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(168,114,26,0.65)', borderRadius: '20px', padding: '7px 16px', cursor: 'pointer' }}>
          Share →
        </button>
      )}
      {!hasNative && (
        <>
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#25D366', background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.35)', borderRadius: '20px', padding: '7px 16px', textDecoration: 'none' }}>
            WhatsApp
          </a>
          <a href={mailUrl}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.gold, background: 'rgba(200,146,42,0.07)', border: '1px solid rgba(168,114,26,0.55)', borderRadius: '20px', padding: '7px 16px', textDecoration: 'none' }}>
            Email
          </a>
        </>
      )}
      <button type="button" onClick={copyLink}
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: copied ? '#2A8C4F' : tokens.gold, background: 'none', border: '1px solid rgba(168,114,26,0.65)', borderRadius: '20px', padding: '7px 16px', cursor: 'pointer', transition: 'color 0.2s' }}>
        {copied ? '✓ Copied' : 'Copy link'}
      </button>
      <button type="button" onClick={toggleQr}
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.gold, background: 'none', border: '1px solid rgba(168,114,26,0.65)', borderRadius: '20px', padding: '7px 16px', cursor: 'pointer' }}>
        {showQr ? 'Hide QR' : 'QR code'}
      </button>
      {showQr && qr && (
        <div style={{ flexBasis: '100%', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
          <img src={qr} alt="QR code for this challenge"
            style={{ width: '150px', height: '150px', border: '1px solid rgba(15,21,35,0.12)', borderRadius: '10px', background: '#FFFFFF' }} />
          <div>
            <div style={{ ...body, fontSize: '14px', color: tokens.ghost, maxWidth: '38ch', lineHeight: 1.5 }}>
              Anyone who scans lands on this challenge and can take it on in under a minute.
            </div>
            <a href={qr} download="challenge-qr.png"
              style={{ display: 'inline-block', marginTop: '8px', ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.gold, textDecoration: 'none', borderBottom: '1px solid rgba(168,114,26,0.5)', paddingBottom: '1px' }}>
              Download PNG
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Flag modal ───────────────────────────────────────────────────────────────

function FlagModal({ callId, userId, isAsk, onClose }) {
  const [reason,    setReason]    = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)

  async function submit() {
    if (!reason.trim()) return
    setLoading(true)
    try {
      await fetch('/api/actor-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'flag', userId, call_id: callId, reason }) })
      setSubmitted(true)
    } catch {}
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: tokens.bg, border: '1.5px solid rgba(200,146,42,0.3)', borderRadius: '14px', padding: '32px 28px', maxWidth: '480px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Eyebrow style={{ marginBottom: 0 }}>{isAsk ? 'Flag this ask' : 'Flag this challenge'}</Eyebrow>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '1.1rem', color: tokens.ghost }}>×</button>
        </div>
        {submitted ? (
          <div>
            <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7 }}>Received. The team will review this challenge against community standards.</p>
            <div style={{ marginTop: '16px' }}><Btn onClick={onClose}>Close</Btn></div>
          </div>
        ) : (
          <div>
            <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '14px' }}>
              Tell us what concerns you about this challenge. The NextUs team will review it against community standards.
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="What's the concern?"
              rows={4}
              style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(200,146,42,0.3)', borderRadius: '8px', padding: '12px 14px', resize: 'vertical', outline: 'none', background: tokens.bg, boxSizing: 'border-box', marginBottom: '14px' }}
            />
            <Btn onClick={submit} disabled={!reason.trim() || loading}>{loading ? 'Sending…' : 'Submit flag'}</Btn>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Take it on modal ─────────────────────────────────────────────────────────

function fmtCloseDate(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function TakeItOnModal({ call, userId, onClose, onJoined, foundingClose }) {
  const [clock,   setClock]   = useState('rolling')
  const [loading, setLoading] = useState(false)
  const [joined,  setJoined]  = useState(false)
  const closeStr = fmtCloseDate(foundingClose)

  async function join() {
    setLoading(true)
    try {
      const res  = await fetch('/api/actor-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'take_on', userId, call_id: call.id, clock_type: clock }) })
      const data = await res.json()
      if (data.participant || data.already_joined) { setJoined(true); onJoined && onJoined(data) }
    } catch {}
    setLoading(false)
  }

  const cadenceLabel = CADENCE_LABELS[call.cadence] || call.cadence

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: tokens.bg, border: '1.5px solid rgba(200,146,42,0.3)', borderRadius: '14px', padding: '32px 28px', maxWidth: '480px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Eyebrow style={{ marginBottom: 0 }}>Take on this challenge</Eyebrow>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '1.1rem', color: tokens.ghost }}>×</button>
        </div>

        {joined ? (
          <div>
            <p style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.7, marginBottom: '20px' }}>
              {closeStr
                ? <>You're in. Everyone here plays to the one shared close: {closeStr}. Track it day by day in your challenges.</>
                : <>You're in. It starts today and runs on its own clock. Track it day by day in your challenges.</>}
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a href="/challenges"
                style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: tokens.gold, background: 'rgba(200,146,42,0.08)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }}>
                Track it →
              </a>
              <Btn variant="ghost" onClick={onClose}>Stay here</Btn>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ padding: '14px 16px', background: 'rgba(200,146,42,0.05)', border: hair, borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.65, marginBottom: '8px' }}>
                <strong style={{ ...sc, fontWeight: 400 }}>The move:</strong> {call.the_move}
              </div>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.ghost }}>
                {cadenceLabel}
                {call.cadence === 'daily-absolute' && (
                  <span style={{ color: '#D63838', marginLeft: '8px' }}>· Absolute · no missed days</span>
                )}
                {closeStr ? ` · to ${closeStr}` : ` · ${call.duration_days} days`}
              </div>
            </div>
            {closeStr ? (
              <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '20px' }}>
                It starts the day you take it on. No clock to choose: everyone in this constellation plays to the one shared close.
              </p>
            ) : (
              <>
                <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '14px' }}>
                  It starts the day you take it on and runs on its own clock. Choose your clock.
                </p>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {[{ v: 'rolling', l: `Rolling ${call.duration_days || 90} days` }, { v: 'calendar', l: 'Calendar quarter' }].map(o => (
                    <button key={o.v} type="button" onClick={() => setClock(o.v)}
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s',
                        border: `1px solid ${clock === o.v ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.3)'}`,
                        background: clock === o.v ? 'rgba(200,146,42,0.08)' : 'transparent',
                        color: clock === o.v ? tokens.gold : tokens.ghost }}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </>
            )}
            <Btn onClick={join} disabled={loading}>{loading ? 'Joining…' : 'Take it on →'}</Btn>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Founding doors modal ─────────────────────────────────────────────────────
// The founding Earth Challenge has no daily move of its own. Taking it on means
// choosing how to take part: author your own challenge beneath it, or accept one
// already moving. Both doors stay open, and there is no clock to choose —
// everyone in the constellation plays to the one shared close.

function FoundingDoorsModal({ hasActor, onClose }) {
  // Everyone lands on the author surface. If they have no controlled actor yet,
  // the three-path chooser there sets them up; no one is routed into the generic
  // "add anyone to the ecosystem" page, where authoring is a dead end.
  const createHref = '/challenges/new?carry=founding-nature'
  const cream = '#FBF8F0', cream80 = 'rgba(251,248,240,0.82)', cream60 = 'rgba(251,248,240,0.60)', goldT = '#D7A24A'
  const door = (href, title, sub) => (
    <a href={href} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', textDecoration: 'none',
      background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.30)', borderRadius: '12px', padding: '16px 18px' }}>
      <span style={{ flex: 1 }}>
        <span style={{ ...serif, fontWeight: 400, fontSize: '21px', lineHeight: 1.2, color: cream, display: 'block', marginBottom: '4px' }}>{title}</span>
        <span style={{ ...body, fontSize: '14px', lineHeight: 1.55, color: cream60, display: 'block' }}>{sub}</span>
      </span>
      <span style={{ ...sc, fontSize: '1.1rem', color: goldT, marginTop: '2px' }}>&rarr;</span>
    </a>
  )
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#141B2C', border: '1.5px solid rgba(200,146,42,0.3)', borderRadius: '14px', padding: '30px 28px 26px', maxWidth: '480px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: goldT }}>Accept challenge</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '1.15rem', color: cream60 }}>×</button>
        </div>
        <p style={{ ...body, fontSize: '1.0625rem', lineHeight: 1.65, color: cream80, margin: '0 0 18px' }}>
          The NextUs Earth Challenge runs on one shared clock. Two ways to take it on.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {door(createHref, 'Create a challenge', 'Make your own way of stewarding the living world. Others can take it on and carry it forward.')}
          {door('/challenges/browse?domain=nature', 'See live challenges', "Take on one that's already moving.")}
        </div>
      </div>
    </div>
  )
}

// ─── Fulfill modal (Ask type) ─────────────────────────────────────────────────
// The ask fulfillment gesture: express interest, leave an optional note,
// the actor sees who offered. No session created — fulfillment is not a stretch.

function FulfillModal({ call, userId, onClose, onFulfilled }) {
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  const spotsLeft = call.ask_quantity
    ? call.ask_quantity - ((call.active_count || 0) + (call.completed_count || 0))
    : null

  async function fulfill() {
    setLoading(true)
    try {
      const res  = await fetch('/api/actor-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fulfill', userId, call_id: call.id, note: note.trim() || null }) })
      const data = await res.json()
      if (data.participant || data.already_offered) { setDone(true); onFulfilled && onFulfilled() }
    } catch {}
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: tokens.bg, border: '1.5px solid rgba(200,146,42,0.3)', borderRadius: '14px', padding: '32px 28px', maxWidth: '480px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Eyebrow style={{ marginBottom: 0 }}>Offer to help</Eyebrow>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '1.1rem', color: tokens.ghost }}>×</button>
        </div>
        {done ? (
          <div>
            <p style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.7, marginBottom: '20px' }}>
              You&rsquo;re in. When it&rsquo;s done, come back and mark it built.
            </p>
            {call.ask_details && (
              <div style={{ padding: '14px 16px', background: 'rgba(200,146,42,0.05)', border: hair, borderRadius: '10px', marginBottom: '18px' }}>
                <Eyebrow style={{ marginBottom: '6px' }}>How to complete this</Eyebrow>
                <div style={{ ...body, fontSize: '1rem', ...muted, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{call.ask_details}</div>
              </div>
            )}
            <Btn onClick={onClose}>Done</Btn>
          </div>
        ) : (
          <div>
            <div style={{ padding: '14px 16px', background: 'rgba(200,146,42,0.05)', border: hair, borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.65 }}>{call.the_move}</div>
              {spotsLeft !== null && (
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.gold, marginTop: '6px' }}>
                  {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} remaining
                </div>
              )}
              {call.ask_deadline && (
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.ghost, marginTop: '4px' }}>
                  Needed by {new Date(call.ask_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any context you'd like to share (optional)"
              rows={3}
              style={{ width: '100%', ...body, fontSize: '1.0625rem', color: tokens.dark, border: '1px solid rgba(200,146,42,0.3)', borderRadius: '8px', padding: '12px 14px', resize: 'vertical', outline: 'none', background: tokens.bg, boxSizing: 'border-box', marginBottom: '14px' }}
            />
            <Btn onClick={fulfill} disabled={loading}>{loading ? 'Sending…' : 'Offer to help →'}</Btn>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Ask body ─────────────────────────────────────────────────────────────────
// Renders the Ask-specific fields: what's needed, quantity, deadline, offers.

function AskBody({ call }) {
  const deadline = call.ask_deadline
    ? new Date(call.ask_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const spotsTotal = call.ask_quantity || null
  const spotsLeft  = spotsTotal ? Math.max(0, spotsTotal - ((call.active_count || 0) + (call.completed_count || 0))) : null
  const isFull     = spotsLeft !== null && spotsLeft === 0

  return (
    <div>
      {/* What's needed */}
      <div style={{ padding: '20px 22px', background: 'rgba(200,146,42,0.04)', border: `1.5px solid ${GOLD_C}`, borderRadius: '12px', marginBottom: '20px' }}>
        <Eyebrow>What's needed</Eyebrow>
        <p style={{ ...body, fontSize: '1.125rem', color: tokens.dark, lineHeight: 1.7, margin: 0 }}>
          {call.the_move}
        </p>
      </div>

      {/* Quantity + deadline */}
      {(spotsTotal || deadline) && (
        <div style={{ display: 'grid', gridTemplateColumns: spotsTotal && deadline ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '20px' }}>
          {spotsTotal && (
            <div style={{ padding: '16px 18px', background: tokens.bgCard, border: hair, borderRadius: '10px' }}>
              <Eyebrow style={{ marginBottom: '4px' }}>Spots</Eyebrow>
              <div style={{ ...body, fontSize: '1.0625rem', color: isFull ? '#D63838' : tokens.dark }}>
                {isFull ? 'Full' : `${spotsLeft} of ${spotsTotal} remaining`}
              </div>
            </div>
          )}
          {deadline && (
            <div style={{ padding: '16px 18px', background: tokens.bgCard, border: hair, borderRadius: '10px' }}>
              <Eyebrow style={{ marginBottom: '4px' }}>Needed by</Eyebrow>
              <div style={{ ...body, fontSize: '1.0625rem', color: tokens.dark }}>{deadline}</div>
            </div>
          )}
        </div>
      )}

      {/* Horizon goal + mechanism */}
      {(call.horizon_goal_text || call.mechanism) && (
        <div style={{ marginBottom: '20px' }}>
          {call.horizon_goal_text && (
            <div style={{ marginBottom: '14px' }}>
              <Eyebrow>Why this matters</Eyebrow>
              <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: 0 }}>
                {call.horizon_goal_text}
              </p>
            </div>
          )}
          {call.mechanism && (
            <div>
              <Eyebrow>What this enables</Eyebrow>
              <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: 0 }}>
                {call.mechanism}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Author feedback section ──────────────────────────────────────────────────
// Visible only to the call's author. Shows aggregate counts and a wall of
// consented, public reflections. Individual identity never exposed.

function AuthorFeedbackSection({ callId, userId }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState(false)

  useEffect(() => {
    if (!open || data) return
    fetch('/api/actor-calls', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_feedback', userId, call_id: callId }),
    })
      .then(r => r.json())
      .then(d => { if (d.counts) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  return (
    <div style={{ marginTop: '32px', paddingTop: '28px', borderTop: hair }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <Eyebrow style={{ marginBottom: 0 }}>Author view</Eyebrow>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          {open ? 'Close' : 'View feedback →'}
        </button>
      </div>

      {open && (
        <div>
          {loading ? (
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost }}>Loading…</div>
          ) : data ? (
            <div>
              {/* Aggregate counts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                {[
                  { l: 'Taken on',  v: data.counts.taken_on  },
                  { l: 'Active',    v: data.counts.active    },
                  { l: 'Completed', v: data.counts.completed },
                ].map(c => (
                  <div key={c.l} style={{ padding: '14px 16px', background: tokens.bgCard, border: hair, borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ ...serif, fontSize: '1.75rem', fontWeight: 300, color: tokens.dark, marginBottom: '2px' }}>{c.v || 0}</div>
                    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost }}>{c.l.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              {/* Reflections */}
              {data.reflections.length > 0 ? (
                <div>
                  <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: tokens.ghost, marginBottom: '12px' }}>
                    {data.reflections.length} REFLECTION{data.reflections.length === 1 ? '' : 'S'} SHARED
                  </div>
                  {data.reflections.map((r, i) => (
                    <div key={i} style={{ padding: '16px 18px', background: tokens.bgCard, border: hair, borderRadius: '10px', marginBottom: '10px' }}>
                      <p style={{ ...body, fontStyle: 'italic', fontSize: '1.0625rem', color: tokens.dark, lineHeight: 1.7, margin: '0 0 8px' }}>
                        {r.reflection}
                      </p>
                      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.ghost, display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {r.anonymous ? (
                          <span>Anonymous</span>
                        ) : (
                          <span>{r.display_name}</span>
                        )}
                        {r.completed_at && (
                          <span>{new Date(r.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost, lineHeight: 1.7 }}>
                  No reflections shared yet. They appear here as participants complete and consent to share.
                </p>
              )}
            </div>
          ) : (
            <p style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost }}>Could not load feedback.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Auth prompt ──────────────────────────────────────────────────────────────

function AuthPrompt({ callSlug, isAsk }) {
  // Most people arrive here having never seen the platform: the page is fully
  // public, and the moment they touch the button we ask them to sign in, then
  // Login honours ?redirect= and lands them straight back MID-GESTURE — for
  // challenges the return carries ?accept=1 so the accept fork opens itself.
  const back = isAsk ? `/stretch/c/${callSlug}` : `/stretch/c/${callSlug}?accept=1`
  const dest = `/login?redirect=${encodeURIComponent(back)}`
  return (
    <div style={{ marginTop: '4px' }}>
      <Link to={dest}
        style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#1a1320', background: '#F2C45A', border: 'none', borderRadius: '40px', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' }}>
        {isAsk ? 'Offer to help →' : 'Take this on →'}
      </Link>
      <p style={{ ...body, fontSize: '14px', ...muted, lineHeight: 1.6, marginTop: '10px' }}>
        You will be asked to sign in or create an account first. It takes a minute, and you land right back here.
      </p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ChallengePage() {
  const { slug }                    = useParams()
  const navigate                    = useNavigate()
  const { user }                    = useAuth()
  const [call,          setCall]    = useState(null)
  const [loading,       setLoading] = useState(true)
  const [notFound,      setNotFound] = useState(false)
  const [showTakeItOn,  setShowTakeItOn]  = useState(false)
  const [showFulfill,   setShowFulfill]   = useState(false)
  const [showFlag,      setShowFlag]      = useState(false)
  const [alreadyJoined, setAlreadyJoined] = useState(false)
  const [myStatus,      setMyStatus]      = useState('none')  // none | active | complete
  const [busyComplete,  setBusyComplete]  = useState(false)
  // Co-sign display (Phase E) — count loaded with the call
  const [cosignerCount, setCosignerCount] = useState(0)
  // Ask to partner (actor owners only)
  const [ownedActors, setOwnedActors] = useState([])
  const [askSel,  setAskSel]  = useState('')
  const [askSent, setAskSent] = useState(false)
  const [askBusy, setAskBusy] = useState(false)
  // Founding constellation — the Earth Challenge root opens two doors, not a clock.
  const [foundingRootSlug, setFoundingRootSlug] = useState(null)
  const [showDoors,        setShowDoors]        = useState(false)

  const isAsk    = call?.type === 'ask'
  const isAuthor = user && call && (
    call.user_id === user.id ||
    (call.nextus_actors && call.nextus_actors.profile_owner === user.id)
  )

  useEffect(() => {
    if (!slug) return
    fetch('/api/actor-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_by_slug', slug }) })
      .then(r => r.json())
      .then(data => {
        if (data.call) { setCall(data.call); setCosignerCount(data.call.cosigner_count || 0) }
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    let live = true
    fetch('/api/beacon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 'founding-nature' }) })
      .then(r => r.json())
      .then(d => { if (live && d && d.rooted && d.root_slug) setFoundingRootSlug(d.root_slug) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (!user) { setOwnedActors([]); return }
    let live = true
    supabase.from('nextus_actors').select('id, name, type').eq('profile_owner', user.id)
      .then(({ data }) => { if (live) { const a = data || []; setOwnedActors(a); if (a.length) setAskSel(a[0].id) } })
    return () => { live = false }
  }, [user])

  useEffect(() => {
    if (!user || !call?.id) return
    let live = true
    fetch('/api/actor-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_participation', userId: user.id, call_id: call.id }) })
      .then(r => r.json())
      .then(d => {
        if (!live) return
        const st = (d.participant && d.participant.status) || 'none'
        setMyStatus(st)
        if (st === 'active' || st === 'complete') setAlreadyJoined(true)
      })
      .catch(() => {})
    return () => { live = false }
  }, [user, call?.id])

  async function completeAsk() {
    if (!user || !call) return
    setBusyComplete(true)
    try {
      const r = await fetch('/api/actor-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_ask', userId: user.id, call_id: call.id }) })
      const d = await r.json()
      if (d.participant || d.already_complete) {
        setMyStatus('complete')
        setCall(c => c ? { ...c,
          completed_count: (c.completed_count || 0) + 1,
          active_count: Math.max(0, (c.active_count || 0) - 1),
          ask_fulfilled: (c.ask_fulfilled || 0) + 1,
        } : c)
      }
    } catch {}
    setBusyComplete(false)
  }

  // arriving with ?accept=1 (from the strip or a shared link) opens the accept
  // fork directly once the call is loaded and the person is signed in.
  // Lives here, above the loading/not-found returns, so the hook count is
  // stable across renders.
  useEffect(() => {
    if (!call) return
    try {
      const q = new URLSearchParams(window.location.search)
      if (q.get('accept') !== '1') return
      if (user === null) {
        // resolved signed-out: straight to sign-in, full return preserved
        navigate(`/login?redirect=${encodeURIComponent(`/stretch/c/${slug}?accept=1`)}`)
        return
      }
      if (!user) return // auth still resolving
      const isRoot = !!foundingRootSlug && slug === foundingRootSlug
      if (isRoot) setShowDoors(true)
      else setShowTakeItOn(true)
      q.delete('accept')
      window.history.replaceState({}, '', window.location.pathname + (q.toString() ? `?${q}` : ''))
    } catch (_) { /* the button on the page still works */ }
  }, [call, user, foundingRootSlug, slug, navigate])

  async function askToPartner() {
    if (!call || !askSel) return
    setAskBusy(true)
    try {
      const r = await fetch('/api/actor-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_partner', userId: user.id, call_id: call.id, partner_actor_id: askSel }),
      })
      const d = await r.json()
      if (!d.error) setAskSent(true)
    } catch {}
    setAskBusy(false)
  }

  if (loading) return <div className="loading" />
  if (notFound) return (
    <div style={{ padding: '0 0 0', background: tokens.bg, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '120px 24px', textAlign: 'center' }}>
        <Eyebrow style={{ textAlign: 'center', display: 'block', marginBottom: '12px' }}>Challenge not found</Eyebrow>
        <p style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.7 }}>
          This challenge may have been withdrawn or the link has changed.
        </p>
        <div style={{ marginTop: '24px' }}>
          <a href="/atlas" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textDecoration: 'none', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '30px', padding: '10px 24px', display: 'inline-block' }}>
            Browse the Atlas →
          </a>
        </div>
      </div>
    </div>
  )

  const colour  = DOMAIN_COLORS[call.domain] || SELF_DOMAIN_COLORS[call.domain] || GOLD_C
  const pageUrl = typeof window !== 'undefined' ? window.location.href : `https://nextus.world/stretch/c/${slug}`
  const cadenceLabel = CADENCE_LABELS[call.cadence] || (call.cadence ? call.cadence.charAt(0).toUpperCase() + call.cadence.slice(1) : call.cadence)
  const authorName   = call.nextus_actors?.name || null
  const strands      = Array.isArray(call.protocol) ? call.protocol.filter(s => s && s.text) : []
  const partners     = Array.isArray(call.partners) ? call.partners : []
  const isFoundingRoot = !!foundingRootSlug && slug === foundingRootSlug

  return (
    <div style={{ background: tokens.bg, minHeight: '100dvh' }}>
      <Nav />
      <style>{`
        .np-lede::first-letter{ -webkit-initial-letter: 2; initial-letter: 2; color: #A8721A; font-weight: 500; font-family: 'Cormorant Garamond', Georgia, serif; margin-right: 14px; }
      `}</style>

      {showDoors && user && (
        <FoundingDoorsModal hasActor={ownedActors.length > 0} onClose={() => setShowDoors(false)} />
      )}
      {showTakeItOn && user && (
        <TakeItOnModal call={call} userId={user.id} foundingClose={call.in_founding_constellation ? call.founding_closes_on : null} onClose={() => setShowTakeItOn(false)}
          onJoined={() => { setAlreadyJoined(true); setShowTakeItOn(false); setCall(c => c ? { ...c, taken_on_count: (c.taken_on_count || 0) + 1 } : c) }} />
      )}
      {showFulfill && user && (
        <FulfillModal call={call} userId={user.id} onClose={() => setShowFulfill(false)}
          onFulfilled={() => { setAlreadyJoined(true); setMyStatus('active'); setShowFulfill(false); setCall(c => c ? { ...c, active_count: (c.active_count || 0) + 1 } : c) }} />
      )}
      {showFlag && (
        <FlagModal callId={call.id} userId={user?.id} isAsk={isAsk} onClose={() => setShowFlag(false)} />
      )}

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(64px,8vw,96px) clamp(20px,5vw,40px) 100px' }}>

        {/* Cover — a single image leading the page, constrained to a centred
            plate so square illustrations and landscape banners both read whole. */}
        {call.cover_image_url && (
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', maxWidth: '460px', width: '100%' }}>
              <div aria-hidden="true" style={{ position: 'absolute', inset: '-9%', background: 'radial-gradient(circle at 50% 46%, rgba(200,146,42,0.16), rgba(200,146,42,0.04) 45%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
              <img
                src={call.cover_image_url}
                alt=""
                loading="lazy"
                style={{ position: 'relative', zIndex: 1, width: '100%', height: 'auto', borderRadius: '18px', border: hair, boxShadow: '0 18px 50px -28px rgba(15,21,35,0.32)', display: 'block' }}
              />
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <Eyebrow style={{ marginBottom: 0 }}>
              {call.type === 'challenge' ? 'Challenge' : 'Ask'} · {call.domain || call.scale}
            </Eyebrow>
            {call.visibility === 'link_only' && (
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.ghost, border: '1px solid rgba(15,21,35,0.18)', borderRadius: '12px', padding: '2px 10px' }}>
                Link only
              </span>
            )}
            {call.lifecycle_state === 'closed' && (
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.7)', border: '1px solid rgba(15,21,35,0.22)', borderRadius: '12px', padding: '2px 10px' }}>
                Closed
              </span>
            )}
          </div>
          <h1 style={{ ...serif, fontSize: 'clamp(2.1rem,5.5vw,3.6rem)', fontWeight: 300, color: tokens.dark, lineHeight: 1.06, margin: '0 0 12px' }}>
            {call.title}
          </h1>
          {call.tagline && (
            <p style={{ ...body, fontSize: '1.125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>
              {call.tagline}
            </p>
          )}
        </div>

        {/* Author / founder controls */}
        {isAuthor && (
          <AuthorControls
            call={call}
            userId={user.id}
            onUpdated={(c) => setCall(prev => ({ ...prev, ...c }))}
            onDeleted={() => { window.location.href = '/atlas' }}
          />
        )}

        {/* Participation count */}
        {(call.taken_on_count > 0 || call.active_count > 0) && (
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: tokens.gold, marginBottom: '8px' }}>
            {isAsk
              ? `${(call.active_count || 0) + (call.completed_count || 0)} ${((call.active_count || 0) + (call.completed_count || 0)) === 1 ? 'person has' : 'people have'} offered to help${(call.completed_count || 0) > 0 ? ` · ${call.completed_count} built` : ''}`
              : `${call.taken_on_count.toLocaleString()} ${call.taken_on_count === 1 ? 'person has' : 'people have'} taken this on${call.active_count > 0 ? ` · ${call.active_count} active` : ''}`
            }
          </div>
        )}

        {/* Cosigner count */}
        {cosignerCount > 0 && (
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.ghost, marginBottom: '20px' }}>
            Co-signed by {cosignerCount} constellation {cosignerCount === 1 ? 'member' : 'members'}
          </div>
        )}
        {cosignerCount === 0 && (call.taken_on_count > 0 || call.active_count > 0) && (
          <div style={{ marginBottom: '20px' }} />
        )}

        {/* CTA */}
        {call.lifecycle_state === 'closed' && !alreadyJoined && (
          <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.6, marginBottom: '8px' }}>
            This {isAsk ? 'ask' : 'challenge'} is closed to new {isAsk ? 'offers' : 'participants'}.
          </div>
        )}
        {call.lifecycle_state !== 'closed' && !alreadyJoined && (
          user ? (
            isAsk ? (
              <Btn onClick={() => setShowFulfill(true)} style={{ marginBottom: '8px' }}>
                Offer to help →
              </Btn>
            ) : (
              <Btn variant="primary" onClick={() => isFoundingRoot ? setShowDoors(true) : setShowTakeItOn(true)} style={{ marginBottom: '8px' }}>
                Accept challenge →
              </Btn>
            )
          ) : (
            <AuthPrompt callSlug={slug} isAsk={isAsk} />
          )
        )}
        {alreadyJoined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {isAsk ? (
              myStatus === 'complete' ? (
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#2A8C4F' }}>
                  ✓ You built it. Thank you.
                </span>
              ) : (
                <>
                  <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#2A8C4F' }}>
                    ✓ Accepted
                  </span>
                  <Btn onClick={completeAsk} disabled={busyComplete} style={{ marginBottom: 0 }}>
                    {busyComplete ? 'Marking…' : 'Mark it built →'}
                  </Btn>
                </>
              )
            ) : (
              <>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#2A8C4F' }}>
                  ✓ You're in
                </span>
                <a href="/challenges" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textDecoration: 'none', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '30px', padding: '8px 20px', display: 'inline-block' }}>
                  Track it →
                </a>
              </>
            )}
          </div>
        )}

        {isAsk && call.ask_details && (myStatus === 'active' || myStatus === 'complete' || isAuthor) && (
          <div style={{ padding: '16px 18px', background: 'rgba(200,146,42,0.05)', border: `1px solid ${GOLD_C}`, borderRadius: '12px', marginBottom: '12px' }}>
            <Eyebrow>How to complete this</Eyebrow>
            <div style={{ ...body, fontSize: '1.0625rem', color: tokens.dark, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
              {call.ask_details}
            </div>
            {isAuthor && myStatus === 'none' && (
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: tokens.ghost, marginTop: '8px' }}>
                Only shown to people who have accepted.
              </div>
            )}
          </div>
        )}
        {isAsk && call.ask_details && myStatus === 'none' && !isAuthor && (
          <div style={{ ...body, fontSize: '14px', color: tokens.ghost, marginBottom: '12px' }}>
            Accept to see how to complete this.
          </div>
        )}

        <ShareRail url={pageUrl} title={call.title} tagline={call.tagline}
          shareText={isAsk ? undefined : `Take it on with me: ${call.title}${call.tagline ? ' · ' + call.tagline : ''}`} />

        <Rule style={{ margin: '24px 0' }} />

        {/* Body — branches on type */}
        {isAsk ? (
          <AskBody call={call} />
        ) : (
          <div>
            {/* The package */}
            {strands.length > 1 ? (
              <div style={{ padding: '20px 22px', background: 'rgba(200,146,42,0.04)', border: `1.5px solid ${GOLD_C}`, borderRadius: '12px', marginBottom: '20px' }}>
                <Eyebrow style={{ marginBottom: '12px' }}>What you'll do</Eyebrow>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {strands.map((s, i) => {
                    const cad = CADENCE_SHORT[s.cadence] || ''
                    return (
                      <div key={s.id || i} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                        <span style={{ ...sc, fontSize: '15px', color: tokens.gold, flexShrink: 0, minWidth: '18px' }}>{i + 1}</span>
                        <span style={{ flex: 1 }}>
                          <span style={{ ...body, fontSize: '1.0625rem', color: tokens.dark, lineHeight: 1.6 }}>{s.text}</span>
                          {cad && <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: tokens.ghost, marginLeft: '10px', whiteSpace: 'nowrap' }}>{cad}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ padding: '26px 28px', background: 'rgba(200,146,42,0.05)', border: `1.5px solid ${GOLD_C}`, borderRadius: '16px', marginBottom: '20px', boxShadow: '0 10px 40px -28px rgba(168,114,26,0.40)' }}>
                <Eyebrow>The move</Eyebrow>
                <p style={{ ...body, fontSize: '1.1875rem', color: tokens.dark, lineHeight: 1.6, margin: 0 }}>
                  {call.the_move}
                </p>
              </div>
            )}
            {/* Cadence + duration */}
            {INTENSITY_BY_LEVEL[call.intensity_level] && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <ChiliRung level={call.intensity_level} size={18} />
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.6)', textTransform: 'uppercase' }}>
                  {INTENSITY_BY_LEVEL[call.intensity_level].label}
                </span>
                <IntensityInfo />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: strands.length > 1 ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {strands.length <= 1 && (
                <div style={{ padding: '16px 18px', background: tokens.bgCard, border: hair, borderRadius: '10px' }}>
                  <Eyebrow style={{ marginBottom: '4px' }}>Cadence</Eyebrow>
                  <div style={{ ...body, fontSize: '1.0625rem', color: tokens.dark, lineHeight: 1.55 }}>
                    {cadenceLabel}
                    {call.cadence === 'daily-absolute' && (
                      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#D63838', marginTop: '4px' }}>No missed days. This is the commitment.</div>
                    )}
                    {call.cadence_note && <div style={{ ...body, fontSize: '14px', color: tokens.ghost, marginTop: '4px' }}>{call.cadence_note}</div>}
                  </div>
                </div>
              )}
              <div style={{ padding: '16px 18px', background: tokens.bgCard, border: hair, borderRadius: '10px' }}>
                <Eyebrow style={{ marginBottom: '4px' }}>{call.in_founding_constellation ? 'Runs to' : 'Duration'}</Eyebrow>
                <div style={{ ...body, fontSize: '1.0625rem', color: tokens.dark, lineHeight: 1.55 }}>
                  {call.in_founding_constellation && fmtCloseDate(call.founding_closes_on)
                    ? `${fmtCloseDate(call.founding_closes_on)} · the shared close`
                    : `${call.duration_days} days`}
                </div>
              </div>
            </div>
            {call.body_long && (
              <div style={{ marginBottom: '20px' }}>
                {String(call.body_long).split(/\n{2,}/).map((para, i) => (
                  <p key={i} className={i === 0 ? 'np-lede' : undefined} style={{ ...body, fontSize: '1.0625rem', color: tokens.dark, lineHeight: 1.75, margin: '0 0 14px' }}>
                    {para.split('\n').map((line, j) => <span key={j}>{j > 0 && <br />}{line}</span>)}
                  </p>
                ))}
              </div>
            )}
            {videoEmbedSrc(call.video_url) && (
              <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden', border: hair, marginBottom: '20px' }}>
                <iframe
                  src={videoEmbedSrc(call.video_url)}
                  title="Challenge video"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            )}
            {(call.horizon_goal_text || call.mechanism || call.measure) && (
              <div style={{ marginBottom: '20px' }}>
                {call.horizon_goal_text && <div style={{ marginBottom: '14px' }}><Eyebrow>Horizon goal</Eyebrow><p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: 0 }}>{call.horizon_goal_text}</p></div>}
                {call.mechanism && <div style={{ marginBottom: '14px' }}><Eyebrow>Why this works</Eyebrow><p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: 0 }}>{call.mechanism}</p></div>}
                {call.measure && <div><Eyebrow>How you'll know</Eyebrow><p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: 0 }}>{call.measure}</p></div>}
              </div>
            )}
          </div>
        )}

        {/* Author — shown for both types */}
          <div style={{ padding: '16px 20px', background: tokens.bgCard, border: hair, borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            {call.nextus_actors?.image_url && (
              <img src={call.nextus_actors.image_url} alt={authorName} style={{ width: '44px', height: '44px', borderRadius: call.nextus_actors.type === 'practitioner' ? '50%' : '6px', objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost, marginBottom: '2px' }}>OFFERED BY</div>
              {call.nextus_actors?.slug ? (
                <a href={`/org/${call.nextus_actors.slug}`} style={{ ...body, fontSize: '1.0625rem', color: tokens.dark, textDecoration: 'none', lineHeight: 1.5 }}>
                  {authorName}
                </a>
              ) : (
                <div style={{ ...body, fontSize: '1.0625rem', color: tokens.dark, lineHeight: 1.5 }}>{authorName || 'Community member'}</div>
              )}
              {call.nextus_actors?.description && (
                <div style={{ ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.5, marginTop: '2px' }}>{call.nextus_actors.description.slice(0, 120)}</div>
              )}
              {partners.length > 0 && (
                <div style={{ ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.5, marginTop: '6px' }}>
                  in partnership with{' '}
                  {partners.map((p, i) => (
                    <span key={p.id || i}>
                      {p.slug
                        ? <a href={`/org/${p.slug}`} style={{ color: tokens.gold, textDecoration: 'none' }}>{p.name}</a>
                        : <span style={{ color: tokens.dark }}>{p.name}</span>}
                      {i < partners.length - 1 ? (i === partners.length - 2 ? ' and ' : ', ') : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

        {/* ── Constellation surfaces (June 2026) ── */}
        <ChallengeIdentityVoice call={call} colour={colour} />
        <ChallengeLineage callId={call.id} colour={colour} />
        {user && isAuthor
          ? <BroadcastComposer call={call} userId={user.id} colour={colour} />
          : (alreadyJoined && <BroadcastFeed callId={call.id} userId={user?.id} authorName={authorName} colour={colour} />)}
        {!isAsk && (call.in_founding_constellation
          ? <PublicBeacon />
          : <ConstellationMeter domain={call.domain} colour={colour} />)}

        {/* Author feedback — only the author sees this */}
        {isAuthor && (
          <AuthorFeedbackSection callId={call.id} userId={user.id} />
        )}

        {/* Ask to partner — for actor owners who aren't the author */}
        {!isAsk && user && !isAuthor && ownedActors.length > 0 && (
          <div style={{ marginTop: '20px', padding: '16px 20px', background: tokens.bgCard, border: hair, borderRadius: '10px' }}>
            {askSent ? (
              <div style={{ ...body, fontSize: '15px', color: tokens.gold, lineHeight: 1.5 }}>
                Partner request sent. It shows here once the author accepts.
              </div>
            ) : (
              <div>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost, textTransform: 'uppercase', marginBottom: '10px' }}>
                  Want to partner on this?
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {ownedActors.length > 1 && (
                    <select value={askSel} onChange={e => setAskSel(e.target.value)}
                      style={{ ...body, fontSize: '15px', color: tokens.dark, background: tokens.bg, border: hair, borderRadius: '8px', padding: '8px 12px' }}>
                      {ownedActors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  )}
                  <button type="button" onClick={askToPartner} disabled={askBusy}
                    style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', color: tokens.gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '30px', padding: '8px 20px', cursor: 'pointer', opacity: askBusy ? 0.5 : 1 }}>
                    {askBusy ? 'Sending…' : 'Ask to partner →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Horizon Goals link */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: hair }}>
          <a href={`/atlas/goals${call.domain ? '/' + call.domain : ''}`}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.ghost, textDecoration: 'none' }}>
            See all challenges building toward {call.domain ? call.domain.replace('-', ' ') : 'this goal'} →
          </a>
        </div>

        {/* Flag */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button type="button" onClick={() => setShowFlag(true)}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', textDecoration: 'underline', textDecorationColor: 'rgba(15,21,35,0.15)', textUnderlineOffset: '3px' }}>
            {isAsk ? 'Flag this ask' : 'Flag this challenge'}
          </button>
        </div>

      </div>
    </div>
  )
}
