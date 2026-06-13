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

import { useEffect, useState } from 'react'
import { Nav }         from '../components/Nav'
import { SiteFooter }  from '../components/SiteFooter'
import { serif, body, sc } from '../lib/designTokens'
import { supabase }    from '../hooks/useSupabase'
import { WheelSVG }    from '../app/components/WheelSVG'
import WorldWheel      from '../app/components/mission-control/WorldWheel'

const gold      = '#A8721A'
const goldBdr   = 'rgba(200,146,42,0.78)'
const ink       = '#0F1523'
const inkFaint  = 'rgba(15,21,35,0.72)'

// ── Fractal hero data ────────────────────────────────────────
// Illustrative scores only — this is the signed-out front door,
// not live data. Shapes chosen to read as honest, not perfect.
const HERO_SELF_SCORES = {
  path: 7, spark: 6, body: 5, finances: 6, connection: 8, inner_game: 5, signal: 6,
}
const HERO_CIV_DIMS = [
  { slug: 'vision',  label: 'Vision',      color: '#6B1F2E' },
  { slug: 'human',   label: 'Human Being', color: '#E8722E' },
  { slug: 'nature',  label: 'Nature',      color: '#2A8C4F' },
  { slug: 'finance', label: 'Economy',     color: '#E8B92E' },
  { slug: 'society', label: 'Society',     color: '#D63838' },
  { slug: 'legacy',  label: 'Legacy',      color: '#2767B8' },
  { slug: 'tech',    label: 'Technology',  color: '#6B3FA8' },
]
const HERO_CIV_SCORES = {
  vision: 4, human: 6, nature: 4, finance: 5, society: 5, legacy: 5, tech: 7,
}

// ── Fractal hero visual — the two wheels, one geometry ───────
// Slow alternating emphasis between the personal and world wheel,
// joined by a single line. Static side-by-side when the user
// prefers reduced motion (handled in CSS).
function FractalWheels() {
  return (
    <div className="fractal-wheels" aria-hidden="true">
      <div className="fractal-wheel fractal-wheel--self">
        <WheelSVG scores={HERO_SELF_SCORES} size={170} />
        <span className="fractal-wheel-label" style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: inkFaint }}>
          YOUR LIFE
        </span>
      </div>
      <div className="fractal-link" />
      <div className="fractal-wheel fractal-wheel--world">
        <WorldWheel dimensions={HERO_CIV_DIMS} current={HERO_CIV_SCORES} size={206} />
        <span className="fractal-wheel-label" style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: inkFaint }}>
          YOUR WORLD
        </span>
      </div>
    </div>
  )
}

// ── Proof-of-life strip ──────────────────────────────────────
// Live public counts + three featured actors. Renders nothing on
// error — never zeros, never placeholders. Public data only; this
// page is signed-out.
const PROVENANCE_LABELS = {
  // 'self' shows no badge — owner-managed is its own provenance.
  community: 'Placed by the community',
  nextus:    'Seeded by NextUs',
}

function provenanceFor(actor) {
  const base = PROVENANCE_LABELS[actor.seeded_by]
  if (!base) return null
  if (actor.seeded_by === 'nextus' && actor.profile_owner) {
    return 'Seeded by NextUs · Claimed and managed by the actor'
  }
  if (actor.seeded_by === 'community' && actor.profile_owner) {
    return 'Placed by the community · Claimed and managed by the actor'
  }
  return base
}

