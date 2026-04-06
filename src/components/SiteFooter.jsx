export function SiteFooter() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(200,146,42,0.20)',
      padding: '64px 40px 48px',
      background: '#F5F2EC',
    }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', gap: '24px', flexWrap: 'wrap' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', fontStyle: 'italic', fontWeight: 300, color: 'rgba(15,21,35,0.88)' }}>
            A life worth living. A future worth building.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
            <a href="https://www.instagram.com/nikwood.world/" target="_blank" rel="noopener" aria-label="Instagram" style={{ color: 'rgba(15,21,35,0.55)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="https://www.youtube.com/@NextUs-World" target="_blank" rel="noopener" aria-label="YouTube" style={{ color: 'rgba(15,21,35,0.55)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="https://substack.com/@nextus" target="_blank" rel="noopener" aria-label="Substack" style={{ color: 'rgba(15,21,35,0.55)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.55 }}><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>
            </a>
            <a href="https://open.spotify.com/show/65LzAbOCuOZW7mvHTKsIbY" target="_blank" rel="noopener" aria-label="Podcast" style={{ color: 'rgba(15,21,35,0.55)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 11.8c2.2-.7 5.8-.6 8 1.2"/><path d="M6.5 14.5c3-1.3 7.5-.8 10 1.5"/><path d="M9.5 9c1.5-.4 4.5-.3 6.5.8"/></svg>
            </a>
          </div>
        </div>
        <div style={{ height: '1px', background: 'rgba(200,146,42,0.20)', marginBottom: '28px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)' }}>
            {'\u00A9'} 2026 NextUs {'\u00B7'} Nik Wood
          </span>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="/privacy" style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none' }}>Privacy</a>
            <a href="/terms" style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none' }}>Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
