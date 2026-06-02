// ─────────────────────────────────────────────────────────────
// HorizonPracticeMissionPanel.jsx
//
// The live in-dashboard readout of Horizon Practice. Replaces the
// marketing stub previously in Mission Control's `activePanel ===
// 'horizon-practice'` Panel.
//
// What it shows (mirrors the Dashboard view of the full tool):
//   • Streak / total check-ins / current skills count
//   • Horizon Self statement (italic)
//   • Map focus domains + I Am statements (when present)
//   • Today's check-in card — celebratory if done, CTA if not
//   • Current "now" skill if set
//   • Active sprint context (if any)
//
// What it does NOT do:
//   • The full T.E.A. daily check-in chat flow — that's a deep
//     interaction that lives at /tools/horizon-practice. Tapping
//     "Begin today's check-in →" routes there and the page auto-
//     routes to its checkin view.
//   • Setup (Horizon Self capture, first skill suggestion) — also
//     a chat flow, page-only.
//
// Data flow:
//   on mount → load horizon_practice_setup (latest)
//            + horizon_practice_checkins (most recent 7 days)
//            + horizon_practice_skills (all)
//            + map_results focusDomains (for context)
//            + active sprint (for context)
//
// Note on the field naming bug: the full tool's Dashboard reads
// setupData.horizonSelf (camelCase) but Supabase returns horizon_self
// (snake_case). We read both defensively so the panel works whether
// the page bug is patched or not.
//
// Props:
//   user        — Supabase auth user
//   onNavigate  — react-router navigate function
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE, GOLD_FAINT,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  BG_CARD,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

const DOMAIN_LABELS = {
  path:        'Path',
  spark:       'Spark',
  body:        'Body',
  finances:    'Finances',
  connection:  'Connection',
  inner_game:  'Inner Game',
  signal:      'Signal',
}

function getLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

// Mirror of full tool's getStreakCount — counts consecutive days
// up to and including today (or, if today not done, up to yesterday).
function getStreakCount(checkins) {
  if (!checkins?.length) return 0
  const dates = [...new Set(checkins.map(c => c.check_date))].sort().reverse()
  let streak = 0
  let cursor = new Date()
  for (const d of dates) {
    const expected = getLocalDateStr(cursor)
    if (d === expected) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else if (streak === 0) {
      // First miss is allowed if today not yet done — try yesterday
      cursor.setDate(cursor.getDate() - 1)
      if (d === getLocalDateStr(cursor)) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else break
    } else break
  }
  return streak
}

