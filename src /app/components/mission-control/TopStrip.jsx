// ─────────────────────────────────────────────────────────────
// TopStrip.jsx
//
// The top strip on Mission Control. Three columns:
//   • Left  — NextUs brand
//   • Centre — user identity: name + thin divider + placement meta
//   • Right — "MISSION CONTROL" eyebrow
//
// Below 880px the three columns stack centred.
// Dark-mode flip honoured via [data-stage="dark"].
//
// Props:
//   userName:  string — display name; "Your name" placeholder otherwise
//   placement: string — placement caption ("CONNECTOR · SOCIETY · NEIGHBOURHOOD"
//                        or "PURPOSE PIECE NOT YET PLACED")
// ─────────────────────────────────────────────────────────────

import {
  GOLD_RULE,
  TEXT_INK, TEXT_WHITE, TEXT_META, TEXT_WHITE_META,
  FONT_DISPLAY, FONT_SC,
} from './tokens'

export default function TopStrip({
  userName = 'Your name',
  placement = 'PURPOSE PIECE NOT YET PLACED',
}) {
  return (
    <div className="mc-top-strip">
      <style>{TOP_CSS}</style>

      <div className="mc-brand">NextUs</div>

      <div className="mc-identity">
        <div className="mc-identity-name">{userName}</div>
        <div className="mc-identity-divider" />
        <div className="mc-identity-meta">{placement}</div>
      </div>

      <div className="mc-top-meta">MISSION CONTROL</div>
    </div>
  )
}

const TOP_CSS = `
.mc-top-strip {
  padding: 22px 40px 18px;
  border-bottom: 1px solid ${GOLD_RULE};
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 32px;
  align-items: center;
}
[data-stage="dark"] .mc-top-strip {
  border-bottom: 1px solid rgba(200, 146, 42, 0.30);
}

.mc-brand {
  font-family: ${FONT_DISPLAY};
  font-size: 22px;
  font-weight: 500;
  color: ${TEXT_INK};
  letter-spacing: -0.005em;
}
[data-stage="dark"] .mc-brand { color: ${TEXT_WHITE}; }

.mc-identity {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.mc-identity-name {
  font-family: ${FONT_DISPLAY};
  font-style: italic;
  font-size: 22px;
  font-weight: 500;
  color: ${TEXT_INK};
}
[data-stage="dark"] .mc-identity-name { color: ${TEXT_WHITE}; }

.mc-identity-divider {
  width: 1px;
  height: 18px;
  background: ${GOLD_RULE};
}
[data-stage="dark"] .mc-identity-divider {
  background: rgba(200, 146, 42, 0.30);
}

.mc-identity-meta {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  color: ${TEXT_META};
}
[data-stage="dark"] .mc-identity-meta { color: ${TEXT_WHITE_META}; }

.mc-top-meta {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  color: ${TEXT_META};
}
[data-stage="dark"] .mc-top-meta { color: ${TEXT_WHITE_META}; }

@media (max-width: 880px) {
  .mc-top-strip {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 16px 20px 12px;
    text-align: center;
  }
  .mc-identity {
    justify-content: center;
    flex-wrap: wrap;
  }
}
`
