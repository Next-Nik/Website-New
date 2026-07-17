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
// Tool 3 — Geometry (sacred form tracing)
// ─────────────────────────────────────────────────────────────
// Data-driven tracing engine. Each shape is a sequence of steps; each
// step carries guide elements. On pen-lift the stroke is fitted and
// quietly matched; a match makes the perfect element fade in beneath
// the hand-drawn line. Recognition, not correction: no failure states,
// no scoring, silence on a non-match. "Reveal the form" resolves the
// figure; the hand's lines remain as a faint ghost.
//
// Guide kinds:
//   circle  — closed circle trace
//   arc     — partial trace of a parent circle (matches unclosed fits)
//   petal   — lens between two parent circles (vesica seam, rosettes)
//   segment — straight line with fixed endpoints
//   lineweb — any centre-to-centre line among a set (Metatron step 4)
//   qarc    — quarter arc of a parent circle (golden spiral)

const geoRing = (cx, cy, dist, r, count = 6, phase = -Math.PI / 2, stepAngle = Math.PI / 3) =>
  Array.from({ length: count }, (_, i) => {
    const a = stepAngle * i + phase
    return { kind: 'circle', x: cx + dist * Math.cos(a), y: cy + dist * Math.sin(a), r }
  })

const geoArcPts = (c, from, to, N = 24) => {
  const a0 = Math.atan2(from.y - c.y, from.x - c.x)
  let d = Math.atan2(to.y - c.y, to.x - c.x) - a0
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return Array.from({ length: N + 1 }, (_, i) => {
    const a = a0 + d * i / N
    return { x: c.x + c.r * Math.cos(a), y: c.y + c.r * Math.sin(a) }
  })
}

const geoPetal = (pA, pB, t1, t2) => ({
  kind: 'petal', parents: [pA, pB], tips: [t1, t2],
  path: [...geoArcPts(pA, t1, t2), ...geoArcPts(pB, t2, t1)],
})

const geoSeg = (x1, y1, x2, y2) => ({ kind: 'segment', x1, y1, x2, y2 })

const geoQarc = (cx, cy, r, a, b) => ({
  kind: 'qarc', cx, cy, r, a, b,
  path: geoArcPts({ x: cx, y: cy, r }, a, b, 20),
})

// Tree of Life node positions (Kircher arrangement)
const TREE = {
  keter: { x: 300, y: 70 }, chokmah: { x: 430, y: 150 }, binah: { x: 170, y: 150 },
  chesed: { x: 430, y: 290 }, gevurah: { x: 170, y: 290 }, tiferet: { x: 300, y: 360 },
  netzach: { x: 430, y: 430 }, hod: { x: 170, y: 430 }, yesod: { x: 300, y: 500 },
  malkuth: { x: 300, y: 570 },
}
const TREE_PATHS = [
  ['chokmah', 'binah'], ['chesed', 'gevurah'], ['netzach', 'hod'],
  ['keter', 'tiferet'], ['tiferet', 'yesod'], ['yesod', 'malkuth'],
  ['chokmah', 'chesed'], ['chesed', 'netzach'], ['binah', 'gevurah'], ['gevurah', 'hod'],
  ['keter', 'chokmah'], ['keter', 'binah'], ['chokmah', 'tiferet'], ['binah', 'tiferet'],
  ['chesed', 'tiferet'], ['gevurah', 'tiferet'], ['tiferet', 'netzach'], ['tiferet', 'hod'],
  ['netzach', 'yesod'], ['hod', 'yesod'], ['netzach', 'malkuth'], ['hod', 'malkuth'],
]

// Merkaba and Vector Equilibrium vertices
const geoStarPts = (R, phase) => Array.from({ length: 3 }, (_, i) => {
  const a = (2 * Math.PI / 3) * i + phase
  return { x: 300 + R * Math.cos(a), y: 300 + R * Math.sin(a) }
})
const MK_UP = geoStarPts(200, -Math.PI / 2)
const MK_DN = geoStarPts(200, Math.PI / 2)
const VE_HEX = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i
  return { x: 300 + 200 * Math.cos(a), y: 300 + 200 * Math.sin(a) }
})

