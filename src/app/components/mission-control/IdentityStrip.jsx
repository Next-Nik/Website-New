// ─────────────────────────────────────────────────────────────
// IdentityStrip.jsx
//
// Replaces TopStrip. Two horizontal bands stacked:
//
//   ┌─────────────────────────────────────────────┐
//   │  NextUs                       [☰] [👤] [⚙]   │  brand bar
//   ├─────────────────────────────────────────────┤
//   │  Nik         Architect · Vision · Civil…    │  identity bar
//   └─────────────────────────────────────────────┘
//
// The brand bar holds the wordmark on the left (plain text, no
// affordance) and three icon buttons on the right: hamburger menu,
// Profile, Settings.
//
// The hamburger opens a small right-aligned dropdown with About,
// Podcast, and Work with Nik — the public-facing pages that live
// alongside the platform but aren't surfaced elsewhere in Mission
// Control's chrome.
//
// The identity bar holds the user's name on the left and their
// fit signature centred. When unplaced, the centre is left empty
// (no italic invite) — Purpose Piece now lives on the left rail
// as its own tile, so the strip no longer needs to surface it.
//
// Props:
//   userName:     string  — display name; capitalised on render
//   placement:    string  — fit signature OR null/empty when unplaced
//   onProfile:    () => void
//   onSettings:   () => void
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import IdentitySwitcher from './IdentitySwitcher'
import {
  GOLD, GOLD_DK, GOLD_RULE,
  TEXT_INK, TEXT_WHITE, TEXT_META, TEXT_WHITE_META,
  FONT_DISPLAY, FONT_SC,
  BG_PARCHMENT, BG_INK,
} from './tokens'

// Defensive capitalisation — handles any old data with lowercase names.
function capitaliseName(name) {
  if (!name) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}

const SITE_SECTIONS = [
  {
    heading: 'Explore',
    links: [
      { label: 'The Feed',          href: '/feed' },
      { label: 'Domains',           href: '/nextus' },
      { label: 'Orgs & Individuals', href: '/nextus/actors' },
      { label: 'Add org or Indiv',  href: '/nominate' },
    ],
  },
  {
    heading: 'About NextUs',
    links: [
      { label: 'About',         href: '/about' },
      { label: 'Podcast',       href: '/podcast' },
      { label: 'Work with Nik', href: '/work-with-nik' },
    ],
  },
]

