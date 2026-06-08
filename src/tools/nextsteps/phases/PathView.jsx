// NextSteps — Phase 4 (Path)
// src/tools/nextsteps/phases/PathView.jsx
//
// Shows the ordered short path — 2 or 3 Steps, each routable. If the
// Track has no steps yet, this component triggers path generation. If
// it has steps, it displays them with state controls.
//
// Emotional endpoint: RELIEF, AND MOTION — the ocean is gone; there is
// a foot to put forward.

import { useState, useEffect } from 'react'
import { ROUTES } from '../../../constants/routes'

const ROUTE_LABELS = {
  atlas:       'Connect',
  nextmarket:  'Cast a vote',
  tool:        'Use this tool',
  facilitated: 'Work with Nik',
}

const STATE_LABELS = {
  suggested: 'Suggested',
  active:    'In progress',
  done:      'Done',
}

export function PathView({ track, user, onBackToLoop }) {
  const [steps, setSteps] = useState(track._steps || [])
  const [pathNote, setPathNote] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  // If the Track has no steps yet, generate the path.
  useEffect(() => {
    if (!steps || steps.length === 0) {
      generatePath()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generatePath() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/nextsteps-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_id: track.id,
          userId: user?.id ?? null,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `path ${res.status}`)
      }
      const { steps: newSteps, path_note } = await res.json()
      setSteps(newSteps || [])
      setPathNote(path_note || null)
    } catch (err) {
      console.error('NextSteps generatePath error:', err)
      setError(err.message || 'Could not generate the path.')
    } finally {
      setGenerating(false)
    }
  }

  async function activateStep(step) {
    // Mark the step 'active'. In a full build, this also opens a Target
    // Stretch on it. For now we flip state and surface a tooltip.
    try {
      await fetch('/api/nextsteps-track', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_id: step.id,
          step_update: { state: 'active' },
        }),
      })
      setSteps((prev) =>
        prev.map((s) => (s.id === step.id ? { ...s, state: 'active' } : s))
      )

      // Route the person to the step's destination.
      followRoute(step)
    } catch (err) {
      console.error('NextSteps activateStep error:', err)
    }
  }

  function followRoute(step) {
    switch (step.route_type) {
      case 'tool': {
        // Tool routes — translate slug to platform path.
        const toolPathMap = {
          'horizon-state':    ROUTES.horizonState,
          'map':              ROUTES.map,
          'purpose-piece':    ROUTES.purposePiece,
          'target-stretch':   ROUTES.targetSprint, // interim — execution table not yet renamed
          'horizon-practice': ROUTES.horizonPractice,
        }
        const path = toolPathMap[step.route_target]
        if (path) window.location.href = path
        break
      }
      case 'atlas': {
        // Atlas actor — slug-based detail page (existing pattern).
        if (step.route_target) {
          window.location.href = `/org/${step.route_target}`
        }
        break
      }
      case 'facilitated': {
        window.location.href = 'https://calendly.com/nikwood/talk-to-nik'
        break
      }
      case 'nextmarket': {
        // No NextMarket router yet — fall through to feed for now.
        window.location.href = '/feed'
        break
      }
      default:
        break
    }
  }

  async function markDone(step) {
    try {
      await fetch('/api/nextsteps-track', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_id: step.id,
          step_update: { state: 'done' },
        }),
      })
      setSteps((prev) =>
        prev.map((s) => (s.id === step.id ? { ...s, state: 'done' } : s))
      )
      // After a step completes, the Track is re-read — that's the loop.
      // For now we surface a toast-equivalent and let the user choose
      // to return to the Loop view.
    } catch (err) {
      console.error('NextSteps markDone error:', err)
    }
  }

  if (generating) {
    return (
      <div className="ns-path-loading">
        <p>Reading where you are and where the work lives… one moment.</p>
        <style>{`
          .ns-path-loading {
            text-align: center;
            padding: 60px 0;
            font-family: 'Lora', Georgia, serif;
            color: rgba(15,21,35,0.72);
            font-size: 1.05rem;
            font-style: italic;
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ns-path-error">
        <p>{error}</p>
        <button type="button" className="ns-cta-primary" onClick={generatePath}>
          Try again
        </button>
        <style>{`
          .ns-path-error {
            padding: 40px 24px;
            text-align: center;
            font-family: 'Lora', Georgia, serif;
            color: rgba(15,21,35,0.78);
          }
          .ns-path-error p { margin: 0 0 18px; }
          .ns-cta-primary {
            background: #C8922A; color: #FFFFFF; border: none;
            border-radius: 10px; padding: 12px 24px;
            font-family: 'Cormorant SC', Georgia, serif;
            font-size: 0.85rem; letter-spacing: 0.14em;
            text-transform: uppercase; cursor: pointer;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="ns-path">
      {/* Toward sentence carried through, smaller now — it's context */}
      {track.toward_sentence && (
        <div className="ns-path-toward">
          <span className="ns-path-toward-eyebrow">For:</span>{' '}
          <span className="ns-path-toward-text">{track.toward_sentence}</span>
        </div>
      )}

      {/* Path note — what the path adds up to */}
      {pathNote && <div className="ns-path-note">{pathNote}</div>}

      {/* The steps */}
      <ol className="ns-steps">
        {steps.map((step) => (
          <li key={step.id} className={`ns-step ns-step-${step.state}`}>
            <div className="ns-step-position">{step.position}</div>
            <div className="ns-step-body">
              <div className="ns-step-meta">
                <span className="ns-step-route">{ROUTE_LABELS[step.route_type] || step.route_type}</span>
                <span className={`ns-step-state ns-step-state-${step.state}`}>
                  {STATE_LABELS[step.state]}
                </span>
              </div>
              <div className="ns-step-description">{step.description}</div>
              <div className="ns-step-actions">
                {step.state === 'suggested' && (
                  <button
                    type="button"
                    className="ns-step-btn ns-step-btn-primary"
                    onClick={() => activateStep(step)}
                  >
                    Take this step
                  </button>
                )}
                {step.state === 'active' && (
                  <>
                    <button
                      type="button"
                      className="ns-step-btn ns-step-btn-primary"
                      onClick={() => followRoute(step)}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="ns-step-btn ns-step-btn-ghost"
                      onClick={() => markDone(step)}
                    >
                      Mark done
                    </button>
                  </>
                )}
                {step.state === 'done' && (
                  <span className="ns-step-done">✓ Done</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="ns-path-footer">
        <button type="button" className="ns-back-link" onClick={onBackToLoop}>
          Back to your tracks
        </button>
      </div>

      <style>{`
        .ns-path {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .ns-path-toward {
          font-family: 'Lora', Georgia, serif;
          font-size: 0.98rem;
          line-height: 1.6;
          color: rgba(15,21,35,0.78);
          padding: 14px 18px;
          background: rgba(168,114,26,0.06);
          border-left: 3px solid #C8922A;
          border-radius: 4px;
        }
        .ns-path-toward-eyebrow {
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.74rem;
          letter-spacing: 0.18em;
          color: rgba(15,21,35,0.55);
          text-transform: uppercase;
          margin-right: 6px;
        }
        .ns-path-note {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.35rem;
          line-height: 1.45;
          color: #0F1523;
          padding: 4px 0;
        }
        .ns-steps {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ns-step {
          display: flex;
          gap: 18px;
          padding: 20px;
          background: #FFFFFF;
          border: 1px solid rgba(168,114,26,0.20);
          border-radius: 14px;
          transition: border-color 0.2s, opacity 0.2s;
        }
        .ns-step-done {
          opacity: 0.7;
          border-color: rgba(168,114,26,0.10);
        }
        .ns-step-active {
          border-color: #C8922A;
        }
        .ns-step-position {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(168,114,26,0.12);
          color: #A8721A;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.3rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ns-step-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ns-step-meta {
          display: flex;
          gap: 12px;
          align-items: center;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.7rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .ns-step-route { color: #A8721A; }
        .ns-step-state { color: rgba(15,21,35,0.55); }
        .ns-step-state-active { color: #5B8C5A; }
        .ns-step-state-done { color: rgba(15,21,35,0.55); }
        .ns-step-description {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.04rem;
          line-height: 1.6;
          color: #0F1523;
        }
        .ns-step-actions {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }
        .ns-step-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.76rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          border: none;
        }
        .ns-step-btn-primary {
          background: #C8922A;
          color: #FFFFFF;
        }
        .ns-step-btn-primary:hover { background: #B0801F; }
        .ns-step-btn-ghost {
          background: transparent;
          color: #A8721A;
          border: 1px solid rgba(168,114,26,0.40);
        }
        .ns-step-btn-ghost:hover { background: rgba(168,114,26,0.06); }
        .ns-step-done {
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.78rem;
          letter-spacing: 0.14em;
          color: #5B8C5A;
          text-transform: uppercase;
        }
        .ns-path-footer {
          margin-top: 16px;
          padding-top: 20px;
          border-top: 1px solid rgba(15,21,35,0.08);
        }
        .ns-back-link {
          background: none;
          border: none;
          color: #A8721A;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.78rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 0;
        }
        .ns-back-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
