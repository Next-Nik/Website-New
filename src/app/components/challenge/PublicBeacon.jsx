// src/app/components/challenge/PublicBeacon.jsx
//
// The lantern, public. Every challenge in the founding constellation shows
// this panel instead of the domain meter: the live spark count, the people
// and challenges feeding it, and the one shared close — read straight from
// the beacon so the date has a single source of truth. No auth; a cold
// visitor from a QR code sees the collective fire before signing in.

import { useState, useEffect } from 'react'
import { serif, sc, body, tokens } from '../../../lib/designTokens'

const AMBER        = '#C8922A'
const AMBER_BRIGHT = '#F2C45A'

function fmtDate(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function daysUntil(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  const end = new Date(y, m - 1, d, 23, 59, 59)
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000))
}

export default function PublicBeacon() {
  const [beacon, setBeacon] = useState(null)

  useEffect(() => {
    let live = true
    fetch('/api/beacon', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', slug: 'founding-nature' }),
    })
      .then(r => r.json())
      .then(d => { if (live && d && d.rooted && d.status === 'live') setBeacon(d) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  if (!beacon) return null

  const sparks   = Number(beacon.sparks || 0)
  const people   = Number(beacon.people || 0)
  const nChal    = Number(beacon.challenges || 0)
  const closeStr = fmtDate(beacon.closes_on)
  const days     = daysUntil(beacon.closes_on)

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '8px' }}>
        What it feeds
      </div>
      <div style={{
        position: 'relative', overflow: 'hidden',
        border: `1.5px solid ${AMBER}`, borderRadius: '16px',
        background: `linear-gradient(180deg, rgba(242,196,90,0.10) 0%, rgba(255,255,255,0) 52%), ${tokens.bgCard}`,
        padding: '26px 22px', textAlign: 'center',
      }}>
        {/* the lantern glow behind the number */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
          width: '260px', height: '160px', pointerEvents: 'none',
          background: `radial-gradient(ellipse at 50% 30%, rgba(242,196,90,0.30), rgba(242,196,90,0.08) 55%, transparent 75%)`,
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: '#A8721A', textTransform: 'uppercase' }}>
            The beacon
          </div>
          {sparks > 0 ? (
            <>
              <div style={{ ...serif, fontWeight: 300, fontSize: '58px', lineHeight: 1, color: tokens.dark, margin: '8px 0 2px' }}>
                {sparks.toLocaleString()}
              </div>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>
                Sparks
              </div>
            </>
          ) : (
            <div style={{ ...serif, fontWeight: 300, fontSize: '26px', lineHeight: 1.25, color: tokens.dark, margin: '10px 0 2px' }}>
              Lit and waiting.
            </div>
          )}
          <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: '10px 0 0' }}>
            {sparks > 0
              ? <>{people.toLocaleString()} {people === 1 ? 'person' : 'people'} · {nChal.toLocaleString()} {nChal === 1 ? 'challenge' : 'challenges'} · one shared close</>
              : <>Every check-in adds a spark. The first ones land here.</>}
          </div>
          {closeStr && (
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#A8721A', textTransform: 'uppercase', marginTop: '12px' }}>
              Closes {closeStr}{days != null && days > 0 ? ` · ${days} ${days === 1 ? 'day' : 'days'} left` : ''}
            </div>
          )}
        </div>
        <div aria-hidden="true" style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '3px',
          background: `linear-gradient(90deg, transparent, ${AMBER_BRIGHT}, transparent)`, opacity: 0.6,
        }} />
      </div>
    </div>
  )
}
