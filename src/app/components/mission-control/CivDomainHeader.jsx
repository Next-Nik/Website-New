// ─────────────────────────────────────────────────────────────
// CivDomainHeader.jsx
//
// Sits ABOVE the civ wheel. The featured domain's name and its
// Horizon Goal statement — the destination that domain navigates
// toward — read first, before the wheel itself, rather than being
// buried behind a HORIZON tab in CivDomainPanel below the wheel
// (July 2026 change; see CivDomainPanel.jsx for the rest of the
// domain detail: live score, description, sub-domains, Contribute).
//
// Renders nothing at the top-level overview (no domain picked yet)
// — only once a domain is featured, matching CivDomainPanel's own
// isOverview / showParentPanel / showDomainPanel logic so the two
// never disagree about which item is "current".
//
// Props:
//   levelPath:       [{index}, ...]
//   showOverview:     boolean   top-level idle, mirrors MissionControl's flag
//   parentPanelOpen:  boolean
//   parentItem:       domain | null
//   selectedItem:     domain | null
// ─────────────────────────────────────────────────────────────

import {
  GOLD_LT, TEXT_WHITE,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

export default function CivDomainHeader({
  levelPath = [],
  showOverview = false,
  parentPanelOpen = false,
  parentItem = null,
  selectedItem = null,
}) {
  const isOverview      = showOverview && levelPath.length === 0
  const showParentPanel = parentPanelOpen && parentItem
  const showDomainPanel = !isOverview && !showParentPanel && selectedItem
  const itemForDisplay  = showParentPanel ? parentItem : selectedItem

  if (isOverview || !(showParentPanel || showDomainPanel) || !itemForDisplay) return null

  return (
    <div className="mc-civ-above-wheel">
      <style>{ABOVE_WHEEL_CSS}</style>
      <h2 className="mc-civ-above-title">{itemForDisplay.name}</h2>
      {itemForDisplay.horizonGoal && (
        <p className="mc-civ-above-horizon">{itemForDisplay.horizonGoal}</p>
      )}
    </div>
  )
}

const ABOVE_WHEEL_CSS = `
.mc-civ-above-wheel {
  max-width: 640px;
  margin: 0 auto 8px;
  padding: 0 24px;
  text-align: center;
}
.mc-civ-above-title {
  font-family: ${FONT_DISPLAY};
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.005em;
  color: ${TEXT_WHITE};
  line-height: 1.1;
  margin: 0 0 8px;
}
.mc-civ-above-horizon {
  font-family: ${FONT_BODY};
  font-size: 16px;
  color: ${GOLD_LT};
  line-height: 1.5;
  margin: 0;
}
@media (max-width: 640px) {
  .mc-civ-above-title { font-size: 24px; }
  .mc-civ-above-horizon { font-size: 14px; }
}
`
