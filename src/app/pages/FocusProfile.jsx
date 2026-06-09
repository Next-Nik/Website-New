// src/app/pages/FocusProfile.jsx
//
// The universal Focus profile page — same component for Earth, Canada,
// Toronto, the Pacific Ocean, the Sahara, Cascadia, HAAB, anything else
// in nextus_focuses. Read-only this phase.
//
// Layers (per Geographic Scale Architecture v2.1):
//   1. Identity header — name, scale, kind, description, breadcrumb
//   2. Seven-domain wheel — mostly empty until indicator pipeline (v2.6)
//   3. What's nested under this Focus — direct children, grouped by kind
//   4. Touches — non-hierarchical adjacency
//   5. Affiliated people — cascaded counts per relationship type
//   6. Actors located here — orgs/practitioners with location in subtree
//   10. Editorial stewardship footer
//   11. Affiliate button — opens the affiliation flow pre-filled
//
// Deferred (named in code, not surfaced):
//   7. Catch points (needs Phase v2.6 indicator pipeline + Gap Signal v2)
//   8. Responders (pairs with 7)
//   9. Designations (mostly empty until Phases v2.3, v2.4)
//   Watch button (Phase v2.5b)

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { useFocusProfile } from '../hooks/useFocusProfile'
import { AffiliationPicker } from '../components/AffiliationPicker'
import { WatchButton } from '../components/WatchButton'
import { TYPE_LABEL, KIND_LABEL } from '../components/FocusSearch'
import { body, sc } from '../../lib/designTokens'

const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold    = '#A8721A'
const dark    = '#0F1523'
const parch   = '#FAFAF7'

const RELATIONSHIP_PROSE = {
  citizen:         { label: 'Citizens',         verb: 'on NextUs' },
  resident:        { label: 'Live here',        verb: '' },
  former_resident: { label: 'Lived here',       verb: '' },
  born_here:       { label: 'Born here',        verb: '' },
  heritage:        { label: 'Heritage ties',    verb: '' },
  working_here:    { label: 'Working here',     verb: '' },
  connected_to:    { label: 'Connected to',     verb: '' },
}

export function FocusProfile() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { data, loading, error } = useFocusProfile(slug)

  const [showPicker, setShowPicker] = useState(false)

  if (loading) return <LoadingShell />
  if (error || !data) return <NotFoundShell slug={slug} />

  const { focus, ancestors, children, touches, affiliationCounts, actors } = data

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="" />

      <div style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 160px',
      }}>

        {/* Layer 1 — Identity header */}
        <IdentityHeader focus={focus} ancestors={ancestors} />

        <Divider />

        {/* Layer 2 — Seven-domain wheel (placeholder for non-Earth focuses) */}
        <WheelLayer focus={focus} />

        <Divider />

        {/* Layer 3 — What's nested */}
        {children.length > 0 && (
          <>
            <NestedLayer focus={focus} children={children} />
            <Divider />
          </>
        )}

        {/* Layer 4 — Touches */}
        {touches.length > 0 && (
          <>
            <TouchesLayer touches={touches} />
            <Divider />
          </>
        )}

        {/* Layer 5 — Affiliated people */}
        {affiliationCounts.length > 0 && (
          <>
            <AffiliationsLayer counts={affiliationCounts} focusName={focus.name} />
            <Divider />
          </>
        )}

        {/* Layer 6 — Actors located here */}
        {actors.length > 0 && (
          <>
            <ActorsLayer actors={actors} focusName={focus.name} />
            <Divider />
          </>
        )}

        {/* Layer 11 — Watch + Affiliate buttons (visible to signed-in users) */}
        {user && (
          <section style={{ marginBottom: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'center' }}>
            <WatchButton
              entityType="focus"
              entityId={focus.id}
              entityName={focus.name}
            />
          </section>
        )}

        {user && (
          <AffiliateLayer
            user={user}
            focus={focus}
            showPicker={showPicker}
            setShowPicker={setShowPicker}
          />
        )}

        {/* Layer 10 — Editorial stewardship footer */}
        <StewardshipFooter />

      </div>
    </div>
  )
}

// ── Layer 1 — Identity header ────────────────────────────────────────────────

