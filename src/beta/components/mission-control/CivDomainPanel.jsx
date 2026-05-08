// ─────────────────────────────────────────────────────────────
// CivDomainPanel.jsx
//
// Sits below the civ wheel. Slimmed-down version of the original
// DomainExplorer's right-side panel — same content shape (name,
// horizon goal, description, sub-domains, contribute action) but
// laid out horizontally to suit the space below the wheel rather
// than a tall vertical column.
//
// Three rendering modes:
//   • OVERVIEW: top-level idle. "Our Planet" framing + the seven
//     domains as a chip row. Used when no domain is featured AND
//     levelPath is empty.
//   • DOMAIN: a domain is featured (activeIndex !== null). Shows
//     name, horizon goal, description, sub-domain chips that drive
//     the wheel down a level, contribute action.
//   • PARENT: at sub-levels with no sub-domain selected yet. Shows
//     the parent domain panel (so the user can re-read its frame
//     before picking a sub-domain).
//
// Below-wheel arrows step through domains within the current level,
// emitting onPrev / onNext. They're the planet-side counterpart to
// keyboard left/right.
//
// Props:
//   levelPath:    [{index}, ...]
//   currentList:  [domain, ...]   the seven (or sub-N) shown on the wheel right now
//   selectedItem: domain | null   the currently featured domain (or null)
//   parentItem:   domain | null   for parent-panel mode
//   parentPanelOpen: boolean
//   showOverview: boolean         top-level idle
//   topLevelGoal: string
//   overviewBody: string
//   onSelect:     (i) => void     pick a domain by index
//   onDrillDown:  (i) => void     descend into a domain's sub-domains
//   onBack:       () => void
//   onPrev:       () => void
//   onNext:       () => void
//   onContribute: () => void
//   busy:         boolean         disable controls while wheel mid-transition
// ─────────────────────────────────────────────────────────────

import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE,
  TEXT_WHITE, TEXT_WHITE_META, TEXT_WHITE_FAINT,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

