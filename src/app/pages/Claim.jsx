// src/app/pages/Claim.jsx — C1 June 2026
//
// Claim a ward actor profile. Three verification paths:
//
//   AUTO     — signed-in email domain matches actor's website domain.
//              Claim approved immediately, no extra step.
//
//   CODE     — email doesn't match. Claimant enters an address at the
//              actor's domain → 6-digit code via Resend → verify → claim.
//
//   REQUEST  — no website, or claimant can't access an org email.
//              Free-text + optional evidence URL → pending admin review.
//
// The attestation checkbox is present on all paths.
// Trust model: domain match is the primary gate. Admin review is the
// fallback, not the default. False claims can still be flagged.

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Nav }         from '../../components/Nav'
import { SiteFooter }  from '../../components/SiteFooter'
import { supabase }    from '../../hooks/useSupabase'
import { useAuth }     from '../../hooks/useAuth'
import { serif, body, sc } from '../../lib/designTokens'

const gold  = '#A8721A'
const GOLD_C = '#C8922A'
const dark  = '#0F1523'
const parch = '#FAFAF7'
const hair  = '1px solid rgba(200,146,42,0.22)'

function Eyebrow({ children, style = {} }) {
  return <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold, textTransform: 'uppercase', marginBottom: '10px', ...style }}>{children}</div>
}

function Err({ msg }) {
  if (!msg) return null
  return (
    <div style={{ background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.25)', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px' }}>
      <p style={{ ...body, fontSize: '14px', color: '#8A3030', margin: 0 }}>{msg}</p>
    </div>
  )
}

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em', padding: '13px 32px', borderRadius: '40px', border: 'none',
        background: disabled ? 'rgba(200,146,42,0.30)' : GOLD_C, color: '#FFFFFF',
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
      {children}
    </button>
  )
}

function GhostBtn({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
      {children}
    </button>
  )
}

// ─── Profile summary card ─────────────────────────────────────────────────────

function ActorCard({ actor }) {
  return (
    <div style={{ background: '#FFF', border: hair, borderRadius: '12px', padding: '20px 22px', marginBottom: '28px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      {actor.image_url && (
        <img src={actor.image_url} alt={actor.name}
          style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...body, fontSize: '17px', color: dark, marginBottom: '4px' }}>{actor.name}</div>
        {actor.tagline && <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.60)', fontStyle: 'italic', marginBottom: '6px' }}>{actor.tagline}</div>}
        {actor.website && (
          <a href={actor.website} target="_blank" rel="noopener noreferrer"
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold, textDecoration: 'none' }}>
            {actor.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Path: CODE — org-domain email verification ───────────────────────────────

function CodePath({ actor, userId, actorDomain, onApproved }) {
  const [orgEmail,  setOrgEmail]  = useState('')
  const [codeSent,  setCodeSent]  = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [err,       setErr]       = useState(null)
  const [resendCd,  setResendCd]  = useState(0)

  useEffect(() => {
    if (resendCd <= 0) return
    const t = setTimeout(() => setResendCd(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCd])

  async function sendCode() {
    if (!orgEmail.trim()) return
    setLoading(true); setErr(null)
    const res  = await fetch('/api/claim-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send_code', actorId: actor.id, userId, email: orgEmail.trim() }) })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setErr(data.error); return }
    setCodeSent(true); setResendCd(60)
  }

  async function verifyCode() {
    if (!codeInput.trim()) return
    setLoading(true); setErr(null)
    const res  = await fetch('/api/claim-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify_code', actorId: actor.id, userId, code: codeInput.trim() }) })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setErr(data.error); return }
    if (data.approved) onApproved()
  }

  return (
    <div>
      <Eyebrow>Verify your connection</Eyebrow>
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, marginBottom: '20px' }}>
        Your email doesn't match <strong>{actorDomain}</strong>. Enter an address at that domain — we'll send a verification code.
      </p>

      {!codeSent ? (
        <div>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: gold, marginBottom: '6px' }}>ORG EMAIL ADDRESS</div>
            <input type="email" value={orgEmail} onChange={e => setOrgEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendCode()}
              placeholder={`you@${actorDomain}`}
              style={{ width: '100%', ...body, fontSize: '15px', color: dark, border: hair, borderRadius: '8px', padding: '11px 14px', outline: 'none', background: parch, boxSizing: 'border-box' }} />
          </div>
          <Err msg={err} />
          <PrimaryBtn onClick={sendCode} disabled={!orgEmail.trim() || loading}>
            {loading ? 'Sending…' : 'Send code →'}
          </PrimaryBtn>
        </div>
      ) : (
        <div>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginBottom: '18px' }}>
            Code sent to <strong>{orgEmail}</strong>. Check your inbox — it expires in 30 minutes.
          </p>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: gold, marginBottom: '6px' }}>VERIFICATION CODE</div>
            <input type="text" inputMode="numeric" maxLength={6} value={codeInput} onChange={e => setCodeInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && verifyCode()}
              placeholder="6-digit code"
              style={{ width: '160px', ...body, fontSize: '22px', letterSpacing: '0.2em', color: dark, border: hair, borderRadius: '8px', padding: '12px 14px', outline: 'none', background: parch, textAlign: 'center' }} />
          </div>
          <Err msg={err} />
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PrimaryBtn onClick={verifyCode} disabled={codeInput.length !== 6 || loading}>
              {loading ? 'Verifying…' : 'Verify →'}
            </PrimaryBtn>
            <button type="button" onClick={() => { setCodeSent(false); setCodeInput(''); setErr(null) }}
              style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Use a different address
            </button>
            {resendCd > 0 ? (
              <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.38)' }}>Resend in {resendCd}s</span>
            ) : (
              <button type="button" onClick={sendCode}
                style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold, background: 'none', border: 'none', cursor: 'pointer' }}>
                Resend code
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Path: REQUEST — admin review ─────────────────────────────────────────────

