import { useState } from 'react'
import { ToolCompassPanel } from '../components/ToolCompassPanel'
import { CivilisationalFramePanel } from '../components/CivilisationalFramePanel'
import { DomainTooltip, LIFEOS_LABEL_MAP, NEXTUS_LABEL_MAP } from '../components/DomainTooltip'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import DomainExplorer from '../components/domain-explorer/DomainExplorer'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

const DOMAINS = [
  { id: "human-being",     label: 'Human Being',      tip: 'Every person has what they need to know themselves, develop fully, and bring what they came here to bring.', desc: 'The full terrain of what it means to be human — individually and collectively. Health, education, consciousness, rights, culture.' },
  { id: "society",         label: 'Society',           tip: 'Humanity knows how to be human together — and every individual is better for it.', desc: 'How human beings organise collective life. Society is both a collective and a group of individuals. Neither overrides the other.' },
  { id: "nature",          label: 'Nature',            tip: 'Ecosystems are thriving and we are living in harmony with the planet.', desc: 'The living systems of the planet. Humanity as participant in, not owner of, these systems.' },
  { id: "technology",      label: 'Technology',        tip: 'Our creations support and amplify life.', desc: 'The tools that amplify or undermine human flourishing. The most powerful lever civilisation has — and the most dangerous.' },
  { id: "finance-economy", label: 'Finance & Economy', tip: 'Resources flow toward what sustains and generates life.', desc: 'How humanity creates, moves, and allocates the resources that sustain life. The economy is a design. It can be redesigned.' },
  { id: "legacy",          label: 'Legacy',            tip: 'We are ancestors worth having.', desc: "What we leave behind — the long arc of civilisational continuity, intergenerational responsibility, and the transmission of wisdom." },
  { id: "vision",          label: 'Vision',            tip: 'Into the unknown. On purpose. Together.', desc: 'Where humanity is going — the imaginative, philosophical, and spiritual capacity to see possibility and orient collective life toward it.' },
]

function DomainModal({ domain, onClose }) {
  if (!domain) return null
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(15,21,35,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', zIndex: 100 }}>
      <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '32px', maxWidth: '420px', width: '100%', position: 'relative', ...serif }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '18px', fontSize: '18px', cursor: 'pointer', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', lineHeight: 1 }}>{'\u00D7'}</button>
        <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '8px' }}>NextUs Domain</div>
        <div style={{ fontSize: '24px', fontWeight: 300, color: '#0F1523', marginBottom: '12px', lineHeight: 1.1 }}>{domain.label}</div>
        <div style={{ fontSize: '16px', fontWeight: 300, lineHeight: 1.75, color: 'rgba(15,21,35,0.78)', marginBottom: '16px' }}>{domain.desc}</div>
        <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', borderTop: '1px solid rgba(200,146,42,0.20)', paddingTop: '12px' }}>Part of the NextUs vocabulary.</div>
      </div>
    </div>
  )
}

