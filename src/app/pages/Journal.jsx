// ─────────────────────────────────────────────────────────────
// Journal.jsx — /journal
//
// The user's record of their own becoming. Lives at /journal.
// One surface, three lenses on the same data:
//
//   • Today      — what's live right now (today's Horizon State
//                  check-ins, today's Practice entries). Built.
//   • You        — the static-but-updateable picture of who the
//                  user is: I-am statements per domain, life-level
//                  I-am, Purpose Piece placement, horizon goals.
//                  Also houses dismissed tools as a revisit
//                  affordance. Stubbed.
//   • The Thread — chronological scroll across all of the above.
//                  Stubbed.
//
// Reads from (Today):
//   horizon_state_checkins        — today's before/after gauge + notes
//   horizon_practice_entries      — today's Hit / Drift / Listening /
//                                   Receipt items
//
// This is a first build. The You and The Thread lenses will be
// fleshed out in a second pass.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'

const body = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }

const tokens = {
  bg:        '#FAFAF7',
  ink:       '#0F1523',
  inkSoft:   'rgba(15, 21, 35, 0.72)',
  inkFaint:  'rgba(15, 21, 35, 0.50)',
  gold:      '#C8922A',
  goldDk:    '#A8721A',
  goldRule:  'rgba(200, 146, 42, 0.30)',
  card:      '#FFFFFF',
}

