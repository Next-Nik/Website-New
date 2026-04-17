import { useState, useRef, useEffect } from 'react'
import { ToolCompassPanel } from '../../components/ToolCompassPanel'
import { Nav } from '../../components/Nav'
import { ChatBubble } from '../../components/ChatBubble'
import { TypingIndicator } from '../../components/TypingIndicator'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const gold  = { color: '#A8721A' }
const meta  = { color: 'rgba(15,21,35,0.78)' }

const OPENING_MESSAGE = `Tell me where you are right now — what's present, what's on your mind, or just how things feel. I'll work out where to point you from there.`

export function OrienteeringPage() {
  const { user, loading } = useAuth()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: OPENING_MESSAGE }
  ])
  const [input, setInput]     = useState('')
  const [thinking, setThinking] = useState(false)
  const [done, setDone]       = useState(false)
  const bottomRef   = useRef(null)
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

      // B2 fix: API returns { message }, not { content[0].text }
      const raw = data.message || ''

      // B3 fix: parse result JSON and render result card
      let parsed = null
      try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) } catch {}

      if (parsed?.type === 'results') {
        setMessages(prev => [...prev, { role: 'result', data: parsed }])
        setDone(true)

        // M1 fix: write North Star notes for signed-in full-page users
        if (user?.id && parsed.stage) {
          try { await supabase.from('north_star_notes').delete().eq('user_id', user.id).eq('tool', 'orienteering') } catch {}
          const oriNotes = [
            parsed.stage       ? `Orienteering stage: ${parsed.stage}` : null,
            parsed.stage_note  ? `Stage context: ${parsed.stage_note}` : null,
            parsed.recommendations?.[0]?.title ? `Recommended entry point: ${parsed.recommendations[0].title}` : null,
          ].filter(Boolean)
          if (oriNotes.length) {
            try { await supabase.from('north_star_notes').insert(oriNotes.map(note => ({ user_id: user.id, tool: 'orienteering', note }))) } catch {}
          }
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: raw }])
      }
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
          <span className="tool-eyebrow">Horizon Suite</span>
          <h1 className="tool-title">Orienteering</h1>
          <p style={{ ...body, fontSize: '1.25rem', fontWeight: 300, ...meta, marginTop: '6px', lineHeight: 1.65, maxWidth: '420px' }}>
            A short conversation — three to five exchanges — that reads where you are and points you somewhere real. No jargon, no sign-up required.
          </p>
        </div>

        <div className="chat-thread">
          {messages.map((m, i) => {
            if (m.role === 'result') {
              const d = m.data
              return (
                <div key={i} style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', padding: '22px', alignSelf: 'flex-start', maxWidth: '92%', marginBottom: '8px' }}>
                  {d.stage && <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', ...gold, marginBottom: '8px' }}>{d.stage}</div>}
                  <div style={{ ...body, fontSize: '16px', lineHeight: 1.8, color: '#0F1523', marginBottom: '16px' }}>{d.reflection}</div>
                  {(d.recommendations || []).map((r, ri) => (
                    <div key={ri} style={{ borderTop: '1px solid rgba(200,146,42,0.20)', paddingTop: '14px', marginTop: '14px' }}>
                      <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...meta, marginBottom: '4px' }}>{r.category}</div>
                      <div style={{ ...body, fontSize: '17px', color: '#0F1523', marginBottom: '4px' }}>{r.title}</div>
                      <div style={{ ...body, fontSize: '17px', ...meta, lineHeight: 1.65, marginBottom: '8px' }}>{r.description}</div>
                      {r.link && r.link !== 'null' && (
                        <a href={r.link} style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', ...gold, textDecoration: 'none' }}>
                          {r.link_text || 'Learn more \u2192'}
                        </a>
                      )}
                    </div>
                  ))}
                  {d.closing && (
                    <div style={{ ...body, fontSize: '15px', ...meta, marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(200,146,42,0.20)' }}>
                      {d.closing}
                    </div>
                  )}
                </div>
              )
            }
            return <ChatBubble key={i} role={m.role} content={m.content} />
          })}
          {thinking && (
            <div className="bubble bubble-assistant">
              <TypingIndicator />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* I2 fix: sign-in nudge only appears after results, not on page load */}
        {done && !loading && !user && (
          <div style={{
            marginTop: '1.5rem',
            padding: '16px 20px',
            background: 'rgba(200,146,42,0.05)',
            border: '1px solid rgba(200,146,42,0.20)',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <p style={{ ...body, fontSize: '1.125rem', fontWeight: 300, ...meta, margin: '0 0 8px', lineHeight: 1.6 }}>
              Sign in and North Star carries what it's learned about you into every other tool.
            </p>
            <a href={`/login?redirect=${encodeURIComponent(window.location.href)}`}
              style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, textDecoration: 'none' }}>
              Sign in to save your results →
            </a>
          </div>
        )}

        {/* M2 fix: hide input after results */}
        {!done && (
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