export function NextUsPage() {
  const [modal, setModal] = useState(null)

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="nextus" />
      <DomainModal domain={modal} onClose={() => setModal(null)} />
      <style>{`
        @media (max-width: 640px) {
          .nextus-main { padding-left: 24px !important; padding-right: 24px !important; }
          .nextus-dark { padding-left: 24px !important; padding-right: 24px !important; }
        }
      `}</style>

      {/* Hero */}
      <div className="nextus-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '112px 40px 0' }}>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>NextUs</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          The future is not something<br /><em style={{ fontStyle: 'italic', color: '#A8721A' }}>that happens to us.</em>
        </h1>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '56px', maxWidth: '520px' }}>Seven domains. A living map of where we are {'\u2014'} and the distance to where we are trying to go.</p>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '14px' }}>Explore the horizon goals</span>
      </div>

      {/* Domain Explorer */}
      <div style={{ width: '96vw', marginLeft: '50%', transform: 'translateX(-50%)', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid rgba(200,146,42,0.78)', marginBottom: 0 }}>
        <DomainExplorer />
      </div>

      <div className="nextus-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '0 40px 120px' }}>

        {/* The problem */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '72px 0 40px' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '20px' }}>The problem is not effort.</h2>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>Someone is restoring soil carbon and does not know about the financing mechanism that could fund their work. Someone is building a governance framework that addresses exactly the problem another person is trying to solve. The person with capital has no map showing where the real gaps are.</p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>Progress is happening. But it is fragmented, invisible, and uncoordinated. The cost is duplicated effort, misallocated resources, and builders doing important work in isolation {'\u2014'} not knowing who else is carrying the same thing.</p>
        <div style={{ borderLeft: '2px solid rgba(200,146,42,0.20)', padding: '20px 0 20px 28px', margin: '48px 0', maxWidth: '580px' }}>
          <p style={{ ...serif, fontSize: '20px', fontStyle: 'italic', fontWeight: 300, color: '#0F1523', lineHeight: 1.65, margin: 0 }}>What we can see clearly, we can coordinate around. What we can coordinate around, we can change.</p>
        </div>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '56px', maxWidth: '600px' }}>NextUs is the perceptual layer. A living map of where humanity is trying to go {'\u2014'} across seven domains, at every scale {'\u2014'} so that the people already doing the work can find each other, aim at something worth building, and compound their effort rather than scatter it.</p>

        {/* What we're building */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 48px' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '20px' }}>What we're building.</h2>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.88)', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>
          Most of the world's unsolved problems are unsolved not because solutions don't exist. The solutions exist. Someone has already cracked it — at some scale, in some context, with some version of the problem you're facing right now. The gap is visibility. You don't know they exist. They don't know you exist. The resources that could connect you are flowing somewhere else entirely.
        </p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.88)', lineHeight: 1.8, marginBottom: '48px', maxWidth: '600px' }}>
          NextUs is the map that changes that. A living picture of who is working on what, where the gaps are, what's succeeding and what's being ignored, and how any individual can find their place in the work that's already happening.
        </p>

        {/* Three functions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px', marginBottom: '72px', maxWidth: '640px' }}>
          {[
            { label: 'Sense-making', desc: 'A coherent picture of where humanity stands across all seven domains — honest mapping of trajectory, progress, and blockers.' },
            { label: 'Orientation', desc: 'Help actors determine where their effort matters most. Make needs, gaps, and leverage points visible.' },
            { label: 'Coordination', desc: 'Surface who is working on what, where gaps persist, and where connection between actors could unlock disproportionate progress.' },
          ].map(({ label, desc }) => (
            <div key={label} style={{ borderTop: '1.5px solid rgba(200,146,42,0.30)', paddingTop: '20px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: '#A8721A', marginBottom: '10px' }}>{label}</div>
              <div style={{ ...serif, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.88)', lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Honest under-construction */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 48px' }} />
        <div style={{ background: 'rgba(200,146,42,0.04)', border: '1.5px solid rgba(200,146,42,0.22)', borderRadius: '14px', padding: '32px', marginBottom: '72px', maxWidth: '600px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: '#A8721A', marginBottom: '14px' }}>Where we are</div>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.88)', lineHeight: 1.8, margin: '0 0 16px' }}>
            The domain map and Horizon Goals are live. The actor layer — organisations, projects, and individuals placed at subdomain level with their needs and contribution asks visible — is being built now.
          </p>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.88)', lineHeight: 1.8, margin: '0 0 16px' }}>
            The Horizon Goals are our current best thinking. They are not fixed. As the platform grows, so does who gets to shape them. If you work in one of these domains and know something the current framing misses — we want to hear from you.
          </p>
          <p style={{ ...serif, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, margin: 0 }}>
            Six months of building in public. The map gets clearer. The coordination gets easier. The future gets more possible.
          </p>
        </div>

        {/* Fractal connection */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 48px' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '16px' }}>The same seven domains. Two scales.</h2>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '12px', maxWidth: '600px' }}>
          What you develop in yourself, you contribute to the world. The seven domains of your life map directly onto the seven domains of civilisation. Your personal work is not a detour from the larger work. It is the larger work, at a different scale.
        </p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '48px', maxWidth: '560px' }}>
          We are connected. We are fractal. The state of the world is a reflection of how we are doing individually — and how we are doing individually is a reflection of how we are doing as a whole.
        </p>

        {/* Fractal domain map */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', marginBottom: '64px', maxWidth: '640px' }}>
          <div style={{ borderBottom: '2px solid rgba(200,146,42,0.30)', paddingBottom: '12px' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A' }}>Life OS · Personal</span>
          </div>
          <div />
          <div style={{ borderBottom: '2px solid rgba(200,146,42,0.30)', paddingBottom: '12px' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A' }}>NextUs · Civilisational</span>
          </div>
          {[
            ['Path', 'Vision'],
            ['Spark', 'Human Being'],
            ['Body', 'Nature'],
            ['Finances', 'Finance & Economy'],
            ['Connection', 'Society'],
            ['Inner Game', 'Legacy'],
            ['Signal', 'Technology'],
          ].map(([personal, civil], i) => [
            <div key={personal} style={{ padding: '12px 0', borderBottom: i < 6 ? '1px solid rgba(200,146,42,0.08)' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523' }}>{personal}</span>
              <DomainTooltip domainKey={LIFEOS_LABEL_MAP[personal]} system="lifeos" position="below" />
            </div>,
            <div key={personal + '-arrow'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: i < 6 ? '1px solid rgba(200,146,42,0.08)' : 'none' }}>
              <span style={{ color: 'rgba(200,146,42,0.45)', fontSize: '16px' }}>→</span>
            </div>,
            <div key={civil} style={{ padding: '12px 0 12px 16px', borderBottom: i < 6 ? '1px solid rgba(200,146,42,0.08)' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#A8721A' }}>{civil}</span>
              <DomainTooltip domainKey={NEXTUS_LABEL_MAP[civil]} system="nextus" position="below" />
            </div>,
          ])}
        </div>

        {/* Seven domains list */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 32px' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '8px' }}>Seven domains.</h2>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, marginBottom: '32px', maxWidth: '560px' }}>Click any domain to go deeper.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {DOMAINS.map((d, i) => (
            <div key={d.id} onClick={() => setModal(d)} style={{ display: 'flex', gap: '28px', padding: '18px 0', borderBottom: i < DOMAINS.length - 1 ? '1px solid rgba(200,146,42,0.08)' : 'none', alignItems: 'baseline', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,146,42,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: '#A8721A', minWidth: '170px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {d.label}
                <DomainTooltip domainKey={d.id} system="nextus" position="below" />
              </div>
              <div style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.88)', lineHeight: 1.6 }}>{d.tip}</div>
            </div>
          ))}
        </div>

      </div>

      {/* Dark CTA */}
      <section className="nextus-dark" style={{ background: '#0F1523', borderTop: '1.5px solid rgba(200,146,42,0.78)', padding: '96px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}><img src="/logo_nav.png" alt="NextUs" style={{ height: '40px', width: 'auto', display: 'inline-block', opacity: 0.78 }} /></div>
          <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.4, margin: '0 auto 36px' }} />
          <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,34px)', fontWeight: 300, color: 'rgba(255,255,255,0.92)', marginBottom: '12px' }}>Want to know what's next?</h2>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(255,255,255,0.55)', marginBottom: '40px', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>The platform is live and growing. New tools, new domains, new connections.</p>
          <div style={{ maxWidth: '380px', margin: '0 auto' }}>
            <script src="https://f.convertkit.com/ckjs/ck.5.js"></script>
            <form action="https://app.kit.com/forms/9215183/subscriptions" className="seva-form formkit-form" method="post" data-sv-form="9215183" data-uid="d323427d8c" data-format="inline" data-version="5">
              <input type="email" name="email_address" placeholder="your email" required style={{ width: '100%', padding: '15px 18px', marginBottom: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '40px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '16px', color: 'rgba(255,255,255,0.88)', outline: 'none' }} />
              <button type="submit" style={{ width: '100%', padding: '16px', background: '#C8922A', border: '1px solid rgba(168,114,26,0.8)', borderRadius: '40px', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '16px', letterSpacing: '0.16em', color: '#FFFFFF', cursor: 'pointer' }}>Join us {'\u2192'}</button>
            </form>
          </div>
        </div>
      </section>

      <CivilisationalFramePanel />
      <ToolCompassPanel />
      <SiteFooter />
    </div>
  )
}
