// src/app/pages/ConstellationPage.jsx
//
// The public constellation landing — one shareable surface for a Horizon Goal.
// Composes the goal statement, the participation meter, the challenges
// laddering to it, and the founding organisations in the domain. The thing you
// point press and orgs at. Read signed-out.

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { tokens, serif, body, sc, at } from '../../lib/designTokens'
import { DOMAIN_COLORS } from '../../constants/domainColors'
import ConstellationMeter from '../components/challenge/ConstellationMeter'

function colourFor(domain, goalColour) {
  if (goalColour) return goalColour
  const entry = DOMAIN_COLORS[domain]
  return entry?.base || at.verdigris
}

function Eyebrow({ children, colour }) {
  return (
    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: colour, textTransform: 'uppercase', marginBottom: '10px' }}>
      {children}
    </div>
  )
}

function ShareButton({ title }) {
  const [copied, setCopied] = useState(false)
  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) { try { await navigator.share({ title, url }); return } catch { /* fall through */ } }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* noop */ }
  }
  return (
    <button type="button" onClick={share}
      style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: at.brass, background: 'rgba(217,178,74,0.08)', border: '1.5px solid rgba(217,178,74,0.78)', borderRadius: '30px', padding: '10px 22px', cursor: 'pointer' }}>
      {copied ? 'Link copied' : 'Share this constellation'}
    </button>
  )
}

function ChallengeCard({ c, colour }) {
  return (
    <Link to={c.slug ? `/stretch/c/${c.slug}` : '#'}
      style={{ textDecoration: 'none', display: 'block', background: at.object, border: `1.5px solid ${colour}`, borderRadius: '14px', padding: '18px 20px' }}>
      <div style={{ ...serif, fontWeight: 300, fontSize: '20px', color: at.text, lineHeight: 1.2 }}>{c.title}</div>
      {c.the_move && <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.7)', lineHeight: 1.55, margin: '6px 0 0' }}>{c.the_move}</p>}
      <div style={{ display: 'flex', gap: '14px', marginTop: '12px', ...sc, fontSize: '13px', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.55)' }}>
        {c.nextus_actors?.name && <span>{c.nextus_actors.name}</span>}
        {c.taken_on_count > 0 && <span style={{ color: at.brass }}>{c.taken_on_count.toLocaleString()} in</span>}
        {!c.parent_call_id && <span style={{ color: colour }}>root</span>}
      </div>
    </Link>
  )
}

function ActorCard({ a, colour }) {
  const portrait = a.type === 'practitioner'
  return (
    <Link to={a.slug ? `/org/${a.slug}` : '#'}
      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '13px', background: at.object, border: '1px solid rgba(217,178,74,0.18)', borderRadius: '12px', padding: '14px 16px' }}>
      {a.image_url
        ? <img src={a.image_url} alt={a.name} style={{ width: '42px', height: '42px', borderRadius: portrait ? '50%' : '8px', objectFit: 'cover', flexShrink: 0 }} />
        : <span style={{ width: '42px', height: '42px', borderRadius: portrait ? '50%' : '8px', flexShrink: 0, background: 'rgba(74,140,111,0.12)', border: `1.5px solid ${colour}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...sc, fontSize: '15px', color: colour }}>{(a.name || '?').slice(0, 1)}</span>}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', ...serif, fontWeight: 300, fontSize: '17px', color: at.text, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
        {a.tagline && <span style={{ display: 'block', ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.4, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.tagline}</span>}
      </span>
    </Link>
  )
}

function SectionLabel({ children }) {
  return <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', margin: '36px 0 14px' }}>{children}</div>
}

export function ConstellationPage() {
  const { domain } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!domain) return
    setLoading(true); setNotFound(false)
    fetch('/api/constellations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_constellation_page', domain }),
    })
      .then(r => r.json())
      .then(d => { if (d.goal) setData(d); else setNotFound(true) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [domain])

  if (loading) return <div className="loading" />
  if (notFound || !data) return (
    <div style={{ background: at.ground, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '120px 24px', textAlign: 'center' }}>
        <Eyebrow colour={at.brass}>Constellation not found</Eyebrow>
        <p style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.7 }}>
          No constellation exists for that domain yet.
        </p>
      </div>
    </div>
  )

  const { goal, actors, calls } = data
  const colour = colourFor(domain, goal.colour)

  return (
    <div style={{ background: at.ground, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,40px) 100px' }}>

        {/* Hero */}
        <Eyebrow colour={colour}>The Founding {goal.label} Constellation</Eyebrow>
        <h1 style={{ ...serif, fontSize: 'clamp(1.9rem,5vw,3rem)', fontWeight: 300, color: at.text, lineHeight: 1.15, margin: '0 0 16px' }}>
          {goal.goal_text}
        </h1>
        <p style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.7)', lineHeight: 1.7, margin: '0 0 20px' }}>
          One shared Horizon Goal. Many organisations, each carrying their own piece of it, the small work feeding the whole.
        </p>
        <ShareButton title={`The ${goal.label} Constellation · NextUs`} />

        {/* The whole rising from the parts */}
        <ConstellationMeter domain={domain} colour={colour} />

        {/* Challenges */}
        {calls.length > 0 && (
          <>
            <SectionLabel>Challenges in this constellation</SectionLabel>
            <div style={{ display: 'grid', gap: '12px' }}>
              {calls.map(c => <ChallengeCard key={c.id} c={c} colour={colour} />)}
            </div>
          </>
        )}

        {/* Founding organisations */}
        {actors.length > 0 && (
          <>
            <SectionLabel>The organisations building it</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {actors.map(a => <ActorCard key={a.id} a={a} colour={colour} />)}
            </div>
          </>
        )}

        {calls.length === 0 && actors.length === 0 && (
          <p style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginTop: '36px' }}>
            This constellation is just forming. Organisations and challenges appear here as they join.
          </p>
        )}
      </div>
    </div>
  )
}
