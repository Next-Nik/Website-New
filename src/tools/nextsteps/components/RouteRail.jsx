// NextSteps — the route, read-only
// src/tools/nextsteps/components/RouteRail.jsx
//
// The whole journey on one page, with the phase you are in lit.
//
// This is the component that answers the three questions the platform could
// not answer before the phase layer existed (Foundation v2.0.1 §2.4):
//
//   Where am I?         the phase whose exit condition is not yet met
//   What do I do?       the work of that phase
//   What is "closer"?   phases cleared
//
// Position here is STRUCTURAL, never felt and never a percentage. A phase is
// cleared or it is not, because its exit condition is true or it is not. There
// is no progress bar in this file on purpose: a bar would have to invent a
// number, and an invented number is fabricated progress.
//
// There is also no date, no duration and no "time remaining" anywhere in this
// component, and there must never be one. A phase has an exit condition, not a
// due date.

const STATE_LABEL = {
  cleared:  'Cleared',
  current:  'You are here',
  upcoming: 'Ahead',
}

export function RouteRail({ phases, compact = false, onSelect = null }) {
  if (!phases || phases.length === 0) return null

  const cleared = phases.filter((p) => p.state === 'cleared').length
  const current = phases.find((p) => p.state === 'current')

  return (
    <div className={`ns-rail${compact ? ' ns-rail-compact' : ''}`}>
      {!compact && (
        <div className="ns-rail-head">
          <span className="ns-rail-eyebrow">Your route</span>
          <span className="ns-rail-count">
            {current
              ? `Phase ${current.position} of ${phases.length}`
              : cleared === phases.length
                ? 'Route walked'
                : `${phases.length} phases`}
          </span>
        </div>
      )}

      <ol className="ns-rail-list">
        {phases.map((p) => (
          <li key={p.id} className={`ns-rail-item ns-rail-${p.state}`}>
            <div className="ns-rail-marker" aria-hidden="true">
              {p.state === 'cleared' ? '✓' : p.position}
            </div>
            <div className="ns-rail-body">
              <div className="ns-rail-line">
                <button
                  type="button"
                  className="ns-rail-name"
                  onClick={onSelect ? () => onSelect(p) : undefined}
                  disabled={!onSelect}
                >
                  {p.name}
                </button>
                <span className="ns-rail-state">{STATE_LABEL[p.state]}</span>
              </div>

              {!compact && p.state !== 'upcoming' && (
                <p className="ns-rail-work">{p.work}</p>
              )}

              {!compact && (
                <p className="ns-rail-exit">
                  <span className="ns-rail-exit-label">
                    {p.state === 'cleared' ? 'Ended when' : 'Ends when'}
                  </span>{' '}
                  {p.exit_condition}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <style>{`
        .ns-rail {
          background: #FFFFFF;
          border: 1px solid rgba(38,36,32,0.20);
          border-radius: 14px;
          padding: 20px;
        }
        .ns-rail-compact { padding: 14px 16px; }
        .ns-rail-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(38,36,32,0.11);
        }
        .ns-rail-eyebrow,
        .ns-rail-count {
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.76rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .ns-rail-eyebrow { color: #262420; }
        .ns-rail-count { color: rgba(38,36,32,0.68); }
        .ns-rail-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ns-rail-item {
          display: flex;
          gap: 14px;
          padding: 12px 0;
          position: relative;
        }
        .ns-rail-item + .ns-rail-item {
          border-top: 1px solid rgba(38,36,32,0.08);
        }
        .ns-rail-marker {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.85rem;
          background: rgba(38,36,32,0.08);
          color: rgba(38,36,32,0.68);
          border: 1px solid transparent;
        }
        .ns-rail-cleared .ns-rail-marker {
          background: rgba(76,107,69,0.14);
          color: #4c6b45;
        }
        .ns-rail-current .ns-rail-marker {
          background: #4c6b45;
          color: #FFFFFF;
        }
        .ns-rail-body { flex: 1; min-width: 0; }
        .ns-rail-line {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }
        .ns-rail-name {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.04rem;
          line-height: 1.35;
          color: #0F1523;
          background: none;
          border: none;
          padding: 0;
          text-align: left;
          cursor: default;
        }
        .ns-rail-name:not(:disabled) { cursor: pointer; }
        .ns-rail-name:not(:disabled):hover { text-decoration: underline; }
        .ns-rail-upcoming .ns-rail-name { color: rgba(38,36,32,0.68); }
        .ns-rail-current .ns-rail-name { color: #0F1523; }
        .ns-rail-state {
          flex-shrink: 0;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(38,36,32,0.68);
        }
        .ns-rail-current .ns-rail-state { color: #4c6b45; }
        .ns-rail-work {
          font-family: 'Lora', Georgia, serif;
          font-size: 0.95rem;
          line-height: 1.6;
          color: rgba(38,36,32,0.78);
          margin: 6px 0 0;
        }
        .ns-rail-exit {
          font-family: 'Lora', Georgia, serif;
          font-size: 0.92rem;
          line-height: 1.55;
          color: rgba(38,36,32,0.68);
          margin: 8px 0 0;
        }
        .ns-rail-exit-label {
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(38,36,32,0.68);
        }
        .ns-rail-cleared .ns-rail-exit,
        .ns-rail-cleared .ns-rail-work { color: rgba(38,36,32,0.58); }
      `}</style>
    </div>
  )
}
