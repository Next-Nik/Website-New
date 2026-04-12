import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const DOMAIN_LIST = [
  { value: '',               label: '— No domain —' },
  { value: 'human-being',    label: 'Human Being' },
  { value: 'society',        label: 'Society' },
  { value: 'nature',         label: 'Nature' },
  { value: 'technology',     label: 'Technology' },
  { value: 'finance-economy',label: 'Finance & Economy' },
  { value: 'legacy',         label: 'Legacy' },
  { value: 'vision',         label: 'Vision' },
]

const DOMAIN_LIST_MULTI = [
  { value: 'human-being',    label: 'Human Being' },
  { value: 'society',        label: 'Society' },
  { value: 'nature',         label: 'Nature' },
  { value: 'technology',     label: 'Technology' },
  { value: 'finance-economy',label: 'Finance & Economy' },
  { value: 'legacy',         label: 'Legacy' },
  { value: 'vision',         label: 'Vision' },
]

const SUBDOMAIN_MAP = {
  'human-being':     [['hb-body','Body'],['hb-mind','Mind'],['hb-inner-life','Inner Life'],['hb-development','Development'],['hb-dignity','Dignity & Rights'],['hb-expression','Expression & Culture']],
  'society':         [['soc-governance','Governance'],['soc-culture','Culture'],['soc-conflict-peace','Conflict & Peace'],['soc-community','Community'],['soc-communication','Communication & Information'],['soc-global','Global Coordination']],
  'nature':          [['nat-earth','Earth'],['nat-air','Air'],['nat-salt-water','Salt Water'],['nat-fresh-water','Fresh Water'],['nat-flora','Flora'],['nat-fauna','Fauna'],['nat-living-systems','Living Systems']],
  'technology':      [['tech-digital','Digital Systems'],['tech-biological','Biological Technology'],['tech-infrastructure','Physical Infrastructure'],['tech-energy','Energy'],['tech-frontier','Frontier & Emerging Technology']],
  'finance-economy': [['fe-resources','Resources'],['fe-exchange','Exchange'],['fe-capital','Capital'],['fe-labour','Labour'],['fe-ownership','Ownership'],['fe-distribution','Distribution']],
  'legacy':          [['leg-wisdom','Wisdom'],['leg-memory','Memory'],['leg-ceremony','Ceremony & Ritual'],['leg-intergenerational','Intergenerational Relationship'],['leg-long-arc','The Long Arc']],
  'vision':          [['vis-imagination','Imagination'],['vis-philosophy','Philosophy & Worldview'],['vis-leadership','Leadership'],['vis-coordination','Coordination'],['vis-foresight','Foresight']],
}

const SCALE_OPTIONS = [
  { value: 'local',         label: 'Local' },
  { value: 'municipal',     label: 'Municipal' },
  { value: 'regional',      label: 'Regional' },
  { value: 'national',      label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global',        label: 'Global' },
]

const CONTRIBUTION_TYPE_LABEL = {
  hours:'Time & Hours', capital:'Financial', skills:'Skills',
  resources:'Resources', community:'Community', other:'Other',
}

const OFFERING_TYPES = [
  { value: 'tool',       label: 'Tool' },
  { value: 'service',    label: 'Service' },
  { value: 'programme',  label: 'Programme' },
  { value: 'resource',   label: 'Resource' },
  { value: 'content',    label: 'Content' },
  { value: 'event',      label: 'Event' },
  { value: 'other',      label: 'Other' },
]

const CONTRIBUTION_MODES = [
  { value: 'functional',   label: 'Functional',   desc: 'Builds, organises, funds, connects' },
  { value: 'expressive',   label: 'Expressive',   desc: 'Makes, performs, creates, transmits' },
  { value: 'relational',   label: 'Relational',   desc: 'Heals, holds, facilitates, witnesses' },
  { value: 'intellectual', label: 'Intellectual', desc: 'Researches, synthesises, frames, teaches' },
  { value: 'mixed',        label: 'Mixed',        desc: 'Crosses more than one mode' },
]

const ACCESS_TYPES = [
  { value: 'free',        label: 'Free' },
  { value: 'paid',        label: 'Paid' },
  { value: 'application', label: 'By application' },
  { value: 'open_source', label: 'Open source' },
  { value: 'invitation',  label: 'By invitation' },
]

const DOMAIN_LABEL = {
  'human-being':'Human Being','society':'Society','nature':'Nature',
  'technology':'Technology','finance-economy':'Finance & Economy',
  'legacy':'Legacy','vision':'Vision',
}

// ── Shared UI ────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '6px' }}>
      {children}{required && <span style={{ color: '#8A3030', marginLeft: '4px' }}>*</span>}
    </label>
  )
}

function Hint({ children }) {
  return <p style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.45)', marginTop: '5px', lineHeight: 1.5 }}>{children}</p>
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{ ...serif, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: disabled ? 'rgba(200,146,42,0.03)' : '#FFFFFF', outline: 'none', width: '100%' }} />
  )
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ ...serif, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.65 }} />
  )
}

function SelectInput({ value, onChange, options, disabled }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{ ...serif, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Btn({ onClick, children, variant = 'primary', disabled, small }) {
  const styles = {
    primary: { background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', color: gold },
    solid:   { background: '#C8922A', border: '1.5px solid rgba(168,114,26,0.8)', color: '#FFFFFF' },
    ghost:   { background: 'transparent', border: '1px solid rgba(15,21,35,0.20)', color: 'rgba(15,21,35,0.55)' },
    danger:  { background: 'rgba(138,48,48,0.05)', border: '1.5px solid rgba(138,48,48,0.40)', color: '#8A3030' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...sc, fontSize: small ? '13px' : '14px', letterSpacing: '0.14em',
      padding: small ? '8px 16px' : '12px 24px', borderRadius: '40px',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      ...styles[variant],
    }}>
      {children}
    </button>
  )
}

function SectionCard({ children, style }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.18)', borderRadius: '14px', padding: '28px 32px', marginBottom: '24px', ...style }}>
      {children}
    </div>
  )
}

