import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { AccessGate } from '../../components/AccessGate'
import { supabase } from '../../hooks/useSupabase'
import { ArchetypeReferencePanel } from '../../components/ArchetypeReferencePanel'

// ─── Constants ────────────────────────────────────────────────────────────────

const SS_KEY = 'pp_first_look'

const ARCHETYPES = [
  'Steward','Maker','Architect','Connector','Guardian','Explorer','Sage','Mirror','Exemplar'
]

const ARCHETYPE_GLYPHS = {
  Steward: '◈', Maker: '◉', Architect: '◎', Connector: '⊕',
  Guardian: '◍', Explorer: '◌', Sage: '◯', Mirror: '⊙', Exemplar: '✦'
}

const NEXUS_DOMAINS = [
  { id: 'human-being',     label: 'Human Being',      glyph: '◯' },
  { id: 'society',         label: 'Society',           glyph: '⊕' },
  { id: 'nature',          label: 'Nature',            glyph: '◉' },
  { id: 'technology',      label: 'Technology',        glyph: '◎' },
  { id: 'finance-economy', label: 'Finance & Economy', glyph: '◈' },
  { id: 'legacy',          label: 'Legacy',            glyph: '◍' },
  { id: 'vision',          label: 'Vision',            glyph: '✦' },
]

const SCALES = [
  { id: 'individual',      label: 'Individual',      desc: 'One person at a time. Deep, direct, relational.',        glyph: '◯' },
  { id: 'community',       label: 'Community',       desc: 'Groups, organisations, local systems.',                  glyph: '⊕' },
  { id: 'civilisational',  label: 'Civilisational',  desc: 'Infrastructure, policy, ideas that travel at scale.',   glyph: '✦' },
]

// ─── Shared styles ────────────────────────────────────────────────────────────

const sc    = { fontFamily: "var(--font-sc)" }
const serif = { fontFamily: "var(--font-body)" }
const gold  = { color: "var(--gold-dk)" }
const muted = { color: "var(--text-muted)" }
const meta  = { color: "var(--text-meta)" }

// ─── Spinning heptagon background ────────────────────────────────────────────

