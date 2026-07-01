// src/app/pages/RemovePage.jsx
// The landing for the nomination note's one-click exit (/remove/:token).
// Removal is the single clearest signal this was never a funnel, so it is
// plain, immediate, and asks for nothing.

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { serif, body, sc } from '../../lib/designTokens'

const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

export function RemovePage() {
  const { token } = useParams()
  const [state, setState] = useState('working')   // working | done | error
  const [name, setName]   = useState('')
  const [msg, setMsg]     = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/actor-decline', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const j = await r.json()
        if (cancelled) return
        if (r.ok && j.removed) { setName(j.name || ''); setState('done') }
        else { setMsg(j.error || 'This removal link is not valid.'); setState('error') }
      } catch {
        if (!cancelled) { setMsg('Something went wrong. Please try again.'); setState('error') }
      }
    })()
    return () => { cancelled = true }
  }, [token])

  return (
    <div style={{ background: parch, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '140px 24px', textAlign: 'center' }}>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold,
          textTransform: 'uppercase', marginBottom: '16px' }}>NextUs</div>

        {state === 'working' && (
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.6)' }}>Removing...</p>
        )}

        {state === 'done' && (
          <>
            <h1 style={{ ...serif, fontSize: '30px', fontWeight: 400, color: dark, lineHeight: 1.15, marginBottom: '14px' }}>
              {name ? `${name} has been removed.` : 'The profile has been removed.'}
            </h1>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.7 }}>
              It is no longer public on NextUs. Nothing further is needed. If this was a mistake, replying to
              the email that brought you here will reach us.
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 style={{ ...serif, fontSize: '28px', fontWeight: 400, color: dark, lineHeight: 1.15, marginBottom: '14px' }}>
              We could not complete that
            </h1>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.7 }}>{msg}</p>
            <Link to="/atlas" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold,
              textDecoration: 'none', display: 'inline-block', marginTop: '20px' }}>The Atlas &rarr;</Link>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
