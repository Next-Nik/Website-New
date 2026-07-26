// src/pages/CareCardPublic.jsx
//
// The public Care Card route: /care/:token
//
// BUILT BUT DARK. The route, the renderer and the empty states are all real,
// but sql/187's care_public_enabled() returns false, so the read returns
// nothing to anyone. To go live: replace that function with `select true`.
//
// Reads go through the care_card_by_token RPC, NOT a table select. This is a
// security boundary, not a style choice: a row-level policy cannot scope a
// read to the single token the caller presented, because the token filter is
// the client's to choose and the client can omit it. A table policy would
// therefore let anyone with the publishable key enumerate every live card.
// The RPC takes the token as an argument, so holding the token is the only
// way to name a row. See the note above the function in sql/187.
//
// It never touches care_profiles, so birth time and coordinates are
// structurally out of reach rather than merely filtered out.

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
      const { data, error } = await supabase.rpc('care_card_by_token', { p_token: token })
      if (cancelled) return
      if (error) { setStatus('error'); return }
      // The function returns null for: sharing switched off, unknown token,
      // revoked, or not live. All four are indistinguishable to the reader by
      // design — a probe learns nothing about which tokens exist.
      if (!data || !data.card) { setStatus('missing'); return }
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
