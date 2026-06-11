// ─────────────────────────────────────────────────────────────
// WinTheDay.jsx
//
// The Get To Do morning practice: Nikhedonia — anticipating
// victory. Three beats:
//
//   1. The framing (once, ever) — installs what "winning"
//      means here: winning WITH, not winning over. Effort and
//      being, not outcome. Shown on first open, then lives
//      behind the ⓘ beside the header.
//   2. The field — today's material: tasks from the active
//      Target Stretch plus freehand adds. Pick up to three wins.
//   3. The pre-living — one win at a time, full card. Press and
//      hold while the flame fills (~2.6s): the hold IS the
//      visualization beat. Release early and it resets. On
//      completion, a haptic pulse, and the next win slides in.
//
// Closes with one optional won-tense line — "Tonight, what's
// true?" — written by the user, resurfaced above the evening
// journal at Embark.
//
// Winning is dealing with the day powerfully, not clearing the
// list. The evening confirms effort ("Showed up"), never outcome.
// That confirmation happens at Embark, not here.
//
// Props:
//   sprintData   — target_sprint_session rows (from
//                  useMissionControlData), source of the field
//   wins         — current session wins array (may be from an
//                  earlier visit today; flow resumes done state)
//   victoryLine  — current session victory line
//   onComplete   — ({ wins, victoryLine }) => void
//   onClose      — () => void (back to deck without completing)
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'

const GOLD     = '#C8922A'
const GOLD_DK  = '#A8721A'
const INK      = '#0F1523'
const SC       = "'Cormorant SC', Georgia, serif"
const BODY     = "'Lora', Georgia, serif"
const DISP     = "'Cormorant Garamond', Georgia, serif"
const META     = 'rgba(15,21,35,0.72)'
const FAINT    = 'rgba(15,21,35,0.55)'
const RULE     = 'rgba(200,146,42,0.20)'

const FRAMING_KEY = 'nextus_wtd_framing_seen'
const MAX_WINS    = 3
const HOLD_MS     = 2600

const DOMAIN_LABELS = {
  path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
  connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal',
}

// ─── Framing screen ───────────────────────────────────────────

