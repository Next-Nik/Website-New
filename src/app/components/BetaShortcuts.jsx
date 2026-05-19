// src/app/components/BetaShortcuts.jsx
//
// A compact navigation panel that surfaces all the v2.5 / v2.5b / v2.5c
// destinations so they're reachable in one tap from /profile/edit.
//
// Gated behind useBetaShortcuts — only renders for the dev allowlist.
// When the feature opens to all users (or migrates into Mission Control),
// this component can be removed without touching any other code.
//
// Visual posture: quiet, one row, restrained. Not a marketing block.
// Reads as "internal nav" — small caps eyebrow, parchment background,
// gold-bordered chips.

import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useBetaShortcuts } from '../hooks/useBetaShortcuts'

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const gold    = '#A8721A'
const dark    = '#0F1523'

const GROUPS = [
  {
    label: 'Discover',
    items: [
      { to: '/focus',                 label: 'Directory' },
    ],
  },
  {
    label: 'Feeds',
    items: [
      { to: '/curated',               label: 'Curated' },
      { to: '/watched',               label: 'Watched' },
      { to: '/feed',                  label: 'Cohort / Local / People' },
    ],
  },
  {
    label: 'Self',
    items: [
      { to: '/dashboard',             label: 'Mission Control' },
    ],
  },
]

export function BetaShortcuts() {
  const enabled = useBetaShortcuts()
  const { user } = useAuth()
  if (!enabled) return null

  // Profile group — needs user.id to build a public-profile link
  const profileGroup = {
    label: 'You',
    items: [
      { to: `/profile/${user.id}`,    label: 'Public profile' },
      { to: '#identity',              label: 'Identity',     scroll: true },
      { to: '#places',                label: 'Places',       scroll: true },
      { to: '#watching',              label: 'Watching',     scroll: true },
      { to: '#roster',                label: 'Roster',       scroll: true },
    ],
  }

  const groups = [profileGroup, ...GROUPS]

  return (
    <section style={{
      marginBottom: '40px',
      padding: '18px 20px',
      background: 'rgba(200,146,42,0.04)',
      border: '1px solid rgba(200,146,42,0.30)',
      borderRadius: '10px',
    }}>
      <div style={{
        ...sc,
        fontSize: '10.5px',
        letterSpacing: '0.20em',
        color: gold,
        textTransform: 'uppercase',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span>Quick nav</span>
        <span style={{ color: 'rgba(15,21,35,0.40)', fontSize: '9.5px' }}>
          &middot; visible only to you
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {groups.map(group => (
          <div key={group.label} style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <span style={{
              ...sc,
              fontSize: '10px',
              letterSpacing: '0.16em',
              color: 'rgba(15,21,35,0.55)',
              textTransform: 'uppercase',
              minWidth: '54px',
            }}>
              {group.label}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {group.items.map(item => (
                <ShortcutChip key={item.to} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ShortcutChip({ item }) {
  // Anchor chips scroll to a section heading within the same page.
  // Standard chips link via react-router.
  const baseStyle = {
    ...body,
    fontSize: '13px',
    color: dark,
    background: '#FFFFFF',
    border: '1px solid rgba(200,146,42,0.30)',
    borderRadius: '16px',
    padding: '5px 12px',
    textDecoration: 'none',
    cursor: 'pointer',
  }

  if (item.scroll) {
    return (
      <a
        href={item.to}
        style={baseStyle}
        onClick={(e) => {
          e.preventDefault()
          const id = item.to.slice(1)
          const el = document.getElementById(id)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      >
        {item.label}
      </a>
    )
  }
  return (
    <Link to={item.to} style={baseStyle}>
      {item.label}
    </Link>
  )
}
