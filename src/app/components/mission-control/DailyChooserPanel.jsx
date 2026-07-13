// ─────────────────────────────────────────────────────────────
// DailyChooserPanel.jsx
//
// The landing view of the Daily panel in Mission Control. Two
// clearly marked tool cards — Horizon State and Horizon Practice —
// each with its today-status. The user chooses which to enter.
//
// This replaces the previous behaviour where the Daily tile opened
// straight into Horizon State and Practice was reduced to a small
// secondary action button. Both tools now stand side by side.
//
// Per The Daily Instrument architecture the two are phases of one
// continuous instrument — but at the Mission Control surface the
// user picks deliberately. No auto-routing, no defaulting.
//
// Props:
//   foundationData — horizon_state_summary row (or null)
//                    { sessions_total, sessions_week, streak_days,
//                      avg_delta, last_session_at }
//   practiceData   — latest horizon_practice_checkins row (or null)
//                    { id, check_date, ... }
//   mapComplete    — boolean — Map + I Am statements done; gates
//                    Horizon Practice
//   onSelectState    — () => void
//   onSelectPractice — () => void  (opens gate view when locked)
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  GOLD, GOLD_DK, GOLD_RULE, GOLD_HOVER,
  BG_CARD,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  FONT_SC, FONT_BODY,
} from './tokens'

function getLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function ToolCard({ name, status, body, meta, locked, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: hover ? GOLD_HOVER : BG_CARD,
        border: `1px solid ${locked ? 'rgba(110,127,92,0.30)' : GOLD_RULE}`,
        borderStyle: locked ? 'dashed' : 'solid',
        borderRadius: 10,
        padding: '20px 22px',
        cursor: 'pointer',
        transition: 'background 0.2s ease',
      }}
    >
      {/* Name + status row */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 10,
      }}>
        <span style={{
          fontFamily: FONT_SC,
          fontSize: 14,
          letterSpacing: '0.16em',
          color: TEXT_INK,
        }}>
          {name}
        </span>
        <span style={{
          fontFamily: FONT_SC,
          fontSize: 13,
          letterSpacing: '0.18em',
          color: GOLD_DK,
          whiteSpace: 'nowrap',
        }}>
          {status}
        </span>
      </div>

      {/* What this tool is */}
      <p style={{
        fontFamily: FONT_BODY,
        fontSize: 13.5,
        lineHeight: 1.6,
        color: TEXT_META,
        margin: 0,
      }}>
        {body}
      </p>

      {/* Footer row — meta on the left, enter affordance right */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 14,
      }}>
        <span style={{
          fontFamily: FONT_SC,
          fontSize: 13,
          letterSpacing: '0.18em',
          color: TEXT_FAINT,
        }}>
          {meta}
        </span>
        <span style={{
          fontFamily: FONT_SC,
          fontSize: 13,
          letterSpacing: '0.18em',
          color: hover ? GOLD : GOLD_DK,
          transition: 'color 0.2s ease',
        }}>
          {locked ? 'SEE WHAT UNLOCKS IT →' : 'ENTER →'}
        </span>
      </div>
    </button>
  )
}

export default function DailyChooserPanel({
  foundationData,
  practiceData,
  mapComplete,
  onSelectState,
  onSelectPractice,
}) {
  const today = getLocalDateStr()

  // ── Horizon State status ──────────────────────────────────
  const stateLoggedToday = !!foundationData?.last_session_at?.startsWith(today)
  const stateStatus = stateLoggedToday ? 'LOGGED TODAY' : 'NOT YET TODAY'
  const streak = foundationData?.streak_days
  const stateMeta = streak
    ? `${streak}-DAY STREAK`
    : foundationData?.sessions_total
      ? `${foundationData.sessions_total} SESSIONS`
      : 'YOUR DAILY FLOOR'

  // ── Horizon Practice status ───────────────────────────────
  const practiceDoneToday = practiceData?.check_date === today
  const practiceStatus = !mapComplete
    ? 'NOT YET UNLOCKED'
    : practiceDoneToday
      ? 'TODAY COMPLETE'
      : 'NOT YET TODAY'
  const practiceMeta = !mapComplete
    ? 'OPENS WITH YOUR I AM STATEMENTS'
    : practiceData?.check_date
      ? `LAST: ${practiceData.check_date}`
      : 'YOUR MORNING SEQUENCE'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
      <ToolCard
        name="HORIZON STATE"
        status={stateStatus}
        body="Land in your body. Before and after — the floor the day runs on."
        meta={stateMeta}
        onClick={onSelectState}
      />
      <ToolCard
        name="HORIZON PRACTICE"
        status={practiceStatus}
        body="The morning sequence. Six beats, voiced from your Horizon Self."
        meta={practiceMeta}
        locked={!mapComplete}
        onClick={onSelectPractice}
      />
    </div>
  )
}
