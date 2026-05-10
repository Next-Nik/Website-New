// src/beta/components/SelfWheel.jsx
//
// Self wheel for Mission Control. 220px default. Seven self domains.
//
// May 2026 update — domain colour identity and mobile rotation:
//   • Each domain label and placement dot uses its locked domain
//     colour (see /constants/domainColors.js). The placement
//     polygon stroke + fill stays GOLD — the user's life as one
//     through-line shape.
//   • The Horizon spheres at spoke tips stay gold and glowing
//     (the Horizon is the platform-shared aim). The "where you
//     are now" placement dots carry the domain colour so domain
//     identity is readable at a glance without relying on labels.
//   • Mobile (≤ 640px): single label at the apex, rotation arc
//     replacing the static seven-label ring. Seven coloured dots
//     remain visible so domain identity is preserved without
//     spelling everything out. An opening rotation moves the
//     wheel through every domain so a new user sees the territory
//     before settling on Path. Tap any dot to jump to that domain;
//     swipe left/right (or use ← →) to step.
//
// Pre-existing behaviour that stays intact:
//   Sun at tip            → reveals Horizon goal text (from horizonGoals[k])
//   Current vertex dot    → reveals current reflection text (from currentReflections[k])
//   Spoke shaft (the gap) → opens sprint popover: view existing or start one
//
// Spoke geometry (Read B — user aims at THEIR Horizon, never a fixed 10):
//   outer edge of every scored spoke = maxR
//   current vertex on spoke           = (currentScores[k] / horizonScores[k]) * maxR, capped at maxR
//   un-scored or Horizon=0 spoke      = dotted skeleton at full maxR
//
// Props:
//   currentScores         — { path, spark, body, finances, connection, inner_game, signal }
//   horizonScores         — same shape; Horizon target per domain (from the Map)
//   horizonGoals          — same shape; user's written Horizon goal text per domain
//   currentReflections    — same shape; user's written current-state text per domain
//   activeSprintDomains   — array of domain keys with an active Target Sprint
//   size                  — number (default 220)
//   visible               — boolean; visibility toggle state
//   onToggleVisibility    — () => void
//   onDomainClick         — (domainKey) => void; legacy click handler, still supported
//
// Routing (deep-links):
//   /tools/map                                — set or revise Horizons
//   /tools/target-sprint                      — sprint hub
//   /tools/target-sprint?domain={key}         — start sprint for a specific domain
//   /tools/target-sprint?domain={key}&view=1  — view existing sprint for a domain

import { useState, useEffect, useRef } from 'react'
import { selfColor, SELF_KEYS_ORDERED } from '../../constants/domainColors'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const head = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

const SELF_LABELS = ['Path', 'Spark', 'Body', 'Finances', 'Connection', 'Inner Game', 'Signal']
const SELF_KEYS   = SELF_KEYS_ORDERED // ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

// A spoke is "scored" (in the renormalised sense) only when it has a usable Horizon.
// Horizon of 0 or null means the user hasn't defined an aim yet for that domain.
function isSpokeScored(horizonValue) {
  return horizonValue != null && horizonValue > 0
}

// Mobile breakpoint matches global.css convention.
const MOBILE_BREAKPOINT = 640

// Mobile opening rotation: spin through all seven domains then settle
// on Path (index 0). Total duration ~1800ms, easing softens the stop.
const MOBILE_INTRO_DURATION_MS = 1800

