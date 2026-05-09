// ─────────────────────────────────────────────────────────────
// SelfDomainPanel.jsx
//
// Sits below the personal wheel on Mission Control. Parchment-mode
// counterpart to CivDomainPanel — same composition (stepper above,
// title + horizon line + rule + body, sub-domain chips, action row)
// but rendered light, and fed with the user's actual Map data.
//
// Two rendering modes:
//   • OVERVIEW: top-level idle. SELF_TOP_GOAL framing + the seven
//     personal domains as a chip row. Used when no domain is featured.
//   • DOMAIN: a domain is featured (selectedItem !== null). Shows
//     name, the user's horizon goal for that domain (or the canonical
//     fallback if they haven't done The Map), description, current /
//     horizon scores from horizon_profile, the user's I am / I do
//     statement when present, sub-domain chips, and CTAs back into
//     the relevant tools.
//
// Empty states are honest. When a user hasn't placed a domain on
// The Map, we say so plainly and offer The Map as the next step —
// no nudge, no shame.
//
// Props:
//   currentList:  [domain, ...]   the seven SELF_DOMAINS
//   selectedItem: domain | null   the currently featured domain
//   showOverview: boolean         top-level idle
//   topLevelGoal: string          SELF_TOP_GOAL
//   userScores:   { [domainId]: { current, horizon, horizonGoal, iaStatement } }
//                 keyed by domain.id (path / spark / body / finances /
//                 connection / inner_game / signal)
//   onSelect:        (i) => void  pick a domain by index
//   onPrev:          () => void
//   onNext:          () => void
//   onOpenMap:       () => void   call to action — open The Map
//   onOpenSprint:    () => void   call to action — start a sprint
//   onOpenPractice:  () => void   call to action — Horizon Practice
// ─────────────────────────────────────────────────────────────

import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE, GOLD_FAINT, GOLD_HOVER,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

