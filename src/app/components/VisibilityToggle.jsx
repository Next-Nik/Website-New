import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// VisibilityToggle
//
// Two-state switch between 'private' and 'public'. Default private. Optimistic
// in the parent — pass current state in, get the new state out via onChange.
// The toggle does not write anything itself.
//
// Voice: no theatre. The state names what it is. No "are you sure?"
//
// Props:
//   value         — 'private' | 'public' (required)
//   onChange(next) — called with the new value (required)
//   disabled      — optional
//   label         — optional, sits above the toggle as an eyebrow
//   compact       — optional, tightens for inline use
// ─────────────────────────────────────────────────────────────────────────────

const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

export default function VisibilityToggle({
  value = 'private',
  onChange,
  disabled = false,
  label,
  compact = false,
}) {
  const isPublic = value === 'public'
  const [hover, setHover] = useState(false)

  function handleClick() {
    if (disabled) return
    onChange?.(isPublic ? 'private' : 'public')
  }

  const trackHeight = compact ? 22 : 26
  const trackWidth  = compact ? 44 : 52
  const knobSize    = trackHeight - 6

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <span
          style={{
            ...sc,
            fontSize: '12px',
            letterSpacing: '0.08em',
            color: 'rgba(15, 21, 35, 0.55)',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      )}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label={`Visibility: ${value}. Click to switch.`}
          disabled={disabled}
          onClick={handleClick}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            position: 'relative',
            width: `${trackWidth}px`,
            height: `${trackHeight}px`,
            background: isPublic
              ? '#A8721A'
              : hover
              ? 'rgba(15, 21, 35, 0.20)'
              : 'rgba(15, 21, 35, 0.12)',
            border: 'none',
            borderRadius: '40px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            transition: 'background 160ms ease',
            padding: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: '3px',
              left: isPublic ? `${trackWidth - knobSize - 3}px` : '3px',
              width: `${knobSize}px`,
              height: `${knobSize}px`,
              borderRadius: '50%',
              background: '#FAFAF7',
              boxShadow: '0 1px 3px rgba(15, 21, 35, 0.25)',
              transition: 'left 160ms ease',
            }}
          />
        </button>
        <span
          style={{
            ...sc,
            fontSize: compact ? '12px' : '13px',
            letterSpacing: '0.06em',
            color: isPublic ? '#A8721A' : 'rgba(15, 21, 35, 0.72)',
            fontWeight: 600,
            minWidth: '52px',
          }}
        >
          {isPublic ? 'Public' : 'Private'}
        </span>
      </div>
    </div>
  )
}