export default function CivDomainPanel({
  levelPath = [],
  currentList = [],
  selectedItem = null,
  parentItem = null,
  parentPanelOpen = false,
  showOverview = false,
  topLevelGoal = '',
  overviewBody = '',
  onSelect,
  onDrillDown,
  onBack,
  onPrev,
  onNext,
  onContribute,
  busy = false,
}) {
  const isOverview      = showOverview && levelPath.length === 0
  const showParentPanel = parentPanelOpen && parentItem
  const showDomainPanel = !isOverview && !showParentPanel && selectedItem
  const itemForDisplay  = showParentPanel ? parentItem : selectedItem
  const breadcrumb      = ['NextUs', ...levelPath.map((_, i) => '·')] // visual placeholder; full breadcrumb below

  return (
    <div className="mc-civ-panel">
      <style>{PANEL_CSS}</style>

      {/* Stepper bar — below-wheel arrows + level/back affordance */}
      <div className="mc-civ-stepper">
        <button
          type="button"
          className="mc-civ-arrow"
          onClick={onPrev}
          disabled={busy || isOverview}
          aria-label="Previous domain"
        >
          ‹
        </button>

        <div className="mc-civ-stepper-mid">
          {levelPath.length > 0 && (
            <button type="button" className="mc-civ-back" onClick={onBack} disabled={busy}>
              ← {parentItem?.name ? parentItem.name.toUpperCase() : 'BACK'}
            </button>
          )}
          {isOverview && (
            <span className="mc-civ-stepper-hint">SELECT A DOMAIN</span>
          )}
          {!isOverview && itemForDisplay && (
            <span className="mc-civ-stepper-eyebrow">
              {levelPath.length === 0 ? 'OUR PLANET' : (parentItem?.name?.toUpperCase() || 'LEVEL')}
              <span className="mc-civ-stepper-divider">·</span>
              {itemForDisplay.name?.toUpperCase()}
            </span>
          )}
        </div>

        <button
          type="button"
          className="mc-civ-arrow"
          onClick={onNext}
          disabled={busy || isOverview}
          aria-label="Next domain"
        >
          ›
        </button>
      </div>

      {/* Body — overview, parent, or domain */}
      <div className="mc-civ-body">

        {isOverview && (
          <div className="mc-civ-overview">
            <h2 className="mc-civ-title">The Overview Effect</h2>
            <div className="mc-civ-rule" />
            {overviewBody.split('\n\n').map((para, i) => (
              <p key={i} className="mc-civ-body-text">{para}</p>
            ))}
            {topLevelGoal && (
              <p className="mc-civ-goal">{topLevelGoal}</p>
            )}
            <ul className="mc-civ-chips">
              {currentList.map((d, i) => (
                <li key={d.id || i}>
                  <button
                    type="button"
                    className="mc-civ-chip"
                    onClick={() => onSelect?.(i)}
                    disabled={busy}
                  >
                    {d.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(showParentPanel || showDomainPanel) && itemForDisplay && (
          <div className="mc-civ-domain">
            <h2 className="mc-civ-title">{itemForDisplay.name}</h2>
            {itemForDisplay.horizonGoal && (
              <p className="mc-civ-horizon">{itemForDisplay.horizonGoal}</p>
            )}
            <div className="mc-civ-rule" />
            {itemForDisplay.description && (
              <p className="mc-civ-body-text">{itemForDisplay.description}</p>
            )}

            {Array.isArray(itemForDisplay.subDomains) && itemForDisplay.subDomains.length > 0 && (
              <>
                <p className="mc-civ-section-label">SUB-DOMAINS</p>
                <ul className="mc-civ-chips">
                  {itemForDisplay.subDomains.map((sd, i) => (
                    <li key={sd.id || i}>
                      <button
                        type="button"
                        className="mc-civ-chip"
                        onClick={() => {
                          if (showDomainPanel) {
                            // We're showing the selected domain — clicking
                            // a sub-domain chip means descend into this
                            // domain and land on sub-index i.
                            onDrillDown?.(undefined, i)
                          } else {
                            // Parent-panel mode — sub-domain selection at
                            // current level.
                            onSelect?.(i)
                          }
                        }}
                        disabled={busy}
                      >
                        {sd.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mc-civ-actions">
              {showDomainPanel && Array.isArray(itemForDisplay.subDomains) && itemForDisplay.subDomains.length > 0 && (
                <button
                  type="button"
                  className="mc-civ-btn mc-civ-btn-primary"
                  onClick={() => onDrillDown?.()}
                  disabled={busy}
                >
                  Explore sub-domains →
                </button>
              )}
              <button
                type="button"
                className="mc-civ-btn mc-civ-btn-ghost"
                onClick={onContribute}
                disabled={busy}
              >
                See actors in this domain
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const PANEL_CSS = `
.mc-civ-panel {
  position: relative;
  z-index: 2;
  max-width: 760px;
  margin: 0 auto;
  padding: 12px 24px 36px;
  color: ${TEXT_WHITE};
}

/* Stepper bar */
.mc-civ-stepper {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 0 14px;
  border-bottom: 1px solid rgba(200, 146, 42, 0.16);
}
.mc-civ-stepper-mid {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 28px;
}
.mc-civ-arrow {
  background: transparent;
  border: 1px solid rgba(200, 146, 42, 0.30);
  color: ${GOLD_LT};
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-family: serif;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.7;
  padding: 0;
}
.mc-civ-arrow:hover:not(:disabled) {
  background: rgba(200, 146, 42, 0.10);
  border-color: ${GOLD};
  opacity: 1;
}
.mc-civ-arrow:disabled {
  cursor: default;
  opacity: 0.20;
}
.mc-civ-stepper-eyebrow {
  font-family: ${FONT_SC};
  font-size: 10.5px;
  letter-spacing: 0.18em;
  color: ${TEXT_WHITE_META};
  text-align: center;
}
.mc-civ-stepper-divider {
  margin: 0 8px;
  color: ${TEXT_WHITE_FAINT};
}
.mc-civ-stepper-hint {
  font-family: ${FONT_SC};
  font-size: 10.5px;
  letter-spacing: 0.18em;
  color: ${TEXT_WHITE_FAINT};
}
.mc-civ-back {
  background: transparent;
  border: none;
  color: ${GOLD_LT};
  font-family: ${FONT_SC};
  font-size: 10.5px;
  letter-spacing: 0.18em;
  cursor: pointer;
  padding: 0 6px;
  transition: color 0.2s ease;
}
.mc-civ-back:hover:not(:disabled) { color: #FFE9B5; }
.mc-civ-back:disabled { cursor: default; opacity: 0.4; }

/* Body */
.mc-civ-body {
  padding: 22px 0 0;
}
.mc-civ-title {
  font-family: ${FONT_DISPLAY};
  font-size: 32px;
  font-weight: 500;
  margin: 0 0 8px;
  letter-spacing: -0.005em;
  color: ${TEXT_WHITE};
}
.mc-civ-horizon {
  font-family: ${FONT_BODY};
  font-size: 16px;
  font-style: italic;
  color: ${GOLD_LT};
  margin: 0 0 14px;
  line-height: 1.45;
}
.mc-civ-rule {
  width: 40px;
  height: 1px;
  background: ${GOLD};
  margin: 14px 0 16px;
}
.mc-civ-body-text {
  font-family: ${FONT_BODY};
  font-size: 15px;
  line-height: 1.6;
  margin: 0 0 14px;
  color: ${TEXT_WHITE_META};
}
.mc-civ-goal {
  font-family: ${FONT_BODY};
  font-size: 16px;
  font-style: italic;
  color: ${GOLD_LT};
  margin: 18px 0 14px;
  line-height: 1.5;
}

.mc-civ-section-label {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.22em;
  color: ${GOLD_LT};
  margin: 18px 0 10px;
}

/* Domain chips */
.mc-civ-chips {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mc-civ-chip {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(200, 146, 42, 0.30);
  color: ${TEXT_WHITE};
  padding: 8px 14px;
  font-family: ${FONT_BODY};
  font-size: 14px;
  cursor: pointer;
  border-radius: 14px;
  transition: all 0.18s ease;
}
.mc-civ-chip:hover:not(:disabled) {
  background: rgba(200, 146, 42, 0.10);
  border-color: ${GOLD};
}
.mc-civ-chip:disabled { cursor: default; opacity: 0.4; }

/* Actions row */
.mc-civ-actions {
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.mc-civ-btn {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  padding: 10px 18px;
  border-radius: 40px;
  cursor: pointer;
  transition: all 0.18s ease;
  border: 1px solid ${GOLD};
}
.mc-civ-btn-primary {
  background: ${GOLD};
  color: #0F1523;
}
.mc-civ-btn-primary:hover:not(:disabled) {
  background: ${GOLD_LT};
}
.mc-civ-btn-ghost {
  background: transparent;
  color: ${GOLD_LT};
}
.mc-civ-btn-ghost:hover:not(:disabled) {
  background: rgba(200, 146, 42, 0.10);
}
.mc-civ-btn:disabled { cursor: default; opacity: 0.4; }

@media (max-width: 640px) {
  .mc-civ-panel {
    padding: 8px 16px 28px;
  }
  .mc-civ-title { font-size: 24px; }
  .mc-civ-horizon { font-size: 15px; }
  .mc-civ-body-text { font-size: 14px; }
  .mc-civ-stepper {
    gap: 10px;
  }
}
`
