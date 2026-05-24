// ─────────────────────────────────────────────────────────────
// MarketingHome — signed-out homepage
//
// Two-door structure: Personal Transformation / Changing the World.
// Hospitable register — benefit-led, short clauses, plain language.
// Imagery: sunrise-over-mountains (personal), dotted-globe (civ).
// Both CTAs route through auth → Mission Control.
// ─────────────────────────────────────────────────────────────

import { Nav }         from '../components/Nav'
import { SiteFooter }  from '../components/SiteFooter'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

const gold      = '#A8721A'
const goldBdr   = 'rgba(200,146,42,0.78)'
const ink       = '#0F1523'
const inkFaint  = 'rgba(15,21,35,0.72)'

// ── Reusable pill button ─────────────────────────────────────
function PillButton({ href, children, light }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '13px 28px',
    borderRadius: '40px',
    border: `1.5px solid ${light ? goldBdr : 'rgba(200,146,42,0.6)'}`,
    background: light ? 'rgba(200,146,42,0.06)' : 'transparent',
    ...sc,
    fontSize: '15px',
    fontWeight: 600,
    letterSpacing: '0.16em',
    color: light ? gold : 'rgba(200,146,42,0.85)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.18s',
    whiteSpace: 'nowrap',
  }
  return (
    <a
      href={href}
      style={base}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(200,146,42,0.10)'
        e.currentTarget.style.borderColor = goldBdr
        e.currentTarget.style.color = gold
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = light ? 'rgba(200,146,42,0.06)' : 'transparent'
        e.currentTarget.style.borderColor = light ? goldBdr : 'rgba(200,146,42,0.6)'
        e.currentTarget.style.color = light ? gold : 'rgba(200,146,42,0.85)'
      }}
    >
      {children}
    </a>
  )
}

