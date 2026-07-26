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

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Nav }         from '../components/Nav'
import { SiteFooter }  from '../components/SiteFooter'
import { serif, body, sc } from '../lib/designTokens'
import { Copy } from '../components/Copy'
import { useCopy } from '../lib/siteCopy'
import { supabase }    from '../hooks/useSupabase'
import { WheelSVG, SELF_DOMAINS } from '../app/components/WheelSVG'
import WorldWheel      from '../app/components/mission-control/WorldWheel'
import { DOMAIN_COPY }       from '../constants/domainCopy'
import { CIV_DOMAIN_COPY }   from '../constants/civDomainCopy'
import { SELF_TO_ATLAS_MAP } from '../app/constants/domains'

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
// Canonical slugs (see CIV_DOMAINS in app/constants/domains.js). The hero
// previously inlined short forms — 'human', 'finance', 'tech' — which was
// harmless while the wheel was decorative and silently breaks any lookup
// keyed on a domain the moment it isn't.
//
// The colours here are deliberately the personal-side palette rather than the
// muted CIV_DOMAINS one: on this page the two wheels are making the argument
// that they are the same shape at two scales, and shared hue is half of that
// argument. Every civ surface behind the login keeps the muted palette.
const HERO_CIV_DIMS = [
  { slug: 'vision',          label: 'Vision',      color: '#6B1F2E' },
  { slug: 'human-being',     label: 'Human Being', color: '#E8722E' },
  { slug: 'nature',          label: 'Nature',      color: '#2A8C4F' },
  { slug: 'finance-economy', label: 'Economy',     color: '#E8B92E' },
  { slug: 'society',         label: 'Society',     color: '#D63838' },
  { slug: 'legacy',          label: 'Legacy',      color: '#2767B8' },
  { slug: 'technology',      label: 'Technology',  color: '#6B3FA8' },
]
const HERO_CIV_SCORES = {
  vision: 4, 'human-being': 6, nature: 4, 'finance-economy': 5,
  society: 5, legacy: 5, technology: 7,
}

// ── The fractal pairing ──────────────────────────────────────
// SELF_TO_ATLAS_MAP is keyed 'inner-game'; the wheel's SELF_DOMAINS is keyed
// 'inner_game'. Normalise once here rather than papering over it at each call.
const selfKeyToMapKey = k => k.replace(/_/g, '-')
const MIRROR_OF_SELF = Object.fromEntries(
  SELF_DOMAINS.map(d => [d.key, SELF_TO_ATLAS_MAP[selfKeyToMapKey(d.key)]]).filter(([, v]) => v)
)
const MIRROR_OF_CIV = Object.fromEntries(
  Object.entries(MIRROR_OF_SELF).map(([self, civ]) => [civ, self])
)
const civLabel  = slug => HERO_CIV_DIMS.find(d => d.slug === slug)?.label
const selfLabel = key  => SELF_DOMAINS.find(d => d.key === key)?.name
const civHex    = slug => HERO_CIV_DIMS.find(d => d.slug === slug)?.color
const selfHex   = key  => SELF_DOMAINS.find(d => d.key === key)?.hex

// ── Fractal hero visual — the two wheels, one geometry ───────
// Slow alternating emphasis between the personal and world wheel,
// joined by a single line. Static side-by-side when the user
// prefers reduced motion (handled in CSS).
//
// The labels are the teaching affordance. A stranger arrives at this page
// being told their life runs on seven domains named Path, Spark and Signal,
// and is given no way to find out what any of those words mean before being
// asked to log in. Selecting a label answers that in place.
//
// One shared reveal slot serves both wheels, so selection lives here rather
// than inside either <Wheel>, and only one domain is ever open.
function FractalWheels({ open, onSelect }) {
  const selfOpen = open?.scale === 'self'  ? open.key : null
  const civOpen  = open?.scale === 'world' ? open.key : null
  const selfMirror = civOpen  ? MIRROR_OF_CIV[civOpen]   : null
  const civMirror  = selfOpen ? MIRROR_OF_SELF[selfOpen] : null

  return (
    <div className={`fractal-wheels${open ? ' is-engaged' : ''}`}>
      <div className="fractal-wheel fractal-wheel--self">
        <WheelSVG
          scores={HERO_SELF_SCORES}
          size={170}
          teaching
          selected={selfOpen}
          mirrored={selfMirror}
          onSelect={key => onSelect('self', key)}
        />
        <span className="fractal-wheel-label" style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: inkFaint }}>
          YOUR LIFE
        </span>
      </div>
      <div className="fractal-link" />
      <div className="fractal-wheel fractal-wheel--world">
        <WorldWheel
          dimensions={HERO_CIV_DIMS}
          current={HERO_CIV_SCORES}
          size={206}
          teaching
          selected={civOpen}
          mirrored={civMirror}
          onSelect={key => onSelect('world', key)}
        />
        <span className="fractal-wheel-label" style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: inkFaint }}>
          YOUR WORLD
        </span>
      </div>
    </div>
  )
}

