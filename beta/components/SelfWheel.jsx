// src/beta/components/SelfWheel.jsx
//
// Self wheel for Mission Control. 220px default. Seven self domains.
// C1 update: per-spoke Horizon edges. Each spoke renormalises so the
// user's chosen Horizon for that domain becomes the spoke's outer edge.
// The platform 1-10 scale lives in the Map, not on the wheel surface.
//
// Spoke geometry (Read B — user aims at THEIR Horizon, never a fixed 10):
//   outer edge of every scored spoke = maxR
//   current vertex on spoke           = (currentScores[k] / horizonScores[k]) * maxR, capped at maxR
//   un-scored or Horizon=0 spoke      = dotted skeleton at full maxR
//
// Click zones per spoke:
//   Sun at tip            → reveals Horizon goal text (from horizonGoals[k])
//   Current vertex dot    → reveals current reflection text (from currentReflections[k])
//   Spoke shaft (the gap) → opens sprint popover: view existing or start one
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

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const head = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

const SELF_LABELS = ['Path', 'Spark', 'Body', 'Finances', 'Connection', 'Inner Game', 'Signal']
const SELF_KEYS   = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

// Tier colour now reads as ratio of current to Horizon, not against fixed 10.
// A 7 against a Horizon of 8 (ratio 0.875) is "near full," not "mid-range."
function getTierColor(current, horizon) {
  if (current == null || !horizon) return 'rgba(200,146,42,0.5)'
  const ratio = current / horizon
  if (ratio >= 0.9) return '#3B6B9E'
  if (ratio >= 0.7) return '#5A8AB8'
  if (ratio >= 0.5) return '#8A8070'
  if (ratio >= 0.3) return '#8A7030'
  return '#8A3030'
}

// A spoke is "scored" (in the renormalised sense) only when it has a usable Horizon.
// Horizon of 0 or null means the user hasn't defined an aim yet for that domain.
function isSpokeScored(horizonValue) {
  return horizonValue != null && horizonValue > 0
}

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
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
  const responsiveSize = isMobile && size > 200 ? Math.min(size, window.innerWidth - 80) : size

  const cx = responsiveSize / 2
  const cy = responsiveSize / 2
  const maxR = (responsiveSize / 2) * 0.62
  const n = SELF_KEYS.length

  // Angle for spoke i (top of wheel = first spoke).
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

  // --- Popover positioning ---
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

      {/* Wheel */}
      <div style={{ position: 'relative' }}>
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

          {/* Current-state polygon — drawn under dots and suns so they sit on top */}
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
              Scored: pointy glowing sun. Un-scored: faded ghost sun affordance. */}
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

          {/* Current-state dots — the "where are you now" vertex per spoke */}
          {SELF_KEYS.map((k, i) => {
            const v = currentVertex(i, k)
            if (!v) return null
            const [x, y] = v
            const isHovered = hoveredDot === k
            const r = isHovered ? 6 : 4
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
                  fill={getTierColor(currentScores[k], horizonScores[k])}
                  stroke="rgba(250,250,247,0.9)"
                  strokeWidth="1.4"
                  style={{ transition: 'r 200ms ease' }}
                />
              </g>
            )
          })}

          {/* Axis labels — sit beyond the sun so the suns don't collide with text */}
          {SELF_KEYS.map((k, i) => {
            const a = angleFor(i)
            const lx = cx + maxR * 1.28 * Math.cos(a)
            const ly = cy + maxR * 1.28 * Math.sin(a)
            const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx < cx ? 'end' : 'start'
            return (
              <text
                key={k}
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontFamily="'Cormorant SC', Georgia, serif"
                fontSize="11"
                letterSpacing="0.5"
                fill="rgba(15,21,35,0.72)"
              >
                {SELF_LABELS[i]}
              </text>
            )
          })}
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
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.72)', textTransform: 'uppercase' }}>
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

  const baseStyle = {
    ...getPopoverStyle(popover.anchorX, popover.anchorY),
    background: '#FAFAF7',
    border: '1px solid rgba(200,146,42,0.35)',
    borderRadius: '4px',
    boxShadow: '0 4px 18px rgba(15,21,35,0.12)',
    padding: '14px 16px',
  }

  if (popover.kind === 'horizon') {
    const text = horizonGoals[popover.domainKey]
    return (
      <div style={baseStyle}>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '6px' }}>
          {label} Horizon
        </div>
        <div style={{ ...body, fontSize: '13px', lineHeight: 1.5, color: 'rgba(15,21,35,0.85)' }}>
          {text || (
            <span style={{ color: 'rgba(15,21,35,0.72)', fontStyle: 'italic' }}>
              You haven't written a Horizon for {label} yet.
            </span>
          )}
        </div>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href={`/tools/map?domain=${popover.domainKey}`}
            style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none' }}
          >
            {text ? 'Revise' : 'Write it'}
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer' }}
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
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '6px' }}>
          {label} now
        </div>
        <div style={{ ...body, fontSize: '13px', lineHeight: 1.5, color: 'rgba(15,21,35,0.85)' }}>
          {text || (
            <span style={{ color: 'rgba(15,21,35,0.72)', fontStyle: 'italic' }}>
              No current reflection captured yet.
            </span>
          )}
        </div>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href={`/tools/map?domain=${popover.domainKey}`}
            style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none' }}
          >
            Update
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer' }}
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
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '6px' }}>
          {label} sprint
        </div>
        <div style={{ ...body, fontSize: '13px', lineHeight: 1.5, color: 'rgba(15,21,35,0.85)', marginBottom: '12px' }}>
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
                fontSize: '12px',
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
              fontSize: '12px',
              letterSpacing: '0.1em',
              color: hasSprint ? 'rgba(15,21,35,0.85)' : '#FAFAF7',
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
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.72)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '2px' }}
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
