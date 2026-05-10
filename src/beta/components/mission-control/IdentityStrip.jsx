// ─────────────────────────────────────────────────────────────
// IdentityStrip.jsx
//
// Replaces TopStrip. Two horizontal bands stacked:
//
//   ┌─────────────────────────────────────────────┐
//   │  NextUs ▾                          [👤] [⚙]   │  brand bar
//   ├─────────────────────────────────────────────┤
//   │  Nik         Architect · Vision · Civil…    │  identity bar
//   └─────────────────────────────────────────────┘
//
// The brand bar holds the wordmark on the left and small Profile
// + Settings affordances on the right.
//
// The wordmark is a dropdown trigger. Clicking it opens a small
// menu with About, Podcast, and Work with Nik — the public-facing
// pages that live alongside the platform but aren't surfaced
// elsewhere in Mission Control's chrome.
//
// The identity bar holds the user's name on the left and their
// fit signature centred. When unplaced, the centre reads
// "find your fit" in italic as a soft invitation (links to the
// Purpose Piece tile via onFindFitClick).
//
// Props:
//   userName:     string  — display name; capitalised on render
//   placement:    string  — fit signature OR null/empty when unplaced
//   onProfile:    () => void
//   onSettings:   () => void
//   onFindFit:    () => void  — invoked when unplaced "find your fit" clicked
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
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

const SITE_LINKS = [
  { label: 'About',         href: '/about' },
  { label: 'Podcast',       href: '/podcast' },
  { label: 'Work with Nik', href: '/work-with-nik' },
]

export default function IdentityStrip({
  userName = 'Your name',
  placement = null,
  onProfile,
  onSettings,
  onFindFit,
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
        <div className="mc-brand-wrap" ref={menuRef}>
          <button
            type="button"
            className={`mc-brand-trigger${menuOpen ? ' mc-brand-trigger--open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Open site menu"
          >
            <span className="mc-brand">NextUs</span>
            <svg
              className="mc-brand-caret"
              width="9"
              height="9"
              viewBox="0 0 9 9"
              fill="none"
              aria-hidden="true"
            >
              <polyline
                points="2,3 4.5,6 7,3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {menuOpen && (
            <div className="mc-brand-menu" role="menu">
              {SITE_LINKS.map((link) => (
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
          )}
        </div>
        <div className="mc-brand-actions">
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
        <div className="mc-identity-name">{displayName}</div>
        <div className="mc-identity-fit">
          {isPlaced ? (
            <span className="mc-fit-placed">{placement}</span>
          ) : (
            <button
              type="button"
              className="mc-fit-invite"
              onClick={onFindFit}
            >
              <em>find your fit</em>
            </button>
          )}
        </div>
        <div className="mc-identity-spacer" aria-hidden="true" />
      </div>
    </header>
  )
}

// ─── Icons (inline SVG, currentColor) ─────────────────────────

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
  z-index: 10;
  border-bottom: 1px solid ${GOLD_RULE};
}
[data-stage="dark"] .mc-identity-strip {
  border-bottom: 1px solid rgba(200, 146, 42, 0.30);
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

.mc-brand-wrap {
  position: relative;
  display: inline-block;
}

.mc-brand-trigger {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: inherit;
  line-height: 1;
  transition: color 0.15s ease;
}
.mc-brand-trigger:hover .mc-brand,
.mc-brand-trigger--open .mc-brand {
  color: ${GOLD_DK};
}

.mc-brand {
  font-family: ${FONT_DISPLAY};
  font-size: 22px;
  font-weight: 500;
  color: ${TEXT_INK};
  letter-spacing: -0.005em;
  line-height: 1;
  transition: color 0.15s ease;
}
[data-stage="dark"] .mc-brand { color: ${TEXT_WHITE}; }

.mc-brand-caret {
  color: ${TEXT_META};
  transition: transform 0.18s ease, color 0.15s ease;
  position: relative;
  top: 1px;
}
.mc-brand-trigger--open .mc-brand-caret {
  transform: rotate(180deg);
  color: ${GOLD_DK};
}
[data-stage="dark"] .mc-brand-caret {
  color: ${TEXT_WHITE_META};
}
[data-stage="dark"] .mc-brand-trigger--open .mc-brand-caret {
  color: ${GOLD};
}

.mc-brand-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 180px;
  background: ${BG_PARCHMENT};
  border: 1px solid rgba(200, 146, 42, 0.22);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 21, 35, 0.08);
  padding: 6px 0;
  z-index: 20;
  animation: mcBrandMenuIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
}
[data-stage="dark"] .mc-brand-menu {
  background: ${BG_INK};
  border-color: rgba(200, 146, 42, 0.30);
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
  background: rgba(200, 146, 42, 0.08);
  color: ${GOLD_DK};
}
[data-stage="dark"] .mc-brand-menu-item { color: ${TEXT_WHITE}; }
[data-stage="dark"] .mc-brand-menu-item:hover {
  background: rgba(200, 146, 42, 0.12);
  color: ${GOLD};
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
.mc-icon-btn:hover { color: ${GOLD_DK}; }
[data-stage="dark"] .mc-icon-btn { color: ${TEXT_WHITE_META}; }
[data-stage="dark"] .mc-icon-btn:hover { color: ${GOLD}; }

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
  font-size: 28px;
  font-weight: 500;
  color: ${TEXT_INK};
  line-height: 1;
}
[data-stage="dark"] .mc-identity-name { color: ${TEXT_WHITE}; }

.mc-identity-fit {
  text-align: center;
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  color: ${TEXT_META};
}
[data-stage="dark"] .mc-identity-fit { color: ${TEXT_WHITE_META}; }

.mc-fit-placed {
  text-transform: uppercase;
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
  .mc-brand {
    font-size: 18px;
  }
  .mc-icon-btn svg {
    width: 16px;
    height: 16px;
  }
  .mc-brand-menu {
    min-width: 160px;
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
    font-size: 24px;
  }
  .mc-identity-fit {
    text-align: left;
    font-size: 10px;
    letter-spacing: 0.14em;
  }
  .mc-fit-invite {
    font-size: 14px;
  }
}
`
