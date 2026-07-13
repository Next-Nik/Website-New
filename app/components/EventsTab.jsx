// src/app/components/EventsTab.jsx
//
// The Events tab inside OrgManage. The actor owner sees their Events here:
// upcoming, past, drafts. They can add a new Event, edit one, or cancel one.
//
// Props:
//   actorId   — the actor whose Events are being managed
//   actorName — for display
//   toast     — function(msg) for the toast surface

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { sc, body, gold, dark, Btn } from './OrgShared'
import EventCard from './EventCard'

export function EventsTab({ actorId, actorName, toast }) {
  const [events, setEvents]   = useState([])
  const [venues, setVenues]   = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('upcoming')

  useEffect(() => {
    if (!actorId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      // Load ALL Events for this actor (producer OR host).
      const { data, error } = await supabase
        .from('nextus_events')
        .select('*')
        .or(`producer_actor_ids.cs.{${actorId}},host_space_actor_id.eq.${actorId}`)
        .order('starts_at', { ascending: false, nullsFirst: false })

      if (cancelled) return
      if (error) {
        toast?.('Could not load Events: ' + error.message)
        setLoading(false)
        return
      }

      const allEvents = data || []
      const venueIds = [...new Set(allEvents.map(e => e.venue_id).filter(Boolean))]

      let venueMap = {}
      if (venueIds.length > 0) {
        const { data: venueRows } = await supabase
          .from('nextus_venues')
          .select('*')
          .in('id', venueIds)
        venueMap = Object.fromEntries((venueRows || []).map(v => [v.id, v]))
      }

      if (cancelled) return
      setEvents(allEvents)
      setVenues(venueMap)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [actorId, toast])

  const now      = new Date()
  const upcoming = events.filter(e => e.status === 'published' && (!e.starts_at || new Date(e.starts_at) >= now))
  const past     = events.filter(e => e.status === 'published' && e.starts_at && new Date(e.starts_at) < now)
  const drafts   = events.filter(e => e.status === 'draft')
  const cancelled = events.filter(e => e.status === 'cancelled')

  const shown = (
    filter === 'upcoming'  ? upcoming :
    filter === 'past'      ? past :
    filter === 'drafts'    ? drafts :
    filter === 'cancelled' ? cancelled :
    events
  )

  const FILTERS = [
    { key: 'upcoming',  label: `Upcoming (${upcoming.length})` },
    { key: 'past',      label: `Past (${past.length})` },
    { key: 'drafts',    label: `Drafts (${drafts.length})` },
    ...(cancelled.length > 0 ? [{ key: 'cancelled', label: `Cancelled (${cancelled.length})` }] : []),
  ]

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: '24px', gap: '16px', flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{
            ...sc, fontSize: '14px', letterSpacing: '0.20em',
            color: gold, textTransform: 'uppercase', margin: '0 0 6px 0',
          }}>
            Events
          </h2>
          <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)' }}>
            What {actorName || 'this actor'} is doing in the world.
          </div>
        </div>
        <Link
          to={`/org/${actorId}/events/new`}
          style={{
            ...sc, fontSize: '13px', letterSpacing: '0.14em',
            color: '#FFFFFF', textDecoration: 'none', background: gold,
            padding: '10px 20px', borderRadius: '40px',
            textTransform: 'uppercase',
          }}
        >
          + Add an Event
        </Link>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const on = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.14em',
                padding: '6px 14px', borderRadius: '40px', cursor: 'pointer',
                border: on ? '1.5px solid rgba(88,160,138,0.78)' : '1.5px solid rgba(88,160,138,0.25)',
                background: on ? 'rgba(88,160,138,0.10)' : 'transparent',
                color: on ? gold : 'rgba(15,21,35,0.55)',
                textTransform: 'uppercase',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {loading && (
        <div style={{ fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>Loading…</div>
      )}

      {!loading && shown.length === 0 && (
        <div style={{
          padding: '32px', textAlign: 'center',
          border: '1.5px dashed rgba(88,160,138,0.30)', borderRadius: '10px',
          color: 'rgba(15,21,35,0.55)', fontSize: '14px',
        }}>
          {filter === 'upcoming' && 'No upcoming Events. Add one to get started.'}
          {filter === 'past'     && 'No past Events.'}
          {filter === 'drafts'   && 'No drafts.'}
          {filter === 'cancelled'&& 'No cancelled Events.'}
        </div>
      )}

      {!loading && shown.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {shown.map(ev => (
            <div key={ev.id} style={{ position: 'relative' }}>
              <EventCard
                event={ev}
                venue={venues[ev.venue_id]}
                linkTo={`/org/${actorId}/events/${ev.id}/edit`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EventsTab
