import { useEffect, useState } from 'react'
import { fetchAllIndicators } from '../hooks/useDomainIndicators'

// ─────────────────────────────────────────────────────────────────────────────
// IndicatorTable
//
// "See all indicators" expander. Renders the full indicator list for the
// domain in the same shape as Section 4 of the data sourcing doc:
// indicator name, source, tier, resolution, cadence, direction,
// current value (when available).
//
// Loaded lazily on first expand. Subsequent toggles reuse the loaded data.
//
// Props:
//   domainSlug — required
//   focusId    — optional Focus context for value resolution
//   className  — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }

const TIER_LABEL  = { api: 'API', scrape: 'Scrape', contributor: 'Contributor' }
const SCALE_LABEL = { local: 'Local', regional: 'Regional', planetary: 'Planetary' }
const DIR_GLYPH   = { up: '↑', down: '↓', context: '→' }

export default function IndicatorTable({ domainSlug, focusId = null, className }) {
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
    fetchAllIndicators(domainSlug, focusId)
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

  return (
    <div className={className} style={{ marginTop: '24px' }}>
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
        {open ? 'Hide all indicators' : 'See all indicators →'}
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
              Loading the catalog.
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
              Could not load the indicator catalog.
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
              No indicators are catalogued for this domain yet.
            </p>
          )}
          {!loading && !error && rows && rows.length > 0 && (
            <Table rows={rows} />
          )}
        </div>
      )}
    </div>
  )
}

function Table({ rows }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(200, 146, 42, 0.20)',
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '14px',
          }}
        >
          <thead>
            <tr style={{ background: 'rgba(200, 146, 42, 0.05)' }}>
              <Th>Indicator</Th>
              <Th>Source</Th>
              <Th>Tier</Th>
              <Th>Resolution</Th>
              <Th>Cadence</Th>
              <Th align="center">Dir.</Th>
              <Th>Latest</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                style={{
                  borderTop: '1px solid rgba(200, 146, 42, 0.15)',
                }}
              >
                <Td>
                  <span style={{ fontWeight: 600, color: '#0F1523' }}>
                    {row.name}
                  </span>
                  {row.subdomain_slug && (
                    <span
                      style={{
                        ...sc,
                        display: 'block',
                        fontSize: '11px',
                        letterSpacing: '0.06em',
                        color: 'rgba(15, 21, 35, 0.55)',
                        marginTop: '2px',
                      }}
                    >
                      {row.subdomain_slug}
                    </span>
                  )}
                </Td>
                <Td>
                  {row.source_url ? (
                    <a
                      href={row.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#0F1523',
                        textDecoration: 'underline',
                        textDecorationColor: 'rgba(200, 146, 42, 0.45)',
                        textUnderlineOffset: '3px',
                      }}
                    >
                      {row.source_name}
                    </a>
                  ) : (
                    row.source_name
                  )}
                </Td>
                <Td>{TIER_LABEL[row.tier] || row.tier}</Td>
                <Td>{SCALE_LABEL[row.native_resolution] || row.native_resolution}</Td>
                <Td>
                  {row.refresh_cadence.charAt(0).toUpperCase() +
                    row.refresh_cadence.slice(1)}
                </Td>
                <Td align="center">{DIR_GLYPH[row.direction_preferred] || '·'}</Td>
                <Td>{formatLatest(row)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, align = 'left' }) {
  return (
    <th
      style={{
        ...sc,
        fontSize: '11px',
        letterSpacing: '0.08em',
        color: 'rgba(15, 21, 35, 0.72)',
        fontWeight: 600,
        textAlign: align,
        padding: '10px 14px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, align = 'left' }) {
  return (
    <td
      style={{
        padding: '12px 14px',
        textAlign: align,
        verticalAlign: 'top',
        color: 'rgba(15, 21, 35, 0.85)',
      }}
    >
      {children}
    </td>
  )
}

function formatLatest(row) {
  if (!row.value) return <span style={{ color: 'rgba(15, 21, 35, 0.45)' }}>—</span>
  const { numeric, text } = row.value
  if (numeric != null) {
    return `${numeric}${row.unit ? ` ${row.unit}` : ''}`
  }
  return text || '—'
}