function RequestPath({ actor, userId, userEmail, onSubmitted }) {
  const [note,        setNote]        = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [err,         setErr]         = useState(null)

  async function submit() {
    setLoading(true); setErr(null)
    const res  = await fetch('/api/claim-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit_request', actorId: actor.id, userId, note, evidenceUrl, userEmail }) })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setErr(data.error); return }
    onSubmitted()
  }

  return (
    <div>
      <Eyebrow>Request admin review</Eyebrow>
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, marginBottom: '20px' }}>
        Can't access an org-domain email? Tell us how you're connected to {actor.name}. The NextUs team reviews these manually — usually within a few days.
      </p>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: gold, marginBottom: '6px' }}>
          HOW ARE YOU CONNECTED?
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
          placeholder="Describe your relationship to this actor — founder, staff, contracted representative…"
          style={{ width: '100%', ...body, fontSize: '15px', color: dark, border: hair, borderRadius: '8px', padding: '11px 14px', resize: 'vertical', outline: 'none', background: parch, boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: gold, marginBottom: '6px' }}>
          EVIDENCE URL <span style={{ color: 'rgba(15,21,35,0.35)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
        </div>
        <input type="url" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)}
          placeholder="LinkedIn, personal site, staff directory — anything that helps"
          style={{ width: '100%', ...body, fontSize: '15px', color: dark, border: hair, borderRadius: '8px', padding: '11px 14px', outline: 'none', background: parch, boxSizing: 'border-box' }} />
      </div>
      <Err msg={err} />
      <PrimaryBtn onClick={submit} disabled={!note.trim() || loading}>
        {loading ? 'Submitting…' : 'Submit for review →'}
      </PrimaryBtn>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ClaimPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [actor,      setActor]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [pageErr,    setPageErr]    = useState(null)
  const [confirmed,  setConfirmed]  = useState(false)
  const [checking,   setChecking]   = useState(false)

  // stage: attest | checking | auto | code | request | submitted | done
  const [stage, setStage] = useState('attest')
  const [actorDomain, setActorDomain] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: `/org/${id}/claim` } })
  }, [user, authLoading, id, navigate])

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      const q = supabase.from('nextus_actors').select('*')
      const { data, error } = isUuid ? await q.eq('id', id).single() : await q.eq('slug', id).single()
      if (error || !data) { setPageErr('Profile not found.'); setLoading(false); return }
      if (data.profile_owner) {
        setPageErr(data.profile_owner === user?.id ? 'You already own this profile.' : 'This profile is already claimed.')
        setActor(data); setLoading(false); return
      }
      setActor(data); setLoading(false)
    }
    load()
  }, [id, user?.id])

  async function proceed() {
    if (!confirmed || !actor || !user) return
    setChecking(true)
    const res  = await fetch('/api/claim-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_domain', actorId: actor.id, userId: user.id, userEmail: user.email }) })
    const data = await res.json()
    setChecking(false)
    if (data.alreadyClaimed) { setPageErr('This profile was just claimed.'); return }
    if (data.approved) { setStage('done'); return }
    setActorDomain(data.actorDomain)
    setStage(data.path === 'auto' ? 'done' : data.path)  // 'code' | 'request'
  }

  if (authLoading || loading) return (
    <div style={{ background: parch, minHeight: '100dvh' }}><Nav />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '160px 24px', textAlign: 'center' }}>
        <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>Loading…</span>
      </div>
    </div>
  )

  if (pageErr && !actor) return (
    <div style={{ background: parch, minHeight: '100dvh' }}><Nav />
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '120px 24px', textAlign: 'center' }}>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7 }}>{pageErr}</p>
      </div><SiteFooter />
    </div>
  )

  if (!actor) return null

  return (
    <div style={{ background: parch, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '96px 24px 120px' }}>

        <Eyebrow>Claim profile</Eyebrow>
        <h1 style={{ ...serif, fontSize: 'clamp(30px,5vw,46px)', fontWeight: 400, color: dark, lineHeight: 1.08, marginBottom: '12px' }}>
          {stage === 'done' ? `${actor.name} is yours.` : `Claim ${actor.name}`}
        </h1>
        {stage !== 'done' && stage !== 'submitted' && (
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, marginBottom: '32px' }}>
            This profile was added by the community and is held in trust by NextUs.
            Claiming it makes you the owner — you can edit the voice layer and manage how this profile represents you or your organisation.
          </p>
        )}

        <ActorCard actor={actor} />

        {/* ── Done ─────────────────────────────────────────────── */}
        {stage === 'done' && (
          <div>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, marginBottom: '28px' }}>
              Verified and claimed. Head to the Voice tab to add your mission, offers, and what you're working on now.
            </p>
            <PrimaryBtn onClick={() => navigate(`/org/${actor.slug || actor.id}/manage?tab=voice`)}>
              Go to my profile →
            </PrimaryBtn>
          </div>
        )}

        {/* ── Submitted (admin review) ──────────────────────────── */}
        {stage === 'submitted' && (
          <div>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, marginBottom: '12px' }}>
              Your claim request has been submitted. The NextUs team will review it and reach out to <strong>{user?.email}</strong> when a decision is made.
            </p>
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.50)', lineHeight: 1.65, marginBottom: '24px' }}>
              Most requests are reviewed within a few days.
            </p>
            <GhostBtn onClick={() => navigate(`/org/${actor.slug || actor.id}`)}>Back to profile</GhostBtn>
          </div>
        )}

        {/* ── Attest ───────────────────────────────────────────── */}
        {stage === 'attest' && (
          <div>
            <div style={{ background: 'rgba(200,146,42,0.04)', border: '1.5px solid rgba(200,146,42,0.30)', borderRadius: '12px', padding: '20px 22px', marginBottom: '28px' }}>
              <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: '4px', flexShrink: 0, cursor: 'pointer', accentColor: GOLD_C }} />
                <span style={{ ...body, fontSize: '14px', color: dark, lineHeight: 1.65 }}>
                  I attest that I am {actor.name} or have the authority to claim this profile on their behalf. I understand that false claims may be flagged by the community and reversed by NextUs.
                </span>
              </label>
            </div>
            <Err msg={pageErr} />
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <PrimaryBtn onClick={proceed} disabled={!confirmed || checking}>
                {checking ? 'Checking…' : 'Continue →'}
              </PrimaryBtn>
              <Link to={`/org/${actor.slug || actor.id}`}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none' }}>
                Cancel
              </Link>
            </div>
          </div>
        )}

        {/* ── Code path ────────────────────────────────────────── */}
        {stage === 'code' && (
          <div>
            <CodePath actor={actor} userId={user.id} actorDomain={actorDomain}
              onApproved={() => setStage('done')} />
            <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(200,146,42,0.15)' }}>
              <GhostBtn onClick={() => setStage('request')}>
                Can't access an org email? Request admin review →
              </GhostBtn>
            </div>
          </div>
        )}

        {/* ── Request path ─────────────────────────────────────── */}
        {stage === 'request' && (
          <div>
            <RequestPath actor={actor} userId={user.id} userEmail={user.email}
              onSubmitted={() => setStage('submitted')} />
            {actorDomain && (
              <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(200,146,42,0.15)' }}>
                <GhostBtn onClick={() => setStage('code')}>
                  ← I can verify with an org email instead
                </GhostBtn>
              </div>
            )}
          </div>
        )}

      </div>
      <SiteFooter />
    </div>
  )
}
