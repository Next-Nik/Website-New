// src/app/pages/IssueView.jsx
//
// The public front door for an issue (a problem-chain). Three bands:
//   Best practice        — what works
//   Viable alternatives  — also work, slower or costlier; "all the power to you"
//   Considered, set aside — kept visible so they aren't re-proposed forever
//
// The set-aside band shows the practice and the backed-up reason, never the
// actors doing it. Where a ruled-out practice is open to reconsideration, a
// person can submit a substantive case; settled ones say so and accept nothing.

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { body, serif, sc, gold, dark, parch } from '../components/OrgShared'

const RESOURCE_LABEL = { low: 'low resource', moderate: 'moderate resource', high: 'high resource' }

function PracticeCard({ p, accent }) {
  const tiers = p.tiers || []
  const actors = p.actors || []
  return (
    <div style={{ border: '1px solid rgba(88,160,138,0.20)', borderLeft: `3px solid ${accent}`,
      borderRadius: '12px', padding: '20px 22px', marginBottom: '16px', background: '#FFFFFF' }}>
      <div style={{ ...serif, fontSize: '22px', color: dark, marginBottom: p.statement ? '6px' : '10px' }}>{p.name}</div>
      {p.statement && (
        <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, marginBottom: '12px' }}>{p.statement}</div>
      )}

      {tiers.length > 0 && (
        <div style={{ marginBottom: actors.length ? '14px' : 0 }}>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: gold, marginBottom: '8px' }}>
            Ways to do it
          </div>
          {tiers.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '6px' }}>
              <span style={{ ...sc, fontSize: '13px', color: gold, minWidth: '18px' }}>{t.position}</span>
              <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.78)', lineHeight: 1.5 }}>
                {t.label}
                {(t.resource_level || t.scale) && (
                  <span style={{ color: 'rgba(15,21,35,0.55)' }}>
                    {'  ·  '}{[RESOURCE_LABEL[t.resource_level], t.scale].filter(Boolean).join(' · ')}
                  </span>
                )}
                {t.looks_like && (
                  <span style={{ display: 'block', fontSize: '13px', color: 'rgba(15,21,35,0.6)' }}>{t.looks_like}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {actors.length > 0 && (
        <div>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: gold, marginBottom: '6px' }}>
            Doing this
          </div>
          <div style={{ ...body, fontSize: '14px', lineHeight: 1.6 }}>
            {actors.map((a, i) => (
              <span key={a.slug || i}>
                {i > 0 && <span style={{ color: 'rgba(15,21,35,0.55)' }}>{'  ·  '}</span>}
                {a.slug
                  ? <Link to={`/org/${a.slug}`} style={{ color: gold, textDecoration: 'none' }}>{a.name}</Link>
                  : <span style={{ color: 'rgba(15,21,35,0.72)' }}>{a.name}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RuledOutCard({ p }) {
  const [open, setOpen]       = useState(false)
  const [basis, setBasis]     = useState('')
  const [state, setState]     = useState(null)   // null | 'sending' | 'done' | 'settled' | 'error'
  const [msg, setMsg]         = useState('')

  async function submit() {
    setState('sending')
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setState('error'); setMsg('Please sign in to propose a reconsideration.'); return }
    try {
      const res = await fetch('/api/practice-reconsider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ practiceId: p.id, basis }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.settled) { setState('settled'); setMsg(data.message); return }
      if (!res.ok || !data.ok) { setState('error'); setMsg(data.error || 'Could not submit.'); return }
      setState('done')
    } catch {
      setState('error'); setMsg('Could not submit.')
    }
  }

  return (
    <div style={{ border: '1px solid rgba(15,21,35,0.12)', borderRadius: '12px',
      padding: '18px 20px', marginBottom: '14px', background: 'rgba(15,21,35,0.015)' }}>
      <div style={{ ...serif, fontSize: '19px', color: 'rgba(15,21,35,0.75)', marginBottom: p.statement ? '5px' : '8px' }}>{p.name}</div>
      {p.statement && (
        <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.6, marginBottom: '10px' }}>{p.statement}</div>
      )}
      {p.standing_rationale && (
        <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.7)', lineHeight: 1.65,
          borderLeft: '2px solid rgba(138,48,48,0.4)', paddingLeft: '12px', marginBottom: '12px' }}>
          {p.standing_rationale}
        </div>
      )}

      {p.reconsideration_open ? (
        state === 'done' ? (
          <div style={{ ...body, fontSize: '13px', color: '#2A6A3A' }}>Submitted for review. Thank you for the substance.</div>
        ) : !open ? (
          <button onClick={() => setOpen(true)} style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em',
            color: gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textTransform: 'uppercase' }}>
            Propose a reconsideration
          </button>
        ) : (
          <div>
            <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.6)', marginBottom: '8px', lineHeight: 1.6 }}>
              Reconsideration needs a substantive change — new evidence or a real redesign, not an opinion. Describe what changed.
            </div>
            <textarea value={basis} onChange={e => setBasis(e.target.value)}
              placeholder="What specifically changed about this approach?"
              style={{ ...body, width: '100%', minHeight: '70px', fontSize: '14px', padding: '10px 12px',
                border: '1px solid rgba(88,160,138,0.3)', borderRadius: '8px', marginBottom: '8px', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={submit} disabled={state === 'sending' || basis.trim().length < 40}
                style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: '#FFF', background: gold, border: 'none', borderRadius: '20px',
                  padding: '8px 18px', cursor: basis.trim().length < 40 ? 'not-allowed' : 'pointer',
                  opacity: basis.trim().length < 40 ? 0.5 : 1 }}>
                {state === 'sending' ? 'Sending…' : 'Submit'}
              </button>
              {(state === 'error' || state === 'settled') && (
                <span style={{ ...body, fontSize: '13px', color: state === 'settled' ? 'rgba(15,21,35,0.6)' : '#8A3030' }}>{msg}</span>
              )}
            </div>
          </div>
        )
      ) : (
        <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>Settled. Not open to reconsideration.</div>
      )}
    </div>
  )
}