function ProofOfLife() {
  const [counts, setCounts] = useState(null)
  const [actors, setActors] = useState([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [actorsCount, practicesCount, focusesCount, featured] = await Promise.all([
          supabase.from('nextus_actors').select('id', { count: 'exact', head: true }).eq('status', 'live'),
          supabase.from('practices_beta').select('id', { count: 'exact', head: true }),
          supabase.from('nextus_focuses').select('id', { count: 'exact', head: true }),
          supabase.from('nextus_actors')
            .select('slug, name, tagline, image_url, seeded_by, profile_owner, updated_at')
            .eq('status', 'live')
            .not('image_url', 'is', null)
            .not('tagline', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(3),
        ])
        if (cancelled) return

        const c = {}
        if (!actorsCount.error    && actorsCount.count    > 0) c.actors    = actorsCount.count
        if (!practicesCount.error && practicesCount.count > 0) c.practices = practicesCount.count
        if (!focusesCount.error   && focusesCount.count   > 0) c.focuses   = focusesCount.count
        setCounts(Object.keys(c).length ? c : null)
        if (!featured.error && featured.data?.length) setActors(featured.data)
      } catch {
        // Render nothing on failure — never fake numbers.
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (!counts && !actors.length) return null

  const countItems = []
  if (counts?.actors)    countItems.push({ n: counts.actors,    label: counts.actors === 1 ? 'builder on the map' : 'builders on the map' })
  if (counts?.practices) countItems.push({ n: counts.practices, label: counts.practices === 1 ? 'practice in the library' : 'practices in the library' })
  if (counts?.focuses)   countItems.push({ n: counts.focuses,   label: counts.focuses === 1 ? 'place in focus' : 'places in focus' })

  return (
    <section style={{
      maxWidth: '1100px',
      margin: '0 auto',
      padding: 'clamp(40px,5vw,64px) clamp(20px,5vw,40px)',
      borderTop: '1px solid rgba(200,146,42,0.10)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: countItems.length ? 'clamp(28px,3vw,40px)' : 0 }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.26em', color: gold, display: 'block', marginBottom: '14px' }}>
          ALREADY ON THE MAP
        </span>
        {counts?.actors && (
          <p style={{ ...serif, fontSize: 'clamp(20px,2.6vw,28px)', fontWeight: 300, color: ink, lineHeight: 1.45, maxWidth: '560px', margin: '0 auto' }}>
            The first {counts.actors} builders are on the map.
          </p>
        )}
      </div>

      {countItems.length > 1 && (
        <div className="pol-counts">
          {countItems.map(item => (
            <div key={item.label} className="pol-count">
              <span style={{ ...serif, fontSize: 'clamp(28px,3.4vw,40px)', fontWeight: 300, color: ink, lineHeight: 1, display: 'block' }}>
                {item.n}
              </span>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: inkFaint, display: 'block', marginTop: '6px' }}>
                {item.label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}

      {actors.length > 0 && (
        <div className="pol-actors">
          {actors.map(actor => {
            const prov = provenanceFor(actor)
            return (
              <a key={actor.slug} href={`/org/${actor.slug}`} className="pol-actor-card">
                <div className="pol-actor-image">
                  <img src={actor.image_url} alt={actor.name} loading="lazy" />
                </div>
                <div className="pol-actor-copy">
                  <h4 style={{ ...serif, fontSize: '19px', fontWeight: 400, color: ink, lineHeight: 1.2, margin: '0 0 6px' }}>
                    {actor.name}
                  </h4>
                  <p style={{ ...body, fontSize: '14px', lineHeight: 1.55, color: inkFaint, margin: '0 0 10px' }}>
                    {actor.tagline}
                  </p>
                  {prov && (
                    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(168,114,26,0.85)' }}>
                      {prov}
                    </span>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </section>
  )
}

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
        <span className="path-card-eyebrow" style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold, display: 'block', marginBottom: '14px' }}>
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

function HiwStep({ n, title, body: stepBody }) {
  return (
    <div className="hiw-step">
      <span className="hiw-step-n" style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: gold }}>{n}</span>
      <h4 style={{ ...serif, fontSize: 'clamp(19px,1.7vw,22px)', fontWeight: 400, color: ink, lineHeight: 1.2, margin: '6px 0 8px' }}>
        {title}
      </h4>
      <p style={{ ...body, fontSize: '15px', lineHeight: 1.7, color: inkFaint, margin: 0 }}>
        {stepBody}
      </p>
    </div>
  )
}

function HiwTrack({ label, heading, steps, closing, ctaLabel, ctaHref }) {
  return (
    <div className="hiw-track">
      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.24em', color: gold, display: 'block', marginBottom: '8px' }}>
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
    <div style={{ background: '#FAFAF7', minHeight: '100dvh' }}>
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
            fontSize: 'clamp(36px,5vw,58px)',
            fontWeight: 400,
            color: ink,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            marginBottom: 'clamp(20px,2.4vw,28px)',
            maxWidth: '880px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Your life and the world run on the same seven domains.
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
          NextUs is built on that. An honest picture of where you stand, a clear direction for where you're going, and the people already building the future you want to live in. One set of tools, two scales: your life, and your world.
        </p>
        <FractalWheels />
      </section>

      {/* ── Two doors ────────────────────────────── */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 clamp(20px,5vw,40px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(20px,2.4vw,28px)' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: '#A8721A' }}>
            THE PERSON AND THE PLANET · BUILT FOR BOTH, BUILDING BOTH
          </span>
        </div>
        <div className="mh-cards">
          <PathCard
            heading="Your life"
            bodyText="Get an honest read on your life and a practice for closing the gap between where you are and where you mean to be."
            cta="START"
            href="/login?path=self"
            image="/hero-personal.jpg"
            imageSide="left"
            dark={false}
          />
          <PathCard
            heading="Your world"
            bodyText="Find the people, organisations, and work already building the future you want to live in, and add your own."
            cta="EXPLORE"
            href="/explore"
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
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.26em', color: gold, display: 'block', marginBottom: '14px' }}>
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
            ctaHref="/explore"
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

      {/* ── Proof of life ────────────────────────── */}
      <ProofOfLife />

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
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.26em', color: gold, display: 'block', marginBottom: '20px' }}>
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
            SEE THE WHOLE PICTURE →
          </a>
        </div>
      </section>

      {/* ── Founder band ──────────────────────────── */}
      <section style={{
        background: '#FAFAF7',
        padding: 'clamp(28px,3.5vw,40px) clamp(20px,5vw,40px)',
        borderTop: '1px solid rgba(200,146,42,0.10)',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold, display: 'block', marginBottom: '10px' }}>
            FROM THE FOUNDER
          </span>
          <h3 style={{ ...serif, fontSize: 'clamp(20px,2.4vw,26px)', fontWeight: 400, color: ink, lineHeight: 1.3, marginBottom: '8px' }}>
            Work with Nik
          </h3>
          <p style={{ ...body, fontSize: '15px', lineHeight: 1.7, color: inkFaint, maxWidth: '520px', margin: '0 auto 18px' }}>
            Vision and embodiment coaching for people who are ready to move — not just understand.
          </p>
          <a
            href="/work-with-nik"
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
            SEE THE WORK →
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
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold, display: 'block', marginBottom: '14px' }}>
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
        /* ── Fractal hero wheels ─────────────────── */
        .fractal-wheels {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(8px,2.5vw,32px);
          margin-top: clamp(28px,3.5vw,44px);
        }
        .fractal-wheel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .fractal-wheel-label {
          display: block;
        }
        .fractal-link {
          width: clamp(36px,6vw,88px);
          height: 1px;
          background: linear-gradient(90deg, rgba(200,146,42,0.15), rgba(200,146,42,0.6), rgba(200,146,42,0.15));
          flex-shrink: 0;
          margin-bottom: 28px;
        }
        /* Slow alternating emphasis — one breath, ~14s */
        @media (prefers-reduced-motion: no-preference) {
          .fractal-wheel--self  { animation: fractalBreathA 14s ease-in-out infinite; }
          .fractal-wheel--world { animation: fractalBreathB 14s ease-in-out infinite; }
        }
        @keyframes fractalBreathA {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.45; }
        }
        @keyframes fractalBreathB {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 1; }
        }
        @media (max-width: 560px) {
          .fractal-wheels {
            flex-direction: column;
            gap: 4px;
          }
          .fractal-link {
            width: 1px;
            height: 32px;
            background: linear-gradient(180deg, rgba(200,146,42,0.15), rgba(200,146,42,0.6), rgba(200,146,42,0.15));
            margin-bottom: 0;
          }
        }

        /* ── Proof-of-life strip ─────────────────── */
        .pol-counts {
          display: flex;
          justify-content: center;
          gap: clamp(32px,6vw,80px);
          text-align: center;
          margin-bottom: clamp(32px,4vw,48px);
        }
        .pol-actors {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(14px,2vw,24px);
          max-width: 980px;
          margin: 0 auto;
        }
        .pol-actor-card {
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
          border: 1px solid rgba(200,146,42,0.12);
          border-radius: 12px;
          overflow: hidden;
          text-decoration: none;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .pol-actor-card:hover {
          border-color: rgba(200,146,42,0.4);
          box-shadow: 0 2px 12px rgba(15,21,35,0.06);
        }
        .pol-actor-image {
          height: 150px;
          overflow: hidden;
          flex-shrink: 0;
          background: rgba(15,21,35,0.04);
        }
        .pol-actor-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pol-actor-copy {
          padding: 16px 18px 18px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        @media (max-width: 680px) {
          .pol-counts {
            gap: 24px;
            flex-wrap: wrap;
          }
          .pol-actors {
            grid-template-columns: 1fr;
            max-width: 420px;
          }
          .pol-actor-image {
            height: 130px;
          }
        }

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
