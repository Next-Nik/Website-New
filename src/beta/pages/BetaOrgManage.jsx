// src/beta/pages/BetaOrgManage.jsx
// Module 6: org management at /beta/org/:id/manage
// Ported from NextUsActorManage.jsx. Four-dimensional Domains tab.
// Auth-gated: user.id must match nextus_actors.profile_owner.

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import {
  body, sc, gold, dark, parch,
  DOMAIN_LIST, DOMAIN_LABEL, SUBDOMAIN_MAP, SCALE_OPTIONS,
  OFFERING_TYPES, CONTRIBUTION_MODES, ACCESS_TYPES,
  CONTRIBUTION_TYPE_LABEL, PLATFORM_PRINCIPLE_LIST,
  Label, Hint, SectionCard, Btn, TextInput, TextArea, SelectInput,
  ModeSelector,
} from '../components/OrgShared'
import { OrgToast } from '../components/OrgToast'
import { FocusSearch } from '../components/FocusSearch'
import { GeocodeBtn } from '../components/GeocodeBtn'
import { OrgDomainsTab } from '../components/OrgDomainsTab'
import { OrgNeedsTab } from '../components/OrgNeedsTab'
import { PrincipleStrip } from '../components/PrincipleStrip'

// ── Chip multi-select ────────────────────────────────────────

