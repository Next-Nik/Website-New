import { useEffect, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { fetchVisibilityMap, useArtefactVisibility } from '../hooks/useArtefactVisibility'
import VisibilityToggle from './VisibilityToggle'

// ─────────────────────────────────────────────────────────────────────────────
// SprintsVisibilitySection
//
// Lists the user's active sprints and their last six completed sprints. Each
// row carries an independent visibility toggle. Defaults are private, per the
// platform contract — a row is only persisted when the user changes it.
//
// The component reads from target_sprint_sessions. Active = no completion
// timestamp; completed = ordered by completion timestamp desc, top six.
//
// Defensive: if the underlying table or its expected columns are not yet
// in place (early development or schema drift), the section renders the
// honest empty state rather than fake rows.
//
// Props:
//   userId    — current user id (required)
//   className — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const COMPLETED_LIMIT = 6

// Candidate column names for "completed at." Any one of these working is
// enough; we try them in order. If none resolves, the section shows empty.
const COMPLETION_COLUMNS = ['completed_at', 'ended_at', 'finished_at']

// Candidate column names for the sprint title.
const TITLE_COLUMNS = ['title', 'name', 'goal', 'sprint_title']

async function fetchSprints(userId) {
  // Try the simplest base query first — pull everything for this user, sort
  // out active vs completed in JS so we don't need to know the column names
  // up front.
  const { data, error } = await supabase
    .from('target_sprint_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return { active: [], completed: [], tableMissing: true }
  }

  const completionCol = COMPLETION_COLUMNS.find((c) =>
    (data || []).some((row) => row[c] != null),
  )
  const titleCol = TITLE_COLUMNS.find((c) =>
    (data || []).some((row) => row[c] != null),
  ) || null

  function display(row) {
    return {
      id: row.id,
      title: titleCol && row[titleCol] ? row[titleCol] : `Sprint ${row.id?.toString().slice(0, 8) || ''}`,
      created_at: row.created_at || null,
      completed_at: completionCol ? row[completionCol] || null : null,
    }
  }

  const all = (data || []).map(display)
  const active = all.filter((r) => !r.completed_at)
  const completed = all
    .filter((r) => r.completed_at)
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, COMPLETED_LIMIT)

  return { active, completed, tableMissing: false }
}

export default function SprintsVisibilitySection({ userId, className }) {
  const [active, setActive] = useState([])
  const [completed, setCompleted] = useState([])
  const [activeVis, setActiveVis] = useState({})
  const [completedVis, setCompletedVis] = useState({})
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setUnavailable(false)
    Promise.all([
      fetchSprints(userId),
      fetchVisibilityMap(userId, 'sprint').catch(() => ({})),
      fetchVisibilityMap(userId, 'sprint_completion').catch(() => ({})),
    ])
      .then(([sprints, vMapActive, vMapCompleted]) => {
        if (cancelled) return
        if (sprints.tableMissing) {
          setUnavailable(true)
        } else {
          setActive(sprints.active)
          setCompleted(sprints.completed)
          setActiveVis(vMapActive)
          setCompletedVis(vMapCompleted)
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setUnavailable(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (loading) {
    return (
      <div className={className}>
        <p
          style={{
            ...body,
            fontSize: '15px',
            color: 'rgba(15, 21, 35, 0.55)',
            margin: 0,
          }}
        >
          Loading sprints.
        </p>
      </div>
    )
  }

  if (unavailable) {
    return (
      <div className={className}>
        <p
          style={{
            ...body,
            fontSize: '15px',
            lineHeight: 1.55,
            color: 'rgba(15, 21, 35, 0.55)',
            margin: 0,
          }}
        >
          Sprint history is not available yet on this account.
        </p>
      </div>
    )
  }

  if (active.length === 0 && completed.length === 0) {
    return (
      <div className={className}>
        <p
          style={{
            ...body,
            fontSize: '15px',
            lineHeight: 1.55,
            color: 'rgba(15, 21, 35, 0.55)',
            margin: 0,
          }}
        >
          No sprints yet. When you start one, it will appear here with its own
          visibility setting.
        </p>
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      {active.length > 0 && (
        <SprintGroup
          eyebrow="Active sprints"
          sprints={active}
          artefactType="sprint"
          userId={userId}
          initialVisibility={activeVis}
        />
      )}
      {completed.length > 0 && (
        <SprintGroup
          eyebrow="Recently completed"
          sprints={completed}
          artefactType="sprint_completion"
          userId={userId}
          initialVisibility={completedVis}
          showCompletionDate
        />
      )}
    </div>
  )
}

function SprintGroup({
  eyebrow,
  sprints,
  artefactType,
  userId,
  initialVisibility,
  showCompletionDate = false,
}) {
  return (
    <section>
      <span
        style={{
          ...sc,
          display: 'block',
          fontSize: '12px',
          letterSpacing: '0.08em',
          color: '#A8721A',
          fontWeight: 600,
          marginBottom: '10px',
        }}
      >
        {eyebrow}
      </span>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sprints.map((sprint) => (
          <SprintRow
            key={sprint.id}
            sprint={sprint}
            artefactType={artefactType}
            userId={userId}
            initialVisibility={initialVisibility[sprint.id] || 'private'}
            showCompletionDate={showCompletionDate}
          />
        ))}
      </ul>
    </section>
  )
}

function SprintRow({
  sprint,
  artefactType,
  userId,
  initialVisibility,
  showCompletionDate,
}) {
  // Use the hook for live state plus the initial seed from the bulk fetch.
  const { visibility, setVisibility } = useArtefactVisibility(
    userId,
    artefactType,
    sprint.id,
  )
  const current = visibility || initialVisibility || 'private'

  function handleToggle(next) {
    setVisibility(next).catch(() => {
      // Hook reverts local state on failure; nothing else to do here.
    })
  }

  const dateLabel = showCompletionDate && sprint.completed_at
    ? new Date(sprint.completed_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <li
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(200, 146, 42, 0.20)',
        borderRadius: '14px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            ...body,
            fontSize: '16px',
            lineHeight: 1.4,
            color: '#0F1523',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sprint.title}
        </p>
        {dateLabel && (
          <p
            style={{
              ...body,
              fontSize: '13px',
              color: 'rgba(15, 21, 35, 0.55)',
              margin: '4px 0 0',
            }}
          >
            Completed {dateLabel}
          </p>
        )}
      </div>
      <VisibilityToggle value={current} onChange={handleToggle} compact />
    </li>
  )
}
