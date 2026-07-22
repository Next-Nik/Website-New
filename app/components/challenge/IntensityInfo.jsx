// src/app/components/challenge/IntensityInfo.jsx
//
// A small info icon that opens a clean explainer of the intensity rungs. Reads
// the five straight from the shared constant, so it can never drift from what
// an author can set. Used beside the rung on the challenge page and in the
// author picker. Inside voice: the popover says plainly that a level orients,
// it never ranks, and a small challenge that many people do is the whole point.

import { useState, useRef, useEffect } from 'react'
import { tokens, serif, body, sc, at } from '../../../lib/designTokens'
import { INTENSITY_LEVELS } from '../../../constants/challengeIntensity'
import ChiliRung from './ChiliRung'

export default function IntensityInfo({ colour = tokens.goldChrome }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" aria-label="About intensity levels" onClick={() => setOpen(o => !o)}
        style={{ width: '18px', height: '18px', borderRadius: '50%', border: `1px solid ${tokens.goldChrome}`,
          background: open ? 'rgba(169,116,63,0.12)' : 'transparent', color: at.brass,
          ...sc, fontSize: '13px', lineHeight: 1, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
        i
      </button>

      {open && (
        <div role="dialog" style={{ position: 'absolute', top: '26px', left: 0, zIndex: 40, width: 'min(340px, 84vw)',
          background: tokens.bgCard, border: `1.5px solid ${colour}`, borderRadius: '14px',
          boxShadow: '0 10px 38px rgba(15,21,35,0.12)', padding: '18px 18px 16px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: colour, textTransform: 'uppercase', marginBottom: '8px' }}>
            Intensity
          </div>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.7)', lineHeight: 1.6, margin: '0 0 14px' }}>
            Like a spiciness level on a menu, so you can find what you can take on. It orients, it never ranks. A small
            challenge that many people actually do is the whole point.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {INTENSITY_LEVELS.map(l => (
              <div key={l.level} style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, marginTop: '3px' }}>
                  <ChiliRung level={l.level} size={15} />
                </span>
                <span>
                  <span style={{ ...serif, fontWeight: 400, fontSize: '16px', color: tokens.dark, lineHeight: 1.2 }}>{l.label}</span>
                  <span style={{ display: 'block', ...body, fontSize: '13px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.5, marginTop: '2px' }}>{l.blurb}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  )
}
