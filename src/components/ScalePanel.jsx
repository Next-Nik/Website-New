import { useState, useEffect } from 'react'

const SCALE = [
  { score: 10,  tier: 'World-Class',  label: 'Best in the world',          meaning: 'Complete coherence. Effortless mastery, luminous presence, contribution that uplifts others. The art and the artist are one.',  zone: 'development' },
  { score: 9.5, tier: 'Exemplar+',    label: 'Elite professional',          meaning: 'Integrated and at ease. Leads by example; influence radiates naturally.',                                                            zone: 'development' },
  { score: 9,   tier: 'Exemplar',     label: 'Professional',                meaning: 'Deeply skilled, balanced, reliable. Excellence feels natural and sustainable.',                                                       zone: 'development' },
  { score: 8.5, tier: 'Fluent+',      label: 'Elite ranked amateur',        meaning: 'Competence meets wisdom; growth through curiosity and depth.',                                                                         zone: 'development' },
  { score: 8,   tier: 'Fluent',       label: 'High level ranked amateur',   meaning: 'Solid foundations, steady excellence, self-aware and grounded.',                                                                       zone: 'development' },
  { score: 7.5, tier: 'Capable+',     label: 'Elite recreational player',   meaning: 'Consistent progress; confidence building through deliberate practice.',                                                                zone: 'development' },
  { score: 7,   tier: 'Capable',      label: 'High level recreational player', meaning: 'Dependable, engaged, purposeful.',                                                                                                 zone: 'development' },
  { score: 6.5, tier: 'Functional+',  label: 'Elite casual athlete',        meaning: 'Mostly consistent; stabilising habits, pacing energy.',                                                                                zone: 'development' },
  { score: 6,   tier: 'Functional',   label: 'Casual athlete',              meaning: 'Competent, responsible; maintaining, sometimes fatigued.',                                                                             zone: 'development' },
  { score: 5.5, tier: 'Plateau+',     label: 'Making an effort (occasionally)', meaning: 'Curiosity stirring; ready to move again.',                                                                                       zone: 'development' },
  { score: 5,   tier: 'THE LINE',     label: null,                          meaning: 'Development sits above. Healing sits below. The Line is yours.',                                                                      zone: 'line' },
  { score: 4.5, tier: 'Friction+',    label: 'Teetering on the edge',       meaning: 'Restless recognition that change is due.',                                                                                             zone: 'healing' },
  { score: 4,   tier: 'Friction',     label: 'Attempting to get off the couch', meaning: 'Desire present, momentum low; self-judgment softening into openness.',                                                           zone: 'healing' },
  { score: 3.5, tier: 'Strain+',      label: 'Leaving an indent on the couch', meaning: 'Inconsistent, overwhelmed, starting to see the cycle.',                                                                           zone: 'healing' },
  { score: 3,   tier: 'Strain',       label: 'Afraid to look in the mirror', meaning: 'Energy collapsed inward; fear or shame active. Needs rest, not force.',                                                              zone: 'healing' },
  { score: 2.5, tier: 'Crisis+',      label: 'Danger to oneself',           meaning: 'High stress, low support; survival instincts active.',                                                                                zone: 'healing' },
  { score: 2,   tier: 'Crisis',       label: 'Barely functioning',          meaning: 'Basics unmet, clarity lost; exhaustion or anxiety chronic.',                                                                          zone: 'healing' },
  { score: 1.5, tier: 'Emergency+',   label: 'Hurting real bad / numb',     meaning: 'Alternating between intensity and shutdown.',                                                                                          zone: 'healing' },
  { score: 1,   tier: 'Emergency',    label: 'Almost dead',                 meaning: 'Spiritually or emotionally collapsed; light dimmed.',                                                                                  zone: 'healing' },
  { score: 0,   tier: 'Ground Zero',  label: 'In the ground',               meaning: 'End of a cycle. Stillness before rebirth.',                                                                                           zone: 'healing' },
]

const ZONE_COLORS = {
  development: { row: 'rgba(200,146,42,0.03)', tier: '#A8721A',   meaning: 'rgba(15,21,35,0.72)' },
  line:        { row: 'rgba(200,146,42,0.08)', tier: '#A8721A',   meaning: 'rgba(15,21,35,0.72)' },
  healing:     { row: 'rgba(15,21,35,0.72)', tier: '#6B5040',    meaning: 'rgba(15,21,35,0.72)' },
}

