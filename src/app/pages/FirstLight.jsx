// ─────────────────────────────────────────────────────────────
// FirstLight.jsx  —  /welcome/first-light
//
// The entry experience for every new NextUs user.
// Four screens: Cover → Personal → Zoom → Placement
// On completion writes to:
//   users (scores, challenges, first_light_completed_at)
//   contributor_profiles_beta (vision, concerns, scale, location_focus_id)
// Then fires a background concern-resolution call (→ problem_chains)
// and redirects to Mission Control.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { FocusSearch } from '../components/FocusSearch'
import WorldWheel from '../components/mission-control/WorldWheel'

// ── Design tokens ──────────────────────────────────────────────
const BG   = '#FAFAF7'
const INK  = '#0F1523'
const GOLD = '#A8721A'
const GC   = '#C8922A'
const DARK = '#0F1523'

const SERIF = "'Cormorant Garamond', Georgia, serif"
const SC    = "'Cormorant SC', Georgia, serif"
const LORA  = "'Lora', Georgia, serif"

// ── Scale labels ───────────────────────────────────────────────
const SCALE_LABELS = {
  10: 'The best there is',    9: 'Really, really good',
  8:  'Solid',                7: 'Getting there',
  6:  'Getting by',           5: 'The Pass/Fail Mark',
  4:  'Trying but not moving', 3: 'Pretty rough',
  2:  'Barely holding on',    1: 'Really struggling',
  0:  'Zero',
}

// ── Domain data ────────────────────────────────────────────────
const SELF_DOMAINS = [
  { key: 'path',       name: 'Path',       hex: '#6B1F2E', desc: 'Dharma, mission, purpose, meaning',                              cards: ['Direction', 'Purpose', 'Career', 'Meaning', "What I'm here for"] },
  { key: 'spark',      name: 'Spark',      hex: '#E8722E', desc: 'Passion, fire, aura, energy',                                   cards: ['Motivation', 'Joy', 'Feeling alive', 'Fire', 'Excitement'] },
  { key: 'body',       name: 'Body',       hex: '#2A8C4F', desc: 'Health, fitness, vitality',                                     cards: ['Energy', 'Sleep', 'Fitness', 'Health', 'How I feel'] },
  { key: 'finances',   name: 'Finances',   hex: '#E8B92E', desc: 'Money, personal power, wealth',                                 cards: ['Money stress', 'Financial security', 'Earning', 'Spending'] },
  { key: 'connection', name: 'Connection', hex: '#D63838', desc: 'You with other people: romantic, friends, family',              cards: ['Friendships', 'Romantic relationship', 'Family', 'Loneliness', 'Feeling understood'] },
  { key: 'inner_game', name: 'Inner Game', hex: '#2767B8', desc: 'Your relationship with yourself, values, standards',            cards: ['Self-confidence', 'Self-worth', 'Anxiety', 'Negative self-talk', 'Who I am'] },
  { key: 'signal',     name: 'Signal',     hex: '#6B3FA8', desc: "Your relationship with the world, how you're seen and show up", cards: ['My impact', 'How I come across', "How I'm seen", 'Feeling heard'] },
]

const CIV_DOMAINS = [
  { key: 'vision',  name: 'Vision',            hex: '#6B1F2E' },
  { key: 'human',   name: 'Human Being',       hex: '#E8722E' },
  { key: 'nature',  name: 'Nature',            hex: '#2A8C4F' },
  { key: 'economy', name: 'Finance & Economy', hex: '#E8B92E' },
  { key: 'society', name: 'Society',           hex: '#D63838' },
  { key: 'legacy',  name: 'Legacy',            hex: '#2767B8' },
  { key: 'tech',    name: 'Technology',        hex: '#6B3FA8' },
]

const SCALE_OPTIONS = [
  { key: 'circle',  label: 'My circle'  },
  { key: 'city',    label: 'My city'    },
  { key: 'country', label: 'My country' },
  { key: 'planet',  label: 'My planet'  },
]

