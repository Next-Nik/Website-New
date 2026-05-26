import { useState, useEffect, useRef } from 'react'

// ─── InfoIcon ─────────────────────────────────────────────────────────────────
// Click-open info panel. Matches DomainTooltip's small circular "i" affordance
// visually — the user learns one icon convention across the tool — but opens a
// fuller panel for content that exceeds tooltip scale (multi-section teaching,
// longer prose). Closes on outside click and Escape.
//
// Props:
//   label    string  — short ARIA label (e.g. "About this step")
//   title    string  — panel header (e.g. "About this step")
//   children React   — panel body content
//   align    'left'|'right' — which edge of the icon the panel hangs from
//
// Usage:
//   <InfoIcon label="About this step" title="About this step">
//     <h4>Why we do this</h4>
//     <p>...</p>
//   </InfoIcon>

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

export function InfoIcon({ label = 'More info', title, children, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const panelStyle = {
    position:     'absolute',
    top:          'calc(100% + 10px)',
    [align]:      0,
    zIndex:       9999,
    background:   '#FAFAF7',
    border:       '1.5px solid rgba(200,146,42,0.45)',
    borderRadius: '12px',
    padding:      '20px 22px',
    width:        'min(360px, 90vw)',
    boxShadow:    '0 12px 36px rgba(15,21,35,0.18)',
    textAlign:    'left',
  }

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label={label}
        aria-expanded={open}
        style={{
          background:    'none',
          border:        '1px solid rgba(200,146,42,0.45)',
          borderRadius:  '50%',
          width:         '16px',
          height:        '16px',
          padding:       0,
          cursor:        'pointer',
          display:       'inline-flex',
          alignItems:    'center',
          justifyContent: 'center',
          flexShrink:    0,
          lineHeight:    1,
          verticalAlign: 'middle',
        }}
      >
        <span style={{ ...sc, fontSize: '13px', color: '#A8721A', lineHeight: 1 }}>i</span>
      </button>

      {open && (
        <div style={panelStyle} role="dialog" aria-label={label}>
          {title && (
            <div style={{
              ...sc,
              fontSize:      '13px',
              letterSpacing: '0.18em',
              color:         '#A8721A',
              textTransform: 'uppercase',
              marginBottom:  '12px',
              paddingBottom: '10px',
              borderBottom:  '1px solid rgba(200,146,42,0.15)',
            }}>
              {title}
            </div>
          )}
          <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.78)', lineHeight: 1.7 }}>
            {children}
          </div>
        </div>
      )}
    </span>
  )
}
