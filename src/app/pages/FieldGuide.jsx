// src/app/pages/FieldGuide.jsx
//
// The Field Guide at /guide (slug provisional · naming session pending).
//
// v3 (July 2026) — the life-list build. Part pokédex, part birder's
// life-list, part field guide. The page is the user's own record of the
// organisations they have ENCOUNTERED — not a browse of the whole Atlas
// (that's /explore). Design follows the v3 mockup, translated onto the
// bright warm at.* tokens:
//
//   · Champions ring — the ONE capped thing (5–10, actor_champions,
//     DB-enforced). Brass foil treatment, never heritage gold: this file
//     is not on the scripts/audit-design.js GOLD_WHITELIST.
//   · Collection — unlimited. Grouped by domain ("habitat") with a
//     running head + epithet, "x of y collected" counts, banding codes
//     (REGE 1), species lines, scale dots, first-met stamps.
//   · Not-yet-met — dark silhouette teaser slots (capped at 2 per
//     habitat) + the count, linking to /explore.
//   · Scout card — add an org that isn't on the platform yet (→ /add,
//     which fires the cold invite server-side).
//   · Specimen overlay — mission slot (their words, or your suggestion
//     via actor_mission_suggestions), horizon slot, your private field
//     note (actor_field_notes — writing one is what collects the org),
//     the relationship chain, and the champion toggle.
//
// Tiers stay DERIVED (src/app/lib/guideTiers.js) and thresholds are
// never surfaced. Champion is orthogonal to the tier ladder.

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { at, atText, display, mono, bodyFont } from '../../lib/designTokens'
import { CIV_DOMAINS } from '../constants/domains'
import { DOMAIN_HORIZON_GOALS } from '../constants/domains'
import { loadGuideState } from '../lib/guideTiers'
import { useChampions } from '../hooks/useChampions'

// ── Vocabulary ────────────────────────────────────────────────────────────
const TIER_LABEL = { found: 'Found', known: 'Known', following: 'Tuned in', allied: 'Allied', companion: 'Companion' }
const LADDER = ['found', 'known', 'following', 'allied', 'companion']

// Short habitat epithets — condensed from DOMAIN_HORIZON_GOALS.
const EPITHET = {
  'human-being':     'every human, fully themselves',
  'society':         'space to function, room to thrive',
  'nature':          'the living planet, thriving',
  'technology':      'technology in service of life',
  'finance-economy': 'enough to act on what matters',
  'legacy':          'tending what we transmit',
  'vision':          'creating forward, for all',
}

// 8-level canonical scale → 5 display dots (Local → Civilisational).
const SCALE_BUCKET = {
  'local': 1, 'municipal': 1,
  'state-province': 2,
  'national': 3,
  'regional': 4, 'international': 4,
  'global': 5, 'civilisational': 5,
}
const SCALE_SHORT = {
  'local': 'Local', 'municipal': 'Municipal', 'state-province': 'State',
  'national': 'National', 'regional': 'Regional', 'international': 'Int’l',
  'global': 'Global', 'civilisational': 'Civilisational',
}

// ── Small derivations ─────────────────────────────────────────────────────

// Birder-style banding code: first two letters of the first two words,
// else first four letters. Collision counter appended by the caller.
function bandRoot(name) {
  const words = String(name || '').toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0].slice(0, 2) + words[1].slice(0, 2)).padEnd(4, 'X')
  return (words[0] || 'XXXX').slice(0, 4).padEnd(4, 'X')
}

// Darken a #rrggbb hex by a factor (0..1) for seal gradients.
function shade(hex, f) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const ch = (x) => Math.max(0, Math.round(x * (1 - f)))
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function sealGradient(color) {
  return `linear-gradient(150deg, ${color}, ${shade(color, 0.32)})`
}

function fmtMet(ts) {
  if (!ts) return null
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  const day = d.getDate()
  const mon = d.toLocaleString('en-GB', { month: 'short' })
  const yr = String(d.getFullYear()).slice(2)
  return `${day} ${mon} ’${yr}`
}

// The logbox spells the year out — a ledger line, not a card stamp.
function fmtLogDate(ts) {
  if (!ts) return null
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Fire-and-forget warm ping (server verifies + throttles).
async function firePing(actorId, kind) {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return
    fetch('/api/guide-ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ actorId, kind }),
    }).catch(() => {})
  } catch { /* never block the act */ }
}

const brassTint = 'rgba(169,116,63,0.07)'
const brassEdgeSoft = 'rgba(169,116,63,0.35)'

// ═══════════════════════════════════════════════════════════════════════════
// Loading the Atlas
// ═══════════════════════════════════════════════════════════════════════════

const ACTOR_PAGE = 1000

const ACTOR_COLS =
  'id, slug, name, tagline, short_description, description, domains, scale, mission_statement, profile_owner'

// "That column doesn't exist" — migration 179 hasn't run — as distinct from
// any other failure. 42703 is Postgres undefined_column, PGRST204 is
// PostgREST's unknown-column code.
function isMissingColumn(error) {
  if (!error) return false
  if (error.code === '42703' || error.code === 'PGRST204') return true
  return /column .* does not exist|could not find the .* column/i.test(error.message || '')
}

