// NextSteps — the ratification moment
// src/tools/nextsteps/stages/RouteDraft.jsx
//
// (Foundation v2.0.1 §3.3, §2.5, and the Sacred Limit "never imposes the path.")
//
//   "The draft is presented as a proposal, visibly editable, never as an
//    assessment, a prescription, or the system's verdict on their life.
//    Editing must be as easy as reading. The moment succeeds when the person
//    changes something: an edited path is an owned path."
//
// That sentence is the entire specification for this screen, and it is why
// there is no "Edit" button anywhere in this file. A pencil icon makes editing
// a second action behind a first one, which makes reading the default and
// accepting the path of least resistance. Instead every field IS a field: the
// name, the work and the exit condition are live text inputs from the moment
// the screen loads, styled to read as prose until you touch them. Changing a
// word costs exactly one click, which is the same as reading costs.
//
// Deferral risk is real and we do not solve it by nagging. There is no
// "are you sure?" and no gate that forces an edit before ratifying: forcing an
// edit would be imposing the path by a different door. What we do instead is
// make the affordances loud, and record route_edits honestly so that if people
// really are deferring rather than owning, that shows up in the data and the
// Evolution Protocol can act on it.

import { useState, useRef } from 'react'
import { authedFetch } from '../../../lib/actorCallsClient'

