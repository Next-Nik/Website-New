import { useEffect, useRef, useState } from 'react'

const GOLD_DK = '#A8721A'
const OCEAN   = '#1B3A5C'
const LAND    = '#2D5A27'
const DESERT  = '#8B7355'
const ICE     = '#D8E8F0'

const SHAPES = [
  { c: LAND,   pts: [[0.08,0.18],[0.17,0.13],[0.25,0.15],[0.27,0.24],[0.23,0.34],[0.18,0.40],[0.14,0.43],[0.10,0.38],[0.08,0.28]] },
  { c: LAND,   pts: [[0.20,0.46],[0.26,0.43],[0.30,0.48],[0.29,0.58],[0.24,0.70],[0.19,0.74],[0.17,0.66],[0.18,0.55]] },
  { c: LAND,   pts: [[0.45,0.18],[0.52,0.15],[0.56,0.19],[0.53,0.27],[0.48,0.28],[0.44,0.24]] },
  { c: LAND,   pts: [[0.47,0.30],[0.56,0.28],[0.60,0.34],[0.58,0.50],[0.53,0.63],[0.47,0.66],[0.43,0.58],[0.43,0.43]] },
  { c: DESERT, pts: [[0.57,0.19],[0.74,0.14],[0.84,0.20],[0.86,0.30],[0.80,0.42],[0.70,0.44],[0.62,0.38],[0.56,0.28]] },
  { c: DESERT, pts: [[0.75,0.56],[0.84,0.53],[0.88,0.59],[0.84,0.67],[0.75,0.67],[0.71,0.62]] },
  { c: ICE,    pts: [[0.00,0.88],[1.00,0.88],[1.00,1.00],[0.00,1.00]] },
  { c: ICE,    pts: [[0.21,0.09],[0.30,0.07],[0.32,0.14],[0.27,0.18],[0.21,0.15]] },
]

function buildTexture() {
  const W = 1024, H = 512
  const off = document.createElement('canvas')
  off.width = W; off.height = H
  const ctx = off.getContext('2d')
  ctx.fillStyle = OCEAN
  ctx.fillRect(0, 0, W, H)
  SHAPES.forEach(({ c, pts }) => {
    for (const dx of [0, W]) {
      ctx.beginPath()
      pts.forEach(([lx, ly], i) => {
        i === 0 ? ctx.moveTo(lx * W + dx, ly * H) : ctx.lineTo(lx * W + dx, ly * H)
      })
      ctx.closePath()
      ctx.fillStyle = c
      ctx.fill()
    }
  })
  return off
}

function drawFrame(ctx, tex, size, rot) {
  const cx = size / 2, cy = size / 2, r = size * 0.40
  ctx.clearRect(0, 0, size, size)

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()

  const tW = tex.width, tH = tex.height
  const dW = r * 2, dH = r * 2
  const off = (rot % 1) * tW
  const scale = dW / tW

  ctx.drawImage(tex, off, 0, tW, tH,  cx - r - off * scale,       cy - r, tW * scale, dH)
  ctx.drawImage(tex,  0,  0, tW, tH,  cx - r + (tW - off) * scale, cy - r, tW * scale, dH)

  const shade = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.05, cx, cy, r)
  shade.addColorStop(0, 'rgba(255,255,255,0.07)')
  shade.addColorStop(0.5, 'rgba(0,0,0,0)')
  shade.addColorStop(1, 'rgba(0,0,0,0.52)')
  ctx.fillStyle = shade
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.restore()

  const atm = ctx.createRadialGradient(cx, cy, r * 0.88, cx, cy, r * 1.18)
  atm.addColorStop(0, 'rgba(80,140,220,0.22)')
  atm.addColorStop(1, 'rgba(80,140,220,0.00)')
  ctx.beginPath()
  ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2)
  ctx.fillStyle = atm
  ctx.fill()
}

