// src/app/components/ActiveFocusPrompt.jsx
//
// The three-question Active Focus prompt that lives at the top of Mission
// Control. The user names what's close to them right now; the platform
// reorients around the answers.
//
// Three questions, in plain language:
//   1. Where do you want to focus your attention?  (places, up to 3)
//   2. What domain is most interesting to you at this moment?  (domains, up to 3 + in-domain org sub-picker + cross-domain org search)
//   3. How might you want to participate?  (multi-select chips)
//
// Two modes: prompt (when no focus set) and compact summary (when set,
// with edit affordance).
//
// No internal vocabulary visible to the user. Nothing about "Active Focus",
// "magnifications", "telescope/microscope". The questions are the mechanism.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useActiveFocus } from '../hooks/useActiveFocus'

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

const GOLD = '#A8721A'
const GOLD_LIGHT = '#C8922A'
const INK  = '#0F1523'

const DOMAINS = [
  { slug: 'human-being',     label: 'Human Being', color: '#2A6B9E' },
  { slug: 'society',         label: 'Society',     color: '#6B2A9E' },
  { slug: 'nature',          label: 'Nature',      color: '#2A6B3A' },
  { slug: 'technology',      label: 'Technology',  color: '#8A6B2A' },
  { slug: 'finance-economy', label: 'Economy',     color: '#6B3A2A' },
  { slug: 'legacy',          label: 'Legacy',      color: '#4A6B2A' },
  { slug: 'vision',          label: 'Vision',      color: '#2A4A6B' },
]

const PARTICIPATION = [
  { slug: 'learn',  label: 'Learn more' },
  { slug: 'find',   label: 'Find others' },
  { slug: 'lend',   label: 'Lend something' },
  { slug: 'start',  label: 'Start something' },
  { slug: 'watch',  label: 'Watch quietly' },
]

const PLACE_CAP = 3
const DOMAIN_CAP = 3

export function ActiveFocusPrompt({ initiallyOpen = false, bare = false }) {
  const { focus, hasFocus, loading, save, clear } = useActiveFocus()
  const [open, setOpen] = useState(initiallyOpen || !hasFocus)

  // When focus first loads, decide whether to show prompt-open or summary
  useEffect(() => {
    if (!loading) setOpen(initiallyOpen || !hasFocus)
  }, [loading, hasFocus, initiallyOpen])

  if (loading) return null

  if (!open && hasFocus) {
    return <CompactSummary focus={focus} onEdit={() => setOpen(true)} onClear={clear} bare={bare} />
  }

  return <PromptOpen focus={focus} save={save} hasFocus={hasFocus} onCollapse={() => setOpen(false)} bare={bare} />
}

