import { useEffect, useRef, useState } from 'react'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

// ── Parallax hook ─────────────────────────────────────────────────────────────
// Returns a translateY value (px) based on scroll position.
// speed: 0.0 = static, 0.15 = subtle, 0.3 = visible, 0.5 = dramatic
export function useParallax(speed = 0.15) {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    function onScroll() {
      setOffset(window.scrollY * speed)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [speed])
  return offset
}

// ── Needle divider — entry into dark (needle ascending from light into dark) ──
// A pointed arch: light section above tapers to a needle point, dark fills below
export function NeedleEntryDivider({ topColor = '#FAFAF7', bottomColor = '#0F1523' }) {
  return (
    <div style={{ display: 'block', lineHeight: 0, fontSize: 0, margin: 0, padding: 0 }}>
      <svg
        width="100%"
        viewBox="0 0 1440 72"
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        {/* top fill */}
        <rect x="0" y="0" width="1440" height="36" fill={topColor} />
        {/* arch pointing up into light — dark fills below */}
        <path d="M0,36 L720,4 L1440,36 L1440,72 L0,72 Z" fill={bottomColor} />
        {/* needle tip at apex */}
        <line x1="720" y1="72" x2="720" y2="20" stroke="#C8922A" strokeWidth="1.2" opacity="0.75" />
        <polygon points="720,4 723.5,16 720,22 716.5,16" fill="#C8922A" opacity="0.82" />
        {/* compass ring */}
        <circle cx="720" cy="26" r="6" fill="none" stroke="#C8922A" strokeWidth="1" opacity="0.55" />
        <circle cx="720" cy="26" r="2.2" fill="#C8922A" opacity="0.72" />
        {/* flanking dots */}
        <circle cx="702" cy="30" r="1.8" fill="#C8922A" opacity="0.3" />
        <circle cx="738" cy="30" r="1.8" fill="#C8922A" opacity="0.3" />
      </svg>
    </div>
  )
}

// ── Horizon arc divider — exit from dark ──────────────────────────────────────
// A convex arc like the curvature of the Earth — dark above, light below
// The arc rises gently from edges to centre, suggesting a horizon
export function HorizonExitDivider({ topColor = '#0F1523', bottomColor = '#FAFAF7' }) {
  return (
    <div style={{ display: 'block', lineHeight: 0, fontSize: 0, margin: 0, padding: 0 }}>
      <svg
        width="100%"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        {/* dark fill above the arc */}
        <rect x="0" y="0" width="1440" height="80" fill={topColor} />
        {/* convex arc — the horizon curve */}
        {/* Quadratic bezier: starts at bottom-left, rises to centre top, descends to bottom-right */}
        <path d="M0,80 L0,56 Q720,0 1440,56 L1440,80 Z" fill={bottomColor} />
        {/* compass ring sitting on the horizon */}
        <circle cx="720" cy="22" r="6" fill="none" stroke="#C8922A" strokeWidth="1" opacity="0.55" />
        <circle cx="720" cy="22" r="2.2" fill="#C8922A" opacity="0.72" />
        {/* needle tail descending from ring into the dark */}
        <line x1="720" y1="16" x2="720" y2="4" stroke="#C8922A" strokeWidth="1.2" opacity="0.65" />
        {/* flanking dots */}
        <circle cx="702" cy="26" r="1.8" fill="#C8922A" opacity="0.3" />
        <circle cx="738" cy="26" r="1.8" fill="#C8922A" opacity="0.3" />
      </svg>
    </div>
  )
}

// ── Legacy export for any code still using NeedleDivider ─────────────────────
export function NeedleDivider({ direction = 'into-dark', topColor = '#FAFAF7', bottomColor = '#0F1523' }) {
  if (direction === 'into-dark') {
    return <NeedleEntryDivider topColor={topColor} bottomColor={bottomColor} />
  }
  return <HorizonExitDivider topColor={bottomColor === '#FAFAF7' ? '#0F1523' : topColor} bottomColor={bottomColor} />
}

