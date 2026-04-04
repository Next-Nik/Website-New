import { useState } from 'react'

const TESTIMONIALS = [
  { name: 'Oliver William Huntley', quote: 'Nik really is a champion of your greatness. Working with him was truly an evolutionary experience. I felt so supported, honored and safe in his presence. He helped me learn about who I was at the core of my being — what I really wanted out of life — and how to live as the best version of myself. If you are ready to Up-Level and start truly winning in life, I highly recommend working with Nik.' },
  { name: 'Amy Jones', quote: 'I did two rounds of the Horizon Path / Level Up program. Nik is excellent at honing in where you\'re stuck and creating space for you to see your blind spots. It changed my life.' },
  { name: 'Amber N. Dugger', quote: 'Nik helped me uncover an incredible correlation that had been unknowingly holding me back from experiencing true play and embracing all that life has so graciously offered me. I highly recommend Nik to those that are looking to up-level and who desire an accelerated and compassionately guided journey to greatness.' },
  { name: 'Jennifer Macniven', quote: 'At the start of the course I set out my goals, I told Nik what I wanted my life to look like. Two weeks later I came to Nik apologising for not doing my homework — and started telling him I\'d met someone and gone on wonderful adventures, my work was expanding. He said "Jenn, look at what you wrote down in week one." I was already living it.' },
  { name: 'Nick Ward', quote: 'Before I started the program, I was 7/10 of the way to my fitness goals but without knowing it I had serious resistance towards going the rest of the way. Once I started working with Nik, his ability to pull out that one area of resistance made all the difference. It really was life changing.' },
  { name: 'Tom Hickman', quote: 'Highly recommend working with Nik as a coach, and getting to know him as a man. His programme is profound, practical and empowering, and founded on his own high level of authenticity and integrity.' },
  { name: 'Eva Lindblad', quote: 'Nik makes you look deeper and ask yourself the questions you rarely explore. He guides you into seeing yourself more clearly and thus you start truly knowing yourself. From this you can make the necessary adjustments to start levelling up your life.' },
  { name: 'Sascha Haert', quote: 'Nik\'s level-up program definitely changed my life. He has the ability to build up the right foundation and the right container to actually be able to be vulnerable and dig deep and go straight to where you need to.' },
  { name: 'Scott Mitchell Atkins', quote: 'When that last question hit me, I instantly knew what to do next because I stepped into full being of my highest destiny self — my Horizon self. My self-identity, who I was being, was instantly shifted.' },
  { name: 'Derek Loudermilk', quote: 'One of the things that really helped me was the ability to think about my future self — all the things they knew, all the talents and skills, all the problems they\'ve already solved — and then applying that way of being to my current self.' },
  { name: 'Tah Riq', quote: 'Through working with Nik in his program I was able to connect to my Horizon Self. I\'ve always been someone with lofty ambitions but this time I was really able to see a roadmap to the kind of self that I wanted to become and a framework for how to get there.' },
  { name: 'Ezra Johnson', quote: 'I loved the program. The Horizon Path gave me hope and determination as well as a wider perspective of what is possible.' },
  { name: 'Nick Hale', quote: 'While I went in with a particular intention, in the course I discovered there were other things more important than what I\'d originally intended to do. I came away feeling lighter, and more at ease with where I am in life and where I want to go.' },
  { name: 'Nadja Martens', quote: 'I enjoyed Nik\'s workshop a lot. I gained clarity about my goals and values in life as well as how to achieve those in an effortless and rather playful way.' },
  { name: 'Atlantis', quote: 'I feel forever connected to my level up group. The tools it gave me for expanding my awareness and action to formerly overlooked areas of my life are priceless, absolutely.' },
  { name: 'Jonny Freesh', quote: 'I took the Life Athletics level-up coaching program right before I made a really big life change — going from being a raw food entrepreneur to a full-time rapper — and the program really helped me step into that new life really powerfully.' },
  { name: 'Yoni Resnick', quote: 'Coming into the program I had many ideas and I didn\'t know how to actualize them. In this process I learned how to find the tools and what actions I needed to do to move one step at a time.' },
  { name: 'Sigourney Belle Weldon', quote: 'Nik helped me to work these fears out for myself and work through them in a way which I felt comfortable and safe. It\'s changed my life.' },
  { name: 'Tom McLoughlin', quote: 'I can\'t recommend this enough to anyone that wants to be the you that you aspire to be.' },
]

