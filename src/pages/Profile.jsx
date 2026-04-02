import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiteNav } from '../components/SiteNav'
import { useAuth } from '../hooks/useAuth'
import { SprintPanel } from '../components/SprintPanel'
import { supabase } from '../hooks/useSupabase'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

const DOMAIN_LABELS = ['Path', 'Spark', 'Body', 'Finances', 'Relationships', 'Inner Game', 'Outer Game']
const DOMAIN_KEYS   = ['path', 'spark', 'body', 'finances', 'relationships', 'inner_game', 'outer_game']
const TIER_LABELS = { 10:'World-Class',9:'Exemplar',8:'Fluent',7:'Capable',6:'Functional',5:'Threshold',4:'Friction',3:'Strain',2:'Crisis',1:'Emergency',0:'Ground Zero' }

function getTierColor(n) {
  if (n >= 9) return '#3B6B9E'
  if (n >= 7) return '#5A8AB8'
  if (n >= 5) return '#8A8070'
  if (n >= 3) return '#8A7030'
  return '#8A3030'
}

function ScoreBar({ label, score }) {
  const color = getTierColor(score)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
      <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.72)', width: '96px', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', background: 'rgba(200,146,42,0.12)', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', left: 0, width: `${(score/10)*100}%`, height: '4px', background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
        <div style={{ position: 'absolute', left: `calc(${(score/10)*100}% - 7px)`, width: '14px', height: '14px', borderRadius: '50%', background: '#FAFAF7', border: `2px solid ${color}`, zIndex: 1 }} />
      </div>
      <div style={{ width: '80px', flexShrink: 0, textAlign: 'right' }}>
        <span style={{ ...sc, fontSize: '1.125rem', fontWeight: 600, color, lineHeight: 1 }}>{score}</span>
        <span style={{ ...serif, fontSize: '0.75rem', color: 'rgba(15,21,35,0.72)' }}>/10</span>
        <div style={{ ...serif, fontSize: '0.625rem', color, marginTop: '2px', opacity: 0.8 }}>{TIER_LABELS[score]}</div>
      </div>
    </div>
  )
}

function Slot({ title, tip, linkLabel, linkUrl, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px', marginBottom: '10px', overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', cursor: 'pointer', background: open ? 'rgba(200,146,42,0.03)' : 'transparent' }}>
        <span style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', color: '#0F1523' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {linkLabel && linkUrl && (
            <a href={linkUrl} onClick={e => e.stopPropagation()} style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: '#A8721A', textDecoration: 'none' }}>{linkLabel} {'\u2192'}</a>
          )}
          <span style={{ color: '#A8721A', fontSize: '18px', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', lineHeight: 1 }}>{'\u203A'}</span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.20)', padding: '24px 22px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function EmptySlot({ cta, ctaUrl }) {
  return (
    <div style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)', marginBottom: '16px' }}>
      Not yet populated.{' '}
      {cta && ctaUrl && <a href={ctaUrl} style={{ color: '#A8721A', textDecoration: 'none' }}>{cta} {'\u2192'}</a>}
    </div>
  )
}

export function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [mapData,     setMapData]     = useState(null)
  const [purposeData, setPurposeData] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login?redirect=/profile'); return }
    loadData()
  }, [user, authLoading])

  async function loadData() {
    setDataLoading(true)
    try {
      const [mapRes, ppRes] = await Promise.all([
        supabase.from('map_results').select('session,completed_at').eq('user_id', user.id).eq('complete', true).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('purpose_piece_results').select('*').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (mapRes.data) setMapData(mapRes.data)
      if (ppRes.data) setPurposeData(ppRes.data)
    } catch {}
    setDataLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (authLoading || dataLoading) return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.72)' }}>Loading{'\u2026'}</div>
    </div>
  )

  if (!user) return null

  const name = user.email?.split('@')[0] || 'You'
  const scores = mapData?.session?.domainData
    ? Object.fromEntries(Object.entries(mapData.session.domainData).filter(([,d]) => d?.score !== undefined).map(([id,d]) => [id, d.score]))
    : null

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <SiteNav />
      <SprintPanel />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '64px 40px 160px' }}>

        <div style={{ marginBottom: '72px' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Your Profile</span>
          <h1 style={{ ...serif, fontSize: 'clamp(36px,5vw,52px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: '10px' }}>{name}.</h1>
          <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>{user.email}</p>
        </div>

        <Slot title="The Map" tip="Seven domain scores." linkLabel="The Map" linkUrl="/tools/map">
          {scores ? (
            <div>
              {DOMAIN_KEYS.map((key, i) => scores[key] !== undefined && (
                <ScoreBar key={key} label={DOMAIN_LABELS[i]} score={scores[key]} />
              ))}
              {mapData?.completed_at && (
                <p style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.72)', marginTop: '16px' }}>
                  Completed {new Date(mapData.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          ) : (
            <EmptySlot cta="Begin The Map" ctaUrl="/tools/map" />
          )}
        </Slot>

        <Slot title="Purpose Piece" tip="Your contribution archetype." linkLabel="Purpose Piece" linkUrl="/tools/purpose-piece">
          {purposeData ? (
            <div>
              {purposeData.archetype && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '6px' }}>Archetype</div>
                  <div style={{ ...serif, fontSize: '22px', fontWeight: 300, color: '#0F1523' }}>{purposeData.archetype}</div>
                </div>
              )}
              {purposeData.domain && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '6px' }}>Primary Domain</div>
                  <div style={{ ...serif, fontSize: '16px', color: '#0F1523' }}>{purposeData.domain}</div>
                </div>
              )}
              {purposeData.scale && (
                <div>
                  <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '6px' }}>Scale</div>
                  <div style={{ ...serif, fontSize: '16px', color: '#0F1523' }}>{purposeData.scale}</div>
                </div>
              )}
            </div>
          ) : (
            <EmptySlot cta="Begin Purpose Piece" ctaUrl="/tools/purpose-piece" />
          )}
        </Slot>

        <Slot title="NextUs" tip="Seven civilisational domains." linkLabel="NextUs" linkUrl="/nextus">
          <div style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>
            This is where your contribution to the larger project lives. Building now.
          </div>
        </Slot>

        <div style={{ textAlign: 'center', paddingTop: '48px', borderTop: '1px solid rgba(200,146,42,0.20)', marginTop: '24px' }}>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', ...sc, fontSize: '12px', fontWeight: 600, letterSpacing: '0.20em', color: 'rgba(15,21,35,0.72)', padding: '8px 0' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
