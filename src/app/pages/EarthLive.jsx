// src/app/pages/EarthLive.jsx
//
// The Earth Challenge, live. The constellation's public face: the beacon
// burning, events as they happen, the organisations and challenges in the
// field, and the arc to the shared close. Public, no auth; polls every 45s
// so a returning visitor always finds it moving. Watching is the invitation.
//
// Identity policy: people appear as first name plus initial (formatted
// server-side); organisations appear as themselves.

import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { serif, sc, body } from '../../lib/designTokens'
import BeaconFire from '../components/challenge/BeaconFire'

const NIGHT    = '#141B2C'
const NIGHT2   = '#0F1523'
const CREAM    = '#FBF8F0'
const CREAM_80 = 'rgba(251,248,240,0.82)'
const CREAM_60 = 'rgba(251,248,240,0.60)'
const AMBER    = '#F2C45A'
const GOLD_T   = '#D7A24A'
const HAIR     = '1px solid rgba(242,196,90,0.26)'

const ROOT_SLUG = 'nextus-earth-challenge'

function fmtDate(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y) return null
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
function daysUntil(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  return Math.max(0, Math.ceil((new Date(y, m - 1, d, 23, 59, 59).getTime() - Date.now()) / 86400000))
}
function ago(at) {
  const s = Math.max(0, (Date.now() - new Date(at).getTime()) / 1000)
  if (s < 90) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}
function pct(opens, closes) {
  if (!opens || !closes) return 0
  const a = new Date(opens).getTime(), b = new Date(closes).getTime()
  if (b <= a) return 0
  return Math.min(100, Math.max(0, ((Date.now() - a) / (b - a)) * 100))
}

const K = ({ children }) => (
  <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD_T, margin: '34px 0 12px' }}>
    {children}
  </div>
)

