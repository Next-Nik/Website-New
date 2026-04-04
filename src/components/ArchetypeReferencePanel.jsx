import { useState, useEffect } from 'react'

const ARCHETYPES = [
  {
    name: 'Steward',
    signal: 'Tends systems, ensures they remain whole. Patient with operational work others find tedious. The person who keeps things running.',
    shadow: 'Can become invisible — so focused on maintaining the container that their own needs and contributions go unrecognised, including by themselves.',
  },
  {
    name: 'Maker',
    signal: 'Builds what doesn\'t exist yet. Concept to creation. Comfortable with iteration and the mess of making.',
    shadow: 'Can chase the next build before fully completing the current one. Restlessness as identity rather than genuine forward motion.',
  },
  {
    name: 'Architect',
    signal: 'Designs the structural conditions that determine what can be built. Doesn\'t build the thing — designs the container the thing lives inside.',
    shadow: 'Can become abstract. Systems thinking without ground contact. Designing for elegance rather than lived reality.',
  },
  {
    name: 'Connector',
    signal: 'Weaves relationships and creates networks. Sees who needs who before either party does. Facilitates without dominating.',
    shadow: 'Can over-rely on relational capital. Connecting as avoidance of their own direct contribution. Busy being useful without doing their own work.',
  },
  {
    name: 'Guardian',
    signal: 'Protects what matters, holds boundaries, recognises threats early. Fierce protecting, gentle tending.',
    shadow: 'Can become reactive. Threat-detection so calibrated it fires on safe inputs. Protection as control in disguise.',
  },
  {
    name: 'Explorer',
    signal: 'Ventures into unknown territory and brings back what\'s needed. Comfortable with uncertainty and first principles.',
    shadow: 'Can disappear into the frontier and never return. Discovery as a way of avoiding the harder work of integration and delivery.',
  },
  {
    name: 'Sage',
    signal: 'Holds wisdom and offers perspective that clarifies. Sees patterns across time. Values understanding over premature action.',
    shadow: 'Can withhold. Wisdom hoarded rather than offered. Or offered at such a remove from the lived moment it lands as abstract rather than useful.',
  },
  {
    name: 'Mirror',
    signal: 'Contributes by reflecting what is true — about human experience, the interior life, the living world — in ways others can finally see and receive.',
    shadow: 'Can lose themselves in reflection. So attuned to others\' experience that their own disappears. The invisible presence.',
  },
  {
    name: 'Exemplar',
    signal: 'Contributes by being the example. Raises the standard of what is possible by embodying it fully — in public, under pressure, at the edge.',
    shadow: 'Can become performance. The standard held for others but not for self. Or the weight of being the example becoming its own kind of cage.',
  },
]

export function ArchetypeReferencePanel() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {/* Left edge tab */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Archetype Reference"
        style={{
          position: 'fixed',
          left: open ? '-60px' : '-14px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1500,
          background: '#FAFAF7',
          border: '1.5px solid rgba(200,146,42,0.78)',
          width: '44px',
          height: '88px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'all 0.25s ease',
          clipPath: 'polygon(0% 12%, 0% 88%, 30% 100%, 100% 100%, 100% 0%, 30% 0%)',
          borderRadius: '0 12px 12px 0',
        }}
      >
        <span style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          fontFamily: "'Cormorant SC', Georgia, serif",
          fontSize: '13px',
          letterSpacing: '0.18em',
          color: '#A8721A',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}>
          Archetypes
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(15,21,35,0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
          }}
        >
          {/* Panel */}
          <div style={{
            width: 'min(500px, 92vw)',
            height: '100%',
            background: '#FAFAF7',
            borderRight: '1.5px solid rgba(200,146,42,0.3)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInLeft 0.25s ease',
          }}>
            {/* Header */}
            <div style={{
              padding: '28px 24px 20px',
              borderBottom: '1px solid rgba(200,146,42,0.18)',
              position: 'sticky',
              top: 0,
              background: '#FAFAF7',
              zIndex: 1,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Purpose Piece
                </span>
                <h2 style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, marginBottom: '4px' }}>
                  The Nine Archetypes
                </h2>
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.8125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
                  Signal {'\u00B7'} Shadow {'\u00B7'} Nine patterns of contribution
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'rgba(15,21,35,0.72)',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {'\u00D7'}
              </button>
            </div>

            {/* Intro */}
            <div style={{ padding: '16px 24px 8px' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.875rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.7 }}>
                Each archetype is a natural role {'\u2014'} a distinct pattern of how a person moves through groups and systems. The signal is the gift. The shadow is what it costs when the gift is overplayed or misapplied.
              </p>
            </div>

            {/* Archetypes */}
            <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ARCHETYPES.map(archetype => {
                const isOpen = expanded === archetype.name
                return (
                  <div
                    key={archetype.name}
                    style={{
                      borderRadius: '14px',
                      background: isOpen ? 'rgba(200,146,42,0.06)' : 'rgba(200,146,42,0.02)',
                      border: `1.5px solid ${isOpen ? 'rgba(200,146,42,1)' : 'rgba(200,146,42,0.78)'}`,
                      boxShadow: isOpen ? '0 4px 16px rgba(15,21,35,0.72)' : '0 1px 4px rgba(15,21,35,0.72)',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => setExpanded(isOpen ? null : archetype.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '13px 18px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1rem', color: '#A8721A', lineHeight: 1.2 }}>
                        {archetype.name}
                      </span>
                      <span style={{ color: '#A8721A', fontSize: '0.875rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : '' }}>
                        →
                      </span>
                    </button>

                    {isOpen && (
                      <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ padding: '10px 14px', background: 'rgba(200,146,42,0.06)', borderLeft: '2px solid rgba(200,146,42,0.55)', borderRadius: '0 6px 6px 0' }}>
                          <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '5px' }}>
                            Signal
                          </div>
                          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.8125rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.6 }}>
                            {archetype.signal}
                          </p>
                        </div>
                        <div style={{ padding: '10px 14px', background: 'rgba(15,21,35,0.72)', borderLeft: '2px solid rgba(15,21,35,0.72)', borderRadius: '0 6px 6px 0' }}>
                          <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.72)', textTransform: 'uppercase', marginBottom: '5px' }}>
                            Shadow
                          </div>
                          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.8125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
                            {archetype.shadow}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px 32px', borderTop: '1px solid rgba(200,146,42,0.12)', marginTop: 'auto' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65 }}>
                The nine archetypes are locked. Every person maps to a primary pattern. The Purpose Piece conversation identifies which one fits most naturally.
              </p>
            </div>
          </div>

          {/* Close tab */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close archetypes"
            style={{
              position: 'fixed',
              left: 'min(500px, 92vw)',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2100,
              background: '#FAFAF7',
              border: '1.5px solid rgba(200,146,42,0.78)',
              borderLeft: 'none',
              width: '44px',
              height: '88px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              clipPath: 'polygon(28% 12%, 28% 88%, 30% 100%, 100% 100%, 100% 0%, 30% 0%)',
              borderRadius: '0 12px 12px 0',
            }}
          >
            <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', color: '#A8721A' }}>{'\u00D7'}</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}
