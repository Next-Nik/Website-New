// src/app/components/InfoButton.jsx
//
// A circular `i` icon that opens a styled popover explaining the relevant
// concept. Used wherever the platform's mechanics need a quiet teaching
// surface — most notably the bounded-attention game mechanics (spoon
// budget, attention tiers) on the affiliation surface and the future
// roster builder.
//
// The button is small and quiet by default. Tap opens a popover anchored
// to the icon. The popover closes on outside click or Escape.
//
// Props
// ─────
//   title    — short heading inside the popover
//   children — body content. Plain prose, lists, anything. Renders inside
//              a styled panel with the platform's body font.
//   size     — 'sm' (16px) or 'md' (20px). Default 'sm'.
//   ariaLabel — accessibility label for the button. Defaults to a sensible
//              "More information about <title>" if title is plain text.

import { useEffect, useRef, useState } from 'react'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

export function InfoButton({ title, children, size = 'sm', ariaLabel }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickAway(e) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickAway)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickAway)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const dim = size === 'md' ? 20 : 16
  const fontSize = size === 'md' ? '13px' : '11px'
  const label = ariaLabel || (typeof title === 'string' ? `More information about ${title}` : 'More information')

  return (
    <span style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label={label}
        aria-expanded={open}
        style={{
          width: `${dim}px`,
          height: `${dim}px`,
          borderRadius: '50%',
          border: '1.2px solid rgba(200,146,42,0.55)',
          background: open ? 'rgba(200,146,42,0.10)' : 'rgba(200,146,42,0.04)',
          color: '#A8721A',
          cursor: 'pointer',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize,
          fontStyle: 'italic',
          lineHeight: 1,
          transition: 'background 120ms ease',
          verticalAlign: 'middle',
        }}
      >
        i
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={label}
          style={{
            position: 'absolute',
            top: `calc(100% + 8px)`,
            left: 0,
            zIndex: 250,
            width: 'min(340px, 80vw)',
            background: '#FFFFFF',
            border: '1.5px solid rgba(200,146,42,0.30)',
            borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(15,21,35,0.12)',
            padding: '18px 20px 16px',
          }}
        >
          {title && (
            <div style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.18em',
              color: '#A8721A',
              marginBottom: '10px',
              textTransform: 'uppercase',
            }}>
              {title}
            </div>
          )}
          <div style={{
            ...body,
            fontSize: '14px',
            lineHeight: 1.65,
            color: 'rgba(15,21,35,0.88)',
          }}>
            {children}
          </div>
        </div>
      )}
    </span>
  )
}
