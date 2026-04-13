import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { ToolCompassPanel } from '../components/ToolCompassPanel'
import { useAuth } from '../hooks/useAuth'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

// ── Stripe Checkout links ──────────────────────────────────────────────────
// Replace these with your real Stripe payment links once created.
// In Stripe Dashboard → Payment Links → Create link for each price.
// For subscriptions with a trial, set trial_period_days=14 on the price or subscription.
const LINKS = {
  foundation_monthly:  'https://buy.stripe.com/14AdR85hU17T91t4nsaMU0a',
  foundation_yearly:   'https://buy.stripe.com/00w5kCcKmg2N4Ld3joaMU0b',
  purpose_piece:       'https://buy.stripe.com/4gM9AS6lY5o9gtVcTYaMU09',
  map:                 'https://buy.stripe.com/cNi00i6lYaIt4Ld7zEaMU07',
  target_sprint:       'https://buy.stripe.com/9B69ASaCe7wh91tdY2aMU08',
  expansion_monthly:   'https://buy.stripe.com/5kQaEW7q24k56TlaLQaMU05',
  expansion_yearly:    'https://buy.stripe.com/dRm28qfWyaItelN6vAaMU06',
  lifeos_monthly:      'https://buy.stripe.com/dRmbJ0dOqdUFfpRaLQaMU03',
  lifeos_yearly:       'https://buy.stripe.com/bJe5kC25I8AlcdF9HMaMU04',
}

// Build payment links with client_reference_id so the webhook grants access
// to the logged-in account regardless of which billing email is used at checkout.
function usePaymentLinks(userId) {
  function link(base) {
    if (!userId) return base
    return `${base}?client_reference_id=${userId}`
  }
  return {
    foundation_monthly: link(LINKS.foundation_monthly),
    foundation_yearly:  link(LINKS.foundation_yearly),
    purpose_piece:      link(LINKS.purpose_piece),
    map:                link(LINKS.map),
    target_sprint:      link(LINKS.target_sprint),
    expansion_monthly:  link(LINKS.expansion_monthly),
    expansion_yearly:   link(LINKS.expansion_yearly),
    lifeos_monthly:     link(LINKS.lifeos_monthly),
    lifeos_yearly:      link(LINKS.lifeos_yearly),
  }
}

