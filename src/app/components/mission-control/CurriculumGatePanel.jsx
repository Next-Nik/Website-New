// ─────────────────────────────────────────────────────────────
// CurriculumGatePanel.jsx — the invitation
//
// Shown inside a Mission Control Panel when the user taps a tile
// whose chapter sits ahead of them on the journey. Dim-not-locked:
// the tile always opens, and what opens is an invitation — what
// this surface is, what it builds, and where it begins. Forward
// language only; nothing here is locked, it is ahead.
//
// Props (unchanged — all existing callers keep working):
//   toolName      string  — name of the surface they tapped
//   reason        string  — forward-facing explanation
//   ctaLabel      string  — button label
//   ctaPath       string  — route to navigate to
// ─────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom'
import {
  GOLD, GOLD_DK, GOLD_RULE,
  TEXT_INK, TEXT_META,
  FONT_SC, FONT_BODY, FONT_DISPLAY,
} from './tokens'

const sc   = { fontFamily: FONT_SC }
const body = { fontFamily: FONT_BODY }
const disp = { fontFamily: FONT_DISPLAY }

export default function CurriculumGatePanel({
  toolName,
  reason,
  ctaLabel = 'Open your journey →',
  ctaPath  = '/nextu',
}) {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '32px 24px' }}>
      {/* Eyebrow — position, never a lock */}
      <div style={{
        ...sc, fontSize: '13px', letterSpacing: '0.20em',
        color: GOLD_DK, marginBottom: '20px',
      }}>
        AHEAD ON YOUR JOURNEY
      </div>

      {/* Surface name */}
      <h2 style={{
        ...disp, fontSize: '28px', fontWeight: 400,
        color: TEXT_INK, margin: '0 0 6px', letterSpacing: '-0.01em',
      }}>
        {toolName}
      </h2>

      {/* Rule */}
      <div style={{
        width: '32px', height: '1px',
        background: GOLD_RULE, margin: '14px 0 20px',
      }} />

      {/* The invitation */}
      <p style={{
        ...body, fontSize: '15.5px', color: TEXT_META,
        lineHeight: 1.7, margin: '0 0 28px',
      }}>
        {reason}
      </p>

      {/* CTA — points to where the journey continues */}
      <button
        onClick={() => navigate(ctaPath)}
        style={{
          ...sc, fontSize: '13px', letterSpacing: '0.14em',
          padding: '12px 24px', borderRadius: '40px',
          background: GOLD, color: '#FFFFFF',
          border: 'none', cursor: 'pointer',
        }}
      >
        {ctaLabel}
      </button>
    </div>
  )
}