export default function HorizonPracticeMissionPanel({ user, onNavigate }) {
  const [loaded,    setLoaded]    = useState(false)
  const [setupData, setSetupData] = useState(null)
  const [checkins,  setCheckins]  = useState([])
  const [skills,    setSkills]    = useState([])
  const [mapFocus,  setMapFocus]  = useState(null)
  const [activeSprintDomains, setActiveSprintDomains] = useState(null)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    if (!user?.id) {
      setLoaded(true)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const [setupRes, checkinsRes, skillsRes, mapRes, profileRes, sprintRes] = await Promise.all([
          supabase
            .from('horizon_practice_setup')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('horizon_practice_checkins')
            .select('*')
            .eq('user_id', user.id)
            .order('check_date', { ascending: false })
            .limit(60),  // generous window for streak calc
          supabase
            .from('horizon_practice_skills')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          // For Map focus domains context. The page does its own merge
          // of map_results.session.domainData into a focusDomains array
          // (computed from horizonScore signal). We do a slim version.
          supabase
            .from('map_results')
            .select('session, horizon_goal_user, life_ia_statement')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('horizon_profile')
            .select('domain, ia_statement')
            .eq('user_id', user.id),
          supabase
            .from('target_sprint_sessions')
            .select('domains, status')
            .eq('user_id', user.id)
            .in('status', ['active', 'started'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

        if (cancelled) return

        if (setupRes.data)    setSetupData(setupRes.data)
        if (checkinsRes.data) setCheckins(checkinsRes.data)
        if (skillsRes.data)   setSkills(skillsRes.data)

        // Slim Map focus extraction — domains where horizonScore is
        // set indicate the user has expressed something to tend.
        if (mapRes.data?.session?.domainData) {
          const dd = mapRes.data.session.domainData
          const focusDomains = Object.entries(dd)
            .filter(([_, d]) => d?.horizonScore != null)
            .map(([id]) => id)
          // Build ia_statement lookup from horizon_profile rows
          const iaByDomain = {}
          for (const row of (profileRes?.data || [])) {
            if (row.domain && row.ia_statement) iaByDomain[row.domain] = row.ia_statement
          }
          const domainsForUI = {}
          for (const [id, d] of Object.entries(dd)) {
            domainsForUI[id] = {
              iaStatement: iaByDomain[id] || null,
              currentScore: d?.currentScore ?? null,
              horizonScore: d?.horizonScore ?? null,
            }
          }
          setMapFocus({
            focusDomains,
            domains: domainsForUI,
            lifeHorizon: mapRes.data.horizon_goal_user || null,
            lifeIaStatement: mapRes.data.life_ia_statement || null,
          })
        }

        if (sprintRes.data?.domains) {
          setActiveSprintDomains(sprintRes.data.domains)
        }
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  const today = getLocalDateStr()
  const checkedInToday = useMemo(
    () => checkins.some(c => c.check_date === today),
    [checkins, today]
  )
  const streak = useMemo(() => getStreakCount(checkins), [checkins])
  const nowSkill = useMemo(() => skills.find(s => s.status === 'now'), [skills])
  const horizonSelf = setupData?.horizonSelf || setupData?.horizon_self || null

  // ─── Render ────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ padding: '8px 0' }}>
        <p style={{
          fontFamily: FONT_BODY, fontSize: 15, color: TEXT_META, lineHeight: 1.6,
          marginBottom: 16,
        }}>
          Sign in to see your practice. Daily T.E.A. check-ins, anchored in your I Am.
        </p>
        <button onClick={() => onNavigate('/tools/horizon-practice')} style={primaryBtnStyle}>
          OPEN PRACTICE →
        </button>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_FAINT }}>
          Loading your practice…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_META, marginBottom: 14 }}>
          Couldn't load your practice data. You can still open the full page.
        </p>
        <button onClick={() => onNavigate('/tools/horizon-practice')} style={primaryBtnStyle}>
          OPEN PRACTICE →
        </button>
      </div>
    )
  }

  // No setup yet — show body copy only; panel action buttons handle navigation
  if (!horizonSelf) {
    return (
      <div style={{ padding: '4px 0' }}>
        <div style={{
          background: BG_CARD,
          border: `1px solid ${GOLD_RULE}`,
          borderLeft: `3px solid ${GOLD}`,
          borderRadius: 14,
          padding: '20px 22px',
        }}>
          <p style={{
            fontFamily: FONT_BODY,
            fontSize: 15,
            color: TEXT_INK,
            lineHeight: 1.65,
            margin: 0,
          }}>
            We all re-create our normal everywhere we go in the world. Set a new normal.
          </p>
        </div>
      </div>
    )
  }

  // ─── Active practice — main view ────────────────────────────
  return (
    <div style={{ padding: '4px 0' }}>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        marginBottom: 22,
      }}>
        {[
          { label: 'DAY STREAK',    value: streak || '—' },
          { label: 'CHECK-INS',     value: checkins.length },
          { label: 'ACTIVE SKILLS', value: skills.filter(s => s.status === 'now').length },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '14px 12px',
            background: BG_CARD,
            border: `1px solid ${GOLD_RULE}`,
            borderRadius: 14,
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 28,
              fontWeight: 300,
              color: GOLD_DK,
              lineHeight: 1,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontFamily: FONT_SC,
              fontSize: 9.5,
              letterSpacing: '0.18em',
              color: TEXT_FAINT,
              marginTop: 6,
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Horizon Self */}
      <div style={{
        background: BG_CARD,
        border: `1px solid ${GOLD_RULE}`,
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 16,
      }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: TEXT_FAINT,
          marginBottom: 8,
        }}>
          YOUR HORIZON SELF
        </div>
        <div style={{
          fontFamily: FONT_BODY,
          fontSize: 16,
          fontStyle: 'italic',
          color: GOLD_DK,
          lineHeight: 1.65,
        }}>
          "{horizonSelf}"
        </div>
      </div>

      {/* Map focus context */}
      {mapFocus?.focusDomains?.length > 0 && (
        <div style={{
          background: 'rgba(200, 146, 42, 0.04)',
          border: `1px solid ${GOLD_RULE}`,
          borderRadius: 14,
          padding: '16px 18px',
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: FONT_SC,
            fontSize: 9.5,
            letterSpacing: '0.18em',
            color: TEXT_FAINT,
            marginBottom: 6,
          }}>
            YOUR MAP · FOCUS AREAS
          </div>
          <div style={{
            fontFamily: FONT_SC,
            fontSize: 13,
            letterSpacing: '0.10em',
            color: GOLD_DK,
          }}>
            {mapFocus.focusDomains.map(id => DOMAIN_LABELS[id] || id).join(' · ')}
          </div>
          {mapFocus.lifeHorizon && (
            <div style={{
              fontFamily: FONT_BODY,
              fontSize: 13.5,
              color: TEXT_META,
              marginTop: 8,
              lineHeight: 1.6,
              fontStyle: 'italic',
            }}>
              "{mapFocus.lifeHorizon}"
            </div>
          )}
          {mapFocus.focusDomains.some(id => mapFocus.domains?.[id]?.iaStatement) && (
            <div style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${GOLD_RULE}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              {mapFocus.focusDomains
                .filter(id => mapFocus.domains?.[id]?.iaStatement)
                .map(id => (
                  <div key={id} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{
                      fontFamily: FONT_SC,
                      fontSize: 9,
                      letterSpacing: '0.16em',
                      color: TEXT_FAINT,
                      textTransform: 'uppercase',
                      flexShrink: 0,
                      width: 78,
                    }}>
                      {DOMAIN_LABELS[id] || id}
                    </span>
                    <span style={{
                      fontFamily: FONT_BODY,
                      fontSize: 13,
                      color: TEXT_META,
                      fontStyle: 'italic',
                      lineHeight: 1.55,
                    }}>
                      {mapFocus.domains[id].iaStatement}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Today's check-in card */}
      {checkedInToday ? (
        <div style={{
          background: GOLD,
          border: `1px solid ${GOLD}`,
          borderRadius: 14,
          padding: '18px 20px',
          marginBottom: 14,
          color: '#0F1523',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 26 }}>✓</span>
              <div>
                <div style={{
                  fontFamily: FONT_BODY,
                  fontSize: 17,
                  fontWeight: 400,
                  color: '#0F1523',
                  lineHeight: 1.4,
                }}>
                  Check-in complete for today.
                </div>
                <div style={{
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  color: 'rgba(15,21,35,0.72)',
                  marginTop: 4,
                  lineHeight: 1.5,
                }}>
                  Come back tomorrow. The practice compounds.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onNavigate('/tools/horizon-practice')}
          style={{
            display: 'block',
            width: '100%',
            background: GOLD,
            border: `1px solid ${GOLD}`,
            borderRadius: 14,
            padding: '18px 20px',
            marginBottom: 14,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <div style={{
                fontFamily: FONT_SC,
                fontSize: 11,
                letterSpacing: '0.18em',
                color: 'rgba(15,21,35,0.7)',
                marginBottom: 4,
              }}>
                TODAY
              </div>
              <div style={{
                fontFamily: FONT_BODY,
                fontSize: 18,
                fontWeight: 400,
                color: '#0F1523',
                lineHeight: 1.4,
              }}>
                Your daily T.E.A. check-in is waiting.
              </div>
              {nowSkill && (
                <div style={{
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  color: 'rgba(15,21,35,0.72)',
                  marginTop: 6,
                  lineHeight: 1.5,
                }}>
                  Current focus: {nowSkill.title}
                </div>
              )}
            </div>
            <span style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 28,
              color: '#0F1523',
              flexShrink: 0,
            }}>→</span>
          </div>
        </button>
      )}

      {/* Active sprint context */}
      {activeSprintDomains?.length > 0 && (
        <div style={{
          background: BG_CARD,
          border: `1px solid ${GOLD_RULE}`,
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: FONT_SC,
            fontSize: 9.5,
            letterSpacing: '0.18em',
            color: TEXT_FAINT,
            marginBottom: 6,
          }}>
            ACTIVE TARGET SPRINT
          </div>
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            color: TEXT_INK,
            lineHeight: 1.5,
          }}>
            Your sprint actions are the <strong style={{ color: GOLD_DK }}>A</strong> in your T.E.A. practice.
          </div>
          <div style={{
            fontFamily: FONT_SC,
            fontSize: 11,
            letterSpacing: '0.10em',
            color: GOLD_DK,
            marginTop: 6,
          }}>
            {activeSprintDomains.map(id => DOMAIN_LABELS[id] || id).join(' · ')}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 14,
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
          DAILY · ANCHORED IN YOUR I AM
        </div>
        <button onClick={() => onNavigate('/tools/horizon-practice')} style={ghostBtnStyle}>
          FULL PRACTICE →
        </button>
      </div>
    </div>
  )
}

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
