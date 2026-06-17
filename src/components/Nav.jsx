import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Nav({ activePath, hideHamburger = false }) {
  const { user }     = useAuth()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initial = user?.email
    ? (user.email.split('@')[0].charAt(0) || '?').toUpperCase()
    : null

  const links = [
    { to: '/',              label: 'Home',          key: 'home'          },
    { to: '/tools',         label: 'Tools',         key: 'tools'         },
    { to: '/nextmarket',    label: 'NextMarket',    key: 'nextmarket'    },
    { to: '/about',         label: 'About',         key: 'about'         },
    { to: '/work-with-nik', label: 'Work with Nik', key: 'work-with-nik' },
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
            <picture>
              {/* Darker gold mark on mobile — reads better on the light background */}
              <source srcSet="/logo_nav_mobile.png" media="(max-width: 640px)" />
              <img src="/logo_nav.png" alt="NextUs" />
            </picture>
          </Link>

          {/* Desktop centre — marketing nav links (signed-out only) */}
          <div className="nav-centre" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Marketing links — hidden when logged in */}
            {!user && (
              <ul className="nav-links" style={{ margin: 0, padding: 0 }}>
                {links.map(l => (
                  <li key={l.key}>
                    <Link to={l.to} className={isActive(l.key) ? 'active' : ''}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right — search + profile dot / sign in + hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user && (
              <Link to="/search" className="nav-search-icon" title="Search the Atlas" onClick={closeMobile}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="11.5" y1="11.5" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </Link>
            )}
            {user ? (
              <Link to="/dashboard" className="nav-profile-dot" title="Your profile" onClick={closeMobile}>
                {initial}
              </Link>
            ) : (
              <Link to="/login" className="nav-sign-in" onClick={closeMobile}>Sign in</Link>
            )}

            {/* Hamburger — visible on mobile only via CSS, hidden during practice */}
            {!hideHamburger && <button
              className="nav-hamburger"
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <line x1="4" y1="4" x2="16" y2="16" stroke="rgba(15,21,35,0.72)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="16" y1="4" x2="4" y2="16" stroke="rgba(15,21,35,0.72)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <line x1="3" y1="6"  x2="17" y2="6"  stroke="rgba(15,21,35,0.72)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="17" y2="10" stroke="rgba(15,21,35,0.72)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="3" y1="14" x2="17" y2="14" stroke="rgba(15,21,35,0.72)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>}
          </div>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="nav-mobile-menu">
          {/* Remaining links — hidden when logged in */}
          {!user && links.filter(l => l.key !== 'nextus-self').map(l => (
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

      <style>{`
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
        .nav-sign-in:hover { background: rgba(200,146,42,0.08); }

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
          .nav-hamburger   { display: flex !important; }
          .nav-mobile-menu { display: flex !important; }
        }
      `}</style>
    </>
  )
}
