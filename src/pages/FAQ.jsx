import { useState } from 'react'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }

const FAQS = [
  {
    section: 'Getting started',
    items: [
      {
        q: 'Where do I begin?',
        a: 'If you\'re not sure, start with North Star — a short conversation that reads where you are and points you toward the right tool. If you\'d rather just dive in, The Map is a good first move: ten minutes, seven domains, an honest picture of where things actually stand.',
      },
      {
        q: 'Do I need to use all the tools?',
        a: 'No. Each tool is built for a specific stage of the journey. Most people will find one or two that are immediately relevant and the rest will make sense later — or not at all. You don\'t need to complete the suite to get something real out of it.',
      },
      {
        q: 'What order should I use the tools in?',
        a: 'There\'s no prescribed sequence, but the tools are built with a logic. Horizon State builds the regulated ground everything else stands on. The Map tells you where you are. Purpose Piece surfaces your contribution pattern. Target Sprint gives you a ninety-day operational arc. Horizon Practice keeps the daily thread. If you\'re new, North Star will suggest a starting point based on where you actually are.',
      },
      {
        q: 'Is this a self-help programme?',
        a: 'No. It\'s a navigation system. Self-help programmes tell you what to do. The Horizon Suite shows you where you are and where you\'re going — and leaves the navigation to you. The assumption underneath every tool is that you are capable, not broken.',
      },
    ],
  },
  {
    section: 'The tools',
    items: [
      {
        q: 'What is The Map?',
        a: 'A coherence audit across seven domains — Path, Spark, Body, Finances, Connection, Inner Game, and Signal. Not a quiz, not a score. It gives you a picture of where you are now and where you want to be. The most useful thing it does is make the whole terrain visible at once, so you stop fixing the wrong thing.',
      },
      {
        q: 'What is Purpose Piece?',
        a: 'A conversation that surfaces your contribution archetype, domain, and scale. Not what you do for work — what you\'re built for. It identifies the role you naturally occupy when you\'re operating at your best, which domain of life or society you\'re oriented toward, and at what scale your work tends to land.',
      },
      {
        q: 'What is Horizon State?',
        a: 'A daily twenty-minute guided audio practice for nervous system regulation. Not meditation in the traditional sense — it\'s a baseline practice. The floor beneath everything else. You cannot build on depleted ground, and most people are trying to.',
      },
      {
        q: 'What is Target Sprint?',
        a: 'A ninety-day sprint across three domains. You set a horizon goal, identify where you are now, and the tool reverse-engineers a route. Not a to-do list — a focused arc with a clear win condition. Built for people who know what they want and need an operational structure to move toward it.',
      },
      {
        q: 'What is Horizon Practice?',
        a: 'A daily practice layer for the T.E.A. framework — Thoughts, Emotions, Actions. Keeps the thread between sessions alive and builds the habit of showing up to the work consistently.',
      },
      {
        q: 'What is North Star?',
        a: 'A short conversational tool that reads where you are and recommends a starting point — for your own life, for the planet, or both. It\'s not on the main tools menu because it\'s a front door, not a destination. If you don\'t know where to begin, begin here.',
      },
    ],
  },
  {
    section: 'Your data',
    items: [
      {
        q: 'Is my data saved between sessions?',
        a: 'Yes. Everything you complete is saved to your account. Your Map results, Purpose Piece profile, sprint data, and practice history are all stored and visible from your Dashboard. The tools are designed to be returned to — your history is part of what makes them useful over time.',
      },
      {
        q: 'Who can see my responses?',
        a: 'Your data belongs to you. It is not shared with other users, not sold, and not used for advertising. Nik can see aggregated data for platform improvement purposes. Full details are in the Privacy Policy.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes. Reach out to support@nextus.world and we\'ll remove your account and all associated data.',
      },
    ],
  },
  {
    section: 'NextUs and the Horizon Suite',
    items: [
      {
        q: 'What\'s the difference between NextUs and the Horizon Suite?',
        a: 'The Horizon Suite is the personal navigation layer — tools for individuals to see clearly and move deliberately. NextUs is the civilisational layer — destination-setting infrastructure for humanity. They share the same seven-domain architecture at different scales. What you build in yourself is the same structure as what humanity is building collectively.',
      },
      {
        q: 'What is the fractal?',
        a: 'The seven domains of the Horizon Suite map directly onto the seven domains of NextUs. Path maps to Vision. Spark to Human Being. Body to Nature. Finances to Finance and Economy. Connection to Society. Inner Game to Legacy. Signal to Technology. The same physics, operating at different scales. Personal navigation and civilisational navigation are not two separate projects.',
      },
      {
        q: 'Is this connected to coaching with Nik?',
        a: 'The tools are designed to be useful on their own. Coaching with Nik is a separate, facilitated track — identity-level work for people ready to do something with what they find. You can find out more on the Work With Nik page.',
      },
    ],
  },
  {
    section: 'NextUs · Orgs and Individuals',
    items: [
      {
        q: 'What is "Orgs and Individuals"?',
        a: 'A living map of organisations, projects, and individuals working toward what NextUs calls Horizon Goals — a shared picture of what humanity is building toward across seven domains. It\'s not a directory of good organisations. It\'s a map of directional movement: who is working toward what, at what scale, with what degree of structural integrity.',
      },
      {
        q: 'How do actors get on the map?',
        a: 'Three ways. The NextUs team places actors directly through a curation process. Community members can nominate an organisation or practitioner via the Nominate form — those go into a review queue before going live. And anyone signed in can use the Place form, which runs an AI assessment on a URL or description and proposes a profile for review. Nothing from the community goes live without human review.',
      },
      {
        q: 'What is the alignment score?',
        a: 'A 0–9 assessment of how genuinely an actor is moving toward the Horizon Goal for their domain and scale. It is not a rating of how large, well-known, or well-funded they are. It is a structural assessment — does the work actually move in the direction it claims? A small local project doing honest work can score higher than a global institution running structural failure patterns. The score is a draft until reviewed; it is always subject to revision as more evidence emerges.',
      },
      {
        q: 'What do the score tiers mean?',
        a: 'Pattern Instance (0–4): the actor demonstrates a named structural failure pattern — visible on the map as a cautionary example, not a placement. Contested (5–6): net positive direction, but structural failure patterns are meaningfully active. Qualified (7–8): clear alignment, HAL conditions demonstrably operative, full placement on the default map. Exemplar (9): field-setting — others in this domain point to this actor as the standard. A score of 10 is never assigned by the platform; it is conferred by the field over time.',
      },
      {
        q: 'What are HAL conditions and Structural Failure Patterns?',
        a: 'HAL conditions — Horizon Alignment Library — are structural conditions that, when present, indicate genuine movement toward a Horizon Goal. Things like Mission Coherence, Structural Honesty, Genuine Contact, Recursive Learning. Structural Failure Patterns are mechanisms by which systems fail to move toward their stated goals — things like Metric Substitution, Scale Illusion, or Mission Drift by Funding Gravity. Both are used in the assessment to surface what is actually happening, not just what is claimed.',
      },
      {
        q: 'Who does the assessment?',
        a: 'The initial assessment is produced by an AI engine trained on the NextUs framework — HAL conditions, Structural Failure Patterns, alignment score anchors, and domain criteria. That produces a draft. Every placement is then reviewed by a human before going live. The AI scores are a starting point, not a verdict. The founder reviews contested and exemplar placements personally.',
      },
      {
        q: 'What are the domain scores on the Platform page?',
        a: 'Each of the seven NextUs domains has a gap score — a measure of how far humanity currently is from the Horizon Goal for that domain. These scores are only shown as meaningful numbers when they are verified and based on sufficient data. Until then, they show as "Illustrative" or "Insufficient data." We would rather show nothing than show a number that implies a rigour that doesn\'t yet exist.',
      },
      {
        q: 'Can I nominate myself or my own organisation?',
        a: 'Yes. Self-nomination is explicitly welcome — fill in the form as the submitter. The assessment criteria are the same regardless of who submits. If the work is genuinely aimed at the Horizon Goal for your domain and scale, and the evidence supports it, it belongs on the map.',
      },
      {
        q: 'What if I think a score is wrong?',
        a: 'Reach out at support@nextus.world with the actor name and your reasoning. The scores are drafts, not verdicts — new evidence, a better read of the structural conditions, or a change in the organisation\'s actual work can all move a score. The goal is accuracy, not finality.',
      },
      {
        q: 'What is the Self track?',
        a: 'The NextUs map has two tracks. Planet track covers organisations and projects working at civilisational scale. Self track covers practitioners, coaches, therapists, facilitators, and programmes helping individuals grow across the seven personal domains — Path, Spark, Body, Finances, Connection, Inner Game, and Signal. A single actor can appear on both tracks if their work operates genuinely at both scales.',
      },
    ],
  },
  {
    section: 'Beta programme',
    items: [
      {
        q: 'I\'m a beta tester. What does that mean?',
        a: 'You have full access to the Horizon Suite during the beta period. In exchange, your feedback shapes what gets built next. If something is confusing, broken, or missing — we want to know. Use the Support link on your Dashboard to reach us directly.',
      },
      {
        q: 'How do I give feedback?',
        a: 'From your Dashboard, scroll to the bottom of the rail and click Support. You can ask a question, report something broken, or tell us what\'s landing. Someone from the team will get back to you.',
      },
    ],
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        borderBottom: '1px solid rgba(200,146,42,0.12)',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '20px 0', cursor: 'pointer',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
        }}
      >
        <span style={{ ...body, fontSize: '17px', fontWeight: 300, color: '#0F1523', lineHeight: 1.5 }}>{q}</span>
        <span style={{
          flexShrink: 0, width: '20px', height: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#A8721A', fontSize: '18px', lineHeight: 1,
          transform: open ? 'rotate(45deg)' : 'none',
          transition: 'transform 0.18s ease',
          marginTop: '2px',
        }}>+</span>
      </button>
      {open && (
        <p style={{
          ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)',
          lineHeight: 1.8, margin: '0 0 20px', maxWidth: '620px',
        }}>
          {a}
        </p>
      )}
    </div>
  )
}