const triSegs = (v) => [geoSeg(v[0].x, v[0].y, v[1].x, v[1].y), geoSeg(v[1].x, v[1].y, v[2].x, v[2].y), geoSeg(v[2].x, v[2].y, v[0].x, v[0].y)]

// Germ of Life petals: six circles r=110 on the rim of an r=110 centre,
// petals along the bisectors, tips at r·√3 ≈ the 190 boundary.
const GERM_PETALS = Array.from({ length: 6 }, (_, k) => {
  const aK = (Math.PI / 3) * k - Math.PI / 2
  const aK1 = (Math.PI / 3) * (k + 1) - Math.PI / 2
  const bis = aK + Math.PI / 6
  const pA = { x: 300 + 110 * Math.cos(aK), y: 300 + 110 * Math.sin(aK), r: 110 }
  const pB = { x: 300 + 110 * Math.cos(aK1), y: 300 + 110 * Math.sin(aK1), r: 110 }
  const tip = { x: 300 + 110 * Math.sqrt(3) * Math.cos(bis), y: 300 + 110 * Math.sqrt(3) * Math.sin(bis) }
  return geoPetal(pA, pB, { x: 300, y: 300 }, tip)
})

const GEO_SHAPES = [
  {
    key: 'vesica',
    name: 'Vesica Piscis',
    steps: [
      { title: 'The First Circle',
        body: 'Trace the first circle slowly. One whole, complete in itself.',
        guides: [{ kind: 'circle', x: 230, y: 300, r: 140 }] },
      { title: 'The Second Circle',
        body: 'Trace the second circle, its centre resting on the edge of the first. Two wholes, sharing a heart.',
        guides: [{ kind: 'circle', x: 370, y: 300, r: 140 }] },
      { title: 'The Seam',
        body: 'Trace the almond where they overlap · the vesica, the lens. From two, a third: the shape of eye, seed, and doorway.',
        guides: [geoPetal(
          { x: 230, y: 300, r: 140 }, { x: 370, y: 300, r: 140 },
          { x: 300, y: 300 - Math.sqrt(140 * 140 - 70 * 70) }, { x: 300, y: 300 + Math.sqrt(140 * 140 - 70 * 70) }
        )] },
    ],
  },
  {
    key: 'egg',
    name: 'Egg of Life',
    steps: [
      { title: 'The Centre',
        body: 'Trace the centre circle. In the beginning, one cell.',
        guides: [{ kind: 'circle', x: 300, y: 300, r: 60 }] },
      { title: 'Six Around',
        body: 'Six circles cradle the first, each touching its neighbours. The pattern of first division · seven visible, the eighth resting behind the centre.',
        guides: geoRing(300, 300, 120, 60) },
    ],
  },
  {
    key: 'seed',
    name: 'Seed of Life',
    steps: [
      { title: 'The Centre',
        body: 'Trace the centre circle. Everything that follows passes through its heart.',
        guides: [{ kind: 'circle', x: 300, y: 300, r: 110 }] },
      { title: 'Three Around',
        body: 'Trace three circles, each centred on the rim of the first. Petals begin to appear where they cross.',
        guides: [0, 2, 4].map(i => geoRing(300, 300, 110, 110)[i]) },
      { title: 'Three More',
        body: 'Trace the remaining three. Six circles around one, every one passing through the centre · the rosette is complete.',
        guides: [1, 3, 5].map(i => geoRing(300, 300, 110, 110)[i]) },
    ],
  },
  {
    key: 'germ',
    name: 'Germ of Life',
    steps: [
      { title: 'The Boundary',
        body: 'Trace the great circle. A field prepared, waiting.',
        guides: [{ kind: 'circle', x: 300, y: 300, r: 190 }] },
      { title: 'The Petals',
        body: 'Trace the six petals, tip to tip through the centre. Each petal is two arcs meeting · the simplest flower the circle can make.',
        guides: GERM_PETALS },
    ],
  },
  {
    key: 'metatron',
    name: 'Metatron\u2019s Cube',
    steps: [
      { title: 'The Centre Circle',
        body: 'Trace the centre circle slowly. One circle, one point. Everything that follows emerges from this single radius.',
        guides: [{ kind: 'circle', x: 300, y: 300, r: 44 }] },
      { title: 'Six Circles · First Ring',
        body: 'Trace each of the six circles around the centre. Each touches the centre circle and its neighbours. Six always fit exactly: honeycomb, snowflake, carbon.',
        guides: geoRing(300, 300, 88, 44) },
      { title: 'Six Circles · Outer Ring',
        body: 'Trace the six outer circles. Thirteen now, the Fruit of Life. Twelve around one: a central principle surrounded by its expression.',
        guides: geoRing(300, 300, 176, 44) },
      { title: 'Connect the Centres',
        body: 'Draw straight lines connecting centres to centres. The hexagon emerges; Metatron\u2019s Cube is revealed. You did not create it. You revealed it.',
        guides: [{ kind: 'lineweb', centres: [{ x: 300, y: 300 },
          ...geoRing(300, 300, 88, 44).map(c => ({ x: c.x, y: c.y })),
          ...geoRing(300, 300, 176, 44).map(c => ({ x: c.x, y: c.y }))] }] },
    ],
  },
  {
    key: 'flower',
    name: 'Flower of Life',
    steps: [
      { title: 'The Centre',
        body: 'Trace the centre circle. The whole pattern is already implied in this one form.',
        guides: [{ kind: 'circle', x: 300, y: 300, r: 70 }] },
      { title: 'The First Ring',
        body: 'Six circles around the centre, each centred on a crossing point. The seed appears within the flower.',
        guides: geoRing(300, 300, 70, 70) },
      { title: 'The Second Ring',
        body: 'Twelve more, following the crossing points outward. Take your time · the pattern carries you if you let it.',
        guides: [
          ...geoRing(300, 300, 140, 70),
          ...geoRing(300, 300, 70 * Math.sqrt(3), 70, 6, -Math.PI / 3),
        ] },
      { title: 'The Boundary',
        body: 'One great circle to hold the whole. Nineteen circles, one field. The flower rests inside it.',
        guides: [{ kind: 'circle', x: 300, y: 300, r: 210 }] },
    ],
  },
  {
    key: 'merkaba',
    name: 'Merkaba',
    steps: [
      { title: 'The Rising Triangle',
        body: 'Trace the upward triangle · fire rising.',
        guides: triSegs(MK_UP) },
      { title: 'The Descending Triangle',
        body: 'Trace the downward triangle over it · water descending. The six-pointed star appears where they interlace.',
        guides: triSegs(MK_DN) },
      { title: 'The Axis',
        body: 'Draw each point home to the centre. Two tetrahedra, one still axis · the vehicle is whole.',
        guides: [...MK_UP, ...MK_DN].map(v => geoSeg(v.x, v.y, 300, 300)) },
    ],
  },
  {
    key: 've',
    name: 'Vector Equilibrium',
    steps: [
      { title: 'The Hexagon',
        body: 'Trace the six outer edges. The cuboctahedron seen face-on · twelve points around one.',
        guides: VE_HEX.map((v, i) => {
          const w = VE_HEX[(i + 1) % 6]
          return geoSeg(v.x, v.y, w.x, w.y)
        }) },
      { title: 'The Spokes',
        body: 'Draw each vertex to the centre. Every radius equals every edge · equilibrium of forces in every direction.',
        guides: VE_HEX.map(v => geoSeg(v.x, v.y, 300, 300)) },
      { title: 'The Inner Star',
        body: 'Connect every second vertex, twice around. Fuller called this the vector equilibrium: the stillness at the heart of structure.',
        guides: [0, 1].flatMap(o => [0, 1, 2].map(i => {
          const a = VE_HEX[(o + 2 * i) % 6], b = VE_HEX[(o + 2 * i + 2) % 6]
          return geoSeg(a.x, a.y, b.x, b.y)
        })) },
    ],
  },
  {
    key: 'tree',
    name: 'Tree of Life',
    steps: [
      { title: 'The Supernal Three',
        body: 'Trace the three uppermost circles: crown, wisdom, understanding. The triad above the veil.',
        guides: ['keter', 'chokmah', 'binah'].map(k => ({ kind: 'circle', x: TREE[k].x, y: TREE[k].y, r: 34 })) },
      { title: 'The Seven Below',
        body: 'Trace the remaining seven, pillar by pillar, down to the ground.',
        guides: ['chesed', 'gevurah', 'tiferet', 'netzach', 'hod', 'yesod', 'malkuth'].map(k => ({ kind: 'circle', x: TREE[k].x, y: TREE[k].y, r: 34 })) },
      { title: 'The Twenty-Two Paths',
        body: 'Connect the spheres. Twenty-two paths join ten vessels · draw the ones that call you, in any order.',
        guides: TREE_PATHS.map(([a, b]) => geoSeg(TREE[a].x, TREE[a].y, TREE[b].x, TREE[b].y)) },
    ],
  },
  {
    key: 'spiral',
    name: 'Golden Spiral',
    steps: [
      { title: 'The Great Square',
        body: 'Trace the golden rectangle, then the line that sets the largest square apart. Remove a square from a golden rectangle and a golden rectangle remains.',
        guides: [
          geoSeg(28, 132, 572, 132), geoSeg(572, 132, 572, 468),
          geoSeg(572, 468, 28, 468), geoSeg(28, 468, 28, 132),
          geoSeg(364, 132, 364, 468),
        ] },
      { title: 'The Descent',
        body: 'Divide again, and again · each remainder holds the same proportion, smaller. Four lines, the same law each time.',
        guides: [
          geoSeg(364, 340, 572, 340), geoSeg(444, 340, 444, 468),
          geoSeg(364, 388, 444, 388), geoSeg(412, 340, 412, 388),
        ] },
      { title: 'The Spiral',
        body: 'Now the curve: one quarter-turn in each square, from the largest inward. Sunflower, shell, galaxy · the same unfolding.',
        guides: [
          geoQarc(364, 468, 336, { x: 28, y: 468 }, { x: 364, y: 132 }),
          geoQarc(364, 340, 208, { x: 364, y: 132 }, { x: 572, y: 340 }),
          geoQarc(444, 340, 128, { x: 572, y: 340 }, { x: 444, y: 468 }),
          geoQarc(444, 388, 80, { x: 444, y: 468 }, { x: 364, y: 388 }),
          geoQarc(412, 388, 48, { x: 364, y: 388 }, { x: 412, y: 340 }),
        ] },
    ],
  },
]

