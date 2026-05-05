// ─────────────────────────────────────────────────────────────
// WelcomeOverlay.jsx
//
// The Kin narrative arrival overlay. Ten beats across four acts:
//   Act 1 (parchment): empty wheel → populate → where Kin wants to go
//   Act 2 (dark):      civ wheel spin → domain → scale → archetype → what it gives
//   Act 3 (parchment): convergence — both moves shown side by side
//   Closing:           "Your turn." → CTA to login
//
// Tightenings vs prototype (per Welcome plan §2):
//   • Tagline upright, not italic. Italic reserved for user's words
//     reflected back; Kin is a worked example, not the user.
//   • Top nav strip with "Sign in" + "Skip ahead" — login is the real
//     skip; in-narrative skip jumps to closing.
//   • Closing primary CTA: "Sign in to begin your own" → /login.
//   • Mounts as its own page; no fake dashboard underneath.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import WelcomeWheel from './WelcomeWheel'

// ─── Beat content renderers ────────────────────────────────
function BeatContent({ content }) {
  if (!content) return null

  if (content.kind === 'simple') {
    return (
      <>
        <div className="beat-label">{content.label}</div>
        <div
          className="beat-body"
          // Body copy contains <span class="accent">…</span> markup.
          // Trusted source (constants in WelcomeBeats.js); no user input.
          dangerouslySetInnerHTML={{ __html: content.body }}
        />
      </>
    )
  }

  if (content.kind === 'act3') {
    return (
      <>
        <div className="beat-act3-frame">
          <div className="beat-act3-frame-eyebrow">{content.frameEyebrow}</div>
          <div className="beat-act3-frame-body">{content.frameBody}</div>
        </div>
        <div className="beat-act3-grid">
          {(content.cards || []).map((card, i) => (
            <div className="next-card" key={i}>
              <div className="beat-act3-card-label">{card.label}</div>
              <div className="next-card-eyebrow">{card.eyebrow}</div>
              <div className="next-card-body">{card.body}</div>
              <div className="next-card-meta">{card.meta}</div>
            </div>
          ))}
        </div>
      </>
    )
  }

  if (content.kind === 'closing') {
    return (
      <div className="closing-stage">
        <p className="closing-handoff" dangerouslySetInnerHTML={{ __html: content.handoff }} />
        <h2 className="closing-line">{content.headline}</h2>
        {content.subheadline && (
          <p
            className="closing-subheadline"
            dangerouslySetInnerHTML={{ __html: content.subheadline }}
          />
        )}
      </div>
    )
  }

  return null
}

// ─── Progress dots: 3 + 5 + 1 + 1 with gaps between groups ────
function ProgressDots({ activeIdx }) {
  const groups = [3, 5, 1, 1]
  const dots = []
  let dotIdx = 0
  groups.forEach((count, gIdx) => {
    for (let i = 0; i < count; i++) {
      const isActive = dotIdx === activeIdx
      dots.push(
        <div
          key={`d-${dotIdx}`}
          className={`progress-dot${isActive ? ' active' : ''}`}
        />
      )
      dotIdx++
    }
    if (gIdx < groups.length - 1) {
      dots.push(<div key={`gap-${gIdx}`} className="progress-dot gap" />)
    }
  })
  return <div className="progress">{dots}</div>
}

// ─── Top nav strip: Sign in (real skip) + Skip ahead (in-narrative) ─
function TopNavStrip({ onSignIn, onSkipAhead, dark }) {
  return (
    <div className={`top-nav-strip${dark ? ' dark' : ''}`}>
      <button className="top-nav-link" onClick={onSignIn}>
        Sign in
      </button>
      <button className="top-nav-link top-nav-skip" onClick={onSkipAhead}>
        Skip ahead
      </button>
    </div>
  )
}

/**
 * @typedef {Object} WelcomeOverlayProps
 * @property {() => void} [onDismiss]  Called when the user finishes or skips. Defaults to navigating to /login.
/**
 * @typedef {Object} WelcomeOverlayProps
 * @property {Array} beats              The narrative beats. Required.
 * @property {Object} headers           Map of header key → { eyebrow, meet, name, tagline }. Required.
 * @property {Object} [act3Header]      Optional override for the act-3 header { eyebrow, meet, name }.
 * @property {Object} selfData          Wheel data for kind='self' beats (labels, keys, horizons, current, tierColor).
 * @property {Object} civData           Wheel data for kind='civ' beats (domains, primarySlug, optional scaleRings).
 * @property {() => void} [onDismiss]   Called when the user finishes or skips. Defaults to navigating to /login.
 * @property {string} [returnTo]        Where to send the user after sign-in. Default '/beta/dashboard'.
 * @property {string} [closingCta]      Closing-beat button label. Default "Sign in to begin".
 */

