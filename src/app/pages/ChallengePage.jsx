import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { tokens, serif, body, sc } from '../../lib/designTokens'
import { DOMAIN_COLORS } from '../../constants/domainColors'

// ─── Design shortcuts ─────────────────────────────────────────────────────────

const gold   = { color: tokens.gold }
const muted  = { color: 'rgba(15,21,35,0.78)' }
const hair   = '1px solid rgba(200,146,42,0.18)'
const GOLD_C = tokens.goldChrome

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
  const styles = variant === 'ghost'
    ? { ...base, background: 'transparent', color: tokens.gold }
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

// ─── Cadence label ────────────────────────────────────────────────────────────

const CADENCE_LABELS = {
  'daily-absolute': 'Every single day — no exceptions',
  '5-of-7':         '5 of 7 days per week',
  'weekly':         'Once per week',
  'custom':         'Custom cadence',
}

// ─── Share rail ───────────────────────────────────────────────────────────────
// Web Share API for native share sheet on mobile;
// fallbacks to WhatsApp, email, copy-link on desktop.

function ShareRail({ url, title, tagline }) {
  const [copied, setCopied] = useState(false)
  const text = tagline || title

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
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', ...gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.4)', borderRadius: '20px', padding: '7px 16px', cursor: 'pointer' }}>
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
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.gold, background: 'rgba(200,146,42,0.07)', border: '1px solid rgba(200,146,42,0.35)', borderRadius: '20px', padding: '7px 16px', textDecoration: 'none' }}>
            Email
          </a>
        </>
      )}
      <button type="button" onClick={copyLink}
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: copied ? '#2A8C4F' : tokens.ghost, background: 'none', border: '1px solid rgba(15,21,35,0.18)', borderRadius: '20px', padding: '7px 16px', cursor: 'pointer', transition: 'color 0.2s' }}>
        {copied ? '✓ Copied' : 'Copy link'}
      </button>
    </div>
  )
}

// ─── Flag modal ───────────────────────────────────────────────────────────────

function FlagModal({ callId, userId, onClose }) {
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
          <Eyebrow style={{ marginBottom: 0 }}>Flag this {/* type from parent */}</Eyebrow>
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

function TakeItOnModal({ call, userId, onClose, onJoined }) {
  const [clock,   setClock]   = useState('rolling')
  const [loading, setLoading] = useState(false)
  const [joined,  setJoined]  = useState(false)

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
              You're in. This challenge is now in your Target Stretch as a Planet Sprint — it runs on its own clock alongside your personal stretch.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a href="/tools/target-sprint"
                style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: tokens.gold, background: 'rgba(200,146,42,0.08)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }}>
                Open my stretch →
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
                  <span style={{ color: '#D63838', marginLeft: '8px' }}>· Absolute — no missed days</span>
                )}
                {' — '}{call.duration_days} days
              </div>
            </div>
            <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '14px' }}>
              This becomes your Planet Sprint — the outer arc of your Target Stretch. Choose your clock.
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
            <Btn onClick={join} disabled={loading}>{loading ? 'Joining…' : 'Take it on →'}</Btn>
          </div>
        )}
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
    ? call.ask_quantity - (call.active_count || 0)
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
              Your offer has been received. The author will be in touch.
            </p>
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
              placeholder="Any context you'd like to share — optional"
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
  const spotsLeft  = spotsTotal ? Math.max(0, spotsTotal - (call.active_count || 0)) : null
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

