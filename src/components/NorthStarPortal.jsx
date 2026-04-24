import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../hooks/useSupabase'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }

const GOLD      = '#C8922A'
const GOLD_TEXT = '#A8721A'
const DARK      = '#0F1523'

const NS_OPENING = `Tell me a little about what's going on. I'll point you somewhere useful.`

const CX = 450, CY = 200

const RAYS_TOP = [
  { x2:-212, y2:106  }, { x2:-125, y2:-25  }, { x2:25,   y2:-131 },
  { x2:225,  y2:-144 }, { x2:450,  y2:-150 }, { x2:675,  y2:-144 },
  { x2:875,  y2:-131 }, { x2:1025, y2:-25  }, { x2:1112, y2:106  },
]
const RAYS_BOT     = RAYS_TOP.map(r => ({ x2: r.x2, y2: 400 - r.y2 }))
const RAYS_INT_TOP = [
  { x2:-16, y2:78  }, { x2:74,  y2:-15 }, { x2:209, y2:-62 }, { x2:369, y2:-74 },
  { x2:531, y2:-74 }, { x2:691, y2:-62 }, { x2:826, y2:-15 }, { x2:916, y2:78  },
]
const RAYS_INT_BOT = RAYS_INT_TOP.map(r => ({ x2: r.x2, y2: 400 - r.y2 }))

const DEPTH_FILLS = [
  {rx:370,ry:156},{rx:330,ry:139},{rx:294,ry:124},{rx:262,ry:110},
  {rx:233,ry:98 },{rx:207,ry:87 },{rx:183,ry:77 },{rx:161,ry:68 },
  {rx:141,ry:59 },{rx:123,ry:52 },{rx:107,ry:45 },{rx:92, ry:39 },
  {rx:79, ry:33 },{rx:67, ry:28 },{rx:56, ry:24 },{rx:46, ry:19 },
  {rx:37, ry:16 },{rx:29, ry:12 },{rx:22, ry:9  },{rx:16, ry:7  },
  {rx:10, ry:4  },{rx:5,  ry:2  },
]

