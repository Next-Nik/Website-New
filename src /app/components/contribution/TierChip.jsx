// src/beta/components/contribution/TierChip.jsx
//
// Rounded chip rendering one contribution tier. Click toggles selection.
// The label and description copy are CANONICAL — defined in src/beta/constants/
// contributionTiers.js and seeded in contribution_tiers_beta. Do not paraphrase.
//
// Props:
//   slug      — one of: micro, tiny, small, medium, large, xl, benefactor
//   label     — display label
//   active    — boolean
//   onClick   — () => void; toggles selection
//   showDescription — when true, renders description below the label

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

export default function TierChip({
  slug,
  label,
  description,
  active = false,
  onClick,
  showDescription = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        ...sc,
        fontSize: '13px',
        letterSpacing: '0.04em',
        color: active ? '#A8721A' : 'rgba(15,21,35,0.72)',
        background: active ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
        border: active
          ? '1px solid rgba(200,146,42,0.55)'
          : '1px solid rgba(200,146,42,0.25)',
        borderRadius: showDescription ? '14px' : '40px',
        padding: showDescription ? '12px 16px' : '6px 14px',
        cursor: 'pointer',
        textAlign: 'left',
        display: showDescription ? 'block' : 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        lineHeight: showDescription ? 1.4 : 1,
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(200,146,42,0.04)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = '#FFFFFF'
        }
      }}
    >
      {showDescription ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {active && (
              <span
                aria-hidden
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#A8721A',
                }}
              />
            )}
            <span style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
          </div>
          <span style={{
            ...body,
            fontSize: '13px',
            color: 'rgba(15,21,35,0.55)',
            lineHeight: 1.5,
            letterSpacing: 'normal',
          }}>
            {description}
          </span>
        </>
      ) : (
        <>
          {active && (
            <span
              aria-hidden
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#A8721A',
                display: 'inline-block',
              }}
            />
          )}
          <span style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
        </>
      )}
    </button>
  )
}
