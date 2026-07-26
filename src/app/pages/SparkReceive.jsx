// src/app/pages/SparkReceive.jsx
//
// Social half · item 5 · The receive moment. Somebody chose you and said why.
// You take it up, or you leave it — and leaving it is a real answer that costs
// nothing.
//
// v1 is the member path: /spark/:id, signed in, RLS lets only the addressee
// read the row. The cold landing (a public token page for someone with no
// account) is the next slice; it reuses this screen's copy and adds sign-up
// folded into the one action.
//
// The line the giver wrote is rendered verbatim, in their voice, italic —
// their words, never smoothed.

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { at, serif, body, sc } from '../../lib/designTokens'
import { getSpark, catchSpark, declineSpark } from '../lib/sparks'
import { domainLabel } from '../components/pulse/tickerLine'

export function SparkReceivePage() {
  const { id } = useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [spark, setSpark] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [answered, setAnswered] = useState(null)   // null | 'caught' | 'left'

  useEffect(() => {
    let live = true
    if (authLoading) return
    if (!user) { setLoading(false); return }
    getSpark(id).then(s => { if (live) { setSpark(s); setLoading(false) } })
    return () => { live = false }
  }, [id, user, authLoading])

  async function take() {
    setBusy(true); setErr(null)
    const r = await catchSpark(id, { domain: spark?.domain })
    setBusy(false)
    if (!r.ok) { setErr(r.message); return }
    setAnswered('caught')
  }

  async function leave() {
    setBusy(true); setErr(null)
    const r = await declineSpark(id)
    setBusy(false)
    if (!r.ok) { setErr(r.message); return }
    setAnswered('left')
  }

  const wrap = { minHeight: '100dvh', background: at.ground }
  const inner = { maxWidth: '620px', margin: '0 auto', padding: '48px 22px 80px' }
  const hero = { ...serif, fontWeight: 300, color: at.text, lineHeight: 1.15 }

  if (authLoading || loading) {
    return (
      <div style={wrap}><Nav />
        <div style={inner}><p style={{ ...body, color: at.ghost }}>One moment…</p></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={wrap}><Nav />
        <div style={inner}>
          <h1 style={{ ...hero, fontSize: '30px', margin: '0 0 10px' }}>Somebody passed you a spark</h1>
          <p style={{ ...body, fontSize: '16px', color: at.meta, lineHeight: 1.6 }}>
            Sign in with the address it was sent to and it will be here.{' '}
            <Link to={`/login?redirect=${encodeURIComponent(`/spark/${id}`)}`} style={{ color: at.verdigris }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // Already answered — on a revisit, say so rather than offering an action
  // that would only come back as an error.
  if (spark && spark.status !== 'sent' && !answered) {
    return (
      <div style={wrap}><Nav />
        <div style={inner}>
          <h1 style={{ ...hero, fontSize: '30px', margin: '0 0 10px' }}>
            {spark.status === 'caught' ? 'You already took this up.' : 'You left this one.'}
          </h1>
          <p style={{ ...body, fontSize: '16px', color: at.meta, lineHeight: 1.6 }}>
            {spark.status === 'caught'
              ? 'It is yours, and it carries where it came from.'
              : 'Nothing more was sent, to you or to them.'}{' '}
            <Link to="/today" style={{ color: at.verdigris }}>Go to Today →</Link>
          </p>
        </div>
      </div>
    )
  }

  if (!spark) {
    return (
      <div style={wrap}><Nav />
        <div style={inner}>
          <h1 style={{ ...hero, fontSize: '30px', margin: '0 0 10px' }}>Nothing here</h1>
          <p style={{ ...body, fontSize: '16px', color: at.meta, lineHeight: 1.6 }}>
            This one is not waiting for you — it may have been answered already.{' '}
            <Link to="/today" style={{ color: at.verdigris }}>Go to Today →</Link>
          </p>
        </div>
      </div>
    )
  }

  if (answered === 'left') {
    return (
      <div style={wrap}><Nav />
        <div style={inner}>
          <h1 style={{ ...hero, fontSize: '30px', margin: '0 0 10px' }}>Left where it is.</h1>
          <p style={{ ...body, fontSize: '16px', color: at.meta, lineHeight: 1.6 }}>
            Nothing more is sent, to you or to them.{' '}
            <Link to="/today" style={{ color: at.verdigris }}>Go to Today →</Link>
          </p>
        </div>
      </div>
    )
  }

  if (answered === 'caught') {
    return (
      <div style={wrap}><Nav />
        <div style={inner}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: at.verdigris, marginBottom: '10px' }}>
            Taken up
          </div>
          <h1 style={{ ...hero, fontSize: '34px', margin: '0 0 14px' }}>It’s yours.</h1>
          <p style={{ ...body, fontSize: '16px', color: at.meta, lineHeight: 1.6, margin: '0 0 8px' }}>
            This one came from <strong style={{ color: at.text }}>{spark.giver_name || 'someone'}</strong>.
            What you hold now carries where it came from.
          </p>
          <p style={{ ...body, fontSize: '15px', color: at.ghost, lineHeight: 1.6, margin: '0 0 26px' }}>
            It grows on what you actually do. Day one is tomorrow morning.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigate('/challenges/browse')}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#0F241D', background: at.verdigris, border: 'none', borderRadius: '22px',
                padding: '11px 22px', cursor: 'pointer' }}>
              {spark.challenge_title ? 'Take on the practice' : 'Find a practice'}
            </button>
            <Link to="/today" style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: at.ghost, textDecoration: 'none',
              alignSelf: 'center' }}>
              Go to Today
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const dom = domainLabel(spark.domain)

  return (
    <div style={wrap}>
      <Nav />
      <div style={inner}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: at.brass, marginBottom: '10px' }}>
          Waiting for you
        </div>
        <h1 style={{ ...hero, fontSize: '34px', margin: '0 0 22px' }}>
          {spark.giver_name || 'Someone'} passed you a spark
        </h1>

        <div style={{ background: 'rgba(76,107,69,0.08)', border: `1px solid ${at.verdigrisEdge}`,
          borderRadius: '14px', padding: '20px 22px' }}>
          <p style={{ ...body, fontSize: '17px', color: at.text, lineHeight: 1.6,
            fontStyle: 'italic', margin: 0 }}>
            &ldquo;{spark.line}&rdquo;
          </p>
          {(spark.challenge_title || dom) && (
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: at.ghost, marginTop: '14px' }}>
              {[spark.giver_name, spark.challenge_title, dom].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {err && (
          <div style={{ ...body, fontSize: '14px', color: at.brass, lineHeight: 1.5, marginTop: '12px' }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '26px', flexWrap: 'wrap' }}>
          <button type="button" onClick={take} disabled={busy}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#0F241D', background: at.verdigris, border: 'none', borderRadius: '22px',
              padding: '11px 22px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'One moment…' : 'Take it up'}
          </button>
          <button type="button" onClick={leave} disabled={busy}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: at.ghost, background: 'transparent', border: `1px solid ${at.verdigrisEdge}`,
              borderRadius: '22px', padding: '11px 20px', cursor: busy ? 'default' : 'pointer' }}>
            Leave it
          </button>
        </div>

        <p style={{ ...body, fontSize: '14px', color: at.ghost, lineHeight: 1.6, marginTop: '18px' }}>
          It will wait here as long as you like.
        </p>
      </div>
    </div>
  )
}

export default SparkReceivePage
