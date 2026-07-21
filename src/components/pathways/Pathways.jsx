// ─────────────────────────────────────────────────────────────
// Pathways.jsx — the personal-side routing rail (v1)
//
// One reusable component. In domain context it shows a short rail
// connecting the person's need to what serves it. Card order is LAW:
//   1. The journey (always first — the platform is the spine)
//   2. Practitioner(s) — specialists who serve this domain
//   3. Marketplace item — OMITTED in v1 (NextMarket not built);
//      commented slot below.
//
// Framing (locked, load-bearing): NextU is diagnostic and supportive
// of the person's highest self; practitioners are specialists who
// work ALONGSIDE it. Never "tool vs practitioner." Both/and.
//
// Priming: the first time the rail would ever render for a person,
// a two-sentence explainer shows instead, with one GOT IT. The
// acknowledgement persists (contributor_profiles_beta.pathways_primed_at;
// localStorage fallback when signed out). After that, the rail.
//
// Events: one 'impression' row per card per rail render, one 'open'
// per tap — pathways_events, fire-and-forget. Practitioners will only
// ever see aggregates, never identities.
//
// Props:
//   domain   — personal domain key (path / spark / … / signal). Required.
//   surface  — 'map_debrief' | 'mc_domain'. Required.
//   variant  — reserved for future surfaces. Unused in v1.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'
import { DOMAIN_COLORS } from '../../constants/domainColors'
import {
  PERSONAL_DOMAIN_LABELS, SURFACES, JOURNEY_CARD, FOUNDER_CARD,
  RAIL_COPY, PRIMING,
} from './pathwaysRules'
import { fetchAcceptingPractitioners } from './pathwaysQueries'

const STATUS_LINES = {
  yes:      'Accepting clients',
  waitlist: 'Waitlist open',
}

