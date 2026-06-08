import { useEffect, useRef } from 'react'
import {
  SCALE_POINTS,
  TIER_MAP,
  LABEL_MAP,
  SIGNATURE_MAP,
  getScoreColor,
} from '../constants/horizonScale'
import {
  PLANET_LABEL_MAP,
  PLANET_SIGNATURE_MAP,
  PLANET_INTRO,
} from '../constants/horizonScalePlanet'

// ─────────────────────────────────────────────────────────────
// HorizonScaleModal
//
// Shared modal for both personal (self) and civilisational (planet) scales.
// Replaces ScalePanel entirely.
//
// Props:
//   open        boolean          — controlled open state
//   onClose     () => void       — close handler
//   system      'self'|'planet'  — which scale to render (default: 'self')
//   anchorScore number|null      — scroll to and highlight this score on open
//
// SELF_INTRO copy (May 2026) is aligned with the teaching layer drafted for
// The Map: "the Line" at 5, "holding you up" / "asking for attention" — same
// language users encounter on the door page, in the embedded scale view, and
// inside the picker copy. One consistent voice across all surfaces.
// ─────────────────────────────────────────────────────────────

const SELF_INTRO = {
  eyebrow:  'The Map · The Scale',
  title:    'One ruler. Seven readings.',
  subtitle: 'Calibrated to you · 0–10',
  body: [
    'Every score in The Map uses this scale. Zero is suffering. Five is the Line — the threshold between a domain that’s holding you up and a domain that’s pulling on the rest of your life. Ten is the character you describe in Step 1 of each domain.',
    'Same ruler across all seven domains.',
  ],
  aboveLine: { label: 'Above the Line',  note: 'this domain is holding you up — part of the foundation the rest of your life sits on' },
  belowLine: { label: 'Below the Line',  note: 'this domain is asking for attention — pulling on the rest of your life' },
  footer:    'A four and a six aren’t two ticks apart. They’re on different sides of a structural threshold. That’s why the Line matters more than any single number.',
}

// Consistent inline trigger style — import this wherever a scale link is needed
export const SCALE_LINK_STYLE = {
  background:  'none',
  border:      'none',
  padding:     0,
  cursor:      'pointer',
  fontFamily:  "'Lora', Georgia, serif",
  fontSize:    'inherit',
  color:       '#A8721A',
  textDecoration: 'underline',
  textDecorationColor: 'rgba(168,114,26,0.4)',
  textUnderlineOffset: '3px',
}

