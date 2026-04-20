import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

function LegalWrap({ title, eyebrow, subtitle, active, children }) {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath={active} />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '112px 40px 120px' }}>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>{eyebrow}</span>
        <h1 style={{ ...body, fontSize: 'clamp(36px,5vw,52px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: '24px' }} dangerouslySetInnerHTML={{ __html: title }} />
        <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.55)', marginBottom: '48px' }}>{subtitle}</p>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', marginBottom: '48px' }} />
        {children}
      </div>
      <SiteFooter />
    </div>
  )
}

function H2({ children }) {
  return <h2 style={{ ...body, fontSize: 'clamp(22px,3vw,28px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.2, marginBottom: '14px', marginTop: '48px' }}>{children}</h2>
}
function P({ children }) {
  return <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '18px', maxWidth: '600px' }}>{children}</p>
}
function UL({ items }) {
  return <ul style={{ paddingLeft: '24px', marginBottom: '18px', maxWidth: '600px' }}>{items.map((item, i) => <li key={i} style={{ ...body, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.75, marginBottom: '6px' }} dangerouslySetInnerHTML={{ __html: item }} />)}</ul>
}

export function PrivacyPage() {
  return (
    <LegalWrap eyebrow="Privacy" title="How we handle<br><em style='color:#A8721A;'>your information.</span>" subtitle="Last updated March 2026 · NextUs / Nik Wood" active="">
      <P>NextUs is built on the premise that honest self-knowledge is valuable {'—'} and that what you discover about yourself belongs to you. This policy explains what we collect, why, and what we do and don't do with it.</P>
      <P>The short version: we collect what we need to make the tools work and remember your progress. We don't sell your data. We don't share it with advertisers. We don't use it to build profiles for anyone other than you.</P>
      <H2>What we collect</H2>
      <P>When you create an account, we store your email address and a secure identifier. That's the minimum needed to keep your work attached to you across sessions.</P>
      <P>When you use the Horizon Suite tools, we store the outputs {'—'} your domain scores from The Map, your archetype and coordinates from Purpose Piece, your sprint data from Target Sprint. This is what makes your profile possible.</P>
      <P>We also store anything you write in the manual fields {'—'} your own words, your horizon statements, your notes. These are yours. They're stored so you can return to them.</P>
      <P>When you sign in via Google, Google provides us with your email address and basic profile information. We don't receive anything beyond what you explicitly authorise.</P>
      <H2>What we don't collect</H2>
      <UL items={["Payment information — we don't handle payments directly.", "Location data beyond what you choose to share in your profile.", "Browsing behaviour across other sites.", "Anything you don't explicitly give us."]} />
      <H2>Improving the tools</H2>
      <P>We may use anonymised, aggregated patterns from tool usage to improve how the tools work. We will never use your individual data to train external AI models, and we will never share your data with third parties for this purpose.</P>
      <H2>How we use it</H2>
      <P>Your data is used to make NextUs work for you {'—'} to authenticate you, populate your profile, remember your progress, and show you where your personal development connects to the civilisational project.</P>
      <H2>Third-party services</H2>
      <UL items={['<strong>Supabase</strong> — our database and authentication infrastructure.', '<strong>Vercel</strong> — our hosting infrastructure.', '<strong>Anthropic</strong> — the AI that powers the conversational tools.', '<strong>Kit (formerly ConvertKit)</strong> — our email platform for newsletters.']} />
      <H2>Your data is yours</H2>
      <P>You can request a copy of your data, ask us to delete your account, or ask any question about how your information is handled. Email <a href="mailto:hello@nextus.world" style={{ color: '#A8721A', textDecoration: 'none' }}>hello@nextus.world</a>.</P>
      <H2>Cookies</H2>
      <P>We use cookies only for authentication {'—'} to keep you signed in between visits. We don't use tracking cookies or advertising cookies.</P>
      <H2>Children</H2>
      <P>NextUs is not designed for or directed at anyone under 16.</P>
      <H2>Changes to this policy</H2>
      <P>If we make material changes to how we handle your data, we'll update this page and note the date.</P>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '48px 0 24px' }} />
      <P>Questions? <a href="mailto:hello@nextus.world" style={{ color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.3)' }}>hello@nextus.world</a></P>
    </LegalWrap>
  )
}

export function TermsPage() {
  return (
    <LegalWrap eyebrow="Terms of Service" title="Using NextUs<br><em style='color:#A8721A;'>in good faith.</span>" subtitle="Last updated March 2026 · NextUs / Nik Wood" active="">
      <P>These terms cover your use of nextus.world and the Horizon Suite tools {'—'} North Star, The Map, Purpose Piece, Horizon State, Target Sprint {'—'} and the NextUs platform.</P>
      <P>The spirit of these terms: use the platform honestly, treat what you find here with respect, and don't do things that would harm other people or the platform itself.</P>
      <H2>Your account</H2>
      <P>You need an account to save your progress and access your profile. You're responsible for keeping your login secure. You must be at least 16 years old to create an account.</P>
      <H2>Your content</H2>
      <P>Anything you write in the tools belongs to you. We don't claim ownership over it. We store it so you can access it.</P>
      <H2>What the platform is for</H2>
      <P>NextUs and the Horizon Suite are tools for honest self-knowledge and civilisational orientation. They're not therapy, not medical advice, not financial advice, and not a substitute for professional support when professional support is what's needed.</P>
      <H2>What you agree not to do</H2>
      <UL items={["Use the platform to harm, harass, or deceive other people.", "Attempt to access data that isn't yours.", "Use automated tools to scrape or overload the platform.", "Misrepresent yourself or your credentials in ways that affect other users.", "Reproduce or distribute platform content without permission."]} />
      <H2>Intellectual property</H2>
      <P>The platform, the tools, the domain architecture, the archetype frameworks, the Horizon Goals structure, and all copy on nextus.world are the work of Nik Wood and NextUs. They're protected by copyright.</P>
      <H2>The platform is a living thing</H2>
      <P>NextUs is being built in the open. Tools will change. Features will be added. Occasionally something will break. We'll fix it when it does.</P>
      <H2>Limitation of liability</H2>
      <P>We provide the platform as-is. We're not liable for decisions you make based on what you find here. If something goes wrong that is genuinely our fault, our liability is limited to the amount you've paid us in the preceding twelve months.</P>
      <H2>Ending your account</H2>
      <P>You can close your account any time by emailing <a href="mailto:hello@nextus.world" style={{ color: '#A8721A', textDecoration: 'none' }}>hello@nextus.world</a>.</P>
      <H2>Governing law</H2>
      <P>These terms are governed by the laws of the province of British Columbia, Canada.</P>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '48px 0 24px' }} />
      <P>Questions? <a href="mailto:hello@nextus.world" style={{ color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.3)' }}>hello@nextus.world</a></P>
    </LegalWrap>
  )
}
