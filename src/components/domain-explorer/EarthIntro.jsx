import { useEffect, useRef, useState } from 'react'

const VIDEO_URL = '/earth-rotation.mp4'

// Measured values from position debug tool (% of .app container)
const GLOBE = { x: 27,   y: 20,  size: 310 }
const ORB   = { x: 30.5, y: 23,  size: 158 }

function easeInOut(t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2 }

export function EarthIntro({ onEntered }) {
  const rafRef   = useRef(null)
  const startRef = useRef(null)

  const [phase, setPhase] = useState('idle')
  const [t,     setT]     = useState(0)
  const [show,  setShow]  = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 400)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (phase !== 'morphing') return
    startRef.current = null
    let enteredFired = false

    function tick(ts) {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / 1200, 1)
      setT(progress)
      if (!enteredFired && progress >= 0.85) {
        enteredFired = true
        onEntered()
      }
      if (progress >= 1) { setPhase('done'); return }
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

  const ease    = easeInOut(t)
  const curX    = GLOBE.x    + (ORB.x    - GLOBE.x)    * ease
  const curY    = GLOBE.y    + (ORB.y    - GLOBE.y)    * ease
  const curSize = GLOBE.size + (ORB.size - GLOBE.size) * ease

  const bgAlpha   = phase === 'morphing' ? Math.max(0, 1 - ease * 1.2) : 1
  const textAlpha = show && phase === 'idle' ? 1 : 0

  const globeX    = phase === 'morphing' ? curX    : GLOBE.x
  const globeY    = phase === 'morphing' ? curY    : GLOBE.y
  const globeSize = phase === 'morphing' ? curSize : GLOBE.size

  const labelAlpha = phase === 'morphing' && t > 0.6 ? (t - 0.6) / 0.4 : 0

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
      {/* Globe — no border, no outline, clean circle clip */}
      <div style={{
        position: 'absolute',
        left: `calc(${globeX}% - ${globeSize/2}px)`,
        top:  `calc(${globeY}% - ${globeSize/2}px)`,
        width:  `${globeSize}px`,
        height: `${globeSize}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
        pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        willChange: 'left, top, width, height',
        isolation: 'isolate',
        WebkitMaskImage: '-webkit-radial-gradient(white, black)',
      }}>
        <video
          src={VIDEO_URL}
          autoPlay loop muted playsInline
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '205%', height: 'auto',
            display: 'block',
            border: 'none', outline: 'none',
          }}
        />
        {labelAlpha > 0 && (
          <span style={{
            position: 'relative', zIndex: 2,
            fontFamily: "'Lora', Georgia, serif",
            fontSize: `${Math.max(8, globeSize * 0.17)}px`,
            fontWeight: 300, color: '#A8721A',
            textAlign: 'center', lineHeight: 1.3,
            letterSpacing: '0.04em', opacity: labelAlpha,
            userSelect: 'none',
          }}>Our<br/>Planet</span>
        )}
      </div>

      {/* Tagline + Enter label — fades in at idle, fades out on morph start */}
      <div style={{
        position: 'absolute',
        left: `calc(${GLOBE.x}% + ${GLOBE.size / 2 + 32}px)`,
        top:  `calc(${GLOBE.y}% - 60px)`,
        width: '260px',
        opacity: textAlpha,
        transform: textAlpha === 1 ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.9s ease, transform 0.9s ease',
        pointerEvents: 'none',
      }}>
        <p style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: 'clamp(14px,2.8vw,19px)', fontWeight: 300,
          color: 'rgba(255,255,255,1)',
          lineHeight: 1.8, letterSpacing: '0.04em',
          margin: '0 0 28px',
        }}>
          Our planet.<br />Our moment.<br />Our move.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '1.5px solid rgba(200,146,42,0.60)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'earthPulse 2.2s ease-in-out infinite',
            flexShrink: 0,
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C8922A' }}/>
          </div>
          <span style={{
            fontFamily: "'Cormorant SC', Georgia, serif",
            fontSize: '13px', letterSpacing: '0.22em', color: 'rgba(200,146,42,0.60)',
          }}>Enter</span>
        </div>
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
