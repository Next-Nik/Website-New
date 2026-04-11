import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './Heptagon.module.css'

const CX = 260
const CY = 260
const RADIUS = 170
const INTRO_SPIN_DEG_PER_SEC = 35
const INTRO_SPIN_DURATION_MS = 4000
const BLOOM_DURATION_MS      = 2000

// Drill-down animation durations ms
const T_PULL    = 240
const T_BREATHE = 280

// Node radius bounds — tight range so size reads as "fitted", not "ranked"
const NODE_RADIUS_MIN = 46
const NODE_RADIUS_MAX = 68

function getNodePos(index, rotationDeg = 0, count = 7) {
  const angleDeg = index * (360 / count) - 90 + rotationDeg
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + RADIUS * Math.cos(rad), y: CY + RADIUS * Math.sin(rad) }
}

function getRotationToTop(index, currentRot, count = 7) {
  const raw = -(index * (360 / count))
  let diff = ((raw - (currentRot % 360)) + 540) % 360 - 180
  return currentRot + diff
}

function wrapAt(name, max) {
  const words = name.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length <= max || !current) {
      current = test
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function getNodeLabel(name) {
  const tight = wrapAt(name, 11)
  if (tight.length <= 3) return tight
  const loose = wrapAt(name, 14)
  return loose.length < tight.length ? loose : tight
}

function getNodeSizing(lines) {
  const maxLen = Math.max(...lines.map(l => l.length))
  const n = lines.length
  // Cormorant SC at 19px: ~10.5px per char, so half-width = maxLen * 5.25
  // Add 14px padding each side → minimum radius = maxLen * 5.25 + 14
  // Height: n lines * 19px * 1.28 lineHeight / 2 + 10px padding
  const halfW = maxLen * 5.25 + 14
  const halfH = (n * 19 * 1.28) / 2 + 10
  const raw   = Math.ceil(Math.max(halfW, halfH))
  const radius = Math.min(NODE_RADIUS_MAX, Math.max(NODE_RADIUS_MIN, raw))
  return { fontSize: 19, radius, lineHeight: 1.28 }
}

function easeInOut(t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2 }

export default function Heptagon({
  domains,
  activeIndex,
  onSelect,
  onLand,
  isIdle,
  centreLabel,
  onCentreClick,
  onDrillDown,
  bloom = false,
}) {
  const [phase,      setPhase]      = useState('spinning')
  const [displayRot, setDisplayRot] = useState(0)
  const [nodeStates, setNodeStates] = useState(null)
  const [bloomT,     setBloomT]     = useState(0)
  const [bloomed,    setBloomed]    = useState(false)

  const bloomStartRef = useRef(null)
  const bloomRafRef   = useRef(null)

  const rotRef          = useRef(0)
  const targetRotRef    = useRef(null)
  const landingIdxRef   = useRef(null)
  const drillIdxRef     = useRef(null)
  const animRef         = useRef(null)
  const lastTimeRef     = useRef(null)
  const spinStartRef    = useRef(Date.now())
  const drillStartRef   = useRef(null)
  const breatheStartRef = useRef(null)

  useEffect(() => {
    if (!bloom || bloomed) return
    setBloomT(0)
    bloomStartRef.current = null
    cancelAnimationFrame(bloomRafRef.current)
    function tick(ts) {
      if (!bloomStartRef.current) bloomStartRef.current = ts
      const t = Math.min((ts - bloomStartRef.current) / BLOOM_DURATION_MS, 1)
      setBloomT(easeInOut(t))
      if (t < 1) {
        bloomRafRef.current = requestAnimationFrame(tick)
      } else {
        setBloomed(true)
      }
    }
    bloomRafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(bloomRafRef.current)
  }, [bloom, bloomed])

  useEffect(() => {
    landingIdxRef.current = Math.floor(Math.random() * (domains?.length || 7))
  }, [])

  useEffect(() => {
    if (!domains?.length) return
    rotRef.current = 0
    targetRotRef.current = null
    drillIdxRef.current = null
    drillStartRef.current = null
    breatheStartRef.current = null
    setNodeStates(null)
    landingIdxRef.current = Math.floor(Math.random() * domains.length)
    spinStartRef.current = Date.now()
    lastTimeRef.current = null
    setPhase('spinning')
    setDisplayRot(0)
    setBloomT(0)
    setBloomed(false)
  }, [domains])

  useEffect(() => {
    if ((phase === 'settled' || phase === 'navigating') && activeIndex !== null) {
      targetRotRef.current = getRotationToTop(activeIndex, rotRef.current, domains?.length || 7)
      setPhase('navigating')
    }
  }, [activeIndex])

  const cancelSpinAndSelect = useCallback((index) => {
    landingIdxRef.current = index
    targetRotRef.current = getRotationToTop(index, rotRef.current, domains?.length || 7)
    setPhase('landing')
    onSelect(index)
  }, [onSelect, domains])

  useEffect(() => {
    function animate(time) {
      if (lastTimeRef.current === null) lastTimeRef.current = time
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = time

      if (phase === 'spinning') {
        const elapsed = Date.now() - spinStartRef.current
        rotRef.current += INTRO_SPIN_DEG_PER_SEC * dt
        setDisplayRot(rotRef.current)
        if (elapsed >= INTRO_SPIN_DURATION_MS) {
          const c = (domains || []).length || 7
          targetRotRef.current = getRotationToTop(landingIdxRef.current, rotRef.current, c)
          setPhase('landing')
          onLand?.(landingIdxRef.current)
        }
      }

      else if (phase === 'landing' || phase === 'navigating') {
        const diff = targetRotRef.current - rotRef.current
        if (Math.abs(diff) < 0.2) {
          rotRef.current = targetRotRef.current
          setDisplayRot(rotRef.current)
          setPhase('settled')
        } else {
          rotRef.current += diff * Math.min(1, dt * (phase === 'navigating' ? 4.5 : 3.5))
          setDisplayRot(rotRef.current)
        }
      }

      else if (phase === 'drilling') {
        if (!drillStartRef.current) drillStartRef.current = time
        const t  = Math.min((time - drillStartRef.current) / T_PULL, 1)
        const te = easeInOut(t)
        const idx = drillIdxRef.current
        const c   = (domains || []).length || 7
        const tp  = getNodePos(idx, rotRef.current, c)

        setNodeStates(Array.from({ length: (domains || []).length }, (_, i) => {
          if (i === idx) {
            return { sc: 1 + te * 0.12, op: 1, ox: (CX - tp.x) * te, oy: (CY - tp.y) * te }
          }
          const p = getNodePos(i, rotRef.current, c)
          return { sc: 1 - te * 0.18, op: 1 - te, ox: (p.x - CX) * 0.45 * te, oy: (p.y - CY) * 0.45 * te }
        }))

        if (t >= 1) {
          breatheStartRef.current = time
          setPhase('breathing')
        }
      }

      else if (phase === 'breathing') {
        if (time - breatheStartRef.current >= T_BREATHE) {
          const idx = drillIdxRef.current
          drillIdxRef.current = null
          onDrillDown?.(idx)
        }
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(animRef.current); lastTimeRef.current = null }
  }, [phase, onSelect, onDrillDown, domains])

  function handleNodeClick(i) {
    if (phase === 'spinning') { cancelSpinAndSelect(i); return }
    if (phase !== 'settled') return
    onSelect(i)
    if (domains?.[i]?.subDomains?.length > 0) {
      drillIdxRef.current = i
      drillStartRef.current = null
      setPhase('drilling')
    }
  }

  const count      = domains?.length || 7
  const isSpinning = phase === 'spinning' || phase === 'landing'
  const busy       = phase !== 'settled'


  const polygonPoints = Array.from({ length: count }, (_, i) => {
    const p = getNodePos(i, displayRot, count)
    return `${p.x},${p.y}`
  }).join(' ')



  return (
    <svg
      className={styles.svg}
      viewBox="0 0 480 480"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="NextUs Seven Domains"
      style={{
        transform: bloomed ? 'scale(1)' : `scale(${0.15 + bloomT * 0.85})`,
        transformOrigin: 'center center',
        opacity: bloomed ? 1 : bloomT,
        transition: bloomed ? 'none' : undefined,
      }}
    >
      {/* Outer decorative rings */}
      <circle cx={CX} cy={CY} r={RADIUS + 48} fill="none" stroke="rgba(200,146,42,0.04)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={RADIUS + 24} fill="none" stroke="rgba(200,146,42,0.06)" strokeWidth="0.5" />

      {/* Heptagon web */}
      <polygon points={polygonPoints} fill="rgba(200,146,42,0.03)" stroke="rgba(200,146,42,0.15)" strokeWidth="0.75" />

      {/* Spokes — centre to node centre, nodes rendered above hide the ends */}
      {Array.from({ length: count }, (_, i) => {
        const p = getNodePos(i, displayRot, count)
        return (
          <line
            key={`spoke-${i}`}
            x1={CX} y1={CY}
            x2={p.x} y2={p.y}
            stroke="rgba(200,146,42,0.10)"
            strokeWidth="0.5"
          />
        )
      })}

      {/* Nodes */}
      {(domains || []).map((domain, i) => {
        const p        = getNodePos(i, displayRot, count)
        const ns       = nodeStates?.[i]
        const isActive = !busy && i === activeIndex
        const words    = getNodeLabel(domain.name)
        const { fontSize, radius: r, lineHeight } = getNodeSizing(words)
        const blockHeight = (words.length - 1) * lineHeight
        const startDy = words.length === 1 ? '0.35em' : `-${(blockHeight / 2).toFixed(2)}em`

        // Bloom: nodes travel from centre outward
        const bloomedX = CX + (p.x - CX) * bloomT
        const bloomedY = CY + (p.y - CY) * bloomT

        const gStyle = ns ? {
          opacity: ns.op,
          transform: `translate(${ns.ox}px,${ns.oy}px) scale(${ns.sc})`,
          transformOrigin: `${p.x}px ${p.y}px`,
          cursor: 'default',
        } : {
          cursor: busy ? 'default' : 'pointer',
          opacity: bloomed ? 1 : bloomT,
          transform: bloomed ? 'none' : `translate(${bloomedX - p.x}px, ${bloomedY - p.y}px)`,
        }

        return (
          <g
            key={domain.id || i}
            className={styles.nodeGroup}
            style={gStyle}
            onClick={() => handleNodeClick(i)}
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-label={`Select domain: ${domain.name}`}
            onKeyDown={e => e.key === 'Enter' && handleNodeClick(i)}
          >
            {/* Active halo */}
            {isActive && (
              <circle
                cx={p.x} cy={p.y} r={r + 10}
                fill="rgba(200,146,42,0.05)"
                stroke="rgba(200,146,42,0.22)"
                strokeWidth="1"
              />
            )}

            {/* Node circle — white fill covers spoke end cleanly */}
            <circle
              cx={p.x} cy={p.y} r={r}
              className={styles.nodeCircle}
              fill={isSpinning ? 'rgba(255,255,255,0.95)' : isActive ? 'rgba(200,146,42,0.05)' : '#FFFFFF'}
              stroke={isActive ? 'rgba(200,146,42,1)' : 'rgba(200,146,42,0.78)'}
              strokeWidth={isActive ? 1.5 : 1}
            />

            {/* Label — sits inside the circle, no backing rect */}
            <text
              x={p.x} y={p.y}
              textAnchor="middle" dominantBaseline="middle"
              fill={isActive ? '#A8721A' : '#0F1523'}
              fontSize={fontSize}
              fontFamily="'Cormorant SC', Georgia, serif"
              fontWeight="500"
              letterSpacing="0.04em"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {words.map((word, wi) => (
                <tspan key={wi} x={p.x} dy={wi === 0 ? startDy : `${lineHeight}em`}>
                  {word}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}

      {/* Centre orb */}
      <g
        className={styles.centreGroup}
        onClick={onCentreClick}
        role="button"
        tabIndex={0}
        aria-label={centreLabel ? `${centreLabel} — go back` : 'Our Planet'}
        onKeyDown={e => e.key === 'Enter' && onCentreClick?.()}
        style={{ cursor: onCentreClick ? 'pointer' : 'default' }}
      >
        <circle cx={CX} cy={CY} r={84} fill="none" stroke="rgba(200,146,42,0.18)" strokeWidth="1" style={{ pointerEvents: 'none' }}>
          <animate attributeName="r" values="82;90;82" dur="3s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.18;0.04;0.18" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={CX} cy={CY} r={80} fill="none" stroke="rgba(200,146,42,0.12)" strokeWidth="0.5" style={{ pointerEvents: 'none' }} />
        <circle cx={CX} cy={CY} r={76} fill="#FFFFFF" stroke="rgba(200,146,42,0.78)" strokeWidth="1.5" className={styles.centreCircle} />
        {centreLabel && (
          <text
            x={CX} y={CY}
            textAnchor="middle" dominantBaseline="middle"
            fill="rgba(200,146,42,0.78)" fontSize="31"
            fontFamily="'Cormorant Garamond', Georgia, serif"
            fontWeight="300" fontStyle="normal"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {centreLabel.split(' ').map((word, wi, arr) => (
              <tspan key={wi} x={CX} dy={wi === 0 ? `${-(arr.length - 1) * 0.6}em` : '1.25em'}>
                {word}
              </tspan>
            ))}
          </text>
        )}
      </g>
    </svg>
  )
}