export default function IdentityStrip({
  userName = 'Your name',
  placement = null,
  onProfile,
  onSettings,
}) {
  const displayName = capitaliseName(userName)
  const isPlaced = placement && placement !== 'PURPOSE PIECE NOT YET PLACED'

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <header className="mc-identity-strip">
      <style>{STRIP_CSS}</style>

      {/* BRAND BAR */}
      <div className="mc-brand-bar">
        <a href="/" className="mc-brand-wordmark" aria-label="NextUs home">
          <img src="/logo_nav.png" alt="NextUs" className="mc-brand-logo" />
        </a>
        <div className="mc-brand-actions">
          <div className="mc-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className={`mc-icon-btn${menuOpen ? ' mc-icon-btn--active' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Open site menu"
              title="Menu"
            >
              <HamburgerIcon />
            </button>
            {menuOpen && (
              <div className="mc-brand-menu mc-brand-menu--right" role="menu">
                {SITE_SECTIONS.map((section, sIdx) => (
                  <div key={section.heading} className="mc-brand-menu-section">
                    {sIdx > 0 && <div className="mc-brand-menu-divider" />}
                    <div className="mc-brand-menu-heading">{section.heading}</div>
                    {section.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="mc-brand-menu-item"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className="mc-icon-btn"
            onClick={onProfile}
            title="Profile"
            aria-label="Profile"
          >
            <ProfileIcon />
          </button>
          <button
            className="mc-icon-btn"
            onClick={onSettings}
            title="Settings"
            aria-label="Settings"
          >
            <GearIcon />
          </button>
        </div>
      </div>

      {/* IDENTITY BAR */}
      <div className="mc-identity-bar">
        <div className="mc-identity-name-wrap">
          <span className="mc-identity-name">{displayName}</span>
          <IdentitySwitcher personalName={displayName} />
        </div>
        <div className="mc-identity-fit">
          {isPlaced && (
            <span className="mc-fit-placed">{placement}</span>
          )}
        </div>
        <div className="mc-identity-spacer" aria-hidden="true" />
      </div>
    </header>
  )
}

// ─── Icons (inline SVG, currentColor) ─────────────────────────

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="7"  x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const STRIP_CSS = `
.mc-identity-strip {
  position: relative;
  /* Sits above the pole strip (z-index 10) so the Act-as and nav menus,
     which drop down into the pole row, paint over it instead of behind. */
  z-index: 20;
  border-bottom: 1px solid ${GOLD_RULE};
}
[data-stage="dark"] .mc-identity-strip {
  border-bottom: 1px solid rgba(88,160,138, 0.30);
}

/* ─── Brand bar ─────────────────────────
   Opaque parchment background — substrate is hidden behind the
   wordmark and icon row so they read cleanly. */

.mc-brand-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px 10px;
  background: ${BG_PARCHMENT};
}
[data-stage="dark"] .mc-brand-bar {
  background: ${BG_INK};
}

.mc-brand-wordmark {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  text-decoration: none;
  outline: none;
}
.mc-brand-wordmark:focus-visible {
  outline: 2px solid ${GOLD};
  outline-offset: 4px;
  border-radius: 2px;
}

.mc-brand-logo {
  height: 32px;
  width: auto;
  display: block;
  transition: opacity 160ms ease;
}
.mc-brand-wordmark:hover .mc-brand-logo {
  opacity: 0.82;
}

.mc-menu-wrap {
  position: relative;
  display: inline-block;
}

.mc-brand-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  background: ${BG_PARCHMENT};
  border: 1px solid rgba(88,160,138, 0.22);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 21, 35, 0.08);
  padding: 4px 0 6px;
  z-index: 20;
  animation: mcBrandMenuIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.mc-brand-menu--right {
  left: auto;
  right: 0;
}
[data-stage="dark"] .mc-brand-menu {
  background: ${BG_INK};
  border-color: rgba(88,160,138, 0.30);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.mc-brand-menu-item {
  display: block;
  padding: 10px 18px;
  font-family: ${FONT_SC};
  font-size: 13px;
  letter-spacing: 0.10em;
  color: ${TEXT_INK};
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.12s ease, color 0.12s ease;
}
.mc-brand-menu-item:hover {
  background: rgba(88,160,138, 0.08);
  color: ${GOLD_DK};
}
[data-stage="dark"] .mc-brand-menu-item { color: ${TEXT_WHITE}; }
[data-stage="dark"] .mc-brand-menu-item:hover {
  background: rgba(88,160,138, 0.12);
  color: ${GOLD};
}

.mc-brand-menu-section {
  display: block;
}

.mc-brand-menu-heading {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.18em;
  color: ${TEXT_META};
  text-transform: uppercase;
  padding: 8px 18px 4px;
  pointer-events: none;
}
[data-stage="dark"] .mc-brand-menu-heading {
  color: ${TEXT_WHITE_META};
}

.mc-brand-menu-divider {
  height: 1px;
  background: rgba(88,160,138, 0.18);
  margin: 6px 14px;
}
[data-stage="dark"] .mc-brand-menu-divider {
  background: rgba(88,160,138, 0.28);
}

@keyframes mcBrandMenuIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.mc-brand-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mc-icon-btn {
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: ${TEXT_META};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  transition: color 0.15s ease;
}
.mc-icon-btn:hover,
.mc-icon-btn--active { color: ${GOLD_DK}; }
[data-stage="dark"] .mc-icon-btn { color: ${TEXT_WHITE_META}; }
[data-stage="dark"] .mc-icon-btn:hover,
[data-stage="dark"] .mc-icon-btn--active { color: ${GOLD}; }

/* ─── Identity bar ───────────────────────
   Translucent parchment — substrate shows through faintly behind
   the name and fit signature, the way the v4 mockup specifies.
   Backdrop-filter softens the substrate so the type stays legible. */

.mc-identity-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: baseline;
  gap: 24px;
  padding: 8px 28px 14px;
  background: rgba(250, 250, 247, 0.62);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}
[data-stage="dark"] .mc-identity-bar {
  background: rgba(15, 21, 35, 0.62);
}

.mc-identity-name {
  font-family: ${FONT_DISPLAY};
  font-size: 34px;
  font-weight: 600;
  color: ${TEXT_INK};
  line-height: 1;
  letter-spacing: -0.005em;
}
[data-stage="dark"] .mc-identity-name { color: ${TEXT_WHITE}; }

.mc-identity-fit {
  text-align: center;
  font-family: ${FONT_SC};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: ${TEXT_META};
}
[data-stage="dark"] .mc-identity-fit { color: ${TEXT_WHITE_META}; }

.mc-fit-placed {
  text-transform: uppercase;
}

.mc-identity-name-wrap {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.mc-fit-invite {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: ${TEXT_META};
  font-family: ${FONT_DISPLAY};
  font-size: 15px;
  font-style: italic;
  letter-spacing: 0;
  transition: color 0.15s ease;
}
.mc-fit-invite em { font-style: italic; }
.mc-fit-invite:hover { color: ${GOLD_DK}; }
[data-stage="dark"] .mc-fit-invite { color: ${TEXT_WHITE_META}; }
[data-stage="dark"] .mc-fit-invite:hover { color: ${GOLD}; }

/* ─── Mobile breakpoints ───────────────── */

@media (max-width: 640px) {
  .mc-brand-bar {
    padding: 12px 16px 8px;
  }
  .mc-brand-logo {
    height: 28px;
  }
  .mc-icon-btn svg {
    width: 16px;
    height: 16px;
  }
  .mc-brand-menu {
    min-width: 200px;
  }
  .mc-brand-menu-item {
    padding: 11px 16px;
    font-size: 12px;
  }
  .mc-identity-bar {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 6px 16px 12px;
    text-align: left;
  }
  .mc-identity-name {
    font-size: 30px;
    font-weight: 700;
  }
  .mc-identity-fit {
    text-align: left;
    font-size: 11px;
    letter-spacing: 0.16em;
  }
  .mc-fit-invite {
    font-size: 14px;
  }
}
`
