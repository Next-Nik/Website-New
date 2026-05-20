// src/app/components/FocusPanelContent.jsx
//
// The body of the MY FOCUS panel on Mission Control.
//
// Two zones:
//
//   1. Anchor — one combined block surfacing both Placement (Purpose Piece)
//      and Focus. Presented as the user's one anchor, not as "results from
//      two tools." If either is missing, a clear CTA appears in its place.
//
//   2. Streams — a filter row (Watched / Curated / Focus / All) followed by
//      one or more feed sections, each filtered/sorted by the user's focus.
//      In v1, only Watched is wired to live data; Curated and Focus render
//      visible "coming online" placeholders so the structure is in place as
//      we populate them.
//
// Editing:
//   - "Edit Focus" toggles into the inline ActiveFocusPrompt editor (the
//     existing prompt UI, in `bare` mode)
//   - "Edit Purpose Piece" navigates to /tools/purpose-piece
//
// First-visit / empty states:
//   - If Purpose Piece not done: a top-of-panel CTA "Start with Purpose
//     Piece" appears above the focus block
//   - If focus not set: the prompt is shown directly (no summary)
//   - If both missing: the PP CTA shows first, focus prompt below

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { useActiveFocus } from '../hooks/useActiveFocus'
import { useViewerContext } from '../hooks/useViewerContext'
import { useFocusFeed } from '../hooks/useFocusFeed'
import { ActiveFocusPrompt } from './ActiveFocusPrompt'
import { FeedItem } from './feed/FeedItem'

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

const GOLD       = '#A8721A'
const GOLD_LIGHT = '#C8922A'
const INK        = '#0F1523'

const DOMAINS = [
  { slug: 'human-being',     label: 'Human Being' },
  { slug: 'society',         label: 'Society'     },
  { slug: 'nature',          label: 'Nature'      },
  { slug: 'technology',      label: 'Technology'  },
  { slug: 'finance-economy', label: 'Economy'     },
  { slug: 'legacy',          label: 'Legacy'      },
  { slug: 'vision',          label: 'Vision'      },
]

const PARTICIPATION_LABEL = {
  learn: 'Learn more',
  find:  'Find others',
  lend:  'Lend something',
  start: 'Start something',
  watch: 'Watch quietly',
}

const PANEL_FEED_LIMIT = 5  // items shown per section inside the panel

export default function FocusPanelContent() {
  const navigate = useNavigate()
  const { focus, hasFocus, loading: focusLoading, clear } = useActiveFocus()
  const [editingFocus, setEditingFocus] = useState(false)
  const [purposePiece, setPurposePiece] = useState(null)
  const [ppLoading, setPpLoading] = useState(true)
  const [streamTab, setStreamTab] = useState('watched')

  // Load the user's Purpose Piece result (if any)
  const { user } = useAuth()
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) { setPpLoading(false); setPurposePiece(null); return }
      const { data } = await supabase
        .from('purpose_piece_results')
        .select('profile, archetype, domain, scale, status, completed_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      setPurposePiece(data || null)
      setPpLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  const hasPurposePiece = !!(purposePiece && (purposePiece.status === 'complete' || purposePiece.completed_at))

  if (focusLoading || ppLoading) return null

  return (
    <div style={{ ...body, color: INK }}>

      {/* ── ANCHOR ZONE ─────────────────────────────────────── */}
      <AnchorZone
        focus={focus}
        hasFocus={hasFocus}
        purposePiece={purposePiece}
        hasPurposePiece={hasPurposePiece}
        editingFocus={editingFocus}
        onStartEditFocus={() => setEditingFocus(true)}
        onStopEditFocus={() => setEditingFocus(false)}
        onClearFocus={clear}
        onGoToPurposePiece={() => navigate('/tools/purpose-piece')}
      />

      {/* ── STREAMS ZONE ────────────────────────────────────── */}
      {hasFocus && !editingFocus && (
        <StreamsZone
          streamTab={streamTab}
          setStreamTab={setStreamTab}
        />
      )}
    </div>
  )
}

// ── Anchor ────────────────────────────────────────────────────────────────