function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, background: dark, color: '#FAFAF7', ...serif, fontSize: '16px', padding: '12px 22px', borderRadius: '10px', boxShadow: '0 8px 28px rgba(15,21,35,0.3)' }}>
      {message}
    </div>
  )
}

// ── Chip multi-select for domains ────────────────────────────

function DomainChips({ selected, onChange }) {
  function toggle(val) {
    onChange(
      selected.includes(val)
        ? selected.filter(v => v !== val)
        : [...selected, val]
    )
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {DOMAIN_LIST_MULTI.map(d => {
        const on = selected.includes(d.value)
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => toggle(d.value)}
            style={{
              ...sc, fontSize: '12px', letterSpacing: '0.12em',
              padding: '6px 14px', borderRadius: '40px', cursor: 'pointer',
              border: on ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.25)',
              background: on ? 'rgba(200,146,42,0.10)' : 'transparent',
              color: on ? gold : 'rgba(15,21,35,0.50)',
              transition: 'all 0.15s',
            }}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Mode selector ────────────────────────────────────────────

function ModeSelector({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
      {CONTRIBUTION_MODES.map(m => {
        const on = value === m.value
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            style={{
              textAlign: 'left', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
              border: on ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.20)',
              background: on ? 'rgba(200,146,42,0.07)' : '#FFFFFF',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: on ? gold : 'rgba(15,21,35,0.70)', marginBottom: '3px' }}>
              {m.label}
            </div>
            <div style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.50)', lineHeight: 1.4 }}>
              {m.desc}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Tab: Profile Edit ────────────────────────────────────────

function ProfileTab({ actor, onSave, toast }) {
  const [form, setForm] = useState({
    name:          actor.name || '',
    description:   actor.description || '',
    impact_summary:actor.impact_summary || '',
    reach:         actor.reach || '',
    website:       actor.website || '',
    domain_id:     actor.domain_id || '',
    subdomain_id:  actor.subdomain_id || '',
    scale:         actor.scale || 'national',
    location_name: actor.location_name || '',
    alignment_score: actor.alignment_score ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value }
      if (field === 'domain_id') next.subdomain_id = ''
      return next
    })
  }

  const subdomainOptions = form.domain_id
    ? [['', '— No subdomain —'], ...(SUBDOMAIN_MAP[form.domain_id] || [])].map(([v, l]) => ({ value: v, label: l }))
    : [{ value: '', label: 'Select domain first' }]

  async function save() {
    if (!form.name.trim()) { toast('Name is required'); return }
    setSaving(true)
    const { error } = await supabase.from('nextus_actors').update({
      name:           form.name.trim(),
      description:    form.description.trim() || null,
      impact_summary: form.impact_summary.trim() || null,
      reach:          form.reach.trim() || null,
      website:        form.website.trim() || null,
      domain_id:      form.domain_id || null,
      subdomain_id:   form.subdomain_id || null,
      scale:          form.scale || null,
      location_name:  form.location_name.trim() || null,
      alignment_score: form.alignment_score !== '' ? parseFloat(form.alignment_score) : null,
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
            <Label>Domain</Label>
            <SelectInput value={form.domain_id} onChange={v => set('domain_id', v)} options={DOMAIN_LIST} />
          </div>
          <div>
            <Label>Subdomain</Label>
            <SelectInput value={form.subdomain_id} onChange={v => set('subdomain_id', v)} options={subdomainOptions} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <Label>Scale</Label>
            <SelectInput value={form.scale} onChange={v => set('scale', v)} options={SCALE_OPTIONS} />
          </div>
          <div>
            <Label>Location</Label>
            <TextInput value={form.location_name} onChange={v => set('location_name', v)} placeholder="e.g. Nairobi, Kenya" />
          </div>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <Label>Reach</Label>
            <TextInput value={form.reach} onChange={v => set('reach', v)} placeholder="e.g. 40 countries, 12,000 farmers" />
          </div>
          <div>
            <Label>Alignment (0–10)</Label>
            <TextInput value={form.alignment_score} onChange={v => set('alignment_score', v)} placeholder="e.g. 8.5" type="number" />
            <Hint>How closely does your work align with the domain Horizon Goal?</Hint>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Btn onClick={save} disabled={saving} variant="solid">{saving ? 'Saving…' : 'Save profile'}</Btn>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Tab: Offerings ───────────────────────────────────────────

const EMPTY_OFFERING = {
  title: '',
  offering_type: 'tool',
  contribution_mode: 'functional',
  description: '',
  url: '',
  access_type: 'free',
  domain_ids: [],
  is_flagship: false,
}

function OfferingForm({ initial = EMPTY_OFFERING, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  return (
    <div style={{ background: 'rgba(200,146,42,0.03)', border: '1.5px solid rgba(200,146,42,0.30)', borderRadius: '14px', padding: '24px 28px', marginBottom: '20px' }}>

      <div style={{ marginBottom: '18px' }}>
        <Label required>Title</Label>
        <TextInput value={form.title} onChange={v => set('title', v)} placeholder="e.g. Purpose Piece, Soil carbon monitoring, Community grants programme" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
        <div>
          <Label required>Type</Label>
          <SelectInput value={form.offering_type} onChange={v => set('offering_type', v)} options={OFFERING_TYPES} />
          <Hint>Tool, service, programme, resource, content, event, or other.</Hint>
        </div>
        <div>
          <Label required>Access</Label>
          <SelectInput value={form.access_type} onChange={v => set('access_type', v)} options={ACCESS_TYPES} />
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <Label required>Contribution mode</Label>
        <Hint>What kind of work does this offering represent?</Hint>
        <div style={{ marginTop: '10px' }}>
          <ModeSelector value={form.contribution_mode} onChange={v => set('contribution_mode', v)} />
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <Label>Description</Label>
        <TextArea
          value={form.description}
          onChange={v => set('description', v)}
          placeholder="What does this offering do? Who is it for? What can someone expect from it?"
          rows={3}
        />
      </div>

      <div style={{ marginBottom: '18px' }}>
        <Label>URL</Label>
        <TextInput value={form.url} onChange={v => set('url', v)} placeholder="https://…" />
        <Hint>Direct link to the offering. Can be on your site or external.</Hint>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <Label>Domains this offering serves</Label>
        <Hint>Select all that apply. Helps contributors in those domains find your work.</Hint>
        <div style={{ marginTop: '10px' }}>
          <DomainChips selected={form.domain_ids} onChange={v => set('domain_ids', v)} />
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.is_flagship}
            onChange={e => set('is_flagship', e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: gold }}
          />
          <span style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>
            This is our flagship offering
          </span>
        </label>
        <Hint>Flagship offerings are shown first and highlighted on your public profile.</Hint>
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
    <div style={{
      background: offering.is_flagship ? 'rgba(200,146,42,0.05)' : '#FFFFFF',
      border: offering.is_flagship ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.18)',
      borderRadius: '14px', padding: '22px 26px', marginBottom: '12px',
      position: 'relative',
    }}>
      {offering.is_flagship && (
        <span style={{
          position: 'absolute', top: '-10px', left: '20px',
          ...sc, fontSize: '11px', letterSpacing: '0.16em',
          background: '#C8922A', color: '#FFFFFF',
          padding: '3px 12px', borderRadius: '40px',
        }}>
          Flagship
        </span>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '4px', padding: '3px 10px' }}>
              {typeLabel}
            </span>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.50)', background: 'rgba(15,21,35,0.04)', border: '1px solid rgba(15,21,35,0.10)', borderRadius: '4px', padding: '3px 10px' }}>
              {modeLabel}
            </span>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.45)', background: 'rgba(15,21,35,0.04)', border: '1px solid rgba(15,21,35,0.10)', borderRadius: '4px', padding: '3px 10px' }}>
              {accessLabel}
            </span>
          </div>

          <h4 style={{ ...serif, fontSize: '18px', fontWeight: 300, color: dark, marginBottom: '6px', lineHeight: 1.3 }}>
            {offering.title}
          </h4>

          {offering.description && (
            <p style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.7, marginBottom: '8px' }}>
              {offering.description.slice(0, 160)}{offering.description.length > 160 ? '…' : ''}
            </p>
          )}

          {offering.domain_ids?.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
              {offering.domain_ids.map(d => (
                <span key={d} style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.45)', background: 'rgba(15,21,35,0.04)', borderRadius: '4px', padding: '2px 8px' }}>
                  {DOMAIN_LABEL[d] || d}
                </span>
              ))}
            </div>
          )}

          {offering.url && (
            <a href={offering.url} target="_blank" rel="noopener noreferrer"
              style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold, textDecoration: 'none', marginTop: '6px', display: 'inline-block' }}>
              Visit →
            </a>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          <Btn small onClick={() => onEdit(offering)}>Edit</Btn>
          <Btn small variant="ghost" onClick={() => onToggleFlagship(offering)} disabled={saving}>
            {offering.is_flagship ? 'Unflag' : 'Set flagship'}
          </Btn>
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
    const { data } = await supabase
      .from('nextus_actor_offerings')
      .select('*')
      .eq('actor_id', actorId)
      .order('is_flagship', { ascending: false })
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    setOfferings(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [actorId])

  async function saveNew(form) {
    if (!form.title.trim()) { toast('Title is required'); return }
    setSaving(true)
    const { error } = await supabase.from('nextus_actor_offerings').insert({
      actor_id:          actorId,
      title:             form.title.trim(),
      offering_type:     form.offering_type,
      contribution_mode: form.contribution_mode,
      description:       form.description.trim() || null,
      url:               form.url.trim() || null,
      access_type:       form.access_type,
      domain_ids:        form.domain_ids,
      is_flagship:       form.is_flagship,
    })
    setSaving(false)
    if (error) { toast('Error saving: ' + error.message); return }
    toast('Offering added')
    setAdding(false)
    load()
  }

  async function saveEdit(form) {
    if (!form.title.trim()) { toast('Title is required'); return }
    setSaving(true)
    const { error } = await supabase.from('nextus_actor_offerings').update({
      title:             form.title.trim(),
      offering_type:     form.offering_type,
      contribution_mode: form.contribution_mode,
      description:       form.description.trim() || null,
      url:               form.url.trim() || null,
      access_type:       form.access_type,
      domain_ids:        form.domain_ids,
      is_flagship:       form.is_flagship,
      updated_at:        new Date().toISOString(),
    }).eq('id', form.id)
    setSaving(false)
    if (error) { toast('Error saving: ' + error.message); return }
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
    if (!offering.is_flagship) {
      await supabase.from('nextus_actor_offerings')
        .update({ is_flagship: false })
        .eq('actor_id', actorId)
    }
    await supabase.from('nextus_actor_offerings')
      .update({ is_flagship: !offering.is_flagship, updated_at: new Date().toISOString() })
      .eq('id', offering.id)
    setSaving(false)
    load()
  }

  if (loading) return <p style={{ ...serif, color: 'rgba(15,21,35,0.45)' }}>Loading offerings…</p>

  return (
    <div style={{ maxWidth: '700px' }}>

      {offerings.length === 0 && !adding && (
        <SectionCard style={{ borderColor: 'rgba(200,146,42,0.35)', background: 'rgba(200,146,42,0.03)' }}>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>
            Required before needs go live
          </p>
          <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px' }}>
            Add at least one offering before your needs become visible to contributors. The platform is built on giving before asking — visitors need to understand what you offer before they can decide whether to give.
          </p>
          <Btn variant="solid" onClick={() => setAdding(true)}>Add your first offering →</Btn>
        </SectionCard>
      )}

      {offerings.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.55)' }}>
            {offerings.length} offering{offerings.length !== 1 ? 's' : ''}
            {offerings.some(o => o.is_flagship) ? ' · 1 flagship' : ''}
          </p>
          {!adding && !editing && (
            <Btn small variant="solid" onClick={() => setAdding(true)}>+ Add offering</Btn>
          )}
        </div>
      )}

      {adding && (
        <OfferingForm
          onSave={saveNew}
          onCancel={() => setAdding(false)}
          saving={saving}
        />
      )}

      {offerings.map(o => (
        editing?.id === o.id
          ? <OfferingForm
              key={o.id}
              initial={editing}
              onSave={saveEdit}
              onCancel={() => setEditing(null)}
              saving={saving}
            />
          : <OfferingCard
              key={o.id}
              offering={o}
              onEdit={o => setEditing(o)}
              onDelete={deleteOffering}
              onToggleFlagship={toggleFlagship}
              saving={saving}
            />
      ))}

    </div>
  )
}

