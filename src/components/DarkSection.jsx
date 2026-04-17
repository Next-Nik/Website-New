import { useEffect, useRef, useState } from 'react'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

// ── Parallax hook ─────────────────────────────────────────────────────────────
export function useParallax(speed = 0.15) {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    function onScroll() { setOffset(window.scrollY * speed) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [speed])
  return offset
}

// ── Section parallax wrapper ───────────────────────────────────────────────────
// Wraps any section content with a gentle scroll-driven translateY
export function ParallaxLayer({ speed = 0.06, children, style = {} }) {
  const offset = useParallax(speed)
  return (
    <div style={{
      transform: `translateY(${offset}px)`,
      willChange: 'transform',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── THE LOCKED ARC ─────────────────────────────────────────────────────────────
// One shape. Used for both entry and exit.
// A gentle convex curve — the curvature of the Earth seen from the horizon.
// Control point Y=18 gives a subtle arc, not a lens.
// Entry: light above, arc descends into dark
// Exit:  dark above, arc descends into light (same curve, flipped vertically)

const ARC_H    = 64           // viewBox height
const ARC_PEAK = 18           // how high the arc rises at centre (lower = subtler)
const ARC_BASE = 44           // where the flat parts sit

// Entry divider: light → dark
// Arc points upward into the light section, dark fills below
export function ArcEntryDivider({ topColor = '#FAFAF7', bottomColor = '#0F1523' }) {
  return (
    <div style={{ display: 'block', lineHeight: 0, fontSize: 0, margin: 0, padding: 0 }}>
      <svg width="100%" viewBox={`0 0 1440 ${ARC_H}`} preserveAspectRatio="none"
        style={{ display: 'block' }} aria-hidden="true">
        {/* top flat fill */}
        <rect x="0" y="0" width="1440" height={ARC_BASE} fill={topColor} />
        {/* dark section fills from the arc down */}
        <path d={`M0,${ARC_BASE} Q720,${ARC_PEAK} 1440,${ARC_BASE} L1440,${ARC_H} L0,${ARC_H} Z`}
          fill={bottomColor} />
        {/* gold border on the arc line */}
        <path d={`M0,${ARC_BASE} Q720,${ARC_PEAK} 1440,${ARC_BASE}`}
          fill="none" stroke="#C8922A" strokeWidth="1" opacity="0.5" />
        {/* compass mark at apex */}
        <circle cx="720" cy={ARC_PEAK + 8} r="5.5" fill="none" stroke="#C8922A" strokeWidth="0.9" opacity="0.6" />
        <circle cx="720" cy={ARC_PEAK + 8} r="2" fill="#C8922A" opacity="0.75" />
        <line x1="720" y1={ARC_PEAK - 2} x2="720" y2={ARC_PEAK + 2}
          stroke="#C8922A" strokeWidth="1.2" opacity="0.8" />
        <polygon points={`720,${ARC_PEAK} 723,${ARC_PEAK + 9} 720,${ARC_PEAK + 13} 717,${ARC_PEAK + 9}`}
          fill="#C8922A" opacity="0.75" />
        <circle cx="704" cy={ARC_PEAK + 12} r="1.6" fill="#C8922A" opacity="0.35" />
        <circle cx="736" cy={ARC_PEAK + 12} r="1.6" fill="#C8922A" opacity="0.35" />
      </svg>
    </div>
  )
}

// Exit divider: dark → light
// Same arc shape, flipped — arc points downward into the light section
export function ArcExitDivider({ topColor = '#0F1523', bottomColor = '#FAFAF7' }) {
  const midY = ARC_H - ARC_BASE          // 20 — where flat parts sit from top
  const peakY = ARC_H - ARC_PEAK        // 46 — where arc descends to
  return (
    <div style={{ display: 'block', lineHeight: 0, fontSize: 0, margin: 0, padding: 0 }}>
      <svg width="100%" viewBox={`0 0 1440 ${ARC_H}`} preserveAspectRatio="none"
        style={{ display: 'block' }} aria-hidden="true">
        {/* dark fills from top down to the arc */}
        <path d={`M0,0 L1440,0 L1440,${midY} Q720,${peakY} 0,${midY} Z`}
          fill={topColor} />
        {/* light fills below */}
        <rect x="0" y={midY} width="1440" height={ARC_H - midY} fill={bottomColor} />
        {/* gold border on the arc line */}
        <path d={`M0,${midY} Q720,${peakY} 1440,${midY}`}
          fill="none" stroke="#C8922A" strokeWidth="1" opacity="0.5" />
        {/* compass mark at nadir */}
        <circle cx="720" cy={peakY - 8} r="5.5" fill="none" stroke="#C8922A" strokeWidth="0.9" opacity="0.6" />
        <circle cx="720" cy={peakY - 8} r="2" fill="#C8922A" opacity="0.75" />
        <circle cx="704" cy={peakY - 12} r="1.6" fill="#C8922A" opacity="0.35" />
        <circle cx="736" cy={peakY - 12} r="1.6" fill="#C8922A" opacity="0.35" />
      </svg>
    </div>
  )
}

// ── Legacy exports ────────────────────────────────────────────────────────────
export const NeedleEntryDivider = ArcEntryDivider
export const HorizonExitDivider = ArcExitDivider
export function NeedleDivider({ direction = 'into-dark', topColor = '#FAFAF7', bottomColor = '#0F1523' }) {
  if (direction === 'into-dark') return <ArcEntryDivider topColor={topColor} bottomColor={bottomColor} />
  return <ArcExitDivider topColor="#0F1523" bottomColor={bottomColor} />
}

// ── Dark Section wrapper ───────────────────────────────────────────────────────
export function DarkSection({ children, topColor = '#FAFAF7', bottomColor = '#FAFAF7', style = {} }) {
  const parallax = useParallax(0.05)
  return (
    <>
      {topColor !== null && <ArcEntryDivider topColor={topColor} bottomColor="#0F1523" />}
      <section style={{
        background: '#0F1523',
        borderLeft: '1px solid rgba(200,146,42,0.35)',
        borderRight: '1px solid rgba(200,146,42,0.35)',
        padding: '96px 40px',
        ...style,
      }}>
        <div style={{
          maxWidth: '820px',
          margin: '0 auto',
          transform: `translateY(${parallax}px)`,
          willChange: 'transform',
        }}>
          {children}
        </div>
      </section>
      {bottomColor !== null && <ArcExitDivider topColor="#0F1523" bottomColor={bottomColor} />}
    </>
  )
}

// ── Dark eyebrow ──────────────────────────────────────────────────────────────
export function DarkEyebrow({ children }) {
  return (
    <span style={{
      ...sc, fontSize: '12px', fontWeight: 600, letterSpacing: '0.22em',
      color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '14px',
    }}>{children}</span>
  )
}

// ── Dark heading ─────────────────────────────────────────────────────────────
export function DarkHeading({ children, style = {} }) {
  return (
    <h2 style={{
      ...body, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300,
      color: '#FFFFFF', lineHeight: 1.1, marginBottom: '18px', ...style,
    }}>{children}</h2>
  )
}

// ── Dark body text ────────────────────────────────────────────────────────────
export function DarkBody({ children, style = {} }) {
  return (
    <p style={{
      ...body, fontSize: '17px', fontWeight: 300,
      color: '#FFFFFF', lineHeight: 1.8, marginBottom: '28px', ...style,
    }}>{children}</p>
  )
}

// ── Dark rule ─────────────────────────────────────────────────────────────────
export function DarkRule() {
  return (
    <div style={{ width: '48px', height: '1px', background: 'rgba(200,146,42,0.5)', margin: '0 auto 32px' }} />
  )
}

// ── Dark ghost button ─────────────────────────────────────────────────────────
export function DarkGhostButton({ href, children }) {
  return (
    <a href={href} style={{
      display: 'inline-block', ...sc, fontSize: '15px', fontWeight: 600,
      letterSpacing: '0.16em', padding: '13px 32px', borderRadius: '40px',
      border: '1.5px solid rgba(200,146,42,0.7)', color: '#A8721A',
      background: 'rgba(200,146,42,0.07)', textDecoration: 'none', transition: 'all 0.2s',
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
      display: 'inline-block', ...sc, fontSize: '15px', fontWeight: 600,
      letterSpacing: '0.16em', padding: '13px 32px', borderRadius: '40px',
      border: '1px solid rgba(168,114,26,0.8)', color: '#FFFFFF',
      background: '#C8922A', textDecoration: 'none',
    }}>{children}</a>
  )
}

// ── Pull quote ────────────────────────────────────────────────────────────────
export function DarkPullQuote({ quote, attribution }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{
        ...body, fontSize: '52px', fontWeight: 300,
        color: 'rgba(200,146,42,0.4)', lineHeight: 1, marginBottom: '16px',
      }}>"</div>
      <p style={{
        ...body, fontSize: 'clamp(17px,2.2vw,22px)', fontWeight: 300,
        color: '#FFFFFF', lineHeight: 1.75, marginBottom: '24px',
      }}>{quote}</p>
      {attribution && (
        <span style={{
          ...sc, fontSize: '12px', letterSpacing: '0.18em',
          color: '#A8721A', textTransform: 'uppercase',
        }}>{attribution}</span>
      )}
    </div>
  )
}
