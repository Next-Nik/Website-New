// src/app/pages/HorizonExport.jsx
//
// Horizon Export — the founder's whole personal-rail body of work, gathered
// into one Markdown document and downloaded to the device. Nothing is stored,
// sent, or published: the file is assembled in the browser from the user's
// own rows (RLS scopes every read to the signed-in user) and handed to the
// download manager. The founder drops it into his private workspace so the
// build can be informed by the work without the work ever touching a public
// surface.
//
// Gate: UI checks the founder role (matching ProfileMissionPanel); the real
// enforcement is RLS — a non-founder reaching this page could only ever
// export their own rows anyway. Opening this to all users later is one
// check-removal, not a rebuild.
//
// Unfinished tools export as "— not yet written —" so the document doubles
// as a map of what remains.

import { useState } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { fn, serif, body, sc } from '../../lib/designTokens'

// ─── Markdown helpers ─────────────────────────────────────────────────────────

const SKIP_KEYS = new Set(['id', 'user_id', 'session_id', 'created_by', 'updated_by'])

function humanKey(k) {
  return String(k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmtDate(v) {
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return String(v)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return String(v) }
}

function isDateish(k, v) {
  return typeof v === 'string' && /(_at|_on|_date)$/.test(k) && !Number.isNaN(new Date(v).getTime())
}

// Renders any value — string, number, array, object — as readable Markdown.
function mdValue(v, depth = 0) {
  const pad = '  '.repeat(depth)
  if (v === null || v === undefined || v === '') return null
  if (Array.isArray(v)) {
    const parts = v.map(item => {
      if (item && typeof item === 'object') return mdValue(item, depth + 1)
      return `${pad}- ${String(item)}`
    }).filter(Boolean)
    return parts.length ? parts.join('\n') : null
  }
  if (typeof v === 'object') {
    const parts = Object.entries(v).map(([k, val]) => {
      if (SKIP_KEYS.has(k) || val === null || val === undefined || val === '') return null
      const rendered = (val && typeof val === 'object')
        ? mdValue(val, depth + 1)
        : String(val)
      if (rendered === null) return null
      return (val && typeof val === 'object')
        ? `${pad}- **${humanKey(k)}:**\n${rendered}`
        : `${pad}- **${humanKey(k)}:** ${rendered}`
    }).filter(Boolean)
    return parts.length ? parts.join('\n') : null
  }
  return `${pad}${String(v)}`
}

// Renders a table row generically: long text fields as paragraphs, the rest
// as a compact key list. Date-ish keys humanised.
function mdRow(row) {
  const paras = []
  const bullets = []
  for (const [k, v] of Object.entries(row)) {
    if (SKIP_KEYS.has(k) || v === null || v === undefined || v === '') continue
    if (typeof v === 'string' && v.length > 160) {
      paras.push(`**${humanKey(k)}**\n\n${v}`)
    } else if (v && typeof v === 'object') {
      const rendered = mdValue(v, 1)
      if (rendered) bullets.push(`- **${humanKey(k)}:**\n${rendered}`)
    } else {
      bullets.push(`- **${humanKey(k)}:** ${isDateish(k, v) ? fmtDate(v) : String(v)}`)
    }
  }
  return [bullets.join('\n'), paras.join('\n\n')].filter(Boolean).join('\n\n')
}

const NOT_YET = '— not yet written —'

// ─── Data gathering ───────────────────────────────────────────────────────────

// Every read is scoped to the signed-in user and fails soft: a missing table
// or column difference becomes a note in the document, never a broken export.
async function fetchRows(table, uid, order = 'created_at') {
  try {
    let q = supabase.from(table).select('*').eq('user_id', uid)
    const { data, error } = await q.order(order, { ascending: true })
    if (error) {
      const retry = await supabase.from(table).select('*').eq('user_id', uid)
      if (retry.error) return { rows: null, note: retry.error.message }
      return { rows: retry.data || [] }
    }
    return { rows: data || [] }
  } catch (e) {
    return { rows: null, note: e.message || 'unreadable' }
  }
}

function sectionFromRows(title, result, renderRow = mdRow, emptyLine = NOT_YET) {
  const lines = [`## ${title}`, '']
  if (!result || result.rows === null) {
    lines.push(`*Could not be read in this export${result && result.note ? ` (${result.note})` : ''}.*`)
  } else if (result.rows.length === 0) {
    lines.push(emptyLine)
  } else {
    result.rows.forEach((row, i) => {
      const rendered = renderRow(row)
      if (rendered) {
        if (i > 0) lines.push('', '---', '')
        lines.push(rendered)
      }
    })
  }
  lines.push('')
  return lines.join('\n')
}

// The Onboarding record gets a hand-shaped rendering — it is the spine of
// the document and deserves better than a generic dump.
function renderOnboarding(row) {
  const part = (heading, value) => {
    const rendered = (value && typeof value === 'object') ? mdValue(value) : (value || null)
    return `### ${heading}\n\n${rendered || NOT_YET}`
  }
  return [
    `**Status:** ${row.status || 'in_progress'} · **Step:** ${row.current_step || 1} of 8`,
    part('The Horizon Self Statement', row.synthesised_statement),
    part('Arrival · the Quantum Leap', row.arrival_notes),
    part('Avatar State · the Somatic Library', row.somatic_library),
    part('Permission & Safety', row.permission_safety),
    part('The Code', row.code),
    part('The Quantum Gap', row.quantum_gap),
    part('Horizon Beliefs · by Domain', row.horizon_beliefs),
    part('The Daily Leap', row.daily_leap),
    part('The Horizon Biography', row.biography),
    part('From Here Forward', row.from_here_forward),
  ].join('\n\n')
}

function renderDomainProfile(row) {
  const bits = []
  if (row.domain) bits.push(`### ${humanKey(row.domain)}`)
  if (row.ia_statement) bits.push(`**I Am:** ${row.ia_statement}`)
  if (row.horizon_goal) bits.push(`**Horizon Goal:** ${row.horizon_goal}`)
  const scores = []
  if (row.current_score !== null && row.current_score !== undefined) scores.push(`current ${row.current_score}`)
  if (row.horizon_score !== null && row.horizon_score !== undefined) scores.push(`horizon ${row.horizon_score}`)
  if (scores.length) bits.push(`**Scores:** ${scores.join(' · ')}`)
  const rest = { ...row }
  ;['domain', 'ia_statement', 'horizon_goal', 'current_score', 'horizon_score'].forEach(k => delete rest[k])
  const extra = mdRow(rest)
  if (extra) bits.push(extra)
  return bits.join('\n\n')
}

// Section groups the founder can include or leave out per export.
const GROUPS = [
  {
    key: 'identity', label: 'Identity construction',
    hint: 'Horizon Self Onboarding · domain profile & I Am statements',
  },
  {
    key: 'direction', label: 'Direction & synthesis',
    hint: 'The Map · Purpose Piece · North Star · Target Stretch · NextSteps · Active Focus',
  },
  {
    key: 'state', label: 'Horizon State',
    hint: 'Reviews · check-ins · summaries',
  },
  {
    key: 'daily', label: 'Daily records',
    hint: 'Horizon Practice runs & entries · Journal · Get To Do · writing practices',
  },
]

async function buildDocument(uid, include) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const out = [
    '# Nik · Horizon Personal Reference',
    '',
    `*Private working document · generated from the platform on ${today} · not for publication.*`,
    '',
  ]

  if (include.identity) {
    const onboarding = await fetchRows('horizon_self_onboarding', uid, 'updated_at')
    out.push(sectionFromRows('Horizon Self · Onboarding', onboarding, renderOnboarding))
    const profile = await fetchRows('horizon_profile', uid, 'domain')
    out.push(sectionFromRows('Domain Profile · I Am Statements', profile, renderDomainProfile))
  }

  if (include.direction) {
    out.push(sectionFromRows('The Map', await fetchRows('map_results', uid)))
    out.push(sectionFromRows('Purpose Piece', await fetchRows('purpose_piece_results', uid)))
    out.push(sectionFromRows('North Star', await fetchRows('north_star_notes', uid)))
    out.push(sectionFromRows('Target Stretch · Both Scales', await fetchRows('target_sprint_sessions', uid)))
    out.push(sectionFromRows('NextSteps · Tracks', await fetchRows('nextsteps_tracks', uid)))
    out.push(sectionFromRows('NextSteps · Steps', await fetchRows('nextsteps_steps', uid)))
    out.push(sectionFromRows('Active Focus', await fetchRows('nextus_user_focus', uid)))
  }

  if (include.state) {
    out.push(sectionFromRows('Horizon State · Reviews', await fetchRows('horizon_state_reviews', uid)))
    out.push(sectionFromRows('Horizon State · Check-ins', await fetchRows('horizon_state_checkins', uid)))
    out.push(sectionFromRows('Horizon State · Summary', await fetchRows('horizon_state_summary', uid)))
  }

  if (include.daily) {
    out.push(sectionFromRows('Horizon Practice · Morning Runs', await fetchRows('horizon_practice_morning_runs', uid)))
    out.push(sectionFromRows('Horizon Practice · Entries', await fetchRows('horizon_practice_entries', uid)))
    out.push(sectionFromRows('Horizon Practice · Thresholds', await fetchRows('horizon_practice_thresholds', uid)))
    out.push(sectionFromRows('Journal', await fetchRows('journal_entries', uid)))
    out.push(sectionFromRows('Get To Do', await fetchRows('get_to_do_items', uid)))
    out.push(sectionFromRows('Writing Practice', await fetchRows('practice_writing_entries', uid)))
    out.push(sectionFromRows('Sentence Completion', await fetchRows('sentence_completion_entries', uid)))
  }

  return out.join('\n')
}