// ── Tab: Domains ─────────────────────────────────────────────

const DOMAIN_HORIZON = {
  'human-being':    'Every person has what they need to know themselves, develop fully, and bring what they came here to bring.',
  'society':        'Humanity knows how to be human together — and every individual is better for it.',
  'nature':         'Ecosystems are thriving and we are living in harmony with the planet.',
  'technology':     'Our creations support and amplify life.',
  'finance-economy':'Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.',
  'legacy':         'We are ancestors worth having.',
  'vision':         'Into the unknown. On purpose. Together.',
}

function DomainRow({ entry, onSetPrimary, onRemove, onUpdateNote, saving }) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote]         = useState(entry.alignment_note || '')
  const [savingNote, setSavingNote] = useState(false)

  const domainLabel    = DOMAIN_LABEL[entry.domain_id] || entry.domain_id
  const subdomainLabel = entry.subdomain_id
    ? (SUBDOMAIN_MAP[entry.domain_id] || []).find(([v]) => v === entry.subdomain_id)?.[1]
    : null
  const horizonGoal = DOMAIN_HORIZON[entry.domain_id]

  async function saveNote() {
    setSavingNote(true)
    await onUpdateNote(entry.id, note)
    setSavingNote(false)
    setNoteOpen(false)
  }

  return (
    <div style={{
      background: entry.is_primary ? 'rgba(200,146,42,0.05)' : '#FFFFFF',
      border: entry.is_primary ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.18)',
      borderRadius: '14px', padding: '20px 24px', marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
            {entry.is_primary && (
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', background: '#C8922A', color: '#FFFFFF', padding: '2px 10px', borderRadius: '40px' }}>
                Primary
              </span>
            )}
            <span style={{ ...serif, fontSize: '18px', fontWeight: 300, color: dark }}>
              {domainLabel}
            </span>
            {subdomainLabel && (
              <>
                <span style={{ color: 'rgba(200,146,42,0.40)', fontSize: '14px' }}>›</span>
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(168,114,26,0.70)' }}>
                  {subdomainLabel}
                </span>
              </>
            )}
          </div>

          {horizonGoal && (
            <p style={{ ...serif, fontSize: '13px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', lineHeight: 1.6, marginBottom: entry.alignment_note ? '8px' : '4px', maxWidth: '480px' }}>
              Horizon: {horizonGoal}
            </p>
          )}

          {entry.alignment_note && !noteOpen && (
            <p style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, marginBottom: '4px', maxWidth: '480px' }}>
              {entry.alignment_note}
            </p>
          )}

          {noteOpen && (
            <div style={{ marginTop: '12px' }}>
              <TextArea
                value={note}
                onChange={setNote}
                placeholder="How does your work relate to this domain's horizon goal? One or two honest sentences."
                rows={3}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Btn small onClick={saveNote} disabled={savingNote} variant="solid">
                  {savingNote ? 'Saving…' : 'Save note'}
                </Btn>
                <Btn small variant="ghost" onClick={() => { setNoteOpen(false); setNote(entry.alignment_note || '') }}>
                  Cancel
                </Btn>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          {!entry.is_primary && (
            <Btn small onClick={() => onSetPrimary(entry.id)} disabled={saving}>
              Set primary
            </Btn>
          )}
          <Btn small variant="ghost" onClick={() => setNoteOpen(o => !o)}>
            {entry.alignment_note ? 'Edit note' : 'Add note'}
          </Btn>
          {!entry.is_primary && (
            <Btn small variant="danger" onClick={() => onRemove(entry.id)} disabled={saving}>
              Remove
            </Btn>
          )}
        </div>
      </div>
    </div>
  )
}

