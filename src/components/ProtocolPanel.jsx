import { useState, useEffect } from 'react'

const PHASES = [
  {
    number: '01',
    name: 'Baseline',
    tagline: 'Where are you right now?',
    description: 'The practice opens with a check-in — not to fix anything, but to register the current state honestly. Baseline is about contact: meeting yourself where you actually are before anything else happens. The flame slider captures this moment.',
    why: "You can't navigate from a false position. Most practices skip this step and build on an assumed state that doesn't match reality. Baseline closes that gap.",
    duration: '2 \u2013 3 min',
  },
  {
    number: '02',
    name: 'Calibration',
    tagline: 'Agency, temporal clarity, and directional awareness.',
    description: 'The audio guides you from the raw signal of Baseline into a wider orientation. You locate yourself in the present moment \u2014 body, breath, environment. Nothing is forced. The nervous system registers that it is safe to be here, now.',
    why: 'Regulation precedes clear thinking. When the system is dysregulated, perception narrows and honest self-assessment becomes unreliable. Calibration creates the conditions for everything else.',
    duration: '5 \u2013 8 min',
  },
  {
    number: '03',
    name: 'Embodying',
    tagline: 'Land it. Carry it forward.',
    description: 'The final phase integrates what has moved during the practice. This is not a wind-down \u2014 it is a deliberate transition back to life, bringing the regulated state with you rather than leaving it behind in the session.',
    why: "Practices that don't close properly tend not to transfer. Embodying is the mechanism by which the Foundation session becomes a living resource rather than a moment that disappears on re-entry to the day.",
    duration: '3 \u2013 5 min',
  },
]

export function ProtocolPanel() {
  const [open, setOpen] = useState(false)

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
        aria-label="Open Protocol"
        className="protocol-tab"
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
          fontSize: '15px',
          letterSpacing: '0.18em',
          color: '#A8721A',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}>
          Protocol
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
            width: 'min(480px, 92vw)',
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
                <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Foundation
                </span>
                <h2 style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, marginBottom: '4px' }}>
                  The Protocol
                </h2>
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
                  Three phases {'\u00B7'} Why the order matters
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
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.7 }}>
                Foundation follows a non-negotiable sequence. Each phase creates the conditions the next requires. You cannot skip to Embodying from a dysregulated state and expect it to hold.
              </p>
            </div>

            {/* Phases */}
            <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {PHASES.map((phase, i) => (
                <div key={phase.number} style={{ position: 'relative' }}>
                  {/* Connector line */}
                  {i < PHASES.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: '27px',
                      top: '100%',
                      width: '1px',
                      height: '12px',
                      background: 'rgba(200,146,42,0.35)',
                    }} />
                  )}
                  <div style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    background: 'rgba(200,146,42,0.02)',
                    border: '1.5px solid rgba(200,146,42,0.78)',
                    boxShadow: '0 1px 4px rgba(15,21,35,0.72)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '10px' }}>
                      <span style={{
                        fontFamily: "'Cormorant SC', Georgia, serif",
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: '#A8721A',
                        lineHeight: 1,
                        minWidth: '24px',
                        marginTop: '2px',
                      }}>
                        {phase.number}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', color: '#A8721A', lineHeight: 1.2 }}>
                            {phase.name}
                          </span>
                          <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.72)', textTransform: 'uppercase', flexShrink: 0 }}>
                            {phase.duration}
                          </span>
                        </div>
                        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.4 }}>
                          {phase.tagline}
                        </div>
                      </div>
                    </div>

                    <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.6, marginBottom: '10px' }}>
                      {phase.description}
                    </p>

                    <div style={{ padding: '9px 12px', background: 'rgba(200,146,42,0.06)', borderLeft: '2px solid rgba(200,146,42,0.45)', borderRadius: '0 6px 6px 0' }}>
                      <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.16em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Why this comes here
                      </div>
                      <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.88)', lineHeight: 1.55 }}>
                        {phase.why}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px 32px', borderTop: '1px solid rgba(200,146,42,0.12)', marginTop: 'auto' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65 }}>
                The sequence is the practice. Run it in order, every time. Consistency of sequence matters more than consistency of duration.
              </p>
            </div>
          </div>

          {/* Close tab */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close protocol"
            style={{
              position: 'fixed',
              left: 'min(480px, 92vw)',
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
            <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', color: '#A8721A' }}>{'\u00D7'}</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @media (max-width: 640px) {
          .protocol-tab { left: -8px !important; }
        }
      `}</style>
    </>
  )
}
