// src/app/components/ShareButton.jsx
//
// Reusable share affordance for any page worth sharing.
//
// Behaviour:
//   - On mobile (if navigator.share is available): opens the native share sheet
//   - Elsewhere: copies the current URL to clipboard, shows brief "Copied" confirmation
//
// Two visual variants:
//   variant="icon" (default) — just the share glyph
//   variant="text"           — share glyph + "Share" text label
//
// Props:
//   url?         — URL to share; defaults to window.location.href
//   title?       — title for the share sheet; defaults to document.title
//   text?        — descriptive text for the share sheet
//   variant?     — 'icon' | 'text' (default 'icon')
//   placement?   — visual hint for sizing; 'inline' | 'corner' (default 'inline')

import { useState, useRef, useEffect } from 'react'
import { sc } from '../../lib/designTokens'

function ShareGlyph({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {/* Three nodes connected by two lines */}
      <circle cx="6"  cy="12" r="2.5" />
      <circle cx="18" cy="5"  r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <line x1="8.2" y1="10.7" x2="15.8" y2="6.3" />
      <line x1="8.2" y1="13.3" x2="15.8" y2="17.7" />
    </svg>
  )
}

export function ShareButton({
  url,
  title,
  text,
  variant = 'icon',
  placement = 'inline',
}) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  async function handleShare() {
    const shareUrl   = url   || (typeof window !== 'undefined' ? window.location.href : '')
    const shareTitle = title || (typeof document !== 'undefined' ? document.title : 'NextUs Atlas')

    // Try native share sheet first (mobile)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url: shareUrl, title: shareTitle, text })
        return
      } catch (e) {
        // User cancelled — fall through to clipboard
        if (e?.name === 'AbortError') return
      }
    }

    // Fallback: clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      // Last-resort fallback: prompt
      window.prompt('Copy this link:', shareUrl)
    }
  }

  const baseColor = 'rgba(15,21,35,0.55)'
  const activeColor = '#A8721A'

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={handleShare}
        title="Share this page"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: copied ? 'rgba(200,146,42,0.10)' : 'transparent',
          border: '1px solid rgba(200,146,42,0.30)',
          borderRadius: '40px',
          color: copied ? activeColor : baseColor,
          cursor: 'pointer',
          ...sc,
          fontSize: '13px',
          letterSpacing: '0.12em',
          transition: 'all 0.18s ease',
        }}
        onMouseEnter={e => { if (!copied) e.currentTarget.style.color = activeColor }}
        onMouseLeave={e => { if (!copied) e.currentTarget.style.color = baseColor }}
      >
        <ShareGlyph size={13} />
        {copied ? 'Copied' : 'Share'}
      </button>
    )
  }

  // icon variant
  return (
    <button
      type="button"
      onClick={handleShare}
      title={copied ? 'Link copied' : 'Share this page'}
      aria-label={copied ? 'Link copied' : 'Share this page'}
      style={{
        position: placement === 'corner' ? 'absolute' : 'relative',
        ...(placement === 'corner' ? { top: '14px', right: '14px' } : {}),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        background: copied ? 'rgba(200,146,42,0.10)' : 'transparent',
        border: 'none',
        borderRadius: '50%',
        color: copied ? activeColor : baseColor,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!copied) {
          e.currentTarget.style.color = activeColor
          e.currentTarget.style.background = 'rgba(200,146,42,0.06)'
        }
      }}
      onMouseLeave={e => {
        if (!copied) {
          e.currentTarget.style.color = baseColor
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <ShareGlyph size={16} />
      {copied && (
        <span style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          background: 'rgba(15,21,35,0.92)',
          color: '#FAFAF7',
          fontSize: '13px',
          letterSpacing: '0.08em',
          padding: '4px 10px',
          borderRadius: '6px',
          whiteSpace: 'nowrap',
          ...sc,
          pointerEvents: 'none',
          animation: 'shareFade 1.6s ease',
        }}>
          Link copied
        </span>
      )}
      <style>{`
        @keyframes shareFade {
          0%   { opacity: 0; transform: translateY(-4px); }
          15%  { opacity: 1; transform: translateY(0); }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </button>
  )
}
