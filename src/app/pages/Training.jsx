// ─────────────────────────────────────────────────────────────
// Training.jsx — /tools/training
//
// The physical (and beyond) daily instrument on the becoming rail.
// Domain-agnostic: pick the life domain you are training in, read
// your charge (pure logging), do today's block, log it. Authoring
// lives off the day in Edit → your week, where you swap a day's
// block for one you have programmed in that domain, or make a new
// one by adapting a standard block.
//
// Stores:
//   training_session_types — your own session types, filed by domain (137)
//   training_schedule      — per (domain, weekday) ordered session-type ids (137)
//   training_sessions      — logged sessions; feeds the readout (137)
// On log it also writes a summary line to journal_entries and marks
// the shared daily_tool_activity (tool_key 'training') for consistency.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'

// ── Domains (canonical order; Body is the default) ─────────────
const DOMAINS = [
  { key: 'path',       label: 'Path' },
  { key: 'spark',      label: 'Spark' },
  { key: 'body',       label: 'Body' },
  { key: 'finances',   label: 'Finances' },
  { key: 'connection', label: 'Connection' },
  { key: 'inner_game', label: 'Inner Game' },
  { key: 'signal',     label: 'Signal' },
]
const LABEL = Object.fromEntries(DOMAINS.map(d => [d.key, d.label]))
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']  // index 0..6
function todayIdx() { return (new Date().getDay() + 6) % 7 }      // 0=Mon … 6=Sun

// ── Scale colours (shared with the readiness reads) ────────────
function scaleBand(v) {
  if (v >= 8)   return '#3B6B9E'
  if (v >= 6.5) return '#5A8AB8'
  if (v >= 5)   return '#8A8070'
  if (v >= 3)   return '#8A7030'
  return '#8A3030'
}
function scolor(v, invert) { return scaleBand(invert ? 10 - v : v) }