function PriceTag({ amount, period, note }) {
  return (
    <div style={{ marginBottom: '6px' }}>
      <span style={{ ...serif, fontSize: '28px', fontWeight: 300, color: '#0F1523' }}>${amount}</span>
      {period && <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', marginLeft: '6px' }}>{period}</span>}
      {note && <div style={{ ...serif, fontSize: '14px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', marginTop: '2px' }}>{note}</div>}
    </div>
  )
}

function ToolCard({ name, desc, monthly, yearly, oneTime, monthlyLink, yearlyLink, oneTimeLink, featured }) {
  return (
    <div style={{
      background: featured ? 'rgba(200,146,42,0.05)' : '#FFFFFF',
      border: featured ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.20)',
      borderRadius: '14px',
      padding: '28px 28px 24px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {featured && (
        <div style={{
          position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
          background: '#C8922A', color: '#FFFFFF',
          ...sc, fontSize: '12px', letterSpacing: '0.16em',
          padding: '4px 16px', borderRadius: '40px',
          whiteSpace: 'nowrap',
        }}>Best value</div>
      )}
      <div style={{ ...sc, fontSize: '17px', letterSpacing: '0.10em', color: '#A8721A', marginBottom: '8px' }}>{name}</div>
      <p style={{ ...serif, fontSize: '15px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.65)', lineHeight: 1.6, marginBottom: '20px', flex: 1 }}>{desc}</p>

      {oneTime && (
        <>
          <PriceTag amount={oneTime} note="one-time per sprint · past sprints always available" />
          <a href={oneTimeLink} target="_blank" rel="noopener" style={{ display: 'block', marginTop: '16px', padding: '12px 0', textAlign: 'center', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '15px', letterSpacing: '0.14em', textDecoration: 'none' }}>
            Get access →
          </a>
        </>
      )}

      {(monthly || yearly) && (
        <>
          {monthly && <PriceTag amount={monthly} period="/ month" />}
          {yearly && <PriceTag amount={yearly} period="/ year" note={monthly ? `save $${(monthly * 12 - yearly)} vs monthly` : null} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            {monthlyLink && (
              <a href={monthlyLink} target="_blank" rel="noopener" style={{ display: 'block', padding: '12px 0', textAlign: 'center', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '15px', letterSpacing: '0.14em', textDecoration: 'none' }}>
                Monthly →
              </a>
            )}
            {yearlyLink && (
              <a href={yearlyLink} target="_blank" rel="noopener" style={{ display: 'block', padding: '12px 0', textAlign: 'center', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'transparent', color: '#A8721A', ...sc, fontSize: '15px', letterSpacing: '0.14em', textDecoration: 'none' }}>
                Yearly (best value) →
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function PricingPage() {
  const { user } = useAuth()
  const L = usePaymentLinks(user?.id)
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav />
      <style>{`
        @media (max-width: 640px) {
          .pricing-main { padding-left: 24px !important; padding-right: 24px !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="pricing-main" style={{ maxWidth: '860px', margin: '0 auto', padding: '112px 40px 120px' }}>

        {/* Header */}
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Pricing</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          Start where you are.<br /><em style={{ color: '#A8721A' }}>Go as far as you need.</em>
        </h1>
        <p style={{ ...serif, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '64px', maxWidth: '520px' }}>
          Every tool is available individually. Or get everything in one place with The Horizon Suite — designed to pay for itself from the first month.
        </p>

        {/* The Horizon Suite — featured */}
        <div style={{ marginBottom: '48px' }}>
          <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '20px' }}>The full suite</span>
          <div style={{
            background: 'rgba(200,146,42,0.05)',
            border: '1.5px solid rgba(200,146,42,0.78)',
            borderRadius: '14px',
            padding: '36px 36px 32px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ ...sc, fontSize: '20px', letterSpacing: '0.10em', color: '#A8721A', marginBottom: '10px' }}>The Horizon Suite</div>
                <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, marginBottom: '16px', maxWidth: '440px' }}>
                  Horizon State · Purpose Piece · The Map · Target Sprint · Horizon Practice. All five tools. The full navigation system for your life. The bundle is designed so the maths is obvious — Horizon State and Horizon Practice subscriptions alone cost $44/month individually.
                </p>
                <div style={{ ...serif, fontSize: '14px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)' }}>
                  Includes everything. Nothing else to buy.
                </div>
              </div>
              <div style={{ flex: '0 1 220px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ ...serif, fontSize: '32px', fontWeight: 300, color: '#0F1523' }}>$49</span>
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', marginLeft: '6px' }}>/ month</span>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ ...serif, fontSize: '26px', fontWeight: 300, color: '#0F1523' }}>$399</span>
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', marginLeft: '6px' }}>/ year</span>
                  <div style={{ ...serif, fontSize: '13px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', marginTop: '2px' }}>save $189 vs monthly</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <a href={L.lifeos_monthly} target="_blank" rel="noopener" style={{ display: 'block', padding: '13px 0', textAlign: 'center', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '15px', letterSpacing: '0.14em', textDecoration: 'none' }}>
                    Monthly →
                  </a>
                  <a href={L.lifeos_yearly} target="_blank" rel="noopener" style={{ display: 'block', padding: '13px 0', textAlign: 'center', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'transparent', color: '#A8721A', ...sc, fontSize: '15px', letterSpacing: '0.14em', textDecoration: 'none' }}>
                    Yearly →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Individual tools */}
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '20px' }}>Individual tools</span>
        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '64px' }}>
          <ToolCard
            name="Horizon State"
            desc="The regulated ground beneath everything. Nervous system capacity, built daily."
            monthly={15}
            yearly={120}
            monthlyLink={L.foundation_monthly}
            yearlyLink={L.foundation_yearly}
          />
          <ToolCard
            name="The Map"
            desc="Seven domains. One honest picture of where you are and where you want to be. The most powerful tool in the suite."
            oneTime={59}
            oneTimeLink={L.map}
          />
          <ToolCard
            name="Purpose Piece"
            desc="Something in you already knows what you're built for. Purpose Piece finds your contribution archetype, your domain, and your scale — and puts language to it."
            oneTime={39}
            oneTimeLink={L.purpose_piece}
          />
          <ToolCard
            name="Target Sprint"
            desc="Three domains. Ninety days. A route reverse-engineered from where you want to be."
            oneTime={29}
            oneTimeLink={L.target_sprint}
          />
          <ToolCard
            name="Horizon Practice"
            desc="Daily practice. The return. T.E.A. — Thoughts, Emotions, Actions — aligned with your horizon."
            monthly={29}
            yearly={229}
            monthlyLink={L.expansion_monthly}
            yearlyLink={L.expansion_yearly}
          />
        </div>

        {/* Group Horizon */}
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.20)', paddingTop: '48px', marginBottom: '64px' }}>
          <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '20px' }}>Group Horizon</span>
          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 320px' }}>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '12px' }}>
                A 12-week cohort for people ready to do real work in the company of others doing the same. Six to eight people. A defined arc — from honest mapping through to purpose, horizon, and a 90-day sprint forward. Facilitated by Nik. Small enough that everyone is genuinely seen.
              </p>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7 }}>
                The Horizon Suite included for the duration. The Map and Purpose Piece completed before the cohort begins.
              </p>
            </div>
            <div style={{ flex: '0 1 220px' }}>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ ...serif, fontSize: '32px', fontWeight: 300, color: '#0F1523' }}>$600</span>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', marginLeft: '6px' }}>/ month</span>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ ...serif, fontSize: '20px', fontWeight: 300, color: '#0F1523' }}>$1,500</span>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', marginLeft: '6px' }}>paid in full</span>
                <div style={{ ...serif, fontSize: '13px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', marginTop: '2px' }}>save $300</div>
              </div>
              <a href="https://calendly.com/nikwood/talk-to-nik" target="_blank" rel="noopener" style={{ display: 'block', padding: '13px 0', textAlign: 'center', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'transparent', color: '#A8721A', ...sc, fontSize: '15px', letterSpacing: '0.14em', textDecoration: 'none' }}>
                Express interest →
              </a>
              <p style={{ ...serif, fontSize: '13px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', marginTop: '10px', textAlign: 'center' }}>Next cohort forming now. Six spots.</p>
            </div>
          </div>
        </div>

        {/* Work with Nik */}
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.20)', paddingTop: '48px', marginBottom: '64px' }}>
          <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '20px' }}>1:1 Work with Nik</span>
          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 320px' }}>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '12px' }}>
                One-on-one work for people pressing against the ceiling of their own excellence. Not a programme — a space calibrated precisely enough that something new becomes possible.
              </p>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, fontStyle: 'italic', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7 }}>
                "I'm 63 years old and just met myself for the first time working with Nik." — J.B.
              </p>
            </div>
            <div style={{ flex: '0 1 220px' }}>
              <div style={{ marginBottom: '6px' }}>
                <span style={{ ...serif, fontSize: '32px', fontWeight: 300, color: '#0F1523' }}>$3,500</span>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', marginLeft: '6px' }}>/ month</span>
              </div>
              <div style={{ ...serif, fontSize: '14px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', marginBottom: '20px' }}>
                Three-month minimum. The Horizon Suite included.
              </div>
              <a href="https://calendly.com/nikwood/talk-to-nik" target="_blank" rel="noopener" style={{ display: 'block', padding: '13px 0', textAlign: 'center', borderRadius: '40px', border: '1px solid rgba(168,114,26,0.8)', background: '#C8922A', color: '#FFFFFF', ...sc, fontSize: '15px', letterSpacing: '0.14em', textDecoration: 'none' }}>
                Book a discovery call →
              </a>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.20)', paddingTop: '48px' }}>
          <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '28px' }}>Questions</span>
          {[
            {
              q: 'Can I use a one-time tool more than once?',
              a: 'Yes. Purpose Piece and The Map are yours to return to as many times as you like — life changes, and your answers will too. Target Sprint is a one-time purchase per sprint; past sprints are always available to review.',
            },
            {
              q: "What's included in The Horizon Suite?",
              a: 'All five tools — Horizon State, Purpose Piece, The Map, Target Sprint, and Horizon Practice — for as long as your subscription is active. Nothing else to buy.',
            },
            {
              q: "What's Group Horizon?",
              a: 'A 12-week cohort of six to eight people, facilitated by Nik. A defined arc from honest mapping through to purpose, horizon, and a 90-day sprint forward. The Horizon Suite included. The Map and Purpose Piece are completed before the cohort begins — so you start at depth, not from scratch.',
            },
            {
              q: 'Is there a free trial?',
              a: 'Orienteering is always free — no sign-up required. It reads where you are and points you to the right starting point. Beta cohort members received a 14-day free trial of the full suite.',
            },
            {
              q: "What's the founding member pricing?",
              a: 'For the first 30 days after launch, founding member pricing offers 50% off everything. Use the code FOUNDING50 at checkout. For people who show up before the proof is overwhelming.',
            },
          ].map(({ q, a }) => (
            <div key={q} style={{ borderBottom: '1px solid rgba(200,146,42,0.12)', padding: '20px 0' }}>
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em', color: '#0F1523', marginBottom: '8px' }}>{q}</div>
              <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, margin: 0 }}>{a}</p>
            </div>
          ))}
        </div>

      </div>

      <ToolCompassPanel />
      <SiteFooter />
    </div>
  )
}
