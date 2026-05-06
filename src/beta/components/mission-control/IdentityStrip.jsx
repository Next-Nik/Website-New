// ─────────────────────────────────────────────────────────────
// IdentityStrip.jsx
//
// Replaces TopStrip. Two horizontal bands stacked:
//
//   ┌─────────────────────────────────────────────┐
//   │  NextUs                          [👤] [⚙]   │  brand bar
//   ├─────────────────────────────────────────────┤
//   │  Nik         Architect · Vision · Civil…    │  identity bar
//   └─────────────────────────────────────────────┘
//
// The brand bar holds the wordmark on the left and small Profile
// + Settings affordances on the right (replaces the old dock).
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

import {
  GOLD, GOLD_DK, GOLD_RULE,
  TEXT_INK, TEXT_WHITE, TEXT_META, TEXT_WHITE_META,
  FONT_DISPLAY, FONT_SC,
} from './tokens'

// Defensive capitalisation — handles any old data with lowercase names.
function capitaliseName(name) {
  if (!name) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export default function IdentityStrip({
  userName = 'Your name',
  placement = null,
  onProfile,
  onSettings,
  onFindFit,
}) {
  const displayName = capitaliseName(userName)
  const isPlaced = placement && placement !== 'PURPOSE PIECE NOT YET PLACED'

  return (
    <header className="mc-identity-strip">
      <style>{STRIP_CSS}</style>

      {/* BRAND BAR */}
      <div className="mc-brand-bar">
        <div className="mc-brand">NextUs</div>
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

/* ─── Brand bar ───────────────────────── */

.mc-brand-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px 10px;
}

.mc-brand {
  font-family: ${FONT_DISPLAY};
  font-size: 22px;
  font-weight: 500;
  color: ${TEXT_INK};
  letter-spacing: -0.005em;
  line-height: 1;
}
[data-stage="dark"] .mc-brand { color: ${TEXT_WHITE}; }

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

/* ─── Identity bar ─────────────────────── */

.mc-identity-bar {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  gap: 24px;
  padding: 8px 28px 14px;
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
