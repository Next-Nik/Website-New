import { Nav } from '../components/Nav'
import { DarkSection, DarkEyebrow, DarkHeading, DarkBody, DarkSolidButton, DarkGhostButton } from '../components/DarkSection'
import { ToolCompassPanel } from '../components/ToolCompassPanel'
import { CivilisationalFramePanel } from '../components/CivilisationalFramePanel'
import { TestimonialsPanel } from '../components/TestimonialsPanel'
import { SiteFooter } from '../components/SiteFooter'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold = { color: '#A8721A' }
const meta = { color: 'rgba(15,21,35,0.55)' }
const dark = { color: '#0F1523' }

function Rule() {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '64px 0' }} />
}

function Featured({ children, right = false }) {
  return (
    <div style={{
      borderLeft: right ? 'none' : '3px solid #C8922A',
      borderRight: right ? '3px solid #C8922A' : 'none',
      padding: right ? '8px 28px 8px 0' : '8px 0 8px 28px',
      margin: '40px 0',
      maxWidth: '640px',
      marginLeft: right ? 'auto' : undefined,
      marginRight: right ? 0 : undefined,
      textAlign: right ? 'right' : undefined,
    }}>
      <p style={{ ...body, fontSize: 'clamp(20px,2.6vw,26px)', fontWeight: 300, ...dark, lineHeight: 1.55, margin: 0 }}>
        {children}
      </p>
    </div>
  )
}

function ToolRow({ name, desc }) {
  return (
    <div style={{ display: 'flex', gap: '20px', padding: '16px 0', borderBottom: '1px solid rgba(200,146,42,0.20)', alignItems: 'baseline' }}>
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, minWidth: '160px', flexShrink: 0 }}>{name}</span>
      <span style={{ ...body, fontSize: '16px', ...meta, lineHeight: 1.6 }}>{desc}</span>
    </div>
  )
}

function Value({ name, desc }) {
  return (
    <div style={{ borderRight: '3px solid rgba(200,146,42,0.20)', padding: '14px 24px 14px 0', textAlign: 'right' }}>
      <strong style={{ display: 'block', ...sc, fontSize: '15px', letterSpacing: '0.14em', ...gold, marginBottom: '4px' }}>{name}</strong>
      <p style={{ margin: 0, ...body, fontSize: '16px', ...meta }}>{desc}</p>
    </div>
  )
}

