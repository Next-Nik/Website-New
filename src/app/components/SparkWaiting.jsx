// src/app/components/SparkWaiting.jsx
//
// The door to a spark somebody passed you.
//
// This is the piece the first drop was missing: /spark/:id existed, and
// nothing anywhere led to it. No email is sent, there is no notification
// system, and nothing chases anyone — which is right — but that left the
// receive screen genuinely unreachable. A route with no door is the route-bug
// law in the other direction.
//
// The fix keeps the no-chasing rule intact: the spark is surfaced where the
// person already is, on the daily surface, the same way the featured request
// is. It waits to be found; it never arrives.

import { Link } from 'react-router-dom'
import { at, body, sc } from '../../lib/designTokens'

export default function SparkWaiting({ sparks = [] }) {
  if (!sparks.length) return null
  const s = sparks[0]
  const more = sparks.length - 1

  return (
    <section aria-label="A spark waiting for you"
      style={{ background: at.object, border: `1px solid ${at.brassEdge}`,
        borderRadius: '14px', padding: '24px 26px', marginBottom: '28px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: at.brass }}>
        Waiting for you
      </div>
      <h2 style={{ ...body, fontSize: '20px', fontWeight: 500, color: at.text,
        lineHeight: 1.25, margin: '10px 0 0' }}>
        {s.giver_name || 'Someone'} passed you a spark
      </h2>

      {s.line && (
        <p style={{ ...body, fontSize: '15px', color: at.text, lineHeight: 1.6,
          fontStyle: 'italic', margin: '14px 0 0' }}>
          &ldquo;{s.line}&rdquo;
        </p>
      )}

      {(s.challenge_title || s.domain) && (
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: at.ghost, marginTop: '12px' }}>
          {[s.challenge_title, s.domain].filter(Boolean).join(' · ')}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <Link to={`/spark/${s.id}`}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#0F241D', background: at.verdigris, borderRadius: '22px',
            padding: '10px 20px', textDecoration: 'none', display: 'inline-block' }}>
          Have a look
        </Link>
      </div>

      {more > 0 && (
        <p style={{ ...body, fontSize: '13px', color: at.ghost, lineHeight: 1.6, margin: '14px 0 0' }}>
          {more === 1 ? 'One more is waiting too.' : `${more} more are waiting too.`}
        </p>
      )}
    </section>
  )
}
