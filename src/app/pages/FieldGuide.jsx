// src/app/pages/FieldGuide.jsx
//
// "Your guide" — a grid over the Atlas showing which organisations the
// signed-in user has met, with a private one-line note as the capture
// mechanic. Dark Atlas rail (at.* tokens).
//
// NAMING IS PROVISIONAL: the UI label "Your guide" and the route slug
// /guide are both placeholders · naming session pending.
//
// Tier marks (derived in src/app/lib/guideTiers.js):
//   not met            — dashed outline circle
//   known / following  — verdigris fill (at.verdigris)
//   allied / companion — at.brass fill. NOT heritage gold: this file is
//                        not on the scripts/audit-design.js GOLD_WHITELIST
//                        and the gold law forbids new usages without
//                        sign-off, so brass is the deliberate choice here.
//
// The companion threshold is internal — no counts or progress indicators
// are ever rendered; only the tier state shows.
//
// Signed out: the grid renders with every actor in the not-met state and
// the add affordance routes to /login.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { at, atText, display } from '../../lib/designTokens'
import { CIV_DOMAINS } from '../constants/domains'
import { loadGuideState } from '../lib/guideTiers'

const CIV_COLOUR_BY_SLUG = Object.fromEntries(
  CIV_DOMAINS.map(d => [d.slug, d.color]),
)

