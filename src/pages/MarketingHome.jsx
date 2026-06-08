// ─────────────────────────────────────────────────────────────
// MarketingHome — signed-out homepage
//
// Front door for a stranger: says plainly what NextUs is, what you
// do, and what you get back, before asking anyone to log in.
//
// Structure:
//   Hero        — what NextUs is, in one breath
//   Two doors   — Personal Transformation / Changing the World
//   How it works — two scales side by side, three steps each,
//                  honest about the time and the payoff
//   Align band  — the two scales are one project
//   Makers      — entry point for coaches / orgs
//
// Tool usage still requires login (no anonymous sessions); the
// marketing surface is readable without it.
// ─────────────────────────────────────────────────────────────

import { Nav }         from '../components/Nav'
import { SiteFooter }  from '../components/SiteFooter'
import { serif, body, sc } from '../lib/designTokens'

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
      {eyebrow && (
        <span className="path-card-eyebrow" style={{ ...sc, fontSize: '12px', letterSpacing: '0.22em', color: gold, display: 'block', marginBottom: '14px' }}>
          {eyebrow}
        </span>
      )}
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
      {imagePanel}
      {copyPanel}
    </div>
  )
}

// ── How-it-works content ─────────────────────────────────────
const PERSONAL_STEPS = [
  {
    n: '01',
    title: 'See where you stand',
    body: 'The Map gives an honest read of your life across seven domains: Path, Spark, Body, Finances, Connection, Inner Game, and Signal. It is deliberate work, not a quiz. A first pass takes about an hour, and many people return to it domain by domain over weeks. You leave with a clear picture of where your life actually is.',
  },
  {
    n: '02',
    title: 'Decide where it goes',
    body: 'With that picture in front of you, you name where you want each part of your life to be, and what you are willing to do to get there. Purpose Piece helps you find the contribution that is yours to make. The result is direction you chose, not direction you drifted into.',
  },
  {
    n: '03',
    title: 'Build toward it',
    body: 'Horizon Practice turns that direction into a daily practice you can keep, and the Atlas connects you to the people and work already building the future you named. The result is momentum, and company for the road.',
  },
]

const PLANET_STEPS = [
  {
    n: '01',
    title: 'Name the future worth building',
    body: 'The same seven domains that map a life map a civilisation: Human Being, Society, Nature, Technology, Finance & Economy, Legacy, and Vision. Humanity has never sat down and agreed what it is building toward. NextUs makes that picture something you can see, and starts with a simpler question: what future do you actually want to live in?',
  },
  {
    n: '02',
    title: 'Find where you come in',
    body: 'Of those seven domains, which is yours to work in, and at what scale: close and local, or wide and structural? Name the domain and the scale where you most want to make an impact, and look there.',
  },
  {
    n: '03',
    title: 'See who is already building it',
    body: 'The Atlas is a living directory of the people, organisations, and projects doing the real work across those seven domains. In the corner you named, you can see who is already on it: who is worth backing, joining, or learning from. Then add your weight: support the people already building, point others toward work that deserves to be seen, or make your own work visible to those most likely to be served by it. The fractal runs both ways: the work you do on yourself shapes the world, and the world you help build gives that work somewhere to land.',
  },
]

function HiwStep({ n, title, body }) {
  return (
    <div className="hiw-step">
      <span className="hiw-step-n" style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: gold }}>{n}</span>
      <h4 style={{ ...serif, fontSize: 'clamp(19px,1.7vw,22px)', fontWeight: 400, color: ink, lineHeight: 1.2, margin: '6px 0 8px' }}>
        {title}
      </h4>
      <p style={{ ...body, fontSize: '15px', lineHeight: 1.7, color: inkFaint, margin: 0 }}>
        {body}
      </p>
    </div>
  )
}

