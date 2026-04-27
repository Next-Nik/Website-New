import { useEffect, useState } from 'react'
import { fetchPriorValue } from '../hooks/useDomainIndicators'

// ─────────────────────────────────────────────────────────────────────────────
// IndicatorCard
//
// One signal card per indicator. Single number per card — no chart, no
// sparkline. The default render shows:
//   - Indicator name (Cormorant SC eyebrow)
//   - The number (Cormorant Garamond display)
//   - The direction arrow (up / down / sideways), coloured per the score
//     palette: blue for progress, warm grey for plateau, amber for friction,
//     deep red for crisis
//   - One short trend phrase
//   - Provenance caption: source · last updated · measured at scale
//
// "Direction" is a function of the indicator's direction_preferred and the
// observed delta versus the prior value. A trend that moves in the
// preferred direction is "progress"; opposite is "friction" or "crisis"
// depending on magnitude. Context indicators always render plateau-toned.
//
// Empty value: card renders a placeholder dot for the number and the
// provenance caption explains the absence honestly. The card itself never
// hides.
//
// Stale value: the number renders normally; the provenance line carries
// a "Last updated N days ago" muted phrase.
//
// Props:
//   indicator — shape returned by useDomainIndicators()
//   focusName — optional human-readable name of the user's current Focus
//   className — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

// Score palette per Design System v3.
const COLOUR = {
  progress: '#2A6B5E',   // forest blue-green
  plateau:  '#8A8478',   // warm grey
  friction: '#C8922A',   // amber gold
  crisis:   '#8A3030',   // deep red
}

