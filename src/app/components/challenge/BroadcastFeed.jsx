// src/app/components/challenge/BroadcastFeed.jsx
//
// Taker-side. The updates the author has sent to everyone running this
// challenge. You see them because you took it on; one tap mutes them and the
// run continues either way. Renders nothing if there are no updates and you
// are not muted.

import { useState, useEffect } from 'react'
import { sc, body as bodyFont, tokens } from '../../../lib/designTokens'

function ago(iso) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 3600) return `${Math.max(1, Math.round(d / 60))}m ago`
  if (d < 86400) return `${Math.round(d / 3600)}h ago`
  return `${Math.round(d / 86400)}d ago`
}

export default function BroadcastFeed({ callId, userId, authorName, colour }) {
  const [items, setItems] = useState([])
  const [muted, setMuted] = useState(false)
  const [canView, setCanView] = useState(false)

  useEffect(() => {
    if (!callId || !userId) return
    let live = true
    fetch('/api/challenge-broadcast', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', userId, call_id: callId }),
    }).then(r => r.json()).then(d => {
      if (!live) return
      setItems(d.broadcasts || [])
      setMuted(!!d.muted)
      setCanView(!!d.can_view)
    }).catch(() => {})
    return () => { live = false }
  }, [callId, userId])

  async function toggleMute(next) {
    setMuted(next)
    try {
      await fetch('/api/challenge-broadcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_mute', userId, call_id: callId, muted: next }),
      })
      if (!next) {
        const r = await fetch('/api/challenge-broadcast', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list', userId, call_id: callId }),
        })
        const d = await r.json()
        setItems(d.broadcasts || [])
      } else {
        setItems([])
      }
    } catch {}
  }

  if (!canView) return null
  if (!muted && items.length === 0) return null

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>
          From the author
        </span>
        <button type="button" onClick={() => toggleMute(!muted)}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tokens.gold, background: 'none', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '24px', padding: '6px 16px', cursor: 'pointer' }}>
          {muted ? 'Unmute updates' : 'Mute updates'}
        </button>
      </div>

      {muted ? (
        <div style={{ ...bodyFont, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6 }}>
          Updates muted. Your run continues; unmute any time.
        </div>
      ) : (
        items.map(b => (
          <div key={b.id} style={{ border: `1.5px solid ${colour}`, borderRadius: '14px', background: tokens.bgCard, padding: '16px 18px', marginBottom: '10px' }}>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: colour, textTransform: 'uppercase', marginBottom: '6px' }}>
              {authorName || 'The author'} · {ago(b.created_at)}
            </div>
            <div style={{ ...bodyFont, fontSize: '15px', lineHeight: 1.6, color: 'rgba(15,21,35,0.82)' }}>{b.body}</div>
          </div>
        ))
      )}
      <div style={{ ...bodyFont, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '6px' }}>
        You see these because you took this challenge on.
      </div>
    </div>
  )
}