function Framing({ onDismiss }) {
  return (
    <div
      onClick={onDismiss}
      style={{
        padding: '36px 24px', textAlign: 'center', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}
    >
      <span style={{ fontFamily: SC, fontSize: '12px', letterSpacing: '0.22em', color: GOLD_DK, textTransform: 'uppercase', marginBottom: '18px' }}>
        Win the Day
      </span>
      <p style={{ fontFamily: BODY, fontSize: '1.125rem', color: INK, lineHeight: 1.8, margin: '0 0 14px', maxWidth: '340px' }}>
        Winning here isn't winning over. It's winning with.
      </p>
      <p style={{ fontFamily: BODY, fontSize: '0.9375rem', color: META, lineHeight: 1.75, margin: '0 0 18px', maxWidth: '340px' }}>
        No one to beat. Nothing to outdo except your own past limitations.
        The question is whether you showed up as your most powerful self —
        the action is yours; the outcome isn't.
      </p>
      <p style={{ fontFamily: BODY, fontSize: '0.875rem', color: FAINT, lineHeight: 1.7, margin: '0 0 22px', maxWidth: '340px' }}>
        "Success is peace of mind, which is a direct result of
        self-satisfaction in knowing you made the effort to do the best
        of which you are capable." — John Wooden
      </p>
      <span style={{ fontFamily: SC, fontSize: '13px', letterSpacing: '0.18em', color: GOLD_DK }}>
        Tap anywhere to begin
      </span>
    </div>
  )
}

// ─── Hold-to-see card ─────────────────────────────────────────

function PreLiveCard({ win, index, total, onSeen }) {
  const [fill, setFill]   = useState(0)       // 0..1
  const [done, setDone]   = useState(false)
  const holdRef  = useRef(null)
  const startRef = useRef(0)

  function startHold(e) {
    if (done) return
    e.preventDefault()
    startRef.current = Date.now()
    holdRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const f = Math.min(1, elapsed / HOLD_MS)
      setFill(f)
      if (f >= 1) {
        clearInterval(holdRef.current)
        holdRef.current = null
        setDone(true)
        if (navigator.vibrate) navigator.vibrate([14, 50, 14])
        setTimeout(() => onSeen(), 450)
      }
    }, 40)
  }

  function endHold() {
    if (done) return
    if (holdRef.current) {
      clearInterval(holdRef.current)
      holdRef.current = null
    }
    setFill(0)
  }

  useEffect(() => () => { if (holdRef.current) clearInterval(holdRef.current) }, [])

  return (
    <div style={{ textAlign: 'center', padding: '20px 12px 8px' }}>
      <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.2em', color: FAINT, margin: '0 0 18px' }}>
        WIN {index + 1} OF {total}
      </p>
      <p style={{ fontFamily: DISP, fontSize: '1.375rem', color: INK, lineHeight: 1.5, margin: '0 0 6px' }}>
        {win.text}
      </p>
      {win.dom_id && (
        <p style={{ fontFamily: SC, fontSize: '10.5px', letterSpacing: '0.16em', color: FAINT, margin: '0 0 22px', textTransform: 'uppercase' }}>
          {DOMAIN_LABELS[win.dom_id] || win.dom_id}
        </p>
      )}

      {/* The hold flame — press and hold while it fills */}
      <div
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onContextMenu={e => e.preventDefault()}
        style={{
          position: 'relative', width: '96px', height: '96px',
          margin: '8px auto 14px', borderRadius: '50%',
          border: `1.5px solid ${done ? GOLD : 'rgba(200,146,42,0.55)'}`,
          cursor: 'pointer', touchAction: 'none', userSelect: 'none',
          WebkitUserSelect: 'none', overflow: 'hidden',
          transition: 'border-color 0.3s ease',
        }}
      >
        {/* Fill rises from the bottom as the hold progresses */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: `${Math.round(fill * 100)}%`,
          background: 'rgba(232,144,26,0.18)',
          transition: fill === 0 ? 'height 0.3s ease' : 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="40" height="50" viewBox="0 0 32 40" aria-hidden="true"
            style={{ transform: `scale(${0.85 + fill * 0.3})`, transition: 'transform 0.1s linear' }}>
            <path d="M16 2 C16 2 27 13 27 24 C27 31.2 22.1 37 16 37 C9.9 37 5 31.2 5 24 C5 16.5 11 10.5 13.2 6.5 C14.3 4.5 16 2 16 2 Z"
              fill="#E8901A" opacity={0.35 + fill * 0.6} />
            <path d="M16 14 C16 14 21.5 19.5 21.5 25.5 C21.5 29.6 19 32.6 16 32.6 C13 32.6 10.5 29.6 10.5 25.5 C10.5 21.5 14 17.8 16 14 Z"
              fill="#F8C868" opacity={0.3 + fill * 0.65} />
          </svg>
        </div>
      </div>

      <p style={{ fontFamily: BODY, fontSize: '0.9375rem', color: META, margin: '0 0 4px' }}>
        {done ? 'Seen.' : 'See it done.'}
      </p>
      {!done && (
        <p style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.18em', color: FAINT, margin: 0 }}>
          HOLD…
        </p>
      )}
    </div>
  )
}

// ─── Main flow ────────────────────────────────────────────────

