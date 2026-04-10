import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './Heptagon.module.css'

const N      = 7
const CX     = 260
const CY     = 260
const RADIUS = 170

// Slow ambient spin — 22s per rotation. Never stops.
const SPIN_DPS = 360 / 22

// Animation durations ms
const T_BLOOM_NODE = 300
const T_BLOOM_STAG = 50
const T_PULL       = 240
const T_BREATHE    = 280
const T_RISE       = 280

function nodePos(index, rotDeg) {
  const r = ((index * (360 / N)) - 90 + rotDeg) * Math.PI / 180
  return { x: CX + RADIUS * Math.cos(r), y: CY + RADIUS * Math.sin(r) }
}

function easeOut(t)   { return 1 - Math.pow(1 - t, 3) }
function easeInOut(t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2 }

function wrapLabel(name, max) {
  const lines = [], cur = { v: '' }
  name.split(' ').forEach(w => {
    const t = cur.v ? `${cur.v} ${w}` : w
    if (t.length <= max || !cur.v) cur.v = t
    else { lines.push(cur.v); cur.v = w }
  })
  if (cur.v) lines.push(cur.v)
  return lines
}

function getNodeLabel(name) {
  const tight = wrapLabel(name, 11)
  if (tight.length <= 3) return tight
  const loose = wrapLabel(name, 14)
  return loose.length < tight.length ? loose : tight
}

function getNodeSizing(lines) {
  const maxLen = Math.max(...lines.map(l => l.length))
  return {
    fontSize: 20,
    radius: Math.round(46 + (lines.length - 1) * 9 + Math.max(0, maxLen - 9) * 0.8),
    lineHeight: 1.28,
  }
}

const SETTLED = Array.from({ length: N }, () => ({ sc: 1, op: 1, ox: 0, oy: 0 }))
const HIDDEN  = Array.from({ length: N }, () => ({ sc: 0, op: 0, ox: 0, oy: 0 }))

