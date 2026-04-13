import { useState } from 'react'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { GlossaryPanel } from '../components/GlossaryPanel'
import { ToolCompassPanel } from '../components/ToolCompassPanel'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

const DOMAINS = [
  { name: 'Path',       aliases: "Life\u2019s Mission \u00b7 Purpose \u00b7 Dharma" },
  { name: 'Spark',      aliases: "Vitality \u00b7 Energy \u00b7 Joy \u00b7 Passion" },
  { name: 'Body',       aliases: "Health \u00b7 Fitness \u00b7 The Physical" },
  { name: 'Finances',   aliases: "Agency \u00b7 Money \u00b7 Currency" },
  { name: 'Connection', aliases: "Your relationships with others" },
  { name: 'Inner Game', aliases: "Your relationship to yourself" },
  { name: 'Signal',     aliases: "Your relationship to the world" },
]

const SHARE_RECS = {
  foundation: { tool: 'Horizon State', url: '/tools/foundation', desc: 'When someone is depleted, the first move is never to add more \u2014 it\u2019s to restore the ground. Horizon State is a 20-minute guided practice for nervous system regulation — the floor beneath everything.' },
  map:        { tool: 'The Map',    url: '/tools/map',        desc: 'When someone doesn\u2019t know where they are, a map is everything. The Map gives an honest picture of their whole life across seven domains \u2014 in ten minutes.' },
  purpose:    { tool: 'Purpose Piece', url: '/tools/purpose-piece', desc: 'When someone is capable but not yet fully alive in what they do, the question isn\u2019t what \u2014 it\u2019s where. Purpose Piece surfaces the role they\u2019re built to play.' },
  leap:       { tool: 'Horizon Leap', url: 'https://calendly.com/nikwood/talk-to-nik', desc: 'When the pattern keeps returning despite the work, the work needed is different. Horizon Leap is identity-level work facilitated by Nik. Start with a conversation.' },
}

