import { useEffect, useRef, useState } from 'react'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

// ── Needle divider SVG ────────────────────────────────────────────────────────
// direction: 'into-dark' (light above → dark below) | 'out-of-dark' (dark above → light below)
// topColor / bottomColor: hex or rgba string for the two background surfaces

export function NeedleDivider({ direction = 'into-dark', topColor = '#FAFAF7', bottomColor = '#0F1523' }) {
  const isInto = direction === 'into-dark'
  return (
    <div style={{ display: 'block', lineHeight: 0, fontSize: 0, margin: 0, padding: 0 }}>
      <svg
        width="100%"
        viewBox="0 0 1440 72"
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        {isInto ? (
          <>
            {/* top fill */}
            <rect x="0" y="0" width="1440" height="36" fill={topColor} />
            {/* triangle pointing up into top section */}
            <path d={`M0,36 L720,4 L1440,36 L1440,72 L0,72 Z`} fill={bottomColor} />
            {/* needle tip */}
            <line x1="720" y1="72" x2="720" y2="20" stroke="#C8922A" strokeWidth="1.2" opacity="0.75" />
            <polygon points="720,4 723.5,16 720,22 716.5,16" fill="#C8922A" opacity="0.8" />
            {/* compass ring */}
            <circle cx="720" cy="26" r="6" fill="none" stroke="#C8922A" strokeWidth="1" opacity="0.55" />
            <circle cx="720" cy="26" r="2.2" fill="#C8922A" opacity="0.7" />
            {/* flanking dots */}
            <circle cx="702" cy="30" r="1.8" fill="#C8922A" opacity="0.3" />
            <circle cx="738" cy="30" r="1.8" fill="#C8922A" opacity="0.3" />
          </>
        ) : (
          <>
            {/* top fill (dark) */}
            <rect x="0" y="0" width="1440" height="68" fill={topColor} />
            {/* triangle pointing down into bottom section */}
            <path d={`M0,0 L1440,0 L1440,36 L720,68 L0,36 Z`} fill={topColor} />
            <rect x="0" y="36" width="1440" height="36" fill={bottomColor} />
            {/* compass ring at the point */}
            <circle cx="720" cy="62" r="6" fill="none" stroke="#C8922A" strokeWidth="1" opacity="0.55" />
            <circle cx="720" cy="62" r="2.2" fill="#C8922A" opacity="0.7" />
            {/* needle tail descending */}
            <line x1="720" y1="68" x2="720" y2="50" stroke="#C8922A" strokeWidth="1.2" opacity="0.75" />
            {/* flanking dots */}
            <circle cx="702" cy="58" r="1.8" fill="#C8922A" opacity="0.3" />
            <circle cx="738" cy="58" r="1.8" fill="#C8922A" opacity="0.3" />
          </>
        )}
      </svg>
    </div>
  )
}

// ── Dark Section wrapper ───────────────────────────────────────────────────────
// topColor: the background colour of the section above (for the divider)
// bottomColor: the background colour of the section below (for the exit divider)
// Set topColor/bottomColor to null to suppress that divider

export function DarkSection({ children, topColor = '#FAFAF7', bottomColor = '#FAFAF7', style = {} }) {
  return (
    <>
      {topColor !== null && (
        <NeedleDivider direction="into-dark" topColor={topColor} bottomColor="#0F1523" />
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
        <NeedleDivider direction="out-of-dark" topColor="#0F1523" bottomColor={bottomColor} />
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
