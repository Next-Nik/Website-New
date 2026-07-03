// /challenges/new — standalone challenge authoring (Phase 4, June 2026).
//
// An actor or individual builds a packaged challenge from scratch, without
// first running their own stretch. Scale is never asked: the author picks one
// thing the challenge is about, and a personal domain means self, a world
// domain means civ. The Horizon Goal anchor prefills from that choice (the
// fractal: a personal Body challenge ladders to Nature's Horizon Goal).

import { useState, useEffect, useRef } from 'react'
import { actorCallsRaw } from '../../lib/actorCallsClient'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Nav }        from '../../components/Nav'
import { useAuth }    from '../../hooks/useAuth'
import { useActingAs } from '../context/ActingAsContext'
import { supabase }   from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'
import {
  SELF_DOMAINS, CIV_DOMAINS, SELF_TO_ATLAS_MAP, DOMAIN_HORIZON_GOALS,
} from '../constants/domains'
import { INTENSITY_LEVELS } from '../../constants/challengeIntensity'
import IntensityInfo from '../components/challenge/IntensityInfo'
import ChiliRung from '../components/challenge/ChiliRung'
import { downscaleImage } from '../../lib/imageDownscale'

const GOLD_C = tokens.goldChrome
const hair   = '1px solid rgba(200,146,42,0.18)'
const muted  = { color: 'rgba(15,21,35,0.78)' }

const SELF_SLUGS = new Set(SELF_DOMAINS.map(d => d.slug))

// Founding mode — the Earth Challenge's domain is fixed to Nature, and the author
// picks which part of the living world their challenge touches (the seven canonical
// Nature subdomains seeded in migration 145).
const NATURE_GOAL = DOMAIN_HORIZON_GOALS['nature']
const NATURE_SUBDOMAINS = [
  { slug: 'nat-earth',          label: 'Earth' },
  { slug: 'nat-air',            label: 'Air' },
  { slug: 'nat-salt-water',     label: 'Salt Water' },
  { slug: 'nat-fresh-water',    label: 'Fresh Water' },
  { slug: 'nat-flora',          label: 'Flora' },
  { slug: 'nat-fauna',          label: 'Fauna' },
  { slug: 'nat-living-systems', label: 'Living Systems' },
]

const CADENCES = [
  { v: 'once',           l: 'Once' },
  { v: 'daily-absolute', l: 'Daily' },
  { v: '5-of-7',         l: 'A few times a week' },
  { v: 'weekly',         l: 'Weekly' },
  { v: 'monthly',        l: 'Monthly' },
]

