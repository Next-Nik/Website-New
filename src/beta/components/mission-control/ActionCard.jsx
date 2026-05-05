// ─────────────────────────────────────────────────────────────
// ActionCard.jsx
//
// One of the two cards under the wheel on Mission Control. Each
// card surfaces the next move on its side (personal or civ). When
// no next-move data flows yet, the card renders in empty state —
// dashed border, lighter background, no primary CTA emphasis.
//
// Props:
//   eyebrow:      string   — small label, e.g. "YOUR LIFE · NEXT MOVE"
//   context:      string   — sub-eyebrow, e.g. "PATH SPRINT · DAY 12 OF 90"
//   title:        string   — main title line
//   body:         string   — supporting paragraph
//   primaryLabel: string   — primary button label
//   onPrimary:    () => void
//   tertiaryLabel:string   — tertiary button label
//   onTertiary:   () => void
//   empty:        boolean  — if true, renders dashed empty state
//   dark:         boolean  — render against the dark civ stage
// ─────────────────────────────────────────────────────────────

import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE,
  BG_CARD, BG_CARD_EMPTY, BG_INK_SOFT,
  TEXT_INK, TEXT_WHITE, TEXT_META, TEXT_WHITE_META,
  TEXT_FAINT, TEXT_WHITE_FAINT,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

export default function ActionCard({
  eyebrow,
  context,
  title,
  body,
  primaryLabel,
  onPrimary,
  tertiaryLabel,
  onTertiary,
  empty = false,
  dark = false,
}) {
  return (
    <div
      className={`mc-action ${empty ? 'mc-empty' : 'mc-primary'} ${dark ? 'mc-dark' : ''}`}
    >
      <style>{ACTION_CSS}</style>

      {eyebrow && <div className="mc-action-eyebrow">{eyebrow}</div>}
      {context && <div className="mc-action-context">{context}</div>}
      {title && <div className="mc-action-title">{title}</div>}
      {body && <div className="mc-action-body">{body}</div>}

      {(primaryLabel || tertiaryLabel) && (
        <div className="mc-action-buttons">
          {primaryLabel && (
            <button className="mc-btn-primary" onClick={onPrimary}>
              {primaryLabel}
            </button>
          )}
          {tertiaryLabel && (
            <button className="mc-btn-tertiary" onClick={onTertiary}>
              {tertiaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const ACTION_CSS = `
.mc-action {
  background: ${BG_CARD};
  border: 1px solid ${GOLD_RULE};
  padding: 24px 30px;
  position: relative;
  transition: all 0.6s ease;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}
.mc-action.mc-dark {
  background: ${BG_INK_SOFT};
  border: 1px solid rgba(200, 146, 42, 0.25);
}
.mc-action.mc-primary {
  border-color: ${GOLD};
  border-left: 4px solid ${GOLD};
  box-shadow: 0 4px 24px rgba(200, 146, 42, 0.12);
}
.mc-action.mc-primary.mc-dark {
  box-shadow: 0 4px 28px rgba(200, 146, 42, 0.18);
}
.mc-action.mc-empty {
  background: ${BG_CARD_EMPTY};
  border: 1px dashed ${GOLD_RULE};
  border-left: 1px dashed ${GOLD_RULE};
  box-shadow: none;
}
.mc-action.mc-empty.mc-dark {
  background: rgba(26, 32, 48, 0.5);
  border: 1px dashed rgba(200, 146, 42, 0.30);
}

.mc-action-eyebrow {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.22em;
  color: ${GOLD_DK};
  margin-bottom: 8px;
}
.mc-action.mc-dark .mc-action-eyebrow { color: ${GOLD_LT}; }

.mc-action-context {
  font-family: ${FONT_SC};
  font-size: 9.5px;
  letter-spacing: 0.18em;
  color: ${TEXT_FAINT};
  margin-bottom: 10px;
}
.mc-action.mc-dark .mc-action-context { color: ${TEXT_WHITE_FAINT}; }

.mc-action-title {
  font-family: ${FONT_DISPLAY};
  font-size: 24px;
  font-weight: 500;
  color: ${TEXT_INK};
  margin-bottom: 10px;
  line-height: 1.2;
  letter-spacing: -0.005em;
}
.mc-action.mc-dark .mc-action-title { color: ${TEXT_WHITE}; }
.mc-action.mc-empty .mc-action-title {
  color: ${TEXT_META};
  font-style: italic;
}
.mc-action.mc-empty.mc-dark .mc-action-title { color: ${TEXT_WHITE_META}; }

.mc-action-body {
  font-family: ${FONT_BODY};
  font-size: 14.5px;
  color: ${TEXT_META};
  line-height: 1.5;
  margin-bottom: 18px;
  flex: 1;
}
.mc-action.mc-dark .mc-action-body { color: ${TEXT_WHITE_META}; }

.mc-action-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mc-btn-primary {
  background: ${GOLD_DK};
  color: ${TEXT_WHITE};
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  padding: 11px 24px;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
  font-weight: 500;
}
.mc-btn-primary:hover { background: ${GOLD}; }

.mc-btn-tertiary {
  background: transparent;
  color: ${TEXT_META};
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.16em;
  padding: 11px 8px;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;
  font-weight: 500;
}
.mc-action.mc-dark .mc-btn-tertiary { color: ${TEXT_WHITE_META}; }
.mc-btn-tertiary:hover { color: ${TEXT_INK}; }
.mc-action.mc-dark .mc-btn-tertiary:hover { color: ${TEXT_WHITE}; }
`
