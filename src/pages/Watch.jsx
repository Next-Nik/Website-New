import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { supabase } from '../hooks/useSupabase'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }

// ─────────────────────────────────────────────────────────────
// /watch — the observer affordance
// ─────────────────────────────────────────────────────────────
// This page exists because the hospitality brief is a lie if
// "watching" is not a first-class way to engage with NextUs.
//
// The whole rest of the site assumes intent to act. This page
// assumes the opposite: you are not here to do anything. You
// are here to see what this is, at the pace that suits you,
// with nothing asked of you.
//
// Design rules:
//   - No CTAs that demand action. Links are permitted, but
//     framed as "if you want to look closer" — never "start,"
//     "begin," "take," "do."
//   - What's shown is real. A curated handful of things the
//     platform is actually doing. No placeholder counts, no
//     fake metrics. If the data isn't there yet, it says so.
//   - Empty states are honest and welcoming, not apologetic.
//     "Unmapped. The first person to claim it gets to write
//     what it becomes." That's both true and generous.
//   - The page is a porch. Sit as long as you like.

// The seven civilisational domains, rendered as "territories you could
// wander into." These are static (not a DB query) because they're the
// conceptual spine of the whole project — they exist whether or not the
// actor base around them does yet.
const DOMAINS = [
  { slug: 'human-being',     name: 'Human Being',       short: 'What each person needs to develop as themselves.' },
  { slug: 'society',         name: 'Society',            short: 'How we live together.' },
  { slug: 'nature',          name: 'Nature',             short: 'The living world and our place inside it.' },
  { slug: 'technology',      name: 'Technology',         short: 'What we build, and whether it remembers what it is for.' },
  { slug: 'finance-economy', name: 'Finance & Economy',  short: 'How value moves — what gets rewarded, what gets abandoned.' },
  { slug: 'legacy',          name: 'Legacy',             short: 'What we leave for those who come after us.' },
  { slug: 'vision',          name: 'Vision',             short: 'Where we are going. Collective imagination, shared direction.' },
]

const PODCAST_FALLBACK = [
  { title: 'The NextUs Podcast', desc: 'Conversations with people building the future, across every domain.', href: '/podcast' },
]

