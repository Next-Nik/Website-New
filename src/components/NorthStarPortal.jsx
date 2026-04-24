import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../hooks/useSupabase'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const GOLD      = '#C8922A'
const GOLD_TEXT = '#A8721A'
const DARK      = '#0F1523'

const NS_OPENING = `Tell me a little about what's going on. I'll point you somewhere useful.`

// ─── SVG geometry constants ───────────────────────────────────
const CX = 450, CY = 200

// Primary rays top — endpoints follow bold ring ellipse, scaled 125%
const RAYS_TOP = [
  { id:'r0', x2:-212, y2:106  },
  { id:'r1', x2:-125, y2:-25  },
  { id:'r2', x2:25,   y2:-131 },
  { id:'r3', x2:225,  y2:-144 },
  { id:'r4', x2:450,  y2:-150 },
  { id:'r5', x2:675,  y2:-144 },
  { id:'r6', x2:875,  y2:-131 },
  { id:'r7', x2:1025, y2:-25  },
  { id:'r8', x2:1112, y2:106  },
]
// Primary rays bottom — exact mirror y2 = 400 - y2_top
const RAYS_BOT = RAYS_TOP.map((r, i) => ({ id: `rb${i}`, x2: r.x2, y2: 400 - r.y2 }))

// Intermediate rays top — 75% opacity, 75% length, midpoint angles
const RAYS_INT_TOP = [
  { id:'ri0', x2:-16,  y2:78  },
  { id:'ri1', x2:74,   y2:-15 },
  { id:'ri2', x2:209,  y2:-62 },
  { id:'ri3', x2:369,  y2:-74 },
  { id:'ri4', x2:531,  y2:-74 },
  { id:'ri5', x2:691,  y2:-62 },
  { id:'ri6', x2:826,  y2:-15 },
  { id:'ri7', x2:916,  y2:78  },
]
const RAYS_INT_BOT = RAYS_INT_TOP.map((r, i) => ({ id: `rib${i}`, x2: r.x2, y2: 400 - r.y2 }))

// All ray groups
const ALL_RAYS = [...RAYS_TOP, ...RAYS_BOT, ...RAYS_INT_TOP, ...RAYS_INT_BOT]

// Depth fill ellipses — stacked, all same opacity, accumulate toward centre
const DEPTH_FILLS = [
  { rx:370, ry:156 }, { rx:330, ry:139 }, { rx:294, ry:124 },
  { rx:262, ry:110 }, { rx:233, ry:98  }, { rx:207, ry:87  },
  { rx:183, ry:77  }, { rx:161, ry:68  }, { rx:141, ry:59  },
  { rx:123, ry:52  }, { rx:107, ry:45  }, { rx:92,  ry:39  },
  { rx:79,  ry:33  }, { rx:67,  ry:28  }, { rx:56,  ry:24  },
  { rx:46,  ry:19  }, { rx:37,  ry:16  }, { rx:29,  ry:12  },
  { rx:22,  ry:9   }, { rx:16,  ry:7   }, { rx:10,  ry:4   },
  { rx:5,   ry:2   },
]

// Grad ID lists for stop animation
const GRAD_IDS = [
  'rg0','rg1','rg2','rg3','rg4','rg5','rg6','rg7','rg8',
  'rgb0','rgb1','rgb2','rgb3','rgb4','rgb5','rgb6','rgb7','rgb8',
  'ri0','ri1','ri2','ri3','ri4','ri5','ri6','ri7',
  'rib0','rib1','rib2','rib3','rib4','rib5','rib6','rib7','rgh',
]

