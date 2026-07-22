import { useEffect, useState } from 'react'
import { fetchAllIndicators } from '../hooks/useDomainIndicators'
import SuggestSourceCTA from './SuggestSourceCTA'
import { at } from '../../lib/designTokens'

// ─────────────────────────────────────────────────────────────────────────────
// IndicatorTable
//
// "See all indicators" expander. Renders the full indicator list for the
// domain in the same shape as Section 4 of the data sourcing doc:
// indicator name, source, tier, resolution, cadence, direction,
// current value (when available).
//
// Module 11.8 (B-3 follow-ups) additions:
//   - Tier pill in the source cell — explicit about whether the row is
//     fetched live, scrape-pending, or contributor-only
//   - "Context indicator" pill on rows where direction='context' so
//     users can see those rows are intentionally not contributing to
//     the rollup
//   - "as of YYYY" inline timestamp on values, more honest than a
//     freshness dot
//   - SuggestSourceCTA on every row missing a value (Tier 2 pending,
//     Tier 3 contributor placeholder, or fetcher-failed)
//   - "also read in: [domain]" hint when this indicator has aliases
//
// Loaded lazily on first expand. Subsequent toggles reuse the loaded data.
//
// Props:
//   domainSlug — required
//   focusId    — optional Focus context for value resolution
//   className  — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc      = { fontFamily: "'IBM Plex Mono', Georgia, serif" }
const body    = { fontFamily: "'Newsreader', Georgia, serif" }

const TIER_LABEL  = { api: 'Live', scrape: 'Pending', contributor: 'Contributor' }
const TIER_COLOUR = {
  api:         { bg: 'rgba(93, 188, 157, 0.12)',  fg: '#3F8C6F' },
  scrape:      { bg: 'rgba(169,116,63, 0.10)',  fg: at.brass },
  contributor: { bg: 'rgba(15, 21, 35, 0.06)',    fg: at.meta },
}
const SCALE_LABEL = { local: 'Local', regional: 'Regional', planetary: 'Planetary' }
const DIR_GLYPH   = { up: '↑', down: '↓', context: '→' }