export default function EarthLive() {
  const [tally, setTally] = useState(null)
  const [feed, setFeed] = useState(null)
  const timer = useRef(null)

  async function load() {
    try {
      const [tRes, aRes] = await Promise.all([
        fetch('/api/beacon', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', slug: 'founding-nature' }) }),
        fetch('/api/actor-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'constellation_activity', limit: 12 }) }),
      ])
      const t = await tRes.json()
      const a = await aRes.json()
      if (t && t.rooted) setTally(t)
      if (a) setFeed(a)
    } catch (_) {}
  }
  useEffect(() => {
    load()
    timer.current = setInterval(() => { if (!document.hidden) load() }, 45000)
    return () => clearInterval(timer.current)
  }, [])

  const closes = feed?.beacon?.closes_on || tally?.closes_on || null
  const closeStr = fmtDate(closes)
  const days = daysUntil(closes)
  const events = feed?.events || []
  const challenges = feed?.field?.challenges || []
  const orgs = feed?.field?.orgs || []

  return (
    <div style={{ background: NIGHT2, minHeight: '100dvh' }}>
      <Nav />
      {/* hero */}
      <div style={{ textAlign: 'center', padding: '34px 20px 8px',
        background: `radial-gradient(ellipse at 50% 0%, rgba(242,196,90,0.10), transparent 62%)` }}>
        <div style={{ maxWidth: '230px', margin: '0 auto 4px' }}>
          <BeaconFire sparks={Number(tally?.sparks || 0)} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', ...sc, fontSize: '13px',
          letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD_T,
          border: '1px solid rgba(242,196,90,0.4)', borderRadius: '20px', padding: '6px 16px' }}>
          <span className="el-pulse" style={{ width: '9px', height: '9px', borderRadius: '50%', background: AMBER }} />
          Live
        </div>
        <style>{`
          .el-pulse { animation: elPulse 1.6s ease-in-out infinite; }
          @keyframes elPulse { 0%,100% { opacity: .5; transform: scale(.85); } 50% { opacity: 1; transform: scale(1.1); } }
          @media (prefers-reduced-motion: reduce) { .el-pulse { animation: none; } }
        `}</style>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: '34px', color: CREAM, margin: '12px 0 2px', lineHeight: 1.1 }}>
          The Earth Challenge, right now
        </h1>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: CREAM_60, marginTop: '6px' }}>
          {tally
            ? <>
                <b style={{ ...serif, fontSize: '20px', color: CREAM, letterSpacing: 0, fontWeight: 300 }}>{Number(tally.sparks || 0).toLocaleString()}</b> sparks
                {' · '}<b style={{ ...serif, fontSize: '20px', color: CREAM, letterSpacing: 0, fontWeight: 300 }}>{Number(tally.people || 0).toLocaleString()}</b> people
                {' · '}<b style={{ ...serif, fontSize: '20px', color: CREAM, letterSpacing: 0, fontWeight: 300 }}>{Number(tally.challenges || 0).toLocaleString()}</b> challenges
              </>
            : 'The beacon is lit.'}
        </div>
        {feed && feed.sparks_today > 0 && (
          <div style={{ ...body, fontSize: '15px', color: CREAM_80, marginTop: '10px' }}>
            <b style={{ ...serif, fontSize: '19px', color: AMBER, fontWeight: 300 }}>{feed.sparks_today}</b> sparks today, and counting
          </div>
        )}
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 18px 70px' }}>

        {/* NOW */}
        {events.length > 0 && (
          <>
            <K>Now · as it happens</K>
            <div style={{ border: HAIR, borderRadius: '14px', overflow: 'hidden' }}>
              {events.slice(0, 8).map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'baseline',
                  padding: '12px 16px', borderBottom: i < Math.min(events.length, 8) - 1 ? 'rgba(242,196,90,0.12) 1px solid' : 'none' }}>
                  <span style={{ ...serif, fontSize: '18px', fontWeight: 400, whiteSpace: 'nowrap',
                    color: e.kind === 'spark' ? AMBER : CREAM }}>{e.name}</span>
                  <span style={{ ...body, fontSize: '15px', color: CREAM_80 }}>
                    {e.kind === 'spark' ? `checked in on ${e.title}`
                      : e.kind === 'join' ? `took on ${e.title}`
                      : `published ${e.title}`}
                  </span>
                  <span style={{ marginLeft: 'auto', ...sc, fontSize: '13px', letterSpacing: '0.08em', color: CREAM_60, whiteSpace: 'nowrap' }}>
                    {ago(e.at)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}


        {challenges.length > 0 && (
          <>
            <K>The challenges, alive</K>
            <div className="el-grid">
              <style>{`
                .el-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                @media (max-width: 600px) { .el-grid { grid-template-columns: 1fr; } }
              `}</style>
              {challenges.map((c) => (
                <Link key={c.call_id} to={c.slug ? `/stretch/c/${c.slug}` : '#'}
                  style={{ border: HAIR, borderRadius: '14px', padding: '15px 16px', textDecoration: 'none', display: 'block' }}>
                  <div style={{ ...serif, fontWeight: 400, fontSize: '20px', lineHeight: 1.2, color: CREAM }}>{c.title}</div>
                  <div style={{ ...body, fontSize: '13.5px', color: CREAM_60, margin: '3px 0 8px' }}>{c.actor_name || 'Community'}</div>
                  <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLD_T }}>
                    <b style={{ ...serif, color: CREAM, fontSize: '17px', letterSpacing: 0, fontWeight: 300 }}>{c.people}</b> in
                    {' · '}<b style={{ ...serif, color: CREAM, fontSize: '17px', letterSpacing: 0, fontWeight: 300 }}>{c.checkins}</b> sparks
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {orgs.length > 0 && (
          <>
            <K>Participating organisations</K>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {orgs.map((o, i) => (
                <Link key={i} to={o.slug ? `/org/${o.slug}` : '#'}
                  style={{ display: 'flex', gap: '9px', alignItems: 'center', textDecoration: 'none',
                    border: '1px solid rgba(242,196,90,0.3)', borderRadius: '24px',
                    padding: '7px 14px 7px 8px', ...body, fontSize: '14.5px', color: CREAM_80 }}>
                  {o.image_url
                    ? <img src={o.image_url} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
                    : <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(242,196,90,0.16)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', ...sc, fontSize: '13px', color: GOLD_T }}>
                        {(o.name || '?')[0]}
                      </span>}
                  {o.name}
                </Link>
              ))}
            </div>
          </>
        )}

        {/* THE ARC */}
        {closes && (
          <>
            <K>The arc · to the shared close</K>
            <div style={{ border: HAIR, borderRadius: '14px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', ...sc, fontSize: '13px',
                letterSpacing: '0.12em', textTransform: 'uppercase', color: CREAM_60 }}>
                <span>{feed?.beacon?.opens_on ? `Lit ${fmtDate(feed.beacon.opens_on)}` : 'Lit'}</span>
                <span>Closes {closeStr}{days != null ? ` · ${days} days left` : ''}</span>
              </div>
              <div style={{ height: '8px', borderRadius: '5px', background: 'rgba(251,248,240,0.1)', overflow: 'hidden', margin: '12px 0 2px' }}>
                <div style={{ height: '100%', borderRadius: '5px', width: `${pct(feed?.beacon?.opens_on, closes)}%`,
                  background: `linear-gradient(90deg, #C8922A, ${AMBER})` }} />
              </div>
            </div>
          </>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '38px' }}>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/stretch/c/${ROOT_SLUG}`}
              style={{ display: 'inline-block', ...sc, fontSize: '14px', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: '#1a1320', background: AMBER,
                borderRadius: '28px', padding: '14px 32px', textDecoration: 'none' }}>
              See the challenge →
            </Link>
            <Link to={`/stretch/c/${ROOT_SLUG}?accept=1`}
              style={{ display: 'inline-block', ...sc, fontSize: '14px', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: AMBER, background: 'transparent',
                border: '1px solid rgba(242,196,90,0.55)',
                borderRadius: '28px', padding: '13px 30px', textDecoration: 'none' }}>
              Accept the challenge →
            </Link>
          </div>
          <p style={{ ...body, fontSize: '14px', color: CREAM_60, marginTop: '10px' }}>
            Watching is free. Joining takes a minute.
          </p>
        </div>
      </div>
    </div>
  )
}
