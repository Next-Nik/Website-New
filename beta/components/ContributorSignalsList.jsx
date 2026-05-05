import { useEffect, useState } from 'react'
import { fetchContributorSignals } from '../hooks/useDomainIndicators'

// ─────────────────────────────────────────────────────────────────────────────
// ContributorSignalsList
//
// "Contributor signals (N)" expander. Surfaces Tier 3 submissions for the
// domain — narrative, photo, metric, or report contributions made through
// the platform. Each row shows submitter (when visibility allows),
// timestamp, signal type, and the text body.
//
// When visibility = "anonymous", the submitter renders as an
// anonymised type label without a profile link.
//
// Props:
//   domainSlug        — required
//   focusId           — optional Focus context
//   initialCount      — optional, used to render "(N)" before the list expands
//   tier3Heavy        — optional flag; when true and there are zero
//                       signals, renders the "still being measured"
//                       prompt rather than nothing
//   className         — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const TYPE_LABEL = {
  observation: 'Observation',
  scenario:    'Scenario',
  story:       'Story',
  measurement: 'Measurement',
}

export default function ContributorSignalsList({
  domainSlug,
  focusId = null,
  initialCount,
  tier3Heavy = false,
  className,
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || rows !== null) return
    if (!domainSlug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchContributorSignals(domainSlug, focusId)
      .then((data) => {
        if (cancelled) return
        setRows(data)
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
  }, [open, rows, domainSlug, focusId])

  const count = initialCount ?? (rows ? rows.length : null)

  // Tier 3-heavy domains with zero signals get a special inline prompt
  // instead of an empty expander. This is the brief's exact line.
  if (tier3Heavy && count === 0) {
    return (
      <div className={className} style={{ marginTop: '24px' }}>
        <p
          style={{
            ...body,
            fontSize: '15px',
            lineHeight: 1.55,
            color: 'rgba(15, 21, 35, 0.72)',
            margin: 0,
          }}
        >
          This territory is still being measured. If you are doing work
          here, you can{' '}
          <a
            href="/beta/signals/new"
            style={{
              color: '#A8721A',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(200, 146, 42, 0.45)',
              textUnderlineOffset: '3px',
            }}
          >
            contribute a signal
          </a>
          .
        </p>
      </div>
    )
  }

  // Domains with zero signals and no Tier 3-heavy treatment: don't render.
  if (count === 0) return null

  return (
    <div className={className} style={{ marginTop: '16px' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          ...sc,
          background: 'transparent',
          border: 'none',
          color: '#A8721A',
          fontSize: '13px',
          letterSpacing: '0.08em',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '8px 0',
        }}
      >
        {open ? 'Hide contributor signals' : `Contributor signals (${count ?? '…'})`}
      </button>

      {open && (
        <div style={{ marginTop: '12px' }}>
          {loading && (
            <p
              style={{
                ...body,
                fontSize: '14px',
                color: 'rgba(15, 21, 35, 0.55)',
                margin: 0,
              }}
            >
              Loading signals.
            </p>
          )}
          {error && (
            <p
              style={{
                ...body,
                fontSize: '14px',
                color: 'rgba(138, 48, 48, 0.85)',
                margin: 0,
              }}
            >
              Could not load contributor signals.
            </p>
          )}
          {!loading && !error && rows && rows.length === 0 && (
            <p
              style={{
                ...body,
                fontSize: '14px',
                color: 'rgba(15, 21, 35, 0.55)',
                margin: 0,
              }}
            >
              No contributor signals on file.
            </p>
          )}
          {!loading && !error && rows && rows.length > 0 && (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {rows.map((sig) => (
                <SignalRow key={sig.id} signal={sig} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function SignalRow({ signal }) {
  const submittedAt = signal.submitted_at
    ? new Date(signal.submitted_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  const typeLabel = TYPE_LABEL[signal.signal_type] || signal.signal_type

  return (
    <li
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(200, 146, 42, 0.20)',
        borderRadius: '14px',
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '8px',
        }}
      >
        <span
          style={{
            ...sc,
            fontSize: '12px',
            letterSpacing: '0.08em',
            color: '#A8721A',
            fontWeight: 600,
          }}
        >
          {typeLabel}
        </span>
        <span
          style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.06em',
            color: 'rgba(15, 21, 35, 0.55)',
          }}
        >
          {submittedAt}
        </span>
      </div>
      <p
        style={{
          ...body,
          fontSize: '15px',
          lineHeight: 1.55,
          color: '#0F1523',
          margin: '0 0 8px',
          whiteSpace: 'pre-wrap',
        }}
      >
        {signal.signal_text}
      </p>
      {signal.signal_value_numeric != null && (
        <p
          style={{
            ...body,
            fontSize: '14px',
            color: 'rgba(15, 21, 35, 0.72)',
            margin: '0 0 8px',
          }}
        >
          Value: {signal.signal_value_numeric}
        </p>
      )}
      <p
        style={{
          ...sc,
          fontSize: '11px',
          letterSpacing: '0.06em',
          color: 'rgba(15, 21, 35, 0.55)',
          fontWeight: 600,
          margin: 0,
        }}
      >
        {attribution(signal)}
      </p>
    </li>
  )
}

function attribution(signal) {
  if (signal.visibility === 'anonymous') {
    const subdomain = signal.subdomain_slug ? `${signal.subdomain_slug} ` : ''
    return `Anonymous contribution · ${subdomain}practitioner`
  }
  if (signal.visibility === 'attributed' || signal.visibility === 'public') {
    return `Submitted by a NextUs contributor · view profile`
  }
  return ''
}
