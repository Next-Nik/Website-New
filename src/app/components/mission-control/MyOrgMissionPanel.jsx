// ─────────────────────────────────────────────────────────────
// MyOrgMissionPanel.jsx
//
// The Mission Control surface for the "My Org" scope. The owner's
// cockpit for one actor: it shows exactly what the entry contributes
// to the Atlas, how close it sits to the profile floor, and turns
// every gap into a one-tap fix. It mirrors the public org page's
// two-layer model (evidence then voice) and matches the sibling
// practice panel's read-mostly, edit-inline pattern.
//
// Data layer: nextus_actors (owned via profile_owner = user.id) plus
// actor_links (channels + contact). No new schema in this drop.
//
// Three surfaces:
//   SPINE        the user's ownership tree (parent_id), select + reparent
//   SETUP MODE   when the user owns no org yet — create the first row
//   ROOM MODE    the cockpit for the selected actor (this file's heart)
//
// ROOM MODE structure, in floor order:
//   • Identity strip — mirrors the public page (mark, name, tagline,
//     domain · scale · type eyebrow, founder line, status chip)
//   • Floor readiness — quiet, owner-only, every miss is a fix link
//   • Evidence cards (inline-editable): Identity, Placement, Story,
//     Channels, Contact
//   • Voice cards (inline-editable): Mission, Working on now, Offers
//   • Footer: View public page · Open full manager
//
// Inline edits write single columns on nextus_actors via saveField,
// optimistic with revert-on-failure (same contract as the practice
// panel). Channels and contact live in actor_links and are still
// managed in the full manager's Links tab; the cockpit reads and
// links out to it rather than duplicating that CRUD.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../hooks/useSupabase'
import {
  GOLD, GOLD_DK, GOLD_RULE, GOLD_FAINT, GOLD_HOVER,
  BG_CARD, BG_CARD_EMPTY,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'
import { CIV_DOMAINS, DOMAIN_COLORS } from '../../constants/domains'

// ─── Constants ───────────────────────────────────────────────

// CIV_DOMAINS exposes { slug, label, color } — note `label`, not `name`.
const CIV_DOMAIN_OPTIONS = CIV_DOMAINS.map(d => ({ value: d.slug, label: d.label }))
const domainLabel = slug => CIV_DOMAINS.find(d => d.slug === slug)?.label || null

const SCALE_OPTIONS = [
  { value: 'individual',    label: 'Individual' },
  { value: 'local',         label: 'Local' },
  { value: 'municipal',     label: 'Municipal' },
  { value: 'regional',      label: 'Regional' },
  { value: 'national',      label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global',        label: 'Global' },
]
const scaleLabelFor = v => SCALE_OPTIONS.find(o => o.value === v)?.label || null

// Channel labels + ordering, mirroring the public page (OrgPublic.jsx).
const LINK_LABELS = {
  website: 'Website', podcast_rss: 'Podcast', podcast_apple: 'Apple Podcasts',
  podcast_spotify: 'Spotify', youtube_channel: 'YouTube', youtube_video: 'YouTube',
  vimeo: 'Vimeo', substack: 'Substack', newsletter: 'Newsletter',
  instagram: 'Instagram', twitter: 'X', tiktok: 'TikTok', facebook: 'Facebook',
  linkedin: 'LinkedIn', medium: 'Medium', github: 'GitHub', book: 'Book',
  email: 'Email', contact_form: 'Contact form', calendly: 'Book a call',
  phone: 'Phone', other: 'Link',
}
const CONTACT_LINK_TYPES = new Set(['email', 'contact_form', 'calendly', 'phone'])
const LINK_PRIORITY = {
  website: 0, podcast_rss: 1, podcast_apple: 2, podcast_spotify: 3,
  youtube_channel: 4, substack: 5, newsletter: 6, book: 7,
  instagram: 8, linkedin: 9, twitter: 10, facebook: 11, tiktok: 12,
  vimeo: 13, medium: 14, github: 15, youtube_video: 16, other: 99,
}
const CONTACT_PRIORITY = { email: 0, contact_form: 1, calendly: 2, phone: 3 }

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
  // Optimistic overlay so inline edits feel instant without a full reload.
  // Spine structural ops (add / reparent) still call onChange, which reloads
  // and naturally clears the overlay.
  const [overlay, setOverlay] = useState({})
  const merged = useMemo(
    () => actors.map(a => (overlay[a.id] ? { ...a, ...overlay[a.id] } : a)),
    [actors, overlay],
  )

  const defaultRootId = useMemo(() => pickDefaultRoot(merged)?.id || null, [merged])
  const [selectedId, setSelectedId] = useState(defaultRootId)
  const [savingKey, setSavingKey]   = useState(null)

  // Keep the selection valid as the tree changes (after add / reparent).
  useEffect(() => {
    if (!merged.find(a => a.id === selectedId)) setSelectedId(defaultRootId)
  }, [merged, selectedId, defaultRootId])

  const selected = merged.find(a => a.id === selectedId) || merged[0] || null

  // actor_links for the selected actor (channels + contact).
  const [links, setLinks]       = useState([])
  const [linksLoading, setLL]   = useState(true)
  useEffect(() => {
    let live = true
    if (!selected?.id) { setLinks([]); setLL(false); return }
    setLL(true)
    supabase.from('actor_links')
      .select('*').eq('actor_id', selected.id).order('sort_order')
      .then(({ data }) => { if (live) { setLinks(data || []); setLL(false) } })
    return () => { live = false }
  }, [selected?.id])

  // Per-field save on a single actor. Optimistic; reverts on failure.
  const saveField = useCallback(async (actorId, column, value) => {
    if (!actorId) return false
    setSavingKey(`${actorId}:${column}`)
    setOverlay(o => ({ ...o, [actorId]: { ...(o[actorId] || {}), [column]: value } }))
    const { error } = await supabase.from('nextus_actors')
      .update({ [column]: value, updated_at: new Date().toISOString() })
      .eq('id', actorId)
    setSavingKey(null)
    if (error) {
      // Revert just this column to the underlying truth.
      setOverlay(o => {
        const base = actors.find(a => a.id === actorId)
        const next = { ...(o[actorId] || {}) }
        if (base) next[column] = base[column]
        return { ...o, [actorId]: next }
      })
      return false
    }
    return true
  }, [actors])

  return (
    <div className="mo-spine-layout">
      <style>{PANEL_CSS}</style>
      <OrgSpine
        actors={merged}
        selectedId={selected?.id}
        onSelect={setSelectedId}
        userId={userId}
        onChange={onChange}
      />
      <div className="mo-spine-detail">
        {selected && (
          <RoomMode
            actor={selected}
            links={links}
            linksLoading={linksLoading}
            savingKey={savingKey}
            saveField={(col, val) => saveField(selected.id, col, val)}
          />
        )}
      </div>
    </div>
  )
}

function OrgSpine({ actors, selectedId, onSelect, userId, onChange }) {
  const roots = rootsOf(actors)
  return (
    <aside className="mo-spine">
      <p className="mo-spine-eyebrow">Your org tree</p>
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

// ─── Room mode — the owner cockpit ───────────────────────────

function RoomMode({ actor, links, linksLoading, savingKey, saveField }) {
  const [editing, setEditing] = useState(null)   // card key currently open for edit

  const slugOrId      = actor.slug || actor.id
  const primaryDomain = actor.domains?.[0] || null
  const dColor        = DOMAIN_COLORS?.[primaryDomain] || GOLD
  const isPortrait    = actor.type === 'practitioner'

  const channels = useMemo(() => (links || [])
    .filter(l => !CONTACT_LINK_TYPES.has(l.link_type))
    .sort((a, b) => (LINK_PRIORITY[a.link_type] ?? 50) - (LINK_PRIORITY[b.link_type] ?? 50)), [links])
  const contacts = useMemo(() => (links || [])
    .filter(l => CONTACT_LINK_TYPES.has(l.link_type))
    .sort((a, b) => (CONTACT_PRIORITY[a.link_type] ?? 9) - (CONTACT_PRIORITY[b.link_type] ?? 9)), [links])

  const floor = useMemo(
    () => computeFloor(actor, channels, contacts, linksLoading),
    [actor, channels, contacts, linksLoading],
  )

  const isSaving = col => savingKey === `${actor.id}:${col}`
  const open  = key => setEditing(e => (e === key ? null : key))
  const isOpen = key => editing === key

  return (
    <div className="mo-room">
      <style>{PANEL_CSS}</style>

      {/* ── Identity strip — mirrors the public org page ── */}
      <div className="mo-eyebrow">MY ORG</div>
      <div className="moc-identity">
        <ActorMark actor={actor} isPortrait={isPortrait}
                   onAdd={() => open('identity')} />
        <div className="moc-identity-body">
          <div className="moc-meta">
            {primaryDomain && (
              <>
                <span className="moc-meta-dot" style={{ background: dColor }} />
                <span className="moc-meta-pill">{domainLabel(primaryDomain)}</span>
              </>
            )}
            {actor.scale && (
              <><Dot /><span className="moc-meta-pill">{scaleLabelFor(actor.scale)}</span></>
            )}
            {actor.type && (
              <><Dot /><span className="moc-meta-pill">
                {actor.type.charAt(0).toUpperCase() + actor.type.slice(1)}
              </span></>
            )}
          </div>

          <h2 className="moc-name">{actor.name}</h2>

          {actor.tagline
            ? <p className="moc-tagline">{actor.tagline}</p>
            : <button type="button" className="moc-inline-add" onClick={() => open('identity')}>
                Add a tagline
              </button>}

          {actor.location_name && <div className="moc-loc">{actor.location_name}</div>}
          {actor.is_platform_founder && <div className="moc-founder">Founder of NextUs</div>}

          <StatusChip actor={actor} floor={floor} />
        </div>
      </div>

      {/* ── Floor readiness ── */}
      <FloorReadiness floor={floor} onFix={open} slugOrId={slugOrId} />

      {/* ── Evidence layer ── */}
      <SectionLabel>What the map sees</SectionLabel>

      <EditCard eyebrow="IDENTITY" open={isOpen('identity')} onToggle={() => open('identity')}>
        {isOpen('identity') ? (
          <div className="moc-edit-grid">
            <EditText label="Tagline" value={actor.tagline}
              placeholder="One line: what this org does, and at what scale."
              saving={isSaving('tagline')}
              onSave={v => saveField('tagline', v)} />
            <EditArea label="One-line description" value={actor.description} rows={2} maxLength={240}
              placeholder="What this org does, in a sentence."
              saving={isSaving('description')}
              onSave={v => saveField('description', v)} />
            <EditText label="Website" value={actor.website} placeholder="https://..."
              saving={isSaving('website')}
              onSave={v => saveField('website', v)} />
            <EditText label="Location" value={actor.location_name}
              placeholder="City, country, or Distributed."
              saving={isSaving('location_name')}
              onSave={v => saveField('location_name', v)} />
            <EditText label="Logo / image URL" value={actor.image_url}
              placeholder="https://... (paste a hosted logo URL)"
              saving={isSaving('image_url')}
              onSave={v => saveField('image_url', v)}
              hint="A square logo reads best. Full image upload lands with the actor-images bucket." />
          </div>
        ) : (
          <>
            <Display label="Tagline"      value={actor.tagline} />
            <Display label="Description"  value={actor.description} />
            <Display label="Website"      value={actor.website} href={actor.website} />
            <Display label="Location"     value={actor.location_name} />
            <Display label="Logo"         value={actor.image_url ? 'Set' : null} />
          </>
        )}
      </EditCard>

      <EditCard eyebrow="PLACEMENT" open={isOpen('placement')} onToggle={() => open('placement')}>
        {isOpen('placement') ? (
          <div className="moc-edit-grid">
            <EditSelect label="Primary domain" value={primaryDomain || ''}
              options={CIV_DOMAIN_OPTIONS} placeholder="Select one…"
              saving={isSaving('domains')}
              onSave={v => {
                const rest = (actor.domains || []).slice(1)
                saveField('domains', v ? [v, ...rest.filter(s => s !== v)] : rest)
              }} />
            <EditDomainSet label="Also working in" primary={primaryDomain}
              value={actor.domains || []}
              saving={isSaving('domains')}
              onSave={arr => saveField('domains', arr)} />
            <EditSelect label="Scale" value={actor.scale || ''}
              options={SCALE_OPTIONS} placeholder="Select one…"
              saving={isSaving('scale')}
              onSave={v => saveField('scale', v || null)} />
          </div>
        ) : (
          <>
            <Display label="Primary domain" value={domainLabel(primaryDomain)} />
            {(actor.domains || []).length > 1 && (
              <Display label="Also working in"
                value={(actor.domains || []).slice(1).map(domainLabel).filter(Boolean).join(', ')} />
            )}
            <Display label="Scale" value={scaleLabelFor(actor.scale)} />
          </>
        )}
      </EditCard>

      <EditCard eyebrow="STORY" open={isOpen('story')} onToggle={() => open('story')}>
        {isOpen('story') ? (
          <EditArea label="Story" value={actor.story} rows={7}
            placeholder="Two to four short paragraphs, third person. What the org does, who it works with, at what scale. Evidence, not marketing."
            saving={isSaving('story')}
            onSave={v => saveField('story', v)} />
        ) : actor.story ? (
          <p className="moc-prose">{actor.story}</p>
        ) : (
          <Empty>No story yet. The description carries the entry until you add one.</Empty>
        )}
      </EditCard>

      {/* Channels + contact live in actor_links; read here, manage in the full manager. */}
      <LinkCard
        eyebrow="CHANNELS"
        items={channels}
        loading={linksLoading}
        emptyToward="No channels yet. Add the places this org publishes."
        manageHref={`/org/${slugOrId}/manage`}
        manageLabel="Manage channels →"
      />

      <LinkCard
        eyebrow="CONTACT"
        items={contacts}
        loading={linksLoading}
        emptyToward="No way to reach this org yet. The floor needs at least one contact path."
        manageHref={`/org/${slugOrId}/manage`}
        manageLabel={contacts.length ? 'Manage contact →' : 'Add a contact path →'}
      />

      {/* ── Voice layer ── */}
      <SectionLabel>Your voice
        <span className="moc-section-note">shown on the public page once claimed</span>
      </SectionLabel>

      <EditCard eyebrow="MISSION" open={isOpen('mission')} onToggle={() => open('mission')}>
        {isOpen('mission') ? (
          <EditArea label="Mission statement" value={actor.mission_statement} rows={3}
            placeholder="First person. What this org is working toward at horizon scale."
            saving={isSaving('mission_statement')}
            onSave={v => saveField('mission_statement', v)} />
        ) : actor.mission_statement ? (
          <p className="moc-mission">{actor.mission_statement}</p>
        ) : (
          <Empty>Not yet set.</Empty>
        )}
      </EditCard>

      <EditCard eyebrow="WORKING ON NOW" open={isOpen('working')} onToggle={() => open('working')}>
        {isOpen('working') ? (
          <EditArea label="Working on now" value={actor.working_on_now} rows={3}
            placeholder="Current focus of the work. Time-bound, in your own words."
            saving={isSaving('working_on_now')}
            onSave={v => saveField('working_on_now', v)} />
        ) : actor.working_on_now ? (
          <p className="moc-prose">{actor.working_on_now}</p>
        ) : (
          <Empty>Not yet set.</Empty>
        )}
      </EditCard>

      <div className="mo-card mo-card-flat">
        <div className="mo-card-head"><span className="mo-card-eyebrow">OFFERS &amp; NEEDS</span></div>
        <div className="mo-card-body">
          <p className="moc-prose-meta">
            Offers, needs, credentials, testimonials, and coordination are managed in the full org manager.
          </p>
          <Link to={`/org/${slugOrId}/manage`} className="moc-text-link">Open the manager →</Link>
        </div>
      </div>

      {/* ── Fill empty fields from a URL (never overwrites) ── */}
      <UpdateFromUrl actor={actor} saveField={saveField} />

      {/* ── Footer ── */}
      <div className="mo-manage-link-row">
        <Link to={`/org/${slugOrId}`} className="mo-manage-link"
              target="_blank" rel="noopener noreferrer">
          View public page →
        </Link>
        <Link to={`/org/${slugOrId}/manage`} className="mo-public-link">
          Open full manager →
        </Link>
      </div>
    </div>
  )
}

// ─── Cockpit pieces ──────────────────────────────────────────

function Dot() {
  return <span className="moc-meta-sep" aria-hidden="true">·</span>
}

function ActorMark({ actor, isPortrait, onAdd }) {
  if (actor.image_url) {
    return (
      <div className="moc-mark-wrap">
        <div className={`moc-mark-frame${isPortrait ? ' is-portrait' : ''}`}>
          <img src={actor.image_url} alt={actor.name} className="moc-mark-img"
               style={{ objectFit: isPortrait ? 'cover' : 'contain',
                        objectPosition: isPortrait ? 'center top' : 'center' }} />
        </div>
      </div>
    )
  }
  return (
    <div className="moc-mark-wrap">
      <button type="button" className="moc-mark-frame moc-mark-empty" onClick={onAdd}>
        <span className="moc-mark-empty-label">Add your mark</span>
      </button>
    </div>
  )
}

function StatusChip({ actor, floor }) {
  const live = actor.status === 'live'
  const owned = !!actor.profile_owner
  const ownLabel = owned ? 'You manage this' : 'Unclaimed'
  return (
    <div className="moc-status">
      <span className={`moc-status-dot${live ? ' is-live' : ''}`} />
      <span className="moc-status-text">
        {live ? 'Live' : 'Draft'} · {ownLabel}
      </span>
    </div>
  )
}

function FloorReadiness({ floor, onFix, slugOrId }) {
  // Nothing to show once the floor is met — the cockpit stays quiet.
  if (floor.met) return null
  return (
    <div className="moc-floor">
      <p className="moc-floor-head">Complete your profile</p>
      <div className="moc-floor-items">
        {floor.missing.map(m => (
          m.card
            ? <button key={m.key} type="button" className="moc-floor-item"
                      onClick={() => onFix(m.card)}>{m.toward}</button>
            : <Link key={m.key} to={`/org/${slugOrId}/manage`}
                    className="moc-floor-item">{m.toward}</Link>
        ))}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <div className="moc-section-label">{children}</div>
}

function EditCard({ eyebrow, open, onToggle, children }) {
  return (
    <div className={`mo-card moc-editcard${open ? ' is-open' : ''}`}>
      <div className="mo-card-head moc-editcard-head">
        <span className="mo-card-eyebrow">{eyebrow}</span>
        <button type="button" className="moc-edit-toggle" onClick={onToggle}>
          {open ? 'Done' : 'Edit'}
        </button>
      </div>
      <div className="mo-card-body">{children}</div>
    </div>
  )
}

function LinkCard({ eyebrow, items, loading, emptyToward, manageHref, manageLabel }) {
  return (
    <div className="mo-card">
      <div className="mo-card-head moc-editcard-head">
        <span className="mo-card-eyebrow">{eyebrow}</span>
        <Link to={manageHref} className="moc-edit-toggle">{manageLabel}</Link>
      </div>
      <div className="mo-card-body">
        {loading ? (
          <Empty>Loading…</Empty>
        ) : items.length === 0 ? (
          <Empty>{emptyToward}</Empty>
        ) : (
          <div className="moc-chips">
            {items.map(l => (
              <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                 className="moc-chip" title={l.url}>
                {l.label || LINK_LABELS[l.link_type] || l.link_type}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Display({ label, value, href }) {
  if (!value) return null
  return (
    <p className="mo-card-display">
      <strong>{label}:</strong>{' '}
      {href
        ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: GOLD_DK }}>{value}</a>
        : value}
    </p>
  )
}

function Empty({ children }) {
  return <p className="moc-empty">{children}</p>
}

// ─── Inline editors (autosave on blur / change) ──────────────

function EditText({ label, value, placeholder, saving, onSave, hint }) {
  const [local, setLocal] = useState(value || '')
  useEffect(() => { setLocal(value || '') }, [value])
  return (
    <label className="moc-field">
      <span className="moc-field-label">{label}{saving && <em className="moc-saving"> saving…</em>}</span>
      <input
        className="mo-input"
        value={local}
        placeholder={placeholder}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { if ((local || '').trim() !== (value || '').trim()) onSave(local.trim() || null) }}
      />
      {hint && <span className="moc-field-hint">{hint}</span>}
    </label>
  )
}

function EditArea({ label, value, rows = 4, maxLength, placeholder, saving, onSave }) {
  const [local, setLocal] = useState(value || '')
  useEffect(() => { setLocal(value || '') }, [value])
  return (
    <label className="moc-field">
      <span className="moc-field-label">{label}{saving && <em className="moc-saving"> saving…</em>}</span>
      <textarea
        className="mo-textarea"
        rows={rows}
        maxLength={maxLength}
        value={local}
        placeholder={placeholder}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { if ((local || '').trim() !== (value || '').trim()) onSave(local.trim() || null) }}
      />
    </label>
  )
}

function EditSelect({ label, value, options, placeholder, saving, onSave }) {
  return (
    <label className="moc-field">
      <span className="moc-field-label">{label}{saving && <em className="moc-saving"> saving…</em>}</span>
      <select className="mo-input" value={value} onChange={e => onSave(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

// Secondary domains: the primary is excluded; the rest are toggled chips.
// Saves the full domains array with the primary kept at index 0.
function EditDomainSet({ label, primary, value, saving, onSave }) {
  const secondary = (value || []).filter(s => s !== primary)
  function toggle(slug) {
    const has = secondary.includes(slug)
    const nextSecondary = has ? secondary.filter(s => s !== slug) : [...secondary, slug]
    onSave(primary ? [primary, ...nextSecondary] : nextSecondary)
  }
  return (
    <div className="moc-field">
      <span className="moc-field-label">{label}{saving && <em className="moc-saving"> saving…</em>}</span>
      <div className="moc-domain-chips">
        {CIV_DOMAINS.filter(d => d.slug !== primary).map(d => {
          const on = secondary.includes(d.slug)
          return (
            <button type="button" key={d.slug}
              className={`moc-domain-chip${on ? ' is-on' : ''}`}
              onClick={() => toggle(d.slug)}>
              {d.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Floor computation ───────────────────────────────────────
// The seven floor requirements, owner-side. `card` set => fixable inline
// (sets editing card); no `card` => fixed in the full manager.

function computeFloor(actor, channels, contacts, linksLoading) {
  const has = v => !!(v && String(v).trim())
  const items = [
    { key: 'domain',  ok: has(actor.domains?.[0]),                 toward: 'Set a primary domain', card: 'placement' },
    { key: 'image',   ok: has(actor.image_url),                    toward: 'Add a logo',           card: 'identity' },
    { key: 'tagline', ok: has(actor.tagline),                      toward: 'Add a tagline',        card: 'identity' },
    { key: 'desc',    ok: has(actor.description),                  toward: 'Add a description',    card: 'identity' },
    { key: 'story',   ok: has(actor.story),                        toward: 'Add your story',       card: 'story' },
    { key: 'channel', ok: linksLoading || channels.some(l => l.link_type !== 'website'), toward: 'Add a channel', card: null },
    { key: 'contact', ok: linksLoading || contacts.length > 0,     toward: 'Add contact info',     card: null },
  ]
  // While links load, don't flash channel/contact as missing.
  const missing = items.filter(i => !i.ok)
  return { met: missing.length === 0, missing, items }
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

// Fill-empty-from-URL. Reads a URL via the same /api/org-extract path the
// setup flow uses, then writes ONLY the evidence fields that are currently
// empty — never overwriting anything the owner already has. Each field is
// saved in place via saveField (no delete-and-reload). Owner-only voice
// fields (mission, working_on_now, the showcase fields) are never touched
// here: the extractor never returns them, and this only fills evidence.
// Update-from-URL with tiered overwrite.
//
// The extractor may write what a website can legitimately state, and must
// never touch what only a human authors or what records real action.
//
//   HARD LOCK (never written, not even offered): the owner-voice fields
//     (mission, working_on_now, offers, and the five showcase fields),
//     identity/ownership plumbing (profile_owner, claimed, slug, id),
//     relationships and provenance, and everything EARNED BY ACTION —
//     galleries, moments, sparks, the tended thing, field-guide ties.
//     None of these are facts a URL states, so the extractor never returns
//     them and this control never reaches them.
//   WARN (replace only on explicit confirm; owner protects per field): the
//     evidence-description fields — description, tagline, impact_summary,
//     domain, scale, location. Existing human-edited content here has value.
//   SILENT (overwrite without asking): website, image/logo — factual, low
//     loss, usually what you're updating from.
//
// Fields not currently set are simply filled. Only fields that already hold
// a value AND would be replaced trigger the warning + per-field checkboxes.

const WARN_FIELDS = [
  { col: 'description',    label: 'description' },
  { col: 'tagline',        label: 'tagline' },
  { col: 'impact_summary', label: 'what you offer' },
  { col: 'domains',        label: 'domain' },
  { col: 'scale',          label: 'scale' },
  { col: 'location_name',  label: 'location' },
]
const SILENT_FIELDS = [
  { col: 'website',   label: 'website' },
  { col: 'image_url', label: 'logo' },
]

function UpdateFromUrl({ actor, saveField }) {
  const [open, setOpen]       = useState(false)
  const [url, setUrl]         = useState('')
  const [busy, setBusy]       = useState(false)
  const [msg, setMsg]         = useState(null)
  const [plan, setPlan]       = useState(null)   // { fills:[[col,val,label]], replaces:[[col,val,label]], silent:[[col,val,label]] }
  const [protect, setProtect] = useState({})     // col -> true means "keep mine, don't replace"

  const isEmpty = v =>
    v === null || v === undefined ||
    (typeof v === 'string' && !v.trim()) ||
    (Array.isArray(v) && v.length === 0)

  function valueFor(col, mapped) {
    if (col === 'domains') return mapped.primary_domain ? [mapped.primary_domain] : null
    if (col === 'tagline') return mapped.tagline || null
    if (col === 'image_url') return mapped.image_url || null
    return mapped[col] || null
  }

  async function read() {
    if (!url.trim() || busy) return
    setBusy(true); setMsg(null); setPlan(null)
    try {
      const res = await fetch('/api/org-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: url.trim() }),
      })
      const data = await res.json()
      if (data.error) { setMsg(data.message || 'Could not read that URL. Nothing was changed.'); return }
      const planet = (data.results || []).find(r => r.label === 'Planet' || r.track === 'planet')
      if (!planet) { setMsg('Did not find an organisation at that URL. Nothing was changed.'); return }
      const mapped = mapExtractToForm(planet)

      const fills = [], replaces = [], silent = []
      for (const { col, label } of WARN_FIELDS) {
        const val = valueFor(col, mapped)
        if (val === null || val === undefined) continue
        if (isEmpty(actor[col])) fills.push([col, val, label])
        else replaces.push([col, val, label])
      }
      for (const { col, label } of SILENT_FIELDS) {
        const val = valueFor(col, mapped)
        if (val !== null && val !== undefined) silent.push([col, val, label])
      }

      if (fills.length === 0 && replaces.length === 0 && silent.length === 0) {
        setMsg('The site did not give anything new to add.'); return
      }
      setPlan({ fills, replaces, silent })
      setProtect({})   // default: replace everything in the warn tier
    } catch {
      setMsg('Could not reach the reader. Nothing was changed.')
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    if (!plan || busy) return
    setBusy(true); setMsg(null)
    try {
      const writes = [
        ...plan.fills,
        ...plan.replaces.filter(([col]) => !protect[col]),
        ...plan.silent,
      ]
      for (const [col, value] of writes) await saveField(col, value)
      const kept = plan.replaces.filter(([col]) => protect[col]).length
      const n = writes.length
      setMsg(
        `Updated ${n} field${n === 1 ? '' : 's'}` +
        (kept ? ` · kept ${kept} you protected` : '') +
        '. Review above and edit anything that is not quite right.'
      )
      setPlan(null); setUrl('')
    } catch {
      setMsg('Something went wrong part-way. Check the fields above.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="mo-fromurl-row">
        <button type="button" className="mo-fromurl-toggle" onClick={() => setOpen(true)}>
          Update from url
        </button>
      </div>
    )
  }

  return (
    <div className="mo-fromurl">
      <label className="mo-fromurl-label">Read a website and update your profile from it</label>
      <div className="mo-fromurl-input-row">
        <input
          className="mo-fromurl-input"
          type="url"
          placeholder="https://your-site.org"
          value={url}
          onChange={e => { setUrl(e.target.value); setPlan(null) }}
          disabled={busy}
        />
        <button type="button" className="mo-fromurl-go" onClick={read} disabled={!url.trim() || busy || !!plan}>
          {busy && !plan ? 'Reading…' : 'Read site'}
        </button>
      </div>
      <p className="mo-fromurl-note">
        Your mission, your voice, your galleries and everything you have earned through real action are never touched.
      </p>

      {plan && (
        <div className="mo-fromurl-plan">
          {plan.fills.length > 0 && (
            <p className="mo-fromurl-planline">
              Will fill {plan.fills.length} empty field{plan.fills.length === 1 ? '' : 's'}: {plan.fills.map(f => f[2]).join(', ')}.
            </p>
          )}
          {plan.silent.length > 0 && (
            <p className="mo-fromurl-planline">
              Will update {plan.silent.map(s => s[2]).join(', ')}.
            </p>
          )}

          {plan.replaces.length > 0 && (
            <div className="mo-fromurl-warn">
              <p className="mo-fromurl-warn-head">
                This will overwrite what you have already written in these fields. Copy anything you want to keep first, or tick a field to protect it.
              </p>
              {plan.replaces.map(([col, , label]) => (
                <label key={col} className="mo-fromurl-check">
                  <input
                    type="checkbox"
                    checked={!!protect[col]}
                    onChange={e => setProtect(p => ({ ...p, [col]: e.target.checked }))}
                  />
                  <span>Keep my {label}</span>
                </label>
              ))}
            </div>
          )}

          <div className="mo-fromurl-actions">
            <button type="button" className="mo-fromurl-go" onClick={apply} disabled={busy}>
              {busy ? 'Updating…' : plan.replaces.some(([c]) => !protect[c]) ? 'Overwrite and update' : 'Update'}
            </button>
            <button type="button" className="mo-fromurl-cancel" onClick={() => { setPlan(null); setMsg(null) }} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {msg && <p className="mo-fromurl-msg">{msg}</p>}
    </div>
  )
}

function mapExtractToForm(planet) {
  const out = {}
  if (planet.name)           out.name = String(planet.name).slice(0, 240)
  if (planet.description)    out.description = String(planet.description).slice(0, 240)
  if (planet.tagline)        out.tagline = String(planet.tagline).slice(0, 240)
  if (planet.image_url)      out.image_url = String(planet.image_url)
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
.mo-card-flat { background: ${BG_CARD_EMPTY}; }
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

.mo-fromurl-row { margin: 18px 0 4px; }
.mo-fromurl-toggle {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 13px;
  color: rgba(15,21,35,0.55);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.mo-fromurl-toggle:hover { color: rgba(15,21,35,0.8); }
.mo-fromurl { margin: 18px 0 4px; }
.mo-fromurl-label {
  display: block;
  font-size: 13px;
  color: rgba(15,21,35,0.7);
  margin-bottom: 6px;
}
.mo-fromurl-input-row { display: flex; gap: 8px; }
.mo-fromurl-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  font: inherit;
  font-size: 14px;
  border: 1px solid rgba(15,21,35,0.2);
  border-radius: 6px;
}
.mo-fromurl-go {
  padding: 8px 14px;
  font: inherit;
  font-size: 13px;
  border: 1px solid rgba(15,21,35,0.25);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  white-space: nowrap;
}
.mo-fromurl-go:disabled { opacity: 0.5; cursor: not-allowed; }
.mo-fromurl-note {
  font-size: 12px;
  color: rgba(15,21,35,0.5);
  margin: 6px 0 0;
}
.mo-fromurl-msg {
  font-size: 13px;
  color: rgba(15,21,35,0.72);
  margin: 6px 0 0;
  line-height: 1.5;
}
.mo-fromurl-plan { margin-top: 12px; }
.mo-fromurl-planline {
  font-size: 13px;
  color: rgba(15,21,35,0.72);
  margin: 4px 0;
  line-height: 1.5;
}
.mo-fromurl-warn {
  margin: 10px 0;
  padding: 12px;
  border: 1px solid rgba(138,48,48,0.35);
  border-radius: 6px;
  background: rgba(138,48,48,0.05);
}
.mo-fromurl-warn-head {
  font-size: 13px;
  color: #8A3030;
  margin: 0 0 8px;
  line-height: 1.5;
}
.mo-fromurl-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(15,21,35,0.8);
  margin: 4px 0;
  cursor: pointer;
}
.mo-fromurl-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.mo-fromurl-cancel {
  padding: 8px 14px;
  font: inherit;
  font-size: 13px;
  border: 1px solid rgba(15,21,35,0.2);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}
.mo-fromurl-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

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

/* ── Cockpit: identity strip ──────────────────────────────── */
.moc-identity {
  display: flex; gap: 20px; align-items: flex-start;
  margin: 4px 0 22px;
}
@media (max-width: 560px) { .moc-identity { gap: 14px; } }
.moc-mark-wrap { flex-shrink: 0; padding: 6px; }
.moc-mark-frame {
  width: 96px; height: 96px;
  border-radius: 4px; overflow: hidden;
  border: 1.5px solid rgba(110,127,92,0.70);
  outline: 1px solid rgba(110,127,92,0.35);
  outline-offset: 5px;
  background: ${BG_CARD};
  display: flex; align-items: center; justify-content: center;
  padding: 14px; box-sizing: border-box;
}
.moc-mark-frame.is-portrait { padding: 0; background: rgba(110,127,92,0.05); }
.moc-mark-img { width: 100%; height: 100%; display: block; }
.moc-mark-empty {
  cursor: pointer; padding: 8px;
  background: ${BG_CARD_EMPTY};
  border-style: dashed;
}
.moc-mark-empty:hover { background: ${GOLD_HOVER}; }
.moc-mark-empty-label {
  font-family: ${FONT_SC}; font-size: 11px; letter-spacing: 0.1em;
  color: ${GOLD_DK}; text-align: center; line-height: 1.3;
}
.moc-identity-body { flex: 1; min-width: 200px; }
.moc-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.moc-meta-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.moc-meta-sep { color: rgba(110,127,92,0.45); font-size: 13px; }
.moc-meta-pill {
  font-family: ${FONT_SC}; font-size: 13px; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase; color: ${TEXT_META};
}
.moc-name {
  font-family: ${FONT_DISPLAY}; font-size: clamp(30px, 5vw, 46px); font-weight: 300;
  color: ${TEXT_INK}; line-height: 1.05; letter-spacing: -0.012em; margin: 0 0 12px;
}
.moc-tagline {
  font-family: ${FONT_BODY}; font-size: 19px; font-weight: 500;
  color: rgba(15,21,35,0.82); line-height: 1.45; margin: 0 0 14px;
}
.moc-inline-add {
  font-family: ${FONT_SC}; font-size: 12px; letter-spacing: 0.12em;
  color: ${GOLD_DK}; background: none; border: 1px dashed ${GOLD_RULE};
  border-radius: 40px; padding: 5px 12px; cursor: pointer; margin: 0 0 14px;
}
.moc-inline-add:hover { background: ${GOLD_HOVER}; }
.moc-loc, .moc-founder {
  font-family: ${FONT_SC}; font-size: 13px; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 8px;
}
.moc-loc { color: ${TEXT_META}; }
.moc-founder { color: ${GOLD_DK}; }
.moc-status { display: inline-flex; align-items: center; gap: 8px; margin-top: 4px; }
.moc-status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: ${TEXT_FAINT}; flex-shrink: 0;
}
.moc-status-dot.is-live { background: ${GOLD}; }
.moc-status-text {
  font-family: ${FONT_SC}; font-size: 13px; letter-spacing: 0.1em;
  color: ${TEXT_META}; text-transform: uppercase;
}

/* ── Cockpit: floor readiness ─────────────────────────────── */
.moc-floor {
  margin: 0 0 22px; padding: 14px 18px;
  background: ${GOLD_FAINT}; border: 1px solid ${GOLD_RULE};
  border-radius: 14px;
}
.moc-floor-head {
  font-family: ${FONT_SC}; font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; color: ${GOLD_DK}; margin: 0 0 10px;
}
.moc-floor-items { display: flex; flex-wrap: wrap; gap: 8px; }
.moc-floor-item {
  font-family: ${FONT_BODY}; font-size: 13.5px; color: ${TEXT_INK};
  background: #FFFFFF; border: 1px solid ${GOLD_RULE};
  border-radius: 40px; padding: 5px 14px; cursor: pointer;
  text-decoration: none; display: inline-block;
}
.moc-floor-item:hover { border-color: ${GOLD}; background: ${GOLD_HOVER}; }

/* ── Cockpit: section labels ──────────────────────────────── */
.moc-section-label {
  font-family: ${FONT_SC}; font-size: 12px; letter-spacing: 0.18em;
  text-transform: uppercase; color: ${TEXT_META};
  margin: 12px 0 12px; padding-bottom: 8px;
  border-bottom: 1px solid ${GOLD_RULE};
  display: flex; align-items: baseline; gap: 10px;
}
.moc-section-note {
  font-family: ${FONT_BODY}; font-size: 12px; letter-spacing: 0;
  text-transform: none; color: ${TEXT_FAINT};
}

/* ── Cockpit: editable cards ──────────────────────────────── */
.moc-editcard.is-open { border-color: ${GOLD}; }
.moc-editcard-head {
  display: flex; align-items: center; justify-content: space-between;
}
.moc-edit-toggle {
  font-family: ${FONT_SC}; font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; color: ${GOLD_DK};
  background: none; border: none; cursor: pointer; text-decoration: none;
  padding: 0;
}
.moc-edit-toggle:hover { color: ${GOLD}; }
.moc-edit-grid { display: flex; flex-direction: column; gap: 14px; }
.moc-field { display: flex; flex-direction: column; gap: 5px; }
.moc-field-label {
  font-family: ${FONT_SC}; font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; color: ${GOLD_DK};
}
.moc-saving { color: ${TEXT_FAINT}; letter-spacing: 0.03em; }
.moc-field-hint {
  font-family: ${FONT_BODY}; font-size: 12.5px; color: ${TEXT_FAINT}; line-height: 1.45;
}
.moc-prose {
  font-family: ${FONT_BODY}; font-size: 15px; color: ${TEXT_INK};
  line-height: 1.6; margin: 0; white-space: pre-wrap;
}
.moc-prose-meta {
  font-family: ${FONT_BODY}; font-size: 13.5px; color: ${TEXT_META};
  line-height: 1.55; margin: 0 0 8px;
}
.moc-mission {
  font-family: ${FONT_DISPLAY}; font-size: 21px; font-weight: 300;
  color: ${TEXT_INK}; line-height: 1.4; margin: 0; white-space: pre-wrap;
}
.moc-text-link {
  font-family: ${FONT_SC}; font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; color: ${GOLD_DK}; text-decoration: none;
}
.moc-text-link:hover { color: ${GOLD}; }
.moc-empty {
  font-family: ${FONT_BODY}; font-size: 14px; color: ${TEXT_FAINT};
  margin: 0; line-height: 1.55;
}

/* ── Cockpit: channel / contact chips ─────────────────────── */
.moc-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.moc-chip {
  font-family: ${FONT_SC}; font-size: 12px; letter-spacing: 0.1em;
  color: ${GOLD_DK}; background: rgba(110,127,92,0.06);
  border: 1px solid ${GOLD_RULE}; border-radius: 40px;
  padding: 5px 13px; text-decoration: none;
}
.moc-chip:hover { border-color: ${GOLD}; background: ${GOLD_HOVER}; }

/* ── Cockpit: domain chips ────────────────────────────────── */
.moc-domain-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.moc-domain-chip {
  font-family: ${FONT_BODY}; font-size: 13px; color: ${TEXT_META};
  background: #FFFFFF; border: 1px solid ${GOLD_RULE};
  border-radius: 40px; padding: 5px 12px; cursor: pointer;
}
.moc-domain-chip.is-on { background: ${GOLD}; color: #FFFFFF; border-color: ${GOLD}; }

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
  font-family: 'IBM Plex Mono', Georgia, serif;
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
