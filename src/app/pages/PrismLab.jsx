// ─────────────────────────────────────────────────────────────
// PrismLab.jsx — /admin/prism
//
// Hidden founder-only lab. Three practices adapted from the Prismology
// reference material (July 2026), rebuilt in NextUs design language and
// stripped of borrowed-authority claims:
//
//   1. Mirror Work — front camera as mirror, I Am statements overlaid
//      (reads horizon_profile.ia_statement; falls back to seed set),
//      5-minute session timer, optional resonance tone (Web Audio sine).
//      Framing: vocal/vagal resonance practice — NOT "528 Hz repairs DNA".
//   2. Write & Burn — evening evacuation. Textarea that NEVER persists:
//      no Supabase call, no localStorage, nothing leaves the component.
//      Burn animation, then the text is gone. The non-persistence is the
//      feature; it is stated in the UI.
//   3. Geometry — guided Metatron's Cube tracing. SVG guide underlay
//      revealed step by step, freehand pointer/Pencil canvas overlay.
//      Slow hand-motion focus work. iPad + Apple Pencil friendly.
//
// Gate: isFounder (same UI gate as AdminConsole — user/app metadata role).
// Not linked from any public nav. Reached via the Prism tab in /admin
// or directly at /admin/prism.
//
// Design: Field Notes rail (fn.*, fnText), shadow.fn on interactive
// cards only. No heritage gold (see Master Spec §4 — not whitelisted).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { fn, fnText, space, shadow, mono, display, bodyFont } from '../../lib/designTokens'

function isFounder(user) {
  return user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'
}

// ── Seed statements — placeholders until horizon_profile has I Am rows.
// Kept deliberately short; the practice wants the user's own words.
const SEED_STATEMENTS = [
  'I am enough.',
  'I am allowed to receive.',
  'I am certain and self-aware.',
  'I am big and I am kind.',
  'I am the one who remains himself inside the world.',
]

// ── Resonance tones — honest framing. The mechanism we stand behind is
// vocal/vagal resonance (vibration + extended exhale), not the specific Hz.
const TONES = [
  { hz: 396, label: '396 · Root' },
  { hz: 432, label: '432 · Ground' },
  { hz: 528, label: '528 · Heart' },
  { hz: 639, label: '639 · Connection' },
]

const SESSION_SECONDS = 5 * 60

