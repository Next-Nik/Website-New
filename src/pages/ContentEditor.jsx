import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../hooks/useSupabase'

function isFounder(user) {
  return user?.user_metadata?.role === 'founder'
}

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'

// ─── Shared primitives ────────────────────────────────────────

function Eyebrow({ children }) {
  return (
    <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.20em', color: gold,
      textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
      {children}
    </span>
  )
}

function Btn({ onClick, children, variant = 'primary', small, disabled, style = {} }) {
  const styles = {
    primary: { background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', color: gold },
    solid:   { background: '#C8922A', border: '1px solid rgba(168,114,26,0.8)', color: '#FFFFFF' },
    danger:  { background: 'rgba(180,40,40,0.05)', border: '1.5px solid rgba(180,40,40,0.5)', color: '#8A2020' },
    ghost:   { background: 'transparent', border: '1px solid rgba(200,146,42,0.30)', color: 'rgba(15,21,35,0.72)' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...sc, fontSize: small ? '15px' : '17px', letterSpacing: '0.12em',
      padding: small ? '6px 14px' : '10px 22px',
      borderRadius: '40px', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, transition: 'all 0.2s',
      ...styles[variant], ...style,
    }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
    >
      {children}
    </button>
  )
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      background: '#0F1523', color: '#FAFAF7',
      ...body, fontSize: '17px',
      padding: '12px 20px', borderRadius: '10px',
      boxShadow: '0 8px 28px rgba(15,21,35,0.3)',
    }}>{message}</div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────

const TABS = ['Products', 'Announcements', 'Focus Goals', 'Ask']

function TabBar({ active, setActive }) {
  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '32px',
      borderBottom: '1px solid rgba(200,146,42,0.20)', paddingBottom: '0' }}>
      {TABS.map(tab => (
        <button key={tab} onClick={() => setActive(tab)} style={{
          ...sc, fontSize: '15px', letterSpacing: '0.12em',
          padding: '10px 18px', background: 'none', border: 'none',
          cursor: 'pointer',
          color: active === tab ? gold : 'rgba(15,21,35,0.72)',
          borderBottom: active === tab ? `2px solid ${gold}` : '2px solid transparent',
          marginBottom: '-1px',
        }}>{tab}</button>
      ))}
    </div>
  )
}

// ─── Products tab — manage the products table ─────────────────

