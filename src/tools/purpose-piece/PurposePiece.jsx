// ============================================================================
// Purpose Piece — v10 frontend
// ----------------------------------------------------------------------------
// Built against the v10.1 Living Architecture (PP_Living_Architecture_v10_1.docx)
// and the v10 backend (api/purpose-piece-chat.js + _pp-*-stage.js modules).
//
// Backend stage machine:
//     wish → pull → instinct → role → thinking → complete
//
// Visible phases in the UI (what the person sees as the breadcrumb):
//     Wish → Instinct → Role → Confirmation
//
// The backend's `pull` stage is invisible to the user — they experience it as a
// continuation of the Wish phase. The breadcrumb only activates after the
// opening conversation has settled into the structured stages.
//
// The backend contract, response shape:
//   {
//     message?:       string        — prose for the chat thread
//     session:        object        — the full v10 session, round-tripped
//     stage:          string        — 'wish'|'pull'|'instinct'|'role'|'thinking'|'complete'
//     inputMode:      'text'|'none' — whether to show the input box
//     autoAdvance?:   boolean       — if true, fire another call after advanceDelay
//     advanceDelay?:  number (ms)
//     stageComplete?: string        — which stage just finished (for UI transitions)
//     questionLabel?: string        — e.g. "Pull · 2 of 3 · The Frustration"
//     questionIndex?: number
//     firstQuestion?: string        — the first question text, sent alongside the stage opening
//     isProbe?:       boolean       — current prompt is a follow-up, not a fresh question
//     isReframe?:     boolean       — current prompt is a reworded version of the same question
//     phase?:         string        — wish-stage sub-phase (deepening, conversion, etc)
//     // on synthesis completion:
//     complete?:      true
//     profile?:       { ... }       — Phase 4 JSON (archetype named as consequence, etc)
//     mirror_text?:   string        — consent-gated, stored until user opts in
//     placement?:     { territory_description, mode_frame, suggested_readiness,
//                       readiness_reasoning, join_frame, start_frame, transmit_frame,
//                       resource_guidance, node_invitation }
//     civilisational_statement?: string
//     horizon_goal?:  string
//   }
//
// The frontend is a single POST-loop: user types, we post, render response,
// wait for input or fire the next auto-advance call, repeat until `complete`.
//
// Sign-in posture (per hospitality brief): no auth wall to begin. The wish
// stage runs cold. Sign-in is offered at the confirmation/result step — so
// results can be saved and carried into the rest of the ecosystem.
// ============================================================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { ToolCompassPanel } from '../../components/ToolCompassPanel'
import { VoiceInput } from '../../components/VoiceInput'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'

// ─── Shared styles ──────────────────────────────────────────────────────────
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const ser  = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const GOLD   = '#A8721A'
const GOLD_L = '#C8922A'
const FOREST = '#2D6A4F'
const SLATE  = '#2D4A6A'
const INK    = '#0F1523'
const PARCH  = '#FAFAF7'
const MUTE   = 'rgba(15,21,35,0.72)'
const FAINT  = 'rgba(15,21,35,0.45)'

// Session storage key — versioned so a future v11 can cleanly invalidate
const SS_KEY = 'pp_session_v10'
;['pp_session', 'pp_session_v1','pp_session_v2','pp_session_v3','pp_session_v4','pp_session_v5']
  .forEach(k => { try { sessionStorage.removeItem(k) } catch {} })

// ─── Breadcrumb definition ──────────────────────────────────────────────────
// Four visible phases. `pull` is collapsed into `wish` visually.
const PHASES = [
  { id: 'wish',         label: 'Wish'         },
  { id: 'instinct',     label: 'Instinct'     },
  { id: 'role',         label: 'Role'         },
  { id: 'confirmation', label: 'Confirmation' },
]

// Map the backend stage to the visible phase
function stageToPhase(stage) {
  if (stage === 'wish' || stage === 'pull') return 'wish'
  if (stage === 'instinct')                 return 'instinct'
  if (stage === 'role')                     return 'role'
  if (stage === 'thinking' || stage === 'complete') return 'confirmation'
  return 'wish'
}

// Which wedge does this backend stage activate?
function stageToWedge(stage) {
  if (stage === 'wish' || stage === 'pull') return 'wish'
  if (stage === 'instinct')                 return 'instinct'
  if (stage === 'role')                     return 'role'
  return null // thinking / complete → all three lit
}

// ─── The three-wedge disc ───────────────────────────────────────────────────
// Top (Gold)         = Wish → Domain
// Bottom-left (Forest) = Instinct → Archetype
// Bottom-right (Slate) = Role → Sub-function
//
// States per wedge: 'empty' | 'active' | 'complete'
// The disc does NOT appear during the opening wish conversation — per spec,
// "no breadcrumb, no disc pulse, no question label. It feels like a
// conversation, not an assessment." The disc surfaces once pull begins.

