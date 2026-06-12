// ─────────────────────────────────────────────────────────────
// FirstLight.jsx  —  /welcome/first-light
//
// Four screens: Cover → Personal → Zoom → Placement
// Writes to: users + contributor_profiles_beta
// Fires background concern-resolution → problem_chains
// Redirects to Mission Control on completion.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { FocusSearch } from '../components/FocusSearch'
import WorldWheel from '../components/mission-control/WorldWheel'
import { WheelSVG, SELF_DOMAINS } from '../components/WheelSVG'
import { useCivDomainScores } from '../hooks/useDomainIndicators'

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
  10: 'The best there is',     9: 'Really, really good',
  8:  'Solid',                 7: 'Getting there',
  6:  'Getting by',            5: 'The Pass/Fail Mark',
  4:  'Trying but not moving', 3: 'Pretty rough',
  2:  'Barely holding on',     1: 'Really struggling',
  0:  'Zero',
}

// ── Domain data ────────────────────────────────────────────────
// SELF_DOMAINS now lives in src/app/components/WheelSVG.jsx (shared
// with the marketing home) and is imported above.

// CIV_DOMAINS keys match useCivDomainScores return shape exactly.
// 'finance' not 'economy' — aligned to the indicator rollup.
const CIV_DOMAINS = [
  { key: 'vision',  name: 'Vision',      hex: '#6B1F2E' },
  { key: 'human',   name: 'Human Being', hex: '#E8722E' },
  { key: 'nature',  name: 'Nature',      hex: '#2A8C4F' },
  { key: 'finance', name: 'Economy',     hex: '#E8B92E' },
  { key: 'society', name: 'Society',     hex: '#D63838' },
  { key: 'legacy',  name: 'Legacy',      hex: '#2767B8' },
  { key: 'tech',    name: 'Technology',  hex: '#6B3FA8' },
]

const CIV_DIMS = CIV_DOMAINS.map(d => ({ slug: d.key, label: d.name, color: d.hex }))

const SCALE_OPTIONS = [
  { key: 'circle',  label: 'My circle'  },
  { key: 'city',    label: 'My city'    },
  { key: 'country', label: 'My country' },
  { key: 'planet',  label: 'My planet'  },
]

// ── Desktop breakpoint ─────────────────────────────────────────
// First Light was designed mobile-first. On desktop we widen the
// column and scale the wheels up so the ritual doesn't feel like
// a phone strip floating in a void.
function useDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const fn = e => setDesktop(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return desktop
}

// ── WheelSVG — now imported from ../components/WheelSVG ────────

// ── Shared styles ──────────────────────────────────────────────
const s = {
  app:   { maxWidth: 430, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent', overscrollBehavior: 'none' },
  eyebrow: { fontFamily: SC, fontSize: 13, letterSpacing: '0.18em', color: GOLD, textTransform: 'uppercase', margin: '0 0 6px' },
  btn:   { fontFamily: SC, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '15px 24px', borderRadius: 30, border: 'none', cursor: 'pointer', background: INK, color: '#fff', transition: 'all 0.2s' },
  ghost: { fontFamily: SC, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '15px 0', border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(15,21,35,0.55)' },
  foot:  { flexShrink: 0, display: 'flex', gap: 12, alignItems: 'center', padding: '16px 24px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom))', background: BG },
  card:  { fontFamily: LORA, fontSize: 14, padding: '8px 13px', border: '1px solid rgba(15,21,35,0.14)', borderRadius: 20, background: 'transparent', color: INK, cursor: 'pointer', transition: 'all 0.15s', lineHeight: 1 },
}

// ── Progress bar — shown only on Personal and Placement screens ─
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '24px 32px', paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}>
      <p style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.14em', color: 'rgba(15,21,35,0.65)', margin: '0 0 6px' }}>Welcome to</p>
      <h1 style={{ fontFamily: SC, fontSize: 46, letterSpacing: '0.04em', margin: '0 0 18px', color: INK }}>NextUs</h1>
      <p style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.1em', color: 'rgba(15,21,35,0.65)', margin: '0 0 6px' }}>Building the future for</p>
      <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22, lineHeight: 1.1, margin: '0 0 32px', color: INK }}>The Person and the Planet.</h2>
      <p style={{ fontFamily: LORA, fontSize: 15, color: 'rgba(15,21,35,0.7)', lineHeight: 1.6, margin: '0 0 40px' }}>
        Let's find where you are.<br />Five minutes.
      </p>
      <button style={{ ...s.btn, maxWidth: 160, margin: '0 auto', display: 'block' }} onClick={onBegin}>
        Begin
      </button>
    </div>
  )
}