export function RouteDraft({ track, phases: initial, routeNote, onRatified, onBack }) {
  const [phases, setPhases] = useState(initial || [])
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState(null)
  const [touched, setTouched] = useState(false)
  // Structural edits (reorder / add / cut) run against a unique
  // (track_id, position) constraint, so two of them in flight at once collide
  // and one silently loses, stranding a phase at a parked position. The
  // controls are disabled while one is running.
  const [moving, setMoving] = useState(false)

  // What the server currently holds for each field. Comparing a blur against
  // the `initial` prop instead meant that tabbing back through a field you had
  // already edited counted as another edit every time. route_edits is the
  // signal the Evolution Protocol reads to decide whether people are deferring
  // rather than owning their route, so inflating it with tab-throughs would
  // make that signal lie in the one direction that matters.
  const saved = useRef(null)
  if (saved.current === null) {
    saved.current = {}
    for (const p of initial || []) {
      saved.current[p.id] = { name: p.name, work: p.work, exit_condition: p.exit_condition }
    }
  }

  // ── editing ────────────────────────────────────────────────────────────
  // Local state updates immediately; the save goes on blur. Typing never
  // waits for a network round trip.
  function setField(phaseId, field, value) {
    setPhases((prev) => prev.map((p) => (p.id === phaseId ? { ...p, [field]: value } : p)))
  }

  async function saveField(phase, field, value) {
    const v = (value || '').trim()
    const last = saved.current[phase.id] || {}
    if (last[field] === v) return
    // An empty field is not a save, and it is not an edit either. Put the last
    // good text back rather than leaving the person looking at a blank they
    // think is stored.
    if (!v) {
      setField(phase.id, field, last[field] ?? '')
      return
    }
    try {
      const res = await authedFetch('/api/nextsteps-route', {
        method: 'PATCH',
        body: JSON.stringify({ phase_id: phase.id, phase_update: { [field]: v } }),
      })
      // fetch does not reject on 4xx or 5xx. Without this check a failed save
      // was indistinguishable from a good one: the text stayed on screen, the
      // footer said "Your changes are saved", and the words quietly reverted
      // at ratification when the server rows came back.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'That edit did not save.')
      }
      saved.current[phase.id] = { ...last, [field]: v }
      setTouched(true)
      setError(null)
    } catch (err) {
      console.error('NextSteps saveField error:', err)
      setError('One of your edits did not save. Check the wording below before you ratify.')
    }
  }

  // Every structural edit re-syncs from the server's own answer, and rolls the
  // optimistic change back if the write did not land. Showing a phase as moved
  // or gone when the database disagrees is worse than showing nothing, because
  // the next thing the person does is ratify what they think they are looking at.
  async function structural(optimistic, request, label) {
    if (moving) return
    setMoving(true)
    const before = phases
    if (optimistic) setPhases(optimistic)
    try {
      const res = await request()
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Could not ${label}.`)
      if (Array.isArray(data.phases)) {
        setPhases(data.phases)
        for (const p of data.phases) {
          saved.current[p.id] = { name: p.name, work: p.work, exit_condition: p.exit_condition }
        }
      }
      setTouched(true)
      setError(null)
    } catch (err) {
      console.error(`NextSteps ${label} error:`, err)
      setPhases(before)
      setError(err.message || `Could not ${label}. Nothing has changed.`)
    } finally {
      setMoving(false)
    }
  }

  async function reorder(phaseId, direction) {
    const idx = phases.findIndex((p) => p.id === phaseId)
    const swap = idx + direction
    if (idx < 0 || swap < 0 || swap >= phases.length) return
    const next = phases.slice()
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    const renumbered = next.map((p, i) => ({ ...p, position: i + 1 }))
    await structural(renumbered, () =>
      authedFetch('/api/nextsteps-route', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reorder',
          track_id: track.id,
          order: renumbered.map((p) => p.id),
        }),
      }), 'move that phase')
  }

  async function removePhase(phaseId) {
    if (phases.length <= 1) return
    const keep = phases.filter((p) => p.id !== phaseId).map((p, i) => ({ ...p, position: i + 1 }))
    await structural(keep, () =>
      authedFetch(`/api/nextsteps-route?phase_id=${phaseId}`, { method: 'DELETE' }),
      'cross that phase out')
  }

  async function addPhase(afterId) {
    if (phases.length >= 6) return
    await structural(null, () =>
      authedFetch('/api/nextsteps-route', {
        method: 'POST',
        body: JSON.stringify({ action: 'add', track_id: track.id, after: afterId }),
      }), 'add a phase')
  }

  async function ratify() {
    setBusy(true)
    setError(null)
    try {
      const res = await authedFetch('/api/nextsteps-route', {
        method: 'POST',
        body: JSON.stringify({ action: 'ratify', track_id: track.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not ratify the route.')
      onRatified(data.phases || phases)
    } catch (err) {
      console.error('NextSteps ratify error:', err)
      setError(err.message || 'Could not save your route. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ns-draft">
      <div className="ns-draft-intro">
        <p className="ns-draft-lead">
          Here is a route I would sketch from what you have told me.
        </p>
        <p className="ns-draft-sub">
          Move anything. Rename anything. Cross anything out. It is not yours until
          you have made it yours, and nothing here is fixed.
        </p>
        {routeNote && <p className="ns-draft-note">{routeNote}</p>}
      </div>

      <ol className="ns-draft-list">
        {phases.map((p, i) => (
          <li key={p.id} className="ns-draft-phase">
            <div className="ns-draft-marker">{i + 1}</div>

            <div className="ns-draft-fields">
              <input
                className="ns-field ns-field-name"
                value={p.name}
                aria-label={`Name of phase ${i + 1}`}
                onChange={(e) => setField(p.id, 'name', e.target.value)}
                onBlur={(e) => saveField(p, 'name', e.target.value)}
              />

              <label className="ns-field-label" htmlFor={`work-${p.id}`}>
                What this looks like
              </label>
              <textarea
                id={`work-${p.id}`}
                className="ns-field ns-field-work"
                value={p.work}
                rows={3}
                onChange={(e) => setField(p.id, 'work', e.target.value)}
                onBlur={(e) => saveField(p, 'work', e.target.value)}
              />

              <label className="ns-field-label" htmlFor={`exit-${p.id}`}>
                This phase ends when
              </label>
              <textarea
                id={`exit-${p.id}`}
                className="ns-field ns-field-exit"
                value={p.exit_condition}
                rows={2}
                onChange={(e) => setField(p.id, 'exit_condition', e.target.value)}
                onBlur={(e) => saveField(p, 'exit_condition', e.target.value)}
              />

              <div className="ns-draft-tools">
                <button
                  type="button" className="ns-tool" onClick={() => reorder(p.id, -1)}
                  disabled={moving || i === 0} aria-label="Move this phase earlier"
                >↑ Earlier</button>
                <button
                  type="button" className="ns-tool" onClick={() => reorder(p.id, 1)}
                  disabled={moving || i === phases.length - 1} aria-label="Move this phase later"
                >↓ Later</button>
                <button
                  type="button" className="ns-tool" onClick={() => addPhase(p.id)}
                  disabled={moving || phases.length >= 6}
                >+ Add one after</button>
                <button
                  type="button" className="ns-tool ns-tool-cut" onClick={() => removePhase(p.id)}
                  disabled={moving || phases.length <= 1}
                >Cross out</button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {error && <p className="ns-draft-error">{error}</p>}

      <div className="ns-draft-foot">
        <button type="button" className="ns-draft-ratify" onClick={ratify} disabled={busy || moving}>
          {busy ? 'Saving your route…' : 'This is my route'}
        </button>
        <p className="ns-draft-foot-note">
          {touched
            ? 'Your changes are saved. You can keep editing any of this later.'
            : 'You can change every word of this, now or later.'}
        </p>
        {onBack && (
          <button type="button" className="ns-draft-back" onClick={onBack}>
            Back
          </button>
        )}
      </div>

      <style>{`
        .ns-draft { display: flex; flex-direction: column; gap: 26px; }
        .ns-draft-intro { display: flex; flex-direction: column; gap: 10px; }
        .ns-draft-lead {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.5rem;
          line-height: 1.4;
          color: #0F1523;
          margin: 0;
        }
        .ns-draft-sub, .ns-draft-note {
          font-family: 'Lora', Georgia, serif;
          font-size: 1rem;
          line-height: 1.65;
          color: rgba(38,36,32,0.78);
          margin: 0;
          max-width: 56ch;
        }
        .ns-draft-note {
          padding: 12px 16px;
          background: rgba(38,36,32,0.06);
          border-left: 3px solid #4c6b45;
          border-radius: 4px;
        }
        .ns-draft-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ns-draft-phase {
          display: flex;
          gap: 16px;
          padding: 18px;
          background: #FFFFFF;
          border: 1px solid rgba(38,36,32,0.20);
          border-radius: 14px;
        }
        .ns-draft-marker {
          flex-shrink: 0;
          width: 30px; height: 30px;
          border-radius: 50%;
          background: rgba(38,36,32,0.08);
          color: rgba(38,36,32,0.68);
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.88rem;
          display: flex; align-items: center; justify-content: center;
        }
        .ns-draft-fields { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .ns-field-label {
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(38,36,32,0.68);
          margin-top: 10px;
        }

        /* Every field reads as prose and behaves as an input. No edit mode,
           no pencil: touching a word costs one click, the same as reading. */
        .ns-field {
          font-family: 'Lora', Georgia, serif;
          color: #0F1523;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 6px 8px;
          margin: 0 -8px;
          width: calc(100% + 16px);
          resize: vertical;
          transition: border-color 0.15s, background 0.15s;
        }
        .ns-field:hover {
          border-color: rgba(38,36,32,0.20);
          background: rgba(38,36,32,0.03);
        }
        .ns-field:focus {
          outline: none;
          border-color: #4c6b45;
          background: #FFFFFF;
        }
        .ns-field-name { font-size: 1.16rem; line-height: 1.3; }
        .ns-field-work { font-size: 1rem; line-height: 1.6; color: rgba(38,36,32,0.85); }
        .ns-field-exit { font-size: 1rem; line-height: 1.55; color: #0F1523; }

        .ns-draft-tools {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid rgba(38,36,32,0.08);
        }
        .ns-tool {
          background: transparent;
          border: 1px solid rgba(38,36,32,0.20);
          border-radius: 8px;
          padding: 6px 12px;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.74rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #262420;
          cursor: pointer;
        }
        .ns-tool:hover:not(:disabled) { background: rgba(38,36,32,0.06); }
        .ns-tool:disabled { opacity: 0.55; cursor: default; }
        .ns-tool-cut { color: #a9743f; border-color: rgba(169,116,63,0.35); }

        .ns-draft-error {
          font-family: 'Lora', Georgia, serif;
          font-size: 0.98rem;
          color: #a9743f;
          margin: 0;
        }
        .ns-draft-foot {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          padding-top: 20px;
          border-top: 1px solid rgba(38,36,32,0.11);
        }
        .ns-draft-ratify {
          background: #4c6b45;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          padding: 13px 26px;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.85rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .ns-draft-ratify:disabled { opacity: 0.62; cursor: default; }
        .ns-draft-foot-note {
          font-family: 'Lora', Georgia, serif;
          font-size: 0.92rem;
          color: rgba(38,36,32,0.68);
          margin: 0;
        }
        .ns-draft-back {
          background: none; border: none; padding: 0;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.76rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(38,36,32,0.68);
          cursor: pointer;
        }
        .ns-draft-back:hover { text-decoration: underline; }

        @media (max-width: 640px) {
          .ns-draft-lead { font-size: 1.3rem; }
          .ns-draft-phase { padding: 14px; gap: 12px; }
        }
      `}</style>
    </div>
  )
}
