// /challenges — the challenges a person has taken on (Phase 3b, June 2026).
//
// The home for joined challenges, separate from a person's own personal
// stretch and their own Planet Sprint. Reads the participation engine
// (Phase 3): each card shows the frozen strands, a habit-dot strip across
// the window, a running-days count, and today's strands to check off.
// Scale is never shown — a challenge just plugs into your days.

import { useState, useEffect, useMemo } from 'react'
import { Link }       from 'react-router-dom'
import { Nav }        from '../../components/Nav'
import { useAuth }    from '../../hooks/useAuth'
import { tokens, serif, body, sc } from '../../lib/designTokens'

const GOLD_C = tokens.goldChrome
const hair   = '1px solid rgba(200,146,42,0.18)'
const muted  = { color: 'rgba(15,21,35,0.78)' }

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

function ChallengeCard({ p, userId }) {
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
      await fetch('/api/actor-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_feedback', userId, call_id: p.call_id,
          consent,
          reflection:            consent && reflection.trim() ? reflection.trim() : null,
          reflection_public:     consent && !!reflection.trim(),
          reflection_attributed: consent && attributed,
        }),
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
      await fetch('/api/actor-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_strand', userId, call_id: p.call_id, strand_id: strandId, done: willBeDone }),
      })
    } catch {
      // revert on failure
      const revert = new Set(doneToday)
      setDoneToday(revert)
    }
    setBusy(null)
  }

  const author = p.author?.name

  return (
    <div style={{ background: tokens.bgCard, border: hair, borderRadius: '14px', padding: '24px 26px', marginBottom: '20px' }}>
      {/* Title + byline */}
      <div style={{ marginBottom: '16px' }}>
        {p.slug ? (
          <Link to={`/stretch/c/${p.slug}`} style={{ textDecoration: 'none' }}>
            <h2 style={{ ...serif, fontWeight: 300, fontSize: '26px', color: tokens.dark, lineHeight: 1.2, margin: 0 }}>{p.title}</h2>
          </Link>
        ) : (
          <h2 style={{ ...serif, fontWeight: 300, fontSize: '26px', color: tokens.dark, lineHeight: 1.2, margin: 0 }}>{p.title}</h2>
        )}
        {author && (
          <div style={{ ...body, fontSize: '14px', color: tokens.ghost, marginTop: '4px' }}>Offered by {author}</div>
        )}
      </div>

      {/* Clock + streak */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <span style={{ ...serif, fontWeight: 300, fontSize: '34px', color: tokens.dark, lineHeight: 1 }}>{complete ? window : dayNo}</span>
          <span style={{ ...body, fontSize: '15px', color: tokens.ghost }}> of {window} days</span>
        </div>
        {streak > 1 && (
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.gold, textTransform: 'uppercase' }}>
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
                border: d.filled ? `1px solid ${GOLD_C}` : `1px solid rgba(15,21,35,0.16)`,
                boxShadow: d.isToday ? `0 0 0 2px rgba(200,146,42,0.30)` : 'none',
                opacity: d.future ? 0.5 : 1,
              }} />
          ))}
        </div>
      )}

      {complete ? (
        <div style={{ ...body, fontSize: '15px', color: tokens.gold, paddingTop: '4px' }}>Completed.</div>
      ) : (
        <div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: tokens.ghost, textTransform: 'uppercase', marginBottom: '12px' }}>
            Today
          </div>
          {strands.map(s => {
            const done = doneToday.has(s.id)
            const cadence = CADENCE_LABEL[s.cadence] || ''
            return (
              <label key={s.id}
                style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', padding: '8px 0', borderBottom: hair }}>
                <input type="checkbox" checked={done} disabled={busy === s.id}
                  onChange={() => toggle(s.id)}
                  style={{ marginTop: '4px', accentColor: GOLD_C, flexShrink: 0, width: '16px', height: '16px' }} />
                <span style={{ flex: 1 }}>
                  <span style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.82)', lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.45 : 1, transition: 'all 0.25s' }}>
                    {s.text}
                  </span>
                  {cadence && (
                    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: tokens.ghost, marginLeft: '10px', whiteSpace: 'nowrap' }}>{cadence}</span>
                  )}
                </span>
              </label>
            )
          })}

          <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: hair }}>
            {!finishing ? (
              <button type="button" onClick={() => setFinishing(true)}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textTransform: 'uppercase' }}>
                Mark complete
              </button>
            ) : (
              <div>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.ghost, textTransform: 'uppercase', marginBottom: '10px' }}>How did it go?</div>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '10px' }}>
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                    style={{ marginTop: '3px', accentColor: GOLD_C, width: '15px', height: '15px', flexShrink: 0 }} />
                  <span style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.78)', lineHeight: 1.5 }}>
                    Share how it went with {p.author?.name || 'the author'} (optional)
                  </span>
                </label>
                {consent && (
                  <div style={{ marginBottom: '10px' }}>
                    <textarea value={reflection} onChange={e => setReflection(e.target.value)} rows={3}
                      placeholder="What happened — in your words"
                      style={{ ...body, fontSize: '15px', color: tokens.dark, width: '100%', boxSizing: 'border-box', background: tokens.bgCard, border: hair, borderRadius: '10px', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
                    <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', marginTop: '8px' }}>
                      <input type="checkbox" checked={attributed} onChange={e => setAttributed(e.target.checked)}
                        style={{ accentColor: GOLD_C, width: '15px', height: '15px', flexShrink: 0 }} />
                      <span style={{ ...body, fontSize: '14px', color: tokens.ghost }}>Show my name with it</span>
                    </label>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                  <button type="button" onClick={finish} disabled={savingDone}
                    style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', color: '#fff', background: tokens.gold, border: 'none', borderRadius: '30px', padding: '9px 22px', cursor: 'pointer', opacity: savingDone ? 0.5 : 1 }}>
                    {savingDone ? 'Saving…' : 'Complete challenge'}
                  </button>
                  <button type="button" onClick={() => setFinishing(false)}
                    style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.ghost, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
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

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let live = true
    fetch('/api/actor-calls', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'my_participations', userId: user.id }),
    })
      .then(r => r.json())
      .then(d => { if (live) setRows(d.participations || []) })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [user])

  return (
    <div style={{ minHeight: '100dvh', background: tokens.bg }}>
      <Nav />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 22px 80px' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: tokens.gold, textTransform: 'uppercase', marginBottom: '8px' }}>
          Your challenges
        </div>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: '38px', color: tokens.dark, lineHeight: 1.1, margin: '0 0 28px' }}>
          What you've taken on
        </h1>

        {user && (
          <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
            <Link to="/challenges/browse" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.gold, textTransform: 'uppercase', textDecoration: 'none' }}>
              Browse challenges
            </Link>
            <Link to="/challenges/new" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.gold, textTransform: 'uppercase', textDecoration: 'none' }}>
              + Author a challenge
            </Link>
          </div>
        )}

        {!user ? (
          <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7 }}>
            Sign in to see the challenges you've taken on.
          </p>
        ) : loading ? (
          <p style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost }}>Loading…</p>
        ) : rows.length === 0 ? (
          <div style={{ background: tokens.bgCard, border: hair, borderRadius: '14px', padding: '32px 28px' }}>
            <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, margin: '0 0 6px' }}>
              You haven't taken on a challenge yet.
            </p>
            <p style={{ ...body, fontSize: '15px', color: tokens.ghost, lineHeight: 1.65, margin: 0 }}>
              <Link to="/challenges/browse" style={{ color: tokens.gold }}>Browse challenges</Link> and take one on. It starts a clock the day you join, and it appears here.
            </p>
          </div>
        ) : (
          rows.map(p => <ChallengeCard key={p.participant_id} p={p} userId={user.id} />)
        )}
      </div>
    </div>
  )
}
