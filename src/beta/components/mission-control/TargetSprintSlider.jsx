// ─────────────────────────────────────────────────────────────
// TargetSprintSlider — daily bearing check in the panel.
//
// What this surfaces (per the bullseye logo):
//   • THE AIM — for each domain in the active sprint, the
//     targetGoal (italic) under the domain name.
//   • WHERE YOU ARE — week N of 13 with a small progress strip.
//   • TODAY'S BEARING — single prompt, single textarea.
//     "What moves you toward the target today?"
//   • DRIFT SIGNAL — if last touch >3 days ago, surface gently.
//
// What this does NOT surface (page-only):
//   • Full task list, milestones, per-domain panels
//   • AI chat, sprint setup, end-of-week reflection prompts
//
// Save path:
//   The bearing log writes to localStorage today, scoped per-user
//   per-day. WIRE: when target_sprint_events table ships, migrate
//   to Supabase. The localStorage key carries a `__local__: true`
//   flag so a future migration job can pick it up.
//
// No active sprint:
//   Renders a single "Begin a sprint →" block. The page handles
//   setup; the slider doesn't.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import {
  GOLD, GOLD_DK, GOLD_RULE, GOLD_FAINT,
  TEXT_INK, TEXT_META,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

// Domain key → human label. Mirrors SELF_LABELS in BetaMissionControl.
const DOMAIN_LABELS = {
  path:        'PATH',
  spark:       'SPARK',
  body:        'BODY',
  finances:    'FINANCES',
  connection:  'CONNECTION',
  inner_game:  'INNER GAME',
  signal:      'SIGNAL',
}

// Today's local date string (YYYY-MM-DD) — matches Horizon State's
// pattern for per-day keys.
function getLocalDateStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Compute current week (1–13) from sprint start date.
// 90-day sprint = 13 weeks. Week 1 starts on the day the sprint
// was created. Capped at 13 even if user is late.
function computeWeek(createdAt) {
  if (!createdAt) return null
  const start = new Date(createdAt)
  const now = new Date()
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  const week = Math.floor(days / 7) + 1
  return Math.max(1, Math.min(13, week))
}

// Drift signal — days since the sprint was last touched.
// Today we only have created_at on the session. WIRE: when the
// events table ships, this should read MAX(events.created_at).
function computeDaysSince(createdAt) {
  if (!createdAt) return null
  const start = new Date(createdAt)
  const now = new Date()
  return Math.floor((now - start) / (1000 * 60 * 60 * 24))
}


