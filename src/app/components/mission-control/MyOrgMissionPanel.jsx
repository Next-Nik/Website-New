// ─────────────────────────────────────────────────────────────
// MyOrgMissionPanel.jsx
//
// The Mission Control surface for the "My Org" scope. Mirrors
// MyPracticeMissionPanel's two-mode pattern (setup vs room), but
// for organisations.
//
// Data layer: nextus_actors, owned by the user via
// profile_owner = user.id. No new schema in this drop —
// OrgManage already writes here. This panel is the day-to-day
// room. Deep editing of the six tabs (Profile / Offerings / Domains /
// Matches / Contributions / Needs) continues to happen at
// /beta/org/:id/manage; the panel links there.
//
// Multi-org users are deferred per the brief. If a user owns more
// than one org actor, we surface the first one and flag the rest
// so they can be reached at /beta/org/:id/manage directly.
//
// SETUP MODE (when no org is found owned by this user):
//   • URL-paste prompt at top, runs /api/org-extract and takes the
//     Planet record to pre-fill.
//   • Field form below with the brief's Section 5.2 minimum eight.
//   • Ownership confirmation checkbox — required for the row insert.
//   • Save creates the row; the panel flips to room mode.
//
// ROOM MODE (when an owned org exists):
//   • Summary cards: identity, placement, mission/offering, scale,
//     status of needs/offerings counts.
//   • "Open full manager →" link sends the user to
//     /beta/org/:id/manage for the deep editor.
//
// Required fields for the initial insert (per brief Section 5.2):
//   1. name                  (org name)
//   2. description           (one-line description)
//   3. website
//   4. domains[0]            (primary civilisational domain)
//   5. scale
//   6. description (mission, second pass — same field, but the brief
//      separates them conceptually; here mission and one-line both
//      land in description for v1, until we add a dedicated mission
//      column)
//   7. impact_summary        (what you offer)
//   8. ownership_confirmed   (UI-only checkbox before insert)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../hooks/useSupabase'
import {
  GOLD, GOLD_DK, GOLD_RULE, GOLD_FAINT, GOLD_HOVER,
  BG_CARD,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'
import { CIV_DOMAINS } from '../../constants/domains'

// ─── Constants ───────────────────────────────────────────────

const CIV_DOMAIN_OPTIONS = CIV_DOMAINS.map(d => ({ value: d.slug, label: d.name }))

const SCALE_OPTIONS = [
  { value: 'individual',    label: 'Individual' },
  { value: 'local',         label: 'Local' },
  { value: 'municipal',     label: 'Municipal' },
  { value: 'regional',      label: 'Regional' },
  { value: 'national',      label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global',        label: 'Global' },
]

// ─── The panel ───────────────────────────────────────────────

export default function MyOrgMissionPanel({ userId }) {
  const [loading, setLoading] = useState(true)
  const [actors,  setActors]  = useState([])    // all orgs this user owns
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('nextus_actors')
      .select('*')
      .eq('profile_owner', userId)
      .order('updated_at', { ascending: false })
    if (error) setError(error)
    else setActors(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  if (loading) return <PanelShell><LoadingState /></PanelShell>
  if (error)   return <PanelShell><ErrorState error={error} /></PanelShell>

  // Setup mode: no org owned yet.
  if (actors.length === 0) {
    return (
      <PanelShell>
        <SetupMode userId={userId} onCreated={load} />
      </PanelShell>
    )
  }

  // At least one org owned. Build the spine from parent_id, open at the root,
  // retarget the detail on click.
  return (
    <PanelShell>
      <OrgSpineRoom actors={actors} userId={userId} onChange={load} />
    </PanelShell>
  )
}

// ─── Org spine (parent_id hierarchy) ─────────────────────────
// The spine is the user's ownership tree, drawn from nextus_actors.parent_id
// (single-parent, arbitrary depth, NULL = top level). The user owns every node
// in their own spine, so no cross-owner consent handshake is needed — the
// pointer alone records the structure. The nextus_relationships parent_child
// type is for umbrellas spanning DIFFERENT owners; this is not that.

function childrenOf(actors, id) {
  return actors
    .filter(a => a.parent_id === id)
    .sort((x, y) => (x.name || '').localeCompare(y.name || ''))
}

function rootsOf(actors) {
  const ids = new Set(actors.map(a => a.id))
  // An owned actor whose parent isn't in the owned set still reads as a root here.
  return actors
    .filter(a => !a.parent_id || !ids.has(a.parent_id))
    .sort((x, y) => (x.name || '').localeCompare(y.name || ''))
}

function descendantIds(actors, id) {
  const out = new Set()
  const walk = pid => childrenOf(actors, pid).forEach(c => {
    if (!out.has(c.id)) { out.add(c.id); walk(c.id) }
  })
  walk(id)
  return out
}

// "Largest first": the root with the biggest subtree; tie-break org type, then name.
function pickDefaultRoot(actors) {
  const roots = rootsOf(actors)
  if (!roots.length) return actors[0] || null
  return [...roots].sort((a, b) => {
    const d = descendantIds(actors, b.id).size - descendantIds(actors, a.id).size
    if (d) return d
    const at = a.type === 'organisation' ? 0 : 1
    const bt = b.type === 'organisation' ? 0 : 1
    if (at !== bt) return at - bt
    return (a.name || '').localeCompare(b.name || '')
  })[0]
}

function OrgSpineRoom({ actors, userId, onChange }) {
  const defaultRootId = useMemo(() => pickDefaultRoot(actors)?.id || null, [actors])
  const [selectedId, setSelectedId] = useState(defaultRootId)

  // Keep the selection valid as the tree changes (after add / reparent).
  useEffect(() => {
    if (!actors.find(a => a.id === selectedId)) setSelectedId(defaultRootId)
  }, [actors, selectedId, defaultRootId])

  const selected = actors.find(a => a.id === selectedId) || actors[0] || null

  return (
    <div className="mo-spine-layout">
      <style>{PANEL_CSS}</style>
      <OrgSpine
        actors={actors}
        selectedId={selected?.id}
        onSelect={setSelectedId}
        userId={userId}
        onChange={onChange}
      />
      <div className="mo-spine-detail">
        {selected && <RoomMode actor={selected} />}
      </div>
    </div>
  )
}

function OrgSpine({ actors, selectedId, onSelect, userId, onChange }) {
  const roots = rootsOf(actors)
  return (
    <aside className="mo-spine">
      <p className="mo-spine-eyebrow">Your spine</p>
      <div className="mo-spine-tree">
        {roots.map(r => (
          <SpineNode key={r.id} actor={r} actors={actors} depth={0}
                     selectedId={selectedId} onSelect={onSelect} />
        ))}
      </div>
      <HumanBase />
      <SpineEditor
        actors={actors} selectedId={selectedId} userId={userId}
        onChange={onChange} onSelect={onSelect}
      />
    </aside>
  )
}

function SpineNode({ actor, actors, depth, selectedId, onSelect }) {
  const kids = childrenOf(actors, actor.id)
  const isSel = actor.id === selectedId
  const typeTag = actor.type === 'practitioner' ? 'practice'
                : actor.type === 'organisation' ? 'org'
                : actor.type
  return (
    <>
      <button
        type="button"
        className={`mo-spine-node${isSel ? ' is-selected' : ''}`}
        style={{ paddingLeft: `${10 + depth * 18}px` }}
        onClick={() => onSelect(actor.id)}
      >
        <span className="mo-spine-node-dot" aria-hidden="true" />
        <span className="mo-spine-node-name">{actor.name}</span>
        {typeTag && <span className="mo-spine-node-tag">{typeTag}</span>}
      </button>
      {kids.map(k => (
        <SpineNode key={k.id} actor={k} actors={actors} depth={depth + 1}
                   selectedId={selectedId} onSelect={onSelect} />
      ))}
    </>
  )
}

// The human grounds the spine. Owner-only, never public, never an actor node —
// rendered gently as the base the structure rests on, not a thing you manage.
function HumanBase() {
  return (
    <div className="mo-spine-base"
         title="Your own developmental work stays private and never appears publicly.">
      <span className="mo-spine-base-rule" aria-hidden="true" />
      <span className="mo-spine-base-label">rests on you</span>
    </div>
  )
}

// The "Sits under" picker plus inline add. One actor names its parent; new
// relatives are created in the same flow. Cycle-safe: a node's own descendants
// are excluded from its parent choices.
function SpineEditor({ actors, selectedId, userId, onChange, onSelect }) {
  const selected = actors.find(a => a.id === selectedId)
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState(null)
  const [adding, setAdding]   = useState(null)   // 'parent' | 'child' | null
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('organisation')

  if (!selected) return null

  const blocked = descendantIds(actors, selected.id)
  blocked.add(selected.id)
  const parentChoices = actors.filter(a => !blocked.has(a.id))

  async function setParent(parentId) {
    setBusy(true); setErr(null)
    const { error } = await supabase.from('nextus_actors')
      .update({ parent_id: parentId, updated_at: new Date().toISOString() })
      .eq('id', selected.id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    onChange()
  }

  async function addActor(role) {
    const name = newName.trim()
    if (!name) { setErr('Name it first.'); return }
    setBusy(true); setErr(null)
    const base = {
      name, type: newType, profile_owner: userId,
      status: 'live', claimed: true, seeded_by: 'self',
      represented_by_adder: true, domains: [],
    }
    if (role === 'child') base.parent_id = selected.id
    const { data: created, error } = await supabase.from('nextus_actors')
      .insert(base).select('id').single()
    if (error) { setBusy(false); setErr(error.message); return }
    if (role === 'parent' && created?.id) {
      const { error: e2 } = await supabase.from('nextus_actors')
        .update({ parent_id: created.id, updated_at: new Date().toISOString() })
        .eq('id', selected.id)
      if (e2) { setBusy(false); setErr(e2.message); return }
    }
    setBusy(false); setAdding(null); setNewName(''); setNewType('organisation')
    onChange()
    if (created?.id) onSelect(created.id)
  }

  return (
    <div className="mo-spine-editor">
      <p className="mo-spine-editor-eyebrow">{selected.name}</p>

      <label className="mo-spine-field-label">Sits under</label>
      <select
        className="mo-spine-select"
        value={selected.parent_id || ''}
        disabled={busy}
        onChange={e => {
          if (e.target.value === '__add__') { setAdding('parent'); return }
          setParent(e.target.value || null)
        }}
      >
        <option value="">Top level (sits under nothing)</option>
        {parentChoices.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
        <option value="__add__">+ Add a new one as parent…</option>
      </select>

      {adding === null && (
        <button type="button" className="mo-spine-add-btn" disabled={busy}
                onClick={() => setAdding('child')}>
          + Add a member under {selected.name}
        </button>
      )}

      {adding && (
        <div className="mo-spine-addbox">
          <p className="mo-spine-add-title">
            {adding === 'parent'
              ? `New parent above ${selected.name}`
              : `New member under ${selected.name}`}
          </p>
          <input
            className="mo-spine-input"
            placeholder="Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            disabled={busy}
            autoFocus
          />
          <div className="mo-spine-type-toggle">
            <button type="button"
              className={`mo-spine-type${newType === 'organisation' ? ' is-on' : ''}`}
              onClick={() => setNewType('organisation')} disabled={busy}>Organisation</button>
            <button type="button"
              className={`mo-spine-type${newType === 'practitioner' ? ' is-on' : ''}`}
              onClick={() => setNewType('practitioner')} disabled={busy}>Practice</button>
          </div>
          <div className="mo-spine-add-actions">
            <button type="button" className="mo-spine-confirm"
                    disabled={busy || !newName.trim()}
                    onClick={() => addActor(adding)}>
              {busy ? 'Adding…' : 'Add'}
            </button>
            <button type="button" className="mo-spine-cancel" disabled={busy}
                    onClick={() => { setAdding(null); setNewName(''); setErr(null) }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {err && <p className="mo-spine-err">{err}</p>}
    </div>
  )
}

// ─── Setup mode ──────────────────────────────────────────────

function SetupMode({ userId, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    impact_summary: '',
    website: '',
    primary_domain: '',
    scale: '',
    location_name: '',
  })
  const [confirmed, setConfirmed]   = useState(false)
  const [extractInput, setExtractInput] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractMsg, setExtractMsg] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleExtract() {
    if (!extractInput.trim()) return
    setExtracting(true)
    setExtractMsg(null)
    try {
      const res = await fetch('/api/org-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: extractInput.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setExtractMsg(data.message || 'Could not read that URL. You can still fill in the form by hand.')
        return
      }
      const planet = (data.results || []).find(r => r.label === 'Planet' || r.track === 'planet')
      if (!planet) {
        setExtractMsg('Did not find an organisation record at that URL. You can fill in the form by hand below.')
        return
      }
      const updates = mapExtractToForm(planet)
      setForm(f => ({ ...f, ...updates }))
      setExtractMsg('Pre-filled. Review each field below and edit anything that is not quite right.')
    } catch {
      setExtractMsg('Could not reach the extraction service. You can fill in the form by hand.')
    } finally {
      setExtracting(false)
    }
  }

  const requiredFilled =
    form.name.trim() &&
    form.description.trim() &&
    form.website.trim() &&
    form.primary_domain &&
    form.scale &&
    form.impact_summary.trim() &&
    confirmed

  async function handleSave() {
    if (!requiredFilled || !userId) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase
      .from('nextus_actors')
      .insert({
        name:           form.name.trim(),
        description:    form.description.trim() || null,
        impact_summary: form.impact_summary.trim() || null,
        website:        form.website.trim() || null,
        scale:          form.scale || null,
        location_name:  form.location_name.trim() || null,
        profile_owner:  userId,
        domains:        [form.primary_domain],
        status:         'live',    // self-submitted orgs go live immediately (assume good)
        claimed:        true,      // they created it -- it's theirs
      })
    setSaving(false)
    if (error) {
      setSaveError(error.message || 'Could not create the organisation. Try again or contact support.')
      return
    }
    onCreated()
  }

  return (
    <div className="mo-setup">
      <style>{PANEL_CSS}</style>

      <header className="mo-header">
        <p className="mo-eyebrow">MY ORG · SETUP</p>
        <h2 className="mo-title">Set up your organisation</h2>
        <div className="mo-rule" />
        <p className="mo-intro">
          A few fields so your organisation appears on the map, can be matched with contributors, and has a working room here. Everything is editable any time. Deep editing of offerings, needs, and domain placement happens in the full org manager. This is the day-to-day surface.
        </p>
      </header>

      <section className="mo-extract">
        <h3 className="mo-section-h">Have a website?</h3>
        <p className="mo-section-helper">
          Paste your organisation's URL and we will pre-fill what we can. The fields below stay editable. If you would rather just fill them in, skip this and scroll down.
        </p>
        <div className="mo-extract-row">
          <input
            type="url"
            className="mo-extract-input"
            placeholder="https://..."
            value={extractInput}
            onChange={e => setExtractInput(e.target.value)}
            disabled={extracting}
          />
          <button
            type="button"
            className="mo-extract-btn"
            onClick={handleExtract}
            disabled={extracting || !extractInput.trim()}
          >
            {extracting ? 'Reading…' : 'Pre-fill from URL'}
          </button>
        </div>
        {extractMsg && <p className="mo-extract-msg">{extractMsg}</p>}
      </section>

      <section className="mo-fields">
        <h3 className="mo-section-h">Identity</h3>

        <FieldRow label="Organisation name" required>
          <input type="text" className="mo-input" value={form.name} onChange={e => set('name', e.target.value)} />
        </FieldRow>

        <FieldRow label="One-line description" required helper="What this org does in a sentence.">
          <input type="text" className="mo-input" value={form.description} onChange={e => set('description', e.target.value)} maxLength={240} />
        </FieldRow>

        <FieldRow label="Website" required>
          <input type="url" className="mo-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
        </FieldRow>

        <FieldRow label="Location" helper="Optional. City, country, or 'Distributed.'">
          <input type="text" className="mo-input" value={form.location_name} onChange={e => set('location_name', e.target.value)} />
        </FieldRow>

        <h3 className="mo-section-h">Placement</h3>

        <FieldRow label="Primary civilisational domain" required>
          <select className="mo-input" value={form.primary_domain} onChange={e => set('primary_domain', e.target.value)}>
            <option value="">Select one…</option>
            {CIV_DOMAIN_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Scale" required>
          <select className="mo-input" value={form.scale} onChange={e => set('scale', e.target.value)}>
            <option value="">Select one…</option>
            {SCALE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FieldRow>

        <h3 className="mo-section-h">What you do</h3>

        <FieldRow label="What you offer" required helper="1-3 sentences. The shape of the value the org puts out.">
          <textarea
            className="mo-textarea"
            rows={3}
            value={form.impact_summary}
            onChange={e => set('impact_summary', e.target.value)}
          />
        </FieldRow>

        <h3 className="mo-section-h">Ownership</h3>

        <label className="mo-confirm-row">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
          />
          <span>
            <strong>I am authorised to represent this organisation on NextUs.</strong>
            <br />
            <span className="mo-confirm-helper">
              Required. This links the org record to your account so you can manage it.
            </span>
          </span>
        </label>
      </section>

      <footer className="mo-footer">
        {saveError && <p className="mo-save-error">{saveError}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="mo-btn mo-btn-primary"
            disabled={!requiredFilled || saving}
            onClick={handleSave}
          >
            {saving ? 'Creating…' : 'Create my organisation'}
          </button>
          {!requiredFilled && (
            <p className="mo-required-missing" style={{ margin: 0 }}>
              {missingFieldsLabel(form, confirmed)}
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}

// ─── Room mode ───────────────────────────────────────────────

function RoomMode({ actor }) {
  const primaryDomain = CIV_DOMAINS.find(d => d.slug === (actor.domains?.[0]))
  const scaleLabel    = SCALE_OPTIONS.find(o => o.value === actor.scale)?.label

  return (
    <div className="mo-room">
      <style>{PANEL_CSS}</style>

      <header className="mo-header">
        <p className="mo-eyebrow">MY ORG</p>
        <h2 className="mo-title">{actor.name}</h2>
        {actor.description && <p className="mo-headline">{actor.description}</p>}
        <div className="mo-rule" />
      </header>

      {/* Card 1 — Identity & location. */}
      <Card eyebrow="IDENTITY">
        {actor.location_name && (
          <p className="mo-card-display"><strong>Location:</strong> {actor.location_name}</p>
        )}
        {actor.website && (
          <p className="mo-card-display">
            <strong>Website:</strong>{' '}
            <a href={actor.website} target="_blank" rel="noopener noreferrer" style={{ color: GOLD_DK }}>
              {actor.website}
            </a>
          </p>
        )}
      </Card>

      {/* Card 2 — Placement. */}
      <Card eyebrow="PLACEMENT">
        {primaryDomain ? (
          <p className="mo-card-display"><strong>Primary domain:</strong> {primaryDomain.name}</p>
        ) : (
          <p className="mo-card-display" style={{ color: TEXT_FAINT }}>Primary domain not yet set.</p>
        )}
        {actor.domains?.length > 1 && (
          <p className="mo-card-display">
            <strong>Also working in:</strong>{' '}
            {actor.domains.slice(1).map(slug => CIV_DOMAINS.find(d => d.slug === slug)?.name).filter(Boolean).join(', ')}
          </p>
        )}
        {scaleLabel && (
          <p className="mo-card-display"><strong>Scale:</strong> {scaleLabel}</p>
        )}
      </Card>

      {/* Card 3 — Offering. */}
      <Card eyebrow="WHAT YOU OFFER">
        {actor.impact_summary ? (
          <p className="mo-card-display">{actor.impact_summary}</p>
        ) : (
          <p className="mo-card-display" style={{ color: TEXT_FAINT }}>Not yet set.</p>
        )}
        {actor.reach && (
          <p className="mo-card-display"><em>Reach:</em> {actor.reach}</p>
        )}
      </Card>

      {/* Card 4 — Manage link. */}
      <div className="mo-manage-link-row">
        <Link to={`/org/${actor.id}/manage`} className="mo-manage-link">
          Open full manager →
        </Link>
        <Link to={`/org/${actor.id}`} className="mo-public-link" target="_blank" rel="noopener noreferrer">
          View public page →
        </Link>
      </div>
    </div>
  )
}

// ─── Pieces ──────────────────────────────────────────────────

function FieldRow({ label, helper, required, children }) {
  return (
    <div className="mo-fieldrow">
      <div className="mo-fieldrow-label">
        {label}
        {required && <span className="mo-required-mark"> *</span>}
      </div>
      {children}
      {helper && <p className="mo-fieldrow-helper">{helper}</p>}
    </div>
  )
}

function Card({ eyebrow, children }) {
  return (
    <div className="mo-card">
      <div className="mo-card-head">
        <span className="mo-card-eyebrow">{eyebrow}</span>
      </div>
      <div className="mo-card-body">{children}</div>
    </div>
  )
}

function PanelShell({ children }) {
  return <div className="mo-shell">{children}</div>
}

function LoadingState() {
  return <p className="mo-loading">Loading your organisation…</p>
}

function ErrorState({ error }) {
  return <p className="mo-error">Could not load: {error?.message || 'unknown error'}.</p>
}

// ─── Helpers ─────────────────────────────────────────────────

function mapExtractToForm(planet) {
  const out = {}
  if (planet.name)           out.name = String(planet.name).slice(0, 240)
  if (planet.description)    out.description = String(planet.description).slice(0, 240)
  if (planet.impact_summary) out.impact_summary = String(planet.impact_summary)
  if (planet.website)        out.website = String(planet.website)
  if (planet.location_name)  out.location_name = String(planet.location_name)
  if (planet.scale) {
    const s = String(planet.scale).toLowerCase()
    if (SCALE_OPTIONS.some(o => o.value === s)) out.scale = s
  }
  if (planet.domain_id) {
    const slug = String(planet.domain_id).toLowerCase()
    if (CIV_DOMAIN_OPTIONS.some(o => o.value === slug)) out.primary_domain = slug
  }
  return out
}

function missingFieldsLabel(form, confirmed) {
  const missing = []
  if (!form.name.trim())           missing.push('name')
  if (!form.description.trim())    missing.push('description')
  if (!form.website.trim())        missing.push('website')
  if (!form.primary_domain)        missing.push('domain')
  if (!form.scale)                 missing.push('scale')
  if (!form.impact_summary.trim()) missing.push('what you offer')
  if (!confirmed)                  missing.push('ownership confirmation')
  if (missing.length === 0) return ''
  return `Still needed: ${missing.join(', ')}.`
}

// ─── CSS ─────────────────────────────────────────────────────

const PANEL_CSS = `
.mo-shell {
  max-width: 760px;
  margin: 0 auto;
  padding: 28px 24px 60px;
  color: ${TEXT_INK};
}

.mo-header { margin-bottom: 28px; }
.mo-eyebrow {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.22em;
  color: ${GOLD_DK};
  margin: 0 0 8px;
}
.mo-title {
  font-family: ${FONT_DISPLAY};
  font-size: 32px;
  font-weight: 500;
  color: ${TEXT_INK};
  margin: 0 0 6px;
  letter-spacing: -0.005em;
}
.mo-headline {
  font-family: ${FONT_BODY};
  font-size: 16px;
  font-style: italic;
  color: ${GOLD_DK};
  margin: 0 0 8px;
}
.mo-rule { width: 40px; height: 1px; background: ${GOLD}; margin: 14px 0 16px; }
.mo-intro {
  font-family: ${FONT_BODY};
  font-size: 15px;
  color: ${TEXT_META};
  margin: 0;
  line-height: 1.6;
}

.mo-extract {
  margin: 8px 0 28px;
  padding: 18px 20px;
  background: ${GOLD_FAINT};
  border: 1px solid ${GOLD_RULE};
  border-radius: 14px;
}
.mo-section-h {
  font-family: ${FONT_DISPLAY};
  font-size: 19px;
  font-weight: 500;
  color: ${TEXT_INK};
  margin: 0 0 6px;
}
.mo-section-helper {
  font-family: ${FONT_BODY};
  font-size: 13.5px;
  color: ${TEXT_META};
  line-height: 1.5;
  margin: 0 0 12px;
}
.mo-extract-row { display: flex; gap: 10px; flex-wrap: wrap; }
.mo-extract-input {
  flex: 1;
  min-width: 200px;
  padding: 10px 12px;
  font-family: ${FONT_BODY};
  font-size: 14px;
  border: 1px solid ${GOLD_RULE};
  background: #FFFFFF;
  outline: none;
}
.mo-extract-input:focus { border-color: ${GOLD}; }
.mo-extract-btn {
  padding: 10px 18px;
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  background: ${GOLD};
  color: #FFFFFF;
  border: 1px solid ${GOLD};
  border-radius: 40px;
  cursor: pointer;
}
.mo-extract-btn:hover:not(:disabled) { background: ${GOLD_DK}; }
.mo-extract-btn:disabled { opacity: 0.55; cursor: default; }
.mo-extract-msg {
  margin: 12px 0 0;
  font-family: ${FONT_BODY};
  font-size: 13.5px;
  font-style: italic;
  color: ${GOLD_DK};
}

.mo-fields { display: flex; flex-direction: column; gap: 18px; }
.mo-fieldrow { display: flex; flex-direction: column; gap: 6px; }
.mo-fieldrow-label {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  color: ${GOLD_DK};
  text-transform: uppercase;
}
.mo-required-mark { color: ${GOLD}; }
.mo-fieldrow-helper {
  font-family: ${FONT_BODY};
  font-size: 13px;
  color: ${TEXT_FAINT};
  margin: 0;
  line-height: 1.5;
}

.mo-input {
  padding: 10px 12px;
  font-family: ${FONT_BODY};
  font-size: 14.5px;
  border: 1px solid ${GOLD_RULE};
  background: #FFFFFF;
  outline: none;
  border-radius: 0;
  width: 100%;
  box-sizing: border-box;
}
.mo-input:focus { border-color: ${GOLD}; }

.mo-textarea {
  padding: 10px 12px;
  font-family: ${FONT_BODY};
  font-size: 14.5px;
  border: 1px solid ${GOLD_RULE};
  background: #FFFFFF;
  outline: none;
  width: 100%;
  resize: vertical;
  min-height: 70px;
  line-height: 1.5;
  box-sizing: border-box;
}
.mo-textarea:focus { border-color: ${GOLD}; }

.mo-confirm-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid ${GOLD_RULE};
  border-radius: 14px;
  background: ${GOLD_FAINT};
  cursor: pointer;
}
.mo-confirm-row input[type="checkbox"] {
  margin-top: 3px;
  flex-shrink: 0;
}
.mo-confirm-row span {
  font-family: ${FONT_BODY};
  font-size: 14px;
  color: ${TEXT_INK};
  line-height: 1.5;
}
.mo-confirm-helper {
  font-style: italic;
  color: ${TEXT_META};
  font-size: 13px;
}

.mo-footer {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid ${GOLD_RULE};
}
.mo-save-error {
  font-family: ${FONT_BODY};
  font-size: 14px;
  color: #B53B3B;
  margin: 0 0 12px;
}
.mo-required-missing {
  font-family: ${FONT_BODY};
  font-size: 13.5px;
  font-style: italic;
  color: ${TEXT_META};
  margin: 0;
}

.mo-btn {
  padding: 10px 18px;
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  border-radius: 40px;
  cursor: pointer;
  border: 1px solid ${GOLD};
}
.mo-btn-primary { background: ${GOLD}; color: #FFFFFF; }
.mo-btn-primary:hover:not(:disabled) { background: ${GOLD_DK}; }
.mo-btn-primary:disabled { opacity: 0.45; cursor: default; }

/* Room cards */
.mo-room { display: flex; flex-direction: column; gap: 0; }
.mo-card {
  margin: 0 0 14px;
  padding: 14px 18px;
  background: ${BG_CARD};
  border: 1px solid ${GOLD_RULE};
  border-radius: 14px;
}
.mo-card-head { margin-bottom: 8px; }
.mo-card-eyebrow {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.22em;
  color: ${GOLD_DK};
}
.mo-card-display {
  font-family: ${FONT_BODY};
  font-size: 14.5px;
  color: ${TEXT_INK};
  margin: 0 0 6px;
  line-height: 1.55;
}
.mo-card-display:last-child { margin-bottom: 0; }

.mo-manage-link-row {
  display: flex;
  gap: 14px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid ${GOLD_RULE};
  flex-wrap: wrap;
}
.mo-manage-link, .mo-public-link {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 40px;
}
.mo-manage-link {
  background: ${GOLD};
  color: #FFFFFF;
}
.mo-manage-link:hover { background: ${GOLD_DK}; }
.mo-public-link {
  color: ${GOLD_DK};
  border: 1px solid ${GOLD_RULE};
}
.mo-public-link:hover { background: ${GOLD_HOVER}; }

.mo-other-orgs {
  margin-top: 24px;
  padding: 14px 16px;
  background: ${GOLD_FAINT};
  border: 1px dashed ${GOLD_RULE};
  border-radius: 14px;
}
.mo-other-orgs-helper {
  font-family: ${FONT_BODY};
  font-size: 13.5px;
  color: ${TEXT_META};
  margin: 0 0 8px;
}
.mo-other-orgs-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.mo-other-orgs-link {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  color: ${GOLD_DK};
  text-decoration: none;
}
.mo-other-orgs-link:hover { color: ${GOLD}; }

.mo-loading {
  font-family: ${FONT_BODY};
  color: ${TEXT_META};
  font-style: italic;
  text-align: center;
  padding: 40px 0;
}
.mo-error {
  font-family: ${FONT_BODY};
  color: ${TEXT_META};
  text-align: center;
  padding: 40px 0;
}

@media (max-width: 640px) {
  .mo-shell { padding: 18px 16px 40px; }
  .mo-title { font-size: 24px; }
  .mo-section-h { font-size: 17px; }
  .mo-manage-link-row { flex-direction: column; }
}

/* ── Org spine ─────────────────────────────────────────────── */
.mo-spine-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 28px;
  align-items: start;
}
@media (max-width: 680px) {
  .mo-spine-layout { grid-template-columns: 1fr; gap: 18px; }
}
.mo-spine {
  border: 1px solid ${GOLD_RULE};
  border-radius: 10px;
  background: ${GOLD_FAINT};
  padding: 16px 14px;
  position: sticky;
  top: 16px;
}
@media (max-width: 680px) { .mo-spine { position: static; } }
.mo-spine-eyebrow {
  font-family: 'Cormorant SC', Georgia, serif;
  font-size: 14px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${GOLD_DK};
  margin: 0 0 12px;
}
.mo-spine-tree { display: flex; flex-direction: column; gap: 2px; }
.mo-spine-node {
  display: flex; align-items: center; gap: 8px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 8px 10px;
  cursor: pointer;
  color: ${TEXT_INK};
  font-size: 14px;
  line-height: 1.3;
}
.mo-spine-node:hover { background: ${GOLD_HOVER}; }
.mo-spine-node.is-selected { background: #fff; border-color: ${GOLD}; }
.mo-spine-node-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: ${GOLD}; flex-shrink: 0;
}
.mo-spine-node-name { flex: 1; }
.mo-spine-node-tag {
  font-size: 13px;
  color: ${TEXT_META};
  letter-spacing: 0.03em;
}
.mo-spine-base {
  display: flex; align-items: center; gap: 8px;
  margin-top: 8px; padding: 8px 10px;
}
.mo-spine-base-rule {
  width: 16px; height: 1px; background: ${GOLD_RULE}; flex-shrink: 0;
}
.mo-spine-base-label {
  font-size: 13px; color: ${TEXT_FAINT}; letter-spacing: 0.03em;
}
.mo-spine-editor {
  margin-top: 14px; padding-top: 14px;
  border-top: 1px solid ${GOLD_RULE};
}
.mo-spine-editor-eyebrow {
  font-size: 13px; color: ${GOLD_DK}; margin: 0 0 8px;
  letter-spacing: 0.05em;
}
.mo-spine-field-label {
  display: block; font-size: 13px; color: ${TEXT_META}; margin: 0 0 4px;
}
.mo-spine-select {
  width: 100%; padding: 8px 10px; font-size: 14px;
  border: 1px solid ${GOLD_RULE}; border-radius: 7px;
  background: #fff; color: ${TEXT_INK};
}
.mo-spine-select:focus { border-color: ${GOLD}; outline: none; }
.mo-spine-add-btn {
  margin-top: 10px; width: 100%;
  background: transparent; border: 1px dashed ${GOLD_RULE};
  border-radius: 7px; padding: 8px 10px;
  font-size: 13px; color: ${GOLD_DK}; cursor: pointer;
}
.mo-spine-add-btn:hover { background: ${GOLD_HOVER}; }
.mo-spine-addbox {
  margin-top: 10px; padding: 12px;
  border: 1px solid ${GOLD_RULE}; border-radius: 8px; background: #fff;
}
.mo-spine-add-title { font-size: 13px; color: ${TEXT_META}; margin: 0 0 8px; }
.mo-spine-input {
  width: 100%; padding: 8px 10px; font-size: 14px;
  border: 1px solid ${GOLD_RULE}; border-radius: 7px; color: ${TEXT_INK};
}
.mo-spine-input:focus { border-color: ${GOLD}; outline: none; }
.mo-spine-type-toggle { display: flex; gap: 6px; margin: 8px 0; }
.mo-spine-type {
  flex: 1; padding: 6px 8px; font-size: 13px;
  border: 1px solid ${GOLD_RULE}; border-radius: 6px;
  background: transparent; color: ${TEXT_META}; cursor: pointer;
}
.mo-spine-type.is-on { background: ${GOLD}; color: #fff; border-color: ${GOLD}; }
.mo-spine-add-actions { display: flex; gap: 8px; }
.mo-spine-confirm {
  flex: 1; padding: 7px 10px; font-size: 13px;
  background: ${GOLD}; color: #fff; border: 1px solid ${GOLD};
  border-radius: 6px; cursor: pointer;
}
.mo-spine-confirm:disabled { opacity: 0.55; cursor: default; }
.mo-spine-cancel {
  padding: 7px 10px; font-size: 13px;
  background: transparent; color: ${TEXT_META};
  border: 1px solid ${GOLD_RULE}; border-radius: 6px; cursor: pointer;
}
.mo-spine-err { font-size: 13px; color: #a3402f; margin: 8px 0 0; }
`
