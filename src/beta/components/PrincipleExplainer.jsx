import { useEffect, useState } from 'react'
import {
  PRINCIPLES,
  PRINCIPLE_SLUGS,
  isValidPrincipleSlug,
} from '../constants/principles'
import { fetchEntitiesEngagingPrinciple } from '../hooks/useTaggedPrinciples'

// ─────────────────────────────────────────────────────────────────────────────
// PrincipleExplainer
//
// Full-page or modal component giving the canonical definition of one
// platform-level principle and listing the entities (actors, practices,
// indicators, domain entries, contributors) currently engaging it.
//
// Two render modes:
//   - mode='page'  — content lays out on the page directly. Used at routes
//                    like /beta/principles/[slug].
//   - mode='modal' — wraps in a modal shell with backdrop and close button.
//
// The component fetches entity counts grouped by target_type. It does not
// fetch the entities themselves — surfaces that need to render the linked
// actor or practice name resolve those locally from the actor and practice
// tables. This keeps the explainer light and reusable. If no entities are
// tagged yet, the empty state names the principle and its definition. No
// filler.
//
// Props:
//   slug      — one of the four canonical principle slugs (required)
//   mode      — 'page' | 'modal' (default 'page')
//   onClose   — used in modal mode
//   linkBuilder({ targetType, targetId }) — optional, returns a string href
//                or null. If returned null, the entity is shown as plain text.
//   maxPerType — number of entities to fetch per type (default 50)
// ─────────────────────────────────────────────────────────────────────────────

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

const TYPE_LABELS = {
  actor:        'Actors',
  practice:     'Practices',
  indicator:    'Indicators',
  domain_entry: 'Domain entries',
  contributor:  'Contributors',
}

const TYPE_ORDER = ['actor', 'practice', 'indicator', 'domain_entry', 'contributor']