export default function Pathways({ domain, surface, variant }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [primed, setPrimed]               = useState(null) // null = loading
  const [practitioners, setPractitioners] = useState([])
  const [ready, setReady]                 = useState(false)
  const loggedImpression                  = useRef(false)

  const settings    = SURFACES[surface] || SURFACES.mc_domain
  const colour      = DOMAIN_COLORS[domain]?.base || tokens.goldChrome
  const showFounder = FOUNDER_CARD.founderDomains.includes(domain)

  // ── Priming state ──────────────────────────────────────────
  useEffect(() => {
    let alive = true
    async function load() {
      if (!user?.id) {
        if (alive) setPrimed(localStorage.getItem(PRIMING.storageKey) === '1')
        return
      }
      try {
        const { data } = await supabase
          .from('contributor_profiles_beta')
          .select('pathways_primed_at')
          .eq('id', user.id)
          .maybeSingle()
        if (alive) setPrimed(Boolean(data?.pathways_primed_at))
      } catch {
        if (alive) setPrimed(false)
      }
    }
    load()
    return () => { alive = false }
  }, [user?.id])

  async function acknowledgePriming() {
    setPrimed(true)
    try { localStorage.setItem(PRIMING.storageKey, '1') } catch {}
    if (user?.id) {
      try {
        await supabase.from('contributor_profiles_beta').upsert(
          { id: user.id, pathways_primed_at: new Date().toISOString() },
          { onConflict: 'id' },
        )
      } catch {}
    }
  }

  // ── Practitioner pool ──────────────────────────────────────
  useEffect(() => {
    let alive = true
    setReady(false)
    fetchAcceptingPractitioners(domain, settings.maxPractitioners)
      .then(list => { if (alive) { setPractitioners(list); setReady(true) } })
      .catch(()  => { if (alive) { setPractitioners([]);   setReady(true) } })
    return () => { alive = false }
  }, [domain, settings.maxPractitioners])

  // ── Event logging ──────────────────────────────────────────
  function logEvents(rows) {
    try {
      supabase.from('pathways_events').insert(
        rows.map(r => ({ user_id: user?.id ?? null, surface, domain, ...r })),
      ).then(() => {}, () => {})
    } catch {}
  }

  useEffect(() => {
    if (!ready || primed !== true || loggedImpression.current) return
    loggedImpression.current = true
    const rows = [{ card_type: 'journey', event: 'impression' }]
    if (showFounder) rows.push({ card_type: 'founder', event: 'impression' })
    practitioners.forEach(p =>
      rows.push({ card_type: 'practitioner', target_id: p.id, event: 'impression' }),
    )
    logEvents(rows)
  }, [ready, primed]) // eslint-disable-line react-hooks/exhaustive-deps

  function open(cardType, route, targetId) {
    logEvents([{ card_type: cardType, target_id: targetId ?? null, event: 'open' }])
    navigate(route)
  }

  if (primed === null) return null

  // ── Priming explainer — first render, once ─────────────────
  if (primed === false) {
    return (
      <section style={{ marginTop: '36px', borderLeft: `3px solid ${colour}`, paddingLeft: '20px' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: tokens.gold, marginBottom: '12px' }}>
          {RAIL_COPY.eyebrow}
        </div>
        <p style={{ ...serif, fontSize: '20px', fontWeight: 300, color: tokens.dark, lineHeight: 1.55, marginBottom: '16px', maxWidth: '480px' }}>
          {PRIMING.line1} {PRIMING.line2}
        </p>
        <button
          type="button"
          onClick={acknowledgePriming}
          style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', color: tokens.gold, background: 'none', border: `1px solid ${tokens.goldStrong}`, borderRadius: '40px', padding: '9px 24px', cursor: 'pointer' }}
        >
          {PRIMING.action}
        </button>
      </section>
    )
  }

  // ── The rail ───────────────────────────────────────────────
  const label = PERSONAL_DOMAIN_LABELS[domain] || domain

  return (
    <section style={{ marginTop: '36px', borderLeft: `3px solid ${colour}`, paddingLeft: '20px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: tokens.gold, marginBottom: '8px' }}>
        {RAIL_COPY.eyebrow}
      </div>
      <p style={{ ...body, fontSize: '15px', color: tokens.meta, lineHeight: 1.7, marginBottom: '18px', maxWidth: '520px' }}>
        {RAIL_COPY.framing}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '560px' }}>

        {/* 1 — The journey. Always first. The spine. */}
        <PathwayCard
          onOpen={() => open('journey', JOURNEY_CARD.route)}
          title={JOURNEY_CARD.titles[domain] || `Build your ${label}`}
          bodyText={JOURNEY_CARD.body}
          statusLine={null}
          cta={JOURNEY_CARD.cta}
          emphasis
        />

        {/* 2 — From the founder (disclosed, identical format) */}
        {showFounder && (
          <PathwayCard
            onOpen={() => open('founder', FOUNDER_CARD.route)}
            eyebrow={FOUNDER_CARD.label}
            title={FOUNDER_CARD.name}
            bodyText={FOUNDER_CARD.tagline}
            statusLine={FOUNDER_CARD.status}
            cta={FOUNDER_CARD.cta}
          />
        )}

        {/* 2 — Practitioners serving this domain */}
        {practitioners.map(p => (
          <PathwayCard
            key={p.id}
            onOpen={() => open('practitioner', `/org/${p.slug}`, p.id)}
            title={p.name}
            bodyText={p.tagline}
            statusLine={STATUS_LINES[p.accepting_status] || null}
            cta="View"
            imageUrl={p.image_url}
          />
        ))}

        {/* 3 — Marketplace item slot (v1: NextMarket not built yet).
            When NextMarket ships, the dual-scale shelf item for this
            domain renders here, third in the rail — never above the
            journey or practitioners.
        <PathwayCard ... card_type="marketplace" /> */}

      </div>
    </section>
  )
}

// ─── Card ─────────────────────────────────────────────────────
function PathwayCard({ onOpen, eyebrow, title, bodyText, statusLine, cta, imageUrl, emphasis = false }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left',
        width: '100%', padding: '18px 20px', cursor: 'pointer',
        background: tokens.bgCard,
        border: emphasis ? `1.5px solid ${tokens.goldStrong}` : `1px solid ${tokens.goldFaint}`,
        borderRadius: '10px',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && (
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: tokens.gold, marginBottom: '4px' }}>
            {eyebrow}
          </div>
        )}
        <div style={{ ...serif, fontSize: '19px', fontWeight: 300, color: tokens.dark, lineHeight: 1.3, marginBottom: '4px' }}>
          {title}
        </div>
        {bodyText && (
          <div style={{ ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.6 }}>
            {bodyText}
          </div>
        )}
        {statusLine && (
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.gold, marginTop: '6px' }}>
            {statusLine}
          </div>
        )}
      </div>
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.1em', color: tokens.gold, flexShrink: 0 }}>
        {cta} →
      </span>
    </button>
  )
}