// Pretty-print a Practice entry kind for display.
const KIND_LABEL = {
  hit:             'Hit',
  drift:           'Drift',
  listening_glow:  'Listening',
  receipt:         'Receipt',
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function timeOnly(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function Journal() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('today')
  const [loading, setLoading] = useState(true)
  const [hsRows, setHsRows] = useState([])
  const [hpRows, setHpRows] = useState([])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      const since = startOfToday()
      const [hsRes, hpRes] = await Promise.allSettled([
        supabase
          .from('horizon_state_checkins')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', since)
          .order('created_at', { ascending: true }),
        supabase
          .from('horizon_practice_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('occurred_at', since)
          .order('occurred_at', { ascending: true }),
      ])
      if (cancelled) return
      if (hsRes.status === 'fulfilled' && !hsRes.value.error) {
        setHsRows(hsRes.value.data || [])
      }
      if (hpRes.status === 'fulfilled' && !hpRes.value.error) {
        setHpRows(hpRes.value.data || [])
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, authLoading, navigate])

  const hasAnyToday = hsRows.length > 0 || hpRows.length > 0

  return (
    <div style={{ ...body, background: tokens.bg, minHeight: '100vh', color: tokens.ink }}>
      <Nav />

      <main style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) 24px 80px',
      }}>

        {/* ── INTRO SIGNAGE ─────────────────────────────────── */}
        <header style={{ marginBottom: 28 }}>
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
          <p style={{
            ...body,
            fontSize: 16,
            lineHeight: 1.55,
            color: tokens.inkSoft,
            margin: '14px 0 0',
            maxWidth: 600,
          }}>
            Everything you do here lives in this place — your daily check-ins,
            your reflections, and the words you've chosen to describe who you
            are and where you're going. <strong>Today</strong> shows what's
            live right now. <strong>You</strong> holds the picture of who you are.
            <strong> The Thread</strong> is the record of everything you've made.
            Come back here as often as you want.
          </p>
        </header>

        {/* ── TABS ──────────────────────────────────────────── */}
        <nav
          aria-label="Journal sections"
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: `1px solid ${tokens.goldRule}`,
            marginBottom: 28,
          }}
        >
          {[
            { key: 'today',  label: 'Today' },
            { key: 'you',    label: 'You' },
            { key: 'thread', label: 'The Thread' },
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

        {/* ── TAB BODY ──────────────────────────────────────── */}
        {tab === 'today' && (
          <section aria-label="Today">
            {loading && (
              <p style={{ color: tokens.inkFaint, fontStyle: 'italic' }}>
                Loading today's record…
              </p>
            )}
            {!loading && !hasAnyToday && (
              <div style={{
                background: tokens.card,
                border: `1px solid ${tokens.goldRule}`,
                borderRadius: 4,
                padding: '24px 22px',
              }}>
                <p style={{ ...body, fontSize: 15, lineHeight: 1.6, color: tokens.inkSoft, margin: 0 }}>
                  Nothing recorded today yet. When you do today's
                  Horizon State check-in or log a Practice entry, it
                  will show up here.
                </p>
              </div>
            )}
            {!loading && hsRows.length > 0 && (
              <SectionBlock title="Horizon State — today">
                {hsRows.map(row => (
                  <HorizonStateRow key={row.id || row.created_at} row={row} />
                ))}
              </SectionBlock>
            )}
            {!loading && hpRows.length > 0 && (
              <SectionBlock title="The Practice — today">
                {hpRows.map(row => (
                  <PracticeEntryRow key={row.id || row.occurred_at} row={row} />
                ))}
              </SectionBlock>
            )}
          </section>
        )}

        {tab === 'you' && (
          <section aria-label="You">
            <StubBlock>
              <strong>You</strong> is where the picture of who you are
              will live — your I-am statements, your Purpose Piece
              placement, the horizons you've set, and any tools
              you've hidden from your rail. Coming soon.
            </StubBlock>
          </section>
        )}

        {tab === 'thread' && (
          <section aria-label="The Thread">
            <StubBlock>
              <strong>The Thread</strong> will be the chronological
              record of everything you've written, scored, and marked
              across all of the tools. Coming soon.
            </StubBlock>
          </section>
        )}
      </main>
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────

function SectionBlock({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        ...sc,
        fontSize: 13,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: tokens.goldDk,
        margin: '0 0 12px',
        fontWeight: 500,
      }}>
        {title}
      </h2>
      <div style={{
        background: tokens.card,
        border: `1px solid ${tokens.goldRule}`,
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}

function HorizonStateRow({ row }) {
  return (
    <div style={{
      padding: '14px 18px',
      borderBottom: `1px solid ${tokens.goldRule}`,
    }}>
      {row.before_value !== null && row.before_value !== undefined && (
        <Line
          label="Before"
          value={row.before_value}
          note={row.before_note}
          time={row.before_at || row.created_at}
        />
      )}
      {row.after_value !== null && row.after_value !== undefined && (
        <Line
          label="After"
          value={row.after_value}
          note={row.after_note}
          time={row.after_at || row.created_at}
        />
      )}
    </div>
  )
}

function Line({ label, value, note, time }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          ...sc,
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: tokens.inkFaint,
        }}>
          {label} · {value}
        </span>
        <span style={{
          ...sc,
          fontSize: 11,
          color: tokens.inkFaint,
        }}>
          {timeOnly(time)}
        </span>
      </div>
      {note && (
        <p style={{
          ...body,
          fontSize: 14,
          lineHeight: 1.55,
          color: tokens.inkSoft,
          margin: '4px 0 0',
        }}>
          {note}
        </p>
      )}
    </div>
  )
}

function PracticeEntryRow({ row }) {
  return (
    <div style={{
      padding: '14px 18px',
      borderBottom: `1px solid ${tokens.goldRule}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          ...sc,
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: tokens.inkFaint,
        }}>
          {KIND_LABEL[row.kind] || row.kind}
          {row.from_who ? ` · ${row.from_who}` : ''}
        </span>
        <span style={{
          ...sc,
          fontSize: 11,
          color: tokens.inkFaint,
        }}>
          {timeOnly(row.occurred_at)}
        </span>
      </div>
      {row.note && (
        <p style={{
          ...body,
          fontSize: 14,
          lineHeight: 1.55,
          color: tokens.inkSoft,
          margin: '4px 0 0',
        }}>
          {row.note}
        </p>
      )}
    </div>
  )
}

function StubBlock({ children }) {
  return (
    <div style={{
      background: tokens.card,
      border: `1px solid ${tokens.goldRule}`,
      borderRadius: 4,
      padding: '24px 22px',
    }}>
      <p style={{
        ...body,
        fontSize: 15,
        lineHeight: 1.6,
        color: tokens.inkSoft,
        margin: 0,
      }}>
        {children}
      </p>
    </div>
  )
}