export function FieldGuidePage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [domains, setDomains] = useState([])
  const [subdomains, setSubdomains] = useState([])
  const [actors, setActors] = useState([])
  const [guide, setGuide] = useState(() => new Map())
  const [selectedDomain, setSelectedDomain] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(false)
      try {

      // The seven civ domains, in position order. Colours come from
      // CIV_DOMAINS (single source of truth), DB colour as fallback.
      const { data: domainRows, error: domainErr } = await supabase
        .from('nextus_domains')
        .select('id, slug, name, color, position')
        .eq('domain_kind', 'civ')
        .order('position')
      if (cancelled) return
      if (domainErr) throw domainErr
      const allDomains = (domainRows || []).map(d => ({
        ...d,
        color: CIV_COLOUR_BY_SLUG[d.slug] || d.color || at.verdigris,
      }))
      setDomains(allDomains)

      // All subdomains for those domains, one batched query.
      const domainIds = allDomains.map(d => d.id)
      if (domainIds.length > 0) {
        const { data: subRows } = await supabase
          .from('nextus_subdomains')
          .select('id, domain_id, slug, name, position')
          .in('domain_id', domainIds)
          .order('position')
        if (cancelled) return
        setSubdomains(subRows || [])
      } else {
        setSubdomains([])
      }

      // Every live actor in the Atlas.
      const { data: actorRows } = await supabase
        .from('nextus_actors')
        .select('id, slug, name, short_description, description, domains, subdomains')
        .eq('status', 'live')
        .order('name')
        .limit(1000)
      if (cancelled) return
      setActors(actorRows || [])

      // The viewer's guide state (empty map when signed out).
      const state = await loadGuideState(supabase, user?.id)
      if (cancelled) return
      setGuide(state)

      } catch (e) {
        if (!cancelled) setLoadError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id, reloadKey])

  // Place every actor exactly once: first matching domain (in position
  // order), then first matching subdomain within it; actors tagged to a
  // domain but no subdomain land in that domain's "Other" group; actors
  // with no domain tags land in "Elsewhere in the Atlas".
  const placement = useMemo(() => {
    const subsByDomainId = new Map()
    for (const s of subdomains) {
      if (!subsByDomainId.has(s.domain_id)) subsByDomainId.set(s.domain_id, [])
      subsByDomainId.get(s.domain_id).push(s)
    }

    const byDomain = new Map() // domain.slug → { subGroups: Map<subSlug, actors[]>, rest: actors[] }
    for (const d of domains) {
      byDomain.set(d.slug, { subGroups: new Map(), rest: [] })
    }
    const elsewhere = []

    for (const a of actors) {
      const actorDomains = Array.isArray(a.domains) ? a.domains : []
      const home = domains.find(d => actorDomains.includes(d.slug))
      if (!home) { elsewhere.push(a); continue }

      const bucket = byDomain.get(home.slug)
      const actorSubs = Array.isArray(a.subdomains) ? a.subdomains : []
      const sub = (subsByDomainId.get(home.id) || [])
        .find(s => actorSubs.includes(s.slug))
      if (sub) {
        if (!bucket.subGroups.has(sub.slug)) bucket.subGroups.set(sub.slug, [])
        bucket.subGroups.get(sub.slug).push(a)
      } else {
        bucket.rest.push(a)
      }
    }

    return { byDomain, elsewhere, subsByDomainId }
  }, [domains, subdomains, actors])

  const metCount = useMemo(
    () => actors.reduce((n, a) => n + (guide.has(a.id) ? 1 : 0), 0),
    [actors, guide],
  )

  // Record a saved note locally: tier lifts to at least 'known'.
  function handleSaved(actorId, note) {
    setGuide(prev => {
      const next = new Map(prev)
      const entry = next.get(actorId)
      if (entry) {
        next.set(actorId, { ...entry, note })
      } else {
        next.set(actorId, { tier: 'known', note })
      }
      return next
    })
  }

  const visibleDomains = selectedDomain
    ? domains.filter(d => d.slug === selectedDomain)
    : domains

  return (
    <div style={{ background: at.ground, minHeight: '100dvh' }}>
      <Nav activePath="" />

      <div style={{
        maxWidth: '1060px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 40px) 80px',
      }}>
        <header style={{ marginBottom: '28px' }}>
          {/* UI label provisional · naming session pending */}
          <h1 style={{
            ...display,
            fontSize: 'clamp(32px, 5vw, 44px)',
            fontWeight: 300,
            color: at.text,
            margin: 0,
            marginBottom: '10px',
            lineHeight: 1.15,
          }}>
            Your guide
          </h1>
          <p style={{ ...atText.chrome, margin: 0 }}>
            {loading ? 'Loading the Atlas…' : loadError ? (
              <>Could not load the Atlas. <a href="#" onClick={e => { e.preventDefault(); setReloadKey(k => k + 1) }} style={{ color: at.verdigris }}>Try again</a></>
            ) : `${metCount} met · ${actors.length} in the Atlas`}
          </p>
        </header>

        {!loading && (
          <DomainChips
            domains={domains}
            selected={selectedDomain}
            onSelect={setSelectedDomain}
          />
        )}

        {!loading && !loadError && actors.length === 0 && (
          <p style={{ ...atText.body, marginTop: '24px' }}>
            No organisations in the Atlas yet.
          </p>
        )}

        {!loading && actors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', marginTop: '28px' }}>
            {visibleDomains.map(d => {
              const bucket = placement.byDomain.get(d.slug)
              if (!bucket) return null
              const orderedSubs = (placement.subsByDomainId.get(d.id) || [])
                .filter(s => bucket.subGroups.has(s.slug))
              if (orderedSubs.length === 0 && bucket.rest.length === 0) return null
              return (
                <section key={d.slug}>
                  {orderedSubs.map(s => (
                    <ActorGrid
                      key={s.slug}
                      heading={`${d.name} · ${s.name}`}
                      colour={d.color}
                      actors={bucket.subGroups.get(s.slug)}
                      guide={guide}
                      user={user}
                      onSaved={handleSaved}
                    />
                  ))}
                  {bucket.rest.length > 0 && (
                    <ActorGrid
                      heading={`${d.name} · Other`}
                      colour={d.color}
                      actors={bucket.rest}
                      guide={guide}
                      user={user}
                      onSaved={handleSaved}
                    />
                  )}
                </section>
              )
            })}

            {!selectedDomain && placement.elsewhere.length > 0 && (
              <ActorGrid
                heading="Elsewhere in the Atlas"
                colour={at.verdigris}
                actors={placement.elsewhere}
                guide={guide}
                user={user}
                onSaved={handleSaved}
              />
            )}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}

// ── Domain chips row ──────────────────────────────────────────────────────
function DomainChips({ domains, selected, onSelect }) {
  const base = {
    ...atText.chrome,
    fontSize: '13px',
    letterSpacing: '0.08em',
    padding: '5px 14px',
    borderRadius: '16px',
    cursor: 'pointer',
    background: 'transparent',
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      <button
        type="button"
        onClick={() => onSelect(null)}
        style={{
          ...base,
          border: `1px solid ${at.verdigrisEdge}`,
          color: selected === null ? at.ground : at.meta,
          background: selected === null ? at.verdigris : 'transparent',
        }}
      >
        All domains
      </button>
      {domains.map(d => {
        const active = selected === d.slug
        return (
          <button
            key={d.slug}
            type="button"
            onClick={() => onSelect(active ? null : d.slug)}
            style={{
              ...base,
              border: `1px solid ${d.color}`,
              color: active ? at.ground : d.color,
              background: active ? d.color : 'transparent',
            }}
          >
            {d.name}
          </button>
        )
      })}
    </div>
  )
}

// ── One subdomain grid ────────────────────────────────────────────────────
function ActorGrid({ heading, colour, actors, guide, user, onSaved }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        ...atText.eyebrow,
        color: colour,
        marginBottom: '12px',
      }}>
        {heading}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        gap: '10px',
      }}>
        {actors.map(a => (
          <ActorCard
            key={a.id}
            actor={a}
            entry={guide.get(a.id) || null}
            user={user}
            onSaved={onSaved}
          />
        ))}
      </div>
    </div>
  )
}

