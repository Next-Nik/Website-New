// src/app/components/EffortSignalPanel.jsx
//
// Public-visible render of the bottom-up effort signal — the
// civilisational work in motion, summed by domain across all live
// actors on the Atlas.
//
// Per the Atlas Actor Profile Architecture Section 5:
//   - Aggregate is publicly visible.
//   - No actor is identifiable.
//   - No inter-domain ranking.
//   - Sub-slice display follows Lock 3 (minimum coverage before slices
//     are shown). For v1 we apply the threshold by suppressing the
//     by-mode / by-scale breakdown UI when active_actors is below
//     MIN_SLICE_COVERAGE. We still show the headline figures.

import { useEffortSignal } from '../hooks/useEffortSignal'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Lora', Georgia, serif" }

const MIN_SLICE_COVERAGE = 10  // Lock 3 from Section 5.8

// Bridge between actor.domains hyphenated ids and PLANET_DOMAINS keys
// (underscored). We don't import PLANET_DOMAINS to avoid cross-tool
// coupling; we duplicate the small bit of metadata we need here.
const DOMAIN_META = {
  'human-being':     { label: 'Human Being',     color: '#7B9E87' },
  'society':         { label: 'Society',         color: '#8E7BB5' },
  'nature':          { label: 'Nature',          color: '#5C8A5C' },
  'technology':      { label: 'Technology',      color: '#5B8DB8' },
  'finance-economy': { label: 'Economy',         color: '#4c6b45' },
  'legacy':          { label: 'Legacy',          color: '#A07850' },
  'vision':          { label: 'Vision',          color: '#9E7B9E' },
}

const DOMAIN_ORDER = [
  'human-being', 'society', 'nature',
  'technology', 'finance-economy',
  'legacy', 'vision',
]

function formatInt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T00:00:00Z')
    return d.toLocaleDateString('en-US', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function DomainRow({ domainId, row }) {
  const meta = DOMAIN_META[domainId] || { label: domainId, color: '#262420' }
  const hasMass = row.active_actors >= MIN_SLICE_COVERAGE

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '20px',
      padding: '18px 22px',
      background: '#FFFFFF',
      border: '1px solid rgba(76,107,69,0.18)',
      borderRadius: '8px',
    }}>
      {/* Domain color spine */}
      <div style={{
        width: '4px', height: '46px',
        background: meta.color, borderRadius: '2px',
        flexShrink: 0,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          ...sc, fontSize: '13px', letterSpacing: '0.16em',
          color: meta.color, textTransform: 'uppercase',
          marginBottom: '2px',
        }}>
          {meta.label}
        </p>
        <p style={{
          ...body, fontSize: '13px',
          color: 'rgba(15,21,35,0.55)', lineHeight: 1.5,
        }}>
          {hasMass
            ? `${formatInt(row.active_actors)} active actor${row.active_actors === 1 ? '' : 's'}, contributing the work below.`
            : `${formatInt(row.active_actors)} active actor${row.active_actors === 1 ? '' : 's'}. Coverage building.`}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          ...sc, fontSize: '13px', letterSpacing: '0.16em',
          color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          People in the work
        </p>
        <p style={{
          ...serif, fontSize: '28px', fontWeight: 400,
          color: '#0F1523', lineHeight: 1,
        }}>
          {formatInt(row.total_people_in_the_work)}
        </p>
      </div>
    </div>
  )
}

export function EffortSignalPanel({ variant = 'full' }) {
  const { data, loading, error } = useEffortSignal()

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ ...body, fontSize: '14px',
          color: 'rgba(15,21,35,0.55)' }}>
          Loading the effort signal…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '32px',
        background: 'rgba(138,48,48,0.04)',
        border: '1px solid rgba(138,48,48,0.20)',
        borderRadius: '8px', textAlign: 'center' }}>
        <p style={{ ...body, fontSize: '14px',
          color: 'rgba(15,21,35,0.65)' }}>
          The effort signal is temporarily unavailable.
        </p>
      </div>
    )
  }

  if (!data || !data.snapshot_date) {
    return (
      <div style={{ padding: '32px',
        background: 'rgba(76,107,69,0.04)',
        border: '1px dashed rgba(76,107,69,0.25)',
        borderRadius: '8px', textAlign: 'center' }}>
        <p style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em',
          color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
          marginBottom: '8px' }}>
          The work in motion
        </p>
        <p style={{ ...body, fontSize: '14px',
          color: 'rgba(15,21,35,0.65)', maxWidth: '460px',
          margin: '0 auto', lineHeight: 1.7 }}>
          The platform's first effort-signal snapshot has not yet
          been computed. It will be published daily once the cron
          runs for the first time.
        </p>
      </div>
    )
  }

  const headerCopy =
    variant === 'compact'
      ? 'Civilisational work in motion'
      : 'Civilisational work in motion'

  return (
    <div>
      {/* Eyebrow + heading */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{
          ...sc, fontSize: '13px', letterSpacing: '0.22em',
          color: '#262420', textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          The work in motion
        </p>
        <h3 style={{
          ...serif, fontSize: 'clamp(22px, 3vw, 30px)',
          fontWeight: 300, color: '#0F1523', lineHeight: 1.2,
          margin: 0, marginBottom: '8px',
        }}>
          {headerCopy}
        </h3>
        <p style={{
          ...body, fontSize: '14px',
          color: 'rgba(15,21,35,0.60)', lineHeight: 1.6,
          maxWidth: '620px', margin: 0,
        }}>
          The visible sum of aligned work being applied across the seven
          civilisational domains. One actor declaring honestly is one unit
          of the aggregate. No actor's contribution is identifiable from
          this view.
        </p>
      </div>

      {/* Per-domain rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px',
        marginBottom: '20px' }}>
        {DOMAIN_ORDER.map(d => (
          <DomainRow key={d} domainId={d} row={data.byDomain[d]} />
        ))}
      </div>

      {/* Snapshot date footer */}
      <p style={{
        ...sc, fontSize: '13px', letterSpacing: '0.20em',
        color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
        textAlign: 'right', marginTop: '4px',
      }}>
        Snapshot {formatDate(data.snapshot_date)}
      </p>
    </div>
  )
}
