import { useEffect, useRef, useState } from 'react'
import { PRINCIPLES, isValidPrincipleSlug } from '../constants/principles'

// ─────────────────────────────────────────────────────────────────────────────
// PrincipleBadge
//
// Small chip rendering one of the four cross-domain platform-level principles
// with a weight indicator (primary / secondary / tertiary). Click toggles a
// tooltip with the canonical definition.
//
// Visual language: small, dignified, never decorative. Design tokens only.
// Cormorant SC for label (UI chrome), Lora for the definition (reading text).
//
// Weight is communicated by border weight and gold-fill density. Primary uses
// the gold-faint card tint; secondary uses an unfilled card with a one-pixel
// border; tertiary uses a lighter border. The principle label and definition
// are identical regardless of weight — weight is positional, not categorical.
//
// Props:
//   slug      — one of the four canonical principle slugs (required)
//   weight    — 'primary' | 'secondary' | 'tertiary' (default 'primary')
//   size      — 'sm' | 'md' (default 'sm')
//   onClick   — optional override. Default behaviour is toggle definition.
//   className — optional className passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const WEIGHT_STYLES = {
  primary: {
    background: 'rgba(200, 146, 42, 0.08)',
    border: '1px solid rgba(200, 146, 42, 0.45)',
  },
  secondary: {
    background: 'rgba(200, 146, 42, 0.05)',
    border: '1px solid rgba(200, 146, 42, 0.30)',
  },
  tertiary: {
    background: 'transparent',
    border: '1px solid rgba(200, 146, 42, 0.20)',
  },
}

const SIZE_STYLES = {
  sm: {
    padding: '4px 10px',
    fontSize: '13px',
    letterSpacing: '0.04em',
    height: '24px',
  },
  md: {
    padding: '6px 14px',
    fontSize: '14px',
    letterSpacing: '0.04em',
    height: '30px',
  },
}

export default function PrincipleBadge({
  slug,
  weight = 'primary',
  size = 'sm',
  onClick,
  className,
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  if (!isValidPrincipleSlug(slug)) {
    return null
  }
  const principle = PRINCIPLES[slug]

  const weightStyle = WEIGHT_STYLES[weight] || WEIGHT_STYLES.primary
  const sizeStyle   = SIZE_STYLES[size] || SIZE_STYLES.sm

  // Click outside closes the tooltip.
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Esc closes the tooltip.
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  function handleClick(e) {
    if (onClick) {
      onClick(e)
      return
    }
    setOpen((v) => !v)
  }

  return (
    <span
      ref={wrapperRef}
      className={className}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={open}
        aria-label={`${principle.label} principle. ${weight}. Click for definition.`}
        style={{
          ...sc,
          ...sizeStyle,
          background: weightStyle.background,
          border: weightStyle.border,
          borderRadius: '40px',
          color: '#A8721A',
          fontWeight: weight === 'primary' ? 600 : 400,
          textTransform: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          lineHeight: 1,
          transition: 'background 120ms ease',
        }}
        onMouseEnter={(e) => {
          if (weight === 'tertiary') {
            e.currentTarget.style.background = 'rgba(200, 146, 42, 0.05)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = weightStyle.background
        }}
      >
        {weight === 'primary' && (
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
        <span>{principle.label}</span>
      </button>

      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 9999,
            top: 'calc(100% + 8px)',
            left: 0,
            width: 'min(360px, 80vw)',
            background: '#0F1523',
            color: '#FFFFFF',
            borderRadius: '14px',
            padding: '14px 16px',
            boxShadow: '0 10px 30px rgba(15, 21, 35, 0.25)',
            border: '1px solid rgba(200, 146, 42, 0.20)',
          }}
        >
          <span
            style={{
              ...sc,
              display: 'block',
              fontSize: '12px',
              letterSpacing: '0.08em',
              color: '#C8922A',
              marginBottom: '6px',
              fontWeight: 600,
            }}
          >
            {principle.label}
          </span>
          <span
            style={{
              ...body,
              display: 'block',
              fontSize: '15px',
              lineHeight: 1.55,
              color: '#FFFFFF',
            }}
          >
            {principle.definition}
          </span>
        </span>
      )}
    </span>
  )
}