function SpinningHeptagon({ opacity = 0.06, speed = '40s', reverse = false }) {
  const n = 7
  const cx = 200, cy = 200, r = 160
  const rings = [0.3, 0.55, 0.75, 1].map(ratio => {
    const pts = Array.from({ length: n }, (_, i) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2
      return `${cx + r * ratio * Math.cos(a)},${cy + r * ratio * Math.sin(a)}`
    }).join(' ')
    return (
      <polygon key={ratio} points={pts}
        fill="none" stroke="rgba(200,146,42,0.6)" strokeWidth="0.8"
        strokeDasharray={ratio < 1 ? '3 5' : undefined}
      />
    )
  })
  const axes = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="rgba(200,146,42,0.4)" strokeWidth="0.6" />
  })
  const labels = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const d = NEXUS_DOMAINS[i]
    return (
      <text key={i}
        x={cx + (r + 18) * Math.cos(a)} y={cy + (r + 18) * Math.sin(a)}
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Cormorant SC',Georgia,serif" fontSize="13" letterSpacing="0.5"
        fill="rgba(200,146,42,0.7)">{d?.label?.toUpperCase().slice(0,6)}
      </text>
    )
  })
  const animId = `spin-${reverse ? 'r' : 'f'}`
  return (
    <svg viewBox="0 0 400 400" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, pointerEvents: 'none' }}>
      <style>{`
        @keyframes ${animId} {
          from { transform: rotate(0deg); transform-origin: 200px 200px; }
          to   { transform: rotate(${reverse ? '-' : ''}360deg); transform-origin: 200px 200px; }
        }
      `}</style>
      <g style={{ animation: `${animId} ${speed} linear infinite` }}>
        {rings}{axes}{labels}
      </g>
    </svg>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ act, totalActs = 3 }) {
  const pct = (act / totalActs) * 100
  const labels = ['', 'Archetype', 'Domain', 'Scale']
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              border: `1.5px solid ${act >= i ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.2)'}`,
              background: act > i ? 'rgba(200,146,42,0.15)' : act === i ? 'rgba(200,146,42,0.08)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...sc, fontSize: '13px', letterSpacing: '0.1em',
              color: act >= i ? 'var(--gold-dk)' : 'rgba(200,146,42,0.4)',
              transition: 'all 0.4s ease',
            }}>{act > i ? '✓' : i}</div>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: act >= i ? 'var(--gold-dk)' : 'rgba(200,146,42,0.4)', textTransform: 'uppercase' }}>{labels[i]}</span>
          </div>
        ))}
      </div>
      <div style={{ height: '2px', background: 'rgba(200,146,42,0.12)', borderRadius: '1px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: '1px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ─── Auth modal ───────────────────────────────────────────────────────────────

function AuthModal() {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '40px 32px 32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <span style={{ display: 'block', ...sc, fontSize: '13px', letterSpacing: '0.22em', ...gold, textTransform: 'uppercase', marginBottom: '14px' }}>Purpose Piece</span>
        <h2 style={{ ...sc, fontSize: '1.375rem', fontWeight: 400, color: 'var(--text)', marginBottom: '10px' }}>Sign in to begin.</h2>
        <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...meta, lineHeight: 1.7, marginBottom: '24px' }}>Your archetype and contribution pattern are saved to your profile.</p>
        <a href={`/login?redirect=${returnUrl}`} style={{ display: 'block', padding: '14px 24px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: 'var(--gold-dk)', ...sc, fontSize: '0.875rem', letterSpacing: '0.14em', textDecoration: 'none' }}>
          Sign in or create account {'→'}
        </a>
      </div>
    </div>
  )
}

// ─── Deep gate modal ──────────────────────────────────────────────────────────

function DeepGateModal({ onUnlock, onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '40px 32px 32px', maxWidth: '440px', width: '100%' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '14px' }}>Go Deeper</div>
        <h2 style={{ ...sc, fontSize: '1.375rem', fontWeight: 400, color: 'var(--text)', marginBottom: '12px', lineHeight: 1.2 }}>The tension. The shadow. The full picture.</h2>
        <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...meta, lineHeight: 1.75, marginBottom: '24px' }}>The First Look gave you the shape. The Deep Dive is a real conversation {'—'} into what this pattern costs you, where it breaks, and what it{'’'}s been asking of you.</p>
        <button onClick={onUnlock} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', ...gold, ...sc, fontSize: '0.875rem', letterSpacing: '0.14em', cursor: 'pointer', marginBottom: '12px' }}>Unlock the Deep Dive</button>
        <button onClick={onDismiss} style={{ display: 'block', width: '100%', background: 'none', border: 'none', ...serif, fontSize: '0.875rem', fontStyle: 'italic', ...muted, cursor: 'pointer', padding: '6px' }}>Not now</button>
      </div>
    </div>
  )
}

// ─── Act 1: Archetype conversation ────────────────────────────────────────────

