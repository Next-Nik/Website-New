// src/app/components/challenge/PublicBeacon.jsx
//
// The lantern, public. Every challenge in the founding constellation shows
// this panel instead of the domain meter: the live spark count, the people
// and challenges feeding it, and the one shared close — read straight from
// the beacon so the date has a single source of truth. No auth; a cold
// visitor from a QR code sees the collective fire before signing in.

import { useState, useEffect } from 'react'
import { serif, sc, body } from '../../../lib/designTokens'
import BeaconLantern from './BeaconLantern'

const AMBER        = '#C8922A'
const AMBER_BRIGHT = '#F2C45A'
const NIGHT        = '#141B2C'
const CREAM        = '#FBF8F0'
const CREAM_80     = 'rgba(251,248,240,0.82)'
const CREAM_60     = 'rgba(251,248,240,0.60)'
const GOLD_T       = '#D7A24A'

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
      {/* The night plate — the lantern lives on dark ground, as in the beacon
          artwork and the founding doors. The lantern itself carries the glow. */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        border: `1.5px solid ${AMBER}`, borderRadius: '16px',
        background: `radial-gradient(ellipse at 50% 30%, rgba(242,196,90,0.10), rgba(242,196,90,0) 65%), ${NIGHT}`,
        padding: '26px 22px 24px', textAlign: 'center',
      }}>
        <BeaconLantern sparks={sparks} width={150} />
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: GOLD_T, textTransform: 'uppercase', marginTop: '14px' }}>
          The beacon
        </div>
        {sparks > 0 ? (
          <>
            <div style={{ ...serif, fontWeight: 300, fontSize: '54px', lineHeight: 1, color: CREAM, margin: '6px 0 2px' }}>
              {sparks.toLocaleString()}
            </div>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: CREAM_60, textTransform: 'uppercase' }}>
              Sparks
            </div>
          </>
        ) : (
          <div style={{ ...serif, fontWeight: 300, fontSize: '25px', lineHeight: 1.25, color: CREAM, margin: '8px 0 2px' }}>
            Lit and waiting.
          </div>
        )}
        <div style={{ ...body, fontSize: '15px', color: CREAM_80, lineHeight: 1.6, margin: '10px 0 0' }}>
          {sparks > 0
            ? <>{people.toLocaleString()} {people === 1 ? 'person' : 'people'} · {nChal.toLocaleString()} {nChal === 1 ? 'challenge' : 'challenges'} · one shared close</>
            : <>Every check-in adds a spark. The first ones land here.</>}
        </div>
        {closeStr && (
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: GOLD_T, textTransform: 'uppercase', marginTop: '12px' }}>
            Closes {closeStr}{days != null && days > 0 ? ` · ${days} ${days === 1 ? 'day' : 'days'} left` : ''}
          </div>
        )}
        <div aria-hidden="true" style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '3px',
          background: `linear-gradient(90deg, transparent, ${AMBER_BRIGHT}, transparent)`, opacity: 0.5,
        }} />
      </div>
    </div>
  )
}
