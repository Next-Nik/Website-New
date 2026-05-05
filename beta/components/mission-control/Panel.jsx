// ─────────────────────────────────────────────────────────────
// Panel.jsx
//
// The overlay panel that opens when a Tile or DockTile is clicked.
// Gold-bordered, parchment or dark, with header (eyebrow + title),
// scrollable body, and an action bar across the bottom.
//
// The panel's job is to BE the tool, not describe it. Each panel's
// body is whatever the tool needs to be in its simplest useful
// form.
//
// Props:
//   open:     boolean
//   onClose:  () => void
//   eyebrow:  string — small label above the title
//   title:    string — main title
//   children: React.ReactNode — the panel body
//   dark:     boolean — dark theme (used for civ panels)
//   actions:  Array<{ label: string, primary?: boolean, onClick: () => void }>
//
// Escape closes. Backdrop click closes.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import {
  GOLD, GOLD_DK, GOLD_RULE,
  BG_PARCHMENT, BG_INK, BG_PAGE,
  TEXT_INK, TEXT_META, TEXT_WHITE,
  FONT_SC, FONT_BODY, FONT_DISPLAY,
  PANEL_MAX_W,
} from './tokens'

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.eyebrow]
 * @param {string} props.title
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.dark]
 * @param {Array<{label: string, primary?: boolean, onClick: () => void}>} [props.actions]
 */
export default function Panel({
  open,
  onClose,
  eyebrow,
  title,
  children,
  dark = false,
  actions = [],
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    // Lock body scroll while panel is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <style>{PANEL_CSS}</style>
      <div
        className="mc-panel-backdrop"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mc-panel-title"
      >
        <div
          className={`mc-panel-card${dark ? ' mc-panel-dark' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="mc-panel-close" onClick={onClose} aria-label="Close">
            ×
          </button>
          <div className="mc-panel-header">
            {eyebrow && <div className="mc-panel-eyebrow">{eyebrow}</div>}
            <h2 id="mc-panel-title" className="mc-panel-title">{title}</h2>
          </div>
          <div className="mc-panel-body">
            {children}
          </div>
          {actions.length > 0 && (
            <div className="mc-panel-actions">
              {actions.map((action, i) => (
                <button
                  key={i}
                  className={`mc-panel-action${action.primary ? ' mc-panel-action-primary' : ''}`}
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const PANEL_CSS = `
.mc-panel-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 21, 35, 0.62);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: mcPanelFadeIn 0.2s ease-out;
}
@keyframes mcPanelFadeIn { from { opacity: 0; } to { opacity: 1; } }

.mc-panel-card {
  background: ${BG_PARCHMENT};
  color: ${TEXT_INK};
  border: 1px solid ${GOLD_RULE};
  border-radius: 18px;
  width: 100%;
  max-width: ${PANEL_MAX_W}px;
  max-height: 86vh;
  overflow: hidden;
  padding: 36px 44px 0;
  box-shadow: 0 24px 80px rgba(15,21,35,0.18);
  position: relative;
  display: flex;
  flex-direction: column;
}
@media (max-width: 640px) {
  .mc-panel-card { padding: 28px 22px 0; max-height: 92vh; }
}

.mc-panel-dark {
  background: ${BG_INK};
  color: ${TEXT_WHITE};
  border-color: rgba(200, 146, 42, 0.28);
}
.mc-panel-dark .mc-panel-eyebrow { color: ${GOLD}; }
.mc-panel-dark .mc-panel-title { color: ${TEXT_WHITE}; }
.mc-panel-dark .mc-panel-actions {
  border-top-color: rgba(200,146,42,0.32);
  background: linear-gradient(to bottom, rgba(15,21,35,0) 0%, ${BG_INK} 30%);
}

.mc-panel-close {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid ${GOLD_RULE};
  color: ${TEXT_META};
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.18s, color 0.18s, background 0.18s;
  z-index: 5;
}
.mc-panel-close:hover {
  border-color: ${GOLD};
  color: ${GOLD_DK};
  background: rgba(200,146,42,0.08);
}
.mc-panel-dark .mc-panel-close {
  color: ${TEXT_WHITE};
  border-color: rgba(200,146,42,0.32);
}
.mc-panel-dark .mc-panel-close:hover { color: ${GOLD}; border-color: ${GOLD}; }

.mc-panel-header {
  flex-shrink: 0;
  margin-bottom: 18px;
  text-align: center;
}
.mc-panel-eyebrow {
  font-family: ${FONT_SC};
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: ${GOLD_DK};
  text-transform: uppercase;
  margin-bottom: 10px;
}
.mc-panel-title {
  font-family: ${FONT_DISPLAY};
  font-size: 36px;
  font-weight: 300;
  color: ${TEXT_INK};
  line-height: 1.15;
}

.mc-panel-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding-bottom: 16px;
  font-family: ${FONT_BODY};
  font-size: 17px;
  line-height: 1.6;
}
.mc-panel-body::-webkit-scrollbar { width: 6px; }
.mc-panel-body::-webkit-scrollbar-thumb { background: ${GOLD_RULE}; border-radius: 3px; }

.mc-panel-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 0 18px;
  border-top: 1px solid ${GOLD_RULE};
  flex-shrink: 0;
  background: linear-gradient(to bottom, rgba(250,250,247,0) 0%, ${BG_PARCHMENT} 30%);
}

.mc-panel-action {
  font-family: ${FONT_SC};
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: ${GOLD_DK};
  background: ${BG_PAGE};
  border: 1.5px solid ${GOLD};
  border-radius: 40px;
  padding: 10px 22px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, transform 0.18s;
}
.mc-panel-action:hover { background: ${GOLD}; color: white; transform: translateY(-1px); }
.mc-panel-action-primary { background: ${GOLD}; color: white; }
.mc-panel-action-primary:hover { background: ${GOLD_DK}; }
.mc-panel-dark .mc-panel-action {
  background: ${BG_INK};
  color: ${GOLD};
  border-color: ${GOLD};
}
.mc-panel-dark .mc-panel-action:hover { background: ${GOLD}; color: ${BG_INK}; }
`