// ── Standard blocks: structure + rep scheme, adapt your movements ──
const STANDARD_BLOCKS = {
  // Body: strength first, then conditioning. Structures only; you fill the movements and ranges.
  body: [
    { name: 'Strength · 3 × 5', kind: 'Block', note: 'Three movements, three sets of five.', rows: [{ n: 'Movement A', sets: 3, reps: 5 }, { n: 'Movement B', sets: 3, reps: 5 }, { n: 'Movement C', sets: 3, reps: 5 }] },
    { name: 'Strength · 5 × 5', kind: 'Block', note: 'Three movements, five sets of five.', rows: [{ n: 'Movement A', sets: 5, reps: 5 }, { n: 'Movement B', sets: 5, reps: 5 }, { n: 'Movement C', sets: 5, reps: 5 }] },
    { name: 'Top set + back-offs', kind: 'Block', note: 'Build to a top set, then drop the load.', rows: [{ n: 'Movement A', sets: 4, reps: 5, cue: 'First set heaviest, then back off.' }] },
    { name: 'Wave · descending reps', kind: 'Block', note: 'Reps fall as the load climbs.', rows: [{ n: 'Movement A', sets: 3, reps: 5, cue: 'Reps drop 5, then 3, then 1; load climbs.' }] },
    { name: 'Pyramid', kind: 'Block', note: 'Reps climb then fall; load mirrors.', rows: [{ n: 'Movement A', sets: 5, reps: 12, cue: 'Reps like 12, 10, 8, 10, 12.' }] },
    { name: 'Superset', kind: 'Block', note: 'Two movements paired, little rest between.', rows: [{ n: 'Movement A', sets: 3, reps: 8 }, { n: 'Movement B', sets: 3, reps: 8 }] },
    { name: 'Density · set the clock', kind: 'Block', note: 'As many quality sets as the time allows.', rows: [{ n: 'Movement A', flow: true }] },
    { name: 'AMRAP · 20 min', kind: 'Block', note: 'As many rounds as possible.', rows: [{ n: 'Movement A', bw: true, reps: 10 }, { n: 'Movement B', bw: true, reps: 10 }, { n: 'Movement C', bw: true, reps: 10 }] },
    { name: 'For time', kind: 'Block', note: 'Set the work, race the clock.', rows: [{ n: 'Movement A', flow: true }, { n: 'Movement B', flow: true }, { n: 'Movement C', flow: true }] },
    { name: 'Rounds for time', kind: 'Block', note: 'A circuit, fixed rounds, for time.', rows: [{ n: 'Movement A', flow: true }, { n: 'Movement B', flow: true }, { n: 'Movement C', flow: true }] },
    { name: 'Circuit · 3 rounds', kind: 'Block', note: 'Four movements, three rounds.', rows: [{ n: 'Movement A', bw: true, sets: 3, reps: 12 }, { n: 'Movement B', bw: true, sets: 3, reps: 12 }, { n: 'Movement C', bw: true, sets: 3, reps: 12 }, { n: 'Movement D', bw: true, sets: 3, reps: 12 }] },
    { name: 'Ladder · 21-15-9', kind: 'Block', note: 'Two movements, 21-15-9 reps, for time.', rows: [{ n: 'Movement A', flow: true }, { n: 'Movement B', flow: true }] },
    { name: 'EMOM · 10 min', kind: 'Block', note: 'Every minute on the minute, rest the rest.', rows: [{ n: 'Movement A', flow: true }] },
    { name: 'Intervals', kind: 'Block', note: 'Work, then rest.', rows: [{ n: 'Work', flow: true }, { n: 'Rest', flow: true }] },
    { name: 'Tabata', kind: 'Block', note: 'Twenty seconds on, ten off, eight rounds.', rows: [{ n: 'Movement A', flow: true }] },
    { name: 'Chipper', kind: 'Block', note: 'One pass down the list, for time.', rows: [{ n: 'Movement A', flow: true }, { n: 'Movement B', flow: true }, { n: 'Movement C', flow: true }, { n: 'Movement D', flow: true }, { n: 'Movement E', flow: true }] },
    { name: 'Death by · ascending', kind: 'Block', note: 'One rep the first minute, two the next, climbing.', rows: [{ n: 'Movement A', flow: true }] },
    { name: 'Reps for load', kind: 'Block', note: 'Heaviest load you can hold across the scheme.', rows: [{ n: 'Movement A', flow: true, cue: 'Falling reps, e.g. 15, 12, 9.' }] },
    { name: 'Max reps', kind: 'Block', note: 'Set rounds, max reps each, one load.', rows: [{ n: 'Movement A', flow: true }] },
  ],
  inner_game: [
    { name: 'Sit · three parts', kind: 'Block', note: 'Three parts by time.', rows: [{ n: 'Settle', flow: true }, { n: 'Practice', flow: true }, { n: 'Close', flow: true }] },
    { name: 'Single practice · by time', kind: 'Block', note: 'One practice, set the time.', rows: [{ n: 'Practice', flow: true }] },
    { name: 'Breath then sit', kind: 'Block', note: 'Charge the breath, then settle in.', rows: [{ n: 'Part A', flow: true, cue: 'Breath.' }, { n: 'Part B', flow: true, cue: 'Sit.' }] },
    { name: 'Scan · head to feet', kind: 'Block', note: 'One slow pass through the body.', rows: [{ n: 'Part A', flow: true }] },
    { name: 'Visualize · by time', kind: 'Block', note: 'One scene, held and rehearsed.', rows: [{ n: 'Part A', flow: true }] },
  ],
  spark: [
    { name: 'Sprint · single', kind: 'Block', note: 'One timed push on the work.', rows: [{ n: 'Part A', flow: true }] },
    { name: 'Sprint · three rounds', kind: 'Block', note: 'Three pushes, breaks between.', rows: [{ n: 'Part A', flow: true }, { n: 'Part B', flow: true }, { n: 'Part C', flow: true }] },
    { name: 'Wide then narrow', kind: 'Block', note: 'Generate freely, then choose and refine.', rows: [{ n: 'Part A', flow: true, cue: 'Generate wide.' }, { n: 'Part B', flow: true, cue: 'Choose and refine.' }] },
    { name: 'Ship one piece', kind: 'Block', note: 'One small piece, start to done.', rows: [{ n: 'Part A', flow: true }] },
  ],
  signal: [
    { name: 'Warm up + reps', kind: 'Block', note: 'Open the instrument, then drill.', rows: [{ n: 'Part A', flow: true, cue: 'Warm up.' }, { n: 'Part B', flow: true, cue: 'Drill the rep.' }] },
    { name: 'Take, review, retake', kind: 'Block', note: 'Record, watch it back, run it again.', rows: [{ n: 'Part A', flow: true, cue: 'Take.' }, { n: 'Part B', flow: true, cue: 'Review.' }, { n: 'Part C', flow: true, cue: 'Retake.' }] },
    { name: 'Range · low to full', kind: 'Block', note: 'Move through the range, easy to full.', rows: [{ n: 'Part A', flow: true }] },
    { name: 'Single rep · by time', kind: 'Block', note: 'One piece, run for the time.', rows: [{ n: 'Part A', flow: true }] },
  ],
  path: [
    { name: 'Drill · one skill', kind: 'Block', note: 'One skill, focused reps.', rows: [{ n: 'Part A', flow: true }] },
    { name: 'Three drills', kind: 'Block', note: 'Three drills, one skill each.', rows: [{ n: 'Part A', flow: true }, { n: 'Part B', flow: true }, { n: 'Part C', flow: true }] },
    { name: 'Edge of ability', kind: 'Block', note: 'Work just past current reach.', rows: [{ n: 'Part A', flow: true, cue: 'Just past what is easy.' }] },
    { name: 'Study, attempt, review', kind: 'Block', note: 'Take it in, try it, check it.', rows: [{ n: 'Part A', flow: true, cue: 'Study.' }, { n: 'Part B', flow: true, cue: 'Attempt.' }, { n: 'Part C', flow: true, cue: 'Review.' }] },
  ],
  connection: [
    { name: 'Reach out', kind: 'Block', note: 'One contact, made today.', rows: [{ n: 'Part A', flow: true }] },
    { name: 'Presence block', kind: 'Block', note: 'Time with someone, fully there.', rows: [{ n: 'Part A', flow: true }] },
    { name: 'Listen then share', kind: 'Block', note: 'Hear them fully, then speak.', rows: [{ n: 'Part A', flow: true, cue: 'Listen.' }, { n: 'Part B', flow: true, cue: 'Share.' }] },
    { name: 'Repair', kind: 'Block', note: 'One thing named and set right.', rows: [{ n: 'Part A', flow: true }] },
  ],
  finances: [
    { name: 'Weekly review', kind: 'Block', note: 'A short look at the week.', rows: [{ n: 'Part A', flow: true, cue: 'In and out.' }, { n: 'Part B', flow: true, cue: 'Next move.' }] },
    { name: 'Monthly close', kind: 'Block', note: 'Reconcile the month, set the next.', rows: [{ n: 'Part A', flow: true, cue: 'Reconcile.' }, { n: 'Part B', flow: true, cue: 'Plan ahead.' }] },
    { name: 'One decision', kind: 'Block', note: 'One money decision, made cleanly.', rows: [{ n: 'Part A', flow: true }] },
    { name: 'Build cadence', kind: 'Block', note: 'One move toward the longer build.', rows: [{ n: 'Part A', flow: true }] },
  ],
  _default: [
    { name: 'Block · three parts', kind: 'Block', note: 'Three parts. Adapt to the work.', rows: [{ n: 'Part A', flow: true }, { n: 'Part B', flow: true }, { n: 'Part C', flow: true }] },
  ],
}
function blocksFor(key) { return STANDARD_BLOCKS[key] || STANDARD_BLOCKS._default }