export default function Heptagon({
  domains,
  activeIndex,
  onSelect,
  isIdle,
  centreLabel,
  onCentreClick,
  onDrillDown,
}) {
  const rotRef       = useRef(0)
  const lastRef      = useRef(null)
  const rafRef       = useRef(null)
  const animStartRef = useRef(null)
  const drillIdxRef  = useRef(null)

  const [rot,        setRot]        = useState(0)
  const [phase,      setPhase]      = useState('blooming')
  const [nodeStates, setNodeStates] = useState(HIDDEN)

  // Re-bloom when domains change (level navigation)
  useEffect(() => {
    if (!domains?.length) return
    animStartRef.current = null
    drillIdxRef.current  = null
    setPhase('blooming')
    setNodeStates(HIDDEN)
  }, [domains])

  // Main animation + spin loop
  useEffect(() => {
    function tick(ts) {
      if (!lastRef.current) lastRef.current = ts
      const dt = Math.min((ts - lastRef.current) / 1000, 0.05)
      lastRef.current = ts

      // Continuous spin — never stops
      rotRef.current += SPIN_DPS * dt
      setRot(rotRef.current)

      if (!animStartRef.current) animStartRef.current = ts
      const el = ts - animStartRef.current

      if (phase === 'blooming') {
        const ns = Array.from({ length: N }, (_, i) => {
          const t = Math.min(Math.max(0, el - i * T_BLOOM_STAG) / T_BLOOM_NODE, 1)
          const e = easeOut(t)
          return { sc: e, op: e, ox: 0, oy: 0 }
        })
        setNodeStates(ns)
        if (el >= (N - 1) * T_BLOOM_STAG + T_BLOOM_NODE) {
          setNodeStates(SETTLED)
          setPhase('settled')
        }
      }

      else if (phase === 'drilling') {
        const t   = Math.min(el / T_PULL, 1)
        const te  = easeInOut(t)
        const idx = drillIdxRef.current
        if (idx === null) { setPhase('settled'); rafRef.current = requestAnimationFrame(tick); return }
        const tp  = nodePos(idx, rotRef.current)
        setNodeStates(Array.from({ length: N }, (_, i) => {
          if (i === idx) return { sc: 1 + te * .12, op: 1, ox: (CX - tp.x) * te, oy: (CY - tp.y) * te }
          const p = nodePos(i, rotRef.current)
          return { sc: 1 - te * .18, op: 1 - te, ox: (p.x - CX) * .45 * te, oy: (p.y - CY) * .45 * te }
        }))
        if (t >= 1) { animStartRef.current = null; setPhase('breathing') }
      }

      else if (phase === 'breathing') {
        if (el >= T_BREATHE) {
          const idx = drillIdxRef.current
          drillIdxRef.current = null
          onDrillDown?.(idx)
        }
      }

      else if (phase === 'rising') {
        const t = Math.min(el / T_RISE, 1)
        const e = easeOut(t)
        setNodeStates(Array.from({ length: N }, () => ({ sc: e, op: e, ox: 0, oy: 0 })))
        if (t >= 1) { setNodeStates(SETTLED); setPhase('settled') }
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(rafRef.current); lastRef.current = null }
  }, [phase, onDrillDown])

  function handleClick(i) {
    if (phase !== 'settled') return
    onSelect(i)
    if (domains?.[i]?.subDomains?.length > 0) {
      drillIdxRef.current  = i
      animStartRef.current = null
      setPhase('drilling')
    }
  }

  const busy  = phase !== 'settled'
  const polyP = Array.from({ length: N }, (_, i) => {
    const p = nodePos(i, rot)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg className={styles.svg} viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" aria-label="NextUs Seven Domains">
      <circle cx={CX} cy={CY} r={RADIUS+48} fill="none" stroke="rgba(200,146,42,0.05)" strokeWidth="1"/>
      <circle cx={CX} cy={CY} r={RADIUS+24} fill="none" stroke="rgba(200,146,42,0.08)" strokeWidth="0.5"/>
      <polygon points={polyP} fill="rgba(200,146,42,0.03)" stroke="rgba(200,146,42,0.18)" strokeWidth="1"/>
      {Array.from({ length: N }, (_, i) => {
        const p = nodePos(i, rot)
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(200,146,42,0.08)" strokeWidth="0.5"/>
      })}

      {(domains || []).map((domain, i) => {
        const ns     = nodeStates[i] || { sc: 0, op: 0, ox: 0, oy: 0 }
        const p      = nodePos(i, rot)
        const active = !busy && !isIdle && i === activeIndex
        const words  = getNodeLabel(domain.name)
        const { fontSize, radius: r, lineHeight: lh } = getNodeSizing(words)
        const bh  = (words.length - 1) * lh
        const dy0 = words.length === 1 ? '0.35em' : `-${(bh / 2).toFixed(2)}em`
        const mwl = Math.max(...words.map(w => w.length))
        const rW  = Math.round(mwl * fontSize * 0.58 + 6)
        const rH  = Math.round(words.length * fontSize * lh + 4)

        return (
          <g key={domain.id || i}
            style={{
              cursor: busy ? 'default' : 'pointer',
              opacity: ns.op,
              transform: `translate(${ns.ox}px,${ns.oy}px) scale(${ns.sc})`,
              transformOrigin: `${p.x}px ${p.y}px`,
              outline: 'none',
            }}
            onClick={() => !busy && handleClick(i)}
            role="button" tabIndex={busy ? -1 : 0}
            aria-label={`Select: ${domain.name}`}
            onKeyDown={e => !busy && e.key === 'Enter' && handleClick(i)}
          >
            {active && <circle cx={p.x} cy={p.y} r={r+12} fill="rgba(200,146,42,0.06)" stroke="rgba(200,146,42,0.25)" strokeWidth="1"/>}
            <circle cx={p.x} cy={p.y} r={r} className={styles.nodeCircle}
              fill={active ? 'rgba(200,146,42,0.06)' : '#FFFFFF'}
              stroke={active ? 'rgba(200,146,42,1)' : 'rgba(200,146,42,0.78)'}
              strokeWidth={active ? 1.5 : 1}
            />
            <rect x={p.x-rW/2} y={p.y-rH/2} width={rW} height={rH} rx={8} ry={8}
              fill={active ? 'rgba(200,146,42,0.06)' : '#FFFFFF'} style={{ pointerEvents: 'none' }}/>
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fill={active ? '#A8721A' : '#0F1523'} fontSize={fontSize}
              fontFamily="'Cormorant SC', Georgia, serif" fontWeight="500" letterSpacing="0.04em"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {words.map((w, wi) => (
                <tspan key={wi} x={p.x} dy={wi === 0 ? dy0 : `${lh}em`}>{w}</tspan>
              ))}
            </text>
          </g>
        )
      })}

      {/* Centre orb */}
      <g className={styles.centreGroup} onClick={onCentreClick}
        role="button" tabIndex={0}
        aria-label={centreLabel ? `${centreLabel} — go back` : 'Our Planet'}
        onKeyDown={e => e.key === 'Enter' && onCentreClick?.()}
        style={{ cursor: onCentreClick ? 'pointer' : 'default' }}
      >
        <circle cx={CX} cy={CY} r={84} fill="none" stroke="rgba(200,146,42,0.18)" strokeWidth="1" style={{ pointerEvents: 'none' }}>
          <animate attributeName="r" values="82;90;82" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="stroke-opacity" values="0.18;0.04;0.18" dur="3s" repeatCount="indefinite"/>
        </circle>
        <circle cx={CX} cy={CY} r={80} fill="none" stroke="rgba(200,146,42,0.12)" strokeWidth="0.5" style={{ pointerEvents: 'none' }}/>
        <circle cx={CX} cy={CY} r={76} fill="#FFFFFF" stroke="rgba(200,146,42,0.78)" strokeWidth="1.5" className={styles.centreCircle}/>
        {centreLabel && (
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(200,146,42,0.78)" fontSize="31"
            fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="300"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {centreLabel.split(' ').map((w, wi, a) => (
              <tspan key={wi} x={CX} dy={wi === 0 ? `${-(a.length-1)*0.6}em` : '1.25em'}>{w}</tspan>
            ))}
          </text>
        )}
      </g>
    </svg>
  )
}
