import { useState, useEffect, useRef } from 'react'
import { SiteNav } from '../components/SiteNav'
import { ToolCompassPanel } from '../components/ToolCompassPanel'
import { SiteFooter } from '../components/SiteFooter'

const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

const STAGES = {
  baseline: {
    name: 'Baseline', question: 'Am I allowed to exist?',
    desc: 'The floor everything else stands on. Safety and permission to exist at a nervous-system, body level. Without it, everything feels like threat, growth feels dangerous, and insight destabilises rather than liberates. The work here is regulation, containment, and finding ground.',
    primary: { title: 'Foundation', sub: 'A guided audio practice to settle and re-establish ground.', url: '/tools/foundation', badge: 'Life OS Tool' },
    above: { title: 'The Map', sub: 'When you have a little more ground, see where you actually are.', url: '/tools/map', badge: 'Life OS Tool' },
    below: null,
    external: ['somatic therapy', 'trauma-informed support', 'nervous system regulation', 'polyvagal therapy']
  },
  autonomy: {
    name: 'Autonomy', question: 'Am I allowed to want?',
    desc: 'Where the self starts moving again — not goals, not strategy, but desire. The work here is reclaiming the right to direct oneself and meeting the shame around wanting.',
    primary: { title: 'Foundation', sub: 'Build the internal stability that makes self-direction possible.', url: '/tools/foundation', badge: 'Life OS Tool' },
    above: { title: 'The Map', sub: 'An honest picture of where you are once you can see clearly.', url: '/tools/map', badge: 'Life OS Tool' },
    below: null,
    external: ['inner child work', 'parts work / IFS', 'shame resilience', 'self-compassion practices']
  },
  calibration: {
    name: 'Calibration', question: 'Where am I actually?',
    desc: 'Reality contact — honest self-assessment, mapping life domains, seeing patterns without collapse. This is where the picture becomes clear enough to navigate from.',
    primary: { title: 'The Map', sub: 'Seven domains. One honest picture of where you are right now.', url: '/tools/map', badge: 'Life OS Tool' },
    above: { title: 'Purpose Piece', sub: 'Find your contribution pattern — the role you are built to play.', url: '/tools/purpose-piece', badge: 'Life OS Tool' },
    below: { title: 'Foundation', sub: 'If looking clearly feels like too much — this is where to start.', url: '/tools/foundation', badge: 'Life OS Tool' },
    external: ['journalling practices', 'life audit frameworks', 'values clarification', 'honest self-assessment']
  },
  integration: {
    name: 'Integration', question: 'Can I hold all of myself?',
    desc: 'Metabolising past experience, reconciling contradictions, reducing internal fragmentation. This is where energy stops leaking and becomes available for something new.',
    primary: { title: 'Purpose Piece', sub: 'Surface the contribution pattern that has been there all along.', url: '/tools/purpose-piece', badge: 'Life OS Tool' },
    above: { title: 'Work with Nik', sub: 'Identity-level work for people ready to do something with what they find.', url: '/work-with-nik', badge: 'Facilitated' },
    below: { title: 'The Map', sub: 'See where the fragmentation shows up across your life domains.', url: '/tools/map', badge: 'Life OS Tool' },
    external: ['parts work / IFS', 'shadow work', 'narrative therapy', 'Jungian approaches']
  },
  agency: {
    name: 'Agency', question: 'Can I act from self?',
    desc: 'Action becomes possible — not reactive effort, not proving, but true choice. Behaviour stabilises, discipline emerges naturally, self-trust begins to build.',
    primary: { title: 'Target Sprint', sub: 'Three areas. Ninety days. A route reverse-engineered from where you want to be.', url: '/tools/target-goals', badge: 'Life OS Tool' },
    above: { title: 'Work with Nik', sub: 'For people ready to act on what they have found.', url: '/work-with-nik', badge: 'Facilitated' },
    below: { title: 'Purpose Piece', sub: 'Clarify what you are acting toward before you act.', url: '/tools/purpose-piece', badge: 'Life OS Tool' },
    external: ['implementation intentions', 'habit architecture', 'values-based goal setting', 'accountability structures']
  },
  embodiment: {
    name: 'Embodiment', question: 'Can I be who I really am?',
    desc: 'Identity stops being conceptual — behaviour aligns with values, the nervous system tolerates expansion, relationships reorganise around who you actually are.',
    primary: { title: 'Work with Nik', sub: 'Identity-level work. The crossing from who you have been to who you are becoming.', url: '/work-with-nik', badge: 'Facilitated' },
    above: { title: 'NextUs', sub: 'Find where your fully expressed self belongs in the larger project.', url: '/nextus', badge: 'NextUs' },
    below: { title: 'Target Sprint', sub: 'Operationalise the identity shift — three areas, ninety days.', url: '/tools/target-goals', badge: 'Life OS Tool' },
    external: ['embodied leadership', 'somatic coaching', 'identity-level work', 'ontological coaching']
  },
  contribution: {
    name: 'Contribution', question: 'What is my life in service of?',
    desc: 'Meaning stabilises the psyche. Contribution integrates the self. Purpose regulates existential anxiety. This is not saviour energy — it is participation in reality.',
    primary: { title: 'NextUs', sub: 'The civilisational map — seven domains, and where your work belongs.', url: '/nextus', badge: 'NextUs' },
    above: null,
    below: { title: 'Purpose Piece', sub: 'What did life ask you to bring? Your archetype, domain, and scale.', url: '/tools/purpose-piece', badge: 'Life OS Tool' },
    external: ['systems thinking', 'theory of change', 'purpose-driven leadership', 'civilisational contribution']
  }
}