export function FAQPage() {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="faq" />

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: 'clamp(88px,10vw,112px) clamp(20px,5vw,40px) 120px' }}>

        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>
          Support
        </span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,60px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          Frequently asked questions.
        </h1>
        <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '64px', maxWidth: '520px' }}>
          If something isn't answered here, reach out directly at{' '}
          <a href="mailto:support@nextus.world" style={{ color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.35)' }}>
            support@nextus.world
          </a>
          {' '}or use the Support link on your Dashboard.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '56px' }}>
          {FAQS.map(section => (
            <div key={section.section}>
              <span style={{
                ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em',
                color: '#A8721A', display: 'block', marginBottom: '4px',
                textTransform: 'uppercase',
              }}>
                {section.section}
              </span>
              <div style={{ height: '1px', background: 'rgba(200,146,42,0.35)', marginBottom: '4px' }} />
              <div>
                {section.items.map(item => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '72px', padding: '32px',
          background: 'rgba(200,146,42,0.04)',
          border: '1px solid rgba(200,146,42,0.20)',
          borderRadius: '14px',
        }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '10px' }}>
            Still have a question?
          </span>
          <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px', maxWidth: '480px' }}>
            Reach out directly. Someone from the team will get back to you — no ticketing system, no bot.
          </p>
          <a
            href="mailto:support@nextus.world"
            style={{
              display: 'inline-block', padding: '13px 28px',
              borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)',
              background: 'transparent', color: '#A8721A',
              ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
              textDecoration: 'none',
            }}
          >
            Email support@nextus.world →
          </a>
        </div>

      </div>

      <SiteFooter />
    </div>
  )
}
