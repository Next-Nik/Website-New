import { useState, useRef } from 'react'
import { DarkSection, DarkEyebrow, DarkHeading, DarkBody, DarkSolidButton, DarkGhostButton } from '../components/DarkSection'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { GlossaryPanel } from '../components/GlossaryPanel'
import SelfExplorer from '../components/self-explorer/SelfExplorer'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../hooks/useSupabase'
import { ToolCompassPanel } from '../components/ToolCompassPanel'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

const DOMAINS = [
  { name: 'Path',       aliases: "Life's Mission · Purpose · Dharma" },
  { name: 'Spark',      aliases: "Vitality · Energy · Joy · Passion" },
  { name: 'Body',       aliases: "Health · Fitness · The Physical" },
  { name: 'Finances',   aliases: "Agency · Money · Currency" },
  { name: 'Connection', aliases: "Your relationships with others" },
  { name: 'Inner Game', aliases: "Your relationship to yourself" },
  { name: 'Signal',     aliases: "Your relationship to the world" },
]

const SHARE_RECS = {
  foundation: { tool: 'Horizon State', url: '/tools/horizon-state', desc: `When someone is depleted, the first move is never to add more — it's to restore the ground. Horizon State is a 20-minute guided practice for nervous system regulation — the floor beneath everything.` },
  map:        { tool: 'The Map',    url: '/tools/map',        desc: `When someone doesn't know where they are, a map is everything. The Map gives an honest picture of their whole life across seven domains — in ten minutes.` },
  purpose:    { tool: 'Purpose Piece', url: '/tools/purpose-piece', desc: `When someone is capable but not yet fully alive in what they do, the question isn't what — it's where. Purpose Piece surfaces the role they're built to play.` },
  leap:       { tool: 'Horizon Leap', url: 'https://calendly.com/nikwood/talk-to-nik', desc: `When the pattern keeps returning despite the work, the work needed is different. Horizon Leap is identity-level work facilitated by Nik. Start with a conversation.` },
}

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

