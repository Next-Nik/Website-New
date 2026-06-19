// /challenges/new — standalone challenge authoring (Phase 4, June 2026).
//
// An actor or individual builds a packaged challenge from scratch, without
// first running their own stretch. Scale is never asked: the author picks one
// thing the challenge is about, and a personal domain means self, a world
// domain means civ. The Horizon Goal anchor prefills from that choice (the
// fractal: a personal Body challenge ladders to Nature's Horizon Goal).

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav }        from '../../components/Nav'
import { useAuth }    from '../../hooks/useAuth'
import { useActingAs } from '../context/ActingAsContext'
import { supabase }   from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'
import {
  SELF_DOMAINS, CIV_DOMAINS, SELF_TO_ATLAS_MAP, DOMAIN_HORIZON_GOALS,
} from '../constants/domains'

const GOLD_C = tokens.goldChrome
const hair   = '1px solid rgba(200,146,42,0.18)'
const muted  = { color: 'rgba(15,21,35,0.78)' }

const SELF_SLUGS = new Set(SELF_DOMAINS.map(d => d.slug))

const CADENCES = [
  { v: 'daily-absolute', l: 'Every day' },
  { v: '5-of-7',         l: '5 of 7 days' },
  { v: 'weekly',         l: 'Weekly' },
]

function Eyebrow({ children, style = {} }) {
  return (
    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: tokens.gold, textTransform: 'uppercase', marginBottom: '8px', ...style }}>
      {children}
    </div>
  )
}

function Label({ children }) {
  return <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost, textTransform: 'uppercase', marginBottom: '6px' }}>{children}</div>
}

const inputStyle = {
  ...body, fontSize: '1.0625rem', color: tokens.dark, width: '100%',
  background: tokens.bgCard, border: hair, borderRadius: '10px',
  padding: '11px 14px', boxSizing: 'border-box', lineHeight: 1.5,
}

function Btn({ children, onClick, disabled, variant = 'solid' }) {
  const solid = variant === 'solid'
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        ...sc, fontSize: '15px', letterSpacing: '0.14em', cursor: disabled ? 'default' : 'pointer',
        borderRadius: '40px', padding: '12px 28px', transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
        color: solid ? '#FFFFFF' : tokens.gold,
        background: solid ? tokens.gold : 'rgba(200,146,42,0.08)',
        border: `1.5px solid ${solid ? tokens.gold : 'rgba(200,146,42,0.78)'}`,
      }}>
      {children}
    </button>
  )
}