function AnchorZone({
  focus, hasFocus,
  purposePiece, hasPurposePiece,
  editingFocus, onStartEditFocus, onStopEditFocus, onClearFocus,
  onGoToPurposePiece,
}) {
  // If user is editing focus, the entire anchor zone becomes the editor.
  if (editingFocus) {
    return (
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
          <div style={{
            ...sc, fontSize: '10.5px', letterSpacing: '0.20em',
            color: GOLD, textTransform: 'uppercase',
          }}>
            Editing focus
          </div>
          <button
            type="button"
            onClick={onStopEditFocus}
            style={editLinkStyle}
          >
            Done
          </button>
        </div>
        <ActiveFocusPrompt initiallyOpen bare />
      </div>
    )
  }

  // If neither is set, show the empty-state stack: PP CTA then Focus prompt
  if (!hasPurposePiece && !hasFocus) {
    return (
      <div>
        <PurposePieceCTA onClick={onGoToPurposePiece} />
        <SectionDivider />
        <ActiveFocusPrompt initiallyOpen bare />
      </div>
    )
  }

  // If PP not done but focus is: show PP CTA at top, then focus summary
  if (!hasPurposePiece && hasFocus) {
    return (
      <div>
        <PurposePieceCTA onClick={onGoToPurposePiece} />
        <SectionDivider />
        <FocusSummary
          focus={focus}
          onEdit={onStartEditFocus}
          onClear={onClearFocus}
        />
      </div>
    )
  }

  // If PP done but no focus: show PP summary at top, then focus prompt
  if (hasPurposePiece && !hasFocus) {
    return (
      <div>
        <PurposePieceSummary pp={purposePiece} onEdit={onGoToPurposePiece} />
        <SectionDivider />
        <ActiveFocusPrompt initiallyOpen bare />
      </div>
    )
  }

  // Both set — combined anchor block
  return (
    <CombinedAnchor
      focus={focus}
      pp={purposePiece}
      onEditFocus={onStartEditFocus}
      onEditPurposePiece={onGoToPurposePiece}
    />
  )
}

// ── Combined Anchor: one block, both inside ──────────────────────────────

function CombinedAnchor({ focus, pp, onEditFocus, onEditPurposePiece }) {
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

  const participationLabels = (focus.participation || []).map(p =>
    PARTICIPATION_LABEL[p] || p
  )

  // Purpose Piece content
  const archetype = pp?.archetype || pp?.profile?.archetype || null
  const ppDomain  = pp?.domain    || pp?.profile?.domain    || null
  const ppScale   = pp?.scale     || pp?.profile?.scale     || null
  const ppDomainLabel = ppDomain
    ? (DOMAINS.find(d => d.slug === ppDomain)?.label || ppDomain)
    : null

  return (
    <div style={{
      padding: '20px 22px',
      background: 'rgba(200,146,42,0.04)',
      border: '1px solid rgba(200,146,42,0.25)',
      borderRadius: '10px',
      marginBottom: '24px',
    }}>
      <div style={{
        ...sc, fontSize: '10.5px', letterSpacing: '0.20em',
        color: GOLD, textTransform: 'uppercase', marginBottom: '14px',
      }}>
        Your anchor
      </div>

      {/* Purpose Piece line */}
      {(archetype || ppDomainLabel) && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Who you are
          </div>
          <div style={{ fontSize: '15px', lineHeight: 1.55 }}>
            {archetype && <span>{archetype}</span>}
            {archetype && ppDomainLabel && <span style={{ color: 'rgba(15,21,35,0.50)' }}> · </span>}
            {ppDomainLabel && <span>{ppDomainLabel}</span>}
            {ppScale && <span style={{ color: 'rgba(15,21,35,0.50)' }}> · </span>}
            {ppScale && <span style={{ textTransform: 'capitalize' }}>{ppScale}</span>}
            {'  '}
            <button type="button" onClick={onEditPurposePiece} style={editLinkInlineStyle}>
              Edit Purpose Piece
            </button>
          </div>
        </div>
      )}

      {/* Focus line */}
      <div>
        <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '4px' }}>
          What you&rsquo;re centring on
        </div>
        <div style={{ fontSize: '15px', lineHeight: 1.55 }}>
          {places.length > 0 && (
            <span>{places.map(p => p.name).join(', ')}</span>
          )}
          {places.length > 0 && (domainLabels.length > 0 || actors.length > 0) && (
            <span style={{ color: 'rgba(15,21,35,0.50)' }}> · </span>
          )}
          {domainLabels.length > 0 && (
            <span>{domainLabels.join(', ')}</span>
          )}
          {domainLabels.length > 0 && actors.length > 0 && (
            <span style={{ color: 'rgba(15,21,35,0.50)' }}> · </span>
          )}
          {actors.length > 0 && (
            <span>{actors.map(a => a.name).join(', ')}</span>
          )}
          {participationLabels.length > 0 && (
            <>
              <span style={{ color: 'rgba(15,21,35,0.50)' }}> · </span>
              <span style={{ fontStyle: 'italic', color: 'rgba(15,21,35,0.72)' }}>
                {participationLabels.join(', ')}
              </span>
            </>
          )}
          {'  '}
          <button type="button" onClick={onEditFocus} style={editLinkInlineStyle}>
            Edit Focus
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Solo summaries (when only one of PP/Focus is set) ────────────────────