function ActArchetype({ user, onComplete }) {
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [thinking,  setThinking]  = useState(false)
  const [session,   setSession]   = useState(null)
  const [complete,  setComplete]  = useState(false)
  const [result,    setResult]    = useState(null) // { archetype, synthesis }
  const [revealing, setRevealing] = useState(false)

  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const sessionRef  = useRef(null)
  const startedRef  = useRef(false)

  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, thinking])
  useEffect(() => { if (startedRef.current || !user) return; startedRef.current = true; start() }, [user])

  async function call(msgs) {
    const res = await fetch('/tools/purpose-piece/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, session: sessionRef.current })
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }

  async function start() {
    setThinking(true)
    try {
      const data = await call([])
      setThinking(false)
      handleResponse(data)
    } catch {
      setThinking(false)
      addMsg('assistant', 'Something went wrong. Please refresh and try again.')
    }
  }

  function handleResponse(data) {
    if (data.session) setSession(data.session)

    if (data.message) {
      if (data.inputMode === 'buttons' && data.options?.length > 0) {
        addMsg('assistant', data.message)
        addMsg('options', '', { options: data.options })
      } else {
        addMsg('assistant', data.message)
      }
    }

    // Archetype resolved — move to reveal
    if (data.complete || (data.session?.archetype && data.phase === 4)) {
      const archetype = data.session?.archetype || sessionRef.current?.archetype
      const synthesis = data.session?.synthesis || {}
      if (archetype) {
        setResult({ archetype, synthesis, session: data.session || sessionRef.current })
        setComplete(true)
        setRevealing(true)
      }
    }

    if (data.autoAdvance) {
      setTimeout(async () => {
        setThinking(true)
        try { const d = await call([]); setThinking(false); handleResponse(d) }
        catch { setThinking(false) }
      }, data.advanceDelay || 500)
    }
  }

  function addMsg(type, content, extra = {}) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), type, content, ...extra }])
  }

  async function send() {
    const text = input.trim(); if (!text || thinking || complete) return
    addMsg('user', text); setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setThinking(true)
    try {
      const data = await call([{ role: 'user', content: text }])
      setThinking(false); handleResponse(data)
    } catch { setThinking(false); addMsg('assistant', 'Something went wrong. Please try again.') }
  }

  async function handleOptionSelect(id) {
    addMsg('user', id.toUpperCase()); setThinking(true)
    try {
      const data = await call([{ role: 'user', content: id.toUpperCase() }])
      setThinking(false); handleResponse(data)
    } catch { setThinking(false); addMsg('assistant', 'Something went wrong.') }
  }

  // ── Reveal screen ──────────────────────────────────────────────────────────
  if (revealing && result) {
    const glyph = ARCHETYPE_GLYPHS[result.archetype] || '◯'
    return (
      <div style={{ position: 'relative', minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', overflow: 'hidden' }}>
        <SpinningHeptagon opacity={0.08} speed="50s" />
        <style>{`@keyframes archetypeIn { from { opacity:0; transform:scale(0.88) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', animation: 'archetypeIn 0.7s ease-out forwards' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '20px' }}>Your archetype</div>
          <div style={{ fontSize: '52px', marginBottom: '16px', lineHeight: 1, filter: 'drop-shadow(0 0 12px rgba(200,146,42,0.4))' }}>{glyph}</div>
          <h1 style={{ ...sc, fontSize: 'clamp(2rem,6vw,3.5rem)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.05, marginBottom: '16px' }}>{result.archetype}</h1>
          {result.synthesis?.your_signal && (
            <p style={{ ...serif, fontSize: '1rem', fontStyle: 'italic', ...meta, lineHeight: 1.8, maxWidth: '480px', margin: '0 auto 32px' }}>
              {result.synthesis.your_signal}
            </p>
          )}
          <button onClick={() => onComplete(result)} style={{ ...sc, fontSize: '0.875rem', letterSpacing: '0.14em', ...gold, background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '13px 32px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
            Now find your domain {'→'}
          </button>
        </div>
      </div>
    )
  }

  // ── Conversation ───────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '12px' }}>Act 1 {'·'} Archetype</div>
      <h2 style={{ ...serif, fontSize: 'clamp(1.5rem,4vw,2.25rem)', fontWeight: 300, color: 'var(--text)', lineHeight: 1.1, marginBottom: '8px' }}>
        What did life ask you to bring?
      </h2>
      <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, marginBottom: '24px', lineHeight: 1.65 }}>
        Not what you chose. What kept showing up anyway.
      </p>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.2)', marginBottom: '24px' }} />

      <div className="chat-thread" style={{ marginBottom: '16px' }}>
        {messages.map(m => {
          if (m.type === 'user') return <div key={m.id} className="bubble bubble-user">{m.content}</div>
          if (m.type === 'options') return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '92%' }}>
              {m.options?.map(opt => (
                <button key={opt.id} onClick={() => handleOptionSelect(opt.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)'; e.currentTarget.style.background = 'rgba(200,146,42,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.25)'; e.currentTarget.style.background = '#FFFFFF' }}>
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', ...gold, flexShrink: 0, width: '16px' }}>{opt.id.toUpperCase()}</span>
                  <span style={{ ...serif, fontSize: '0.9375rem', ...meta, lineHeight: 1.5 }}>{opt.text}</span>
                </button>
              ))}
            </div>
          )
          return <div key={m.id} className="bubble bubble-assistant">{m.content}</div>
        })}
        {thinking && <div className="bubble bubble-assistant"><div className="typing-indicator"><span /><span /><span /></div></div>}
        <div ref={bottomRef} />
      </div>

      {!complete && messages.length > 0 && (
        <div className="input-area">
          <textarea ref={textareaRef} value={input}
            onChange={e => { setInput(e.target.value); if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px` } }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={'Type your answer…'} rows={1} disabled={thinking}
          />
          <button className="btn-send" onClick={send} disabled={!input.trim() || thinking}>Send</button>
        </div>
      )}
    </div>
  )
}