// ── Compact summary (when focus set) ──────────────────────────────────────
function CompactSummary({ focus, onEdit, onClear, bare = false }) {
  const [places, setPlaces] = useState([])
  const [actors, setActors] = useState([])

  useEffect(() => {
    let cancelled = false
    async function resolve() {
      const ps = focus.focus_place_ids?.length
        ? (await supabase.from('nextus_focuses').select('id, slug, name').in('id', focus.focus_place_ids)).data || []
        : []
      const as = focus.focus_actor_ids?.length
        ? (await supabase.from('nextus_actors').select('id, slug, name').in('id', focus.focus_actor_ids)).data || []
        : []
      if (!cancelled) { setPlaces(ps); setActors(as) }
    }
    resolve()
    return () => { cancelled = true }
  }, [focus])

  const domainLabels = (focus.focus_domain_slugs || []).map(slug => {
    const d = DOMAINS.find(x => x.slug === slug)
    return d ? d.label : slug
  })

  const sectionStyle = bare
    ? { marginBottom: 0, padding: 0 }
    : {
        marginBottom: '32px',
        padding: '18px 22px',
        background: 'rgba(200,146,42,0.04)',
        border: '1px solid rgba(200,146,42,0.25)',
        borderRadius: '10px',
      }

  return (
    <section style={sectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        {!bare && (
          <div style={{
            ...sc, fontSize: '10.5px', letterSpacing: '0.20em',
            color: GOLD, textTransform: 'uppercase',
          }}>
            Your focus
          </div>
        )}
        <div style={{ display: 'flex', gap: '14px', marginLeft: bare ? 'auto' : 0 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              ...sc, fontSize: '10.5px', letterSpacing: '0.16em',
              color: GOLD, background: 'none',
              border: 'none', cursor: 'pointer',
              textTransform: 'uppercase', padding: 0,
            }}
          >
            Edit
          </button>
        </div>
      </div>

      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '14px 24px' }}>
        {places.length > 0 && (
          <div>
            <Label>Places</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {places.map(p => (
                <Link key={p.id} to={`/focus/${p.slug}`} style={chipStyle}>
                  {p.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        {domainLabels.length > 0 && (
          <div>
            <Label>Domains</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {domainLabels.map((label, i) => {
                const slug = focus.focus_domain_slugs[i]
                return (
                  <Link key={slug} to={`/explore/${slug}`} style={chipStyle}>
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
        {actors.length > 0 && (
          <div>
            <Label>Organisations</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {actors.map(a => (
                <Link key={a.id} to={`/org/${a.slug || a.id}`} style={chipStyle}>
                  {a.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        {(focus.participation || []).length > 0 && (
          <div>
            <Label>You want to</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {focus.participation.map(p => {
                const opt = PARTICIPATION.find(x => x.slug === p)
                return (
                  <span key={p} style={chipStyle}>
                    {opt ? opt.label : p}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

const chipStyle = {
  ...body, fontSize: '13px', color: INK,
  background: '#FFFFFF',
  border: '1px solid rgba(200,146,42,0.30)',
  borderRadius: '14px', padding: '4px 11px',
  textDecoration: 'none',
}

function Label({ children }) {
  return (
    <div style={{
      ...sc, fontSize: '9.5px', letterSpacing: '0.16em',
      color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

// ── Prompt open ───────────────────────────────────────────────────────────
function PromptOpen({ focus, save, hasFocus, onCollapse, bare = false }) {
  const sectionStyle = bare
    ? { marginBottom: 0, padding: 0 }
    : {
        marginBottom: '40px',
        padding: '28px',
        background: '#FFFFFF',
        border: '1px solid rgba(200,146,42,0.30)',
        borderRadius: '12px',
        boxShadow: '0 1px 0 rgba(15,21,35,0.02)',
      }

  return (
    <section style={sectionStyle}>
      {!bare && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', gap: '12px' }}>
          <div>
            <div style={{
              ...sc, fontSize: '10.5px', letterSpacing: '0.20em',
              color: GOLD, textTransform: 'uppercase', marginBottom: '4px',
            }}>
              For now
            </div>
            <h2 style={{
              ...display,
              fontSize: 'clamp(22px, 3vw, 28px)',
              fontWeight: 300, color: INK,
              margin: 0, lineHeight: 1.2,
            }}>
              What&rsquo;s close to you right now?
            </h2>
          </div>
          {hasFocus && (
            <button
              type="button"
              onClick={onCollapse}
              style={{
                ...sc, fontSize: '10.5px', letterSpacing: '0.16em',
                color: 'rgba(15,21,35,0.55)', background: 'none',
                border: 'none', cursor: 'pointer',
                textTransform: 'uppercase', padding: 0,
              }}
            >
              Done
            </button>
          )}
        </div>
      )}

      <Question1 focus={focus} save={save} />
      <Question2 focus={focus} save={save} />
      <Question3 focus={focus} save={save} />
    </section>
  )
}

// ── Question 1: Places (incl. Earth) ──────────────────────────────────────
function Question1({ focus, save }) {
  const placeIds = focus?.focus_place_ids || []
  const [picked, setPicked] = useState([])  // resolved focus rows
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [earthSuggestion, setEarthSuggestion] = useState(null)

  // Resolve currently-picked place ids on mount
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (placeIds.length === 0) { setPicked([]); return }
      const { data } = await supabase
        .from('nextus_focuses')
        .select('id, slug, name, type')
        .in('id', placeIds)
      if (!cancelled) setPicked(data || [])
    }
    resolve()
    return () => { cancelled = true }
  }, [JSON.stringify(placeIds)])

  // Surface Earth as a soft suggestion for first-timers
  useEffect(() => {
    let cancelled = false
    async function loadEarth() {
      if (placeIds.length > 0) { setEarthSuggestion(null); return }
      const { data } = await supabase
        .from('nextus_focuses')
        .select('id, slug, name, type')
        .eq('slug', 'earth')
        .maybeSingle()
      if (!cancelled) setEarthSuggestion(data)
    }
    loadEarth()
    return () => { cancelled = true }
  }, [placeIds.length])

  // Search debounce — also matches Earth aliases
  //
  // Uses the search_focuses RPC (migration 053). The RPC ranks results
  // server-side: prefix matches first, then trigram similarity, then alpha.
  // This is essential because nextus_focuses has ~760k rows; the previous
  // client-side `ilike '%q%' order by type, name limit 20` was timing out.
  //
  // Falls back gracefully to direct ilike on the table if the RPC isn't
  // present yet (covers the first-deploy window before migration 053 lands).
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      setSearching(true)
      // Earth alias matching: "world", "planet" → also match Earth row
      const earthAliases = ['world', 'planet', 'globe', 'earth']
      const qLower = q.toLowerCase()
      const isEarthQuery = earthAliases.some(a => a.startsWith(qLower) || qLower.startsWith(a))

      // Primary name search via ranked RPC
      let nameMatches = []
      const { data: rpcData, error: rpcErr } = await supabase
        .rpc('search_focuses', { p_query: q, p_limit: 20 })

      if (rpcErr) {
        console.warn('search_focuses RPC unavailable, falling back to ilike:', rpcErr)
        // Fallback path — only runs if the RPC isn't deployed. Still capped
        // and order-by-name only (no order-by-type, since type has low
        // cardinality and hurts more than it helps on this dataset).
        const { data: fb, error: fbErr } = await supabase
          .from('nextus_focuses')
          .select('id, slug, name, type')
          .ilike('name', `${q}%`)
          .order('name')
          .limit(20)
        if (fbErr) console.error('Place search fallback failed:', fbErr)
        nameMatches = fb || []
      } else {
        nameMatches = (rpcData || []).map(r => ({
          id: r.id, slug: r.slug, name: r.name, type: r.type,
        }))
      }

      // If the query looks like an Earth-alias, also surface Earth itself
      let earthRow = null
      if (isEarthQuery) {
        const { data: e } = await supabase
          .from('nextus_focuses')
          .select('id, slug, name, type')
          .eq('slug', 'earth')
          .maybeSingle()
        earthRow = e || null
      }

      if (cancelled) return

      const combined = [...nameMatches]
      if (earthRow && !combined.some(r => r.id === earthRow.id)) {
        combined.unshift(earthRow)
      }

      setResults(combined)
      setSearching(false)
    }, 240)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query])

  async function add(place) {
    if (picked.length >= PLACE_CAP) return
    if (placeIds.includes(place.id)) return
    const next = [...placeIds, place.id]
    setPicked(prev => [...prev, place])
    setQuery('')
    setResults([])
    await save({ focus_place_ids: next })
  }

  async function remove(placeId) {
    const next = placeIds.filter(id => id !== placeId)
    setPicked(prev => prev.filter(p => p.id !== placeId))
    await save({ focus_place_ids: next })
  }

  return (
    <QuestionBlock
      title="Where do you want to focus your attention?"
      helper={picked.length >= PLACE_CAP
        ? `Up to ${PLACE_CAP} places. Remove one to add another.`
        : `Up to ${PLACE_CAP} places, including the whole planet if you want.`}
    >
      {picked.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {picked.map(p => (
            <PickedChip key={p.id} label={p.name} onRemove={() => remove(p.id)} />
          ))}
        </div>
      )}

      {picked.length < PLACE_CAP && (
        <>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: '380px' }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search a place — city, country, region, or the planet…"
              style={{ ...inputStyle, paddingRight: query ? '36px' : '14px' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(15,21,35,0.45)',
                  fontSize: '18px',
                  lineHeight: 1,
                  padding: '4px 8px',
                }}
              >
                ×
              </button>
            )}
          </div>
          {earthSuggestion && query.trim().length === 0 && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ ...body, fontSize: '12.5px', color: 'rgba(15,21,35,0.55)', fontStyle: 'italic' }}>
                or focus planetarily:
              </span>
              <button
                type="button"
                onClick={() => add(earthSuggestion)}
                style={suggestionStyle}
              >
                + Earth
              </button>
            </div>
          )}
          {query.trim().length >= 2 && (
            <ResultsDropdown searching={searching} results={results} onPick={add} />
          )}
        </>
      )}
    </QuestionBlock>
  )
}

// ── Question 2: Domains + in-domain orgs + cross-domain org search ────────
function Question2({ focus, save }) {
  const domainSlugs = focus?.focus_domain_slugs || []
  const actorIds    = focus?.focus_actor_ids || []
  const [pickedActors, setPickedActors] = useState([])
  const [inDomainResults, setInDomainResults] = useState([])
  const [inDomainLoading, setInDomainLoading] = useState(false)

  const [crossQuery, setCrossQuery] = useState('')
  const [crossResults, setCrossResults] = useState([])
  const [crossSearching, setCrossSearching] = useState(false)

  // Resolve currently-picked actor ids
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (actorIds.length === 0) { setPickedActors([]); return }
      const { data } = await supabase
        .from('nextus_actors')
        .select('id, slug, name, kind')
        .in('id', actorIds)
      if (!cancelled) setPickedActors(data || [])
    }
    resolve()
    return () => { cancelled = true }
  }, [JSON.stringify(actorIds)])

  // Load orgs primary to selected domains
  useEffect(() => {
    let cancelled = false
    async function loadInDomain() {
      if (domainSlugs.length === 0) { setInDomainResults([]); return }
      setInDomainLoading(true)
      // Filter nextus_actors by domains text-array containing any selected slug.
      // The actor schema uses `domains` (text[] of slugs), not a singular domain col.
      const { data } = await supabase
        .from('nextus_actors')
        .select('id, slug, name, kind, domains, scale')
        .overlaps('domains', domainSlugs)
        .eq('status', 'live')
        .order('name')
        .limit(60)
      if (!cancelled) {
        setInDomainResults(data || [])
        setInDomainLoading(false)
      }
    }
    loadInDomain()
    return () => { cancelled = true }
  }, [JSON.stringify(domainSlugs)])

  // Cross-domain org search debounce
  useEffect(() => {
    const q = crossQuery.trim()
    if (q.length < 2) { setCrossResults([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      setCrossSearching(true)
      const { data } = await supabase
        .from('nextus_actors')
        .select('id, slug, name, kind, domains')
        .ilike('name', `%${q}%`)
        .eq('status', 'live')
        .order('name')
        .limit(20)
      if (!cancelled) {
        setCrossResults(data || [])
        setCrossSearching(false)
      }
    }, 240)
    return () => { cancelled = true; clearTimeout(t) }
  }, [crossQuery])

  async function toggleDomain(slug) {
    const next = domainSlugs.includes(slug)
      ? domainSlugs.filter(s => s !== slug)
      : (domainSlugs.length < DOMAIN_CAP ? [...domainSlugs, slug] : domainSlugs)
    if (next === domainSlugs) return
    await save({ focus_domain_slugs: next })
  }

  async function toggleActor(actor) {
    const next = actorIds.includes(actor.id)
      ? actorIds.filter(id => id !== actor.id)
      : [...actorIds, actor.id]
    await save({ focus_actor_ids: next })
    setCrossQuery('')
    setCrossResults([])
  }

  return (
    <QuestionBlock
      title="What domain is most interesting to you at this moment?"
      helper={`Pick up to ${DOMAIN_CAP}. The orgs working in each domain appear below.`}
    >
      {/* Domain chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {DOMAINS.map(d => {
          const active = domainSlugs.includes(d.slug)
          return (
            <button
              key={d.slug}
              type="button"
              onClick={() => toggleDomain(d.slug)}
              style={{
                ...sc,
                fontSize: '11.5px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: active ? '#FFFFFF' : d.color,
                background: active ? d.color : 'rgba(15,21,35,0.02)',
                border: `1.5px solid ${d.color}`,
                borderRadius: '20px',
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              {d.label}
            </button>
          )
        })}
      </div>

      {/* In-domain orgs */}
      {domainSlugs.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <Label>
            Any organisations in {domainSlugs.length === 1 ? 'this domain' : 'these domains'} you want to centre on?
          </Label>
          {inDomainLoading && <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '8px' }}>Loading…</p>}
          {!inDomainLoading && inDomainResults.length === 0 && (
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', fontStyle: 'italic', marginTop: '8px' }}>
              No organisations seeded primarily in {domainSlugs.length === 1 ? 'this domain' : 'these domains'} yet.
            </p>
          )}
          {!inDomainLoading && inDomainResults.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {inDomainResults.map(a => {
                const active = actorIds.includes(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleActor(a)}
                    style={{
                      ...body, fontSize: '13px',
                      color: active ? '#FFFFFF' : INK,
                      background: active ? GOLD : '#FFFFFF',
                      border: '1px solid rgba(200,146,42,0.30)',
                      borderRadius: '14px',
                      padding: '4px 11px',
                      cursor: 'pointer',
                    }}
                  >
                    {active ? '✓ ' : ''}{a.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Cross-domain search */}
      <div>
        <Label>Looking for an organisation that doesn&rsquo;t sit in one domain?</Label>
        <input
          type="text"
          value={crossQuery}
          onChange={e => setCrossQuery(e.target.value)}
          placeholder="Search — NextUs, the UN, anything…"
          style={{ ...inputStyle, marginTop: '8px' }}
        />
        {pickedActors.filter(a => !inDomainResults.some(r => r.id === a.id)).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {pickedActors.filter(a => !inDomainResults.some(r => r.id === a.id)).map(a => (
              <PickedChip key={a.id} label={a.name} onRemove={() => toggleActor(a)} />
            ))}
          </div>
        )}
        {crossQuery.trim().length >= 2 && (
          <ResultsDropdown
            searching={crossSearching}
            results={crossResults.map(r => ({ ...r, type: r.kind }))}
            onPick={toggleActor}
          />
        )}
      </div>
    </QuestionBlock>
  )
}

// ── Question 3: Participation modes ───────────────────────────────────────
function Question3({ focus, save }) {
  const participation = focus?.participation || []

  async function toggle(slug) {
    const next = participation.includes(slug)
      ? participation.filter(p => p !== slug)
      : [...participation, slug]
    await save({ participation: next })
  }

  return (
    <QuestionBlock
      title="How might you want to participate?"
      helper="Pick as many as fit."
      last
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {PARTICIPATION.map(p => {
          const active = participation.includes(p.slug)
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => toggle(p.slug)}
              style={{
                ...sc, fontSize: '11.5px', letterSpacing: '0.14em',
                color: active ? '#FFFFFF' : GOLD,
                background: active ? GOLD : 'rgba(200,146,42,0.04)',
                border: `1.5px solid ${GOLD}`,
                borderRadius: '20px',
                padding: '6px 14px',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </QuestionBlock>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────
function QuestionBlock({ title, helper, children, last = false }) {
  return (
    <div style={{
      marginBottom: last ? 0 : '28px',
      paddingBottom: last ? 0 : '22px',
      borderBottom: last ? 'none' : '1px dashed rgba(200,146,42,0.20)',
    }}>
      <h3 style={{
        ...display,
        fontSize: '17px', fontWeight: 400,
        color: INK, margin: '0 0 4px 0',
      }}>
        {title}
      </h3>
      {helper && (
        <p style={{
          ...body, fontSize: '12.5px',
          color: 'rgba(15,21,35,0.55)',
          fontStyle: 'italic',
          margin: '0 0 12px 0',
        }}>
          {helper}
        </p>
      )}
      {children}
    </div>
  )
}

function PickedChip({ label, onRemove }) {
  return (
    <span style={{
      ...body, fontSize: '13px', color: INK,
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.30)',
      borderRadius: '14px', padding: '4px 6px 4px 11px',
      display: 'inline-flex', alignItems: 'center', gap: '6px',
    }}>
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(15,21,35,0.45)', fontSize: '16px',
          lineHeight: 1, padding: '0 2px',
        }}
      >
        ×
      </button>
    </span>
  )
}

const inputStyle = {
  ...body, fontSize: '14px', color: INK,
  padding: '9px 14px',
  borderRadius: '8px',
  border: '1.5px solid rgba(200,146,42,0.30)',
  background: '#FFFFFF', outline: 'none',
  width: '100%', maxWidth: '380px',
}

const suggestionStyle = {
  ...sc, fontSize: '11px', letterSpacing: '0.14em',
  color: GOLD, background: 'rgba(200,146,42,0.04)',
  border: '1px dashed rgba(200,146,42,0.45)',
  borderRadius: '14px', padding: '4px 11px',
  cursor: 'pointer', textTransform: 'uppercase',
}

function ResultsDropdown({ searching, results, onPick }) {
  return (
    <div style={{
      marginTop: '8px',
      maxWidth: '380px',
      background: '#FFFFFF',
      border: '1.5px solid rgba(200,146,42,0.30)',
      borderRadius: '8px',
      maxHeight: '240px',
      overflowY: 'auto',
    }}>
      {searching && (
        <div style={{ ...body, fontSize: '13.5px', color: 'rgba(15,21,35,0.55)', padding: '10px 14px' }}>
          Searching…
        </div>
      )}
      {!searching && results.length === 0 && (
        <div style={{ ...body, fontSize: '13.5px', color: 'rgba(15,21,35,0.55)', padding: '10px 14px' }}>
          No matches.
        </div>
      )}
      {results.map(r => (
        <button
          key={r.id}
          type="button"
          onClick={() => onPick(r)}
          style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '9px 14px', width: '100%',
            borderBottom: '1px solid rgba(200,146,42,0.10)',
            background: 'transparent', border: 'none',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ ...body, fontSize: '13.5px', color: INK }}>{r.name}</span>
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.12em', color: GOLD, textTransform: 'uppercase' }}>
            {r.type || r.kind || ''}
          </span>
        </button>
      ))}
    </div>
  )
}
