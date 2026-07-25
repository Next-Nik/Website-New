// NextSteps — Stage 4 (Path)
// src/tools/nextsteps/stages/PathView.jsx
//
// The walking surface. Steps live INSIDE the current phase (Foundation v2.0.1
// §2.7): phases hold the journey, steps hold the walking.
//
// The loop this file closes (§2.8):
//   step done  →  phase re-read  →  next step appended,
//                 or exit condition true → phase cleared → next phase current
//
// The exit-condition check at the foot of this screen is asked OF the person
// and answered BY the person. Nothing here infers that a phase is finished from
// step counts, from elapsed time, or from a model's opinion. A phase clears
// because a human looked at a checkable statement and said yes. That is the
// only thing that makes the progress real rather than fabricated.
//
// Emotional endpoints: MOTION after a step, and after a phase clears, ARRIVAL
// THAT OPENS — a genuine threshold crossed, with the next stage already lit.

import { useState, useEffect, useRef } from 'react'
import { ROUTES } from '../../../constants/routes'
import { authedFetch } from '../../../lib/actorCallsClient'
import { RouteRail } from '../components/RouteRail'

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

export function PathView({ track, user, onBackToLoop, phases: initialPhases = [], onPhasesChanged }) {
  const [phases, setPhases] = useState(initialPhases || [])
  const currentPhase = phases.find((p) => p.state === 'current') || null

  // Only the steps of the phase the person is standing in. Steps from cleared
  // phases stay in the record but are not the work any more. Legacy tracks
  // (no route) have steps with phase_id null and show all of them.
  const stepsForPhase = (all) =>
    currentPhase
      ? (all || []).filter((s) => s.phase_id === currentPhase.id)
      : (all || []).filter((s) => !s.phase_id)

  const [steps, setSteps] = useState(stepsForPhase(track._steps || []))
  const [pathNote, setPathNote] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  // The exit-condition check, opened by the person, never pushed at them.
  const [checking, setChecking] = useState(false)
  const [cleared, setCleared] = useState(null)   // { next, complete } after a clear

  // If the current phase has no steps yet, generate the path inside it.
  // One generator, keyed on the phase, so clearing a phase and walking into the
  // next one produces exactly one generation and never a duplicate set. The ref
  // guard covers StrictMode's double-invoke in development.
  const generatedFor = useRef(new Set())
  useEffect(() => {
    if (cleared) return
    const key = currentPhase ? currentPhase.id : 'no-phase'
    if (generatedFor.current.has(key)) return
    if (steps && steps.length > 0) return
    generatedFor.current.add(key)
    generatePath()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase ? currentPhase.id : null, cleared])

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
      await authedFetch('/api/nextsteps-track', {
        method: 'PATCH',
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
      await authedFetch('/api/nextsteps-track', {
        method: 'PATCH',
        body: JSON.stringify({
          step_id: step.id,
          step_update: { state: 'done' },
        }),
      })
      setSteps((prev) =>
        prev.map((s) => (s.id === step.id ? { ...s, state: 'done' } : s))
      )
      // A completed step is the trigger for the re-read. With a route in place
      // the re-read asks two questions, not one: is there another step in this
      // phase, and is the phase itself finished? The second question is the
      // person's to answer, so we open the check rather than deciding.
      if (currentPhase) setChecking(true)
    } catch (err) {
      console.error('NextSteps markDone error:', err)
    }
  }

  // The person has answered the exit condition true.
  async function clearPhase() {
    if (!currentPhase) return
    try {
      const res = await authedFetch('/api/nextsteps-route', {
        method: 'POST',
        body: JSON.stringify({
          action: 'clear',
          track_id: track.id,
          phase_id: currentPhase.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not clear the phase.')
      setPhases(data.phases || [])
      setChecking(false)
      setCleared({ complete: !!data.route_complete })
      setSteps([])
      setPathNote(null)
      if (onPhasesChanged) onPhasesChanged(data.phases || [])
    } catch (err) {
      console.error('NextSteps clearPhase error:', err)
      setError(err.message || 'Could not clear the phase.')
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
            background: #4c6b45; color: #FFFFFF; border: none;
            border-radius: 10px; padding: 12px 24px;
            font-family: 'Cormorant SC', Georgia, serif;
            font-size: 0.85rem; letter-spacing: 0.14em;
            text-transform: uppercase; cursor: pointer;
          }
        `}</style>
      </div>
    )
  }

  // A phase just cleared. A genuine threshold, marked once and then opening
  // onto the next stage. Never finished-and-abandoned, and never a fanfare.
  if (cleared) {
    return (
      <div className="ns-path">
        <div className="ns-cleared">
          <p className="ns-cleared-lead">
            {cleared.complete
              ? 'That was the last phase. You walked the whole route.'
              : 'That phase is done. You said it was true, so it is.'}
          </p>
          <p className="ns-cleared-sub">
            {cleared.complete
              ? 'The route you ratified is behind you now. When something new starts pulling at you, start a track for it.'
              : 'The next phase is lit below. Nothing is expected of you today that is not in it.'}
          </p>
        </div>

        {phases.length > 0 && <RouteRail phases={phases} />}

        <div className="ns-path-footer">
          {!cleared.complete && (
            <button
              type="button"
              className="ns-step-btn ns-step-btn-primary"
              onClick={() => setCleared(null)}
            >
              Walk the next phase
            </button>
          )}
          <button type="button" className="ns-back-link" onClick={onBackToLoop}>
            Back to your tracks
          </button>
        </div>
        <PathStyles />
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

      {/* Where you are. Structural, not felt: the phase whose exit condition
          is not yet met. No dates, no duration, no percentage. */}
      {currentPhase && (
        <div className="ns-phase-head">
          <div className="ns-phase-eyebrow">
            Phase {currentPhase.position} of {phases.length}
          </div>
          <h2 className="ns-phase-name">{currentPhase.name}</h2>
          <p className="ns-phase-work">{currentPhase.work}</p>
          <p className="ns-phase-exit">
            <span className="ns-phase-exit-label">This phase ends when</span>{' '}
            {currentPhase.exit_condition}
          </p>
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

      {/* The exit-condition check. Offered, never pushed. The person is the
          only one who can answer it, and "not yet" is a completely ordinary
          answer that costs them nothing. */}
      {currentPhase && (
        <div className="ns-check">
          {!checking ? (
            <button type="button" className="ns-check-open" onClick={() => setChecking(true)}>
              Has this phase ended?
            </button>
          ) : (
            <div className="ns-check-open-panel">
              <p className="ns-check-question">{currentPhase.exit_condition}</p>
              <p className="ns-check-help">
                True today? Only you can answer that, and there is no wrong answer.
                If it is not true yet, you are simply still in this phase.
              </p>
              <div className="ns-check-actions">
                <button type="button" className="ns-step-btn ns-step-btn-primary" onClick={clearPhase}>
                  Yes, that is true
                </button>
                <button type="button" className="ns-step-btn ns-step-btn-ghost" onClick={() => setChecking(false)}>
                  Not yet
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* The whole journey, so the middle never goes back to being fog. */}
      {phases.length > 0 && <RouteRail phases={phases} />}

      <div className="ns-path-footer">
        <button type="button" className="ns-back-link" onClick={onBackToLoop}>
          Back to your tracks
        </button>
      </div>

      <PathStyles />
    </div>
  )
}

function PathStyles() {
  return (
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
          background: rgba(38,36,32,0.06);
          border-left: 3px solid #4c6b45;
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
          font-family: 'Lora', Georgia, serif;
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
          border: 1px solid rgba(38,36,32,0.20);
          border-radius: 14px;
          transition: border-color 0.2s, opacity 0.2s;
        }
        .ns-step-done {
          opacity: 0.7;
          border-color: rgba(38,36,32,0.55);
        }
        .ns-step-active {
          border-color: #4c6b45;
        }
        .ns-step-position {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(38,36,32,0.12);
          color: #262420;
          font-family: 'Lora', Georgia, serif;
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
        .ns-step-route { color: #262420; }
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
          background: #4c6b45;
          color: #FFFFFF;
        }
        .ns-step-btn-primary:hover { background: #B0801F; }
        .ns-step-btn-ghost {
          background: transparent;
          color: #262420;
          border: 1px solid rgba(38,36,32,0.40);
        }
        .ns-step-btn-ghost:hover { background: rgba(38,36,32,0.06); }
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
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
        }
        .ns-back-link {
          background: none;
          border: none;
          color: #262420;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.78rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 0;
        }
        .ns-back-link:hover { text-decoration: underline; }

        /* ── The phase you are standing in ─────────────────────────────── */
        .ns-phase-head {
          padding: 18px 20px;
          background: #FFFFFF;
          border: 1px solid rgba(38,36,32,0.20);
          border-top: 3px solid #4c6b45;
          border-radius: 14px;
        }
        .ns-phase-eyebrow {
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.74rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(38,36,32,0.68);
        }
        .ns-phase-name {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.55rem;
          font-weight: 400;
          line-height: 1.25;
          color: #0F1523;
          margin: 6px 0 0;
        }
        .ns-phase-work {
          font-family: 'Lora', Georgia, serif;
          font-size: 1rem;
          line-height: 1.65;
          color: rgba(38,36,32,0.78);
          margin: 10px 0 0;
        }
        .ns-phase-exit {
          font-family: 'Lora', Georgia, serif;
          font-size: 1rem;
          line-height: 1.55;
          color: #0F1523;
          margin: 14px 0 0;
          padding-top: 12px;
          border-top: 1px solid rgba(38,36,32,0.11);
        }
        .ns-phase-exit-label {
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(38,36,32,0.68);
        }

        /* ── The exit-condition check ──────────────────────────────────── */
        .ns-check-open {
          background: transparent;
          border: 1px solid rgba(38,36,32,0.20);
          border-radius: 10px;
          padding: 11px 20px;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.78rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #262420;
          cursor: pointer;
        }
        .ns-check-open:hover { background: rgba(38,36,32,0.06); }
        .ns-check-open-panel {
          padding: 18px 20px;
          background: #FFFFFF;
          border: 1px solid rgba(76,107,69,0.40);
          border-radius: 14px;
        }
        .ns-check-question {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.14rem;
          line-height: 1.5;
          color: #0F1523;
          margin: 0;
        }
        .ns-check-help {
          font-family: 'Lora', Georgia, serif;
          font-size: 0.94rem;
          line-height: 1.6;
          color: rgba(38,36,32,0.68);
          margin: 10px 0 0;
        }
        .ns-check-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        /* ── A phase cleared ───────────────────────────────────────────── */
        .ns-cleared {
          padding: 22px 24px;
          background: #FFFFFF;
          border: 1px solid rgba(38,36,32,0.20);
          border-top: 3px solid #4c6b45;
          border-radius: 14px;
        }
        .ns-cleared-lead {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.45rem;
          line-height: 1.35;
          color: #0F1523;
          margin: 0;
        }
        .ns-cleared-sub {
          font-family: 'Lora', Georgia, serif;
          font-size: 1rem;
          line-height: 1.65;
          color: rgba(38,36,32,0.78);
          margin: 12px 0 0;
          max-width: 56ch;
        }

        @media (max-width: 640px) {
          .ns-phase-name { font-size: 1.32rem; }
          .ns-cleared-lead { font-size: 1.22rem; }
        }
      `}</style>
  )
}
