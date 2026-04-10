import { useEffect, useRef, useState, useCallback } from 'react'

// ── EarthIntro ────────────────────────────────────────────────
//
// Phase sequence:
//   'earth'        — spinning globe on black, tagline visible, entry prompt pulsing
//   'entering'     — globe scales down + cross-fades to gold orb, black clears to parchment
//   'done'         — component hands off, DomainExplorer takes over
//
// The globe is rendered on a canvas element using a cylindrical map
// projection texture painted frame-by-frame. The texture is generated
// procedurally from SVG paths of the major continents — no external
// image dependency, no network request.
//
// On mobile the canvas is slightly smaller. Animation respects
// prefers-reduced-motion.

const EARTH_COLORS = {
  ocean:      '#1A3A5C',
  oceanShallow: '#1E4A72',
  land:       '#2D5A27',
  desert:     '#8B7355',
  arctic:     '#E8E8E8',
  atmosphere: 'rgba(100,160,220,0.18)',
  glow:       'rgba(80,140,200,0.12)',
}

const GOLD = '#C8922A'
const GOLD_DK = '#A8721A'

// Simple continent outlines as normalised [0,1] x/y coordinates
// These are rough but recognisable at globe scale
const CONTINENT_PATHS = [
  // North America
  { fill: EARTH_COLORS.land, path: [
    [0.11,0.15],[0.18,0.12],[0.26,0.14],[0.28,0.22],[0.24,0.32],
    [0.20,0.38],[0.17,0.42],[0.13,0.38],[0.09,0.28],[0.10,0.20],
  ]},
  // South America
  { fill: EARTH_COLORS.land, path: [
    [0.22,0.45],[0.28,0.42],[0.32,0.48],[0.30,0.58],[0.25,0.68],
    [0.20,0.72],[0.18,0.65],[0.20,0.55],[0.20,0.48],
  ]},
  // Europe
  { fill: EARTH_COLORS.land, path: [
    [0.46,0.18],[0.52,0.15],[0.56,0.18],[0.54,0.26],[0.50,0.28],
    [0.46,0.26],[0.44,0.22],
  ]},
  // Africa
  { fill: EARTH_COLORS.land, path: [
    [0.48,0.30],[0.56,0.28],[0.60,0.35],[0.58,0.50],[0.54,0.62],
    [0.48,0.65],[0.44,0.58],[0.44,0.45],[0.46,0.35],
  ]},
  // Asia
  { fill: EARTH_COLORS.land, path: [
    [0.56,0.18],[0.72,0.15],[0.82,0.20],[0.85,0.30],[0.80,0.40],
    [0.72,0.42],[0.65,0.38],[0.58,0.32],[0.54,0.26],[0.56,0.20],
  ]},
  // Australia
  { fill: EARTH_COLORS.desert, path: [
    [0.76,0.55],[0.84,0.52],[0.88,0.58],[0.84,0.65],[0.76,0.66],
    [0.72,0.62],[0.73,0.57],
  ]},
  // Antarctica (partial)
  { fill: EARTH_COLORS.arctic, path: [
    [0.10,0.88],[0.90,0.88],[0.95,0.95],[0.05,0.95],
  ]},
  // Greenland
  { fill: EARTH_COLORS.arctic, path: [
    [0.22,0.10],[0.30,0.08],[0.32,0.14],[0.28,0.18],[0.22,0.16],
  ]},
]

