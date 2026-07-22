// ─────────────────────────────────────────────────────────────
// WinTheDay.jsx
//
// The Get To Do morning beat, rebuilt as a real open-and-close loop.
//
//   Set    · one line: "What's the one thing that would make today
//            a win?" You write it. Then, optionally, bonus wins.
//   Play   · the day in motion. The one win sits at the top with a
//            check; bonus wins below. Close each loop as you land it.
//
// Everything writes to get_to_do_items (migration 136), the same
// table the Mission Control Get To Do tile reads, so there is one
// source of truth. The one win is a daily item with is_priority=true
// and due_date=today; bonus wins are is_priority=false. "Done" is
// completed_at. No new table.
//
// What winning means here lives behind the ⓘ, not as a screen you
// have to walk through: winning with, not over. Effort and being,
// not outcome.
//
// Props:
//   userId       · optional; resolved from auth if absent
//   sprintData   · target_sprint rows; source of optional quick-adds
//   onComplete   · () => void   (walk advances / panel closes)
//   onClose      · () => void   (back without finishing)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'

const GOLD     = '#6E7F5C'
const GOLD_DK  = '#262420'
const INK      = '#0F1523'
const SC       = "'IBM Plex Mono', Georgia, serif"
const BODY     = "'Newsreader', Georgia, serif"
const DISP     = "'Fraunces', Georgia, serif"
const META     = 'rgba(15,21,35,0.72)'
const FAINT    = 'rgba(15,21,35,0.55)'
const RULE     = 'rgba(76,107,69,0.20)'
const TINT     = 'rgba(76,107,69,0.05)'

const DOMAIN_LABELS = {
  path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
  connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal',
}

// ── date helpers · mirror GetToDoMissionPanel so the daily lane
//    reconciles identically (week runs Mon–Sun) ─────────────────
function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function weekAnchor(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return localDateStr(d)
}

// ── small flame mark (presentation attributes only, no style=) ──
function Flame({ size = 16, lit = false }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 32 40" aria-hidden="true">
      <path
        d="M16 2 C16 2 27 13 27 24 C27 31.2 22.1 37 16 37 C9.9 37 5 31.2 5 24 C5 16.5 11 10.5 13.2 6.5 C14.3 4.5 16 2 16 2 Z"
        fill="#E8901A" fillOpacity={lit ? 0.95 : 0.32}
      />
    </svg>
  )
}

