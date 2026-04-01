import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const SS_KEY = 'pp_first_look'

const PHASE_PROGRESS = {
  1: 15, '1-tiebreaker': 20, '2-fork': 30,
  '2-domain': 45, '2-scale': 60,
  '3-handoff': 75, thinking: 80,
  synthesis: 85, 3: 85, 4: 100
}

const SYNTHESIS_SECTIONS = [
  { key: 'your_signal',  label: 'Your Signal'  },
  { key: 'your_engine',  label: 'Your Engine'  },
  { key: 'your_calling', label: 'Your Calling' },
  { key: 'the_cost',     label: 'The Cost'     },
]

// ─── Shared components ────────────────────────────────────────────────────────

function ProgressBar({ pct, label }) {
  if (!pct) return null
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ height: '2px', background: 'rgba(200,146,42,0.12)', borderRadius: '1px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: '1px', transition: 'width 0.6s ease' }} />
      </div>
      {label && (
        <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.5625rem', letterSpacing: '0.18em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginTop: '6px' }}>
          {label}
        </div>
      )}
    </div>
  )
}

function AssistantBubble({ content, isSynthesis, sections }) {
  if (sections) {
    return (
      <div style={{
        maxWidth: '92%', padding: '24px 28px', borderRadius: '10px',
        background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.25)',
        borderLeft: '3px solid rgba(200,146,42,0.55)',
        boxShadow: '0 2px 8px rgba(200,146,42,0.08)',
        animation: 'fadeUp 0.4s ease-out',
      }}>
        <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.5625rem', letterSpacing: '0.22em', color: 'var(--gold-dk)', textAlign: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(200,146,42,0.15)' }}>
          Initial Reflection
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '22px', paddingBottom: '20px', borderBottom: '1px solid rgba(200,146,42,0.08)', lineHeight: 1.8 }}>
          Here{'\u2019'}s what the pattern in your answers is telling me.
        </div>
        {SYNTHESIS_SECTIONS.map(({ key, label }) => {
          const text = sections[key]
          if (!text) return null
          return (
            <div key={key} style={{ marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.5625rem', letterSpacing: '0.2em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,146,42,0.12)' }}>
                {label}
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', lineHeight: 1.85, color: 'var(--text-meta)', margin: 0 }}>{text}</p>
            </div>
          )
        })}
      </div>
    )
  }

  if (isSynthesis) {
    return (
      <div style={{
        maxWidth: '92%', padding: '24px 28px', borderRadius: '10px',
        background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.25)',
        borderLeft: '3px solid rgba(200,146,42,0.55)',
        fontFamily: 'var(--font-body)', fontSize: '1.05rem',
        lineHeight: 1.9, color: 'var(--text-meta)',
        animation: 'fadeUp 0.4s ease-out',
      }}>
        {content}
      </div>
    )
  }

  return <div className="bubble bubble-assistant">{content}</div>
}

function OptionButtons({ options, onSelect }) {
  const [selected, setSelected] = useState(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '92%', margin: '4px 0' }}>
      {options.map(opt => (
        <button
          key={opt.id}
          disabled={selected !== null}
          onClick={() => {
            setSelected(opt.id)
            setTimeout(() => onSelect(opt.id, opt.text), 200)
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px',
            background: selected === opt.id ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
            border: `1px solid ${selected === opt.id ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.25)'}`,
            borderRadius: '8px',
            cursor: selected !== null ? 'default' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
            opacity: selected !== null && selected !== opt.id ? 0.4 : 1,
          }}
        >
          <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--gold-dk)', flexShrink: 0, width: '16px' }}>
            {opt.id.toUpperCase()}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--text-meta)', lineHeight: 1.5 }}>
            {opt.text}
          </span>
        </button>
      ))}
    </div>
  )
}

function PhaseDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '10px 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(200,146,42,0.2)' }} />
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-dk)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(200,146,42,0.2)' }} />
    </div>
  )
}

