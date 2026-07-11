// /challenges — the challenges a person has taken on (Phase 3b, June 2026).
//
// The home for joined challenges, separate from a person's own personal
// stretch and their own Planet Sprint. Reads the participation engine
// (Phase 3): each card shows the frozen strands, a habit-dot strip across
// the window, a running-days count, and today's strands to check off.
// Scale is never shown — a challenge just plugs into your days.

import { useState, useEffect, useMemo } from 'react'
import { actorCallsRaw } from '../../lib/actorCallsClient'
import { Link }       from 'react-router-dom'
import { Nav }        from '../../components/Nav'
import { useAuth }    from '../../hooks/useAuth'
import { tokens, serif, body, sc, at } from '../../lib/designTokens'

const GOLD_C = at.verdigris
const hair   = `1px solid ${at.verdigrisEdge}`
const muted  = { color: 'rgba(234,241,237,0.78)' }

// ─── Date helpers (UTC, matching the server's date keys) ──────────────────────

function todayKey() { return new Date().toISOString().slice(0, 10) }

function addDays(startKey, n) {
  const d = new Date(startKey + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function daysInclusive(startKey, endKey) {
  if (!startKey || !endKey) return 0
  const a = new Date(startKey + 'T00:00:00Z')
  const b = new Date(endKey + 'T00:00:00Z')
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

// Day number within the window, 1-based, clamped to the window.
function dayNumber(startKey, window) {
  if (!startKey) return 1
  const t = new Date(todayKey() + 'T00:00:00Z')
  const a = new Date(startKey + 'T00:00:00Z')
  const n = Math.round((t - a) / 86400000) + 1
  return Math.min(Math.max(1, n), window)
}

// Consecutive engaged days ending today or yesterday.
function currentStreak(doneDates) {
  const set = new Set(doneDates || [])
  if (!set.size) return 0
  let cursor = todayKey()
  if (!set.has(cursor)) cursor = addDays(cursor, -1)   // a missed today doesn't break a run yet
  let streak = 0
  while (set.has(cursor)) { streak++; cursor = addDays(cursor, -1) }
  return streak
}

const CADENCE_LABEL = {
  'daily-absolute': 'every day',
  '5-of-7':         '5 of 7 days',
  'weekly':         'weekly',
  'custom':         '',
}

// ─── A single challenge card ──────────────────────────────────────────────────

function ChallengeCard({ p, userId, founding, onLeft }) {
  const [leaving, setLeaving] = useState(false)   // false | 'confirm' | 'busy'
  const inConstellation = !!(founding && founding.ids && founding.ids.has(p.call_id))
  const closeStr = founding && founding.closes_on
    ? new Date(founding.closes_on + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null
  const [doneToday, setDoneToday] = useState(new Set(p.done_today || []))
  const [busy, setBusy]           = useState(null)

  const [localComplete, setLocalComplete] = useState(false)
  const [finishing,  setFinishing]  = useState(false)
  const [consent,    setConsent]    = useState(false)
  const [reflection, setReflection] = useState('')
  const [attributed, setAttributed] = useState(false)
  const [savingDone, setSavingDone] = useState(false)

  const window   = daysInclusive(p.started_on, p.ends_on)
  const dayNo    = dayNumber(p.started_on, window)
  const streak   = useMemo(() => currentStreak(p.done_dates), [p.done_dates])
  const strands  = p.strands || []
  const complete = p.status === 'complete' || localComplete

  async function finish() {
    setSavingDone(true)
    try {
      await actorCallsRaw({
          action: 'submit_feedback', userId, call_id: p.call_id,
          consent,
          reflection:            consent && reflection.trim() ? reflection.trim() : null,
          reflection_public:     consent && !!reflection.trim(),
          reflection_attributed: consent && attributed,
        })
      setLocalComplete(true); setFinishing(false)
    } catch {}
    setSavingDone(false)
  }

  const dots = useMemo(() => {
    if (!p.started_on) return []
    const set = new Set(p.done_dates || [])
    const tk  = todayKey()
    return Array.from({ length: window }, (_, i) => {
      const key = addDays(p.started_on, i)
      return { key, filled: set.has(key), isToday: key === tk, future: key > tk }
    })
  }, [p.started_on, p.done_dates, window])

  async function toggle(strandId) {
    const next = new Set(doneToday)
    const willBeDone = !next.has(strandId)
    if (willBeDone) next.add(strandId); else next.delete(strandId)
    setDoneToday(next)
    setBusy(strandId)
    try {
      await actorCallsRaw({ action: 'log_strand', userId, call_id: p.call_id, strand_id: strandId, done: willBeDone })
    } catch {
      // revert on failure
      const revert = new Set(doneToday)
      setDoneToday(revert)
    }
    setBusy(null)
  }

  const author = p.author?.name

  return (
    <div style={{ background: at.object, border: hair, borderRadius: '14px', padding: '24px 26px', marginBottom: '20px' }}>
      {/* Title + byline */}
      <div style={{ marginBottom: '16px' }}>
        {p.slug ? (
          <Link to={`/stretch/c/${p.slug}`} style={{ textDecoration: 'none' }}>
            <h2 style={{ ...serif, fontWeight: 300, fontSize: '26px', color: at.text, lineHeight: 1.2, margin: 0 }}>{p.title}</h2>
          </Link>
        ) : (
          <h2 style={{ ...serif, fontWeight: 300, fontSize: '26px', color: at.text, lineHeight: 1.2, margin: 0 }}>{p.title}</h2>
        )}
        {author && (
          <div style={{ ...body, fontSize: '14px', color: at.ghost, marginTop: '4px' }}>Offered by {author}</div>
        )}
      </div>

      {/* Clock + streak — constellation runs play to the one shared close */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <span style={{ ...serif, fontWeight: 300, fontSize: '34px', color: at.text, lineHeight: 1 }}>{complete ? window : dayNo}</span>
          {inConstellation && closeStr
            ? <span style={{ ...body, fontSize: '15px', color: at.ghost }}> days &middot; runs to {closeStr} &middot; the shared close</span>
            : <span style={{ ...body, fontSize: '15px', color: at.ghost }}> of {window} days</span>}
        </div>
        {streak > 1 && (
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: at.brass, textTransform: 'uppercase' }}>
            {streak} days running
          </div>
        )}
      </div>

      {/* Habit dots */}
      {dots.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '20px' }}>
          {dots.map(d => (
            <span key={d.key} title={d.key}
              style={{
                width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0,
                background: d.filled ? GOLD_C : 'transparent',
                border: d.filled ? `1px solid ${GOLD_C}` : `1px solid rgba(234,241,237,0.18)`,
                boxShadow: d.isToday ? `0 0 0 2px rgba(217,178,74,0.30)` : 'none',
                opacity: d.future ? 0.5 : 1,
              }} />
          ))}
        </div>
      )}

      {complete ? (
        <div style={{ ...body, fontSize: '15px', color: at.brass, paddingTop: '4px' }}>Completed.</div>
      ) : (
        <div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: at.ghost, textTransform: 'uppercase', marginBottom: '12px' }}>
            Today
          </div>
          {strands.map(s => {
            const done = doneToday.has(s.id)
            const cadence = CADENCE_LABEL[s.cadence] || ''
            return (
              <div key={s.id} style={{ padding: '10px 0 16px', borderBottom: hair }}>
                <div style={{ ...body, fontSize: '1.0625rem', color: 'rgba(234,241,237,0.85)', lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.55 : 1, transition: 'all 0.25s' }}>
                  {s.text}
                  {cadence && (
                    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: at.ghost, marginLeft: '10px', whiteSpace: 'nowrap', display: 'inline-block', textDecoration: 'none' }}>{cadence}</span>
                  )}
                </div>
                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  {done ? (
                    <>
                      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: at.verdigris, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '26px', padding: '9px 18px' }}>
                        Complete for today
                      </span>
                      <button type="button" onClick={() => toggle(s.id)} disabled={busy === s.id}
                        style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: at.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        undo
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => toggle(s.id)} disabled={busy === s.id}
                      style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0F241D', background: at.verdigris, border: 'none', borderRadius: '26px', padding: '12px 24px', cursor: 'pointer', opacity: busy === s.id ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                      I did this today
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: hair }}>
            {!finishing ? (
              <button type="button" onClick={() => setFinishing(true)}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: at.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Mark the whole challenge complete
              </button>
            ) : (
              <div>
                <div style={{ ...body, fontSize: '14px', color: 'rgba(234,241,237,0.66)', lineHeight: 1.55, marginBottom: '12px' }}>
                  This closes the whole challenge, not just today. Today's check-in is the button above.
                </div>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: at.ghost, textTransform: 'uppercase', marginBottom: '10px' }}>How did it go?</div>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '10px' }}>
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                    style={{ marginTop: '3px', accentColor: GOLD_C, width: '15px', height: '15px', flexShrink: 0 }} />
                  <span style={{ ...body, fontSize: '15px', color: 'rgba(234,241,237,0.78)', lineHeight: 1.5 }}>
                    Share how it went with {p.author?.name || 'the author'} (optional)
                  </span>
                </label>
                {consent && (
                  <div style={{ marginBottom: '10px' }}>
                    <textarea value={reflection} onChange={e => setReflection(e.target.value)} rows={3}
                      placeholder="What happened — in your words"
                      style={{ ...body, fontSize: '15px', color: at.text, width: '100%', boxSizing: 'border-box', background: at.object, border: hair, borderRadius: '10px', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
                    <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', marginTop: '8px' }}>
                      <input type="checkbox" checked={attributed} onChange={e => setAttributed(e.target.checked)}
                        style={{ accentColor: GOLD_C, width: '15px', height: '15px', flexShrink: 0 }} />
                      <span style={{ ...body, fontSize: '14px', color: at.ghost }}>Show my name with it</span>
                    </label>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                  <button type="button" onClick={finish} disabled={savingDone}
                    style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', color: '#fff', background: at.brass, border: 'none', borderRadius: '30px', padding: '9px 22px', cursor: 'pointer', opacity: savingDone ? 0.5 : 1 }}>
                    {savingDone ? 'Saving…' : 'Finish the whole challenge'}
                  </button>
                  <button type="button" onClick={() => setFinishing(false)}
                    style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: at.ghost, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave — the mistake-acceptor's way out. Quiet by design: a foot-of-card
          affordance, one confirm, done. Past check-ins stay recorded; taking
          the challenge on again later picks the same thread back up. */}
      {!localComplete && p.status === 'active' && (
        <div style={{ marginTop: '14px' }}>
          {leaving === 'confirm' ? (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...body, fontSize: '14px', color: at.ghost }}>
                Leave this challenge? Your check-ins stay recorded, and you can take it on again any time.
              </span>
              <button type="button"
                onClick={async () => {
                  setLeaving('busy')
                  try {
                    const r = await actorCallsRaw({ action: 'leave', userId, call_id: p.call_id })
                    const d = await r.json()
                    if (r.ok && d.left) { onLeft && onLeft(p.participant_id) }
                    else setLeaving('confirm')
                  } catch { setLeaving('confirm') }
                }}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#8A3030', background: 'none', border: '1px solid rgba(138,48,48,0.4)', borderRadius: '20px', padding: '4px 14px', cursor: 'pointer' }}>
                {leaving === 'busy' ? 'Leaving…' : 'Yes, leave'}
              </button>
              <button type="button" onClick={() => setLeaving(false)}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: at.ghost, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setLeaving('confirm')}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: at.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.75 }}>
              Leave this challenge
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyChallenges() {
  const { user }  = useAuth()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [founding, setFounding] = useState({ ids: new Set(), closes_on: null })

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let live = true
    Promise.all([
      actorCallsRaw({ action: 'my_participations', userId: user.id }).then(r => r.json()),
      // the constellation: runs inside it share one close, not private clocks
      fetch('/api/beacon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'breakdown', slug: 'founding-nature' }),
      }).then(r => r.json()).catch(() => null),
    ])
      .then(([d, bd]) => {
        if (!live) return
        setRows(d.participations || [])
        if (bd && bd.rooted) {
          setFounding({
            ids: new Set((bd.challenges || []).map(c => c.call_id)),
            closes_on: bd.closes_on || null,
          })
        }
      })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [user])

  return (
    <div style={{ minHeight: '100dvh', background: at.ground }}>
      <Nav />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 22px 80px' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: at.brass, textTransform: 'uppercase', marginBottom: '8px' }}>
          Your challenges
        </div>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: '38px', color: at.text, lineHeight: 1.1, margin: '0 0 28px' }}>
          What you've taken on
        </h1>

        {user && (
          <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
            <Link to="/challenges/browse" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: at.brass, textTransform: 'uppercase', textDecoration: 'none' }}>
              Browse challenges
            </Link>
            <Link to="/challenges/new" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: at.brass, textTransform: 'uppercase', textDecoration: 'none' }}>
              + Author a challenge
            </Link>
          </div>
        )}

        {!user ? (
          <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7 }}>
            Sign in to see the challenges you've taken on.
          </p>
        ) : loading ? (
          <p style={{ ...body, fontSize: '1.0625rem', color: at.ghost }}>Loading…</p>
        ) : rows.length === 0 ? (
          <div style={{ background: at.object, border: hair, borderRadius: '14px', padding: '32px 28px' }}>
            <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: '0 0 6px' }}>
              You haven't taken on a challenge yet.
            </p>
            <p style={{ ...body, fontSize: '15px', color: at.ghost, lineHeight: 1.65, margin: 0 }}>
              <Link to="/challenges/browse" style={{ color: at.brass }}>Browse challenges</Link> and take one on. It starts a clock the day you join, and it appears here.
            </p>
          </div>
        ) : (
          rows.map(p => <ChallengeCard key={p.participant_id} p={p} userId={user.id} founding={founding}
            onLeft={pid => setRows(prev => prev.filter(r => r.participant_id !== pid))} />)
        )}
      </div>
    </div>
  )
}
