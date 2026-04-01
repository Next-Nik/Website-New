import { SiteNav } from '../components/SiteNav'
import { SprintPanel } from '../components/SprintPanel'
import { SiteFooter } from '../components/SiteFooter'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

export function AboutPage() {
  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <SiteNav active="about" />
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '112px 40px 120px' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>About</span>
        <h1 style={{ ...serif, fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: '18px' }}>Nik Wood.</h1>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, marginBottom: '64px', maxWidth: '500px' }}>Coach. Architect. Builder of systems for people ready to live fully {'\u2014'} and step towards a future worth building.</p>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 48px' }} />
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>This work started with a question that wouldn{'\u2019'}t go away: why do people who know what they should do still find it so hard to actually do it?</p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>Not lack of information. Not lack of will. Something structural {'\u2014'} a missing layer between knowing and living. Between the person who understands what a good life looks like and the person who actually builds one.</p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '48px', maxWidth: '600px' }}>That question became a decade of study, practice, and iteration. Life OS is the architecture that emerged. NextUs is where it points.</p>
        <div style={{ borderLeft: '2px solid rgba(200,146,42,0.20)', padding: '20px 0 20px 28px', margin: '0 0 64px', maxWidth: '560px' }}>
          <p style={{ ...serif, fontSize: '20px', fontStyle: 'italic', fontWeight: 300, color: '#0F1523', lineHeight: 1.65, margin: 0 }}>The personal work and the civilisational work are not separate projects. They are the same orientation, at different scales.</p>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 48px' }} />
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '20px', maxWidth: '600px' }}>Nik works directly with individuals through coaching and the Horizon Leap programme. He hosts the NextUs podcast {'\u2014'} 220+ episodes since 2015 {'\u2014'} and builds the tools and platforms that make this ecosystem accessible at scale.</p>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: '#0F1523', lineHeight: 1.8, marginBottom: '56px', maxWidth: '600px' }}>The goal is durable contribution {'\u2014'} tools that work, ideas that travel, a framework that outlasts any particular conversation.</p>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.20)', margin: '0 0 48px' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
          <a href="/work-with-nik" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: '#A8721A', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>Work with Nik {'\u2192'}</a>
          <a href="/podcast" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'transparent', color: '#A8721A', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', textDecoration: 'none' }}>Listen to the podcast</a>
        </div>
      </div>
      <SprintPanel />
      <SiteFooter />
    </div>
  )
}