export default function WinTheDay({ userId: userIdProp = null, sprintData = null, onComplete = () => {}, onClose = () => {} }) {
  const [uid, setUid]         = useState(userIdProp)
  const [loaded, setLoaded]   = useState(false)
  const [beat, setBeat]       = useState('set')   // 'set' | 'play'
  const [showWhy, setShowWhy] = useState(false)
  const [busy, setBusy]       = useState(false)

  // The one win + the bonus wins (rows from get_to_do_items).
  const [winItem, setWinItem]   = useState(null)   // is_priority=true row, or null
  const [bonus, setBonus]       = useState([])     // is_priority=false rows
  const [winDraft, setWinDraft] = useState('')
  const [bonusDraft, setBonusDraft] = useState('')

  const today = localDateStr()

  // Optional quick-adds from the active Stretch.
  const stretchPicks = []
  if (Array.isArray(sprintData) && sprintData.length > 0) {
    const sp = sprintData[0]
    const doms = sp.domains || []
    const dd   = sp.domain_data || {}
    for (const domId of doms) {
      const tasks = (dd[domId] || {}).tasks || []
      tasks.forEach((t, ti) => {
        const text = (t.text || t || '').toString().trim()
        if (text) stretchPicks.push({ key: `${domId}-${ti}`, text, dom_id: domId })
      })
    }
  }

  // ── load ──────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    async function load() {
      let id = userIdProp
      if (!id) {
        try {
          const { data } = await supabase.auth.getUser()
          id = data?.user?.id || null
        } catch { id = null }
      }
      if (!alive) return
      setUid(id)
      if (!id) { setLoaded(true); return }

      try {
        const { data: rows } = await supabase
          .from('get_to_do_items')
          .select('*')
          .eq('user_id', id).eq('kind', 'daily').eq('due_date', today)
          .order('sort_order', { ascending: true })
        const list = rows || []
        const win  = list.find(r => r.is_priority) || null
        const rest = list.filter(r => !r.is_priority)
        if (!alive) return
        setWinItem(win)
        setBonus(rest)
        setWinDraft(win ? win.body : '')
        // If the day's win is already set, resume straight into Play.
        setBeat(win ? 'play' : 'set')
      } catch { /* fall through to empty set */ }
      setLoaded(true)
    }
    load()
    return () => { alive = false }
  }, [userIdProp, today])

  // ── writes ────────────────────────────────────────────────
  async function saveWin() {
    const text = winDraft.trim()
    if (!text || !uid || busy) return
    setBusy(true)
    try {
      if (winItem) {
        await supabase.from('get_to_do_items')
          .update({ body: text, updated_at: new Date().toISOString() })
          .eq('id', winItem.id)
        setWinItem({ ...winItem, body: text })
      } else {
        const row = {
          user_id: uid, kind: 'daily', body: text, is_priority: true,
          due_date: today, week_anchor: weekAnchor(), sort_order: 0,
        }
        const { data } = await supabase.from('get_to_do_items').insert(row).select().single()
        if (data) setWinItem(data)
      }
      setBeat('play')
    } catch { /* keep them on the set beat to retry */ }
    setBusy(false)
  }

  async function addBonus(text) {
    const t = (text || bonusDraft).trim()
    if (!t || !uid) return
    const order = bonus.reduce((mx, r) => Math.max(mx, r.sort_order || 0), 1) + 1
    const row = {
      user_id: uid, kind: 'daily', body: t, is_priority: false,
      due_date: today, week_anchor: weekAnchor(), sort_order: order,
    }
    try {
      const { data } = await supabase.from('get_to_do_items').insert(row).select().single()
      if (data) setBonus(prev => [...prev, data])
    } catch { /* no-op */ }
    setBonusDraft('')
  }

  async function removeBonus(id) {
    setBonus(prev => prev.filter(r => r.id !== id))
    try { await supabase.from('get_to_do_items').delete().eq('id', id) } catch { /* no-op */ }
  }

  async function toggleDone(item, isWin) {
    const done = !item.completed_at
    const stamp = done ? new Date().toISOString() : null
    if (isWin) setWinItem({ ...item, completed_at: stamp })
    else setBonus(prev => prev.map(r => r.id === item.id ? { ...r, completed_at: stamp } : r))
    try {
      await supabase.from('get_to_do_items')
        .update({ completed_at: stamp, updated_at: new Date().toISOString() })
        .eq('id', item.id)
    } catch { /* optimistic; will reconcile on next load */ }
  }

  // ── chrome ────────────────────────────────────────────────
  const header = (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontFamily: SC, fontSize: '13px', letterSpacing: '0.18em', color: GOLD_DK, textTransform: 'uppercase' }}>
          Get To Do · Win the Day
        </span>
        <button
          onClick={() => setShowWhy(s => !s)}
          aria-label="What winning means here"
          style={{
            fontFamily: SC, fontSize: '13px', width: '18px', height: '18px',
            borderRadius: '50%', border: `1px solid ${RULE}`, background: 'none',
            color: GOLD, cursor: 'pointer', lineHeight: 1, padding: 0,
          }}
        >i</button>
      </div>
      <button
        onClick={onClose}
        style={{ fontFamily: SC, fontSize: '13px', letterSpacing: '0.16em', background: 'none', border: 'none', color: FAINT, cursor: 'pointer', padding: 0 }}
      >BACK</button>
    </div>
  )

  const why = showWhy && (
    <div style={{ padding: '14px 16px', marginBottom: '16px', background: TINT, border: `1px solid ${RULE}`, borderRadius: '10px' }}>
      <p style={{ fontFamily: BODY, fontSize: '14px', color: META, lineHeight: 1.7, margin: 0 }}>
        Winning here is winning with, not winning over. No one to beat, nothing to outdo
        except your own past limits. The question is whether you showed up as your most
        powerful self. The action is yours; the outcome isn’t.
      </p>
    </div>
  )

  if (!loaded) {
    return (
      <div>
        {header}
        <p style={{ fontFamily: BODY, fontSize: '14px', color: FAINT, textAlign: 'center', padding: '30px 0' }}>Finding today…</p>
      </div>
    )
  }

  if (!uid) {
    return (
      <div>
        {header}
        <p style={{ fontFamily: BODY, fontSize: '14px', color: FAINT, textAlign: 'center', padding: '24px 0' }}>
          Sign in to set today’s win.
        </p>
      </div>
    )
  }

  // ── SET ───────────────────────────────────────────────────
  if (beat === 'set') {
    const ready = winDraft.trim().length > 0
    return (
      <div>
        {header}
        {why}

        <p style={{ fontFamily: DISP, fontSize: '1.375rem', color: INK, lineHeight: 1.35, margin: '0 0 12px' }}>
          What’s the one thing that would make today a win?
        </p>
        <textarea
          value={winDraft}
          onChange={e => setWinDraft(e.target.value)}
          rows={2}
          placeholder="Name it. One clear thing."
          style={{
            width: '100%', padding: '12px 14px', fontFamily: BODY, fontSize: '15px',
            color: INK, background: TINT, border: `1.5px solid ${RULE}`, borderRadius: '10px',
            outline: 'none', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box',
          }}
        />

        {/* bonus wins */}
        <p style={{ fontFamily: SC, fontSize: '13px', letterSpacing: '0.16em', color: GOLD_DK, textTransform: 'uppercase', margin: '22px 0 4px' }}>
          Bonus wins
        </p>
        <p style={{ fontFamily: BODY, fontSize: '13px', color: FAINT, margin: '0 0 10px' }}>
          Optional. The extras that would make today even better.
        </p>

        {bonus.map(b => (
          <div key={b.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 12px', marginBottom: '6px',
            border: `1px solid ${RULE}`, borderRadius: '8px', background: TINT,
          }}>
            <span style={{ flex: 1, fontFamily: BODY, fontSize: '14px', color: META, lineHeight: 1.4 }}>{b.body}</span>
            <button
              onClick={() => removeBonus(b.id)}
              aria-label="Remove"
              style={{ fontFamily: SC, fontSize: '14px', background: 'none', border: 'none', color: FAINT, cursor: 'pointer', padding: '0 2px' }}
            >✕</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <input
            value={bonusDraft}
            onChange={e => setBonusDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addBonus() }}
            placeholder="Add a bonus win…"
            style={{
              flex: 1, padding: '10px 12px', fontFamily: BODY, fontSize: '14px',
              color: META, background: TINT, border: `1px dashed rgba(76,107,69,0.30)`,
              borderRadius: '8px', outline: 'none',
            }}
          />
          <button
            onClick={() => addBonus()}
            disabled={!bonusDraft.trim()}
            style={{
              fontFamily: SC, fontSize: '15px', padding: '0 16px',
              border: `1px solid ${RULE}`, borderRadius: '8px', background: 'none',
              color: GOLD_DK, cursor: 'pointer', opacity: bonusDraft.trim() ? 1 : 0.4,
            }}
          >+</button>
        </div>

        {stretchPicks.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <p style={{ fontFamily: SC, fontSize: '13px', letterSpacing: '0.14em', color: FAINT, textTransform: 'uppercase', margin: '0 0 8px' }}>
              From your Stretch
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {stretchPicks.slice(0, 6).map(p => (
                <button
                  key={p.key}
                  onClick={() => addBonus(p.text)}
                  style={{
                    fontFamily: BODY, fontSize: '13px', color: META,
                    padding: '6px 11px', border: `1px solid ${RULE}`, borderRadius: '40px',
                    background: 'none', cursor: 'pointer',
                  }}
                >+ {p.text}</button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={saveWin}
          disabled={!ready || busy}
          style={{
            width: '100%', padding: '13px', marginTop: '22px',
            fontFamily: SC, fontSize: '15px', letterSpacing: '0.14em',
            color: ready ? '#FFFFFF' : GOLD_DK, background: ready ? GOLD : TINT,
            border: `1.5px solid ${ready ? GOLD : RULE}`, borderRadius: '40px',
            cursor: ready ? 'pointer' : 'default', opacity: busy ? 0.6 : 1, transition: 'all 0.2s',
          }}
        >
          Lock it in →
        </button>
      </div>
    )
  }

  // ── PLAY ──────────────────────────────────────────────────
  const winDone = winItem && !!winItem.completed_at
  return (
    <div>
      {header}
      {why}

      <p style={{ fontFamily: SC, fontSize: '13px', letterSpacing: '0.18em', color: GOLD_DK, textTransform: 'uppercase', margin: '0 0 12px' }}>
        Today’s win
      </p>

      {winItem && (
        <button
          onClick={() => toggleDone(winItem, true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px', width: '100%', textAlign: 'left',
            padding: '16px 16px', marginBottom: '18px', cursor: 'pointer',
            border: `1.5px solid ${winDone ? GOLD : RULE}`, borderRadius: '12px',
            background: winDone ? 'rgba(76,107,69,0.10)' : TINT,
          }}
        >
          <span style={{
            flexShrink: 0, width: '34px', height: '34px', borderRadius: '50%',
            border: `1.5px solid ${winDone ? GOLD : 'rgba(76,107,69,0.55)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: winDone ? GOLD : 'transparent',
          }}>
            {winDone
              ? <span style={{ color: '#FFFFFF', fontFamily: SC, fontSize: '16px', lineHeight: 1 }}>✓</span>
              : <Flame size={16} />}
          </span>
          <span style={{
            flex: 1, fontFamily: DISP, fontSize: '1.25rem', color: INK, lineHeight: 1.4,
            textDecoration: winDone ? 'line-through' : 'none', opacity: winDone ? 0.7 : 1,
          }}>
            {winItem.body}
          </span>
        </button>
      )}

      {bonus.length > 0 && (
        <>
          <p style={{ fontFamily: SC, fontSize: '13px', letterSpacing: '0.16em', color: FAINT, textTransform: 'uppercase', margin: '0 0 8px' }}>
            Bonus
          </p>
          {bonus.map(b => {
            const done = !!b.completed_at
            return (
              <button
                key={b.id}
                onClick={() => toggleDone(b, false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left',
                  padding: '11px 13px', marginBottom: '6px', cursor: 'pointer',
                  border: `1px solid ${RULE}`, borderRadius: '8px',
                  background: done ? 'rgba(76,107,69,0.07)' : 'none',
                }}
              >
                <span style={{
                  flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%',
                  border: `1.5px solid ${done ? GOLD : 'rgba(76,107,69,0.45)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? GOLD : 'transparent',
                }}>
                  {done && <span style={{ color: '#FFFFFF', fontFamily: SC, fontSize: '13px', lineHeight: 1 }}>✓</span>}
                </span>
                <span style={{
                  flex: 1, fontFamily: BODY, fontSize: '14px', color: META, lineHeight: 1.4,
                  textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.65 : 1,
                }}>
                  {b.body}
                </span>
              </button>
            )
          })}
        </>
      )}

      <p style={{ fontFamily: BODY, fontSize: '13px', color: FAINT, lineHeight: 1.6, margin: '16px 0 0', textAlign: 'center' }}>
        {winDone ? 'The day is won. Anything else is a bonus.' : 'Close each loop as you land it. The check is the win.'}
      </p>

      <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
        <button
          onClick={() => setBeat('set')}
          style={{
            flex: 1, padding: '12px', fontFamily: SC, fontSize: '14px', letterSpacing: '0.12em',
            color: GOLD_DK, background: 'none', border: `1px solid ${RULE}`, borderRadius: '40px', cursor: 'pointer',
          }}
        >
          Edit
        </button>
        <button
          onClick={onComplete}
          style={{
            flex: 2, padding: '12px', fontFamily: SC, fontSize: '14px', letterSpacing: '0.14em',
            color: '#FFFFFF', background: GOLD, border: `1.5px solid ${GOLD}`, borderRadius: '40px', cursor: 'pointer',
          }}
        >
          Done →
        </button>
      </div>
    </div>
  )
}
