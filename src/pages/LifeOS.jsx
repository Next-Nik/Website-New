import { useState } from 'react'
import { SiteNav } from '../components/SiteNav'
import { SiteFooter } from '../components/SiteFooter'
import { ToolCompassPanel } from '../components/ToolCompassPanel'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

const TOOLS = [
  {
    id: 'foundation', name: 'Foundation', hook: 'The floor everything else stands on.',
    label: 'Capacity infrastructure',
    desc: 'Most frameworks begin after baseline stability is already online. Foundation builds it.',
    detail: 'A guided audio practice. Three phases — Baseline, Orienting, Embodying. Twenty minutes. It restores the internal conditions required for clear, congruent action. Not therapy. Not meditation. The layer beneath insight, growth, and strategy.',
    meta: '20 min · guided audio · 3 phases · available any time of day',
    quotes: [
      { text: 'It has helped me reset my baseline in the middle of the day — to relax, let go, and create space for a more supportive inner story. One that naturally inspires aligned action rather than effort or striving.', cite: 'David William Pierce' },
      { text: 'There was this sense of feeling held throughout. His presence is unmistakably there.', cite: 'David William Pierce' },
    ],
    primary: { label: 'Begin Foundation →', url: '/tools/foundation' },
  },
  {
    id: 'map', name: 'The Map', hook: 'An honest picture of where you are across every domain.',
    label: 'The map',
    desc: 'An honest picture of your whole life. Not where you think you should be — where you actually are.',
    detail: 'Ten minutes. Seven domains. One honest score each. Path · Spark · Body · Finances · Relationships · Inner Game · Outer Game. The picture that emerges is often surprising. Always useful.',
    meta: '10 minutes · free · no account needed',
    primary: { label: 'Begin The Map →', url: '/tools/map' },
    secondary: { label: 'Go deeper with Nik', url: '/work-with-nik' },
  },
  {
    id: 'purpose-piece', name: 'Purpose Piece', hook: 'What did life ask you to bring?',
    label: 'The contribution pattern',
    desc: 'The role you’re built to play. The domain where your effort compounds most.',
    detail: 'A behavioural evidence tool that surfaces your natural contribution archetype. Once you know it, everything in Life OS sharpens — not by limiting you, but by showing you where your intelligence lands hardest.',
    meta: '20 minutes · self-directed · one-time or annual',
    primary: { label: 'Begin Purpose Piece →', url: '/tools/purpose-piece' },
    secondary: { label: 'Debrief with Nik', url: '/work-with-nik' },
  },
  {
    id: 'target-sprint', name: 'Target Sprint', hook: 'Three areas. Ninety days. A route reverse-engineered from where you want to be.',
    label: 'The operational layer',
    desc: 'The bridge between knowing where you are and arriving somewhere different.',
    detail: 'Pick three domains. Set a meaningful 90-day outcome for each. The tool reverse-engineers the monthly milestones and weekly focus from your destination — and anchors daily TEA so the work compounds. Standalone or linked to The Map.',
    meta: '90 days · 3 domains · AI-assisted milestone planning',
    primary: { label: 'Begin Target Sprint →', url: '/tools/target-goals' },
  },
  {
    id: 'horizon-leap', name: 'Horizon Leap', hook: 'Not more tools. A different kind of crossing.',
    label: 'The crossing',
    desc: 'For people who keep hitting the same ceiling. Identity-level work — facilitated by Nik.',
    detail: 'Reauthoring the biography. Closing the gap between who you’ve been and who you’re becoming. Not a programme to follow — a discontinuous shift. Begin with a conversation.',
    meta: 'Facilitated · with Nik · by application',
    primary: { label: 'Book a conversation →', url: 'https://calendly.com/nikwood/talk-to-nik', external: true },
  },
]