/**
 * The full welcome overlay. Narrative-agnostic — pass it any beats
 * and headers and it'll run the standard four-act flow with header
 * swap, theme swap, keyboard nav, progress.
 *
 * @param {WelcomeOverlayProps} props
 */
export default function WelcomeOverlay({
  beats,
  headers,
  act3Header,
  selfData,
  civData,
  onDismiss,
  returnTo = '/beta/dashboard',
  closingCta = 'Sign in to begin',
}) {
  const navigate = useNavigate()
  const [beatIdx, setBeatIdx] = useState(0)
  const [fading, setFading] = useState(false)
  // Direction of the most recent navigation (forward/back). Used to
  // suppress re-triggering animations when the user steps backwards.
  const [backwards, setBackwards] = useState(false)
  const dismissedRef = useRef(false)

  const beat = beats[beatIdx]

  // Wheel mode normalisation for back-nav: animations don't replay
  // backwards. They settle to the static equivalent.
  let wheelMode = beat.wheelMode || 'static'
  if (backwards) {
    if (wheelMode === 'populate')     wheelMode = 'static'
    if (wheelMode === 'empty-spin')   wheelMode = 'empty'
    if (wheelMode === 'place-domain') wheelMode = 'static'
    // scale-zoom is its own settled state, leave it
  }

  const goToLogin = useCallback((withReturn) => {
    const target = withReturn
      ? `/login?redirect=${encodeURIComponent(returnTo)}`
      : '/login'
    navigate(target)
  }, [navigate, returnTo])

  const handleAdvance = useCallback(() => {
    if (dismissedRef.current) return
    if (beatIdx >= beats.length - 1) {
      // Final beat: closing button → sign in
      dismissedRef.current = true
      if (onDismiss) onDismiss()
      else goToLogin(true)
      return
    }
    setFading(true)
    setTimeout(() => {
      setBackwards(false)
      setBeatIdx(i => i + 1)
      setFading(false)
    }, 250)
  }, [beatIdx, beats.length, onDismiss, goToLogin])

  const handleBack = useCallback(() => {
    if (beatIdx <= 0) return
    setFading(true)
    setTimeout(() => {
      setBackwards(true)
      setBeatIdx(i => i - 1)
      setFading(false)
    }, 250)
  }, [beatIdx])

  const handleSkipAhead = useCallback(() => {
    setFading(true)
    setTimeout(() => {
      setBackwards(false)
      setBeatIdx(beats.length - 1)
      setFading(false)
    }, 250)
  }, [beats.length])

  const handleSignIn = useCallback(() => {
    goToLogin(true)
  }, [goToLogin])

  // Keyboard nav: space/right/enter advance, left back, esc skips ahead
  useEffect(() => {
    const handler = (e) => {
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        handleAdvance()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleBack()
      } else if (e.key === 'Escape') {
        handleSkipAhead()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleAdvance, handleBack, handleSkipAhead])

  // Header content per beat
  let headerNode = null
  if (beat.header === 'act3') {
    const a3 = act3Header || {}
    headerNode = (
      <div className="header-area">
        <div className="eyebrow">{a3.eyebrow}</div>
        <h1 className="kin-name">
          {a3.meet && <span className="meet">{a3.meet}</span>}
          <span>{a3.name}</span>
        </h1>
      </div>
    )
  } else if (beat.header) {
    const h = headers[beat.header]
    headerNode = (
      <div className="header-area">
        <div className="eyebrow">{h.eyebrow}</div>
        <h1 className="kin-name">
          {h.meet && <span className="meet">{h.meet}</span>}
          <span>{h.name}</span>
        </h1>
        {h.tagline && <p className="kin-tagline">{h.tagline}</p>}
      </div>
    )
  }

  const isClosing = beat.id === 'closing'
  const cardClass = `overlay-card${beat.dark ? ' dark' : ''}`

  return (
    <div className="welcome-root">
      <style>{WELCOME_CSS}</style>

      <TopNavStrip
        onSignIn={handleSignIn}
        onSkipAhead={handleSkipAhead}
        dark={!!beat.dark}
      />

      <div className="overlay">
        <div className={cardClass}>
          <button
            className="back-control"
            onClick={handleBack}
            disabled={beatIdx === 0}
            aria-label="Previous beat"
          >
            ← Back
          </button>

          {headerNode}

          {beat.wheel && (
            <div className="wheel-area">
              {/* key forces remount when mode changes — clean teardown of imperative SVG */}
              <WelcomeWheel
                key={`${beat.id}-${wheelMode}`}
                kind={beat.wheel}
                mode={wheelMode}
                selfData={selfData}
                civData={civData}
              />
            </div>
          )}

          <div className={`beat-content beat-stage${fading ? ' fading' : ''}`}>
            <BeatContent content={beat.content} />
          </div>

          <div className="controls">
            <ProgressDots activeIdx={beatIdx} />
            <button
              className={`next-btn${isClosing ? ' primary' : ''}`}
              onClick={handleAdvance}
            >
              {isClosing ? closingCta : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────
// Single block, scoped by the .welcome-root wrapper. Mirrors the
// prototype's CSS with two corrections:
//   1. .kin-tagline drops font-style: italic.
//   2. .top-nav-strip is new — sits above the overlay card.
const WELCOME_CSS = `
.welcome-root {
  --bg-parchment:  #FAFAF7;
  --bg-page:       #FFFFFF;
  --bg-ink:        #0F1523;
  --gold:          #C8922A;
  --gold-dk:       #A8721A;
  --gold-rule:     rgba(200, 146, 42, 0.20);
  --text-ink:      #0F1523;
  --text-meta:     rgba(15, 21, 35, 0.72);
  --text-faint:    rgba(15, 21, 35, 0.40);
  --text-white:    #FFFFFF;
  --font-display:  'Cormorant Garamond', Georgia, serif;
  --font-sc:       'Cormorant SC', Georgia, serif;
  --font-body:     'Lora', Georgia, serif;

  position: fixed;
  inset: 0;
  background: var(--bg-parchment);
  font-family: var(--font-body);
  color: var(--text-ink);
  font-size: 17px;
  line-height: 1.65;
  overflow: hidden;
  z-index: 1;
}

/* Top nav strip — Sign in (real skip) + Skip ahead (narrative skip) */
.top-nav-strip {
  position: fixed;
  top: 0; left: 0; right: 0;
  display: flex;
  justify-content: space-between;
  padding: 18px 28px;
  z-index: 200;
  pointer-events: none;
}
.top-nav-strip > * { pointer-events: auto; }
.top-nav-link {
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--text-ink);
  background: transparent;
  border: none;
  padding: 6px 10px;
  cursor: pointer;
  opacity: 0.72;
  transition: color 0.18s, opacity 0.18s;
}
.top-nav-link:hover { color: var(--gold-dk); opacity: 1; }
.top-nav-strip.dark .top-nav-link { color: var(--text-white); }
.top-nav-strip.dark .top-nav-link:hover { color: var(--gold); }

.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 24px 24px;
}

.overlay-card {
  background: var(--bg-parchment);
  color: var(--text-ink);
  border: 1px solid var(--gold-rule);
  border-radius: 18px;
  width: 100%;
  max-width: 760px;
  height: 86vh;
  max-height: 820px;
  overflow: hidden;
  padding: 44px 52px 14px;
  box-shadow: 0 24px 80px rgba(15,21,35,0.18);
  position: relative;
  display: flex;
  flex-direction: column;
  transition: background 0.9s ease-out, color 0.9s ease-out, border-color 0.9s ease-out;
}
@media (max-width: 640px) {
  .overlay-card { padding: 36px 26px 14px; height: 88vh; }
}

.overlay-card.dark {
  background: var(--bg-ink);
  color: var(--text-white);
  border-color: rgba(200, 146, 42, 0.28);
}
.overlay-card.dark .eyebrow,
.overlay-card.dark .closing-eyebrow,
.overlay-card.dark .beat-label,
.overlay-card.dark .beat-act3-frame-eyebrow,
.overlay-card.dark .next-card-eyebrow { color: var(--gold); }
.overlay-card.dark .kin-name,
.overlay-card.dark .closing-line,
.overlay-card.dark .beat-body,
.overlay-card.dark .next-card-body,
.overlay-card.dark .closing-handoff,
.overlay-card.dark .kin-tagline,
.overlay-card.dark .next-card-meta,
.overlay-card.dark .beat-act3-frame-body,
.overlay-card.dark .beat-act3-card-label { color: var(--text-white); }
.overlay-card.dark .beat-body,
.overlay-card.dark .next-card-body,
.overlay-card.dark .beat-act3-frame-body {
  font-weight: 300; font-size: 19px; line-height: 1.6;
}
.overlay-card.dark .kin-tagline { font-weight: 300; font-size: 20px; }
.overlay-card.dark .kin-name .meet { color: var(--gold); }
.overlay-card.dark .next-card {
  background: rgba(255,255,255,0.04);
  border-color: rgba(200,146,42,0.32);
}
.overlay-card.dark .controls {
  border-top-color: rgba(200,146,42,0.32);
  background: linear-gradient(to bottom, rgba(15,21,35,0) 0%, var(--bg-ink) 30%);
}
.overlay-card.dark .back-control { color: var(--text-white); }
.overlay-card.dark .back-control:hover { color: var(--gold); }
.overlay-card.dark .next-btn {
  background: var(--bg-ink);
  color: var(--gold);
  border-color: var(--gold);
}
.overlay-card.dark .next-btn:hover {
  background: var(--gold);
  color: var(--bg-ink);
}
.overlay-card.dark .label { fill: var(--text-white); opacity: 0.72; }
.overlay-card.dark .label-active { fill: var(--gold); opacity: 1; }
.overlay-card.dark .beat-body .accent { color: var(--gold); }
.overlay-card.dark .progress-dot { background: rgba(200,146,42,0.32); }
.overlay-card.dark .progress-dot.active { background: var(--gold); }

/* Back control (top-left of card) */
.back-control {
  position: absolute;
  top: 16px; left: 18px;
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--text-meta);
  background: transparent;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  transition: color 0.18s, opacity 0.18s;
  z-index: 5;
}
.back-control:hover { color: var(--gold-dk); }
.back-control[disabled] { opacity: 0.40; cursor: not-allowed; }

/* Header */
.header-area { text-align: center; margin-bottom: 18px; flex-shrink: 0; }
.eyebrow {
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: var(--gold-dk);
  text-transform: uppercase;
  margin-bottom: 14px;
  transition: color 0.9s;
}
.kin-name {
  font-family: var(--font-display);
  font-size: 44px;
  font-weight: 300;
  color: var(--text-ink);
  margin-bottom: 8px;
  transition: color 0.9s;
  line-height: 1.1;
}
.kin-name .meet {
  display: block;
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.24em;
  color: var(--gold-dk);
  text-transform: uppercase;
  margin-bottom: 8px;
  transition: color 0.9s;
}
/* Tagline upright. Italic reserved per Design System v3 §3 for
   user words reflected; Kin is a worked example, not the user. */
.kin-tagline {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 400;
  color: var(--text-meta);
  margin: 0 auto;
  max-width: 520px;
  line-height: 1.5;
  transition: color 0.9s;
}

.wheel-area {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  margin-bottom: 14px;
}

.beat-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 0 4px;
  min-height: 100px;
}
.beat-content::-webkit-scrollbar { width: 6px; }
.beat-content::-webkit-scrollbar-thumb { background: var(--gold-rule); border-radius: 3px; }

.beat-label {
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: var(--gold-dk);
  text-transform: uppercase;
  margin-bottom: 10px;
  transition: color 0.9s;
}
.beat-body {
  font-family: var(--font-body);
  font-size: 18px;
  font-weight: 400;
  line-height: 1.65;
  color: var(--text-ink);
  transition: color 0.9s;
}
.beat-body .accent { color: var(--gold-dk); }

/* Act 3 cards */
.next-card {
  background: var(--bg-page);
  border: 1px solid var(--gold-rule);
  border-radius: 12px;
  padding: 16px 18px;
  transition: background 0.9s, border-color 0.9s;
}
.next-card-eyebrow {
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.20em;
  color: var(--gold-dk);
  text-transform: uppercase;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.next-card-eyebrow::before {
  content: '';
  width: 6px; height: 6px;
  background: var(--gold);
  border-radius: 50%;
  flex-shrink: 0;
}
.next-card-body {
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.55;
  color: var(--text-ink);
}
.next-card-meta {
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.14em;
  color: var(--text-meta);
  text-transform: uppercase;
  margin-top: 8px;
}

.beat-act3-frame { margin-bottom: 22px; }
.beat-act3-frame-eyebrow {
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: var(--gold-dk);
  text-transform: uppercase;
  margin-bottom: 12px;
}
.beat-act3-frame-body {
  font-family: var(--font-body);
  font-size: 18px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-ink);
}
.beat-act3-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 6px;
}
@media (max-width: 540px) {
  .beat-act3-grid { grid-template-columns: 1fr; }
}
.beat-act3-card-label {
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: var(--text-meta);
  text-transform: uppercase;
  margin-bottom: 8px;
}

/* Closing */
.closing-stage {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 16px 0 12px;
}
.closing-handoff {
  font-family: var(--font-body);
  font-size: 18px;
  font-weight: 400;
  color: var(--text-meta);
  text-align: center;
  margin-bottom: 28px;
  line-height: 1.5;
  max-width: 540px;
  margin-left: auto;
  margin-right: auto;
}
.closing-line {
  font-family: var(--font-display);
  font-size: 52px;
  font-weight: 300;
  line-height: 1.1;
  color: var(--text-ink);
  text-align: center;
  margin-bottom: 18px;
}
.closing-line .accent { color: var(--gold-dk); font-weight: 400; }
.closing-subheadline {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 300;
  color: var(--text-ink);
  text-align: center;
  margin-bottom: 16px;
  line-height: 1.3;
}
.closing-subheadline .accent { color: var(--gold-dk); font-weight: 400; }

.beat-stage { opacity: 1; transition: opacity 0.4s ease-out; }
.beat-stage.fading { opacity: 0; }

/* Controls */
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0 6px;
  border-top: 1px solid var(--gold-rule);
  flex-shrink: 0;
  margin-top: 8px;
  transition: border-top-color 0.9s, background 0.9s;
  background: linear-gradient(to bottom, rgba(250,250,247,0) 0%, var(--bg-parchment) 30%);
}
.progress { display: flex; gap: 5px; align-items: center; }
.progress-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--gold-rule);
  transition: background 0.3s, transform 0.3s;
}
.progress-dot.active {
  background: var(--gold-dk);
  transform: scale(1.4);
}
.progress-dot.gap { width: 10px; background: transparent; }

.next-btn {
  font-family: var(--font-sc);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--gold-dk);
  background: var(--bg-page);
  border: 1.5px solid var(--gold);
  border-radius: 40px;
  padding: 11px 28px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, transform 0.18s;
  box-shadow: 0 2px 8px rgba(200, 146, 42, 0.10);
}
.next-btn:hover { background: var(--gold); color: white; transform: translateY(-1px); }
.next-btn.primary { background: var(--gold); color: white; }
.next-btn.primary:hover { background: var(--gold-dk); }

/* SVG wheel pieces */
.horizon-spoke { stroke: rgba(200,146,42,0.45); stroke-width: 1; }
.horizon-ring  { fill: none; stroke: rgba(200,146,42,0.32); stroke-width: 1; stroke-dasharray: 3 3; }
.current-poly  { fill: rgba(200,146,42,0.14); stroke: var(--gold); stroke-width: 1.5; stroke-linejoin: round; }
.label {
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.16em;
  fill: var(--text-meta);
  text-transform: uppercase;
  transition: fill 0.9s, opacity 0.9s;
}
.label-active { fill: var(--gold-dk); }
.civ-marker { transition: opacity 0.5s, r 0.5s; }
.scale-label {
  font-family: var(--font-sc);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  fill: rgba(200,146,42,0.55);
  text-transform: uppercase;
}
.scale-label-lit { fill: var(--gold); font-size: 12px; }
.overlay-card.dark .scale-label { fill: rgba(255,255,255,0.55); }
.overlay-card.dark .scale-label-lit { fill: var(--gold); }

@keyframes civSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes vertexFlash {
  0%   { r: 0; opacity: 0; }
  35%  { r: 9; opacity: 1; }
  65%  { r: 4; opacity: 1; }
  100% { r: 4; opacity: 1; }
}
.self-vert.populating { animation: vertexFlash 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
@keyframes civMarkerFlash {
  0%   { r: 0; opacity: 0; }
  35%  { opacity: 1; }
  65%  { opacity: 1; }
  100% { opacity: 1; }
}
.civ-marker.populating { animation: civMarkerFlash 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
`
