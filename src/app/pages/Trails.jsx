// src/app/pages/Trails.jsx
//
// BP-16 · Trails index — your walkable routes toward a horizon, and a way to
// start one from the horizon you declared. Field Notes rail. Route: /trails.

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { fn, space } from '../../lib/designTokens'
import { getMyTrails, createTrail } from '../lib/trails'
import { getMyHorizonDeclaration } from '../lib/horizonDeclaration'

const display = { fontFamily: "'Fraunces', Georgia, serif" }
const body    = { fontFamily: "'Newsreader', Georgia, serif" }
const mono    = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }

export default function TrailsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [trails, setTrails] = useState([])
  const [horizon, setHorizon] = useState(null)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    if (user === null) { setLoading(false); return }
    if (!user) return
    Promise.all([getMyTrails(), getMyHorizonDeclaration()]).then(([t, h]) => {
      if (!live) return
      setTrails(t); setHorizon(h?.line || null); setLoading(false)
    })
    return () => { live = false }
  }, [user])

  async function start() {
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      const id = await createTrail({ title: title.trim(), horizonText: horizon })
      navigate(`/trail/${id}`)
    } catch (e) { alert(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100dvh', background: fn.ground }}>
      <Nav />
      <div style={{ maxWidth: '720px', margin: '0 auto',
        padding: 'clamp(72px, 12vw, 120px) clamp(20px, 5vw, 40px) 100px' }}>
        <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.20em',
          textTransform: 'uppercase', color: fn.ghost, marginBottom: space.md }}>Trails</div>
        <h1 style={{ ...display, fontWeight: 400, fontSize: 'clamp(28px, 6vw, 40px)',
          color: fn.ink, lineHeight: 1.2, margin: `0 0 ${space.sm}` }}>
          How someone real is getting there.
        </h1>
        <p style={{ ...body, fontSize: '16px', color: fn.meta, lineHeight: 1.6, margin: `0 0 ${space.xxl}` }}>
          A trail is the practices, challenges and stretches you assembled toward your
          horizon. Publish it and someone with a rhyming horizon can walk and adapt it.
        </p>

        {user === null && <Link to="/login?redirect=/trails" style={btn()}>Sign in →</Link>}
        {user && loading && <p style={{ ...body, color: fn.meta }}>Loading…</p>}

        {user && !loading && (
          <>
            {horizon && (
              <div style={{ background: fn.object, border: `1px solid ${fn.mossEdge}`, borderRadius: '12px',
                padding: `${space.md} ${space.lg}`, marginBottom: space.xl }}>
                <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: fn.moss }}>Toward</span>
                <p style={{ ...body, fontStyle: 'italic', fontSize: '17px', color: fn.ink, margin: '4px 0 0' }}>{horizon}</p>
              </div>
            )}

            {trails.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, marginBottom: space.xxl }}>
                {trails.map(t => (
                  <Link key={t.id} to={`/trail/${t.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: fn.object, border: `1px solid ${fn.mossEdge}`, borderRadius: '12px', padding: `${space.md} ${space.lg}` }}>
                      <div style={{ ...display, fontSize: '20px', color: fn.ink }}>{t.title}</div>
                      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', color: fn.ghost, marginTop: '4px' }}>
                        {t.is_public ? 'Published · walkable' : 'Private draft'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div style={{ background: fn.object, border: `1px dashed ${fn.mossEdge}`, borderRadius: '12px', padding: space.xl }}>
              <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.10em', color: fn.meta, display: 'block', marginBottom: '6px' }}>
                Start a trail
              </span>
              <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Name this route"
                  style={{ ...body, fontSize: '16px', color: fn.ink, flex: '1 1 220px', background: fn.ground,
                    border: `1px solid ${fn.mossEdge}`, borderRadius: '9px', padding: '10px 14px', outline: 'none' }} />
                <button type="button" onClick={start} disabled={!title.trim() || busy} style={btn(!title.trim() || busy)}>
                  {busy ? 'Starting…' : 'Begin →'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: space.xl }}>
              <Link to="/boards" style={{ ...mono, fontSize: '13px', letterSpacing: '0.10em', color: fn.moss, textDecoration: 'none' }}>
                Open your boards →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function btn(disabled) {
  return { ...mono, fontSize: '14px', letterSpacing: '0.10em', textDecoration: 'none',
    background: fn.moss, color: '#FFFFFF', border: '1px solid transparent', borderRadius: '10px',
    padding: '11px 20px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
    display: 'inline-block' }
}
