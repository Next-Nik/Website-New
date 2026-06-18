// ─────────────────────────────────────────────────────────────
// GetToDoMissionPanel.jsx
//
// The Get To Do daily instrument (personal / becoming rail).
//
// Four views, one tab strip:
//   • Today    — every active item, stretch + daily, in one order
//   • Stretch  — items projected from the active Target Stretch
//   • Calendar — read-only iCal embed (unchanged)
//   • Daily    — items the user writes into the day, weekly-scoped
//
// One global sort_order spans Stretch + Daily, so each list is a
// filtered slice of the same order and a move on any list moves on
// Today too. Completion is persisted; checked items leave the
// active views and gather in the Completed pile (its own link).
//
// Lifecycle:
//   • Daily items carry the Monday of their week. The whole daily
//     list (done and undone) clears at the Sunday-night boundary.
//   • Stretch items are reconciled from the live stretch on load:
//     new ones appear, edited text updates, removed ones drop. A
//     stretch item stays completed until it leaves the stretch.
//
// Stretch identity: Target Stretch stores milestones/tasks as plain
// objects with no id. We lazily stamp a stable id into the stretch
// JSON on first projection (Target Stretch preserves unknown fields
// through its spread-based saves), then key projected rows by
// 'sprintId:itemId'. No Target Stretch change, no backfill migration.
//
// Consistency: opt-in per tool. When on, a quiet "days shown up"
// line shows, derived from daily_tool_activity (logged on completion,
// survives the weekly wipe). No score is stored; nothing is forced.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../hooks/useSupabase'
import {
  GOLD, GOLD_DK, GOLD_RULE,
  TEXT_INK, TEXT_META,
  FONT_SC, FONT_BODY,
} from './tokens'

const sc   = { fontFamily: FONT_SC }
const body = { fontFamily: FONT_BODY }

const TOOL_KEY = 'get_to_do'

const DOMAIN_LABELS = {
  path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
  connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal',
}

// ─── Date helpers ─────────────────────────────────────────────

function getLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Monday that begins the week containing `date`. Week runs Mon–Sun;
// the daily list clears at the Sunday-night boundary, when the next
// Monday's anchor supersedes the last.
function getWeekAnchor(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = (d.getDay() + 6) % 7   // Sun=6, Mon=0, Tue=1, …
  d.setDate(d.getDate() - offset)
  return getLocalDateStr(d)
}

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// ─── Stretch projection ───────────────────────────────────────
// Walks the active stretch session(s), stamps stable ids where
// missing (writing them back into the stretch JSON), and returns
// the flat list of source items the projection should mirror.

async function buildStretchSources(sprintData) {
  if (!Array.isArray(sprintData) || !sprintData.length) return []
  const sources = []

  for (const sprint of sprintData) {
    const sprintId = sprint.id
    const domData  = sprint.domain_data || {}
    const domains  = Array.isArray(sprint.domains) ? sprint.domains : []
    let dirty = false

    for (const domId of domains) {
      const dd = domData[domId]
      if (!dd) continue
      const milestones = Array.isArray(dd.milestones) ? dd.milestones : []
      const tasks      = Array.isArray(dd.tasks) ? dd.tasks : []

      milestones.forEach((m) => {
        if (m && typeof m === 'object' && !m.id) { m.id = genId(); dirty = true }
        const text = (m && (m.text ?? m)) || ''
        const id   = (m && m.id) || `m-${text.slice(0, 24)}`
        if (text) sources.push({ source_key: `${sprintId}:${id}`, body: text, domId })
      })
      tasks.forEach((t) => {
        if (t && typeof t === 'object' && !t.id) { t.id = genId(); dirty = true }
        const text = (t && (t.text ?? t)) || ''
        const id   = (t && t.id) || `t-${text.slice(0, 24)}`
        if (text) sources.push({ source_key: `${sprintId}:${id}`, body: text, domId })
      })
    }

    // Persist freshly-stamped ids so identity is stable next load.
    if (dirty) {
      try {
        await supabase
          .from('target_sprint_sessions')
          .update({ domain_data: domData })
          .eq('id', sprintId)
      } catch { /* non-fatal: ids re-stamp next load */ }
    }
  }
  return sources
}

