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

// ── Tab: Contributions ───────────────────────────────────────

function ContributionsTab({ actorId, actorName, toast }) {
  const [contributions, setContributions] = useState([])
  const [loading, setLoading]             = useState(true)
  const [outcomeText, setOutcomeText]     = useState({}) // needId -> text
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

  const confirmed   = contributions.filter(c => c.confirmed_by_actor)
  const unconfirmed = contributions.filter(c => !c.confirmed_by_actor)
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

      {/* Outstanding outcome reports */}
      {needsOutcome.length > 0 && (
        <div style={{ background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.35)', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' }}>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, marginBottom: '8px' }}>Action required</p>
          <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65 }}>
            {needsOutcome.length} confirmed contribution{needsOutcome.length !== 1 ? 's' : ''} need{needsOutcome.length === 1 ? 's' : ''} an outcome report. Contributors can see what their help produced — closing this loop builds trust.
          </p>
        </div>
      )}

      {/* Unconfirmed */}
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

      {/* Confirmed */}
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

              {/* Outcome report form */}
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
                    <Btn
                      small
                      onClick={() => fileOutcome(c.id)}
                      disabled={saving['outcome_' + c.id]}
                    >
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
  const [needs, setNeeds]   = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('nextus_needs')
      .select('*')
      .eq('actor_id', actorId)
      .order('created_at', { ascending: false })
    setNeeds(data || [])
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

// ── Main page ────────────────────────────────────────────────

export function NextUsActorManagePage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [actor, setActor]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [toast, setToast]   = useState(null)

  function showToast(msg) { setToast(msg) }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('nextus_actors').select('*').eq('id', id).single()
      setActor(data)
      setLoading(false)
    }
    load()
  }, [id])

  // Auth + ownership guard
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

        {/* Header */}
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

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(200,146,42,0.20)', marginBottom: '36px' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...sc, fontSize: '14px', letterSpacing: '0.14em',
                padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === tab.key ? gold : 'rgba(15,21,35,0.50)',
                borderBottom: activeTab === tab.key ? `2px solid ${gold}` : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'profile' && (
          <ProfileTab actor={actor} onSave={reloadActor} toast={showToast} />
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
