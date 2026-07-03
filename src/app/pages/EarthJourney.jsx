// src/app/pages/EarthJourney.jsx
//
// The constellation journey: the NextU treatment applied to the challenge
// side. One thread, five chapters — Take it on, First spark, Keep the flame,
// Light your own, The close. Chapters 1–4 are personal and derived entirely
// from existing data (participations, strand logs, authored calls); chapter 5
// is shared: everyone's thread ends at the same close. Dim, never locked.
// Completed chapters show what they built — the vault, not a checkmark.

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { serif, sc, body, tokens } from '../../lib/designTokens'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import BeaconFire from '../components/challenge/BeaconFire'
import { computeChain, dotRow } from '../../lib/challengeChain'

const GOLD    = '#A8721A'
const CHROME  = '#C8922A'
const NIGHT   = '#141B2C'
const CREAM   = '#FBF8F0'
const AMBER   = '#F2C45A'
const GOLD_T  = '#D7A24A'
const GHOST   = 'rgba(15,21,35,0.55)'
const FAINT   = 'rgba(200,146,42,0.35)'

const ROOT_SLUG_FALLBACK = 'inaugural-nextus-earth-challenge'

function fmtDate(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y) return null
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
function daysUntil(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  return Math.max(0, Math.ceil((new Date(y, m - 1, d, 23, 59, 59).getTime() - Date.now()) / 86400000))
}

async function api(action, extra = {}) {
  let token = null
  try { token = (await supabase.auth.getSession()).data.session?.access_token || null } catch {}
  const r = await fetch('/api/actor-calls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action, ...extra }),
  })
  return r.json()
}

