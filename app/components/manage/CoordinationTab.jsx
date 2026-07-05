// src/app/components/manage/CoordinationTab.jsx
//
// Manages an actor's offers and needs — the coordination layer of the profile.
// Both tables share identical shape: title, description, active, domains,
// location_mode, location_specifics.

import { useState, useEffect } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  body, sc, gold, dark, parch,
  Label, Hint, Btn, TextInput, TextArea, SelectInput,
} from '../OrgShared'
import { CIV_DOMAINS } from '../NextUsWheel'
import { FocusSearch } from '../FocusSearch'

const LOCATION_MODES = [
  { value: 'anywhere',   label: 'Anywhere — I am open to working with anyone' },
  { value: 'specific',   label: 'Specific places — I am focused on these locations' },
  { value: 'local_only', label: 'Local only — keep this rooted in my own region' },
]

const TIMING_OPTIONS = [
  { value: 'flexible',  label: 'Flexible — no particular timing' },
  { value: 'ongoing',   label: 'Ongoing — this is always open' },
  { value: 'one_time',  label: 'One-time — single engagement' },
  { value: 'by_date',   label: 'By a date — needs to happen by a specific time' },
]

const EXCHANGE_OPTIONS = [
  { value: 'not_applicable', label: '— not specified' },
  { value: 'paid',           label: 'Paid' },
  { value: 'unpaid',         label: 'Unpaid' },
  { value: 'volunteer',      label: 'Volunteer' },
  { value: 'barter',         label: 'Barter / trade' },
  { value: 'mutual',         label: 'Mutual exchange' },
]

const FORMAT_OPTIONS = [
  { value: '',              label: '— not specified' },
  { value: 'service',       label: 'Service' },
  { value: 'consultation',  label: 'Consultation' },
  { value: 'asset',         label: 'Asset (deliverable)' },
  { value: 'introduction',  label: 'Introduction' },
  { value: 'mentorship',    label: 'Mentorship' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'other',         label: 'Other' },
]

const URGENCY_OPTIONS = [
  { value: 'low',    label: 'Low — when convenient' },
  { value: 'medium', label: 'Medium — moderate priority' },
  { value: 'high',   label: 'High — time-sensitive' },
]

const EMPTY_ITEM = {
  title: '',
  description: '',
  active: true,
  domains: [],
  location_mode: 'anywhere',
  location_specifics: '',
  // Structured fields (Phase 7)
  why: '',
  timing: 'flexible',
  timing_date: '',
  exchange_type: 'not_applicable',
  compensation_range: '',
  format: '',
  urgency: 'low',
  target_focus_id: null,
  target_focus_name: '',   // for display only, not saved
}

// ── Edit form (used for both offers and needs) ───────────────

