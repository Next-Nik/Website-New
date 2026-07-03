// ─────────────────────────────────────────────────────────────
// MessageButton.jsx
//
// Reusable button placed on actor profile pages (OrgPublic) so
// logged-in visitors can send the actor a direct message inside
// NextUs. Opens a compose dialog with the actor pre-filled as
// recipient.
//
// For unclaimed wards (profile_owner is null), the button shows
// but inserting a message via the RPC will fail. To honour the
// architecture's protective default, this component checks the
// claim state and either:
//   - Disables the button with "Not yet claimed" tooltip if
//     no owner exists
//   - Opens the compose dialog otherwise
//
// Props:
//   actor:    { id, name, slug, profile_owner, image_url, tagline }
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { ComposeMessage } from './mission-control/ComposeMessage'
import { sc } from '../../lib/designTokens'

export function MessageButton({ actor }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [composeOpen, setComposeOpen] = useState(false)
  const [inboxes, setInboxes]         = useState([])

  // Load the viewer's own inboxes so they can choose which hat to send as
  useEffect(() => {
    async function loadInboxes() {
      if (!user) return
      const { data: owned } = await supabase
        .from('nextus_actors')
        .select('id, name, type')
        .eq('profile_owner', user.id)
      const list = [{
        id: 'personal', name: 'Personal',
        ownerUserId: user.id, actorId: null, actorType: 'person',
      }]
      for (const a of (owned || [])) {
        list.push({
          id: a.id, name: a.name,
          ownerUserId: user.id, actorId: a.id, actorType: a.type,
        })
      }
      setInboxes(list)
    }
    loadInboxes()
  }, [user])

  // Don't show on the actor's own profile (the owner doesn't message themselves)
  if (user && actor.profile_owner === user.id) return null

  const isUnclaimed = !actor.profile_owner

  async function handleSend(args) {
    const { error } = await supabase.rpc('send_message', {
      p_recipient_user_id:  args.recipientUserId  || null,
      p_recipient_actor_id: args.recipientActorId || null,
      p_body:               args.body,
      p_sender_actor_id:    args.senderActorId    || null,
    })
    if (error) throw error
    setComposeOpen(false)
  }

  function handleClick() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (isUnclaimed) return
    setComposeOpen(true)
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isUnclaimed}
        title={isUnclaimed
          ? 'This profile has not been claimed yet — contact links above if available'
          : `Send a message to ${actor.name}`}
        style={{
          ...sc, fontSize: '13px', letterSpacing: '0.14em',
          padding: '10px 22px', borderRadius: '40px',
          border: 'none',
          background: isUnclaimed ? 'rgba(200,146,42,0.20)' : '#C8922A',
          color: '#FFFFFF',
          cursor: isUnclaimed ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={e => { if (!isUnclaimed) e.currentTarget.style.background = '#A8721A' }}
        onMouseLeave={e => { if (!isUnclaimed) e.currentTarget.style.background = '#C8922A' }}
      >
        Message {actor.name}
      </button>

      {composeOpen && (
        <ComposeMessage
          inboxes={inboxes}
          defaultSenderInboxId="personal"
          recipientActor={actor}
          onSend={handleSend}
          onClose={() => setComposeOpen(false)}
        />
      )}
    </>
  )
}
