// ─────────────────────────────────────────────────────────────
// PoleHeader.jsx
//
// Centred N-pole header. For a default user:
//
//     ‹  My Life | The Planet  ›
//
// For a user who has activated My Practice and My Org in Scope
// Settings:
//
//     ‹  My Life | My Practice | My Org | The Planet  ›
//
// Up to four poles, in fixed carousel order (Section 2 of the
// Scopes & Onboarding brief): My Life → My Practice → My Org →
// The Planet — the zoom from individual inward to collective
// outward. Flanking arrows ‹ › step through the active scopes;
// tapping a label flips directly. Active pole gets a thin gold
// underline.
//
// The arrows that step through domains WITHIN a wheel live BELOW
// the wheel — they are NOT here. This header only handles the
// pole flip.
//
// Backward compatibility:
//   The two-prop API (active + onSelectSelf + onSelectCiv) still
//   works. If `scopes` is omitted, the header renders the original
//   two-pole behaviour. This lets the surrounding page upgrade
//   without coordination.
//
// Props:
//   active:       string         — current scope id (one of the four)
//   scopes:       string[]       — optional, ordered list of active scope ids
//                                  in any order (the component sorts to
//                                  canonical render order). When omitted,
//                                  defaults to ['self','planet'].
//   onSelect:     (id) => void   — preferred handler; called with scope id
//   onSelectSelf: () => void     — legacy; called when My Life is picked
//   onSelectCiv:  () => void     — legacy; called when The Planet is picked
// ─────────────────────────────────────────────────────────────

import {
  GOLD, GOLD_DK, GOLD_RULE,
  TEXT_INK, TEXT_WHITE, TEXT_META, TEXT_WHITE_META,
  FONT_DISPLAY,
} from './tokens'

// ─── Scope definitions ───────────────────────────────────────
//
// Canonical render order is the source of truth here, NOT the order
// in users.mission_control_scopes. The DB stores the set; the UI
// owns the order. That way users.mission_control_scopes can be
// reordered freely without coupling.
const SCOPE_ORDER = ['self', 'practice', 'org', 'planet']

const SCOPE_LABELS = {
  self:     'My Life',
  practice: 'My Practice',
  org:      'My Org',
  planet:   'The Planet',
}

const SCOPE_ARIA = {
  self:     'Switch to My Life',
  practice: 'Switch to My Practice',
  org:      'Switch to My Org',
  planet:   'Switch to The Planet',
}

// Map legacy id ('civ') to canonical ('planet') so existing callers
// keep working without coordinated change.
function normaliseId(id) {
  if (id === 'civ' || id === 'planet') return 'planet'
  if (id === 'personal' || id === 'self') return 'self'
  return id
}

export default function PoleHeader({
  active,
  scopes,
  onSelect,
  onSelectSelf,
  onSelectCiv,
}) {
  const activeId = normaliseId(active)

  // Resolve the active scopes. Backward-compatible default: the two
  // poles that have always been here.
  const requested = Array.isArray(scopes) && scopes.length > 0
    ? scopes.map(normaliseId)
    : ['self', 'planet']

  // Filter to known ids and put into canonical render order.
  const known = new Set(requested.filter(id => id in SCOPE_LABELS))
  const ordered = SCOPE_ORDER.filter(id => known.has(id))

  // Defensive: a misconfigured user with no known scopes still gets
  // a usable header rather than blank space.
  const renderScopes = ordered.length > 0 ? ordered : ['self', 'planet']

  // Dispatch click. Prefer the new onSelect(id) callback; fall back
  // to the legacy two-button handlers for self/planet so callers that
  // have not migrated yet keep working.
  function pick(id) {
    if (onSelect) { onSelect(id); return }
    if (id === 'self'   && onSelectSelf) { onSelectSelf(); return }
    if (id === 'planet' && onSelectCiv)  { onSelectCiv();  return }
    // No handler for this id (typical when My Practice / My Org are
    // togglable but their parent page has not added handling yet, as
    // is the case in Step B of the brief). Silent — the parent will
    // wire it in Step C.
  }

  // Arrow navigation: previous / next active scope (cyclic).
  const activeIdx = renderScopes.indexOf(activeId)
  const prevId = renderScopes[(activeIdx - 1 + renderScopes.length) % renderScopes.length]
  const nextId = renderScopes[(activeIdx + 1) % renderScopes.length]
  const canStep = renderScopes.length > 1

  return (
    <div className="mc-poles">
      <style>{POLES_CSS}</style>

      <div className="mc-poles-inner">
        <button
          type="button"
          className="mc-pole-arrow mc-pole-arrow-left"
          onClick={() => canStep && pick(prevId)}
          aria-label={canStep ? SCOPE_ARIA[prevId] : 'No previous scope'}
          disabled={!canStep}
        >
          ‹
        </button>

        {renderScopes.map((id, i) => (
          <span key={id} className="mc-pole-row">
            <button
              type="button"
              className={`mc-pole mc-pole-${id} ${activeId === id ? 'mc-pole-active' : ''}`}
              onClick={() => pick(id)}
              aria-current={activeId === id ? 'true' : undefined}
            >
              {SCOPE_LABELS[id]}
            </button>
            {i < renderScopes.length - 1 && (
              <span className="mc-pole-divider" aria-hidden="true" />
            )}
          </span>
        ))}

        <button
          type="button"
          className="mc-pole-arrow mc-pole-arrow-right"
          onClick={() => canStep && pick(nextId)}
          aria-label={canStep ? SCOPE_ARIA[nextId] : 'No next scope'}
          disabled={!canStep}
        >
          ›
        </button>
      </div>
    </div>
  )
}

