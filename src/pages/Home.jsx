import { useState, useEffect, useRef } from 'react'
import { Nav } from '../components/Nav'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../hooks/useSupabase'
import { ToolCompassPanel } from '../components/ToolCompassPanel'
import { SiteFooter } from '../components/SiteFooter'
import { DarkSection, DarkHeading, DarkBody } from '../components/DarkSection'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }

// ─────────────────────────────────────────────────────────────
// Testimonials — unchanged content, they're guests not claims
// ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { q: 'Working with Nik definitely changed my life. He has the ability to build up the right foundation and the right container to actually be vulnerable and go straight to where you need to.', cite: 'S.H.' },
  { q: `The work we've done has peeled back the narrative that said 'I can't do that' and revealed another world of possibility. I feel like I've been liberated.`, cite: 'C.W.' },
  { q: `I think this is the best decision I've ever made. You've helped me unlock things I thought were dead and buried long ago.`, cite: 'L.D.' },
  { q: 'Nik really is a champion of your greatness. He helped me learn about who I was at the core of my being — what I really wanted out of life — and how to live as the best version of myself.', cite: 'O.W.H.' },
  { q: `I'm 63 years old and just met myself for the first time working with Nik.`, cite: 'J.B.' },
  { q: `I came to Nik a few weeks in, apologising for not doing my homework — and found myself telling him I'd met someone, gone on wonderful adventures, that my work was expanding. He said: 'Look at what you wrote in week one.' I was already living it.`, cite: 'J.M.' },
]

function Stars() {
  return (
    <div style={{ display: 'flex', gap: '3px', marginBottom: '14px' }}>
      {[0,1,2,3,4].map(i => (
        <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#C8922A" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 0.5l1.545 4.756H13.5l-4.045 2.938 1.545 4.756L7 10.012l-3.999 2.938 1.545-4.756L0.5 5.256h4.955L7 0.5z"/>
        </svg>
      ))}
    </div>
  )
}

function TestimonialCard({ q, cite }) {
  return (
    <div style={{
      flexShrink: 0, width: '300px',
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.78)',
      borderRadius: '14px',
      padding: '24px 28px',
      marginRight: '20px',
    }}>
      <Stars />
      <p style={{ ...body, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.85)', lineHeight: 1.75, marginBottom: '16px' }}>{q}</p>
      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#A8721A' }}>{'—'} {cite}</span>
    </div>
  )
}

