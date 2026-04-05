import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const TOOLS = [
  {
    path: '/tools/orienteering',
    name: 'Orienteering',
    hook: 'Not sure where to start? Start here. A short conversation that reads where you are and points you somewhere real.',
    eyebrow: 'Start here',
  },
  {
    path: '/tools/foundation',
    name: 'Foundation',
    hook: 'Regulated nervous system first. A guided audio practice that builds the internal floor everything else runs on.',
    eyebrow: 'Ground first',
  },
  {
    path: '/tools/map',
    name: 'The Map',
    hook: 'A scored picture of your life across seven domains. See where you are. Set where you\'re going.',
    eyebrow: 'See the whole',
  },
  {
    path: '/tools/purpose-piece',
    name: 'Purpose Piece',
    hook: 'Surfaces the natural role you\'re built to play — archetype, domain, scale. The contribution coordinates.',
    eyebrow: 'Know your role',
  },
  {
    path: '/tools/target-goals',
    name: 'Target Sprint',
    hook: 'One domain. Ninety days. A sprint goal with identity, milestones, and weekly structure built in.',
    eyebrow: 'Build momentum',
  },
]

export function ToolCompassPanel() {
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
        aria-label="Open Tool Compass"
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
          Start
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
                  Life OS
                </span>
                <h2 style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, marginBottom: '4px' }}>
                  Where do I start?
                </h2>
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
                  Five tools. One ecosystem. The right entry depends on where you are.
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
                If you don't know where to begin, begin with Orienteering — it reads your current state and points you somewhere useful. Everything else follows from honest location.
              </p>
            </div>

            {/* Tools */}
            <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {TOOLS.map(tool => (
                <Link
                  key={tool.path}
                  to={tool.path}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'block',
                    padding: '16px 18px',
                    borderRadius: '14px',
                    background: 'rgba(200,146,42,0.02)',
                    border: '1.5px solid rgba(200,146,42,0.78)',
                    textDecoration: 'none',
                    boxShadow: '0 1px 4px rgba(15,21,35,0.72)',
                    transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.72)'
                    e.currentTarget.style.borderColor = 'rgba(200,146,42,1)'
                    e.currentTarget.style.background = 'rgba(200,146,42,0.06)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,21,35,0.72)'
                    e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)'
                    e.currentTarget.style.background = 'rgba(200,146,42,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.16em', color: '#A8721A', textTransform: 'uppercase' }}>
                      {tool.eyebrow}
                    </span>
                    <span style={{ color: '#A8721A', fontSize: '1.3125rem' }}>→</span>
                  </div>
                  <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', color: '#A8721A', marginBottom: '6px', lineHeight: 1.2 }}>
                    {tool.name}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.88)', lineHeight: 1.55 }}>
                    {tool.hook}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Close tab */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close tool compass"
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
      `}</style>
    </>
  )
}