export function EarthIntro({ onEntered }) {
  const canvasRef     = useRef(null)
  const texRef        = useRef(null)
  const rotRef        = useRef(0)
  const rafRef        = useRef(null)
  const lastRef       = useRef(null)
  const enterStartRef = useRef(null)

  const [phase, setPhase]   = useState('earth')
  const [enterT, setEnterT] = useState(0)
  const [show,   setShow]   = useState(false)

  useEffect(() => {
    texRef.current = buildTexture()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function waitForTex(ts) {
      if (!texRef.current) { rafRef.current = requestAnimationFrame(waitForTex); return }
      lastRef.current = ts
      rafRef.current = requestAnimationFrame(loop)
    }

    function loop(ts) {
      if (!lastRef.current) lastRef.current = ts
      const dt = Math.min((ts - lastRef.current) / 1000, 0.05)
      lastRef.current = ts
      rotRef.current += dt / 22

      const ctx = canvas.getContext('2d')
      const SIZE = canvas.width

      drawFrame(ctx, texRef.current, SIZE, rotRef.current)

      if (phase === 'entering') {
        if (!enterStartRef.current) enterStartRef.current = ts
        const p = Math.min((ts - enterStartRef.current) / 850, 1)
        setEnterT(p)

        const r = SIZE * 0.40, cx = SIZE / 2, cy = SIZE / 2
        ctx.save()
        ctx.globalAlpha = p
        ctx.beginPath()
        ctx.arc(cx, cy, r * 0.80, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.strokeStyle = 'rgba(200,146,42,0.78)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        if (p > 0.55) {
          ctx.globalAlpha = (p - 0.55) / 0.45
          ctx.fillStyle = GOLD_DK
          ctx.font = `300 ${Math.round(r * 0.21)}px 'Cormorant Garamond', Georgia, serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('Our', cx, cy - r * 0.13)
          ctx.fillText('Planet', cx, cy + r * 0.13)
        }
        ctx.restore()

        if (p >= 1) {
          cancelAnimationFrame(rafRef.current)
          setPhase('done')
          onEntered()
          return
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(waitForTex)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, onEntered])

  function handleClick() {
    if (phase !== 'earth') return
    enterStartRef.current = null
    lastRef.current = null
    setPhase('entering')
  }

  if (phase === 'done') return null

  const bgAlpha = phase === 'entering' ? Math.max(0, 1 - enterT * 1.5) : 1

  return (
    <div
      onClick={handleClick}
      style={{
        position:       'absolute',
        inset:          0,
        zIndex:         20,
        background:     `rgba(4,8,20,${bgAlpha})`,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        cursor:         phase === 'earth' ? 'pointer' : 'default',
        userSelect:     'none',
      }}
    >
      <canvas
        ref={canvasRef}
        width={480}
        height={480}
        style={{ width: 'min(300px,62vw)', height: 'auto', display: 'block' }}
      />

      <p style={{
        margin:         '26px 0 0',
        fontFamily:     "'Cormorant Garamond', Georgia, serif",
        fontSize:       'clamp(14px,3.2vw,17px)',
        fontWeight:     300,
        color:          'rgba(255,255,255,0.55)',
        textAlign:      'center',
        lineHeight:     1.75,
        letterSpacing:  '0.03em',
        opacity:        show && phase === 'earth' ? 1 : 0,
        transform:      show && phase === 'earth' ? 'translateY(0)' : 'translateY(8px)',
        transition:     'opacity 0.9s ease, transform 0.9s ease',
        pointerEvents:  'none',
      }}>
        Our planet.<br />Our privilege.<br />Our responsibility.
      </p>

      <div style={{
        marginTop:      '26px',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            '8px',
        opacity:        show && phase === 'earth' ? 1 : 0,
        transition:     'opacity 0.7s ease 0.4s',
      }}>
        <div style={{
          width:          '38px',
          height:         '38px',
          borderRadius:   '50%',
          border:         '1.5px solid rgba(200,146,42,0.60)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          animation:      'earthPulse 2.2s ease-in-out infinite',
        }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#C8922A' }} />
        </div>
        <span style={{
          fontFamily:     "'Cormorant SC', Georgia, serif",
          fontSize:       '12px',
          letterSpacing:  '0.22em',
          color:          'rgba(200,146,42,0.60)',
        }}>
          Enter
        </span>
      </div>

      <style>{`
        @keyframes earthPulse {
          0%,100% { transform:scale(1);    opacity:.6  }
          50%      { transform:scale(1.15); opacity:1   }
        }
      `}</style>
    </div>
  )
}
