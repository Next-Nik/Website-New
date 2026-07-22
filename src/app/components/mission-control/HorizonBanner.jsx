// src/app/components/mission-control/HorizonBanner.jsx
//
// BP-8 · The declared horizon's home: the top of Mission Control. Once made,
// the line sits here verbatim, re-entering attention every visit. Before it
// is made, a quiet "Declare your horizon" affordance stands in its place.
//
// Field Notes treatment (personal, daylight) — the same light-card slot as
// FirstLightPrompt, directly above it. Renders nothing while resolving or for
// signed-out visitors. The line is shown exactly as stored (italic = user
// voice, the one sanctioned italic).

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fn, space } from '../../../lib/designTokens'
import { getMyHorizonDeclaration } from '../../lib/horizonDeclaration'

const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const mono    = { fontFamily: "'Cormorant SC', Georgia, serif" }

export default function HorizonBanner({ userId, style, fallbackLine = null }) {
  const navigate = useNavigate()
  const [declaration, setDeclaration] = useState(undefined) // undefined = loading

  useEffect(() => {
    let live = true
    if (!userId) { setDeclaration(null); return }
    ;(async () => {
      const d = await getMyHorizonDeclaration()
      if (live) setDeclaration(d)
    })()
    return () => { live = false }
  }, [userId])

  if (!userId) return null
  if (declaration === undefined) return null   // resolve quietly, no flash

  const wrap = {
    maxWidth: 720, margin: '0 auto 18px', boxSizing: 'border-box',
    background: fn.object, border: `1px solid ${fn.mossEdge}`,
    borderRadius: '14px', padding: `${space.lg} ${space.xl}`,
    ...style,
  }

  // Not formally declared, but the person has already named a life
  // horizon through The Map — show that verbatim rather than asking
  // again. Tapping opens the declaration screen to make it official.
  if (!declaration && fallbackLine) {
    return (
      <div style={wrap}
        role="button" tabIndex={0}
        onClick={() => navigate('/horizon/declare', { state: { prefill: fallbackLine } })}
        onKeyDown={e => { if (e.key === 'Enter') navigate('/horizon/declare', { state: { prefill: fallbackLine } }) }}
        title="Your horizon · tap to refine">
        <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: fn.moss, marginBottom: space.sm }}>
          My horizon
        </div>
        <p style={{ ...body, fontSize: '20px', color: fn.ink,
          lineHeight: 1.4, margin: 0, cursor: 'pointer' }}>
          {fallbackLine}
        </p>
      </div>
    )
  }

  // Nothing declared and nothing from the Map — the affordance.
  if (!declaration) {
    return (
      <div style={{ ...wrap, borderStyle: 'dashed' }}>
        <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: fn.ghost, marginBottom: space.sm }}>
          Your horizon
        </div>
        <p style={{ ...body, fontSize: '16px', color: fn.meta, lineHeight: 1.5,
          margin: `0 0 ${space.md}` }}>
          Name the future you are moving toward. One line, in your own words.
        </p>
        <button type="button" onClick={() => navigate('/horizon/declare')}
          style={{ ...mono, fontSize: '13px', letterSpacing: '0.10em',
            background: fn.moss, color: '#FFFFFF', border: '1px solid transparent',
            borderRadius: '9px', padding: '10px 20px', cursor: 'pointer' }}>
          Declare your horizon →
        </button>
      </div>
    )
  }

  // Declared — the line at its home, verbatim.
  return (
    <div style={wrap}
      role="button" tabIndex={0}
      onClick={() => navigate('/horizon/declare', { state: { prefill: declaration.line } })}
      onKeyDown={e => { if (e.key === 'Enter') navigate('/horizon/declare', { state: { prefill: declaration.line } }) }}
      title="Your horizon · tap to refine">
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.18em',
        textTransform: 'uppercase', color: fn.moss, marginBottom: space.sm }}>
        My horizon
      </div>
      <p style={{ ...body, fontStyle: 'italic', fontSize: '20px', color: fn.ink,
        lineHeight: 1.4, margin: 0, cursor: 'pointer' }}>
        {declaration.line}
      </p>
    </div>
  )
}
