// ─────────────────────────────────────────────────────────────
// DomainsPanel — WORK IN PROGRESS
// Not yet wired or tested. Not imported anywhere.
// Planned as mission control panel for the tool suite.
// Do not use until this header is removed.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { DomainTooltip, LIFEOS_LABEL_MAP } from './DomainTooltip'

const DOMAINS = [
  {
    name: 'Path',
    question: 'Am I walking my path — or just walking?',
    description: "Your contribution, calling, and the work you're here to do. Not your job title — the thread of purpose running beneath whatever you're currently doing. Life's mission: the gift you came to bring, the role that belongs to you specifically.",
  },
  {
    name: 'Spark',
    question: "When did I last feel genuinely alive — and what's been costing me that?",
    description: 'The animating fire. The things that make you feel genuinely alive — not just occupied. Spark is regeneration: soul nourishment that sends you back into the world more alive than you arrived. When Spark is low, everything else runs on fumes.',
  },
  {
    name: 'Body',
    question: 'Am I honouring this instrument — or running it into the ground?',
    description: 'Your physical instrument. The vessel through which everything else operates — and the one thing you cannot outsource, replace, or defer indefinitely. Not about aesthetics. About whether the instrument is being honoured.',
  },
  {
    name: 'Finances',
    question: 'Do I have the agency to act on what matters?',
    description: "The currency that gives you the capacity to act. Not just money — the resources, mobility, and agency to convert your visions into reality and your desires into choices. When it flows, things move. When it's blocked, everything stalls.",
  },
  {
    name: 'Connection',
    question: 'Am I truly known by anyone — and am I truly knowing them?',
    description: 'How you inhabit connection across the full range of your relational life. Not just the presence of people — the quality of the connection. Intimate partnership, friendship, family, collaborators, community. Are you genuinely known?',
  },
  {
    name: 'Inner Game',
    question: 'What story about myself is quietly running the room — and is that story still true?',
    description: "Your relationship with yourself. The beliefs, stories, values, and emotional patterns you carry about who you are and what you're capable of. The source code — everything else runs on it. Inner Game shapes the floor and ceiling of every other domain.",
  },
  {
    name: 'Signal',
    question: "Is what I'm broadcasting aligned with who I actually am?",
    description: "Your external world: environment, appearance, presence, and public-facing persona. Where inner alignment meets the world's perception of you — and the two need to match. Not as performance. As honest expression.",
  },
]

export function DomainsPanel() {
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
        aria-label="Open Domains"
        style={{
          position: 'fixed',
          left: open ? '-60px' : '-14px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1500,
          background: '#FAFAF7',
          border: '1.5px solid rgba(200,146,42,0.78)',
          width: '44px',
          height: '120px',
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
          letterSpacing: '0.14em',
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
                  Horizon Suite
                </span>
                <h2 style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, marginBottom: '4px' }}>
                  The Seven Domains
                </h2>
                <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
                  Life's mission questions for each domain
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
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.7 }}>
                The Horizon Suite maps seven domains of a full life. Each domain holds a life's mission question {'—'} the honest question to sit with, not once, but again and again.
              </p>
            </div>

            {/* Domains */}
            <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DOMAINS.map((domain, i) => {
                const isOpen = expanded === domain.name
                return (
                  <div
                    key={domain.name}
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
                      onClick={() => setExpanded(isOpen ? null : domain.name)}
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
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)', minWidth: '18px' }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', color: '#A8721A', lineHeight: 1.2, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {domain.name}
                          <DomainTooltip domainKey={LIFEOS_LABEL_MAP[domain.name]} system="nextus-self" position="below" />
                        </span>
                      </div>
                      <span style={{ color: '#A8721A', fontSize: '1.3125rem', flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : '' }}>
                        →
                      </span>
                    </button>

                    {isOpen && (
                      <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.55 }}>
                          {domain.description}
                        </p>
                        <div style={{ padding: '10px 14px', background: 'rgba(200,146,42,0.06)', borderLeft: '2px solid rgba(200,146,42,0.55)', borderRadius: '0 6px 6px 0' }}>
                          <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.16em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '5px' }}>
                            Life's mission question
                          </div>
                          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.65 }}>
                            {domain.question}
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
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65 }}>
                Seven domains, seven life's mission questions. The Map scores them. Orienteering starts with whichever one is most alive right now.
              </p>
            </div>
          </div>

          {/* Close tab */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close domains"
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
              height: '120px',
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
      `}</style>
    </>
  )
}
