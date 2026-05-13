// ─────────────────────────────────────────────────────────────
// Panel.jsx
//
// The overlay panel. v4 aesthetic: parchment background (or ink
// when `dark`), single gold border, generous padding, close pill
// in the top-right corner. Click the backdrop to dismiss; press
// Escape to dismiss.
//
// Body content is supplied as children. Optional `actions` array
// renders one primary + one tertiary button at the foot of the
// panel.
//
// Props:
//   open:     boolean
//   onClose:  () => void
//   eyebrow:  string         — small uppercase eyebrow above the title
//   title:    string         — display-font title
//   dark:     boolean        — render the dark variant
//   actions:  Array<{ label, primary, onClick }>
//   children: panel body
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE,
  BG_PARCHMENT, BG_INK,
  TEXT_INK, TEXT_WHITE, TEXT_META, TEXT_WHITE_META,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

export default function Panel({
  open,
  onClose,
  eyebrow,
  title,
  dark = false,
  actions,
  children,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="mc-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <style>{PANEL_CSS}</style>
      <div className={`mc-panel ${dark ? 'mc-panel-dark' : ''}`}>
        <button className="mc-panel-close" onClick={onClose}>CLOSE ✕</button>
        {eyebrow && <div className="mc-panel-eyebrow">{eyebrow}</div>}
        {title && <div className="mc-panel-title">{title}</div>}
        <div className="mc-panel-body">
          {children}
        </div>
        {actions && actions.length > 0 && (
          <div className="mc-panel-actions">
            {actions.map((a, i) =>
              a.primary ? (
                <button
                  key={i}
                  className="mc-panel-btn-primary"
                  onClick={a.onClick}
                >
                  {a.label}
                </button>
              ) : (
                <button
                  key={i}
                  className="mc-panel-btn-tertiary"
                  onClick={a.onClick}
                >
                  {a.label}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const PANEL_CSS = `
.mc-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 21, 35, 0.55);
  backdrop-filter: blur(2px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.mc-panel {
  background: ${BG_PARCHMENT};
  border: 1px solid ${GOLD};
  box-shadow: 0 20px 60px rgba(15, 21, 35, 0.30);
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 36px 44px;
  position: relative;
  color: ${TEXT_INK};
}
.mc-panel.mc-panel-dark {
  background: ${BG_INK};
  border: 1px solid rgba(200, 146, 42, 0.50);
  color: ${TEXT_WHITE};
}

.mc-panel-close {
  position: absolute;
  top: 18px;
  right: 22px;
  background: transparent;
  border: none;
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  color: ${TEXT_META};
  cursor: pointer;
  padding: 4px 8px;
}
.mc-panel.mc-panel-dark .mc-panel-close { color: ${TEXT_WHITE_META}; }
.mc-panel-close:hover { color: ${GOLD_DK}; }

.mc-panel-eyebrow {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.22em;
  color: ${GOLD_DK};
  margin-bottom: 8px;
}
.mc-panel.mc-panel-dark .mc-panel-eyebrow { color: ${GOLD_LT}; }

.mc-panel-title {
  font-family: ${FONT_DISPLAY};
  font-size: 32px;
  font-weight: 500;
  color: ${TEXT_INK};
  margin-bottom: 16px;
  letter-spacing: -0.01em;
  line-height: 1.15;
}
.mc-panel.mc-panel-dark .mc-panel-title { color: ${TEXT_WHITE}; }

.mc-panel-body {
  font-family: ${FONT_BODY};
  font-size: 16px;
  color: ${TEXT_META};
  line-height: 1.55;
}
.mc-panel.mc-panel-dark .mc-panel-body { color: ${TEXT_WHITE_META}; }

.mc-panel-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid ${GOLD_RULE};
  display: flex;
  gap: 12px;
  align-items: center;
}
.mc-panel.mc-panel-dark .mc-panel-actions {
  border-top: 1px solid rgba(200, 146, 42, 0.20);
}

.mc-panel-btn-primary {
  background: ${GOLD_DK};
  color: ${TEXT_WHITE};
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  padding: 12px 24px;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
  font-weight: 500;
}
.mc-panel-btn-primary:hover { background: ${GOLD}; }

.mc-panel-btn-tertiary {
  background: transparent;
  color: ${TEXT_META};
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.16em;
  padding: 12px 8px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}
.mc-panel.mc-panel-dark .mc-panel-btn-tertiary { color: ${TEXT_WHITE_META}; }
.mc-panel-btn-tertiary:hover { color: ${TEXT_INK}; }
.mc-panel.mc-panel-dark .mc-panel-btn-tertiary:hover { color: ${TEXT_WHITE}; }

/* Helper sections that panel children may use */
.mc-panel-section {
  padding: 18px 0;
  border-top: 1px solid ${GOLD_RULE};
  margin-top: 4px;
}
.mc-panel.mc-panel-dark .mc-panel-section {
  border-top: 1px solid rgba(200, 146, 42, 0.20);
}
.mc-panel-section-label {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.2em;
  color: ${GOLD_DK};
  margin-bottom: 6px;
}
.mc-panel.mc-panel-dark .mc-panel-section-label { color: ${GOLD_LT}; }
.mc-panel-section-content {
  font-family: ${FONT_BODY};
  font-size: 15px;
  color: ${TEXT_INK};
  line-height: 1.5;
}
.mc-panel.mc-panel-dark .mc-panel-section-content { color: ${TEXT_WHITE}; }

.mc-panel-build-edge {
  margin-top: 24px;
  padding: 14px 18px;
  background: rgba(200, 146, 42, 0.06);
  border-left: 3px solid ${GOLD};
  font-family: ${FONT_BODY};
  font-size: 14px;
  color: ${TEXT_META};
  font-style: italic;
}
.mc-panel.mc-panel-dark .mc-panel-build-edge {
  background: rgba(200, 146, 42, 0.10);
  color: ${TEXT_WHITE_META};
}
`