export default function SelfWheel({
  currentScores = {},
  horizonScores = {},
  horizonGoals = {},
  currentReflections = {},
  activeSprintDomains = [],
  size = 220,
  visible = false,
  onToggleVisibility,
  onDomainClick,
}) {
  const [hovered, setHovered] = useState(false)
  const [hoveredSpoke, setHoveredSpoke] = useState(null) // domain key
  const [hoveredSun, setHoveredSun]   = useState(null)
  const [hoveredDot, setHoveredDot]   = useState(null)
  const [popover, setPopover] = useState(null)
  // popover shape: { kind: 'horizon'|'current'|'sprint', domainKey, anchorX, anchorY }

  const containerRef = useRef(null)

  // ── Responsive sizing + mobile detection ─────────────────────
  // Recompute on resize so flipping orientation doesn't strand
  // the wheel in a stale layout.
  const [viewportW, setViewportW] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    function onResize() { setViewportW(window.innerWidth) }
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const isMobile = viewportW <= MOBILE_BREAKPOINT
  const responsiveSize = isMobile && size > 200 ? Math.min(size, viewportW - 80) : size

  const cx = responsiveSize / 2
  const cy = responsiveSize / 2
  const maxR = (responsiveSize / 2) * 0.62
  const n = SELF_KEYS.length

  // ── Mobile rotation state ────────────────────────────────────
  // apexIndex: which domain is currently at the apex (top of the wheel).
  // rotation: degrees applied to the entire wheel group. Wheel rotates
  // as a unit — polygon, dots, spokes, sun all turn together. The apex
  // caret stays fixed at the top.
  const [apexIndex, setApexIndex] = useState(0)
  const [rotation, setRotation] = useState(0) // degrees
  const introRunningRef = useRef(false)
  const introRafRef = useRef(null)

  // Opening rotation on mobile mount: spin through all seven domains
  // then settle on Path (apexIndex=0). Only runs once per mount.
  useEffect(() => {
    if (!isMobile) return
    if (introRunningRef.current) return
    introRunningRef.current = true
    const startTime = performance.now()
    // Spin a full 360° + the offset to land on apex 0 (which is 0°).
    const totalRotation = -360 // negative = wheel turns clockwise visually
    function tick(now) {
      const t = Math.min((now - startTime) / MOBILE_INTRO_DURATION_MS, 1)
      // easeOutCubic — fast start, soft landing
      const eased = 1 - Math.pow(1 - t, 3)
      setRotation(totalRotation * eased)
      if (t < 1) {
        introRafRef.current = requestAnimationFrame(tick)
      } else {
        setRotation(0) // normalise — landed on Path, no rotation needed
      }
    }
    introRafRef.current = requestAnimationFrame(tick)
    return () => {
      if (introRafRef.current) cancelAnimationFrame(introRafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile])

  // Rotate the wheel so a given index lands at the apex (top, angle -π/2).
  // Animates between current rotation and target via a short tween.
  function rotateTo(targetIndex) {
    // Spoke i sits at base angle (-90 + i * 360/n) degrees. To bring
    // it to apex (-90°), rotate the wheel by -(i * 360/n).
    const finalRot = (-(360 * targetIndex) / n) % 360
    // Pick the shortest path between current rotation and target.
    const startRot = rotation
    const diff = ((finalRot - startRot + 540) % 360) - 180
    const startTime = performance.now()
    const duration = 350
    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      setRotation(startRot + diff * eased)
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    setApexIndex(targetIndex)
  }

  // Step the apex by ±1 (used by swipe and arrow keys on mobile)
  function stepApex(delta) {
    const next = (apexIndex + delta + n) % n
    rotateTo(next)
  }

  // Touch swipe handling for mobile
  const touchStartRef = useRef(null)
  function onTouchStart(e) {
    if (!isMobile) return
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e) {
    if (!isMobile || !touchStartRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y
    touchStartRef.current = null
    // Only horizontal swipes count
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      stepApex(dx < 0 ? 1 : -1) // swipe left → next; swipe right → prev
    }
  }

  // Keyboard nav on mobile
  useEffect(() => {
    if (!isMobile) return
    function onKey(e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); stepApex(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepApex(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, apexIndex])

  // ── Geometry ─────────────────────────────────────────────────
  // Angle for spoke i — base angle, no rotation applied.
  function angleFor(i) {
    return (Math.PI * 2 * i) / n - Math.PI / 2
  }

  // Spoke tip (sun position) — always at maxR for scored spokes,
  // also at maxR for un-scored skeleton spokes (full ghost spoke).
  function spokeTip(i) {
    const a = angleFor(i)
    return [cx + maxR * Math.cos(a), cy + maxR * Math.sin(a)]
  }

  // Current vertex on spoke i. Returns null if domain has no Horizon or no current score.
  function currentVertex(i, key) {
    const horizon = horizonScores[key]
    const current = currentScores[key]
    if (!isSpokeScored(horizon) || current == null) return null
    const ratio = Math.min(current / horizon, 1) // cap at Horizon edge
    const a = angleFor(i)
    const r = ratio * maxR
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  // Build the current-state polygon. Only spokes with both a Horizon and a current score
  // contribute a vertex; un-scored spokes contribute a vertex at the centre (so the polygon
  // closes naturally without rendering as a void).
  const currentPolygonPts = SELF_KEYS.map((k, i) => {
    const v = currentVertex(i, k)
    return v ? v.join(',') : `${cx},${cy}`
  }).join(' ')

  const hasAnyHorizon = SELF_KEYS.some(k => isSpokeScored(horizonScores[k]))
  const hasAnyCurrent = SELF_KEYS.some(k => currentScores[k] != null && isSpokeScored(horizonScores[k]))

  // ── Popover positioning ──────────────────────────────────────
  // Popovers anchor at the click point and edge-detect against the wheel container.
  // On mobile (size constrained), they centre below the wheel to avoid viewport clipping.
  function getPopoverStyle(anchorX, anchorY) {
    const popoverWidth = 220
    const popoverMargin = 12
    let left = anchorX + popoverMargin
    let top  = anchorY + popoverMargin
    // Edge detection: if popover would overflow right edge, flip left.
    if (anchorX + popoverWidth + popoverMargin > responsiveSize) {
      left = anchorX - popoverWidth - popoverMargin
    }
    // If still off the left edge after flip (small wheel + extreme angle), clamp.
    if (left < 0) left = 4
    // If popover would overflow bottom, flip above.
    if (anchorY + 140 > responsiveSize) {
      top = Math.max(4, anchorY - 140)
    }
    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${popoverWidth}px`,
      zIndex: 20,
    }
  }

  // Close popover on outside click / escape
  useEffect(() => {
    if (!popover) return
    function handleEsc(e) { if (e.key === 'Escape') setPopover(null) }
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setPopover(null)
    }
    window.addEventListener('keydown', handleEsc)
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleEsc)
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [popover])

  function openHorizonPopover(i, key) {
    const [x, y] = spokeTip(i)
    setPopover({ kind: 'horizon', domainKey: key, anchorX: x, anchorY: y })
    if (onDomainClick) onDomainClick(key)
  }

  function openCurrentPopover(i, key) {
    const v = currentVertex(i, key)
    if (!v) return
    setPopover({ kind: 'current', domainKey: key, anchorX: v[0], anchorY: v[1] })
    if (onDomainClick) onDomainClick(key)
  }

  function openSprintPopover(i, key, evtX, evtY) {
    setPopover({ kind: 'sprint', domainKey: key, anchorX: evtX, anchorY: evtY })
    if (onDomainClick) onDomainClick(key)
  }

  function getSvgPoint(evt) {
    const rect = evt.currentTarget.getBoundingClientRect()
    const scaleX = responsiveSize / rect.width
    const scaleY = responsiveSize / rect.height
    return [
      (evt.clientX - rect.left) * scaleX,
      (evt.clientY - rect.top) * scaleY,
    ]
  }

  // The active domain at the apex on mobile (used for the single label)
  const apexKey = SELF_KEYS[apexIndex]
  const apexLabel = SELF_LABELS[apexIndex]
  const apexColor = selfColor(apexKey)

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase' }}>
          Self
        </span>
        {onToggleVisibility && (
          <button
            type="button"
            onClick={onToggleVisibility}
            title={visible ? 'Visible on public profile' : 'Private'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              ...sc,
              fontSize: '13px',
              letterSpacing: '0.1em',
              color: visible ? '#A8721A' : 'rgba(15,21,35,0.72)',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {visible ? (<><VisibleIcon /><span>Public</span></>) : (<><PrivateIcon /><span>Private</span></>)}
          </button>
        )}
      </div>

      {/* Mobile-only apex label and caret. Sits above the wheel.
          Updates as the wheel rotates — colour and word swap together. */}
      {isMobile && (
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          {/* Caret pointing at the apex of the wheel below */}
          <div style={{
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '7px solid #A8721A',
            margin: '0 auto 4px',
          }} />
          <div style={{
            ...head,
            fontSize: '20px',
            fontWeight: 400,
            letterSpacing: '0.04em',
            color: apexColor.light,
            transition: 'color 250ms ease',
            minHeight: '26px',
          }}>
            {apexLabel}
          </div>
        </div>
      )}

      {/* Wheel */}
      <div
        style={{ position: 'relative' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <svg
          width={responsiveSize}
          height={responsiveSize}
          viewBox={`0 0 ${responsiveSize} ${responsiveSize}`}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Sun glow filter */}
          <defs>
            <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="#FFE9B0" stopOpacity="1" />
              <stop offset="60%" stopColor="#E8B547" stopOpacity="1" />
              <stop offset="100%" stopColor="#A8721A" stopOpacity="0.9" />
            </radialGradient>
            <radialGradient id="sunGhost" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="#D8C8A8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#A8721A" stopOpacity="0.15" />
            </radialGradient>
          </defs>

          {/* Wheel-rotating group. On desktop rotation is always 0
              and this group is a pass-through. On mobile the entire
              wheel rotates — polygon, dots, spokes, suns turn as a
              single unit so the user's life shape stays coherent. */}
          <g transform={`rotate(${rotation} ${cx} ${cy})`}>

            {/* Concentric orientation heptagons — no numeric labels.
                These replace the old 1-10 grid rings since the wheel surface no longer
                expresses a fixed scale. They're faint anchors for the eye. */}
            {[0.25, 0.5, 0.75].map((frac, idx) => {
              const pts = SELF_KEYS.map((_, i) => {
                const a = angleFor(i)
                return `${cx + maxR * frac * Math.cos(a)},${cy + maxR * frac * Math.sin(a)}`
              }).join(' ')
              return (
                <polygon
                  key={frac}
                  points={pts}
                  fill="none"
                  stroke="rgba(200,146,42,0.08)"
                  strokeWidth="0.5"
                />
              )
            })}

            {/* Spoke shafts — the click target for the "gap" / sprint flow.
                The shaft IS the spoke. Drawn from centre to sun tip.
                Scored spokes: solid soft line. Un-scored: dotted skeleton. */}
            {SELF_KEYS.map((k, i) => {
              const [tipX, tipY] = spokeTip(i)
              const scored = isSpokeScored(horizonScores[k])
              const hasCurrent = currentScores[k] != null
              const hasSprint = activeSprintDomains.includes(k)
              const isHovered = hoveredSpoke === k
              // Only scored spokes with a current score below Horizon offer the sprint flow.
              // A spoke at full Horizon (current >= Horizon) has no gap to sprint into.
              const offersSprint = scored && hasCurrent &&
                (currentScores[k] < horizonScores[k])

              return (
                <g key={`spoke-${k}`}>
                  {/* Visible spoke line */}
                  <line
                    x1={cx}
                    y1={cy}
                    x2={tipX}
                    y2={tipY}
                    stroke={scored ? 'rgba(200,146,42,0.22)' : 'rgba(15,21,35,0.18)'}
                    strokeWidth={isHovered && offersSprint ? 1.5 : 0.8}
                    strokeDasharray={scored ? 'none' : '3 4'}
                    style={{ transition: 'stroke-width 200ms ease, stroke 200ms ease' }}
                  />
                  {/* Invisible wide hit area for spoke clicks (sprint flow).
                      Only present when offersSprint is true. */}
                  {offersSprint && (
                    <line
                      x1={cx}
                      y1={cy}
                      x2={tipX}
                      y2={tipY}
                      stroke="transparent"
                      strokeWidth="14"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredSpoke(k)}
                      onMouseLeave={() => setHoveredSpoke(null)}
                      onClick={(evt) => {
                        const [x, y] = getSvgPoint(evt)
                        openSprintPopover(i, k, x, y)
                      }}
                    >
                      <title>{hasSprint ? `View your ${SELF_LABELS[i]} sprint` : `Start a sprint for ${SELF_LABELS[i]}`}</title>
                    </line>
                  )}
                </g>
              )
            })}

            {/* Current-state polygon — drawn under dots and suns so they sit on top.
                STAYS GOLD — the user's own through-line shape, regardless of scale. */}
            {hasAnyCurrent && (
              <polygon
                points={currentPolygonPts}
                fill="rgba(200,146,42,0.10)"
                stroke="rgba(200,146,42,0.45)"
                strokeWidth="1.5"
                strokeLinejoin="round"
                style={{ transition: 'all 400ms ease' }}
              />
            )}

            {/* Suns at every spoke tip — the Horizon edge.
                Scored: pointy glowing sun. Un-scored: faded ghost sun affordance.
                STAYS GOLD — Horizon is the platform-shared aim, not a domain colour. */}
            {SELF_KEYS.map((k, i) => {
              const [tipX, tipY] = spokeTip(i)
              const scored = isSpokeScored(horizonScores[k])
              const isHovered = hoveredSun === k
              const baseSize = scored ? 7 : 5
              const sunSize = isHovered ? baseSize + 2 : baseSize

              return (
                <g
                  key={`sun-${k}`}
                  style={{ cursor: 'pointer', transition: 'transform 200ms ease' }}
                  onMouseEnter={() => setHoveredSun(k)}
                  onMouseLeave={() => setHoveredSun(null)}
                  onClick={() => {
                    if (scored) openHorizonPopover(i, k)
                    else {
                      // Un-scored sun → Map deep-link for this domain
                      if (typeof window !== 'undefined') window.location.href = `/tools/map?domain=${k}`
                    }
                  }}
                >
                  <title>
                    {scored
                      ? `Your ${SELF_LABELS[i]} Horizon`
                      : `Define your ${SELF_LABELS[i]} Horizon`}
                  </title>
                  <PointySun
                    cx={tipX}
                    cy={tipY}
                    r={sunSize}
                    scored={scored}
                    glowing={scored}
                  />
                </g>
              )
            })}

            {/* Current-state dots — the "where you are now" vertex per spoke.
                Domain colour replaces the prior tier (Scale) colour: position
                on the spoke gives fluency, colour gives identity. */}
            {SELF_KEYS.map((k, i) => {
              const v = currentVertex(i, k)
              if (!v) return null
              const [x, y] = v
              const isHovered = hoveredDot === k
              const r = isHovered ? 6 : 4
              const dc = selfColor(k)
              return (
                <g
                  key={`dot-${k}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredDot(k)}
                  onMouseLeave={() => setHoveredDot(null)}
                  onClick={() => openCurrentPopover(i, k)}
                >
                  <title>Where you are with {SELF_LABELS[i]}</title>
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={dc.base}
                    stroke="rgba(250,250,247,0.95)"
                    strokeWidth="1.5"
                    style={{ transition: 'r 200ms ease' }}
                  />
                </g>
              )
            })}

            {/* Axis labels — desktop only. Mobile uses the single apex label
                rendered above the SVG, plus the coloured tip dots. */}
            {!isMobile && SELF_KEYS.map((k, i) => {
              const a = angleFor(i)
              const lx = cx + maxR * 1.32 * Math.cos(a)
              const ly = cy + maxR * 1.32 * Math.sin(a)
              const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx < cx ? 'end' : 'start'
              const dc = selfColor(k)
              return (
                <text
                  key={k}
                  x={lx}
                  y={ly}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fontFamily="'Cormorant SC', Georgia, serif"
                  fontSize="13"
                  fontWeight="600"
                  letterSpacing="2.2"
                  fill={dc.light}
                  style={{ textTransform: 'uppercase' }}
                >
                  {SELF_LABELS[i].toUpperCase()}
                </text>
              )
            })}

          </g>
        </svg>

        {/* Popover layer */}
        {popover && (
          <Popover
            popover={popover}
            getPopoverStyle={getPopoverStyle}
            horizonGoals={horizonGoals}
            currentReflections={currentReflections}
            activeSprintDomains={activeSprintDomains}
            onClose={() => setPopover(null)}
          />
        )}

        {/* Pre-Map empty overlay — only when literally nothing is set */}
        {!hasAnyHorizon && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '6px',
            pointerEvents: 'none',
          }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.72)', textTransform: 'uppercase' }}>
              Define your Horizons
            </span>
            <a
              href="/tools/map"
              style={{
                ...sc,
                fontSize: '13px',
                letterSpacing: '0.1em',
                color: '#A8721A',
                textDecoration: 'none',
                pointerEvents: 'auto',
              }}
            >
              Begin in the Map
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Pointy glowing sun -------------------------------------------------
// Eight-pointed sun with a soft glow halo. Scored = full luminosity,
// un-scored = ghost (still pointy, faded, signals "define this").
function PointySun({ cx, cy, r, scored, glowing }) {
  // Build an 8-pointed star: alternate outer (r) and inner (r * 0.4) vertices
  const points = []
  const spikes = 8
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (Math.PI * i) / spikes - Math.PI / 2
    const radius = i % 2 === 0 ? r : r * 0.4
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`)
  }
  const ptStr = points.join(' ')

  return (
    <g filter={glowing ? 'url(#sunGlow)' : undefined}>
      {/* Outer halo for glow */}
      {glowing && (
        <circle
          cx={cx}
          cy={cy}
          r={r * 1.6}
          fill="rgba(232,181,71,0.18)"
        />
      )}
      <polygon
        points={ptStr}
        fill={scored ? 'url(#sunCore)' : 'url(#sunGhost)'}
        stroke={scored ? 'rgba(168,114,26,0.7)' : 'rgba(168,114,26,0.4)'}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </g>
  )
}

// --- Popover ------------------------------------------------------------
function Popover({ popover, getPopoverStyle, horizonGoals, currentReflections, activeSprintDomains, onClose }) {
  const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
  const head = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
  const body = { fontFamily: "'Lora', Georgia, serif" }

  const labelMap = {
    path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
    connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal',
  }
  const label = labelMap[popover.domainKey] || popover.domainKey
  const dc = selfColor(popover.domainKey)

  const baseStyle = {
    ...getPopoverStyle(popover.anchorX, popover.anchorY),
    background: '#FAFAF7',
    border: `1px solid ${dc.border}`,
    borderRadius: '4px',
    boxShadow: '0 4px 18px rgba(15,21,35,0.12)',
    padding: '14px 16px',
  }

  if (popover.kind === 'horizon') {
    const text = horizonGoals[popover.domainKey]
    return (
      <div style={baseStyle}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: dc.light, textTransform: 'uppercase', marginBottom: '6px' }}>
          {label} Horizon
        </div>
        <div style={{ ...body, fontSize: '15px', lineHeight: 1.5, color: '#0F1523' }}>
          {text || (
            <span style={{ color: 'rgba(15,21,35,0.72)', fontStyle: 'italic' }}>
              You haven't written a Horizon for {label} yet.
            </span>
          )}
        </div>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href={`/tools/map?domain=${popover.domainKey}`}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none' }}
          >
            {text ? 'Revise' : 'Write it'}
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (popover.kind === 'current') {
    const text = currentReflections[popover.domainKey]
    return (
      <div style={baseStyle}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: dc.light, textTransform: 'uppercase', marginBottom: '6px' }}>
          {label} now
        </div>
        <div style={{ ...body, fontSize: '15px', lineHeight: 1.5, color: '#0F1523' }}>
          {text || (
            <span style={{ color: 'rgba(15,21,35,0.72)', fontStyle: 'italic' }}>
              No current reflection captured yet.
            </span>
          )}
        </div>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href={`/tools/map?domain=${popover.domainKey}`}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none' }}
          >
            Update
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (popover.kind === 'sprint') {
    const hasSprint = activeSprintDomains.includes(popover.domainKey)
    return (
      <div style={baseStyle}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: dc.light, textTransform: 'uppercase', marginBottom: '6px' }}>
          {label} sprint
        </div>
        <div style={{ ...body, fontSize: '15px', lineHeight: 1.5, color: '#0F1523', marginBottom: '12px' }}>
          {hasSprint
            ? `You have a sprint running on ${label}.`
            : `The gap between where you are and your ${label} Horizon is where the work lives.`}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {hasSprint && (
            <a
              href={`/tools/target-sprint?domain=${popover.domainKey}&view=1`}
              style={{
                ...sc,
                fontSize: '13px',
                letterSpacing: '0.1em',
                color: '#A8721A',
                textDecoration: 'none',
                padding: '8px 10px',
                border: '1px solid rgba(200,146,42,0.4)',
                borderRadius: '3px',
                textAlign: 'center',
              }}
            >
              View current sprint
            </a>
          )}
          <a
            href={`/tools/target-sprint?domain=${popover.domainKey}`}
            style={{
              ...sc,
              fontSize: '13px',
              letterSpacing: '0.1em',
              color: hasSprint ? '#0F1523' : '#FAFAF7',
              background: hasSprint ? 'transparent' : '#A8721A',
              textDecoration: 'none',
              padding: '8px 10px',
              border: hasSprint ? '1px solid rgba(15,21,35,0.2)' : '1px solid #A8721A',
              borderRadius: '3px',
              textAlign: 'center',
            }}
          >
            {hasSprint ? `Start another for ${label}` : `Start a sprint for ${label}`}
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '2px' }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return null
}

// --- Inline icons -------------------------------------------------------
function VisibleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <ellipse cx="8" cy="8" rx="6" ry="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  )
}

function PrivateIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="8" cy="8" rx="6" ry="4" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
    </svg>
  )
}
