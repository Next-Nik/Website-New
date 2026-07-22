// ─────────────────────────────────────────────────────────────
// PulseStrip.jsx — the heartbeat of the ecosystem, made visible
//
// One strip that answers "is anyone out there?" with data the
// platform already computes. Three layers:
//
//   1. The numbers — actors active (effort signal, cron-fed),
//      people in the work (aggregate-public per the honesty
//      locks), new on the map this week.
//   2. The ticker — the live tracker of platform activity
//      (nextus_platform_activity). Empty at launch by design:
//      the empty state is honest and forward-facing, and the
//      ticker fills as the ecosystem moves.
//   3. Nothing else. The pulse is ambience — it never asks for
//      anything and never blocks anything.
//
// Privacy: every number here is an aggregate; every ticker line
// names only public entities or anonymous motion ("Someone tuned
// in to Nature"). The activity table structurally cannot name the
// acting user — it has no user column.
//
// Props:
//   variant — 'light' (parchment surfaces: PlanetMap) |
//             'dark'  (reserved for dark surfaces)
//   compact — fewer ticker lines (Mission Control placement)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'

const sc      = { fontFamily: "'IBM Plex Mono', Georgia, serif" }
const body    = { fontFamily: "'Newsreader', Georgia, serif" }
const display = { fontFamily: "'Fraunces', Georgia, serif" }
const GOLD    = '#262420'
const INK     = '#0F1523'

// ── data ─────────────────────────────────────────────────────
export function usePulse() {
  const [pulse, setPulse] = useState({
    loading: true,
    activeActors: null,
    peopleInTheWork: null,
    newThisWeek: null,
    activity: [],
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const weekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString()
      try {
        const [signalRes, newRes, activityRes] = await Promise.all([
          // latest civ snapshot — sum across the seven domains
          supabase
            .from('nextus_effort_signal_daily')
            .select('snapshot_date, domain, active_actors, total_people_in_the_work')
            .eq('domain_track', 'civ')
            .order('snapshot_date', { ascending: false })
            .limit(7),
          supabase
            .from('nextus_actors')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'live')
            .gte('created_at', weekAgo),
          supabase
            .from('nextus_platform_activity')
            .select('id, event_type, subject_type, subject_name, subject_slug, domain, detail, created_at')
            .order('created_at', { ascending: false })
            .limit(12),
        ])
        if (cancelled) return

        let activeActors = null
        let peopleInTheWork = null
        const rows = signalRes.data || []
        if (rows.length) {
          const latest = rows[0].snapshot_date
          const todays = rows.filter(r => r.snapshot_date === latest)
          activeActors    = todays.reduce((s, r) => s + (r.active_actors || 0), 0)
          peopleInTheWork = todays.reduce((s, r) => s + (r.total_people_in_the_work || 0), 0)
        }

        setPulse({
          loading: false,
          activeActors,
          peopleInTheWork,
          newThisWeek: newRes.count ?? null,
          activity: activityRes.data || [],
        })
      } catch {
        if (!cancelled) setPulse(p => ({ ...p, loading: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return pulse
}

// ── ticker line copy ─────────────────────────────────────────
const DOMAIN_NAMES = {
  'human-being': 'Human Being', society: 'Society', nature: 'Nature',
  technology: 'Technology', 'finance-economy': 'Economy',
  legacy: 'Legacy', vision: 'Vision',
}

function tickerLine(a) {
  const where = a.domain && DOMAIN_NAMES[a.domain] ? ` · ${DOMAIN_NAMES[a.domain]}` : ''
  switch (a.event_type) {
    case 'actor_added':     return `New on the map: ${a.subject_name || 'an actor'}${where}`
    case 'practice_added':  return `A practice was contributed: ${a.subject_name || 'untitled'}${where}`
    case 'tune_in':         return `Someone tuned in to ${a.subject_name || 'the work'}`
    case 'need_posted':     return `${a.subject_name || 'An actor'} posted a need${where}`
    case 'event_published': return `Event published: ${a.subject_name || ''}${where}`
    case 'step_forward':    return `Someone stepped forward${a.subject_name ? ` for ${a.subject_name}` : ''}`
    case 'listing_added':   return `New in NextMarket: ${a.subject_name || ''}`
    default:                return a.detail || ''
  }
}

function relTime(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 3600)        return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400)       return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7)   return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── pieces ───────────────────────────────────────────────────
function Stat({ value, label, dark }) {
  if (value == null) return null
  return (
    <div style={{ minWidth: '110px' }}>
      <div style={{ ...display, fontSize: 'clamp(26px,3vw,34px)', fontWeight: 300, color: dark ? '#FAFAF7' : INK, lineHeight: 1 }}>
        {Number(value).toLocaleString()}
      </div>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: dark ? 'rgba(250,250,247,0.55)' : 'rgba(15,21,35,0.55)', marginTop: '5px' }}>
        {label}
      </div>
    </div>
  )
}

// ── the strip ────────────────────────────────────────────────
export function PulseStrip({ compact = false, dark = false }) {
  const p = usePulse()
  if (p.loading) return null

  const hasNumbers = p.activeActors != null || p.peopleInTheWork != null || p.newThisWeek != null
  const lines = (p.activity || []).slice(0, compact ? 4 : 8)

  return (
    <section
      aria-label="The pulse — ecosystem activity"
      style={{
        border: '1px solid rgba(76,107,69,0.20)',
        borderRadius: '10px',
        padding: compact ? '18px 20px' : '22px 24px',
        background: 'rgba(76,107,69,0.04)',
      }}
    >
      <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em', color: dark ? '#6E7F5C' : GOLD }}>
        THE PULSE · THIS WEEK ON YOUR PLANET
      </div>

      {hasNumbers && (
        <div style={{ display: 'flex', gap: 'clamp(22px,4vw,44px)', flexWrap: 'wrap', marginTop: '16px' }}>
          <Stat dark={dark} value={p.activeActors}    label="ACTORS ACTIVE" />
          <Stat dark={dark} value={p.peopleInTheWork} label="PEOPLE IN THE WORK" />
          <Stat dark={dark} value={p.newThisWeek}     label="NEW THIS WEEK" />
        </div>
      )}

      {/* the live tracker */}
      <div style={{ marginTop: hasNumbers ? '18px' : '14px', borderTop: '1px solid rgba(76,107,69,0.14)', paddingTop: '14px' }}>
        {lines.length === 0 ? (
          <p style={{ ...body, fontSize: '14px', color: dark ? 'rgba(250,250,247,0.55)' : 'rgba(15,21,35,0.55)', margin: 0, lineHeight: 1.6 }}>
            The pulse starts here. Every actor that joins the map, every practice
            contributed, every tune-in shows up as motion — this is where the
            ecosystem becomes visible.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lines.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '14px' }}>
                <span style={{ ...body, fontSize: '14px', color: dark ? 'rgba(250,250,247,0.72)' : 'rgba(15,21,35,0.72)', lineHeight: 1.5 }}>
                  {tickerLine(a)}
                </span>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: dark ? 'rgba(250,250,247,0.55)' : 'rgba(15,21,35,0.55)', whiteSpace: 'nowrap' }}>
                  {relTime(a.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default PulseStrip
