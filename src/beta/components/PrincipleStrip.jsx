import { useMemo, useState } from 'react'
import PrincipleBadge from './PrincipleBadge'
import {
  PRINCIPLES,
  sortTaggings,
  isValidPrincipleSlug,
} from '../constants/principles'

// ─────────────────────────────────────────────────────────────────────────────
// PrincipleStrip
//
// Renders an array of PrincipleBadge components for an actor, practice,
// indicator, contribution, or any tagged entity. Shows up to four; collapses
// the rest behind "+ N more."
//
// Accepts either:
//   - taggings: [{ principle_slug, weight }] — the canonical shape from
//     useTaggedPrinciples(). Sorted automatically.
//   - principles: [{ slug, weight }] — convenience shape for static call sites.
//   - slugs: ['indigenous-relational', ...] — minimum case, all rendered as
//     primary weight.
//
// Pass exactly one of these. If none is passed, the strip renders nothing.
//
// Props:
//   taggings | principles | slugs — see above
//   max         — number of badges to show before collapsing (default 4)
//   size        — passed through to PrincipleBadge ('sm' | 'md')
//   gap         — px gap between badges (default 6)
//   className   — optional className passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

function normalise({ taggings, principles, slugs }) {
  if (Array.isArray(taggings) && taggings.length) {
    return taggings
      .filter((t) => isValidPrincipleSlug(t?.principle_slug))
      .map((t) => ({ slug: t.principle_slug, weight: t.weight || 'primary' }))
  }
  if (Array.isArray(principles) && principles.length) {
    return principles
      .filter((p) => isValidPrincipleSlug(p?.slug))
      .map((p) => ({ slug: p.slug, weight: p.weight || 'primary' }))
  }
  if (Array.isArray(slugs) && slugs.length) {
    return slugs
      .filter(isValidPrincipleSlug)
      .map((slug) => ({ slug, weight: 'primary' }))
  }
  return []
}

export default function PrincipleStrip({
  taggings,
  principles,
  slugs,
  max = 4,
  size = 'sm',
  gap = 6,
  className,
}) {
  const [expanded, setExpanded] = useState(false)

  const items = useMemo(() => {
    const norm = normalise({ taggings, principles, slugs })
    // Reuse sortTaggings by adapting shape.
    return sortTaggings(
      norm.map((n) => ({ principle_slug: n.slug, weight: n.weight })),
    ).map((s) => ({ slug: s.principle_slug, weight: s.weight }))
  }, [taggings, principles, slugs])

  if (items.length === 0) return null

  const visible = expanded ? items : items.slice(0, max)
  const hidden  = expanded ? 0 : Math.max(items.length - max, 0)

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        gap: `${gap}px`,
        alignItems: 'center',
      }}
    >
      {visible.map((item) => (
        <PrincipleBadge
          key={`${item.slug}-${item.weight}`}
          slug={item.slug}
          weight={item.weight}
          size={size}
        />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            ...sc,
            background: 'transparent',
            border: 'none',
            color: 'rgba(15, 21, 35, 0.55)',
            fontSize: size === 'md' ? '14px' : '13px',
            letterSpacing: '0.04em',
            padding: '4px 8px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#A8721A')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(15, 21, 35, 0.55)')}
        >
          + {hidden} more
        </button>
      )}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EntityPrincipleEmptyState
//
// Use this when an entity has principle taggings but no other content to
// display. Renders the canonical sentence: "This entity engages the [label]
// principle. Definition: [text]." No filler.
//
// Pass either a single `slug` or an array of `slugs`. If multiple, the helper
// chooses the primary tagging by canonical sort order. If `slugs` is empty
// or all invalid, returns null.
//
// Props:
//   slug      — a single principle slug (convenience)
//   slugs     — an array of principle slugs (uses the canonically first one)
//   className — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const body = { fontFamily: "'Lora', Georgia, serif" }

export function EntityPrincipleEmptyState({ slug, slugs, className }) {
  const list = Array.isArray(slugs) && slugs.length
    ? slugs.filter(isValidPrincipleSlug)
    : isValidPrincipleSlug(slug)
    ? [slug]
    : []
  if (list.length === 0) return null

  // Pick the canonically-first principle.
  const ordered = list
    .map((s) => PRINCIPLES[s])
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const principle = ordered[0]
  if (!principle) return null

  return (
    <p
      className={className}
      style={{
        ...body,
        fontSize: '16px',
        lineHeight: 1.55,
        color: 'rgba(15, 21, 35, 0.72)',
        margin: 0,
      }}
    >
      This entity engages the {principle.label} principle. Definition:{' '}
      {principle.definition}
    </p>
  )
}