// Reconcile projected stretch rows against the live sources:
// insert new, update changed text, delete those no longer present.
async function reconcileStretch(userId, sources, existingStretchRows, maxOrder) {
  const byKey = new Map(existingStretchRows.map(r => [r.source_key, r]))
  const liveKeys = new Set(sources.map(s => s.source_key))
  let order = maxOrder

  const inserts = []
  for (const s of sources) {
    const row = byKey.get(s.source_key)
    if (!row) {
      order += 1
      inserts.push({
        user_id: userId, kind: 'stretch', body: s.body,
        source_key: s.source_key, sort_order: order,
      })
    } else if (row.body !== s.body) {
      await supabase.from('get_to_do_items')
        .update({ body: s.body, updated_at: new Date().toISOString() })
        .eq('id', row.id)
    }
  }
  if (inserts.length) {
    await supabase.from('get_to_do_items').insert(inserts)
  }

  // Drop rows whose source item left the stretch (or stretch ended).
  const stale = existingStretchRows.filter(r => !liveKeys.has(r.source_key)).map(r => r.id)
  if (stale.length) {
    await supabase.from('get_to_do_items').delete().in('id', stale)
  }
}

// ─── Main export ──────────────────────────────────────────────

export default function GetToDoMissionPanel({ userId, sprintData }) {
  const navigate = useNavigate()

  const [tab, setTab]               = useState('today')   // today | stretch | calendar | daily
  const [showCompleted, setShowCompleted] = useState(false)
  const [items, setItems]           = useState([])        // active rows (incomplete, current)
  const [completed, setCompleted]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [reorder, setReorder]       = useState(false)
  const [draft, setDraft]           = useState('')
  const [draftPriority, setDraftPriority] = useState(false)
  const [adding, setAdding]         = useState(false)

  const [showConsistency, setShowConsistency] = useState(false)
  const [streak, setStreak]         = useState(0)

  // Map source_key → domain, for grouping the stretch view.
  const domByKey = useRef(new Map())

  async function load() {
    if (!userId) { setLoading(false); return }
    setLoading(true)

    // 1. Clear last week's daily items (done and undone).
    const anchor = getWeekAnchor()
    await supabase.from('get_to_do_items')
      .delete().eq('user_id', userId).eq('kind', 'daily').lt('week_anchor', anchor)

    // 2. Project the active stretch.
    const sources = await buildStretchSources(sprintData)
    domByKey.current = new Map(sources.map(s => [s.source_key, s.domId]))

    const { data: allRows } = await supabase
      .from('get_to_do_items').select('*').eq('user_id', userId)
    const rows = allRows || []
    const stretchRows = rows.filter(r => r.kind === 'stretch')
    const maxOrder = rows.reduce((mx, r) => Math.max(mx, r.sort_order || 0), 0)
    await reconcileStretch(userId, sources, stretchRows, maxOrder)

    // 3. Re-read the reconciled set.
    const { data: fresh } = await supabase
      .from('get_to_do_items').select('*')
      .eq('user_id', userId).order('sort_order', { ascending: true })
    const all = fresh || []
    setItems(all.filter(r => !r.completed_at))
    setCompleted(all.filter(r => r.completed_at)
      .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')))

    // 4. Consistency pref + streak.
    const { data: prof } = await supabase
      .from('contributor_profiles_beta').select('daily_consistency')
      .eq('user_id', userId).maybeSingle()
    const on = !!(prof?.daily_consistency && prof.daily_consistency[TOOL_KEY])
    setShowConsistency(on)
    if (on) setStreak(await computeStreak(userId))

    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [userId])

  // ── Mutations ───────────────────────────────────────────────

  async function addDaily() {
    const text = draft.trim()
    if (!text || !userId || adding) return
    setAdding(true)
    const maxOrder = items.reduce((mx, r) => Math.max(mx, r.sort_order || 0), 0)
    const row = {
      user_id: userId, kind: 'daily', body: text,
      sort_order: maxOrder + 1, week_anchor: getWeekAnchor(),
      is_priority: draftPriority,
    }
    const { data } = await supabase.from('get_to_do_items').insert(row).select().single()
    if (data) setItems(prev => [...prev, data])
    setDraft('')
    setDraftPriority(false)
    setAdding(false)
  }

  async function togglePriority(item) {
    const next = !item.is_priority
    setItems(prev => prev.map(r => r.id === item.id ? { ...r, is_priority: next } : r))
    await supabase.from('get_to_do_items')
      .update({ is_priority: next, updated_at: new Date().toISOString() })
      .eq('id', item.id)
  }

  async function toggleComplete(item, done) {
    const stamp = done ? new Date().toISOString() : null
    await supabase.from('get_to_do_items')
      .update({ completed_at: stamp, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (done) {
      await logActivity(userId)
      setItems(prev => prev.filter(r => r.id !== item.id))
      setCompleted(prev => [{ ...item, completed_at: stamp }, ...prev])
      if (showConsistency) setStreak(await computeStreak(userId))
    } else {
      setCompleted(prev => prev.filter(r => r.id !== item.id))
      setItems(prev => [...prev, { ...item, completed_at: null }]
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
    }
  }

  async function removeDaily(item) {
    await supabase.from('get_to_do_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(r => r.id !== item.id))
    setCompleted(prev => prev.filter(r => r.id !== item.id))
  }

  // Move an item up/down within the currently-visible (filtered) list.
  // We set its sort_order to sit between the visible neighbours, so the
  // single global order — and therefore Today — stays coherent.
  async function move(list, item, dir) {
    const idx = list.findIndex(r => r.id === item.id)
    const tgt = idx + dir
    if (tgt < 0 || tgt >= list.length) return

    let newOrder
    if (dir < 0) {
      const above = list[tgt]
      const aboveAbove = list[tgt - 1]
      newOrder = aboveAbove ? (above.sort_order + aboveAbove.sort_order) / 2
                            : above.sort_order - 1
    } else {
      const below = list[tgt]
      const belowBelow = list[tgt + 1]
      newOrder = belowBelow ? (below.sort_order + belowBelow.sort_order) / 2
                            : below.sort_order + 1
    }

    setItems(prev => prev.map(r => r.id === item.id ? { ...r, sort_order: newOrder } : r)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
    await supabase.from('get_to_do_items')
      .update({ sort_order: newOrder, updated_at: new Date().toISOString() })
      .eq('id', item.id)
  }

  async function toggleConsistencyPref() {
    const next = !showConsistency
    setShowConsistency(next)
    if (next) setStreak(await computeStreak(userId))
    const { data: prof } = await supabase
      .from('contributor_profiles_beta').select('daily_consistency')
      .eq('user_id', userId).maybeSingle()
    const map = { ...(prof?.daily_consistency || {}), [TOOL_KEY]: next }
    await supabase.from('contributor_profiles_beta')
      .update({ daily_consistency: map }).eq('user_id', userId)
  }

  // ── Derived lists ───────────────────────────────────────────
  const stretchItems = items.filter(r => r.kind === 'stretch')
  const dailyItems   = items.filter(r => r.kind === 'daily')

  // ── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '28px 24px', ...body, fontSize: '14px', color: TEXT_META }}>
        Gathering what's yours to do…
      </div>
    )
  }

  if (showCompleted) {
    return (
      <div style={{ padding: '18px 24px' }}>
        <button onClick={() => setShowCompleted(false)} style={linkBtn}>
          ← BACK TO LIST
        </button>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em',
          color: GOLD_DK, margin: '18px 0 14px' }}>
          COMPLETED PILE
        </div>
        {completed.length === 0 ? (
          <p style={{ ...body, fontSize: '14px', color: TEXT_META, lineHeight: 1.6 }}>
            Nothing here yet. Checked items gather here until they clear.
          </p>
        ) : completed.map(item => (
          <Row key={item.id} item={item} done
            onToggle={() => toggleComplete(item, false)}
            onRemove={item.kind === 'daily' ? () => removeDaily(item) : null} />
        ))}
      </div>
    )
  }

  const TABS = [
    ['today', 'Today'], ['stretch', 'Stretch'],
    ['calendar', 'Calendar'], ['daily', 'Daily'],
  ]

  return (
    <div style={{ padding: '14px 24px 20px' }}>

      {/* Tab strip */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: `1px solid ${GOLD_RULE}`,
        marginBottom: '18px' }}>
        {TABS.map(([key, label]) => {
          const on = tab === key
          return (
            <button key={key} onClick={() => { setTab(key); setReorder(false) }}
              style={{
                ...sc, fontSize: '12px', letterSpacing: '0.12em',
                textTransform: 'uppercase', background: 'none', border: 'none',
                cursor: 'pointer', padding: '8px 12px',
                color: on ? GOLD_DK : TEXT_META,
                borderBottom: on ? `2px solid ${GOLD}` : '2px solid transparent',
                marginBottom: '-1px',
              }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Consistency line */}
      {showConsistency && tab !== 'calendar' && (
        <ConsistencyLine streak={streak} onToggle={toggleConsistencyPref} />
      )}

      {/* ── TODAY ── */}
      {tab === 'today' && (
        <ListView
          rows={items} reorder={reorder} setReorder={setReorder}
          emptyMsg="Nothing on the list yet. Add something in Daily, or set a Target Stretch to pull items in."
          domByKey={domByKey.current}
          onToggle={toggleComplete} onMove={(it, d, tier) => move(tier, it, d)}
          onStar={togglePriority} onRemove={removeDaily}
        />
      )}

      {/* ── STRETCH ── */}
      {tab === 'stretch' && (
        stretchItems.length === 0 ? (
          <Empty
            message="No stretch items yet. Set a Target Stretch and its milestones and tasks surface here."
            linkLabel="Open Target Stretch →" onLink={() => navigate('/tools/target-sprint')}
          />
        ) : (
          <ListView
            rows={stretchItems} reorder={reorder} setReorder={setReorder}
            domByKey={domByKey.current}
            onToggle={toggleComplete} onMove={(it, d, tier) => move(tier, it, d)}
            onStar={togglePriority}
          />
        )
      )}

      {/* ── CALENDAR ── */}
      {tab === 'calendar' && <CalendarSection userId={userId} />}

      {/* ── DAILY ── */}
      {tab === 'daily' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addDaily() }}
              placeholder="Write something for the day…"
              style={{
                flex: 1, ...body, fontSize: '14px', padding: '9px 12px',
                borderRadius: '6px', border: `1px solid ${GOLD_RULE}`,
                outline: 'none', background: '#FFFFFF', color: TEXT_INK,
              }}
            />
            <button onClick={() => setDraftPriority(p => !p)}
              aria-label={draftPriority ? 'Adding as important' : 'Add as important'}
              title="Mark especially important"
              style={{
                ...starBtn, fontSize: '18px', padding: '0 4px',
                color: draftPriority ? GOLD_DK : TEXT_META,
              }}>
              {draftPriority ? '★' : '☆'}
            </button>
            <button onClick={addDaily} disabled={!draft.trim() || adding}
              style={{
                ...sc, fontSize: '11px', letterSpacing: '0.12em',
                padding: '9px 16px', borderRadius: '40px', border: 'none',
                background: draft.trim() && !adding ? GOLD : GOLD_RULE,
                color: '#FFFFFF', cursor: draft.trim() ? 'pointer' : 'not-allowed',
              }}>
              ADD
            </button>
          </div>
          {dailyItems.length === 0 ? (
            <p style={{ ...body, fontSize: '14px', color: TEXT_META, lineHeight: 1.6 }}>
              Your written-on-the-day list. It clears every Sunday night.
            </p>
          ) : (
            <ListView
              rows={dailyItems} reorder={reorder} setReorder={setReorder}
              domByKey={domByKey.current}
              onToggle={toggleComplete} onMove={(it, d, tier) => move(tier, it, d)}
              onStar={togglePriority} onRemove={removeDaily}
            />
          )}
        </div>
      )}

      {/* Footer links */}
      <div style={{
        marginTop: '22px', paddingTop: '14px', borderTop: `1px solid ${GOLD_RULE}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={() => setShowCompleted(true)} style={linkBtn}>
          COMPLETED PILE →
        </button>
        {!showConsistency && (
          <button onClick={toggleConsistencyPref} style={{ ...linkBtn, color: TEXT_META }}>
            SHOW CONSISTENCY
          </button>
        )}
      </div>
    </div>
  )
}

// ─── List view (shared by Today / Stretch / Daily) ────────────
// Priority items pin to the top in their own "Important" block; the
// rest follow in manual order. Both blocks are flat and ordered by
// sort_order, so reordering reads true (domain shows as an inline
// tag rather than a section header, which would fight the order).

function ListView({ rows, reorder, setReorder, domByKey, emptyMsg, onToggle, onMove, onStar, onRemove }) {
  if (!rows.length && emptyMsg) {
    return <p style={{ ...body, fontSize: '14px', color: TEXT_META, lineHeight: 1.6 }}>{emptyMsg}</p>
  }

  const byOrder  = (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  const priority = rows.filter(r => r.is_priority).sort(byOrder)
  const rest     = rows.filter(r => !r.is_priority).sort(byOrder)

  const tagFor = (item) => {
    const dom = domByKey?.get(item.source_key)
    return dom ? (DOMAIN_LABELS[dom] || dom) : null
  }

  const renderRow = (item, i, tier) => (
    <Row
      key={item.id}
      item={item}
      reorder={reorder}
      first={i === 0}
      last={i === tier.length - 1}
      tag={tagFor(item)}
      onToggle={(done) => onToggle(item, done)}
      onStar={() => onStar(item)}
      onUp={() => onMove(item, -1, tier)}
      onDown={() => onMove(item, +1, tier)}
      onRemove={item.kind === 'daily' && onRemove ? () => onRemove(item) : null}
    />
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
        <button onClick={() => setReorder(r => !r)} style={{ ...linkBtn, color: reorder ? GOLD_DK : TEXT_META }}>
          {reorder ? 'DONE' : 'REORDER'}
        </button>
      </div>

      {priority.length > 0 && (
        <>
          <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em',
            color: GOLD_DK, marginBottom: '6px' }}>
            IMPORTANT
          </div>
          {priority.map((it, i) => renderRow(it, i, priority))}
          {rest.length > 0 && (
            <div style={{ height: '1px', background: GOLD_RULE, margin: '14px 0 10px' }} />
          )}
        </>
      )}

      {rest.map((it, i) => renderRow(it, i, rest))}
    </div>
  )
}

// ─── A single item row ────────────────────────────────────────

function Row({ item, done, reorder, first, last, tag, onToggle, onStar, onUp, onDown, onRemove }) {
  const isDone = done || !!item.completed_at
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '9px 10px', marginBottom: '3px', borderRadius: '8px',
      background: isDone ? 'rgba(200,146,42,0.05)' : 'transparent',
    }}>
      {/* Checkbox */}
      <button onClick={() => onToggle?.(!isDone)} aria-label={isDone ? 'Mark not done' : 'Mark done'}
        style={{
          width: '16px', height: '16px', flexShrink: 0, marginTop: '3px', padding: 0,
          borderRadius: '4px', cursor: 'pointer',
          border: isDone ? 'none' : `1.5px solid ${TEXT_META}`,
          background: isDone ? GOLD_DK : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {isDone && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6L8 1" stroke="#FFFFFF" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          ...body, fontSize: '14px', lineHeight: 1.45,
          color: isDone ? TEXT_META : TEXT_INK,
          textDecoration: isDone ? 'line-through' : 'none',
        }}>
          {item.body}
        </div>
        {tag && (
          <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em',
            color: TEXT_META, textTransform: 'uppercase', marginTop: '3px' }}>
            {tag}
          </div>
        )}
      </div>

      {/* Star — mark especially important (not shown on completed items) */}
      {onStar && !isDone && (
        <button onClick={onStar}
          aria-label={item.is_priority ? 'Unmark important' : 'Mark important'}
          style={{ ...starBtn, color: item.is_priority ? GOLD_DK : TEXT_META }}>
          {item.is_priority ? '★' : '☆'}
        </button>
      )}

      {/* Reorder controls */}
      {reorder && (
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          <button onClick={onUp} disabled={first} style={chevron(first)} aria-label="Move up">▲</button>
          <button onClick={onDown} disabled={last} style={chevron(last)} aria-label="Move down">▼</button>
        </div>
      )}

      {/* Remove (daily, completed pile) */}
      {!reorder && done && onRemove && (
        <button onClick={onRemove} style={{ ...linkBtn, color: TEXT_META, fontSize: '10px' }}>
          REMOVE
        </button>
      )}
    </div>
  )
}

// ─── Consistency line ─────────────────────────────────────────

function ConsistencyLine({ streak, onToggle }) {
  const label = streak === 0
    ? 'Showing up starts today.'
    : `${streak} day${streak === 1 ? '' : 's'} in a row showing up.`
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: '10px', marginBottom: '16px', padding: '8px 12px',
      borderRadius: '8px', background: 'rgba(200,146,42,0.05)',
    }}>
      <span style={{ ...body, fontSize: '13px', color: TEXT_META }}>{label}</span>
      <button onClick={onToggle} style={{ ...linkBtn, color: TEXT_META, fontSize: '10px' }}>
        HIDE
      </button>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────

function Empty({ message, linkLabel, onLink }) {
  return (
    <div style={{ padding: '14px 0' }}>
      <p style={{ ...body, fontSize: '14px', color: TEXT_META, lineHeight: 1.65, margin: '0 0 16px' }}>
        {message}
      </p>
      {linkLabel && (
        <button onClick={onLink} style={{
          ...sc, fontSize: '11px', letterSpacing: '0.14em',
          background: 'none', border: `1px solid ${GOLD_RULE}`,
          borderRadius: '40px', padding: '8px 18px', color: GOLD_DK, cursor: 'pointer',
        }}>
          {linkLabel}
        </button>
      )}
    </div>
  )
}

// ─── Calendar section (read-only iCal — unchanged behaviour) ───

function CalendarSection({ userId }) {
  const [icalUrl,    setIcalUrl]    = useState(null)
  const [urlDraft,   setUrlDraft]   = useState('')
  const [showSetup,  setShowSetup]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [calEvents,  setCalEvents]  = useState([])
  const [calLoading, setCalLoading] = useState(false)
  const [calError,   setCalError]   = useState(null)

  useEffect(() => {
    if (!userId) return
    supabase.from('contributor_profiles_beta').select('ical_url')
      .eq('user_id', userId).maybeSingle()
      .then(({ data }) => {
        if (data?.ical_url) { setIcalUrl(data.ical_url); setUrlDraft(data.ical_url) }
        else setShowSetup(true)
      })
  }, [userId])

  useEffect(() => {
    if (!icalUrl || showSetup) return
    let cancelled = false
    setCalLoading(true); setCalError(null)
    fetch('/api/ical-proxy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ical_url: icalUrl, date: getLocalDateStr() }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) setCalError(data.hint || data.error)
        else setCalEvents(data.events || [])
        setCalLoading(false)
      })
      .catch(() => { if (!cancelled) { setCalError('Could not load calendar.'); setCalLoading(false) } })
    return () => { cancelled = true }
  }, [icalUrl, showSetup])

  async function handleSave() {
    if (!urlDraft.trim() || !userId) return
    setSaving(true)
    await supabase.from('contributor_profiles_beta')
      .update({ ical_url: urlDraft.trim() }).eq('user_id', userId)
    setIcalUrl(urlDraft.trim()); setShowSetup(false); setSaving(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: GOLD_DK }}>YOUR DAY</div>
        {icalUrl && !showSetup && (
          <button onClick={() => setShowSetup(true)} style={{ ...linkBtn, color: TEXT_META }}>
            CHANGE CALENDAR
          </button>
        )}
      </div>

      {showSetup ? (
        <div>
          <p style={{ ...body, fontSize: '14px', color: TEXT_META, margin: '0 0 14px', lineHeight: 1.6 }}>
            Paste your private iCal URL. One-time setup, works with Google, Apple, and Outlook.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={urlDraft} onChange={e => setUrlDraft(e.target.value)}
              placeholder="webcal:// or https://…"
              style={{
                flex: 1, ...body, fontSize: '13px', padding: '9px 12px', borderRadius: '6px',
                border: `1px solid ${GOLD_RULE}`, outline: 'none', background: '#FFFFFF', color: TEXT_INK,
              }} />
            <button onClick={handleSave} disabled={!urlDraft.trim() || saving}
              style={{
                ...sc, fontSize: '11px', letterSpacing: '0.12em', padding: '9px 16px',
                borderRadius: '40px', border: 'none',
                background: urlDraft.trim() && !saving ? GOLD : GOLD_RULE,
                color: '#FFFFFF', cursor: urlDraft.trim() ? 'pointer' : 'not-allowed',
              }}>
              {saving ? '…' : 'CONNECT'}
            </button>
          </div>
        </div>
      ) : calLoading ? (
        <div style={{ ...body, fontSize: '13px', color: TEXT_META }}>Loading your calendar…</div>
      ) : calError ? (
        <div style={{ ...body, fontSize: '13px', color: TEXT_META }}>
          {calError}
          <button onClick={() => setShowSetup(true)} style={{ ...linkBtn, marginLeft: '10px' }}>
            UPDATE URL
          </button>
        </div>
      ) : calEvents.length === 0 ? (
        <div style={{ ...body, fontSize: '13px', color: TEXT_META }}>Nothing scheduled for today.</div>
      ) : (
        <div>
          {calEvents.map((evt, i) => (
            <div key={evt.id || i} style={{
              padding: '10px 14px', marginBottom: '6px', borderRadius: '8px',
              borderLeft: `3px solid ${GOLD_RULE}`, background: 'rgba(200,146,42,0.04)',
            }}>
              {evt.time_label && (
                <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: GOLD_DK, marginBottom: '3px' }}>
                  {evt.time_label}
                </div>
              )}
              <div style={{ ...body, fontSize: '14px', color: TEXT_INK, lineHeight: 1.4 }}>{evt.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Activity log + streak ────────────────────────────────────

async function logActivity(userId) {
  if (!userId) return
  try {
    await supabase.from('daily_tool_activity')
      .upsert({ user_id: userId, tool_key: TOOL_KEY, active_date: getLocalDateStr() },
        { onConflict: 'user_id,tool_key,active_date' })
  } catch { /* non-fatal */ }
}

async function computeStreak(userId) {
  if (!userId) return 0
  const { data } = await supabase.from('daily_tool_activity')
    .select('active_date').eq('user_id', userId).eq('tool_key', TOOL_KEY)
    .order('active_date', { ascending: false }).limit(400)
  const dates = new Set((data || []).map(r => r.active_date))
  if (!dates.size) return 0
  // Count back from today (or yesterday, so a day with no activity yet
  // doesn't read as a broken streak until it actually lapses).
  let n = 0
  const cur = new Date()
  if (!dates.has(getLocalDateStr(cur))) cur.setDate(cur.getDate() - 1)
  while (dates.has(getLocalDateStr(cur))) { n += 1; cur.setDate(cur.getDate() - 1) }
  return n
}

// ─── Small shared styles ──────────────────────────────────────

const linkBtn = {
  ...sc, fontSize: '11px', letterSpacing: '0.14em',
  background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: GOLD_DK,
}

const starBtn = {
  flexShrink: 0, background: 'none', border: 'none', padding: '0 2px',
  cursor: 'pointer', fontSize: '16px', lineHeight: 1, marginTop: '1px',
}

function chevron(disabled) {
  return {
    ...sc, fontSize: '11px', lineHeight: 1, padding: '3px 6px',
    background: 'none', border: `1px solid ${GOLD_RULE}`, borderRadius: '5px',
    color: disabled ? 'rgba(15,21,35,0.25)' : GOLD_DK,
    cursor: disabled ? 'default' : 'pointer',
  }
}
