import { useState } from 'react'
import { useGapSignal } from '../hooks/useGapSignal'
import { GapSignalExplainer } from './GapSignalExplainer'

// Design tokens
const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const goldDark = '#A8721A'

// ─────────────────────────────────────────────────────────────
// GapSignalBadge
//
// "Surface only when firing. Silent when not." (brief)
//
// Renders nothing while loading, on error, or when not firing.
// When firing, renders a small annotation:
//   "Gap Signal firing at <Focus>. Low score, low actor density, low funding."
// Clicking opens the explainer modal showing current values vs thresholds.
//
// Designed to slot near the actor grid on Domain pages. Owner module
// (Module 11 BetaDomain) renders this with the currently-selected
// focusId; this component handles the rest.
//
// Props:
//   domainId   — civilisational domain slug ('nature', 'society', ...)
//   focusId    — uuid of the currently-viewed Focus
//   focusName  — display name for the Focus (for the annotation copy)
// ─────────────────────────────────────────────────────────────
export function GapSignalBadge({ domainId, focusId, focusName }) {
  const [explainerOpen, setExplainerOpen] = useState(false)
  const { payload, loading, error } = useGapSignal(domainId, focusId)

  // Silent in all non-firing states. The brief is explicit:
  // an alarm that fires on every difficult domain is noise.
  if (loading) return null
  if (error)   return null
  if (!payload) return null
  if (!payload.firing) return null

  return (
    <>
      <button
        onClick={() => setExplainerOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px',
          background: 'rgba(200,146,42,0.06)',
          border: '1px solid rgba(200,146,42,0.32)',
          borderRadius: '40px',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,146,42,0.10)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,146,42,0.06)'}
      >
        {/* Pulse dot — small, slow, so it reads as signal not noise */}
        <span style={{
          width: '7px', height: '7px',
          borderRadius: '50%',
          background: goldDark,
          flexShrink: 0,
          animation: 'gapsignal-pulse 2.4s ease-in-out infinite',
        }} />
        <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: goldDark, flexShrink: 0 }}>
          Gap Signal
        </span>
        <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.70)', lineHeight: 1.45 }}>
          firing at {focusName || 'this Focus'}. Low score, low actor density, low funding.
        </span>
      </button>

      <style>{`
        @keyframes gapsignal-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.35; }
        }
      `}</style>

      {explainerOpen && (
        <GapSignalExplainer
          payload={payload}
          domainId={domainId}
          focusName={focusName}
          onClose={() => setExplainerOpen(false)}
        />
      )}
    </>
  )
}
