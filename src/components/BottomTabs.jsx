import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ToolDrawer } from './ToolDrawer'

const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

function HomeIcon({ active }) {
  const c = active ? '#A8721A' : 'rgba(15,21,35,0.4)'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3L19 9.5V19C19 19.55 18.55 20 18 20H14V14H8V20H4C3.45 20 3 19.55 3 19V9.5Z"
        stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function GridIcon({ active }) {
  const c = active ? '#A8721A' : 'rgba(15,21,35,0.4)'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.5" fill="none"/>
      <rect x="12" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.5" fill="none"/>
      <rect x="3" y="12" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.5" fill="none"/>
      <rect x="12" y="12" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.5" fill="none"/>
    </svg>
  )
}

function MoreIcon({ active }) {
  const c = active ? '#A8721A' : 'rgba(15,21,35,0.4)'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="5"  cy="11" r="1.5" fill={c}/>
      <circle cx="11" cy="11" r="1.5" fill={c}/>
      <circle cx="17" cy="11" r="1.5" fill={c}/>
    </svg>
  )
}

function MoreMenu({ onClose }) {
  const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

  const nextusLinks = [
    { label: 'Actors',    path: '/nextus/actors',   desc: 'Who is doing the work' },
    { label: 'Map',       path: '/nextus/map',       desc: 'Where the work is happening' },
    { label: 'Domains',   path: '/nextus',            desc: 'The seven domains' },
    { label: 'Nominate',  path: '/nextus/nominate',  desc: 'Add an actor' },
  ]

  const siteLinks = [
    { label: 'Work with Nik', path: '/work-with-nik' },
    { label: 'Podcast',       path: '/podcast' },
    { label: 'About',         path: '/about' },
  ]

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 1098,
        background: 'rgba(15,21,35,0.3)',
        backdropFilter: 'blur(2px)',
      }} />
      <div style={{
        position: 'fixed', bottom: '72px', left: '16px', right: '16px', zIndex: 1099,
        background: 'rgba(250,250,247,0.98)',
        border: '1px solid rgba(200,146,42,0.22)',
        borderRadius: '16px',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        animation: 'moreSlideUp 0.22s cubic-bezier(0.16,1,0.3,1) both',
        maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '12px 20px 8px' }}>
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: '#A8721A', textTransform: 'uppercase' }}>NextUs</span>
        </div>
        {nextusLinks.map(l => (
          <Link key={l.path} to={l.path} onClick={onClose} style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px',
            padding: '13px 20px', textDecoration: 'none',
            borderBottom: '1px solid rgba(200,146,42,0.08)',
            background: 'rgba(200,146,42,0.02)',
          }}>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.10em', color: '#0F1523' }}>{l.label}</span>
            <span style={{ ...serif, fontSize: '13px', fontStyle: 'italic', color: 'rgba(15,21,35,0.40)' }}>{l.desc}</span>
          </Link>
        ))}
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.15)' }}>
          {siteLinks.map((l, i) => (
            <Link key={l.path} to={l.path} onClick={onClose} style={{
              display: 'block', padding: '15px 20px',
              ...sc, fontSize: '15px', letterSpacing: '0.10em',
              color: 'rgba(15,21,35,0.65)', textDecoration: 'none',
              borderBottom: i < siteLinks.length - 1 ? '1px solid rgba(200,146,42,0.08)' : 'none',
            }}>{l.label}</Link>
          ))}
        </div>
      </div>
      <style>{`@keyframes moreSlideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </>
  )
}

export function BottomTabs() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [moreOpen,   setMoreOpen]   = useState(false)

  const initial = user?.email
    ? (user.email.split('@')[0].charAt(0) || '?').toUpperCase()
    : null

  const isHome    = pathname === '/'
  const isTools   = pathname.startsWith('/tools')
  const isMore    = ['/nextus','/work-with-nik','/podcast','/about'].some(p => pathname.startsWith(p))

  const tabs = [
    {
      key:   'home',
      label: 'Home',
      icon:  <HomeIcon active={isHome} />,
      active: isHome,
      action: null,
      to:    '/',
    },
    {
      key:    'tools',
      label:  'Tools',
      icon:   <GridIcon active={isTools || drawerOpen} />,
      active: isTools || drawerOpen,
      action: () => { setMoreOpen(false); setDrawerOpen(o => !o) },
      to:     null,
    },
    {
      key:    'more',
      label:  'More',
      icon:   <MoreIcon active={isMore || moreOpen} />,
      active: isMore || moreOpen,
      action: () => { setDrawerOpen(false); setMoreOpen(o => !o) },
      to:     null,
    },
  ]

  return (
    <>
      {moreOpen && <MoreMenu onClose={() => setMoreOpen(false)} />}
      <ToolDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <nav data-bottom-tabs style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '60px', zIndex: 1097,
        background: 'rgba(250,250,247,0.97)',
        borderTop: '1px solid rgba(200,146,42,0.18)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {tabs.map(tab => {
          const inner = (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px', padding: '8px 0', width: '100%',
            }}>
              {tab.icon}
              <span style={{
                ...sc, fontSize: '15px', letterSpacing: '0.10em',
                color: tab.active ? '#A8721A' : 'rgba(15,21,35,0.4)',
                lineHeight: 1,
              }}>{tab.label}</span>
            </div>
          )
          if (tab.action) {
            return (
              <button key={tab.key} onClick={tab.action} style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{inner}</button>
            )
          }
          return (
            <Link key={tab.key} to={tab.to} style={{
              flex: 1, display: 'flex', alignItems: 'center',
              justifyContent: 'center', textDecoration: 'none',
            }}>{inner}</Link>
          )
        })}
      </nav>
    </>
  )
}
