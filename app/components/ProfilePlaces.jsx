// src/app/components/ProfilePlaces.jsx
//
// The Places section on a user's public profile.
// Renders the affiliations they have chosen to make public, grouped by
// relationship type, with the breadcrumb context that the cascade gives
// us (Toronto, Ontario, Canada).
//
// Read-only. Pure rendering. The viewer never edits anyone else's affiliations.
//
// Each Focus name is a link to its profile page at /focus/:slug, so a
// visitor reading "Born in Toronto, Ontario, Canada" can click any of
// those three names and land on that Focus's page.

import { Link } from 'react-router-dom'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold = '#A8721A'
const dark = '#0F1523'

// The label that precedes each group, framed naturally as a phrase a
// visitor reads. "Citizen of Canada." "Born in Toronto."
const GROUP_PROSE = {
  citizen:         { single: 'Citizen of',     multi: 'Citizen of' },
  resident:        { single: 'Lives in',       multi: 'Lives in' },
  former_resident: { single: 'Lived in',       multi: 'Lived in' },
  born_here:       { single: 'Born in',        multi: 'Born in' },
  heritage:        { single: 'Heritage',       multi: 'Heritage' },
  working_here:    { single: 'Works at',       multi: 'Works at' },
  connected_to:    { single: 'Connected to',   multi: 'Connected to' },
}

const RELATIONSHIP_ORDER = [
  'citizen',
  'resident',
  'former_resident',
  'born_here',
  'heritage',
  'working_here',
  'connected_to',
]

export function ProfilePlaces({ affiliations }) {
  if (!affiliations || affiliations.length === 0) return null

  // Group by relationship type.
  const grouped = {}
  for (const a of affiliations) {
    if (!grouped[a.relationship_type]) grouped[a.relationship_type] = []
    grouped[a.relationship_type].push(a)
  }

  const groupsInOrder = RELATIONSHIP_ORDER.filter(r => grouped[r]?.length > 0)
  if (groupsInOrder.length === 0) return null

  return (
    <section style={{ marginBottom: '64px' }}>
      <h2 style={{
        ...sc,
        fontSize: '13px',
        letterSpacing: '0.20em',
        color: gold,
        textTransform: 'uppercase',
        margin: 0,
        marginBottom: '20px',
        fontWeight: 400,
      }}>
        Places
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {groupsInOrder.map(rel => {
          const rows = grouped[rel]
          const label = rows.length > 1 ? GROUP_PROSE[rel].multi : GROUP_PROSE[rel].single
          return (
            <div key={rel}>
              <span style={{
                ...sc,
                fontSize: '13px',
                letterSpacing: '0.16em',
                color: 'rgba(15,21,35,0.72)',
                textTransform: 'uppercase',
                marginRight: '10px',
              }}>
                {label}
              </span>
              <span style={{
                ...display,
                fontSize: '19px',
                color: dark,
                lineHeight: 1.7,
              }}>
                {rows.map((row, i) => (
                  <span key={row.id}>
                    <PlaceWithBreadcrumb focus={row.focus} ancestors={row.ancestors} />
                    {i < rows.length - 1 ? <span style={{ color: 'rgba(15,21,35,0.55)' }}> &nbsp;·&nbsp; </span> : null}
                  </span>
                ))}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function PlaceWithBreadcrumb({ focus, ancestors }) {
  // Build the breadcrumb chain. Skip Earth and continent ancestors —
  // "Toronto, Ontario, Canada" reads naturally; "Toronto, Ontario, Canada,
  // North America, Earth" is noise. Cut off at country scale or above.
  const stopTypes = new Set(['continent', 'planet'])
  const trimmedAncestors = (ancestors || []).filter(a => !stopTypes.has(a.type))

  return (
    <>
      <Link
        to={`/focus/${focus.slug}`}
        style={{ color: dark, textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.30)' }}
      >
        {focus.name}
      </Link>
      {trimmedAncestors.length > 0 && (
        <span style={{ ...body, fontSize: '14.5px', color: 'rgba(15,21,35,0.55)', fontStyle: 'italic' }}>
          {' · '}
          {trimmedAncestors.map((a, i) => (
            <span key={a.id}>
              <Link
                to={`/focus/${a.slug}`}
                style={{ color: 'rgba(15,21,35,0.55)', textDecoration: 'none' }}
              >
                {a.name}
              </Link>
              {i < trimmedAncestors.length - 1 ? ', ' : ''}
            </span>
          ))}
        </span>
      )}
    </>
  )
}