function AddDomainForm({ existingDomainIds, onAdd, onCancel, saving }) {
  const [domainId, setDomainId]       = useState('')
  const [subdomainId, setSubdomainId] = useState('')

  const available = DOMAIN_LIST_MULTI.filter(d => !existingDomainIds.includes(d.value))

  const subdomainOptions = domainId
    ? [{ value: '', label: '— No subdomain —' }, ...(SUBDOMAIN_MAP[domainId] || []).map(([v, l]) => ({ value: v, label: l }))]
    : [{ value: '', label: 'Select domain first' }]

  function handleDomainChange(val) {
    setDomainId(val)
    setSubdomainId('')
  }

  return (
    <div style={{ background: 'rgba(200,146,42,0.03)', border: '1.5px solid rgba(200,146,42,0.30)', borderRadius: '14px', padding: '22px 26px', marginBottom: '16px' }}>
      <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '16px' }}>
        Add a domain
      </p>

      {available.length === 0 ? (
        <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
          Your work spans all seven domains. That is a statement in itself.
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <Label required>Domain</Label>
              <SelectInput
                value={domainId}
                onChange={handleDomainChange}
                options={[{ value: '', label: '— Select domain —' }, ...available]}
              />
            </div>
            <div>
              <Label>Subdomain</Label>
              <SelectInput
                value={subdomainId}
                onChange={setSubdomainId}
                options={subdomainOptions}
                disabled={!domainId}
              />
            </div>
          </div>

          {domainId && DOMAIN_HORIZON[domainId] && (
            <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px' }}>
              <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: gold, marginBottom: '6px' }}>
                {DOMAIN_LABEL[domainId]} · Horizon Goal
              </p>
              <p style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, margin: 0 }}>
                {DOMAIN_HORIZON[domainId]}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <Btn onClick={() => onAdd(domainId, subdomainId)} disabled={saving || !domainId} variant="solid">
              {saving ? 'Adding…' : 'Add domain'}
            </Btn>
            <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
          </div>
        </>
      )}
    </div>
  )
}

