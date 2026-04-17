import { useEffect } from 'react'
import { Nav } from '../components/Nav'
import { ToolCompassPanel } from '../components/ToolCompassPanel'
import { ScalePanel } from '../components/ScalePanel'
import { SiteFooter } from '../components/SiteFooter'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

function Quote({ text, cite }) {
  return (
    <div style={{ borderLeft: '2px solid rgba(200,146,42,0.20)', padding: '14px 0 14px 28px', margin: '0 0 28px', maxWidth: '600px' }}>
      <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '10px' }}>{text}</p>
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: '#A8721A' }}>{'\u2014'} {cite}</span>
    </div>
  )
}

function Card({ label, content }) {
  return (
    <div style={{ background: 'rgba(200,146,42,0.05)', borderRadius: '14px', padding: '26px 28px', marginBottom: '10px', border: '1.5px solid rgba(200,146,42,0.78)' }}>
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', color: '#A8721A', display: 'block', marginBottom: '10px' }}>{label}</span>
      <div style={{ ...body, fontSize: '16px', color: '#0F1523', lineHeight: 1.7 }}>{content}</div>
    </div>
  )
}

function CalendlyEmbed() {
  useEffect(() => {
    // Load Calendly CSS
    const link = document.createElement('link')
    link.href = 'https://assets.calendly.com/assets/external/widget.css'
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    // Load Calendly JS
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.head.removeChild(link)
      document.body.removeChild(script)
    }
  }, [])

  return (
    <div
      className="calendly-inline-widget"
      data-url="https://calendly.com/nikwood/talk-to-nik"
      style={{ minWidth: '280px', height: '700px', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid rgba(200,146,42,0.78)' }}
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
            <h1 style={{ ...body, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
              From processing<br /><span style={{ color: '#A8721A' }}>to building.</span>
            </h1>
            <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '40px', maxWidth: '480px' }}>One-on-one work for people who are done with the loop they{'\u2019'}re in.</p>
            <a href="https://calendly.com/nikwood/talk-to-nik" target="_blank" rel="noopener" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>Book a discovery call {'\u2192'}</a>
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

        <Quote text="Someone who will shift you out of emotional processing, analysis, or healing mode and into 'what's next, what are you building, what does your future look like' — and who treats you as someone capable of operating at a high level." cite="B.G.B. · coaching client" />

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 40px' }} />
        <h2 style={{ ...body, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '20px' }}>What this is.</h2>
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '16px', fontWeight: 400, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>One-on-one work built around where you actually are and what you{'’'}re trying to build. Not a fixed programme. A real conversation and real support {'—'} determined by the work, not a curriculum.</p>
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '16px', fontWeight: 400, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>The work draws on the full ecosystem {'—'} the Horizon Suite, Purpose Piece, Horizon Leap {'—'} but what it draws on in any engagement is determined by what{'’'}s actually needed.</p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.8, marginBottom: '40px', maxWidth: '600px' }}>One call per week, with focused work in between. We begin with The Map {'—'} an honest picture of where you are across all seven domains {'—'} then follow wherever the work needs to go from there.</p>

        <Card label="This is for you if" content="You're high-functioning and aware that functioning well isn't the same as living from what you're capable of · You've done work on yourself and something still isn't moving · You have a real horizon — something you're building — and a felt gap between where you are and what it requires · You're ready to be seen clearly and worked with honestly" />
        <Card label="This is not for you if" content="You're in active crisis or need stabilisation · You want a programme to follow · You're not ready to move" />

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '40px 0' }} />
        <h2 style={{ ...body, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '28px' }}>What people say.</h2>
        <Quote text="Working with Nik definitely changed my life. He has the ability to build up the right foundation and the right container to actually be vulnerable and go straight to where you need to." cite="S.H. · programme participant" />
        <Quote text="The work we've done has peeled back the narrative that said 'I can't do that' and revealed another world of possibility. I feel like I've been liberated." cite="C.W. · coaching client" />
        <Quote text="I think this is the best decision I've ever made — having you as my coach. You've helped me unlock things I thought were dead and buried long ago." cite="L.D. · coaching client" />
        <Quote text="Nik really is a champion of your greatness. He helped me learn about who I was at the core of my being — what I really wanted out of life — and how to live as the best version of myself." cite="O.W.H. · programme participant" />
        <Quote text="I'm 63 years old and just met myself for the first time working with Nik." cite="J.B. · coaching client" />

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '40px 0' }} />
        <h2 style={{ ...body, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: '#0F1523', marginBottom: '20px' }}>How it works.</h2>
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '16px', fontWeight: 400, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>Start with a discovery call. No commitment, no obligation {'\u2014'} just an honest conversation about where you are and whether this is the right container for the work.</p>
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
        <h1 style={{ ...body, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          NextUs.<br /><span style={{ color: '#A8721A' }}>The conversation.</span>
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
            <span style={{ color: '#A8721A', fontSize: '16px' }}>{'\u2192'}</span>
          </a>
        ))}
      </div>

      {/* Dark signup section */}
      <section className="pod-dark" style={{ background: '#0F1523', borderTop: '1.5px solid rgba(200,146,42,0.78)', padding: '96px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}><img src="/logo_nav.png" alt="NextUs" style={{ height: '40px', width: 'auto', display: 'inline-block', opacity: 0.78 }} /></div>
          <div style={{ width: '28px', height: '1px', background: '#C8922A', opacity: 0.4, margin: '0 auto 36px' }} />
          <h2 style={{ ...body, fontSize: 'clamp(24px,3vw,34px)', fontWeight: 300, color: 'rgba(255,255,255,0.92)', marginBottom: '12px' }}>Stay up to date.</h2>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(255,255,255,0.55)', marginBottom: '40px', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>New episodes and updates as the work evolves.</p>
          <div style={{ maxWidth: '380px', margin: '0 auto' }}>
            <script src="https://f.convertkit.com/ckjs/ck.5.js"></script>
            <form action="https://app.kit.com/forms/9215183/subscriptions" className="seva-form formkit-form" method="post" data-sv-form="9215183" data-uid="d323427d8c" data-format="inline" data-version="5">
              <input type="email" name="email_address" placeholder="your email" required style={{ width: '100%', padding: '15px 18px', marginBottom: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '40px', fontFamily: "'Lora', Georgia, serif", fontSize: '16px', color: 'rgba(255,255,255,0.88)', outline: 'none' }} />
              <button type="submit" style={{ width: '100%', padding: '16px', background: '#C8922A', border: '1px solid rgba(168,114,26,0.8)', borderRadius: '40px', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '16px', letterSpacing: '0.16em', color: '#FFFFFF', cursor: 'pointer' }}>Join us {'\u2192'}</button>
            </form>
          </div>
        </div>
      </section>

      <ScalePanel side="right" />
      <SiteFooter />
    </div>
  )
}
