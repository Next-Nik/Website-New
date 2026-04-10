import { useEffect, useRef, useState } from 'react'

// Heptagon geometry (must match Heptagon.jsx exactly):
// viewBox 0 0 480 480, centre (260,260), rendered max-width 520px
// Centre orb r=76 in viewBox = 76/480 = 15.83% of rendered width
// At 480px render width: orb diameter ≈ 152px, radius ≈ 76px

const GOLD_DK = '#A8721A'

// Ocean / land colours
const OCEAN = '#1a3a5c'
const LAND  = '#2d5a27'
const SEMI  = '#1d4870'   // shallow shelf
const DSRT  = '#8b7355'
const ICE   = '#dde8f0'
const SAND  = '#c4a265'

// Continent polygons — [lon 0-1, lat 0-1] normalised
// Drawn twice (dx=0 and dx=W) for seamless horizontal wrap
const SHAPES = [
  // North America
  { c:LAND,  p:[[.07,.17],[.10,.11],[.20,.10],[.27,.13],[.30,.20],[.28,.28],[.22,.35],[.17,.41],[.13,.44],[.10,.40],[.07,.30]] },
  // Caribbean / C.America
  { c:LAND,  p:[[.18,.41],[.22,.42],[.21,.47],[.18,.45]] },
  // South America
  { c:LAND,  p:[[.19,.46],[.24,.43],[.29,.46],[.31,.52],[.30,.62],[.26,.72],[.20,.75],[.17,.68],[.17,.56]] },
  // Greenland
  { c:ICE,   p:[[.22,.08],[.31,.06],[.33,.10],[.30,.18],[.24,.19],[.21,.14]] },
  // Iceland
  { c:ICE,   p:[[.38,.12],[.42,.10],[.44,.13],[.41,.16],[.38,.14]] },
  // UK / Ireland
  { c:LAND,  p:[[.44,.17],[.46,.15],[.48,.17],[.47,.21],[.44,.20]] },
  // Scandinavia
  { c:LAND,  p:[[.49,.10],[.53,.08],[.55,.13],[.52,.18],[.49,.15]] },
  // Europe
  { c:LAND,  p:[[.44,.19],[.48,.15],[.56,.16],[.58,.20],[.56,.27],[.50,.29],[.46,.27],[.44,.23]] },
  // Africa
  { c:LAND,  p:[[.46,.28],[.52,.26],[.58,.28],[.62,.34],[.63,.44],[.59,.54],[.54,.64],[.49,.68],[.44,.63],[.42,.53],[.43,.40],[.45,.33]] },
  // Madagascar
  { c:LAND,  p:[[.60,.52],[.62,.50],[.64,.54],[.62,.60],[.59,.58]] },
  // Arabia
  { c:DSRT,  p:[[.57,.28],[.64,.25],[.67,.30],[.65,.38],[.60,.40],[.57,.35]] },
  // India
  { c:LAND,  p:[[.65,.36],[.70,.34],[.73,.42],[.69,.51],[.65,.48],[.64,.41]] },
  // Asia main
  { c:LAND,  p:[[.56,.15],[.70,.11],[.80,.12],[.88,.18],[.89,.30],[.85,.40],[.77,.44],[.68,.45],[.62,.38],[.59,.26],[.57,.18]] },
  // SE Asia peninsula
  { c:LAND,  p:[[.74,.43],[.79,.42],[.81,.48],[.77,.52],[.74,.50],[.73,.45]] },
  // Japan
  { c:LAND,  p:[[.87,.23],[.90,.21],[.92,.25],[.90,.29],[.87,.27]] },
  // New Guinea
  { c:LAND,  p:[[.83,.49],[.89,.48],[.91,.52],[.87,.55],[.83,.53]] },
  // Australia
  { c:DSRT,  p:[[.74,.56],[.83,.52],[.89,.54],[.92,.60],[.89,.68],[.81,.71],[.74,.68],[.71,.62],[.72,.57]] },
  // NZ (tiny)
  { c:LAND,  p:[[.93,.65],[.95,.63],[.96,.67],[.94,.69]] },
  // Antarctica
  { c:ICE,   p:[[.00,.87],[1.0,.87],[1.0,1.0],[.00,1.0]] },
]