const STAGES = {
  baseline:     { name: 'Baseline',     question: 'Am I functioning?',                  desc: 'The floor everything else stands on. Safety and permission to exist at a nervous-system, body level. Without it, everything feels like threat, growth feels dangerous, and insight destabilises rather than liberates. The work here is regulation, containment, and finding ground.',                                                                              primary: { title: 'Horizon State', sub: 'A guided audio practice to settle and re-establish ground.',                           url: '/tools/horizon-state', badge: 'NextUs Self Tool' }, above: { title: 'The Map',        sub: 'When you have a little more ground, see where you actually are.',                    url: '/tools/map',           badge: 'NextUs Self Tool' }, below: null,                                                                                                                                              external: ['somatic therapy', 'trauma-informed support', 'nervous system regulation', 'polyvagal therapy'] },
  autonomy:     { name: 'Autonomy',     question: 'Do I know what I want?',              desc: 'Where the self starts moving again — not goals, not strategy, but desire. The work here is reclaiming the right to direct oneself and meeting the shame around wanting.',                                                                                                                                                                                      primary: { title: 'Horizon State', sub: 'Build the internal stability that makes self-direction possible.',                      url: '/tools/horizon-state', badge: 'NextUs Self Tool' }, above: { title: 'The Map',        sub: 'An honest picture of where you are once you can see clearly.',                          url: '/tools/map',           badge: 'NextUs Self Tool' }, below: null,                                                                                                                                              external: ['inner child work', 'parts work / IFS', 'shame resilience', 'self-compassion practices'] },
  calibration:  { name: 'Calibration', question: 'Am I being honest with myself?',      desc: 'Reality contact — honest self-assessment, mapping life domains, seeing patterns without collapse. This is where the picture becomes clear enough to navigate from.',                                                                                                                                                                                           primary: { title: 'The Map',       sub: 'Seven domains. One honest picture of where you are right now.',                        url: '/tools/map',           badge: 'NextUs Self Tool' }, above: { title: 'Purpose Piece',  sub: 'Find your contribution pattern — the role you are built to play.',                    url: '/tools/purpose-piece', badge: 'NextUs Self Tool' }, below: { title: 'Horizon State',  sub: 'If looking clearly feels like too much — this is where to start.',                    url: '/tools/horizon-state', badge: 'NextUs Self Tool' }, external: ['journalling practices', 'life audit frameworks', 'values clarification', 'honest self-assessment'] },
  integration:  { name: 'Integration', question: 'Am I whole?',                         desc: 'Metabolising past experience, reconciling contradictions, reducing internal fragmentation. This is where energy stops leaking and becomes available for something new.',                                                                                                                                                                                        primary: { title: 'Purpose Piece', sub: 'Surface the contribution pattern that has been there all along.',                      url: '/tools/purpose-piece', badge: 'NextUs Self Tool' }, above: { title: 'Work with Nik',  sub: 'Identity-level work for people ready to do something with what they find.',           url: '/work-with-nik',       badge: 'Facilitated'      }, below: { title: 'The Map',        sub: 'See where the fragmentation shows up across your life domains.',                      url: '/tools/map',           badge: 'NextUs Self Tool' }, external: ['parts work / IFS', 'shadow work', 'narrative therapy', 'Jungian approaches'] },
  agency:       { name: 'Agency',       question: 'Am I living by my own choices?',      desc: 'Action becomes possible — not reactive effort, not proving, but true choice. Behaviour stabilises, discipline emerges naturally, self-trust begins to build.',                                                                                                                                                                                                primary: { title: 'Target Sprint', sub: 'Three areas. Ninety days. A route reverse-engineered from where you want to be.',      url: '/tools/target-sprint', badge: 'NextUs Self Tool' }, above: { title: 'Work with Nik',  sub: 'For people ready to act on what they have found.',                                    url: '/work-with-nik',       badge: 'Facilitated'      }, below: { title: 'Purpose Piece',  sub: 'Clarify what you are acting toward before you act.',                                 url: '/tools/purpose-piece', badge: 'NextUs Self Tool' }, external: ['implementation intentions', 'habit architecture', 'values-based goal setting', 'accountability structures'] },
  embodiment:   { name: 'Embodiment',   question: 'Am I becoming who I actually am?',    desc: 'Identity stops being conceptual — behaviour aligns with values, the nervous system tolerates expansion, relationships reorganise around who you actually are.',                                                                                                                                                                                               primary: { title: 'Work with Nik', sub: 'Identity-level work. The crossing from who you have been to who you are becoming.',    url: '/work-with-nik',       badge: 'Facilitated'      }, above: { title: 'NextUs',         sub: 'Find where your fully expressed self belongs in the larger project.',                  url: '/nextus',              badge: 'NextUs'           }, below: { title: 'Target Sprint',  sub: 'Operationalise the identity shift — three areas, ninety days.',                      url: '/tools/target-sprint', badge: 'NextUs Self Tool' }, external: ['embodied leadership', 'somatic coaching', 'identity-level work', 'ontological coaching'] },
  contribution: { name: 'Contribution', question: 'What is my life in service of?',     desc: 'Meaning stabilises the psyche. Contribution integrates the self. Purpose regulates existential anxiety. This is not saviour energy — it is participation in reality.',                                                                                                                                                                                       primary: { title: 'NextUs',        sub: 'The civilisational map — seven domains, and where your work belongs.',                 url: '/nextus',              badge: 'NextUs'           }, above: null,                                                                                                                                              below: { title: 'Purpose Piece',  sub: 'What did life ask you to bring? Your archetype, domain, and scale.',                 url: '/tools/purpose-piece', badge: 'NextUs Self Tool' }, external: ['systems thinking', 'theory of change', 'purpose-driven leadership', 'civilisational contribution'] },
}

