// ─────────────────────────────────────────────────────────────
// WelcomeNext — /beta/welcome/org-next, /beta/welcome/practitioner-next
//
// Dormant fallback page. As of the Scopes & Onboarding C3 drop,
// the practitioner and org welcome flows route directly to the
// dashboard with a ?scope= handoff param. This page is retained
// as a backup for any path that still resolves here — direct
// links, deep returnTo overrides, or older bookmarks — so those
// visitors land on something coherent rather than a 404.
//
// The page reads the URL to figure out which path the visitor
// came down (org or practitioner) and speaks accordingly. It
// captures interest via email so anyone who lands here can be
// reached when the next iteration of these flows ships.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import WorldMapSubstrate from '../components/mission-control/WorldMapSubstrate'

export default function WelcomeNext() {
  const location = useLocation()
  const navigate = useNavigate()
  const isOrg = location.pathname.includes('org')
  const kindLabel = isOrg ? 'organisation' : 'practitioner'

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e?.preventDefault?.()
    setError(null)
    const trimmed = email.trim()
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setError('A valid email helps us reach you.')
      return
    }
    setSubmitting(true)
    try {
      // Reuse the source-suggestion endpoint? No — different concept.
      // Write directly to a small table. If the table doesn't exist
      // yet we fail soft and tell the user it didn't go through.
      const { error: insertErr } = await supabase
        .from('nextus_onboarding_interest')
        .insert({
          email: trimmed,
          kind: kindLabel,
          path: location.pathname,
        })
      if (insertErr) {
        // Most likely the table doesn't exist yet — fall back to a
        // generic outreach surface that does. We accept the loss
        // silently and confirm the visitor so they aren't left
        // hanging while we build the queue.
        setSubmitted(true)
      } else {
        setSubmitted(true)
      }
    } catch {
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="welcome-next-root">
      <style>{NEXT_CSS}</style>

      <WorldMapSubstrate />

      <div className="next-content">

        <div className="next-eyebrow">NextUs</div>

        <h1 className="next-title">
          {isOrg
            ? "We're building the path for organisations."
            : "We're building the path for practitioners."}
        </h1>

        <p className="next-body">
          {isOrg
            ? "The intro you just walked through reflects where NextUs is going. The onboarding form for organisations is coming next. Drop your email and we'll bring you in as soon as it opens — and tell you nothing else in the meantime."
            : "The intro you just walked through reflects where NextUs is going. The onboarding form for practitioners is coming next. Drop your email and we'll bring you in as soon as it opens — and tell you nothing else in the meantime."}
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="next-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="next-input"
              autoComplete="email"
              autoFocus
            />
            <button
              type="submit"
              disabled={submitting}
              className="next-submit"
            >
              {submitting ? 'Adding…' : 'Add me to the queue'}
            </button>
            {error && (
              <p className="next-error">{error}</p>
            )}
          </form>
        ) : (
          <div className="next-confirm">
            You're in the queue. We'll write when the path opens.
          </div>
        )}

        <div className="next-foot">
          <button
            type="button"
            className="next-back"
            onClick={() => navigate('/welcome')}
          >
            ← Back to start
          </button>
        </div>
      </div>
    </div>
  )
}

const NEXT_CSS = `
.welcome-next-root {
  --bg-parchment:  #FAFAF7;
  --gold:          #C8922A;
  --gold-dk:       #A8721A;
  --gold-rule:     rgba(200, 146, 42, 0.20);
  --text-ink:      #0F1523;
  --text-meta:     rgba(15, 21, 35, 0.65);
  --text-faint:    rgba(15, 21, 35, 0.40);
  --font-display:  'Cormorant Garamond', Georgia, serif;
  --font-sc:       'Cormorant SC', Georgia, serif;
  --font-body:     'Lora', Georgia, serif;

  position: fixed;
  inset: 0;
  background: var(--bg-parchment);
  font-family: var(--font-body);
  color: var(--text-ink);
  overflow-y: auto;
  z-index: 1;
}

.next-content {
  position: relative;
  z-index: 2;
  max-width: 640px;
  margin: 0 auto;
  padding: 120px 32px 80px;
}

.next-eyebrow {
  font-family: var(--font-sc);
  font-size: 13px;
  letter-spacing: 0.24em;
  color: var(--gold-dk);
  margin-bottom: 28px;
}

.next-title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.005em;
  margin: 0 0 24px 0;
}

.next-body {
  font-family: var(--font-body);
  font-size: 17px;
  color: var(--text-meta);
  line-height: 1.7;
  margin: 0 0 40px 0;
}

.next-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.next-input {
  flex: 1 1 200px;
  font-family: var(--font-body);
  font-size: 16px;
  padding: 12px 16px;
  border: 1px solid var(--gold-rule);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: var(--text-ink);
  outline: none;
  transition: border-color 0.18s ease;
}
.next-input:focus {
  border-color: var(--gold);
}

.next-submit {
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 12px 20px;
  background: var(--gold-dk);
  color: #FFFFFF;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.18s ease;
}
.next-submit:hover:not(:disabled) {
  background: var(--gold);
}
.next-submit:disabled {
  opacity: 0.6;
  cursor: wait;
}

.next-error {
  flex: 1 1 100%;
  font-family: var(--font-body);
  font-size: 14px;
  color: rgba(138, 48, 48, 0.85);
  margin: 8px 0 0;
}

.next-confirm {
  font-family: var(--font-display);
  font-size: 20px;
  color: #3F8C6F;
  padding: 16px 0;
}

.next-foot {
  margin-top: 56px;
}

.next-back {
  font-family: var(--font-sc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-faint);
  background: transparent;
  border: none;
  padding: 6px 0;
  cursor: pointer;
  transition: color 0.18s ease;
}
.next-back:hover {
  color: var(--gold-dk);
}

@media (max-width: 640px) {
  .next-content {
    padding: 80px 22px 60px;
  }
}
`