function DomainsTab({ actorId, toast }) {
  const [domains, setDomains]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [saving, setSaving]     = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('nextus_actor_domains')
      .select('*')
      .eq('actor_id', actorId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
    setDomains(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [actorId])

  async function addDomain(domainId, subdomainId) {
    if (!domainId) return
    setSaving(true)
    const isPrimary = domains.length === 0
    const { error } = await supabase.from('nextus_actor_domains').insert({
      actor_id:     actorId,
      domain_id:    domainId,
      subdomain_id: subdomainId || null,
      is_primary:   isPrimary,
    })
    setSaving(false)
    if (error) { toast('Error adding domain: ' + error.message); return }
    toast('Domain added')
    setAdding(false)
    load()
  }

  async function setPrimary(entryId) {
    setSaving(true)
    // Clear all primaries for this actor, then set the new one
    await supabase.from('nextus_actor_domains')
      .update({ is_primary: false })
      .eq('actor_id', actorId)
    await supabase.from('nextus_actor_domains')
      .update({ is_primary: true })
      .eq('id', entryId)
    setSaving(false)
    toast('Primary domain updated')
    load()
  }

  async function removeDomain(entryId) {
    if (!window.confirm('Remove this domain from your profile?')) return
    setSaving(true)
    await supabase.from('nextus_actor_domains').delete().eq('id', entryId)
    setSaving(false)
    toast('Domain removed')
    load()
  }

  async function updateNote(entryId, note) {
    await supabase.from('nextus_actor_domains')
      .update({ alignment_note: note.trim() || null })
      .eq('id', entryId)
    toast('Note saved')
    load()
  }

  if (loading) return <p style={{ ...serif, color: 'rgba(15,21,35,0.45)' }}>Loading domains…</p>

  const existingDomainIds = domains.map(d => d.domain_id)

  return (
    <div style={{ maxWidth: '700px' }}>

      {/* Explainer */}
      <SectionCard style={{ marginBottom: '28px', background: 'rgba(200,146,42,0.02)' }}>
        <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>
          Where your work belongs on the map
        </p>
        <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '8px' }}>
          Most organisations touch more than one domain. List every domain your work genuinely addresses. Mark one as primary — the domain where your contribution is most direct. The others show the breadth of your reach.
        </p>
        <p style={{ ...serif, fontSize: '14px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', lineHeight: 1.65 }}>
          Adding an alignment note for each domain tells contributors and visitors exactly how your work relates to that domain's horizon goal — in your words.
        </p>
      </SectionCard>

      {/* Add form */}
      {adding && (
        <AddDomainForm
          existingDomainIds={existingDomainIds}
          onAdd={addDomain}
          onCancel={() => setAdding(false)}
          saving={saving}
        />
      )}

      {/* Domain rows */}
      {domains.length === 0 && !adding && (
        <SectionCard style={{ borderColor: 'rgba(200,146,42,0.35)', background: 'rgba(200,146,42,0.03)' }}>
          <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '20px' }}>
            No domains assigned yet. Place your organisation on the map by adding the domains your work addresses.
          </p>
          <Btn variant="solid" onClick={() => setAdding(true)}>Add first domain →</Btn>
        </SectionCard>
      )}

      {domains.map(entry => (
        <DomainRow
          key={entry.id}
          entry={entry}
          onSetPrimary={setPrimary}
          onRemove={removeDomain}
          onUpdateNote={updateNote}
          saving={saving}
        />
      ))}

      {/* Add more button */}
      {domains.length > 0 && !adding && existingDomainIds.length < 7 && (
        <div style={{ marginTop: '16px' }}>
          <Btn onClick={() => setAdding(true)}>+ Add another domain</Btn>
        </div>
      )}

      {/* All 7 covered */}
      {existingDomainIds.length === 7 && (
        <div style={{ marginTop: '16px', padding: '14px 20px', background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '10px' }}>
          <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.55)', margin: 0 }}>
            Your work spans all seven domains.
          </p>
        </div>
      )}

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
    const { data } = await supabase
      .from('nextus_contributions')
      .select('*')
      .eq('actor_id', actorId)
      .order('created_at', { ascending: false })
      .limit(100)
    setContributions(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [actorId])

  async function confirm(id) {
    setSaving(s => ({ ...s, [id]: true }))
    await supabase.from('nextus_contributions').update({
      confirmed_by_actor: true,
      confirmed_at: new Date().toISOString(),
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false }))
    toast('Contribution confirmed')
    load()
  }

  async function fileOutcome(id) {
    const text = outcomeText[id]
    if (!text?.trim()) { toast('Please write an outcome report first'); return }
    setSaving(s => ({ ...s, ['outcome_' + id]: true }))
    await supabase.from('nextus_contributions').update({
      outcome_reported: true,
      outcome_report: text.trim(),
    }).eq('id', id)
    setSaving(s => ({ ...s, ['outcome_' + id]: false }))
    setOutcomeText(o => ({ ...o, [id]: '' }))
    toast('Outcome reported — thank you for closing the loop')
    load()
  }

  const confirmed    = contributions.filter(c => c.confirmed_by_actor)
  const unconfirmed  = contributions.filter(c => !c.confirmed_by_actor)
  const needsOutcome = confirmed.filter(c => !c.outcome_reported)

  if (loading) return <p style={{ ...serif, color: 'rgba(15,21,35,0.45)' }}>Loading contributions…</p>

  if (contributions.length === 0) {
    return (
      <SectionCard>
        <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7 }}>
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
          <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65 }}>
            {needsOutcome.length} confirmed contribution{needsOutcome.length !== 1 ? 's' : ''} need{needsOutcome.length === 1 ? 's' : ''} an outcome report. Contributors can see what their help produced — closing this loop builds trust and keeps your needs visible.
          </p>
        </div>
      )}

      {unconfirmed.length > 0 && (
        <>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.45)', marginBottom: '12px' }}>
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
                    {c.amount && (
                      <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.50)' }}>
                        {c.contribution_type === 'capital' ? `${c.currency} ${c.amount}` : `${c.amount} hrs`}
                      </span>
                    )}
                    {c.visibility === 'muted' && (
                      <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.35)' }}>private</span>
                    )}
                  </div>
                  {c.description && (
                    <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.70)', lineHeight: 1.65, marginBottom: '4px' }}>
                      {c.description}
                    </p>
                  )}
                  <p style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.40)' }}>
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <Btn small onClick={() => confirm(c.id)} disabled={saving[c.id]}>
                  {saving[c.id] ? 'Confirming…' : 'Confirm ✓'}
                </Btn>
              </div>
            </SectionCard>
          ))}
        </>
      )}

      {confirmed.length > 0 && (
        <>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.45)', marginTop: '28px', marginBottom: '12px' }}>
            Confirmed ({confirmed.length})
          </p>
          {confirmed.map(c => (
            <SectionCard key={c.id} style={{ marginBottom: '12px' }}>
              <div style={{ marginBottom: c.outcome_reported ? 0 : '16px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: '#2A6B3A', background: 'rgba(42,107,58,0.08)', border: '1px solid rgba(42,107,58,0.25)', borderRadius: '4px', padding: '3px 10px' }}>
                    {CONTRIBUTION_TYPE_LABEL[c.contribution_type] || c.contribution_type}
                  </span>
                  {c.amount && (
                    <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.50)' }}>
                      {c.contribution_type === 'capital' ? `${c.currency} ${c.amount}` : `${c.amount} hrs`}
                    </span>
                  )}
                  {c.outcome_reported && (
                    <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: '#2A6B3A' }}>outcome reported ✓</span>
                  )}
                </div>
                {c.description && (
                  <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.70)', lineHeight: 1.65 }}>
                    {c.description}
                  </p>
                )}
                {c.outcome_report && (
                  <div style={{ marginTop: '10px', borderLeft: '2px solid rgba(42,107,58,0.30)', paddingLeft: '14px' }}>
                    <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#2A6B3A', marginBottom: '4px' }}>Outcome</p>
                    <p style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.70)', lineHeight: 1.65 }}>{c.outcome_report}</p>
                  </div>
                )}
              </div>

              {!c.outcome_reported && (
                <div style={{ borderTop: '1px solid rgba(200,146,42,0.12)', paddingTop: '16px' }}>
                  <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: gold, marginBottom: '8px' }}>
                    File an outcome report
                  </p>
                  <TextArea
                    value={outcomeText[c.id] || ''}
                    onChange={v => setOutcomeText(o => ({ ...o, [c.id]: v }))}
                    placeholder="What did you do with this contribution? What changed? What's next? Even two sentences closes the loop."
                    rows={3}
                  />
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

// ── Tab: Needs management ────────────────────────────────────

function NeedsTab({ actorId, navigate, toast }) {
  const [needs, setNeeds]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [hasOfferings, setHasOfferings] = useState(null)

  async function load() {
    setLoading(true)
    const [{ data: needsData }, { count }] = await Promise.all([
      supabase.from('nextus_needs').select('*').eq('actor_id', actorId).order('created_at', { ascending: false }),
      supabase.from('nextus_actor_offerings').select('*', { count: 'exact', head: true }).eq('actor_id', actorId),
    ])
    setNeeds(needsData || [])
    setHasOfferings(count > 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [actorId])

  async function updateStatus(id, status) {
    await supabase.from('nextus_needs').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    toast(`Need marked ${status}`)
    load()
  }

  const statusColor = { open: '#2A6B3A', in_progress: '#2A4A8A', fulfilled: gold, closed: 'rgba(15,21,35,0.40)' }
  const statusLabel = { open: 'Open', in_progress: 'In Progress', fulfilled: 'Fulfilled', closed: 'Closed' }

  if (loading) return <p style={{ ...serif, color: 'rgba(15,21,35,0.45)' }}>Loading needs…</p>

  if (hasOfferings === false) {
    return (
      <SectionCard style={{ borderColor: 'rgba(200,146,42,0.35)', background: 'rgba(200,146,42,0.03)' }}>
        <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>
          Add an offering first
        </p>
        <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px' }}>
          Before you can post needs, you need at least one offering — something you give to the world. Contributors want to know what you're building before they decide to help build it with you.
        </p>
        <Btn onClick={() => navigate(`/nextus/actors/${actorId}/manage?tab=offerings`)}>
          Go to Offerings →
        </Btn>
      </SectionCard>
    )
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.60)' }}>
          {needs.length === 0 ? 'No needs posted yet.' : `${needs.filter(n => n.status === 'open').length} open · ${needs.length} total`}
        </p>
        <Btn small variant="solid" onClick={() => navigate(`/nextus/actors/${actorId}/needs/new`)}>
          + Post a need
        </Btn>
      </div>

      {needs.length === 0 && (
        <SectionCard>
          <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '16px' }}>
            Post your first need to let contributors know how they can help. Be specific — specific needs attract specific contributors.
          </p>
          <Btn onClick={() => navigate(`/nextus/actors/${actorId}/needs/new`)}>Post a need →</Btn>
        </SectionCard>
      )}

      {needs.map(n => (
        <SectionCard key={n.id} style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: statusColor[n.status] }}>
                  {statusLabel[n.status]}
                </span>
                <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.40)' }}>
                  {n.need_type} · {n.size}
                </span>
                {n.time_estimate && (
                  <span style={{ ...sc, fontSize: '12px', color: 'rgba(15,21,35,0.35)' }}>{n.time_estimate}</span>
                )}
              </div>
              <h4 style={{ ...serif, fontSize: '17px', fontWeight: 300, color: dark, marginBottom: '6px' }}>{n.title}</h4>
              {n.description && (
                <p style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.65 }}>
                  {n.description.slice(0, 160)}{n.description.length > 160 ? '…' : ''}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
              {n.status === 'open'        && <Btn small onClick={() => updateStatus(n.id, 'in_progress')}>In progress</Btn>}
              {n.status === 'in_progress' && <Btn small onClick={() => updateStatus(n.id, 'fulfilled')}>Fulfilled</Btn>}
              {n.status !== 'closed' && n.status !== 'fulfilled' && (
                <Btn small variant="ghost" onClick={() => updateStatus(n.id, 'closed')}>Close</Btn>
              )}
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

// ── Tab: Matches ─────────────────────────────────────────────

const OFFER_TYPE_LABEL_M = {
  skills:'Skills', time:'Time', capital:'Capital',
  community:'Community', knowledge:'Knowledge', creative:'Creative', other:'Other',
}

const MODE_LABEL_M = {
  functional:'Functional', expressive:'Expressive', relational:'Relational',
  intellectual:'Intellectual', mixed:'Mixed',
}

const RETURN_LABEL_M = {
  none:'Volunteer', acknowledged:'Acknowledged', paid:'Paid',
  token:'Token', reciprocal:'Reciprocal',
}

function ContributorMatchCard({ match, navigate }) {
  const typeLabel   = OFFER_TYPE_LABEL_M[match.offer_type] || match.offer_type
  const modeLabel   = MODE_LABEL_M[match.contribution_mode] || match.contribution_mode
  const returnLabel = RETURN_LABEL_M[match.return_type] || match.return_type

  return (
    <div style={{
      background: match.adjacent ? '#FFFFFF' : 'rgba(200,146,42,0.04)',
      border: match.adjacent
        ? '1.5px solid rgba(200,146,42,0.18)'
        : '1.5px solid rgba(200,146,42,0.55)',
      borderRadius: '12px', padding: '18px 20px', marginBottom: '10px',
    }}>
      {match.adjacent && (
        <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.35)', display: 'block', marginBottom: '6px' }}>
          Adjacent match
        </span>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold, background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.22)', borderRadius: '4px', padding: '2px 8px' }}>
              {typeLabel}
            </span>
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.45)', background: 'rgba(15,21,35,0.04)', borderRadius: '4px', padding: '2px 8px' }}>
              {modeLabel}
            </span>
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.40)' }}>
              {returnLabel}
            </span>
            {match.confirmed_contribution_count > 0 && (
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: '#2A6B3A' }}>
                {match.confirmed_contribution_count} confirmed contribution{match.confirmed_contribution_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {match.display_name && (
            <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: dark, marginBottom: '2px' }}>
              {match.display_name}
              {match.archetype && (
                <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(168,114,26,0.70)', marginLeft: '10px' }}>
                  {match.archetype}
                </span>
              )}
            </p>
          )}

          <p style={{ ...serif, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.75)', marginBottom: match.description ? '4px' : 0 }}>
            {match.offer_title}
          </p>

          {match.description && (
            <p style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6 }}>
              {match.description.slice(0, 120)}{match.description.length > 120 ? '…' : ''}
            </p>
          )}

          {match.best_need && (
            <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.40)', marginTop: '6px' }}>
              Matches your need: {match.best_need.title}
            </p>
          )}

          {match.availability && (
            <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.40)', marginTop: '4px' }}>
              {match.availability}
            </p>
          )}
        </div>

        <a
          href={`/nextus/contributors/${match.user_id}`}
          style={{
            ...sc, fontSize: '12px', letterSpacing: '0.12em',
            padding: '8px 16px', borderRadius: '40px', flexShrink: 0,
            border: '1.5px solid rgba(200,146,42,0.60)',
            background: 'rgba(200,146,42,0.04)',
            color: gold, textDecoration: 'none',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#C8922A'; e.currentTarget.style.color = '#FFFFFF' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.04)'; e.currentTarget.style.color = gold }}
        >
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
        const res = await fetch('/api/nextus-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'for_org', actor_id: actorId }),
        })
        const data = await res.json()
        setMatches(data.matches || [])
      } catch {
        toast('Could not load matches')
      }
      setLoading(false)
    }
    load()
  }, [actorId])

  if (loading) return <p style={{ ...serif, color: 'rgba(15,21,35,0.45)' }}>Finding matches…</p>

  const directMatches   = matches.filter(m => !m.adjacent)
  const adjacentMatches = matches.filter(m => m.adjacent)
  const shown           = expanded ? matches : matches.slice(0, 5)

  return (
    <div style={{ maxWidth: '700px' }}>

      <div style={{ background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '12px', padding: '18px 22px', marginBottom: '28px' }}>
        <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '6px' }}>
          What this shows
        </p>
        <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, margin: 0 }}>
          Contributors whose active offers align with your open needs — matched by domain, offer type, and contribution mode. Direct matches first, then adjacent (contributors in your domain who are open to enquiry even without an exact match).
        </p>
      </div>

      {matches.length === 0 && (
        <SectionCard>
          <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '16px' }}>
            No contributors match your current open needs yet. As more people join the platform and list their offers, matches will appear here automatically.
          </p>
          <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', lineHeight: 1.7 }}>
            Make sure your needs are specific — specific needs attract specific contributors.
          </p>
        </SectionCard>
      )}

      {matches.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.55)' }}>
              {directMatches.length} direct · {adjacentMatches.length} adjacent
            </p>
          </div>

          {shown.map((m, i) => (
            <ContributorMatchCard key={`${m.user_id}-${m.offer_id}-${i}`} match={m} navigate={() => {}} />
          ))}

          {matches.length > 5 && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px', padding: 0 }}
            >
              {expanded ? 'Show fewer ↑' : `Show all ${matches.length} matches ↓`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function NextUsActorManagePage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [actor, setActor]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [toast, setToast]     = useState(null)

  function showToast(msg) { setToast(msg) }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('nextus_actors').select('*').eq('id', id).single()
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
      navigate(`/nextus/actors/${id}`)
    }
  }, [user, authLoading, actor, loading])

  async function reloadActor() {
    const { data } = await supabase.from('nextus_actors').select('*').eq('id', id).single()
    setActor(data)
  }

  if (loading || authLoading) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '120px 40px' }}>
          <p style={{ ...serif, fontSize: '17px', color: 'rgba(15,21,35,0.45)' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (!actor) return null

  const TABS = [
    { key: 'profile',       label: 'Profile' },
    { key: 'offerings',     label: 'Offerings' },
    { key: 'domains',       label: 'Domains' },
    { key: 'matches',       label: 'Matches' },
    { key: 'contributions', label: 'Contributions' },
    { key: 'needs',         label: 'Needs' },
  ]

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <style>{`
        @media (max-width: 640px) {
          .manage-main { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="manage-main" style={{ maxWidth: '820px', margin: '0 auto', padding: '80px 40px 120px' }}>

        <button
          onClick={() => navigate(`/nextus/actors/${id}`)}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '32px', padding: 0 }}
        >
          ← {actor.name}
        </button>

        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '10px' }}>
          Managing
        </span>
        <h1 style={{ ...serif, fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 300, color: dark, lineHeight: 1.1, marginBottom: '40px' }}>
          {actor.name}
        </h1>

        {/* Integrity warning — shown when needs are hidden by the platform */}
        {actor.needs_visible === false && (
          <div style={{
            background: 'rgba(138,48,48,0.04)',
            border: '1.5px solid rgba(138,48,48,0.35)',
            borderRadius: '12px', padding: '18px 22px', marginBottom: '28px',
          }}>
            <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: '#8A3030', marginBottom: '6px' }}>
              Needs hidden
            </p>
            <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '12px' }}>
              Your needs are not visible to contributors because one or more confirmed contributions have not received an outcome report. File your outcome reports to restore visibility.
            </p>
            <button
              onClick={() => setActiveTab('contributions')}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '9px 20px', borderRadius: '40px', border: '1.5px solid rgba(138,48,48,0.50)', background: 'rgba(138,48,48,0.05)', color: '#8A3030', cursor: 'pointer' }}
            >
              File outcome reports →
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(200,146,42,0.20)', marginBottom: '36px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...sc, fontSize: '14px', letterSpacing: '0.14em',
                padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === tab.key ? gold : 'rgba(15,21,35,0.50)',
                borderBottom: activeTab === tab.key ? `2px solid ${gold}` : '2px solid transparent',
                marginBottom: '-1px', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <ProfileTab actor={actor} onSave={reloadActor} toast={showToast} />
        )}
        {activeTab === 'offerings' && (
          <OfferingsTab actorId={id} toast={showToast} />
        )}
        {activeTab === 'domains' && (
          <DomainsTab actorId={id} toast={showToast} />
        )}
        {activeTab === 'matches' && (
          <MatchesTab actorId={id} toast={showToast} />
        )}
        {activeTab === 'contributions' && (
          <ContributionsTab actorId={id} actorName={actor.name} toast={showToast} />
        )}
        {activeTab === 'needs' && (
          <NeedsTab actorId={id} navigate={navigate} toast={showToast} />
        )}

      </div>

      <SiteFooter />
    </div>
  )
}
