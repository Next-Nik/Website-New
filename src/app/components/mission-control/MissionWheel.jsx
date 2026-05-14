// ─────────────────────────────────────────────────────────────
// MissionWheel.jsx
//
// Two-mode wheel. The self-side wheel renders the user's seven
// personal domains; the civ-side wheel renders the seven NextUs
// civilisational domains and the drill-down state machine.
//
// May 2026 update — domain colour identity:
//   • Labels on both wheels now use their domain colour (light
//     stop on parchment, dark stop on ink). The active label uses
//     the deeper saturated stop.
//   • Self-side placement-vertex dots carry domain colour. The
//     polygon they form stays GOLD — the user's life as a single
//     through-line shape, regardless of which tier each spoke
//     reads at.
//   • Civ-side tip dots carry domain colour. The active-state
//     ring around the focused tip and the centre-orb stay GOLD.
//   • Tier (Scale) colour reading is dropped from the wheels.
//     Position on the spoke gives fluency; colour gives identity.
//     Scale Colours retain their job in lists, badges, and
//     analytical views elsewhere.
//
// The civ-side state machine (intro spin → bloom → settled →
// navigating, plus drill-down) is preserved verbatim from v4 —
// only the colour layer is swapped.
//
// Common props (both modes):
//   kind:        'personal' | 'civ'
//   labels:      [string×N]
//   keys:        [string×N]
//   dark:        boolean
//
// Self-only props:
//   horizons, current, activeKey, walkers, isEmpty
//
// Civ-only props (when kind === 'civ'):
//   domains, activeIndex, centreLabel, bloom, busyLock,
//   onSelect, onLand, onDrillDown, onCentreClick,
//   placementKey, walkers
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE,
  BG_CARD, BG_INK,
  TEXT_META, TEXT_WHITE_META, TEXT_FAINT, TEXT_WHITE_FAINT,
  FONT_SC,
} from './tokens'
import { selfColor, civColor } from '../../../constants/domainColors'

// ─── Shared geometry ─────────────────────────────────────────
const N = 7
const SVG_W = 380
const SVG_H = 380
const SVG_VIEWBOX = '0 -20 380 380'

// Heptagon centre
const CX = 190
const CY = 170
const RADIUS = 99

function angleFor(i, count = N) {
  return (Math.PI * 2 * i) / count - Math.PI / 2
}

// Position of a spoke tip, given the wheel's current rotation in degrees
function getTipPos(i, rotationDeg = 0, count = N, r = RADIUS) {
  const baseAngle = angleFor(i, count) // radians, no rotation
  const rotRad = (rotationDeg * Math.PI) / 180
  const a = baseAngle + rotRad
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), angle: a }
}

