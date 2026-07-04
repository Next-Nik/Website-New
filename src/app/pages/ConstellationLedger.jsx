// src/app/pages/ConstellationLedger.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The steward view — the inside ledger. Every challenge, what it is, and the
// sparks it gathered. Per-challenge spark counts live HERE, for the stewards,
// not on any public page. Founder-gated. Ordered by size to read the room, but
// with no rank badges and no competition framing: it is the what's-so.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { tokens, serif, body, sc, at } from '../../lib/designTokens'

const AMBER_DEEP = '#7A4A12'
const fmt = (n) => Number(n || 0).toLocaleString('en-GB')

// UI gate only — the real enforcement is RLS. Tolerant of either metadata source.
function isFounder(user) {
  return user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'
}

async function getBeacon(action) {
  const r = await fetch('/api/beacon', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, slug: 'founding-nature' }),
  })
  return r.json()
}

export default function ConstellationLedger() {
  const { user, loading: authLoading } = useAuth()
  const [tally, setTally] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const founder = isFounder(user)

  useEffect(() => {
    if (!founder) return
    let alive = true
    ;(async () => {
      try {
        const [t, bd] = await Promise.all([getBeacon('get'), getBeacon('breakdown')])
        if (!alive) return
        setTally(t)
        const sorted = (bd.challenges || []).slice().sort((a, b) => b.sparks - a.sparks)
        setRows(sorted)
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [founder])

  if (authLoading || user === undefined) {
    return <div style={{ minHeight: '100dvh', background: at.ground }}><Nav /></div>
  }

  if (!founder) {
    return (
      <div style={{ minHeight: '100dvh', background: at.ground, color: at.text }}>
        <Nav />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: at.brass }}>Stewards only</div>
          <h1 style={{ ...serif, fontWeight: 500, fontSize: '34px', margin: '10px 0 8px' }}>This is the inside view.</h1>
          <p style={{ ...body, color: at.ghost }}>The ledger is for the constellation&rsquo;s stewards. What everyone can see lives in the record.</p>
        </div>
      </div>
    )
  }

  const maxSparks = rows.reduce((m, c) => Math.max(m, c.sparks || 0), 0) || 1

  return (
    <div style={{ minHeight: '100dvh', background: at.ground, color: at.text }}>
      <Nav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '44px 24px 90px' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: at.brass }}>Steward view</div>
        <h1 style={{ ...serif, fontWeight: 500, fontSize: '44px', lineHeight: 1.04, margin: '12px 0 6px' }}>The constellation, in full.</h1>
        <p style={{ ...body, fontSize: '18px', color: at.ghost, maxWidth: '54ch' }}>
          Every challenge, what it is, and what it gathered. Spark counts per challenge live here, not on any public page.
        </p>

        {loading && <p style={{ ...body, color: at.ghost, marginTop: '24px' }}>Reading the ledger…</p>}

        {!loading && tally && (
          <>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', margin: '28px 0 8px' }}>
              {[
                { v: fmt(tally.sparks), k: 'Sparks gathered', hero: true },
                { v: fmt(tally.challenges), k: 'Challenges' },
                { v: fmt(tally.orgs), k: 'Orgs' },
                { v: fmt(tally.people), k: 'People' },
              ].map((n, i) => (
                <div key={i} style={{ flex: n.hero ? '1.5 1 0' : '1 1 0', minWidth: '130px', border: `1px solid ${n.hero ? tokens.goldFaint : 'rgba(15,21,35,0.12)'}`, borderRadius: '14px', padding: '16px 18px', background: at.object }}>
                  <div style={{ ...serif, fontWeight: 500, fontSize: n.hero ? '50px' : '38px', lineHeight: 1, color: n.hero ? AMBER_DEEP : at.text, fontVariantNumeric: 'tabular-nums' }}>{n.v}</div>
                  <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: at.ghost, marginTop: '5px' }}>{n.k}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '18px' }}>
              {rows.map((c) => (
                <div key={c.call_id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center', padding: '16px 0', borderBottom: `1px solid ${tokens.goldFaint}` }}>
                  <div style={{ minWidth: 0 }}>
                    {c.actor_name && <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: at.brass }}>{c.actor_name}</div>}
                    <div style={{ ...serif, fontSize: '22px', lineHeight: 1.2 }}>{c.the_move || c.title}</div>
                    <div style={{ ...body, fontSize: '13px', color: at.ghost, marginTop: '2px' }}>
                      <span style={{ border: `1px solid ${tokens.goldFaint}`, borderRadius: '16px', padding: '1px 9px', marginRight: '8px', ...sc, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '13px' }}>{c.cadence}</span>
                      {fmt(c.people)} people in
                    </div>
                    <div style={{ height: '3px', borderRadius: '3px', background: tokens.goldGlow, marginTop: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((c.sparks / maxSparks) * 100)}%`, background: at.verdigris, borderRadius: '3px' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ ...serif, fontSize: '30px', color: AMBER_DEEP, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmt(c.sparks)}</div>
                    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: at.ghost }}>sparks</div>
                  </div>
                </div>
              ))}
              {rows.length === 0 && <p style={{ ...body, color: at.ghost, marginTop: '16px' }}>No challenges have gathered sparks yet.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