function IdentityHeader({ focus, ancestors }) {
  const typeLabel = TYPE_LABEL[focus.type] || focus.type
  const kindLabel = focus.kind ? KIND_LABEL[focus.kind] : null

  // Breadcrumb reads root-to-leaf. focus_ancestors returns closest-first;
  // reverse for display so it reads Earth → North America → Canada → Toronto.
  const breadcrumbChain = [...ancestors].reverse()

  return (
    <header style={{ marginBottom: '32px' }}>
      {/* Breadcrumb */}
      {breadcrumbChain.length > 0 && (
        <div style={{
          ...sc,
          fontSize: '11px',
          letterSpacing: '0.18em',
          color: 'rgba(15,21,35,0.55)',
          textTransform: 'uppercase',
          marginBottom: '14px',
        }}>
          {breadcrumbChain.map((a, i) => (
            <span key={a.id}>
              <Link
                to={`/focus/${a.slug}`}
                style={{ color: 'rgba(15,21,35,0.72)', textDecoration: 'none' }}
              >
                {a.name}
              </Link>
              {i < breadcrumbChain.length - 1 ? <span style={{ color: 'rgba(15,21,35,0.55)' }}> &nbsp;/&nbsp; </span> : null}
            </span>
          ))}
        </div>
      )}

      {/* Name */}
      <h1 style={{
        ...display,
        fontSize: 'clamp(36px, 5vw, 56px)',
        fontWeight: 300,
        lineHeight: 1.1,
        color: dark,
        margin: 0,
        marginBottom: '12px',
      }}>
        {focus.name}
      </h1>

      {/* Scale + kind */}
      <div style={{
        ...sc,
        fontSize: '12px',
        letterSpacing: '0.18em',
        color: gold,
        textTransform: 'uppercase',
      }}>
        {typeLabel}
        {kindLabel && (
          <>
            <span style={{ color: 'rgba(15,21,35,0.55)', margin: '0 10px' }}>·</span>
            <span style={{ color: 'rgba(15,21,35,0.72)' }}>{kindLabel}</span>
          </>
        )}
      </div>

      {/* Description */}
      {focus.description && (
        <p style={{
          ...body,
          fontSize: '16.5px',
          color: 'rgba(15,21,35,0.88)',
          lineHeight: 1.75,
          marginTop: '22px',
          marginBottom: 0,
        }}>
          {focus.description}
        </p>
      )}
    </header>
  )
}

// ── Layer 2 — Wheel (placeholder) ────────────────────────────────────────────

function WheelLayer({ focus }) {
  return (
    <section>
      <SectionHeader>The seven domains</SectionHeader>
      <div style={{
        padding: '24px 26px',
        background: 'rgba(200,146,42,0.04)',
        border: '1px dashed rgba(200,146,42,0.35)',
        borderRadius: '10px',
      }}>
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, margin: 0 }}>
          Every Focus has a seven-domain wheel describing the state of the
          place across Human Being, Society, Nature, Technology, Economy,
          Legacy, and Vision. Scores will arrive as the indicator pipeline
          fills them &mdash; sourced from credible monitors, never originated
          by the platform itself.
        </p>
        <p style={{ ...body, fontSize: '13.5px', color: 'rgba(15,21,35,0.55)', fontStyle: 'italic', marginTop: '12px', marginBottom: 0 }}>
          {focus.name}&rsquo;s wheel is not yet populated.
        </p>
      </div>
    </section>
  )
}

// ── Layer 3 — What's nested ──────────────────────────────────────────────────

