import { useState, useEffect, useRef } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { supabase } from '../../hooks/useSupabase'
import { ChatBubble } from '../../components/ChatBubble'
import { TypingIndicator } from '../../components/TypingIndicator'
import { AccessGate } from '../../components/AccessGate'
import { DebriefPanel } from '../../components/DebriefPanel'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const gold  = { color: '#A8721A' }
const muted = { color: 'rgba(15,21,35,0.72)' }
const dark  = { color: '#0F1523' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function getStreakCount(checkins) {
  if (!checkins?.length) return 0
  const dates = [...new Set(checkins.map(c => c.check_date))].sort().reverse()
  let streak = 0
  let cursor = new Date()
  for (const d of dates) {
    const expected = getLocalDateStr(cursor)
    if (d === expected) { streak++; cursor.setDate(cursor.getDate() - 1) }
    else if (streak === 0) { cursor.setDate(cursor.getDate() - 1); if (d === getLocalDateStr(cursor)) { streak++; cursor.setDate(cursor.getDate() - 1) } else break }
    else break
  }
  return streak
}

// ─── Chat hook ────────────────────────────────────────────────────────────────

function useChat(apiPath, systemContext) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, thinking])

  async function send(userText, extraBody = {}) {
    const text = (userText || input).trim()
    if (!text || thinking) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setThinking(true)
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, ...systemContext, ...extraBody }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.message }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setThinking(false)
    }
  }

  function handleInput(e) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return { messages, setMessages, input, setInput, thinking, send, handleInput, handleKeyDown, bottomRef, textareaRef }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      {eyebrow && <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>{eyebrow}</span>}
      <h2 style={{ ...serif, fontSize: 'clamp(24px,4vw,36px)', fontWeight: 300, ...dark, lineHeight: 1.1, margin: '0 0 8px' }}>{title}</h2>
      {subtitle && <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...muted, lineHeight: 1.7, margin: 0 }}>{subtitle}</p>}
    </div>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px', padding: '24px 28px', marginBottom: '16px', ...style }}>
      {children}
    </div>
  )
}

function GoldCard({ children, style = {} }) {
  return (
    <div style={{ background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '24px 28px', marginBottom: '16px', ...style }}>
      {children}
    </div>
  )
}

function Btn({ children, onClick, primary, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-block', padding: '14px 28px', borderRadius: '40px',
      border: primary ? '1px solid rgba(168,114,26,0.8)' : '1.5px solid rgba(200,146,42,0.78)',
      background: primary ? '#C8922A' : 'rgba(200,146,42,0.05)',
      color: primary ? '#FFFFFF' : '#A8721A',
      ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      transition: 'all 0.2s', ...style,
    }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >{children}</button>
  )
}

function ChatInput({ chat, placeholder, disabled }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginTop: '16px' }}>
      <textarea
        ref={chat.textareaRef}
        value={chat.input}
        onChange={chat.handleInput}
        onKeyDown={chat.handleKeyDown}
        placeholder={placeholder || 'Type your response…'}
        rows={1}
        disabled={disabled || chat.thinking}
        style={{
          flex: 1, padding: '12px 16px', borderRadius: '12px',
          border: '1.5px solid rgba(200,146,42,0.30)',
          background: '#FAFAF7', resize: 'none', outline: 'none',
          ...body, fontSize: '16px', fontWeight: 300, ...dark,
          lineHeight: 1.6, maxHeight: '160px', overflow: 'auto',
        }}
      />
      <button onClick={() => chat.send()} disabled={!chat.input.trim() || chat.thinking || disabled}
        style={{
          padding: '12px 20px', borderRadius: '40px',
          border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A',
          color: '#FFFFFF', ...sc, fontSize: '15px', letterSpacing: '0.12em',
          cursor: 'pointer', flexShrink: 0, opacity: (!chat.input.trim() || chat.thinking) ? 0.5 : 1,
        }}>Send</button>
    </div>
  )
}

function ChatThread({ chat, initialMessage }) {
  useEffect(() => {
    if (initialMessage && chat.messages.length === 0) {
      chat.setMessages([{ role: 'assistant', content: initialMessage }])
    }
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
        {chat.messages.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}
        {chat.thinking && <div className="bubble bubble-assistant"><TypingIndicator /></div>}
        <div ref={chat.bottomRef} />
      </div>
    </div>
  )
}

// ─── Map redirect ─────────────────────────────────────────────────────────────

function MapRedirect({ onSkip }) {
  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>One step first</span>
      <h2 style={{ ...serif, fontSize: 'clamp(28px,4vw,40px)', fontWeight: 300, ...dark, lineHeight: 1.1, marginBottom: '20px' }}>Horizon Practice works best with your Map.</h2>
      <p style={{ ...body, fontSize: '17px', fontWeight: 300, ...muted, lineHeight: 1.8, marginBottom: '16px' }}>
        Horizon Practice is built on your horizon goals — where you're going, what the gap is, who you're becoming on the way there. The Map gives North Star everything it needs to work with you properly.
      </p>
      <p style={{ ...body, fontSize: '17px', fontWeight: 300, ...muted, lineHeight: 1.8, marginBottom: '40px' }}>
        Most people take The Map over a few days. No rush — it's thorough.
      </p>
      <Btn primary onClick={() => window.location.href = '/tools/map'}>Begin The Map →</Btn>
      <p style={{ ...body, fontSize: '15px', ...muted, marginTop: '28px', marginBottom: '8px', opacity: 1 }}>
        Already done your Map, or ready to continue?
      </p>
      <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textDecoration: 'underline', padding: 0 }}>
        Continue without Map data
      </button>
    </div>
  )
}


// ─── Domain tooltip copy ───────────────────────────────────────────────────────
const DOMAIN_TIPS = {
  'Path':       'Life’s Mission · Purpose · Dharma · Soul Alignment. The work you were built to do — not your job title, your gift.',
  'Spark':      'Vitality · Energy · Recharge · Joy · Passion. Is the fire on? When Spark is low, everything else runs on fumes.',
  'Body':       'Health · Fitness · The Physical. The instrument through which everything else operates. The only one you get.',
  'Finances':   'Agency · Money · Currency. Do you have the charge to act? This is about agency, not wealth.',
  'Connection': 'Your relationships with others. Not just the presence of people — the quality of what actually passes between you.',
  'Inner Game': 'Your relationship to yourself. The source code — everything else runs on it.',
  'Signal':     'Your relationship to the world. Your public-facing persona and your personal environment.',
}


// ─── Domain input row with tooltip ────────────────────────────────────────────

