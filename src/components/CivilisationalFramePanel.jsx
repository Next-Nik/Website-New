import { useState, useEffect } from 'react'
import { STATIC_DOMAINS } from './domain-explorer/data'

export function CivilisationalFramePanel() {
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
        aria-label="Open Civilisational Frame"
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
          Domains
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
            width: 'min(520px, 92vw)',
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
                  NextUs
                </span>
                <h2 style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, marginBottom: '4px' }}>
                  The Seven Domains
                </h2>
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.8125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
                  The frame for civilisational work {'\u00B7'} Each with a Horizon Goal
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
                NextUs organises collective life into seven domains. Each domain has a Horizon Goal {'\u2014'} a shared directional picture of what flourishing looks like at civilisational scale.
              </p>
            </div>

            {/* Domain list */}
            <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {STATIC_DOMAINS.map((domain, i) => {
                const isOpen = expanded === domain.id
                return (
                  <div
                    key={domain.id}
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
                      onClick={() => setExpanded(isOpen ? null : domain.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '14px 18px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.72)', minWidth: '18px' }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1rem', color: '#A8721A', lineHeight: 1.2 }}>
                          {domain.name}
                        </span>
                      </div>
                      <span style={{ color: '#A8721A', fontSize: '0.875rem', flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : '' }}>
                        →
                      </span>
                    </button>

                    {isOpen && (
                      <div style={{ padding: '0 18px 16px' }}>
                        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.55, marginBottom: '10px' }}>
                          {domain.description}
                        </p>
                        <div style={{ padding: '10px 14px', background: 'rgba(200,146,42,0.06)', borderLeft: '2px solid rgba(200,146,42,0.55)', borderRadius: '0 6px 6px 0' }}>
                          <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '5px' }}>
                            Horizon Goal
                          </div>
                          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.8125rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.65 }}>
                            {domain.horizonGoal}
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
                Seven domains. Every scale. One map of what humanity is working on {'\u2014'} and what still needs attention.
              </p>
            </div>
          </div>

          {/* Close tab */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close domains"
            style={{
              position: 'fixed',
              left: 'min(520px, 92vw)',
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
