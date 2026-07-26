// src/app/components/SparkGive.jsx
//
// Social half · item 5 · The give flow. Sits under the tended thing on a
// challenge card: one person, one line in your own words about why them.
//
// v1 addresses by email and reaches people who already have an account — the
// same shape as the circles invite (174). The address is handed straight to
// send_spark, which resolves it inside the database; it is never stored on the
// spark and never comes back to a browser. The cold landing (a stranger's page
// → sign-up → caught with lineage attached) is the next slice and is additive.
//
// Nothing here nags. Once it is sent, no reminder is ever issued and the giver
// is not told it is sitting unread.

import { useState } from 'react'
import { at, body, sc } from '../../lib/designTokens'
import { sendSpark, MAX_SPARK_LINE } from '../lib/sparks'

export default function SparkGive({ challengeId, challengeTitle, domain }) {
  const [open, setOpen]   = useState(false)
  const [email, setEmail] = useState('')
  const [line, setLine]   = useState('')
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState(null)
  const [sent, setSent]   = useState(false)

  async function send() {
    if (!email.trim() || !line.trim()) return
    setBusy(true); setErr(null)
    const r = await sendSpark({ email, line, challengeId, challengeTitle, domain })
    setBusy(false)
    if (r.ok) { setSent(true); return }
    setErr(r.message)
  }

  if (sent) {
    return (
      <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${at.verdigrisEdge}` }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase',
          color: at.verdigris }}>
          Passed on
        </div>
        <p style={{ ...body, fontSize: '14px', color: at.meta, lineHeight: 1.55, margin: '6px 0 0' }}>
          It is theirs now. If they take it up you will see it in your lineage, and the two of
          you will be doing the same thing on the same mornings. Nothing further is sent.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: at.ghost, background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, marginTop: '12px' }}>
        + Pass a spark to someone
      </button>
    )
  }

  const canSend = email.trim().length > 0 && line.trim().length > 0 && !busy
  const field = {
    ...body, width: '100%', boxSizing: 'border-box', fontSize: '15px', color: at.text,
    background: at.ground, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '8px',
    padding: '10px 12px', lineHeight: 1.5,
  }
  const label = {
    ...sc, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase',
    color: at.ghost, display: 'block', margin: '14px 0 6px',
  }

  return (
    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${at.verdigrisEdge}` }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase',
        color: at.verdigris }}>
        Pass a spark
      </div>
      <p style={{ ...body, fontSize: '14px', color: at.meta, lineHeight: 1.55, margin: '6px 0 0' }}>
        Give it to someone whose company would make the work better — someone you would want
        beside you in it. What they do with it from there is theirs.
      </p>

      <label style={label} htmlFor="spark-who">Who</label>
      <input id="spark-who" type="email" value={email} autoComplete="email"
        onChange={e => setEmail(e.target.value)}
        placeholder="Their email"
        style={field} />

      <label style={label} htmlFor="spark-why">Why them</label>
      <textarea id="spark-why" rows={3} value={line}
        onChange={e => setLine(e.target.value.slice(0, MAX_SPARK_LINE))}
        placeholder="One line, in your own words"
        style={{ ...field, resize: 'vertical' }} />
      <div style={{ ...body, fontSize: '13px', color: at.ghost, textAlign: 'right', marginTop: '2px' }}>
        {line.length}/{MAX_SPARK_LINE}
      </div>

      {err && (
        <div style={{ ...body, fontSize: '14px', color: at.brass, lineHeight: 1.5, marginTop: '8px' }}>
          {err}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
        <button type="button" onClick={send} disabled={!canSend}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#0F241D', background: at.verdigris, border: 'none', borderRadius: '22px',
            padding: '10px 20px', cursor: canSend ? 'pointer' : 'not-allowed',
            opacity: canSend ? 1 : 0.5 }}>
          {busy ? 'Passing…' : 'Pass the spark'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setErr(null) }} disabled={busy}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: at.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 4px' }}>
          Not now
        </button>
      </div>
    </div>
  )
}