export function AboutPage() {
  const page = { maxWidth: '820px', margin: '0 auto', padding: '72px 40px 100px' }
  const pageRight = { ...page, textAlign: 'right' }

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="about" />
      <style>{`@media (max-width: 640px) { .about-section { padding-left: 24px !important; padding-right: 24px !important; } }`}</style>

      {/* ── SECTION ONE — NEXTUS ── */}
      <div className="about-section" style={page}>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', ...gold, display: 'block', marginBottom: '14px' }}>NextUs · Horizon Suite</span>
        <h1 style={{ ...serif, fontSize: 'clamp(40px,5.5vw,64px)', fontWeight: 300, ...gold, lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: '16px' }}>
          A life worth living,<br />a future worth building.
        </h1>
        <p style={{ ...serif, fontSize: 'clamp(18px,2.2vw,24px)', fontWeight: 300, ...meta, marginBottom: '0', maxWidth: '640px' }}>
          A frame for the human project.
        </p>
        <div style={{ width: '56px', height: '1px', background: '#C8922A', margin: '20px 0 40px' }} />

        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px' }}>
          Humanity has never collectively answered the most important question: what are we actually building toward? Not as ideology — as a genuine, shared picture of what flourishing looks like across every domain of human life. Some people are restoring ecosystems. Some are building ethical technology. Some are designing new economies. None of it is aimed at a common horizon.
        </p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px' }}>
          This is not a resource problem or a technology problem. It is a navigation problem. You cannot coordinate around a destination that doesn't exist.
        </p>

        <Featured>What we can see clearly, we can choose. What we can coordinate around, we can change.</Featured>

        <Rule />

      </div>

      <div className="about-section" style={{ maxWidth: '820px', margin: '0 auto', padding: '96px 40px 0' }}>

        <h2 style={{ ...serif, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 300, ...dark, lineHeight: 1.25, margin: '0 0 14px' }}>The tools.</h2>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px' }}>
          The Horizon Suite is the personal navigation layer. Each tool is built for a specific stage of the journey.
        </p>

        <div style={{ margin: '28px 0' }}>
          <ToolRow name="Horizon State" desc="The nervous system layer. The regulated ground everything else runs on — capacity before content." />
          <ToolRow name="Purpose Piece" desc="The pattern beneath how you're naturally built to contribute. Not a personality test — recognition." />
          <ToolRow name="The Map" desc="Seven domains. Three steps each. An honest picture of where you are and where you want to be." />
          <ToolRow name="Target Sprint" desc="Focused sprint planning across your three most urgent domains. From horizon to next action." />
          <ToolRow name="Horizon Practice" desc="Daily practice. The return. T.E.A. alignment, skill development, and thought loop work." />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '52px', paddingTop: '44px', borderTop: '1px solid rgba(200,146,42,0.20)', alignItems: 'center' }}>
          <a href="/tools/orienteering" style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', ...gold, textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '3px' }}>Find your entry point →</a>
          <a href="/nextus-self" style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', ...gold, textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)', paddingBottom: '3px' }}>Explore the Horizon Suite →</a>
        </div>
      </div>

      {/* Two scales — dark section */}
      <DarkSection>
        <DarkEyebrow>Two scales. One architecture.</DarkEyebrow>
        <DarkHeading>The same navigation physics that move one life move a civilisation.</DarkHeading>
        <DarkBody>NextUs operates at the civilisational scale — a map for the people already doing the work. The Horizon Suite operates at the personal scale — a navigation framework for individuals. These are not separate projects. A person who has learned to see their own life clearly is more capable of contributing to the larger work.</DarkBody>
      </DarkSection>

      {/* ── SECTION TWO — NIK (right-aligned) ── */}
      <div className="about-section" style={pageRight}>

        {/* Photograph — replace /nik.png with your actual image file in /public */}
        <div style={{ marginBottom: '52px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            width: 'clamp(200px, 40vw, 340px)',
            aspectRatio: '3/4',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1.5px solid rgba(200,146,42,0.70)',
            outline: '1.5px solid rgba(200,146,42,0.55)',
            outlineOffset: '5px',
            background: 'rgba(200,146,42,0.05)',
            position: 'relative',
          }}>
            <img
              src="/nik.jpeg"
              alt="Nik Wood"
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center top',
                display: 'block',
              }}
              onError={e => {
                // Graceful fallback if photo not yet added
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentNode.style.display = 'flex'
                e.currentTarget.parentNode.style.alignItems = 'center'
                e.currentTarget.parentNode.style.justifyContent = 'center'
                e.currentTarget.parentNode.style.background = 'rgba(200,146,42,0.05)'
              }}
            />
          </div>
        </div>

        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', ...gold, display: 'block', marginBottom: '14px' }}>Nik Wood · Founder</span>
        <h1 style={{ ...serif, fontSize: 'clamp(40px,5.5vw,64px)', fontWeight: 300, ...gold, lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: '16px' }}>
          The person<br />behind the work.
        </h1>
        <div style={{ width: '56px', height: '1px', background: '#C8922A', margin: '20px 0 32px', marginLeft: 'auto' }} />

        {/* Trust paragraph */}
        <p style={{ ...serif, fontSize: '18px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '32px', maxWidth: '600px', marginLeft: 'auto' }}>
          Nik has worked with people for over two decades. The consistent pattern across that time isn{'''}t a particular method {'—'} it{'''}s the result: people{'''}s lives become measurably better in the areas they came for help with, and often noticeably better in areas they didn{'''}t expect. Not because of what Nik does to them, but because of what becomes possible when someone is seen clearly and worked with honestly.
        </p>

        {/* Is this for you */}
        <div style={{ marginBottom: '48px', padding: '28px 32px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '14px', textAlign: 'left' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', ...gold, display: 'block', marginBottom: '12px' }}>Is this for you?</span>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, margin: '0 0 8px', maxWidth: '520px' }}>
            High-functioning, self-aware, and aware that functioning well isn{'''}t the same as living from what you{'''}re actually capable of. You{'''}ve done some work on yourself. Something still isn{'''}t moving.
          </p>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, margin: '0 0 20px', maxWidth: '520px' }}>
            That{'''}s the exact person this work is built for.
          </p>
          <a href="/work-with-nik" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '16px', fontWeight: 600, letterSpacing: '0.14em', textDecoration: 'none' }}>
            Work with Nik {'→'}
          </a>
        </div>

        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          Since 2001, Nik has been working at the intersection of personal development and civilisational navigation {'—'} first through the Life Athletics Podcast, now through the NextUs ecosystem.
        </p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          The work began with a simple observation: most people are not lost. They are unoriented. There is a difference — and the difference changes everything about what kind of attention actually moves a life forward.
        </p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          Over twenty years, that observation became a framework. The framework became tools. The tools became a platform.
        </p>

        <Featured right>A life worth living, a future worth building.</Featured>

        <Rule />

        <h2 style={{ ...serif, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 300, ...dark, lineHeight: 1.25, margin: '0 0 14px' }}>The long arm.</h2>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          Nik's mother was a naturopathic doctor, a shaman, and an adventurer. She surrounded him with healers, teachers, and practitioners — people who understood that the work of becoming a full human being was serious, worth doing, and worth doing well.
        </p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          There were challenges in his youth — abuse and bullying — and an early decision to move through them powerfully rather than be defined by them. Inspired by Jim Rohn's observation that you are the average of the five people you spend the most time with, Nik immersed himself in every course, book, and tape series he could find.
        </p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          Eventually, something shifted. People started noticing it. They asked if he could help them find it for themselves. By his early twenties he was being paid to coach. The question was never whether this was the work. It was always how far it could go.
        </p>

        <Rule />

        <h2 style={{ ...serif, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 300, ...dark, lineHeight: 1.25, margin: '0 0 14px' }}>Cracked open.</h2>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          In 2019, Nik broke his skull. What followed — recovery, cancer, the loss of his mother, and the loss of the friend who had saved his life — was not a detour from the work. It was the work, lived at full intensity.
        </p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          What came out the other side wasn't a new product line. It was a fundamentally different understanding of what this work is for — and the scale it needs to operate at.
        </p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          The podcast went quiet for seven years. The ecosystem was being built.
        </p>

        <Rule />

        <h2 style={{ ...serif, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 300, ...dark, lineHeight: 1.25, margin: '0 0 14px' }}>What drives this.</h2>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          Humanity as a whole is mostly operating the way a person operates when they have no clear direction and are carrying unresolved trauma — because that's mostly what humanity is made of.
        </p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          That's the starting point, not the verdict. There are tools that work at every stage of development. The work is matching the right one to the right stage — and then moving on from there.
        </p>
        <p style={{ ...body, fontSize: '16px', fontWeight: 300, ...dark, lineHeight: 1.8, marginBottom: '18px', maxWidth: '640px', marginLeft: 'auto' }}>
          Life on earth and humanity could be genuinely thriving, if that's what we individually and collectively aimed ourselves at.
        </p>

        <Rule />

        <h2 style={{ ...serif, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 300, ...dark, lineHeight: 1.25, margin: '0 0 14px' }}>Values.</h2>
        <div style={{ display: 'grid', gap: '4px', margin: '28px 0' }}>
          {[
            ['Nikhedonia', 'The particular joy that comes from watching others thrive.'],
            ['Ubuntu', 'I am because we are. In the spirit of Mandela.'],
            ['Wonderment', 'The capacity to be genuinely astonished by what is.'],
            ['Dymaxion', 'Maximum output from minimum input. In the spirit of Buckminster Fuller.'],
            ['Excelsior', 'Ever upward. In the spirit of Stan Lee.'],
            ['Enthusiasmos', 'To be filled with the divine. The animating fire.'],
            ['Wabi Sabi', 'The beauty of imperfection, impermanence, and incompleteness.'],
            ['Meliorism', 'The world can be made better through human effort. The belief beneath all of this.'],
          ].map(([name, desc]) => <Value key={name} name={name} desc={desc} />)}
        </div>

      </div>

      {/* Purpose statement — dark closing section */}
      <DarkSection style={{ textAlign: 'center' }}>
        <DarkEyebrow>The mission</DarkEyebrow>
        <DarkHeading>To live into a world where everyone is fully on their path and actively levelling up towards their full-yes life.</DarkHeading>
        <DarkBody style={{ color: '#A8721A', marginBottom: '40px' }}>To awaken and amplify the God-Spark of humanity.</DarkBody>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <DarkSolidButton href="/work-with-nik">Work directly with Nik →</DarkSolidButton>
          <DarkGhostButton href="/podcast">Listen to the podcast →</DarkGhostButton>
        </div>
      </DarkSection>

      <CivilisationalFramePanel />
      <TestimonialsPanel />
      <ToolCompassPanel />
      <SiteFooter />
    </div>
  )
}