function Band({ title, blurb, accent, children }) {
  return (
    <section style={{ marginBottom: '44px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '6px' }}>{title}</div>
      {blurb && <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.6, marginBottom: '16px', maxWidth: '620px' }}>{blurb}</div>}
      {children}
    </section>
  )
}

export function IssueViewPage() {
  const { slug } = useParams()
  const [view, setView]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc('nextus_issue_view', { p_chain: slug })
      if (alive) { setView(error ? null : data); setLoading(false) }
    })()
    return () => { alive = false }
  }, [slug])

  const chain = view?.chain
  const best  = view?.best || []
  const alt   = view?.alternative || []
  const ruled = view?.ruled_out || []

  return (
    <div style={{ minHeight: '100dvh', background: parch }}>
      <Nav />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading…</p>}

        {!loading && !chain && (
          <div>
            <div style={{ ...serif, fontSize: '28px', color: dark, marginBottom: '10px' }}>Issue not found</div>
            <Link to="/search" style={{ ...body, color: gold }}>Back to the Atlas</Link>
          </div>
        )}

        {!loading && chain && (
          <>
            <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(15,21,35,0.55)', marginBottom: '14px' }}>The issue</div>
            <h1 style={{ ...serif, fontSize: '40px', lineHeight: 1.15, color: dark, margin: '0 0 12px' }}>{chain.label}</h1>
            {chain.description && (
              <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, marginBottom: '40px', maxWidth: '620px' }}>{chain.description}</p>
            )}

            {best.length === 0 && alt.length === 0 && ruled.length === 0 && (
              <p style={{ ...body, color: 'rgba(15,21,35,0.55)', lineHeight: 1.6 }}>
                No practices have been judged for this issue yet. As approaches are evaluated, what works — and what doesn't — will appear here.
              </p>
            )}

            {best.length > 0 && (
              <Band title="Best practice" accent="#2A6A3A"
                blurb="What works best for this issue, toward the goal and within the constraint of keeping us whole.">
                {best.map(p => <PracticeCard key={p.id} p={p} accent="#2A6A3A" />)}
              </Band>
            )}

            {alt.length > 0 && (
              <Band title="Viable alternatives" accent="#2A4A8A"
                blurb="These also work — generally slower or more resource-heavy, with no harm to the cause. If one fits your situation better, all the power to you.">
                {alt.map(p => <PracticeCard key={p.id} p={p} accent="#2A4A8A" />)}
              </Band>
            )}

            {ruled.length > 0 && (
              <Band title="Considered, set aside" accent="#8A3030"
                blurb="Approaches that were considered and did not meet the standard — kept here, with the reason, so they aren't endlessly re-proposed. Where a genuine change emerges, some can be revisited.">
                {ruled.map(p => <RuledOutCard key={p.id} p={p} />)}
              </Band>
            )}
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
