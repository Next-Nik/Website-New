// ─────────────────────────────────────────────────────────────
// WelcomeStart — /beta/welcome
//
// First impression of NextUs. A short choose-your-path landing
// that asks visitors why they're here, then routes them to the
// matching intro narrative.
//
// Three paths:
//   I'm here for myself          → /beta/welcome/self
//   I'm here for my organisation → /beta/welcome/org
//   I offer work others might    → /beta/welcome/practitioner
//
// Visual: Mission Control's substrate (star map + Dymaxion) sits
// underneath, animating into stillness as the page mounts. The
// three choices fade in over the settled substrate.
//
// The same substrate carries through the intro pages — this is
// the platform's first breath, not a separate page that ends
// when the intro begins.
//
// Returning visitors who land here while logged in are sent on
// to the dashboard. Returning logged-out visitors who already
// completed the intro are passed through to the dashboard via
// the gate; only first-time visitors should reach this page
// under normal navigation.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import WorldMapSubstrate from '../components/mission-control/WorldMapSubstrate'

export default function WelcomeStart() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [ready, setReady] = useState(false)

  // Already signed in? You don't need a first impression.
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [loading, user, navigate])

  // Trigger the choice fade-in after the substrate has settled.
  // Short delay — the substrate's intrinsic opacity animation
  // is fast; we let it land first.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600)
    return () => clearTimeout(t)
  }, [])

  if (loading || user) return null

  const choices = [
    {
      key:    'self',
      eyebrow:'For yourself',
      title:  "I'm here for me.",
      blurb:  "A clearer life, a clearer purpose, daily anchors that hold. Your seven domains, your direction.",
      href:   '/welcome/self',
    },
    {
      key:    'org',
      eyebrow:'For your organisation',
      title:  'I represent an organisation.',
      blurb:  "Get placed in the civilisational picture. Surface the people, partners and contributors who match what you do.",
      href:   '/welcome/org',
    },
    {
      key:    'practitioner',
      eyebrow:'For your craft',
      title:  'I offer work others might want.',
      blurb:  "Coach, therapist, facilitator, consultant. Make your offering visible to the people most likely to be served by it.",
      href:   '/welcome/practitioner',
    },
  ]

  return (
    <div className="welcome-start-root">
      <style>{START_CSS}</style>

      <WorldMapSubstrate />

      <div className={`start-content${ready ? ' ready' : ''}`}>
        <div className="start-eyebrow">NextUs</div>
        <h1 className="start-title">
          What brings you here?
        </h1>

        <div className="start-choices">
          {choices.map((c) => (
            <button
              key={c.key}
              type="button"
              className="start-choice"
              onClick={() => navigate(c.href)}
            >
              <div className="choice-eyebrow">{c.eyebrow}</div>
              <div className="choice-title">{c.title}</div>
              <div className="choice-blurb">{c.blurb}</div>
              <div className="choice-arrow" aria-hidden="true">→</div>
            </button>
          ))}
        </div>

        <div className="start-foot">
          <button
            type="button"
            className="start-skip"
            onClick={() => navigate('/login?redirect=/')}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────
// Scoped to .welcome-start-root. Mirrors the WelcomeOverlay
// design tokens so the starter and the intros feel like one
// continuous experience.

const START_CSS = `
.welcome-start-root {
  --bg-parchment:  #FAFAF7;
  --bg-ink:        #0F1523;
  --gold:          #6E7F5C;
  --gold-dk:       #26302A;
  --gold-rule:     rgba(110,127,92, 0.20);
  --text-ink:      #0F1523;
  --text-meta:     rgba(15, 21, 35, 0.65);
  --text-faint:    rgba(15, 21, 35, 0.40);
  --font-display:  'Fraunces', Georgia, serif;
  --font-sc:       'IBM Plex Mono', Georgia, serif;
  --font-body:     'Newsreader', Georgia, serif;

  position: fixed;
  inset: 0;
  background: var(--bg-parchment);
  font-family: var(--font-body);
  color: var(--text-ink);
  overflow-y: auto;
  z-index: 1;
}

.start-content {
  position: relative;
  z-index: 2;
  max-width: 920px;
  margin: 0 auto;
  padding: 100px 32px 80px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 1.4s ease-out 0.2s, transform 1.4s ease-out 0.2s;
}
.start-content.ready {
  opacity: 1;
  transform: translateY(0);
}

.start-eyebrow {
  font-family: var(--font-sc);
  font-size: 12px;
  letter-spacing: 0.24em;
  color: var(--gold-dk);
  margin-bottom: 32px;
}

.start-title {
  font-family: var(--font-display);
  font-size: clamp(40px, 6vw, 64px);
  font-weight: 400;
  color: var(--text-ink);
  line-height: 1.05;
  letter-spacing: -0.01em;
  margin: 0 0 56px 0;
}

.start-choices {
  display: grid;
  gap: 16px;
}

.start-choice {
  position: relative;
  text-align: left;
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--gold-rule);
  border-radius: 18px;
  padding: 28px 32px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
  font-family: inherit;
  color: inherit;
}
.start-choice:hover {
  border-color: var(--gold);
  background: rgba(255, 255, 255, 0.82);
}
.start-choice:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}

.choice-eyebrow {
  font-family: var(--font-sc);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--gold-dk);
  margin-bottom: 10px;
}

.choice-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 500;
  color: var(--text-ink);
  line-height: 1.1;
  letter-spacing: -0.005em;
  margin-bottom: 8px;
}

.choice-blurb {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--text-meta);
  line-height: 1.6;
  margin: 0;
  padding-right: 40px;
}

.choice-arrow {
  position: absolute;
  top: 50%;
  right: 28px;
  transform: translateY(-50%);
  font-family: var(--font-display);
  font-size: 26px;
  color: var(--gold-dk);
  transition: transform 0.2s ease;
}
.start-choice:hover .choice-arrow {
  transform: translateY(-50%) translateX(4px);
}

.start-foot {
  margin-top: 48px;
  text-align: center;
}

.start-skip {
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--text-faint);
  background: transparent;
  border: none;
  padding: 8px 14px;
  cursor: pointer;
  transition: color 0.18s ease;
}
.start-skip:hover {
  color: var(--gold-dk);
}

@media (max-width: 640px) {
  .start-content {
    padding: 64px 20px 60px;
  }
  .start-title {
    margin-bottom: 36px;
  }
  .start-choice {
    padding: 22px 22px 24px;
  }
  .choice-blurb {
    padding-right: 24px;
  }
  .choice-arrow {
    right: 18px;
    font-size: 22px;
  }
}
`