export default function WinTheDay({ sprintData, wins: existingWins, victoryLine: existingLine, onComplete, onClose }) {
  const alreadySeen = (existingWins || []).filter(w => w.seen)
  const resumeDone  = alreadySeen.length > 0

  const [showFraming, setShowFraming] = useState(() => {
    try { return !localStorage.getItem(FRAMING_KEY) } catch { return false }
  })
  // 'field' | 'prelive' | 'line'
  const [beat, setBeat]       = useState(resumeDone ? 'line' : 'field')
  const [selected, setSelected] = useState(existingWins || [])
  const [customText, setCustomText] = useState('')
  const [preIndex, setPreIndex] = useState(0)
  const [line, setLine]       = useState(existingLine || '')

  // Flatten stretch tasks into field candidates
  const fieldItems = []
  if (Array.isArray(sprintData) && sprintData.length > 0) {
    const sprint  = sprintData[0]
    const domains = sprint.domains || []
    const domData = sprint.domain_data || {}
    for (const domId of domains) {
      const tasks = (domData[domId] || {}).tasks || []
      tasks.forEach((t, ti) => {
        const text = (t.text || t || '').toString().trim()
        if (text) fieldItems.push({ id: `stretch-${domId}-${ti}`, text, source: 'stretch', dom_id: domId })
      })
    }
  }

  function dismissFraming() {
    try { localStorage.setItem(FRAMING_KEY, '1') } catch { /* private mode */ }
    setShowFraming(false)
  }

  function toggleItem(item) {
    setSelected(prev => {
      const has = prev.some(w => w.id === item.id)
      if (has) return prev.filter(w => w.id !== item.id)
      if (prev.length >= MAX_WINS) return prev
      return [...prev, { ...item, seen: false, showed_up: null }]
    })
  }

  function addCustom() {
    const text = customText.trim()
    if (!text || selected.length >= MAX_WINS) return
    setSelected(prev => [...prev, {
      id: `custom-${Date.now()}`, text, source: 'custom', dom_id: null,
      seen: false, showed_up: null,
    }])
    setCustomText('')
  }

  function handleSeen() {
    setSelected(prev => prev.map((w, i) => i === preIndex ? { ...w, seen: true } : w))
    if (preIndex + 1 < selected.length) {
      setPreIndex(i => i + 1)
    } else {
      setBeat('line')
    }
  }

  function finish() {
    onComplete({
      wins: selected.map(w => ({ ...w, seen: true })),
      victoryLine: line.trim() || null,
    })
  }

  // ── Render ──────────────────────────────────────────────────

  if (showFraming) return <Framing onDismiss={dismissFraming} />

  const header = (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontFamily: SC, fontSize: '12px', letterSpacing: '0.18em', color: GOLD_DK, textTransform: 'uppercase' }}>
          Get To Do · Win the Day
        </span>
        <button
          onClick={() => setShowFraming(true)}
          aria-label="What winning means here"
          style={{
            fontFamily: SC, fontSize: '11px', width: '17px', height: '17px',
            borderRadius: '50%', border: `1px solid ${RULE}`, background: 'none',
            color: GOLD, cursor: 'pointer', opacity: 0.75, lineHeight: 1, padding: 0,
          }}
        >
          i
        </button>
      </div>
      <button
        onClick={onClose}
        style={{ fontFamily: SC, fontSize: '11px', letterSpacing: '0.16em', background: 'none', border: 'none', color: FAINT, cursor: 'pointer', padding: 0 }}
      >
        BACK
      </button>
    </div>
  )

  if (beat === 'field') {
    return (
      <div>
        {header}
        <p style={{ fontFamily: DISP, fontSize: '1.25rem', color: INK, margin: '0 0 16px' }}>
          What does winning your day look like?
        </p>

        {fieldItems.length === 0 && (
          <p style={{ fontFamily: BODY, fontSize: '13.5px', color: FAINT, lineHeight: 1.65, margin: '0 0 12px' }}>
            No Stretch items today — name your wins below.
          </p>
        )}

        {fieldItems.map(item => {
          const isSel = selected.some(w => w.id === item.id)
          const full  = !isSel && selected.length >= MAX_WINS
          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item)}
              disabled={full}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                textAlign: 'left', padding: '11px 12px', marginBottom: '8px',
                border: `1px solid ${isSel ? GOLD : RULE}`,
                borderRadius: '8px', background: isSel ? 'rgba(200,146,42,0.06)' : 'none',
                cursor: full ? 'default' : 'pointer', opacity: full ? 0.45 : 1,
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
            >
              <span style={{ flex: 1 }}>
                <span style={{ fontFamily: BODY, fontSize: '13.5px', color: INK, display: 'block', lineHeight: 1.5 }}>
                  {item.text}
                </span>
                <span style={{ fontFamily: SC, fontSize: '9.5px', letterSpacing: '0.16em', color: FAINT, textTransform: 'uppercase' }}>
                  Stretch · {DOMAIN_LABELS[item.dom_id] || item.dom_id}
                </span>
              </span>
              {isSel && (
                <span style={{ fontFamily: SC, fontSize: '12px', color: GOLD_DK, flexShrink: 0 }}>✓</span>
              )}
            </button>
          )
        })}

        {/* Freehand win */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <input
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustom() }}
            placeholder="Name another win…"
            disabled={selected.length >= MAX_WINS}
            style={{
              flex: 1, padding: '10px 12px', fontFamily: BODY, fontSize: '13.5px',
              color: META, background: 'rgba(200,146,42,0.04)',
              border: `1px dashed rgba(200,146,42,0.30)`, borderRadius: '8px',
              outline: 'none', opacity: selected.length >= MAX_WINS ? 0.45 : 1,
            }}
          />
          <button
            onClick={addCustom}
            disabled={!customText.trim() || selected.length >= MAX_WINS}
            style={{
              fontFamily: SC, fontSize: '13px', padding: '0 16px',
              border: `1px solid ${RULE}`, borderRadius: '8px', background: 'none',
              color: GOLD_DK, cursor: 'pointer',
              opacity: (!customText.trim() || selected.length >= MAX_WINS) ? 0.4 : 1,
            }}
          >
            +
          </button>
        </div>

        <button
          onClick={() => { setPreIndex(0); setBeat('prelive') }}
          disabled={selected.length === 0}
          style={{
            width: '100%', padding: '12px', marginTop: '16px',
            fontFamily: SC, fontSize: '14px', letterSpacing: '0.14em',
            color: GOLD_DK, background: 'rgba(200,146,42,0.05)',
            border: `1.5px solid ${selected.length > 0 ? 'rgba(200,146,42,0.78)' : RULE}`,
            borderRadius: '40px', cursor: selected.length > 0 ? 'pointer' : 'default',
            opacity: selected.length > 0 ? 1 : 0.5, transition: 'all 0.2s',
          }}
        >
          See them done → <span style={{ fontSize: '11px', color: FAINT, letterSpacing: '0.1em' }}>{selected.length} of {MAX_WINS}</span>
        </button>
      </div>
    )
  }

  if (beat === 'prelive') {
    return (
      <div>
        {header}
        <PreLiveCard
          key={selected[preIndex]?.id}
          win={selected[preIndex]}
          index={preIndex}
          total={selected.length}
          onSeen={handleSeen}
        />
      </div>
    )
  }

  // beat === 'line' — the day, won
  return (
    <div>
      {header}
      <div style={{ textAlign: 'center', margin: '4px 0 18px' }}>
        {selected.map(w => (
          <div key={w.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 12px', marginBottom: '6px',
            border: `1px solid ${RULE}`, borderRadius: '8px',
            background: 'rgba(200,146,42,0.04)', textAlign: 'left',
          }}>
            <svg width="13" height="16" viewBox="0 0 32 40" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M16 2 C16 2 27 13 27 24 C27 31.2 22.1 37 16 37 C9.9 37 5 31.2 5 24 C5 16.5 11 10.5 13.2 6.5 C14.3 4.5 16 2 16 2 Z" fill="#E8901A" opacity="0.9" />
            </svg>
            <span style={{ fontFamily: BODY, fontSize: '13px', color: META, lineHeight: 1.4 }}>{w.text}</span>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: DISP, fontSize: '1.125rem', color: INK, margin: '0 0 4px', textAlign: 'center' }}>
        Tonight, what's true?
      </p>
      <p style={{ fontFamily: BODY, fontSize: '12.5px', color: FAINT, margin: '0 0 12px', textAlign: 'center' }}>
        One line, written as the day already won. Optional.
      </p>
      <textarea
        value={line}
        onChange={e => setLine(e.target.value)}
        rows={2}
        placeholder="I handled the pitch as the calm center I am…"
        style={{
          width: '100%', padding: '10px 14px', fontFamily: BODY, fontSize: '0.9375rem',
          fontStyle: 'italic', color: META, background: 'rgba(200,146,42,0.05)',
          border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px',
          outline: 'none', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box',
        }}
      />
      <button
        onClick={finish}
        style={{
          width: '100%', padding: '12px', marginTop: '12px',
          fontFamily: SC, fontSize: '14px', letterSpacing: '0.14em',
          color: GOLD_DK, background: 'rgba(200,146,42,0.05)',
          border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        Day won →
      </button>
    </div>
  )
}