function buildTexture() {
  const W = 2048, H = 1024
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')

  // Base ocean
  ctx.fillStyle = OCEAN
  ctx.fillRect(0, 0, W, H)

  // Shallow shelf gradient near equator
  const shelf = ctx.createLinearGradient(0, H*.3, 0, H*.7)
  shelf.addColorStop(0, 'transparent')
  shelf.addColorStop(.5, SEMI + '28')
  shelf.addColorStop(1, 'transparent')
  ctx.fillStyle = shelf
  ctx.fillRect(0, 0, W, H)

  // Continents — each drawn at dx=0 and dx=W for seamless wrap
  SHAPES.forEach(({ c: fill, p: pts }) => {
    for (const dx of [0, W]) {
      ctx.beginPath()
      pts.forEach(([lx, ly], i) => {
        i === 0
          ? ctx.moveTo(lx * W + dx, ly * H)
          : ctx.lineTo(lx * W + dx, ly * H)
      })
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
    }
  })

  return c
}

function drawFrame(ctx, tex, SIZE, rot, enterP) {
  const cx = SIZE / 2, cy = SIZE / 2

  // Globe radius: full size until enter, then shrinks to match heptagon centre orb
  // Centre orb = 15.83% of heptagon SVG width.
  // Canvas is sized to match heptagon render width (480px → same aspect).
  // So target radius = SIZE * 0.1583
  const R_FULL   = SIZE * 0.415
  const R_TARGET = SIZE * 0.163   // matches heptagon centre orb
  const r = enterP > 0
    ? R_FULL - (R_FULL - R_TARGET) * enterP
    : R_FULL

  ctx.clearRect(0, 0, SIZE, SIZE)

  // Space glow
  if (r > R_TARGET * 1.5) {
    const glow = ctx.createRadialGradient(cx, cy, r*.9, cx, cy, r*1.5)
    glow.addColorStop(0, 'rgba(30,60,120,.18)')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.beginPath(); ctx.arc(cx, cy, r*1.5, 0, Math.PI*2)
    ctx.fillStyle = glow; ctx.fill()
  }

  // Clip sphere
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.clip()

  // Texture — cylindrical projection scrolled by rot
  const tW = tex.width, tH = tex.height
  const dW = r * 2
  const sx = dW / tW                    // scale factor
  const offX = (rot % 1) * tW           // pixel offset in texture

  for (let tile = -1; tile <= 1; tile++) {
    ctx.drawImage(tex, 0, 0, tW, tH,
      cx - r + tile * dW - offX * sx,
      cy - r,
      tW * sx, r * 2
    )
  }

  // Sphere shading — lit upper-left
  const shade = ctx.createRadialGradient(cx-r*.28, cy-r*.26, r*.04, cx+r*.1, cy+r*.1, r*1.05)
  shade.addColorStop(0.00, 'rgba(255,255,255,.12)')
  shade.addColorStop(0.30, 'rgba(255,255,255,.03)')
  shade.addColorStop(0.65, 'rgba(0,0,0,.04)')
  shade.addColorStop(0.88, 'rgba(0,0,0,.34)')
  shade.addColorStop(1.00, 'rgba(0,0,0,.62)')
  ctx.fillStyle = shade
  ctx.fillRect(cx-r, cy-r, r*2, r*2)

  // Specular
  const spec = ctx.createRadialGradient(cx-r*.40, cy-r*.40, 0, cx-r*.40, cy-r*.40, r*.50)
  spec.addColorStop(0, 'rgba(255,255,255,.20)')
  spec.addColorStop(.5, 'rgba(255,255,255,.04)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spec
  ctx.fillRect(cx-r, cy-r, r*2, r*2)

  ctx.restore()

  // Atmosphere limb
  if (r > R_TARGET * 2) {
    const atm = ctx.createRadialGradient(cx, cy, r*.87, cx, cy, r*1.18)
    atm.addColorStop(0, 'rgba(90,155,230,.30)')
    atm.addColorStop(.5, 'rgba(70,130,210,.12)')
    atm.addColorStop(1, 'rgba(50,100,180,0)')
    ctx.beginPath(); ctx.arc(cx, cy, r*1.18, 0, Math.PI*2)
    ctx.fillStyle = atm; ctx.fill()
  }

  // During transition: gold orb fades in over shrinking globe
  if (enterP > 0) {
    const orbAlpha = Math.min(enterP * 2, 1)   // fades in first half
    ctx.save()
    ctx.globalAlpha = orbAlpha
    ctx.beginPath(); ctx.arc(cx, cy, r*.94, 0, Math.PI*2)
    ctx.fillStyle = '#FFFFFF'; ctx.fill()
    ctx.strokeStyle = 'rgba(200,146,42,.78)'
    ctx.lineWidth = 1.5; ctx.stroke()

    if (enterP > .55) {
      const textA = (enterP - .55) / .45
      ctx.globalAlpha = textA
      ctx.fillStyle = GOLD_DK
      const fs = Math.max(10, Math.round(r * .24))
      ctx.font = `300 ${fs}px 'Cormorant Garamond', Georgia, serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Our',    cx, cy - r * .14)
      ctx.fillText('Planet', cx, cy + r * .14)
    }
    ctx.restore()
  }
}

export function EarthIntro({ onEntered }) {
  const canvasRef     = useRef(null)
  const texRef        = useRef(null)
  const rotRef        = useRef(0)
  const rafRef        = useRef(null)
  const lastRef       = useRef(null)
  const enterStartRef = useRef(null)

  const [phase,   setPhase]   = useState('earth')
  const [enterT,  setEnterT]  = useState(0)
  const [show,    setShow]    = useState(false)

  useEffect(() => { texRef.current = buildTexture() }, [])
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function tick(ts) {
      if (!texRef.current) { rafRef.current = requestAnimationFrame(tick); return }
      if (!lastRef.current) lastRef.current = ts
      const dt = Math.min((ts - lastRef.current) / 1000, 0.05)
      lastRef.current = ts

      rotRef.current += dt / 22    // one full rotation per 22s

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
      drawFrame(ctx, texRef.current, SIZE, rotRef.current, ep)
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

  // The overlay covers the full .app div (both columns).
  // The content is offset to align with the LEFT column (heptagon side).
  // Left column = ~50% of .app, max-width 1100px total → left col max ~550px
  // Heptagon SVG centred in left col, max-width 520px
  // We align the canvas to sit centred in the left half.
  return (
    <div
      onClick={handleClick}
      style={{
        position:       'absolute',
        inset:          0,
        zIndex:         20,
        background:     `rgba(4,8,20,${bgAlpha})`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'flex-start',   // push content to left column
        cursor:         phase === 'earth' ? 'pointer' : 'default',
        userSelect:     'none',
      }}
    >
      {/* Left-column container — mirrors heptagonCol width */}
      <div style={{
        width:          '50%',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        height:         '100%',
        padding:        '32px 40px',
        boxSizing:      'border-box',
        transform:      'translateY(-22%)',
      }}>
        {/*
          Canvas sized to match the heptagon SVG exactly.
          Heptagon max-width: 520px. We use the same.
          The globe fills 83% of this (0.415 * 2 = 83% of width).
          During transition it shrinks to 32.6% (matching centre orb size).
        */}
        <canvas
          ref={canvasRef}
          width={480}
          height={480}
          style={{
            width:    '100%',
            maxWidth: '480px',
            height:   'auto',
            display:  'block',
          }}
        />

        {/* Tagline */}
        <p style={{
          margin:        '22px 0 0',
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      'clamp(14px,2.8vw,17px)',
          fontWeight:    300,
          color:         'rgba(255,255,255,0.55)',
          textAlign:     'center',
          lineHeight:    1.8,
          letterSpacing: '0.04em',
          opacity:       show && phase === 'earth' ? 1 : 0,
          transform:     show && phase === 'earth' ? 'translateY(0)' : 'translateY(8px)',
          transition:    'opacity 0.9s ease, transform 0.9s ease',
          pointerEvents: 'none',
          maxWidth:      '320px',
        }}>
          Our planet.<br />Our privilege.<br />Our responsibility.
        </p>

        {/* Entry prompt */}
        <div style={{
          marginTop:  '22px',
          display:    'flex',
          flexDirection:'column',
          alignItems: 'center',
          gap:        '8px',
          opacity:    show && phase === 'earth' ? 1 : 0,
          transition: 'opacity 0.7s ease 0.5s',
        }}>
          <div style={{
            width:'36px', height:'36px', borderRadius:'50%',
            border:'1.5px solid rgba(200,146,42,0.60)',
            display:'flex', alignItems:'center', justifyContent:'center',
            animation:'earthPulse 2.2s ease-in-out infinite',
          }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#C8922A' }} />
          </div>
          <span style={{
            fontFamily:"'Cormorant SC', Georgia, serif",
            fontSize:'12px', letterSpacing:'0.22em',
            color:'rgba(200,146,42,0.60)',
          }}>Enter</span>
        </div>
      </div>

      <style>{`
        @keyframes earthPulse {
          0%,100% { transform:scale(1);    opacity:.6  }
          50%      { transform:scale(1.15); opacity:1   }
        }
        @media (max-width:780px) {
          .earth-left-col { width:100% !important; padding:20px !important; }
        }
      `}</style>
    </div>
  )
}