// ── Discipline movement shelves (vocabulary, in the composer) ──
const DISCIPLINES = {
  body: {
    Calisthenics: [{ n: 'Pull-ups', k: 'bw' }, { n: 'Chin-ups', k: 'bw' }, { n: 'Dips', k: 'bw' }, { n: 'Ring Dips', k: 'bw' }, { n: 'Push-ups', k: 'bw' }, { n: 'Ring Rows', k: 'bw' }, { n: 'Hanging Leg Raises', k: 'bw' }, { n: 'Pistols', k: 'bw' }, { n: 'Handstand Push-ups', k: 'bw' }],
    Strength: [{ n: 'Back Squat', k: 'load' }, { n: 'Front Squat', k: 'load' }, { n: 'Deadlift', k: 'load' }, { n: 'Bench Press', k: 'load' }, { n: 'Overhead Press', k: 'load' }, { n: 'Power Clean', k: 'load' }, { n: 'Clean and Jerk', k: 'load' }, { n: 'Snatch', k: 'load' }, { n: 'Barbell Row', k: 'load' }],
    CrossFit: [{ n: 'Thruster', k: 'flow' }, { n: 'Burpee', k: 'flow' }, { n: 'Kettlebell Swing', k: 'flow' }, { n: 'Box Jump', k: 'flow' }, { n: 'Wall Ball', k: 'flow' }, { n: 'Double-under', k: 'flow' }, { n: 'Toes-to-bar', k: 'flow' }, { n: 'Muscle-up', k: 'flow' }],
    Cardio: [{ n: 'Run', k: 'flow' }, { n: 'Row', k: 'flow' }, { n: 'Bike', k: 'flow' }, { n: 'Ski', k: 'flow' }, { n: 'Swim', k: 'flow' }, { n: 'Intervals', k: 'flow' }],
    'Movement & Mobility': [{ n: 'Hops / Shakes', k: 'flow' }, { n: 'Spinal Wave', k: 'flow' }, { n: 'Trunk Twist', k: 'flow' }, { n: 'Cat Walk', k: 'flow' }, { n: 'Rope Flow', k: 'flow' }, { n: 'Crawl', k: 'flow' }, { n: 'Hang', k: 'flow' }],
    Yoga: [{ n: 'Sun Salutation', k: 'flow' }, { n: 'Flow', k: 'flow' }, { n: 'Hold', k: 'flow' }],
  },
  inner_game: {
    Meditation: [{ n: 'Settle', k: 'flow' }, { n: 'Open awareness', k: 'flow' }, { n: 'Body scan', k: 'flow' }, { n: 'Noting', k: 'flow' }, { n: 'Loving-kindness', k: 'flow' }],
    Breathwork: [{ n: 'Box breath', k: 'flow' }, { n: 'Coherence', k: 'flow' }, { n: 'Charge breath', k: 'flow' }, { n: 'Long exhale', k: 'flow' }],
    Visualization: [{ n: 'Rehearsal', k: 'flow' }, { n: 'Future self', k: 'flow' }, { n: 'Recall', k: 'flow' }, { n: 'Scene-setting', k: 'flow' }],
    Focus: [{ n: 'Single point', k: 'flow' }, { n: 'Counting', k: 'flow' }],
  },
  spark: {
    Generative: [{ n: 'Freewrite', k: 'flow' }, { n: 'Sketch', k: 'flow' }, { n: 'Riff', k: 'flow' }, { n: 'Brainstorm', k: 'flow' }, { n: 'Voice memo', k: 'flow' }],
    Craft: [{ n: 'Draft', k: 'flow' }, { n: 'Edit', k: 'flow' }, { n: 'Arrange', k: 'flow' }, { n: 'Prototype', k: 'flow' }],
    Input: [{ n: 'Study a master', k: 'flow' }, { n: 'Collect references', k: 'flow' }, { n: 'Remix', k: 'flow' }],
  },
  signal: {
    Voice: [{ n: 'Resonance', k: 'flow' }, { n: 'Articulation', k: 'flow' }, { n: 'Range', k: 'flow' }, { n: 'Projection', k: 'flow' }, { n: 'Pacing', k: 'flow' }],
    Speaking: [{ n: 'Cold open', k: 'flow' }, { n: 'Story beat', k: 'flow' }, { n: 'Q and A', k: 'flow' }, { n: 'Pitch', k: 'flow' }],
    Recording: [{ n: 'Take', k: 'flow' }, { n: 'Playback', k: 'flow' }, { n: 'Retake', k: 'flow' }],
  },
  path: {
    Drills: [{ n: 'Skill rep', k: 'flow' }, { n: 'Sub-skill', k: 'flow' }, { n: 'Tempo drill', k: 'flow' }, { n: 'Edge work', k: 'flow' }],
    Study: [{ n: 'Read', k: 'flow' }, { n: 'Review', k: 'flow' }, { n: 'Annotate', k: 'flow' }, { n: 'Model an expert', k: 'flow' }],
    Application: [{ n: 'Live attempt', k: 'flow' }, { n: 'Scenario', k: 'flow' }, { n: 'Debrief', k: 'flow' }],
  },
  connection: {
    Reach: [{ n: 'Call', k: 'flow' }, { n: 'Message', k: 'flow' }, { n: 'Meet', k: 'flow' }, { n: 'Invite', k: 'flow' }],
    Presence: [{ n: 'Listen', k: 'flow' }, { n: 'Ask', k: 'flow' }, { n: 'Share', k: 'flow' }, { n: 'Hold space', k: 'flow' }],
    Repair: [{ n: 'Name it', k: 'flow' }, { n: 'Own it', k: 'flow' }, { n: 'Make it right', k: 'flow' }],
  },
  finances: {
    Review: [{ n: 'Income', k: 'flow' }, { n: 'Outflow', k: 'flow' }, { n: 'Net', k: 'flow' }, { n: 'Runway', k: 'flow' }],
    Plan: [{ n: 'Allocate', k: 'flow' }, { n: 'Set a target', k: 'flow' }, { n: 'Schedule a move', k: 'flow' }],
    Action: [{ n: 'Pay', k: 'flow' }, { n: 'Invest', k: 'flow' }, { n: 'Negotiate', k: 'flow' }, { n: 'Cancel', k: 'flow' }],
  },
  _default: { Practices: [{ n: 'Skill drill', k: 'flow' }, { n: 'Study block', k: 'flow' }, { n: 'Rep practice', k: 'flow' }] },
}
function libFor(key) { return DISCIPLINES[key] || DISCIPLINES._default }

const GOLD_RULE = 'rgba(200,146,42,0.20)'
const GOLD_TINT = 'rgba(200,146,42,0.05)'
const GOLD_HOVER = 'rgba(200,146,42,0.08)'