function TestimonialCarousel() {
  const row1 = [...TESTIMONIALS, ...TESTIMONIALS]
  const row2 = [...TESTIMONIALS, ...TESTIMONIALS]
  const duration = TESTIMONIALS.length * 12
  return (
    <div style={{
      border: '1px solid rgba(200,146,42,0.78)',
      borderRadius: '14px',
      padding: '20px 0',
      background: '#FAFAF7',
      overflow: 'hidden',
    }}>
      <div style={{ overflow: 'hidden' }}>
      <style>{`
        @keyframes scrollLeft  { 0% { transform: translateX(0); }   100% { transform: translateX(-50%); } }
        @keyframes scrollRight { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
        .home-carousel-left  { display: flex; width: max-content; animation: scrollLeft ${duration}s linear infinite; }
        .home-carousel-right { display: flex; width: max-content; animation: scrollRight ${duration}s linear infinite; }
        .home-carousel-left:hover, .home-carousel-right:hover { animation-play-state: paused; }
      `}</style>
      <div style={{ marginBottom: '20px', padding: '8px 0' }}>
        <div className="home-carousel-left">
          {row1.map((t, i) => <TestimonialCard key={i} q={t.q} cite={t.cite} />)}
        </div>
      </div>
      <div style={{ padding: '8px 0' }}>
        <div className="home-carousel-right">
          {row2.map((t, i) => <TestimonialCard key={i} q={t.q} cite={t.cite} />)}
        </div>
      </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// North Star — the locating layer, embedded inline in the hero
// ─────────────────────────────────────────────────────────────
// Opening line is the softened version from the spec:
// "Tell me a little about what's going on. I'll point you somewhere useful."
//
// This component mirrors the behavior of the full Orienteering page —
// same API, same result rendering, same North Star memory writes when
// the user is signed in. The difference is only visual: it lives in the
// homepage hero so visitors don't have to navigate to be received.

const NS_OPENING = `Tell me a little about what's going on. I'll point you somewhere useful.`

function NorthStarInline() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([{ role: 'assistant', content: NS_OPENING }])
  const [input, setInput]       = useState('')
  const [waiting, setWaiting]   = useState(false)
  const [done, setDone]         = useState(false)
  const messagesRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages, waiting])

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
          userId: user?.id
        })
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
            parsed.stage       ? `North Star stage: ${parsed.stage}` : null,
            parsed.stage_note  ? `Stage context: ${parsed.stage_note}` : null,
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
            <div key={i} style={{ ...body, fontSize: '16px', lineHeight: 1.8, color: '#0F1523', alignSelf: 'flex-start', maxWidth: '92%' }}>
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
                {d.stage && <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '8px' }}>{d.stage}</div>}
                <div style={{ ...body, fontSize: '16px', lineHeight: 1.8, color: '#0F1523', marginBottom: '16px' }}>{d.reflection}</div>
                {(d.recommendations || []).map((r, ri) => (
                  <div key={ri} style={{ borderTop: '1px solid rgba(200,146,42,0.20)', paddingTop: '14px', marginTop: '14px' }}>
                    <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.72)', marginBottom: '4px' }}>{r.category}</div>
                    <div style={{ ...body, fontSize: '17px', color: '#0F1523', marginBottom: '4px' }}>{r.title}</div>
                    <div style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.88)', lineHeight: 1.65, marginBottom: '8px' }}>{r.description}</div>
                    {r.link && r.link !== 'null' && <a href={r.link} style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}>{r.link_text || 'Go there →'}</a>}
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
            <style>{`@keyframes nsPulse { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
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
              const el = e.target
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Take your time…"
            rows={1}
            style={{
              flex: 1, resize: 'none',
              border: '1.5px solid rgba(200,146,42,0.30)',
              borderRadius: '10px',
              padding: '11px 14px',
              ...body, fontSize: '16px', color: '#0F1523',
              background: '#FAFAF7', outline: 'none',
              lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto',
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
              background: 'rgba(200,146,42,0.05)',
              ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
              color: '#A8721A', cursor: 'pointer',
              whiteSpace: 'nowrap',
              opacity: (!input.trim() || waiting) ? 0.4 : 1,
            }}
          >Send</button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Known-path cards — for visitors who already know what they need
// ─────────────────────────────────────────────────────────────
const KNOWN_PATHS = [
  {
    label: 'Working on yourself',
    sub:   'Tools for your own life',
    href:  '/tools',
  },
  {
    label: 'Working on a project',
    sub:   'Find where it fits in the work',
    href:  '/tools/purpose-piece',
  },
  {
    label: 'Representing an organisation or practice',
    sub:   'Map what you are building',
    href:  '/nextus/place',
  },
]

function KnownPathCard({ label, sub, href }) {
  return (
    <a href={href} style={{
      display: 'block',
      padding: '20px 24px',
      border: '1px solid rgba(200,146,42,0.25)',
      borderRadius: '14px',
      background: 'rgba(200,146,42,0.03)',
      textDecoration: 'none',
      transition: 'all 0.18s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)'
        e.currentTarget.style.background   = 'rgba(200,146,42,0.07)'
        e.currentTarget.style.transform    = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(200,146,42,0.25)'
        e.currentTarget.style.background   = 'rgba(200,146,42,0.03)'
        e.currentTarget.style.transform    = ''
      }}
    >
      <div style={{ ...body, fontSize: '17px', fontWeight: 300, color: '#0F1523', marginBottom: '4px', lineHeight: 1.3 }}>
        {label} <span style={{ color: '#A8721A' }}>→</span>
      </div>
      <div style={{ ...body, fontSize: '14px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', lineHeight: 1.4 }}>
        {sub}
      </div>
    </a>
  )
}

// ─────────────────────────────────────────────────────────────
// HomePage — the hospitality entry
// ─────────────────────────────────────────────────────────────
export function HomePage() {
  const { user } = useAuth()

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="home" />

      <style>{`
        @media (max-width: 640px) {
          .home-hero    { padding-left: 24px !important; padding-right: 24px !important; }
          .home-section { padding-left: 24px !important; padding-right: 24px !important; }
          .home-paths   { grid-template-columns: 1fr !important; }
        }
        .home-section { position: relative; z-index: 1; }
        .home-hero    { position: relative; z-index: 1; }
      `}</style>

      {/* ─────────────────────────────────────────────────────
          HERO — greeting, the Field line, and the one question
          One name, one line, one door. North Star sits directly
          below so the visitor can be met without navigating away.
      ───────────────────────────────────────────────────── */}
      <section className="home-hero" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: 'clamp(72px, 10vw, 112px) 40px 64px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(200,146,42,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '720px' }}>

          {/* The name */}
          <div style={{ marginBottom: '32px' }}>
            <img src="/logo_hero.png" alt="NextUs" style={{ height: 'clamp(96px, 14vw, 140px)', width: 'auto', display: 'inline-block' }} />
          </div>

          {/* Gold hairline */}
          <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.5, margin: '0 auto 28px' }} />

          {/* The Field line — the only claim at the door */}
          <p style={{
            ...serif,
            fontSize: 'clamp(22px, 2.8vw, 30px)',
            fontWeight: 300,
            fontStyle: 'italic',
            color: '#0F1523',
            lineHeight: 1.35,
            marginBottom: '40px',
            maxWidth: '560px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            NextUs takes <em style={{ color: '#A8721A', fontStyle: 'normal' }}>us</em> from where we are to where we want to be.
          </p>

          {/* The one question — North Star embed */}
          <NorthStarInline />

          {!user && (
            <p style={{
              ...body,
              fontSize: '14px',
              fontWeight: 300,
              color: 'rgba(15,21,35,0.45)',
              marginTop: '18px',
            }}>
              <a href="/login" style={{ color: 'rgba(15,21,35,0.55)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Sign in</a> to save your work across sessions.
            </p>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────
          ALREADY KNOW WHAT YOU NEED?
          Small, quiet, opt-in. For visitors who arrived with
          clarity and don't need the locating conversation.
          Three cards route straight to the door that matches.
      ───────────────────────────────────────────────────── */}
      <section className="home-section" style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: '80px 40px 40px',
        borderTop: '1px solid rgba(200,146,42,0.20)',
      }}>
        <span style={{ ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>
          Already know what you need?
        </span>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '32px', maxWidth: '520px' }}>
          Skip the conversation and go straight to the door that matches.
        </p>
        <div className="home-paths" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '14px',
        }}>
          {KNOWN_PATHS.map(p => (
            <KnownPathCard key={p.href} {...p} />
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────
          NOT READY TO DO ANYTHING?
          The observer path — watching is legitimate.
          A visitor who isn't ready to act can still be received.
      ───────────────────────────────────────────────────── */}
      <section className="home-section" style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: '32px 40px 80px',
      }}>
        <div style={{
          padding: '28px 32px',
          border: '1px dashed rgba(200,146,42,0.35)',
          borderRadius: '14px',
          background: 'rgba(200,146,42,0.02)',
        }}>
          <span style={{ ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '10px' }}>
            Not ready to do anything?
          </span>
          <p style={{ ...body, fontSize: '17px', fontWeight: 300, fontStyle: 'italic', color: '#0F1523', lineHeight: 1.7, marginBottom: '16px', maxWidth: '520px' }}>
            You can just watch for a while. Come back when something pulls.
          </p>
          <a href="/watch" style={{
            ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
            color: '#A8721A', textDecoration: 'none',
            borderBottom: '1px solid rgba(200,146,42,0.35)',
            paddingBottom: '2px',
          }}>
            See what's happening →
          </a>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────
          THE PREMISE — earned, not declared
          Arrives after the visitor has been offered four ways
          to be received. The claim is permitted now because
          it explains an experience they've already had.
      ───────────────────────────────────────────────────── */}
      <DarkSection>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em', color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '14px' }}>
          The premise
        </span>
        <DarkHeading>
          What you build in yourself, you contribute to the world.
        </DarkHeading>
        <DarkBody>
          The personal and the civilisational are not separate projects. Every domain you build in yourself maps directly to a domain humanity is trying to build together. This is not metaphor — it is the architecture of the platform.
        </DarkBody>
        <a href="/nextus" style={{
          display: 'inline-block',
          ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.16em',
          padding: '13px 32px', borderRadius: '40px',
          border: '1.5px solid rgba(200,146,42,0.7)',
          color: '#A8721A',
          background: 'rgba(200,146,42,0.07)',
          textDecoration: 'none',
        }}>
          See how the whole thing fits →
        </a>
      </DarkSection>

      {/* ─────────────────────────────────────────────────────
          TESTIMONIALS — the only section about the platform
          is one spoken in the voices of guests, not the host.
      ───────────────────────────────────────────────────── */}
      <section className="home-section" style={{ maxWidth: '820px', margin: '0 auto', padding: '96px 40px' }}>
        <span style={{ ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '14px', textAlign: 'center' }}>
          What people say
        </span>
        <h2 style={{ ...serif, fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.2, marginBottom: '48px', textAlign: 'center' }}>
          Real words from real people.
        </h2>
        <TestimonialCarousel />
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a href="/work-with-nik" style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', opacity: 0.78 }}>
            More on working with Nik →
          </a>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────
          STAY CLOSE — the gentle door held open for later.
          No conversion pressure. Just: when you want more, we're here.
      ───────────────────────────────────────────────────── */}
      <DarkSection style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <img src="/logo_nav.png" alt="NextUs" style={{ height: '36px', width: 'auto', display: 'inline-block', opacity: 0.78 }} />
        </div>
        <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.4, margin: '0 auto 32px' }} />
        <DarkHeading>Stay close.</DarkHeading>
        <DarkBody style={{ maxWidth: '340px', margin: '0 auto 36px' }}>
          The work is evolving. This is where we share it.
        </DarkBody>
        <div style={{ maxWidth: '380px', margin: '0 auto' }}>
          <script src="https://f.convertkit.com/ckjs/ck.5.js"></script>
          <form
            action="https://app.kit.com/forms/9215183/subscriptions"
            className="seva-form formkit-form"
            method="post"
            data-sv-form="9215183"
            data-uid="d323427d8c"
            data-format="inline"
            data-version="5"
          >
            <input
              type="email"
              name="email_address"
              placeholder="your@email.com"
              required
              style={{
                width: '100%',
                padding: '15px 18px',
                marginBottom: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(200,146,42,0.25)',
                borderRadius: '40px',
                ...body, fontSize: '16px',
                color: 'rgba(255,255,255,0.88)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '16px',
                background: '#C8922A',
                border: '1px solid rgba(168,114,26,0.8)',
                borderRadius: '40px',
                ...sc, fontSize: '16px', letterSpacing: '0.16em',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              Stay connected →
            </button>
          </form>
        </div>
      </DarkSection>

      <ToolCompassPanel />
      <SiteFooter />
    </div>
  )
}
