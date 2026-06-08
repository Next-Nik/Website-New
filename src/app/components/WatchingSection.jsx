// src/app/components/WatchingSection.jsx
//
// The user's watched-list management surface. Sits beneath Places on
// /profile/edit, grouped by entity type, with a remove affordance per row.
// Designed to be slotted inside the existing Section wrapper from
// ProfileEdit (no internal section/h2 — the page wrapper owns those).
//
// Renders three groups (Places / Actors / People), counter, and soft/cap
// notices.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWatch } from '../hooks/useWatch'
import { supabase } from '../../hooks/useSupabase'
import { InfoButton } from './InfoButton'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }
const gold = '#A8721A'
const dark = '#0F1523'

const GROUP_LABEL = {
  focus:  'Places',
  actor:  'Actors',
  person: 'People',
}

export function WatchingSection() {
  const { watches, count, cap, capState, loading, error, toggle } = useWatch()
  const [resolved, setResolved] = useState({ focus: {}, actor: {}, person: {} })
  const [resolving, setResolving] = useState(false)

  // Resolve each entity's display name and slug for rendering.
  useEffect(() => {
    let cancelled = false
    async function resolveAll() {
      if (watches.length === 0) { setResolved({ focus: {}, actor: {}, person: {} }); return }
      setResolving(true)

      const focusIds  = watches.filter(w => w.entity_type === 'focus').map(w => w.entity_id)
      const actorIds  = watches.filter(w => w.entity_type === 'actor').map(w => w.entity_id)
      const personIds = watches.filter(w => w.entity_type === 'person').map(w => w.entity_id)

      const [focusRes, actorRes, personRes] = await Promise.all([
        focusIds.length > 0
          ? supabase.from('nextus_focuses')
              .select('id, name, slug, type')
              .in('id', focusIds)
          : Promise.resolve({ data: [] }),
        actorIds.length > 0
          ? supabase.from('nextus_actors')
              .select('id, name, slug, kind')
              .in('id', actorIds)
          : Promise.resolve({ data: [] }),
        personIds.length > 0
          ? supabase.from('contributor_profiles_beta')
              .select('user_id, display_name')
              .in('user_id', personIds)
          : Promise.resolve({ data: [] }),
      ])

      if (cancelled) return

      const focus  = Object.fromEntries((focusRes.data || []).map(r => [r.id, r]))
      const actor  = Object.fromEntries((actorRes.data || []).map(r => [r.id, r]))
      const person = Object.fromEntries((personRes.data || []).map(r => [r.user_id, r]))

      setResolved({ focus, actor, person })
      setResolving(false)
    }
    resolveAll()
    return () => { cancelled = true }
  }, [watches])

  const grouped = useMemo(() => {
    const g = { focus: [], actor: [], person: [] }
    for (const w of watches) g[w.entity_type].push(w)
    return g
  }, [watches])

  async function removeWatch(w) {
    try {
      await toggle(w.entity_type, w.entity_id)
    } catch {
      // Silent — useWatch handles rollback; UI will reconcile on next render.
    }
  }

  return (
    <div>
      <p style={{
        ...body,
        fontSize: '15px',
        color: 'rgba(15,21,35,0.72)',
        lineHeight: 1.7,
        marginTop: 0,
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        <span>
          Your sphere of attention &mdash; places, organisations, and people
          you&rsquo;re tuned in to. Private to you.
        </span>
        <InfoButton title="Your Tuned In list">
          <p style={{ margin: '0 0 10px' }}>
            This is your sphere of attention &mdash; up to {cap} entities,
            mixed across places, organisations, and people.
          </p>
          <p style={{ margin: '0 0 10px' }}>
            Tuning in is flat. There&rsquo;s no priority order, no ranking.
            To shape which entities surface more prominently, you&rsquo;ll
            later have a separate budget &mdash; a finite set of attention
            spoons &mdash; that&rsquo;s how the curated feed works.
          </p>
          <p style={{ margin: 0 }}>
            For now, this list feeds the Tuned In feed at /tuned-in, in
            publication order.
          </p>
        </InfoButton>
      </p>

      {/* Counter + cap state */}
      <div style={{
        ...sc,
        fontSize: '12px',
        letterSpacing: '0.14em',
        color: capState === 'at-cap' ? '#A23636'
              : capState === 'soft-warn' ? gold
              : 'rgba(15,21,35,0.72)',
        textTransform: 'uppercase',
        marginBottom: '18px',
      }}>
        {count} of {cap} watched
        {capState === 'soft-warn' && (
          <span style={{ ...body, fontSize: '13px', color: gold, textTransform: 'none', letterSpacing: 'normal', fontStyle: 'italic', marginLeft: '12px' }}>
            &nbsp;approaching the cap &mdash; the limit protects this list from becoming noise.
          </span>
        )}
        {capState === 'at-cap' && (
          <span style={{ ...body, fontSize: '13px', color: '#A23636', textTransform: 'none', letterSpacing: 'normal', fontStyle: 'italic', marginLeft: '12px' }}>
            &nbsp;at the cap &mdash; remove an entry before adding another.
          </span>
        )}
      </div>

      {loading && (
        <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
          Loading&hellip;
        </div>
      )}

      {error && (
        <div style={{ ...body, fontSize: '14px', color: '#A23636', marginBottom: '20px' }}>
          Could not load your Tuned In list. Try refreshing.
        </div>
      )}

      {!loading && count === 0 && (
        <div style={{
          ...body,
          fontSize: '14.5px',
          color: 'rgba(15,21,35,0.72)',
          fontStyle: 'italic',
          padding: '16px 18px',
          background: 'rgba(200,146,42,0.04)',
          border: '1px dashed rgba(200,146,42,0.35)',
          borderRadius: '8px',
        }}>
          You aren&rsquo;t tuned in to anything yet. Find a place, organisation,
          or person and tap Tune in to add them here.
        </div>
      )}

      {!loading && count > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {['focus', 'actor', 'person'].map(type => {
            const rows = grouped[type]
            if (rows.length === 0) return null
            return (
              <div key={type}>
                <div style={{
                  ...sc,
                  fontSize: '11px',
                  letterSpacing: '0.16em',
                  color: 'rgba(15,21,35,0.72)',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                }}>
                  {GROUP_LABEL[type]} &middot; {rows.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rows.map(w => (
                    <WatchedRow
                      key={w.id}
                      watch={w}
                      resolved={resolved[type][w.entity_id]}
                      onRemove={() => removeWatch(w)}
                      type={type}
                      resolving={resolving}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function WatchedRow({ watch, resolved, onRemove, type, resolving }) {
  let name = '…'
  let href = null
  if (resolved) {
    if (type === 'focus') {
      name = resolved.name
      href = `/focus/${resolved.slug}`
    } else if (type === 'actor') {
      name = resolved.name
      href = `/org/${resolved.slug}`
    } else if (type === 'person') {
      name = resolved.display_name || 'Unnamed'
      href = `/profile/${watch.entity_id}`
    }
  } else if (resolving) {
    name = 'Loading…'
  } else {
    name = '(unknown — entity removed)'
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '10px 14px',
      borderRadius: '8px',
      border: '1px solid rgba(200,146,42,0.18)',
      background: '#FFFFFF',
    }}>
      <div style={{ ...body, fontSize: '15px', color: dark }}>
        {href ? (
          <Link to={href} style={{ color: dark, textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.30)' }}>
            {name}
          </Link>
        ) : (
          name
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${name} from watched`}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(15,21,35,0.55)',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
          padding: '0 4px',
        }}
      >
        ×
      </button>
    </div>
  )
}
