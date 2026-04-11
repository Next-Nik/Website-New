import { useEffect, useRef, useState } from 'react'

const VIDEO_URL = '/earth-rotation.mp4'

export function EarthIntro({ onEntered }) {
  const videoRef     = useRef(null)
  const enterStartRef = useRef(null)
  const rafRef       = useRef(null)

  const [phase,   setPhase]   = useState('earth')   // 'earth' | 'entering' | 'done'
  const [enterT,  setEnterT]  = useState(0)
  const [show,    setShow]    = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 400)
    return () => clearTimeout(t)
  }, [])

  // Fade-out animation on click
  useEffect(() => {
    if (phase !== 'entering') return
    enterStartRef.current = performance.now()

    function tick(ts) {
      const ep = Math.min((ts - enterStartRef.current) / 900, 1)
      setEnterT(ep)
      if (ep >= 1) {
        setPhase('done')
        onEntered()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, onEntered])

  function handleClick() {
    if (phase !== 'earth') return
    setPhase('entering')
  }

  if (phase === 'done') return null

  const bgAlpha    = phase === 'entering' ? Math.max(0, 1 - enterT * 1.8) : 1
  const videoAlpha = phase === 'entering' ? Math.max(0, 1 - enterT * 2.2) : 1
  const textAlpha  = show && phase === 'earth' ? 1 : 0

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute', inset: 0, zIndex: 20,
        background: `rgba(4,8,20,${bgAlpha})`,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        cursor: phase === 'earth' ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Left column — mirrors heptagon column layout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '32px 40px 48px',
        boxSizing: 'border-box',
      }}>
        {/* Video globe */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '520px',
          opacity: videoAlpha,
          transition: phase === 'entering' ? 'none' : undefined,
          marginLeft: '60px',
          marginTop: '-20px',
        }}>
          <video
            ref={videoRef}
            src={VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              aspectRatio: '1 / 1',   // reserves space before video loads
            }}
          />
        </div>

        {/* Tagline */}
        <p style={{
          margin: '16px 0 0',
          marginLeft: '60px',
          padding: '0 24px',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 'clamp(14px,2.8vw,17px)', fontWeight: 300,
          color: 'rgba(255,255,255,0.55)', textAlign: 'center',
          lineHeight: 1.8, letterSpacing: '0.04em',
          opacity: textAlpha,
          transform: textAlpha === 1 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.9s ease, transform 0.9s ease',
          pointerEvents: 'none', maxWidth: '320px',
        }}>
          Our planet.<br />Our privilege.<br />Our responsibility.
        </p>

        {/* Enter prompt */}
        <div style={{
          marginTop: '22px',
          marginLeft: '60px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '8px',
          opacity: textAlpha,
          transition: 'opacity 0.7s ease 0.5s',
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
      </div>

      {/* Right column — empty, keeps layout aligned with hep panel */}
      <div />

      <style>{`
        @keyframes earthPulse {
          0%,100% { transform:scale(1);    opacity:.6 }
          50%      { transform:scale(1.15); opacity:1  }
        }
      `}</style>
    </div>
  )
}
