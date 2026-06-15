// ─────────────────────────────────────────────────────────────
// DailyEntrances.jsx — the front door
//
// Replaces the wall of doors. You walk in and choose a way in:
// Morning, Midday, or Evening. Each runs its house composition
// through the runner. Underneath, every tool is also a module you
// can open on its own, any hour — nothing is gated. Horizon State
// gets its front door here too, as a whole protocol you can launch.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'
import { HOUSE, resolve } from '../constants/practiceBlocks'
import PracticeRunner from '../components/daily/PracticeRunner'
import PracticeComposer from '../components/daily/PracticeComposer'

const ENTRANCES = [
  { key: 'morning', label: 'Morning', sub: 'Land, become, aim, breathe out.' },
  { key: 'midday',  label: 'Midday',  sub: 'Breathe, remember who you are, and go back in.' },
  { key: 'evening', label: 'Evening', sub: 'Note the day.' },
]

const MODULES = [
  { label: 'Horizon State',      sub: 'The full protocol — arrive, listen, embark.', route: '/tools/horizon-state' },
  { label: 'Horizon Practice',   sub: 'The morning sequence.',                        route: '/tools/horizon-practice' },
  { label: 'Consistency challenge', sub: 'Your cadence, streak, and showing up.',      route: '/tools/horizon-practice' },
  { label: 'I Am',               sub: 'Speak your statements.',                       route: '/tools/i-am' },
  { label: 'Sentence string',    sub: 'Finish the sentence, fast.',               route: '/tools/sentence-completion' },
  { label: 'Morning Pages',      sub: 'Clear the channel.',                           route: '/tools/morning-pages' },
  { label: 'Anchor breath',      sub: 'Chest, belly, sacrum.',                        route: '/tools/anchor-breath' },
  { label: 'Charge breath',      sub: 'Wake the system.',                             route: '/tools/charge-breath' },
  { label: 'Journal',            sub: 'Free write.',                                  route: '/journal' },
]

function Card({ label, sub, onClick, big = false }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
      background: '#FFFFFF', border: `1px solid ${tokens.goldFaint}`, borderRadius: '14px',
      padding: big ? '28px 30px' : '18px 22px', transition: 'border-color 0.2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = tokens.goldChrome }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = tokens.goldFaint }}
    >
      <span style={{
        ...serif, fontWeight: 300, fontSize: big ? 'clamp(24px,3vw,30px)' : '20px',
        color: tokens.dark, display: 'block',
      }}>{label}</span>
      <span style={{
        ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.5,
        display: 'block', marginTop: '4px',
      }}>{sub}</span>
    </button>
  )
}

function EntranceRow({ label, sub, onEnter, onShape }) {
  return (
    <div style={{
      position: 'relative', background: '#FFFFFF',
      border: `1px solid ${tokens.goldFaint}`, borderRadius: '14px', overflow: 'hidden',
    }}>
      <button onClick={onEnter} style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
        background: 'transparent', border: 'none', padding: '28px 30px',
      }}>
        <span style={{ ...serif, fontWeight: 300, fontSize: 'clamp(24px,3vw,30px)', color: tokens.dark, display: 'block' }}>{label}</span>
        <span style={{ ...body, fontSize: '14px', color: tokens.ghost, lineHeight: 1.5, display: 'block', marginTop: '4px' }}>{sub}</span>
      </button>
      {onShape && (
        <button onClick={onShape} style={{
          position: 'absolute', top: '16px', right: '18px',
          ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          background: 'transparent', border: 'none', color: tokens.gold, cursor: 'pointer',
        }}>Edit ▸</button>
      )}
    </div>
  )
}

export default function DailyEntrances() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState(null)              // null | 'morning' | 'midday'
  const [composing, setComposing] = useState(null)        // null | 'morning' | 'midday'
  const [shapes, setShapes] = useState({})                // { entrance: [block_ids] }
  const [horizonSelfStatement, setHorizonSelfStatement] = useState(null)

  useEffect(() => {
    if (!user) return
    let alive = true
    supabase.from('map_results').select('life_ia_statement').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (alive && data?.life_ia_statement) setHorizonSelfStatement(data.life_ia_statement) })
    supabase.from('practice_shapes').select('entrance, block_ids').eq('user_id', user.id)
      .then(({ data }) => {
        if (!alive || !data) return
        const map = {}
        data.forEach(r => { if (Array.isArray(r.block_ids)) map[r.entrance] = r.block_ids })
        setShapes(map)
      })
    return () => { alive = false }
  }, [user])

  const shapeFor = (key) => (shapes[key] && shapes[key].length ? shapes[key] : HOUSE[key] || [])

  async function saveShape(entrance, ids) {
    setShapes(prev => ({ ...prev, [entrance]: ids }))
    setComposing(null)
    if (!user) return
    await supabase.from('practice_shapes')
      .upsert({ user_id: user.id, entrance, block_ids: ids, updated_at: new Date().toISOString() }, { onConflict: 'user_id,entrance' })
  }

  // Composing a shape
  if (composing) {
    return (
      <div style={{ minHeight: '100dvh', background: '#FAFAF7' }}>
        <Nav />
        <PracticeComposer
          entrance={composing}
          value={shapeFor(composing)}
          onSave={(ids) => saveShape(composing, ids)}
          onClose={() => setComposing(null)}
        />
      </div>
    )
  }

  // Running a composed path
  if (active) {
    return (
      <div style={{ minHeight: '100dvh', background: '#FAFAF7' }}>
        <Nav />
        <PracticeRunner
          blocks={resolve(shapeFor(active))}
          title={active.charAt(0).toUpperCase() + active.slice(1)}
          data={{ horizonSelfStatement, userId: user?.id }}
          onExit={() => setActive(null)}
          onNavigate={(route) => navigate(route)}
        />
      </div>
    )
  }

  function enter(key) {
    if (key === 'evening') { navigate('/journal'); return }   // evening stays the existing flow
    setActive(key)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#FAFAF7' }}>
      <Nav />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <p style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: tokens.gold, margin: '0 0 6px' }}>
          Daily
        </p>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(30px,5vw,42px)', color: tokens.dark, margin: '0 0 8px', lineHeight: 1.15 }}>
          A way in.
        </h1>
        <p style={{ ...body, fontSize: '16px', color: tokens.ghost, lineHeight: 1.6, margin: '0 0 32px', maxWidth: '520px' }}>
          Start a practice, or open any tool on its own. Everything’s here, any hour.
        </p>

        {/* the three entrances */}
        <div style={{ display: 'grid', gap: '14px', marginBottom: '44px' }}>
          {ENTRANCES.map(e => (
            <EntranceRow
              key={e.key}
              label={e.label}
              sub={e.sub}
              onEnter={() => enter(e.key)}
              onShape={e.key === 'evening' ? null : () => setComposing(e.key)}
            />
          ))}
        </div>

        {/* every tool as a module, any time */}
        <p style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', textTransform: 'uppercase', color: tokens.gold, margin: '0 0 14px' }}>
          Any time
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {MODULES.map(m => (
            <Card key={m.route} label={m.label} sub={m.sub} onClick={() => navigate(m.route)} />
          ))}
        </div>
      </div>
    </div>
  )
}