function StageRec({ rec, soft }) {
  if (!rec) return null
  return (
    <a href={rec.url} style={{
      display: 'flex', alignItems: 'flex-start', gap: '14px',
      padding: '14px 16px', borderRadius: '14px', marginBottom: '8px',
      textDecoration: 'none',
      border: soft ? '1.5px solid rgba(200,146,42,0.20)' : '1.5px solid rgba(200,146,42,0.78)',
      background: soft ? 'transparent' : 'rgba(200,146,42,0.05)',
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)'; e.currentTarget.style.background = 'rgba(200,146,42,0.05)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = soft ? 'rgba(200,146,42,0.20)' : 'rgba(200,146,42,0.78)'; e.currentTarget.style.background = soft ? 'transparent' : 'rgba(200,146,42,0.05)' }}
    >
      <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.78)', background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '40px', padding: '3px 10px', flexShrink: 0, marginTop: '2px', whiteSpace: 'nowrap' }}>{rec.badge}</span>
      <div style={{ flex: 1 }}>
        <div style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#A8721A', marginBottom: '3px' }}>{rec.title}</div>
        <div style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.78)', lineHeight: 1.4 }}>{rec.sub}</div>
      </div>
      <span style={{ color: '#A8721A', fontSize: '15px', marginTop: '2px', flexShrink: 0 }}>{'\u2192'}</span>
    </a>
  )
}