// ── WheelSVG — personal wheel with domain labels ───────────────
// Used on the Zoom screen. Separate from the Mission Control
// GlanceWheel so we can show domain name labels at this size.
function WheelSVG({ scores, size = 220 }) {
  const N = 7
  const PAD = 56
  const vb = size + PAD * 2
  const cx = vb / 2
  const cy = vb / 2
  const maxR = (size / 2) * 0.78
  const labelR = (size / 2) * 1.22

  function angleFor(i) { return (Math.PI * 2 * i) / N - Math.PI / 2 }

  const ringPts = SELF_DOMAINS.map((_, i) => {
    const a = angleFor(i)
    return `${cx + maxR * Math.cos(a)},${cy + maxR * Math.sin(a)}`
  }).join(' ')

  const polyPts = SELF_DOMAINS.map((d, i) => {
    const a = angleFor(i)
    const ratio = (scores?.[d.key] ?? 0) / 10
    const r = Math.max(ratio * maxR, 0)
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')

  const hasData = SELF_DOMAINS.some(d => (scores?.[d.key] ?? 0) > 0)

  return (
    <svg
      width={size + PAD * 2}
      height={size + PAD * 2}
      viewBox={`0 0 ${vb} ${vb}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <polygon points={ringPts} fill="none" stroke="rgba(200,146,42,0.32)" strokeWidth="1.5" strokeDasharray="3 4" />
      {SELF_DOMAINS.map((_, i) => {
        const a = angleFor(i)
        return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="rgba(200,146,42,0.25)" strokeWidth="1.5" />
      })}
      {hasData && (
        <>
          <polygon points={polyPts} fill="rgba(200,146,42,0.14)" stroke="rgba(200,146,42,0.8)" strokeWidth="2.5" strokeLinejoin="round" />
          {polyPts.split(' ').map((pt, i) => {
            const [x, y] = pt.split(',').map(Number)
            const score = scores?.[SELF_DOMAINS[i]?.key] ?? 0
            if (score === 0) return null
            return <circle key={i} cx={x} cy={y} r={5} fill={SELF_DOMAINS[i].hex} />
          })}
        </>
      )}
      {SELF_DOMAINS.map((d, i) => {
        const a = angleFor(i)
        const lx = cx + labelR * Math.cos(a)
        const ly = cy + labelR * Math.sin(a)
        const anchor = Math.cos(a) > 0.2 ? 'start' : Math.cos(a) < -0.2 ? 'end' : 'middle'
        return (
          <text
            key={d.key}
            x={lx} y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            style={{ fontFamily: LORA, fontSize: 13, letterSpacing: '0.06em', fill: d.hex, userSelect: 'none', pointerEvents: 'none' }}
          >
            {d.name.toUpperCase()}
          </text>
        )
      })}
      <circle cx={cx} cy={cy} r={size * 0.06} fill="#C8922A" />
    </svg>
  )
}

// ── Shared styles ──────────────────────────────────────────────
const s = {
  app:    { maxWidth: 430, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', background: BG, overscrollBehavior: 'none' },
  screen: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '0 24px' },
  eyebrow:{ fontFamily: SC, fontSize: 13, letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase', margin: '0 0 6px' },
  prompt: { fontFamily: SERIF, fontSize: 27, fontWeight: 500, lineHeight: 1.08, margin: '0 0 6px' },
  sub:    { fontFamily: LORA, fontSize: 14, color: 'rgba(15,21,35,0.55)', lineHeight: 1.5, margin: '0 0 20px' },
  btn:    { fontFamily: SC, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '15px', borderRadius: 30, border: 'none', cursor: 'pointer', background: INK, color: '#fff', transition: 'all 0.2s' },
  ghost:  { fontFamily: SC, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '15px 0', border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(15,21,35,0.55)' },
  foot:   { flexShrink: 0, display: 'flex', gap: 12, alignItems: 'center', padding: '16px 24px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom))', background: BG },
  card:   { fontFamily: LORA, fontSize: 14, padding: '8px 13px', border: '1px solid rgba(15,21,35,0.14)', borderRadius: 20, background: 'transparent', color: INK, cursor: 'pointer', transition: 'all 0.15s', lineHeight: 1 },
}

// ── Progress bar ───────────────────────────────────────────────
function Progress({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '14px 24px 10px', flexShrink: 0 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < step ? GC : i === step ? GOLD : 'rgba(15,21,35,0.1)',
          transition: 'background 0.4s',
        }} />
      ))}
    </div>
  )
}

// ── Screen 0: Cover ────────────────────────────────────────────
function CoverScreen({ onBegin }) {
  return (
    <div style={{ ...s.screen, justifyContent: 'center', textAlign: 'center', paddingBottom: 'calc(60px + env(safe-area-inset-bottom))', paddingTop: 24 }}>
      <p style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.14em', color: 'rgba(15,21,35,0.65)', margin: '0 0 6px' }}>Welcome to</p>
      <h1 style={{ fontFamily: SC, fontSize: 46, letterSpacing: '0.04em', margin: '0 0 18px', color: INK }}>NextUs</h1>
      <p style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.1em', color: 'rgba(15,21,35,0.65)', margin: '0 0 6px' }}>Building the future for</p>
      <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22, lineHeight: 1.1, margin: '0 0 32px', color: INK }}>The Person and the Planet.</h2>
      <p style={{ fontFamily: LORA, fontSize: 15, color: 'rgba(15,21,35,0.7)', lineHeight: 1.6, margin: '0 0 36px' }}>Let's find where you are.<br />Five minutes.</p>
      <button style={{ ...s.btn, maxWidth: 180, margin: '0 auto', display: 'block' }} onClick={onBegin}>Begin</button>
      <div style={{ height: 60 }} />
    </div>
  )
}

// ── Screen 1: Personal domains ─────────────────────────────────
function PersonalScreen({ scores, setScores, cards, setCards, onNext, onBack }) {
  function handleScore(key, val) {
    setScores(prev => ({ ...prev, [key]: parseInt(val) }))
  }
  function toggleCard(key, label) {
    setCards(prev => {
      const cur = prev[key] || []
      return { ...prev, [key]: cur.includes(label) ? cur.filter(x => x !== label) : [...cur, label] }
    })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flexShrink: 0, padding: '20px 24px 0' }}>
        <p style={s.eyebrow}>Where you are</p>
        <h1 style={{ ...s.prompt, fontSize: 24 }}>Seven areas of your life.</h1>
        <p style={s.sub}>For each one, tap what feels relevant right now, then slide to show where you are on a scale of 0 to 10.</p>
        <p style={{ fontFamily: LORA, fontSize: 13, color: 'rgba(15,21,35,0.55)', margin: '0 0 24px', lineHeight: 1.5 }}>Honest beats optimistic.</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '0 24px' }}>
        {SELF_DOMAINS.map(d => (
          <div key={d.key} style={{ borderLeft: `3px solid ${d.hex}`, paddingLeft: 16, marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: SC, fontSize: 15, letterSpacing: '0.1em', color: INK }}>{d.name.toUpperCase()}</span>
            </div>
            <p style={{ fontFamily: LORA, fontSize: 13, color: 'rgba(15,21,35,0.5)', margin: '0 0 12px', lineHeight: 1.4 }}>{d.desc}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
              {d.cards.map(label => {
                const sel = (cards[d.key] || []).includes(label)
                return (
                  <button
                    key={label}
                    style={{ ...s.card, background: sel ? d.hex : 'transparent', color: sel ? '#fff' : INK, borderColor: sel ? 'transparent' : 'rgba(15,21,35,0.14)' }}
                    onClick={() => toggleCard(d.key, label)}
                  >{label}</button>
                )
              })}
            </div>
            <p style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', margin: '0 0 10px' }}>Where are you right now?</p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <input
                type="range" min="0" max="10" step="1"
                value={scores[d.key] ?? 5}
                onChange={e => handleScore(d.key, e.target.value)}
                style={{ flex: 1, accentColor: d.hex, height: 4 }}
              />
              <div style={{ minWidth: 80 }}>
                <div style={{ fontFamily: SC, fontSize: 24, fontWeight: 600, color: d.hex, lineHeight: 1 }}>
                  {scores[d.key] ?? 5}<span style={{ fontFamily: SC, fontSize: 13, color: 'rgba(15,21,35,0.55)', letterSpacing: '0.1em' }}> *</span>
                </div>
                <div style={{ fontFamily: LORA, fontSize: 13, color: 'rgba(15,21,35,0.55)', lineHeight: 1.3, marginTop: 2 }}>
                  {SCALE_LABELS[scores[d.key] ?? 5]}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontFamily: LORA, fontSize: 13, color: 'rgba(15,21,35,0.55)' }}>Zero</span>
              <span style={{ fontFamily: LORA, fontSize: 13, color: 'rgba(15,21,35,0.55)' }}>The best there is</span>
            </div>
          </div>
        ))}
        <div style={{ height: 24 }} />
      </div>
      <div style={s.foot}>
        <button style={s.ghost} onClick={onBack}>Back</button>
        <button style={{ ...s.btn, flex: 1 }} onClick={onNext}>Next</button>
      </div>
    </div>
  )
}

// ── Screen 2: The Zoom ─────────────────────────────────────────
function ZoomScreen({ scores, onNext }) {
  const [phase, setPhase] = useState('personal')
  const [textVisible, setTextVisible] = useState(false)

  function handleZoom() {
    setPhase('zooming')
    setTimeout(() => { setPhase('planet'); setTextVisible(true) }, 1600)
  }

  const personalScale   = phase === 'zooming' ? 0.34 : 1
  const planetOpacity   = phase === 'planet'   ? 1 : 0
  const personalOpacity = phase === 'planet'   ? 0 : 1
  const bgColor         = phase === 'personal' ? BG   : DARK
  const textColor       = phase === 'personal' ? INK  : BG

  // Zoom screen has no scrollable content — no overflow constraint
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      paddingBottom: 'calc(50px + env(safe-area-inset-bottom))',
      paddingTop: 24,
      background: bgColor,
      color: textColor,
      transition: 'background 1s 0.4s',
      overflow: 'hidden',
    }}>
      {/* Wheel container — sized by the planet wheel spacer */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, flexShrink: 0 }}>
        {/* Planet wheel */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: planetOpacity, transition: 'opacity 1.4s 0.3s', overflow: 'visible' }}>
          <div style={{ overflow: 'visible' }}>
            <WorldWheel
              dimensions={CIV_DOMAINS.map(d => ({ slug: d.key, label: d.name, color: d.hex }))}
              size={220}
              dark
            />
          </div>
        </div>
        {/* Personal wheel — scales down and fades */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${personalScale})`, transition: 'transform 1.6s cubic-bezier(0.6,0.01,0.2,1), opacity 0.4s 1.2s', opacity: personalOpacity }}>
          <WheelSVG scores={scores} size={180} />
        </div>
        {/* Invisible spacer — sets container height to match planet wheel */}
        <div style={{ visibility: 'hidden', overflow: 'visible', pointerEvents: 'none' }}>
          <WorldWheel
            dimensions={CIV_DOMAINS.map(d => ({ slug: d.key, label: d.name, color: d.hex }))}
            size={220}
          />
        </div>
      </div>

      {phase === 'personal' && (
        <div style={{ animation: 'fadein 0.6s ease', padding: '0 24px' }}>
          <p style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.5, margin: '0 0 8px', color: 'rgba(15,21,35,0.7)' }}>This is your map.</p>
          <p style={{ fontFamily: LORA, fontSize: 14, color: 'rgba(15,21,35,0.55)', margin: '0 0 32px' }}>Take a moment with it.</p>
          <button
            style={{ ...s.btn, background: 'transparent', border: `1px solid rgba(15,21,35,0.3)`, color: INK, letterSpacing: '0.14em' }}
            onClick={handleZoom}
          >Next</button>
        </div>
      )}

      {phase === 'zooming' && (
        <p style={{ fontFamily: SERIF, fontSize: 18, color: 'rgba(250,250,247,0.5)', margin: 0 }}> </p>
      )}

      {phase === 'planet' && (
        <div style={{ opacity: textVisible ? 1 : 0, transition: 'opacity 1s 0.3s', padding: '0 24px' }}>
          <p style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.18em', color: GC, textTransform: 'uppercase', margin: '0 0 10px' }}>Our planet</p>
          <p style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.4, margin: '0 0 16px', color: BG }}>The seven domains of life on Earth.</p>
          <p style={{ fontFamily: LORA, fontSize: 14, lineHeight: 1.6, margin: '0 0 8px', color: 'rgba(250,250,247,0.65)' }}>The current state of the planet is a reflection of the average of all the people on it.</p>
          <p style={{ fontFamily: SERIF, fontSize: 18, color: GC, margin: '0 0 32px', lineHeight: 1.4 }}>Where would you like to see the world?</p>
          <button style={{ ...s.btn, maxWidth: 260, margin: '0 auto', display: 'block' }} onClick={onNext}>What future are you helping to build?</button>
        </div>
      )}

      <style>{`@keyframes fadein { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }`}</style>
    </div>
  )
}