function PurposePieceSummary({ pp, onEdit }) {
  const archetype = pp?.archetype || pp?.profile?.archetype || null
  const ppDomain  = pp?.domain    || pp?.profile?.domain    || null
  const ppScale   = pp?.scale     || pp?.profile?.scale     || null
  const ppDomainLabel = ppDomain
    ? (DOMAINS.find(d => d.slug === ppDomain)?.label || ppDomain)
    : null

  return (
    <div style={{
      padding: '20px 22px',
      background: 'rgba(200,146,42,0.04)',
      border: '1px solid rgba(200,146,42,0.25)',
      borderRadius: '10px',
      marginBottom: '0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <div style={{
          ...sc, fontSize: '10.5px', letterSpacing: '0.20em',
          color: GOLD, textTransform: 'uppercase',
        }}>
          Your placement
        </div>
        <button type="button" onClick={onEdit} style={editLinkStyle}>
          Edit Purpose Piece
        </button>
      </div>
      <div style={{ fontSize: '15px', lineHeight: 1.55 }}>
        {archetype && <span>{archetype}</span>}
        {archetype && ppDomainLabel && <span style={{ color: 'rgba(15,21,35,0.50)' }}> · </span>}
        {ppDomainLabel && <span>{ppDomainLabel}</span>}
        {ppScale && <span style={{ color: 'rgba(15,21,35,0.50)' }}> · </span>}
        {ppScale && <span style={{ textTransform: 'capitalize' }}>{ppScale}</span>}
      </div>
    </div>
  )
}

