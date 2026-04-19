import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { supabase } from '../hooks/useSupabase'
import { SiteFooter } from '../components/SiteFooter'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

// ── What you can offer ───────────────────────────────────────

const OFFER_TYPES = [
  {
    type: 'Functional',
    desc: 'You build, organise, connect, fund, or operate. A developer, strategist, funder, project manager, community organiser.',
    examples: ['Software development', 'Strategic advice', 'Funding or investment', 'Project management', 'Network and connections'],
  },
  {
    type: 'Expressive',
    desc: 'You make, perform, create, or transmit. An artist, musician, writer, filmmaker, photographer, designer.',
    examples: ['Documentary filmmaking', 'Brand and visual identity', 'Speechwriting', 'Music and sound', 'Photography and visual storytelling'],
  },
  {
    type: 'Relational',
    desc: 'You heal, hold, facilitate, or witness. A therapist, somatic practitioner, facilitator, mediator, community weaver.',
    examples: ['Trauma-informed facilitation', 'Conflict mediation', 'Community building', 'Coaching and mentoring', 'Grief and transition work'],
  },
  {
    type: 'Intellectual',
    desc: 'You research, synthesise, frame, or teach. An academic, philosopher, systems thinker, policy analyst, educator.',
    examples: ['Research and data', 'Systems thinking', 'Policy analysis', 'Curriculum and education', 'Framing and narrative strategy'],
  },
]

// ── What you get ─────────────────────────────────────────────

const WHAT_YOU_GET = [
  {
    title: 'Your offer is discoverable.',
    body: 'Organisations working in your domain can find you based on what you\'re offering — without you having to apply for anything. You put it on the table. The right people find it.',
  },
  {
    title: 'Your contributions are on the record.',
    body: 'Every confirmed contribution is documented and attributed. Not a claim — a record, confirmed by the people you worked with. Permanent. Portable. Yours.',
  },
  {
    title: 'You set the terms.',
    body: 'You decide who can approach you, what you want in return, and whether you\'re open to adjacent enquiries. You can offer freely to anyone or restrict to verified organisations only. You can pause at any time.',
  },
  {
    title: 'You know where you fit.',
    body: 'Purpose Piece maps your contribution archetype to a specific domain and scale. You arrive on the platform already located — knowing the territory where your offer belongs.',
  },
]

// ── Return types ─────────────────────────────────────────────

const RETURN_TYPES = [
  {
    label: 'Volunteer',
    desc: 'No expectation. The contribution is the point.',
  },
  {
    label: 'Acknowledged',
    desc: 'Public attribution on both profiles. Your work is visible.',
  },
  {
    label: 'Paid',
    desc: 'Financial compensation. Negotiated directly with the organisation.',
  },
  {
    label: 'Reciprocal',
    desc: 'You give if they give back into the ecosystem — not necessarily to you. Ecosystem-level generosity.',
  },
]

// ── Questions people have ────────────────────────────────────

const FAQS = [
  {
    q: 'Do I need to complete Purpose Piece first?',
    a: 'No. You can add your offers directly. But Purpose Piece pre-fills your domain and gives your profile its orientation layer — your archetype, your civilisational statement, the specific territory where your offer belongs. It makes the whole thing more coherent.',
  },
  {
    q: 'What if I\'m not an expert — just genuinely willing?',
    a: 'Willingness and availability are legitimate offers. Time is listed as an offer type for exactly this reason. Many organisations need committed people more than they need specialists.',
  },
  {
    q: 'Can I offer in more than one domain?',
    a: 'Yes. Your offer can span multiple domains, or stay deliberately focused. A filmmaker working on climate stories might be in Nature and Legacy simultaneously.',
  },
  {
    q: 'What does "adjacent enquiry" mean?',
    a: 'It means you\'re open to being contacted by organisations whose work is in your domain, even if your offer doesn\'t exactly match what they\'ve posted as a need. It keeps the network porous without forcing unwanted contact.',
  },
  {
    q: 'What is the reciprocal return type?',
    a: 'It means: I\'ll give freely if the organisation is also actively contributing to the ecosystem — not necessarily back to me. It\'s a commitment to the health of the whole rather than a bilateral transaction. A signal of how you want to participate.',
  },
  {
    q: 'Is my profile visible to everyone?',
    a: 'Your active offers are visible to the level you set. "Any aligned org" means publicly discoverable. "Verified only" means only organisations with verified profiles can see your offer. "Invitation only" means you don\'t appear in results — you reach out yourself.',
  },
]

