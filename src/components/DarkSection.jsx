import { useEffect, useRef, useState } from 'react'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

// ── Multiplane scroll hook ────────────────────────────────────────────────────
// Tracks each section's position relative to the viewport centre so the
// offset is always bounded — no accumulation across the page.
function useViewportParallax(speed = 0.06) {
  const ref = useRef(null)
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    function onScroll() {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const viewportCenter = window.innerHeight / 2
      const sectionCenter = rect.top + rect.height / 2
      const distFromCenter = sectionCenter - viewportCenter
      setOffset(distFromCenter * speed)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [speed])
  return { ref, offset }
}

export function useParallax(speed = 0.04) {
  const { offset } = useViewportParallax(speed)
  return offset
}

// ── THE LOCKED ARC ────────────────────────────────────────────────────────────
// Gold stroke follows the arc curve exactly — this IS the border.
// No other gold lines anywhere.

const W    = 1440
const H    = 56
const FLAT = 32
const RISE = 10

export function ArcEntry({ topColor = '#FAFAF7', bottomColor = '#0F1523' }) {
  const peak = FLAT - RISE
  return (
    <div style={{ display: 'block', lineHeight: 0, fontSize: 0, margin: 0, padding: 0 }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ display: 'block' }} aria-hidden="true">
        <path d={`M0,${FLAT} Q${W/2},${peak} ${W},${FLAT} L${W},${H} L0,${H} Z`} fill={bottomColor} />
        {/* Gold stroke — the border of the dark section */}
        <path d={`M0,${FLAT} Q${W/2},${peak} ${W},${FLAT}`}
          fill="none" stroke="#C8922A" strokeWidth="3" opacity="0.85" />
        {/* Compass mark at apex */}
        <circle cx={W/2} cy={peak+7} r="4.5" fill="none" stroke="#C8922A" strokeWidth="0.9" opacity="0.7" />
        <circle cx={W/2} cy={peak+7} r="1.8" fill="#C8922A" opacity="0.85" />
        <line x1={W/2} y1={peak} x2={W/2} y2={peak+2} stroke="#C8922A" strokeWidth="1" opacity="0.85" />
        <polygon points={`${W/2},${peak} ${W/2+3},${peak+8} ${W/2},${peak+12} ${W/2-3},${peak+8}`}
          fill="#C8922A" opacity="0.75" />
        <circle cx={W/2-16} cy={peak+10} r="1.4" fill="#C8922A" opacity="0.4" />
        <circle cx={W/2+16} cy={peak+10} r="1.4" fill="#C8922A" opacity="0.4" />
      </svg>
    </div>
  )
}

export function ArcExit({ topColor = '#0F1523', bottomColor = '#FAFAF7' }) {
  const nadir = FLAT + RISE
  const start = H - FLAT
  return (
    <div style={{ display: 'block', lineHeight: 0, fontSize: 0, margin: 0, padding: 0 }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ display: 'block' }} aria-hidden="true">
        <path d={`M0,0 L${W},0 L${W},${start} Q${W/2},${nadir} 0,${start} Z`} fill={topColor} />
        {/* Gold stroke — the border of the dark section */}
        <path d={`M0,${start} Q${W/2},${nadir} ${W},${start}`}
          fill="none" stroke="#C8922A" strokeWidth="3" opacity="0.85" />
        {/* Compass mark at nadir */}
        <circle cx={W/2} cy={nadir-6} r="4.5" fill="none" stroke="#C8922A" strokeWidth="0.9" opacity="0.7" />
        <circle cx={W/2} cy={nadir-6} r="1.8" fill="#C8922A" opacity="0.85" />
        <circle cx={W/2-16} cy={nadir-10} r="1.4" fill="#C8922A" opacity="0.4" />
        <circle cx={W/2+16} cy={nadir-10} r="1.4" fill="#C8922A" opacity="0.4" />
      </svg>
    </div>
  )
}

// Legacy aliases
export const NeedleEntryDivider = ArcEntry
export const HorizonExitDivider = ArcExit
export function NeedleDivider({ direction = 'into-dark', topColor = '#FAFAF7', bottomColor = '#0F1523' }) {
  if (direction === 'into-dark') return <ArcEntry topColor={topColor} bottomColor={bottomColor} />
  return <ArcExit topColor="#0F1523" bottomColor={bottomColor} />
}

// ── Dark Section wrapper ───────────────────────────────────────────────────────
// Dark sections are the FOREGROUND layer — they sit in front of the light sections.
// They move at a slightly faster rate than the page, reinforcing their position
// in front. The shadow they cast onto the light sections behind them confirms depth.
//
// Shadow: cast by the dark section onto the light sections above and below.
// The dark section is in front — its edges bleed shadow onto the background behind.
export function DarkSection({ children, topColor = '#FAFAF7', bottomColor = '#FAFAF7', style = {} }) {
  const { ref, offset } = useViewportParallax(0.06)
  return (
    <div ref={ref} style={{
      position: 'relative',
      zIndex: 10,
      transform: `translateY(${offset}px)`,
      willChange: 'transform',
      filter: 'drop-shadow(0px -12px 24px rgba(15,21,35,0.35)) drop-shadow(0px 12px 24px rgba(15,21,35,0.35))',
    }}>
      {topColor !== null && <ArcEntry topColor={topColor} bottomColor="#0F1523" />}
      <section style={{
        background: '#0F1523',
        padding: '96px 40px',
        position: 'relative',
        ...style,
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          {children}
        </div>
      </section>
      {bottomColor !== null && <ArcExit topColor="#0F1523" bottomColor={bottomColor} />}
    </div>
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
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '80px', fontWeight: 300,
        color: 'rgba(200,146,42,0.45)', lineHeight: 0.8, marginBottom: '28px',
      }}>"</div>
      <p style={{
        ...body, fontSize: 'clamp(18px,2.4vw,24px)', fontWeight: 300,
        color: '#FFFFFF', lineHeight: 1.75, marginBottom: '28px',
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

// DarkRule renders nothing — gold lives on the arc only
export function DarkRule() { return null }