export function ScalePanel({ side = 'left' }) {
  const [open, setOpen] = useState(false)
  const isRight = side === 'right'

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {/* Edge tab */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Horizon Scale"
        style={{
          position: 'fixed',
          ...(isRight
            ? { right: open ? '-60px' : '-14px', left: 'auto' }
            : { left: open ? '-60px' : '-14px' }),
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
          clipPath: isRight
            ? 'polygon(100% 12%, 100% 88%, 70% 100%, 0% 100%, 0% 0%, 70% 0%)'
            : 'polygon(0% 12%, 0% 88%, 30% 100%, 100% 100%, 100% 0%, 30% 0%)',
          borderRadius: isRight ? '12px 0 0 12px' : '0 12px 12px 0',
        }}
      >
        <span style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          fontFamily: "'Cormorant SC', Georgia, serif",
          fontSize: '1.25rem',
          letterSpacing: '0.18em',
          color: '#A8721A',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}>
          Scale
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
            justifyContent: isRight ? 'flex-end' : 'flex-start',
          }}
        >
          {/* Panel */}
          <div style={{
            width: 'min(480px, 92vw)',
            height: '100%',
            background: '#FAFAF7',
            borderRight: isRight ? 'none' : '1.5px solid rgba(200,146,42,0.3)',
            borderLeft: isRight ? '1.5px solid rgba(200,146,42,0.3)' : 'none',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            animation: isRight ? 'slideInRight 0.25s ease' : 'slideInLeft 0.25s ease',
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
                  The Horizon Scale
                </h2>
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
                  Fulfilment calibration {'\u00B7'} 0{'\u2013'}10
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
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.78)', lineHeight: 1.7, marginBottom: '8px' }}>
                Each domain of your life is scored against this scale. The scale has two zones separated by The Line at 5. Development sits above {'\u2014'} growing, building, expressing. Healing sits below {'\u2014'} restoration, repair, return.
              </p>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.3125rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65 }}>
                The Line is yours. You build the character who represents 10. You name where you actually are.
              </p>
            </div>

            {/* Zone label: Development */}
            <div style={{ padding: '16px 24px 8px' }}>
              <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '4px' }}>
                Development
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>
                above The Line {'\u2014'} growing, building, expressing
              </div>
            </div>

            {/* Scale rows */}
            <div style={{ padding: '0 16px 24px' }}>
              {SCALE.map((row, i) => {
                const colors = ZONE_COLORS[row.zone]
                const isLine = row.zone === 'line'
                const isHealingStart = row.zone === 'healing' && SCALE[i - 1]?.zone === 'line'

                return (
                  <div key={row.score}>
                    {isHealingStart && (
                      <div style={{ padding: '16px 8px 8px' }}>
                        <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.18em', color: '#6B5040', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Healing
                        </div>
                        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>
                          below The Line {'\u2014'} restoration, repair, return
                        </div>
                      </div>
                    )}

                    {isLine ? (
                      <div style={{
                        margin: '8px 0',
                        padding: '10px 12px',
                        background: 'rgba(200,146,42,0.08)',
                        border: '1px solid rgba(200,146,42,0.35)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}>
                        <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '1.25rem', fontWeight: 600, color: '#A8721A', minWidth: '28px' }}>5</span>
                        <div>
                          <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.12em', color: '#A8721A', textTransform: 'uppercase' }}>
                            The Line
                          </div>
                          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)', marginTop: '2px' }}>
                            {row.meaning}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 1fr',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: i % 2 === 0 ? colors.row : 'transparent',
                        marginBottom: '2px',
                      }}>
                        <span style={{
                          fontFamily: "'Cormorant SC', Georgia, serif",
                          fontSize: '1.3125rem',
                          fontWeight: 600,
                          color: colors.tier,
                          paddingTop: '1px',
                        }}>
                          {row.score}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.08em', color: colors.tier }}>
                              {row.tier}
                            </span>
                            {row.label && (
                              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>
                                {row.label}
                              </span>
                            )}
                          </div>
                          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: colors.meaning, lineHeight: 1.55 }}>
                            {row.meaning}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer note */}
            <div style={{ padding: '16px 24px 32px', borderTop: '1px solid rgba(200,146,42,0.12)', marginTop: 'auto' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65 }}>
                Any score below 5 means this domain is actively creating friction {'\u2014'} consuming more than it generates. Stabilise before optimising.
              </p>
            </div>
          </div>

          {/* Close tab on edge of panel */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close scale"
            style={{
              position: 'fixed',
              ...(isRight
                ? { right: 'min(480px, 92vw)', left: 'auto' }
                : { left: 'min(480px, 92vw)' }),
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2100,
              background: '#FAFAF7',
              border: '1.5px solid rgba(200,146,42,0.78)',
              borderLeft: isRight ? '1.5px solid rgba(200,146,42,0.78)' : 'none',
              borderRight: isRight ? 'none' : '1.5px solid rgba(200,146,42,0.78)',
              width: '44px',
              height: '120px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              clipPath: isRight
                ? 'polygon(0% 0%, 72% 0%, 72% 12%, 100% 12%, 100% 88%, 72% 88%, 72% 100%, 0% 100%)'
                : 'polygon(28% 12%, 28% 88%, 30% 100%, 100% 100%, 100% 0%, 30% 0%)',
              borderRadius: isRight ? '12px 0 0 12px' : '0 12px 12px 0',
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
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        #scale-tab:hover {
          background: rgba(200,146,42,0.06);
          border-color: #A8721A;
        }
      `}</style>
    </>
  )
}