export function WatchPage() {
  const [actorCount, setActorCount] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      // Pull a real actor count — if the query fails or returns nothing,
      // we just don't show a number. Honest over impressive.
      const { count } = await supabase
        .from('nextus_actors')
        .select('id', { count: 'exact', head: true })
        .or('seeded_by.eq.nextus,vetting_status.eq.approved')

      if (!cancelled) {
        setActorCount(typeof count === 'number' ? count : null)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="home" />

      <style>{`
        @media (max-width: 640px) {
          .watch-wrap { padding-left: 24px !important; padding-right: 24px !important; }
          .watch-focuses { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ─────────────────────────────────────────────────
          Hero — a porch, not a pitch.
          The greeting is "you don't have to do anything."
      ───────────────────────────────────────────────── */}
      <div className="watch-wrap" style={{
        maxWidth: '780px',
        margin: '0 auto',
        padding: 'clamp(88px, 10vw, 112px) 40px 48px',
      }}>
        <span style={{ ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '18px' }}>
          Just watching
        </span>
        <h1 style={{
          ...serif,
          fontSize: 'clamp(34px, 4.5vw, 52px)',
          fontWeight: 300,
          color: '#0F1523',
          lineHeight: 1.14,
          letterSpacing: '-0.01em',
          marginBottom: '20px',
        }}>
          You don't have to do anything here.
        </h1>
        <p style={{
          ...body,
          fontSize: '19px',
          fontWeight: 300,
          color: 'rgba(15,21,35,0.8)',
          lineHeight: 1.75,
          marginBottom: '14px',
          maxWidth: '580px',
        }}>
          Some people arrive ready to work on something. Some arrive to look around first. Both are welcome.
        </p>
        <p style={{
          ...body,
          fontSize: '17px',
          fontWeight: 300,
          color: 'rgba(15,21,35,0.6)',
          lineHeight: 1.75,
          maxWidth: '580px',
        }}>
          A small, honest selection of what's happening — so you can get a feel for the place at your own pace. Come back when something pulls.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────
          Territories to wander into
          The seven civilisational domains, rendered from
          static data. They exist whether or not the actor
          base around them does yet — they're the spine.
      ───────────────────────────────────────────────── */}
      <div className="watch-wrap" style={{
        maxWidth: '780px',
        margin: '0 auto',
        padding: '32px 40px 40px',
        borderTop: '1px solid rgba(200,146,42,0.18)',
      }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '14px' }}>
          Territories you could wander into
        </span>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '28px', maxWidth: '560px' }}>
          Seven domains cover the full terrain of civilisational work. Follow one for a while. See what's there.
        </p>

        <div className="watch-focuses" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
        }}>
          {DOMAINS.map(d => (
            <Link
              key={d.slug}
              to={`/domain/${d.slug}`}
              style={{
                display: 'block',
                padding: '22px 24px',
                border: '1px solid rgba(200,146,42,0.22)',
                borderRadius: '14px',
                background: 'rgba(200,146,42,0.03)',
                textDecoration: 'none',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)'
                e.currentTarget.style.background   = 'rgba(200,146,42,0.07)'
                e.currentTarget.style.transform    = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(200,146,42,0.22)'
                e.currentTarget.style.background   = 'rgba(200,146,42,0.03)'
                e.currentTarget.style.transform    = ''
              }}
            >
              <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(168,114,26,0.72)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Domain
              </div>
              <div style={{ ...body, fontSize: '19px', fontWeight: 300, color: '#0F1523', marginBottom: '8px', lineHeight: 1.2 }}>
                {d.name}
              </div>
              <div style={{ ...body, fontSize: '14px', fontWeight: 300, color: 'rgba(15,21,35,0.6)', lineHeight: 1.6 }}>
                {d.short}
              </div>
            </Link>
          ))}
        </div>

        {/* A gentle link out to the broader actor browser — not a CTA, just a door left ajar */}
        {actorCount !== null && actorCount > 0 && (
          <p style={{ ...body, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', lineHeight: 1.75, marginTop: '24px', fontStyle: 'italic' }}>
            {actorCount} organisation{actorCount === 1 ? '' : 's'} and practitioner{actorCount === 1 ? '' : 's'} have been placed on the map so far. You can{' '}
            <Link to="/nextus/actors" style={{ color: '#A8721A', fontStyle: 'normal', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)' }}>
              browse who's here
            </Link>{' '}
            if you'd like.
          </p>
        )}
      </div>

      {/* ─────────────────────────────────────────────────
          The podcast — a genuine lurker's door
          If you want to understand NextUs without signing up
          for anything, the podcast is the most generous entry.
      ───────────────────────────────────────────────── */}
      <div className="watch-wrap" style={{
        maxWidth: '780px',
        margin: '0 auto',
        padding: '32px 40px 40px',
        borderTop: '1px solid rgba(200,146,42,0.18)',
      }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '14px' }}>
          Listen in
        </span>
        {PODCAST_FALLBACK.map(p => (
          <div key={p.href} style={{ marginBottom: '16px' }}>
            <div style={{ ...body, fontSize: '19px', fontWeight: 300, color: '#0F1523', marginBottom: '6px' }}>
              {p.title}
            </div>
            <p style={{ ...body, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '10px', maxWidth: '520px' }}>
              {p.desc}
            </p>
            <Link to={p.href} style={{
              ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.14em',
              color: '#A8721A', textDecoration: 'none',
              borderBottom: '1px solid rgba(200,146,42,0.35)',
              paddingBottom: '2px',
            }}>
              Listen →
            </Link>
          </div>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────
          The gentle door home
          If watching becomes wanting, the door is there.
          Not as "take action now" — as "when you're ready."
      ───────────────────────────────────────────────── */}
      <div className="watch-wrap" style={{
        maxWidth: '780px',
        margin: '0 auto',
        padding: '48px 40px 96px',
      }}>
        <div style={{
          padding: '28px 32px',
          background: 'rgba(200,146,42,0.03)',
          border: '1px solid rgba(200,146,42,0.18)',
          borderRadius: '14px',
        }}>
          <p style={{ ...body, fontSize: '17px', fontWeight: 300, fontStyle: 'italic', color: '#0F1523', lineHeight: 1.7, marginBottom: '14px', maxWidth: '520px' }}>
            When something pulls — when you've watched enough and want to try something — the door home is just here.
          </p>
          <Link to="/" style={{
            ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.14em',
            color: '#A8721A', textDecoration: 'none',
            borderBottom: '1px solid rgba(200,146,42,0.35)',
            paddingBottom: '2px',
          }}>
            Go to the front door →
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