function ProductsTab({ toast }) {
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(null)  // product key being edited
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ key: '', name: '', description: '', active: true })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('created_at')
    setProducts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    const { error } = editing
      ? await supabase.from('products').update({
          name: form.name, description: form.description, active: form.active,
          updated_at: new Date().toISOString(),
        }).eq('key', editing)
      : await supabase.from('products').insert({
          key: form.key, name: form.name, description: form.description,
          active: form.active, created_at: new Date().toISOString(),
        })
    if (error) { toast(error.message); return }
    toast(editing ? 'Product updated' : 'Product created')
    setEditing(null)
    setShowForm(false)
    setForm({ key: '', name: '', description: '', active: true })
    load()
  }

  async function toggleActive(p) {
    await supabase.from('products').update({ active: !p.active }).eq('key', p.key)
    toast(p.active ? 'Product deactivated' : 'Product activated')
    load()
  }

  function startEdit(p) {
    setEditing(p.key)
    setForm({ key: p.key, name: p.name, description: p.description ?? '', active: p.active })
    setShowForm(true)
  }

  function cancel() {
    setEditing(null)
    setShowForm(false)
    setForm({ key: '', name: '', description: '', active: true })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ ...body, fontSize: '22px', fontWeight: 300, color: '#0F1523' }}>
          Products
        </h2>
        <Btn onClick={() => showForm ? cancel() : setShowForm(true)}>
          {showForm ? 'Cancel' : '+ New product'}
        </Btn>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(200,146,42,0.03)', border: '1.5px solid rgba(200,146,42,0.78)',
          borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
          <Eyebrow>{editing ? 'Edit product' : 'New product'}</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ ...sc, fontSize: '17px', color: 'rgba(15,21,35,0.72)',
                display: 'block', marginBottom: '4px' }}>Key (unique, lowercase)</label>
              <input value={form.key} disabled={!!editing}
                onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                placeholder="e.g. map, foundation"
                style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '9px 14px',
                  borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.35)',
                  background: editing ? 'rgba(200,146,42,0.04)' : '#FFFFFF',
                  outline: 'none', width: '100%' }} />
            </div>
            <div>
              <label style={{ ...sc, fontSize: '17px', color: 'rgba(15,21,35,0.72)',
                display: 'block', marginBottom: '4px' }}>Display name</label>
              <input value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. The Map"
                style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '9px 14px',
                  borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.35)',
                  background: '#FFFFFF', outline: 'none', width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ ...sc, fontSize: '17px', color: 'rgba(15,21,35,0.72)',
              display: 'block', marginBottom: '4px' }}>Description</label>
            <input value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
              style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '9px 14px',
                borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.35)',
                background: '#FFFFFF', outline: 'none', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <input type="checkbox" id="prod_active" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              style={{ width: '16px', height: '16px', accentColor: gold }} />
            <label htmlFor="prod_active" style={{ ...body, fontSize: '17px', color: '#0F1523' }}>
              Active (visible to access system)
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Btn onClick={save} disabled={!form.key || !form.name}
              variant="solid">{editing ? 'Save changes' : 'Create product'}</Btn>
            <Btn onClick={cancel} variant="ghost">Cancel</Btn>
          </div>
        </div>
      )}

      {loading
        ? <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>Loading...</p>
        : products.map(p => (
          <div key={p.key} style={{ background: '#FFFFFF',
            border: '1.5px solid rgba(200,146,42,0.20)', borderRadius: '14px',
            padding: '18px 22px', marginBottom: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                <span style={{ ...body, fontSize: '16px', fontWeight: 400, color: '#0F1523' }}>
                  {p.name}
                </span>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.10em',
                  color: 'rgba(15,21,35,0.55)', background: 'rgba(200,146,42,0.06)',
                  border: '1px solid rgba(200,146,42,0.18)', borderRadius: '40px', padding: '2px 9px' }}>
                  {p.key}
                </span>
                {!p.active && (
                  <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.10em',
                    color: '#8A2020', background: 'rgba(138,32,32,0.06)',
                    border: '1px solid rgba(138,32,32,0.25)', borderRadius: '40px', padding: '2px 9px' }}>
                    inactive
                  </span>
                )}
              </div>
              {p.description && (
                <div style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)' }}>
                  {p.description}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <Btn onClick={() => startEdit(p)} small>Edit</Btn>
              <Btn onClick={() => toggleActive(p)} variant={p.active ? 'ghost' : 'primary'} small>
                {p.active ? 'Deactivate' : 'Activate'}
              </Btn>
            </div>
          </div>
        ))
      }
    </div>
  )
}

// ─── Announcements tab — quick broadcast to all users ─────────

