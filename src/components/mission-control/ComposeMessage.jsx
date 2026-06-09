// ─────────────────────────────────────────────────────────────
// ComposeMessage.jsx
//
// Modal for composing a new message. The "Sending as" selector
// is prominent — the user must always know which hat they're
// wearing when they send.
//
// Recipient is resolved via search against nextus_actors. The
// sender selects an actor profile; the actor's owner (if any)
// receives the message. Sending to an unclaimed ward is blocked
// at the RPC layer with a clear error.
//
// Props:
//   inboxes              — [{ id, name, actorId, actorType }]
//   defaultSenderInboxId — which inbox is currently active
//   recipientActor       — optional: pre-fill recipient
//   onSend({ recipientUserId|recipientActorId, body, senderActorId })
//   onClose
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
import { body, sc } from '../../../lib/designTokens'
  GOLD, GOLD_DK, GOLD_RULE, TEXT_INK, TEXT_META, FONT_DISPLAY,
} from './tokens'

export function ComposeMessage({
  inboxes, defaultSenderInboxId,
  recipientActor: prefilledRecipient,
  onSend, onClose,
}) {
  const [senderInboxId, setSenderInboxId] = useState(defaultSenderInboxId || 'personal')
  const [recipient, setRecipient] = useState(prefilledRecipient || null)
  const [search, setSearch]       = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [body_text, setBody]      = useState('')
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState(null)

  // Debounced search
  useEffect(() => {
    if (!search.trim() || recipient) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await supabase
          .from('nextus_actors')
          .select('id, name, slug, type, image_url, tagline, profile_owner')
          .ilike('name', `%${search.trim()}%`)
          .eq('status', 'live')
          .limit(8)
        setSearchResults(data || [])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [search, recipient])

  const senderInbox = inboxes.find(i => i.id === senderInboxId)

  async function handleSend() {
    if (!recipient || !body_text.trim() || sending) return
    setSending(true); setError(null)
    try {
      await onSend({
        recipientUserId:  null,
        recipientActorId: recipient.id,
        body:             body_text.trim(),
        senderActorId:    senderInbox?.actorId || null,
      })
    } catch (e) {
      setError(e?.message || 'Send failed.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,21,35,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: '#FAFAF7', borderRadius: '14px',
        maxWidth: '520px', width: '100%', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(15,21,35,0.30)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '18px 22px',
          borderBottom: `1px solid ${GOLD_RULE}` }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '20px',
            color: TEXT_INK, margin: 0, fontWeight: 500 }}>
            New message
          </h3>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '22px',
              color: TEXT_META, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>

          {/* Sending as */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em',
              color: TEXT_META, textTransform: 'uppercase',
              display: 'block', marginBottom: '6px' }}>
              Sending as
            </label>
            <select
              value={senderInboxId}
              onChange={e => setSenderInboxId(e.target.value)}
              style={{ ...body, width: '100%', padding: '10px 14px',
                border: `1.5px solid ${GOLD_RULE}`, borderRadius: '8px',
                background: '#FFFFFF', fontSize: '14px',
                color: TEXT_INK, outline: 'none', cursor: 'pointer' }}
            >
              {inboxes.map(ibx => (
                <option key={ibx.id} value={ibx.id}>
                  {ibx.name}{ibx.id === 'personal' ? ' (you, personally)' :
                              ibx.actorType ? ` (${ibx.actorType})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient picker */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em',
              color: TEXT_META, textTransform: 'uppercase',
              display: 'block', marginBottom: '6px' }}>
              To
            </label>
            {recipient ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', background: '#FFFFFF',
                border: `1.5px solid ${GOLD_RULE}`, borderRadius: '8px' }}>
                {recipient.image_url && (
                  <img src={recipient.image_url} alt=""
                    style={{ width: '32px', height: '32px',
                      borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ ...body, fontSize: '14px', color: TEXT_INK }}>
                    {recipient.name}
                  </div>
                  {recipient.tagline && (
                    <div style={{ ...body, fontSize: '13px', color: TEXT_META,
                      fontStyle: 'italic' }}>
                      {recipient.tagline}
                    </div>
                  )}
                </div>
                <button onClick={() => { setRecipient(null); setSearch('') }}
                  style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em',
                    color: GOLD_DK, background: 'none', border: 'none',
                    cursor: 'pointer' }}>
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text" value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search for a person or org..."
                  style={{ ...body, width: '100%', padding: '10px 14px',
                    border: `1.5px solid ${GOLD_RULE}`, borderRadius: '8px',
                    background: '#FFFFFF', fontSize: '14px',
                    color: TEXT_INK, outline: 'none', boxSizing: 'border-box' }}
                />
                {searching && (
                  <p style={{ ...body, fontSize: '13px', color: TEXT_META,
                    marginTop: '8px' }}>Searching...</p>
                )}
                {searchResults.length > 0 && (
                  <div style={{ marginTop: '8px', background: '#FFFFFF',
                    border: `1px solid ${GOLD_RULE}`, borderRadius: '8px',
                    maxHeight: '220px', overflowY: 'auto' }}>
                    {searchResults.map(r => (
                      <button key={r.id} onClick={() => setRecipient(r)}
                        style={{ display: 'flex', width: '100%',
                          alignItems: 'center', gap: '10px',
                          padding: '8px 12px', background: 'none',
                          border: 'none', borderBottom: `1px solid ${GOLD_RULE}`,
                          cursor: 'pointer', textAlign: 'left' }}>
                        {r.image_url ? (
                          <img src={r.image_url} alt=""
                            style={{ width: '28px', height: '28px',
                              borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(200,146,42,0.10)' }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ ...body, fontSize: '13px',
                            color: TEXT_INK }}>{r.name}</div>
                          <div style={{ ...sc, fontSize: '10px',
                            letterSpacing: '0.08em', color: TEXT_META,
                            textTransform: 'uppercase' }}>{r.type}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Body */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em',
              color: TEXT_META, textTransform: 'uppercase',
              display: 'block', marginBottom: '6px' }}>
              Message
            </label>
            <textarea
              value={body_text}
              onChange={e => setBody(e.target.value)}
              rows={6}
              placeholder="Write your message..."
              style={{ ...body, width: '100%', padding: '10px 14px',
                border: `1.5px solid ${GOLD_RULE}`, borderRadius: '8px',
                background: '#FFFFFF', fontSize: '14px',
                color: TEXT_INK, outline: 'none', resize: 'vertical',
                boxSizing: 'border-box', lineHeight: 1.55 }}
            />
            <div style={{ ...body, fontSize: '13px', color: TEXT_META,
              marginTop: '4px' }}>
              {body_text.length}/10000
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(138,48,48,0.06)',
              border: '1px solid rgba(138,48,48,0.25)',
              padding: '10px 14px', borderRadius: '8px',
              ...body, fontSize: '13px', color: '#8A3030',
              marginBottom: '14px' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px',
          borderTop: `1px solid ${GOLD_RULE}`,
          display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose}
            style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em',
              padding: '10px 18px', borderRadius: '40px',
              background: 'none', border: `1px solid ${GOLD_RULE}`,
              color: TEXT_META, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSend}
            disabled={!recipient || !body_text.trim() || sending}
            style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em',
              padding: '10px 20px', borderRadius: '40px', border: 'none',
              background: (!recipient || !body_text.trim() || sending) ? GOLD_RULE : GOLD,
              color: '#FFFFFF',
              cursor: (!recipient || !body_text.trim() || sending) ? 'not-allowed' : 'pointer' }}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