function download(markdown) {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Nik_Horizon_Personal_Reference_${stamp}.md`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HorizonExport() {
  const { user } = useAuth()
  const [include, setInclude] = useState({ identity: true, direction: true, state: true, daily: true })
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)

  const isFounder = user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'

  const page = {
    minHeight: '100dvh', background: fn.ground,
    color: fn.ink,
  }
  const wrap = { maxWidth: '620px', margin: '0 auto', padding: '48px 20px 80px' }

  if (!user || !isFounder) {
    return (
      <div style={page}>
        <Nav />
        <div style={wrap}>
          <p style={{ ...body, fontSize: '16px' }}>This surface isn't available.</p>
        </div>
      </div>
    )
  }

  async function run() {
    setBusy(true); setNote(null)
    try {
      const md = await buildDocument(user.id, include)
      download(md)
      setNote('Exported. The file is in your downloads.')
    } catch (e) {
      setNote(`The export could not complete: ${e.message || 'unknown error'}. Nothing was lost — try again.`)
    }
    setBusy(false)
  }

  function toggle(key) {
    setInclude(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const anyOn = Object.values(include).some(Boolean)

  return (
    <div style={page}>
      <Nav />
      <div style={wrap}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.72 }}>
          Field Notes · Founder
        </div>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(30px, 5vw, 40px)', margin: '10px 0 12px', lineHeight: 1.1 }}>
          Horizon Export
        </h1>
        <p style={{ ...body, fontSize: '16px', lineHeight: 1.65, maxWidth: '52ch', opacity: 0.88 }}>
          Your whole personal body of work, gathered into one document and
          downloaded to this device. Nothing is stored or sent anywhere ·
          the file is assembled here in the browser, from your own records only.
          Unfinished tools appear as "not yet written", so the document also
          shows you what remains.
        </p>

        <div style={{ margin: '30px 0 26px', display: 'grid', gap: '12px' }}>
          {GROUPS.map(g => (
            <label key={g.key} style={{
              display: 'flex', gap: '14px', alignItems: 'flex-start', cursor: 'pointer',
              border: `1px solid ${fn.rule}`, borderRadius: '12px', padding: '14px 16px',
              background: include[g.key] ? fn.object : 'transparent',
            }}>
              <input
                type="checkbox"
                checked={include[g.key]}
                onChange={() => toggle(g.key)}
                style={{ marginTop: '3px', width: '16px', height: '16px' }}
              />
              <span>
                <span style={{ ...serif, fontSize: '17px', display: 'block' }}>{g.label}</span>
                <span style={{ ...body, fontSize: '14px', opacity: 0.7 }}>{g.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={run}
          disabled={busy || !anyOn}
          style={{
            ...sc, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase',
            padding: '14px 26px', borderRadius: '30px', border: `1px solid ${fn.ink}`,
            background: busy || !anyOn ? 'transparent' : fn.moss,
            color: busy || !anyOn ? fn.ghost : '#FFFFFF',
            cursor: busy || !anyOn ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Gathering your work…' : 'Export as Markdown'}
        </button>

        {note && (
          <p style={{ ...body, fontSize: '14.5px', marginTop: '18px', opacity: 0.85 }}>{note}</p>
        )}

        <p style={{ ...body, fontSize: '13.5px', marginTop: '34px', opacity: 0.6, maxWidth: '52ch', lineHeight: 1.6 }}>
          Private surface. Export as often as you like · each file is dated,
          and the newest one replaces the last wherever you keep it.
        </p>
      </div>
    </div>
  )
}