// ── Tier mark ─────────────────────────────────────────────────────────────
// Plain circle span, no SVG. Colour states:
//   not met            → dashed outline
//   known / following  → verdigris fill
//   allied / companion → brass fill (see file header — not heritage gold)
function TierMark({ tier }) {
  const met = tier === 'known' || tier === 'following'
  const high = tier === 'allied' || tier === 'companion'
  return (
    <span
      aria-hidden="true"
      style={{
        width: '11px',
        height: '11px',
        borderRadius: '50%',
        flexShrink: 0,
        marginTop: '4px',
        background: high ? at.brass : met ? at.verdigris : 'transparent',
        border: (high || met) ? 'none' : `1.5px dashed ${at.ghost}`,
        boxSizing: 'border-box',
      }}
    />
  )
}

// ── Actor card ────────────────────────────────────────────────────────────
function ActorCard({ actor, entry, user, onSaved }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const tier = entry?.tier || 'found'
  const met = tier !== 'found'
  const note = entry?.note || null
  const desc = actor.short_description || actor.description || null
  const orgHref = `/org/${actor.slug || actor.id}`
  const canCapture = !!user && !note

  async function save() {
    const trimmed = value.trim()
    if (!trimmed || saving) return
    setSaving(true)
    setSaveError(false)
    const { error } = await supabase
      .from('actor_field_notes')
      .insert({ user_id: user.id, actor_id: actor.id, note: trimmed })
    setSaving(false)
    if (error) { setSaveError(true); return }
    setOpen(false)
    setValue('')
    onSaved(actor.id, trimmed)
  }

  return (
    <div
      onClick={canCapture && !met && !open ? () => setOpen(true) : undefined}
      style={{
        background: at.object,
        border: `1px solid ${at.verdigrisEdge}`,
        borderRadius: '8px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        cursor: canCapture && !met && !open ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <TierMark tier={tier} />
        <Link
          to={orgHref}
          onClick={e => e.stopPropagation()}
          style={{
            ...atText.heading,
            fontSize: '15px',
            fontWeight: 500,
            textDecoration: 'none',
            color: at.text,
          }}
        >
          {actor.name}
        </Link>
      </div>

      {desc && (
        <div style={{ ...atText.caption, lineHeight: 1.5, color: at.meta }}>
          {desc}
        </div>
      )}

      {note && (
        <>
          {/* Italic is correct here — the note is the user's own words. */}
          <div style={{ ...atText.userVoice, fontSize: '14px' }}>
            {note}
          </div>
          <Link
            to={orgHref}
            style={{ ...atText.chrome, textDecoration: 'none', color: at.verdigris }}
          >
            → their page
          </Link>
        </>
      )}

      {!note && !open && (
        user ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setOpen(true) }}
            style={{
              ...atText.chrome,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              color: at.verdigris,
            }}
          >
            → add
          </button>
        ) : (
          <Link
            to="/login"
            style={{ ...atText.chrome, textDecoration: 'none', color: at.verdigris }}
          >
            Sign in to keep your guide
          </Link>
        )
      )}

      {open && !note && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={2}
            autoFocus
            placeholder="Who are they? One line, your words."
            style={{
              ...atText.body,
              fontSize: '14px',
              lineHeight: 1.5,
              color: at.text,
              background: at.ground,
              border: `1px solid ${at.verdigrisEdge}`,
              borderRadius: '6px',
              padding: '8px 10px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={save}
              disabled={!value.trim() || saving}
              style={{
                ...atText.chrome,
                color: value.trim() ? at.ground : at.ghost,
                background: value.trim() ? at.verdigris : 'transparent',
                border: `1px solid ${value.trim() ? at.verdigris : at.verdigrisEdge}`,
                borderRadius: '16px',
                padding: '5px 14px',
                cursor: value.trim() && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Saving…' : 'Add to my guide'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setSaveError(false) }}
              style={{
                ...atText.chrome,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: at.ghost,
              }}
            >
              Cancel
            </button>
          </div>
          {saveError && (
            <div style={{ ...atText.caption, color: '#C97064' }}>
              Could not save. Try again.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
