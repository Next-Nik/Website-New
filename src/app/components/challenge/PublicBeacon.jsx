// src/app/components/challenge/PublicBeacon.jsx
//
// The lantern, public. Every challenge in the founding constellation shows
// this panel instead of the domain meter: the live spark count, the people
// and challenges feeding it, and the one shared close — read straight from
// the beacon so the date has a single source of truth. No auth; a cold
// visitor from a QR code sees the collective fire before signing in.
//
// Imperative API via ref: spark() pulses the fire and ticks the count by
// one, so a surface that hosts a check-in can make the moment visible —
// the ember lands, the sky grows by one real star. Purely additive; every
// existing refless usage is unchanged.

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { serif, sc, body } from '../../../lib/designTokens'
import BeaconFire from './BeaconFire'

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
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysUntil(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  const end = new Date(y, m - 1, d, 23, 59, 59)
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000))
}

const PublicBeacon = forwardRef(function PublicBeacon(_props, ref) {
  const [beacon, setBeacon] = useState(null)
  const fireRef = useRef(null)
  const boxRef  = useRef(null)

  useImperativeHandle(ref, () => {
    // One real action, one spark: pulse the fire and tick the tally so the
    // check-in is felt at the moment it happens, not on the next reload.
    const spark = () => {
      try { fireRef.current && fireRef.current.fireSpark() } catch (_) { /* visual only */ }
      setBeacon(b => (b ? { ...b, sparks: Number(b.sparks || 0) + 1 } : b))
    }
    return {
      spark,
      // The check-in, made visible: a small ember leaves the given element,
      // crosses the page, and lands here — then the fire pulses and the sky
      // grows by one star. The beacon owns its own gold (heritage law: gold
      // lives in beacon components only). Reduced-motion users get the
      // pulse without the flight. Purely visual; safe to call blind.
      emberFrom(fromEl) {
        const target = boxRef.current
        let reduced = false
        try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (_) { /* default: animate */ }
        if (!fromEl || !target || !target.offsetHeight || reduced) { spark(); return }
        const r  = fromEl.getBoundingClientRect()
        const tr = target.getBoundingClientRect()
        const ember = document.createElement('div')
        ember.setAttribute('aria-hidden', 'true')
        Object.assign(ember.style, {
          position: 'fixed', zIndex: 9999, pointerEvents: 'none',
          left: `${r.left + r.width / 2 - 5}px`, top: `${r.top + r.height / 2 - 5}px`,
          width: '10px', height: '10px', borderRadius: '50%',
          background: `radial-gradient(circle at 40% 35%, ${AMBER_BRIGHT}, ${AMBER})`,
          boxShadow: `0 0 12px 3px rgba(242,196,90,0.55)`,
          transition: 'transform 0.65s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.65s ease',
        })
        document.body.appendChild(ember)
        requestAnimationFrame(() => {
          ember.style.transform = `translate(${tr.left + tr.width / 2 - (r.left + r.width / 2)}px, ${tr.top + tr.height / 2 - (r.top + r.height / 2)}px) scale(0.5)`
          ember.style.opacity = '0.25'
        })
        setTimeout(() => { ember.remove(); spark() }, 660)
      },
    }
  })

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
      <div ref={boxRef} style={{
        position: 'relative', overflow: 'hidden',
        border: `1.5px solid ${AMBER}`, borderRadius: '16px',
        background: `radial-gradient(ellipse at 50% 30%, rgba(242,196,90,0.10), rgba(242,196,90,0) 65%), ${NIGHT}`,
        padding: '26px 22px 24px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: '320px', margin: '0 auto' }}>
          <BeaconFire ref={fireRef} sparks={sparks} />
        </div>
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
        {/* Permanent gloss — the spark definition lives here, not only in the zero state */}
        <div style={{ ...body, fontSize: '13px', color: CREAM_60, lineHeight: 1.5, marginTop: '6px' }}>
          1 spark = one real action, checked in
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
})

export default PublicBeacon
