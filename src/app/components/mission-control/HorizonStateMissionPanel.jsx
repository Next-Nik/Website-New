// ─────────────────────────────────────────────────────────────
// HorizonStateMissionPanel.jsx
//
// The live in-dashboard readout of Horizon State. Wraps the real
// BaselineCard from the source tool (in compact mode) in the same
// header-strip + footer-strip chrome the other four mission panels
// use, so the dashboard reads as one consistent surface.
//
// What renders inside:
//   • BaselineCard (compact) — audio player + before/after sliders
//     + notes + save flow. Identical to what was rendering before
//     the cosmetic pass; this file just adds chrome.
//
// Header strip:
//   • Status eyebrow on the left:
//       "NOT YET TODAY"          → no before, no after
//       "BEFORE LOGGED · AFTER WAITING"
//       "TODAY COMPLETE"         → both done
//   • SAVED indicator on the right (animates briefly when a write
//     completes). Reflects the parent's reload after onAfterComplete.
//
// Footer strip:
//   • Status line on the left
//   • "FULL REPORTS & LOGS →" ghost link on the right
//
// Wiring is preserved from the previous HorizonStateSlider —
// useHorizonStateData hook, writeSummary on completion, reload after.
// No data flow changes.
//
// Props:
//   user        — Supabase auth user
//   onNavigate  — react-router navigate function
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import {
  BaselineCard,
  useHorizonStateData,
  writeSummary as writeHorizonStateSummary,
} from '../../../tools/horizon-state/HorizonState'
import {
  GOLD, GOLD_DK, GOLD_RULE,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  FONT_SC, FONT_BODY,
} from './tokens'

// Inline mirror of the source's getLocalDateStr — couple of lines,
// not worth rippling another export through HorizonState.jsx.
function getLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

export default function HorizonStateMissionPanel({ user, onNavigate }) {
  const {
    audioUrl, audioLoading, audioError, sessions, lifeIaStatement, currentPhase, reload,
  } = useHorizonStateData(user)

  const [savingPulse, setSavingPulse] = useState(false)

  async function handleAfterComplete(afterData, beforeData, updatedSessions, phase) {
    setSavingPulse(true)
    try {
      await writeHorizonStateSummary(user, updatedSessions, afterData, beforeData, phase || currentPhase)
    } finally {
      setTimeout(() => setSavingPulse(false), 250)
      reload()
    }
  }

  // Today's before/after state — same derivation BaselineCard uses.
  const today = getLocalDateStr()
  const { hasBefore, hasAfter } = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions : []
    return {
      hasBefore: list.some(s => s.checkin_stage === 'before' && s.completed_at?.startsWith(today)),
      hasAfter:  list.some(s => s.checkin_stage === 'after'  && s.completed_at?.startsWith(today)),
    }
  }, [sessions, today])

  const statusEyebrow =
    hasBefore && hasAfter ? 'TODAY COMPLETE' :
    hasBefore             ? 'BEFORE LOGGED · AFTER WAITING' :
                            'NOT YET TODAY'

  const statusFooter =
    hasBefore && hasAfter
      ? 'DAILY · ARRIVED AND DEPARTED'
      : 'DAILY · BEFORE AND AFTER'

  return (
    <div style={{ padding: '4px 0' }}>

      {/* Header strip — matches the other panels */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingBottom: 12,
        borderBottom: `1px solid ${GOLD_RULE}`,
      }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 10.5,
          letterSpacing: '0.18em',
          color: GOLD_DK,
        }}>
          {statusEyebrow}
        </div>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: savingPulse ? GOLD : 'transparent',
          transition: 'color 0.25s ease',
        }}>
          SAVED
        </div>
      </div>

      {/* The real BaselineCard — unchanged from the previous wiring */}
      <BaselineCard
        compact
        user={user}
        audioUrl={audioUrl}
        audioLoading={audioLoading}
        audioError={audioError}
        sessions={sessions}
        lifeIaStatement={lifeIaStatement}
        currentPhase={currentPhase}
        onAfterComplete={handleAfterComplete}
      />

      {/* Footer strip — matches the other panels */}
      <div style={{
        marginTop: 22,
        paddingTop: 14,
        borderTop: `1px solid ${GOLD_RULE}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: TEXT_FAINT,
        }}>
          {statusFooter}
        </div>
        <button
          onClick={() => onNavigate('/tools/horizon-state')}
          style={{
            background: 'transparent',
            border: 'none',
            color: GOLD_DK,
            padding: '6px 0',
            fontFamily: FONT_SC,
            fontSize: 10.5,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          FULL REPORTS & LOGS →
        </button>
      </div>
    </div>
  )
}
