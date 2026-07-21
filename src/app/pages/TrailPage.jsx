// src/app/pages/TrailPage.jsx
//
// BP-16 · One trail, walkable. Anyone with the link (once published) can walk
// and adapt it; the owner can add steps and publish. Field Notes rail.
// Route: /trail/:id.

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { fn, space } from '../../lib/designTokens'
import { getTrail, addTrailStep, removeTrailStep, setTrailPublic } from '../lib/trails'

const display = { fontFamily: "'Fraunces', Georgia, serif" }
const body    = { fontFamily: "'Newsreader', Georgia, serif" }
const mono    = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }

const KINDS = [['practice', 'Practice'], ['challenge', 'Challenge'], ['stretch', 'Stretch'], ['note', 'Note']]

export default function TrailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [trail, setTrail] = useState(null)
  const [loading, setLoading] = useState(true)

  const [kind, setKind] = useState('practice')
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setTrail(await getTrail(id))
    setLoading(false)
  }, [id])
  useEffect(() => { load() }, [load])

  const isOwner = !!user && trail && trail.user_id === user.id

  async function add() {
    if (!label.trim()) return
    setBusy(true)
    try {
      await addTrailStep(id, { kind, label: label.trim(), note: note.trim() || null, sortOrder: (trail.steps?.length || 0) })
      setLabel(''); setNote(''); load()
    } catch (e) { alert(e.message) } finally { setBusy(false) }
  }

  if (loading) return <Shell><p style={{ ...body, color: fn.meta }}>Loading…</p></Shell>
  if (!trail) return <Shell><p style={{ ...body, color: fn.meta }}>This trail isn&rsquo;t here. <Link to="/trails" style={{ color: fn.moss }}>Your trails →</Link></p></Shell>

  return (
    <Shell>
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: fn.moss, marginBottom: '6px' }}>
        A trail{trail.is_public ? ' · walkable' : ' · private'}
      </div>
      <h1 style={{ ...display, fontWeight: 400, fontSize: 'clamp(28px, 6vw, 40px)', color: fn.ink, lineHeight: 1.2, margin: `0 0 ${space.sm}` }}>
        {trail.title}
      </h1>
      {trail.horizon_text && (
        <p style={{ ...body, fontStyle: 'italic', fontSize: '17px', color: fn.meta, margin: `0 0 ${space.xl}` }}>
          toward &ldquo;{trail.horizon_text}&rdquo;
        </p>
      )}

      {/* The steps, in order · the walkable route. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, marginTop: space.lg }}>
        {(trail.steps || []).map((s, i) => (
          <div key={s.id} style={{ display: 'flex', gap: space.md, alignItems: 'flex-start' }}>
            <span style={{ ...mono, fontSize: '13px', color: fn.moss, marginTop: '3px' }}>{String(i + 1).padStart(2, '0')}</span>
            <div style={{ flex: 1, background: fn.object, border: `1px solid ${fn.mossEdge}`, borderRadius: '10px', padding: `${space.md} ${space.lg}` }}>
              <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: fn.ghost }}>
                {KINDS.find(k => k[0] === s.kind)?.[1] || s.kind}
              </div>
              <div style={{ ...body, fontSize: '17px', color: fn.ink, marginTop: '2px' }}>
                {s.ref_slug ? <Link to={s.kind === 'challenge' ? `/stretch/c/${s.ref_slug}` : `/${s.ref_slug}`} style={{ color: fn.ink }}>{s.label}</Link> : s.label}
              </div>
              {s.note && <div style={{ ...body, fontSize: '15px', color: fn.meta, marginTop: '4px', lineHeight: 1.5 }}>{s.note}</div>}
              {isOwner && (
                <button type="button" onClick={async () => { await removeTrailStep(s.id); load() }}
                  style={{ ...mono, fontSize: '13px', color: fn.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 0' }}>remove</button>
              )}
            </div>
          </div>
        ))}
        {(trail.steps || []).length === 0 && (
          <p style={{ ...body, fontSize: '15px', color: fn.ghost }}>No steps yet.</p>
        )}
      </div>

      {isOwner && (
        <div style={{ marginTop: space.xxl, background: fn.object, border: `1px dashed ${fn.mossEdge}`, borderRadius: '12px', padding: space.xl }}>
          <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: fn.ghost, display: 'block', marginBottom: space.md }}>
            Add a step
          </span>
          <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', marginBottom: space.sm }}>
            {KINDS.map(([v, l]) => (
              <button key={v} type="button" onClick={() => setKind(v)}
                style={{ ...mono, fontSize: '13px', letterSpacing: '0.08em', cursor: 'pointer',
                  background: kind === v ? fn.mossTint : 'transparent', color: fn.ink,
                  border: `1px ${kind === v ? 'solid' : 'dashed'} ${fn.mossEdge}`, borderRadius: '8px', padding: '6px 12px' }}>
                {l}
              </button>
            ))}
          </div>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="What is this step?"
            style={{ ...body, fontSize: '16px', color: fn.ink, width: '100%', boxSizing: 'border-box', background: fn.ground,
              border: `1px solid ${fn.mossEdge}`, borderRadius: '9px', padding: '10px 14px', outline: 'none', marginBottom: space.sm }} />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="A note on how (optional)"
            style={{ ...body, fontSize: '15px', color: fn.ink, width: '100%', boxSizing: 'border-box', background: fn.ground,
              border: `1px solid ${fn.mossEdge}`, borderRadius: '9px', padding: '10px 14px', outline: 'none', marginBottom: space.md }} />
          <div style={{ display: 'flex', gap: space.md, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={add} disabled={!label.trim() || busy} style={btn(!label.trim() || busy)}>
              {busy ? 'Adding…' : 'Add step'}
            </button>
            <label style={{ display: 'flex', gap: space.sm, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={trail.is_public} onChange={async e => { await setTrailPublic(id, e.target.checked); load() }} />
              <span style={{ ...body, fontSize: '15px', color: fn.meta }}>Publish · let others walk it</span>
            </label>
          </div>
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100dvh', background: fn.ground }}>
      <Nav />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(72px, 12vw, 120px) clamp(20px, 5vw, 40px) 100px' }}>
        {children}
      </div>
    </div>
  )
}
function btn(disabled) {
  return { ...mono, fontSize: '14px', letterSpacing: '0.10em', background: fn.moss, color: '#FFFFFF',
    border: '1px solid transparent', borderRadius: '10px', padding: '11px 20px',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }
}