function DomainChips({ selected, onChange }) {
  function toggle(val) {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {DOMAIN_LIST.map(d => {
        const on = selected.includes(d.value)
        return (
          <button key={d.value} type="button" onClick={() => toggle(d.value)}
            style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', padding: '6px 14px', borderRadius: '40px', cursor: 'pointer', border: on ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.25)', background: on ? 'rgba(200,146,42,0.10)' : 'transparent', color: on ? gold : 'rgba(15,21,35,0.55)', transition: 'all 0.15s' }}>
            {d.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Tab: Profile ─────────────────────────────────────────────

function ProfileTab({ actor, onSave, toast }) {
  const [form, setForm] = useState({
    name:           actor.name || '',
    description:    actor.description || '',
    impact_summary: actor.impact_summary || '',
    reach:          actor.reach || '',
    website:        actor.website || '',
    scale:          actor.scale || 'national',
    location_name:  actor.location_name || '',
    lat:            actor.lat ?? '',
    lng:            actor.lng ?? '',
  })
  const [focus, setFocus] = useState(
    actor.focus_id ? { id: actor.focus_id, name: actor.focus?.name || '', type: actor.focus?.type || '' } : null
  )
  const [saving, setSaving] = useState(false)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function save() {
    if (!form.name.trim()) { toast('Name is required'); return }
    setSaving(true)
    const { error } = await supabase.from('nextus_actors').update({
      name:           form.name.trim(),
      description:    form.description.trim() || null,
      impact_summary: form.impact_summary.trim() || null,
      reach:          form.reach.trim() || null,
      website:        form.website.trim() || null,
      scale:          form.scale || null,
      location_name:  form.location_name.trim() || null,
      lat:            form.lat !== '' ? parseFloat(form.lat) : null,
      lng:            form.lng !== '' ? parseFloat(form.lng) : null,
      focus_id:       focus?.id || null,
      updated_at:     new Date().toISOString(),
    }).eq('id', actor.id)
    setSaving(false)
    if (error) { toast('Error saving: ' + error.message); return }
    toast('Profile saved')
    onSave()
  }

  return (
    <div style={{ maxWidth: '620px' }}>
      <SectionCard>
        <div style={{ marginBottom: '20px' }}>
          <Label required>Name</Label>
          <TextInput value={form.name} onChange={v => set('name', v)} placeholder="Organisation or project name" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <Label>Scale</Label>
            <SelectInput value={form.scale} onChange={v => set('scale', v)} options={SCALE_OPTIONS} />
          </div>
          <div>
            <Label>Location</Label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <TextInput value={form.location_name} onChange={v => set('location_name', v)} placeholder="e.g. Nairobi, Kenya" />
              </div>
              <GeocodeBtn locationName={form.location_name} onResult={(lat, lng) => { set('lat', lat); set('lng', lng) }} />
            </div>
            <Hint>Type a location then tap Geocode to fill coordinates.</Hint>
            {(form.lat || form.lng) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div>
                  <Label>Latitude</Label>
                  <TextInput value={form.lat} onChange={v => set('lat', v)} placeholder="e.g. -1.286" type="number" />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <TextInput value={form.lng} onChange={v => set('lng', v)} placeholder="e.g. 36.817" type="number" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <Label>Focus</Label>
          <FocusSearch value={focus} onChange={setFocus} />
          <Hint>Place this organisation on the geographic map.</Hint>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <Label>Website</Label>
          <TextInput value={form.website} onChange={v => set('website', v)} placeholder="https://…" />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <Label>Description</Label>
          <TextArea value={form.description} onChange={v => set('description', v)} placeholder="What you do and why it matters." rows={4} />
          <Hint>This is the first thing visitors read. Make it honest and specific.</Hint>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <Label>Impact summary</Label>
          <TextArea value={form.impact_summary} onChange={v => set('impact_summary', v)} placeholder="What impact have you demonstrated? Be specific — numbers, geographies, outcomes." rows={3} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Label>Reach</Label>
          <TextInput value={form.reach} onChange={v => set('reach', v)} placeholder="e.g. 40 countries, 12,000 farmers" />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Btn onClick={save} disabled={saving} variant="solid">{saving ? 'Saving…' : 'Save profile'}</Btn>
          <Link to={`/beta/org/${actor.id}`} target="_blank"
            style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', padding: '12px 24px', borderRadius: '40px', border: '1px solid rgba(15,21,35,0.25)', color: 'rgba(15,21,35,0.55)', textDecoration: 'none' }}>
            View public profile →
          </Link>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Tab: Offerings ───────────────────────────────────────────

const EMPTY_OFFERING = {
  title: '', offering_type: 'tool', contribution_mode: 'functional',
  description: '', url: '', access_type: 'free', domain_ids: [], is_flagship: false,
}

function OfferingForm({ initial = EMPTY_OFFERING, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  return (
    <div style={{ background: 'rgba(200,146,42,0.03)', border: '1.5px solid rgba(200,146,42,0.30)', borderRadius: '14px', padding: '24px 28px', marginBottom: '20px' }}>
      <div style={{ marginBottom: '18px' }}>
        <Label required>Title</Label>
        <TextInput value={form.title} onChange={v => set('title', v)} placeholder="e.g. Soil carbon monitoring, Community grants programme" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
        <div>
          <Label required>Type</Label>
          <SelectInput value={form.offering_type} onChange={v => set('offering_type', v)} options={OFFERING_TYPES} />
        </div>
        <div>
          <Label required>Access</Label>
          <SelectInput value={form.access_type} onChange={v => set('access_type', v)} options={ACCESS_TYPES} />
        </div>
      </div>
      <div style={{ marginBottom: '18px' }}>
        <Label required>Contribution mode</Label>
        <div style={{ marginTop: '10px' }}>
          <ModeSelector value={form.contribution_mode} onChange={v => set('contribution_mode', v)} />
        </div>
      </div>
      <div style={{ marginBottom: '18px' }}>
        <Label>Description</Label>
        <TextArea value={form.description} onChange={v => set('description', v)} placeholder="What does this offering do? Who is it for?" rows={3} />
      </div>
      <div style={{ marginBottom: '18px' }}>
        <Label>URL</Label>
        <TextInput value={form.url} onChange={v => set('url', v)} placeholder="https://…" />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <Label>Domains this offering serves</Label>
        <div style={{ marginTop: '10px' }}>
          <DomainChips selected={form.domain_ids} onChange={v => set('domain_ids', v)} />
        </div>
      </div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_flagship} onChange={e => set('is_flagship', e.target.checked)} style={{ width: '16px', height: '16px', accentColor: gold }} />
          <span style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>This is our flagship offering</span>
        </label>
        <Hint>Flagship offerings are shown first on your public profile.</Hint>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Btn onClick={() => onSave(form)} disabled={saving || !form.title.trim()} variant="solid">
          {saving ? 'Saving…' : 'Save offering'}
        </Btn>
        <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
      </div>
    </div>
  )
}

function OfferingCard({ offering, onEdit, onDelete, onToggleFlagship, saving }) {
  const typeLabel   = OFFERING_TYPES.find(t => t.value === offering.offering_type)?.label || offering.offering_type
  const modeLabel   = CONTRIBUTION_MODES.find(m => m.value === offering.contribution_mode)?.label || offering.contribution_mode
  const accessLabel = ACCESS_TYPES.find(a => a.value === offering.access_type)?.label || offering.access_type

  return (
    <div style={{ background: offering.is_flagship ? 'rgba(200,146,42,0.05)' : '#FFFFFF', border: offering.is_flagship ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.18)', borderRadius: '14px', padding: '22px 26px', marginBottom: '12px', position: 'relative' }}>
      {offering.is_flagship && (
        <span style={{ position: 'absolute', top: '-10px', left: '20px', ...sc, fontSize: '11px', letterSpacing: '0.16em', background: '#C8922A', color: '#FFFFFF', padding: '3px 12px', borderRadius: '40px' }}>Flagship</span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '4px', padding: '3px 10px' }}>{typeLabel}</span>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)', background: 'rgba(15,21,35,0.04)', border: '1px solid rgba(15,21,35,0.12)', borderRadius: '4px', padding: '3px 10px' }}>{modeLabel}</span>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)', background: 'rgba(15,21,35,0.04)', border: '1px solid rgba(15,21,35,0.12)', borderRadius: '4px', padding: '3px 10px' }}>{accessLabel}</span>
          </div>
          <h4 style={{ ...body, fontSize: '18px', fontWeight: 300, color: dark, marginBottom: '6px', lineHeight: 1.3 }}>{offering.title}</h4>
          {offering.description && (
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.7, marginBottom: '8px' }}>
              {offering.description.slice(0, 160)}{offering.description.length > 160 ? '…' : ''}
            </p>
          )}
          {offering.domain_ids?.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
              {offering.domain_ids.map(d => (
                <span key={d} style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.50)', background: 'rgba(15,21,35,0.04)', borderRadius: '4px', padding: '2px 8px' }}>{DOMAIN_LABEL[d] || d}</span>
              ))}
            </div>
          )}
          {offering.url && (
            <a href={offering.url} target="_blank" rel="noopener noreferrer" style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold, textDecoration: 'none', marginTop: '6px', display: 'inline-block' }}>Visit →</a>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          <Btn small onClick={() => onEdit(offering)}>Edit</Btn>
          <Btn small variant="ghost" onClick={() => onToggleFlagship(offering)} disabled={saving}>{offering.is_flagship ? 'Unflag' : 'Set flagship'}</Btn>
          <Btn small variant="danger" onClick={() => onDelete(offering.id)} disabled={saving}>Delete</Btn>
        </div>
      </div>
    </div>
  )
}

function OfferingsTab({ actorId, toast }) {
  const [offerings, setOfferings] = useState([])
  const [loading, setLoading]     = useState(true)
  const [adding, setAdding]       = useState(false)
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('nextus_actor_offerings').select('*').eq('actor_id', actorId)
      .order('is_flagship', { ascending: false }).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true })
    setOfferings(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [actorId])

  async function saveNew(form) {
    if (!form.title.trim()) { toast('Title is required'); return }
    setSaving(true)
    await supabase.from('nextus_actor_offerings').insert({ actor_id: actorId, title: form.title.trim(), offering_type: form.offering_type, contribution_mode: form.contribution_mode, description: form.description.trim() || null, url: form.url.trim() || null, access_type: form.access_type, domain_ids: form.domain_ids, is_flagship: form.is_flagship })
    setSaving(false)
    toast('Offering added')
    setAdding(false)
    load()
  }

  async function saveEdit(form) {
    if (!form.title.trim()) { toast('Title is required'); return }
    setSaving(true)
    await supabase.from('nextus_actor_offerings').update({ title: form.title.trim(), offering_type: form.offering_type, contribution_mode: form.contribution_mode, description: form.description.trim() || null, url: form.url.trim() || null, access_type: form.access_type, domain_ids: form.domain_ids, is_flagship: form.is_flagship, updated_at: new Date().toISOString() }).eq('id', form.id)
    setSaving(false)
    toast('Offering updated')
    setEditing(null)
    load()
  }

  async function deleteOffering(id) {
    if (!window.confirm('Delete this offering?')) return
    setSaving(true)
    await supabase.from('nextus_actor_offerings').delete().eq('id', id)
    setSaving(false)
    toast('Offering removed')
    load()
  }

  async function toggleFlagship(offering) {
    setSaving(true)
    if (!offering.is_flagship) await supabase.from('nextus_actor_offerings').update({ is_flagship: false }).eq('actor_id', actorId)
    await supabase.from('nextus_actor_offerings').update({ is_flagship: !offering.is_flagship, updated_at: new Date().toISOString() }).eq('id', offering.id)
    setSaving(false)
    load()
  }

  if (loading) return <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading offerings…</p>

  return (
    <div style={{ maxWidth: '700px' }}>
      {offerings.length === 0 && !adding && (
        <SectionCard style={{ borderColor: 'rgba(200,146,42,0.35)', background: 'rgba(200,146,42,0.03)' }}>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>Required before needs go live</p>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px' }}>
            Add at least one offering before your needs become visible to contributors. The platform is built on giving before asking — visitors need to understand what you offer before they can decide whether to give.
          </p>
          <Btn variant="solid" onClick={() => setAdding(true)}>Add your first offering →</Btn>
        </SectionCard>
      )}
      {offerings.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)' }}>
            {offerings.length} offering{offerings.length !== 1 ? 's' : ''}{offerings.some(o => o.is_flagship) ? ' · 1 flagship' : ''}
          </p>
          {!adding && !editing && <Btn small variant="solid" onClick={() => setAdding(true)}>+ Add offering</Btn>}
        </div>
      )}
      {adding && <OfferingForm onSave={saveNew} onCancel={() => setAdding(false)} saving={saving} />}
      {offerings.map(o => (
        editing?.id === o.id
          ? <OfferingForm key={o.id} initial={editing} onSave={saveEdit} onCancel={() => setEditing(null)} saving={saving} />
          : <OfferingCard key={o.id} offering={o} onEdit={o => setEditing(o)} onDelete={deleteOffering} onToggleFlagship={toggleFlagship} saving={saving} />
      ))}
    </div>
  )
}

