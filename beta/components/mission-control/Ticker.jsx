// ─────────────────────────────────────────────────────────────
// Ticker.jsx
//
// Single-line rotating ticker that surfaces recent platform motion.
// One line at a time, rotates every 4500ms, pauses on hover.
//
// Props:
//   eyebrow: string — small static label on the left (e.g. "On the platform")
//   lines:   string[] — array of ticker lines, rotated cyclically
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import {
  GOLD_DK, GOLD_RULE,
  FONT_SC, FONT_DISPLAY,
  TEXT_INK, TEXT_META, BG_PARCHMENT,
} from './tokens'

const ROTATION_MS = 4500

/**
 * @param {Object} props
 * @param {string} [props.eyebrow]
 * @param {string[]} props.lines
 */
export default function Ticker({ eyebrow, lines }) {
  const [idx, setIdx] = useState(0)
  const [fading, setFading] = useState(false)
  const pausedRef = useRef(false)

  useEffect(() => {
    if (!lines || lines.length <= 1) return

    let timer
    const advance = () => {
      if (pausedRef.current) {
        timer = setTimeout(advance, 800)
        return
      }
      setFading(true)
      setTimeout(() => {
        setIdx(i => (i + 1) % lines.length)
        setFading(false)
      }, 280)
      timer = setTimeout(advance, ROTATION_MS)
    }
    timer = setTimeout(advance, ROTATION_MS)
    return () => clearTimeout(timer)
  }, [lines])

  if (!lines || lines.length === 0) return null

  return (
    <div
      className="mc-ticker"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <style>{TICKER_CSS}</style>
      {eyebrow && <span className="mc-ticker-eyebrow">{eyebrow}</span>}
      <span className={`mc-ticker-line${fading ? ' fading' : ''}`}>
        {lines[idx]}
      </span>
    </div>
  )
}

const TICKER_CSS = `
.mc-ticker {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 28px;
  background: ${BG_PARCHMENT};
  border-bottom: 1px solid ${GOLD_RULE};
  font-family: ${FONT_DISPLAY};
  overflow: hidden;
  white-space: nowrap;
}
.mc-ticker-eyebrow {
  font-family: ${FONT_SC};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: ${GOLD_DK};
  flex-shrink: 0;
}
.mc-ticker-line {
  font-size: 16px;
  font-weight: 300;
  color: ${TEXT_INK};
  opacity: 1;
  transition: opacity 0.28s ease-out;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
  min-width: 0;
}
.mc-ticker-line.fading { opacity: 0; }

@media (max-width: 640px) {
  .mc-ticker { padding: 8px 16px; gap: 10px; }
  .mc-ticker-line { font-size: 14px; }
}
`
