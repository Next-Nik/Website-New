// src/app/components/challenge/ConstellationMeter.jsx
//
// The whole rising from the parts. One tick = one person in (the public taker
// count), summed across every community challenge in the domain. The segmented
// bar shows the parts feeding the whole — the fractal made visible. Parts are
// contributors to a shared total, never ranked against each other. Renders
// nothing until the constellation has real participation.

import { useState, useEffect } from 'react'
import { serif, sc, tokens } from '../../../lib/designTokens'

// shades stepping out from the accent, for the segmented bar
function shade(hex, i, n) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  if (!m) return '#4A8C6F'
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16)
  const t = n > 1 ? (i / (n - 1)) * 0.42 : 0   // lighten later segments toward white
  const mix = (c) => Math.round(c + (255 - c) * t)
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`
}

export default function ConstellationMeter({ domain, colour }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!domain) return
    let live = true
    fetch('/api/constellations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'meter', domain }),
    }).then(r => r.json()).then(d => { if (live) setData(d) }).catch(() => {})
    return () => { live = false }
  }, [domain])

  if (!data || !data.total) return null
  const parts = data.parts || []
  const sum   = parts.reduce((s, p) => s + p.count, 0) || 1

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '8px' }}>
        What it feeds
      </div>
      <div style={{
        border: `1.5px solid ${colour}`, borderRadius: '16px',
        background: `linear-gradient(180deg, ${tintOf(colour)} 0%, rgba(255,255,255,0) 50%), ${tokens.bgCard}`,
        padding: '24px 22px', textAlign: 'center',
      }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: colour, textTransform: 'uppercase' }}>
          The constellation
        </div>
        <div style={{ ...serif, fontWeight: 300, fontSize: '54px', lineHeight: 1, color: tokens.dark, margin: '6px 0 2px' }}>
          {data.total.toLocaleString()}
        </div>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>
          people in
        </div>

        {parts.length > 0 && (
          <div style={{ display: 'flex', height: '14px', borderRadius: '5px', overflow: 'hidden', gap: '2px', marginTop: '16px' }}>
            {parts.map((p, i) => (
              <span key={p.id} title={`${p.title}: ${p.count}`} style={{ flexGrow: p.count, flexBasis: 0, background: shade(colour, i, parts.length) }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function tintOf(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  if (!m) return 'rgba(74,140,111,0.06)'
  return `rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},0.06)`
}