export default function SelfDomainPanel({
  currentList = [],
  selectedItem = null,
  showOverview = false,
  topLevelGoal = '',
  userScores = {},
  onSelect,
  onPrev,
  onNext,
  onOpenMap,
  onOpenSprint,
  onOpenPractice,
}) {
  const isOverview = showOverview && !selectedItem
  const itemForDisplay = selectedItem
  const userScore = itemForDisplay ? (userScores[itemForDisplay.id] || null) : null
  const isPlaced = !!(userScore && userScore.current != null)

  return (
    <div className="mc-self-panel">
      <style>{PANEL_CSS}</style>

      {/* Stepper bar — below-wheel arrows + eyebrow */}
      <div className="mc-self-stepper">
        <button
          type="button"
          className="mc-self-arrow"
          onClick={onPrev}
          disabled={isOverview}
          aria-label="Previous domain"
        >
          ‹
        </button>

        <div className="mc-self-stepper-mid">
          {isOverview && (
            <span className="mc-self-stepper-hint">SELECT A DOMAIN</span>
          )}
          {!isOverview && itemForDisplay && (
            <span className="mc-self-stepper-eyebrow">
              YOUR LIFE
              <span className="mc-self-stepper-divider">·</span>
              {itemForDisplay.name?.toUpperCase()}
            </span>
          )}
        </div>

        <button
          type="button"
          className="mc-self-arrow"
          onClick={onNext}
          disabled={isOverview}
          aria-label="Next domain"
        >
          ›
        </button>
      </div>

      {/* Body — overview or domain */}
      <div className="mc-self-body">

        {isOverview && (
          <div className="mc-self-overview">
            <h2 className="mc-self-title">A Life Fully Expressed</h2>
            <div className="mc-self-rule" />
            <p className="mc-self-body-text">
              Seven domains. Each one a real territory in the life you are actually living. The Map measures where you are and where you are headed in each. Mission Control is where you can see them together, and step into any one to read the ground.
            </p>
            <p className="mc-self-body-text">
              Tap a domain on the wheel above, or pick one below.
            </p>
            {topLevelGoal && (
              <p className="mc-self-goal">{topLevelGoal}</p>
            )}
            <ul className="mc-self-chips">
              {currentList.map((d, i) => (
                <li key={d.id || i}>
                  <button
                    type="button"
                    className="mc-self-chip"
                    onClick={() => onSelect?.(i)}
                  >
                    {d.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isOverview && itemForDisplay && (
          <div className="mc-self-domain">
            <h2 className="mc-self-title">{itemForDisplay.name}</h2>
            {itemForDisplay.aliases && (
              <p className="mc-self-aliases">{itemForDisplay.aliases}</p>
            )}
            {/* User's own horizon goal — falls back to canonical when not placed yet */}
            {(userScore?.horizonGoal || itemForDisplay.horizonGoal) && (
              <p className="mc-self-horizon">
                {userScore?.horizonGoal || itemForDisplay.horizonGoal}
              </p>
            )}
            <div className="mc-self-rule" />

            {itemForDisplay.description && (
              <p className="mc-self-body-text">{itemForDisplay.description}</p>
            )}

            {/* Real Map data — only when the user has placed this domain */}
            {isPlaced ? (
              <div className="mc-self-readout">
                <div className="mc-self-score-row">
                  <div className="mc-self-score">
                    <span className="mc-self-score-num">{formatScore(userScore.current)}</span>
                    <span className="mc-self-score-label">CURRENT</span>
                  </div>
                  <div className="mc-self-score-divider" />
                  <div className="mc-self-score">
                    <span className="mc-self-score-num">{formatScore(userScore.horizon)}</span>
                    <span className="mc-self-score-label">HORIZON</span>
                  </div>
                </div>
                {userScore.iaStatement && (
                  <p className="mc-self-ia">{userScore.iaStatement}</p>
                )}
              </div>
            ) : (
              <div className="mc-self-empty">
                <p className="mc-self-empty-text">
                  Your Map hasn't reached this domain yet. Open The Map to place yourself here.
                </p>
              </div>
            )}

            {/* Sub-domain chips */}
            {Array.isArray(itemForDisplay.subDomains) && itemForDisplay.subDomains.length > 0 && (
              <>
                <p className="mc-self-section-label">APPROACHES</p>
                <ul className="mc-self-chips">
                  {itemForDisplay.subDomains.map((sd, i) => (
                    <li key={sd.id || i}>
                      <span className="mc-self-chip mc-self-chip-static" title={sd.description}>
                        {sd.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Calls to action — invitations into the tools */}
            <div className="mc-self-actions">
              {!isPlaced && onOpenMap && (
                <button
                  type="button"
                  className="mc-self-btn mc-self-btn-primary"
                  onClick={onOpenMap}
                >
                  Open The Map
                </button>
              )}
              {isPlaced && onOpenSprint && (
                <button
                  type="button"
                  className="mc-self-btn mc-self-btn-primary"
                  onClick={onOpenSprint}
                >
                  Start a Target Sprint here
                </button>
              )}
              {onOpenPractice && (
                <button
                  type="button"
                  className="mc-self-btn mc-self-btn-ghost"
                  onClick={onOpenPractice}
                >
                  Today's Horizon Practice
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────

function formatScore(n) {
  if (n == null) return '—'
  // Map scores live on a 0..10 scale. Render with one decimal where
  // useful, or as a whole number if the value is a clean integer.
  const num = Number(n)
  if (Number.isNaN(num)) return '—'
  if (Number.isInteger(num)) return String(num)
  return num.toFixed(1)
}

const PANEL_CSS = `
.mc-self-panel {
  position: relative;
  z-index: 2;
  max-width: 760px;
  margin: 0 auto;
  padding: 12px 24px 36px;
  color: ${TEXT_INK};
}

/* Stepper bar */
.mc-self-stepper {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 0 14px;
  border-bottom: 1px solid ${GOLD_RULE};
}
.mc-self-stepper-mid {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 28px;
}
.mc-self-arrow {
  background: transparent;
  border: 1px solid rgba(200, 146, 42, 0.30);
  color: ${GOLD_DK};
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
.mc-self-arrow:hover:not(:disabled) {
  background: ${GOLD_HOVER};
  border-color: ${GOLD};
  opacity: 1;
}
.mc-self-arrow:disabled {
  cursor: default;
  opacity: 0.20;
}
.mc-self-stepper-eyebrow {
  font-family: ${FONT_SC};
  font-size: 10.5px;
  letter-spacing: 0.18em;
  color: ${TEXT_META};
  text-align: center;
}
.mc-self-stepper-divider {
  margin: 0 8px;
  color: ${TEXT_FAINT};
}
.mc-self-stepper-hint {
  font-family: ${FONT_SC};
  font-size: 10.5px;
  letter-spacing: 0.18em;
  color: ${TEXT_FAINT};
}

/* Body */
.mc-self-body {
  padding: 22px 0 0;
}
.mc-self-title {
  font-family: ${FONT_DISPLAY};
  font-size: 32px;
  font-weight: 500;
  margin: 0 0 6px;
  letter-spacing: -0.005em;
  color: ${TEXT_INK};
}
.mc-self-aliases {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.16em;
  color: ${GOLD_DK};
  margin: 0 0 12px;
}
.mc-self-horizon {
  font-family: ${FONT_BODY};
  font-size: 16px;
  font-style: italic;
  color: ${GOLD_DK};
  margin: 0 0 14px;
  line-height: 1.45;
}
.mc-self-rule {
  width: 40px;
  height: 1px;
  background: ${GOLD};
  margin: 14px 0 16px;
}
.mc-self-body-text {
  font-family: ${FONT_BODY};
  font-size: 15px;
  line-height: 1.6;
  margin: 0 0 14px;
  color: ${TEXT_META};
}
.mc-self-goal {
  font-family: ${FONT_BODY};
  font-size: 16px;
  font-style: italic;
  color: ${GOLD_DK};
  margin: 18px 0 14px;
  line-height: 1.5;
}

/* Real Map readout — current vs horizon */
.mc-self-readout {
  margin: 18px 0 22px;
  padding: 16px 20px;
  background: ${GOLD_FAINT};
  border-radius: 14px;
  border: 1px solid ${GOLD_RULE};
}
.mc-self-score-row {
  display: flex;
  align-items: center;
  gap: 24px;
}
.mc-self-score {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.mc-self-score-num {
  font-family: ${FONT_DISPLAY};
  font-size: 36px;
  font-weight: 500;
  color: ${TEXT_INK};
  line-height: 1;
}
.mc-self-score-label {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.22em;
  color: ${GOLD_DK};
}
.mc-self-score-divider {
  width: 1px;
  height: 32px;
  background: ${GOLD_RULE};
}
.mc-self-ia {
  font-family: ${FONT_BODY};
  font-size: 14px;
  font-style: italic;
  color: ${TEXT_META};
  margin: 14px 0 0;
  line-height: 1.5;
  padding-top: 14px;
  border-top: 1px solid ${GOLD_RULE};
}

/* Empty state — no shame, soft invitation */
.mc-self-empty {
  margin: 18px 0 22px;
  padding: 16px 20px;
  background: ${GOLD_FAINT};
  border-radius: 14px;
  border: 1px dashed ${GOLD_RULE};
}
.mc-self-empty-text {
  font-family: ${FONT_BODY};
  font-size: 14px;
  color: ${TEXT_META};
  margin: 0;
  line-height: 1.5;
}

.mc-self-section-label {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.22em;
  color: ${GOLD_DK};
  margin: 18px 0 10px;
}

/* Domain chips */
.mc-self-chips {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mc-self-chip {
  background: #FFFFFF;
  border: 1px solid rgba(200, 146, 42, 0.30);
  color: ${TEXT_INK};
  padding: 8px 14px;
  font-family: ${FONT_BODY};
  font-size: 14px;
  cursor: pointer;
  border-radius: 14px;
  transition: all 0.18s ease;
  display: inline-block;
}
button.mc-self-chip:hover {
  background: ${GOLD_HOVER};
  border-color: ${GOLD};
}
.mc-self-chip-static {
  cursor: default;
  background: ${GOLD_FAINT};
}

/* Actions row */
.mc-self-actions {
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.mc-self-btn {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  padding: 10px 18px;
  border-radius: 40px;
  cursor: pointer;
  transition: all 0.18s ease;
  border: 1px solid ${GOLD};
}
.mc-self-btn-primary {
  background: ${GOLD};
  color: #FFFFFF;
}
.mc-self-btn-primary:hover {
  background: ${GOLD_DK};
  border-color: ${GOLD_DK};
}
.mc-self-btn-ghost {
  background: transparent;
  color: ${GOLD_DK};
}
.mc-self-btn-ghost:hover {
  background: ${GOLD_HOVER};
}

@media (max-width: 640px) {
  .mc-self-panel {
    padding: 8px 16px 28px;
  }
  .mc-self-title { font-size: 24px; }
  .mc-self-horizon { font-size: 15px; }
  .mc-self-body-text { font-size: 14px; }
  .mc-self-stepper {
    gap: 10px;
  }
  .mc-self-score-num { font-size: 28px; }
  .mc-self-score-row { gap: 18px; }
}
`