function StageRec({ rec, soft }) {
  if (!rec) return null
  return (
    <a href={rec.url} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px', borderRadius: '14px', marginBottom: '8px', textDecoration: 'none', border: soft ? '1.5px solid rgba(200,146,42,0.20)' : '1.5px solid rgba(200,146,42,0.78)', background: soft ? 'transparent' : 'rgba(200,146,42,0.05)', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)'; e.currentTarget.style.background = 'rgba(200,146,42,0.05)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = soft ? 'rgba(200,146,42,0.20)' : 'rgba(200,146,42,0.78)'; e.currentTarget.style.background = soft ? 'transparent' : 'rgba(200,146,42,0.05)' }}
    >
      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.78)', background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '40px', padding: '3px 10px', flexShrink: 0, marginTop: '2px', whiteSpace: 'nowrap' }}>{rec.badge}</span>
      <div style={{ flex: 1 }}>
        <div style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#A8721A', marginBottom: '3px' }}>{rec.title}</div>
        <div style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.78)', lineHeight: 1.4 }}>{rec.sub}</div>
      </div>
      <span style={{ color: '#A8721A', fontSize: '15px', marginTop: '2px', flexShrink: 0 }}>{'→'}</span>
    </a>
  )
}

function StagePanel({ stage }) {
  if (!stage) return null
  const s = STAGES[stage]
  return (
    <div style={{ marginTop: '32px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', overflow: 'hidden', animation: 'panelIn 0.2s ease' }}>
      <style>{`@keyframes panelIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{ padding: '28px 28px 24px' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '6px' }}>{s.name}</span>
        <div style={{ ...serif, fontSize: '26px', fontWeight: 300, color: '#0F1523', marginBottom: '4px', lineHeight: 1.1 }}>{s.name}</div>
        <div style={{ ...body, fontSize: '16px', fontStyle: 'italic', color: 'rgba(15,21,35,0.78)', marginBottom: '14px', lineHeight: 1.6 }}>{s.question}</div>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '24px', maxWidth: '520px' }}>{s.desc}</p>
        <div style={{ height: '1px', background: 'rgba(200,146,42,0.20)', marginBottom: '24px' }} />
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.78)', display: 'block', marginBottom: '12px' }}>Where to start</span>
        <StageRec rec={s.primary} soft={false} />
        {s.above && (<><div style={{ height: '1px', background: 'rgba(200,146,42,0.20)', margin: '16px 0' }} /><span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.78)', display: 'block', marginBottom: '12px' }}>When you are ready for the next step</span><StageRec rec={s.above} soft={true} /></>)}
        {s.below && (<><div style={{ height: '1px', background: 'rgba(200,146,42,0.20)', margin: '16px 0' }} /><span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.78)', display: 'block', marginBottom: '12px' }}>If this feels like too much right now</span><StageRec rec={s.below} soft={true} /></>)}
        {s.external?.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(200,146,42,0.20)' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.78)', display: 'block', marginBottom: '10px' }}>Also worth exploring</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {s.external.map(t => <span key={t} style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.78)', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '40px', padding: '6px 14px' }}>{t}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function NextUsSelfPage() {
  const [shareRec, setShareRec] = useState(null)
  const [purposeData, setPurposeData] = useState(null)
  const [activeStage, setActiveStage] = useState(null)
  const panelRef = useRef(null)
  const { user } = useAuth()

  function toggleStage(key) {
    setActiveStage(prev => prev === key ? null : key)
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
  }

  const stageKeys = Object.keys(STAGES)

  // Load Purpose Piece results to pre-highlight the user's domain
  useState(() => {
    if (!user?.id) return
    supabase
      .from('purpose_piece_results')
      .select('profile, session')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setPurposeData(data) })
  }, [user?.id])

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="nextus-self" />

      {/* Hero */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: 'clamp(88px,10vw,112px) clamp(20px,5vw,40px) 80px' }}>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>NextUs Self</span>
        <h1 style={{ ...body, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '24px' }}>
          A chosen<br /><span style={{ color: '#A8721A' }}>life.</span>
        </h1>
        <p style={{ ...body, fontSize: '19px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '16px', maxWidth: '580px' }}>
          The Horizon Suite is the scaffold. Tools for seeing your life clearly, finding your starting point, and navigating deliberately — built on seven domains that cover the full terrain of a human life.
        </p>
        <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '40px', maxWidth: '520px' }}>
          Built on seven domains that cover the full terrain of a human life — from your daily aliveness to your deepest sense of purpose.
        </p>

        {/* Primary CTA */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '72px' }}>
          <a href="/tools" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>
            See all tools →
          </a>
          <a href="/tools/north-star" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'transparent', color: '#A8721A', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>
            North Star →
          </a>
        </div>

        {/* Is this for you */}
        <div style={{ marginBottom: '72px', padding: '28px 32px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>Is this for you?</span>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, margin: '0 0 8px', maxWidth: '520px' }}>
            You're not in crisis and you're not broken — but something is off. A gap between who you are and what you sense you could be. You've probably done some work already. Something still isn't moving.
          </p>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, margin: 0, maxWidth: '520px' }}>
            This is exactly the terrain these tools are built for.
          </p>
        </div>

      </div>

      {/* Self Explorer — heptagon */}
      <div style={{ width: '96vw', marginLeft: '50%', transform: 'translateX(-50%)', borderRadius: '14px', overflow: 'hidden', marginBottom: '0' }}>
        <SelfExplorer purposeData={purposeData} />
      </div>

      {/* Stage selector */}
      <DarkSection>
        <DarkEyebrow>Where you are in the arc</DarkEyebrow>
        <DarkHeading style={{ marginBottom: '32px' }}>See where you are.</DarkHeading>
        <div>
          {stageKeys.map(key => {
            const s = STAGES[key]
            const isActive = activeStage === key
            return (
              <div key={key} onClick={() => toggleStage(key)} style={{ padding: '10px 4px', cursor: 'pointer', borderBottom: `1px solid ${isActive ? '#C8922A' : 'rgba(200,146,42,0.20)'}`, transition: 'all 0.18s', marginBottom: '4px' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderBottomColor = 'rgba(200,146,42,0.40)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderBottomColor = 'rgba(200,146,42,0.20)' }}
              >
                <span style={{ ...serif, fontSize: '22px', fontWeight: 300, color: isActive ? '#C8922A' : 'rgba(255,255,255,0.92)', display: 'block', lineHeight: 1.2, marginBottom: '2px', transition: 'color 0.18s' }}>{s.name}</span>
                <span style={{ ...body, fontSize: '17px', fontStyle: 'italic', color: isActive ? 'rgba(200,146,42,0.78)' : 'rgba(255,255,255,0.55)', lineHeight: 1.4, display: 'block', transition: 'color 0.18s' }}>{s.question}</span>
              </div>
            )
          })}
        </div>
        <div ref={panelRef} style={{ marginTop: '8px' }}><StagePanel stage={activeStage} /></div>
      </DarkSection>

      {/* Seven Domains — dark section */}
      <DarkSection>
        <DarkEyebrow>Seven domains</DarkEyebrow>
        <DarkHeading>The full terrain of a human life.</DarkHeading>
        <DarkBody>Seven areas. Not performance buckets to optimise — dimensions of a whole life. When one fails structurally, it pulls on everything else. The Horizon Suite makes the whole picture visible at once.</DarkBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '32px' }}>
          {DOMAINS.map((d, i) => (
            <div key={d.name} style={{ display: 'flex', gap: '20px', alignItems: 'baseline', padding: '14px 0', borderBottom: i < 6 ? '1px solid rgba(200,146,42,0.20)' : 'none' }}>
              <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.40)', minWidth: '20px' }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '17px', letterSpacing: '0.08em', color: '#C8922A', minWidth: '110px', flexShrink: 0 }}>{d.name}</span>
              <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '16px', fontWeight: 300, color: 'rgba(255,255,255,0.72)' }}>{d.aliases}</span>
            </div>
          ))}
        </div>
        <DarkGhostButton href="/tools/map">Map all seven domains →</DarkGhostButton>
      </DarkSection>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 clamp(20px,5vw,40px)' }}>

        {/* The fractal */}
        <div style={{ marginBottom: '72px', padding: '32px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '10px' }}>The fractal</span>
          <h3 style={{ ...body, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.2, marginBottom: '16px' }}>
            The same seven domains.<br />Two scales.
          </h3>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '12px', maxWidth: '520px' }}>
            The seven Horizon Suite domains map directly onto the seven domains of NextUs — the civilisational architecture. What you build in yourself is the same structure as what humanity is building collectively.
          </p>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, maxWidth: '480px' }}>
            Personal navigation and civilisational navigation are the same physics, operating at different scales.
          </p>
          <div style={{ marginTop: '20px' }}>
            <a href="/nextus" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>
              Explore NextUs →
            </a>
          </div>
        </div>

        {/* ── Tool anchors — linked from ToolDrawer for logged-out users ── */}
        <div style={{ marginBottom: '72px' }}>
          <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '32px' }}>The tools</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            <div id="horizon-state" style={{ padding: '28px 32px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Daily regulation practice</span>
              <h3 style={{ ...body, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>Horizon State</h3>
              <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '520px' }}>
                Regulated baseline. The floor beneath everything. A 20-minute guided audio practice that restores the nervous system before anything else is attempted. You cannot build on a depleted ground.
              </p>
              <a href="/login?redirect=/tools/horizon-state" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>Get access →</a>
            </div>

            <div id="map" style={{ padding: '28px 32px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>See where you are. Set where you're going.</span>
              <h3 style={{ ...body, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>The Map</h3>
              <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '520px' }}>
                Seven domains. One honest picture of where you are and where you want to be. The most powerful tool in the suite — because you cannot navigate without knowing your position.
              </p>
              <a href="/login?redirect=/tools/map" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>Get access →</a>
            </div>

            <div id="purpose-piece" style={{ padding: '28px 32px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Your role, your domain, your scale</span>
              <h3 style={{ ...body, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>Purpose Piece</h3>
              <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '520px' }}>
                Something in you already knows what you're built for. Purpose Piece finds your contribution archetype, your domain, and your scale — and puts language to it.
              </p>
              <a href="/login?redirect=/tools/purpose-piece" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>Get access →</a>
            </div>

            <div id="target-sprint" style={{ padding: '28px 32px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>90-day focused goal plan</span>
              <h3 style={{ ...body, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>Target Sprint</h3>
              <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '520px' }}>
                Three domains. Ninety days. A route reverse-engineered from where you want to be. Not a to-do list — a focused arc with a clear win condition.
              </p>
              <a href="/login?redirect=/tools/target-sprint" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>Get access →</a>
            </div>

            <div id="horizon-practice" style={{ padding: '28px 32px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Daily becoming practice</span>
              <h3 style={{ ...body, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>Horizon Practice</h3>
              <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '520px' }}>
                Daily practice. The return. T.E.A. — Thoughts, Emotions, Actions — skill development and thought loop work toward your horizon.
              </p>
              <a href="/login?redirect=/tools/horizon-practice" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>Get access →</a>
            </div>

          </div>
        </div>

      </div>

      {/* Tools CTA — dark section */}
      <DarkSection>
        <DarkEyebrow>Ready to use the tools?</DarkEyebrow>
        <DarkHeading>Six tools. One navigation system.</DarkHeading>
        <DarkBody>Each tool is built for a specific stage of the journey. You don't need all of them. Start where you are.</DarkBody>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <DarkSolidButton href="/tools">See all tools →</DarkSolidButton>
          <DarkGhostButton href="/tools/north-star">North Star — find your starting point →</DarkGhostButton>
        </div>
      </DarkSection>

      {/* Passing it on section */}
      <section style={{ background: '#F5F2EC', borderTop: '1px solid rgba(200,146,42,0.20)', padding: 'clamp(48px,8vw,80px) clamp(20px,5vw,40px)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>For someone you care about</span>
          <h2 style={{ ...body, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.12, marginBottom: '16px' }}>Passing this on.</h2>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, marginBottom: '12px', maxWidth: '540px' }}>The fact that you're here for someone else says something. That instinct — to want a better life for the people you love — is worth honouring carefully.</p>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '48px', maxWidth: '560px' }}>Not everything lands when it's pushed. The right thing, offered at the right moment, in the right way — that's different.</p>
          <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.4, marginBottom: '40px' }} />
          <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Where do they seem to be?</span>

          {[
            { key: 'foundation', icon: '\u25ce', title: 'Running on empty',           sub: 'Stressed, depleted, or going through something hard' },
            { key: 'map',        icon: '\u25c8', title: 'Stuck or searching',          sub: 'Not sure what they want — or where their life is actually at' },
            { key: 'purpose',    icon: '\u25c9', title: 'Capable but not fully alive', sub: `Functioning well, but something important isn't being expressed` },
            { key: 'leap',       icon: '\u25d0', title: 'Hitting the same ceiling',    sub: `They've done the work. The pattern keeps returning` },
          ].map(q => (
            <div key={q.key} onClick={() => setShareRec(q.key)}
              style={{ display: 'flex', gap: '16px', padding: '20px 22px', borderRadius: '14px', marginBottom: '10px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              <div style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px', color: '#A8721A' }}>{q.icon}</div>
              <div>
                <div style={{ ...body, fontSize: '17px', fontWeight: 400, color: '#A8721A', marginBottom: '4px' }}>{q.title}</div>
                <div style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.5 }}>{q.sub}</div>
              </div>
            </div>
          ))}

          {shareRec && SHARE_RECS[shareRec] && (
            <div style={{ marginTop: '40px', padding: '28px 32px', background: 'rgba(200,146,42,0.05)', borderRadius: '14px', border: '1.5px solid rgba(200,146,42,0.78)' }}>
              <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>The right door for them</span>
              <h4 style={{ ...body, fontSize: '20px', fontWeight: 400, color: '#A8721A', marginBottom: '10px' }}>{SHARE_RECS[shareRec].tool}</h4>
              <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '24px', maxWidth: '520px' }}>{SHARE_RECS[shareRec].desc}</p>
              <a href={SHARE_RECS[shareRec].url} style={{ display: 'inline-block', padding: '14px 28px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '17px', fontWeight: 600, letterSpacing: '0.14em', textDecoration: 'none' }}>
                Open {SHARE_RECS[shareRec].tool} →
              </a>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '48px 0' }} />
          <h3 style={{ ...body, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 300, color: '#0F1523', marginBottom: '16px' }}>How to offer it well.</h3>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '20px', maxWidth: '580px' }}>The most important thing: make it an offer, not a prescription. The difference is felt immediately.</p>
          <div style={{ borderLeft: '2px solid rgba(200,146,42,0.20)', padding: '20px 0 20px 28px', marginBottom: '20px', maxWidth: '580px' }}>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '12px' }}>"I found something that helped me see where I actually was. No pressure — but if you're curious, here it is."</p>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', color: '#A8721A' }}>An offer</span>
          </div>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '48px', maxWidth: '580px' }}>Notice — as you think about them across these domains — what you're actually seeing. The same lens that helps you find the right thing for them has a way of clarifying things for you too.</p>
          <a href="/tools" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>
            See all tools →
          </a>
        </div>
      </section>

      <ToolCompassPanel />
      <GlossaryPanel />
      <SiteFooter />
    </div>
  )
}
