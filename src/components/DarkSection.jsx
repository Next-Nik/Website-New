import { useEffect, useState } from 'react'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

// ── Multiplane scroll hook ────────────────────────────────────────────────────
// Light sections scroll at full speed (no transform — they're just the page).
// Dark sections scroll at a slightly slower speed, making them feel further back.
// lag: how much slower the dark layer moves. 0.06 = 6% slower than foreground.
function useMultiplaneOffset(lag = 0.06) {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    function onScroll() {
      // Negative: dark sections drift upward less than the natural scroll,
      // so they appear to be on a layer behind the light sections.
      setOffset(-(window.scrollY * lag))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lag])
  return offset
}

// Also export as useParallax for any existing callers
export function useParallax(speed = 0.06) {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    function onScroll() { setOffset(window.scrollY * speed) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [speed])
  return offset
}

// ── THE LOCKED ARC ────────────────────────────────────────────────────────────
// One gentle convex curve. Same geometry entry and exit, mirrored.
// RISE controls subtlety — lower is gentler.
// Gold line traces the arc exactly. No rules anywhere else.

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
        <rect x="0" y="0" width={W} height={FLAT} fill={topColor} />
        <path d={`M0,${FLAT} Q${W/2},${peak} ${W},${FLAT} L${W},${H} L0,${H} Z`} fill={bottomColor} />
        <path d={`M0,${FLAT} Q${W/2},${peak} ${W},${FLAT}`}
          fill="none" stroke="#C8922A" strokeWidth="0.75" opacity="0.6" />
        <circle cx={W/2} cy={peak+7} r="4.5" fill="none" stroke="#C8922A" strokeWidth="0.9" opacity="0.65" />
        <circle cx={W/2} cy={peak+7} r="1.8" fill="#C8922A" opacity="0.8" />
        <line x1={W/2} y1={peak} x2={W/2} y2={peak+2} stroke="#C8922A" strokeWidth="1" opacity="0.8" />
        <polygon points={`${W/2},${peak} ${W/2+3},${peak+8} ${W/2},${peak+12} ${W/2-3},${peak+8}`}
          fill="#C8922A" opacity="0.7" />
        <circle cx={W/2-16} cy={peak+10} r="1.4" fill="#C8922A" opacity="0.35" />
        <circle cx={W/2+16} cy={peak+10} r="1.4" fill="#C8922A" opacity="0.35" />
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
        <rect x="0" y={start} width={W} height={H-start} fill={bottomColor} />
        <path d={`M0,${start} Q${W/2},${nadir} ${W},${start}`}
          fill="none" stroke="#C8922A" strokeWidth="0.75" opacity="0.6" />
        <circle cx={W/2} cy={nadir-6} r="4.5" fill="none" stroke="#C8922A" strokeWidth="0.9" opacity="0.65" />
        <circle cx={W/2} cy={nadir-6} r="1.8" fill="#C8922A" opacity="0.8" />
        <circle cx={W/2-16} cy={nadir-10} r="1.4" fill="#C8922A" opacity="0.35" />
        <circle cx={W/2+16} cy={nadir-10} r="1.4" fill="#C8922A" opacity="0.35" />
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
// The entire dark section — arcs + content — sits on a slower-moving layer.
// Light sections scroll at full speed (the foreground).
// Dark sections lag slightly behind, creating the multiplane depth effect.
// Nothing inside the dark section moves independently.
export function DarkSection({ children, topColor = '#FAFAF7', bottomColor = '#FAFAF7', style = {} }) {
  const layerOffset = useMultiplaneOffset(0.06)
  return (
    <div style={{
      transform: `translateY(${layerOffset}px)`,
      willChange: 'transform',
      // Negative margin compensates for the offset so no gap appears
      // between this layer and the light sections above/below
      marginTop: '-2px',
      marginBottom: '-2px',
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

// DarkRule renders nothing — gold line lives on the arc only
export function DarkRule() { return null }