// ── Screen 3: Placement ────────────────────────────────────────
function PlacementScreen({ vision, setVision, concerns, setConcerns, location, setLocation, scale, setScale, onFinish, saving }) {
  // concerns is an array of strings, max 3
  function setConcern(i, val) {
    setConcerns(prev => {
      const next = [...prev]
      next[i] = val
      return next
    })
  }
  function addConcern() {
    if (concerns.length < 3) setConcerns(prev => [...prev, ''])
  }
  function removeConcern(i) {
    setConcerns(prev => prev.filter((_, idx) => idx !== i))
  }

  const canFinish = vision.trim().length > 0
    && concerns[0]?.trim().length > 0
    && location !== null
    && scale !== null

  const textareaBase = {
    width: '100%',
    fontFamily: LORA,
    fontSize: 15,
    lineHeight: 1.6,
    color: INK,
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid rgba(15,21,35,0.18)`,
    borderRadius: 0,
    padding: '8px 0',
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
    display: 'block',
  }

  const promptLabel = {
    fontFamily: SERIF,
    fontSize: 17,
    fontWeight: 400,
    color: 'rgba(15,21,35,0.45)',
    lineHeight: 1.5,
    display: 'block',
    marginBottom: 4,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '20px 24px 0' }}>

        {/* Vision */}
        <div style={{ marginBottom: 40 }}>
          <p style={s.eyebrow}>Your world</p>
          <span style={promptLabel}>I want to live in a world where...</span>
          <textarea
            rows={3}
            value={vision}
            onChange={e => setVision(e.target.value)}
            placeholder="people feel they belong to something larger than themselves"
            style={textareaBase}
          />
        </div>

        {/* Concerns */}
        <div style={{ marginBottom: 40 }}>
          <p style={s.eyebrow}>What matters</p>
          {concerns.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <span style={promptLabel}>{i === 0 ? 'Issues I care most about...' : '...'}</span>
                <textarea
                  rows={2}
                  value={c}
                  onChange={e => setConcern(i, e.target.value)}
                  placeholder={
                    i === 0 ? 'e.g. climate breakdown, inequality, loneliness...'
                    : i === 1 ? 'Another issue...'
                    : 'One more...'
                  }
                  style={textareaBase}
                />
              </div>
              {i > 0 && (
                <button
                  onClick={() => removeConcern(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(15,21,35,0.35)', fontSize: 18, padding: '6px 0', marginTop: 24, lineHeight: 1 }}
                  aria-label="Remove"
                >×</button>
              )}
            </div>
          ))}
          {concerns.length < 3 && (
            <button
              onClick={addConcern}
              style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.1em', color: GOLD, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add another
            </button>
          )}
        </div>

        {/* Location */}
        <div style={{ marginBottom: 40 }}>
          <p style={s.eyebrow}>Where you are</p>
          <p style={{ fontFamily: LORA, fontSize: 14, color: 'rgba(15,21,35,0.55)', margin: '0 0 12px', lineHeight: 1.5 }}>Helps us find people and work near you.</p>
          <FocusSearch
            value={location}
            onChange={setLocation}
            placeholder="Search — e.g. Mexico City, Canada, East Africa…"
          />
          {location && (
            <p style={{ fontFamily: LORA, fontSize: 13, color: 'rgba(15,21,35,0.55)', margin: '8px 0 0' }}>
              {location.name}{location.type ? ` · ${location.type}` : ''}
            </p>
          )}
        </div>

        {/* Scale */}
        <div style={{ marginBottom: 40 }}>
          <p style={s.eyebrow}>At what scale</p>
          <p style={{ fontFamily: LORA, fontSize: 14, color: 'rgba(15,21,35,0.55)', margin: '0 0 16px', lineHeight: 1.5 }}>Where do you want to show up?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SCALE_OPTIONS.map(o => (
              <button
                key={o.key}
                onClick={() => setScale(o.key)}
                style={{
                  fontFamily: LORA, fontSize: 16, padding: '14px 20px',
                  border: `1px solid ${scale === o.key ? GC : 'rgba(15,21,35,0.14)'}`,
                  borderRadius: 12,
                  background: scale === o.key ? 'rgba(200,146,42,0.08)' : 'transparent',
                  color: scale === o.key ? INK : 'rgba(15,21,35,0.6)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  fontWeight: scale === o.key ? 500 : 400,
                }}
              >{o.label}</button>
            ))}
          </div>
        </div>

        <p style={{ fontFamily: LORA, fontSize: 13, color: 'rgba(15,21,35,0.4)', margin: '0 0 8px', lineHeight: 1.5 }}>
          * Provisional scores — these are your starting point. Begin NextU for your full map.
        </p>

        <div style={{ height: 24 }} />
      </div>

      <div style={s.foot}>
        <button
          style={{ ...s.btn, flex: 1, opacity: canFinish && !saving ? 1 : 0.4, cursor: canFinish && !saving ? 'pointer' : 'default' }}
          onClick={canFinish && !saving ? onFinish : undefined}
        >
          {saving ? 'Stepping in…' : 'Step into NextUs'}
        </button>
      </div>
    </div>
  )
}

// ── LOGO ───────────────────────────────────────────────────────
const LOGO_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAq0AAAMECAYAAACVOBw5AAAACXBIWXMAAC4jAAAuIwF4pT92AAART2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIiB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOmViMjIwOWUwLWJlZjQtNDg0OS1hYjlmLTQ3Yjc5ZjU3ZGRmOCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozYjVjNjY1Mi1iMzNiLTRjYjctODllZi1mYWM0OTdlNzhlZWQiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0iOEE4Njc2QkEzNzFEQjVGMEY2RTMwNTI0Nzk3QTRFNDkiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0iIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNS0xMS0xNlQyMDowODoyOS0wNjowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjYtMDYtMDdUMTY6NTM6MzctMDY6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjYtMDYtMDdUMTY6NTM6MzctMDY6MDAiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKE1hY2ludG9zaCkiIHRpZmY6SW1hZ2VXaWR0aD0iMTE1MiIgdGlmZjpJbWFnZUxlbmd0aD0iMTE0MyIgdGlmZjpQaG90b21ldHJpY0ludGVycHJldGF0aW9uPSIyIiB0aWZmOk9yaWVudGF0aW9uPSIxIiB0aWZmOlNhbXBsZXNQZXJQaXhlbD0iMyIgdGlmZjpYUmVzb2x1dGlvbj0iMzAwMDAwMC8xMDAwMCIgdGlmZjpZUmVzb2x1dGlvbj0iMzAwMDAwMC8xMDAwMCIgdGlmZjpSZXNvbHV0aW9uVW5pdD0iMiIgZXhpZjpFeGlmVmVyc2lvbj0iMDIyMSIgZXhpZjpDb2xvclNwYWNlPSI2NTUzNSIgZXhpZjpQaXhlbFhEaW1lbnNpb249IjY4NSIgZXhpZjpQaXhlbFlEaW1lbnNpb249Ijc3MiI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmQ2MjA1YzgwLTY1OTQtNDZjZS1hNTQwLWEwNDZhM2Q2NzM3YSIgc3RFdnQ6d2hlbj0iMjAyNS0xMS0xNlQyMDoxMToxMC0wNjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNvbnZlcnRlZCIgc3RFdnQ6cGFyYW1ldGVycz0iZnJvbSBpbWFnZS9qcGVnIHRvIGFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5waG90b3Nob3AiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImRlcml2ZWQiIHN0RXZ0OnBhcmFtZXRlcnM9ImNvbnZlcnRlZCBmcm9tIGltYWdlL2pwZWcgdG8gYXBwbGljYXRpb24vdm5kLmFkb2JlLnBob3Rvc2hvcCIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ODFkMDQzMDUtODgyNS00NzdiLWJiNGItNmJhMDkzYmM5ZGJmIiBzdEV2dDp3aGVuPSIyMDI1LTExLTE2VDIwOjExOjEwLTA2OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoTWFjaW50b3NoKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MTZjNGNjNjctZWIyNS00ZjI4LWEwYTctOTkxNDUyNWI4N2I0IiBzdEV2dDp3aGVuPSIyMDI1LTExLTE2VDIwOjU0OjEyLTA2OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoTWFjaW50b3NoKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY29udmVydGVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJmcm9tIGFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5waG90b3Nob3AgdG8gaW1hZ2UvanBlZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iZGVyaXZlZCIgc3RFdnQ6cGFyYW1ldGVycz0iY29udmVydGVkIGZyb20gYXBwbGljYXRpb24vdm5kLmFkb2JlLnBob3Rvc2hvcCB0byBpbWFnZS9qcGVnIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjNTMxNjc2NS04ZTg5LTRhZmMtYjBmNi1jZTk2OWZiN2IzZTkiIHN0RXZ0OndoZW49IjIwMjUtMTEtMTZUMjA6NTQ6MTItMDY6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChNYWNpbnRvc2gpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJkZXJpdmVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJjb252ZXJ0ZWQgZnJvbSBpbWFnZS9qcGVnIHRvIGFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5waG90b3Nob3AiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjIyNWJhMWU5LWYwNTEtNGEwZi1iZDYwLWIzZTk5MDA2ZWE5MyIgc3RFdnQ6d2hlbj0iMjAyNS0xMS0xOFQxMzo0NTowMy0wNjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmNjYWQ4ZmY1LWQ5M2ItNDVjMS1iZjdhLTljMDU2YjM0YjgxZiIgc3RFdnQ6d2hlbj0iMjAyNi0wNi0wN1QxNjo1MzozNy0wNjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNvbnZlcnRlZCIgc3RFdnQ6cGFyYW1ldGVycz0iZnJvbSBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iZGVyaXZlZCIgc3RFdnQ6cGFyYW1ldGVycz0iY29udmVydGVkIGZyb20gYXBwbGljYXRpb24vdm5kLmFkb2JlLnBob3Rvc2hvcCB0byBpbWFnZS9wbmciLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjNiNWM2NjUyLWIzM2ItNGNiNy04OWVmLWZhYzQ5N2U3OGVlZCIgc3RFdnQ6d2hlbj0iMjAyNi0wNi0wN1QxNjo1MzozNy0wNjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOmNjYWQ4ZmY1LWQ5M2ItNDVjMS1iZjdhLTljMDU2YjM0YjgxZiIgc3RSZWY6ZG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOmRmZmIzOGJiLWQwZmQtNjY0My1hY2YyLWE1ZWE3ZjQzNjM0YiIgc3RSZWY6b3JpZ2luYWxEb2N1bWVudElEPSI4QTg2NzZCQTM3MURCNUYwRjZFMzA1MjQ3OTdBNEU0OSIvPiA8cGhvdG9zaG9wOkRvY3VtZW50QW5jZXN0b3JzPiA8cmRmOkJhZz4gPHJkZjpsaT41NkREMkNCNzFFQTBGMzc0RDhGMUU3NTcyRTc0QjVBRTwvcmRmOmxpPiA8cmRmOmxpPjVERDE4Nzg1OThEQzg5QUIyQkZGN0E1OTJCMkMxQzg5PC9yZGY6bGk+IDxyZGY6bGk+QjcwRDU5NTFBNjE2NDZGMkRENTk4QTU3NTAyMkExQzc8L3JkZjpsaT4gPHJkZjpsaT5GQkNGMDBCMjY4REREMUYzQ0IyNThERjE4MDUxMEVERDwvcmRmOmxpPiA8L3JkZjpCYWc+IDwvcGhvdG9zaG9wOkRvY3VtZW50QW5jZXN0b3JzPiA8dGlmZjpCaXRzUGVyU2FtcGxlPiA8cmRmOlNlcT4gPHJkZjpsaT44PC9yZGY6bGk+IDxyZGY6bGk+ODwvcmRmOmxpPiA8cmRmOmxpPjg8L3JkZjpsaT4gPC9yZGY6U2VxPiA8L3RpZmY6Qml0c1BlclNhbXBsZT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4Xlon8AALLLUlEQVR4nOzdd5xc5XX4/8/td/psb9qVVr0XRBEgylDNgnvFsZ3Y48ROnMRfx0l+X3fHTu/lGzuxs3Ec944Lg6lDFSBAgBDqWpXtfXq/9/7+eGYlwGBjJFhJPO/Xa0G7Ozt7n7u7M2fOPc85yjff1YokSZJ0asSTiX/QlNofqYpL1TX/uT/W95H5PiZJkqTTzY1fG/+1v0Z9GY5DkiTp1SxiqFX8eh6gY74PRpIk6Wwhg1ZJkqRTTFVcVMUB8M33sUiSJJ0tZNAqSZJ0ar3zvNZ7eNvS/wJ4XTyZWDLfByRJknQ2kEGrJEnSKRJPJhYAvkWhg6xpeHzuw1vn8ZAkSZLOGjJolSRJOnVsgKg1jd/IzX2sd/4OR5Ik6ewhg1ZJkqRTxwawtBIK3tzHeubvcCRJks4eMmiVJEk6dRaCCFoBTLUC0DSPxyNJknTWkEGrJEnSqdMJoCs1AFp8owCN83g8kiRJZw0ZtEqSJJ0agbm+rIahYliiPMBn5AG0eDIhA1dJkqSTIINWSZKkU6MNAINea/ANKA7KJuQKoOkIYSB7sAlSGQJXRMoJOiJfuCnqQQFRNNAVqCbAJaWBCKdBMEOlcO0JOiJfDokPe7c0ALxVKT0lslkVqH8y4wdOc8T6f/YqKaSmf/PzNiNimf/lJJXZfJfQAp43bVGQAAPWQhipCZQdK3EL0VqAAoUMpJI+8YFvIPSkEPe9BNm6kfwkDX2mmmcN+Bse/lX5W4nIbkr/qmcLFe73HaH5H8oKwMO7DwgHHkEWo3ZJN+WU2S3FmQFnZbPPnMxDEcX9NJC4YPEKbv1x0XmVOC4u5GCkNB5B9kDLzn0FJA'

// ── Main component ─────────────────────────────────────────────
const TOTAL_STEPS = 4 // screens 0–3

export default function FirstLight() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [step, setStep]         = useState(0)
  const [scores, setScores]     = useState({ path: 5, spark: 5, body: 5, finances: 5, connection: 5, inner_game: 5, signal: 5 })
  const [cards, setCards]       = useState({})
  const [vision, setVision]     = useState('')
  const [concerns, setConcerns] = useState([''])
  const [location, setLocation] = useState(null)
  const [scale, setScale]       = useState(null)
  const [saving, setSaving]     = useState(false)

  async function handleFinish() {
    if (!user) return
    setSaving(true)
    try {
      const cleanConcerns = concerns.map(c => c.trim()).filter(Boolean)

      // 1. Write to users table
      await supabase.from('users').update({
        first_light_completed_at: new Date().toISOString(),
        welcome_scores:           scores,
        welcome_challenges:       cards,
      }).eq('id', user.id)

      // 2. Upsert to contributor_profiles_beta
      const cp = {
        id:               user.id,
        welcome_vision:   vision.trim(),
        welcome_concerns: cleanConcerns,
        welcome_scale:    scale,
        updated_at:       new Date().toISOString(),
      }
      if (location?.id) cp.location_focus_id = location.id
      await supabase.from('contributor_profiles_beta').upsert(cp, { onConflict: 'id' })

      // 3. Fire-and-forget: resolve concerns → problem_chains
      if (cleanConcerns.length > 0) {
        fetch('/api/firstlight-resolve-concerns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, vision: vision.trim(), concerns: cleanConcerns }),
        }).catch(() => {}) // non-blocking — matching improves in background
      }
    } catch (e) {
      console.error('First Light save error:', e)
    } finally {
      setSaving(false)
      navigate('/', { replace: true })
    }
  }

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))

  return (
    <div style={{ height: '100dvh', background: BG, overscrollBehavior: 'none' }}>
      <div style={s.app}>
        {step > 0 && step < TOTAL_STEPS - 1 && <Progress step={step - 1} total={2} />}

        {step === 0 && <CoverScreen onBegin={next} />}
        {step === 1 && <PersonalScreen scores={scores} setScores={setScores} cards={cards} setCards={setCards} onNext={next} onBack={back} />}
        {step === 2 && <ZoomScreen scores={scores} onNext={next} />}
        {step === 3 && (
          <PlacementScreen
            vision={vision}       setVision={setVision}
            concerns={concerns}   setConcerns={setConcerns}
            location={location}   setLocation={setLocation}
            scale={scale}         setScale={setScale}
            onFinish={handleFinish}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}