function StagePanel({ stage }) {
  if (!stage) return null
  const s = STAGES[stage]
  return (
    <div style={{
      marginTop: '32px', background: '#FFFFFF',
      border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', overflow: 'hidden',
      animation: 'panelIn 0.2s ease',
    }}>
      <style>{`@keyframes panelIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{ padding: '28px 28px 24px' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '6px' }}>{s.name}</span>
        <div style={{ ...serif, fontSize: '26px', fontWeight: 300, color: '#0F1523', marginBottom: '4px', lineHeight: 1.1 }}>{s.name}</div>
        <div style={{ ...serif, fontSize: '16px', fontStyle: 'italic', color: 'rgba(15,21,35,0.78)', marginBottom: '14px', lineHeight: 1.6 }}>{s.question}</div>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '24px', maxWidth: '520px' }}>{s.desc}</p>
        <div style={{ height: '1px', background: 'rgba(200,146,42,0.20)', marginBottom: '24px' }} />
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.78)', display: 'block', marginBottom: '12px' }}>Where to start</span>
        <StageRec rec={s.primary} soft={false} />
        {s.above && (<><div style={{ height: '1px', background: 'rgba(200,146,42,0.20)', margin: '16px 0' }} /><span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.78)', display: 'block', marginBottom: '12px' }}>When you are ready for the next step</span><StageRec rec={s.above} soft={true} /></>)}
        {s.below && (<><div style={{ height: '1px', background: 'rgba(200,146,42,0.20)', margin: '16px 0' }} /><span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.78)', display: 'block', marginBottom: '12px' }}>If this feels like too much right now</span><StageRec rec={s.below} soft={true} /></>)}
        {s.external && s.external.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(200,146,42,0.20)' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.78)', display: 'block', marginBottom: '10px' }}>Also worth exploring</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {s.external.map(t => <span key={t} style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.78)', background: 'rgba(15,21,35,0.04)', border: '1px solid rgba(15,21,35,0.10)', borderRadius: '40px', padding: '6px 14px' }}>{t}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function OrienteeringEmbed() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [done, setDone] = useState(false)
  const messagesRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    setMessages([{ role: 'assistant', content: 'Tell me a little about where you are right now — what\u2019s on your mind, what you\u2019re looking for, or just how things feel. I\u2019ll point you in the right direction.' }])
  }, [])

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
      const res = await fetch('/tools/orienteering/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) })
      })
      const data = await res.json()
      let parsed = null
      try { parsed = JSON.parse((data.message || '').replace(/```json|```/g, '').trim()) } catch {}
      if (parsed?.type === 'results') {
        setMessages(prev => [...prev, { role: 'result', data: parsed }])
        setDone(true)
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message || data.reply || '' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went quiet on my end. Try refreshing.' }])
    }
    setWaiting(false)
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', overflow: 'hidden', maxWidth: '600px', margin: '0 auto' }}>
      <div ref={messagesRef} style={{ minHeight: '180px', maxHeight: '420px', overflowY: 'auto', padding: '28px 28px 8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((m, i) => {
          if (m.role === 'assistant') return <div key={i} style={{ ...serif, fontSize: '16px', lineHeight: 1.8, color: '#0F1523', alignSelf: 'flex-start', maxWidth: '88%' }}>{m.content}</div>
          if (m.role === 'user') return <div key={i} style={{ ...serif, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '10px', padding: '10px 14px', alignSelf: 'flex-end', maxWidth: '80%' }}>{m.content}</div>
          if (m.role === 'result') {
            const d = m.data
            return (
              <div key={i} style={{ background: '#FAFAF7', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '12px', padding: '22px', alignSelf: 'flex-start', maxWidth: '92%' }}>
                {d.stage && <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '8px' }}>{d.stage}</div>}
                <div style={{ ...serif, fontSize: '16px', lineHeight: 1.8, color: '#0F1523', marginBottom: '16px' }}>{d.reflection}</div>
                {(d.recommendations || []).map((r, ri) => (
                  <div key={ri} style={{ borderTop: '1px solid rgba(200,146,42,0.20)', paddingTop: '14px', marginTop: '14px' }}>
                    <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.72)', marginBottom: '4px' }}>{r.category}</div>
                    <div style={{ ...serif, fontSize: '17px', color: '#0F1523', marginBottom: '4px' }}>{r.title}</div>
                    <div style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.88)', lineHeight: 1.65, marginBottom: '8px' }}>{r.description}</div>
                    {r.link && r.link !== 'null' && <a href={r.link} style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}>{r.link_text || 'Learn more \u2192'}</a>}
                  </div>
                ))}
                {d.closing && <div style={{ ...serif, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(200,146,42,0.20)' }}>{d.closing}</div>}
              </div>
            )
          }
          return null
        })}
        {waiting && (
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '4px 0' }}>
            {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(200,146,42,0.45)', animation: `orPulse 1.4s ease ${d}s infinite` }} />)}
            <style>{`@keyframes orPulse { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
          </div>
        )}
      </div>
      {!done && (
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.20)', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Write your response here..."
            rows={1}
            style={{ flex: 1, resize: 'none', border: '1.5px solid rgba(200,146,42,0.30)', borderRadius: '10px', padding: '11px 14px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '16px', color: '#0F1523', background: '#FAFAF7', outline: 'none', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto' }}
          />
          <button onClick={send} disabled={!input.trim() || waiting} style={{ flexShrink: 0, padding: '11px 22px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', fontWeight: 600, letterSpacing: '0.14em', color: '#A8721A', cursor: 'pointer', whiteSpace: 'nowrap', opacity: (!input.trim() || waiting) ? 0.4 : 1 }}>Send</button>
        </div>
      )}
    </div>
  )
}

export function HomePage() {
  const [activeStage, setActiveStage] = useState(null)
  const panelRef = useRef(null)

  function toggleStage(key) {
    setActiveStage(prev => prev === key ? null : key)
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
  }

  const stageKeys = Object.keys(STAGES)

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <SiteNav active="home" />

      <style>{`
        @media (max-width: 640px) {
          .home-hero { padding-left: 24px !important; padding-right: 24px !important; }
          .home-section { padding-left: 24px !important; padding-right: 24px !important; }
          .home-dark { padding-left: 24px !important; padding-right: 24px !important; }
        }
      `}</style>
      {/* Hero */}
      <section className="home-hero" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '100px 40px 80px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(200,146,42,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '680px' }}>
          <div style={{ marginBottom: '52px' }}>
            <img src="/logo_hero.png" alt="NextUs" style={{ height: '180px', width: 'auto', display: 'inline-block' }} />
          </div>
          <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.5, margin: '0 auto 36px' }} />
          <h1 style={{ ...serif, fontSize: 'clamp(42px,6vw,72px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '24px' }}>
            A life worth living.<br />
            <em style={{ fontStyle: 'italic', color: '#A8721A' }}>A future worth building.</em>
          </h1>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '52px', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
            Life asked something of you. This is where you find out what.
          </p>
          <a href="/tools/orienteering" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>Begin with Orienteering →</a>
        </div>
        <div style={{ position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <p style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#A8721A', opacity: 0.78 }}>nextus.world</p>
        </div>
      </section>

      {/* Orienteering embed */}
      <section id="start" className="home-section" style={{ maxWidth: '820px', margin: '0 auto', padding: '96px 40px', borderTop: '1px solid rgba(200,146,42,0.20)' }}>
        <div style={{ width: '1px', height: '52px', background: 'rgba(200,146,42,0.20)', margin: '0 auto 64px' }} />
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Where you are</span>
        <h2 style={{ ...serif, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.14, marginBottom: '16px' }}>Not sure where to start?</h2>
        <p style={{ ...serif, fontSize: '17px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, marginBottom: '40px', maxWidth: '480px' }}>Tell me a little about where you are right now. I{'\u2019'}ll point you in the right direction.</p>
        <OrienteeringEmbed />
        <a href="/life-os" style={{ display: 'block', textAlign: 'center', ...serif, fontSize: '16px', fontStyle: 'italic', color: '#A8721A', marginTop: '28px', textDecoration: 'none', opacity: 0.78 }}>or show me everything {'\u2192'}</a>
      </section>

      {/* Stage selector */}
      <section className="home-section" style={{ maxWidth: '820px', margin: '0 auto', padding: '96px 40px', borderTop: '1px solid rgba(200,146,42,0.20)' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Where you are in the arc</span>
        <h2 style={{ ...serif, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.14, marginBottom: '16px' }}>Find your stage.</h2>
        <p style={{ ...serif, fontSize: '17px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, marginBottom: '40px', maxWidth: '480px' }}>Each stage of the arc has its own terrain and its own entry point. Find where you actually are.</p>
        <div>
          {stageKeys.map(key => {
            const s = STAGES[key]
            const isActive = activeStage === key
            return (
              <div key={key} onClick={() => toggleStage(key)} style={{ padding: '10px 4px', cursor: 'pointer', borderBottom: `1px solid ${isActive ? '#A8721A' : 'transparent'}`, transition: 'all 0.18s', marginBottom: '4px' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderBottomColor = 'rgba(200,146,42,0.40)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderBottomColor = 'transparent' }}
              >
                <span style={{ ...serif, fontSize: '22px', fontWeight: 300, color: isActive ? '#A8721A' : '#0F1523', display: 'block', lineHeight: 1.2, marginBottom: '2px', transition: 'color 0.18s' }}>{s.name}</span>
                <span style={{ ...serif, fontSize: '14px', fontStyle: 'italic', color: isActive ? 'rgba(200,146,42,0.78)' : 'rgba(15,21,35,0.72)', lineHeight: 1.4, display: 'block', transition: 'color 0.18s' }}>{s.question}</span>
              </div>
            )
          })}
        </div>
        <div ref={panelRef}><StagePanel stage={activeStage} /></div>
      </section>

      {/* Dark section */}
      <section className="home-dark" style={{ background: '#0F1523', borderTop: '1.5px solid rgba(200,146,42,0.78)', padding: '96px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <img src="/logo_nav.png" alt="NextUs" style={{ height: '40px', width: 'auto', display: 'inline-block', opacity: 0.78 }} />
          </div>
          <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.4, margin: '0 auto 36px' }} />
          <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,34px)', fontWeight: 300, color: 'rgba(255,255,255,0.92)', marginBottom: '12px' }}>Be in the loop.</h2>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(255,255,255,0.55)', marginBottom: '40px', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>Stay up to date on what{'\u2019'}s next for NextUs.</p>
          <div style={{ maxWidth: '380px', margin: '0 auto' }}>
            <script src="https://f.convertkit.com/ckjs/ck.5.js"></script>
            <form action="https://app.kit.com/forms/9215183/subscriptions" className="seva-form formkit-form" method="post" data-sv-form="9215183" data-uid="d323427d8c" data-format="inline" data-version="5">
              <input type="email" name="email_address" placeholder="your@email.com" required style={{ width: '100%', padding: '15px 18px', marginBottom: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '40px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '16px', color: 'rgba(255,255,255,0.88)', outline: 'none' }} />
              <button type="submit" style={{ width: '100%', padding: '16px', background: '#C8922A', border: '1px solid rgba(168,114,26,0.8)', borderRadius: '40px', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '16px', letterSpacing: '0.16em', color: '#FFFFFF', cursor: 'pointer' }}>Stay connected {'\u2192'}</button>
            </form>
          </div>
        </div>
      </section>

      <ToolCompassPanel />
      <SiteFooter />
    </div>
  )
}
