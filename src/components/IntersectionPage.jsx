// src/app/components/IntersectionPage.jsx
//
// The deepest level of /explore: a specific field, optionally scoped to a
// geographic Focus via ?at=.
//
// What it shows:
//   1. Header: domain → subdomain → field path, the field name, topics
//   2. Actors tagged here (grouped by scale, sorted by recency)
//   3. A small "recent activity" feed section — same useFeed engine,
//      filtered to actors tagged at this coordinate (and intersected with
//      the geographic scope if present)
//
// Ranking honesty: no algorithmic rank. Group by scale, sort by recency
// within group. When the platform has more data and a real ranking model,
// this surface can be re-shaped without affecting upstream navigation.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useViewerContext } from '../hooks/useViewerContext'
import { useFeed } from '../hooks/useFeed'
import { FeedItem } from './feed/FeedItem'
import { body, sc } from '../../lib/designTokens'

const display = { fontFamily: "'Fraunces', Georgia, serif" }
const GOLD = '#26302A'
const INK  = '#0F1523'

const SCALE_ORDER = [
  'local', 'municipal', 'state-province', 'national',
  'regional', 'continental', 'global', 'unspecified',
]

const SCALE_LABEL = {
  'local':           'Local',
  'municipal':       'Municipal',
  'state-province':  'State / Province',
  'national':        'National',
  'regional':        'Regional',
  'continental':     'Continental',
  'global':          'Global',
  'unspecified':     'Scale not declared',
}