// ─────────────────────────────────────────────────────────────
// Slider — a tapered ramp you drag; reads 0–10 in the scale colour.
// ─────────────────────────────────────────────────────────────
function Slider({ label, value, invert, onChange }) {
  const trackRef = useRef(null)
  const draggingRef = useRef(false)

  const setFromClientX = useCallback((clientX) => {
    const el = trackRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let v = Math.round(((clientX - r.left) / r.width) * 10)
    v = Math.max(0, Math.min(10, v))
    onChange(v)
  }, [onChange])

  function down(e) { draggingRef.current = true; try { e.currentTarget.setPointerCapture(e.pointerId) } catch {} setFromClientX(e.clientX) }
  function move(e) { if (draggingRef.current) setFromClientX(e.clientX) }
  function up() { draggingRef.current = false }

  const pct = value == null ? 0 : (value / 10) * 100
  const col = value == null ? tokens.goldChrome : scolor(value, invert)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.meta }}>{label}</span>
        <span style={{ ...serif, fontSize: '22px', fontWeight: 500, color: value == null ? tokens.ghost : col }}>{value == null ? '' : value}</span>
      </div>
      <div
        ref={trackRef}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ position: 'relative', marginTop: '11px', height: '26px', cursor: 'pointer', touchAction: 'none' }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(200,146,42,0.12)', clipPath: 'polygon(0 58%, 100% 0, 100% 100%, 0 100%)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', background: col }} />
        </div>
        {value != null && (
          <div style={{ position: 'absolute', top: '-3px', bottom: '-3px', left: pct + '%', width: '3px', borderRadius: '2px', background: tokens.dark, transform: 'translateX(-50%)' }} />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '7px' }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', color: tokens.ghost }}>0</span>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', color: tokens.ghost }}>10</span>
      </div>
    </div>
  )
}

