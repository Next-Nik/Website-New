import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// WheelsToggleSection
//
// The two wheels share a single surface with a switch between them.
// Self wheel renders on the light parchment ground (personal scale).
// Civilisational wheel renders on the dark ground (civilisational scale).
//
// Neither wheel is public — they are the user's own navigation. There are no
// visibility toggles on this section.
//
// The actual wheel rendering belongs to a separate module. This surface
// reserves the slot, owns the toggle, and renders an honest placeholder until
// the wheel components arrive. The placeholder names what is missing rather
// than filling thin signal — the not-knowing stance applied to the chrome.
//
// Props:
//   selfSlot      — JSX rendered in Self mode (optional)
//   civSlot       — JSX rendered in Civ mode (optional)
//   defaultMode   — 'self' | 'civ' (default 'self')
//   className     — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

export default function WheelsToggleSection({
  selfSlot,
  civSlot,
  defaultMode = 'self',
  className,
}) {
  const [mode, setMode] = useState(defaultMode === 'civ' ? 'civ' : 'self')
  const isCiv = mode === 'civ'

  return (
    <div
      className={className}
      style={{
        background: isCiv ? '#0F1523' : '#FAFAF7',
        borderRadius: '14px',
        padding: '24px 22px',
        transition: 'background 240ms ease',
        border: isCiv
          ? '1px solid rgba(200, 146, 42, 0.20)'
          : '1px solid rgba(200, 146, 42, 0.20)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '18px',
        }}
      >
        <div>
          <span
            style={{
              ...sc,
              display: 'block',
              fontSize: '12px',
              letterSpacing: '0.08em',
              color: isCiv ? '#C8922A' : '#A8721A',
              fontWeight: 600,
              marginBottom: '4px',
            }}
          >
            {isCiv ? 'Civilisational' : 'Self'}
          </span>
          <h2
            style={{
              ...display,
              fontSize: 'clamp(22px, 3vw, 30px)',
              fontWeight: 300,
              lineHeight: 1.2,
              color: isCiv ? '#FFFFFF' : '#0F1523',
              margin: 0,
            }}
          >
            {isCiv ? 'Where the work meets civilisation' : 'Your seven domains'}
          </h2>
        </div>
        <ScaleToggle mode={mode} onChange={setMode} />
      </div>

      <div
        aria-live="polite"
        style={{
          minHeight: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isCiv ? (
          civSlot || <Placeholder dark label="Civilisational wheel" />
        ) : selfSlot ? (
          selfSlot
        ) : (
          <Placeholder dark={false} label="Self wheel" />
        )}
      </div>

      <p
        style={{
          ...body,
          fontSize: '14px',
          lineHeight: 1.55,
          color: isCiv ? 'rgba(255, 255, 255, 0.72)' : 'rgba(15, 21, 35, 0.55)',
          margin: '20px 0 0',
        }}
      >
        Both wheels are your own navigation. They are not published. What is
        public, only when you choose it, is your placement in the ecosystem.
      </p>
    </div>
  )
}

// ─── Internal: scale toggle pill ─────────────────────────────────────────────

function ScaleToggle({ mode, onChange }) {
  const isSelf = mode === 'self'
  return (
    <div
      role="tablist"
      aria-label="Wheel scale"
      style={{
        display: 'inline-flex',
        background: isSelf ? 'rgba(15, 21, 35, 0.06)' : 'rgba(255, 255, 255, 0.08)',
        borderRadius: '40px',
        padding: '3px',
        border:
          '1px solid ' +
          (isSelf ? 'rgba(200, 146, 42, 0.20)' : 'rgba(200, 146, 42, 0.30)'),
      }}
    >
      <ToggleOption
        active={isSelf}
        dark={!isSelf}
        label="Self"
        onClick={() => onChange('self')}
      />
      <ToggleOption
        active={!isSelf}
        dark={!isSelf}
        label="Civilisational"
        onClick={() => onChange('civ')}
      />
    </div>
  )
}

function ToggleOption({ active, dark, label, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        ...sc,
        background: active
          ? dark
            ? '#FAFAF7'
            : '#0F1523'
          : 'transparent',
        color: active
          ? dark
            ? '#0F1523'
            : '#FFFFFF'
          : dark
          ? 'rgba(255, 255, 255, 0.72)'
          : 'rgba(15, 21, 35, 0.72)',
        border: 'none',
        borderRadius: '40px',
        padding: '6px 14px',
        fontSize: '13px',
        letterSpacing: '0.06em',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'background 160ms ease, color 160ms ease',
      }}
    >
      {label}
    </button>
  )
}

// ─── Internal: honest placeholder ────────────────────────────────────────────

function Placeholder({ dark, label }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '32px 16px',
        maxWidth: '420px',
      }}
    >
      <div
        aria-hidden
        style={{
          width: '160px',
          height: '160px',
          margin: '0 auto 16px',
          borderRadius: '50%',
          border: dark
            ? '1px dashed rgba(200, 146, 42, 0.35)'
            : '1px dashed rgba(200, 146, 42, 0.35)',
        }}
      />
      <p
        style={{
          ...body,
          fontSize: '15px',
          lineHeight: 1.55,
          color: dark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(15, 21, 35, 0.55)',
          margin: 0,
        }}
      >
        Your {label.toLowerCase()} renders here.
      </p>
    </div>
  )
}