export default function EarthJourney() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [tally, setTally] = useState(null)
  const [runs, setRuns] = useState(null)      // participations in the tree
  const [authored, setAuthored] = useState(null)
  const [field, setField] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    async function load() {
      try {
        const [tRes, actRes] = await Promise.all([
          fetch('/api/beacon', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get', slug: 'founding-nature' }) }).then(r => r.json()),
          api('constellation_activity', { limit: 1 }),
        ])
        if (!live) return
        if (tRes && tRes.rooted) setTally(tRes)
        setField(actRes?.field || { challenges: [] })
        if (user) {
          const treeIds = new Set((actRes?.field?.challenges || []).map(c => c.call_id))
          const [mine, myCalls] = await Promise.all([
            api('my_participations'),
            api('get_my_calls'),
          ])
          if (!live) return
          const inTree = (mine?.participations || []).filter(p => treeIds.has(p.call_id))
          setRuns(inTree)
          const myTreeCalls = (myCalls?.calls || []).filter(c => treeIds.has(c.id))
          setAuthored(myTreeCalls)
        }
      } catch (_) {}
      if (live) setLoading(false)
    }
    if (!authLoading) load()
    return () => { live = false }
  }, [user, authLoading])

  const closes = tally?.closes_on || null
  const days = daysUntil(closes)

  // derived chapter state
  const derived = useMemo(() => {
    const rr = runs || []
    const allDates = new Set()
    rr.forEach(p => (p.done_dates || []).forEach(d => allDates.add(d)))
    const daysShown = allDates.size
    const firstSpark = allDates.size ? Array.from(allDates).sort()[0] : null
    const best = rr.map(p => computeChain({ doneDates: p.done_dates || [], cadence: p.cadence }))
      .sort((a, b) => b.kept - a.kept)[0] || null
    const authoredLive = (authored || [])
    const authoredField = authoredLive.map(a => {
      const f = (field?.challenges || []).find(c => c.call_id === a.id)
      return { ...a, people: f?.people || 0, checkins: f?.checkins || 0 }
    })
    return { rr, daysShown, firstSpark, best, authoredField }
  }, [runs, authored, field])

  const ch = useMemo(() => {
    const took = derived.rr.length > 0
    const sparked = derived.daysShown > 0
    const flame = derived.daysShown >= 3
    const lit = derived.authoredField.length > 0
    const states = [
      took ? 'done' : 'now',
      sparked ? 'done' : (took ? 'now' : 'dim'),
      flame ? 'done' : (sparked ? 'now' : 'dim'),
      lit ? 'done' : 'dim',
      (took || lit) ? 'now' : 'dim',
    ]
    return states
  }, [derived])

  // resume logic: the surface always knows the next step
  const resume = useMemo(() => {
    if (!user) return { k: 'Your next step', v: 'See the Earth Challenge', act: () => navigate(`/stretch/c/${tally?.root_slug || ROOT_SLUG_FALLBACK}`), b: 'Open it' }
    if (!derived.rr.length) return { k: 'Your next step', v: 'Take on a challenge', act: () => navigate('/challenges/browse?domain=nature'), b: 'See the challenges' }
    const open = derived.rr.find(p => p.status === 'active' && (p.done_today || []).length === 0)
    if (open) return { k: 'Your next step', v: `Check in · ${open.title}`, act: () => navigate('/'), b: 'Open today' }
    return { k: 'All kept today', v: 'See what we are building', act: () => navigate('/earth'), b: 'The fire →' }
  }, [user, derived, navigate])

  const CH_META = [
    { n: 'Chapter one', h: 'Take it on', b: 'One real challenge from an organisation working for the living world. Yours the day you accept it.' },
    { n: 'Chapter two', h: 'First spark', b: 'Show up once. One action, one check-in, one spark in the beacon.' },
    { n: 'Chapter three', h: 'Keep the flame', b: 'Showing up, repeated. Not perfection, presence. The days accumulate here.' },
    { n: 'Chapter four', h: 'Light your own', b: 'The turn from taking on to inviting. Post a challenge under the Earth Challenge and others take it on.' },
    { n: 'Chapter five', h: 'The close', b: '' },
  ]

  return (
    <div style={{ background: tokens.bg, minHeight: '100dvh' }}>
      <Nav />
      {/* hero */}
      <div style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(242,196,90,0.09), transparent 62%), ${NIGHT}`,
        color: CREAM, textAlign: 'center', padding: '34px 20px 42px' }}>
        <div style={{ maxWidth: '190px', margin: '0 auto 6px' }}>
          <BeaconFire sparks={Number(tally?.sparks || 0)} />
        </div>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD_T }}>
          The NextUs Earth Challenge
        </div>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: '32px', margin: '6px 0 4px', lineHeight: 1.1 }}>Your journey</h1>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(251,248,240,0.6)' }}>
          {tally ? <>{Number(tally.sparks || 0).toLocaleString()} sparks · {Number(tally.people || 0).toLocaleString()} people{closes ? ` · to ${fmtDate(closes)}` : ''}</> : 'The beacon is lit.'}
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 18px 80px' }}>
        {/* resume card */}
        <div style={{ background: tokens.bgCard, border: `1.5px solid ${CHROME}`, borderRadius: '16px',
          padding: '20px 22px', margin: '-22px auto 34px', position: 'relative',
          display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
          boxShadow: '0 10px 30px rgba(15,21,35,0.08)' }}>
          <div>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}>{resume.k}</div>
            <div style={{ ...serif, fontSize: '24px', lineHeight: 1.15, marginTop: '2px', color: tokens.dark }}>{resume.v}</div>
          </div>
          <button onClick={resume.act}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.13em', textTransform: 'uppercase',
              color: '#1a1320', background: AMBER, border: 'none', borderRadius: '26px',
              padding: '13px 24px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {resume.b}
          </button>
        </div>

        {loading ? (
          <p style={{ ...body, fontSize: '15px', color: GHOST }}>Lighting the thread…</p>
        ) : (
        <div style={{ position: 'relative', paddingLeft: '34px' }}>
          <div aria-hidden="true" style={{ position: 'absolute', left: '11px', top: '8px', bottom: '8px', width: '2px',
            background: `linear-gradient(180deg, ${CHROME}, rgba(200,146,42,0.25))` }} />
          {CH_META.map((c, i) => {
            const state = ch[i]
            return (
              <div key={i} style={{ position: 'relative', marginBottom: '26px', opacity: state === 'dim' ? 0.55 : 1 }}>
                <div style={{ position: 'absolute', left: '-34px', top: '4px', width: '24px', height: '24px',
                  borderRadius: '50%', border: `2px solid ${CHROME}`,
                  background: state === 'done' ? CHROME : tokens.bg,
                  boxShadow: state === 'now' ? '0 0 0 4px rgba(242,196,90,0.3)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...sc, fontSize: '13px', color: state === 'done' ? '#FFF' : GOLD }}>
                  {state === 'done' ? '✓' : i + 1}
                </div>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD }}>{c.n}</div>
                <h3 style={{ ...serif, fontWeight: 400, fontSize: '26px', margin: '2px 0 6px', color: tokens.dark }}>{c.h}</h3>

                {i === 4 ? (
                  <div style={{ background: NIGHT, color: CREAM, borderRadius: '14px', padding: '18px 20px', marginTop: '8px' }}>
                    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD_T }}>
                      Everyone plays to the one shared close
                    </div>
                    <div style={{ ...serif, fontWeight: 300, fontSize: '26px', marginTop: '3px' }}>
                      {closes ? `${fmtDate(closes)}${days != null ? ` · ${days} days` : ''}` : 'The shared close'}
                    </div>
                    <div style={{ ...body, fontSize: '14.5px', color: 'rgba(251,248,240,0.72)', lineHeight: 1.55, marginTop: '6px' }}>
                      Just past Climate Week, the constellation closes and we get to see what we were able to get done together. This chapter is the same for all of us.
                    </div>
                    <Link to="/earth" style={{ display: 'inline-block', marginTop: '10px', ...sc, fontSize: '13px',
                      letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLD_T, textDecoration: 'none',
                      borderBottom: '1px solid rgba(242,196,90,0.35)', paddingBottom: '2px' }}>
                      See the fire →
                    </Link>
                  </div>
                ) : (
                  <div style={{ ...body, fontSize: '15.5px', lineHeight: 1.6, color: GHOST, maxWidth: '56ch' }}>{c.b}</div>
                )}

                {/* vaults */}
                {i === 0 && derived.rr.length > 0 && (
                  <Vault t="You took on"
                    big={derived.rr.length === 1 ? derived.rr[0].title : `${derived.rr.length} challenges`}
                    sm={derived.rr.map(p => p.title).slice(0, 3).join(' · ')} />
                )}
                {i === 1 && derived.daysShown > 0 && (
                  <Vault t="Days you have fed the beacon" big={String(derived.daysShown)}
                    sm={derived.firstSpark ? `first spark ${fmtDate(derived.firstSpark)}` : ''} />
                )}
                {i === 2 && derived.best && derived.daysShown >= 3 && (
                  <Vault t={derived.best.unit === 'days' ? 'Days in a row' : 'In a row'}
                    big={String(derived.best.kept)}
                    sm="the last fourteen days"
                    dots={dotRow({ doneDates: (derived.rr[0]?.done_dates) || [], chain: derived.best })} />
                )}
                {i === 3 && (derived.authoredField.length > 0 ? (
                  <Vault t="You lit" big={derived.authoredField[0].title}
                    sm={`${derived.authoredField[0].people} ${derived.authoredField[0].people === 1 ? 'person' : 'people'} took it on · ${derived.authoredField[0].checkins} sparks in its branch`} />
                ) : (
                  <div style={{ marginTop: '12px', background: 'rgba(242,196,90,0.07)', border: `1px dashed ${FAINT}`,
                    borderRadius: '14px', padding: '16px 18px' }}>
                    <div style={{ ...serif, fontSize: '20px', marginBottom: '6px', color: tokens.dark }}>
                      Challenge the world to change the world.
                    </div>
                    <div style={{ ...body, fontSize: '14.5px', color: GHOST, lineHeight: 1.55, marginBottom: '12px' }}>
                      {derived.daysShown >= 3
                        ? 'You know what showing up feels like now. Post a challenge of your own under the Earth Challenge and invite others to it.'
                        : 'When you are ready, post a challenge of your own under the Earth Challenge. Your framing, your invitation.'}
                    </div>
                    <Link to="/challenges/new?carry=founding-nature"
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: GOLD, textDecoration: 'none', borderBottom: `1px solid ${FAINT}`, paddingBottom: '2px' }}>
                      Light your own →
                    </Link>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        )}
      </div>
    </div>
  )
}

function Vault({ t, big, sm, dots }) {
  return (
    <div style={{ marginTop: '12px', background: '#FFFFFF', border: '1px solid rgba(15,21,35,0.12)',
      borderRadius: '14px', padding: '16px 18px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A8721A', marginBottom: '8px' }}>{t}</div>
      <div style={{ ...serif, fontWeight: 300, fontSize: '30px', lineHeight: 1.1, color: '#0F1523' }}>{big}</div>
      {sm ? <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginTop: '4px', lineHeight: 1.5 }}>{sm}</div> : null}
      {dots && (
        <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
          {dots.map((d, i) => (
            <span key={i} style={{ width: '12px', height: '12px', borderRadius: '50%',
              background: d === 'on' ? '#C8922A' : (d === 'today' ? 'rgba(242,196,90,0.25)' : 'rgba(15,21,35,0.1)'),
              border: d === 'grace' ? '2px solid #C8922A' : (d === 'today' ? '2px dashed #C8922A' : 'none'),
              boxSizing: 'border-box' }} />
          ))}
        </div>
      )}
    </div>
  )
}