// Domain id → display label, used in alias hints. Mirrors the civ-wheel
// labels but in a readable form.
const DOMAIN_LABEL = {
  'human-being':     'Human Being',
  'society':         'Society',
  'nature':          'Nature',
  'technology':      'Technology',
  'finance-economy': 'Economy',
  'legacy':          'Legacy',
  'vision':          'Vision',
}

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
          color: at.brass,
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
                color: at.ghost,
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
                color: at.ghost,
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
        background: at.object,
        border: '1px solid rgba(76,107,69, 0.20)',
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: '14px',
          }}
        >
          <thead>
            <tr style={{ background: 'rgba(76,107,69, 0.05)' }}>
              <Th>Indicator</Th>
              <Th>Source</Th>
              <Th>Resolution</Th>
              <Th>Cadence</Th>
              <Th align="center">Dir.</Th>
              <Th>Latest</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ row }) {
  const tier = row.tier || 'api'
  const tierColour = TIER_COLOUR[tier] || TIER_COLOUR.api
  const isContext = row.direction_preferred === 'context'
  const hasValue = !!(row.value && (row.value.numeric != null || row.value.text))
  const showSuggestCTA = !hasValue && (tier === 'scrape' || tier === 'contributor')

  // Alias hint: if the catalog row has aliases pointing INTO it
  // (canonical_in_other_domains) or this row IS an alias pointing
  // elsewhere (alias_to_canonical_domain), we surface that.
  // The data sourcing layer query is expected to return either or both
  // shapes when present; both are optional fields.
  const aliasDomains = []
  if (Array.isArray(row.canonical_in_other_domains)) {
    for (const d of row.canonical_in_other_domains) {
      if (d && d !== row.domain_id) aliasDomains.push(d)
    }
  }
  if (row.alias_to_canonical_domain && row.alias_to_canonical_domain !== row.domain_id) {
    aliasDomains.push(row.alias_to_canonical_domain)
  }

  return (
    <tr style={{ borderTop: '1px solid rgba(76,107,69, 0.15)' }}>
      <Td>
        <span style={{ fontWeight: 600, color: at.text }}>
          {row.name}
        </span>
        {row.subdomain_slug && (
          <span
            style={{
              ...sc,
              display: 'block',
              fontSize: '13px',
              letterSpacing: '0.06em',
              color: at.ghost,
              marginTop: '2px',
            }}
          >
            {row.subdomain_slug}
          </span>
        )}
        {isContext && (
          <Pill text="Context" colour={at.ghost} bg="rgba(38,36,32,0.06)" tooltip="Context indicators are descriptive, not aspirational. They do not contribute to the rollup score." />
        )}
        {aliasDomains.length > 0 && (
          <div
            style={{
              ...sc,
              display: 'block',
              fontSize: '13px',
              letterSpacing: '0.08em',
              color: at.ghost,
              marginTop: '4px',
              fontWeight: 600,
            }}
          >
            also read in: {aliasDomains.map((d) => DOMAIN_LABEL[d] || d).join(', ')}
          </div>
        )}
      </Td>
      <Td>
        {row.source_url ? (
          <a
            href={row.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: at.text,
              textDecoration: 'underline',
              textDecorationColor: 'rgba(76,107,69, 0.45)',
              textUnderlineOffset: '3px',
            }}
          >
            {row.source_name}
          </a>
        ) : (
          row.source_name
        )}
        <Pill
          text={TIER_LABEL[tier] || tier}
          colour={tierColour.fg}
          bg={tierColour.bg}
          tooltip={
            tier === 'api'
              ? 'Fetched live from a public API on each cron run.'
              : tier === 'scrape'
              ? 'Source identified, fetcher not yet built. Help us source this if you know a route.'
              : 'Filled by community attestation rather than mainstream statistical pipelines.'
          }
        />
        {showSuggestCTA && (
          <div style={{ marginTop: '6px' }}>
            <SuggestSourceCTA indicatorId={row.id} indicatorName={row.name} />
          </div>
        )}
      </Td>
      <Td>{SCALE_LABEL[row.native_resolution] || row.native_resolution}</Td>
      <Td>
        {row.refresh_cadence
          ? row.refresh_cadence.charAt(0).toUpperCase() + row.refresh_cadence.slice(1)
          : '—'}
      </Td>
      <Td align="center">{DIR_GLYPH[row.direction_preferred] || '·'}</Td>
      <Td>{formatLatest(row)}</Td>
    </tr>
  )
}

function Pill({ text, colour, bg, tooltip }) {
  return (
    <span
      title={tooltip || undefined}
      style={{
        ...sc,
        display: 'inline-block',
        marginTop: '4px',
        marginRight: '6px',
        padding: '2px 8px',
        background: bg,
        color: colour,
        borderRadius: '999px',
        fontSize: '13px',
        letterSpacing: '0.08em',
        fontWeight: 600,
        cursor: tooltip ? 'help' : 'default',
      }}
    >
      {text}
    </span>
  )
}

function Th({ children, align = 'left' }) {
  return (
    <th
      style={{
        ...sc,
        fontSize: '13px',
        letterSpacing: '0.08em',
        color: at.meta,
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
  if (!row.value) {
    return <span style={{ color: at.ghost }}>—</span>
  }
  const { numeric, text, observed_at } = row.value
  const valueStr = numeric != null
    ? `${numeric}${row.unit ? ` ${row.unit}` : ''}`
    : (text || '—')

  const yearStr = observed_at ? extractYear(observed_at) : null

  return (
    <span>
      <span style={{ color: at.text }}>{valueStr}</span>
      {yearStr && (
        <span
          style={{
            ...sc,
            display: 'block',
            fontSize: '13px',
            letterSpacing: '0.08em',
            color: at.ghost,
            marginTop: '2px',
          }}
        >
          as of {yearStr}
        </span>
      )}
    </span>
  )
}

function extractYear(iso) {
  // Robust to ISO-8601 timestamps and plain date strings.
  const m = String(iso).match(/^(\d{4})/)
  return m ? m[1] : null
}
