// src/app/pages/MissionControlNext.jsx
//
// RESHAPE PREVIEW · isolated, additive, non-destructive.
//
// This is a preview of the "one loop, held at two scales" home reshape
// (see NextUs_Restructure_Blueprint.md §3). It does NOT replace the live
// Mission Control. It is mounted on its own route (/next) so it can be
// deployed and tested live against real data without touching the baseline.
//
// It reuses REAL components — HorizonBanner (Beat 1), GlanceWheel + the
// Fuller/star WorldMapSubstrate (Beat 2), and a single solid door (Beat 3) —
// arranged top-to-bottom as Horizon -> Now -> Next step. Every data-reading
// section is wrapped in a section-level error boundary and every derivation
// is guarded, so a data hiccup degrades that one panel instead of blanking
// the page.
//
// Field Notes rail (personal / daylight). The pole toggle shows where the
// civilisational scale plugs in; the personal side is fully wired to live data.

import { Component, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { fn, space } from '../../lib/designTokens'
import useMissionControlData from '../components/mission-control/useMissionControlData'
import HorizonBanner from '../components/mission-control/HorizonBanner'
import GlanceWheel from '../components/mission-control/GlanceWheel'
import WorldMapSubstrate from '../components/mission-control/WorldMapSubstrate'
import { SELF_DOMAINS } from '../../components/self-explorer/selfData'

const display = { fontFamily: "'Lora', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const mono    = { fontFamily: "'Cormorant SC', Georgia, serif" }

// ── Section-level error boundary — contains a failure to one beat ──
class Guard extends Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (this.state.err) {
      return (
        <div style={{ ...mono, fontSize: 13, color: 'rgba(38,36,32,0.55)', padding: '18px 4px' }}>
          this panel could not load · the rest of the page is unaffected
        </div>
      )
    }
    return this.props.children
  }
}

// dimensions GlanceWheel expects: { key, label } keyed by domain id
const DIMENSIONS = (SELF_DOMAINS || []).map(d => ({ key: d.id, label: d.name })).slice(0, 7)

// Derive { current, horizons } from the horizon_profile rows, defensively.
// GlanceWheel uses ratio = current/horizon, so units don't matter; missing
// values simply render as an empty spoke.
function deriveScores(mapData) {
  const current = {}, horizons = {}
  try {
    for (const row of (mapData || [])) {
      const k = row?.domain
      if (!k) continue
      const h = row?.horizon_score ?? row?.horizonScore
      const c = row?.current_score ?? row?.currentScore ?? row?.map_score ?? row?.score
      if (h != null) horizons[k] = h
      if (c != null) current[k] = c
    }
  } catch { /* fall through to empty */ }
  return { current, horizons }
}

