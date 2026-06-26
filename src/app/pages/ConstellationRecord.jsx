// src/app/pages/ConstellationRecord.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The record — the public face the beacon is writing. It leads with ACTIONS
// taken (the honest "what we did" number), not sparks (completions carry a 5×
// bonus, which would inflate "what got done"). A roll-call names every challenge
// and what got done, none ranked. Reachable any day; it becomes "what we did"
// at the close. Reads /api/beacon (get + breakdown).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { Nav } from '../../components/Nav'
import { tokens, serif, body, sc } from '../../lib/designTokens'

const AMBER_DEEP = '#7A4A12'

const fmt = (n) => Number(n || 0).toLocaleString('en-GB')

function longDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch (_) { return iso }
}

async function getBeacon(action) {
  const r = await fetch('/api/beacon', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, slug: 'founding-nature' }),
  })
  return r.json()
}

export default function ConstellationRecord() {
  const [tally, setTally] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [t, bd] = await Promise.all([getBeacon('get'), getBeacon('breakdown')])
        if (!alive) return
        setTally(t)
        setRows(bd.challenges || [])
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [])

  const closes = longDate(tally?.closes_on)

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: tally?.label || 'The record', url }); return } catch (_) { /* fall through */ }
    }
    try { await navigator.clipboard.writeText(url) } catch (_) { /* ignore */ }
  }

  return (
    <div style={{ minHeight: '100dvh', background: tokens.bg, color: tokens.dark }}>
      <Nav />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '44px 24px 90px' }}>
        {loading && <p style={{ ...body, color: tokens.ghost }}>Reading the record…</p>}

        {!loading && (!tally || !tally.rooted) && (
          <div>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: tokens.gold }}>The record</div>
            <h1 style={{ ...serif, fontWeight: 500, fontSize: '40px', lineHeight: 1.1, margin: '12px 0 8px' }}>The constellation is just beginning.</h1>
            <p style={{ ...body, fontSize: '18px', color: tokens.ghost, maxWidth: '46ch' }}>
              When the first sparks land, this is where what we did together will be written. Come back to watch it fill.
            </p>
          </div>
        )}

        {!loading && tally && tally.rooted && (
          <div>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: tokens.gold }}>
              The record{closes ? ` · to ${closes}` : ''}
            </div>
            <h1 style={{ ...serif, fontWeight: 500, fontSize: '42px', lineHeight: 1.06, margin: '10px 0 6px', maxWidth: '20ch' }}>
              {tally.status === 'closed' ? 'Here is what we did together.' : 'Here is what we are doing together.'}
            </h1>

            <div style={{ ...serif, fontSize: '72px', color: AMBER_DEEP, lineHeight: 1, margin: '18px 0 4px', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(tally.checkins)} actions
            </div>
            <p style={{ ...body, fontSize: '18px', color: tokens.ghost, maxWidth: '48ch' }}>
              taken for the living world by {fmt(tally.people)} {tally.people === 1 ? 'person' : 'people'} across {fmt(tally.orgs)} {tally.orgs === 1 ? 'organisation' : 'organisations'}{closes ? `, through ${closes}.` : '.'}
            </p>

            <div style={{ margin: '34px 0 0' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: tokens.gold, marginBottom: '8px' }}>
                Every challenge, what got done
              </div>
              {rows.length === 0 && (
                <p style={{ ...body, color: tokens.ghost }}>The first actions are still landing.</p>
              )}
              {rows.map((c) => (
                <div key={c.call_id} style={{ padding: '16px 0', borderBottom: `1px solid ${tokens.goldFaint}` }}>
                  <div style={{ ...serif, fontSize: '24px', lineHeight: 1.2, color: tokens.dark }}>{c.the_move || c.title}</div>
                  <div style={{ ...body, fontSize: '15px', color: tokens.ghost, marginTop: '3px' }}>
                    <b style={{ color: AMBER_DEEP, fontWeight: 500 }}>{fmt(c.done)}</b> {c.done === 1 ? 'time' : 'times'} done, by <b style={{ color: AMBER_DEEP, fontWeight: 500 }}>{fmt(c.people)}</b> {c.people === 1 ? 'person' : 'people'}{c.actor_name ? <> · <span style={{ color: tokens.gold }}>{c.actor_name}</span></> : null}
                  </div>
                </div>
              ))}
            </div>

            <p style={{ ...serif, fontStyle: 'italic', fontSize: '26px', color: AMBER_DEEP, textAlign: 'center', margin: '36px 0 0' }}>
              We weren&rsquo;t caring alone.
            </p>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button onClick={share} style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fff', background: tokens.goldChrome, border: 'none', borderRadius: '26px', padding: '13px 26px', cursor: 'pointer' }}>
                Share the record
              </button>
            </div>
            <p style={{ ...body, fontSize: '13px', color: tokens.ghost, textAlign: 'center', marginTop: '14px' }}>
              Built by the constellation. Carried to Climate Week NYC.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