export default function IndicatorCard({ indicator, focusName, className }) {
  const [prior, setPrior] = useState(null)
  const [priorLoading, setPriorLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!indicator?.id || !indicator.value) {
      setPrior(null)
      setPriorLoading(false)
      return
    }
    setPriorLoading(true)
    fetchPriorValue(indicator.id, indicator.measured_at_focus_id)
      .then((row) => {
        if (cancelled) return
        setPrior(row)
        setPriorLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setPrior(null)
        setPriorLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [indicator?.id, indicator?.measured_at_focus_id, indicator?.value])

  if (!indicator) return null

  const hasValue = Boolean(indicator.value)
  const direction = computeDirection(indicator, prior)
  const tone = computeTone(indicator, prior, direction)
  const numberDisplay = formatNumber(indicator)
  const trendPhrase = computeTrendPhrase(indicator, prior, priorLoading)
  const provenanceLine = computeProvenance(indicator, focusName)

  return (
    <article
      className={className}
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(200, 146, 42, 0.20)',
        borderRadius: '14px',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Eyebrow: indicator name */}
      <span
        style={{
          ...sc,
          fontSize: '12px',
          letterSpacing: '0.08em',
          color: '#A8721A',
          fontWeight: 600,
          lineHeight: 1.3,
        }}
      >
        {indicator.name}
      </span>

      {/* Number row: large value + direction arrow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '10px',
          minHeight: '54px',
        }}
      >
        <span
          style={{
            ...display,
            fontSize: 'clamp(34px, 5vw, 48px)',
            fontWeight: 300,
            lineHeight: 1,
            color: hasValue ? '#0F1523' : 'rgba(15, 21, 35, 0.35)',
          }}
        >
          {hasValue ? numberDisplay.value : '—'}
        </span>
        {hasValue && numberDisplay.unit && (
          <span
            style={{
              ...sc,
              fontSize: '14px',
              letterSpacing: '0.04em',
              color: 'rgba(15, 21, 35, 0.55)',
              fontWeight: 600,
            }}
          >
            {numberDisplay.unit}
          </span>
        )}
        {hasValue && (
          <DirectionArrow direction={direction} colour={COLOUR[tone]} />
        )}
      </div>

      {/* Trend text */}
      {trendPhrase && (
        <p
          style={{
            ...body,
            fontSize: '14px',
            lineHeight: 1.45,
            color: 'rgba(15, 21, 35, 0.72)',
            margin: 0,
          }}
        >
          {trendPhrase}
        </p>
      )}

      {/* Provenance caption */}
      <p
        style={{
          ...sc,
          fontSize: '11px',
          letterSpacing: '0.06em',
          color: 'rgba(15, 21, 35, 0.55)',
          fontWeight: 600,
          margin: '4px 0 0',
          lineHeight: 1.5,
        }}
      >
        {provenanceLine}
      </p>
    </article>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(indicator) {
  const value = indicator.value
  if (!value) return { value: '—', unit: '' }
  const numeric = value.numeric
  const unit = indicator.unit || ''

  if (numeric == null && value.text) {
    return { value: value.text, unit: '' }
  }
  if (numeric == null) {
    return { value: '—', unit: unit }
  }

  // Formatting tiers: very large numbers go to compact (1.2M),
  // small decimals keep two places, integers stay clean.
  let display
  const abs = Math.abs(numeric)
  if (abs >= 1_000_000) {
    display = (numeric / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  } else if (abs >= 10_000) {
    display = (numeric / 1_000).toFixed(0) + 'k'
  } else if (abs >= 100) {
    display = numeric.toFixed(0)
  } else if (abs >= 10) {
    display = numeric.toFixed(1)
  } else if (abs >= 1) {
    display = numeric.toFixed(2)
  } else {
    display = numeric.toFixed(3)
  }
  return { value: display, unit }
}

function computeDirection(indicator, prior) {
  if (!indicator.value || indicator.value.numeric == null) return 'flat'
  if (!prior || prior.value_numeric == null) return 'flat'
  const delta = indicator.value.numeric - prior.value_numeric
  if (Math.abs(delta) < 1e-9) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

function computeTone(indicator, prior, direction) {
  // Context indicators don't have a moral direction. Always plateau-toned.
  if (indicator.direction_preferred === 'context') return 'plateau'

  if (!indicator.value || indicator.value.numeric == null) return 'plateau'
  if (!prior || prior.value_numeric == null) return 'plateau'
  if (direction === 'flat') return 'plateau'

  const movingPreferred =
    (direction === 'up'   && indicator.direction_preferred === 'up') ||
    (direction === 'down' && indicator.direction_preferred === 'down')

  if (movingPreferred) return 'progress'

  // Moving against preferred direction. Magnitude determines tone.
  const delta = Math.abs(indicator.value.numeric - prior.value_numeric)
  const base  = Math.abs(prior.value_numeric)
  const ratio = base > 0 ? delta / base : 0

  if (ratio > 0.05) return 'crisis'
  return 'friction'
}

function computeTrendPhrase(indicator, prior, priorLoading) {
  if (priorLoading) return null
  if (!indicator.value || indicator.value.numeric == null) {
    return 'No measurement on file yet.'
  }
  if (!prior || prior.value_numeric == null) {
    return 'First reading on the platform.'
  }

  const delta = indicator.value.numeric - prior.value_numeric
  if (Math.abs(delta) < 1e-9) return 'Holding steady since the prior reading.'

  const direction = delta > 0 ? 'Up' : 'Down'
  const base = Math.abs(prior.value_numeric)
  let magnitude = ''
  if (base > 0) {
    const pct = Math.abs(delta) / base * 100
    magnitude = pct >= 1
      ? `${pct.toFixed(0)}%`
      : `${pct.toFixed(1)}%`
  } else {
    magnitude = Math.abs(delta).toFixed(2)
  }

  const sincePhrase = priorPeriodPhrase(prior.observed_at)
  return sincePhrase
    ? `${direction} ${magnitude} ${sincePhrase}.`
    : `${direction} ${magnitude} since the prior reading.`
}

function priorPeriodPhrase(observedAt) {
  if (!observedAt) return ''
  const d = new Date(observedAt)
  if (Number.isNaN(d.getTime())) return ''
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000))
  if (days < 14) return `since ${days} days ago`
  if (days < 60) return `since ${Math.round(days / 7)} weeks ago`
  if (days < 730) return `since ${Math.round(days / 30)} months ago`
  return `since ${Math.round(days / 365)} years ago`
}

function computeProvenance(indicator, focusName) {
  const parts = []
  parts.push(`Source: ${indicator.source_name}`)

  if (!indicator.value) {
    parts.push('No data on file')
  } else if (indicator.is_fresh === false) {
    parts.push(`Last updated ${indicator.days_since_fetch} days ago`)
  } else if (indicator.days_since_fetch != null) {
    if (indicator.days_since_fetch === 0) {
      parts.push('Updated today')
    } else if (indicator.days_since_fetch === 1) {
      parts.push('Updated yesterday')
    } else {
      parts.push(`Updated ${indicator.days_since_fetch} days ago`)
    }
  }

  // Measured-at scale. Only worth naming when it differs from what the
  // user is looking at, or when there's a focusName to anchor it.
  const scale = indicator.native_resolution
  if (indicator.inherited && focusName) {
    parts.push(`Measured at: ${scaleLabel(scale)}, inherited`)
  } else if (focusName) {
    parts.push(`Measured at: ${scaleLabel(scale)}`)
  } else {
    parts.push(`Measured ${scaleLabel(scale)}`)
  }

  return parts.join(' · ')
}

function scaleLabel(scale) {
  if (scale === 'planetary') return 'planetary scale'
  if (scale === 'regional')  return 'regional scale'
  if (scale === 'local')     return 'local scale'
  return 'scale unknown'
}

function DirectionArrow({ direction, colour }) {
  let glyph = '→'
  if (direction === 'up')   glyph = '↑'
  if (direction === 'down') glyph = '↓'
  return (
    <span
      aria-hidden
      style={{
        ...display,
        fontSize: '28px',
        color: colour,
        lineHeight: 1,
        marginLeft: '4px',
      }}
    >
      {glyph}
    </span>
  )
}
