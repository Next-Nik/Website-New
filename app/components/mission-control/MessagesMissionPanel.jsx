// ─────────────────────────────────────────────────────────────
// MessagesMissionPanel.jsx
//
// The Mission Control surface for messaging.
//
// Three-pane layout:
//   1. Top: inbox tabs (Personal | <each owned actor>)
//   2. Middle/left: lane sections (Inner circle / Connections /
//      General / Restricted) listing threads
//   3. Right (or below on mobile): selected thread's message history
//      with reply box
//
// The Compose button opens a separate ComposeMessage component.
//
// Filing actions on each thread row: promote to Inner circle, drop
// to Restricted, Block, etc.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react'
import { useMessages } from '../../hooks/useMessages'
import { ComposeMessage } from './ComposeMessage'
import {
  GOLD, GOLD_DK, GOLD_RULE, TEXT_INK, TEXT_META, FONT_DISPLAY,
} from './tokens'
import { body, sc } from '../../../lib/designTokens'

const LANE_LABELS = {
  inner_circle: 'Inner circle',
  connections:  'Connections',
  general:      'General',
  restricted:   'Restricted',
  blocked:      'Blocked',
}
const VISIBLE_LANES = ['inner_circle', 'connections', 'general', 'restricted']

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const diff = (now - d) / (1000 * 60 * 60 * 24)
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ─── Inbox tab bar ───────────────────────────────────────────

