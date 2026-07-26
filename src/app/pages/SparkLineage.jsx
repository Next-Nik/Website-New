// src/app/pages/SparkLineage.jsx
//
// Social half · item 5 · Where the spark went. The giver's private tree.
//
// Yours alone. Never public, never compared, never ranked, and never shown to
// the people inside it. Nobody is told they are "worth" nine. Somebody who
// took it up and stopped sits in the tree exactly like somebody who passed it
// to five — the tree records that the spark travelled, not how far.
//
// The three numbers at the top are the only counts this feature produces, and
// none of them is comparable to anybody else's, because no one else can see
// them.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { at, serif, body, sc } from '../../lib/designTokens'
import { getLineage, nestLineage } from '../lib/sparks'

function Node({ node, depth }) {
  const passed = Number(node.passed_on) || 0
  const caught = node.status === 'caught'
  return (
    <div style={{ marginLeft: depth > 1 ? '34px' : 0 }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 10px', paddingTop: '7px' }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%',
            background: depth === 1 ? at.verdigris : at.verdigrisEdge }} />
        </div>
        <div style={{ paddingBottom: '16px' }}>
          <div style={{ ...body, fontSize: '15px', color: at.text, lineHeight: 1.5 }}>
            <strong style={{ fontWeight: 600 }}>{node.person}</strong>
            {caught && node.caught_at && (
              <span style={{ color: at.meta }}>
                {' '}— took it up {new Date(node.caught_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
              </span>
            )}
          </div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', color: at.ghost, marginTop: '2px' }}>
            {!caught && node.status === 'sent'   && 'Waiting'}
            {!caught && node.status === 'declined' && 'Left where it was'}
            {caught && passed === 0 && 'Hasn’t passed it on'}
            {caught && passed > 0 && `Passed it to ${passed}`}
          </div>
        </div>
      </div>
      {node.children.map(c => <Node key={c.spark_id} node={c} depth={depth + 1} />)}
    </div>
  )
}

export function SparkLineagePage() {
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState({ rows: [], live: 0, passedOn: 0, waiting: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    if (authLoading) return
    if (!user) { setLoading(false); return }
    getLineage().then(s => { if (alive) { setState(s); setLoading(false) } })
    return () => { alive = false }
  }, [user, authLoading])

  const wrap = { minHeight: '100dvh', background: at.ground }
  const inner = { maxWidth: '680px', margin: '0 auto', padding: '40px 22px 80px' }
  const hero = { ...serif, fontWeight: 300, color: at.text, lineHeight: 1.15 }

  const tree = nestLineage(state.rows)

  return (
    <div style={wrap}>
      <Nav />
      <div style={inner}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: at.verdigris, marginBottom: '8px' }}>
          Private · only you
        </div>
        <h1 style={{ ...hero, fontSize: '34px', margin: '0 0 14px' }}>Where the spark went</h1>

        {authLoading || loading ? (
          <p style={{ ...body, color: at.ghost }}>One moment…</p>
        ) : !user ? (
          <p style={{ ...body, fontSize: '16px', color: at.meta, lineHeight: 1.6 }}>
            <Link to="/login" style={{ color: at.verdigris }}>Sign in</Link> to see your own.
          </p>
        ) : state.rows.length === 0 ? (
          <div style={{ background: at.object, border: `1px solid ${at.verdigrisEdge}`,
            borderRadius: '14px', padding: '28px 26px' }}>
            <p style={{ ...body, fontSize: '16px', color: at.meta, lineHeight: 1.65, margin: '0 0 6px' }}>
              You haven’t passed one on yet.
            </p>
            <p style={{ ...body, fontSize: '15px', color: at.ghost, lineHeight: 1.65, margin: 0 }}>
              It starts from a practice you are already keeping —{' '}
              <Link to="/challenges" style={{ color: at.verdigris }}>your challenges</Link> is where
              the give sits.
            </p>
          </div>
        ) : (
          <>
            <p style={{ ...body, fontSize: '16px', color: at.meta, lineHeight: 1.6, margin: '0 0 24px' }}>
              Your spark lives in <strong style={{ color: at.text }}>{state.live}</strong>{' '}
              {state.live === 1 ? 'person' : 'people'}.{' '}
              <strong style={{ color: at.text }}>{state.passedOn}</strong>{' '}
              {state.passedOn === 1 ? 'has' : 'have'} passed it on.
            </p>

            <div style={{ background: at.object, border: `1px solid ${at.verdigrisEdge}`,
              borderRadius: '14px', padding: '24px 26px' }}>
              {tree.map(n => <Node key={n.spark_id} node={n} depth={1} />)}

              <div style={{ marginTop: '10px', padding: '16px 18px', borderRadius: '12px',
                border: `1px dashed ${at.grid}` }}>
                <p style={{ ...body, fontSize: '14px', color: at.ghost, lineHeight: 1.65, margin: 0 }}>
                  Yours alone. This tree is never public, never compared, never ranked, and never
                  shown to the people in it. Somebody who took it up and stopped is here exactly
                  like somebody who passed it to five — it records that the spark travelled, not
                  how far.
                </p>
              </div>
            </div>

            {state.waiting > 0 && (
              <div style={{ background: at.object, border: `1px solid ${at.brassEdge}`,
                borderRadius: '14px', padding: '20px 24px', marginTop: '16px' }}>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em',
                  textTransform: 'uppercase', color: at.brass, marginBottom: '8px' }}>
                  Still waiting
                </div>
                <p style={{ ...body, fontSize: '15px', color: at.meta, lineHeight: 1.6, margin: 0 }}>
                  {state.waiting === 1
                    ? 'One you passed on hasn’t been taken up. It is still there if they ever want it.'
                    : `${state.waiting} you passed on haven’t been taken up. They are still there if they ever want them.`}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default SparkLineagePage
