import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ToolDrawer } from './ToolDrawer'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

export function Nav({ activePath }) {
  const { user }     = useAuth()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const initial = user?.email
    ? (user.email.split('@')[0].charAt(0) || '?').toUpperCase()
    : null

  const links = [
    { to: '/life-os',       label: 'Horizon Suite',       key: 'life-os'       },
    { to: '/nextus',        label: 'NextUs',        key: 'nextus'        },
    { to: '/work-with-nik', label: 'Work with Nik', key: 'work-with-nik' },
    { to: '/about',         label: 'About',         key: 'about'         },
    { to: '/podcast',       label: 'Podcast',       key: 'podcast'       },
  ]

  function isActive(key) {
    if (activePath) return activePath === key
    if (key === 'home') return pathname === '/'
    return pathname.startsWith('/' + key)
  }

  function closeMobile() { setMobileOpen(false) }

  return (
    <>
      <nav className="site-nav">
        <div style={{
          maxWidth: '1040px', width: '100%', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>

          {/* Logo */}
          <Link to="/" className="nav-logo" onClick={closeMobile}>
            <img src="/logo_nav.png" alt="NextUs" />
          </Link>

          {/* Desktop centre — nav links + Tools pill */}
          <div className="nav-centre" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <ul className="nav-links" style={{ margin: 0, padding: 0 }}>
              {links.map(l => (
                <li key={l.key}>
                  <Link to={l.to} className={isActive(l.key) ? 'active' : ''}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Tools pill — deliberately outside nav-links ul */}
            <button
              className={`nav-tools-pill${drawerOpen ? ' nav-tools-pill--open' : ''}`}
              onClick={() => { setDrawerOpen(o => !o); setMobileOpen(false) }}
              aria-expanded={drawerOpen}
              aria-label="Open tools menu"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
              </svg>
              Tools
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
                style={{ transform: drawerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="2,3 5,7 8,3" stroke="currentColor" strokeWidth="1.3"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Right — profile dot / sign in + hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <Link to="/profile" className="nav-profile-dot" title="Your profile" onClick={closeMobile}>
                {initial}
              </Link>
            ) : (
              <Link to="/login" className="nav-sign-in" onClick={closeMobile}>Sign in</Link>
            )}

            {/* Hamburger — visible on mobile only via CSS */}
            <button
              className="nav-hamburger"
              onClick={() => { setMobileOpen(o => !o); setDrawerOpen(false) }}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <line x1="4" y1="4" x2="16" y2="16" stroke="rgba(15,21,35,0.78)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="16" y1="4" x2="4" y2="16" stroke="rgba(15,21,35,0.78)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <line x1="3" y1="6"  x2="17" y2="6"  stroke="rgba(15,21,35,0.78)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="17" y2="10" stroke="rgba(15,21,35,0.78)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="3" y1="14" x2="17" y2="14" stroke="rgba(15,21,35,0.78)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="nav-mobile-menu">
          {/* Life OS section */}
          <div className="nav-mobile-section">
            <Link to="/life-os" onClick={closeMobile} className="nav-mobile-link nav-mobile-link--heading">
              <span>Horizon Suite</span>
              <span style={{ ...serif, fontSize: '14px', fontStyle: 'italic',
                color: 'rgba(15,21,35,0.38)', fontWeight: 400, letterSpacing: 0 }}>
                Tools for your life
              </span>
            </Link>
            <button
              className="nav-mobile-link nav-mobile-tools-btn"
              onClick={() => { setDrawerOpen(true); setMobileOpen(false) }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
              </svg>
              Open Tools
            </button>
          </div>

          <div className="nav-mobile-divider" />

          {/* Remaining links */}
          {links.filter(l => l.key !== 'life-os').map(l => (
            <Link key={l.key} to={l.to} onClick={closeMobile} className="nav-mobile-link">
              {l.label}
            </Link>
          ))}

          {!user && (
            <Link to="/login" onClick={closeMobile} className="nav-mobile-link nav-mobile-link--cta">
              Sign in →
            </Link>
          )}
        </div>
      )}

      <ToolDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <style>{`
        /* ── Tools pill ── */
        .nav-tools-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 40px;
          border: 1.5px solid rgba(200,146,42,0.35);
          background: transparent;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 17px;
          letter-spacing: 0.12em;
          color: rgba(15,21,35,0.78);
          cursor: pointer;
          transition: border-color 0.18s, color 0.18s, background 0.18s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .nav-tools-pill:hover,
        .nav-tools-pill--open {
          border-color: rgba(200,146,42,0.78);
          color: #A8721A;
          background: rgba(200,146,42,0.06);
        }

        /* ── Sign in ── */
        .nav-sign-in {
          padding: 10px 22px;
          border-radius: 40px;
          border: 1.5px solid rgba(200,146,42,0.78);
          background: rgba(200,146,42,0.05);
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: 0.16em;
          color: #A8721A;
          text-decoration: none;
          transition: background 0.18s;
          white-space: nowrap;
        }
        .nav-sign-in:hover { background: rgba(200,146,42,0.10); }

        /* ── Hamburger (mobile only) ── */
        .nav-hamburger {
          display: none;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          flex-shrink: 0;
        }

        /* ── Mobile menu ── */
        .nav-mobile-menu {
          display: none;
          position: fixed;
          top: var(--nav-h);
          left: 0;
          right: 0;
          z-index: 999;
          background: rgba(250,250,247,0.98);
          border-bottom: 1px solid rgba(200,146,42,0.18);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          flex-direction: column;
          padding: 6px 0 14px;
          animation: mobileMenuSlide 0.2s cubic-bezier(0.16,1,0.3,1) both;
        }
        .nav-mobile-section {
          display: flex;
          flex-direction: column;
        }
        .nav-mobile-divider {
          height: 1px;
          background: rgba(200,146,42,0.12);
          margin: 4px 0;
        }
        .nav-mobile-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 28px;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 17px;
          letter-spacing: 0.10em;
          color: rgba(15,21,35,0.72);
          text-decoration: none;
          border: none;
          background: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: color 0.15s;
        }
        .nav-mobile-link:hover { color: #0F1523; }
        .nav-mobile-link--heading {
          justify-content: space-between;
          color: #0F1523;
          font-weight: 600;
        }
        .nav-mobile-tools-btn {
          color: #A8721A;
          padding-top: 8px;
          padding-bottom: 12px;
        }
        .nav-mobile-tools-btn:hover { color: #8A5C15; }
        .nav-mobile-link--cta {
          color: #A8721A;
          margin-top: 4px;
        }
        .nav-mobile-link--cta:hover { color: #8A5C15; }

        @keyframes mobileMenuSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Responsive breakpoints ── */
        @media (max-width: 640px) {
          .nav-centre      { display: none !important; }
          .nav-sign-in     { display: none !important; }
          .nav-hamburger   { display: flex !important; }
          .nav-mobile-menu { display: flex !important; }
        }
      `}</style>
    </>
  )
}