function InboxTabs({ inboxes, active, onSelect, threadsByInbox }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${GOLD_RULE}`,
      marginBottom: '18px', overflowX: 'auto' }}>
      {inboxes.map(ibx => {
        const isActive = ibx.id === active
        const unread = (threadsByInbox[ibx.id] || []).reduce((s, t) => s + (t.unread || 0), 0)
        return (
          <button key={ibx.id} onClick={() => onSelect(ibx.id)}
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: '14px', fontWeight: 500,
              padding: '10px 18px', background: 'none', border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap',
              color: isActive ? TEXT_INK : TEXT_META,
              borderBottom: isActive ? `2px solid ${GOLD}` : '2px solid transparent',
              marginBottom: '-1px',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
            }}>
            <span>{ibx.name}</span>
            {unread > 0 && (
              <span style={{
                background: GOLD, color: '#FFFFFF', fontSize: '13px',
                padding: '1px 7px', borderRadius: '40px',
                fontFamily: "'Cormorant SC', Georgia, serif",
              }}>{unread}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Thread row ──────────────────────────────────────────────

function ThreadRow({ thread, onClick, onAction, isActive }) {
  const { otherName, latestMessage, unread, lane } = thread
  return (
    <div onClick={onClick}
      style={{
        padding: '12px 14px', cursor: 'pointer',
        borderRadius: '8px',
        background: isActive ? 'rgba(200,146,42,0.07)' : 'transparent',
        border: isActive ? `1px solid ${GOLD_RULE}` : '1px solid transparent',
        marginBottom: '4px',
      }}>
      <div style={{ display: 'flex', alignItems: 'baseline',
        justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
        <span style={{ ...body, fontSize: '14px', color: TEXT_INK,
          fontWeight: unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', flex: 1 }}>
          {otherName}
        </span>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em',
          color: TEXT_META, flexShrink: 0 }}>
          {fmtTime(latestMessage?.created_at)}
        </span>
      </div>
      <div style={{ ...body, fontSize: '13px', color: TEXT_META,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {latestMessage?.body?.slice(0, 100) || '—'}
      </div>
    </div>
  )
}

// ─── Message detail (right pane) ─────────────────────────────

function MessageDetail({
  thread, messages, currentUserId, activeInbox, inboxes,
  onReply, onBack, onAction,
}) {
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending]     = useState(false)

  const ibx = inboxes.find(i => i.id === activeInbox)

  async function handleReply() {
    if (!replyBody.trim() || sending) return
    setSending(true)
    try {
      await onReply({
        recipientUserId:  thread.otherUserId,
        recipientActorId: null,
        body:             replyBody.trim(),
        senderActorId:    ibx?.actorId || null,
      })
      setReplyBody('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ borderBottom: `1px solid ${GOLD_RULE}`,
        padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none',
          cursor: 'pointer', color: GOLD_DK, fontSize: '20px' }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ ...body, fontSize: '15px', color: TEXT_INK }}>
            {thread.otherName}
          </div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em',
            color: TEXT_META, textTransform: 'uppercase' }}>
            {LANE_LABELS[thread.lane] || thread.lane}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {thread.lane !== 'inner_circle' && (
            <button onClick={() => onAction('promote_inner', thread.otherUserId)}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em',
                padding: '4px 10px', borderRadius: '40px',
                background: 'none', border: `1px solid ${GOLD_RULE}`,
                color: GOLD_DK, cursor: 'pointer' }}>
              + Inner circle
            </button>
          )}
          {thread.lane !== 'restricted' && (
            <button onClick={() => onAction('restrict', thread.otherUserId)}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em',
                padding: '4px 10px', borderRadius: '40px',
                background: 'none', border: `1px solid ${GOLD_RULE}`,
                color: TEXT_META, cursor: 'pointer' }}>
              Restrict
            </button>
          )}
          <button onClick={() => onAction('block', thread.otherUserId)}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em',
              padding: '4px 10px', borderRadius: '40px',
              background: 'none', border: '1px solid rgba(138,48,48,0.30)',
              color: '#8A3030', cursor: 'pointer' }}>
            Block
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        {messages.length === 0 ? (
          <p style={{ ...body, fontSize: '13px', color: TEXT_META,
            textAlign: 'center', marginTop: '40px' }}>
            No messages in this thread yet.
          </p>
        ) : (
          messages.map(m => {
            const isMine = m.sender_user_id === currentUserId
            return (
              <div key={m.id} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
                marginBottom: '10px',
              }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '8px 14px', borderRadius: '12px',
                  background: isMine ? GOLD : 'rgba(200,146,42,0.08)',
                  color: isMine ? '#FFFFFF' : TEXT_INK,
                  ...body, fontSize: '14px', lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.body}
                </div>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em',
                  color: TEXT_META, marginTop: '3px', padding: '0 4px' }}>
                  {fmtTime(m.created_at)}
                  {m.sender_actor_id ? ' · as actor' : ''}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ borderTop: `1px solid ${GOLD_RULE}`,
        padding: '12px 18px',
        display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <textarea
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          placeholder={`Reply as ${ibx?.name || 'you'}...`}
          rows={2}
          style={{ ...body, flex: 1, padding: '8px 12px',
            border: `1px solid ${GOLD_RULE}`, borderRadius: '8px',
            resize: 'none', fontSize: '14px', outline: 'none',
            background: '#FFFFFF' }}
        />
        <button onClick={handleReply} disabled={!replyBody.trim() || sending}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
            padding: '10px 18px', borderRadius: '40px', border: 'none',
            background: !replyBody.trim() || sending ? GOLD_RULE : GOLD,
            color: '#FFFFFF',
            cursor: !replyBody.trim() || sending ? 'not-allowed' : 'pointer' }}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

// ─── Main panel ──────────────────────────────────────────────

export default function MessagesMissionPanel({ userId }) {
  const m = useMessages(userId)

  if (!userId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', ...body,
        color: TEXT_META, fontSize: '14px' }}>
        Sign in to use messaging.
      </div>
    )
  }

  const activeThreads = m.threadsByInbox[m.activeInbox] || []
  const byLane = useMemo(() => {
    const grouped = {}
    for (const lane of VISIBLE_LANES) grouped[lane] = []
    for (const t of activeThreads) {
      const lane = grouped[t.lane] ? t.lane : 'general'
      grouped[lane].push(t)
    }
    return grouped
  }, [activeThreads])

  const activeThreadObj = m.activeThread
    ? activeThreads.find(t => t.thread.id === m.activeThread)
    : null

  async function handleAction(action, senderUserId) {
    if (action === 'promote_inner') await m.setLane(senderUserId, 'inner_circle')
    else if (action === 'restrict')  await m.setLane(senderUserId, 'restricted')
    else if (action === 'block') {
      if (confirm('Block this sender? They will not be able to message you.')) {
        await m.setLane(senderUserId, 'blocked')
        m.selectThread(null)
      }
    }
  }

  return (
    <div style={{ padding: '20px 24px', height: '100%',
      display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '14px' }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '22px',
          fontWeight: 500, color: TEXT_INK, margin: 0 }}>
          Messages
        </h2>
        <button onClick={m.openCompose}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
            padding: '8px 18px', borderRadius: '40px',
            background: GOLD, color: '#FFFFFF', border: 'none',
            cursor: 'pointer' }}>
          New message
        </button>
      </div>

      <InboxTabs
        inboxes={m.inboxes}
        active={m.activeInbox}
        onSelect={(id) => { m.selectInbox(id); m.selectThread(null) }}
        threadsByInbox={m.threadsByInbox}
      />

      {m.activeThread && activeThreadObj ? (
        <div style={{ flex: 1, minHeight: 0, border: `1px solid ${GOLD_RULE}`,
          borderRadius: '10px', overflow: 'hidden' }}>
          <MessageDetail
            thread={activeThreadObj}
            messages={m.messages}
            currentUserId={userId}
            activeInbox={m.activeInbox}
            inboxes={m.inboxes}
            onReply={m.sendMessage}
            onBack={() => m.selectThread(null)}
            onAction={handleAction}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeThreads.length === 0 ? (
            <p style={{ ...body, fontSize: '14px', color: TEXT_META,
              textAlign: 'center', marginTop: '40px', fontStyle: 'italic' }}>
              No messages here yet. When someone reaches out,
              they'll appear in the appropriate lane.
            </p>
          ) : (
            VISIBLE_LANES.map(lane => {
              const items = byLane[lane] || []
              if (items.length === 0) return null
              return (
                <div key={lane} style={{ marginBottom: '20px' }}>
                  <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em',
                    color: TEXT_META, textTransform: 'uppercase',
                    padding: '0 14px', marginBottom: '6px' }}>
                    {LANE_LABELS[lane]} · {items.length}
                  </div>
                  {items.map(t => (
                    <ThreadRow
                      key={t.thread.id}
                      thread={t}
                      onClick={() => m.selectThread(t.thread.id)}
                      onAction={handleAction}
                      isActive={false}
                    />
                  ))}
                </div>
              )
            })
          )}
        </div>
      )}

      {m.composeOpen && (
        <ComposeMessage
          inboxes={m.inboxes}
          defaultSenderInboxId={m.activeInbox}
          onClose={m.closeCompose}
          onSend={async (args) => {
            await m.sendMessage(args)
            m.closeCompose()
          }}
        />
      )}
    </div>
  )
}
