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
    { to: '/earth',         label: 'Earth Challenge', key: 'earth'       },
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

          {/* Wordmark — compass mark + Lora text, scarf-gold `Us`, matching the four-beat home */}
          <Link to="/" className="nav-wordmark" onClick={closeMobile} aria-label="NextUs · home">
            <img src="/logo_nav.png" alt="" aria-hidden="true" className="nav-wordmark-logo" />
            <span className="nav-wordmark-text">Next<span>Us</span></span>
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

          {/* Right — practice + search + profile dot / sign in + hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user && (
              <Link to="/daily" className="nav-practice" title="Your daily tools" onClick={closeMobile}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3.4" />
                  <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" />
                </svg>
                <span>Daily Tools</span>
              </Link>
            )}
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
                  <line x1="4" y1="4" x2="16" y2="16" stroke="rgba(38,36,32,0.68)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="16" y1="4" x2="4" y2="16" stroke="rgba(38,36,32,0.68)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <line x1="3" y1="6"  x2="17" y2="6"  stroke="rgba(38,36,32,0.68)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="17" y2="10" stroke="rgba(38,36,32,0.68)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="3" y1="14" x2="17" y2="14" stroke="rgba(38,36,32,0.68)" strokeWidth="1.5" strokeLinecap="round"/>
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
          border: 1.5px solid rgba(76,107,69,0.55);
          background: rgba(76,107,69,0.06);
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.14em;
          color: #3c5637;
          text-decoration: none;
          transition: background 0.18s;
          white-space: nowrap;
        }
        .nav-sign-in:hover { background: rgba(76,107,69,0.10); }

        /* ── Practice — straight to the daily tools (logged-in only) ── */
        .nav-practice {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          border-radius: 40px;
          background: #4c6b45;
          color: #FFFFFF;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.18s, transform 0.18s;
        }
        .nav-practice:hover { background: #3f5b39; transform: translateY(-1px); }
        .nav-practice svg { display: block; }
        @media (max-width: 640px) {
          .nav-practice span { display: none; }
          .nav-practice { padding: 9px; }
        }

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
          background: rgba(233,237,228,0.98);
          border-bottom: 1px solid rgba(38,36,32,0.14);
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
          font-size: 13px;
          letter-spacing: 0.08em;
          color: rgba(38,36,32,0.68);
          text-decoration: none;
          border: none;
          background: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: color 0.15s;
        }
        .nav-mobile-link:hover { color: #262420; }
        .nav-mobile-link--cta {
          color: #3c5637;
          margin-top: 4px;
        }
        .nav-mobile-link--cta:hover { color: #3F4A37; }

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
