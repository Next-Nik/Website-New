// ─────────────────────────────────────────────────────────────
// TargetSprintMissionPanel.jsx
//
// The live in-dashboard readout of Target Stretch. Replaces the
// previous TargetSprintSlider with a fuller view that includes:
//
//   • Sprint switcher — when 1–3 active sprints (slot 0/1/2),
//     a tab strip lets the user pick which one to view.
//   • Week strip — week N of 13 with 13-segment progress bar.
//   • The Aim — italic targetGoal per domain (preserved).
//   • Drift signal — gentle nudge if it's been >3 days.
//   • TODAY'S MOVES — the AccomplishmentTally from the full tool,
//     so goals/milestones/tasks can be ticked off inline. Auto-
//     saves to target_sprint_sessions on debounce, same pattern
//     as the page.
//   • Today's Bearing — single-line journal (preserved from the
//     old slider, localStorage scoped per user/sprint/day).
//
// The page at /tools/target-sprint remains the place for sprint
// setup, full chat-driven goal-setting, end-of-week reflection,
// and the SprintWheelMini overview.
//
// Save flow (mirrors the page exactly):
//   on tick → setDomainData (local) → debounced 1.5s upsert
//   to target_sprint_sessions, with progressive column fallback
//   (ext1 with domain_data, falling back to core if columns
//   reject — same as the page).
//
// Component reuse:
//   AccomplishmentTally and DOMAINS imported from TargetSprint.jsx.
//   No duplicated checkbox / progress logic.
//
// Props:
//   user        — Supabase auth user
//   sprintData  — array of active sprint sessions from useMissionControlData
//   onNavigate  — react-router navigate function
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  DOMAINS as SPRINT_DOMAINS,
  AccomplishmentTally,
} from '../../../tools/target-sprint/TargetSprint'
import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE, GOLD_FAINT,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  BG_CARD,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

// Domain key → human label. Mirrors SELF_LABELS in MissionControl.
const DOMAIN_LABELS = {
  path:        'PATH',
  spark:       'SPARK',
  body:        'BODY',
  finances:    'FINANCES',
  connection:  'CONNECTION',
  inner_game:  'INNER GAME',
  signal:      'SIGNAL',
}

// Today's local date string (YYYY-MM-DD).
function getLocalDateStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// 90-day sprint = 13 weeks. Week 1 starts on creation. Capped at 13.
function computeWeek(createdAt) {
  if (!createdAt) return null
  const start = new Date(createdAt)
  const now = new Date()
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  const week = Math.floor(days / 7) + 1
  return Math.max(1, Math.min(13, week))
}

function computeDaysSince(createdAt) {
  if (!createdAt) return null
  const start = new Date(createdAt)
  const now = new Date()
  return Math.floor((now - start) / (1000 * 60 * 60 * 24))
}

// ─── ENTRY ───────────────────────────────────────────────────

export default function TargetSprintMissionPanel({ user, sprintData, onNavigate }) {
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
          style={primaryBtnStyle}
        >
          BEGIN A SPRINT →
        </button>
      </div>
    )
  }

  // Pick which sprint to display. Default to first (most recent
  // by sort order from the data hook).
  const [activeSprintIdx, setActiveSprintIdx] = useState(0)
  const safeIdx = Math.min(activeSprintIdx, sprintData.length - 1)
  const sprint = sprintData[safeIdx]

  return (
    <SprintView
      key={sprint.id}
      user={user}
      sprint={sprint}
      sprintIdx={safeIdx}
      sprintCount={sprintData.length}
      onSwitchSprint={setActiveSprintIdx}
      onNavigate={onNavigate}
    />
  )
}

