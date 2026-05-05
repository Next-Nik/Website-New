// ─────────────────────────────────────────────────────────────
// Ticker.jsx
//
// v4 ticker. A single line of activity rotates every ~4.5s through
// a list of strings. When the list is empty, renders the locked
// empty-state line: "Quiet right now."
//
// The data source for this ticker is the future nextus_activity_feed
// query. Nothing is launched yet, so the parent passes [] to render
// the empty state. Wire-up point lives in BetaMissionControl.
//
// Props:
//   eyebrow: string      — small label on the left ("RECENTLY ACROSS YOUR SLICE")
//   lines:  string[]     — activity lines to rotate; [] renders empty state
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import {
  GOLD, GOLD_DK, GOLD_RULE,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  TEXT_WHITE, TEXT_WHITE_META, TEXT_WHITE_FAINT,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

const ROTATE_MS = 4500

export default function Ticker({ eyebrow = 'RECENTLY', lines = [] }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (lines.length <= 1) return
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % lines.length)
    }, ROTATE_MS)
    return () => clearInterval(t)
  }, [lines.length])

  // Reset index if lines list shrinks
  useEffect(() => {
    if (idx >= lines.length) setIdx(0)
  }, [lines.length, idx])

  const isEmpty = lines.length === 0

  return (
    <div className="mc-ticker">
      <style>{TICKER_CSS}</style>
      <div className="mc-ticker-eyebrow">{eyebrow}</div>
      <div className="mc-ticker-content">
        {isEmpty ? (
          <div className="mc-ticker-line mc-visible mc-ticker-empty">
            Quiet right now.
          </div>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              className={`mc-ticker-line ${i === idx ? 'mc-visible' : ''}`}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const TICKER_CSS = `
.mc-ticker {
  padding: 12px 40px;
  border-bottom: 1px solid ${GOLD_RULE};
  background: rgba(200, 146, 42, 0.04);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 20px;
  align-items: center;
  font-size: 14px;
  font-family: ${FONT_BODY};
  color: ${TEXT_META};
  overflow: hidden;
  min-height: 50px;
}
[data-stage="dark"] .mc-ticker {
  border-bottom: 1px solid rgba(200, 146, 42, 0.20);
  background: rgba(200, 146, 42, 0.08);
  color: ${TEXT_WHITE_META};
}

.mc-ticker-eyebrow {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.2em;
  color: ${GOLD_DK};
  flex-shrink: 0;
  white-space: nowrap;
}
[data-stage="dark"] .mc-ticker-eyebrow { color: ${GOLD}; }

.mc-ticker-content {
  position: relative;
  height: 22px;
  overflow: hidden;
}
.mc-ticker-line {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  opacity: 0;
  transition: opacity 0.5s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 20px;
}
.mc-ticker-line.mc-visible { opacity: 1; }
.mc-ticker-empty {
  font-style: italic;
  opacity: 0.7;
}

@media (max-width: 880px) {
  .mc-ticker { padding: 10px 16px; gap: 12px; }
}
`
