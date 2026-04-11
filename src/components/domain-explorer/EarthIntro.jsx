import { useEffect, useRef, useState } from 'react'

const VIDEO_URL = '/earth-rotation.mp4'

// Measured values from position debug tool
// All as percentages of the .app container
const GLOBE = { x: 27,   y: 20,  size: 265 }
const ORB   = { x: 30.5, y: 23,  size: 158 }

// Easing
function easeInOut(t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2 }
function easeIn(t)    { return t * t * t }

export function EarthIntro({ onEntered }) {
  const rafRef       = useRef(null)
  const startRef     = useRef(null)

  const [phase,  setPhase]  = useState('idle')   // idle | morphing | done
  const [t,      setT]      = useState(0)         // 0→1 morph progress
  const [show,   setShow]   = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 400)
    return () => clearTimeout(timer)
  }, [])

  // Morph animation
  useEffect(() => {
    if (phase !== 'morphing') return
    startRef.current = null

    let enteredFired = false
    function tick(ts) {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / 900, 1)
      setT(progress)

      // Fire onEntered when globe reaches the orb — hep starts blooming
      if (!enteredFired && progress >= 0.85) {
        enteredFired = true
        onEntered()
      }

      if (progress >= 1) {
        setPhase('done')
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, onEntered])

  function handleClick() {
    if (phase !== 'idle') return
    setPhase('morphing')
  }

  if (phase === 'done') return null

  // Interpolate position and size
  const ease    = easeInOut(t)
  const easeI   = easeIn(t)
  const curX    = GLOBE.x    + (ORB.x    - GLOBE.x)    * ease
  const curY    = GLOBE.y    + (ORB.y    - GLOBE.y)    * ease
  const curSize = GLOBE.size + (ORB.size - GLOBE.size) * ease

  // Fade everything else out as morph progresses
  const bgAlpha      = phase === 'morphing' ? Math.max(0, 1 - easeI * 1.4) : 1
  const contentAlpha = phase === 'morphing' ? Math.max(0, 1 - t * 3) : 1
  const textAlpha    = show && phase === 'idle' ? 1 : 0

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute', inset: 0, zIndex: 20,
        background: `rgba(0,0,0,${bgAlpha})`,
        cursor: phase === 'idle' ? 'pointer' : 'default',
        userSelect: 'none',
        pointerEvents: phase === 'morphing' ? 'none' : 'auto',
      }}
    >
      {/* Video — fades out as morph begins */}
      <div style={{
        position: 'absolute',
        left: `calc(${GLOBE.x}% - ${GLOBE.size/2}px)`,
        top:  `calc(${GLOBE.y}% - ${GLOBE.size/2}px)`,
        width: `${GLOBE.size}px`,
        height: `${GLOBE.size}px`,
        opacity: contentAlpha,
        borderRadius: '50%',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <video
          src={VIDEO_URL}
          autoPlay loop muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* Morphing circle — starts as globe, shrinks to orb */}
      {phase === 'morphing' && (
        <div style={{
          position: 'absolute',
          left: `calc(${curX}% - ${curSize/2}px)`,
          top:  `calc(${curY}% - ${curSize/2}px)`,
          width:  `${curSize}px`,
          height: `${curSize}px`,
          borderRadius: '50%',
          border: `${1.5 + (1 - ease)}px solid rgba(200,146,42,${0.4 + ease * 0.4})`,
          background: 'rgba(255,255,255,0.95)',
          pointerEvents: 'none',
          // Gold "Our Planet" text fades in as it approaches the orb
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {t > 0.6 && (
            <span style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: `${Math.max(8, curSize * 0.17)}px`,
              fontWeight: 300,
              color: '#A8721A',
              textAlign: 'center',
              lineHeight: 1.3,
              letterSpacing: '0.04em',
              opacity: (t - 0.6) / 0.4,
              pointerEvents: 'none',
              userSelect: 'none',
            }}>Our<br/>Planet</span>
          )}
        </div>
      )}

      {/* Tagline */}
      <div style={{
        position: 'absolute',
        left: `calc(${GLOBE.x}% - 160px)`,
        top:  `calc(${GLOBE.y}% + ${GLOBE.size/2 + 18}px)`,
        width: '320px',
        textAlign: 'center',
        opacity: textAlpha,
        transform: textAlpha === 1 ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.9s ease, transform 0.9s ease',
        pointerEvents: 'none',
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 'clamp(14px,2.8vw,17px)', fontWeight: 300,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.8, letterSpacing: '0.04em',
          margin: 0,
        }}>
          Our planet.<br />Our privilege.<br />Our responsibility.
        </p>
      </div>

      {/* Enter prompt */}
      <div style={{
        position: 'absolute',
        left: `calc(${GLOBE.x}% - 40px)`,
        top:  `calc(${GLOBE.y}% + ${GLOBE.size/2 + 100}px)`,
        width: '80px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '8px',
        opacity: textAlpha,
        transition: 'opacity 0.7s ease 0.5s',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '1.5px solid rgba(200,146,42,0.60)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'earthPulse 2.2s ease-in-out infinite',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C8922A' }}/>
        </div>
        <span style={{
          fontFamily: "'Cormorant SC', Georgia, serif",
          fontSize: '12px', letterSpacing: '0.22em', color: 'rgba(200,146,42,0.60)',
        }}>Enter</span>
      </div>

      <style>{`
        @keyframes earthPulse {
          0%,100% { transform:scale(1);    opacity:.6 }
          50%      { transform:scale(1.15); opacity:1  }
        }
      `}</style>
    </div>
  )
}
