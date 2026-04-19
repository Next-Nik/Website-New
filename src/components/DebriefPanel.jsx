// ─── DebriefPanel ─────────────────────────────────────────────────────────────
// Shared post-tool debrief component. Used by:
//   Target Sprint  — full debrief (6 questions)
//   The Map        — full debrief (6 questions)
//   Purpose Piece  — full debrief (6 questions)
//   Horizon Practice — light debrief (3 questions, optional, skip available)
//   Horizon State  — light debrief (3 questions, fires after period review)
//
// Props:
//   tool        — 'target-sprint' | 'map' | 'purpose-piece' | 'horizon-practice' | 'horizon-state'
//   toolContext  — tool-specific data object (sprint goals, map scores, etc.)
//   userId      — string | null
//   mode        — 'full' | 'light'  (default: 'full')
//   onComplete  — called when debrief is done (receives { note })
//   onSkip      — called if user skips (optional — omit to hide skip button)
//   title       — override the section eyebrow (optional)

import { useState, useRef, useEffect } from 'react'
import { ROUTES } from '../constants/routes'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const gold  = { color: '#A8721A' }
const muted = { color: 'rgba(15,21,35,0.78)' }

function ThinkingDots() {
  return (
    <div className="bubble bubble-assistant">
      <div className="typing-indicator"><span /><span /><span /></div>
    </div>
  )
}

export function DebriefPanel({ tool, toolContext, userId, mode = 'full', onComplete, onSkip, title }) {
  const [msgs,      setMsgs]      = useState([])
  const [input,     setInput]     = useState('')
  const [thinking,  setThinking]  = useState(false)
  const [done,      setDone]      = useState(false)
  const [begun,     setBegun]     = useState(false)
  const startedRef  = useRef(false)
  const bottomRef   = useRef(null)
  const taRef       = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [msgs, thinking])

  useEffect(() => {
    if (!begun) return
    if (startedRef.current) return
    startedRef.current = true
    start()
  }, [begun])

  async function call(messages) {
    const res = await fetch(ROUTES.api.debriefChat, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tool, toolContext, messages, userId, mode }),
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }

  async function start() {
    setThinking(true)
    try {
      const d = await call([{ role: 'user', content: 'START' }])
      setThinking(false)
      if (d.message) setMsgs([{ role: 'assistant', content: d.message }])
      if (d.complete) handleComplete(d)
    } catch {
      setThinking(false)
      setMsgs([{ role: 'assistant', content: 'Something went wrong. Please refresh.' }])
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || thinking || done) return
    const next = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
    setThinking(true)
    try {
      const d = await call(next)
      setThinking(false)
      if (d.message) setMsgs(p => [...p, { role: 'assistant', content: d.message }])
      if (d.complete) handleComplete(d)
    } catch {
      setThinking(false)
      setMsgs(p => [...p, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
  }

  function handleComplete(d) {
    setDone(true)
    onComplete?.({ note: d.note })
  }

  const eyebrow = title || (mode === 'light' ? 'Reflect' : 'Debrief')

  // Before the user consents — offer, don't dump
  if (!begun) {
    return (
      <div style={{
        padding: '28px',
        background: '#FAFAF7',
        border: '1.5px solid rgba(200,146,42,0.2)',
        borderRadius: '14px',
      }}>
        <span style={{
          ...sc, fontSize: '15px', letterSpacing: '0.2em', ...gold,
          textTransform: 'uppercase', display: 'block', marginBottom: '10px',
        }}>
          {eyebrow}
        </span>
        <p style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.7, marginBottom: '24px' }}>
          {mode === 'light'
            ? 'Three questions. A moment to close the loop. North Star is ready when you are.'
            : 'Six questions. North Star will listen and carry what you share forward. Ready when you are.'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setBegun(true)}
            style={{
              ...sc, fontSize: '1.125rem', letterSpacing: '0.14em', ...gold,
              background: 'rgba(200,146,42,0.05)',
              border: '1.5px solid rgba(200,146,42,0.78)',
              borderRadius: '40px', padding: '12px 28px',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            Begin →
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              style={{
                background: 'none', border: 'none',
                ...body, fontSize: '1.0625rem',
                color: 'rgba(15,21,35,0.42)',
                cursor: 'pointer', padding: 0,
              }}
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      padding: '28px',
      background: '#FAFAF7',
      border: '1.5px solid rgba(200,146,42,0.2)',
      borderRadius: '14px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <span style={{
          ...sc, fontSize: '15px', letterSpacing: '0.2em', ...gold,
          textTransform: 'uppercase', display: 'block', marginBottom: '6px',
        }}>
          {eyebrow}
        </span>
        <p style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.7, margin: 0 }}>
          {mode === 'light'
            ? 'Three questions. A moment to close the loop.'
            : 'Six questions. North Star is listening — what you share here travels forward.'}
        </p>
      </div>

      {/* Chat thread */}
      <div className="chat-thread" style={{ marginBottom: '14px' }}>
        {msgs.map((m, i) => (
          <div key={i} className={`bubble bubble-${m.role}`}>{m.content}</div>
        ))}
        {thinking && <ThinkingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!done && (
        <div className="input-area">
          <textarea
            ref={taRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              if (taRef.current) {
                taRef.current.style.height = 'auto'
                taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 120)}px`
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder="Write your response…"
            rows={2}
            disabled={thinking}
          />
          <button
            className="btn-send"
            onClick={send}
            disabled={!input.trim() || thinking}
          >
            Send
          </button>
        </div>
      )}

      {/* Skip option — only shown when onSkip is provided and debrief is not done */}
      {!done && onSkip && (
        <button
          onClick={onSkip}
          style={{
            display: 'block',
            marginTop: '12px',
            background: 'none',
            border: 'none',
            ...body,
            fontSize: '1.0625rem',
            color: 'rgba(15,21,35,0.42)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Skip for now
        </button>
      )}
    </div>
  )
}
