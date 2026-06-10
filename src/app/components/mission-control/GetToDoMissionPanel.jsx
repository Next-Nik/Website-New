// ─────────────────────────────────────────────────────────────
// GetToDoMissionPanel.jsx
//
// The "Get To Do" Mission Control panel.
// Two sections:
//   1. Sprint items — milestones + tasks from the active
//      target_sprint_session, grouped by domain.
//   2. Calendar — iCal embed (same pattern as Horizon Practice
//      CalendarPlanBeat). View-only; no threshold selection here.
//
// Empty state: if no active sprint, points the user to NextU /
// Target Stretch to set one up.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../hooks/useSupabase'
import {
  GOLD, GOLD_DK, GOLD_RULE,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  FONT_SC, FONT_BODY, FONT_DISPLAY,
} from './tokens'

const sc   = { fontFamily: FONT_SC }
const body = { fontFamily: FONT_BODY }
const disp = { fontFamily: FONT_DISPLAY }

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

// ─── Sprint items section ─────────────────────────────────────

function SprintItems({ sprintData }) {
  const [checked, setChecked] = useState({})

  if (!sprintData || sprintData.length === 0) {
    return (
      <EmptyState
        eyebrow="NO ACTIVE STRETCH"
        message="Set a Target Stretch to see your get-to-do items here."
        linkLabel="Open Target Stretch →"
        linkTo="/tools/target-sprint"
      />
    )
  }

  const sprint   = sprintData[0]
  const domains  = sprint.domains || []
  const domData  = sprint.domain_data || {}

  // Flatten all tasks across selected domains
  const allItems = []
  for (const domId of domains) {
    const dd = domData[domId] || {}
    const milestones = dd.milestones || []
    const tasks      = dd.tasks      || []

    if (milestones.length === 0 && tasks.length === 0) continue

    allItems.push({ type: 'domain_header', domId })

    milestones.forEach((m, mi) => {
      allItems.push({ type: 'milestone', domId, mi, text: m.text || m })
      tasks
        .filter(t => t.milestone === mi)
        .forEach((t, ti) => {
          allItems.push({ type: 'task', domId, mi, ti: tasks.indexOf(t), text: t.text || t })
        })
    })
    // Orphan tasks (no milestone link)
    tasks
      .filter(t => t.milestone == null)
      .forEach((t, ti) => {
        allItems.push({ type: 'task', domId, mi: null, ti: tasks.indexOf(t), text: t.text || t })
      })
  }

  if (allItems.filter(i => i.type !== 'domain_header').length === 0) {
    return (
      <EmptyState
        eyebrow="STRETCH SET · NO ITEMS YET"
        message="Add milestones and tasks inside Target Stretch to see them here."
        linkLabel="Open Target Stretch →"
        linkTo="/tools/target-sprint"
      />
    )
  }

  function toggleKey(key) {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div>
      <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em',
        color: GOLD_DK, marginBottom: '16px' }}>
        YOUR STRETCH
      </div>
      {allItems.map((item, idx) => {
        if (item.type === 'domain_header') {
          return (
            <div key={`dh-${item.domId}`} style={{
              ...sc, fontSize: '10px', letterSpacing: '0.16em',
              color: TEXT_META, textTransform: 'uppercase',
              marginTop: idx > 0 ? '20px' : '0', marginBottom: '8px',
            }}>
              {DOMAIN_LABELS[item.domId] || item.domId}
            </div>
          )
        }

        const isMilestone = item.type === 'milestone'
        const key = `${item.domId}-${isMilestone ? 'm' : 't'}-${item.mi}-${item.ti}`
        const done = !!checked[key]

        return (
          <div key={key}
            onClick={() => toggleKey(key)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '10px 12px',
              marginLeft: isMilestone ? '0' : '18px',
              marginBottom: '4px',
              borderRadius: '8px',
              background: done ? 'rgba(200,146,42,0.06)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}>
            {/* Checkbox */}
            <div style={{
              width: isMilestone ? '16px' : '14px',
              height: isMilestone ? '16px' : '14px',
              flexShrink: 0,
              marginTop: '3px',
              borderRadius: isMilestone ? '4px' : '3px',
              border: done ? 'none' : `1.5px solid ${isMilestone ? GOLD_DK : TEXT_META}`,
              background: done ? GOLD_DK : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {done && (
                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                  <path d="M1 3.5L3.5 6L8 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <div style={{
              ...body, fontSize: isMilestone ? '14.5px' : '13.5px',
              color: done ? TEXT_FAINT : TEXT_INK,
              fontWeight: isMilestone ? 500 : 400,
              lineHeight: 1.45,
              textDecoration: done ? 'line-through' : 'none',
              flex: 1,
            }}>
              {item.text}
            </div>
          </div>
        )
      })}
      <div style={{
        marginTop: '20px', paddingTop: '14px',
        borderTop: `1px solid ${GOLD_RULE}`,
        textAlign: 'right',
      }}>
        <a href="/tools/target-sprint" style={{
          ...sc, fontSize: '11px', letterSpacing: '0.14em',
          color: GOLD_DK, textDecoration: 'none',
        }}>
          OPEN TARGET STRETCH →
        </a>
      </div>
    </div>
  )
}

// ─── Calendar section ─────────────────────────────────────────

function CalendarSection({ userId }) {
  const [icalUrl,     setIcalUrl]     = useState(null)
  const [urlDraft,    setUrlDraft]    = useState('')
  const [showSetup,   setShowSetup]   = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [calEvents,   setCalEvents]   = useState([])
  const [calLoading,  setCalLoading]  = useState(false)
  const [calError,    setCalError]    = useState(null)

  // Load saved ical_url
  useEffect(() => {
    if (!userId) return
    supabase
      .from('contributor_profiles_beta')
      .select('ical_url')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.ical_url) {
          setIcalUrl(data.ical_url)
          setUrlDraft(data.ical_url)
        } else {
          setShowSetup(true)
        }
      })
  }, [userId])

  // Fetch events
  useEffect(() => {
    if (!icalUrl || showSetup) return
    let cancelled = false
    setCalLoading(true)
    setCalError(null)
    fetch('/api/ical-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ical_url: icalUrl, date: getLocalDateStr() }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) setCalError(data.hint || data.error)
        else setCalEvents(data.events || [])
        setCalLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setCalError('Could not load calendar.')
        setCalLoading(false)
      })
    return () => { cancelled = true }
  }, [icalUrl, showSetup])

  async function handleSave() {
    if (!urlDraft.trim() || !userId) return
    setSaving(true)
    await supabase
      .from('contributor_profiles_beta')
      .update({ ical_url: urlDraft.trim() })
      .eq('user_id', userId)
    setIcalUrl(urlDraft.trim())
    setShowSetup(false)
    setSaving(false)
  }

  return (
    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${GOLD_RULE}` }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px',
      }}>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: GOLD_DK }}>
          YOUR DAY
        </div>
        {icalUrl && !showSetup && (
          <button onClick={() => setShowSetup(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            ...sc, fontSize: '10px', letterSpacing: '0.14em',
            color: TEXT_FAINT, padding: 0,
          }}>
            CHANGE CALENDAR
          </button>
        )}
      </div>

      {showSetup ? (
        <div>
          <p style={{ ...body, fontSize: '14px', color: TEXT_META, margin: '0 0 14px', lineHeight: 1.6 }}>
            Paste your private iCal URL. One-time setup, works with Google, Apple, and Outlook.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={urlDraft}
              onChange={e => setUrlDraft(e.target.value)}
              placeholder="webcal:// or https://..."
              style={{
                flex: 1, ...body, fontSize: '13px',
                padding: '9px 12px', borderRadius: '6px',
                border: `1px solid ${GOLD_RULE}`, outline: 'none',
                background: '#FFFFFF', color: TEXT_INK,
              }}
            />
            <button onClick={handleSave} disabled={!urlDraft.trim() || saving}
              style={{
                ...sc, fontSize: '11px', letterSpacing: '0.12em',
                padding: '9px 16px', borderRadius: '40px', border: 'none',
                background: urlDraft.trim() && !saving ? GOLD : GOLD_RULE,
                color: '#FFFFFF', cursor: urlDraft.trim() ? 'pointer' : 'not-allowed',
              }}>
              {saving ? '...' : 'CONNECT'}
            </button>
          </div>
        </div>
      ) : calLoading ? (
        <div style={{ ...body, fontSize: '13px', color: TEXT_FAINT, fontStyle: 'italic' }}>
          Loading your calendar…
        </div>
      ) : calError ? (
        <div style={{ ...body, fontSize: '13px', color: TEXT_META }}>
          {calError}
          <button onClick={() => setShowSetup(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            ...sc, fontSize: '10px', letterSpacing: '0.12em',
            color: GOLD_DK, marginLeft: '10px',
          }}>
            UPDATE URL
          </button>
        </div>
      ) : calEvents.length === 0 ? (
        <div style={{ ...body, fontSize: '13px', color: TEXT_FAINT, fontStyle: 'italic' }}>
          Nothing scheduled for today.
        </div>
      ) : (
        <div>
          {calEvents.map((evt, i) => (
            <div key={evt.id || i} style={{
              padding: '10px 14px', marginBottom: '6px',
              borderRadius: '8px', borderLeft: `3px solid ${GOLD_RULE}`,
              background: 'rgba(200,146,42,0.04)',
            }}>
              {evt.time_label && (
                <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em',
                  color: GOLD_DK, marginBottom: '3px' }}>
                  {evt.time_label}
                </div>
              )}
              <div style={{ ...body, fontSize: '14px', color: TEXT_INK, lineHeight: 1.4 }}>
                {evt.title}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Empty state helper ───────────────────────────────────────

function EmptyState({ eyebrow, message, linkLabel, linkTo }) {
  const navigate = useNavigate()
  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em',
        color: TEXT_FAINT, marginBottom: '10px' }}>
        {eyebrow}
      </div>
      <p style={{ ...body, fontSize: '14px', color: TEXT_META,
        lineHeight: 1.65, margin: '0 0 16px' }}>
        {message}
      </p>
      {linkLabel && (
        <button onClick={() => navigate(linkTo)} style={{
          ...sc, fontSize: '11px', letterSpacing: '0.14em',
          background: 'none', border: `1px solid ${GOLD_RULE}`,
          borderRadius: '40px', padding: '8px 18px',
          color: GOLD_DK, cursor: 'pointer',
        }}>
          {linkLabel}
        </button>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────

export default function GetToDoMissionPanel({ userId, sprintData }) {
  return (
    <div style={{ padding: '20px 24px' }}>
      <SprintItems sprintData={sprintData} />
      <CalendarSection userId={userId} />
    </div>
  )
}
