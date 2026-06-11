// ─────────────────────────────────────────────────────────────
// LadderRail.jsx — the join-in ladder, plus the FacesRow
//
// Two small pieces that make the civ side feel like company:
//
// LadderRail — the explicit gradient from spectator to builder,
// one consistent rail on civ surfaces:
//   TUNE IN → BACK IT → STEP FORWARD → ADD YOURS
// The lightest rung (tune in) renders the real WatchButton when
// the surface can supply a taxonomy uuid; the other rungs route.
//
// FacesRow — actors working here, as faces. People before
// structure: a row of avatars + names for a domain/subdomain/
// field, each linking to the actor's public page. This is the
// not-alone mechanic — the description tells you what the domain
// is; the faces tell you you'd have company in it.
//
// Privacy: FacesRow shows live Atlas actors only (already public).
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { WatchButton } from './WatchButton'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }
const GOLD = '#A8721A'
const INK  = '#0F1523'

// ── FacesRow ─────────────────────────────────────────────────
// Props:
//   level — 'domains' | 'subdomains' | 'fields' (actor array column)
//   slug  — the taxonomy slug to match
//   limit — max faces (default 8)
//   onCount — optional callback with the total count found
export function FacesRow({ level = 'domains', slug, limit = 8, onCount, dark = false }) {
  const navigate = useNavigate()
  const [actors, setActors] = useState(null)

  useEffect(() => {
    if (!slug) { setActors([]); return }
    let cancelled = false
    supabase
      .from('nextus_actors')
      .select('id, name, slug, image_url, tagline, updated_at')
      .contains(level, [slug])
      .eq('status', 'live')
      .order('updated_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (cancelled) return
        setActors(data || [])
        if (onCount) onCount((data || []).length)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, slug, limit])

  if (!actors || actors.length === 0) return null

  return (
    <div style={{ marginTop: '14px' }}>
      <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: GOLD, marginBottom: '10px' }}>
        WORKING HERE
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {actors.map(a => (
          <button
            key={a.id}
            onClick={() => navigate(`/org/${a.slug}`)}
            title={a.tagline || a.name}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 12px 6px 6px',
              border: `1px solid ${dark ? 'rgba(200,146,42,0.45)' : 'rgba(200,146,42,0.25)'}`,
              borderRadius: '40px', background: 'transparent',
              cursor: 'pointer', maxWidth: '230px',
            }}
          >
            {a.image_url ? (
              <img
                src={a.image_url}
                alt=""
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <span style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(200,146,42,0.18)', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                ...sc, fontSize: '13px', color: GOLD,
              }}>
                {(a.name || '?').slice(0, 1)}
              </span>
            )}
            <span style={{
              ...body, fontSize: '14px',
              color: dark ? 'rgba(250,250,247,0.88)' : INK,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {a.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── LadderRail ───────────────────────────────────────────────
// Props:
//   watchEntity — { type: 'domain'|'subdomain'|'field', id: uuid, name }
//                 (omit to hide the TUNE IN rung — never fake it)
//   exploreHref — where BACK IT goes (the place to find actors to back)
//   domainSlug  — context for STEP FORWARD / ADD routing
export function LadderRail({ watchEntity, exploreHref, dark = false }) {
  const navigate = useNavigate()

  const rung = (label, onClick) => (
    <button
      onClick={onClick}
      style={{
        ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em',
        color: dark ? '#C8922A' : GOLD, background: 'none', border: 'none',
        cursor: 'pointer', padding: 0,
      }}
    >
      {label}
    </button>
  )

  const sep = (
    <span aria-hidden="true" style={{ ...sc, fontSize: '13px', color: 'rgba(200,146,42,0.45)' }}>·</span>
  )

  return (
    <div
      aria-label="Ways to join in"
      style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap',
        gap: '12px', marginTop: '18px', paddingTop: '14px',
        borderTop: '1px solid rgba(200,146,42,0.14)',
      }}
    >
      {watchEntity?.id && (
        <>
          <WatchButton
            entityType={watchEntity.type}
            entityId={watchEntity.id}
            entityName={watchEntity.name}
            size="sm"
          />
          {sep}
        </>
      )}
      {rung('BACK IT', () => navigate(exploreHref || '/search'))}
      {sep}
      {rung('STEP FORWARD', () => navigate('/tools/nextsteps'))}
      {sep}
      {rung('ADD YOURS', () => navigate('/add'))}
    </div>
  )
}

export default LadderRail