export default function TargetSprintSlider({ user, sprintData, onNavigate }) {
  // Empty state — no active sprint.
  if (!Array.isArray(sprintData) || sprintData.length === 0) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{
          fontFamily: FONT_BODY,
          fontSize: '15px',
          color: TEXT_INK,
          lineHeight: 1.6,
          marginBottom: '20px',
        }}>
          No active sprint yet. A sprint is a 90-day commitment to a
          specific aim — what you're moving toward, where you're
          oriented, the time you're giving it.
        </div>
        <button
          onClick={() => onNavigate('/tools/target-sprint')}
          style={{
            background: 'transparent',
            border: `1px solid ${GOLD}`,
            color: GOLD_DK,
            padding: '12px 20px',
            fontFamily: FONT_SC,
            fontSize: '12px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderRadius: 0,
          }}
        >
          BEGIN A SPRINT →
        </button>
      </div>
    )
  }

  // For now: the slider focuses on the most-recent sprint. Multiple
  // active sprints (slot 0/1/2) is a real case but rare. Showing
  // all three at once in the slider crowds it. The page is where
  // the multi-sprint view lives.
  const sprint = sprintData[0]
  const week = computeWeek(sprint.created_at)
  const daysSince = computeDaysSince(sprint.created_at)
  const targetDate = sprint.target_date
    ? new Date(sprint.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  // Domains and their target goals.
  const domains = Array.isArray(sprint.domains) ? sprint.domains : []
  const dd = sprint.domain_data || {}

  // Drift threshold — if it's been more than 3 days since the
  // sprint was created and we have no other activity signal,
  // surface a gentle nudge. WIRE: replace with last-event date
  // when events table ships.
  const showDrift = daysSince != null && daysSince > 3

  return (
    <div style={{ padding: '4px 0' }}>
      {/* WEEK STRIP */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '8px',
        }}>
          <div style={{
            fontFamily: FONT_SC,
            fontSize: '11px',
            letterSpacing: '0.14em',
            color: TEXT_META,
            textTransform: 'uppercase',
          }}>
            Week {week} of 13
          </div>
          {targetDate && (
            <div style={{
              fontFamily: FONT_SC,
              fontSize: '11px',
              letterSpacing: '0.12em',
              color: TEXT_META,
            }}>
              TARGET · {targetDate}
            </div>
          )}
        </div>
        {/* 13-segment progress strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(13, 1fr)',
          gap: '2px',
          height: '4px',
        }}>
          {Array.from({ length: 13 }, (_, i) => (
            <div key={i} style={{
              background: i < week ? GOLD : GOLD_FAINT,
              borderRadius: 0,
            }} />
          ))}
        </div>
      </div>

      {/* THE AIM — domain target goals */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: '11px',
          letterSpacing: '0.14em',
          color: TEXT_META,
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          The Aim
        </div>
        {domains.length === 0 ? (
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: '14px',
            color: TEXT_META,
            fontStyle: 'italic',
          }}>
            No target goals set yet for this sprint.
          </div>
        ) : (
          domains.map(domainKey => {
            const domain = dd[domainKey] || {}
            const goal = domain.targetGoal
            const label = DOMAIN_LABELS[domainKey] || domainKey.toUpperCase()
            return (
              <div key={domainKey} style={{
                marginBottom: '14px',
                paddingLeft: '12px',
                borderLeft: `2px solid ${GOLD_RULE}`,
              }}>
                <div style={{
                  fontFamily: FONT_SC,
                  fontSize: '10px',
                  letterSpacing: '0.16em',
                  color: GOLD_DK,
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}>
                  {label}
                </div>
                {goal ? (
                  <div style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: '17px',
                    fontStyle: 'italic',
                    color: TEXT_INK,
                    lineHeight: 1.4,
                  }}>
                    {goal}
                  </div>
                ) : (
                  <div style={{
                    fontFamily: FONT_BODY,
                    fontSize: '13px',
                    color: TEXT_META,
                    fontStyle: 'italic',
                  }}>
                    No target goal yet.
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* DRIFT SIGNAL — only if relevant */}
      {showDrift && (
        <div style={{
          padding: '12px 14px',
          background: GOLD_FAINT,
          borderLeft: `3px solid ${GOLD}`,
          marginBottom: '20px',
          fontFamily: FONT_BODY,
          fontSize: '13px',
          color: TEXT_INK,
          lineHeight: 1.5,
        }}>
          {daysSince} days since this sprint started. A bearing check
          today keeps you oriented.
        </div>
      )}

      {/* TODAY'S BEARING — prompt + textarea */}
      <BearingLog user={user} sprintId={sprint.id} />
    </div>
  )
}


// ─── BearingLog ───────────────────────────────────────────────
// Single-line journal for the daily bearing check. Saves to
// localStorage today, scoped per user + per sprint + per day.
// WIRE: target_sprint_events table → real persistence.

function BearingLog({ user, sprintId }) {
  const today = getLocalDateStr()
  const storageKey = user?.id && sprintId
    ? `ts_bearing_${user.id}_${sprintId}_${today}`
    : null

  const [text, setText] = useState('')
  const [savedAt, setSavedAt] = useState(null)

  // Load existing entry for today on mount.
  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        setText(parsed.text || '')
        setSavedAt(parsed.savedAt || null)
      }
    } catch (e) {
      // localStorage unavailable or corrupted entry — start fresh.
      console.warn('BearingLog load failed:', e)
    }
  }, [storageKey])

  // Save on debounce — 800ms after last keystroke.
  useEffect(() => {
    if (!storageKey) return
    if (!text) return
    const timer = setTimeout(() => {
      try {
        const now = new Date().toISOString()
        window.localStorage.setItem(storageKey, JSON.stringify({
          text,
          savedAt: now,
          __local__: true,  // flag for future migration job
          sprint_id: sprintId,
          date: today,
        }))
        setSavedAt(now)
      } catch (e) {
        console.warn('BearingLog save failed:', e)
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [text, storageKey, sprintId, today])

  return (
    <div>
      <div style={{
        fontFamily: FONT_SC,
        fontSize: '11px',
        letterSpacing: '0.14em',
        color: TEXT_META,
        textTransform: 'uppercase',
        marginBottom: '8px',
      }}>
        Today's Bearing
      </div>
      <div style={{
        fontFamily: FONT_DISPLAY,
        fontSize: '17px',
        fontStyle: 'italic',
        color: TEXT_INK,
        marginBottom: '10px',
        lineHeight: 1.4,
      }}>
        What moves you toward the target today?
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="A line about today's move."
        rows={2}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontFamily: FONT_BODY,
          fontSize: '14px',
          color: TEXT_INK,
          background: 'transparent',
          border: `1px solid ${GOLD_RULE}`,
          borderRadius: 0,
          resize: 'vertical',
          minHeight: '60px',
          outline: 'none',
          lineHeight: 1.5,
        }}
        onFocus={e => { e.target.style.borderColor = GOLD }}
        onBlur={e => { e.target.style.borderColor = GOLD_RULE }}
      />
      {savedAt && (
        <div style={{
          fontFamily: FONT_SC,
          fontSize: '10px',
          letterSpacing: '0.10em',
          color: TEXT_META,
          marginTop: '6px',
          textTransform: 'uppercase',
        }}>
          Saved locally
        </div>
      )}
    </div>
  )
}
