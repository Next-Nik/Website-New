// src/app/pages/HorizonDeclare.jsx
//
// BP-8 · The declaration screen. Its own screen, its own weight — this is
// meant to feel like stepping forward, not filling in a field. One line,
// opt-in, verbatim: "My horizon: …", the future the person is moving toward.
//
// Field Notes rail (personal, daylight). No Map data is ever read in here —
// the line comes from the person and nowhere else. Route: /horizon/declare
// (registered in App.jsx).

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { fn, space } from '../../lib/designTokens'
import {
  getMyHorizonDeclaration,
  saveHorizonDeclaration,
  setHorizonCommunalVisible,
  HORIZON_MAX,
} from '../lib/horizonDeclaration'

const display = { fontFamily: "'Fraunces', Georgia, serif" }
const body    = { fontFamily: "'Newsreader', Georgia, serif" }
const mono    = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }

export default function HorizonDeclarePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // When you arrive here by tapping a horizon you already have (declared,
  // or drawn from your Map), that line is passed in so this screen opens on
  // your words to refine — not a blank field.
  const prefill = location.state?.prefill || null

  const [existing, setExisting] = useState(null)   // current declaration or null
  const [loading, setLoading]   = useState(true)
  const [line, setLine]         = useState('')
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState(null)
  const [justDeclared, setJustDeclared] = useState(false)
  const [communal, setCommunal] = useState(false)

  useEffect(() => {
    let live = true
    if (user === null) { setLoading(false); return }   // resolved signed-out
    if (!user) return                                   // still resolving
    ;(async () => {
      const d = await getMyHorizonDeclaration()
      if (!live) return
      if (d) { setExisting(d); setLine(d.line); setCommunal(!!d.communal_visible) }
      else if (prefill) { setLine(prefill) }   // seed with the Map horizon to refine
      setLoading(false)
    })()
    return () => { live = false }
  }, [user])

  async function declare() {
    setBusy(true); setErr(null)
    try {
      const saved = await saveHorizonDeclaration(line)
      setExisting(saved)
      setJustDeclared(true)
    } catch (e) {
      setErr(e.message || 'Could not save that just now.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleCommunal(next) {
    setCommunal(next)
    try { await setHorizonCommunalVisible(next) }
    catch (_) { setCommunal(!next) }   // revert on failure
  }

  const remaining = HORIZON_MAX - line.trim().length
  const canDeclare = line.trim().length > 0 && remaining >= 0 && !busy

  return (
    <div style={{ minHeight: '100dvh', background: fn.ground }}>
      <Nav />
      <div style={{ maxWidth: '640px', margin: '0 auto',
        padding: 'clamp(72px, 12vw, 120px) clamp(20px, 5vw, 40px) 120px' }}>

        <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.20em',
          textTransform: 'uppercase', color: fn.ghost, marginBottom: space.lg }}>
          Your horizon
        </div>

        {loading && (
          <p style={{ ...body, fontSize: '16px', color: fn.meta }}>Loading…</p>
        )}

        {!loading && user === null && (
          <div>
            <h1 style={{ ...display, fontWeight: 400, fontSize: 'clamp(28px, 6vw, 40px)',
              color: fn.ink, lineHeight: 1.2, margin: `0 0 ${space.lg}` }}>
              Declaring a horizon starts with signing in.
            </h1>
            <p style={{ ...body, fontSize: '17px', color: fn.meta, lineHeight: 1.6,
              margin: `0 0 ${space.xl}` }}>
              This line is yours · kept to your account, in your own words.
            </p>
            <Link to="/login?redirect=/horizon/declare" style={primaryBtn()}>
              Sign in →
            </Link>
          </div>
        )}

        {/* The declaration itself, or the confirmed state after declaring. */}
        {!loading && user && !justDeclared && (
          <div>
            <h1 style={{ ...display, fontWeight: 400, fontSize: 'clamp(28px, 6vw, 42px)',
              color: fn.ink, lineHeight: 1.18, margin: `0 0 ${space.md}` }}>
              {existing ? 'Your horizon' : 'Name the future you are moving toward.'}
            </h1>
            <p style={{ ...body, fontSize: '17px', color: fn.meta, lineHeight: 1.6,
              margin: `0 0 ${space.xxl}` }}>
              One line. It is kept exactly as you write it, and it stays yours —
              nothing here fills it in for you.
            </p>

            <label style={{ display: 'block' }}>
              <span style={{ ...display, fontSize: '22px',
                color: fn.moss, display: 'block', marginBottom: space.sm }}>
                My horizon:
              </span>
              <textarea
                value={line}
                onChange={e => setLine(e.target.value.replace(/\n/g, ' '))}
                maxLength={HORIZON_MAX + 40}
                rows={2}
                autoFocus
                placeholder="…the world I am working toward."
                style={{ ...body, fontStyle: 'italic', fontSize: '20px', color: fn.ink,
                  width: '100%', boxSizing: 'border-box', background: fn.object,
                  border: `1px solid ${fn.mossEdge}`, borderRadius: '12px',
                  padding: '16px 18px', lineHeight: 1.5, resize: 'none', outline: 'none' }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginTop: space.md, gap: space.md, flexWrap: 'wrap' }}>
              <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.08em',
                color: remaining < 0 ? fn.clay : fn.ghost }}>
                {remaining} left
              </span>
              <button type="button" onClick={declare} disabled={!canDeclare}
                style={primaryBtn(!canDeclare)}>
                {busy ? 'Stepping forward…' : existing ? 'Update my horizon →' : 'Step forward →'}
              </button>
            </div>

            {err && (
              <p style={{ ...body, fontSize: '14px', color: fn.clay, marginTop: space.md }}>
                {err}
              </p>
            )}
          </div>
        )}

        {!loading && user && justDeclared && existing && (
          <div>
            <h1 style={{ ...display, fontWeight: 400, fontSize: 'clamp(26px, 5vw, 36px)',
              color: fn.ink, lineHeight: 1.2, margin: `0 0 ${space.lg}` }}>
              Declared.
            </h1>
            <div style={{ background: fn.object, border: `1px solid ${fn.mossEdge}`,
              borderRadius: '12px', padding: `${space.xl} ${space.xl}`,
              marginBottom: space.xl }}>
              <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.16em',
                textTransform: 'uppercase', color: fn.moss, marginBottom: space.sm }}>
                My horizon
              </div>
              <p style={{ ...body, fontStyle: 'italic', fontSize: '21px', color: fn.ink,
                lineHeight: 1.5, margin: 0 }}>
                {existing.line}
              </p>
            </div>

            <p style={{ ...body, fontSize: '16px', color: fn.meta, lineHeight: 1.6,
              margin: `0 0 ${space.lg}` }}>
              From here on, each real step you take reads as a step toward this.
            </p>

            {/* Communal opt-in · off by default. Even when on, the app keeps
                communal display behind a flag until it is switched on. */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: space.sm,
              cursor: 'pointer', marginBottom: space.xxl }}>
              <input type="checkbox" checked={communal}
                onChange={e => toggleCommunal(e.target.checked)}
                style={{ marginTop: '4px' }} />
              <span style={{ ...body, fontSize: '15px', color: fn.meta, lineHeight: 1.5 }}>
                Let others see this horizon when NextUs shows horizons communally.
                Off keeps it to your own rail.
              </span>
            </label>

            <div style={{ display: 'flex', gap: space.md, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => navigate('/mission-control')}
                style={primaryBtn()}>
                Back to Mission Control →
              </button>
              <button type="button" onClick={() => setJustDeclared(false)}
                style={ghostBtn()}>
                Refine the wording
              </button>
            </div>

            {/* Both a trail and a board hang off the declaration (BP-16) · the
                route toward this horizon, and its three time-layers. */}
            <div style={{ display: 'flex', gap: space.lg, flexWrap: 'wrap', marginTop: space.xl }}>
              <Link to="/trails" style={{ ...mono, fontSize: '13px', letterSpacing: '0.10em',
                color: fn.moss, textDecoration: 'none' }}>
                Build a trail toward it →
              </Link>
              <Link to="/boards" style={{ ...mono, fontSize: '13px', letterSpacing: '0.10em',
                color: fn.moss, textDecoration: 'none' }}>
                Open your boards →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function primaryBtn(disabled) {
  return {
    display: 'inline-block', ...mono, fontSize: '14px', letterSpacing: '0.10em',
    textDecoration: 'none', background: fn.moss, color: '#FFFFFF',
    border: '1px solid transparent', borderRadius: '10px', padding: '12px 22px',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
  }
}
function ghostBtn() {
  return {
    display: 'inline-block', ...mono, fontSize: '14px', letterSpacing: '0.10em',
    background: 'transparent', color: fn.ink, border: `1px dashed ${fn.mossEdge}`,
    borderRadius: '10px', padding: '12px 22px', cursor: 'pointer',
  }
}