// ─────────────────────────────────────────────────────────────
// The portal SVG — geometry only, no interaction logic
// ─────────────────────────────────────────────────────────────
function PortalSVG({ svgRef }) {
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 900 400"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      <defs>
        {/* Horizon gradient */}
        <linearGradient id="rgh" x1="-100" y1="200" x2="1000" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={GOLD} stopOpacity="0"/>
          <stop offset="40%"  stopColor={GOLD} stopOpacity="0.45"/>
          <stop offset="60%"  stopColor={GOLD} stopOpacity="0.45"/>
          <stop offset="100%" stopColor={GOLD} stopOpacity="0"/>
        </linearGradient>

        {/* Primary ray gradients top */}
        {RAYS_TOP.map((r, i) => (
          <linearGradient key={i} id={`rg${i}`} x1={CX} y1={CY} x2={r.x2} y2={r.y2} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={GOLD} stopOpacity="0"/>
            <stop offset="40%"  stopColor={GOLD} stopOpacity="0.45"/>
            <stop offset="100%" stopColor={GOLD} stopOpacity="0"/>
          </linearGradient>
        ))}

        {/* Primary ray gradients bottom */}
        {RAYS_BOT.map((r, i) => (
          <linearGradient key={i} id={`rgb${i}`} x1={CX} y1={CY} x2={r.x2} y2={r.y2} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={GOLD} stopOpacity="0"/>
            <stop offset="40%"  stopColor={GOLD} stopOpacity="0.45"/>
            <stop offset="100%" stopColor={GOLD} stopOpacity="0"/>
          </linearGradient>
        ))}

        {/* Intermediate ray gradients top */}
        {RAYS_INT_TOP.map((r, i) => (
          <linearGradient key={i} id={`ri${i}`} x1={CX} y1={CY} x2={r.x2} y2={r.y2} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={GOLD} stopOpacity="0"/>
            <stop offset="40%"  stopColor={GOLD} stopOpacity="0.34"/>
            <stop offset="100%" stopColor={GOLD} stopOpacity="0"/>
          </linearGradient>
        ))}

        {/* Intermediate ray gradients bottom */}
        {RAYS_INT_BOT.map((r, i) => (
          <linearGradient key={i} id={`rib${i}`} x1={CX} y1={CY} x2={r.x2} y2={r.y2} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={GOLD} stopOpacity="0"/>
            <stop offset="40%"  stopColor={GOLD} stopOpacity="0.34"/>
            <stop offset="100%" stopColor={GOLD} stopOpacity="0"/>
          </linearGradient>
        ))}
      </defs>

      {/* Depth fills — grouped so group opacity controls the whole tunnel */}
      <g id="portalDepthGroup" opacity="0">
        {DEPTH_FILLS.map((d, i) => (
          <ellipse key={i} cx={CX} cy={CY} rx={d.rx} ry={d.ry} fill={GOLD} fillOpacity="0.035"/>
        ))}
      </g>

      {/* Horizon */}
      <line id="portalHorizon" x1="-100" y1={CY} x2="1000" y2={CY}
        stroke={`url(#rgh)`} strokeWidth="0.8" strokeOpacity="0"/>

      {/* All rays */}
      {ALL_RAYS.map(r => (
        <line key={r.id} id={r.id}
          x1={CX} y1={CY} x2={r.x2} y2={r.y2}
          stroke={`url(#${r.id.startsWith('rib') ? 'rib' + r.id.slice(3) : r.id.startsWith('rb') ? 'rgb' + r.id.slice(2) : r.id.startsWith('ri') ? 'ri' + r.id.slice(2) : 'rg' + r.id.slice(1)})`}
          strokeWidth="0.8"
        />
      ))}

      {/* Faint outer ring */}
      <ellipse id="portalFaintRing" cx={CX} cy={CY} rx="404" ry="171"
        fill="none" stroke={GOLD} strokeWidth="0.8" strokeOpacity="0"/>

      {/* Bold ring — always visible */}
      <ellipse id="portalBoldRing" cx={CX} cy={CY} rx="370" ry="156"
        fill="none" stroke={GOLD} strokeWidth="2.4" strokeOpacity="0.88"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// NorthStarPortal — drop-in replacement for NorthStarInline
// ─────────────────────────────────────────────────────────────
export function NorthStarPortal() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([{ role: 'assistant', content: NS_OPENING }])
  const [input, setInput]       = useState('')
  const [waiting, setWaiting]   = useState(false)
  const [done, setDone]         = useState(false)
  const messagesRef = useRef(null)
  const textareaRef = useRef(null)
  const svgRef      = useRef(null)
  const wrapRef     = useRef(null)
  const stateRef    = useRef(0)
  const targetRef   = useRef(0)
  const rafRef      = useRef(null)

  // Scroll messages
  useEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages, waiting])

  // Animation loop
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    function safe(id, attr, val) {
      const el = svg.getElementById ? svg.getElementById(id) : document.getElementById(id)
      if (el) el.setAttribute(attr, val)
    }

    function getEl(id) {
      return svg.getElementById ? svg.getElementById(id) : document.getElementById(id)
    }

    const depthGroup = getEl('portalDepthGroup')
    const boldRing   = getEl('portalBoldRing')
    const faintRing  = getEl('portalFaintRing')
    const horizon    = getEl('portalHorizon')
    const allRayEls  = ALL_RAYS.map(r => getEl(r.id)).filter(Boolean)
    const gradStops  = GRAD_IDS.map(id => {
      const g = getEl(id)
      return g ? g.querySelectorAll('stop')[0] : null
    }).filter(Boolean)

    const B = { rx: 370, ry: 156, sw: 2.4, so: 0.88 }
    const F = { rx: 404, ry: 171, so: 0.22 }

    function frame() {
      const s = stateRef.current
      const t = targetRef.current
      stateRef.current = s + (t - s) * 0.05

      const state = stateRef.current

      if (boldRing) {
        boldRing.setAttribute('rx', B.rx + state * 8)
        boldRing.setAttribute('ry', B.ry + state * 4)
        boldRing.setAttribute('stroke-width', B.sw + state * 1.2)
        boldRing.setAttribute('stroke-opacity', B.so)
      }
      if (faintRing) {
        faintRing.setAttribute('rx', F.rx + state * 12)
        faintRing.setAttribute('ry', F.ry + state * 5)
        faintRing.setAttribute('stroke-opacity', state * F.so)
      }
      if (depthGroup) depthGroup.setAttribute('opacity', state)
      if (horizon)    horizon.setAttribute('stroke-opacity', state * 0.22)

      allRayEls.forEach(r => r.setAttribute('stroke-width', 0.55 + state * 1.0))
      gradStops.forEach(s => s.setAttribute('stop-opacity', state * 0.45))

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Mouse enter/leave
  const handleEnter = useCallback(() => { targetRef.current = 1 }, [])
  const handleLeave = useCallback(() => { targetRef.current = 0 }, [])

  // Chat send
  async function send() {
    const text = input.trim()
    if (!text || waiting) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
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
    <div
      ref={wrapRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '720px',
        margin: '0 auto',
      }}
    >
      {/* Portal SVG — sits behind content, sized to match the oval */}
      <div style={{
        position: 'absolute',
        inset: '-18% -12%',   // bleed wider/taller than content so oval encloses it
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        <PortalSVG svgRef={svgRef} />
      </div>

      {/* Chat content — sits inside the oval */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Messages */}
        <div
          ref={messagesRef}
          style={{
            minHeight: '120px',
            maxHeight: '380px',
            overflowY: 'auto',
            padding: '32px 48px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.map((m, i) => {
            if (m.role === 'assistant') return (
              <div key={i} style={{
                ...serif,
                fontSize: 'clamp(17px, 2vw, 21px)',
                fontWeight: 300,
                lineHeight: 1.55,
                color: DARK,
                alignSelf: 'flex-start',
                maxWidth: '92%',
                textAlign: 'center',
                width: '100%',
              }}>
                {m.content}
              </div>
            )
            if (m.role === 'user') return (
              <div key={i} style={{
                ...body,
                fontSize: '15px',
                fontStyle: 'italic',
                color: 'rgba(15,21,35,0.72)',
                background: 'rgba(200,146,42,0.06)',
                border: '1px solid rgba(200,146,42,0.20)',
                borderRadius: '10px',
                padding: '10px 14px',
                alignSelf: 'flex-end',
                maxWidth: '80%',
              }}>
                {m.content}
              </div>
            )
            if (m.role === 'result') {
              const d = m.data
              return (
                <div key={i} style={{
                  background: '#FAFAF7',
                  border: '1.5px solid rgba(200,146,42,0.78)',
                  borderRadius: '12px',
                  padding: '22px',
                  alignSelf: 'flex-start',
                  maxWidth: '96%',
                  textAlign: 'left',
                }}>
                  {d.stage && (
                    <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', color: GOLD_TEXT, marginBottom: '8px' }}>
                      {d.stage}
                    </div>
                  )}
                  <div style={{ ...body, fontSize: '16px', lineHeight: 1.8, color: DARK, marginBottom: '16px' }}>
                    {d.reflection}
                  </div>
                  {(d.recommendations || []).map((r, ri) => (
                    <div key={ri} style={{ borderTop: '1px solid rgba(200,146,42,0.20)', paddingTop: '14px', marginTop: '14px' }}>
                      <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.72)', marginBottom: '4px' }}>{r.category}</div>
                      <div style={{ ...body, fontSize: '17px', color: DARK, marginBottom: '4px' }}>{r.title}</div>
                      <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.88)', lineHeight: 1.65, marginBottom: '8px' }}>{r.description}</div>
                      {r.link && r.link !== 'null' && (
                        <a href={r.link} style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', color: GOLD_TEXT, textDecoration: 'none' }}>
                          {r.link_text || 'Go there →'}
                        </a>
                      )}
                    </div>
                  ))}
                  {d.closing && (
                    <div style={{ ...body, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(200,146,42,0.20)' }}>
                      {d.closing}
                    </div>
                  )}
                </div>
              )
            }
            return null
          })}

          {waiting && (
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '4px 0', justifyContent: 'center' }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'rgba(200,146,42,0.45)',
                  animation: `nsPulse 1.4s ease ${d}s infinite`,
                }}/>
              ))}
              <style>{`@keyframes nsPulse { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
            </div>
          )}
        </div>

        {/* Input row */}
        {!done && (
          <div style={{
            padding: '12px 40px 28px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                const el = e.target
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Take your time…"
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                border: '1.5px solid rgba(200,146,42,0.35)',
                borderRadius: '10px',
                padding: '11px 14px',
                ...body,
                fontSize: '16px',
                color: DARK,
                background: '#FAFAF7',
                outline: 'none',
                lineHeight: 1.5,
                maxHeight: '120px',
                overflowY: 'auto',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || waiting}
              style={{
                flexShrink: 0,
                padding: '11px 22px',
                borderRadius: '40px',
                border: '1.5px solid rgba(200,146,42,0.78)',
                background: '#FAFAF7',
                ...sc,
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                color: GOLD_TEXT,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                opacity: (!input.trim() || waiting) ? 0.4 : 1,
              }}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