// Rotation in DEGREES needed to bring index i to the top spoke,
// taking the shortest path from currentRot.
function getRotationToTop(index, currentRot, count = N) {
  const raw = -(index * (360 / count))
  const diff = ((raw - (currentRot % 360)) + 540) % 360 - 180
  return currentRot + diff
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ─── Self-only helpers ───────────────────────────────────────
// NOTE: tierColor() removed in May 2026 — wheel vertex dots now
// carry domain colour identity, not a Scale (tier) reading.
// Fluency is read from spoke position; identity from dot colour.
// Scale Colours live on elsewhere in lists and badges.

// Civ wheel labels rotate with the spokes, so position is computed
// from the tip's actual angle. Anchor flips based on which side of
// the wheel the tip is on.
//
// Long-label exception:
//   Labels at or above LONG_LABEL_THRESHOLD characters that land on a
//   side spoke (more horizontal than vertical) get their anchor FLIPPED
//   so the text reads INWARD from the tip instead of outward. A right-
//   side label is anchored `end` at its position so its text extends
//   leftward back toward the centre — staying inside the viewBox and
//   clear of the side rails.
//
//   Short labels and pole-spoke labels keep the original outward
//   placement unchanged.
//
//   Because at most a small number of labels qualify at any rotation
//   (typically 0-2 of the 7), the inward-reading labels don't pile
//   up at centre the way v2 did.
//
//   The label arg is optional. If not provided, the function returns
//   the original short-label placement.
const LONG_LABEL_THRESHOLD = 11   // chars — HUMAN BEING (11) qualifies;
                                  //         INNER GAME / CONNECTION (10) don't.
function civLabelPosFor(tipX, tipY, angleRad, label) {
  const GAP = 14
  // Unit vector pointing outward from centre along the spoke
  const ux = Math.cos(angleRad)
  const uy = Math.sin(angleRad)

  const isLong = label && label.length >= LONG_LABEL_THRESHOLD
  const isSide = Math.abs(ux) > Math.abs(uy)
  const flip   = isLong && isSide

  const x = tipX + ux * GAP
  const y = tipY + uy * GAP + 4 // +4 so vertical centring of small caps reads

  // Anchor:
  //   Short labels and pole spokes: middle if tip is near top/bottom,
  //     start/end by side (text extends outward). Original behaviour.
  //   Long labels on side spokes: anchor is INVERTED so text reads
  //     inward from the tip, keeping the full label inside the viewBox.
  let anchor = 'middle'
  if (flip) {
    if (ux > 0)      anchor = 'end'   // right-side long label, text reads leftward
    else             anchor = 'start' // left-side long label, text reads rightward
  } else {
    if (ux > 0.2)       anchor = 'start'
    else if (ux < -0.2) anchor = 'end'
  }
  return { x, y, anchor }
}

// ─── Drill-down animation timings (civ only) ─────────────────
const T_PULL    = 240
const T_BREATHE = 280
const INTRO_SPIN_DEG_PER_SEC = 35
const INTRO_SPIN_DURATION_MS = 4000
const BLOOM_DURATION_MS      = 1600

// ─── ENTRY ───────────────────────────────────────────────────

export default function MissionWheel(props) {
  if (props.kind === 'civ') return <CivWheel {...props} />
  return <SelfWheel {...props} />
}

// ═════════════════════════════════════════════════════════════
// SELF WHEEL — May 2026 rotation update.
//
// Rotation infrastructure ported from CivWheel (simplified):
//   • No intro spin, no bloom, no drill-down — personal wheel
//     starts settled and stays settled.
//   • Two phases: 'navigating' (easing toward target) → 'settled'.
//   • activeKey change → rotate that spoke to the top.
//   • activeKey null → return to 0° (neutral resting position).
//   • Everything that spins sits inside a <g transform="rotate(...)">
//     wrapper: spokes, tip dots, score polygon, vertex dots,
//     active ring, walker cluster, labels.
//   • Labels now use civLabelPosFor (angle-based) so they travel
//     with their spoke rather than staying at a static offset.
//   • Outer dashed ring and centre orb stay fixed (don't rotate).
// ═════════════════════════════════════════════════════════════
function SelfWheel({
  labels,
  keys,
  horizons = {},
  current = {},
  activeKey = null,
  walkers = {},
  isEmpty = false,
  dark = false,
  onSelect,
  onCentreClick,
}) {
  const cx = CX
  const cy = CY
  const maxR = RADIUS

  // ── Rotation state ───────────────────────────────────────────
  // Initialise to a random spoke so no domain is privileged at top
  // on mount — same behaviour as the civ wheel. The random angle is
  // computed once and baked into the ref; subsequent activeKey changes
  // navigate from wherever the wheel landed.
  const initialRot = useMemo(() => {
    const randomIdx = Math.floor(Math.random() * N)
    return getRotationToTop(randomIdx, 0, N)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [phase,      setPhase]      = useState('settled')
  const [displayRot, setDisplayRot] = useState(initialRot)
  const rotRef       = useRef(initialRot)
  const targetRotRef = useRef(null)
  const animRef      = useRef(null)
  const lastTimeRef  = useRef(null)

  const hasMountedRef = useRef(false)

  // When activeKey changes, rotate the chosen spoke to the top.
  // Skip the effect on first mount when activeKey is null — the random
  // start position is already correct and we don't want to navigate away.
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      if (activeKey == null) return  // nothing to do on mount with no selection
    }
    const idx = activeKey != null ? keys.indexOf(activeKey) : -1
    const targetAngle = idx >= 0
      ? getRotationToTop(idx, rotRef.current, N)
      : (() => {
          const cur = rotRef.current % 360
          const diff = ((0 - cur) + 540) % 360 - 180
          return rotRef.current + diff
        })()
    targetRotRef.current = targetAngle
    setPhase('navigating')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  // RAF loop — only runs during 'navigating'
  useEffect(() => {
    if (phase !== 'navigating') return
    function animate(time) {
      if (lastTimeRef.current === null) lastTimeRef.current = time
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = time
      const diff = (targetRotRef.current ?? rotRef.current) - rotRef.current
      if (Math.abs(diff) < 0.15) {
        rotRef.current = targetRotRef.current ?? rotRef.current
        setDisplayRot(rotRef.current)
        setPhase('settled')
      } else {
        rotRef.current += diff * Math.min(1, dt * 4.5)
        setDisplayRot(rotRef.current)
        animRef.current = requestAnimationFrame(animate)
      }
    }
    lastTimeRef.current = null
    animRef.current = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(animRef.current)
      lastTimeRef.current = null
    }
  }, [phase])

  // ── Centre orb proximity ─────────────────────────────────────
  const ORB_PROXIMITY = 120
  const svgRef = useRef(null)
  const [orbOpacity, setOrbOpacity] = useState(0)
  const orbTarget = activeKey != null ? 1 : orbOpacity

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const vbW = 380, vbH = 380, vbMinY = -20
    const svgX = ((e.clientX - rect.left) / rect.width)  * vbW
    const svgY = ((e.clientY - rect.top)  / rect.height) * vbH + vbMinY
    const dist = Math.sqrt((svgX - cx) ** 2 + (svgY - cy) ** 2)
    const raw = 1 - Math.max(0, dist - ORB_PROXIMITY / 2) / (ORB_PROXIMITY / 2)
    setOrbOpacity(Math.max(0, Math.min(1, raw)))
  }, [cx, cy])

  const handleMouseLeave = useCallback(() => {
    setOrbOpacity(0)
  }, [])

  // ── Data ─────────────────────────────────────────────────────
  const hasAnyCurrent = useMemo(() => {
    if (isEmpty) return false
    return keys.some(k => current[k] != null)
  }, [isEmpty, keys, current])

  const renderHorizons = useMemo(() => {
    if (hasAnyCurrent) return horizons
    return Object.fromEntries(keys.map(k => [k, 10]))
  }, [hasAnyCurrent, horizons, keys])

  const showEmpty = !hasAnyCurrent

  // Score polygon vertices — unrotated coords; the rotating <g> handles placement.
  // (displayRot must NOT be baked in here — the group transform would double-rotate.)
  const verts = useMemo(() => {
    return keys.map((k, i) => {
      const h = renderHorizons[k] || 10
      const c = showEmpty ? 0 : (current[k] ?? 0)
      const ratio = h === 0 ? 0 : Math.min(c / h, 1)
      const a = angleFor(i)   // unrotated — group transform rotates the group
      const r = ratio * maxR
      return {
        i, key: k,
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
        color: selfColor(k).base,
      }
    })
  }, [keys, renderHorizons, current, showEmpty, cx, cy, maxR])

  // Outer ring polygon — rotates with the spokes so tips stay at corners
  const ringPts = useMemo(() => {
    const pts = []
    for (let i = 0; i < N; i++) {
      const a = angleFor(i) + (displayRot * Math.PI) / 180
      pts.push(`${cx + maxR * Math.cos(a)},${cy + maxR * Math.sin(a)}`)
    }
    return pts.join(' ')
  }, [cx, cy, maxR, displayRot])

  const ringStroke  = dark ? 'rgba(200, 146, 42, 0.30)' : 'rgba(200, 146, 42, 0.20)'
  const spokeStroke = dark ? 'rgba(200, 146, 42, 0.45)' : 'rgba(200, 146, 42, 0.30)'
  const vertStroke     = dark ? BG_INK : BG_CARD
  const walkerLabelFill = dark ? GOLD_LT : GOLD_DK
  const walkerDotFill   = dark ? GOLD_LT : GOLD_DK

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={SVG_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', overflow: 'visible'}}
      aria-label="Your seven domains"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Outer dashed ring — rotates with spokes so tips stay at corners */}
      <polygon
        points={ringPts}
        fill="none"
        stroke={ringStroke}
        strokeWidth="1"
        strokeDasharray="3 3"
        style={{ pointerEvents: 'none' }}
      />

      {/* ── Rotating group: geometry only (spokes, dots, polygon).
          Labels and walker text live OUTSIDE this group so SVG's
          transform does not rotate the glyphs — same pattern as
          CivWheel, which has done this correctly from the start. ── */}
      <g transform={`rotate(${displayRot} ${cx} ${cy})`}>

        {/* Spokes + tip dots — positions at rot=0; <g> rotation handles placement */}
        {Array.from({ length: N }).map((_, i) => {
          const p = getTipPos(i, 0)
          // Unit vectors along and perpendicular to the spoke (for notch geometry)
          const dx = p.x - cx
          const dy = p.y - cy
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          const ux = dx / len   // along-spoke unit
          const uy = dy / len
          const px = -uy        // perpendicular unit (rotated 90°)
          const py = ux
          return (
            <g key={`spoke-${i}`}>
              <line
                x1={cx} y1={cy} x2={p.x} y2={p.y}
                stroke={spokeStroke}
                strokeWidth="1"
                style={{ pointerEvents: 'none' }}
              />
              {/* Scale notches — 10 major (1..10) + 9 half (0.5, 1.5, ... 9.5).
                  Subtle gold rule perpendicular to the spoke; reference, not focus. */}
              {Array.from({ length: 19 }).map((_, n) => {
                const score = (n + 1) * 0.5       // 0.5, 1.0, 1.5, ... 9.5, 10.0
                const isMajor = Number.isInteger(score)
                const r = (score / 10) * maxR
                const tx = cx + ux * r
                const ty = cy + uy * r
                const halfLen = isMajor ? 2.5 : 1.25
                return (
                  <line
                    key={`notch-${i}-${n}`}
                    x1={tx - px * halfLen} y1={ty - py * halfLen}
                    x2={tx + px * halfLen} y2={ty + py * halfLen}
                    stroke={spokeStroke}
                    strokeWidth={isMajor ? 1 : 0.75}
                    strokeOpacity={isMajor ? 0.7 : 0.4}
                    style={{ pointerEvents: 'none' }}
                  />
                )
              })}
              {/* Wide invisible overlay — full spoke shaft is a hit target */}
              {onSelect && (
                <line
                  x1={cx} y1={cy} x2={p.x} y2={p.y}
                  stroke="transparent"
                  strokeWidth="18"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelect(i)}
                />
              )}
              <circle
                cx={p.x} cy={p.y} r={3}
                fill="rgba(200,146,42,0.5)"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          )
        })}

        {/* Score polygon + vertex dots */}
        {showEmpty ? (
          <circle
            cx={cx} cy={cy} r={6}
            fill="rgba(200,146,42,0.10)"
            stroke="rgba(200,146,42,0.40)"
            strokeWidth="1"
            strokeDasharray="3 3"
            style={{ pointerEvents: 'none' }}
          />
        ) : (
          <>
            <polygon
              points={verts.map(v => `${v.x},${v.y}`).join(' ')}
              fill="none"
              stroke={GOLD}
              strokeWidth="1.25"
              strokeOpacity="0.7"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />
            {verts.map(v => (
              <g
                key={`vert-${v.i}`}
                onClick={onSelect ? () => onSelect(v.i) : undefined}
                style={onSelect ? { cursor: 'pointer' } : undefined}
              >
                {onSelect && (
                  <circle cx={v.x} cy={v.y} r={12} fill="transparent" />
                )}
                <circle
                  cx={v.x} cy={v.y} r={2.5}
                  fill={v.color}
                  stroke={vertStroke}
                  strokeWidth="1"
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            ))}
          </>
        )}

        {/* Active domain ring — on the score dot */}
        {!showEmpty && activeKey && (() => {
          const idx = keys.indexOf(activeKey)
          if (idx < 0) return null
          const v = verts[idx]
          return (
            <g style={{ pointerEvents: 'none' }}>
              <circle cx={v.x} cy={v.y} r={4} fill={GOLD} />
              <circle cx={v.x} cy={v.y} r={8} fill={GOLD} opacity="0.5">
                <animate attributeName="r" values="6;11;6" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.85;0.5" dur="2.5s" repeatCount="indefinite" />
              </circle>
            </g>
          )
        })()}

        {/* Walker dots — fine to rotate with the group */}
        {(() => {
          const focusKey = activeKey
          if (!focusKey) return null
          const count = walkers[focusKey] || 0
          if (count <= 0) return null
          const idx = keys.indexOf(focusKey)
          if (idx < 0) return null
          const p = getTipPos(idx, 0)
          const clusterR = maxR * 1.40
          const ccx = cx + clusterR * Math.cos(p.angle)
          const ccy = cy + clusterR * Math.sin(p.angle)
          const dotsToShow = Math.min(count, 8)
          const dots = []
          for (let j = 0; j < dotsToShow; j++) {
            const aa = (Math.PI * 2 * j) / dotsToShow + (idx * 0.4)
            const wob = 0.6 + 0.4 * ((j * 37) % 100) / 100
            dots.push(
              <circle
                key={`walker-${j}`}
                cx={(ccx + 14 * Math.cos(aa) * wob).toFixed(1)}
                cy={(ccy + 14 * Math.sin(aa) * wob).toFixed(1)}
                r={2}
                fill={walkerDotFill}
                opacity="0.7"
              />
            )
          }
          return <g style={{ pointerEvents: 'none' }}>{dots}</g>
        })()}

      </g>
      {/* ── End rotating group ── */}

      {/* ── Labels and hit targets — outside the rotating group.
          Tip positions computed with displayRot baked in so labels
          follow their spokes but the text glyphs stay upright.
          Same pattern as CivWheel. ── */}
      {labels.map((txt, i) => {
        const p = getTipPos(i, displayRot)  // actual rotated position
        const pos = civLabelPosFor(p.x, p.y, p.angle, txt)
        const isActive = activeKey && keys[i] === activeKey
        const dc = selfColor(keys[i])
        const baseFill   = dark ? dc.dark : dc.light
        const activeFill = dc.base
        return (
          <g key={`label-${i}`}>
            {/* Invisible hit target at the tip — generous tap zone */}
            {onSelect && (
              <circle
                cx={p.x} cy={p.y} r={18}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(i)}
              >
                <title>{labels[i]}</title>
              </circle>
            )}
            <text
              x={pos.x}
              y={pos.y}
              textAnchor={pos.anchor}
              onClick={onSelect ? () => onSelect(i) : undefined}
              style={{
                fontFamily: FONT_SC,
                fontSize: 17,
                letterSpacing: '0.18em',
                fill: isActive ? activeFill : baseFill,
                fontWeight: isActive ? 700 : 600,
                cursor: onSelect ? 'pointer' : undefined,
                userSelect: 'none',
                textTransform: 'uppercase',
                pointerEvents: onSelect ? 'auto' : 'none',
              }}
            >
              {txt}
            </text>
          </g>
        )
      })}

      {/* Walker label — outside rotating group so text stays upright */}
      {(() => {
        const focusKey = activeKey
        if (!focusKey) return null
        const count = walkers[focusKey] || 0
        if (count <= 0) return null
        const idx = keys.indexOf(focusKey)
        if (idx < 0) return null
        const p = getTipPos(idx, displayRot)  // rotated position
        const clusterR = maxR * 1.40
        const ccx = cx + clusterR * Math.cos(p.angle)
        const ccy = cy + clusterR * Math.sin(p.angle)
        const perpAngle = p.angle + Math.PI / 2
        const labelX = ccx + 24 * Math.cos(perpAngle)
        const labelY = ccy + 24 * Math.sin(perpAngle) + 3
        const labelAnchor =
          Math.cos(perpAngle) >= 0.2  ? 'start' :
          Math.cos(perpAngle) <= -0.2 ? 'end' :
                                        'middle'
        return (
          <text
            x={labelX.toFixed(1)}
            y={labelY.toFixed(1)}
            textAnchor={labelAnchor}
            style={{ fontFamily: FONT_SC, fontSize: 9, letterSpacing: '0.12em', fill: walkerLabelFill, pointerEvents: 'none' }}
          >
            {count} walking
          </text>
        )
      })()}

      {/* Centre orb — soft golden glow, not a solid disc.
          Fades in on cursor proximity and when a domain is featured.
          Brief: "soft golden orb ... visually signals click me to go back."
          Three layers for depth: wide outer bloom, mid haze, tight core. */}
      {onCentreClick && (
        <g
          onClick={onCentreClick}
          style={{ cursor: 'pointer' }}
          aria-label="Return to my life overview"
        >
          {/* Outer bloom — wide, very soft */}
          <circle
            cx={cx} cy={cy} r={48}
            fill="rgba(200,146,42,0.07)"
            style={{ opacity: orbTarget, transition: 'opacity 0.4s ease', pointerEvents: 'none' }}
          >
            <animate attributeName="r" values="44;52;44" dur="3.6s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" values="0.07;0.04;0.07" dur="3.6s" repeatCount="indefinite" />
          </circle>
          {/* Mid haze */}
          <circle
            cx={cx} cy={cy} r={28}
            fill="rgba(200,146,42,0.15)"
            style={{ opacity: orbTarget, transition: 'opacity 0.4s ease', pointerEvents: 'none' }}
          />
          {/* Tight core — still soft, not solid */}
          <circle
            cx={cx} cy={cy} r={14}
            fill="rgba(200,146,42,0.35)"
            stroke="rgba(200,146,42,0.5)"
            strokeWidth="1"
            style={{ opacity: orbTarget, transition: 'opacity 0.4s ease', pointerEvents: 'none' }}
          />
          {/* Hit zone */}
          <circle
            cx={cx} cy={cy} r={40}
            fill="transparent"
            style={{ pointerEvents: 'auto' }}
          >
            <title>My life overview</title>
          </circle>
        </g>
      )}
    </svg>
  )
}

