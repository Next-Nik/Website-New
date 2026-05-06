// ─────────────────────────────────────────────────────────────
// HorizonStateGauge.jsx
//
// The Horizon State rail-tile glyph. Variant 2 from the icon study:
// half-arc dial across the bottom, needle sweeping from 9 o'clock to
// 3 o'clock through 12. Anchor stays. The two flanking dots from the
// NextUs logo become endpoint markers at the far edges of the dial.
//
// Animation behaviour: RPM-gauge boot sequence on mount.
//   • Needle starts at empty (-90°, full left)
//   • Sweeps clockwise through full and overshoots to +105°
//   • Settles back through ~+15° to ~+45° with a small bounce
//   • Lands at +45° (just above middle, into the upper register)
//
// Fires every Mission Control mount. Single play, no repeat.
//
// Sizing: matches the rail-glyph font-size cascade — 28px on desktop,
// 24px at the 1280-narrow breakpoint, 22px at the 1024 mobile-strip
// breakpoint. Stroke uses currentColor so the wrapper's gold-dk /
// gold-lt color value flows through and dark-mode flip is automatic.
// ─────────────────────────────────────────────────────────────

import { useId } from 'react'

export default function HorizonStateGauge() {
  // Unique id for the keyframes so multiple instances don't collide
  const id = useId().replace(/[:]/g, '_')
  const kf = `mc-hs-rev-${id}`

  return (
    <span
      className="mc-hs-gauge"
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        lineHeight: 1,
      }}
    >
      <style>{`
        /* Rev sequence: empty (-90°) → past full (+105°) → bounce
           down through middle and back up → settle at +45°. */
        @keyframes ${kf} {
          0%   { transform: rotate(-90deg); }
          55%  { transform: rotate(105deg); }
          75%  { transform: rotate(20deg); }
          88%  { transform: rotate(50deg); }
          100% { transform: rotate(45deg); }
        }
        .mc-hs-gauge svg .mc-hs-needle {
          transform-origin: 28px 28px;
          transform: rotate(45deg);
          animation: ${kf} 1100ms cubic-bezier(0.5, 0.05, 0.25, 1) 80ms 1 backwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .mc-hs-gauge svg .mc-hs-needle {
            animation: none;
            transform: rotate(45deg);
          }
        }
        @media (max-width: 1280px) {
          .mc-hs-gauge { width: 24px !important; height: 24px !important; }
        }
        @media (max-width: 1024px) {
          .mc-hs-gauge { width: 22px !important; height: 22px !important; }
        }
      `}</style>
      <svg
        viewBox="0 0 56 56"
        width="100%"
        height="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Half-arc dial — bottom half of the circle */}
        <path
          d="M 6 28 A 22 22 0 0 0 50 28"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Endpoint markers (the NextUs logo's two flanking dots,
            relocated to the dial's edges) */}
        <circle cx="6"  cy="28" r="1.6" fill="currentColor" />
        <circle cx="50" cy="28" r="1.6" fill="currentColor" />

        {/* Needle group — animated. The line is drawn vertically from
            the pivot upward; the rotate transform puts it where it
            belongs. transform-origin is the pivot center. */}
        <g className="mc-hs-needle">
          <line
            x1="28" y1="28"
            x2="28" y2="8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Pivot — sits over the needle's anchor end */}
        <circle
          cx="28" cy="28" r="3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="var(--bg-card, #FDFCF8)"
        />

        {/* Anchor stem from the NextUs logo — sits below the dial */}
        <line
          x1="28" y1="40"
          x2="28" y2="50"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
