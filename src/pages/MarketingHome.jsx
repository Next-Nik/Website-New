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

// ── Path card — horizontal split (image | copy) ──────────────
// Layout & sizing live in CSS classes (see <style> block below) so
// the responsive media queries can override cleanly. Only the
// dark/light variants live in inline styles.
function PathCard({ eyebrow, heading, bodyText, cta, href, image, imageSide, dark }) {
  const bg     = dark ? '#0F1523' : '#FFFFFF'
  const clr    = dark ? '#FAFAF7' : ink
  const clrDim = dark ? 'rgba(250,250,247,0.72)' : inkFaint
  const btnBorder = dark ? 'rgba(200,146,42,0.6)' : goldBdr
  const btnBg     = dark ? 'transparent' : 'rgba(200,146,42,0.06)'
  const btnClr    = dark ? 'rgba(200,146,42,0.9)' : gold
  const imageBg   = dark ? '#0F1523' : '#FFFFFF'

  const imagePanel = (
    <div className="path-card-image" style={{ background: imageBg }}>
      <img src={image} alt="" aria-hidden="true" />
    </div>
  )

  const copyPanel = (
    <div className="path-card-copy">
      <span className="path-card-eyebrow" style={{ ...sc, fontSize: '12px', letterSpacing: '0.22em', color: gold, display: 'block', marginBottom: '14px' }}>
        {eyebrow}
      </span>
      <h2 className="path-card-heading" style={{ ...serif, fontSize: 'clamp(26px,2.8vw,38px)', fontWeight: 400, color: clr, lineHeight: 1.1, margin: 0, letterSpacing: '-0.005em' }}>
        {heading}
      </h2>
      <div className="path-card-divider" style={{ width: '32px', height: '1px', background: gold, opacity: 0.55, margin: '18px 0 20px' }} />
      <p className="path-card-body" style={{ ...body, fontSize: '15px', lineHeight: 1.7, color: clrDim, margin: '0 0 28px 0' }}>
        {bodyText}
      </p>
      <a
        href={href}
        className="path-card-cta"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '13px 28px', borderRadius: '40px',
          border: `1.5px solid ${btnBorder}`,
          background: btnBg,
          ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em',
          color: btnClr, textDecoration: 'none',
          alignSelf: 'flex-start',
          whiteSpace: 'nowrap',
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
  )

  return (
    <div
      className={`path-card path-card--image-${imageSide}`}
      style={{ background: bg, border: dark ? 'none' : '1px solid rgba(200,146,42,0.12)' }}
    >
      {imageSide === 'left' ? imagePanel : copyPanel}
      {imageSide === 'left' ? copyPanel : imagePanel}
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
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(64px,7vw,88px) clamp(20px,5vw,40px) clamp(32px,4vw,44px)',
        textAlign: 'center',
      }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.26em', color: gold, display: 'block', marginBottom: '18px' }}>
          TWO PATHS. ONE PURPOSE.
        </span>
        <h1
          className="mh-hero-title"
          style={{
            ...serif,
            fontSize: 'clamp(38px,5.5vw,64px)',
            fontWeight: 400,
            color: ink,
            lineHeight: 1.08,
            letterSpacing: '-0.01em',
            marginBottom: '0',
          }}
        >
          Where will you build<br />your impact?
        </h1>
      </section>

      {/* ── Two cards ────────────────────────────── */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 clamp(20px,5vw,40px)',
      }}>
        <div className="mh-cards">
          <PathCard
            eyebrow="PERSONAL TRANSFORMATION"
            heading="Personal Transformation"
            bodyText="Build the inner clarity, courage, and capacity to live and lead from your highest self."
            cta="START WITH YOU"
            href="/login?path=self"
            image="/hero-personal.jpg"
            imageSide="left"
            dark={false}
          />
          <PathCard
            eyebrow="CHANGING THE WORLD"
            heading="Changing the World"
            bodyText="Use your gifts to create meaningful change and build a more conscious and connected world."
            cta="START OUT THERE"
            href="/login?path=civ"
            image="/hero-civ.jpg"
            imageSide="right"
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


    </div>
  )
}