function DomainInputRow({ domain, value, onChange, serif, sc }) {
  const [showTip, setShowTip] = useState(false)

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative' }}>
      {/* Label + tooltip trigger */}
      <div style={{ minWidth: '100px', flexShrink: 0, paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#A8721A' }}>{domain}</span>
        <button
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          onFocus={() => setShowTip(true)}
          onBlur={() => setShowTip(false)}
          style={{ background: 'none', border: '1px solid rgba(200,146,42,0.35)', borderRadius: '50%', width: '14px', height: '14px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          aria-label={`What is ${domain}?`}
        >
          <span style={{ ...sc, fontSize: '10px', color: '#A8721A', lineHeight: 1 }}>?</span>
        </button>

        {/* Tooltip */}
        {showTip && (
          <div style={{
            position: 'absolute', left: 0, top: '36px', zIndex: 100,
            background: '#0F1523', borderRadius: '10px',
            padding: '12px 16px', width: '280px',
            boxShadow: '0 8px 32px rgba(15,21,35,0.25)',
            pointerEvents: 'none',
          }}>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '5px', textTransform: 'uppercase' }}>{domain}</div>
            <p style={{ ...body, fontSize: '14px', fontWeight: 300, color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, margin: 0 }}>
              {DOMAIN_TIPS[domain]}
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={`Where do you want to be in ${domain.toLowerCase()}?`}
        style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(200,146,42,0.25)', background: '#FAFAF7', ...body, fontSize: '15px', color: '#0F1523', outline: 'none', lineHeight: 1.5 }}
      />
    </div>
  )
}


// ─── Horizon Self tooltip ─────────────────────────────────────────────────────

function HorizonSelfTooltip() {
  const [show, setShow] = useState(false)
  const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }
  const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
  const body  = { fontFamily: "'Lora', Georgia, serif" }
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        style={{ background: 'none', border: '1px solid rgba(200,146,42,0.45)', borderRadius: '50%', width: '14px', height: '14px', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        aria-label="What is the Horizon Self?"
      >
        <span style={{ ...sc, fontSize: '9px', color: '#A8721A', fontStyle: 'italic', lineHeight: 1 }}>i</span>
      </button>
      {show && (
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 'calc(100% + 8px)', zIndex: 9999, background: '#0F1523', borderRadius: '10px', padding: '12px 16px', width: '260px', boxShadow: '0 8px 32px rgba(15,21,35,0.30)', pointerEvents: 'none', display: 'block' }}>
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: '#A8721A', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>Horizon Self</span>
          <span style={{ ...body, fontSize: '13px', fontWeight: 300, color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, display: 'block' }}>
            The version of you already living your Horizon Life — the you who got there. Not an aspiration. A real person you are becoming. The practice is about closing the gap between who you are now and who that person already is.
          </span>
        </span>
      )}
    </span>
  )
}

// ─── Setup Phase ──────────────────────────────────────────────────────────────

function SetupPhase({ mapData, onComplete, userId }) {
  const [step, setStep] = useState('horizon_confirm') // horizon_confirm | horizon_self | skill_suggest | skill_confirm | done
  const [horizonConfirmed, setHorizonConfirmed] = useState(false)
  const [horizonSelf, setHorizonSelf] = useState('')
  const [horizonSelfDraft, setHorizonSelfDraft] = useState('')
  const [firstSkill, setFirstSkill] = useState('')
  const [firstSkillType, setFirstSkillType] = useState('skill')

  const DOMAINS_LIST = ['Path', 'Spark', 'Body', 'Finances', 'Connection', 'Inner Game', 'Signal']
  const [customGoals, setCustomGoals] = useState(
    DOMAINS_LIST.reduce((acc, d) => ({ ...acc, [d]: '' }), {})
  )

  // Build context: use Map data if available, otherwise use custom goals
  const chatContext = mapData
    ? { mapData, userId }
    : { customGoals, userId }

  const setupChat = useChat('/tools/horizon-practice/api/setup-chat', {
    mode: 'horizon_self',
    ...chatContext,
  })

  const skillChat = useChat('/tools/horizon-practice/api/setup-chat', {
    mode: 'skills',
    ...chatContext,
  })

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'clamp(88px,10vw,112px) clamp(20px,5vw,40px) 120px' }}>

      <div style={{ marginBottom: '52px' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Horizon Practice · Setup</span>
        <h1 style={{ ...serif, fontSize: 'clamp(32px,5vw,52px)', fontWeight: 300, ...dark, lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '16px' }}>
          Let's build your<br /><em style={{ fontStyle: 'italic', color: '#A8721A' }}>daily practice.</em>
        </h1>
        <p style={{ ...body, fontSize: '17px', fontWeight: 300, ...muted, lineHeight: 1.75, maxWidth: '480px' }}>
          Three things to set up. Takes about ten minutes. Everything else builds through the practice itself.
        </p>
      </div>

      {/* Step 1: Horizon goals — Map data or manual entry */}
      <GoldCard>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', background: horizonConfirmed ? 'rgba(200,146,42,0.15)' : 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.30)', borderRadius: '40px', padding: '4px 12px', flexShrink: 0, marginTop: '2px' }}>
            {horizonConfirmed ? '✓ Done' : 'Step 1'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ ...body, fontSize: '19px', fontWeight: 400, ...dark, marginBottom: '8px' }}>Your horizon goals</div>

            {mapData?.domains ? (
              <>
                <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
                  These are pulled from your Map. Are they still pointing in the right direction?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {Object.values(mapData.domains).map(d => (
                    <div key={d.id} style={{ display: 'flex', gap: '12px', alignItems: 'baseline', opacity: d.horizon ? 1 : 0.4 }}>
                      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#A8721A', minWidth: '100px', flexShrink: 0 }}>{d.label}</span>
                      <span style={{ ...body, fontSize: '15px', ...muted, lineHeight: 1.5 }}>
                        {d.horizon || 'not yet set'}
                      </span>
                    </div>
                  ))}
                </div>
                {!horizonConfirmed && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Btn primary onClick={() => { setHorizonConfirmed(true); setStep('horizon_self') }}>Yes, these are right →</Btn>
                    <Btn onClick={() => window.location.href = '/tools/map'}>Update in The Map →</Btn>
                  </div>
                )}
              </>
            ) : (
              <>
                <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...muted, lineHeight: 1.7, marginBottom: '20px' }}>
                  For each area of life, write where you want to be. One sentence is enough — the honest destination, not a polished goal. If you do The Map later, these will still be here and you can refine them.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {DOMAINS_LIST.map(domain => (
                    <DomainInputRow
                      key={domain}
                      domain={domain}
                      value={customGoals[domain]}
                      onChange={val => setCustomGoals(prev => ({ ...prev, [domain]: val }))}
                      serif={serif}
                      sc={sc}
                    />
                  ))}
                </div>
                {!horizonConfirmed && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Btn primary
                      disabled={!Object.values(customGoals).some(v => v.trim())}
                      onClick={() => {
                        setHorizonConfirmed(true)
                        setStep('horizon_self')
                      }}>These are my horizons →</Btn>
                    <Btn onClick={() => window.location.href = '/tools/map'}>Do The Map first →</Btn>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </GoldCard>

      {/* Step 2: Horizon Self */}
      {(step === 'horizon_self' || step === 'skill_suggest' || step === 'skill_confirm') && (
        <GoldCard>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', background: horizonSelf ? 'rgba(200,146,42,0.15)' : 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.30)', borderRadius: '40px', padding: '4px 12px', flexShrink: 0, marginTop: '2px' }}>
              {horizonSelf ? '✓ Done' : 'Step 2'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ ...body, fontSize: '19px', fontWeight: 400, ...dark, marginBottom: '8px' }}>Your Horizon Self</div>
              <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
                How does your Horizon Self think, feel, and act? Write a draft — one or two sentences. We'll sharpen it together.
              </p>

              {!horizonSelf ? (
                <>
                  <textarea
                    value={horizonSelfDraft}
                    onChange={e => setHorizonSelfDraft(e.target.value)}
                    placeholder="My Horizon Self is decisive, financially sovereign, and moves through the world with ease and confidence…"
                    rows={3}
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: '12px',
                      border: '1.5px solid rgba(200,146,42,0.30)', background: '#FAFAF7',
                      resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                      ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.6,
                      marginBottom: '16px',
                    }}
                  />

                  {horizonSelfDraft && setupChat.messages.length === 0 && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <Btn primary onClick={() => {
                        setupChat.setMessages([{ role: 'user', content: horizonSelfDraft }])
                        setupChat.send(horizonSelfDraft)
                      }}>Sharpen this with North Star →</Btn>
                      <Btn onClick={() => {
                        setHorizonSelf(horizonSelfDraft)
                        setStep('skill_suggest')
                      }}>This is it — lock it in</Btn>
                    </div>
                  )}

                  {setupChat.messages.length > 0 && (
                    <>
                      <ChatThread chat={setupChat} />
                      <ChatInput chat={setupChat} />
                      <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(200,146,42,0.15)' }}>
                        <p style={{ ...body, fontSize: '15px', ...muted, marginBottom: '12px' }}>Happy with this statement?</p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <Btn primary onClick={() => {
                            const lastAssistant = [...setupChat.messages].reverse().find(m => m.role === 'assistant')
                            const finalStatement = lastAssistant?.content || horizonSelfDraft
                            if (!finalStatement.trim()) return
                            setHorizonSelf(finalStatement)
                            setStep('skill_suggest')
                          }}>Lock it in →</Btn>
                          <Btn onClick={() => {
                            const lastAssistant = [...setupChat.messages].reverse().find(m => m.role === 'assistant')
                            setupChat.send(`Let's refine this further: ${lastAssistant?.content}`)
                          }}>Refine further</Btn>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ ...body, fontSize: '16px', fontStyle: 'italic', color: '#A8721A', lineHeight: 1.7, padding: '14px 16px', background: 'rgba(200,146,42,0.05)', borderRadius: '8px' }}>
                  "{horizonSelf}"
                </div>
              )}
            </div>
          </div>
        </GoldCard>
      )}

      {/* Step 3: First skill */}
      {(step === 'skill_suggest' || step === 'skill_confirm') && (
        <GoldCard>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', background: firstSkill ? 'rgba(200,146,42,0.15)' : 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.30)', borderRadius: '40px', padding: '4px 12px', flexShrink: 0, marginTop: '2px' }}>
              {firstSkill ? '✓ Done' : 'Step 3'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ ...body, fontSize: '19px', fontWeight: 400, ...dark, marginBottom: '8px' }}>Your first skill or knowledge focus</div>
              <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
                Given where you're going — what's the one thing that, if developed, takes you one real step forward from where you actually are right now?
              </p>

              {!firstSkill ? (
                <>
                  {skillChat.messages.length === 0 && (
                    <Btn primary onClick={() => {
                      const goalsContext = !mapData && customGoals
                        ? '\n\nMy horizon goals: ' + Object.entries(customGoals).filter(([,v]) => v.trim()).map(([k,v]) => k + ': ' + v).join('; ')
                        : ''
                      skillChat.send('Help me identify the right skill or knowledge to start with, given my horizon goals.' + goalsContext)
                    }}>
                      Help me find it →
                    </Btn>
                  )}

                  {skillChat.messages.length > 0 && (
                    <>
                      <ChatThread chat={skillChat} />
                      <ChatInput chat={skillChat} placeholder="Respond or tell me what feels right…" />

                      <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(200,146,42,0.15)' }}>
                        <p style={{ ...body, fontSize: '15px', ...muted, marginBottom: '12px' }}>Name it directly:</p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                          <input
                            value={firstSkill}
                            onChange={e => setFirstSkill(e.target.value)}
                            placeholder="e.g. Asset management basics"
                            style={{ flex: 1, minWidth: '200px', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FAFAF7', outline: 'none', ...body, fontSize: '16px', ...dark }}
                          />
                          <select value={firstSkillType} onChange={e => setFirstSkillType(e.target.value)} style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FAFAF7', ...sc, fontSize: '14px', color: '#A8721A', letterSpacing: '0.1em' }}>
                            <option value="skill">Skill</option>
                            <option value="knowledge">Knowledge</option>
                          </select>
                        </div>
                        {firstSkill && (
                          <Btn primary onClick={() => setStep('done')}>Start with this →</Btn>
                        )}
                        {!firstSkill && skillChat.messages.length > 0 && (
                          <Btn onClick={() => {
                            const lastMsg = [...skillChat.messages].reverse().find(m => m.role === 'assistant')
                            if (lastMsg) { setFirstSkill(lastMsg.content.slice(0, 80).replace(/[*"]/g, '').trim()); setStep('done') }
                          }}>Use the suggestion above →</Btn>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ ...body, fontSize: '16px', fontStyle: 'italic', color: '#A8721A', lineHeight: 1.7, padding: '14px 16px', background: 'rgba(200,146,42,0.05)', borderRadius: '8px' }}>
                  {firstSkill} <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', opacity: 0.6 }}>({firstSkillType})</span>
                </div>
              )}
            </div>
          </div>
        </GoldCard>
      )}

      {/* Complete setup */}
      {step === 'done' && firstSkill && horizonSelf && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', marginBottom: '12px' }}>Ready</div>
          <h3 style={{ ...body, fontSize: '28px', fontWeight: 300, ...dark, marginBottom: '16px' }}>Your practice is set up.</h3>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...muted, lineHeight: 1.75, marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
            Imperceptible daily. Unstoppable over time.
          </p>
          <Btn primary onClick={() => onComplete({ horizonSelf, firstSkill: { title: firstSkill, type: firstSkillType }, customGoals: !mapData ? customGoals : null })}>
            Begin your first check-in →
          </Btn>
        </div>
      )}
    </div>
  )
}

// ─── Daily Check-in ───────────────────────────────────────────────────────────

function DailyCheckin({ setupData, sprintData, mapData, onComplete, userId, recentCheckins = [] }) {
  const [step, setStep] = useState('thoughts') // thoughts | emotions | actions | reflection | skill | done
  const [teaData, setTeaData] = useState({ thoughts: '', emotions: '', actions: '' })
  const [skillNote, setSkillNote] = useState('')
  const [loopFlagged, setLoopFlagged] = useState(false)
  const [pitfallFlagged, setPitfallFlagged] = useState(false)
  const [reflectionMessages, setReflectionMessages] = useState([])
  const [reflectionInput, setReflectionInput] = useState('')
  const [reflectionThinking, setReflectionThinking] = useState(false)
  const [reflectionDone, setReflectionDone] = useState(false)

  const today = getLocalDateStr()

  const TEA_STEPS = [
    {
      key: 'thoughts',
      label: 'Thoughts',
      eyebrow: 'T',
      prompt: 'Something came up today. How would your Horizon Self think about it?',
      next: 'emotions',
    },
    {
      key: 'emotions',
      label: 'Emotions',
      eyebrow: 'E',
      prompt: 'How would your Horizon Self feel about what happened today?',
      next: 'actions',
    },
    {
      key: 'actions',
      label: 'Actions',
      eyebrow: 'A',
      prompt: sprintData?.active
        ? (() => {
          const LABELS = { path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances', connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal' }
          const domainLabels = (sprintData.domains || []).map(id => LABELS[id] || id).join(', ')
          return `Your active sprint domains are ${domainLabels}. What would your Horizon Self do — and did you move toward your sprint goals in any of these areas today?`
        })()
        : mapData?.focusDomains?.length
        ? `Your focus areas from The Map are ${mapData.focusDomains.map(id => ({path:'Path',spark:'Spark',body:'Body',finances:'Finances',connection:'Connection',inner_game:'Inner Game',signal:'Signal'})[id] || id).join(', ')}. What would your Horizon Self do? Where did you move in those areas today — and where did your old self show up?`
        : 'What would your Horizon Self do in the situations you faced today? Where did you act from your Horizon Self — and where did your old self show up?',
      next: 'reflection',
    },
  ]

  const currentStep = TEA_STEPS.find(s => s.key === step)
  const [response, setResponse] = useState('')

  function submitStep() {
    const updatedTea = { ...teaData, [step]: response }
    setTeaData(updatedTea)
    setResponse('')
    if (currentStep.next === 'reflection') {
      setStep('reflection')
      startReflection(updatedTea)
    } else {
      setStep(currentStep.next)
    }
  }

  async function startReflection(tea) {
    setReflectionThinking(true)
    const teaSummary = `T (Thoughts): ${tea.thoughts}\nE (Emotions): ${tea.emotions}\nA (Actions): ${tea.actions}`
    const context = {
      horizonSelf: setupData.horizonSelf,
      mapData: mapData || null,
      sprintActive: sprintData?.active || false,
      sprintDomains: sprintData?.domains || [],
      currentSkill: setupData.nowSkill || null,
      recentCheckins: recentCheckins.slice(0, 7).map(c => ({
        date: c.check_date,
        thoughts: c.thoughts,
        emotions: c.emotions,
        actions: c.actions,
      })),
    }
    try {
      const res = await fetch('/tools/horizon-practice/api/daily-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: teaSummary }],
          mode: 'daily',
          context,
          userId,
        }),
      })
      const data = await res.json()
      setReflectionMessages([
        { role: 'user', content: teaSummary },
        { role: 'assistant', content: data.message || '' },
      ])
    } catch {
      setReflectionMessages([{ role: 'assistant', content: 'Something went wrong. You can continue to the next step.' }])
    } finally {
      setReflectionThinking(false)
    }
  }

  async function sendReflectionReply() {
    if (!reflectionInput.trim() || reflectionThinking) return
    const next = [...reflectionMessages, { role: 'user', content: reflectionInput }]
    setReflectionMessages(next)
    setReflectionInput('')
    setReflectionThinking(true)
    const context = {
      horizonSelf: setupData.horizonSelf,
      mapData: mapData || null,
      sprintActive: sprintData?.active || false,
      sprintDomains: sprintData?.domains || [],
      currentSkill: setupData.nowSkill || null,
      recentCheckins: recentCheckins.slice(0, 7).map(c => ({
        date: c.check_date,
        thoughts: c.thoughts,
        emotions: c.emotions,
        actions: c.actions,
      })),
    }
    try {
      const res = await fetch('/tools/horizon-practice/api/daily-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, mode: 'daily', context, userId }),
      })
      const data = await res.json()
      setReflectionMessages(m => [...m, { role: 'assistant', content: data.message || '' }])
    } catch {
      setReflectionMessages(m => [...m, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setReflectionThinking(false)
    }
    setReflectionDone(true)
  }

  function completeCheckin() {
    onComplete({
      check_date: today,
      thoughts: teaData.thoughts,
      emotions: teaData.emotions,
      actions: teaData.actions,
      skill_note: skillNote,
      loop_flagged: loopFlagged,
      pitfall_flagged: pitfallFlagged,
    })
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px 120px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '8px' }}>Daily check-in · {today}</div>
      <div style={{ ...body, fontSize: '13px', color: '#A8721A', opacity: 1, marginBottom: '16px' }}>
        "{setupData.horizonSelf}"
      </div>

      {/* I am statements for active focus domains */}
      {(() => {
        const activeDomains = sprintData?.domains || mapData?.focusDomains || []
        const LABELS = { path:'Path', spark:'Spark', body:'Body', finances:'Finances', connection:'Connection', inner_game:'Inner Game', signal:'Signal' }
        const statementsToShow = activeDomains
          .filter(id => mapData?.domains?.[id]?.iaStatement)
          .map(id => ({ id, label: LABELS[id] || id, statement: mapData.domains[id].iaStatement }))
        if (statementsToShow.length === 0) return null
        return (
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {statementsToShow.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ ...sc, fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.35)', textTransform: 'uppercase', flexShrink: 0, width: '72px' }}>{d.label}</span>
                <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', fontStyle: 'italic' }}>{d.statement}</span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* T.E.A. progress */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {TEA_STEPS.map(s => (
          <div key={s.key} style={{
            flex: 1, height: '4px', borderRadius: '4px',
            background: teaData[s.key] ? '#A8721A' : step === s.key ? 'rgba(200,146,42,0.40)' : 'rgba(200,146,42,0.08)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Current step */}
      {currentStep && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ ...sc, fontSize: '28px', fontWeight: 600, color: '#A8721A', lineHeight: 1 }}>{currentStep.eyebrow}</span>
            <span style={{ ...body, fontSize: '20px', fontWeight: 300, ...dark }}>{currentStep.label}</span>
          </div>
          <p style={{ ...body, fontSize: '18px', fontWeight: 300, ...dark, lineHeight: 1.75, marginBottom: '24px' }}>
            {currentStep.prompt}
          </p>
          <textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder="Take your time…"
            rows={4}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px',
              border: '1.5px solid rgba(200,146,42,0.30)', background: '#FAFAF7',
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.7,
              marginBottom: '16px',
            }}
          />
          <Btn primary onClick={submitStep} disabled={!response.trim()}>
            {currentStep.next === 'skill' ? 'Continue →' : 'Next →'}
          </Btn>
        </div>
      )}

      {/* North Star reflection — post T.E.A. */}
      {step === 'reflection' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '20px' }}>North Star reflection</div>
          {reflectionMessages.filter(m => m.role === 'assistant').map((m, i) => (
            <div key={i} style={{ ...body, fontSize: '17px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '20px', padding: '16px 20px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '12px' }}>
              {m.content}
            </div>
          ))}
          {reflectionThinking && (
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '8px 0', marginBottom: '16px' }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(200,146,42,0.45)', animation: `pulse 1.4s ease ${d}s infinite` }} />
              ))}
            </div>
          )}
          {!reflectionThinking && reflectionMessages.length > 0 && !reflectionDone && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px' }}>
              <textarea
                value={reflectionInput}
                onChange={e => setReflectionInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReflectionReply() } }}
                placeholder="Respond, or continue below…"
                rows={2}
                style={{ flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FAFAF7', resize: 'none', outline: 'none', ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.6 }}
              />
              <Btn primary onClick={sendReflectionReply} disabled={!reflectionInput.trim()}>Send</Btn>
            </div>
          )}
          {!reflectionThinking && (
            <Btn onClick={() => setStep('skill')} style={{ opacity: 1 }}>
              {reflectionDone ? 'Continue →' : 'Skip →'}
            </Btn>
          )}
        </div>
      )}

      {/* Skill practice note */}
      {step === 'skill' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ height: '1px', background: 'rgba(200,146,42,0.20)', margin: '32px 0' }} />
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '8px' }}>Now skill</div>
          <div style={{ ...body, fontSize: '18px', fontWeight: 300, ...dark, marginBottom: '16px' }}>
            {setupData.nowSkill?.title || <span style={{ opacity: 1 }}>No active skill set yet</span>}
          </div>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...muted, marginBottom: '16px', lineHeight: 1.7 }}>
            Did you practise or engage with this today? Note it here.
          </p>
          <textarea
            value={skillNote}
            onChange={e => setSkillNote(e.target.value)}
            placeholder="Optional — what did you work on or learn?"
            rows={3}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: '12px',
              border: '1.5px solid rgba(200,146,42,0.20)', background: '#FAFAF7',
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.6,
              marginBottom: '24px',
            }}
          />

          {/* Loop and pitfall flags */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <button onClick={() => setLoopFlagged(!loopFlagged)} style={{
              padding: '10px 18px', borderRadius: '40px',
              border: `1.5px solid ${loopFlagged ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.25)'}`,
              background: loopFlagged ? 'rgba(200,146,42,0.08)' : 'transparent',
              ...sc, fontSize: '13px', letterSpacing: '0.12em',
              color: loopFlagged ? '#A8721A' : 'rgba(15,21,35,0.55)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {loopFlagged ? '✓' : '+'} Thought loop noticed
            </button>
            <button onClick={() => setPitfallFlagged(!pitfallFlagged)} style={{
              padding: '10px 18px', borderRadius: '40px',
              border: `1.5px solid ${pitfallFlagged ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.25)'}`,
              background: pitfallFlagged ? 'rgba(200,146,42,0.08)' : 'transparent',
              ...sc, fontSize: '13px', letterSpacing: '0.12em',
              color: pitfallFlagged ? '#A8721A' : 'rgba(15,21,35,0.55)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {pitfallFlagged ? '✓' : '+'} Old self showed up
            </button>
          </div>

          <Btn primary onClick={completeCheckin}>Complete today's check-in →</Btn>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  )
}

// ─── Skills List ──────────────────────────────────────────────────────────────

function SkillsList({ skills, onAdd, onUpdate, onTriage, mapData }) {
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('skill')
  const [adding, setAdding] = useState(false)
  const [triageOpen, setTriageOpen] = useState(false)

  const triageChat = useChat('/tools/horizon-practice/api/setup-chat', { mode: 'triage', mapData })

  const nowSkills = skills.filter(s => s.status === 'now')
  const nextSkills = skills.filter(s => s.status === 'next')
  const laterSkills = skills.filter(s => s.status === 'later')
  const untriagedSkills = skills.filter(s => !s.status || s.status === 'untriaged')

  function SkillItem({ skill }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 18px', borderRadius: '10px', marginBottom: '6px',
        background: '#FAFAF7', border: '1px solid rgba(200,146,42,0.18)',
        transition: 'all 0.2s',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark }}>{skill.title}</div>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)', marginTop: '2px' }}>{skill.type}</div>
        </div>
        <select
          value={skill.status || 'untriaged'}
          onChange={e => onUpdate(skill.id, { status: e.target.value })}
          style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(200,146,42,0.25)', background: '#FAFAF7', ...sc, fontSize: '12px', color: '#A8721A', letterSpacing: '0.08em' }}
        >
          <option value="untriaged">Untriaged</option>
          <option value="now">Now</option>
          <option value="next">Next</option>
          <option value="later">Later</option>
          <option value="done">Done ✓</option>
        </select>
      </div>
    )
  }

  function SkillColumn({ label, items, accent }) {
    return (
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: accent || '#A8721A', marginBottom: '12px', paddingBottom: '8px', borderBottom: `2px solid ${accent || 'rgba(200,146,42,0.30)'}` }}>
          {label} {items.length > 0 && <span style={{ opacity: 0.6 }}>({items.length})</span>}
        </div>
        {items.length === 0 ? (
          <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', padding: '12px 0' }}>Empty</div>
        ) : (
          items.map(s => <SkillItem key={s.id} skill={s} />)
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <SectionHeader eyebrow="Skills & Knowledge" title="Your list." subtitle={null} />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Btn onClick={() => setTriageOpen(!triageOpen)}>
            {triageOpen ? 'Close triage' : 'Help me triage →'}
          </Btn>
          <Btn primary onClick={() => setAdding(!adding)}>+ Add item</Btn>
        </div>
      </div>

      {/* Triage chat */}
      {triageOpen && (
        <GoldCard style={{ marginBottom: '24px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '16px' }}>Triage — find your next step</div>
          <p style={{ ...body, fontSize: '15px', fontWeight: 300, ...muted, lineHeight: 1.7, marginBottom: '16px' }}>
            Given where you're going and where you are right now — what's the one thing that, if developed, takes you one real step forward?
          </p>
          {triageChat.messages.length === 0 && (
            <Btn primary onClick={() => {
              const skillList = skills.map(s => `${s.title} (${s.type}, ${s.status || 'untriaged'})`).join(', ')
              triageChat.send(`Here are my current skills: ${skillList || 'none yet'}. Help me figure out where to start.`)
            }}>Start triage →</Btn>
          )}
          {triageChat.messages.length > 0 && (
            <>
              <ChatThread chat={triageChat} />
              <ChatInput chat={triageChat} />
            </>
          )}
        </GoldCard>
      )}

      {/* Add item */}
      {adding && (
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '16px' }}>Add to your list</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="What do you need to learn or develop?"
              style={{ flex: 1, minWidth: '200px', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FAFAF7', outline: 'none', ...body, fontSize: '16px', ...dark }}
            />
            <select value={newType} onChange={e => setNewType(e.target.value)} style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FAFAF7', ...sc, fontSize: '14px', color: '#A8721A', letterSpacing: '0.1em' }}>
              <option value="skill">Skill</option>
              <option value="knowledge">Knowledge</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Btn primary onClick={() => { if (newTitle.trim()) { onAdd({ title: newTitle.trim(), type: newType, status: 'untriaged' }); setNewTitle(''); setAdding(false) } }}>Add →</Btn>
            <Btn onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {/* Skill columns */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <SkillColumn label="Now" items={nowSkills} accent="#A8721A" />
        <SkillColumn label="Next" items={nextSkills} accent="rgba(15,21,35,0.55)" />
        <SkillColumn label="Later" items={laterSkills} accent="rgba(15,21,35,0.35)" />
      </div>

      {untriagedSkills.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginBottom: '12px' }}>Untriaged</div>
          {untriagedSkills.map(s => <SkillItem key={s.id} skill={s} />)}
        </div>
      )}
    </div>
  )
}

// ─── Loop Journal ─────────────────────────────────────────────────────────────

function LoopJournal({ loops, setupData, onSave }) {
  const [active, setActive] = useState(false)
  const chat = useChat('/tools/horizon-practice/api/loop-chat', { context: { horizonSelf: setupData?.horizonSelf } })
  const [loopResult, setLoopResult] = useState(null)

  return (
    <div>
      <SectionHeader
        eyebrow="Thought Loops"
        title="Interrupt and replace."
        subtitle="A thought continues indefinitely until interrupted and replaced. This is the work."
      />

      {loops.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          {loops.map((loop, i) => (
            <Card key={i}>
              <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>{loop.created_at?.slice(0,10)}</div>
              <div style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, marginBottom: '8px' }}><strong>Loop:</strong> {loop.loop_text}</div>
              {loop.function_text && <div style={{ ...body, fontSize: '15px', ...muted, marginBottom: '6px' }}><strong>Function:</strong> {loop.function_text}</div>}
              {loop.interruption && <div style={{ ...body, fontSize: '15px', ...muted, marginBottom: '6px' }}><strong>Interruption:</strong> {loop.interruption}</div>}
              {loop.replacement && <div style={{ ...body, fontSize: '15px', color: '#A8721A', fontStyle: 'italic' }}><strong>Replacement:</strong> {loop.replacement}</div>}
            </Card>
          ))}
        </div>
      )}

      {!active ? (
        <Btn primary onClick={() => { setActive(true); chat.setMessages([{ role: 'assistant', content: "What thought keeps showing up? Say it as specifically as you can — the actual words, the situation that triggers it." }]) }}>
          Work with a loop →
        </Btn>
      ) : (
        <GoldCard>
          <ChatThread chat={chat} />
          <ChatInput chat={chat} />
          {chat.messages.length > 6 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(200,146,42,0.15)' }}>
              <Btn onClick={() => {
                // Extract loop record fields from conversation at save time.
                // The API instructs the model to summarise all four fields when complete.
                // Scan assistant messages in reverse to find the summary block.
                const assistantMsgs = chat.messages
                  .filter(m => m.role === 'assistant')
                  .map(m => m.content)
                const combined = assistantMsgs.join('\n')

                function extract(label) {
                  // Match label (case-insensitive) followed by a colon and capture until next label or end
                  const pattern = new RegExp(
                    `${label}[:\\s]+([\\s\\S]*?)(?=(?:Loop|Function|Interruption|Replacement)[:\\s]|$)`,
                    'i'
                  )
                  const match = combined.match(pattern)
                  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null
                }

                // Fallback: first user message is always the loop they named
                const firstUserMsg = chat.messages.find(m => m.role === 'user')?.content || null

                onSave({
                  loop_text:     extract('Loop') || firstUserMsg || 'From conversation',
                  function_text: extract('Function'),
                  interruption:  extract('Interruption'),
                  replacement:   extract('Replacement'),
                  created_at:    new Date().toISOString()
                })
                setActive(false)
                chat.setMessages([])
              }}>Save this loop record →</Btn>
            </div>
          )}
        </GoldCard>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ setupData, checkins, skills, sprintData, mapData, onCheckin }) {
  const today = getLocalDateStr()
  const checkedInToday = checkins.some(c => c.check_date === today)
  const streak = getStreakCount(checkins)
  const nowSkill = skills.find(s => s.status === 'now')

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {[
          { label: 'Day streak', value: streak || '—' },
          { label: 'Total check-ins', value: checkins.length },
          { label: 'Skills in progress', value: skills.filter(s => s.status === 'now').length },
        ].map(stat => (
          <div key={stat.label} style={{ flex: 1, minWidth: '120px', padding: '20px', background: '#FAFAF7', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ ...body, fontSize: '32px', fontWeight: 300, color: '#A8721A', lineHeight: 1 }}>{stat.value}</div>
            <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Horizon Self */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>Your Horizon Self</div>
        <div style={{ ...body, fontSize: '17px', fontStyle: 'italic', color: '#A8721A', lineHeight: 1.7 }}>"{setupData.horizonSelf}"</div>
      </Card>

      {/* Map context — focus domains */}
      {mapData?.focusDomains?.length > 0 && (
        <Card style={{ marginBottom: '16px', background: 'rgba(200,146,42,0.05)' }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', marginBottom: '6px' }}>Your Map · Focus areas</div>
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: '#A8721A' }}>
            {(() => {
              const LABELS = { path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances', connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal' }
              return mapData.focusDomains.map(id => LABELS[id] || id).join(' · ')
            })()}
          </div>
          {mapData.lifeHorizon && (
            <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginTop: '6px', lineHeight: 1.6 }}>
              "{mapData.lifeHorizon}"
            </div>
          )}
          {/* I am statements for focus domains */}
          {mapData.focusDomains.some(id => mapData.domains?.[id]?.iaStatement) && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(200,146,42,0.12)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {(() => {
                const LABELS = { path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances', connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal' }
                return mapData.focusDomains
                  .filter(id => mapData.domains?.[id]?.iaStatement)
                  .map(id => (
                    <div key={id} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.35)', textTransform: 'uppercase', flexShrink: 0, width: '72px' }}>{LABELS[id] || id}</span>
                      <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.65)', fontStyle: 'italic' }}>{mapData.domains[id].iaStatement}</span>
                    </div>
                  ))
              })()}
            </div>
          )}
        </Card>
      )}

      {/* Today's check-in CTA */}
      {checkedInToday ? (
        <GoldCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '28px' }}>✓</span>
              <div>
                <div style={{ ...body, fontSize: '18px', fontWeight: 300, ...dark }}>Check-in complete for today.</div>
                <div style={{ ...body, fontSize: '15px', ...muted, marginTop: '4px' }}>Come back tomorrow. The practice compounds.</div>
              </div>
            </div>
            <a href="/dashboard" style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none', flexShrink: 0 }}>
              Mission Control →
            </a>
          </div>
        </GoldCard>
      ) : (
        <GoldCard style={{ cursor: 'pointer' }} onClick={onCheckin}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '6px' }}>Today</div>
              <div style={{ ...body, fontSize: '20px', fontWeight: 300, ...dark }}>Your daily T.E.A. check-in is waiting.</div>
              {nowSkill && <div style={{ ...body, fontSize: '15px', ...muted, marginTop: '4px' }}>Current focus: {nowSkill.title}</div>}
            </div>
            <span style={{ ...body, fontSize: '28px', color: '#A8721A', flexShrink: 0 }}>→</span>
          </div>
        </GoldCard>
      )}

      {/* Sprint integration */}
      {sprintData?.active && (
        <Card style={{ marginTop: '16px' }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>Active Target Sprint</div>
          <div style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark }}>Your sprint actions are the A in your T.E.A. practice.</div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#A8721A', marginTop: '6px' }}>
            {(() => {
              const LABELS = { path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances', connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal' }
              return (sprintData.domains || []).map(id => LABELS[id] || id).join(' · ')
            })()}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Dormant features notice ──────────────────────────────────────────────────

function DormantFeatureCard({ title, description, daysUntil, onActivate }) {
  return (
    <div style={{ padding: '20px 24px', borderRadius: '14px', border: '1px solid rgba(200,146,42,0.18)', background: 'rgba(200,146,42,0.05)', marginBottom: '12px', opacity: 0.8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', marginBottom: '6px' }}>{title}</div>
          <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6 }}>{description}</div>
          {daysUntil > 0 && (
            <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', marginTop: '8px' }}>
              Activates in {daysUntil} days — or start now if you're ready
            </div>
          )}
        </div>
        <button onClick={onActivate} style={{ padding: '8px 16px', borderRadius: '40px', border: '1px solid rgba(200,146,42,0.25)', background: 'transparent', ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
          Start now
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function HorizonPracticePage() {
  const { user, loading: authLoading } = useAuth()
  const { tier, loading: accessLoading } = useAccess('horizon-practice')

  const [view, setView] = useState('dashboard') // dashboard | checkin | debrief | skills | loops | patterns
  const [pendingCheckinData, setPendingCheckinData] = useState(null)
  const [skipMap, setSkipMap] = useState(false)
  const [setupData, setSetupData] = useState(null)
  const [mapData, setMapData] = useState(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [checkins, setCheckins] = useState([])
  const [skills, setSkills] = useState([])
  const [loops, setLoops] = useState([])
  const [sprintData, setSprintData] = useState(null)
  const [loopsActivated, setLoopsActivated] = useState(false)
  const [pitfallsActivated, setPitfallsActivated] = useState(false)

  const daysActive = checkins.length > 0
    ? Math.round((Date.now() - new Date(checkins[checkins.length-1]?.created_at || Date.now())) / 86400000)
    : 0

  // Load all data
  useEffect(() => {
    if (!user) { setMapLoading(false); return }
    async function load() {
      setMapLoading(true)
      try {
        // Map data
        const { data: mapRow } = await supabase
          .from('map_results')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (mapRow) {
          const md = mapRow.map_data || {}
          const DOMAIN_LABELS_MAP = {
            path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
            connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal',
          }
          // Build domain map from session.domainData (always present) 
          const domains = mapRow.session?.domainData
            ? (() => {
                const result = {}
                Object.entries(mapRow.session.domainData).forEach(([id, d]) => {
                  if (!DOMAIN_LABELS_MAP[id]) return
                  result[id] = {
                    id,
                    label: DOMAIN_LABELS_MAP[id],
                    currentScore: d.currentScore,
                    horizon: (d.horizonText && d.horizonText !== 'See sub-domain horizons') ? d.horizonText : null,
                  }
                })
                return result
              })()
            : null

          // Derive focus domains: from map_data if synthesis ran, else lowest 3 scores
          let focusDomains = md.focus_domains || null
          if (!focusDomains && domains) {
            focusDomains = Object.entries(domains)
              .filter(([, d]) => d.currentScore !== undefined)
              .sort(([, a], [, b]) => a.currentScore - b.currentScore)
              .slice(0, 3)
              .map(([id]) => id)
          }

          // Fetch I am statements from horizon_profile
          const { data: iaRows } = await supabase
            .from('horizon_profile')
            .select('domain, ia_statement')
            .eq('user_id', user.id)

          const iaMap = {}
          if (iaRows) iaRows.forEach(r => { if (r.ia_statement) iaMap[r.domain] = r.ia_statement })

          // Add ia_statement to each domain
          if (domains) {
            Object.keys(domains).forEach(id => {
              if (iaMap[id]) domains[id].iaStatement = iaMap[id]
            })
          }

          setMapData({
            stage: md.stage || null,
            stageDescription: md.stage_description || null,
            overallReflection: md.overall_reflection || null,
            focusDomains,
            focusReasoning: md.focus_reasoning || null,
            lifeHorizon: mapRow.horizon_goal_user || md.life_horizon_draft || null,
            lifeIaStatement: mapRow.life_ia_statement || null,
            domains,
          })
        }

        // Expansion setup
        const { data: setup } = await supabase
          .from('horizon_practice_setup')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (setup) setSetupData(setup)

        // Check-ins
        const { data: checkinRows } = await supabase
          .from('horizon_practice_checkins')
          .select('*')
          .eq('user_id', user.id)
          .order('check_date', { ascending: false })

        if (checkinRows) setCheckins(checkinRows)

        // Skills
        const { data: skillRows } = await supabase
          .from('horizon_practice_skills')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        if (skillRows) setSkills(skillRows)

        // Loops
        const { data: loopRows } = await supabase
          .from('horizon_practice_loops')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (loopRows) setLoops(loopRows)

        // Sprint data
        const { data: sprintRow } = await supabase
          .from('target_sprint_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (sprintRow) {
          setSprintData({ active: true, domains: sprintRow.domains })
        }

      } catch (err) {
        console.error('Expansion load error:', err)
      } finally {
        setMapLoading(false)
      }
    }
    load()
  }, [user])

  async function handleSetupComplete({ horizonSelf, firstSkill, customGoals }) {
    try {
      const { data } = await supabase.from('horizon_practice_setup').upsert({
        user_id: user.id,
        horizon_self: horizonSelf,
        custom_goals: customGoals || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }).select().maybeSingle()

      if (firstSkill) {
        await supabase.from('horizon_practice_skills').insert({
          user_id: user.id,
          title: firstSkill.title,
          type: firstSkill.type,
          status: 'now',
          created_at: new Date().toISOString(),
        })
      }

      // Write to North Star cross-tool memory
      if (horizonSelf) {
        await supabase.from('north_star_notes').upsert(
          { user_id: user.id, tool: 'horizon-practice', note: `Horizon Self: ${horizonSelf}` },
          { onConflict: 'user_id,tool,note' }
        )
      }
      if (firstSkill) {
        await supabase.from('north_star_notes').upsert(
          { user_id: user.id, tool: 'horizon-practice', note: `Active skill: ${firstSkill.title} (${firstSkill.type})` },
          { onConflict: 'user_id,tool,note' }
        )
      }

      setSetupData({ horizon_self: horizonSelf })
      if (firstSkill) setSkills([{ id: Date.now(), ...firstSkill, status: 'now' }])
      setView('checkin')
    } catch (err) {
      console.error('Setup save error:', err)
    }
  }

  async function handleCheckinComplete(data) {
    try {
      await supabase.from('horizon_practice_checkins').insert({
        user_id: user.id,
        ...data,
        created_at: new Date().toISOString(),
      })
      setCheckins(prev => [data, ...prev])
      // Route through debrief before returning to dashboard
      setPendingCheckinData(data)
      setView('debrief')
    } catch (err) {
      console.error('Checkin save error:', err)
    }
  }

  function handleCheckinDebriefDone() {
    setPendingCheckinData(null)
    setView('dashboard')
  }

  async function handleAddSkill(skill) {
    try {
      const { data } = await supabase.from('horizon_practice_skills').insert({
        user_id: user.id,
        ...skill,
        created_at: new Date().toISOString(),
      }).select().maybeSingle()
      if (data) setSkills(prev => [...prev, data])
    } catch (err) {
      console.error('Add skill error:', err)
    }
  }

  async function handleUpdateSkill(id, updates) {
    try {
      await supabase.from('horizon_practice_skills').update(updates).eq('id', id)
      setSkills(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    } catch (err) {
      console.error('Update skill error:', err)
    }
  }

  async function handleSaveLoop(loop) {
    try {
      const { data } = await supabase.from('horizon_practice_loops').insert({
        user_id: user.id,
        ...loop,
      }).select().maybeSingle()
      if (data) setLoops(prev => [data, ...prev])
    } catch (err) {
      console.error('Save loop error:', err)
    }
  }

  // Loading
  if (authLoading || accessLoading || mapLoading) {
    return <div style={{ background: '#FAFAF7', minHeight: '100vh' }}><Nav activePath="nextus-self" /><div className="loading" /></div>
  }

  return (
    <AccessGate productKey="expansion" toolName="Horizon Practice">
      <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
        <Nav activePath="nextus-self" />

        {/* Map redirect */}
        {!mapData && !skipMap && <MapRedirect onSkip={() => setSkipMap(true)} />}

        {/* Setup */}
        {(mapData || skipMap) && !setupData && (
          <SetupPhase mapData={mapData} onComplete={handleSetupComplete} userId={user?.id} />
        )}

        {/* Main tool */}
        {(mapData || skipMap) && setupData && (
          <>
            {/* Tool header */}
            <div style={{ maxWidth: '820px', margin: '0 auto', padding: 'clamp(88px,10vw,112px) clamp(20px,5vw,40px) 0' }}>
              <div className="tool-header" style={{ marginBottom: '40px' }}>
                <span className="tool-eyebrow">Horizon Suite · Horizon Practice</span>
                <p style={{ ...body, fontSize: '1.125rem', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: '8px 0 12px', maxWidth: '520px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  A daily practical practice for becoming your{' '}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Horizon Self
                    <HorizonSelfTooltip />
                  </span>.
                </p>
                <h1 className="tool-title">Who are you becoming?</h1>
                <p style={{ ...body, fontSize: '1.1875rem', fontWeight: 300, color: 'rgba(15,21,35,0.72)', marginTop: '6px', lineHeight: 1.65, maxWidth: '480px' }}>
                  One day at a time. Imperceptible daily. Unstoppable over time.
                </p>
              </div>

              {/* Nav tabs */}
              {view !== 'checkin' && (
                <div style={{ display: 'flex', gap: '4px', marginBottom: '40px', borderBottom: '1px solid rgba(200,146,42,0.20)', paddingBottom: '0' }}>
                  {[
                    { key: 'dashboard', label: 'Today' },
                    { key: 'skills', label: 'Skills' },
                    { key: 'loops', label: 'Loops' },
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setView(tab.key)} style={{
                      padding: '10px 20px', background: 'none', border: 'none',
                      borderBottom: view === tab.key ? '2px solid #A8721A' : '2px solid transparent',
                      ...sc, fontSize: '14px', letterSpacing: '0.12em',
                      color: view === tab.key ? '#A8721A' : 'rgba(15,21,35,0.55)',
                      cursor: 'pointer', transition: 'all 0.2s', marginBottom: '-1px',
                    }}>{tab.label}</button>
                  ))}
                </div>
              )}

              {/* Views */}
              {view === 'dashboard' && (
                <>
                  <Dashboard
                    setupData={{ horizonSelf: setupData.horizon_self, nowSkill: skills.find(s => s.status === 'now') }}
                    checkins={checkins}
                    skills={skills}
                    sprintData={sprintData}
                    mapData={mapData}
                    onCheckin={() => setView('checkin')}
                  />

                  {/* Dormant features */}
                  {(!loopsActivated || !pitfallsActivated) && (
                    <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid rgba(200,146,42,0.15)' }}>
                      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.40)', marginBottom: '16px' }}>Advanced features</div>
                      {!loopsActivated && (
                        <DormantFeatureCard
                          title="Thought loop interruption"
                          description="Catch and reshape the recurring thoughts that run on loop. Available when you're ready — most people find their first week of daily practice surfaces the patterns worth working with."
                          daysUntil={Math.max(0, 7 - checkins.length)}
                          onActivate={() => { setLoopsActivated(true); setView('loops') }}
                        />
                      )}
                      {!pitfallsActivated && (
                        <DormantFeatureCard
                          title="Predictable pitfalls"
                          description="Name the ways you reliably show up as your old self. The patterns that surprise you every time — even though they're the same ones. Coming after your first week of practice."
                          daysUntil={Math.max(0, 7 - checkins.length)}
                          onActivate={() => setPitfallsActivated(true)}
                        />
                      )}
                    </div>
                  )}
                </>
              )}

              {view === 'checkin' && (
                <DailyCheckin
                  setupData={{ horizonSelf: setupData.horizon_self, nowSkill: skills.find(s => s.status === 'now') }}
                  sprintData={sprintData}
                  mapData={mapData}
                  onComplete={handleCheckinComplete}
                  userId={user?.id}
                  recentCheckins={checkins}
                />
              )}

              {view === 'debrief' && (
                <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px 120px' }}>
                  <DebriefPanel
                    tool="horizon-practice"
                    toolContext={{
                      date:        pendingCheckinData?.check_date,
                      horizonSelf: setupData?.horizon_self,
                      thoughts:    pendingCheckinData?.thoughts,
                      emotions:    pendingCheckinData?.emotions,
                      actions:     pendingCheckinData?.actions,
                    }}
                    userId={user?.id}
                    mode="light"
                    onComplete={handleCheckinDebriefDone}
                    onSkip={handleCheckinDebriefDone}
                    title="Reflect on today"
                  />
                </div>
              )}

              {view === 'skills' && (
                <SkillsList
                  skills={skills}
                  onAdd={handleAddSkill}
                  onUpdate={handleUpdateSkill}
                  mapData={mapData}
                />
              )}

              {view === 'loops' && (
                <LoopJournal
                  loops={loops}
                  setupData={{ horizonSelf: setupData.horizon_self }}
                  onSave={handleSaveLoop}
                />
              )}
            </div>
          </>
        )}

        <style>{`
          @media (max-width: 640px) {
            .tool-header { padding-left: 0 !important; }
          }
        `}</style>
      </div>
    </AccessGate>
  )
}