export function HorizonScaleModal({ open, onClose, system = 'self', anchorScore = null }) {
  const isPlanet   = system === 'planet'
  const intro      = isPlanet ? PLANET_INTRO : SELF_INTRO
  const labelMap   = isPlanet ? PLANET_LABEL_MAP   : LABEL_MAP
  const sigMap     = isPlanet ? PLANET_SIGNATURE_MAP : SIGNATURE_MAP
  const scrollRefs = useRef({})
  const panelRef   = useRef(null)

  // Keyboard close
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Scroll to anchor score after open
  useEffect(() => {
    if (!open || anchorScore === null) return
    const key = Math.round(anchorScore * 2) / 2
    const el  = scrollRefs.current[key]
    if (el && panelRef.current) {
      setTimeout(() => {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 120)
    }
  }, [open, anchorScore])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          zIndex:     2000,
          background: 'rgba(15,21,35,0.72)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display:    'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding:    '40px 16px 40px',
          overflowY:  'auto',
        }}
      >
        {/* Panel */}
        <div
          ref={panelRef}
          onClick={e => e.stopPropagation()}
          style={{
            width:        'min(560px, 100%)',
            background:   '#FAFAF7',
            borderRadius: '12px',
            border:       '1.5px solid rgba(200,146,42,0.25)',
            display:      'flex',
            flexDirection: 'column',
            animation:    'hsModalIn 0.22s ease',
            flexShrink:   0,
          }}
        >
          {/* Header */}
          <div style={{
            padding:      '28px 28px 20px',
            borderBottom: '1px solid rgba(200,146,42,0.15)',
            display:      'flex',
            alignItems:   'flex-start',
            justifyContent: 'space-between',
            position:     'sticky',
            top:          0,
            background:   '#FAFAF7',
            borderRadius: '12px 12px 0 0',
            zIndex:       1,
          }}>
            <div>
              <span style={{
                fontFamily:    "'Cormorant SC', Georgia, serif",
                fontSize:      '13px',
                letterSpacing: '0.2em',
                color:         '#A8721A',
                display:       'block',
                marginBottom:  '6px',
              }}>
                {intro.eyebrow}
              </span>
              <h2 style={{
                fontFamily:   "'Cormorant SC', Georgia, serif",
                fontSize:     '1.5rem',
                fontWeight:   400,
                color:        '#0F1523',
                lineHeight:   1.1,
                marginBottom: '4px',
              }}>
                {intro.title}
              </h2>
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize:   '1rem',
                fontStyle:  'italic',
                color:      'rgba(15,21,35,0.55)',
                lineHeight: 1.5,
              }}>
                {intro.subtitle}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close scale"
              style={{
                background:  'none',
                border:      'none',
                cursor:      'pointer',
                padding:     '4px 6px',
                color:       'rgba(15,21,35,0.55)',
                fontSize:    '1.5rem',
                lineHeight:  1,
                flexShrink:  0,
                marginTop:   '2px',
                borderRadius: '4px',
                transition:  'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(15,21,35,0.8)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(15,21,35,0.45)' }}
            >
              ×
            </button>
          </div>

          {/* Intro body */}
          <div style={{ padding: '20px 28px 8px' }}>
            {intro.body.map((p, i) => (
              <p key={i} style={{
                fontFamily:   "'Lora', Georgia, serif",
                fontSize:     '1rem',
                color:        'rgba(15,21,35,0.72)',
                lineHeight:   1.7,
                marginBottom: i < intro.body.length - 1 ? '12px' : 0,
              }}>
                {p}
              </p>
            ))}
          </div>

          {/* Scale rows */}
          <div style={{ padding: '16px 20px 8px' }}>

            {/* Above line zone label */}
            <div style={{ padding: '4px 8px 12px' }}>
              <span style={{
                fontFamily:    "'Cormorant SC', Georgia, serif",
                fontSize:      '13px',
                letterSpacing: '0.18em',
                color:         '#A8721A',
                textTransform: 'uppercase',
                marginRight:   '8px',
              }}>
                {intro.aboveLine.label}
              </span>
              <span style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize:   '13px',
                color:      'rgba(15,21,35,0.55)',
                fontStyle:  'italic',
              }}>
                {intro.aboveLine.note}
              </span>
            </div>

            {SCALE_POINTS.map((n, i) => {
              const isAnchor  = anchorScore !== null && Math.round(anchorScore * 2) / 2 === n
              const isLine    = n === 5
              const tier      = TIER_MAP[n]
              const label     = labelMap[n]
              const sig       = sigMap[n]
              const col       = getScoreColor(n)
              const isWhole   = Number.isInteger(n)
              const prevN     = SCALE_POINTS[i - 1]
              const showBelow = prevN !== undefined && prevN > 5 && n < 5

              return (
                <div key={n}>
                  {/* Below line zone label */}
                  {showBelow && (
                    <div style={{ padding: '16px 8px 12px' }}>
                      <span style={{
                        fontFamily:    "'Cormorant SC', Georgia, serif",
                        fontSize:      '13px',
                        letterSpacing: '0.18em',
                        color:         'rgba(107,80,64,0.9)',
                        textTransform: 'uppercase',
                        marginRight:   '8px',
                      }}>
                        {intro.belowLine.label}
                      </span>
                      <span style={{
                        fontFamily: "'Lora', Georgia, serif",
                        fontSize:   '13px',
                        color:      'rgba(15,21,35,0.55)',
                        fontStyle:  'italic',
                      }}>
                        {intro.belowLine.note}
                      </span>
                    </div>
                  )}

                  <div
                    ref={el => { scrollRefs.current[n] = el }}
                    style={{
                      display:      'grid',
                      gridTemplateColumns: '36px 1fr',
                      gap:          '10px',
                      padding:      isLine ? '12px 8px' : '8px 8px',
                      borderRadius: '8px',
                      marginBottom: '2px',
                      background:   isAnchor
                        ? 'rgba(200,146,42,0.1)'
                        : isLine
                          ? 'rgba(200,146,42,0.07)'
                          : i % 2 === 0
                            ? 'rgba(15,21,35,0.02)'
                            : 'transparent',
                      border:       isAnchor
                        ? '1px solid rgba(200,146,42,0.35)'
                        : isLine
                          ? '1px solid rgba(200,146,42,0.2)'
                          : '1px solid transparent',
                      transition:   'background 0.2s',
                    }}
                  >
                    {/* Score */}
                    <span style={{
                      fontFamily:  "'Cormorant SC', Georgia, serif",
                      fontSize:    isWhole ? '1.25rem' : '1rem',
                      fontWeight:  600,
                      color:       col,
                      paddingTop:  '2px',
                      lineHeight:  1,
                    }}>
                      {n}
                    </span>

                    {/* Content */}
                    <div>
                      <div style={{
                        display:     'flex',
                        alignItems:  'baseline',
                        gap:         '8px',
                        marginBottom: '3px',
                        flexWrap:    'wrap',
                      }}>
                        <span style={{
                          fontFamily:    "'Cormorant SC', Georgia, serif",
                          fontSize:      '14px',
                          letterSpacing: '0.08em',
                          color:         col,
                          fontWeight:    isLine ? 600 : 400,
                        }}>
                          {tier}
                        </span>
                        {label && (
                          <span style={{
                            fontFamily: "'Lora', Georgia, serif",
                            fontSize:   '14px',
                            fontStyle:  'italic',
                            color:      'rgba(15,21,35,0.6)',
                          }}>
                            {label}
                          </span>
                        )}
                      </div>
                      {sig && (
                        <p style={{
                          fontFamily: "'Lora', Georgia, serif",
                          fontSize:   '13px',
                          color:      'rgba(15,21,35,0.65)',
                          lineHeight: 1.6,
                          margin:     0,
                        }}>
                          {sig}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding:      '16px 28px 28px',
            borderTop:    '1px solid rgba(200,146,42,0.12)',
            marginTop:    '8px',
          }}>
            <p style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize:   '13px',
              color:      'rgba(15,21,35,0.55)',
              lineHeight: 1.65,
              margin:     0,
              fontStyle:  'italic',
            }}>
              {intro.footer}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hsModalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </>
  )
}
