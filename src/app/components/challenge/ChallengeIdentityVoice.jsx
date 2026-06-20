// src/app/components/challenge/ChallengeIdentityVoice.jsx
//
// The contained per-org identity panel, reduced to its net-new element: the
// author's statement in their own voice, the one place the platform allows
// italic. The frame and accent are the platform's (the domain colour); the
// words are the org's. Renders nothing when no statement was authored, so it
// never duplicates the plain byline above it.

import { useState, useEffect } from 'react'
import { sc, tokens, text } from '../../../lib/designTokens'
import { supabase } from '../../../hooks/useSupabase'

export default function ChallengeIdentityVoice({ call, colour }) {
  const [statement, setStatement] = useState(call?.author_statement || null)

  useEffect(() => {
    if (call?.author_statement || !call?.id) return
    let live = true
    // community calls are publicly readable (actor_calls RLS); fetch the line directly
    supabase.from('actor_calls').select('author_statement').eq('id', call.id).maybeSingle()
      .then(({ data }) => { if (live && data?.author_statement) setStatement(data.author_statement) })
    return () => { live = false }
  }, [call?.id, call?.author_statement])

  if (!statement) return null
  const name = call?.nextus_actors?.name

  return (
    <div style={{
      border: `1.5px solid ${colour}`, borderRadius: '16px',
      background: `linear-gradient(180deg, ${hexToTint(colour)} 0%, rgba(255,255,255,0) 44%), ${tokens.bgCard}`,
      padding: '22px', marginBottom: '20px', position: 'relative', overflow: 'hidden',
    }}>
      <p style={{ ...text.userVoice, fontSize: '17px', lineHeight: 1.55, color: 'rgba(15,21,35,0.82)', margin: 0 }}>
        {statement}
      </p>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginTop: '12px' }}>
        {name ? `In ${name}'s words` : 'In their words'}
      </div>
    </div>
  )
}

// a faint domain-coloured wash for depth, derived from the accent
function hexToTint(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  if (!m) return 'rgba(74,140,111,0.06)'
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16)
  return `rgba(${r},${g},${b},0.06)`
}