const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

export function TestimonialsPanel() {
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)

  const t = TESTIMONIALS[idx]

  return (
    <>
      {/* Right edge tab */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Read testimonials"
        style={{
          position: 'fixed',
          right: open ? '-60px' : '-14px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1500,
          background: '#FAFAF7',
          border: '1.5px solid rgba(200,146,42,0.78)',
          width: '44px',
          height: '88px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'all 0.25s ease',
          clipPath: 'polygon(100% 12%, 100% 88%, 70% 100%, 0% 100%, 0% 0%, 70% 0%)',
          borderRadius: '12px 0 0 12px',
        }}
      >
        <span style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          ...sc,
          fontSize: '0.8125rem',
          letterSpacing: '0.18em',
          color: '#A8721A',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}>
          Voices
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(15,21,35,0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div style={{
            width: 'min(480px, 92vw)',
            height: '100%',
            background: '#FAFAF7',
            borderLeft: '1.5px solid rgba(200,146,42,0.3)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.25s ease',
          }}>
            {/* Header */}
            <div style={{
              padding: '28px 24px 20px',
              borderBottom: '1px solid rgba(200,146,42,0.18)',
              position: 'sticky',
              top: 0,
              background: '#FAFAF7',
              zIndex: 1,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  What people say
                </span>
                <h2 style={{ ...sc, fontSize: '1.25rem', fontWeight: 400, color: '#0F1523', lineHeight: 1.1, marginBottom: '4px' }}>
                  Voices
                </h2>
                <p style={{ ...serif, fontSize: '0.8125rem', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6 }}>
                  {TESTIMONIALS.length} people · coaching, courses, and programmes
                </p>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(15,21,35,0.55)', fontSize: '1.25rem', lineHeight: 1, flexShrink: 0, marginTop: '2px' }}>×</button>
            </div>

            {/* Featured testimonial */}
            <div style={{ padding: '24px 24px 16px' }}>
              <div style={{ borderLeft: '2px solid rgba(200,146,42,0.35)', padding: '16px 0 16px 20px', marginBottom: '12px' }}>
                <p style={{ ...serif, fontSize: '1rem', fontStyle: 'italic', color: '#0F1523', lineHeight: 1.75, margin: '0 0 12px' }}>
                  "{t.quote}"
                </p>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#A8721A' }}>{t.name}</span>
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <button
                  onClick={() => setIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#A8721A', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                >← Prev</button>
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.35)' }}>
                  {idx + 1} / {TESTIMONIALS.length}
                </span>
                <button
                  onClick={() => setIdx(i => (i + 1) % TESTIMONIALS.length)}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#A8721A', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                >Next →</button>
              </div>
            </div>

            {/* All testimonials list */}
            <div style={{ padding: '0 16px 32px', borderTop: '1px solid rgba(200,146,42,0.12)' }}>
              <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase', padding: '16px 8px 12px' }}>All voices</div>
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '12px 14px', marginBottom: '4px',
                    borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: i === idx ? 'rgba(200,146,42,0.08)' : 'transparent',
                    borderLeft: i === idx ? '2px solid rgba(200,146,42,0.78)' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (i !== idx) e.currentTarget.style.background = 'rgba(200,146,42,0.04)' }}
                  onMouseLeave={e => { if (i !== idx) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: i === idx ? '#A8721A' : 'rgba(15,21,35,0.72)', marginBottom: '3px' }}>{t.name}</div>
                  <div style={{ ...serif, fontSize: '13px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    "{t.quote.substring(0, 80)}..."
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Close tab */}
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              right: 'min(480px, 92vw)',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2100,
              background: '#FAFAF7',
              border: '1.5px solid rgba(200,146,42,0.78)',
              borderRight: 'none',
              width: '44px',
              height: '88px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              clipPath: 'polygon(28% 12%, 28% 88%, 30% 100%, 100% 100%, 100% 0%, 30% 0%)',
              borderRadius: '0 12px 12px 0',
            }}
          >
            <span style={{ ...sc, fontSize: '13px', color: '#A8721A' }}>×</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
