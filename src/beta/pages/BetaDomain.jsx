import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { supabase } from '../../hooks/useSupabase'

// Module 1.5 primitives — the contract requires native use.
import HorizonFloorCard from '../components/HorizonFloorCard'
import PrincipleStrip from '../components/PrincipleStrip'

// Module 11 — data sourcing layer.
import IndicatorCard from '../components/IndicatorCard'
import IndicatorTable from '../components/IndicatorTable'
import ContributorSignalsList from '../components/ContributorSignalsList'
import {
  useDomainIndicators,
  countContributorSignals,
} from '../hooks/useDomainIndicators'

// ─────────────────────────────────────────────────────────────────────────────
// /beta/domain/:slug
//
// Civilisational domain page. Render order per Module 11 brief:
//
//   1. Hero — domain name
//   2. HorizonFloorCard — Goal forward-only with explainer / floor
//   3. Fractal premise — mirror to the Self-domain twin
//   4. PrincipleStrip — the four cross-domain principles applied here
//   5. "The territory, measured" — 3-5 IndicatorCards (headline cluster)
//   6. "Who is placed here" — actor grid filtered to this domain
//   7. "Practices in this domain" — link out to Module 12
//   8. Ways in
//
// Graceful degradation: when no indicators have any populated values, the
// "territory, measured" section does not appear. Vision and Legacy are
// Tier 3-heavy — when those have zero contributor signals, the section
// renders the "still being measured" prompt instead of the cards.
// ─────────────────────────────────────────────────────────────────────────────

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

const DOMAIN_LABELS = {
  'human-being':     'Human Being',
  'society':         'Society',
  'nature':          'Nature',
  'technology':      'Technology',
  'finance-economy': 'Finance & Economy',
  'legacy':          'Legacy',
  'vision':          'Vision',
}

// Self-domain mirror per Domain Structure: Body → Nature, Connection →
// Society, Finances → Finance & Economy, Inner Game → Legacy, Signal →
// Technology, Path → Vision, Spark → Human Being.
const FRACTAL_MIRROR = {
  'human-being':     { selfDomain: 'Spark',      sentence: 'At personal scale this domain mirrors Spark, the inner aliveness, vitality, and creative pulse of a single life.' },
  'society':         { selfDomain: 'Connection', sentence: 'At personal scale this domain mirrors Connection, the relationships and belonging that hold a single life.' },
  'nature':          { selfDomain: 'Body',       sentence: 'At personal scale this domain mirrors Body, the living substrate that carries a single life.' },
  'technology':      { selfDomain: 'Signal',     sentence: 'At personal scale this domain mirrors Signal, the tools, attention, and information environments a single life navigates.' },
  'finance-economy': { selfDomain: 'Finances',   sentence: 'At personal scale this domain mirrors Finances, how a single life sustains itself materially and where its resources flow.' },
  'legacy':          { selfDomain: 'Inner Game', sentence: 'At personal scale this domain mirrors Inner Game, what one life is healing, integrating, and transmitting forward.' },
  'vision':          { selfDomain: 'Path',       sentence: 'At personal scale this domain mirrors Path, the direction one life is moving across the long arc.' },
}

const ALL_FOUR_PRINCIPLES = [
  'indigenous-relational',
  'substrate-health',
  'not-knowing-stance',
  'legacy-temporal-dimension',
]

// Tier 3-heavy domains per the data sourcing doc Section 5.5.
const TIER_3_HEAVY = new Set(['vision', 'legacy'])