// ── Stroke fitting ────────────────────────────────────────────
function fitStroke(pts) {
  const n = pts.length
  if (n < 8) return null
  let len = 0
  for (let i = 1; i < n; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  if (len < 40) return null
  const chord = Math.hypot(pts[n - 1].x - pts[0].x, pts[n - 1].y - pts[0].y)
  if (chord / len > 0.92) {
    return { kind: 'line', x1: pts[0].x, y1: pts[0].y, x2: pts[n - 1].x, y2: pts[n - 1].y }
  }
  let sx = 0, sy = 0, minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9
  for (const p of pts) {
    sx += p.x; sy += p.y
    if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x
    if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y
  }
  const mx = sx / n, my = sy / n
  const blob = { kind: 'blob', cx: mx, cy: my, span: Math.max(maxx - minx, maxy - miny), len }
  let Suu = 0, Suv = 0, Svv = 0, Suuu = 0, Svvv = 0, Suvv = 0, Svuu = 0
  for (const p of pts) {
    const u = p.x - mx, v = p.y - my
    Suu += u * u; Suv += u * v; Svv += v * v
    Suuu += u * u * u; Svvv += v * v * v; Suvv += u * v * v; Svuu += v * u * u
  }
  const det = Suu * Svv - Suv * Suv
  if (Math.abs(det) < 1e-6) return blob
  const uc = (Svv * (Suuu + Suvv) - Suv * (Svvv + Svuu)) / (2 * det)
  const vc = (Suu * (Svvv + Svuu) - Suv * (Suuu + Suvv)) / (2 * det)
  const cx = uc + mx, cy = vc + my
  const r = Math.sqrt(uc * uc + vc * vc + (Suu + Svv) / n)
  let dev = 0
  for (const p of pts) dev += Math.abs(Math.hypot(p.x - cx, p.y - cy) - r)
  dev /= n
  if (r < 15 || dev / r > 0.28) return blob
  const closed = len >= 2 * Math.PI * r * 0.6
  return { kind: 'circle', x: cx, y: cy, r, closed }
}

const nearPt = (ax, ay, bx, by, tol) => Math.hypot(ax - bx, ay - by) < tol

function matchGuide(fit, guides, taken) {
  for (let i = 0; i < guides.length; i++) {
    if (taken.has(i)) continue
    const g = guides[i]
    if (g.kind === 'circle' && fit.kind === 'circle' && fit.closed
      && nearPt(fit.x, fit.y, g.x, g.y, g.r * 0.5) && Math.abs(fit.r - g.r) < g.r * 0.35) {
      return { index: i, element: { kind: 'circle', x: g.x, y: g.y, r: g.r } }
    }
    if (g.kind === 'arc' && fit.kind === 'circle'
      && nearPt(fit.x, fit.y, g.x, g.y, g.r * 0.5) && Math.abs(fit.r - g.r) < g.r * 0.35) {
      return { index: i, element: { kind: 'circle', x: g.x, y: g.y, r: g.r } }
    }
    if (g.kind === 'petal') {
      const midx = (g.tips[0].x + g.tips[1].x) / 2, midy = (g.tips[0].y + g.tips[1].y) / 2
      const span = Math.hypot(g.tips[0].x - g.tips[1].x, g.tips[0].y - g.tips[1].y)
      const blobHit = fit.kind === 'blob' && nearPt(fit.cx, fit.cy, midx, midy, span * 0.35)
        && fit.span > span * 0.45 && fit.span < span * 1.7
      const circHit = fit.kind === 'circle'
        && g.parents.some(p => nearPt(fit.x, fit.y, p.x, p.y, p.r * 0.5) && Math.abs(fit.r - p.r) < p.r * 0.4)
      if (blobHit || circHit) return { index: i, element: { kind: 'path', pts: g.path } }
    }
    if (g.kind === 'segment' && fit.kind === 'line') {
      const t = 34
      if ((nearPt(fit.x1, fit.y1, g.x1, g.y1, t) && nearPt(fit.x2, fit.y2, g.x2, g.y2, t))
        || (nearPt(fit.x1, fit.y1, g.x2, g.y2, t) && nearPt(fit.x2, fit.y2, g.x1, g.y1, t))) {
        return { index: i, element: { kind: 'line', x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 } }
      }
    }
    if (g.kind === 'qarc') {
      const circHit = fit.kind === 'circle'
        && nearPt(fit.x, fit.y, g.cx, g.cy, g.r * 0.55) && Math.abs(fit.r - g.r) < g.r * 0.45
      const t = Math.max(40, g.r * 0.2)
      const lineHit = fit.kind === 'line'
        && ((nearPt(fit.x1, fit.y1, g.a.x, g.a.y, t) && nearPt(fit.x2, fit.y2, g.b.x, g.b.y, t))
          || (nearPt(fit.x1, fit.y1, g.b.x, g.b.y, t) && nearPt(fit.x2, fit.y2, g.a.x, g.a.y, t)))
      if (circHit || lineHit) return { index: i, element: { kind: 'path', pts: g.path } }
    }
    if (g.kind === 'lineweb' && fit.kind === 'line') {
      const near = (px, py) => g.centres.find(c => nearPt(c.x, c.y, px, py, 42))
      const a = near(fit.x1, fit.y1), b = near(fit.x2, fit.y2)
      if (a && b && a !== b) {
        return { index: i, multi: true, element: { kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y } }
      }
    }
  }
  return null
}

const pathD = (pts) => 'M ' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')

// Ramer-Douglas-Peucker simplification: reduces a stroke to its corner
// vertices so a triangle (or square, or star) drawn in one continuous
// motion can be recognised side by side.
function simplify(pts, tol = 14) {
  if (pts.length < 3) return pts
  let maxD = 0, idx = 0
  const a = pts[0], b = pts[pts.length - 1]
  const abx = b.x - a.x, aby = b.y - a.y
  const abLen = Math.hypot(abx, aby) || 1e-9
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(abx * (a.y - pts[i].y) - (a.x - pts[i].x) * aby) / abLen
    if (d > maxD) { maxD = d; idx = i }
  }
  if (maxD <= tol) return [a, b]
  const left = simplify(pts.slice(0, idx + 1), tol)
  const right = simplify(pts.slice(idx), tol)
  return [...left.slice(0, -1), ...right]
}