// Every live actor, in name order, paged. v3 used a flat .limit(1000): past a
// thousand live actors the habitat totals ("5 of 11 collected") and the
// not-yet-met counts silently under-reported, with nothing on screen to say
// so. Paging keeps the counts honest as the Atlas grows.
//
// `band_code` (migration 179) is requested on the first attempt and dropped
// if the column isn't there yet, so a database still on 178 renders codes
// from the client-side fallback instead of failing the whole page.
async function fetchLiveActors(supabase) {
  let withBandCode = true
  const rows = []

  for (let from = 0; ; from += ACTOR_PAGE) {
    const cols = withBandCode ? `${ACTOR_COLS}, band_code` : ACTOR_COLS
    const { data, error } = await supabase
      .from('nextus_actors')
      .select(cols)
      .eq('status', 'live')
      // `id` is the tiebreaker, and it is not optional. Offset paging over a
      // non-unique sort key has no defined order for equal names, and each
      // page is a separate query — so two orgs sharing a name either side of a
      // page boundary could come back in both pages (duplicate React keys,
      // inflated "x of y collected") or in neither (an org silently absent
      // from the guide). Duplicate names are entirely possible in an Atlas fed
      // by a public /add flow.
      .order('name')
      .order('id')
      .range(from, from + ACTOR_PAGE - 1)

    if (error) {
      // Only a missing band_code column earns a retry — that's the pre-179
      // case. Retrying on any error would let one blip drop the whole load
      // onto client-derived codes, which would then collide with the
      // persisted codes already read from earlier pages.
      if (withBandCode && isMissingColumn(error)) {
        withBandCode = false
        from -= ACTOR_PAGE       // `continue` runs the increment; net zero
        continue
      }
      throw error
    }

    rows.push(...(data || []))
    if (!data || data.length < ACTOR_PAGE) break
  }

  return rows
}

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export function FieldGuidePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [actors, setActors]     = useState([])
  const [guide, setGuide]       = useState(() => new Map())
  const [myOrg, setMyOrg]       = useState(null)
  const [myOrgCounts, setMyOrgCounts] = useState(null)
  const [sort, setSort]         = useState('domain')   // 'domain' | 'recent'
  const [openActor, setOpenActor] = useState(null)     // specimen overlay
  const [capMsg, setCapMsg]     = useState(null)

  const champs = useChampions()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setLoadError(false)
      try {
        const actorRows = await fetchLiveActors(supabase)
        if (cancelled) return
        setActors(actorRows || [])

        try {
          const state = await loadGuideState(supabase, user?.id)
          if (!cancelled) setGuide(state)
        } catch (e) {
          console.error('[FieldGuide] guide state failed:', e)
          if (!cancelled) setGuide(new Map())
        }

        // The user's own entry, if they own one.
        if (user?.id) {
          const mine = (actorRows || []).find(a => a.profile_owner === user.id) || null
          if (!cancelled) setMyOrg(mine)
          if (mine) {
            try {
              const { data: counts } = await supabase
                .rpc('actor_guide_counts', { p_actor_ids: [mine.id] })
              if (!cancelled && counts && counts[0]) setMyOrgCounts(counts[0])
            } catch { /* counting RPC not migrated yet — banner shows without stats */ }
          }
        }
      } catch (e) {
        console.error('[FieldGuide] load failed:', e)
        if (!cancelled) setLoadError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id, reloadKey])

  // Banding codes, actorId → 'REGE 1'.
  //
  // v3 also carried a dex number (Nº 012) derived from alphabetical position.
  // That is gone (decision, 25 July): a number implies a fixed place in a
  // series, and this one moved every time an unrelated org was added — so it
  // promised a permanence it could not keep. Organisations are listed
  // alphabetically and carry no number. The champions ring is the ordered
  // thing, and the user orders it.
  //
  // The code itself stays: it identifies without ranking. Read from
  // nextus_actors.band_code where migration 179 has run, where it was
  // assigned once and never reshuffled. The client-side derivation below is
  // the pre-179 fallback and shares bandRoot() with the SQL function — its
  // collision counter is only correct across the full name-ordered set,
  // which is why persisting it was worth a migration.
  const codes = useMemo(() => {
    const byId = new Map()
    const seen = new Map()
    for (const a of actors) {
      if (a.band_code) { byId.set(a.id, a.band_code); continue }
      const root = bandRoot(a.name)
      const n = (seen.get(root) || 0) + 1
      seen.set(root, n)
      byId.set(a.id, `${root} ${n}`)
    }
    return byId
  }, [actors])

  // Domain buckets: met / unmet per habitat (first matching domain wins).
  const habitats = useMemo(() => {
    const buckets = CIV_DOMAINS.map(d => ({ domain: d, met: [], unmet: [] }))
    const bySlug = new Map(buckets.map(b => [b.domain.slug, b]))
    for (const a of actors) {
      const ds = Array.isArray(a.domains) ? a.domains : []
      const home = CIV_DOMAINS.find(d => ds.includes(d.slug))
      if (!home) continue
      const b = bySlug.get(home.slug)
      if (guide.has(a.id)) b.met.push(a)
      else b.unmet.push(a)
    }
    // Champions first inside each habitat, then by first-met (newest last —
    // a journal reads oldest → newest).
    for (const b of buckets) {
      b.met.sort((x, y) => {
        const ex = guide.get(x.id), ey = guide.get(y.id)
        if (!!ey?.isChampion !== !!ex?.isChampion) return ey?.isChampion ? 1 : -1
        return (ex?.firstMetAt || 0) - (ey?.firstMetAt || 0)
      })
    }
    return buckets
  }, [actors, guide])

  const metActors = useMemo(
    () => actors.filter(a => guide.has(a.id)),
    [actors, guide],
  )

  const recentList = useMemo(
    () => [...metActors].sort((x, y) =>
      (guide.get(y.id)?.firstMetAt || 0) - (guide.get(x.id)?.firstMetAt || 0)),
    [metActors, guide],
  )

  // Widest reach first — the sort you use to see how far your company
  // actually carries. Ties fall back to name so the order is stable.
  const scaleList = useMemo(
    () => [...metActors].sort((x, y) => {
      const d = (SCALE_BUCKET[y.scale] || 0) - (SCALE_BUCKET[x.scale] || 0)
      return d !== 0 ? d : String(x.name || '').localeCompare(String(y.name || ''))
    }),
    [metActors],
  )

  // Closest relationship first: Companion down to Found.
  const tierList = useMemo(
    () => [...metActors].sort((x, y) => {
      const d = LADDER.indexOf(guide.get(y.id)?.tier || 'found')
              - LADDER.indexOf(guide.get(x.id)?.tier || 'found')
      return d !== 0 ? d : String(x.name || '').localeCompare(String(y.name || ''))
    }),
    [metActors, guide],
  )

  const flatList = sort === 'scale' ? scaleList : sort === 'tier' ? tierList : recentList

  const championActors = useMemo(
    () => champs.champions
      .map(c => actors.find(a => a.id === c.actor_id))
      .filter(Boolean),
    [champs.champions, actors],
  )

  const actorById = useMemo(() => new Map(actors.map(a => [a.id, a])), [actors])
  const domainOf = (a) => {
    const ds = Array.isArray(a?.domains) ? a.domains : []
    return CIV_DOMAINS.find(d => ds.includes(d.slug)) || null
  }

  // ── Local mutations ──────────────────────────────────────────────────────
  function handleNoteSaved(actorId, note, isNew, prov = {}) {
    const { metWhere = null, metVia = null } = prov
    setGuide(prev => {
      const next = new Map(prev)
      const entry = next.get(actorId)
      if (entry) next.set(actorId, { ...entry, note, metWhere, metVia, tier: entry.tier === 'found' ? 'known' : entry.tier })
      else next.set(actorId, { tier: 'known', note, isChampion: false, firstMetAt: Date.now(), metWhere, metVia })
      return next
    })
    if (isNew) firePing(actorId, 'added_to_guide')
  }

  // Move a champion one place within the ring AS RENDERED. The displayed list
  // can be a subset of the stored ring (an org that self-removes leaves its
  // champion row behind, migration 166), so the new order is computed from
  // championActors — what the user is actually looking at — and handed to the
  // hook whole, rather than asking it to swap by index into the stored list.
  async function handleChampionMove(actorId, delta) {
    const ids = championActors.map(a => a.id)
    const from = ids.indexOf(actorId)
    const to = from + delta
    if (from < 0 || to < 0 || to >= ids.length) return
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    await champs.reorder(ids)
  }

  async function handleChampionToggle(actorId) {
    setCapMsg(null)
    try {
      const res = await champs.toggle(actorId)
      setGuide(prev => {
        const next = new Map(prev)
        const entry = next.get(actorId)
        if (entry) next.set(actorId, { ...entry, isChampion: res.added })
        else if (res.added) next.set(actorId, { tier: 'known', note: null, isChampion: true, firstMetAt: Date.now() })
        return next
      })
    } catch (e) {
      if (e.code === 'CHAMPION_CAP_REACHED') setCapMsg(e.message)
      else console.error('[FieldGuide] champion toggle failed:', e)
    }
  }

  const asOf = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ background: at.ground, minHeight: '100dvh' }}>
      <Nav activePath="" />

      <div style={{
        maxWidth: '1060px', margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 40px) 80px',
      }}>

        {/* ── Header ── */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '18px', flexWrap: 'wrap', marginBottom: '22px' }}>
          <div>
            <div style={{ ...atText.eyebrow, color: at.brass }}>Your field guide</div>
            {/* UI label provisional · naming session pending */}
            <h1 style={{ ...display, fontSize: 'clamp(30px, 5vw, 42px)', fontWeight: 300, color: at.text, margin: '6px 0 4px', lineHeight: 1.12 }}>
              The orgs you’ve encountered
            </h1>
            <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: at.ghost }}>
              As of {asOf}
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: '170px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', justifyContent: 'flex-end' }}>
              <span style={{ ...display, fontWeight: 300, fontSize: '42px', color: at.text, lineHeight: 1 }}>
                {loading ? '…' : metActors.length}
              </span>
              <span style={{ ...atText.body }}>encountered</span>
            </div>
            <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: at.ghost, marginTop: '4px' }}>
              life list · no limit · keep exploring
            </div>
          </div>
        </header>

        {loadError && (
          <p style={{ ...atText.body }}>
            Could not load your guide.{' '}
            <a href="#" onClick={e => { e.preventDefault(); setReloadKey(k => k + 1) }} style={{ color: at.verdigris }}>Try again</a>
          </p>
        )}

        {!user && !loading && (
          <div style={{ background: at.object, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '14px', padding: '22px', marginBottom: '20px' }}>
            <p style={{ ...atText.body, margin: '0 0 12px' }}>
              A field guide to the organisations you encounter — collect the ones you meet,
              keep a private note on who they are, and choose the five to ten you let shape you.
            </p>
            <Link to="/login?redirect=%2Fguide" style={{ ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fff', background: at.brass, borderRadius: '40px', padding: '10px 20px', textDecoration: 'none', display: 'inline-block' }}>
              Sign in to start yours
            </Link>
          </div>
        )}

        {user && !loading && !loadError && (
          <>
            {/* ── Champions ring ── */}
            <ChampionsRing
              championActors={championActors}
              count={champs.count}
              cap={champs.cap}
              capMsg={capMsg}
              domainOf={domainOf}
              onOpen={(a) => setOpenActor(a)}
              canOrder={champs.canOrder}
              onMove={handleChampionMove}
            />

            {/* ── My org banner ── */}
            {myOrg && (
              <MyOrgBanner org={myOrg} counts={myOrgCounts} onManage={() => navigate(`/org/${myOrg.slug || myOrg.id}`)} />
            )}

            {/* ── Sort ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 6px', flexWrap: 'wrap' }}>
              <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: at.ghost }}>Sort</span>
              {[['domain', 'Domain'], ['scale', 'Scale'], ['tier', 'Tier'], ['recent', 'Recently met']].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setSort(k)}
                  style={{
                    ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em',
                    color: sort === k ? '#fff' : at.meta,
                    background: sort === k ? at.brass : at.object,
                    border: `1px solid ${sort === k ? at.brass : at.verdigrisEdge}`,
                    borderRadius: '99px', padding: '6px 14px', cursor: 'pointer',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Collection ── */}
            {sort === 'domain' ? (
              habitats.map(({ domain, met, unmet }) => (
                (met.length > 0 || unmet.length > 0) && (
                  <HabitatSection
                    key={domain.slug}
                    domain={domain}
                    met={met}
                    unmetCount={unmet.length}
                    guide={guide}
                    codes={codes}
                    onOpen={setOpenActor}
                  />
                )
              ))
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))', gap: '12px', marginTop: '18px' }}>
                {flatList.map(a => (
                  <GuideCard key={a.id} actor={a} entry={guide.get(a.id)} code={codes.get(a.id)} domain={domainOf(a)} onOpen={() => setOpenActor(a)} />
                ))}
                <ScoutCard onClick={() => navigate('/add')} />
              </div>
            )}

            {metActors.length === 0 && (
              <p style={{ ...atText.body, marginTop: '20px' }}>
                Nothing collected yet. Meet an organisation on{' '}
                <Link to="/explore" style={{ color: at.verdigris }}>Explore</Link> or{' '}
                <Link to="/map" style={{ color: at.verdigris }}>The Map</Link>, and write a one-line
                note on who they are — that’s what writes them into your guide.
              </p>
            )}

            {/* ── Legend ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap', marginTop: '30px', paddingTop: '12px', borderTop: `1px solid ${at.verdigrisEdge}` }}>
              {[['★ champion', at.brass], ['● collected', at.ghost], ['◌ not yet met', at.ghost], ['●●●●● scale · local → civilisational', at.ghost]].map(([t, c]) => (
                <span key={t} style={{ ...mono, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: c }}>{t}</span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Specimen overlay ── */}
      {openActor && (
        <SpecimenOverlay
          // Keyed per actor: the overlay seeds its note and Where/Via drafts
          // from `entry` on mount, so reusing the instance for a different
          // specimen would carry one org's draft onto another's card.
          key={openActor.id}
          actor={openActor}
          entry={guide.get(openActor.id) || null}
          code={codes.get(openActor.id)}
          domain={domainOf(openActor)}
          user={user}
          isChampion={champs.isChampion(openActor.id)}
          capMsg={capMsg}
          onChampion={() => handleChampionToggle(openActor.id)}
          onNoteSaved={handleNoteSaved}
          onClose={() => { setOpenActor(null); setCapMsg(null) }}
        />
      )}

      <SiteFooter />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Champions ring
// ═══════════════════════════════════════════════════════════════════════════

// The champions ring — the one place in the guide where sequence carries
// meaning, and the only ordering the user sets by hand. Organisations
// themselves are alphabetical and unnumbered; a ring is a considered order,
// so it gets an explicit arrange mode rather than a drag surface: real
// buttons, keyboard-reachable, no pointer gymnastics on a phone.
function ChampionsRing({ championActors, count, cap, capMsg, domainOf, onOpen, canOrder, onMove }) {
  const empty = Math.max(0, cap - count)
  const [arranging, setArranging] = useState(false)
  const canArrange = canOrder && championActors.length > 1

  // Leaving arrange mode when the ring empties out avoids a stuck state.
  useEffect(() => {
    if (arranging && championActors.length < 2) setArranging(false)
  }, [arranging, championActors.length])

  const arrowStyle = (enabled) => ({
    ...mono, fontSize: '13px', lineHeight: 1, padding: '2px 5px', cursor: enabled ? 'pointer' : 'not-allowed',
    color: enabled ? at.brass : at.ghost,
    background: enabled ? brassTint : 'transparent',
    border: `1px solid ${enabled ? brassEdgeSoft : at.verdigrisEdge}`,
    borderRadius: '4px',
  })

  return (
    <div style={{
      position: 'relative', borderRadius: '14px', padding: '16px 18px', marginBottom: '16px',
      background: `linear-gradient(120deg, rgba(169,116,63,0.12), rgba(169,116,63,0.04) 45%, rgba(169,116,63,0.13))`,
      border: `1.5px solid ${brassEdgeSoft}`, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
        <span style={{ ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: at.brass }}>★ Your champions</span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          {canArrange && (
            <button type="button" onClick={() => setArranging(v => !v)}
              style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: at.verdigris, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
              {arranging ? 'Done' : 'Arrange'}
            </button>
          )}
          <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: at.ghost }}>{count} of {cap} · capped</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {championActors.map((a, i) => {
          const d = domainOf(a)
          const seal = (
            <>
              <span style={{
                width: '42px', height: '42px', borderRadius: '50%', display: 'grid', placeItems: 'center',
                fontFamily: display.fontFamily, fontWeight: 600, fontSize: '17px', color: '#fff',
                background: sealGradient(d?.color || at.verdigris),
                boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.55), 0 0 0 2px ${brassEdgeSoft}, 0 3px 8px rgba(38,36,32,0.2)`,
              }}>
                {String(a.name || '?').charAt(0).toUpperCase()}
              </span>
              <span aria-hidden="true" style={{ position: 'absolute', top: '-7px', right: '-3px', fontSize: '13px', color: at.brass }}>★</span>
            </>
          )

          if (!arranging) {
            return (
              <button key={a.id} type="button" onClick={() => onOpen(a)} title={a.name}
                style={{ position: 'relative', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
                {seal}
              </button>
            )
          }

          return (
            <span key={a.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ position: 'relative', display: 'inline-block' }} title={a.name}>{seal}</span>
              <span style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                <button type="button" disabled={i === 0} onClick={() => onMove(a.id, -1)}
                  aria-label={`Move ${a.name} earlier`} style={arrowStyle(i > 0)}>‹</button>
                <span style={{ ...mono, fontSize: '13px', color: at.ghost, minWidth: '12px', textAlign: 'center' }}>{i + 1}</span>
                <button type="button" disabled={i === championActors.length - 1} onClick={() => onMove(a.id, 1)}
                  aria-label={`Move ${a.name} later`} style={arrowStyle(i < championActors.length - 1)}>›</button>
              </span>
            </span>
          )
        })}
        {!arranging && Array.from({ length: empty }).map((_, i) => (
          <span key={`e${i}`} aria-hidden="true" style={{
            width: '42px', height: '42px', borderRadius: '50%',
            border: `1.5px dashed ${brassEdgeSoft}`, display: 'grid', placeItems: 'center',
            color: brassEdgeSoft, fontFamily: display.fontFamily, fontSize: '20px',
          }}>+</span>
        ))}
      </div>
      <div style={{ ...atText.caption, marginTop: '10px', lineHeight: 1.5 }}>
        The five to ten impact-makers you orbit most. We become the average of the company we
        keep, so choose these on purpose. Their moves rise to the top of your{' '}
        <Link to="/tuned-in" style={{ color: at.verdigris }}>Tuned In</Link> feed.
        {canArrange && !arranging && ' The order is yours — arrange them however you hold them.'}
        {arranging && ' Nearest first. Nothing here is scored; this is just the order you keep them in.'}
      </div>
      {capMsg && (
        <div style={{ ...atText.caption, color: '#8A3030', marginTop: '8px' }}>{capMsg}</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// My org banner
// ═══════════════════════════════════════════════════════════════════════════

function MyOrgBanner({ org, counts, onManage }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px', background: at.object,
      border: `1.5px solid ${brassEdgeSoft}`, borderRadius: '14px', padding: '13px 16px', marginBottom: '16px', flexWrap: 'wrap',
    }}>
      <span style={{
        width: '40px', height: '40px', borderRadius: '50%', display: 'grid', placeItems: 'center',
        fontFamily: display.fontFamily, fontWeight: 600, fontSize: '17px', color: '#fff',
        background: sealGradient(at.brass), boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.5)',
      }}>
        {String(org.name || '?').charAt(0).toUpperCase()}
      </span>
      <div style={{ flex: 1, minWidth: '160px' }}>
        <div style={{ ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: at.brass }}>Your own entry</div>
        <div style={{ ...display, fontSize: '19px', color: at.text, lineHeight: 1.1 }}>{org.name}</div>
      </div>
      {counts && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.08em', color: at.brass, background: brassTint, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '99px', padding: '6px 13px' }}>
            ◈ In {counts.guide_count} field guide{Number(counts.guide_count) === 1 ? '' : 's'}
          </span>
          <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.08em', color: at.brass, background: brassTint, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '99px', padding: '6px 13px' }}>
            ★ Champion to {counts.champion_count} {Number(counts.champion_count) === 1 ? 'person' : 'people'}
          </span>
        </div>
      )}
      <button type="button" onClick={onManage} style={{
        ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: at.brass, background: brassTint, border: `1.5px solid ${brassEdgeSoft}`,
        borderRadius: '40px', padding: '9px 16px', cursor: 'pointer',
      }}>
        My entry
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Habitat section (one domain)
// ═══════════════════════════════════════════════════════════════════════════

function HabitatSection({ domain, met, unmetCount, guide, codes, onOpen }) {
  const navigate = useNavigate()
  const total = met.length + unmetCount
  const teasers = Math.min(2, unmetCount)
  return (
    <section style={{ marginTop: '26px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px' }}>
        <span style={{ ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: domain.color }}>
          {domain.label}
        </span>
        <span style={{ ...bodyFont, fontSize: '13px', color: at.ghost }}>
          {EPITHET[domain.slug] || ''}
        </span>
        <span aria-hidden="true" style={{ flex: 1, height: '3px', borderTop: `1px solid ${domain.color}`, borderBottom: `1px solid ${domain.color}`, opacity: 0.3 }} />
        <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', color: at.ghost }}>
          {met.length} of {total} collected
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))', gap: '12px' }}>
        {met.map(a => (
          <GuideCard key={a.id} actor={a} entry={guide.get(a.id)} code={codes.get(a.id)} domain={domain} onOpen={() => onOpen(a)} />
        ))}
        {Array.from({ length: teasers }).map((_, i) => (
          <UnmetCard key={`u${i}`}
            more={i === teasers - 1 && unmetCount > teasers ? unmetCount - teasers : 0}
            onClick={() => navigate('/explore')} />
        ))}
        <ScoutCard onClick={() => navigate('/add')} />
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// One collected card
// ═══════════════════════════════════════════════════════════════════════════

function ScaleDots({ scale }) {
  const lit = SCALE_BUCKET[scale] || 0
  if (!lit) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...mono, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: at.meta }}>
      {SCALE_SHORT[scale] || scale}
      <span style={{ display: 'inline-flex', gap: '3px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <i key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i <= lit ? at.brass : 'rgba(38,36,32,0.16)' }} />
        ))}
      </span>
    </span>
  )
}

function Ladder({ tier }) {
  const rank = LADDER.indexOf(tier)
  return (
    <span style={{ display: 'inline-flex', gap: '5px' }}>
      {LADDER.map((t, i) => (
        <i key={t} style={{
          width: '9px', height: '9px', borderRadius: '50%', boxSizing: 'border-box',
          background: i < rank ? at.brass : i === rank && rank > 0 ? shade(at.brass, 0.15) : 'transparent',
          border: i <= rank && rank > 0 ? 'none' : `1.5px solid rgba(38,36,32,0.28)`,
          boxShadow: i === rank && rank > 0 ? `0 0 0 3px ${brassTint}` : 'none',
        }} />
      ))}
    </span>
  )
}

function GuideCard({ actor, entry, code, domain, onOpen }) {
  const champ = !!entry?.isChampion
  const species = actor.tagline || actor.short_description || null
  const met = fmtMet(entry?.firstMetAt)
  const color = domain?.color || at.verdigris
  return (
    <div role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter') onOpen() }}
      style={{
        position: 'relative', borderRadius: '12px', padding: '16px 14px 12px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: '7px', overflow: 'hidden',
        background: champ
          ? 'linear-gradient(130deg, #fffdf9, #f8f1e4 40%, #fffdf9 70%, #f5edde)'
          : at.object,
        border: champ ? `1px solid ${brassEdgeSoft}` : `1px solid ${at.verdigrisEdge}`,
        boxShadow: champ ? '0 6px 18px rgba(169,116,63,0.13)' : 'none',
      }}>
      {/* domain colour band */}
      <span aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: champ ? `linear-gradient(90deg, ${color}, ${at.brass}, ${color})` : color }} />
      {/* champion corner ribbon */}
      {champ && (
        <>
          <span aria-hidden="true" style={{ position: 'absolute', top: 0, right: 0, borderStyle: 'solid', borderWidth: '0 34px 34px 0', borderColor: `transparent ${at.brass} transparent transparent` }} />
          <span aria-hidden="true" style={{ position: 'absolute', top: '3px', right: '3px', color: '#fff', fontSize: '13px', zIndex: 1 }}>★</span>
        </>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <span style={{
          width: '38px', height: '38px', borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
          fontFamily: display.fontFamily, fontWeight: 600, fontSize: '16px', color: '#fff',
          background: sealGradient(color), boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.5)',
        }}>
          {String(actor.name || '?').charAt(0).toUpperCase()}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...display, fontWeight: 600, fontSize: '17px', lineHeight: 1.08, color: at.text }}>{actor.name}</div>
          <div style={{ ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', color: at.ghost }}>{code}</div>
        </div>
      </div>

      {species && (
        <div style={{ ...bodyFont, fontStyle: 'italic', fontSize: '13px', color: at.ghost, lineHeight: 1.35 }}>{species}</div>
      )}

      <ScaleDots scale={actor.scale} />

      {entry?.note && (
        <div style={{
          ...bodyFont, fontStyle: 'italic', fontSize: '13px', color: at.meta, lineHeight: 1.5, paddingBottom: '2px',
          background: 'repeating-linear-gradient(to bottom, transparent 0 17px, rgba(38,36,32,0.055) 17px 18px)',
        }}>
          {entry.note}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{ ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: (entry?.tier === 'allied' || entry?.tier === 'companion') ? at.brass : at.meta }}>
          {TIER_LABEL[entry?.tier] || 'Found'}
        </span>
        <Ladder tier={entry?.tier || 'found'} />
      </div>

      {met && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: '6px', paddingTop: '6px', marginTop: '1px',
          borderTop: '1px dotted rgba(38,36,32,0.18)',
          ...mono, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: at.ghost,
        }}>
          <span>First met · {met}</span>
          {/* The life-list's When / Where pair. Only where it was recorded —
              an encounter with no provenance shows the date alone. */}
          {entry?.metWhere && <span>via {entry.metWhere}</span>}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Not-yet-met silhouette + scout
// ═══════════════════════════════════════════════════════════════════════════

// A not-yet-met slot carries no domain colour on purpose — an unmet specimen
// is a silhouette, and the habitat is already named in the running head above.
function UnmetCard({ more, onClick }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter') onClick() }}
      style={{
        position: 'relative', borderRadius: '12px', padding: '16px 14px 12px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: '7px', overflow: 'hidden',
        background: at.ground, border: '1px dashed rgba(38,36,32,0.22)',
      }}>
      <span aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(38,36,32,0.10)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <span style={{
          width: '38px', height: '38px', borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
          fontFamily: display.fontFamily, fontWeight: 600, fontSize: '16px', color: 'rgba(255,255,255,0.35)',
          background: 'radial-gradient(circle at 36% 30%, #4a463e, #24221d 72%)',
          boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.10)',
        }}>?</span>
        <div>
          <div style={{ ...display, fontWeight: 600, fontSize: '17px', lineHeight: 1.08, color: 'rgba(38,36,32,0.38)' }}>Not yet met</div>
          <div style={{ ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(38,36,32,0.3)' }}>? ? ? ?</div>
        </div>
      </div>
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: at.ghost, marginTop: 'auto' }}>
        ◌ {more > 0 ? `${more + 1} more in this habitat` : 'In this habitat'} → explore
      </div>
    </div>
  )
}

function ScoutCard({ onClick }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter') onClick() }}
      style={{
        borderRadius: '10px', padding: '16px 14px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center',
        background: brassTint, border: `1.5px dashed ${brassEdgeSoft}`,
        backgroundImage: 'radial-gradient(rgba(169,116,63,0.13) 1px, transparent 1.5px)', backgroundSize: '12px 12px',
      }}>
      <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: at.brass, color: '#fff', display: 'grid', placeItems: 'center', fontSize: '20px', fontFamily: display.fontFamily }}>+</span>
      <span style={{ ...display, fontWeight: 600, fontSize: '17px', color: at.text, lineHeight: 1.1 }}>Add an org</span>
      <span style={{ ...atText.caption, lineHeight: 1.45 }}>Not on NextUs yet? Add them to your guide and to the map in one move.</span>
      <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: at.brass }}>↳ we’ll let them know</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Specimen overlay
// ═══════════════════════════════════════════════════════════════════════════

function SpecimenOverlay({ actor, entry, code, domain, user, isChampion, capMsg, onChampion, onNoteSaved, onClose }) {
  const [noteDraft, setNoteDraft] = useState(entry?.note || '')
  const [noteEditing, setNoteEditing] = useState(!entry?.note)
  const [noteBusy, setNoteBusy] = useState(false)
  const [noteErr, setNoteErr] = useState(false)

  // The logbook's Where / Via — the user's own words, like the location
  // column in a birder's journal. Optional: a blank pair still collects.
  const [whereDraft, setWhereDraft] = useState(entry?.metWhere || '')
  const [viaDraft, setViaDraft] = useState(entry?.metVia || '')

  const [sug, setSug] = useState(null)          // my existing suggestion row
  const [sugDraft, setSugDraft] = useState('')
  const [sugEditing, setSugEditing] = useState(false)
  const [sugBusy, setSugBusy] = useState(false)

  const color = domain?.color || at.verdigris
  const tier = entry?.tier || 'found'
  const rank = LADDER.indexOf(tier)
  const horizon = DOMAIN_HORIZON_GOALS[domain?.slug] || null
  const logDate = fmtLogDate(entry?.firstMetAt)

  useEffect(() => {
    let cancelled = false
    async function loadSug() {
      if (!user || actor.mission_statement) return
      const { data } = await supabase
        .from('actor_mission_suggestions')
        .select('id, suggestion')
        .eq('user_id', user.id)
        .eq('actor_id', actor.id)
        .maybeSingle()
      if (!cancelled && data) { setSug(data); setSugDraft(data.suggestion) }
    }
    loadSug()
    return () => { cancelled = true }
  }, [user, actor.id, actor.mission_statement])

  async function saveNote() {
    const trimmed = noteDraft.trim()
    if (!trimmed || noteBusy || !user) return
    setNoteBusy(true); setNoteErr(false)
    const isNew = !entry?.note

    const metWhere = whereDraft.trim() || null
    const metVia = viaDraft.trim() || null
    const base = {
      user_id: user.id, actor_id: actor.id, note: trimmed,
      updated_at: new Date().toISOString(),
    }
    const opts = { onConflict: 'user_id,actor_id' }

    // Provenance columns arrive with migration 179. If they aren't there,
    // save the note anyway — losing the collect act over an optional
    // location line would be the wrong trade.
    let stored = true
    let { error } = await supabase
      .from('actor_field_notes')
      .upsert({ ...base, met_where: metWhere, met_via: metVia }, opts)
    if (error) {
      stored = false
      ;({ error } = await supabase.from('actor_field_notes').upsert(base, opts))
    }

    setNoteBusy(false)
    if (error) { setNoteErr(true); return }
    setNoteEditing(false)
    // Only report provenance the database actually took. Passing it after the
    // stripped-down retry would show a Where/Via in the logbox that quietly
    // disappears on the next reload.
    onNoteSaved(actor.id, trimmed, isNew, stored ? { metWhere, metVia } : {})
  }

  async function saveSuggestion() {
    const trimmed = sugDraft.trim()
    if (!trimmed || sugBusy || !user) return
    setSugBusy(true)
    const { data, error } = await supabase
      .from('actor_mission_suggestions')
      .upsert({ user_id: user.id, actor_id: actor.id, suggestion: trimmed, updated_at: new Date().toISOString() }, { onConflict: 'user_id,actor_id' })
      .select('id, suggestion')
      .maybeSingle()
    setSugBusy(false)
    if (!error) { setSug(data || { suggestion: trimmed }); setSugEditing(false) }
  }

  const slotStyle = { border: `1px solid ${at.verdigrisEdge}`, borderRadius: '11px', padding: '10px 13px', marginBottom: '9px', background: at.ground }
  const slotLbl = { ...mono, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: at.brass, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }
  const slotVal = { ...bodyFont, fontSize: '13.5px', color: at.text, lineHeight: 1.5 }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(38,36,32,0.45)',
      display: 'grid', placeItems: 'center', padding: '20px', overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '380px', maxWidth: '100%', maxHeight: '92dvh', overflowY: 'auto',
        background: at.object, borderRadius: '18px', position: 'relative',
        border: `2px solid ${isChampion ? brassEdgeSoft : at.verdigrisEdge}`,
        boxShadow: '0 22px 50px rgba(38,36,32,0.3)',
      }}>
        {/* plate */}
        <div style={{
          height: '132px', position: 'relative', display: 'grid', placeItems: 'center',
          background: `radial-gradient(110% 80% at 28% 12%, rgba(255,255,255,0.28), transparent 55%), ${sealGradient(color)}`,
        }}>
          <span style={{ position: 'absolute', top: '12px', left: '14px', ...mono, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.9)' }}>
            {code}
          </span>
          {isChampion && (
            <span style={{
              position: 'absolute', top: '12px', right: '14px', ...mono, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#3a2c10', background: 'linear-gradient(150deg, #ecd9b4, #c99e5e)', borderRadius: '3px', padding: '3px 9px 2px',
              boxShadow: '0 2px 6px rgba(38,36,32,0.25)',
            }}>★ Champion</span>
          )}
          <span style={{
            width: '72px', height: '72px', borderRadius: '50%', display: 'grid', placeItems: 'center',
            fontFamily: display.fontFamily, fontWeight: 600, fontSize: '30px', color: '#fff',
            background: 'rgba(255,255,255,0.14)', boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.5), 0 4px 14px rgba(38,36,32,0.2)',
          }}>
            {String(actor.name || '?').charAt(0).toUpperCase()}
          </span>
          <button type="button" onClick={onClose} aria-label="Close" style={{
            position: 'absolute', bottom: '10px', right: '12px', border: 'none', cursor: 'pointer',
            width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '14px', lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ padding: '16px 20px 20px' }}>
          <h3 style={{ ...display, fontWeight: 400, fontSize: '25px', color: at.text, lineHeight: 1.05, margin: 0 }}>{actor.name}</h3>
          {(actor.tagline || actor.short_description) && (
            <div style={{ ...bodyFont, fontStyle: 'italic', fontSize: '13px', color: at.ghost, margin: '3px 0 10px' }}>
              {actor.tagline || actor.short_description}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px', flexWrap: 'wrap' }}>
            {domain && (
              <span style={{ ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fff', background: color, borderRadius: '4px', padding: '3px 9px 2px' }}>
                {domain.label}
              </span>
            )}
            <ScaleDots scale={actor.scale} />
          </div>

          {/* ── The log box ──────────────────────────────────────────────
              The birder's logbook entry, ruled: when you first crossed
              paths, where you were, and what it was. Where and Via are
              recorded at collect time (migration 179); encounters that
              predate provenance, or that happened by watching rather than
              by writing a note, show the date and say plainly that the
              rest wasn't kept. The guide does not reconstruct a "where"
              from a timestamp. */}
          {logDate && (
            <div style={{
              border: '1px solid rgba(38,36,32,0.22)', borderRadius: '2px',
              background: at.object, marginBottom: '11px',
            }}>
              {[
                ['First met', logDate],
                ['Where', entry?.metWhere],
                ['Via', entry?.metVia],
              ].filter(([, v]) => v).map(([label, value], i, rows) => (
                <div key={label} style={{
                  display: 'flex',
                  borderBottom: i === rows.length - 1 ? 'none' : '1px solid rgba(38,36,32,0.14)',
                }}>
                  <span style={{
                    ...mono, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: at.ghost, padding: '5px 8px 4px', flex: '0 0 84px',
                    borderRight: '1px solid rgba(38,36,32,0.14)',
                  }}>{label}</span>
                  <span style={{ ...bodyFont, fontSize: '13px', color: at.text, padding: '4px 9px', flex: 1 }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
          {logDate && !entry?.metWhere && !entry?.metVia && (
            <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', color: at.ghost, margin: '-6px 0 12px' }}>
              Where and how weren’t recorded for this one.
            </div>
          )}

          {/* mission slot */}
          {actor.mission_statement ? (
            <div style={slotStyle}>
              <div style={slotLbl}><span>Their mission</span><span style={{ color: at.ghost, letterSpacing: '0.08em' }}>their words</span></div>
              <div style={slotVal}>{actor.mission_statement}</div>
            </div>
          ) : sug && !sugEditing ? (
            <div style={{ ...slotStyle, background: at.object }}>
              <div style={slotLbl}>
                <span>Mission — suggested by you</span>
                <button type="button" onClick={() => setSugEditing(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', ...mono, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: at.ghost }}>edit</button>
              </div>
              <div style={slotVal}>{sug.suggestion}</div>
            </div>
          ) : user ? (
            <div style={{ ...slotStyle, borderStyle: 'dashed', background: brassTint }}>
              <div style={slotLbl}><span>Their mission</span><span style={{ color: at.ghost, letterSpacing: '0.08em' }}>not stated yet</span></div>
              {!sugEditing ? (
                <div style={{ ...slotVal, color: at.ghost, cursor: 'pointer' }} onClick={() => setSugEditing(true)}>
                  No mission on file. In a sentence, how would you put what they do? <span style={{ color: at.brass }}>Suggest one →</span>
                </div>
              ) : (
                <div>
                  <textarea value={sugDraft} onChange={e => setSugDraft(e.target.value)} rows={2} autoFocus
                    placeholder="One sentence — what are they moving toward?"
                    style={{ ...bodyFont, fontSize: '13.5px', lineHeight: 1.5, color: at.text, background: at.object, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '6px', padding: '8px 10px', width: '100%', boxSizing: 'border-box', resize: 'vertical', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button type="button" onClick={saveSuggestion} disabled={!sugDraft.trim() || sugBusy}
                      style={{ ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: at.brass, border: 'none', borderRadius: '14px', padding: '6px 14px', cursor: 'pointer' }}>
                      {sugBusy ? 'Offering…' : 'Offer it'}
                    </button>
                    <button type="button" onClick={() => setSugEditing(false)}
                      style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: at.ghost, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                  <div style={{ ...atText.caption, marginTop: '6px' }}>
                    Offered to the org to confirm or refine — they’re pinged that someone took the time.
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* horizon slot */}
          {horizon && (
            <div style={slotStyle}>
              <div style={slotLbl}><span>The horizon they move under</span></div>
              <div style={slotVal}>{horizon}</div>
            </div>
          )}

          {/* relationship chain */}
          <div style={{ background: brassTint, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '12px', padding: '11px 14px', margin: '2px 0 10px' }}>
            <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: at.ghost }}>Your relationship</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '9px' }}>
              {LADDER.map((t, i) => (
                <span key={t} style={{ display: 'contents' }}>
                  {i > 0 && <span aria-hidden="true" style={{ fontSize: '13px', color: brassEdgeSoft, padding: '0 2px', marginBottom: '14px' }}>→</span>}
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                    <i style={{
                      width: '9px', height: '9px', borderRadius: '50%', boxSizing: 'border-box',
                      background: i < rank ? at.brass : i === rank && rank > 0 ? shade(at.brass, 0.15) : 'transparent',
                      border: i <= rank && rank > 0 ? 'none' : '1.5px solid rgba(38,36,32,0.28)',
                      boxShadow: i === rank && rank > 0 ? `0 0 0 3px ${brassTint}` : 'none',
                    }} />
                    <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.04em', textTransform: 'uppercase', color: i <= rank && rank > 0 ? at.brass : at.ghost, fontWeight: i === rank ? 600 : 400, whiteSpace: 'nowrap' }}>
                      {TIER_LABEL[t]}
                    </span>
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* field note */}
          {user && (
            !noteEditing && entry?.note ? (
              <>
                <p style={{
                  ...bodyFont, fontStyle: 'italic', fontSize: '14.5px', color: at.text, lineHeight: 1.65,
                  padding: '10px 14px 6px', borderLeft: `2px solid ${at.brass}`,
                  background: `repeating-linear-gradient(to bottom, transparent 0 23px, rgba(38,36,32,0.06) 23px 24px), ${brassTint}`,
                  borderRadius: '0 10px 10px 0', margin: '0 0 4px',
                }}>
                  {entry.note}
                </p>
                <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: at.ghost, marginBottom: '12px', display: 'flex', gap: '10px' }}>
                  <span>Your field note · private</span>
                  <button type="button" onClick={() => { setNoteDraft(entry.note); setNoteEditing(true) }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', ...mono, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: at.verdigris, padding: 0 }}>
                    edit
                  </button>
                </div>
              </>
            ) : (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: at.brass, marginBottom: '5px' }}>
                  {entry?.note ? 'Edit your field note' : 'Your field note — writing one collects them'}
                </div>
                <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={2}
                  placeholder="Who are they? One line, your words."
                  style={{ ...bodyFont, fontSize: '14px', lineHeight: 1.5, color: at.text, background: at.ground, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '6px', padding: '8px 10px', width: '100%', boxSizing: 'border-box', resize: 'vertical', outline: 'none' }} />

                {/* Where / Via — the logbook's location columns. Optional,
                    and the user's own words: a birder writes their own
                    location, the app doesn't stamp one on for them. Left
                    blank, the logbox simply carries the date. */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[
                    ['Where', whereDraft, setWhereDraft, 'The Map · Nature rail'],
                    ['Via', viaDraft, setViaDraft, 'What crossed your path'],
                  ].map(([label, value, setValue, placeholder]) => (
                    <label key={label} style={{ flex: '1 1 150px', minWidth: 0 }}>
                      <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: at.ghost, display: 'block', marginBottom: '3px' }}>
                        {label}
                      </span>
                      <input type="text" value={value} onChange={e => setValue(e.target.value)}
                        placeholder={placeholder}
                        style={{ ...bodyFont, fontSize: '13px', color: at.text, background: at.ground, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '6px', padding: '6px 9px', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                  <button type="button" onClick={saveNote} disabled={!noteDraft.trim() || noteBusy}
                    style={{
                      ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: noteDraft.trim() ? '#fff' : at.ghost,
                      background: noteDraft.trim() ? at.verdigris : 'transparent',
                      border: `1px solid ${noteDraft.trim() ? at.verdigris : at.verdigrisEdge}`,
                      borderRadius: '14px', padding: '6px 14px', cursor: noteDraft.trim() && !noteBusy ? 'pointer' : 'not-allowed',
                    }}>
                    {noteBusy ? 'Saving…' : entry?.note ? 'Save' : 'Add to my guide'}
                  </button>
                  {entry?.note && (
                    <button type="button" onClick={() => setNoteEditing(false)}
                      style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: at.ghost, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  )}
                </div>
                {noteErr && <div style={{ ...atText.caption, color: '#8A3030', marginTop: '5px' }}>Could not save. Try again.</div>}
              </div>
            )
          )}

          {/* actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link to={`/org/${actor.slug || actor.id}`} style={{
              ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#fff', background: at.verdigris, borderRadius: '40px', padding: '9px 15px', textDecoration: 'none',
            }}>
              See where you can help ›
            </Link>
            {user && (
              <button type="button" onClick={onChampion} style={{
                ...mono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: isChampion ? '#fff' : at.brass,
                background: isChampion ? at.brass : brassTint,
                border: `1.5px solid ${brassEdgeSoft}`, borderRadius: '40px', padding: '9px 15px', cursor: 'pointer',
              }}>
                {isChampion ? '★ A champion' : '★ Champion'}
              </button>
            )}
          </div>
          {capMsg && <div style={{ ...atText.caption, color: '#8A3030', marginTop: '8px' }}>{capMsg}</div>}
        </div>
      </div>
    </div>
  )
}
