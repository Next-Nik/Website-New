// src/app/components/EventsSection.jsx
//
// Renders the Events block on a public actor profile (OrgPublic).
//
// Shows upcoming Events produced by this actor (or hosted at this actor's
// Space). When the actor is unclaimed and has no Events, the section is hidden
// entirely. When there are no upcoming Events but past ones exist, "Past Events"
// is offered as an expand.
//
// Props:
//   actor — the nextus_actors row
//   isOwner — boolean; if true, an "Add an Event" button appears

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { sc, gold, dark } from './OrgShared'
import EventCard from './EventCard'

export function EventsSection({ actor, isOwner = false }) {
  const [upcoming, setUpcoming] = useState([])
  const [past, setPast]         = useState([])
  const [venues, setVenues]     = useState({})  // venue_id → venue row
  const [loading, setLoading]   = useState(true)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    if (!actor?.id) return
    let cancelled = false

    async function load() {
      setLoading(true)

      // Upcoming via RPC.
      const { data: upRows } = await supabase
        .rpc('list_upcoming_events_for_actor', {
          p_actor_id:     actor.id,
          p_include_past: false,
          p_limit:        20,
        })

      // Past (last 90 days), pulled directly. Producer OR host_space.
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const { data: pastRows } = await supabase
        .from('nextus_events')
        .select('*')
        .or(`producer_actor_ids.cs.{${actor.id}},host_space_actor_id.eq.${actor.id}`)
        .eq('status', 'published')
        .in('visibility', ['public', 'unlisted'])
        .gte('starts_at', ninetyDaysAgo)
        .lt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: false })
        .limit(20)

      if (cancelled) return

      const allEvents = [...(upRows || []), ...(pastRows || [])]
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
      setUpcoming(upRows || [])
      setPast(pastRows || [])
      setVenues(venueMap)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [actor?.id])

  // Hide section entirely when there's nothing — including for the owner.
  // Owners can add events via /org/:slug/manage?tab=events instead. Not every
  // actor runs events, and an empty Events section on a page that never has
  // events would always be empty.
  if (!loading && upcoming.length === 0 && past.length === 0) {
    return null
  }

  return (
    <section style={{ marginTop: '48px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: '20px', gap: '16px', flexWrap: 'wrap',
      }}>
        <h2 style={{
          ...sc, fontSize: '14px', letterSpacing: '0.20em',
          color: gold, textTransform: 'uppercase',
          margin: 0,
        }}>
          Events
        </h2>
        {isOwner && (
          <Link
            to={`/org/${actor.id}/events/new`}
            style={{
              ...sc, fontSize: '12px', letterSpacing: '0.14em',
              color: gold, textDecoration: 'none',
              padding: '6px 14px', borderRadius: '40px',
              border: '1.5px solid rgba(200,146,42,0.40)',
              textTransform: 'uppercase',
            }}
          >
            + Add an Event
          </Link>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>
          Loading…
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {upcoming.map(ev => (
            <EventCard key={ev.id} event={ev} venue={venues[ev.venue_id]} />
          ))}
        </div>
      )}

      {/* Past (collapsed) */}
      {past.length > 0 && (
        <div style={{ marginTop: upcoming.length > 0 ? '24px' : 0 }}>
          <button
            onClick={() => setShowPast(s => !s)}
            style={{
              ...sc, fontSize: '12px', letterSpacing: '0.14em',
              color: 'rgba(15,21,35,0.72)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '8px 0', textTransform: 'uppercase',
            }}
          >
            {showPast ? '− Hide' : '+ Show'} recent past Events ({past.length})
          </button>
          {showPast && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '10px',
              marginTop: '12px',
            }}>
              {past.map(ev => (
                <EventCard key={ev.id} event={ev} venue={venues[ev.venue_id]} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default EventsSection
