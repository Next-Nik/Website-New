import { useState, useEffect } from 'react'

const DOMAINS = [
  {
    name: 'Path',
    question: 'What is this life actually for? Am I moving toward work that feels genuinely mine, or carrying someone else\'s idea of what I should be doing?',
    description: 'Contribution, calling, and the work you\'re here to do. Not job title — the through-line of meaningful contribution beneath whatever you\'re currently doing.',
  },
  {
    name: 'Spark',
    question: 'When did I last feel genuinely alive? What has been draining it — and is there anything I\'m not admitting is costing me more than it gives?',
    description: 'The animating fire. Aliveness, joy, play, and the godspark. When Spark is low, everything else runs on fumes.',
  },
  {
    name: 'Body',
    question: 'What is my body asking for that I keep deferring? Is the way I\'m living in this vessel sustainable for the long arc I\'m building toward?',
    description: 'Physical health, energy, and embodied experience. The vessel through which everything else operates.',
  },
  {
    name: 'Finances',
    question: 'Am I making decisions from sufficiency or scarcity? Does money move with intention, or does anxiety make most of the calls?',
    description: 'Your relationship with resources — whether money flows with intention or anxiety, whether decisions come from sufficiency or scarcity.',
  },
  {
    name: 'Relationships',
    question: 'Are the people closest to me genuinely known to me — and am I genuinely known to them? Is there connection here, or just proximity?',
    description: 'Intimacy, friendship, community, and belonging. The quality of connection, not just its presence.',
  },
  {
    name: 'Inner Game',
    question: 'What story about myself is quietly running the room? Is that story still true — or just familiar?',
    description: 'Your internal world. Mindset, beliefs, emotional patterns, and the quality of your relationship with yourself.',
  },
  {
    name: 'Outer Game',
    question: 'Do my daily structures support the life I\'m trying to build, or are they left over from a version of me that no longer exists?',
    description: 'How you show up in the world. Habits, systems, environment, and the structures that support or hinder your life.',
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
                <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Life OS
                </span>
                <h2 style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, marginBottom: '4px' }}>
                  The Seven Domains
                </h2>
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.8125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
                  Stewardship questions for each domain
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
                Life OS maps seven domains of a full life. Each domain has a stewardship question {'\u2014'} the honest question to sit with when assessing where you actually are.
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
                      <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.8125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.55 }}>
                          {domain.description}
                        </p>
                        <div style={{ padding: '10px 14px', background: 'rgba(200,146,42,0.06)', borderLeft: '2px solid rgba(200,146,42,0.55)', borderRadius: '0 6px 6px 0' }}>
                          <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '5px' }}>
                            Stewardship question
                          </div>
                          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.8125rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.65 }}>
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
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65 }}>
                Seven domains, seven honest questions. The Map scores them. Orienteering starts with whichever one is most alive right now.
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
