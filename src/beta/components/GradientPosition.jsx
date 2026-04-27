// src/beta/components/GradientPosition.jsx
// Renders an actor's position on the extractive-to-regenerative gradient.
// Used on invitation surfaces and org public pages.
//
// Props:
//   position       number  0-100 (0 = fully extractive, 100 = fully regenerative)
//   trajectory     string  "improving" | "stationary" | "declining" | "unknown"
//   actorName      string  For the greenwashing caption
//   compact        bool    Smaller variant for use inside actor lists
//
// Greenwashing flag: position > 70 AND (trajectory === "stationary" || trajectory === "declining")
// Links to /beta/domain/technology?lens=transition-accountability

const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'

// Colour interpolation across the extractive-to-regenerative spectrum.
// Extractive: warm red-brown. Mid: amber. Regenerative: living green.
// Deliberately muted — this is a map, not a verdict.
function positionColor(pos) {
  if (pos == null) return 'rgba(15,21,35,0.30)'
  if (pos <= 25)  return '#8A3030'   // extractive
  if (pos <= 45)  return '#8C6030'   // transitioning from extractive
  if (pos <= 55)  return '#8C7A3E'   // contested middle
  if (pos <= 72)  return '#4A8C6F'   // transitioning toward regenerative
  return '#2D6A4F'                   // regenerative
}

// Trajectory arrow character + colour
function trajectoryIndicator(trajectory) {
  switch (trajectory) {
    case 'improving': return { char: '\u2191', color: '#2D6A4F', label: 'Improving'  }
    case 'declining': return { char: '\u2193', color: '#8A3030', label: 'Declining'  }
    case 'stationary':return { char: null,     color: null,      label: 'Stationary' }
    default:          return { char: null,     color: null,      label: null         }
  }
}

function isGreenwashing(position, trajectory) {
  return (
    position != null &&
    position > 70 &&
    (trajectory === 'stationary' || trajectory === 'declining')
  )
}

export function GradientPosition({ position, trajectory, actorName, compact }) {
  if (position == null) return null

  const markerColor = positionColor(position)
  const traj        = trajectoryIndicator(trajectory)
  const flagged     = isGreenwashing(position, trajectory)

  const barHeight   = compact ? 6  : 8
  const markerSize  = compact ? 12 : 16
  const fontSize    = compact ? 11 : 12

  return (
    <div style={{ width: '100%' }}>
      {/* Bar */}
      <div style={{ position: 'relative', height: `${barHeight}px`, marginBottom: `${markerSize / 2 + 2}px` }}>
        {/* Track */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
          borderRadius: '4px',
          background: 'linear-gradient(to right, rgba(138,48,48,0.35), rgba(140,122,62,0.35), rgba(45,106,79,0.35))',
        }} />

        {/* Marker */}
        <div style={{
          position: 'absolute',
          left:  `calc(${Math.min(Math.max(position, 0), 100)}% - ${markerSize / 2}px)`,
          top:   `${(barHeight - markerSize) / 2}px`,
          width:  `${markerSize}px`,
          height: `${markerSize}px`,
          borderRadius: '50%',
          background: markerColor,
          border: '2px solid #FAFAF7',
          boxShadow: '0 1px 4px rgba(15,21,35,0.25)',
          transition: 'left 0.3s ease',
        }} />
      </div>

      {/* Caption row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: compact ? '4px' : '6px',
      }}>
        <span style={{
          ...sc,
          fontSize: `${fontSize}px`,
          letterSpacing: '0.12em',
          color: 'rgba(15,21,35,0.40)',
        }}>
          Extractive
        </span>

        {/* Middle: position value + trajectory */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            ...sc,
            fontSize: `${fontSize}px`,
            letterSpacing: '0.10em',
            color: markerColor,
            fontWeight: 400,
          }}>
            {Math.round(position)}
          </span>

          {traj.char && (
            <span style={{
              fontSize:   compact ? '13px' : '15px',
              color:      traj.color,
              lineHeight: 1,
              fontWeight: 400,
            }}
              aria-label={traj.label}
            >
              {traj.char}
            </span>
          )}
        </div>

        <span style={{
          ...sc,
          fontSize: `${fontSize}px`,
          letterSpacing: '0.12em',
          color: 'rgba(15,21,35,0.40)',
        }}>
          Regenerative
        </span>
      </div>

      {/* Greenwashing flag */}
      {flagged && (
        <div style={{ marginTop: compact ? '8px' : '10px' }}>
          <a
            href="/beta/domain/technology?lens=transition-accountability"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              textDecoration: 'none',
            }}
          >
            <span style={{
              ...sc,
              fontSize: '10px',
              letterSpacing: '0.16em',
              color: '#8A3030',
              background: 'rgba(138,48,48,0.06)',
              border: '1px solid rgba(138,48,48,0.30)',
              borderRadius: '4px',
              padding: '2px 8px',
            }}>
              Claim under review
            </span>
            <span style={{
              ...body,
              fontSize: '12px',
              color: 'rgba(138,48,48,0.70)',
              lineHeight: 1.4,
            }}>
              Regenerative position declared; trajectory is {trajectory}.
              Transition and Accountability lens.
            </span>
          </a>
        </div>
      )}
    </div>
  )
}

// ── Inline trajectory arrow only ─────────────────────────────
// Used on org name headings — a small directional indicator without the bar.

export function TrajectoryArrow({ trajectory }) {
  const traj = trajectoryIndicator(trajectory)
  if (!traj.char) return null
  return (
    <span
      style={{
        fontSize: '13px',
        color:    traj.color,
        marginLeft: '5px',
        lineHeight: 1,
      }}
      title={traj.label}
      aria-label={traj.label}
    >
      {traj.char}
    </span>
  )
}
