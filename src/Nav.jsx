import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ToolDrawer } from './ToolDrawer'

export function Nav({ activePath }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const initial = user?.email
    ? (user.email.split('@')[0].charAt(0) || '?').toUpperCase()
    : null

  const links = [
    { to: '/',              label: 'Home',          key: 'home' },
    { to: '/nextus',        label: 'NextUs',        key: 'nextus' },
    { to: '/work-with-nik', label: 'Work with Nik', key: 'work-with-nik' },
    { to: '/pricing',       label: 'Pricing',       key: 'pricing' },
    { to: '/about',         label: 'About',         key: 'about' },
    { to: '/podcast',       label: 'Podcast',       key: 'podcast' },
  ]

  function isActive(key) {
    if (activePath) return activePath === key
    if (key === 'home') return pathname === '/'
    return pathname.startsWith('/' + key)
  }

  const isInTool = pathname.startsWith('/tools')

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <Link to="/profile" className="nav-profile-dot" title="Your profile">
                {initial}
              </Link>
            ) : (
              <Link to="/login" style={{
                padding: '10px 22px', borderRadius: '40px',
                border: '1.5px solid rgba(200,146,42,0.78)',
                background: 'rgba(200,146,42,0.05)',
                fontFamily: "'Cormorant SC', Georgia, serif",
                fontSize: '17px', fontWeight: 600,
                letterSpacing: '0.16em', color: '#A8721A',
                textDecoration: 'none',
              }}>Sign in</Link>
            )}
          </div>
        </div>
      </nav>

      <ToolDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <style>{`
        @media (max-width: 640px) {
          .nav-centre { display: none !important; }
          .site-nav { padding: 0 24px !important; }
        }
      `}</style>
    </>
  )
}
