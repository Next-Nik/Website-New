import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ToolCompassPanel } from '../components/ToolCompassPanel'
import { CivilisationalFramePanel } from '../components/CivilisationalFramePanel'
import { DomainTooltip, LIFEOS_LABEL_MAP, NEXTUS_LABEL_MAP } from '../components/DomainTooltip'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import DomainExplorer from '../components/domain-explorer/DomainExplorer'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

const DOMAINS = [
  { key: 'human-being',     label: 'Human Being',      tip: 'Everything pertaining to the individual.', desc: 'Personal rights and needs. Development. Expression.' },
  { key: 'society',         label: 'Society',           tip: 'Everyone together.', desc: 'Governance, structure, frameworks. The science and art of community building and collective well-being.' },
  { key: 'nature',          label: 'Nature',            tip: 'Ecosystem Earth.', desc: 'Earth, air, water, flora, fauna, and everything else pertaining to the life on Earth.' },
  { key: 'technology',      label: 'Technology',        tip: 'The tools we build for humanity and Earth.', desc: 'The tools we build to aid and amplify humanity and life on Earth.' },
  { key: 'finance-economy', label: 'Finance & Economy', tip: 'Systems of exchange.', desc: 'The management and exchange of resources.' },
  { key: 'legacy',          label: 'Legacy',            tip: 'The footprint of mankind.', desc: "What we leave behind for future generations. Each generation's responsibility to the next seven." },
  { key: 'vision',          label: 'Vision',            tip: 'Where we are going.', desc: 'The orienting force of civilisation. A shared picture of where we are going — and the infrastructure to move toward it together.' },
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

// ── How it works section ─────────────────────────────────────

const ORG_STEPS = [
  {
    n: '01',
    title: 'Orient',
    body: 'Tell the platform what you\'re building and why. Name the horizon goal you\'re working toward. Place yourself in the domain where your work belongs — and every domain it touches.',
  },
  {
    n: '02',
    title: 'Offer',
    body: 'Show what you produce. Tools, services, programmes, resources, events. Contributors and visitors see what you give before they see what you ask for. The platform requires this. Give first.',
  },
  {
    n: '03',
    title: 'Need',
    body: 'Post what you\'re looking for. Skills, capital, time, creative work, relational capacity. Be specific — specific needs attract specific contributors. Once posted, needs are matched against contributor offers automatically.',
  },
  {
    n: '04',
    title: 'Receive',
    body: 'Matched contributors find you. Or they reach out directly — having placed their skills on the table without waiting for a specific need. Either direction can start a contribution.',
  },
  {
    n: '05',
    title: 'Close the loop',
    body: 'Confirm contributions. File outcome reports. The platform tracks what happened with every contribution it helped route. Silence costs visibility. Honesty builds it.',
  },
]

const CONTRIBUTOR_STEPS = [
  {
    n: '01',
    title: 'Orient',
    body: 'Purpose Piece tells you your archetype, your domain, and the scale where your contribution belongs. Your coordinates are placed on the map before you\'ve consciously decided to be here.',
  },
  {
    n: '02',
    title: 'Offer',
    body: 'Put what you have on the table. Skills, creative capacity, time, capital, knowledge, relational depth. Name who you\'ll hear from, what you expect in return — including nothing. The right orgs find you.',
  },
  {
    n: '03',
    title: 'Discover',
    body: 'Browse orgs filtered to your domain. The platform surfaces the ones whose open needs align with what you\'re offering. Direct matches and adjacent ones — because sometimes the best contribution is a conversation you didn\'t expect.',
  },
  {
    n: '04',
    title: 'Give',
    body: 'Respond to a specific need, or reach out directly with what you have. Both directions work. The contribution is recorded, attributed, and visible on your profile.',
  },
  {
    n: '05',
    title: 'Build a record',
    body: 'Every confirmed, closed-loop contribution becomes part of your permanent record. Not what you claimed to do — what you actually did, confirmed by the people you did it with.',
  },
]

function StepRow({ step, side }) {
  const isLeft = side === 'org'
  return (
    <div style={{
      display: 'flex',
      gap: '20px',
      alignItems: 'flex-start',
      padding: '20px 0',
      borderBottom: '1px solid rgba(200,146,42,0.10)',
    }}>
      <span style={{
        ...sc,
        fontSize: '13px',
        letterSpacing: '0.16em',
        color: isLeft ? '#A8721A' : 'rgba(15,21,35,0.35)',
        flexShrink: 0,
        minWidth: '28px',
        paddingTop: '3px',
      }}>
        {step.n}
      </span>
      <div>
        <p style={{
          ...serif,
          fontSize: '18px',
          fontWeight: 300,
          color: '#0F1523',
          marginBottom: '6px',
          lineHeight: 1.2,
        }}>
          {step.title}
        </p>
        <p style={{
          ...serif,
          fontSize: '15px',
          color: 'rgba(15,21,35,0.60)',
          lineHeight: 1.75,
          margin: 0,
        }}>
          {step.body}
        </p>
      </div>
    </div>
  )
}

function HowItWorksSection({ navigate }) {
  const [side, setSide] = useState('org')
  const steps = side === 'org' ? ORG_STEPS : CONTRIBUTOR_STEPS

  return (
    <div className="nextus-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '0 40px 80px' }}>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 56px' }} />

      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '14px' }}>
        How it works
      </span>
      <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '16px', lineHeight: 1.1 }}>
        The platform works both ways.
      </h2>
      <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', lineHeight: 1.8, marginBottom: '40px', maxWidth: '560px' }}>
        Organisations place themselves on the map and say what they need. Contributors place what they have on the table and say where they want it to go. The platform connects them — in either direction.
      </p>

      {/* Toggle */}
      <div style={{ display: 'flex', gap: '0', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.35)', overflow: 'hidden', width: 'fit-content', marginBottom: '40px' }}>
        {[
          { key: 'org',         label: 'I\'m an organisation' },
          { key: 'contributor', label: 'I have something to offer' },
        ].map(({ key, label }, i, arr) => (
          <button
            key={key}
            onClick={() => setSide(key)}
            style={{
              ...sc,
              fontSize: '13px',
              letterSpacing: '0.12em',
              padding: '11px 22px',
              border: 'none',
              cursor: 'pointer',
              background: side === key ? 'rgba(200,146,42,0.10)' : '#FFFFFF',
              color: side === key ? '#A8721A' : 'rgba(15,21,35,0.55)',
              borderRight: i < arr.length - 1 ? '1px solid rgba(200,146,42,0.25)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ maxWidth: '580px' }}>
        {steps.map(step => (
          <StepRow key={step.n} step={step} side={side} />
        ))}
      </div>

      {/* CTA */}
      <div style={{ marginTop: '40px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        {side === 'org' ? (
          <>
            <button
              onClick={() => navigate('/nextus/nominate')}
              style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em', padding: '14px 32px', borderRadius: '40px', border: 'none', background: '#C8922A', color: '#FFFFFF', cursor: 'pointer' }}
            >
              Place your organisation →
            </button>
            <button
              onClick={() => navigate('/nextus/actors')}
              style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em', padding: '14px 32px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.50)', background: 'transparent', color: '#A8721A', cursor: 'pointer' }}
            >
              See who's already here
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/tools/purpose-piece')}
              style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em', padding: '14px 32px', borderRadius: '40px', border: 'none', background: '#C8922A', color: '#FFFFFF', cursor: 'pointer' }}
            >
              Find your coordinates →
            </button>
            <button
              onClick={() => navigate('/nextus/actors')}
              style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em', padding: '14px 32px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.50)', background: 'transparent', color: '#A8721A', cursor: 'pointer' }}
            >
              Browse orgs
            </button>
          </>
        )}
      </div>

      {/* Integrity note */}
      <div style={{ marginTop: '48px', paddingTop: '28px', borderTop: '1px solid rgba(200,146,42,0.15)', maxWidth: '520px' }}>
        <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', lineHeight: 1.75, margin: 0 }}>
          The platform tracks what actually happens with every contribution — not what was promised, what was done. Contribution loops that don't close stop being visible. Alignment scores are earned, not declared. The architecture is designed so that good-faith participation is effortless and extraction is structurally difficult.
        </p>
      </div>

    </div>
  )
}

export function NextUsPage() {
  const [modal, setModal] = useState(null)
  const navigate = useNavigate()

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

      <div className="nextus-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '112px 40px 0' }}>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>NextUs</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          The future is not something<br /><em style={{ fontStyle: 'italic', color: '#A8721A' }}>that happens to us.</em>
        </h1>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '56px', maxWidth: '520px' }}>Seven domains. A living map of who is doing the work {'\u2014'} and how to find your place in it.</p>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '14px' }}>Explore the horizon goals</span>
      </div>

      {/* Domain Explorer */}
      <div style={{ width: '96vw', marginLeft: '50%', transform: 'translateX(-50%)', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid rgba(200,146,42,0.78)', marginBottom: 0 }}>
        <DomainExplorer />
      </div>

      <div className="nextus-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '0 40px 120px' }}>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '72px 0 40px' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '20px' }}>The problem is not effort.</h2>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>Someone is restoring soil carbon and does not know about the financing mechanism that could fund their work. Someone is building a governance framework that addresses exactly the problem another person is trying to solve. The person with capital has no map showing where the real gaps are.</p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>Progress is happening. But it is fragmented, invisible, and uncoordinated. The cost is duplicated effort, misallocated resources, and builders doing important work in isolation {'\u2014'} not knowing who else is carrying the same thing.</p>
        <div style={{ borderLeft: '2px solid rgba(200,146,42,0.20)', padding: '20px 0 20px 28px', margin: '48px 0', maxWidth: '580px' }}>
          <p style={{ ...serif, fontSize: '20px', fontStyle: 'italic', fontWeight: 300, color: '#0F1523', lineHeight: 1.65, margin: 0 }}>What we can see clearly, we can coordinate around. What we can coordinate around, we can change.</p>
        </div>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '56px', maxWidth: '600px' }}>NextUs is the perceptual layer. A living map of where humanity is trying to go {'\u2014'} across seven domains, at every scale {'\u2014'} so that the people already doing the work can find each other, aim at something worth building, and compound their effort rather than scatter it.</p>


        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 48px' }} />

        {/* Fractal connection */}
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '16px' }}>The same seven domains. Two scales.</h2>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '12px', maxWidth: '600px' }}>
          What you develop in yourself, you contribute to the world. The seven domains of your life map directly onto the seven domains of civilisation. Your personal work is not a detour from the larger work. It is the larger work, at a different scale.
        </p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '48px', maxWidth: '560px' }}>
          We are connected. We are fractal. The state of the world is a reflection of how we are doing individually — and how we are doing individually is a reflection of how we are doing as a whole.
        </p>

        {/* Domain map */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', marginBottom: '64px', maxWidth: '640px' }}>
          <div style={{ borderBottom: '2px solid rgba(200,146,42,0.30)', paddingBottom: '12px', marginBottom: '0' }}>
            <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A' }}>Life OS · Personal</span>
          </div>
          <div />
          <div style={{ borderBottom: '2px solid rgba(200,146,42,0.30)', paddingBottom: '12px', marginBottom: '0' }}>
            <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A' }}>NextUs · Civilisational</span>
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
              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '16px', fontWeight: 300, color: '#0F1523' }}>{personal}</span>
              <DomainTooltip domainKey={LIFEOS_LABEL_MAP[personal]} system="lifeos" position="below" />
            </div>,
            <div key={personal + '-arrow'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: i < 6 ? '1px solid rgba(200,146,42,0.08)' : 'none' }}>
              <span style={{ color: 'rgba(200,146,42,0.45)', fontSize: '16px' }}>→</span>
            </div>,
            <div key={civil} style={{ padding: '12px 0 12px 16px', borderBottom: i < 6 ? '1px solid rgba(200,146,42,0.08)' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '16px', fontWeight: 300, color: '#A8721A' }}>{civil}</span>
              <DomainTooltip domainKey={NEXTUS_LABEL_MAP[civil]} system="nextus" position="below" />
            </div>,
          ])}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 32px' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '8px' }}>Seven domains.</h2>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, marginBottom: '32px', maxWidth: '560px' }}>Click any domain to go deeper.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {DOMAINS.map((d, i) => (
            <div key={d.key} onClick={() => setModal(d)} style={{ display: 'flex', gap: '28px', padding: '18px 0', borderBottom: i < DOMAINS.length - 1 ? '1px solid rgba(200,146,42,0.08)' : 'none', alignItems: 'baseline', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,146,42,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: '#A8721A', minWidth: '170px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {d.label}
                <DomainTooltip domainKey={d.key} system="nextus" position="below" />
              </div>
              <div style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.88)', lineHeight: 1.6 }}>{d.tip}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actors entry point */}
      <div className="nextus-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '0 40px 0' }}>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 48px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '10px' }}>Who is doing the work.</h2>
            <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', maxWidth: '480px', lineHeight: 1.7 }}>Organisations, projects, and individuals placed on the map — by domain, by scale, by what they need.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/nextus/actors')} style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em', padding: '13px 28px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: '#A8721A', cursor: 'pointer', whiteSpace: 'nowrap' }}>Who's working on this →</button>
            <button onClick={() => navigate('/nextus/map')} style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em', padding: '13px 28px', borderRadius: '40px', border: '1px solid rgba(200,146,42,0.35)', background: 'transparent', color: 'rgba(15,21,35,0.55)', cursor: 'pointer', whiteSpace: 'nowrap' }}>See the map</button>
            <button onClick={() => navigate('/nextus/contributors')} style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em', padding: '13px 28px', borderRadius: '40px', border: '1px solid rgba(200,146,42,0.35)', background: 'transparent', color: 'rgba(15,21,35,0.55)', cursor: 'pointer', whiteSpace: 'nowrap' }}>I have something to offer</button>
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <HowItWorksSection navigate={navigate} />

      {/* Dark section */}
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
