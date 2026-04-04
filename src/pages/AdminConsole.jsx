import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'
import { SiteNav } from '../components/SiteNav'

// ── YOUR UUID — replace with your actual Supabase user ID ─────
// Find it: Supabase Dashboard → Authentication → Users → your email
const FOUNDER_UUID = '304f778f-f859-4c06-972c-f37ae8042457'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold  = '#A8721A'
const bg    = '#FAFAF7'

const TIER_OPTIONS    = ['full', 'beta', 'preview']
const SOURCE_OPTIONS  = ['admin', 'beta', 'gift', 'purchase', 'trial']
const STATUS_OPTIONS  = ['active', 'suspended', 'banned']
const ENTITLE_TYPES   = ['access', 'discount', 'trial']

// ── Shared UI primitives ──────────────────────────────────────

function Eyebrow({ children }) {
  return (
    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: gold,
      textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
      {children}
    </span>
  )
}

function Btn({ onClick, children, variant = 'primary', small, disabled }) {
  const styles = {
    primary: { background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', color: gold },
    danger:  { background: 'rgba(180,40,40,0.05)',  border: '1.5px solid rgba(180,40,40,0.5)',   color: '#8A2020' },
    ghost:   { background: 'transparent',           border: '1px solid rgba(200,146,42,0.30)',    color: 'rgba(15,21,35,0.72)' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...sc, fontSize: small ? '11px' : '13px', letterSpacing: '0.12em',
      padding: small ? '6px 14px' : '10px 20px',
      borderRadius: '40px', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, ...styles[variant],
    }}>
      {children}
    </button>
  )
}

function Input({ value, onChange, placeholder, type = 'text', style }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...serif, fontSize: '15px', color: '#0F1523',
        padding: '9px 14px', borderRadius: '8px',
        border: '1.5px solid rgba(200,146,42,0.35)',
        background: '#FFFFFF', outline: 'none', width: '100%',
        ...style,
      }}
    />
  )
}

function Select({ value, onChange, options, style }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        ...serif, fontSize: '15px', color: '#0F1523',
        padding: '9px 14px', borderRadius: '8px',
        border: '1.5px solid rgba(200,146,42,0.35)',
        background: '#FFFFFF', outline: 'none', ...style,
      }}>
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)',
      borderRadius: '14px', padding: '20px 22px', marginBottom: '10px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function Badge({ label, color = gold }) {
  return (
    <span style={{
      ...sc, fontSize: '13px', letterSpacing: '0.12em',
      padding: '3px 9px', borderRadius: '40px',
      border: `1px solid ${color}40`, color,
      background: `${color}12`,
    }}>
      {label}
    </span>
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
      ...serif, fontSize: '14px',
      padding: '12px 20px', borderRadius: '10px',
      boxShadow: '0 8px 28px rgba(15,21,35,0.3)',
    }}>
      {message}
    </div>
  )
}

// ── Tab navigation ────────────────────────────────────────────

const TABS = ['Groups', 'Members', 'Entitlements', 'Users', 'Grants']

function TabBar({ active, setActive }) {
  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '32px',
      borderBottom: '1px solid rgba(200,146,42,0.20)', paddingBottom: '0' }}>
      {TABS.map(tab => (
        <button key={tab} onClick={() => setActive(tab)} style={{
          ...sc, fontSize: '13px', letterSpacing: '0.12em',
          padding: '10px 18px', background: 'none', border: 'none',
          cursor: 'pointer',
          color: active === tab ? gold : 'rgba(15,21,35,0.55)',
          borderBottom: active === tab
            ? `2px solid ${gold}` : '2px solid transparent',
          marginBottom: '-1px',
        }}>
          {tab}
        </button>
      ))}
    </div>
  )
}

// ── GROUPS TAB ────────────────────────────────────────────────