function ItemForm({ initial, onSave, onCancel, saving, kind }) {
  const [form, setForm] = useState({ ...EMPTY_ITEM, ...(initial || {}) })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function toggleDomain(slug) {
    const curr = form.domains || []
    set('domains', curr.includes(slug) ? curr.filter(d => d !== slug) : [...curr, slug])
  }

  const accent = kind === 'offer' ? '#2A6B3A' : '#2A4A8A'

  return (
    <div style={{ background: '#FFFFFF',
      border: `1px solid ${accent}30`,
      borderRadius: '10px', padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: '18px' }}>

      <div>
        <Label>Title</Label>
        <Hint>{kind === 'offer'
          ? 'A short statement of what you offer. Example: "B-roll for NGOs while travelling"'
          : 'A short statement of what you need. Example: "Looking for podcast guests in Nature domain"'}
        </Hint>
        <TextInput value={form.title} onChange={v => set('title', v)}
          placeholder={kind === 'offer' ? "What you offer" : "What you need"} />
      </div>

      <div>
        <Label>Description (optional)</Label>
        <Hint>Add detail if helpful. Otherwise leave blank.</Hint>
        <TextArea value={form.description} onChange={v => set('description', v)}
          rows={3} placeholder="Optional detail" />
      </div>

      <div>
        <Label>Why (optional)</Label>
        <Hint>The context behind this {kind}. Why does it exist? What problem does it solve? Helps people decide if it fits them.</Hint>
        <TextArea value={form.why} onChange={v => set('why', v)}
          rows={2} placeholder="The bigger picture..." />
      </div>

      <div>
        <Label>Domains (optional)</Label>
        <Hint>Where this {kind} surfaces. Leave empty to inherit from your profile's primary domains.</Hint>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
          {CIV_DOMAINS.map(d => {
            const on = (form.domains || []).includes(d.slug)
            return (
              <button key={d.slug} type="button" onClick={() => toggleDomain(d.slug)}
                style={{ ...sc, fontSize: '12px', letterSpacing: '0.06em',
                  padding: '5px 12px', borderRadius: '40px', cursor: 'pointer',
                  border: on ? `1.5px solid ${accent}` : '1.5px solid rgba(88,160,138,0.25)',
                  background: on ? `${accent}10` : 'transparent',
                  color: on ? accent : 'rgba(15,21,35,0.65)' }}>
                {d.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <Label>Scale of engagement (optional)</Label>
        <Hint>What scale is this {kind} pitched at? Pick the Focus that names the scale — your neighbourhood, your city, your country, Earth, or a specific place. Leave empty if it doesn't matter.</Hint>
        <FocusSearch
          value={form.target_focus_id ? { id: form.target_focus_id, name: form.target_focus_name } : null}
          onChange={(focus) => {
            set('target_focus_id', focus?.id || null)
            set('target_focus_name', focus?.name || '')
          }}
          placeholder="Search for a place, scale, or Focus..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <Label>Timing</Label>
          <SelectInput value={form.timing}
            onChange={v => set('timing', v)}
            options={TIMING_OPTIONS} />
          {form.timing === 'by_date' && (
            <div style={{ marginTop: '8px' }}>
              <input type="date" value={form.timing_date || ''}
                onChange={e => set('timing_date', e.target.value)}
                style={{ ...body, padding: '8px 12px',
                  border: '1px solid rgba(88,160,138,0.25)',
                  borderRadius: '6px', fontSize: '13px', width: '100%',
                  background: '#FFFFFF' }} />
            </div>
          )}
        </div>
        <div>
          <Label>Urgency</Label>
          <SelectInput value={form.urgency}
            onChange={v => set('urgency', v)}
            options={URGENCY_OPTIONS} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <Label>Exchange type</Label>
          <SelectInput value={form.exchange_type}
            onChange={v => set('exchange_type', v)}
            options={EXCHANGE_OPTIONS} />
          {form.exchange_type === 'paid' && (
            <div style={{ marginTop: '8px' }}>
              <TextInput value={form.compensation_range}
                onChange={v => set('compensation_range', v)}
                placeholder="Optional range, e.g. $1500-2500 / day rate" />
            </div>
          )}
        </div>
        <div>
          <Label>Format</Label>
          <SelectInput value={form.format}
            onChange={v => set('format', v)}
            options={FORMAT_OPTIONS} />
        </div>
      </div>

      <div>
        <Label>Location</Label>
        <Hint>Most {kind}s can travel anywhere. Pick the mode that fits.</Hint>
        <SelectInput value={form.location_mode}
          onChange={v => set('location_mode', v)}
          options={LOCATION_MODES} />
        {form.location_mode === 'specific' && (
          <div style={{ marginTop: '10px' }}>
            <TextInput value={form.location_specifics}
              onChange={v => set('location_specifics', v)}
              placeholder="e.g. Southeast Asia Q3, or Mexico City and surrounding states" />
          </div>
        )}
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px',
          cursor: 'pointer' }}>
          <input type="checkbox" checked={form.active}
            onChange={e => set('active', e.target.checked)}
            style={{ cursor: 'pointer' }} />
          <span style={{ ...body, fontSize: '14px', color: dark }}>
            Active — visible on my profile and in search
          </span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <Btn onClick={() => onSave(form)} disabled={saving || !form.title.trim()}>
          {saving ? 'Saving...' : initial?.id ? 'Save changes' : `Add ${kind}`}
        </Btn>
        <button onClick={onCancel}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
            color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none',
            cursor: 'pointer', padding: '12px 18px' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Card (read state) ────────────────────────────────────────

function ItemCard({ item, kind, onEdit, onDelete, onToggleActive, saving }) {
  const accent = kind === 'offer' ? '#2A6B3A' : '#2A4A8A'
  const accentBg = kind === 'offer' ? 'rgba(42,107,58,0.04)' : 'rgba(42,74,138,0.04)'

  return (
    <div style={{ background: item.active ? '#FFFFFF' : 'rgba(15,21,35,0.02)',
      border: `1px solid ${accent}30`,
      borderRadius: '10px', padding: '16px 18px',
      opacity: item.active ? 1 : 0.65 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
        <h3 style={{ ...body, fontSize: '15px', fontWeight: 400, color: dark, margin: 0, lineHeight: 1.4, flex: 1 }}>
          {item.title}
        </h3>
        {!item.active && (
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.12em',
            color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>
            Inactive
          </span>
        )}
      </div>
      {item.description && (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.55, margin: '0 0 10px' }}>
          {item.description}
        </p>
      )}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => onEdit(item)} disabled={saving}
          style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em',
            color: gold, background: 'none', border: 'none',
            cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' }}>
          Edit
        </button>
        <button onClick={() => onToggleActive(item)} disabled={saving}
          style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em',
            color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none',
            cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' }}>
          {item.active ? 'Deactivate' : 'Reactivate'}
        </button>
        <button onClick={() => onDelete(item)} disabled={saving}
          style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em',
            color: '#8A3030', background: 'none', border: 'none',
            cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' }}>
          Delete
        </button>
      </div>
    </div>
  )
}

// ── Section: Offers or Needs ─────────────────────────────────

function ItemSection({ actorId, kind, toast }) {
  const table = kind === 'offer' ? 'actor_offers' : 'actor_needs'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)  // item being edited (or 'new')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from(table)
      .select('*, target_focus:target_focus_id(id, name)')
      .eq('actor_id', actorId).order('sort_order')
    // Flatten target_focus.name into target_focus_name for the form
    const flattened = (data || []).map(item => ({
      ...item,
      target_focus_name: item.target_focus?.name || '',
    }))
    setItems(flattened)
    setLoading(false)
  }
  useEffect(() => { load() }, [actorId])

  async function save(form) {
    setSaving(true)
    const payload = {
      actor_id:           actorId,
      title:              form.title.trim(),
      description:        form.description.trim() || null,
      active:             form.active !== false,
      domains:            form.domains?.length ? form.domains : null,
      location_mode:      form.location_mode || 'anywhere',
      location_specifics: form.location_specifics?.trim() || null,
      // Structured fields (Phase 7)
      why:                form.why?.trim() || null,
      timing:             form.timing || 'flexible',
      timing_date:        form.timing_date || null,
      exchange_type:      form.exchange_type || 'not_applicable',
      compensation_range: form.compensation_range?.trim() || null,
      format:             form.format || null,
      urgency:            form.urgency || 'low',
      target_focus_id:    form.target_focus_id || null,
    }
    if (form.id) {
      // Update
      const { error } = await supabase.from(table)
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', form.id)
      if (error) { toast('Save failed: ' + error.message); setSaving(false); return }
    } else {
      // Insert
      const { error } = await supabase.from(table).insert(payload)
      if (error) { toast('Save failed: ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    setEditing(null)
    toast(`${kind} ${form.id ? 'updated' : 'added'}`)
    load()
  }

  async function toggleActive(item) {
    setSaving(true)
    await supabase.from(table)
      .update({ active: !item.active, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    setSaving(false)
    load()
  }

  async function deleteItem(item) {
    if (!confirm(`Delete this ${kind}? This cannot be undone.`)) return
    setSaving(true)
    await supabase.from(table).delete().eq('id', item.id)
    setSaving(false)
    toast(`${kind} deleted`)
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em',
          color: kind === 'offer' ? '#2A6B3A' : '#2A4A8A',
          textTransform: 'uppercase' }}>
          {kind === 'offer' ? 'Your offers' : 'Your needs'}
        </span>
        {editing === null && (
          <Btn onClick={() => setEditing('new')}>
            Add {kind}
          </Btn>
        )}
      </div>

      {editing === 'new' && (
        <ItemForm initial={null} kind={kind} saving={saving}
          onSave={save} onCancel={() => setEditing(null)} />
      )}

      {loading ? (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>Loading…</p>
      ) : items.length === 0 && editing !== 'new' ? (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
          fontStyle: 'italic', margin: 0 }}>
          {kind === 'offer'
            ? 'No offers yet. What do you bring to the ecosystem?'
            : 'No needs yet. What are you looking for?'}
        </p>
      ) : (
        items.map(item => (
          editing?.id === item.id ? (
            <ItemForm key={item.id} initial={item} kind={kind} saving={saving}
              onSave={save} onCancel={() => setEditing(null)} />
          ) : (
            <ItemCard key={item.id} item={item} kind={kind} saving={saving}
              onEdit={setEditing}
              onDelete={deleteItem}
              onToggleActive={toggleActive} />
          )
        ))
      )}
    </div>
  )
}

// ── Main tab component ──────────────────────────────────────

export function CoordinationTab({ actorId, toast }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div style={{ background: 'rgba(88,160,138,0.04)',
        border: '1px solid rgba(88,160,138,0.18)',
        borderRadius: '10px', padding: '14px 18px' }}>
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.6, margin: 0 }}>
          Offers are what you bring. Needs are what you are looking for.
          Both show on your profile and surface in search and on domain pages.
          Keep them current — toggle inactive when something no longer applies.
        </p>
      </div>

      <ItemSection actorId={actorId} kind="offer" toast={toast} />
      <ItemSection actorId={actorId} kind="need" toast={toast} />
    </div>
  )
}