// ── Dark Section wrapper ───────────────────────────────────────────────────────
export function DarkSection({ children, topColor = '#FAFAF7', bottomColor = '#FAFAF7', style = {} }) {
  return (
    <>
      {topColor !== null && (
        <NeedleEntryDivider topColor={topColor} bottomColor="#0F1523" />
      )}
      <section style={{
        background: '#0F1523',
        padding: '80px 40px',
        ...style,
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          {children}
        </div>
      </section>
      {bottomColor !== null && (
        <HorizonExitDivider topColor="#0F1523" bottomColor={bottomColor} />
      )}
    </>
  )
}

// ── Dark eyebrow ──────────────────────────────────────────────────────────────
export function DarkEyebrow({ children }) {
  return (
    <span style={{
      ...sc,
      fontSize: '12px',
      fontWeight: 600,
      letterSpacing: '0.22em',
      color: '#A8721A',
      textTransform: 'uppercase',
      display: 'block',
      marginBottom: '14px',
    }}>{children}</span>
  )
}

// ── Dark heading ─────────────────────────────────────────────────────────────
export function DarkHeading({ children, style = {} }) {
  return (
    <h2 style={{
      ...body,
      fontSize: 'clamp(28px,4vw,44px)',
      fontWeight: 300,
      color: 'rgba(255,255,255,0.92)',
      lineHeight: 1.1,
      marginBottom: '18px',
      ...style,
    }}>{children}</h2>
  )
}

// ── Dark body text ────────────────────────────────────────────────────────────
export function DarkBody({ children, style = {} }) {
  return (
    <p style={{
      ...body,
      fontSize: '17px',
      fontWeight: 300,
      color: 'rgba(255,255,255,0.55)',
      lineHeight: 1.8,
      marginBottom: '28px',
      ...style,
    }}>{children}</p>
  )
}

// ── Dark rule ─────────────────────────────────────────────────────────────────
export function DarkRule() {
  return (
    <div style={{
      width: '48px',
      height: '1px',
      background: 'rgba(200,146,42,0.35)',
      margin: '0 auto 32px',
    }} />
  )
}

// ── Dark ghost button ─────────────────────────────────────────────────────────
export function DarkGhostButton({ href, children }) {
  return (
    <a href={href} style={{
      display: 'inline-block',
      ...sc,
      fontSize: '15px',
      fontWeight: 600,
      letterSpacing: '0.16em',
      padding: '13px 32px',
      borderRadius: '40px',
      border: '1.5px solid rgba(200,146,42,0.7)',
      color: '#A8721A',
      background: 'rgba(200,146,42,0.07)',
      textDecoration: 'none',
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.14)'; e.currentTarget.style.borderColor = '#C8922A' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.07)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.7)' }}
    >{children}</a>
  )
}

// ── Dark solid button ─────────────────────────────────────────────────────────
export function DarkSolidButton({ href, children, onClick }) {
  return (
    <a href={href} onClick={onClick} style={{
      display: 'inline-block',
      ...sc,
      fontSize: '15px',
      fontWeight: 600,
      letterSpacing: '0.16em',
      padding: '13px 32px',
      borderRadius: '40px',
      border: '1px solid rgba(168,114,26,0.8)',
      color: '#FFFFFF',
      background: '#C8922A',
      textDecoration: 'none',
    }}>{children}</a>
  )
}

// ── Pull quote ────────────────────────────────────────────────────────────────
export function DarkPullQuote({ quote, attribution }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{
        ...body,
        fontSize: '52px',
        fontWeight: 300,
        color: 'rgba(200,146,42,0.25)',
        lineHeight: 1,
        marginBottom: '16px',
      }}>"</div>
      <p style={{
        ...body,
        fontSize: 'clamp(17px,2.2vw,22px)',
        fontWeight: 300,
        fontStyle: 'italic',
        color: 'rgba(255,255,255,0.88)',
        lineHeight: 1.75,
        marginBottom: '24px',
      }}>{quote}</p>
      {attribution && (
        <span style={{
          ...sc,
          fontSize: '12px',
          letterSpacing: '0.18em',
          color: 'rgba(200,146,42,0.65)',
          textTransform: 'uppercase',
        }}>{attribution}</span>
      )}
    </div>
  )
}
