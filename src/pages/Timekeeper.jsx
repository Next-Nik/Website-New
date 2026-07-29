// src/pages/Timekeeper.jsx
//
// TIMEKEEPER — a plain time tracker: start/stop entries with categories, a
// week view, and running totals. Its own standalone tool with its own front
// door in the Profile panel (ProfileMissionPanel.jsx), alongside Admin
// Console, Movie Magic, Care Protocol, The Practice, Homecoming and Prism
// Lab. The route (/time) is unlinked from all other navigation, same as its
// siblings.
//
// UI gate mirrors The Practice's founder check (tolerant of either metadata
// source so the founder cannot be locked out). Real enforcement is RLS in
// sql/190_timekeeper.sql, which requires app_metadata only — the same
// two-layer model every hidden tool in this app uses.
//
// Cross-tool read, by design: Care Protocol's synthesis and The Practice's
// reflections may read a trends-only summary of tracked time via
// buildTimeContext() (src/lib/timekeeper) — aggregate hours by category and
// tracked-day cadence, never entry descriptions. That is the ONLY thing
// anything outside this file reads from time_entries/time_categories, and
// nothing here is reachable from any card, snapshot, or public route.
//
// Two rules this page inherits from its siblings and keeps on purpose:
// totals are measurements, not verdicts (no targets, no streaks, no
// colour-coded judgement of a day); and every action is one press with its
// own confirmation.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'
import { fn, fnText, space, shadow, mono } from '../lib/designTokens'
import * as engine from '../lib/timekeeper'

// Tolerant UI gate. RLS is the real boundary (sql/190_timekeeper.sql).
const isFounder = (user) =>
  user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'

/* ── gate ─────────────────────────────────────────────────── */
export function TimekeeperPage() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading || user === undefined) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.loadingTape}>OPENING TIMEKEEPER…</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isFounder(user)) return <Navigate to="/" replace />

  return <TimekeeperWorkspace user={user} />
}

export default TimekeeperPage

/* ── workspace ────────────────────────────────────────────── */

const ENTRY_WINDOW_DAYS = 60 // enough for the week view and the 30-day context

