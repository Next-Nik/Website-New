// ─────────────────────────────────────────────────────────────
// TopStrip.jsx
//
// The Mission Control top strip. Three regions, left-to-right:
//   • Brand (NextUs) + optional sub-line
//   • User identity — name + placement (archetype · domain · scale)
//   • Glance wheel — a clickable radial wheel of personal scores
//
// Props:
//   brand:           string (default "NextUs")
//   brandSub:        string — optional sub-line under brand
//   userName:        string
//   userPlacement:   string — e.g. "Connector · Society · neighbourhood"
//   glanceWheel:     React.ReactNode — pre-rendered <GlanceWheel ... />
//   glanceLabel:     string — small label beside the wheel (e.g. "You")
//   glanceSummary:   string — small secondary line (e.g. "5 of 7 dimensions placed")
//   onGlanceClick:   () => void
// ─────────────────────────────────────────────────────────────

import {
  GOLD, GOLD_DK, GOLD_RULE,
  FONT_SC, FONT_DISPLAY, FONT_BODY,
  TEXT_INK, TEXT_META, BG_PARCHMENT,
} from './tokens'

/**
 * @param {Object} props
 * @param {string} [props.brand]
 * @param {string} [props.brandSub]
 * @param {string} [props.userName]
 * @param {string} [props.userPlacement]
 * @param {React.ReactNode} [props.glanceWheel]
 * @param {string} [props.glanceLabel]
 * @param {string} [props.glanceSummary]
 * @param {() => void} [props.onGlanceClick]
 */
export default function TopStrip({
  brand = 'NextUs',
  brandSub,
  userName,
  userPlacement,
  glanceWheel,
  glanceLabel,
  glanceSummary,
  onGlanceClick,
}) {
  return (
    <div className="mc-top-strip">
      <style>{TOP_STRIP_CSS}</style>

      <div className="mc-top-brand">
        <div className="mc-top-brand-name">{brand}</div>
        {brandSub && <div className="mc-top-brand-sub">{brandSub}</div>}
      </div>

      <div className="mc-top-identity">
        {userName && <div className="mc-top-username">{userName}</div>}
        {userPlacement && <div className="mc-top-placement">{userPlacement}</div>}
      </div>

      {(glanceWheel || glanceLabel) && (
        <button
          type="button"
          className="mc-top-glance"
          onClick={onGlanceClick}
          aria-label="Open World View"
        >
          <div className="mc-top-glance-text">
            {glanceLabel && <div className="mc-top-glance-label">{glanceLabel}</div>}
            {glanceSummary && <div className="mc-top-glance-summary">{glanceSummary}</div>}
          </div>
          {glanceWheel && <div className="mc-top-glance-wheel">{glanceWheel}</div>}
        </button>
      )}
    </div>
  )
}

const TOP_STRIP_CSS = `
.mc-top-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 28px;
  background: ${BG_PARCHMENT};
  border-bottom: 1px solid ${GOLD_RULE};
  position: sticky;
  top: 0;
  z-index: 50;
}

.mc-top-brand { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
.mc-top-brand-name {
  font-family: ${FONT_DISPLAY};
  font-size: 22px;
  font-weight: 400;
  color: ${TEXT_INK};
  letter-spacing: 0.02em;
  line-height: 1.1;
}
.mc-top-brand-sub {
  font-family: ${FONT_SC};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: ${GOLD_DK};
  margin-top: 2px;
}

.mc-top-identity {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 0;
}
.mc-top-username {
  font-family: ${FONT_DISPLAY};
  font-size: 18px;
  font-weight: 400;
  color: ${TEXT_INK};
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.mc-top-placement {
  font-family: ${FONT_BODY};
  font-size: 12px;
  font-weight: 400;
  color: ${TEXT_META};
  letter-spacing: 0.04em;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.mc-top-glance {
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 6px 8px 6px 12px;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
  flex-shrink: 0;
}
.mc-top-glance:hover {
  border-color: ${GOLD_RULE};
  background: rgba(200,146,42,0.05);
}
.mc-top-glance-text { display: flex; flex-direction: column; align-items: flex-end; }
.mc-top-glance-label {
  font-family: ${FONT_SC};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${GOLD_DK};
}
.mc-top-glance-summary {
  font-family: ${FONT_BODY};
  font-size: 11px;
  font-weight: 400;
  color: ${TEXT_META};
  margin-top: 2px;
}
.mc-top-glance-wheel { flex-shrink: 0; }

@media (max-width: 720px) {
  .mc-top-strip { padding: 12px 16px; gap: 12px; }
  .mc-top-identity { display: none; }
  .mc-top-glance-text { display: none; }
}
`