function PurposeDisc({ active, complete, size = 180, compact = false }) {
  // active: 'wish' | 'instinct' | 'role' | null
  // complete: { wish: bool, instinct: bool, role: bool }
  const r = size / 2
  const cx = r, cy = r

  // Wedge geometry: three 120° wedges, starting at top (-90°)
  // Wedge 0 (top):    Wish    — from -90° to 30°  (midpoint -30°)
  // Wedge 1 (bot-L):  Instinct — from 150° to 270° (midpoint 210°)  [drawn via negative path]
  // Wedge 2 (bot-R):  Role     — from 30° to 150°  (midpoint 90°)

  function wedgePath(startDeg, endDeg) {
    const s = (startDeg - 90) * (Math.PI / 180)
    const e = (endDeg   - 90) * (Math.PI / 180)
    const x1 = cx + r * Math.cos(s)
    const y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e)
    const y2 = cy + r * Math.sin(e)
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`
  }

  // Define the three wedges by their start/end angles measured clockwise from top
  // Wish:    0°   → 120°
  // Role:   120° → 240°
  // Instinct: 240° → 360°
  const wedges = [
    { id: 'wish',     path: wedgePath(0, 120),   color: GOLD_L, labelA: [cx, cy - r * 0.55], labelB: 'Wish' },
    { id: 'role',     path: wedgePath(120, 240), color: SLATE,  labelA: [cx + r * 0.5, cy + r * 0.32], labelB: 'Role' },
    { id: 'instinct', path: wedgePath(240, 360), color: FOREST, labelA: [cx - r * 0.5, cy + r * 0.32], labelB: 'Instinct' },
  ]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {wedges.map(w => {
        const isComplete = complete?.[w.id]
        const isActive   = active === w.id
        const opacity    = isComplete ? 0.92 : isActive ? 0.38 : 0.12
        const stroke     = isComplete || isActive ? w.color : 'rgba(15,21,35,0.18)'
        return (
          <g key={w.id}>
            <path d={w.path} fill={w.color} opacity={opacity} stroke={stroke} strokeWidth={1.5} />
            {isActive && !isComplete && (
              <path d={w.path} fill={w.color} opacity="0.25">
                <animate attributeName="opacity" values="0.15;0.4;0.15" dur="2.4s" repeatCount="indefinite" />
              </path>
            )}
            {!compact && (
              <text
                x={w.labelA[0]} y={w.labelA[1]}
                textAnchor="middle" dominantBaseline="middle"
                style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', fill: isComplete || isActive ? '#FFFFFF' : 'rgba(15,21,35,0.55)' }}
              >{w.labelB.toUpperCase()}</text>
            )}
          </g>
        )
      })}
      {/* Centre dot — always the gold accent */}
      <circle cx={cx} cy={cy} r={5} fill={PARCH} stroke={GOLD_L} strokeWidth={1.5} />
    </svg>
  )
}

// ─── Breadcrumb row ─────────────────────────────────────────────────────────
// Hidden during the initial wish stage. Surfaces once pull begins (when the
// structured phase of the tool kicks in per the spec).
function Breadcrumb({ currentPhase, visible }) {
  if (!visible) return null
  const idx = PHASES.findIndex(p => p.id === currentPhase)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
      {PHASES.map((p, i) => {
        const done    = i < idx
        const current = i === idx
        return (
          <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              ...sc,
              fontSize: '12px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: current ? GOLD : done ? 'rgba(15,21,35,0.55)' : 'rgba(15,21,35,0.32)',
              fontWeight: current ? 600 : 400,
            }}>{p.label}</span>
            {i < PHASES.length - 1 && (
              <span style={{ color: 'rgba(15,21,35,0.25)', fontSize: '11px' }}>→</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

// ─── Question label (inside a stage) ────────────────────────────────────────
// The backend sends labels like "Pull · 2 of 3 · The Frustration". The stage
// name at the front is system-facing vocabulary — it doesn't help the visitor.
// We strip it and show just the question topic and progress, e.g.
// "The Frustration · 2 of 3" or just the topic alone if no progress info.
function QuestionLabel({ text }) {
  if (!text) return null
  // Parse "Stage · N of M · Label" shape and keep just the last two parts
  const parts = text.split('·').map(s => s.trim()).filter(Boolean)
  // Expected shapes:
  //   3 parts: [stage, "N of M", topic]  →  show "topic · N of M"
  //   2 parts: [stage, topic]            →  show "topic"
  //   otherwise: show as-is (defensive)
  let display = text
  if (parts.length === 3) {
    display = `${parts[2]} · ${parts[1]}`
  } else if (parts.length === 2) {
    display = parts[1]
  }
  return (
    <div style={{
      ...sc,
      fontSize: '12px',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: GOLD,
      marginBottom: '10px',
    }}>{display}</div>
  )
}

// ─── Typing indicator ───────────────────────────────────────────────────────
function Typing() {
  return (
    <div className="typing-indicator" style={{ padding: '4px 0' }}>
      <span /><span /><span />
    </div>
  )
}

// ─── The wish opening card ──────────────────────────────────────────────────
// Replaces the v5 WelcomeModal. Per the hospitality brief + v10 spec:
//   - No auth wall to begin. A cold visitor can start immediately.
//   - No breadcrumb, no disc, no question label.
//   - Feels like a conversation, not an assessment.
//
// The tool shows this inline (not as a modal), and the first user message
// drops them straight into the wish transcript. We don't need a "begin" click
// because the opening message is itself the first thing rendered — they just
// start typing.

// ─── Mirror consent panel ───────────────────────────────────────────────────
// The Mirror is stashed and offered, not auto-delivered. Per spec:
//   "Profile card renders first. North Star signals the mirror is ready.
//    The person receives it when they ask."
function MirrorPanel({ mirrorText, onRevealed }) {
  const [revealed, setRevealed] = useState(false)
  if (!mirrorText) return null
  return (
    <div style={{
      background: '#FFFFFF',
      border: `1.5px solid ${GOLD_L}`,
      borderRadius: '14px',
      padding: '28px',
      marginTop: '24px',
    }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: GOLD, textTransform: 'uppercase', marginBottom: '12px' }}>
        The Mirror
      </div>
      {!revealed ? (
        <>
          <p style={{ ...body, fontSize: '17px', color: INK, lineHeight: 1.8, marginBottom: '18px', fontStyle: 'italic' }}>
            There's a mirror waiting for you. It's not going to tell you what you are — you already know. It's going to say back what I saw clearly enough that you can decide what to do with it.
          </p>
          <button
            onClick={() => { setRevealed(true); onRevealed?.() }}
            style={{
              ...sc,
              fontSize: '15px',
              letterSpacing: '0.14em',
              padding: '13px 28px',
              border: `1.5px solid ${GOLD_L}`,
              background: 'rgba(200,146,42,0.05)',
              color: GOLD,
              borderRadius: '40px',
              cursor: 'pointer',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.05)'; e.currentTarget.style.transform = '' }}
          >
            Show me →
          </button>
        </>
      ) : (
        <div style={{ ...body, fontSize: '17px', color: INK, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
          {mirrorText}
        </div>
      )}
    </div>
  )
}

// ─── Profile card ───────────────────────────────────────────────────────────
// Renders the Phase 4 JSON output from generateProfile.
// The backend may return this as structured JSON or as HTML. We handle both —
// preferring structured because it's cleaner and lets us control typography.
function ProfileCard({ profile, civilisationalStatement, horizonGoal }) {
  if (!profile) return null

  // If backend sent HTML, render it carefully
  if (typeof profile === 'string' && profile.trim().startsWith('<')) {
    return <div style={{ ...body, color: INK, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: profile }} />
  }

  // Grammar defense: fix "a Advisor" / "a Architect" / "a Explorer" etc.
  // The backend was generating these because the prompt hardcoded "I am a".
  // We repair here regardless of the source.
  const repairArticles = (s) =>
    typeof s === 'string'
      ? s.replace(/\b([Aa]) ([AEIOUaeiou])/g, (_, a, v) => (a === 'A' ? 'An' : 'an') + ' ' + v)
      : s
  const statement = repairArticles(civilisationalStatement)

  // Structured JSON path — extract what we know the profile carries.
  // Profile shape from _pp-synthesis.js generateProfile:
  //   { framing, archetype, sub_function_label, domain, scale, statement, sections }
  // but since we control the format here, we accept any shape and surface
  // whatever sections exist.
  return (
    <div style={{
      background: '#FFFFFF',
      border: `1.5px solid ${GOLD_L}`,
      borderRadius: '14px',
      padding: '32px',
    }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: GOLD, textTransform: 'uppercase', marginBottom: '14px' }}>
        Your Purpose Piece
      </div>

      {statement && (
        <p style={{
          ...ser,
          fontSize: 'clamp(22px, 3vw, 28px)',
          fontWeight: 300,
          lineHeight: 1.4,
          color: INK,
          marginBottom: '24px',
        }}>
          {statement}
        </p>
      )}

      {/* Render whatever sections the backend produced */}
      {profile.framing && (
        <p style={{ ...body, fontSize: '17px', lineHeight: 1.8, color: INK, marginBottom: '18px' }}>
          {profile.framing}
        </p>
      )}
      {Array.isArray(profile.sections) && profile.sections.map((s, i) => (
        <div key={i} style={{ marginBottom: '18px' }}>
          {s.title && (
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: GOLD, textTransform: 'uppercase', marginBottom: '6px' }}>
              {s.title}
            </div>
          )}
          {s.text && (
            <p style={{ ...body, fontSize: '16px', lineHeight: 1.8, color: INK, margin: 0 }}>
              {s.text}
            </p>
          )}
        </div>
      ))}

      {horizonGoal && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid rgba(200,146,42,0.22)` }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase', marginBottom: '6px' }}>
            Your domain's horizon
          </div>
          <p style={{ ...body, fontSize: '16px', lineHeight: 1.75, color: MUTE, fontStyle: 'italic', margin: 0 }}>
            {horizonGoal}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── The Placement Card ─────────────────────────────────────────────────────