// ── Tab: Contributions ───────────────────────────────────────

function ContributionsTab({ actorId, actorName, toast }) {
  const [contributions, setContributions] = useState([])
  const [loading, setLoading]             = useState(true)
  const [outcomeText, setOutcomeText]     = useState({})
  const [saving, setSaving]               = useState({})

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('nextus_contributions').select('*').eq('actor_id', actorId).order('created_at', { ascending: false }).limit(100)
    setContributions(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [actorId])

  async function confirm(id) {
    setSaving(s => ({ ...s, [id]: true }))
    await supabase.from('nextus_contributions').update({ confirmed_by_actor: true, confirmed_at: new Date().toISOString() }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false }))
    toast('Contribution confirmed')
    load()
  }

  async function fileOutcome(id) {
    const text = outcomeText[id]
    if (!text?.trim()) { toast('Write an outcome report first'); return }
    setSaving(s => ({ ...s, ['outcome_' + id]: true }))
    await supabase.from('nextus_contributions').update({ outcome_reported: true, outcome_report: text.trim() }).eq('id', id)
    setSaving(s => ({ ...s, ['outcome_' + id]: false }))
    setOutcomeText(o => ({ ...o, [id]: '' }))
    toast('Outcome reported — thank you for closing the loop')
    load()
  }

  const confirmed   = contributions.filter(c => c.confirmed_by_actor)
  const unconfirmed = contributions.filter(c => !c.confirmed_by_actor)
  const needsOutcome = confirmed.filter(c => !c.outcome_reported)

  if (loading) return <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading contributions…</p>

  if (contributions.length === 0) {
    return (
      <SectionCard>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7 }}>
          No contributions recorded yet. When contributors express interest or record a contribution, they'll appear here.
        </p>
      </SectionCard>
    )
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      {needsOutcome.length > 0 && (
        <div style={{ background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.35)', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' }}>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, marginBottom: '8px' }}>Action required</p>
          <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65 }}>
            {needsOutcome.length} confirmed contribution{needsOutcome.length !== 1 ? 's' : ''} {needsOutcome.length === 1 ? 'needs' : 'need'} an outcome report. Closing this loop builds trust and keeps your needs visible.
          </p>
        </div>
      )}

      {unconfirmed.length > 0 && (
        <>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginBottom: '12px' }}>
            Awaiting confirmation ({unconfirmed.length})
          </p>
          {unconfirmed.map(c => (
            <SectionCard key={c.id} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '4px', padding: '3px 10px' }}>
                      {CONTRIBUTION_TYPE_LABEL[c.contribution_type] || c.contribution_type}
                    </span>
                    {c.amount && <span style={{ ...sc, fontSize: '12px', color: 'rgba(15,21,35,0.55)' }}>{c.contribution_type === 'capital' ? `${c.currency} ${c.amount}` : `${c.amount} hrs`}</span>}
                  </div>
                  {c.description && <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.70)', lineHeight: 1.65, marginBottom: '4px' }}>{c.description}</p>}
                  <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <Btn small onClick={() => confirm(c.id)} disabled={saving[c.id]}>{saving[c.id] ? 'Confirming…' : 'Confirm'}</Btn>
              </div>
            </SectionCard>
          ))}
        </>
      )}

      {confirmed.length > 0 && (
        <>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginTop: '28px', marginBottom: '12px' }}>
            Confirmed ({confirmed.length})
          </p>
          {confirmed.map(c => (
            <SectionCard key={c.id} style={{ marginBottom: '12px' }}>
              <div style={{ marginBottom: c.outcome_reported ? 0 : '16px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: '#2A6B3A', background: 'rgba(42,107,58,0.08)', border: '1px solid rgba(42,107,58,0.25)', borderRadius: '4px', padding: '3px 10px' }}>
                    {CONTRIBUTION_TYPE_LABEL[c.contribution_type] || c.contribution_type}
                  </span>
                  {c.amount && <span style={{ ...sc, fontSize: '12px', color: 'rgba(15,21,35,0.55)' }}>{c.contribution_type === 'capital' ? `${c.currency} ${c.amount}` : `${c.amount} hrs`}</span>}
                  {c.outcome_reported && <span style={{ ...sc, fontSize: '11px', color: '#2A6B3A' }}>outcome reported</span>}
                </div>
                {c.description && <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.70)', lineHeight: 1.65 }}>{c.description}</p>}
                {c.outcome_report && (
                  <div style={{ marginTop: '10px', borderLeft: '2px solid rgba(42,107,58,0.30)', paddingLeft: '14px' }}>
                    <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#2A6B3A', marginBottom: '4px' }}>Outcome</p>
                    <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.70)', lineHeight: 1.65 }}>{c.outcome_report}</p>
                  </div>
                )}
              </div>
              {!c.outcome_reported && (
                <div style={{ borderTop: '1px solid rgba(200,146,42,0.12)', paddingTop: '16px' }}>
                  <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: gold, marginBottom: '8px' }}>File an outcome report</p>
                  <TextArea value={outcomeText[c.id] || ''} onChange={v => setOutcomeText(o => ({ ...o, [c.id]: v }))} placeholder="What did you do with this contribution? What changed? Even two sentences closes the loop." rows={3} />
                  <div style={{ marginTop: '10px' }}>
                    <Btn small onClick={() => fileOutcome(c.id)} disabled={saving['outcome_' + c.id]}>
                      {saving['outcome_' + c.id] ? 'Filing…' : 'File outcome report'}
                    </Btn>
                  </div>
                </div>
              )}
            </SectionCard>
          ))}
        </>
      )}
    </div>
  )
}