function HiwTrack({ label, heading, steps, closing, ctaLabel, ctaHref }) {
  return (
    <div className="hiw-track">
      <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.24em', color: gold, display: 'block', marginBottom: '8px' }}>
        {label}
      </span>
      <h3 style={{ ...serif, fontSize: 'clamp(24px,2.4vw,30px)', fontWeight: 400, color: ink, lineHeight: 1.15, margin: '0 0 24px' }}>
        {heading}
      </h3>
      <div className="hiw-steps">
        {steps.map(s => <HiwStep key={s.n} {...s} />)}
      </div>
      <p style={{ ...body, fontSize: '15px', lineHeight: 1.7, color: ink, fontWeight: 500, margin: '26px 0 22px' }}>
        {closing}
      </p>
      <PillButton href={ctaHref} light>{ctaLabel}</PillButton>
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
          A LIFE WORTH LIVING. A FUTURE WORTH BUILDING.
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
            marginBottom: 'clamp(20px,2.4vw,28px)',
          }}
        >
          See your life clearly.<br />Build toward what matters.
        </h1>
        <p
          className="mh-hero-subtitle"
          style={{
            ...body,
            fontSize: 'clamp(15px,1.4vw,17px)',
            fontWeight: 400,
            lineHeight: 1.7,
            color: inkFaint,
            maxWidth: '660px',
            margin: '0 auto',
          }}
        >
          NextUs is a suite of tools for orienting a whole life. An honest picture of where you stand, a clear sense of where you want to go, and a way to connect with the people and work already building that future. The same tools run at two scales: your own life, and the wider world.
        </p>
      </section>

      {/* ── Two doors ────────────────────────────── */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 clamp(20px,5vw,40px)',
      }}>
        <div className="mh-cards">
          <PathCard
            heading="Personal Transformation"
            bodyText="Get an honest read on your life and a practice for closing the gap between where you are and where you mean to be."
            cta="START"
            href="/login?path=self"
            image="/hero-personal.jpg"
            imageSide="left"
            dark={false}
          />
          <PathCard
            heading="Changing the World"
            bodyText="Find the people, organisations, and work already building the future you want to live in, and add your own."
            cta="START"
            href="/login?path=civ"
            image="/hero-civ.jpg"
            imageSide="right"
            dark={true}
          />
        </div>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,40px) clamp(40px,5vw,56px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px,4vw,52px)' }}>
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.26em', color: gold, display: 'block', marginBottom: '14px' }}>
            HOW IT WORKS
          </span>
          <p style={{ ...serif, fontSize: 'clamp(20px,2.6vw,28px)', fontWeight: 300, color: ink, lineHeight: 1.45, maxWidth: '560px', margin: '0 auto' }}>
            The same three steps, at the scale of a single life and the scale of a civilisation.
          </p>
        </div>

        <div className="hiw-grid">
          <HiwTrack
            label="FOR YOUR LIFE"
            heading="A life worth living"
            steps={PERSONAL_STEPS}
            closing="Put in an honest hour to start. What you get back is a picture of your life you can act on, and a direction worth keeping."
            ctaLabel="START WITH THE MAP →"
            ctaHref="/login?path=self"
          />
          <HiwTrack
            label="FOR THE WORLD"
            heading="A future worth building"
            steps={PLANET_STEPS}
            closing="Start by naming one part of the future you want. What you get back is a map of who is already building it, and a place to add your own."
            ctaLabel="EXPLORE THE ATLAS →"
            ctaHref="/login?path=civ"
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: 'clamp(36px,4vw,48px)' }}>
          <a
            href="/tools"
            style={{
              ...sc, fontSize: '14px', letterSpacing: '0.16em',
              color: gold, textDecoration: 'underline', textUnderlineOffset: '4px',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#8A5C15' }}
            onMouseLeave={e => { e.currentTarget.style.color = gold }}
          >
            See all the tools →
          </a>
        </div>
      </section>

      {/* ── Align band ───────────────────────────── */}
      <section style={{
        background: '#0F1523',
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
            Personal growth and global impact are not separate.<br />
            They are the same work, at different scales.
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
        /* ── Path cards ─────────────────────────── */
        /* Desktop: two cards side by side, each with horizontal image|copy split */
        .mh-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }
        .path-card {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 12px;
        }
        .path-card-image {
          overflow: hidden;
          flex-shrink: 0;
        }
        .path-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .path-card-copy {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding: 24px 20px 28px;
          flex: 1;
        }
        /* Desktop: image fills top portion, fixed height */
        @media (min-width: 681px) {
          .mh-cards {
            gap: clamp(12px,2vw,24px);
            padding: 0 clamp(20px,5vw,40px);
          }
          .path-card-image {
            height: clamp(180px,20vw,280px);
          }
          .path-card-copy {
            padding: clamp(20px,2.5vw,36px) clamp(20px,2.5vw,36px) clamp(24px,3vw,40px);
          }
          .path-card-heading {
            font-size: clamp(20px,2vw,28px) !important;
          }
        }
        /* Mobile: two cards side by side, image top, copy below */
        @media (max-width: 680px) {
          .mh-cards {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            padding: 0 12px;
          }
          .path-card {
            border-radius: 10px;
          }
          .path-card-image {
            height: 130px;
          }
          .path-card-copy {
            padding: 12px 10px 16px;
          }
          .path-card-heading {
            font-size: 16px !important;
            line-height: 1.2 !important;
            margin-bottom: 8px;
          }
          .path-card-body {
            font-size: 12px !important;
            line-height: 1.5 !important;
            margin-bottom: 12px !important;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .path-card-cta {
            padding: 8px 14px !important;
            font-size: 11px !important;
            letter-spacing: 0.1em !important;
          }
          .path-card-divider {
            margin: 10px 0 10px !important;
          }
        }

        /* ── How-it-works grid ──────────────────── */
        .hiw-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(32px,5vw,64px);
          align-items: start;
        }
        .hiw-grid > .hiw-track:first-child {
          padding-right: clamp(32px,5vw,64px);
          border-right: 1px solid rgba(200,146,42,0.14);
        }
        .hiw-steps {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        @media (max-width: 760px) {
          .hiw-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }
          .hiw-grid > .hiw-track:first-child {
            padding-right: 0;
            border-right: none;
            border-bottom: 1px solid rgba(200,146,42,0.14);
            padding-bottom: 48px;
          }
        }
      `}</style>
    </div>
  )
}
