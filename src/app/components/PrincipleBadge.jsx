// src/beta/components/PrincipleBadge.jsx
// Module 1.5 primitive. Small chip rendering one of the four platform principles.
// Weight: primary | secondary | tertiary
// Click expands to a definition tooltip.

import { useState, useRef, useEffect } from 'react'
import { PRINCIPLE_BY_SLUG } from '../constants/principles'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }

// Visual weight differentiation comes from border + background only.
// Text opacity is governed by the three-level rule (full / 0.72 / 0.55) and is
// not used here to imply hierarchy.
const WEIGHT_STYLES = {
  primary:   { border: '1.5px solid rgba(200,146,42,0.78)', bg: 'rgba(200,146,42,0.08)' },
  secondary: { border: '1px solid rgba(200,146,42,0.20)',   bg: 'rgba(200,146,42,0.05)' },
  tertiary:  { border: '1px solid rgba(200,146,42,0.20)',   bg: 'transparent'           },
}

export function PrincipleBadge({ slug, weight = 'primary', inline = false }) {
  const principle = PRINCIPLE_BY_SLUG[slug]
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!principle) return null

  const ws = WEIGHT_STYLES[weight] || WEIGHT_STYLES.primary

  return (
    <div ref={ref} style={{ position: 'relative', display: inline ? 'inline-block' : 'block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          ...sc,
          fontSize: '13px',
          letterSpacing: '0.12em',
          color: '#A8721A',
          background: ws.bg,
          border: ws.border,
          borderRadius: '4px',
          padding: '3px 9px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'background 0.15s, border-color 0.15s',
          whiteSpace: 'nowrap',
        }}
        aria-expanded={open}
      >
        {principle.shortLabel}
        <span style={{ fontSize: '13px', color: '#A8721A' }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 100,
          width: '280px',
          background: '#FFFFFF',
          border: '1.5px solid rgba(200,146,42,0.20)',
          borderRadius: '14px',
          padding: '14px 16px',
          boxShadow: '0 4px 24px rgba(15,21,35,0.10)',
        }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: '#A8721A', marginBottom: '8px' }}>
            {principle.label}
          </div>
          <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>
            {principle.definition}
          </p>
        </div>
      )}
    </div>
  )
}

export default PrincipleBadge