// ── Tab: Matches ─────────────────────────────────────────────

const OFFER_TYPE_LABEL_M = { skills:'Skills', time:'Time', capital:'Capital', community:'Community', knowledge:'Knowledge', creative:'Creative', other:'Other' }
const MODE_LABEL_M = { functional:'Functional', expressive:'Expressive', relational:'Relational', intellectual:'Intellectual', mixed:'Mixed' }
const RETURN_LABEL_M = { none:'Volunteer', acknowledged:'Acknowledged', paid:'Paid', token:'Token', reciprocal:'Reciprocal' }

function ContributorMatchCard({ match }) {
  const typeLabel   = OFFER_TYPE_LABEL_M[match.offer_type] || match.offer_type
  const modeLabel   = MODE_LABEL_M[match.contribution_mode] || match.contribution_mode
  const returnLabel = RETURN_LABEL_M[match.return_type] || match.return_type

  return (
    <div style={{ background: match.adjacent ? '#FFFFFF' : 'rgba(200,146,42,0.04)', border: match.adjacent ? '1.5px solid rgba(200,146,42,0.18)' : '1.5px solid rgba(200,146,42,0.55)', borderRadius: '12px', padding: '18px 20px', marginBottom: '10px' }}>
      {match.adjacent && <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', display: 'block', marginBottom: '6px' }}>Adjacent match</span>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.22)', borderRadius: '4px', padding: '2px 8px' }}>{typeLabel}</span>
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)', background: 'rgba(15,21,35,0.04)', borderRadius: '4px', padding: '2px 8px' }}>{modeLabel}</span>
            <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.55)' }}>{returnLabel}</span>
            {match.confirmed_contribution_count > 0 && <span style={{ ...sc, fontSize: '11px', color: '#2A6B3A' }}>{match.confirmed_contribution_count} confirmed</span>}
          </div>
          {match.display_name && (
            <p style={{ ...body, fontSize: '16px', fontWeight: 300, color: dark, marginBottom: '2px' }}>
              {match.display_name}
              {match.archetype && <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(168,114,26,0.70)', marginLeft: '10px' }}>{match.archetype}</span>}
            </p>
          )}
          <p style={{ ...body, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.75)', marginBottom: match.description ? '4px' : 0 }}>{match.offer_title}</p>
          {match.description && <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6 }}>{match.description.slice(0, 120)}{match.description.length > 120 ? '…' : ''}</p>}
          {match.best_need && <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)', marginTop: '6px' }}>Matches your need: {match.best_need.title}</p>}
          {match.availability && <p style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.55)', marginTop: '4px' }}>{match.availability}</p>}
        </div>
        <a href={`/beta/profile/${match.user_id}`} style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', padding: '8px 16px', borderRadius: '40px', flexShrink: 0, border: '1.5px solid rgba(200,146,42,0.60)', background: 'rgba(200,146,42,0.04)', color: gold, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          View profile →
        </a>
      </div>
    </div>
  )
}

