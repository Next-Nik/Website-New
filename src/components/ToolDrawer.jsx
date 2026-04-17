import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../hooks/useSupabase'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const TOOLS = [
  {
    key:   'foundation',
    label: 'Horizon State',
    subtitle: 'Capacity infrastructure',
    path:  '/tools/foundation',
    desc:  'Regulated baseline. The floor beneath everything.',
    color: '#A8721A',
  },
  {
    key:   'map',
    label: 'The Map',
    subtitle: "See where you are. Set where you're going.",
    path:  '/tools/map',
    desc:  'Seven domains. An honest read of where you are.',
    color: '#5A8AB8',
  },
  {
    key:   'purpose-piece',
    label: 'Purpose Piece',
    subtitle: 'Your role, your domain, your scale',
    path:  '/tools/purpose-piece',
    desc:  'Your contribution archetype, domain, and scale.',
    color: '#A8721A',
  },
  {
    key:   'target-goals',
    label: 'Target Sprint',
    subtitle: '90-day focused goal plan',
    path:  '/tools/target-goals',
    desc:  'Ninety days. Three areas. A clear level-up.',
    color: '#2D6A4F',
  },
  {
    key:   'expansion',
    label: 'Horizon Practice',
    subtitle: 'Daily practice',
    path:  '/tools/expansion',
    desc:  'The daily return. T.E.A. practice, skill development, and thought loop work.',
    color: '#A8721A',
  },
]

const NEXTUS_PLATFORM = [
  {
    key:      'actors',
    label:    'Orgs in the Field',
    subtitle: 'Who is doing the work',
    path:     '/nextus/actors',
    desc:     'Organisations, projects, and individuals placed on the map — by domain, by scale, by what they need.',
  },
  {
    key:      'map',
    label:    'The Map',
    subtitle: 'Where the work is happening',
    path:     '/nextus/map',
    desc:     'Every actor placed geographically. The answer to a problem in one place may already exist somewhere else on this map.',
  },
  {
    key:      'domains',
    label:    'Domains',
    subtitle: 'Seven civilisational domains',
    path:     '/nextus',
    desc:     'A living map of where humanity is trying to go — across seven domains, at every scale.',
  },
  {
    key:      'nominate',
    label:    'Nominate',
    subtitle: 'Add an actor to the map',
    path:     '/nextus/nominate',
    desc:     'Know an organisation doing important work? Place them on the map.',
  },
]

const DISCOVER = [
  { label: 'Work with Nik', path: '/work-with-nik' },
  { label: 'Podcast',       path: '/podcast' },
  { label: 'About',         path: '/about' },
]

function StatusPill({ status }) {
  if (!status) return null
  const cfg = {
    started:  { label: 'Started',     color: '#A8721A', bg: 'rgba(200,146,42,0.08)' },
    active:   { label: 'In progress', color: '#A8721A', bg: 'rgba(200,146,42,0.08)' },
    complete: { label: 'Complete',    color: '#2D6A4F', bg: 'rgba(45,106,79,0.10)'  },
  }[status] || { label: status, color: '#A8721A', bg: 'rgba(200,146,42,0.08)' }
  return (
    <span style={{
      ...sc, fontSize: '15px', letterSpacing: '0.14em', textTransform: 'uppercase',
      color: cfg.color, background: cfg.bg,
      borderRadius: '40px', padding: '2px 8px', flexShrink: 0,
    }}>{cfg.label}</span>
  )
}

function useToolStatuses(user) {
  const [statuses, setStatuses] = useState({})
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!user || loadedRef.current) return
    loadedRef.current = true

    async function load() {
      try {
        const [mapRes, ppRes, sprintRes, foundationRes] = await Promise.all([
          supabase.from('map_results')
            .select('complete, phase')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1).maybeSingle(),
          supabase.from('purpose_piece_results')
            .select('status, session')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1).maybeSingle(),
          supabase.from('target_goal_sessions')
            .select('status')
            .eq('user_id', user.id)
            .in('status', ['started', 'active', 'complete'])
            .order('updated_at', { ascending: false })
            .limit(1).maybeSingle(),
          supabase.from('foundation_summary')
            .select('sessions_total, last_session_at')
            .eq('user_id', user.id)
            .maybeSingle(),
        ])

        const s = {}

        if (mapRes.data) {
          s.map = (mapRes.data.complete || mapRes.data.phase === 'complete') ? 'complete' : 'active'
        }
        if (ppRes.data?.status) {
          // Complete if status flag is set, OR all 3 stage transcripts exist (answered all questions)
          const ppSession = ppRes.data.session
          const allStagesDone = ppSession?.archetypeTranscript?.length >= 5 &&
                                ppSession?.domainTranscript?.length >= 3 &&
                                ppSession?.scaleTranscript?.length >= 3
          s['purpose-piece'] = (ppRes.data.status === 'complete' || allStagesDone) ? 'complete' : 'active'
        }
        if (sprintRes.data?.status) {
          s['target-goals'] = sprintRes.data.status === 'active' ? 'active' : sprintRes.data.status
        }
        if (foundationRes.data?.sessions_total > 0) {
          const last = foundationRes.data.last_session_at?.slice(0, 10)
          const today = new Date().toISOString().slice(0, 10)
          s.foundation = last === today ? 'complete' : 'active'
        }

        setStatuses(s)
      } catch {}
    }
    load()
  }, [user])

  return statuses
}

