import { SiteNav } from '../components/SiteNav'
import { SprintPanel } from '../components/SprintPanel'
import { SiteFooter } from '../components/SiteFooter'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

function Quote({ text, cite }) {
  return (
    <div style={{ borderLeft: '2px solid rgba(200,146,42,0.20)', padding: '14px 0 14px 28px', margin: '0 0 28px', maxWidth: '600px' }}>
      <p style={{ ...serif, fontSize: '16px', fontStyle: 'italic', color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, marginBottom: '10px' }}>{text}</p>
      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#A8721A' }}>{'\u2014'} {cite}</span>
    </div>
  )
}

function Card({ label, body }) {
  return (
    <div style={{ background: 'rgba(200,146,42,0.05)', borderRadius: '14px', padding: '26px 28px', marginBottom: '10px', border: '1.5px solid rgba(200,146,42,0.78)' }}>
      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#A8721A', display: 'block', marginBottom: '10px' }}>{label}</span>
      <div style={{ ...serif, fontSize: '16px', color: '#0F1523', lineHeight: 1.7 }}>{body}</div>
    </div>
  )
}

export function WorkWithNikPage() {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <SiteNav active="work-with-nik" />
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '112px 40px 120px' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Work with Nik</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          From processing<br /><em style={{ fontStyle: 'italic', color: '#A8721A' }}>to building.</em>
        </h1>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '56px', maxWidth: '520px' }}>One-on-one work for people who are done with the loop they{'\u2019'}re in.</p>
        <a href="https://calendly.com/nikwood/talk-to-nik" target="_blank" rel="noopener" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: '#A8721A', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none', marginBottom: '64px' }}>Book a discovery call {'\u2192'}</a>

        <Quote text="Someone who will shift you out of emotional processing, analysis, or healing mode and into 'what's next, what are you building, what does your future look like' — and who treats you as someone capable of operating at a high level." cite="B.G.B." />

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 40px' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '20px' }}>What this is.</h2>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>One-on-one work built around where you actually are and what you{'\u2019'}re trying to build. Not a fixed programme. A real conversation and real support {'\u2014'} determined by the work, not a curriculum.</p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '40px', maxWidth: '600px' }}>The work draws on the full ecosystem {'\u2014'} Life OS, Purpose Piece, Horizon Leap {'\u2014'} but what it draws on in any engagement is determined by what{'\u2019'}s actually needed.</p>

        <Card label="This is for you if" body="You're high-functioning and aware that functioning well isn't the same as living from what you're capable of · You've done work on yourself and something still isn't moving · You have a real horizon — something you're building — and a felt gap between where you are and what it requires · You're ready to be seen clearly and worked with honestly" />
        <Card label="This is not for you if" body="You're in active crisis or need stabilisation · You want a programme to follow · You're not ready to move" />

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '40px 0' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '28px' }}>What people say.</h2>
        <Quote text="Working with Nik definitely changed my life. He has the ability to build up the right foundation and the right container to actually be vulnerable and go straight to where you need to." cite="S.H." />
        <Quote text="The work we've done has peeled back the narrative that said 'I can't do that' and revealed another world of possibility. I feel like I've been liberated." cite="C.W." />
        <Quote text="I think this is the best decision I've ever made — having you as my coach. You've helped me unlock things I thought were dead and buried long ago." cite="L.D." />
        <Quote text="Nik really is a champion of your greatness. He helped me learn about who I was at the core of my being — what I really wanted out of life — and how to live as the best version of myself." cite="O.W.H." />

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '40px 0' }} />
        <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '20px' }}>How it works.</h2>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '40px', maxWidth: '600px' }}>Start with a discovery call. No commitment, no obligation {'\u2014'} just an honest conversation about where you are and whether this is the right container for the work.</p>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '20px' }}>Book a time</span>

        {/* Calendly embed */}
        <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
        <div className="calendly-inline-widget" data-url="https://calendly.com/nikwood/talk-to-nik" style={{ minWidth: '280px', height: '700px', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid rgba(200,146,42,0.78)' }} />
        <script src="https://assets.calendly.com/assets/external/widget.js" async />
        <p style={{ ...serif, fontSize: '13px', fontStyle: 'italic', color: 'rgba(15,21,35,0.55)', marginTop: '14px' }}>30 minutes · no cost · no obligation</p>
      </div>
      <SprintPanel />
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
      <SiteNav active="podcast" />
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '112px 40px 120px' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>The Podcast</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          NextUs.<br /><em style={{ fontStyle: 'italic', color: '#A8721A' }}>The conversation.</em>
        </h1>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '56px', maxWidth: '500px' }}>220+ episodes since 2015. Long-form conversations at the intersection of personal development, human potential, and civilisational possibility.</p>

        <div style={{ marginBottom: '64px', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid rgba(200,146,42,0.78)' }}>
          <iframe title="Embed Player" style={{ border: 'none', display: 'block' }} src="https://play.libsyn.com/embed/destination/id/267499/height/476/theme/modern/size/extra-large/thumbnail/yes/custom-color/c8922a/video-height/200/playlist-height/64/direction/backward/download/yes/font-color/FFFFFF" height="476" width="100%" scrolling="no" allowFullScreen webkitallowfullscreen="true" mozallowfullscreen="true" />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 32px' }} />
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Listen on</span>
        {platforms.map(p => (
          <a key={p.label} href={p.url} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderRadius: '14px', marginBottom: '8px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{ ...serif, fontSize: '16px', color: '#A8721A' }}>{p.label}</div>
            <span style={{ color: '#A8721A', fontSize: '16px' }}>{'\u2192'}</span>
          </a>
        ))}
      </div>

      {/* Dark signup section */}
      <section style={{ background: '#0F1523', borderTop: '1.5px solid rgba(200,146,42,0.78)', padding: '96px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}><img src="/logo_nav.png" alt="NextUs" style={{ height: '40px', width: 'auto', display: 'inline-block', opacity: 0.78 }} /></div>
          <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.4, margin: '0 auto 36px' }} />
          <h2 style={{ ...serif, fontSize: 'clamp(24px,3vw,34px)', fontWeight: 300, color: 'rgba(255,255,255,0.92)', marginBottom: '12px' }}>Stay up to date.</h2>
          <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(255,255,255,0.55)', marginBottom: '40px', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>New episodes and updates as the work evolves.</p>
          <div style={{ maxWidth: '380px', margin: '0 auto' }}>
            <script src="https://f.convertkit.com/ckjs/ck.5.js"></script>
            <form action="https://app.kit.com/forms/9215183/subscriptions" className="seva-form formkit-form" method="post" data-sv-form="9215183" data-uid="d323427d8c" data-format="inline" data-version="5">
              <input type="email" name="email_address" placeholder="your email" required style={{ width: '100%', padding: '15px 18px', marginBottom: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '40px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '16px', color: 'rgba(255,255,255,0.88)', outline: 'none' }} />
              <button type="submit" style={{ width: '100%', padding: '16px', background: '#C8922A', border: '1px solid rgba(168,114,26,0.8)', borderRadius: '40px', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '16px', letterSpacing: '0.16em', color: '#FFFFFF', cursor: 'pointer' }}>Join us {'\u2192'}</button>
            </form>
          </div>
        </div>
      </section>

      <SprintPanel />
      <SiteFooter />
    </div>
  )
}