// ── Small shared style atoms ──────────────────────────────────
const cardStyle = { background: '#FFFFFF', border: `1px solid ${GOLD_RULE}`, borderRadius: '14px', padding: '22px 22px 24px', marginTop: '16px' }
const beatLabel = { ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: tokens.gold, display: 'flex', alignItems: 'center', gap: '12px' }
const eyebrow = { ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: tokens.gold }
const listLabel = { ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: tokens.meta, margin: '24px 0 10px' }
const ghostBtn = { ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.04em', background: 'transparent', border: `1px solid ${GOLD_RULE}`, borderRadius: '40px', color: tokens.gold, padding: '9px 16px', cursor: 'pointer' }
const solidBtn = { ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.04em', background: tokens.goldChrome, color: '#FFFFFF', border: 'none', borderRadius: '40px', padding: '14px 28px', cursor: 'pointer' }
const linkBtn = { ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.04em', background: 'none', border: 'none', color: tokens.gold, cursor: 'pointer', padding: 0 }
const tplCard = { display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', border: `1px solid ${GOLD_RULE}`, borderRadius: '14px', background: '#FFFFFF', padding: '13px 15px', marginBottom: '10px' }
const tplName = { ...serif, fontSize: '20px', fontWeight: 500, color: tokens.dark, lineHeight: 1.1 }
const tplNote = { ...body, fontSize: '14px', color: tokens.ghost, marginTop: '3px' }
function Beat({ label, children }) {
  return (
    <section style={{ marginTop: '40px' }}>
      <div style={beatLabel}><span>{label}</span><span style={{ flex: 1, height: '1px', background: GOLD_RULE }} /></div>
      <div style={cardStyle}>{children}</div>
    </section>
  )
}

// ── Movement-row helpers (kind → fields) ──────────────────────
function rowKind(r) { return (r.flow || r.cardio) ? 'flow' : (r.bw ? 'bw' : 'load') }
function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
      <label style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: tokens.ghost }}>{label}</label>
      <input defaultValue={value == null ? '' : String(value)} style={{ width: '58px', textAlign: 'center', ...body, fontSize: '15px', color: tokens.dark, background: tokens.bg, border: `1px solid ${GOLD_RULE}`, borderRadius: '10px', padding: '7px 4px' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
export default function Training({ embedded = false } = {}) {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [domain, setDomain] = useState('body')
  const [view, setView] = useState('train')          // 'train' | 'edit'
  const [editStage, setEditStage] = useState('week') // 'week' | 'blocks' | 'compose'
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDay, setOpenDay] = useState(null)

  const [readiness, setReadiness] = useState({ energy: null, sleep: null, soreness: null, readiness: null })
  const [landed, setLanded] = useState({ effort: null, after: null })
  const [notes, setNotes] = useState('')
  const [loaded, setLoaded] = useState(null)         // the started session

  const [types, setTypes] = useState([])             // training_session_types rows
  const [schedule, setSchedule] = useState({})       // { domain: { weekdayIdx: [ids] } }
  const [sessions, setSessions] = useState([])       // logged training_sessions
  const [loadingData, setLoadingData] = useState(true)

  const [composer, setComposer] = useState(null)     // { title, sub, domain, name, rows:[{name,k,sets,reps,cue}], editingId }
  const [composerTargetDay, setComposerTargetDay] = useState(null)
  const [composerDisc, setComposerDisc] = useState('Calisthenics')

  // Auth gate
  useEffect(() => { if (!authLoading && !user) navigate('/login') }, [authLoading, user, navigate])

  // Load everything
  useEffect(() => {
    if (authLoading || !user) return
    let alive = true
    ;(async () => {
      setLoadingData(true)
      const [tRes, schRes, sesRes] = await Promise.allSettled([
        supabase.from('training_session_types').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('training_schedule').select('*').eq('user_id', user.id),
        supabase.from('training_sessions').select('*').eq('user_id', user.id).order('occurred_at', { ascending: false }).limit(60),
      ])
      if (!alive) return
      if (tRes.status === 'fulfilled' && !tRes.value.error) setTypes(tRes.value.data || [])
      if (schRes.status === 'fulfilled' && !schRes.value.error) {
        const map = {}
        for (const r of (schRes.value.data || [])) {
          if (!map[r.domain]) map[r.domain] = {}
          map[r.domain][r.weekday] = Array.isArray(r.session_type_ids) ? r.session_type_ids : []
        }
        setSchedule(map)
      }
      if (sesRes.status === 'fulfilled' && !sesRes.value.error) setSessions(sesRes.value.data || [])
      setLoadingData(false)
    })()
    return () => { alive = false }
  }, [authLoading, user])

  // Derived: my types in the active domain
  const mine = useMemo(() => types.filter(t => t.domain === domain), [types, domain])
  const typeById = useMemo(() => Object.fromEntries(types.map(t => [t.id, t])), [types])
  const idsFor = useCallback((dom, dayIdx) => (schedule[dom] && schedule[dom][dayIdx]) || [], [schedule])
  const todaysTypes = useMemo(
    () => idsFor(domain, todayIdx()).map(id => typeById[id]).filter(Boolean),
    [idsFor, domain, typeById]
  )

  // ── Schedule persistence ────────────────────────────────────
  async function writeSlot(dom, dayIdx, ids) {
    setSchedule(prev => ({ ...prev, [dom]: { ...(prev[dom] || {}), [dayIdx]: ids } }))
    if (!user) return
    await supabase.from('training_schedule')
      .upsert({ user_id: user.id, domain: dom, weekday: dayIdx, session_type_ids: ids, updated_at: new Date().toISOString() }, { onConflict: 'user_id,domain,weekday' })
  }
  function addToDay(dayIdx, id) { writeSlot(domain, dayIdx, [...idsFor(domain, dayIdx), id]) }
  function removeFromDay(dayIdx, pos) { const cur = idsFor(domain, dayIdx).slice(); cur.splice(pos, 1); writeSlot(domain, dayIdx, cur) }

  // ── Log a session ───────────────────────────────────────────
  async function logSession() {
    if (!user) return
    const name = loaded?.name || 'Session'
    const typeId = loaded?.id || null
    const charge = readiness.readiness ?? readiness.energy
    const optimistic = { _temp: true, domain, session_type_id: typeId, name, readiness, effort: landed.effort, energy_after: landed.after, notes: notes.trim() || null, occurred_at: new Date().toISOString() }
    setSessions(prev => [optimistic, ...prev])
    setLoaded(null); setNotes('')
    const { data } = await supabase.from('training_sessions').insert({
      user_id: user.id, domain, session_type_id: typeId, name,
      readiness, effort: landed.effort, energy_after: landed.after, notes: optimistic.notes,
    }).select('*').single()
    if (data) setSessions(prev => [data, ...prev.filter(s => !s._temp)])
    // join the one continuous journal
    const summary = `${LABEL[domain]} · ${name} · logged${charge != null ? ` · charge ${charge}` : ''}`
    supabase.from('journal_entries').insert({ user_id: user.id, body: summary, domain })
    // mark consistency (shared primitive)
    const activeDate = new Date().toISOString().slice(0, 10)
    supabase.from('daily_tool_activity').upsert({ user_id: user.id, tool_key: 'training', active_date: activeDate }, { onConflict: 'user_id,tool_key,active_date' })
  }

  // ── Composer ────────────────────────────────────────────────
  function rowToComposer(r) { return { name: r.n, k: rowKind(r), sets: r.sets, reps: r.reps, cue: r.cue } }
  function composerRowToStored(r) {
    if (r.k === 'load') return { n: r.name, sets: r.sets, reps: r.reps, cue: r.cue }
    if (r.k === 'bw') return { n: r.name, bw: true, sets: r.sets, reps: r.reps, cue: r.cue }
    return { n: r.name, flow: true, cue: r.cue }
  }
  function openBlock(t) {
    setComposer({ title: 'Adapt this block', sub: 'Block · ' + t.name, domain, name: '', rows: t.rows.filter(r => !r.sec).map(rowToComposer), editingId: null })
    setComposerDisc(Object.keys(libFor(domain))[0]); setEditStage('compose')
  }
  function openCustom() {
    setComposer({ title: 'Custom session', sub: 'Blank page', domain, name: '', rows: [], editingId: null })
    setComposerDisc(Object.keys(libFor(domain))[0]); setEditStage('compose')
  }
  function isPlaceholder(name) { return name.indexOf('Movement') === 0 || name.indexOf('Part') === 0 }
  function addMovement(m) {
    setComposer(c => {
      const rows = c.rows.slice()
      const slot = rows.findIndex(r => isPlaceholder(r.name))
      if (slot >= 0) { rows[slot] = { ...rows[slot], name: m.n } }
      else { const row = { name: m.n, k: m.k }; if (m.k === 'load') { row.sets = 3; row.reps = 5 } else if (m.k === 'bw') { row.sets = 3; row.reps = 10 } rows.push(row) }
      return { ...c, rows }
    })
  }
  function addBlankSlot() { setComposer(c => ({ ...c, rows: [...c.rows, { name: 'Movement', k: 'bw', sets: 3, reps: 10 }] })) }
  function removeComposerRow(i) { setComposer(c => { const rows = c.rows.slice(); rows.splice(i, 1); return { ...c, rows } }) }
  function setRowField(i, field, val) { setComposer(c => { const rows = c.rows.slice(); rows[i] = { ...rows[i], [field]: val }; return { ...c, rows } }) }

  async function saveComposer() {
    if (!composer) return
    const name = (composer.name || '').trim()
    if (!name || composer.rows.length === 0) return
    const storedRows = composer.rows.map(composerRowToStored)
    if (composer.editingId) {
      setTypes(prev => prev.map(t => t.id === composer.editingId ? { ...t, name, rows: storedRows } : t))
      await supabase.from('training_session_types').update({ name, rows: storedRows, updated_at: new Date().toISOString() }).eq('id', composer.editingId)
    } else if (user) {
      const insert = { user_id: user.id, domain: composer.domain, name, kind: 'Your session', rows: storedRows }
      const { data } = await supabase.from('training_session_types').insert(insert).select('*').single()
      if (data) {
        setTypes(prev => [...prev, data])
        if (composerTargetDay != null) writeSlot(composer.domain, composerTargetDay, [...idsFor(composer.domain, composerTargetDay), data.id])
      }
    }
    setComposer(null); setComposerTargetDay(null); setEditStage('week'); setOpenDay(null)
  }

  // ── Readout (from logged sessions) ──────────────────────────
  const readout = useMemo(() => {
    const now = Date.now()
    const recent = sessions.filter(s => {
      const t = new Date(s.occurred_at || s.created_at || now).getTime()
      return now - t <= 14 * 24 * 3600 * 1000
    })
    const shifts = sessions
      .map(s => (s.energy_after != null && s.readiness && s.readiness.energy != null) ? (s.energy_after - s.readiness.energy) : null)
      .filter(v => v != null)
    const avgShift = shifts.length ? shifts.reduce((a, b) => a + b, 0) / shifts.length : 0
    const counts = {}
    recent.forEach(s => { counts[s.domain] = (counts[s.domain] || 0) + 1 })
    const bars = sessions.slice(0, 12).reverse().map(s => {
      const c = (s.readiness && (s.readiness.readiness ?? s.readiness.energy)) ?? 6
      return Math.max(0, Math.min(10, c))
    })
    return { count: recent.length, avgShift, counts, bars }
  }, [sessions])

  if (authLoading || (!user && !authLoading)) return null

  const pageStyle = embedded
    ? { ...body, color: tokens.dark }
    : { ...body, background: tokens.bg, minHeight: '100dvh', color: tokens.dark }

  // ── Render: top tabs ────────────────────────────────────────
  function topBar() {
    return (
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: tokens.bg, display: 'flex', gap: '10px', alignItems: 'center', padding: '18px 0 16px', borderBottom: `1px solid ${GOLD_RULE}`, marginBottom: '8px' }}>
        <div style={{ position: 'relative' }}>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o) }} style={{ ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.06em', border: `1px solid ${GOLD_RULE}`, background: 'transparent', color: tokens.meta, borderRadius: '40px', padding: '9px 18px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span>{LABEL[domain]}</span><span style={{ fontSize: '13px', opacity: 0.8 }}>▾</span>
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: '200px', background: '#FFFFFF', border: `1px solid ${GOLD_RULE}`, borderRadius: '14px', padding: '6px', boxShadow: '0 8px 28px rgba(15,21,35,0.10)', zIndex: 30 }}>
              {DOMAINS.map(d => (
                <button key={d.key} onClick={() => { setDomain(d.key); setMenuOpen(false); setLoaded(null); setOpenDay(null); if (view === 'edit') setEditStage('week') }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', ...body, fontSize: '15px', color: d.key === domain ? tokens.gold : tokens.dark, background: 'none', border: 'none', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer' }}>
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => { setView(v => v === 'edit' ? 'train' : 'edit'); setEditStage('week'); setOpenDay(null); setComposer(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          style={{ ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.06em', border: `1px solid ${view === 'edit' ? tokens.goldChrome : GOLD_RULE}`, background: view === 'edit' ? tokens.goldChrome : 'transparent', color: view === 'edit' ? '#FFFFFF' : tokens.meta, borderRadius: '40px', padding: '9px 18px', cursor: 'pointer' }}>
          Edit week
        </button>
      </div>
    )
  }

  // ── Render: a loaded session (the work) ─────────────────────
  function loadedView() {
    if (!loaded) return null
    return (
      <div style={{ marginTop: '24px', paddingTop: '22px', borderTop: `1px solid ${GOLD_RULE}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
          <span style={{ ...serif, fontSize: '26px', fontWeight: 500, color: tokens.dark }}>{loaded.name}</span>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.gold }}>{LABEL[domain]} · {loaded.kind || ''}</span>
        </div>
        {(loaded.rows || []).map((r, i) => (
          r.sec
            ? <div key={i} style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: tokens.gold, margin: '18px 0 2px' }}>{r.sec}</div>
            : (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 0', borderTop: `1px solid ${GOLD_RULE}` }}>
                <div style={{ flex: 1, minWidth: '130px' }}>
                  <div style={{ ...body, fontSize: '16px', color: tokens.dark }}>{r.n}</div>
                  {r.cue && <div style={{ ...body, fontSize: '13.5px', color: tokens.ghost, marginTop: '2px', lineHeight: 1.35 }}>{r.cue}</div>}
                </div>
                {rowKind(r) === 'flow'
                  ? <Field label="Reps / Time" value="" />
                  : rowKind(r) === 'bw'
                    ? <><Field label="Sets" value={r.sets} /><Field label="Reps" value={r.reps} /></>
                    : <><Field label="Sets" value={r.sets} /><Field label="Reps" value={r.reps} /><Field label="Load" value="" /></>}
              </div>
            )
        ))}
      </div>
    )
  }

  // ── Render: today (the train view session beat) ─────────────
  function todayBody() {
    if (todaysTypes.length === 0) {
      return (
        <div style={{ border: `1px dashed ${GOLD_RULE}`, borderRadius: '14px', padding: '22px', textAlign: 'center' }}>
          <p style={{ ...body, fontSize: '15px', color: tokens.ghost, margin: '0 0 14px' }}>Nothing scheduled today in {LABEL[domain]}.</p>
          <button style={ghostBtn} onClick={() => { setView('edit'); setEditStage('week') }}>Open your week</button>
        </div>
      )
    }
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: tokens.gold }}>Today · {LABEL[domain]}</span>
          <button style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', border: `1px solid ${GOLD_RULE}`, background: 'transparent', color: tokens.gold, borderRadius: '40px', padding: '6px 14px', cursor: 'pointer' }}
            onClick={() => { setView('edit'); setEditStage('week') }}>Edit</button>
        </div>
        {todaysTypes.map((s, i) => (
          <div key={s.id + ':' + i} style={{ background: GOLD_TINT, border: `1px solid ${GOLD_RULE}`, borderRadius: '14px', padding: '20px 20px 22px', marginTop: '14px' }}>
            <div style={{ ...serif, fontSize: '28px', fontWeight: 500, lineHeight: 1.05, color: tokens.dark }}>{s.name}</div>
            {s.kind && <div style={{ ...body, fontSize: '15px', color: tokens.meta, margin: '6px 0 16px' }}>{s.kind}</div>}
            <div><button style={solidBtn} onClick={() => { setLoaded(s) }}>Start</button></div>
          </div>
        ))}
      </>
    )
  }

  // ── Render: readout ─────────────────────────────────────────
  function readoutBody() {
    const s = (readout.avgShift >= 0 ? '+' : '') + readout.avgShift.toFixed(1)
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
          <div>
            <div style={{ ...serif, fontSize: '36px', fontWeight: 500, lineHeight: 1, color: tokens.dark }}>{readout.count}</div>
            <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.meta, marginTop: '6px' }}>sessions logged · last 14 days</div>
          </div>
          <div>
            <div style={{ ...serif, fontSize: '36px', fontWeight: 500, lineHeight: 1, color: tokens.dark }}>{s}</div>
            <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.meta, marginTop: '6px' }}>energy shift · after vs before</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '12px' }}>
          {Object.keys(readout.counts).map(k => (
            <span key={k} style={{ ...body, fontSize: '14px', color: tokens.meta }}>
              <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '2px', marginRight: '6px', background: scaleBand(7) }} />{LABEL[k] || k} {readout.counts[k]}
            </span>
          ))}
        </div>
        {readout.bars.length > 0 && (
          <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: `1px solid ${GOLD_RULE}` }}>
            <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.meta, marginBottom: '12px' }}>Charge, recent sessions</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '84px' }}>
              {readout.bars.map((v, i) => (
                <div key={i} style={{ flex: 1, borderRadius: '5px 5px 2px 2px', minHeight: '6px', height: Math.max(6, Math.round(v / 10 * 84)) + 'px', background: scaleBand(v) }} />
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Render: edit → week ─────────────────────────────────────
  function weekView() {
    return (
      <div>
        <div style={eyebrow}>Off the day</div>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(34px,7vw,50px)', lineHeight: 1.04, margin: '10px 0 0', color: tokens.dark }}>Your training week</h1>
        <div style={cardStyle}>
          {WEEK.map((day, idx) => {
            const ids = idsFor(domain, idx)
            const isToday = idx === todayIdx()
            return (
              <div key={day}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderTop: idx === 0 ? 'none' : `1px solid ${GOLD_RULE}` }}>
                  <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: isToday ? tokens.gold : tokens.meta, width: '104px', flex: 'none' }}>{day}{isToday ? ' · today' : ''}</div>
                  <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ids.length === 0 && <span style={{ ...body, fontSize: '14px', color: tokens.ghost }}>rest</span>}
                    {ids.map((id, pos) => (
                      <span key={id + ':' + pos} style={{ ...body, fontSize: '14px', color: tokens.dark, background: GOLD_TINT, border: `1px solid ${GOLD_RULE}`, borderRadius: '40px', padding: '4px 6px 4px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {(typeById[id] && typeById[id].name) || 'session'}
                        <button onClick={() => removeFromDay(idx, pos)} style={{ ...sc, fontSize: '15px', lineHeight: 1, border: 'none', background: 'none', color: tokens.ghost, cursor: 'pointer', padding: '0 4px' }}>×</button>
                      </span>
                    ))}
                  </div>
                  <button onClick={() => setOpenDay(openDay === idx ? null : idx)} style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', border: `1px solid ${GOLD_RULE}`, background: 'transparent', color: tokens.gold, borderRadius: '40px', padding: '6px 13px', cursor: 'pointer', flex: 'none' }}>
                    {openDay === idx ? 'Close' : (ids.length ? 'Edit' : 'Add')}
                  </button>
                </div>
                {openDay === idx && (
                  <div style={{ padding: '4px 0 16px', borderTop: `1px solid ${GOLD_RULE}` }}>
                    <div style={listLabel}>Your sessions</div>
                    {mine.length === 0
                      ? <div style={tplNote}>None yet in {LABEL[domain]}. Start blank or from a template below.</div>
                      : (
                        <div>
                          {mine.map(s => (
                            <button key={s.id} onClick={() => addToDay(idx, s.id)} style={{ ...body, fontSize: '14px', border: `1px solid ${GOLD_RULE}`, borderRadius: '40px', background: '#FFFFFF', color: tokens.dark, padding: '7px 13px', cursor: 'pointer', margin: '0 8px 8px 0' }}>
                              <span style={{ ...sc, color: tokens.gold, fontWeight: 600 }}>+ </span>{s.name}
                            </button>
                          ))}
                        </div>
                      )}
                    <div style={listLabel}>Start new</div>
                    <button style={tplCard} onClick={() => { setComposerTargetDay(idx); openCustom() }}>
                      <div style={tplName}>Blank page</div>
                      <div style={tplNote}>Build it from scratch.</div>
                    </button>
                    {blocksFor(domain).map((t, i) => (
                      <button key={i} style={tplCard} onClick={() => { setComposerTargetDay(idx); openBlock(t) }}>
                        <div style={tplName}>{t.name}</div>
                        <div style={tplNote}>{t.note}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <button style={{ ...solidBtn, marginTop: '22px' }} onClick={() => { setView('train'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Done</button>
      </div>
    )
  }

  // ── Render: edit → blocks (make new) ────────────────────────
  function blocksView() {
    return (
      <div>
        <div style={eyebrow}>Make new · {LABEL[domain]}</div>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(34px,7vw,50px)', lineHeight: 1.04, margin: '10px 0 0', color: tokens.dark }}>Pick a block</h1>
        <p style={{ ...body, fontSize: '15px', color: tokens.meta, margin: '10px 0 0' }}>Start from a structure, then adapt the movements. Or a blank page.</p>
        <div style={cardStyle}>
          {blocksFor(domain).map((t, i) => (
            <button key={i} style={tplCard} onClick={() => openBlock(t)}>
              <div style={tplName}>{t.name}</div>
              <div style={tplNote}>{t.note}</div>
            </button>
          ))}
          <button style={{ ...ghostBtn, marginTop: '8px' }} onClick={openCustom}>Custom blank page</button>
        </div>
        <button style={{ ...linkBtn, marginTop: '18px' }} onClick={() => setEditStage('week')}>Back to week</button>
      </div>
    )
  }

  // ── Render: edit → compose ──────────────────────────────────
  function composeView() {
    if (!composer) return null
    const lib = libFor(composer.domain)
    const discs = Object.keys(lib)
    const disc = discs.indexOf(composerDisc) < 0 ? discs[0] : composerDisc
    return (
      <div>
        <div style={eyebrow}>{composer.sub}</div>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(34px,7vw,50px)', lineHeight: 1.04, margin: '10px 0 0', color: tokens.dark }}>{composer.title}</h1>

        <div style={{ marginTop: '22px' }}>
          <label style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.meta, display: 'block', marginBottom: '8px' }}>Name this session</label>
          <input value={composer.name} onChange={e => setComposer(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Day C, Lower body, Morning sit"
            style={{ width: '100%', boxSizing: 'border-box', ...body, fontSize: '16px', color: tokens.dark, background: tokens.bg, border: `1px solid ${GOLD_RULE}`, borderRadius: '14px', padding: '12px 14px', outline: 'none' }} />
        </div>

        <div style={{ marginTop: '22px' }}>
          <label style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.meta, display: 'block', marginBottom: '8px' }}>Filed under</label>
          <div style={tplNote}>{LABEL[composer.domain]}</div>
        </div>

        <div style={{ marginTop: '22px' }}>
          <label style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.meta, display: 'block', marginBottom: '8px' }}>Fill a slot from a discipline</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {discs.map(dc => (
              <button key={dc} onClick={() => setComposerDisc(dc)} style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', padding: '8px 14px', borderRadius: '40px', cursor: 'pointer', border: `1px solid ${dc === disc ? tokens.goldChrome : GOLD_RULE}`, background: dc === disc ? GOLD_TINT : 'transparent', color: dc === disc ? tokens.gold : tokens.meta }}>{dc}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(lib[disc] || []).map((m, i) => (
              <button key={i} onClick={() => addMovement(m)} style={{ ...body, fontSize: '14px', border: `1px solid ${GOLD_RULE}`, borderRadius: '40px', background: '#FFFFFF', color: tokens.dark, padding: '7px 13px', cursor: 'pointer' }}>
                <span style={{ ...sc, color: tokens.gold, fontWeight: 600 }}>+ </span>{m.n}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '22px' }}>
          <label style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.meta, display: 'block', marginBottom: '8px' }}>Movements and scheme</label>
          {composer.rows.length === 0 && <div style={{ ...tplNote, margin: 0 }}>Empty. Add a slot, or fill from a discipline above.</div>}
          {composer.rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 0', borderTop: `1px solid ${GOLD_RULE}` }}>
              <div style={{ flex: 1, minWidth: '130px' }}>
                <input value={r.name} onChange={e => setRowField(i, 'name', e.target.value)} placeholder="Movement"
                  style={{ width: '100%', boxSizing: 'border-box', ...body, fontSize: '16px', color: tokens.dark, background: 'transparent', border: 'none', borderBottom: `1px solid ${GOLD_RULE}`, padding: '4px 0', outline: 'none' }} />
                {r.cue && <div style={{ ...body, fontSize: '13.5px', color: tokens.ghost, marginTop: '2px' }}>{r.cue}</div>}
              </div>
              {r.k === 'load'
                ? <><SchemeInput label="Sets" value={r.sets} onChange={v => setRowField(i, 'sets', v)} /><SchemeInput label="Reps" value={r.reps} onChange={v => setRowField(i, 'reps', v)} /><SchemeInput label="Load" value="" onChange={() => {}} /></>
                : r.k === 'bw'
                  ? <><SchemeInput label="Sets" value={r.sets} onChange={v => setRowField(i, 'sets', v)} /><SchemeInput label="Reps" value={r.reps} onChange={v => setRowField(i, 'reps', v)} /></>
                  : <SchemeInput label="Reps / Time" value="" wide onChange={() => {}} />}
              <button onClick={() => removeComposerRow(i)} style={{ ...sc, fontSize: '18px', lineHeight: 1, background: 'none', border: 'none', color: tokens.ghost, cursor: 'pointer', padding: '2px 6px' }}>×</button>
            </div>
          ))}
          <button style={{ ...ghostBtn, marginTop: '14px' }} onClick={addBlankSlot}>+ Add blank slot</button>
        </div>

        <div style={{ marginTop: '22px', display: 'flex', gap: '18px', alignItems: 'center' }}>
          <button style={solidBtn} onClick={saveComposer}>Save session</button>
          <button style={linkBtn} onClick={() => { setComposer(null); setEditStage('week') }}>Cancel</button>
        </div>
      </div>
    )
  }

  // ── Compose ─────────────────────────────────────────────────
  return (
    <div style={pageStyle} onClick={() => { if (menuOpen) setMenuOpen(false) }}>
      {!embedded && <Nav />}
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: embedded ? '0 0 40px' : '0 22px 96px' }}>
        {topBar()}

        {view === 'train' && (
          <>
            <header style={{ marginTop: '32px' }}>
              <div style={eyebrow}>Daily · Training</div>
              <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(40px,8vw,58px)', lineHeight: 1.04, margin: '10px 0 0', color: tokens.dark }}>Training</h1>
            </header>

            <Beat label="Readiness">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
                <Slider label="Energy"    value={readiness.energy}    invert={false} onChange={v => setReadiness(s => ({ ...s, energy: v }))} />
                <Slider label="Sleep"     value={readiness.sleep}     invert={false} onChange={v => setReadiness(s => ({ ...s, sleep: v }))} />
                <Slider label="Soreness"  value={readiness.soreness}  invert={true}  onChange={v => setReadiness(s => ({ ...s, soreness: v }))} />
                <Slider label="Readiness" value={readiness.readiness} invert={false} onChange={v => setReadiness(s => ({ ...s, readiness: v }))} />
              </div>
            </Beat>

            <Beat label="Session">
              {todayBody()}
              {loadedView()}
            </Beat>

            <Beat label="After">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
                <Slider label="Effort"       value={landed.effort} invert={false} onChange={v => setLanded(s => ({ ...s, effort: v }))} />
                <Slider label="Energy after" value={landed.after}  invert={false} onChange={v => setLanded(s => ({ ...s, after: v }))} />
              </div>
              <div style={{ marginTop: '22px' }}>
                <label style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.meta, display: 'block', marginBottom: '8px' }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="What you did, what to change next time."
                  style={{ width: '100%', boxSizing: 'border-box', ...body, fontSize: '16px', color: tokens.dark, background: tokens.bg, border: `1px solid ${GOLD_RULE}`, borderRadius: '14px', padding: '12px 14px', outline: 'none', resize: 'vertical' }} />
              </div>
              <div style={{ marginTop: '22px' }}><button style={solidBtn} onClick={logSession}>Log session</button></div>
            </Beat>

            <Beat label="Readout">
              {readoutBody()}
            </Beat>
          </>
        )}

        {view === 'edit' && (
          <div style={{ marginTop: '24px' }}>
            {editStage === 'week' && weekView()}
            {editStage === 'blocks' && blocksView()}
            {editStage === 'compose' && composeView()}
          </div>
        )}
      </main>
    </div>
  )
}

// Editable scheme input bound to composer state.
function SchemeInput({ label, value, wide, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
      <label style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: tokens.ghost }}>{label}</label>
      <input value={value == null ? '' : String(value)} onChange={e => onChange(e.target.value)}
        style={{ width: wide ? '78px' : '58px', textAlign: 'center', ...body, fontSize: '15px', color: tokens.dark, background: tokens.bg, border: `1px solid ${GOLD_RULE}`, borderRadius: '10px', padding: '7px 4px', outline: 'none' }} />
    </div>
  )
}
