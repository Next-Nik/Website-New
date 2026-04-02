import { useState, useRef, useEffect } from 'react'
import { Nav } from '../../components/Nav'
import { ChatBubble } from '../../components/ChatBubble'
import { TypingIndicator } from '../../components/TypingIndicator'
import { useAuth } from '../../hooks/useAuth'
import { DomainsPanel } from '../../components/DomainsPanel'

const OPENING_MESSAGE = `Welcome. I’m here to help you find your direction.

Orienteering is about navigating toward what matters — not optimising a path that isn’t yours.

Where are you right now? Tell me what’s present for you.`

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
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 300, color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.65, maxWidth: '420px' }}>
            Not sure where to start? Begin here. A conversation to find your direction.
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
          <p style={{
            marginTop: '1.25rem',
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}>
            <a href={`/login.html?redirect=${encodeURIComponent(window.location.href)}`}>
              Sign in
            </a>
            {' '}to save your results.
          </p>
        )}
      </div>
      <DomainsPanel />
    </div>
  )
}
