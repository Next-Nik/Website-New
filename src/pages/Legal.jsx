import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { body, sc } from '../lib/designTokens'

// ── Versioning ──────────────────────────────────────────────
// Bump this when Terms content changes materially.
// Users are re-prompted to accept the new version on next sign-in.
export const TERMS_VERSION = '2026-04-23'

function LegalWrap({ title, eyebrow, subtitle, active, children }) {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100dvh' }}>
      <Nav activePath={active} />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '112px 40px 120px' }}>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>{eyebrow}</span>
        <h1 style={{ ...body, fontSize: 'clamp(36px,5vw,52px)', fontWeight: 400, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: '24px' }} dangerouslySetInnerHTML={{ __html: title }} />
        <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.55)', marginBottom: '48px' }}>{subtitle}</p>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', marginBottom: '48px' }} />
        {children}
      </div>
      <SiteFooter />
    </div>
  )
}

function H2({ children }) {
  return <h2 style={{ ...body, fontSize: 'clamp(22px,3vw,28px)', fontWeight: 400, color: '#0F1523', lineHeight: 1.2, marginBottom: '14px', marginTop: '48px' }}>{children}</h2>
}
function P({ children }) {
  return <p style={{ ...body, fontSize: '16px', fontWeight: 400, color: '#0F1523', lineHeight: 1.75, marginBottom: '18px', maxWidth: '600px' }}>{children}</p>
}
function UL({ items }) {
  return <ul style={{ paddingLeft: '24px', marginBottom: '18px', maxWidth: '600px' }}>{items.map((item, i) => <li key={i} style={{ ...body, fontSize: '16px', fontWeight: 400, color: '#0F1523', lineHeight: 1.75, marginBottom: '6px' }} dangerouslySetInnerHTML={{ __html: item }} />)}</ul>
}

// ── Shared content components ───────────────────────────────
// Exported so the Terms acceptance modal renders identical content.

export function TermsContent() {
  return (
    <>
      <P>NextUs is being built in the open. These terms cover what we ask of you, and what you can ask of us, while we build it together.</P>
      <P>The spirit: use the platform honestly, treat what you find here with respect, and assume good faith on both sides.</P>
      <H2>Your account, your data, your words</H2>
      <P>You need an account to save your progress. You're responsible for keeping your login secure. You must be at least 16.</P>
      <P>Anything you write in the tools belongs to you. We don't claim ownership over it. We store it so you can come back to it.</P>
      <P>You can close your account any time from Mission Control {'→'} Settings. Deletion is immediate and removes your data from our active systems.</P>
      <H2>What this is for {'—'} and what it isn't</H2>
      <P>NextUs is a developmental tool for honest self-knowledge and civilisational orientation. It's structured reflection, planning, and the work of figuring out where you're going.</P>
      <P>It is not therapy. Not crisis support. Not a substitute for medical, psychiatric, or psychological care. If you're in active crisis or serious distress, please reach out to a trained professional or a crisis service first. The platform will be here when you're ready.</P>
      <P>If you're working with a therapist or doctor on something significant, consider bringing the work you do here into that relationship rather than letting it stand alone.</P>
      <H2>What we ask you not to do</H2>
      <UL items={["Harm, harass, or deceive other people through the platform.", "Try to access data that isn't yours.", "Run scrapers or anything that overloads the platform.", "Misrepresent yourself or your credentials in ways that affect other users.", "Reproduce or redistribute platform content without permission."]} />
      <H2>Our work, your work</H2>
      <P>The platform, the tools, the domain architecture, the archetype frameworks, the Horizon Goals structure, and the writing on nextus.world are Nik Wood's work. Your own writing and your own data are yours.</P>
      <H2>This is a living thing</H2>
      <P>The platform changes. Tools get added. Features get refined. Occasionally something breaks {'—'} we'll fix it when it does. By using NextUs you're joining something in motion, not arriving at something finished.</P>
      <H2>The leap of faith, named</H2>
      <P>NextUs is not yet a registered company. It's being built in good faith, by a real person, with the intention of becoming a real organisation as it grows. Until that happens, your relationship is with Nik Wood directly.</P>
      <P>If you have a concern, a complaint, or a dispute, the first step is a conversation. Email <a href="mailto:support@nextus.world" style={{ color: '#A8721A', textDecoration: 'none' }}>support@nextus.world</a> and we'll handle it like humans. When NextUs is incorporated, these terms will be updated to reflect proper jurisdiction and corporate structure.</P>
      <H2>Limitation</H2>
      <P>We provide the platform as-is. We're not liable for decisions you make based on what you find here. The platform is a thinking partner, not a prescriber.</P>
    </>
  )
}

export function PrivacyContent() {
  return (
    <>
      <P>NextUs is built on the premise that honest self-knowledge is valuable {'—'} and that what you discover about yourself belongs to you. This policy explains what we collect, why, and what we do and don't do with it.</P>
      <P>The short version: we collect what we need to make the tools work and remember your progress. We don't sell your data. We don't share it with advertisers. We don't use it to build profiles for anyone other than you.</P>
      <H2>What we collect</H2>
      <P>When you create an account, we store your email address and a secure identifier. That's the minimum needed to keep your work attached to you across sessions.</P>
      <P>When you use the Horizon Suite tools, we store the outputs {'—'} your domain scores from The Map, your archetype and coordinates from Purpose Piece, your stretch data from Target Stretch. This is what makes your profile possible.</P>
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
      <P>You can delete your account any time from Mission Control {'→'} Settings. For a copy of your data or any other request, email <a href="mailto:support@nextus.world" style={{ color: '#A8721A', textDecoration: 'none' }}>support@nextus.world</a>.</P>
      <H2>Cookies</H2>
      <P>We use cookies only for authentication {'—'} to keep you signed in between visits. We don't use tracking cookies or advertising cookies.</P>
      <H2>Children</H2>
      <P>NextUs is not designed for or directed at anyone under 16.</P>
      <H2>Changes to this policy</H2>
      <P>If we make material changes to how we handle your data, we'll update this page and note the date.</P>
    </>
  )
}

export function PrivacyPage() {
  return (
    <LegalWrap eyebrow="Privacy" title="How we handle<br><em style='color:#A8721A;'>your information.</em>" subtitle="Last updated April 2026 · NextUs / Nik Wood" active="">
      <PrivacyContent />
      <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '48px 0 24px' }} />
      <P>Questions? <a href="mailto:hello@nextus.world" style={{ color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.3)' }}>hello@nextus.world</a></P>
    </LegalWrap>
  )
}

export function TermsPage() {
  return (
    <LegalWrap eyebrow="Terms of Service" title="Using NextUs<br><em style='color:#A8721A;'>in good faith.</em>" subtitle="Last updated April 2026 · NextUs / Nik Wood" active="">
      <TermsContent />
      <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '48px 0 24px' }} />
      <P>Questions? <a href="mailto:hello@nextus.world" style={{ color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.3)' }}>hello@nextus.world</a></P>
    </LegalWrap>
  )
}
