import { useState } from 'react'
import { CivilisationalFramePanel } from '../components/CivilisationalFramePanel'
import { SiteNav } from '../components/SiteNav'
import { SiteFooter } from '../components/SiteFooter'
import DomainExplorer from '../components/domain-explorer/DomainExplorer'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

const DOMAINS = [
  { key: 'human-being',     label: 'Human Being',      tip: 'Who we are becoming.', desc: 'What it means to be fully human. The conditions for knowing yourself, developing fully, and contributing meaningfully to life on earth.' },
  { key: 'society',         label: 'Society',           tip: 'How we live together.', desc: 'The architecture of collective life. How communities govern themselves, trust each other, and create shared futures.' },
  { key: 'nature',          label: 'Nature',            tip: 'The living systems we depend on.', desc: 'The living systems that make all life possible. Humanity as participant, not owner.' },
  { key: 'technology',      label: 'Technology',        tip: 'What we build to extend our reach.', desc: 'The tools we build — and whether they extend our wisdom or outpace it.' },
  { key: 'finance-economy', label: 'Finance & Economy', tip: 'How we move what matters.', desc: 'What we reward. How resources flow — and whether they move toward what sustains life or away from it.' },
  { key: 'legacy',          label: 'Legacy',            tip: 'What we leave behind.', desc: "What we leave behind. Each generation's responsibility to the next seven." },
  { key: 'vision',          label: 'Vision',            tip: 'Where we are going.', desc: 'The orienting capacity of civilisation. A shared picture of where we are going — and the infrastructure to move toward it together.' },
]

function DomainModal({ domain, onClose }) {
  if (!domain) return null
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
      <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '32px', maxWidth: '420px', width: '100%', position: 'relative', ...serif }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '18px', fontSize: '18px', cursor: 'pointer', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', lineHeight: 1 }}>{'\u00D7'}</button>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '8px' }}>NextUs Domain</div>
        <div style={{ fontSize: '24px', fontWeight: 300, color: '#0F1523', marginBottom: '12px', lineHeight: 1.1 }}>{domain.label}</div>
        <div style={{ fontSize: '16px', fontWeight: 300, lineHeight: 1.75, color: 'rgba(15,21,35,0.78)', marginBottom: '16px' }}>{domain.desc}</div>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', borderTop: '1px solid rgba(200,146,42,0.20)', paddingTop: '12px' }}>Part of the NextUs vocabulary.</div>
      </div>
    </div>
  )
}

export function NextUsPage() {
  const [modal, setModal] = useState(null)

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <SiteNav active="nextus" />
      <DomainModal domain={modal} onClose={() => setModal(null)} />

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '112px 40px 0' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>NextUs</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          The future is not something<br /><em style={{ fontStyle: 'italic', color: '#A8721A' }}>that happens to us.</em>
        </h1>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '56px', maxWidth: '520px' }}>Seven domains. A living map of where we are {'\u2014'} and the distance to where we are trying to go.</p>
        <span style={{ ...sc, fontSize: '11px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '14px' }}>Explore the horizon goals</span>
      </div>

      {/* Domain Explorer */}
      <div style={{ width: '96vw', marginLeft: '50%', transform: 'translateX(-50%)', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid rgba(200,146,42,0.78)', marginBottom: 0 }}>
        <DomainExplorer />
      </div>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 40px 120px' }}>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '72px 0 40px' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '20px' }}>The problem is not effort.</h2>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>Someone is restoring soil carbon and does not know about the financing mechanism that could fund their work. Someone is building a governance framework that addresses exactly the problem another person is trying to solve. The person with capital has no map showing where the real gaps are.</p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>Progress is happening. But it is fragmented, invisible, and uncoordinated. The cost is duplicated effort, misallocated resources, and builders doing important work in isolation {'\u2014'} not knowing who else is carrying the same thing.</p>
        <div style={{ borderLeft: '2px solid rgba(200,146,42,0.20)', padding: '20px 0 20px 28px', margin: '48px 0', maxWidth: '580px' }}>
          <p style={{ ...serif, fontSize: '20px', fontStyle: 'italic', fontWeight: 300, color: '#0F1523', lineHeight: 1.65, margin: 0 }}>What we can see clearly, we can coordinate around. What we can coordinate around, we can change.</p>
        </div>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '56px', maxWidth: '600px' }}>NextUs is the perceptual layer. A living map of where humanity is trying to go {'\u2014'} across seven domains, at every scale {'\u2014'} so that the people already doing the work can find each other, aim at something worth building, and compound their effort rather than scatter it.</p>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 32px' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '8px' }}>Seven domains.</h2>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, marginBottom: '32px', maxWidth: '560px' }}>Click any domain to go deeper.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {DOMAINS.map((d, i) => (
            <div key={d.key} onClick={() => setModal(d)} style={{ display: 'flex', gap: '28px', padding: '18px 0', borderBottom: i < DOMAINS.length - 1 ? '1px solid rgba(200,146,42,0.08)' : 'none', alignItems: 'baseline', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,146,42,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#A8721A', minWidth: '170px', flexShrink: 0 }}>{d.label}</div>
              <div style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.88)', lineHeight: 1.6 }}>{d.tip}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dark section */}
      <section style={{ background: '#0F1523', borderTop: '1.5px solid rgba(200,146,42,0.78)', padding: '96px 40px', textAlign: 'center' }}>
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
      <SiteFooter />
    </div>
  )
}
