// src/app/pages/NorthStar.jsx
//
// BP-18 · The North Star surface — the whole-life synthesis, near The Map. It
// holds one owner-authored line (verbatim), reflects the drive/recovery rhythm
// from the accrual ledger, and shows the declared horizon it all points at.
// A mirror of rhythm, never a score of the person. Field Notes rail.
// Route: /north-star.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { fn, space } from '../../lib/designTokens'
import { getNorthStar, saveNorthStar, getBalance, getLedger } from '../lib/horizonActions'
import { getMyHorizonDeclaration } from '../lib/horizonDeclaration'

const display = { fontFamily: "'Fraunces', Georgia, serif" }
const body    = { fontFamily: "'Newsreader', Georgia, serif" }
const mono    = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }

export default function NorthStarPage() {
  const { user } = useAuth()
  const [line, setLine]       = useState('')
  const [saved, setSaved]     = useState(null)
  const [horizon, setHorizon] = useState(null)
  const [balance, setBalance] = useState({ drive: 0, recovery: 0 })
  const [ledger, setLedger]   = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState(false)

  useEffect(() => {
    let live = true
    if (user === null) { setLoading(false); return }
    if (!user) return
    Promise.all([getNorthStar(), getMyHorizonDeclaration(), getBalance(), getLedger(20)])
      .then(([ns, hz, bal, led]) => {
        if (!live) return
        if (ns) { setSaved(ns); setLine(ns.synthesis) }
        setHorizon(hz?.line || null); setBalance(bal); setLedger(led); setLoading(false)
      })
    return () => { live = false }
  }, [user])

  async function save() {
    if (!line.trim() || busy) return
    setBusy(true)
    try { const ns = await saveNorthStar(line); setSaved(ns) }
    catch (e) { alert(e.message) } finally { setBusy(false) }
  }

  const total = balance.drive + balance.recovery
  const drivePct = total ? Math.round((balance.drive / total) * 100) : 0

  return (
    <div style={{ minHeight: '100dvh', background: fn.ground }}>
      <Nav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'clamp(72px, 12vw, 120px) clamp(20px, 5vw, 40px) 100px' }}>
        <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.20em', textTransform: 'uppercase', color: fn.ghost, marginBottom: space.md }}>
          North Star
        </div>
        <h1 style={{ ...display, fontWeight: 400, fontSize: 'clamp(28px, 6vw, 40px)', color: fn.ink, lineHeight: 1.2, margin: `0 0 ${space.sm}` }}>
          The whole of it, in one line.
        </h1>

        {user === null && <Link to="/login?redirect=/north-star" style={btn()}>Sign in →</Link>}
        {user && loading && <p style={{ ...body, color: fn.meta }}>Loading…</p>}

        {user && !loading && (
          <>
            {horizon && (
              <p style={{ ...body, fontStyle: 'italic', fontSize: '17px', color: fn.meta, margin: `${space.sm} 0 ${space.xl}` }}>
                pointing at &ldquo;{horizon}&rdquo;
              </p>
            )}

            <label style={{ display: 'block', marginTop: space.lg }}>
              <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: fn.moss, display: 'block', marginBottom: space.sm }}>
                My North Star
              </span>
              <textarea value={line} onChange={e => setLine(e.target.value.replace(/\n/g, ' '))} rows={2} maxLength={280}
                placeholder="The life this is all in service of."
                style={{ ...body, fontStyle: 'italic', fontSize: '20px', color: fn.ink, width: '100%', boxSizing: 'border-box',
                  background: fn.object, border: `1px solid ${fn.mossEdge}`, borderRadius: '12px', padding: '16px 18px', lineHeight: 1.5, resize: 'none', outline: 'none' }} />
            </label>
            <button type="button" onClick={save} disabled={!line.trim() || busy} style={{ ...btn(!line.trim() || busy), marginTop: space.md }}>
              {busy ? 'Saving…' : saved && saved.synthesis === line.trim() ? 'Saved ✓' : 'Hold this'}
            </button>

            {/* Rhythm · drive & recovery, both honoured. Not a score. */}
            <section style={{ marginTop: space.xxxl }}>
              <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: fn.ghost, marginBottom: space.sm }}>
                Your rhythm · last 30 days
              </div>
              {total === 0 ? (
                <p style={{ ...body, fontSize: '15px', color: fn.ghost }}>
                  Nothing logged yet. Real steps · from check-ins and, soon, from Daily and Stretch · gather here.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${fn.mossEdge}` }}>
                    <div style={{ width: `${drivePct}%`, background: fn.moss }} />
                    <div style={{ width: `${100 - drivePct}%`, background: fn.clayTint }} />
                  </div>
                  <p style={{ ...body, fontSize: '14px', color: fn.meta, marginTop: space.sm }}>
                    {balance.drive} forward · {balance.recovery} in recovery. Both are real.
                  </p>
                </>
              )}
            </section>

            {ledger.length > 0 && (
              <section style={{ marginTop: space.xl }}>
                <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: fn.ghost, marginBottom: space.sm }}>
                  Recent steps
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {ledger.map(a => (
                    <div key={a.id} style={{ ...body, fontSize: '14px', color: fn.meta, display: 'flex', gap: space.md }}>
                      <span style={{ ...mono, fontSize: '13px', color: a.kind === 'recovery' ? fn.clay : fn.moss, minWidth: '72px' }}>
                        {a.kind === 'recovery' ? 'recovery' : 'forward'}
                      </span>
                      <span>{a.source || 'a step'}{a.domain ? ` · ${a.domain}` : ''}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function btn(disabled) {
  return { display: 'inline-block', ...mono, fontSize: '14px', letterSpacing: '0.10em', textDecoration: 'none',
    background: fn.moss, color: '#FFFFFF', border: '1px solid transparent', borderRadius: '10px',
    padding: '12px 22px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1 }
}