function AnnouncementsTab({ toast }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading]             = useState(true)
  const [showForm, setShowForm]           = useState(false)
  const [form, setForm]                   = useState({ title: '', body: '', audience: 'all', active: true })

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
    // Table may not exist yet — graceful fallback
    if (!error) setAnnouncements(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    const { error } = await supabase.from('announcements').insert({
      ...form, created_at: new Date().toISOString(),
    })
    if (error) { toast(error.message); return }
    toast('Announcement created')
    setShowForm(false)
    setForm({ title: '', body: '', audience: 'all', active: true })
    load()
  }

  async function toggleActive(a) {
    await supabase.from('announcements').update({ active: !a.active }).eq('id', a.id)
    toast(a.active ? 'Deactivated' : 'Activated')
    load()
  }

  async function remove(id) {
    await supabase.from('announcements').delete().eq('id', id)
    toast('Removed')
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ ...body, fontSize: '22px', fontWeight: 300, color: '#0F1523', marginBottom: '4px' }}>
            Announcements
          </h2>
          <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)' }}>
            Broadcasts shown in user profiles and tool headers.
          </p>
        </div>
        <Btn onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ New announcement'}</Btn>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(200,146,42,0.03)', border: '1.5px solid rgba(200,146,42,0.78)',
          borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
          <Eyebrow>New announcement</Eyebrow>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ ...sc, fontSize: '17px', color: 'rgba(15,21,35,0.72)',
              display: 'block', marginBottom: '4px' }}>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Short, direct headline"
              style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '9px 14px',
                borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.35)',
                background: '#FFFFFF', outline: 'none', width: '100%' }} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ ...sc, fontSize: '17px', color: 'rgba(15,21,35,0.72)',
              display: 'block', marginBottom: '4px' }}>Body</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="One to two sentences. Direct and specific."
              rows={3}
              style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '9px 14px',
                borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.35)',
                background: '#FFFFFF', outline: 'none', width: '100%',
                resize: 'vertical', lineHeight: 1.6 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <input type="checkbox" id="ann_active" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              style={{ width: '16px', height: '16px', accentColor: gold }} />
            <label htmlFor="ann_active" style={{ ...body, fontSize: '17px', color: '#0F1523' }}>
              Active (visible to users immediately)
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Btn onClick={save} disabled={!form.title || !form.body} variant="solid">Publish</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost">Cancel</Btn>
          </div>
        </div>
      )}

      {loading
        ? <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>Loading...</p>
        : announcements.length === 0
        ? (
          <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed rgba(200,146,42,0.30)',
            borderRadius: '14px' }}>
            <p style={{ ...body, fontSize: '15px',
              color: 'rgba(15,21,35,0.72)', margin: 0 }}>
              No announcements yet.
            </p>
          </div>
        )
        : announcements.map(a => (
          <div key={a.id} style={{ background: '#FFFFFF',
            border: `1.5px solid ${a.active ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.20)'}`,
            borderRadius: '14px', padding: '18px 22px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em', color: '#0F1523' }}>
                    {a.title}
                  </span>
                  {!a.active && (
                    <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.10em',
                      color: 'rgba(15,21,35,0.55)', background: 'rgba(15,21,35,0.55)',
                      borderRadius: '40px', padding: '2px 9px', border: '1px solid rgba(15,21,35,0.12)' }}>
                      inactive
                    </span>
                  )}
                </div>
                <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.88)',
                  lineHeight: 1.65, margin: '0 0 8px' }}>{a.body}</p>
                <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em',
                  color: 'rgba(15,21,35,0.55)' }}>
                  {new Date(a.created_at).toLocaleDateString('en-GB',
                    { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <Btn onClick={() => toggleActive(a)} variant={a.active ? 'ghost' : 'primary'} small>
                  {a.active ? 'Deactivate' : 'Activate'}
                </Btn>
                <Btn onClick={() => remove(a.id)} variant="danger" small>Remove</Btn>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  )
}

// ─── Focus Goals tab — set horizon goals per Focus per domain ─

const FOCUS_DOMAINS = [
  { id: 'human-being',     label: 'Human Being',      goal: 'Every person has what they need to know themselves, develop fully, and bring what they came here to bring.' },
  { id: 'society',         label: 'Society',           goal: 'Humanity knows how to be human together — and every individual is better for it.' },
  { id: 'nature',          label: 'Nature',            goal: 'Ecosystems are thriving and we are living in harmony with the planet.' },
  { id: 'technology',      label: 'Technology',        goal: 'Our creations support and amplify life.' },
  { id: 'finance-economy', label: 'Finance & Economy', goal: 'Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.' },
  { id: 'legacy',          label: 'Legacy',            goal: 'We are ancestors worth having.' },
  { id: 'vision',          label: 'Vision',            goal: 'Into the unknown. On purpose. Together.' },
]

function FocusGoalsTab({ toast }) {
  const [query, setQuery]             = useState('')
  const [results, setResults]         = useState([])
  const [searching, setSearching]     = useState(false)
  const [selectedFocus, setSelected]  = useState(null)
  const [goals, setGoals]             = useState({})
  const [editing, setEditing]         = useState({})
  const [saving, setSaving]           = useState({})
  const debounceRef                   = useRef(null)

  const TYPE_LABEL = {
    planet:'Planet', continent:'Continent', nation:'Nation',
    province:'Province / Territory', city:'City',
    neighbourhood:'Neighbourhood', organisation:'Organisation',
  }

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('nextus_focuses')
        .select('id, name, type, slug')
        .ilike('name', `%${query.trim()}%`)
        .order('type').limit(14)
      setResults(data || [])
      setSearching(false)
    }, 280)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function loadGoals(focus) {
    setSelected(focus)
    setGoals({})
    setEditing({})
    const { data } = await supabase
      .from('nextus_focus_goals')
      .select('id, domain_id, horizon_goal, status')
      .eq('focus_id', focus.id)
    const map = {}
    ;(data || []).forEach(g => { map[g.domain_id] = g })
    setGoals(map)
    const drafts = {}
    ;(data || []).forEach(g => { drafts[g.domain_id] = g.horizon_goal })
    setEditing(drafts)
  }

  async function saveGoal(domainId) {
    const text = (editing[domainId] || '').trim()
    if (!text) { toast('Goal text is required'); return }
    setSaving(s => ({ ...s, [domainId]: true }))
    const existing = goals[domainId]
    if (existing) {
      const { error } = await supabase.from('nextus_focus_goals')
        .update({ horizon_goal: text, status: 'ratified', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) { toast('Error: ' + error.message); setSaving(s => ({ ...s, [domainId]: false })); return }
    } else {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('nextus_focus_goals').insert({
        focus_id: selectedFocus.id, domain_id: domainId,
        horizon_goal: text, status: 'ratified',
        set_by: userData?.user?.id,
      })
      if (error) { toast('Error: ' + error.message); setSaving(s => ({ ...s, [domainId]: false })); return }
    }
    toast(`${FOCUS_DOMAINS.find(d => d.id === domainId)?.label} goal saved`)
    setSaving(s => ({ ...s, [domainId]: false }))
    await loadGoals(selectedFocus)
  }

  async function deleteGoal(domainId) {
    const existing = goals[domainId]
    if (!existing) return
    if (!window.confirm('Delete this goal?')) return
    await supabase.from('nextus_focus_goals').delete().eq('id', existing.id)
    toast('Goal removed')
    await loadGoals(selectedFocus)
  }

  const card = {
    background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.18)',
    borderRadius: '12px', padding: '22px 24px', marginBottom: '14px',
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      <Eyebrow>Focus Goals</Eyebrow>
      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '17px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '28px' }}>
        Set locally-ratified horizon goals for any Focus. These appear in the Domain Explorer when a visitor sets that Focus as their viewing context.
      </p>

      <div style={{ marginBottom: '32px' }}>
        <label style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '8px' }}>
          Select a Focus
        </label>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search — Canada, British Columbia, Vancouver…"
          style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '17px', color: '#0F1523', padding: '11px 16px', borderRadius: '8px', width: '100%', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FAFAF7', outline: 'none' }}
        />
        {searching && <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '15px', color: 'rgba(15,21,35,0.55)', marginTop: '8px' }}>Searching…</p>}
        {results.length > 0 && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.25)', borderRadius: '8px', marginTop: '6px', overflow: 'hidden' }}>
            {results.map(f => (
              <button key={f.id} onClick={() => { setQuery(''); setResults([]); loadGoals(f) }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(200,146,42,0.10)', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,146,42,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '17px', color: '#0F1523' }}>{f.name}</span>
                <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.12em', color: gold }}>{TYPE_LABEL[f.type] || f.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedFocus && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(200,146,42,0.18)' }}>
            <div>
              <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '4px' }}>{TYPE_LABEL[selectedFocus.type] || selectedFocus.type}</span>
              <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '22px', color: '#0F1523' }}>{selectedFocus.name}</span>
            </div>
            <button onClick={() => setSelected(null)} style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}>Change ×</button>
          </div>

          {FOCUS_DOMAINS.map(domain => {
            const existing = goals[domain.id]
            const draft    = editing[domain.id] ?? ''
            const isDirty  = draft !== (existing?.horizon_goal || '')
            const isSet    = !!existing

            return (
              <div key={domain.id} style={{ ...card, borderColor: isSet ? 'rgba(200,146,42,0.35)' : 'rgba(200,146,42,0.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '14px', letterSpacing: '0.14em', color: gold }}>{domain.label}</span>
                    {isSet && (
                      <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '11px', letterSpacing: '0.14em', color: '#2A6B3A', background: 'rgba(42,107,58,0.08)', border: '1px solid rgba(42,107,58,0.25)', borderRadius: '40px', padding: '2px 8px', marginLeft: '10px' }}>Ratified</span>
                    )}
                  </div>
                  {isSet && (
                    <button onClick={() => deleteGoal(domain.id)} style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(180,40,40,0.60)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                  )}
                </div>
                <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, marginBottom: '12px' }}>
                  Global: {domain.goal}
                </p>
                <textarea
                  value={draft}
                  onChange={e => setEditing(ed => ({ ...ed, [domain.id]: e.target.value }))}
                  placeholder={`Local horizon goal for ${selectedFocus.name} — ${domain.label}…`}
                  rows={3}
                  style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '16px', color: '#0F1523', padding: '10px 14px', borderRadius: '8px', width: '100%', border: '1.5px solid rgba(200,146,42,0.25)', background: draft ? '#FFFFFF' : 'rgba(200,146,42,0.02)', outline: 'none', resize: 'vertical', lineHeight: 1.65 }}
                />
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Btn small variant="solid" disabled={!draft.trim() || saving[domain.id]} onClick={() => saveGoal(domain.id)}>
                    {saving[domain.id] ? 'Saving…' : isSet ? 'Update' : 'Ratify'}
                  </Btn>
                  {isDirty && existing && (
                    <button onClick={() => setEditing(ed => ({ ...ed, [domain.id]: existing.horizon_goal }))}
                      style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ─── Ask tab — AI observer query interface ────────────────────

function AskTab() {
  const [query, setQuery]     = useState('')
  const [answer, setAnswer]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function ask() {
    if (!query.trim() || loading) return
    setLoading(true)
    setAnswer(null)
    setError(null)

    try {
      // Gather context from Supabase to include in the prompt
      const [
        { count: totalUsers },
        { count: mapCount },
        { count: ppCount },
        { count: sprintCount },
        { data: recentActivity },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('map_results').select('*', { count: 'exact', head: true }).eq('complete', true),
        supabase.from('purpose_piece_results').select('*', { count: 'exact', head: true }),
        supabase.from('target_goal_sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('users').select('email, created_at, status')
          .order('created_at', { ascending: false }).limit(20),
      ])

      const context = `Platform snapshot as of ${new Date().toLocaleDateString()}:
- Total users: ${totalUsers ?? 0}
- Completed Maps: ${mapCount ?? 0}
- Purpose Pieces completed: ${ppCount ?? 0}
- Active Target Sprints: ${sprintCount ?? 0}
- Recent signups (last 20): ${recentActivity?.map(u => u.email).join(', ') || 'none'}`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are Next-1, the AI observer for the NextUs platform. You have access to live platform data and answer the founder's questions directly, concisely, and honestly. You speak in the NextUs voice — warm, direct, no unnecessary words. You have the following live context:\n\n${context}`,
          messages: [{ role: 'user', content: query }],
        }),
      })

      const data = await res.json()
      const text = data.content?.[0]?.text
      if (text) setAnswer(text)
      else setError('No response received.')
    } catch (e) {
      setError('Something went wrong. Try again.')
    }
    setLoading(false)
  }

  return (
    <div>
      <h2 style={{ ...body, fontSize: '22px', fontWeight: 300, color: '#0F1523', marginBottom: '6px' }}>
        Ask
      </h2>
      <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)',
        marginBottom: '28px' }}>
        Next-1 — your AI observer. Ask anything about the platform.
      </p>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '24px' }}>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
          placeholder="How many users have completed The Map? What's the most common Purpose Piece archetype? What should I focus on this week?"
          rows={3}
          style={{ ...body, fontSize: '15px', color: '#0F1523', flex: 1,
            padding: '12px 16px', borderRadius: '10px',
            border: '1.5px solid rgba(200,146,42,0.35)',
            background: '#FFFFFF', outline: 'none', resize: 'none', lineHeight: 1.6 }}
        />
        <Btn onClick={ask} disabled={!query.trim() || loading} variant="solid"
          style={{ flexShrink: 0, marginTop: '2px' }}>
          {loading ? 'Thinking\u2026' : 'Ask'}
        </Btn>
      </div>

      {loading && (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '8px 0' }}>
          {[0, 0.2, 0.4].map((d, i) => (
            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%',
              background: 'rgba(200,146,42,0.55)',
              animation: `pulse 1.4s ease ${d}s infinite` }} />
          ))}
          <style>{`@keyframes pulse { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
        </div>
      )}

      {error && (
        <div style={{ ...body, fontSize: '15px',
          color: 'rgba(15,21,35,0.72)', padding: '16px',
          background: 'rgba(200,146,42,0.04)', borderRadius: '10px',
          border: '1px solid rgba(200,146,42,0.20)' }}>{error}</div>
      )}

      {answer && (
        <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)',
          borderRadius: '14px', padding: '24px' }}>
          <Eyebrow>Next-1</Eyebrow>
          <div style={{ ...body, fontSize: '16px', fontWeight: 300,
            color: '#0F1523', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
            {answer}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────

export function ContentEditorPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]     = useState('Products')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg) => setToast(msg), [])

  useEffect(() => {
    if (loading) return
    if (!user) { navigate('/login?redirect=/content-editor'); return }
    if (!isFounder(user)) { navigate('/'); return }
  }, [user, loading])

  if (loading || !user || !isFounder(user)) return <div className="loading" />

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '96px 40px 120px' }}>
        <span style={{ ...sc, fontSize: '17px', fontWeight: 600, letterSpacing: '0.20em',
          color: gold, textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
          Founder
        </span>
        <h1 style={{ ...body, fontSize: 'clamp(32px,4vw,48px)', fontWeight: 300,
          color: '#0F1523', marginBottom: '8px', lineHeight: 1.08 }}>
          Content Editor
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)',
          marginBottom: '48px' }}>
          Products, announcements, and Next-1.
        </p>

        <TabBar active={tab} setActive={setTab} />

        {tab === 'Products'       && <ProductsTab      toast={showToast} />}
        {tab === 'Announcements'  && <AnnouncementsTab toast={showToast} />}
        {tab === 'Focus Goals'    && <FocusGoalsTab    toast={showToast} />}
        {tab === 'Ask'            && <AskTab />}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