function GroupsTab({ toast }) {
  const [groups, setGroups]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({
    name: '', slug: '', code: '', description: '',
    requires_approval: false, grace_period_days: 0,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('groups')
      .select('*, group_members(count)')
      .order('created_at', { ascending: false })
    setGroups(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    const { error } = await supabase.from('groups').insert({
      ...form,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
    })
    if (error) { toast(error.message); return }
    toast('Group created')
    setShowForm(false)
    setForm({ name: '', slug: '', code: '', description: '',
      requires_approval: false, grace_period_days: 0 })
    load()
  }

  async function toggleActive(g) {
    await supabase.from('groups').update({ active: !g.active }).eq('id', g.id)
    toast(g.active ? 'Group deactivated' : 'Group activated')
    load()
  }

  const joinUrl = (g) => `${window.location.origin}/join/${g.slug}`

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ ...serif, fontSize: '22px', fontWeight: 300, color: '#0F1523' }}>
          Groups
        </h2>
        <Btn onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New group'}
        </Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: '20px', background: 'rgba(200,146,42,0.02)' }}>
          <Eyebrow>New group</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                display: 'block', marginBottom: '4px' }}>Name *</label>
              <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))}
                placeholder="NextMen Inner Circle" />
            </div>
            <div>
              <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                display: 'block', marginBottom: '4px' }}>Access code *</label>
              <Input value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))}
                placeholder="NEXTMEN2026" />
            </div>
            <div>
              <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                display: 'block', marginBottom: '4px' }}>URL slug</label>
              <Input value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))}
                placeholder="auto-generated from name" />
            </div>
            <div>
              <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                display: 'block', marginBottom: '4px' }}>Grace period (days on leave)</label>
              <Input value={form.grace_period_days} type="number"
                onChange={v => setForm(f => ({ ...f, grace_period_days: parseInt(v) || 0 }))} />
            </div>
          </div>
          <div>
            <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
              display: 'block', marginBottom: '4px' }}>Description</label>
            <Input value={form.description}
              onChange={v => setForm(f => ({ ...f, description: v }))}
              placeholder="Optional notes about this group" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 18px' }}>
            <input type="checkbox" id="req_approval"
              checked={form.requires_approval}
              onChange={e => setForm(f => ({ ...f, requires_approval: e.target.checked }))}
              style={{ width: '16px', height: '16px', accentColor: gold }} />
            <label htmlFor="req_approval" style={{ ...serif, fontSize: '14px', color: '#0F1523' }}>
              Requires approval to join
            </label>
          </div>
          <Btn onClick={save}>Create group</Btn>
        </Card>
      )}

      {loading ? <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>Loading...</p> : (
        groups.map(g => (
          <Card key={g.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ ...serif, fontSize: '17px', fontWeight: 400, color: '#0F1523' }}>
                    {g.name}
                  </span>
                  <Badge label={g.active ? 'active' : 'inactive'}
                    color={g.active ? '#3B6B4A' : 'rgba(15,21,35,0.4)'} />
                  {g.requires_approval && <Badge label="approval required" />}
                </div>
                <div style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                  marginBottom: '8px' }}>
                  Code: <strong style={{ color: gold }}>{g.code}</strong>
                  {g.grace_period_days > 0 && ` · ${g.grace_period_days}d grace period`}
                </div>
                {g.description && (
                  <div style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.72)' }}>
                    {g.description}
                  </div>
                )}
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <a href={joinUrl(g)} target="_blank" rel="noopener noreferrer"
                    style={{ ...sc, fontSize: '13px', color: gold, textDecoration: 'none',
                      letterSpacing: '0.10em' }}>
                    Join URL ↗
                  </a>
                  <span style={{ color: '#C8922A' }}>·</span>
                  <span style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.45)',
                    letterSpacing: '0.10em' }}>
                    {g.group_members?.[0]?.count ?? 0} members
                  </span>
                </div>
              </div>
              <Btn onClick={() => toggleActive(g)}
                variant={g.active ? 'ghost' : 'primary'} small>
                {g.active ? 'Deactivate' : 'Activate'}
              </Btn>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}

// ── MEMBERS TAB ───────────────────────────────────────────────