// ── Path card ───────────────────────────────────────────────
function PathCard({ eyebrow, heading, body: bodyText, cta, href, image, dark }) {
  const bg     = dark ? '#0F1523' : '#FFFFFF'
  const clr    = dark ? '#FAFAF7' : ink
  const clrDim = dark ? 'rgba(250,250,247,0.65)' : inkFaint
  const btnBorder = dark ? 'rgba(200,146,42,0.6)' : goldBdr
  const btnBg     = dark ? 'transparent' : 'rgba(200,146,42,0.06)'
  const btnClr    = dark ? 'rgba(200,146,42,0.85)' : gold

  return (
    <div style={{
      flex: '1 1 0',
      minWidth: 0,
      borderRadius: '16px',
      overflow: 'hidden',
      background: bg,
      border: dark ? 'none' : '1px solid rgba(200,146,42,0.10)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Image */}
      <div style={{
        width: '100%',
        aspectRatio: '4/3',
        overflow: 'hidden',
        background: dark ? '#0B1020' : '#F5F2EC',
        flexShrink: 0,
      }}>
        <img
          src={image}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* Copy */}
      <div style={{ padding: 'clamp(28px,4vw,40px)', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.22em', color: gold, display: 'block', marginBottom: '12px' }}>
          {eyebrow}
        </span>
        <h2 style={{ ...serif, fontSize: 'clamp(26px,3.5vw,36px)', fontWeight: 400, color: clr, lineHeight: 1.15, marginBottom: '8px' }}>
          {heading}
        </h2>
        <div style={{ width: '32px', height: '1px', background: gold, opacity: 0.5, margin: '14px 0 18px' }} />
        <p style={{ ...body, fontSize: '15px', lineHeight: 1.75, color: clrDim, marginBottom: '28px', flex: 1 }}>
          {bodyText}
        </p>
        <a
          href={href}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '13px 28px', borderRadius: '40px',
            border: `1.5px solid ${btnBorder}`,
            background: btnBg,
            ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em',
            color: btnClr, textDecoration: 'none',
            alignSelf: 'flex-start',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(200,146,42,0.10)'
            e.currentTarget.style.borderColor = goldBdr
            e.currentTarget.style.color = gold
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = btnBg
            e.currentTarget.style.borderColor = btnBorder
            e.currentTarget.style.color = btnClr
          }}
        >
          {cta} →
        </a>
      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────
export function MarketingHomePage() {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav />

      {/* ── Hero ─────────────────────────────────── */}
      <section style={{
        maxWidth: '1040px',
        margin: '0 auto',
        padding: 'clamp(88px,10vw,120px) clamp(20px,5vw,40px) clamp(48px,6vw,64px)',
        textAlign: 'center',
      }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.26em', color: gold, display: 'block', marginBottom: '24px' }}>
          TWO PATHS. ONE PURPOSE.
        </span>
        <h1 style={{
          ...serif,
          fontSize: 'clamp(38px,6vw,72px)',
          fontWeight: 400,
          color: ink,
          lineHeight: 1.08,
          letterSpacing: '-0.01em',
          marginBottom: '0',
        }}>
          Where will you build<br />your impact?
        </h1>
      </section>

      {/* ── Two cards ────────────────────────────── */}
      <section style={{
        maxWidth: '1040px',
        margin: '0 auto',
        padding: '0 clamp(20px,5vw,40px)',
      }}>
        <div className="mh-cards">
          <PathCard
            eyebrow="PERSONAL TRANSFORMATION"
            heading="Start with yourself."
            bodyText="Build the inner clarity, courage, and capacity to live and lead from your highest self."
            cta="START WITH YOU"
            href="/login?path=self"
            image="/hero-personal.jpg"
            dark={false}
          />
          <PathCard
            eyebrow="CHANGING THE WORLD"
            heading="Start out there."
            bodyText="Use your gifts to create meaningful change and build a more conscious and connected world."
            cta="START OUT THERE"
            href="/login?path=civ"
            image="/hero-civ.jpg"
            dark={true}
          />
        </div>
      </section>

      {/* ── Align band ───────────────────────────── */}
      <section style={{
        background: '#0F1523',
        marginTop: 'clamp(48px,6vw,80px)',
        padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,40px)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* subtle globe echo behind text */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/hero-civ.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.07,
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.26em', color: gold, display: 'block', marginBottom: '20px' }}>
            ALIGN WITH WHAT MATTERS
          </span>
          <p style={{
            ...serif,
            fontSize: 'clamp(22px,3.5vw,36px)',
            fontWeight: 300,
            color: '#FAFAF7',
            lineHeight: 1.5,
            maxWidth: '640px',
            margin: '0 auto 32px',
          }}>
            Personal growth and global impact aren't separate.<br />
            They're the same work — at different scales.
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '14px 32px', borderRadius: '40px',
              border: `1.5px solid ${goldBdr}`,
              background: '#C8922A',
              ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.16em',
              color: '#FFFFFF', textDecoration: 'none',
              transition: 'background 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#A8721A' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#C8922A' }}
          >
            DREAM BIGGER →
          </a>
        </div>
      </section>

      {/* ── Maker entry point ─────────────────────── */}
      <section style={{
        background: '#FAFAF7',
        padding: 'clamp(48px,6vw,72px) clamp(20px,5vw,40px)',
        borderTop: '1px solid rgba(200,146,42,0.10)',
      }}>
        <div style={{
          maxWidth: '720px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.22em', color: gold, display: 'block', marginBottom: '14px' }}>
            FOR MAKERS
          </span>
          <h3 style={{ ...serif, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 400, color: ink, lineHeight: 1.3, marginBottom: '12px' }}>
            Coach, facilitator, therapist, organisation?
          </h3>
          <p style={{ ...body, fontSize: '15px', lineHeight: 1.75, color: inkFaint, marginBottom: '24px', maxWidth: '520px', margin: '0 auto 24px' }}>
            Make your work visible to the people most likely to be served by it.
          </p>
          <a
            href="/welcome"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 26px', borderRadius: '40px',
              border: `1.5px solid ${goldBdr}`,
              background: 'rgba(200,146,42,0.05)',
              ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em',
              color: gold, textDecoration: 'none',
              transition: 'background 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.05)' }}
          >
            SEE THE PATHS →
          </a>
        </div>
      </section>

      <SiteFooter />

      <style>{`
        .mh-cards {
          display: flex;
          gap: clamp(16px, 2.5vw, 24px);
          align-items: stretch;
        }
        @media (max-width: 680px) {
          .mh-cards {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}