function FAQ({ item }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(200,146,42,0.15)',
        padding: '20px 0',
        cursor: 'pointer',
      }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: dark, lineHeight: 1.4, margin: 0 }}>
          {item.q}
        </p>
        <span style={{ ...sc, fontSize: '18px', color: gold, flexShrink: 0, marginTop: '2px', lineHeight: 1 }}>
          {open ? '−' : '+'}
        </span>
      </div>
      {open && (
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.8, marginTop: '14px', marginBottom: 0, maxWidth: '580px' }}>
          {item.a}
        </p>
      )}
    </div>
  )
}

const DOMAIN_LABEL = {
  'vision': 'Vision', 'nature': 'Nature', 'society': 'Society',
  'technology': 'Technology', 'finance-economy': 'Finance & Economy',
  'legacy': 'Legacy', 'human-being': 'Human Being',
}

const ARCHETYPE_CONTRIBUTION = {
  Architect:  'designing the structural conditions',
  Maker:      "building what doesn't exist yet",
  Connector:  'weaving relationships and networks',
  Catalyst:   "accelerating what's already moving",
  Sage:       'offering wisdom and perspective',
  Mirror:     'reflecting truth back',
  Steward:    'tending and developing what exists',
  Legacy:     'working across generations',
}

export function NextUsContributorsPage() {
  const navigate     = useNavigate()
  const [searchParams] = useSearchParams()

  const ppFrom      = searchParams.get('pp_from')
  const ppArchetype = searchParams.get('pp_archetype')
  const ppDomain    = searchParams.get('pp_domain')
  const ppScale     = searchParams.get('pp_scale')
  const arrivedFromPP = ppFrom === 'purpose-piece'

  const [matches,      setMatches]      = useState([])
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchDone,    setMatchDone]    = useState(false)

  // Fire match engine if arrived from Purpose Piece
  useEffect(() => {
    if (!arrivedFromPP) return
    async function runMatch() {
      setMatchLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.id) { setMatchDone(true); setMatchLoading(false); return }
        const res = await fetch('/api/nextus-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'for_contributor', user_id: user.id }),
        })
        const data = await res.json()
        setMatches(data.matches || [])
      } catch {}
      setMatchLoading(false)
      setMatchDone(true)
    }
    runMatch()
  }, [arrivedFromPP])

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      {/* Arrival banner — shown when coming from Purpose Piece */}
      {arrivedFromPP && (
        <div style={{ background: 'linear-gradient(135deg, rgba(200,146,42,0.08) 0%, rgba(200,146,42,0.03) 100%)', borderBottom: '1px solid rgba(200,146,42,0.18)', padding: '40px 40px 36px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold, marginBottom: '12px' }}>
              YOUR PURPOSE PIECE · PLACED
            </div>
            <h2 style={{ ...body, fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 300, color: dark, lineHeight: 1.2, marginBottom: '10px' }}>
              {ppArchetype
                ? `You're here as a ${ppArchetype}${ppDomain ? ` in ${domainLabel}` : ''}.`
                : "You've arrived with your coordinates."}
            </h2>
            <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '24px', maxWidth: '560px' }}>
              {ppArchetype
                ? `Your instinct is ${archetypeDesc}. The organisations below are working in ${domainLabel} — and some of them need exactly what you carry.`
                : `The organisations below are working in your domain. Some of them have open needs that align with what you carry.`}
            </p>

            {/* Match results */}
            {matchLoading && (
              <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
                Reading the map for you…
              </p>
            )}

            {matchDone && matches.length > 0 && (
              <div>
                <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', marginBottom: '14px' }}>
                  WHO COULD USE YOU
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {matches.slice(0, 4).map(m => (
                    <div
                      key={m.actor_id}
                      onClick={() => navigate(`/nextus/actors/${m.actor_id}`)}
                      style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.20)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '8px', padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}
                      onMouseEnter={e => e.currentTarget.style.borderLeftColor = '#C8922A'}
                      onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'rgba(200,146,42,0.55)'}
                    >
                      <div>
                        <div style={{ ...body, fontSize: '16px', fontWeight: 400, color: dark, marginBottom: '4px' }}>{m.name}</div>
                        {m.best_need?.title && (
                          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold }}>
                            Open need: {m.best_need.title}
                          </div>
                        )}
                        {m.description && (
                          <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, marginTop: '4px' }}>
                            {m.description.length > 120 ? m.description.slice(0, 120) + '…' : m.description}
                          </div>
                        )}
                      </div>
                      <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)', flexShrink: 0 }}>View →</div>
                    </div>
                  ))}
                </div>
                {matches.length > 4 && (
                  <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>
                    + {matches.length - 4} more in your domain
                  </p>
                )}
              </div>
            )}

            {matchDone && matches.length === 0 && (
              <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '8px', padding: '18px 20px' }}>
                <p style={{ ...body, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, margin: '0 0 8px' }}>
                  The map is being populated. You're among the first to arrive in {domainLabel}.
                </p>
                <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', margin: 0 }}>
                  When organisations working here post their needs, you'll be exactly who they find.
                </p>
              </div>
            )}

            {/* Terrain link */}
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => navigate(`/nextus/map${ppDomain ? '?domain=' + ppDomain : ''}`)}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                Explore the {domainLabel} terrain on the map →
              </button>
            </div>
          </div>
        </div>
      )}


      <style>{`
        @media (max-width: 640px) {
          .contrib-main  { padding-left: 24px !important; padding-right: 24px !important; }
          .contrib-grid  { grid-template-columns: 1fr !important; }
          .contrib-dark  { padding-left: 24px !important; padding-right: 24px !important; }
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="contrib-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '112px 40px 80px' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '16px' }}>
          NextUs · Contributors
        </span>
        <h1 style={{ ...body, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: dark, lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '24px' }}>
          You have something<br />
          <em style={{ color: gold }}>the world needs.</em>
        </h1>
        <p style={{ ...body, fontSize: '19px', fontWeight: 300, color: dark, lineHeight: 1.8, marginBottom: '16px', maxWidth: '560px' }}>
          Not just your profession. Your craft, your capacity, your relational depth, your creative work. The full range of what you bring.
        </p>
        <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.60)', lineHeight: 1.75, marginBottom: '48px', maxWidth: '500px' }}>
          NextUs is where that offer meets the organisations who need it — across seven civilisational domains, at every scale.
        </p>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <a
            href="/tools/purpose-piece"
            style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}
          >
            Find your coordinates →
          </a>
          <a
            href="/nextus/actors"
            style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.60)', background: 'transparent', color: gold, ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}
          >
            Browse orgs
          </a>
        </div>
      </section>

      {/* ── Is this for you? ── */}
      <section className="contrib-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '0 40px 80px', borderTop: '1px solid rgba(200,146,42,0.15)' }}>
        <div style={{ paddingTop: '64px' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '16px' }}>
            Is this for you?
          </span>
          <h2 style={{ ...body, fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 300, color: dark, lineHeight: 1.12, marginBottom: '24px' }}>
            You don't need a title.<br />You need a genuine offer.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '40px' }}>
            {[
              'You have skills or expertise that could move something that matters',
              'You\'re a musician, artist, filmmaker, or writer who wants their work to land somewhere real',
              'You do therapeutic, facilitative, or relational work and want to bring it into the field',
              'You have capital or time and want to direct it precisely',
              'You\'ve done Purpose Piece and know your domain — and now you want to act in it',
              'You\'re not sure where you fit but you know you have something',
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid rgba(200,146,42,0.18)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: gold, flexShrink: 0, marginTop: '8px' }} />
                <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.75)', lineHeight: 1.65, margin: 0 }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you can offer ── */}
      <section style={{ background: '#F5F2EC', borderTop: '1px solid rgba(200,146,42,0.15)', borderBottom: '1px solid rgba(200,146,42,0.15)', padding: '72px 0' }}>
        <div className="contrib-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '0 40px' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '16px' }}>
            Four modes of contribution
          </span>
          <h2 style={{ ...body, fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 300, color: dark, lineHeight: 1.12, marginBottom: '16px' }}>
            The full breadth of what moves things forward.
          </h2>
          <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '48px', maxWidth: '540px' }}>
            Civilisational change is not only built by developers and funders. The most powerful contributions are often expressive, relational, or intellectual — work that shifts how people see, feel, and move.
          </p>

          <div className="contrib-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {OFFER_TYPES.map(t => (
              <div key={t.type} style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px', padding: '24px 26px' }}>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '10px' }}>
                  {t.type}
                </span>
                <p style={{ ...body, fontSize: '16px', color: dark, lineHeight: 1.75, marginBottom: '16px' }}>
                  {t.desc}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {t.examples.map(e => (
                    <span key={e} style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)' }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="contrib-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '72px 40px' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '16px' }}>
          What the platform gives you
        </span>
        <h2 style={{ ...body, fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 300, color: dark, lineHeight: 1.12, marginBottom: '48px' }}>
          More than a directory entry.
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {WHAT_YOU_GET.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '28px',
                padding: '28px 0',
                borderBottom: i < WHAT_YOU_GET.length - 1 ? '1px solid rgba(200,146,42,0.12)' : 'none',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: 'rgba(200,146,42,0.45)', flexShrink: 0, minWidth: '24px', paddingTop: '4px' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ maxWidth: '560px' }}>
                <p style={{ ...body, fontSize: '19px', fontWeight: 300, color: dark, marginBottom: '8px', lineHeight: 1.3 }}>
                  {item.title}
                </p>
                <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.62)', lineHeight: 1.8, margin: 0 }}>
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Return types ── */}
      <section style={{ background: '#F5F2EC', borderTop: '1px solid rgba(200,146,42,0.15)', borderBottom: '1px solid rgba(200,146,42,0.15)', padding: '72px 0' }}>
        <div className="contrib-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '0 40px' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '16px' }}>
            You set the terms
          </span>
          <h2 style={{ ...body, fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 300, color: dark, lineHeight: 1.12, marginBottom: '16px' }}>
            What are you looking for in return?
          </h2>
          <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.60)', lineHeight: 1.75, marginBottom: '40px', maxWidth: '520px' }}>
            You choose. Nothing is assumed. Each offer carries its own terms, and you can have multiple offers with different return types.
          </p>

          <div className="contrib-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {RETURN_TYPES.map(r => (
              <div key={r.label} style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '12px', padding: '20px 22px' }}>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, display: 'block', marginBottom: '8px' }}>
                  {r.label}
                </span>
                <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, margin: 0 }}>
                  {r.desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '32px', paddingTop: '28px', borderTop: '1px solid rgba(200,146,42,0.15)', maxWidth: '520px' }}>
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.75, margin: 0 }}>
              The Reciprocal option is philosophically distinct. It means: I give freely to the ecosystem when the organisation is also giving back into it — not necessarily to me. It encodes the Honorable Harvest ethic structurally. Take only what you need. Give back more than you take.
            </p>
          </div>
        </div>
      </section>

      {/* ── How to start ── */}
      <section className="contrib-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '72px 40px' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '16px' }}>
          How to start
        </span>
        <h2 style={{ ...body, fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 300, color: dark, lineHeight: 1.12, marginBottom: '48px' }}>
          Three steps. No friction.
        </h2>

        {[
          {
            n: '01',
            title: 'Find your coordinates',
            body: 'Purpose Piece maps your contribution archetype to a specific domain and scale. Takes about fifteen minutes. Your coordinates seed your contributor profile automatically — you arrive on the map already located.',
            cta: 'Begin Purpose Piece',
            url: '/tools/purpose-piece',
            primary: true,
          },
          {
            n: '02',
            title: 'Put your offer on the table',
            body: 'Name what you\'re offering. Choose your type, your mode, your domain, your terms. One offer is enough to start. Add more when you\'re ready. You can pause or remove any offer at any time.',
            cta: 'Go to your profile',
            url: '/dashboard',
            primary: false,
          },
          {
            n: '03',
            title: 'Let the platform work',
            body: 'Orgs whose needs align with your offer will find you. Or browse the directory yourself — the platform filters to your domain automatically. Either direction can start something.',
            cta: 'Browse orgs',
            url: '/nextus/actors',
            primary: false,
          },
        ].map((step, i) => (
          <div
            key={step.n}
            style={{
              display: 'flex',
              gap: '28px',
              padding: '28px 0',
              borderBottom: i < 2 ? '1px solid rgba(200,146,42,0.12)' : 'none',
              alignItems: 'flex-start',
            }}
          >
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, flexShrink: 0, minWidth: '28px', paddingTop: '4px' }}>
              {step.n}
            </span>
            <div style={{ flex: 1, maxWidth: '560px' }}>
              <p style={{ ...body, fontSize: '20px', fontWeight: 300, color: dark, marginBottom: '8px', lineHeight: 1.2 }}>
                {step.title}
              </p>
              <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.62)', lineHeight: 1.8, marginBottom: '20px' }}>
                {step.body}
              </p>
              <a
                href={step.url}
                style={{
                  ...sc,
                  fontSize: '14px',
                  letterSpacing: '0.14em',
                  padding: '11px 24px',
                  borderRadius: '40px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  border: step.primary ? 'none' : '1.5px solid rgba(200,146,42,0.60)',
                  background: step.primary ? '#C8922A' : 'transparent',
                  color: step.primary ? '#FFFFFF' : gold,
                }}
              >
                {step.cta} →
              </a>
            </div>
          </div>
        ))}
      </section>

      {/* ── FAQ ── */}
      <section style={{ background: '#F5F2EC', borderTop: '1px solid rgba(200,146,42,0.15)', padding: '72px 0' }}>
        <div className="contrib-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '0 40px' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '16px' }}>
            Questions
          </span>
          <h2 style={{ ...body, fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 300, color: dark, lineHeight: 1.12, marginBottom: '40px' }}>
            Things people ask.
          </h2>
          <div style={{ maxWidth: '640px' }}>
            {FAQS.map(item => (
              <FAQ key={item.q} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Dark CTA ── */}
      <section className="contrib-dark" style={{ background: dark, borderTop: '1.5px solid rgba(200,146,42,0.78)', padding: '96px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.4, margin: '0 auto 40px' }} />
          <h2 style={{ ...body, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, color: 'rgba(255,255,255,0.92)', lineHeight: 1.1, marginBottom: '16px' }}>
            Your offer belongs somewhere.
          </h2>
          <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, marginBottom: '48px' }}>
            Find out where. Purpose Piece maps your contribution archetype to a specific domain and scale. It takes fifteen minutes and it changes how you see what you have to give.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/tools/purpose-piece"
              style={{ ...sc, fontSize: '16px', letterSpacing: '0.16em', padding: '16px 36px', borderRadius: '40px', border: 'none', background: '#C8922A', color: '#FFFFFF', textDecoration: 'none', display: 'inline-block' }}
            >
              Find your coordinates →
            </a>
            <a
              href="/nextus"
              style={{ ...sc, fontSize: '16px', letterSpacing: '0.16em', padding: '16px 36px', borderRadius: '40px', border: '1px solid rgba(200,146,42,0.40)', background: 'transparent', color: 'rgba(255,255,255,0.70)', textDecoration: 'none', display: 'inline-block' }}
            >
              Learn about NextUs
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
