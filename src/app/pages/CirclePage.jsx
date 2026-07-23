// src/app/pages/CirclePage.jsx
//
// BP-14 · The room. Members shown as their OFFERED elements only — a focus
// line, their declared horizon (if offered), circle-shared moments. The Map,
// I Am, Horizon Self and Journal are never here — no opt-in exists for them.
// Confidentiality is absolute: nothing on this page reaches a public surface.
//
// Field Notes rail. Route: /circles/:id.

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { fn, space } from '../../lib/designTokens'
import { momentImageUrl } from '../../lib/momentCapture'
import {
  getCohort, getMembers, getSharedMoments, getFire,
  setOffers, leaveCohort, addMemberByEmail, removeMember, updateCharter,
} from '../lib/cohorts'

const display = { fontFamily: "'Lora', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const mono    = { fontFamily: "'Cormorant SC', Georgia, serif" }

export default function CirclePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [cohort, setCohort]   = useState(null)
  const [members, setMembers] = useState([])
  const [moments, setMoments] = useState([])
  const [fire, setFire]       = useState(0)
  const [loading, setLoading] = useState(true)
  const [notThere, setNotThere] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const c = await getCohort(id)
    if (!c) { setNotThere(true); setLoading(false); return }
    const [ms, mo, f] = await Promise.all([getMembers(id), getSharedMoments(id), getFire(id)])
    setCohort(c); setMembers(ms); setMoments(mo); setFire(f); setLoading(false)
  }, [id])

  useEffect(() => { if (user) load(); else if (user === null) setLoading(false) }, [user, load])

  const me = members.find(m => m.user_id === user?.id) || null
  const isSteward = me?.role === 'steward'

  if (loading) return <Shell><p style={{ ...body, color: fn.meta }}>Loading…</p></Shell>
  if (user === null) return <Shell><Link to={`/login?redirect=/circles/${id}`} style={btn()}>Sign in →</Link></Shell>
  if (notThere || !cohort || !me) {
    return <Shell>
      <p style={{ ...body, fontSize: '16px', color: fn.meta }}>
        This circle isn&rsquo;t open to you, or no longer exists. <Link to="/circles" style={{ color: fn.moss }}>Your circles →</Link>
      </p>
    </Shell>
  }

  return (
    <Shell>
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase',
        color: fn.moss, marginBottom: '6px' }}>
        {cohort.temperament === 'cause' ? 'Cause circle' : 'Kin circle'} · {cohort.governance}
        {cohort.cadence ? ` · ${cohort.cadence}` : ''}
      </div>
      <h1 style={{ ...display, fontWeight: 400, fontSize: 'clamp(28px, 6vw, 40px)',
        color: fn.ink, lineHeight: 1.2, margin: `0 0 ${space.sm}` }}>
        {cohort.name}
      </h1>
      <p style={{ ...body, fontSize: '15px', color: fn.ghost, margin: `0 0 ${space.xl}` }}>
        {members.length} of {cohort.size_cap}
        {members.length >= cohort.size_cap ? ' · full · invites paused' : ''}
        {fire > 0 ? ` · ${fire} shared this week` : ''}
      </p>

      {/* The members · offered elements only */}
      <Section title="Who is here">
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
          {members.map(m => <MemberRow key={m.user_id} m={m} isMe={m.user_id === user.id}
            canRemove={isSteward && m.user_id !== user.id} onRemove={async () => {
              try { await removeMember(id, m.user_id); load() } catch (e) { alert(e.message) }
            }} />)}
        </div>
      </Section>

      {/* What I offer */}
      <MyOffers cohortId={id} me={me} onChanged={load} />

      {/* Circle-shared moments */}
      {moments.length > 0 && (
        <Section title="Shared here">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: space.md }}>
            {moments.map(mo => {
              const img = mo.image_path ? momentImageUrl(mo.thumb_path || mo.image_path) : null
              return (
                <div key={mo.id} style={{ background: fn.object, border: `1px solid ${fn.mossEdge}`,
                  borderRadius: '10px', overflow: 'hidden' }}>
                  {img && <img src={img} alt="A shared moment" style={{ width: '100%', display: 'block', aspectRatio: '1 / 1', objectFit: 'cover' }} />}
                  {mo.line && <div style={{ ...body, fontStyle: 'italic', fontSize: '14px', color: fn.ink, padding: '10px 12px', lineHeight: 1.45 }}>&ldquo;{mo.line}&rdquo;</div>}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Steward tools */}
      {isSteward && <StewardTools cohort={cohort} onChanged={load} />}

      {/* Leave · quiet, anytime */}
      <div style={{ marginTop: space.xxxl, paddingTop: space.lg, borderTop: `1px solid ${fn.rule}` }}>
        <button type="button" onClick={async () => {
          if (!confirm('Leave this circle? Your shared moments withdraw with you.')) return
          try { await leaveCohort(id); navigate('/circles') } catch (e) { alert(e.message) }
        }} style={{ ...mono, fontSize: '13px', letterSpacing: '0.10em', color: fn.ghost,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Leave this circle
        </button>
      </div>

      <p style={{ ...body, fontSize: '13px', color: fn.ghost, marginTop: space.xl, lineHeight: 1.5 }}>
        Held in confidence · nothing here appears on a public surface. The Map, I Am,
        Horizon Self and Journal are never shareable to a circle.
      </p>
    </Shell>
  )
}

function MemberRow({ m, isMe, canRemove, onRemove }) {
  const offered = []
  if (m.offer_horizon && m.offered_horizon_text) offered.push({ kind: 'horizon', text: m.offered_horizon_text })
  return (
    <div style={{ background: fn.object, border: `1px solid ${fn.mossEdge}`, borderRadius: '10px',
      padding: `${space.md} ${space.lg}`, opacity: m.state === 'dormant' ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md }}>
        <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: fn.moss }}>
          {m.role === 'steward' ? 'Steward' : 'Member'}{isMe ? ' · you' : ''}{m.state === 'dormant' ? ' · resting' : ''}
        </span>
        {canRemove && (
          <button type="button" onClick={onRemove} style={{ ...mono, fontSize: '13px', color: fn.ghost,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>remove</button>
        )}
      </div>
      {m.focus_line && (
        <p style={{ ...body, fontStyle: 'italic', fontSize: '16px', color: fn.ink, margin: '8px 0 0', lineHeight: 1.5 }}>
          &ldquo;{m.focus_line}&rdquo;
        </p>
      )}
      {offered.map((o, i) => (
        <div key={i} style={{ marginTop: '8px' }}>
          <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: fn.moss }}>Horizon</span>
          <p style={{ ...body, fontStyle: 'italic', fontSize: '15px', color: fn.meta, margin: '2px 0 0', lineHeight: 1.5 }}>{o.text}</p>
        </div>
      ))}
      {!m.focus_line && !offered.length && (
        <p style={{ ...body, fontSize: '14px', color: fn.ghost, margin: '6px 0 0' }}>Here, quietly.</p>
      )}
    </div>
  )
}

function MyOffers({ cohortId, me, onChanged }) {
  const [focus, setFocus] = useState(me.focus_line || '')
  const [offerHorizon, setOfferHorizon] = useState(!!me.offer_horizon)
  const [dormant, setDormant] = useState(me.state === 'dormant')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setBusy(true); setSaved(false)
    try {
      await setOffers(cohortId, {
        focusLine: focus, offerHorizon, state: dormant ? 'dormant' : 'active',
      })
      setSaved(true); onChanged()
    } catch (e) { alert(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Section title="What you offer">
      <p style={{ ...body, fontSize: '14px', color: fn.ghost, margin: `0 0 ${space.md}`, lineHeight: 1.5 }}>
        Awareness is offered, never taken. Share only what you choose.
      </p>
      <label style={{ display: 'block', marginBottom: space.md }}>
        <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.10em', color: fn.meta, display: 'block', marginBottom: '6px' }}>A focus line</span>
        <input value={focus} onChange={e => setFocus(e.target.value)} maxLength={160}
          placeholder="What you're giving your attention to just now"
          style={{ ...body, fontSize: '16px', color: fn.ink, width: '100%', boxSizing: 'border-box',
            background: fn.ground, border: `1px solid ${fn.mossEdge}`, borderRadius: '9px', padding: '10px 14px', outline: 'none' }} />
      </label>
      <label style={{ display: 'flex', gap: space.sm, alignItems: 'center', marginBottom: space.sm, cursor: 'pointer' }}>
        <input type="checkbox" checked={offerHorizon} onChange={e => setOfferHorizon(e.target.checked)} />
        <span style={{ ...body, fontSize: '15px', color: fn.meta }}>Offer my declared horizon to this circle</span>
      </label>
      <label style={{ display: 'flex', gap: space.sm, alignItems: 'center', marginBottom: space.lg, cursor: 'pointer' }}>
        <input type="checkbox" checked={dormant} onChange={e => setDormant(e.target.checked)} />
        <span style={{ ...body, fontSize: '15px', color: fn.meta }}>Rest for now (dims, never removed)</span>
      </label>
      <button type="button" onClick={save} disabled={busy} style={btn(busy)}>
        {busy ? 'Saving…' : saved ? 'Saved ✓' : 'Save what I offer'}
      </button>
    </Section>
  )
}

function StewardTools({ cohort, onChanged }) {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState(null)
  const [cap, setCap] = useState(cohort.size_cap)
  const [gov, setGov] = useState(cohort.governance)
  const [cadence, setCadence] = useState(cohort.cadence || '')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!email.trim()) return
    setBusy(true); setMsg(null)
    try { const r = await addMemberByEmail(cohort.id, email.trim()); setMsg(r === 'added' ? 'Added.' : r); setEmail(''); onChanged() }
    catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }
  async function saveCharter() {
    setBusy(true)
    try { await updateCharter(cohort.id, { governance: gov, sizeCap: Number(cap) || cohort.size_cap, cadence: cadence.trim() || null }); onChanged() }
    catch (e) { alert(e.message) } finally { setBusy(false) }
  }

  return (
    <Section title="Steward">
      <div style={{ marginBottom: space.lg }}>
        <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.10em', color: fn.meta, display: 'block', marginBottom: '6px' }}>
          Pass the flame · add by email
        </span>
        <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="their email"
            style={{ ...body, fontSize: '15px', color: fn.ink, flex: '1 1 200px', background: fn.ground,
              border: `1px solid ${fn.mossEdge}`, borderRadius: '9px', padding: '10px 14px', outline: 'none' }} />
          <button type="button" onClick={add} disabled={busy} style={btn(busy)}>Add</button>
        </div>
        {msg && <p style={{ ...body, fontSize: '14px', color: fn.meta, marginTop: '6px' }}>{msg}</p>}
      </div>

      <div style={{ display: 'flex', gap: space.md, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label>
          <span style={{ ...mono, fontSize: '13px', color: fn.meta, display: 'block', marginBottom: '6px' }}>Governance</span>
          <select value={gov} onChange={e => setGov(e.target.value)} style={sel()}>
            <option value="stewarded">Stewarded</option>
            <option value="open">Open</option>
          </select>
        </label>
        <label>
          <span style={{ ...mono, fontSize: '13px', color: fn.meta, display: 'block', marginBottom: '6px' }}>Size cap</span>
          <input type="number" min={2} max={60} value={cap} onChange={e => setCap(e.target.value)} style={{ ...sel(), width: '90px' }} />
        </label>
        <label style={{ flex: '1 1 160px' }}>
          <span style={{ ...mono, fontSize: '13px', color: fn.meta, display: 'block', marginBottom: '6px' }}>Cadence</span>
          <input value={cadence} onChange={e => setCadence(e.target.value)} style={{ ...sel(), width: '100%', boxSizing: 'border-box' }} />
        </label>
        <button type="button" onClick={saveCharter} disabled={busy} style={btn(busy)}>Amend charter</button>
      </div>
      <p style={{ ...body, fontSize: '13px', color: fn.ghost, marginTop: space.sm }}>
        Lowering the cap never removes anyone · it only pauses new invites.
      </p>
    </Section>
  )
}

function Section({ title, children }) {
  return (
    <section style={{ marginTop: space.xxl }}>
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase',
        color: fn.ghost, marginBottom: space.md }}>{title}</div>
      {children}
    </section>
  )
}
function Shell({ children }) {
  return (
    <div style={{ minHeight: '100dvh', background: fn.ground }}>
      <Nav />
      <div style={{ maxWidth: '720px', margin: '0 auto',
        padding: 'clamp(72px, 12vw, 120px) clamp(20px, 5vw, 40px) 100px' }}>
        {children}
      </div>
    </div>
  )
}
function btn(disabled) {
  return { ...mono, fontSize: '14px', letterSpacing: '0.10em', textDecoration: 'none',
    background: fn.moss, color: '#FFFFFF', border: '1px solid transparent', borderRadius: '10px',
    padding: '11px 20px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }
}
function sel() {
  return { fontFamily: "'Lora', Georgia, serif", fontSize: '15px', color: fn.ink,
    background: fn.ground, border: `1px solid ${fn.mossEdge}`, borderRadius: '9px', padding: '9px 12px', outline: 'none' }
}