export default function BetaDomain() {
  const { slug } = useParams()
  const focusId = null // route does not currently carry a Focus param

  const [actorCount, setActorCount] = useState(null)
  const [signalCount, setSignalCount] = useState(null)

  const { headlines, loading: indicatorsLoading } = useDomainIndicators(slug, focusId)

  // Actor count — used for the section header and the empty state.
  useEffect(() => {
    let cancelled = false
    if (!slug) return
    supabase
      .from('nextus_actors')
      .select('id', { count: 'exact', head: true })
      .contains('domains', [slug])
      .then(({ count }) => {
        if (!cancelled) setActorCount(typeof count === 'number' ? count : 0)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  // Contributor signal count — used by the section header.
  useEffect(() => {
    let cancelled = false
    if (!slug) return
    countContributorSignals(slug, focusId).then((n) => {
      if (!cancelled) setSignalCount(n)
    })
    return () => {
      cancelled = true
    }
  }, [slug, focusId])

  const domainLabel = DOMAIN_LABELS[slug]
  const mirror = FRACTAL_MIRROR[slug]

  if (!domainLabel) {
    return (
      <PageShell>
        <p
          style={{
            ...body,
            fontSize: '17px',
            color: '#0F1523',
            margin: 0,
          }}
        >
          Unknown domain.
        </p>
      </PageShell>
    )
  }

  // The "territory, measured" section appears only when at least one
  // headline indicator carries a value, OR when this is a Tier 3-heavy
  // domain and contributor signals exist (or the prompt should render).
  const hasAnyValue = headlines.some((h) => h.value)
  const tier3Heavy = TIER_3_HEAVY.has(slug)
  const showTerritorySection =
    !indicatorsLoading &&
    (hasAnyValue || (tier3Heavy && signalCount !== null))

  return (
    <PageShell>
      {/* 1. Hero */}
      <Hero label={domainLabel} />

      {/* 2. Horizon Floor */}
      <Section>
        <HorizonFloorCard domainSlug={slug} variant="full" />
      </Section>

      {/* 3. Fractal premise */}
      {mirror && (
        <Section>
          <FractalPremise mirror={mirror} />
        </Section>
      )}

      {/* 4. Principle strip */}
      <Section>
        <span
          style={{
            ...sc,
            display: 'block',
            fontSize: '12px',
            letterSpacing: '0.08em',
            color: '#A8721A',
            fontWeight: 600,
            marginBottom: '10px',
          }}
        >
          Cross-domain principles, applied here
        </span>
        <PrincipleStrip slugs={ALL_FOUR_PRINCIPLES} max={4} size="md" />
      </Section>

      {/* 5. The territory, measured */}
      {showTerritorySection && (
        <Section>
          <SectionHeader
            eyebrow="The territory, measured"
            title={`What is happening in ${domainLabel} right now`}
          />
          {hasAnyValue ? (
            <>
              <CardGrid>
                {headlines.map((ind) => (
                  <IndicatorCard key={ind.id} indicator={ind} />
                ))}
              </CardGrid>
              <IndicatorTable domainSlug={slug} focusId={focusId} />
              <ContributorSignalsList
                domainSlug={slug}
                focusId={focusId}
                initialCount={signalCount}
                tier3Heavy={tier3Heavy}
              />
            </>
          ) : (
            // Tier 3-heavy with no contributions: render the prompt.
            <ContributorSignalsList
              domainSlug={slug}
              focusId={focusId}
              initialCount={signalCount}
              tier3Heavy={tier3Heavy}
            />
          )}
        </Section>
      )}

      {/* 6. Who is placed here */}
      <Section>
        <SectionHeader
          eyebrow="Who is placed here"
          title={
            actorCount == null
              ? 'Actors in this domain'
              : actorCount === 0
              ? 'Actors in this domain'
              : `${actorCount} actor${actorCount === 1 ? '' : 's'} in this domain`
          }
        />
        <DomainActorGrid domainSlug={slug} count={actorCount} />
      </Section>

      {/* 7. Practices in this domain */}
      <Section>
        <SectionHeader
          eyebrow="Practices in this domain"
          title="What people are doing"
        />
        <p
          style={{
            ...body,
            fontSize: '16px',
            lineHeight: 1.55,
            color: '#0F1523',
            margin: '0 0 12px',
          }}
        >
          Practices are the small, repeatable things people are doing inside
          this domain. They are not promises. They are the moves themselves.
        </p>
        <a
          href={`/beta/practices?domain=${slug}`}
          style={{
            ...sc,
            display: 'inline-block',
            background: 'transparent',
            border: '1px solid rgba(200, 146, 42, 0.45)',
            borderRadius: '40px',
            padding: '8px 18px',
            fontSize: '14px',
            letterSpacing: '0.04em',
            fontWeight: 600,
            color: '#A8721A',
            textDecoration: 'none',
          }}
        >
          See practices in {domainLabel} →
        </a>
      </Section>

      {/* 8. Ways in */}
      <Section last>
        <SectionHeader eyebrow="Ways in" title="Where to begin" />
        <WaysInGrid domainSlug={slug} />
      </Section>
    </PageShell>
  )
}

// ── Page chrome ──────────────────────────────────────────────────────────────

function PageShell({ children }) {
  return (
    <>
      <Nav />
      <main
        style={{
          background: '#FAFAF7',
          minHeight: '100vh',
          paddingTop: '32px',
          paddingBottom: '64px',
        }}
      >
        <div
          style={{
            maxWidth: '880px',
            margin: '0 auto',
            padding: '0 20px',
          }}
        >
          {children}
        </div>
      </main>
    </>
  )
}

function Hero({ label }) {
  return (
    <header style={{ marginBottom: '32px' }}>
      <span
        style={{
          ...sc,
          display: 'block',
          fontSize: '13px',
          letterSpacing: '0.08em',
          color: '#A8721A',
          fontWeight: 600,
          marginBottom: '8px',
        }}
      >
        Civilisational domain
      </span>
      <h1
        style={{
          ...display,
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 300,
          lineHeight: 1.1,
          color: '#0F1523',
          margin: 0,
        }}
      >
        {label}
      </h1>
    </header>
  )
}

function Section({ children, last = false }) {
  return (
    <section
      style={{
        marginBottom: last ? '0' : '40px',
        paddingBottom: last ? '0' : '32px',
        borderBottom: last ? 'none' : '1px solid rgba(200, 146, 42, 0.20)',
      }}
    >
      {children}
    </section>
  )
}

function SectionHeader({ eyebrow, title }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <span
        style={{
          ...sc,
          display: 'block',
          fontSize: '12px',
          letterSpacing: '0.08em',
          color: '#A8721A',
          fontWeight: 600,
          marginBottom: '6px',
        }}
      >
        {eyebrow}
      </span>
      <h2
        style={{
          ...display,
          fontSize: 'clamp(22px, 3vw, 30px)',
          fontWeight: 300,
          lineHeight: 1.2,
          color: '#0F1523',
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  )
}

function FractalPremise({ mirror }) {
  return (
    <div>
      <span
        style={{
          ...sc,
          display: 'block',
          fontSize: '12px',
          letterSpacing: '0.08em',
          color: '#A8721A',
          fontWeight: 600,
          marginBottom: '10px',
        }}
      >
        The same domain, at personal scale
      </span>
      <p
        style={{
          ...body,
          fontSize: '18px',
          lineHeight: 1.6,
          color: '#0F1523',
          margin: 0,
        }}
      >
        {mirror.sentence}
      </p>
    </div>
  )
}

function CardGrid({ children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '8px',
      }}
    >
      {children}
    </div>
  )
}

// ── DomainActorGrid (lightweight; full component lives elsewhere) ────────────

function DomainActorGrid({ domainSlug, count }) {
  const [actors, setActors] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!domainSlug) return
    setLoading(true)
    supabase
      .from('nextus_actors')
      .select('id, name, slug, headline, domains')
      .contains('domains', [domainSlug])
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (cancelled) return
        setActors(data || [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [domainSlug])

  if (loading) {
    return (
      <p style={{ ...body, fontSize: '14px', color: 'rgba(15, 21, 35, 0.55)', margin: 0 }}>
        Loading actors.
      </p>
    )
  }
  if (!actors || actors.length === 0) {
    return (
      <p
        style={{
          ...body,
          fontSize: '15px',
          lineHeight: 1.55,
          color: 'rgba(15, 21, 35, 0.72)',
          margin: 0,
        }}
      >
        Nothing is placed in this domain yet. That is honest, not
        discouraging.{' '}
        <a
          href="/beta/nominate"
          style={{
            color: '#A8721A',
            textDecoration: 'underline',
            textDecorationColor: 'rgba(200, 146, 42, 0.45)',
            textUnderlineOffset: '3px',
          }}
        >
          Nominate an actor
        </a>
        .
      </p>
    )
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '12px',
        }}
      >
        {actors.map((a) => (
          <a
            key={a.id}
            href={`/nextus/actors/${a.slug || a.id}`}
            style={{
              display: 'block',
              background: '#FFFFFF',
              border: '1px solid rgba(200, 146, 42, 0.20)',
              borderRadius: '14px',
              padding: '14px 16px',
              textDecoration: 'none',
              color: '#0F1523',
            }}
          >
            <span
              style={{
                ...display,
                display: 'block',
                fontSize: '18px',
                fontWeight: 400,
                lineHeight: 1.25,
                marginBottom: '4px',
              }}
            >
              {a.name}
            </span>
            {a.headline && (
              <span
                style={{
                  ...body,
                  display: 'block',
                  fontSize: '14px',
                  lineHeight: 1.45,
                  color: 'rgba(15, 21, 35, 0.72)',
                }}
              >
                {a.headline}
              </span>
            )}
          </a>
        ))}
      </div>
      {count != null && count > actors.length && (
        <p style={{ marginTop: '16px' }}>
          <a
            href={`/nextus/actors?domain=${domainSlug}`}
            style={{
              ...sc,
              fontSize: '13px',
              letterSpacing: '0.08em',
              color: '#A8721A',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            See all {count} actors in this domain →
          </a>
        </p>
      )}
    </>
  )
}

// ── Ways in ──────────────────────────────────────────────────────────────────

function WaysInGrid({ domainSlug }) {
  const ways = [
    {
      label: 'Nominate an actor',
      blurb: 'Know an organisation working in this domain? Add them to the Atlas.',
      href: '/beta/nominate',
    },
    {
      label: 'Submit a practice',
      blurb: 'Share a small, repeatable thing you are doing inside this domain.',
      href: `/beta/practices/new?domain=${domainSlug}`,
    },
    {
      label: 'Contribute a signal',
      blurb: 'Submit an observation, scenario, story, or measurement from this territory.',
      href: `/beta/signals/new?domain=${domainSlug}`,
    },
    {
      label: 'Place yourself',
      blurb: 'Mark this domain as one you engage with on your contributor profile.',
      href: '/beta/profile/edit',
    },
  ]
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '12px',
      }}
    >
      {ways.map((way) => (
        <a
          key={way.label}
          href={way.href}
          style={{
            display: 'block',
            background: '#FFFFFF',
            border: '1px solid rgba(200, 146, 42, 0.20)',
            borderRadius: '14px',
            padding: '16px 18px',
            textDecoration: 'none',
            color: '#0F1523',
          }}
        >
          <span
            style={{
              ...sc,
              display: 'block',
              fontSize: '13px',
              letterSpacing: '0.06em',
              color: '#A8721A',
              fontWeight: 600,
              marginBottom: '6px',
            }}
          >
            {way.label}
          </span>
          <span
            style={{
              ...body,
              display: 'block',
              fontSize: '14px',
              lineHeight: 1.5,
              color: 'rgba(15, 21, 35, 0.72)',
            }}
          >
            {way.blurb}
          </span>
        </a>
      ))}
    </div>
  )
}
