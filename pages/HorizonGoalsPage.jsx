// src/app/pages/HorizonGoalsPage.jsx
// Phase E — Horizon Goal objects as browsable Atlas anchors.
//
// Route: /atlas/goals  (and /atlas/goals/:domain for individual goal pages)
//
// The seven Horizon Goals are the destination anchors of the Atlas — every
// actor, challenge, and constellation aligns to one. This page makes them
// browsable: the full goal text, how many actors are aligned, active
// challenges pointing here, and the constellations forming around it.

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Nav }   from '../../components/Nav'
import { tokens, serif, body, sc } from '../../lib/designTokens'

const gold  = '#26302A'
const GOLD_C = '#6E7F5C'
const dark  = '#0F1523'
const parch = '#FAFAF7'
const hair  = '1px solid rgba(110,127,92,0.18)'
const muted = 'rgba(15,21,35,0.72)'

function Eyebrow({ children, style = {} }) {
  return <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold, textTransform: 'uppercase', marginBottom: '8px', ...style }}>{children}</div>
}

// ─── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({ goal }) {
  return (
    <Link to={`/atlas/goals/${goal.domain}`}
      style={{ display: 'block', padding: '22px 24px', background: '#FFFFFF', border: hair, borderRadius: '12px', borderLeft: `4px solid ${goal.colour || GOLD_C}`, textDecoration: 'none', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,21,35,0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: goal.colour || gold, marginBottom: '6px', textTransform: 'uppercase' }}>
        {goal.label}
      </div>
      <p style={{ ...body, fontSize: '1.0625rem', color: dark, lineHeight: 1.65, margin: '0 0 12px' }}>
        {goal.goal_text}
      </p>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {goal.actor_count > 0 && (
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)' }}>
            {goal.actor_count} actor{goal.actor_count === 1 ? '' : 's'}
          </span>
        )}
        {goal.constellation_count > 0 && (
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)' }}>
            {goal.constellation_count} constellation{goal.constellation_count === 1 ? '' : 's'}
          </span>
        )}
        {goal.challenge_count > 0 && (
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)' }}>
            {goal.challenge_count} challenge{goal.challenge_count === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </Link>
  )
}

// ─── Goal detail page ─────────────────────────────────────────────────────────

function GoalDetail({ domain }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/constellations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_goal', domain }) })
      .then(r => r.json())
      .then(d => { if (d.goal) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [domain])

  if (loading) return <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', padding: '80px 0', textAlign: 'center' }}>Loading…</div>
  if (!data) return <div style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)', padding: '80px 0', textAlign: 'center' }}>Goal not found.</div>

  const { goal, actors, calls } = data
  const colour = goal.colour || GOLD_C

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <Link to="/atlas/goals" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none' }}>← All Horizon Goals</Link>
      </div>
      <div style={{ borderLeft: `4px solid ${colour}`, paddingLeft: '20px', marginBottom: '32px' }}>
        <Eyebrow style={{ color: colour }}>{goal.label}</Eyebrow>
        <p style={{ ...body, fontSize: 'clamp(1.125rem,2.5vw,1.375rem)', color: dark, lineHeight: 1.65, margin: 0, maxWidth: '680px' }}>
          {goal.goal_text}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '36px' }}>
        {[
          { l: 'Actors aligned',    v: goal.actor_count        },
          { l: 'Constellations',    v: goal.constellation_count },
          { l: 'Active challenges', v: goal.challenge_count     },
        ].map(c => (
          <div key={c.l} style={{ padding: '16px 18px', background: '#FFF', border: hair, borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ ...serif, fontSize: '2rem', fontWeight: 300, color: dark }}>{c.v || 0}</div>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginTop: '2px' }}>{c.l}</div>
          </div>
        ))}
      </div>

      {actors.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <Eyebrow>Actors building toward this</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '10px' }}>
            {actors.map(a => (
              <Link key={a.id} to={`/org/${a.slug || a.id}`}
                style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 14px', background: '#FFF', border: hair, borderRadius: '8px', textDecoration: 'none', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(110,127,92,0.5)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(110,127,92,0.18)'}>
                {a.image_url && <img src={a.image_url} alt={a.name} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...body, fontSize: '14px', color: dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                  {a.tagline && <div style={{ ...body, fontSize: '13px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.tagline}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {calls.length > 0 && (
        <div>
          <Eyebrow>Challenges and asks aligned here</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {calls.map(c => (
              <Link key={c.id} to={`/stretch/c/${c.slug}`}
                style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '14px 16px', background: '#FFF', border: hair, borderRadius: '8px', textDecoration: 'none', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(110,127,92,0.5)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(110,127,92,0.18)'}>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: c.type === 'ask' ? '#5F8DAA' : gold, background: c.type === 'ask' ? 'rgba(95,141,170,0.08)' : 'rgba(110,127,92,0.08)', borderRadius: '12px', padding: '3px 10px', flexShrink: 0, marginTop: '2px' }}>
                  {c.type === 'ask' ? 'Ask' : 'Challenge'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...body, fontSize: '15px', color: dark, marginBottom: '3px' }}>{c.title}</div>
                  {c.the_move && <div style={{ ...body, fontSize: '13px', color: muted }}>{c.the_move.slice(0, 100)}</div>}
                  {(c.taken_on_count > 0 || c.active_count > 0) && (
                    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)', marginTop: '4px' }}>
                      {c.type === 'ask' ? `${c.active_count || 0} offered` : `${c.taken_on_count || 0} taken on`}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {actors.length === 0 && calls.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ ...body, fontSize: '1.0625rem', color: muted, lineHeight: 1.7, maxWidth: '440px', margin: '0 auto 20px' }}>
            No actors or challenges aligned here yet. Be the first — claim a profile and name this as your destination.
          </p>
          <Link to="/atlas" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, textDecoration: 'none', border: '1px solid rgba(110,127,92,0.5)', borderRadius: '30px', padding: '8px 20px', display: 'inline-block' }}>
            Browse the Atlas →
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Goals index ──────────────────────────────────────────────────────────────

function GoalsIndex() {
  const [goals,   setGoals]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/constellations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_goals' }) })
      .then(r => r.json())
      .then(d => setGoals(d.goals || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <Eyebrow>The Atlas</Eyebrow>
      <h1 style={{ ...serif, fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 300, color: dark, lineHeight: 1.1, marginBottom: '10px' }}>
        Horizon Goals
      </h1>
      <p style={{ ...body, fontSize: '1.125rem', color: muted, lineHeight: 1.75, marginBottom: '32px', maxWidth: '560px' }}>
        Seven civilisational destinations. Every actor, challenge, and constellation on NextUs aligns to one. This is what gives the Atlas direction.
      </p>
      {loading
        ? <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', padding: '60px 0', textAlign: 'center' }}>Loading…</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '14px' }}>
            {goals.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
      }
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function HorizonGoalsPage() {
  const { domain } = useParams()

  return (
    <div style={{ background: parch, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '880px', margin: '0 auto', padding: 'clamp(64px,8vw,96px) clamp(20px,5vw,40px) 100px' }}>
        {domain ? <GoalDetail domain={domain} /> : <GoalsIndex />}
      </div>
    </div>
  )
}