function GeometryPractice() {
  const [shapeKey, setShapeKey] = useState('vesica')
  const [step, setStep] = useState(0)
  const [recognised, setRecognised] = useState([]) // { el, key } · key = taken index or null
  const [taken, setTaken] = useState(() => new Set())
  const [resolved, setResolved] = useState(false)
  const [mode, setMode] = useState('draw') // draw | erase
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const stroke = useRef([])
  const strokes = useRef([]) // strokes that matched nothing (free marks)

  const shape = GEO_SHAPES.find(s => s.key === shapeKey)
  const lastStep = step === shape.steps.length - 1

  const drawSeg = (ctx, p0, p1) => {
    ctx.strokeStyle = fn.ink
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y)
    ctx.lineTo(p1.x, p1.y)
    ctx.stroke()
  }

  const redraw = () => {
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, c.width, c.height)
    for (const st of strokes.current) {
      for (let i = 1; i < st.length; i++) drawSeg(ctx, st[i - 1], st[i])
    }
  }

  const resetAll = (key = shapeKey) => {
    setShapeKey(key); setStep(0); setRecognised([]); setTaken(new Set()); setResolved(false)
    strokes.current = []
    const c = canvasRef.current
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height)
  }

  // Apple Pencil support: fingers scroll the page, the Pencil draws.
  // Safari marks Pencil touches as touchType 'stylus'; blocking only those
  // keeps finger panning alive (touchAction pan-y) while the Pencil never
  // pans. Mouse still draws for desktop.
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const block = (e) => {
      const ts = e.changedTouches ? Array.from(e.changedTouches) : []
      if (ts.some(t => t.touchType === 'stylus')) e.preventDefault()
    }
    c.addEventListener('touchstart', block, { passive: false })
    c.addEventListener('touchmove', block, { passive: false })
    return () => {
      c.removeEventListener('touchstart', block)
      c.removeEventListener('touchmove', block)
    }
  }, [])

  const pos = (e) => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (c.width / rect.width),
      y: (e.clientY - rect.top) * (c.height / rect.height),
    }
  }

  const distToSeg = (p, x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1
    const L2 = dx * dx + dy * dy || 1e-9
    let t = ((p.x - x1) * dx + (p.y - y1) * dy) / L2
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(p.x - (x1 + t * dx), p.y - (y1 + t * dy))
  }

  const eraseAt = (p) => {
    const R = 20
    // free strokes
    const before = strokes.current.length
    strokes.current = strokes.current.filter(st => !st.some(q => Math.hypot(q.x - p.x, q.y - p.y) < R))
    if (strokes.current.length !== before) redraw()
    // recognised elements · erasing one releases its guide for redrawing
    setRecognised(rs => {
      const keep = []
      const freed = []
      for (const entry of rs) {
        const el = entry.el
        let hit = false
        if (el.kind === 'circle') hit = Math.abs(Math.hypot(p.x - el.x, p.y - el.y) - el.r) < 14
        if (el.kind === 'line') hit = distToSeg(p, el.x1, el.y1, el.x2, el.y2) < 14
        if (el.kind === 'path') hit = el.pts.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 14)
        if (hit && entry.key !== null && entry.key !== undefined) freed.push(entry.key)
        if (!hit) keep.push(entry)
      }
      if (freed.length) setTaken(t => {
        const nt = new Set(t)
        freed.forEach(k => nt.delete(k))
        return nt
      })
      return keep
    })
  }

  const down = (e) => {
    if (resolved) return
    if (e.pointerType === 'touch') return // fingers scroll; Pencil and mouse act
    drawing.current = true
    if (mode === 'erase') { eraseAt(pos(e)); return }
    stroke.current = [pos(e)]
    e.target.setPointerCapture?.(e.pointerId)
  }
  const move = (e) => {
    if (!drawing.current) return
    if (e.pointerType === 'touch') return
    const p = pos(e)
    if (mode === 'erase') { eraseAt(p); return }
    const prev = stroke.current[stroke.current.length - 1]
    stroke.current.push(p)
    drawSeg(canvasRef.current.getContext('2d'), prev, p)
  }

  // Match against every step revealed so far; quiet on non-match.
  const tryMatch = (fit) => {
    if (!fit) return false
    for (let s = 0; s <= step; s++) {
      const offset = shape.steps.slice(0, s).reduce((a, st) => a + st.guides.length, 0)
      const localTaken = new Set([...taken].filter(t => t >= offset && t < offset + shape.steps[s].guides.length).map(t => t - offset))
      const m = matchGuide(fit, shape.steps[s].guides, localTaken)
      if (m) {
        setRecognised(r => [...r, { el: m.element, key: m.multi ? null : offset + m.index }])
        if (!m.multi) setTaken(t => new Set([...t, offset + m.index]))
        return true
      }
    }
    return false
  }

  const up = () => {
    if (!drawing.current) return
    drawing.current = false
    if (mode === 'erase') return
    const pts = stroke.current
    stroke.current = []
    let matched = false

    // 1 · whole stroke: circle, arc, petal, single line
    if (tryMatch(fitStroke(pts))) matched = true

    // 2 · corner-split: recognise each side of a multi-segment stroke
    if (!matched && pts.length >= 3) {
      const closed = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 36
      const verts = simplify(pts)
      const ring = closed && verts.length > 2 ? [...verts, verts[0]] : verts
      for (let i = 1; i < ring.length; i++) {
        const a = ring[i - 1], b = ring[i]
        if (Math.hypot(a.x - b.x, a.y - b.y) < 40) continue
        if (tryMatch({ kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y })) matched = true
      }
    }

    // Snap: a stroke that found its form clicks into place · the hand
    // line is replaced by the perfect one. Unmatched strokes remain.
    if (matched) redraw()
    else { strokes.current.push(pts); }
  }

  const clearCanvas = () => {
    strokes.current = []
    canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setRecognised([]); setTaken(new Set()); setResolved(false)
  }

  const guideOpacity = (s) => {
    if (resolved) return 0
    if (s < step) return 0.14
    if (s === step) return 0.4
    return 0
  }

  const renderGuide = (g, key, opacity) => {
    if (g.kind === 'circle' || g.kind === 'arc') {
      return <circle key={key} cx={g.x} cy={g.y} r={g.r} fill="none"
        stroke={fn.moss} strokeWidth="1.5" strokeDasharray="3 5" opacity={opacity} />
    }
    if (g.kind === 'segment') {
      return <line key={key} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}
        stroke={fn.moss} strokeWidth="1.2" strokeDasharray="3 5" opacity={opacity} />
    }
    if (g.kind === 'petal' || g.kind === 'qarc') {
      return <path key={key} d={pathD(g.path)} fill="none"
        stroke={fn.moss} strokeWidth="1.2" strokeDasharray="3 5" opacity={opacity} />
    }
    if (g.kind === 'lineweb') {
      return g.centres.map((a, x) =>
        g.centres.slice(x + 1).map((b, y) => (
          <line key={`${key}-${x}-${y}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={fn.moss} strokeWidth="0.5" opacity={opacity * 0.5} />
        ))
      )
    }
    return null
  }

  const renderPerfect = (el, i, cls) => {
    if (el.kind === 'circle') return <circle key={`r${i}`} className={cls} cx={el.x} cy={el.y} r={el.r} fill="none" stroke={fn.moss} strokeWidth="2" />
    if (el.kind === 'line') return <line key={`r${i}`} className={cls} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={fn.moss} strokeWidth="1.6" />
    if (el.kind === 'path') return <path key={`r${i}`} className={cls} d={pathD(el.pts)} fill="none" stroke={fn.moss} strokeWidth="2" />
    return null
  }

  const fullFigure = []
  shape.steps.forEach(st => st.guides.forEach(g => {
    if (g.kind === 'circle' || g.kind === 'arc') fullFigure.push({ kind: 'circle', x: g.x, y: g.y, r: g.r })
    if (g.kind === 'segment') fullFigure.push({ kind: 'line', x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 })
    if (g.kind === 'petal' || g.kind === 'qarc') fullFigure.push({ kind: 'path', pts: g.path })
    if (g.kind === 'lineweb') g.centres.forEach((a, x) => g.centres.slice(x + 1).forEach(b =>
      fullFigure.push({ kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y })))
  }))

  return (
    <div>
      <p style={{ ...fnText.body, maxWidth: 640, marginBottom: space.xl }}>
        Draw slowly, with the Pencil · fingers are free to scroll. You are not
        learning these forms; you are recognising them. When your line finds a
        form, it clicks into place · your stroke becomes the perfect one. Draw a
        whole triangle in one motion or side by side; both are heard. Paper, a
        coin, and a pencil remain the deepest version. This is the travelling one.
      </p>

      <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', marginBottom: space.xl }}>
        {GEO_SHAPES.map(s => (
          <button key={s.key} style={btnStyle(s.key === shapeKey ? 'solid' : 'ghost')}
            onClick={() => resetAll(s.key)}>
            {s.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: space.xl, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{
          position: 'relative', width: 'min(600px, 100%)', aspectRatio: '1',
          background: fn.object, borderRadius: 8, boxShadow: shadow.fn.rest,
          touchAction: 'pan-y', overflow: 'hidden',
        }}>
          <svg viewBox="0 0 600 600" className="prism-geo-guide">
            {shape.steps.map((st, s) => st.guides.map((g, i) => renderGuide(g, `${s}-${i}`, guideOpacity(s))))}
            {shape.steps.map((st, s) => st.guides.filter(g => g.kind === 'circle' || g.kind === 'arc').map((g, i) => (
              <circle key={`p${s}-${i}`} cx={g.x} cy={g.y} r="2.5" fill={fn.moss}
                opacity={resolved ? 0 : s <= step ? 0.55 : 0} />
            )))}
            {!resolved && recognised.map((entry, i) => renderPerfect(entry.el, i, 'prism-reco'))}
            {resolved && fullFigure.map((el, i) => renderPerfect(el, i, 'prism-reco'))}
          </svg>
          <canvas
            ref={canvasRef} width={600} height={600}
            className={resolved ? 'prism-hand prism-hand-ghost' : 'prism-hand'}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
          />
        </div>

        <style>{`
          .prism-geo-guide { position: absolute; inset: 0; width: 100%; height: 100%; }
          .prism-hand { position: absolute; inset: 0; width: 100%; height: 100%; cursor: crosshair; transition: opacity 2.4s ease; }
          .prism-hand-ghost { opacity: 0.12; }
          .prism-reco { opacity: 0.55; animation: prismRecoIn 0.9s ease; }
          @keyframes prismRecoIn { from { opacity: 0; } to { opacity: 0.55; } }
        `}</style>

        <div style={{ flex: '1 1 240px', minWidth: 240 }}>
          {!resolved ? (
            <>
              <div style={{ ...fnText.eyebrow, marginBottom: space.sm }}>
                {shape.name} · Step {step + 1} of {shape.steps.length}
              </div>
              <h3 style={{ ...fnText.heading, marginBottom: space.sm }}>{shape.steps[step].title}</h3>
              <p style={{ ...fnText.body, marginBottom: space.xl }}>{shape.steps[step].body}</p>
              <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', marginBottom: space.lg }}>
                <button style={btnStyle(mode === 'draw' ? 'solid' : 'ghost')} onClick={() => setMode('draw')}>Draw</button>
                <button style={btnStyle(mode === 'erase' ? 'solid' : 'ghost')} onClick={() => setMode('erase')}>Erase</button>
              </div>
              <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
                <button style={btnStyle('ghost')} disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>← Back</button>
                {!lastStep && <button style={btnStyle()} onClick={() => setStep(s => s + 1)}>Next step →</button>}
                {lastStep && <button style={btnStyle()} onClick={() => setResolved(true)}>Reveal the form</button>}
                <button style={btnStyle('ghost')} onClick={clearCanvas}>Clear drawing</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ ...fnText.eyebrow, marginBottom: space.sm }}>{shape.name}</div>
              <h3 style={{ ...fnText.heading, marginBottom: space.sm }}>Revealed</h3>
              <p style={{ ...fnText.body, marginBottom: space.xl }}>
                The form was always there. Your hand found it.
              </p>
              <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
                <button style={btnStyle()} onClick={() => resetAll()}>Begin again</button>
              </div>
            </>
          )}
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
