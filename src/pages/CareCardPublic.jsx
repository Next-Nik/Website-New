// src/pages/CareCardPublic.jsx
//
// The public Care Card route: /care/:token
//
// BUILT BUT DARK. The route, the query, the renderer and the empty states are
// all real, but sql/180's care_public_enabled() returns false, so RLS hands an
// anonymous reader nothing. The founder, matched by the owner policy, still
// gets their own row — which means the exact public rendering can be tested
// end to end without anything being publicly readable.
//
// To go live: replace care_public_enabled() with `select true`. No change here.
//
// This page reads care_shares only. It never touches care_profiles, so birth
// time and coordinates are structurally out of reach rather than merely
// filtered out.

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../hooks/useSupabase'
import { fn, fnText, space, mono, display } from '../lib/designTokens'
import CareCard from '../components/care/CareCard'

export function CareCardPublicPage() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading')   // loading | ready | missing | error
  const [row, setRow] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) { setStatus('missing'); return }
      const { data, error } = await supabase
        .from('care_shares')
        .select('card, show_right_now, is_live, revoked_at')
        .eq('token', token)
        .maybeSingle()
      if (cancelled) return
      if (error) { setStatus('error'); return }
      if (!data || !data.is_live || data.revoked_at) { setStatus('missing'); return }
      setRow(data)
      setStatus('ready')
    })()
    return () => { cancelled = true }
  }, [token])

  if (status === 'loading') {
    return (
      <Shell>
        <p style={{ ...mono, fontSize: '13px', letterSpacing: '0.2em', color: fn.ghost }}>
          UNFOLDING THE TAG…
        </p>
      </Shell>
    )
  }

  if (status !== 'ready') {
    return (
      <Shell>
        <h1 style={{ ...display, fontSize: '24px', color: fn.ink, margin: `0 0 ${space.md}` }}>
          Nothing here
        </h1>
        <p style={{ ...fnText.body, color: fn.meta, margin: 0, maxWidth: '380px' }}>
          This card either does not exist, has been taken down by the person it
          belongs to, or is not being shared publicly yet.
        </p>
      </Shell>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: fn.ground, padding: `${space.xxxl} ${space.lg}` }}>
      <CareCard card={row.card} showRightNow={row.show_right_now} />
      <p
        style={{
          ...fnText.caption,
          color: fn.ghost,
          textAlign: 'center',
          margin: `${space.xl} auto 0`,
          maxWidth: '420px',
        }}
      >
        A care protocol is a set of instructions, not a diagnosis. Every section
        is labelled with how much evidence sits behind it.
      </p>
    </div>
  )
}

function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: fn.ground,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: space.xl,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}

export default CareCardPublicPage