// ─── Full chat view — the rectangular room after the portal ───
function FullChat({ messages, input, setInput, waiting, done, send, messagesRef, textareaRef }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1.5px solid rgba(200,146,42,0.78)',
      borderRadius: '14px',
      overflow: 'hidden',
      width: '100%',
      maxWidth: '640px',
      margin: '0 auto',
      textAlign: 'left',
    }}>
      <div ref={messagesRef} style={{
        minHeight: '160px',
        maxHeight: '420px',
        overflowY: 'auto',
        padding: '28px 28px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {messages.map((m, i) => {
          if (m.role === 'assistant') return (
            <div key={i} style={{ ...body, fontSize: '16px', lineHeight: 1.8, color: DARK, alignSelf: 'flex-start', maxWidth: '92%' }}>
              {m.content}
            </div>
          )
          if (m.role === 'user') return (
            <div key={i} style={{ ...body, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '10px', padding: '10px 14px', alignSelf: 'flex-end', maxWidth: '80%' }}>
              {m.content}
            </div>
          )
          if (m.role === 'result') {
            const d = m.data
            return (
              <div key={i} style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', padding: '22px', alignSelf: 'flex-start', maxWidth: '96%' }}>
                {d.stage && <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', color: GOLD_TEXT, marginBottom: '8px' }}>{d.stage}</div>}
                <div style={{ ...body, fontSize: '16px', lineHeight: 1.8, color: DARK, marginBottom: '16px' }}>{d.reflection}</div>
                {(d.recommendations || []).map((r, ri) => (
                  <div key={ri} style={{ borderTop: '1px solid rgba(200,146,42,0.20)', paddingTop: '14px', marginTop: '14px' }}>
                    <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.72)', marginBottom: '4px' }}>{r.category}</div>
                    <div style={{ ...body, fontSize: '17px', color: DARK, marginBottom: '4px' }}>{r.title}</div>
                    <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.88)', lineHeight: 1.65, marginBottom: '8px' }}>{r.description}</div>
                    {r.link && r.link !== 'null' && <a href={r.link} style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', color: GOLD_TEXT, textDecoration: 'none' }}>{r.link_text || 'Go there →'}</a>}
                  </div>
                ))}
                {d.closing && <div style={{ ...body, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(200,146,42,0.20)' }}>{d.closing}</div>}
              </div>
            )
          }
          return null
        })}
        {waiting && (
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '4px 0' }}>
            {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(200,146,42,0.45)', animation: `nsPulse 1.4s ease ${d}s infinite` }} />)}
            <style>{`@keyframes nsPulse{0%,80%,100%{transform:scale(0.7);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
          </div>
        )}
      </div>
      {!done && (
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.20)', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Take your time…"
            rows={1}
            style={{
              flex: 1, resize: 'none',
              border: '1.5px solid rgba(200,146,42,0.30)',
              borderRadius: '10px', padding: '11px 14px',
              ...body, fontSize: '16px', color: DARK,
              background: '#FAFAF7', outline: 'none',
              lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || waiting}
            style={{
              flexShrink: 0, padding: '11px 22px',
              borderRadius: '40px',
              border: '1.5px solid rgba(200,146,42,0.78)',
              background: 'rgba(200,146,42,0.05)',
              ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
              color: GOLD_TEXT, cursor: 'pointer', whiteSpace: 'nowrap',
              opacity: (!input.trim() || waiting) ? 0.4 : 1,
            }}
          >Send</button>
        </div>
      )}
    </div>
  )
}

// ─── Portal oval — the entry point ───────────────────────────
function PortalOval({ onFirstSend, portalOpacity, boldRingRef, faintRingRef, horizonRef, depthGroupRef, raysTopRefs, raysBotRefs, raysIntTopRefs, raysIntBotRefs, gradRefs, input, setInput, waiting, textareaRef, wrapRef, handleEnter, handleLeave }) {

  return (
    <div
      ref={wrapRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '760px',
        margin: '0 auto',
        opacity: portalOpacity,
        transition: 'opacity 0.5s ease',
        pointerEvents: portalOpacity < 0.1 ? 'none' : 'all',
      }}
    >
      <svg
        viewBox="0 0 900 400"
        style={{ width: '100%', display: 'block', overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ns-rgh" x1="-100" y1="200" x2="1000" y2="200" gradientUnits="userSpaceOnUse">
            <stop ref={el => { gradRefs.current.rgh = el }} offset="0%"   stopColor={GOLD} stopOpacity="0"/>
            <stop offset="40%"  stopColor={GOLD} stopOpacity="0.45"/>
            <stop offset="60%"  stopColor={GOLD} stopOpacity="0.45"/>
            <stop offset="100%" stopColor={GOLD} stopOpacity="0"/>
          </linearGradient>
          {RAYS_TOP.map((r, i) => (
            <linearGradient key={i} id={`ns-rg${i}`} x1={CX} y1={CY} x2={r.x2} y2={r.y2} gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor={GOLD} stopOpacity="0"/>
              <stop offset="50%"  stopColor={GOLD} stopOpacity="0.08"/>
              <stop ref={el => { gradRefs.current.rg[i] = el }} offset="100%" stopColor={GOLD} stopOpacity="0.20"/>
            </linearGradient>
          ))}
          {RAYS_BOT.map((r, i) => (
            <linearGradient key={i} id={`ns-rgb${i}`} x1={CX} y1={CY} x2={r.x2} y2={r.y2} gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor={GOLD} stopOpacity="0"/>
              <stop offset="50%"  stopColor={GOLD} stopOpacity="0.08"/>
              <stop ref={el => { gradRefs.current.rgb[i] = el }} offset="100%" stopColor={GOLD} stopOpacity="0.20"/>
            </linearGradient>
          ))}
          {RAYS_INT_TOP.map((r, i) => (
            <linearGradient key={i} id={`ns-ri${i}`} x1={CX} y1={CY} x2={r.x2} y2={r.y2} gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor={GOLD} stopOpacity="0"/>
              <stop offset="50%"  stopColor={GOLD} stopOpacity="0.06"/>
              <stop ref={el => { gradRefs.current.ri[i] = el }} offset="100%" stopColor={GOLD} stopOpacity="0.15"/>
            </linearGradient>
          ))}
          {RAYS_INT_BOT.map((r, i) => (
            <linearGradient key={i} id={`ns-rib${i}`} x1={CX} y1={CY} x2={r.x2} y2={r.y2} gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor={GOLD} stopOpacity="0"/>
              <stop offset="50%"  stopColor={GOLD} stopOpacity="0.06"/>
              <stop ref={el => { gradRefs.current.rib[i] = el }} offset="100%" stopColor={GOLD} stopOpacity="0.15"/>
            </linearGradient>
          ))}
        </defs>

        <g ref={depthGroupRef} opacity="0">
          {DEPTH_FILLS.map((d, i) => (
            <ellipse key={i} cx={CX} cy={CY} rx={d.rx} ry={d.ry} fill="#A8721A" fillOpacity="0.015"/>
          ))}
        </g>

        <line ref={horizonRef} x1="-100" y1={CY} x2="1000" y2={CY}
          stroke="url(#ns-rgh)" strokeWidth="0.8" strokeOpacity="0"/>

        {RAYS_TOP.map((r, i) => (
          <line key={i} ref={el => { raysTopRefs.current[i] = el }}
            x1={CX} y1={CY} x2={r.x2} y2={r.y2}
            stroke={`url(#ns-rg${i})`} strokeWidth="0.8"/>
        ))}
        {RAYS_BOT.map((r, i) => (
          <line key={i} ref={el => { raysBotRefs.current[i] = el }}
            x1={CX} y1={CY} x2={r.x2} y2={r.y2}
            stroke={`url(#ns-rgb${i})`} strokeWidth="0.8"/>
        ))}
        {RAYS_INT_TOP.map((r, i) => (
          <line key={i} ref={el => { raysIntTopRefs.current[i] = el }}
            x1={CX} y1={CY} x2={r.x2} y2={r.y2}
            stroke={`url(#ns-ri${i})`} strokeWidth="0.8"/>
        ))}
        {RAYS_INT_BOT.map((r, i) => (
          <line key={i} ref={el => { raysIntBotRefs.current[i] = el }}
            x1={CX} y1={CY} x2={r.x2} y2={r.y2}
            stroke={`url(#ns-rib${i})`} strokeWidth="0.8"/>
        ))}

        <ellipse ref={faintRingRef}
          cx={CX} cy={CY} rx="404" ry="171"
          fill="none" stroke={GOLD} strokeWidth="0.8" strokeOpacity="0"/>
        <ellipse ref={boldRingRef}
          cx={CX} cy={CY} rx="370" ry="156"
          fill="none" stroke={GOLD} strokeWidth="2.4" strokeOpacity="0.88"/>
      </svg>

      {/* Content inside oval */}
      <div style={{
        position: 'absolute',
        top: '10%', bottom: '35%',
        left: '12%', right: '12%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        {/* Opening line */}
        <div style={{
          flex: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <p style={{
            ...serif,
            fontSize: 'clamp(15px, 1.8vw, 19px)',
            fontWeight: 300,
            lineHeight: 1.55,
            color: DARK,
            textAlign: 'center',
            margin: 0,
          }}>
            {NS_OPENING}
          </p>
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onFirstSend()
              }
            }}
            placeholder="Take your time…"
            rows={1}
            style={{
              flex: 1, resize: 'none',
              border: '1.5px solid rgba(200,146,42,0.35)',
              borderRadius: '8px', padding: '9px 12px',
              ...body, fontSize: '15px', color: DARK,
              background: '#FAFAF7', outline: 'none',
              lineHeight: 1.4, maxHeight: '90', overflowY: 'auto',
            }}
          />
          <button
            onClick={onFirstSend}
            disabled={!input.trim() || waiting}
            style={{
              flexShrink: 0, padding: '9px 18px',
              borderRadius: '40px',
              border: '1.5px solid rgba(200,146,42,0.78)',
              background: '#FAFAF7',
              ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.14em',
              color: GOLD_TEXT, cursor: 'pointer', whiteSpace: 'nowrap',
              opacity: 1,
            }}
          >Send</button>
        </div>
      </div>
    </div>
  )
}

// ─── NorthStarPortal — orchestrates the two views ────────────
export function NorthStarPortal() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([{ role: 'assistant', content: NS_OPENING }])
  const [input, setInput]       = useState('')
  const [waiting, setWaiting]   = useState(false)
  const [done, setDone]         = useState(false)

  // phase: 'portal' | 'morphing' | 'chat'
  const [phase, setPhase] = useState('portal')
  const [portalOpacity, setPortalOpacity] = useState(1)
  const [chatOpacity, setChatOpacity]     = useState(0)

  const messagesRef    = useRef(null)
  const textareaRef    = useRef(null)
  const wrapRef        = useRef(null)
  const boldRingRef    = useRef(null)
  const faintRingRef   = useRef(null)
  const horizonRef     = useRef(null)
  const depthGroupRef  = useRef(null)
  const raysTopRefs    = useRef(RAYS_TOP.map(() => null))
  const raysBotRefs    = useRef(RAYS_BOT.map(() => null))
  const raysIntTopRefs = useRef(RAYS_INT_TOP.map(() => null))
  const raysIntBotRefs = useRef(RAYS_INT_BOT.map(() => null))
  const gradRefs       = useRef({ rg:{}, rgb:{}, ri:{}, rib:{}, rgh: null })
  const stateRef       = useRef(0)
  const targetRef      = useRef(0)
  const rafRef         = useRef(null)

  useEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages, waiting])

  // Animation loop — only runs during portal phase
  useEffect(() => {
    if (phase === 'chat') return
    const B = { rx:370, ry:156, sw:2.4, so:0.88 }
    const F = { rx:404, ry:171, so:0.22 }

    function frame() {
      const s = stateRef.current
      stateRef.current = s + (targetRef.current - s) * 0.05
      const st = stateRef.current

      if (boldRingRef.current) {
        boldRingRef.current.setAttribute('rx', B.rx + st * 8)
        boldRingRef.current.setAttribute('ry', B.ry + st * 4)
        boldRingRef.current.setAttribute('stroke-width', B.sw + st * 1.2)
        boldRingRef.current.setAttribute('stroke-opacity', B.so)
      }
      if (faintRingRef.current) {
        faintRingRef.current.setAttribute('rx', F.rx + st * 12)
        faintRingRef.current.setAttribute('ry', F.ry + st * 5)
        faintRingRef.current.setAttribute('stroke-opacity', st * F.so)
      }
      if (depthGroupRef.current) depthGroupRef.current.setAttribute('opacity', st)
      if (horizonRef.current)    horizonRef.current.setAttribute('stroke-opacity', st * 0.35)

      ;[...raysTopRefs.current, ...raysBotRefs.current,
        ...raysIntTopRefs.current, ...raysIntBotRefs.current]
        .forEach(el => { if (el) el.setAttribute('stroke-width', 0.55 + st * 1.0) })

      const g = gradRefs.current
      ;[...Object.values(g.rg), ...Object.values(g.rgb),
        ...Object.values(g.ri), ...Object.values(g.rib)]
        .filter(Boolean)
        .forEach(el => el.setAttribute('stop-opacity', st * 0.20))

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  const handleEnter = useCallback(() => { targetRef.current = 1 }, [])
  const handleLeave = useCallback(() => { targetRef.current = 0 }, [])

  // Morph transition: portal fades out, chat fades in
  function triggerMorph() {
    setPhase('morphing')
    // Portal fades out
    setPortalOpacity(0)
    // Chat fades in after a short delay — reads as a morph
    setTimeout(() => {
      setPhase('chat')
      setChatOpacity(1)
    }, 500)
  }

  async function send() {
    const text = input.trim()
    if (!text || waiting) return

    // If still in portal, trigger morph first
    if (phase === 'portal' || phase === 'morphing') {
      triggerMorph()
    }

    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setWaiting(true)
    try {
      const res = await fetch('/tools/north-star/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          userId: user?.id,
        }),
      })
      const data = await res.json()
      let parsed = null
      try { parsed = JSON.parse((data.message || '').replace(/```json|```/g, '').trim()) } catch {}
      if (parsed?.type === 'results') {
        setMessages(prev => [...prev, { role: 'result', data: parsed }])
        setDone(true)
        if (user?.id && parsed.stage) {
          try { await supabase.from('north_star_notes').delete().eq('user_id', user.id).eq('tool', 'north-star') } catch {}
          const notes = [
            parsed.stage      ? `North Star stage: ${parsed.stage}` : null,
            parsed.stage_note ? `Stage context: ${parsed.stage_note}` : null,
            parsed.recommendations?.[0]?.title ? `Recommended entry point: ${parsed.recommendations[0].title}` : null,
          ].filter(Boolean)
          if (notes.length) {
            try { await supabase.from('north_star_notes').insert(notes.map(n => ({ user_id: user.id, tool: 'north-star', note: n }))) } catch {}
          }
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message || data.reply || '' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went quiet on my end. Try again in a moment.' }])
    }
    setWaiting(false)
  }

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', position: 'relative' }}>

      {/* Portal — visible in portal + morphing phase */}
      {phase !== 'chat' && (
        <PortalOval
          onFirstSend={send}
          portalOpacity={portalOpacity}
          boldRingRef={boldRingRef}
          faintRingRef={faintRingRef}
          horizonRef={horizonRef}
          depthGroupRef={depthGroupRef}
          raysTopRefs={raysTopRefs}
          raysBotRefs={raysBotRefs}
          raysIntTopRefs={raysIntTopRefs}
          raysIntBotRefs={raysIntBotRefs}
          gradRefs={gradRefs}
          input={input}
          setInput={setInput}
          waiting={waiting}
          textareaRef={textareaRef}
          wrapRef={wrapRef}
          handleEnter={handleEnter}
          handleLeave={handleLeave}
        />
      )}

      {/* Full chat — fades in after morph */}
      {phase === 'chat' && (
        <div style={{
          opacity: chatOpacity,
          transition: 'opacity 0.5s ease',
          maxWidth: '640px',
          margin: '0 auto',
        }}>
          <FullChat
            messages={messages}
            input={input}
            setInput={setInput}
            waiting={waiting}
            done={done}
            send={send}
            messagesRef={messagesRef}
            textareaRef={textareaRef}
          />
        </div>
      )}
    </div>
  )
}