function TimekeeperWorkspace({ user }) {
  const [entries, setEntries] = useState(null)
  const [categories, setCategories] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const floor = new Date(Date.now() - ENTRY_WINDOW_DAYS * 864e5).toISOString()
      const [entriesRes, catsRes] = await Promise.all([
        supabase
          .from('time_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('started_at', floor)
          .order('started_at', { ascending: false })
          .limit(1000),
        supabase
          .from('time_categories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
      ])
      if (cancelled) return
      // Same house rule as The Practice's load: a read failure is not an
      // empty log. Refuse to render an empty tracker over a real one.
      if (entriesRes.error || catsRes.error) {
        setLoadError(
          entriesRes.error?.message || catsRes.error?.message || 'Could not read the time log',
        )
        return
      }
      setEntries(entriesRes.data || [])
      setCategories(catsRes.data || [])
    })()
    return () => { cancelled = true }
  }, [user.id])

  /* one-second tick while a timer runs, so durations count up live */
  const running = engine.runningEntry(entries)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!running) return undefined
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [running?.id])

  /* form state */
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [manualDay, setManualDay] = useState(engine.dayKeyOf(new Date()))
  const [manualStart, setManualStart] = useState('')
  const [manualEnd, setManualEnd] = useState('')
  const [weekAnchor, setWeekAnchor] = useState(() => engine.mondayOf(new Date()))

  /* ── data operations — each returns true/false so LogButton owns its
        confirmation, same contract as The Practice ── */

  const insertEntry = useCallback(async (row) => {
    const { data, error } = await supabase
      .from('time_entries')
      .insert({ user_id: user.id, ...row })
      .select('*')
      .single()
    if (error || !data) {
      console.error('[timekeeper] insert failed:', error?.message || error)
      return null
    }
    setEntries((e) => [data, ...(e || [])])
    return data
  }, [user.id])

  const stopEntry = useCallback(async (entry, at) => {
    const endedAt = (at || new Date()).toISOString()
    const { data, error } = await supabase
      .from('time_entries')
      .update({ ended_at: endedAt })
      .eq('id', entry.id)
      .eq('user_id', user.id)
      .select('*')
      .single()
    if (error || !data) {
      console.error('[timekeeper] stop failed:', error?.message || error)
      return false
    }
    setEntries((e) => (e || []).map((x) => (x.id === data.id ? data : x)))
    return true
  }, [user.id])

  const deleteEntry = useCallback(async (entry) => {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entry.id)
      .eq('user_id', user.id)
    if (error) {
      console.error('[timekeeper] delete failed:', error?.message || error)
      return false
    }
    setEntries((e) => (e || []).filter((x) => x.id !== entry.id))
    return true
  }, [user.id])

  // Start = stop whatever is running (Toggl's rule: one timer at a time),
  // then open the new entry.
  const startTimer = useCallback(async (description, category) => {
    const current = engine.runningEntry(entries)
    if (current) {
      const stopped = await stopEntry(current)
      if (!stopped) return false
    }
    const row = await insertEntry({
      description: (description || '').trim(),
      category: category || '',
      started_at: new Date().toISOString(),
      ended_at: null,
    })
    return Boolean(row)
  }, [entries, insertEntry, stopEntry])

  const addCategory = useCallback(async (name) => {
    const trimmed = (name || '').trim()
    if (!trimmed) return false
    const { data, error } = await supabase
      .from('time_categories')
      .insert({ user_id: user.id, name: trimmed })
      .select('*')
      .single()
    if (error || !data) {
      console.error('[timekeeper] category insert failed:', error?.message || error)
      return false
    }
    setCategories((c) => [...(c || []), data])
    return true
  }, [user.id])

  const setCategoryArchived = useCallback(async (category, archived) => {
    const { data, error } = await supabase
      .from('time_categories')
      .update({ archived })
      .eq('id', category.id)
      .eq('user_id', user.id)
      .select('*')
      .single()
    if (error || !data) {
      console.error('[timekeeper] category update failed:', error?.message || error)
      return false
    }
    setCategories((c) => (c || []).map((x) => (x.id === data.id ? data : x)))
    return true
  }, [user.id])

  if (loadError) {
    return (
      <div style={S.app}>
        <div style={S.topbar}>
          <div style={S.brand}>TIMEKEEPER</div>
        </div>
        <div style={S.main}>
          <Panel eyebrow="TIMEKEEPER" note="Where the hours actually go. Founder-only.">
            <p style={{ ...fnText.body, color: fn.ink, margin: `0 0 ${space.md}` }}>
              The time log could not be read just now — it is still on the
              server, unchanged. Reload rather than re-entering anything.
            </p>
            <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>{loadError}</p>
          </Panel>
        </div>
      </div>
    )
  }

  if (!entries || !categories) {
    return (
      <div style={S.app}>
        <div style={S.topbar}>
          <div style={S.brand}>TIMEKEEPER</div>
        </div>
        <div style={S.main}>
          <p style={{ ...fnText.body, color: fn.ghost }}>Loading the time log…</p>
        </div>
      </div>
    )
  }

  const now = new Date()
  const todayKey = engine.dayKeyOf(now)
  const todaysEntries = engine.entriesForDay(entries, todayKey)
  const todayTotal = todaysEntries.reduce((a, e) => a + engine.durationSeconds(e, now), 0)
  const activeCategories = categories.filter((c) => !c.archived)
  const pairs = engine.recentPairs(entries)

  const weekKeys = engine.weekDayKeys(weekAnchor)
  const weekTotals = engine.dayTotals(entries, weekKeys, now)
  const weekTotal = weekKeys.reduce((a, k) => a + weekTotals[k], 0)
  const weekCats = engine.categoryTotals(entries, weekKeys, now)
  const thisMonday = engine.mondayOf(now)
  const onThisWeek = engine.dayKeyOf(weekAnchor) === engine.dayKeyOf(thisMonday)
  const shiftWeek = (deltaDays) => {
    const d = new Date(weekAnchor)
    d.setDate(d.getDate() + deltaDays)
    setWeekAnchor(engine.mondayOf(d))
  }

  const manualValid = Boolean(engine.manualSpan(manualDay, manualStart, manualEnd))

  return (
    <div style={S.app}>
      <div style={S.topbar}>
        <div style={S.brand}>TIMEKEEPER</div>
        <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>
          Where the hours actually go. Founder-only · never on any shared card.
        </p>
      </div>
      <div style={S.main}>

      {/* 1 · the timer */}
      <Panel
        eyebrow="THE TIMER"
        note="One timer at a time. Starting a new one stops the last — a definite number for every span, no gaps to reconstruct later."
      >
        {running && (
          <div style={{ padding: space.md, background: fn.mossTint, borderLeft: `2px solid ${fn.mossEdge}`, borderRadius: '2px', marginBottom: space.md }}>
            <p style={{ ...fnText.eyebrow, margin: '0 0 4px' }}>RUNNING</p>
            <p style={{ ...fnText.body, color: fn.ink, margin: 0 }}>
              {running.description || 'Untitled'}
              {running.category ? ` · ${running.category}` : ''}
            </p>
            <p style={{ ...mono, fontSize: '22px', color: fn.ink, margin: `${space.sm} 0 0` }}>
              {engine.fmtClock(engine.durationSeconds(running, now))}
            </p>
            <p style={{ ...fnText.caption, color: fn.ghost, margin: `4px 0 0` }}>
              since {engine.fmtTimeOfDay(running.started_at)}
              {engine.dayKeyOf(running.started_at) !== todayKey ? ` (${engine.dayKeyOf(running.started_at)})` : ''}
            </p>
            <div style={{ marginTop: space.md }}>
              <LogButton label="Stop" doneLabel="✓ Stopped" onLog={() => stopEntry(running)} />
            </div>
          </div>
        )}
        <Field label="What">
          <input
            type="text"
            value={desc}
            placeholder="What is the time going to?"
            onChange={(e) => setDesc(e.target.value)}
            maxLength={200}
            style={S.input}
          />
        </Field>
        <Field label="Category">
          <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setCat('')}
              style={cat === '' ? S.chipActive : S.chip}
            >
              (none)
            </button>
            {activeCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.name)}
                style={cat === c.name ? S.chipActive : S.chip}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Field>
        <LogButton
          label={running ? 'Stop that · start this' : 'Start'}
          doneLabel="✓ Running"
          disabled={!desc.trim()}
          onLog={async () => {
            const ok = await startTimer(desc, cat)
            if (ok) setDesc('')
            return ok
          }}
        />
        {!desc.trim() && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
            Name it first — one line is enough.
          </p>
        )}
        {pairs.length > 0 && (
          <div style={{ marginTop: space.lg }}>
            <p style={{ ...fnText.eyebrow, margin: `0 0 ${space.sm}` }}>CONTINUE</p>
            <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
              {pairs.map((p) => (
                <LogButton
                  key={`${p.description}››${p.category}`}
                  label={`⟳ ${p.description}${p.category ? ` · ${p.category}` : ''}`}
                  doneLabel="✓ Running"
                  onLog={() => startTimer(p.description, p.category)}
                />
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* 2 · today */}
      <Panel
        eyebrow="TODAY"
        note="What has been recorded so far. A mistaken entry is deleted, not edited — add the correct one by hand below."
      >
        {todaysEntries.length === 0 && !running && (
          <p style={{ ...fnText.caption, color: fn.ghost, margin: 0 }}>
            Nothing recorded yet today.
          </p>
        )}
        {todaysEntries.map((e) => (
          <EntryRow
            key={e.id}
            entry={e}
            now={now}
            onContinue={e.ended_at ? () => startTimer(e.description, e.category) : null}
            onDelete={() => deleteEntry(e)}
          />
        ))}
        {todaysEntries.length > 0 && (
          <p style={{ ...fnText.body, color: fn.ink, margin: `${space.md} 0 0` }}>
            Today so far: <strong>{engine.fmtHours(todayTotal)}</strong>
          </p>
        )}
        <div style={{ borderTop: `1px solid ${fn.rule}`, marginTop: space.lg, paddingTop: space.lg }}>
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            style={{ ...fnText.caption, color: fn.ghost, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {showManual ? 'Hide manual entry' : 'Add an entry by hand — a span that ran untracked'}
          </button>
          {showManual && (
            <div style={{ marginTop: space.md }}>
              <Field label="Day">
                <input
                  type="date"
                  value={manualDay}
                  onChange={(e) => setManualDay(e.target.value)}
                  style={S.input}
                />
              </Field>
              <div style={{ display: 'flex', gap: space.md }}>
                <div style={{ flex: 1 }}>
                  <Field label="From">
                    <input
                      type="time"
                      value={manualStart}
                      onChange={(e) => setManualStart(e.target.value)}
                      style={S.input}
                    />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="To">
                    <input
                      type="time"
                      value={manualEnd}
                      onChange={(e) => setManualEnd(e.target.value)}
                      style={S.input}
                    />
                  </Field>
                </div>
              </div>
              <p style={{ ...fnText.caption, color: fn.ghost, margin: `0 0 ${space.md}` }}>
                Uses the What and Category fields above. An end time at or
                before the start is read as crossing midnight.
              </p>
              <LogButton
                label="Add the entry"
                doneLabel="✓ Added"
                disabled={!manualValid || !desc.trim()}
                onLog={async () => {
                  const span = engine.manualSpan(manualDay, manualStart, manualEnd)
                  if (!span) return false
                  const row = await insertEntry({
                    description: desc.trim(),
                    category: cat || '',
                    ...span,
                  })
                  if (row) {
                    setDesc('')
                    setManualStart('')
                    setManualEnd('')
                  }
                  return Boolean(row)
                }}
              />
              {(!manualValid || !desc.trim()) && (
                <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
                  Needs the What line above plus a day, a from and a to.
                </p>
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* 3 · the week */}
      <Panel
        eyebrow="THE WEEK"
        note="Totals per day and per category. Measurements, not verdicts — there is no target line here, on purpose."
      >
        <div style={{ display: 'flex', gap: space.sm, alignItems: 'center', marginBottom: space.md, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => shiftWeek(-7)} style={S.chip}>‹ earlier</button>
          <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', color: fn.meta }}>
            {onThisWeek ? 'THIS WEEK' : `WEEK OF ${engine.dayKeyOf(weekAnchor)}`}
          </span>
          {!onThisWeek && (
            <button type="button" onClick={() => setWeekAnchor(engine.mondayOf(new Date()))} style={S.chip}>
              this week
            </button>
          )}
          <button
            type="button"
            onClick={() => shiftWeek(7)}
            disabled={onThisWeek}
            style={{ ...S.chip, ...(onThisWeek ? { color: fn.ghost, cursor: 'default' } : {}) }}
          >
            later ›
          </button>
        </div>
        {weekKeys.map((k) => (
          <div key={k} style={{ display: 'flex', gap: space.md, alignItems: 'baseline', marginBottom: '4px' }}>
            <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.1em', color: k === todayKey ? fn.ink : fn.ghost, minWidth: '84px' }}>
              {k === todayKey ? 'TODAY' : engine.dayLabel(k).toUpperCase()}
            </span>
            <span style={{ ...fnText.body, fontSize: '15px', color: weekTotals[k] > 0 ? fn.ink : fn.ghost }}>
              {weekTotals[k] > 0 ? engine.fmtHours(weekTotals[k]) : '·'}
            </span>
          </div>
        ))}
        <p style={{ ...fnText.body, color: fn.ink, margin: `${space.md} 0 0` }}>
          Week total: <strong>{engine.fmtHours(weekTotal)}</strong>
        </p>
        {weekCats.length > 0 && (
          <div style={{ borderTop: `1px solid ${fn.rule}`, marginTop: space.lg, paddingTop: space.lg }}>
            <p style={{ ...fnText.eyebrow, margin: `0 0 ${space.sm}` }}>BY CATEGORY</p>
            {weekCats.map(({ category, seconds }) => (
              <div key={category || '(none)'} style={{ display: 'flex', gap: space.md, alignItems: 'baseline', marginBottom: '4px' }}>
                <span style={{ ...fnText.body, fontSize: '15px', color: fn.ink, flex: 1 }}>
                  {category || '(none)'}
                </span>
                <span style={{ ...mono, fontSize: '13px', color: fn.meta }}>
                  {engine.fmtHours(seconds)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* 4 · categories */}
      <Panel
        eyebrow="CATEGORIES"
        note="A short list beats a taxonomy. Archiving removes a category from the picker; every entry keeps the name it was tracked under."
      >
        <div style={{ display: 'flex', gap: space.sm }}>
          <input
            type="text"
            value={newCategory}
            placeholder="New category"
            onChange={(e) => setNewCategory(e.target.value)}
            maxLength={60}
            style={{ ...S.input, marginBottom: 0 }}
          />
          <LogButton
            label="Add"
            doneLabel="✓ Added"
            disabled={
              !newCategory.trim() ||
              categories.some((c) => c.name.toLowerCase() === newCategory.trim().toLowerCase() && !c.archived)
            }
            onLog={async () => {
              const ok = await addCategory(newCategory)
              if (ok) setNewCategory('')
              return ok
            }}
          />
        </div>
        {categories.length > 0 && (
          <div style={{ marginTop: space.md }}>
            {categories.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: space.md, alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ ...fnText.body, fontSize: '15px', color: c.archived ? fn.ghost : fn.ink, flex: 1 }}>
                  {c.name}{c.archived ? ' · archived' : ''}
                </span>
                <LogButton
                  label={c.archived ? 'Restore' : 'Archive'}
                  doneLabel="✓"
                  onLog={() => setCategoryArchived(c, !c.archived)}
                />
              </div>
            ))}
          </div>
        )}
      </Panel>
      </div>
    </div>
  )
}

/* One entry row: times, description, category, duration, continue, delete.
   Delete asks once inline (arm-then-confirm) rather than with a modal —
   consistent with the one-press-one-confirmation grammar of the siblings. */
function EntryRow({ entry, now, onContinue, onDelete }) {
  const [armed, setArmed] = useState(false)
  const armTimer = useRef(null)
  useEffect(() => () => { if (armTimer.current) clearTimeout(armTimer.current) }, [])
  const secs = engine.durationSeconds(entry, now)
  return (
    <div style={{ display: 'flex', gap: space.md, alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap' }}>
      <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.06em', color: fn.ghost, minWidth: '96px' }}>
        {engine.fmtTimeOfDay(entry.started_at)}–{entry.ended_at ? engine.fmtTimeOfDay(entry.ended_at) : 'now'}
      </span>
      <span style={{ ...fnText.body, fontSize: '15px', color: fn.ink, flex: 1, minWidth: '160px' }}>
        {entry.description || 'Untitled'}
        {entry.category ? (
          <span style={{ color: fn.meta }}> · {entry.category}</span>
        ) : null}
      </span>
      <span style={{ ...mono, fontSize: '13px', color: fn.meta }}>{engine.fmtHours(secs)}</span>
      {onContinue && (
        <button type="button" onClick={onContinue} title="Start this again" style={S.rowAction}>
          ⟳
        </button>
      )}
      <button
        type="button"
        title={armed ? 'Press again to delete' : 'Delete this entry'}
        onClick={() => {
          if (!armed) {
            setArmed(true)
            armTimer.current = setTimeout(() => setArmed(false), 2600)
            return
          }
          if (armTimer.current) clearTimeout(armTimer.current)
          setArmed(false)
          onDelete()
        }}
        style={{ ...S.rowAction, ...(armed ? { color: fn.clay, borderColor: fn.clayEdge } : {}) }}
      >
        {armed ? 'sure?' : '×'}
      </button>
    </div>
  )
}

/* Timekeeper's log button. Same state machine as The Practice's — a copy in
   miniature, not an import: this tool has its own front door and should not
   depend on another hidden tool's internals to render. */
function LogButton({ label, doneLabel = '✓ Logged', onLog, disabled }) {
  const [status, setStatus] = useState('idle')
  const resetRef = useRef(null)
  useEffect(() => () => { if (resetRef.current) clearTimeout(resetRef.current) }, [])
  const handleClick = async () => {
    if (resetRef.current) { clearTimeout(resetRef.current); resetRef.current = null }
    setStatus('saving')
    const ok = await onLog()
    if (ok) {
      setStatus('done')
      resetRef.current = setTimeout(() => setStatus('idle'), 2200)
    } else {
      setStatus('error')
    }
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || status === 'saving'}
      style={{
        ...mono, fontSize: '13px', letterSpacing: '0.08em', fontWeight: 600,
        padding: '5px 14px', borderRadius: '2px',
        cursor: disabled || status === 'saving' ? 'default' : 'pointer',
        background: status === 'done' ? fn.moss : status === 'error' ? fn.clay : 'transparent',
        color: status === 'done' || status === 'error' ? fn.object : disabled ? fn.ghost : fn.ink,
        border: `1px solid ${status === 'done' ? fn.moss : status === 'error' ? fn.clay : fn.rule}`,
      }}
    >
      {status === 'saving' ? 'Working…' : status === 'done' ? doneLabel : status === 'error' ? 'Try again' : label}
    </button>
  )
}

/* ── shared small UI (duplicated in miniature from the sibling hidden
   tools, not imported from them) ── */

function Panel({ eyebrow, note, children }) {
  return (
    <section style={S.panel}>
      <div style={{ ...fnText.eyebrow, marginBottom: note ? '4px' : space.lg }}>{eyebrow}</div>
      {note && <p style={{ ...fnText.caption, color: fn.ghost, margin: `0 0 ${space.lg}` }}>{note}</p>}
      {children}
    </section>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: space.lg }}>
      <label style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', color: fn.meta, display: 'block', marginBottom: '5px' }}>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  )
}

/* ── styles — the subset this page uses, matching the sibling tools' tokens
   so it reads as part of the same family ── */
const S = {
  app: { minHeight: '100dvh', background: fn.ground, paddingBottom: space.huge },
  loadingWrap: {
    minHeight: '100dvh', background: fn.ground,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  loadingTape: { ...mono, fontSize: '13px', letterSpacing: '0.2em', color: fn.ghost },
  topbar: {
    display: 'flex', flexDirection: 'column', gap: space.sm,
    padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${fn.rule}`,
    background: fn.object, position: 'sticky', top: 0, zIndex: 5,
  },
  brand: { fontFamily: mono.fontFamily, fontSize: '20px', color: fn.ink, letterSpacing: '0.04em' },
  main: { maxWidth: '720px', margin: '0 auto', padding: space.xl },
  panel: {
    background: fn.object, border: `1px solid ${fn.rule}`, borderTop: `3px solid ${fn.moss}`,
    borderRadius: '2px', padding: space.xl, marginBottom: space.xl, boxShadow: shadow.fn.rest,
  },
  input: {
    width: '100%', boxSizing: 'border-box', background: fn.ground,
    border: `1px solid ${fn.rule}`, borderRadius: '2px', padding: space.md,
    ...fnText.body, fontSize: '15px', color: fn.ink, marginBottom: space.sm,
  },
  chip: {
    ...mono, fontSize: '13px', letterSpacing: '0.06em', cursor: 'pointer',
    padding: `5px ${space.md}`, background: 'transparent', color: fn.ink,
    border: `1px dashed ${fn.rule}`, borderRadius: '2px',
  },
  chipActive: {
    ...mono, fontSize: '13px', letterSpacing: '0.06em', cursor: 'pointer',
    padding: `5px ${space.md}`, background: fn.moss, color: fn.object,
    border: `1px solid ${fn.moss}`, borderRadius: '2px',
  },
  rowAction: {
    ...mono, fontSize: '13px', cursor: 'pointer',
    padding: '2px 8px', background: 'transparent', color: fn.ghost,
    border: `1px solid ${fn.rule}`, borderRadius: '2px',
  },
}
