// src/app/pages/EventPublic.jsx
//
// Public page for a single Event at /events/:id.
//
// Shows: title, time, venue, producing actors, domain placements, Event Types,
// description, ticket link, cover image, and the user's relationship state
// (interest / registered / attended).

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import {
  body, sc, gold, dark, parch,
  DOMAIN_LIST, DOMAIN_LABEL,
  Eyebrow, Rule, Btn,
} from '../components/OrgShared'

function formatLong(iso, tz) {
  if (!iso) return null
  const d = new Date(iso)
  const opts = {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: tz || undefined, timeZoneName: 'short',
  }
  try {
    return d.toLocaleString(undefined, opts)
  } catch {
    return d.toLocaleString()
  }
}

export function EventPublicPage() {
  const { id } = useParams()
  const { user } = useAuth()

  const [event, setEvent]         = useState(null)
  const [venue, setVenue]         = useState(null)
  const [producers, setProducers] = useState([])
  const [host, setHost]           = useState(null)
  const [placements, setPlacements] = useState([])
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)

  // User relationship state
  const [interested, setInterested]   = useState(false)
  const [registered, setRegistered]   = useState(false)
  const [attended, setAttended]       = useState(false)
  const [relBusy, setRelBusy]         = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: ev, error } = await supabase
        .from('nextus_events')
        .select('*')
        .eq('id', id)
        .single()

      if (cancelled) return
      if (error || !ev) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setEvent(ev)

      // Venue
      if (ev.venue_id) {
        const { data: v } = await supabase
          .from('nextus_venues')
          .select('*')
          .eq('id', ev.venue_id)
          .single()
        if (!cancelled) setVenue(v || null)
      }

      // Producers
      if (ev.producer_actor_ids?.length > 0) {
        const { data: actors } = await supabase
          .from('nextus_actors')
          .select('id, name, tagline, image_url')
          .in('id', ev.producer_actor_ids)
        if (!cancelled) setProducers(actors || [])
      }

      // Host space
      if (ev.host_space_actor_id) {
        const { data: h } = await supabase
          .from('nextus_actors')
          .select('id, name, tagline, image_url')
          .eq('id', ev.host_space_actor_id)
          .single()
        if (!cancelled) setHost(h || null)
      }

      // Domain placements
      const { data: dp } = await supabase
        .from('nextus_event_domain_placements')
        .select('domain_slug, is_primary')
        .eq('event_id', ev.id)
      if (!cancelled) setPlacements(dp || [])

      // User relationships
      if (user) {
        const [i, r, a] = await Promise.all([
          supabase.from('nextus_user_event_interests').select('id').eq('user_id', user.id).eq('event_id', ev.id).maybeSingle(),
          supabase.from('nextus_user_event_registrations').select('id').eq('user_id', user.id).eq('event_id', ev.id).maybeSingle(),
          supabase.from('nextus_user_event_attendances').select('id').eq('user_id', user.id).eq('event_id', ev.id).maybeSingle(),
        ])
        if (!cancelled) {
          setInterested(!!i.data)
          setRegistered(!!r.data)
          setAttended(!!a.data)
        }
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [id, user])

  async function toggleInterest() {
    if (!user) {
      window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname)
      return
    }
    setRelBusy(true)
    if (interested) {
      await supabase.from('nextus_user_event_interests').delete().eq('user_id', user.id).eq('event_id', event.id)
      setInterested(false)
    } else {
      await supabase.from('nextus_user_event_interests').insert({ user_id: user.id, event_id: event.id })
      setInterested(true)
    }
    setRelBusy(false)
  }

  async function toggleRegistered() {
    if (!user) {
      window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname)
      return
    }
    setRelBusy(true)
    if (registered) {
      await supabase.from('nextus_user_event_registrations').delete().eq('user_id', user.id).eq('event_id', event.id)
      setRegistered(false)
    } else {
      await supabase.from('nextus_user_event_registrations').insert({ user_id: user.id, event_id: event.id })
      setRegistered(true)
    }
    setRelBusy(false)
  }

  async function markAttended() {
    if (!user) {
      window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname)
      return
    }
    setRelBusy(true)
    if (attended) {
      await supabase.from('nextus_user_event_attendances').delete().eq('user_id', user.id).eq('event_id', event.id)
      setAttended(false)
    } else {
      await supabase.from('nextus_user_event_attendances').insert({
        user_id: user.id, event_id: event.id,
        source: 'self', confirmed: true,
      })
      setAttended(true)
    }
    setRelBusy(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: parch }}>
        <Nav activePath="" />
        <div style={{ maxWidth: '880px', margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ color: 'rgba(15,21,35,0.55)', fontSize: '14px' }}>Loading…</div>
        </div>
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div style={{ minHeight: '100dvh', background: parch }}>
        <Nav activePath="" />
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <h1 style={{ ...sc, fontSize: '20px', letterSpacing: '0.18em', color: gold, textTransform: 'uppercase', margin: '0 0 16px 0' }}>
            Event not found
          </h1>
          <div style={{ ...body, fontSize: '15px', color: dark, marginBottom: '24px' }}>
            This Event may have been removed, or the link is wrong.
          </div>
          <Link to="/" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, textTransform: 'uppercase' }}>
            ← Back to Mission Control
          </Link>
        </div>
        <SiteFooter />
      </div>
    )
  }

  const primaryPlacement = placements.find(p => p.is_primary)
  const startsLong = formatLong(event.starts_at, event.timezone)
  const endsLong   = formatLong(event.ends_at, event.timezone)
  const now        = new Date()
  const isPast     = event.starts_at && new Date(event.starts_at) < now

  return (
    <div style={{ minHeight: '100dvh', background: parch }}>
      <Nav activePath="" />
      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Cover image */}
        {event.cover_image_url && (
          <div style={{
            width: '100%', aspectRatio: '16/9',
            borderRadius: '12px', overflow: 'hidden',
            marginBottom: '32px',
            background: '#EEEEE8',
          }}>
            <img
              src={event.cover_image_url}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* Eyebrow + Title */}
        {primaryPlacement && (
          <Eyebrow>{DOMAIN_LABEL[primaryPlacement.domain_slug] || primaryPlacement.domain_slug}</Eyebrow>
        )}
        <h1 style={{
          ...body, fontSize: '36px', fontWeight: 500, color: dark,
          margin: '8px 0 16px 0', lineHeight: 1.2,
        }}>
          {event.title}
        </h1>

        {/* Status banner */}
        {event.status === 'cancelled' && (
          <div style={{
            padding: '10px 16px', borderRadius: '6px',
            background: 'rgba(138,48,48,0.10)', color: '#8A3030',
            fontSize: '13px', marginBottom: '16px',
            ...sc, letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            This Event has been cancelled
          </div>
        )}

        {/* Date / venue strip */}
        <div style={{
          padding: '20px 24px', borderRadius: '10px',
          background: '#FFFFFF', border: '1px solid rgba(110,127,92,0.22)',
          marginBottom: '32px',
        }}>
          {startsLong && (
            <div style={{ marginBottom: endsLong || venue ? '8px' : 0 }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, textTransform: 'uppercase', marginBottom: '2px' }}>
                When
              </div>
              <div style={{ ...body, fontSize: '15px', color: dark }}>
                {startsLong}{endsLong && ` — ${endsLong}`}
              </div>
            </div>
          )}
          {event.recurrence_rule && !startsLong && (
            <div style={{ ...body, fontSize: '15px', color: dark }}>
              Recurring: {event.recurrence_rule}
            </div>
          )}
          {venue && (
            <div style={{ marginTop: startsLong ? '8px' : 0 }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, textTransform: 'uppercase', marginBottom: '2px' }}>
                Where
              </div>
              <div style={{ ...body, fontSize: '15px', color: dark }}>
                {venue.is_online ? 'Online' : venue.name}
                {!venue.is_online && venue.address && (
                  <div style={{ fontSize: '13px', color: 'rgba(15,21,35,0.72)', marginTop: '2px' }}>
                    {venue.address}
                  </div>
                )}
              </div>
            </div>
          )}
          {event.online_url && (
            <div style={{ marginTop: '12px' }}>
              <a href={event.online_url} target="_blank" rel="noreferrer" style={{
                ...sc, fontSize: '13px', letterSpacing: '0.14em',
                color: gold, textDecoration: 'none', textTransform: 'uppercase',
              }}>
                Join online ↗
              </a>
            </div>
          )}
        </div>

        {/* Producers and host */}
        {(producers.length > 0 || host) && (
          <div style={{ marginBottom: '32px' }}>
            {producers.length > 0 && (
              <div style={{ marginBottom: host ? '16px' : 0 }}>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Produced by
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {producers.map(p => (
                    <Link key={p.id} to={`/org/${p.id}`} style={{
                      ...body, fontSize: '16px', color: dark,
                      textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 12px', borderRadius: '8px',
                      background: 'rgba(38,48,42,0.04)',
                      border: '1px solid rgba(110,127,92,0.18)',
                    }}>
                      {p.image_url && (
                        <img src={p.image_url} alt="" style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          objectFit: 'cover',
                        }} />
                      )}
                      <span>
                        <div>{p.name}</div>
                        {p.tagline && (
                          <div style={{ fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>{p.tagline}</div>
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {host && (
              <div>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Hosted at
                </div>
                <Link to={`/org/${host.id}`} style={{
                  ...body, fontSize: '15px', color: dark,
                  textDecoration: 'none',
                }}>
                  {host.name}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {event.description && (
          <>
            <Rule />
            <div style={{
              ...body, fontSize: '16px', color: dark, lineHeight: 1.6,
              whiteSpace: 'pre-wrap', margin: '24px 0',
            }}>
              {event.description}
            </div>
          </>
        )}

        {/* Event Types */}
        {event.event_types?.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, textTransform: 'uppercase', marginBottom: '8px' }}>
              Event Types
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {event.event_types.map(t => (
                <span key={t} style={{
                  ...sc, fontSize: '13px', letterSpacing: '0.12em',
                  padding: '4px 12px', borderRadius: '40px',
                  background: 'rgba(38,48,42,0.10)', color: gold,
                }}>
                  {t.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Domain placements (multi) */}
        {placements.length > 1 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, textTransform: 'uppercase', marginBottom: '8px' }}>
              Domains
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {placements.map(p => (
                <span key={p.domain_slug} style={{
                  ...sc, fontSize: '13px', letterSpacing: '0.12em',
                  padding: '4px 12px', borderRadius: '40px',
                  border: p.is_primary ? '1.5px solid rgba(110,127,92,0.62)' : '1px solid rgba(110,127,92,0.25)',
                  background: p.is_primary ? 'rgba(38,48,42,0.10)' : 'transparent',
                  color: p.is_primary ? gold : 'rgba(15,21,35,0.72)',
                }}>
                  {p.is_primary && '★ '}{DOMAIN_LABEL[p.domain_slug] || p.domain_slug}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {event.status !== 'cancelled' && (
          <div style={{
            padding: '24px', borderRadius: '10px',
            background: '#FFFFFF', border: '1px solid rgba(110,127,92,0.22)',
            marginBottom: '32px',
          }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {!isPast && (
                <>
                  <Btn onClick={toggleRegistered} disabled={relBusy} variant={registered ? 'secondary' : 'primary'}>
                    {registered ? '✓ I\'m going' : 'I\'m going'}
                  </Btn>
                  <Btn onClick={toggleInterest} disabled={relBusy} variant="secondary">
                    {interested ? '✓ Saved' : 'Save for later'}
                  </Btn>
                </>
              )}
              {isPast && (
                <Btn onClick={markAttended} disabled={relBusy} variant={attended ? 'secondary' : 'primary'}>
                  {attended ? '✓ I was there' : 'I was there'}
                </Btn>
              )}
              {event.ticket_url && (
                <a href={event.ticket_url} target="_blank" rel="noreferrer" style={{
                  ...sc, fontSize: '13px', letterSpacing: '0.14em',
                  color: gold, textDecoration: 'none',
                  padding: '10px 20px', borderRadius: '40px',
                  border: '1.5px solid rgba(110,127,92,0.40)',
                  textTransform: 'uppercase',
                }}>
                  Get tickets ↗
                </a>
              )}
            </div>
          </div>
        )}

      </div>
      <SiteFooter />
    </div>
  )
}

export default EventPublicPage
