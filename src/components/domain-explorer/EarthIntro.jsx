import { useEffect, useRef, useState } from 'react'

// NASA Blue Marble texture — public domain, hosted on NASA servers
// Using a CORS-friendly mirror via unpkg/jsdelivr CDN
// Fallback: procedural ocean+land if image fails to load
const BLUE_MARBLE_URL = '/earth-blue-marble.jpg'

const GOLD_DK = '#A8721A'

function drawGlobe(ctx, tex, SIZE, rot, enterP) {
  const cx = SIZE / 2, cy = SIZE / 2
  const R_FULL   = SIZE * 0.415
  const R_TARGET = SIZE * 0.163
  const r = enterP > 0 ? R_FULL - (R_FULL - R_TARGET) * enterP : R_FULL

  ctx.clearRect(0, 0, SIZE, SIZE)

  // Space glow
  const glow = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.5)
  glow.addColorStop(0, 'rgba(30,60,120,0.20)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2)
  ctx.fillStyle = glow; ctx.fill()

  // Clip to sphere
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()

  // Equirectangular texture: tile horizontally, stretch vertically to crop Antarctica
  // texH > diam so the bottom (Antarctica) is cropped; texOffY shifts the view up
  const diam   = r * 2
  const texH   = diam * 1.28          // stretch: makes globe taller, crops poles
  const texOffY = diam * 0.10         // shift up: less Antarctica, more equator
  const offX   = (rot % 1) * diam

  for (let tile = -1; tile <= 1; tile++) {
    ctx.drawImage(tex, cx - r + tile * diam - offX, cy - r - texOffY, diam, texH)
  }

  // Blend seam: thin dark vertical gradient over the wrap boundary to soften any edge
  const seamX = ((1 - (rot % 1)) * diam + cx - r) % diam + cx - r
  for (let tile = -1; tile <= 1; tile++) {
    const sx = seamX + tile * diam
    if (sx > cx - r - 4 && sx < cx + r + 4) {
      const sg = ctx.createLinearGradient(sx - 6, 0, sx + 6, 0)
      sg.addColorStop(0,   'rgba(0,0,0,0)')
      sg.addColorStop(0.4, 'rgba(0,0,0,0.18)')
      sg.addColorStop(0.6, 'rgba(0,0,0,0.18)')
      sg.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = sg
      ctx.fillRect(sx - 6, cy - r, 12, diam)
    }
  }

  // Sphere shading — lit upper-left, dark lower-right edge
  const shade = ctx.createRadialGradient(cx - r*.28, cy - r*.26, r*.04, cx + r*.1, cy + r*.1, r*1.05)
  shade.addColorStop(0.00, 'rgba(255,255,255,0.10)')
  shade.addColorStop(0.30, 'rgba(255,255,255,0.02)')
  shade.addColorStop(0.65, 'rgba(0,0,0,0.03)')
  shade.addColorStop(0.88, 'rgba(0,0,0,0.32)')
  shade.addColorStop(1.00, 'rgba(0,0,0,0.60)')
  ctx.fillStyle = shade; ctx.fillRect(cx - r, cy - r, r * 2, r * 2)

  // Specular highlight
  const spec = ctx.createRadialGradient(cx - r*.40, cy - r*.40, 0, cx - r*.40, cy - r*.40, r*.50)
  spec.addColorStop(0, 'rgba(255,255,255,0.18)')
  spec.addColorStop(0.5, 'rgba(255,255,255,0.04)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spec; ctx.fillRect(cx - r, cy - r, r * 2, r * 2)

  ctx.restore()

  // Atmosphere limb
  const atm = ctx.createRadialGradient(cx, cy, r * .87, cx, cy, r * 1.18)
  atm.addColorStop(0, 'rgba(90,155,230,0.32)')
  atm.addColorStop(0.5, 'rgba(70,130,210,0.14)')
  atm.addColorStop(1, 'rgba(50,100,180,0)')
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2)
  ctx.fillStyle = atm; ctx.fill()

  // During transition — gold orb materialises
  if (enterP > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(enterP * 2, 1)
    ctx.beginPath(); ctx.arc(cx, cy, r * .94, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'; ctx.fill()
    ctx.strokeStyle = 'rgba(200,146,42,0.78)'; ctx.lineWidth = 1.5; ctx.stroke()
    if (enterP > .55) {
      ctx.globalAlpha = (enterP - .55) / .45
      ctx.fillStyle = GOLD_DK
      const fs = Math.max(10, Math.round(r * .24))
      ctx.font = `300 ${fs}px 'Cormorant Garamond', Georgia, serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Our', cx, cy - r * .14)
      ctx.fillText('Planet', cx, cy + r * .14)
    }
    ctx.restore()
  }
}

// Fallback: clean blue orb with ocean gradient — no polygon continents
function drawFallback(ctx, SIZE, rot, enterP) {
  const cx = SIZE/2, cy = SIZE/2
  const R_FULL = SIZE * 0.415, R_TARGET = SIZE * 0.163
  const r = enterP > 0 ? R_FULL - (R_FULL - R_TARGET) * enterP : R_FULL
  ctx.clearRect(0, 0, SIZE, SIZE)

  // Space glow
  const glow = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.5)
  glow.addColorStop(0, 'rgba(30,60,120,0.20)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2)
  ctx.fillStyle = glow; ctx.fill()

  // Sphere base — deep ocean blue
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()
  const ocean = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, r * 0.1, cx, cy, r)
  ocean.addColorStop(0.0, '#3A7FC1')
  ocean.addColorStop(0.4, '#1B5A8A')
  ocean.addColorStop(0.8, '#0D3860')
  ocean.addColorStop(1.0, '#071F3A')
  ctx.fillStyle = ocean
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)

  // Sphere shading
  const shade = ctx.createRadialGradient(cx - r*.28, cy - r*.26, r*.04, cx + r*.1, cy + r*.1, r*1.05)
  shade.addColorStop(0.00, 'rgba(255,255,255,0.10)')
  shade.addColorStop(0.30, 'rgba(255,255,255,0.02)')
  shade.addColorStop(0.65, 'rgba(0,0,0,0.03)')
  shade.addColorStop(0.88, 'rgba(0,0,0,0.32)')
  shade.addColorStop(1.00, 'rgba(0,0,0,0.60)')
  ctx.fillStyle = shade; ctx.fillRect(cx - r, cy - r, r * 2, r * 2)

  // Specular highlight
  const spec = ctx.createRadialGradient(cx - r*.40, cy - r*.40, 0, cx - r*.40, cy - r*.40, r*.50)
  spec.addColorStop(0, 'rgba(255,255,255,0.22)')
  spec.addColorStop(0.5, 'rgba(255,255,255,0.05)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spec; ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.restore()

  // Atmosphere limb
  const atm = ctx.createRadialGradient(cx, cy, r * .87, cx, cy, r * 1.18)
  atm.addColorStop(0, 'rgba(90,155,230,0.32)')
  atm.addColorStop(0.5, 'rgba(70,130,210,0.14)')
  atm.addColorStop(1, 'rgba(50,100,180,0)')
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2)
  ctx.fillStyle = atm; ctx.fill()
}

export function EarthIntro({ onEntered }) {
  const canvasRef     = useRef(null)
  const texRef        = useRef(null)
  const texLoadedRef  = useRef(false)
  const rotRef        = useRef(0)
  const rafRef        = useRef(null)
  const lastRef       = useRef(null)
  const enterStartRef = useRef(null)

  const [phase,  setPhase]  = useState('earth')
  const [enterT, setEnterT] = useState(0)
  const [show,   setShow]   = useState(false)

  // Load NASA Blue Marble texture
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => { texRef.current = img; texLoadedRef.current = true }
    img.onerror = () => { texLoadedRef.current = false }  // fallback to procedural
    img.src = BLUE_MARBLE_URL
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function tick(ts) {
      if (!lastRef.current) lastRef.current = ts
      const dt = Math.min((ts - lastRef.current) / 1000, 0.05)
      lastRef.current = ts
      rotRef.current += dt / 22

      let ep = 0
      if (phase === 'entering') {
        if (!enterStartRef.current) enterStartRef.current = ts
        ep = Math.min((ts - enterStartRef.current) / 800, 1)
        setEnterT(ep)
        if (ep >= 1) {
          cancelAnimationFrame(rafRef.current)
          setPhase('done'); onEntered(); return
        }
      }

      const ctx  = canvas.getContext('2d')
      const SIZE = canvas.width
      if (texLoadedRef.current && texRef.current) {
        drawGlobe(ctx, texRef.current, SIZE, rotRef.current, ep)
      } else {
        drawFallback(ctx, SIZE, rotRef.current, ep)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(rafRef.current); lastRef.current = null }
  }, [phase, onEntered])

  function handleClick() {
    if (phase !== 'earth') return
    enterStartRef.current = null; lastRef.current = null
    setPhase('entering')
  }

  if (phase === 'done') return null

  const bgAlpha = phase === 'entering' ? Math.max(0, 1 - enterT * 1.8) : 1

  return (
    <div onClick={handleClick} style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: `rgba(4,8,20,${bgAlpha})`,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      cursor: phase === 'earth' ? 'pointer' : 'default',
      userSelect: 'none',
    }}>
      {/* Left column — mirrors heptagon column padding exactly so canvas centre = hep centre */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        padding: '32px 40px 48px', boxSizing: 'border-box',
      }}>
        <canvas ref={canvasRef} width={480} height={480}
          style={{ width: '100%', maxWidth: '520px', height: 'auto', display: 'block',
            marginLeft: '60px', marginTop: '-20px' }}
        />

        <p style={{
          margin: '22px 0 0', padding: '0 24px',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 'clamp(14px,2.8vw,17px)', fontWeight: 300,
          color: 'rgba(255,255,255,0.55)', textAlign: 'center',
          lineHeight: 1.8, letterSpacing: '0.04em',
          opacity: show && phase === 'earth' ? 1 : 0,
          transform: show && phase === 'earth' ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.9s ease, transform 0.9s ease',
          pointerEvents: 'none', maxWidth: '320px',
        }}>
          Our planet.<br />Our privilege.<br />Our responsibility.
        </p>

        <div style={{
          marginTop: '22px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '8px',
          opacity: show && phase === 'earth' ? 1 : 0,
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

      <style>{`
        @keyframes earthPulse {
          0%,100% { transform:scale(1);    opacity:.6 }
          50%      { transform:scale(1.15); opacity:1  }
        }
        @media (max-width:780px) {
          .earth-left { width:100% !important; }
        }
      `}</style>
    </div>
  )
}
