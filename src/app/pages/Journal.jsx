// ─────────────────────────────────────────────────────────────
// Journal.jsx — /journal
//
// The user's record of their own becoming.
//
// Two doors:
//   • Write — compose a free-text entry, optionally tagged with
//     one of the seven personal domains. Writes to
//     journal_entries (072_journal_entries.sql).
//   • Read  — single chronological stream merging three sources:
//        journal_entries          ("You wrote")
//        horizon_state_checkins   ("Horizon State · before/after")
//        horizon_practice_entries ("Practice · Hit/Drift/...")
//     The Read view also shows calendar-anchored check-in
//     countdowns at the top — weekly, quarterly, annual —
//     surfaced when the current period has no completed
//     Horizon State after check-in yet.
//
// Substrate: WorldMapSubstrate is rendered behind the page,
// same as Mission Control's personal pole — two layered SVGs
// (star map + Dymaxion) with halo fade and scroll parallax.
//
// Privacy: all reads/writes are user-scoped via Supabase RLS.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import WorldMapSubstrate from '../components/mission-control/WorldMapSubstrate'
import { body, sc } from '../../lib/designTokens'

const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const tokens = {
  bg:        '#FAFAF7',
  ink:       '#0F1523',
  inkSoft:   'rgba(15, 21, 35, 0.78)',
  inkMid:    'rgba(15, 21, 35, 0.60)',
  inkFaint:  'rgba(15, 21, 35, 0.45)',
  gold:      '#C8922A',
  goldDk:    '#A8721A',
  goldRule:  'rgba(200, 146, 42, 0.30)',
  goldFaint: 'rgba(200, 146, 42, 0.15)',
  card:      '#FFFFFF',
}

// ─── The seven personal domains ───────────────────────────────
const DOMAINS = [
  { key: 'path',        label: 'Path' },
  { key: 'spark',       label: 'Spark' },
  { key: 'body',        label: 'Body' },
  { key: 'finances',    label: 'Finances' },
  { key: 'connection',  label: 'Connection' },
  { key: 'inner_game',  label: 'Inner Game' },
  { key: 'signal',      label: 'Signal' },
]
const DOMAIN_LABEL_BY_KEY = Object.fromEntries(DOMAINS.map(d => [d.key, d.label]))