// ─── Active sprint view ─────────────────────────────────────
function SprintView({ user, sprint, sprintIdx, sprintCount, onSwitchSprint, onNavigate }) {
  const week = computeWeek(sprint.created_at)
  const daysSince = computeDaysSince(sprint.created_at)
  const targetDate = sprint.target_date
    ? new Date(sprint.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  const sprintDomainKeys = Array.isArray(sprint.domains) ? sprint.domains : []
  const sprintDomains = useMemo(
    () => sprintDomainKeys
      .map(key => SPRINT_DOMAINS.find(d => d.id === key))
      .filter(Boolean),
    [sprintDomainKeys]
  )

  // Local copy of domain_data — auto-saved to Supabase on debounce.
  const [domainData, setDomainData] = useState(sprint.domain_data || {})
  const [savingPulse, setSavingPulse] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const isFirstRender = useRef(true)

  // Cancel flow
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  async function handleCancelConfirm() {
    if (!user?.id || !sprint.id) return
    setCancelling(true)
    setCancelError(null)
    try {
      const { error } = await supabase
        .from('target_sprint_sessions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', sprint.id)
      if (error) throw error
      onNavigate('/tools/target-sprint')
    } catch (err) {
      setCancelError('Something went wrong. Please try again.')
      setCancelling(false)
    }
  }

  // If sprintData prop changes externally (e.g. parent reloads),
  // reset local state. We key on sprint.id at the parent so this
  // mostly handles in-place updates of the same row.
  useEffect(() => {
    setDomainData(sprint.domain_data || {})
    isFirstRender.current = true
  }, [sprint.id])

  // Debounced auto-save on domainData change (1.5s, mirrors the
  // page's behaviour exactly).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!user?.id || !sprint.id) return
    const timer = setTimeout(async () => {
      try {
        setSavingPulse(true)
        const now = new Date().toISOString()
        // Try the extended payload first; if it 400s on column
        // mismatch, fall back to a core update. Same progressive
        // pattern the page uses.
        const ext = {
          domain_data: domainData,
          updated_at: now,
        }
        let { error } = await supabase
          .from('target_sprint_sessions')
          .update(ext)
          .eq('id', sprint.id)
        if (error) {
          // Strip domain_data and retry (in case the column truly
          // doesn't exist on this schema). Logs but doesn't surface.
          ({ error } = await supabase
            .from('target_sprint_sessions')
            .update({ updated_at: now })
            .eq('id', sprint.id))
          if (error) throw error
        }
        setSaveError(null)
      } catch (err) {
        setSaveError(err)
      } finally {
        setTimeout(() => setSavingPulse(false), 250)
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [domainData, user?.id, sprint.id])

  function handleCheck(domainId, type, milestoneIdx, taskIdx, checked) {
    setDomainData(prev => {
      const dd = { ...(prev[domainId] || {}) }
      if (type === 'goal')      dd.goalChecked      = checked
      if (type === 'milestone') dd.milestoneChecked = { ...(dd.milestoneChecked || {}), [milestoneIdx]: checked }
      if (type === 'task')      dd.taskChecked      = { ...(dd.taskChecked || {}), [taskIdx]: checked }
      return { ...prev, [domainId]: dd }
    })
  }

  const showDrift = daysSince != null && daysSince > 3

  // Has any tickable content? Goals/milestones/tasks present?
  const hasTickableWork = useMemo(() => {
    return sprintDomains.some(d => {
      const dd = domainData[d.id] || {}
      return dd.targetGoal || (dd.tasks?.length > 0) || (dd.milestones?.length > 0)
    })
  }, [sprintDomains, domainData])

  return (
    <div style={{ padding: '4px 0' }}>

      {/* Multi-sprint switcher (only when >1 active) */}
      {sprintCount > 1 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: `1px solid ${GOLD_RULE}`,
        }}>
          <div style={{
            fontFamily: FONT_SC,
            fontSize: '10px',
            letterSpacing: '0.18em',
            color: TEXT_FAINT,
            alignSelf: 'center',
            marginRight: '4px',
          }}>
            ACTIVE
          </div>
          {Array.from({ length: sprintCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => onSwitchSprint(i)}
              style={{
                background: i === sprintIdx ? GOLD_FAINT : 'transparent',
                border: `1px solid ${i === sprintIdx ? GOLD : GOLD_RULE}`,
                color: i === sprintIdx ? GOLD_DK : TEXT_META,
                padding: '4px 10px',
                fontFamily: FONT_SC,
                fontSize: '10px',
                letterSpacing: '0.16em',
                cursor: 'pointer',
                borderRadius: 0,
              }}
            >
              SPRINT {i + 1}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{
            fontFamily: FONT_SC,
            fontSize: '9.5px',
            letterSpacing: '0.18em',
            color: savingPulse ? GOLD : 'transparent',
            transition: 'color 0.25s ease',
            alignSelf: 'center',
          }}>
            SAVED
          </div>
        </div>
      )}

      {/* Week strip */}
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
          <div style={{
            display: 'flex',
            gap: 14,
            alignItems: 'baseline',
          }}>
            {sprintCount === 1 && (
              <div style={{
                fontFamily: FONT_SC,
                fontSize: '9.5px',
                letterSpacing: '0.18em',
                color: savingPulse ? GOLD : 'transparent',
                transition: 'color 0.25s ease',
              }}>
                SAVED
              </div>
            )}
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
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(13, 1fr)',
          gap: '2px',
          height: '4px',
        }}>
          {Array.from({ length: 13 }, (_, i) => (
            <div key={i} style={{
              background: i < week ? GOLD : GOLD_FAINT,
            }} />
          ))}
        </div>
      </div>

      {/* THE AIM — italic per-domain target goals (only when there are no tickable items;
          when AccomplishmentTally is rendered below it already includes the goal text). */}
      {!hasTickableWork && (
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
          {sprintDomains.length === 0 ? (
            <div style={{
              fontFamily: FONT_BODY,
              fontSize: '14px',
              color: TEXT_META,
              fontStyle: 'italic',
            }}>
              No target goals set yet for this sprint. Open the full sprint view to set them.
            </div>
          ) : (
            sprintDomains.map(d => {
              const dd = domainData[d.id] || {}
              const goal = dd.targetGoal
              return (
                <div key={d.id} style={{
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
                    {DOMAIN_LABELS[d.id] || d.label.toUpperCase()}
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
          <button
            onClick={() => onNavigate('/tools/target-sprint')}
            style={{ ...ghostBtnStyle, marginTop: 6 }}
          >
            SET TARGETS IN FULL VIEW →
          </button>
        </div>
      )}

      {/* Drift signal */}
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
          {daysSince} days since this sprint started. A bearing check today
          keeps you oriented.
        </div>
      )}

      {/* Today's moves — accomplishment tally inline */}
      {hasTickableWork && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontFamily: FONT_SC,
            fontSize: '11px',
            letterSpacing: '0.14em',
            color: TEXT_META,
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            Today's Moves
          </div>
          <AccomplishmentTally
            domains={sprintDomains}
            domainData={domainData}
            onCheck={handleCheck}
          />
          {saveError && (
            <div style={{
              marginTop: 10,
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: TEXT_META,
              fontStyle: 'italic',
            }}>
              Couldn't save remotely just now — your tick is held locally and will retry.
            </div>
          )}
        </div>
      )}

      {/* Bearing log */}
      <BearingLog user={user} sprintId={sprint.id} />

      {/* Footer */}
      <div style={{
        marginTop: 22,
        paddingTop: 14,
        borderTop: `1px solid ${GOLD_RULE}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}>
        <button
          onClick={() => setShowCancelConfirm(true)}
          style={cancelLinkStyle}
        >
          Cancel stretch
        </button>
        <button onClick={() => onNavigate('/tools/target-sprint')} style={ghostBtnStyle}>
          FULL VIEW →
        </button>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,21,35,0.72)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
        }}>
          <div style={{
            background: '#FAFAF7',
            border: `1px solid ${GOLD_RULE}`,
            borderRadius: '4px',
            padding: '32px 28px',
            maxWidth: '360px',
            width: '100%',
            boxShadow: '0 24px 60px rgba(15,21,35,0.30)',
          }}>
            <div style={{
              fontFamily: FONT_SC,
              fontSize: '11px',
              letterSpacing: '0.22em',
              color: GOLD_DK,
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}>
              Cancel This Stretch?
            </div>
            <div style={{
              fontFamily: FONT_BODY,
              fontSize: '15px',
              color: TEXT_INK,
              lineHeight: 1.6,
              marginBottom: '24px',
            }}>
              This will end your current stretch. Your progress notes are kept.
              Start a new one whenever you're ready.
            </div>
            {cancelError && (
              <div style={{
                fontFamily: FONT_BODY,
                fontSize: '13px',
                color: '#C85050',
                marginBottom: '16px',
                fontStyle: 'italic',
              }}>
                {cancelError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                style={{
                  ...primaryBtnStyle,
                  flex: 1,
                  opacity: cancelling ? 0.6 : 1,
                  borderColor: '#C85050',
                  color: '#C85050',
                }}
              >
                {cancelling ? 'CANCELLING…' : 'END STRETCH'}
              </button>
              <button
                onClick={() => { setShowCancelConfirm(false); setCancelError(null) }}
                disabled={cancelling}
                style={{ ...ghostBtnStyle, padding: '12px 16px', border: `1px solid ${GOLD_RULE}` }}
              >
                KEEP GOING
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── BearingLog (preserved from previous slider) ────────────
function BearingLog({ user, sprintId }) {
  const today = getLocalDateStr()
  const storageKey = user?.id && sprintId
    ? `ts_bearing_${user.id}_${sprintId}_${today}`
    : null

  const [text, setText] = useState('')
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        setText(parsed.text || '')
        setSavedAt(parsed.savedAt || null)
      }
    } catch {}
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return
    if (!text) return
    const timer = setTimeout(() => {
      try {
        const now = new Date().toISOString()
        window.localStorage.setItem(storageKey, JSON.stringify({
          text, savedAt: now, __local__: true, sprint_id: sprintId, date: today,
        }))
        setSavedAt(now)
      } catch {}
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

// ─── Inline button styles ───────────────────────────────────

const primaryBtnStyle = {
  background: 'transparent',
  border: `1px solid ${GOLD}`,
  color: GOLD_DK,
  padding: '12px 20px',
  fontFamily: FONT_SC,
  fontSize: 12,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  borderRadius: 0,
}

const ghostBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: GOLD_DK,
  padding: '6px 0',
  fontFamily: FONT_SC,
  fontSize: 10.5,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

const cancelLinkStyle = {
  background: 'transparent',
  border: 'none',
  color: TEXT_FAINT,
  padding: '6px 0',
  fontFamily: FONT_BODY,
  fontSize: 12,
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
}