// The third and new-in-v10 output. This is what makes the tool operational.
// Shows territory, mode, and the three readiness paths (join/start/transmit)
// with the backend's suggested path pre-selected but not forced.
//
// Routes on confirm:
//   join     → /nextus/contributors?pp_archetype=X&pp_domain=Y&pp_scale=Z
//   start    → /nextus/place (organisation/practitioner placement)
//   transmit → /nextus/focus/:domain-slug (their node, for now — transmit
//              submission flow is a future build; the node is the best
//              honest destination until then)
function PlacementCard({ placement, session, onChooseReadiness }) {
  const suggested = placement?.suggested_readiness || 'join'
  const [chosen, setChosen] = useState(suggested)

  if (!placement) return null

  const paths = [
    { id: 'join',     label: 'Join',     sub: 'Find existing work in my domain and contribute to it.',                      frame: placement.join_frame },
    { id: 'start',    label: 'Start',    sub: 'Initiate something that needs to exist in my domain but doesn\'t yet.',      frame: placement.start_frame },
    { id: 'transmit', label: 'Transmit', sub: 'Make my work — writing, research, teaching, art — findable by those it serves.', frame: placement.transmit_frame },
  ]

  const chosenPath = paths.find(p => p.id === chosen)

  return (
    <div style={{
      background: 'rgba(15,21,35,0.04)',
      border: '1px solid rgba(15,21,35,0.12)',
      borderRadius: '14px',
      padding: '32px',
      marginTop: '24px',
    }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: GOLD, textTransform: 'uppercase', marginBottom: '16px' }}>
        Placement
      </div>

      {placement.territory_description && (
        <p style={{ ...body, fontSize: '17px', lineHeight: 1.8, color: INK, marginBottom: '18px' }}>
          {placement.territory_description}
        </p>
      )}

      {placement.mode_frame && (
        <div style={{
          padding: '18px 20px',
          background: '#FFFFFF',
          border: '1px solid rgba(15,21,35,0.08)',
          borderRadius: '10px',
          marginBottom: '24px',
        }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: MUTE, textTransform: 'uppercase', marginBottom: '6px' }}>
            Mode — how your contribution travels
          </div>
          <p style={{ ...body, fontSize: '16px', lineHeight: 1.75, color: INK, margin: 0 }}>
            {placement.mode_frame}
          </p>
        </div>
      )}

      {/* Readiness fork */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase', marginBottom: '10px' }}>
          Which path is yours?
        </div>
        {placement.readiness_reasoning && (
          <p style={{ ...body, fontSize: '15px', color: MUTE, lineHeight: 1.7, marginBottom: '14px', fontStyle: 'italic' }}>
            Suggested: <strong style={{ color: INK, fontStyle: 'normal' }}>{suggested}</strong> — {placement.readiness_reasoning}
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {paths.map(p => {
            const isChosen = chosen === p.id
            return (
              <button
                key={p.id}
                onClick={() => setChosen(p.id)}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  border: isChosen ? `1.5px solid ${GOLD_L}` : '1px solid rgba(15,21,35,0.15)',
                  background: isChosen ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                }}
              >
                <div style={{ ...body, fontSize: '17px', fontWeight: 500, color: isChosen ? GOLD : INK, marginBottom: '4px' }}>
                  {p.label}
                </div>
                <div style={{ ...body, fontSize: '13px', color: MUTE, lineHeight: 1.5 }}>
                  {p.sub}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Frame for the chosen path */}
      {chosenPath?.frame && (
        <div style={{ padding: '20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid rgba(15,21,35,0.08)', marginBottom: '20px' }}>
          <p style={{ ...body, fontSize: '16px', lineHeight: 1.8, color: INK, margin: 0 }}>
            {chosenPath.frame}
          </p>
        </div>
      )}

      {/* Resource guidance */}
      {placement.resource_guidance && (
        <div style={{ padding: '16px 20px', background: 'rgba(200,146,42,0.04)', borderRadius: '10px', marginBottom: '20px' }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase', marginBottom: '6px' }}>
            Reading the territory
          </div>
          <p style={{ ...body, fontSize: '15px', color: INK, lineHeight: 1.75, margin: 0 }}>
            {placement.resource_guidance}
          </p>
        </div>
      )}

      {/* Node invitation — rare */}
      {placement.node_invitation && (
        <div style={{
          padding: '18px 20px',
          background: '#FFFFFF',
          border: `1.5px dashed ${GOLD_L}`,
          borderRadius: '10px',
          marginBottom: '20px',
        }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase', marginBottom: '6px' }}>
            A note
          </div>
          <p style={{ ...body, fontSize: '15px', color: INK, lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>
            {placement.node_invitation}
          </p>
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onChooseReadiness(chosen)}
          style={{
            ...sc,
            fontSize: '15px',
            letterSpacing: '0.14em',
            padding: '13px 28px',
            border: `1.5px solid ${GOLD_L}`,
            background: GOLD_L,
            color: '#FFFFFF',
            borderRadius: '40px',
            cursor: 'pointer',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = GOLD_L; e.currentTarget.style.transform = '' }}
        >
          Go {chosen} →
        </button>
        <a
          href={`/nextus/focus/${session?.domain_id || ''}`}
          style={{
            ...sc,
            fontSize: '15px',
            letterSpacing: '0.14em',
            padding: '13px 28px',
            border: `1.5px solid ${GOLD_L}`,
            background: 'rgba(200,146,42,0.05)',
            color: GOLD,
            borderRadius: '40px',
            textDecoration: 'none',
            transition: 'all 0.18s',
            display: 'inline-block',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.05)' }}
        >
          See your domain →
        </a>
      </div>
    </div>
  )
}

// ─── Sign-in invitation (post-completion, non-blocking) ─────────────────────
// Only shown to unauthenticated visitors after they've completed the tool.
// Never before — per hospitality brief.
function SignInNudge() {
  const returnUrl = encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '/tools/purpose-piece')
  return (
    <div style={{
      marginTop: '24px',
      padding: '20px 24px',
      background: 'rgba(200,146,42,0.05)',
      border: '1px solid rgba(200,146,42,0.22)',
      borderRadius: '12px',
    }}>
      <p style={{ ...body, fontSize: '15px', lineHeight: 1.75, color: INK, marginBottom: '10px' }}>
        Sign in to save these coordinates. They travel with you across every other tool, and they place you on the ecosystem map.
      </p>
      <a
        href={`/login?redirect=${returnUrl}`}
        style={{
          ...sc, fontSize: '14px', letterSpacing: '0.14em',
          color: GOLD, textDecoration: 'none',
          borderBottom: '1px solid rgba(200,146,42,0.35)',
          paddingBottom: '2px',
        }}
      >
        Save my Purpose Piece →
      </a>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export function PurposePiecePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // ── Session state ─────────────────────────────────────────────────────────
  // The session object is the source of truth. Everything else derives from
  // it. We mirror it to sessionStorage on every change so a refresh mid-flow
  // doesn't lose work for unauthenticated users.
  const [session, setSession]       = useState(null)
  const [thinking, setThinking]     = useState(false)
  const [messages, setMessages]     = useState([]) // { role: 'assistant'|'user'|'label', content }
  const [input, setInput]           = useState('')
  const [currentQLabel, setCurrentQLabel] = useState(null)
  const [inputMode, setInputMode]   = useState('text') // 'text' | 'none'
  const [isComplete, setIsComplete] = useState(false)
  const [mirrorText, setMirrorText] = useState(null)
  const [profile, setProfile]       = useState(null)
  const [placement, setPlacement]   = useState(null)
  const [civStatement, setCivStatement]   = useState(null)
  const [horizonGoal, setHorizonGoal]     = useState(null)
  const [initError, setInitError]   = useState(null)

  const threadRef    = useRef(null)
  const textareaRef  = useRef(null)
  const startedRef   = useRef(false)

  // ── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, thinking])

  // ── Persist session to storage ────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({ session, messages, currentQLabel, isComplete, mirrorText, profile, placement, civStatement, horizonGoal }))
    } catch {}
  }, [session, messages, currentQLabel, isComplete, mirrorText, profile, placement, civStatement, horizonGoal])

  // ── The core API call ─────────────────────────────────────────────────────
  const callAPI = useCallback(async ({ message = null, sessionOverride = null }) => {
    const payload = {
      message,
      session: sessionOverride ?? session,
    }
    const res = await fetch('/tools/purpose-piece/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`API ${res.status}: ${text.slice(0, 200)}`)
    }
    return res.json()
  }, [session])

  // ── Apply an API response to UI state ─────────────────────────────────────
  // Handles every response shape the backend can return: messages, transitions,
  // stage openings with first questions, auto-advance chains, and completion.
  const applyResponse = useCallback(async (data) => {
    if (!data) return

    // Update session first — this drives the wedge/breadcrumb state
    if (data.session) setSession(data.session)

    // Handle completion
    if (data.complete || data.stage === 'complete') {
      setIsComplete(true)
      setInputMode('none')
      if (data.profile)        setProfile(data.profile)
      if (data.placement)      setPlacement(data.placement)
      if (data.mirror_text)    setMirrorText(data.mirror_text)
      if (data.civilisational_statement) setCivStatement(data.civilisational_statement)
      if (data.horizon_goal)   setHorizonGoal(data.horizon_goal)
      // Persist the complete result to Supabase if signed in
      if (user?.id && data.session) {
        saveCompleteToSupabase(user.id, data.session)
      }
      return
    }

    // Migration required (v9 session detected)
    if (data.migration_required) {
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      // Clear local storage and restart with fresh v10 session
      try { sessionStorage.removeItem(SS_KEY) } catch {}
      setSession(data.session)
      setInputMode('text')
      return
    }

    // Append prose to the thread if there is any
    if (data.message) {
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    }

    // A stage-opening response might include `firstQuestion` — show it as a
    // separate bubble after the opening so each reads clearly.
    if (data.firstQuestion) {
      // Small timeout so the opening lands visually before the question
      await new Promise(r => setTimeout(r, 350))
      setMessages(prev => [...prev, { role: 'assistant', content: data.firstQuestion }])
    }

    // Update the question label (e.g. "Pull · 2 of 3 · The Frustration")
    if (data.questionLabel !== undefined) setCurrentQLabel(data.questionLabel)

    // Input mode: 'text' shows the textarea, 'none' hides it (used during
    // auto-advance transitions).
    if (data.inputMode !== undefined) setInputMode(data.inputMode)

    // Auto-advance — the backend is telling us to fire another call after
    // a delay, with no user input. This is how stage transitions happen:
    // the backend returns a transition message + autoAdvance: true + the
    // next stage set on session. We fire an empty-message call to make
    // the backend render that stage's opening.
    //
    // NB: the backend's stage-opening responses ALSO carry autoAdvance:true
    // along with a firstQuestion. That's a shape quirk — a stage opening
    // with a first question visible should wait for the user's answer, not
    // auto-fire another call (which would re-hit the opening branch and
    // loop). So: if firstQuestion is present, the auto-advance is a no-op;
    // the flow resumes when the user sends their answer.
    if (data.autoAdvance && !data.firstQuestion) {
      const delay = data.advanceDelay ?? 2000
      setTimeout(async () => {
        setThinking(true)
        try {
          const next = await callAPI({ message: null, sessionOverride: data.session })
          setThinking(false)
          await applyResponse(next)
        } catch (err) {
          setThinking(false)
          setMessages(prev => [...prev, { role: 'assistant', content: 'Something went quiet on my end. Give me a moment and try again.' }])
          console.error('Auto-advance failed:', err)
        }
      }, delay)
    }

    // If we got a stage opening (firstQuestion present), make sure the
    // input is shown regardless of the inputMode:'none' the backend sent
    // for the pre-question transition. The person now needs to type.
    if (data.firstQuestion) {
      setInputMode('text')
    }
  }, [callAPI, user])

  // ── Save complete session to Supabase (fire-and-forget) ───────────────────
  async function saveCompleteToSupabase(userId, sess) {
    try {
      // Upsert the full session into purpose_piece_results
      const { data: existing } = await supabase
        .from('purpose_piece_results')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      const record = {
        user_id: userId,
        version: 'v10',
        status: 'complete',
        session: sess,
        profile: sess.profile,
        archetype: sess.archetype,
        domain:    sess.domain,
        scale:     sess.scale,
        completed_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      }

      if (existing?.id) {
        await supabase.from('purpose_piece_results').update(record).eq('id', existing.id)
      } else {
        await supabase.from('purpose_piece_results').insert(record)
      }

      // Also upsert into contributor_profiles — makes the user visible on
      // the ecosystem map with their coordinates. This is what closes the
      // Purpose-Piece-as-placement loop.
      const cp = {
        id:                       userId,
        archetype:                sess.archetype || null,
        domain_id:                sess.domain_id || null,
        scale:                    sess.scale || null,
        civilisational_statement: sess.civilisational_statement || null,
        last_active_at:           new Date().toISOString(),
        updated_at:               new Date().toISOString(),
      }
      Object.keys(cp).forEach(k => cp[k] === null && delete cp[k])
      await supabase.from('contributor_profiles').upsert(cp, { onConflict: 'id' })

      // Write coordinates to North Star so they flow into other tools
      try {
        await supabase.from('north_star_notes').delete().eq('user_id', userId).eq('tool', 'purpose-piece')
        const notes = [
          sess.archetype ? `Contribution Archetype: ${sess.archetype}` : null,
          sess.domain    ? `Global Domain: ${sess.domain}` : null,
          sess.scale     ? `Scale of Focus: ${sess.scale}` : null,
          sess.sub_function_label ? `Sub-function: ${sess.sub_function_label}` : null,
        ].filter(Boolean)
        if (notes.length) {
          await supabase.from('north_star_notes').insert(notes.map(note => ({ user_id: userId, tool: 'purpose-piece', note })))
        }
      } catch {}
    } catch (e) {
      console.error('Supabase save failed (non-fatal):', e)
    }
  }

  // ── Restore existing session on mount ─────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    async function boot() {
      // 1. Check sessionStorage first — fastest restore
      try {
        const raw = sessionStorage.getItem(SS_KEY)
        if (raw) {
          const saved = JSON.parse(raw)
          if (saved.session) {
            setSession(saved.session)
            setMessages(saved.messages || [])
            setCurrentQLabel(saved.currentQLabel || null)
            setIsComplete(!!saved.isComplete)
            setMirrorText(saved.mirrorText || null)
            setProfile(saved.profile || null)
            setPlacement(saved.placement || null)
            setCivStatement(saved.civStatement || null)
            setHorizonGoal(saved.horizonGoal || null)
            setInputMode(saved.isComplete ? 'none' : 'text')

            // ── Ball-in-its-court detection ─────────────────────────────
            // The backend's session has the user's last answer recorded
            // (the session is persisted with that answer baked in). But if
            // the reply from that turn was lost in a refresh, the thread
            // ends with a user bubble and no next question. The user should
            // not have to re-send — politely poke the backend to continue.
            //
            // We only poke if: not complete, last message is from user, and
            // we have a session to work with.
            const msgs = saved.messages || []
            const last = msgs[msgs.length - 1]
            const ballInBackendsCourt =
              !saved.isComplete &&
              last?.role === 'user' &&
              saved.session

            if (ballInBackendsCourt) {
              setThinking(true)
              try {
                // Call with message:null and the saved session — the backend
                // will pick up from wherever it was and return the next step.
                const res = await fetch('/tools/purpose-piece/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: null, session: saved.session }),
                })
                if (res.ok) {
                  const data = await res.json()
                  setThinking(false)
                  await applyResponse(data)
                } else {
                  setThinking(false)
                  // Fall back silently — the user still has their answer
                  // visible and can manually resend if needed.
                  console.warn('Continue-on-restore failed:', res.status)
                }
              } catch (err) {
                setThinking(false)
                console.warn('Continue-on-restore error:', err)
              }
            }
            return
          }
        }
      } catch {}

      // 2. If signed in, check Supabase for a completed session
      if (user?.id) {
        try {
          const { data } = await supabase
            .from('purpose_piece_results')
            .select('session, status, profile')
            .eq('user_id', user.id)
            .eq('status', 'complete')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (data?.session) {
            const sess = data.session
            setSession(sess)
            setIsComplete(true)
            setInputMode('none')
            setProfile(sess.profile || data.profile || null)
            setPlacement(sess.placement || null)
            setMirrorText(sess.mirror_text || null)
            setCivStatement(sess.civilisational_statement || null)
            setHorizonGoal(sess.horizon_goal || null)
            return
          }
        } catch {}
      }

      // 3. Fresh start — fire the opening call with no message, no session
      setThinking(true)
      try {
        const res = await fetch('/tools/purpose-piece/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: null, session: null }),
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data = await res.json()
        setThinking(false)
        await applyResponse(data)
      } catch (err) {
        setThinking(false)
        setInitError('The tool couldn\'t start. Please refresh in a moment.')
        console.error('Boot failed:', err)
      }
    }
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ── Send user input ───────────────────────────────────────────────────────
  async function send() {
    const text = input.trim()
    if (!text || thinking) return
    if (!session) return

    // Optimistically add user bubble
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setThinking(true)

    try {
      const data = await callAPI({ message: text })
      setThinking(false)
      await applyResponse(data)
    } catch (err) {
      setThinking(false)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went quiet on my end. Try sending that again in a moment.' }])
      console.error('Send failed:', err)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function onInputChange(e) {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }
  }

  // ── Readiness path choice — routes out of the tool ────────────────────────
  function handleReadinessChoice(path) {
    const archetype = session?.archetype || ''
    const domain    = session?.domain    || ''
    const domainSlug= session?.domain_id || domain.toLowerCase().replace(/[^a-z]+/g, '-')
    const scale     = session?.scale     || ''

    if (path === 'join') {
      const p = new URLSearchParams()
      if (archetype) p.set('pp_archetype', archetype)
      if (domainSlug) p.set('pp_domain', domainSlug)
      if (scale)     p.set('pp_scale', scale)
      p.set('pp_from', 'purpose-piece')
      navigate(`/nextus/contributors?${p.toString()}`)
    } else if (path === 'start') {
      navigate('/nextus/place')
    } else if (path === 'transmit') {
      // Transmit submission flow doesn't exist yet. Best honest destination:
      // the user's node, where they can see their domain's Horizon Goal and
      // actors working in that territory.
      navigate(`/nextus/focus/${domainSlug}`)
    }
  }

  // ── Start over (after completion) ─────────────────────────────────────────
  function restart() {
    if (!confirm('Start Purpose Piece again? Your current result stays saved.')) return
    try { sessionStorage.removeItem(SS_KEY) } catch {}
    window.location.reload()
  }

  // ── Derived display state ─────────────────────────────────────────────────
  const currentStage = session?.stage || 'wish'
  const currentPhase = stageToPhase(currentStage)
  const activeWedge  = stageToWedge(currentStage)
  const wedgeComplete = {
    wish:     ['instinct','role','thinking','complete'].includes(currentStage),
    instinct: ['role','thinking','complete'].includes(currentStage),
    role:     ['thinking','complete'].includes(currentStage),
  }
  // Breadcrumb and disc are hidden during the opening wish conversation —
  // they activate once the pull stage begins, per spec.
  const structureVisible = currentStage !== 'wish'

  // ── Render ────────────────────────────────────────────────────────────────
  if (initError) {
    return (
      <div className="page-shell">
        <Nav activePath="nextus-self" />
        <div className="tool-wrap">
          <p style={{ ...body, fontSize: '17px', color: INK, lineHeight: 1.75 }}>{initError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <Nav activePath="nextus-self" />

      <div className="tool-wrap" style={{ maxWidth: '720px' }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="tool-header">
          <span className="tool-eyebrow">NextUs</span>
          <h1 className="tool-title">Purpose Piece</h1>
          <p style={{ ...body, fontSize: '1.125rem', fontWeight: 300, color: MUTE, marginTop: '8px', lineHeight: 1.65, maxWidth: '540px' }}>
            {isComplete
              ? 'Your coordinates.'
              : 'A conversation that finds what you wish the world had more of, names the instinct you\'d use to create it, and shows you where that work is already happening.'}
          </p>
        </div>

        {/* ── Breadcrumb + Disc (surfaces after wish settles) ───────────── */}
        {structureVisible && !isComplete && (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <Breadcrumb currentPhase={currentPhase} visible={structureVisible} />
              {currentQLabel && <QuestionLabel text={currentQLabel} />}
            </div>
            <div style={{ flexShrink: 0 }}>
              <PurposeDisc active={activeWedge} complete={wedgeComplete} size={120} compact />
            </div>
          </div>
        )}

        {/* ── Confirmation: Profile + Mirror + Placement ──────────────── */}
        {isComplete && (
          <div style={{ marginTop: '16px' }}>
            {/* Purpose Piece logo — the mark of the tool, not a progress
                indicator. Replaces the process-wedges disc since the process
                is done here. */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
              <img
                src="/purpose-piece-logo.png"
                alt="Purpose Piece"
                style={{
                  width: '180px',
                  height: 'auto',
                  display: 'block',
                }}
              />
            </div>

            <ProfileCard
              profile={profile}
              civilisationalStatement={civStatement}
              horizonGoal={horizonGoal}
            />

            <MirrorPanel mirrorText={mirrorText} />

            <PlacementCard
              placement={placement}
              session={session}
              onChooseReadiness={handleReadinessChoice}
            />

            {!user && <SignInNudge />}

            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button
                onClick={restart}
                style={{
                  ...sc, fontSize: '13px', letterSpacing: '0.14em',
                  color: FAINT, background: 'transparent',
                  border: 'none', cursor: 'pointer',
                  textDecoration: 'underline', textUnderlineOffset: '4px',
                }}
              >
                Start over
              </button>
            </div>
          </div>
        )}

        {/* ── Chat thread (during flow) ───────────────────────────────── */}
        {!isComplete && (
          <>
            <div className="chat-thread">
              {messages.map((m, i) => {
                if (m.role === 'assistant') return (
                  <div key={i} className="bubble bubble-assistant" style={{ ...body, whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </div>
                )
                if (m.role === 'user') return (
                  <div key={i} className="bubble bubble-user" style={{ ...body, fontStyle: 'italic' }}>
                    {m.content}
                  </div>
                )
                return null
              })}
              {thinking && (
                <div className="bubble bubble-assistant">
                  <Typing />
                </div>
              )}
              <div ref={threadRef} />
            </div>

            {/* ── Input area ───────────────────────────────────────────── */}
            {inputMode === 'text' && (
              <div className="input-area">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={onInputChange}
                  onKeyDown={onKeyDown}
                  placeholder="Take your time…"
                  rows={1}
                  disabled={thinking}
                />
                <VoiceInput
                  value={input}
                  onChange={(v) => {
                    setInput(v)
                    // Resize textarea to fit dictated text
                    const el = textareaRef.current
                    if (el) {
                      el.style.height = 'auto'
                      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
                    }
                  }}
                  disabled={thinking}
                />
                <button
                  className="btn-send"
                  onClick={send}
                  disabled={!input.trim() || thinking}
                >
                  Send
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ToolCompassPanel />
    </div>
  )
}

// ─── Deep Purpose Piece — preserved, unchanged wrapper ──────────────────────
// The deep dive tool has its own backend (api/purpose-piece-chat-deep.js) and
// is out of scope for this v10 rebuild. We keep the export so App.jsx's
// current import statement continues to resolve.
//
// If/when the deep flow is redesigned to fit the v10 Mirror→Profile→Placement
// arc, that's a separate build session.
export function PurposePieceDeepPage() {
  return (
    <div className="page-shell">
      <Nav activePath="nextus-self" />
      <div className="tool-wrap" style={{ maxWidth: '640px' }}>
        <div className="tool-header">
          <span className="tool-eyebrow">NextUs</span>
          <h1 className="tool-title">Purpose Piece — Deep</h1>
          <p style={{ ...body, fontSize: '17px', color: MUTE, lineHeight: 1.75, marginTop: '10px' }}>
            The deep experience is being rebuilt to match the v10 architecture.
          </p>
        </div>
        <p style={{ ...body, fontSize: '16px', color: INK, lineHeight: 1.8 }}>
          For now, start with First Look — it produces the three coordinates and the Placement Card. The deep dive will return once we've tested the new shape end-to-end.
        </p>
        <div style={{ marginTop: '24px' }}>
          <a
            href="/tools/purpose-piece"
            style={{
              ...sc, fontSize: '15px', letterSpacing: '0.14em',
              padding: '13px 28px',
              border: `1.5px solid ${GOLD_L}`,
              background: 'rgba(200,146,42,0.05)',
              color: GOLD,
              borderRadius: '40px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Go to Purpose Piece →
          </a>
        </div>
      </div>
    </div>
  )
}