function AuthModal({ onDismiss }) {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '40px 32px 32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-sc)', fontSize: '0.625rem', letterSpacing: '0.22em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '14px' }}>
          Purpose Piece
        </span>
        <h2 style={{ fontFamily: 'var(--font-sc)', fontSize: '1.375rem', fontWeight: 400, color: 'var(--text)', marginBottom: '10px' }}>
          Sign in to begin.
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--text-meta)', lineHeight: 1.7, marginBottom: '24px' }}>
          Your archetype and contribution pattern are saved to your profile.
        </p>
        <a href={`/login.html?redirect=${returnUrl}`} style={{ display: 'block', padding: '14px 24px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: 'var(--gold-dk)', fontFamily: 'var(--font-sc)', fontSize: '0.875rem', letterSpacing: '0.14em', textDecoration: 'none', marginBottom: '12px' }}>
          Sign in or create account {'\u2192'}
        </a>
      </div>
    </div>
  )
}

function DeepGateModal({ onUnlock, onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '40px 32px 32px', maxWidth: '440px', width: '100%' }}>
        <div style={{ fontFamily: 'var(--font-sc)', fontSize: '0.625rem', letterSpacing: '0.2em', color: 'var(--gold-dk)', textTransform: 'uppercase', marginBottom: '14px' }}>
          Go Deeper
        </div>
        <h2 style={{ fontFamily: 'var(--font-sc)', fontSize: '1.375rem', fontWeight: 400, color: 'var(--text)', marginBottom: '12px', lineHeight: 1.2 }}>
          The tension. The shadow. The full picture.
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--text-meta)', lineHeight: 1.75, marginBottom: '24px' }}>
          The First Look gave you the shape. The Deep Dive is a real conversation {'\u2014'} into what this pattern costs you, where it breaks, and what it{'\u2019'}s been asking of you. You leave knowing not just what you are, but what that fully asks.
        </p>
        <button onClick={onUnlock} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: 'var(--gold-dk)', fontFamily: 'var(--font-sc)', fontSize: '0.875rem', letterSpacing: '0.14em', cursor: 'pointer', marginBottom: '12px' }}>
          Unlock the Deep Dive
        </button>
        <button onClick={onDismiss} style={{ display: 'block', width: '100%', background: 'none', border: 'none', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}>
          Not now
        </button>
      </div>
    </div>
  )
}

// ─── Profile card (Phase 4 result) ───────────────────────────────────────────