function MatchesTab({ actorId, toast }) {
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/nextus-match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'for_org', actor_id: actorId }) })
        const data = await res.json()
        setMatches(data.matches || [])
      } catch { toast('Could not load matches') }
      setLoading(false)
    }
    load()
  }, [actorId])

  if (loading) return <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Finding matches…</p>

  const directMatches   = matches.filter(m => !m.adjacent)
  const adjacentMatches = matches.filter(m => m.adjacent)
  const shown           = expanded ? matches : matches.slice(0, 5)

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '12px', padding: '18px 22px', marginBottom: '28px' }}>
        <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '6px' }}>What this shows</p>
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, margin: 0 }}>
          Contributors whose active offers align with your open needs — matched by domain, offer type, and contribution mode. Direct matches first, then adjacent.
        </p>
      </div>
      {matches.length === 0 ? (
        <SectionCard>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7 }}>
            No contributors match your current open needs yet. As more people join and list their offers, matches appear here automatically.
          </p>
        </SectionCard>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)' }}>{directMatches.length} direct · {adjacentMatches.length} adjacent</p>
          </div>
          {shown.map((m, i) => <ContributorMatchCard key={`${m.user_id}-${m.offer_id}-${i}`} match={m} />)}
          {matches.length > 5 && (
            <button onClick={() => setExpanded(e => !e)} style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px', padding: 0 }}>
              {expanded ? 'Show fewer ↑' : `Show all ${matches.length} matches ↓`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

const TABS = [
  { key: 'profile',       label: 'Profile' },
  { key: 'offerings',     label: 'Offerings' },
  { key: 'domains',       label: 'Domains' },
  { key: 'matches',       label: 'Matches' },
  { key: 'contributions', label: 'Contributions' },
  { key: 'needs',         label: 'Needs' },
]

export function BetaOrgManagePage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [actor, setActor]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [toast, setToast]         = useState(null)

  function showToast(msg) { setToast(msg) }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('nextus_actors')
        .select('*, focus:focus_id(id, name, type, slug)')
        .eq('id', id)
        .single()
      setActor(data)
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab) setActiveTab(tab)
  }, [])

  useEffect(() => {
    if (authLoading || loading) return
    if (!user) { navigate('/login'); return }
    if (actor && actor.profile_owner !== user.id) {
      navigate(`/beta/org/${id}`)
    }
  }, [user, authLoading, actor, loading])

  async function reloadActor() {
    const { data } = await supabase.from('nextus_actors').select('*, focus:focus_id(id, name, type, slug)').eq('id', id).single()
    setActor(data)
  }

  if (loading || authLoading) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '120px 40px' }}>
          <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.55)' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (!actor) return null

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      {toast && <OrgToast message={toast} onClose={() => setToast(null)} />}

      <style>{`
        @media (max-width: 640px) {
          .beta-manage-main { padding-left: 20px !important; padding-right: 20px !important; }
          .focus-search-dropdown { max-width: calc(100vw - 40px) !important; }
        }
      `}</style>

      <div className="beta-manage-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '80px 40px 120px' }}>

        <button onClick={() => navigate(`/beta/org/${id}`)}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '32px', padding: 0 }}>
          {'\u2190'} {actor.name}
        </button>

        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '10px' }}>
          Managing
        </span>
        <h1 style={{ ...body, fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 300, color: dark, lineHeight: 1.1, marginBottom: '40px' }}>
          {actor.name}
        </h1>

        {/* Integrity warning */}
        {actor.needs_visible === false && (
          <div style={{ background: 'rgba(138,48,48,0.04)', border: '1.5px solid rgba(138,48,48,0.35)', borderRadius: '12px', padding: '18px 22px', marginBottom: '28px' }}>
            <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: '#8A3030', marginBottom: '6px' }}>
              Needs hidden
            </p>
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '12px' }}>
              Your needs are not visible to contributors because one or more confirmed contributions have not received an outcome report. File your outcome reports to restore visibility.
            </p>
            <button onClick={() => setActiveTab('contributions')}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '9px 20px', borderRadius: '40px', border: '1.5px solid rgba(138,48,48,0.50)', background: 'rgba(138,48,48,0.05)', color: '#8A3030', cursor: 'pointer' }}>
              File outcome reports →
            </button>
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(200,146,42,0.20)', marginBottom: '36px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === tab.key ? gold : 'rgba(15,21,35,0.55)', borderBottom: activeTab === tab.key ? `2px solid ${gold}` : '2px solid transparent', marginBottom: '-1px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profile'       && <ProfileTab       actor={actor} onSave={reloadActor} toast={showToast} />}
        {activeTab === 'offerings'     && <OfferingsTab     actorId={id} toast={showToast} />}
        {activeTab === 'domains'       && <OrgDomainsTab    actorId={id} toast={showToast} />}
        {activeTab === 'matches'       && <MatchesTab       actorId={id} toast={showToast} />}
        {activeTab === 'contributions' && <ContributionsTab actorId={id} actorName={actor.name} toast={showToast} />}
        {activeTab === 'needs'         && <OrgNeedsTab      actorId={id} navigate={navigate} toast={showToast} />}
      </div>

      <SiteFooter />
    </div>
  )
}
