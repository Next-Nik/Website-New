// src/app/components/EventCard.jsx
//
// Compact card for an Event. Used in Events lists on actor profiles, in
// the Events tab of Org Manage, and anywhere else an Event needs a short
// recognisable display.
//
// Props:
//   event        — nextus_events row
//   venue        — nextus_venues row (optional, if joined)
//   linkTo       — path to navigate to on click (default `/events/${event.id}`)
//   showActor    — render producing actor name (default false; usually
//                  rendered on actor pages where the actor is implicit)
//   compact      — denser layout (default false)

import { Link } from 'react-router-dom'
import { body, sc, gold, dark } from './OrgShared'

const DOMAIN_HUES = {
  'human-being':     '#7E4B6A',
  'society':         '#2A4A8A',
  'nature':          '#2A6B3A',
  'technology':      '#3D5C7A',
  'finance-economy': '#7A5A2A',
  'legacy':          '#6E4A2A',
  'vision':          '#5A2A7A',
}

function formatDateLine(event) {
  if (!event.starts_at) {
    if (event.recurrence_rule) return 'Recurring'
    return 'Date TBD'
  }
  const d = new Date(event.starts_at)
  const date = d.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  })
  return `${date} · ${time}`
}

function statusBadge(event) {
  const now = new Date()
  const start = event.starts_at ? new Date(event.starts_at) : null
  if (event.status === 'cancelled') return { label: 'Cancelled', color: '#8A3030' }
  if (event.status === 'draft')     return { label: 'Draft',     color: '#7A7A72' }
  if (event.was_historical)         return { label: 'Past',      color: '#7A7A72' }
  if (event.status === 'completed') return { label: 'Past',      color: '#7A7A72' }
  if (start && start < now)         return { label: 'Past',      color: '#7A7A72' }
  if (event.recurrence_rule)        return { label: 'Recurring', color: gold }
  return null
}

export function EventCard({ event, venue, linkTo, showActor = false, compact = false }) {
  const href = linkTo || `/events/${event.id}`
  const dateLine = formatDateLine(event)
  const badge = statusBadge(event)
  const venueLine = venue
    ? venue.is_online
      ? 'Online'
      : venue.name + (venue.address ? ` · ${venue.address.split(',')[0]}` : '')
    : null

  return (
    <Link
      to={href}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        padding: compact ? '14px 16px' : '18px 20px',
        background: '#FFFFFF',
        border: '1px solid rgba(76,107,69,0.22)',
        borderRadius: '10px',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(76,107,69,0.50)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(43,74,66,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(76,107,69,0.22)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Date eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <span style={{
          ...sc, fontSize: '13px', letterSpacing: '0.16em',
          color: gold, textTransform: 'uppercase',
        }}>
          {dateLine}
        </span>
        {badge && (
          <span style={{
            ...sc, fontSize: '13px', letterSpacing: '0.14em',
            color: badge.color, textTransform: 'uppercase',
            padding: '2px 8px',
            border: `1px solid ${badge.color}33`,
            borderRadius: '40px',
          }}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{
        ...body, fontSize: compact ? '16px' : '18px',
        fontWeight: 500, color: dark, lineHeight: 1.3,
        marginBottom: '6px',
      }}>
        {event.title}
      </div>

      {/* Venue line */}
      {venueLine && (
        <div style={{
          ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)',
          marginBottom: event.event_types?.length ? '8px' : 0,
        }}>
          {venueLine}
        </div>
      )}

      {/* Event Types */}
      {event.event_types && event.event_types.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
          {event.event_types.slice(0, 4).map(t => (
            <span key={t} style={{
              ...sc, fontSize: '13px', letterSpacing: '0.10em',
              padding: '2px 8px', borderRadius: '40px',
              background: 'rgba(43,74,66,0.08)',
              color: gold,
            }}>
              {t.replace(/-/g, ' ')}
            </span>
          ))}
          {event.event_types.length > 4 && (
            <span style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
              +{event.event_types.length - 4}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}

export default EventCard
