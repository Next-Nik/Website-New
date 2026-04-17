import { Nav } from '../components/Nav'
import { DarkSection, DarkEyebrow, DarkHeading, DarkBody, DarkSolidButton } from '../components/DarkSection'
import { SiteFooter } from '../components/SiteFooter'
import { ToolCompassPanel } from '../components/ToolCompassPanel'
import { GlossaryPanel } from '../components/GlossaryPanel'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

const TOOLS = [
  {
    id: 'foundation',
    name: 'Horizon State',
    one_line: 'Build the regulated ground that makes everything else possible.',
    url: '/tools/foundation',
    auth: true,
    time: '20 min daily',
  },
  {
    id: 'purpose-piece',
    name: 'Purpose Piece',
    one_line: 'Something in you already knows your role. This surfaces it — your archetype, your domain, your scale.',
    url: '/tools/purpose-piece',
    auth: true,
    time: '20 min',
  },
  {
    id: 'map',
    name: 'The Map',
    one_line: 'From where you are to where you want to be.',
    url: '/tools/map',
    auth: true,
    time: '10–20 min',
  },
  {
    id: 'target-goals',
    name: 'Target Sprint',
    one_line: 'Three key areas, 90 days, level up.',
    url: '/tools/target-goals',
    auth: true,
    time: '90 days',
  },
  {
    id: 'expansion',
    name: 'Horizon Practice',
    one_line: 'A daily practical practice for becoming your Horizon Self.',
    url: '/tools/expansion',
    auth: true,
    time: 'Daily',
  },
]

function ToolRow({ tool }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: '24px', padding: '28px 0',
      borderBottom: '1px solid rgba(200,146,42,0.08)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{ ...sc, fontSize: '19px', letterSpacing: '0.08em', color: '#A8721A' }}>{tool.name}</span>
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.35)', textTransform: 'uppercase' }}>{tool.time}</span>
        </div>
        <p style={{ ...serif, fontSize: '17px', fontWeight: 300, color: '#0F1523', lineHeight: 1.65, margin: 0, maxWidth: '540px' }}>
          {tool.one_line}
        </p>
      </div>
      <a
        href={tool.url}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '11px 22px', borderRadius: '40px',
          border: '1.5px solid rgba(200,146,42,0.78)',
          background: 'rgba(200,146,42,0.05)',
          ...sc, fontSize: '15px', fontWeight: 600,
          letterSpacing: '0.14em', color: '#A8721A',
          textDecoration: 'none', flexShrink: 0,
          whiteSpace: 'nowrap',
          transition: 'all 0.18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.08)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,1)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.05)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)' }}
      >
        Begin \u2192
      </a>
    </div>
  )
}

export function ToolsPage() {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="life-os" />

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: 'clamp(88px,10vw,112px) clamp(20px,5vw,40px) 120px' }}>

        {/* Header */}
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>The Horizon Suite</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          Five tools.<br /><em style={{ fontStyle: 'italic', color: '#A8721A' }}>One navigation system.</em>
        </h1>
        <p style={{ ...serif, fontSize: '17px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '48px', maxWidth: '560px' }}>
          Each tool is built for a specific stage of the journey. You don\u2019t need all of them \u2014 and you don\u2019t need to start at the beginning.
        </p>

              </div>

      {/* Orienteering nudge — dark section */}
      <DarkSection>
        <DarkEyebrow>Not sure where to start?</DarkEyebrow>
        <DarkHeading>A short conversation — and I’ll point you somewhere real.</DarkHeading>
        <DarkSolidButton href="/tools/orienteering">Find my starting point →</DarkSolidButton>
      </DarkSection>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '80px clamp(20px,5vw,40px) 120px' }}>

        {/* Tool list */}
        <div>
          {TOOLS.map(t => <ToolRow key={t.id} tool={t} />)}
        </div>

        {/* Horizon Suite link */}
        <div style={{ marginTop: '56px', paddingTop: '40px', borderTop: '1px solid rgba(200,146,42,0.15)', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
          <a href="/life-os" style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.6)', textDecoration: 'none' }}>
            \u2190 What is the Horizon Suite?
          </a>
          <a href="/work-with-nik" style={{ display: 'inline-block', padding: '14px 28px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.14em', textDecoration: 'none' }}>
            Work with Nik \u2192
          </a>
        </div>
      </div>

      <ToolCompassPanel />
      <GlossaryPanel />
      <SiteFooter />
    </div>
  )
}
