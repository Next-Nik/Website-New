// ─────────────────────────────────────────────────────────────
// CurriculumGatePanel.jsx
//
// Shown inside a Mission Control Panel when the user taps a tile
// whose prerequisite hasn't been met yet. Dim-not-locked: the
// tile always opens, this panel explains where they are and
// points them to the next step.
//
// Props:
//   toolName      string  — name of the tool they tried to open
//   reason        string  — human-readable explanation
//   ctaLabel      string  — button label
//   ctaPath       string  — route to navigate to
// ─────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom'
import {
  GOLD, GOLD_DK, GOLD_RULE,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  FONT_SC, FONT_BODY, FONT_DISPLAY,
} from './tokens'

const sc   = { fontFamily: FONT_SC }
const body = { fontFamily: FONT_BODY }
const disp = { fontFamily: FONT_DISPLAY }

export default function CurriculumGatePanel({
  toolName,
  reason,
  ctaLabel = 'Open NextU →',
  ctaPath  = '/beta/dashboard',
}) {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '32px 24px' }}>
      {/* Eyebrow */}
      <div style={{
        ...sc, fontSize: '10px', letterSpacing: '0.20em',
        color: GOLD_DK, marginBottom: '20px',
      }}>
        NOT UNLOCKED YET
      </div>

      {/* Tool name */}
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

      {/* Reason */}
      <p style={{
        ...body, fontSize: '15.5px', color: TEXT_META,
        lineHeight: 1.7, margin: '0 0 28px',
      }}>
        {reason}
      </p>

      {/* CTA */}
      <button
        onClick={() => navigate(ctaPath)}
        style={{
          ...sc, fontSize: '12px', letterSpacing: '0.14em',
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