// ── The shared reveal slot ───────────────────────────────────
// Sits under both wheels and holds one of two things: the framing line that
// already lived here, or the definition of whichever domain is open. Opening a
// domain moves nothing else on the page — a hero that jumps when you touch it
// reads as broken.
//
// No score, tier or signature is shown. The wheel shapes are illustrative
// (HERO_*_SCORES above); telling a stranger "you are at 7" off invented data
// would be the one genuinely dishonest thing this page could do.
//
// Every card is rendered, all fifteen layers stacked in one grid cell, with
// only the active one visible. That is what makes "nothing moves" true rather
// than approximately true: the slot is always as tall as its own tallest
// child, so no min-height has to be guessed and kept in sync. A reserved
// magic number had Human Being and Society overflowing by ~15px at 390px
// wide, which is exactly the class of bug this structure cannot have.
//
// Hidden layers use visibility: hidden, so they are out of the tab order and
// out of the accessibility tree, and are marked aria-hidden besides.
const REVEAL_ENTRIES = [
  ...SELF_DOMAINS.map(d => ({
    scale: 'self', key: d.key, hue: d.hex, entry: DOMAIN_COPY[d.key],
    scaleLabel: 'Your life', mirrorName: civLabel(MIRROR_OF_SELF[d.key]),
  })),
  ...HERO_CIV_DIMS.map(d => ({
    scale: 'world', key: d.slug, hue: d.color, entry: CIV_DOMAIN_COPY[d.slug],
    scaleLabel: 'Your world', mirrorName: selfLabel(MIRROR_OF_CIV[d.slug]),
  })),
].filter(e => e.entry)

