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

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE, GOLD_FAINT,
  TEXT_WHITE, TEXT_WHITE_META, TEXT_WHITE_FAINT,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'
import { HORIZON_DECOMPOSITIONS } from '../../constants/horizonDecompositions'
import { HorizonScaleModal, SCALE_LINK_STYLE } from '../../../components/HorizonScaleModal'

const CIV_STEP_TYPE_LABELS = {
  action:       'DO',
  practice:     'PRACTISE',
  contribution: 'CONTRIBUTE',
}

// Convert markdown **bold** to <strong> while escaping any other HTML.
// Used to render the `how_we_measure` paragraphs which lead with bolded
// indicator names from the canonical doc.
function renderInlineBold(text) {
  if (!text) return ''
  // Escape HTML special characters
  const esc = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  // Convert **...** to <strong>...</strong>
  return esc.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

export default function CivDomainPanel({
  levelPath = [],
  currentList = [],
  selectedItem = null,
  parentItem = null,
  parentPanelOpen = false,
  showOverview = false,
  topLevelGoal = '',
  overviewHorizon = '',
  overviewState = '',
  overviewNext = '',
  civScores = {},
  civDetails = {},
  currentStateData = {},
  panelAnchor = null,
  onAnchorConsumed,
  onSelect,
  onDrillDown,
  onBack,
  onPrev,
  onNext,
  onContribute,
  busy = false,
  user = null,
  purposeData = null,
}) {
  const isOverview      = showOverview && levelPath.length === 0
  const showParentPanel = parentPanelOpen && parentItem
  const showDomainPanel = !isOverview && !showParentPanel && selectedItem
  const itemForDisplay  = showParentPanel ? parentItem : selectedItem

  // ── Panel tab: 'now' | 'horizon' ─────────────────────────────
  const [panelTab, setPanelTab] = useState('now')

  // ── Next steps state ─────────────────────────────────────────
  const [nextStepsState, setNextStepsState] = useState({ status: 'idle', steps: [] })

  // Reset on domain change
  useEffect(() => {
    setPanelTab('now')
    setNextStepsState({ status: 'idle', steps: [] })
  }, [itemForDisplay?.id]) // eslint-disable-line

  const fetchNextSteps = useCallback(async () => {
    if (!itemForDisplay?.id) return
    setNextStepsState({ status: 'loading', steps: [] })
    try {
      const archetype = purposeData?.archetype || purposeData?.archetypeLabel || ''
      const archetypeDomain = purposeData?.civ_domain_slug || purposeData?.domain_slug || ''
      const r = await fetch('/api/civ-nextsteps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:        user?.id || null,
          domain:        itemForDisplay.id,
          domainName:    itemForDisplay.name,
          currentScore:  liveScore,
          archetype,
          archetypeDomain,
        }),
      })
      if (!r.ok) throw new Error('http-' + r.status)
      const data = await r.json()
      setNextStepsState({ status: 'ready', steps: Array.isArray(data.steps) ? data.steps : [] })
    } catch (_) {
      setNextStepsState({ status: 'error', steps: [] })
    }
  }, [itemForDisplay?.id, itemForDisplay?.name, user?.id, purposeData]) // eslint-disable-line

  // Resolve current-state data for the featured domain.
  // civScores uses wheel keys ('human', 'finance', 'tech', etc.)
  // CURRENT_STATE uses domain ids ('human-being', 'finance-economy', 'technology')
  // domain data uses ids too — so we use itemForDisplay.id to look up CURRENT_STATE,
  // and the wheel key map to look up civScores.
  const DOMAIN_ID_TO_WHEEL_KEY = {
    'human-being':     'human',
    'society':         'society',
    'nature':          'nature',
    'technology':      'tech',
    'finance-economy': 'finance',
    'legacy':          'legacy',
    'vision':          'vision',
  }
  const domainId      = itemForDisplay?.id
  const wheelKey      = domainId ? DOMAIN_ID_TO_WHEEL_KEY[domainId] : null
  const liveScore     = wheelKey != null ? (civScores?.[wheelKey] ?? null) : null
  const liveDetail    = wheelKey != null ? (civDetails?.[wheelKey] ?? null) : null
  const stateData     = domainId ? (currentStateData?.[domainId] ?? null) : null
  const decomp        = domainId ? (HORIZON_DECOMPOSITIONS?.[domainId] ?? null) : null

  // Expandable "Why these indicators" — collapsed by default so the
  // panel doesn't overwhelm on first glance. Reset when domain changes.
  const [whyOpen, setWhyOpen] = useState(false)
  // Planetary scale modal — opened by inline "scale" link in the overview
  // "Where we are now" section. Renders the Horizon Scale with the planet
  // (civilisational) descriptors.
  const [scaleOpen, setScaleOpen] = useState(false)
  useEffect(() => { setWhyOpen(false) }, [domainId])

  // Position-anchor scrolling. When a user clicks a Position node
  // (a "where we are now" vertex dot on the wheel), MissionControl
  // sets panelAnchor='position' so this panel knows to focus on the
  // indicator-level evidence rather than the goal unpacking at the
  // top. After scrolling, we tell the parent to clear the anchor so
  // re-renders don't keep re-scrolling.
  const stateBlockRef = useRef(null)
  useEffect(() => {
    if (panelAnchor === 'position' && stateBlockRef.current) {
      // Defer to next frame so the panel has rendered its new content
      // before we scroll. Smooth so it reads as a deliberate move.
      const id = requestAnimationFrame(() => {
        stateBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (onAnchorConsumed) onAnchorConsumed()
      })
      return () => cancelAnimationFrame(id)
    }
  }, [panelAnchor, domainId, onAnchorConsumed])

  // Score band label
  // Score band label — use the same vocabulary as the personal side.
  // Five tiers, thresholds matching scoreToBand() in selfResources.js:
  //   crisis (<3) · friction (3-5) · plateau (5-6.5) · capable (6.5-8) · fluent (≥8)
  // This is the "where we are now" scale shared across both surfaces of
  // NextUs — personal AND planetary.
  function scoreBand(s) {
    if (s == null) return null
    if (s < 3)   return 'Crisis'
    if (s < 5)   return 'Friction'
    if (s < 6.5) return 'Plateau'
    if (s < 8)   return 'Capable'
    return 'Fluent'
  }

  // Trend glyph
  function trendGlyph(t) {
    if (t === 'up')   return '↑'
    if (t === 'down') return '↓'
    return '→'
  }
  function trendColor(t) {
    if (t === 'up')   return 'rgba(100,200,120,0.9)'
    if (t === 'down') return 'rgba(220,80,80,0.85)'
    return 'rgba(200,146,42,0.6)'
  }

  return (
    <div className="mc-civ-panel">
      <style>{PANEL_CSS}</style>

      {/* Stepper bar */}
      <div className="mc-civ-stepper">
        <button type="button" className="mc-civ-arrow" onClick={onPrev}
          disabled={busy || isOverview} aria-label="Previous domain">‹</button>

        <div className="mc-civ-stepper-mid">
          {levelPath.length > 0 && (
            <button type="button" className="mc-civ-back" onClick={onBack} disabled={busy}>
              ← {parentItem?.name ? parentItem.name.toUpperCase() : 'BACK'}
            </button>
          )}
          {isOverview && <span className="mc-civ-stepper-hint">SELECT A DOMAIN</span>}
          {!isOverview && itemForDisplay && (
            <span className="mc-civ-stepper-eyebrow">
              {levelPath.length === 0 ? 'OUR PLANET' : (parentItem?.name?.toUpperCase() || 'LEVEL')}
              <span className="mc-civ-stepper-divider">·</span>
              {itemForDisplay.name?.toUpperCase()}
            </span>
          )}
        </div>

        <button type="button" className="mc-civ-arrow" onClick={onNext}
          disabled={busy || isOverview} aria-label="Next domain">›</button>
      </div>

      {/* Body */}
      <div className="mc-civ-body">

        {isOverview && (
          <div className="mc-civ-overview">
            <p className="mc-civ-overview-eyebrow">OUR PLANET</p>
            <h2 className="mc-civ-title">A thriving planet, a thriving humanity</h2>
            <div className="mc-civ-rule" />

            {/* ── THE NEXTUS HORIZON ─────────────────────────── */}
            {overviewHorizon && (
              <div className="mc-civ-overview-section">
                <p className="mc-civ-section-label">THE NEXTUS HORIZON</p>
                {topLevelGoal && (
                  <p className="mc-civ-horizon">{`"${topLevelGoal}"`}</p>
                )}
                {overviewHorizon.split('\n\n').map((para, i) => (
                  <p key={`h-${i}`} className="mc-civ-body-text">{para}</p>
                ))}
              </div>
            )}

            {/* ── WHERE WE ARE NOW ────────────────────────────
                First paragraph may contain {SCALE_LINK} — split on it
                and render an inline button that opens the planet scale
                modal. Subsequent paragraphs are plain text. */}
            {overviewState && (
              <div className="mc-civ-overview-section">
                <p className="mc-civ-section-label">WHERE WE ARE NOW</p>
                {overviewState.split('\n\n').map((para, i) => {
                  if (para.includes('{SCALE_LINK}')) {
                    const [before, after] = para.split('{SCALE_LINK}')
                    return (
                      <p key={`s-${i}`} className="mc-civ-body-text">
                        {before}
                        <button
                          type="button"
                          onClick={() => setScaleOpen(true)}
                          style={SCALE_LINK_STYLE}
                        >
                          scale
                        </button>
                        {after}
                      </p>
                    )
                  }
                  return (
                    <p key={`s-${i}`} className="mc-civ-body-text">{para}</p>
                  )
                })}
              </div>
            )}

            {/* ── WHAT YOU CAN DO HERE ────────────────────────── */}
            {overviewNext && (
              <div className="mc-civ-overview-section">
                <p className="mc-civ-section-label">WHAT YOU CAN DO HERE</p>
                {overviewNext.split('\n\n').map((para, i) => (
                  <p key={`n-${i}`} className="mc-civ-body-text">{para}</p>
                ))}
              </div>
            )}

            <ul className="mc-civ-chips">
              {currentList.map((d, i) => (
                <li key={d.id || i}>
                  <button type="button" className="mc-civ-chip"
                    onClick={() => onSelect?.(i)} disabled={busy}>
                    {d.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Planet-scale modal — opens from the inline "scale" link above */}
        <HorizonScaleModal
          open={scaleOpen}
          onClose={() => setScaleOpen(false)}
          system="planet"
        />

        {(showParentPanel || showDomainPanel) && itemForDisplay && (
          <div className="mc-civ-domain">

            {/* ── Header: name + live score ── */}
            <div className="mc-civ-domain-header">
              <h2 className="mc-civ-title">{itemForDisplay.name}</h2>
              {liveScore != null && (
                <div className="mc-civ-score-badge">
                  <span className="mc-civ-score-num">{liveScore.toFixed(1)}</span>
                  <span className="mc-civ-score-denom">&thinsp;/&thinsp;10</span>
                  <span className="mc-civ-score-band">{scoreBand(liveScore)}</span>
                </div>
              )}
            </div>

            {/* ── NOW / HORIZON tabs ── */}
            <div className="mc-civ-tabs">
              <button
                type="button"
                className={`mc-civ-tab${panelTab === 'now' ? ' mc-civ-tab--active' : ''}`}
                onClick={() => setPanelTab('now')}
              >NOW</button>
              <button
                type="button"
                className={`mc-civ-tab${panelTab === 'horizon' ? ' mc-civ-tab--active' : ''}`}
                onClick={() => setPanelTab('horizon')}
              >HORIZON</button>
            </div>

            {/* ── NOW tab ── */}
            {panelTab === 'now' && (
              <>
                {/* Horizon unpacking */}
                {decomp?.unpacking && (
                  <div className="mc-civ-unpacking">
                    {decomp.unpacking.split('\n\n').map((para, i) => (
                      <p key={i} className="mc-civ-unpacking-text">{para}</p>
                    ))}
                  </div>
                )}

                <div className="mc-civ-rule" />

                {/* Where we are now */}
                {stateData && (
                  <div ref={stateBlockRef} className="mc-civ-state-block">
                    <p className="mc-civ-section-label">WHERE WE ARE NOW</p>
                    {stateData.narrative && (
                      <p className="mc-civ-body-text">{stateData.narrative}</p>
                    )}

                    {liveDetail?.scored?.length > 0 ? (
                      <ul className="mc-civ-indicators">
                        {liveDetail.scored.map((ind, i) => (
                          <li key={i} className="mc-civ-indicator-row">
                            <span className="mc-civ-indicator-name">{ind.name}</span>
                            <span className="mc-civ-indicator-score">
                              {ind.score.toFixed(1)}<span className="mc-civ-indicator-denom">/10</span>
                            </span>
                          </li>
                        ))}
                        {liveDetail.contributing < liveDetail.total && (
                          <li className="mc-civ-indicator-gap">
                            {liveDetail.total - liveDetail.contributing} indicator{liveDetail.total - liveDetail.contributing !== 1 ? 's' : ''} not yet scored
                          </li>
                        )}
                      </ul>
                    ) : stateData.indicators?.length > 0 ? (
                      <ul className="mc-civ-indicators">
                        {stateData.indicators.map((ind, i) => (
                          <li key={i} className="mc-civ-indicator-row">
                            <span className="mc-civ-indicator-name">{ind.label}</span>
                            <span className="mc-civ-indicator-value">
                              <span style={{ color: trendColor(ind.trend), marginRight: 4 }}>
                                {trendGlyph(ind.trend)}
                              </span>
                              {ind.value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {(decomp?.how_we_measure || decomp?.not_measuring) && (
                      <div className="mc-civ-why-block">
                        <button
                          type="button"
                          className="mc-civ-why-toggle"
                          onClick={() => setWhyOpen(v => !v)}
                          aria-expanded={whyOpen}
                        >
                          <span className="mc-civ-why-toggle-text">
                            {whyOpen ? 'Hide the reasoning' : 'Why these indicators?'}
                          </span>
                          <span className="mc-civ-why-toggle-glyph">
                            {whyOpen ? '−' : '+'}
                          </span>
                        </button>
                        {whyOpen && (
                          <div className="mc-civ-why-body">
                            {decomp.how_we_measure && (
                              <div className="mc-civ-why-section">
                                <p className="mc-civ-why-heading">How we measure it</p>
                                {decomp.how_we_measure.split('\n\n').map((para, i) => (
                                  <p key={i} className="mc-civ-why-text"
                                     dangerouslySetInnerHTML={{ __html: renderInlineBold(para) }} />
                                ))}
                              </div>
                            )}
                            {decomp.not_measuring && (
                              <div className="mc-civ-why-section">
                                <p className="mc-civ-why-heading">What we are not measuring</p>
                                {decomp.not_measuring.split('\n\n').map((para, i) => (
                                  <p key={i} className="mc-civ-why-text">{para}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {stateData.gapSignal && stateData.gapReason && (
                      <div className="mc-civ-gap-signal">
                        <span className="mc-civ-gap-label">GAP</span>
                        <span className="mc-civ-gap-reason">{stateData.gapReason}</span>
                      </div>
                    )}
                  </div>
                )}

                {!stateData && itemForDisplay.description && (
                  <p className="mc-civ-body-text">{itemForDisplay.description}</p>
                )}

                {/* ── Next steps ── */}
                {nextStepsState.status === 'idle' && (
                  <button type="button" className="mc-civ-nextsteps-trigger" onClick={fetchNextSteps}>
                    How can I contribute? →
                  </button>
                )}
                {nextStepsState.status === 'loading' && (
                  <div className="mc-civ-nextsteps-loading">
                    <span className="mc-civ-nextsteps-dot" />
                    <span className="mc-civ-nextsteps-dot" />
                    <span className="mc-civ-nextsteps-dot" />
                  </div>
                )}
                {nextStepsState.status === 'error' && (
                  <div className="mc-civ-nextsteps-error">
                    <span>Couldn't load suggestions.</span>
                    <button type="button" className="mc-civ-nextsteps-retry" onClick={fetchNextSteps}>Try again</button>
                  </div>
                )}
                {nextStepsState.status === 'ready' && nextStepsState.steps.length > 0 && (
                  <div className="mc-civ-nextsteps">
                    <p className="mc-civ-section-label">YOUR CONTRIBUTION</p>
                    <ul className="mc-civ-nextsteps-list">
                      {nextStepsState.steps.map(step => (
                        <li key={step.id} className="mc-civ-nextstep">
                          <span className="mc-civ-nextstep-type">
                            {CIV_STEP_TYPE_LABELS[step.type] || step.type?.toUpperCase()}
                          </span>
                          <span className="mc-civ-nextstep-text">{step.text}</span>
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="mc-civ-nextsteps-refresh" onClick={fetchNextSteps}>
                      Refresh
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── HORIZON tab ── */}
            {panelTab === 'horizon' && (
              <>
                {itemForDisplay.horizonGoal ? (
                  <div className="mc-civ-horizon-block">
                    <span className="mc-civ-horizon-label">CIVILISATIONAL HORIZON</span>
                    <p className="mc-civ-horizon">{itemForDisplay.horizonGoal}</p>
                  </div>
                ) : (
                  <p className="mc-civ-readout-empty">No horizon goal defined for this domain yet.</p>
                )}
              </>
            )}

            {/* ── Sub-domains ── */}
            {Array.isArray(itemForDisplay.subDomains) && itemForDisplay.subDomains.length > 0 && (
              <>
                <p className="mc-civ-section-label">SUB-DOMAINS</p>
                <ul className="mc-civ-chips">
                  {itemForDisplay.subDomains.map((sd, i) => (
                    <li key={sd.id || i}>
                      <button type="button" className="mc-civ-chip"
                        onClick={() => showDomainPanel ? onDrillDown?.(undefined, i) : onSelect?.(i)}
                        disabled={busy}>
                        {sd.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* ── Actions ── */}
            <div className="mc-civ-actions">
              {showDomainPanel && Array.isArray(itemForDisplay.subDomains) && itemForDisplay.subDomains.length > 0 && (
                <button type="button" className="mc-civ-btn mc-civ-btn-primary"
                  onClick={() => onDrillDown?.()} disabled={busy}>
                  Explore sub-domains →
                </button>
              )}
              <button type="button" className="mc-civ-btn mc-civ-btn-ghost"
                onClick={onContribute} disabled={busy}>
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

/* Domain header — name + live score side by side */
.mc-civ-domain-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 4px;
}
.mc-civ-domain-header .mc-civ-title {
  margin-bottom: 0;
  flex: 1;
}

/* Live score badge */
.mc-civ-score-badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
  padding-top: 4px;
}
.mc-civ-score-num {
  font-family: ${FONT_DISPLAY};
  font-size: 28px;
  font-weight: 400;
  color: ${GOLD_LT};
  line-height: 1;
}
.mc-civ-score-denom {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgba(200,146,42,0.5);
}
.mc-civ-score-band {
  font-family: ${FONT_SC};
  font-size: 9px;
  letter-spacing: 0.18em;
  color: rgba(200,146,42,0.55);
  text-transform: uppercase;
  margin-left: 6px;
  align-self: center;
}

/* Horizon block */
.mc-civ-horizon-block {
  margin: 8px 0 4px;
}
.mc-civ-horizon-label {
  font-family: ${FONT_SC};
  font-size: 8.5px;
  letter-spacing: 0.22em;
  color: rgba(200,146,42,0.45);
  display: block;
  margin-bottom: 3px;
}

/* Horizon unpacking — what the goal actually describes */
.mc-civ-unpacking {
  margin: 6px 0 4px;
}
.mc-civ-unpacking-text {
  font-family: ${FONT_BODY};
  font-size: 15px;
  line-height: 1.65;
  color: ${TEXT_WHITE_META};
  margin: 0 0 10px;
}
.mc-civ-unpacking-text:last-child {
  margin-bottom: 0;
}

/* Why these indicators — expandable reasoning */
.mc-civ-why-block {
  margin-top: 12px;
}
.mc-civ-why-toggle {
  background: transparent;
  border: 1px solid rgba(200, 146, 42, 0.20);
  border-radius: 3px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease;
}
.mc-civ-why-toggle:hover {
  background: rgba(200, 146, 42, 0.05);
  border-color: rgba(200, 146, 42, 0.35);
}
.mc-civ-why-toggle-text {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.18em;
  color: ${GOLD_LT};
  text-transform: uppercase;
}
.mc-civ-why-toggle-glyph {
  font-family: ${FONT_DISPLAY};
  font-size: 16px;
  font-weight: 300;
  color: ${GOLD_LT};
  line-height: 1;
  margin-left: 8px;
}
.mc-civ-why-body {
  margin-top: 10px;
  padding: 12px 14px;
  background: rgba(200, 146, 42, 0.04);
  border: 1px solid rgba(200, 146, 42, 0.12);
  border-radius: 3px;
}
.mc-civ-why-section {
  margin-bottom: 14px;
}
.mc-civ-why-section:last-child {
  margin-bottom: 0;
}
.mc-civ-why-heading {
  font-family: ${FONT_SC};
  font-size: 9px;
  letter-spacing: 0.20em;
  color: ${GOLD_LT};
  text-transform: uppercase;
  margin: 0 0 8px;
}
.mc-civ-why-text {
  font-family: ${FONT_BODY};
  font-size: 13.5px;
  line-height: 1.6;
  color: ${TEXT_WHITE_META};
  margin: 0 0 8px;
}
.mc-civ-why-text:last-child {
  margin-bottom: 0;
}
.mc-civ-why-text strong {
  color: ${TEXT_WHITE};
  font-weight: 600;
}

/* Where we are now */
.mc-civ-state-block {
  margin: 12px 0 10px;
}
.mc-civ-indicators {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.mc-civ-indicator-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  background: rgba(200,146,42,0.05);
  border: 1px solid rgba(200,146,42,0.12);
  border-radius: 3px;
}
.mc-civ-indicator-name {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.14em;
  color: ${TEXT_WHITE_META};
  text-transform: uppercase;
}
.mc-civ-indicator-score {
  font-family: ${FONT_DISPLAY};
  font-size: 15px;
  font-weight: 400;
  color: ${GOLD_LT};
  flex-shrink: 0;
}
.mc-civ-indicator-denom {
  font-family: ${FONT_SC};
  font-size: 9px;
  color: rgba(200,146,42,0.45);
  margin-left: 1px;
}
.mc-civ-indicator-value {
  font-family: ${FONT_SC};
  font-size: 10.5px;
  letter-spacing: 0.10em;
  color: ${TEXT_WHITE_META};
  flex-shrink: 0;
}
.mc-civ-indicator-gap {
  font-family: ${FONT_SC};
  font-size: 9px;
  letter-spacing: 0.14em;
  color: ${TEXT_WHITE_FAINT};
  text-transform: uppercase;
  padding: 3px 10px;
  text-align: right;
}
.mc-civ-gap-signal {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
  padding: 6px 10px;
  background: rgba(220,80,80,0.06);
  border: 1px solid rgba(220,80,80,0.18);
  border-radius: 3px;
}
.mc-civ-gap-label {
  font-family: ${FONT_SC};
  font-size: 8px;
  letter-spacing: 0.22em;
  color: rgba(220,100,100,0.8);
  text-transform: uppercase;
  flex-shrink: 0;
}
.mc-civ-gap-reason {
  font-family: ${FONT_SC};
  font-size: 9.5px;
  letter-spacing: 0.10em;
  color: rgba(220,130,130,0.75);
}

.mc-civ-overview-eyebrow {
  font-family: ${FONT_SC};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: ${GOLD_LT};
  margin: 0 0 10px;
  text-transform: uppercase;
}

.mc-civ-title {
  font-family: ${FONT_DISPLAY};
  font-size: 36px;
  font-weight: 600;
  margin: 0 0 10px;
  letter-spacing: -0.005em;
  color: ${TEXT_WHITE};
  line-height: 1.1;
}
.mc-civ-horizon {
  font-family: ${FONT_BODY};
  font-size: 17px;
  color: ${GOLD_LT};
  margin: 0 0 16px;
  line-height: 1.5;
}
.mc-civ-rule {
  width: 40px;
  height: 1px;
  background: ${GOLD};
  margin: 14px 0 18px;
}
.mc-civ-body-text {
  font-family: ${FONT_BODY};
  font-size: 16px;
  line-height: 1.65;
  margin: 0 0 14px;
  color: ${TEXT_WHITE_META};
}
.mc-civ-goal {
  font-family: ${FONT_BODY};
  font-size: 17px;
  color: ${GOLD_LT};
  margin: 18px 0 14px;
  line-height: 1.5;
}

/* NOW / HORIZON tabs */
.mc-civ-tabs {
  display: flex;
  gap: 0;
  margin: 10px 0 16px;
  border-bottom: 1px solid rgba(200,146,42,0.25);
}
.mc-civ-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 6px 16px 8px;
  font-family: ${FONT_SC};
  font-size: 10.5px;
  letter-spacing: 0.22em;
  color: ${TEXT_WHITE_FAINT};
  cursor: pointer;
  margin-bottom: -1px;
  transition: color 0.18s ease, border-color 0.18s ease;
}
.mc-civ-tab:hover { color: ${GOLD_LT}; }
.mc-civ-tab--active {
  color: ${GOLD_LT};
  border-bottom-color: ${GOLD};
}

.mc-civ-readout-empty {
  font-family: ${FONT_BODY};
  font-size: 14px;
  color: ${TEXT_WHITE_FAINT};
  margin: 10px 0 0;
  line-height: 1.5;
}

/* Contribution next steps */
.mc-civ-nextsteps-trigger {
  background: transparent;
  border: none;
  color: ${GOLD_LT};
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  cursor: pointer;
  padding: 14px 0 6px;
  display: block;
  transition: opacity 0.18s ease;
}
.mc-civ-nextsteps-trigger:hover { opacity: 0.75; }

.mc-civ-nextsteps-loading {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 16px 0 8px;
}
.mc-civ-nextsteps-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${GOLD};
  animation: mc-civ-pulse 1.2s ease-in-out infinite;
}
.mc-civ-nextsteps-dot:nth-child(2) { animation-delay: 0.2s; }
.mc-civ-nextsteps-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes mc-civ-pulse {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40%           { opacity: 1;    transform: scale(1); }
}

.mc-civ-nextsteps-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0 6px;
  font-family: ${FONT_BODY};
  font-size: 13px;
  color: ${TEXT_WHITE_FAINT};
}
.mc-civ-nextsteps-retry {
  background: transparent;
  border: none;
  color: ${GOLD_LT};
  font-family: ${FONT_SC};
  font-size: 10.5px;
  letter-spacing: 0.18em;
  cursor: pointer;
  padding: 0;
}

.mc-civ-nextsteps { margin-top: 6px; }
.mc-civ-nextsteps-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mc-civ-nextstep {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  background: rgba(200,146,42,0.07);
  border: 1px solid rgba(200,146,42,0.18);
  border-radius: 14px;
}
.mc-civ-nextstep-type {
  font-family: ${FONT_SC};
  font-size: 9px;
  letter-spacing: 0.22em;
  color: ${GOLD_LT};
  white-space: nowrap;
  padding-top: 2px;
  min-width: 72px;
}
.mc-civ-nextstep-text {
  font-family: ${FONT_BODY};
  font-size: 14px;
  color: ${TEXT_WHITE_META};
  line-height: 1.55;
}
.mc-civ-nextsteps-refresh {
  background: transparent;
  border: none;
  color: ${TEXT_WHITE_FAINT};
  font-family: ${FONT_SC};
  font-size: 9.5px;
  letter-spacing: 0.18em;
  cursor: pointer;
  padding: 10px 0 4px;
  display: block;
  transition: color 0.18s ease;
}
.mc-civ-nextsteps-refresh:hover { color: ${GOLD_LT}; }

.mc-civ-overview-section {
  margin: 22px 0 0;
}
.mc-civ-overview-section:first-of-type {
  margin-top: 14px;
}

.mc-civ-section-label {
  font-family: ${FONT_SC};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: ${GOLD_LT};
  margin: 18px 0 12px;
}

/* Mobile — typography up across the panel for screen legibility */
@media (max-width: 720px) {
  .mc-civ-title {
    font-size: 32px;
    font-weight: 700;
  }
  .mc-civ-body-text {
    font-size: 17px;
    line-height: 1.6;
  }
  .mc-civ-horizon {
    font-size: 18px;
    line-height: 1.55;
  }
  .mc-civ-goal {
    font-size: 18px;
  }
  .mc-civ-section-label,
  .mc-civ-overview-eyebrow {
    font-size: 12px;
    letter-spacing: 0.20em;
  }
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
  /* Score badge — shrink on mobile, keep beside title */
  .mc-civ-score-num { font-size: 22px; }
  .mc-civ-score-denom { font-size: 9px; }
  .mc-civ-score-band { font-size: 8px; margin-left: 4px; }
  .mc-civ-domain-header { gap: 10px; }
  /* Indicator rows — tighter on mobile */
  .mc-civ-indicator-row { padding: 4px 8px; }
  .mc-civ-indicator-name { font-size: 9px; letter-spacing: 0.12em; }
  .mc-civ-indicator-score { font-size: 13px; }
  /* Unpacking text — slightly smaller on mobile */
  .mc-civ-unpacking-text { font-size: 14px; }
  .mc-civ-why-text { font-size: 13px; }
  .mc-civ-why-toggle { padding: 7px 10px; }
}
`