function FocusSummary({ focus, onEdit, onClear }) {
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

  const participationLabels = (focus.participation || []).map(p =>
    PARTICIPATION_LABEL[p] || p
  )

  return (
    <div style={{
      padding: '20px 22px',
      background: 'rgba(200,146,42,0.04)',
      border: '1px solid rgba(200,146,42,0.25)',
      borderRadius: '10px',
      marginBottom: '0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <div style={{
          ...sc, fontSize: '10.5px', letterSpacing: '0.20em',
          color: GOLD, textTransform: 'uppercase',
        }}>
          Your focus
        </div>
        <button type="button" onClick={onEdit} style={editLinkStyle}>
          Edit Focus
        </button>
      </div>
      <div style={{ fontSize: '15px', lineHeight: 1.55 }}>
        {places.length > 0 && <span>{places.map(p => p.name).join(', ')}</span>}
        {places.length > 0 && (domainLabels.length > 0 || actors.length > 0) && (
          <span style={{ color: 'rgba(15,21,35,0.50)' }}> · </span>
        )}
        {domainLabels.length > 0 && <span>{domainLabels.join(', ')}</span>}
        {domainLabels.length > 0 && actors.length > 0 && (
          <span style={{ color: 'rgba(15,21,35,0.50)' }}> · </span>
        )}
        {actors.length > 0 && <span>{actors.map(a => a.name).join(', ')}</span>}
        {participationLabels.length > 0 && (
          <>
            <span style={{ color: 'rgba(15,21,35,0.50)' }}> · </span>
            <span style={{ fontStyle: 'italic', color: 'rgba(15,21,35,0.72)' }}>
              {participationLabels.join(', ')}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// ── CTAs ─────────────────────────────────────────────────────────────────

function PurposePieceCTA({ onClick }) {
  return (
    <div style={{
      padding: '18px 22px',
      background: 'rgba(200,146,42,0.04)',
      border: '1px dashed rgba(200,146,42,0.35)',
      borderRadius: '10px',
      marginBottom: '0',
    }}>
      <div style={{
        ...sc, fontSize: '10.5px', letterSpacing: '0.20em',
        color: GOLD, textTransform: 'uppercase', marginBottom: '6px',
      }}>
        Start here
      </div>
      <p style={{ ...body, fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px', color: INK }}>
        Take the Purpose Piece. It places you on the wheel and helps the rest
        of the platform meet you where you are.
      </p>
      <button type="button" onClick={onClick} style={primaryPillStyle}>
        Start Purpose Piece
      </button>
    </div>
  )
}

function SectionDivider() {
  return (
    <div style={{
      borderTop: '1px dashed rgba(200,146,42,0.20)',
      margin: '20px 0',
    }} />
  )
}

// ── Streams Zone ──────────────────────────────────────────────────────────

function StreamsZone({ streamTab, setStreamTab }) {
  return (
    <div>
      <div style={{ ...sc, fontSize: '10.5px', letterSpacing: '0.20em', color: GOLD, textTransform: 'uppercase', marginBottom: '12px' }}>
        What&rsquo;s relevant to you
      </div>
      <FilterRow value={streamTab} onChange={setStreamTab} />
      <div style={{ marginTop: '20px' }}>
        {(streamTab === 'watched' || streamTab === 'all') && <WatchedSection />}
        {(streamTab === 'curated' || streamTab === 'all') && <CuratedSection />}
        {(streamTab === 'focus'   || streamTab === 'all') && <FocusSection />}
      </div>
    </div>
  )
}

function FilterRow({ value, onChange }) {
  const tabs = [
    { id: 'watched', label: 'Tuned In' },
    { id: 'curated', label: 'Curated'  },
    { id: 'focus',   label: 'Focus'    },
    { id: 'all',     label: 'All'      },
  ]
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {tabs.map(t => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              padding: '7px 14px',
              borderRadius: '30px',
              cursor: 'pointer',
              border: `1px solid ${active ? GOLD_LIGHT : 'rgba(200,146,42,0.30)'}`,
              background: active ? GOLD_LIGHT : 'transparent',
              color: active ? '#FFFFFF' : GOLD,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Watched section ──────────────────────────────────────────────────────

function WatchedSection() {
  const navigate = useNavigate()
  const viewerCtx = useViewerContext()
  const { items, loading } = useFocusFeed('watched', viewerCtx)

  return (
    <SectionFrame
      title="Tuned In"
      onSeeAll={() => navigate('/tuned-in')}
      seeAllLabel="See full Tuned In feed →"
    >
      {loading && <SectionMessage>Loading&hellip;</SectionMessage>}
      {!loading && (!items || items.length === 0) && (
        <SectionMessage>
          You aren&rsquo;t tuned in to anything yet, or the channels
          you&rsquo;re tuned in to have been quiet. Open any actor or person
          profile and tap Tune in.
        </SectionMessage>
      )}
      {!loading && items && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.slice(0, PANEL_FEED_LIMIT).map(item => (
            <FeedItem key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </SectionFrame>
  )
}

// ── Curated placeholder ──────────────────────────────────────────────────

function CuratedSection() {
  const navigate = useNavigate()
  return (
    <SectionFrame
      title="Curated"
      onSeeAll={() => navigate('/curated')}
      seeAllLabel="See full Curated feed →"
    >
      <SectionMessage>
        Your roster&rsquo;s signal. Focus-aware ranking coming online soon.
      </SectionMessage>
    </SectionFrame>
  )
}

// ── Focus placeholder ────────────────────────────────────────────────────

function FocusSection() {
  const navigate = useNavigate()
  return (
    <SectionFrame
      title="Focus"
      onSeeAll={() => navigate('/focus')}
      seeAllLabel="Browse FocusIndex →"
    >
      <SectionMessage>
        Anything across the platform that matches your places, domains, and
        actors. The dedicated stream is coming online soon.
      </SectionMessage>
    </SectionFrame>
  )
}

// ── Section frame ────────────────────────────────────────────────────────

function SectionFrame({ title, onSeeAll, seeAllLabel, children }) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
        <h3 style={{
          ...display, fontSize: '18px', fontWeight: 400,
          color: INK, margin: 0,
        }}>
          {title}
        </h3>
        <button type="button" onClick={onSeeAll} style={editLinkStyle}>
          {seeAllLabel}
        </button>
      </div>
      {children}
    </section>
  )
}

function SectionMessage({ children }) {
  return (
    <p style={{
      ...body, fontSize: '14px', lineHeight: 1.65,
      color: 'rgba(15,21,35,0.62)', margin: 0,
      padding: '12px 14px',
      background: 'rgba(15,21,35,0.02)',
      border: '1px solid rgba(15,21,35,0.06)',
      borderRadius: '8px',
    }}>
      {children}
    </p>
  )
}

// ── shared styles ────────────────────────────────────────────────────────

const editLinkStyle = {
  ...sc, fontSize: '10.5px', letterSpacing: '0.16em',
  color: GOLD, background: 'none', border: 'none',
  cursor: 'pointer', textTransform: 'uppercase', padding: 0,
}

const editLinkInlineStyle = {
  ...sc, fontSize: '10px', letterSpacing: '0.14em',
  color: GOLD, background: 'none', border: 'none',
  cursor: 'pointer', textTransform: 'uppercase', padding: 0,
  marginLeft: '6px',
}

const primaryPillStyle = {
  ...sc, fontSize: '11px', letterSpacing: '0.18em',
  color: '#FFFFFF', background: GOLD_LIGHT,
  border: 'none', borderRadius: '30px',
  padding: '9px 22px', cursor: 'pointer',
  textTransform: 'uppercase',
}