// ═════════════════════════════════════════════════════════════
// CIV WHEEL — Heptagon's behaviour set in MissionWheel's flat
// aesthetic. Stateful internally for animation; navigation state
// is owned by the parent (MissionControl).
// ═════════════════════════════════════════════════════════════
function CivWheel({
  labels,
  keys,
  domains,         // [{ id, name, horizonGoal, description, subDomains }]
  activeIndex,     // number | null   — the featured spoke
  centreLabel,     // string | null   — label inside centre orb
  bloom = false,   // when true, run the bloom-on-mount animation
  busyLock = false,// when true, ignore clicks (e.g. while page is mid-transition)
  onSelect,        // (i) => void
  onLand,          // (i) => void
  onDrillDown,     // (i) => void
  onCentreClick,   // () => void
  placementKey = null,
  walkers = {},
  current = {},    // { [key]: 0..10 score from rollup, or undefined for unscored }
  horizons = {},   // { [key]: 0..10 horizon (always 10 for civ) }
  dark = true,
}) {
  // Domains may not yet be loaded — fall back to labels for display
  // so the wheel still renders during initial fetch.
  const displayLabels = useMemo(() => {
    if (Array.isArray(domains) && domains.length === labels.length) {
      return domains.map(d => (d?.name ? d.name.toUpperCase() : ''))
    }
    return labels
  }, [domains, labels])

  const count = displayLabels.length || N

  // Phase: 'spinning' → 'landing' → 'settled' → ('navigating' → 'settled')
  //        ('drilling' → 'breathing') terminates by emitting onDrillDown.
  // After re-mount on a new level, phase resets to 'spinning' so the
  // wheel re-introduces its new domain set.
  const [phase,        setPhase]        = useState('spinning')
  const [displayRot,   setDisplayRot]   = useState(0)
  const [nodeStates,   setNodeStates]   = useState(null)
  const [bloomT,       setBloomT]       = useState(0)
  const [bloomed,      setBloomed]      = useState(!bloom)

  const rotRef          = useRef(0)
  const targetRotRef    = useRef(null)
  const landingIdxRef   = useRef(null)
  const drillIdxRef     = useRef(null)
  const animRef         = useRef(null)
  const lastTimeRef     = useRef(null)
  const spinStartRef    = useRef(Date.now())
  const drillStartRef   = useRef(null)
  const breatheStartRef = useRef(null)

  const bloomStartRef   = useRef(null)
  const bloomRafRef     = useRef(null)

  // Bloom on mount (or whenever bloom flips on)
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

  // Track whether this is the very first mount so we only spin once.
  const hasSpunRef = useRef(false)

  // Reset state machine whenever the domain set changes (drill-down
  // / drill-up replaces the seven shown spokes). First mount gets
  // the full intro spin; subsequent domain-set swaps skip it and
  // settle immediately at a random position.
  useEffect(() => {
    if (!count) return
    rotRef.current = 0
    targetRotRef.current = null
    drillIdxRef.current = null
    drillStartRef.current = null
    breatheStartRef.current = null
    setNodeStates(null)
    landingIdxRef.current = Math.floor(Math.random() * count)
    spinStartRef.current = Date.now()
    lastTimeRef.current = null

    if (!hasSpunRef.current) {
      // First mount — run the intro spin
      hasSpunRef.current = true
      setPhase('spinning')
      setDisplayRot(0)
    } else {
      // Drill-in / drill-up — skip spin, land immediately
      const targetAngle = getRotationToTop(landingIdxRef.current, 0, count)
      rotRef.current = targetAngle
      targetRotRef.current = targetAngle
      setDisplayRot(targetAngle)
      setPhase('settled')
      onLand?.(landingIdxRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, domains])

  // External activeIndex changes (e.g. via below-wheel arrows) →
  // rotate to that spoke if we're already past the spinning phase.
  useEffect(() => {
    if ((phase === 'settled' || phase === 'navigating') && activeIndex !== null && activeIndex !== undefined) {
      targetRotRef.current = getRotationToTop(activeIndex, rotRef.current, count)
      setPhase('navigating')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

  const cancelSpinAndSelect = useCallback((index) => {
    landingIdxRef.current = index
    targetRotRef.current = getRotationToTop(index, rotRef.current, count)
    setPhase('landing')
    onSelect?.(index)
  }, [onSelect, count])

  // RAF loop
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
          targetRotRef.current = getRotationToTop(landingIdxRef.current, rotRef.current, count)
          setPhase('landing')
          onLand?.(landingIdxRef.current)
        }
      }

      else if (phase === 'landing' || phase === 'navigating') {
        const diff = (targetRotRef.current ?? rotRef.current) - rotRef.current
        if (Math.abs(diff) < 0.2) {
          rotRef.current = targetRotRef.current ?? rotRef.current
          setDisplayRot(rotRef.current)
          setPhase('settled')
        } else {
          rotRef.current += diff * Math.min(1, dt * (phase === 'navigating' ? 4.5 : 3.5))
          setDisplayRot(rotRef.current)
        }
      }

      else if (phase === 'drilling') {
        if (!drillStartRef.current) drillStartRef.current = time
        const t = Math.min((time - drillStartRef.current) / T_PULL, 1)
        const te = easeInOut(t)
        const idx = drillIdxRef.current
        const tp = getTipPos(idx, rotRef.current, count)

        setNodeStates(Array.from({ length: count }, (_, i) => {
          if (i === idx) {
            return { sc: 1 + te * 0.6, op: 1, ox: (CX - tp.x) * te, oy: (CY - tp.y) * te }
          }
          const p = getTipPos(i, rotRef.current, count)
          return { sc: 1 - te * 0.4, op: 1 - te, ox: (p.x - CX) * 0.45 * te, oy: (p.y - CY) * 0.45 * te }
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
    return () => {
      cancelAnimationFrame(animRef.current)
      lastTimeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count])

  function handleNodeClick(i) {
    if (busyLock) return
    if (phase === 'spinning') { cancelSpinAndSelect(i); return }
    // Allow clicks during navigating — just redirect to the new target
    if (phase === 'navigating' || phase === 'settled') {
      onSelect?.(i)
      if (domains?.[i]?.subDomains?.length > 0) {
        drillIdxRef.current = i
        drillStartRef.current = null
        setPhase('drilling')
      } else {
        targetRotRef.current = getRotationToTop(i, rotRef.current, count)
        setPhase('navigating')
      }
      return
    }
    if (phase !== 'settled') return
  }

  // Select-only handler — used by the score-polygon vertex dots
  // ("Position" nodes — where we are now). Clicking one opens the
  // explainer panel, NOT drill, AND signals the panel to focus on
  // the indicator-level evidence section rather than the goal
  // unpacking. Drilling stays on spoke-tip dots and labels.
  function handleVertexClick(i) {
    if (busyLock) return
    if (phase === 'spinning') { cancelSpinAndSelect(i); return }
    if (phase === 'navigating' || phase === 'settled') {
      onSelect?.(i, 'position')
      // Rotate the chosen spoke to the top, but never drill.
      targetRotRef.current = getRotationToTop(i, rotRef.current, count)
      setPhase('navigating')
    }
  }

  function handleCentreClick() {
    if (busyLock) return
    if (phase !== 'settled' && phase !== 'spinning') return
    onCentreClick?.()
  }

  const isSpinning = phase === 'spinning' || phase === 'landing'
  const busy       = phase !== 'settled'

  // Outer ring polygon — rotates with the spokes so tips stay at corners
  const ringPts = useMemo(() => {
    const pts = []
    for (let i = 0; i < count; i++) {
      const a = angleFor(i, count) + (displayRot * Math.PI) / 180
      pts.push(`${CX + RADIUS * Math.cos(a)},${CY + RADIUS * Math.sin(a)}`)
    }
    return pts.join(' ')
  }, [count, displayRot])

  const ringStroke = dark ? 'rgba(200, 146, 42, 0.30)' : 'rgba(200, 146, 42, 0.20)'
  const spokeStroke = dark ? 'rgba(200, 146, 42, 0.45)' : 'rgba(200, 146, 42, 0.30)'
  const labelFill = dark ? TEXT_WHITE_META : TEXT_META
  const labelActiveFill = dark ? GOLD_LT : GOLD_DK
  const centreFill = GOLD
  const centreStroke = dark ? 'rgba(200, 146, 42, 0.6)' : 'rgba(168, 114, 26, 0.7)'
  const centreTextFill = dark ? '#0F1523' : '#FFFFFF' // ink on gold reads on either stage

  // Centre orb sized to fit the longest centre label that can appear.
  // FONT_SC at 11px with 0.18em letter-spacing → ~7px per character avg.
  // We size to the displayed text + a margin, clamped to a sensible range.
  const centreLabelLines = useMemo(() => {
    if (!centreLabel) return []
    return centreLabel.toUpperCase().split(' ')
  }, [centreLabel])

  const centreFontSize = 12
  const centreLineHeight = 1.25
  const centreRadius = useMemo(() => {
    if (!centreLabelLines.length) return 22
    const longest = Math.max(...centreLabelLines.map(l => l.length))
    // Cormorant SC at 12px with 0.18em letter-spacing ≈ 9.4px per char
    const halfW = (longest * 9.4) / 2 + 10
    const halfH = (centreLabelLines.length * centreFontSize * centreLineHeight) / 2 + 10
    const raw = Math.max(halfW, halfH)
    return Math.min(48, Math.max(26, raw))
  }, [centreLabelLines])

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={SVG_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', overflow: 'visible'}}
      aria-label="The seven civilisational domains"
    >
      {/* Outer dashed ring — rotates with spokes so tips stay at corners */}
      <polygon
        points={ringPts}
        fill="none"
        stroke={ringStroke}
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Current-state polygon — rotates with the wheel. Vertices at
          (score/10) * RADIUS along each spoke. Domains without a score
          (current[key] == null) get a vertex at the centre, which makes
          the polygon "collapse" toward unscored spokes. We only render
          the polygon when at least 3 domains are scored — fewer than 3
          can't form a meaningful shape. */}
      {/* Current-state polygon + vertex dots — same node structure as
          the Self wheel. Vertices at (score/10) * RADIUS along each
          spoke, coloured by domain, clickable, with a pulsing active
          ring on the featured domain. Only renders when at least 3
          domains are scored. */}
      {(() => {
        const scoredCount = keys.reduce((n, k) => n + (current[k] != null ? 1 : 0), 0)
        if (scoredCount < 3) return null

        // Compute vertex positions and metadata once
        const civVerts = keys.map((k, i) => {
          const score = current[k]
          const horizon = horizons[k] ?? 10
          const ratio = (score != null && horizon > 0) ? Math.min(score / horizon, 1) : 0
          // Minimum visible radius — keep the vertex outside the centre
          // orb so low-scoring domains don't disappear behind it.
          const minR = centreRadius + 8
          const r = score == null ? 0 : Math.max(minR, ratio * RADIUS)
          const baseAngle = angleFor(i, count)
          const rotRad = (displayRot * Math.PI) / 180
          const a = baseAngle + rotRad
          return {
            i,
            key: k,
            score,
            x: CX + r * Math.cos(a),
            y: CY + r * Math.sin(a),
            // civColor returns an object {base, light, dark, ...}. Pick
            // the stop that reads on the current stage: dark for the
            // ink ground, light for parchment.
            color: dark ? civColor(k).dark : civColor(k).light,
          }
        })

        const polyPoints = civVerts.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ')

        return (
          <g style={{ opacity: bloomed ? 1 : bloomT }}>
            {/* Polygon — gold stroke only, no fill, so the coloured
                Position dots read against the dark background. Matches
                the Self wheel treatment. */}
            <polygon
              points={polyPoints}
              fill="none"
              stroke={GOLD}
              strokeWidth="1.25"
              strokeOpacity="0.55"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />
            {/* Clickable domain-coloured vertex dots — open the explainer,
                never drill (drilling stays on tips and labels). */}
            {civVerts.map(v => v.score != null && (
              <g
                key={`civ-vert-${v.i}`}
                onClick={() => !busy && !busyLock && handleVertexClick(v.i)}
                style={{ cursor: busy || busyLock ? 'default' : 'pointer' }}
              >
                {/* Generous invisible hit zone */}
                <circle cx={v.x} cy={v.y} r={12} fill="transparent" />
                {/* Visible coloured dot */}
                <circle
                  cx={v.x} cy={v.y} r={3.5}
                  fill={v.color}
                  stroke={dark ? '#0F1523' : '#FAFAF7'}
                  strokeWidth="1"
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            ))}
            {/* Active domain ring — pulsing, on the featured spoke's score vertex */}
            {activeIndex != null && civVerts[activeIndex] && civVerts[activeIndex].score != null && (() => {
              const v = civVerts[activeIndex]
              return (
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx={v.x} cy={v.y} r={5} fill={GOLD} />
                  <circle cx={v.x} cy={v.y} r={9} fill={GOLD} opacity="0.5">
                    <animate attributeName="r" values="7;12;7" dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0.85;0.5" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                </g>
              )
            })()}
          </g>
        )
      })()}

      {/* Spokes — rotate with displayRot. During bloom, spokes grow
          from the centre outward, ending at the same bloom-position
          as the tip dot so the line and dot stay visually attached. */}
      {Array.from({ length: count }, (_, i) => {
        const p = getTipPos(i, displayRot, count)
        const sx = bloomed ? p.x : (CX + (p.x - CX) * bloomT)
        const sy = bloomed ? p.y : (CY + (p.y - CY) * bloomT)
        // Unit vectors along and perpendicular to the spoke (for notches)
        const dx = p.x - CX
        const dy = p.y - CY
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const ux = dx / len
        const uy = dy / len
        const px = -uy
        const py = ux
        return (
          <g key={`spoke-${i}`}>
            <line
              x1={CX} y1={CY}
              x2={sx} y2={sy}
              stroke={spokeStroke}
              strokeWidth="1"
              style={{ opacity: bloomed ? 1 : bloomT }}
            />
            {/* Scale notches — 10 major + 9 half marks per spoke.
                Only render when bloom is complete so they don't appear
                mid-animation. */}
            {bloomed && Array.from({ length: 19 }).map((_, n) => {
              const score = (n + 1) * 0.5
              const isMajor = Number.isInteger(score)
              const r = (score / 10) * RADIUS
              const tx = CX + ux * r
              const ty = CY + uy * r
              const halfLen = isMajor ? 2.5 : 1.25
              return (
                <line
                  key={`notch-${i}-${n}`}
                  x1={tx - px * halfLen} y1={ty - py * halfLen}
                  x2={tx + px * halfLen} y2={ty + py * halfLen}
                  stroke={spokeStroke}
                  strokeWidth={isMajor ? 1 : 0.75}
                  strokeOpacity={isMajor ? 0.7 : 0.4}
                  style={{ pointerEvents: 'none' }}
                />
              )
            })}
          </g>
        )
      })}

      {/* Vertex tip dots + labels (rotate together with spokes) */}
      {displayLabels.map((labelText, i) => {
        const p        = getTipPos(i, displayRot, count)
        const ns       = nodeStates?.[i]
        const isActive = !busy && i === activeIndex
        const isPlacement = placementKey && keys[i] === placementKey

        // Bloom: tips travel from centre outward
        const bloomedX = CX + (p.x - CX) * bloomT
        const bloomedY = CY + (p.y - CY) * bloomT
        const tipX = bloomed ? p.x : bloomedX
        const tipY = bloomed ? p.y : bloomedY

        // Drill-down node deformation. Compose translate + scale-around-tip
        // as a single SVG transform string. To scale around the tip, we
        // use translate(tip) scale(s) translate(-tip).
        let groupTransform = ''
        let groupOpacity = bloomed ? 1 : bloomT
        if (ns) {
          groupOpacity = ns.op
          groupTransform =
            `translate(${ns.ox}, ${ns.oy}) ` +
            `translate(${tipX}, ${tipY}) ` +
            `scale(${ns.sc}) ` +
            `translate(${-tipX}, ${-tipY})`
        }

        const labelPos = civLabelPosFor(tipX, tipY, p.angle, labelText)

        // Civ tip dot: domain colour. Active state lifts to the saturated
        // base on parchment; on dark we stay at the lighter stop because
        // base is the deep-saturation version, which goes invisible on
        // ink. Pulsing halo around the active tip stays GOLD regardless.
        const dc = civColor(keys[i])
        const tipR = isActive ? 4.5 : 3
        const tipFill = isActive
          ? (dark ? dc.dark : dc.base)
          : (dark ? dc.dark : dc.light)
        const baseLabelFill = dark ? dc.dark : dc.light
        const activeLabelFill = dark ? dc.dark : dc.base

        return (
          <g
            key={`node-${i}`}
            transform={groupTransform}
            opacity={groupOpacity}
            onClick={() => handleNodeClick(i)}
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-label={`Domain: ${labelText}`}
            style={{
              cursor: busy || busyLock ? 'default' : 'pointer',
            }}
            onKeyDown={e => e.key === 'Enter' && handleNodeClick(i)}
          >
            {/* Generous invisible hit target */}
            <circle
              cx={tipX} cy={tipY} r={18}
              fill="transparent"
              style={{ pointerEvents: 'auto' }}
            />
            {/* Visible tip dot — domain colour */}
            <circle
              cx={tipX} cy={tipY}
              r={tipR}
              fill={tipFill}
              style={{ pointerEvents: 'none' }}
            />
            {/* Active-state pulsing halo — STAYS GOLD (Horizon-shared aim) */}
            {isActive && (
              <circle cx={tipX} cy={tipY} r={8} fill={GOLD} opacity="0.4" style={{ pointerEvents: 'none' }}>
                <animate attributeName="r" values="6;11;6" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0.7;0.35" dur="2.5s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Invisible hit rect covering the label text area */}
            <rect
              x={labelPos.anchor === 'start'  ? labelPos.x - 4  :
                 labelPos.anchor === 'end'    ? labelPos.x - 80 :
                                               labelPos.x - 42}
              y={labelPos.y - 14}
              width={84}
              height={20}
              fill="transparent"
              style={{ pointerEvents: 'auto' }}
            />
            {/* Label — domain colour */}
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor={labelPos.anchor}
              style={{
                fontFamily: FONT_SC,
                fontSize: 17,
                letterSpacing: '0.18em',
                fill: isActive || isPlacement ? activeLabelFill : baseLabelFill,
                fontWeight: isActive || isPlacement ? 700 : 600,
                pointerEvents: 'none',
                userSelect: 'none',
                textTransform: 'uppercase',
              }}
            >
              {labelText}
            </text>
          </g>
        )
      })}

      {/* Placement marker — pulsing ring outside placement spoke tip,
          (only when keys provided and placementKey present). Stays
          attached to its spoke as the wheel rotates. */}
      {placementKey && keys && (() => {
        const idx = keys.indexOf(placementKey)
        if (idx < 0) return null
        const p = getTipPos(idx, displayRot, count, RADIUS * 1.10)
        return (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={p.x} cy={p.y} r={6} fill={GOLD} />
            <circle cx={p.x} cy={p.y} r={11} fill="none" stroke={GOLD} strokeWidth="1.2" opacity="0.6">
              <animate attributeName="r" values="11;14;11" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
            </circle>
          </g>
        )
      })()}

      {/* Walker cluster — concentrates on placement spoke if present */}
      {placementKey && (() => {
        const focusKey = placementKey
        const cnt = walkers[focusKey] || 0
        if (cnt <= 0) return null
        const idx = keys.indexOf(focusKey)
        if (idx < 0) return null
        const p = getTipPos(idx, displayRot, count, RADIUS * 1.40)
        const a = p.angle

        const dotsToShow = Math.min(cnt, 8)
        const clusterRadius = 14
        const dots = []
        for (let j = 0; j < dotsToShow; j++) {
          const aa = (Math.PI * 2 * j) / dotsToShow + (idx * 0.4)
          const wob = 0.6 + 0.4 * ((j * 37) % 100) / 100
          const dx = p.x + clusterRadius * Math.cos(aa) * wob
          const dy = p.y + clusterRadius * Math.sin(aa) * wob
          dots.push(
            <circle
              key={`walker-${j}`}
              cx={dx.toFixed(1)}
              cy={dy.toFixed(1)}
              r={2}
              fill={GOLD_LT}
              opacity="0.7"
            />
          )
        }

        const perpAngle = a + Math.PI / 2
        const sideOffset = 24
        const labelX = p.x + sideOffset * Math.cos(perpAngle)
        const labelY = p.y + sideOffset * Math.sin(perpAngle) + 3
        const labelAnchor =
          Math.cos(perpAngle) >= 0.2  ? 'start' :
          Math.cos(perpAngle) <= -0.2 ? 'end' :
                                        'middle'
        return (
          <g style={{ pointerEvents: 'none' }}>
            {dots}
            <text
              x={labelX.toFixed(1)}
              y={labelY.toFixed(1)}
              textAnchor={labelAnchor}
              style={{
                fontFamily: FONT_SC,
                fontSize: 9,
                letterSpacing: '0.12em',
                fill: GOLD_LT,
              }}
            >
              {cnt} walking
            </text>
          </g>
        )
      })()}

      {/* Centre orb — flat gold disc with text inside */}
      <g
        onClick={handleCentreClick}
        role="button"
        tabIndex={0}
        aria-label={centreLabel ? `${centreLabel} — centre` : 'Centre'}
        onKeyDown={e => e.key === 'Enter' && handleCentreClick()}
        style={{
          cursor: onCentreClick ? 'pointer' : 'default',
          opacity: bloomed ? 1 : bloomT,
        }}
      >
        {/* Subtle breathing halo just outside the disc */}
        <circle
          cx={CX} cy={CY}
          r={centreRadius + 4}
          fill="none"
          stroke="rgba(200,146,42,0.22)"
          strokeWidth="1"
          style={{ pointerEvents: 'none' }}
        >
          <animate
            attributeName="r"
            values={`${centreRadius + 3};${centreRadius + 7};${centreRadius + 3}`}
            dur="3.2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            values="0.20;0.05;0.20"
            dur="3.2s"
            repeatCount="indefinite"
          />
        </circle>
        {/* The disc itself */}
        <circle
          cx={CX} cy={CY}
          r={centreRadius}
          fill={centreFill}
          stroke={centreStroke}
          strokeWidth="1"
        />
        {/* Label inside */}
        {centreLabel && (
          <text
            x={CX} y={CY}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontFamily: FONT_SC,
              fontSize: centreFontSize,
              letterSpacing: '0.18em',
              fill: centreTextFill,
              fontWeight: 500,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {centreLabelLines.map((word, wi) => (
              <tspan
                key={wi}
                x={CX}
                dy={
                  wi === 0
                    ? `${-((centreLabelLines.length - 1) * centreLineHeight) / 2}em`
                    : `${centreLineHeight}em`
                }
              >
                {word}
              </tspan>
            ))}
          </text>
        )}
      </g>
    </svg>
  )
}