// ─────────────────────────────────────────────────────────────
// Tool 1 — Mirror Work
// ─────────────────────────────────────────────────────────────
function MirrorWork({ userId }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const audioRef = useRef({ ctx: null, osc: null, gain: null })
  const [camOn, setCamOn] = useState(false)
  const [camErr, setCamErr] = useState('')
  const [statements, setStatements] = useState(SEED_STATEMENTS)
  const [usingOwn, setUsingOwn] = useState(false)
  const [idx, setIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [left, setLeft] = useState(SESSION_SECONDS)
  const [tone, setTone] = useState(null) // hz or null

  // Pull the user's own I Am statements if they exist.
  useEffect(() => {
    if (!userId) return
    let dead = false
    supabase.from('horizon_profile')
      .select('domain, ia_statement')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (dead) return
        const own = (data || []).map(r => (r.ia_statement || '').trim()).filter(Boolean)
        if (own.length) { setStatements(own); setUsingOwn(true) }
      })
    return () => { dead = true }
  }, [userId])

  const startCam = async () => {
    setCamErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }, audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamOn(true)
    } catch (e) {
      setCamErr('Camera unavailable · check permissions. The practice also works at a physical mirror.')
    }
  }

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamOn(false)
  }, [])

  // Resonance tone — gentle sine, low gain, soft attack/release.
  const stopTone = useCallback(() => {
    const a = audioRef.current
    if (a.gain && a.ctx) {
      try {
        a.gain.gain.setTargetAtTime(0, a.ctx.currentTime, 0.3)
        const osc = a.osc, ctx = a.ctx
        setTimeout(() => { try { osc.stop(); ctx.close() } catch {} }, 900)
      } catch {}
    }
    audioRef.current = { ctx: null, osc: null, gain: null }
    setTone(null)
  }, [])

  const startTone = (hz) => {
    stopTone()
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = hz
      gain.gain.value = 0
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      gain.gain.setTargetAtTime(0.06, ctx.currentTime, 0.5) // quiet — under the voice
      audioRef.current = { ctx, osc, gain }
      setTone(hz)
    } catch {}
  }

  // Session timer
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setLeft(s => {
      if (s <= 1) { clearInterval(t); setRunning(false); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [running])

  // Cleanup on unmount
  useEffect(() => () => { stopCam(); stopTone() }, [stopCam, stopTone])

  const mm = String(Math.floor(left / 60)).padStart(1, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div>
      <p style={{ ...fnText.body, maxWidth: 640, marginBottom: space.xl }}>
        Look into your own eyes, not at your face. Into the eyes. Speak each statement
        aloud, present tense, full voice. Feel it as you say it. When the inner critic
        objects, keep going; the discomfort is the old pattern on its way out. This is a
        receiving rep as much as a speaking rep. Let the words land in the one watching.
      </p>

      <div style={{ display: 'flex', gap: space.xl, flexWrap: 'wrap' }}>
        {/* Mirror panel */}
        <div style={{
          position: 'relative', width: 'min(420px, 100%)', aspectRatio: '3 / 4',
          background: fn.ink, borderRadius: 8, overflow: 'hidden',
          boxShadow: shadow.fn.rest,
        }}>
          <video
            ref={videoRef} autoPlay playsInline muted
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: 'scaleX(-1)', // mirror
              opacity: camOn ? 1 : 0, transition: 'opacity 0.6s ease',
            }}
          />
          {!camOn && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl,
            }}>
              <span style={{ ...fnText.eyebrow, color: 'rgba(233,237,228,0.6)' }}>The Mirror</span>
              <button onClick={startCam} style={btnStyle()}>Open camera</button>
              {camErr && <p style={{ ...fnText.caption, color: '#E9EDE4', textAlign: 'center' }}>{camErr}</p>}
            </div>
          )}
          {camOn && (
            <>
              {/* Statement overlay */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                padding: `${space.xxl} ${space.xl} ${space.xl}`,
                background: 'linear-gradient(transparent, rgba(15,21,35,0.72))',
                textAlign: 'center',
              }}>
                <div style={{
                  ...display, fontSize: 22, lineHeight: 1.3, color: '#F4F5EF',
                  textShadow: '0 1px 8px rgba(0,0,0,0.4)',
                }}>
                  {statements[idx % statements.length]}
                </div>
              </div>
              {/* Timer chip */}
              <div style={{
                position: 'absolute', top: space.md, right: space.md,
                ...mono, fontSize: 13, letterSpacing: '0.14em',
                color: '#F4F5EF', background: 'rgba(15,21,35,0.45)',
                padding: '4px 10px', borderRadius: 4,
              }}>
                {mm}:{ss}
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div style={{ flex: '1 1 260px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: space.lg }}>
          <div>
            <div style={{ ...fnText.eyebrow, marginBottom: space.sm }}>Statements</div>
            <p style={{ ...fnText.caption }}>
              {usingOwn
                ? 'Reading from your I Am chapter · your own words, your own authority.'
                : 'Seed set shown. Once the I Am chapter holds your statements, the mirror reads those instead.'}
            </p>
            <div style={{ display: 'flex', gap: space.sm, marginTop: space.sm }}>
              <button style={btnStyle('ghost')} onClick={() => setIdx(i => i + 1)}>Next statement →</button>
            </div>
          </div>

          <div>
            <div style={{ ...fnText.eyebrow, marginBottom: space.sm }}>Session</div>
            <div style={{ display: 'flex', gap: space.sm }}>
              {!running
                ? <button style={btnStyle()} onClick={() => { setLeft(SESSION_SECONDS); setRunning(true) }}>Begin 5:00</button>
                : <button style={btnStyle('ghost')} onClick={() => setRunning(false)}>Pause</button>}
              <button style={btnStyle('ghost')} onClick={() => { setRunning(false); setLeft(SESSION_SECONDS) }}>Reset</button>
              {camOn && <button style={btnStyle('ghost')} onClick={stopCam}>Close camera</button>}
            </div>
          </div>

          <div>
            <div style={{ ...fnText.eyebrow, marginBottom: space.sm }}>Resonance tone</div>
            <p style={{ ...fnText.caption, marginBottom: space.sm }}>
              A quiet sine under your voice. What does the work is the vibration and the long
              exhale of speaking, the vagal resonance. Not the number itself.
            </p>
            <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
              {TONES.map(t => (
                <button key={t.hz}
                  style={btnStyle(tone === t.hz ? 'solid' : 'ghost')}
                  onClick={() => tone === t.hz ? stopTone() : startTone(t.hz)}>
                  {t.label}
                </button>
              ))}
              {tone && <button style={btnStyle('ghost')} onClick={stopTone}>Silence</button>}
            </div>
          </div>

          <p style={{ ...fnText.caption, marginTop: 'auto' }}>
            Nothing here records or uploads. The camera feed stays on this device;
            no video, audio, or session data is stored.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Tool 2 — Write & Burn
// ─────────────────────────────────────────────────────────────
const BURN_LINES = [
  'Witness it going.',
  'Form becomes formless.',
  'What was written is no longer yours to carry.',
  'Returning to clean space.',
]

function WriteAndBurn() {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState('write') // write | burning | ash
  const [line, setLine] = useState(0)

  const burn = () => {
    if (!text.trim()) return
    setPhase('burning')
    setLine(0)
    // Cycle burn lines, then clear. The text is destroyed in memory —
    // it was never persisted anywhere to begin with.
    let i = 0
    const t = setInterval(() => {
      i += 1
      if (i >= BURN_LINES.length) {
        clearInterval(t)
        setText('')
        setPhase('ash')
        setTimeout(() => setPhase('write'), 2600)
      } else {
        setLine(i)
      }
    }, 1400)
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <p style={{ ...fnText.body, marginBottom: space.xl }}>
        Evening practice. Write without filter: anger, fear, gibberish, lists, whatever
        wants out. No editing, no crossing out. Write until the cup is empty. Then burn it.
        This is evacuation, not journaling: the Journal keeps what should be kept; this
        removes what shouldn't. Nothing you write here is saved. No database, no device
        storage. It exists only on this screen, and then it doesn't.
      </p>

      {phase === 'write' && (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Let it flow. No one will ever read this, including you."
            rows={12}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: space.lg, borderRadius: 8,
              border: `1px solid ${fn.rule}`, background: fn.object,
              ...bodyFont, fontSize: 15, lineHeight: 1.65, color: fn.ink,
              resize: 'vertical', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: space.sm, marginTop: space.lg, alignItems: 'center' }}>
            <button style={btnStyle('clay')} onClick={burn} disabled={!text.trim()}>Burn it</button>
            <button style={btnStyle('ghost')} onClick={() => setText('')}>Clear without ceremony</button>
            <span style={{ ...fnText.caption, marginLeft: 'auto' }}>
              {text.trim() ? `${text.trim().split(/\s+/).length} words, soon to be none` : ''}
            </span>
          </div>
        </>
      )}

      {phase === 'burning' && (
        <div style={{
          minHeight: 320, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: space.xl,
          borderRadius: 8, background: fn.ink,
        }}>
          <div style={{
            width: 18, height: 26, background: fn.clay,
            borderRadius: '50% 50% 30% 30% / 60% 60% 30% 30%',
            animation: 'prismFlicker 0.5s infinite alternate',
          }} />
          <div style={{ ...fnText.body, color: 'rgba(233,237,228,0.85)', textAlign: 'center' }}>
            {BURN_LINES[line]}
          </div>
        </div>
      )}

      {phase === 'ash' && (
        <div style={{
          minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: `1px solid ${fn.rule}`,
        }}>
          <span style={{ ...fnText.eyebrow }}>Gone. Breathe the moment.</span>
        </div>
      )}

      <style>{`
        @keyframes prismFlicker {
          from { transform: scale(1) rotate(-2deg); opacity: 0.85; }
          to   { transform: scale(1.15) rotate(2deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Tool 3 — Geometry (Metatron's Cube tracing)
// ─────────────────────────────────────────────────────────────
// Thirteen-circle Fruit of Life. Guide underlay in SVG, revealed per step;
// user traces freehand on a canvas overlay (pointer events — works with
// Apple Pencil, finger, or mouse). Slow drawing is the practice.

const GEO_STEPS = [
  {
    title: 'The Centre Circle',
    body: 'Trace the centre circle slowly. One circle, one point. Everything that follows emerges from this single radius.',
  },
  {
    title: 'Six Circles · First Ring',
    body: 'Trace each of the six circles around the centre. Each touches the centre circle and its neighbours. Six always fit exactly: honeycomb, snowflake, carbon.',
  },
  {
    title: 'Six Circles · Outer Ring',
    body: 'Trace the six outer circles. Thirteen now, the Fruit of Life. Twelve around one: a central principle surrounded by its expression.',
  },
  {
    title: 'Connect the Centres',
    body: 'Draw straight lines connecting every centre to every other centre. The hexagon emerges; Metatron\u2019s Cube is revealed. You did not create it. You revealed it.',
  },
]

function geoCircles() {
  // Unit radius r; centre at (0,0); first ring at distance 2r; outer ring at 4r on the same six axes.
  const r = 44
  const cx = 300, cy = 300
  const ring = (dist) => Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return { x: cx + dist * Math.cos(a), y: cy + dist * Math.sin(a), r }
  })
  return {
    r,
    step0: [{ x: cx, y: cy, r }],
    step1: ring(2 * r),
    step2: ring(4 * r),
  }
}

function GeometryPractice() {
  const [step, setStep] = useState(0)
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  const g = geoCircles()

  const allCentres = [...g.step0, ...g.step1, ...g.step2]

  const pos = (e) => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (c.width / rect.width),
      y: (e.clientY - rect.top) * (c.height / rect.height),
    }
  }

  const down = (e) => { drawing.current = true; last.current = pos(e); e.target.setPointerCapture?.(e.pointerId) }
  const move = (e) => {
    if (!drawing.current) return
    const p = pos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = fn.ink
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }
  const up = () => { drawing.current = false; last.current = null }

  const clearCanvas = () => {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
  }

  const guideOpacity = (which) => {
    // Current step's new elements bright; earlier steps faint; later steps hidden.
    if (which < step) return 0.18
    if (which === step) return 0.45
    return 0
  }

  return (
    <div>
      <p style={{ ...fnText.body, maxWidth: 640, marginBottom: space.xl }}>
        Draw slowly, by hand · finger or Pencil. You are not learning this geometry;
        you are recognising it. The guide shows each step faintly; your line is the practice.
        Paper, a coin, and a pencil remain the deepest version. This is the travelling one.
      </p>

      <div style={{ display: 'flex', gap: space.xl, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{
          position: 'relative', width: 'min(600px, 100%)', aspectRatio: '1',
          background: fn.object, borderRadius: 8, boxShadow: shadow.fn.rest,
          touchAction: 'none', overflow: 'hidden',
        }}>
          {/* Guide underlay */}
          <svg viewBox="0 0 600 600" className="prism-geo-guide">
            {g.step0.map((c, i) => (
              <circle key={`a${i}`} cx={c.x} cy={c.y} r={c.r} fill="none"
                stroke={fn.moss} strokeWidth="1.5" strokeDasharray="3 5" opacity={guideOpacity(0)} />
            ))}
            {g.step1.map((c, i) => (
              <circle key={`b${i}`} cx={c.x} cy={c.y} r={c.r} fill="none"
                stroke={fn.moss} strokeWidth="1.5" strokeDasharray="3 5" opacity={guideOpacity(1)} />
            ))}
            {g.step2.map((c, i) => (
              <circle key={`c${i}`} cx={c.x} cy={c.y} r={c.r} fill="none"
                stroke={fn.moss} strokeWidth="1.5" strokeDasharray="3 5" opacity={guideOpacity(2)} />
            ))}
            {step === 3 && allCentres.map((a, i) =>
              allCentres.slice(i + 1).map((b, j) => (
                <line key={`l${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={fn.moss} strokeWidth="0.5" opacity="0.22" />
              ))
            )}
            {allCentres.map((c, i) => (
              <circle key={`p${i}`} cx={c.x} cy={c.y} r="2.5" fill={fn.moss}
                opacity={step >= (i === 0 ? 0 : i <= 6 ? 1 : 2) ? 0.6 : 0} />
            ))}
          </svg>
          {/* Drawing overlay */}
          <canvas
            ref={canvasRef} width={600} height={600}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
          />
        </div>

        <style>{`.prism-geo-guide { position: absolute; inset: 0; width: 100%; height: 100%; }`}</style>

        <div style={{ flex: '1 1 240px', minWidth: 240 }}>
          <div style={{ ...fnText.eyebrow, marginBottom: space.sm }}>
            Step {step + 1} of {GEO_STEPS.length}
          </div>
          <h3 style={{ ...fnText.heading, marginBottom: space.sm }}>{GEO_STEPS[step].title}</h3>
          <p style={{ ...fnText.body, marginBottom: space.xl }}>{GEO_STEPS[step].body}</p>
          <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
            <button style={btnStyle('ghost')} disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>← Back</button>
            <button style={btnStyle()} disabled={step === GEO_STEPS.length - 1} onClick={() => setStep(s => Math.min(GEO_STEPS.length - 1, s + 1))}>Next step →</button>
            <button style={btnStyle('ghost')} onClick={clearCanvas}>Clear drawing</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Shared button
// ─────────────────────────────────────────────────────────────
function btnStyle(variant = 'solid') {
  const base = {
    ...mono, fontSize: 13, letterSpacing: '0.08em',
    padding: '10px 18px', borderRadius: 6, cursor: 'pointer',
    transition: 'all 0.2s',
  }
  if (variant === 'ghost') return { ...base, background: 'transparent', border: `1px solid ${fn.rule}`, color: fn.meta }
  if (variant === 'clay') return { ...base, background: fn.clay, border: `1px solid ${fn.clay}`, color: '#F4F5EF' }
  return { ...base, background: fn.moss, border: `1px solid ${fn.moss}`, color: '#F4F5EF' }
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
const TOOLS = [
  { key: 'mirror', label: 'Mirror Work' },
  { key: 'burn', label: 'Write & Burn' },
  { key: 'geometry', label: 'Geometry' },
]

export function PrismLabPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [tool, setTool] = useState('mirror')

  useEffect(() => {
    if (!loading && !isFounder(user)) navigate('/', { replace: true })
  }, [loading, user, navigate])

  if (loading || !isFounder(user)) return null

  return (
    <div style={{ minHeight: '100dvh', background: fn.ground }}>
      <Nav />
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: `${space.xxl} ${space.xl} ${space.huge}` }}>
        <div style={{ ...fnText.eyebrow, marginBottom: space.sm }}>Founder Lab · Not Public</div>
        <h1 style={{ ...display, fontSize: 34, fontWeight: 500, color: fn.ink, margin: 0 }}>Prism</h1>
        <p style={{ ...fnText.body, maxWidth: 640, marginTop: space.md, marginBottom: space.xxl }}>
          Three practices under evaluation for the Practice proper. Mirror work is a
          candidate upgrade to the Voice beat; Write &amp; Burn is a candidate evening
          complement to the Journal; Geometry is candidate onboarding/deepening material.
          They live here until they earn their place.
        </p>

        <div style={{
          display: 'flex', gap: 4, marginBottom: space.xxl,
          borderBottom: `1px solid ${fn.rule}`,
        }}>
          {TOOLS.map(t => (
            <button key={t.key} onClick={() => setTool(t.key)} style={{
              ...mono, fontSize: 14, letterSpacing: '0.12em',
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              color: tool === t.key ? fn.moss : fn.ghost,
              borderBottom: tool === t.key ? `2px solid ${fn.moss}` : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {tool === 'mirror' && <MirrorWork userId={user?.id} />}
        {tool === 'burn' && <WriteAndBurn />}
        {tool === 'geometry' && <GeometryPractice />}
      </div>
    </div>
  )
}

export default PrismLabPage