// ─── Act 2: Domain selection ──────────────────────────────────────────────────

function ActDomain({ archetype, session, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const glyph = ARCHETYPE_GLYPHS[archetype] || '◯'

  // AI suggestion based on archetype — simple heuristic for now
  const suggestions = {
    Steward: 'nature', Maker: 'technology', Architect: 'vision',
    Connector: 'society', Guardian: 'legacy', Explorer: 'human-being',
    Sage: 'human-being', Mirror: 'society', Exemplar: 'vision'
  }
  const suggested = suggestions[archetype]

  function confirm() {
    if (!selected) return
    setConfirming(true)
    setTimeout(() => onComplete({ domain: selected }), 600)
  }

  return (
    <div>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '12px' }}>Act 2 {'·'} Domain</div>
      <h2 style={{ ...serif, fontSize: 'clamp(1.5rem,4vw,2.25rem)', fontWeight: 300, color: 'var(--text)', lineHeight: 1.1, marginBottom: '8px' }}>
        Where does your work land hardest?
      </h2>
      <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, marginBottom: '8px', lineHeight: 1.65 }}>
        The {archetype} pattern shows up in every domain. But one is where your effort compounds most.
      </p>
      {suggested && (
        <p style={{ ...serif, fontSize: '0.875rem', ...meta, marginBottom: '24px', lineHeight: 1.6 }}>
          <span style={{ ...gold }}>{glyph}</span> Based on what emerged, {' '}
          <span style={{ ...gold }}>{NEXUS_DOMAINS.find(d => d.id === suggested)?.label}</span> may be your strongest signal. Trust your instinct.
        </p>
      )}
      <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.2)', marginBottom: '24px' }} />

      {/* Heptagon visual + domain cards */}
      <div style={{ position: 'relative', marginBottom: '28px' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '300px', height: '300px', pointerEvents: 'none', zIndex: 0 }}>
          <SpinningHeptagon opacity={0.07} speed="60s" />
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '10px' }}>
          {NEXUS_DOMAINS.map(d => {
            const isSel = selected === d.id
            const isSug = d.id === suggested
            return (
              <div key={d.id} onClick={() => setSelected(d.id)}
                style={{ padding: '16px', border: `1.5px solid ${isSel ? 'rgba(200,146,42,0.78)' : isSug ? 'rgba(200,146,42,0.4)' : 'rgba(200,146,42,0.18)'}`, borderRadius: '12px', background: isSel ? 'rgba(200,146,42,0.08)' : isSug ? 'rgba(200,146,42,0.03)' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
                onMouseEnter={e => { if (!isSel) { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.55)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
                onMouseLeave={e => { if (!isSel) { e.currentTarget.style.borderColor = isSug ? 'rgba(200,146,42,0.4)' : 'rgba(200,146,42,0.18)'; e.currentTarget.style.transform = '' } }}>
                <div style={{ fontSize: '22px', marginBottom: '8px', filter: isSel ? 'drop-shadow(0 0 6px rgba(200,146,42,0.5))' : 'none' }}>{d.glyph}</div>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: isSel ? 'var(--gold-dk)' : 'var(--text)', marginBottom: '4px' }}>{d.label}</div>
                {isSug && <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(200,146,42,0.6)', textTransform: 'uppercase' }}>suggested</div>}
              </div>
            )
          })}
        </div>
      </div>

      <button onClick={confirm} disabled={!selected || confirming}
        style={{ ...sc, fontSize: '0.875rem', letterSpacing: '0.14em', ...gold, background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '13px 32px', cursor: !selected ? 'not-allowed' : 'pointer', opacity: !selected ? 0.4 : 1, transition: 'all 0.2s' }}>
        {confirming ? 'Confirming…' : 'This is my domain →'}
      </button>
    </div>
  )
}

// ─── Act 3: Scale selection ───────────────────────────────────────────────────

function ActScale({ archetype, domain, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const domainLabel = NEXUS_DOMAINS.find(d => d.id === domain)?.label || domain

  function confirm() {
    if (!selected) return
    setConfirming(true)
    setTimeout(() => onComplete({ scale: selected }), 600)
  }

  return (
    <div>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '12px' }}>Act 3 {'·'} Scale</div>
      <h2 style={{ ...serif, fontSize: 'clamp(1.5rem,4vw,2.25rem)', fontWeight: 300, color: 'var(--text)', lineHeight: 1.1, marginBottom: '8px' }}>
        At what level does your work want to operate?
      </h2>
      <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, marginBottom: '24px', lineHeight: 1.65 }}>
        A {archetype} working in {domainLabel} can operate at every level. Which one pulls?
      </p>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.2)', marginBottom: '24px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        {SCALES.map(s => {
          const isSel = selected === s.id
          return (
            <div key={s.id} onClick={() => setSelected(s.id)}
              style={{ padding: '20px 22px', border: `1.5px solid ${isSel ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.2)'}`, borderRadius: '12px', background: isSel ? 'rgba(200,146,42,0.06)' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '16px' }}
              onMouseEnter={e => { if (!isSel) { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.45)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
              onMouseLeave={e => { if (!isSel) { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.2)'; e.currentTarget.style.transform = '' } }}>
              <div style={{ fontSize: '28px', flexShrink: 0, filter: isSel ? 'drop-shadow(0 0 8px rgba(200,146,42,0.45))' : 'none', transition: 'filter 0.3s' }}>{s.glyph}</div>
              <div>
                <div style={{ ...sc, fontSize: '0.9375rem', letterSpacing: '0.08em', color: isSel ? 'var(--gold-dk)' : 'var(--text)', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ ...serif, fontSize: '0.9rem', fontStyle: 'italic', ...muted, lineHeight: 1.55 }}>{s.desc}</div>
              </div>
              {isSel && <div style={{ marginLeft: 'auto', ...sc, fontSize: '1rem', ...gold }}>{'✓'}</div>}
            </div>
          )
        })}
      </div>

      <button onClick={confirm} disabled={!selected || confirming}
        style={{ ...sc, fontSize: '0.875rem', letterSpacing: '0.14em', ...gold, background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '13px 32px', cursor: !selected ? 'not-allowed' : 'pointer', opacity: !selected ? 0.4 : 1, transition: 'all 0.2s' }}>
        {confirming ? 'Confirming…' : 'This is my scale →'}
      </button>
    </div>
  )
}

// ─── The Reveal — all three coordinates together ──────────────────────────────

function TheReveal({ archetype, domain, scale, synthesis, onDeepDive, onSave }) {
  const domainObj = NEXUS_DOMAINS.find(d => d.id === domain)
  const scaleObj  = SCALES.find(s => s.id === scale)
  const glyph     = ARCHETYPE_GLYPHS[archetype] || '◯'
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    onSave?.()
    setSaved(true)
  }, [])

  const SYNTHESIS_SECTIONS = [
    { key: 'your_signal',  label: 'Your Signal'  },
    { key: 'your_engine',  label: 'Your Engine'  },
    { key: 'your_calling', label: 'Your Calling' },
    { key: 'the_cost',     label: 'The Cost'     },
  ]

  return (
    <div>
      {/* The three-coordinate card */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '20px', padding: '48px 36px 40px', marginBottom: '24px', textAlign: 'center' }}>
        <SpinningHeptagon opacity={0.05} speed="80s" />
        <SpinningHeptagon opacity={0.03} speed="120s" reverse />

        <style>{`@keyframes revealIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>

        <div style={{ position: 'relative', zIndex: 1, animation: 'revealIn 0.8s ease-out forwards' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', ...gold, textTransform: 'uppercase', marginBottom: '24px' }}>Purpose Piece</div>

          {/* Archetype */}
          <div style={{ fontSize: '48px', marginBottom: '8px', filter: 'drop-shadow(0 0 16px rgba(200,146,42,0.45))' }}>{glyph}</div>
          <h1 style={{ ...sc, fontSize: 'clamp(2.5rem,7vw,4rem)', fontWeight: 400, color: 'var(--text)', lineHeight: 1, marginBottom: '6px' }}>{archetype}</h1>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', ...gold }}>the {archetype?.toLowerCase()}</span>
            <span style={{ ...sc, fontSize: '13px', color: 'rgba(200,146,42,0.4)' }}>{'·'}</span>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'var(--text)' }}>{domainObj?.label}</span>
            <span style={{ ...sc, fontSize: '13px', color: 'rgba(200,146,42,0.4)' }}>{'·'}</span>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'var(--text)' }}>{scaleObj?.label}</span>
          </div>

          {/* Three coordinates */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '32px' }}>
            {[
              { label: 'Archetype', value: archetype, glyph, sublabel: 'How you contribute' },
              { label: 'Domain',    value: domainObj?.label, glyph: domainObj?.glyph, sublabel: 'Where it lands hardest' },
              { label: 'Scale',     value: scaleObj?.label,  glyph: scaleObj?.glyph,  sublabel: 'The level you operate at' },
            ].map(c => (
              <div key={c.label} style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '12px', padding: '16px 12px' }}>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(200,146,42,0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>{c.label}</div>
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{c.glyph}</div>
                <div style={{ ...sc, fontSize: '0.8125rem', letterSpacing: '0.06em', color: 'var(--text)', marginBottom: '4px', lineHeight: 1.2 }}>{c.value}</div>
                <div style={{ ...serif, fontSize: '13px', fontStyle: 'italic', ...muted, lineHeight: 1.4 }}>{c.sublabel}</div>
              </div>
            ))}
          </div>

          {/* Synthesis */}
          {synthesis && (
            <div style={{ textAlign: 'left', background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.2)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '10px', padding: '24px 24px 20px', marginBottom: '28px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(200,146,42,0.12)' }}>The Pattern</div>
              {SYNTHESIS_SECTIONS.map(({ key, label }) => synthesis[key] && (
                <div key={key} style={{ marginBottom: '16px' }}>
                  <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div>
                  <p style={{ ...serif, fontSize: '0.9375rem', lineHeight: 1.85, ...meta, margin: 0 }}>{synthesis[key]}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <button onClick={onDeepDive} style={{ ...sc, fontSize: '0.875rem', letterSpacing: '0.14em', ...gold, background: 'rgba(200,146,42,0.08)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '14px 36px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              Go deeper {'→'}
            </button>
            <a href="/profile" style={{ ...serif, fontSize: '0.875rem', fontStyle: 'italic', ...muted, textDecoration: 'none' }}>View in your profile</a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── First Look Page ──────────────────────────────────────────────────────────

export function PurposePiecePage() {
  const { user, loading: authLoading } = useAuth()
  const { tier, loading: accessLoading } = useAccess('purpose_piece')
  const navigate = useNavigate()

  // act: 1=archetype, 2=domain, 3=scale, 4=reveal
  const [act, setAct]               = useState(1)
  const [archetype, setArchetype]   = useState(null)
  const [domain, setDomain]         = useState(null)
  const [scale, setScale]           = useState(null)
  const [session, setSession]       = useState(null)
  const [synthesis, setSynthesis]   = useState(null)
  const [showDeepGate, setShowDeepGate] = useState(false)

  function handleArchetypeComplete(result) {
    setArchetype(result.archetype)
    setSynthesis(result.synthesis)
    setSession(result.session)
    try { sessionStorage.setItem(SS_KEY + '_working', JSON.stringify(result.session)) } catch {}
    setAct(2)
  }

  function handleDomainComplete(result) {
    setDomain(result.domain)
    setAct(3)
  }

  function handleScaleComplete(result) {
    setScale(result.scale)
    setAct(4)
  }

  async function handleSave() {
    if (!user?.id || !archetype) return
    try {
      await supabase.from('purpose_piece_results').upsert({
        user_id:    user.id,
        archetype,
        domain,
        scale,
        synthesis,
        session,
        completed_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id' })
      // Also save to sessionStorage for Deep Dive
      try {
        const fl = { archetype, domain, scale, synthesis, transcript: session?.transcript || [] }
        sessionStorage.setItem(SS_KEY, JSON.stringify(fl))
      } catch {}
    } catch {}
  }

  function goDeeper() {
    const unlocked = localStorage.getItem('pp_deep_unlocked') === 'true'
    if (!unlocked) { setShowDeepGate(true); return }
    navigate('/tools/purpose-piece/deep')
  }

  function unlockDeep() {
    localStorage.setItem('pp_deep_unlocked', 'true')
    setShowDeepGate(false)
    navigate('/tools/purpose-piece/deep')
  }

  if (authLoading || accessLoading) return <div className="loading" />

  if (tier !== 'full' && tier !== 'beta') {
    return <AccessGate productKey="purpose_piece" toolName="Purpose Piece">{null}</AccessGate>
  }

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />
      {!user && <AuthModal />}
      {showDeepGate && <DeepGateModal onUnlock={unlockDeep} onDismiss={() => setShowDeepGate(false)} />}

      <div className="tool-wrap">
        <div className="tool-header" style={{ marginBottom: '24px' }}>
          <span className="tool-eyebrow">Life OS {'·'} Purpose Piece</span>
          <h1 className="tool-title">The First Look</h1>
        </div>

        {act < 4 && <ProgressBar act={act} />}

        {act === 1 && <ActArchetype user={user} onComplete={handleArchetypeComplete} />}
        {act === 2 && <ActDomain archetype={archetype} session={session} onComplete={handleDomainComplete} />}
        {act === 3 && <ActScale archetype={archetype} domain={domain} onComplete={handleScaleComplete} />}
        {act === 4 && (
          <TheReveal
            archetype={archetype}
            domain={domain}
            scale={scale}
            synthesis={synthesis}
            onDeepDive={goDeeper}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  )
}

// ─── Deep Dive Page (unchanged architecture, richer starting point) ────────────

export function PurposePieceDeepPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [messages,       setMessages]       = useState([])
  const [input,          setInput]          = useState('')
  const [thinking,       setThinking]       = useState(false)
  const [session,        setSession]        = useState(null)
  const [phase,          setPhase]          = useState(null)
  const [progressPct,    setProgressPct]    = useState(20)
  const [progressLabel,  setProgressLabel]  = useState('Deep Conversation')
  const [complete,       setComplete]       = useState(false)
  const [firstLook,      setFirstLook]      = useState(null)
  const [noFirstLook,    setNoFirstLook]    = useState(false)

  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const sessionRef  = useRef(null)
  const startedRef  = useRef(false)

  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, thinking])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.href)}`)
    }
  }, [authLoading, user])

  useEffect(() => {
    if (authLoading || !user || startedRef.current) return
    startedRef.current = true
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      if (raw) {
        const fl = JSON.parse(raw)
        if (fl.archetype) {
          setFirstLook(fl)
          startDeepConversation(fl)
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
      addMsg('assistant', 'Something went wrong. Please refresh and try again.')
    }
  }

  async function callDeepAPI(msgs, fl = null, isFirst = false) {
    const body = { messages: msgs, session: sessionRef.current, ...(isFirst && fl ? { firstLook: fl } : {}) }
    const res = await fetch('/tools/purpose-piece/api/chat-deep', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      setProgressPct(p.pct); setProgressLabel(p.label); setPhase(data.phase)
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
      setTimeout(async () => {
        setThinking(true)
        try { const d = await callDeepAPI([]); setThinking(false); handleResponse(d) }
        catch { setThinking(false) }
      }, data.advanceDelay || 500)
      return
    }
    if (data.complete) { setComplete(true); return }
  }

  function addMsg(type, content, extra = {}) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), type, content, ...extra }])
  }

  async function send() {
    const text = input.trim(); if (!text || thinking || complete) return
    addMsg('user', text); setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setThinking(true)
    try {
      const data = await callDeepAPI([{ role: 'user', content: text }])
      setThinking(false); handleResponse(data)
    } catch { setThinking(false); addMsg('assistant', 'Something went wrong. Please try again.') }
  }

  if (authLoading) return <div className="loading" />

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />
      <div className="tool-wrap">
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS {'·'} Purpose Piece</span>
          <h1 className="tool-title">The Deep Dive</h1>
          {firstLook && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[firstLook.archetype, NEXUS_DOMAINS.find(d=>d.id===firstLook.domain)?.label, SCALES.find(s=>s.id===firstLook.scale)?.label].filter(Boolean).map(v => (
                <span key={v} style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', ...gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '20px', padding: '4px 12px' }}>{v}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: '2px', background: 'rgba(200,146,42,0.12)', borderRadius: '1px', overflow: 'hidden', marginBottom: '6px' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--gold)', transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', ...gold, textTransform: 'uppercase', marginBottom: '20px' }}>{progressLabel}</div>

        {noFirstLook && (
          <div>
            <div className="bubble bubble-assistant">The Deep Dive begins after the First Look. Complete Purpose Piece first, then return here.</div>
            <button onClick={() => navigate('/tools/purpose-piece')} style={{ marginTop: '16px', background: 'none', border: 'none', ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...gold, cursor: 'pointer', padding: 0 }}>
              {'←'} Start the First Look
            </button>
          </div>
        )}

        <div className="chat-thread">
          {messages.map(m => {
            if (m.type === 'label') return <div key={m.id} style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', padding: '8px 0 4px' }}>{m.content}</div>
            if (m.type === 'user') return <div key={m.id} className="bubble bubble-user">{m.content}</div>
            if (m.type === 'profile-html') return <div key={m.id} className="bubble bubble-assistant" dangerouslySetInnerHTML={{ __html: m.content }} />
            if (m.type === 'deep-opening') return (
              <div key={m.id} style={{ maxWidth: '92%', padding: '24px 28px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.25)', borderLeft: '3px solid rgba(200,146,42,0.55)', ...serif, fontSize: '1.05rem', lineHeight: 1.9, ...meta, animation: 'fadeUp 0.4s ease-out' }}>{m.content}</div>
            )
            return <div key={m.id} className="bubble bubble-assistant">{m.content}</div>
          })}
          {thinking && <div className="bubble bubble-assistant"><div className="typing-indicator"><span /><span /><span /></div></div>}
          <div ref={bottomRef} />
        </div>

        {complete && (
          <div style={{ textAlign: 'center', padding: '32px 0 80px' }}>
            <button onClick={() => navigate('/tools/purpose-piece')} style={{ background: 'none', border: 'none', ...gold, cursor: 'pointer', ...serif, fontSize: '0.875rem', fontStyle: 'italic' }}>
              {'←'} Return to Purpose Piece
            </button>
          </div>
        )}

        {!complete && !noFirstLook && (
          <div className="input-area">
            <textarea ref={textareaRef} value={input}
              onChange={e => { setInput(e.target.value); if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px` } }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={'Respond here…'} rows={1} disabled={thinking}
            />
            <button className="btn-send" onClick={send} disabled={!input.trim() || thinking}>Send</button>
          </div>
        )}
      </div>
      <ArchetypeReferencePanel />
    </div>
  )
}