export function IntersectionPage({ domain, subdomain, field, atFocus }) {
  return (
    <div>
      <Header
        domain={domain}
        subdomain={subdomain}
        field={field}
        atFocus={atFocus}
      />

      <ActorsLayer
        field={field}
        atFocus={atFocus}
        accentColor={domain.color}
      />

      <ActivityLayer
        field={field}
        atFocus={atFocus}
      />
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────
function Header({ domain, subdomain, field, atFocus }) {
  return (
    <header style={{ marginBottom: '40px' }}>
      <div style={{
        ...sc, fontSize: '13px', letterSpacing: '0.20em',
        color: domain.color, textTransform: 'uppercase', marginBottom: '8px',
      }}>
        {domain.name} · {subdomain.name}
      </div>
      <h1 style={{
        ...display,
        fontSize: 'clamp(28px, 4vw, 40px)',
        fontWeight: 300, color: INK,
        margin: 0, marginBottom: '14px', lineHeight: 1.2,
      }}>
        {field.name}
        {atFocus && (
          <span style={{ ...body, fontSize: '0.55em', fontStyle: 'italic', color: 'rgba(15,21,35,0.55)', marginLeft: '12px' }}>
            in {atFocus.name}
          </span>
        )}
      </h1>

      {field.topics && field.topics.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
          {field.topics.map((t, i) => (
            <span key={i} style={{
              ...body, fontSize: '13px',
              color: 'rgba(15,21,35,0.72)',
              background: 'rgba(110,127,92,0.04)',
              border: '1px solid rgba(110,127,92,0.18)',
              borderRadius: '12px', padding: '3px 10px',
            }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </header>
  )
}

// ── Actors layer ──────────────────────────────────────────────────────────
function ActorsLayer({ field, atFocus, accentColor }) {
  const [actors, setActors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)

      // Find actors whose fields slug-array contains this field's slug.
      // Actor schema uses `fields` text[] (slugs), not `field_ids` uuids.
      let query = supabase
        .from('nextus_actors')
        .select('id, name, slug, kind, scale, focus_id, short_description, status, updated_at')
        .contains('fields', [field.slug])
        .eq('status', 'live')
        .order('updated_at', { ascending: false })
        .limit(200)

      // If we have a geographic focus, narrow to actors operating there.
      if (atFocus) {
        query = query.eq('focus_id', atFocus.id)
      }

      const { data } = await query
      if (cancelled) return
      setActors(data || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [field.id, atFocus?.id])

  // Group by scale, in canonical order
  const grouped = useMemo(() => {
    const g = {}
    for (const a of actors) {
      const key = a.scale || 'unspecified'
      if (!g[key]) g[key] = []
      g[key].push(a)
    }
    return g
  }, [actors])

  return (
    <section style={{ marginBottom: '56px' }}>
      <div style={{
        ...sc, fontSize: '13px', letterSpacing: '0.18em',
        color: GOLD, textTransform: 'uppercase', marginBottom: '16px',
      }}>
        Actors here {actors.length > 0 && <span style={{ color: 'rgba(15,21,35,0.55)' }}>· {actors.length}</span>}
      </div>

      {loading && (
        <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>
          Loading&hellip;
        </p>
      )}

      {!loading && actors.length === 0 && (
        <div style={{
          ...body, fontSize: '14.5px',
          color: 'rgba(15,21,35,0.72)', fontStyle: 'italic',
          padding: '18px',
          background: 'rgba(110,127,92,0.04)',
          border: '1px dashed rgba(110,127,92,0.30)',
          borderRadius: '8px',
        }}>
          {atFocus
            ? `No actors yet tagged in this field and operating in ${atFocus.name}. As editorial seeding fills in, this surface populates.`
            : 'No actors yet tagged in this field. As editorial seeding fills in, this surface populates.'}
        </div>
      )}

      {!loading && actors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {SCALE_ORDER
            .filter(s => grouped[s] && grouped[s].length > 0)
            .map(scale => (
              <div key={scale}>
                <div style={{
                  ...sc, fontSize: '13px', letterSpacing: '0.16em',
                  color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
                  marginBottom: '10px',
                }}>
                  {SCALE_LABEL[scale]} · {grouped[scale].length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {grouped[scale].map(a => (
                    <ActorCard key={a.id} actor={a} accentColor={accentColor} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  )
}

function ActorCard({ actor, accentColor }) {
  return (
    <Link
      to={`/org/${actor.slug || actor.id}`}
      style={{
        display: 'block',
        padding: '14px 16px',
        background: '#FFFFFF',
        border: '1px solid rgba(110,127,92,0.18)',
        borderRadius: '8px',
        textDecoration: 'none',
        color: INK,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ ...body, fontSize: '15.5px', fontWeight: 400, color: INK }}>
          {actor.name}
        </div>
        {actor.kind && (
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: accentColor || GOLD, textTransform: 'uppercase' }}>
            {actor.kind}
          </div>
        )}
      </div>
      {actor.short_description && (
        <div style={{ ...body, fontSize: '13.5px', color: 'rgba(15,21,35,0.65)', marginTop: '6px', lineHeight: 1.55 }}>
          {actor.short_description}
        </div>
      )}
    </Link>
  )
}

// ── Activity layer (feed) ─────────────────────────────────────────────────
// Uses the same useFeed engine via a new 'intersection' tab that resolves to
// the actor-ids and (eventually) user-ids tagged at this coordinate.
// For now, the feed assembles based on actors tagged to this field — feed
// items inherit through their authoring actor.

function ActivityLayer({ field, atFocus }) {
  const viewerCtx = useViewerContext()
  const [actorIds, setActorIds] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      let q = supabase
        .from('nextus_actors')
        .select('id')
        .contains('fields', [field.slug])
        .eq('status', 'live')
      if (atFocus) q = q.eq('focus_id', atFocus.id)
      const { data } = await q
      if (cancelled) return
      setActorIds((data || []).map(r => r.id))
    }
    load()
    return () => { cancelled = true }
  }, [field.slug, atFocus?.id])

  // Build a viewerCtx-like object with the coordinate-scoped actor list so
  // useFeed can resolve its sources. We pass through cohort scaffolding from
  // the real viewer where needed, but the filter is the coordinate one.
  const coordinateCtx = useMemo(() => {
    if (!viewerCtx || !actorIds) return null
    return {
      ...viewerCtx,
      _coordinateActorIds: actorIds,
    }
  }, [viewerCtx, actorIds])

  // Note: useFeed doesn't yet have a 'coordinate' tab. For v1 of this surface
  // we'll render a thin placeholder explaining that activity will populate
  // once actors publish from this coordinate. The 'coordinate' filter mode
  // is a small useFeed extension that's clean to add later when feed-item
  // shape supports per-field tagging — currently items inherit via author,
  // and the author→field tagging is brand new.

  if (!actorIds) {
    return (
      <section>
        <SectionHeader label="Recent activity here" />
        <Quiet text="Loading…" />
      </section>
    )
  }

  if (actorIds.length === 0) {
    return (
      <section>
        <SectionHeader label="Recent activity here" />
        <Quiet text={atFocus
          ? `No actors yet at this coordinate in ${atFocus.name}, so no activity to surface.`
          : 'No actors yet at this coordinate, so no activity to surface.'} />
      </section>
    )
  }

  // Actors exist — but feed pipeline integration with field-tagged actors
  // ships as v2.7. For now we surface a clean placeholder that's honest
  // about what's available rather than misleading with empty cohort/local feeds.
  return (
    <section>
      <SectionHeader label="Recent activity here" />
      <Quiet text={`${actorIds.length} actor${actorIds.length === 1 ? '' : 's'} tagged here. Activity surfacing — sprints, needs, statements published by these actors — wires through in the next feed pipeline pass.`} />
    </section>
  )
}

function SectionHeader({ label }) {
  return (
    <div style={{
      ...sc, fontSize: '13px', letterSpacing: '0.18em',
      color: GOLD, textTransform: 'uppercase', marginBottom: '16px',
    }}>
      {label}
    </div>
  )
}

function Quiet({ text }) {
  return (
    <div style={{
      ...body, fontSize: '14.5px',
      color: 'rgba(15,21,35,0.72)', fontStyle: 'italic',
      padding: '18px',
      background: 'rgba(110,127,92,0.04)',
      border: '1px dashed rgba(110,127,92,0.30)',
      borderRadius: '8px',
    }}>
      {text}
    </div>
  )
}
