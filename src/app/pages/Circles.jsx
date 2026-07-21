// src/app/pages/Circles.jsx
//
// BP-14 · "Your circles" — the index. Lists the circles you are in and lets
// you start one. A circle is not a community: small by design, member-only,
// confidential. Field Notes rail (personal, daylight). Route: /circles.

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { fn, space } from '../../lib/designTokens'
import { listMyCohorts, createCohort } from '../lib/cohorts'

const display = { fontFamily: "'Fraunces', Georgia, serif" }
const body    = { fontFamily: "'Newsreader', Georgia, serif" }
const mono    = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }

export default function CirclesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [circles, setCircles] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [name, setName] = useState('')
  const [temperament, setTemperament] = useState('kin')
  const [governance, setGovernance] = useState('stewarded')
  const [sizeCap, setSizeCap] = useState(12)
  const [cadence, setCadence] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let live = true
    if (user === null) { setLoading(false); return }
    if (!user) return
    listMyCohorts().then(c => { if (live) { setCircles(c); setLoading(false) } })
    return () => { live = false }
  }, [user])

  async function create() {
    if (!name.trim() || busy) return
    setBusy(true); setErr(null)
    try {
      const id = await createCohort({ name: name.trim(), temperament, governance, sizeCap: Number(sizeCap) || 12, cadence: cadence.trim() || null })
      navigate(`/circles/${id}`)
    } catch (e) { setErr(e.message || 'Could not start the circle.') }
    finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100dvh', background: fn.ground }}>
      <Nav />
      <div style={{ maxWidth: '720px', margin: '0 auto',
        padding: 'clamp(72px, 12vw, 120px) clamp(20px, 5vw, 40px) 100px' }}>

        <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.20em',
          textTransform: 'uppercase', color: fn.ghost, marginBottom: space.md }}>
          Your circles
        </div>
        <h1 style={{ ...display, fontWeight: 400, fontSize: 'clamp(28px, 6vw, 40px)',
          color: fn.ink, lineHeight: 1.2, margin: `0 0 ${space.sm}` }}>
          The room where a few keep each other close.
        </h1>
        <p style={{ ...body, fontSize: '16px', color: fn.meta, lineHeight: 1.6,
          margin: `0 0 ${space.xxl}` }}>
          Small and member-only. What is said here stays here · a circle is not a
          community, and never appears on a public surface.
        </p>

        {user === null && (
          <Link to="/login?redirect=/circles" style={btn()}>Sign in to see your circles →</Link>
        )}

        {user && loading && <p style={{ ...body, color: fn.meta }}>Loading…</p>}

        {user && !loading && (
          <>
            {circles.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, marginBottom: space.xxl }}>
                {circles.map(c => (
                  <Link key={c.id} to={`/circles/${c.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: fn.object, border: `1px solid ${fn.mossEdge}`,
                      borderRadius: '12px', padding: `${space.lg} ${space.xl}` }}>
                      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: fn.moss, marginBottom: '4px' }}>
                        {c.temperament === 'cause' ? 'Cause circle' : 'Kin circle'}
                        {c.myRole === 'steward' ? ' · you steward' : ''}
                      </div>
                      <div style={{ ...display, fontSize: '22px', color: fn.ink }}>{c.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ ...body, fontSize: '16px', color: fn.meta, marginBottom: space.xxl }}>
                No circles yet. Start one below, or wait to be passed the flame.
              </p>
            )}

            {!creating ? (
              <button type="button" onClick={() => setCreating(true)} style={ghost()}>
                + Start a circle
              </button>
            ) : (
              <div style={{ background: fn.object, border: `1px solid ${fn.mossEdge}`,
                borderRadius: '12px', padding: space.xl }}>
                <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.16em',
                  textTransform: 'uppercase', color: fn.ghost, marginBottom: space.lg }}>
                  The charter
                </div>

                <Field label="Name">
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="NextMen · Tuesday" style={input()} />
                </Field>

                <Field label="Temperament">
                  <Choice value={temperament} onChange={setTemperament}
                    options={[['kin', 'Kin · who you are'], ['cause', 'Cause · what you are for']]} />
                </Field>

                <Field label="Governance">
                  <Choice value={governance} onChange={setGovernance}
                    options={[['stewarded', 'Stewarded · invites through the steward'], ['open', 'Open · any member may invite']]} />
                </Field>

                <Field label="Size cap (a circle, not a crowd)">
                  <input type="number" min={2} max={60} value={sizeCap}
                    onChange={e => setSizeCap(e.target.value)} style={{ ...input(), width: '100px' }} />
                </Field>

                <Field label="Cadence (optional)">
                  <input value={cadence} onChange={e => setCadence(e.target.value)}
                    placeholder="Weekly · Sunday evenings" style={input()} />
                </Field>

                {err && <p style={{ ...body, fontSize: '14px', color: fn.clay }}>{err}</p>}

                <div style={{ display: 'flex', gap: space.md, marginTop: space.md }}>
                  <button type="button" onClick={create} disabled={!name.trim() || busy} style={btn(!name.trim() || busy)}>
                    {busy ? 'Starting…' : 'Start the circle →'}
                  </button>
                  <button type="button" onClick={() => setCreating(false)} style={ghost()}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: '18px' }}>
      <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.10em', color: fn.meta,
        display: 'block', marginBottom: '6px' }}>{label}</span>
      {children}
    </label>
  )
}
function Choice({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          style={{ ...body, fontSize: '15px', textAlign: 'left', cursor: 'pointer',
            background: value === v ? fn.mossTint : 'transparent',
            color: fn.ink, border: `1px ${value === v ? 'solid' : 'dashed'} ${fn.mossEdge}`,
            borderRadius: '9px', padding: '10px 14px' }}>
          {value === v ? '● ' : '○ '}{l}
        </button>
      ))}
    </div>
  )
}
function input() {
  return { fontFamily: "'Newsreader', Georgia, serif", fontSize: '16px', color: fn.ink,
    width: '100%', boxSizing: 'border-box', background: fn.ground,
    border: `1px solid ${fn.mossEdge}`, borderRadius: '9px', padding: '10px 14px', outline: 'none' }
}
function btn(disabled) {
  return { display: 'inline-block', ...mono, fontSize: '14px', letterSpacing: '0.10em',
    textDecoration: 'none', background: fn.moss, color: '#FFFFFF', border: '1px solid transparent',
    borderRadius: '10px', padding: '12px 22px', cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1 }
}
function ghost() {
  return { display: 'inline-block', ...mono, fontSize: '14px', letterSpacing: '0.10em',
    background: 'transparent', color: fn.ink, border: `1px dashed ${fn.mossEdge}`,
    borderRadius: '10px', padding: '12px 22px', cursor: 'pointer' }
}
