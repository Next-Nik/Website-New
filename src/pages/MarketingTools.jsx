// ─────────────────────────────────────────────────────────────
// MarketingTools — signed-out /tools page
//
// Horizon Suite toolkit presented in the hospitable outer register:
// benefit-led, one-line promise per tool, featured Map preview.
// All tool links route through auth.
// ─────────────────────────────────────────────────────────────

import { Nav }        from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { serif, body, sc } from '../lib/designTokens'

const gold    = '#26302A'
const goldBdr = 'rgba(110,127,92,0.78)'
const ink     = '#0F1523'
const inkDim  = 'rgba(15,21,35,0.55)'

// ── Tool definitions ─────────────────────────────────────────
const TOOLS = [
  {
    id: 'nextsteps',
    name: 'NextSteps',
    promise: 'FEELING STUCK? START HERE.',
    desc: 'Get personalised guidance on what to focus on next based on where you are right now.',
    href: '/login?path=self',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
  {
    id: 'horizon-state',
    name: 'Horizon State',
    promise: 'CALM YOUR NERVOUS SYSTEM IN 20 MINUTES.',
    desc: 'A guided daily audio practice backed by neuroscience to help you feel grounded, focused, and emotionally steady.',
    href: '/login?path=self',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 L14.5 8 L21 8 L16 12.5 L18 19 L12 15 L6 19 L8 12.5 L3 8 L9.5 8 Z"/>
      </svg>
    ),
  },
  {
    id: 'the-map',
    name: 'The Map',
    promise: 'SEE WHAT\'S WORKING — AND WHAT NEEDS ATTENTION.',
    desc: 'Assess the seven core areas of your life and create a clearer path forward.',
    href: '/login?path=self',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8 2 4 6 4 12s8 10 8 10 8-4 8-10S16 2 12 2Z"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
  {
    id: 'purpose-piece',
    name: 'Purpose Piece',
    promise: 'YOUR ROLE, YOUR DOMAIN, YOUR SCALE.',
    desc: 'Your life\'s purpose impacts how you show up in the world. Find the work you\'re built for.',
    href: '/login?path=self',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="4.5" strokeDasharray="2 2"/>
      </svg>
    ),
  },
  {
    id: 'target-stretch',
    name: 'Target Stretch',
    promise: 'A FOCUSED PLAN. REAL RESULTS.',
    desc: 'Ninety days to a new chapter. Set clear goals and level up.',
    href: '/login?path=self',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17 Q8 8 12 6 Q16 4 19 7"/>
        <circle cx="19" cy="7" r="1.5" fill="currentColor" stroke="none"/>
        <path d="M5 17 L5 20 M9 15 L9 20 M13 14 L13 20"/>
      </svg>
    ),
  },
  {
    id: 'horizon-practice',
    name: 'Horizon Practice',
    promise: 'BUILD BETTER HABITS, ONE DAY AT A TIME.',
    desc: 'Your daily skill development.',
    href: '/login?path=self',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12 Q7 4 12 4 Q17 4 21 12 Q17 20 12 20 Q7 20 3 12"/>
        <path d="M8 12 Q10 9 12 9 Q14 9 16 12"/>
      </svg>
    ),
  },
]

// ── Seven domains for the featured wheel preview ─────────────
const DOMAINS = [
  { label: 'Path',        angle: 270 },
  { label: 'Spark',       angle: 321 },
  { label: 'Body',        angle: 13  },
  { label: 'Finances',    angle: 64  },
  { label: 'Connection',  angle: 115 },
  { label: 'Inner Game',  angle: 167 },
  { label: 'Signal',      angle: 218 },
]

const RAD  = (deg) => (deg * Math.PI) / 180
const CX   = 140
const CY   = 140
const R    = 90
const DOT  = 4

function WheelPreview() {
  const pts = DOMAINS.map(d => ({
    x: CX + R * Math.cos(RAD(d.angle)),
    y: CY + R * Math.sin(RAD(d.angle)),
    label: d.label,
    angle: d.angle,
  }))

  const polygon = pts.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg width="280" height="280" viewBox="0 0 280 280" aria-hidden="true">
      {/* spokes */}
      {pts.map((p, i) => (
        <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke="rgba(110,127,92,0.18)" strokeWidth="1" />
      ))}
      {/* filled polygon */}
      <polygon points={polygon}
        fill="rgba(38,48,42,0.08)"
        stroke="rgba(38,48,42,0.5)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={DOT}
          fill="#26302A" opacity="0.8" />
      ))}
      {/* centre */}
      <circle cx={CX} cy={CY} r="5" fill="rgba(38,48,42,0.3)" stroke="#26302A" strokeWidth="1" />
      {/* labels */}
      {pts.map((p, i) => {
        const lx = CX + (R + 22) * Math.cos(RAD(p.angle))
        const ly = CY + (R + 22) * Math.sin(RAD(p.angle))
        return (
          <text key={i} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.08em' }}
            fill="rgba(15,21,35,0.55)"
          >
            {p.label}
          </text>
        )
      })}
    </svg>
  )
}