function ProfileCard({ html, onGoDeeper }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    // Wire the Go Deeper button if rendered in HTML
    const btn = ref.current.querySelector('[onclick*="goDeeper"], .btn-go-deeper')
    if (btn) {
      btn.removeAttribute('onclick')
      btn.addEventListener('click', onGoDeeper)
    }
  }, [html])

  // If the API returns HTML, render it — otherwise show a fallback
  if (html && (html.includes('profile-card') || html.includes('deep-output-card'))) {
    return (
      <div
        ref={ref}
        className="bubble bubble-assistant"
        style={{ maxWidth: '100%', padding: 0, background: 'none', border: 'none' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return (
    <div className="bubble bubble-assistant">
      {html}
    </div>
  )
}

// ─── First Look Page ──────────────────────────────────────────────────────────

export function PurposePiecePage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [messages,    setMessages]    = useState([])
  const [input,       setInput]       = useState('')
  const [thinking,    setThinking]    = useState(false)
  const [session,     setSession]     = useState(null)
  const [phase,       setPhase]       = useState(null)
  const [phaseLabel,  setPhaseLabel]  = useState('Signal Reading')
  const [progressPct, setProgressPct] = useState(0)
  const [complete,    setComplete]    = useState(false)
  const [showDeepGate, setShowDeepGate] = useState(false)

  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const sessionRef  = useRef(null)
  const startedRef  = useRef(false)

  useEffect(() => { sessionRef.current = session }, [session])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, thinking])

  useEffect(() => {
    if (authLoading || !user || startedRef.current) return
    startedRef.current = true
    startConversation()
  }, [authLoading, user])

  async function startConversation() {
    try {
      const data = await callAPI([])
      handleResponse(data)
    } catch {
      addMsg('assistant', 'Something went wrong getting started. Please refresh and try again.')
    }
  }

  async function callAPI(msgs) {
    const res = await fetch('/tools/purpose-piece/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, session: sessionRef.current })
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }

  function handleResponse(data) {
    if (data.session) {
      setSession(data.session)
      try { sessionStorage.setItem(SS_KEY + '_working', JSON.stringify(data.session)) } catch {}
    }

    if (data.phase !== undefined) {
      setPhase(data.phase)
      setProgressPct(PHASE_PROGRESS[data.phase] || 0)
      if (data.phaseLabel) setPhaseLabel(data.phaseLabel)
    }

    // Phase divider
    if (data.phaseLabel && data.phase !== phase) {
      addMsg('divider', data.phaseLabel)
    }

    // Question label
    if (data.questionLabel) {
      addMsg('questionLabel', data.questionLabel)
    }

    // Message
    if (data.message) {
      const isSynthesis = data.phase === 'synthesis'
      if (isSynthesis && data.sections) {
        addMsg('synthesis-sections', data.message, { sections: data.sections })
      } else if (data.message.includes('profile-card') || data.message.includes('deep-output-card')) {
        addMsg('profile-html', data.message)
      } else {
        addMsg(isSynthesis ? 'synthesis' : 'assistant', data.message)
      }
    }

    // nextMessage (post-probe-3)
    if (data.nextMessage) {
      setTimeout(() => addMsg('assistant', data.nextMessage), 600)
    }

    // Option buttons
    if (data.inputMode === 'buttons' && data.options?.length > 0) {
      addMsg('options', '', { options: data.options })
    }

    // Complete
    if (data.complete) {
      setComplete(true)
      return
    }

    // Auto-advance
    if (data.autoAdvance) {
      const delay = data.advanceDelay || 500
      if (data.phase === 'synthesis') {
        setTimeout(async () => {
          addMsg('assistant', 'Building your profile now\u2026')
          setThinking(true)
          try {
            const p4data = await callAPI([])
            setThinking(false)
            handleResponse(p4data)
          } catch { setThinking(false) }
        }, delay)
      } else {
        setTimeout(async () => {
          setThinking(true)
          try {
            const nextData = await callAPI([])
            setThinking(false)
            handleResponse(nextData)
          } catch { setThinking(false) }
        }, delay)
      }
    }
  }

  function addMsg(type, content, meta = {}) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), type, content, ...meta }])
  }

  function handleInput(e) {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px` }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  async function send() {
    const text = input.trim()
    if (!text || thinking || complete) return

    addMsg('user', text)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setThinking(true)

    const history = [...messages, { type: 'user', content: text }]
      .filter(m => m.type === 'user' || m.type === 'assistant' || m.type === 'synthesis')
      .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }))

    try {
      const data = await callAPI([{ role: 'user', content: text }])
      setThinking(false)
      handleResponse(data)
    } catch {
      setThinking(false)
      addMsg('assistant', 'Something went wrong. Please try again.')
    }
  }

  async function handleOptionSelect(id, text) {
    const displayText = `${id.toUpperCase()}) ${text}`
    addMsg('user', displayText)
    setThinking(true)
    try {
      const data = await callAPI([{ role: 'user', content: id.toUpperCase() }])
      setThinking(false)
      handleResponse(data)
    } catch {
      setThinking(false)
      addMsg('assistant', 'Something went wrong. Please try again.')
    }
  }

  function goDeeper() {
    try { sessionStorage.setItem(SS_KEY, JSON.stringify(sessionRef.current)) } catch {}
    const unlocked = localStorage.getItem('pp_deep_unlocked') === 'true'
    if (!unlocked) { setShowDeepGate(true); return }
    navigate('/tools/purpose-piece/deep')
  }

  function unlockDeep() {
    localStorage.setItem('pp_deep_unlocked', 'true')
    setShowDeepGate(false)
    navigate('/tools/purpose-piece/deep')
  }

  if (authLoading) return <div className="loading" />

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />

      {!user && <AuthModal />}
      {showDeepGate && <DeepGateModal onUnlock={unlockDeep} onDismiss={() => setShowDeepGate(false)} />}

      <div className="tool-wrap">
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS</span>
          <h1 className="tool-title">Purpose Piece</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '4px' }}>
            What did life ask you to bring?
          </p>
        </div>

        <ProgressBar pct={progressPct} label={phaseLabel} />

        <div className="chat-thread">
          {messages.map(m => {
            if (m.type === 'divider') return <PhaseDivider key={m.id} label={m.content} />
            if (m.type === 'questionLabel') return (
              <div key={m.id} style={{ fontFamily: 'var(--font-sc)', fontSize: '0.5625rem', letterSpacing: '0.2em', color: 'var(--gold-dk)', textTransform: 'uppercase', padding: '4px 0' }}>
                {m.content}
              </div>
            )
            if (m.type === 'options') return (
              <OptionButtons key={m.id} options={m.options} onSelect={handleOptionSelect} />
            )
            if (m.type === 'user') return <div key={m.id} className="bubble bubble-user">{m.content}</div>
            if (m.type === 'synthesis-sections') return <AssistantBubble key={m.id} content={m.content} sections={m.sections} />
            if (m.type === 'synthesis') return <AssistantBubble key={m.id} content={m.content} isSynthesis />
            if (m.type === 'profile-html') return <ProfileCard key={m.id} html={m.content} onGoDeeper={goDeeper} />
            return <div key={m.id} className="bubble bubble-assistant">{m.content}</div>
          })}

          {thinking && (
            <div className="bubble bubble-assistant">
              <div className="typing-indicator"><span /><span /><span /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {!complete && messages.length > 0 && (
          <div className="input-area">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={'Type your answer\u2026'}
              rows={1}
              disabled={thinking}
            />
            <button className="btn-send" onClick={send} disabled={!input.trim() || thinking}>
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Deep Dive Page ───────────────────────────────────────────────────────────

export function PurposePieceDeepPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [messages,    setMessages]    = useState([])
  const [input,       setInput]       = useState('')
  const [thinking,    setThinking]    = useState(false)
  const [session,     setSession]     = useState(null)
  const [phase,       setPhase]       = useState(null)
  const [progressPct, setProgressPct] = useState(20)
  const [progressLabel, setProgressLabel] = useState('Deep Conversation')
  const [complete,    setComplete]    = useState(false)
  const [firstLook,   setFirstLook]   = useState(null)
  const [noFirstLook, setNoFirstLook] = useState(false)

  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const sessionRef  = useRef(null)
  const startedRef  = useRef(false)

  useEffect(() => { sessionRef.current = session }, [session])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, thinking])

  // Redirect non-signed-in users
  useEffect(() => {
    if (!authLoading && !user) {
      const returnUrl = encodeURIComponent(window.location.href)
      window.location.href = `/login.html?redirect=${returnUrl}`
    }
  }, [authLoading, user])

  // Load First Look session and start
  useEffect(() => {
    if (authLoading || !user || startedRef.current) return
    startedRef.current = true

    try {
      const raw = sessionStorage.getItem(SS_KEY)
      if (raw) {
        const fl = JSON.parse(raw)
        const synthesis = fl.synthesis || {}
        const loaded = {
          archetype:        fl.archetype || 'Unknown',
          domain:           fl.domain || null,
          scale:            fl.scale || null,
          synthesis_text:   synthesis.synthesis_text || '',
          internal_signals: synthesis.internal_signals || {},
          transcript:       fl.transcript || []
        }
        if (loaded.synthesis_text) {
          setFirstLook(loaded)
          startDeepConversation(loaded)
          return
        }
      }
    } catch {}

    setNoFirstLook(true)
  }, [authLoading, user])

  async function startDeepConversation(fl) {
    addMsg('label', 'The tension')
    try {
      const data = await callDeepAPI([], fl, true)
      handleResponse(data)
    } catch {
      addMsg('assistant', 'Something went wrong getting started. Please refresh and try again.')
    }
  }

  async function callDeepAPI(msgs, fl = null, isFirst = false) {
    const body = {
      messages: msgs,
      session: sessionRef.current,
      ...(isFirst && fl ? { firstLook: fl } : {})
    }
    const res = await fetch('/tools/purpose-piece/api/chat-deep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }

  function handleResponse(data) {
    if (data.session) setSession(data.session)

    const phaseMap = { shadow: { pct: 40, label: 'Deep Conversation' }, mirror: { pct: 80, label: 'The Full Picture' }, complete: { pct: 100, label: 'Deep Dive' } }
    if (data.phase) {
      const p = phaseMap[data.phase] || { pct: 20, label: 'Deep Conversation' }
      setProgressPct(p.pct)
      setProgressLabel(p.label)
      setPhase(data.phase)

      if (data.phase === 'mirror') addMsg('label', 'The full picture')
    }

    if (data.message) {
      if (data.complete && (data.message.includes('deep-output-card') || data.message.includes('profile-card'))) {
        addMsg('profile-html', data.message)
      } else if (data.phase === 'mirror') {
        addMsg('deep-opening', data.message)
      } else {
        addMsg('assistant', data.message)
      }
    }

    if (data.autoAdvance) {
      const delay = data.advanceDelay || 500
      setTimeout(async () => {
        setThinking(true)
        try {
          const next = await callDeepAPI([])
          setThinking(false)
          handleResponse(next)
        } catch { setThinking(false) }
      }, delay)
      return
    }

    if (data.complete) {
      setComplete(true)
      return
    }
  }

  function addMsg(type, content, meta = {}) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), type, content, ...meta }])
  }

  function handleInput(e) {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px` }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  async function send() {
    const text = input.trim()
    if (!text || thinking || complete) return

    addMsg('user', text)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setThinking(true)

    try {
      const data = await callDeepAPI([{ role: 'user', content: text }])
      setThinking(false)
      handleResponse(data)
    } catch {
      setThinking(false)
      addMsg('assistant', 'Something went wrong. Please try again.')
    }
  }

  if (authLoading) return <div className="loading" />

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />

      <div className="tool-wrap">
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS {'\u00B7'} Purpose Piece</span>
          <h1 className="tool-title">The Deep Dive</h1>
        </div>

        <ProgressBar pct={progressPct} label={progressLabel} />

        {noFirstLook && (
          <div>
            <div className="bubble bubble-assistant">
              The Deep Dive begins after the First Look. Complete the Purpose Piece assessment first, then return here.
            </div>
            <button
              onClick={() => navigate('/tools/purpose-piece')}
              style={{ marginTop: '16px', background: 'none', border: 'none', fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--gold-dk)', cursor: 'pointer', padding: 0 }}
            >
              {'\u2190'} Start the First Look
            </button>
          </div>
        )}

        <div className="chat-thread">
          {messages.map(m => {
            if (m.type === 'label') return (
              <div key={m.id} style={{ fontFamily: 'var(--font-sc)', fontSize: '0.5625rem', letterSpacing: '0.2em', color: 'var(--gold-dk)', textTransform: 'uppercase', padding: '8px 0 4px' }}>
                {m.content}
              </div>
            )
            if (m.type === 'user') return <div key={m.id} className="bubble bubble-user">{m.content}</div>
            if (m.type === 'profile-html') return <ProfileCard key={m.id} html={m.content} onGoDeeper={() => {}} />
            if (m.type === 'deep-opening') return (
              <div key={m.id} style={{
                maxWidth: '92%', padding: '24px 28px', borderRadius: '10px',
                background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.25)',
                borderLeft: '3px solid rgba(200,146,42,0.55)',
                fontFamily: 'var(--font-body)', fontSize: '1.05rem',
                lineHeight: 1.9, color: 'var(--text-meta)',
                fontStyle: 'italic',
                animation: 'fadeUp 0.4s ease-out',
              }}>
                {m.content}
              </div>
            )
            return <div key={m.id} className="bubble bubble-assistant">{m.content}</div>
          })}

          {thinking && (
            <div className="bubble bubble-assistant">
              <div className="typing-indicator"><span /><span /><span /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {complete && (
          <div style={{ textAlign: 'center', padding: '32px 0 80px', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
            <button onClick={() => navigate('/tools/purpose-piece')} style={{ background: 'none', border: 'none', color: 'var(--gold-dk)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontStyle: 'italic' }}>
              {'\u2190'} Return to Purpose Piece
            </button>
          </div>
        )}

        {!complete && !noFirstLook && (
          <div className="input-area">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={'Respond here\u2026'}
              rows={1}
              disabled={thinking}
            />
            <button className="btn-send" onClick={send} disabled={!input.trim() || thinking}>
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
