// /challenges/partners — partner requests inbox (June 2026).
//
// Where a person answers partnership requests: an actor they own was named as
// a partner on someone's challenge, or someone asked to join a challenge they
// author. Nothing is public until accepted here.

import { useState, useEffect } from 'react'
import { Link }     from 'react-router-dom'
import { Nav }      from '../../components/Nav'
import { useAuth }  from '../../hooks/useAuth'
import { tokens, serif, body, sc } from '../../lib/designTokens'

const hair  = '1px solid rgba(200,146,42,0.18)'
const muted = { color: 'rgba(15,21,35,0.78)' }
const GOLD_C = tokens.goldChrome

export default function PartnerInbox() {
  const { user } = useAuth()
  const [reqs, setReqs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(null)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let live = true
    fetch('/api/actor-calls', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'partner_inbox', userId: user.id }),
    })
      .then(r => r.json())
      .then(d => { if (live) setReqs(d.requests || []) })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [user])

  async function respond(id, decision) {
    setActing(id)
    try {
      await fetch('/api/actor-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond_partner', userId: user.id, partnership_id: id, decision }),
      })
      setReqs(rs => rs.filter(r => r.id !== id))
    } catch {}
    setActing(null)
  }

  function line(r) {
    const t = <strong style={{ ...serif, fontWeight: 400, color: tokens.dark }}>{r.call_title}</strong>
    if (r.initiated_by === 'author') {
      return <span>{r.call_author || 'A challenge author'} invited {r.partner_name} to partner on {t}.</span>
    }
    return <span>{r.partner_name} asked to join your challenge {t}.</span>
  }

  return (
    <div style={{ minHeight: '100dvh', background: tokens.bg }}>
      <Nav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 22px 80px' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: tokens.gold, textTransform: 'uppercase', marginBottom: '8px' }}>
          Partner requests
        </div>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: '38px', color: tokens.dark, lineHeight: 1.1, margin: '0 0 28px' }}>
          Who's asking
        </h1>

        {!user ? (
          <p style={{ ...body, fontSize: '1.0625rem', ...muted }}>Sign in to see partner requests.</p>
        ) : loading ? (
          <p style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost }}>Loading…</p>
        ) : reqs.length === 0 ? (
          <div style={{ background: tokens.bgCard, border: hair, borderRadius: '14px', padding: '28px' }}>
            <p style={{ ...body, fontSize: '1.0625rem', ...muted, margin: 0 }}>No partner requests right now.</p>
          </div>
        ) : (
          reqs.map(r => (
            <div key={r.id} style={{ background: tokens.bgCard, border: hair, borderRadius: '14px', padding: '20px 22px', marginBottom: '14px' }}>
              <p style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.82)', lineHeight: 1.6, margin: '0 0 14px' }}>
                {line(r)}
              </p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" onClick={() => respond(r.id, 'accepted')} disabled={acting === r.id}
                  style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', color: '#fff', background: tokens.gold, border: 'none', borderRadius: '30px', padding: '9px 22px', cursor: 'pointer', opacity: acting === r.id ? 0.5 : 1 }}>
                  Accept
                </button>
                <button type="button" onClick={() => respond(r.id, 'declined')} disabled={acting === r.id}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Decline
                </button>
                {r.call_slug && (
                  <Link to={`/stretch/c/${r.call_slug}`} style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.gold, textDecoration: 'none', marginLeft: 'auto' }}>
                    View →
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
