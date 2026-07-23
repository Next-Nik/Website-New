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
import { Link } from 'react-router-dom'
import { Nav }         from '../components/Nav'
import { SiteFooter }  from '../components/SiteFooter'
import { serif, body, sc } from '../lib/designTokens'
import { Copy } from '../components/Copy'
import { useCopy } from '../lib/siteCopy'
import { supabase }    from '../hooks/useSupabase'
import { WheelSVG }    from '../app/components/WheelSVG'
import WorldWheel      from '../app/components/mission-control/WorldWheel'

const gold      = '#3c5637'   // fn.moss (dark) — heritage bridge name kept, value moved
const goldBdr   = 'rgba(76,107,69,0.55)'
const ink       = '#262420'   // fn.ink
const inkFaint  = 'rgba(38,36,32,0.68)'

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
  if (counts?.focuses)   countItems.push({ n: counts.focuses,   label: counts.focuses === 1 ? 'place on the map' : 'places on the map' })

  return (
    <section style={{
      maxWidth: '1100px',
      margin: '0 auto',
      padding: 'clamp(40px,5vw,64px) clamp(20px,5vw,40px)',
      borderTop: '1px solid rgba(38,36,32,0.10)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: countItems.length ? 'clamp(28px,3vw,40px)' : 0 }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.26em', color: gold, display: 'block', marginBottom: '14px' }}>
          <Copy id="home.pol.eyebrow" />
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
                    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(86,99,74,0.85)' }}>
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
    border: `1.5px solid ${light ? goldBdr : 'rgba(76,107,69,0.45)'}`,
    background: light ? 'rgba(76,107,69,0.06)' : 'transparent',
    ...sc,
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.14em',
    color: light ? gold : 'rgba(76,107,69,0.9)',
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
        e.currentTarget.style.background = light ? 'rgba(76,107,69,0.10)' : 'rgba(76,107,69,0.12)'
        e.currentTarget.style.borderColor = light ? goldBdr : 'rgba(76,107,69,0.6)'
        e.currentTarget.style.color = light ? gold : '#4c6b45'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = light ? 'rgba(76,107,69,0.06)' : 'transparent'
        e.currentTarget.style.borderColor = light ? goldBdr : 'rgba(76,107,69,0.45)'
        e.currentTarget.style.color = light ? gold : 'rgba(76,107,69,0.9)'
      }}
    >
      {children}
    </a>
  )
}

// ── Path card — horizontal split (image | copy) ──────────────
function PathCard({ eyebrow, heading, bodyText, cta, href, image, imageSide, dark }) {
  // dark = The Atlas door (civilisational) · light = Field Notes door (personal)
  const bg     = dark ? '#10222B' : '#f3f0e9'
  const clr    = dark ? '#f3f0e9' : ink
  const clrDim = dark ? 'rgba(217,226,221,0.66)' : inkFaint
  const btnBorder = dark ? 'rgba(76,107,69,0.45)' : goldBdr
  const btnBg     = dark ? 'transparent' : 'rgba(76,107,69,0.06)'
  const btnClr    = dark ? 'rgba(76,107,69,0.9)' : gold
  const imageBg   = dark ? '#10222B' : '#f3f0e9'

  const imagePanel = (
    <div className="path-card-image" style={{ background: imageBg }}>
      <img src={image} alt="" aria-hidden="true" />
    </div>
  )

  const copyPanel = (
    <div className="path-card-copy">
      {eyebrow && (
        <span className="path-card-eyebrow" style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: dark ? '#4c6b45' : gold, display: 'block', marginBottom: '14px' }}>
          {eyebrow}
        </span>
      )}
      <h2 className="path-card-heading" style={{ ...serif, fontSize: 'clamp(26px,2.8vw,38px)', fontWeight: 500, color: clr, lineHeight: 1.1, margin: 0, letterSpacing: '-0.005em' }}>
        {heading}
      </h2>
      <div className="path-card-divider" style={{ width: '32px', height: '1px', background: dark ? '#4c6b45' : gold, opacity: 0.55, margin: '18px 0 20px' }} />
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
          ...sc, fontSize: '13px', fontWeight: 500, letterSpacing: '0.14em',
          color: btnClr, textDecoration: 'none',
          alignSelf: 'flex-start',
          whiteSpace: 'nowrap',
          transition: 'all 0.18s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = dark ? 'rgba(76,107,69,0.12)' : 'rgba(76,107,69,0.10)'
          e.currentTarget.style.borderColor = dark ? 'rgba(76,107,69,0.6)' : goldBdr
          e.currentTarget.style.color = dark ? '#4c6b45' : gold
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
      style={{ background: bg, border: dark ? '1px solid rgba(76,107,69,0.20)' : '1px solid rgba(38,36,32,0.10)' }}
    >
      {imagePanel}
      {copyPanel}
    </div>
  )
}