const POLES_CSS = `
.mc-poles {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 14px 28px 10px;
  border-bottom: 1px solid ${GOLD_RULE};
}
[data-stage="dark"] .mc-poles {
  border-bottom: 1px solid rgba(200, 146, 42, 0.20);
}

.mc-poles-inner {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
}

.mc-pole-row {
  display: inline-flex;
  align-items: center;
  gap: 14px;
}

.mc-pole {
  background: transparent;
  border: none;
  padding: 4px 0;
  font-family: ${FONT_DISPLAY};
  font-size: 22px;
  font-weight: 500;
  cursor: pointer;
  color: ${TEXT_META};
  transition: color 0.2s ease;
  letter-spacing: -0.005em;
  line-height: 1.2;
  position: relative;
  white-space: nowrap;
}
[data-stage="dark"] .mc-pole { color: ${TEXT_WHITE_META}; }

.mc-pole:hover { color: ${GOLD_DK}; }
[data-stage="dark"] .mc-pole:hover { color: ${GOLD}; }

.mc-pole-active { color: ${TEXT_INK}; }
[data-stage="dark"] .mc-pole-active { color: ${TEXT_WHITE}; }

/* The active pole gets a thin gold underline, centred under the label */
.mc-pole-active::after {
  content: '';
  display: block;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: -4px;
  height: 2px;
  background: ${GOLD};
  width: 40px;
}

.mc-pole-divider {
  display: inline-block;
  width: 1px;
  height: 18px;
  background: ${GOLD_RULE};
}
[data-stage="dark"] .mc-pole-divider {
  background: rgba(200, 146, 42, 0.30);
}

.mc-pole-arrow {
  background: transparent;
  border: 1px solid ${GOLD_RULE};
  color: ${GOLD_DK};
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-family: serif;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.55;
  padding: 0;
}
.mc-pole-arrow:hover:not(:disabled) {
  background: rgba(200, 146, 42, 0.06);
  border-color: ${GOLD};
  opacity: 1;
}
.mc-pole-arrow:disabled {
  cursor: default;
  opacity: 0.18;
}
[data-stage="dark"] .mc-pole-arrow {
  border-color: rgba(200, 146, 42, 0.30);
  color: #D4A744;
}
[data-stage="dark"] .mc-pole-arrow:hover:not(:disabled) {
  background: rgba(200, 146, 42, 0.10);
  border-color: ${GOLD};
}

@media (max-width: 640px) {
  .mc-poles {
    padding: 10px 16px 8px;
  }
  .mc-poles-inner {
    gap: 8px;
  }
  .mc-pole-row {
    gap: 8px;
  }
  .mc-pole {
    font-size: 15px;
  }
  .mc-pole-active::after {
    width: 26px;
    bottom: -3px;
  }
  .mc-pole-arrow {
    width: 22px;
    height: 22px;
    font-size: 14px;
  }
  .mc-pole-divider {
    height: 14px;
  }
}
`
