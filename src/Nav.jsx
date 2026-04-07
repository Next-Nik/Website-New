import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ToolDrawer } from './ToolDrawer'

export function Nav({ activePath }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const initial = user?.email
    ? (user.email.split('@')[0].charAt(0) || '?').toUpperCase()
    : null

  const links = [
    { to: '/',              label: 'Home',          key: 'home' },
    { to: '/nextus',        label: 'NextUs',        key: 'nextus' },
    { to: '/life-os',       label: 'Life OS',       key: 'life-os' },
    { to: '/work-with-nik', label: 'Work with Nik', key: 'work-with-nik' },
    { to: '/about',         label: 'About',         key: 'about' },
    { to: '/podcast',       label: 'Podcast',       key: 'podcast' },
  ]

  function isActive(key) {
    if (activePath) return activePath === key
    if (key === 'home') return pathname === '/'
    return pathname.startsWith('/' + key)
  }

  return (
    <>
      <nav className="site-nav">
        <div style={{ maxWidth: '1040px', width: '100%', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <Link to="/" className="nav-logo">
            <img src="/logo_nav.png" alt="NextUs" />
          </Link>

          {/* Desktop centre — Tools + nav links */}
          <div className="nav-centre" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ul className="nav-links" style={{ margin: 0, padding: 0 }}>
              {links.map(l => (
                <li key={l.key}>
                  <Link to={l.to} className={isActive(l.key) ? 'active' : ''}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setDrawerOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '40px',
                    border: `1.5px solid ${drawerOpen ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.35)'}`,
                    background: drawerOpen ? 'rgba(200,146,42,0.08)' : 'transparent',
                    fontFamily: "'Cormorant SC', Georgia, serif",
                    fontSize: '17px', letterSpacing: '0.12em',
                    color: drawerOpen ? '#A8721A' : 'rgba(15,21,35,0.78)',
                    cursor: 'pointer', transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => {
                    if (!drawerOpen) {
                      e.currentTarget.style.borderColor = 'rgba(200,146,42,0.6)'
                      e.currentTarget.style.color = '#A8721A'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!drawerOpen) {
                      e.currentTarget.style.borderColor = 'rgba(200,146,42,0.35)'
                      e.currentTarget.style.color = 'rgba(15,21,35,0.78)'
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                    <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                    <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                    <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                  </svg>
                  Tools
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                    style={{ transform: drawerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="2,3 5,7 8,3" stroke="currentColor" strokeWidth="1.3"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </li>
            </ul>
          </div>

          {/* Right — profile / sign in */}
          <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <Link to="/profile" className="nav-profile-dot" title="Your profile">
                {initial}
              </Link>
            ) : (
              <Link to="/login" className="nav-signin-btn" style={{
                padding: '10px 22px', borderRadius: '40px',
                border: '1.5px solid rgba(200,146,42,0.78)',
                background: 'rgba(200,146,42,0.05)',
                fontFamily: "'Cormorant SC', Georgia, serif",
                fontSize: '17px', fontWeight: 600,
                letterSpacing: '0.16em', color: '#A8721A',
                textDecoration: 'none',
              }}>Sign in</Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Open menu"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px', color: '#0F1523',
              }}
            >
              {mobileMenuOpen ? (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <line x1="5" y1="5" x2="17" y2="17" stroke="#0F1523" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="17" y1="5" x2="5" y2="17" stroke="#0F1523" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <line x1="4" y1="7" x2="18" y2="7" stroke="#0F1523" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="4" y1="11" x2="18" y2="11" stroke="#0F1523" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="4" y1="15" x2="18" y2="15" stroke="#0F1523" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile full-screen menu */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(250,250,247,0.99)',
          backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column',
          paddingTop: '80px',
        }}>
          {/* Close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'absolute', top: '20px', right: '24px',
              background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <line x1="5" y1="5" x2="17" y2="17" stroke="#0F1523" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="17" y1="5" x2="5" y2="17" stroke="#0F1523" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          <nav style={{ padding: '0 32px', flex: 1 }}>
            {links.map((l, i) => (
              <Link
                key={l.key}
                to={l.to}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'block',
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 'clamp(28px,7vw,40px)',
                  fontWeight: 300,
                  color: isActive(l.key) ? '#A8721A' : '#0F1523',
                  textDecoration: 'none',
                  padding: '16px 0',
                  borderBottom: '1px solid rgba(200,146,42,0.12)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.1,
                  animation: `mobileNavIn 0.3s ${i * 0.05}s both`,
                }}
              >
                {l.label}
              </Link>
            ))}

            {/* Tools link */}
            <button
              onClick={() => { setMobileMenuOpen(false); setDrawerOpen(true) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 'clamp(28px,7vw,40px)',
                fontWeight: 300,
                color: '#0F1523',
                background: 'none', border: 'none',
                padding: '16px 0',
                borderBottom: '1px solid rgba(200,146,42,0.12)',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
                cursor: 'pointer',
                animation: `mobileNavIn 0.3s ${links.length * 0.05}s both`,
              }}
            >
              Tools
            </button>

            {/* Sign in / profile */}
            <div style={{ marginTop: '40px', animation: `mobileNavIn 0.3s ${(links.length + 1) * 0.05}s both` }}>
              {user ? (
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} style={{
                  display: 'inline-block',
                  padding: '14px 32px', borderRadius: '40px',
                  border: '1.5px solid rgba(200,146,42,0.78)',
                  background: 'rgba(200,146,42,0.05)',
                  fontFamily: "'Cormorant SC', Georgia, serif",
                  fontSize: '16px', fontWeight: 600,
                  letterSpacing: '0.16em', color: '#A8721A',
                  textDecoration: 'none',
                }}>Profile</Link>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{
                  display: 'inline-block',
                  padding: '14px 32px', borderRadius: '40px',
                  border: '1.5px solid rgba(200,146,42,0.78)',
                  background: 'rgba(200,146,42,0.05)',
                  fontFamily: "'Cormorant SC', Georgia, serif",
                  fontSize: '16px', fontWeight: 600,
                  letterSpacing: '0.16em', color: '#A8721A',
                  textDecoration: 'none',
                }}>Sign in</Link>
              )}
            </div>
          </nav>
        </div>
      )}

      <ToolDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <style>{`
        @media (max-width: 640px) {
          .nav-centre { display: none !important; }
          .nav-signin-btn { display: none !important; }
          .nav-profile-dot { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .site-nav { padding: 0 24px !important; }
        }
        @keyframes mobileNavIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