export default function ChallengeAuthor() {
  const { user } = useAuth()
  const { actingAsActorId } = useActingAs()
  const nav = useNavigate()

  const [ownedActors, setOwnedActors] = useState([])
  const [authorActor, setAuthorActor] = useState('')   // '' = as yourself
  const authorTouched = useRef(false)
  const [domain,      setDomain]      = useState('')
  const [lastPrefill, setLastPrefill] = useState('')
  const [title,       setTitle]       = useState('')
  const [tagline,     setTagline]     = useState('')
  const [horizonText, setHorizonText] = useState('')
  const [measure,     setMeasure]     = useState('')
  const [mechanism,   setMechanism]   = useState('')
  const [durPreset,   setDurPreset]   = useState('90')
  const [durCustom,   setDurCustom]   = useState(60)
  const [strands,     setStrands]     = useState([{ key: 1, text: '', cadence: '5-of-7' }])
  const [keySeq,      setKeySeq]      = useState(2)

  const [errors,    setErrors]    = useState([])
  const [saving,    setSaving]    = useState(false)
  const [published, setPublished] = useState(null)   // { url, visibility }

  // Creation helper
  const [chatMsgs,    setChatMsgs]    = useState([])
  const [chatInput,   setChatInput]   = useState('')
  const [chatBusy,    setChatBusy]    = useState(false)
  const [pendingDraft, setPendingDraft] = useState(null)

  // Partner invite (success screen)
  const [inviteQ,       setInviteQ]       = useState('')
  const [inviteResults, setInviteResults] = useState([])
  const [invited,       setInvited]       = useState([])
  const [inviteBusy,    setInviteBusy]    = useState(false)

  const scale = domain ? (SELF_SLUGS.has(domain) ? 'self' : 'civ') : 'civ'
  const isSelf = scale === 'self'

  useEffect(() => {
    if (!user) return
    supabase.from('nextus_actors').select('id, name, type').eq('profile_owner', user.id)
      .then(({ data }) => setOwnedActors(data || []))
  }, [user])

  // Default the author to whoever you're currently acting as. Seeded once,
  // after owned actors load; a manual pick from the dropdown wins from then on.
  useEffect(() => {
    if (authorTouched.current) return
    if (!ownedActors.length) return
    if (actingAsActorId && ownedActors.some(a => a.id === actingAsActorId)) {
      setAuthorActor(actingAsActorId)
    }
  }, [ownedActors, actingAsActorId])

  function pickDomain(slug) {
    setDomain(slug)
    // Prefill the anchor from the Horizon Goal this domain ladders to.
    const civSlug = SELF_SLUGS.has(slug) ? SELF_TO_ATLAS_MAP[slug] : slug
    const goal = DOMAIN_HORIZON_GOALS[civSlug] || ''
    if (!horizonText || horizonText === lastPrefill) {
      setHorizonText(goal)
      setLastPrefill(goal)
    }
  }

  function setStrand(key, patch) {
    setStrands(ss => ss.map(s => s.key === key ? { ...s, ...patch } : s))
  }
  function addStrand() {
    setStrands(ss => [...ss, { key: keySeq, text: '', cadence: '5-of-7' }])
    setKeySeq(k => k + 1)
  }
  function removeStrand(key) {
    setStrands(ss => ss.length > 1 ? ss.filter(s => s.key !== key) : ss)
  }

  async function sendChat() {
    const text = chatInput.trim()
    if (!text || chatBusy) return
    const next = [...chatMsgs, { role: 'user', content: text }]
    setChatMsgs(next); setChatInput(''); setChatBusy(true)
    try {
      const r = await fetch('/api/challenge-author-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, messages: next }),
      })
      const d = await r.json()
      setChatMsgs(m => [...m, { role: 'assistant', content: d.message || '…' }])
      if (d.draft) setPendingDraft(d.draft)
    } catch {
      setChatMsgs(m => [...m, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    }
    setChatBusy(false)
  }

  function applyDraft(d) {
    if (!d) return
    if (d.title)    setTitle(d.title)
    if (d.tagline)  setTagline(d.tagline)
    if (d.domain)   setDomain(d.domain)
    if (d.horizon_goal_text) { setHorizonText(d.horizon_goal_text); setLastPrefill('') }
    if (d.measure)   setMeasure(d.measure)
    if (d.mechanism) setMechanism(d.mechanism)
    if (d.duration_days) {
      const n = Number(d.duration_days)
      if (n === 21 || n === 90) setDurPreset(String(n))
      else { setDurPreset('custom'); setDurCustom(n) }
    }
    if (Array.isArray(d.strands) && d.strands.length) {
      let k = keySeq
      const valid = ['daily-absolute', '5-of-7', 'weekly']
      const mapped = d.strands.map(s => ({
        key: k++, text: s.text || '',
        cadence: valid.includes(s.cadence) ? s.cadence : '5-of-7',
      }))
      setStrands(mapped); setKeySeq(k)
    }
    setPendingDraft(null)
  }

  async function searchInvite(q) {
    setInviteQ(q)
    if (q.trim().length < 2) { setInviteResults([]); return }
    try {
      const r = await fetch('/api/actor-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_actors', q }),
      })
      const d = await r.json()
      setInviteResults(d.actors || [])
    } catch { setInviteResults([]) }
  }

  async function invitePartner(actor) {
    if (!published?.callId) return
    setInviteBusy(true)
    try {
      await fetch('/api/actor-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_partner', userId: user.id, call_id: published.callId, partner_actor_id: actor.id }),
      })
      setInvited(v => [...v, actor.name])
      setInviteQ(''); setInviteResults([])
    } catch {}
    setInviteBusy(false)
  }

  function buildPayload() {
    const cleanStrands = strands
      .filter(s => s.text.trim())
      .map((s, i) => ({ id: `s${i + 1}`, text: s.text.trim(), cadence: s.cadence }))
    const duration_days = durPreset === 'custom' ? Math.max(1, Number(durCustom) || 1) : Number(durPreset)
    const the_move = cleanStrands.length === 1 ? cleanStrands[0].text : (tagline.trim() || title.trim())
    const cadence  = cleanStrands[0]?.cadence || '5-of-7'
    return {
      type: 'challenge', scale, domain,
      title: title.trim(), tagline: tagline.trim() || null,
      horizon_goal_text: horizonText.trim(),
      the_move, cadence, duration_days,
      measure: measure.trim(), mechanism: mechanism.trim(),
      protocol: cleanStrands,
    }
  }

  async function createAndPublish(visibility) {
    setSaving(true); setErrors([])
    const payload = buildPayload()
    if (payload.protocol.length === 0) { setErrors(['Add at least one thing someone will do.']); setSaving(false); return }
    try {
      const vRes = await fetch('/api/actor-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'validate_floor', ...payload }) })
      const vData = await vRes.json()
      if (!vData.passes) { setErrors(vData.errors || ['Some details are still missing.']); setSaving(false); return }

      const cRes = await fetch('/api/actor-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', userId: user.id, actor_id: authorActor || null, ...payload }) })
      const cData = await cRes.json()
      if (!cData.call?.id) { setErrors([cData.error || 'Could not save.']); setSaving(false); return }

      const pRes = await fetch('/api/actor-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'publish', userId: user.id, call_id: cData.call.id, visibility }) })
      const pData = await pRes.json()
      if (pData.error) { setErrors([pData.error]); setSaving(false); return }
      setPublished({ url: pData.url, visibility, callId: cData.call.id })
    } catch {
      setErrors(['Something went wrong. Try again.'])
    }
    setSaving(false)
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (published) {
    const full = typeof window !== 'undefined' ? `${window.location.origin}${published.url}` : published.url
    return (
      <div style={{ minHeight: '100dvh', background: tokens.bg }}>
        <Nav />
        <div style={{ maxWidth: '620px', margin: '0 auto', padding: '56px 22px 80px' }}>
          <Eyebrow>Published</Eyebrow>
          <h1 style={{ ...serif, fontWeight: 300, fontSize: '34px', color: tokens.dark, lineHeight: 1.15, margin: '0 0 18px' }}>
            {published.visibility === 'community' ? 'It\u2019s live and listed.' : 'It\u2019s live. Share the link.'}
          </h1>
          <div style={{ background: tokens.bgCard, border: hair, borderRadius: '10px', padding: '14px 16px', marginBottom: '22px', ...body, fontSize: '15px', color: tokens.dark, wordBreak: 'break-all' }}>
            {full}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Btn onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(full) }}>Copy link</Btn>
            <Btn variant="ghost" onClick={() => nav(published.url)}>Open it →</Btn>
          </div>

          <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: hair }}>
            <Eyebrow style={{ marginBottom: '6px' }}>In partnership with</Eyebrow>
            <p style={{ ...body, fontSize: '15px', color: tokens.ghost, lineHeight: 1.6, margin: '0 0 12px' }}>
              Credit a partner. They get a request — nothing shows publicly until they accept.
            </p>
            {invited.length > 0 && (
              <div style={{ ...body, fontSize: '15px', color: tokens.dark, marginBottom: '12px' }}>
                Requested: {invited.join(', ')}
              </div>
            )}
            <input value={inviteQ} onChange={e => searchInvite(e.target.value)} placeholder="Search for an actor by name" style={inputStyle} />
            {inviteResults.length > 0 && (
              <div style={{ marginTop: '8px', border: hair, borderRadius: '10px', overflow: 'hidden' }}>
                {inviteResults.map(a => (
                  <button key={a.id} type="button" onClick={() => invitePartner(a)} disabled={inviteBusy}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', background: tokens.bgCard, border: 'none', borderBottom: hair, padding: '10px 14px', cursor: 'pointer' }}>
                    {a.image_url && <img src={a.image_url} alt="" style={{ width: '28px', height: '28px', borderRadius: a.type === 'practitioner' ? '50%' : '5px', objectFit: 'cover' }} />}
                    <span style={{ ...body, fontSize: '15px', color: tokens.dark }}>{a.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: tokens.bg }}>
      <Nav />
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 22px 96px' }}>
        <Eyebrow>Author a challenge</Eyebrow>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: '38px', color: tokens.dark, lineHeight: 1.1, margin: '0 0 10px' }}>
          Build something others can take on
        </h1>
        <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: '0 0 32px' }}>
          A challenge is a set of things someone does, on a clock that starts the day they join.
        </p>

        {!user ? (
          <p style={{ ...body, fontSize: '1.0625rem', ...muted }}>Sign in to author a challenge.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>

            {/* Creation helper */}
            <div style={{ background: tokens.bgCard, border: hair, borderRadius: '14px', padding: '20px 22px' }}>
              <Eyebrow style={{ marginBottom: '6px' }}>Build it with help</Eyebrow>
              <p style={{ ...body, fontSize: '15px', color: tokens.ghost, lineHeight: 1.6, margin: '0 0 14px' }}>
                Describe the idea in a sentence. North Star drafts the whole thing — you refine it below.
              </p>
              {chatMsgs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {chatMsgs.map((m, i) => (
                    <div key={i} style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%',
                      ...body, fontSize: '15px', lineHeight: 1.55, color: tokens.dark,
                      background: m.role === 'user' ? 'rgba(200,146,42,0.08)' : 'rgba(15,21,35,0.04)',
                      borderRadius: '12px', padding: '9px 13px',
                    }}>{m.content}</div>
                  ))}
                  {chatBusy && <div style={{ ...body, fontSize: '14px', color: tokens.ghost }}>Thinking…</div>}
                </div>
              )}
              {pendingDraft && (
                <div style={{ marginBottom: '14px' }}>
                  <Btn onClick={() => applyDraft(pendingDraft)}>Use this draft ↓</Btn>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendChat() } }}
                  placeholder="e.g. a 30-day challenge to reconnect with nature" disabled={chatBusy}
                  style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={sendChat} disabled={chatBusy || !chatInput.trim()}
                  style={{ ...sc, fontSize: '14px', letterSpacing: '0.1em', color: '#fff', background: tokens.gold, border: 'none', borderRadius: '10px', padding: '0 18px', cursor: 'pointer', opacity: (chatBusy || !chatInput.trim()) ? 0.5 : 1 }}>Send</button>
              </div>
            </div>

            {ownedActors.length > 0 && (
              <div>
                <Label>Author as</Label>
                <select value={authorActor} onChange={e => { authorTouched.current = true; setAuthorActor(e.target.value) }} style={inputStyle}>
                  <option value="">Yourself</option>
                  {ownedActors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <Label>What is this about?</Label>
              <select value={domain} onChange={e => pickDomain(e.target.value)} style={inputStyle}>
                <option value="">Choose one…</option>
                <optgroup label="Your life">
                  {SELF_DOMAINS.map(d => <option key={d.slug} value={d.slug}>{d.label}</option>)}
                </optgroup>
                <optgroup label="The world">
                  {CIV_DOMAINS.map(d => <option key={d.slug} value={d.slug}>{d.label}</option>)}
                </optgroup>
              </select>
            </div>

            <div>
              <Label>Name it</Label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 75 Hard, Daily Listening" style={inputStyle} />
            </div>

            <div>
              <Label>One line</Label>
              <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="The promise, in a sentence" style={inputStyle} />
            </div>

            {/* Strands */}
            <div>
              <Label>What does someone do?</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {strands.map((s, i) => (
                  <div key={s.key} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <textarea value={s.text} onChange={e => setStrand(s.key, { text: e.target.value })}
                      placeholder={i === 0 ? 'The thing they do' : 'Another thing'} rows={2}
                      style={{ ...inputStyle, resize: 'vertical', flex: 1 }} />
                    <select value={s.cadence} onChange={e => setStrand(s.key, { cadence: e.target.value })}
                      style={{ ...inputStyle, width: '130px', flexShrink: 0 }}>
                      {CADENCES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                    </select>
                    {strands.length > 1 && (
                      <button type="button" onClick={() => removeStrand(s.key)} aria-label="Remove"
                        style={{ ...sc, fontSize: '18px', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 6px', flexShrink: 0 }}>×</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addStrand}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.gold, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0 0', textTransform: 'uppercase' }}>
                + Add another
              </button>
            </div>

            {/* Duration */}
            <div>
              <Label>How long</Label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {[{ v: '21', l: '21 days' }, { v: '90', l: '90 days' }, { v: 'custom', l: 'Custom' }].map(o => (
                  <button key={o.v} type="button" onClick={() => setDurPreset(o.v)}
                    style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '8px 18px', borderRadius: '20px', cursor: 'pointer',
                      border: `1px solid ${durPreset === o.v ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.3)'}`,
                      background: durPreset === o.v ? 'rgba(200,146,42,0.08)' : 'transparent',
                      color: durPreset === o.v ? tokens.gold : tokens.ghost }}>
                    {o.l}
                  </button>
                ))}
                {durPreset === 'custom' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <input type="number" min="1" value={durCustom} onChange={e => setDurCustom(e.target.value)}
                      style={{ ...inputStyle, width: '88px', padding: '8px 10px' }} />
                    <span style={{ ...body, fontSize: '15px', color: tokens.ghost }}>days</span>
                  </span>
                )}
              </div>
            </div>

            <div>
              <Label>{isSelf ? 'What this builds in you' : 'The Horizon Goal this moves toward'}</Label>
              <textarea value={horizonText} onChange={e => setHorizonText(e.target.value)} rows={2}
                placeholder={isSelf ? 'The person this makes you' : 'The larger goal this serves'} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div>
              <Label>How will someone know it's working?</Label>
              <input value={measure} onChange={e => setMeasure(e.target.value)} placeholder="The signal that it's landing" style={inputStyle} />
            </div>

            <div>
              <Label>Why does this work?</Label>
              <textarea value={mechanism} onChange={e => setMechanism(e.target.value)} rows={2}
                placeholder="The mechanism — why doing this moves the needle" style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {errors.length > 0 && (
              <div style={{ background: 'rgba(214,56,56,0.06)', border: '1px solid rgba(214,56,56,0.3)', borderRadius: '10px', padding: '12px 16px' }}>
                {errors.map((e, i) => <div key={i} style={{ ...body, fontSize: '15px', color: '#A02020', lineHeight: 1.5 }}>{e}</div>)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
              <Btn onClick={() => createAndPublish('community')} disabled={saving}>{saving ? 'Publishing…' : 'Publish to community'}</Btn>
              <Btn variant="ghost" onClick={() => createAndPublish('link_only')} disabled={saving}>Just a link</Btn>
            </div>
            <p style={{ ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.6, margin: 0 }}>
              Community lists it for anyone to find. A link is unlisted — only people you send it to can open it.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