export function ToolDrawer({ open, onClose }) {
  const { user } = useAuth()
  const statuses = useToolStatuses(user)
  const navigate = useNavigate()
  const overlayRef = useRef(null)

  // Logged-out → Life OS page anchor for that tool
  // Logged-in  → directly into the tool
  function toolHref(tool) {
    return user ? tool.path : `/nextus-self#${tool.key}`
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(15,21,35,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'drawerFadeIn 0.2s ease both',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 1101,
        background: 'rgba(250,250,247,0.98)',
        borderBottom: '1px solid rgba(200,146,42,0.20)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        animation: 'drawerSlideDown 0.25s cubic-bezier(0.16,1,0.3,1) both',
        maxHeight: 'calc(100vh - 64px)',
        overflowY: 'auto',
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 40px 40px' }}>

          {/* NextUs Self tools grid */}
          <div style={{ marginBottom: '32px' }}>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.22em',
              color: '#A8721A', textTransform: 'uppercase', display: 'block',
              marginBottom: '16px' }}>Horizon Suite</span>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px',
            }}>
              {TOOLS.map(tool => {
                const status = statuses[tool.key]
                return (
                  <Link
                    key={tool.key}
                    to={toolHref(tool)}
                    onClick={() => {
                      if (user) {
                        try { localStorage.setItem('auth_redirect', window.location.origin + tool.path) } catch {}
                      }
                      onClose()
                    }}
                    style={{
                      display: 'block', padding: '16px 18px',
                      background: '#FFFFFF',
                      border: '1.5px solid rgba(200,146,42,0.22)',
                      borderRadius: '14px',
                      textDecoration: 'none',
                      transition: 'all 0.18s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.08)'
                      e.currentTarget.style.borderColor = 'rgba(200,146,42,0.55)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = ''
                      e.currentTarget.style.boxShadow = ''
                      e.currentTarget.style.borderColor = 'rgba(200,146,42,0.22)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start',
                      justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                      <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.08em',
                        color: '#0F1523', fontWeight: 600 }}>{tool.label}</span>
                      {status && <StatusPill status={status} />}
                    </div>
                    {tool.subtitle && (
                      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
                        color: 'rgba(15,21,35,0.55)', marginBottom: '6px' }}>{tool.subtitle}</div>
                    )}
                    <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '17px',
                      color: 'rgba(15,21,35,0.55)', lineHeight: 1.5, margin: 0 }}>
                      {tool.desc}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(200,146,42,0.15)', marginBottom: '24px' }} />

          {/* NextUs platform */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
              <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.22em', color: '#A8721A', textTransform: 'uppercase' }}>NextUs</span>
              <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>A life worth living, a future worth building.</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {NEXTUS_PLATFORM.map(item => (
                <Link
                  key={item.key}
                  to={item.path}
                  onClick={onClose}
                  style={{ display: 'block', padding: '16px 18px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.22)', borderRadius: '14px', textDecoration: 'none', transition: 'all 0.18s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,21,35,0.55)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.55)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.22)' }}
                >
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.08em', color: '#0F1523', fontWeight: 600 }}>{item.label}</span>
                  </div>
                  {item.subtitle && (
                    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', marginBottom: '6px' }}>{item.subtitle}</div>
                  )}
                  <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(200,146,42,0.15)', marginBottom: '24px' }} />

          {/* Discover row */}
          <div>
            <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.22em',
              color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
              display: 'block', marginBottom: '12px' }}>Discover</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {DISCOVER.map(d => (
                <Link key={d.path} to={d.path} onClick={onClose} style={{
                  ...sc, fontSize: '17px', letterSpacing: '0.1em',
                  color: 'rgba(15,21,35,0.72)', textDecoration: 'none',
                  padding: '8px 16px',
                  border: '1px solid rgba(200,146,42,0.18)',
                  borderRadius: '40px', background: 'rgba(200,146,42,0.05)',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#A8721A'; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(15,21,35,0.72)'; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.18)' }}
                >{d.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drawerFadeIn   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes drawerSlideDown { from { opacity: 0; transform: translateY(-12px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </>
  )
}
