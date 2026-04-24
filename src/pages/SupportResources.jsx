import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { CrisisResources } from '../components/CrisisResources'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

export function SupportResourcesPage() {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="" />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '112px 40px 120px' }}>

        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>
          Support Resources
        </span>
        <h1 style={{ ...body, fontSize: 'clamp(36px,5vw,52px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: '24px' }}>
          If you need someone<br />
          <em style={{ color: '#A8721A' }}>to talk to right now.</em>
        </h1>

        <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, marginBottom: '20px', maxWidth: '600px' }}>
          NextUs is a developmental tool, not a crisis service. If you're in active distress
          or just need to talk to someone trained to listen, the resources below are free,
          confidential, and available now.
        </p>

        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '48px', maxWidth: '600px' }}>
          You don't have to be in crisis to call. Most of these services welcome anyone who
          needs to talk.
        </p>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', marginBottom: '40px' }} />

        <CrisisResources variant="full" />

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '48px 0 24px' }} />

        <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, maxWidth: '600px' }}>
          We do our best to keep this directory current. If you find a number that no longer
          works, or know of a resource we should add, please let us know at{' '}
          <a href="mailto:hello@nextus.world" style={{ color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.3)' }}>
            hello@nextus.world
          </a>.
        </p>
      </div>
      <SiteFooter />
    </div>
  )
}
