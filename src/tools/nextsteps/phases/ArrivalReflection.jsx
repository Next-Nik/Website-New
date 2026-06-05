// NextSteps — Phase 1 (Arrival) + Phase 2 (Reflection)
// src/tools/nextsteps/phases/ArrivalReflection.jsx
//
// One conversational surface. Opens with a warm orienting line and one
// open input. Conversation runs 2–4 turns. When the endpoint emits a
// structured Reflection payload, this component calls onReflectionLanded
// with that payload + the person's original concern.
//
// Emotional endpoint: SEEN — more seen than before they spoke.

import { useState, useRef, useEffect } from 'react'

const OPENING =
  "Let's chat about where you are in any area of your life and we'll see if we can aim you at where you want to be with the resources to support you."

// localStorage key for an in-flight reflection conversation. User-scoped so
// two people on the same device don't collide. Cleared when the reflection
// lands and a Track is created (the durable handoff).
const LS_KEY_PREFIX = 'nextsteps_arrival_draft_v1'
function lsKey(userId) {
  return userId ? `${LS_KEY_PREFIX}:${userId}` : `${LS_KEY_PREFIX}:anon`
}

export function ArrivalReflection({ user, onReflectionLanded }) {
  // Restore any in-flight conversation. Only the user-typed and assistant
  // turns are persisted — the opening line is re-added on top in either case.
  const initialDraft = (() => {
    try {
      const raw = localStorage.getItem(lsKey(user?.id))
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          return parsed
        }
      }
    } catch {}
    return null
  })()

  const [messages, setMessages] = useState(
    initialDraft?.messages || [{ role: 'assistant', content: OPENING }]
  )
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [landed, setLanded] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const originalConcernRef = useRef(initialDraft?.originalConcern || null) // the FIRST user message — verbatim

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, thinking])

  // Shadow conversation state to localStorage so closing the tab mid-flow
  // doesn't lose the user's first concern and any back-and-forth so far.
  // Cleared when the reflection lands (handoff to the Track).
  useEffect(() => {
    // Don't bother persisting if all we have is the opening line.
    if (messages.length <= 1) return
    if (landed) return
    try {
      localStorage.setItem(
        lsKey(user?.id),
        JSON.stringify({
          messages,
          originalConcern: originalConcernRef.current,
        })
      )
    } catch {}
  }, [messages, user?.id, landed])

  function handleInput(e) {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || thinking || landed) return

    // Capture the first user message verbatim — the "original concern."
    if (!originalConcernRef.current) {
      originalConcernRef.current = text
    }

    const userMsg = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setThinking(true)

    try {
      const res = await fetch('/tools/nextsteps/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Only role + content — the API expects standard Anthropic shape
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          userId: user?.id ?? null,
        }),
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()

      // If the endpoint detected a structured Reflection, advance.
      if (data.reflection) {
        // Render the reframe_text as the assistant's final spoken turn,
        // then hand control upward to the parent (which creates the Track
        // and moves to Phase 3).
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reflection.reframe_text },
        ])
        setLanded(true)
        setThinking(false)

        // The reflection has landed — clear the in-flight shadow. The Track
        // (created by the parent next) is the durable artefact from here.
        try { localStorage.removeItem(lsKey(user?.id)) } catch {}

        // Small pause so the person can read the reframe before the screen
        // changes underneath them. The closing line provides the bridge
        // into Phase 3.
        setTimeout(() => {
          onReflectionLanded(data.reflection, originalConcernRef.current)
        }, 1800)
        return
      }

      // Otherwise it's an intermediate conversational turn.
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }])
    } catch (err) {
      console.error('NextSteps chat error:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong on my side. Try sending that again.',
        },
      ])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="ns-chat">
      <div className="ns-msgs" ref={msgsRef => msgsRef && (msgsRef._ref = bottomRef)}>
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} isFirst={i === 0} />
        ))}
        {thinking && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {!landed && (
        <div className="ns-input-row">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="What's there right now…"
            rows={1}
            disabled={thinking}
            className="ns-input"
          />
          <button
            type="button"
            className="ns-send"
            onClick={send}
            disabled={!input.trim() || thinking}
          >
            Send
          </button>
        </div>
      )}

      <style>{`
        .ns-chat {
          display: flex;
          flex-direction: column;
          height: calc(100dvh - 56px);
          padding: 0;
          position: relative;
        }
        .ns-msgs {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 28px 24px 16px;
          max-width: 680px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }
        /* First bubble (opener) — larger, more presence */
        .ns-bubble.assistant.ns-opener {
          background: transparent;
          border: none;
          padding: 0 0 16px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(1.35rem, 2.2vw, 1.65rem);
          font-weight: 400;
          line-height: 1.55;
          color: rgba(15,21,35,0.88);
          max-width: 100%;
          border-bottom: 1px solid rgba(168,114,26,0.18);
        }
        .ns-bubble {
          padding: 14px 20px;
          border-radius: 3px;
          font-family: 'Lora', Georgia, serif;
          font-size: 1rem;
          line-height: 1.65;
          max-width: 86%;
          color: #0F1523;
        }
        .ns-bubble.assistant {
          background: #FFFFFF;
          border: 1px solid rgba(168,114,26,0.16);
          align-self: flex-start;
          box-shadow: 0 2px 8px rgba(15,21,35,0.06);
        }
        .ns-bubble.user {
          background: rgba(168,114,26,0.08);
          border: 1px solid rgba(168,114,26,0.20);
          align-self: flex-end;
        }
        /* Input row — sticky at bottom */
        .ns-input-row {
          flex-shrink: 0;
          display: flex;
          gap: 10px;
          align-items: flex-end;
          background: #FFFFFF;
          border-top: 1px solid rgba(168,114,26,0.18);
          border-radius: 0;
          padding: 14px 24px;
          max-width: 680px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .ns-input {
          flex: 1;
          border: none;
          outline: none;
          resize: none;
          font-family: 'Lora', Georgia, serif;
          font-size: 1rem;
          line-height: 1.55;
          color: #0F1523;
          background: transparent;
          padding: 4px 0;
          min-height: 28px;
        }
        .ns-input::placeholder {
          color: rgba(15,21,35,0.38);
          font-style: italic;
        }
        .ns-send {
          background: #C8922A;
          color: #FFFFFF;
          border: none;
          border-radius: 3px;
          padding: 10px 20px;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.8rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .ns-send:hover:not(:disabled) { background: #A8721A; }
        .ns-send:disabled {
          background: rgba(15,21,35,0.15);
          cursor: not-allowed;
        }
        .ns-typing {
          align-self: flex-start;
          display: inline-flex;
          gap: 5px;
          padding: 16px 20px;
          background: #FFFFFF;
          border: 1px solid rgba(168,114,26,0.16);
          border-radius: 3px;
          box-shadow: 0 2px 8px rgba(15,21,35,0.06);
        }
        .ns-typing span {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(168,114,26,0.50);
          animation: ns-bounce 1.2s infinite;
        }
        .ns-typing span:nth-child(2) { animation-delay: 0.15s; }
        .ns-typing span:nth-child(3) { animation-delay: 0.30s; }
        @keyframes ns-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @media (max-width: 640px) {
          .ns-msgs { padding: 32px 18px 16px; }
          .ns-input-row { padding: 12px 18px; }
          .ns-bubble.assistant.ns-opener { font-size: 1.2rem; }
        }
      `}</style>
    </div>
  )
}

function Bubble({ role, content, isFirst }) {
  const cls = `ns-bubble ${role}${isFirst && role === 'assistant' ? ' ns-opener' : ''}`
  return <div className={cls}>{content}</div>
}

function TypingDots() {
  return (
    <div className="ns-typing">
      <span></span><span></span><span></span>
    </div>
  )
}