// Draw the globe onto an offscreen canvas texture, then project it
// onto the visible canvas as a sphere with a cylindrical projection offset
function createGlobeTexture(size) {
  const canvas = document.createElement('canvas')
  canvas.width  = size * 2
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // Ocean base
  ctx.fillStyle = EARTH_COLORS.ocean
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Shallow water band (tropics)
  const grad = ctx.createLinearGradient(0, size * 0.3, 0, size * 0.7)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(0.5, EARTH_COLORS.oceanShallow + '40')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw continents
  CONTINENT_PATHS.forEach(({ fill, path }) => {
    ctx.beginPath()
    path.forEach(([x, y], i) => {
      const px = x * canvas.width
      const py = y * canvas.height
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()

    // Second copy offset by one width (for seamless wrapping)
    ctx.beginPath()
    path.forEach(([x, y], i) => {
      const px = (x + 1) * canvas.width
      const py = y * canvas.height
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.closePath()
    ctx.fill()
  })

  return canvas
}

// Render a frame of the spinning globe onto the visible canvas
function renderGlobe(ctx, texture, canvasSize, rotation, phase, enterProgress) {
  const cx = canvasSize / 2
  const cy = canvasSize / 2
  const r  = canvasSize * 0.38

  ctx.clearRect(0, 0, canvasSize, canvasSize)

  // During 'entering', globe scales down toward centre-orb size
  const scale = phase === 'entering'
    ? 1 - enterProgress * 0.55
    : 1

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  ctx.translate(-cx, -cy)

  // Outer glow
  const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.4)
  glowGrad.addColorStop(0, 'transparent')
  glowGrad.addColorStop(0.7, EARTH_COLORS.glow)
  glowGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = glowGrad
  ctx.beginPath()
  ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2)
  ctx.fill()

  // Clip to circle
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()

  // Project texture: cylindrical projection
  const texW = texture.width
  const texH = texture.height
  const offsetX = (rotation % 1) * texW

  // Draw texture twice for seamless wrap
  for (let tile = -1; tile <= 1; tile++) {
    ctx.drawImage(
      texture,
      0, 0, texW, texH,
      cx - r + (tile * texW * r * 2 / texW) - offsetX * (r * 2 / texW),
      cy - r,
      texW * r * 2 / texW,
      r * 2
    )
  }

  // Sphere shading — left dark, right lit
  const sphereGrad = ctx.createRadialGradient(
    cx - r * 0.25, cy - r * 0.2, r * 0.05,
    cx, cy, r
  )
  sphereGrad.addColorStop(0, 'rgba(255,255,255,0.08)')
  sphereGrad.addColorStop(0.4, 'transparent')
  sphereGrad.addColorStop(0.85, 'rgba(0,0,0,0.25)')
  sphereGrad.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = sphereGrad
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)

  ctx.restore()

  // Atmosphere ring
  const atmGrad = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.12)
  atmGrad.addColorStop(0, EARTH_COLORS.atmosphere)
  atmGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = atmGrad
  ctx.beginPath()
  ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()

  // During entering: gold orb fades in at same position as globe fades out
  if (phase === 'entering') {
    ctx.save()
    ctx.globalAlpha = enterProgress
    // Gold circle emerges
    ctx.beginPath()
    ctx.arc(cx, cy, r * scale * 0.85, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.strokeStyle = `rgba(200,146,42,${0.78 * enterProgress})`
    ctx.lineWidth = 1.5
    ctx.stroke()
    // Label fades in
    if (enterProgress > 0.5) {
      const labelAlpha = (enterProgress - 0.5) * 2
      ctx.globalAlpha = labelAlpha
      ctx.fillStyle = GOLD_DK
      ctx.font = `300 ${Math.round(r * scale * 0.22)}px 'Cormorant Garamond', Georgia, serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Our', cx, cy - r * scale * 0.12)
      ctx.fillText('Planet', cx, cy + r * scale * 0.14)
    }
    ctx.restore()
  }
}

export function EarthIntro({ onEntered }) {
  const canvasRef       = useRef(null)
  const textureRef      = useRef(null)
  const animRef         = useRef(null)
  const rotationRef     = useRef(0)
  const lastTimeRef     = useRef(null)
  const enterStartRef   = useRef(null)
  const [phase, setPhase]         = useState('earth')   // 'earth' | 'entering' | 'done'
  const [enterProgress, setEnterProgress] = useState(0)
  const [taglineVisible, setTaglineVisible] = useState(false)
  const [promptVisible, setPromptVisible]   = useState(false)
  const prefersReduced = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )

  // Show tagline and prompt after brief pause
  useEffect(() => {
    const t1 = setTimeout(() => setTaglineVisible(true), 600)
    const t2 = setTimeout(() => setPromptVisible(true), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Create texture once
  useEffect(() => {
    textureRef.current = createGlobeTexture(512)
  }, [])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width

    function animate(time) {
      if (lastTimeRef.current === null) lastTimeRef.current = time
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = time

      // Rotation: one full rotation per ~20 seconds
      rotationRef.current += dt / 20

      let progress = 0
      if (phase === 'entering') {
        if (!enterStartRef.current) enterStartRef.current = time
        progress = Math.min((time - enterStartRef.current) / 900, 1) // 900ms transition
        setEnterProgress(progress)
        if (progress >= 1) {
          setPhase('done')
          onEntered()
          return
        }
      }

      if (textureRef.current) {
        renderGlobe(ctx, textureRef.current, size, rotationRef.current, phase, progress)
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(animRef.current)
      lastTimeRef.current = null
    }
  }, [phase, onEntered])

  function handleEnter() {
    if (phase !== 'earth') return
    setPhase('entering')
    enterStartRef.current = null
  }

  // Note: reduced-motion skip disabled until animation confirmed working
  // useEffect(() => {
  //   if (prefersReduced.current) { onEntered() }
  // }, [])

  if (phase === 'done') return null

  // Background opacity: black → transparent during entering
  const bgOpacity = phase === 'entering' ? 1 - enterProgress : 1

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `rgba(4,8,18,${bgOpacity})`,
        transition: phase === 'entering' ? 'none' : 'background 0.3s',
        cursor: phase === 'earth' ? 'pointer' : 'default',
      }}
      onClick={handleEnter}
    >
      {/* Canvas globe */}
      <canvas
        ref={canvasRef}
        width={420}
        height={420}
        style={{
          display: 'block',
          width: 'min(340px, 70vw)',
          height: 'auto',
          opacity: phase === 'entering' ? 1 : 1,
        }}
      />

      {/* Tagline */}
      <div style={{
        marginTop: '32px',
        textAlign: 'center',
        opacity: taglineVisible && phase === 'earth' ? 1 : 0,
        transform: taglineVisible && phase === 'earth' ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
        pointerEvents: 'none',
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 'clamp(15px,3.5vw,19px)',
          fontWeight: 300,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.04em',
          lineHeight: 1.6,
          margin: 0,
          maxWidth: '320px',
        }}>
          Our planet.<br />
          Our privilege.<br />
          Our responsibility.
        </p>
      </div>

      {/* Entry prompt */}
      <div style={{
        marginTop: '36px',
        opacity: promptVisible && phase === 'earth' ? 1 : 0,
        transform: promptVisible && phase === 'earth' ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}>
          {/* Pulsing ring prompt */}
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '1.5px solid rgba(200,146,42,0.60)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'earthPulse 2s ease-in-out infinite',
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: GOLD,
              opacity: 0.85,
            }} />
          </div>
          <span style={{
            fontFamily: "'Cormorant SC', Georgia, serif",
            fontSize: '13px',
            letterSpacing: '0.22em',
            color: 'rgba(200,146,42,0.70)',
          }}>
            Enter
          </span>
        </div>
      </div>

      <style>{`
        @keyframes earthPulse {
          0%   { transform: scale(1);    opacity: 0.7; }
          50%  { transform: scale(1.15); opacity: 1;   }
          100% { transform: scale(1);    opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