function DomainReveal({ open, onClose }) {
  return (
    <div className="domain-reveal" aria-live="polite">
      {/* Resting state — the framing line that already lived under the wheels */}
      <div className={`domain-reveal-layer${open ? '' : ' is-shown'}`} aria-hidden={!!open}>
        <p style={{ ...serif, fontSize: 'clamp(18px,2vw,24px)', fontWeight: 400, color: ink, lineHeight: 1.3, margin: 0, textAlign: 'center' }}>
          <Copy id="home.hero.domains" />
        </p>
      </div>

      {REVEAL_ENTRIES.map(({ scale, key, hue, entry, scaleLabel, mirrorName }) => {
        const isShown = !!open && open.scale === scale && open.key === key
        return (
          <div
            key={`${scale}-${key}`}
            className={`domain-reveal-layer domain-reveal-card${isShown ? ' is-shown' : ''}`}
            aria-hidden={!isShown}
          >
            <div className="domain-reveal-head">
              <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.16em', textTransform: 'uppercase', color: hue }}>
                {entry.title}
              </span>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: inkFaint }}>
                {scaleLabel}
              </span>
              {mirrorName && (
                <span className="domain-reveal-mirror" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: gold }}>
                  Mirrors · {mirrorName}
                </span>
              )}
            </div>
            <p style={{ ...body, fontSize: '15px', lineHeight: 1.65, color: 'rgba(38,36,32,0.82)', margin: '0 0 8px' }}>
              {entry.gloss}
            </p>
            <p style={{ ...body, fontSize: '15px', lineHeight: 1.55, color: gold, margin: 0 }}>
              {entry.question}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="domain-reveal-close"
              tabIndex={isShown ? 0 : -1}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em' }}
            >
              CLOSE
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── The seven, in a sentence each ────────────────────────────
// The wheels answer "what is Spark?" for anyone who clicks. This answers it
// for everyone else — which, on a signed-out front door, is most people. It
// also puts the taxonomy on the page as real text rather than as SVG labels.
function SevenEach() {
  const rows = (items) => items.map(({ key, name, hex, line }) => (
    <div key={key} className="seven-row">
      <span className="seven-dot" style={{ background: hex }} />
      <span>
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: hex, display: 'block', marginBottom: '2px' }}>
          {name}
        </span>
        <span style={{ ...body, fontSize: '14px', lineHeight: 1.55, color: inkFaint, display: 'block' }}>
          {line}
        </span>
      </span>
    </div>
  ))

  return (
    <section style={{
      maxWidth: '1100px',
      margin: '0 auto',
      padding: 'clamp(40px,5vw,64px) clamp(20px,5vw,40px)',
      borderTop: '1px solid rgba(38,36,32,0.10)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 'clamp(28px,3vw,40px)' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.26em', color: gold, display: 'block', marginBottom: '12px' }}>
          <Copy id="home.seven.eyebrow" />
        </span>
        <p style={{ ...serif, fontSize: 'clamp(18px,2vw,22px)', fontWeight: 400, color: ink, lineHeight: 1.4, maxWidth: '620px', margin: '0 auto' }}>
          <Copy id="home.seven.lede" />
        </p>
      </div>
      <div className="seven-cols">
        <div>
          <div className="seven-col-head" style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: gold }}>
            Your life
          </div>
          {rows(SELF_DOMAINS.map(d => ({
            key: d.key, name: d.name, hex: d.hex, line: DOMAIN_COPY[d.key]?.line,
          })))}
        </div>
        <div>
          <div className="seven-col-head" style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: gold }}>
            Your world
          </div>
          {rows(HERO_CIV_DIMS.map(d => ({
            key: d.slug, name: d.label, hex: d.color, line: CIV_DOMAIN_COPY[d.slug]?.line,
          })))}
        </div>
      </div>
    </section>
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