export function LifeOSPage() {
  const [shareRec, setShareRec] = useState(null)

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="life-os" />

      {/* Hero */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: 'clamp(88px,10vw,112px) clamp(20px,5vw,40px) 80px' }}>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>The Horizon Suite</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '24px' }}>
          The personal<br /><em style={{ fontStyle: 'italic', color: '#A8721A' }}>navigation layer.</em>
        </h1>
        <p style={{ ...serif, fontSize: '19px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '16px', maxWidth: '580px' }}>
          The Horizon Suite is a set of tools for seeing your life clearly and navigating it deliberately. Not a productivity system. Not a self-help programme. A navigation layer \u2014 showing you where you are, where you\u2019re going, and what the gaps are between them.
        </p>
        <p style={{ ...serif, fontSize: '17px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '40px', maxWidth: '520px' }}>
          Built on seven domains that cover the full terrain of a human life \u2014 from your daily aliveness to your deepest sense of purpose.
        </p>

        {/* Primary CTA */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '72px' }}>
          <a href="/tools" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>
            See all tools \u2192
          </a>
          <a href="/tools/orienteering" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'transparent', color: '#A8721A', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>
            Find my starting point \u2192
          </a>
        </div>

        {/* Is this for you */}
        <div style={{ marginBottom: '72px', padding: '28px 32px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '14px' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>Is this for you?</span>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, margin: '0 0 8px', maxWidth: '520px' }}>
            You\u2019re not in crisis and you\u2019re not broken \u2014 but something is off. A gap between who you are and what you sense you could be. You\u2019ve probably done some work already. Something still isn\u2019t moving.
          </p>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, margin: 0, maxWidth: '520px' }}>
            This is exactly the terrain these tools are built for.
          </p>
        </div>

        {/* Seven Domains */}
        <div style={{ marginBottom: '72px' }}>
          <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Seven domains</span>
          <h2 style={{ ...serif, fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.15, marginBottom: '16px' }}>
            The full terrain of a human life.
          </h2>
          <p style={{ ...serif, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '36px', maxWidth: '540px' }}>
            Seven areas. Not performance buckets to optimise \u2014 dimensions of a whole life. When one fails structurally, it pulls on everything else. The Horizon Suite makes the whole picture visible at once.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {DOMAINS.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', gap: '20px', alignItems: 'baseline', padding: '14px 0', borderBottom: i < 6 ? '1px solid rgba(200,146,42,0.08)' : 'none' }}>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.30)', minWidth: '20px' }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.08em', color: '#A8721A', minWidth: '110px', flexShrink: 0 }}>{d.name}</span>
                <span style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', fontStyle: 'italic' }}>{d.aliases}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '32px' }}>
            <a href="/tools/map" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>
              Map all seven domains \u2192
            </a>
          </div>
        </div>

        {/* The fractal */}
        <div style={{ marginBottom: '72px', padding: '32px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '14px' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '10px' }}>The fractal</span>
          <h3 style={{ ...serif, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.2, marginBottom: '16px' }}>
            The same seven domains.<br />Two scales.
          </h3>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.85)', lineHeight: 1.75, marginBottom: '12px', maxWidth: '520px' }}>
            The seven Horizon Suite domains map directly onto the seven domains of NextUs \u2014 the civilisational architecture. What you build in yourself is the same structure as what humanity is building collectively.
          </p>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, maxWidth: '480px' }}>
            Personal navigation and civilisational navigation are the same physics, operating at different scales.
          </p>
          <div style={{ marginTop: '20px' }}>
            <a href="/nextus" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>
              Explore NextUs \u2192
            </a>
          </div>
        </div>

        {/* ── Tool anchors — linked from ToolDrawer for logged-out users ── */}
        <div style={{ marginBottom: '72px' }}>
          <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '32px' }}>The tools</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            <div id="foundation" style={{ padding: '28px 32px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Daily regulation practice</span>
              <h3 style={{ ...serif, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>Horizon State</h3>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '520px' }}>
                Regulated baseline. The floor beneath everything. A 20-minute guided audio practice that restores the nervous system before anything else is attempted. You cannot build on a depleted ground.
              </p>
              <a href="/login?redirect=/tools/foundation" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>Get access →</a>
            </div>

            <div id="map" style={{ padding: '28px 32px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>See where you are. Set where you're going.</span>
              <h3 style={{ ...serif, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>The Map</h3>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '520px' }}>
                Seven domains. One honest picture of where you are and where you want to be. The most powerful tool in the suite — because you cannot navigate without knowing your position.
              </p>
              <a href="/login?redirect=/tools/map" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>Get access →</a>
            </div>

            <div id="purpose-piece" style={{ padding: '28px 32px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Your role, your domain, your scale</span>
              <h3 style={{ ...serif, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>Purpose Piece</h3>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '520px' }}>
                Your contribution archetype, domain, and scale. Reveals the Godspark coordinates — what you're built to do. Most people are capable of far more than they're currently expressing. Usually the missing piece isn't effort — it's fit.
              </p>
              <a href="/login?redirect=/tools/purpose-piece" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>Get access →</a>
            </div>

            <div id="target-goals" style={{ padding: '28px 32px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>90-day focused goal plan</span>
              <h3 style={{ ...serif, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>Target Sprint</h3>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '520px' }}>
                Three domains. Ninety days. A route reverse-engineered from where you want to be. Not a to-do list — a focused arc with a clear win condition.
              </p>
              <a href="/login?redirect=/tools/target-goals" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>Get access →</a>
            </div>

            <div id="expansion" style={{ padding: '28px 32px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Daily becoming practice</span>
              <h3 style={{ ...serif, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>Horizon Practice</h3>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '520px' }}>
                Daily practice. The return. T.E.A. — Thoughts, Emotions, Actions — skill development and thought loop work toward your horizon.
              </p>
              <a href="/login?redirect=/tools/expansion" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '2px' }}>Get access →</a>
            </div>

          </div>
        </div>

        {/* Tools CTA */}
        <div style={{ marginBottom: '72px', padding: '32px', background: '#0F1523', borderRadius: '14px' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>Ready to use the tools?</span>
          <h3 style={{ ...serif, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#FAFAF7', lineHeight: 1.2, marginBottom: '16px' }}>
            Six tools. One navigation system.
          </h3>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(250,250,247,0.65)', lineHeight: 1.75, marginBottom: '28px', maxWidth: '480px' }}>
            Each tool is built for a specific stage of the journey. You don\u2019t need all of them. Start where you are.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a href="/tools" style={{ display: 'inline-block', padding: '14px 28px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.14em', textDecoration: 'none' }}>
              See all tools \u2192
            </a>
            <a href="/tools/orienteering" style={{ display: 'inline-block', padding: '14px 28px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.45)', background: 'transparent', color: '#A8721A', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.14em', textDecoration: 'none' }}>
              Find my starting point \u2192
            </a>
          </div>
        </div>
      </div>

      {/* Passing it on section */}
      <section style={{ background: '#F5F2EC', borderTop: '1px solid rgba(200,146,42,0.20)', padding: 'clamp(48px,8vw,80px) clamp(20px,5vw,40px)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>For someone you care about</span>
          <h2 style={{ ...serif, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.12, marginBottom: '16px' }}>Passing this on.</h2>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.88)', lineHeight: 1.7, marginBottom: '12px', maxWidth: '540px' }}>The fact that you\u2019re here for someone else says something. That instinct \u2014 to want a better life for the people you love \u2014 is worth honouring carefully.</p>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '48px', maxWidth: '560px' }}>Not everything lands when it\u2019s pushed. The right thing, offered at the right moment, in the right way \u2014 that\u2019s different.</p>
          <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.4, marginBottom: '40px' }} />
          <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Where do they seem to be?</span>

          {[
            { key: 'foundation', icon: '\u25ce', title: 'Running on empty',           sub: 'Stressed, depleted, or going through something hard' },
            { key: 'map',        icon: '\u25c8', title: 'Stuck or searching',          sub: 'Not sure what they want \u2014 or where their life is actually at' },
            { key: 'purpose',    icon: '\u25c9', title: 'Capable but not fully alive', sub: 'Functioning well, but something important isn\u2019t being expressed' },
            { key: 'leap',       icon: '\u25d0', title: 'Hitting the same ceiling',    sub: 'They\u2019ve done the work. The pattern keeps returning' },
          ].map(q => (
            <div key={q.key} onClick={() => setShareRec(q.key)}
              style={{ display: 'flex', gap: '16px', padding: '20px 22px', borderRadius: '14px', marginBottom: '10px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              <div style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px', color: '#A8721A' }}>{q.icon}</div>
              <div>
                <div style={{ ...serif, fontSize: '17px', fontWeight: 400, color: '#A8721A', marginBottom: '4px' }}>{q.title}</div>
                <div style={{ ...serif, fontSize: '17px', color: 'rgba(15,21,35,0.88)', lineHeight: 1.5 }}>{q.sub}</div>
              </div>
            </div>
          ))}

          {shareRec && SHARE_RECS[shareRec] && (
            <div style={{ marginTop: '40px', padding: '28px 32px', background: 'rgba(200,146,42,0.05)', borderRadius: '14px', border: '1.5px solid rgba(200,146,42,0.78)' }}>
              <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>The right door for them</span>
              <h4 style={{ ...serif, fontSize: '20px', fontWeight: 400, color: '#A8721A', marginBottom: '10px' }}>{SHARE_RECS[shareRec].tool}</h4>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '24px', maxWidth: '520px' }}>{SHARE_RECS[shareRec].desc}</p>
              <a href={SHARE_RECS[shareRec].url} style={{ display: 'inline-block', padding: '14px 28px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '17px', fontWeight: 600, letterSpacing: '0.14em', textDecoration: 'none' }}>
                Open {SHARE_RECS[shareRec].tool} \u2192
              </a>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '48px 0' }} />
          <h3 style={{ ...serif, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 300, color: '#0F1523', marginBottom: '16px' }}>How to offer it well.</h3>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '20px', maxWidth: '580px' }}>The most important thing: make it an offer, not a prescription. The difference is felt immediately.</p>
          <div style={{ borderLeft: '2px solid rgba(200,146,42,0.20)', padding: '20px 0 20px 28px', marginBottom: '20px', maxWidth: '580px' }}>
            <p style={{ ...serif, fontSize: '16px', fontStyle: 'italic', color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, marginBottom: '12px' }}>{'\u201c'}I found something that helped me see where I actually was. No pressure \u2014 but if you\u2019re curious, here it is.{'\u201d'}</p>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', color: '#A8721A' }}>An offer</span>
          </div>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '48px', maxWidth: '580px' }}>Notice \u2014 as you think about them across these domains \u2014 what you\u2019re actually seeing. The same lens that helps you find the right thing for them has a way of clarifying things for you too.</p>
          <a href="/tools" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>
            See all tools \u2192
          </a>
        </div>
      </section>

      <ToolCompassPanel />
      <GlossaryPanel />
      <SiteFooter />
    </div>
  )
}
