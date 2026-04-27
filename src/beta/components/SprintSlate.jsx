// src/beta/components/SprintSlate.jsx
//
// Three-slot sprint slate for Mission Control.
// Slots: Personal (slot_index=0), Relational (slot_index=1), Civilisational (slot_index=2).
// Pulls target_sprint_sessions where slot_index IN (0, 1, 2).
// Empty slots show a quiet invitation card. Never nudge.
// Each filled slot has an inline visibility toggle.
//
// Props:
//   sessions          — array of target_sprint_sessions rows (with slot_index, domains,
//                       domain_data, target_date, status, id)
//   visibility        — { [session_id]: 'private' | 'public' | 'sprint_buddies' | 'friends' }
//   onToggleVisibility — (sessionId, currentVisibility) => void

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const SLOTS = [
  { index: 0, label: 'Personal',       hint: 'A sprint pointed inward.' },
  { index: 1, label: 'Relational',     hint: 'A sprint that requires another person.' },
  { index: 2, label: 'Civilisational', hint: 'A sprint pointed outward.' },
]

function daysLeft(targetDate) {
  if (!targetDate) return null
  const d = Math.ceil((new Date(targetDate) - new Date()) / 86400000)
  return d
}

function sprintStatusLabel(status, days) {
  if (status === 'complete') return { text: 'Complete', color: '#2D6A4F' }
  if (days == null) return null
  if (days < 0)    return { text: 'Overdue', color: '#8A3030' }
  if (days <= 7)   return { text: `${days}d left`, color: '#8A7030' }
  return { text: `${days}d left`, color: 'rgba(15,21,35,0.55)' }
}

function SlotEmpty({ slot }) {
  return (
    <div style={{
      padding: '20px 18px',
      border: '1px dashed rgba(200,146,42,0.25)',
      borderRadius: '14px',
      minHeight: '120px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <span style={{
        ...sc,
        fontSize: '10px',
        letterSpacing: '0.18em',
        color: 'rgba(15,21,35,0.35)',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: '8px',
      }}>
        {slot.label}
      </span>
      <p style={{
        ...body,
        fontSize: '14px',
        color: 'rgba(15,21,35,0.4)',
        lineHeight: 1.55,
        margin: '0 0 12px',
      }}>
        {slot.hint}
      </p>
      <a
        href="/tools/target-sprint"
        style={{
          ...sc,
          fontSize: '11px',
          letterSpacing: '0.12em',
          color: '#A8721A',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Begin sprint
      </a>
    </div>
  )
}

const VISIBILITY_OPTIONS = [
  { value: 'private',        label: 'Private' },
  { value: 'sprint_buddies', label: 'Sprint buddies' },
  { value: 'friends',        label: 'Friends' },
  { value: 'public',         label: 'Public' },
]

function VisibilitySelect({ value, onChange }) {
  return (
    <select
      value={value || 'private'}
      onChange={e => onChange(e.target.value)}
      style={{
        ...sc,
        fontSize: '10px',
        letterSpacing: '0.1em',
        color: value === 'public' ? '#A8721A' : 'rgba(15,21,35,0.45)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '0',
        outline: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
      }}
      title="Visibility"
    >
      {VISIBILITY_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function SlotFilled({ slot, session, visibilityValue, onToggleVisibility }) {
  const days   = daysLeft(session.target_date)
  const status = sprintStatusLabel(session.status, days)
  const dd     = session.domain_data ?? {}
  const domains = session.domains ?? []

  return (
    <div style={{
      padding: '16px 18px',
      background: 'rgba(200,146,42,0.03)',
      border: '1px solid rgba(200,146,42,0.18)',
      borderRadius: '14px',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{
          ...sc,
          fontSize: '10px',
          letterSpacing: '0.18em',
          color: '#A8721A',
          textTransform: 'uppercase',
        }}>
          {slot.label}
        </span>

        {/* Visibility toggle */}
        <VisibilitySelect
          value={visibilityValue}
          onChange={v => onToggleVisibility(session.id, v)}
        />
      </div>

      {/* Domain list */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
        {domains.map(d => {
          const domainData = dd[d] || {}
          const label = domainData.label || d
          return (
            <span key={d} style={{
              ...sc,
              fontSize: '10px',
              letterSpacing: '0.08em',
              color: 'rgba(15,21,35,0.72)',
              background: 'rgba(200,146,42,0.05)',
              border: '1px solid rgba(200,146,42,0.2)',
              borderRadius: '40px',
              padding: '2px 8px',
            }}>
              {label}
            </span>
          )
        })}
      </div>

      {/* Goal text */}
      {domains[0] && dd[domains[0]]?.goal && (
        <p style={{
          ...body,
          fontSize: '14px',
          color: 'rgba(15,21,35,0.72)',
          lineHeight: 1.55,
          margin: '0 0 10px',
          fontStyle: 'italic',
        }}>
          {dd[domains[0]].goal}
        </p>
      )}

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {status && (
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.1em', color: status.color }}>
            {status.text}
          </span>
        )}
        <a
          href="/tools/target-sprint"
          style={{ ...sc, fontSize: '10px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none', marginLeft: 'auto' }}
        >
          Open sprint
        </a>
      </div>
    </div>
  )
}

export default function SprintSlate({ sessions = [], visibility = {}, onToggleVisibility }) {
  // Map sessions to slot indices — take the first session per slot_index
  const bySlot = {}
  for (const s of sessions) {
    const idx = s.slot_index
    if (idx != null && !bySlot[idx]) {
      bySlot[idx] = s
    }
  }

  return (
    <div>
      {/* Section heading */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase' }}>
          Sprint Slate
        </span>
      </div>

      {/* Three slots */}
      <div
        className="sprint-slate-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '14px',
        }}
      >
        {SLOTS.map(slot => {
          const session = bySlot[slot.index]
          if (!session) {
            return <SlotEmpty key={slot.index} slot={slot} />
          }
          return (
            <SlotFilled
              key={slot.index}
              slot={slot}
              session={session}
              visibilityValue={visibility[session.id] || 'private'}
              onToggleVisibility={onToggleVisibility}
            />
          )
        })}
      </div>

      {/* Mobile: stack */}
      <style>{`
        @media (max-width: 640px) {
          .sprint-slate-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