// ── How-it-works content ─────────────────────────────────────
// Step text comes from the copy registry (editable on the founder page);
// the `n` numerals are structural and stay in code. Built per-render from
// the resolver so a founder edit shows up without a code change.
const buildPersonalSteps = (t) => [
  { n: '01', title: t('home.hiw.life.s1.title'), body: t('home.hiw.life.s1.body') },
  { n: '02', title: t('home.hiw.life.s2.title'), body: t('home.hiw.life.s2.body') },
  { n: '03', title: t('home.hiw.life.s3.title'), body: t('home.hiw.life.s3.body') },
]

const buildPlanetSteps = (t) => [
  { n: '01', title: t('home.hiw.world.s1.title'), body: t('home.hiw.world.s1.body') },
  { n: '02', title: t('home.hiw.world.s2.title'), body: t('home.hiw.world.s2.body') },
  { n: '03', title: t('home.hiw.world.s3.title'), body: t('home.hiw.world.s3.body') },
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

function HiwTrack({ label, heading, lede, steps, ctaLabel, ctaHref }) {
  return (
    <div className="hiw-track">
      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.24em', color: gold, display: 'block', marginBottom: '8px' }}>
        {label}
      </span>
      <h3 style={{ ...serif, fontSize: 'clamp(24px,2.4vw,30px)', fontWeight: 400, color: ink, lineHeight: 1.15, margin: '0 0 14px' }}>
        {heading}
      </h3>
      {lede && (
        <p style={{ ...body, fontSize: '16px', lineHeight: 1.7, color: ink, fontStyle: 'italic', margin: '0 0 26px' }}>
          {lede}
        </p>
      )}
      <div className="hiw-steps">
        {steps.map(s => <HiwStep key={s.n} {...s} />)}
      </div>
      <div style={{ marginTop: '28px' }}>
        <PillButton href={ctaHref} light>{ctaLabel}</PillButton>
      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────
export function MarketingHomePage() {
  const t = useCopy()
  const PERSONAL_STEPS = buildPersonalSteps(t)
  const PLANET_STEPS   = buildPlanetSteps(t)
  return (
    <div style={{ background: '#f3f0e9', minHeight: '100dvh' }}>
      <Nav />

      {/* ── Hero ─────────────────────────────────── */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(64px,7vw,88px) clamp(20px,5vw,40px) clamp(32px,4vw,44px)',
        textAlign: 'center',
      }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.26em', color: gold, display: 'block', marginBottom: '18px' }}>
          <Copy id="home.hero.eyebrow" />
        </span>
        <h1
          className="mh-hero-title"
          style={{
            ...serif,
            fontSize: 'clamp(34px,4.8vw,56px)',
            fontWeight: 400,
            color: ink,
            lineHeight: 1.08,
            letterSpacing: '-0.01em',
            marginBottom: 'clamp(8px,1.1vw,14px)',
            maxWidth: '900px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <Copy id="home.hero.title" />
        </h1>
        <p
          className="mh-hero-title2"
          style={{
            ...serif,
            fontSize: 'clamp(19px,2.2vw,28px)',
            fontWeight: 400,
            color: inkFaint,
            lineHeight: 1.3,
            letterSpacing: '-0.005em',
            maxWidth: '660px',
            margin: '0 auto',
          }}
        >
          <Copy id="home.hero.title2" />
        </p>

        {/* Visual up front — the fractal wheels open the page */}
        <FractalWheels />
        <p style={{ ...serif, fontSize: 'clamp(18px,2vw,24px)', fontWeight: 400, color: ink, lineHeight: 1.3, maxWidth: '560px', margin: 'clamp(18px,2.2vw,28px) auto 0' }}>
          <Copy id="home.hero.domains" />
        </p>

        {/* Argument — two columns so it reads wide, not tall */}
        <div className="mh-hero-2col">
          <p style={{ ...body, fontSize: 'clamp(15px,1.35vw,16px)', fontWeight: 400, lineHeight: 1.65, color: inkFaint, margin: 0 }}>
            <Copy id="home.hero.subtitle" />
          </p>
          <p style={{ ...body, fontSize: 'clamp(15px,1.35vw,16px)', fontWeight: 400, lineHeight: 1.65, color: inkFaint, margin: 0 }}>
            <Copy id="home.hero.whatis" />
          </p>
        </div>
        <div className="mh-hero-2col">
          <p style={{ ...body, fontSize: 'clamp(15px,1.35vw,16px)', fontWeight: 400, lineHeight: 1.65, color: inkFaint, margin: 0 }}>
            <Copy id="home.hero.builton" />
          </p>
          <p style={{ ...body, fontSize: 'clamp(15px,1.35vw,16px)', fontWeight: 400, lineHeight: 1.65, color: inkFaint, margin: 0 }}>
            <Copy id="home.hero.twosides" />
          </p>
        </div>

        <p
          className="mh-hero-closer"
          style={{
            ...serif,
            fontSize: 'clamp(18px,2vw,24px)',
            fontWeight: 400,
            lineHeight: 1.4,
            color: ink,
            maxWidth: '640px',
            margin: 'clamp(22px,2.6vw,30px) auto clamp(22px,2.4vw,28px)',
          }}
        >
          <Copy id="home.hero.closer" />
        </p>

        {/* One button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PillButton href="/tools"><Copy id="home.hero.cta" /></PillButton>
        </div>
      </section>

      {/* ── The Earth Challenge · front door ─────── */}
      <section style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(76,107,69,0.09), transparent 62%), #141B2C',
        padding: 'clamp(40px,5vw,56px) clamp(20px,5vw,40px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* world-map substrate — same treatment as the Align band, lifted a
            touch because the section navy matches the image's own navy */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/hero-civ.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.16,
          pointerEvents: 'none',
        }} />
        <div className="mh-earth" style={{
          maxWidth: '880px', margin: '0 auto',
          position: 'relative', zIndex: 1,
          display: 'flex', gap: 'clamp(24px,4vw,40px)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <img src="/logo_hero.png" alt="" loading="lazy"
            style={{ width: 'clamp(150px,18vw,210px)', flex: 'none' }} />
          <div style={{ flex: '1 1 340px', minWidth: '280px', maxWidth: '520px' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#4c6b45', display: 'block' }}>
              The NextUs Earth Challenge
            </span>
            <h2 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(28px,3.4vw,38px)', color: '#FBF8F0', lineHeight: 1.1, margin: '8px 0 10px' }}>
              Our part in the living world
            </h2>
            <p style={{ ...body, fontSize: '16px', lineHeight: 1.6, color: 'rgba(251,248,240,0.82)', margin: '0 0 14px', maxWidth: '46ch' }}>
              Organisations working for the living world are posting real challenges. People are taking them on. Every action adds a spark to one shared beacon.
            </p>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4c6b45', marginBottom: '18px' }}>
              Runs to 28 September &middot; Climate Week NYC
            </div>
            <Link to="/earth" style={{
              display: 'inline-block', ...sc, fontSize: '14px', letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#ffffff', background: '#4c6b45', borderRadius: '28px', padding: '13px 28px', textDecoration: 'none',
            }}>
              See the challenge →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Start ─────────────────────────────────── */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(4px,1.5vw,16px) clamp(20px,5vw,40px) clamp(24px,4vw,44px)',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <PillButton href="/tools" light><Copy id="home.hero.cta" /></PillButton>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,40px) clamp(40px,5vw,56px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px,4vw,52px)' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.26em', color: gold, display: 'block', marginBottom: '14px' }}>
            <Copy id="home.hiw.eyebrow" />
          </span>
          <p style={{ ...serif, fontSize: 'clamp(20px,2.6vw,28px)', fontWeight: 300, color: ink, lineHeight: 1.45, maxWidth: '560px', margin: '0 auto' }}>
            <Copy id="home.hiw.subtitle" />
          </p>
        </div>

        <div className="hiw-grid">
          <HiwTrack
            label={<Copy id="home.hiw.life.label" />}
            heading={<Copy id="home.hiw.life.heading" />}
            lede={<Copy id="home.hiw.life.lede" />}
            steps={PERSONAL_STEPS}
            ctaLabel={<Copy id="home.hiw.life.cta" />}
            ctaHref="/login?path=self"
          />
          <HiwTrack
            label={<Copy id="home.hiw.world.label" />}
            heading={<Copy id="home.hiw.world.heading" />}
            lede={<Copy id="home.hiw.world.lede" />}
            steps={PLANET_STEPS}
            ctaLabel={<Copy id="home.hiw.world.cta" />}
            ctaHref="/explore"
          />
        </div>

        <p style={{ ...serif, fontSize: 'clamp(17px,1.9vw,20px)', fontWeight: 300, fontStyle: 'italic', color: ink, lineHeight: 1.5, textAlign: 'center', maxWidth: '620px', margin: 'clamp(32px,4vw,44px) auto 0' }}>
          <Copy id="home.hiw.bridge" />
        </p>

        <div style={{ textAlign: 'center', marginTop: 'clamp(36px,4vw,48px)' }}>
          <a
            href="/tools"
            style={{
              ...sc, fontSize: '14px', letterSpacing: '0.16em',
              color: gold, textDecoration: 'underline', textUnderlineOffset: '4px',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#3c5637' }}
            onMouseLeave={e => { e.currentTarget.style.color = gold }}
          >
            <Copy id="home.hiw.seeall" />
          </a>
        </div>
      </section>

      {/* ── Proof of life ────────────────────────── */}
      <ProofOfLife />

      {/* ── Align band ───────────────────────────── */}
      <section style={{
        background: '#3c5637',
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
            <Copy id="home.align.eyebrow" />
          </span>
          <p style={{
            ...serif,
            fontSize: 'clamp(22px,3.5vw,36px)',
            fontWeight: 300,
            color: '#f3f0e9',
            lineHeight: 1.5,
            maxWidth: '640px',
            margin: '0 auto 32px',
          }}>
            <Copy id="home.align.line1" /><br />
            <Copy id="home.align.line2" />
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '14px 32px', borderRadius: '40px',
              border: `1.5px solid ${goldBdr}`,
              background: '#4c6b45',
              ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.16em',
              color: '#FFFFFF', textDecoration: 'none',
              transition: 'background 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#4c6b45' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#4c6b45' }}
          >
            <Copy id="home.align.cta" />
          </a>
        </div>
      </section>

      {/* ── Founder band ──────────────────────────── */}
      <section style={{
        background: '#f3f0e9',
        padding: 'clamp(28px,3.5vw,40px) clamp(20px,5vw,40px)',
        borderTop: '1px solid rgba(38,36,32,0.10)',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold, display: 'block', marginBottom: '10px' }}>
            <Copy id="home.founder.eyebrow" />
          </span>
          <h3 style={{ ...serif, fontSize: 'clamp(20px,2.4vw,26px)', fontWeight: 400, color: ink, lineHeight: 1.3, marginBottom: '8px' }}>
            <Copy id="home.founder.heading" />
          </h3>
          <p style={{ ...body, fontSize: '15px', lineHeight: 1.7, color: inkFaint, maxWidth: '520px', margin: '0 auto 18px' }}>
            <Copy id="home.founder.body" />
          </p>
          <a
            href="/work-with-nik"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 26px', borderRadius: '40px',
              border: `1.5px solid ${goldBdr}`,
              background: 'rgba(76,107,69,0.06)',
              ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em',
              color: gold, textDecoration: 'none',
              transition: 'background 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(76,107,69,0.10)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(76,107,69,0.06)' }}
          >
            <Copy id="home.founder.cta" />
          </a>
        </div>
      </section>

      {/* ── Maker entry point ─────────────────────── */}
      <section style={{
        background: '#f3f0e9',
        padding: 'clamp(48px,6vw,72px) clamp(20px,5vw,40px)',
        borderTop: '1px solid rgba(38,36,32,0.10)',
      }}>
        <div style={{
          maxWidth: '720px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold, display: 'block', marginBottom: '14px' }}>
            <Copy id="home.maker.eyebrow" />
          </span>
          <h3 style={{ ...serif, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 400, color: ink, lineHeight: 1.3, marginBottom: '12px' }}>
            <Copy id="home.maker.heading" />
          </h3>
          <p style={{ ...body, fontSize: '15px', lineHeight: 1.75, color: inkFaint, marginBottom: '24px', maxWidth: '520px', margin: '0 auto 24px' }}>
            <Copy id="home.maker.body" />
          </p>
          <a
            href="/welcome"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 26px', borderRadius: '40px',
              border: `1.5px solid ${goldBdr}`,
              background: 'rgba(76,107,69,0.06)',
              ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em',
              color: gold, textDecoration: 'none',
              transition: 'background 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(76,107,69,0.10)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(76,107,69,0.06)' }}
          >
            <Copy id="home.maker.cta" />
          </a>
        </div>
      </section>

      <SiteFooter />

      <style>{`
        /* ── Hero argument · two columns (wide, not tall) ── */
        .mh-hero-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(24px,4vw,52px);
          max-width: 940px;
          margin: clamp(18px,2.2vw,28px) auto 0;
          text-align: left;
        }
        @media (max-width: 680px) {
          .mh-hero-2col {
            grid-template-columns: 1fr;
            gap: 16px;
            text-align: center;
          }
        }

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
          background: linear-gradient(90deg, rgba(76,107,69,0.15), rgba(76,107,69,0.6), rgba(76,107,69,0.15));
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
            background: linear-gradient(180deg, rgba(76,107,69,0.15), rgba(76,107,69,0.6), rgba(76,107,69,0.15));
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
          border: 1px solid rgba(38,36,32,0.12);
          border-radius: 12px;
          overflow: hidden;
          text-decoration: none;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .pol-actor-card:hover {
          border-color: rgba(76,107,69,0.4);
          box-shadow: 0 2px 12px rgba(38,36,32,0.06);
        }
        .pol-actor-image {
          height: 150px;
          overflow: hidden;
          flex-shrink: 0;
          background: rgba(38,36,32,0.04);
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
          border-right: 1px solid rgba(38,36,32,0.14);
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
            border-bottom: 1px solid rgba(38,36,32,0.14);
            padding-bottom: 48px;
          }
        }
      `}</style>
    </div>
  )
}
