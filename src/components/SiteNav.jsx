import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function SiteNav({ active }) {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initial = user?.email
    ? (user.email.split('@')[0].charAt(0) || '?').toUpperCase()
    : null

  const links = [
    { href: '/',               label: 'Home',         key: 'home' },
    { href: '/life-os',        label: 'Life OS',       key: 'life-os' },
    { href: '/nextus',         label: 'NextUs',        key: 'nextus' },
    { href: '/work-with-nik',  label: 'Work with Nik', key: 'work-with-nik' },
    { href: '/about',          label: 'About',         key: 'about' },
    { href: '/podcast',        label: 'Podcast',       key: 'podcast' },
  ]

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(250,250,247,0.96)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(200,146,42,0.20)',
      }}>
        <div style={{
          maxWidth: '1040px', margin: '0 auto', padding: '0 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px',
        }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo_nav.png" alt="NextUs" style={{ height: '34px', width: 'auto', display: 'block' }} />
          </a>

          {/* Desktop links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="site-nav-links">
            {links.map(l => (
              <a key={l.key} href={l.href} style={{
                fontFamily: "'Cormorant SC', Georgia, serif",
                fontSize: '13px', letterSpacing: '0.10em',
                color: active === l.key ? '#0F1523' : 'rgba(15,21,35,0.78)',
                textDecoration: 'none',
                fontWeight: active === l.key ? 600 : 400,
              }}>{l.label}</a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <a href="/profile" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(200,146,42,0.10)',
                border: '1.5px solid rgba(200,146,42,1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Cormorant SC', Georgia, serif",
                fontSize: '13px', fontWeight: 600, color: '#A8721A',
                textDecoration: 'none', flexShrink: 0,
              }}>{initial}</a>
            ) : (
              <a href="/login" style={{
                padding: '10px 22px',
                borderRadius: '40px',
                border: '1.5px solid rgba(200,146,42,0.78)',
                background: 'rgba(200,146,42,0.05)',
                fontFamily: "'Cormorant SC', Georgia, serif",
                fontSize: '13px', fontWeight: 600,
                letterSpacing: '0.16em', color: '#A8721A',
                textDecoration: 'none',
              }}>Sign in</a>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Menu"
              style={{
                display: 'none', flexDirection: 'column', gap: '5px',
                cursor: 'pointer', background: 'none', border: 'none', padding: '4px',
              }}
              className="site-hamburger"
            >
              <span style={{ display: 'block', width: '22px', height: '1.5px', background: 'rgba(15,21,35,0.78)', borderRadius: '1px' }} />
              <span style={{ display: 'block', width: '22px', height: '1.5px', background: 'rgba(15,21,35,0.78)', borderRadius: '1px' }} />
              <span style={{ display: 'block', width: '22px', height: '1.5px', background: 'rgba(15,21,35,0.78)', borderRadius: '1px' }} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 999,
          background: '#FAFAF7',
          borderBottom: '1px solid rgba(200,146,42,0.20)',
          display: 'flex', flexDirection: 'column', padding: '8px 0',
        }}>
          {links.map(l => (
            <a key={l.key} href={l.href} style={{
              fontFamily: "'Cormorant SC', Georgia, serif",
              fontSize: '13px', letterSpacing: '0.10em',
              color: '#0F1523', textDecoration: 'none',
              padding: '14px 32px',
              borderBottom: '1px solid rgba(200,146,42,0.08)',
            }}>{l.label}</a>
          ))}
          {user
            ? <a href="/profile" style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.10em', color: '#A8721A', textDecoration: 'none', padding: '14px 32px' }}>Profile</a>
            : <a href="/login" style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.10em', color: '#A8721A', textDecoration: 'none', padding: '14px 32px' }}>Sign in {'\u2192'}</a>
          }
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .site-nav-links { display: none !important; }
          .site-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
