import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Nav({ activePath }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initial = user?.email
    ? (user.email.split('@')[0].charAt(0) || '?').toUpperCase()
    : null

  const links = [
    { to: '/',              label: 'Home',          key: 'home' },
    { to: '/life-os',       label: 'Life OS',       key: 'life-os' },
    { to: '/nextus',        label: 'NextUs',        key: 'nextus' },
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
        <Link to="/" className="nav-logo">
          <img src="/logo_nav.png" alt="NextUs" />
        </Link>

        <ul className="nav-links">
          {links.map(l => (
            <li key={l.key}>
              <Link
                to={l.to}
                className={isActive(l.key) ? 'active' : ''}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <Link to="/profile" className="nav-profile-dot" title="Your profile">
              {initial}
            </Link>
          ) : (
            <Link to="/login" className="nav-profile-dot" title="Sign in">
              {'\u2192'}
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
            className="site-hamburger"
            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', flexDirection: 'column', gap: '5px', display: 'none' }}
          >
            <span style={{ display: 'block', width: '22px', height: '1.5px', background: 'rgba(15,21,35,0.78)', borderRadius: '1px' }} />
            <span style={{ display: 'block', width: '22px', height: '1.5px', background: 'rgba(15,21,35,0.78)', borderRadius: '1px' }} />
            <span style={{ display: 'block', width: '22px', height: '1.5px', background: 'rgba(15,21,35,0.78)', borderRadius: '1px' }} />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div style={{
          position: 'fixed', top: '56px', left: 0, right: 0, zIndex: 999,
          background: '#FAFAF7', borderBottom: '1px solid rgba(200,146,42,0.20)',
          display: 'flex', flexDirection: 'column', padding: '8px 0',
        }}>
          {links.map(l => (
            <Link key={l.key} to={l.to} onClick={() => setMobileOpen(false)} style={{
              fontFamily: "'Cormorant SC', Georgia, serif",
              fontSize: '15px', letterSpacing: '0.10em',
              color: '#0F1523', textDecoration: 'none',
              padding: '14px 32px',
              borderBottom: '1px solid rgba(200,146,42,0.08)',
            }}>{l.label}</Link>
          ))}
          {user
            ? <Link to="/profile" onClick={() => setMobileOpen(false)} style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.10em', color: '#A8721A', textDecoration: 'none', padding: '14px 32px' }}>Profile</Link>
            : <Link to="/login" onClick={() => setMobileOpen(false)} style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.10em', color: '#A8721A', textDecoration: 'none', padding: '14px 32px' }}>Sign in {'\u2192'}</Link>
          }
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .site-hamburger { display: flex !important; }
          .nav-links { display: none !important; }
        }
      `}</style>
    </>
  )
}
