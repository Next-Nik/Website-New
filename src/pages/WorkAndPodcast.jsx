import { Nav } from '../components/Nav'
import { DarkSection, DarkEyebrow, DarkHeading, DarkBody, DarkSolidButton, DarkGhostButton } from '../components/DarkSection'
import { ToolCompassPanel } from '../components/ToolCompassPanel'
import { ScalePanel } from '../components/ScalePanel'
import { SiteFooter } from '../components/SiteFooter'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

function Quote({ text, cite }) {
  return (
    <div style={{ borderLeft: '2px solid rgba(200,146,42,0.20)', padding: '14px 0 14px 28px', margin: '0 0 28px', maxWidth: '600px' }}>
      <p style={{ ...body, fontSize: '16px', fontStyle: 'italic', color: '#0F1523', lineHeight: 1.75, marginBottom: '10px' }}>{text}</p>
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: '#A8721A' }}>{'—'} {cite}</span>
    </div>
  )
}

const TESTIMONIALS = [
  { q: 'Working with Nik definitely changed my life. He has the ability to build up the right foundation and the right container to actually be vulnerable and go straight to where you need to.', cite: 'S.H.' },
  { q: `The work we've done has peeled back the narrative that said 'I can't do that' and revealed another world of possibility. I feel like I've been liberated.`, cite: 'C.W.' },
  { q: `I think this is the best decision I've ever made — having you as my coach. You've helped me unlock things I thought were dead and buried long ago.`, cite: 'L.D.' },
  { q: 'Nik really is a champion of your greatness. He helped me learn about who I was at the core of my being — what I really wanted out of life — and how to live as the best version of myself.', cite: 'O.W.H.' },
  { q: `I'm 63 years old and just met myself for the first time working with Nik.`, cite: 'J.B.' },
  { q: 'I came to Nik a few weeks in, apologising for not doing my homework — and found myself telling him I'd met someone, gone on wonderful adventures, that my work was expanding. He said: 'Look at what you wrote in week one.' I was already living it.', cite: 'J.M.' },
]

function Stars() {
  return (
    <div style={{ display: 'flex', gap: '3px', marginBottom: '14px' }}>
      {[0,1,2,3,4].map(i => (
        <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#C8922A" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 0.5l1.545 4.756H13.5l-4.045 2.938 1.545 4.756L7 10.012l-3.999 2.938 1.545-4.756L0.5 5.256h4.955L7 0.5z"/>
        </svg>
      ))}
    </div>
  )
}

function TestimonialCard({ q, cite }) {
  return (
    <div style={{
      flexShrink: 0,
      width: '300px',
      background: '#FFFFFF',
      border: '1.5px solid rgba(200,146,42,0.20)',
      borderRadius: '14px',
      padding: '24px 28px',
      marginRight: '20px',
    }}>
      <Stars />
      <p style={{ ...body, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '16px' }}>{q}</p>
      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#A8721A' }}>{'—'} {cite}</span>
    </div>
  )
}

function TestimonialCarousel() {
  // Duplicate items for seamless loop
  const row1 = [...TESTIMONIALS, ...TESTIMONIALS]
  const row2 = [...TESTIMONIALS, ...TESTIMONIALS]
  const duration = TESTIMONIALS.length * 12 // seconds per full loop

  return (
    <div style={{ overflow: 'hidden', margin: '0 -40px' }}>
      <style>{`
        @keyframes scrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scrollRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .carousel-track-left {
          display: flex;
          width: max-content;
          animation: scrollLeft ${duration}s linear infinite;
        }
        .carousel-track-right {
          display: flex;
          width: max-content;
          animation: scrollRight ${duration}s linear infinite;
        }
        .carousel-track-left:hover,
        .carousel-track-right:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Row 1 — scrolls left */}
      <div style={{ marginBottom: '20px', padding: '8px 0' }}>
        <div className="carousel-track-left">
          {row1.map((t, i) => <TestimonialCard key={i} q={t.q} cite={t.cite} />)}
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div style={{ padding: '8px 0' }}>
        <div className="carousel-track-right">
          {row2.map((t, i) => <TestimonialCard key={i} q={t.q} cite={t.cite} />)}
        </div>
      </div>
    </div>
  )
}

function Card({ label, body }) {
  return (
    <div style={{ background: 'rgba(200,146,42,0.05)', borderRadius: '14px', padding: '26px 28px', marginBottom: '10px', border: '1.5px solid rgba(200,146,42,0.78)' }}>
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', color: '#A8721A', display: 'block', marginBottom: '10px' }}>{label}</span>
      <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '16px', color: '#0F1523', lineHeight: 1.7 }}>{body}</div>
    </div>
  )
}

function CalendlyEmbed() {
  return (
    <iframe
      src="https://calendly.com/nikwood/talk-to-nik?embed_type=Inline&hide_landing_page_details=1&hide_gdpr_banner=1"
      width="100%"
      height="700"
      frameBorder="0"
      title="Book a call with Nik"
      style={{ borderRadius: '14px', border: '1.5px solid rgba(200,146,42,0.78)', display: 'block' }}
    />
  )
}

export function WorkWithNikPage() {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <style>{`@media (max-width: 640px) { .wap-main { padding-left: 24px !important; padding-right: 24px !important; } .wap-dark { padding-left: 24px !important; padding-right: 24px !important; } }`}</style>
      <Nav activePath="work-with-nik" />
      <div className="wap-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '112px 40px 120px' }}>
        {/* Two-column hero: text left, photo right */}
        <div style={{ display: 'flex', gap: '56px', alignItems: 'flex-start', marginBottom: '64px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Work with Nik</span>
            <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
              From circling<br /><em style={{ fontStyle: 'italic', color: '#A8721A' }}>to building.</em>
            </h1>
            <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '40px', maxWidth: '480px' }}>One-on-one work for people who are ready to move {'—'} not just understand.</p>
            <a href="https://calendly.com/nikwood/talk-to-nik" target="_blank" rel="noopener" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>Book a discovery call {'→'}</a>
          </div>
          {/* Photo — drop /nik.png into your /public folder. Graceful fallback until then. */}
          <div style={{ flex: '0 0 auto', width: 'clamp(160px, 28vw, 260px)' }}>
            <div style={{
              width: '100%', aspectRatio: '3/4',
              borderRadius: '4px', overflow: 'hidden',
              border: '1.5px solid rgba(200,146,42,0.70)',
              outline: '1px solid rgba(200,146,42,0.35)',
              outlineOffset: '5px',
              background: 'rgba(200,146,42,0.05)',
            }}>
              <img
                src="/nik.jpeg"
                alt="Nik Wood"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                onError={e => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.parentNode.style.display = 'flex'
                  e.currentTarget.parentNode.style.alignItems = 'center'
                  e.currentTarget.parentNode.style.justifyContent = 'center'
                  e.currentTarget.parentNode.style.background = 'rgba(200,146,42,0.05)'
                }}
              />
            </div>
          </div>
        </div>

        <Quote text="Someone who will shift you out of emotional processing, analysis, or healing mode and into 'what's next, what are you building, what does your future look like' — and who treats you as someone capable of operating at a high level." cite="B.G.B." />

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 40px' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '20px' }}>What this is.</h2>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>One-on-one work built around where you actually are and what you{'''}re trying to build. Not a fixed programme. A real conversation and real support {'—'} determined by the work, not a curriculum.</p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>The work draws on the full ecosystem {'—'} the Horizon Suite, Purpose Piece, Horizon Leap {'—'} but what it draws on in any engagement is determined by what{'''}s actually needed.</p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.8, marginBottom: '40px', maxWidth: '600px' }}>One call per week, with focused work in between. We begin with The Map {'—'} an honest picture of where you are across all seven domains {'—'} then follow wherever the work needs to go from there.</p>

        <Card label="This is for you if" body="You're high-functioning and you know functioning well isn't the same as living from what you're built for · You've done the work — something still isn't closing · You have a real horizon and a felt gap between where you are and what it requires · You're ready to be seen clearly" />
        <Card label="This is not for you if" body="You're in active crisis or need stabilisation · You want a programme to follow · You're not ready to move" />

      </div>

      {/* What people say — dark section */}
      <DarkSection>
        <DarkEyebrow>What people say</DarkEyebrow>
        <DarkHeading>Real words from real people.</DarkHeading>
      </DarkSection>

      <div className="wap-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '80px 40px 0' }}>
        <TestimonialCarousel />

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '40px 0' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '20px' }}>How it works.</h2>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>Start with a discovery call. No commitment, no obligation {'—'} just an honest conversation about where you are and whether this is the right container for the work.</p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, marginBottom: '32px', maxWidth: '600px' }}>Engagements begin at $3,500/month with a three-month commitment. The Horizon Suite included for the duration. If that's in range, let's talk.</p>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '20px' }}>Book a time</span>

        {/* Calendly embed */}
        <CalendlyEmbed />
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', marginTop: '14px' }}>30 minutes · no cost · no obligation</p>
      </div>
      <ScalePanel side="right" />
      <ToolCompassPanel />
      <SiteFooter />
    </div>
  )
}

export function PodcastPage() {
  const platforms = [
    { label: 'Spotify', url: 'https://open.spotify.com/show/65LzAbOCuOZW7mvHTKsIbY' },
    { label: 'Apple Podcasts', url: 'https://podcasts.apple.com/us/podcast/nextus/id1760250059' },
    { label: 'YouTube', url: 'https://www.youtube.com/@NextUs-World' },
    { label: 'iHeart', url: 'https://www.iheart.com/podcast/263-nextus-podcast-326612424/' },
    { label: 'Amazon Music', url: 'https://www.amazon.com/NextUs-Podcast/dp/B0GSCQ989S/' },
    { label: 'RSS Feed', url: 'https://feeds.libsyn.com/66392/rss' },
  ]

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <style>{`@media (max-width: 640px) { .pod-main { padding-left: 24px !important; padding-right: 24px !important; } .pod-dark { padding-left: 24px !important; padding-right: 24px !important; } }`}</style>
      <Nav activePath="podcast" />
      <div className="pod-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '112px 40px 120px' }}>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>The Podcast</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          NextUs.<br /><em style={{ fontStyle: 'italic', color: '#A8721A' }}>The conversation.</em>
        </h1>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '56px', maxWidth: '500px' }}>220+ episodes since 2015. Long-form conversations at the intersection of personal development, human potential, and civilisational possibility.</p>

        <div style={{ marginBottom: '64px', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid rgba(200,146,42,0.78)' }}>
          <iframe title="Embed Player" style={{ border: 'none', display: 'block' }} src="https://play.libsyn.com/embed/destination/id/267499/height/476/theme/modern/size/extra-large/thumbnail/yes/custom-color/c8922a/video-height/200/playlist-height/64/direction/backward/download/yes/font-color/FFFFFF" height="476" width="100%" scrolling="no" allowFullScreen webkitallowfullscreen="true" mozallowfullscreen="true" />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 32px' }} />
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Listen on</span>
        {platforms.map(p => (
          <a key={p.label} href={p.url} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderRadius: '14px', marginBottom: '8px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{ ...body, fontSize: '16px', color: '#A8721A' }}>{p.label}</div>
            <span style={{ color: '#A8721A', fontSize: '16px' }}>{'→'}</span>
          </a>
        ))}
      </div>

      {/* Stay close — dark section */}
      <DarkSection style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <img src="/logo_nav.png" alt="NextUs" style={{ height: '40px', width: 'auto', display: 'inline-block', opacity: 0.78 }} />
        </div>
        <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.4, margin: '0 auto 36px' }} />
        <DarkHeading>Stay up to date.</DarkHeading>
        <DarkBody style={{ maxWidth: '320px', margin: '0 auto 40px' }}>New episodes and updates as the work evolves.</DarkBody>
        <div style={{ maxWidth: '380px', margin: '0 auto' }}>
          <script src="https://f.convertkit.com/ckjs/ck.5.js"></script>
          <form action="https://app.kit.com/forms/9215183/subscriptions" className="seva-form formkit-form" method="post" data-sv-form="9215183" data-uid="d323427d8c" data-format="inline" data-version="5">
            <input type="email" name="email_address" placeholder="your email" required style={{ width: '100%', padding: '15px 18px', marginBottom: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '40px', fontFamily: "'Lora', Georgia, serif", fontSize: '16px', color: 'rgba(255,255,255,0.88)', outline: 'none' }} />
            <button type="submit" style={{ width: '100%', padding: '16px', background: '#C8922A', border: '1px solid rgba(168,114,26,0.8)', borderRadius: '40px', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '16px', letterSpacing: '0.16em', color: '#FFFFFF', cursor: 'pointer' }}>Join us →</button>
          </form>
        </div>
      </DarkSection>
      <SiteFooter />
    </div>
  )
}