function AuthPrompt({ callSlug }) {
  const redirect = encodeURIComponent(`/stretch/c/${callSlug}`)
  return (
    <div style={{ padding: '24px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '12px', textAlign: 'center', marginTop: '20px' }}>
      <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '14px' }}>
        Sign in to take on this challenge. Your progress stays with you.
      </p>
      <a href={`/login?redirect=${redirect}`}
        style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: tokens.gold, background: 'rgba(200,146,42,0.08)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }}>
        Sign in →
      </a>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ChallengePage() {
  const { slug }                    = useParams()
  const { user }                    = useAuth()
  const [call,          setCall]    = useState(null)
  const [loading,       setLoading] = useState(true)
  const [notFound,      setNotFound] = useState(false)
  const [showTakeItOn,  setShowTakeItOn]  = useState(false)
  const [showFulfill,   setShowFulfill]   = useState(false)
  const [showFlag,      setShowFlag]      = useState(false)
  const [alreadyJoined, setAlreadyJoined] = useState(false)

  const isAsk    = call?.type === 'ask'
  const isAuthor = user && call && (
    call.user_id === user.id ||
    (call.nextus_actors && call.nextus_actors.profile_owner === user.id)
  )

  // Co-sign state — constellation members can co-sign a call
  const [cosignerCount, setCosignerCount] = useState(call?.cosigner_count || 0)
  const [hasCosigned,   setHasCosigned]   = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch('/api/actor-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_by_slug', slug }) })
      .then(r => r.json())
      .then(data => {
        if (data.call) setCall(data.call)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

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

  const colour  = DOMAIN_COLORS[call.domain] ? Object.values(DOMAIN_COLORS).find((_, i) => Object.keys(DOMAIN_COLORS)[i] === call.domain)?.base : GOLD_C
  const pageUrl = typeof window !== 'undefined' ? window.location.href : `https://nextus.world/stretch/c/${slug}`
  const cadenceLabel = CADENCE_LABELS[call.cadence] || call.cadence
  const authorName   = call.nextus_actors?.name || null

  return (
    <div style={{ background: tokens.bg, minHeight: '100dvh' }}>
      <Nav />

      {showTakeItOn && user && (
        <TakeItOnModal call={call} userId={user.id} onClose={() => setShowTakeItOn(false)}
          onJoined={() => { setAlreadyJoined(true); setShowTakeItOn(false); setCall(c => c ? { ...c, taken_on_count: (c.taken_on_count || 0) + 1 } : c) }} />
      )}
      {showFulfill && user && (
        <FulfillModal call={call} userId={user.id} onClose={() => setShowFulfill(false)}
          onFulfilled={() => { setAlreadyJoined(true); setShowFulfill(false); setCall(c => c ? { ...c, active_count: (c.active_count || 0) + 1 } : c) }} />
      )}
      {showFlag && (
        <FlagModal callId={call.id} userId={user?.id} onClose={() => setShowFlag(false)} />
      )}

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(64px,8vw,96px) clamp(20px,5vw,40px) 100px' }}>

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
          </div>
          <h1 style={{ ...serif, fontSize: 'clamp(1.75rem,5vw,3rem)', fontWeight: 300, color: tokens.dark, lineHeight: 1.1, margin: '0 0 10px' }}>
            {call.title}
          </h1>
          {call.tagline && (
            <p style={{ ...body, fontSize: '1.125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>
              {call.tagline}
            </p>
          )}
        </div>

        {/* Participation count */}
        {(call.taken_on_count > 0 || call.active_count > 0) && (
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: tokens.gold, marginBottom: '8px' }}>
            {isAsk
              ? `${call.active_count || 0} ${(call.active_count || 0) === 1 ? 'person has' : 'people have'} offered to help`
              : `${call.taken_on_count.toLocaleString()} ${call.taken_on_count === 1 ? 'person has' : 'people have'} taken this on${call.active_count > 0 ? ` — ${call.active_count} active` : ''}`
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
        {!alreadyJoined && (
          user ? (
            isAsk ? (
              <Btn onClick={() => setShowFulfill(true)} style={{ marginBottom: '8px' }}>
                Offer to help →
              </Btn>
            ) : (
              <Btn onClick={() => setShowTakeItOn(true)} style={{ marginBottom: '8px' }}>
                Take it on →
              </Btn>
            )
          ) : (
            <AuthPrompt callSlug={slug} />
          )
        )}
        {alreadyJoined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#2A8C4F' }}>
              {isAsk ? '✓ Offer sent' : '✓ You\'re in'}
            </span>
            {!isAsk && (
              <a href="/tools/target-sprint" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textDecoration: 'none', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '30px', padding: '8px 20px', display: 'inline-block' }}>
                Open my stretch →
              </a>
            )}
          </div>
        )}

        <ShareRail url={pageUrl} title={call.title} tagline={call.tagline} />

        <Rule style={{ margin: '24px 0' }} />

        {/* Body — branches on type */}
        {isAsk ? (
          <AskBody call={call} />
        ) : (
          <div>
            {/* The move */}
            <div style={{ padding: '20px 22px', background: 'rgba(200,146,42,0.04)', border: `1.5px solid ${GOLD_C}`, borderRadius: '12px', marginBottom: '20px' }}>
              <Eyebrow>The move</Eyebrow>
              <p style={{ ...body, fontSize: '1.125rem', color: tokens.dark, lineHeight: 1.7, margin: 0 }}>
                {call.the_move}
              </p>
            </div>
            {/* Cadence + duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '16px 18px', background: tokens.bgCard, border: hair, borderRadius: '10px' }}>
                <Eyebrow style={{ marginBottom: '4px' }}>Cadence</Eyebrow>
                <div style={{ ...body, fontSize: '1.0625rem', color: tokens.dark, lineHeight: 1.55 }}>
                  {cadenceLabel}
                  {call.cadence === 'daily-absolute' && (
                    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#D63838', marginTop: '4px' }}>No missed days — this is the commitment.</div>
                  )}
                  {call.cadence_note && <div style={{ ...body, fontSize: '14px', color: tokens.ghost, marginTop: '4px' }}>{call.cadence_note}</div>}
                </div>
              </div>
              <div style={{ padding: '16px 18px', background: tokens.bgCard, border: hair, borderRadius: '10px' }}>
                <Eyebrow style={{ marginBottom: '4px' }}>Duration</Eyebrow>
                <div style={{ ...body, fontSize: '1.0625rem', color: tokens.dark, lineHeight: 1.55 }}>{call.duration_days} days</div>
              </div>
            </div>
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
            </div>
          </div>
        )}

        {/* Author feedback — only the author sees this */}
        {isAuthor && (
          <AuthorFeedbackSection callId={call.id} userId={user.id} />
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
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', textDecoration: 'underline', textDecorationColor: 'rgba(15,21,35,0.15)', textUnderlineOffset: '3px' }}>
            {isAsk ? 'Flag this ask' : 'Flag this challenge'}
          </button>
        </div>

      </div>
    </div>
  )
}