// ── Screen 1: Personal domains ─────────────────────────────────
function PersonalScreen({ scores, setScores, cards, setCards, onNext, onBack }) {
  function handleScore(key, val) { setScores(prev => ({ ...prev, [key]: parseInt(val) })) }
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
        <h1 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, lineHeight: 1.1, margin: '0 0 6px', color: INK }}>Seven areas of your life.</h1>
        <p style={{ fontFamily: LORA, fontSize: 14, color: 'rgba(15,21,35,0.55)', lineHeight: 1.5, margin: '0 0 6px' }}>Tap what feels relevant, then slide to show where you are.</p>
        <p style={{ fontFamily: LORA, fontSize: 13, color: 'rgba(15,21,35,0.55)', margin: '0 0 20px' }}>Honest beats optimistic.</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '0 24px' }}>
        {SELF_DOMAINS.map(d => (
          <div key={d.key} style={{ borderLeft: `3px solid ${d.hex}`, paddingLeft: 16, marginBottom: 32 }}>
            <span style={{ fontFamily: SC, fontSize: 15, letterSpacing: '0.1em', color: INK, display: 'block', marginBottom: 4 }}>{d.name.toUpperCase()}</span>
            <p style={{ fontFamily: LORA, fontSize: 13, color: 'rgba(15,21,35,0.55)', margin: '0 0 12px', lineHeight: 1.4 }}>{d.desc}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
              {d.cards.map(label => {
                const sel = (cards[d.key] || []).includes(label)
                return (
                  <button key={label} onClick={() => toggleCard(d.key, label)}
                    style={{ ...s.card, background: sel ? d.hex : 'transparent', color: sel ? '#fff' : INK, borderColor: sel ? 'transparent' : 'rgba(15,21,35,0.14)' }}
                  >{label}</button>
                )
              })}
            </div>
            <p style={{ fontFamily: SC, fontSize: 12, letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', margin: '0 0 10px' }}>Where are you right now?</p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <input type="range" min="0" max="10" step="1"
                value={scores[d.key] ?? 5}
                onChange={e => handleScore(d.key, e.target.value)}
                style={{ flex: 1, accentColor: d.hex, height: 4 }}
              />
              <div style={{ minWidth: 82 }}>
                <div style={{ fontFamily: SC, fontSize: 24, fontWeight: 600, color: d.hex, lineHeight: 1 }}>
                  {scores[d.key] ?? 5}<span style={{ fontFamily: SC, fontSize: 12, color: 'rgba(15,21,35,0.55)', letterSpacing: '0.1em' }}> *</span>
                </div>
                <div style={{ fontFamily: LORA, fontSize: 13, color: 'rgba(15,21,35,0.55)', lineHeight: 1.3, marginTop: 2 }}>
                  {SCALE_LABELS[scores[d.key] ?? 5]}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontFamily: LORA, fontSize: 12, color: 'rgba(15,21,35,0.55)' }}>Zero</span>
              <span style={{ fontFamily: LORA, fontSize: 12, color: 'rgba(15,21,35,0.55)' }}>The best there is</span>
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
// No progress bar. No overflow. Vertically centred.
// Planet wheel shows live civ domain scores from useCivDomainScores.
// Background colour is owned by the outer wrapper (via onPhase) so
// the light→dark shift covers the full viewport on desktop, not
// just the inner column.
function ZoomScreen({ scores, onNext, onPhase, isDesktop }) {
  const [phase, setPhase]           = useState('personal')
  const [planetVisible, setPlanetVisible] = useState(false)
  const { scores: civScores }       = useCivDomainScores()

  // Build the current scores object for WorldWheel
  const civCurrent = {}
  CIV_DOMAINS.forEach(d => {
    if (civScores?.[d.key] != null) civCurrent[d.key] = civScores[d.key]
  })

  function handleZoom() {
    setPhase('zooming')
    onPhase?.('zooming')
    setTimeout(() => { setPhase('planet'); setPlanetVisible(true); onPhase?.('planet') }, 1600)
  }

  const personalScale   = phase === 'zooming' ? 0.32 : 1
  const personalOpacity = phase === 'planet'  ? 0    : 1
  const planetOpacity   = phase === 'planet'  ? 1    : 0

  const stackHeight  = isDesktop ? 470 : 340
  const personalSize = isDesktop ? 250 : 180
  const planetSize   = isDesktop ? 290 : 210

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      background: 'transparent',
      padding: '24px 0 calc(40px + env(safe-area-inset-bottom))',
    }}>

      {/* Wheel stack — uses a fixed height to avoid layout shift */}
      <div style={{ position: 'relative', width: '100%', height: stackHeight, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Planet wheel — fades in */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: planetOpacity, transition: 'opacity 1.4s 0.4s',
          overflow: 'visible',
        }}>
          <WorldWheel
            dimensions={CIV_DIMS}
            current={civCurrent}
            size={planetSize}
            dark
          />
        </div>

        {/* Personal wheel — scales down and fades out */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${personalScale})`,
          transition: 'transform 1.6s cubic-bezier(0.6,0.01,0.2,1), opacity 0.5s 1.1s',
          opacity: personalOpacity,
          overflow: 'visible',
        }}>
          <WheelSVG scores={scores} size={personalSize} />
        </div>
      </div>

      {/* Text content — switches between phases */}
      <div style={{ padding: '0 32px', width: '100%', boxSizing: 'border-box' }}>

        {phase === 'personal' && (
          <div style={{ animation: 'fl-fadein 0.7s ease' }}>
            <p style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.5, margin: '0 0 6px', color: 'rgba(15,21,35,0.72)' }}>
              This is your map.
            </p>
            <p style={{ fontFamily: LORA, fontSize: 14, color: 'rgba(15,21,35,0.55)', margin: '0 0 28px' }}>
              Take a moment with it.
            </p>
            <button
              style={{ ...s.btn, background: 'transparent', border: '1px solid rgba(15,21,35,0.28)', color: INK }}
              onClick={handleZoom}
            >
              Next
            </button>
          </div>
        )}

        {phase === 'zooming' && (
          <div style={{ height: 96 }} />
        )}

        {phase === 'planet' && (
          <div style={{ opacity: planetVisible ? 1 : 0, transition: 'opacity 1s 0.4s', animation: planetVisible ? 'fl-fadein 1s ease' : 'none' }}>
            <p style={{ fontFamily: SC, fontSize: 12, letterSpacing: '0.2em', color: GC, textTransform: 'uppercase', margin: '0 0 10px' }}>
              Our planet
            </p>
            <p style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.4, margin: '0 0 14px', color: BG }}>
              The seven domains of life on Earth.
            </p>
            <p style={{ fontFamily: LORA, fontSize: 14, lineHeight: 1.65, margin: '0 0 10px', color: 'rgba(250,250,247,0.6)' }}>
              The current state of the planet is a reflection of the average of all the people on it.
            </p>
            <p style={{ fontFamily: SERIF, fontSize: 17, color: GC, margin: '0 0 28px', lineHeight: 1.4, fontStyle: 'italic' }}>
              Where would you like to see the world?
            </p>
            <button
              style={{ ...s.btn, background: BG, color: INK, display: 'block', margin: '0 auto', maxWidth: 280 }}
              onClick={onNext}
            >
              What future are you helping to build?
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fl-fadein {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}

// ── Screen 3: Placement ────────────────────────────────────────
function PlacementScreen({ vision, setVision, concerns, setConcerns, location, setLocation, scale, setScale, onFinish, saving }) {
  function setConcern(i, val) {
    setConcerns(prev => { const n = [...prev]; n[i] = val; return n })
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
    width: '100%', fontFamily: LORA, fontSize: 15, lineHeight: 1.6,
    color: INK, background: 'transparent', border: 'none',
    borderBottom: '1px solid rgba(15,21,35,0.18)', borderRadius: 0,
    padding: '8px 0', resize: 'none', outline: 'none', boxSizing: 'border-box', display: 'block',
  }
  const promptLabel = {
    fontFamily: SERIF, fontSize: 17, fontWeight: 400,
    color: 'rgba(15,21,35,0.55)', lineHeight: 1.5, display: 'block', marginBottom: 4,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '20px 24px 0' }}>

        {/* Vision */}
        <div style={{ marginBottom: 40 }}>
          <p style={s.eyebrow}>Your world</p>
          <span style={promptLabel}>I want to live in a world where...</span>
          <textarea rows={3} value={vision} onChange={e => setVision(e.target.value)}
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
                <textarea rows={2} value={c} onChange={e => setConcern(i, e.target.value)}
                  placeholder={i === 0 ? 'e.g. climate breakdown, inequality, loneliness...' : i === 1 ? 'Another issue...' : 'One more...'}
                  style={textareaBase}
                />
              </div>
              {i > 0 && (
                <button onClick={() => removeConcern(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(15,21,35,0.55)', fontSize: 20, padding: '6px 0', marginTop: 22, lineHeight: 1 }}
                  aria-label="Remove"
                >×</button>
              )}
            </div>
          ))}
          {concerns.length < 3 && (
            <button onClick={addConcern}
              style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.1em', color: GOLD, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Add another
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
        </div>

        {/* Scale */}
        <div style={{ marginBottom: 40 }}>
          <p style={s.eyebrow}>At what scale</p>
          <p style={{ fontFamily: LORA, fontSize: 14, color: 'rgba(15,21,35,0.55)', margin: '0 0 16px', lineHeight: 1.5 }}>Where do you want to show up?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SCALE_OPTIONS.map(o => (
              <button key={o.key} onClick={() => setScale(o.key)}
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

        <p style={{ fontFamily: LORA, fontSize: 13, color: 'rgba(15,21,35,0.55)', margin: '0 0 8px', lineHeight: 1.5 }}>
          * Provisional scores — your starting point. Begin NextU for your full map.
        </p>
        <div style={{ height: 24 }} />
      </div>

      <div style={s.foot}>
        <button
          style={{ ...s.btn, flex: 1, opacity: canFinish && !saving ? 1 : 0.38, cursor: canFinish && !saving ? 'pointer' : 'default' }}
          onClick={canFinish && !saving ? onFinish : undefined}
        >
          {saving ? 'Stepping in…' : 'Step into NextUs'}
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function FirstLight() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isDesktop = useDesktop()

  const [step, setStep]           = useState(0)
  const [zoomPhase, setZoomPhase] = useState('personal')
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

      await supabase.from('users').update({
        first_light_completed_at: new Date().toISOString(),
        welcome_scores:           scores,
        welcome_challenges:       cards,
      }).eq('id', user.id)

      const cp = {
        id:               user.id,
        welcome_vision:   vision.trim(),
        welcome_concerns: cleanConcerns,
        welcome_scale:    scale,
        updated_at:       new Date().toISOString(),
      }
      if (location?.id) cp.location_focus_id = location.id
      await supabase.from('contributor_profiles_beta').upsert(cp, { onConflict: 'id' })

      if (cleanConcerns.length > 0) {
        fetch('/api/firstlight-resolve-concerns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, vision: vision.trim(), concerns: cleanConcerns }),
        }).catch(() => {})
      }
    } catch (e) {
      console.error('First Light save error:', e)
    } finally {
      setSaving(false)
      navigate('/', { replace: true })
    }
  }

  const next = () => setStep(s => Math.min(s + 1, 3))
  const back = () => setStep(s => Math.max(s - 1, 0))

  // Progress: show on Personal (step 1) and Placement (step 3) only.
  // Cover and Zoom are full-bleed — no progress bar.
  const showProgress = step === 1 || step === 3

  // The viewport goes dark only once the zoom actually fires —
  // never while the personal map is still on screen. This keeps
  // desktop (where the column doesn't fill the viewport) from
  // showing a light strip on a dark page.
  const dark = step === 2 && zoomPhase !== 'personal'

  return (
    <div style={{ height: '100dvh', background: dark ? DARK : BG, overscrollBehavior: 'none', transition: 'background 0.9s 0.5s' }}>
      <div style={{ ...s.app, maxWidth: isDesktop ? 560 : 430 }}>
        {showProgress && <Progress step={step === 1 ? 0 : 1} total={2} />}
        {step === 0 && <CoverScreen onBegin={next} />}
        {step === 1 && <PersonalScreen scores={scores} setScores={setScores} cards={cards} setCards={setCards} onNext={next} onBack={back} />}
        {step === 2 && <ZoomScreen scores={scores} onNext={next} onPhase={setZoomPhase} isDesktop={isDesktop} />}
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
