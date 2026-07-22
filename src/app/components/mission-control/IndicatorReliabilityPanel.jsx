import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// IndicatorReliabilityPanel
//
// Dashboard tile that surfaces the fetch-log honestly:
//   - Last 24h totals: ok / failed / not-implemented
//   - Per-domain breakdown
//   - Most recent failures (one row per indicator, de-duplicated)
//
// Lives in Mission Control; fetches from /api/indicator-reliability.
// Quiet by default. Expands to show recent failures when the user
// asks for them.
//
// Props:
//   hours        — window in hours (default 24)
//   className    — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const display = { fontFamily: "'Lora', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }

export default function IndicatorReliabilityPanel({ hours = 24, className }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/indicator-reliability?hours=${hours}`)
      .then((res) => {
        if (!res.ok) throw new Error('reliability fetch failed')
        return res.json()
      })
      .then((json) => {
        if (cancelled) return
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hours])

  if (loading) {
    return (
      <Wrap className={className}>
        <Heading>System reliability</Heading>
        <p style={muted}>Reading the fetch log…</p>
      </Wrap>
    )
  }

  if (error || !data) {
    return (
      <Wrap className={className}>
        <Heading>System reliability</Heading>
        <p style={muted}>The reliability surface is unavailable right now.</p>
      </Wrap>
    )
  }

  const { totals, recent_failures, window_hours } = data
  const total = totals.ok + totals.failed + totals.not_implemented
  const successRate = total > 0 ? (totals.ok / total) : null

  return (
    <Wrap className={className}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <Heading>System reliability</Heading>
        <span
          style={{
            ...sc,
            fontSize: '13px',
            letterSpacing: '0.08em',
            color: 'rgba(15, 21, 35, 0.55)',
          }}
        >
          last {window_hours}h
        </span>
      </div>

      <p style={{ ...body, fontSize: '13px', color: 'rgba(15, 21, 35, 0.65)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
        Each indicator records every fetch run. This is the live tally — not a polished number.
      </p>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <Stat label="Successful" value={totals.ok} colour="#5DBC9D" />
        <Stat label="Failed" value={totals.failed} colour="#262420" />
        <Stat label="Not yet built" value={totals.not_implemented} colour="rgba(15, 21, 35, 0.45)" />
        {successRate != null && (
          <Stat
            label="Success rate"
            value={`${Math.round(successRate * 100)}%`}
            colour="#0F1523"
          />
        )}
      </div>

      {recent_failures && recent_failures.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            style={{
              ...sc,
              background: 'transparent',
              border: 'none',
              color: '#262420',
              fontSize: '13px',
              letterSpacing: '0.08em',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 0',
            }}
          >
            {expanded ? 'Hide gaps' : `Show gaps (${recent_failures.length}) →`}
          </button>

          {expanded && (
            <div style={{ marginTop: '10px' }}>
              {recent_failures.map((f) => (
                <FailureRow key={f.indicator_id} failure={f} />
              ))}
            </div>
          )}
        </>
      )}
    </Wrap>
  )
}

// ── small subcomponents ──────────────────────────────────────────

function Wrap({ className, children }) {
  return (
    <div
      className={className}
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(76,107,69, 0.20)',
        borderRadius: '14px',
        padding: '20px 22px',
      }}
    >
      {children}
    </div>
  )
}

function Heading({ children }) {
  return (
    <h3
      style={{
        ...display,
        fontSize: '22px',
        color: '#0F1523',
        margin: 0,
        lineHeight: 1.15,
      }}
    >
      {children}
    </h3>
  )
}

function Stat({ label, value, colour }) {
  return (
    <div style={{ minWidth: '90px' }}>
      <div
        style={{
          ...display,
          fontSize: '28px',
          color: colour,
          lineHeight: 1.1,
          fontWeight: 500,
        }}
      >
        {value}
      </div>
      <div
        style={{
          ...sc,
          fontSize: '13px',
          letterSpacing: '0.08em',
          color: 'rgba(15, 21, 35, 0.55)',
          marginTop: '2px',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  )
}

function FailureRow({ failure }) {
  const isPending = failure.status === 'not-implemented'
  const statusLabel = isPending ? 'fetcher pending' : 'failed'
  const statusColour = isPending ? 'rgba(15, 21, 35, 0.55)' : '#262420'
  return (
    <div
      style={{
        padding: '10px 0',
        borderTop: '1px solid rgba(76,107,69, 0.15)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ ...body, fontSize: '14px', color: '#0F1523', fontWeight: 600 }}>
          {failure.name}
        </div>
        <div
          style={{
            ...sc,
            fontSize: '13px',
            letterSpacing: '0.08em',
            color: statusColour,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {statusLabel}
        </div>
      </div>
      <div
        style={{
          ...sc,
          fontSize: '13px',
          letterSpacing: '0.08em',
          color: 'rgba(15, 21, 35, 0.55)',
          marginTop: '2px',
        }}
      >
        {failure.domain_id}
      </div>
      {failure.message && (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15, 21, 35, 0.65)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
          {failure.message}
        </p>
      )}
    </div>
  )
}

const muted = {
  fontFamily: "'Lora', Georgia, serif",
  fontSize: '13px',
  color: 'rgba(15, 21, 35, 0.55)',
  margin: 0,
}