function fmtCloseDate(iso, opts = { month: 'long', day: 'numeric', year: 'numeric' }) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts)
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function daysFromToday(dateStr) {
  if (!dateStr) return 0
  const [y, m, d] = dateStr.split('-').map(Number)
  const end   = new Date(y, m - 1, d)
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(1, Math.ceil((end - today) / 86400000))
}

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
  const [searchParams] = useSearchParams()
  const founding = searchParams.get('carry') === 'founding-nature'
  // Where the author-profile builder and invite flow return to.
  const backTo   = founding ? '/challenges/new?carry=founding-nature' : '/challenges/new'

  const [ownedActors, setOwnedActors] = useState([])
  const [authorActor, setAuthorActor] = useState('')   // actor id authoring this
  const authorTouched = useRef(false)
  // Inline author setup — no one leaves this page to become an author.
  const [authorMode,  setAuthorMode]  = useState('self')  // self | org | invite
  const [selfName,    setSelfName]    = useState('')
  const [selfLine,    setSelfLine]    = useState('')
  const [selfImg,     setSelfImg]     = useState('')
  const [selfImgBusy, setSelfImgBusy] = useState(false)
  const [selfBusy,    setSelfBusy]    = useState(false)
  const [selfErr,     setSelfErr]     = useState('')
  const [orgQ,        setOrgQ]        = useState('')
  const [orgResults,  setOrgResults]  = useState([])
  const [domain,      setDomain]      = useState('')
  const [lastPrefill, setLastPrefill] = useState('')
  const [title,       setTitle]       = useState('')
  const [tagline,     setTagline]     = useState('')
  const [horizonText, setHorizonText] = useState('')
  const [durPreset,   setDurPreset]   = useState('90')
  const [durCustom,   setDurCustom]   = useState(60)
  const [durDate,     setDurDate]     = useState('')   // custom: an end date instead of a day count
  const [strands,     setStrands]     = useState([{ key: 1, text: '', cadence: '5-of-7' }])
  const [keySeq,      setKeySeq]      = useState(2)
  const [parentCallId,    setParentCallId]    = useState('')   // builds-on: sets parent_call_id
  const [bodyLong,        setBodyLong]        = useState('')   // a longer piece
  const [videoUrl,        setVideoUrl]        = useState('')   // optional video link
  const [coverUrl,        setCoverUrl]        = useState('')   // optional hero image URL
  const [intensity,       setIntensity]       = useState(null) // optional 1–5
  const [imgBusy,         setImgBusy]         = useState(false)
  const [imgErr,          setImgErr]          = useState('')
  const [parentOptions,   setParentOptions]   = useState([])
  const [subdomainSlug,   setSubdomainSlug]   = useState('')
  const [foundingRoot,    setFoundingRoot]    = useState(null)   // { id, title }
  const [foundingClose,   setFoundingClose]   = useState(null)   // 'YYYY-MM-DD'

  // Eligible parents: community challenges in the same domain. Clears the
  // selection whenever the domain changes so a parent never outlives its domain.
  useEffect(() => {
    if (founding) return
    if (!domain) { setParentOptions([]); setParentCallId(''); return }
    let live = true
    setParentCallId('')
    actorCallsRaw({ action: 'browse_challenges', domain, limit: 50, sort: 'popular' })
      .then(r => r.json())
      .then(d => { if (live) setParentOptions(d.challenges || []) })
      .catch(() => {})
    return () => { live = false }
  }, [domain])

  // Founding mode: lock the domain to Nature, prefill+lock the goal, and resolve
  // the founding root so this challenge hangs beneath it and inherits the close.
  useEffect(() => {
    if (!founding) return
    setDomain('nature')
    setHorizonText(NATURE_GOAL)
    let live = true
    fetch('/api/beacon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 'founding-nature' }) })
      .then(r => r.json())
      .then(d => {
        if (!live || !d || !d.rooted || !d.root_slug) return
        setFoundingClose(d.closes_on || null)
        return actorCallsRaw({ action: 'get_by_slug', slug: d.root_slug })
          .then(r => r.json())
          .then(rc => { if (live && rc.call?.id) { setFoundingRoot({ id: rc.call.id, title: rc.call.title }); setParentCallId(rc.call.id) } })
      })
      .catch(() => {})
    return () => { live = false }
  }, [founding])

  const [errors,    setErrors]    = useState([])
  const [saving,    setSaving]    = useState(false)
  const [published, setPublished] = useState(null)   // { url, visibility }

  // A detour (claim an org, build a fuller org profile, send an invite) must
  // never cost someone the challenge they just wrote. The draft is stashed
  // before navigation and restored when they return; publishing clears it.
  const DRAFT_KEY = founding ? 'nx-challenge-draft:founding' : 'nx-challenge-draft'
  function stashDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        savedAt: Date.now(),
        title, tagline, domain, horizonText, durPreset, durCustom, durDate,
        strands, bodyLong, videoUrl, coverUrl, intensity, subdomainSlug,
      }))
    } catch {}
  }
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (!d.savedAt || Date.now() - d.savedAt > 86400000) { localStorage.removeItem(DRAFT_KEY); return }
      if (d.title)   setTitle(d.title)
      if (d.tagline) setTagline(d.tagline)
      if (!founding && d.domain) setDomain(d.domain)
      if (d.horizonText) setHorizonText(d.horizonText)
      if (d.durPreset)   setDurPreset(d.durPreset)
      if (d.durCustom)   setDurCustom(d.durCustom)
      if (d.durDate)     setDurDate(d.durDate)
      if (Array.isArray(d.strands) && d.strands.length) {
        setStrands(d.strands)
        setKeySeq(Math.max(...d.strands.map(x => x.key || 1)) + 1)
      }
      if (d.bodyLong)      setBodyLong(d.bodyLong)
      if (d.videoUrl)      setVideoUrl(d.videoUrl)
      if (d.coverUrl)      setCoverUrl(d.coverUrl)
      if (d.intensity)     setIntensity(d.intensity)
      if (d.subdomainSlug) setSubdomainSlug(d.subdomainSlug)
    } catch {}
  }, [])

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
    } else if (!authorActor) {
      setAuthorActor(ownedActors[0].id)
    }
  }, [ownedActors, actingAsActorId, founding])

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
    if (d.duration_days) {
      const n = Number(d.duration_days)
      if (n === 21 || n === 90) setDurPreset(String(n))
      else {
        setDurPreset('custom'); setDurCustom(n)
        const end = new Date(); end.setDate(end.getDate() + n)
        setDurDate(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`)
      }
    }
    if (Array.isArray(d.strands) && d.strands.length) {
      let k = keySeq
      const valid = ['once', 'daily-absolute', '5-of-7', 'weekly', 'monthly']
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
      const r = await actorCallsRaw({ action: 'search_actors', q })
      const d = await r.json()
      setInviteResults(d.actors || [])
    } catch { setInviteResults([]) }
  }

  async function invitePartner(actor) {
    if (!published?.callId) return
    setInviteBusy(true)
    try {
      await actorCallsRaw({ action: 'request_partner', userId: user.id, call_id: published.callId, partner_actor_id: actor.id })
      setInvited(v => [...v, actor.name])
      setInviteQ(''); setInviteResults([])
    } catch {}
    setInviteBusy(false)
  }

  // "As yourself" — the mini profile. Name, photo, one line: the floor an
  // author needs so others can see who is behind a challenge. Created in
  // place via /api/add-actor; the challenge draft never leaves the screen.
  async function onPickSelfImage(e) {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file) return
    setSelfErr(''); setSelfImgBusy(true)
    try {
      const { dataUrl } = await downscaleImage(file)
      let token = null
      try { token = (await supabase.auth.getSession()).data.session?.access_token || null } catch {}
      const res = await fetch('/api/actor-image-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ imageData: dataUrl }),
      })
      const json = await res.json()
      if (!res.ok || !json.image_url) throw new Error(json.error || 'Upload failed')
      setSelfImg(json.image_url)
    } catch (err) {
      setSelfErr(err.message || 'Could not upload that photo')
    } finally {
      setSelfImgBusy(false)
    }
  }

  async function createSelfProfile() {
    if (!selfName.trim()) { setSelfErr('Your name is required.'); return }
    if (!selfImg.trim())  { setSelfErr('A photo is required so people can see who is showing up.'); return }
    if (!selfLine.trim()) { setSelfErr('One line about what you do is required.'); return }
    setSelfBusy(true); setSelfErr('')
    try {
      let token = null
      try { token = (await supabase.auth.getSession()).data.session?.access_token || null } catch {}
      if (!token) { setSelfErr('Your session has expired. Sign in again and retry.'); setSelfBusy(false); return }
      const civ = founding
        ? 'nature'
        : (domain ? (SELF_SLUGS.has(domain) ? SELF_TO_ATLAS_MAP[domain] : domain) : 'human-being')
      const r = await fetch('/api/add-actor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          represents: true, aiUrl: '',
          primary: {
            name: selfName.trim(), type: 'practitioner',
            image_url: selfImg.trim(), description: selfLine.trim(),
            primary_domain: civ,
          },
          extras: [],
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.ok || !d.results?.length) {
        setSelfErr(d.error || 'Could not create your profile. Try again.')
        setSelfBusy(false); return
      }
      const created = d.results[0]
      setOwnedActors([{ id: created.id, name: created.name || selfName.trim(), type: 'practitioner' }])
      authorTouched.current = true
      setAuthorActor(created.id)
    } catch {
      setSelfErr('Something went wrong. Try again.')
    }
    setSelfBusy(false)
  }

  // "As an organisation" — search the Atlas first. Most orgs worth authoring
  // as are already on the map; claiming beats creating a duplicate.
  async function searchOrgs(q) {
    setOrgQ(q)
    if (q.trim().length < 2) { setOrgResults([]); return }
    try {
      const r = await actorCallsRaw({ action: 'search_actors', q, limit: 6 })
      const d = await r.json()
      setOrgResults((d.actors || []).filter(a => a.type !== 'practitioner'))
    } catch { setOrgResults([]) }
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file) return
    setImgErr(''); setImgBusy(true)
    try {
      const { dataUrl, ext } = await downscaleImage(file)
      let token = null
      try { token = (await supabase.auth.getSession()).data.session?.access_token || null } catch {}
      const res = await fetch('/api/challenge-image-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ dataUrl, ext }),
      })
      const json = await res.json()
      if (!res.ok || !json.image_url) throw new Error(json.error || 'Upload failed')
      setCoverUrl(json.image_url)
    } catch (err) {
      setImgErr(err.message || 'Could not upload that image')
    } finally {
      setImgBusy(false)
    }
  }

  function buildPayload() {
    const cleanStrands = strands
      .filter(s => s.text.trim())
      .map((s, i) => ({ id: `s${i + 1}`, text: s.text.trim(), cadence: s.cadence }))
    const duration_days = founding
      ? (foundingClose ? daysFromToday(foundingClose) : 90)
      : (durPreset === 'custom' ? (durDate ? daysFromToday(durDate) : Math.max(1, Number(durCustom) || 1)) : Number(durPreset))
    const the_move = cleanStrands.length === 1 ? cleanStrands[0].text : (tagline.trim() || title.trim())
    const cadence  = cleanStrands[0]?.cadence || '5-of-7'
    return {
      type: 'challenge',
      scale: founding ? 'civ' : scale,
      domain: founding ? 'nature' : domain,
      title: title.trim(), tagline: tagline.trim() || null,
      horizon_goal_text: founding ? NATURE_GOAL : horizonText.trim(),
      the_move, cadence, duration_days,
      measure: '', mechanism: '',
      parent_call_id: founding ? (foundingRoot?.id || parentCallId || null) : (parentCallId || null),
      subdomain_slug: founding ? (subdomainSlug || null) : null,
      author_statement: null,
      body_long: bodyLong.trim() || null,
      video_url: videoUrl.trim() || null,
      cover_image_url: coverUrl.trim() || null,
      intensity_level: intensity || null,
      protocol: cleanStrands,
    }
  }

  async function createAndPublish(visibility) {
    if (!authorActor) { setErrors(['Set up who is authoring this challenge first. It takes a minute, just above.']); return }
    if (founding && !foundingRoot?.id) { setErrors(['The Earth Challenge could not be reached, so this cannot join the constellation yet. Refresh the page and try again.']); return }
    if (founding && !subdomainSlug) { setErrors(['Choose which part of the living world this touches.']); return }
    setSaving(true); setErrors([])
    const payload = buildPayload()
    if (payload.protocol.length === 0) { setErrors(['Add at least one thing someone will do.']); setSaving(false); return }
    try {
      const vRes = await actorCallsRaw({ action: 'validate_floor', userId: user.id, ...payload })
      const vData = await vRes.json()
      if (!vData.passes) { setErrors(vData.errors || ['Some details are still missing.']); setSaving(false); return }

      const cRes = await actorCallsRaw({ action: 'create', userId: user.id, actor_id: authorActor || null, ...payload })
      const cData = await cRes.json()
      if (!cData.call?.id) { setErrors([cData.error || 'Could not save.']); setSaving(false); return }

      const pRes = await actorCallsRaw({ action: 'publish', userId: user.id, call_id: cData.call.id, visibility })
      const pData = await pRes.json()
      if (pData.error) { setErrors([pData.error]); setSaving(false); return }
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
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
              Credit a partner. They get a request. Nothing shows publicly until they accept.
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
        {founding ? (
          <>
            <Eyebrow>A Nature challenge</Eyebrow>
            <h1 style={{ ...serif, fontWeight: 300, fontSize: '38px', color: tokens.dark, lineHeight: 1.1, margin: '0 0 10px' }}>
              What is your challenge to the world?
            </h1>
            <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: '0 0 8px' }}>
              Challenge the world to change the world. Invite others to take on a piece of the work you do to create a thriving future. From now to {fmtCloseDate(foundingClose, { month: 'long', day: 'numeric' }) || 'September 28'}.
            </p>
            <p style={{ ...body, fontSize: '14px', color: tokens.ghost, margin: '0 0 32px' }}>
              <span style={{ color: tokens.gold }}>&middot;</span> Building on the NextUs Earth Challenge
            </p>
          </>
        ) : (
          <>
            <Eyebrow>Author a challenge</Eyebrow>
            <h1 style={{ ...serif, fontWeight: 300, fontSize: '38px', color: tokens.dark, lineHeight: 1.1, margin: '0 0 10px' }}>
              Build something others can take on
            </h1>
            <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: '0 0 32px' }}>
              A challenge is a set of things someone does, on a clock that starts the day they join.
            </p>
          </>
        )}

        {!user ? (
          <div style={{ padding: '24px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '14px' }}>
              Sign in or create an account to author a challenge.
            </p>
            <a href={`/login?redirect=${encodeURIComponent(backTo)}`}
              style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: tokens.gold, background: 'rgba(200,146,42,0.08)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }}>
              Sign in →
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>

            {/* Creation helper */}
            <div style={{ background: tokens.bgCard, border: hair, borderRadius: '14px', padding: '20px 22px' }}>
              <Eyebrow style={{ marginBottom: '6px' }}>Build it with help</Eyebrow>
              <p style={{ ...body, fontSize: '15px', color: tokens.ghost, lineHeight: 1.6, margin: '0 0 14px' }}>
                Describe the idea in a sentence. North Star drafts the whole thing. You refine it below.
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

            {ownedActors.length > 0 ? (
              <div>
                <Label>Author as</Label>
                <select value={authorActor} onChange={e => { authorTouched.current = true; setAuthorActor(e.target.value) }} style={inputStyle}>
                  {ownedActors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <a href={`/invite/new?then=${encodeURIComponent(backTo)}`} onClick={stashDraft}
                  style={{ ...body, fontSize: '14px', color: tokens.gold, textDecoration: 'none',
                    display: 'inline-block', marginTop: '10px', borderBottom: '1px solid rgba(200,146,42,0.4)' }}>
                  or invite an organisation to take part
                </a>
              </div>
            ) : (
              <div style={{ background: tokens.bgCard, border: hair, borderRadius: '14px', padding: '20px 22px' }}>
                <Label>Author as</Label>
                <p style={{ ...body, fontSize: '15px', color: tokens.dark, lineHeight: 1.6, margin: '0 0 12px' }}>
                  A challenge is published by someone others can find and follow. Choose how you want to show up. Your challenge stays right here while you do.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { v: 'self',   l: 'As yourself' },
                    { v: 'org',    l: 'As an organisation' },
                    { v: 'invite', l: 'Invite an organisation' },
                  ].map(o => (
                    <button key={o.v} type="button" onClick={() => setAuthorMode(o.v)}
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', padding: '7px 16px', borderRadius: '20px', cursor: 'pointer',
                        border: `1px solid ${authorMode === o.v ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.3)'}`,
                        background: authorMode === o.v ? 'rgba(200,146,42,0.08)' : 'transparent',
                        color: authorMode === o.v ? tokens.gold : tokens.ghost }}>
                      {o.l}
                    </button>
                  ))}
                </div>

                {authorMode === 'self' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input value={selfName} onChange={e => setSelfName(e.target.value)}
                      placeholder="Your name" style={inputStyle} />
                    <input value={selfLine} onChange={e => setSelfLine(e.target.value)}
                      placeholder="One line on what you do" style={inputStyle} />
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '9px 18px', borderRadius: '20px',
                        cursor: selfImgBusy ? 'default' : 'pointer', border: '1px solid rgba(200,146,42,0.4)',
                        color: tokens.gold, textTransform: 'uppercase', whiteSpace: 'nowrap', opacity: selfImgBusy ? 0.55 : 1 }}>
                        {selfImgBusy ? 'Uploading…' : (selfImg ? 'Change photo' : 'Add a photo')}
                        <input type="file" accept="image/*" disabled={selfImgBusy} onChange={onPickSelfImage} style={{ display: 'none' }} />
                      </label>
                      {selfImg && (
                        <img src={selfImg} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
                      )}
                    </div>
                    {selfErr && <p style={{ ...body, fontSize: '13px', color: '#B5482E', margin: 0 }}>{selfErr}</p>}
                    <div>
                      <Btn onClick={createSelfProfile} disabled={selfBusy}>
                        {selfBusy ? 'Creating…' : 'Create your profile →'}
                      </Btn>
                    </div>
                  </div>
                )}

                {authorMode === 'org' && (
                  <div>
                    <p style={{ ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.6, margin: '0 0 10px' }}>
                      Your organisation may already be on the Atlas. Search first; claim it if it is there.
                    </p>
                    <input value={orgQ} onChange={e => searchOrgs(e.target.value)}
                      placeholder="Search the Atlas by name" style={inputStyle} />
                    {orgResults.length > 0 && (
                      <div style={{ marginTop: '8px', border: hair, borderRadius: '10px', overflow: 'hidden' }}>
                        {orgResults.map(a => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: tokens.bgCard, borderBottom: hair, padding: '10px 14px' }}>
                            {a.image_url && <img src={a.image_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '5px', objectFit: 'cover', flexShrink: 0 }} />}
                            <span style={{ ...body, fontSize: '15px', color: tokens.dark, flex: 1 }}>{a.name}</span>
                            {a.claimed ? (
                              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: tokens.ghost }}>Claimed</span>
                            ) : (
                              <a href={`/org/${a.slug || a.id}/claim?then=${encodeURIComponent(window.location.pathname + window.location.search)}`} onClick={stashDraft}
                                style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: tokens.gold, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                This is us · claim it →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <a href={`/add?mine=1&type=org&then=${encodeURIComponent(backTo)}`} onClick={stashDraft}
                      style={{ ...body, fontSize: '14px', color: tokens.gold, textDecoration: 'none',
                        display: 'inline-block', marginTop: '10px', borderBottom: '1px solid rgba(200,146,42,0.4)' }}>
                      {orgQ.trim() ? `Not there? Create ${orgQ.trim()} as a new organisation` : 'Set up a new organisation'}
                    </a>
                  </div>
                )}

                {authorMode === 'invite' && (
                  <div>
                    <p style={{ ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.6, margin: '0 0 10px' }}>
                      Reach out to them yourself. Nothing is created in their name until they join.
                    </p>
                    <a href={`/invite/new?then=${encodeURIComponent(backTo)}`} onClick={stashDraft}
                      style={{ ...body, fontSize: '14px', color: tokens.gold, textDecoration: 'none',
                        display: 'inline-block', borderBottom: '1px solid rgba(200,146,42,0.4)' }}>
                      Invite an organisation to take part →
                    </a>
                  </div>
                )}
              </div>
            )}

            {founding ? (
              <div>
                <Label>Which part of the living world</Label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {NATURE_SUBDOMAINS.map(s => {
                    const on = subdomainSlug === s.slug
                    return (
                      <button key={s.slug} type="button" onClick={() => setSubdomainSlug(on ? '' : s.slug)}
                        style={{ ...sc, fontSize: '14px', letterSpacing: '0.06em', cursor: 'pointer',
                          border: `1px solid ${on ? GOLD_C : 'rgba(200,146,42,0.28)'}`,
                          background: on ? 'rgba(200,146,42,0.10)' : 'transparent',
                          color: on ? tokens.gold : tokens.ghost,
                          borderRadius: '24px', padding: '8px 16px' }}>
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div>
                <Label>What domain?</Label>
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
            )}

            <div>
              <Label>Name it</Label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Rewild a Mile, Daily Listening" style={inputStyle} />
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

            {/* Duration — hidden in founding mode (locked to the shared close) */}
            {!founding && (
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <input type="date" min={todayStr()} value={durDate} onChange={e => setDurDate(e.target.value)}
                      style={{ ...inputStyle, width: 'auto', padding: '8px 12px' }} />
                    {durDate && (
                      <span style={{ ...body, fontSize: '15px', color: tokens.ghost }}>· {daysFromToday(durDate)} days</span>
                    )}
                  </span>
                )}
              </div>
            </div>
            )}

            {!founding && (
            <div>
              <Label>{isSelf ? 'What this builds in you' : 'The Horizon Goal this moves toward'}</Label>
              <textarea value={horizonText} onChange={e => setHorizonText(e.target.value)} rows={2}
                placeholder={isSelf ? 'The person this makes you' : 'The larger goal this serves'} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            )}

            <div>
              <Label>A longer piece (optional)</Label>
              <textarea value={bodyLong} onChange={e => setBodyLong(e.target.value)} rows={6}
                placeholder="Room to say more · the fuller invitation. Shown as paragraphs on the challenge page." style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div>
              <Label>Video link (optional)</Label>
              <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                placeholder="A YouTube or Vimeo link · embedded on the page" style={inputStyle} />
            </div>

            <div>
              <Label>Cover image (optional)</Label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="text" value={coverUrl} onChange={e => setCoverUrl(e.target.value)}
                  placeholder="Upload a photo, or paste an image URL" style={{ ...inputStyle, flex: 1, minWidth: '180px' }} />
                <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '9px 18px', borderRadius: '20px', cursor: imgBusy ? 'default' : 'pointer', border: '1px solid rgba(200,146,42,0.4)', color: tokens.gold, textTransform: 'uppercase', whiteSpace: 'nowrap', opacity: imgBusy ? 0.55 : 1 }}>
                  {imgBusy ? 'Uploading…' : 'Upload'}
                  <input type="file" accept="image/*" disabled={imgBusy} onChange={onPickImage} style={{ display: 'none' }} />
                </label>
              </div>
              {imgErr && <p style={{ ...body, fontSize: '13px', color: '#B5482E', margin: '8px 0 0' }}>{imgErr}</p>}
              {coverUrl.trim() && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <img src={coverUrl.trim()} alt="" style={{ width: '100%', maxWidth: '220px', height: 'auto', borderRadius: '12px', border: hair, display: 'inline-block' }} />
                </div>
              )}
            </div>

            <div>
              <Label>Intensity (optional) <IntensityInfo colour={GOLD_C} /></Label>
              <p style={{ ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.6, margin: '0 0 10px' }}>
                Like a spiciness level on a menu, so people can find what they can take on. It orients, it never ranks.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {INTENSITY_LEVELS.map(l => {
                  const on = intensity === l.level
                  return (
                    <button key={l.level} type="button" title={l.blurb}
                      onClick={() => setIntensity(on ? null : l.level)}
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '7px',
                        border: `1px solid ${on ? GOLD_C : 'rgba(200,146,42,0.28)'}`,
                        background: on ? 'rgba(200,146,42,0.10)' : 'transparent',
                        color: on ? tokens.gold : tokens.ghost,
                        borderRadius: '24px', padding: '8px 14px' }}>
                      <ChiliRung level={l.level} size={13} />
                      {l.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {parentOptions.length > 0 && (
              <div>
                <Label>Builds on (optional)</Label>
                <select value={parentCallId} onChange={e => setParentCallId(e.target.value)} style={inputStyle}>
                  <option value="">A root · stands on its own</option>
                  {parentOptions.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <p style={{ ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.6, margin: '6px 0 0' }}>
                  Hang this beneath a challenge it continues. It joins that challenge's living tree.
                </p>
              </div>
            )}

            {errors.length > 0 && (
              <div style={{ background: 'rgba(214,56,56,0.06)', border: '1px solid rgba(214,56,56,0.3)', borderRadius: '10px', padding: '12px 16px' }}>
                {errors.map((e, i) => <div key={i} style={{ ...body, fontSize: '15px', color: '#A02020', lineHeight: 1.5 }}>{e}</div>)}
              </div>
            )}

            {parentCallId && (() => {
              const primary = (strands.find(s => s.text.trim()) || strands[0] || {}).cadence
              const once = primary === 'once'
              return (
                <div style={{ display: 'grid', gap: '14px', paddingTop: '4px' }}>
                  <div style={{ background: tokens.goldTint, border: `1px solid ${tokens.goldFaint}`, borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tokens.gold, marginBottom: '4px' }}>How it counts</div>
                    <div style={{ ...body, fontSize: '15px', color: tokens.meta, lineHeight: 1.55 }}>
                      {once
                        ? 'Doing it once is a finish, plus five sparks to the beacon.'
                        : `Each check-in adds one spark to the beacon. At the close, just past Climate Week${fmtCloseDate(foundingClose) ? ` (${fmtCloseDate(foundingClose)})` : ''}, we get to see what we were able to get done together.`}
                    </div>
                  </div>
                  <div style={{ borderLeft: `2px solid ${GOLD_C}`, padding: '2px 0 2px 16px' }}>
                    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tokens.gold, marginBottom: '4px' }}>What you don&rsquo;t have to do</div>
                    <div style={{ ...body, fontSize: '14.5px', color: tokens.ghost, lineHeight: 1.5 }}>
                      No points to set. No game to design. No scoring. People show up, the system counts each one, and your challenge feeds the same beacon as everyone else&rsquo;s.
                    </div>
                  </div>
                </div>
              )
            })()}

            {!founding && (
            <div style={{ ...body, fontSize: '14px', color: tokens.ghost, paddingTop: '2px' }}>
              Need to gather help or things instead of a daily practice?{' '}
              <a href="/asks/new" style={{ color: tokens.gold, textDecoration: 'underline' }}>Make an ask</a> instead.
            </div>
            )}

            {founding ? (
              <>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
                  <Btn onClick={() => createAndPublish('community')} disabled={saving}>{saving ? 'Publishing…' : 'Publish →'}</Btn>
                </div>
                <p style={{ ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.6, margin: 0 }}>
                  Public · listed in the constellation the moment you publish.
                </p>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
                  <Btn onClick={() => createAndPublish('community')} disabled={saving}>{saving ? 'Publishing…' : 'Publish to community'}</Btn>
                  <Btn variant="ghost" onClick={() => createAndPublish('link_only')} disabled={saving}>Just a link</Btn>
                </div>
                <p style={{ ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.6, margin: 0 }}>
                  Community lists it for anyone to find. A link is unlisted. Only people you send it to can open it.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