const SHARE_RECS = {
  foundation: { tool: 'Foundation', url: '/tools/foundation', desc: 'When someone is depleted, the first move is never to add more — it’s to restore the ground. Foundation is a 20-minute guided audio practice for regulation.' },
  map: { tool: 'The Map', url: '/tools/map', desc: 'When someone doesn’t know where they are, a map is everything. The Map gives an honest picture of their whole life across seven domains — in ten minutes.' },
  purpose: { tool: 'Purpose Piece', url: '/tools/purpose-piece', desc: 'When someone is capable but not yet fully alive in what they do, the question isn’t what — it’s where. Purpose Piece surfaces the role they’re built to play.' },
  leap: { tool: 'Horizon Leap', url: 'https://calendly.com/nikwood/talk-to-nik', desc: 'When the pattern keeps returning despite the work, the work needed is different. Horizon Leap is identity-level work facilitated by Nik. Start with a conversation.' },
}

function ToolAccordion({ tool }) {
  const [open, setOpen] = useState(false)
  return (
    <div id={tool.id} style={{ border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', marginBottom: '10px', overflow: 'hidden', background: 'rgba(200,146,42,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px', userSelect: 'none' }}>
        <div onClick={() => setOpen(o => !o)} style={{ flex: 1, cursor: 'pointer' }}>
          <div style={{ ...serif, fontSize: '19px', fontWeight: 400, color: '#A8721A', marginBottom: '4px' }}>{tool.name}</div>
          <div style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.88)' }}>{tool.hook}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }}>
          <a
            href={tool.primary.url}
            target={tool.primary.external ? '_blank' : undefined}
            rel={tool.primary.external ? 'noopener' : undefined}
            onClick={e => e.stopPropagation()}
            title={tool.primary.label}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(200,146,42,0.08)',
              border: '1.5px solid rgba(200,146,42,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none', color: '#A8721A',
              fontSize: '14px', lineHeight: 1,
              transition: 'all 0.2s', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.15)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.08)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.55)' }}
          >
            {'▶'}
          </a>
          <div onClick={() => setOpen(o => !o)} style={{ fontSize: '22px', color: '#A8721A', transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.25s', lineHeight: 1, cursor: 'pointer' }}>+</div>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.20)', padding: '28px 26px 32px', background: '#FAFAF7' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: '#A8721A', display: 'block', marginBottom: '10px' }}>{tool.label}</span>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, marginBottom: '16px', maxWidth: '580px' }}>{tool.desc}</p>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '24px', maxWidth: '580px' }}>{tool.detail}</p>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', color: '#A8721A', marginBottom: '24px' }}>{tool.meta}</div>
          {tool.quotes?.map((q, i) => (
            <div key={i} style={{ borderLeft: '2px solid rgba(200,146,42,0.20)', padding: '14px 0 14px 28px', margin: i === 0 ? '24px 0 8px' : '0 0 24px', maxWidth: '600px' }}>
              <p style={{ ...serif, fontSize: '16px', fontStyle: 'italic', color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, marginBottom: '10px' }}>{'“'}{q.text}{'”'}</p>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#A8721A' }}>{'—'} {q.cite}</span>
            </div>
          ))}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <a href={tool.primary.url} target={tool.primary.external ? '_blank' : undefined} rel={tool.primary.external ? 'noopener' : undefined}
              style={{ display: 'inline-block', padding: '14px 28px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.14em', textDecoration: 'none' }}>
              {tool.primary.label}
            </a>
            {tool.secondary && (
              <a href={tool.secondary.url} style={{ display: 'inline-block', padding: '14px 28px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'transparent', color: '#A8721A', ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.14em', textDecoration: 'none' }}>
                {tool.secondary.label}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function LifeOSPage() {
  const [shareRec, setShareRec] = useState(null)

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <SiteNav active="life-os" />

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '112px 40px 120px' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Life OS</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          See clearly.<br /><em style={{ fontStyle: 'italic', color: '#A8721A' }}>Move from there.</em>
        </h1>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '64px', maxWidth: '520px' }}>Six tools. Start anywhere. Each one does its own work {'—'} and they compound when you{'’'}re ready.</p>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 32px' }} />

        {/* Orienteering CTA */}
        <div style={{ marginBottom: '32px', padding: '24px 28px', background: 'rgba(200,146,42,0.03)', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px' }}>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '16px', maxWidth: '520px' }}>
            If you don't know where to begin, begin with Orienteering — it reads your current state and points you somewhere useful. Everything else flows from knowing where you're starting from.
          </p>
          <a href="/tools/orienteering" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.14em', textDecoration: 'none' }}>
            Begin with Orienteering →
          </a>
        </div>

        {TOOLS.map(t => <ToolAccordion key={t.id} tool={t} />)}

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '48px 0' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          <a href="/work-with-nik" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>Work with Nik {'→'}</a>
          <a href="/" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.78)', textDecoration: 'none' }}>{'←'} Home</a>
        </div>
      </div>

      {/* Share section */}
      <section style={{ background: '#F5F2EC', borderTop: '1px solid rgba(200,146,42,0.20)', padding: '80px 40px' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>For someone you care about</span>
          <h2 style={{ ...serif, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.12, marginBottom: '16px' }}>Passing this on.</h2>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.88)', lineHeight: 1.7, marginBottom: '12px', maxWidth: '540px' }}>The fact that you{'’'}re here for someone else says something. That instinct {'—'} to want a better life for the people you love {'—'} is worth honouring carefully.</p>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '48px', maxWidth: '560px' }}>Not everything lands when it{'’'}s pushed. The right thing, offered at the right moment, in the right way {'—'} that{'’'}s different.</p>
          <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.4, marginBottom: '40px' }} />
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Where do they seem to be?</span>

          {[
            { key: 'foundation', icon: '◎', title: 'Running on empty', sub: 'Stressed, depleted, or going through something hard' },
            { key: 'map', icon: '◈', title: 'Stuck or searching', sub: 'Not sure what they want — or where their life is actually at' },
            { key: 'purpose', icon: '◉', title: 'Capable but not fully alive', sub: 'Functioning well, but something important isn\'t being expressed' },
            { key: 'leap', icon: '◐', title: 'Hitting the same ceiling', sub: 'They\'ve done the work. The pattern keeps returning' },
          ].map(q => (
            <div key={q.key} onClick={() => setShareRec(q.key)} style={{ display: 'flex', gap: '16px', padding: '20px 22px', borderRadius: '14px', marginBottom: '10px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              <div style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px', color: '#A8721A' }}>{q.icon}</div>
              <div>
                <div style={{ ...serif, fontSize: '17px', fontWeight: 400, color: '#A8721A', marginBottom: '4px' }}>{q.title}</div>
                <div style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.88)', lineHeight: 1.5 }}>{q.sub}</div>
              </div>
            </div>
          ))}

          {shareRec && SHARE_RECS[shareRec] && (
            <div style={{ marginTop: '40px', padding: '28px 32px', background: 'rgba(200,146,42,0.05)', borderRadius: '14px', border: '1.5px solid rgba(200,146,42,0.78)' }}>
              <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>The right door for them</span>
              <h4 style={{ ...serif, fontSize: '20px', fontWeight: 400, color: '#A8721A', marginBottom: '10px' }}>{SHARE_RECS[shareRec].tool}</h4>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '24px', maxWidth: '520px' }}>{SHARE_RECS[shareRec].desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <a href={SHARE_RECS[shareRec].url} style={{ display: 'inline-block', padding: '14px 28px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.14em', textDecoration: 'none' }}>Open {SHARE_RECS[shareRec].tool} {'→'}</a>
              </div>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '48px 0' }} />
          <h3 style={{ ...serif, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 300, color: '#0F1523', marginBottom: '16px' }}>How to offer it well.</h3>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '20px', maxWidth: '580px' }}>The most important thing: make it an offer, not a prescription. The difference is felt immediately.</p>
          <div style={{ borderLeft: '2px solid rgba(200,146,42,0.20)', padding: '20px 0 20px 28px', marginBottom: '20px', maxWidth: '580px' }}>
            <p style={{ ...serif, fontSize: '16px', fontStyle: 'italic', color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, marginBottom: '12px' }}>{'“'}I found something that helped me see where I actually was. No pressure {'—'} but if you{'’'}re curious, here it is.{'”'}</p>
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', color: '#A8721A' }}>An offer</span>
          </div>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '48px', maxWidth: '580px' }}>Notice {'—'} as you think about them across these domains {'—'} what you{'’'}re actually seeing. The same lens that helps you find the right thing for them has a way of clarifying things for you too.</p>
          <a href="/#start" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>Start your own {'→'}</a>
        </div>
      </section>

      <ToolCompassPanel />
      <SiteFooter />
    </div>
  )
}
