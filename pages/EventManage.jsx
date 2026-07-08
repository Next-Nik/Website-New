// src/app/pages/EventManage.jsx
//
// Create or edit a single Event under an actor the user owns.
//
// Routes:
//   /org/:slug/events/new                   — create
//   /org/:slug/events/:eventId/edit         — edit

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import {
  body, sc, gold, dark, parch,
  Eyebrow, Rule, SectionCard,
} from '../components/OrgShared'
import { OrgToast } from '../components/OrgToast'
import { EventForm } from '../components/EventForm'

export function EventManagePage() {
  const { slug: actorId, eventId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [actor, setActor]     = useState(null)
  const [event, setEvent]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState(null)
  const [denied, setDenied]   = useState(false)

  const isEdit = !!eventId

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login?next=' + encodeURIComponent(window.location.pathname))
      return
    }

    let cancelled = false

    async function load() {
      // Load actor and confirm ownership.
      const { data: a, error: aErr } = await supabase
        .from('nextus_actors')
        .select('*')
        .eq('id', actorId)
        .single()

      if (aErr || !a) {
        if (!cancelled) {
          setDenied(true)
          setLoading(false)
        }
        return
      }

      if (a.profile_owner !== user.id) {
        if (!cancelled) {
          setDenied(true)
          setLoading(false)
        }
        return
      }

      if (cancelled) return
      setActor(a)

      if (isEdit) {
        const { data: e, error: eErr } = await supabase
          .from('nextus_events')
          .select('*')
          .eq('id', eventId)
          .single()
        if (eErr || !e) {
          if (!cancelled) {
            setDenied(true)
            setLoading(false)
          }
          return
        }
        if (e.owner_id !== user.id) {
          if (!cancelled) {
            setDenied(true)
            setLoading(false)
          }
          return
        }
        if (!cancelled) setEvent(e)
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [authLoading, user, actorId, eventId, navigate, isEdit])

  function showToast(msg) { setToast(msg) }

  function onSaved(saved) {
    setEvent(saved)
    // After create, redirect to edit URL so the form has stable identity.
    if (!isEdit) {
      navigate(`/org/${actorId}/events/${saved.id}/edit`, { replace: true })
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100dvh', background: parch }}>
        <Nav activePath="" />
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ color: 'rgba(15,21,35,0.55)', fontSize: '14px' }}>Loading…</div>
        </div>
      </div>
    )
  }

  if (denied) {
    return (
      <div style={{ minHeight: '100dvh', background: parch }}>
        <Nav activePath="" />
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <h1 style={{ ...sc, fontSize: '20px', letterSpacing: '0.18em', color: gold, textTransform: 'uppercase', margin: '0 0 16px 0' }}>
            Not available
          </h1>
          <div style={{ ...body, fontSize: '15px', color: dark, marginBottom: '24px' }}>
            You don't have permission to edit this Event, or it doesn't exist.
          </div>
          <Link to="/" style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: gold, textTransform: 'uppercase' }}>
            ← Back to Mission Control
          </Link>
        </div>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: parch }}>
      <Nav activePath="" />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link
            to={`/org/${actorId}/manage`}
            style={{
              ...sc, fontSize: '12px', letterSpacing: '0.14em',
              color: 'rgba(15,21,35,0.55)', textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            ← {actor?.name || 'Actor'} · Manage
          </Link>
        </div>

        <Eyebrow>{actor?.name || 'Actor'}</Eyebrow>
        <h1 style={{
          ...body, fontSize: '32px', fontWeight: 500, color: dark,
          margin: '8px 0 12px 0', lineHeight: 1.2,
        }}>
          {isEdit ? 'Edit Event' : 'Add an Event'}
        </h1>
        <Rule />

        <div style={{ marginTop: '32px' }}>
          <SectionCard>
            <EventForm
              actor={actor}
              initial={event}
              onSubmitDone={onSaved}
              toast={showToast}
            />
          </SectionCard>
        </div>
      </div>
      <SiteFooter />
      {toast && <OrgToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

export default EventManagePage
