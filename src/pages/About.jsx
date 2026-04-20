import { useRef } from 'react'
import { Nav } from '../components/Nav'
import { DarkSection, DarkEyebrow, DarkHeading, DarkBody, DarkSolidButton, DarkGhostButton } from '../components/DarkSection'
import { ToolCompassPanel } from '../components/ToolCompassPanel'
import { CivilisationalFramePanel } from '../components/CivilisationalFramePanel'
import { TestimonialsPanel } from '../components/TestimonialsPanel'
import { SiteFooter } from '../components/SiteFooter'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = { color: '#A8721A' }
const meta  = { color: 'rgba(15,21,35,0.55)' }
const dark  = { color: '#0F1523' }

function P({ children, style = {} }) {
  return (
    <p style={{ ...body, fontSize: '17px', fontWeight: 300, ...dark, lineHeight: 1.85, marginBottom: '20px', ...style }}>
      {children}
    </p>
  )
}

function Rule() {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '52px 0' }} />
}

export function AboutPage() {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="about" />

      <style>{`
        @media (max-width: 640px) {
          .about-cols { grid-template-columns: 1fr !important; }
          .about-cols .about-col-divider { display: none !important; }
          .about-cols .about-col:first-child { border-bottom: 1px solid rgba(200,146,42,0.20); padding-bottom: 52px !important; }
          .about-wrap { padding-left: 24px !important; padding-right: 24px !important; }
        }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <div className="about-wrap" style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(88px,10vw,120px) 40px 64px' }}>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', ...gold, display: 'block', marginBottom: '14px' }}>About</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, ...dark, lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '0' }}>
          A life worth living.<br />
          <em style={{ ...gold }}>A future worth building.</em>
        </h1>
      </div>

      {/* ── TWO COLUMNS ── */}
      <div className="about-wrap" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 40px 80px' }}>
        <div
          className="about-cols"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1px 1fr',
            gap: '0',
            alignItems: 'start',
          }}
        >
          {/* LEFT — NextUs Self */}
          <div className="about-col" style={{ paddingRight: '48px' }}>
            <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', ...gold, display: 'block', marginBottom: '20px' }}>NextUs Self</span>
            <h2 style={{ ...serif, fontSize: 'clamp(26px,3vw,36px)', fontWeight: 300, ...dark, lineHeight: 1.15, marginBottom: '28px' }}>
              A chosen life.
            </h2>

            <P>
              Most personal development tools get applied without a map. Someone finds a methodology,
              a practice, a coach — and brings it to bear on their life without any honest picture of
              where they actually are or what stage they're in. A tool applied at the wrong stage
              doesn't just miss. It can actively cause harm.
            </P>
            <P>NextUs Self is built on a different premise.</P>
            <P>
              There are stages to healing and development. The Horizon Suite is a series of tools
              designed to meet you at yours. They are diagnostic first — drawing out an honest picture
              of where you are and where you want to go. They are agnostic about what comes next.
              They don't prescribe a path. They illuminate the terrain and aim you toward the life
              your healthiest, most aligned self would actually thrive in.
            </P>
            <P>
              The tools can be used independently. But they are designed to stack — each one building
              on what the last revealed. Vision first. Then embodied action. Then the methodologies,
              practices, and support —{' '}
              <a href="/nextus-self" style={{ ...gold, textDecoration: 'none', borderBottom: '1px solid rgba(168,114,26,0.35)' }}>
                from people, practitioners, and organisations around the world
              </a>
              {' '}— that are yours to choose freely, held by the scaffold the Suite provides.
            </P>
            <P>
              Inside the elements everyone needs to function and thrive is where you bring your
              creativity, your individuality, your magic.
            </P>
            <P>
              As you start to truly thrive, so too does the world around you. That is how the
              ecosystem works.
            </P>

            <div style={{ marginTop: '32px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <a href="/nextus-self" style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', ...gold, textDecoration: 'none', borderBottom: '1px solid rgba(168,114,26,0.35)', paddingBottom: '2px' }}>
                NextUs Self →
              </a>
              <a href="/tools/north-star" style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none', borderBottom: '1px solid rgba(15,21,35,0.20)', paddingBottom: '2px' }}>
                North Star →
              </a>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="about-col-divider" style={{ background: 'rgba(200,146,42,0.20)', alignSelf: 'stretch' }} />

          {/* RIGHT — NextUs Planet */}
          <div className="about-col" style={{ paddingLeft: '48px' }}>
            <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', ...gold, display: 'block', marginBottom: '20px' }}>NextUs</span>
            <h2 style={{ ...serif, fontSize: 'clamp(26px,3vw,36px)', fontWeight: 300, ...dark, lineHeight: 1.15, marginBottom: '28px' }}>
              A chosen planet.
            </h2>

            <P>
              Most coordination efforts fail before they start. Not because the people aren't capable
              or the resources don't exist — but because there's no shared picture of where we're
              actually going. Effort scatters. Good work happens in isolation. The solutions that
              worked in one place, in one environment, are applied to another situation with completely
              different needs, at a completely different stage.
            </P>
            <P>NextUs is built on a different premise.</P>
            <P>
              There are domains to civilisational life — seven of them — and the work of building a
              thriving planet is already happening inside every one. People are restoring ecosystems,
              designing new economies, building governance frameworks, developing ethical technology.
              The work is real. What's missing is the map, and the connection.
            </P>
            <P>
              NextUs is a coordination platform designed to make that map visible, and those
              connections real. It is diagnostic first — drawing an honest picture of where each
              domain actually is, and what the horizon goal for that domain looks like at every scale.
              It is agnostic about how we get there. It doesn't prescribe ideology or method. It
              illuminates the terrain and connects the people already doing the work.
            </P>
            <P>
              Organisations and individuals place themselves on the map. They name what they're
              building, what they need, and what they have to offer. The platform surfaces the
              connections — not as an algorithm optimising for engagement, but as infrastructure
              for genuine coordination. Give first. Close the loop. Build a record of what actually
              happened.
            </P>
            <P>
              Somewhere inside these seven domains is where your contribution lives. The platform
              holds the scaffold. You bring the work.
            </P>
            <P>
              As more people find their place in the larger picture, the map becomes more useful,
              the connections more precise, the effort less scattered. That is how the ecosystem works.
            </P>

            <div style={{ marginTop: '32px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <a href="/nextus" style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', ...gold, textDecoration: 'none', borderBottom: '1px solid rgba(168,114,26,0.35)', paddingBottom: '2px' }}>
                NextUs →
              </a>
              <a href="/nextus/actors" style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none', borderBottom: '1px solid rgba(15,21,35,0.20)', paddingBottom: '2px' }}>
                Who's doing the work →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── FRACTAL BRIDGE — dark section ── */}
      <DarkSection>
        <DarkEyebrow>The fractal</DarkEyebrow>
        <DarkHeading>The same architecture. Two scales.</DarkHeading>
        <DarkBody>
          What you build in yourself maps directly onto what humanity is trying to build collectively.
          The seven domains of your life are the same seven domains civilisation is working on.
          The personal and the civilisational are not separate projects. They are the same work,
          at different scales.
        </DarkBody>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <DarkSolidButton href="/nextus-self">NextUs Self →</DarkSolidButton>
          <DarkGhostButton href="/nextus">NextUs →</DarkGhostButton>
        </div>
      </DarkSection>

      {/* ── NIK SECTION ── */}
      <div className="about-wrap" style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 40px 100px' }}>

        {/* Photo — parallax, cropped to fingertip level */}
        <style>{`
          .nik-peru-wrap {
            width: 100%;
            height: clamp(340px, 55vw, 600px);
            border-radius: 14px;
            border: 1.5px solid rgba(200,146,42,0.55);
            overflow: hidden;
            margin-bottom: 64px;
            position: relative;
          }
          .nik-peru-img {
            width: 100%;
            height: 140%;
            object-fit: cover;
            object-position: center 0%;
            display: block;
            will-change: transform;
          }
        `}</style>
        <div
          className="nik-peru-wrap"
          ref={el => {
            if (!el) return
            function onScroll() {
              const rect = el.getBoundingClientRect()
              const viewH = window.innerHeight
              const progress = 1 - (rect.bottom / (viewH + rect.height))
              const shift = Math.min(Math.max(progress * 30, 0), 30)
              const img = el.querySelector('.nik-peru-img')
              if (img) img.style.transform = 'translateY(-' + shift + '%)'
            }
            window.addEventListener('scroll', onScroll, { passive: true })
            onScroll()
          }}
        >
          <img
            src="/Nik_Peru.jpeg"
            alt="Nik Wood at Machu Picchu"
            className="nik-peru-img"
          />
        </div>

        {/* Nik text — max width, centred */}
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', ...gold, display: 'block', marginBottom: '14px' }}>Nik Wood · Founder</span>
          <h2 style={{ ...serif, fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 300, ...dark, lineHeight: 1.1, marginBottom: '8px' }}>
            The person behind the work.
          </h2>
          <div style={{ width: '40px', height: '1px', background: '#C8922A', margin: '24px 0 36px' }} />

          <P>
            Nik Wood has been doing this work for almost 30 years. Not building toward it — doing it.
            Coaching people who already function well but know that they're scratching the surface of
            their own potential. Watching what actually moves a life forward, and what doesn't.
          </P>
          <P>
            This was born out of circumstances and need. There was beauty and inspiration as well as
            trauma and abuse. He needed a way out and so he sought out what worked and built on that.
            The hard years — a skull fracture, cancer, the loss of his mother — didn't interrupt the
            work. They deepened it. What came out the other side wasn't a new methodology. It was a
            fundamentally different understanding of what scale this work needs to operate at.
          </P>
          <P>NextUs is that understanding, made into infrastructure.</P>

          <div style={{ marginTop: '40px' }}>
            <a
              href="/work-with-nik"
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                borderRadius: '40px',
                border: '1px solid rgba(168,114,26,0.8)',
                background: '#C8922A',
                color: '#FFFFFF',
                ...sc,
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textDecoration: 'none',
              }}
            >
              Work with Nik →
            </a>
          </div>
        </div>
      </div>

      {/* ── CLOSING DARK ── */}
      <DarkSection style={{ textAlign: 'center' }}>
        <DarkEyebrow>The mission</DarkEyebrow>
        <DarkHeading>To live into a world where everyone is fully on their path and actively levelling up towards their full-yes life.</DarkHeading>
        <DarkBody style={{ color: '#A8721A', marginBottom: '40px' }}>To awaken and amplify the Godspark of humanity.</DarkBody>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <DarkSolidButton href="/work-with-nik">Work directly with Nik →</DarkSolidButton>
          <DarkGhostButton href="/podcast">Listen to the podcast →</DarkGhostButton>
        </div>
      </DarkSection>

      <TestimonialsPanel />
      <ToolCompassPanel />
      <SiteFooter />
    </div>
  )
}