// ─── Date helpers (match HorizonState.jsx exactly) ────────────
function getWeekId(date = new Date()) {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7))
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
}
function getQuarterId(date = new Date()) {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`
}
function getYearId(date = new Date()) {
  return String(date.getFullYear())
}

// ─── Practice entry kind → label ──────────────────────────────
const PRACTICE_KIND_LABEL = {
  hit:             'Hit',
  drift:           'Drift',
  listening_glow:  'Listening',
  receipt:         'Receipt',
}

// ─── Time formatting ──────────────────────────────────────────
function timeOnly(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
function dateLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const that  = new Date(d); that.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today - that) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)   return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

// ─────────────────────────────────────────────────────────────
//                           PAGE
// ─────────────────────────────────────────────────────────────

export default function Journal() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('write')
  const [infoOpen, setInfoOpen] = useState(false)

  // Read-stream data
  const [loading, setLoading] = useState(true)
  const [journalRows, setJournalRows]   = useState([])
  const [hsRows, setHsRows]              = useState([])
  const [hpRows, setHpRows]              = useState([])

  // Write tab state
  const [draft, setDraft]         = useState('')
  const [draftDomain, setDraftDomain] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Redirect to login if not signed in
  useEffect(() => {
    if (authLoading) return
    if (!user) navigate('/login')
  }, [user, authLoading, navigate])

  // Load everything that goes into the Read stream + cadence calc
  useEffect(() => {
    if (authLoading || !user) return
    let cancelled = false
    async function load() {
      setLoading(true)
      // Promise.allSettled — one failure shouldn't nuke the others
      const [jRes, hsRes, hpRes] = await Promise.allSettled([
        supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('horizon_state_checkins')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('horizon_practice_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('occurred_at', { ascending: false })
          .limit(200),
      ])
      if (cancelled) return
      if (jRes.status  === 'fulfilled' && !jRes.value.error)  setJournalRows(jRes.value.data || [])
      if (hsRes.status === 'fulfilled' && !hsRes.value.error) setHsRows(hsRes.value.data || [])
      if (hpRes.status === 'fulfilled' && !hpRes.value.error) setHpRows(hpRes.value.data || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, authLoading])

  // ── Merged stream — newest first ─────────────────────────────
  // Every source mapped to a common shape: { id, kind, when, ... }
  const stream = useMemo(() => {
    const items = []
    for (const r of journalRows) {
      items.push({
        id:     `j-${r.id}`,
        kind:   'journal',
        when:   r.created_at,
        body:   r.body,
        domain: r.domain,
      })
    }
    for (const r of hsRows) {
      // Each checkin row can carry a before and/or an after.
      // Surface them as separate stream items so the user sees
      // exactly when each happened.
      if (r.before_value !== null && r.before_value !== undefined) {
        items.push({
          id:    `hs-b-${r.id}`,
          kind:  'horizon_state_before',
          when:  r.before_at || r.created_at,
          value: r.before_value,
          note:  r.before_note,
        })
      }
      if (r.after_value !== null && r.after_value !== undefined) {
        items.push({
          id:    `hs-a-${r.id}`,
          kind:  'horizon_state_after',
          when:  r.after_at || r.created_at,
          value: r.after_value,
          note:  r.after_note,
        })
      }
    }
    for (const r of hpRows) {
      items.push({
        id:        `hp-${r.id}`,
        kind:      'practice',
        practice:  r.kind,
        when:      r.occurred_at,
        note:      r.note,
        fromWho:   r.from_who,
      })
    }
    items.sort((a, b) => new Date(b.when) - new Date(a.when))
    return items
  }, [journalRows, hsRows, hpRows])

  // ── Cadence — "what's due this period?" ──────────────────────
  // For weekly/quarterly/annual, the period is "complete" if there's
  // any horizon_state_checkin row in this period with an after_value.
  // We surface up to three reminders, top of Read.
  const cadences = useMemo(() => {
    const now = new Date()
    const thisWeekId    = getWeekId(now)
    const thisQuarterId = getQuarterId(now)
    const thisYearId    = getYearId(now)

    const weekDone    = hsRows.some(r => r.week_id    === thisWeekId    && r.after_value !== null && r.after_value !== undefined)
    const quarterDone = hsRows.some(r => r.quarter_id === thisQuarterId && r.after_value !== null && r.after_value !== undefined)
    const yearDone    = hsRows.some(r => r.year_id    === thisYearId    && r.after_value !== null && r.after_value !== undefined)

    return [
      { key: 'week',    label: 'Weekly check-in',    done: weekDone },
      { key: 'quarter', label: 'Quarterly check-in', done: quarterDone },
      { key: 'year',    label: 'Annual check-in',    done: yearDone },
    ]
  }, [hsRows])

  // ── Save a journal entry ─────────────────────────────────────
  async function handleSave() {
    if (!user) return
    const text = draft.trim()
    if (!text) return
    setSaving(true)
    setSaveError(null)
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ user_id: user.id, body: text, domain: draftDomain })
      .select('*')
      .single()
    setSaving(false)
    if (error) {
      setSaveError(error.message || 'Could not save. Try again.')
      return
    }
    // Optimistic prepend; the Read view will reflect the new entry
    if (data) setJournalRows(prev => [data, ...prev])
    setDraft('')
    setDraftDomain(null)
    setTab('read')
  }

  return (
    <div style={{ ...body, background: tokens.bg, minHeight: '100dvh', color: tokens.ink, position: 'relative' }}>
      <WorldMapSubstrate />
      <Nav />

      <main style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: 760,
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) 24px 80px',
      }}>

        {/* ── HEADER ──────────────────────────────────────── */}
        <header style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{
              ...display,
              fontSize: 38,
              lineHeight: 1.15,
              fontWeight: 400,
              margin: 0,
              color: tokens.ink,
            }}>
              Your Journal
            </h1>
            <button
              type="button"
              onClick={() => setInfoOpen(v => !v)}
              aria-label="About the Journal"
              aria-expanded={infoOpen}
              style={{
                background: 'transparent',
                border: `1px solid ${tokens.goldRule}`,
                color: tokens.goldDk,
                width: 22,
                height: 22,
                borderRadius: '50%',
                cursor: 'pointer',
                ...sc,
                fontSize: 12,
                lineHeight: '20px',
                padding: 0,
                fontWeight: 600,
              }}
              title="What is this?"
            >
              i
            </button>
          </div>

          {infoOpen && (
            <div
              role="region"
              aria-label="About the Journal"
              style={{
                marginTop: 14,
                padding: '14px 16px',
                background: 'rgba(200, 146, 42, 0.05)',
                border: `1px solid ${tokens.goldFaint}`,
                borderRadius: 6,
              }}
            >
              <p style={{ ...body, fontSize: 14, lineHeight: 1.6, color: tokens.inkSoft, margin: 0 }}>
                Everything you write here is private to you. The more you
                record — your check-ins, your practice notes, your reflections —
                the more <strong>North Star</strong> has to work with when you
                ask for help. Your record stays yours.
              </p>
            </div>
          )}
        </header>

        {/* ── TABS ────────────────────────────────────────── */}
        <nav
          aria-label="Journal sections"
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: `1px solid ${tokens.goldRule}`,
            marginBottom: 24,
          }}
        >
          {[
            { key: 'write', label: 'Write' },
            { key: 'read',  label: 'Read'  },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                ...sc,
                background: 'transparent',
                border: 'none',
                padding: '12px 20px 14px',
                fontSize: 13,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: tab === t.key ? tokens.goldDk : tokens.inkFaint,
                borderBottom: tab === t.key
                  ? `2px solid ${tokens.gold}`
                  : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                fontWeight: tab === t.key ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* ── WRITE TAB ───────────────────────────────────── */}
        {tab === 'write' && (
          <section aria-label="Write a new entry">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write whatever's on your mind. The more honest, the more useful — to you and to North Star."
              rows={10}
              style={{
                ...body,
                width: '100%',
                padding: '16px 18px',
                background: tokens.card,
                border: `1px solid ${tokens.goldRule}`,
                borderRadius: 6,
                fontSize: 16,
                lineHeight: 1.6,
                color: tokens.ink,
                resize: 'vertical',
                minHeight: 200,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ marginTop: 18 }}>
              <div style={{
                ...sc,
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: tokens.inkFaint,
                marginBottom: 8,
              }}>
                Tag a domain <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>(optional)</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DOMAINS.map(d => {
                  const active = draftDomain === d.key
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDraftDomain(active ? null : d.key)}
                      style={{
                        ...sc,
                        fontSize: 12,
                        letterSpacing: '0.10em',
                        padding: '6px 12px',
                        borderRadius: 14,
                        border: `1px solid ${active ? tokens.gold : tokens.goldRule}`,
                        background: active ? 'rgba(200, 146, 42, 0.10)' : 'transparent',
                        color: active ? tokens.goldDk : tokens.inkMid,
                        cursor: 'pointer',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={!draft.trim() || saving}
                style={{
                  ...sc,
                  fontSize: 13,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  padding: '10px 22px',
                  borderRadius: 4,
                  border: `1px solid ${tokens.gold}`,
                  background: (!draft.trim() || saving) ? 'transparent' : tokens.gold,
                  color: (!draft.trim() || saving) ? tokens.inkFaint : '#FFFFFF',
                  cursor: (!draft.trim() || saving) ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: (!draft.trim() || saving) ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {saving ? 'Saving…' : 'Save entry'}
              </button>
              {saveError && (
                <span style={{ ...body, fontSize: 13, color: '#A8423A' }}>{saveError}</span>
              )}
            </div>
          </section>
        )}

        {/* ── READ TAB ────────────────────────────────────── */}
        {tab === 'read' && (
          <section aria-label="Read past entries">

            {/* Cadence reminders — calendar-anchored */}
            {!loading && cadences.some(c => !c.done) && (
              <div style={{ marginBottom: 26 }}>
                <div style={{
                  ...sc,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: tokens.inkFaint,
                  marginBottom: 10,
                }}>
                  Open check-ins
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {cadences.filter(c => !c.done).map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => navigate('/tools/horizon-state')}
                      style={{
                        ...sc,
                        fontSize: 12,
                        letterSpacing: '0.10em',
                        padding: '8px 14px',
                        borderRadius: 4,
                        border: `1px solid ${tokens.goldRule}`,
                        background: 'rgba(200, 146, 42, 0.05)',
                        color: tokens.goldDk,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                      title="Open Horizon State"
                    >
                      {c.label} →
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <p style={{ color: tokens.inkFaint, fontStyle: 'italic' }}>
                Loading your record…
              </p>
            )}

            {!loading && stream.length === 0 && (
              <div style={{
                background: tokens.card,
                border: `1px solid ${tokens.goldRule}`,
                borderRadius: 4,
                padding: '24px 22px',
              }}>
                <p style={{ ...body, fontSize: 15, lineHeight: 1.6, color: tokens.inkSoft, margin: 0 }}>
                  Nothing recorded yet. Anything you write here, any Horizon
                  State check-in, and any entry in The Practice will appear here
                  as a single stream.
                </p>
              </div>
            )}

            {!loading && stream.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {stream.map(item => (
                  <StreamItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

// ─── Stream item ──────────────────────────────────────────────
function StreamItem({ item }) {
  let label = ''
  let body  = item.note || ''
  let extra = null

  if (item.kind === 'journal') {
    label = 'You wrote'
    body  = item.body
    if (item.domain) {
      extra = <DomainPill label={DOMAIN_LABEL_BY_KEY[item.domain] || item.domain} />
    }
  } else if (item.kind === 'horizon_state_before') {
    label = `Horizon State · before · ${item.value}`
  } else if (item.kind === 'horizon_state_after') {
    label = `Horizon State · after · ${item.value}`
  } else if (item.kind === 'practice') {
    const kindLabel = PRACTICE_KIND_LABEL[item.practice] || item.practice
    label = `Practice · ${kindLabel}`
    if (item.fromWho) label += ` · ${item.fromWho}`
  }

  return (
    <div style={{
      background: tokens.card,
      border: `1px solid ${tokens.goldRule}`,
      borderRadius: 4,
      padding: '14px 18px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: body ? 6 : 0,
      }}>
        <span style={{
          ...sc,
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: tokens.inkMid,
        }}>
          {label}
        </span>
        <span style={{
          ...sc,
          fontSize: 11,
          color: tokens.inkFaint,
        }}>
          {dateLabel(item.when)} · {timeOnly(item.when)}
        </span>
      </div>
      {body && (
        <p style={{
          ...inlineBody,
          fontSize: 14.5,
          lineHeight: 1.55,
          color: tokens.inkSoft,
          margin: '4px 0 0',
          whiteSpace: 'pre-wrap',
        }}>
          {body}
        </p>
      )}
      {extra && <div style={{ marginTop: 8 }}>{extra}</div>}
    </div>
  )
}

function DomainPill({ label }) {
  return (
    <span style={{
      ...sc,
      display: 'inline-block',
      fontSize: 11,
      letterSpacing: '0.10em',
      padding: '3px 10px',
      borderRadius: 12,
      border: `1px solid ${tokens.goldRule}`,
      color: tokens.goldDk,
      background: 'rgba(200, 146, 42, 0.05)',
    }}>
      {label}
    </span>
  )
}

// Inline copy of body font tokens so StreamItem doesn't reach
// outside its scope. (Avoids the shadowed `body` variable
// problem that would otherwise creep in.)
const inlineBody = { fontFamily: "'Lora', Georgia, serif" }
