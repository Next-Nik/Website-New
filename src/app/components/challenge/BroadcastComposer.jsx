// src/app/components/challenge/BroadcastComposer.jsx
//
// Author-only. One update to everyone running this challenge. One way, no
// thread. A broadcast reaches only this challenge's own takers — the API and
// RLS scope every write to a single call_id, so it never cascades to the
// branches below. Shown to the author on their own challenge page.

import { useState, useEffect } from 'react'
import { sc, body as bodyFont, tokens } from '../../../lib/designTokens'

export default function BroadcastComposer({ call, userId, colour }) {
  const [text, setText]       = useState('')
  const [email, setEmail]     = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(null)   // { reached }
  const [recent, setRecent]   = useState([])

  useEffect(() => {
    if (!call?.id || !userId) return
    let live = true
    fetch('/api/challenge-broadcast', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', userId, call_id: call.id }),
    }).then(r => r.json()).then(d => { if (live) setRecent(d.broadcasts || []) }).catch(() => {})
    return () => { live = false }
  }, [call?.id, userId])

  async function send() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const r = await fetch('/api/challenge-broadcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post', userId, call_id: call.id, text: text.trim(), send_email: email }),
      })
      const d = await r.json()
      if (!d.error) {
        setSent({ reached: d.reached, emailed: d.emailed || 0 })
        setRecent(prev => [d.broadcast, ...prev])
        setText('')
      }
    } catch {}
    setSending(false)
  }

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '8px' }}>
        Message everyone running this
      </div>
      <div style={{ border: `1.5px solid ${colour}`, borderRadius: '14px', background: tokens.bgCard, padding: '18px' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="A note to the people running your challenge. They read it; there is no reply thread."
          style={{ width: '100%', minHeight: '88px', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '10px', background: '#FFFFFF', padding: '13px 15px', ...bodyFont, fontSize: '15px', lineHeight: 1.55, color: 'rgba(15,21,35,0.82)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '13px', flexWrap: 'wrap' }}>
          <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.55)', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} style={{ accentColor: colour }} />
            Also send as an email digest
          </label>
          <button type="button" onClick={send} disabled={!text.trim() || sending}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FFFFFF', background: tokens.goldChrome, border: 'none', borderRadius: '30px', padding: '10px 22px', cursor: !text.trim() || sending ? 'not-allowed' : 'pointer', opacity: !text.trim() || sending ? 0.45 : 1 }}>
            {sending ? 'Sending…' : 'Send to everyone running this'}
          </button>
        </div>
        {sent && (
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: tokens.gold, marginTop: '12px' }}>
            Sent · reached {sent.reached} running this{sent.emailed > 0 ? ` · emailed ${sent.emailed}` : ''} · the branches below have their own authors
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          {recent.slice(0, 3).map(b => (
            <div key={b.id} style={{ ...bodyFont, fontSize: '15px', lineHeight: 1.6, color: 'rgba(15,21,35,0.72)', padding: '12px 0', borderTop: '1px solid rgba(200,146,42,0.18)' }}>
              {b.body}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