function NestedLayer({ focus, children }) {
  // Group children by type for readable rendering.
  const grouped = {}
  for (const c of children) {
    const t = c.type || 'other'
    if (!grouped[t]) grouped[t] = []
    grouped[t].push(c)
  }
  const typesInOrder = Object.keys(grouped).sort()

  return (
    <section>
      <SectionHeader>Nested under {focus.name}</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {typesInOrder.map(t => (
          <div key={t}>
            <div style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.14em',
              color: 'rgba(15,21,35,0.55)',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              {TYPE_LABEL[t] || t} ({grouped[t].length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {grouped[t].slice(0, 40).map(c => (
                <Link
                  key={c.id}
                  to={`/focus/${c.slug}`}
                  style={{
                    ...body,
                    fontSize: '14px',
                    color: dark,
                    background: '#FFFFFF',
                    border: '1px solid rgba(200,146,42,0.30)',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    textDecoration: 'none',
                  }}
                >
                  {c.name}
                </Link>
              ))}
              {grouped[t].length > 40 && (
                <span style={{ ...body, fontSize: '13.5px', color: 'rgba(15,21,35,0.55)', alignSelf: 'center', fontStyle: 'italic' }}>
                  + {grouped[t].length - 40} more
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Layer 4 — Touches ────────────────────────────────────────────────────────

function TouchesLayer({ touches }) {
  return (
    <section>
      <SectionHeader>Also touches</SectionHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {touches.map(t => (
          <Link
            key={t.id}
            to={`/focus/${t.slug}`}
            style={{
              ...body,
              fontSize: '14px',
              color: dark,
              background: '#FFFFFF',
              border: '1px solid rgba(200,146,42,0.30)',
              borderRadius: '20px',
              padding: '6px 14px',
              textDecoration: 'none',
            }}
          >
            {t.name}
          </Link>
        ))}
      </div>
    </section>
  )
}

// ── Layer 5 — Affiliated people ──────────────────────────────────────────────

function AffiliationsLayer({ counts, focusName }) {
  return (
    <section>
      <SectionHeader>Affiliated people</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {counts.map(c => (
          <div key={c.relationship_type} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: '#FFFFFF',
            border: '1px solid rgba(200,146,42,0.18)',
            borderRadius: '8px',
          }}>
            <span style={{ ...body, fontSize: '15px', color: dark }}>
              {RELATIONSHIP_PROSE[c.relationship_type]?.label || c.relationship_type}
            </span>
            <span style={{ ...display, fontSize: '22px', color: gold, fontWeight: 400 }}>
              {c.affiliation_count}
            </span>
          </div>
        ))}
      </div>
      <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', fontStyle: 'italic', marginTop: '12px', marginBottom: 0 }}>
        Counts reflect public affiliations to {focusName} and everything nested
        within it, except citizenship which is counted only at the polity scale
        where it was declared.
      </p>
    </section>
  )
}

// ── Layer 6 — Actors located here ────────────────────────────────────────────

function ActorsLayer({ actors, focusName }) {
  return (
    <section>
      <SectionHeader>Operating in {focusName}</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {actors.map(a => (
          <Link
            key={a.id}
            to={`/org/${a.slug}`}
            style={{
              ...body,
              fontSize: '15px',
              color: dark,
              background: '#FFFFFF',
              border: '1px solid rgba(200,146,42,0.18)',
              borderRadius: '8px',
              padding: '10px 16px',
              textDecoration: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{a.name}</span>
            {a.kind && (
              <span style={{
                ...sc,
                fontSize: '10.5px',
                letterSpacing: '0.12em',
                color: gold,
                textTransform: 'uppercase',
              }}>
                {a.kind}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}

// ── Layer 11 — Affiliate button + inline picker ──────────────────────────────

function AffiliateLayer({ user, focus, showPicker, setShowPicker }) {
  if (showPicker) {
    return (
      <section style={{ marginBottom: '40px' }}>
        <SectionHeader>Claim a connection to {focus.name}</SectionHeader>
        <FocusPrefilledPicker
          userId={user.id}
          focus={focus}
          onCancel={() => setShowPicker(false)}
          onSaved={() => { setShowPicker(false); window.location.reload() }}
        />
      </section>
    )
  }
  return (
    <section style={{ marginBottom: '40px', textAlign: 'center' }}>
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        style={{
          ...sc,
          fontSize: '13px',
          letterSpacing: '0.18em',
          color: gold,
          background: 'rgba(200,146,42,0.04)',
          border: '1.5px solid rgba(200,146,42,0.55)',
          borderRadius: '30px',
          padding: '11px 26px',
          cursor: 'pointer',
        }}
      >
        Claim a connection to {focus.name}
      </button>
    </section>
  )
}

// Wraps AffiliationPicker with the focus already selected, so a visitor
// clicking "Claim Canada" goes straight to choosing relationship + visibility.
function FocusPrefilledPicker({ userId, focus, onCancel, onSaved }) {
  return (
    <AffiliationPicker
      userId={userId}
      existingPairs={[]}
      initialFocus={focus}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  )
}

// ── Layer 10 — Stewardship footer ────────────────────────────────────────────

function StewardshipFooter() {
  return (
    <footer style={{
      marginTop: '40px',
      paddingTop: '24px',
      borderTop: '1px solid rgba(200,146,42,0.20)',
      textAlign: 'center',
    }}>
      <p style={{
        ...body,
        fontSize: '13px',
        color: 'rgba(15,21,35,0.55)',
        fontStyle: 'italic',
        margin: 0,
        lineHeight: 1.7,
      }}>
        Editorial stewardship &mdash; maintained by NextUs.
      </p>
    </footer>
  )
}

// ── Shared building blocks ───────────────────────────────────────────────────

function SectionHeader({ children }) {
  return (
    <h2 style={{
      ...sc,
      fontSize: '13px',
      letterSpacing: '0.20em',
      color: gold,
      textTransform: 'uppercase',
      margin: 0,
      marginBottom: '18px',
      fontWeight: 400,
    }}>
      {children}
    </h2>
  )
}

function Divider() {
  return (
    <div style={{
      height: '1px',
      background: 'rgba(200,146,42,0.10)',
      marginBottom: '40px',
      marginTop: '8px',
    }} />
  )
}

function LoadingShell() {
  return (
    <div style={{ minHeight: '100vh', background: parch }}>
      <Nav activePath="" />
      <div style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: '160px 24px',
        textAlign: 'center',
      }}>
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
          Loading&hellip;
        </p>
      </div>
    </div>
  )
}

function NotFoundShell({ slug }) {
  return (
    <div style={{ minHeight: '100vh', background: parch }}>
      <Nav activePath="" />
      <div style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: '160px 24px',
        textAlign: 'center',
      }}>
        <p style={{
          ...body,
          fontSize: '17px',
          fontWeight: 400,
          color: 'rgba(15,21,35,0.55)',
          lineHeight: 1.75,
          marginBottom: '24px',
        }}>
          No focus found for &ldquo;{slug}&rdquo;. The directory may not have ingested this entity yet.
        </p>
        <Link
          to="/focus"
          style={{
            ...sc, fontSize: '12px', letterSpacing: '0.16em',
            color: gold, background: 'rgba(200,146,42,0.05)',
            border: '1px solid rgba(200,146,42,0.55)',
            borderRadius: '30px', padding: '10px 22px',
            textDecoration: 'none', textTransform: 'uppercase',
          }}
        >
          Browse the directory
        </Link>
      </div>
    </div>
  )
}
