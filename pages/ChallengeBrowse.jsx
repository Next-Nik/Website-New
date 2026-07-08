// /challenges/browse — discover community challenges (Phase 6, June 2026).
//
// The place to find challenges to take on, not just reach them by a shared
// link. Sorted by uptake so what people are doing rises. Scale is never shown;
// a domain chip says what it's about. Each card links to the public page.

import { useState, useEffect, useMemo } from 'react'
import { actorCallsRaw } from '../../lib/actorCallsClient'
import { Link, useSearchParams } from 'react-router-dom'
import { Nav }        from '../../components/Nav'
import { tokens, serif, body, sc, at } from '../../lib/designTokens'
import {
  SELF_DOMAINS, CIV_DOMAINS, SELF_DOMAIN_COLORS, DOMAIN_COLORS,
} from '../constants/domains'
import { INTENSITY_LEVELS, INTENSITY_BY_LEVEL } from '../../constants/challengeIntensity'
import ChiliRung from '../components/challenge/ChiliRung'

const hair  = `1px solid ${at.verdigrisEdge}`
const muted = { color: 'rgba(234,241,237,0.78)' }

const LABELS = {
  ...Object.fromEntries(SELF_DOMAINS.map(d => [d.slug, d.label])),
  ...Object.fromEntries(CIV_DOMAINS.map(d => [d.slug, d.label])),
}
const COLORS = { ...SELF_DOMAIN_COLORS, ...DOMAIN_COLORS }

function DomainChip({ slug }) {
  if (!slug) return null
  const color = COLORS[slug] || at.verdigris
  return (
    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color, textTransform: 'uppercase',
      display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      {LABELS[slug] || slug}
    </span>
  )
}

function Card({ c }) {
  const n = c.taken_on_count || 0
  return (
    <Link to={c.slug ? `/stretch/c/${c.slug}` : '#'}
      style={{ textDecoration: 'none', display: 'block', background: at.object, border: hair, borderRadius: '14px', padding: '20px 22px' }}>
      <DomainChip slug={c.domain} />
      <h2 style={{ ...serif, fontWeight: 300, fontSize: '23px', color: at.text, lineHeight: 1.2, margin: '8px 0 4px' }}>{c.title}</h2>
      {c.tagline && <p style={{ ...body, fontSize: '15px', color: 'rgba(234,241,237,0.72)', lineHeight: 1.55, margin: '0 0 14px' }}>{c.tagline}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', ...sc, fontSize: '13px', letterSpacing: '0.08em', color: at.ghost, marginTop: '4px' }}>
        <span>{c.duration_days || 90} days</span>
        <span>{c.strand_count || 1} {(c.strand_count || 1) === 1 ? 'part' : 'parts'}</span>
        {n > 0 && <span style={{ color: at.brass }}>{n.toLocaleString()} {n === 1 ? 'person' : 'people'} in</span>}
        {INTENSITY_BY_LEVEL[c.intensity_level] && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ChiliRung level={c.intensity_level} size={13} />
            {INTENSITY_BY_LEVEL[c.intensity_level].label}
          </span>
        )}
      </div>
      {c.author?.name && (
        <div style={{ ...body, fontSize: '14px', color: at.ghost, marginTop: '12px', paddingTop: '12px', borderTop: hair }}>
          by {c.author.name}
        </div>
      )}
    </Link>
  )
}

export default function ChallengeBrowse() {
  // Deep links can pre-filter the shelf (?domain=nature) — the founding doors
  // use this so someone accepting the Earth Challenge lands among its kin,
  // not the whole cross-domain catalogue.
  const [searchParams]        = useSearchParams()
  const urlDomain             = searchParams.get('domain') || ''
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [domain, setDomain]   = useState(LABELS[urlDomain] ? urlDomain : '')   // '' = all
  const [intensity, setIntensity] = useState(null) // null = any

  useEffect(() => {
    let live = true
    actorCallsRaw({ action: 'browse_challenges', sort: 'popular', limit: 60 })
      .then(r => r.json())
      .then(d => { if (live) setRows(d.challenges || []) })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])

  const domainsPresent = useMemo(() => {
    const set = new Set(rows.map(r => r.domain).filter(Boolean))
    return Array.from(set)
  }, [rows])

  const shown = rows.filter(r => (!domain || r.domain === domain) && (!intensity || r.intensity_level === intensity))

  return (
    <div style={{ minHeight: '100dvh', background: at.ground }}>
      <Nav />
      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '40px 22px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '26px' }}>
          <div>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: at.brass, textTransform: 'uppercase', marginBottom: '8px' }}>
              Challenges
            </div>
            <h1 style={{ ...serif, fontWeight: 300, fontSize: '38px', color: at.text, lineHeight: 1.1, margin: 0 }}>
              Take one on
            </h1>
          </div>
          <Link to="/challenges/new" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: at.brass, textTransform: 'uppercase', textDecoration: 'none' }}>
            + Author a challenge
          </Link>
        </div>

        {/* Domain filter */}
        {domainsPresent.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '26px' }}>
            {[{ slug: '', label: 'All' }, ...domainsPresent.map(s => ({ slug: s, label: LABELS[s] || s }))].map(d => (
              <button key={d.slug || 'all'} type="button" onClick={() => setDomain(d.slug)}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', padding: '6px 15px', borderRadius: '20px', cursor: 'pointer',
                  border: `1px solid ${domain === d.slug ? 'rgba(217,178,74,0.78)' : 'rgba(217,178,74,0.28)'}`,
                  background: domain === d.slug ? 'rgba(217,178,74,0.08)' : 'transparent',
                  color: domain === d.slug ? at.brass : at.ghost }}>
                {d.label}
              </button>
            ))}
          </div>
        )}

        {/* Intensity filter (the menu's spiciness scale) */}
        {rows.some(r => r.intensity_level) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '26px' }}>
            {[{ level: null, label: 'Any intensity' }, ...INTENSITY_LEVELS].map(l => (
              <button key={l.level || 'any'} type="button" onClick={() => setIntensity(l.level)}
                title={l.blurb || ''}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', padding: '6px 15px', borderRadius: '20px', cursor: 'pointer',
                  border: `1px solid ${intensity === l.level ? 'rgba(217,178,74,0.78)' : 'rgba(217,178,74,0.28)'}`,
                  background: intensity === l.level ? 'rgba(217,178,74,0.08)' : 'transparent',
                  color: intensity === l.level ? at.brass : at.ghost }}>
                {l.level ? `${l.level} · ${l.label}` : l.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p style={{ ...body, fontSize: '1.0625rem', color: at.ghost }}>Loading…</p>
        ) : shown.length === 0 ? (
          <div style={{ background: at.object, border: hair, borderRadius: '14px', padding: '32px 28px' }}>
            <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: '0 0 6px' }}>
              No challenges here yet.
            </p>
            <p style={{ ...body, fontSize: '15px', color: at.ghost, lineHeight: 1.65, margin: 0 }}>
              Be the first to <Link to="/challenges/new" style={{ color: at.brass }}>author one</Link>.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {shown.map(c => <Card key={c.id} c={c} />)}
          </div>
        )}
      </div>
    </div>
  )
}