// ── Parallax substrate ───────────────────────────────────────
// An oversized background layer that drifts against scroll to give a band
// depth. The 20% overscan (top -20%, height 140%) is the safety margin the
// drift stays inside, so no edge is ever revealed. Updates batch through
// requestAnimationFrame on a passive listener; prefers-reduced-motion stills
// it to a static, centred layer. The parent section must be position:relative
// with overflow:hidden.
function ParallaxSubstrate({ src, opacity = 0.1, depth = 0.35 }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    let raf = 0
    const update = () => {
      raf = 0
      const parent = el.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      const h = rect.height || 1
      // 0 as the band's top meets the viewport bottom, 1 once it has fully
      // scrolled past the top. Clamped to the visible window.
      const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh + h)))
      // Symmetric drift bounded to depth*h (< the 45% overscan).
      const shift = (0.5 - p) * 2 * depth * h
      el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [depth])
  return (
    <div ref={ref} aria-hidden="true" style={{
      position: 'absolute', left: 0, right: 0, top: '-45%', height: '190%',
      backgroundImage: `url(${src})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      opacity,
      pointerEvents: 'none',
      willChange: 'transform',
    }} />
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

  // Which domain the visitor has open, across both wheels. Held here rather
  // than in either <Wheel> because the two wheels share one reveal slot.
  // { scale: 'self' | 'world', key } — null when nothing is open.
  const [openDomain, setOpenDomain] = useState(null)

  function toggleDomain(scale, key) {
    setOpenDomain(prev => (prev && prev.scale === scale && prev.key === key ? null : { scale, key }))
  }

  useEffect(() => {
    if (!openDomain) return
    function onKey(e) { if (e.key === 'Escape') setOpenDomain(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openDomain])

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

        {/* Visual up front — the fractal wheels open the page, and the labels
            are readable. The framing line is now the reveal slot's resting
            state rather than a separate paragraph under it. */}
        <FractalWheels open={openDomain} onSelect={toggleDomain} />
        <DomainReveal open={openDomain} onClose={() => setOpenDomain(null)} />

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

      {/* ── The seven, in a sentence each ────────── */}
      {/* Directly under the hero, because it is the answer to the question the
          hero has just raised. Anyone who clicked a label already has it;
          this is for everyone who didn't. */}
      <SevenEach />

      {/* ── The Earth Challenge · front door ─────── */}
      <section style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(76,107,69,0.09), transparent 62%), #141B2C',
        padding: 'clamp(40px,5vw,56px) clamp(20px,5vw,40px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* world-map substrate with scroll parallax — same treatment as the
            Align band, lifted a touch because the section navy matches the
            image's own navy */}
        <ParallaxSubstrate src="/hero-civ.jpg" opacity={0.16} />
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
        {/* subtle globe echo behind text, drifting on scroll */}
        <ParallaxSubstrate src="/hero-civ.jpg" opacity={0.07} />
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
          align-items: stretch;
          justify-content: center;
          gap: clamp(8px,2.5vw,32px);
          margin-top: clamp(28px,3.5vw,44px);
        }
        /* Grid rather than flex-column: the two wheels are different sizes
           (170 / 206), so a shared bottom row is what keeps YOUR LIFE and
           YOUR WORLD sitting on one baseline. */
        .fractal-wheel {
          display: grid;
          grid-template-rows: 1fr auto;
          align-items: center;
          justify-items: center;
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
          align-self: center;
          margin-bottom: 28px;
        }
        /* Slow alternating emphasis — one breath, ~14s */
        @media (prefers-reduced-motion: no-preference) {
          .fractal-wheel--self  { animation: fractalBreathA 14s ease-in-out infinite; }
          .fractal-wheel--world { animation: fractalBreathB 14s ease-in-out infinite; }
          /* The breath is ambience for a decorative wheel. The moment someone
             has a domain open they are reading it, and a wheel that fades to
             45% under them is just a wheel that's hard to read. */
          .fractal-wheels.is-engaged .fractal-wheel {
            animation: none;
            opacity: 1;
          }
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

        /* ── Domain reveal slot ──────────────────── */
        /* One slot, both wheels. Every layer occupies the same single grid
           cell, so the slot is always exactly as tall as its tallest child and
           opening a domain cannot move anything below it. No reserved
           min-height to guess, and none to keep in sync when copy changes. */
        .domain-reveal {
          max-width: 620px;
          margin: clamp(14px,2vw,22px) auto 0;
          display: grid;
          padding: 0 8px;
        }
        .domain-reveal-layer {
          grid-area: 1 / 1;
          align-self: center;
          visibility: hidden;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .domain-reveal-layer.is-shown {
          visibility: visible;
          opacity: 1;
        }
        @media (prefers-reduced-motion: reduce) {
          .domain-reveal-layer { transition: none; }
        }
        .domain-reveal-card { text-align: left; }
        .domain-reveal-head {
          display: flex;
          align-items: baseline;
          gap: 10px;
          flex-wrap: wrap;
          padding-bottom: 8px;
          margin-bottom: 10px;
          border-bottom: 1px solid rgba(38,36,32,0.11);
        }
        .domain-reveal-mirror { margin-left: auto; }
        .domain-reveal-close {
          background: none;
          border: none;
          padding: 0;
          margin-top: 10px;
          cursor: pointer;
          color: rgba(38,36,32,0.68);
          transition: color 0.15s;
        }
        .domain-reveal-close:hover { color: #262420; }

        /* ── The seven, in a sentence each ───────── */
        .seven-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(28px,5vw,64px);
        }
        .seven-col-head {
          padding-bottom: 10px;
          margin-bottom: 14px;
          border-bottom: 1px solid rgba(76,107,69,0.30);
        }
        .seven-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 9px 0;
          border-bottom: 1px solid rgba(38,36,32,0.11);
        }
        .seven-row:last-child { border-bottom: none; }
        .seven-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 7px;
        }
        @media (max-width: 720px) {
          .seven-cols { grid-template-columns: 1fr; gap: 32px; }
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