// ── Tool card ───────────────────────────────────────────────
function ToolCard({ tool }) {
  return (
    <div
      className="mt-card"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(110,127,92,0.10)',
        borderRadius: '12px',
        padding: 'clamp(24px,3vw,32px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ color: gold, opacity: 0.8 }}>{tool.icon}</div>
      <div style={{ ...sc, fontSize: '18px', letterSpacing: '0.06em', color: ink }}>
        {tool.name}
      </div>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: gold }}>
        {tool.promise}
      </div>
      <p style={{ ...body, fontSize: '14px', lineHeight: 1.7, color: 'rgba(15,21,35,0.65)', flex: 1, margin: 0 }}>
        {tool.desc}
      </p>
      <a
        href={tool.href}
        style={{
          ...sc, fontSize: '13px', letterSpacing: '0.16em',
          color: gold, textDecoration: 'none',
          marginTop: '6px',
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#8A5C15' }}
        onMouseLeave={e => { e.currentTarget.style.color = gold }}
      >
        EXPLORE →
      </a>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────
export function MarketingToolsPage() {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100dvh' }}>
      <Nav activePath="tools" />

      {/* ── Hero ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: '480px',
        overflow: 'hidden',
      }} className="mt-hero">
        {/* Left: copy */}
        <div style={{
          padding: 'clamp(100px,11vw,130px) clamp(20px,5vw,80px) clamp(60px,7vw,80px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold, marginBottom: '20px', display: 'block' }}>
            HORIZON SUITE
          </span>
          <h1 style={{ ...serif, fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 400, color: ink, lineHeight: 1.12, marginBottom: '20px' }}>
            The tools you need.<br />The life you're here to live.
          </h1>
          <p style={{ ...body, fontSize: '16px', lineHeight: 1.8, color: inkDim, maxWidth: '400px', marginBottom: '32px' }}>
            Evidence-based tools and daily practices to help you feel better, make progress, and create a life that actually fits you.
          </p>
          <a
            href="/login?path=self"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '14px 32px', borderRadius: '40px',
              background: '#6E7F5C',
              border: `1.5px solid ${goldBdr}`,
              ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.16em',
              color: '#FFFFFF', textDecoration: 'none',
              alignSelf: 'flex-start',
              transition: 'background 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#26302A' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#6E7F5C' }}
          >
            START WITH YOUR MAP →
          </a>

          {/* Don't go it alone */}
          <div style={{
            marginTop: '28px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(110,127,92,0.10)',
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            maxWidth: '400px',
          }}>
            <span style={{flexShrink:0,marginTop:'2px',lineHeight:0,display:'inline-flex'}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(15,21,35,0.35)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="7" r="3"/><circle cx="15" cy="7" r="3"/>
              <path d="M3 20c0-4 2.7-7 6-7M15 13c3.3 0 6 3 6 7"/>
            </svg></span>
            <p style={{ ...body, fontSize: '14px', lineHeight: 1.7, color: inkDim, margin: 0 }}>
              <strong style={{ color: ink, fontWeight: 600 }}>Don't go it alone.</strong>{' '}
              <a href="/work-with-nik" style={{ color: gold, textDecoration: 'underline', textUnderlineOffset: '2px' }}>Talk to us</a>{' '}
              about group guided programmes or individual coaching for your transformation.
            </p>
          </div>
        </div>

        {/* Right: image */}
        <div style={{
          background: '#F5F2EC',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <img
            src="/hero-personal.jpg"
            alt=""
            aria-hidden="true"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
          />
        </div>
      </section>

      {/* ── Tool grid ── */}
      <section style={{
        maxWidth: '1040px',
        margin: '0 auto',
        padding: 'clamp(64px,8vw,96px) clamp(20px,5vw,40px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold, display: 'block', marginBottom: '12px' }}>
            HORIZON SUITE
          </span>
          <h2 style={{ ...serif, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, color: ink }}>
            Your Personal Growth Toolkit
          </h2>
        </div>

        <div className="mt-grid">
          {TOOLS.map(t => <ToolCard key={t.id} tool={t} />)}
        </div>
      </section>

      {/* ── Featured: The Map ── */}
      <section style={{
        maxWidth: '1040px',
        margin: '0 auto',
        padding: '0 clamp(20px,5vw,40px) clamp(64px,8vw,96px)',
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid rgba(110,127,92,0.12)',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0',
          minHeight: '280px',
        }} className="mt-featured">
          {/* Copy */}
          <div style={{ padding: 'clamp(32px,4vw,48px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid rgba(110,127,92,0.08)' }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold, marginBottom: '14px', display: 'block' }}>
              FEATURED TOOL
            </span>
            <h3 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 400, color: ink, marginBottom: '12px' }}>
              The Map
            </h3>
            <p style={{ ...body, fontSize: '14px', lineHeight: 1.75, color: inkDim, marginBottom: '24px' }}>
              Your life in seven dimensions. See what's working, what's not, and where to focus next.
            </p>
            <a
              href="/login?path=self"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '12px 24px', borderRadius: '40px',
                border: `1.5px solid ${goldBdr}`,
                background: 'rgba(110,127,92,0.06)',
                ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.14em',
                color: gold, textDecoration: 'none',
                alignSelf: 'flex-start',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(110,127,92,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(110,127,92,0.06)' }}
            >
              SEE YOUR MAP →
            </a>
          </div>

          {/* Wheel */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', borderRight: '1px solid rgba(110,127,92,0.08)' }}>
            <WheelPreview />
          </div>

          {/* Tagline */}
          <div style={{ padding: 'clamp(32px,4vw,48px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: '32px' }}>
            <p style={{ ...serif, fontSize: 'clamp(16px,2vw,22px)', fontWeight: 300, color: inkDim, lineHeight: 1.5, textAlign: 'right' }}>
              A clear picture creates a clearer path forward.
            </p>
            {/* destination pin echo */}
            <svg width="32" height="42" viewBox="0 0 32 42" fill="none" opacity="0.25">
              <path d="M16 2C9.4 2 4 7.4 4 14c0 9 12 26 12 26S28 23 28 14c0-6.6-5.4-12-12-12Z" fill="#26302A"/>
              <circle cx="16" cy="14" r="5" fill="#FAFAF7"/>
            </svg>
          </div>
        </div>
      </section>

      {/* ── Beyond personal growth band ── */}
      <section style={{
        background: '#0F1523',
        padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,40px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/hero-civ.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.07,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: '1040px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '32px', flexWrap: 'wrap',
        }}>
          <div>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold, display: 'block', marginBottom: '14px' }}>
              BEYOND PERSONAL GROWTH
            </span>
            <h2 style={{ ...serif, fontSize: 'clamp(22px,3.5vw,38px)', fontWeight: 300, color: '#FAFAF7', lineHeight: 1.35, maxWidth: '480px' }}>
              The work you do within yourself shapes the world around you.
            </h2>
            <p style={{ ...body, fontSize: '15px', color: 'rgba(250,250,247,0.55)', lineHeight: 1.75, maxWidth: '420px', marginTop: '12px' }}>
              The Atlas maps the people, organisations, and projects already building the future, across seven civilisational domains. Find the work worth backing, and make your own visible.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
            <a
              href="/login?path=civ"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '14px 32px', borderRadius: '40px',
                background: '#6E7F5C',
                border: `1.5px solid ${goldBdr}`,
                ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.16em',
                color: '#FFFFFF', textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'background 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#26302A' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#6E7F5C' }}
            >
              EXPLORE THE NEXTUS PLATFORM →
            </a>
            <a
              href="/login?path=civ"
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.14em',
                color: 'rgba(110,127,92,0.7)', textDecoration: 'underline', textUnderlineOffset: '3px',
              }}
            >
              Learn more about the NextUs platform
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />

      <style>{`
        .mt-hero { min-height: 480px; }
        @media (max-width: 768px) {
          .mt-hero {
            grid-template-columns: 1fr !important;
          }
          .mt-hero > div:last-child {
            aspect-ratio: 16/9;
            min-height: 260px;
          }
        }
        .mt-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 900px) {
          .mt-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .mt-grid { grid-template-columns: 1fr; }
        }
        .mt-card { transition: box-shadow 0.18s, transform 0.18s; }
        .mt-card:hover {
          box-shadow: 0 4px 24px rgba(38,48,42,0.08);
          transform: translateY(-2px);
        }
        .mt-featured {
          grid-template-columns: 1fr 1fr 1fr;
        }
        @media (max-width: 768px) {
          .mt-featured {
            grid-template-columns: 1fr !important;
          }
          .mt-featured > div {
            border-right: none !important;
            border-bottom: 1px solid rgba(110,127,92,0.08);
          }
          .mt-featured > div:last-child {
            border-bottom: none;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  )
}