function MembersTab({ toast }) {
  const [groups, setGroups]       = useState([])
  const [selectedGroup, setGroup] = useState('')
  const [members, setMembers]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [addEmail, setAddEmail]   = useState('')

  useEffect(() => {
    supabase.from('groups').select('id, name').eq('active', true)
      .then(({ data }) => { setGroups(data ?? []) })
  }, [])

  const loadMembers = useCallback(async (groupId) => {
    if (!groupId) return
    setLoading(true)
    const { data } = await supabase
      .from('group_members')
      .select('*, users(id, email, first_name, last_name, status)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: false })
    setMembers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadMembers(selectedGroup) }, [selectedGroup, loadMembers])

  async function addMember() {
    if (!addEmail || !selectedGroup) return
    // Look up user
    const { data: users } = await supabase
      .from('users').select('id').eq('email', addEmail.trim()).limit(1)
    if (!users?.length) { toast('No user found with that email'); return }

    const { error } = await supabase.from('group_members').upsert({
      group_id: selectedGroup, user_id: users[0].id,
      status: 'active', joined_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
    }, { onConflict: 'group_id,user_id' })
    if (error) { toast(error.message); return }
    toast('Member added')
    setAddEmail('')
    loadMembers(selectedGroup)
  }

  async function updateStatus(memberId, status) {
    const update = { status }
    if (status === 'active') update.approved_at = new Date().toISOString()
    if (status === 'removed') update.removed_at = new Date().toISOString()
    await supabase.from('group_members').update(update).eq('id', memberId)
    toast(`Member ${status}`)
    loadMembers(selectedGroup)
  }

  const pending  = members.filter(m => m.status === 'pending')
  const active   = members.filter(m => m.status === 'active')
  const removed  = members.filter(m => m.status === 'removed')

  function MemberRow({ m }) {
    const u = m.users
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...serif, fontSize: '15px', color: '#0F1523' }}>{name}</div>
          <div style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
            {u?.email}
            {u?.status !== 'active' && (
              <Badge label={u.status} color="#8A2020" />
            )}
          </div>
        </div>
        <div style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.4)',
          letterSpacing: '0.08em' }}>
          {new Date(m.joined_at).toLocaleDateString()}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {m.status === 'pending' && (
            <Btn onClick={() => updateStatus(m.id, 'active')} small>Approve</Btn>
          )}
          {m.status === 'active' && (
            <Btn onClick={() => updateStatus(m.id, 'removed')} variant="danger" small>Remove</Btn>
          )}
          {m.status === 'removed' && (
            <Btn onClick={() => updateStatus(m.id, 'active')} small>Reinstate</Btn>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ ...serif, fontSize: '22px', fontWeight: 300 }}>Members</h2>
        <Select value={selectedGroup} onChange={setGroup}
          options={[{ value: '', label: 'Select a group…' },
            ...groups.map(g => ({ value: g.id, label: g.name }))]}
          style={{ minWidth: '220px' }} />
      </div>

      {selectedGroup && (
        <>
          {/* Add member */}
          <Card style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Eyebrow>Add member by email</Eyebrow>
              <Input value={addEmail} onChange={setAddEmail}
                placeholder="user@email.com" type="email" />
            </div>
            <Btn onClick={addMember}>Add</Btn>
          </Card>

          {loading ? <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>Loading...</p> : (
            <>
              {pending.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <Eyebrow>Pending approval ({pending.length})</Eyebrow>
                  {pending.map(m => <MemberRow key={m.id} m={m} />)}
                </div>
              )}
              <div style={{ marginBottom: '24px' }}>
                <Eyebrow>Active ({active.length})</Eyebrow>
                {active.length === 0
                  ? <p style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.45)' }}>No active members.</p>
                  : active.map(m => <MemberRow key={m.id} m={m} />)
                }
              </div>
              {removed.length > 0 && (
                <details>
                  <summary style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
                    color: 'rgba(15,21,35,0.45)', cursor: 'pointer', marginBottom: '8px' }}>
                    Removed ({removed.length})
                  </summary>
                  {removed.map(m => <MemberRow key={m.id} m={m} />)}
                </details>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── ENTITLEMENTS TAB ──────────────────────────────────────────

function EntitlementsTab({ toast }) {
  const [groups, setGroups]       = useState([])
  const [products, setProducts]   = useState([])
  const [selectedGroup, setGroup] = useState('')
  const [entitlements, setEnts]   = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({
    product_key: '', type: 'access', tier: 'full',
    discount_pct: 20, trial_days: 7,
    uses_allowed: '', expires_after_days: '',
    notes: '',
  })

  useEffect(() => {
    supabase.from('groups').select('id, name').eq('active', true)
      .then(({ data }) => setGroups(data ?? []))
    supabase.from('products').select('key, name').eq('active', true)
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  const loadEnts = useCallback(async (groupId) => {
    if (!groupId) return
    const { data } = await supabase
      .from('group_entitlements')
      .select('*')
      .eq('group_id', groupId)
    setEnts(data ?? [])
  }, [])

  useEffect(() => { loadEnts(selectedGroup) }, [selectedGroup, loadEnts])

  async function addEntitlement() {
    const payload = {
      group_id: selectedGroup,
      product_key: form.product_key,
      type: form.type,
      notes: form.notes || null,
      uses_allowed: form.uses_allowed ? parseInt(form.uses_allowed) : null,
      expires_after_days: form.expires_after_days !== ''
        ? parseInt(form.expires_after_days) : null,
    }
    if (form.type === 'access')   payload.tier         = form.tier
    if (form.type === 'discount') payload.discount_pct = parseInt(form.discount_pct)
    if (form.type === 'trial')    payload.trial_days   = parseInt(form.trial_days)

    const { error } = await supabase.from('group_entitlements')
      .upsert(payload, { onConflict: 'group_id,product_key,type' })
    if (error) { toast(error.message); return }
    toast('Entitlement saved')
    setShowForm(false)
    loadEnts(selectedGroup)
  }

  async function deleteEnt(id) {
    await supabase.from('group_entitlements').delete().eq('id', id)
    toast('Entitlement removed')
    loadEnts(selectedGroup)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ ...serif, fontSize: '22px', fontWeight: 300 }}>Entitlements</h2>
        <Select value={selectedGroup} onChange={setGroup}
          options={[{ value: '', label: 'Select a group…' },
            ...groups.map(g => ({ value: g.id, label: g.name }))]}
          style={{ minWidth: '220px' }} />
      </div>

      {selectedGroup && (
        <>
          <Btn onClick={() => setShowForm(s => !s)} style={{ marginBottom: '16px' }}>
            {showForm ? 'Cancel' : '+ Add entitlement'}
          </Btn>

          {showForm && (
            <Card style={{ marginBottom: '20px', background: 'rgba(200,146,42,0.02)' }}>
              <Eyebrow>New entitlement</Eyebrow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                    display: 'block', marginBottom: '4px' }}>Product</label>
                  <Select value={form.product_key} onChange={v => setForm(f => ({ ...f, product_key: v }))}
                    options={[{ value: '', label: 'Choose…' },
                      ...products.map(p => ({ value: p.key, label: p.name }))]} />
                </div>
                <div>
                  <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                    display: 'block', marginBottom: '4px' }}>Type</label>
                  <Select value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))}
                    options={ENTITLE_TYPES} />
                </div>

                {form.type === 'access' && (
                  <div>
                    <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                      display: 'block', marginBottom: '4px' }}>Tier</label>
                    <Select value={form.tier} onChange={v => setForm(f => ({ ...f, tier: v }))}
                      options={TIER_OPTIONS} />
                  </div>
                )}
                {form.type === 'discount' && (
                  <div>
                    <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                      display: 'block', marginBottom: '4px' }}>Discount %</label>
                    <Input value={form.discount_pct} type="number"
                      onChange={v => setForm(f => ({ ...f, discount_pct: v }))} />
                  </div>
                )}
                {form.type === 'trial' && (
                  <div>
                    <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                      display: 'block', marginBottom: '4px' }}>Trial days</label>
                    <Input value={form.trial_days} type="number"
                      onChange={v => setForm(f => ({ ...f, trial_days: v }))} />
                  </div>
                )}

                <div>
                  <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                    display: 'block', marginBottom: '4px' }}>
                    Uses allowed (blank = unlimited)
                  </label>
                  <Input value={form.uses_allowed} type="number"
                    placeholder="unlimited"
                    onChange={v => setForm(f => ({ ...f, uses_allowed: v }))} />
                </div>
                <div>
                  <label style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                    display: 'block', marginBottom: '4px' }}>
                    Expires after days (blank = while member, 0 = permanent)
                  </label>
                  <Input value={form.expires_after_days} type="number"
                    placeholder="while member"
                    onChange={v => setForm(f => ({ ...f, expires_after_days: v }))} />
                </div>
              </div>
              <Input value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))}
                placeholder="Optional notes" style={{ marginBottom: '14px' }} />
              <Btn onClick={addEntitlement} disabled={!form.product_key}>Save entitlement</Btn>
            </Card>
          )}

          {entitlements.length === 0
            ? <p style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.45)' }}>
                No entitlements yet for this group.
              </p>
            : entitlements.map(e => (
              <Card key={e.id}>
                <div style={{ display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ ...serif, fontSize: '15px', fontWeight: 400, color: '#0F1523' }}>
                        {products.find(p => p.key === e.product_key)?.name ?? e.product_key}
                      </span>
                      <Badge label={e.type} />
                      {e.type === 'access' && <Badge label={e.tier} color="#3B6B4A" />}
                      {e.type === 'discount' && <Badge label={`${e.discount_pct}% off`} />}
                    </div>
                    <div style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
                      {e.uses_allowed ? `${e.uses_allowed} uses` : 'unlimited uses'}
                      {' · '}
                      {e.expires_after_days === null
                        ? 'while member'
                        : e.expires_after_days === 0
                        ? 'permanent'
                        : `${e.expires_after_days}d from grant`}
                    </div>
                    {e.notes && (
                      <div style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.45)',
                        marginTop: '4px' }}>{e.notes}</div>
                    )}
                  </div>
                  <Btn onClick={() => deleteEnt(e.id)} variant="danger" small>Remove</Btn>
                </div>
              </Card>
            ))
          }
        </>
      )}
    </div>
  )
}

