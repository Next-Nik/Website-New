import { getHorizonFloor, isValidDomainSlug } from '../constants/horizonFloor'

// ─────────────────────────────────────────────────────────────────────────────
// HorizonFloorCard
//
// Renders a domain's Horizon Goal forward-only, paired with the explainer
// paragraph that names the wound the Horizon heals and what the platform
// refuses to host. The Goal stays a vision. The explainer makes the floor
// visible.
//
// This component has no actions and no admission flow. It is the canonical
// surface for showing what a domain commits to. Used on domain pages, in the
// admission check, in any editorial surface that needs to render the floor.
//
// Two visual variants:
//   - variant='full'     — page treatment. Goal in display type, explainer
//                          full prose, gold rule between, eyebrow above.
//   - variant='compact'  — card or modal treatment. Tighter, smaller, fits
//                          inside other surfaces. Same canonical text.
//
// Props:
//   domainSlug       — one of the seven (required)
//   variant          — 'full' | 'compact' (default 'full')
//   showExplainer    — set false to render the Goal alone. Default true.
//   className        — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

export default function HorizonFloorCard({
  domainSlug,
  variant = 'full',
  showExplainer = true,
  className,
}) {
  if (!isValidDomainSlug(domainSlug)) return null
  const floor = getHorizonFloor(domainSlug)
  if (!floor) return null

  if (variant === 'compact') {
    return (
      <div
        className={className}
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(200, 146, 42, 0.20)',
          borderRadius: '14px',
          padding: '18px 20px',
        }}
      >
        <span
          style={{
            ...sc,
            display: 'block',
            fontSize: '12px',
            letterSpacing: '0.08em',
            color: '#A8721A',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          {floor.label} &middot; Horizon
        </span>
        <p
          style={{
            ...body,
            fontSize: '17px',
            lineHeight: 1.5,
            color: '#0F1523',
            margin: showExplainer ? '0 0 12px' : 0,
          }}
        >
          {floor.horizonGoal}
        </p>
        {showExplainer && (
          <p
            style={{
              ...body,
              fontSize: '15px',
              lineHeight: 1.55,
              color: 'rgba(15, 21, 35, 0.72)',
              margin: 0,
            }}
          >
            {floor.explainer}
          </p>
        )}
      </div>
    )
  }

  // Full variant.
  return (
    <div className={className}>
      <span
        style={{
          ...sc,
          display: 'block',
          fontSize: '13px',
          letterSpacing: '0.08em',
          color: '#A8721A',
          fontWeight: 600,
          marginBottom: '12px',
        }}
      >
        {floor.label} &middot; Horizon
      </span>

      <p
        style={{
          ...display,
          fontSize: 'clamp(22px, 3vw, 32px)',
          fontWeight: 300,
          lineHeight: 1.25,
          color: '#0F1523',
          margin: '0 0 24px',
        }}
      >
        {floor.horizonGoal}
      </p>

      {showExplainer && (
        <>
          <div
            aria-hidden
            style={{
              height: '1px',
              width: '64px',
              background: 'rgba(200, 146, 42, 0.45)',
              margin: '0 0 24px',
            }}
          />
          <p
            style={{
              ...body,
              fontSize: '17px',
              lineHeight: 1.6,
              color: '#0F1523',
              margin: 0,
            }}
          >
            {floor.explainer}
          </p>
        </>
      )}
    </div>
  )
}
