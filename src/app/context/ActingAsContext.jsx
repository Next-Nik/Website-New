// ─────────────────────────────────────────────────────────────
// ActingAsContext.jsx
//
// One source of truth for "who am I acting as right now."
//
// A signed-in person can own several Atlas actors (their practitioner
// profile, an org, a project). This context holds the single active
// identity that the rest of Mission Control reads from when it
// authors anything: a challenge, an ask, a partner handshake, a
// message. Pick once in the switcher by your name; every author
// surface follows.
//
// Identity shape:
//   { id, actorId, name, type, slug, imageUrl }
//   - personal is always identities[0]: id 'personal', actorId null
//   - each owned actor: id = actorId = the nextus_actors.id
//
// Persistence:
//   - the choice is stored per-user in sessionStorage
//   - it survives navigation within a session
//   - it resets to personal on a fresh login (new session) and on
//     a user change, so you never post as an org days later by
//     accident
//
// Exposed:
//   identities         — [personal, ...owned]
//   actingAsId         — 'personal' | <actorId>   (matches inbox ids)
//   actingAsActorId    — null | <actorId>         (what author rows want)
//   actingAsActor      — the selected identity object
//   setActingAs(id)    — change the active identity
//   loading            — owned-actor fetch in flight
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'

const PERSONAL = { id: 'personal', actorId: null, name: 'You', type: 'person', slug: null, imageUrl: null }

const ActingAsContext = createContext({
  identities: [PERSONAL],
  actingAsId: 'personal',
  actingAsActorId: null,
  actingAsActor: PERSONAL,
  setActingAs: () => {},
  loading: false,
})

function storageKey(userId) {
  return userId ? `nextus_acting_as_${userId}` : null
}

export function ActingAsProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [owned, setOwned]     = useState([])
  const [actingAsId, setId]   = useState('personal')
  const [loading, setLoading] = useState(true)

  // Load the actors this person owns. profile_owner is the canonical
  // (and only) ownership column on nextus_actors.
  useEffect(() => {
    if (authLoading) return
    if (!user) { setOwned([]); setId('personal'); setLoading(false); return }

    let cancelled = false
    setLoading(true)

    supabase
      .from('nextus_actors')
      .select('id, name, type, slug, image_url')
      .eq('profile_owner', user.id)
      .then(({ data }) => {
        if (cancelled) return
        const list = data || []
        setOwned(list)

        // Restore a stored choice only if it still points at an owned
        // actor. Anything stale falls back to personal.
        let restored = 'personal'
        try {
          const stored = sessionStorage.getItem(storageKey(user.id))
          if (stored && (stored === 'personal' || list.some(a => a.id === stored))) {
            restored = stored
          }
        } catch (_) { /* sessionStorage unavailable; default to personal */ }
        setId(restored)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [user, authLoading])

  const setActingAs = useCallback((id) => {
    const next = id || 'personal'
    setId(next)
    try {
      if (user) sessionStorage.setItem(storageKey(user.id), next)
    } catch (_) { /* non-fatal */ }
  }, [user])

  const identities = useMemo(() => ([
    PERSONAL,
    ...owned.map(a => ({
      id: a.id, actorId: a.id, name: a.name, type: a.type,
      slug: a.slug, imageUrl: a.image_url || null,
    })),
  ]), [owned])

  const actingAsActor = useMemo(
    () => identities.find(i => i.id === actingAsId) || PERSONAL,
    [identities, actingAsId]
  )

  const value = useMemo(() => ({
    identities,
    actingAsId,
    actingAsActorId: actingAsActor.actorId,   // null when personal
    actingAsActor,
    setActingAs,
    loading,
  }), [identities, actingAsId, actingAsActor, setActingAs, loading])

  return (
    <ActingAsContext.Provider value={value}>
      {children}
    </ActingAsContext.Provider>
  )
}

export function useActingAs() {
  return useContext(ActingAsContext)
}

export default ActingAsContext