export default function PrincipleExplainer({
  slug,
  mode = 'page',
  onClose,
  linkBuilder,
  maxPerType = 50,
}) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!isValidPrincipleSlug(slug)) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetchEntitiesEngagingPrinciple(slug, { limit: maxPerType * 5 })
      .then((rows) => {
        if (!cancelled) {
          setEntries(rows)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err)
          setEntries([])
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [slug, maxPerType])

  if (!isValidPrincipleSlug(slug)) {
    return (
      <Shell mode={mode} onClose={onClose}>
        <p style={{ ...body, fontSize: '17px', color: '#0F1523' }}>
          Unknown principle.
        </p>
      </Shell>
    )
  }

  const principle = PRINCIPLES[slug]

  // Group entries by target_type, preserving stable order.
  const grouped = TYPE_ORDER.reduce((acc, type) => {
    const ofType = entries.filter((e) => e.target_type === type).slice(0, maxPerType)
    if (ofType.length > 0) acc.push({ type, items: ofType })
    return acc
  }, [])

  return (
    <Shell mode={mode} onClose={onClose}>
      <span
        style={{
          ...sc,
          display: 'block',
          fontSize: '13px',
          letterSpacing: '0.08em',
          color: '#A8721A',
          fontWeight: 600,
          marginBottom: '8px',
        }}
      >
        Platform-Level Principle
      </span>

      <h1
        style={{
          ...display,
          fontSize: 'clamp(28px, 4vw, 44px)',
          fontWeight: 300,
          color: '#0F1523',
          margin: '0 0 20px',
          lineHeight: 1.15,
        }}
      >
        {principle.label}
      </h1>

      <p
        style={{
          ...body,
          fontSize: '18px',
          lineHeight: 1.6,
          color: '#0F1523',
          margin: '0 0 32px',
        }}
      >
        {principle.definition}
      </p>

      <div
        aria-hidden
        style={{
          height: '1px',
          background: 'rgba(200, 146, 42, 0.20)',
          margin: '0 0 24px',
        }}
      />

      <span
        style={{
          ...sc,
          display: 'block',
          fontSize: '13px',
          letterSpacing: '0.08em',
          color: '#A8721A',
          fontWeight: 600,
          marginBottom: '12px',
        }}
      >
        Engaging this principle
      </span>

      {loading && (
        <p
          style={{
            ...body,
            fontSize: '15px',
            color: 'rgba(15, 21, 35, 0.55)',
            margin: 0,
          }}
        >
          Loading.
        </p>
      )}

      {error && (
        <p
          style={{
            ...body,
            fontSize: '15px',
            color: 'rgba(138, 48, 48, 0.85)',
            margin: 0,
          }}
        >
          Could not load entities engaging this principle.
        </p>
      )}

      {!loading && !error && grouped.length === 0 && (
        <p
          style={{
            ...body,
            fontSize: '16px',
            lineHeight: 1.55,
            color: 'rgba(15, 21, 35, 0.72)',
            margin: 0,
          }}
        >
          This principle is part of the platform&rsquo;s orienting commitments. No
          entities have been tagged against it yet. Definition above.
        </p>
      )}

      {!loading && !error && grouped.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {grouped.map(({ type, items }) => (
            <section key={type}>
              <h2
                style={{
                  ...sc,
                  fontSize: '15px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: '#0F1523',
                  margin: '0 0 8px',
                }}
              >
                {TYPE_LABELS[type] || type}{' '}
                <span
                  style={{
                    color: 'rgba(15, 21, 35, 0.55)',
                    fontWeight: 400,
                  }}
                >
                  ({items.length})
                </span>
              </h2>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {items.map((row) => {
                  const href = linkBuilder
                    ? linkBuilder({ targetType: row.target_type, targetId: row.target_id })
                    : null
                  return (
                    <li key={row.id} style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <span
                        style={{
                          ...sc,
                          fontSize: '12px',
                          letterSpacing: '0.06em',
                          color: 'rgba(15, 21, 35, 0.55)',
                          minWidth: '70px',
                        }}
                      >
                        {row.weight}
                      </span>
                      {href ? (
                        <a
                          href={href}
                          style={{
                            ...body,
                            fontSize: '16px',
                            color: '#0F1523',
                            textDecoration: 'underline',
                            textDecorationColor: 'rgba(200, 146, 42, 0.45)',
                            textUnderlineOffset: '3px',
                          }}
                        >
                          {row.target_id}
                        </a>
                      ) : (
                        <span
                          style={{
                            ...body,
                            fontSize: '16px',
                            color: '#0F1523',
                          }}
                        >
                          {row.target_id}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Shell>
  )
}

// Convenience: list all four principles as cards. Useful on a /beta/principles
// index page.
export function PrincipleIndex({ linkBuilder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {PRINCIPLE_SLUGS.map((s) => {
        const p = PRINCIPLES[s]
        const href = linkBuilder ? linkBuilder({ slug: s }) : `/beta/principles/${s}`
        return (
          <a
            key={s}
            href={href}
            style={{
              display: 'block',
              padding: '20px 22px',
              background: '#FFFFFF',
              border: '1px solid rgba(200, 146, 42, 0.20)',
              borderRadius: '14px',
              textDecoration: 'none',
              color: '#0F1523',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(200, 146, 42, 0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
          >
            <span
              style={{
                ...sc,
                display: 'block',
                fontSize: '13px',
                letterSpacing: '0.08em',
                color: '#A8721A',
                fontWeight: 600,
                marginBottom: '6px',
              }}
            >
              Principle {p.sortOrder}
            </span>
            <span
              style={{
                ...display,
                display: 'block',
                fontSize: '24px',
                fontWeight: 300,
                lineHeight: 1.2,
                marginBottom: '8px',
              }}
            >
              {p.label}
            </span>
            <span
              style={{
                ...body,
                display: 'block',
                fontSize: '15px',
                lineHeight: 1.55,
                color: 'rgba(15, 21, 35, 0.72)',
              }}
            >
              {p.definition}
            </span>
          </a>
        )
      })}
    </div>
  )
}

// ─── Internal: shell ─────────────────────────────────────────────────────────

function Shell({ mode, onClose, children }) {
  if (mode !== 'modal') {
    return (
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '32px 24px',
          background: '#FAFAF7',
        }}
      >
        {children}
      </div>
    )
  }

  // Modal mode.
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 21, 35, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: '#FAFAF7',
          borderRadius: '14px',
          padding: '32px 28px',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            ...sc,
            position: 'absolute',
            top: '12px',
            right: '14px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(15, 21, 35, 0.55)',
            fontSize: '13px',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            padding: '6px 10px',
          }}
        >
          Close
        </button>
        {children}
      </div>
    </div>
  )
}
