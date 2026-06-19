// ─────────────────────────────────────────────────────────────
// IdentitySwitcher.jsx
//
// A small caret beside your name that sets which identity you are
// acting as. Tap it, pick "You" or any actor you own, and every
// author surface (challenges, asks, handshakes, messages) follows
// that choice. Acting as an actor also moves Mission Control to the
// civ rail, where actors operate.
//
// Compact by design: when you are being You it is just the caret;
// when you are acting as an actor it shows "as <name>" so the
// current identity is never ambiguous. Renders nothing when you own
// no actors — there is nothing to switch between.
//
// Reads and writes the shared ActingAs context.
//
// Props:
//   personalName — your display name, shown as the "You" option
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useActingAs } from '../../context/ActingAsContext'
import {
  GOLD, GOLD_DK,
  TEXT_INK, TEXT_WHITE, TEXT_META, TEXT_WHITE_META,
  FONT_SC, BG_PARCHMENT, BG_INK,
} from './tokens'

// Plain-language label for an actor's type, shown under each option.
function typeLabel(type) {
  if (!type || type === 'person') return 'you, personally'
  return type
}

export default function IdentitySwitcher({ personalName = 'You' }) {
  const { identities, actingAsId, actingAsActor, setActingAs } = useActingAs()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Nothing to switch between.
  if (!identities || identities.length <= 1) return null

  const isPersonal = actingAsId === 'personal'

  function choose(id) {
    setActingAs(id)
    setOpen(false)
  }

  return (
    <span className="mc-acting-wrap" ref={wrapRef}>
      <style>{SWITCH_CSS}</style>

      <button
        type="button"
        className={`mc-acting-btn${open ? ' mc-acting-btn--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch the identity you are acting as"
        title="Switch the identity you are acting as"
      >
        {!isPersonal && (
          <span className="mc-acting-tag">as {actingAsActor.name}</span>
        )}
        <Chevron open={open} />
      </button>

      {open && (
        <div className="mc-acting-menu" role="menu">
          <div className="mc-acting-menu-heading">Act as</div>
          {identities.map(idn => {
            const isActive = idn.id === actingAsId
            const label = idn.id === 'personal' ? personalName : idn.name
            return (
              <button
                key={idn.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`mc-acting-item${isActive ? ' mc-acting-item--active' : ''}`}
                onClick={() => choose(idn.id)}
              >
                <span className="mc-acting-item-label">{label}</span>
                <span className="mc-acting-item-type">{typeLabel(idn.type)}</span>
                {isActive && <Check />}
              </button>
            )
          })}
        </div>
      )}
    </span>
  )
}

// ─── Icons (presentation attributes only — no style= per Chrome 148 rule) ───

function Chevron({ open }) {
  return (
    <svg
      className={`mc-acting-chevron${open ? ' mc-acting-chevron--open' : ''}`}
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function Check() {
  return (
    <svg
      className="mc-acting-check"
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const SWITCH_CSS = `
.mc-acting-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.mc-acting-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: transparent;
  border: none;
  border-radius: 40px;
  cursor: pointer;
  color: ${TEXT_META};
  transition: color 0.15s ease, background 0.15s ease;
}
.mc-acting-btn:hover,
.mc-acting-btn--open {
  color: ${GOLD_DK};
  background: rgba(200, 146, 42, 0.08);
}
[data-stage="dark"] .mc-acting-btn { color: ${TEXT_WHITE_META}; }
[data-stage="dark"] .mc-acting-btn:hover,
[data-stage="dark"] .mc-acting-btn--open { color: ${GOLD}; }

.mc-acting-tag {
  font-family: ${FONT_SC};
  font-size: 13px;
  letter-spacing: 0.10em;
  color: ${GOLD_DK};
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-stage="dark"] .mc-acting-tag { color: ${GOLD}; }

.mc-acting-chevron {
  transition: transform 0.16s ease;
  flex-shrink: 0;
}
.mc-acting-chevron--open { transform: rotate(180deg); }

.mc-acting-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 240px;
  background: ${BG_PARCHMENT};
  border: 1px solid rgba(200, 146, 42, 0.22);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 21, 35, 0.08);
  padding: 4px 0 6px;
  z-index: 30;
  animation: mcActingIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
}
[data-stage="dark"] .mc-acting-menu {
  background: ${BG_INK};
  border-color: rgba(200, 146, 42, 0.30);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.mc-acting-menu-heading {
  font-family: ${FONT_SC};
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${TEXT_META};
  padding: 9px 16px 6px;
  pointer-events: none;
}
[data-stage="dark"] .mc-acting-menu-heading { color: ${TEXT_WHITE_META}; }

.mc-acting-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 9px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: background 0.12s ease;
}
.mc-acting-item:hover { background: rgba(200, 146, 42, 0.08); }
[data-stage="dark"] .mc-acting-item:hover { background: rgba(200, 146, 42, 0.12); }

.mc-acting-item-label {
  font-family: ${FONT_SC};
  font-size: 14px;
  letter-spacing: 0.04em;
  color: ${TEXT_INK};
}
[data-stage="dark"] .mc-acting-item-label { color: ${TEXT_WHITE}; }
.mc-acting-item--active .mc-acting-item-label { color: ${GOLD_DK}; }
[data-stage="dark"] .mc-acting-item--active .mc-acting-item-label { color: ${GOLD}; }

.mc-acting-item-type {
  font-family: ${FONT_SC};
  font-size: 13px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${TEXT_META};
  margin-top: 2px;
}
[data-stage="dark"] .mc-acting-item-type { color: ${TEXT_WHITE_META}; }

.mc-acting-check {
  position: absolute;
  right: 14px;
  top: 12px;
  color: ${GOLD_DK};
}
[data-stage="dark"] .mc-acting-check { color: ${GOLD}; }

@keyframes mcActingIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .mc-acting-tag { max-width: 130px; }
}
`
