import { useState, useRef, useEffect } from 'react'
import { ToolCompassPanel } from '../../components/ToolCompassPanel'
import { Nav } from '../../components/Nav'
import { ChatBubble } from '../../components/ChatBubble'
import { TypingIndicator } from '../../components/TypingIndicator'
import { useAuth } from '../../hooks/useAuth'

const OPENING_MESSAGE = `Hi — I’m North Star, your guide here. This usually takes three to five exchanges. At the end you’ll get a reflection on where you are and two or three specific places to start.

Tell me where you are right now — what’s present, what’s on your mind, or just how things feel. I’ll point you somewhere real.`

export function OrienteeringPage() {
  const { user, loading } = useAuth()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: OPENING_MESSAGE }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, thinking])

  function handleInput(e) {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
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
    if (!text || thinking) return

    const userMsg = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setThinking(true)

    try {
      const res = await fetch('/tools/orienteering/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          userId: user?.id ?? null
        })
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)

      const data = await res.json()
      const reply = data.content?.[0]?.text ?? data.reply ?? ''

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' }
      ])
      console.error('Orienteering API error:', err)
    } finally {
      setThinking(false)
    }
  }

  if (loading) return <div className="loading" />

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />

      <div className="tool-wrap">
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS</span>
          <h1 className="tool-title">Orienteering</h1>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.78)', marginTop: '6px', lineHeight: 1.65, maxWidth: '420px' }}>
            A short conversation — three to five exchanges — that reads where you are and points you somewhere real. No jargon, no sign-up required.
          </p>
        </div>

        <div className="chat-thread">
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} content={m.content} />
          ))}
          {thinking && (
            <div className="bubble bubble-assistant">
              <TypingIndicator />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={'Type your response…'}
            rows={1}
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

        {!user && (
          <div style={{
            marginTop: '1.5rem',
            padding: '16px 20px',
            background: 'rgba(200,146,42,0.04)',
            border: '1px solid rgba(200,146,42,0.20)',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.125rem', fontWeight: 300, color: 'rgba(15,21,35,0.78)', margin: '0 0 8px', lineHeight: 1.6 }}>
              North Star will remember where you are and what you’re working on — across every tool.
            </p>
            <a href={`/login?redirect=${encodeURIComponent(window.location.href)}`}
              style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none' }}>
              Sign in to save your results →
            </a>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .tool-wrap { padding-left: 24px; padding-right: 24px; }
          .input-area { flex-direction: column; }
          .input-area textarea, .btn-send { width: 100%; box-sizing: border-box; }
        }
      `}</style>
      <ToolCompassPanel />
    </div>
  )
}
