// src/beta/components/GeocodeBtn.jsx
import { useState } from 'react'
import { sc } from './OrgShared'

const gold = '#A8721A'

export function GeocodeBtn({ locationName, onResult }) {
  const [status, setStatus] = useState(null)

  async function run() {
    if (!locationName?.trim()) { setStatus('err'); return }
    setStatus('loading')
    try {
      const url  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      if (data && data.length > 0) {
        onResult(parseFloat(data[0].lat).toFixed(6), parseFloat(data[0].lon).toFixed(6))
        setStatus('ok')
      } else { setStatus('err') }
    } catch { setStatus('err') }
    setTimeout(() => setStatus(null), 3000)
  }

  return (
    <button onClick={run} disabled={status === 'loading'}
      style={{
        ...sc, fontSize: '11px', letterSpacing: '0.13em',
        padding: '11px 13px', borderRadius: '8px', flexShrink: 0,
        border: `1px solid ${status === 'ok' ? '#2A6B3A' : status === 'err' ? '#8A3030' : 'rgba(200,146,42,0.40)'}`,
        background: 'transparent',
        color: status === 'ok' ? '#2A6B3A' : status === 'err' ? '#8A3030' : gold,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
      {status === 'loading' ? '…' : status === 'ok' ? '✓ Found' : status === 'err' ? 'Not found' : 'Geocode'}
    </button>
  )
}
