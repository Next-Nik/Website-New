// ─────────────────────────────────────────────────────────────────────────────
// GradientPosition
//
// For the Invitation Architecture lens. Renders an actor's position on the
// extractive-to-regenerative gradient, with a trajectory arrow.
//
// Module 1.5 ships this as a primitive: pure presentation, props-driven, no
// data binding to actors yet. Wiring to the actor table belongs to the
// Technology / HyaPak module downstream. The Beta Build doc names this:
// "The platform tracks trajectory as well as current position" — this
// component is the visual primitive for that idea.
//
// The gradient is a continuous scale from -1 (fully extractive) to +1 (fully
// regenerative). 0 is the inflection point. The dot sits where the actor
// currently is. The arrow shows direction of travel — a separate trajectory
// value, independent of position.
//
// Props:
//   position    — number in [-1, 1]. Required. Clamped if out of range.
//   trajectory  — 'improving' | 'static' | 'worsening' | number in [-1, 1]
//                 If a number, is used as the delta arrow length and direction.
//                 If a string, maps to a fixed delta. Default 'static'.
//   label       — short label rendered above the bar (optional)
//   showScale   — boolean. Default true. Renders the "Extractive" /
//                 "Regenerative" anchor labels under the bar.
//   compact     — boolean. Default false. Tightens for inline use.
//   className   — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const TRAJECTORY_DELTAS = {
  improving: 0.18,
  static:    0,
  worsening: -0.18,
}

function clamp(n, min = -1, max = 1) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0
  if (n < min) return min
  if (n > max) return max
  return n
}

function toPercent(n) {
  // Map [-1, 1] to [0%, 100%].
  return ((clamp(n) + 1) / 2) * 100
}

function resolveDelta(trajectory) {
  if (typeof trajectory === 'number') return clamp(trajectory)
  return TRAJECTORY_DELTAS[trajectory] ?? 0
}

export default function GradientPosition({
  position,
  trajectory = 'static',
  label,
  showScale = true,
  compact = false,
  className,
}) {
  const pos        = clamp(position)
  const delta      = resolveDelta(trajectory)
  const target     = clamp(pos + delta)
  const posPct     = toPercent(pos)
  const targetPct  = toPercent(target)
  const arrowFrom  = Math.min(posPct, targetPct)
  const arrowTo    = Math.max(posPct, targetPct)
  const arrowDir   = target >= pos ? 'right' : 'left'

  const trajectoryLabel =
    typeof trajectory === 'string'
      ? trajectory
      : delta > 0
      ? 'improving'
      : delta < 0
      ? 'worsening'
      : 'static'

  const barHeight   = compact ? 6 : 8
  const dotSize     = compact ? 14 : 16
  const wrapperPad  = compact ? '0' : '0'
  const labelMargin = compact ? '6px' : '10px'

  return (
    <div className={className} style={{ width: '100%', padding: wrapperPad }}>
      {label && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: labelMargin,
            gap: '12px',
          }}
        >
          <span
            style={{
              ...sc,
              fontSize: compact ? '12px' : '13px',
              letterSpacing: '0.06em',
              color: 'rgba(15, 21, 35, 0.72)',
              fontWeight: 600,
            }}
          >
            {label}
          </span>
          <span
            style={{
              ...sc,
              fontSize: compact ? '11px' : '12px',
              letterSpacing: '0.06em',
              color: 'rgba(15, 21, 35, 0.55)',
            }}
          >
            {trajectoryLabel}
          </span>
        </div>
      )}

      <div
        role="img"
        aria-label={`Gradient position ${pos.toFixed(2)} on the extractive-to-regenerative scale, trajectory ${trajectoryLabel}.`}
        style={{
          position: 'relative',
          height: `${dotSize + 4}px`,
        }}
      >
        {/* Track */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: `${barHeight}px`,
            transform: 'translateY(-50%)',
            background:
              'linear-gradient(to right, rgba(138, 48, 48, 0.20) 0%, rgba(200, 146, 42, 0.20) 50%, rgba(42, 107, 58, 0.20) 100%)',
            borderRadius: '40px',
          }}
        />

        {/* Midline at 0 */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '1px',
            height: `${barHeight + 6}px`,
            background: 'rgba(15, 21, 35, 0.20)',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Trajectory arrow */}
        {delta !== 0 && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              left: `${arrowFrom}%`,
              width: `${arrowTo - arrowFrom}%`,
              height: '2px',
              transform: 'translateY(-50%)',
              background:
                arrowDir === 'right'
                  ? 'linear-gradient(to right, rgba(168, 114, 26, 0.20), rgba(168, 114, 26, 0.85))'
                  : 'linear-gradient(to left, rgba(168, 114, 26, 0.20), rgba(168, 114, 26, 0.85))',
              borderRadius: '2px',
            }}
          />
        )}
        {delta !== 0 && (
          <ArrowHead percent={targetPct} direction={arrowDir} />
        )}

        {/* Position dot */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${posPct}%`,
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            transform: 'translate(-50%, -50%)',
            background: '#FAFAF7',
            border: '2px solid #A8721A',
            borderRadius: '50%',
            boxShadow: '0 1px 4px rgba(15, 21, 35, 0.12)',
          }}
        />
      </div>

      {showScale && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
          }}
        >
          <span
            style={{
              ...body,
              fontSize: '13px',
              color: 'rgba(15, 21, 35, 0.55)',
            }}
          >
            Extractive
          </span>
          <span
            style={{
              ...body,
              fontSize: '13px',
              color: 'rgba(15, 21, 35, 0.55)',
            }}
          >
            Regenerative
          </span>
        </div>
      )}
    </div>
  )
}

function ArrowHead({ percent, direction }) {
  const size = 6
  const dx = direction === 'right' ? 0 : -size * 2
  return (
    <svg
      aria-hidden
      width={size * 2}
      height={size * 2}
      viewBox={`0 0 ${size * 2} ${size * 2}`}
      style={{
        position: 'absolute',
        top: '50%',
        left: `calc(${percent}% + ${dx}px)`,
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
      }}
    >
      {direction === 'right' ? (
        <polygon
          points={`0,0 ${size * 2},${size} 0,${size * 2}`}
          fill="rgba(168, 114, 26, 0.85)"
        />
      ) : (
        <polygon
          points={`${size * 2},0 0,${size} ${size * 2},${size * 2}`}
          fill="rgba(168, 114, 26, 0.85)"
        />
      )}
    </svg>
  )
}