// ── USERS TAB ─────────────────────────────────────────────────

function UsersTab({ toast }) {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [selected, setSelected]   = useState(null)
  const [userAccess, setAccess]   = useState([])
  const [userGroups, setGroups]   = useState([])
  const [searching, setSearching] = useState(false)
  const [grantForm, setGrant]     = useState({
    product: '', tier: 'full', source: 'admin', expires_at: '', notes: '',
  })
  const [products, setProducts]   = useState([])

  useEffect(() => {
    supabase.from('products').select('key, name').eq('active', true)
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    const q = query.trim()
    const { data } = await supabase.from('users')
      .select('*')
      .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(20)
    setResults(data ?? [])
    setSearching(false)
  }

  async function selectUser(u) {
    setSelected(u)
    const [{ data: access }, { data: groups }] = await Promise.all([
      supabase.from('access').select('*').eq('user_id', u.id),
      supabase.from('group_members')
        .select('*, groups(name, code)')
        .eq('user_id', u.id),
    ])
    setAccess(access ?? [])
    setGroups(groups ?? [])
  }

  async function addGrant() {
    const { error } = await supabase.from('access').upsert({
      user_id: selected.id,
      product: grantForm.product,
      tier: grantForm.tier,
      source: grantForm.source,
      expires_at: grantForm.expires_at || null,
      notes: grantForm.notes || null,
      granted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,product' })
    if (error) { toast(error.message); return }
    toast('Access granted')
    selectUser(selected)
  }

  async function revokeGrant(accessId) {
    await supabase.from('access').delete().eq('id', accessId)
    toast('Access revoked')
    selectUser(selected)
  }

  async function updateUserStatus(userId, status) {
    await supabase.from('users').update({ status }).eq('id', userId)
    toast(`User ${status}`)
    setSelected(s => ({ ...s, status }))
    const updated = results.map(r => r.id === userId ? { ...r, status } : r)
    setResults(updated)
  }

  return (
    <div>
      <h2 style={{ ...serif, fontSize: '22px', fontWeight: 300, marginBottom: '20px' }}>Users</h2>

      {/* Search */}
      <Card style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Search by email, first name, or last name</Eyebrow>
          <Input value={query} onChange={setQuery} placeholder="Search…"
            style={{}} />
        </div>
        <Btn onClick={search} disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </Btn>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.5fr' : '1fr', gap: '20px' }}>
        {/* Results list */}
        <div>
          {results.map(u => (
            <Card key={u.id} style={{
              cursor: 'pointer',
              borderColor: selected?.id === u.id ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.20)',
            }} onClick={() => selectUser(u)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ ...serif, fontSize: '15px', color: '#0F1523' }}>
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                  </div>
                  <div style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
                    {u.email}
                  </div>
                </div>
                <Badge
                  label={u.status}
                  color={u.status === 'active' ? '#3B6B4A' : '#8A2020'} />
              </div>
            </Card>
          ))}
        </div>

        {/* User detail */}
        {selected && (
          <div>
            <Card style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <div style={{ ...serif, fontSize: '18px', color: '#0F1523', marginBottom: '2px' }}>
                    {[selected.first_name, selected.last_name].filter(Boolean).join(' ') || selected.email}
                  </div>
                  <div style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
                    {selected.email}
                  </div>
                </div>
                <Badge label={selected.status}
                  color={selected.status === 'active' ? '#3B6B4A' : '#8A2020'} />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selected.status !== 'active' && (
                  <Btn onClick={() => updateUserStatus(selected.id, 'active')} small>
                    Reinstate
                  </Btn>
                )}
                {selected.status === 'active' && (
                  <Btn onClick={() => updateUserStatus(selected.id, 'suspended')}
                    variant="ghost" small>Suspend</Btn>
                )}
                {selected.status !== 'banned' && (
                  <Btn onClick={() => updateUserStatus(selected.id, 'banned')}
                    variant="danger" small>Ban</Btn>
                )}
              </div>
            </Card>

            {/* Group memberships */}
            {userGroups.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Eyebrow>Group memberships</Eyebrow>
                {userGroups.map(gm => (
                  <div key={gm.id} style={{ display: 'flex', alignItems: 'center',
                    gap: '10px', padding: '8px 0',
                    borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
                    <span style={{ ...serif, fontSize: '14px', color: '#0F1523', flex: 1 }}>
                      {gm.groups?.name}
                    </span>
                    <Badge label={gm.status}
                      color={gm.status === 'active' ? '#3B6B4A'
                        : gm.status === 'pending' ? gold : '#8A2020'} />
                  </div>
                ))}
              </div>
            )}

            {/* Individual access */}
            <div style={{ marginBottom: '16px' }}>
              <Eyebrow>Individual access</Eyebrow>
              {userAccess.length === 0
                ? <p style={{ ...serif, fontSize: '14px', color: 'rgba(15,21,35,0.45)' }}>
                    No individual grants.
                  </p>
                : userAccess.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center',
                    gap: '10px', padding: '8px 0',
                    borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
                    <span style={{ ...serif, fontSize: '14px', color: '#0F1523', flex: 1 }}>
                      {products.find(p => p.key === a.product)?.name ?? a.product}
                    </span>
                    <Badge label={a.tier} color="#3B6B4A" />
                    <Badge label={a.source} />
                    {a.expires_at && (
                      <span style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.4)',
                        letterSpacing: '0.08em' }}>
                        exp {new Date(a.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    <Btn onClick={() => revokeGrant(a.id)} variant="danger" small>Revoke</Btn>
                  </div>
                ))
              }
            </div>

            {/* Add grant */}
            <Card style={{ background: 'rgba(200,146,42,0.02)' }}>
              <Eyebrow>Grant access</Eyebrow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <Select value={grantForm.product}
                  onChange={v => setGrant(f => ({ ...f, product: v }))}
                  options={[{ value: '', label: 'Product…' },
                    ...products.map(p => ({ value: p.key, label: p.name }))]} />
                <Select value={grantForm.tier}
                  onChange={v => setGrant(f => ({ ...f, tier: v }))}
                  options={TIER_OPTIONS} />
                <Select value={grantForm.source}
                  onChange={v => setGrant(f => ({ ...f, source: v }))}
                  options={SOURCE_OPTIONS} />
                <Input value={grantForm.expires_at} type="date"
                  onChange={v => setGrant(f => ({ ...f, expires_at: v }))} />
              </div>
              <Input value={grantForm.notes} onChange={v => setGrant(f => ({ ...f, notes: v }))}
                placeholder="Notes (optional)" style={{ marginBottom: '12px' }} />
              <Btn onClick={addGrant} disabled={!grantForm.product}>Grant</Btn>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

// ── GRANTS TAB ────────────────────────────────────────────────

function GrantsTab() {
  const [grants, setGrants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('access')
        .select('*, users(email, first_name, last_name)')
        .order('granted_at', { ascending: false })
        .limit(100)
      setGrants(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <h2 style={{ ...serif, fontSize: '22px', fontWeight: 300, marginBottom: '20px' }}>
        Recent Grants
      </h2>
      {loading
        ? <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>Loading...</p>
        : grants.map(g => {
          const u = g.users
          const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email
          return (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
              <div style={{ flex: 1 }}>
                <span style={{ ...serif, fontSize: '15px', color: '#0F1523' }}>{name}</span>
                <span style={{ ...serif, fontSize: '13px', color: 'rgba(15,21,35,0.45)',
                  marginLeft: '10px' }}>{u?.email}</span>
              </div>
              <Badge label={g.product} />
              <Badge label={g.tier} color="#3B6B4A" />
              <Badge label={g.source} />
              <span style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.4)',
                letterSpacing: '0.08em', flexShrink: 0 }}>
                {new Date(g.granted_at).toLocaleDateString()}
              </span>
              {g.expires_at && (
                <span style={{ ...sc, fontSize: '13px',
                  color: new Date(g.expires_at) < new Date() ? '#8A2020' : 'rgba(15,21,35,0.4)',
                  letterSpacing: '0.08em' }}>
                  {new Date(g.expires_at) < new Date() ? 'expired' : `exp ${new Date(g.expires_at).toLocaleDateString()}`}
                </span>
              )}
            </div>
          )
        })
      }
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────

export function AdminConsolePage() {
  const { user, loading } = useAuth()
  const navigate          = useNavigate()
  const [tab, setTab]     = useState('Groups')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg) => setToast(msg), [])

  useEffect(() => {
    if (!loading && (!user || user.id !== FOUNDER_UUID)) {
      navigate('/')
    }
  }, [user, loading, navigate])

  if (loading || !user || user.id !== FOUNDER_UUID) {
    return <div className="loading" />
  }

  return (
    <div style={{ background: bg, minHeight: '100vh' }}>
      <SiteNav />
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '96px 40px 120px' }}>
        <Eyebrow>Admin</Eyebrow>
        <h1 style={{ ...serif, fontSize: 'clamp(32px,4vw,48px)', fontWeight: 300,
          color: '#0F1523', marginBottom: '8px', lineHeight: 1.08 }}>
          Console
        </h1>
        <p style={{ ...serif, fontSize: '16px', color: 'rgba(15,21,35,0.55)',
          marginBottom: '48px' }}>
          Groups, access, users, grants.
        </p>

        <TabBar active={tab} setActive={setTab} />

        {tab === 'Groups'       && <GroupsTab       toast={showToast} />}
        {tab === 'Members'      && <MembersTab      toast={showToast} />}
        {tab === 'Entitlements' && <EntitlementsTab toast={showToast} />}
        {tab === 'Users'        && <UsersTab        toast={showToast} />}
        {tab === 'Grants'       && <GrantsTab />}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