const BeatLabel = ({ children }) => (
  <div style={{ ...mono, fontSize: 13, letterSpacing: '0.22em', textTransform: 'uppercase',
    color: 'rgba(38,36,32,0.55)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
    <span style={{ color: fn.moss }}>●</span> {children}
  </div>
)

const cardStyle = (attention = false) => ({
  background: fn.object, borderRadius: 4, padding: '24px 26px', marginBottom: 30,
  borderTop: `3px solid ${attention ? fn.clay : fn.moss}`,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)', position: 'relative',
})

export default function MissionControlNext() {
  const { user } = useAuth()
  const data = useMissionControlData()
  const [scale, setScale] = useState('life')

  const { current, horizons } = useMemo(() => deriveScores(data?.mapData), [data?.mapData])
  const hasMap = Object.keys(horizons).length > 0

  // one solid door, chosen by state (guarded, never throws)
  const door = !user
    ? { to: '/login', sub: 'start here', title: 'Sign in to pick up your loop' }
    : !hasMap
      ? { to: '/nextu/map', sub: 'chosen by state · the single solid move', title: 'Find where you stand · the Map' }
      : data?.practiceData
        ? { to: '/today', sub: 'chosen by state · the single solid move', title: "Continue today's practice" }
        : { to: '/today', sub: 'chosen by state · the single solid move', title: 'Take your next step today' }

  return (
    <div style={{ minHeight: '100dvh', background: fn.ground, color: fn.ink, paddingBottom: 90 }}>
      {/* Brand bar */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '18px 22px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...display, fontSize: 22, fontWeight: 500 }}>NextUs</span>
        <span style={{ ...mono, fontSize: 13, letterSpacing: '0.12em', color: 'rgba(38,36,32,0.5)' }}>
          reshape preview · /next
        </span>
      </div>

      {/* Pole toggle — the fractal */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <div style={{ display: 'inline-flex', border: `1.5px solid ${fn.moss}`, borderRadius: 40, padding: 4, gap: 2 }}>
          {['life', 'planet'].map(s => (
            <button key={s} onClick={() => setScale(s)} style={{ ...mono, fontSize: 13, letterSpacing: '0.14em',
              textTransform: 'uppercase', border: 'none', borderRadius: 40, padding: '8px 20px', cursor: 'pointer',
              background: scale === s ? fn.moss : 'transparent', color: scale === s ? fn.ground : fn.ink,
              opacity: scale === s ? 1 : 0.55 }}>
              {s === 'life' ? 'My Life' : 'Our Planet'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'center', ...mono, fontSize: 13, letterSpacing: '0.1em',
        color: 'rgba(38,36,32,0.5)', marginBottom: 26 }}>
        the fractal · one loop, two scales · as above, so below
      </div>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '0 22px' }}>
        {scale === 'life' ? (
          <>
            {/* BEAT 1 · HORIZON */}
            <BeatLabel>Horizon · where you want to be</BeatLabel>
            <div style={cardStyle()}>
              <Guard><HorizonBanner userId={user?.id} /></Guard>
            </div>

            {/* BEAT 2 · NOW — the wheel on its Fuller/star substrate */}
            <BeatLabel>Now · where you are &nbsp;·&nbsp; the wheel is the domain navigator</BeatLabel>
            <div style={{ ...cardStyle(), display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 230, height: 230, flex: '0 0 auto', margin: '0 auto' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
                  <Guard><WorldMapSubstrate /></Guard>
                </div>
                <div style={{ position: 'relative' }}>
                  <Guard>
                    <GlanceWheel dimensions={DIMENSIONS} current={current} horizons={horizons} size={230} />
                  </Guard>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ ...mono, fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: 'rgba(38,36,32,0.55)', marginBottom: 6 }}>Your seven domains</div>
                <div style={{ ...body, fontSize: 15, lineHeight: 1.6, color: 'rgba(38,36,32,0.72)' }}>
                  {hasMap
                    ? 'A glance at where you stand across the seven — each spoke reaching toward its horizon. Tap into the Map for the full picture.'
                    : 'Your Map is not filled in yet. The wheel fills as you place yourself across the seven domains.'}
                </div>
                <Link to="/nextu/map" style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: fn.ink,
                  opacity: 0.7, textDecoration: 'none', borderBottom: `1px dashed rgba(38,36,32,0.2)`,
                  display: 'inline-block', marginTop: 14 }}>open the Map →</Link>
              </div>
            </div>

            {/* BEAT 3 · YOUR NEXT STEP — one solid door */}
            <BeatLabel>Your next step · the one move from here</BeatLabel>
            <div style={cardStyle(true)}>
              <Link to={door.to} style={{ ...display, display: 'block', textDecoration: 'none',
                background: fn.moss, color: fn.ground, fontSize: 20, borderRadius: 4, padding: '20px 24px' }}>
                <span style={{ ...mono, display: 'block', fontSize: 13, letterSpacing: '0.14em',
                  textTransform: 'uppercase', opacity: 0.8, marginBottom: 8 }}>{door.sub}</span>
                {door.title} <span style={{ float: 'right' }}>→</span>
              </Link>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16 }}>
                {[['/nextu/map', 'the Map'], ['/today', "today's practice"], ['/challenges', 'a challenge to join']].map(([to, label]) => (
                  <Link key={to} to={to} style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: fn.ink,
                    opacity: 0.6, textDecoration: 'none', borderBottom: '1px dashed rgba(38,36,32,0.2)' }}>{label}</Link>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ── Our Planet · same three beats, civilisational scale ── */
          <>
            <BeatLabel>Horizon · where we want to be</BeatLabel>
            <div style={cardStyle()}>
              <div style={{ ...display, fontSize: 24, lineHeight: 1.35 }}>
                The seven domain Horizon Goals — the shared future each domain is moving toward.
              </div>
              <Link to="/atlas/goals" style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: fn.ink,
                opacity: 0.7, textDecoration: 'none', borderBottom: '1px dashed rgba(38,36,32,0.2)',
                display: 'inline-block', marginTop: 14 }}>read the domain horizons →</Link>
            </div>

            <BeatLabel>Now · where we are</BeatLabel>
            <div style={cardStyle()}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
                {(SELF_DOMAINS || []).slice(0, 7).map(d => (
                  <Link key={d.id} to={`/domain/${d.civilisational ? d.civilisational.toLowerCase() : d.id}`}
                    style={{ ...mono, fontSize: 13, letterSpacing: '0.08em', textDecoration: 'none',
                      color: fn.ink, opacity: 0.75, borderLeft: `2px solid ${fn.moss}`, paddingLeft: 10 }}>
                    {d.civilisational || d.name}
                  </Link>
                ))}
              </div>
            </div>

            <BeatLabel>Your next step · the one move from here</BeatLabel>
            <div style={cardStyle(true)}>
              <Link to="/challenges/browse" style={{ ...display, display: 'block', textDecoration: 'none',
                background: fn.moss, color: fn.ground, fontSize: 20, borderRadius: 4, padding: '20px 24px' }}>
                <span style={{ ...mono, display: 'block', fontSize: 13, letterSpacing: '0.14em',
                  textTransform: 'uppercase', opacity: 0.8, marginBottom: 8 }}>chosen by state · the single solid move</span>
                Join a challenge already in motion <span style={{ float: 'right' }}>→</span>
              </Link>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16 }}>
                {[['/asks/new', 'post an ask'], ['/map', 'the planet map'], ['/feed', 'act with an actor']].map(([to, label]) => (
                  <Link key={to} to={to} style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: fn.ink,
                    opacity: 0.6, textDecoration: 'none', borderBottom: '1px dashed rgba(38,36,32,0.2)' }}>{label}</Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* THE FEED — featured, framed by the four invisible categories */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }}>
          <BeatLabel>The feed</BeatLabel>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: 'rgba(38,36,32,0.5)' }}>people at your scale</span>
        </div>
        <div style={cardStyle()}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {['Horizon goals', 'Where we are now', 'What we need', "What we're doing"].map(c => (
              <span key={c} style={{ ...mono, fontSize: 13, letterSpacing: '0.08em', padding: '6px 12px',
                borderRadius: 40, border: '1.5px dashed rgba(38,36,32,0.2)', color: 'rgba(38,36,32,0.65)' }}>{c}</span>
            ))}
          </div>
          <div style={{ ...body, fontSize: 15, color: 'rgba(38,36,32,0.72)', lineHeight: 1.6, marginTop: 8 }}>
            The feed, sorted by the four framings of the loop — horizon goals, where we are now, what we need, what we're doing.
          </div>
          <Link to="/feed" style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: fn.ink, opacity: 0.7,
            textDecoration: 'none', borderBottom: '1px dashed rgba(38,36,32,0.2)', display: 'inline-block', marginTop: 14 }}>
            open the feed →
          </Link>
        </div>

        <div style={{ ...mono, fontSize: 13, letterSpacing: '0.06em', color: 'rgba(38,36,32,0.4)',
          lineHeight: 1.7, marginTop: 18 }}>
          Preview route · does not replace the live home (/). Reuses your real components and live data,
          arranged as the loop. Behavioural cuts (welcome/feed/route collapse) are deliberately not wired here.
        </div>
      </main>
    </div>
  )
}
